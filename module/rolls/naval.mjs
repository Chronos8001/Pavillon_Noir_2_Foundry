import { PN2 } from "../config.mjs";
import { render, effectuerTest } from "./dice.mjs";
import { actionNumerique, actionNonNumerique, formatMesure, valeurDeMesure } from "../helpers/tables.mjs";
import { computeGroupSkills, matureActives } from "../data/actor-navire.mjs";

const SYS = PN2.id;

/* -------------------------------------------- */
/*  Tables d'artillerie                         */
/* -------------------------------------------- */

/** Par calibre : Mesure de pertes à mitraille, hommes pour recharger, modif. de recharge. */
export const CANONS = {
  0.5: { mitraille: 1.5, hommes: 1, modRecharge: 2, tonnage: 0.03 },
  1: { mitraille: 3, hommes: 1, modRecharge: 2, tonnage: 0.1 },
  2: { mitraille: 6, hommes: 2, modRecharge: 2, tonnage: 0.15 },
  3: { mitraille: 2, hommes: 3, modRecharge: 1, tonnage: 0.6 },
  4: { mitraille: 2.5, hommes: 3, modRecharge: 1, tonnage: 0.8 },
  6: { mitraille: 4, hommes: 4, modRecharge: 1, tonnage: 1 },
  9: { mitraille: 6, hommes: 6, modRecharge: 0, tonnage: 1.2 },
  12: { mitraille: 8, hommes: 8, modRecharge: 0, tonnage: 1.5 },
  18: { mitraille: 12, hommes: 10, modRecharge: 0, tonnage: 2.1 },
  24: { mitraille: 16, hommes: 12, modRecharge: -1, tonnage: 2.5 },
  30: { mitraille: 20, hommes: 13, modRecharge: -1, tonnage: 2.7 },
  36: { mitraille: 24, hommes: 15, modRecharge: -1, tonnage: 3.6 },
  42: { mitraille: 28, hommes: 18, modRecharge: -2, tonnage: 4.5 }
};

/** Mesure de dégâts d'un canon (calibre / 6). */
const mesureBoulet = cal => (cal < 1 ? 0 : (cal === 1 ? 0.16 : (cal === 2 ? 0.33 : cal / 6)));

/** Caractéristiques calculées d'une batterie. */
export function statsBatterie(b) {
  const c = CANONS[Number(b.calibre)];
  if (b.nombre > 0 && c) {
    return {
      vd: valeurDeMesure(b.nombre * mesureBoulet(Number(b.calibre))),
      vdMitraille: valeurDeMesure(b.nombre * c.mitraille),
      hommes: b.nombre * c.hommes,
      modRecharge: c.modRecharge,
      calcule: true
    };
  }
  return { vd: b.vd, vdMitraille: b.vd, hommes: b.hommes, modRecharge: b.modRecharge, calcule: false };
}

/* -------------------------------------------- */
/*  Tests de groupe                             */
/* -------------------------------------------- */

export async function testGroupe(navire, key) {
  const s = navire.system;
  const groupe = computeGroupSkills(s)[key];
  const data = {
    groupe, difficultes: PN2.difficultes, malusEquipage: s.malusEquipage,
    manoeuvre: key === "manoeuvre", modNav: s.modNav, malusEquipageManoeuvre: s.malusEquipageManoeuvre
  };
  const content = await render("dialog/groupe.hbs", data);
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: `${navire.name} : ${groupe.label}` }, content,
    buttons: [{ action: "roll", label: "Lancer", default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object }],
    rejectClose: false
  });
  if (!form) return;
  const notes = [`Efficacité (commandement) : ${groupe.eff}`, `Facilité : ${groupe.facBase} (VC) ${groupe.modMatelots >= 0 ? "+" : ""}${groupe.modMatelots} (matelots)`];
  let eff = groupe.eff + (Number(form.modEff) || 0);
  let fac = groupe.fac + (Number(form.difficulte) || 0) + (Number(form.modFac) || 0);
  if (Number(form.modEff)) notes.push(`Mod. Efficacité : ${form.modEff}D`);
  if (Number(form.difficulte)) notes.push(`Difficulté : ${form.difficulte}`);
  if (Number(form.modFac)) notes.push(`Mod. Facilité : ${form.modFac}`);
  if (s.malusEquipage) { fac += s.malusEquipage; notes.push(`Santé de l'équipage : ${s.malusEquipage}`); }
  if (key === "manoeuvre") {
    if (s.modNav.manoeuvre) { fac += s.modNav.manoeuvre; notes.push(`Manœuvrabilité (navire, voilure, vent, avaries) : ${s.modNav.manoeuvre}`); }
    if (s.malusEquipageManoeuvre) { fac += s.malusEquipageManoeuvre; notes.push(`Équipage insuffisant : ${s.malusEquipageManoeuvre}`); }
  }
  const bonusS = Number(form.modS) || 0;
  if (bonusS) notes.push(`Modificateur de Réussite : ${bonusS > 0 ? "+" : ""}${bonusS}S`);
  const { result } = await effectuerTest(navire, { titre: `${groupe.label} de groupe`, sousTitre: navire.name, eff, fac, metier: false, notes, chat: false, bonusS });
  const duree = actionNonNumerique(result.succes, { catastrophe: result.critique, echec: result.succes <= 0 });
  let numerique = null;
  if (Number(form.mesure) > 0) {
    const v = valeurDeMesure(Number(form.mesure));
    const an = actionNumerique(v, result.succes, result.succes <= 0);
    numerique = { mesure: form.mesure, valeur: v, resultat: formatMesure(an.mesure) };
  }
  const contentChat = await render("chat/test.hbs", { titre: `${groupe.label} de groupe`, sousTitre: navire.name, result, notes, duree, numerique });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: navire }), content: contentChat });
}

/* -------------------------------------------- */
/*  Canonnade                                   */
/* -------------------------------------------- */

function navireCible() {
  const t = game.user.targets?.first?.();
  if (t?.actor?.type === "navire") return t;
  return null;
}

/** Localisation touchée selon la munition et le nombre de mâts. */
function localiserTir(munition, d6, mats, cote) {
  const d = Math.max(1, Math.min(6, d6));
  if (munition === "mitraille") return { zone: "hommes", loc: null, label: "Équipage (pont)" };
  if (munition === "rame") {
    const actives = matureActives(mats);
    let loc;
    if (actives.length >= 3) loc = d <= 2 ? "artimon" : (d <= 4 ? "grandMat" : "misaine");
    else if (actives.length === 2) loc = d <= 3 ? "grandMat" : "misaine";
    else loc = "grandMat";
    return { zone: "mature", loc, label: PN2.locNavire.mature[loc] };
  }
  const loc = d <= 2 ? "poupe" : (d <= 4 ? cote : "proue");
  return { zone: "coque", loc, label: PN2.locNavire.coque[loc] };
}

export async function tirBatterie(navire, batId) {
  const s = navire.system;
  const b = s.batteries?.[batId];
  if (!b) return;
  if (!b.chargee) ui.notifications.warn(`${b.nom} n'est pas chargée (recharge restante : ${b.restant} TCN).`);
  const groupe = computeGroupSkills(s).canonnade;
  const cibleTok = navireCible();
  const tailleCible = cibleTok?.actor?.system?.infos?.taille ?? "Frégate";
  const st = statsBatterie(b);
  const data = {
    b, groupe, st, tailles: PN2.taillesNavire, tailleCible, munitions: PN2.munitions, cible: cibleTok?.name,
    portee: (PN2.portees[b.position] ?? PN2.portees["bordée"])[b.munition] ?? 300
  };
  const content = await render("dialog/canonnade.hbs", data);
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: `Canonnade : ${b.nom}` }, content, position: { width: 440 },
    buttons: [{ action: "roll", label: "Feu !", default: true, callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object }],
    rejectClose: false
  });
  if (!form) return;
  const notes = [`Canonnade : ${groupe.eff}F${groupe.fac}`];
  let eff = groupe.eff + (Number(form.modEff) || 0);
  let fac = groupe.fac;
  const tmod = PN2.taillesNavire[form.taille]?.modTir ?? 0;
  if (tmod) { fac += tmod; notes.push(`Taille de la cible (${form.taille}) : ${tmod > 0 ? "+" : ""}${tmod}`); }
  const distance = Number(form.distance) || 0;
  const munition = form.munition || b.munition;
  const portee = (PN2.portees[b.position] ?? PN2.portees["bordée"])[munition] ?? 300;
  if (distance > 0) {
    const seg = Math.max(0, Math.ceil(distance / portee) - 1);
    if (seg) { fac -= seg; notes.push(`Distance (${distance} m, portée ${portee} m) : -${seg}`); }
  }
  if (["chasse", "fuite"].includes(b.position)) { fac += 1; notes.push("Pièces de chasse/fuite : +1"); }
  if (form.fumee) { fac -= 2; notes.push("Fumée : -2"); }
  if (form.merAgitee) { fac -= 2; notes.push("Mer agitée : -2"); }
  if (s.malusEquipage) { fac += s.malusEquipage; notes.push(`Santé de l'équipage : ${s.malusEquipage}`); }
  const etatCote = b.position === "bordée" ? s.etats.coque[b.cote] : (b.position === "chasse" ? s.etats.coque.proue : (b.position === "fuite" ? s.etats.coque.poupe : null));
  if (etatCote?.malus) { fac += etatCote.malus; notes.push(`Dégâts de la localisation (${etatCote.label}) : ${etatCote.malus}`); }
  const modDiv = Number(form.modFac) || 0;
  if (modDiv) { fac += modDiv; notes.push(`Divers : ${modDiv}`); }
  const orient = Number(form.orientation) || 0;
  if (orient) notes.push(`Orientation de la cible : +${orient}S`);

  const { result, roll } = await effectuerTest(navire, { titre: `Canonnade : ${b.nom}`, eff, fac, metier: false, notes, chat: false });
  const rolls = [roll];
  const tir = { batterie: b.nom, munition, munitionLabel: PN2.munitions[munition], result, touche: result.succes >= 1 && !result.critique };
  if (tir.touche) {
    const valeur = munition === "mitraille" ? st.vdMitraille : st.vd;
    const an = actionNumerique(valeur, result.succes + orient);
    tir.valeur = valeur; tir.mesure = an.mesure; tir.mesureLabel = formatMesure(an.mesure);
    tir.degats = munition === "mitraille" ? 0 : Math.round(an.mesure);
    tir.pertes = Math.round(an.mesure);
    if (an.mesure > 0 && an.mesure < 1) tir.blesseLeger = true;
    const d = await new Roll("1d6").evaluate();
    rolls.push(d);
    tir.d6 = d.total;
    const locMod = Number(form.locMod) || 0;
    const cibleMats = cibleTok?.actor?.system?.infos?.mats ?? 3;
    const L = localiserTir(munition, d.total + locMod, cibleMats, form.cote || "babord");
    tir.zone = L.zone; tir.loc = L.loc; tir.locLabel = L.label;
    tir.cibleUuid = cibleTok?.actor?.uuid ?? null; tir.cibleNom = cibleTok?.name ?? null;
    if (munition === "rouge") tir.incendie = Math.ceil(tir.degats / 5);
    tir.pjDegats = munition === "mitraille" ? "1D6+1 sur deux localisations" : "1D6+2";
  }
  // Consommation et état de la batterie
  const upd = { [`system.batteries.${batId}.chargee`]: false };
  if (b.position === "bordée") upd["system.reserves.munitions"] = Math.max(0, (s.reserves.munitions ?? 0) - 1);
  await navire.update(upd);

  const contentChat = await render("chat/canonnade.hbs", { tir, notes, navire: navire.name });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: navire }), content: contentChat, rolls,
    flags: { [SYS]: { type: "canonnade", tir } }
  });
}

/** Applique les effets d'une canonnade au navire ciblé. */
export async function appliquerCanonnade(message) {
  const tir = message.flags[SYS]?.tir;
  if (!tir?.touche) return;
  let cible = tir.cibleUuid ? fromUuidSync(tir.cibleUuid) : null;
  if (!cible) cible = navireCible()?.actor ?? canvas.tokens?.controlled?.[0]?.actor;
  if (!cible || cible.type !== "navire") return ui.notifications.warn("Ciblez ou sélectionnez le navire touché.");
  if (!cible.isOwner) return ui.notifications.warn("Vous n'avez pas les droits sur ce navire.");
  const s = cible.system;
  const upd = {};
  const lignes = [];
  if (tir.zone === "mature" || tir.zone === "coque") {
    const path = `system.structure.${tir.zone}.${tir.loc}`;
    const avant = s.structure[tir.zone][tir.loc];
    upd[path] = avant - tir.degats;
    lignes.push(`${tir.locLabel} : ${avant} → ${avant - tir.degats} PS`);
  }
  if (tir.pertes > 0) {
    upd["system.equipage.actuel"] = Math.max(0, s.equipage.actuel - tir.pertes);
    lignes.push(`Équipage : ${s.equipage.actuel} → ${Math.max(0, s.equipage.actuel - tir.pertes)} hommes (blessés à soigner)`);
  }
  await cible.update(upd);
  const etat = tir.zone === "mature" ? cible.system.etats.mature[tir.loc] : (tir.zone === "coque" ? cible.system.etats.coque[tir.loc] : null);
  if (etat) lignes.push(`État de la localisation : <strong>${etat.label}</strong>${etat.idx >= 4 ? " — avarie critique possible !" : ""}`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: cible }),
    content: `<div class="pn2-card"><h3>${cible.name} encaisse la canonnade</h3><p>${lignes.join("<br>")}</p><p class="hint">Chaque PJ à bord doit effectuer un Test de Chance pour savoir s'il est touché (${tir.pjDegats}).</p></div>`
  });
}

/* -------------------------------------------- */
/*  Recharge                                    */
/* -------------------------------------------- */

export async function rechargerBatterie(navire, batId) {
  const s = navire.system;
  const b = s.batteries?.[batId];
  if (!b) return;
  const groupe = computeGroupSkills(s).recharge;
  const st = statsBatterie(b);
  const content = await render("dialog/recharge.hbs", { b, st, groupe, munitions: PN2.munitions });
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: `Recharge : ${b.nom}` }, content,
    buttons: [{ action: "roll", label: "Recharger", default: true, callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object }],
    rejectClose: false
  });
  if (!form) return;
  const notes = [`Recharge : ${groupe.eff}F${groupe.fac}`];
  let fac = groupe.fac;
  if (st.modRecharge) { fac += st.modRecharge; notes.push(`Calibre : ${st.modRecharge > 0 ? "+" : ""}${st.modRecharge}`); }
  const hommes = Number(form.hommes) || st.hommes;
  if (st.hommes > 0 && hommes < st.hommes) {
    const m = Math.min(0, valeurDeMesure(Math.max(0.1, hommes / st.hommes)));
    fac += m; notes.push(`Artilleurs insuffisants (${hommes}/${st.hommes}) : ${m}`);
  }
  if (form.munition === "rouge") { fac -= 2; notes.push("Boulets rouges : -2"); }
  if (s.malusEquipage) { fac += s.malusEquipage; notes.push(`Santé de l'équipage : ${s.malusEquipage}`); }
  const modFac = Number(form.modFac) || 0;
  if (modFac) { fac += modFac; notes.push(`Divers : ${modFac}`); }
  const { result } = await effectuerTest(navire, { titre: `Recharge : ${b.nom}`, eff: groupe.eff + (Number(form.modEff) || 0), fac, notes, chat: false });
  const duree = actionNonNumerique(result.succes, { catastrophe: result.critique, echec: result.succes <= 0 });
  const tcn = parseInt(duree.longue) || 1;
  const echec = result.succes <= 0;
  await navire.update({
    [`system.batteries.${batId}.munition`]: form.munition,
    [`system.batteries.${batId}.chargee`]: false,
    [`system.batteries.${batId}.restant`]: tcn
  });
  if (echec && form.munition === "rouge") notes.push("⚠ Échec avec des boulets rouges : un incendie se déclare à bord !");
  const contentChat = await render("chat/test.hbs", {
    titre: `Recharge : ${b.nom}`, sousTitre: `${navire.name} — ${PN2.munitions[form.munition]}`, result, notes,
    texte: `Batterie prête dans <strong>${tcn} Tour(s) de combat naval</strong>.`
  });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: navire }), content: contentChat });
}

/** Fait avancer d'un Tour de combat naval : décompte des recharges. */
export async function tourNaval(navire) {
  const upd = {};
  const pretes = [];
  for (const [id, b] of Object.entries(navire.system.batteries ?? {})) {
    if (b.chargee || !(b.restant > 0)) continue;
    const r = b.restant - 1;
    upd[`system.batteries.${id}.restant`] = r;
    if (r === 0) { upd[`system.batteries.${id}.chargee`] = true; pretes.push(b.nom); }
  }
  await navire.update(upd);
  if (pretes.length) ui.notifications.info(`${navire.name} : ${pretes.join(", ")} prête(s) à tirer.`);
}

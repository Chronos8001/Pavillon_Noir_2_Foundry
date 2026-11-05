import { PN2 } from "../config.mjs";
import {
  render, lancerDes, compterSucces, opportunites, getSkill, findSpec, preparerTest, depenserReputation
} from "./dice.mjs";
import { libelleMarge } from "../helpers/tables.mjs";

const SYS = PN2.id;
const setting = k => game.settings.get(SYS, k);

/* -------------------------------------------- */
/*  Armes                                       */
/* -------------------------------------------- */

/** Compétence utilisée par une arme. */
export function competenceArme(actor, arme) {
  const comp = arme.system.competence || "mainsNues";
  if (PN2.specGroups[comp]) {
    const nom = arme.system.specialite || arme.name;
    const id = findSpec(actor, comp, nom);
    if (id) return getSkill(actor, `spec:${id}`);
    const g = PN2.specGroups[comp];
    return { key: `spec:none`, label: `${g.label} : ${nom}`, value: 0, metier: false, cat: "combat", carac: arme.system.carac, group: comp, xpPath: null };
  }
  return getSkill(actor, comp) ?? getSkill(actor, "mainsNues");
}

/** Dégâts fixes d'une arme (MD du personnage + bonus de l'arme). */
export function degatsFixes(actor, arme) {
  const md = arme.system.md === "for" ? actor.system.md.for : (arme.system.md === "adr" ? actor.system.md.adr : 0);
  return md + (arme.system.degats ?? 0);
}

/** Types d'escrime utilisables avec une arme. */
export function escrimesPour(actor, arme) {
  const esc = actor.system.escrime ?? {};
  const cat = arme?.system?.escrime ?? "autre";
  const types = [];
  const has = t => (esc[t]?.value ?? 0) > 0;
  if (cat === "epee") { if (has("epee")) types.push("epee"); if (has("destreza")) types.push("destreza"); }
  if (cat === "sabre" && has("sabre")) types.push("sabre");
  if (cat === "hache" && has("hache")) types.push("hache");
  if (cat === "baionnette" && has("baionnette")) types.push("baionnette");
  if (cat === "dague" && has("destreza")) types.push("destreza");
  // Seconde main : dague ou arme longue dans l'autre main
  const gauche = actor.items.find(i => i.type === "arme" && i.system.equipee && i.system.mainGauche && i.id !== arme?.id);
  if (gauche && ["epee", "sabre"].includes(cat)) {
    if (gauche.system.escrime === "dague" && has("dague")) types.push("dague");
    if (["epee", "sabre"].includes(gauche.system.escrime) && has("deuxarmes")) types.push("deuxarmes");
  }
  if (has("pont") && cat !== "baionnette") types.push("pont");
  if (cat === "epee" && actor.items.some(i => i.type === "manoeuvre" && i.system.escrime === "botte")) types.push("botte");
  return [...new Set(types)];
}

/** Vérifie si une combinaison est contenue dans les opportunités. */
export function comboPresent(combo, opps) {
  const pool = [...opps];
  for (const d of combo) {
    const i = pool.indexOf(d);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

const liste = s => String(s ?? "").split(/[,;]/).map(x => x.trim().toLowerCase()).filter(Boolean);
const LIBELLES_ARMES = { epee: ["épée", "epee", "rapière"], sabre: ["sabre"], hache: ["hache"], baionnette: ["baïonnette", "baionnette"], dague: ["dague"] };

/** Adéquation d'une manœuvre face à la catégorie d'arme adverse : 0 ok, 1 peu adapté, 2 inadapté. */
export function adequation(man, armeAdverse) {
  if (!armeAdverse || armeAdverse === "autre") return 0;
  const noms = LIBELLES_ARMES[armeAdverse] ?? [];
  const match = l => liste(l).some(x => noms.some(n => x.includes(n)));
  if (match(man.system.inadapte)) return 2;
  if (match(man.system.peuAdapte)) return 1;
  return 0;
}

/** Manœuvres réalisables avec ces opportunités. */
export function manoeuvresPossibles(actor, types, opps, armeAdverse = null) {
  const out = [];
  for (const it of actor.items) {
    if (it.type !== "manoeuvre") continue;
    if (!types.includes(it.system.escrime)) continue;
    const combo = it.system.combo;
    if (!combo.length || !comboPresent(combo, opps)) continue;
    const ad = adequation(it, armeAdverse);
    if (ad === 2) continue;
    out.push({
      id: it.id, nom: it.name, combo: combo.join(" "), puissance: ad === 1 ? 0 : it.system.puissance,
      peuAdapte: ad === 1, effet: it.system.effet, auto: foundry.utils.deepClone(it.system.auto), niveau: it.system.niveau,
      escrime: it.system.escrime
    });
  }
  return out.sort((a, b) => b.niveau - a.niveau || b.puissance - a.puissance);
}

/** Escrime de base (La Révolte) : opportunités 1, 5 et 0 utilisables. */
function escrimeBase(actor, arme, values, fac) {
  const lvl = actor.system.skills?.escrime?.value ?? 0;
  const cat = arme?.system?.escrime;
  if (lvl <= 0 || !["epee", "sabre"].includes(cat)) return null;
  const maitrisees = lvl >= 3 ? ["1", "5", "0"] : (lvl === 2 ? ["1", "0"] : ["1"]);
  let max = cat === "sabre" ? Math.max(1, lvl - 1) : lvl;
  const opps = opportunites(values).filter(o => maitrisees.includes(o));
  const used = [];
  for (const o of ["1", "5", "0"]) for (const x of opps.filter(v => v === o)) if (used.length < max) used.push(x);
  const nb1 = used.filter(x => x === "1").length;
  const nb5 = used.filter(x => x === "5").length;
  const nb0 = used.filter(x => x === "0").length;
  return { niveau: lvl, max, nb1, nb5, nb0, used };
}

/** Bonus de Succès obtenus en utilisant les « 5 » de l'escrime de base. */
function bonusCinq(values, fac, nb5) {
  let bonus = 0;
  const vals = [...values];
  for (let i = 0; i < nb5; i++) {
    // Un dé juste au-dessus de la Facilité devient un Succès, ou un 2 devient un 1
    const j = vals.findIndex(v => v === Math.min(9, fac) + 1);
    if (j >= 0) { vals[j]--; bonus++; continue; }
    const k = vals.findIndex(v => v === 2 && fac >= 2);
    if (k >= 0) { vals[k] = 1; bonus++; continue; }
  }
  return { bonus, restants: nb5 - bonus };
}

/* -------------------------------------------- */
/*  Long feu (L'Art de l'escrime)               */
/* -------------------------------------------- */

async function testLongFeu(actor, arme, skill, modCirc = 0) {
  const qmod = { mauvaise: 2, mediocre: 1, normale: 0, exceptionnelle: -1 }[arme.system.qualite] ?? 0;
  const chance = 4 - (skill?.value ?? 0) + qmod + (arme.system.longFeuMod ?? 0) + (Number(modCirc) || 0);
  const r = await new Roll("1d20").evaluate();
  const out = { chance, jet: r.total, rolls: [r], longFeu: r.total <= chance };
  if (out.longFeu) {
    const de = PN2.deLongFeu[arme.system.qualite] ?? "1d12";
    const r2 = await new Roll(de).evaluate();
    out.rolls.push(r2);
    out.de = de; out.effetJet = r2.total;
    if (r2.total === 1) {
      const r3 = await new Roll("1d6 - 1").evaluate();
      out.rolls.push(r3);
      out.effet = `L'arme est endommagée et doit être réparée. Elle inflige ${Math.max(0, r3.total)} point(s) de dégâts à la main qui tient la gâchette.`;
    } else if (r2.total === 2) {
      out.effet = "Le coup ne part pas… tout de suite : il partira dans 1D6/2 Tours de combat (toute personne à moins de 5 m risque d'être touchée).";
    } else {
      out.effet = "« Frrrt » : la balle tombe à quelques mètres. Le tir est perdu.";
    }
  }
  return out;
}

/* -------------------------------------------- */
/*  Attaque                                     */
/* -------------------------------------------- */

function cibleActuelle() {
  const t = game.user.targets?.first?.();
  if (!t) return null;
  return { tokenUuid: t.document.uuid, actorUuid: t.actor?.uuid, nom: t.name, img: t.document.texture?.src };
}

function armeAdverse(actorUuid) {
  if (!actorUuid) return null;
  const a = fromUuidSync(actorUuid);
  const w = a?.items?.find(i => i.type === "arme" && i.system.equipee && !i.system.mainGauche && i.system.categorie === "blanche");
  return w?.system?.escrime ?? null;
}

/**
 * Prépare et lance un Test d'attaque (ou une contre-attaque / parade).
 * @returns {object|null} données d'attaque sérialisables
 */
export async function rollAttaque(actor, arme, { defense = false, adverse = null } = {}) {
  const skill = competenceArme(actor, arme);
  const tir = arme.system.categorie !== "blanche";
  const types = escrimesPour(actor, arme);
  const cible = defense ? null : cibleActuelle();
  const data = {
    arme, skill, tir, caracs: PN2.caracs, caracDef: arme.system.carac || skill.carac, difficultes: PN2.difficultes,
    postures: PN2.postures, posture: actor.system.combat?.posture ?? "attentive", usePostures: setting("postures"),
    locs: PN2.locLabels, types: types.map(t => ({ key: t, label: PN2.escrimeTypes[t].label })),
    escrimeMode: setting("escrimeMode"), escrimeBase: (actor.system.skills?.escrime?.value ?? 0) > 0,
    gloireDispo: actor.system.reputation?.gloire?.disponibles ?? 0, infamieDispo: actor.system.reputation?.infamie?.disponibles ?? 0,
    armeFeu: arme.system.estArmeFeu, longFeu: setting("longFeu"), cible, defense, malusSante: actor.system.malusSante,
    degats: degatsFixes(actor, arme)
  };
  const content = await render("dialog/attaque.hbs", data);
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: `${defense ? "Défense" : "Attaque"} : ${arme.name}` },
    position: { width: 460 },
    content,
    buttons: [{
      action: "roll", label: "Lancer", default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }, { action: "cancel", label: "Annuler" }],
    rejectClose: false
  });
  if (!form || form === "cancel") return null;

  const p = preparerTest(actor, skill, form);
  const notes = p.notes;
  let { eff, fac } = p;
  if (arme.system.modEff) { eff += arme.system.modEff; notes.push(`Arme : ${arme.system.modEff > 0 ? "+" : ""}${arme.system.modEff}D`); }
  if (arme.system.modFac) { fac += arme.system.modFac; notes.push(`Arme : ${arme.system.modFac > 0 ? "+" : ""}${arme.system.modFac}`); }
  if (arme.system.qualite === "mauvaise") { fac -= 1; notes.push("Arme de mauvaise qualité : -1"); }
  if (arme.system.bonusAbordage) {
    const m = form.abordage ? 1 : -1; fac += m; notes.push(form.abordage ? "À l'abordage : +1" : "Hors abordage : -1");
  }
  const viser = Math.min(3, Number(form.viserEff) || 0);
  if (viser) { eff += viser; notes.push(`Viser : +${viser}D`); }
  if (tir && form.boutPortant) { eff += 2; notes.push("Bout portant : +2D"); }
  const distance = Number(form.distance) || 0;
  if (tir && distance > 0 && arme.system.portee > 0) {
    const seg = Math.max(0, Math.ceil(distance / arme.system.portee) - 1);
    if (seg) { fac -= seg; notes.push(`Distance (${distance} m) : -${seg}`); }
  }
  if (form.mainGauche && skill.key !== "pistolet") { fac -= 3; notes.push("Main gauche : -3"); }
  if (form.deuxArmes) { fac -= 3; notes.push("Combat à deux armes : -3"); }
  const typesUtilises = types.filter(t => form[`esc_${t}`]);
  if (typesUtilises.includes("pont") && typesUtilises.some(t => ["epee", "sabre", "hache"].includes(t))) {
    fac -= 1; notes.push("Combat de pont combiné : -1");
  }
  await depenserReputation(actor, p.gloire, p.infamie);

  const { roll, values, faces } = await lancerDes(Math.round(eff), skill.metier);
  const rolls = [roll];
  let vals = values;
  if (fac <= 0 && vals.length > 1) vals = vals.slice(0, 1);
  const res = compterSucces(vals, fac);

  // Expérience par la pratique
  let experience = false;
  if (skill.xpPath && skill.value >= 1 && res.succes >= skill.value && actor.isOwner) {
    experience = true; await actor.update({ [skill.xpPath]: true });
  }

  // Long feu
  let longFeu = null;
  if (data.armeFeu && setting("longFeu") && !form.sansLongFeu) {
    longFeu = await testLongFeu(actor, arme, skill, form.longFeuCirc);
    rolls.push(...longFeu.rolls);
    delete longFeu.rolls;
  }

  // Escrime
  const escrime = { mode: setting("escrimeMode"), matches: [], choisie: null, base: null };
  if (!tir && faces === 10 && !longFeu?.longFeu) {
    const opps = opportunites(vals);
    escrime.opps = opps;
    if (escrime.mode === "avance" && typesUtilises.length) {
      const adv = adverse ?? armeAdverse(cible?.actorUuid);
      escrime.matches = manoeuvresPossibles(actor, typesUtilises, opps, adv);
    } else if (escrime.mode === "base") {
      const b = escrimeBase(actor, arme, vals, fac);
      if (b && b.used.length) {
        escrime.base = b;
        if (b.nb1) {
          const r = await new Roll(`${b.nb1}d10`).evaluate();
          rolls.push(r);
          b.extraValues = r.dice[0].results.map(x => x.result);
        }
        const c5 = bonusCinq(vals, fac, b.nb5);
        b.bonus5 = c5.bonus; b.loc5 = c5.restants;
      }
    }
  }

  const att = {
    actorUuid: actor.uuid, nom: actor.name, img: actor.img, armeId: arme.id, armeNom: arme.name,
    tir, md: arme.system.md, degatsFixe: degatsFixes(actor, arme), escrimeArme: arme.system.escrime,
    skillLabel: skill.label, carac: p.caracKey, eff: Math.round(eff), fac, faces, values: vals, ...res,
    formule: `${Math.round(eff) >= 1 ? Math.round(eff) : "1D" + faces}F${fac}`,
    marge: libelleMarge(res.succes, { critique: res.critique }), notes, experience,
    posture: form.posture || "attentive", locCible: form.locCible || "", viserLoc: Math.min(3, Number(form.viserLoc) || 0),
    longFeu, escrime, cible, distance, cibles: arme.system.cibles, defense
  };
  return { att, rolls };
}

/** Attaque complète : jet puis carte de chat. */
export async function attaquer(actor, arme) {
  const out = await rollAttaque(actor, arme);
  if (!out) return;
  const { att, rolls } = out;
  // Les attaques à distance ou sans cible sont résolues immédiatement (test simple)
  const resolution = (att.tir || !att.cible) ? await creerResolution(att, null, { sansMessage: true }) : null;
  const content = await render("chat/attaque.hbs", { att, resolution, peutDefendre: !att.tir && !!att.cible });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), content, rolls,
    flags: { [SYS]: { type: "attaque", att, resolution } }
  });
}

/* -------------------------------------------- */
/*  Défense                                     */
/* -------------------------------------------- */

/** Acteur défenseur pour l'utilisateur courant. */
function defenseurPour(att) {
  if (att.cible?.actorUuid) {
    const a = fromUuidSync(att.cible.actorUuid);
    if (a?.isOwner) return a;
  }
  const tok = canvas.tokens?.controlled?.[0];
  if (tok?.actor?.isOwner) return tok.actor;
  return game.user.character ?? null;
}

/** Réaction du défenseur depuis la carte d'attaque. */
export async function defendre(message, mode) {
  const f = message.getFlag(SYS, "att") ?? message.flags[SYS]?.att;
  const att = foundry.utils.deepClone(f);
  if (!att) return;
  const actor = defenseurPour(att);
  if (!actor) return ui.notifications.warn("Sélectionnez le jeton du défenseur.");
  let def = null; const rolls = [];
  if (mode === "aucune") {
    def = { mode: "aucune", actorUuid: actor.uuid, nom: actor.name, img: actor.img };
  } else if (mode === "esquive") {
    const skill = getSkill(actor, "esquive");
    const data = { skill, caracs: PN2.caracs, caracDef: "ada", difficultes: PN2.difficultes, sys: actor.system, malusSante: actor.system.malusSante, gloireDispo: actor.system.reputation?.gloire?.disponibles ?? 0, infamieDispo: actor.system.reputation?.infamie?.disponibles ?? 0, postures: PN2.postures, usePostures: setting("postures") };
    const content = await render("dialog/test.hbs", data);
    const form = await foundry.applications.api.DialogV2.wait({
      window: { title: `Esquive : ${actor.name}` }, content,
      buttons: [{ action: "roll", label: "Esquiver", default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object }],
      rejectClose: false
    });
    if (!form) return;
    const p = preparerTest(actor, skill, form);
    await depenserReputation(actor, p.gloire, p.infamie);
    const { roll, values, faces } = await lancerDes(Math.round(p.eff), false);
    rolls.push(roll);
    const res = compterSucces(values, p.fac);
    if (skill.value >= 1 && res.succes >= skill.value && actor.isOwner) await actor.update({ [skill.xpPath]: true });
    def = {
      mode: "esquive", actorUuid: actor.uuid, nom: actor.name, img: actor.img, eff: Math.round(p.eff), fac: p.fac, faces, values, ...res,
      formule: `${Math.round(p.eff)}F${p.fac}`, notes: p.notes, posture: form.posture || "attentive", escrime: { matches: [], choisie: null }
    };
  } else {
    const armes = actor.items.filter(i => i.type === "arme" && i.system.categorie === "blanche");
    if (!armes.length) return ui.notifications.warn("Aucune arme de corps à corps.");
    let arme = armes.find(a => a.system.equipee && !a.system.mainGauche) ?? armes[0];
    if (armes.length > 1) {
      const opts = armes.map(a => `<option value="${a.id}" ${a.id === arme.id ? "selected" : ""}>${a.name}</option>`).join("");
      const id = await foundry.applications.api.DialogV2.wait({
        window: { title: "Choisir l'arme" },
        content: `<div class="form-group"><label>Arme</label><select name="arme">${opts}</select></div>`,
        buttons: [{ action: "ok", label: "Valider", default: true, callback: (e, b) => b.form.elements.arme.value }],
        rejectClose: false
      });
      if (!id) return;
      arme = actor.items.get(id);
    }
    const out = await rollAttaque(actor, arme, { defense: true, adverse: att.escrimeArme });
    if (!out) return;
    def = { ...out.att, mode: "attaque" };
    rolls.push(...out.rolls);
  }
  const resolution = await creerResolution(att, def, { sansMessage: true });
  const content = await render("chat/resolution.hbs", { att, def, resolution });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), content, rolls,
    flags: { [SYS]: { type: "resolution", att, def, resolution } }
  });
}

/* -------------------------------------------- */
/*  Résolution                                  */
/* -------------------------------------------- */

const compte1 = v => v.filter(x => x === 1).length;
const compte0 = v => v.filter(x => x === 10).length;

/** Calcule les Succès finaux d'un combattant compte tenu des manœuvres. */
function succesFinal(c, facMod, manPasse) {
  if (!c || c.mode === "aucune") return 0;
  let fac = c.fac + facMod;
  let s = compterSucces(c.values, fac).succes;
  if (c.escrime?.base) {
    const b = c.escrime.base;
    if (b.extraValues) s += compterSucces(b.extraValues, fac).brut;
    s += b.bonus5 ?? 0;
  }
  if (manPasse) {
    const m = c.escrime.choisie;
    if (m.extraValues) s += compterSucces(m.extraValues, fac).brut;
    s += m.auto.bonusS ?? 0;
  }
  return s;
}

/**
 * Résout un échange (attaque contre défense, ou attaque simple).
 * Résultat sérialisable stocké dans le message.
 */
export async function creerResolution(att, def, { locJet = null } = {}) {
  const r = { lignes: [] };
  const mA = att.escrime?.choisie ?? null;
  const mD = def?.escrime?.choisie ?? null;
  let passA = !!mA, passD = !!mD;
  if (mA && mD) {
    const pA = mA.puissance, pD = mD.puissance;
    if (pA > pD) { passD = false; r.lignes.push(`La manœuvre « ${mA.nom} » (${pA}) l'emporte sur « ${mD.nom} » (${pD}).`); }
    else if (pD > pA) { passA = false; r.lignes.push(`La manœuvre « ${mD.nom} » (${pD}) l'emporte sur « ${mA.nom} » (${pA}).`); }
    else { r.coupFourre = true; r.lignes.push(`Coup fourré : « ${mA.nom} » et « ${mD.nom} » passent toutes les deux.`); }
  }
  r.passA = passA; r.passD = passD;
  const facA = (passA ? (mA.auto.bonusFac ?? 0) : 0) - (passD ? (mD.auto.malusFacAdv ?? 0) : 0);
  const facD = (passD ? (mD.auto.bonusFac ?? 0) : 0) - (passA ? (mA.auto.malusFacAdv ?? 0) : 0);
  let aS = att.critique ? 0 : succesFinal(att, facA, passA);
  let dS = def && def.mode !== "aucune" ? (def.critique ? 0 : succesFinal(def, facD, passD)) : 0;
  if (passA && mA.auto.annuleAdv) { dS = 0; r.lignes.push("La Réussite du défenseur est annulée."); }
  if (passD && mD.auto.annuleAdv) { aS = 0; r.lignes.push("La Réussite de l'attaquant est annulée."); }
  if (att.longFeu?.longFeu) { aS = 0; r.lignes.push("Long feu : l'attaque échoue."); }
  r.succesA = aS; r.succesD = dS;

  let gagnant = null, marge = 0;
  const mode = def?.mode ?? "aucune";
  if (mode === "aucune") {
    if (aS >= 1) { gagnant = "att"; marge = aS; }
  } else if (mode === "esquive") {
    if (aS > dS) { gagnant = "att"; marge = aS - dS; }
    else r.lignes.push(`${def.nom} esquive l'attaque.`);
  } else {
    if (aS > dS) { gagnant = "att"; marge = aS - dS; }
    else if (dS > aS) { gagnant = "def"; marge = dS - aS; }
    else r.lignes.push("Fer contre fer : aucun des deux ne prend l'avantage.");
  }
  r.gagnant = gagnant; r.marge = marge;
  if (!gagnant) { r.touche = false; return r; }

  const W = gagnant === "att" ? att : def;
  const L = gagnant === "att" ? def : att;
  const mW = gagnant === "att" ? (passA ? mA : null) : (passD ? mD : null);
  const mL = gagnant === "att" ? (passD ? mD : null) : (passA ? mA : null);
  r.touche = true;
  r.attaquantUuid = W.actorUuid; r.attaquantNom = W.nom;
  r.cibleUuid = gagnant === "att" ? (def?.actorUuid ?? att.cible?.actorUuid ?? null) : att.actorUuid;
  r.cibleNom = gagnant === "att" ? (def?.nom ?? att.cible?.nom ?? "la cible") : att.nom;
  r.cibleTokenUuid = gagnant === "att" ? (att.cible?.tokenUuid ?? null) : null;

  // Prise d'avantage (postures, L'Art de l'escrime)
  const opposeCAC = mode === "attaque" || (mode === "esquive");
  if (setting("postures") && opposeCAC && !att.tir) {
    const seuil = { offensive: 1, attentive: 2, defensive: 3 }[W.posture ?? "attentive"] ?? 2;
    const d = await new Roll("1d6").evaluate();
    r.deAvantage = d.total;
    if (d.total <= seuil) {
      r.avantage = true; r.valeurAvantage = marge;
      r.lignes.push(`${W.nom} prend l'avantage (valeur ${marge}) au lieu d'infliger des dégâts (dé d'avantage : ${d.total}).`);
    }
  }

  // Dégâts
  let deg = marge + (W.degatsFixe ?? 0);
  const detail = [`Marge ${marge}`, `Arme et MD ${W.degatsFixe >= 0 ? "+" : ""}${W.degatsFixe ?? 0}`];
  if (mW?.auto?.bonusDegats) { deg += mW.auto.bonusDegats; detail.push(`Manœuvre +${mW.auto.bonusDegats}`); }
  if (setting("postures") && opposeCAC) {
    if (att.posture === "offensive" || def?.posture === "offensive") {
      const n = compte1(W.values ?? []); if (n) { deg += n; detail.push(`Posture offensive +${n}`); }
    }
    if (att.posture === "defensive" || def?.posture === "defensive") {
      const n = compte0(L?.values ?? []); if (n) { deg -= n; detail.push(`Posture défensive -${n}`); }
    }
  }
  if (L?.escrime?.base?.nb0) { deg -= L.escrime.base.nb0; detail.push(`Escrime (0) -${L.escrime.base.nb0}`); }
  if (mL?.auto?.armure) { deg -= mL.auto.armure; detail.push(`Manœuvre défensive -${mL.auto.armure}`); }
  if (mL?.auto?.invulnerable) { deg = 0; detail.push("Invulnérable (manœuvre)"); }
  r.degats = Math.max(0, deg);
  r.detailDegats = detail.join(", ");

  // Localisation
  const roll = locJet ?? (await new Roll("1d6").evaluate()).total;
  r.locJet = roll;
  let loc = roll;
  const cibleLoc = W.locCible ? PN2.locKeys.indexOf(W.locCible) + 1 : 0;
  if (cibleLoc && W.viserLoc) {
    const diff = cibleLoc - roll;
    loc = roll + Math.sign(diff) * Math.min(Math.abs(diff), W.viserLoc);
  }
  if (W.escrime?.base?.loc5 && cibleLoc) {
    const diff = cibleLoc - loc;
    loc = loc + Math.sign(diff) * Math.min(Math.abs(diff), W.escrime.base.loc5);
  }
  r.loc = PN2.localisations[loc]?.key ?? "torse";
  r.locLabel = PN2.locLabels[r.loc];
  r.choixLoc = !!(mW?.auto?.choixLoc);
  if (r.avantage) r.degats = 0;
  return r;
}

/** Choix d'une manœuvre par le propriétaire du message. */
export async function choisirManoeuvre(message, cote, idx) {
  const flags = foundry.utils.deepClone(message.flags[SYS]);
  const c = cote === "def" ? flags.def : flags.att;
  if (!c?.escrime) return;
  const actor = fromUuidSync(c.actorUuid);
  if (!actor?.isOwner && !game.user.isGM) return ui.notifications.warn("Seul le combattant peut choisir sa manœuvre.");
  const rolls = [];
  if (idx === "none") c.escrime.choisie = null;
  else {
    const m = foundry.utils.deepClone(c.escrime.matches[Number(idx)]);
    if (m.auto?.bonusD) {
      const r = await new Roll(`${m.auto.bonusD}d10`).evaluate();
      if (game.dice3d) game.dice3d.showForRoll(r, game.user, true);
      m.extraValues = r.dice[0].results.map(x => x.result);
    }
    c.escrime.choisie = m;
  }
  const locJet = flags.resolution?.locJet ?? null;
  if (flags.type === "resolution" || flags.resolution) {
    flags.resolution = await creerResolution(flags.att, flags.def ?? null, { locJet });
  }
  const tpl = flags.type === "resolution" ? "chat/resolution.hbs" : "chat/attaque.hbs";
  const content = await render(tpl, { att: flags.att, def: flags.def, resolution: flags.resolution, peutDefendre: !flags.att.tir && !!flags.att.cible });
  await message.update({ content, [`flags.${SYS}`]: flags });
}

/** Change la localisation d'une résolution (manœuvres « choisir la localisation »). */
export async function changerLocalisation(message, loc) {
  const flags = foundry.utils.deepClone(message.flags[SYS]);
  if (!flags.resolution) return;
  flags.resolution.loc = loc;
  flags.resolution.locLabel = PN2.locLabels[loc];
  const tpl = flags.type === "resolution" ? "chat/resolution.hbs" : "chat/attaque.hbs";
  const content = await render(tpl, { att: flags.att, def: flags.def, resolution: flags.resolution, peutDefendre: !flags.att.tir && !!flags.att.cible });
  await message.update({ content, [`flags.${SYS}`]: flags });
}

/** Applique les dégâts d'une résolution à la cible. */
export async function appliquerResolution(message) {
  const res = message.flags[SYS]?.resolution;
  if (!res?.touche) return;
  let actor = null;
  if (res.cibleTokenUuid) actor = fromUuidSync(res.cibleTokenUuid)?.actor;
  if (!actor && res.cibleUuid) actor = fromUuidSync(res.cibleUuid);
  if (!actor) actor = canvas.tokens?.controlled?.[0]?.actor;
  if (!actor) return ui.notifications.warn("Aucune cible : sélectionnez le jeton touché.");
  if (!actor.isOwner) return ui.notifications.warn("Vous n'avez pas les droits sur la cible : demandez au MJ d'appliquer les dégâts.");
  await actor.appliquerDegats(res.loc, res.degats);
}

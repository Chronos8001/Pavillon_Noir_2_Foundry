import { PN2 } from "../config.mjs";
import {
  render, lancerDes, compterSucces, opportunites, getSkill, findSpec, preparerTest, depenserReputation
} from "./dice.mjs";
import { libelleMarge } from "../helpers/tables.mjs";
import { resoudreTreta, experienceDestreza, compteValeur } from "./destreza.mjs";

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

/** Dégâts fixes d'une arme (MD du personnage + bonus de l'arme et de ses qualités). */
export function degatsFixes(actor, arme) {
  const md = arme.system.md === "for" ? actor.system.md.for : (arme.system.md === "adr" ? actor.system.md.adr : 0);
  return md + (arme.system.degats ?? 0) + (arme.system.bonusQualites?.degats ?? 0);
}

/** Portée effective (qualité du canon comprise). */
export function porteeArme(arme) {
  return (arme.system.portee ?? 0) + (arme.system.bonusQualites?.portee ?? 0);
}

/** Risque de long feu (sur D20) d'une arme à feu. */
export function risqueLongFeu(arme, skill, modCirc = 0) {
  const qmod = { mauvaise: 2, mediocre: 1, normale: 0, exceptionnelle: -1 }[arme.system.qualite] ?? 0;
  let circ = Number(modCirc) || 0;
  if (arme.system.qualites?.etancheite && circ > 0) circ = 0;
  return 4 - (skill?.value ?? 0) + qmod + (arme.system.longFeuMod ?? 0) + (arme.system.bonusQualites?.longFeu ?? 0) + circ;
}

/** Arme tenue dans l'autre main (équipée, main gauche). */
export function armeSecondaire(actor, arme) {
  return actor.items.find(i => i.type === "arme" && i.system.equipee && i.system.mainGauche && i.id !== arme?.id && i.system.categorie === "blanche") ?? null;
}

/** Types d'escrime connus (niveau > 0) et adaptés à une arme, avec leur niveau. */
export function escrimesArme(actor, arme) {
  return escrimesPour(actor, arme).filter(t => t !== "botte").map(t => ({ key: t, label: PN2.escrimeTypes[t].label, value: actor.system.escrime?.[t]?.value ?? 0 }));
}

/** Types d'escrime utilisables avec une arme. */
export function escrimesPour(actor, arme) {
  const esc = actor.system.escrime ?? {};
  const cat = arme?.system?.escrime ?? "autre";
  const types = [];
  const has = t => (esc[t]?.value ?? 0) > 0;
  const epeeCourte = /courte/i.test(arme?.name ?? "");
  if (cat === "epee") { if (has("epee")) types.push("epee"); if (has("destreza") && !epeeCourte) types.push("destreza"); }
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
  // La destreza est incompatible avec toutes les autres formes d'escrime (L'Art de l'escrime, p. 134)
  if (has("pont") && cat !== "baionnette" && !types.includes("destreza")) types.push("pont");
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
    if (!types.includes(it.system.escrime) || it.system.escrime === "destreza") continue;
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
  const chance = risqueLongFeu(arme, skill, modCirc);
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
  const esc = actor.system.escrime ?? {};
  const secondaire = tir ? null : armeSecondaire(actor, arme);
  // Sans le Trait de réputation correspondant, se battre avec une arme dans chaque main est Très difficile (-3)
  const traitOk = secondaire ? !!(secondaire.system.escrime === "dague" ? esc.traitDague : esc.traitDeuxArmes) : false;
  const data = {
    arme, skill, tir, caracs: PN2.caracs, caracDef: arme.system.carac || skill.carac, difficultes: PN2.difficultes,
    postures: PN2.postures, posture: actor.system.combat?.posture ?? "attentive", usePostures: setting("postures"),
    locs: PN2.locLabels, types: types.map(t => ({ key: t, label: PN2.escrimeTypes[t].label })),
    escrimeMode: setting("escrimeMode"), escrimeBase: (actor.system.skills?.escrime?.value ?? 0) > 0,
    gloireDispo: actor.system.reputation?.gloire?.disponibles ?? 0, infamieDispo: actor.system.reputation?.infamie?.disponibles ?? 0,
    armeFeu: arme.system.estArmeFeu, longFeu: setting("longFeu"), cible, defense, malusSante: actor.system.malusSante,
    degats: degatsFixes(actor, arme), portee: porteeArme(arme), qualitesTxt: arme.system.resumeQualites,
    secondaire: secondaire?.name ?? null, deuxArmesDefaut: !!secondaire && !traitOk, traitOk,
    armeDouble: arme.system.double
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
  const bq = arme.system.bonusQualites ?? {};
  if (bq.eff) { eff += bq.eff; notes.push(`${tir ? "Maniabilité" : "Équilibre"} : +${bq.eff}D`); }
  if (bq.fac) { fac += bq.fac; notes.push(`${tir ? "Platine à silex" : "Légèreté"} : +${bq.fac}`); }
  if (arme.system.double === "normale" || (arme.system.double === "superieure" && form.usageSecondaire)) {
    fac -= 1; notes.push("Arme double : -1");
  }
  if (arme.system.bonusAbordage) {
    const m = form.abordage ? 1 : -1; fac += m; notes.push(form.abordage ? "À l'abordage : +1" : "Hors abordage : -1");
  }
  const viser = Math.min(3, Number(form.viserEff) || 0);
  if (viser) { eff += viser; notes.push(`Viser : +${viser}D`); }
  if (tir && form.boutPortant) { eff += 2; notes.push("Bout portant : +2D"); }
  const distance = Number(form.distance) || 0;
  const portee = porteeArme(arme);
  if (tir && distance > 0 && portee > 0) {
    const seg = Math.max(0, Math.ceil(distance / portee) - 1);
    if (seg) { fac -= seg; notes.push(`Distance (${distance} m) : -${seg}`); }
  }
  if (form.mainGauche && skill.key !== "pistolet") { fac -= 3; notes.push("Main gauche : -3"); }
  const typesUtilises = types.filter(t => form[`esc_${t}`]);
  // Escrime à l'arme et à la dague ou à deux armes sans le Trait de réputation : toutes les attaques à -3
  const sansTrait = (typesUtilises.includes("dague") && !esc.traitDague) || (typesUtilises.includes("deuxarmes") && !esc.traitDeuxArmes);
  if (form.deuxArmes || sansTrait) {
    fac -= 3;
    notes.push(sansTrait && !form.deuxArmes ? "Escrime à deux mains sans le Trait de réputation : -3" : "Combat à deux armes : -3");
  }
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
    if (escrime.mode === "avance" && typesUtilises.includes("destreza")) {
      // Destreza : incompatible avec les autres escrimes, le diestro choisit au début du combat
      if (typesUtilises.length > 1) notes.push("Destreza : les autres escrimes ne sont pas utilisées.");
      const treta = await resoudreTreta(actor, { values: vals, fac, armeCat: arme.system.escrime, armeAdverse: adverse ?? armeAdverse(cible?.actorUuid) });
      if (treta?.rolls) { rolls.push(...treta.rolls); delete treta.rolls; }
      escrime.treta = treta;
      if (treta && !treta.vide) await experienceDestreza(actor, treta);
    } else if (escrime.mode === "avance" && typesUtilises.length) {
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
    longFeu, escrime, cible, distance, cibles: arme.system.cibles, defense,
    qualites: foundry.utils.deepClone(arme.system.qualites ?? {})
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
    const escrime = { matches: [], choisie: null };
    if (setting("escrimeMode") === "avance" && (actor.system.escrime?.destreza?.value ?? 0) > 0 && faces === 10) {
      const treta = await resoudreTreta(actor, { values, fac: p.fac, esquive: true, armeAdverse: att.escrimeArme });
      if (treta?.rolls) { rolls.push(...treta.rolls); delete treta.rolls; }
      escrime.treta = treta;
      if (treta && !treta.vide) await experienceDestreza(actor, treta);
    }
    def = {
      mode: "esquive", actorUuid: actor.uuid, nom: actor.name, img: actor.img, eff: Math.round(p.eff), fac: p.fac, faces, values, ...res,
      formule: `${Math.round(p.eff)}F${p.fac}`, notes: p.notes, posture: form.posture || "attentive", escrime
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

/** Treta exploitable d'un combattant (null si absente ou vide). */
const tretaDe = c => (c?.escrime?.treta && !c.escrime.treta.vide ? c.escrime.treta : null);

/** Calcule les Succès finaux d'un combattant compte tenu des manœuvres et de la treta. */
function succesFinal(c, facMod, manPasse, tretaPasse = false) {
  if (!c || c.mode === "aucune") return 0;
  const t = tretaPasse ? tretaDe(c) : null;
  let fac = c.fac + facMod + (t?.bonusFac ?? 0);
  let s = compterSucces(t ? t.values : c.values, fac).succes;
  if (t?.extraValues?.length) s += compterSucces(t.extraValues, fac).brut;
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
export async function creerResolution(att, def, { locJet = null, estocadaJets = [] } = {}) {
  const r = { lignes: [] };
  const mA = att.escrime?.choisie ?? null;
  const mD = def?.escrime?.choisie ?? null;
  const tA = tretaDe(att), tD = def?.mode !== "aucune" ? tretaDe(def) : null;
  let passA = !!mA, passD = !!mD;
  let passTA = !!tA, passTD = !!tD;
  if (mA && mD) {
    const pA = mA.puissance, pD = mD.puissance;
    if (pA > pD) { passD = false; r.lignes.push(`La manœuvre « ${mA.nom} » (${pA}) l'emporte sur « ${mD.nom} » (${pD}).`); }
    else if (pD > pA) { passA = false; r.lignes.push(`La manœuvre « ${mD.nom} » (${pD}) l'emporte sur « ${mA.nom} » (${pA}).`); }
    else { r.coupFourre = true; r.lignes.push(`Coup fourré : « ${mA.nom} » et « ${mD.nom} » passent toutes les deux.`); }
  }
  // Diestro contre bretteur : la plus forte puissance passe ; en cas d'égalité, ni l'une ni l'autre
  const duel = (t, m, nomT, setT, setM) => {
    if (!t || !m) return;
    if (t.puissance > m.puissance) { setM(false); r.lignes.push(`La treta de ${nomT} (${t.puissance}) l'emporte sur « ${m.nom} » (${m.puissance}).`); }
    else if (m.puissance > t.puissance) { setT(false); r.lignes.push(`« ${m.nom} » (${m.puissance}) l'emporte sur la treta de ${nomT} (${t.puissance}).`); }
    else { setT(false); setM(false); r.lignes.push(`Égalité de puissance (${t.puissance}) : ni la treta ni la manœuvre ne passent.`); }
  };
  duel(tA, mD, att.nom, v => { passTA = v; }, v => { passD = v; });
  duel(tD, mA, def?.nom, v => { passTD = v; }, v => { passA = v; });
  if (passTA) r.lignes.push(`Treta de ${att.nom} : ${tA.libelle}.`);
  if (passTD) r.lignes.push(`Treta de ${def.nom} : ${tD.libelle}.`);
  if (att.escrime?.treta) att.escrime.tretaPasse = passTA;
  if (def?.escrime?.treta) def.escrime.tretaPasse = passTD;
  r.passA = passA; r.passD = passD; r.passTA = passTA; r.passTD = passTD;
  const facA = (passA ? (mA.auto.bonusFac ?? 0) : 0) - (passD ? (mD.auto.malusFacAdv ?? 0) : 0) - (passTD ? tD.malusFacAdv : 0);
  const facD = (passD ? (mD.auto.bonusFac ?? 0) : 0) - (passA ? (mA.auto.malusFacAdv ?? 0) : 0) - (passTA ? tA.malusFacAdv : 0);
  let aS = att.critique ? 0 : succesFinal(att, facA, passA, passTA);
  let dS = def && def.mode !== "aucune" ? (def.critique ? 0 : succesFinal(def, facD, passD, passTD)) : 0;
  if (passA && mA.auto.annuleAdv) { dS = 0; r.lignes.push("La Réussite du défenseur est annulée."); }
  if (passD && mD.auto.annuleAdv) { aS = 0; r.lignes.push("La Réussite de l'attaquant est annulée."); }

  // Desvio (4) : si la Réussite du diestro est au moins égale, il retire ses « 4 » à l'adversaire et riposte
  const desvio = (t, nomT, sT, sAdv, adv) => {
    if (!t?.desvio || adv?.mode === "aucune" || !adv) return sAdv;
    if (sT < sAdv) { r.lignes.push(`Desvio de ${nomT} sans effet (Réussite inférieure).`); return sAdv; }
    const riposte = t.desvio + (adv.degatsFixe ?? 0);
    r.lignes.push(`Desvio : ${nomT} retire ${t.desvio} Succès à ${adv.nom} et retourne son attaque contre lui ou un allié proche (${t.desvio} + ${adv.degatsFixe ?? 0} = ${riposte} dégâts).`);
    (r.desvios ??= []).push({ de: nomT, degats: riposte, contre: adv.nom, cibleUuid: adv.actorUuid });
    return Math.max(0, sAdv - t.desvio);
  };
  if (passTD && def.mode === "attaque") aS = desvio(tD, def.nom, dS, aS, att);
  if (passTA && def?.mode === "attaque") dS = desvio(tA, att.nom, aS, dS, def);

  // Manteau : offensive (5) : autant de « 5 » que l'adversaire annule sa Réussite
  if (passTD && tD.manteau5 && tD.manteau5 >= compteValeur(att, 5)) { aS = 0; r.lignes.push(`Manteau : ${def.nom} annule la Réussite de ${att.nom}.`); }
  if (passTA && tA.manteau5 && def && def.mode !== "aucune" && tA.manteau5 >= compteValeur(def, 5)) { dS = 0; r.lignes.push(`Manteau : ${att.nom} annule la Réussite de ${def.nom}.`); }
  if (att.longFeu?.longFeu) { aS = 0; r.lignes.push("Long feu : l'attaque échoue."); }
  r.succesA = aS; r.succesD = dS;

  // Estocada (9) : 3 dégâts par « 9 » après l'attaque, que celle-ci touche ou non
  let jet = 0;
  const estocada = async (t, auteur, cible, mCible, tCible) => {
    if (!t?.estocada || !cible || cible.mode === "aucune" && !cible.actorUuid) return;
    const d = estocadaJets[jet++] ?? (await new Roll("1d6").evaluate()).total;
    const loc = PN2.localisations[d]?.key ?? "torse";
    const protege = (tCible?.pasos ?? []).includes(loc) || !!mCible?.auto?.invulnerable;
    (r.estocadas ??= []).push({ de: auteur.nom, jet: d, loc, locLabel: PN2.locLabels[loc], degats: protege ? 0 : t.estocada, cibleUuid: cible.actorUuid ?? null, cibleNom: cible.nom, protege });
    r.lignes.push(`Estocada de ${auteur.nom} : ${t.estocada} dégâts au ${PN2.locLabels[loc]}${protege ? " — annulés (Localisation protégée)" : ""}.`);
  };
  const cibleAtt = def ?? (att.cible ? { actorUuid: att.cible.actorUuid, nom: att.cible.nom } : null);
  if (passTA) await estocada(tA, att, cibleAtt, passD ? mD : null, passTD ? tD : null);
  if (passTD) await estocada(tD, def, att, passA ? mA : null, passTA ? tA : null);

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
  const tW = gagnant === "att" ? (passTA ? tA : null) : (passTD ? tD : null);
  const tL = gagnant === "att" ? (passTD ? tD : null) : (passTA ? tA : null);
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
    } else if (W.qualites?.prolongement) {
      // Prolongement du bras : l'avantage peut être pris quel que soit le dé
      r.avantagePossible = true;
      r.lignes.push(`Prolongement du bras : ${W.nom} peut prendre l'avantage (valeur ${marge}) plutôt que d'infliger des dégâts.`);
    }
  }
  if (mW && /parade/i.test(mW.nom) && W.qualites?.briseLame) {
    r.lignes.push(`Brise-lame : ${W.nom} dispose d'une Action gratuite pour attaquer de l'autre main.`);
  }

  // Dégâts
  let deg = marge + (W.degatsFixe ?? 0);
  const detail = [`Marge ${marge}`, `Arme et MD ${W.degatsFixe >= 0 ? "+" : ""}${W.degatsFixe ?? 0}`];
  if (mW?.auto?.bonusDegats) { deg += mW.auto.bonusDegats; detail.push(`Manœuvre +${mW.auto.bonusDegats}`); }
  if (tW?.bonusDegats) { deg += tW.bonusDegats; detail.push(`Arrebatar +${tW.bonusDegats}`); }
  if (setting("postures") && opposeCAC) {
    // Pointe légère : bonus de dégâts et protection des postures doublés pour la lame qui en dispose
    if (att.posture === "offensive" || def?.posture === "offensive") {
      let n = compte1(W.values ?? []); if (W.qualites?.pointeLegere) n *= 2;
      if (n) { deg += n; detail.push(`Posture offensive +${n}${W.qualites?.pointeLegere ? " (pointe légère)" : ""}`); }
    }
    if (att.posture === "defensive" || def?.posture === "defensive") {
      let n = compte0(L?.values ?? []); if (L?.qualites?.pointeLegere) n *= 2;
      if (n) { deg -= n; detail.push(`Posture défensive -${n}${L?.qualites?.pointeLegere ? " (pointe légère)" : ""}`); }
    }
  }
  if (L?.escrime?.base?.nb0) { deg -= L.escrime.base.nb0; detail.push(`Escrime (0) -${L.escrime.base.nb0}`); }
  if (mL?.auto?.armure) { deg -= mL.auto.armure; detail.push(`Manœuvre défensive -${mL.auto.armure}`); }
  if (tL?.armure) { deg -= tL.armure; detail.push(`Manteau (parade) -${tL.armure}`); }
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
  // Pasos (7) : les premières Localisations de l'ordre choisi sont protégées
  if (tL?.pasos?.includes(r.loc)) { r.degats = 0; r.detailDegats += `, Pasos : ${r.locLabel} protégé(e)`; }
  if (r.avantage) r.degats = 0;
  return r;
}

/** Applique les dégâts d'une Estocada (index dans la résolution). */
export async function appliquerEstocada(message, index) {
  const e = message.flags[SYS]?.resolution?.estocadas?.[Number(index)];
  if (!e || !e.degats) return;
  const actor = e.cibleUuid ? fromUuidSync(e.cibleUuid) : canvas.tokens?.controlled?.[0]?.actor;
  if (!actor) return ui.notifications.warn("Sélectionnez le jeton touché.");
  if (!actor.isOwner) return ui.notifications.warn("Demandez au MJ d'appliquer les dégâts.");
  await actor.appliquerDegats(e.loc, e.degats);
}

/** Prolongement du bras : le vainqueur choisit de prendre l'avantage. */
export async function prendreAvantage(message) {
  const flags = foundry.utils.deepClone(message.flags[SYS]);
  const r = flags.resolution;
  if (!r?.avantagePossible) return;
  r.avantage = true; r.avantagePossible = false; r.valeurAvantage = r.marge; r.degats = 0;
  r.lignes.push(`${r.attaquantNom} prend l'avantage (valeur ${r.marge}).`);
  const tpl = flags.type === "resolution" ? "chat/resolution.hbs" : "chat/attaque.hbs";
  const content = await render(tpl, { att: flags.att, def: flags.def, resolution: r, peutDefendre: !flags.att.tir && !!flags.att.cible });
  await message.update({ content, [`flags.${SYS}`]: flags });
}

/**
 * Expérience d'escrime (L'Art de l'escrime, p. 139) : réaliser une manœuvre coche autant de cases
 * que son Niveau ; l'adversaire qui connaît la même escrime coche aussi ses cases.
 * delta : +1 pour ajouter, -1 pour retirer (changement de manœuvre).
 */
async function experienceEscrime(actorUuid, man, delta, { adversaireUuid = null } = {}) {
  if (!man?.escrime || man.escrime === "botte") return;
  const n = (man.niveau ?? 1) * delta;
  const maj = async (uuid, propre) => {
    const a = uuid ? fromUuidSync(uuid) : null;
    const e = a?.system?.escrime?.[man.escrime];
    if (!a || !e || !a.isOwner) return;
    if (!propre && !(e.value > 0)) return;
    const avant = e.xp ?? 0;
    const xp = Math.max(0, avant + n);
    await a.update({ [`system.escrime.${man.escrime}.xp`]: xp });
    if (delta > 0 && xp > e.value && avant <= e.value) {
      ui.notifications.info(`${a.name} : expérience pratique en ${PN2.escrimeTypes[man.escrime].label} (${xp} cases pour le niveau ${e.value}).`);
    }
  };
  await maj(actorUuid, true);
  if (adversaireUuid && adversaireUuid !== actorUuid) await maj(adversaireUuid, false);
}

/** Choix d'une manœuvre par le propriétaire du message. */
export async function choisirManoeuvre(message, cote, idx) {
  const flags = foundry.utils.deepClone(message.flags[SYS]);
  const c = cote === "def" ? flags.def : flags.att;
  if (!c?.escrime) return;
  const actor = fromUuidSync(c.actorUuid);
  if (!actor?.isOwner && !game.user.isGM) return ui.notifications.warn("Seul le combattant peut choisir sa manœuvre.");
  const rolls = [];
  const adverse = cote === "def" ? flags.att?.actorUuid : (flags.def?.actorUuid ?? flags.att?.cible?.actorUuid ?? null);
  if (c.escrime.choisie) await experienceEscrime(c.actorUuid, c.escrime.choisie, -1, { adversaireUuid: adverse });
  if (idx === "none") c.escrime.choisie = null;
  else {
    const m = foundry.utils.deepClone(c.escrime.matches[Number(idx)]);
    if (m.auto?.bonusD) {
      const r = await new Roll(`${m.auto.bonusD}d10`).evaluate();
      if (game.dice3d) game.dice3d.showForRoll(r, game.user, true);
      m.extraValues = r.dice[0].results.map(x => x.result);
    }
    c.escrime.choisie = m;
    await experienceEscrime(c.actorUuid, m, 1, { adversaireUuid: adverse });
  }
  const locJet = flags.resolution?.locJet ?? null;
  if (flags.type === "resolution" || flags.resolution) {
    flags.resolution = await creerResolution(flags.att, flags.def ?? null, { locJet, estocadaJets: (flags.resolution?.estocadas ?? []).map(e => e.jet) });
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

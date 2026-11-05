import { PN2 } from "../config.mjs";
import { libelleMarge } from "../helpers/tables.mjs";

const TEMPLATES = "systems/pavillon-noir-2/templates";
export const render = (path, data) => foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/${path}`, data);

/* -------------------------------------------- */
/*  Lancer et compter                           */
/* -------------------------------------------- */

/**
 * Lance les dés d'un Test.
 * - Efficacité ≥ 1 : nD10
 * - Efficacité = 0 : 1D12 (compétence générale) ou 1D20 (compétence de métier)
 * - Efficacité < 0 : 1D100
 */
export async function lancerDes(eff, metier = false) {
  let faces, nb = 1;
  if (eff >= 1) { faces = 10; nb = eff; }
  else if (eff === 0) faces = metier ? 20 : 12;
  else faces = 100;
  const roll = await new Roll(`${nb}d${faces}`).evaluate();
  const values = roll.dice[0].results.map(r => r.result);
  return { roll, values, faces };
}

/**
 * Compte les Succès : chaque dé ≤ Facilité vaut 1 Succès, un « 1 » en vaut 2
 * (sauf si la Facilité est de 1). Au-delà de 9, chaque point de Facilité
 * donne un Succès automatique et interdit l'Échec critique.
 */
export function compterSucces(values, fac) {
  const facEff = Math.min(9, fac);
  const extra = fac > 9 ? fac - 9 : 0;
  let brut = 0;
  const details = values.map(v => {
    let n = 0;
    if (fac > 0 && v <= facEff) n = (v === 1 && facEff > 1) ? 2 : 1;
    brut += n;
    return { v, n, cls: n === 2 ? "crit" : (n === 1 ? "ok" : (v >= 10 ? "fumble" : "ko")) };
  });
  const critique = brut === 0 && extra === 0 && values.length > 0 && values.every(v => v >= 10);
  return { succes: brut + extra, brut, extra, critique, details };
}

/** Opportunités d'escrime : valeurs des dés en chaînes (« 10 » devient « 0 »). */
export function opportunites(values, faces = 10) {
  if (faces !== 10) return [];
  return values.map(v => (v === 10 ? "0" : String(v)));
}

/* -------------------------------------------- */
/*  Compétences                                 */
/* -------------------------------------------- */

const normalize = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Description d'une compétence d'un acteur à partir d'une clé. */
export function getSkill(actor, key) {
  const sys = actor.system;
  if (!key) return null;
  if (key.startsWith("spec:")) {
    const id = key.slice(5);
    const sp = sys.specs?.[id];
    if (!sp) return null;
    const g = PN2.specGroups[sp.group] ?? {};
    return {
      key, label: `${g.label ?? sp.group} : ${sp.name}`, value: sp.value ?? 0, metier: !!sp.metier,
      cat: g.cat ?? "combat", carac: sp.carac || g.carac || "adr", group: sp.group, xpPath: `system.specs.${id}.xp`
    };
  }
  if (key.startsWith("esc:")) {
    const t = key.slice(4);
    const e = sys.escrime?.[t];
    return {
      key, label: PN2.escrimeTypes[t]?.label ?? t, value: e?.value ?? 0, metier: true, cat: "combat",
      carac: "eru", xpPath: null
    };
  }
  const def = PN2.skills[key];
  if (!def) return null;
  const metier = def.armeFeu ? !!sys.armesFeuMetier : !!def.metier;
  return {
    key, label: def.label, value: sys.skills?.[key]?.value ?? 0, metier, cat: def.cat, carac: def.carac,
    group: groupeSkill(def), xpPath: `system.skills.${key}.xp`
  };
}

/** Clé de groupe d'une compétence fixe (pour les modificateurs « artisanat:-2 », « armesFeu:-1 »…). */
export function groupeSkill(def) {
  if (def.armeFeu) return "armesFeu";
  return { "Artisanat": "artisanat", "Artillerie": "artillerie", "Connaissance spécialisée": "connSpe" }[def.group] ?? null;
}

/** Trouve l'entrée de spécialité correspondant à un groupe et un nom. */
export function findSpec(actor, group, name) {
  const specs = actor.system.specs ?? {};
  const n = normalize(name);
  for (const [id, sp] of Object.entries(specs)) {
    if (sp.group === group && normalize(sp.name) === n) return id;
  }
  // correspondance partielle (ex. « Sabre » pour « Sabre d'abordage »)
  for (const [id, sp] of Object.entries(specs)) {
    if (sp.group === group && n && (normalize(sp.name).includes(n) || n.includes(normalize(sp.name)))) return id;
  }
  return null;
}

/** Somme des modificateurs (avantages/faiblesses) applicables à une compétence. */
export function modificateurSkill(actor, skill) {
  const m = actor.system.modificateurs?.skill ?? {};
  let total = 0;
  if (!skill) return 0;
  const baseKey = skill.key.startsWith("spec:") ? null : skill.key;
  if (baseKey && m[baseKey]) total += m[baseKey];
  if (skill.group && m[skill.group]) total += m[skill.group];
  if (skill.cat && m[skill.cat]) total += m[skill.cat];
  return total;
}

/* -------------------------------------------- */
/*  Test générique                              */
/* -------------------------------------------- */

/**
 * Effectue un Test et l'affiche dans le chat.
 * @param {Actor} actor
 * @param {object} o
 * @param {string} o.titre       titre affiché
 * @param {number} o.eff         Efficacité finale
 * @param {number} o.fac         Facilité finale
 * @param {boolean} o.metier     compétence de métier (dé de profane D20)
 * @param {object} [o.skill]     compétence utilisée (pour l'expérience)
 * @param {string[]} [o.notes]   détails des modificateurs
 * @param {boolean} [o.chat=true]
 */
export async function effectuerTest(actor, o) {
  const eff = Math.round(o.eff);
  const fac = Math.round(o.fac);
  let { roll, values, faces } = await lancerDes(eff, o.metier);
  // Facilité nulle : échec automatique, un seul dé pour l'Échec critique
  if (fac <= 0 && values.length > 1) values = values.slice(0, 1);
  const res = compterSucces(values, fac);
  res.succes += (o.bonusS ?? 0);
  const result = {
    eff, fac, faces, values, ...res, bonusS: o.bonusS ?? 0,
    marge: libelleMarge(res.succes, { critique: res.critique }),
    formule: `${eff >= 1 ? eff : (eff === 0 ? "1D" + faces : "1D100")}F${fac}`
  };

  // Expérience par la pratique
  if (o.skill?.xpPath && o.skill.value >= 1 && res.succes >= o.skill.value && actor?.isOwner) {
    result.experience = true;
    await actor.update({ [o.skill.xpPath]: true });
  }

  if (o.chat !== false) {
    const content = await render("chat/test.hbs", { titre: o.titre, result, notes: o.notes ?? [], actor, sousTitre: o.sousTitre });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: [roll],
      flags: { [PN2.id]: { type: "test", result } }
    });
  }
  return { result, roll };
}

/** Dépense de points de Gloire / Infamie. */
export async function depenserReputation(actor, gloire = 0, infamie = 0) {
  if (!actor || (!gloire && !infamie)) return;
  const r = actor.system.reputation;
  const upd = {};
  if (gloire) upd["system.reputation.gloire.depenses"] = (r.gloire.depenses ?? 0) + gloire;
  if (infamie) upd["system.reputation.infamie.depenses"] = (r.infamie.depenses ?? 0) + infamie;
  await actor.update(upd);
}

/* -------------------------------------------- */
/*  Boîtes de dialogue                          */
/* -------------------------------------------- */

/** Formulaire générique de Test de compétence / caractéristique. */
export async function dialogTest(actor, { skillKey = null, carac = null, titre = null } = {}) {
  const skill = skillKey ? getSkill(actor, skillKey) : null;
  const sys = actor.system;
  const caracDef = carac ?? skill?.carac ?? "adr";
  const facPNJ = skill && sys.facilitePNJ ? sys.facilitePNJ(skill.cat) : null;
  const data = {
    skill, caracs: PN2.caracs, caracDef, difficultes: PN2.difficultes, sys,
    valeurMetier: sys.valeurMetier, metierNom: sys.metier?.nom, facPNJ,
    gloireDispo: sys.reputation?.gloire?.disponibles ?? 0, infamieDispo: sys.reputation?.infamie?.disponibles ?? 0,
    modAuto: skill ? modificateurSkill(actor, skill) : 0, malusSante: sys.malusSante ?? 0
  };
  const content = await render("dialog/test.hbs", data);
  const label = titre ?? (skill ? skill.label : `Test de ${PN2.caracs[caracDef].label}`);
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: label },
    content,
    buttons: [{
      action: "roll", label: "Lancer", default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }, { action: "cancel", label: "Annuler" }],
    rejectClose: false
  });
  if (!form || form === "cancel") return null;
  return lancerTestDepuisForm(actor, skill, form, label);
}

/** Calcule l'Efficacité et la Facilité d'un test à partir du formulaire. */
export function preparerTest(actor, skill, form) {
  const sys = actor.system;
  const notes = [];
  const caracKey = form.carac || skill?.carac || "adr";
  let fac;
  if (form.useMetier && sys.valeurMetier) {
    fac = sys.valeurMetier; notes.push(`Valeur de métier (${sys.metier.nom}) : ${fac}`);
  } else if (form.usePNJ && skill && sys.facilitePNJ?.(skill.cat)) {
    fac = sys.facilitePNJ(skill.cat); notes.push(`Facilité de catégorie : ${fac}`);
  } else {
    fac = sys.c?.[caracKey] ?? 0; notes.push(`${PN2.caracs[caracKey].label} : ${fac}`);
  }
  let eff = skill ? skill.value : 2;
  if (!skill) notes.push("Test de caractéristique : 2 dés");
  const diff = Number(form.difficulte) || 0;
  if (diff) { fac += diff; notes.push(`Difficulté : ${diff > 0 ? "+" : ""}${diff}`); }
  const modFac = Number(form.modFac) || 0;
  if (modFac) { fac += modFac; notes.push(`Mod. Facilité : ${modFac > 0 ? "+" : ""}${modFac}`); }
  const modEff = Number(form.modEff) || 0;
  if (modEff) { eff += modEff; notes.push(`Mod. Efficacité : ${modEff > 0 ? "+" : ""}${modEff}D`); }
  if (skill) {
    const auto = modificateurSkill(actor, skill);
    if (auto) { fac += auto; notes.push(`Avantages/Faiblesses : ${auto > 0 ? "+" : ""}${auto}`); }
  }
  // Malus de santé : tous les tests de compétences (hors connaissances) et
  // de caractéristiques non mentales.
  const malus = sys.malusSante ?? 0;
  const concerne = skill ? skill.cat !== "connaissances" : !PN2.caracs[caracKey]?.mentale;
  if (concerne && malus) { fac += malus; notes.push(`Blessures : ${malus}`); }
  if (concerne && sys.inconscient) notes.push("⚠ Le personnage est dans le coma : le test échoue.");
  const gloire = Math.min(4, Number(form.gloire) || 0);
  const infamie = Math.min(4 - gloire, Number(form.infamie) || 0);
  if (gloire) { eff += gloire; notes.push(`Gloire : +${gloire}D`); }
  if (infamie) { fac += infamie; notes.push(`Infamie : +${infamie}`); }
  return { eff, fac, notes, gloire, infamie, caracKey };
}

async function lancerTestDepuisForm(actor, skill, form, label) {
  const p = preparerTest(actor, skill, form);
  await depenserReputation(actor, p.gloire, p.infamie);
  return effectuerTest(actor, {
    titre: label, sousTitre: skill ? `${skill.label} (${PN2.caracs[p.caracKey].abbr})` : null,
    eff: p.eff, fac: p.fac, metier: skill?.metier, skill, notes: p.notes
  });
}

/** Test de Chance : 1D10 ≤ (probabilité sur 10 + Chance). */
export async function testChance(actor) {
  const content = await render("dialog/chance.hbs", { chance: actor.system.chance });
  const form = await foundry.applications.api.DialogV2.wait({
    window: { title: "Test de Chance" },
    content,
    buttons: [{
      action: "roll", label: "Lancer", default: true,
      callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });
  if (!form) return;
  const proba = Number(form.proba) || 5;
  const seuil = proba + actor.system.chance;
  const roll = await new Roll("1d10").evaluate();
  const ok = roll.total <= seuil;
  const content2 = await render("chat/chance.hbs", { proba, chance: actor.system.chance, seuil, total: roll.total, ok });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: content2, rolls: [roll] });
}

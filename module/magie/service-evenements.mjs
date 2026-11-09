/**
 * Événements divins (phase 3) : Aléas, révélations, Quêtes mystiques, Rejets, séquelles, pénitences.
 *
 * Confidentialité : Foundry envoie toutes les données des documents à tous les clients. Les tirages
 * secrets sont donc faits sur le client du MJ actif (dés Foundry), et leurs résultats sont chiffrés
 * (coffre AES-GCM) avant d'être enregistrés sur l'acteur. Aucune carte de chat ne contient de secret :
 * le MJ est prévenu par une notification locale et consulte le panneau des événements divins.
 *
 * Aucun effet n'est appliqué sans décision du MJ.
 */
import { PN2 } from "../config.mjs";
import * as R from "./regles.mjs";
import * as M from "./moteur.mjs";
import * as E from "./evenements.mjs";
import * as Q from "./consequences.mjs";
import * as Coffre from "./coffre.mjs";
import * as S from "./service.mjs";
import { VerrouCles } from "./verrou.mjs";

const SYS = PN2.id;
const verrou = new VerrouCles();
const TPL = "systems/pavillon-noir-2/templates";
const render = (path, data) => foundry.applications.handlebars.renderTemplate(`${TPL}/${path}`, data);
const maintenant = () => game.time.worldTime;
const randomID = () => foundry.utils.randomID();
const estMJActif = () => game.user === game.users.activeGM;

function exigerMJ() {
  if (!game.user.isGM) throw new R.MagieError("permission", "Réservé au MJ.");
}

/* -------------------------------------------- */
/*  Clé du coffre                               */
/* -------------------------------------------- */

/** Clé du coffre, conservée dans le navigateur du MJ (réglage local, jamais transmis). */
export const cleCoffre = () => (game.user.isGM ? game.settings.get(SYS, "magieCleCoffre") || null : null);

/** État de la clé : présente, et identique à celle du monde (empreinte publiée sans la clé). */
export async function etatCle() {
  const cle = cleCoffre();
  const attendue = game.settings.get(SYS, "magieEmpreinteCle") || null;
  if (!cle) return { presente: false, attendue: !!attendue, concordante: false, empreinte: null };
  const empreinte = await Coffre.empreinte(cle);
  return { presente: true, attendue: !!attendue, concordante: !attendue || empreinte === attendue, empreinte };
}

/** Crée la clé du monde si aucune n'existe (premier MJ). */
export async function assurerCle() {
  if (!game.user.isGM || cleCoffre()) return cleCoffre();
  if (game.settings.get(SYS, "magieEmpreinteCle")) return null;   // une clé existe ailleurs : il faut l'importer
  const cle = await Coffre.genererCle();
  await game.settings.set(SYS, "magieCleCoffre", cle);
  await game.settings.set(SYS, "magieEmpreinteCle", await Coffre.empreinte(cle));
  ui.notifications.info("Pavillon Noir 2 : clé du coffre du MJ créée. Sauvegardez-la depuis le panneau des événements divins.");
  return cle;
}

/** Importe la clé du monde sur ce navigateur (autre ordinateur, autre MJ). */
export async function importerCle(cle) {
  exigerMJ();
  const attendue = game.settings.get(SYS, "magieEmpreinteCle");
  const empreinte = await Coffre.empreinte(String(cle).trim());
  if (attendue && empreinte !== attendue) throw new R.MagieError("coffre-cle", "Cette clé ne correspond pas à celle du monde.");
  await game.settings.set(SYS, "magieCleCoffre", String(cle).trim());
  if (!attendue) await game.settings.set(SYS, "magieEmpreinteCle", empreinte);
}

/* -------------------------------------------- */
/*  Coffre d'un acteur                          */
/* -------------------------------------------- */

const coffreVide = () => ({ version: 1, aleas: [], revelations: [], quetes: [], brouillons: [] });

/** Contenu déchiffré du coffre d'un acteur (MJ seulement). */
export async function lireCoffre(actor) {
  exigerMJ();
  const texte = actor.getFlag(SYS, "coffre");
  if (!texte) return coffreVide();
  const cle = cleCoffre();
  if (!cle) throw new R.MagieError("coffre-cle", "Clé du coffre absente sur ce navigateur : importez-la depuis le panneau des événements divins.");
  return { ...coffreVide(), ...(await Coffre.dechiffrer(texte, cle)) };
}

async function chiffrerCoffre(contenu) {
  const cle = cleCoffre();
  if (!cle) throw new R.MagieError("coffre-cle", "Clé du coffre absente.");
  return Coffre.chiffrer(contenu, cle);
}

/** Marqueur public d'examen : lancers déjà examinés (ne révèle rien, tous les lancers sont examinés). */
function lireExamen(actor) {
  try { return JSON.parse(actor.getFlag(SYS, "examen") ?? "null"); } catch { return null; }
}

/** Opération sur le coffre, sous verrou, avec écriture unique (coffre + données éventuelles). */
async function modifierCoffre(actor, fn) {
  exigerMJ();
  return verrou.executer(actor.uuid, async () => {
    const coffre = await lireCoffre(actor);
    const extra = (await fn(coffre)) ?? {};
    await actor.update({ [`flags.${SYS}.coffre`]: await chiffrerCoffre(coffre), ...extra }, { pn2Evenements: true });
    return coffre;
  });
}

/* -------------------------------------------- */
/*  Examen secret des sollicitations            */
/* -------------------------------------------- */

/** Aléas candidats : objets du monde et compendiums visibles du MJ. */
async function candidatsAlea() {
  const liste = [];
  for (const it of game.items.filter(i => i.type === "alea")) {
    liste.push({ id: it.uuid, nom: it.name, religion: it.system.religion, voie: it.system.voie, poids: it.system.poids, conditions: it.system.conditions });
  }
  for (const pack of game.packs.filter(p => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["type", "system.religion", "system.voie", "system.poids", "system.conditions"] });
    for (const e of index) {
      if (e.type === "alea") liste.push({ id: e.uuid, nom: e.name, religion: e.system?.religion ?? "", voie: e.system?.voie ?? "", poids: e.system?.poids ?? 1, conditions: e.system?.conditions ?? {} });
    }
  }
  return liste;
}

/** Lance n d10 avec le moteur de dés de Foundry, sans message (tirage secret du MJ). */
async function d10Secrets(n) {
  const roll = await new Roll(`${n}d10`).evaluate();
  return roll.dice[0].results.map(r => r.result);
}

/** Objectif secret d'une Quête mystique : 1 à `faces` uniforme, en d10 avec relance. */
async function objectifQuete() {
  const faces = S.cfg().quete.faces;
  for (;;) {
    const r = E.uniformeParD10(await d10Secrets(3), faces);
    if (r.resultat != null) return r.resultat;
  }
}

/**
 * Examine en secret l'acte d'un acteur (MJ actif seulement) : Aléa et révélations des nouvelles
 * sollicitations, objectif et résolution des Quêtes mystiques, archivage du Rejet à la fin de l'acte.
 * Idempotent : chaque lancer, Quête et Rejet n'est traité qu'une fois, même après une reconnexion.
 */
export async function examinerActeur(actor) {
  if (!estMJActif() || !S.estPersonnage(actor) || !cleCoffre()) return null;
  const etat = S.acteCourant(actor);
  if (!etat) return null;
  return verrou.executer(actor.uuid, async () => {
    const e = S.acteCourant(actor);
    let ex = lireExamen(actor);
    if (ex?.acteId !== e.id) ex = { acteId: e.id, examines: [], quetes: [], resolues: [], archive: false };
    const aExaminer = E.lancersAExaminer(e, ex.examines);
    const t = e.transe;
    const queteEnCours = t?.actionEnCours?.type === M.ACTION.QUETE ? (t.quetes?.length ?? 0) + 1 : null;
    const quetesFinies = (t?.quetes ?? []).map(q => q.n).filter(n => !ex.resolues.includes(n));
    const aArchiver = !M.estEnCours(e) && !ex.archive;
    const nouvelleQuete = queteEnCours && !ex.quetes.includes(queteEnCours);
    if (!aExaminer.length && !nouvelleQuete && !quetesFinies.length && !aArchiver) return null;

    const coffre = await lireCoffre(actor);
    const nouveautes = [];
    const voie = actor.items.get(e.voie?.id);
    const statKey = S.cfg().types[e.typeReligion]?.stat;
    const cfgEx = {
      aleaMode: game.settings.get(SYS, "magieAleaMode"),
      aleaProbabilite: game.settings.get(SYS, "magieAleaProbabilite"),
      revelationSeuil: game.settings.get(SYS, "magieRevelationSeuil"),
      religion: R.cleVoie(e.religion ?? ""),
      valeurVoie: voie && statKey ? voie.system[statKey] : (e.seuil?.valeurStat ?? 0),
      candidatsAlea: aExaminer.includes(1) ? await candidatsAlea() : []
    };
    for (const n of aExaminer) {
      const v = await d10Secrets(6);
      const r = E.examinerSollicitation(e, e.lancers[n - 1], { alea: v.slice(0, 2), choixAlea: v.slice(2, 4), revelation: v.slice(4, 6) }, cfgEx);
      const base = { acteId: e.id, typeActe: e.type, voie: e.voie?.nom ?? "", voieId: e.voie?.id ?? null, voieCle: e.voie?.cle ?? "", date: maintenant() };
      if (r.alea) { coffre.aleas.push({ id: randomID(), ...base, ...r.alea, puissance: null, interpretation: "" }); nouveautes.push("un Aléa"); }
      if (r.revelation) { coffre.revelations.push({ id: randomID(), ...base, origine: "mat", ...r.revelation }); nouveautes.push("une révélation (Le Mat)"); }
      ex.examines.push(n);
    }
    // Quêtes mystiques : objectif secret tiré au début (ou à la reprise), résolution à la fin
    const assurerObjectif = async n => {
      let q = coffre.quetes.find(x => x.acteId === e.id && x.n === n);
      if (!q) {
        q = { id: randomID(), acteId: e.id, n, voie: e.voie?.nom ?? "", objectif: await objectifQuete(), statut: "en-cours", date: maintenant() };
        coffre.quetes.push(q);
      }
      if (!ex.quetes.includes(n)) ex.quetes.push(n);
      return q;
    };
    if (nouvelleQuete) await assurerObjectif(queteEnCours);
    for (const n of quetesFinies) {
      const q = await assurerObjectif(n);
      const donnees = t.quetes[n - 1];
      const res = E.resoudreQuete({ succes: donnees.succes, objectif: q.objectif, niveau: donnees.niveau });
      Object.assign(q, { succes: donnees.succes, niveau: donnees.niveau, reussie: res.reussie, statut: "resolue" });
      if (res.reussie) {
        coffre.revelations.push({ id: randomID(), acteId: e.id, typeActe: "transe", voie: e.voie?.nom ?? "", voieId: e.voie?.id ?? null, voieCle: e.voie?.cle ?? "",
          origine: "quete", quete: n, niveau: donnees.niveau, puissance: res.puissance, statut: "en-attente", date: maintenant() });
        nouveautes.push("une Quête mystique réussie");
      }
      ex.resolues.push(n);
    }
    // Fin de l'acte : Puissance des Aléas (suite initiale complète) et archivage du Rejet
    const extra = {};
    if (aArchiver) {
      const pa = E.puissanceAlea(e.lancers, { termine: true });
      for (const a of coffre.aleas.filter(x => x.acteId === e.id)) a.puissance = pa.puissance;
      const archive = Q.archiveRejet(e, { maintenant: maintenant(), dateReelle: new Date().toISOString() });
      if (archive && !actor.system.magie.rejets.some(r => r.id === archive.id)) {
        extra["system.magie.rejets"] = [...actor.system.magie.rejets.map(r => ({ ...r })), archive];
        nouveautes.push("un Rejet à résoudre");
      }
      ex.archive = true;
    }
    await actor.update({
      [`flags.${SYS}.coffre`]: await chiffrerCoffre(coffre),
      [`flags.${SYS}.examen`]: JSON.stringify(ex),
      ...extra
    }, { pn2Evenements: true });
    if (nouveautes.length) {
      ui.notifications.info(`${actor.name} : ${nouveautes.join(", ")} — voir le panneau des événements divins.`);
      rafraichirPanneau();
    }
    return { nouveautes };
  });
}

/** Examine tous les actes (connexion du MJ, reprise de session). */
export async function examinerTout() {
  if (!estMJActif()) return;
  if (!cleCoffre()) await assurerCle();
  for (const actor of game.actors.filter(a => S.estPersonnage(a) && a.getFlag(SYS, "acte"))) {
    try { await examinerActeur(actor); } catch (err) { console.error(`Pavillon Noir 2 | Examen des événements (${actor.name})`, err); }
  }
}

/** Le Cycle échu est signalé une fois par niveau (MJ actif, quand le temps du monde avance). */
export async function verifierCycles() {
  if (!estMJActif()) return;
  for (const actor of game.actors.filter(a => S.estPersonnage(a))) {
    const e = S.acteCourant(actor);
    const c = e?.transe?.cycle;
    if (!M.estEnCours(e) || !e.transe.actif || c?.debutNiveau == null || c.alerte === c.debutNiveau) continue;
    if (!R.etatCycle(c, maintenant()).depasse) continue;
    try { await S.signalerCycleEchu(actor); } catch (err) { console.error(err); }
  }
}

/* -------------------------------------------- */
/*  Décisions du MJ                             */
/* -------------------------------------------- */

const trouver = (liste, id) => {
  const x = liste.find(y => y.id === id);
  if (!x) throw new R.MagieError("introuvable", "Élément introuvable dans le coffre.");
  return x;
};

/**
 * Aléa : appliquer, différer, ignorer ; l'interprétation du MJ remplace la description.
 * Appliqué et communiqué, il fait l'objet d'une carte aux propriétaires et au MJ.
 */
export async function resoudreAlea(actor, id, { decision, interpretation = null, communiquer = false } = {}) {
  let alea;
  await modifierCoffre(actor, coffre => {
    alea = trouver(coffre.aleas, id);
    if (interpretation != null) alea.interpretation = interpretation;
    if (decision) alea.statut = { appliquer: "applique", differer: "differe", ignorer: "ignore" }[decision] ?? alea.statut;
  });
  if (decision === "appliquer" && communiquer) {
    await carte(actor, `Aléa divin : ${alea.voie}`, [alea.interpretation || alea.aleaNom || "La divinité se manifeste."], "");
  }
  return alea;
}

/** Pouvoirs proposables pour une révélation : même Voie, Puissance attendue, pas encore connus. */
export async function candidatsRevelation(actor, revelation) {
  const connus = new Set(actor.items.filter(i => i.type === "pouvoir").map(i => S.uuidSource(i)).filter(Boolean));
  const voie = actor.items.get(revelation.voieId);
  const uuidsVoie = new Set([voie?.uuid, S.uuidSource(voie)].filter(Boolean));
  const ok = e => Number(e.system?.puissance) === revelation.puissance
    && (uuidsVoie.has(e.system?.voieUuid) || (revelation.voieCle && R.cleVoie(e.system?.voie ?? "") === revelation.voieCle))
    && !connus.has(e.uuid);
  const liste = game.items.filter(i => i.type === "pouvoir").map(i => ({ uuid: i.uuid, nom: i.name, system: i.system }));
  for (const pack of game.packs.filter(p => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["type", "system.puissance", "system.voieUuid", "system.voie"] });
    for (const e of index) if (e.type === "pouvoir") liste.push({ uuid: e.uuid, nom: e.name, system: e.system ?? {} });
  }
  return liste.filter(ok).map(e => ({ uuid: e.uuid, nom: e.nom }));
}

/**
 * Révélation : accepter (Pouvoir existant ou nouveau, ajouté comme compulsion à assouvir), différer ou refuser.
 * Rien n'est ajouté à la fiche sans cette décision.
 */
export async function resoudreRevelation(actor, id, { decision, pouvoirUuid = null, nouveau = null, compulsion = "" } = {}) {
  exigerMJ();
  const coffre = await lireCoffre(actor);
  const rev = trouver(coffre.revelations, id);
  let cree = null;
  if (decision === "accepter") {
    if (rev.puissance < 1) throw new R.MagieError("revelation", "Puissance 0 : aucun Pouvoir ne peut être découvert.");
    const voie = actor.items.get(rev.voieId);
    let data;
    if (pouvoirUuid) {
      const doc = await fromUuid(pouvoirUuid);
      if (!doc || doc.type !== "pouvoir") throw new R.MagieError("reference", "Pouvoir introuvable.");
      data = doc.toObject();
      delete data._id;
      foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
    } else {
      if (!nouveau?.nom) throw new R.MagieError("revelation", "Choisissez un Pouvoir existant ou nommez le nouveau Pouvoir.");
      data = { name: nouveau.nom, type: "pouvoir", system: { puissance: rev.puissance } };
    }
    foundry.utils.mergeObject(data, {
      system: {
        accessible: false,                                   // compulsion à assouvir avant de pouvoir l'utiliser
        compulsion: compulsion || data.system?.compulsion || "",
        voie: data.system?.voie || voie?.system.cleEffective || rev.voieCle || "",
        voieUuid: data.system?.voieUuid || S.uuidSource(voie) || voie?.uuid || ""
      }
    });
    [cree] = await actor.createEmbeddedDocuments("Item", [data]);
    rev.pouvoirId = cree?.id ?? null;
  }
  rev.statut = { accepter: "acceptee", differer: "differee", refuser: "refusee" }[decision] ?? rev.statut;
  await modifierCoffre(actor, c => { Object.assign(trouver(c.revelations, id), rev); });
  if (cree) {
    await carte(actor, "Compulsion divine", [compulsion || "Le personnage ressent une compulsion irrépressible."],
      "Assouvir la compulsion rendra le Pouvoir accessible.");
  }
  return cree;
}

/**
 * Le MJ impose les conséquences d'un Rejet : séquelle et pénitences.
 * Communiquées, elles apparaissent sur la fiche ; sinon elles restent en brouillon dans le coffre.
 */
export async function imposerConsequences(actor, rejetId, { sequelle = null, penitences = [], communiquer = true } = {}) {
  exigerMJ();
  const rejet = actor.system.magie.rejets.find(r => r.id === rejetId);
  if (!rejet) throw new R.MagieError("introuvable", "Rejet introuvable.");
  const date = maintenant();
  const seq = sequelle ? {
    id: randomID(), rejetId, nature: sequelle.nature ?? "", gravite: Number(sequelle.gravite ?? rejet.puissance) || 0,
    duree: sequelle.duree ?? "", restrictions: sequelle.restrictions ?? "", levee: sequelle.levee ?? "",
    voieCle: sequelle.toutesVoies ? "" : rejet.voieCle, divinite: sequelle.divinite ?? rejet.voie, malusAuspices: sequelle.malusAuspices !== false,
    active: true, dateDebut: date, dateFin: null
  } : null;
  const pens = penitences.filter(p => p.description).map(p => ({
    id: randomID(), rejetId, sequelleId: seq?.id ?? "", description: p.description, divinite: p.divinite ?? rejet.voie,
    conditions: p.conditions ?? "", etat: Q.ETATS_PENITENCE.A_ACCOMPLIR, priorite: !!p.priorite, note: "",
    dateAttribution: date, derniereTentative: null, dateFin: null
  }));
  if (!communiquer) {
    await modifierCoffre(actor, c => { c.brouillons.push({ id: randomID(), rejetId, sequelle: seq, penitences: pens }); });
    return { brouillon: true };
  }
  await appliquerConsequences(actor, rejetId, seq, pens);
  return { brouillon: false };
}

async function appliquerConsequences(actor, rejetId, seq, pens) {
  const m = actor.system.magie;
  await actor.update({
    "system.magie.sequelles": [...m.sequelles.map(s => ({ ...s })), ...(seq ? [seq] : [])],
    "system.magie.penitences": [...m.penitences.map(p => ({ ...p })), ...pens],
    "system.magie.rejets": m.rejets.map(r => (r.id === rejetId ? { ...r, statut: "resolu" } : { ...r }))
  }, { pn2Evenements: true });
  const lignes = [];
  if (seq) lignes.push(`Séquelle : ${seq.nature}${seq.duree ? ` (${seq.duree})` : ""}`);
  for (const p of pens) lignes.push(`Pénitence : ${p.description}`);
  await carte(actor, "Courroux divin", lignes, "Les séquelles cessent quand toutes les pénitences sont accomplies.");
}

/** Communique un brouillon de conséquences (séquelle et pénitences) au joueur. */
export async function communiquerBrouillon(actor, brouillonId) {
  let b;
  await modifierCoffre(actor, c => {
    b = trouver(c.brouillons, brouillonId);
    c.brouillons = c.brouillons.filter(x => x.id !== brouillonId);
  });
  await appliquerConsequences(actor, b.rejetId, b.sequelle, b.penitences);
}

/** Le MJ fait évoluer une pénitence (à accomplir, en cours, accomplie, abandonnée). */
export async function majPenitence(actor, id, { etat, note } = {}) {
  exigerMJ();
  const date = maintenant();
  const penitences = actor.system.magie.penitences.map(p => {
    if (p.id !== id) return { ...p };
    const q = { ...p };
    if (etat) {
      q.etat = etat;
      if (etat === Q.ETATS_PENITENCE.EN_COURS) q.derniereTentative = date;
      if ([Q.ETATS_PENITENCE.ACCOMPLIE, Q.ETATS_PENITENCE.ABANDONNEE].includes(etat)) q.dateFin = date;
    }
    if (note != null) q.note = note;
    return q;
  });
  await actor.update({ "system.magie.penitences": penitences }, { pn2Evenements: true });
}

/** Le MJ lève une séquelle (normalement quand toutes ses pénitences sont accomplies). */
export async function leverSequelle(actor, id) {
  exigerMJ();
  const sequelles = actor.system.magie.sequelles.map(s => (s.id === id ? { ...s, active: false, dateFin: maintenant() } : { ...s }));
  await actor.update({ "system.magie.sequelles": sequelles }, { pn2Evenements: true });
}

/** Le MJ clôt un Rejet sans conséquence supplémentaire (conclusion libre). */
export async function cloreRejet(actor, id, conclusion = "") {
  exigerMJ();
  const rejets = actor.system.magie.rejets.map(r => (r.id === id ? { ...r, statut: "resolu", conclusion } : { ...r }));
  await actor.update({ "system.magie.rejets": rejets }, { pn2Evenements: true });
}

/* -------------------------------------------- */
/*  Protection et affichage                     */
/* -------------------------------------------- */

const CHEMINS_PROTEGES = ["system.magie.rejets", "system.magie.sequelles", "system.magie.penitences", `flags.${SYS}.coffre`, `flags.${SYS}.examen`];

/**
 * Appelé par PN2Actor._preUpdate : un joueur ne peut ni modifier ni supprimer les Rejets, séquelles,
 * pénitences et le coffre (contrôle côté client, comme toutes les permissions fines de Foundry).
 */
export function protegerConsequences(changes, user) {
  if (user?.isGM) return true;
  const plat = foundry.utils.flattenObject(changes);
  const touche = Object.keys(plat).some(k => CHEMINS_PROTEGES.some(p => k === p || k.startsWith(`${p}.`) || p.startsWith(`${k}.`))
    || k.startsWith(`flags.${SYS}.-=coffre`) || k.startsWith(`flags.${SYS}.-=examen`));
  if (touche) {
    ui.notifications?.warn("Les conséquences divines (Rejets, séquelles, pénitences) sont gérées par le MJ.");
    return false;
  }
  return true;
}

/** Carte publique (propriétaires et MJ) sans aucune donnée secrète. */
async function carte(actor, titre, lignes, note) {
  const ids = game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await render("chat/magie-evenement.hbs", { titre, lignes, note }),
    whisper: ids
  });
}

/** Met à jour le panneau des événements divins s'il est ouvert. */
export function rafraichirPanneau() {
  const app = foundry.applications.instances?.get("pn2-evenements");
  if (app?.rendered) app.render();
}

/**
 * Service de magie : relie le moteur pur aux documents Foundry.
 * - lit les données religieuses du personnage (Voies, Pouvoirs, Colère) ;
 * - lance les d10 avec le moteur de dés de Foundry (jamais Math.random) ;
 * - sérialise les opérations par acteur (verrou), refuse doublons et états périmés ;
 * - écrit l'acte et la Colère dans une seule mise à jour (grand livre) ;
 * - publie les messages de chat en respectant le mode de jet et la visibilité MJ ;
 * - applique la récupération horaire de la Colère avec le temps du monde.
 */
import { PN2 } from "../config.mjs";
import { MAGIE } from "./config-magie.mjs";
import * as R from "./regles.mjs";
import * as M from "./moteur.mjs";
import { VerrouCles } from "./verrou.mjs";

const SYS = PN2.id;
const TPL = "systems/pavillon-noir-2/templates";
const render = (path, data) => foundry.applications.handlebars.renderTemplate(`${TPL}/${path}`, data);

export const verrou = new VerrouCles();
export const cfg = () => CONFIG.PN2?.magie ?? MAGIE;
const maintenant = () => game.time.worldTime;
const nouvelleRequete = () => foundry.utils.randomID();
export { nouvelleRequete };

/* -------------------------------------------- */
/*  Lecture des données                         */
/* -------------------------------------------- */

export const estPersonnage = actor => ["personnage", "pnj"].includes(actor?.type);

/** Acte sacré stocké sur l'acteur (en cours ou dernier terminé), ou null. */
export function acteCourant(actor) {
  return M.deserialiserActe(actor?.getFlag?.(SYS, "acte") ?? actor?.flags?.[SYS]?.acte);
}

/**
 * Groupe de Colère d'une Voie : champ de la Voie, sinon religion du personnage, sinon religion de la Voie.
 * La Colère est commune à toutes les Voies de la religion pratiquée (ECT p. 127).
 */
export function groupeColereVoie(actor, voie) {
  const m = actor.system.magie;
  return R.cleVoie(voie?.system.groupeColere || m.religionNom || voie?.system.religion) || cfg().groupeColereDefaut;
}

/** Pouvoirs du personnage rattachés à une Voie. */
export function pouvoirsVoie(actor, voie) {
  const cle = voie.system.cleEffective;
  return actor.items.filter(i => i.type === "pouvoir" && R.cleVoie(i.system.voie) === cle)
    .sort((a, b) => a.system.puissance - b.system.puissance || a.name.localeCompare(b.name));
}

/** Synthèse des données religieuses du personnage. */
export function profilReligieux(actor) {
  const m = actor.system.magie;
  const types = cfg().types;
  const voies = actor.items.filter(i => i.type === "voie").map(v => ({
    id: v.id, nom: v.name, cle: v.system.cleEffective, religion: v.system.religion,
    foi: v.system.foi, mysteres: v.system.mysteres, affinite: v.system.affinite, sansTranse: v.system.sansTranse,
    groupeColere: groupeColereVoie(actor, v),
    pouvoirs: pouvoirsVoie(actor, v).map(p => ({
      id: p.id, nom: p.name, puissance: p.system.puissance, accessible: p.system.accessible, nomNatif: p.system.nomNatif
    }))
  }));
  const colere = Object.entries(m.colere ?? {}).map(([groupe, c]) => ({ groupe, ...c }));
  return {
    religion: m.religionNom, type: m.typeEffectif, typeSaisi: m.type, typeDeduit: m.typeDeduit, typeDef: types[m.typeEffectif] ?? null,
    faveurs: m.faveurs, faveursMod: m.faveursMod, chance: actor.system.chance,
    actesFoi: m.actesFoi, peches: m.peches, colere, voies, acte: acteCourant(actor)
  };
}

export function consulterColere(actor, groupe) {
  return actor.system.magie.colere?.[groupe]?.valeur ?? 0;
}

/**
 * Paramètres d'un acte à partir du formulaire de préparation.
 * Les composantes des Auspices sont pré-remplies depuis la fiche et la Voie, et ajustables.
 */
export function parametresActe(actor, form) {
  const m = actor.system.magie;
  const voie = actor.items.get(form.voieId);
  if (!voie || voie.type !== "voie") throw new R.MagieError("voie-inconnue", "Choisissez une Voie d'illumination du personnage.");
  const num = (v, def) => (v === "" || v == null ? def : Number(v));
  const groupe = groupeColereVoie(actor, voie);
  const p = {
    id: foundry.utils.randomID(),
    acteur: { uuid: actor.uuid, nom: actor.name },
    pilote: game.user.id,
    religion: m.religionNom,
    typeReligion: m.typeEffectif,
    types: cfg().types,
    voie: { id: voie.id, nom: voie.name, cle: voie.system.cleEffective },
    valeurs: { foi: voie.system.foi, mysteres: voie.system.mysteres },
    faveurs: m.faveurs,
    groupeColere: groupe,
    colereInitiale: consulterColere(actor, groupe),
    auspices: {
      actesFoi: num(form.actesFoi, m.actesFoi),
      affinite: num(form.affinite, voie.system.affinite),
      beaute: num(form.beaute, 0),
      peches: num(form.peches, m.peches)
    },
    maintenant: maintenant()
  };
  if (form.mode === "transe") {
    if (voie.system.sansTranse) throw new R.MagieError("sans-transe", `Il n'y a pas de Transe dans la ${voie.name}.`);
    p.instantanee = !!form.instantanee;
    p.dureeRitesMinutes = num(form.dureeRites, 0);
    p.niveauLimite = num(form.niveauLimite, cfg().transe.niveauMax);
    p.pouvoirsConnus = pouvoirsVoie(actor, voie).filter(x => x.system.accessible)
      .map(x => ({ id: x.id, nom: x.name, puissance: x.system.puissance }));
  } else {
    p.puissance = num(form.puissance, NaN);
    p.souhait = form.souhait ?? "";
    const pv = form.pouvoirId ? actor.items.get(form.pouvoirId) : null;
    p.pouvoir = pv ? { id: pv.id, nom: pv.name, puissance: pv.system.puissance } : null;
  }
  return p;
}

/** Aperçu des Auspices et du Seuil (sans rien enregistrer). */
export function apercuSeuil(actor, form) {
  try {
    const p = parametresActe(actor, form);
    if (p.instantanee) p.auspices.beaute = 0;
    const auspices = R.calculerAuspices(p.auspices);
    const seuil = R.calculerSeuil({ type: p.typeReligion, valeurs: p.valeurs, faveurs: p.faveurs, auspices: auspices.total }, p.types);
    const valeur = seuil.valeurStat;
    const req = cfg().actesRequis;
    const requis = form.mode === "transe" ? (p.instantanee ? req.transeInstantanee : req.transe) : req.rituel;
    return {
      auspices, seuil, colere: p.colereInitiale, groupe: p.groupeColere,
      risque: R.depasseSeuil(p.colereInitiale, seuil.seuil),
      avertissement: valeur < requis ? `${seuil.statLabel} ${valeur} : ${requis} est normalement requis pour cet acte (Entre ciel et terre, p. 90).` : null,
      erreur: null
    };
  } catch (err) {
    if (err instanceof R.MagieError) return { erreur: err.message };
    throw err;
  }
}

/** Seuil de Rejet d'un acte hypothétique et comparaison avec la Colère actuelle. */
export function verifierSeuil(actor, form) {
  const a = apercuSeuil(actor, form);
  if (a.erreur) throw new R.MagieError("seuil", a.erreur);
  return { seuil: a.seuil.seuil, colere: a.colere, rejet: a.risque };
}

/* -------------------------------------------- */
/*  Permissions et concurrence                  */
/* -------------------------------------------- */

function exigerProprietaire(actor) {
  if (!estPersonnage(actor)) throw new R.MagieError("acteur", "Seuls les personnages et PNJ peuvent accomplir des actes sacrés.");
  if (!actor.isOwner) throw new R.MagieError("permission", "Vous n'avez pas les droits sur ce personnage.");
}

/**
 * Garde-fou appelé par PN2Actor._preUpdate : refuse l'écriture d'un acte plus ancien que
 * celui déjà connu (mise à jour concurrente arrivée entre-temps d'un autre client).
 */
export function controleConcurrence(actor, changes, options) {
  if (!options?.pn2Magie) return true;
  const brut = foundry.utils.getProperty(changes, `flags.${SYS}.acte`);
  const nouveau = M.deserialiserActe(brut);
  const actuel = acteCourant(actor);
  if (!nouveau || !actuel || nouveau.id !== actuel.id) return true;
  if (nouveau.seq <= actuel.seq) {
    console.warn(`Pavillon Noir 2 | Mise à jour d'acte sacré périmée ignorée (seq ${nouveau.seq} ≤ ${actuel.seq}).`);
    return false;
  }
  return true;
}

/** Écrit l'acte et reporte la Colère gagnée sur la fiche, en une seule mise à jour. */
async function sauvegarder(actor, avant, apres) {
  const g = apres.groupeColere;
  const existante = actor.system.magie.colere?.[g];
  const { valeur, etat } = M.appliquerColere(apres, existante?.valeur ?? 0);
  const termine = M.estEnCours(avant) && !M.estEnCours(etat);
  const colere = {
    valeur,
    reference: termine ? maintenant() : (existante?.reference ?? null),
    recuperationBloquee: existante?.recuperationBloquee ?? false
  };
  const ok = await actor.update({
    [`flags.${SYS}.acte`]: M.serialiserActe(etat),
    [`system.magie.colere.${g}`]: colere
  }, { pn2Magie: true });
  if (!ok) throw new R.MagieError("etat-perime", "L'acte sacré a été modifié ailleurs : action annulée, la fenêtre est mise à jour.");
  return etat;
}

/**
 * Exécute une opération du moteur sous verrou : relit l'acte, vérifie le pilote, la requête
 * et la séquence, puis enregistre le nouvel état. `fn(etat)` renvoie le résultat du moteur.
 */
async function operer(actor, ctx, fn, { pilote = true } = {}) {
  exigerProprietaire(actor);
  return verrou.executer(actor.uuid, async () => {
    const etat = acteCourant(actor);
    if (!etat) throw new R.MagieError("aucun-acte", "Aucun acte sacré pour ce personnage.");
    if (pilote) M.verifierPilote(etat, game.user.id);
    if (M.verifierRequete(etat, ctx)) return { etat, doublon: true };
    const res = await fn(etat);
    if (res.doublon) return res;
    res.etat = await sauvegarder(actor, etat, res.etat);
    res.avant = etat;
    return res;
  });
}

/* -------------------------------------------- */
/*  Dés                                         */
/* -------------------------------------------- */

/** Lance un d10 sacré avec le moteur de dés de Foundry. */
export async function lancerD10() {
  const roll = await new Roll(`1d${cfg().d10.faces}`).evaluate();
  return { roll, valeur: roll.total };
}

/** Vérifie la distribution des d10 de Foundry (console ou macro MJ). */
export async function simulerDistribution(n = 1000) {
  const roll = await new Roll(`${n}d${cfg().d10.faces}`).evaluate();
  const valeurs = roll.dice[0].results.map(r => r.result);
  const succes = valeurs.filter(v => R.resoudreD10(v).resultat === R.RESULTAT.SUCCES).length;
  const res = { n, succes, colere: n - succes, proportionSucces: succes / n };
  console.log("Pavillon Noir 2 | Distribution du d10 sacré", res);
  return res;
}

/* -------------------------------------------- */
/*  Actes sacrés                                */
/* -------------------------------------------- */

/** Commence un Rituel ou une Transe (form.mode = "rituel" | "transe"). */
export async function demarrerActe(actor, form) {
  exigerProprietaire(actor);
  return verrou.executer(actor.uuid, async () => {
    const actuel = acteCourant(actor);
    if (M.estEnCours(actuel)) throw new R.MagieError("acte-en-cours", "Un acte sacré est déjà en cours pour ce personnage.");
    const p = parametresActe(actor, form);
    const etat = form.mode === "transe" ? M.creerTranse(p) : M.creerRituel(p);
    await actor.update({ [`flags.${SYS}.acte`]: M.serialiserActe(etat) }, { pn2Magie: true });
    await messageDebut(actor, etat);
    return etat;
  });
}

/** Sollicitation : lance 1d10 et l'applique à l'acte (Rituel ou action de Transe en cours). */
export async function solliciter(actor, ctx = {}) {
  let roll = null;
  const res = await operer(actor, ctx, async etat => {
    M.solliciter(etat, 1);                  // validation préalable : aucun dé n'est lancé si l'action est impossible
    const d = await lancerD10();
    roll = d.roll;
    return M.solliciter(etat, d.valeur, { ...ctx, maintenant: maintenant() });
  });
  if (!res.doublon) {
    await messageSollicitation(actor, res, roll);
    await messageFinSiBesoin(actor, res);
  }
  return res;
}

/** Arrêt volontaire (fin du Rituel ou du renforcement), après un Succès. */
export async function arreter(actor, ctx = {}) {
  const res = await operer(actor, ctx, async etat => M.arreter(etat, { ...ctx, maintenant: maintenant() }));
  if (!res.doublon) await messageFinSiBesoin(actor, res);
  return res;
}

/** Commence une action de Transe (entrée, ascension, détachement, renforcement). */
export async function commencerAction(actor, type, cible, ctx = {}) {
  return operer(actor, ctx, async etat => M.commencerAction(etat, type, { cible }, { ...ctx, maintenant: maintenant() }));
}

/** Active un Pouvoir du Chemin d'illumination. */
export async function activerPouvoir(actor, pouvoirId, ctx = {}) {
  const res = await operer(actor, ctx, async etat => M.activerPouvoir(etat, pouvoirId, { ...ctx, maintenant: maintenant() }));
  if (!res.doublon) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="pn2-card pn2-magie"><h3>Activation : ${foundry.utils.escapeHTML(res.activation.pouvoir.nom)}</h3>
        <p class="hint">Pouvoir de Puissance ${res.activation.pouvoir.puissance} activé depuis le Chemin d'illumination. Sa manifestation est décrite par le MJ.</p></div>`,
      whisper: destinataires(actor)
    });
  }
  return res;
}

/** Répartit des Succès supplémentaires (Rituel terminé, ou activation renforcée en Transe). */
export async function repartir(actor, repartition, { activation = null, ...ctx } = {}) {
  return operer(actor, ctx, async etat => (etat.type === "transe"
    ? M.repartirRenforcement(etat, activation, repartition, ctx)
    : M.repartirAmeliorations(etat, repartition, ctx)));
}

/** Interruption imposée par une autre règle (MJ ou pilote). */
export async function interrompre(actor, { motif = "", terminer = false } = {}, ctx = {}) {
  const res = await operer(actor, ctx, async etat => M.interrompre(etat, { motif, terminer }, { ...ctx, maintenant: maintenant() }),
    { pilote: !game.user.isGM });
  if (!res.doublon) await messageFinSiBesoin(actor, res);
  return res;
}

/** Annule un acte sans sollicitation. */
export async function annuler(actor, ctx = {}) {
  return operer(actor, ctx, async etat => M.annulerActe(etat, { ...ctx, maintenant: maintenant() }), { pilote: !game.user.isGM });
}

/** Reprend la conduite d'un acte : toujours pour le MJ, pour un propriétaire si le pilote est déconnecté. */
export async function reprendre(actor, ctx = {}) {
  return operer(actor, ctx, async etat => {
    const pilote = game.users.get(etat.pilote);
    if (!game.user.isGM && pilote?.active && pilote.id !== game.user.id) {
      throw new R.MagieError("pilote", `${pilote.name} conduit cet acte et est connecté.`);
    }
    return M.changerPilote(etat, game.user.id, ctx);
  }, { pilote: false });
}

/* -------------------------------------------- */
/*  Colère                                      */
/* -------------------------------------------- */

/**
 * Ajoute (delta > 0) ou retire (delta < 0) de la Colère hors acte sacré.
 * Retirer de la Colère est réservé au MJ.
 */
export async function modifierColere(actor, groupe, delta, { motif = "" } = {}) {
  exigerProprietaire(actor);
  const d = Number(delta);
  if (!Number.isInteger(d) || d === 0) return null;
  if (d < 0 && !game.user.isGM) throw new R.MagieError("permission", "Seul le MJ peut réduire la Colère divine.");
  const g = R.cleVoie(groupe) || cfg().groupeColereDefaut;
  return verrou.executer(actor.uuid, async () => {
    const c = actor.system.magie.colere?.[g] ?? {};
    const valeur = Math.max(0, (c.valeur ?? 0) + d);
    const reference = valeur > 0 && c.reference == null ? maintenant() : (c.reference ?? null);
    await actor.update({ [`system.magie.colere.${g}`]: { valeur, reference, recuperationBloquee: c.recuperationBloquee ?? false } });
    if (motif) console.log(`Pavillon Noir 2 | Colère (${actor.name}, ${g}) ${d > 0 ? "+" : ""}${d} : ${motif}`);
    return valeur;
  });
}

export const ajouterColere = (actor, groupe, n = 1, o) => modifierColere(actor, groupe, Math.abs(n), o);
export const reduireColere = (actor, groupe, n = 1, o) => modifierColere(actor, groupe, -Math.abs(n), o);

/** Récupération horaire de la Colère (1 point par heure après la fin de l'acte, jamais pendant un acte). */
export async function recupererColere(actor, quand = maintenant()) {
  if (!estPersonnage(actor) || !actor.isOwner) return 0;
  return verrou.executer(actor.uuid, async () => {
    const acte = acteCourant(actor);
    const upd = {};
    let total = 0;
    for (const [g, c] of Object.entries(actor.system.magie.colere ?? {})) {
      if (!c.valeur) continue;
      const r = R.recupererColere({
        valeur: c.valeur, reference: c.reference, maintenant: quand,
        acteEnCours: M.estEnCours(acte) && acte.groupeColere === g,
        bloquee: c.recuperationBloquee
      }, cfg().recuperation.secondesParPoint);
      if (r.valeur !== c.valeur || r.reference !== c.reference) {
        upd[`system.magie.colere.${g}`] = { valeur: r.valeur, reference: r.reference, recuperationBloquee: c.recuperationBloquee };
        total += r.recuperes;
      }
    }
    if (Object.keys(upd).length) await actor.update(upd);
    return total;
  });
}

/** Appelé quand le temps du monde avance : seul le MJ actif écrit, pour éviter les écritures multiples. */
export async function surAvanceeDuTemps(worldTime) {
  if (game.user !== game.users.activeGM) return;
  if (!game.settings.get(SYS, "magieRecuperationAuto")) return;
  for (const actor of game.actors) {
    if (!estPersonnage(actor)) continue;
    if (!Object.values(actor.system.magie?.colere ?? {}).some(c => c.valeur > 0)) continue;
    try {
      await recupererColere(actor, worldTime);
    } catch (err) {
      console.error(`Pavillon Noir 2 | Récupération de la Colère (${actor.name})`, err);
    }
  }
}

/* -------------------------------------------- */
/*  Chat                                        */
/* -------------------------------------------- */

export const seuilVisible = () => game.user.isGM || game.settings.get(SYS, "magieSeuilVisible");

/** MJ et propriétaires du personnage. */
function destinataires(actor) {
  return game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
}

/** Applique le mode de visibilité choisi par l'utilisateur (v14 : messageMode ; v13 : rollMode). */
function appliquerVisibilite(data) {
  if (typeof ChatMessage.applyMode === "function") ChatMessage.applyMode(data);
  else ChatMessage.applyRollMode(data, game.settings.get("core", "rollMode"));
}

const LIBELLES_ACTION = {
  rituel: "Rituel", entree: "Entrée en Transe", ascension: "Ascension", detachement: "Détachement", renforcement: "Renforcement"
};

async function messageDebut(actor, etat) {
  const gm = game.users.filter(u => u.isGM).map(u => u.id);
  const titre = etat.type === "transe" ? `Transe${etat.transe.instantanee ? " instantanée" : ""}` : "Rituel";
  const content = await render("chat/magie-acte.hbs", { titre: `${titre} : ${etat.voie.nom}`, etat, debut: true, details: true });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, whisper: gm });
}

async function messageSollicitation(actor, res, roll) {
  const l = res.lancer;
  const e = res.etat;
  const content = await render("chat/magie-sollicitation.hbs", {
    lancer: l, action: LIBELLES_ACTION[l.action] ?? l.action, voie: e.voie.nom,
    succes: e.succes, colereGagnee: e.colereGagnee, effet: res.effet, rejet: res.rejet
  });
  const data = { speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] };
  appliquerVisibilite(data);
  await ChatMessage.create(data);
}

/** Bilan à la fin de l'acte : version joueur (MJ + propriétaires) et détails chiffrés pour le MJ. */
async function messageFinSiBesoin(actor, res) {
  if (!res.avant || !M.estEnCours(res.avant) || M.estEnCours(res.etat)) return;
  const etat = res.etat;
  const titre = `${etat.type === "transe" ? "Fin de la Transe" : "Fin du Rituel"} : ${etat.voie.nom}`;
  const visible = game.settings.get(SYS, "magieSeuilVisible");
  const joueur = await render("chat/magie-acte.hbs", { titre, etat, fin: true, details: visible });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: joueur, whisper: destinataires(actor) });
  if (!visible) {
    const mj = await render("chat/magie-acte.hbs", { titre: `${titre} (MJ)`, etat, fin: true, details: true });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: mj, whisper: game.users.filter(u => u.isGM).map(u => u.id) });
  }
}

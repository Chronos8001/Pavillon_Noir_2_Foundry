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
import * as Ref from "./references.mjs";
import { malusSequelles } from "./consequences.mjs";
import * as J from "./journal.mjs";
import { ciblesUtilisateur, appliquerEffets, revoquerEffets } from "./service-effets.mjs";

const SYS = PN2.id;
const TPL = "systems/pavillon-noir-2/templates";
export const render = (path, data) => foundry.applications.handlebars.renderTemplate(`${TPL}/${path}`, data);

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
  return R.cleVoie(voie?.system.groupeColere || "") || m.groupeColere || R.cleVoie(voie?.system.religion || "") || cfg().groupeColereDefaut;
}

/** UUID de la source d'un objet possédé (compendium ou monde), si Foundry l'a mémorisé. */
export const uuidSource = item => item?._stats?.compendiumSource ?? item?.flags?.core?.sourceId ?? null;

/** Voies du personnage sous forme de candidats pour la résolution des références. */
function candidatsVoies(actor) {
  return actor.items.filter(i => i.type === "voie")
    .map(v => ({ id: v.id, uuid: v.uuid, sourceUuid: uuidSource(v), cle: v.system.cleEffective, item: v }));
}

/** Voie possédée d'un Pouvoir possédé (par UUID, sinon par clé), et état de la référence. */
export function voiePossedee(actor, pouvoir, candidats = candidatsVoies(actor)) {
  const r = Ref.voieDuPouvoir(pouvoir.system, candidats);
  return { voie: r.voie?.item ?? null, mode: r.mode, referenceCassee: r.referenceCassee };
}

/** Pouvoirs du personnage rattachés à une Voie. */
export function pouvoirsVoie(actor, voie) {
  const candidats = candidatsVoies(actor);
  return actor.items.filter(i => i.type === "pouvoir" && voiePossedee(actor, i, candidats).voie?.id === voie.id)
    .sort((a, b) => a.system.puissance - b.system.puissance || a.name.localeCompare(b.name));
}

/** Les paramètres des Pouvoirs sont réservés au MJ (Entre ciel et terre, p. 90), sauf réglage contraire. */
export const parametresVisibles = () => game.user.isGM || game.settings.get(SYS, "magieParametresVisibles");

/** Synthèse des données religieuses du personnage. */
export function profilReligieux(actor) {
  const m = actor.system.magie;
  const types = cfg().types;
  const acte = acteCourant(actor);
  const chemin = M.estEnCours(acte) && acte.type === "transe" ? acte.transe.chemin.map(c => c.id) : [];
  const candidats = candidatsVoies(actor);
  const voirParams = parametresVisibles();
  const pouvoirs = actor.items.filter(i => i.type === "pouvoir").map(p => {
    const r = voiePossedee(actor, p, candidats);
    const s = p.system;
    return {
      id: p.id, nom: p.name, puissance: s.puissance, nomNatif: s.nomNatif, accessible: s.accessible,
      voieId: r.voie?.id ?? null, voieNom: r.voie?.name ?? null, referenceCassee: r.referenceCassee || !r.voie,
      description: s.description, conditions: s.conditions,
      parametres: voirParams ? { portee: s.portee, cible: s.cible, impact: s.impact, duree: s.duree } : null,
      dansChemin: chemin.includes(p.id),
      etatTranse: chemin.includes(p.id) ? "chemin" : (s.accessible ? "accessible" : "compulsion")
    };
  }).sort((a, b) => (a.voieNom ?? "~").localeCompare(b.voieNom ?? "~") || a.puissance - b.puissance || a.nom.localeCompare(b.nom));
  const voies = candidats.map(({ item: v }) => ({
    id: v.id, nom: v.name, cle: v.system.cleEffective, religion: v.system.religion, domaine: v.system.domaine,
    foi: v.system.foi, mysteres: v.system.mysteres, affinite: v.system.affinite, sansTranse: v.system.sansTranse,
    groupeColere: groupeColereVoie(actor, v),
    pouvoirs: pouvoirs.filter(p => p.voieId === v.id)
  }));
  const religionItem = m.religionItemId ? actor.items.get(m.religionItemId) : null;
  const colere = Object.entries(m.colere ?? {}).map(([groupe, c]) => ({ groupe, ...c, principal: groupe === m.groupeColere }));
  return {
    religion: m.religionNom, religionItem: religionItem ? { id: religionItem.id, nom: religionItem.name, img: religionItem.img } : null,
    type: m.typeEffectif, typeSaisi: m.type, typeDeduit: m.typeDeduit, typeDef: types[m.typeEffectif] ?? null,
    faveurs: m.faveurs, faveursMod: m.faveursMod, chance: actor.system.chance, groupeColere: m.groupeColere,
    colereActuelle: consulterColere(actor, m.groupeColere),
    actesFoi: m.actesFoi, peches: m.peches, colere, voies, pouvoirs, acte, demande: demandeCourante(actor),
    rejets: m.rejets ?? [], sequelles: m.sequelles ?? [], penitences: m.penitences ?? []
  };
}

export function consulterColere(actor, groupe) {
  return actor.system.magie.colere?.[groupe]?.valeur ?? 0;
}

/**
 * Paramètres d'un acte à partir du formulaire de préparation.
 * Les composantes des Auspices sont pré-remplies depuis la fiche et la Voie, et ajustables.
 */
export function parametresActe(actor, form, { pilote = null, validation = null } = {}) {
  const m = actor.system.magie;
  const voie = actor.items.get(form.voieId);
  if (!voie || voie.type !== "voie") throw new R.MagieError("voie-inconnue", "Choisissez une Voie d'illumination du personnage.");
  const num = (v, def) => (v === "" || v == null ? def : Number(v));
  const groupe = groupeColereVoie(actor, voie);
  const p = {
    id: foundry.utils.randomID(),
    acteur: { uuid: actor.uuid, nom: actor.name },
    pilote: pilote ?? game.user.id,
    cibles: Array.isArray(form.cibles) ? form.cibles : ciblesUtilisateur(),
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
      peches: num(form.peches, m.peches) + malusSequelles(m.sequelles, voie.system.cleEffective, cfg().sequelles.malusAuspices)
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
    p.rites = form.rites ?? "";
    p.puissanceSecrete = !!form.puissanceSecrete;
    p.validation = validation;
    const pv = form.pouvoirId ? actor.items.get(form.pouvoirId) : null;
    p.pouvoir = pv ? { id: pv.id, uuid: pv.uuid, nom: pv.name, puissance: pv.system.puissance } : null;
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

/* -------------------------------------------- */
/*  Préparation : demande du joueur, validation du MJ */
/* -------------------------------------------- */

/** Le lancement d'un acte exige-t-il l'accord du MJ ? */
export const validationRequise = () => !game.user.isGM && game.settings.get(SYS, "magieValidationMJ");

/** Demande d'acte en attente (ou refusée) stockée sur l'acteur. */
export function demandeCourante(actor) {
  const brut = actor?.getFlag?.(SYS, "demande") ?? actor?.flags?.[SYS]?.demande;
  if (!brut) return null;
  try { return typeof brut === "string" ? JSON.parse(brut) : brut; } catch { return null; }
}

const CHAMPS_JOUEUR = ["mode", "voieId", "pouvoirId", "souhait", "rites", "dureeRites", "instantanee", "beaute", "cibles"];

/**
 * Le joueur soumet son acte au MJ (voie, pouvoir, souhait, rites, durée des Rites).
 * Les champs réservés au MJ (Puissance, Auspices) ne sont pas transmis.
 */
export async function demanderActe(actor, form) {
  exigerProprietaire(actor);
  return verrou.executer(actor.uuid, async () => {
    if (M.estEnCours(acteCourant(actor))) throw new R.MagieError("acte-en-cours", "Un acte sacré est déjà en cours pour ce personnage.");
    const voie = actor.items.get(form.voieId);
    if (!voie) throw new R.MagieError("voie-inconnue", "Choisissez une Voie d'illumination du personnage.");
    if (form.mode === "transe" && voie.system.sansTranse) throw new R.MagieError("sans-transe", `Il n'y a pas de Transe dans la ${voie.name}.`);
    const demande = {
      id: foundry.utils.randomID(), statut: "attente", auteur: game.user.id, maintenant: maintenant(),
      ...Object.fromEntries(CHAMPS_JOUEUR.map(k => [k, form[k] ?? null])),
      cibles: ciblesUtilisateur()
    };
    await actor.update({ [`flags.${SYS}.demande`]: JSON.stringify(demande) });
    const pv = demande.pouvoirId ? actor.items.get(demande.pouvoirId) : null;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await render("chat/magie-evenement.hbs", {
        titre: `${demande.mode === "transe" ? "Demande de Transe" : "Demande de Rituel"} : ${voie.name}`,
        lignes: [pv ? `Pouvoir invoqué : ${pv.name}` : null, demande.souhait ? `Souhait : ${demande.souhait}` : null,
          demande.rites ? `Rites : ${demande.rites}` : null].filter(Boolean),
        note: "Le MJ fixe la Puissance et les Auspices, puis autorise ou refuse l'acte depuis l'onglet Magie."
      }),
      whisper: destinataires(actor)
    });
    return demande;
  });
}

/** Le joueur retire sa demande. */
export async function annulerDemande(actor) {
  exigerProprietaire(actor);
  await actor.update({ [`flags.${SYS}.-=demande`]: null });
}

/** Le MJ refuse la demande (motif transmis au joueur). */
export async function refuserDemande(actor, motif = "") {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ peut refuser une demande.");
  const d = demandeCourante(actor);
  if (!d) throw new R.MagieError("aucune-demande", "Aucune demande en attente.");
  await actor.update({ [`flags.${SYS}.demande`]: JSON.stringify({ ...d, statut: "refusee", motifRefus: motif }) });
  await tracer(actor, J.NATURE.NARRATIVE, "Acte refusé", motif);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await render("chat/magie-evenement.hbs", {
      titre: `${d.mode === "transe" ? "Transe" : "Rituel"} refusé par le MJ`, lignes: motif ? [motif] : [], classe: "echec"
    }),
    whisper: destinataires(actor)
  });
}

/**
 * Commence un acte : directement (MJ, ou validation désactivée), ou en validant la demande du joueur.
 * @param {object} form       préparation (voie, pouvoir, souhait, rites, Puissance, Auspices…)
 * @param {object} [o]
 * @param {boolean} [o.depuisDemande]  le MJ valide la demande en attente : le joueur qui l'a faite conduira l'acte
 */
export async function demarrerActe(actor, form, { depuisDemande = false } = {}) {
  exigerProprietaire(actor);
  if (validationRequise()) return demanderActe(actor, form);
  return verrou.executer(actor.uuid, async () => {
    const actuel = acteCourant(actor);
    if (M.estEnCours(actuel)) throw new R.MagieError("acte-en-cours", "Un acte sacré est déjà en cours pour ce personnage.");
    let options = {};
    let donnees = form;
    if (depuisDemande) {
      const d = demandeCourante(actor);
      if (!d) throw new R.MagieError("aucune-demande", "Aucune demande en attente.");
      // Les choix du joueur priment pour ce qui lui revient ; le MJ fixe le reste (dont la Beauté des rites).
      donnees = { ...form, ...Object.fromEntries(CHAMPS_JOUEUR.filter(k => k !== "beaute").map(k => [k, d[k]])) };
      options = { pilote: game.users.get(d.auteur) ? d.auteur : game.user.id, validation: { par: game.user.id, maintenant: maintenant() } };
    } else if (game.user.isGM) {
      options = { validation: { par: game.user.id, maintenant: maintenant() } };
    }
    const p = parametresActe(actor, donnees, options);
    const etat = donnees.mode === "transe" ? M.creerTranse(p) : M.creerRituel(p);
    await actor.update({ [`flags.${SYS}.acte`]: M.serialiserActe(etat), [`flags.${SYS}.-=demande`]: null }, { pn2Magie: true });
    await messageDebut(actor, etat);
    return etat;
  });
}

/** Le MJ accorde (ou non) l'intervention après la résolution d'un Rituel. */
export async function validerNarration(actor, { accordee = true, note = "" } = {}, ctx = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ valide la manifestation d'une intervention divine.");
  const res = await operer(actor, ctx, async etat => M.validerNarration(etat, { accordee, note, par: game.user.id }, { ...ctx, maintenant: maintenant() }),
    { pilote: false });
  if (!res.doublon) {
    await tracer(actor, J.NATURE.NARRATIVE, accordee ? "Intervention accordée" : "Intervention refusée", note);
    // Pouvoir à application automatique : ses effets sont appliqués dès l'accord du MJ
    const pv = accordee && res.etat.rituel.pouvoir ? actor.items.get(res.etat.rituel.pouvoir.id) : null;
    if (pv?.system.application === "automatique" && pv.effects?.size) {
      try { await appliquerEffetsActe(actor); } catch (err) { ui.notifications.warn(err.message); }
    }
    const e = res.etat;
    const vue = M.vueJoueur(e, { seuilVisible: game.settings.get(SYS, "magieSeuilVisible") });
    const r = vue.rituel.resolution;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await render("chat/magie-evenement.hbs", {
        titre: accordee ? `Intervention accordée : ${e.voie.nom}` : `Intervention refusée : ${e.voie.nom}`,
        classe: accordee ? "reussite" : "echec",
        lignes: [e.rituel.souhait ? `Souhait : ${e.rituel.souhait}` : null,
          r ? `${r.succes} Succès sacré(s)${vue.rituel.puissance != null ? ` pour une Puissance de ${vue.rituel.puissance}` : ""}` : null,
          note || null].filter(Boolean)
      }),
      whisper: destinataires(actor)
    });
  }
  return res;
}

/* -------------------------------------------- */
/*  Religion, Voies et Pouvoirs du personnage   */
/* -------------------------------------------- */

/**
 * Ajoute une religion, une Voie ou un Pouvoir (monde ou compendium) au personnage.
 * La copie garde la référence de sa source ; un Pouvoir entraîne sa Voie si elle manque.
 * @returns {Promise<Item[]>} objets créés
 */
export async function ajouterAuPersonnage(actor, uuid) {
  exigerProprietaire(actor);
  const doc = await fromUuid(uuid);
  if (!doc || !["religion", "voie", "pouvoir"].includes(doc.type)) throw new R.MagieError("reference", "Document introuvable ou d'un type inattendu.");
  const deja = actor.items.find(i => i.type === doc.type && (uuidSource(i) === doc.uuid || i.uuid === doc.uuid));
  if (deja) throw new R.MagieError("doublon", `${actor.name} possède déjà « ${doc.name} ».`);
  if (doc.type === "religion") {
    const ancienne = actor.items.find(i => i.type === "religion");
    if (ancienne) throw new R.MagieError("religion", `${actor.name} pratique déjà « ${ancienne.name} » : retirez-la d'abord.`);
  }
  const aCreer = [];
  if (doc.type === "pouvoir" && doc.system.voieUuid) {
    const r = Ref.voieDuPouvoir(doc.system, candidatsVoies(actor));
    if (!r.voie) {
      const voie = await fromUuid(doc.system.voieUuid);
      if (voie?.type === "voie") aCreer.push(copieSource(voie));
    }
  }
  aCreer.push(copieSource(doc));
  return actor.createEmbeddedDocuments("Item", aCreer);
}

/** Données d'une copie possédée qui garde l'UUID de sa source. */
function copieSource(doc) {
  const data = doc.toObject();
  delete data._id;
  foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
  return data;
}

/**
 * Après l'ajout d'une religion, la Colère déjà notée sous l'ancien nom de religion passe
 * dans le groupe de la religion (sans écraser une Colère existante).
 */
export async function reporterColere(actor) {
  const m = actor.system.magie;
  const ancien = R.cleVoie(m.religion || actor.system.infos.religion || "");
  const nouveau = m.groupeColere;
  const c = m.colere ?? {};
  if (!ancien || !nouveau || ancien === nouveau || !c[ancien] || c[nouveau]) return;
  await actor.update({ [`system.magie.colere.${nouveau}`]: { ...c[ancien] }, [`system.magie.colere.-=${ancien}`]: null });
}

/** Retire une religion, une Voie ou un Pouvoir du personnage (le document source n'est pas touché). */
export async function retirerDuPersonnage(actor, itemId) {
  exigerProprietaire(actor);
  const item = actor.items.get(itemId);
  if (!item || !["religion", "voie", "pouvoir"].includes(item.type)) return null;
  const acte = acteCourant(actor);
  if (M.estEnCours(acte)) {
    const utilise = acte.voie?.id === item.id || acte.transe?.chemin.some(c => c.id === item.id) || acte.rituel?.pouvoir?.id === item.id;
    if (utilise) throw new R.MagieError("acte-en-cours", `« ${item.name} » sert à l'acte sacré en cours.`);
  }
  return item.delete();
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
    const p = res.activation.pouvoir;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await render("chat/magie-evenement.hbs", {
        titre: `Activation : ${p.nom}`, classe: "reussite",
        lignes: [`Pouvoir de Puissance ${p.puissance} activé depuis le Chemin d'illumination, avec ses paramètres de base.`],
        note: "La manifestation est décrite par le MJ. Un renforcement reste possible."
      }),
      whisper: destinataires(actor)
    });
  }
  return res;
}

/** Répartit des Succès supplémentaires (Rituel terminé, ou activation renforcée en Transe). */
export async function repartir(actor, repartition, { activation = null, ...ctx } = {}) {
  return operer(actor, ctx, async etat => (etat.type === "transe"
    ? M.repartirRenforcement(etat, activation, repartition, ctx)
    : M.repartirAmeliorations(etat, repartition, ctx)), { pilote: !game.user.isGM });
}

/** Interruption imposée par une autre règle : décision du MJ (le joueur ne peut pas fuir une série défavorable). */
export async function interrompre(actor, { motif = "", terminer = false } = {}, ctx = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ peut imposer une interruption.");
  const res = await operer(actor, ctx, async etat => M.interrompre(etat, { motif, terminer }, { ...ctx, maintenant: maintenant() }),
    { pilote: !game.user.isGM });
  if (!res.doublon) {
    await tracer(actor, J.NATURE.NARRATIVE, terminer ? "Fin de Transe imposée" : "Interruption imposée", motif);
    await messageFinSiBesoin(actor, res);
  }
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
    const piloteLegitime = pilote?.active && actor.testUserPermission(pilote, "OWNER");
    if (!game.user.isGM && piloteLegitime && pilote.id !== game.user.id) {
      throw new R.MagieError("pilote", `${pilote.name} conduit cet acte et est connecté.`);
    }
    return M.changerPilote(etat, game.user.id, ctx);
  }, { pilote: false }).then(async res => {
    if (!res.doublon && game.user.isGM) await tracer(actor, J.NATURE.ADMINISTRATIVE, "Conduite de l'acte reprise par le MJ");
    return res;
  });
}

/**
 * Correction administrative : clôt un acte dans un état exceptionnel (motif obligatoire, tracé).
 * Aucune résolution ni Rejet ; la Colère déjà tirée reste acquise.
 */
export async function clotureAdministrative(actor, motif, ctx = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Correction réservée au MJ.");
  const res = await operer(actor, ctx, async etat => M.clotureAdministrative(etat, { motif, par: game.user.id }, { ...ctx, maintenant: maintenant() }),
    { pilote: false });
  if (!res.doublon) await tracer(actor, J.NATURE.ADMINISTRATIVE, "Clôture administrative d'un acte", motif);
  return res;
}

/* -------------------------------------------- */
/*  Cycle, concentration, détachement imposé    */
/* -------------------------------------------- */

/** Le Cycle du niveau courant est écoulé : signalement unique (aucune action automatique). */
export async function signalerCycleEchu(actor) {
  const res = await operer(actor, {}, async etat => M.signalerCycle(etat, { maintenant: maintenant() }), { pilote: false });
  if (!res.doublon) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: await render("chat/magie-evenement.hbs", {
        titre: `Cycle de transe écoulé : ${res.etat.voie.nom}`, classe: "echec",
        lignes: [`Niveau de transe ${res.etat.transe.niveau} : le prêtre doit faire ascension ou se détacher.`],
        note: "S'il ne bouge pas, le MJ peut lui imposer de se détacher (Entre ciel et terre, p. 135)."
      }),
      whisper: destinataires(actor)
    });
  }
  return res;
}

/** Le MJ impose un détachement (Cycle écoulé) : le joueur doit le résoudre par ses sollicitations. */
export async function imposerDetachement(actor, ctx = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ peut imposer un détachement.");
  const res = await operer(actor, ctx, async etat => M.commencerAction(etat, M.ACTION.DETACHEMENT, { impose: game.user.id }, { ...ctx, maintenant: maintenant() }),
    { pilote: false });
  if (!res.doublon) await tracer(actor, J.NATURE.NARRATIVE, "Détachement imposé");
  return res;
}

/**
 * Perte de concentration pendant une ascension (blessure…) : l'ascension échoue et le prêtre lance
 * 2 d10 supplémentaires dont seules les Colères comptent (Entre ciel et terre, p. 136). Décision du MJ.
 */
export async function echecConcentration(actor, { motif = "" } = {}, ctx = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ constate une perte de concentration.");
  let roll = null;
  const res = await operer(actor, ctx, async etat => {
    M.echecConcentration(etat, Array(cfg().concentration.des).fill(1), { motif });   // validation sans lancer
    roll = await new Roll(`${cfg().concentration.des}d10`).evaluate();
    return M.echecConcentration(etat, roll.dice[0].results.map(r => r.result), { motif }, { ...ctx, maintenant: maintenant() });
  }, { pilote: false });
  if (!res.doublon) {
    await tracer(actor, J.NATURE.NARRATIVE, "Perte de concentration", motif);
    const data = {
      speaker: ChatMessage.getSpeaker({ actor }), rolls: [roll],
      content: await render("chat/magie-evenement.hbs", {
        titre: "Perte de concentration", classe: "echec",
        lignes: [`L'ascension échoue${motif ? ` (${motif})` : ""}.`,
          ...res.lancers.map(l => `d10 : ${l.valeur} — ${l.ignore ? "Succès ignoré" : "Colère divine"}`)],
        note: res.rejet ? "Rejet !" : "Seules les Colères sont retenues."
      })
    };
    appliquerVisibilite(data);
    await ChatMessage.create(data);
    await messageFinSiBesoin(actor, res);
  }
  return res;
}

/* -------------------------------------------- */
/*  Import des données officielles              */
/* -------------------------------------------- */

/**
 * Importe un lot de religions, Voies et Pouvoirs (format : voir references.preparerImport).
 * Les liens par clé deviennent des références UUID. Réservé au MJ.
 * @param {object} donnees
 * @param {object} [o]
 * @param {string|null} [o.packId]  compendium du monde déverrouillé (sinon : objets du monde)
 * @returns {Promise<{religions:number, voies:number, pouvoirs:number}>}
 */
export async function importerMagie(donnees, { packId = null } = {}) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ peut importer des données.");
  const plan = Ref.preparerImport(donnees, cfg().types);
  if (!plan.valide) throw new R.MagieError("import", `Import refusé :\n${plan.erreurs.join("\n")}`);
  const pack = packId ? game.packs.get(packId) : null;
  if (packId && (!pack || pack.locked)) throw new R.MagieError("import", "Compendium introuvable ou verrouillé.");
  const opts = pack ? { pack: pack.collection } : {};
  const DocItem = getDocumentClass("Item");

  // Documents déjà importés : clé d'import → document (mise à jour sans doublon)
  const existants = new Map();
  const docs = pack ? await pack.getDocuments() : game.items.contents;
  for (const d of docs) {
    const c = d.getFlag?.(SYS, "cleImport");
    if (c) existants.set(c, d);
  }
  const ids = new Map([...existants].map(([k, d]) => [k, d.id]));
  const bilan = { religions: 0, voies: 0, pouvoirs: 0, aleas: 0, misAJour: 0, avertissements: plan.avertissements };

  /** Crée ou met à jour un lot ; renvoie clé → document. */
  const enregistrer = async (type, elements, versDonnees) => {
    const { creer, maj } = Ref.planImport(type, elements, ids);
    const out = new Map();
    const crees = await DocItem.createDocuments(creer.map(el => foundry.utils.mergeObject(versDonnees(el), { flags: { [SYS]: { cleImport: Ref.cleImport(type, el.cle) } } })), opts);
    crees.forEach((d, k) => out.set(creer[k].cle, d));
    if (maj.length) {
      const majs = await DocItem.updateDocuments(maj.map(({ id, el }) => ({ _id: id, ...versDonnees(el) })), opts);
      majs.forEach((d, k) => out.set(maj[k].el.cle, d));
      bilan.misAJour += maj.length;
    }
    return out;
  };

  const religions = await enregistrer("religion", plan.religions, r => ({
    name: r.nom, type: "religion",
    system: { cle: r.cle, type: r.type, groupeColere: r.groupeColere, description: r.description, correspondances: r.correspondances.join(" ; "), source: r.source }
  }));
  const voies = await enregistrer("voie", plan.voies, v => ({
    name: v.nom, type: "voie",
    system: { cle: v.cle, religion: religions.get(v.religion)?.name ?? "", religionUuid: religions.get(v.religion)?.uuid ?? "",
      domaine: v.domaine, description: v.description, sansTranse: v.sansTranse, source: v.source }
  }));
  const majReligions = plan.religions.map(r => ({ _id: religions.get(r.cle).id, "system.voies": plan.voies.filter(v => v.religion === r.cle).map(v => voies.get(v.cle).uuid) }))
    .filter(u => u["system.voies"].length);
  if (majReligions.length) await DocItem.updateDocuments(majReligions, opts);
  const pouvoirs = await enregistrer("pouvoir", plan.pouvoirs, p => ({
    name: p.nom, type: "pouvoir",
    system: { voie: p.voie, voieUuid: voies.get(p.voie)?.uuid ?? "", puissance: p.puissance, nomNatif: p.nomNatif, application: p.application,
      portee: p.portee, cible: p.cible, impact: p.impact, duree: p.duree, conditions: p.conditions,
      compulsion: p.compulsion, visions: p.visions, description: p.description, references: p.references, source: p.source }
  }));
  const aleas = await enregistrer("alea", plan.aleas, a => ({
    name: a.nom, type: "alea",
    system: { religion: a.religion, voie: a.voie, conditions: { typesActe: a.typesActe, sens: a.sens }, categorie: a.categorie, gravite: a.gravite,
      poids: a.poids, effetNarratif: a.effetNarratif, effetMecanique: a.effetMecanique, visibilite: a.visibilite, description: a.description, source: a.source }
  }));
  Object.assign(bilan, { religions: religions.size, voies: voies.size, pouvoirs: pouvoirs.size, aleas: aleas.size });
  return bilan;
}

/**
 * Crée (si absents) les compendiums du monde destinés aux données importées : Pouvoirs, Aléas.
 * Les religions et Voies du supplément sont fournies par le compendium du système.
 */
export async function creerCompendiumsMonde() {
  if (!game.user.isGM) throw new R.MagieError("permission", "Réservé au MJ.");
  const Compendium = foundry.documents.collections.CompendiumCollection;
  const crees = [];
  for (const [name, label] of [["magie-pouvoirs", "Magie : Pouvoirs"], ["magie-aleas", "Magie : Aléas divins"]]) {
    if (game.packs.get(`world.${name}`)) continue;
    await Compendium.createCompendium({ name, label, type: "Item" });
    crees.push(label);
  }
  return crees;
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
    return valeur;
  }).then(async valeur => {
    if (game.user.isGM) await tracer(actor, J.NATURE.ADMINISTRATIVE, `Colère ${d > 0 ? "+" : ""}${d} (${g})`, motif);
    return valeur;
  });
}

/** Correction administrative de la Colère : nouvelle valeur absolue, motif obligatoire, tracée. */
export async function corrigerColere(actor, groupe, valeur, motif) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Correction réservée au MJ.");
  if (!String(motif ?? "").trim()) throw new R.MagieError("motif", "Une correction administrative exige un motif.");
  const v = Number(valeur);
  if (!Number.isInteger(v) || v < 0) throw new R.MagieError("valeur-invalide", "Valeur de Colère invalide.");
  const g = R.cleVoie(groupe) || cfg().groupeColereDefaut;
  const c = actor.system.magie.colere?.[g] ?? {};
  await verrou.executer(actor.uuid, () => actor.update({
    [`system.magie.colere.${g}`]: { valeur: v, reference: v > 0 ? (c.reference ?? maintenant()) : null, recuperationBloquee: c.recuperationBloquee ?? false }
  }));
  await tracer(actor, J.NATURE.ADMINISTRATIVE, `Colère corrigée : ${c.valeur ?? 0} → ${v} (${g})`, motif);
}

/* -------------------------------------------- */
/*  Effets des Pouvoirs                         */
/* -------------------------------------------- */

/** Augmentations par paramètre d'une répartition enregistrée. */
const augmentations = rep => Object.fromEntries(Object.entries(rep?.details ?? {}).map(([k, d]) => [k, d.augmentations]));

/**
 * Applique les effets du Pouvoir d'un acte (Rituel accordé, ou activation n en Transe) à ses cibles,
 * avec les paramètres améliorés. Décision du MJ, tracée.
 */
export async function appliquerEffetsActe(actor, { activation = null, cibles = null } = {}) {
  const e = acteCourant(actor);
  if (!e) throw new R.MagieError("aucun-acte", "Aucun acte sacré.");
  let pouvoirId;
  let repartition;
  if (activation != null) {
    const a = e.transe?.activations.find(x => x.n === Number(activation));
    if (!a) throw new R.MagieError("activation-inconnue", "Activation inconnue.");
    pouvoirId = a.pouvoir.id;
    repartition = augmentations(a.repartition);
  } else {
    if (e.type !== "rituel" || !e.rituel.narration?.accordee) throw new R.MagieError("narration", "L'intervention doit d'abord être accordée par le MJ.");
    pouvoirId = e.rituel.pouvoir?.id;
    repartition = augmentations(e.rituel.repartition);
  }
  const pouvoir = pouvoirId ? actor.items.get(pouvoirId) : null;
  if (!pouvoir) throw new R.MagieError("reference", "Le Pouvoir de cet acte n'est plus sur la fiche.");
  const res = await appliquerEffets(actor, pouvoir, { acteId: e.id, cibles: cibles ?? (e.cibles?.length ? e.cibles : ciblesUtilisateur()), repartition });
  await tracer(actor, J.NATURE.NARRATIVE, `Effets de « ${pouvoir.name} » appliqués`, `${res.cibles.join(", ")} — Durée : ${res.duree.resultat || "sans limite"}`);
  return res;
}

/** Révoque les effets de l'acte courant (décision du MJ, tracée). */
export async function revoquerEffetsActe(actor) {
  const e = acteCourant(actor);
  if (!e) return 0;
  const n = await revoquerEffets(e.id);
  if (n) await tracer(actor, J.NATURE.NARRATIVE, "Effets révoqués", `${n} effet(s)`);
  return n;
}

/* -------------------------------------------- */
/*  Journal des interventions du MJ             */
/* -------------------------------------------- */

/** Inscrit une intervention du MJ (narrative ou administrative) dans le journal du personnage. */
export async function tracer(actor, nature, action, detail = "") {
  if (!game.user.isGM) return;
  const entree = J.intervention({ nature, action, detail, par: game.user.name, maintenant: maintenant(), dateReelle: new Date().toISOString() });
  await actor.update({ "system.magie.interventions": J.ajouterIntervention(actor.system.magie.interventions, entree) }, { pn2Evenements: true });
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
export function destinataires(actor) {
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

const idsMJ = () => game.users.filter(u => u.isGM).map(u => u.id);

/**
 * Publie une carte en deux versions si nécessaire : la version joueur (vue sans secrets)
 * aux propriétaires et au MJ, et la version complète au MJ seul quand elle diffère.
 * Le HTML envoyé aux joueurs ne contient jamais la Puissance secrète ni, sauf réglage, le Seuil.
 */
async function publierCarte(actor, template, donnees, etat) {
  const visible = game.settings.get(SYS, "magieSeuilVisible");
  const vue = M.vueJoueur(etat, { seuilVisible: visible });
  const secret = !visible || !!etat.rituel?.puissanceSecrete;
  const speaker = ChatMessage.getSpeaker({ actor });
  const joueurs = destinataires(actor).filter(id => !game.users.get(id)?.isGM);
  // Version joueur : aux propriétaires (et au MJ si rien n'est secret)
  const contenuJoueur = await render(template, { ...donnees, etat: vue, details: visible, mj: false });
  if (!secret) return ChatMessage.create({ speaker, content: contenuJoueur, whisper: destinataires(actor) });
  if (joueurs.length) await ChatMessage.create({ speaker, content: contenuJoueur, whisper: joueurs });
  const contenuMJ = await render(template, { ...donnees, etat, details: true, mj: true });
  return ChatMessage.create({ speaker, content: contenuMJ, whisper: idsMJ() });
}

async function messageDebut(actor, etat) {
  const titre = etat.type === "transe" ? `Début de Transe${etat.transe.instantanee ? " instantanée" : ""}` : "Début du Rituel";
  await publierCarte(actor, "chat/magie-acte.hbs", { titre: `${titre} : ${etat.voie.nom}`, debut: true }, etat);
}

async function messageSollicitation(actor, res, roll) {
  const l = res.lancer;
  const e = res.etat;
  const content = await render("chat/magie-sollicitation.hbs", {
    lancer: l, action: LIBELLES_ACTION[l.action] ?? l.action, voie: e.voie.nom,
    succes: e.succes, colereGagnee: e.colereGagnee, effet: res.effet, rejet: !!res.rejet,   // indicateur seul : aucun détail du Rejet
    sortie: res.effet?.type === "detachement" && res.effet.niveau === 0
  });
  const data = { speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] };
  appliquerVisibilite(data);
  await ChatMessage.create(data);
}

/** Bilan à la fin de l'acte (fin de Rituel, sortie de Transe, Rejet, interruption). */
async function messageFinSiBesoin(actor, res) {
  if (!res.avant || !M.estEnCours(res.avant) || M.estEnCours(res.etat)) return;
  const etat = res.etat;
  let titre;
  if (etat.statut === "rejet") titre = `Rejet : ${etat.voie.nom}`;
  else if (etat.type === "transe") titre = `${etat.fin?.mode === "sortie" ? "Sortie de Transe" : "Fin de la Transe"} : ${etat.voie.nom}`;
  else titre = `Fin du Rituel : ${etat.voie.nom}`;
  await publierCarte(actor, "chat/magie-acte.hbs", { titre, fin: true }, etat);
}

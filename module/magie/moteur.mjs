/**
 * Moteur des actes sacrés (Rituel et Transe) : machine à états pure.
 *
 * - Chaque opération reçoit un état et renvoie un NOUVEL état ({ etat, doublon, ... }),
 *   sans jamais modifier l'état reçu.
 * - Les valeurs des d10 sont fournies par l'appelant (le service lance les dés avec Foundry),
 *   ce qui rend le moteur entièrement déterministe et testable.
 * - Protection contre les doublons : chaque opération peut porter un identifiant de requête
 *   (`ctx.requete`, rejouée sans effet) et le numéro de séquence attendu
 *   (`ctx.seqAttendue`, refus si l'état a changé entre-temps).
 * - La Colère du personnage est mise à jour par « grand livre » : l'état mémorise la Colère
 *   déjà reportée sur la fiche (`colereAppliquee`), un report répété n'ajoute donc rien.
 */
import { MAGIE } from "./config-magie.mjs";
import {
  MagieError, RESULTAT, resoudreD10, calculerAuspices, calculerSeuil, depasseSeuil, depassement,
  budgetAmeliorations, validerRepartition, dureeCycle
} from "./regles.mjs";

export const SCHEMA_ACTE = 1;

export const STATUT = Object.freeze({ EN_COURS: "en-cours", TERMINE: "termine", REJET: "rejet", ANNULE: "annule" });
export const FIN = Object.freeze({
  VOLONTAIRE: "volontaire", INTERRUPTION: "interruption", REJET: "rejet", SORTIE: "sortie", ANNULATION: "annulation", ADMINISTRATIF: "administratif"
});
export const ACTION = Object.freeze({ ENTREE: "entree", ASCENSION: "ascension", DETACHEMENT: "detachement", RENFORCEMENT: "renforcement", QUETE: "quete" });
/** Actions que le prêtre peut arrêter volontairement après un Succès (les autres exigent un Succès sacré). */
export const ACTIONS_LIBRES = Object.freeze([ACTION.RENFORCEMENT, ACTION.QUETE]);

const clone = o => structuredClone(o);

/** Colère totale à prendre en compte pour le Rejet : Colère du personnage au début de l'acte + Colère gagnée. */
export const colereTotale = etat => etat.colereInitiale + etat.colereGagnee;

export const estEnCours = etat => etat?.statut === STATUT.EN_COURS;

/* -------------------------------------------- */
/*  Garde-fous                                  */
/* -------------------------------------------- */

/**
 * Vérifie une requête avant de l'exécuter.
 * @returns {boolean} true si la requête a déjà été traitée (doublon à ignorer)
 * @throws {MagieError} « etat-perime » si l'état a changé depuis l'affichage
 */
export function verifierRequete(etat, ctx = {}) {
  if (ctx.requete && etat.requetes?.includes(ctx.requete)) return true;
  if (ctx.seqAttendue != null && ctx.seqAttendue !== etat.seq) {
    throw new MagieError("etat-perime", "L'acte sacré a changé entre-temps : action ignorée, la fenêtre est mise à jour.");
  }
  return false;
}

/** Seul l'utilisateur qui conduit l'acte peut le faire avancer (évite les modifications concurrentes). */
export function verifierPilote(etat, userId) {
  if (etat.pilote && userId && etat.pilote !== userId) {
    throw new MagieError("pilote", "Cet acte sacré est conduit par un autre utilisateur.");
  }
}

function operation(etat, ctx, fn) {
  if (!etat) throw new MagieError("aucun-acte", "Aucun acte sacré.");
  if (verifierRequete(etat, ctx)) return { etat, doublon: true };
  const e = clone(etat);
  const info = fn(e) ?? {};
  e.seq += 1;
  if (ctx?.requete) {
    e.requetes.push(ctx.requete);
    const max = MAGIE.requetesMemorisees;
    if (e.requetes.length > max) e.requetes.splice(0, e.requetes.length - max);
  }
  return { etat: e, doublon: false, ...info };
}

function exigerType(e, type) {
  if (e.type !== type) throw new MagieError("type-acte", `Action réservée ${type === "rituel" ? "aux Rituels" : "aux Transes"}.`);
}

function exigerEnCours(e) {
  if (!estEnCours(e)) throw new MagieError("acte-termine", "Cet acte sacré est terminé : plus aucune sollicitation n'est possible.");
}

function journaliser(e, entree, maintenant) {
  e.journal.push({ seq: e.seq + 1, maintenant: maintenant ?? null, ...entree });
}

/* -------------------------------------------- */
/*  Création                                    */
/* -------------------------------------------- */

/**
 * Données communes d'un acte sacré.
 * @param {object} p
 * @param {string} p.typeReligion    clé de MAGIE.types
 * @param {object} p.valeurs         valeurs de la Voie ({ foi, mysteres })
 * @param {number} p.faveurs
 * @param {object} p.auspices        composantes { actesFoi, affinite, beaute, peches }
 * @param {number} p.colereInitiale  Colère du personnage (groupe de la Voie) au début de l'acte
 */
function acteDeBase(p, type) {
  const auspices = calculerAuspices(p.auspices);
  const seuil = calculerSeuil({ type: p.typeReligion, valeurs: p.valeurs, faveurs: p.faveurs, auspices: auspices.total }, p.types);
  const colereInitiale = Number(p.colereInitiale ?? 0);
  if (!Number.isInteger(colereInitiale) || colereInitiale < 0) {
    throw new MagieError("valeur-invalide", `Colère initiale invalide : ${p.colereInitiale}.`);
  }
  return {
    schema: SCHEMA_ACTE,
    id: p.id ?? null,
    type,
    statut: STATUT.EN_COURS,
    seq: 0,
    acteur: p.acteur ?? null,          // { uuid, nom }
    pilote: p.pilote ?? null,          // id de l'utilisateur qui conduit l'acte
    religion: p.religion ?? "",
    typeReligion: p.typeReligion,
    voie: p.voie ?? null,              // { id, nom, cle }
    groupeColere: p.groupeColere || MAGIE.groupeColereDefaut,
    cibles: p.cibles ?? [],            // cibles désignées au début de l'acte [{ uuid, nom }]
    auspices,
    seuil,
    colereInitiale,
    colereGagnee: 0,
    colereAppliquee: 0,                // Colère déjà reportée sur la fiche (grand livre)
    succes: 0,
    lancers: [],
    journal: [],
    requetes: [],
    peutArreter: false,
    debut: p.maintenant ?? null,
    fin: null,
    rituel: null,
    transe: null
  };
}

/**
 * Crée un Rituel.
 * @param {object} p  voir acteDeBase, plus { puissance (1-10), souhait, pouvoir: {id, nom, puissance} | null }
 */
export function creerRituel(p) {
  const puissance = Number(p.puissance);
  const { min, max } = MAGIE.puissance;
  if (!Number.isInteger(puissance) || puissance < min || puissance > max) {
    throw new MagieError("puissance-invalide", `La Puissance nécessaire doit être un entier de ${min} à ${max}.`);
  }
  const e = acteDeBase(p, "rituel");
  e.rituel = {
    souhait: p.souhait ?? "",
    rites: p.rites ?? "",                       // rites accomplis, décrits par le joueur
    pouvoir: p.pouvoir ?? null,                 // { id, uuid, nom, puissance } ou null
    puissance,
    puissanceSecrete: !!p.puissanceSecrete,     // Puissance connue du seul MJ
    validation: p.validation ?? null,           // { par, maintenant } : lancement autorisé par le MJ
    resolution: null,
    repartition: null,
    narration: null                             // validation narrative du MJ après la résolution
  };
  return e;
}

/**
 * Crée une Transe (inactive tant que l'entrée n'a pas réussi).
 * @param {object} p  voir acteDeBase, plus :
 *   pouvoirsConnus [{ id, nom, puissance }] (Pouvoirs accessibles de la Voie),
 *   niveauLimite (≤ MAGIE.transe.niveauMax), dureeRitesMinutes, instantanee
 */
export function creerTranse(p) {
  const instantanee = !!p.instantanee;
  const auspices = instantanee ? { ...p.auspices, beaute: 0 } : p.auspices;
  const e = acteDeBase({ ...p, auspices }, "transe");
  const plafond = MAGIE.transe.niveauMax;
  const limite = p.niveauLimite == null ? plafond : Number(p.niveauLimite);
  if (!Number.isInteger(limite) || limite < 1) throw new MagieError("valeur-invalide", `Niveau limite invalide : ${p.niveauLimite}.`);
  e.transe = {
    actif: false,
    instantanee,
    niveau: 0,
    niveauMax: 0,
    niveauLimite: Math.min(limite, plafond),
    chemin: [],                                     // Chemin d'illumination temporaire [{ id, nom, puissance }]
    pouvoirsConnus: (p.pouvoirsConnus ?? []).map(x => ({ id: x.id, nom: x.nom, puissance: Number(x.puissance) })),
    actionEnCours: null,
    activations: [],
    quetes: [],                                     // Quêtes mystiques menées pendant la Transe
    cycle: {
      dureeRitesMinutes: Number(p.dureeRitesMinutes) || 0,
      dureeMinutes: dureeCycle({ dureeRitesMinutes: p.dureeRitesMinutes, instantanee }),
      debutNiveau: null
    },
    rejet: null
  };
  return e;
}

/* -------------------------------------------- */
/*  Sollicitations                              */
/* -------------------------------------------- */

function ajouterLancer(e, valeur, action) {
  const r = resoudreD10(valeur);
  const niveau = e.transe ? e.transe.niveau : null;
  e.succes += r.dSucces;
  e.colereGagnee += r.dColere;
  const lancer = {
    n: e.lancers.length + 1,
    valeur: r.valeur,
    resultat: r.resultat,
    dSucces: r.dSucces,
    dColere: r.dColere,
    succesApres: e.succes,
    colereApres: e.colereGagnee,
    colereTotaleApres: colereTotale(e),
    action,
    niveau,               // Niveau de transe au moment du jet (null en Rituel)
    evenements: []        // marqueurs publics d'événements (le contenu secret est dans le coffre du MJ)
  };
  e.lancers.push(lancer);
  return lancer;
}

/** Sollicitation (1d10) d'un Rituel ou d'une Transe selon le type de l'acte. */
export function solliciter(etat, valeur, ctx = {}) {
  return etat?.type === "transe" ? solliciterTranse(etat, valeur, ctx) : solliciterRituel(etat, valeur, ctx);
}

/** Arrêt volontaire : fin du Rituel, ou fin du renforcement en Transe. Toujours après un Succès sacré. */
export function arreter(etat, ctx = {}) {
  return etat?.type === "transe" ? arreterRenforcement(etat, ctx) : arreterRituel(etat, ctx);
}

/* -------------------------------------------- */
/*  Rituel                                      */
/* -------------------------------------------- */

export function solliciterRituel(etat, valeur, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "rituel");
    exigerEnCours(e);
    const lancer = ajouterLancer(e, valeur, "rituel");
    e.peutArreter = lancer.resultat === RESULTAT.SUCCES;
    return { lancer };
  });
}

export function arreterRituel(etat, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "rituel");
    exigerEnCours(e);
    if (!e.lancers.length) throw new MagieError("arret-interdit", "Il faut solliciter la divinité au moins une fois avant d'arrêter.");
    if (!e.peutArreter) throw new MagieError("arret-interdit", "Après un résultat de Colère, il faut solliciter la divinité jusqu'à obtenir un Succès sacré.");
    terminerRituel(e, FIN.VOLONTAIRE, null, ctx.maintenant);
    return { resolution: e.rituel.resolution };
  });
}

/** Résolution d'un Rituel (Rejet évalué à la fin du tirage). */
export function resoudreRituel(e) {
  const total = colereTotale(e);
  const seuil = e.seuil.seuil;
  const puissance = e.rituel.puissance;
  return {
    succes: e.succes,
    puissance,
    suffisant: e.succes >= puissance,
    colereTotale: total,
    seuil,
    rejet: depasseSeuil(total, seuil),
    depassement: depassement(total, seuil),
    succesSupplementaires: budgetAmeliorations(e.succes, puissance)
  };
}

function terminerRituel(e, mode, motif, maintenant) {
  e.rituel.resolution = resoudreRituel(e);
  e.statut = e.rituel.resolution.rejet ? STATUT.REJET : STATUT.TERMINE;
  e.peutArreter = false;
  e.fin = { mode, motif: motif ?? null, maintenant: maintenant ?? null };
  journaliser(e, { type: "fin", mode, motif: motif ?? null, rejet: e.rituel.resolution.rejet }, maintenant);
}

/** Répartit les Succès supplémentaires d'un Rituel suffisant (Portée, Cible, Impact, Durée). */
export function repartirAmeliorations(etat, repartition, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "rituel");
    const res = e.rituel.resolution;
    if (!res) throw new MagieError("acte-en-cours", "Le Rituel n'est pas terminé.");
    if (!res.suffisant) throw new MagieError("rituel-insuffisant", "Rituel insuffisant : aucun Succès supplémentaire à répartir.");
    const v = validerRepartition(repartition, res.succesSupplementaires);
    if (!v.valide) throw new MagieError("repartition-invalide", v.erreurs.join(" "));
    e.rituel.repartition = { details: v.details, cout: v.cout, reste: v.reste };
    journaliser(e, { type: "repartition", cout: v.cout, details: v.details }, ctx.maintenant);
    return { repartition: e.rituel.repartition };
  });
}

/* -------------------------------------------- */
/*  Transe                                      */
/* -------------------------------------------- */

function exigerActif(t) {
  if (!t.actif) throw new MagieError("hors-transe", "Le personnage n'est pas (encore) en Transe.");
}

function pouvoirConnu(t, id, puissance) {
  const p = t.pouvoirsConnus.find(x => x.id === id);
  if (!p) throw new MagieError("pouvoir-inconnu", "Ce Pouvoir n'est pas connu (ou pas accessible) dans cette Voie.");
  if (p.puissance !== puissance) {
    throw new MagieError("puissance-incorrecte", `« ${p.nom} » est de Puissance ${p.puissance} : il faut un Pouvoir de Puissance ${puissance}.`);
  }
  return { id: p.id, nom: p.nom, puissance: p.puissance };
}

/**
 * Commence une action de Transe : entrée, ascension, détachement ou renforcement.
 * L'action se résout par des sollicitations successives (un Succès sacré suffit,
 * sauf pour le renforcement qui s'arrête volontairement après un Succès).
 * @param {string} type     ACTION.*
 * @param {object} o
 * @param {string} [o.cible]  id du Pouvoir visé (entrée, ascension) ; numéro d'activation (renforcement)
 */
export function commencerAction(etat, type, { cible = null, impose = null } = {}, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const t = e.transe;
    if (t.actionEnCours) throw new MagieError("action-en-cours", "Une action est déjà en cours : sollicitez la divinité jusqu'à sa résolution.");
    let pouvoir = null;
    let activation = null;
    switch (type) {
      case ACTION.ENTREE:
        if (t.actif) throw new MagieError("deja-en-transe", "Le personnage est déjà en Transe.");
        pouvoir = pouvoirConnu(t, cible, 1);
        break;
      case ACTION.ASCENSION: {
        exigerActif(t);
        const niveau = t.niveau + 1;
        if (niveau > t.niveauLimite) throw new MagieError("niveau-max", `Impossible de dépasser le Niveau de transe ${t.niveauLimite}.`);
        pouvoir = pouvoirConnu(t, cible, niveau);
        break;
      }
      case ACTION.DETACHEMENT:
        exigerActif(t);
        if (t.niveau < 1) throw new MagieError("niveau-min", "Le Niveau de transe ne peut pas descendre sous 0.");
        pouvoir = t.chemin[t.chemin.length - 1] ?? null;
        break;
      case ACTION.QUETE:
        exigerActif(t);
        break;
      case ACTION.RENFORCEMENT: {
        exigerActif(t);
        const n = Number(cible);
        activation = t.activations.find(a => a.n === n);
        if (!activation) throw new MagieError("activation-inconnue", "Activez d'abord le Pouvoir à renforcer.");
        if (!t.chemin.some(c => c.id === activation.pouvoir.id)) {
          throw new MagieError("pouvoir-absent", "Ce Pouvoir n'est plus dans le Chemin d'illumination.");
        }
        pouvoir = activation.pouvoir;
        break;
      }
      default:
        throw new MagieError("action-inconnue", `Action de Transe inconnue : ${type}.`);
    }
    t.actionEnCours = { type, pouvoir, activation: activation?.n ?? null, succes: 0, colere: 0, lancers: [], impose: impose ?? null };
    e.peutArreter = false;
    journaliser(e, { type: "action", action: type, pouvoir, activation: activation?.n ?? null, impose: impose ?? null }, ctx.maintenant);
    return { action: t.actionEnCours };
  });
}

export function solliciterTranse(etat, valeur, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const t = e.transe;
    const a = t.actionEnCours;
    if (!a) throw new MagieError("aucune-action", "Choisissez d'abord une action : entrée, ascension, détachement ou renforcement.");
    const lancer = ajouterLancer(e, valeur, a.type);
    a.lancers.push(lancer.n);
    a.succes += lancer.dSucces;
    a.colere += lancer.dColere;

    // En Transe, le Rejet est immédiat dès que la Colère dépasse le Seuil.
    if (depasseSeuil(colereTotale(e), e.seuil.seuil)) {
      rejeterTranse(e, lancer, ctx.maintenant);
      return { lancer, rejet: e.transe.rejet };
    }
    if (lancer.resultat !== RESULTAT.SUCCES) {
      e.peutArreter = false;
      return { lancer };
    }
    if (ACTIONS_LIBRES.includes(a.type)) {
      e.peutArreter = true;
      return { lancer };
    }
    return { lancer, effet: conclureAction(e, ctx.maintenant) };
  });
}

/** Applique l'effet d'une action réussie et libère l'action en cours. */
function conclureAction(e, maintenant) {
  const t = e.transe;
  const a = t.actionEnCours;
  let effet;
  switch (a.type) {
    case ACTION.ENTREE:
    case ACTION.ASCENSION:
      // L'entrée en Transe est la première ascension : le Pouvoir de Puissance 1 rejoint le Chemin.
      t.actif = true;
      t.chemin.push(a.pouvoir);
      t.niveau += 1;
      t.niveauMax = Math.max(t.niveauMax, t.niveau);
      t.cycle.debutNiveau = maintenant ?? null;
      effet = { type: a.type, pouvoir: a.pouvoir, niveau: t.niveau };
      break;
    case ACTION.DETACHEMENT: {
      const retire = t.chemin.pop();
      t.niveau -= 1;
      t.cycle.debutNiveau = maintenant ?? null;
      effet = { type: a.type, pouvoir: retire, niveau: t.niveau };
      break;
    }
    case ACTION.QUETE: {
      t.quetes ??= [];
      const quete = { n: t.quetes.length + 1, niveau: t.niveau, succes: a.succes, colere: a.colere, lancers: [...a.lancers] };
      t.quetes.push(quete);
      effet = { type: a.type, quete: quete.n, succes: a.succes, niveau: t.niveau };
      break;
    }
    case ACTION.RENFORCEMENT: {
      const act = t.activations.find(x => x.n === a.activation);
      act.succes += a.succes;
      effet = { type: a.type, activation: act.n, succes: act.succes };
      break;
    }
  }
  journaliser(e, { ...effet, type: "action-reussie", action: a.type }, maintenant);
  t.actionEnCours = null;
  e.peutArreter = false;
  if (a.type === ACTION.DETACHEMENT && t.niveau === 0) finTranse(e, STATUT.TERMINE, FIN.SORTIE, null, maintenant);
  return effet;
}

function finTranse(e, statut, mode, motif, maintenant) {
  const t = e.transe;
  t.actif = false;
  t.actionEnCours = null;
  t.chemin = [];
  t.niveau = 0;
  t.cycle.debutNiveau = null;
  e.statut = statut;
  e.peutArreter = false;
  e.fin = { mode, motif: motif ?? null, maintenant: maintenant ?? null };
  journaliser(e, { type: "fin", mode, motif: motif ?? null }, maintenant);
}

function rejeterTranse(e, lancer, maintenant) {
  const t = e.transe;
  const total = colereTotale(e);
  const seuil = e.seuil.seuil;
  const puissanceMax = Math.max(0, t.niveauMax, ...t.chemin.map(c => c.puissance));
  t.rejet = {
    niveau: t.niveau,                       // Niveau de transe au moment du Rejet
    niveauMax: t.niveauMax,                 // Niveau maximal atteint pendant la Transe
    action: t.actionEnCours?.type ?? null,
    lancer: lancer.n,
    colereTotale: total,
    seuil,
    depassement: depassement(total, seuil),
    chemin: clone(t.chemin),
    // Données préparées pour les séquelles et pénitences (phases suivantes)
    sequelles: { puissanceMax, niveauAuRejet: t.niveau, depassement: depassement(total, seuil), pouvoirs: clone(t.chemin) }
  };
  finTranse(e, STATUT.REJET, FIN.REJET, null, maintenant);
}

/** Arrêt volontaire d'un renforcement (après un Succès) : les Succès obtenus s'ajoutent à l'activation. */
export function arreterRenforcement(etat, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const a = e.transe.actionEnCours;
    if (!a) throw new MagieError("aucune-action", "Aucune sollicitation en cours.");
    if (!ACTIONS_LIBRES.includes(a.type)) {
      throw new MagieError("arret-interdit", "Cette action exige un Succès sacré : il faut solliciter la divinité jusqu'à l'obtenir.");
    }
    if (!a.lancers.length || !e.peutArreter) {
      throw new MagieError("arret-interdit", "Après un résultat de Colère, il faut solliciter la divinité jusqu'à obtenir un Succès sacré.");
    }
    return { effet: conclureAction(e, ctx.maintenant) };
  });
}

/** Active un Pouvoir du Chemin d'illumination (paramètres de base, sans sollicitation). */
export function activerPouvoir(etat, pouvoirId, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const t = e.transe;
    exigerActif(t);
    if (t.actionEnCours) throw new MagieError("action-en-cours", "Terminez d'abord l'action en cours.");
    const p = t.chemin.find(c => c.id === pouvoirId);
    if (!p) throw new MagieError("pouvoir-absent", "Ce Pouvoir n'est pas dans le Chemin d'illumination : il ne peut pas être activé.");
    const activation = { n: t.activations.length + 1, pouvoir: clone(p), niveau: t.niveau, succes: 0, repartition: null };
    t.activations.push(activation);
    journaliser(e, { type: "activation", activation: activation.n, pouvoir: activation.pouvoir }, ctx.maintenant);
    return { activation };
  });
}

/** Répartit les Succès d'un renforcement entre Portée, Cible, Impact et Durée. */
export function repartirRenforcement(etat, n, repartition, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    const act = e.transe.activations.find(a => a.n === Number(n));
    if (!act) throw new MagieError("activation-inconnue", "Activation inconnue.");
    if (e.transe.actionEnCours?.activation === act.n) throw new MagieError("action-en-cours", "Le renforcement de ce Pouvoir est en cours.");
    const v = validerRepartition(repartition, act.succes);
    if (!v.valide) throw new MagieError("repartition-invalide", v.erreurs.join(" "));
    act.repartition = { details: v.details, cout: v.cout, reste: v.reste };
    journaliser(e, { type: "repartition", activation: act.n, cout: v.cout, details: v.details }, ctx.maintenant);
    return { repartition: act.repartition };
  });
}

/* -------------------------------------------- */
/*  Concentration et Cycle                      */
/* -------------------------------------------- */

/**
 * Perte de concentration (blessure…) pendant une action de Transe (p. 136) : l'action échoue ;
 * le prêtre lance tout de même des d10 supplémentaires (2 par défaut) dont seules les Colères comptent.
 * Rien n'est effacé : la Colère déjà tirée reste acquise. Le Rejet reste immédiat.
 * @param {number[]} valeurs  d10 supplémentaires
 */
export function echecConcentration(etat, valeurs, { motif = "" } = {}, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const t = e.transe;
    const a = t.actionEnCours;
    const cfg = MAGIE.concentration;
    if (!a || !cfg.actions.includes(a.type)) {
      throw new MagieError("concentration", `La perte de concentration ne concerne que ${cfg.actions.join(", ")} en cours.`);
    }
    if (!Array.isArray(valeurs) || valeurs.length !== cfg.des) throw new MagieError("valeur-invalide", `${cfg.des} d10 sont nécessaires.`);
    const lancers = [];
    for (const v of valeurs) {
      const r = resoudreD10(v);
      if (r.resultat === RESULTAT.COLERE) {
        const l = ajouterLancer(e, v, "concentration");
        lancers.push(l);
        if (depasseSeuil(colereTotale(e), e.seuil.seuil)) {
          rejeterTranse(e, l, ctx.maintenant);
          return { lancers, rejet: e.transe.rejet };
        }
      } else {
        // Succès ignoré : enregistré pour l'historique, sans effet
        const l = { n: e.lancers.length + 1, valeur: r.valeur, resultat: r.resultat, dSucces: 0, dColere: 0, ignore: true,
          succesApres: e.succes, colereApres: e.colereGagnee, colereTotaleApres: colereTotale(e), action: "concentration", niveau: t.niveau, evenements: [] };
        e.lancers.push(l);
        lancers.push(l);
      }
    }
    journaliser(e, { type: "action-echouee", action: a.type, motif, pouvoir: a.pouvoir ?? null }, ctx.maintenant);
    t.actionEnCours = null;
    e.peutArreter = false;
    return { lancers };
  });
}

/** Note que le Cycle du niveau courant est échu (une décision est nécessaire ; rien n'est automatique). */
export function signalerCycle(etat, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "transe");
    exigerEnCours(e);
    const c = e.transe.cycle;
    if (c.debutNiveau == null) throw new MagieError("cycle", "Aucun Cycle en cours.");
    c.alerte = c.debutNiveau;
    journaliser(e, { type: "cycle-echu", niveau: e.transe.niveau }, ctx.maintenant);
    return {};
  });
}

/* -------------------------------------------- */
/*  Interruption, annulation, pilote            */
/* -------------------------------------------- */

/**
 * Interruption imposée par une autre règle (distincte de l'arrêt volontaire).
 * - Rituel : le tirage s'arrête immédiatement, même après une Colère ; le Rituel est résolu.
 * - Transe : l'action en cours est abandonnée ; avec `terminer`, la Transe prend fin.
 */
export function interrompre(etat, { motif = "", terminer = false } = {}, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerEnCours(e);
    if (e.type === "rituel") {
      terminerRituel(e, FIN.INTERRUPTION, motif, ctx.maintenant);
      return { resolution: e.rituel.resolution };
    }
    const t = e.transe;
    if (!t.actionEnCours && !terminer) throw new MagieError("rien-a-interrompre", "Aucune action en cours à interrompre.");
    if (t.actionEnCours) {
      journaliser(e, { type: "action-interrompue", action: t.actionEnCours.type, motif }, ctx.maintenant);
      t.actionEnCours = null;
      e.peutArreter = false;
    }
    if (terminer) finTranse(e, STATUT.TERMINE, FIN.INTERRUPTION, motif, ctx.maintenant);
    return {};
  });
}

/**
 * Correction administrative (MJ) : clôt un acte dans un état exceptionnel (bloqué, erroné…).
 * Aucune résolution n'est calculée, aucun Rejet n'est déclaré ; la Colère déjà tirée reste acquise.
 */
export function clotureAdministrative(etat, { motif = "", par = null } = {}, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerEnCours(e);
    if (!String(motif).trim()) throw new MagieError("motif", "Une correction administrative exige un motif.");
    e.statut = STATUT.ANNULE;
    e.peutArreter = false;
    if (e.transe) {
      e.transe.actif = false;
      e.transe.actionEnCours = null;
    }
    e.fin = { mode: FIN.ADMINISTRATIF, motif, maintenant: ctx.maintenant ?? null };
    journaliser(e, { type: "administratif", motif, par }, ctx.maintenant);
    return {};
  });
}

/** Annule un acte qui n'a encore donné lieu à aucune sollicitation (aucune conséquence). */
export function annulerActe(etat, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerEnCours(e);
    if (e.lancers.length) throw new MagieError("annulation-interdite", "La divinité a déjà été sollicitée : l'acte ne peut plus être annulé.");
    e.statut = STATUT.ANNULE;
    e.fin = { mode: FIN.ANNULATION, motif: null, maintenant: ctx.maintenant ?? null };
    if (e.transe) e.transe.actif = false;
    return {};
  });
}

/** Change l'utilisateur qui conduit l'acte (reprise par le MJ, ou par un propriétaire si le pilote est absent). */
export function changerPilote(etat, userId, ctx = {}) {
  return operation(etat, ctx, e => {
    e.pilote = userId;
    journaliser(e, { type: "pilote", pilote: userId }, ctx.maintenant);
    return {};
  });
}

/* -------------------------------------------- */
/*  Colère : grand livre                        */
/* -------------------------------------------- */

/**
 * Calcule la Colère à écrire sur la fiche : seule la Colère gagnée et pas encore reportée est ajoutée.
 * Appeler deux fois avec le même état n'ajoute la Colère qu'une fois.
 * @returns {{valeur:number, delta:number, etat:object}}
 */
export function appliquerColere(etat, colereActuelle) {
  const delta = etat.colereGagnee - etat.colereAppliquee;
  if (!delta) return { valeur: colereActuelle, delta: 0, etat };
  return { valeur: Math.max(0, colereActuelle + delta), delta, etat: { ...etat, colereAppliquee: etat.colereGagnee } };
}

/**
 * Sérialisation de l'acte pour le stockage (flag) : une chaîne JSON est remplacée en bloc
 * par Foundry, sans fusion d'objets qui laisserait traîner d'anciennes clés.
 */
export function serialiserActe(etat) {
  return etat ? JSON.stringify(etat) : null;
}

export function deserialiserActe(valeur) {
  if (!valeur) return null;
  let e = valeur;
  if (typeof valeur === "string") {
    try { e = JSON.parse(valeur); } catch { return null; }
  }
  return e?.schema === SCHEMA_ACTE ? normaliserActe(e) : null;
}

/**
 * Complète un acte enregistré par une version antérieure avec les champs ajoutés depuis
 * (phase 2 : rites, Puissance secrète, validation, narration ; phase 3 : niveau des lancers, Quêtes).
 * N'efface jamais de donnée inconnue. Idempotent.
 */
export function normaliserActe(e) {
  e.cibles ??= [];
  e.lancers ??= [];
  e.journal ??= [];
  e.requetes ??= [];
  for (const l of e.lancers) {
    l.evenements ??= [];
    if (!("niveau" in l)) l.niveau = null;
  }
  if (e.rituel) {
    e.rituel.rites ??= "";
    e.rituel.puissanceSecrete ??= false;
    e.rituel.validation ??= null;
    e.rituel.narration ??= null;
    e.rituel.repartition ??= null;
  }
  if (e.transe) {
    e.transe.quetes ??= [];
    e.transe.activations ??= [];
    e.transe.cycle ??= { dureeRitesMinutes: 0, dureeMinutes: 1, debutNiveau: null };
    if (!("alerte" in e.transe.cycle)) e.transe.cycle.alerte = null;
  }
  return e;
}

/**
 * Validation narrative du MJ après la résolution d'un Rituel : la réussite mécanique
 * n'applique aucun effet ; le MJ décide si et comment l'intervention se manifeste.
 */
export function validerNarration(etat, { accordee = true, note = "", par = null } = {}, ctx = {}) {
  return operation(etat, ctx, e => {
    exigerType(e, "rituel");
    if (!e.rituel.resolution) throw new MagieError("acte-en-cours", "Le Rituel n'est pas terminé.");
    e.rituel.narration = { accordee: !!accordee, note: String(note ?? ""), par, maintenant: ctx.maintenant ?? null };
    journaliser(e, { type: "narration", accordee: !!accordee }, ctx.maintenant);
    return { narration: e.rituel.narration };
  });
}

/**
 * Vue d'un acte réservée aux joueurs : retire les informations du MJ.
 * - Puissance secrète : Puissance, réussite et Succès supplémentaires masqués jusqu'à la validation narrative.
 * - Seuil non visible : Seuil, Auspices et dépassement masqués (le Rejet lui-même reste connu, il est ressenti).
 * La vue ne sert qu'à l'affichage ; elle n'est jamais enregistrée.
 */
export function vueJoueur(etat, { seuilVisible = false } = {}) {
  if (!etat) return null;
  const e = clone(etat);
  if (!seuilVisible) {
    e.seuil = { masque: true };
    e.auspices = { masque: true, beaute: e.auspices?.beaute ?? 0 };
    if (e.rituel?.resolution) {
      e.rituel.resolution.depassement = null;
      e.rituel.resolution.seuil = null;
    }
    if (e.transe?.rejet) {
      e.transe.rejet.seuil = null;
      e.transe.rejet.depassement = null;
      e.transe.rejet.sequelles = null;
    }
    e.lancers = e.lancers.map(l => ({ ...l }));
  }
  if (e.rituel?.puissanceSecrete) {
    e.rituel.puissance = null;
    const r = e.rituel.resolution;
    if (r) {
      r.puissance = null;
      if (!e.rituel.narration) {
        r.suffisant = null;
        r.succesSupplementaires = null;
      }
    }
  }
  return e;
}

/** Résumé lisible de l'état d'un acte (interface, chat). */
export function resumeActe(etat) {
  const dernier = etat.lancers[etat.lancers.length - 1] ?? null;
  return {
    type: etat.type,
    statut: etat.statut,
    enCours: estEnCours(etat),
    succes: etat.succes,
    colereInitiale: etat.colereInitiale,
    colereGagnee: etat.colereGagnee,
    colereTotale: colereTotale(etat),
    seuil: etat.seuil.seuil,
    lancers: etat.lancers.length,
    dernier,
    peutArreter: etat.peutArreter,
    doitPoursuivre: estEnCours(etat) && dernier?.resultat === RESULTAT.COLERE
      && (etat.type === "rituel" || !!etat.transe?.actionEnCours)
  };
}

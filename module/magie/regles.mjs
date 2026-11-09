/**
 * Règles pures de la magie : d10 sacré, Auspices, Seuil de Rejet, améliorations,
 * récupération de la Colère et Cycle de Transe.
 * Aucune dépendance à Foundry : ces fonctions sont couvertes par les tests Node.
 */
import { MAGIE } from "./config-magie.mjs";

/** Erreur de règle : `code` stable (pour l'interface et les tests), message en français. */
export class MagieError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MagieError";
    this.code = code;
  }
}

export const RESULTAT = Object.freeze({ SUCCES: "succes", COLERE: "colere" });

const entier = (v, nom) => {
  const n = Number(v ?? 0);
  if (!Number.isInteger(n)) throw new MagieError("valeur-invalide", `${nom} doit être un nombre entier (reçu : ${v}).`);
  return n;
};

/** Clé stable d'une Voie : `cle` si renseignée, sinon nom normalisé (« Voie d'Agwé » → « voie-d-agwe »). */
export function cleVoie(nom, cle = "") {
  return String(cle || nom || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* -------------------------------------------- */
/*  D10 sacré                                   */
/* -------------------------------------------- */

/**
 * Interprète la valeur d'un d10 sacré.
 * 1 à 5 : +1 Succès sacré ; 6 à 10 : +1 Colère divine. Aucun critique.
 * @param {number} valeur  valeur du dé (1 à 10)
 * @returns {{valeur:number, resultat:string, dSucces:number, dColere:number}}
 */
export function resoudreD10(valeur, cfg = MAGIE.d10) {
  if (!Number.isInteger(valeur) || valeur < 1 || valeur > cfg.faces) {
    throw new MagieError("d10-invalide", `Valeur de d10 invalide : ${valeur}.`);
  }
  const succes = valeur <= cfg.succesMax;
  return {
    valeur,
    resultat: succes ? RESULTAT.SUCCES : RESULTAT.COLERE,
    dSucces: succes ? 1 : 0,
    dColere: succes ? 0 : 1
  };
}

/* -------------------------------------------- */
/*  Auspices et Seuil de Rejet                  */
/* -------------------------------------------- */

/**
 * Auspices = Actes de foi + Affinité + Beauté des rites − Péchés (peut être négatif).
 */
export function calculerAuspices({ actesFoi = 0, affinite = 0, beaute = 0, peches = 0 } = {}) {
  const c = {
    actesFoi: entier(actesFoi, "Actes de foi"),
    affinite: entier(affinite, "Affinité"),
    beaute: entier(beaute, "Beauté des rites"),
    peches: entier(peches, "Péchés")
  };
  return { ...c, total: c.actesFoi + c.affinite + c.beaute - c.peches };
}

/** Définition d'un type de religion (erreur explicite si le type est inconnu ou absent). */
export function typeReligion(type, types = MAGIE.types) {
  const def = types?.[type];
  if (!def) {
    throw new MagieError("type-religion", type
      ? `Type de religion inconnu : « ${type} ».`
      : "Le type de religion (communion ou possession) n'est pas renseigné.");
  }
  return def;
}

/**
 * Seuil de Rejet = valeur de la Voie (Foi ou Connaissance des Mystères selon le type) + Faveurs + Auspices.
 * La formule n'est jamais bornée : un Seuil négatif est signalé par `negatif`.
 * @param {object} o
 * @param {string} o.type        clé de MAGIE.types
 * @param {object} o.valeurs     valeurs de la Voie, ex. { foi: 3, mysteres: 0 }
 * @param {number} o.faveurs
 * @param {number} o.auspices    total des Auspices
 */
export function calculerSeuil({ type, valeurs = {}, faveurs = 0, auspices = 0 }, types = MAGIE.types) {
  const def = typeReligion(type, types);
  const valeurStat = entier(valeurs[def.stat] ?? 0, def.statLabel);
  const fav = entier(faveurs, "Faveurs");
  const aus = entier(auspices, "Auspices");
  const seuil = valeurStat + fav + aus;
  return { type, stat: def.stat, statLabel: def.statLabel, valeurStat, faveurs: fav, auspices: aus, seuil, negatif: seuil < 0 };
}

/** Le Rejet survient lorsque la Colère dépasse (strictement) le Seuil. */
export function depasseSeuil(colere, seuil) {
  return colere > seuil;
}

/** Nombre de points de Colère au-delà du Seuil (0 si pas de Rejet). */
export function depassement(colere, seuil) {
  return Math.max(0, colere - seuil);
}

/* -------------------------------------------- */
/*  Améliorations des Pouvoirs                  */
/* -------------------------------------------- */

/** Succès supplémentaires = Succès obtenus − Puissance nécessaire (0 si le Rituel est insuffisant). */
export function budgetAmeliorations(succes, puissance = 0) {
  return Math.max(0, entier(succes, "Succès") - entier(puissance, "Puissance"));
}

/** Coût de la k-ième augmentation d'un même paramètre (1, 2, 3…). */
export function coutAugmentation(rang) {
  const k = entier(rang, "Rang d'augmentation");
  if (k < 1) throw new MagieError("valeur-invalide", "Le rang d'une augmentation commence à 1.");
  return k;
}

/** Coût total de N augmentations d'un même paramètre : N × (N + 1) / 2. */
export function coutAugmentations(n) {
  const k = entier(n, "Nombre d'augmentations");
  if (k < 0) throw new MagieError("valeur-invalide", "Le nombre d'augmentations ne peut pas être négatif.");
  return (k * (k + 1)) / 2;
}

/**
 * Valide une répartition des Succès supplémentaires.
 * @param {object} repartition  ex. { portee: 2, impact: 1 }
 * @param {number} budget
 * @returns {{valide:boolean, cout:number, reste:number, details:object, erreurs:string[]}}
 */
export function validerRepartition(repartition = {}, budget = 0, parametres = MAGIE.parametres) {
  const erreurs = [];
  const details = {};
  let cout = 0;
  for (const [cle, brut] of Object.entries(repartition ?? {})) {
    if (!parametres[cle]) { erreurs.push(`Paramètre inconnu : « ${cle} ».`); continue; }
    const n = Number(brut ?? 0);
    if (!Number.isInteger(n) || n < 0) { erreurs.push(`${parametres[cle].label} : nombre d'augmentations invalide (${brut}).`); continue; }
    const c = coutAugmentations(n);
    details[cle] = { augmentations: n, cout: c };
    cout += c;
  }
  if (!Number.isInteger(budget) || budget < 0) erreurs.push(`Budget invalide : ${budget}.`);
  if (cout > budget) erreurs.push(`La répartition coûte ${cout} Succès pour un budget de ${budget}.`);
  return { valide: erreurs.length === 0, cout, reste: budget - cout, details, erreurs };
}

/* -------------------------------------------- */
/*  Récupération de la Colère                   */
/* -------------------------------------------- */

/**
 * Récupération ordinaire : 1 point par heure entière écoulée depuis `reference`
 * (fin du dernier acte sacré, puis dernière récupération comptabilisée).
 * Idempotente : la référence avance du nombre d'heures consommées, le reste est conservé.
 * Aucune récupération pendant un acte sacré en cours (Rituel ou Transe), ni si elle est bloquée.
 * @returns {{valeur:number, reference:number|null, recuperes:number}}
 */
export function recupererColere({ valeur = 0, reference = null, maintenant, acteEnCours = false, bloquee = false },
  secondesParPoint = MAGIE.recuperation.secondesParPoint) {
  const inchange = { valeur, reference, recuperes: 0 };
  if (acteEnCours || bloquee || reference == null || !Number.isFinite(maintenant)) return inchange;
  if (valeur <= 0) return { valeur: 0, reference: maintenant, recuperes: 0 };
  const heures = Math.floor((maintenant - reference) / secondesParPoint);
  if (heures <= 0) return inchange;
  const recuperes = Math.min(valeur, heures);
  return { valeur: valeur - recuperes, reference: reference + heures * secondesParPoint, recuperes };
}

/* -------------------------------------------- */
/*  Cycle de Transe                             */
/* -------------------------------------------- */

/** Durée du Cycle (minutes) : durée des Rites préparatoires, au moins une minute ; trente minutes en Transe instantanée. */
export function dureeCycle({ dureeRitesMinutes = 0, instantanee = false } = {}, cfg = MAGIE.transe) {
  if (instantanee) return cfg.cycleInstantaneeMinutes;
  const d = Number(dureeRitesMinutes) || 0;
  return Math.max(cfg.cycleMinMinutes, Math.ceil(d));
}

/** Échéance du Cycle au niveau courant (temps du monde en secondes). */
export function etatCycle(cycle, maintenant) {
  if (!cycle || cycle.debutNiveau == null) return { echeance: null, restant: null, depasse: false };
  const echeance = cycle.debutNiveau + cycle.dureeMinutes * 60;
  const restant = Number.isFinite(maintenant) ? echeance - maintenant : null;
  return { echeance, restant, depasse: restant != null && restant < 0 };
}

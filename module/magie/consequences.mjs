/**
 * Conséquences divines : archive des Rejets, séquelles et pénitences — règles pures.
 *
 * Références (Entre ciel et terre, p. 122, 127-128, 118) :
 *  - Gravité des séquelles : Rituel → Puissance du Pouvoir invoqué ; Transe → Puissance du Pouvoir le plus
 *    puissant obtenu pendant la Transe.
 *  - Durée : une pénitence par Lame renversée en trop (ici : par point de Colère au-delà du Seuil) ;
 *    les séquelles durent tant qu'une pénitence reste à accomplir.
 *  - Nature : inspirée du Pouvoir (effet secondaire ou opposé), à la discrétion du MJ — aucune table universelle.
 *  - Séquelles (-5c) : malus d'Auspices tant que le prêtre souffre de séquelles dues à cette même Voie.
 *  - Le Rejet annule tous les Pouvoirs activés pendant l'acte sacré.
 */
import { MAGIE } from "./config-magie.mjs";

export const ETATS_PENITENCE = Object.freeze({ A_ACCOMPLIR: "a-accomplir", EN_COURS: "en-cours", ACCOMPLIE: "accomplie", ABANDONNEE: "abandonnee" });

/**
 * Données d'archive d'un Rejet, à partir de l'état final d'un acte.
 * @returns {object|null}  null si l'acte ne s'est pas soldé par un Rejet
 */
export function archiveRejet(etat, { maintenant = null, dateReelle = null } = {}) {
  if (!etat) return null;
  const rituel = etat.type === "rituel";
  const res = etat.rituel?.resolution;
  const r = etat.transe?.rejet;
  if (rituel ? !res?.rejet : !r) return null;
  const activations = (etat.transe?.activations ?? []).map(a => ({ n: a.n, nom: a.pouvoir?.nom ?? "" }));
  return {
    id: etat.id,
    acteId: etat.id,
    typeActe: etat.type,
    religion: etat.religion ?? "",
    voie: etat.voie?.nom ?? "",
    voieCle: etat.voie?.cle ?? "",
    groupeColere: etat.groupeColere ?? "",
    colere: rituel ? res.colereTotale : r.colereTotale,
    seuil: rituel ? res.seuil : r.seuil,
    depassement: rituel ? res.depassement : r.depassement,
    // Gravité : Pouvoir invoqué (Rituel) ou Pouvoir le plus puissant obtenu (Transe)
    puissance: rituel ? (etat.rituel.pouvoir?.puissance ?? etat.rituel.puissance) : r.sequelles?.puissanceMax ?? r.niveauMax,
    pouvoir: rituel ? (etat.rituel.pouvoir?.nom ?? "") : (r.chemin?.at(-1)?.nom ?? ""),
    niveauMax: rituel ? null : r.niveauMax,
    niveauRejet: rituel ? null : r.niveau,
    pouvoirsAnnules: activations.map(a => a.nom).filter(Boolean),
    date: maintenant,
    dateReelle,
    statut: "a-resoudre",
    conclusion: ""
  };
}

/** Une pénitence par point de Colère au-delà du Seuil (au moins une). */
export function nombrePenitences(rejet) {
  return Math.max(1, Number(rejet?.depassement) || 0);
}

/** Une pénitence est-elle encore due ? */
export const penitenceDue = p => p.etat === ETATS_PENITENCE.A_ACCOMPLIR || p.etat === ETATS_PENITENCE.EN_COURS;

/**
 * État d'une séquelle selon ses pénitences : elle peut être levée quand toutes les pénitences
 * qui lui sont liées sont accomplies (une pénitence abandonnée n'efface rien).
 */
export function etatSequelle(sequelle, penitences) {
  const liees = penitences.filter(p => p.sequelleId === sequelle.id || (!p.sequelleId && p.rejetId && p.rejetId === sequelle.rejetId));
  const restantes = liees.filter(penitenceDue).length;
  const abandonnees = liees.filter(p => p.etat === ETATS_PENITENCE.ABANDONNEE).length;
  return { liees: liees.length, restantes, abandonnees, levable: sequelle.active && liees.length > 0 && restantes === 0 && abandonnees === 0 };
}

/**
 * Malus d'Auspices dû aux séquelles actives : il ne s'applique qu'aux actes dans la même Voie
 * (ou, si la séquelle n'est liée à aucune Voie, à tous les actes), sauf séquelle exemptée.
 */
export function malusSequelles(sequelles, voieCle, valeur = MAGIE.sequelles.malusAuspices) {
  const concernees = (sequelles ?? []).filter(s => s.active && s.malusAuspices !== false && (!s.voieCle || s.voieCle === voieCle));
  return concernees.length ? valeur : 0;
}

/**
 * Prochaine repentance possible : tous les 3 jours si le prêtre en fait sa priorité, une fois par semaine sinon (p. 122).
 * @param {number|null} derniere  temps du monde de la dernière tentative (secondes)
 */
export function prochaineRepentance(derniere, priorite = false, cfg = MAGIE.penitence) {
  if (derniere == null) return null;
  return derniere + (priorite ? cfg.delaiPrioriteJours : cfg.delaiNormalJours) * 86400;
}

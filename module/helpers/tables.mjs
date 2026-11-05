import { PN2 } from "../config.mjs";

/**
 * Arrondi Pavillon Noir : un résultat tombant exactement entre deux entiers
 * est arrondi vers la « valeur moyenne » (5 pour une caractéristique, 3 pour
 * une compétence, 0 pour un modificateur, 2 pour une réussite). Sinon, on
 * arrondit à l'entier inférieur.
 */
export function pnRound(x, moyenne = 5) {
  const f = Math.floor(x);
  if (Math.abs(x - f - 0.5) < 1e-9) return (f + 0.5 > moyenne) ? f : f + 1;
  return f;
}

/** Moyenne de deux caractéristiques arrondie vers 5 (Valeurs de métier / commandement). */
export function valeurMetier(a, b) {
  return pnRound((Number(a) + Number(b)) / 2, 5);
}

/* -------------------------------------------- */
/*  Table des Mesures et des Valeurs            */
/* -------------------------------------------- */

const MANTISSES = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

/** Mesure associée à une Valeur (ex. +10 -> 10, +13 -> 20, -3 -> 1/2). */
export function mesureDeValeur(v) {
  v = Math.round(Number(v) || 0);
  const decade = Math.floor(v / 10);
  const idx = ((v % 10) + 10) % 10;
  return MANTISSES[idx] * Math.pow(10, decade);
}

/** Valeur associée à une Mesure (on prend la Valeur supérieure entre deux cases). */
export function valeurDeMesure(m) {
  m = Number(m);
  if (!(m > 0)) return -99;
  const decade = Math.floor(Math.log10(m) + 1e-9);
  const mant = m / Math.pow(10, decade);
  let idx = MANTISSES.findIndex(x => x >= mant - 1e-9);
  let d = decade;
  if (idx < 0) { idx = 0; d += 1; }
  return d * 10 + idx;
}

/** Affichage lisible d'une mesure (fractions pour les petites valeurs). */
export function formatMesure(m) {
  if (m >= 1) return Number.isInteger(m) ? String(m) : String(Math.round(m * 100) / 100).replace(".", ",");
  const fr = { 0.1: "1/10", 0.125: "1/8", 0.15: "1/7", 0.2: "1/5", 0.25: "1/4", 0.3: "1/3", 0.4: "2/5", 0.5: "1/2", 0.6: "3/5", 0.8: "4/5" };
  const k = Object.keys(fr).find(k => Math.abs(Number(k) - m) < 1e-6);
  return k ? fr[k] : String(Math.round(m * 1000) / 1000).replace(".", ",");
}

/**
 * Résolution d'une Action numérique : on remonte d'une ligne (Valeur - 10)
 * puis on se décale de deux colonnes par Succès (positifs ou négatifs).
 */
export function actionNumerique(valeurDepart, succes, echec = false) {
  const v = Number(valeurDepart) - 10 + (echec ? 0 : 2 * Number(succes || 0));
  return { valeur: v, mesure: mesureDeValeur(v) };
}

/** Résultat de la Table des Actions non numériques. */
export function actionNonNumerique(succes, { catastrophe = false, echec = false } = {}) {
  let col;
  if (catastrophe) col = 0;
  else if (echec || succes <= 0) col = 1;
  else if (succes >= 8) col = 7;
  else if (succes >= 6) col = 6;
  else col = Math.min(succes, 4) + 1;
  const t = PN2.actionsNonNum;
  return { colonne: t.colonnes[col], longue: t.longue[col], courte: t.courte[col], effets: t.effets[col] };
}

/* -------------------------------------------- */
/*  Personnages                                 */
/* -------------------------------------------- */

export function mdForce(f) {
  f = Math.round(Number(f) || 0);
  if (f < 2) return -2 - (2 - f);
  if (f > 9) return 4 + (f - 9);
  return PN2.mdFor[f];
}

export function mdAdresse(a) {
  a = Math.round(Number(a) || 0);
  if (a < 2) return -1;
  if (a > 9) return 2 + Math.floor((a - 9) / 2);
  return PN2.mdAdr[a];
}

/** Cases de blessure par niveau pour une Résistance donnée. */
export function casesParNiveau(res) {
  const i = Math.max(0, Math.min(7, Math.round(Number(res) || 0) - 2));
  return [
    PN2.casesBlessure.L[i], PN2.casesBlessure.S[i], PN2.casesBlessure.G[i], PN2.casesBlessure.Cr[i], 2, 1
  ];
}

/** Liste ordonnée des niveaux (index 1..6) de chaque case d'une localisation. */
export function listeCases(res) {
  const n = casesParNiveau(res);
  const list = [];
  n.forEach((count, lvl) => { for (let i = 0; i < count; i++) list.push(lvl + 1); });
  return list;
}

/** Niveau de blessure (0 = indemne … 6 = mortelle) atteint avec n cases cochées. */
export function niveauBlessure(res, coches) {
  const list = listeCases(res);
  if (!coches || coches <= 0) return 0;
  const c = Math.min(coches, list.length);
  return list[c - 1] ?? 6;
}

/** État de santé général à partir des niveaux par localisation. */
export function etatGeneral(niveaux) {
  const max = Math.max(0, ...niveaux);
  if (max === 0) return 0;
  const nb = niveaux.filter(n => n === max).length;
  return Math.min(6, max + (nb > 1 ? 1 : 0));
}

/** Niveau de réputation selon le score. */
export function niveauReputation(score) {
  let lvl = 0;
  PN2.seuilsReputation.forEach((s, i) => { if (score >= s) lvl = i; });
  return lvl;
}

/** Libellé de marge de réussite. */
export function libelleMarge(succes, { critique = false } = {}) {
  if (critique) return "Échec critique";
  const m = PN2.marges.find(m => succes >= m.min);
  return m ? m.label : "Échec";
}

/* -------------------------------------------- */
/*  Navires                                     */
/* -------------------------------------------- */

/** Seuils de PS pour chaque niveau de dommages (via la table des Mesures). */
export function seuilsStructure(psTotal) {
  psTotal = Number(psTotal) || 0;
  if (psTotal <= 0) return { ok: 0, leger: 0, serieux: 0, grave: 0, critique: 0, ponton: 0 };
  return {
    ok: psTotal,
    leger: Math.max(1, Math.round(psTotal * 4 / 5)),
    serieux: Math.max(1, Math.round(psTotal * 3 / 5)),
    grave: Math.max(1, Math.round(psTotal * 2 / 5)),
    critique: Math.max(1, Math.round(psTotal / 5)),
    ponton: 0
  };
}

/** Index d'état (0 OK … 6 coulé) d'une localisation de navire selon ses PS restants. */
export function etatStructure(ps, psTotal) {
  ps = Number(ps); psTotal = Number(psTotal) || 0;
  if (psTotal <= 0) return 0;
  if (ps < 0) return 6;
  const s = seuilsStructure(psTotal);
  if (ps >= s.ok) return 0;
  if (ps >= s.leger) return 1;
  if (ps >= s.serieux) return 2;
  if (ps >= s.grave) return 3;
  if (ps >= s.critique) return 4;
  if (ps > 0) return 4;
  return 5;
}

/** Calibre -> Mesure de dégâts d'un canon (calibre / 6). */
export function mesureCanon(calibre) {
  return Number(calibre) / 6;
}

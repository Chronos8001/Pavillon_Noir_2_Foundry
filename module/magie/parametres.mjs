/**
 * Paramètres des Pouvoirs : Portée, Cible, Impact, Durée — règles pures.
 *
 * Tables officielles : Entre ciel et terre, p. 100 (« Paramètres des Pouvoirs ») ; chaque augmentation fait
 * gagner une catégorie, au coût progressif 1, 3, 6, 10… (« Augmentation des paramètres des Pouvoirs »).
 * L'Impact de base d'un Pouvoir est égal à sa Puissance. Les catégories marquées « mj » ne sont accessibles
 * qu'avec l'accord du MJ. Les valeurs hors table (ex. « 1 cycle », « 1 nuit ») sont conservées telles quelles.
 */
import { MAGIE } from "./config-magie.mjs";

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Catégories d'un paramètre (tables de CONFIG.PN2.magie.parametres). */
export const categories = (param, cfg = MAGIE.parametres) => cfg[param]?.categories ?? [];

/**
 * Catégorie correspondant à une valeur de base.
 * - Impact : valeur numérique comparée aux bornes (1, 2, 3-4, 5, 6-7, 8-9, 10+).
 * - Autres : libellé ou alias (« Ici », « Ici (10 m) », « Vue », « 24 h »…).
 * @returns {number} index de catégorie, ou -1 si la valeur est hors table
 */
export function trouverCategorie(param, valeur, cfg = MAGIE.parametres) {
  const cats = categories(param, cfg);
  if (param === "impact") {
    const n = Number(String(valeur ?? "").match(/\d+/)?.[0]);
    if (!Number.isFinite(n) || n < 1) return -1;
    return cats.findIndex(c => n >= c.min && (c.max == null || n <= c.max));
  }
  const v = norm(valeur);
  if (!v) return -1;
  return cats.findIndex(c => [c.label, ...(c.alias ?? [])].some(a => norm(a) === v));
}

/**
 * Valeur d'un paramètre après N augmentations (une catégorie par augmentation).
 * @returns {{base:string, index:number, resultat:string, horsTable:boolean, plafond:boolean, accordMJ:boolean, secondes:number|null}}
 */
export function ameliorer(param, valeurBase, augmentations = 0, cfg = MAGIE.parametres) {
  const cats = categories(param, cfg);
  const n = Math.max(0, Number(augmentations) || 0);
  const i = trouverCategorie(param, valeurBase, cfg);
  if (i < 0) {
    return { base: String(valeurBase ?? ""), index: -1, resultat: n ? `${valeurBase || "?"} (+${n} catégorie${n > 1 ? "s" : ""})` : String(valeurBase ?? ""),
      horsTable: true, plafond: false, accordMJ: false, secondes: null };
  }
  const j = Math.min(cats.length - 1, i + n);
  const c = cats[j];
  return { base: cats[i].label, index: j, resultat: c.label, horsTable: false, plafond: i + n > cats.length - 1, accordMJ: !!c.mj, secondes: c.secondes ?? null };
}

/**
 * Paramètres effectifs d'un Pouvoir (base + répartition des améliorations).
 * @param {{portee?:string, cible?:string, impact?:string|number, duree?:string, puissance?:number}} pouvoir
 * @param {{portee?:number, cible?:number, impact?:number, duree?:number}} repartition  nombre d'augmentations par paramètre
 */
export function parametresEffectifs(pouvoir, repartition = {}, cfg = MAGIE.parametres) {
  const out = {};
  for (const param of Object.keys(cfg)) {
    let base = pouvoir?.[param] ?? "";
    if (param === "impact" && !String(base).trim() && pouvoir?.puissance) base = String(pouvoir.puissance);   // Impact de base = Puissance
    out[param] = { label: cfg[param].label, ...ameliorer(param, base, repartition?.[param] ?? 0, cfg) };
  }
  return out;
}

/** Durée en secondes d'une valeur de Durée (null si permanente, hors table ou non chiffrable). */
export function dureeEnSecondes(valeur, cfg = MAGIE.parametres) {
  const i = trouverCategorie("duree", valeur, cfg);
  return i < 0 ? null : (categories("duree", cfg)[i].secondes ?? null);
}

/** Avertissements de validation d'un paramètre (valeur absente des tables : signalée, jamais refusée). */
export function verifierParametres(pouvoir, cfg = MAGIE.parametres) {
  const avertissements = [];
  for (const param of ["portee", "cible", "duree"]) {
    const v = pouvoir?.[param];
    if (v && trouverCategorie(param, v, cfg) < 0) avertissements.push(`${cfg[param].label} « ${v} » absente des tables (conservée telle quelle).`);
  }
  if (pouvoir?.impact && trouverCategorie("impact", pouvoir.impact, cfg) < 0) avertissements.push(`Impact « ${pouvoir.impact} » non numérique.`);
  return avertissements;
}

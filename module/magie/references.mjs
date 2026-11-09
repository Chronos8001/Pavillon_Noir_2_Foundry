/**
 * Références entre religions, Voies et Pouvoirs, et préparation des imports.
 * Module pur : il travaille sur des objets simples, sans dépendre de Foundry.
 *
 * Une référence est d'abord un UUID Foundry (document du monde ou de compendium).
 * Une copie possédée par un personnage garde l'UUID de sa source dans `_stats.compendiumSource` :
 * une Voie possédée correspond donc à une référence si son UUID OU celui de sa source y correspond.
 * À défaut (anciennes données, référence perdue), on se rabat sur la clé de Voie.
 */
import { cleVoie } from "./regles.mjs";
import { MAGIE } from "./config-magie.mjs";

/**
 * Voie d'un Pouvoir parmi des Voies candidates.
 * @param {{voieUuid?:string, voie?:string}} pouvoir
 * @param {Array<{uuid:string, sourceUuid?:string|null, cle:string}>} voies
 * @returns {{voie:object|null, mode:"uuid"|"cle"|null, referenceCassee:boolean}}
 */
export function voieDuPouvoir(pouvoir, voies) {
  const uuid = pouvoir?.voieUuid || "";
  if (uuid) {
    const v = voies.find(x => x.uuid === uuid || (x.sourceUuid && x.sourceUuid === uuid));
    if (v) return { voie: v, mode: "uuid", referenceCassee: false };
  }
  const cle = cleVoie(pouvoir?.voie ?? "");
  const parCle = cle ? voies.find(x => x.cle === cle) : null;
  return { voie: parCle ?? null, mode: parCle ? "cle" : null, referenceCassee: !!uuid && !parCle };
}

/**
 * Sépare une liste d'UUID en références valides et cassées.
 * @param {string[]} uuids
 * @param {(uuid:string) => object|null} resoudre  résolution synchrone (index de compendium, monde…)
 */
export function trierReferences(uuids, resoudre) {
  const valides = [];
  const cassees = [];
  for (const uuid of uuids ?? []) {
    const doc = uuid ? resoudre(uuid) : null;
    if (doc) valides.push({ uuid, doc });
    else cassees.push(uuid);
  }
  return { valides, cassees };
}

/* -------------------------------------------- */
/*  Import des données officielles              */
/* -------------------------------------------- */

const texte = v => (v == null ? "" : String(v));

/**
 * Valide et normalise un lot de données à importer (religions, Voies, Pouvoirs).
 * Les liens se font par clé (`cle`) dans le lot ; le service les convertit ensuite en UUID.
 *
 * Format :
 * {
 *   religions: [{ cle, nom, type, groupeColere?, description?, correspondances?: [noms d'historique] }],
 *   voies:     [{ cle, nom, religion (cle), domaine?, description?, sansTranse?, source? }],
 *   pouvoirs:  [{ nom, voie (cle), puissance, nomNatif?, portee?, cible?, impact?, duree?,
 *                 conditions?, compulsion?, visions?, description?, references?, source? }]
 * }
 * @returns {{valide:boolean, erreurs:string[], religions:object[], voies:object[], pouvoirs:object[]}}
 */
export function preparerImport(donnees, types = MAGIE.types) {
  const erreurs = [];
  const religions = [];
  const voies = [];
  const pouvoirs = [];
  if (!donnees || typeof donnees !== "object") return { valide: false, erreurs: ["Données d'import absentes."], religions, voies, pouvoirs };

  const clesReligions = new Set();
  for (const [i, r] of (donnees.religions ?? []).entries()) {
    const cle = cleVoie(r?.nom, r?.cle);
    if (!r?.nom || !cle) { erreurs.push(`Religion n° ${i + 1} : nom manquant.`); continue; }
    if (clesReligions.has(cle)) { erreurs.push(`Religion « ${r.nom} » en double.`); continue; }
    if (r.type && !types[r.type]) erreurs.push(`Religion « ${r.nom} » : type inconnu « ${r.type} ».`);
    clesReligions.add(cle);
    religions.push({
      cle, nom: texte(r.nom), type: r.type ?? "", groupeColere: texte(r.groupeColere), description: texte(r.description),
      correspondances: (r.correspondances ?? []).map(texte), source: texte(r.source)
    });
  }

  const clesVoies = new Set();
  for (const [i, v] of (donnees.voies ?? []).entries()) {
    const cle = cleVoie(v?.nom, v?.cle);
    if (!v?.nom || !cle) { erreurs.push(`Voie n° ${i + 1} : nom manquant.`); continue; }
    if (clesVoies.has(cle)) { erreurs.push(`Voie « ${v.nom} » en double.`); continue; }
    const religion = v.religion ? cleVoie(v.religion) : "";
    if (religion && !clesReligions.has(religion)) erreurs.push(`Voie « ${v.nom} » : religion « ${v.religion} » absente du lot.`);
    clesVoies.add(cle);
    voies.push({
      cle, nom: texte(v.nom), religion, domaine: texte(v.domaine), description: texte(v.description),
      sansTranse: !!v.sansTranse, source: texte(v.source)
    });
  }

  for (const [i, p] of (donnees.pouvoirs ?? []).entries()) {
    const voie = cleVoie(p?.voie ?? "");
    const puissance = Number(p?.puissance);
    if (!p?.nom) { erreurs.push(`Pouvoir n° ${i + 1} : nom manquant.`); continue; }
    if (!voie || !clesVoies.has(voie)) erreurs.push(`Pouvoir « ${p.nom} » : Voie « ${p?.voie ?? ""} » absente du lot.`);
    if (!Number.isInteger(puissance) || puissance < 1 || puissance > 10) erreurs.push(`Pouvoir « ${p.nom} » : Puissance invalide (${p?.puissance}).`);
    pouvoirs.push({
      nom: texte(p.nom), voie, puissance, nomNatif: texte(p.nomNatif),
      portee: texte(p.portee), cible: texte(p.cible), impact: texte(p.impact), duree: texte(p.duree),
      conditions: texte(p.conditions), compulsion: texte(p.compulsion), visions: texte(p.visions),
      description: texte(p.description), references: texte(p.references), source: texte(p.source)
    });
  }
  return { valide: erreurs.length === 0, erreurs, religions, voies, pouvoirs };
}

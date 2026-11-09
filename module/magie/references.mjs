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
import { verifierParametres } from "./parametres.mjs";

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
 *   pouvoirs:  [{ cle?, nom, voie (cle), puissance, nomNatif?, portee?, cible?, impact?, duree?, application?,
 *                 conditions?, compulsion?, visions?, description?, references?, source? }],
 *   aleas:     [{ cle?, nom, religion?, voie?, typesActe?, sens?, categorie?, gravite?, poids?, effetNarratif?,
 *                 effetMecanique?, visibilite?, description?, source? }]
 * }
 * Chaque document reçoit une clé d'import (`type:cle`) qui permet de le mettre à jour lors d'un nouvel import.
 * @returns {{valide:boolean, erreurs:string[], avertissements:string[], religions:object[], voies:object[], pouvoirs:object[], aleas:object[]}}
 */
export function preparerImport(donnees, types = MAGIE.types) {
  const erreurs = [];
  const avertissements = [];
  const religions = [];
  const voies = [];
  const pouvoirs = [];
  const aleas = [];
  if (!donnees || typeof donnees !== "object") return { valide: false, erreurs: ["Données d'import absentes."], avertissements, religions, voies, pouvoirs, aleas };

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

  const clesPouvoirs = new Set();
  for (const [i, p] of (donnees.pouvoirs ?? []).entries()) {
    const voie = cleVoie(p?.voie ?? "");
    const puissance = Number(p?.puissance);
    if (!p?.nom) { erreurs.push(`Pouvoir n° ${i + 1} : nom manquant.`); continue; }
    const cle = cleVoie(`${voie}-${p.nom}`, p.cle);
    if (clesPouvoirs.has(cle)) { erreurs.push(`Pouvoir « ${p.nom} » en double dans la Voie « ${p.voie} ».`); continue; }
    clesPouvoirs.add(cle);
    if (p.application && !["manuel", "assiste", "automatique"].includes(p.application)) erreurs.push(`Pouvoir « ${p.nom} » : mode d'application inconnu « ${p.application} ».`);
    for (const a of verifierParametres(p)) avertissements.push(`Pouvoir « ${p.nom} » : ${a}`);
    if (!voie || !clesVoies.has(voie)) erreurs.push(`Pouvoir « ${p.nom} » : Voie « ${p?.voie ?? ""} » absente du lot.`);
    if (!Number.isInteger(puissance) || puissance < 1 || puissance > 10) erreurs.push(`Pouvoir « ${p.nom} » : Puissance invalide (${p?.puissance}).`);
    pouvoirs.push({
      cle, nom: texte(p.nom), voie, puissance, nomNatif: texte(p.nomNatif), application: p.application ?? "manuel",
      portee: texte(p.portee), cible: texte(p.cible), impact: texte(p.impact), duree: texte(p.duree),
      conditions: texte(p.conditions), compulsion: texte(p.compulsion), visions: texte(p.visions),
      description: texte(p.description), references: texte(p.references), source: texte(p.source)
    });
  }
  const clesAleas = new Set();
  for (const [i, a] of (donnees.aleas ?? []).entries()) {
    if (!a?.nom) { erreurs.push(`Aléa n° ${i + 1} : nom manquant.`); continue; }
    const cle = cleVoie(a.nom, a.cle);
    if (clesAleas.has(cle)) { erreurs.push(`Aléa « ${a.nom} » en double.`); continue; }
    clesAleas.add(cle);
    if (a.sens && !["droit", "renverse"].includes(a.sens)) erreurs.push(`Aléa « ${a.nom} » : sens inconnu « ${a.sens} ».`);
    if (a.poids != null && (!Number.isInteger(Number(a.poids)) || Number(a.poids) < 0)) erreurs.push(`Aléa « ${a.nom} » : poids invalide.`);
    aleas.push({
      cle, nom: texte(a.nom), religion: a.religion ? cleVoie(a.religion) : "", voie: a.voie ? cleVoie(a.voie) : "",
      typesActe: (a.typesActe ?? []).map(texte), sens: texte(a.sens), categorie: texte(a.categorie),
      gravite: Number(a.gravite ?? 1) || 0, poids: Number(a.poids ?? 1), effetNarratif: texte(a.effetNarratif),
      effetMecanique: texte(a.effetMecanique), visibilite: a.visibilite === "joueur" ? "joueur" : "mj",
      description: texte(a.description), source: texte(a.source)
    });
  }
  return { valide: erreurs.length === 0, erreurs, avertissements, religions, voies, pouvoirs, aleas };
}

/** Clé d'import d'un document (identifiant stable entre deux imports). */
export const cleImport = (type, cle) => `${type}:${cle}`;

/**
 * Plan de mise à jour : documents à créer et documents existants à mettre à jour (même clé d'import).
 * @param {Array<{cle:string}>} elements
 * @param {Map<string,string>} existants  clé d'import → id du document existant
 */
export function planImport(type, elements, existants) {
  const creer = [];
  const maj = [];
  for (const el of elements) {
    const id = existants.get(cleImport(type, el.cle));
    if (id) maj.push({ id, el }); else creer.push(el);
  }
  return { creer, maj };
}

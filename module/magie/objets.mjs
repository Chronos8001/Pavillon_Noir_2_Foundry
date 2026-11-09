/**
 * Objets de pouvoir : tables et règles pures (sans Foundry), testables avec `npm test`.
 * Entre ciel et terre, p. 158-161. Règle maison : une Lame droite du livre est un Succès sacré (d10 de 1 à 5).
 */

/**
 * Table de la p. 161 : une seule colonne de coût (en Succès sacrés) pour la Fréquence d'utilisation
 * et la Durée d'activation, ligne à ligne (0, 1, 2, 3, 4, 5, 6, 8). Vérifiée sur l'exemple « Brume » :
 * une fois par mois (3) et activation de 4 h (1).
 */
export const FREQUENCES_OBJET = {
  jourAnnee: { label: "Un jour précis de l'année", cout: 0 },
  an: { label: "Une fois par an", cout: 1 },
  jourMois: { label: "Un jour précis du mois", cout: 2 },
  mois: { label: "Une fois par mois", cout: 3 },
  semaine: { label: "Une fois par semaine", cout: 4 },
  heure: { label: "À une heure précise de la journée", cout: 5 },
  jour: { label: "Une fois par jour", cout: 6 },
  troisJour: { label: "Trois fois par jour", cout: 8 }
};
export const DUREES_ACTIVATION_OBJET = {
  h24: { label: "24 h", cout: 0 },
  h4: { label: "4 h", cout: 1 },
  h1: { label: "1 h", cout: 2 },
  min30: { label: "30 min", cout: 3 },
  min10: { label: "10 min", cout: 4 },
  min1: { label: "1 min", cout: 5 },
  s10: { label: "10 secondes", cout: 6 },
  instantane: { label: "Instantanée", cout: 8 }
};
export const NATURES_OBJET = { permanent: "Permanent", ephemere: "Éphémère" };
export const MODES_OBJET = { actif: "Actif (Versé dans les arcanes)", passif: "Passif (utilisable par un profane)", autonome: "Autonome (volonté propre)" };
export const FORMES_OBJET = {
  ephemere: ["Baume", "Charme", "Herbe", "Huile", "Philtre", "Poudre", "Potion", "Sortilège pour sarbacane"],
  permanent: ["Baka (gad)", "Collier de mabouya", "Bottou qui rend fou", "Objet enchanté conscient", "Objet enchanté inanimé",
    "Cristal magique", "Os consacrés", "Paquet-kongo", "Poupée vaudoue", "Relique", "Wanga", "Zémi"]
};

/**
 * Pouvoirs qui permettent de créer chaque forme d'objet (il faut en connaître un, p. 160-161).
 * Relevés dans le compendium des Pouvoirs ; une liste vide signifie qu'aucun Pouvoir dédié n'est décrit.
 */
export const POUVOIRS_CREATION = {
  "Baume": ["Baume (Voie du Folklore, 3)", "Baume (Voie des Frères Marassa, 4)"],
  "Charme": ["Charme (Voie des Xapiripë, 3)"],
  "Herbe": ["Herbe (Voie d'Ichéiricou pour le conseil, 3)"],
  "Huile": [],
  "Philtre": ["Philtre (Voie du Folklore, 5)"],
  "Poudre": ["Poudre (Voie du Folklore, 6)"],
  "Potion": ["Potion (Voie du Folklore, 4)", "Breuvage magique (Voie des Frères Marassa, 5)"],
  "Sortilège pour sarbacane": ["Arme à sortilège (Voie des Xapiripë, 5)"],
  "Baka (gad)": ["Statuette gardienne (Voie des Guédés, 4)"],
  "Collier de mabouya": [],
  "Bottou qui rend fou": ["Le bottou qui rend fou (Voie d'Ichéiricou pour la guerre, 6)"],
  "Objet enchanté conscient": ["Enchantement (Voie du Folklore, 8)", "Compagnon enchanté (Voie du Folklore, 6) pour un animal"],
  "Objet enchanté inanimé": ["Enchantement (Voie du Folklore, 8)"],
  "Cristal magique": ["Cristal du sorcier (Voie du Calendrier, 7)"],
  "Os consacrés": ["Sacrement des os (Voie d'Ichéiricou pour le conseil, 2)"],
  "Paquet-kongo": ["Paquet-kongo (Voie de Papa Legba, 2)"],
  "Poupée vaudoue": [],
  "Relique": ["Relique (Voie de Dieu, 7)"],
  "Wanga": ["Wanga actif (Voie de Papa Legba, 6)", "Wanga passif (Voie de Papa Legba, 7)"],
  "Zémi": ["Capture du zémi (Voie des Zémis, 6)"]
};

/**
 * Succès sacrés nécessaires pour créer un Objet de pouvoir (p. 160-161).
 * Permanent : au moins la Puissance du Pouvoir ; les Succès en plus paient la Fréquence d'utilisation, la Durée
 * d'activation et, si on le souhaite, des paramètres supérieurs à ceux du Pouvoir (1 Succès par point de Puissance
 * d'effet demandé au-delà de la Puissance du Pouvoir).
 * Éphémère (Rituel ou Transe) : chaque Succès au-delà de la Puissance consacre une dose (exemple de Mabata :
 * 6 Succès, Puissance 4, deux baumes) ; une dose demande donc Puissance + 1 Succès.
 */
export function coutCreationObjet(sys) {
  const puissance = Math.min(10, Math.max(1, Number(sys?.puissance) || 1));
  if (sys?.nature === "ephemere") return { total: puissance + 1, puissance, frequence: 0, duree: 0, ameliorations: 0, ephemere: true };
  const frequence = FREQUENCES_OBJET[sys?.frequence]?.cout ?? 0;
  const duree = DUREES_ACTIVATION_OBJET[sys?.dureeActivation]?.cout ?? 0;
  const ameliorations = Math.max(0, Number(sys?.ameliorations) || 0);
  return { total: puissance + frequence + duree + ameliorations, puissance, frequence, duree, ameliorations, ephemere: false };
}

/** Doses d'objet éphémère consacrées par un Rituel ou une Transe : Succès sacrés au-delà de la Puissance. */
export function dosesConsacrees(succes, puissance) {
  return Math.max(0, (Number(succes) || 0) - Math.max(1, Number(puissance) || 1));
}

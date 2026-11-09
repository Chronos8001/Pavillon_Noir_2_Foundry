/**
 * Objets de pouvoir : tables et règles pures (sans Foundry), testables avec `npm test`.
 */

/**
 * Objets de pouvoir (Entre ciel et terre, p. 158-161).
 * Coût de création d'un objet permanent, en Succès sacrés au-delà de la Puissance du Pouvoir (table p. 161).
 */
export const FREQUENCES_OBJET = {
  jourAnnee: { label: "Un jour précis de l'année", cout: 0 },
  an: { label: "Une fois par an", cout: 1 },
  jourMois: { label: "Un jour précis du mois", cout: 2 },
  mois: { label: "Une fois par mois", cout: 3 },
  semaine: { label: "Une fois par semaine", cout: 4 },
  heure: { label: "À une heure précise de la journée", cout: 5 },
  jour: { label: "Une fois par jour", cout: 6 },
  troisJour: { label: "Trois fois par jour", cout: 7 }
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
 * Succès sacrés nécessaires pour créer un Objet de pouvoir.
 * Permanent : Puissance + coût de la Fréquence + coût de la Durée d'activation (un seul Rituel).
 * Éphémère : chaque Succès sacré d'un Rituel consacre une dose ; en Transe, chaque Succès au-delà de la Puissance.
 */
export function coutCreationObjet(sys) {
  const puissance = Math.max(1, Number(sys?.puissance) || 1);
  if (sys?.nature === "ephemere") return { total: puissance, puissance, frequence: 0, duree: 0, ephemere: true };
  const frequence = FREQUENCES_OBJET[sys?.frequence]?.cout ?? 0;
  const duree = DUREES_ACTIVATION_OBJET[sys?.dureeActivation]?.cout ?? 0;
  return { total: puissance + frequence + duree, puissance, frequence, duree, ephemere: false };
}

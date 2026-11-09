/**
 * Configuration de la magie (Entre ciel et terre, adaptation maison aux d10).
 * Module pur : aucune dépendance à Foundry (importable par les tests Node).
 * Exposé dans CONFIG.PN2.magie : un module ou une macro de monde peut le modifier.
 */
export const MAGIE = {
  /** D10 sacré : 1 à succesMax = Succès sacré, au-delà = Colère divine. */
  d10: { faces: 10, succesMax: 5 },

  /**
   * Types de religion. `stat` est la donnée de la Voie utilisée pour le Seuil de Rejet.
   * Ajouter un type ici suffit : les fonctions de résolution ne codent aucun type en dur.
   */
  types: {
    communion: { label: "Communion", stat: "foi", statLabel: "Foi" },
    possession: { label: "Possession", stat: "mysteres", statLabel: "Connaissance des Mystères" }
  },

  /**
   * Type des religions de l'historique (clé = nom normalisé de la religion).
   * Sert quand le type n'est ni saisi sur la fiche ni porté par l'objet de religion.
   * Entre ciel et terre, p. 89 et 93 : communion pour les religions chrétiennes, juive et solaires
   * (aztèque, maya, natchez) ; possession pour le vaudou et les religions caraïbe, arawak et yanomami.
   */
  religions: {
    catholique: "communion", protestant: "communion", "protestant-huguenot-reforme": "communion", anglican: "communion",
    chretienne: "communion", "chretienne-catholique": "communion", "chretienne-protestante": "communion", "chretienne-anglicane": "communion",
    juif: "communion", judaisme: "communion",
    "religion-azteque": "communion", azteque: "communion", "religion-maya": "communion", maya: "communion",
    "culte-du-soleil-natchez": "communion", natchez: "communion",
    vaudou: "possession", "religion-caraibe": "possession", caraibe: "possession",
    "religion-arawak": "possession", arawak: "possession", "religion-yanomami": "possession", yanomami: "possession"
  },

  /** Puissance nécessaire d'un Rituel. */
  puissance: { min: 1, max: 10 },

  transe: {
    niveauMax: 10,                // aucun Pouvoir n'a une Puissance supérieure à 10
    cycleMinMinutes: 1,           // le Cycle vaut la durée des Rites préparatoires, une minute au minimum
    cycleInstantaneeMinutes: 30   // Transe instantanée : Cycle de trente minutes, Beauté des rites nulle
  },

  /**
   * Foi / Connaissance des Mystères minimale par acte (Entre ciel et terre, p. 90).
   * Indicatif : la fenêtre affiche un avertissement, le moteur ne bloque pas.
   */
  actesRequis: { rituel: 1, transe: 3, transeInstantanee: 6 },

  /**
   * Paramètres des Pouvoirs (Entre ciel et terre, p. 100). Une augmentation = une catégorie de plus.
   * `mj` : catégorie accessible seulement si le MJ le permet (astérisque du supplément).
   * `secondes` : durée utilisée pour les effets Foundry (null : permanente ou non chiffrée).
   * `alias` : écritures rencontrées dans les descriptions des Pouvoirs.
   */
  parametres: {
    portee: { label: "Portée", categories: [
      { cle: "personnelle", label: "Personnelle" },
      { cle: "toucher", label: "Toucher" },
      { cle: "ici", label: "Ici (10 m)", alias: ["Ici"] },
      { cle: "la", label: "Là (100 m)", alias: ["Là"] },
      { cle: "vue", label: "Vue/Voix/Ouïe", alias: ["Vue", "Voix", "Ouïe", "Vue/Voix", "Voix/Ouïe"] },
      { cle: "labas", label: "Là-bas (2 milles)", alias: ["Là-bas"] },
      { cle: "continent", label: "Continent/Océan", alias: ["Continent", "Océan"] },
      { cle: "terre", label: "Terre", mj: true }
    ] },
    cible: { label: "Cible", categories: [
      { cle: "moi", label: "Moi" },
      { cle: "toi", label: "Toi" },
      { cle: "lui", label: "Lui" },
      { cle: "nous", label: "Nous" },
      { cle: "vous", label: "Vous" },
      { cle: "eux", label: "Eux" },
      { cle: "peuple", label: "Peuple", mj: true }
    ] },
    impact: { label: "Impact", categories: [
      { cle: "1", label: "1", min: 1, max: 1 },
      { cle: "2", label: "2", min: 2, max: 2 },
      { cle: "3-4", label: "3-4", min: 3, max: 4 },
      { cle: "5", label: "5", min: 5, max: 5 },
      { cle: "6-7", label: "6-7", min: 6, max: 7 },
      { cle: "8-9", label: "8-9", min: 8, max: 9 },
      { cle: "10+", label: "10+", min: 10, max: null }
    ] },
    duree: { label: "Durée", categories: [
      { cle: "10s", label: "10 secondes", alias: ["10 s"], secondes: 10 },
      { cle: "2min", label: "2 minutes", alias: ["2 min"], secondes: 120 },
      { cle: "30min", label: "30 minutes", alias: ["30 min"], secondes: 1800 },
      { cle: "4h", label: "4 heures", alias: ["4 h"], secondes: 14400 },
      { cle: "24h", label: "24 heures", alias: ["24 h", "24h"], secondes: 86400 },
      { cle: "semaine", label: "1 semaine", alias: ["Semaine"], secondes: 604800 },
      { cle: "mois", label: "1 mois", alias: ["Mois"], secondes: 2592000 },
      { cle: "permanent", label: "Permanent", mj: true, secondes: null }
    ] }
  },

  /** Récupération ordinaire : 1 point de Colère par heure de temps du monde. */
  recuperation: { secondesParPoint: 3600 },

  /** Groupe de Colère par défaut (une religion = une Colère commune à toutes ses Voies). */
  groupeColereDefaut: "principale",

  /**
   * Événements divins (phase 3). Valeurs par défaut des réglages du monde :
   * - aleaMode : « probabilite » (adaptation maison), « officiel » (un Aléa par acte, p. 95) ou « desactive » ;
   * - aleaProbabilite : chance (%) qu'un acte ait un Aléa en mode « probabilite » — valeur maison à valider ;
   * - revelationSeuil : chance (%) de révélation (Le Mat) par sollicitation, testée avec deux d10 — approximation maison.
   */
  evenements: { aleaMode: "probabilite", aleaProbabilite: 30, revelationSeuil: 2 },

  /** Quête mystique : objectif secret de 1 à `faces` (1D6 du supplément, tiré en d10 avec relance de 7 à 10). */
  quete: { faces: 6 },

  /** Perte de concentration (p. 136) : actions concernées et nombre de d10 supplémentaires (seules les Colères comptent). */
  concentration: { actions: ["ascension"], des: 2 },

  /** Séquelles (-5c, p. 118) : malus d'Auspices tant qu'une séquelle de la même Voie est active. */
  sequelles: { malusAuspices: 5 },

  /** Pénitences (p. 122) : une repentance tous les 3 jours si c'est la priorité du prêtre, une par semaine sinon. */
  penitence: { delaiPrioriteJours: 3, delaiNormalJours: 7 },

  /** Nombre d'identifiants de requêtes conservés pour détecter les doublons. */
  requetesMemorisees: 64
};

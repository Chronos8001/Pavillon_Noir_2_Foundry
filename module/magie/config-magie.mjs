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
   * Paramètres des Pouvoirs améliorables avec les Succès supplémentaires.
   * `categories` : tables de valeurs à renseigner (vides tant que les tables officielles
   * ne sont pas intégrées au projet).
   */
  parametres: {
    portee: { label: "Portée", categories: [] },
    cible: { label: "Cible", categories: [] },
    impact: { label: "Impact", categories: [] },
    duree: { label: "Durée", categories: [] }
  },

  /** Récupération ordinaire : 1 point de Colère par heure de temps du monde. */
  recuperation: { secondesParPoint: 3600 },

  /** Groupe de Colère par défaut (une religion = une Colère commune à toutes ses Voies). */
  groupeColereDefaut: "principale",

  /** Nombre d'identifiants de requêtes conservés pour détecter les doublons. */
  requetesMemorisees: 64
};

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

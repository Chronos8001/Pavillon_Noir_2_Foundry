/**
 * Configuration du système Pavillon Noir 2.
 * Toutes les listes (caractéristiques, compétences, tables) sont regroupées ici.
 */
export const PN2 = {};

PN2.id = "pavillon-noir-2";

/* -------------------------------------------- */
/*  Caractéristiques                            */
/* -------------------------------------------- */

PN2.caracs = {
  adr: { label: "Adresse", abbr: "Adr", mentale: false },
  for: { label: "Force", abbr: "For", mentale: false },
  res: { label: "Résistance", abbr: "Rés", mentale: false },
  ada: { label: "Adaptabilité", abbr: "Ada", mentale: false },
  eru: { label: "Érudition", abbr: "Éru", mentale: true },
  per: { label: "Perception", abbr: "Per", mentale: true },
  cha: { label: "Charisme", abbr: "Cha", mentale: true },
  exp: { label: "Expression", abbr: "Exp", mentale: true },
  pou: { label: "Pouvoir", abbr: "Pou", mentale: true }
};

/* -------------------------------------------- */
/*  Compétences                                 */
/*  metier : compétence de métier (•)           */
/*  cc     : compétence de commandement         */
/*  carac  : caractéristique proposée par défaut */
/* -------------------------------------------- */

PN2.skillCategories = {
  connaissances: "Compétences de connaissances",
  techniques: "Compétences techniques",
  maritimes: "Compétences maritimes",
  physiques: "Compétences physiques",
  sociales: "Compétences sociales",
  combat: "Compétences de combat"
};

PN2.skills = {
  // Connaissances
  balistique: { label: "Balistique", cat: "connaissances", metier: true, cc: true, carac: "per" },
  cartographie: { label: "Cartographie", cat: "connaissances", metier: true, carac: "eru" },
  commerce: { label: "Commerce", cat: "connaissances", carac: "eru" },
  droit: { label: "Droit", cat: "connaissances", metier: true, carac: "eru", group: "Connaissance spécialisée" },
  geographie: { label: "Géographie", cat: "connaissances", carac: "eru", group: "Connaissance spécialisée" },
  histoire: { label: "Histoire", cat: "connaissances", carac: "eru", group: "Connaissance spécialisée" },
  herboristerie: { label: "Herboristerie", cat: "connaissances", metier: true, carac: "eru" },
  ingenierieNavale: { label: "Ingénierie navale", cat: "connaissances", metier: true, carac: "eru" },
  intendance: { label: "Intendance", cat: "connaissances", metier: true, carac: "eru" },
  lireEcrire: { label: "Lire/Écrire", cat: "connaissances", metier: true, carac: "eru" },
  medecine: { label: "Médecine", cat: "connaissances", metier: true, carac: "eru" },
  sciences: { label: "Sciences", cat: "connaissances", metier: true, carac: "eru" },
  tactique: { label: "Tactique", cat: "connaissances", cc: true, carac: "eru" },
  // Techniques
  pointage: { label: "Pointage de pièces", cat: "techniques", cc: true, carac: "per", group: "Artillerie" },
  recharge: { label: "Recharge de pièces", cat: "techniques", cc: true, carac: "for", group: "Artillerie" },
  calfatage: { label: "Calfatage", cat: "techniques", metier: true, carac: "adr", group: "Artisanat" },
  charpenterie: { label: "Charpenterie", cat: "techniques", metier: true, carac: "adr", group: "Artisanat" },
  voilerie: { label: "Voilerie", cat: "techniques", metier: true, carac: "adr", group: "Artisanat" },
  cuisine: { label: "Cuisine", cat: "techniques", carac: "per", group: "Artisanat" },
  chasse: { label: "Chasse", cat: "techniques", carac: "per" },
  chirurgie: { label: "Chirurgie", cat: "techniques", metier: true, carac: "adr" },
  dressage: { label: "Dressage", cat: "techniques", carac: "cha" },
  premiersSoins: { label: "Premiers soins", cat: "techniques", carac: "adr" },
  // Maritimes
  connNautiques: { label: "Connaissances nautiques", cat: "maritimes", metier: true, cc: true, carac: "eru" },
  connNavires: { label: "Connaissance des navires", cat: "maritimes", carac: "eru" },
  connSignalisation: { label: "Connaissance de la signalisation", cat: "maritimes", metier: true, carac: "eru" },
  hydrographie: { label: "Hydrographie", cat: "maritimes", metier: true, cc: true, carac: "per" },
  navigation: { label: "Navigation", cat: "maritimes", metier: true, carac: "eru" },
  peche: { label: "Pêche", cat: "maritimes", carac: "ada" },
  pratiqueNautique: { label: "Pratique nautique", cat: "maritimes", cc: true, carac: "adr" },
  timonerie: { label: "Timonerie", cat: "maritimes", cc: true, carac: "per" },
  // Physiques
  acrobatie: { label: "Acrobatie/Escalade", cat: "physiques", carac: "adr" },
  athletisme: { label: "Athlétisme", cat: "physiques", carac: "res" },
  discretion: { label: "Discrétion", cat: "physiques", cc: true, carac: "adr" },
  equitation: { label: "Équitation", cat: "physiques", carac: "adr" },
  larcins: { label: "Larcins", cat: "physiques", metier: true, carac: "adr" },
  natation: { label: "Natation", cat: "physiques", carac: "res" },
  survie: { label: "Survie", cat: "physiques", metier: true, carac: "ada" },
  vigilance: { label: "Vigilance", cat: "physiques", cc: true, carac: "per" },
  // Sociales
  comedie: { label: "Comédie", cat: "sociales", carac: "cha" },
  empathie: { label: "Empathie", cat: "sociales", cc: true, carac: "per" },
  enseignement: { label: "Enseignement", cat: "sociales", cc: true, carac: "exp" },
  etiquette: { label: "Étiquette", cat: "sociales", metier: true, carac: "cha" },
  intimidation: { label: "Intimidation", cat: "sociales", cc: true, carac: "cha" },
  jeu: { label: "Jeu", cat: "sociales", carac: "ada" },
  meneurHommes: { label: "Meneur d'hommes", cat: "sociales", cc: true, carac: "cha" },
  persuasion: { label: "Persuasion", cat: "sociales", cc: true, carac: "exp" },
  politique: { label: "Politique", cat: "sociales", metier: true, carac: "eru" },
  seduction: { label: "Séduction", cat: "sociales", carac: "cha" },
  // Combat
  mousquet: { label: "Mousquet", cat: "combat", carac: "per", group: "Armes à feu", armeFeu: true },
  pistolet: { label: "Pistolet", cat: "combat", carac: "per", group: "Armes à feu", armeFeu: true },
  grenade: { label: "Grenade", cat: "combat", carac: "adr", group: "Armes à feu", armeFeu: true },
  mainsNues: { label: "Combat à mains nues", cat: "combat", carac: "for" },
  escrime: { label: "Escrime", cat: "combat", metier: true, carac: "ada" },
  esquive: { label: "Esquive", cat: "combat", carac: "ada" }
};

/**
 * Groupes de compétences « à spécialité » : chaque personnage peut ajouter
 * autant d'entrées qu'il le souhaite (ex. Armes blanches : Rapière).
 */
PN2.specGroups = {
  connSpe: { label: "Connaissance spécialisée", cat: "connaissances", carac: "eru", metierDefaut: false },
  religion: { label: "Religion", cat: "connaissances", carac: "eru", metierDefaut: false },
  art: { label: "Art", cat: "techniques", carac: "adr", metierDefaut: true },
  artisanat: { label: "Artisanat", cat: "techniques", carac: "adr", metierDefaut: false },
  connColons: { label: "Connaissance des colons/indigènes", cat: "sociales", carac: "eru", metierDefaut: false },
  connMarins: { label: "Connaissance des marins", cat: "sociales", carac: "eru", metierDefaut: false },
  langues: { label: "Langues étrangères", cat: "sociales", carac: "exp", metierDefaut: false },
  armesBlanches: { label: "Armes blanches", cat: "combat", carac: "adr", metierDefaut: false },
  armesJet: { label: "Armes de jet/trait", cat: "combat", carac: "per", metierDefaut: false }
};

/* -------------------------------------------- */
/*  Escrime (L'Art de l'escrime)                */
/* -------------------------------------------- */

PN2.escrimeTypes = {
  epee: { label: "Escrime à l'épée seule", opportunites: ["1", "2", "5", "0"], arme: "Épée (rapière, épée courte)" },
  dague: { label: "Escrime à l'arme et à la dague", opportunites: ["1", "2", "5", "0"], arme: "Arme et dague" },
  deuxarmes: { label: "Escrime à deux armes", opportunites: ["1", "2", "5", "0"], arme: "Deux armes" },
  sabre: { label: "Escrime au sabre", opportunites: ["1", "5", "0"], arme: "Sabre" },
  baionnette: { label: "Escrime à la baïonnette", opportunites: ["1", "5", "0"], arme: "Baïonnette" },
  hache: { label: "Escrime à la hache", opportunites: ["1", "5", "0"], arme: "Hache" },
  pont: { label: "Combat de pont", opportunites: ["3", "6", "9"], arme: "Toutes armes" },
  destreza: { label: "Destreza", opportunites: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], arme: "Rapière ou dague" },
  botte: { label: "Botte secrète", opportunites: ["1", "2", "5", "0"], arme: "Épée" }
};

/** Compatibilités entre types d'escrime (malus -1 si combat de pont associé). */
PN2.escrimeCompat = {
  epee: ["dague", "deuxarmes", "pont", "botte"],
  sabre: ["dague", "deuxarmes", "pont"],
  baionnette: [],
  hache: ["pont"],
  pont: ["epee", "dague", "deuxarmes", "sabre", "hache"],
  destreza: []
};

/** Catégories d'armes pour l'adéquation des manœuvres. */
PN2.escrimeArmes = {
  epee: "Épée",
  sabre: "Sabre",
  hache: "Hache",
  baionnette: "Baïonnette",
  dague: "Dague",
  autre: "Autre"
};

/** Points d'escrime disponibles selon le niveau (prédilection / autre). */
PN2.pointsEscrime = {
  predilection: [0, 2, 5, 9, 14, 20, 27, 35],
  autre: [0, 1, 3, 6, 10, 15, 21, 28]
};

/* -------------------------------------------- */
/*  Tables                                      */
/* -------------------------------------------- */

/** Modificateur de dégâts selon la Force (index = valeur). */
PN2.mdFor = { 2: -2, 3: -1, 4: 0, 5: 0, 6: 1, 7: 2, 8: 3, 9: 4 };
/** Modificateur de dégâts selon l'Adresse. */
PN2.mdAdr = { 2: -1, 3: -1, 4: 0, 5: 0, 6: 0, 7: 1, 8: 1, 9: 2 };

/** Niveaux de blessure. */
PN2.blessures = [
  { key: "L", label: "Légère", malus: 0 },
  { key: "S", label: "Sérieuse", malus: -1 },
  { key: "G", label: "Grave", malus: -2 },
  { key: "Cr", label: "Critique", malus: -4 },
  { key: "Co", label: "Coma", malus: null },
  { key: "M", label: "Mortelle", malus: null }
];

PN2.etatsSante = ["Indemne", "Légère", "Sérieuse", "Grave", "Critique", "Coma", "Mortelle"];
PN2.malusSante = [0, 0, -1, -2, -4, null, null];

/** Nombre de cases de blessure par localisation selon la Résistance (2 à 9). */
PN2.casesBlessure = {
  L: [0, 0, 0, 1, 2, 2, 2, 2],
  S: [0, 0, 1, 1, 1, 2, 2, 2],
  G: [0, 1, 1, 1, 1, 1, 2, 2],
  Cr: [1, 1, 1, 1, 1, 1, 1, 2]
};

/** Localisations (D6). */
PN2.localisations = {
  1: { key: "jambeG", label: "Jambe gauche" },
  2: { key: "jambeD", label: "Jambe droite" },
  3: { key: "torse", label: "Torse" },
  4: { key: "brasG", label: "Bras gauche" },
  5: { key: "brasD", label: "Bras droit" },
  6: { key: "tete", label: "Tête" }
};
PN2.locKeys = ["jambeG", "jambeD", "torse", "brasG", "brasD", "tete"];
PN2.locLabels = Object.fromEntries(Object.values(PN2.localisations).map(l => [l.key, l.label]));

/** Modificateurs de difficulté (sur la Facilité). */
PN2.difficultes = {
  "6": "Évident (+6)",
  "4": "Routinier (+4)",
  "3": "Très facile (+3)",
  "2": "Facile (+2)",
  "1": "Assez facile (+1)",
  "0": "Normal (+0)",
  "-1": "Assez difficile (-1)",
  "-2": "Difficile (-2)",
  "-3": "Très difficile (-3)",
  "-4": "Presque impossible (-4)",
  "-6": "Impossible (-6)"
};

/** Marges de réussite. */
PN2.marges = [
  { min: 8, label: "Réussite légendaire" },
  { min: 5, label: "Réussite extraordinaire" },
  { min: 3, label: "Excellente réussite" },
  { min: 2, label: "Bonne réussite" },
  { min: 1, label: "Réussite de justesse" },
  { min: 0, label: "Échec" }
];

/** Valeurs de commandement. */
PN2.commandement = {
  capitaine: { label: "Capitaine", caracs: ["cha", "eru"] },
  second: { label: "Second", caracs: ["ada", "exp"] },
  canonnier: { label: "Canonnier", caracs: ["per", "exp"] },
  quartierMaitre: { label: "Quartier-maître", caracs: ["cha", "per"] },
  maitreEquipage: { label: "Maître d'équipage", caracs: ["adr", "exp"] },
  maitreCanonnier: { label: "Maître canonnier", caracs: ["per", "for"] }
};

/** Postures de combat (L'Art de l'escrime). */
PN2.postures = {
  attentive: "Attentive",
  offensive: "Offensive",
  defensive: "Défensive"
};

/** Tailles d'armes (allonge). */
PN2.taillesArme = { courte: "Courte", longue: "Longue", tresLongue: "Très longue" };

PN2.qualitesArme = {
  mauvaise: "Mauvaise (-1 att., long feu D6)",
  mediocre: "Médiocre (long feu D10)",
  normale: "Normale (long feu D12)",
  exceptionnelle: "Exceptionnelle (long feu D20)"
};
PN2.deLongFeu = { mauvaise: "1d6", mediocre: "1d10", normale: "1d12", exceptionnelle: "1d20" };

/* -------------------------------------------- */
/*  Monnaies (La Révolte, p. 287-289)           */
/*  valeur = équivalent en pièces de huit       */
/*  compte = monnaie d'échange (pas de pièce)   */
/* -------------------------------------------- */

PN2.monnaies = {
  doublon: { label: "Doublon", pays: "Espagne", valeur: 2 },
  reale: { label: "Réal", pays: "Espagne", valeur: 0.125 },
  maravedi: { label: "Maravédi", pays: "Espagne", valeur: 0.0035 },
  pistole: { label: "Pistole", pays: "Espagne", valeur: 4, compte: true },
  louis: { label: "Louis d'or", pays: "France", valeur: 12 },
  ecu: { label: "Écu d'argent", pays: "France", valeur: 1.5 },
  livreTournois: { label: "Livre tournois", pays: "France", valeur: 0.5, compte: true },
  sol: { label: "Sol", pays: "France", valeur: 0.025 },
  denier: { label: "Denier", pays: "France", valeur: 0.002 },
  guinee: { label: "Guinée", pays: "Angleterre", valeur: 6.5 },
  livreSterling: { label: "Livre sterling", pays: "Angleterre", valeur: 6, compte: true },
  couronne: { label: "Couronne (crown)", pays: "Angleterre", valeur: 1.5 },
  shilling: { label: "Shilling", pays: "Angleterre", valeur: 0.3 },
  penny: { label: "Penny", pays: "Angleterre", valeur: 0.025 },
  florin: { label: "Florin", pays: "Hollande", valeur: 0.5 },
  stiver: { label: "Stiver", pays: "Hollande", valeur: 0.025 },
  moidore: { label: "Moïdore", pays: "Portugal", valeur: 7.5 },
  cruzade: { label: "Nouvelle cruzade", pays: "Portugal", valeur: 0.75 }
};

/** Cours du marché pour les marchandises. */
PN2.cours = { penurie: "Pénurie", normal: "Normal", exces: "Excès" };

/* -------------------------------------------- */
/*  Gloire & Infamie                            */
/* -------------------------------------------- */

/** Seuils de score (identiques pour la Gloire et l'Infamie). */
PN2.seuilsReputation = [0, 50, 100, 150, 200, 300, 500, 1000, 2000, 5000, 10000];
PN2.qualifGloire = ["Parfait inconnu", "Héros local", "Aventurier notable", "Homme de l'art", "Héros",
  "Grand homme", "Idole du peuple", "Né des flots", "Maître des sept mers", "Invincible", "Légende vivante"];
PN2.qualifInfamie = ["Brave type", "Petite frappe", "Brute", "Terreur du village", "Tueur de sang-froid",
  "Sans merci", "Psychopathe sanguinaire", "Effroyable", "Terrifiant", "Terreur des sept mers", "Diable en personne"];

/* -------------------------------------------- */
/*  Navires                                     */
/* -------------------------------------------- */

PN2.taillesNavire = {
  Chaloupe: { rang: 0, modTir: -3, rotation: "3/8 ou 2/6" },
  Sloop: { rang: 1, modTir: -2, rotation: "2/8 ou 2/6" },
  "Goélette": { rang: 2, modTir: -1, rotation: "2/8 ou 1/6" },
  "Frégate": { rang: 3, modTir: 0, rotation: "1/8 ou 1/6" },
  "Vaisseau de ligne": { rang: 4, modTir: 1, rotation: "1/8 ou 1/6" },
  "Trois-ponts": { rang: 5, modTir: 2, rotation: "1/8 ou 1/6" }
};

PN2.etatsNavire = [
  { key: "ok", label: "OK", malus: 0, frac: 1 },
  { key: "leger", label: "Léger", malus: 0, frac: 4 / 5 },
  { key: "serieux", label: "Sérieux", malus: -1, frac: 3 / 5 },
  { key: "grave", label: "Grave", malus: -2, frac: 2 / 5 },
  { key: "critique", label: "Critique", malus: -4, frac: 1 / 5 },
  { key: "ponton", label: "Ponton / Ravagé", malus: -6, frac: 0 },
  { key: "coule", label: "Coulé", malus: -6, frac: -1 }
];

PN2.voilures = {
  "-2": { label: "Très sous-toilé", vit: -2, man: 2 },
  "-1": { label: "Sous-toilé", vit: -1, man: 1 },
  "0": { label: "Normale", vit: 0, man: 0 },
  "1": { label: "Surtoilé (gros temps)", vit: 1, man: -2 },
  "2": { label: "Très surtoilé (gros temps)", vit: 2, man: -4 }
};

PN2.vents = {
  "-2": { label: "Calme plat", vit: 0, man: 0, special: "Avirons seulement" },
  "-1": { label: "Petit temps", vit: -1, man: 0, special: "Ne peut être surtoilé" },
  "0": { label: "Établi", vit: 0, man: 0, special: "" },
  "1": { label: "Frais", vit: 1, man: -1, special: "Test de gros temps" },
  "2": { label: "Grand frais", vit: 2, man: -3, special: "Test de gros temps" },
  "3": { label: "Tempête", vit: 3, man: -4, special: "Test de gros temps, ne peut être sous-toilé" },
  "4": { label: "Ouragan", vit: 4, man: -6, special: "Test de gros temps, ne peut être sous-toilé" }
};

PN2.allures = {
  pres: "Près",
  largue: "Largue",
  grandLargue: "Grand largue",
  ventArriere: "Vent arrière"
};

/** Localisations d'un navire. */
PN2.locNavire = {
  mature: { artimon: "Artimon", grandMat: "Grand mât", misaine: "Misaine" },
  coque: { poupe: "Poupe", babord: "Entrepont bâbord", tribord: "Entrepont tribord", proue: "Proue" }
};

PN2.munitions = {
  boulet: "Boulets",
  rame: "Boulets ramés",
  rouge: "Boulets rouges",
  mitraille: "Mitraille"
};

PN2.positionsBatterie = {
  "bordée": "Bordée",
  chasse: "Chasse",
  fuite: "Fuite",
  muraille: "Muraille / pierriers"
};

/** Portées (m) selon le type de canon et la munition. */
PN2.portees = {
  "bordée": { boulet: 300, rouge: 300, rame: 150, mitraille: 50 },
  chasse: { boulet: 400, rouge: 400, rame: 200, mitraille: 50 },
  fuite: { boulet: 400, rouge: 400, rame: 200, mitraille: 50 },
  muraille: { boulet: 50, rouge: 50, rame: 50, mitraille: 50 }
};

/** Compétences de groupe de l'équipage. */
PN2.groupSkills = {
  manoeuvre: {
    label: "Manœuvre",
    eff: [["capitaine", "hydrographie"], ["second", "connNautiques"], ["maitreEquipage", "pratiqueNautique"], ["quartierMaitre", "timonerie"]],
    fac: [["capitaine", 1], ["second", 1], ["maitreEquipage", 1], ["quartierMaitre", 1]]
  },
  ruse: {
    label: "Ruse",
    eff: [["capitaine", "meneurHommes"], ["second", "tactique"], ["canonnier", "vigilance"], ["quartierMaitre", "discretion"]],
    fac: [["capitaine", 1], ["second", 1], ["canonnier", 1], ["quartierMaitre", 1]]
  },
  canonnade: {
    label: "Canonnade",
    eff: [["capitaine", "balistique"], ["second", "meneurHommes"], ["canonnier", "balistique"], ["maitreCanonnier", "pointage"]],
    fac: [["capitaine", 1], ["second", 1], ["canonnier", 1], ["maitreCanonnier", 1]]
  },
  recharge: {
    label: "Recharge",
    eff: [["canonnier", "meneurHommes"], ["maitreCanonnier", "recharge"], ["maitreEquipage", "intimidation"], ["quartierMaitre", "connNautiques"]],
    fac: [["canonnier", 1], ["maitreCanonnier", 1], ["maitreEquipage", 1], ["quartierMaitre", 1]]
  },
  combat: {
    label: "Combat",
    eff: [["capitaine", "meneurHommes"], ["capitaine", "tactique"], ["second", "meneurHommes"], ["canonnier", "meneurHommes"]],
    fac: [["capitaine", 2], ["second", 1], ["canonnier", 1]]
  },
  tir: {
    label: "Tir",
    eff: [["capitaine", "meneurHommes"], ["capitaine", "tactique"], ["second", "meneurHommes"], ["canonnier", "meneurHommes"]],
    fac: [["capitaine", 2], ["second", 1], ["canonnier", 1]]
  }
};

/** Cases de santé de l'équipage selon (Modif. Combat + Modif. Recharge). */
PN2.casesEquipage = {
  "-4": [0, 0, 0, 0], "-3": [0, 0, 1, 1], "-2": [0, 1, 1, 1], "-1": [0, 1, 1, 1],
  "0": [1, 1, 1, 1], "1": [2, 1, 1, 1], "2": [2, 2, 1, 1], "3": [2, 2, 2, 1], "4": [2, 2, 2, 2]
};

/** Postes de gestion (membres essentiels) et compétences associées. */
PN2.postesGestion = {
  capitaineG: { label: "Capitaine", skills: ["commerce", "navigation"] },
  pilote: { label: "Pilote", skills: ["cartographie", "hydrographie", "geographie"] },
  calfat: { label: "Calfat", skills: ["calfatage", "connNavires", "ingenierieNavale"] },
  charpentier: { label: "Charpentier", skills: ["charpenterie", "connNavires", "ingenierieNavale"] },
  voilier: { label: "Voilier", skills: ["voilerie", "connNavires", "ingenierieNavale"] },
  chirurgien: { label: "Chirurgien", skills: ["chirurgie", "medecine", "herboristerie"] },
  quartierMaitreG: { label: "Quartier-maître", skills: ["empathie", "enseignement", "persuasion"] },
  cambusier: { label: "Cambusier / Coq", skills: ["cuisine", "intendance"] },
  grenadier: { label: "Grenadier", skills: ["grenade", "mousquet"] },
  vigie: { label: "Vigie", skills: ["mousquet", "vigilance"] }
};

/** Table des Actions non numériques (durées en Unités de temps). */
PN2.actionsNonNum = {
  colonnes: ["Catastrophe", "Échec", "1", "2", "3", "4", "6", "8"],
  longue: ["8", "7", "6", "5", "4", "3", "2", "1"],
  courte: ["5", "4", "3", "2", "1", "1", "-1 UT", "-1 UT"],
  effets: ["0", "-1 UT", "1", "2", "3", "4", "6", "+1 UT"]
};

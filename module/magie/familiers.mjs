/**
 * Familiers de l'Arbre inversé (Entre ciel et terre, p. 163-169) : tables et règles pures, sans Foundry.
 * Règle maison : pas de cartes. Les Lames droites réservées du livre sont des Succès sacrés.
 */

export const RANGS_FAMILIER = [
  { cle: "esprit", label: "Esprit", min: 1, max: 3 },
  { cle: "petit", label: "Petit démon", min: 4, max: 6 },
  { cle: "demon", label: "Démon", min: 7, max: 9 },
  { cle: "grand", label: "Grand démon", min: 10, max: 12 },
  { cle: "puissant", label: "Puissant démon", min: 13, max: Infinity }
];

/** Catégories : plages du D20 + modificateur de violence du démon (−2 à +2). */
export const CATEGORIES_FAMILIER = {
  nephilim: {
    nom: "Nephilim", min: -Infinity, max: 4, element: "les voluptueux, associés aux Ondins (eau)",
    forme: "Âmes immortelles de géants nés d'anges déchus et de femmes, en quête d'un corps d'emprunt.",
    caractere: "Cherche à revivre les sensations de son corps perdu ; aime attirer ses victimes dans l'eau pour les noyer.",
    pouvoirs: [
      "Grande taille : voit ce que verrait quelqu'un de 3 m.",
      "Attirance contre nature : au toucher, crée une attirance « contre nature ».",
      "Espion dans un corps : entre dans une personne et entend ce qu'elle dit, voit ce qu'elle fait (pas ses pensées).",
      "Contrôle d'un corps : expulse l'âme d'une personne et prend sa place ; le corps reste ensuite en stase, sans souvenirs.",
      "Lycanthropie : fusionne avec le Mage Noir en grand loup bipède (For +2, Adr +2, Rés +3, Per +2, Ada +1 ; Esquive, Athlétisme, Discrétion, Vigilance, Combat à mains nues +2D, Intimidation +3D)."
    ],
    danger: "Peut refuser d'obéir au moment crucial pour revivre une sensation perdue."
  },
  rephaim: {
    nom: "Rephaïm", min: 5, max: 8, element: "les lâches, associés aux Sylphes (air)",
    forme: "Esprits d'humains morts, sans corps (prisonnier du Shéol).",
    caractere: "Aigris et méchants : aiment effrayer, nuire, provoquer des accidents, siffler des obscénités aux oreilles.",
    pouvoirs: [
      "Esprit frappeur : fait voler les petits objets d'une pièce ; Test de Pouvoir ou sortir (sauf le Mage Noir).",
      "Brise maudite : une brise qui n'éteint que les flammes.",
      "Oreilles indiscrètes : en courant d'air, rapporte ce que disent les gens.",
      "Télékinésie : soulève et manipule grossièrement un objet (pas de mécanismes).",
      "Forme fantomatique : en un tour, allège le Mage Noir jusqu'à le rendre intangible."
    ],
    danger: "Bruits, chutes d'objets et frayeurs au mauvais moment."
  },
  anakim: {
    nom: "Anakim", min: 9, max: 12, element: "les révoltés, associés aux Gnomes (terre)",
    forme: "Humain gigantesque (au moins 2 m) au physique terrifiant ; Goliath descendait des Anakim.",
    caractere: "Pervers et en révolte contre les religions du livre ; aime écraser les autres.",
    pouvoirs: [
      "Gigantisme terrifiant : le Mage Noir paraît immense (Intimidation 4 F 8).",
      "Révolte : instille un profond sentiment de révolte.",
      "Fracassement : brise un objet, une porte, un pan de mur ou de toit, une fois par semaine au plus.",
      "Force du géant : confère au Mage Noir une Force de 9.",
      "Disparition dans la terre : engloutit le Mage Noir avec lui (il n'a plus besoin de respirer) jusqu'à ce qu'il veuille remonter."
    ],
    danger: "Sabote les Rituels invoquant un Ange : le Mage Noir lance 1d6 d10 sacrés de plus, dont seules les Colères comptent."
  },
  amalekite: {
    nom: "Amalekite", min: 13, max: 16, element: "les agresseurs, associés à la Force première (son)",
    forme: "Fait de vibrations, de son et de voix.",
    caractere: "Agressif envers tout ce qui contrarie le Mage Noir ; vindicatif et patient ; brise les objets fragiles par vibrations.",
    pouvoirs: [
      "Harcèlement : bruits, menaces, voix qui complotent ; la victime (puis son entourage) croit devenir folle.",
      "Subversion de la Création : altère subtilement la matière (corde rongée, canon déformé qui explose, mécanisme hors d'usage).",
      "Cri de la Mort : cri d'un mourant, ou terreur infligeant un malus de facilité égal à un Test d'Intimidation (Cha) du Mage Noir.",
      "Invisibilité : rend la Cible invisible et inaudible.",
      "Verbe créateur dévoyé : crée en 1 h 1 kg d'objets finis (mécanismes, sans explosif) ou 10 kg d'objets grossiers."
    ],
    danger: "Si le Mage Noir se tourne davantage vers l'Arbre de vie, il prépare patiemment sa trahison et sa mort."
  },
  geburim: {
    nom: "Geburim", min: 17, max: Infinity, element: "les violents, associés à la Salamandre (feu)",
    forme: "Prend en général forme humaine pour rester visible.",
    caractere: "Homme d'action qui déteste l'inertie et adore la destruction par le feu.",
    pouvoirs: [
      "Chaleur : dégage la chaleur d'un poêle, sans blesser.",
      "Enflammer les esprits : attise la colère d'une personne jusqu'à la rage.",
      "Projection de flammes : fait exploser un feu et projette braises et flammes (3 F 6 pour toucher, dégâts +3).",
      "Le feu de l'action : +1 Action par tour au Mage Noir.",
      "Incendie : enflamme une matière inflammable (une minute pour une poutre)."
    ],
    danger: "Si le Mage Noir refuse trop longtemps la violence, il le prévient une fois, puis déchaîne ses pouvoirs (ne le blesse que par inadvertance)."
  },
  damne: {
    nom: "Être spirituel damné", min: 17, max: Infinity, element: "un des êtres spirituels qui ont créé le monde depuis le chaos",
    forme: "Être spirituel déchu.", caractere: "Plus fiable que les Reschaïm.",
    pouvoirs: [],
    danger: "Aucun, sauf s'il est maltraité ou moqué."
  }
};

/** Êtres spirituels damnés : D10 (10 : c'est un Reschaïm, relancer le D20 en ignorant ce résultat). */
export const ETRES_DAMNES = [
  "Séraphin déchu (ordre de Belzébuth) — la Vallée de la Mort : la victime est maudite, Pouvoir −4 tant qu'il reste sur elle.",
  "Chérubin déchu (Python) — la Vallée de l'Oubli : manipule et pervertit les pensées.",
  "Trône déchu (Bélial) — la Vallée du Sommeil : isole une personne de son groupe par brimades et mépris.",
  "Domination déchue (Asmodel) — les Portes de la Mort : la victime ne vit plus que par les sept péchés capitaux.",
  "Puissance déchue (Shatan) — l'Ombre de la Mort : un élément (feu, vent, eau, sol meuble) menace la victime (Test d'Athlétisme (Rés) par tour, sinon 2 points de dégâts ; ou Test de Pouvoir, sinon pétrifiée).",
  "Vertu déchue (Meririm) — le Puits de l'Abîme : mensonge invétéré, ou toxicité inattendue d'un minéral.",
  "Principauté déchue (Abbadon) — l'Ordure et la Boue : la végétation enchevêtre et engloutit (Test d'Athlétisme (For) par tour, sinon 2 points de dégâts ; ou Test de Pouvoir, sinon pétrifiée).",
  "Archange déchu (Astharoth) — la Perdition : ordonne à un animal de menacer ou d'attaquer la victime.",
  "Ange déchu (Mammon) — la Fosse : la victime transgresse les Commandements comme s'ils n'existaient pas."
];

/** Capacités spéciales : D100 (99-100 : relancer deux fois). */
export const CAPACITES_FAMILIER = [
  [1, 3, "Animal", "forme animale visible et tangible"],
  [4, 6, "Bon démon", "n'utilise pas ses pouvoirs pour faire souffrir"],
  [7, 9, "Bourse pleine", "l'argent dépensé revient le lendemain à 8 h dans la bourse du Mage Noir (les vendeurs sont floués)"],
  [10, 12, "Diablotin", "tapote l'oreille droite pour ce qui va dans le sens de l'Arbre de vie, tire la gauche pour l'Arbre inversé"],
  [13, 14, "Dobie", "spectre d'un ancêtre du Mage Noir"],
  [15, 17, "Enfermable", "peut être enfermé dans une boîte ou une lampe"],
  [18, 19, "Érudit", "Religion (Kabbale) et Sciences Assez efficaces (+1D)"],
  [20, 21, "Érudit", "Religion (Kabbale) et Sciences Efficaces (+2D)"],
  [22, 24, "Espiègle", "joue des tours sans conséquence, orientables vers d'autres victimes"],
  [25, 27, "Extatique", "en suçant un peu de sang (1 point de dégâts), fait vivre une extase ; addiction après 3 succions"],
  [28, 30, "Fantasme", "ne communique qu'en rêve"],
  [31, 32, "Héritage", "transmissible au fils aîné du Mage Noir"],
  [33, 35, "Horaire", "ne se montre qu'à une heure précise, pour la Durée du Pouvoir"],
  [36, 38, "Horloger", "fait tourner l'horloge dans le sens et à la vitesse qui lui plaisent"],
  [39, 41, "Infernal", "+1 Faveur aux Rituels de l'Arbre inversé"],
  [42, 44, "Mandragore", "choyé comme un enfant, double la vitesse de guérison des blessures et des maladies"],
  [45, 47, "Monsieur le Maître", "impose son rythme (sinon part un mois) ; indique les chemins les plus courts"],
  [48, 50, "Monstre", "Intimidation 4 F 8 quand il se montre"],
  [51, 53, "Opulent", "change temporairement vaisselle et mets simples en vaisselle précieuse et mets somptueux"],
  [54, 56, "Oracle", "répond par oui ou non à une question par semaine"],
  [57, 59, "Partageur", "peut assister un autre personnage consentant ; ne compte pas dans le maximum"],
  [60, 62, "Pied léger", "le Mage Noir court six fois plus vite qu'un cheval"],
  [63, 65, "Sage", "Perception +1 (permanent)"],
  [66, 68, "Sage", "Adaptabilité +1 (permanent)"],
  [69, 71, "Sage", "Érudition +2 (permanent)"],
  [72, 74, "Saugrenu", "convainc le Mage Noir d'idées farfelues"],
  [75, 77, "Savant", "compétence de connaissance substituable au Niveau 1"],
  [78, 80, "Savant", "compétence de connaissance substituable au Niveau 2"],
  [81, 83, "Savant", "compétence de connaissance substituable au Niveau 3"],
  [84, 86, "Savant", "compétence de connaissance substituable au Niveau 4"],
  [87, 89, "Savant", "compétence de connaissance substituable au Niveau 5"],
  [90, 92, "Servant", "rend les services d'un servant"],
  [93, 95, "Vampyre", "boit chaque soir un peu du sang du Mage Noir (1 point de dégâts dans un membre)"],
  [96, 98, "Ventriloque", "projette sa voix ou celle du Mage Noir dans la Portée du Pouvoir"]
];

/** Modificateur de démon pour la Fiabilité. */
export const REPUTATIONS_DEMON = {
  rare: { label: "N'offre pas de familier d'habitude (−5)", mod: -5 },
  normal: { label: "Ordinaire (0)", mod: 0 },
  fiable: { label: "Réputé donner des familiers fiables (+2)", mod: 2 }
};

/**
 * Catégorie d'après D20 + modificateur. De 17 à 22 (et au-delà) le livre donne deux catégories, Geburim et
 * Être spirituel damné : `choixHaut` tranche (le MJ choisit).
 * @returns {string} clé de CATEGORIES_FAMILIER
 */
export function categorieFamilier(total, choixHaut = "geburim") {
  const t = Number(total) || 0;
  if (t >= 17) return choixHaut === "damne" ? "damne" : "geburim";
  return ["nephilim", "rephaim", "anakim", "amalekite"].find(k => t <= CATEGORIES_FAMILIER[k].max);
}

/** Puissance du familier : Puissance du Pouvoir d'invocation + Succès sacrés réservés. */
export function puissanceFamilier(puissanceInvocation, succesReserves = 0) {
  return Math.max(1, (Number(puissanceInvocation) || 0) + Math.max(0, Number(succesReserves) || 0));
}

/** Index du rang (0 : Esprit … 4 : Puissant démon) selon la Puissance. */
export function rangFamilier(puissance) {
  const p = Math.max(1, Number(puissance) || 1);
  return RANGS_FAMILIER.findIndex(r => p >= r.min && p <= r.max);
}

/** Capacité spéciale pour un résultat de D100, ou null pour « relancer deux fois » (99-100). */
export function capaciteFamilier(d100) {
  const v = Number(d100);
  const c = CAPACITES_FAMILIER.find(([min, max]) => v >= min && v <= max);
  return c ? { nom: c[2], effet: c[3], de: v } : null;
}

/**
 * Tire les capacités spéciales : un D100, et deux de plus à chaque 99-100 (doublons ignorés).
 * @param {() => number} d100  lanceur de D100
 */
export function tirerCapacites(d100, limite = 10) {
  const out = [];
  let reste = 1;
  while (reste > 0 && limite-- > 0) {
    reste--;
    const v = d100();
    const c = capaciteFamilier(v);
    if (!c) { reste += 2; continue; }
    if (!out.some(x => x.nom === c.nom && x.effet === c.effet)) out.push(c);
  }
  return out;
}

/** Fiabilité : 1d10 + 1d6 − 3 + modificateur de démon. */
export function fiabiliteFamilier(d10, d6, modDemon = 0) {
  return (Number(d10) || 0) + (Number(d6) || 0) - 3 + (Number(modDemon) || 0);
}

/** Nombre maximal de familiers : moitié du Niveau en Religion (Kabbale), arrondie au supérieur. */
export function maxFamiliers(niveauKabbale) {
  return Math.ceil(Math.max(0, Number(niveauKabbale) || 0) / 2);
}

/**
 * Test d'obéissance (Test de Chance sur la Fiabilité, p. 169), modificateur de traitement de −2 à +2.
 * @returns {"obeit"|"tergiverse"|"refus"|"danger"}
 */
export function obeissanceFamilier(de, fiabilite, traitement = 0) {
  const d = Number(de);
  if (d === 10) return "danger";
  const chance = (Number(fiabilite) || 0) + Math.max(-2, Math.min(2, Number(traitement) || 0));
  if (d < chance) return "obeit";
  if (d === chance) return "tergiverse";
  return "refus";
}

export const OBEISSANCE = {
  obeit: "Le familier obéit.",
  tergiverse: "Le familier obéit, après un tour de tergiversations qui occupe aussi toutes les Actions du Mage Noir.",
  refus: "Le familier refuse : il n'utilisera pas ce Pouvoir ou cette Capacité aujourd'hui.",
  danger: "10 : le familier refuse, et le Mage Noir doit réussir un nouveau Test de Chance identique, sinon le danger du familier se réalise (maintenant ou plus tard)."
};

/**
 * Événements divins : Aléas, révélations (Le Mat) et Quêtes mystiques — règles pures, en d10 uniquement.
 * Ces tirages sont internes et indépendants : ils ne modifient jamais le résultat du d10 sacré.
 * Aucune dépendance à Foundry (testé sous Node).
 *
 * Références (Entre ciel et terre) :
 *  - Aléa : un par acte sacré, désigné par la première Lame ; Puissance = 1 + nombre de Lames de même sens
 *    tirées à la suite de la première (p. 95, 121) ; Impact selon la table des Pouvoirs (p. 100).
 *  - Le Mat : Rituel → Puissance = Lames droites tirées avant, plafond Foi/Connaissance des Mystères + 1 ;
 *    Transe → Puissance = Niveau de transe + 1 (p. 121) ; découverte par compulsion (p. 138, 141).
 *  - Quête mystique (en Transe) : le MJ jette 1D6 en secret ; si le prêtre obtient autant de Lames droites,
 *    il gagne une compulsion pour un Pouvoir de Puissance Niveau de transe + 1 (p. 138).
 */
import { MagieError, RESULTAT } from "./regles.mjs";

/* -------------------------------------------- */
/*  Tirages internes en d10                     */
/* -------------------------------------------- */

const d10 = v => {
  if (!Number.isInteger(v) || v < 1 || v > 10) throw new MagieError("d10-invalide", `Valeur de d10 invalide : ${v}.`);
  return v;
};

/**
 * Pourcentage avec deux d10 (dizaines, unités) : 0 et 0 donnent 100.
 * Le « 10 » d'un d10 vaut 0, comme sur un d100 classique.
 */
export function pourcentageD10(dizaines, unites) {
  const t = d10(dizaines) % 10;
  const u = d10(unites) % 10;
  const v = t * 10 + u;
  return v === 0 ? 100 : v;
}

/** Un test « sous un pourcentage » réussit si le pourcentage tiré est inférieur ou égal au seuil. */
export function testerPourcentage(dizaines, unites, seuil) {
  const tirage = pourcentageD10(dizaines, unites);
  return { tirage, declenche: Number(seuil) > 0 && tirage <= Number(seuil) };
}

/**
 * Tirage uniforme de 1 à `faces` (≤ 10) avec des d10 : on accepte 1..faces, on relance au-delà.
 * @param {number[]} valeurs  d10 lancés dans l'ordre
 * @returns {{resultat:number|null, utilises:number}}  null si aucune valeur acceptable (relancer encore)
 */
export function uniformeParD10(valeurs, faces = 6) {
  if (!Number.isInteger(faces) || faces < 1 || faces > 10) throw new MagieError("valeur-invalide", `Nombre de faces invalide : ${faces}.`);
  for (let i = 0; i < valeurs.length; i++) {
    if (d10(valeurs[i]) <= faces) return { resultat: valeurs[i], utilises: i + 1 };
  }
  return { resultat: null, utilises: valeurs.length };
}

/* -------------------------------------------- */
/*  Aléas                                       */
/* -------------------------------------------- */

/**
 * Sens et Puissance de l'Aléa d'après la suite initiale des d10 sacrés :
 * le premier résultat donne le sens (Succès = droit, Colère = renversé), la Puissance vaut
 * le nombre de résultats identiques consécutifs depuis le premier (lui compris).
 * `complete` est vrai dès que la suite est rompue ou que l'acte est terminé.
 */
export function puissanceAlea(lancers, { termine = false } = {}) {
  if (!lancers?.length) return { sens: null, puissance: 0, complete: termine };
  const premier = lancers[0].resultat;
  let n = 0;
  while (n < lancers.length && lancers[n].resultat === premier) n++;
  return { sens: premier === RESULTAT.SUCCES ? "droit" : "renverse", puissance: n, complete: termine || n < lancers.length };
}

/**
 * Un Aléa est-il applicable à cet acte ? Conditions facultatives de l'Aléa :
 * types d'acte, religion ou Voie (clés), sens (droit / renversé).
 */
export function aleaApplicable(alea, { typeActe, religion, voie, sens }) {
  const c = alea.conditions ?? {};
  if (c.typesActe?.length && !c.typesActe.includes(typeActe)) return false;
  if (alea.religion && alea.religion !== religion) return false;
  if (alea.voie && alea.voie !== voie) return false;
  if (c.sens && sens && c.sens !== sens) return false;
  return true;
}

/**
 * Choisit un Aléa parmi les Aléas applicables, au prorata de leur poids, avec un pourcentage tiré en d10.
 * @param {Array<{id:string, poids?:number}>} candidats
 * @param {number} tirage  1 à 100
 */
export function choisirAlea(candidats, tirage) {
  const liste = (candidats ?? []).filter(a => (a.poids ?? 1) > 0);
  if (!liste.length) return null;
  const total = liste.reduce((s, a) => s + (a.poids ?? 1), 0);
  const cible = ((Number(tirage) - 1) / 100) * total;
  let cumul = 0;
  for (const a of liste) {
    cumul += a.poids ?? 1;
    if (cible < cumul) return a;
  }
  return liste[liste.length - 1];
}

/* -------------------------------------------- */
/*  Révélations (Le Mat)                        */
/* -------------------------------------------- */

/**
 * Puissance du Pouvoir que la révélation permet de découvrir.
 * - Rituel : Succès obtenus avant la révélation, plafonnés à Foi/Connaissance des Mystères + 1.
 * - Transe : Niveau de transe au moment de la révélation + 1 (plafond 10).
 * Une Puissance de 0 signifie qu'aucun Pouvoir ne peut être découvert.
 */
export function puissanceRevelation({ typeActe, succesAvant = 0, valeurVoie = 0, niveau = 0 }, plafond = 10) {
  if (typeActe === "transe") return Math.min(plafond, niveau + 1);
  return Math.max(0, Math.min(succesAvant, valeurVoie + 1, plafond));
}

/* -------------------------------------------- */
/*  Examen des sollicitations                   */
/* -------------------------------------------- */

/** Numéros des lancers d'un acte pas encore examinés (reprise après une déconnexion du MJ). */
export function lancersAExaminer(etat, examines = []) {
  const vus = new Set(examines);
  return (etat?.lancers ?? []).filter(l => !vus.has(l.n)).map(l => l.n);
}

/**
 * Examine une sollicitation : déclenchement de l'Aléa (au premier lancer) et de la révélation.
 * Les valeurs des d10 internes sont fournies (le service les tire avec Foundry).
 * @param {object} etat       acte (état du moteur)
 * @param {object} lancer     lancer examiné
 * @param {object} des        { alea: [d10, d10], choixAlea: [d10, d10], revelation: [d10, d10] }
 * @param {object} cfg        { aleaMode, aleaProbabilite, revelationSeuil, candidatsAlea, valeurVoie }
 * @returns {{alea:object|null, revelation:object|null}}
 */
export function examinerSollicitation(etat, lancer, des, cfg) {
  const res = { alea: null, revelation: null };
  if (lancer.n === 1 && cfg.aleaMode !== "desactive") {
    const declenchement = cfg.aleaMode === "officiel"
      ? { tirage: null, declenche: true }
      : testerPourcentage(des.alea[0], des.alea[1], cfg.aleaProbabilite);
    if (declenchement.declenche) {
      const sens = lancer.resultat === RESULTAT.SUCCES ? "droit" : "renverse";
      const candidats = (cfg.candidatsAlea ?? []).filter(a => aleaApplicable(a, {
        typeActe: etat.type, religion: cfg.religion ?? null, voie: etat.voie?.cle ?? null, sens
      }));
      const tirageChoix = pourcentageD10(des.choixAlea[0], des.choixAlea[1]);
      const choisi = choisirAlea(candidats, tirageChoix);
      res.alea = {
        lancer: lancer.n, sens, tirage: declenchement.tirage, tirageChoix,
        aleaId: choisi?.id ?? null, aleaNom: choisi?.nom ?? null, statut: "en-attente"
      };
    }
  }
  if (Number(cfg.revelationSeuil) > 0) {
    const t = testerPourcentage(des.revelation[0], des.revelation[1], cfg.revelationSeuil);
    if (t.declenche) {
      const succesAvant = lancer.succesApres - lancer.dSucces;
      const puissance = puissanceRevelation({ typeActe: etat.type, succesAvant, valeurVoie: cfg.valeurVoie ?? 0, niveau: lancer.niveau ?? 0 });
      res.revelation = { lancer: lancer.n, tirage: t.tirage, typeActe: etat.type, succesAvant, niveau: lancer.niveau ?? null, puissance, statut: "en-attente" };
    }
  }
  return res;
}

/* -------------------------------------------- */
/*  Quête mystique                              */
/* -------------------------------------------- */

/**
 * Résultat d'une Quête mystique : réussite si les Succès obtenus pendant la Quête atteignent l'objectif secret.
 * @returns {{reussie:boolean, puissance:number}}  Puissance du Pouvoir objet de la compulsion
 */
export function resoudreQuete({ succes, objectif, niveau }, plafond = 10) {
  return { reussie: succes >= objectif, puissance: Math.min(plafond, niveau + 1) };
}

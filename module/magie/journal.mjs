/**
 * Historique des actes sacrés et journal des interventions du MJ — règles pures.
 *
 * - L'historique conserve un résumé de chaque acte terminé (l'acte lui-même est remplacé par le suivant).
 * - Le journal des interventions distingue les décisions narratives du MJ et les corrections administratives ;
 *   les actions normales du joueur figurent dans le journal propre à chaque acte.
 * - Rien de secret n'y est écrit en clair : une Puissance secrète n'est enregistrée que si le MJ l'a révélée.
 */
export const NATURE = Object.freeze({ JOUEUR: "joueur", NARRATIVE: "narrative", ADMINISTRATIVE: "administrative" });

/** Nombre maximal d'entrées conservées (les plus anciennes sont retirées au-delà). */
export const MAX_ENTREES = 200;

const RESULTATS = {
  suffisant: "Puissance atteinte", insuffisant: "Rituel insuffisant", rejet: "Rejet", sortie: "Sortie de Transe",
  interruption: "Interruption", administratif: "Clôture administrative", annulation: "Annulé"
};

/** Résultat lisible d'un acte terminé. */
export function resultatActe(e) {
  if (e.statut === "rejet") return "rejet";
  if (e.fin?.mode === "administratif") return "administratif";
  if (e.fin?.mode === "annulation") return "annulation";
  if (e.type === "transe") return e.fin?.mode === "sortie" ? "sortie" : "interruption";
  if (e.fin?.mode === "interruption") return "interruption";
  return e.rituel?.resolution?.suffisant ? "suffisant" : "insuffisant";
}

/**
 * Entrée d'historique d'un acte terminé (null si l'acte est en cours).
 * Recalculée tant que l'acte reste le dernier : la répartition et la validation du MJ, faites après la fin, y sont reportées.
 */
export function entreeHistorique(e, { dateReelle = null, consequences = [] } = {}) {
  if (!e || e.statut === "en-cours") return null;
  const r = e.rituel;
  const res = r?.resolution;
  const resultat = resultatActe(e);
  const puissanceRevelee = r && (!r.puissanceSecrete || !!r.narration);
  return {
    id: e.id,
    date: e.fin?.maintenant ?? e.debut ?? null,
    dateReelle,
    typeActe: e.type,
    religion: e.religion ?? "",
    voie: e.voie?.nom ?? "",
    souhait: r?.souhait ?? "",
    pouvoir: r?.pouvoir?.nom ?? (e.transe ? e.transe.activations.map(a => a.pouvoir?.nom).filter(Boolean).join(", ") : ""),
    puissance: puissanceRevelee ? (r.puissance ?? null) : null,
    succes: e.succes,
    colere: e.colereGagnee,
    resultat,
    resultatLabel: RESULTATS[resultat] ?? resultat,
    niveauMax: e.transe?.niveauMax ?? null,
    ameliorations: r?.repartition ? r.repartition.cout : (e.transe?.activations.reduce((s, a) => s + (a.repartition?.cout ?? 0), 0) || null),
    rejet: resultat === "rejet",
    consequences,
    validation: r?.narration ? (r.narration.accordee ? "accordee" : "refusee") : (r && res ? "en-attente" : null),
    noteMJ: r?.narration?.note ?? ""
  };
}

/** Met à jour l'historique (entrée remplacée si elle existe déjà) ; renvoie null si rien ne change. */
export function majHistorique(historique, entree) {
  if (!entree) return null;
  const liste = (historique ?? []).map(x => ({ ...x }));
  const i = liste.findIndex(x => x.id === entree.id);
  if (i >= 0) {
    if (JSON.stringify(liste[i]) === JSON.stringify(entree)) return null;
    liste[i] = entree;
  } else {
    liste.push(entree);
  }
  return liste.slice(-MAX_ENTREES);
}

/** Nouvelle entrée du journal des interventions du MJ. */
export function intervention({ nature, action, detail = "", par = null, maintenant = null, dateReelle = null }) {
  if (![NATURE.NARRATIVE, NATURE.ADMINISTRATIVE].includes(nature)) throw new Error(`Nature d'intervention inconnue : ${nature}`);
  if (!action) throw new Error("Action d'intervention manquante.");
  return { nature, action, detail: String(detail ?? ""), par, date: maintenant, dateReelle };
}

/** Ajoute une intervention au journal (borné). */
export function ajouterIntervention(journal, entree) {
  return [...(journal ?? []).map(x => ({ ...x })), entree].slice(-MAX_ENTREES);
}

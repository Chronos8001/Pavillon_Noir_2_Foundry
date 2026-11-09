import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  creerRituel, creerTranse, solliciter, arreter, interrompre, annulerActe, repartirAmeliorations,
  commencerAction, activerPouvoir, repartirRenforcement, appliquerColere, verifierPilote, changerPilote,
  colereTotale, resumeActe, STATUT, FIN, ACTION
} from "../../module/magie/moteur.mjs";
import { MagieError } from "../../module/magie/regles.mjs";

// Valeurs de d10 : S = Succès sacré, C = Colère
const S = 1;
const C = 10;

const base = (o = {}) => ({
  id: "acte1",
  typeReligion: "communion",
  valeurs: { foi: 3, mysteres: 0 },
  faveurs: 0,
  auspices: { actesFoi: 0, affinite: 0, beaute: 0, peches: 0 },
  colereInitiale: 0,
  ...o
});

/** Enchaîne des sollicitations et renvoie l'état final. */
function tirer(etat, valeurs) {
  for (const v of valeurs) etat = solliciter(etat, v).etat;
  return etat;
}

const doitEchouer = (fn, code) => assert.throws(fn, e => e instanceof MagieError && e.code === code);

/* -------------------------------------------- */

describe("Rituel : sollicitations et arrêt", () => {
  test("historique ordonné et totaux après chaque lancer", () => {
    const e = tirer(creerRituel(base({ puissance: 2 })), [3, 7, 5]);
    assert.equal(e.lancers.length, 3);
    assert.deepEqual(e.lancers.map(l => l.valeur), [3, 7, 5]);
    assert.deepEqual(e.lancers.map(l => l.resultat), ["succes", "colere", "succes"]);
    assert.deepEqual(e.lancers.map(l => l.succesApres), [1, 1, 2]);
    assert.deepEqual(e.lancers.map(l => l.colereApres), [0, 1, 1]);
    assert.deepEqual(e.lancers.map(l => [l.dSucces, l.dColere]), [[1, 0], [0, 1], [1, 0]]);
    assert.ok(e.lancers.every(l => Array.isArray(l.evenements)));
    assert.equal(e.succes, 2);
    assert.equal(e.colereGagnee, 1);
    assert.equal(resumeActe(e).dernier.valeur, 5);
  });

  test("arrêt interdit après un résultat de Colère", () => {
    const e = tirer(creerRituel(base({ puissance: 1 })), [S, C]);
    assert.equal(e.peutArreter, false);
    assert.equal(resumeActe(e).doitPoursuivre, true);
    doitEchouer(() => arreter(e), "arret-interdit");
  });

  test("arrêt interdit avant toute sollicitation", () => {
    doitEchouer(() => arreter(creerRituel(base({ puissance: 1 }))), "arret-interdit");
  });

  test("arrêt autorisé après un Succès", () => {
    const e = tirer(creerRituel(base({ puissance: 1 })), [C, S]);
    assert.equal(e.peutArreter, true);
    const fin = arreter(e).etat;
    assert.equal(fin.statut, STATUT.TERMINE);
    assert.equal(fin.fin.mode, FIN.VOLONTAIRE);
  });

  test("Rituel insuffisant (arrêt volontaire avant la Puissance)", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 3 })), [S, S])).etat;
    assert.equal(fin.rituel.resolution.suffisant, false);
    assert.equal(fin.rituel.resolution.succesSupplementaires, 0);
  });

  test("Rituel suffisamment puissant, Succès supplémentaires", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 2 })), [S, C, S, S, S])).etat;
    const r = fin.rituel.resolution;
    assert.equal(r.suffisant, true);
    assert.equal(r.succes, 4);
    assert.equal(r.succesSupplementaires, 2);
    assert.equal(r.rejet, false);
  });

  test("Rejet en Rituel évalué à la fin du tirage seulement", () => {
    // Seuil = Foi 3 ; 4 Colères dépassent le Seuil mais le tirage continue.
    let e = tirer(creerRituel(base({ puissance: 1 })), [C, C, C, C]);
    assert.equal(e.statut, STATUT.EN_COURS);
    assert.ok(colereTotale(e) > e.seuil.seuil);
    e = tirer(e, [S]);
    assert.equal(e.statut, STATUT.EN_COURS);
    const fin = arreter(e).etat;
    assert.equal(fin.statut, STATUT.REJET);
    assert.equal(fin.rituel.resolution.rejet, true);
    assert.equal(fin.rituel.resolution.depassement, 1);
    assert.equal(fin.rituel.resolution.suffisant, true); // réussite mécanique et Rejet peuvent coexister
  });

  test("Colère égale au Seuil : pas de Rejet", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 1 })), [C, C, C, S])).etat;
    assert.equal(fin.rituel.resolution.rejet, false);
  });

  test("la Colère initiale du personnage compte pour le Rejet", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 1, colereInitiale: 3 })), [C, S])).etat;
    assert.equal(fin.rituel.resolution.colereTotale, 4);
    assert.equal(fin.rituel.resolution.rejet, true);
  });

  test("impossible de lancer un dé dans un acte terminé", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 1 })), [S])).etat;
    doitEchouer(() => solliciter(fin, S), "acte-termine");
    doitEchouer(() => arreter(fin), "acte-termine");
  });

  test("Puissance nécessaire de 1 à 10", () => {
    for (const p of [0, 11, 2.5, undefined]) doitEchouer(() => creerRituel(base({ puissance: p })), "puissance-invalide");
    assert.equal(creerRituel(base({ puissance: 10 })).rituel.puissance, 10);
  });

  test("l'état reçu n'est jamais modifié", () => {
    const e0 = creerRituel(base({ puissance: 1 }));
    const copie = structuredClone(e0);
    solliciter(e0, S);
    assert.deepEqual(e0, copie);
  });
});

describe("Rituel : interruption, annulation, améliorations", () => {
  test("interruption imposée possible après une Colère, distincte de l'arrêt volontaire", () => {
    const e = tirer(creerRituel(base({ puissance: 1 })), [S, C]);
    const fin = interrompre(e, { motif: "Le prêtre est assommé" }).etat;
    assert.equal(fin.fin.mode, FIN.INTERRUPTION);
    assert.equal(fin.fin.motif, "Le prêtre est assommé");
    assert.ok(fin.rituel.resolution);
  });

  test("annulation seulement sans sollicitation", () => {
    const e = creerRituel(base({ puissance: 1 }));
    assert.equal(annulerActe(e).etat.statut, STATUT.ANNULE);
    doitEchouer(() => annulerActe(tirer(e, [S])), "annulation-interdite");
  });

  test("répartition des Succès supplémentaires dans le budget", () => {
    const fin = arreter(tirer(creerRituel(base({ puissance: 1 })), [S, S, S, S, S])).etat; // budget 4
    const ok = repartirAmeliorations(fin, { portee: 2, impact: 1 }).etat;
    assert.equal(ok.rituel.repartition.cout, 4);
    doitEchouer(() => repartirAmeliorations(fin, { portee: 2, impact: 2 }), "repartition-invalide");
  });

  test("pas de répartition pour un Rituel insuffisant ou en cours", () => {
    const enCours = tirer(creerRituel(base({ puissance: 3 })), [S]);
    doitEchouer(() => repartirAmeliorations(enCours, { portee: 1 }), "acte-en-cours");
    doitEchouer(() => repartirAmeliorations(arreter(enCours).etat, { portee: 1 }), "rituel-insuffisant");
  });
});

/* -------------------------------------------- */

const pouvoirs = [
  { id: "p1", nom: "Bénédiction", puissance: 1 },
  { id: "p2", nom: "Protection", puissance: 2 },
  { id: "p3", nom: "Vision", puissance: 3 },
  { id: "p2b", nom: "Guérison", puissance: 2 }
];
const transe = (o = {}) => creerTranse(base({ pouvoirsConnus: pouvoirs, dureeRitesMinutes: 10, valeurs: { foi: 6 }, ...o }));
const action = (e, type, cible, ctx = {}) => commencerAction(e, type, { cible }, ctx).etat;

describe("Transe : entrée, ascension, détachement", () => {
  test("entrée en Transe : un Succès sacré, Pouvoir de Puissance 1 dans le Chemin", () => {
    let e = transe();
    assert.equal(e.transe.actif, false);
    e = action(e, ACTION.ENTREE, "p1");
    e = tirer(e, [C]);
    assert.equal(e.transe.actif, false);           // la Colère ne fait pas entrer en Transe
    assert.equal(resumeActe(e).doitPoursuivre, true);
    e = tirer(e, [S]);
    assert.equal(e.transe.actif, true);
    assert.equal(e.transe.niveau, 1);
    assert.deepEqual(e.transe.chemin.map(c => c.id), ["p1"]);
    assert.equal(e.transe.actionEnCours, null);
    assert.equal(e.colereGagnee, 1);
  });

  test("l'entrée exige un Pouvoir connu de Puissance 1", () => {
    doitEchouer(() => action(transe(), ACTION.ENTREE, "p2"), "puissance-incorrecte");
    doitEchouer(() => action(transe(), ACTION.ENTREE, "inconnu"), "pouvoir-inconnu");
  });

  test("ascension : Pouvoir de la Puissance suivante ajouté, effet non déclenché", () => {
    let e = tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);
    e = tirer(action(e, ACTION.ASCENSION, "p2b"), [S]);
    assert.equal(e.transe.niveau, 2);
    assert.equal(e.transe.niveauMax, 2);
    assert.deepEqual(e.transe.chemin.map(c => c.id), ["p1", "p2b"]);
    assert.equal(e.transe.activations.length, 0);   // l'ascension n'active rien
    doitEchouer(() => action(e, ACTION.ASCENSION, "p2"), "puissance-incorrecte");
  });

  test("impossible de monter au-delà du niveau autorisé", () => {
    let e = tirer(action(transe({ niveauLimite: 1 }), ACTION.ENTREE, "p1"), [S]);
    doitEchouer(() => action(e, ACTION.ASCENSION, "p2"), "niveau-max");
  });

  test("détachement : retire le Pouvoir le plus élevé et baisse le niveau", () => {
    let e = tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);
    e = tirer(action(e, ACTION.ASCENSION, "p2"), [S]);
    e = tirer(action(e, ACTION.DETACHEMENT), [C, S]);
    assert.equal(e.transe.niveau, 1);
    assert.deepEqual(e.transe.chemin.map(c => c.id), ["p1"]);
    assert.equal(e.transe.niveauMax, 2);
    assert.equal(e.statut, STATUT.EN_COURS);
  });

  test("sortie de Transe au niveau zéro", () => {
    let e = tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);
    e = tirer(action(e, ACTION.DETACHEMENT), [S]);
    assert.equal(e.transe.niveau, 0);
    assert.equal(e.transe.actif, false);
    assert.equal(e.statut, STATUT.TERMINE);
    assert.equal(e.fin.mode, FIN.SORTIE);
    doitEchouer(() => action(e, ACTION.DETACHEMENT), "acte-termine");
  });

  test("impossible de se détacher hors Transe (niveau 0)", () => {
    doitEchouer(() => action(transe(), ACTION.DETACHEMENT), "hors-transe");
  });

  test("une action à la fois ; pas de sollicitation sans action", () => {
    let e = action(transe(), ACTION.ENTREE, "p1");
    doitEchouer(() => action(e, ACTION.ENTREE, "p1"), "action-en-cours");
    doitEchouer(() => solliciter(transe(), S), "aucune-action");
  });

  test("on ne peut pas arrêter volontairement une ascension (il faut un Succès)", () => {
    let e = tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);
    e = tirer(action(e, ACTION.ASCENSION, "p2"), [C]);
    doitEchouer(() => arreter(e), "arret-interdit");
  });

  test("Cycle : échéance remise à zéro à chaque changement de niveau", () => {
    let e = action(transe(), ACTION.ENTREE, "p1");
    e = solliciter(e, S, { maintenant: 1000 }).etat;
    assert.equal(e.transe.cycle.dureeMinutes, 10);
    assert.equal(e.transe.cycle.debutNiveau, 1000);
    e = action(e, ACTION.ASCENSION, "p2");
    e = solliciter(e, S, { maintenant: 1300 }).etat;
    assert.equal(e.transe.cycle.debutNiveau, 1300);
  });

  test("Transe instantanée : Cycle de 30 minutes, Beauté des rites nulle", () => {
    const e = transe({ instantanee: true, auspices: { beaute: 4, actesFoi: 1 } });
    assert.equal(e.transe.cycle.dureeMinutes, 30);
    assert.equal(e.auspices.beaute, 0);
    assert.equal(e.auspices.total, 1);
  });
});

describe("Transe : activation et renforcement", () => {
  const enTranse = () => tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);

  test("activation sans sollicitation d'un Pouvoir du Chemin", () => {
    const e = activerPouvoir(enTranse(), "p1").etat;
    assert.equal(e.transe.activations.length, 1);
    assert.equal(e.lancers.length, 1); // aucun dé supplémentaire
  });

  test("impossible d'activer un Pouvoir absent du Chemin", () => {
    doitEchouer(() => activerPouvoir(enTranse(), "p2"), "pouvoir-absent");
  });

  test("renforcement : arrêt après un Succès, Succès cumulés et répartis", () => {
    let e = activerPouvoir(enTranse(), "p1").etat;
    e = action(e, ACTION.RENFORCEMENT, 1);
    e = tirer(e, [S, C]);
    doitEchouer(() => arreter(e), "arret-interdit");
    e = tirer(e, [S, S]);
    e = arreter(e).etat;
    assert.equal(e.transe.activations[0].succes, 3);
    assert.equal(e.transe.actionEnCours, null);
    const r = repartirRenforcement(e, 1, { portee: 1, cible: 1 }).etat;
    assert.equal(r.transe.activations[0].repartition.cout, 2);
    doitEchouer(() => repartirRenforcement(e, 1, { impact: 2, duree: 1 }), "repartition-invalide");
  });

  test("le renforcement d'un Pouvoir retiré du Chemin est refusé", () => {
    let e = tirer(action(enTranse(), ACTION.ASCENSION, "p2"), [S]);
    e = activerPouvoir(e, "p2").etat;
    e = tirer(action(e, ACTION.DETACHEMENT), [S]);
    doitEchouer(() => action(e, ACTION.RENFORCEMENT, 1), "pouvoir-absent");
  });
});

describe("Transe : Rejet immédiat", () => {
  test("le Rejet interrompt la Transe dès que la Colère dépasse le Seuil", () => {
    // Seuil = Foi 2 ; la 3e Colère déclenche le Rejet pendant l'ascension.
    let e = tirer(action(transe({ valeurs: { foi: 2 } }), ACTION.ENTREE, "p1"), [C, S]);
    e = tirer(action(e, ACTION.ASCENSION, "p2"), [S]);
    e = action(e, ACTION.ASCENSION, "p3");
    e = tirer(e, [C]);
    assert.equal(e.statut, STATUT.EN_COURS);
    e = tirer(e, [C]);
    assert.equal(e.statut, STATUT.REJET);
    assert.equal(e.fin.mode, FIN.REJET);
    assert.equal(e.transe.actif, false);
    assert.equal(e.transe.rejet.niveau, 2);
    assert.equal(e.transe.rejet.niveauMax, 2);
    assert.equal(e.transe.rejet.depassement, 1);
    assert.equal(e.transe.rejet.action, ACTION.ASCENSION);
    assert.deepEqual(e.transe.rejet.chemin.map(c => c.id), ["p1", "p2"]);
    assert.equal(e.transe.rejet.sequelles.puissanceMax, 2);
  });

  test("impossible de continuer après un Rejet", () => {
    const e = tirer(action(transe({ valeurs: { foi: 0 } }), ACTION.ENTREE, "p1"), [C]);
    assert.equal(e.statut, STATUT.REJET);
    doitEchouer(() => solliciter(e, S), "acte-termine");
    doitEchouer(() => action(e, ACTION.ENTREE, "p1"), "acte-termine");
    doitEchouer(() => activerPouvoir(e, "p1"), "acte-termine");
    doitEchouer(() => interrompre(e, { terminer: true }), "acte-termine");
  });

  test("Seuil négatif : le Rejet survient dès la première sollicitation", () => {
    const e = tirer(action(transe({ valeurs: { foi: 0 }, faveurs: -2 }), ACTION.ENTREE, "p1"), [S]);
    assert.equal(e.seuil.negatif, true);
    assert.equal(e.statut, STATUT.REJET);
  });

  test("interruption imposée : abandon de l'action, ou fin de la Transe", () => {
    let e = tirer(action(transe(), ACTION.ENTREE, "p1"), [S]);
    e = tirer(action(e, ACTION.ASCENSION, "p2"), [C]);
    e = interrompre(e, { motif: "Blessure" }).etat;
    assert.equal(e.transe.actionEnCours, null);
    assert.equal(e.statut, STATUT.EN_COURS);
    e = interrompre(e, { motif: "Fin imposée", terminer: true }).etat;
    assert.equal(e.statut, STATUT.TERMINE);
    assert.equal(e.fin.mode, FIN.INTERRUPTION);
  });
});

/* -------------------------------------------- */

describe("Colère persistante et sécurité des mises à jour", () => {
  test("conservation de la Colère entre deux actes (grand livre)", () => {
    let colereFiche = 0;
    // Premier acte : 2 Colères
    let a = tirer(creerRituel(base({ puissance: 1, colereInitiale: colereFiche })), [C, C, S]);
    ({ valeur: colereFiche } = appliquerColere(a, colereFiche));
    assert.equal(colereFiche, 2);
    // Second acte : commence avec la Colère du premier
    const b = creerRituel(base({ puissance: 1, colereInitiale: colereFiche }));
    assert.equal(b.colereInitiale, 2);
    const b2 = tirer(b, [C, S]);
    assert.equal(colereTotale(b2), 3);
    assert.equal(appliquerColere(b2, colereFiche).valeur, 3);
  });

  test("reporter deux fois le même état n'ajoute la Colère qu'une fois", () => {
    const e = tirer(creerRituel(base({ puissance: 1 })), [C, C]);
    const r1 = appliquerColere(e, 5);
    const r2 = appliquerColere(r1.etat, r1.valeur);
    assert.equal(r1.valeur, 7);
    assert.equal(r2.valeur, 7);
    assert.equal(r2.delta, 0);
  });

  test("la Colère modifiée à part (MJ) est préservée par le grand livre", () => {
    let e = tirer(creerRituel(base({ puissance: 1 })), [C]);
    let r = appliquerColere(e, 0);              // fiche : 1
    e = tirer(r.etat, [C]);
    r = appliquerColere(e, r.valeur + 4);       // le MJ a ajouté 4 entre-temps
    assert.equal(r.valeur, 6);
  });

  test("requête répétée (double clic) : ignorée, aucun lancer ni Colère en plus", () => {
    const e0 = creerRituel(base({ puissance: 1 }));
    const r1 = solliciter(e0, C, { requete: "req-1" });
    const r2 = solliciter(r1.etat, C, { requete: "req-1" });
    assert.equal(r2.doublon, true);
    assert.equal(r2.etat, r1.etat);
    assert.equal(r2.etat.lancers.length, 1);
    assert.equal(r2.etat.colereGagnee, 1);
  });

  test("requête périmée (séquence attendue dépassée) : refusée", () => {
    const e0 = creerRituel(base({ puissance: 1 }));
    const e1 = solliciter(e0, S, { requete: "a", seqAttendue: 0 }).etat;
    assert.equal(e1.seq, 1);
    doitEchouer(() => solliciter(e1, S, { requete: "b", seqAttendue: 0 }), "etat-perime");
    assert.equal(solliciter(e1, S, { requete: "b", seqAttendue: 1 }).etat.seq, 2);
  });

  test("seul le pilote de l'acte peut le faire avancer ; reprise possible", () => {
    const e = creerRituel(base({ puissance: 1, pilote: "joueur" }));
    doitEchouer(() => verifierPilote(e, "autre"), "pilote");
    verifierPilote(e, "joueur");
    const repris = changerPilote(e, "mj").etat;
    verifierPilote(repris, "mj");
  });
});

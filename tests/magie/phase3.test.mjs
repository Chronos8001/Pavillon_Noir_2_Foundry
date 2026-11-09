/**
 * Phase 3 : Aléas, révélations, Quêtes mystiques, concentration, Cycle, Rejet, séquelles, pénitences, coffre.
 * Tests déterministes ; les probabilités sont simulées dans phase3-statistiques.test.mjs.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  creerRituel, creerTranse, solliciter, arreter, commencerAction, activerPouvoir, echecConcentration, signalerCycle,
  interrompre, vueJoueur, serialiserActe, deserialiserActe, colereTotale, STATUT
} from "../../module/magie/moteur.mjs";
import {
  pourcentageD10, testerPourcentage, uniformeParD10, puissanceAlea, aleaApplicable, choisirAlea, puissanceRevelation,
  lancersAExaminer, examinerSollicitation, resoudreQuete
} from "../../module/magie/evenements.mjs";
import { archiveRejet, nombrePenitences, etatSequelle, malusSequelles, prochaineRepentance, ETATS_PENITENCE } from "../../module/magie/consequences.mjs";
import { genererCle, chiffrer, dechiffrer, empreinte } from "../../module/magie/coffre.mjs";
import { MagieError, resoudreD10 } from "../../module/magie/regles.mjs";

const S = 1;
const C = 10;
const doitEchouer = (fn, code) => assert.throws(fn, e => e instanceof MagieError && e.code === code);
const tirer = (e, vals, ctx = {}) => vals.reduce((x, v) => solliciter(x, v, ctx).etat, e);
const pc = [{ id: "p1", nom: "A", puissance: 1 }, { id: "p2", nom: "B", puissance: 2 }, { id: "p3", nom: "C", puissance: 3 }];
const transe = (o = {}) => creerTranse({ typeReligion: "possession", valeurs: { mysteres: 6 }, auspices: {}, pouvoirsConnus: pc, dureeRitesMinutes: 10, voie: { cle: "agwe", nom: "Voie d'Agwé" }, ...o });
const enTranse = (o) => tirer(commencerAction(transe(o), "entree", { cible: "p1" }).etat, [S], { maintenant: 0 });

describe("Tirages internes en d10", () => {
  test("pourcentage avec deux d10 : 10 vaut 0, 0-0 vaut 100", () => {
    assert.equal(pourcentageD10(1, 1), 11);
    assert.equal(pourcentageD10(10, 2), 2);
    assert.equal(pourcentageD10(10, 1), 1);
    assert.equal(pourcentageD10(10, 10), 100);
    assert.equal(pourcentageD10(9, 9), 99);
  });

  test("déclenchement et non-déclenchement sous un seuil", () => {
    assert.deepEqual(testerPourcentage(10, 2, 2), { tirage: 2, declenche: true });
    assert.deepEqual(testerPourcentage(10, 3, 2), { tirage: 3, declenche: false });
    assert.equal(testerPourcentage(10, 1, 0).declenche, false);
  });

  test("1 à 6 uniforme avec des d10 : 7 à 10 relancés, aucun d6", () => {
    assert.deepEqual(uniformeParD10([4]), { resultat: 4, utilises: 1 });
    assert.deepEqual(uniformeParD10([9, 10, 7, 6]), { resultat: 6, utilises: 4 });
    assert.deepEqual(uniformeParD10([8, 9]), { resultat: null, utilises: 2 });
  });
});

describe("Aléas", () => {
  const l = r => ({ resultat: r });
  test("Puissance = suite initiale de résultats identiques (sens du premier d10)", () => {
    assert.deepEqual(puissanceAlea([l("succes"), l("succes"), l("colere")]), { sens: "droit", puissance: 2, complete: true });
    assert.deepEqual(puissanceAlea([l("colere"), l("colere")]), { sens: "renverse", puissance: 2, complete: false });
    assert.deepEqual(puissanceAlea([l("colere"), l("colere")], { termine: true }).complete, true);
    assert.equal(puissanceAlea([]).puissance, 0);
  });

  test("conditions : type d'acte, religion, Voie, sens", () => {
    const a = { religion: "vaudou", voie: "agwe", conditions: { typesActe: ["rituel"], sens: "renverse" } };
    assert.equal(aleaApplicable(a, { typeActe: "rituel", religion: "vaudou", voie: "agwe", sens: "renverse" }), true);
    assert.equal(aleaApplicable(a, { typeActe: "transe", religion: "vaudou", voie: "agwe", sens: "renverse" }), false);
    assert.equal(aleaApplicable(a, { typeActe: "rituel", religion: "vaudou", voie: "agwe", sens: "droit" }), false);
    assert.equal(aleaApplicable({}, { typeActe: "transe" }), true);
  });

  test("choix pondéré et table vide", () => {
    const table = [{ id: "a", poids: 1 }, { id: "b", poids: 3 }];
    assert.equal(choisirAlea(table, 1).id, "a");
    assert.equal(choisirAlea(table, 25).id, "a");
    assert.equal(choisirAlea(table, 26).id, "b");
    assert.equal(choisirAlea(table, 100).id, "b");
    assert.equal(choisirAlea([], 50), null);
  });

  test("examen du premier lancer : Aléa déclenché ou non, résultat principal intact", () => {
    const e = tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 3 }, puissance: 2, auspices: {}, voie: { cle: "dieu" } }), [S]);
    const copie = structuredClone(e);
    const cfg = { aleaMode: "probabilite", aleaProbabilite: 30, revelationSeuil: 0, candidatsAlea: [{ id: "x", nom: "Présage", poids: 1 }] };
    const oui = examinerSollicitation(e, e.lancers[0], { alea: [1, 5], choixAlea: [5, 5], revelation: [1, 1] }, cfg);
    assert.equal(oui.alea.aleaId, "x");
    assert.equal(oui.alea.sens, "droit");
    const non = examinerSollicitation(e, e.lancers[0], { alea: [5, 5], choixAlea: [5, 5], revelation: [1, 1] }, cfg);
    assert.equal(non.alea, null);
    assert.equal(examinerSollicitation(e, e.lancers[0], { alea: [9, 9], choixAlea: [1, 1], revelation: [1, 1] }, { ...cfg, aleaMode: "officiel" }).alea.statut, "en-attente");
    assert.equal(examinerSollicitation(e, e.lancers[0], { alea: [1, 1], choixAlea: [1, 1], revelation: [1, 1] }, { ...cfg, aleaMode: "desactive" }).alea, null);
    assert.deepEqual(e, copie);            // l'examen ne modifie pas l'acte
  });

  test("Aléa sans contenu défini : sens conservé, interprétation laissée au MJ", () => {
    const e = tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 3 }, puissance: 2, auspices: {} }), [C]);
    const r = examinerSollicitation(e, e.lancers[0], { alea: [1, 1], choixAlea: [1, 1], revelation: [5, 5] }, { aleaMode: "officiel", revelationSeuil: 0, candidatsAlea: [] });
    assert.equal(r.alea.aleaId, null);
    assert.equal(r.alea.sens, "renverse");
  });
});

describe("Révélations (Le Mat)", () => {
  test("Rituel : Succès obtenus avant la révélation, plafond Foi/Connaissance + 1", () => {
    assert.equal(puissanceRevelation({ typeActe: "rituel", succesAvant: 2, valeurVoie: 3 }), 2);
    assert.equal(puissanceRevelation({ typeActe: "rituel", succesAvant: 7, valeurVoie: 3 }), 4);
    assert.equal(puissanceRevelation({ typeActe: "rituel", succesAvant: 0, valeurVoie: 3 }), 0);
  });

  test("Transe : Niveau de transe + 1, plafond 10", () => {
    assert.equal(puissanceRevelation({ typeActe: "transe", niveau: 2 }), 3);
    assert.equal(puissanceRevelation({ typeActe: "transe", niveau: 10 }), 10);
  });

  test("examen : Succès avant le lancer (pas après) et niveau enregistré au moment du jet", () => {
    const e = tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 1 }, puissance: 5, auspices: {} }), [S, S, S]);
    const r = examinerSollicitation(e, e.lancers[2], { alea: [5, 5], choixAlea: [1, 1], revelation: [10, 1] }, { aleaMode: "desactive", revelationSeuil: 2, valeurVoie: 1 });
    assert.equal(r.revelation.succesAvant, 2);
    assert.equal(r.revelation.puissance, 2);
    let t = enTranse();
    t = tirer(commencerAction(t, "ascension", { cible: "p2" }).etat, [C]);
    const lancer = t.lancers.at(-1);
    assert.equal(lancer.niveau, 1);
    const rt = examinerSollicitation(t, lancer, { alea: [5, 5], choixAlea: [1, 1], revelation: [10, 2] }, { aleaMode: "desactive", revelationSeuil: 2 });
    assert.equal(rt.revelation.puissance, 2);
  });

  test("le résultat principal n'est jamais modifié par l'examen", () => {
    for (let v = 1; v <= 10; v++) {
      const e = tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 3 }, puissance: 1, auspices: {} }), [v]);
      examinerSollicitation(e, e.lancers[0], { alea: [10, 1], choixAlea: [1, 1], revelation: [10, 1] }, { aleaMode: "officiel", revelationSeuil: 100, valeurVoie: 3 });
      assert.equal(e.lancers[0].resultat, resoudreD10(v).resultat);
      assert.equal(e.succes + e.colereGagnee, 1);
    }
  });

  test("reprise après déconnexion : seuls les lancers non examinés sont repris", () => {
    const e = tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 3 }, puissance: 1, auspices: {} }), [S, C, S]);
    assert.deepEqual(lancersAExaminer(e, [1]), [2, 3]);
    assert.deepEqual(lancersAExaminer(e, [1, 2, 3]), []);
    const relu = deserialiserActe(serialiserActe(e));
    assert.deepEqual(lancersAExaminer(relu, [1]), [2, 3]);
  });
});

describe("Quête mystique", () => {
  test("action de Transe, arrêt volontaire après un Succès, niveau inchangé", () => {
    let t = tirer(commencerAction(enTranse(), "quete").etat, [S, C, S]);
    assert.equal(t.peutArreter, true);
    t = arreter(t).etat;
    assert.equal(t.transe.niveau, 1);
    assert.equal(t.transe.quetes.length, 1);
    assert.equal(t.transe.quetes[0].succes, 2);
    assert.equal(t.transe.quetes[0].niveau, 1);
  });

  test("hors Transe : impossible ; après une Colère : arrêt interdit", () => {
    doitEchouer(() => commencerAction(transe(), "quete"), "hors-transe");
    const t = tirer(commencerAction(enTranse(), "quete").etat, [C]);
    doitEchouer(() => arreter(t), "arret-interdit");
  });

  test("résolution face à l'objectif secret (1D6 en d10) ; Puissance = niveau + 1", () => {
    assert.deepEqual(resoudreQuete({ succes: 5, objectif: 5, niveau: 3 }), { reussie: true, puissance: 4 });
    assert.deepEqual(resoudreQuete({ succes: 3, objectif: 5, niveau: 3 }), { reussie: false, puissance: 4 });
  });

  test("anciennes Transes enregistrées sans liste de Quêtes : compatibles", () => {
    const t = enTranse();
    delete t.transe.quetes;
    const fin = arreter(tirer(commencerAction(t, "quete").etat, [S])).etat;
    assert.equal(fin.transe.quetes.length, 1);
  });
});

describe("Perte de concentration et Cycle", () => {
  test("ascension interrompue : échec, 2 d10 dont seules les Colères comptent", () => {
    let t = tirer(commencerAction(enTranse(), "ascension", { cible: "p2" }).etat, [C]);
    const colereAvant = t.colereGagnee;
    t = echecConcentration(t, [S, C], { motif: "Blessure" }).etat;
    assert.equal(t.transe.actionEnCours, null);
    assert.equal(t.transe.niveau, 1);                  // l'ascension a échoué
    assert.equal(t.colereGagnee, colereAvant + 1);     // seule la Colère compte
    assert.equal(t.lancers.at(-2).ignore, true);       // le Succès est enregistré mais ignoré
    assert.equal(t.succes, 1);
  });

  test("une interruption n'efface jamais la Colère déjà tirée", () => {
    let t = tirer(commencerAction(enTranse(), "ascension", { cible: "p2" }).etat, [C, C]);
    const avant = colereTotale(t);
    t = interrompre(t, { motif: "Assommé" }).etat;
    assert.equal(colereTotale(t), avant);
    t = interrompre(tirer(commencerAction(t, "ascension", { cible: "p2" }).etat, [C]), { terminer: true }).etat;
    assert.equal(colereTotale(t), avant + 1);
  });

  test("la perte de concentration peut provoquer le Rejet immédiat", () => {
    let t = enTranse({ valeurs: { mysteres: 1 } });         // Seuil 1
    t = tirer(commencerAction(t, "ascension", { cible: "p2" }).etat, [C]);
    t = echecConcentration(t, [C, C]).etat;
    assert.equal(t.statut, STATUT.REJET);
  });

  test("perte de concentration réservée aux actions prévues (ascension)", () => {
    doitEchouer(() => echecConcentration(enTranse(), [S, C]), "concentration");
    const d = commencerAction(enTranse(), "detachement").etat;
    doitEchouer(() => echecConcentration(d, [S, C]), "concentration");
    doitEchouer(() => echecConcentration(commencerAction(enTranse(), "ascension", { cible: "p2" }).etat, [S]), "valeur-invalide");
  });

  test("Cycle échu : signalé sans action automatique ; détachement imposé possible", () => {
    let t = enTranse();
    t = signalerCycle(t).etat;
    assert.equal(t.transe.cycle.alerte, t.transe.cycle.debutNiveau);
    assert.equal(t.transe.niveau, 1);
    assert.equal(t.transe.actionEnCours, null);
    t = commencerAction(t, "detachement", { impose: "mj" }).etat;
    assert.equal(t.transe.actionEnCours.impose, "mj");
    t = tirer(t, [S]);
    assert.equal(t.statut, STATUT.TERMINE);
  });
});

describe("Rejet, séquelles et pénitences", () => {
  test("archive d'un Rejet en Rituel : Pouvoir invoqué, dépassement", () => {
    let e = creerRituel({ id: "r1", typeReligion: "communion", valeurs: { foi: 1 }, puissance: 4, auspices: {}, religion: "Christianisme",
      voie: { cle: "dieu", nom: "Voie de Dieu" }, pouvoir: { id: "p", nom: "Bénédiction", puissance: 1 } });
    e = arreter(tirer(e, [C, C, C, S])).etat;
    const a = archiveRejet(e, { maintenant: 100, dateReelle: "2026-11-09" });
    assert.equal(a.typeActe, "rituel");
    assert.equal(a.colere, 3);
    assert.equal(a.seuil, 1);
    assert.equal(a.depassement, 2);
    assert.equal(a.puissance, 1);
    assert.equal(a.niveauMax, null);
    assert.equal(nombrePenitences(a), 2);
  });

  test("archive d'un Rejet immédiat en Transe : niveaux, Pouvoir le plus puissant, Pouvoirs annulés", () => {
    let t = enTranse({ valeurs: { mysteres: 2 } });
    t = tirer(commencerAction(t, "ascension", { cible: "p2" }).etat, [S]);
    t = activerPouvoir(t, "p2").etat;
    t = tirer(commencerAction(t, "ascension", { cible: "p3" }).etat, [C, C, C]);
    assert.equal(t.statut, STATUT.REJET);
    const a = archiveRejet(t, { maintenant: 50 });
    assert.equal(a.typeActe, "transe");
    assert.equal(a.niveauRejet, 2);
    assert.equal(a.niveauMax, 2);
    assert.equal(a.puissance, 2);
    assert.deepEqual(a.pouvoirsAnnules, ["B"]);
    assert.equal(archiveRejet(tirer(creerRituel({ typeReligion: "communion", valeurs: { foi: 5 }, puissance: 1, auspices: {} }), [S])), null);
  });

  test("séquelle levable quand toutes ses pénitences sont accomplies", () => {
    const s = { id: "s1", rejetId: "r1", active: true };
    const p = [{ id: "a", sequelleId: "s1", etat: ETATS_PENITENCE.ACCOMPLIE }, { id: "b", sequelleId: "s1", etat: ETATS_PENITENCE.EN_COURS }];
    assert.equal(etatSequelle(s, p).levable, false);
    p[1].etat = ETATS_PENITENCE.ACCOMPLIE;
    assert.equal(etatSequelle(s, p).levable, true);
    p[1].etat = ETATS_PENITENCE.ABANDONNEE;
    assert.equal(etatSequelle(s, p).levable, false);
    assert.equal(etatSequelle(s, []).levable, false);
  });

  test("malus d'Auspices (-5) limité à la Voie de la séquelle", () => {
    const seq = [{ active: true, voieCle: "agwe" }];
    assert.equal(malusSequelles(seq, "agwe"), 5);
    assert.equal(malusSequelles(seq, "dambala"), 0);
    assert.equal(malusSequelles([{ active: false, voieCle: "agwe" }], "agwe"), 0);
    assert.equal(malusSequelles([{ active: true, voieCle: "agwe", malusAuspices: false }], "agwe"), 0);
    assert.equal(malusSequelles([{ active: true, voieCle: "" }], "dambala"), 5);
  });

  test("repentance : tous les 3 jours en priorité, une fois par semaine sinon", () => {
    assert.equal(prochaineRepentance(0, true), 3 * 86400);
    assert.equal(prochaineRepentance(0, false), 7 * 86400);
    assert.equal(prochaineRepentance(null), null);
  });
});

describe("Coffre du MJ (aucune fuite des données secrètes)", () => {
  test("chiffrement et déchiffrement avec la clé du MJ", async () => {
    const cle = await genererCle();
    const secret = { revelations: [{ puissance: 3 }], objectif: 5 };
    const texte = await chiffrer(secret, cle);
    assert.ok(texte.startsWith("v1."));
    assert.ok(!texte.includes("puissance") && !texte.includes("objectif"));
    assert.deepEqual(await dechiffrer(texte, cle), secret);
  });

  test("une autre clé ne peut pas lire le coffre", async () => {
    const texte = await chiffrer({ x: 1 }, await genererCle());
    await assert.rejects(dechiffrer(texte, await genererCle()));
  });

  test("deux chiffrements du même secret diffèrent ; empreinte stable", async () => {
    const cle = await genererCle();
    assert.notEqual(await chiffrer({ a: 1 }, cle), await chiffrer({ a: 1 }, cle));
    assert.equal(await empreinte(cle), await empreinte(cle));
  });

  test("la vue joueur d'un acte ne contient aucun secret de la phase 3", () => {
    const t = arreter(tirer(commencerAction(enTranse(), "quete").etat, [S])).etat;
    const vue = JSON.stringify(vueJoueur(t, { seuilVisible: false }));
    assert.ok(!vue.includes("objectif"));
    assert.ok(!vue.includes("revelation"));
  });
});

/**
 * Phase 2 : Puissance secrète, vue joueur, validation narrative, références et import.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { creerRituel, creerTranse, solliciter, arreter, commencerAction, validerNarration, vueJoueur, resumeActe, repartirAmeliorations } from "../../module/magie/moteur.mjs";
import { voieDuPouvoir, trierReferences, preparerImport } from "../../module/magie/references.mjs";
import { MagieError } from "../../module/magie/regles.mjs";

const S = 1;
const C = 10;
const rituel = (o = {}) => creerRituel({
  typeReligion: "communion", valeurs: { foi: 3 }, faveurs: 1, auspices: { actesFoi: 2, beaute: 1 }, puissance: 2, ...o
});
const tirer = (e, vals) => vals.reduce((x, v) => solliciter(x, v).etat, e);
const doitEchouer = (fn, code) => assert.throws(fn, e => e instanceof MagieError && e.code === code);

describe("Rituel préparé par le MJ", () => {
  test("rites, Pouvoir invoqué, Puissance secrète et validation sont conservés", () => {
    const e = rituel({ rites: "Chants et encens", puissanceSecrete: true, pouvoir: { id: "p", uuid: "Actor.a.Item.p", nom: "Bénédiction", puissance: 1 }, validation: { par: "mj" } });
    assert.equal(e.rituel.rites, "Chants et encens");
    assert.equal(e.rituel.puissanceSecrete, true);
    assert.equal(e.rituel.pouvoir.uuid, "Actor.a.Item.p");
    assert.deepEqual(e.rituel.validation, { par: "mj" });
    assert.equal(e.rituel.narration, null);
  });

  test("validation narrative seulement après la résolution", () => {
    const enCours = tirer(rituel(), [S]);
    doitEchouer(() => validerNarration(enCours, { accordee: true }), "acte-en-cours");
    const fin = validerNarration(arreter(tirer(enCours, [S])).etat, { accordee: true, note: "Le vent tombe", par: "mj" }).etat;
    assert.deepEqual({ ...fin.rituel.narration, maintenant: undefined }, { accordee: true, note: "Le vent tombe", par: "mj", maintenant: undefined });
  });

  test("la réussite mécanique n'applique rien : la narration est une décision distincte", () => {
    const fin = arreter(tirer(rituel(), [S, S, S])).etat;
    assert.equal(fin.rituel.resolution.suffisant, true);
    assert.equal(fin.rituel.narration, null);
    const refus = validerNarration(fin, { accordee: false }).etat;
    assert.equal(refus.rituel.narration.accordee, false);
    assert.equal(refus.rituel.resolution.suffisant, true);
  });
});

describe("Vue joueur (aucune donnée MJ dans l'interface des joueurs)", () => {
  test("Puissance secrète : masquée, ainsi que la réussite, jusqu'à la validation du MJ", () => {
    const fin = arreter(tirer(rituel({ puissanceSecrete: true, puissance: 2 }), [S, S, S])).etat;
    const vue = vueJoueur(fin, { seuilVisible: true });
    assert.equal(vue.rituel.puissance, null);
    assert.equal(vue.rituel.resolution.puissance, null);
    assert.equal(vue.rituel.resolution.suffisant, null);
    assert.equal(vue.rituel.resolution.succesSupplementaires, null);
    assert.equal(vue.rituel.resolution.succes, 3);       // les Succès obtenus restent connus du joueur
    assert.ok(!JSON.stringify(vue.rituel).includes('"puissance":2'));
    const apres = vueJoueur(validerNarration(fin, { accordee: true }).etat, { seuilVisible: true });
    assert.equal(apres.rituel.puissance, null);           // la Puissance reste secrète
    assert.equal(apres.rituel.resolution.suffisant, true); // le résultat est révélé après validation
  });

  test("Seuil non visible : Seuil, Auspices et dépassement retirés ; Rejet conservé", () => {
    const fin = arreter(tirer(rituel({ valeurs: { foi: 0 }, faveurs: 0, auspices: {} }), [C, S])).etat;
    assert.equal(fin.rituel.resolution.rejet, true);
    const vue = vueJoueur(fin, { seuilVisible: false });
    assert.deepEqual(vue.seuil, { masque: true });
    assert.equal(vue.auspices.total, undefined);
    assert.equal(vue.rituel.resolution.depassement, null);
    assert.equal(vue.rituel.resolution.rejet, true);
    assert.equal(resumeActe(vue).seuil, undefined);
  });

  test("Seuil visible et Puissance publique : rien n'est retiré", () => {
    const fin = arreter(tirer(rituel(), [S, S])).etat;
    const vue = vueJoueur(fin, { seuilVisible: true });
    assert.equal(vue.seuil.seuil, fin.seuil.seuil);
    assert.equal(vue.rituel.puissance, 2);
    assert.equal(vue.rituel.resolution.suffisant, true);
  });

  test("Rejet en Transe : données de séquelles retirées de la vue joueur sans Seuil", () => {
    let t = creerTranse({ typeReligion: "possession", valeurs: { mysteres: 0 }, auspices: {}, pouvoirsConnus: [{ id: "p1", nom: "A", puissance: 1 }] });
    t = solliciter(commencerAction(t, "entree", { cible: "p1" }).etat, C).etat;
    const vue = vueJoueur(t, { seuilVisible: false });
    assert.equal(vue.transe.rejet.niveau, 0);
    assert.equal(vue.transe.rejet.sequelles, null);
    assert.equal(vue.transe.rejet.depassement, null);
  });

  test("la vue joueur ne modifie pas l'état", () => {
    const fin = arreter(tirer(rituel({ puissanceSecrete: true }), [S, S])).etat;
    const copie = structuredClone(fin);
    vueJoueur(fin, { seuilVisible: false });
    assert.deepEqual(fin, copie);
  });

  test("la répartition reste contrôlée par le moteur avec une Puissance secrète", () => {
    const fin = arreter(tirer(rituel({ puissanceSecrete: true, puissance: 1 }), [S, S, S])).etat;
    assert.equal(repartirAmeliorations(fin, { portee: 1 }).etat.rituel.repartition.cout, 1);
    doitEchouer(() => repartirAmeliorations(fin, { portee: 2 }), "repartition-invalide");
  });
});

describe("Références entre documents", () => {
  const voies = [
    { id: "v1", uuid: "Actor.a.Item.v1", sourceUuid: "Compendium.pn.voies.Item.AGWE", cle: "voie-d-agwe" },
    { id: "v2", uuid: "Actor.a.Item.v2", sourceUuid: null, cle: "voie-maison" }
  ];

  test("par UUID de la source (copie possédée d'un document de compendium)", () => {
    const r = voieDuPouvoir({ voieUuid: "Compendium.pn.voies.Item.AGWE", voie: "" }, voies);
    assert.equal(r.voie.id, "v1");
    assert.equal(r.mode, "uuid");
  });

  test("par UUID direct, puis repli sur la clé", () => {
    assert.equal(voieDuPouvoir({ voieUuid: "Actor.a.Item.v2" }, voies).voie.id, "v2");
    const r = voieDuPouvoir({ voieUuid: "", voie: "Voie maison" }, voies);
    assert.equal(r.voie.id, "v2");
    assert.equal(r.mode, "cle");
  });

  test("référence cassée signalée (Voie supprimée)", () => {
    const r = voieDuPouvoir({ voieUuid: "Compendium.pn.voies.Item.SUPPRIMEE", voie: "" }, voies);
    assert.equal(r.voie, null);
    assert.equal(r.referenceCassee, true);
    const repli = voieDuPouvoir({ voieUuid: "Compendium.pn.voies.Item.SUPPRIMEE", voie: "voie-maison" }, voies);
    assert.equal(repli.voie.id, "v2");
    assert.equal(repli.referenceCassee, false);
  });

  test("tri des références valides et cassées", () => {
    const connus = { a: { name: "A" } };
    const r = trierReferences(["a", "b", ""], u => connus[u] ?? null);
    assert.deepEqual(r.valides.map(x => x.uuid), ["a"]);
    assert.deepEqual(r.cassees, ["b", ""]);
  });
});

describe("Import des données officielles", () => {
  const lot = {
    religions: [{ nom: "Religion test", type: "possession", correspondances: ["Test"] }],
    voies: [{ nom: "Voie test", religion: "Religion test", domaine: "Essai" }],
    pouvoirs: [{ nom: "Pouvoir test", voie: "voie-test", puissance: 3, portee: "Ici", cible: "Toi", impact: "3", duree: "24 h" }]
  };

  test("lot valide : clés normalisées et liens résolus", () => {
    const p = preparerImport(lot);
    assert.equal(p.valide, true, p.erreurs.join(" "));
    assert.equal(p.religions[0].cle, "religion-test");
    assert.equal(p.voies[0].religion, "religion-test");
    assert.equal(p.pouvoirs[0].voie, "voie-test");
    assert.equal(p.pouvoirs[0].puissance, 3);
    assert.equal(p.pouvoirs[0].duree, "24 h");
  });

  test("erreurs détectées : doublon, liens absents, Puissance et type invalides", () => {
    const p = preparerImport({
      religions: [{ nom: "R", type: "inconnu" }, { nom: "R" }],
      voies: [{ nom: "V", religion: "Absente" }],
      pouvoirs: [{ nom: "P", voie: "nulle-part", puissance: 11 }, { voie: "v" }]
    });
    assert.equal(p.valide, false);
    const tout = p.erreurs.join(" | ");
    for (const motif of ["type inconnu", "en double", "religion « Absente »", "Voie « nulle-part »", "Puissance invalide", "nom manquant"]) {
      assert.ok(tout.includes(motif), `${motif} absent de : ${tout}`);
    }
  });

  test("données absentes refusées", () => {
    assert.equal(preparerImport(null).valide, false);
    assert.equal(preparerImport({}).valide, true);
  });
});

test("journal de Transe : chaque action réussie garde son type d'événement (correctif)", () => {
  let t = creerTranse({ typeReligion: "communion", valeurs: { foi: 5 }, auspices: {}, pouvoirsConnus: [{ id: "p1", nom: "A", puissance: 1 }, { id: "p2", nom: "B", puissance: 2 }] });
  t = solliciter(commencerAction(t, "entree", { cible: "p1" }).etat, S).etat;
  t = solliciter(commencerAction(t, "ascension", { cible: "p2" }).etat, S).etat;
  t = solliciter(commencerAction(t, "detachement").etat, S).etat;
  const reussites = t.journal.filter(j => j.type === "action-reussie");
  assert.deepEqual(reussites.map(j => j.action), ["entree", "ascension", "detachement"]);
  assert.deepEqual(reussites.map(j => j.niveau), [1, 2, 1]);
  assert.equal(reussites[2].pouvoir.id, "p2");
});

/**
 * Scénarios d'intégration A à J : service, moteur, examen secret, effets et garde-fous réels,
 * sur un Foundry simulé (tests/aides/foundry-simule.mjs). Ne remplace pas une validation dans Foundry.
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import * as F from "../aides/foundry-simule.mjs";

const S = await import("../../module/magie/service.mjs");
const V = await import("../../module/magie/service-evenements.mjs");
const M = await import("../../module/magie/moteur.mjs");
const { parametresEffectifs } = await import("../../module/magie/parametres.mjs");

const SUCCES = 2;
const COLERE = 9;
const tirer = async (actor, valeurs) => {
  for (const v of valeurs) { F.des.push(v); await S.solliciter(actor, {}); }
};
const voieDe = a => a.items.find(i => i.type === "voie");
const pouvoir = (a, nom) => a.items.find(i => i.name === nom);
const acte = a => S.acteCourant(a);
const examinerEnMJ = async a => { F.connecter(F.mj); await V.examinerActeur(a); F.connecter(F.joueur); };

/** Prêtre catholique : Foi 3, Faveurs 0 → Seuil 3 avec des Auspices nuls. */
async function pretre(nom = "Père Labat", o = {}) {
  return F.creerPersonnage({
    nom, religion: "Christianisme", type: "communion", chance: 0,
    voies: [{ nom: "Voie de Dieu", foi: 3 }],
    pouvoirs: [
      { nom: "Bénédiction", voie: "Voie de Dieu", puissance: 1, portee: "Toucher", cible: "Lui", duree: "24 h" },
      { nom: "Protection", voie: "Voie de Dieu", puissance: 2, portee: "Ici", cible: "Toi", duree: "30 minutes" },
      { nom: "Vision", voie: "Voie de Dieu", puissance: 3, portee: "Vue", cible: "Moi", duree: "10 secondes" }
    ],
    ...o
  });
}

const preparer = (a, o = {}) => ({ mode: "rituel", voieId: voieDe(a).id, beaute: 0, ...o });

before(() => {
  F.regler("magieAleaMode", "desactive");
  F.regler("magieRevelationSeuil", 0);
});

describe("Scénarios d'intégration", () => {
  test("A — Rituel simple : Pouvoir de Puissance 2, Succès suffisants, pas de Rejet", async () => {
    const a = await pretre("A");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { pouvoirId: pouvoir(a, "Protection").id, puissance: 2, souhait: "Protéger le navire" }));
    await tirer(a, [SUCCES, COLERE, SUCCES]);
    await S.arreter(a, {});
    let e = acte(a);
    assert.equal(e.statut, M.STATUT.TERMINE);
    assert.equal(e.rituel.resolution.suffisant, true);
    assert.equal(e.rituel.resolution.rejet, false);
    assert.equal(a.system.magie.colere.christianisme.valeur, 1);          // Colère reportée sur la fiche
    F.connecter(F.mj);
    await S.validerNarration(a, { accordee: true, note: "Le vent tombe" });
    await V.examinerActeur(a);
    const h = a.system.magie.historique.at(-1);
    assert.equal(h.resultat, "suffisant");
    assert.equal(h.validation, "accordee");
    assert.equal(h.souhait, "Protéger le navire");
    assert.equal(a.system.magie.interventions.at(-1).nature, "narrative");
  });

  test("B — Rituel renforcé : améliorations de plusieurs paramètres dans le budget, prévisualisées et journalisées", async () => {
    const a = await pretre("B");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { pouvoirId: pouvoir(a, "Protection").id, puissance: 2 }));
    await tirer(a, [SUCCES, SUCCES, SUCCES, SUCCES, SUCCES]);             // budget 3
    await S.arreter(a, {});
    await assert.rejects(S.repartir(a, { portee: 2, duree: 1 }, {}), /répartition coûte 4/);
    await S.repartir(a, { portee: 1, duree: 1 }, {});
    const e = acte(a);
    assert.equal(e.rituel.repartition.cout, 2);
    assert.ok(e.journal.some(j => j.type === "repartition" && j.cout === 2));
    const p = parametresEffectifs(pouvoir(a, "Protection").system, { portee: 1, duree: 1 });
    assert.equal(p.portee.resultat, "Là (100 m)");
    assert.equal(p.duree.resultat, "4 heures");
    await examinerEnMJ(a);
    assert.equal(a.system.magie.historique.at(-1).ameliorations, 2);
  });

  test("C — Rituel insuffisant : arrêt volontaire après un Succès sous la Puissance", async () => {
    const a = await pretre("C");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 3 }));
    await tirer(a, [COLERE]);
    await assert.rejects(S.arreter(a, {}), /jusqu'à obtenir un Succès/);
    await tirer(a, [SUCCES]);
    await S.arreter(a, {});
    assert.equal(acte(a).rituel.resolution.suffisant, false);
    await examinerEnMJ(a);
    assert.equal(a.system.magie.historique.at(-1).resultatLabel, "Rituel insuffisant");
  });

  test("D — Rejet en Rituel : tirage poursuivi jusqu'au Succès, Rejet en fin de tirage, archivé", async () => {
    const a = await pretre("D");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 1, pouvoirId: pouvoir(a, "Bénédiction").id }));
    await tirer(a, [COLERE, COLERE, COLERE, COLERE]);                      // Colère 4 > Seuil 3
    assert.equal(acte(a).statut, M.STATUT.EN_COURS);                      // pas de Rejet avant la fin du tirage
    await assert.rejects(S.arreter(a, {}));
    await tirer(a, [SUCCES]);
    await S.arreter(a, {});
    assert.equal(acte(a).statut, M.STATUT.REJET);
    await examinerEnMJ(a);
    const r = a.system.magie.rejets.at(-1);
    assert.equal(r.depassement, 1);
    assert.equal(r.typeActe, "rituel");
    assert.equal(r.puissance, 1);
    assert.equal(a.system.magie.historique.at(-1).rejet, true);
  });

  test("E — Transe complète : entrée, ascensions, activation, descente jusqu'à zéro", async () => {
    const a = await pretre("E", { voies: [{ nom: "Voie de Dieu", foi: 9 }] });
    F.connecter(F.joueur);
    await S.demarrerActe(a, { mode: "transe", voieId: voieDe(a).id, dureeRites: 10 });
    const ids = ["Bénédiction", "Protection", "Vision"].map(n => pouvoir(a, n).id);
    await S.commencerAction(a, "entree", ids[0], {}); await tirer(a, [SUCCES]);
    await S.commencerAction(a, "ascension", ids[1], {}); await tirer(a, [COLERE, SUCCES]);
    await S.commencerAction(a, "ascension", ids[2], {}); await tirer(a, [SUCCES]);
    assert.equal(acte(a).transe.niveau, 3);
    await S.activerPouvoir(a, ids[1], {});
    for (let i = 0; i < 3; i++) { await S.commencerAction(a, "detachement", null, {}); await tirer(a, [SUCCES]); }
    const e = acte(a);
    assert.equal(e.statut, M.STATUT.TERMINE);
    assert.equal(e.fin.mode, "sortie");
    assert.equal(e.transe.niveauMax, 3);
    await examinerEnMJ(a);
    const h = a.system.magie.historique.at(-1);
    assert.equal(h.resultat, "sortie");
    assert.equal(h.niveauMax, 3);
  });

  test("F — Rejet en Transe pendant une ascension : arrêt immédiat, effets de l'acte révoqués", async () => {
    const a = await pretre("F");
    const cible = await F.creerPersonnage({ nom: "Marin", proprietaire: "autre" });
    const prot = pouvoir(a, "Bénédiction");
    await prot.createEmbeddedDocuments("ActiveEffect", [{ name: "Bénie", changes: [{ key: "system.caracs.pou.value", mode: 2, value: "1" }] }]);
    F.cibler(F.joueur, cible);
    F.connecter(F.joueur);
    await S.demarrerActe(a, { mode: "transe", voieId: voieDe(a).id, dureeRites: 10 });
    await S.commencerAction(a, "entree", prot.id, {}); await tirer(a, [SUCCES]);
    await S.activerPouvoir(a, prot.id, {});
    F.connecter(F.mj);
    await S.appliquerEffetsActe(a, { activation: 1 });
    assert.equal(cible.effects.length, 1);
    assert.equal(cible.effects[0].duration.seconds, 86400);                // Durée 24 h (table p. 100)
    F.connecter(F.joueur);
    await S.commencerAction(a, "ascension", pouvoir(a, "Protection").id, {});
    await tirer(a, [COLERE, COLERE, COLERE]);
    assert.equal(acte(a).statut, M.STATUT.EN_COURS);
    await tirer(a, [COLERE]);                                                // Colère 4 > Seuil 3 : Rejet immédiat
    const e = acte(a);
    assert.equal(e.statut, M.STATUT.REJET);
    assert.equal(e.transe.rejet.niveau, 1);
    await assert.rejects(S.solliciter(a, {}), /terminé/);
    await examinerEnMJ(a);
    assert.equal(cible.effects.length, 0);                                   // « tous les Pouvoirs activés sont annulés »
    assert.equal(a.system.magie.rejets.at(-1).niveauRejet, 1);
  });

  test("G — Révélation : déclenchée en secret, validée par le MJ, Pouvoir enregistré avec sa compulsion", async () => {
    F.regler("magieRevelationSeuil", 2);
    const a = await pretre("G");
    F.connecter(F.mj);
    await V.assurerCle();
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 3 }));
    await tirer(a, [SUCCES, SUCCES, SUCCES]);
    F.des.push(5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 10, 2);       // révélation au 3e lancer (pourcentage 02)
    await examinerEnMJ(a);
    F.regler("magieRevelationSeuil", 0);
    F.connecter(F.mj);
    const rev = (await V.lireCoffre(a)).revelations.at(-1);
    assert.equal(rev.succesAvant, 2);
    assert.equal(rev.puissance, 2);                                          // plafond Foi + 1 = 4 non atteint
    assert.ok(!JSON.stringify(a.system).includes("revelation"));
    await V.resoudreRevelation(a, rev.id, { decision: "accepter", nouveau: { nom: "Lumière" }, compulsion: "Allumer un cierge chaque nuit" });
    const p = pouvoir(a, "Lumière");
    assert.equal(p.system.puissance, 2);
    assert.equal(p.system.accessible, false);
    assert.equal(p.system.voieUuid, voieDe(a).uuid);
    assert.ok(a.system.magie.interventions.some(i => i.action.startsWith("Révélation acceptée")));
    F.connecter(F.joueur);
  });

  test("H — Récupération : 1 point de Colère par heure de temps du monde, sans double déclenchement", async () => {
    const a = await pretre("H");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 1 }));
    await tirer(a, [COLERE, COLERE, SUCCES]);
    await S.arreter(a, {});
    assert.equal(a.system.magie.colere.christianisme.valeur, 2);
    F.connecter(F.mj);
    F.avancerTemps(3600 + 1800);
    await S.surAvanceeDuTemps(game.time.worldTime);
    await S.surAvanceeDuTemps(game.time.worldTime);                          // second appel : aucun effet
    assert.equal(a.system.magie.colere.christianisme.valeur, 1);
    F.avancerTemps(10 * 3600);                                               // grand saut temporel
    await S.surAvanceeDuTemps(game.time.worldTime);
    assert.equal(a.system.magie.colere.christianisme.valeur, 0);
    F.connecter(F.joueur);
  });

  test("I — Reconnexion : acte poursuivi après déconnexion, examen rattrapé au retour du MJ", async () => {
    F.regler("magieRevelationSeuil", 100);
    const a = await pretre("I");
    F.mjConnecte(false);
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 2 }));
    await tirer(a, [SUCCES]);
    // Le joueur se déconnecte : l'état est relu depuis les données enregistrées
    const relu = M.deserialiserActe(a.getFlag("pavillon-noir-2", "acte"));
    assert.equal(relu.lancers.length, 1);
    assert.equal(relu.seq, acte(a).seq);
    await tirer(a, [SUCCES]);
    await S.arreter(a, {});
    assert.equal(a.getFlag("pavillon-noir-2", "examen"), undefined);        // aucun examen sans MJ
    F.mjConnecte(true);
    F.connecter(F.mj);
    await V.examinerTout();
    const ex = JSON.parse(a.getFlag("pavillon-noir-2", "examen"));
    assert.deepEqual(ex.examines, [1, 2]);
    assert.equal((await V.lireCoffre(a)).revelations.length, 2);
    await V.examinerTout();                                                   // reprise idempotente
    assert.equal((await V.lireCoffre(a)).revelations.length, 2);
    F.regler("magieRevelationSeuil", 0);
    F.connecter(F.joueur);
  });

  test("J — Permissions : secrets du MJ illisibles, données d'autrui et conséquences protégées", async () => {
    const a = await pretre("J");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 1 }));
    await tirer(a, [SUCCES]);
    // Un autre joueur ne peut pas agir sur ce personnage
    F.connecter(F.autre);
    await assert.rejects(S.solliciter(a, {}), /droits/);
    await assert.rejects(S.modifierColere(a, "christianisme", 1), /droits/);
    // Le propriétaire ne lit pas le coffre et ne modifie pas ses pénitences
    F.connecter(F.joueur);
    await assert.rejects(V.lireCoffre(a), /MJ/);
    assert.equal(await a.update({ "system.magie.penitences": [] }), undefined);
    assert.equal(await a.update({ "system.magie.historique": [] }), undefined);
    await assert.rejects(S.reduireColere(a, "christianisme", 1), /MJ/);
    await assert.rejects(S.interrompre(a, { motif: "fuite" }), /MJ/);       // pas d'interruption pour fuir une série
    // Puissance secrète : absente des messages et de la vue des joueurs
    await S.arreter(a, {});
    F.connecter(F.mj);
    const b = await pretre("J2");
    await S.demarrerActe(b, preparer(b, { puissance: 7, puissanceSecrete: true }));
    F.connecter(F.joueur);
    await S.reprendre(b, {}).catch(() => {});
    const vue = M.vueJoueur(acte(b), { seuilVisible: false });
    assert.equal(vue.rituel.puissance, null);
    const pourJoueur = F.messages.filter(m => (m.whisper ?? []).includes("joueur") || !m.whisper?.length).map(m => m.content).join(" ");
    assert.ok(!pourJoueur.includes('"puissance":7'), "Puissance secrète envoyée à un joueur");
    assert.ok(!pourJoueur.includes('"seuil":3'), "Seuil envoyé à un joueur");
  });

  test("Corrections administratives : motif obligatoire, tracées et distinguées des décisions narratives", async () => {
    const a = await pretre("K");
    F.connecter(F.joueur);
    await S.demarrerActe(a, preparer(a, { puissance: 2 }));
    await tirer(a, [COLERE]);
    F.connecter(F.mj);
    await assert.rejects(S.clotureAdministrative(a, ""), /motif/);
    await S.clotureAdministrative(a, "Acte bloqué après un plantage");
    assert.equal(acte(a).fin.mode, "administratif");
    assert.equal(a.system.magie.colere.christianisme.valeur, 1);              // la Colère tirée reste acquise
    await S.corrigerColere(a, "christianisme", 0, "Erreur de saisie");
    const j = a.system.magie.interventions;
    assert.deepEqual(j.slice(-2).map(x => x.nature), ["administrative", "administrative"]);
    await V.examinerActeur(a);
    assert.equal(a.system.magie.historique.at(-1).resultat, "administratif");
    F.connecter(F.joueur);
  });
});

/**
 * Phase 4 : paramètres (tables p. 100), historique, journal des interventions, compatibilité, import sans doublon.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { trouverCategorie, ameliorer, parametresEffectifs, dureeEnSecondes, verifierParametres } from "../../module/magie/parametres.mjs";
import { entreeHistorique, majHistorique, intervention, ajouterIntervention, NATURE, MAX_ENTREES, resultatActe } from "../../module/magie/journal.mjs";
import { creerRituel, creerTranse, solliciter, arreter, commencerAction, repartirAmeliorations, validerNarration, clotureAdministrative,
  deserialiserActe, serialiserActe, normaliserActe, STATUT } from "../../module/magie/moteur.mjs";
import { preparerImport, planImport, cleImport } from "../../module/magie/references.mjs";
import { validerRepartition, coutAugmentations, MagieError } from "../../module/magie/regles.mjs";

const S = 1;
const C = 10;
const tirer = (e, vals) => vals.reduce((x, v) => solliciter(x, v).etat, e);
const rituel = o => creerRituel({ id: "r", typeReligion: "communion", valeurs: { foi: 3 }, auspices: {}, puissance: 2, voie: { nom: "Voie de Dieu" }, ...o });

describe("Paramètres des Pouvoirs (tables officielles p. 100)", () => {
  test("une augmentation = une catégorie, sur les quatre paramètres", () => {
    assert.equal(ameliorer("portee", "Toucher", 1).resultat, "Ici (10 m)");
    assert.equal(ameliorer("cible", "Lui", 2).resultat, "Vous");
    assert.equal(ameliorer("impact", "3", 1).resultat, "5");
    assert.equal(ameliorer("duree", "24 h", 1).resultat, "1 semaine");
  });

  test("alias et valeurs numériques de l'Impact", () => {
    assert.equal(trouverCategorie("portee", "Là-bas"), 5);
    assert.equal(trouverCategorie("portee", "Vue"), 4);
    assert.equal(trouverCategorie("impact", 7), 4);
    assert.equal(trouverCategorie("impact", 12), 6);
  });

  test("Impact de base = Puissance si non renseigné", () => {
    assert.equal(parametresEffectifs({ puissance: 4 }, {}).impact.base, "3-4");
  });

  test("catégories réservées à l'accord du MJ et plafond", () => {
    assert.equal(ameliorer("cible", "Eux", 1).accordMJ, true);
    const p = ameliorer("portee", "Continent", 5);
    assert.equal(p.resultat, "Terre");
    assert.equal(p.plafond, true);
  });

  test("valeur hors table conservée et signalée, jamais inventée", () => {
    const d = ameliorer("duree", "1 cycle", 2);
    assert.equal(d.horsTable, true);
    assert.equal(d.resultat, "1 cycle (+2 catégories)");
    assert.equal(dureeEnSecondes("1 cycle"), null);
    assert.deepEqual(verifierParametres({ portee: "Ici", duree: "1 nuit" }), ["Durée « 1 nuit » absente des tables (conservée telle quelle)."]);
  });

  test("durées en secondes pour les effets Foundry ; Permanent sans durée", () => {
    assert.equal(dureeEnSecondes("10 secondes"), 10);
    assert.equal(dureeEnSecondes("4 h"), 14400);
    assert.equal(dureeEnSecondes("Permanent"), null);
  });

  test("coût des augmentations conforme à la table (1, 3, 6, 10 Lames droites)", () => {
    assert.deepEqual([1, 2, 3, 4].map(coutAugmentations), [1, 3, 6, 10]);
    assert.equal(validerRepartition({ cible: 3, portee: 1 }, 7).valide, true);   // exemple du supplément : 6 + 1 = 7
  });
});

describe("Historique des actes", () => {
  test("entrée d'un Rituel terminé, mise à jour après validation du MJ et répartition", () => {
    let e = arreter(tirer(rituel({ souhait: "Pluie", pouvoir: { id: "p", nom: "Bénédiction", puissance: 1 } }), [S, S, S])).etat;
    let h = entreeHistorique(e);
    assert.equal(h.resultat, "suffisant");
    assert.equal(h.validation, "en-attente");
    e = repartirAmeliorations(e, { portee: 1 }).etat;
    e = validerNarration(e, { accordee: true, note: "Averse" }).etat;
    h = entreeHistorique(e);
    assert.equal(h.ameliorations, 1);
    assert.equal(h.validation, "accordee");
    assert.equal(h.noteMJ, "Averse");
    assert.equal(entreeHistorique(tirer(rituel(), [S])), null);              // acte en cours : pas d'entrée
  });

  test("Puissance secrète absente de l'historique jusqu'à la validation du MJ", () => {
    const e = arreter(tirer(rituel({ puissance: 2, puissanceSecrete: true }), [S, S])).etat;
    assert.equal(entreeHistorique(e).puissance, null);
    assert.equal(entreeHistorique(validerNarration(e, { accordee: true }).etat).puissance, 2);
  });

  test("Transe : sortie, niveau maximal ; Rejet signalé", () => {
    let t = creerTranse({ id: "t", typeReligion: "communion", valeurs: { foi: 6 }, auspices: {}, pouvoirsConnus: [{ id: "a", nom: "A", puissance: 1 }] });
    t = tirer(commencerAction(tirer(commencerAction(t, "entree", { cible: "a" }).etat, [S]), "detachement").etat, [S]);
    assert.equal(resultatActe(t), "sortie");
    assert.equal(entreeHistorique(t).niveauMax, 1);
    const rejet = arreter(tirer(rituel({ valeurs: { foi: 0 } }), [C, S])).etat;
    assert.equal(entreeHistorique(rejet).rejet, true);
  });

  test("mise à jour idempotente et historique borné", () => {
    const e = arreter(tirer(rituel(), [S, S])).etat;
    const h1 = majHistorique([], entreeHistorique(e));
    assert.equal(h1.length, 1);
    assert.equal(majHistorique(h1, entreeHistorique(e)), null);            // rien ne change : aucune écriture
    const plein = Array.from({ length: MAX_ENTREES }, (_, i) => ({ id: `x${i}` }));
    assert.equal(majHistorique(plein, { id: "nouveau" }).length, MAX_ENTREES);
  });
});

describe("Journal des interventions du MJ", () => {
  test("décisions narratives et corrections administratives distinguées", () => {
    const a = intervention({ nature: NATURE.NARRATIVE, action: "Intervention accordée" });
    const b = intervention({ nature: NATURE.ADMINISTRATIVE, action: "Colère corrigée", detail: "Erreur" });
    const j = ajouterIntervention(ajouterIntervention([], a), b);
    assert.deepEqual(j.map(x => x.nature), ["narrative", "administrative"]);
    assert.throws(() => intervention({ nature: NATURE.JOUEUR, action: "x" }));
    assert.throws(() => intervention({ nature: NATURE.NARRATIVE }));
  });

  test("clôture administrative : motif obligatoire, Colère conservée, pas de Rejet", () => {
    const e = tirer(rituel({ valeurs: { foi: 0 } }), [C, C]);
    assert.throws(() => clotureAdministrative(e, { motif: " " }), err => err instanceof MagieError && err.code === "motif");
    const f = clotureAdministrative(e, { motif: "Plantage" }).etat;
    assert.equal(f.statut, STATUT.ANNULE);
    assert.equal(f.fin.mode, "administratif");
    assert.equal(f.colereGagnee, 2);
    assert.equal(f.rituel.resolution, null);
  });
});

describe("Compatibilité des données enregistrées", () => {
  test("un acte de la phase 1 (sans les champs ajoutés depuis) est complété à la lecture", () => {
    const ancien = { schema: 1, id: "v", type: "transe", statut: "en-cours", seq: 3, lancers: [{ n: 1, valeur: 2, resultat: "succes" }],
      journal: [], requetes: [], transe: { actif: true, niveau: 1, chemin: [], activations: [], cycle: { dureeMinutes: 5, debutNiveau: 0 } }, champInconnu: "conservé" };
    const e = deserialiserActe(JSON.stringify(ancien));
    assert.deepEqual(e.transe.quetes, []);
    assert.equal(e.transe.cycle.alerte, null);
    assert.equal(e.lancers[0].niveau, null);
    assert.deepEqual(e.lancers[0].evenements, []);
    assert.deepEqual(e.cibles, []);
    assert.equal(e.champInconnu, "conservé");
    assert.deepEqual(normaliserActe(structuredClone(e)), e);                  // idempotent
  });

  test("un Rituel de la phase 1 reçoit les champs de la phase 2 sans perdre ses données", () => {
    const ancien = { schema: 1, id: "w", type: "rituel", statut: "termine", seq: 2, lancers: [], journal: [], requetes: [],
      rituel: { souhait: "Paix", puissance: 2, resolution: { suffisant: true } } };
    const e = deserialiserActe(ancien);
    assert.equal(e.rituel.souhait, "Paix");
    assert.equal(e.rituel.puissanceSecrete, false);
    assert.equal(e.rituel.narration, null);
    assert.equal(deserialiserActe(serialiserActe(e)).rituel.souhait, "Paix");
  });
});

describe("Import sans doublon", () => {
  const lot = {
    religions: [{ nom: "Vaudou", type: "possession" }],
    voies: [{ nom: "Voie d'Agwé", religion: "Vaudou" }],
    pouvoirs: [{ nom: "Météo marine", voie: "Voie d'Agwé", puissance: 1, portee: "Là-bas", cible: "Moi", duree: "24 h", application: "assiste" },
      { nom: "Force fluide", voie: "Voie d'Agwé", puissance: 2, portee: "Là", duree: "1 cycle" }],
    aleas: [{ nom: "Présage funeste", sens: "renverse", typesActe: ["rituel"], poids: 2 }]
  };

  test("lot complet validé, Aléas compris ; paramètres hors table signalés sans bloquer", () => {
    const p = preparerImport(lot);
    assert.equal(p.valide, true, p.erreurs.join(" "));
    assert.equal(p.aleas[0].cle, "presage-funeste");
    assert.equal(p.pouvoirs[0].cle, "voie-d-agwe-meteo-marine");
    assert.equal(p.pouvoirs[0].application, "assiste");
    assert.ok(p.avertissements.some(a => a.includes("1 cycle")));
  });

  test("erreurs : doublon de Pouvoir, mode d'application, sens et poids d'Aléa", () => {
    const p = preparerImport({ ...lot, pouvoirs: [...lot.pouvoirs, lot.pouvoirs[0], { nom: "X", voie: "Voie d'Agwé", puissance: 1, application: "magique" }],
      aleas: [{ nom: "A", sens: "travers" }, { nom: "B", poids: -1 }] });
    const t = p.erreurs.join(" | ");
    for (const m of ["en double", "mode d'application inconnu", "sens inconnu", "poids invalide"]) assert.ok(t.includes(m), m);
  });

  test("un second import met à jour au lieu de dupliquer", () => {
    const p = preparerImport(lot);
    const existants = new Map([[cleImport("pouvoir", "voie-d-agwe-meteo-marine"), "id-existant"]]);
    const plan = planImport("pouvoir", p.pouvoirs, existants);
    assert.equal(plan.maj.length, 1);
    assert.equal(plan.maj[0].id, "id-existant");
    assert.equal(plan.creer.length, 1);
    assert.equal(plan.creer[0].nom, "Force fluide");
  });
});

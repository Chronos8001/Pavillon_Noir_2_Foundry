import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resoudreD10, calculerAuspices, calculerSeuil, depasseSeuil, budgetAmeliorations, coutAugmentation,
  coutAugmentations, validerRepartition, recupererColere, dureeCycle, etatCycle, MagieError, RESULTAT
} from "../../module/magie/regles.mjs";
import { MAGIE } from "../../module/magie/config-magie.mjs";

describe("d10 sacré", () => {
  test("1 à 5 : Succès sacré", () => {
    for (let v = 1; v <= 5; v++) {
      const r = resoudreD10(v);
      assert.equal(r.resultat, RESULTAT.SUCCES, `valeur ${v}`);
      assert.equal(r.dSucces, 1);
      assert.equal(r.dColere, 0);
    }
  });

  test("6 à 10 : Colère divine", () => {
    for (let v = 6; v <= 10; v++) {
      const r = resoudreD10(v);
      assert.equal(r.resultat, RESULTAT.COLERE, `valeur ${v}`);
      assert.equal(r.dSucces, 0);
      assert.equal(r.dColere, 1);
    }
  });

  test("aucun résultat ne produit deux points de Colère ni de critique", () => {
    for (let v = 1; v <= 10; v++) {
      const r = resoudreD10(v);
      assert.ok(r.dColere <= 1 && r.dSucces <= 1);
      assert.equal(r.dColere + r.dSucces, 1);
      assert.deepEqual(Object.keys(r).sort(), ["dColere", "dSucces", "resultat", "valeur"]);
    }
  });

  test("valeurs hors d10 refusées", () => {
    for (const v of [0, 11, -1, 2.5, NaN, "3"]) assert.throws(() => resoudreD10(v), MagieError);
  });

  test("les faces du d10 se répartissent exactement 5 / 5 (distribution théorique 50 %)", () => {
    const faces = Array.from({ length: MAGIE.d10.faces }, (_, i) => resoudreD10(i + 1));
    assert.equal(faces.filter(f => f.resultat === RESULTAT.SUCCES).length, 5);
    assert.equal(faces.filter(f => f.resultat === RESULTAT.COLERE).length, 5);
  });
});

describe("Auspices", () => {
  test("Auspices positifs", () => {
    const a = calculerAuspices({ actesFoi: 3, affinite: 1, beaute: 2, peches: 1 });
    assert.equal(a.total, 5);
  });

  test("Auspices négatifs", () => {
    const a = calculerAuspices({ actesFoi: 0, affinite: -1, beaute: -2, peches: 4 });
    assert.equal(a.total, -7);
  });

  test("composantes absentes = 0, valeurs non entières refusées", () => {
    assert.equal(calculerAuspices({}).total, 0);
    assert.throws(() => calculerAuspices({ beaute: 1.5 }), MagieError);
  });
});

describe("Seuil de Rejet", () => {
  const valeurs = { foi: 3, mysteres: 5 };

  test("communion : Foi + Faveurs + Auspices", () => {
    const s = calculerSeuil({ type: "communion", valeurs, faveurs: 1, auspices: 2 });
    assert.equal(s.stat, "foi");
    assert.equal(s.seuil, 6);
  });

  test("possession : Connaissance des Mystères + Faveurs + Auspices", () => {
    const s = calculerSeuil({ type: "possession", valeurs, faveurs: 1, auspices: 2 });
    assert.equal(s.stat, "mysteres");
    assert.equal(s.seuil, 8);
  });

  test("le type est lu dans la configuration, pas codé en dur", () => {
    const types = { ...MAGIE.types, syncretisme: { label: "Test", stat: "mysteres", statLabel: "CdM" } };
    assert.equal(calculerSeuil({ type: "syncretisme", valeurs, faveurs: 0, auspices: 0 }, types).seuil, 5);
  });

  test("Seuil négatif conservé tel quel et signalé", () => {
    const s = calculerSeuil({ type: "communion", valeurs: { foi: 1 }, faveurs: -2, auspices: -3 });
    assert.equal(s.seuil, -4);
    assert.equal(s.negatif, true);
  });

  test("type inconnu ou absent : erreur explicite", () => {
    assert.throws(() => calculerSeuil({ type: "", valeurs }), e => e.code === "type-religion");
    assert.throws(() => calculerSeuil({ type: "inconnu", valeurs }), e => e.code === "type-religion");
  });

  test("le Rejet exige de dépasser strictement le Seuil", () => {
    assert.equal(depasseSeuil(5, 5), false);
    assert.equal(depasseSeuil(6, 5), true);
    assert.equal(depasseSeuil(0, -1), true);
  });
});

describe("Améliorations des Pouvoirs", () => {
  test("budget = Succès − Puissance, jamais négatif", () => {
    assert.equal(budgetAmeliorations(7, 4), 3);
    assert.equal(budgetAmeliorations(4, 4), 0);
    assert.equal(budgetAmeliorations(2, 4), 0);
  });

  test("coût de la k-ième augmentation et coût cumulé N(N+1)/2", () => {
    assert.deepEqual([1, 2, 3, 4].map(coutAugmentation), [1, 2, 3, 4]);
    assert.deepEqual([0, 1, 2, 3, 4].map(coutAugmentations), [0, 1, 3, 6, 10]);
    assert.throws(() => coutAugmentation(0), MagieError);
    assert.throws(() => coutAugmentations(-1), MagieError);
  });

  test("répartition valide, paramètres indépendants", () => {
    const v = validerRepartition({ cible: 3, portee: 1 }, 7);
    assert.equal(v.valide, true);
    assert.equal(v.cout, 7);
    assert.equal(v.reste, 0);
  });

  test("répartition au-delà du budget refusée", () => {
    const v = validerRepartition({ impact: 2, duree: 1 }, 3);
    assert.equal(v.cout, 4);
    assert.equal(v.valide, false);
  });

  test("paramètre inconnu ou valeur invalide refusés", () => {
    assert.equal(validerRepartition({ vitesse: 1 }, 10).valide, false);
    assert.equal(validerRepartition({ portee: -1 }, 10).valide, false);
    assert.equal(validerRepartition({ portee: 1.5 }, 10).valide, false);
  });
});

describe("Récupération de la Colère", () => {
  const H = 3600;

  test("1 point par heure entière après la fin de l'acte", () => {
    const r = recupererColere({ valeur: 6, reference: 1000, maintenant: 1000 + 4 * H + 1800 });
    assert.equal(r.recuperes, 4);
    assert.equal(r.valeur, 2);
    assert.equal(r.reference, 1000 + 4 * H); // la demi-heure restante est conservée
  });

  test("idempotente : rappeler au même instant ne récupère rien de plus", () => {
    const t = 10 * H;
    const r1 = recupererColere({ valeur: 6, reference: 0, maintenant: t });
    const r2 = recupererColere({ valeur: r1.valeur, reference: r1.reference, maintenant: t });
    assert.equal(r1.valeur, 0);
    assert.equal(r2.recuperes, 0);
  });

  test("pas de récupération pendant un acte sacré (Transe ou Rituel en cours)", () => {
    const r = recupererColere({ valeur: 3, reference: 0, maintenant: 5 * H, acteEnCours: true });
    assert.equal(r.recuperes, 0);
    assert.equal(r.valeur, 3);
  });

  test("pas de récupération bloquée, sans référence, ou si le temps recule", () => {
    assert.equal(recupererColere({ valeur: 3, reference: 0, maintenant: 5 * H, bloquee: true }).recuperes, 0);
    assert.equal(recupererColere({ valeur: 3, reference: null, maintenant: 5 * H }).recuperes, 0);
    assert.equal(recupererColere({ valeur: 3, reference: 5 * H, maintenant: H }).recuperes, 0);
  });

  test("la récupération ne descend jamais sous zéro", () => {
    const r = recupererColere({ valeur: 2, reference: 0, maintenant: 9 * H });
    assert.equal(r.valeur, 0);
    assert.equal(r.recuperes, 2);
  });
});

describe("Cycle de Transe", () => {
  test("durée des Rites, une minute au minimum, trente minutes en Transe instantanée", () => {
    assert.equal(dureeCycle({ dureeRitesMinutes: 10 }), 10);
    assert.equal(dureeCycle({ dureeRitesMinutes: 0 }), 1);
    assert.equal(dureeCycle({ dureeRitesMinutes: 0.2 }), 1);
    assert.equal(dureeCycle({ dureeRitesMinutes: 45, instantanee: true }), 30);
  });

  test("échéance au niveau courant", () => {
    const c = { dureeMinutes: 10, debutNiveau: 100 };
    assert.deepEqual(etatCycle(c, 400), { echeance: 700, restant: 300, depasse: false });
    assert.equal(etatCycle(c, 701).depasse, true);
    assert.equal(etatCycle({ dureeMinutes: 10, debutNiveau: null }, 0).echeance, null);
  });
});

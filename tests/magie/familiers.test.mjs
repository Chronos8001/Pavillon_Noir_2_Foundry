/**
 * Règles des familiers de l'Arbre inversé (Entre ciel et terre, p. 163-169).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categorieFamilier, puissanceFamilier, rangFamilier, capaciteFamilier, tirerCapacites, fiabiliteFamilier,
  maxFamiliers, obeissanceFamilier, CAPACITES_FAMILIER, CATEGORIES_FAMILIER, ETRES_DAMNES
} from "../../module/magie/familiers.mjs";
import { calculerFamilier, familierVierge } from "../../module/magie/service-familier.mjs";

test("catégorie selon D20 + modificateur", () => {
  assert.equal(categorieFamilier(-1), "nephilim");
  assert.equal(categorieFamilier(4), "nephilim");
  assert.equal(categorieFamilier(5), "rephaim");
  assert.equal(categorieFamilier(8), "rephaim");
  assert.equal(categorieFamilier(9), "anakim");
  assert.equal(categorieFamilier(12), "anakim");
  assert.equal(categorieFamilier(13), "amalekite");
  assert.equal(categorieFamilier(16), "amalekite");
  assert.equal(categorieFamilier(17), "geburim");
  assert.equal(categorieFamilier(22), "geburim");
  assert.equal(categorieFamilier(22, "damne"), "damne");
  for (const c of Object.values(CATEGORIES_FAMILIER)) if (c.nom !== "Être spirituel damné") assert.equal(c.pouvoirs.length, 5, c.nom);
  assert.equal(ETRES_DAMNES.length, 9);
});

test("Puissance et rang du familier", () => {
  assert.equal(puissanceFamilier(5, 3), 8);
  assert.equal(rangFamilier(1), 0);
  assert.equal(rangFamilier(3), 0);
  assert.equal(rangFamilier(4), 1);
  assert.equal(rangFamilier(9), 2);
  assert.equal(rangFamilier(12), 3);
  assert.equal(rangFamilier(13), 4);
  assert.equal(rangFamilier(25), 4);
});

test("capacités spéciales : table D100 complète, relance double sur 99-100", () => {
  for (let v = 1; v <= 98; v++) assert.ok(capaciteFamilier(v), `D100 = ${v}`);
  assert.equal(capaciteFamilier(99), null);
  assert.equal(capaciteFamilier(100), null);
  // Plages contiguës sans chevauchement
  let attendu = 1;
  for (const [min, max] of CAPACITES_FAMILIER) { assert.equal(min, attendu); attendu = max + 1; }
  assert.equal(attendu, 99);
  const des = [99, 1, 54];
  const caps = tirerCapacites(() => des.shift());
  assert.deepEqual(caps.map(c => c.nom), ["Animal", "Oracle"]);
});

test("fiabilité, maximum et obéissance", () => {
  assert.equal(fiabiliteFamilier(7, 4, 0), 8);
  assert.equal(fiabiliteFamilier(1, 1, -5), -6);
  assert.equal(fiabiliteFamilier(10, 6, 2), 15);
  assert.equal(maxFamiliers(5), 3);
  assert.equal(maxFamiliers(4), 2);
  assert.equal(maxFamiliers(0), 0);
  assert.equal(obeissanceFamilier(5, 8), "obeit");
  assert.equal(obeissanceFamilier(8, 8), "tergiverse");
  assert.equal(obeissanceFamilier(9, 8), "refus");
  assert.equal(obeissanceFamilier(10, 15), "danger");
  assert.equal(obeissanceFamilier(7, 6, 2), "obeit");     // choyé
  assert.equal(obeissanceFamilier(5, 6, -2), "refus");    // maltraité
});

test("calcul complet d'un familier à partir de l'état de la fiche", () => {
  // Pouvoir d'invocation de Puissance 5 + 3 Succès réservés : Puissance 8 (Démon) ; D20 11 + violence 2 = 13 : Amalekite
  const e = { ...familierVierge(), puissanceInvocation: 5, succes: 3, d20: 11, violence: "2", d10: 6, d6: 2, reputation: "fiable" };
  const c = calculerFamilier(e);
  assert.equal(c.cle, "amalekite");
  assert.equal(c.puissance, 8);
  assert.equal(c.rangLabel, "Démon");
  assert.match(c.pouvoir, /^Cri de la Mort/);
  assert.equal(c.fiabilite, 7);   // 6 + 2 − 3 + 2
  // Être spirituel damné : le D10 choisit le pouvoir
  const d = calculerFamilier({ ...familierVierge(), d20: 19, choixHaut: "damne", d10Damne: 9 });
  assert.equal(d.cle, "damne");
  assert.match(d.pouvoir, /^Ange déchu/);
  assert.equal(calculerFamilier(familierVierge()).categorie, null);
});

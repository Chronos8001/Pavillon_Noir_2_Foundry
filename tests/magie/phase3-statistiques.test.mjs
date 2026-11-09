/**
 * Simulations des probabilités de la phase 3 (séparées des tests déterministes).
 * Générateur à graine fixe ; dans Foundry, les dés réels sont tirés avec Roll.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { testerPourcentage, uniformeParD10, pourcentageD10 } from "../../module/magie/evenements.mjs";

function mulberry32(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const d10 = alea => 1 + Math.floor(alea() * 10);

test("deux d10 couvrent uniformément 1 à 100", () => {
  const vus = new Set();
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) vus.add(pourcentageD10(a, b));
  assert.equal(vus.size, 100);
  assert.equal(Math.min(...vus), 1);
  assert.equal(Math.max(...vus), 100);
});

test("révélation à 2 % : exactement 2 combinaisons sur 100, et ≈ 2 % simulés", () => {
  let combinaisons = 0;
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if (testerPourcentage(a, b, 2).declenche) combinaisons++;
  assert.equal(combinaisons, 2);
  const alea = mulberry32(7);
  const N = 200_000;
  let n = 0;
  for (let i = 0; i < N; i++) if (testerPourcentage(d10(alea), d10(alea), 2).declenche) n++;
  assert.ok(Math.abs(n / N - 0.02) < 0.002, `fréquence ${n / N}`);
});

test("Aléa à 30 % : fréquence simulée ≈ 30 %", () => {
  const alea = mulberry32(11);
  const N = 100_000;
  let n = 0;
  for (let i = 0; i < N; i++) if (testerPourcentage(d10(alea), d10(alea), 30).declenche) n++;
  assert.ok(Math.abs(n / N - 0.3) < 0.01, `fréquence ${n / N}`);
});

test("1 à 6 par d10 avec relance : distribution uniforme (khi-deux)", () => {
  const alea = mulberry32(3);
  const N = 120_000;
  const compte = new Array(7).fill(0);
  for (let i = 0; i < N; i++) {
    let r = null;
    while (r == null) r = uniformeParD10([d10(alea)]).resultat;
    compte[r]++;
  }
  const attendu = N / 6;
  const khi2 = compte.slice(1).reduce((s, c) => s + (c - attendu) ** 2 / attendu, 0);
  assert.ok(khi2 < 20.52, `khi-deux ${khi2}`);   // 5 ddl, seuil 0,1 %
});

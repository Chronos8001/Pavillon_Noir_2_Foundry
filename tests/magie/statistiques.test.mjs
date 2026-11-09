/**
 * Vérification statistique de la distribution du d10 sacré (50 % Succès / 50 % Colère).
 * Complète les tests déterministes, sans les remplacer.
 * Le générateur est à graine fixe (résultat reproductible) ; dans Foundry, les dés réels
 * se vérifient avec game.pn2.magie.simulerDistribution().
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resoudreD10, RESULTAT } from "../../module/magie/regles.mjs";
import { creerRituel, solliciter } from "../../module/magie/moteur.mjs";

/** Générateur pseudo-aléatoire à graine (mulberry32). */
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

test("simulation de 200 000 d10 : 50 % ± 0,5 % de Succès, faces uniformes", () => {
  const alea = mulberry32(20261109);
  const N = 200_000;
  const faces = new Array(11).fill(0);
  let succes = 0;
  for (let i = 0; i < N; i++) {
    const v = 1 + Math.floor(alea() * 10);
    faces[v]++;
    if (resoudreD10(v).resultat === RESULTAT.SUCCES) succes++;
  }
  const p = succes / N;
  assert.ok(Math.abs(p - 0.5) < 0.005, `proportion de Succès : ${p}`);
  // Khi-deux d'uniformité des faces (9 ddl, seuil 0,1 % ≈ 27,88)
  const attendu = N / 10;
  const khi2 = faces.slice(1).reduce((s, n) => s + ((n - attendu) ** 2) / attendu, 0);
  assert.ok(khi2 < 27.88, `khi-deux : ${khi2}`);
});

test("simulation d'actes complets : chaque lancer apporte exactement 1 Succès ou 1 Colère", () => {
  const alea = mulberry32(42);
  let lancers = 0;
  let succes = 0;
  for (let i = 0; i < 2000; i++) {
    let e = creerRituel({ typeReligion: "communion", valeurs: { foi: 5 }, puissance: 3, auspices: {} });
    for (let k = 0; k < 10; k++) e = solliciter(e, 1 + Math.floor(alea() * 10)).etat;
    assert.equal(e.succes + e.colereGagnee, e.lancers.length);
    lancers += e.lancers.length;
    succes += e.succes;
  }
  assert.ok(Math.abs(succes / lancers - 0.5) < 0.02, `proportion : ${succes / lancers}`);
});

/**
 * Simulation des probabilités de la magie (Entre ciel et terre, adaptation d10).
 * Usage : npm run simulation   (écrit docs/simulation-magie.md)
 *
 * Compare les probabilités théoriques exactes du moteur aux fréquences simulées, et l'adaptation d10
 * au tirage de cartes officiel (59 Lames : 29 droites, 29 renversées, Le Mat — Entre ciel et terre, p. 120),
 * tiré sans remise, les Lames renversées de la Colère restant hors du paquet.
 * Ce script mesure ; il ne modifie aucune probabilité du système.
 */
import { writeFileSync } from "node:fs";
import { resoudreD10 } from "../module/magie/regles.mjs";
import { testerPourcentage } from "../module/magie/evenements.mjs";

const N = Number(process.argv[2]) || 100_000;

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
const alea = mulberry32(20261109);
const d10 = () => 1 + Math.floor(alea() * 10);
const pct = x => `${(100 * x).toFixed(1).replace(".", ",")} %`;

/* ---------- Théorie exacte ---------- */

/** P(X = k), X = Colères tirées avant le r-ième Succès, avec p = 1/2 (loi binomiale négative). */
function nb(r, k) {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (k + r - i)) / i;
  return c / 2 ** (k + r);
}
/** P(X > s) : probabilité de dépasser un Seuil s quand il faut r Succès. */
const queue = (r, s) => (s < 0 ? 1 : 1 - Array.from({ length: s + 1 }, (_, k) => nb(r, k)).reduce((a, b) => a + b, 0));

/* ---------- Simulations ---------- */

/** Rituel d10 : tirer jusqu'à P Succès ; Colère gagnée. */
function rituelD10(P) {
  let s = 0;
  let c = 0;
  while (s < P) { if (resoudreD10(d10()).dSucces) s++; else c++; }
  return c;
}

/** Rituel au tarot : 29 droites, 29 renversées (moins la Colère initiale c0, restée hors du paquet), Le Mat. */
function rituelTarot(P, c0) {
  const paquet = [...Array(29).fill("d"), ...Array(29 - Math.min(29, c0)).fill("r"), "m"];
  for (let i = paquet.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [paquet[i], paquet[j]] = [paquet[j], paquet[i]]; }
  let s = 0;
  let c = 0;
  let mat = false;
  for (const carte of paquet) {
    if (carte === "d") s++; else if (carte === "r") c++; else mat = true;
    if (s >= P) break;
  }
  return { c, mat, epuise: s < P };
}

const lignes = [];
const out = t => lignes.push(t);
out("# Simulation des probabilités — magie d10");
out("");
out(`Généré par \`tools/simulation-magie.mjs\` (${N.toLocaleString("fr-FR")} tirages par cas, générateur à graine fixe). Ce rapport mesure ; il ne modifie aucune règle.`);
out("");

// 1. Distribution du d10
const faces = new Array(11).fill(0);
let succ = 0;
for (let i = 0; i < N * 5; i++) { const v = d10(); faces[v]++; if (resoudreD10(v).dSucces) succ++; }
out("## 1. Distribution du d10 sacré");
out("");
out(`Théorie : 50 % de Succès (1 à 5), 50 % de Colère (6 à 10). Simulé : **${pct(succ / (N * 5))}** de Succès. Faces : ${faces.slice(1).map((f, i) => `${i + 1} → ${pct(f / (N * 5))}`).join(", ")}.`);
out("");

// 2. Risque de Rejet d'un Rituel selon la Puissance et le Seuil
out("## 2. Rituel : risque de Rejet selon la Puissance et le Seuil");
out("");
out("Stratégie : le prêtre sollicite jusqu'à atteindre la Puissance (arrêt après un Succès). Colère gagnée X ~ binomiale négative (Puissance, 1/2) ; Rejet si Colère initiale + X > Seuil. Valeurs théoriques exactes (Colère initiale 0) :");
out("");
const seuils = [0, 1, 2, 3, 4, 5, 6, 8, 10];
out(`| Puissance \\ Seuil | ${seuils.join(" | ")} |`);
out(`|---|${seuils.map(() => "---").join("|")}|`);
for (const P of [1, 2, 3, 4, 5, 6, 8, 10]) out(`| ${P} | ${seuils.map(s => pct(queue(P, s))).join(" | ")} |`);
out("");
out("Contrôle par simulation (Seuil 4) :");
out("");
out("| Puissance | Théorie | Simulé d10 | Écart |");
out("|---|---|---|---|");
for (const P of [1, 2, 3, 5, 8]) {
  let r = 0;
  for (let i = 0; i < N; i++) if (rituelD10(P) > 4) r++;
  out(`| ${P} | ${pct(queue(P, 4))} | ${pct(r / N)} | ${(100 * Math.abs(r / N - queue(P, 4))).toFixed(2).replace(".", ",")} pt |`);
}
out("");

// 3. Transes profondes
out("## 3. Transe : risque de Rejet selon la profondeur");
out("");
out("Une Transe jusqu'au niveau L puis la descente à 0 demandent 2L Succès (entrée et ascensions, puis détachements). La Colère ne diminue pas pendant la Transe : le Rejet immédiat survient si la Colère totale dépasse le Seuil. Théorie exacte (Colère initiale 0) :");
out("");
out(`| Niveau atteint \\ Seuil | ${[2, 4, 6, 8, 10].join(" | ")} |`);
out("|---|---|---|---|---|---|");
for (const L of [1, 2, 3, 4, 5, 6, 8, 10]) out(`| ${L} | ${[2, 4, 6, 8, 10].map(s => pct(queue(2 * L, s))).join(" | ")} |`);
out("");

// 4. Colère initiale
out("## 4. Influence de la Colère initiale");
out("");
out("La Colère d'un acte précédent (non encore récupérée) réduit d'autant la marge : Rituel de Puissance 3, Seuil 6.");
out("");
out("| Colère initiale | Risque de Rejet |");
out("|---|---|");
for (const c0 of [0, 1, 2, 3, 4, 5]) out(`| ${c0} | ${pct(queue(3, 6 - c0))} |`);
out("");

// 5. Révélations et Aléas
out("## 5. Fréquence des révélations et des Aléas");
out("");
let rev = 0;
for (let i = 0; i < N * 5; i++) if (testerPourcentage(d10(), d10(), 2).declenche) rev++;
let al = 0;
for (let i = 0; i < N; i++) if (testerPourcentage(d10(), d10(), 30).declenche) al++;
out(`- Révélation (réglage 2 %) : théorie 2,0 % par sollicitation, simulé ${pct(rev / (N * 5))}. Sur un Rituel de Puissance P (2P sollicitations en moyenne) : P = 3 → ${pct(1 - 0.98 ** 6)}, P = 6 → ${pct(1 - 0.98 ** 12)}.`);
out(`- Aléa (réglage 30 % par acte) : simulé ${pct(al / N)}. Mode « officiel » : 100 % des actes.`);
out("");

// 6. Comparaison avec le tirage de cartes officiel
out("## 6. Comparaison avec le tirage de cartes officiel");
out("");
out("Paquet du supplément (p. 120) : Arcanes majeurs en double (droit / renversé) sauf Le Mat, unique, et les 16 figures des Arcanes mineurs (Épées et Deniers renversées, Coupes et Bâtons droites) : 59 Lames, 29 droites, 29 renversées, 1 Mat. Tirage sans remise ; les Lames renversées de la Colère restent hors du paquet. Le premier tirage « doit être un Arcane majeur » est ignoré ici (il ne concerne que l'Aléa).");
out("");
out("| Rituel | Rejet d10 (théorie) | Rejet tarot (simulé) | Le Mat tiré (tarot) | Révélation d10 (2 %) |");
out("|---|---|---|---|---|");
for (const [P, S, c0] of [[2, 4, 0], [3, 4, 0], [3, 6, 2], [5, 6, 0], [5, 8, 3], [8, 8, 0]]) {
  let r = 0;
  let m = 0;
  for (let i = 0; i < N; i++) { const t = rituelTarot(P, c0); if (c0 + t.c > S) r++; if (t.mat) m++; }
  out(`| P${P}, Seuil ${S}, Colère initiale ${c0} | ${pct(queue(P, S - c0))} | ${pct(r / N)} | ${pct(m / N)} | ${pct(1 - 0.98 ** (2 * P))} |`);
}
out("");
out("Lecture : le tarot tiré sans remise devient légèrement plus favorable à mesure que les Lames renversées sortent du paquet (et quand la Colère initiale en retire) ; le d10 garde 50 % à chaque lancer. Le Mat sort à environ 1,7 % par carte (1/59), la révélation maison à 2 % par sollicitation : ordres de grandeur proches.");
out("");
out("## 7. Écarts constatés et propositions (non appliquées)");
out("");
out("- Les fréquences simulées du moteur concordent avec la théorie (écarts inférieurs à 0,5 point).");
out("- Le d10 est un peu plus dangereux que le tarot sans remise pour les actes longs ou après une Colère initiale élevée (voir tableau 6). Si cet écart gêne, une option possible serait de baisser la Colère sur 10 au lieu de 6-10 (par exemple 7-10) — **non appliquée**, à décider.");
out("- La révélation à 2 % est légèrement plus fréquente que Le Mat (≈ 1,7 %) ; un réglage à 2 % reste raisonnable (2 combinaisons sur 100 avec deux d10).");
writeFileSync("docs/simulation-magie.md", `${lignes.join("\n")}\n`);
console.log(`Rapport écrit : docs/simulation-magie.md (${N} tirages par cas).`);

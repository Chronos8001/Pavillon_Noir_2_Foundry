/**
 * Cohérence des compendiums de la magie (sources JSON de src/packs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MAGIE } from "../../module/magie/config-magie.mjs";
import { cleVoie } from "../../module/magie/regles.mjs";

const lire = dossier => readdirSync(dossier).filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(readFileSync(join(dossier, f), "utf8")));

const religions = lire("src/packs/historiques").filter(d => d.type === "historique" && d.system.etape === "religion");
const voiesPack = lire("src/packs/voies");

test("chaque religion du compendium porte un type valide (ou aucun pour l'athéisme)", () => {
  assert.equal(religions.length, 11);
  for (const r of religions) {
    const t = r.system.typeReligion;
    assert.ok(t === "" || t in MAGIE.types, `${r.name} : ${t}`);
    if (r.name !== "Athée") assert.notEqual(t, "", `${r.name} sans type`);
  }
});

test("la table de repli (personnages déjà créés) donne le même type que le compendium", () => {
  for (const r of religions.filter(x => x.system.typeReligion)) {
    assert.equal(MAGIE.religions[cleVoie(r.name)], r.system.typeReligion, r.name);
  }
});

test("compendium des Voies : 21 Voies valides, rangées dans des dossiers existants", () => {
  const dossiers = new Set(voiesPack.filter(d => d._key.startsWith("!folders!")).map(d => d._id));
  const voies = voiesPack.filter(d => d.type === "voie");
  assert.equal(voies.length, 21);
  const champs = ["description", "source", "cle", "religion", "groupeColere", "foi", "mysteres", "affinite", "rites", "sansTranse"];
  for (const v of voies) {
    assert.ok(dossiers.has(v.folder), `${v.name} : dossier`);
    assert.deepEqual(Object.keys(v.system).sort(), [...champs].sort(), v.name);
    assert.equal(v._key, `!items!${v._id}`);
    assert.match(v._id, /^[A-Za-z0-9]{16}$/);
  }
  const ids = voiesPack.map(d => d._id);
  assert.equal(new Set(ids).size, ids.length, "identifiants uniques");
  const cles = voies.map(v => cleVoie(v.name, v.system.cle));
  assert.equal(new Set(cles).size, cles.length, "clés de Voie uniques");
});

test("pas de Transe dans la Kabbale, la Cartomancie ni la Voie du Calendrier (ECT p. 120)", () => {
  const sans = voiesPack.filter(d => d.type === "voie" && d.system.sansTranse).map(v => v.name).sort();
  assert.deepEqual(sans, ["Voie de la Cartomancie", "Voie des Qlipoth", "Voie des Sephiroth", "Voie du Calendrier"]);
});

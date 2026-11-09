/**
 * Cohérence des compendiums de la magie (sources JSON de src/packs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MAGIE } from "../../module/magie/config-magie.mjs";
import { cleVoie } from "../../module/magie/regles.mjs";
import { coutCreationObjet, FREQUENCES_OBJET, DUREES_ACTIVATION_OBJET, MODES_OBJET, FORMES_OBJET } from "../../module/magie/objets.mjs";

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
  const champs = ["description", "source", "cle", "religion", "religionUuid", "domaine", "groupeColere", "foi", "mysteres", "affinite", "rites", "sansTranse"];
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

test("compendium des Pouvoirs : 785 Pouvoirs complets, rattachés à leur Voie", () => {
  const PREFIXE = "Compendium.pavillon-noir-2.voies.Item.";
  const pack = lire("src/packs/pouvoirs");
  const dossiers = new Map(pack.filter(d => d._key.startsWith("!folders!")).map(d => [d._id, d]));
  const pouvoirs = pack.filter(d => d.type === "pouvoir");
  assert.equal(pouvoirs.length, 785);
  assert.equal(dossiers.size, 20);
  const voies = new Map(voiesPack.filter(d => d.type === "voie").map(v => [v._id, v]));
  const champs = ["description", "source", "voie", "voieUuid", "puissance", "nomNatif", "compulsion", "accessible", "visions",
    "portee", "cible", "impact", "duree", "conditions", "references", "application"];
  for (const p of pouvoirs) {
    const s = p.system;
    assert.deepEqual(Object.keys(s).sort(), [...champs].sort(), p.name);
    assert.equal(p._key, `!items!${p._id}`);
    assert.match(p._id, /^[A-Za-z0-9]{16}$/);
    assert.ok(Number.isInteger(s.puissance) && s.puissance >= 1 && s.puissance <= 10, `${p.name} : Puissance`);
    const voie = voies.get(s.voieUuid.slice(PREFIXE.length));
    assert.ok(s.voieUuid.startsWith(PREFIXE) && voie, `${p.name} : Voie introuvable`);
    assert.equal(s.voie, cleVoie(voie.name, voie.system.cle), `${p.name} : clé de Voie`);
    assert.equal(dossiers.get(p.folder)?.name, voie.name, `${p.name} : dossier`);
    for (const c of ["portee", "cible", "duree", "visions"]) assert.ok(s[c], `${p.name} : ${c} vide`);
    // Aucun reste d'extraction : lettres espacées, puces ou paramètres collés
    assert.doesNotMatch(`${p.name} ${s.nomNatif}`, /(\b\p{L} ){3,}/u, `${p.name} : lettres espacées`);
    assert.doesNotMatch(`${s.visions} ${s.compulsion}`, /Portée\s*:|Compulsions\.|­/, `${p.name} : débris`);
  }
  const ids = pack.map(d => d._id);
  assert.equal(new Set(ids).size, ids.length, "identifiants uniques");
  const noms = pouvoirs.map(p => `${p.system.voie}|${p.name}`);
  assert.equal(new Set(noms).size, noms.length, "pas de Pouvoir en double dans une Voie");
  // La Cartomancie (Lames du tarot, sans Puissance) n'est pas dans ce compendium
  assert.ok(!pouvoirs.some(p => p.system.voie === "voie-de-la-cartomancie"));
  // Kabbale (Sephiroth, Qlipoth) : pas de compulsion (ECT p. 214, 229)
  assert.ok(pouvoirs.filter(p => /sephiroth|qlipoth/.test(p.system.voie)).every(p => !p.system.compulsion));
});

test("avantages d'Entre ciel et terre : même modèle que les autres avantages du compendium", () => {
  const pack = lire("src/packs/avantages-faiblesses");
  const dossier = pack.find(d => d._key.startsWith("!folders!") && d.name === "Magie (Entre ciel et terre)");
  assert.ok(dossier);
  const ect = pack.filter(d => d.folder === dossier._id);
  assert.deepEqual(ect.map(d => d.name).sort(), ["Affinité", "Initié", "Objet de pouvoir", "Touché par le divin", "Versé dans les arcanes"]);
  const reference = pack.find(d => d.type === "avantage" && d.folder !== dossier._id);
  for (const a of ect) {
    assert.equal(a.type, "avantage");
    assert.deepEqual(Object.keys(a.system).sort(), Object.keys(reference.system).sort(), a.name);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(reference).sort(), a.name);
    assert.ok(a.system.cout && a.system.description, a.name);
  }
  assert.deepEqual(ect.find(a => a.name === "Versé dans les arcanes").system.options.map(o => o.pc), [-4, -6, -7]);
});

test("PNJ surnaturels d'Entre ciel et terre : zombie, loup-garou vaudou et 24 fées", () => {
  const pack = lire("src/packs/pnj");
  const dossier = pack.find(d => d._key.startsWith("!folders!") && d.name === "Surnaturel (Entre ciel et terre)");
  const ect = pack.filter(d => d.folder === dossier?._id);
  assert.equal(ect.length, 26);
  const reference = pack.find(d => d.name === "Crocodile");
  for (const p of ect) {
    assert.equal(p.type, "pnj");
    assert.equal(p._key, `!actors!${p._id}`);
    assert.deepEqual(Object.keys(p.system).sort(), Object.keys(reference.system).sort(), p.name);
    assert.ok(Object.values(p.system.caracs).every(c => Number.isInteger(c.value) && c.value >= 0), p.name);
    assert.ok(p.system.notes.includes("Entre ciel et terre"), p.name);
  }
  // Les deux loups-garous ne doivent pas être confondus
  assert.ok(ect.some(p => p.name === "Loup-garou vaudou (vampire)"));
  assert.ok(ect.some(p => p.name === "Loup-garou (fée du folklore européen)"));
  const ids = pack.map(d => d._id);
  assert.equal(new Set(ids).size, ids.length, "identifiants uniques");
});

test("Objets de pouvoir d'Entre ciel et terre : 8 éphémères et 12 permanents, au type « objetPouvoir »", () => {
  const pack = lire("src/packs/equipement");
  const dossier = pack.find(d => d._key.startsWith("!folders!") && d.name === "Objets de pouvoir (Entre ciel et terre)");
  const objets = pack.filter(d => d.folder === dossier?._id);
  assert.equal(objets.filter(o => o.system.nature === "ephemere").length, 8);
  assert.equal(objets.filter(o => o.system.nature === "permanent").length, 12);
  const champs = ["description", "source", "nature", "forme", "mode", "pouvoirUuid", "pouvoir", "voie", "puissance", "portee", "cible",
    "duree", "pouvoirConnu", "frequence", "dureeActivation", "rites", "derniereUtilisation", "doses"];
  for (const o of objets) {
    assert.equal(o.type, "objetPouvoir");
    assert.deepEqual(Object.keys(o.system).sort(), [...champs].sort(), o.name);
    assert.ok(o.system.mode in MODES_OBJET && o.system.frequence in FREQUENCES_OBJET && o.system.dureeActivation in DUREES_ACTIVATION_OBJET, o.name);
    assert.ok(FORMES_OBJET[o.system.nature].includes(o.system.forme), o.name);
    // Règle maison : aucune carte
    assert.doesNotMatch(o.system.description, /Lame|cartes/, o.name);
  }
});

test("coût de création d'un Objet de pouvoir (exemple « Brume », ECT p. 161)", () => {
  // Puissance 4, une fois par mois (3), activation de 4 h (1) : 8 Succès sacrés
  assert.deepEqual(coutCreationObjet({ nature: "permanent", puissance: 4, frequence: "mois", dureeActivation: "h4" }),
    { total: 8, puissance: 4, frequence: 3, duree: 1, ephemere: false });
  assert.equal(coutCreationObjet({ nature: "permanent", puissance: 10, frequence: "troisJour", dureeActivation: "instantane" }).total, 25);
  // Éphémère : une dose par Succès sacré ; la Puissance sert de seuil en Transe
  assert.equal(coutCreationObjet({ nature: "ephemere", puissance: 4, frequence: "troisJour" }).total, 4);
  // Valeurs inconnues : coût nul, Puissance au moins 1
  assert.equal(coutCreationObjet({ puissance: 0, frequence: "?", dureeActivation: "?" }).total, 1);
});

test("Suivants d'Entre ciel et terre : disciple, servant et six familiers, sans cartes", () => {
  const pack = lire("src/packs/pnj");
  const dossier = pack.find(d => d._key.startsWith("!folders!") && d.name === "Suivants (Entre ciel et terre)");
  const suivants = pack.filter(d => d.folder === dossier?._id);
  assert.equal(suivants.length, 8);
  assert.equal(suivants.filter(s => s.name.startsWith("Familier : ")).length, 6);
  for (const s of suivants) {
    assert.equal(s.type, "pnj");
    assert.doesNotMatch(s.system.notes, /Lame|cartes/, s.name);
  }
});

test("religions du compendium de magie : références UUID cohérentes avec les Voies", () => {
  const PREFIXE = "Compendium.pavillon-noir-2.voies.Item.";
  const parId = new Map(voiesPack.map(d => [d._id, d]));
  const resoudre = uuid => (uuid?.startsWith(PREFIXE) ? parId.get(uuid.slice(PREFIXE.length)) : null);
  const rels = voiesPack.filter(d => d.type === "religion");
  assert.equal(rels.length, 11);
  for (const r of rels) {
    assert.ok(r.system.type === "" || r.system.type in MAGIE.types, `${r.name} : type`);
    for (const u of r.system.voies) assert.equal(resoudre(u)?.type, "voie", `${r.name} : ${u}`);
  }
  for (const v of voiesPack.filter(d => d.type === "voie")) {
    const rel = resoudre(v.system.religionUuid);
    assert.equal(rel?.type, "religion", `${v.name} : religion`);
    assert.equal(rel.name, v.system.religion);
    assert.ok(rel.system.voies.includes(PREFIXE + v._id), `${rel.name} ne liste pas ${v.name}`);
    assert.ok(v.system.domaine, `${v.name} : domaine`);
    // Chaque Voie appartient au moins à une religion
    assert.ok(rels.some(r => r.system.voies.includes(PREFIXE + v._id)));
  }
  // Les types des religions de magie concordent avec ceux des historiques correspondants
  for (const r of rels.filter(x => x.system.correspondances)) {
    for (const nom of r.system.correspondances.split(";").map(x => x.trim())) {
      const h = religions.find(x => x.name === nom);
      assert.ok(h, `${r.name} : historique « ${nom} » introuvable`);
      assert.equal(h.system.typeReligion, r.system.type, `${r.name} / ${nom}`);
    }
  }
});

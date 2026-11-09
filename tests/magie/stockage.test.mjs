import { test } from "node:test";
import assert from "node:assert/strict";
import { cleVoie } from "../../module/magie/regles.mjs";
import { creerRituel, solliciter, serialiserActe, deserialiserActe } from "../../module/magie/moteur.mjs";

test("clé de Voie : stable, sans accents ni ponctuation, champ explicite prioritaire", () => {
  assert.equal(cleVoie("Voie de Dambala Wèdo"), "voie-de-dambala-wedo");
  assert.equal(cleVoie("Voie d'Agwé"), "voie-d-agwe");
  assert.equal(cleVoie("Nom", "Agwé"), "agwe");
  assert.equal(cleVoie(""), "");
});

test("l'acte se sérialise et se relit à l'identique (stockage en flag)", () => {
  const e = solliciter(creerRituel({ typeReligion: "communion", valeurs: { foi: 2 }, puissance: 1, auspices: {} }), 4, { requete: "r" }).etat;
  assert.deepEqual(deserialiserActe(serialiserActe(e)), e);
  assert.deepEqual(deserialiserActe(e), e);
});

test("données d'acte corrompues ou d'un autre schéma : ignorées", () => {
  assert.equal(deserialiserActe("{pas du json"), null);
  assert.equal(deserialiserActe(JSON.stringify({ schema: 99 })), null);
  assert.equal(deserialiserActe(null), null);
  assert.equal(deserialiserActe(""), null);
});

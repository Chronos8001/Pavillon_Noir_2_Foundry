import { test } from "node:test";
import assert from "node:assert/strict";
import { VerrouCles } from "../../module/magie/verrou.mjs";
import { creerRituel, solliciter, appliquerColere } from "../../module/magie/moteur.mjs";

const pause = ms => new Promise(r => setTimeout(r, ms));

test("les opérations sur une même clé sont sérialisées", async () => {
  const v = new VerrouCles();
  const ordre = [];
  const op = (nom, ms) => v.executer("acteur", async () => { ordre.push(`${nom}+`); await pause(ms); ordre.push(`${nom}-`); });
  await Promise.all([op("a", 20), op("b", 1), op("c", 5)]);
  assert.deepEqual(ordre, ["a+", "a-", "b+", "b-", "c+", "c-"]);
  assert.equal(v.occupe("acteur"), false);
});

test("une erreur ne bloque pas les opérations suivantes", async () => {
  const v = new VerrouCles();
  await assert.rejects(v.executer("k", async () => { throw new Error("boom"); }));
  assert.equal(await v.executer("k", async () => 42), 42);
});

test("double clic simulé avec latence : un seul lancer, une seule Colère", async () => {
  const v = new VerrouCles();
  // « Base de données » simulée : l'état de l'acte et la Colère de la fiche, écrits avec latence.
  const db = { acte: creerRituel({ typeReligion: "communion", valeurs: { foi: 3 }, puissance: 1, auspices: {} }), colere: 0 };
  let des = 0;
  const clic = requete => v.executer("acteur", async () => {
    const etat = structuredClone(db.acte);                 // relecture de l'état sous verrou
    const r0 = solliciter(etat, 10, { requete, seqAttendue: etat.seq - 0 });
    if (r0.doublon) return "doublon";
    des++;                                                 // le dé n'est lancé que pour une requête nouvelle
    await pause(15);                                       // latence réseau
    const { valeur, etat: e2 } = appliquerColere(r0.etat, db.colere);
    db.acte = e2;
    db.colere = valeur;
    return "ok";
  });
  const res = await Promise.all([clic("btn-1"), clic("btn-1"), clic("btn-1")]);
  assert.deepEqual(res, ["ok", "doublon", "doublon"]);
  assert.equal(des, 1);
  assert.equal(db.acte.lancers.length, 1);
  assert.equal(db.colere, 1);
});

/**
 * Destreza (L'Art de l'escrime, p. 170-175).
 *
 * La science du diestro = 2 × Niveau mouvements de base (manœuvres « destreza » de la fiche),
 * sa stratégie = Niveau mouvements cochés « stratégie ». À chaque Test, les dés dont le résultat
 * correspond à un mouvement de la stratégie forment la treta, résolue par ordre croissant :
 *   1 Géométrie du combat : relance d'un dé par « 1 » (nouvelles Opportunités de 2 à 10)
 *   2 Tacto : ±1 sur un D10 par « 2 » (nouvelles Opportunités de 3 à 10)
 *   3 Afirmarse : -1 en Facilité pour l'adversaire par « 3 »
 *   4 Desvio : si Réussite ≥ celle de l'adversaire, -1 Succès adverse par « 4 » et riposte
 *   5 Manteau (offensive) : si autant de « 5 » que l'adversaire, sa Réussite est annulée
 *   6 Atajo : un dé supplémentaire par « 6 » (nouvelles Opportunités de 7 à 10)
 *   7 Pasos : Facilité +1 et une Localisation protégée par « 7 »
 *   8 Arrebatar : dégâts +2 par « 8 »
 *   9 Estocada : 3 dégâts par « 9 » dans une Localisation, après l'attaque
 *   0 Manteau (parade) : armure 2 par « 0 »
 */
import { PN2 } from "../config.mjs";

const NOMS = {
  1: "Géométrie du combat", 2: "Tacto", 3: "Afirmarse", 4: "Desvio", 5: "Manteau : offensive",
  6: "Atajo", 7: "Pasos", 8: "Arrebatar", 9: "Estocada", 10: "Manteau : parade"
};
const op = v => (v === 10 ? 0 : v);
const libOp = v => String(op(v));

/** Chiffre d'une manœuvre de destreza (combinaison « 0 » = 10). */
function chiffre(man) {
  const c = String(man.system.combinaison ?? "").trim();
  return c === "0" || c === "10" ? 10 : Number(c);
}

const normal = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Adéquation d'un mouvement à l'arme adverse : 0 adapté, 1 peu adapté, 2 inadapté. */
function adequationMouvement(man, armeAdverse) {
  if (!armeAdverse || armeAdverse === "autre") return 0;
  const mots = { hache: "hache", baionnette: "baionnette", epee: "epee", sabre: "sabre", dague: "dague" }[armeAdverse];
  if (!mots) return 0;
  if (normal(man.system.inadapte).includes(mots)) return 2;
  if (normal(man.system.peuAdapte).includes(mots)) return 1;
  return 0;
}

/** Mouvements de base de la stratégie (chiffre → manœuvre). */
export function strategie(actor) {
  const out = new Map();
  for (const it of actor.items) {
    if (it.type !== "manoeuvre" || it.system.escrime !== "destreza" || !it.system.strategie) continue;
    const c = chiffre(it);
    if (c >= 1 && c <= 10) out.set(c, it);
  }
  return out;
}

/**
 * Résout la treta d'un diestro.
 * @param {Actor} actor
 * @param {object} o
 * @param {number[]} o.values    résultats des D10
 * @param {number} o.fac         Facilité du Test
 * @param {string} [o.armeCat]   catégorie d'escrime de l'arme (« dague » interdit 3 et 8)
 * @param {boolean} [o.esquive]  Test d'esquive (seuls 1, 5, 7 et 0 sont possibles)
 * @param {string} [o.armeAdverse]
 * @returns {Promise<object|null>} treta sérialisable (null si la stratégie ne se concrétise pas)
 */
export async function resoudreTreta(actor, { values, fac, armeCat = "epee", esquive = false, armeAdverse = null }) {
  const strat = strategie(actor);
  const esc = actor.system.escrime ?? {};
  if (!strat.size) return { vide: true, lignes: ["Aucune stratégie de destreza choisie (onglet Escrime)."] };
  // Mouvements utilisables dans cette situation
  const possibles = new Map();
  const exclus = [];
  for (const [c, man] of strat) {
    if (esquive && ![1, 5, 7, 10].includes(c)) continue;
    if (armeCat === "dague" && [3, 8].includes(c)) continue;
    if ([5, 10].includes(c) && !esc.manteau) { exclus.push(`${NOMS[c]} : pas de manteau au bras`); continue; }
    const ad = adequationMouvement(man, armeAdverse);
    if (ad === 2) { exclus.push(`${NOMS[c]} : inadapté contre cette arme`); continue; }
    possibles.set(c, { man, peuAdapte: ad === 1 });
  }

  const vals = [...values];
  // Opportunité minimale encore exploitable pour chaque dé (Géométrie, Tacto, Atajo restreignent les nouveaux dés)
  const minOpp = vals.map(() => 1);
  const utilises = new Map(); // chiffre → nombre de dés
  const lignes = [];
  const rolls = [];
  const extraValues = [];
  const compteOpp = c => vals.filter((v, i) => v === c && minOpp[i] <= c).length;

  // Résolution par ordre croissant ; les effets peuvent créer de nouvelles Opportunités supérieures
  for (let c = 1; c <= 10; c++) {
    if (!possibles.has(c)) continue;
    const n = compteOpp(c);
    if (!n) continue;
    utilises.set(c, n);
    switch (c) {
      case 1: { // Géométrie du combat : relance des plus mauvais dés
        for (let k = 0; k < n; k++) {
          const idx = vals.map((v, i) => ({ v, i })).filter(x => x.v > fac && x.v !== 1).sort((a, b) => b.v - a.v)[0]?.i;
          if (idx === undefined) break;
          const r = await new Roll("1d10").evaluate(); rolls.push(r);
          lignes.push(`Géométrie du combat : relance d'un ${libOp(vals[idx])} → ${libOp(r.total)}.`);
          vals[idx] = r.total; minOpp[idx] = 2;
        }
        break;
      }
      case 2: { // Tacto : transforme un échec juste au-dessus de la Facilité en Succès, sinon crée une Opportunité utile
        for (let k = 0; k < n; k++) {
          let idx = vals.findIndex(v => v === Math.min(9, fac) + 1 && v !== 2);
          let delta = -1;
          if (idx < 0) {
            for (const cible of [...possibles.keys()].filter(x => x > 2).sort((a, b) => a - b)) {
              idx = vals.findIndex((v, i) => v !== 2 && Math.abs(v - cible) === 1 && !(v <= fac && cible > fac) && minOpp[i] <= v);
              if (idx >= 0) { delta = cible - vals[idx]; break; }
            }
          }
          if (idx < 0) { lignes.push("Tacto : aucune modification utile (un dé de Localisation peut être modifié d'un point)."); break; }
          lignes.push(`Tacto : ${libOp(vals[idx])} → ${libOp(vals[idx] + delta)}.`);
          vals[idx] += delta; minOpp[idx] = 3;
        }
        break;
      }
      case 6: { // Atajo : dés supplémentaires
        const r = await new Roll(`${n}d10`).evaluate(); rolls.push(r);
        const nv = r.dice[0].results.map(x => x.result);
        extraValues.push(...nv);
        nv.forEach(v => { vals.push(v); minOpp.push(7); });
        lignes.push(`Atajo : ${n} dé(s) supplémentaire(s) : ${nv.map(libOp).join(", ")}.`);
        break;
      }
      default: break;
    }
  }
  if (!utilises.size) return { vide: true, lignes: exclus.length ? exclus : [], exclus };

  const n = c => utilises.get(c) ?? 0;
  const ordre = String(esc.pasosOrdre || "torse,tete,brasD,jambeD,brasG,jambeG").split(",").map(x => x.trim()).filter(x => PN2.locKeys.includes(x));
  const treta = {
    mouvements: [...utilises.entries()].map(([c, k]) => ({ c: op(c), nom: NOMS[c], n: k, peuAdapte: possibles.get(c).peuAdapte })),
    // Les dés d'origine (Atajo exclu) après Géométrie et Tacto
    values: vals.slice(0, values.length),
    extraValues,
    bonusFac: n(7),
    malusFacAdv: n(3),
    desvio: n(4),
    manteau5: n(5),
    bonusDegats: 2 * n(8),
    estocada: 3 * n(9),
    armure: 2 * n(10),
    pasos: ordre.slice(0, n(7)),
    puissance: [...utilises.entries()].filter(([c]) => !possibles.get(c).peuAdapte).reduce((t, [c, k]) => t + c * k, 0),
    nbDes: [...utilises.values()].reduce((t, k) => t + k, 0),
    lignes: [...lignes, ...exclus]
  };
  if (treta.bonusFac) treta.lignes.push(`Pasos : Facilité +${treta.bonusFac}, ${treta.pasos.map(l => PN2.locLabels[l]).join(", ")} protégé(s).`);
  if (treta.malusFacAdv) treta.lignes.push(`Afirmarse : l'adversaire subit -${treta.malusFacAdv}.`);
  if (treta.bonusDegats) treta.lignes.push(`Arrebatar : dégâts +${treta.bonusDegats}.`);
  if (treta.armure) treta.lignes.push(`Manteau (parade) : armure ${treta.armure}.`);
  if (treta.estocada) treta.lignes.push(`Estocada : ${treta.estocada} dégâts après l'attaque.`);
  treta.libelle = treta.mouvements.map(m => `${m.nom}${m.n > 1 ? ` ×${m.n}` : ""}`).join(", ");
  treta.rolls = rolls;
  return treta;
}

/** Expérience de destreza : une case par mouvement de base réalisé. */
export async function experienceDestreza(actor, treta) {
  const e = actor.system.escrime?.destreza;
  if (!e || !treta?.nbDes || !actor.isOwner) return;
  const avant = e.xp ?? 0;
  const xp = avant + treta.nbDes;
  await actor.update({ "system.escrime.destreza.xp": xp });
  if (xp > e.value && avant <= e.value) ui.notifications.info(`${actor.name} : expérience pratique en Destreza (${xp} cases).`);
}

/** Nombre de dés d'une valeur donnée dans les résultats (après la treta si elle passe). */
export function compteValeur(c, valeur) {
  const v = c?.escrime?.treta && c.escrime.tretaPasse !== false ? [...(c.escrime.treta.values ?? []), ...(c.escrime.treta.extraValues ?? [])] : (c?.values ?? []);
  return v.filter(x => x === valeur).length;
}

/**
 * Compétences liées à la destreza (L'Art de l'escrime, p. 170) : Sciences, Art (Danse),
 * Connaissance spé. (Philosophie) et Religion (Chrétienne) doivent valoir au moins Destreza - 2.
 * Retourne les modifications à ajouter à une mise à jour de l'acteur.
 */
export function competencesDestreza(actor, niveau, findSpec) {
  const min = niveau - 2;
  if (min < 1) return {};
  const upd = {};
  const sys = actor.system;
  if ((sys.skills.sciences?.value ?? 0) < min) upd["system.skills.sciences.value"] = min;
  for (const [group, nom] of [["art", "Danse"], ["connSpe", "Philosophie"], ["religion", "Chrétienne"]]) {
    const id = findSpec(actor, group, nom);
    if (id) { if ((sys.specs[id].value ?? 0) < min) upd[`system.specs.${id}.value`] = min; }
    else upd[`system.specs.${foundry.utils.randomID()}`] = { group, name: nom, value: min, xp: false, metier: PN2.specGroups[group]?.metierDefaut ?? false, carac: "" };
  }
  return upd;
}

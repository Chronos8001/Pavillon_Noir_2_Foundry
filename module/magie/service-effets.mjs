/**
 * Effets des Pouvoirs : Active Effects natifs de Foundry.
 *
 * Un Pouvoir porte ses effets mécaniques comme des Active Effects d'objet (non transférés).
 * À l'application, ils sont copiés sur les acteurs ciblés avec :
 *  - la durée tirée du paramètre Durée effectif (table p. 100, améliorations comprises) ;
 *  - l'origine (UUID du Pouvoir) et un marqueur `flags["pavillon-noir-2"].magie` (acte, lanceur) pour la révocation.
 * Les interventions purement narratives n'ont pas d'effet : le Pouvoir reste en mode « manuel ».
 * L'application touche des acteurs d'autres joueurs : elle est faite par le MJ.
 */
import { PN2 } from "../config.mjs";
import * as R from "./regles.mjs";
import { parametresEffectifs } from "./parametres.mjs";

const SYS = PN2.id;

/** Acteur d'une cible (UUID de jeton ou d'acteur). */
function acteurCible(uuid) {
  const doc = fromUuidSync(uuid, { strict: false });
  return doc?.actor ?? (doc?.documentName === "Actor" ? doc : null);
}

/** Cibles actuelles de l'utilisateur, sous forme de références enregistrables. */
export function ciblesUtilisateur() {
  return Array.from(game.user?.targets ?? []).map(t => ({ uuid: t.document?.uuid ?? t.actor?.uuid, nom: t.name }));
}

/**
 * Applique les effets d'un Pouvoir aux cibles.
 * @param {Actor} lanceur
 * @param {Item} pouvoir
 * @param {object} o
 * @param {string} o.acteId
 * @param {Array<{uuid:string}>} o.cibles
 * @param {object} [o.repartition]  augmentations par paramètre ({ duree: 1, … })
 * @returns {Promise<{appliques:number, cibles:string[], duree:object}>}
 */
export async function appliquerEffets(lanceur, pouvoir, { acteId, cibles, repartition = {} }) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ applique les effets d'un Pouvoir.");
  const effets = pouvoir.effects?.contents ?? [];
  if (!effets.length) throw new R.MagieError("effets", `« ${pouvoir.name} » n'a aucun effet mécanique : son intervention reste narrative.`);
  const cibs = (cibles ?? []).map(c => acteurCible(c.uuid)).filter(Boolean);
  if (!cibs.length) throw new R.MagieError("cibles", "Aucune cible : ciblez des jetons avant l'acte ou avant l'application.");
  const params = parametresEffectifs({ ...pouvoir.system, puissance: pouvoir.system.puissance }, repartition);
  const secondes = params.duree.secondes;
  const maintenant = game.time.worldTime;
  for (const cible of cibs) {
    const data = effets.map(ef => {
      const d = ef.toObject();
      delete d._id;
      d.transfer = false;
      d.disabled = false;
      d.origin = pouvoir.uuid;
      d.duration = secondes ? { seconds: secondes, startTime: maintenant } : {};
      foundry.utils.setProperty(d, `flags.${SYS}.magie`, { acteId, lanceur: lanceur.uuid, pouvoir: pouvoir.name, expire: secondes ? maintenant + secondes : null });
      return d;
    });
    await cible.createEmbeddedDocuments("ActiveEffect", data);
  }
  return { appliques: effets.length * cibs.length, cibles: cibs.map(c => c.name), duree: params.duree };
}

/** Tous les effets magiques présents sur les acteurs du monde et les jetons non liés de la scène active. */
function effetsMagiques(filtre = () => true) {
  const acteurs = [...(game.actors ?? []), ...(globalThis.canvas?.scene?.tokens?.filter(t => !t.actorLink).map(t => t.actor).filter(Boolean) ?? [])];
  const out = [];
  for (const a of acteurs) for (const ef of a.effects ?? []) {
    const m = ef.getFlag?.(SYS, "magie") ?? ef.flags?.[SYS]?.magie;
    if (m && filtre(m, ef)) out.push(ef);
  }
  return out;
}

/** Révoque les effets issus d'un acte (Rejet, décision du MJ). */
export async function revoquerEffets(acteId) {
  if (!game.user.isGM) throw new R.MagieError("permission", "Seul le MJ révoque les effets.");
  const liste = effetsMagiques(m => m.acteId === acteId);
  for (const ef of liste) await ef.delete();
  return liste.length;
}

/** Retire les effets dont la Durée est écoulée (MJ actif, quand le temps du monde avance). Idempotent. */
export async function expirerEffets(maintenant = game.time.worldTime) {
  if (game.user !== game.users.activeGM) return 0;
  const liste = effetsMagiques(m => m.expire != null && m.expire <= maintenant);
  for (const ef of liste) await ef.delete();
  if (liste.length) ui.notifications.info(`Magie : ${liste.length} effet(s) de Pouvoir expiré(s).`);
  return liste.length;
}

/** Nombre d'effets actifs issus d'un acte. */
export const effetsActe = acteId => effetsMagiques(m => m.acteId === acteId).length;

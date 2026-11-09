/**
 * Migrations versionnées des données de magie.
 * Exécutées une fois par le MJ actif au chargement du monde, dans l'ordre des versions.
 * Règle : une migration complète ou relie des données ; elle n'efface jamais une donnée inconnue ou ancienne.
 *
 * Les actes enregistrés par les versions précédentes sont complétés à la lecture (moteur.normaliserActe),
 * sans réécriture. Les champs de schéma ajoutés reçoivent leur valeur par défaut par Foundry.
 */
import { PN2 } from "../config.mjs";
import * as S from "./service.mjs";

const SYS = PN2.id;

export const MIGRATIONS = [
  {
    version: "0.7.0",
    description: "Pouvoirs possédés sans référence à leur Voie : lien UUID ajouté d'après leur clé de Voie",
    async executer() {
      let n = 0;
      for (const actor of game.actors.filter(a => S.estPersonnage(a))) {
        const maj = [];
        for (const p of actor.items.filter(i => i.type === "pouvoir" && !i.system.voieUuid)) {
          const { voie } = S.voiePossedee(actor, p);
          if (voie) maj.push({ _id: p.id, "system.voieUuid": S.uuidSource(voie) ?? voie.uuid });
        }
        if (maj.length) {
          await actor.updateEmbeddedDocuments("Item", maj);
          n += maj.length;
        }
      }
      return `${n} Pouvoir(s) relié(s) à leur Voie`;
    }
  }
];

/** Exécute les migrations en attente (MJ actif). */
export async function migrer() {
  if (game.user !== game.users.activeGM) return [];
  const faite = game.settings.get(SYS, "magieMigration") || "0.0.0";
  const rapports = [];
  for (const m of MIGRATIONS) {
    if (!foundry.utils.isNewerVersion(m.version, faite)) continue;
    try {
      const r = await m.executer();
      rapports.push(`${m.version} : ${r}`);
      await game.settings.set(SYS, "magieMigration", m.version);
      console.log(`Pavillon Noir 2 | Migration ${m.version} (${m.description}) : ${r}`);
    } catch (err) {
      console.error(`Pavillon Noir 2 | Migration ${m.version} interrompue`, err);
      ui.notifications.error(`Pavillon Noir 2 : la migration ${m.version} a échoué (voir la console). Les données n'ont pas été effacées.`);
      break;
    }
  }
  return rapports;
}

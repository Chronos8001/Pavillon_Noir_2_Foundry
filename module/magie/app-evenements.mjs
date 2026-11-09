/**
 * Panneau des événements divins (MJ) : actes en cours et Cycles, Aléas, révélations et Quêtes
 * (déchiffrés localement), Rejets à résoudre, séquelles et pénitences.
 */
import * as S from "./service.mjs";
import * as V from "./service-evenements.mjs";
import * as M from "./moteur.mjs";
import { MagieError, etatCycle } from "./regles.mjs";
import { etatSequelle, nombrePenitences, prochaineRepentance, ETATS_PENITENCE } from "./consequences.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const SYS = "pavillon-noir-2";
const LIB_PENITENCE = { "a-accomplir": "À accomplir", "en-cours": "En cours", accomplie: "Accomplie", abandonnee: "Abandonnée" };
const LIB_STATUT = { "en-attente": "En attente", differe: "Différé", differee: "Différée", applique: "Appliqué", ignore: "Ignoré", acceptee: "Acceptée", refusee: "Refusée" };

export class PN2EvenementsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pn2-evenements",
    classes: ["pn2", "sheet", "pn2-evenements"],
    window: { title: "Événements divins (MJ)", icon: "fa-solid fa-cloud-bolt", resizable: true },
    position: { width: 820, height: 820 },
    actions: { op: PN2EvenementsApp.#onOp }
  };

  static PARTS = { main: { template: "systems/pavillon-noir-2/templates/apps/magie-evenements.hbs", scrollable: [".pn2-ev-corps"] } };

  static ouvrir() {
    if (!game.user.isGM) return ui.notifications.warn("Panneau réservé au MJ.");
    const app = foundry.applications.instances.get("pn2-evenements") ?? new PN2EvenementsApp();
    return app.render({ force: true });
  }

  async _prepareContext() {
    const cle = await V.etatCle();
    const ctx = { cle, acteurs: [], historique: [] };
    const now = game.time.worldTime;
    for (const actor of game.actors.filter(a => S.estPersonnage(a))) {
      const m = actor.system.magie;
      const acte = S.acteCourant(actor);
      const aCoffre = !!actor.getFlag(SYS, "coffre");
      if (!acte && !aCoffre && !m.rejets.length && !m.penitences.length && !m.sequelles.length) continue;
      const a = { id: actor.id, nom: actor.name, img: actor.img };
      // Acte en cours et Cycle
      if (M.estEnCours(acte)) {
        const t = acte.transe;
        const cyc = t ? etatCycle(t.cycle, now) : null;
        a.acte = {
          type: acte.type === "transe" ? "Transe" : "Rituel", voie: acte.voie?.nom, seq: acte.seq,
          pilote: game.users.get(acte.pilote)?.name ?? "?", piloteActif: !!game.users.get(acte.pilote)?.active,
          colere: M.colereTotale(acte), seuil: acte.seuil.seuil, succes: acte.succes, lancers: acte.lancers.length,
          niveau: t?.niveau ?? null, action: t?.actionEnCours?.type ?? null,
          cycle: cyc ? { duree: t.cycle.dureeMinutes, restantMin: cyc.restant != null ? Math.ceil(cyc.restant / 60) : null, depasse: cyc.depasse } : null,
          peutImposer: !!t?.actif && !t.actionEnCours,
          peutConcentration: S.cfg().concentration.actions.includes(t?.actionEnCours?.type)
        };
      }
      // Coffre (déchiffré sur ce navigateur seulement)
      if (aCoffre) {
        try {
          const c = await V.lireCoffre(actor);
          a.aleas = c.aleas.filter(x => ["en-attente", "differe"].includes(x.statut)).map(x => ({ ...x, statutLabel: LIB_STATUT[x.statut] }));
          a.revelations = [];
          for (const r of c.revelations.filter(x => ["en-attente", "differee"].includes(x.statut))) {
            const candidats = r.puissance > 0 ? await V.candidatsRevelation(actor, r) : [];
            a.revelations.push({ ...r, statutLabel: LIB_STATUT[r.statut], candidats, origineLabel: r.origine === "quete" ? "Quête mystique réussie" : "Le Mat" });
          }
          a.quetes = c.quetes.slice(-5).reverse();
          a.brouillons = c.brouillons;
          for (const x of c.aleas.filter(y => !["en-attente", "differe"].includes(y.statut))) ctx.historique.push({ acteur: actor.name, texte: `Aléa (${LIB_STATUT[x.statut]}) : ${x.interpretation || x.aleaNom || "sans contenu"}` });
          for (const x of c.revelations.filter(y => !["en-attente", "differee"].includes(y.statut))) ctx.historique.push({ acteur: actor.name, texte: `Révélation P${x.puissance} (${LIB_STATUT[x.statut]})` });
        } catch (err) {
          a.coffreErreur = err.message;
        }
      }
      // Rejets, séquelles, pénitences
      a.rejets = m.rejets.filter(r => r.statut !== "resolu").map(r => ({ ...r, nbPenitences: nombrePenitences(r),
        lignesPenitences: Array.from({ length: nombrePenitences(r) }, (_, i) => `Pénitence ${i + 1} : `).join("\n") }));
      a.sequelles = m.sequelles.filter(s => s.active).map(s => ({ ...s, ...etatSequelle(s, m.penitences) }));
      a.penitences = m.penitences.filter(p => ["a-accomplir", "en-cours"].includes(p.etat)).map(p => {
        const proch = prochaineRepentance(p.derniereTentative, p.priorite);
        return { ...p, etatLabel: LIB_PENITENCE[p.etat], prochaine: proch != null && proch > now ? Math.ceil((proch - now) / 86400) : null };
      });
      for (const p of m.penitences.filter(x => ["accomplie", "abandonnee"].includes(x.etat))) ctx.historique.push({ acteur: actor.name, texte: `Pénitence ${LIB_PENITENCE[p.etat].toLowerCase()} : ${p.description}` });
      for (const r of m.rejets.filter(x => x.statut === "resolu")) ctx.historique.push({ acteur: actor.name, texte: `Rejet résolu (${r.voie}, dépassement ${r.depassement})${r.conclusion ? ` : ${r.conclusion}` : ""}` });
      ctx.acteurs.push(a);
    }
    ctx.etatsPenitence = { "a-accomplir": "À accomplir", "en-cours": "En cours", accomplie: "Accomplie", abandonnee: "Abandonnée" };
    ctx.vide = !ctx.acteurs.length;
    return ctx;
  }

  /** Lit les champs d'un bloc (data-champ) au moment de l'action. */
  static #champs(bloc) {
    const out = {};
    bloc?.querySelectorAll("[data-champ]").forEach(el => {
      out[el.dataset.champ] = el.type === "checkbox" ? el.checked : el.value;
    });
    return out;
  }

  static async #onOp(event, target) {
    const op = target.dataset.op;
    const actor = game.actors.get(target.closest("[data-acteur]")?.dataset.acteur);
    const bloc = target.closest("[data-bloc]");
    const f = PN2EvenementsApp.#champs(bloc);
    const id = bloc?.dataset.id;
    try {
      switch (op) {
        case "creerCle": await V.assurerCle(); break;
        case "afficherCle": await PN2EvenementsApp.#afficherCle(); break;
        case "importerCle": await PN2EvenementsApp.#importerCle(); break;
        case "ouvrirActe": game.pn2.magie.ouvrirActe(actor); break;
        case "imposer": await S.imposerDetachement(actor); break;
        case "concentration": await S.echecConcentration(actor, { motif: f.motif ?? "" }); break;
        case "alea": await V.resoudreAlea(actor, id, { decision: target.dataset.decision, interpretation: f.interpretation, communiquer: !!f.communiquer }); break;
        case "revelation": await V.resoudreRevelation(actor, id, {
          decision: target.dataset.decision, pouvoirUuid: f.pouvoir || null,
          nouveau: f.nouveau ? { nom: f.nouveau } : null, compulsion: f.compulsion ?? ""
        }); break;
        case "imposerConsequences": await V.imposerConsequences(actor, id, {
          sequelle: f.nature ? { nature: f.nature, gravite: f.gravite, duree: f.duree, restrictions: f.restrictions, levee: f.levee,
            malusAuspices: f.malus, toutesVoies: f.toutesVoies } : null,
          penitences: String(f.penitences ?? "").split(/\r?\n/).map(l => l.replace(/^Pénitence \d+ :\s*/, "").trim()).filter(Boolean)
            .map(description => ({ description, priorite: !!f.priorite })),
          communiquer: !!f.communiquer
        }); break;
        case "cloreRejet": await V.cloreRejet(actor, id, f.conclusion ?? ""); break;
        case "communiquer": await V.communiquerBrouillon(actor, id); break;
        case "penitence": await V.majPenitence(actor, id, { etat: f.etat, note: f.note }); break;
        case "lever": await V.leverSequelle(actor, id); break;
      }
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message);
      else { console.error(err); ui.notifications.error(`Pavillon Noir 2 : ${err.message}`); }
    }
    this.render();
  }

  static async #afficherCle() {
    const cle = V.cleCoffre();
    if (!cle) return ui.notifications.warn("Aucune clé sur ce navigateur.");
    await foundry.applications.api.DialogV2.prompt({
      window: { title: "Clé du coffre du MJ" },
      content: `<p>Conservez cette clé en lieu sûr. Elle est nécessaire pour lire les secrets depuis un autre navigateur. Ne la communiquez pas aux joueurs.</p>
        <textarea readonly rows="3" style="width:100%">${cle}</textarea>`
    });
  }

  static async #importerCle() {
    const form = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Importer la clé du coffre" },
      content: `<p>Collez la clé du coffre de ce monde.</p><input type="text" name="cle" style="width:100%">`,
      ok: { label: "Importer", callback: (ev, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    });
    if (form?.cle) {
      await V.importerCle(form.cle);
      ui.notifications.info("Clé importée.");
      await V.examinerTout();
    }
  }
}

export { ETATS_PENITENCE };

/**
 * Historique des actes sacrés et journal des interventions du MJ.
 * Un joueur consulte les personnages qu'il possède ; le MJ voit tous les personnages et ses interventions.
 * Les entrées ne contiennent aucun secret (Puissance secrète seulement après validation du MJ).
 */
import * as S from "./service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const TYPES = { rituel: "Rituel", transe: "Transe" };
const NATURES = { narrative: "Décision narrative", administrative: "Correction administrative" };
const VALIDATIONS = { accordee: "Accordée", refusee: "Refusée", "en-attente": "En attente du MJ" };

export class PN2HistoriqueApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor = null, options = {}) {
    super(options);
    this.actorId = actor?.id ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: "pn2-historique",
    classes: ["pn2", "sheet", "pn2-historique"],
    window: { title: "Historique des actes sacrés", icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 760, height: 640 }
  };

  static PARTS = { main: { template: "systems/pavillon-noir-2/templates/apps/magie-historique.hbs", scrollable: [".pn2-histo-corps"] } };

  static ouvrir(actor = null) {
    const app = foundry.applications.instances.get("pn2-historique") ?? new PN2HistoriqueApp(actor);
    if (actor) app.actorId = actor.id;
    return app.render({ force: true });
  }

  async _prepareContext() {
    const isGM = game.user.isGM;
    const acteurs = game.actors.filter(a => S.estPersonnage(a) && a.isOwner && ((a.system.magie.historique?.length ?? 0) || (isGM && a.system.magie.interventions?.length)));
    if (!acteurs.some(a => a.id === this.actorId)) this.actorId = acteurs[0]?.id ?? null;
    const actor = acteurs.find(a => a.id === this.actorId) ?? null;
    const fmt = t => (t == null ? "" : `jour ${Math.floor(t / 86400)}, ${Math.floor((t % 86400) / 3600)} h`);
    const ctx = {
      isGM, acteurs: acteurs.map(a => ({ id: a.id, nom: a.name, choisi: a.id === this.actorId })), actor,
      entrees: (actor?.system.magie.historique ?? []).slice().reverse().map(h => ({
        ...h, typeLabel: TYPES[h.typeActe] ?? h.typeActe, quand: h.dateReelle ? new Date(h.dateReelle).toLocaleString() : fmt(h.date),
        validationLabel: VALIDATIONS[h.validation] ?? ""
      }))
    };
    if (isGM && actor) {
      ctx.interventions = (actor.system.magie.interventions ?? []).slice().reverse().map(i => ({
        ...i, natureLabel: NATURES[i.nature] ?? i.nature, quand: i.dateReelle ? new Date(i.dateReelle).toLocaleString() : fmt(i.date)
      }));
    }
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[data-choix-acteur]")?.addEventListener("change", ev => {
      this.actorId = ev.target.value;
      this.render();
    });
  }
}

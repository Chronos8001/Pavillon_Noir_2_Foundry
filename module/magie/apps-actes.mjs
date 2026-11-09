/**
 * Fenêtres de conduite des actes sacrés : Rituel et Transe (interfaces distinctes).
 * Une fenêtre par personnage ; elle se met à jour à chaque modification du personnage.
 */
import { ControleurMagie } from "./controleur.mjs";
import * as S from "./service.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const TPL = "systems/pavillon-noir-2/templates/apps";

class ActeSacreBase extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super({ ...options, id: `${options.prefixe ?? "pn2-acte"}-${actor.id}` });
    this.actor = actor;
    this.controleur = new ControleurMagie();
  }

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "pn2-acte-sacre"],
    window: { resizable: true },
    actions: { magie: ActeSacreBase.#onMagie }
  };

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.actor.apps[this.id] = this;   // re-rendu automatique à chaque mise à jour du personnage
  }

  _onClose(options) {
    super._onClose(options);
    delete this.actor.apps[this.id];
  }

  async _prepareContext(options) {
    return this.controleur.contexteActe(this.actor);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.controleur.lier(this.element, () => this.render());
  }

  static async #onMagie(event, target) {
    await this.controleur.action(this.actor, target, () => this.render());
  }
}

export class PN2RituelApp extends ActeSacreBase {
  constructor(actor, options = {}) { super(actor, { ...options, prefixe: "pn2-rituel" }); }
  static DEFAULT_OPTIONS = {
    classes: ["pn2-rituel"],
    window: { icon: "fa-solid fa-hands-praying" },
    position: { width: 560, height: 720 }
  };
  static PARTS = { main: { template: `${TPL}/magie-rituel.hbs`, scrollable: [""] } };
  get title() { return `Rituel : ${this.actor.name}`; }
}

export class PN2TranseApp extends ActeSacreBase {
  constructor(actor, options = {}) { super(actor, { ...options, prefixe: "pn2-transe" }); }
  static DEFAULT_OPTIONS = {
    classes: ["pn2-transe"],
    window: { icon: "fa-solid fa-eye" },
    position: { width: 600, height: 760 }
  };
  static PARTS = { main: { template: `${TPL}/magie-transe.hbs`, scrollable: [""] } };
  get title() { return `Transe : ${this.actor.name}`; }
}

/** Ouvre la fenêtre adaptée à l'acte du personnage (en cours ou dernier). */
export function ouvrirActe(actor) {
  const acte = S.acteCourant(actor);
  if (!acte) return ui.notifications.info(`${actor.name} n'a accompli aucun acte sacré.`);
  const Classe = acte.type === "transe" ? PN2TranseApp : PN2RituelApp;
  const id = `${acte.type === "transe" ? "pn2-transe" : "pn2-rituel"}-${actor.id}`;
  const app = foundry.applications.instances.get(id) ?? new Classe(actor);
  return app.render({ force: true });
}

/** Ouvre automatiquement la fenêtre de l'acte pour l'utilisateur qui le conduit, dès son début. */
export function surMiseAJourActeur(actor, changes) {
  const brut = foundry.utils.getProperty(changes, "flags.pavillon-noir-2.acte");
  if (!brut || !actor.isOwner) return;
  const acte = S.acteCourant(actor);
  if (!acte || acte.seq !== 0 || acte.statut !== "en-cours" || acte.pilote !== game.user.id) return;
  ouvrirActe(actor);
}

/** Le temps restant du Cycle dépend du temps du monde : les fenêtres de Transe ouvertes se mettent à jour. */
export function rafraichirTranses() {
  for (const app of foundry.applications.instances.values()) {
    if (app instanceof PN2TranseApp && app.rendered) app.render();
  }
}

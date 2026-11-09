/**
 * Fenêtre de test de la magie (phase 1) : préparer et conduire un Rituel ou une Transe,
 * un d10 à la fois. Toute la logique est dans le service et le moteur ; la fenêtre
 * ne fait qu'afficher l'état et transmettre les demandes.
 */
import * as S from "./service.mjs";
import { MagieError, etatCycle, validerRepartition, coutAugmentations } from "./regles.mjs";
import { ACTION, estEnCours, resumeActe } from "./moteur.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const LIBELLES_STATUT = { "en-cours": "En cours", termine: "Terminé", rejet: "Rejet", annule: "Annulé" };
const LIBELLES_ACTION = { rituel: "Rituel", entree: "Entrée", ascension: "Ascension", detachement: "Détachement", renforcement: "Renforcement" };

export class PN2MagieApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor ?? null;
    this.prep = {
      mode: "rituel", voieId: "", actesFoi: "", affinite: "", beaute: 0, peches: "",
      puissance: 1, souhait: "", pouvoirId: "", dureeRites: 10, instantanee: false, niveauLimite: "",
      cible: "", activation: "", motif: ""
    };
    this.repartition = { portee: 0, cible: 0, impact: 0, duree: 0 };
  }

  static DEFAULT_OPTIONS = {
    id: "pn2-magie",
    classes: ["pn2", "sheet", "pn2-magie-app"],
    window: { title: "Magie — Entre ciel et terre (test)", resizable: true, icon: "fa-solid fa-hands-praying" },
    position: { width: 720, height: 820 },
    actions: {
      commencer: PN2MagieApp.#onCommencer,
      solliciter: PN2MagieApp.#onSolliciter,
      arreter: PN2MagieApp.#onArreter,
      actionTranse: PN2MagieApp.#onActionTranse,
      activer: PN2MagieApp.#onActiver,
      repartir: PN2MagieApp.#onRepartir,
      interrompre: PN2MagieApp.#onInterrompre,
      annuler: PN2MagieApp.#onAnnuler,
      reprendre: PN2MagieApp.#onReprendre,
      colere: PN2MagieApp.#onColere,
      recuperer: PN2MagieApp.#onRecuperer,
      creerObjet: PN2MagieApp.#onCreerObjet,
      editerObjet: PN2MagieApp.#onEditerObjet,
      supprimerObjet: PN2MagieApp.#onSupprimerObjet
    }
  };

  static PARTS = { main: { template: "systems/pavillon-noir-2/templates/apps/magie.hbs", scrollable: [""] } };

  /* -------------------------------------------- */

  /** Ouvre (ou ramène au premier plan) la fenêtre, éventuellement sur un personnage. */
  static ouvrir(actor = null) {
    const app = foundry.applications.instances.get("pn2-magie") ?? new PN2MagieApp(actor);
    if (actor) app.choisirActeur(actor);
    app.render({ force: true });
    return app;
  }

  choisirActeur(actor) {
    if (this.actor) delete this.actor.apps[this.id];
    this.actor = actor;
    this.prep.voieId = "";
    this.prep.pouvoirId = "";
    if (actor && this.rendered) actor.apps[this.id] = this;
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    if (this.actor) this.actor.apps[this.id] = this;   // re-rendu automatique à chaque mise à jour du personnage
  }

  _onClose(options) {
    super._onClose(options);
    if (this.actor) delete this.actor.apps[this.id];
  }

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const acteurs = game.actors.filter(a => S.estPersonnage(a) && a.isOwner).map(a => ({ id: a.id, nom: a.name }));
    const actor = this.actor && game.actors.get(this.actor.id) ? this.actor : null;
    const ctx = {
      acteurs, actor, isGM: game.user.isGM, seuilVisible: S.seuilVisible(),
      types: Object.fromEntries(Object.entries(S.cfg().types).map(([k, d]) => [k, d.label])),
      prep: this.prep, requete: S.nouvelleRequete()
    };
    if (!actor) return ctx;

    const profil = S.profilReligieux(actor);
    ctx.profil = profil;
    ctx.statLabel = profil.typeDef?.statLabel ?? "Foi / Connaissance des Mystères";
    ctx.statKey = profil.typeDef?.stat ?? null;
    if (!this.prep.voieId && profil.voies.length) this.prep.voieId = profil.voies[0].id;
    const voie = profil.voies.find(v => v.id === this.prep.voieId) ?? null;
    ctx.voie = voie;
    ctx.voiesOptions = Object.fromEntries(profil.voies.map(v => [v.id, v.nom]));
    ctx.pouvoirsOptions = { "": "—", ...Object.fromEntries((voie?.pouvoirs ?? []).map(p => [p.id, `${p.nom} (P${p.puissance})`])) };
    ctx.defauts = { actesFoi: profil.actesFoi, peches: profil.peches, affinite: voie?.affinite ?? 0 };

    const etat = profil.acte;
    ctx.enCours = estEnCours(etat);
    if (!ctx.enCours && voie) ctx.apercu = S.apercuSeuil(actor, this.prep);

    if (etat) ctx.acte = this.#contexteActe(etat);
    return ctx;
  }

  #contexteActe(etat) {
    const resume = resumeActe(etat);
    const pilote = game.users.get(etat.pilote);
    const c = {
      etat, resume, seq: etat.seq,
      statut: LIBELLES_STATUT[etat.statut] ?? etat.statut,
      estRituel: etat.type === "rituel",
      estPilote: !etat.pilote || etat.pilote === game.user.id,
      piloteNom: pilote?.name ?? "?",
      lancers: etat.lancers.map(l => ({ ...l, action: LIBELLES_ACTION[l.action] ?? l.action, succes: l.resultat === "succes" })).reverse()
    };
    if (etat.type === "rituel" && etat.rituel.resolution?.suffisant) {
      const budget = etat.rituel.resolution.succesSupplementaires;
      c.repartition = this.#contexteRepartition(budget, etat.rituel.repartition);
    }
    if (etat.type === "transe") {
      const t = etat.transe;
      c.transe = t;
      c.action = t.actionEnCours ? { ...t.actionEnCours, libelle: LIBELLES_ACTION[t.actionEnCours.type] } : null;
      const niveauSuivant = t.niveau + 1;
      const candidats = t.pouvoirsConnus.filter(p => p.puissance === (t.actif ? niveauSuivant : 1));
      c.candidats = Object.fromEntries(candidats.map(p => [p.id, `${p.nom} (P${p.puissance})`]));
      c.peutMonter = estEnCours(etat) && !t.actionEnCours && candidats.length > 0 && (!t.actif || niveauSuivant <= t.niveauLimite);
      c.chemin = t.chemin;
      c.activations = t.activations.map(a => ({ ...a, repartition: a.repartition ? a.repartition.cout : null }));
      c.activationsOptions = Object.fromEntries(t.activations.filter(a => t.chemin.some(p => p.id === a.pouvoir.id))
        .map(a => [a.n, `#${a.n} ${a.pouvoir.nom} (${a.succes} Succès)`]));
      if (!(this.prep.cible in c.candidats)) this.prep.cible = Object.keys(c.candidats)[0] ?? "";
      if (!(String(this.prep.activation) in c.activationsOptions)) this.prep.activation = Object.keys(c.activationsOptions).at(-1) ?? "";
      const cyc = etatCycle(t.cycle, game.time.worldTime);
      c.cycle = { ...cyc, restantMin: cyc.restant != null ? Math.ceil(cyc.restant / 60) : null };
      const derniere = t.activations.filter(a => a.succes > 0).at(-1);
      if (derniere) c.repartitionActivation = { n: derniere.n, nom: derniere.pouvoir.nom, ...this.#contexteRepartition(derniere.succes, derniere.repartition) };
    }
    return c;
  }

  #contexteRepartition(budget, existante) {
    const params = S.cfg().parametres;
    const v = validerRepartition(this.repartition, budget);
    return {
      budget, cout: v.cout, valide: v.valide, erreurs: v.erreurs, enregistree: existante,
      parametres: Object.entries(params).map(([k, d]) => ({ key: k, label: d.label, n: this.repartition[k] ?? 0, cout: coutAugmentations(Number(this.repartition[k]) || 0) }))
    };
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    el.querySelector("[data-choix-acteur]")?.addEventListener("change", ev => {
      const a = game.actors.get(ev.target.value);
      this.choisirActeur(a ?? null);
      if (a) a.apps[this.id] = this;
      this.render();
    });
    el.querySelectorAll("[data-prep]").forEach(input => input.addEventListener("change", ev => {
      const k = input.dataset.prep;
      this.prep[k] = input.type === "checkbox" ? input.checked : input.value;
      if (k === "voieId") this.prep.pouvoirId = "";
      this.render();
    }));
    el.querySelectorAll("[data-repartition]").forEach(input => input.addEventListener("change", () => {
      this.repartition[input.dataset.repartition] = Math.max(0, Number(input.value) || 0);
      this.render();
    }));
    el.querySelectorAll("[data-champ]").forEach(input => input.addEventListener("change", async () => {
      const v = input.type === "number" ? Number(input.value) || 0 : input.value;
      await this.#executer(() => this.actor.update({ [input.dataset.champ]: v }));
    }));
  }

  /** Exécute une demande ; les erreurs de règle deviennent des avertissements. */
  async #executer(fn, bouton = null) {
    if (bouton) bouton.classList.add("disabled");
    try {
      return await fn();
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message);
      else { console.error(err); ui.notifications.error(`Pavillon Noir 2 : ${err.message}`); }
    } finally {
      this.render();
    }
  }

  #ctx(target) {
    return { requete: target.dataset.requete || undefined, seqAttendue: target.dataset.seq != null ? Number(target.dataset.seq) : undefined };
  }

  static async #onCommencer(event, target) {
    if (!this.actor) return;
    await this.#executer(() => S.demarrerActe(this.actor, this.prep), target);
  }

  static async #onSolliciter(event, target) {
    await this.#executer(() => S.solliciter(this.actor, this.#ctx(target)), target);
  }

  static async #onArreter(event, target) {
    await this.#executer(() => S.arreter(this.actor, this.#ctx(target)), target);
  }

  static async #onActionTranse(event, target) {
    const type = target.dataset.type;
    const cible = type === ACTION.RENFORCEMENT ? Number(this.prep.activation) : (type === ACTION.DETACHEMENT ? null : this.prep.cible);
    await this.#executer(() => S.commencerAction(this.actor, type, cible, this.#ctx(target)), target);
  }

  static async #onActiver(event, target) {
    await this.#executer(() => S.activerPouvoir(this.actor, target.dataset.pouvoir, this.#ctx(target)), target);
  }

  static async #onRepartir(event, target) {
    const activation = target.dataset.activation ? Number(target.dataset.activation) : null;
    await this.#executer(() => S.repartir(this.actor, this.repartition, { activation, ...this.#ctx(target) }), target);
  }

  static async #onInterrompre(event, target) {
    const terminer = target.dataset.terminer === "true";
    await this.#executer(() => S.interrompre(this.actor, { motif: this.prep.motif, terminer }, this.#ctx(target)), target);
  }

  static async #onAnnuler(event, target) {
    await this.#executer(() => S.annuler(this.actor, this.#ctx(target)), target);
  }

  static async #onReprendre(event, target) {
    await this.#executer(() => S.reprendre(this.actor, this.#ctx(target)), target);
  }

  static async #onColere(event, target) {
    const delta = Number(target.dataset.delta);
    await this.#executer(() => S.modifierColere(this.actor, target.dataset.groupe, delta, { motif: "fenêtre de magie" }), target);
  }

  static async #onRecuperer(event, target) {
    await this.#executer(async () => {
      const n = await S.recupererColere(this.actor);
      ui.notifications.info(`${this.actor.name} : ${n} point(s) de Colère récupéré(s).`);
    }, target);
  }

  static async #onCreerObjet(event, target) {
    const type = target.dataset.type;
    const voie = this.actor.items.get(this.prep.voieId);
    const data = type === "voie"
      ? { name: "Nouvelle Voie", type, system: { religion: this.actor.system.magie.religionNom } }
      : { name: "Nouveau Pouvoir", type, system: { voie: voie?.system.cleEffective ?? "", puissance: 1 } };
    await this.#executer(async () => {
      const [doc] = await this.actor.createEmbeddedDocuments("Item", [data]);
      doc?.sheet.render(true);
    }, target);
  }

  static #onEditerObjet(event, target) {
    this.actor.items.get(target.dataset.id)?.sheet.render(true);
  }

  static async #onSupprimerObjet(event, target) {
    const item = this.actor.items.get(target.dataset.id);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Supprimer" }, content: `<p>Supprimer « ${foundry.utils.escapeHTML(item.name)} » ?</p>` });
    if (ok) await this.#executer(() => item.delete(), target);
  }
}


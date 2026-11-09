/**
 * Bibliothèque de magie : parcourt les religions, Voies et Pouvoirs des compendiums visibles
 * et des objets du monde consultables, et les associe à un personnage.
 * Rien n'est créé automatiquement : la bibliothèque ne montre que les documents existants.
 */
import * as S from "./service.mjs";
import { MagieError } from "./regles.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const TYPES = ["religion", "voie", "pouvoir"];
const CHAMPS = ["type", "folder", "system.type", "system.religion", "system.religionUuid", "system.domaine", "system.voie",
  "system.voieUuid", "system.puissance", "system.sansTranse", "system.voies", "system.cle"];

export class PN2BibliothequeApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor ?? game.user.character ?? null;
    this.vue = "voies";
    this.filtres = { texte: "", religion: "", voie: "", puissance: "" };
    this.entrees = null;
  }

  static DEFAULT_OPTIONS = {
    id: "pn2-bibliotheque",
    classes: ["pn2", "sheet", "pn2-bibliotheque"],
    window: { title: "Bibliothèque de magie", icon: "fa-solid fa-book-bookmark", resizable: true },
    position: { width: 720, height: 720 },
    actions: {
      vue: PN2BibliothequeApp.#onVue,
      consulter: PN2BibliothequeApp.#onConsulter,
      ajouter: PN2BibliothequeApp.#onAjouter,
      retirer: PN2BibliothequeApp.#onRetirer,
      recharger: PN2BibliothequeApp.#onRecharger,
      importer: PN2BibliothequeApp.#onImporter,
      compendiums: PN2BibliothequeApp.#onCompendiums
    }
  };

  static PARTS = { main: { template: "systems/pavillon-noir-2/templates/apps/magie-bibliotheque.hbs", scrollable: [".resultats"] } };

  /** Ouvre la bibliothèque (une seule fenêtre), éventuellement pour un personnage. */
  static ouvrir(actor = null) {
    const app = foundry.applications.instances.get("pn2-bibliotheque") ?? new PN2BibliothequeApp(actor);
    if (actor) app.choisirActeur(actor);
    return app.render({ force: true });
  }

  choisirActeur(actor) {
    if (this.actor) delete this.actor.apps[this.id];
    this.actor = actor;
    if (actor && this.rendered) actor.apps[this.id] = this;
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    if (this.actor) this.actor.apps[this.id] = this;
  }

  _onClose(options) {
    super._onClose(options);
    if (this.actor) delete this.actor.apps[this.id];
  }

  /** Index des compendiums visibles et des objets du monde consultables. */
  async #charger() {
    const entrees = [];
    for (const pack of game.packs) {
      if (pack.documentName !== "Item" || !pack.visible) continue;
      const index = await pack.getIndex({ fields: CHAMPS });
      for (const e of index) {
        if (TYPES.includes(e.type)) entrees.push({ uuid: e.uuid, nom: e.name, type: e.type, img: e.img, system: e.system ?? {}, source: pack.metadata.label });
      }
    }
    for (const it of game.items) {
      if (TYPES.includes(it.type) && it.testUserPermission(game.user, "LIMITED")) {
        entrees.push({ uuid: it.uuid, nom: it.name, type: it.type, img: it.img, system: it.system.toObject?.() ?? it.system, source: "Monde" });
      }
    }
    return entrees.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  async _prepareContext(options) {
    this.entrees ??= await this.#charger();
    const parUuid = new Map(this.entrees.map(e => [e.uuid, e]));
    const actor = this.actor && game.actors.get(this.actor.id) ? this.actor : null;
    // Correspondance source → objet possédé, pour « Ajouter » / « Retirer »
    const possedes = new Map();
    for (const it of actor?.items ?? []) {
      if (!TYPES.includes(it.type)) continue;
      const src = S.uuidSource(it);
      if (src) possedes.set(src, it.id);
    }
    const peutModifier = !!actor?.isOwner;
    const t = this.filtres.texte.trim().toLowerCase();
    const filtreTexte = e => !t || e.nom.toLowerCase().includes(t) || (e.system.domaine ?? "").toLowerCase().includes(t);
    const ligne = e => ({ ...e, possedeId: possedes.get(e.uuid) ?? null, peutModifier });

    const religions = this.entrees.filter(e => e.type === "religion");
    const voies = this.entrees.filter(e => e.type === "voie");
    const nomReligionVoie = v => parUuid.get(v.system.religionUuid)?.nom ?? v.system.religion ?? "";
    const ctx = {
      vue: this.vue, filtres: this.filtres, isGM: game.user.isGM, actor,
      acteurs: game.actors.filter(a => ["personnage", "pnj"].includes(a.type) && a.isOwner).map(a => ({ id: a.id, nom: a.name })),
      compteurs: { religions: religions.length, voies: voies.length, pouvoirs: this.entrees.filter(e => e.type === "pouvoir").length },
      types: Object.fromEntries(Object.entries(S.cfg().types).map(([k, d]) => [k, d.label]))
    };
    ctx.religionsOptions = { "": "Toutes les religions", ...Object.fromEntries(religions.map(r => [r.uuid, r.nom])) };
    ctx.voiesOptions = { "": "Toutes les Voies", ...Object.fromEntries(voies.map(v => [v.uuid, v.nom])) };
    ctx.puissancesOptions = { "": "Toutes", ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, `Puissance ${i + 1}`])) };

    if (this.vue === "religions") {
      ctx.lignes = religions.filter(filtreTexte).map(r => {
        const refs = r.system.voies ?? [];
        const cassees = refs.filter(u => !parUuid.has(u) && !fromUuidSync(u, { strict: false }));
        return { ...ligne(r), typeLabel: ctx.types[r.system.type] ?? "—", nbVoies: refs.length, cassees: cassees.length };
      });
    } else if (this.vue === "voies") {
      ctx.lignes = voies.filter(filtreTexte)
        .filter(v => !this.filtres.religion || v.system.religionUuid === this.filtres.religion)
        .map(v => ({
          ...ligne(v), religionNom: nomReligionVoie(v),
          referenceCassee: !!v.system.religionUuid && !parUuid.has(v.system.religionUuid),
          nbPouvoirs: this.entrees.filter(p => p.type === "pouvoir" && p.system.voieUuid === v.uuid).length
        }));
    } else {
      ctx.lignes = this.entrees.filter(e => e.type === "pouvoir").filter(filtreTexte)
        .filter(p => !this.filtres.voie || p.system.voieUuid === this.filtres.voie)
        .filter(p => !this.filtres.puissance || Number(p.system.puissance) === Number(this.filtres.puissance))
        .sort((a, b) => (a.system.puissance ?? 0) - (b.system.puissance ?? 0) || a.nom.localeCompare(b.nom))
        .map(p => {
          const voie = parUuid.get(p.system.voieUuid);
          return { ...ligne(p), voieNom: voie?.nom ?? p.system.voie ?? "", referenceCassee: !!p.system.voieUuid && !voie };
        });
    }
    ctx.vide = !ctx.lignes.length;
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    el.querySelectorAll("[data-filtre]").forEach(input => input.addEventListener("change", () => {
      this.filtres[input.dataset.filtre] = input.value;
      this.render();
    }));
    el.querySelector("[data-choix-acteur]")?.addEventListener("change", ev => {
      this.choisirActeur(game.actors.get(ev.target.value) ?? null);
      this.render();
    });
    // Glisser une ligne vers une fiche ou une Religion : données de glisser-déposer standard de Foundry
    el.querySelectorAll("[data-uuid][draggable]").forEach(row => row.addEventListener("dragstart", ev => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.uuid }));
    }));
  }

  /* -------------------------------------------- */

  static #onVue(event, target) {
    this.vue = target.dataset.vue;
    this.render();
  }

  static async #onConsulter(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    doc?.sheet.render(true);
  }

  static async #onAjouter(event, target) {
    if (!this.actor) return ui.notifications.warn("Choisissez d'abord un personnage.");
    try {
      const crees = await S.ajouterAuPersonnage(this.actor, target.closest("[data-uuid]").dataset.uuid);
      ui.notifications.info(`${this.actor.name} : ${crees.map(c => c.name).join(", ")} ajouté(s).`);
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message); else throw err;
    }
    this.render();
  }

  static async #onRetirer(event, target) {
    try {
      await S.retirerDuPersonnage(this.actor, target.dataset.id);
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message); else throw err;
    }
    this.render();
  }

  static async #onCompendiums() {
    try {
      const crees = await S.creerCompendiumsMonde();
      ui.notifications.info(crees.length ? `Compendiums créés : ${crees.join(", ")}.` : "Les compendiums du monde existent déjà.");
    } catch (err) { ui.notifications.error(err.message); }
    this.entrees = null;
    this.render();
  }

  static async #onRecharger() {
    this.entrees = null;
    this.render();
  }

  /** Import d'un lot JSON (MJ) dans un compendium du monde déverrouillé ou dans les objets du monde. */
  static async #onImporter() {
    if (!game.user.isGM) return;
    const packs = game.packs.filter(p => p.documentName === "Item" && !p.locked && p.metadata.packageType === "world");
    const options = [`<option value="">Objets du monde</option>`, ...packs.map(p => `<option value="${p.collection}">${foundry.utils.escapeHTML(p.metadata.label)}</option>`)].join("");
    const form = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Importer des données de magie" },
      content: `<div class="pn2-dialog">
        <p class="hint">Lot JSON : { religions: [...], voies: [...], pouvoirs: [...] }, liés par leur clé. Format détaillé dans docs/magie.md.</p>
        <div class="form-group"><label>Destination</label><select name="pack">${options}</select></div>
        <textarea name="json" rows="12" style="width:100%" placeholder='{"religions": [], "voies": [], "pouvoirs": []}'></textarea></div>`,
      ok: { label: "Importer", callback: (ev, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    });
    if (!form?.json) return;
    try {
      const bilan = await S.importerMagie(JSON.parse(form.json), { packId: form.pack || null });
      ui.notifications.info(`Import : ${bilan.religions} religion(s), ${bilan.voies} Voie(s), ${bilan.pouvoirs} Pouvoir(s), ${bilan.aleas} Aléa(s) — dont ${bilan.misAJour} mis à jour.`);
      if (bilan.avertissements?.length) {
        console.warn("Pavillon Noir 2 | Avertissements d'import", bilan.avertissements);
        ui.notifications.warn(`${bilan.avertissements.length} avertissement(s) (paramètres hors table) : voir la console.`);
      }
    } catch (err) {
      ui.notifications.error(err instanceof SyntaxError ? "JSON invalide." : err.message);
      console.error(err);
    }
    this.entrees = null;
    this.render();
  }
}

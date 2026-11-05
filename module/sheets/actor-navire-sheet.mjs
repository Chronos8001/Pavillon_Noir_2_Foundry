import { PN2 } from "../config.mjs";
import { NAVIRES } from "../data/navires-catalogue.mjs";
import { computeGroupSkills, acteurPoste, matureActives, niveauCompetence } from "../data/actor-navire.mjs";
import { seuilsStructure } from "../helpers/tables.mjs";
import { testGroupe, tirBatterie, rechargerBatterie, tourNaval, statsBatterie } from "../rolls/naval.mjs";
import { dialogTest } from "../rolls/dice.mjs";
import { contexteBourse, operationBourse, formatPieces } from "../helpers/monnaie.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const TPL = "systems/pavillon-noir-2/templates/actor/navire";

export class PN2NavireSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "actor", "navire"],
    position: { width: 980, height: 880 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      appliquerModele: PN2NavireSheet.#onAppliquerModele,
      testGroupe: PN2NavireSheet.#onTestGroupe,
      tir: PN2NavireSheet.#onTir,
      recharge: PN2NavireSheet.#onRecharge,
      tourNaval: PN2NavireSheet.#onTourNaval,
      batterieAdd: PN2NavireSheet.#onBatterieAdd,
      batterieDelete: PN2NavireSheet.#onBatterieDelete,
      cargaisonAdd: PN2NavireSheet.#onCargaisonAdd,
      cargaisonDelete: PN2NavireSheet.#onCargaisonDelete,
      posteRetirer: PN2NavireSheet.#onPosteRetirer,
      posteOuvrir: PN2NavireSheet.#onPosteOuvrir,
      posteTest: PN2NavireSheet.#onPosteTest,
      blessureEquipage: PN2NavireSheet.#onBlessureEquipage,
      reparer: PN2NavireSheet.#onReparer,
      bourse: PN2NavireSheet.#onBourse,
      bourseToutes: PN2NavireSheet.#onBourseToutes,
      vendreCargaison: PN2NavireSheet.#onVendreCargaison
    }
  };

  static PARTS = {
    header: { template: `${TPL}/header.hbs` },
    nav: { template: "systems/pavillon-noir-2/templates/actor/personnage/nav.hbs" },
    navire: { template: `${TPL}/navire.hbs`, scrollable: [""] },
    mature: { template: `${TPL}/mature.hbs`, scrollable: [""] },
    equipage: { template: `${TPL}/equipage.hbs`, scrollable: [""] },
    cargaison: { template: `${TPL}/cargaison.hbs`, scrollable: [""] }
  };

  tabGroups = { primary: "navire" };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const s = actor.system;
    context.actor = actor;
    context.system = s;
    context.config = PN2;
    context.editable = this.isEditable;
    context.tab = this.tabGroups.primary;
    context.tabs = [
      { id: "navire", label: "Le navire", icon: "fa-solid fa-sailboat" },
      { id: "mature", label: "Mâture, coque & artillerie", icon: "fa-solid fa-burst" },
      { id: "equipage", label: "L'équipage", icon: "fa-solid fa-users" },
      { id: "cargaison", label: "Cargaison & possessions", icon: "fa-solid fa-box-open" }
    ].map(t => ({ ...t, active: t.id === context.tab }));

    // Catalogue
    context.types = NAVIRES.map(n => ({ nom: n.nom, selected: n.nom === s.modele.type }));
    const modele = NAVIRES.find(n => n.nom === s.modele.type);
    context.configurations = (modele?.configurations ?? []).map(c => ({
      nom: c.nom, label: `${c.nom} — ${c.matelots} matelots, PS ${c.psMature}/${c.psCoque}`, selected: c.nom === s.modele.configuration
    }));
    context.tailles = Object.fromEntries(Object.keys(PN2.taillesNavire).map(k => [k, k]));
    context.voilures = Object.fromEntries(Object.entries(PN2.voilures).map(([k, v]) => [k, `${v.label} (${v.vit >= 0 ? "+" : ""}${v.vit}/${v.man >= 0 ? "+" : ""}${v.man})`]));
    context.vents = Object.fromEntries(Object.entries(PN2.vents).map(([k, v]) => [k, `${v.label} (${v.vit >= 0 ? "+" : ""}${v.vit}/${v.man >= 0 ? "+" : ""}${v.man})`]));
    context.allures = PN2.allures;
    context.ventSpecial = PN2.vents[String(s.navigation.vent)]?.special;
    context.allureList = Object.entries(PN2.allures).map(([k, l]) => ({ key: k, label: l, base: s.vitesses[k], eff: s.vitEff[k], actif: k === s.navigation.allure }));

    // Structure
    const actives = matureActives(s.infos.mats);
    const sm = seuilsStructure(s.structure.mature.max);
    const sc = seuilsStructure(s.structure.coque.max);
    const seuilsTxt = x => `OK ${x.ok} · Léger ${x.leger} · Sérieux ${x.serieux} · Grave ${x.grave} · Critique ${x.critique}`;
    context.seuilsMature = seuilsTxt(sm);
    context.seuilsCoque = seuilsTxt(sc);
    const modReussite = { artimon: "+2S", grandMat: "", misaine: "+1S", poupe: "+2S", proue: "+1S", babord: "", tribord: "" };
    const avaries = { artimon: "a/b", grandMat: "a/b", misaine: "a/b", poupe: "e/f", proue: "c/d", babord: "c/d", tribord: "c/d" };
    context.mature = Object.entries(PN2.locNavire.mature).map(([k, l]) => ({
      key: k, label: l, ps: s.structure.mature[k], etat: s.etats.mature[k], actif: actives.includes(k), mod: modReussite[k], avaries: avaries[k],
      pct: s.structure.mature.max ? Math.max(0, Math.min(100, Math.round(100 * s.structure.mature[k] / s.structure.mature.max))) : 0
    }));
    context.coque = Object.entries(PN2.locNavire.coque).map(([k, l]) => ({
      key: k, label: l, ps: s.structure.coque[k], etat: s.etats.coque[k], mod: modReussite[k], avaries: avaries[k],
      pct: s.structure.coque.max ? Math.max(0, Math.min(100, Math.round(100 * s.structure.coque[k] / s.structure.coque.max))) : 0
    }));

    // Batteries
    context.batteries = Object.entries(s.batteries ?? {}).map(([id, b]) => {
      const st = statsBatterie(b);
      return { id, ...b, st, portee: b.portee, positionLabel: PN2.positionsBatterie[b.position] ?? b.position, munitionLabel: PN2.munitions[b.munition] };
    }).sort((a, b) => a.ordre - b.ordre);
    context.positions = PN2.positionsBatterie;
    context.munitions = PN2.munitions;
    context.cotes = { babord: "Bâbord", tribord: "Tribord" };
    const hommesBordee = Math.max(0, ...context.batteries.filter(b => b.position === "bordée").map(b => b.st.hommes));
    const hommesAutres = context.batteries.filter(b => b.position !== "bordée").reduce((a, b) => a + (b.st.hommes || 0), 0);
    context.artilleursNecessaires = hommesBordee + hommesAutres;
    context.equipageMinRecharge = (s.equipage.manoeuvre || 0) + context.artilleursNecessaires;

    // Équipage : commandement et compétences de groupe
    const groupe = computeGroupSkills(s);
    context.groupe = Object.entries(groupe).map(([k, g]) => ({ key: k, ...g, matelots: s.matelots[k], chances: `${g.eff}F${g.fac + (s.malusEquipage || 0)}` }));
    context.commandement = Object.entries(PN2.commandement).map(([k, d]) => {
      const a = acteurPoste(s.commandement[k]);
      return { key: k, label: d.label, nom: a?.name ?? s.commandement[k].nom, img: a?.img, uuid: s.commandement[k].uuid, vc: a?.system?.vc?.[k] ?? "—", manquant: !!s.commandement[k].uuid && !a };
    });
    context.gestion = Object.entries(PN2.postesGestion).map(([k, d]) => {
      const a = acteurPoste(s.gestion[k]);
      return {
        key: k, label: d.label, nom: a?.name ?? s.gestion[k].nom, img: a?.img, uuid: s.gestion[k].uuid,
        skills: d.skills.map(sk => ({ key: sk, label: PN2.skills[sk]?.label ?? sk, value: a ? niveauCompetence(a, sk) : "—" }))
      };
    });
    context.casesEquipage = s.casesEquipageListe.map((niv, i) => ({ index: i + 1, niveau: ["", "L", "S", "G", "Cr"][niv], coche: i < s.santeEquipage.coches }));
    context.niveauxMatelots = { 0: "0 (-3)", 1: "1 (-2)", 2: "2 (-1)", 3: "3 (+0)", 4: "4 (+1)", 5: "5 (+2)", 6: "6 (+3)" };

    // Cargaison
    context.cargaison = Object.entries(s.cargaison ?? {}).map(([id, c]) => ({ id, ...c, marchandise: c.tonnageUnite > 0 || (c.prix?.normal ?? 0) > 0 }));
    context.cours = PN2.cours;
    context.valeurCargaison = formatPieces(s.valeurCargaison);
    context.bourse = contexteBourse(s.coffre, this._bourseToutes ?? false);
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notes ?? "", { async: true, relativeTo: actor });
    return context;
  }

  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    context.partId = partId;
    context.active = context.tab === partId;
    return context;
  }

  /** Glisser-déposer d'un acteur sur un poste d'équipage. */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const poste = event.target.closest("[data-poste]");
    if (data?.type === "Item") {
      const item = await fromUuid(data.uuid);
      if (item?.type === "marchandise") {
        const m = item.system;
        await this.document.update({ [`system.cargaison.${foundry.utils.randomID()}`]: {
          nom: item.name, quantite: m.quantite || 1, unite: m.unite, tonnageUnite: m.tonnageUnite,
          prix: { penurie: m.prix.penurie, normal: m.prix.normal, exces: m.prix.exces }, cours: m.cours || "normal",
          tonnage: (m.quantite || 1) * m.tonnageUnite, valeur: 0
        } });
        return;
      }
    }
    if (data?.type === "Actor" && poste) {
      const actor = await fromUuid(data.uuid);
      if (!actor || actor.type === "navire") return;
      const groupe = poste.dataset.groupe;
      await this.document.update({ [`system.${groupe}.${poste.dataset.poste}`]: { uuid: actor.uuid, nom: actor.name } });
      if (groupe === "commandement" && poste.dataset.poste === "capitaine") await this.document.update({ "system.infos.capitaine": actor.name });
      return;
    }
    return super._onDrop?.(event);
  }

  /* -------------------------------------------- */

  static async #onAppliquerModele() {
    const s = this.document.system;
    const type = this.element.querySelector("[name='system.modele.type']")?.value || s.modele.type;
    const conf = this.element.querySelector("[name='system.modele.configuration']")?.value || s.modele.configuration;
    if (!type) return ui.notifications.warn("Choisissez un type de navire.");
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Appliquer le type de navire" },
      content: `<p>Remplacer les caractéristiques, la structure et l'artillerie par celles du type <strong>${type}</strong>${conf ? ` (${conf})` : ""} ?</p>`
    });
    if (ok) await this.document.appliquerModeleNavire(type, conf);
  }

  static async #onTestGroupe(event, target) {
    await testGroupe(this.document, target.dataset.groupe);
  }

  static async #onTir(event, target) {
    await tirBatterie(this.document, target.closest("[data-batterie]")?.dataset.batterie);
  }

  static async #onRecharge(event, target) {
    await rechargerBatterie(this.document, target.closest("[data-batterie]")?.dataset.batterie);
  }

  static async #onTourNaval() {
    await tourNaval(this.document);
  }

  static async #onBatterieAdd() {
    const id = foundry.utils.randomID();
    const n = Object.keys(this.document.system.batteries ?? {}).length;
    await this.document.update({ [`system.batteries.${id}`]: { nom: "Nouvelle batterie", position: "bordée", nombre: 4, calibre: 6, ordre: n } });
  }

  static async #onBatterieDelete(event, target) {
    const id = target.closest("[data-batterie]")?.dataset.batterie;
    if (id) await this.document.update({ [`system.batteries.-=${id}`]: null });
  }

  static async #onCargaisonAdd() {
    await this.document.update({ [`system.cargaison.${foundry.utils.randomID()}`]: { nom: "Marchandise", tonnage: 1, valeur: 0 } });
  }

  static async #onCargaisonDelete(event, target) {
    const id = target.closest("[data-cargo]")?.dataset.cargo;
    if (id) await this.document.update({ [`system.cargaison.-=${id}`]: null });
  }

  static async #onPosteRetirer(event, target) {
    const el = target.closest("[data-poste]");
    await this.document.update({ [`system.${el.dataset.groupe}.${el.dataset.poste}`]: { uuid: "", nom: "" } });
  }

  static async #onPosteOuvrir(event, target) {
    const el = target.closest("[data-poste]");
    const a = acteurPoste(this.document.system[el.dataset.groupe][el.dataset.poste]);
    a?.sheet.render(true);
  }

  static async #onPosteTest(event, target) {
    const el = target.closest("[data-poste]");
    const a = acteurPoste(this.document.system[el.dataset.groupe][el.dataset.poste]);
    if (!a) return ui.notifications.warn("Aucun personnage à ce poste.");
    await dialogTest(a, { skillKey: target.dataset.skill });
  }

  static async #onBlessureEquipage(event, target) {
    const idx = Number(target.dataset.index);
    const cur = this.document.system.santeEquipage.coches;
    await this.document.update({ "system.santeEquipage.coches": cur === idx ? idx - 1 : idx });
  }

  static async #onBourse(event, target) {
    await operationBourse(this.document, "system.coffre", target.dataset.op);
  }

  static #onBourseToutes() {
    this._bourseToutes = !this._bourseToutes;
    this.render();
  }

  /** Vend une marchandise de la cale au cours choisi : la valeur va dans le coffre. */
  static async #onVendreCargaison(event, target) {
    const id = target.closest("[data-cargo]")?.dataset.cargo;
    const c = this.document.system.cargaison?.[id];
    if (!c) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Vendre la cargaison" },
      content: `<p>Vendre <strong>${c.nom}</strong> pour <strong>${formatPieces(c.valeur)}</strong> pièces de huit (cours ${PN2.cours[c.cours] ?? c.cours}) ?</p><p class="hint">Le produit de la vente est versé dans le coffre de l'équipage.</p>`
    });
    if (!ok) return;
    await this.document.update({ "system.coffre.pieces": (this.document.system.coffre.pieces ?? 0) + (c.valeur ?? 0), [`system.cargaison.-=${id}`]: null });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }), content: `<div class="pn2-card"><p><i class="fa-solid fa-scale-balanced"></i> ${this.document.name} vend ${c.nom} pour ${formatPieces(c.valeur)} pièces de huit.</p></div>` });
  }

  /** Réparation : remonte une localisation au niveau de dommages supérieur. */
  static async #onReparer(event, target) {
    const zone = target.dataset.zone, loc = target.dataset.loc;
    const s = this.document.system;
    const max = s.structure[zone].max;
    const seuils = seuilsStructure(max);
    const ps = s.structure[zone][loc];
    const paliers = [seuils.critique, seuils.grave, seuils.serieux, seuils.leger, seuils.ok].sort((a, b) => a - b);
    const next = paliers.find(p => p > ps) ?? max;
    await this.document.update({ [`system.structure.${zone}.${loc}`]: Math.min(max, next) });
  }
}

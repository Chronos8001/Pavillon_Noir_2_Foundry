import { PN2 } from "../config.mjs";
import { comboHTML } from "../documents/item.mjs";
import { EFFETS_AVANTAGE } from "../data/items.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class PN2ItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "item"],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      afficher: PN2ItemSheet.#onAfficher
    }
  };

  static PARTS = {
    body: { template: "systems/pavillon-noir-2/templates/item/item-sheet.hbs", scrollable: [""] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    context.item = item;
    context.system = item.system;
    context.config = PN2;
    context.editable = this.isEditable;
    context.type = item.type;
    context.isType = Object.fromEntries(["arme", "armure", "equipement", "avantage", "manoeuvre", "marchandise", "historique", "voie", "pouvoir"].map(t => [t, item.type === t]));
    context.caracOptions = Object.fromEntries(Object.entries(PN2.caracs).map(([k, d]) => [k, d.label]));
    const comps = { mainsNues: "Combat à mains nues", mousquet: "Mousquet", pistolet: "Pistolet", grenade: "Grenade", armesBlanches: "Armes blanches (spécialité)", armesJet: "Armes de jet/trait (spécialité)" };
    context.competences = comps;
    context.categoriesArme = { blanche: "Arme blanche", tir: "Arme de tir", jet: "Arme de jet/trait" };
    context.mdOptions = { for: "MDFor", adr: "MDAdr", aucun: "Aucun" };
    context.tailles = PN2.taillesArme;
    context.qualites = PN2.qualitesArme;
    context.escrimeArmes = PN2.escrimeArmes;
    context.escrimeTypes = Object.fromEntries(Object.entries(PN2.escrimeTypes).map(([k, d]) => [k, d.label]));
    context.cours = PN2.cours;
    context.etapes = { peuple: "Peuple et pays d'origine", origine: "Origine sociale", jeunesse: "Événement de la jeunesse", profession: "Profession", religion: "Religion" };
    context.categoriesList = Object.entries(PN2.skillCategories).map(([k, l]) => ({ key: k, label: l, value: item.system.categories?.[k] ?? 0 }));
    context.valeurMarchandise = item.type === "marchandise" ? Math.round(item.system.valeur * 100) / 100 : 0;
    context.natures = { avantage: "Avantage", faiblesse: "Faiblesse" };
    context.locs = PN2.locKeys.map(k => ({ key: k, label: PN2.locLabels[k], checked: item.system.localisations?.[k] }));
    if (item.type === "arme") {
      context.listeQualites = Object.entries(item.system.listeQualites).map(([k, d]) => ({ key: k, ...d, value: item.system.qualites?.[k] ?? 0 }));
      context.doubles = PN2.qualitesDouble;
      context.bonusQualites = item.system.bonusQualites;
    }
    if (item.type === "avantage") {
      context.effets = EFFETS_AVANTAGE;
      context.escrimeAcces = { "": "—", ...Object.fromEntries(Object.entries(PN2.escrimeTypes).filter(([k]) => k !== "botte").map(([k, d]) => [k, d.label])) };
      context.optionsTexte = (item.system.options ?? []).map(o => `${o.label} : ${o.pc}${o.modificateurs ? ` | ${o.modificateurs}` : ""}`).join("\n");
      context.pcEffectifs = item.system.pcEffectifs;
    }
    if (item.type === "manoeuvre") {
      context.comboHTML = comboHTML(item.system.combo);
      context.puissance = item.system.puissance;
    }
    context.typesReligion = Object.fromEntries(Object.entries(PN2.magie.types).map(([k, d]) => [k, d.label]));
    if (item.type === "voie") context.cleVoie = item.system.cleEffective;
    if (item.type === "pouvoir") {
      const voies = item.actor ? item.actor.items.filter(i => i.type === "voie") : game.items.filter(i => i.type === "voie");
      context.voiesConnues = voies.map(v => ({ cle: v.system.cleEffective, nom: v.name }));
    }
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", { async: true, relativeTo: item });
    return context;
  }

  /** Les variantes d'un avantage se saisissent en texte : « Libellé : PC | modificateurs », une par ligne. */
  _prepareSubmitData(event, form, formData, updateData) {
    const data = super._prepareSubmitData(event, form, formData, updateData);
    const txt = formData.object?.optionsTexte;
    if (this.document.type === "avantage" && typeof txt === "string") {
      data.system ??= {};
      data.system.options = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
        const [gauche, modificateurs = ""] = l.split("|").map(x => x.trim());
        const m = gauche.match(/^(.*?)\s*:\s*([+-]?\d+)\s*(?:PC)?$/i);
        return m ? { label: m[1].trim(), pc: Number(m[2]), modificateurs } : { label: gauche, pc: 0, modificateurs };
      });
      delete data.optionsTexte;
    }
    return data;
  }

  static async #onAfficher() {
    await this.document.afficher();
  }
}

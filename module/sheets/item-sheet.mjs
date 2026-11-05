import { PN2 } from "../config.mjs";
import { comboHTML } from "../documents/item.mjs";

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
    context.isType = Object.fromEntries(["arme", "armure", "equipement", "avantage", "manoeuvre", "marchandise", "historique"].map(t => [t, item.type === t]));
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
    if (item.type === "manoeuvre") {
      context.comboHTML = comboHTML(item.system.combo);
      context.puissance = item.system.puissance;
    }
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", { async: true, relativeTo: item });
    return context;
  }

  static async #onAfficher() {
    await this.document.afficher();
  }
}

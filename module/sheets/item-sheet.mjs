import { PN2 } from "../config.mjs";
import { comboHTML } from "../documents/item.mjs";
import { EFFETS_AVANTAGE, FREQUENCES_OBJET, DUREES_ACTIVATION_OBJET, NATURES_OBJET, MODES_OBJET, FORMES_OBJET } from "../data/items.mjs";
import * as Magie from "../magie/service.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class PN2ItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "item"],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      afficher: PN2ItemSheet.#onAfficher,
      ouvrirReference: PN2ItemSheet.#onOuvrirReference,
      retirerReference: PN2ItemSheet.#onRetirerReference,
      effacerReference: PN2ItemSheet.#onEffacerReference,
      effetCreer: PN2ItemSheet.#onEffetCreer,
      effetEditer: PN2ItemSheet.#onEffetEditer,
      effetSupprimer: PN2ItemSheet.#onEffetSupprimer
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
    context.isType = Object.fromEntries(["arme", "armure", "equipement", "avantage", "manoeuvre", "marchandise", "historique", "religion", "voie", "pouvoir", "alea", "objetPouvoir"].map(t => [t, item.type === t]));
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
    if (["religion", "voie", "pouvoir"].includes(item.type)) await this.#contexteMagie(item, context);
    if (item.type === "alea") {
      context.categoriesAlea = { "": "—", tirage: "Tirage", activation: "Activation", duree: "Durée des effets", consequences: "Conséquences des effets" };
      context.sensAlea = { "": "Les deux", droit: "Droit (Succès)", renverse: "Renversé (Colère)" };
      context.visibilitesAlea = { mj: "MJ seulement", joueur: "Joueur" };
    }
    if (item.type === "objetPouvoir") {
      const s = item.system;
      context.isGM = game.user.isGM;
      context.naturesObjet = NATURES_OBJET;
      context.modesObjet = MODES_OBJET;
      context.formesObjet = FORMES_OBJET[s.nature] ?? [];
      context.frequencesObjet = Object.fromEntries(Object.entries(FREQUENCES_OBJET).map(([k, d]) => [k, `${d.label} (${d.cout})`]));
      context.dureesObjet = Object.fromEntries(Object.entries(DUREES_ACTIVATION_OBJET).map(([k, d]) => [k, `${d.label} (${d.cout})`]));
      context.ephemere = s.nature === "ephemere";
      context.cout = s.coutCreation;
      context.pouvoirRef = PN2ItemSheet.resoudre(s.pouvoirUuid);
    }
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", { async: true, relativeTo: item });
    return context;
  }

  /* -------------------------------------------- */
  /*  Magie : références entre documents          */
  /* -------------------------------------------- */

  /** Résout une référence UUID sans la charger (index de compendium, monde, objet possédé). */
  static resoudre(uuid) {
    if (!uuid) return null;
    const doc = fromUuidSync(uuid, { strict: false });
    return doc ? { uuid, nom: doc.name ?? "?", cassee: false } : { uuid, nom: "Référence introuvable", cassee: true };
  }

  async #contexteMagie(item, context) {
    const s = item.system;
    context.parametresVisibles = Magie.parametresVisibles();
    if (item.type === "religion") {
      context.voiesReferencees = (s.voies ?? []).map(u => PN2ItemSheet.resoudre(u));
      return;
    }
    if (item.type === "voie") {
      context.cleVoie = s.cleEffective;
      context.religionRef = PN2ItemSheet.resoudre(s.religionUuid);
      // Pouvoirs rattachés : sur le personnage, dans le même compendium, ou dans le monde
      if (item.actor) {
        context.pouvoirsVoie = Magie.pouvoirsVoie(item.actor, item).map(p => ({ uuid: p.uuid, nom: p.name, puissance: p.system.puissance }));
      } else if (item.pack) {
        const index = await game.packs.get(item.pack).getIndex({ fields: ["system.voieUuid", "system.puissance"] });
        context.pouvoirsVoie = index.filter(e => e.type === "pouvoir" && e.system?.voieUuid === item.uuid)
          .map(e => ({ uuid: e.uuid, nom: e.name, puissance: e.system.puissance }));
      } else {
        context.pouvoirsVoie = game.items.filter(i => i.type === "pouvoir" && i.system.voieUuid === item.uuid)
          .map(p => ({ uuid: p.uuid, nom: p.name, puissance: p.system.puissance }));
      }
      context.pouvoirsVoie.sort((a, b) => a.puissance - b.puissance || a.nom.localeCompare(b.nom));
      return;
    }
    // Pouvoir
    context.isGM = game.user.isGM;
    context.applications = { manuel: "Manuel (narratif, MJ)", assiste: "Assisté (bouton du MJ)", automatique: "Automatique (dès l'accord ou l'activation)" };
    context.effetsPouvoir = item.effects.contents.map(e => ({ id: e.id, name: e.name, img: e.img }));
    context.voieRef = PN2ItemSheet.resoudre(s.voieUuid);
    if (item.actor) {
      const r = Magie.voiePossedee(item.actor, item);
      context.voiePossedee = r.voie ? { nom: r.voie.name, mode: r.mode } : null;
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable || !["religion", "voie", "pouvoir", "objetPouvoir"].includes(this.document.type)) return;
    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: ".pn2-drop",
      callbacks: { drop: this.#onDropReference.bind(this) }
    }).bind(this.element);
  }

  /** Dépôt d'une Voie (sur une Religion ou un Pouvoir) ou d'une Religion (sur une Voie). */
  async #onDropReference(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Item" || !data.uuid) return;
    const doc = await fromUuid(data.uuid);
    const item = this.document;
    if (!doc) return;
    if (item.type === "religion" && doc.type === "voie") {
      if (item.system.voies.includes(doc.uuid)) return;
      return item.update({ "system.voies": [...item.system.voies, doc.uuid] });
    }
    if (item.type === "voie" && doc.type === "religion") {
      return item.update({ "system.religionUuid": doc.uuid, "system.religion": doc.name });
    }
    if (item.type === "pouvoir" && doc.type === "voie") {
      return item.update({ "system.voieUuid": doc.uuid, "system.voie": doc.system.cleEffective });
    }
    if (item.type === "objetPouvoir" && doc.type === "pouvoir") {
      const s = doc.system;
      const voie = s.voieUuid ? fromUuidSync(s.voieUuid, { strict: false }) : null;
      return item.update({
        "system.pouvoirUuid": doc.uuid, "system.pouvoir": doc.name, "system.voie": voie?.name ?? s.voie ?? "",
        "system.puissance": s.puissance, "system.portee": s.portee, "system.cible": s.cible, "system.duree": s.duree
      });
    }
    if (item.type === "objetPouvoir") return ui.notifications.warn("Déposez un Pouvoir sur cet Objet de pouvoir.");
    ui.notifications.warn(`Déposez ${item.type === "religion" ? "une Voie" : item.type === "voie" ? "une Religion" : "une Voie"} sur cette fiche.`);
  }

  static async #onEffetCreer() {
    const item = this.document;
    const [ef] = await item.createEmbeddedDocuments("ActiveEffect", [{ name: item.name, img: item.img, transfer: false, origin: item.uuid }]);
    ef?.sheet.render(true);
  }

  static #onEffetEditer(event, target) {
    this.document.effects.get(target.dataset.id)?.sheet.render(true);
  }

  static async #onEffetSupprimer(event, target) {
    await this.document.effects.get(target.dataset.id)?.delete();
  }

  static async #onOuvrirReference(event, target) {
    const doc = await fromUuid(target.dataset.uuid);
    if (doc) doc.sheet.render(true);
    else ui.notifications.warn("Ce document est introuvable : il a peut-être été supprimé.");
  }

  static async #onRetirerReference(event, target) {
    const voies = this.document.system.voies.filter(u => u !== target.dataset.uuid);
    await this.document.update({ "system.voies": voies });
  }

  static async #onEffacerReference(event, target) {
    await this.document.update({ [`system.${target.dataset.champ}`]: "" });
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

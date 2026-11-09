import { PN2 } from "../config.mjs";
import { dialogTest, testChance, groupeSkill } from "../rolls/dice.mjs";
import { attaquer, competenceArme, degatsFixes, porteeArme, risqueLongFeu, escrimesArme } from "../rolls/combat.mjs";
import { coutManoeuvres, acheterManoeuvres } from "../helpers/escrime.mjs";
import { comboHTML } from "../documents/item.mjs";
import { PN2CreationApp } from "../apps/creation.mjs";
import { ControleurMagie } from "../magie/controleur.mjs";
import { contexteBourse, operationBourse, formatPieces } from "../helpers/monnaie.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const TPL = "systems/pavillon-noir-2/templates/actor";

export class PN2PersonnageSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "actor", "personnage"],
    position: { width: 940, height: 860 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollSkill: PN2PersonnageSheet.#onRollSkill,
      rollCarac: PN2PersonnageSheet.#onRollCarac,
      rollChance: PN2PersonnageSheet.#onRollChance,
      attaque: PN2PersonnageSheet.#onAttaque,
      itemCreate: PN2PersonnageSheet.#onItemCreate,
      itemEdit: PN2PersonnageSheet.#onItemEdit,
      itemDelete: PN2PersonnageSheet.#onItemDelete,
      itemShow: PN2PersonnageSheet.#onItemShow,
      itemToggle: PN2PersonnageSheet.#onItemToggle,
      specAdd: PN2PersonnageSheet.#onSpecAdd,
      specDelete: PN2PersonnageSheet.#onSpecDelete,
      blessure: PN2PersonnageSheet.#onBlessure,
      soinsTotal: PN2PersonnageSheet.#onSoinsTotal,
      reputation: PN2PersonnageSheet.#onReputation,
      recupererReputation: PN2PersonnageSheet.#onRecupererReputation,
      xpReset: PN2PersonnageSheet.#onXpReset,
      ouvrirCompendium: PN2PersonnageSheet.#onOuvrirCompendium,
      bourse: PN2PersonnageSheet.#onBourse,
      creation: PN2PersonnageSheet.#onCreation,
      magie: PN2PersonnageSheet.#onMagie,
      basculerMagie: PN2PersonnageSheet.#onBasculerMagie,
      bourseToutes: PN2PersonnageSheet.#onBourseToutes,
      acheterManoeuvres: PN2PersonnageSheet.#onAcheterManoeuvres
    }
  };

  static PARTS = {
    header: { template: `${TPL}/personnage/header.hbs` },
    nav: { template: `${TPL}/personnage/nav.hbs` },
    principal: { template: `${TPL}/personnage/principal.hbs`, scrollable: [""] },
    competences: { template: `${TPL}/personnage/competences.hbs`, scrollable: [""] },
    combat: { template: `${TPL}/personnage/combat.hbs`, scrollable: [""] },
    escrime: { template: `${TPL}/personnage/escrime.hbs`, scrollable: [""] },
    equipement: { template: `${TPL}/personnage/equipement.hbs`, scrollable: [""] },
    magie: { template: `${TPL}/personnage/magie.hbs`, scrollable: [""] },
    notes: { template: `${TPL}/personnage/notes.hbs`, scrollable: [""] }
  };

  tabGroups = { primary: "principal" };

  /** Onglet Magie : état de préparation des actes sacrés (propre à cette fiche, non enregistré). */
  magie = new ControleurMagie();

  /** Section Magie activée sur ce personnage (réglée par le MJ ; activée par défaut). */
  get magieActive() {
    return this.document.getFlag(PN2.id, "magieActive") !== false;
  }

  /** @override : la partie Magie n'est pas rendue quand la section est désactivée. */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!this.magieActive) delete parts.magie;
    return parts;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const sys = actor.system;
    context.actor = actor;
    context.system = sys;
    context.config = PN2;
    context.editable = this.isEditable;
    context.isPNJ = actor.type === "pnj";
    context.isGM = game.user.isGM;
    context.magieActive = this.magieActive;
    if (!context.magieActive && this.tabGroups.primary === "magie") this.tabGroups.primary = "principal";
    context.tab = this.tabGroups.primary;
    context.tabs = [
      { id: "principal", label: "Personnage", icon: "fa-solid fa-user" },
      { id: "competences", label: "Compétences", icon: "fa-solid fa-list-check" },
      { id: "combat", label: "Combat & Santé", icon: "fa-solid fa-heart-pulse" },
      { id: "escrime", label: "Escrime", icon: "fa-solid fa-khanda" },
      { id: "equipement", label: "Équipement", icon: "fa-solid fa-sack-dollar" },
      { id: "magie", label: "Magie", icon: "fa-solid fa-hands-praying" },
      { id: "notes", label: "Notes", icon: "fa-solid fa-feather" }
    ].filter(t => t.id !== "magie" || context.magieActive).map(t => ({ ...t, active: t.id === context.tab }));

    // Caractéristiques (rose des vents)
    context.caracs = Object.entries(PN2.caracs).map(([k, d]) => ({
      key: k, label: d.label, abbr: d.abbr, value: sys.caracs[k].value, effective: sys.c[k], modifiee: sys.c[k] !== sys.caracs[k].value
    }));
    context.caracMap = Object.fromEntries(context.caracs.map(c => [c.key, c]));
    context.vc = Object.entries(PN2.commandement).map(([k, d]) => ({
      key: k, label: d.label, value: sys.vc[k], formule: `(${PN2.caracs[d.caracs[0]].abbr} + ${PN2.caracs[d.caracs[1]].abbr}) / 2`
    }));
    context.caracOptions = Object.fromEntries(Object.entries(PN2.caracs).map(([k, d]) => [k, d.label]));

    // Compétences par catégorie
    const mods = sys.modificateurs?.skill ?? {};
    const cats = {};
    for (const [ck, cl] of Object.entries(PN2.skillCategories)) {
      cats[ck] = { key: ck, label: cl, skills: [], specs: [], facilite: context.isPNJ ? sys.facilites?.[ck] : null };
    }
    for (const [k, d] of Object.entries(PN2.skills)) {
      const v = sys.skills[k];
      const metier = d.armeFeu ? sys.armesFeuMetier : d.metier;
      cats[d.cat].skills.push({
        key: k, label: d.label, group: d.group, metier, cc: d.cc, value: v.value, xp: v.xp,
        mod: (mods[k] ?? 0) + (groupeSkill(d) ? (mods[groupeSkill(d)] ?? 0) : 0) + (mods[d.cat] ?? 0),
        carac: PN2.caracs[d.carac].abbr
      });
    }
    const groups = {};
    for (const [gk, g] of Object.entries(PN2.specGroups)) {
      groups[gk] = { key: gk, label: g.label, entries: [] };
      cats[g.cat].specs.push(groups[gk]);
    }
    for (const [id, sp] of Object.entries(sys.specs ?? {})) {
      const g = groups[sp.group];
      if (!g) continue;
      g.entries.push({ id, ...sp, mod: (mods[sp.group] ?? 0) + (mods[PN2.specGroups[sp.group].cat] ?? 0) });
    }
    for (const g of Object.values(groups)) g.entries.sort((a, b) => a.name.localeCompare(b.name));
    context.categories = Object.values(cats);

    // Objets
    const items = actor.items.contents.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    context.armes = items.filter(i => i.type === "arme").map(i => {
      const sk = competenceArme(actor, i);
      return {
        item: i, id: i.id, name: i.name, img: i.img, system: i.system, skill: sk.label, niveau: sk.value,
        chances: `${sk.value + (i.system.bonusQualites?.eff ?? 0)}F${(sys.c[i.system.carac] ?? 0) + (i.system.bonusQualites?.fac ?? 0)}`, degats: degatsFixes(actor, i),
        longFeu: i.system.estArmeFeu ? risqueLongFeu(i, sk) : null,
        deLongFeu: i.system.estArmeFeu ? PN2.deLongFeu[i.system.qualite] : null,
        taille: PN2.taillesArme[i.system.taille] ?? "", portee: porteeArme(i),
        qualitesTxt: i.system.resumeQualites,
        escrimes: i.system.categorie === "blanche" ? escrimesArme(actor, i).map(e => `${e.label.replace(/^Escrime (à l'|à la |au |à )?/, "")} ${e.value}`).join(", ") : ""
      };
    });
    context.armures = items.filter(i => i.type === "armure").map(i => ({
      id: i.id, name: i.name, img: i.img, system: i.system,
      locs: PN2.locKeys.filter(k => i.system.localisations[k]).map(k => PN2.locLabels[k]).join(", ")
    }));
    context.equipements = items.filter(i => ["equipement", "objetPouvoir"].includes(i.type));
    const ordreEtapes = { peuple: 0, origine: 1, jeunesse: 2, profession: 3, religion: 4 };
    const nomEtapes = { peuple: "Peuple", origine: "Origine sociale", jeunesse: "Jeunesse", profession: "Profession", religion: "Religion" };
    context.historiques = items.filter(i => i.type === "historique")
      .sort((a, b) => (ordreEtapes[a.system.etape] ?? 9) - (ordreEtapes[b.system.etape] ?? 9) || ((a.flags[PN2.id]?.moment === "adolescence") - (b.flags[PN2.id]?.moment === "adolescence")))
      .map(i => ({ id: i.id, name: i.name, img: i.img, etape: nomEtapes[i.system.etape], texte: i.flags[PN2.id]?.texte ?? i.name }));
    context.marchandises = items.filter(i => i.type === "marchandise").map(i => ({ id: i.id, name: i.name, img: i.img, system: i.system, cours: PN2.cours[i.system.cours], valeur: formatPieces(i.system.valeur) }));
    context.bourse = contexteBourse(sys.richesse, this._bourseToutes ?? false);
    context.totalBourse = formatPieces(sys.richesse.total);
    const ligneAv = i => ({ id: i.id, name: i.name, img: i.img, system: i.system, pc: i.system.pcEffectifs, modificateurs: i.system.modificateursEffectifs });
    context.avantages = items.filter(i => i.type === "avantage" && i.system.nature !== "faiblesse").map(ligneAv);
    context.faiblesses = items.filter(i => i.type === "avantage" && i.system.nature === "faiblesse").map(ligneAv);

    // Escrime
    const manoeuvres = items.filter(i => i.type === "manoeuvre");
    context.escrimes = Object.entries(PN2.escrimeTypes).filter(([k]) => k !== "botte").map(([k, d]) => {
      const e = sys.escrime[k];
      const list = manoeuvres.filter(m => m.system.escrime === k).sort((a, b) => a.system.niveau - b.system.niveau || a.name.localeCompare(b.name));
      const depenses = coutManoeuvres(list);
      return {
        key: k, label: d.label, opps: d.opportunites.join(" "), value: e.value, xp: e.xp, predilection: e.predilection,
        acces: e.acces, pointsTrempe: e.pointsTrempe,
        xpPratique: e.value > 0 && e.xp > e.value,
        pointsBonus: e.pointsBonus, points: e.points, depenses, reste: (e.points ?? 0) - depenses, destreza: k === "destreza",
        science: e.science, strategie: e.strategie,
        scienceActuelle: e.scienceActuelle, strategieActuelle: e.strategieActuelle,
        manoeuvres: list.map(m => ({ id: m.id, name: m.name, niveau: m.system.niveau, combo: comboHTML(m.system.combo), puissance: m.system.puissance, effet: m.system.effet, ecole: m.system.ecole, strategie: m.system.strategie }))
      };
    });
    context.bottes = manoeuvres.filter(m => m.system.escrime === "botte").map(m => ({ id: m.id, name: m.name, combo: comboHTML(m.system.combo), effet: m.system.effet }));
    context.escrimeMode = game.settings.get(PN2.id, "escrimeMode");
    context.ecolesOptions = Object.fromEntries(Object.entries(PN2.ecoles).map(([k, d]) => [k, d.label]));
    context.pasosOrdre = String(sys.escrime.pasosOrdre || "torse,tete,brasD,jambeD,brasG,jambeG").split(",").map(k => PN2.locLabels[k.trim()]).filter(Boolean).join(" → ");

    // Santé : silhouette par localisation
    const lvlKeys = ["L", "S", "G", "Cr", "Co", "M"];
    const maxParNiveau = [2, 2, 2, 2, 2, 1];
    context.locs = ["tete", "brasD", "torse", "brasG", "jambeD", "jambeG"].map(k => {
      const coches = sys.sante.loc[k].coches;
      const cases = [];
      let index = 0;
      lvlKeys.forEach((lk, li) => {
        const dispo = sys.casesNiveaux[li];
        for (let j = 0; j < maxParNiveau[li]; j++) {
          if (j < dispo) { index++; cases.push({ niveau: lk, index, coche: index <= coches, dispo: true }); }
          else cases.push({ niveau: lk, dispo: false });
        }
      });
      const num = { tete: 6, brasD: 5, torse: 3, brasG: 4, jambeD: 2, jambeG: 1 }[k];
      return { key: k, label: PN2.locLabels[k], num, cases, etat: sys.santeLoc[k].label, niveau: sys.santeLoc[k].niveau, protection: sys.santeLoc[k].protection, protManuelle: sys.sante.loc[k].protection };
    });
    context.etats = PN2.etatsSante.slice(1).map((l, i) => ({ label: l, actif: sys.etat === i + 1, malus: PN2.malusSante[i + 1] }));

    // Réputation : cases de points dépensés
    for (const r of ["gloire", "infamie"]) {
      const rep = sys.reputation[r];
      context[r] = {
        ...rep, cases: Array.from({ length: 10 }, (_, i) => ({ i: i + 1, dispo: i < rep.niveau, depense: i < rep.depenses }))
      };
    }

    // Textes enrichis
    const TE = foundry.applications.ux.TextEditor.implementation;
    context.notesHTML = await TE.enrichHTML(sys.notes ?? "", { async: true, relativeTo: actor });
    context.bioHTML = await TE.enrichHTML(sys.biographie ?? "", { async: true, relativeTo: actor });
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    context.partId = partId;
    context.active = context.tab === partId;
    if (partId === "magie") context.magie = this.magie.contexte(this.document);
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const onglet = this.element.querySelector('section[data-tab="magie"]');
    // Section désactivée : la partie n'est plus rendue, on retire l'ancienne du DOM
    if (onglet && !this.magieActive) onglet.remove();
    else if (onglet) this.magie.lier(onglet, () => this.render({ parts: ["magie"] }));
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static async #onRollSkill(event, target) {
    const key = target.closest("[data-skill]")?.dataset.skill;
    if (key) await dialogTest(this.document, { skillKey: key });
  }

  static async #onRollCarac(event, target) {
    await dialogTest(this.document, { carac: target.dataset.carac });
  }

  static async #onRollChance() {
    await testChance(this.document);
  }

  static async #onAttaque(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (item) await attaquer(this.document, item);
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const sys = {};
    if (target.dataset.nature) sys.nature = target.dataset.nature;
    if (target.dataset.escrime) sys.escrime = target.dataset.escrime;
    const name = { arme: "Nouvelle arme", armure: "Nouvelle armure", equipement: "Nouvel objet", avantage: target.dataset.nature === "faiblesse" ? "Nouvelle faiblesse" : "Nouvel avantage", manoeuvre: "Nouvelle manœuvre", objetPouvoir: "Nouvel objet de pouvoir" }[type] ?? "Nouvel objet";
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type, system: sys }]);
    item?.sheet.render(true);
  }

  static #onItemEdit(event, target) {
    this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)?.sheet.render(true);
  }

  static async #onItemDelete(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Supprimer" }, content: `<p>Supprimer <strong>${item.name}</strong> ?</p>` });
    if (ok) await item.delete();
  }

  static async #onItemShow(event, target) {
    await this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)?.afficher();
  }

  static async #onItemToggle(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    const field = target.dataset.field;
    if (item && field) await item.update({ [field]: !foundry.utils.getProperty(item, field) });
  }

  static async #onSpecAdd(event, target) {
    await this.document.ajouterSpecialite(target.dataset.group, "");
  }

  static async #onSpecDelete(event, target) {
    await this.document.supprimerSpecialite(target.closest("[data-spec]")?.dataset.spec);
  }

  /** Clic sur une case de blessure : coche jusqu'à cette case (ou décoche la dernière). */
  static async #onBlessure(event, target) {
    const loc = target.closest("[data-loc]")?.dataset.loc;
    const idx = Number(target.dataset.index);
    if (!loc || !idx) return;
    const cur = this.document.system.sante.loc[loc].coches;
    const val = cur === idx ? idx - 1 : idx;
    await this.document.update({ [`system.sante.loc.${loc}.coches`]: val });
  }

  static async #onSoinsTotal() {
    const upd = {};
    for (const k of PN2.locKeys) upd[`system.sante.loc.${k}.coches`] = 0;
    await this.document.update(upd);
  }

  /** Clic sur une case de points de Gloire/Infamie dépensés. */
  static async #onReputation(event, target) {
    const r = target.dataset.rep;
    const i = Number(target.dataset.index);
    const cur = this.document.system.reputation[r].depenses;
    await this.document.update({ [`system.reputation.${r}.depenses`]: cur === i ? i - 1 : i });
  }

  static async #onRecupererReputation() {
    await this.document.update({ "system.reputation.gloire.depenses": 0, "system.reputation.infamie.depenses": 0 });
  }

  /** Remet à zéro les cases d'expérience par la pratique. */
  static async #onXpReset() {
    const upd = {};
    for (const k of Object.keys(PN2.skills)) upd[`system.skills.${k}.xp`] = false;
    for (const id of Object.keys(this.document.system.specs ?? {})) upd[`system.specs.${id}.xp`] = false;
    await this.document.update(upd);
  }

  static #onCreation() {
    new PN2CreationApp(this.document).render(true);
  }

  /** Boutons de l'onglet Magie (data-op = opération). */
  static async #onMagie(event, target) {
    await this.magie.action(this.document, target, () => this.render({ parts: ["magie"] }));
  }

  /** Bouton du MJ : active ou désactive la section Magie de ce personnage. */
  static async #onBasculerMagie() {
    if (!game.user.isGM) return;
    const active = !this.magieActive;
    if (!active && this.tabGroups.primary === "magie") this.tabGroups.primary = "principal";
    await this.document.setFlag(PN2.id, "magieActive", active);
    ui.notifications.info(`Magie ${active ? "activée" : "désactivée"} pour ${this.document.name}.`);
  }

  static async #onBourse(event, target) {
    await operationBourse(this.document, "system.richesse", target.dataset.op);
  }

  static #onBourseToutes() {
    this._bourseToutes = !this._bourseToutes;
    this.render();
  }

  static async #onAcheterManoeuvres(event, target) {
    await acheterManoeuvres(this.document, target.dataset.escrime);
  }

  static #onOuvrirCompendium(event, target) {
    const pack = game.packs.get(`${PN2.id}.${target.dataset.pack}`);
    pack?.render(true);
  }
}

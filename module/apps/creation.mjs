/**
 * Assistant de création de personnage (La Révolte, étapes 1 à 9).
 */
import { PN2 } from "../config.mjs";
import { pcAvantage } from "../data/items.mjs";
import { findSpec } from "../rolls/dice.mjs";

const SYS = PN2.id;
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const ORIGINES_ARMES_BONNES = ["Armée", "Bourgeoisie", "Intellectuels", "Noblesse", "Marine"];

export class PN2CreationApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super({ ...options, id: `pn2-creation-${actor.id}` });
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    classes: ["pn2", "sheet", "pn2-creation"],
    window: { title: "Création de personnage", resizable: true, icon: "fa-solid fa-feather" },
    position: { width: 760, height: 860 },
    actions: {
      caracs: PN2CreationApp.#onCaracs,
      ajouter: PN2CreationApp.#onAjouter,
      retirer: PN2CreationApp.#onRetirer,
      compendium: PN2CreationApp.#onCompendium,
      aucuneProfession: PN2CreationApp.#onAucuneProfession,
      pc: PN2CreationApp.#onPc,
      personnaliser: PN2CreationApp.#onPersonnaliser,
      annulerPerso: PN2CreationApp.#onAnnulerPerso,
      equipement: PN2CreationApp.#onEquipement,
      terminer: PN2CreationApp.#onTerminer
    }
  };

  static PARTS = { main: { template: "systems/pavillon-noir-2/templates/apps/creation.hbs", scrollable: [""] } };

  get title() { return `Création de personnage : ${this.actor.name}`; }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.actor.apps[this.id] = this;
  }

  _onClose(options) {
    super._onClose(options);
    delete this.actor.apps[this.id];
  }

  get creation() { return this.actor.flags?.[SYS]?.creation ?? {}; }

  async _prepareContext(options) {
    const a = this.actor;
    const sys = a.system;
    const pack = game.packs.get(`${SYS}.historiques`);
    const index = pack ? await pack.getIndex({ fields: ["system.etape", "folder"] }) : [];
    const options_ = etape => [...index].filter(e => e.system?.etape === etape).sort((x, y) => x.name.localeCompare(y.name)).map(e => ({ id: e._id, name: e.name }));
    const historiques = a.items.filter(i => i.type === "historique");
    const de = etape => historiques.filter(i => i.system.etape === etape).map(i => ({ id: i.id, name: i.flags[SYS]?.texte ?? i.name }));

    // Étape 2 : caractéristiques
    // On affiche la répartition de base mémorisée : les bonus (origine, profession) s'y ajoutent ensuite
    const base = this.creation.caracsBase;
    const caracs = Object.entries(PN2.caracs).map(([k, d]) => ({
      key: k, label: d.label, value: base ? base[k] : sys.caracs[k].value, actuel: sys.caracs[k].value, min: k === "res" ? 5 : 3,
      bonus: base ? sys.caracs[k].value - base[k] : 0
    }));
    const totalCaracs = caracs.reduce((t, c) => t + c.value, 0);

    // Étapes 6 et 7 : points de compétence
    const avantages = a.items.filter(i => i.type === "avantage").map(i => ({
      id: i.id, name: i.name, nature: i.system.nature, cout: i.system.cout, pc: pcAvantage(i.system), faiblesse: i.system.nature === "faiblesse"
    }));
    const pcFaiblesses = avantages.filter(x => x.faiblesse).reduce((t, x) => t + x.pc, 0);
    const pcAvantages = avantages.filter(x => !x.faiblesse).reduce((t, x) => t + x.pc, 0);
    const professions = historiques.filter(i => i.system.etape === "profession");
    const restants = professions.reduce((t, i) => t + (i.flags[SYS]?.restants ?? 0), 0)
      + (professions.some(i => i.flags[SYS]?.mode === "multiple") ? Math.max(0, 18 - professions.reduce((t, i) => t + (i.flags[SYS]?.depenses ?? 0), 0)) : 0);
    const aucune = this.creation.aucuneProfession;
    const pointsPerso = 10 + pcFaiblesses - pcAvantages + restants + (aucune ? 6 : 0);
    const perso = this.creation.perso;

    const etapes = {
      caracs: this.creation.caracs === true,
      peuple: de("peuple").length > 0,
      origine: de("origine").length > 0,
      jeunesse: de("jeunesse").length >= 2,
      profession: professions.length > 0 || !!aucune,
      avantages: avantages.length <= 10,
      perso: !!perso,
      religion: de("religion").length > 0,
      equipement: this.creation.equipement === true
    };
    return {
      actor: a, sys, caracs, totalCaracs, caracsOk: totalCaracs === 45 && caracs.every(c => c.value >= c.min && c.value <= 7),
      etapes,
      listes: { peuple: options_("peuple"), origine: options_("origine"), jeunesse: options_("jeunesse"), profession: options_("profession"), religion: options_("religion") },
      choisis: { peuple: de("peuple"), origine: de("origine"), jeunesse: de("jeunesse"), profession: de("profession"), religion: de("religion") },
      aucune, aucuneLabel: aucune ? aucune.map(c => PN2.caracs[c].label).join(" et ") : "",
      avantages, nbAvantages: avantages.filter(x => !x.faiblesse).length, nbFaiblesses: avantages.filter(x => x.faiblesse).length,
      pcFaiblesses, pcAvantages, restants, pointsPerso, perso, persoDetail: perso ? perso.libelles?.join(", ") : "",
      combatAvec2: this.armesDeDepart().map(x => x.label).join(", ") || "aucune",
      qualite: this.qualiteArmes()
    };
  }

  /* -------------------------------------------- */
  /*  Étape 2 : caractéristiques                   */
  /* -------------------------------------------- */

  static async #onCaracs() {
    const upd = {};
    let total = 0;
    const erreurs = [];
    const ancienne = this.creation.caracsBase;
    const base = {};
    for (const [k, d] of Object.entries(PN2.caracs)) {
      const v = Number(this.element.querySelector(`[name="carac_${k}"]`)?.value) || 0;
      total += v;
      const min = k === "res" ? 5 : 3;
      if (v < min || v > 7) erreurs.push(`${d.label} doit être entre ${min} et 7.`);
      base[k] = v;
      // Conserve les bonus déjà appliqués (origine sociale, profession…)
      const bonus = ancienne ? this.actor.system.caracs[k].value - ancienne[k] : 0;
      upd[`system.caracs.${k}.value`] = v + bonus;
    }
    upd[`flags.${SYS}.creation.caracsBase`] = base;
    if (total !== 45) erreurs.push(`Total ${total} : il faut répartir exactement 45 points.`);
    if (erreurs.length) return ui.notifications.warn(erreurs.join(" "));
    upd[`flags.${SYS}.creation.caracs`] = true;
    await this.actor.update(upd);
  }

  /* -------------------------------------------- */
  /*  Étapes 3, 4, 5, 9 : historiques             */
  /* -------------------------------------------- */

  static async #onAjouter(event, target) {
    const etape = target.dataset.etape;
    const id = this.element.querySelector(`[name="sel_${etape}"]`)?.value;
    if (!id) return;
    const doc = await game.packs.get(`${SYS}.historiques`).getDocument(id);
    await this.actor.createEmbeddedDocuments("Item", [doc.toObject()]);
  }

  static async #onRetirer(event, target) {
    await this.actor.items.get(target.dataset.id)?.delete();
  }

  static #onCompendium(event, target) {
    game.packs.get(`${SYS}.${target.dataset.pack}`)?.render(true);
  }

  /** Règle optionnelle : aucune profession (+1 à deux caractéristiques, +6 points). */
  static async #onAucuneProfession() {
    const a = this.actor;
    const cur = this.creation.aucuneProfession;
    if (cur) {
      const upd = { [`flags.${SYS}.creation.-=aucuneProfession`]: null };
      for (const c of cur) upd[`system.caracs.${c}.value`] = a.system.caracs[c].value - 1;
      return a.update(upd);
    }
    if (a.items.some(i => i.type === "historique" && i.system.etape === "profession")) return ui.notifications.warn("Retirez d'abord la profession choisie.");
    const opts = Object.entries(PN2.caracs).map(([k, d]) => `<option value="${k}">${d.label} (${a.system.caracs[k].value})</option>`).join("");
    const form = await foundry.applications.api.DialogV2.wait({
      window: { title: "Aucune profession" },
      content: `<div class="pn2-dialog"><p>Le personnage n'a exercé aucune profession : +1 à deux caractéristiques (max. 8) et 6 points de compétence supplémentaires à l'étape 7.</p>
        <div class="form-group"><label>Première</label><select name="c1">${opts}</select></div><div class="form-group"><label>Seconde</label><select name="c2">${opts}</select></div></div>`,
      buttons: [{ action: "ok", label: "Valider", default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object }],
      rejectClose: false
    });
    if (!form) return;
    if (form.c1 === form.c2) return ui.notifications.warn("Choisissez deux caractéristiques différentes.");
    const upd = { [`flags.${SYS}.creation.aucuneProfession`]: [form.c1, form.c2] };
    for (const c of [form.c1, form.c2]) upd[`system.caracs.${c}.value`] = Math.min(8, a.system.caracs[c].value + 1);
    await a.update(upd);
  }

  /* -------------------------------------------- */
  /*  Étape 6 : avantages et faiblesses            */
  /* -------------------------------------------- */

  static async #onPc(event, target) {
    const item = this.actor.items.get(target.dataset.id);
    const v = Number(this.element.querySelector(`[name="pc_${target.dataset.id}"]`)?.value);
    if (item && Number.isFinite(v)) await item.update({ "system.pc": Math.abs(v) });
  }

  /* -------------------------------------------- */
  /*  Étape 7 : personnalisation des compétences  */
  /* -------------------------------------------- */

  static async #onPersonnaliser() {
    const a = this.actor;
    if (this.creation.perso) return ui.notifications.warn("Annulez d'abord la personnalisation précédente.");
    const ctx = await this._prepareContext({});
    const points = ctx.pointsPerso;
    // Compétences générales (toutes) et compétences de métier déjà acquises ; +1 maximum, niveau 3 maximum
    const lignes = [];
    for (const [k, d] of Object.entries(PN2.skills)) {
      const v = a.system.skills[k].value;
      const metier = d.armeFeu ? a.system.armesFeuMetier : d.metier;
      if (v >= 3 || (metier && v === 0)) continue;
      lignes.push({ id: `s_${k}`, label: d.group ? `${d.group} : ${d.label}` : d.label, v, cat: d.cat });
    }
    for (const [id, sp] of Object.entries(a.system.specs ?? {})) {
      if (sp.value >= 3 || (sp.metier && sp.value === 0)) continue;
      lignes.push({ id: `p_${id}`, label: `${PN2.specGroups[sp.group]?.label ?? sp.group} : ${sp.name}`, v: sp.value, cat: PN2.specGroups[sp.group]?.cat });
    }
    const nouvelles = Object.entries(PN2.specGroups).filter(([, g]) => !g.metierDefaut).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join("");
    let html = `<div class="pn2-dialog pn2-assistant"><p>Points disponibles : <strong>${points}</strong> (10 + faiblesses ${ctx.pcFaiblesses} − avantages ${ctx.pcAvantages} + restes de profession ${ctx.restants}${ctx.aucune ? " + 6 sans profession" : ""}).</p>
      <p class="hint">Chaque point augmente une compétence d'un niveau (une seule fois par compétence, niveau 3 maximum). Les compétences de métier ne sont accessibles que si elles ont été acquises auparavant.</p><div class="choix-competences">`;
    for (const [cat, label] of Object.entries(PN2.skillCategories)) {
      const ls = lignes.filter(l => l.cat === cat);
      if (!ls.length) continue;
      html += `<fieldset><legend>${label}</legend>${ls.map(l => `<label class="choix"><input type="checkbox" name="${l.id}"> ${l.label} (${l.v} → ${l.v + 1})</label>`).join("")}</fieldset>`;
    }
    html += `<fieldset><legend>Nouvelle spécialité (compétence générale)</legend>`;
    for (let i = 0; i < 3; i++) html += `<div class="choix"><select name="ng_${i}"><option value="">—</option>${nouvelles}</select><input type="text" name="nn_${i}" class="nom-spe" placeholder="Spécialité (ex. Sabre, Anglais)"></div>`;
    html += `</fieldset></div></div>`;
    for (;;) {
      const form = await foundry.applications.api.DialogV2.wait({
        window: { title: "Personnalisation des compétences" }, position: { width: 560 }, content: html,
        buttons: [{ action: "ok", label: "Appliquer", default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object }, { action: "cancel", label: "Annuler" }],
        rejectClose: false
      });
      if (!form || form === "cancel") return;
      const choisies = lignes.filter(l => form[l.id]);
      const nouv = [0, 1, 2].filter(i => form[`ng_${i}`] && form[`nn_${i}`]).map(i => ({ group: form[`ng_${i}`], name: form[`nn_${i}`] }));
      const total = choisies.length + nouv.length;
      if (total > points) { ui.notifications.warn(`${total} points utilisés pour ${points} disponibles.`); continue; }
      const upd = {}; const annul = { skills: {}, specs: {}, nouvelles: [], libelles: [] };
      for (const l of choisies) {
        if (l.id.startsWith("s_")) { const k = l.id.slice(2); annul.skills[k] = l.v; upd[`system.skills.${k}.value`] = l.v + 1; }
        else { const id = l.id.slice(2); annul.specs[id] = l.v; upd[`system.specs.${id}.value`] = l.v + 1; }
        annul.libelles.push(l.label);
      }
      for (const n of nouv) {
        if (findSpec(a, n.group, n.name)) continue;
        const id = foundry.utils.randomID();
        upd[`system.specs.${id}`] = { group: n.group, name: n.name, value: 1, xp: false, metier: false, carac: "" };
        annul.nouvelles.push(id); annul.libelles.push(`${PN2.specGroups[n.group].label} : ${n.name}`);
      }
      annul.points = total;
      upd[`flags.${SYS}.creation.perso`] = annul;
      await a.update(upd);
      return;
    }
  }

  static async #onAnnulerPerso() {
    const a = this.actor;
    const p = this.creation.perso;
    if (!p) return;
    const upd = { [`flags.${SYS}.creation.-=perso`]: null };
    for (const [k, v] of Object.entries(p.skills ?? {})) upd[`system.skills.${k}.value`] = v;
    for (const [id, v] of Object.entries(p.specs ?? {})) if (a.system.specs[id]) upd[`system.specs.${id}.value`] = v;
    for (const id of p.nouvelles ?? []) if (a.system.specs[id]) upd[`system.specs.-=${id}`] = null;
    await a.update(upd);
  }

  /* -------------------------------------------- */
  /*  Étape 9 : touche finale                      */
  /* -------------------------------------------- */

  /** Armes correspondant aux compétences de combat de niveau 2 ou plus. */
  armesDeDepart() {
    const a = this.actor;
    const out = [];
    const ARMES = { mousquet: "Mousquet", pistolet: "Pistolet", grenade: "Grenade" };
    for (const [k, nom] of Object.entries(ARMES)) if (a.system.skills[k].value >= 2) out.push({ label: nom, nom });
    const SPEC = { "rapiere": "Rapière", "sabre": "Sabre", "dague": "Dague / main gauche", "hache": "Hache d'abordage", "lance": "Lance / pique", "baton": "Bâton / barre de cabestan",
      "fouet": "Fouet", "casse-tete": "Casse-tête / masse", "nerf de boeuf": "Nerf de bœuf / cabillot", "epee caraibe": "Épée caraïbe en bois (bottou)", "cimeterre": "Cimeterre",
      "arc": "Arc", "arbalete": "Arbalète", "javelot": "Javelot", "sarbacane": "Sarbacane", "lancer de dague": "Dague (lancée)", "crochet": "Crochet" };
    const n = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace("œ", "oe").toLowerCase().trim();
    for (const sp of Object.values(a.system.specs ?? {})) {
      if (!["armesBlanches", "armesJet"].includes(sp.group) || sp.value < 2) continue;
      const nom = SPEC[n(sp.name)];
      if (nom) out.push({ label: nom, nom });
    }
    return out;
  }

  qualiteArmes() {
    const origine = this.actor.items.find(i => i.type === "historique" && i.system.etape === "origine")?.name;
    return ORIGINES_ARMES_BONNES.includes(origine) ? "normale" : "mauvaise";
  }

  static async #onEquipement() {
    const a = this.actor;
    const pack = game.packs.get(`${SYS}.equipement`);
    const docs = await pack.getDocuments();
    const qualite = this.qualiteArmes();
    const existants = new Set(a.items.filter(i => i.type === "arme").map(i => i.name));
    const nouvelles = [];
    for (const w of this.armesDeDepart()) {
      if (existants.has(w.nom)) continue;
      const d = docs.find(x => x.name === w.nom);
      if (!d) continue;
      const o = d.toObject();
      o.system.qualite = qualite; o.system.equipee = true;
      nouvelles.push(o);
    }
    if (nouvelles.length) await a.createEmbeddedDocuments("Item", nouvelles);
    // Pécule : 5 pièces de huit, +100 par point de l'avantage « Argent supplémentaire »
    const argent = a.items.filter(i => i.type === "avantage" && i.name.startsWith("Argent")).reduce((t, i) => t + pcAvantage(i.system), 0);
    await a.update({ "system.richesse.pieces": 5 + 100 * argent, [`flags.${SYS}.creation.equipement`]: true });
    ui.notifications.info(`${nouvelles.length} arme(s) ajoutée(s) (${qualite === "normale" ? "bonne qualité" : "mauvaise qualité"}), pécule de ${5 + 100 * argent} pièces de huit.`);
  }

  static async #onTerminer() {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pn2-card"><h3>${this.actor.name} est prêt à prendre la mer !</h3><p>${[this.actor.system.infos.peuple, this.actor.system.infos.origines, this.actor.system.infos.profession].filter(Boolean).join(" — ")}</p></div>`
    });
    this.close();
  }
}

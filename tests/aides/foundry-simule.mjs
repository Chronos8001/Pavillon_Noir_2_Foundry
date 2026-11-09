/**
 * Foundry simulé pour les tests d'intégration de la magie (sans instance Foundry).
 * Reproduit le strict nécessaire : utilisateurs et permissions, réglages, temps du monde, dés (valeurs imposées),
 * messages, acteurs (mises à jour par chemins pointés, garde-fous de _preUpdate), objets et Active Effects.
 * À importer AVANT les modules du système.
 */
import { cleVoie } from "../../module/magie/regles.mjs";

export const des = [];                       // file des valeurs de d10 imposées (sinon 5)
export const messages = [];
export const notifications = [];
let n = 0;

const estObjet = v => v && typeof v === "object" && !Array.isArray(v);
const utils = {
  randomID: () => `id${(++n).toString().padStart(4, "0")}`,
  escapeHTML: s => String(s),
  deepClone: o => structuredClone(o),
  getProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o),
  hasProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o) !== undefined,
  setProperty: (o, p, v) => { const k = p.split("."); let x = o; for (const c of k.slice(0, -1)) x = x[c] ??= {}; x[k.at(-1)] = v; return true; },
  expandObject: o => { const out = {}; for (const [k, v] of Object.entries(o)) utils.setProperty(out, k, estObjet(v) ? utils.expandObject(v) : v); return out; },
  flattenObject: (o, p = "") => Object.entries(o).reduce((acc, [k, v]) => (estObjet(v) && Object.keys(v).length ? Object.assign(acc, utils.flattenObject(v, `${p}${k}.`)) : (acc[`${p}${k}`] = v, acc)), {}),
  mergeObject: (a, b) => {
    for (const [k, v] of Object.entries(b)) {
      if (k.startsWith("-=")) { delete a[k.slice(2)]; continue; }
      a[k] = estObjet(v) && estObjet(a[k]) ? utils.mergeObject(a[k], v) : (estObjet(v) ? utils.mergeObject({}, v) : v);
    }
    return a;
  },
  isNewerVersion: (a, b) => {
    const pa = String(a).split(".").map(Number); const pb = String(b).split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
    return false;
  }
};

export const mj = { id: "mj", name: "MJ", isGM: true, active: true, targets: new Set() };
export const joueur = { id: "joueur", name: "Alice", isGM: false, active: true, targets: new Set() };
export const autre = { id: "autre", name: "Bruno", isGM: false, active: true, targets: new Set() };
const utilisateurs = { mj, joueur, autre };
let courant = joueur;
let mjActif = mj;
export const connecter = u => { courant = u; };
export const mjConnecte = actif => { mj.active = actif; mjActif = actif ? mj : null; };

const reglages = {
  magieSeuilVisible: false, magieValidationMJ: false, magieParametresVisibles: false, magieAleaMode: "probabilite", magieAleaProbabilite: 30,
  magieRevelationSeuil: 2, magieCleCoffre: "", magieEmpreinteCle: "", magieRecuperationAuto: true, magieMigration: "0.0.0"
};
export const regler = (k, v) => { reglages[k] = v; };

const acteurs = [];
const documents = new Map();     // uuid → document

globalThis.Roll = class {
  constructor(formule) { this.n = Number(String(formule).split("d")[0]) || 1; }
  async evaluate() {
    const results = Array.from({ length: this.n }, () => ({ result: des.length ? des.shift() : 5 }));
    this.dice = [{ results }];
    this.total = results.reduce((s, r) => s + r.result, 0);
    return this;
  }
};
globalThis.ChatMessage = {
  create: async d => { messages.push({ ...d, auteur: courant.id }); return d; },
  getSpeaker: () => ({}),
  applyMode: () => {}
};
globalThis.ui = { notifications: { info: m => notifications.push(["info", m]), warn: m => notifications.push(["warn", m]), error: m => notifications.push(["error", m]) } };
globalThis.CONFIG = {};
globalThis.foundry = {
  utils,
  applications: { handlebars: { renderTemplate: async (chemin, donnees) => `${chemin} ${JSON.stringify(donnees)}` }, instances: new Map() },
  documents: { collections: { CompendiumCollection: { createCompendium: async () => ({}) } } }
};
globalThis.fromUuidSync = uuid => documents.get(uuid) ?? null;
globalThis.fromUuid = async uuid => documents.get(uuid) ?? null;
globalThis.game = {
  get user() { return courant; },
  users: {
    get activeGM() { return mjActif; },
    get: id => utilisateurs[id],
    filter: f => Object.values(utilisateurs).filter(f),
    find: f => Object.values(utilisateurs).find(f)
  },
  settings: { get: (s, k) => reglages[k], set: async (s, k, v) => { reglages[k] = v; } },
  time: { worldTime: 0 },
  items: Object.assign([], { contents: [] }),
  packs: Object.assign([], {}),
  actors: Object.assign(acteurs, { get: id => acteurs.find(a => a.id === id) }),
  pn2: { magie: {} }
};
export const avancerTemps = s => { game.time.worldTime += s; };

/* -------------------------------------------- */

function effetSimule(cible, data) {
  const ef = {
    ...structuredClone(data), id: utils.randomID(), parent: cible,
    getFlag: (s, k) => ef.flags?.[s]?.[k],
    async delete() { cible.effects.splice(cible.effects.indexOf(ef), 1); return ef; }
  };
  return ef;
}

function objetSimule(actor, data) {
  const id = data._id ?? utils.randomID();
  const it = {
    id, type: data.type, name: data.name, img: data.img ?? "", flags: data.flags ?? {}, _stats: data._stats ?? {},
    uuid: actor ? `Actor.${actor.id}.Item.${id}` : `Item.${id}`, actor,
    system: { ...(data.system ?? {}) },
    effects: Object.assign([], { contents: [] }),
    getFlag: (s, k) => it.flags?.[s]?.[k],
    toObject() { return structuredClone({ name: it.name, type: it.type, img: it.img, system: it.system, flags: it.flags, _stats: it._stats }); },
    async createEmbeddedDocuments(t, liste) {
      const crees = liste.map(d => ({ ...structuredClone(d), id: utils.randomID(), toObject() { return structuredClone(d); } }));
      it.effects.push(...crees);
      it.effects.contents = it.effects;
      it.effects.size = it.effects.length;
      return crees;
    }
  };
  it.effects.size = 0;
  Object.defineProperty(it.system, "cleEffective", { get: () => cleVoie(it.name, it.system.cle), enumerable: false });
  documents.set(it.uuid, it);
  return it;
}

/** Données dérivées utiles (comme PersonnageData.prepareDerivedData, en version réduite). */
function deriver(a) {
  const m = a.system.magie;
  const rel = a.items.find(i => i.type === "religion");
  m.religionNom = rel?.name || m.religion || a.system.infos.religion || "";
  m.typeDeduit = rel?.system.type || "";
  m.typeEffectif = m.type || m.typeDeduit;
  m.groupeColere = cleVoie(m.religionNom);
  m.faveurs = a.system.chance + (m.faveursMod ?? 0);
}

/**
 * Crée un personnage simulé.
 * @param {object} o  { nom, proprietaire (id d'utilisateur), religion, type, chance, voies:[{nom, foi, mysteres, affinite, sansTranse}], pouvoirs:[{nom, voie, puissance, …}] }
 */
export async function creerPersonnage(o) {
  const { cle } = { cle: null };
  void cle;
  const id = utils.randomID();
  const flags = {};
  const a = {
    id, uuid: `Actor.${id}`, name: o.nom, type: "personnage", apps: {}, ownership: { [o.proprietaire ?? "joueur"]: 3 },
    flags: { "pavillon-noir-2": flags }, effects: [],
    items: Object.assign([], { get: x => a.items.find(i => i.id === x) }),
    system: {
      chance: o.chance ?? 0, infos: { religion: o.religion ?? "" },
      magie: { religion: o.religion ?? "", type: o.type ?? "communion", actesFoi: 0, peches: 0, faveursMod: 0, colere: {},
        rejets: [], sequelles: [], penitences: [], historique: [], interventions: [] }
    },
    getFlag: (s, k) => flags[k],
    testUserPermission: (u, niveau) => u.isGM || (a.ownership[u.id] ?? 0) >= 3,
    get isOwner() { return a.testUserPermission(game.user, "OWNER"); },
    async update(changes, options = {}) {
      const user = game.user;
      if (!user.isGM && !a.isOwner) throw new Error("Permission refusée par le serveur");
      const diff = utils.expandObject(changes);
      const { controleConcurrence } = await import("../../module/magie/service.mjs");
      const { protegerConsequences } = await import("../../module/magie/service-evenements.mjs");
      if (!controleConcurrence(a, diff, options) || !protegerConsequences(diff, user)) return undefined;
      const fl = diff.flags?.["pavillon-noir-2"];
      if (fl) {
        for (const [k, v] of Object.entries(fl)) { if (k.startsWith("-=")) delete flags[k.slice(2)]; else flags[k] = v; }
        delete diff.flags;
      }
      utils.mergeObject(a, diff);
      deriver(a);
      return a;
    },
    async createEmbeddedDocuments(type, liste) {
      if (type === "ActiveEffect") {
        const crees = liste.map(d => effetSimule(a, d));
        a.effects.push(...crees);
        return crees;
      }
      const crees = liste.map(d => objetSimule(a, d));
      a.items.push(...crees);
      deriver(a);
      return crees;
    },
    async updateEmbeddedDocuments(type, liste) {
      for (const u of liste) {
        const it = a.items.get(u._id);
        for (const [k, v] of Object.entries(u)) if (k !== "_id") utils.setProperty(it, k, v);
      }
    }
  };
  for (const v of o.voies ?? []) objetSimuleSurActeur(a, { type: "voie", name: v.nom, system: { foi: 0, mysteres: 0, affinite: 0, sansTranse: false, groupeColere: "", religion: o.religion ?? "", ...v } });
  for (const p of o.pouvoirs ?? []) objetSimuleSurActeur(a, { type: "pouvoir", name: p.nom, system: { accessible: true, application: "manuel", voieUuid: "", ...p, voie: cleVoie(p.voie) } });
  deriver(a);
  acteurs.push(a);
  documents.set(a.uuid, a);
  return a;
}

function objetSimuleSurActeur(a, data) {
  const it = objetSimule(a, data);
  a.items.push(it);
  return it;
}

/** Jeton ciblé simulé (cible d'un Pouvoir). */
export function cibler(utilisateur, actor) {
  const t = { name: actor.name, document: { uuid: `Scene.s.Token.${actor.id}`, actor }, actor };
  documents.set(t.document.uuid, t.document);
  utilisateur.targets.add(t);
  return t;
}

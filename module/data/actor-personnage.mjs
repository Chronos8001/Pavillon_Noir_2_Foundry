import { PN2 } from "../config.mjs";
import {
  valeurMetier, mdForce, mdAdresse, casesParNiveau, niveauBlessure, etatGeneral, niveauReputation, listeCases
} from "../helpers/tables.mjs";
import { bourseField, totalBourse } from "../helpers/monnaie.mjs";
import { deserialiserActe } from "../magie/moteur.mjs";
import { cleVoie } from "../magie/regles.mjs";

const f = foundry.data.fields;

const int = (initial = 0, opts = {}) => new f.NumberField({ required: true, integer: true, initial, ...opts });
const str = (initial = "") => new f.StringField({ required: false, blank: true, initial });
const bool = (initial = false) => new f.BooleanField({ initial });
const html = () => new f.HTMLField({ required: false, blank: true, initial: "" });

/** Données communes aux personnages-joueurs et aux PNJ. */
export class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const caracs = {};
    for (const k of Object.keys(PN2.caracs)) caracs[k] = new f.SchemaField({ value: int(5, { min: 0 }) });

    const skills = {};
    for (const k of Object.keys(PN2.skills)) {
      skills[k] = new f.SchemaField({ value: int(0, { min: 0 }), xp: bool() });
    }

    const escrime = {};
    for (const k of Object.keys(PN2.escrimeTypes)) {
      if (k === "botte") continue;
      escrime[k] = new f.SchemaField({
        value: int(0, { min: 0 }), xp: int(0, { min: 0 }), predilection: bool(), pointsBonus: int(0), acces: bool()
      });
    }

    const loc = {};
    for (const k of PN2.locKeys) loc[k] = new f.SchemaField({ coches: int(0, { min: 0 }), protection: int(0) });

    const TypedObject = f.TypedObjectField ?? f.ObjectField;
    const specSchema = new f.SchemaField({
      group: str("armesBlanches"),
      name: str(""),
      value: int(0, { min: 0 }),
      xp: bool(),
      metier: bool(),
      carac: str("")
    });

    return {
      caracs: new f.SchemaField(caracs),
      infos: new f.SchemaField({
        titre: str(), profession: str(), poste: str(), peuple: str(), origines: str(), jeunesse: str(),
        religion: str(), age: str(), taille: str(), poids: str(), surnom: str(), description: str()
      }),
      metier: new f.SchemaField({ nom: str(), carac1: str("adr"), carac2: str("per") }),
      secondaires: new f.SchemaField({ actionsBonus: int(0), initiativeBonus: int(0), chanceBonus: int(0) }),
      skills: new f.SchemaField(skills),
      specs: f.TypedObjectField ? new TypedObject(specSchema) : new f.ObjectField(),
      armesFeuMetier: bool(false),
      escrime: new f.SchemaField({
        ...escrime, ecole: str(""), arme: str(""),
        ecoleCle: str(""),                 // clé de PN2.ecoles
        manteau: bool(),                   // manteau enroulé autour du bras (destreza : 5 et 0)
        pasosOrdre: str("torse,tete,brasD,jambeD,brasG,jambeG"), // ordre de protection des Pasos
        traitDague: bool(), traitDeuxArmes: bool() // Traits de réputation (À feu et à sang)
      }),
      sante: new f.SchemaField({ loc: new f.SchemaField(loc) }),
      reputation: new f.SchemaField({
        gloire: new f.SchemaField({ score: int(0, { min: 0 }), depenses: int(0, { min: 0 }) }),
        infamie: new f.SchemaField({ score: int(0, { min: 0 }), depenses: int(0, { min: 0 }) })
      }),
      combat: new f.SchemaField({ posture: str("attentive") }),
      richesse: bourseField(5),
      magie: magieField(TypedObject),
      contacts: str(),
      notes: html(),
      biographie: html()
    };
  }

  /** Le PNJ remplace cette méthode pour utiliser les Facilités par catégorie. */
  get isPNJ() { return false; }

  prepareDerivedData() {
    const s = this;
    const actor = this.parent;

    // Modificateurs de caractéristiques apportés par les avantages/faiblesses
    const effets = actor?.items ? collectModificateurs(actor) : { carac: {}, skill: {} };
    s.modificateurs = effets;

    s.c = {};
    for (const [k, v] of Object.entries(s.caracs)) {
      s.c[k] = Math.max(0, (v.value ?? 0) + (effets.carac[k] ?? 0));
    }
    const c = s.c;

    s.chance = c.pou - 5 + (s.secondaires.chanceBonus ?? 0);
    s.initiative = c.ada + (s.secondaires.initiativeBonus ?? 0);
    s.actions = 2 + (s.secondaires.actionsBonus ?? 0);
    s.md = { for: mdForce(c.for), adr: mdAdresse(c.adr) };

    s.vc = {};
    for (const [k, def] of Object.entries(PN2.commandement)) {
      s.vc[k] = valeurMetier(c[def.caracs[0]], c[def.caracs[1]]);
    }
    s.valeurMetier = s.metier.nom ? valeurMetier(c[s.metier.carac1] ?? 0, c[s.metier.carac2] ?? 0) : null;

    // Santé
    const res = c.res;
    s.casesNiveaux = casesParNiveau(res);
    s.casesListe = listeCases(res);
    s.casesTotal = s.casesListe.length;
    const niveaux = [];
    s.santeLoc = {};
    const prot = armureProtection(actor);
    for (const k of PN2.locKeys) {
      const l = s.sante.loc[k];
      const niv = niveauBlessure(res, l.coches);
      niveaux.push(niv);
      s.santeLoc[k] = { niveau: niv, label: PN2.etatsSante[niv], protection: (l.protection ?? 0) + (prot[k] ?? 0) };
    }
    s.etat = etatGeneral(niveaux);
    s.etatLabel = PN2.etatsSante[s.etat];
    s.malusSante = PN2.malusSante[s.etat];
    s.inconscient = s.etat >= 5;

    s.richesse.total = totalBourse(s.richesse);

    // Réputation
    for (const r of ["gloire", "infamie"]) {
      const rep = s.reputation[r];
      rep.niveau = niveauReputation(rep.score);
      rep.qualificatif = (r === "gloire" ? PN2.qualifGloire : PN2.qualifInfamie)[rep.niveau];
      rep.disponibles = Math.max(0, rep.niveau - rep.depenses);
    }

    // Points d'escrime disponibles
    const trempe = pointsTrempe(actor);
    for (const k of Object.keys(PN2.escrimeTypes)) {
      if (k === "botte" || k === "destreza") continue;
      const e = s.escrime[k];
      // Prédilection : N+1 points par niveau, sinon N points par niveau.
      const n = e.value;
      e.pointsTrempe = trempe[k] ?? 0;
      e.points = (e.predilection ? (n * (n + 3)) / 2 : (n * (n + 1)) / 2) + (e.pointsBonus ?? 0) + e.pointsTrempe;
    }
    if (s.escrime.destreza) {
      const d = s.escrime.destreza;
      d.science = d.value * 2;
      d.strategie = d.value;
      const mouv = actor?.items ? actor.items.filter(i => i.type === "manoeuvre" && i.system.escrime === "destreza") : [];
      d.scienceActuelle = mouv.length;
      d.strategieActuelle = mouv.filter(i => i.system.strategie).length;
    }
    s.escrimeur = Object.entries(s.escrime).some(([k, v]) => typeof v === "object" && v.value > 0) || s.skills.escrime.value > 0;

    // Magie (Entre ciel et terre) : Faveurs = Chance (Pouvoir - 5), plus un modificateur temporaire.
    const m = s.magie;
    m.faveurs = s.chance + (m.faveursMod ?? 0);
    // Religion pratiquée : objet Religion possédé, sinon champ libre, sinon religion de l'historique
    const relMagie = actor?.items?.find(i => i.type === "religion") ?? null;
    m.religionItemId = relMagie?.id ?? null;
    m.religionNom = relMagie?.name || m.religion || s.infos.religion || "";
    // Type : saisi sur la fiche, sinon celui de l'objet Religion, de la religion de l'historique, ou d'après son nom
    const relItem = actor?.items?.find(i => i.type === "historique" && i.system.etape === "religion");
    m.typeDeduit = relMagie?.system.type || relItem?.system.typeReligion
      || PN2.magie.religions[cleVoie(m.religionNom)] || PN2.magie.religions[cleVoie(relItem?.name)] || "";
    m.typeEffectif = m.type || m.typeDeduit;
    // Groupe de Colère de la religion pratiquée (les Voies peuvent le surcharger)
    m.groupeColere = cleVoie(relMagie?.system.groupeColere || "") || cleVoie(relMagie?.name, relMagie?.system.cle) || cleVoie(m.religionNom);
    const acte = deserialiserActe(actor?.flags?.[PN2.id]?.acte);
    m.acteEnCours = acte?.statut === "en-cours";
    m.enTranse = !!(m.acteEnCours && acte?.type === "transe" && acte.transe?.actif);
  }

  /** Facilité d'une compétence pour un PNJ (null pour un PJ). */
  facilitePNJ() { return null; }
}

/**
 * Données religieuses persistantes (Entre ciel et terre).
 * Les Voies (Foi / Connaissance des Mystères, Affinité) et les Pouvoirs sont des objets possédés ;
 * l'acte sacré en cours est stocké à part, dans flags["pavillon-noir-2"].acte.
 */
function magieField(TypedObject) {
  const colereSchema = new f.SchemaField({
    valeur: int(0, { min: 0 }),
    // Temps du monde (secondes) à partir duquel la récupération horaire est comptée
    reference: new f.NumberField({ required: false, nullable: true, initial: null }),
    recuperationBloquee: bool(false)   // conséquences particulières d'un Rejet (phases suivantes)
  });
  return new f.SchemaField({
    religion: str(""),          // religion pratiquée (vide : celle de l'historique, system.infos.religion)
    type: str(""),              // communion | possession (clé de CONFIG.PN2.magie.types)
    actesFoi: int(0, { min: 0 }),
    peches: int(0, { min: 0 }),
    faveursMod: int(0),         // modificateur temporaire des Faveurs (les Faveurs valent la Chance)
    // Colère divine par groupe : une religion (ou un ensemble religieux) partage une seule Colère
    colere: f.TypedObjectField ? new TypedObject(colereSchema) : new f.ObjectField()
  });
}

/** Protection apportée par les armures équipées (et la qualité « Protection de la main armée »). */
export function armureProtection(actor) {
  const out = {};
  if (!actor?.items) return out;
  for (const it of actor.items) {
    if (it.type === "arme" && it.system.equipee && it.system.categorie === "blanche" && it.system.qualites?.protectionMain) {
      const loc = it.system.mainGauche ? "brasG" : "brasD";
      out[loc] = (out[loc] ?? 0) + it.system.qualites.protectionMain;
      continue;
    }
    if (it.type !== "armure" || !it.system.equipee) continue;
    for (const k of PN2.locKeys) if (it.system.localisations?.[k]) out[k] = (out[k] ?? 0) + (it.system.protection ?? 0);
  }
  return out;
}

/** Points d'escrime apportés par la Trempe des armes (3 par niveau), par type d'escrime. */
export function pointsTrempe(actor) {
  const out = {};
  if (!actor?.items) return out;
  const TYPES = { epee: ["epee"], sabre: ["sabre"] };
  for (const it of actor.items) {
    if (it.type !== "arme" || !it.system.qualites?.trempe) continue;
    for (const t of TYPES[it.system.escrime] ?? []) out[t] = Math.max(out[t] ?? 0, 3 * it.system.qualites.trempe);
  }
  return out;
}

/**
 * Lit les modificateurs saisis sur les avantages/faiblesses.
 * Syntaxe : « cle:valeur » séparés par des virgules.
 *  - clé de compétence (ex. discretion:-2), de groupe (armesBlanches:-1)
 *    ou de catégorie (combat:-2) → Modificateur de difficulté ;
 *  - carac.xxx (ex. carac.for:-1) → modifie la caractéristique.
 */
export function collectModificateurs(actor) {
  const out = { carac: {}, skill: {} };
  for (const it of actor.items) {
    // Armures portées : malus d'Adresse et d'Adaptabilité
    if (it.type === "armure" && it.system.equipee) {
      if (it.system.malusAdr) out.carac.adr = (out.carac.adr ?? 0) - Math.abs(it.system.malusAdr);
      if (it.system.malusAda) out.carac.ada = (out.carac.ada ?? 0) - Math.abs(it.system.malusAda);
      continue;
    }
    if (it.type !== "avantage") continue;
    const txt = it.system.modificateursEffectifs ?? it.system.modificateurs ?? "";
    for (const part of txt.split(/[,;]/)) {
      const m = part.trim().match(/^([\w.]+)\s*:\s*([+-]?\d+)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (key.startsWith("carac.")) out.carac[key.slice(6)] = (out.carac[key.slice(6)] ?? 0) + Number(val);
      else out.skill[key] = (out.skill[key] ?? 0) + Number(val);
    }
  }
  return out;
}

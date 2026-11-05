import { PN2 } from "../config.mjs";
import { pnRound, seuilsStructure, etatStructure, valeurDeMesure } from "../helpers/tables.mjs";
import { bourseField, totalBourse } from "../helpers/monnaie.mjs";

const f = foundry.data.fields;
const int = (initial = 0, opts = {}) => new f.NumberField({ required: true, integer: true, initial, ...opts });
const num = (initial = 0, opts = {}) => new f.NumberField({ required: true, initial, ...opts });
const str = (initial = "") => new f.StringField({ required: false, blank: true, initial });
const bool = (initial = false) => new f.BooleanField({ initial });
const TypedObject = f.TypedObjectField ?? f.ObjectField;

const posteField = () => new f.SchemaField({ uuid: str(), nom: str() });

export class NavireData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const commandement = {};
    for (const k of Object.keys(PN2.commandement)) commandement[k] = posteField();
    const gestion = {};
    for (const k of Object.keys(PN2.postesGestion)) gestion[k] = posteField();
    const matelots = {};
    for (const k of Object.keys(PN2.groupSkills)) matelots[k] = int(3, { min: 0 });

    return {
      modele: new f.SchemaField({ type: str(), configuration: str() }),
      infos: new f.SchemaField({
        capitaine: str(), figureProue: str(), greement: str(), taille: str("Sloop"), mats: int(1, { min: 0, max: 3 }),
        tonnage: num(0), tonnageUtile: num(0), tirantEau: str(), fonction: str(), epoque: str(), armement: str(),
        manoeuvrabilite: int(0), avirons: str(), vitMoyenne: num(0), calibreMax: num(0), longueur: str()
      }),
      vitesses: new f.SchemaField({ pres: num(0), largue: num(0), grandLargue: num(0), ventArriere: num(0) }),
      qualites: new f.SchemaField({ modVitesse: int(0), modManoeuvre: int(0) }),
      navigation: new f.SchemaField({ voilure: int(0), vent: int(0), allure: str("largue") }),
      equipage: new f.SchemaField({
        max: int(0, { min: 0 }), actuel: int(0, { min: 0 }), convalescents: int(0, { min: 0 }),
        manoeuvre: int(0, { min: 0 }), recharge: int(0, { min: 0 }), gardesMarines: int(0), soldats: int(0)
      }),
      reserves: new f.SchemaField({
        eau: num(45), vivres: num(60), vivresFrais: num(3), bois: num(60), munitions: num(20), trousse: num(200)
      }),
      cargaison: new TypedObject(new f.SchemaField({
        nom: str(), tonnage: num(0), valeur: num(0), quantite: num(1, { min: 0 }), unite: str(""), tonnageUnite: num(0, { min: 0 }),
        prix: new f.SchemaField({ penurie: num(0), normal: num(0), exces: num(0) }), cours: str("normal")
      })),
      coffre: bourseField(0),
      carenage: int(0, { min: 0 }),
      structure: new f.SchemaField({
        mature: new f.SchemaField({ max: int(0, { min: 0 }), artimon: int(0), grandMat: int(0), misaine: int(0) }),
        coque: new f.SchemaField({ max: int(0, { min: 0 }), poupe: int(0), babord: int(0), tribord: int(0), proue: int(0) })
      }),
      batteries: new TypedObject(new f.SchemaField({
        nom: str("Bordée"), position: str("bordée"), nombre: int(0, { min: 0 }), calibre: num(6),
        vd: int(0), hommes: int(0, { min: 0 }), modRecharge: int(0), tonnage: num(0),
        munition: str("boulet"), chargee: bool(true), restant: int(0, { min: 0 }), cote: str("babord"), ordre: int(0),
        description: str()
      })),
      commandement: new f.SchemaField(commandement),
      gestion: new f.SchemaField(gestion),
      matelots: new f.SchemaField(matelots),
      santeEquipage: new f.SchemaField({ coches: int(0, { min: 0 }) }),
      possessions: new f.SchemaField({
        cartes: str(), journaux: str(), instruments: str(), or: str(), pavillons: str(), otages: str()
      }),
      notes: new f.HTMLField({ required: false, blank: true, initial: "" })
    };
  }

  prepareDerivedData() {
    const s = this;
    s.tailleInfo = PN2.taillesNavire[s.infos.taille] ?? PN2.taillesNavire.Sloop;

    // Structure : seuils et états par localisation
    s.seuils = { mature: seuilsStructure(s.structure.mature.max), coque: seuilsStructure(s.structure.coque.max) };
    s.etats = { mature: {}, coque: {} };
    const maturesActives = matureActives(s.infos.mats);
    const niveauxMature = [];
    for (const k of Object.keys(PN2.locNavire.mature)) {
      const idx = etatStructure(s.structure.mature[k], s.structure.mature.max);
      s.etats.mature[k] = { idx, ...PN2.etatsNavire[idx], actif: maturesActives.includes(k) };
      if (maturesActives.includes(k)) niveauxMature.push(idx);
    }
    for (const k of Object.keys(PN2.locNavire.coque)) {
      const idx = etatStructure(s.structure.coque[k], s.structure.coque.max);
      s.etats.coque[k] = { idx, ...PN2.etatsNavire[idx] };
    }
    // État général de la mâture : pire état, aggravé si plusieurs localisations le partagent
    let gen = Math.max(0, ...niveauxMature);
    if (gen > 0 && niveauxMature.filter(n => n === gen).length > 1) gen = Math.min(5, gen + 1);
    s.etatMature = { idx: gen, ...PN2.etatsNavire[gen] };
    s.coule = Object.values(s.etats.coque).some(e => e.idx >= 6);

    // Charge et encombrement
    let chargeCanons = 0;
    for (const b of Object.values(s.batteries ?? {})) chargeCanons += Number(b.tonnage) || 0;
    let chargeCargo = 0, valeurCargo = 0;
    for (const c of Object.values(s.cargaison ?? {})) {
      // Marchandise issue du compendium : tonnage et valeur calculés selon la quantité et le cours
      if (c.tonnageUnite > 0) c.tonnage = Math.round(c.quantite * c.tonnageUnite * 100) / 100;
      const pu = c.prix?.[c.cours] ?? 0;
      if (pu > 0) c.valeur = Math.round(c.quantite * pu * 100) / 100;
      chargeCargo += Number(c.tonnage) || 0;
      valeurCargo += Number(c.valeur) || 0;
    }
    s.valeurCargaison = Math.round(valeurCargo * 100) / 100;
    s.coffre.total = totalBourse(s.coffre);
    const r1 = x => Math.round(x * 10) / 10;
    s.charge = { canons: r1(chargeCanons), cargaison: r1(chargeCargo), total: r1(chargeCanons + chargeCargo) };
    s.charge.pourcent = s.infos.tonnageUtile > 0 ? Math.round(100 * s.charge.total / s.infos.tonnageUtile) : 0;
    s.charge.modVitesse = s.charge.pourcent < 25 ? 1 : (s.charge.pourcent > 75 ? -1 : 0);
    s.carenageMod = s.carenage < 2 ? 1 : (s.carenage > 12 ? -1 : 0);

    // Navigation : vitesse et manœuvrabilité effectives
    const voil = PN2.voilures[String(s.navigation.voilure)] ?? PN2.voilures["0"];
    const vent = PN2.vents[String(s.navigation.vent)] ?? PN2.vents["0"];
    s.modNav = {
      vitesse: s.etatMature.malus + voil.vit + vent.vit + s.charge.modVitesse + s.carenageMod + (s.qualites.modVitesse ?? 0),
      manoeuvre: s.infos.manoeuvrabilite + s.etatMature.malus + voil.man + vent.man + (s.qualites.modManoeuvre ?? 0)
    };
    // Malus d'équipage insuffisant (Table des Mesures : ratio -> Valeur)
    s.malusEquipageManoeuvre = 0;
    if (s.equipage.manoeuvre > 0 && s.equipage.actuel < s.equipage.manoeuvre) {
      s.malusEquipageManoeuvre = Math.min(0, valeurDeMesure(Math.max(0.1, s.equipage.actuel / s.equipage.manoeuvre)));
    }
    s.vitEff = {};
    for (const k of Object.keys(PN2.allures)) {
      const base = Number(s.vitesses[k]) || 0;
      s.vitEff[k] = base > 0 ? Math.max(0, base + s.modNav.vitesse) : 0;
    }
    s.vitesseActuelle = s.vitEff[s.navigation.allure] ?? 0;
    s.milleParJour = Math.round((s.infos.vitMoyenne || 0) * (s.vitesseActuelle && s.vitesses[s.navigation.allure] ? s.vitesseActuelle / s.vitesses[s.navigation.allure] : 1));

    // Artillerie : portée selon munition, nombre d'artilleurs requis
    s.artilleurs = 0;
    for (const b of Object.values(s.batteries ?? {})) {
      b.portee = (PN2.portees[b.position] ?? PN2.portees["bordée"])[b.munition] ?? 300;
    }

    // Santé de l'équipage
    const somme = (s.matelots.combat - 3) + (s.matelots.recharge - 3);
    const key = String(Math.max(-4, Math.min(4, somme)));
    const cases = PN2.casesEquipage[key];
    s.casesEquipage = cases;
    const liste = [];
    cases.forEach((n, lvl) => { for (let i = 0; i < n; i++) liste.push(lvl + 1); });
    s.casesEquipageListe = liste;
    const c = Math.min(s.santeEquipage.coches, liste.length);
    s.etatEquipage = c > 0 ? liste[c - 1] : 0;
    s.malusEquipage = [0, 0, -1, -2, -4][s.etatEquipage] ?? -4;
    s.etatEquipageLabel = ["Indemne", "Légère", "Sérieuse", "Grave", "Critique"][s.etatEquipage];

    // Compétences de groupe ; l'équipage agit à l'Initiative de la VC du capitaine
    s.groupe = computeGroupSkills(s);
    const cap = acteurPoste(s.commandement.capitaine);
    s.initiative = cap?.system?.vc?.capitaine ?? 5;
  }
}

/** Localisations de mâture présentes selon le nombre de mâts. */
export function matureActives(mats) {
  if (mats >= 3) return ["artimon", "grandMat", "misaine"];
  if (mats === 2) return ["grandMat", "misaine"];
  if (mats === 1) return ["grandMat"];
  return [];
}

/** Récupère un acteur d'un poste (synchrone, acteurs du monde uniquement). */
export function acteurPoste(poste) {
  if (!poste?.uuid) return null;
  try { return fromUuidSync(poste.uuid); } catch (e) { return null; }
}

/** Valeur d'une compétence d'un acteur (0 si absent). */
export function niveauCompetence(actor, key) {
  if (!actor) return 0;
  if (key === "geographie") return actor.system.skills?.geographie?.value ?? 0;
  return actor.system.skills?.[key]?.value ?? 0;
}

/** Calcule Efficacité et Facilité des six compétences de groupe. */
export function computeGroupSkills(s) {
  const out = {};
  for (const [key, def] of Object.entries(PN2.groupSkills)) {
    let effSum = 0;
    const details = [];
    for (const [poste, skill] of def.eff) {
      const a = acteurPoste(s.commandement[poste]);
      const v = niveauCompetence(a, skill);
      effSum += v;
      details.push({ poste: PN2.commandement[poste].label, skill: PN2.skills[skill]?.label, valeur: v, nom: a?.name ?? "—" });
    }
    let facSum = 0, facDiv = 0;
    const facDetails = [];
    for (const [poste, mult] of def.fac) {
      const a = acteurPoste(s.commandement[poste]);
      const vc = a?.system?.vc?.[poste] ?? 0;
      facSum += vc * mult;
      facDiv += mult;
      facDetails.push({ poste: PN2.commandement[poste].label, vc, mult, nom: a?.name ?? "—" });
    }
    const eff = pnRound(effSum / 4, 3);
    const facBase = pnRound(facSum / facDiv, 5);
    const modMatelots = (s.matelots[key] ?? 3) - 3;
    const fac = facBase + modMatelots;
    out[key] = { label: def.label, eff, facBase, modMatelots, fac, details, facDetails };
  }
  return out;
}

import { PN2 } from "../config.mjs";

const f = foundry.data.fields;
const int = (initial = 0, opts = {}) => new f.NumberField({ required: true, integer: true, initial, ...opts });
const num = (initial = 0, opts = {}) => new f.NumberField({ required: true, initial, ...opts });
const str = (initial = "") => new f.StringField({ required: false, blank: true, initial });
const bool = (initial = false) => new f.BooleanField({ initial });
const html = () => new f.HTMLField({ required: false, blank: true, initial: "" });

class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { description: html(), source: str() };
  }
}

export class ArmeData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categorie: str("blanche"),          // blanche | tir | jet
      competence: str("armesBlanches"),   // clé de compétence ou de groupe
      specialite: str(""),                // ex. « Rapière » pour Armes blanches
      carac: str("adr"),
      modEff: int(0),
      modFac: int(0),
      md: str("for"),                     // for | adr | aucun
      degats: int(0),
      taille: str("longue"),
      mains: int(1, { min: 1, max: 2 }),
      portee: int(0, { min: 0 }),
      recharge: str(""),
      cibles: str(""),                    // ex. « Succès (max 6) »
      qualite: str("normale"),
      bonusAbordage: bool(false),
      escrime: str("autre"),              // epee | sabre | hache | baionnette | dague | autre
      longFeuMod: int(0),
      equipee: bool(false),
      mainGauche: bool(false),
      prix: str(""),
      quantite: int(1, { min: 0 }),
      // Qualités d'arme (L'Art de l'escrime) : nombre de fois où chaque qualité est obtenue
      qualites: new f.SchemaField(Object.fromEntries(
        [...new Set([...Object.keys(PN2.qualitesBlanches), ...Object.keys(PN2.qualitesFeu)])].map(k => [k, int(0, { min: 0, max: 3 })])
      )),
      double: str(""),                    // "" | normale | superieure | extraordinaire
      doubleUsage: int(1, { min: 1, max: 2 }) // arme double supérieure : usage sans malus (1 ou 2)
    };
  }

  get estArmeFeu() {
    return this.categorie === "tir" && ["mousquet", "pistolet", "grenade"].includes(this.competence);
  }

  /** Liste des qualités applicables à ce type d'arme. */
  get listeQualites() {
    return this.categorie === "blanche" ? PN2.qualitesBlanches : (this.estArmeFeu ? PN2.qualitesFeu : {});
  }

  /** Qualités obtenues, sous forme lisible (ex. « Trempe ×2, Légèreté »). */
  get resumeQualites() {
    return Object.entries(this.listeQualites).filter(([k]) => (this.qualites?.[k] ?? 0) > 0)
      .map(([k, d]) => `${d.label}${this.qualites[k] > 1 ? ` ×${this.qualites[k]}` : ""}`).join(", ");
  }

  /** Bonus chiffrés des qualités : Efficacité, Facilité, dégâts, portée, long feu. */
  get bonusQualites() {
    const q = this.qualites ?? {};
    const out = { eff: 0, fac: 0, degats: 0, portee: 0, longFeu: 0 };
    if (this.categorie === "blanche") {
      out.fac += q.legerete ? 1 : 0;
      out.eff += q.equilibre ? 1 : 0;
      out.degats += q.acier ? 1 : 0;
    } else if (this.estArmeFeu) {
      out.fac += q.silex ? 1 : 0;
      out.eff += q.maniabilite ? 1 : 0;
      out.degats += q.poudre ? 1 : 0;
      out.portee += 5 * Math.min(2, q.canon ?? 0);
      out.longFeu -= (q.fiabilite ? 3 : 0) + (q.silex ? 1 : 0) + (q.poudre ? 1 : 0);
    }
    return out;
  }
}

export class ArmureData extends BaseItemData {
  static defineSchema() {
    const loc = {};
    for (const k of PN2.locKeys) loc[k] = bool(false);
    return {
      ...super.defineSchema(),
      matiere: str("cuir"),
      protection: int(1, { min: 0 }),
      localisations: new f.SchemaField(loc),
      malusAdr: int(0),
      malusAda: int(0),
      equipee: bool(false),
      prix: str("")
    };
  }
}

export class EquipementData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categorie: str("divers"),
      quantite: int(1, { min: 0 }),
      prix: str(""),
      modificateur: str("")
    };
  }
}

export class MarchandiseData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      unite: str("1 T"),                  // unité de vente (1 T, 100 kg, par homme pour 15 jours…)
      tonnageUnite: num(1, { min: 0 }),   // tonnage d'une unité (0 si négligeable)
      quantite: num(1, { min: 0 }),
      prix: new f.SchemaField({ penurie: num(0, { min: 0 }), normal: num(0, { min: 0 }), exces: num(0, { min: 0 }) }),
      cours: str("normal")
    };
  }
  get valeur() { return (this.prix?.[this.cours] ?? 0) * (this.quantite ?? 0); }
}

export class HistoriqueData extends BaseItemData {
  static defineSchema() {
    const cats = {};
    for (const k of Object.keys(PN2.skillCategories)) cats[k] = int(0, { min: 0 });
    return {
      ...super.defineSchema(),
      etape: str("origine"),            // peuple | origine | jeunesse | religion
      pays: str(""),                    // peuples : pays au choix (séparés par des virgules)
      culturelles: str(""),             // peuples : compétences culturelles (niveau 2)
      armesFeuMetier: bool(false),      // peuples : armes à feu = compétences de métier
      caracs: str(""),                  // origines : caractéristiques au choix (+1)
      nbCompetences: int(0, { min: 0 }),
      niveau: int(0, { min: 0 }),
      categories: new f.SchemaField(cats),
      metier: str(""),                  // compétences de métier accessibles
      exclusions: str(""),
      religionNom: str(""),
      points: int(12, { min: 0 }),     // professions : points à répartir
      note: str("")
    };
  }
}

/** Points de compétence d'un avantage (coût) ou d'une faiblesse (gain), en valeur absolue. */
export function pcAvantage(sys) {
  if (sys.pc != null) return Math.abs(sys.pc);
  const opt = (sys.options ?? []).find(o => o.label === sys.choix);
  if (opt) return Math.abs(opt.pc);
  if (sys.options?.length) return Math.abs(sys.options[0].pc);
  const m = String(sys.cout ?? "").match(/[+-]?\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Effets automatisés des avantages :
 *  argent (100 pièces de huit / PC), gloire (10 / PC), infamie (20 / PC, 5 PC max.),
 *  escrime (accès au type d'escrime « escrimeType »), ecoleRenom (+3 Points d'escrime à l'épée seule),
 *  ecoleEtranger (école d'un autre pays), noble, clerge,
 *  armeBlanche / armeFeu / tolede (qualités d'une arme), fusilBoucanier (fusil de qualité supérieure),
 *  armeDouble (qualité d'arme double).
 */
export const EFFETS_AVANTAGE = {
  "": "Aucun",
  argent: "Argent supplémentaire (100 pièces de huit par PC)",
  gloire: "Réputation : Gloire (10 points par PC)",
  infamie: "Réputation : Infamie (20 points par PC, 5 PC max.)",
  escrime: "Accès à un type d'escrime",
  ecoleRenom: "École de renom (+3 Points d'escrime à l'épée seule)",
  ecoleEtranger: "École d'un autre pays que le sien",
  noble: "Statut social : noble",
  clerge: "Statut social : clergé",
  armeBlanche: "Arme blanche de qualité",
  armeFeu: "Arme à feu de qualité",
  tolede: "Lame de Tolède (deux qualités)",
  fusilBoucanier: "Fusil et poudre de boucanier",
  armeDouble: "Arme double"
};

export class AvantageData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      nature: str("avantage"),   // avantage | faiblesse
      categorie: str(""),        // Séquelles de blessures, Possessions, Social, Escrime…
      cout: str(""),             // ex. « -3 PC » ou « +5 PC »
      modificateurs: str(""),    // ex. « discretion:-2, athletisme:-4 »
      pc: new f.NumberField({ required: false, nullable: true, integer: true, initial: null }), // points de compétence retenus
      // Variantes chiffrées (ex. Baron -3, Comte -5 ; main gauche +7, main droite +9)
      options: new f.ArrayField(new f.SchemaField({
        label: str(""),
        pc: int(0),
        modificateurs: str("")   // modificateurs propres à la variante (remplacent ceux de l'avantage)
      })),
      choix: str(""),            // variante retenue
      variable: bool(false),     // coût libre (Argent, Réputation…) : le joueur fixe les PC
      maxPc: int(0, { min: 0 }), // plafond des PC (0 = aucun)
      multiple: bool(false),     // peut être pris plusieurs fois (contacts, alliés, possessions…)
      effet: str(""),            // voir EFFETS_AVANTAGE
      escrimeType: str(""),      // type d'escrime ouvert (effet « escrime »)
      prerequis: str("")         // rappel affiché à la création
    };
  }

  /** Modificateurs effectifs (ceux de la variante choisie, sinon ceux de l'avantage). */
  get modificateursEffectifs() {
    const opt = (this.options ?? []).find(o => o.label === this.choix);
    return opt?.modificateurs || this.modificateurs || "";
  }

  get pcEffectifs() { return pcAvantage(this); }
}

export class ManoeuvreData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      escrime: str("epee"),
      niveau: int(1, { min: 1, max: 4 }),
      combinaison: str("1"),      // ex. « 1 1 0 » (1 = Ouverture, 0 = Défense)
      effet: str(""),
      ecole: bool(false),
      secondeMain: bool(false),
      deuxMains: bool(false),
      inadapte: str(""),
      peuAdapte: str(""),
      strategie: bool(false),     // destreza : mouvement de base retenu dans la stratégie
      auto: new f.SchemaField({
        bonusD: int(0), bonusFac: int(0), malusFacAdv: int(0), bonusS: int(0), bonusDegats: int(0),
        armure: int(0), invulnerable: bool(false), annuleAdv: bool(false), choixLoc: bool(false)
      })
    };
  }

  /** Combinaison sous forme de tableau de chaînes. */
  get combo() {
    return String(this.combinaison || "").split(/[\s,]+/).filter(x => x !== "").map(x => (x === "10" ? "0" : x));
  }

  /** Puissance (somme des chiffres, « 0 » vaut 10). */
  get puissance() {
    return this.combo.reduce((a, d) => a + (d === "0" ? 10 : Number(d)), 0);
  }
}

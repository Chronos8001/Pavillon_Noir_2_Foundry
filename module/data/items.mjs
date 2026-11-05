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
      quantite: int(1, { min: 0 })
    };
  }

  get estArmeFeu() {
    return this.categorie === "tir" && ["mousquet", "pistolet", "grenade"].includes(this.competence);
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

export class AvantageData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      nature: str("avantage"),   // avantage | faiblesse
      categorie: str(""),        // Séquelles de blessures, Possessions, Social, Escrime…
      cout: str(""),             // ex. « -3 PC » ou « +5 PC »
      modificateurs: str("")     // ex. « discretion:-2, athletisme:-4 »
    };
  }
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

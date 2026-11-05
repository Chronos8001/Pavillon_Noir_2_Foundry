import { PersonnageData } from "./actor-personnage.mjs";
import { PN2 } from "../config.mjs";

const f = foundry.data.fields;

/**
 * PNJ : mêmes données qu'un personnage, avec en plus une Facilité par
 * catégorie de compétences (comme dans les archétypes du livre de base).
 * Une Facilité à 0 signifie « utiliser la caractéristique ».
 */
export class PNJData extends PersonnageData {
  static defineSchema() {
    const schema = super.defineSchema();
    const fac = {};
    for (const k of Object.keys(PN2.skillCategories)) {
      fac[k] = new f.NumberField({ required: true, integer: true, initial: 0, min: 0 });
    }
    schema.facilites = new f.SchemaField(fac);
    schema.role = new f.StringField({ required: false, blank: true, initial: "" });
    schema.importance = new f.StringField({ required: false, blank: true, initial: "mineure" });
    return schema;
  }

  get isPNJ() { return true; }

  facilitePNJ(cat) {
    const v = this.facilites?.[cat];
    return v > 0 ? v : null;
  }
}

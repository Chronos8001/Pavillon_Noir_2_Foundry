import { PN2 } from "../config.mjs";
import { NAVIRES } from "../data/navires-catalogue.mjs";
import { statsBatterie, CANONS } from "../rolls/naval.mjs";
import { competencesDestreza } from "../rolls/destreza.mjs";
import { findSpec } from "../rolls/dice.mjs";
import { controleConcurrence } from "../magie/service.mjs";
import { protegerConsequences } from "../magie/service-evenements.mjs";

export class PN2Actor extends Actor {

  /** Jetons liés par défaut pour les PJ et les navires. */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    const proto = {};
    if (this.type === "personnage" || this.type === "navire") {
      proto["prototypeToken.actorLink"] = true;
      proto["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    }
    if (this.type === "navire" && !data.img) proto.img = "systems/pavillon-noir-2/assets/icons/navire.svg";
    if (Object.keys(proto).length) this.updateSource(proto);
  }

  /**
   * Destreza (L'Art de l'escrime, p. 170) : Sciences, Art (Danse), Connaissance spé. (Philosophie)
   * et Religion (Chrétienne) doivent valoir au moins Destreza - 2 ; elles suivent sa progression.
   */
  async _preUpdate(changes, options, user) {
    const r = await super._preUpdate(changes, options, user);
    if (r === false) return false;
    // Magie : refuse l'écriture d'un acte sacré périmé (mise à jour concurrente)
    if (!controleConcurrence(this, changes, options)) return false;
    // Magie : Rejets, séquelles, pénitences et coffre du MJ ne sont modifiables que par le MJ
    if (!protegerConsequences(changes, user)) return false;
    const nv = foundry.utils.getProperty(changes, "system.escrime.destreza.value");
    if (this.type !== "navire" && nv != null && nv > (this.system.escrime?.destreza?.value ?? 0)) {
      const upd = competencesDestreza(this, nv, findSpec);
      if (Object.keys(upd).length) {
        foundry.utils.mergeObject(changes, foundry.utils.expandObject(upd));
        ui.notifications?.info(`${this.name} : compétences de la destreza ajustées (Sciences, Danse, Philosophie, Religion chrétienne ≥ ${nv - 2}).`);
      }
    }
    return r;
  }

  /* -------------------------------------------- */
  /*  Santé                                       */
  /* -------------------------------------------- */

  /**
   * Coche les cases de blessure d'une localisation.
   * @param {string} loc      clé de localisation
   * @param {number} degats   dégâts avant protection
   */
  async appliquerDegats(loc, degats, { protection = true, message = true } = {}) {
    if (this.type === "navire") return;
    const sys = this.system;
    const prot = protection ? (sys.santeLoc?.[loc]?.protection ?? 0) : 0;
    const net = Math.max(0, Number(degats) - prot);
    const avant = sys.sante.loc[loc].coches;
    const max = sys.casesTotal;
    const apres = Math.min(max, avant + net);
    await this.update({ [`system.sante.loc.${loc}.coches`]: apres });
    if (!message) return;
    const s = this.system;
    const niv = s.santeLoc[loc];
    let alerte = "";
    if (niv.niveau >= 3 && niv.niveau <= 4) alerte = "Blessure grave ou pire : risque de complications et de séquelles lors des soins.";
    if (s.etat >= 5) alerte = s.etat === 6 ? "Blessure mortelle : le personnage est mourant !" : "Le personnage sombre dans le coma.";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="pn2-card"><h3>${this.name} est touché</h3>
        <p>${PN2.locLabels[loc]} : ${degats} dégâts${prot ? ` - ${prot} protection` : ""} = <strong>${net}</strong> case(s).</p>
        <p>Localisation : <strong>${niv.label}</strong> — État général : <strong>${s.etatLabel}</strong>${s.malusSante ? ` (${s.malusSante})` : ""}</p>
        ${alerte ? `<p class="alerte">${alerte}</p>` : ""}</div>`
    });
  }

  /** Soigne (décoche) des cases d'une localisation. */
  async soigner(loc, n = 1) {
    const c = this.system.sante.loc[loc].coches;
    await this.update({ [`system.sante.loc.${loc}.coches`]: Math.max(0, c - n) });
  }

  /* -------------------------------------------- */
  /*  Spécialités                                 */
  /* -------------------------------------------- */

  async ajouterSpecialite(group, name = "", value = 0) {
    const id = foundry.utils.randomID();
    const g = PN2.specGroups[group];
    await this.update({ [`system.specs.${id}`]: { group, name, value, xp: false, metier: g?.metierDefaut ?? false, carac: "" } });
    return id;
  }

  async supprimerSpecialite(id) {
    await this.update({ [`system.specs.-=${id}`]: null });
  }

  /* -------------------------------------------- */
  /*  Navires                                     */
  /* -------------------------------------------- */

  /**
   * Applique un type de navire du catalogue (À feu et à sang) et une configuration d'armement.
   * Remplace les caractéristiques, la structure et les batteries.
   */
  async appliquerModeleNavire(typeNom, configNom = null) {
    if (this.type !== "navire") return;
    const n = NAVIRES.find(x => x.nom === typeNom);
    if (!n) return;
    const conf = n.configurations.find(c => c.nom === configNom) ?? n.configurations[0] ?? null;
    const upd = {
      "system.modele.type": n.nom,
      "system.modele.configuration": conf?.nom ?? "",
      "system.infos.greement": n.greement ?? "",
      "system.infos.taille": n.taille ?? "Sloop",
      "system.infos.mats": n.mats ?? 1,
      "system.infos.tonnage": n.tonnage ?? 0,
      "system.infos.tonnageUtile": n.tonnageUtile ?? 0,
      "system.infos.tirantEau": n.tirantEau ?? "",
      "system.infos.fonction": n.fonction ?? "",
      "system.infos.epoque": n.epoque ?? "",
      "system.infos.manoeuvrabilite": n.manoeuvrabilite ?? 0,
      "system.infos.avirons": n.avirons ?? "",
      "system.infos.vitMoyenne": n.vitMoyenne ?? 0,
      "system.infos.calibreMax": n.calibreMax ?? 0,
      "system.infos.longueur": n.longueur ?? "",
      "system.infos.armement": conf ? `${conf.nom}${conf.detail ? ` (${conf.detail})` : ""}` : "",
      "system.vitesses.pres": n.vitesses.pres ?? 0,
      "system.vitesses.largue": n.vitesses.largue ?? 0,
      "system.vitesses.grandLargue": n.vitesses.grandLargue ?? 0,
      "system.vitesses.ventArriere": n.vitesses.ventArriere ?? 0,
      "system.equipage.max": n.equipageMax ?? 0,
      "system.equipage.manoeuvre": n.equipageManoeuvre ?? 0,
      "system.equipage.gardesMarines": n.gardesMarines ?? 0,
      "system.equipage.soldats": n.soldats ?? 0
    };
    if (conf) {
      const hommesRecharge = conf.batteries.reduce((a, b) => a + (b.recharge || 0), 0);
      upd["system.equipage.recharge"] = conf.matelots;
      upd["system.equipage.actuel"] = Math.max(this.system.equipage.actuel || 0, conf.matelots + (n.equipageManoeuvre ? 0 : 0));
      upd["system.structure.mature.max"] = conf.psMature;
      upd["system.structure.coque.max"] = conf.psCoque;
      for (const k of Object.keys(PN2.locNavire.mature)) upd[`system.structure.mature.${k}`] = conf.psMature;
      for (const k of Object.keys(PN2.locNavire.coque)) upd[`system.structure.coque.${k}`] = conf.psCoque;
      // Batteries : on remplace toutes les batteries existantes
      const old = Object.keys(this.system.batteries ?? {});
      for (const id of old) upd[`system.batteries.-=${id}`] = null;
      await this.update(upd);
      const bats = {};
      let ordre = 0;
      for (const b of conf.batteries) {
        const id = foundry.utils.randomID();
        const parsed = parseBatterie(b.desc);
        const sousEnsemble = /dont|peuvent/i.test(b.desc ?? "");
        const deuxBords = /^\s*(?:et |plus )?2\s*×/.test(b.desc ?? "");
        const ton = (!sousEnsemble && parsed.nombre && CANONS[parsed.calibre])
          ? parsed.nombre * CANONS[parsed.calibre].tonnage * (deuxBords ? 2 : 1) : 0;
        bats[id] = {
          nom: libelleBatterie(b),
          position: /muraille|pierrier|espingole|orgue/i.test(b.desc ?? "") ? "muraille" : b.position,
          nombre: 0, calibre: parsed.calibre ?? 6, vd: b.vd ?? 0, hommes: b.recharge ?? 0,
          modRecharge: parsed.calibre != null ? (CANONS[parsed.calibre]?.modRecharge ?? 0) : 0,
          tonnage: Math.round(ton * 10) / 10,
          munition: "boulet", chargee: true, restant: 0, cote: "babord", ordre: ordre++, description: b.desc ?? ""
        };
      }
      if (Object.keys(bats).length) await this.update({ "system.batteries": bats });
      void hommesRecharge;
    } else {
      await this.update(upd);
    }
  }
}

/** Analyse « 2×8 pièces de 6 » → { nombre: 8, calibre: 6 } (par bordée). */
export function parseBatterie(desc) {
  const s = String(desc ?? "");
  let m = s.match(/(?:(\d+)\s*×\s*)?(\d+)\s*(?:pièces?|canons?)\s*de\s*(\d+)/);
  if (m && !/plus|et \d/.test(s)) return { nombre: Number(m[2]), calibre: Number(m[3]) };
  if (/pierrier/i.test(s)) { m = s.match(/(?:(\d+)\s*×\s*)?(\d+)\s*pierrier/); return { nombre: m ? Number(m[2]) : 0, calibre: 1 }; }
  if (/muraille/i.test(s)) { m = s.match(/(?:(\d+)\s*×\s*)?(\d+)\s*canons? de muraille/); return { nombre: m ? Number(m[2]) : 0, calibre: 2 }; }
  if (/espingole/i.test(s)) { m = s.match(/(?:(\d+)\s*×\s*)?(\d+)\s*espingole/); return { nombre: m ? Number(m[2]) : 0, calibre: 0.5 }; }
  m = s.match(/pièces? de (\d+)/);
  return { nombre: 0, calibre: m ? Number(m[1]) : null };
}

function libelleBatterie(b) {
  const pos = { "bordée": "Bordée", chasse: "Chasse", fuite: "Fuite" }[b.position] ?? b.position;
  const d = String(b.desc ?? "").replace(/^\s*(et|dont|plus)\s+/i, "").trim();
  return d ? `${pos} — ${d}` : pos;
}

export { statsBatterie };

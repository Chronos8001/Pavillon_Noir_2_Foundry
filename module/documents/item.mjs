import { PN2 } from "../config.mjs";
import { assistantHistorique, annulerHistorique } from "../helpers/historique.mjs";
import { assistantAvantage, annulerAvantage } from "../helpers/avantages.mjs";
import { reporterColere } from "../magie/service.mjs";

export class PN2Item extends Item {

  /** Icônes par défaut selon le type. */
  async _preCreate(data, options, user) {
    const r = await super._preCreate(data, options, user);
    if (r === false) return false;
    // Magie : une seule religion pratiquée, pas de Voie en double sur un personnage
    if (this.actor && ["religion", "voie"].includes(this.type)) {
      const source = data._stats?.compendiumSource ?? data.flags?.core?.sourceId ?? null;
      // Doublon : même source (compendium ou monde) ; une Voie créée à la main n'est jamais bloquée
      const doublon = this.actor.items.find(i => i.type === this.type && (this.type === "religion"
        || (source && (i._stats?.compendiumSource ?? i.flags?.core?.sourceId) === source)));
      if (doublon) {
        ui.notifications?.warn(this.type === "religion"
          ? `${this.actor.name} pratique déjà « ${doublon.name} » : retirez-la d'abord.`
          : `${this.actor.name} possède déjà « ${doublon.name} ».`);
        return false;
      }
    }
    if (data.img) return;
    const icons = {
      arme: "systems/pavillon-noir-2/assets/icons/arme.svg",
      armure: "systems/pavillon-noir-2/assets/icons/armure.svg",
      equipement: "systems/pavillon-noir-2/assets/icons/equipement.svg",
      avantage: "systems/pavillon-noir-2/assets/icons/avantage.svg",
      manoeuvre: "systems/pavillon-noir-2/assets/icons/manoeuvre.svg",
      marchandise: "systems/pavillon-noir-2/assets/icons/marchandise.svg",
      historique: "systems/pavillon-noir-2/assets/icons/historique.svg",
      religion: "icons/svg/temple.svg",
      alea: "icons/svg/lightning.svg",
      voie: "icons/svg/sun.svg",
      pouvoir: "icons/svg/aura.svg"
    };
    if (icons[this.type]) this.updateSource({ img: icons[this.type] });
  }

  /** Un historique ajouté à un personnage lance l'assistant de création. */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    // Magie : la Colère notée sous l'ancien nom de religion rejoint le groupe de la religion ajoutée
    if (this.type === "religion" && this.actor && userId === game.user.id) reporterColere(this.actor);
    if (!["historique", "avantage"].includes(this.type) || userId !== game.user.id || !this.actor || this.actor.type === "navire") return;
    if (this.flags?.[PN2.id]?.applique || options.pn2SansAssistant) return;
    const assistant = this.type === "historique" ? assistantHistorique : assistantAvantage;
    assistant(this.actor, this).then(ok => { if (!ok) this.delete({ pn2SansAnnulation: true }); });
  }

  /** Retirer un historique annule ses effets sur la fiche. */
  async _preDelete(options, user) {
    const r = await super._preDelete(options, user);
    if (r === false) return false;
    if (this.actor && !options.pn2SansAnnulation && user.id === game.user.id) {
      if (this.type === "historique") await annulerHistorique(this.actor, this);
      if (this.type === "avantage") await annulerAvantage(this.actor, this);
    }
    return r;
  }

  /** Affiche l'objet dans le chat. */
  async afficher() {
    const s = this.system;
    let details = "";
    if (this.type === "manoeuvre") {
      details = `<p><strong>${PN2.escrimeTypes[s.escrime]?.label ?? s.escrime}</strong> — Niveau ${s.niveau} — Combinaison : <span class="combo">${comboHTML(s.combo)}</span> (puissance ${s.puissance})</p><p>${s.effet}</p>`;
    } else if (this.type === "avantage") {
      details = `<p><strong>${s.nature === "faiblesse" ? "Faiblesse" : "Avantage"}</strong> ${s.categorie ? `(${s.categorie})` : ""} — ${s.choix ? `${s.choix} : ` : ""}${s.options?.length || s.pc != null ? `${s.nature === "faiblesse" ? "+" : "-"}${s.pcEffectifs} PC` : s.cout}</p>${s.modificateursEffectifs ? `<p class="hint">Modificateurs : ${s.modificateursEffectifs}</p>` : ""}`;
    } else if (this.type === "arme") {
      const bq = s.bonusQualites;
      const deg = s.degats + bq.degats;
      details = `<p>Dégâts : ${s.md !== "aucun" ? `MD${s.md === "for" ? "For" : "Adr"} ` : ""}${deg >= 0 ? "+" : ""}${deg}${s.portee ? ` — Portée ${s.portee + bq.portee} m` : ""}${s.recharge ? ` — Recharge ${s.recharge}` : ""}</p>${s.resumeQualites ? `<p><em>${s.resumeQualites}</em></p>` : ""}`;
    }
    const desc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.description ?? "", { async: true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pn2-card"><header class="card-header"><img src="${this.img}" width="32" height="32"><h3>${this.name}</h3></header>${details}${desc}</div>`
    });
  }
}

/** Rendu HTML d'une combinaison d'opportunités (1 = Ouverture, 0 = Défense). */
export function comboHTML(combo) {
  return (combo ?? []).map(d => {
    if (d === "1") return `<span class="opp opp-1" title="Ouverture">1</span>`;
    if (d === "0") return `<span class="opp opp-0" title="Défense">0</span>`;
    return `<span class="opp">${d}</span>`;
  }).join("");
}

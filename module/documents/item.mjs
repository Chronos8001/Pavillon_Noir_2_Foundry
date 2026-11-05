import { PN2 } from "../config.mjs";

export class PN2Item extends Item {

  /** Icônes par défaut selon le type. */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (data.img) return;
    const icons = {
      arme: "systems/pavillon-noir-2/assets/icons/arme.svg",
      armure: "systems/pavillon-noir-2/assets/icons/armure.svg",
      equipement: "systems/pavillon-noir-2/assets/icons/equipement.svg",
      avantage: "systems/pavillon-noir-2/assets/icons/avantage.svg",
      manoeuvre: "systems/pavillon-noir-2/assets/icons/manoeuvre.svg",
      marchandise: "systems/pavillon-noir-2/assets/icons/marchandise.svg"
    };
    if (icons[this.type]) this.updateSource({ img: icons[this.type] });
  }

  /** Affiche l'objet dans le chat. */
  async afficher() {
    const s = this.system;
    let details = "";
    if (this.type === "manoeuvre") {
      details = `<p><strong>${PN2.escrimeTypes[s.escrime]?.label ?? s.escrime}</strong> — Niveau ${s.niveau} — Combinaison : <span class="combo">${comboHTML(s.combo)}</span> (puissance ${s.puissance})</p><p>${s.effet}</p>`;
    } else if (this.type === "avantage") {
      details = `<p><strong>${s.nature === "faiblesse" ? "Faiblesse" : "Avantage"}</strong> ${s.categorie ? `(${s.categorie})` : ""} — ${s.cout}</p>`;
    } else if (this.type === "arme") {
      details = `<p>Dégâts : ${s.md !== "aucun" ? `MD${s.md === "for" ? "For" : "Adr"} ` : ""}${s.degats >= 0 ? "+" : ""}${s.degats}${s.portee ? ` — Portée ${s.portee} m` : ""}${s.recharge ? ` — Recharge ${s.recharge}` : ""}</p>`;
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

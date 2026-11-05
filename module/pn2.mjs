/**
 * Pavillon Noir 2 — système pour Foundry VTT.
 */
import { PN2 } from "./config.mjs";
import { PersonnageData } from "./data/actor-personnage.mjs";
import { PNJData } from "./data/actor-pnj.mjs";
import { NavireData } from "./data/actor-navire.mjs";
import { ArmeData, ArmureData, EquipementData, AvantageData, ManoeuvreData, MarchandiseData, HistoriqueData } from "./data/items.mjs";
import { PN2Actor } from "./documents/actor.mjs";
import { PN2Item } from "./documents/item.mjs";
import { PN2PersonnageSheet } from "./sheets/actor-personnage-sheet.mjs";
import { PN2NavireSheet } from "./sheets/actor-navire-sheet.mjs";
import { PN2ItemSheet } from "./sheets/item-sheet.mjs";
import * as dice from "./rolls/dice.mjs";
import * as combat from "./rolls/combat.mjs";
import * as naval from "./rolls/naval.mjs";
import * as tables from "./helpers/tables.mjs";

Hooks.once("init", () => {
  console.log("Pavillon Noir 2 | Initialisation du système");
  CONFIG.PN2 = PN2;
  game.pn2 = { config: PN2, dice, combat, naval, tables };

  CONFIG.Actor.documentClass = PN2Actor;
  CONFIG.Item.documentClass = PN2Item;
  CONFIG.Actor.dataModels = { personnage: PersonnageData, pnj: PNJData, navire: NavireData };
  CONFIG.Item.dataModels = {
    arme: ArmeData, armure: ArmureData, equipement: EquipementData, avantage: AvantageData, manoeuvre: ManoeuvreData, marchandise: MarchandiseData, historique: HistoriqueData
  };
  CONFIG.Actor.trackableAttributes = {
    personnage: { bar: [], value: ["initiative", "chance"] },
    pnj: { bar: [], value: ["initiative", "chance"] },
    navire: { bar: [], value: ["equipage.actuel"] }
  };

  // L'Initiative est égale à l'Adaptabilité (Valeur de commandement du capitaine pour un équipage)
  CONFIG.Combat.initiative = { formula: "@initiative + 1d10 / 100", decimals: 2 };

  registerSettings();

  const Actors = foundry.documents.collections.Actors;
  const Items = foundry.documents.collections.Items;
  Actors.registerSheet(PN2.id, PN2PersonnageSheet, { types: ["personnage", "pnj"], makeDefault: true, label: "Fiche Pavillon Noir" });
  Actors.registerSheet(PN2.id, PN2NavireSheet, { types: ["navire"], makeDefault: true, label: "Fiche de navire" });
  Items.registerSheet(PN2.id, PN2ItemSheet, { makeDefault: true, label: "Fiche d'objet Pavillon Noir" });

  registerHelpers();
  foundry.applications.handlebars.loadTemplates([
    "systems/pavillon-noir-2/templates/chat/test.hbs",
    "systems/pavillon-noir-2/templates/chat/partials/des.hbs",
    "systems/pavillon-noir-2/templates/chat/partials/combattant.hbs",
    "systems/pavillon-noir-2/templates/chat/partials/resolution.hbs",
    "systems/pavillon-noir-2/templates/actor/partials/bourse.hbs",
    "systems/pavillon-noir-2/templates/apps/creation.hbs"
  ]);
});

function registerSettings() {
  game.settings.register(PN2.id, "escrimeMode", {
    name: "Règles d'escrime",
    hint: "Avancées : manœuvres et combinaisons d'Opportunités de L'Art de l'escrime. De base : Opportunités 1, 5 et 0 de La Révolte.",
    scope: "world", config: true, type: String, default: "avance",
    choices: { avance: "Avancées (L'Art de l'escrime)", base: "De base (La Révolte)", aucune: "Désactivées" }
  });
  game.settings.register(PN2.id, "postures", {
    name: "Postures et prise d'avantage",
    hint: "Règles optionnelles de L'Art de l'escrime : postures offensive/attentive/défensive et dé d'avantage au corps à corps.",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(PN2.id, "longFeu", {
    name: "Long feu des armes à feu",
    hint: "Teste automatiquement le long feu (D20) à chaque tir d'arme à feu (L'Art de l'escrime).",
    scope: "world", config: true, type: Boolean, default: true
  });
}

function registerHelpers() {
  Handlebars.registerHelper("pn2Signed", v => {
    const n = Number(v) || 0;
    return n > 0 ? `+${n}` : `${n}`;
  });
  Handlebars.registerHelper("pn2Json", v => JSON.stringify(v));
  Handlebars.registerHelper("pn2Array", (...args) => args.slice(0, -1));
  Handlebars.registerHelper("pn2Times", (n, block) => {
    let out = "";
    for (let i = 0; i < n; i++) out += block.fn(i);
    return out;
  });
}

/* -------------------------------------------- */
/*  Chat : boutons des cartes                   */
/* -------------------------------------------- */

Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll("[data-pn2-action]").forEach(el => {
    const ev = el.tagName === "SELECT" ? "change" : "click";
    el.addEventListener(ev, async event => {
      event.preventDefault();
      const a = el.dataset.pn2Action;
      try {
        switch (a) {
          case "defendre": return await combat.defendre(message, el.dataset.mode);
          case "manoeuvre":
            if (!message.isOwner) return ui.notifications.warn("Seul l'auteur du message (ou le MJ) peut choisir cette manœuvre.");
            return await combat.choisirManoeuvre(message, el.dataset.cote, el.dataset.index);
          case "loc":
            if (!message.isOwner) return;
            return await combat.changerLocalisation(message, el.value);
          case "appliquer": return await combat.appliquerResolution(message);
          case "estocada": return await combat.appliquerEstocada(message, el.dataset.index);
          case "avantage":
            if (!message.isOwner) return;
            return await combat.prendreAvantage(message);
          case "canonnade": return await naval.appliquerCanonnade(message);
        }
      } catch (err) {
        console.error(err);
        ui.notifications.error(`Pavillon Noir 2 : ${err.message}`);
      }
    });
  });
});

/* -------------------------------------------- */
/*  Macros : glisser une arme dans la barre     */
/* -------------------------------------------- */

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type !== "Item") return;
  createItemMacro(data, slot);
  return false;
});

async function createItemMacro(data, slot) {
  const item = await fromUuid(data.uuid);
  if (!item || item.type !== "arme" || !item.actor) return;
  const command = `const item = await fromUuid("${item.uuid}");\nif (item) game.pn2.combat.attaquer(item.actor, item);`;
  let macro = game.macros.find(m => m.name === item.name && m.command === command);
  if (!macro) macro = await Macro.create({ name: item.name, type: "script", img: item.img, command });
  game.user.assignHotbarMacro(macro, slot);
}

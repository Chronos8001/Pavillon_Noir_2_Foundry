/**
 * Pavillon Noir 2 — système pour Foundry VTT.
 */
import { PN2 } from "./config.mjs";
import { PersonnageData } from "./data/actor-personnage.mjs";
import { PNJData } from "./data/actor-pnj.mjs";
import { NavireData } from "./data/actor-navire.mjs";
import { ArmeData, ArmureData, EquipementData, AvantageData, ManoeuvreData, MarchandiseData, HistoriqueData, ReligionData, VoieData, PouvoirData, AleaData } from "./data/items.mjs";
import { PN2Actor } from "./documents/actor.mjs";
import { PN2Item } from "./documents/item.mjs";
import { PN2PersonnageSheet } from "./sheets/actor-personnage-sheet.mjs";
import { PN2NavireSheet } from "./sheets/actor-navire-sheet.mjs";
import { PN2ItemSheet } from "./sheets/item-sheet.mjs";
import * as dice from "./rolls/dice.mjs";
import * as combat from "./rolls/combat.mjs";
import * as naval from "./rolls/naval.mjs";
import * as tables from "./helpers/tables.mjs";
import * as magie from "./magie/service.mjs";
import * as magieMoteur from "./magie/moteur.mjs";
import * as magieRegles from "./magie/regles.mjs";
import { ouvrirActe, surMiseAJourActeur, rafraichirTranses } from "./magie/apps-actes.mjs";
import { PN2BibliothequeApp } from "./magie/app-bibliotheque.mjs";
import * as evenements from "./magie/service-evenements.mjs";
import { PN2EvenementsApp } from "./magie/app-evenements.mjs";
import { migrer } from "./magie/migrations.mjs";
import { expirerEffets } from "./magie/service-effets.mjs";
import { PN2HistoriqueApp } from "./magie/app-historique.mjs";

Hooks.once("init", () => {
  console.log("Pavillon Noir 2 | Initialisation du système");
  CONFIG.PN2 = PN2;
  game.pn2 = {
    config: PN2, dice, combat, naval, tables,
    // Magie (Entre ciel et terre)
    magie: {
      ...magie, moteur: magieMoteur, regles: magieRegles,
      /** Ouvre la fiche sur l'onglet « Magie ». */
      ouvrir: actor => {
        const sheet = actor?.sheet;
        if (!sheet) return;
        if (sheet.tabGroups) sheet.tabGroups.primary = "magie";
        return sheet.render({ force: true });
      },
      /** Ouvre la fenêtre du Rituel ou de la Transe du personnage. */
      ouvrirActe,
      /** Ouvre la bibliothèque de magie (religions, Voies, Pouvoirs). */
      bibliotheque: actor => PN2BibliothequeApp.ouvrir(actor),
      /** Événements divins (MJ) : Aléas, révélations, Quêtes, Rejets, séquelles, pénitences. */
      evenements: { ...evenements, ouvrir: () => PN2EvenementsApp.ouvrir() },
      /** Historique des actes sacrés (selon les permissions). */
      historique: actor => PN2HistoriqueApp.ouvrir(actor),
      migrer
    }
  };

  CONFIG.Actor.documentClass = PN2Actor;
  CONFIG.Item.documentClass = PN2Item;
  CONFIG.Actor.dataModels = { personnage: PersonnageData, pnj: PNJData, navire: NavireData };
  CONFIG.Item.dataModels = {
    arme: ArmeData, armure: ArmureData, equipement: EquipementData, avantage: AvantageData, manoeuvre: ManoeuvreData, marchandise: MarchandiseData, historique: HistoriqueData,
    religion: ReligionData, voie: VoieData, pouvoir: PouvoirData, alea: AleaData
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
    "systems/pavillon-noir-2/templates/apps/creation.hbs",
    "systems/pavillon-noir-2/templates/apps/magie-repartition.hbs",
    "systems/pavillon-noir-2/templates/actor/personnage/magie-mj.hbs"
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
  game.settings.register(PN2.id, "magieSeuilVisible", {
    name: "Magie : Seuil de Rejet visible des joueurs",
    hint: "Entre ciel et terre : si décoché, le Seuil de Rejet, les Auspices et le dépassement ne sont montrés qu'au MJ (le prêtre ressent la Colère sans la mesurer).",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(PN2.id, "magieValidationMJ", {
    name: "Magie : validation du MJ",
    hint: "Les joueurs soumettent leurs Rituels et Transes au MJ, qui fixe la Puissance et les Auspices puis autorise ou refuse l'acte.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(PN2.id, "magieParametresVisibles", {
    name: "Magie : paramètres des Pouvoirs visibles des joueurs",
    hint: "Entre ciel et terre : les paramètres (Portée, Cible, Impact, Durée) sont normalement réservés au MJ.",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(PN2.id, "magieAleaMode", {
    name: "Magie : Aléas divins",
    hint: "Officiel : un Aléa par acte sacré (Entre ciel et terre, p. 95). Probabilité : adaptation maison, un Aléa selon la chance réglée ci-dessous. Le MJ peut toujours appliquer, différer ou ignorer un Aléa.",
    scope: "world", config: true, type: String, default: PN2.magie.evenements.aleaMode,
    choices: { probabilite: "Selon une probabilité (adaptation maison)", officiel: "Un par acte sacré (officiel)", desactive: "Désactivés" }
  });
  game.settings.register(PN2.id, "magieAleaProbabilite", {
    name: "Magie : chance d'Aléa par acte (%)",
    hint: "Tirée avec deux d10 au premier lancer de l'acte. Valeur maison à ajuster.",
    scope: "world", config: true, type: Number, default: PN2.magie.evenements.aleaProbabilite, range: { min: 0, max: 100, step: 1 }
  });
  game.settings.register(PN2.id, "magieRevelationSeuil", {
    name: "Magie : chance de révélation par sollicitation (%)",
    hint: "Équivalent maison de la carte Le Mat, tiré avec deux d10 indépendants du d10 sacré. 0 désactive les révélations.",
    scope: "world", config: true, type: Number, default: PN2.magie.evenements.revelationSeuil, range: { min: 0, max: 100, step: 1 }
  });
  // Coffre du MJ : la clé reste dans le navigateur du MJ ; seule son empreinte est publiée
  game.settings.register(PN2.id, "magieCleCoffre", { scope: "client", config: false, type: String, default: "" });
  game.settings.register(PN2.id, "magieEmpreinteCle", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(PN2.id, "magieMigration", { scope: "world", config: false, type: String, default: "0.0.0" });
  game.settings.register(PN2.id, "magieRecuperationAuto", {
    name: "Magie : récupération automatique de la Colère",
    hint: "Retire 1 point de Colère divine par heure de temps du monde écoulée après la fin d'un acte sacré (jamais pendant un Rituel ou une Transe).",
    scope: "world", config: true, type: Boolean, default: true
  });
}

/* Magie : récupération horaire de la Colère quand le temps du monde avance (MJ actif uniquement) */
Hooks.on("updateWorldTime", worldTime => {
  magie.surAvanceeDuTemps(worldTime);
  rafraichirTranses();
  evenements.verifierCycles().catch(err => console.error(err));
  expirerEffets(worldTime).catch(err => console.error(err));
});

/* Magie : la fenêtre de l'acte s'ouvre pour l'utilisateur qui le conduit, dès son début ;
   le MJ actif examine en secret chaque sollicitation (Aléas, révélations, Quêtes, Rejets) */
Hooks.on("updateActor", (actor, changes, options) => {
  surMiseAJourActeur(actor, changes);
  if (!options?.pn2Evenements && foundry.utils.hasProperty(changes, "flags.pavillon-noir-2.acte")) {
    evenements.examinerActeur(actor).catch(err => console.error("Pavillon Noir 2 | Examen des événements", err));
  }
  if (options?.pn2Evenements) evenements.rafraichirPanneau();
});

/* Magie : reprise après une déconnexion du MJ ; panneau des événements divins dans l'onglet des acteurs */
Hooks.once("ready", async () => {
  try { await migrer(); } catch (err) { console.error("Pavillon Noir 2 | Migrations", err); }
  evenements.examinerTout().catch(err => console.error("Pavillon Noir 2 | Examen des événements", err));
});
Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const racine = html instanceof HTMLElement ? html : html?.[0];
  if (!racine || racine.querySelector(".pn2-bouton-evenements")) return;
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "pn2-bouton-evenements";
  bouton.innerHTML = '<i class="fa-solid fa-cloud-bolt"></i> Événements divins';
  bouton.addEventListener("click", () => PN2EvenementsApp.ouvrir());
  (racine.querySelector(".header-actions") ?? racine.querySelector("header") ?? racine).append(bouton);
});

/* Magie : accès à la bibliothèque depuis l'onglet des compendiums */
Hooks.on("renderCompendiumDirectory", (app, html) => {
  const racine = html instanceof HTMLElement ? html : html?.[0];
  if (!racine || racine.querySelector(".pn2-bouton-bibliotheque")) return;
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "pn2-bouton-bibliotheque";
  bouton.innerHTML = '<i class="fa-solid fa-book-bookmark"></i> Bibliothèque de magie';
  bouton.addEventListener("click", () => PN2BibliothequeApp.ouvrir(game.user.character ?? null));
  (racine.querySelector(".header-actions") ?? racine.querySelector("header") ?? racine).append(bouton);
});

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

/**
 * Familiers de l'Arbre inversé sur une fiche de PNJ (MJ), selon Entre ciel et terre p. 163-169.
 * L'état de création est stocké sur le PNJ (flags.pavillon-noir-2.familier) ; l'onglet « Familier » de la fiche
 * le modifie, lance les jets (chuchotés au MJ) et reporte le résultat dans les notes du PNJ.
 */
import * as F from "./familiers.mjs";

const SYS = "pavillon-noir-2";
export const VOIE_QLIPOTH = "voie-des-qlipoth";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** État d'un familier neuf. */
export const familierVierge = () => ({
  mage: "", demon: "", pouvoirUuid: "", puissanceInvocation: 1, portee: "", cible: "", duree: "",
  succes: 0, violence: 0, reputation: "normal", d20: null, choixHaut: "geburim", d10Damne: null,
  capacites: [], d10: null, d6: null
});

export const estFamilier = actor => !!actor?.getFlag(SYS, "familier");
export const etatFamilier = actor => ({ ...familierVierge(), ...(actor?.getFlag(SYS, "familier") ?? {}) });

/** Jet Foundry chuchoté au MJ (jet aveugle). */
async function lancer(formule, libelle) {
  const roll = await new Roll(formule).evaluate();
  await roll.toMessage({ flavor: `Familier : ${libelle}`, whisper: ChatMessage.getWhisperRecipients("GM") }, { rollMode: "blindroll" });
  return roll.total;
}

/** Données calculées à partir de l'état. */
export function calculerFamilier(etat) {
  const total = etat.d20 == null ? null : Number(etat.d20) + Number(etat.violence || 0);
  const cle = total == null ? null : F.categorieFamilier(total, etat.choixHaut);
  const categorie = cle ? F.CATEGORIES_FAMILIER[cle] : null;
  const puissance = F.puissanceFamilier(etat.puissanceInvocation, etat.succes);
  const rang = F.rangFamilier(puissance);
  let pouvoir = null;
  if (cle === "damne") pouvoir = etat.d10Damne >= 1 && etat.d10Damne <= 9 ? F.ETRES_DAMNES[etat.d10Damne - 1] : null;
  else if (categorie) pouvoir = categorie.pouvoirs[rang];
  const mod = F.REPUTATIONS_DEMON[etat.reputation]?.mod ?? 0;
  const fiabilite = etat.d10 == null || etat.d6 == null ? null : F.fiabiliteFamilier(etat.d10, etat.d6, mod);
  return { total, cle, categorie, puissance, rang, rangLabel: F.RANGS_FAMILIER[rang].label, pouvoir, fiabilite, mod };
}

/** Pouvoirs de la Voie des Qlipoth (compendiums et monde), pour choisir le Pouvoir d'invocation. */
let cacheQlipoth = null;
export async function pouvoirsQlipoth() {
  if (cacheQlipoth) return cacheQlipoth;
  const out = [];
  for (const pack of game.packs.filter(p => p.documentName === "Item")) {
    const index = await pack.getIndex({ fields: ["system.voie", "system.puissance", "system.portee", "system.cible", "system.duree"] });
    for (const e of index) if (e.type === "pouvoir" && e.system?.voie === VOIE_QLIPOTH) out.push({ uuid: e.uuid, nom: e.name, ...e.system });
  }
  for (const i of game.items.filter(i => i.type === "pouvoir" && i.system.voie === VOIE_QLIPOTH)) out.push({ uuid: i.uuid, nom: i.name, ...i.system });
  out.sort((a, b) => a.puissance - b.puissance || a.nom.localeCompare(b.nom));
  return (cacheQlipoth = out);
}

/** Contexte de l'onglet « Familier ». */
export async function contexteFamilier(actor) {
  const e = etatFamilier(actor);
  const calc = calculerFamilier(e);
  const mage = e.mage ? fromUuidSync(e.mage, { strict: false }) : null;
  const kabbale = mage?.system?.skills?.religion?.value ?? null;
  const actuels = mage ? game.actors.filter(a => a.getFlag(SYS, "familier")?.mage === e.mage).length : 0;
  const pouvoirs = await pouvoirsQlipoth();
  const opt = (liste, val) => liste.map(o => ({ ...o, selected: String(o.v) === String(val) }));
  return {
    e, calc,
    mages: opt([{ v: "", label: "—" }, ...game.actors.filter(a => ["personnage", "pnj"].includes(a.type) && a.id !== actor.id)
      .map(a => ({ v: a.uuid, label: a.name }))], e.mage),
    pouvoirs: opt([{ v: "", label: "— saisie libre —" }, ...pouvoirs.map(p => ({ v: p.uuid, label: `${p.nom} (Puissance ${p.puissance})` }))], e.pouvoirUuid),
    violences: opt([-2, -1, 0, 1, 2].map(v => ({ v, label: v > 0 ? `+${v}` : `${v}` })), e.violence),
    reputations: opt(Object.entries(F.REPUTATIONS_DEMON).map(([v, d]) => ({ v, label: d.label })), e.reputation),
    hauts: opt([{ v: "geburim", label: "Geburim" }, { v: "damne", label: "Être spirituel damné" }], e.choixHaut),
    haut: calc.total != null && calc.total >= 17,
    damne: calc.cle === "damne",
    kabbale, actuels, max: kabbale == null ? null : F.maxFamiliers(kabbale),
    depasse: kabbale != null && actuels > F.maxFamiliers(kabbale),
    rangs: F.RANGS_FAMILIER.map((r, i) => ({ label: r.label, plage: r.max === Infinity ? `${r.min} et +` : `${r.min}-${r.max}`, actif: i === calc.rang })),
    pret: !!calc.categorie && !!calc.pouvoir && calc.fiabilite != null && e.capacites.length > 0
  };
}

/** Le choix d'un Pouvoir d'invocation reprend sa Puissance et ses paramètres (limites du familier). */
export async function choisirPouvoirInvocation(actor, uuid) {
  const p = (await pouvoirsQlipoth()).find(x => x.uuid === uuid);
  if (!p) return;
  const e = etatFamilier(actor);
  await actor.setFlag(SYS, "familier", { ...e, pouvoirUuid: uuid, puissanceInvocation: p.puissance, portee: p.portee, cible: p.cible, duree: p.duree, demon: e.demon || p.nom });
}

/** Notes HTML du familier. */
export function notesFamilier(etat, calc) {
  const c = calc.categorie;
  const mage = etat.mage ? fromUuidSync(etat.mage, { strict: false }) : null;
  const caps = etat.capacites.map(x => `<li><strong>${esc(x.nom)}</strong> (D100 ${x.de}) : ${esc(x.effet)}</li>`).join("");
  return `<p><strong>Familier ${esc(c.nom)}</strong> (${esc(c.element)}) — ${esc(calc.rangLabel)}, Puissance ${calc.puissance}.</p>`
    + `<p><strong>Mage Noir :</strong> ${esc(mage?.name ?? "—")}. <strong>Démon donateur :</strong> ${esc(etat.demon || "—")}.</p>`
    + `<p><strong>Forme.</strong> ${esc(c.forme)} <strong>Caractère.</strong> ${esc(c.caractere)}</p>`
    + `<p><strong>Pouvoir de familier :</strong> ${esc(calc.pouvoir ?? "—")}</p>`
    + `<p><strong>Capacité spéciale :</strong></p><ul>${caps || "<li>—</li>"}</ul>`
    + `<p><strong>Limites</strong> (Pouvoir d'invocation) : Portée ${esc(etat.portee || "—")} (distance maximale du Mage Noir) ; `
    + `Cible ${esc(etat.cible || "—")} ; Durée quotidienne totale ${esc(etat.duree || "—")}. Il agit au toucher, sauf mention contraire.</p>`
    + `<p><strong>Fiabilité :</strong> ${calc.fiabilite ?? "—"}. Avant chaque usage : Test d'obéissance (onglet Familier).</p>`
    + `<p><strong>Danger.</strong> ${esc(c.danger)}</p>`
    + `<p>Invisible sauf pour le Mage Noir, sauf s'il décide de se montrer.</p><p><em>Entre ciel et terre, p. 163-169.</em></p>`;
}

/** Opérations de l'onglet « Familier » (MJ). */
export async function operationFamilier(actor, op, target) {
  if (!game.user.isGM) return ui.notifications.warn("Réservé au MJ.");
  const e = etatFamilier(actor);
  switch (op) {
    case "activer": return actor.setFlag(SYS, "familier", familierVierge());
    case "desactiver": {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Familier" }, content: "<p>Retirer les données de familier de ce PNJ ?</p>" });
      return ok ? actor.unsetFlag(SYS, "familier") : null;
    }
    case "categorie": e.d20 = await lancer("1d20", "catégorie (D20)"); break;
    case "damne": {
      e.d10Damne = await lancer("1d10", "être spirituel damné (D10)");
      if (e.d10Damne === 10) {   // c'est un Reschaïm : relancer le D20 en ignorant l'Être spirituel damné
        e.d10Damne = null;
        e.choixHaut = "geburim";
        e.d20 = await lancer("1d20", "catégorie relancée (D20)");
        ui.notifications.info("D10 = 10 : c'est un Reschaïm, le D20 est relancé.");
      }
      break;
    }
    case "capacites": {
      const des = [];
      e.capacites = F.tirerCapacites(() => { const v = new Roll("1d100").evaluateSync().total; des.push(v); return v; });
      await ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), content: `<p>Familier : capacité spéciale (D100) : ${des.join(", ")}.</p>` });
      break;
    }
    case "ajouterCapacite": {
      const v = Number(target.closest(".pn2-familier")?.querySelector(".capacite-manuelle")?.value);
      const c = F.capaciteFamilier(v);
      if (!c) return ui.notifications.warn("Entrez un résultat de D100 entre 1 et 98.");
      e.capacites = [...e.capacites, c];
      break;
    }
    case "retirerCapacite": e.capacites = e.capacites.filter((_, i) => i !== Number(target.dataset.index)); break;
    case "fiabilite": e.d10 = await lancer("1d10", "fiabilité (1d10)"); e.d6 = await lancer("1d6", "fiabilité (1d6)"); break;
    case "appliquer": {
      const calc = calculerFamilier(e);
      if (!calc.categorie || !calc.pouvoir || calc.fiabilite == null || !e.capacites.length) {
        return ui.notifications.warn("Il manque la catégorie, le pouvoir, la capacité spéciale ou la fiabilité.");
      }
      await actor.update({
        "system.notes": notesFamilier(e, calc),
        "system.role": `Familier (${calc.categorie.nom})`,
        "system.importance": calc.rang >= 3 ? "majeure" : "moyenne",
        [`flags.${SYS}.familier`]: { ...e, categorie: calc.cle, puissance: calc.puissance, rang: calc.rang, pouvoir: calc.pouvoir, fiabilite: calc.fiabilite }
      });
      return ui.notifications.info("Familier reporté dans les notes du PNJ.");
    }
    case "obeissance": return demanderTestFamilier(actor);
    default: return;
  }
  return actor.setFlag(SYS, "familier", e);
}

/** Test d'obéissance (p. 169) : Test de Chance sur la Fiabilité, chuchoté au MJ. */
export async function testFamilier(actor, traitement = 0) {
  const e = etatFamilier(actor);
  const fiabilite = calculerFamilier(e).fiabilite;
  if (fiabilite == null) return ui.notifications.warn("Tirez d'abord la fiabilité du familier.");
  const de = await lancer("1d10", `obéissance de ${actor.name}`);
  const res = F.obeissanceFamilier(de, fiabilite, traitement);
  await ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="pn2-card"><h3>${esc(actor.name)} : obéissance</h3><p>D10 ${de} contre Fiabilité ${fiabilite}`
      + `${traitement ? ` ${traitement > 0 ? "+" : "−"} ${Math.abs(traitement)} (traitement)` : ""}.</p><p><strong>${esc(F.OBEISSANCE[res])}</strong></p></div>`
  });
  return res;
}

/** Choix du traitement puis test d'obéissance. */
export async function demanderTestFamilier(actor) {
  const traitement = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Obéissance : ${actor.name}` },
    content: `<div class="form-group"><label>Traitement du familier</label><select name="traitement">
      <option value="-2">Maltraité et ridiculisé (−2)</option><option value="-1">Négligé (−1)</option>
      <option value="0" selected>Normal (0)</option><option value="1">Bien traité (+1)</option><option value="2">Aux petits soins (+2)</option></select></div>`,
    ok: { label: "Tester", callback: (ev, button) => Number(button.form.elements.traitement.value) }
  }).catch(() => null);
  if (traitement === null || traitement === undefined) return null;
  return testFamilier(actor, traitement);
}

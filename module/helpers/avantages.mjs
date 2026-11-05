/**
 * Avantages et faiblesses : choix de la variante, limites de création et effets automatiques
 * (réputation, accès à l'escrime, école de renom, qualités d'armes, fusil de boucanier, arme double).
 * Chaque effet est mémorisé pour être annulé si l'avantage est retiré.
 */
import { PN2 } from "../config.mjs";
import { pcAvantage } from "../data/items.mjs";

const SYS = PN2.id;
const DialogV2 = () => foundry.applications.api.DialogV2;
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const formObj = (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object;

/** Nombre de qualités au choix (en plus de l'Apparat imposé) selon l'effet et la variante. */
function reglesQualites(effet, indexOption) {
  if (effet === "armeBlanche") return { apparat: true, choix: [0, 1, 2][indexOption] ?? 0, liste: PN2.qualitesBlanches };
  if (effet === "armeFeu") return { apparat: indexOption < 2, choix: [0, 2, 3][indexOption] ?? 0, liste: PN2.qualitesFeu };
  if (effet === "tolede") return { apparat: false, choix: 2, liste: { legerete: PN2.qualitesBlanches.legerete, equilibre: PN2.qualitesBlanches.equilibre, acier: PN2.qualitesBlanches.acier, apparat: PN2.qualitesBlanches.apparat } };
  return null;
}

/**
 * Assistant lancé quand un avantage ou une faiblesse est ajouté à un personnage.
 * @returns {Promise<boolean>} false si le joueur annule (l'objet est retiré)
 */
export async function assistantAvantage(actor, item) {
  const s = item.system;
  const faiblesse = s.nature === "faiblesse";
  const memes = actor.items.filter(i => i.type === "avantage" && i.id !== item.id);
  const enCreation = !actor.getFlag(SYS, "creation")?.termine;

  // Limites de création : 5 avantages, 5 faiblesses, un seul exemplaire sauf exceptions
  const avert = [];
  if (enCreation && memes.filter(i => (i.system.nature === "faiblesse") === faiblesse).length >= 5) {
    avert.push(`Le personnage a déjà 5 ${faiblesse ? "faiblesses" : "avantages"} (maximum à la création).`);
  }
  if (!s.multiple && memes.some(i => i.flags?.[SYS]?.base === item.name || i.name === item.name)) {
    avert.push(`« ${item.name} » ne peut être pris qu'une fois.`);
  }
  if (s.prerequis) avert.push(s.prerequis);

  const opts = s.options ?? [];
  let html = `<div class="pn2-dialog pn2-assistant"><p class="intro"><strong>${esc(item.name)}</strong> — ${faiblesse ? "Faiblesse" : "Avantage"}${s.categorie ? ` (${esc(s.categorie)})` : ""}</p>`;
  if (avert.length) html += avert.map(a => `<p class="hint alerte">${esc(a)}</p>`).join("");
  if (opts.length > 1) {
    html += `<div class="form-group"><label>Variante</label><select name="choix">${opts.map((o, i) => `<option value="${i}">${esc(o.label)} (${o.pc > 0 ? "+" : ""}${o.pc} PC)</option>`).join("")}</select></div>`;
  }
  if (s.variable) {
    html += `<div class="form-group"><label>Points de compétence${s.maxPc ? ` (max. ${s.maxPc})` : ""}</label><input type="number" name="pc" value="1" min="0" ${s.maxPc ? `max="${s.maxPc}"` : ""}></div>`;
    const aide = { argent: "100 pièces de huit par point.", gloire: "10 points de Gloire par point.", infamie: "20 points d'Infamie par point (5 points maximum)." }[s.effet];
    if (aide) html += `<p class="hint">${aide}</p>`;
  }
  html += `</div>`;

  const besoinDialogue = opts.length > 1 || s.variable || avert.length;
  let form = {};
  if (besoinDialogue) {
    form = await DialogV2().wait({
      window: { title: item.name }, position: { width: 480 }, content: html,
      buttons: [{ action: "ok", label: "Valider", default: true, callback: formObj }, { action: "cancel", label: "Annuler" }],
      rejectClose: false
    });
    if (!form || form === "cancel") return false;
  }

  const idx = opts.length > 1 ? Number(form.choix) || 0 : 0;
  const opt = opts[idx] ?? null;
  const upd = { [`flags.${SYS}.base`]: item.name };
  if (opt) {
    upd["system.choix"] = opt.label;
    if (opts.length > 1) upd.name = `${item.name} (${opt.label})`;
  }
  if (s.variable) {
    let pc = Math.max(0, Number(form.pc) || 0);
    if (s.maxPc) pc = Math.min(s.maxPc, pc);
    upd["system.pc"] = pc;
  }
  await item.update(upd);

  // Effets automatiques
  const pc = pcAvantage(item.system);
  const annul = await appliquerEffet(actor, item, { pc, idx });
  if (annul === false) return false;
  await item.update({ [`flags.${SYS}.applique`]: annul ?? {} });
  return true;
}

/** Applique l'effet d'un avantage ; retourne les informations d'annulation. */
async function appliquerEffet(actor, item, { pc, idx }) {
  const s = item.system;
  const sys = actor.system;
  const annul = {};
  switch (s.effet) {
    case "gloire":
    case "infamie": {
      const n = s.effet === "gloire" ? 10 * pc : 20 * Math.min(5, pc);
      annul.reputation = { cle: s.effet, n };
      await actor.update({ [`system.reputation.${s.effet}.score`]: (sys.reputation[s.effet].score ?? 0) + n });
      break;
    }
    case "escrime": {
      const t = s.escrimeType;
      if (t && sys.escrime?.[t] && !sys.escrime[t].acces) {
        annul.acces = t;
        await actor.update({ [`system.escrime.${t}.acces`]: true });
      }
      break;
    }
    case "ecoleRenom":
      annul.pointsBonus = 3;
      await actor.update({ "system.escrime.epee.pointsBonus": (sys.escrime.epee.pointsBonus ?? 0) + 3 });
      break;
    case "armeBlanche":
    case "armeFeu":
    case "tolede":
      return qualitesArme(actor, item, idx);
    case "fusilBoucanier":
      return fusilBoucanier(actor);
    case "armeDouble":
      return armeDouble(actor, idx);
  }
  return annul;
}

/** Choisit une arme du personnage (ou du compendium) et lui donne des qualités. */
async function qualitesArme(actor, item, idx) {
  const s = item.system;
  const regles = reglesQualites(s.effet, idx);
  const blanche = s.effet !== "armeFeu";
  const armes = actor.items.filter(i => i.type === "arme" && (blanche ? i.system.categorie === "blanche" : i.system.estArmeFeu) && i.system.competence !== "mainsNues");
  const pack = game.packs.get(`${SYS}.equipement`);
  const index = pack ? [...await pack.getIndex({ fields: ["type", "system.categorie", "system.competence"] })] : [];
  const modeles = index.filter(e => e.type === "arme" && (blanche ? e.system?.categorie === "blanche" && e.system?.competence !== "mainsNues" : ["mousquet", "pistolet"].includes(e.system?.competence)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const qual = Object.entries(regles.liste).filter(([k]) => !(regles.apparat && k === "apparat"));
  let html = `<div class="pn2-dialog pn2-assistant"><p class="intro"><strong>${esc(item.name)}</strong></p>
    <div class="form-group"><label>Arme</label><select name="arme">
      ${armes.map(a => `<option value="a:${a.id}">${esc(a.name)} (possédée)</option>`).join("")}
      ${modeles.map(m => `<option value="c:${m._id}">${esc(m.name)} (nouvelle)</option>`).join("")}</select></div>`;
  if (regles.apparat) html += `<p>Apparat : inclus.</p>`;
  if (regles.choix) {
    html += `<p>Choisissez <strong>${regles.choix}</strong> qualité(s) différente(s) :</p><div class="choix-competences">`;
    html += qual.map(([k, d]) => `<label class="choix"><input type="checkbox" name="q_${k}"> <strong>${esc(d.label)}</strong> <span class="hint">${esc(d.effet)}</span></label>`).join("");
    html += `</div>`;
  }
  html += `</div>`;
  for (;;) {
    const form = await DialogV2().wait({
      window: { title: `Qualités : ${item.name}` }, position: { width: 520 }, content: html,
      buttons: [{ action: "ok", label: "Valider", default: true, callback: formObj }, { action: "cancel", label: "Annuler" }],
      rejectClose: false
    });
    if (!form || form === "cancel") return false;
    const choisies = qual.filter(([k]) => form[`q_${k}`]).map(([k]) => k);
    if (choisies.length !== regles.choix) { ui.notifications.warn(`Choisissez exactement ${regles.choix} qualité(s).`); continue; }
    if (regles.apparat) choisies.push("apparat");
    const annul = {};
    let arme;
    if (String(form.arme).startsWith("c:")) {
      const doc = await pack.getDocument(form.arme.slice(2));
      const [cree] = await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
      arme = cree; annul.armeCreee = cree.id;
    } else {
      arme = actor.items.get(String(form.arme).slice(2));
      annul.armeId = arme.id; annul.qualitesAvant = foundry.utils.deepClone(arme.system.qualites);
    }
    const upd = {};
    for (const k of choisies) upd[`system.qualites.${k}`] = Math.min(PN2.qualitesBlanches[k]?.max ?? PN2.qualitesFeu[k]?.max ?? 1, (arme.system.qualites?.[k] ?? 0) + 1);
    await arme.update(upd);
    ui.notifications.info(`${arme.name} : ${choisies.map(k => regles.liste[k]?.label ?? PN2.qualitesBlanches[k]?.label).join(", ")}.`);
    return annul;
  }
}

/** Fusil et poudre de boucanier : platine à silex, maniabilité, poudre de qualité, canon (+10 m). */
async function fusilBoucanier(actor) {
  const pack = game.packs.get(`${SYS}.equipement`);
  const doc = pack ? (await pack.getDocuments()).find(d => d.name === "Fusil de boucanier") : null;
  const data = doc ? doc.toObject() : { name: "Fusil de boucanier", type: "arme", system: { categorie: "tir", competence: "mousquet", carac: "per", degats: 3, portee: 50 } };
  data.system.qualites = { ...(data.system.qualites ?? {}), silex: 1, maniabilite: 1, poudre: 1, canon: 2 };
  const [cree] = await actor.createEmbeddedDocuments("Item", [data]);
  return { armeCreee: cree.id };
}

/** Arme double : qualité choisie appliquée à une arme du personnage. */
async function armeDouble(actor, idx) {
  const armes = actor.items.filter(i => i.type === "arme");
  const qualite = ["normale", "superieure", "extraordinaire"][idx] ?? "normale";
  if (!armes.length) { ui.notifications.info("Ajoutez l'arme double (épée-pistolet, mousquet-hache…) puis réglez sa qualité dans sa fiche."); return {}; }
  const id = await DialogV2().wait({
    window: { title: "Arme double" },
    content: `<div class="pn2-dialog"><div class="form-group"><label>Arme double</label><select name="arme">${armes.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
      <p class="hint">Une arme double utilise deux Compétences : créez une seconde arme pour l'autre usage et réglez-y la même qualité.</p></div>`,
    buttons: [{ action: "ok", label: "Valider", default: true, callback: (e, b) => b.form.elements.arme.value }],
    rejectClose: false
  });
  const arme = actor.items.get(id);
  if (!arme) return {};
  const annul = { armeId: arme.id, doubleAvant: arme.system.double };
  await arme.update({ "system.double": qualite });
  return annul;
}

/** Annule les effets d'un avantage retiré. */
export async function annulerAvantage(actor, item) {
  const a = item.flags?.[SYS]?.applique;
  if (!a || !actor) return;
  const sys = actor.system;
  const upd = {};
  if (a.reputation) upd[`system.reputation.${a.reputation.cle}.score`] = Math.max(0, (sys.reputation[a.reputation.cle].score ?? 0) - a.reputation.n);
  if (a.acces) upd[`system.escrime.${a.acces}.acces`] = false;
  if (a.pointsBonus) upd["system.escrime.epee.pointsBonus"] = (sys.escrime.epee.pointsBonus ?? 0) - a.pointsBonus;
  if (Object.keys(upd).length) await actor.update(upd);
  if (a.armeCreee) await actor.items.get(a.armeCreee)?.delete();
  if (a.armeId && actor.items.get(a.armeId)) {
    const w = actor.items.get(a.armeId);
    const u = {};
    if (a.qualitesAvant) u["system.qualites"] = a.qualitesAvant;
    if (a.doubleAvant !== undefined) u["system.double"] = a.doubleAvant;
    if (Object.keys(u).length) await w.update(u);
  }
}

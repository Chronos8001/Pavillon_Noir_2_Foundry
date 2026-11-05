/**
 * Escrime et création de personnage (L'Art de l'escrime, p. 133-141) :
 * profil du personnage, accès, armes de prédilection, Points d'escrime et achat des manœuvres.
 */
import { PN2 } from "../config.mjs";

const SYS = PN2.id;
const PACK = `${SYS}.manoeuvres-escrime`;
const normal = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Marins surnuméraires (non soumis au quart) : pas de prédilection pour le combat de pont et la hache. */
const SURNUMERAIRES = ["armurier", "artificier", "cambusier", "commis", "maitre valet", "coq", "boulanger", "boucher", "chirurgien"];

/** Groupe d'une profession (« Profession : Marins. » dans la description). */
export function groupeProfession(item) {
  const m = String(item?.system?.description ?? "").match(/Profession\s*:\s*([^.<]*)/);
  return m ? m[1].trim() : "";
}

/** Nationalité européenne du personnage (Européen ou Créole), d'après le peuple choisi. */
export function nationalite(actor) {
  const txt = actor.system.infos?.peuple ?? "";
  const m = txt.match(/\(([^)]+)\)/);
  const pays = m ? m[1].trim() : "";
  const peuple = actor.items.find(i => i.type === "historique" && i.system.etape === "peuple");
  const europeen = !!peuple && ["europeen", "creole"].includes(normal(peuple.name));
  return { pays, europeen, peuple: peuple?.name ?? "" };
}

/** Profil d'escrime du personnage : statut, nation, origine, profession. */
export function profilEscrime(actor) {
  const items = actor.items;
  const avantages = items.filter(i => i.type === "avantage");
  const noble = avantages.some(i => i.system.effet === "noble" || /statut social\s*:\s*nobl/i.test(i.name));
  const { pays, europeen } = nationalite(actor);
  const origine = items.find(i => i.type === "historique" && i.system.etape === "origine")?.name ?? "";
  const professions = items.filter(i => i.type === "historique" && i.system.etape === "profession");
  const groupes = professions.map(groupeProfession);
  const noms = professions.map(p => normal(p.name));
  const o = normal(origine);
  const p = {
    noble, nation: pays, europeen, origine,
    professions: professions.map(i => i.name),
    marin: groupes.includes("Marins") || o === "marine",
    marinQuart: groupes.includes("Marins") && !noms.some(n => SURNUMERAIRES.some(s => n.includes(s))),
    colon: groupes.includes("Colons") || o === "colons",
    soldat: groupes.includes("Militaires") || o === "armee",
    fantassin: noms.some(n => /infanterie|mousquetaire|sergent|lancier/.test(n)),
    officier: noms.some(n => /^officier|aspirant|enseigne|cadet/.test(n)),
    maitreArmes: noms.some(n => /maitre d'arme|maitre d'escrime/.test(n)),
    ecoleEtranger: avantages.some(i => i.system.effet === "ecoleEtranger"),
    ecoleRenom: avantages.some(i => i.system.effet === "ecoleRenom")
  };
  return p;
}

/** Écoles accessibles (nation, avantage « École d'un autre pays que le sien »). Réservées aux nobles. */
export function ecolesAccessibles(p) {
  if (!p.noble) return [];
  return Object.entries(PN2.ecoles).filter(([, e]) => e.pays.includes(p.nation) || (p.ecoleEtranger && e.etranger.includes(p.nation)))
    .map(([k, e]) => ({ key: k, ...e }));
}

/** Armes et techniques de prédilection (L'Art de l'escrime, p. 135). */
export function predilections(p, ecoleCle) {
  const out = new Set();
  const ecole = { allemande: ["sabre"], anglaise: ["sabre"], francaise: ["epee", "dague"], italienne: ["epee", "dague", "deuxarmes"], espagnole: ["destreza"] }[ecoleCle] ?? [];
  ecole.forEach(x => out.add(x));
  const o = normal(p.origine);
  if (o === "armee") ["baionnette", "sabre"].forEach(x => out.add(x));
  if (o === "colons") ["hache", "sabre"].forEach(x => out.add(x));
  if (o === "marine") ["pont", "sabre"].forEach(x => out.add(x));
  if (o === "noblesse") out.add("epee");
  if (p.marinQuart) ["pont", "hache"].forEach(x => out.add(x));
  if (p.officier) out.add("epee");
  if (p.fantassin) out.add("baionnette");
  return [...out];
}

/** Accès gratuits à la création (nobles ; écoles allemande et espagnole). */
export function accesGratuits(p, ecoleCle) {
  const out = new Set();
  if (p.noble && p.nation !== "Allemand") out.add("epee");
  if (p.noble && p.nation === "Allemand") out.add("sabre");
  if (p.noble && p.nation === "Italien") { out.add("dague"); out.add("deuxarmes"); }
  for (const t of PN2.ecoles[ecoleCle]?.gratuit ?? []) out.add(t);
  return [...out];
}

/** Type d'escrime correspondant à une arme d'escrime choisie. */
export function typePourArme(arme, ecoleCle) {
  if (ecoleCle === "espagnole") return "destreza";
  return { rapiere: "epee", "epee courte": "epee", epee: "epee", sabre: "sabre", hache: "hache", baionnette: "baionnette" }[normal(arme)] ?? "epee";
}

/**
 * Coût en Points d'escrime d'une liste de manœuvres : Niveau de chaque manœuvre,
 * mais une manœuvre de même combinaison qu'une manœuvre déjà acquise ne coûte qu'un point.
 * Les manœuvres d'école sont gratuites.
 */
export function coutManoeuvres(list) {
  const groupes = new Map();
  for (const m of list) {
    const s = m.system ?? m;
    if (s.ecole) continue;
    const combo = String(s.combinaison ?? "").split(/[\s,]+/).filter(Boolean).map(x => (x === "10" ? "0" : x)).sort().join(" ");
    const g = groupes.get(combo) ?? [];
    g.push(s.niveau ?? 1);
    groupes.set(combo, g);
  }
  let total = 0;
  for (const g of groupes.values()) total += Math.max(...g) + (g.length - 1);
  return total;
}

/**
 * Fenêtre d'achat de manœuvres depuis le compendium.
 * @param {Actor} actor
 * @param {string} type    type d'escrime
 * @param {object} [o]
 * @param {boolean} [o.ecole]  manœuvres d'école (gratuites, nombre limité)
 * @param {number} [o.nombre]  nombre de manœuvres d'école à choisir
 */
export async function acheterManoeuvres(actor, type, { ecole = false, nombre = 0 } = {}) {
  const pack = game.packs.get(PACK);
  if (!pack) return ui.notifications.warn("Compendium des manœuvres introuvable.");
  const docs = await pack.getDocuments();
  const possedees = actor.items.filter(i => i.type === "manoeuvre");
  const noms = new Set(possedees.map(i => normal(i.name)));
  const dispo = docs.filter(d => d.system.escrime === type && !!d.system.ecole === ecole && !noms.has(normal(d.name)))
    .sort((a, b) => a.system.niveau - b.system.niveau || a.name.localeCompare(b.name));
  if (!dispo.length) return ui.notifications.info("Aucune manœuvre disponible.");
  const e = actor.system.escrime?.[type];
  const deja = possedees.filter(m => m.system.escrime === type);
  const budget = ecole ? nombre - deja.filter(m => m.system.ecole).length : (e?.points ?? 0) - coutManoeuvres(deja);
  if (budget <= 0) return ui.notifications.warn(ecole ? "Toutes les manœuvres d'école ont déjà été choisies." : "Plus aucun Point d'escrime disponible pour ce type d'escrime.");
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const lignes = dispo.map((d, i) => `<label class="choix" title="${esc(d.system.effet)}"><input type="checkbox" name="m_${i}" data-niveau="${d.system.niveau}" data-combo="${esc(d.system.combinaison)}">
    <span class="niv">N${d.system.niveau}</span> <strong>${esc(d.name)}</strong> <span class="combo">[${esc(d.system.combinaison)}]</span><br><span class="hint">${esc(d.system.effet)}</span></label>`).join("");
  const content = `<div class="pn2-dialog pn2-assistant"><p>${ecole ? `Choisissez <strong>${budget}</strong> manœuvre(s) d'école (gratuites).` : `Points d'escrime disponibles : <strong>${budget}</strong>. Coût = Niveau ; 1 point si une manœuvre de même combinaison est déjà acquise.`}</p>
    <p class="compteur">Sélection : <strong data-total>0</strong> / ${budget}</p><div class="choix-competences liste-manoeuvres">${lignes}</div></div>`;
  for (;;) {
    const form = await foundry.applications.api.DialogV2.wait({
      window: { title: `${ecole ? "Manœuvres d'école" : "Acheter des manœuvres"} : ${PN2.escrimeTypes[type]?.label ?? type}` },
      position: { width: 620, height: 640 }, content,
      render: (event, dialog) => {
        const el = dialog.element ?? event?.target?.element;
        const maj = () => {
          const sel = dispo.filter((d, i) => el.querySelector(`[name="m_${i}"]`)?.checked);
          const total = ecole ? sel.length : coutManoeuvres([...deja, ...sel]) - coutManoeuvres(deja);
          const t = el.querySelector("[data-total]");
          if (t) { t.textContent = total; t.classList.toggle("alerte", total > budget); }
        };
        el?.querySelectorAll("input[type=checkbox]").forEach(c => c.addEventListener("change", maj));
      },
      buttons: [{ action: "ok", label: "Ajouter", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object }, { action: "cancel", label: "Annuler" }],
      rejectClose: false
    });
    if (!form || form === "cancel") return;
    const sel = dispo.filter((d, i) => form[`m_${i}`]);
    const total = ecole ? sel.length : coutManoeuvres([...deja, ...sel]) - coutManoeuvres(deja);
    if (total > budget) { ui.notifications.warn(`${total} point(s) pour ${budget} disponible(s).`); continue; }
    if (sel.length) await actor.createEmbeddedDocuments("Item", sel.map(d => d.toObject()));
    return sel.length;
  }
}

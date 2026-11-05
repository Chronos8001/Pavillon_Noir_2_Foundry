import { PN2 } from "../config.mjs";

const f = foundry.data.fields;
const EPS = 1e-9;

/** Champ « bourse » : pièces de huit (fractionnables) + autres monnaies. */
export function bourseField(initial = 5) {
  const m = {};
  for (const k of Object.keys(PN2.monnaies)) m[k] = new f.NumberField({ required: true, initial: 0, min: 0 });
  return new f.SchemaField({
    pieces: new f.NumberField({ required: true, initial, min: 0 }),
    monnaies: new f.SchemaField(m)
  });
}

/** Valeur totale d'une bourse en pièces de huit. */
export function totalBourse(b) {
  let t = Number(b?.pieces) || 0;
  for (const [k, def] of Object.entries(PN2.monnaies)) t += (Number(b?.monnaies?.[k]) || 0) * def.valeur;
  return arrondi(t);
}

export const arrondi = x => Math.round(x * 1000) / 1000;

/** Format lisible : 12,5 → « 12 ½ » (les pirates coupent les pièces en quartiers). */
export function formatPieces(x) {
  x = arrondi(Number(x) || 0);
  const ent = Math.floor(x + EPS);
  const frac = x - ent;
  const q = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[Math.round(frac * 4) / 4];
  if (Math.abs(frac - Math.round(frac * 4) / 4) < 0.005 && q) return ent ? `${ent} ${q}` : q;
  if (frac < 0.005) return String(ent);
  return String(x).replace(".", ",");
}

/** Liste pour l'affichage (monnaies possédées d'abord). */
export function lignesBourse(b, toutes = false) {
  const lignes = [{ key: "pieces", label: "Pièces de huit", pays: "Espagne", valeur: 1, quantite: b.pieces, sousTotal: arrondi(b.pieces), principale: true }];
  for (const [k, def] of Object.entries(PN2.monnaies)) {
    const q = Number(b.monnaies?.[k]) || 0;
    if (!toutes && q <= 0) continue;
    lignes.push({ key: k, label: def.label, pays: def.pays, valeur: def.valeur, compte: def.compte, quantite: q, sousTotal: arrondi(q * def.valeur) });
  }
  return lignes;
}

const valeurDe = k => (k === "pieces" ? 1 : PN2.monnaies[k]?.valeur ?? 1);
const labelDe = k => (k === "pieces" ? "pièce(s) de huit" : PN2.monnaies[k]?.label ?? k);

/**
 * Paie un montant dans une monnaie : d'abord avec cette monnaie, puis en pièces de huit
 * (coupées en quartiers si besoin), puis en changeant les autres pièces, des plus petites aux plus grosses.
 * @returns {object|null} nouvelle bourse, ou null si les fonds sont insuffisants
 */
export function calculerPaiement(bourse, montant, monnaie = "pieces") {
  const b = foundry.utils.deepClone(bourse);
  let reste = arrondi(montant * valeurDe(monnaie));
  if (totalBourse(b) + EPS < reste) return null;
  const prendre = (k, maxQ) => {
    const v = valeurDe(k);
    const dispo = k === "pieces" ? b.pieces : b.monnaies[k];
    const n = Math.min(dispo, maxQ);
    if (k === "pieces") b.pieces = arrondi(b.pieces - n); else b.monnaies[k] = arrondi(b.monnaies[k] - n);
    reste = arrondi(reste - n * v);
  };
  if (monnaie !== "pieces") prendre(monnaie, Math.floor(reste / valeurDe(monnaie) + EPS));
  if (reste > EPS) prendre("pieces", reste);
  const autres = Object.keys(PN2.monnaies).filter(k => k !== monnaie && b.monnaies[k] > 0).sort((a, c) => valeurDe(a) - valeurDe(c));
  for (const k of autres) {
    if (reste <= EPS) break;
    const v = valeurDe(k);
    const n = Math.min(b.monnaies[k], Math.ceil(reste / v - EPS));
    b.monnaies[k] = arrondi(b.monnaies[k] - n);
    const rendu = arrondi(n * v - reste);
    reste = 0;
    if (rendu > 0) { reste = -rendu; }
  }
  if (reste < 0) b.pieces = arrondi(b.pieces - reste); // monnaie rendue en pièces de huit
  return b;
}

/** Échange une quantité d'une monnaie contre une autre (le reliquat est rendu en pièces de huit). */
export function calculerChange(bourse, quantite, de, vers) {
  const b = foundry.utils.deepClone(bourse);
  const dispo = de === "pieces" ? b.pieces : b.monnaies[de];
  if (quantite > dispo + EPS) return null;
  const valeur = quantite * valeurDe(de);
  const n = vers === "pieces" ? valeur : Math.floor(valeur / valeurDe(vers) + EPS);
  const reliquat = arrondi(valeur - n * valeurDe(vers));
  if (de === "pieces") b.pieces = arrondi(b.pieces - quantite); else b.monnaies[de] = arrondi(b.monnaies[de] - quantite);
  if (vers === "pieces") b.pieces = arrondi(b.pieces + n); else b.monnaies[vers] = arrondi(b.monnaies[vers] + n);
  b.pieces = arrondi(b.pieces + reliquat);
  return { bourse: b, obtenu: n, reliquat };
}

/** Convertit toute la bourse en pièces de huit. */
export function toutConvertir(bourse) {
  const b = foundry.utils.deepClone(bourse);
  b.pieces = totalBourse(bourse);
  for (const k of Object.keys(b.monnaies)) b.monnaies[k] = 0;
  return b;
}

/** Contexte d'affichage d'une bourse. */
export function contexteBourse(bourse, toutes) {
  const lignes = lignesBourse(bourse, toutes).map(l => ({ ...l, valeurLabel: formatPieces(l.valeur), sousTotalLabel: formatPieces(l.sousTotal) }));
  return { lignes, toutes, totalLabel: formatPieces(totalBourse(bourse)) };
}

/* -------------------------------------------- */
/*  Boîte de dialogue                            */
/* -------------------------------------------- */

function optionsMonnaies(sel = "pieces") {
  const opts = [`<option value="pieces" ${sel === "pieces" ? "selected" : ""}>Pièces de huit</option>`];
  for (const [k, d] of Object.entries(PN2.monnaies)) opts.push(`<option value="${k}" ${sel === k ? "selected" : ""}>${d.label} (${d.pays}, ${formatPieces(d.valeur)} p8)</option>`);
  return opts.join("");
}

/**
 * Opérations sur une bourse d'acteur.
 * @param {Actor} actor
 * @param {string} path   chemin de la bourse (ex. « system.richesse »)
 * @param {string} op     payer | recevoir | changer | convertir
 */
export async function operationBourse(actor, path, op) {
  const bourse = foundry.utils.getProperty(actor, path);
  const DialogV2 = foundry.applications.api.DialogV2;
  const titre = { payer: "Payer", recevoir: "Recevoir", changer: "Changer de la monnaie", convertir: "Tout convertir" }[op];
  let nouvelle = null, texte = "";
  if (op === "convertir") {
    const ok = await DialogV2.confirm({ window: { title: titre }, content: `<p>Convertir toute la bourse en <strong>${formatPieces(totalBourse(bourse))} pièces de huit</strong> ?</p>` });
    if (!ok) return;
    nouvelle = toutConvertir(bourse);
    texte = `convertit sa bourse en ${formatPieces(nouvelle.pieces)} pièces de huit`;
  } else {
    const champs = op === "changer"
      ? `<div class="form-group"><label>Quantité</label><input type="number" name="quantite" value="1" min="0" step="any"></div>
         <div class="form-group"><label>De</label><select name="de">${optionsMonnaies("pieces")}</select></div>
         <div class="form-group"><label>Vers</label><select name="vers">${optionsMonnaies("doublon")}</select></div>`
      : `<div class="form-group"><label>Montant</label><input type="number" name="quantite" value="1" min="0" step="any"></div>
         <div class="form-group"><label>Monnaie</label><select name="de">${optionsMonnaies("pieces")}</select></div>
         <div class="form-group"><label>Motif</label><input type="text" name="motif" placeholder="facultatif"></div>`;
    const form = await DialogV2.wait({
      window: { title: `${titre} — ${actor.name}` },
      content: `<div class="pn2-dialog">${champs}<p class="hint">Bourse : ${formatPieces(totalBourse(bourse))} pièces de huit au total.</p></div>`,
      buttons: [{ action: "ok", label: titre, default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object }],
      rejectClose: false
    });
    if (!form) return;
    const q = Number(form.quantite) || 0;
    if (q <= 0) return;
    const motif = form.motif ? ` (${form.motif})` : "";
    if (op === "payer") {
      nouvelle = calculerPaiement(bourse, q, form.de);
      if (!nouvelle) return ui.notifications.warn("Fonds insuffisants.");
      texte = `paie ${formatPieces(q)} ${labelDe(form.de)}${motif}`;
    } else if (op === "recevoir") {
      nouvelle = foundry.utils.deepClone(bourse);
      if (form.de === "pieces") nouvelle.pieces = arrondi(nouvelle.pieces + q); else nouvelle.monnaies[form.de] = arrondi(nouvelle.monnaies[form.de] + q);
      texte = `reçoit ${formatPieces(q)} ${labelDe(form.de)}${motif}`;
    } else {
      const r = calculerChange(bourse, q, form.de, form.vers);
      if (!r) return ui.notifications.warn("Pas assez de cette monnaie.");
      nouvelle = r.bourse;
      texte = `change ${formatPieces(q)} ${labelDe(form.de)} contre ${formatPieces(r.obtenu)} ${labelDe(form.vers)}${r.reliquat ? ` (+ ${formatPieces(r.reliquat)} pièce(s) de huit de reliquat)` : ""}`;
    }
  }
  await actor.update({ [path]: nouvelle });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pn2-card"><p><i class="fa-solid fa-coins"></i> <strong>${actor.name}</strong> ${texte}.</p><p class="hint">Bourse : ${formatPieces(totalBourse(nouvelle))} pièces de huit au total.</p></div>`
  });
}

/**
 * Assistant de création : peuple et pays d'origine, origine sociale,
 * événements de la jeunesse et religion (La Révolte, étapes 3 et 4).
 *
 * Références de compétences (champ texte, séparées par « ; ») :
 *   - clé de compétence : « navigation », « escrime »…
 *   - groupe:spécialité : « art:Instrument de musique », « armesJet:Javelot »
 *   - groupe seul ou « groupe: » : spécialité au choix du joueur (« art: », « langues: »)
 */
import { PN2 } from "../config.mjs";
import { findSpec } from "../rolls/dice.mjs";

const SYS = PN2.id;
export const ETAPES = {
  peuple: "Peuple et pays d'origine",
  origine: "Origine sociale",
  jeunesse: "Événement de la jeunesse",
  religion: "Religion"
};
const CHAMP_INFO = { peuple: "peuple", origine: "origines", jeunesse: "jeunesse", religion: "religion" };

/** Décode une référence de compétence. */
export function parseRef(ref) {
  ref = String(ref ?? "").trim();
  if (!ref) return null;
  const [k, ...rest] = ref.split(":");
  const nom = rest.join(":").trim();
  if (PN2.specGroups[k]) {
    // « artisanat:Voilerie » correspond à une compétence fixe de la fiche
    const fixe = Object.entries(PN2.skills).find(([sk, d]) => d.group && normal(d.group) === normal(PN2.specGroups[k].label) && normal(d.label) === normal(nom));
    if (fixe) return { type: "skill", key: fixe[0], label: PN2.skills[fixe[0]].label };
    const fixeSpe = k === "connSpe" ? Object.entries(PN2.skills).find(([sk, d]) => d.group === "Connaissance spécialisée" && normal(d.label) === normal(nom)) : null;
    if (fixeSpe) return { type: "skill", key: fixeSpe[0], label: PN2.skills[fixeSpe[0]].label };
    return { type: "spec", group: k, nom, auChoix: !nom, label: `${PN2.specGroups[k].label}${nom ? ` (${nom})` : " (au choix)"}` };
  }
  if (PN2.skills[k]) return { type: "skill", key: k, label: PN2.skills[k].label };
  return null;
}
const normal = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const listeRefs = txt => String(txt ?? "").split(";").map(parseRef).filter(Boolean);

/** Compétences générales d'une catégorie (hors métier). */
function generales(actor, cat, exclusions) {
  const ex = String(exclusions ?? "").split(";").map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const [k, d] of Object.entries(PN2.skills)) {
    if (d.cat !== cat || ex.includes(k)) continue;
    const metier = d.armeFeu ? actor.system.armesFeuMetier : d.metier;
    if (metier) continue;
    out.push({ type: "skill", key: k, label: d.group ? `${d.group} : ${d.label}` : d.label, cat });
  }
  for (const [g, d] of Object.entries(PN2.specGroups)) {
    if (d.cat !== cat || d.metierDefaut || ex.includes(g)) continue;
    out.push({ type: "spec", group: g, nom: "", auChoix: true, label: `${d.label} (au choix)`, cat });
  }
  return out;
}

/** Niveau actuel d'une compétence (ou d'une spécialité). */
function niveauActuel(actor, r, nom) {
  if (r.type === "skill") return actor.system.skills[r.key]?.value ?? 0;
  const id = (nom || r.nom) ? findSpec(actor, r.group, nom || r.nom) : null;
  return id ? actor.system.specs[id].value : 0;
}

/* -------------------------------------------- */
/*  Application et annulation                    */
/* -------------------------------------------- */

/**
 * Fixe une compétence à un niveau minimal et mémorise l'état précédent.
 * @returns {object} informations d'annulation
 */
function preparerCompetence(actor, upd, annul, r, niveau, nom) {
  if (r.type === "skill") {
    const prev = actor.system.skills[r.key].value;
    if (prev >= niveau) return;
    annul.skills[r.key] = prev;
    upd[`system.skills.${r.key}.value`] = niveau;
    return;
  }
  const n = (nom || r.nom || "").trim() || PN2.specGroups[r.group].label;
  const id = findSpec(actor, r.group, n) ?? Object.keys(upd._nouvelles ?? {}).find(i => upd._nouvelles[i].group === r.group && normal(upd._nouvelles[i].name) === normal(n));
  if (id && actor.system.specs[id]) {
    if (actor.system.specs[id].value >= niveau) return;
    annul.specs[id] = actor.system.specs[id].value;
    upd[`system.specs.${id}.value`] = niveau;
  } else if (!id) {
    const nid = foundry.utils.randomID();
    upd._nouvelles ??= {};
    upd._nouvelles[nid] = { group: r.group, name: n, value: niveau, xp: false, metier: PN2.specGroups[r.group].metierDefaut ?? false, carac: "" };
    upd[`system.specs.${nid}`] = upd._nouvelles[nid];
    annul.nouvelles.push(nid);
  }
}

async function appliquer(actor, item, choix) {
  const s = item.system;
  const upd = {};
  const annul = { skills: {}, specs: {}, nouvelles: [], caracs: {}, info: {}, armesFeuMetier: null };
  // Caractéristique
  if (choix.carac) {
    const prev = actor.system.caracs[choix.carac].value;
    const val = Math.min(8, prev + 1);
    if (val !== prev) { annul.caracs[choix.carac] = prev; upd[`system.caracs.${choix.carac}.value`] = val; }
  }
  // Compétences
  for (const c of choix.competences) preparerCompetence(actor, upd, annul, c.ref, c.niveau, c.nom);
  // Armes à feu = compétences de métier pour les Indiens et Africains
  if (s.etape === "peuple" && s.armesFeuMetier && !actor.system.armesFeuMetier) {
    annul.armesFeuMetier = false; upd["system.armesFeuMetier"] = true;
  }
  // Champ texte de la fiche
  const champ = CHAMP_INFO[s.etape];
  annul.info[champ] = actor.system.infos[champ];
  let texte = item.name;
  if (s.etape === "peuple" && choix.pays) texte = `${item.name} (${choix.pays})`;
  const texteItem = s.etape === "jeunesse" ? `${choix.moment === "adolescence" ? "Adolescence" : "Enfance"} ${item.name.toLowerCase()}` : texte;
  if (s.etape === "jeunesse") texte = texteJeunesse(actor, { id: item.id, moment: choix.moment, texte: texteItem });
  upd[`system.infos.${champ}`] = texte;
  delete upd._nouvelles;
  await actor.update(upd);
  await item.update({ [`flags.${SYS}`]: { applique: annul, texte: texteItem, moment: choix.moment ?? null } });
  const lignes = [];
  if (choix.carac) lignes.push(`${PN2.caracs[choix.carac].label} +1`);
  for (const c of choix.competences) lignes.push(`${c.ref.type === "spec" ? `${PN2.specGroups[c.ref.group].label} (${c.nom || c.ref.nom})` : c.ref.label} ${c.niveau}`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pn2-card"><h3>${ETAPES[s.etape]} : ${texte}</h3>${lignes.length ? `<p>${lignes.join(" · ")}</p>` : ""}</div>`
  });
}

/** Texte « Enfance … ; Adolescence … » à partir des historiques de jeunesse. */
function texteJeunesse(actor, nouveau = null, exclu = null) {
  const liste = actor.items.filter(i => i.type === "historique" && i.system.etape === "jeunesse" && i.id !== exclu && i.id !== nouveau?.id && i.flags?.[SYS]?.texte)
    .map(i => ({ moment: i.flags[SYS].moment, texte: i.flags[SYS].texte }));
  if (nouveau) liste.push(nouveau);
  return liste.sort((a, b) => (a.moment === "adolescence") - (b.moment === "adolescence")).map(x => x.texte).join(" ; ");
}

/** Annule les effets d'un historique supprimé. */
export async function annulerHistorique(actor, item) {
  const a = item.flags?.[SYS]?.applique;
  if (!a || !actor) return;
  const upd = {};
  for (const [k, v] of Object.entries(a.caracs ?? {})) upd[`system.caracs.${k}.value`] = v;
  for (const [k, v] of Object.entries(a.skills ?? {})) upd[`system.skills.${k}.value`] = v;
  for (const [id, v] of Object.entries(a.specs ?? {})) if (actor.system.specs?.[id]) upd[`system.specs.${id}.value`] = v;
  for (const id of a.nouvelles ?? []) if (actor.system.specs?.[id]) upd[`system.specs.-=${id}`] = null;
  if (a.armesFeuMetier === false) upd["system.armesFeuMetier"] = false;
  for (const [k, v] of Object.entries(a.info ?? {})) upd[`system.infos.${k}`] = v;
  if (item.system.etape === "jeunesse") upd["system.infos.jeunesse"] = texteJeunesse(actor, null, item.id);
  await actor.update(upd);
}

/* -------------------------------------------- */
/*  Assistant                                   */
/* -------------------------------------------- */

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function ligneChoix(actor, r, idx, prefix, deja) {
  const niv = niveauActuel(actor, r);
  const acquis = r.type === "skill" && niv > 0;
  const champNom = r.type === "spec" && r.auChoix ? `<input type="text" name="${prefix}nom_${idx}" placeholder="Spécialité" class="nom-spe">` : "";
  return `<label class="choix ${acquis || deja ? "acquis" : ""}"><input type="checkbox" name="${prefix}${idx}" ${acquis || deja ? "disabled" : ""} data-cat="${r.cat ?? "metier"}"> ${esc(r.label)}${acquis ? " <em>(déjà acquise)</em>" : ""}${deja ? " <em>(culturelle)</em>" : ""} ${champNom}</label>`;
}

/**
 * Ouvre l'assistant pour un historique qui vient d'être ajouté à un personnage.
 * Retourne false si le joueur annule (l'objet est alors retiré).
 */
export async function assistantHistorique(actor, item) {
  const s = item.system;
  const DialogV2 = foundry.applications.api.DialogV2;
  const etape = s.etape;
  const choix = { carac: null, competences: [], pays: null, moment: null };

  // Un seul peuple, une seule origine, une seule religion ; deux jeunesses (enfance et adolescence)
  const memes = actor.items.filter(i => i.type === "historique" && i.system.etape === etape && i.id !== item.id);
  if (etape !== "jeunesse" && memes.length) {
    const ok = await DialogV2.confirm({ window: { title: ETAPES[etape] }, content: `<p>Remplacer « ${memes[0].name} » par « ${item.name} » ? Les effets du précédent choix seront annulés.</p>` });
    if (!ok) return false;
    for (const m of memes) await m.delete();
  }
  if (etape === "jeunesse") {
    if (memes.length >= 2) { ui.notifications.warn("Le personnage a déjà une enfance et une adolescence. Supprimez-en une d'abord."); return false; }
    if (memes.some(m => m.name === item.name)) { ui.notifications.warn("L'enfance et l'adolescence doivent être différentes."); return false; }
  }

  const niveau = s.niveau || (etape === "origine" ? 2 : 1);
  const culturelles = listeRefs(s.culturelles);
  const metiers = listeRefs(s.metier);
  const cats = Object.entries(s.categories ?? {}).filter(([, n]) => n > 0);
  const caracs = String(s.caracs ?? "").split(/[;,]/).map(x => x.trim()).filter(x => PN2.caracs[x]);

  let html = `<div class="pn2-dialog pn2-assistant"><p class="intro"><strong>${esc(item.name)}</strong> — ${ETAPES[etape]}</p>`;
  if (s.note) html += `<p class="hint">${esc(s.note)}</p>`;
  if (etape === "peuple") {
    const pays = String(s.pays ?? "").split(/[;,]/).map(x => x.trim()).filter(Boolean);
    if (pays.length) html += `<div class="form-group"><label>Pays</label><select name="pays">${pays.map(p => `<option>${esc(p)}</option>`).join("")}</select></div>`;
    if (culturelles.length) {
      html += `<p>Compétences culturelles (niveau 2) :</p><ul>`;
      culturelles.forEach((r, i) => {
        html += `<li>${esc(r.label)}${r.type === "spec" && r.auChoix ? ` <input type="text" name="cult_nom_${i}" placeholder="Spécialité">` : ""}</li>`;
      });
      html += `</ul>`;
    }
  }
  if (etape === "jeunesse") {
    const pris = memes[0]?.flags?.[SYS]?.moment;
    html += `<div class="form-group"><label>Période</label><select name="moment">
      <option value="enfance" ${pris === "enfance" ? "disabled" : (pris ? "" : "selected")}>Enfance</option>
      <option value="adolescence" ${pris === "adolescence" ? "disabled" : (pris === "enfance" ? "selected" : "")}>Adolescence</option></select></div>`;
  }
  if (caracs.length) {
    html += `<div class="form-group"><label>Caractéristique +1 (max. 8)</label><select name="carac">${caracs.map(c => `<option value="${c}">${PN2.caracs[c].label} (${actor.system.caracs[c].value})</option>`).join("")}</select></div>`;
  }
  const nbChoix = s.nbCompetences || 0;
  const listes = [];
  if (nbChoix) {
    html += `<p>Choisissez <strong>${nbChoix}</strong> compétences (niveau ${niveau}). Une compétence déjà acquise ne peut pas être choisie.</p><div class="choix-competences">`;
    for (const [cat, max] of cats) {
      const gen = generales(actor, cat, s.exclusions);
      listes.push({ cat, max, refs: gen });
      html += `<fieldset><legend>${PN2.skillCategories[cat]} (${max} max.)</legend>${gen.map((r, i) => ligneChoix(actor, r, i, `g_${cat}_`)).join("")}</fieldset>`;
    }
    if (metiers.length) {
      html += `<fieldset><legend>Compétences de métier accessibles (hors catégories)</legend>${metiers.map((r, i) => ligneChoix(actor, r, i, "m_")).join("")}</fieldset>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  for (;;) {
    const form = await DialogV2.wait({
      window: { title: `${ETAPES[etape]} : ${item.name}` }, position: { width: 560 }, content: html,
      buttons: [
        { action: "ok", label: "Appliquer", default: true, callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
        { action: "cancel", label: "Annuler" }
      ],
      rejectClose: false
    });
    if (!form || form === "cancel") return false;
    choix.carac = form.carac || null;
    choix.pays = form.pays || null;
    choix.moment = form.moment || (etape === "jeunesse" ? "enfance" : null);
    choix.competences = [];
    const erreurs = [];
    if (etape === "peuple") culturelles.forEach((r, i) => choix.competences.push({ ref: r, niveau: 2, nom: form[`cult_nom_${i}`] }));
    if (etape === "religion" && s.religionNom) choix.competences.push({ ref: { type: "spec", group: "religion", nom: s.religionNom }, niveau: 0, nom: s.religionNom });
    if (nbChoix) {
      for (const l of listes) {
        let n = 0;
        l.refs.forEach((r, i) => {
          if (!form[`g_${l.cat}_${i}`]) return;
          n++;
          if (r.type === "spec" && r.auChoix && !form[`g_${l.cat}_nom_${i}`]) erreurs.push(`Précisez la spécialité pour ${r.label}.`);
          choix.competences.push({ ref: r, niveau, nom: form[`g_${l.cat}_nom_${i}`] });
        });
        if (n > l.max) erreurs.push(`${PN2.skillCategories[l.cat]} : ${l.max} compétence(s) générale(s) au maximum.`);
      }
      metiers.forEach((r, i) => {
        if (!form[`m_${i}`]) return;
        if (r.type === "spec" && r.auChoix && !form[`m_nom_${i}`]) erreurs.push(`Précisez la spécialité pour ${r.label}.`);
        choix.competences.push({ ref: r, niveau, nom: form[`m_nom_${i}`] });
      });
      const total = choix.competences.filter(c => c.niveau === niveau).length;
      if (total !== nbChoix) erreurs.push(`Vous avez choisi ${total} compétence(s) au lieu de ${nbChoix}.`);
    }
    if (erreurs.length) { ui.notifications.warn(erreurs.join(" ")); continue; }
    break;
  }
  // Religion : la compétence n'est créée qu'à 0 si elle n'existe pas
  choix.competences = choix.competences.map(c => (c.niveau === 0 ? { ...c, niveau: 0 } : c));
  await appliquer(actor, item, choix);
  return true;
}

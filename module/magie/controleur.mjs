/**
 * Contrôleur de l'onglet « Magie » de la fiche : état de préparation de l'acte (non enregistré),
 * contexte d'affichage et transmission des demandes au service.
 * Toute la logique de règles reste dans le service et le moteur.
 */
import * as S from "./service.mjs";
import { MagieError, etatCycle, validerRepartition, coutAugmentations } from "./regles.mjs";
import { ACTION, estEnCours, resumeActe } from "./moteur.mjs";

const LIBELLES_STATUT = { "en-cours": "En cours", termine: "Terminé", rejet: "Rejet", annule: "Annulé" };
const LIBELLES_ACTION = { rituel: "Rituel", entree: "Entrée", ascension: "Ascension", detachement: "Détachement", renforcement: "Renforcement" };

export class ControleurMagie {
  constructor() {
    this.prep = {
      mode: "rituel", voieId: "", actesFoi: "", affinite: "", beaute: 0, peches: "",
      puissance: 1, souhait: "", pouvoirId: "", dureeRites: 10, instantanee: false, niveauLimite: "",
      cible: "", activation: "", motif: ""
    };
    this.repartition = { portee: 0, cible: 0, impact: 0, duree: 0 };
  }

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  contexte(actor) {
    const profil = S.profilReligieux(actor);
    const ctx = {
      isGM: game.user.isGM, seuilVisible: S.seuilVisible(), prep: this.prep, requete: S.nouvelleRequete(), profil,
      types: Object.fromEntries(Object.entries(S.cfg().types).map(([k, d]) => [k, d.label])),
      typeLabel: profil.typeDef?.label ?? null
    };
    if (!profil.voies.some(v => v.id === this.prep.voieId)) {
      this.prep.voieId = profil.voies[0]?.id ?? "";
      this.prep.pouvoirId = "";
    }
    const voie = profil.voies.find(v => v.id === this.prep.voieId) ?? null;
    ctx.voie = voie;
    ctx.voiesOptions = Object.fromEntries(profil.voies.map(v => [v.id, v.nom]));
    ctx.pouvoirsOptions = { "": "—", ...Object.fromEntries((voie?.pouvoirs ?? []).map(p => [p.id, `${p.nom} (P${p.puissance})`])) };
    ctx.defauts = { actesFoi: profil.actesFoi, peches: profil.peches, affinite: voie?.affinite ?? 0 };
    ctx.transePossible = !voie?.sansTranse;
    if (!ctx.transePossible) this.prep.mode = "rituel";

    const etat = profil.acte;
    ctx.enCours = estEnCours(etat);
    if (!ctx.enCours && voie) ctx.apercu = S.apercuSeuil(actor, this.prep);
    if (etat) ctx.acte = this.#contexteActe(etat);
    return ctx;
  }

  #contexteActe(etat) {
    const pilote = game.users.get(etat.pilote);
    const c = {
      etat, resume: resumeActe(etat), seq: etat.seq,
      statut: LIBELLES_STATUT[etat.statut] ?? etat.statut,
      estRituel: etat.type === "rituel",
      estPilote: !etat.pilote || etat.pilote === game.user.id,
      piloteNom: pilote?.name ?? "?",
      lancers: etat.lancers.map(l => ({ ...l, action: LIBELLES_ACTION[l.action] ?? l.action, succes: l.resultat === "succes" })).reverse()
    };
    if (etat.type === "rituel" && etat.rituel.resolution?.suffisant) {
      c.repartition = this.#contexteRepartition(etat.rituel.resolution.succesSupplementaires, etat.rituel.repartition);
    }
    if (etat.type === "transe") {
      const t = etat.transe;
      c.transe = t;
      c.action = t.actionEnCours ? { ...t.actionEnCours, libelle: LIBELLES_ACTION[t.actionEnCours.type] } : null;
      const niveauSuivant = t.niveau + 1;
      const candidats = t.pouvoirsConnus.filter(p => p.puissance === (t.actif ? niveauSuivant : 1));
      c.candidats = Object.fromEntries(candidats.map(p => [p.id, `${p.nom} (P${p.puissance})`]));
      c.peutMonter = estEnCours(etat) && !t.actionEnCours && candidats.length > 0 && (!t.actif || niveauSuivant <= t.niveauLimite);
      c.chemin = t.chemin;
      c.activations = t.activations;
      c.activationsOptions = Object.fromEntries(t.activations.filter(a => t.chemin.some(p => p.id === a.pouvoir.id))
        .map(a => [a.n, `#${a.n} ${a.pouvoir.nom} (${a.succes} Succès)`]));
      if (!(this.prep.cible in c.candidats)) this.prep.cible = Object.keys(c.candidats)[0] ?? "";
      if (!(String(this.prep.activation) in c.activationsOptions)) this.prep.activation = Object.keys(c.activationsOptions).at(-1) ?? "";
      const cyc = etatCycle(t.cycle, game.time.worldTime);
      c.cycle = { ...cyc, restantMin: cyc.restant != null ? Math.ceil(cyc.restant / 60) : null };
      const derniere = t.activations.filter(a => a.succes > 0).at(-1);
      if (derniere) c.repartitionActivation = { n: derniere.n, nom: derniere.pouvoir.nom, ...this.#contexteRepartition(derniere.succes, derniere.repartition) };
    }
    return c;
  }

  #contexteRepartition(budget, existante) {
    const v = validerRepartition(this.repartition, budget);
    return {
      budget, cout: v.cout, valide: v.valide, erreurs: v.erreurs, enregistree: existante,
      parametres: Object.entries(S.cfg().parametres).map(([k, d]) => ({
        key: k, label: d.label, n: this.repartition[k] ?? 0, cout: coutAugmentations(Number(this.repartition[k]) || 0)
      }))
    };
  }

  /* -------------------------------------------- */
  /*  Interface                                   */
  /* -------------------------------------------- */

  /**
   * Branche les champs de préparation (non enregistrés sur la fiche).
   * @param {HTMLElement} racine
   * @param {Function} rafraichir  re-rendu de l'onglet
   */
  lier(racine, rafraichir) {
    racine.querySelectorAll("[data-prep]").forEach(input => input.addEventListener("change", ev => {
      ev.stopPropagation();   // pas d'envoi du formulaire de la fiche
      const k = input.dataset.prep;
      this.prep[k] = input.type === "checkbox" ? input.checked : input.value;
      if (k === "voieId") this.prep.pouvoirId = "";
      rafraichir();
    }));
    racine.querySelectorAll("[data-repartition]").forEach(input => input.addEventListener("change", ev => {
      ev.stopPropagation();
      this.repartition[input.dataset.repartition] = Math.max(0, Number(input.value) || 0);
      rafraichir();
    }));
  }

  /** Exécute l'opération demandée par un bouton `data-action="magie" data-op="…"`. */
  async action(actor, target, rafraichir) {
    const op = target.dataset.op;
    const ctx = { requete: target.dataset.requete || undefined, seqAttendue: target.dataset.seq != null ? Number(target.dataset.seq) : undefined };
    target.classList.add("disabled");
    try {
      switch (op) {
        case "commencer": return await S.demarrerActe(actor, this.prep);
        case "solliciter": return await S.solliciter(actor, ctx);
        case "arreter": return await S.arreter(actor, ctx);
        case "actionTranse": {
          const type = target.dataset.type;
          const cible = type === ACTION.RENFORCEMENT ? Number(this.prep.activation) : (type === ACTION.DETACHEMENT ? null : this.prep.cible);
          return await S.commencerAction(actor, type, cible, ctx);
        }
        case "activer": return await S.activerPouvoir(actor, target.dataset.pouvoir, ctx);
        case "repartir": {
          const activation = target.dataset.activation ? Number(target.dataset.activation) : null;
          return await S.repartir(actor, this.repartition, { activation, ...ctx });
        }
        case "interrompre":
          return await S.interrompre(actor, { motif: this.prep.motif, terminer: target.dataset.terminer === "true" }, ctx);
        case "annuler": return await S.annuler(actor, ctx);
        case "reprendre": return await S.reprendre(actor, ctx);
        case "colere": return await S.modifierColere(actor, target.dataset.groupe, Number(target.dataset.delta), { motif: "fiche" });
        case "recuperer": {
          const n = await S.recupererColere(actor);
          return ui.notifications.info(`${actor.name} : ${n} point(s) de Colère récupéré(s).`);
        }
        case "creerObjet": return await this.#creerObjet(actor, target.dataset.type);
        case "editerObjet": return actor.items.get(target.dataset.id)?.sheet.render(true);
        case "supprimerObjet": return await this.#supprimerObjet(actor, target.dataset.id);
        case "compendium": return game.packs.get(`${game.system.id}.voies`)?.render(true);
      }
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message);
      else { console.error(err); ui.notifications.error(`Pavillon Noir 2 : ${err.message}`); }
    } finally {
      rafraichir();
    }
  }

  async #creerObjet(actor, type) {
    const voie = actor.items.get(this.prep.voieId);
    const data = type === "voie"
      ? { name: "Nouvelle Voie", type, system: { religion: actor.system.magie.religionNom } }
      : { name: "Nouveau Pouvoir", type, system: { voie: voie?.system.cleEffective ?? "", puissance: 1 } };
    const [doc] = await actor.createEmbeddedDocuments("Item", [data]);
    doc?.sheet.render(true);
  }

  async #supprimerObjet(actor, id) {
    const item = actor.items.get(id);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Supprimer" }, content: `<p>Supprimer « ${foundry.utils.escapeHTML(item.name)} » ?</p>`
    });
    if (ok) await item.delete();
  }
}

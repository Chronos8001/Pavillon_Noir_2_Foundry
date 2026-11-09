/**
 * Contrôleur des interfaces de magie (onglet de la fiche, fenêtres de Rituel et de Transe).
 * Il garde l'état de saisie non enregistré (préparation, répartition), construit le contexte
 * d'affichage et transmet les demandes au service. Aucune règle n'est codée ici.
 */
import * as S from "./service.mjs";
import { MagieError, etatCycle, validerRepartition, coutAugmentations } from "./regles.mjs";
import { ACTION, estEnCours, resumeActe, vueJoueur } from "./moteur.mjs";

const SYS = "pavillon-noir-2";
const LIBELLES_STATUT = { "en-cours": "En cours", termine: "Terminé", rejet: "Rejet", annule: "Annulé" };
const LIBELLES_ACTION = { rituel: "Rituel", entree: "Entrée en Transe", ascension: "Ascension", detachement: "Détachement", renforcement: "Renforcement" };
const LIBELLES_TRANSE = { chemin: "Dans le Chemin", accessible: "Accessible", compulsion: "Compulsion à assouvir" };

export class ControleurMagie {
  constructor() {
    this.prep = {
      mode: "rituel", voieId: "", pouvoirId: "", souhait: "", rites: "",
      actesFoi: "", affinite: "", beaute: 0, peches: "", puissance: 1, puissanceSecrete: false,
      dureeRites: 10, instantanee: false, niveauLimite: "",
      cible: "", activation: "", motif: "", note: ""
    };
    this.repartition = { portee: 0, cible: 0, impact: 0, duree: 0 };
    this.occupe = false;
  }

  /* -------------------------------------------- */
  /*  Onglet de la fiche                          */
  /* -------------------------------------------- */

  contexte(actor) {
    const profil = S.profilReligieux(actor);
    const isGM = game.user.isGM;
    const demande = profil.demande;
    // Le MJ qui examine une demande voit l'aperçu calculé sur les choix du joueur
    if (isGM && demande?.statut === "attente") {
      for (const k of ["mode", "voieId", "pouvoirId", "souhait", "rites", "dureeRites", "instantanee"]) this.prep[k] = demande[k] ?? this.prep[k];
    }
    if (!profil.voies.some(v => v.id === this.prep.voieId)) {
      this.prep.voieId = profil.voies[0]?.id ?? "";
      this.prep.pouvoirId = "";
    }
    const voie = profil.voies.find(v => v.id === this.prep.voieId) ?? null;
    const transePossible = !!voie && !voie.sansTranse;
    if (!transePossible) this.prep.mode = "rituel";
    const apercu = voie ? S.apercuSeuil(actor, this.prep) : null;
    const seuilVisible = S.seuilVisible();
    const statKey = profil.typeDef?.stat ?? null;

    const ctx = {
      isGM, seuilVisible, parametresVisibles: S.parametresVisibles(), occupe: this.occupe,
      prep: this.prep, requete: S.nouvelleRequete(), profil, voie, apercu, transePossible,
      types: Object.fromEntries(Object.entries(S.cfg().types).map(([k, d]) => [k, d.label])),
      statLabel: profil.typeDef?.statLabel ?? "Foi / Connaissance des Mystères",
      valeurVoie: voie && statKey ? voie[statKey] : null,
      voiesOptions: Object.fromEntries(profil.voies.map(v => [v.id, v.nom])),
      pouvoirsOptions: { "": "— Aucun —", ...Object.fromEntries((voie?.pouvoirs ?? []).map(p => [p.id, `${p.nom} (P${p.puissance})`])) },
      defauts: { actesFoi: profil.actesFoi, peches: profil.peches, affinite: voie?.affinite ?? 0 },
      pouvoirs: profil.pouvoirs.map(p => ({ ...p, etatTranseLabel: LIBELLES_TRANSE[p.etatTranse] })),
      validationRequise: S.validationRequise(),
      demande: demande ? { ...demande, voieNom: actor.items.get(demande.voieId)?.name ?? "Voie retirée", pouvoirNom: actor.items.get(demande.pouvoirId)?.name ?? null } : null,
      demandeEnAttente: demande?.statut === "attente",
      demandeRefusee: demande?.statut === "refusee"
    };
    const etat = profil.acte;
    ctx.enCours = estEnCours(etat);
    if (etat) {
      const vue = isGM ? etat : vueJoueur(etat, { seuilVisible });
      ctx.acte = { etat: vue, resume: resumeActe(vue), statut: LIBELLES_STATUT[etat.statut] ?? etat.statut, estRituel: etat.type === "rituel" };
    }
    return ctx;
  }

  /* -------------------------------------------- */
  /*  Fenêtres de Rituel et de Transe             */
  /* -------------------------------------------- */

  contexteActe(actor) {
    const isGM = game.user.isGM;
    const seuilVisible = S.seuilVisible();
    const brut = S.acteCourant(actor);
    if (!brut) return { aucunActe: true };
    const etat = isGM ? brut : vueJoueur(brut, { seuilVisible });
    const pilote = game.users.get(brut.pilote);
    const estPilote = !brut.pilote || brut.pilote === game.user.id;
    const enCours = estEnCours(brut);
    const c = {
      actor, isGM, seuilVisible, occupe: this.occupe, requete: S.nouvelleRequete(), prep: this.prep,
      etat, resume: resumeActe(etat), seq: brut.seq, enCours,
      statut: LIBELLES_STATUT[brut.statut] ?? brut.statut,
      estPilote, peutAgir: enCours && estPilote && actor.isOwner && !this.occupe,
      peutIntervenir: enCours && (isGM || estPilote) && !this.occupe,
      piloteNom: pilote?.name ?? "?",
      lancers: etat.lancers.map(l => ({ ...l, action: LIBELLES_ACTION[l.action] ?? l.action, succes: l.resultat === "succes" })).reverse()
    };
    if (brut.type === "rituel") {
      const r = brut.rituel;
      const res = r.resolution;
      // Les Succès supplémentaires se répartissent quand le budget est connu de l'utilisateur
      const budgetConnu = isGM || !r.puissanceSecrete || !!r.narration;
      if (res?.suffisant && budgetConnu) c.repartition = this.#contexteRepartition(res.succesSupplementaires, r.repartition, null, c);
      c.peutNarrer = isGM && !!res;
      c.narration = r.narration;
    } else {
      this.#contexteTranse(brut, c);
    }
    return c;
  }

  #contexteTranse(brut, c) {
    const t = brut.transe;
    c.transe = c.etat.transe;
    c.action = t.actionEnCours ? { ...t.actionEnCours, libelle: LIBELLES_ACTION[t.actionEnCours.type] } : null;
    const niveauSuivant = t.niveau + 1;
    const candidats = t.pouvoirsConnus.filter(p => p.puissance === (t.actif ? niveauSuivant : 1));
    c.candidats = Object.fromEntries(candidats.map(p => [p.id, `${p.nom} (P${p.puissance})`]));
    const libre = c.peutAgir && !t.actionEnCours;
    c.peutEntrer = libre && !t.actif && candidats.length > 0;
    c.peutMonter = libre && t.actif && candidats.length > 0 && niveauSuivant <= t.niveauLimite;
    c.limiteAtteinte = t.actif && niveauSuivant > t.niveauLimite;
    c.aucunCandidat = libre && candidats.length === 0 && !c.limiteAtteinte;
    c.peutDetacher = libre && t.actif;
    c.detachementFinal = t.actif && t.niveau === 1;
    c.peutActiver = libre && t.actif;
    c.peutSolliciter = c.peutAgir && !!t.actionEnCours;
    c.chemin = t.chemin;
    c.activations = t.activations;
    c.activationsOptions = Object.fromEntries(t.activations.filter(a => t.chemin.some(p => p.id === a.pouvoir.id))
      .map(a => [a.n, `#${a.n} ${a.pouvoir.nom} (${a.succes} Succès)`]));
    c.peutRenforcer = libre && t.actif && Object.keys(c.activationsOptions).length > 0;
    if (!(this.prep.cible in c.candidats)) this.prep.cible = Object.keys(c.candidats)[0] ?? "";
    if (!(String(this.prep.activation) in c.activationsOptions)) this.prep.activation = Object.keys(c.activationsOptions).at(-1) ?? "";
    const cyc = etatCycle(t.cycle, game.time.worldTime);
    c.cycle = { ...cyc, restantMin: cyc.restant != null ? Math.ceil(cyc.restant / 60) : null };
    // Historique des actions de Transe (ascensions, détachements, activations, interruptions)
    c.historique = brut.journal.filter(j => ["action-reussie", "activation", "action-interrompue", "fin"].includes(j.type)).map(j => ({
      libelle: j.type === "activation" ? `Activation : ${j.pouvoir?.nom}`
        : j.type === "action-interrompue" ? `${LIBELLES_ACTION[j.action] ?? j.action} interrompue${j.motif ? ` (${j.motif})` : ""}`
          : j.type === "fin" ? `Fin de la Transe (${j.mode})`
            : `${LIBELLES_ACTION[j.action] ?? j.action}${j.pouvoir ? ` : ${j.pouvoir.nom}` : ""}${j.niveau != null ? ` — niveau ${j.niveau}` : ""}${j.succes != null && j.action === "renforcement" ? ` — ${j.succes} Succès` : ""}`
    })).reverse();
    const derniere = t.activations.filter(a => a.succes > 0).at(-1);
    if (derniere) c.repartitionActivation = { n: derniere.n, nom: derniere.pouvoir.nom, ...this.#contexteRepartition(derniere.succes, derniere.repartition, derniere.n, c) };
    c.rejet = c.etat.transe.rejet;
  }

  #contexteRepartition(budget, existante, activation, c) {
    const v = validerRepartition(this.repartition, budget);
    return {
      budget, cout: v.cout, valide: v.valide && !this.occupe, erreurs: v.erreurs, enregistree: existante,
      activation: activation ?? "", requete: c.requete, seq: c.seq,
      parametres: Object.entries(S.cfg().parametres).map(([k, d]) => ({
        key: k, label: d.label, n: this.repartition[k] ?? 0, cout: coutAugmentations(Number(this.repartition[k]) || 0)
      }))
    };
  }

  /* -------------------------------------------- */
  /*  Saisie et actions                           */
  /* -------------------------------------------- */

  /** Branche les champs non enregistrés (préparation, répartition). */
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

  /**
   * Exécute l'opération d'un bouton `data-action="magie" data-op="…"`.
   * Pendant l'opération, l'interface est verrouillée (boutons désactivés), en plus du verrou du service.
   */
  async action(actor, target, rafraichir) {
    if (this.occupe || target.classList.contains("disabled")) return;
    const op = target.dataset.op;
    const ctx = { requete: target.dataset.requete || undefined, seqAttendue: target.dataset.seq ? Number(target.dataset.seq) : undefined };
    this.occupe = true;
    rafraichir();
    try {
      return await this.#executer(actor, op, target, ctx);
    } catch (err) {
      if (err instanceof MagieError) ui.notifications.warn(err.message);
      else { console.error(err); ui.notifications.error(`Pavillon Noir 2 : ${err.message}`); }
    } finally {
      this.occupe = false;
      rafraichir();
    }
  }

  async #executer(actor, op, target, ctx) {
    switch (op) {
      // Préparation
      case "demander": return S.demanderActe(actor, this.prep);
      case "commencer": return S.demarrerActe(actor, this.prep);
      case "autoriser": return S.demarrerActe(actor, this.prep, { depuisDemande: true });
      case "refuser": return S.refuserDemande(actor, this.prep.motif);
      case "annulerDemande": return S.annulerDemande(actor);
      // Conduite
      case "solliciter": return S.solliciter(actor, ctx);
      case "arreter": return S.arreter(actor, ctx);
      case "actionTranse": {
        const type = target.dataset.type;
        const cible = type === ACTION.RENFORCEMENT ? Number(this.prep.activation) : (type === ACTION.DETACHEMENT ? null : this.prep.cible);
        return S.commencerAction(actor, type, cible, ctx);
      }
      case "activer": return S.activerPouvoir(actor, target.dataset.pouvoir, ctx);
      case "repartir": {
        const activation = target.dataset.activation ? Number(target.dataset.activation) : null;
        return S.repartir(actor, this.repartition, { activation, ...ctx });
      }
      case "narration": return S.validerNarration(actor, { accordee: target.dataset.accordee === "true", note: this.prep.note }, ctx);
      case "interrompre":
        return S.interrompre(actor, { motif: this.prep.motif, terminer: target.dataset.terminer === "true" }, ctx);
      case "annuler": return S.annuler(actor, ctx);
      case "reprendre": return S.reprendre(actor, ctx);
      case "ouvrirActe": return game.pn2.magie.ouvrirActe(actor);
      // Colère
      case "colere": return S.modifierColere(actor, target.dataset.groupe, Number(target.dataset.delta), { motif: "fiche" });
      case "recuperer": {
        const n = await S.recupererColere(actor);
        return ui.notifications.info(`${actor.name} : ${n} point(s) de Colère récupéré(s).`);
      }
      // Religion, Voies, Pouvoirs
      case "bibliotheque": return game.pn2.magie.bibliotheque(actor);
      case "creerObjet": return this.#creerObjet(actor, target.dataset.type);
      case "editerObjet": return actor.items.get(target.dataset.id)?.sheet.render(true);
      case "retirer": return this.#retirer(actor, target.dataset.id);
      case "invoquer": {
        const p = actor.items.get(target.dataset.id);
        const voieId = target.dataset.voie;
        if (!p || !voieId) return null;
        Object.assign(this.prep, { mode: "rituel", voieId, pouvoirId: p.id, puissance: p.system.puissance });
        return null;
      }
    }
    return null;
  }

  async #creerObjet(actor, type) {
    const voie = actor.items.get(this.prep.voieId);
    const data = type === "voie"
      ? { name: "Nouvelle Voie", type, system: { religion: actor.system.magie.religionNom } }
      : { name: "Nouveau Pouvoir", type, system: { voie: voie?.system.cleEffective ?? "", voieUuid: S.uuidSource(voie) ?? voie?.uuid ?? "", puissance: 1 } };
    const [doc] = await actor.createEmbeddedDocuments("Item", [data]);
    doc?.sheet.render(true);
  }

  async #retirer(actor, id) {
    const item = actor.items.get(id);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Retirer du personnage" },
      content: `<p>Retirer « ${foundry.utils.escapeHTML(item.name)} » de ${foundry.utils.escapeHTML(actor.name)} ?</p><p class="hint">Le document d'origine (compendium ou monde) n'est pas supprimé.</p>`
    });
    if (ok) await S.retirerDuPersonnage(actor, id);
  }
}

export { SYS };

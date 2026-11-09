/**
 * Verrou asynchrone par clé : les opérations portant sur la même clé (un acteur)
 * s'exécutent l'une après l'autre, dans l'ordre d'arrivée.
 * Empêche un double clic de lancer deux dés ou d'écrire deux fois la même Colère.
 * Module pur (testable sous Node).
 */
export class VerrouCles {
  #files = new Map();

  /** Indique si une opération est en cours (ou en attente) pour cette clé. */
  occupe(cle) {
    return this.#files.has(cle);
  }

  /**
   * Exécute `fn` dès que les opérations précédentes sur `cle` sont terminées.
   * Une erreur dans une opération ne bloque pas les suivantes.
   */
  executer(cle, fn) {
    const precedente = this.#files.get(cle) ?? Promise.resolve();
    const courante = precedente.catch(() => {}).then(() => fn());
    const garde = courante.catch(() => {});
    this.#files.set(cle, garde);
    garde.then(() => {
      if (this.#files.get(cle) === garde) this.#files.delete(cle);
    });
    return courante;
  }
}

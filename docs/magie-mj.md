# Magie — guide du MJ

Règles officielles (*Entre ciel et terre*) et adaptations maison : voir le tableau en fin de document.

## Mise en place

1. **Clé du coffre** : à la première connexion, une clé est créée. Panneau **Événements divins** (onglet Acteurs) → *Afficher la clé* → conservez-la. Sur un autre navigateur : *Importer la clé*.
2. **Réglages du système** : validation du MJ, Seuil visible, paramètres des Pouvoirs visibles, mode et chance des Aléas, chance de révélation, récupération de la Colère.
3. **Contenu** : le compendium *Magie : religions et Voies* fournit 11 religions et 21 Voies ; le compendium *Magie : Pouvoirs des Voies*, visible du seul MJ, fournit 785 Pouvoirs (toutes les Voies sauf la Cartomancie). Les effets mécaniques (Active Effects) et les Aléas officiels ne sont pas fournis : ajoutez-les vous-même ou importez-les (Bibliothèque → *Compendiums du monde*, puis *Importer*).

4. **Activer la magie par personnage** : le bouton *Magie : activée / désactivée* de l'en-tête de la fiche (visible du seul MJ) affiche ou masque l'onglet Magie de ce personnage. Il est activé par défaut.

## Pendant la partie

| Situation | Où | Action |
|---|---|---|
| Un joueur demande un acte | onglet Magie de sa fiche | Puissance (secrète ou non), Beauté, Auspices → *Autoriser* ou *Refuser* |
| Suivre un acte | panneau Événements divins, fenêtre de l'acte | *Observer* ; Colère, Seuil, Cycle |
| Rituel terminé | fenêtre du Rituel | *Accorder* / *Refuser* l'intervention ; *Appliquer les effets* si le Pouvoir en a |
| Cycle écoulé | alerte dans le chat et le panneau | *Imposer le détachement* si le prêtre ne bouge pas |
| Blessure pendant une ascension | fenêtre de la Transe | *Perte de concentration* |
| Aléa, révélation, Quête | panneau Événements divins | appliquer, différer, ignorer, réinterpréter ; accepter une révélation (Pouvoir existant ou nouveau, compulsion) |
| Rejet | panneau Événements divins | séquelle (nature, gravité, durée, échéance) et pénitences — communiquées ou en brouillon |
| Pénitence accomplie | panneau | changer son état ; lever la séquelle quand elle est « levable » |

## Effets des Pouvoirs

Fiche du Pouvoir → *Effets mécaniques (MJ)* :

- **Application** : *manuel* (narratif), *assisté* (bouton du MJ), *automatique* (dès votre accord en Rituel, dès l'activation en Transe).
- **Effets** : Active Effects Foundry (caractéristiques, compétences…). Ils sont copiés sur les cibles avec la **Durée effective** du Pouvoir (table p. 100, améliorations comprises) et retirés automatiquement à expiration.
- Un **Rejet** annule les effets de l'acte (règle officielle). *Révoquer* les retire à la main.

## Corrections administratives

À distinguer des décisions narratives : elles réparent un état exceptionnel et exigent un **motif**.

- **Clôture administrative** d'un acte bloqué (fenêtre de l'acte) : aucune résolution, la Colère tirée reste acquise.
- **Correction de la Colère** (panneau, valeur absolue).
- **Prendre la main** sur un acte dont le pilote est absent.

Tout est inscrit dans le **journal des interventions** (bouton *Historique*), avec la nature : *décision narrative* ou *correction administrative*.

## Temps du monde

Le MJ actif traite tout quand le temps avance, une seule fois : récupération de la Colère (1 point par heure), expiration des effets, Cycles écoulés. Les grands sauts de temps sont gérés. Une séquelle à échéance est **signalée**, jamais levée sans vous.

## Règles officielles et adaptations

| Élément | Officiel (supplément) | Dans le système |
|---|---|---|
| Tirage | cartes : Lame droite / renversée / Le Mat | d10 : 1-5 Succès, 6-10 Colère |
| Arrêt | impossible après une Lame renversée | identique |
| Rejet en Rituel | continuer jusqu'à une Lame droite | identique (évalué en fin de tirage) |
| Rejet en Transe | sortie immédiate, puis se détacher jusqu'à sortir ; Colères suivantes = séquelles | **maison** : la Transe s'arrête net (à valider) |
| Auspices, Seuil, Faveurs | p. 89-119 | identiques |
| Séquelles | −5c aux Auspices, une pénitence par Lame en trop | −5, une pénitence par point de dépassement |
| Le Mat | 1 carte sur 59 | **maison** : 2 % par sollicitation (deux d10) ; Puissance découverte officielle |
| Aléas | un par acte, première Lame | **maison** : 30 % par acte par défaut (réglable, « officiel » disponible) ; Puissance = suite initiale identique |
| Quête mystique | 1D6 secret | 1D6 tiré en d10 (relance 7-10) |
| Paramètres | table p. 100 | identique |
| Perte de concentration | 2 cartes, seules les renversées comptent | 2 d10, seules les Colères comptent |

Comparaison chiffrée : `docs/simulation-magie.md` (`npm run simulation`).

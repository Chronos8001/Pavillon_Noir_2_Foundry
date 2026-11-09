# Magie — *Entre ciel et terre* (adaptation d10) — documentation technique

Phase 1 : modèles de données, moteur de résolution, onglet « Magie » de la fiche, compendium des Voies.
Le tirage de cartes du supplément est **remplacé** par des lancers successifs de 1d10 :

| d10 | Effet |
|---|---|
| 1 à 5 | +1 Succès sacré |
| 6 à 10 | +1 Colère divine |

## Architecture

```
module/magie/
  config-magie.mjs   configuration (CONFIG.PN2.magie) — pur
  regles.mjs         règles pures : d10, Auspices, Seuil, améliorations, récupération, Cycle — pur
  moteur.mjs         machine à états des actes sacrés (Rituel, Transe) — pur
  verrou.mjs         verrou asynchrone par acteur — pur
  service.mjs        liaison Foundry : dés (Roll), persistance, permissions, chat, temps du monde
  controleur.mjs     onglet « Magie » de la fiche : état de préparation, contexte, actions
templates/actor/personnage/magie.hbs, templates/apps/magie-repartition.hbs
templates/chat/magie-acte.hbs, magie-sollicitation.hbs
tests/magie/*.test.mjs  (npm test)
```

Les modules « purs » n'utilisent aucune globale Foundry : ils sont testés sous Node (`node:test`, sans dépendance).
Le moteur ne lance jamais de dé : il reçoit la valeur du d10. Le service la tire avec `new Roll("1d10")`.

## Données

### Personnage / PNJ — `system.magie` (persistant)

| Champ | Rôle |
|---|---|
| `religion` | religion pratiquée (vide : `system.infos.religion`) |
| `type` | `communion` ou `possession` (clé de `CONFIG.PN2.magie.types`) ; vide = type déduit de la religion |
| `actesFoi`, `peches` | composantes des Auspices |
| `faveursMod` | modificateur temporaire ; **les Faveurs valent la Chance** (Pouvoir − 5, ECT p. 89), donc pas de champ en double |
| `colere.<groupe>` | `{ valeur, reference, recuperationBloquee }` : une Colère par religion / ensemble religieux |

Dérivés : `magie.faveurs`, `magie.religionNom`, `magie.typeDeduit`, `magie.typeEffectif`, `magie.acteEnCours`, `magie.enTranse`.

Type de religion effectif : `magie.type` s'il est saisi, sinon `typeReligion` de l'historique de religion possédé,
sinon `CONFIG.PN2.magie.religions[nom normalisé]` (pour les personnages créés avant l'ajout du champ). Les 11 religions
du compendium « Historiques » portent leur type : communion pour les religions chrétiennes, juive, aztèque, maya et natchez,
possession pour le vaudou, les religions caraïbe et arawak (ECT p. 89 et 93) ; aucun pour l'athéisme.

Aucune migration n'est nécessaire : les acteurs existants reçoivent les valeurs par défaut au chargement.

### Objet `voie` (Voie d'illumination)

`cle` (vide : nom normalisé), `religion`, `groupeColere`, `foi`, `mysteres`, `affinite`, `rites`, `sansTranse`.
La Foi / Connaissance des Mystères est **propre à chaque Voie** (ECT p. 90). Le type de religion choisit laquelle sert au Seuil
(`CONFIG.PN2.magie.types[type].stat`).

Groupe de Colère d'une Voie : `groupeColere`, sinon la religion du personnage, sinon celle de la Voie.
Toutes les Voies d'une même religion partagent donc la même Colère (ECT p. 127).

`sansTranse` : pas de Transe dans la Kabbale, la Cartomancie ni la Voie du Calendrier (ECT p. 120) ; le service refuse alors la Transe.

Compendium « Voies d'illumination » (`packs/voies`, sources `src/packs/voies`) : les 21 Voies du chapitre 5, rangées par religion,
avec un résumé, la page du livre et les particularités (Voies du vaudou limitées à trois, zémi nécessaire, Cartomancie…).
Les Pouvoirs ne sont pas inclus.

### Objet `pouvoir`

`voie` (clé ou nom de la Voie), `puissance` (1-10), `nomNatif`, `compulsion`, `accessible` (compulsion assouvie), `visions`.

### Acte sacré en cours (temporaire)

Stocké dans `flags["pavillon-noir-2"].acte`, **sous forme de chaîne JSON** (remplacement en bloc, sans fusion d'objets).
Champs principaux : `id`, `type`, `statut` (`en-cours`, `termine`, `rejet`, `annule`), `seq`, `pilote`, `voie`, `groupeColere`,
`auspices`, `seuil`, `colereInitiale`, `colereGagnee`, `colereAppliquee`, `succes`, `lancers[]`, `journal[]`, `requetes[]`,
`peutArreter`, `fin`, `rituel` ou `transe`.

Chaque lancer : `n, valeur, resultat, dSucces, dColere, succesApres, colereApres, colereTotaleApres, action, evenements[]`.
`evenements` est réservé aux révélations et Aléas des phases suivantes.

## Formules

- Auspices = Actes de foi + Affinité + Beauté des rites − Péchés (peut être négatif).
- Seuil = valeur de la Voie (Foi ou Connaissance des Mystères) + Faveurs + Auspices. Jamais borné : `seuil.negatif` le signale.
- Rejet : Colère totale (Colère au début de l'acte + Colère gagnée) **strictement supérieure** au Seuil.
- Succès supplémentaires = Succès − Puissance (0 si insuffisant). N augmentations d'un paramètre : N(N+1)/2.

## Règles appliquées par le moteur

- Arrêt volontaire seulement après un Succès sacré (Rituel ; renforcement en Transe).
- Rituel : Rejet évalué à la fin du tirage. Transe : Rejet immédiat après chaque lancer.
- Interruption imposée (`interrompre`) distincte de l'arrêt volontaire : Rituel résolu ; en Transe, action abandonnée (option `terminer`).
- Transe : entrée = première ascension (Pouvoir connu de Puissance 1). Ascension : Pouvoir connu de Puissance niveau + 1,
  niveau ≤ `niveauLimite` (10 par défaut). Détachement : retire le Pouvoir le plus élevé ; niveau 0 → fin de Transe.
- Activation sans sollicitation d'un Pouvoir du Chemin ; renforcement = sollicitations supplémentaires, réparties ensuite.
- Rejet en Transe : `transe.rejet` enregistre niveau, niveau maximal, dépassement, Chemin et données de séquelles.
- Cycle : `max(1 min, durée des Rites)`, 30 min et Beauté nulle en Transe instantanée ; échéance remise à zéro à chaque changement de niveau.
  Aucune automatisation à l'échéance (phase 2).

## Fiabilité des mises à jour

1. **Verrou par acteur** : les opérations d'un même client s'exécutent une par une.
2. **Identifiant de requête** : chaque bouton porte un identifiant ; une requête répétée (double clic) est ignorée, **sans lancer de dé**.
3. **Séquence attendue** : une action préparée sur un état dépassé est refusée (`etat-perime`).
4. **Grand livre de la Colère** : l'acte mémorise la Colère déjà reportée (`colereAppliquee`) ; acte et Colère sont écrits dans une seule
   mise à jour. Rejouer une écriture n'ajoute rien, et une modification faite à part par le MJ est conservée.
5. **Pilote** : seul l'utilisateur qui a commencé l'acte le fait avancer. Le MJ peut toujours « prendre la main » ; un propriétaire aussi si le pilote est déconnecté.
6. **Contrôle en `_preUpdate`** : une écriture d'acte de séquence inférieure ou égale à celle connue est refusée.

Permissions : toute opération exige d'être propriétaire du personnage (et Foundry refuse côté serveur toute modification d'un acteur non possédé).
Retirer de la Colère est réservé au MJ.

## Colère et temps du monde

`recupererColere` : 1 point par heure entière depuis `reference` (fixée à la fin de chaque acte), reste conservé, idempotent,
rien pendant un acte en cours sur ce groupe ni si `recuperationBloquee`. Le hook `updateWorldTime` l'applique (MJ actif uniquement,
réglage « récupération automatique »). Limite : seuls les acteurs du monde sont traités (pas les jetons non liés).

## Chat et visibilité

- Chaque sollicitation : message avec le jet (mode de visibilité de l'utilisateur), sans Seuil.
- Début d'acte : détails (Auspices, Seuil) chuchotés au MJ.
- Fin d'acte : bilan chuchoté au MJ et aux propriétaires ; détails chiffrés au MJ seulement, sauf réglage « Seuil visible ».

## API (console ou macro)

```js
game.pn2.magie.ouvrir(actor)                 // ouvre la fiche sur l'onglet « Magie »
game.pn2.magie.profilReligieux(actor)
game.pn2.magie.ajouterColere(actor, "catholique", 2)
game.pn2.magie.reduireColere(actor, "catholique", 1)   // MJ
game.pn2.magie.recupererColere(actor)
game.pn2.magie.simulerDistribution(1000)     // vérifie les d10 de Foundry
game.pn2.magie.moteur / .regles              // fonctions pures
```

## Tests

`npm test` : d10, Auspices, Seuil par type, améliorations, récupération, Cycle, Rituel (arrêt, insuffisant, suffisant, Rejet en fin de tirage),
Transe (entrée, ascension, détachement, sortie, activation, renforcement, Rejet immédiat, blocage après Rejet), Colère entre deux actes,
doublons et requêtes périmées, verrou avec latence simulée, sérialisation, et simulation statistique (200 000 d10, khi-deux).

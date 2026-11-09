# Magie — *Entre ciel et terre* (adaptation d10) — documentation technique

Phase 1 : modèles de données et moteur de résolution.
Phase 2 : onglet « Magie », fenêtres de Rituel et de Transe, bibliothèque, religions, références entre documents, validation du MJ.
Phase 3 : Aléas, révélations, Quêtes mystiques, Rejets, séquelles, pénitences, Cycles, interruptions, panneau MJ, coffre chiffré.

Le tirage de cartes du supplément est **remplacé** par des lancers successifs de 1d10 :

| d10 | Effet |
|---|---|
| 1 à 5 | +1 Succès sacré |
| 6 à 10 | +1 Colère divine |

## Architecture

```
module/magie/
  config-magie.mjs     configuration (CONFIG.PN2.magie) — pur
  regles.mjs           règles pures : d10, Auspices, Seuil, améliorations, récupération, Cycle — pur
  moteur.mjs           machine à états des actes sacrés (Rituel, Transe), vue joueur — pur
  references.mjs       références UUID entre religions, Voies et Pouvoirs ; préparation des imports — pur
  verrou.mjs           verrou asynchrone par acteur — pur
  service.mjs          liaison Foundry : dés (Roll), persistance, permissions, demandes, chat, import, temps du monde
  controleur.mjs       état de saisie et contexte des interfaces (onglet, fenêtres) ; transmet les demandes au service
  apps-actes.mjs       fenêtres de Rituel et de Transe (ApplicationV2, redimensionnables)
  app-bibliotheque.mjs bibliothèque de magie (ApplicationV2)
  evenements.mjs       Aléas, révélations, Quêtes : tirages internes en d10 — pur
  consequences.mjs     archive des Rejets, séquelles, pénitences, malus d'Auspices — pur
  coffre.mjs           chiffrement AES-GCM des secrets du MJ (WebCrypto) — pur
  service-evenements.mjs examen secret des sollicitations, décisions du MJ, protection des conséquences
  app-evenements.mjs   panneau « Événements divins » (MJ)
templates/actor/personnage/magie.hbs, magie-mj.hbs        onglet de la fiche
templates/apps/magie-rituel.hbs, magie-transe.hbs, magie-bibliotheque.hbs, magie-repartition.hbs
templates/chat/magie-acte.hbs, magie-sollicitation.hbs, magie-evenement.hbs
tests/magie/*.test.mjs  (npm test)
```

Un seul moteur : toutes les interfaces passent par le service, qui appelle le moteur pur. Le moteur ne lance jamais de dé ;
le service tire chaque d10 avec `new Roll("1d10")`.

## Données

### Personnage / PNJ — `system.magie` (persistant)

| Champ | Rôle |
|---|---|
| `religion` | religion en texte libre, quand aucun objet Religion n'est possédé (vide : `system.infos.religion`) |
| `type` | `communion` ou `possession` (clé de `CONFIG.PN2.magie.types`) ; vide = type déduit |
| `actesFoi`, `peches` | composantes des Auspices |
| `faveursMod` | modificateur temporaire ; **les Faveurs valent la Chance** (Pouvoir − 5, ECT p. 89) |
| `colere.<groupe>` | `{ valeur, reference, recuperationBloquee }` : une Colère par religion / ensemble religieux |

La **religion pratiquée** est l'objet Religion possédé (un seul, garde-fou à la création). Dérivés : `magie.religionNom`,
`magie.religionItemId`, `magie.typeDeduit`, `magie.typeEffectif`, `magie.groupeColere`, `magie.faveurs`, `magie.acteEnCours`, `magie.enTranse`.

Type effectif : `magie.type`, sinon type de l'objet Religion, sinon `typeReligion` de l'historique de religion, sinon
`CONFIG.PN2.magie.religions[nom normalisé]` (personnages créés avant ces champs).

Foi / Connaissance des Mystères et Affinité sont stockées sur la **Voie possédée** (donc sur l'Actor) : il en existe une par Voie (ECT p. 90).
La Beauté des rites n'est jamais enregistrée sur la fiche : elle n'existe que dans la préparation et dans l'acte.

Aucune migration n'est nécessaire : tous les nouveaux champs ont une valeur par défaut.

### Objet `religion`

`cle`, `type`, `groupeColere` (divinités partageant leur Colère ; vide = la religion), `voies` (tableau d'UUID de Voies),
`correspondances` (religions de l'historique couvertes, séparées par « ; »).

### Objet `voie`

`cle`, `religion` (libellé), `religionUuid`, `domaine`, `groupeColere`, `foi`, `mysteres`, `affinite`, `rites`, `sansTranse`.
`sansTranse` : pas de Transe dans la Kabbale, la Cartomancie ni la Voie du Calendrier (ECT p. 120) ; le service refuse alors la Transe.

### Objet `pouvoir`

`voieUuid` (référence), `voie` (clé, repli), `puissance` (1-10), `nomNatif`, `compulsion`, `accessible` (compulsion assouvie), `visions`,
`portee`, `cible`, `impact`, `duree` (paramètres de base), `conditions`, `references`.
Les paramètres sont **réservés au MJ** (ECT p. 90) : ils ne sont rendus aux joueurs que si le réglage « paramètres visibles » est activé.

### Références et références cassées

- Une copie possédée garde l'UUID de sa source dans `_stats.compendiumSource`.
- Voie d'un Pouvoir possédé : Voie possédée dont l'UUID ou l'UUID source correspond à `voieUuid`, sinon même clé (`references.voieDuPouvoir`).
- Une référence introuvable est signalée (« Voie introuvable », « Référence introuvable ») et peut être effacée ou retirée depuis la fiche.
- Les fiches de Religion, Voie et Pouvoir acceptent le dépôt d'un document pour créer la référence (Voie → Religion ou Pouvoir, Religion → Voie).

### Acte sacré

Stocké dans `flags["pavillon-noir-2"].acte` (chaîne JSON, remplacement en bloc). Rituel : `souhait`, `rites`, `pouvoir` (avec UUID),
`puissance`, `puissanceSecrete`, `validation`, `resolution`, `repartition`, `narration`. Transe : voir le moteur.
Demande en attente : `flags["pavillon-noir-2"].demande` (chaîne JSON : voie, Pouvoir, souhait, rites, auteur, statut).

## Déroulement d'un acte

1. **Préparation** (onglet Magie) : le joueur choisit l'acte, la Voie, le Pouvoir invoqué, le souhait et les rites accomplis.
2. **Demande** (réglage « validation du MJ », actif par défaut) : le joueur envoie sa demande ; le MJ la voit dans l'onglet,
   fixe la Puissance (éventuellement **secrète**), la Beauté des rites et les composantes des Auspices, puis **autorise** ou **refuse** (motif).
   Le MJ peut aussi commencer un acte directement. Sans validation, le joueur saisit lui-même Puissance et Beauté.
3. **Conduite** : la fenêtre de l'acte s'ouvre automatiquement pour le joueur qui le conduit ; le MJ l'ouvre depuis l'onglet.
   « Lancer 1d10 » appelle le moteur ; « Terminer » n'est actif qu'après un Succès sacré. Pendant l'opération, l'interface est verrouillée.
4. **Résolution** : résultat mécanique, Rejet, Succès supplémentaires et répartition (Portée, Cible, Impact, Durée).
   Le MJ **accorde ou refuse** ensuite l'intervention (note libre) : aucun effet n'est appliqué automatiquement.

Transe : entrée, ascension (Pouvoir connu de la Puissance suivante), activation (sans sollicitation), renforcement (facultatif),
détachement (le dernier fait sortir de Transe), Rejet immédiat qui désactive toutes les actions. Le Cycle et le temps restant
suivent le temps du monde.

## Permissions et visibilité

| Action | Joueur propriétaire | MJ |
|---|---|---|
| Modifier Actes de foi, Péchés, religion libre, type | oui | oui |
| Ajouter de la Colère / en retirer | ajouter | les deux |
| Préparer et demander un acte | oui | — |
| Puissance, Beauté, Auspices, autoriser / refuser | non (sauf validation désactivée) | oui |
| Lancer les d10 d'un acte | le pilote seulement | après « Prendre la main » |
| Interrompre, annuler, prendre la main | le pilote | oui |
| Valider la manifestation (narration) | non | oui |
| Ajouter / retirer religion, Voie, Pouvoir du personnage | oui | oui |
| Importer des données | non | oui |

Le **HTML** rendu pour un joueur ne contient jamais la Puissance secrète, ni (sauf réglage « Seuil visible ») le Seuil, les Auspices,
le dépassement ou les données de séquelles : les interfaces et les cartes de chat joueurs utilisent `moteur.vueJoueur`.
Les cartes complètes sont chuchotées au MJ seul.

**Limite de Foundry** : le serveur envoie à tous les clients les données des documents et tous les messages, chuchotés compris
(la visibilité n'est filtrée qu'à l'affichage). Un joueur qui inspecte les données de son navigateur pourrait donc lire une donnée
réservée au MJ. Le système garantit l'absence d'affichage, pas un secret cryptographique.

## Bibliothèque de magie

Ouverture : bouton de l'onglet Magie, bouton « Bibliothèque de magie » de l'onglet Compendiums, ou `game.pn2.magie.bibliotheque(actor)`.
Elle lit les compendiums d'objets **visibles** par l'utilisateur et les objets du monde qu'il peut consulter (permission Limitée au moins),
filtre les Voies par religion et les Pouvoirs par Voie et Puissance, ouvre les fiches, ajoute au personnage (un Pouvoir ajoute sa Voie si
elle manque) ou retire l'association (le document d'origine n'est pas touché). Les lignes se glissent vers une fiche.

Contenu fourni : compendium « Magie : religions et Voies » — 11 religions et les 21 Voies du chapitre 5 (résumés rédigés pour le système,
pages du livre). **Les Pouvoirs officiels ne sont pas fournis.** Types retenus : ECT p. 89 et 93 ; le Druidisme n'a pas de type
dans le supplément (à fixer par le MJ) ; la sorcellerie païenne utilise la Connaissance des Mystères (type possession retenu, à confirmer).

## Import des données officielles

Bouton « Importer » de la bibliothèque (MJ) ou `game.pn2.magie.importerMagie(donnees, { packId })` : crée les documents dans un
compendium du monde déverrouillé (ou dans les objets du monde) et convertit les liens par clé en UUID. Le lot est validé avant toute création.

```json
{
  "religions": [{ "cle": "vaudou", "nom": "Vaudou", "type": "possession", "groupeColere": "", "description": "", "correspondances": ["Vaudou"] }],
  "voies": [{ "cle": "agwe", "nom": "Voie d'Agwé", "religion": "vaudou", "domaine": "", "description": "", "sansTranse": false }],
  "pouvoirs": [{ "nom": "…", "voie": "agwe", "puissance": 1, "nomNatif": "", "portee": "", "cible": "", "impact": "", "duree": "",
                 "conditions": "", "compulsion": "", "visions": "", "description": "", "references": "", "source": "" }]
}
```

## Formules

- Auspices = Actes de foi + Affinité + Beauté des rites − Péchés (peut être négatif).
- Seuil = valeur de la Voie (Foi ou Connaissance des Mystères) + Faveurs + Auspices. Jamais borné : `seuil.negatif` le signale.
- Rejet : Colère totale (Colère au début de l'acte + Colère gagnée) **strictement supérieure** au Seuil.
- Succès supplémentaires = Succès − Puissance (0 si insuffisant). N augmentations d'un paramètre : N(N+1)/2.

## Fiabilité des mises à jour

1. **Verrou d'interface** : pendant une opération, les boutons sont désactivés.
2. **Verrou par acteur** (service) : les opérations d'un même client s'exécutent une par une.
3. **Identifiant de requête** : une requête répétée (double clic) est ignorée, **sans lancer de dé**.
4. **Séquence attendue** : une action préparée sur un état dépassé est refusée.
5. **Grand livre de la Colère** : acte et Colère écrits dans une seule mise à jour ; rejouer n'ajoute rien.
6. **Pilote** : seul l'utilisateur qui conduit l'acte le fait avancer ; le MJ peut prendre la main.
7. **Contrôle en `_preUpdate`** : une écriture d'acte plus ancienne que celle connue est refusée.

## Colère et temps du monde

1 point par heure entière après la fin de l'acte, jamais pendant un acte, appliqué par le MJ actif quand le temps avance
(réglage « récupération automatique »). Ajouter une Religion à un personnage reporte la Colère notée sous l'ancien nom de religion.
Limite : seuls les acteurs du monde sont traités (pas les jetons non liés).

## Chat

Demande (chuchotée MJ + propriétaires), début d'acte, chaque sollicitation (selon le mode de jet de l'utilisateur, avec les lignes
Entrée en Transe, Ascension, Détachement, Sortie de Transe, Rejet), activation, fin de Rituel / sortie de Transe / Rejet, validation
du MJ. Les bilans existent en version joueur et en version MJ ; il n'y a pas de message pour les changements internes (sélections, saisies).

## API (console ou macro)

```js
game.pn2.magie.ouvrir(actor)              // fiche sur l'onglet « Magie »
game.pn2.magie.ouvrirActe(actor)          // fenêtre du Rituel ou de la Transe
game.pn2.magie.bibliotheque(actor)        // bibliothèque de magie
game.pn2.magie.ajouterAuPersonnage(actor, uuid) / retirerDuPersonnage(actor, itemId)
game.pn2.magie.importerMagie(donnees, { packId })   // MJ
game.pn2.magie.simulerDistribution(1000)  // vérifie les d10 de Foundry
game.pn2.magie.moteur / .regles           // fonctions pures
```

## Tests

`npm test` (Node 20+, sans dépendance) : règles, moteur (Rituel, Transe, Rejet, doublons, requêtes périmées), verrou, statistiques,
sérialisation, compendiums (religions, Voies, références UUID, concordance des types), Puissance secrète, vue joueur, validation
narrative, références cassées et import.

## Phase 3 — événements divins

### Confidentialité réelle des secrets

Foundry envoie à tous les clients toutes les données des documents, les messages (chuchotés compris) et les réglages du monde,
et ne contrôle pas la lecture des compendiums (vérifié dans le code serveur de Foundry 14). Un secret écrit en clair serait donc lisible.

- Les tirages secrets (Aléa, révélation, objectif de Quête) sont faits **sur le client du MJ actif**, avec les dés de Foundry, sans message.
- Leurs résultats sont **chiffrés (AES-GCM 256 bits)** dans `flags["pavillon-noir-2"].coffre`. La clé reste dans le navigateur du MJ
  (réglage local) ; seule son empreinte est publiée (`magieEmpreinteCle`) pour vérifier qu'un autre MJ a la bonne clé.
- Panneau « Événements divins » : afficher, sauvegarder ou importer la clé. **Clé perdue = secrets illisibles** (le jeu continue).
- Aucune carte de chat ne contient de secret : le MJ reçoit une notification locale. Le joueur n'apprend une révélation
  qu'à travers la compulsion que le MJ lui communique, et un Aléa que si le MJ le communique.
- `flags["pavillon-noir-2"].examen` : marqueur public des lancers déjà examinés (tous le sont, il ne révèle rien).

### Examen des sollicitations

Le MJ actif examine chaque acte dès qu'il change (hook `updateActor`) et à sa connexion (reprise après déconnexion) :
lancers non examinés, Quête commencée ou terminée, acte terminé. L'examen est idempotent et **ne modifie jamais l'acte** ni le d10 sacré.

### Aléas

| | Règle |
|---|---|
| Officiel (p. 95, 121) | un Aléa par acte, désigné par la première Lame ; Puissance = 1 + Lames de même sens qui suivent ; Impact selon la table p. 100 |
| Adaptation | sens = premier d10 (Succès : droit, Colère : renversé) ; Puissance = suite initiale de résultats identiques dans l'historique des d10 |
| Déclenchement | réglage `magieAleaMode` : « probabilite » (défaut, maison, `magieAleaProbabilite` = 30 % tiré avec deux d10), « officiel » (chaque acte), « désactivé » |
| Choix de l'Aléa | parmi les objets « Aléa divin » (monde et compendiums) applicables (type d'acte, religion, Voie, sens), au prorata de leur poids, avec deux d10 |

Les 44 Aléas du supplément (Arcanes majeurs droits et renversés) ne sont pas fournis : aucune correspondance officielle d10 → Arcane n'existe.
Sans Aléa défini, l'Aléa garde son sens et sa Puissance, et le MJ l'interprète. Le MJ peut appliquer, différer, ignorer, réinterpréter.

### Révélations (Le Mat)

- Adaptation maison : deux d10 indépendants par sollicitation, déclenchement si le pourcentage ≤ `magieRevelationSeuil` (2 % par défaut :
  2 combinaisons sur 100).
- Puissance (officiel, p. 121) : Rituel = Succès obtenus **avant** la révélation, plafond Foi/Connaissance + 1 ; Transe = Niveau + 1.
- Décision du MJ : accepter (Pouvoir existant de la bonne Voie et Puissance, ou nouveau Pouvoir), différer, refuser. Un Pouvoir accepté est
  ajouté **inaccessible**, avec sa compulsion (p. 141) : il devient utilisable quand la compulsion est assouvie.

### Quête mystique (p. 138)

Action de Transe : le prêtre explore sans changer de niveau ; il peut s'arrêter après un Succès. Le MJ tire en secret l'objectif (1D6 du
supplément, tiré en d10 avec relance de 7 à 10). Réussite si les Succès de la Quête atteignent l'objectif → révélation de Puissance Niveau + 1
soumise au MJ. Le joueur ne connaît ni l'objectif ni l'issue.

### Rejet, séquelles, pénitences (p. 118, 122, 127-128)

- À la fin d'un acte rejeté, le MJ actif archive le Rejet dans `system.magie.rejets` : religion, Voie, type d'acte, Colère, Seuil,
  dépassement, Puissance (Pouvoir invoqué en Rituel, le plus puissant obtenu en Transe), niveaux, Pouvoirs activés annulés, dates.
- Le MJ impose une séquelle (nature, gravité, durée, restrictions, levée, malus d'Auspices) et une pénitence par point de dépassement,
  communiquées tout de suite ou gardées en brouillon chiffré.
- Séquelle active : **−5 aux Auspices** des actes dans la même Voie (ou toutes, au choix du MJ), compté avec les Péchés.
- Pénitences : à accomplir, en cours, accomplie, abandonnée ; prochaine repentance après 3 jours (priorité) ou 7 jours.
  Une séquelle devient « levable » quand toutes ses pénitences sont accomplies ; le MJ la lève.
- `system.magie.rejets`, `sequelles`, `penitences` et le coffre ne sont modifiables que par le MJ (`PN2Actor._preUpdate`).

### Cycle, interruptions et cas particuliers

| Cas | Traitement |
|---|---|
| Cycle écoulé (p. 135) | signalé une fois par niveau quand le temps du monde avance ; aucune action automatique ; le MJ peut **imposer le détachement** |
| Transe instantanée | Cycle de 30 min, Beauté nulle (déjà en place) |
| Perte de concentration pendant une ascension (p. 136) | décision du MJ : l'ascension échoue, 2 d10 de plus dont seules les Colères comptent ; le Rejet reste immédiat |
| Interruption de Rituel ou de Transe | réservée au MJ ; la Colère déjà tirée est conservée |
| Fermeture de Foundry, déconnexion | l'acte est enregistré ; le joueur reprend ; les sollicitations non examinées le sont à la reconnexion du MJ |
| Changement de propriétaire | un nouveau propriétaire peut prendre la main si le pilote n'est plus propriétaire ou est déconnecté |

### Règle officielle non appliquée (à valider)

Après un Rejet, le supplément (p. 127) fait **continuer** le tirage (Rituel : jusqu'à un Succès ; Transe : se détacher jusqu'à sortir)
et compte les Colères tirées depuis le Rejet pour la durée des séquelles. Le système conserve la règle validée en phase 1 : le Rejet
arrête l'acte. Le nombre de pénitences est donc le dépassement du Seuil à cet instant.

## Phase 4 — intégration et stabilisation

Guides : [joueur](magie-joueur.md), [MJ](magie-mj.md). Probabilités : [simulation](simulation-magie.md) (`npm run simulation`).

### Nouveaux modules

```
module/magie/parametres.mjs     tables Portée / Cible / Impact / Durée (p. 100), améliorations, durées en secondes — pur
module/magie/journal.mjs        historique des actes, journal des interventions du MJ — pur
module/magie/service-effets.mjs effets des Pouvoirs (Active Effects natifs) : application, révocation, expiration
module/magie/migrations.mjs     migrations versionnées (réglage magieMigration)
module/magie/app-historique.mjs fenêtre d'historique
tools/simulation-magie.mjs      simulation des probabilités
tests/aides/foundry-simule.mjs  Foundry simulé pour les tests d'intégration
```

### Paramètres

`CONFIG.PN2.magie.parametres` contient les tables officielles. `parametresEffectifs(pouvoir, repartition)` donne la valeur améliorée
(une catégorie par augmentation), signale les catégories soumises à l'accord du MJ et conserve les valeurs hors table (« 1 cycle »).
L'Impact de base vaut la Puissance. La répartition est prévisualisée, validée par le moteur et inscrite au journal de l'acte.

### Effets des Pouvoirs

`pouvoir.system.application` : `manuel` | `assiste` | `automatique`. Les effets sont des Active Effects de l'objet Pouvoir, copiés sur
les cibles (enregistrées au début de l'acte) avec `duration.seconds` = Durée effective et `flags["pavillon-noir-2"].magie`
(`acteId`, `lanceur`, `expire`). Révocation par acte ; expiration au fil du temps du monde (MJ actif) ; un Rejet révoque les effets de l'acte.

### Historique et interventions

- `system.magie.historique` : une entrée par acte terminé (date, religion, Voie, type, souhait, Pouvoir, Succès, Colère, résultat,
  améliorations, Rejet, validation du MJ). Mise à jour idempotente (la validation et la répartition, faites après la fin, y sont reportées).
  Aucune Puissance secrète tant que le MJ ne l'a pas révélée. 200 entrées au plus.
- `system.magie.interventions` : décisions narratives et corrections administratives du MJ (motif obligatoire pour ces dernières).
- Ces champs, comme les conséquences et le coffre, ne sont modifiables que par le MJ.

### Corrections administratives

`clotureAdministrative(actor, motif)` (moteur : `clotureAdministrative`) et `corrigerColere(actor, groupe, valeur, motif)`.

### Import

Le lot accepte `aleas` en plus de `religions`, `voies`, `pouvoirs`. Chaque document reçoit `flags["pavillon-noir-2"].cleImport`
(`type:cle`) : un second import **met à jour** les documents existants au lieu de les dupliquer. Les paramètres hors table produisent des
avertissements (non bloquants). `creerCompendiumsMonde()` crée *Magie : Pouvoirs* et *Magie : Aléas divins*.

### Compatibilité et migrations

- `moteur.normaliserActe` complète à la lecture les actes des phases 1 à 3 (champs manquants), sans rien effacer.
- `migrations.mjs` : exécutées une fois par le MJ actif, dans l'ordre des versions. 0.7.0 : les Pouvoirs possédés sans `voieUuid`
  sont reliés à leur Voie d'après leur clé.
- Les champs de schéma ajoutés reçoivent leur valeur par défaut ; aucune donnée inconnue n'est supprimée.

### Temps du monde

Hook `updateWorldTime` (MJ actif seulement, une fois par changement) : récupération de la Colère, Cycles écoulés, expiration des effets.
Les traitements sont idempotents (référence temporelle avancée, alerte mémorisée par niveau, effets supprimés une fois).
Séquelles : `echeance` facultative, signalée au MJ, jamais levée automatiquement.

### Tests

`npm test` : 162 tests, dont les scénarios d'intégration A à J (`tests/magie/integration.test.mjs`) sur un Foundry simulé.
Ils couvrent le service, le moteur, l'examen secret, les effets et les garde-fous réels ; ils ne remplacent pas une validation dans Foundry.

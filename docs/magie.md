# Magie — *Entre ciel et terre* (adaptation d10) — documentation technique

Phase 1 : modèles de données et moteur de résolution.
Phase 2 : onglet « Magie », fenêtres de Rituel et de Transe, bibliothèque, religions, références entre documents, validation du MJ.

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

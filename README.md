# Pavillon Noir 2 — système pour Foundry VTT

Système **non officiel** pour jouer à *Pavillon Noir* (2e édition, Black Book Éditions) sur Foundry VTT.
Il faut posséder les livres pour jouer : les compendiums ne contiennent que les données de jeu et des résumés des effets.

Compatible Foundry VTT **v13 et v14**.

## Installation

Dans Foundry : *Systèmes de jeu → Installer un système*, puis coller l'URL du manifeste :

```
https://github.com/Chronos8001/Pavillon_Noir_2_Foundry/releases/latest/download/system.json
```

Installation manuelle : télécharger `pavillon-noir-2.zip` depuis la dernière release et l'extraire dans `Data/systems/pavillon-noir-2` (le nom du dossier doit être `pavillon-noir-2`).

## Contenu

### Fiche de personnage (PJ) et de PNJ
- Rose des vents des 9 caractéristiques ; Chance, Initiative, Actions, MDFor/MDAdr, Valeur de métier et les six Valeurs de commandement calculées automatiquement.
- Toutes les compétences (métier •, commandement CC), spécialités libres (Armes blanches, Langues, Connaissances spécialisées…), case d'expérience par la pratique cochée automatiquement.
- Jets en un clic : Efficacité F Facilité, « 1 » = 2 Succès, Échec critique, dés de profane (D12 / D20), Facilité au-delà de 9, malus de blessures, modificateurs des faiblesses, dépense de Gloire (+1D) et d'Infamie (+1).
- Santé par localisation (cases selon la Résistance, cliquables), état de santé général et malus, protection des armures.
- Gloire et Infamie : niveau, qualificatif et points dépensés.
- PNJ : Facilité par catégorie de compétences, comme les archétypes du livre.

### Assistant de création de personnage
- Bouton « Création » sur la fiche : les 9 étapes de *La Révolte* dans une seule fenêtre.
- Caractéristiques (45 points, 3 à 7, Résistance 5 minimum), peuple, origine sociale, enfance et adolescence, profession (94 professions : +1 en caractéristique, 12 points à répartir, niveau 3 max. ; règles optionnelles plusieurs professions ou aucune), avantages et faiblesses, personnalisation (10 + faiblesses − avantages + points restants), religion, armes de départ et pécule.
- La Valeur de métier est renseignée automatiquement ; chaque étape peut être annulée.
- Calcul détaillé des points de personnalisation (10 + faiblesses − avantages + points de profession non dépensés), compteur en direct, alertes sur les prérequis (statut social imposé par l'origine ou la profession, accès à l'Escrime, 5 avantages / 5 faiblesses).
- **Étape d'escrime (L'Art de l'escrime)** : profil du personnage (noble ou roturier, nation, origine, profession), écoles accessibles, accès gratuits ou payants au bon coût (marin, colon, soldat, maître d'armes…), armes de prédilection calculées, niveau d'Escrime reporté sur l'escrime de l'arme choisie, manœuvres d'école et achat des manœuvres avec les Points d'escrime ; les escrimes accessibles s'augmentent à l'étape 7.

### Avantages et faiblesses
- Variantes chiffrées (Gentilhomme / Baron / Comte / Duc, main gauche / droite, Chaloupe → Frégate…) choisies en glissant l'avantage ; coûts libres (Argent, Réputation, Ennemi) avec plafond.
- Effets automatiques, annulés si l'avantage est retiré : Gloire et Infamie, pécule, accès aux escrimes, École de renom (+3 Points d'escrime), qualités d'arme (Arme blanche / à feu de qualité, Lame de Tolède), Fusil de boucanier, arme double.
- Malus des séquelles appliqués aux tests (y compris par groupe : Artisanat, Artillerie, Armes à feu).

### Historique du personnage (création)
- Compendium « Historiques » : 10 peuples et pays d'origine, 10 origines sociales, 11 événements de jeunesse, 94 professions et 11 religions.
- Glissez-les sur la fiche : un assistant applique les règles de création (pays, compétences culturelles au niveau 2, caractéristique +1 au choix, 5 compétences au niveau 2 pour l'origine sociale et au niveau 1 pour l'enfance et l'adolescence, en respectant les maximums par catégorie et les compétences de métier accessibles).
- Retirer un historique annule ses effets.

### Combat et escrime automatisés
- Attaque depuis la fiche (ciblez un jeton) : la cible pare/contre-attaque, esquive ou reste sans défense depuis le chat ; résolution de l'opposition, marge, dégâts, localisation et bouton « Appliquer les dégâts ».
- Tir : portée, bout portant, visée, main gauche, deux armes, **long feu** (L'Art de l'escrime).
- **Escrime avancée (L'Art de l'escrime)** : les Opportunités des dés sont comparées aux manœuvres maîtrisées ; le chat propose les manœuvres réalisables, applique leurs effets (dés, Succès, Facilité, armure, invulnérabilité, annulation, choix de localisation…), compare la puissance des manœuvres adverses (coup fourré), tient compte de l'adéquation à l'arme adverse et des combinaisons de techniques (épée, arme et dague, deux armes, sabre, hache, baïonnette, combat de pont).
- Points d'escrime selon le niveau et la prédilection (une manœuvre de même combinaison ne coûte qu'un point), achat des manœuvres depuis la fiche. Option : escrime de base de *La Révolte* (Opportunités 1, 5, 0).
- **Destreza** : science (2 mouvements de base par Niveau) et stratégie (Niveau mouvements) sur la fiche ; la treta est résolue automatiquement par ordre croissant (Géométrie du combat, Tacto, Afirmarse, Desvio et sa riposte, Manteau offensive et parade, Atajo, Pasos et Localisations protégées, Arrebatar, Estocada avec ses propres dégâts) ; puissance comparée aux manœuvres des bretteurs ; esquive du diestro ; incompatible avec l'épée courte et les autres escrimes ; Sciences, Danse, Philosophie et Religion suivent la progression.
- Expérience d'escrime cochée automatiquement (Niveau de la manœuvre réalisée, et pour l'adversaire qui connaît la même escrime).
- Traits de réputation « Arme et dague » et « Deux armes » : sans eux, -3 automatique ; la destreza n'est plus combinée au combat de pont.
- **Qualités d'armes (L'Art de l'escrime)** : Légèreté, Équilibre, Acier, Trempe, Pointe légère, Prolongement du bras, Brise-lame, Protection de la main, Apparat ; Fiabilité, Platine à silex, Maniabilité, Poudre, Étanchéité, Canon, Facilité de recharge, Pistolet de gaucher ; armes doubles. Leurs bonus s'appliquent seuls (attaque, dégâts, portée, long feu, protection, postures, prise d'avantage).
- Options : postures et prise d'avantage.

### Fiche de navire et équipage
- Choix du **type de navire** (37 gréements d'*À feu et à sang*) et de l'**armement** : la fiche se remplit seule (tonnage, vitesses par allure, manœuvrabilité, équipage, Points de Structure, batteries…).
- Mâture et coque par localisation avec seuils et états, état général de la mâture, voilure, force du vent, encombrement et carénage → vitesse et manœuvrabilité effectives.
- Artillerie : canonnade (Table des Mesures et des Valeurs, taille et orientation de la cible, portée), dégâts et pertes appliqués au navire ciblé, recharge et décompte des Tours de combat naval.
- **Équipage** : glissez des personnages sur les postes de commandement et de gestion ; les six compétences de groupe (Manœuvre, Ruse, Canonnade, Recharge, Combat, Tir) sont calculées automatiquement, avec la santé de l'équipage.

### Monnaie et commerce
- Bourse par monnaie (pièces de huit, doublons, réaux, louis d'or, écus, guinées, florins…) avec le tableau de change de *La Révolte* ; total en pièces de huit.
- Boutons Payer, Recevoir, Changer et Tout convertir : le paiement puise dans la bonne monnaie puis découpe les pièces en quartiers et rend la monnaie en pièces de huit.
- Coffre de l'équipage sur le navire ; cargaisons glissées depuis le compendium, tonnage et valeur calculés selon le cours (pénurie, normal, excès), vente versée au coffre.

### Compendiums
- Historiques : peuples, origines sociales, événements de jeunesse, religions (avec leur type : communion ou possession)
- Avantages et faiblesses (avec malus appliqués automatiquement)
- Équipement : armes, armures, vêtements, instruments, remèdes, artillerie, services et cargaisons (sucre, rhum, tabac, cacao…)
- Manœuvres d'escrime (toutes les techniques de *L'Art de l'escrime* + destreza)
- Magie : religions et Voies d'illumination (*Entre ciel et terre*), classées par religion
- PNJ : archétypes et animaux
- Navires : chaque type dans chacune de ses configurations d'armement

### Magie (*Entre ciel et terre*, adaptation aux d10)
- Le tirage de cartes est remplacé par des d10 : 1 à 5 = Succès sacré, 6 à 10 = Colère divine.
- Onglet « Magie » sur la fiche : religion pratiquée, type, Foi / Connaissance des Mystères, Faveurs, Colère, Seuil de Rejet, Auspices, Voies et Pouvoirs connus.
- Rituels : le joueur prépare (Voie, Pouvoir, souhait, rites), le MJ fixe la Puissance (éventuellement secrète) et les Auspices puis autorise ; fenêtre de Rituel avec lancers d'1d10, résolution, améliorations et validation de l'intervention par le MJ.
- Transes : fenêtre dédiée (entrée, ascension, activation, renforcement, détachement, Rejet, Cycle et temps restant).
- Bibliothèque de magie : religions, Voies et Pouvoirs des compendiums, filtres, ajout et retrait sur le personnage, import de données (MJ).
- Compendium « Magie : religions et Voies » : 11 religions et les 21 Voies du supplément (les Pouvoirs ne sont pas fournis).
- Documentation technique : `docs/magie.md`.

## Développement

Les compendiums sont générés à partir des sources JSON de `src/packs` :

```
npm install
npm run build:packs
npm test        # tests automatisés de la magie (Node 20+)
```

## Mentions

Pavillon Noir est un jeu de Black Book Éditions. Ce système est un projet de fans, sans lien avec l'éditeur.

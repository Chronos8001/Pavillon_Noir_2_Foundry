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

### Combat et escrime automatisés
- Attaque depuis la fiche (ciblez un jeton) : la cible pare/contre-attaque, esquive ou reste sans défense depuis le chat ; résolution de l'opposition, marge, dégâts, localisation et bouton « Appliquer les dégâts ».
- Tir : portée, bout portant, visée, main gauche, deux armes, **long feu** (L'Art de l'escrime).
- **Escrime avancée (L'Art de l'escrime)** : les Opportunités des dés sont comparées aux manœuvres maîtrisées ; le chat propose les manœuvres réalisables, applique leurs effets (dés, Succès, Facilité, armure, invulnérabilité, annulation, choix de localisation…), compare la puissance des manœuvres adverses (coup fourré), tient compte de l'adéquation à l'arme adverse et des combinaisons de techniques (épée, arme et dague, deux armes, sabre, hache, baïonnette, combat de pont).
- Points d'escrime selon le niveau et la prédilection. Option : escrime de base de *La Révolte* (Opportunités 1, 5, 0).
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
- Avantages et faiblesses (avec malus appliqués automatiquement)
- Équipement : armes, armures, vêtements, instruments, remèdes, artillerie, services et cargaisons (sucre, rhum, tabac, cacao…)
- Manœuvres d'escrime (toutes les techniques de *L'Art de l'escrime* + destreza)
- PNJ : archétypes et animaux
- Navires : chaque type dans chacune de ses configurations d'armement

*Entre ciel et terre* n'est pas encore pris en charge.

## Développement

Les compendiums sont générés à partir des sources JSON de `src/packs` :

```
npm install
npm run build:packs
```

## Mentions

Pavillon Noir est un jeu de Black Book Éditions. Ce système est un projet de fans, sans lien avec l'éditeur.

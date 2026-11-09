# Simulation des probabilités — magie d10

Généré par `tools/simulation-magie.mjs` (100 000 tirages par cas, générateur à graine fixe). Ce rapport mesure ; il ne modifie aucune règle.

## 1. Distribution du d10 sacré

Théorie : 50 % de Succès (1 à 5), 50 % de Colère (6 à 10). Simulé : **49,9 %** de Succès. Faces : 1 → 10,0 %, 2 → 10,0 %, 3 → 10,0 %, 4 → 9,9 %, 5 → 10,0 %, 6 → 10,0 %, 7 → 10,0 %, 8 → 10,1 %, 9 → 10,0 %, 10 → 10,0 %.

## 2. Rituel : risque de Rejet selon la Puissance et le Seuil

Stratégie : le prêtre sollicite jusqu'à atteindre la Puissance (arrêt après un Succès). Colère gagnée X ~ binomiale négative (Puissance, 1/2) ; Rejet si Colère initiale + X > Seuil. Valeurs théoriques exactes (Colère initiale 0) :

| Puissance \ Seuil | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 50,0 % | 25,0 % | 12,5 % | 6,3 % | 3,1 % | 1,6 % | 0,8 % | 0,2 % | 0,0 % |
| 2 | 75,0 % | 50,0 % | 31,3 % | 18,8 % | 10,9 % | 6,3 % | 3,5 % | 1,1 % | 0,3 % |
| 3 | 87,5 % | 68,8 % | 50,0 % | 34,4 % | 22,7 % | 14,5 % | 9,0 % | 3,3 % | 1,1 % |
| 4 | 93,8 % | 81,3 % | 65,6 % | 50,0 % | 36,3 % | 25,4 % | 17,2 % | 7,3 % | 2,9 % |
| 5 | 96,9 % | 89,1 % | 77,3 % | 63,7 % | 50,0 % | 37,7 % | 27,4 % | 13,3 % | 5,9 % |
| 6 | 98,4 % | 93,8 % | 85,5 % | 74,6 % | 62,3 % | 50,0 % | 38,7 % | 21,2 % | 10,5 % |
| 8 | 99,6 % | 98,0 % | 94,5 % | 88,7 % | 80,6 % | 70,9 % | 60,5 % | 40,2 % | 24,0 % |
| 10 | 99,9 % | 99,4 % | 98,1 % | 95,4 % | 91,0 % | 84,9 % | 77,3 % | 59,3 % | 41,2 % |

Contrôle par simulation (Seuil 4) :

| Puissance | Théorie | Simulé d10 | Écart |
|---|---|---|---|
| 1 | 3,1 % | 3,1 % | 0,01 pt |
| 2 | 10,9 % | 10,8 % | 0,12 pt |
| 3 | 22,7 % | 22,7 % | 0,00 pt |
| 5 | 50,0 % | 49,8 % | 0,18 pt |
| 8 | 80,6 % | 80,6 % | 0,00 pt |

## 3. Transe : risque de Rejet selon la profondeur

Une Transe jusqu'au niveau L puis la descente à 0 demandent 2L Succès (entrée et ascensions, puis détachements). La Colère ne diminue pas pendant la Transe : le Rejet immédiat survient si la Colère totale dépasse le Seuil. Théorie exacte (Colère initiale 0) :

| Niveau atteint \ Seuil | 2 | 4 | 6 | 8 | 10 |
|---|---|---|---|---|---|
| 1 | 31,3 % | 10,9 % | 3,5 % | 1,1 % | 0,3 % |
| 2 | 65,6 % | 36,3 % | 17,2 % | 7,3 % | 2,9 % |
| 3 | 85,5 % | 62,3 % | 38,7 % | 21,2 % | 10,5 % |
| 4 | 94,5 % | 80,6 % | 60,5 % | 40,2 % | 24,0 % |
| 5 | 98,1 % | 91,0 % | 77,3 % | 59,3 % | 41,2 % |
| 6 | 99,4 % | 96,2 % | 88,1 % | 74,8 % | 58,4 % |
| 8 | 99,9 % | 99,4 % | 97,4 % | 92,4 % | 83,7 % |
| 10 | 100,0 % | 99,9 % | 99,5 % | 98,2 % | 95,1 % |

## 4. Influence de la Colère initiale

La Colère d'un acte précédent (non encore récupérée) réduit d'autant la marge : Rituel de Puissance 3, Seuil 6.

| Colère initiale | Risque de Rejet |
|---|---|
| 0 | 9,0 % |
| 1 | 14,5 % |
| 2 | 22,7 % |
| 3 | 34,4 % |
| 4 | 50,0 % |
| 5 | 68,8 % |

## 5. Fréquence des révélations et des Aléas

- Révélation (réglage 2 %) : théorie 2,0 % par sollicitation, simulé 2,0 %. Sur un Rituel de Puissance P (2P sollicitations en moyenne) : P = 3 → 11,4 %, P = 6 → 21,5 %.
- Aléa (réglage 30 % par acte) : simulé 29,9 %. Mode « officiel » : 100 % des actes.

## 6. Comparaison avec le tirage de cartes officiel

Paquet du supplément (p. 120) : Arcanes majeurs en double (droit / renversé) sauf Le Mat, unique, et les 16 figures des Arcanes mineurs (Épées et Deniers renversées, Coupes et Bâtons droites) : 59 Lames, 29 droites, 29 renversées, 1 Mat. Tirage sans remise ; les Lames renversées de la Colère restent hors du paquet. Le premier tirage « doit être un Arcane majeur » est ignoré ici (il ne concerne que l'Aléa).

| Rituel | Rejet d10 (théorie) | Rejet tarot (simulé) | Le Mat tiré (tarot) | Révélation d10 (2 %) |
|---|---|---|---|---|
| P2, Seuil 4, Colère initiale 0 | 10,9 % | 9,8 % | 6,7 % | 7,8 % |
| P3, Seuil 4, Colère initiale 0 | 22,7 % | 21,2 % | 9,9 % | 11,4 % |
| P3, Seuil 6, Colère initiale 2 | 22,7 % | 18,1 % | 9,9 % | 11,4 % |
| P5, Seuil 6, Colère initiale 0 | 27,4 % | 25,3 % | 16,8 % | 18,3 % |
| P5, Seuil 8, Colère initiale 3 | 37,7 % | 29,6 % | 16,7 % | 18,3 % |
| P8, Seuil 8, Colère initiale 0 | 40,2 % | 38,4 % | 26,7 % | 27,6 % |

Lecture : le tarot tiré sans remise devient légèrement plus favorable à mesure que les Lames renversées sortent du paquet (et quand la Colère initiale en retire) ; le d10 garde 50 % à chaque lancer. Le Mat sort à environ 1,7 % par carte (1/59), la révélation maison à 2 % par sollicitation : ordres de grandeur proches.

## 7. Écarts constatés et propositions (non appliquées)

- Les fréquences simulées du moteur concordent avec la théorie (écarts inférieurs à 0,5 point).
- Le d10 est un peu plus dangereux que le tarot sans remise pour les actes longs ou après une Colère initiale élevée (voir tableau 6). Si cet écart gêne, une option possible serait de baisser la Colère sur 10 au lieu de 6-10 (par exemple 7-10) — **non appliquée**, à décider.
- La révélation à 2 % est légèrement plus fréquente que Le Mat (≈ 1,7 %) ; un réglage à 2 % reste raisonnable (2 combinaisons sur 100 avec deux d10).

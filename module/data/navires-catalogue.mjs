/* Catalogue des navires (caractéristiques de jeu, époque de la piraterie). Généré automatiquement. */
export const NAVIRES = [
 {
  "nom": "Barge ou chaland",
  "greement": "À livarde et carré (2 mâts)",
  "taille": "Goélette",
  "mats": 2,
  "tonnage": 60.0,
  "tonnageUtile": 45.0,
  "tirantEau": "2m à 4m",
  "fonction": "Transport Fluvial",
  "epoque": "Aventuriers, flibuste, piraterie et Royale",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 75.0,
  "calibreMax": 3,
  "longueur": "Immergée 28m, hors tout 37m",
  "vitesses": {
   "pres": 3.0,
   "largue": 7.5,
   "grandLargue": 6.5,
   "ventArriere": 3.5
  },
  "equipageMax": 30,
  "equipageManoeuvre": 5,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "5 matelots",
    "matelots": 5,
    "psMature": 7,
    "psCoque": 6,
    "batteries": []
   },
   {
    "nom": "Commerce & défense",
    "detail": "11 matelots",
    "matelots": 11,
    "psMature": 7,
    "psCoque": 6,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   }
  ]
 },
 {
  "nom": "Barque ou Pinque, ou Polacre",
  "greement": "Voiles latines ou voiles carrées (3 mâts)",
  "taille": "Goélette",
  "mats": 3,
  "tonnage": 150.0,
  "tonnageUtile": 120.0,
  "tirantEau": "3m",
  "fonction": "Transport",
  "epoque": "Aventuriers, flibuste, piraterie et Royale",
  "manoeuvrabilite": 0,
  "avirons": "1 nœud",
  "vitMoyenne": 75.0,
  "calibreMax": 4,
  "longueur": "Immergée 30m, hors tout 35 m",
  "vitesses": {
   "pres": 4.5,
   "largue": 7.5,
   "grandLargue": 6.5,
   "ventArriere": 3.5
  },
  "equipageMax": 60,
  "equipageManoeuvre": 20,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "26 matelots",
    "matelots": 26,
    "psMature": 8,
    "psCoque": 8,
    "batteries": [
     {
      "desc": "2×2 pièces de 4",
      "position": "bordée",
      "vd": 2,
      "recharge": 6
     }
    ]
   }
  ]
 },
 {
  "nom": "Berckois",
  "greement": "Voile au tiers (2 mâts), avirons",
  "taille": "Chaloupe",
  "mats": 2,
  "tonnage": 3.0,
  "tonnageUtile": 2.0,
  "tirantEau": "1,5m",
  "fonction": "Pêche côtière",
  "epoque": "Flibuste (Europe), piraterie (Europe) et Royale (Europe)",
  "manoeuvrabilite": 2,
  "avirons": "1 nœud",
  "vitMoyenne": 75.0,
  "calibreMax": 0.5,
  "longueur": "Immergée 8m, hors tout 16m",
  "vitesses": {
   "pres": 2.5,
   "largue": 6.5,
   "grandLargue": 6.5,
   "ventArriere": 4.5
  },
  "equipageMax": 5,
  "equipageManoeuvre": 2,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "2 matelots",
    "matelots": 2,
    "psMature": 3,
    "psCoque": 2,
    "batteries": []
   }
  ]
 },
 {
  "nom": "Bisquine",
  "greement": "Voiles au tiers (3 mâts)",
  "taille": "Sloop",
  "mats": 3,
  "tonnage": 30.0,
  "tonnageUtile": 25.0,
  "tirantEau": "3m",
  "fonction": "Pêche au chalut, flibuste, pirates",
  "epoque": "Flibuste (Europe), piraterie (rare dans les Indes) et Royale (rare dans les Indes)",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 100.0,
  "calibreMax": 1,
  "longueur": "Immergée 15m, hors tout 28m",
  "vitesses": {
   "pres": 3.5,
   "largue": 9.0,
   "grandLargue": 9.0,
   "ventArriere": 6.0
  },
  "equipageMax": 20,
  "equipageManoeuvre": 7,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Pêche",
    "detail": "7 matelots",
    "matelots": 7,
    "psMature": 5,
    "psCoque": 4,
    "batteries": []
   },
   {
    "nom": "Course",
    "detail": "13 matelots",
    "matelots": 13,
    "psMature": 5,
    "psCoque": 4,
    "batteries": [
     {
      "desc": "2×3 pierriers",
      "position": "bordée",
      "vd": -3,
      "recharge": 3
     },
     {
      "desc": "2 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "2 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": -4,
      "recharge": 2
     }
    ]
   }
  ]
 },
 {
  "nom": "Brick",
  "greement": "Voiles carrées (2 mâts)",
  "taille": "Goélette",
  "mats": 2,
  "tonnage": 200.0,
  "tonnageUtile": 140.0,
  "tirantEau": "5m",
  "fonction": "Transport, flibuste, commerce triangulaire, pirates ou Royale",
  "epoque": "Piraterie et Royale",
  "manoeuvrabilite": 0,
  "avirons": "",
  "vitMoyenne": 100.0,
  "calibreMax": 9,
  "longueur": "Immergée 40m, hors tout 55m",
  "vitesses": {
   "pres": 3.0,
   "largue": 11.0,
   "grandLargue": 12.0,
   "ventArriere": 8.0
  },
  "equipageMax": 150,
  "equipageManoeuvre": 22,
  "gardesMarines": 3,
  "soldats": 35,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "34 matelots",
    "matelots": 34,
    "psMature": 17,
    "psCoque": 15,
    "batteries": [
     {
      "desc": "2×4 pièces de 4",
      "position": "bordée",
      "vd": 5,
      "recharge": 12
     }
    ]
   },
   {
    "nom": "Négrier",
    "detail": "26 matelots",
    "matelots": 26,
    "psMature": 16,
    "psCoque": 15,
    "batteries": [
     {
      "desc": "2 orgues de 20 tubes",
      "position": "bordée",
      "vd": 13,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Aviso",
    "detail": "76 matelots",
    "matelots": 76,
    "psMature": 17,
    "psCoque": 16,
    "batteries": [
     {
      "desc": "2×8 pièces de 6",
      "position": "bordée",
      "vd": 9,
      "recharge": 32
     },
     {
      "desc": "une pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "2×8 pierriers",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "10 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 10
     },
     {
      "desc": "6 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "100 matelots",
    "matelots": 100,
    "psMature": 19,
    "psCoque": 18,
    "batteries": [
     {
      "desc": "2×5 pièces de 6 plus 2×4 pièces de 9",
      "position": "bordée",
      "vd": 11,
      "recharge": 44
     },
     {
      "desc": "une pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "deux pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     }
    ]
   }
  ]
 },
 {
  "nom": "Brigantin",
  "greement": "Voiles carrées et brigantine (2 mâts), avirons",
  "taille": "Sloop",
  "mats": 2,
  "tonnage": 120.0,
  "tonnageUtile": 90.0,
  "tirantEau": "3m",
  "fonction": "Transport, flibuste, pirates",
  "epoque": "Aventuriers, flibuste, piraterie et Royale",
  "manoeuvrabilite": 1,
  "avirons": "3 nœuds",
  "vitMoyenne": 105.0,
  "calibreMax": 6,
  "longueur": "Immergée 20m, hors tout 25m",
  "vitesses": {
   "pres": 3.5,
   "largue": 10.5,
   "grandLargue": 11.5,
   "ventArriere": 7.5
  },
  "equipageMax": 90,
  "equipageManoeuvre": 18,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "24 matelots",
    "matelots": 24,
    "psMature": 11,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Commerce & défense",
    "detail": "48 matelots",
    "matelots": 48,
    "psMature": 8,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×10 pièces de 3",
      "position": "bordée",
      "vd": 7,
      "recharge": 30
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "59 matelots",
    "matelots": 59,
    "psMature": 11,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×7 pièces de 4 et 2×1 pièces de 6",
      "position": "bordée",
      "vd": 8,
      "recharge": 25
     },
     {
      "desc": "une pièce de 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     },
     {
      "desc": "2×6 pierriers",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "8 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "62 matelots",
    "matelots": 62,
    "psMature": 14,
    "psCoque": 13,
    "batteries": [
     {
      "desc": "2×7 pièces de 6",
      "position": "bordée",
      "vd": 9,
      "recharge": 28
     },
     {
      "desc": "une pièce de 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     },
     {
      "desc": "2×3 canons de muraille",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   }
  ]
 },
 {
  "nom": "Catalane",
  "greement": "Voile latine (1 mât)",
  "taille": "Chaloupe",
  "mats": 1,
  "tonnage": 5.0,
  "tonnageUtile": 4.0,
  "tirantEau": "1m",
  "fonction": "Pêche côtière ou flibuste",
  "epoque": "Aventuriers (Méditerranée), flibuste (Méditerranée), piraterie (Europe Méridionale) et Royale (Europe méridionale)",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 75.0,
  "calibreMax": 0.5,
  "longueur": "Immergée 12m, hors tout 12m",
  "vitesses": {
   "pres": 4.0,
   "largue": 7.5,
   "grandLargue": 6.5,
   "ventArriere": 3.5
  },
  "equipageMax": 9,
  "equipageManoeuvre": 2,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Pêche",
    "detail": "2 matelots",
    "matelots": 2,
    "psMature": 3,
    "psCoque": 2,
    "batteries": []
   },
   {
    "nom": "Course",
    "detail": "6 matelots",
    "matelots": 6,
    "psMature": 3,
    "psCoque": 2,
    "batteries": [
     {
      "desc": "2×2 espingoles",
      "position": "bordée",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "2 espingoles (prises sur la bordée)",
      "position": "chasse",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "2 espingoles (prises sur la bordée)",
      "position": "fuite",
      "vd": null,
      "recharge": 2
     }
    ]
   }
  ]
 },
 {
  "nom": "Chaloupe",
  "greement": "Voiles au tiers (2 mâts) ou voile carrée (1 mât), avirons",
  "taille": "Chaloupe",
  "mats": 2,
  "tonnage": 2.0,
  "tonnageUtile": 2.0,
  "tirantEau": "0.5m",
  "fonction": "Pêche à la sardine, embarcation annexe des grands bâtiments",
  "epoque": "Aventuriers, flibuste, piraterie et Royale",
  "manoeuvrabilite": 1,
  "avirons": "2 nœuds",
  "vitMoyenne": 65.0,
  "calibreMax": 0.5,
  "longueur": "Immergée 9m, hors tout 9m",
  "vitesses": {
   "pres": 2.0,
   "largue": 5.5,
   "grandLargue": 5.5,
   "ventArriere": 4.0
  },
  "equipageMax": 15,
  "equipageManoeuvre": 2,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "2 matelots",
    "matelots": 2,
    "psMature": 3,
    "psCoque": 2,
    "batteries": []
   },
   {
    "nom": "Guerre",
    "detail": "8 matelots",
    "matelots": 8,
    "psMature": 4,
    "psCoque": 3,
    "batteries": [
     {
      "desc": "2×3 espingoles",
      "position": "bordée",
      "vd": null,
      "recharge": 3
     },
     {
      "desc": "deux espingoles (prises sur la bordée)",
      "position": "chasse",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "deux",
      "position": "fuite",
      "vd": null,
      "recharge": 2
     }
    ]
   }
  ]
 },
 {
  "nom": "Chasse-marée",
  "greement": "Voiles au tiers (3 mâts)",
  "taille": "Sloop",
  "mats": 3,
  "tonnage": 60.0,
  "tonnageUtile": 40.0,
  "tirantEau": "2,5m",
  "fonction": "Transport, pêche et flibuste",
  "epoque": "Flibuste (Europe), piraterie (Europe) et Royale (Eu-",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 100.0,
  "calibreMax": 4,
  "longueur": "Immergée 17m charge =, hors tout 29m",
  "vitesses": {
   "pres": 3.5,
   "largue": 9.0,
   "grandLargue": 9.0,
   "ventArriere": 6.0
  },
  "equipageMax": 30,
  "equipageManoeuvre": 9,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "9 matelots",
    "matelots": 9,
    "psMature": 5,
    "psCoque": 5,
    "batteries": []
   },
   {
    "nom": "Course",
    "detail": "19 matelots",
    "matelots": 19,
    "psMature": 5,
    "psCoque": 5,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "2×2 espingoles",
      "position": "bordée",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "2 espingoles (prises sur la bordée)",
      "position": "fuite",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "2 espingoles (prises sur la bordée)",
      "position": "chasse",
      "vd": null,
      "recharge": 2
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "23 matelots",
    "matelots": 23,
    "psMature": 6,
    "psCoque": 6,
    "batteries": [
     {
      "desc": "2×3 pièces de 3 et 2×1 pièce de 4",
      "position": "bordée",
      "vd": 4,
      "recharge": 12
     },
     {
      "desc": "1 canon de muraille",
      "position": "chasse",
      "vd": -4,
      "recharge": 2
     }
    ]
   }
  ]
 },
 {
  "nom": "Chebec",
  "greement": "Voiles latines ou carrées (3 mâts)",
  "taille": "Goélette",
  "mats": 3,
  "tonnage": 300.0,
  "tonnageUtile": 250.0,
  "tirantEau": "3,5m",
  "fonction": "Flibuste, frégate maure, puis française dans les trois localisations de la mâtur",
  "epoque": "Aventuriers (Méditerranée, Indes Orientales), flibuste (Méditerranée, Indes Orientales, rare sinon), piraterie (Méditerr",
  "manoeuvrabilite": -1,
  "avirons": "",
  "vitMoyenne": 120.0,
  "calibreMax": 9,
  "longueur": "Immergée 30m 2×3 pièc, hors tout 40m",
  "vitesses": {
   "pres": 6.5,
   "largue": 12.0,
   "grandLargue": 10.0,
   "ventArriere": 6.5
  },
  "equipageMax": 220,
  "equipageManoeuvre": 20,
  "gardesMarines": 3,
  "soldats": 35,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "29 matelots",
    "matelots": 29,
    "psMature": 20,
    "psCoque": 20,
    "batteries": [
     {
      "desc": "2×3 pièces de 4",
      "position": "bordée",
      "vd": 3,
      "recharge": 9
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "97 matelots",
    "matelots": 97,
    "psMature": 20,
    "psCoque": 20,
    "batteries": [
     {
      "desc": "2×3 pièces de 4 et 2×7 pièces de 6",
      "position": "bordée",
      "vd": 10,
      "recharge": 37
     },
     {
      "desc": "1 pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "2×17 pierriers",
      "position": "bordée",
      "vd": 5,
      "recharge": 17
     },
     {
      "desc": "18 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 18
     },
     {
      "desc": "16 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": 5,
      "recharge": 16
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "112 matelots",
    "matelots": 112,
    "psMature": 25,
    "psCoque": 25,
    "batteries": [
     {
      "desc": "2×4 pièces de 9 et 2×8 pièces de 6",
      "position": "bordée",
      "vd": 12,
      "recharge": 56
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2 pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": ". 2×3 canons de muraille",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   },
   {
    "nom": "Guerre lourd",
    "detail": "128 matelots",
    "matelots": 128,
    "psMature": 26,
    "psCoque": 26,
    "batteries": [
     {
      "desc": "2×12 pièces de 9",
      "position": "bordée",
      "vd": 13,
      "recharge": 72
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2 pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": ". 2×3 canons de muraille",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   }
  ]
 },
 {
  "nom": "Corvette, ou « sloop of war »",
  "greement": "Voiles carrées (3 mâts)",
  "taille": "Goélette",
  "mats": 3,
  "tonnage": 375.0,
  "tonnageUtile": 310.0,
  "tirantEau": "3,5m",
  "fonction": "Flibuste, pirates ou Royale",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": -1,
  "avirons": "",
  "vitMoyenne": 110.0,
  "calibreMax": 9,
  "longueur": "Immergée 35m, hors tout 45m",
  "vitesses": {
   "pres": 2.5,
   "largue": 10.0,
   "grandLargue": 11.0,
   "ventArriere": 8.0
  },
  "equipageMax": 150,
  "equipageManoeuvre": 40,
  "gardesMarines": 4,
  "soldats": 35,
  "configurations": [
   {
    "nom": "Guerre",
    "detail": "Vaisseau de rang 6, 104 matelots",
    "matelots": 104,
    "psMature": 18,
    "psCoque": 18,
    "batteries": [
     {
      "desc": "2×10 pièces de 6",
      "position": "bordée",
      "vd": 10,
      "recharge": 40
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2 pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     }
    ]
   }
  ]
 },
 {
  "nom": "Cotre",
  "greement": "Voile aurique et hunier (1 mât)",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 70.0,
  "tonnageUtile": 50.0,
  "tirantEau": "2m",
  "fonction": "Flibuste, pirates et Royale",
  "epoque": "Piraterie et Royale",
  "manoeuvrabilite": 2,
  "avirons": "",
  "vitMoyenne": 105.0,
  "calibreMax": 6,
  "longueur": "Immergée 18m, hors tout 30m",
  "vitesses": {
   "pres": 4.0,
   "largue": 10.5,
   "grandLargue": 9.5,
   "ventArriere": 5.0
  },
  "equipageMax": 60,
  "equipageManoeuvre": 10,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "16 matelots",
    "matelots": 16,
    "psMature": 12,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "46 matelots",
    "matelots": 46,
    "psMature": 12,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×8 pièces de 4",
      "position": "bordée",
      "vd": 8,
      "recharge": 24
     },
     {
      "desc": "un canon de muraille",
      "position": "chasse",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "pouvant aussi tirer en bordée et 2×5 pierriers",
      "position": "bordée",
      "vd": 0,
      "recharge": 5
     },
     {
      "desc": "6 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "46 matelots",
    "matelots": 46,
    "psMature": 15,
    "psCoque": 12,
    "batteries": [
     {
      "desc": "2×8 pièces de 6",
      "position": "bordée",
      "vd": 9,
      "recharge": 32
     },
     {
      "desc": "une pièce de 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     }
    ]
   }
  ]
 },
 {
  "nom": "Deux-ponts trois-mâts barque",
  "greement": "Voiles carrées et brigantine (3 mâts)",
  "taille": "Vaisseau de ligne",
  "mats": 3,
  "tonnage": 755.0,
  "tonnageUtile": 660.0,
  "tirantEau": "6,5m",
  "fonction": "Flibuste, pirates ou Royale",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": -1,
  "avirons": "",
  "vitMoyenne": 85.0,
  "calibreMax": 24,
  "longueur": "Immergée 55m, hors tout 75m",
  "vitesses": {
   "pres": 2.5,
   "largue": 7.5,
   "grandLargue": 8.5,
   "ventArriere": 5.0
  },
  "equipageMax": 550,
  "equipageManoeuvre": 75,
  "gardesMarines": 10,
  "soldats": 80,
  "configurations": [
   {
    "nom": "Course",
    "detail": "251 matelots",
    "matelots": 251,
    "psMature": 80,
    "psCoque": 80,
    "batteries": [
     {
      "desc": "2×8 pièces de 18 et 2×4 pièces de 6",
      "position": "bordée",
      "vd": 15,
      "recharge": 96
     },
     {
      "desc": "2 pièces de 18",
      "position": "chasse",
      "vd": 8,
      "recharge": 20
     },
     {
      "desc": "2 pièces de 18",
      "position": "fuite",
      "vd": 8,
      "recharge": 20
     },
     {
      "desc": "2×10 canons de muraille",
      "position": "bordée",
      "vd": 6,
      "recharge": 20
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 5,
      "recharge": 16
     },
     {
      "desc": "12 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 6,
      "recharge": 24
     }
    ]
   },
   {
    "nom": "Guerre léger",
    "detail": "Vaisseau de rang 4, 351 matelots",
    "matelots": 351,
    "psMature": 100,
    "psCoque": 100,
    "batteries": [
     {
      "desc": "2×11 pièces de 9 et 2×3 pièces de 6",
      "position": "bordée",
      "vd": 18,
      "recharge": 188
     },
     {
      "desc": "2 pièces de 24",
      "position": "chasse",
      "vd": 9,
      "recharge": 24
     },
     {
      "desc": "2 pièces de 12 et 2 pièces de 24",
      "position": "fuite",
      "vd": 11,
      "recharge": 40
     },
     {
      "desc": "2×6 canons de muraille",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   },
   {
    "nom": "Guerre lourd",
    "detail": "Vaisseau de rang 4, 429 matelots",
    "matelots": 429,
    "psMature": 125,
    "psCoque": 125,
    "batteries": [
     {
      "desc": "2×13 pièces de 9 et 2×5 pièces de 6",
      "position": "bordée",
      "vd": 19,
      "recharge": 242
     },
     {
      "desc": "2 pièces de 18 et 2 pièces de 24",
      "position": "chasse",
      "vd": 12,
      "recharge": 44
     },
     {
      "desc": "2 pièces de 18 et 2 pièces de 24",
      "position": "fuite",
      "vd": 12,
      "recharge": 44
     },
     {
      "desc": "2×6 canons de muraille",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   }
  ]
 },
 {
  "nom": "Deux-ponts trois-mâts carré",
  "greement": "Voiles carrées (3 mâts)",
  "taille": "Vaisseau de ligne",
  "mats": 3,
  "tonnage": 1130.0,
  "tonnageUtile": 950.0,
  "tirantEau": "7m",
  "fonction": "Royale",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": -2,
  "avirons": "",
  "vitMoyenne": 85.0,
  "calibreMax": 24,
  "longueur": "Immergée 60m, hors tout 86m",
  "vitesses": {
   "pres": 2.0,
   "largue": 7.5,
   "grandLargue": 8.5,
   "ventArriere": 5.0
  },
  "equipageMax": 650,
  "equipageManoeuvre": 80,
  "gardesMarines": 12,
  "soldats": 100,
  "configurations": [
   {
    "nom": "Guerre",
    "detail": "Vaisseau de rang 3, 488 matelots",
    "matelots": 488,
    "psMature": 150,
    "psCoque": 150,
    "batteries": [
     {
      "desc": "2×13 pièces de 12 et 2×9 pièces de 6",
      "position": "bordée",
      "vd": 20,
      "recharge": 296
     },
     {
      "desc": "2 pièces de 24 et 2 pièces de 18",
      "position": "chasse",
      "vd": 12,
      "recharge": 44
     },
     {
      "desc": "2 pièces de 24 et 2 pièces de 18",
      "position": "fuite",
      "vd": 12,
      "recharge": 44
     },
     {
      "desc": "2×6 canons de muraille",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   }
  ]
 },
 {
  "nom": "Dundee ou Gabare",
  "greement": "Voiles auriques (2 mâts)",
  "taille": "Sloop",
  "mats": 2,
  "tonnage": 55.0,
  "tonnageUtile": 45.0,
  "tirantEau": "2,5m",
  "fonction": "Pêche et transport",
  "epoque": "Piraterie (rare et seulement en Europe pour le Dundee) et Royale",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 85.0,
  "calibreMax": 6,
  "longueur": "Immergée 20m, hors tout 32m",
  "vitesses": {
   "pres": 3.5,
   "largue": 9.5,
   "grandLargue": 7.0,
   "ventArriere": 4.0
  },
  "equipageMax": 30,
  "equipageManoeuvre": 10,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "16 matelots",
    "matelots": 16,
    "psMature": 5,
    "psCoque": 4,
    "batteries": [
     {
      "desc": "2×2 pièces de 4",
      "position": "bordée",
      "vd": 2,
      "recharge": 6
     }
    ]
   }
  ]
 },
 {
  "nom": "Felouque",
  "greement": "Voiles latines (1, 2 ou 3 mâts), avirons",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 45.0,
  "tonnageUtile": 35.0,
  "tirantEau": "1m",
  "fonction": "Transport fluvial et navire de guerre maure",
  "epoque": "Aventuriers (Méditerranée et Arabie), flibuste (Europe et Arabie), piraterie et Royale (rare dans les Indes ailleurs qu’",
  "manoeuvrabilite": 0,
  "avirons": "3 nœuds",
  "vitMoyenne": 100.0,
  "calibreMax": 3,
  "longueur": "Immergée 20m, hors tout 24m",
  "vitesses": {
   "pres": 5.0,
   "largue": 10.0,
   "grandLargue": 8.0,
   "ventArriere": 4.5
  },
  "equipageMax": 35,
  "equipageManoeuvre": 11,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "14 matelots",
    "matelots": 14,
    "psMature": 6,
    "psCoque": 6,
    "batteries": [
     {
      "desc": "2×1 pièces de 3",
      "position": "bordée",
      "vd": -3,
      "recharge": 3
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "23 matelots",
    "matelots": 23,
    "psMature": 6,
    "psCoque": 6,
    "batteries": [
     {
      "desc": "2×1 canon de muraille",
      "position": "bordée",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "2 canon de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "2×4 pierriers",
      "position": "bordée",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": -1,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "24 matelots",
    "matelots": 24,
    "psMature": 7,
    "psCoque": 7,
    "batteries": [
     {
      "desc": "2×3 pièces de 3",
      "position": "bordée",
      "vd": 2,
      "recharge": 9
     },
     {
      "desc": "2×1 canon de muraille",
      "position": "bordée",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "2 canon de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     }
    ]
   }
  ]
 },
 {
  "nom": "Flibot",
  "greement": "Voiles carrées (2 ou 3 mâts)",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 60.0,
  "tonnageUtile": 50.0,
  "tirantEau": "1,5 m",
  "fonction": "Flibuste et transport fluvial",
  "epoque": "Aventuriers (Europe, fin de la période, navire des Provinces Unies exclusivement), flibuste (Europe et Caraïbes), pirate",
  "manoeuvrabilite": 2,
  "avirons": "",
  "vitMoyenne": 80.0,
  "calibreMax": 9,
  "longueur": "Immergée 20m, hors tout 25m",
  "vitesses": {
   "pres": 3.0,
   "largue": 9.0,
   "grandLargue": 10.0,
   "ventArriere": 7.5
  },
  "equipageMax": 70,
  "equipageManoeuvre": 12,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "12 matelots",
    "matelots": 12,
    "psMature": 6,
    "psCoque": 5,
    "batteries": []
   },
   {
    "nom": "Course",
    "detail": "22 matelots",
    "matelots": 22,
    "psMature": 8,
    "psCoque": 7,
    "batteries": [
     {
      "desc": "2×3 pièces de 3",
      "position": "bordée",
      "vd": 2,
      "recharge": 9
     },
     {
      "desc": "1 pierrier",
      "position": "chasse",
      "vd": -7,
      "recharge": 1
     }
    ]
   }
  ]
 },
 {
  "nom": "Flûte",
  "greement": "Voiles carrées (3 mâts)",
  "taille": "Frégate",
  "mats": 3,
  "tonnage": 600.0,
  "tonnageUtile": 450.0,
  "tirantEau": "9m",
  "fonction": "Transport de commerce et pour la Royale",
  "epoque": "Aventuriers (fin de la période, navire des Provinces Unies exclusivement), flibuste (navire des Provinces Unies exclusiv",
  "manoeuvrabilite": -2,
  "avirons": "",
  "vitMoyenne": 80.0,
  "calibreMax": 9,
  "longueur": "Immergée 50m, hors tout 60m",
  "vitesses": {
   "pres": 2.0,
   "largue": 7.0,
   "grandLargue": 7.5,
   "ventArriere": 5.0
  },
  "equipageMax": 200,
  "equipageManoeuvre": 25,
  "gardesMarines": 0,
  "soldats": 20,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "51 matelots",
    "matelots": 51,
    "psMature": 30,
    "psCoque": 30,
    "batteries": [
     {
      "desc": "2×5 pièces de 6 et 2×2 pièces de 4",
      "position": "bordée",
      "vd": 9,
      "recharge": 26
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "142 matelots",
    "matelots": 142,
    "psMature": 40,
    "psCoque": 40,
    "batteries": [
     {
      "desc": "2×6 pièces de 6 et 2×3 pièces de 4",
      "position": "bordée",
      "vd": 14,
      "recharge": 99
     },
     {
      "desc": "1 pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "2 pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     }
    ]
   }
  ]
 },
 {
  "nom": "Frégate trois-mâts barque",
  "greement": "Voiles carrées et brigantine (3 mâts) recharge = 15 hommes), dont 8 peuvent tirer en chasse",
  "taille": "Frégate",
  "mats": 3,
  "tonnage": 420.0,
  "tonnageUtile": 370.0,
  "tirantEau": "4,5m chasse (VD = +5, recharge = 12 homm",
  "fonction": "Flibuste, pirates ou Royale recharge = 12 hommes) et 2×15 pierriers en bordée (V",
  "epoque": "Piraterie (à partir du milieu de la période) et Royale",
  "manoeuvrabilite": 0,
  "avirons": "",
  "vitMoyenne": 105.0,
  "calibreMax": 9,
  "longueur": "Immergée 48m bordée (, hors tout 63m",
  "vitesses": {
   "pres": 3.0,
   "largue": 9.0,
   "grandLargue": 10.0,
   "ventArriere": 6.5
  },
  "equipageMax": 250,
  "equipageManoeuvre": 50,
  "gardesMarines": 6,
  "soldats": 50,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "65 matelots",
    "matelots": 65,
    "psMature": 20,
    "psCoque": 20,
    "batteries": [
     {
      "desc": "2×5 pièces de 4",
      "position": "bordée",
      "vd": 6,
      "recharge": 15
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "139 matelots",
    "matelots": 139,
    "psMature": 25,
    "psCoque": 25,
    "batteries": [
     {
      "desc": "2×10 pièces de 6 et 2×4 pièces de 4",
      "position": "bordée",
      "vd": 12,
      "recharge": 52
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2×15 pierriers",
      "position": "bordée",
      "vd": 4,
      "recharge": 15
     },
     {
      "desc": "8 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "12 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "Vaisseau de rang 6, 162 matelots",
    "matelots": 162,
    "psMature": 30,
    "psCoque": 30,
    "batteries": [
     {
      "desc": "2×4 pièces de 9 et 2×10 pièces de 6",
      "position": "bordée",
      "vd": 13,
      "recharge": 64
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2 pièces de 6 et 2 pièces de 9",
      "position": "fuite",
      "vd": 7,
      "recharge": 20
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   }
  ]
 },
 {
  "nom": "Frégate trois-mâts carré",
  "greement": "Voiles carrées (3 mâts)",
  "taille": "Frégate",
  "mats": 3,
  "tonnage": 594.0,
  "tonnageUtile": 510.0,
  "tirantEau": "5m",
  "fonction": "Flibuste, pirates ou Royale",
  "epoque": "Flibuste (il s’agit alors de navires d’un pont et demi), piraterie (il s’agit alors de navires d’un pont et demi jusqu’e",
  "manoeuvrabilite": -1,
  "avirons": "",
  "vitMoyenne": 105.0,
  "calibreMax": 12,
  "longueur": "Immergée 55m, hors tout 75m",
  "vitesses": {
   "pres": 2.5,
   "largue": 9.0,
   "grandLargue": 10.0,
   "ventArriere": 7.0
  },
  "equipageMax": 350,
  "equipageManoeuvre": 60,
  "gardesMarines": 6,
  "soldats": 50,
  "configurations": [
   {
    "nom": "Course",
    "detail": "202 matelots",
    "matelots": 202,
    "psMature": 40,
    "psCoque": 40,
    "batteries": [
     {
      "desc": "2×20 pièces de 6",
      "position": "bordée",
      "vd": 13,
      "recharge": 80
     },
     {
      "desc": "2 pièces de 9",
      "position": "chasse",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2 pièces de 9",
      "position": "fuite",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     },
     {
      "desc": "2×12 pierriers",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "8 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "12 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "Vaisseau de rang 5, 240 matelots",
    "matelots": 240,
    "psMature": 50,
    "psCoque": 50,
    "batteries": [
     {
      "desc": "2×10 pièces de 12 et 2×10 pièces de 6",
      "position": "bordée",
      "vd": 15,
      "recharge": 120
     },
     {
      "desc": "2 pièces de 12",
      "position": "chasse",
      "vd": 6,
      "recharge": 16
     },
     {
      "desc": "2 pièces de 9 et 2 pièces de 12",
      "position": "fuite",
      "vd": 9,
      "recharge": 28
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   }
  ]
 },
 {
  "nom": "Galéasse",
  "greement": "Voiles au tiers (3 mâts), avirons",
  "taille": "Vaisseau de ligne",
  "mats": 3,
  "tonnage": 500.0,
  "tonnageUtile": 300.0,
  "tirantEau": "8m",
  "fonction": "Royale",
  "epoque": "Aventuriers, flibuste, piraterie (rare)",
  "manoeuvrabilite": -3,
  "avirons": "4 nœuds",
  "vitMoyenne": 100.0,
  "calibreMax": 36,
  "longueur": "Immergée 65m, hors tout 80m",
  "vitesses": {
   "pres": 1.0,
   "largue": 3.5,
   "grandLargue": 3.5,
   "ventArriere": 2.5
  },
  "equipageMax": 600,
  "equipageManoeuvre": 250,
  "gardesMarines": 12,
  "soldats": 100,
  "configurations": [
   {
    "nom": "Guerre",
    "detail": "445 matelots",
    "matelots": 445,
    "psMature": 200,
    "psCoque": 200,
    "batteries": [
     {
      "desc": "2×8 pièces de 36",
      "position": "bordée",
      "vd": 17,
      "recharge": 120
     },
     {
      "desc": "5 pièces de 36",
      "position": "chasse",
      "vd": 15,
      "recharge": 75
     }
    ]
   }
  ]
 },
 {
  "nom": "Galère royale",
  "greement": "Voiles au tiers (2 mâts), avirons",
  "taille": "Frégate",
  "mats": 2,
  "tonnage": 125.0,
  "tonnageUtile": 90.0,
  "tirantEau": "4m",
  "fonction": "Royale",
  "epoque": "Aventuriers, flibuste, piraterie et Royale (rare)",
  "manoeuvrabilite": -2,
  "avirons": "5 nœuds",
  "vitMoyenne": 140.0,
  "calibreMax": 36,
  "longueur": "Immergée 45m, hors tout 60m",
  "vitesses": {
   "pres": 2.0,
   "largue": 4.5,
   "grandLargue": 4.5,
   "ventArriere": 3.0
  },
  "equipageMax": 260,
  "equipageManoeuvre": 150,
  "gardesMarines": 6,
  "soldats": 50,
  "configurations": [
   {
    "nom": "Guerre",
    "detail": "193 matelots",
    "matelots": 193,
    "psMature": 15,
    "psCoque": 15,
    "batteries": [
     {
      "desc": "3 pièces de 4",
      "position": "chasse",
      "vd": 9,
      "recharge": 27
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "8 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 5,
      "recharge": 16
     }
    ]
   }
  ]
 },
 {
  "nom": "Galion",
  "greement": "Voiles carrées (3 mâts)",
  "taille": "Vaisseau de ligne",
  "mats": 3,
  "tonnage": 1500.0,
  "tonnageUtile": 1200.0,
  "tirantEau": "15m",
  "fonction": "Transport lourd",
  "epoque": "Aventuriers, flibuste, piraterie (rares)",
  "manoeuvrabilite": -3,
  "avirons": "",
  "vitMoyenne": 60.0,
  "calibreMax": 42,
  "longueur": "Immergée 60m, hors tout 75m",
  "vitesses": {
   "pres": 1.0,
   "largue": 5.0,
   "grandLargue": 6.0,
   "ventArriere": 4.0
  },
  "equipageMax": 700,
  "equipageManoeuvre": 90,
  "gardesMarines": 6,
  "soldats": 50,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "130 matelots",
    "matelots": 130,
    "psMature": 100,
    "psCoque": 125,
    "batteries": [
     {
      "desc": "2×5 pièces de 12",
      "position": "bordée",
      "vd": 10,
      "recharge": 40
     }
    ]
   },
   {
    "nom": "Protégeant un convoi",
    "detail": "364 matelots",
    "matelots": 364,
    "psMature": 150,
    "psCoque": 150,
    "batteries": [
     {
      "desc": "2×6 pièces de 9 et 2×3 pièces de 6",
      "position": "bordée",
      "vd": 19,
      "recharge": 194
     },
     {
      "desc": "2 pièces de 36",
      "position": "chasse",
      "vd": 11,
      "recharge": 30
     },
     {
      "desc": "2 pièces de 36 plus 2 pièces de 18",
      "position": "fuite",
      "vd": 13,
      "recharge": 50
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "560 matelots",
    "matelots": 560,
    "psMature": 200,
    "psCoque": 200,
    "batteries": [
     {
      "desc": "2×12 pièces de 9 et 2×5 pièces de 6",
      "position": "bordée",
      "vd": 21,
      "recharge": 352
     },
     {
      "desc": "2 pièces de 42",
      "position": "chasse",
      "vd": 12,
      "recharge": 36
     },
     {
      "desc": "2 pièces de 30 et 2 pièces de 18",
      "position": "fuite",
      "vd": 15,
      "recharge": 82
     }
    ]
   }
  ]
 },
 {
  "nom": "Galiote (petite galère)",
  "greement": "Voiles au tiers (1 ou 2 mâts), avirons",
  "taille": "Goélette",
  "mats": 1,
  "tonnage": 90.0,
  "tonnageUtile": 60.0,
  "tirantEau": "3m",
  "fonction": "Royale",
  "epoque": "Aventuriers, flibuste, piraterie et Royale",
  "manoeuvrabilite": -1,
  "avirons": "4 nœuds",
  "vitMoyenne": 120.0,
  "calibreMax": 12,
  "longueur": "Immergée 35m, hors tout 45m",
  "vitesses": {
   "pres": 1.5,
   "largue": 4.0,
   "grandLargue": 4.0,
   "ventArriere": 2.5
  },
  "equipageMax": 150,
  "equipageManoeuvre": 60,
  "gardesMarines": 2,
  "soldats": 20,
  "configurations": [
   {
    "nom": "Guerre",
    "detail": "104 matelots",
    "matelots": 104,
    "psMature": 13,
    "psCoque": 13,
    "batteries": [
     {
      "desc": "1 pièce de 12",
      "position": "chasse",
      "vd": 3,
      "recharge": 8
     }
    ]
   }
  ]
 },
 {
  "nom": "Goélette Balaou",
  "greement": "Voiles auriques et hunier (2 mâts)",
  "taille": "Goélette",
  "mats": 2,
  "tonnage": 60.0,
  "tonnageUtile": 50.0,
  "tirantEau": "2,5m",
  "fonction": "Transport rapide, pirates",
  "epoque": "Piraterie (rare et plutôt en fin de période) et Royale",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 135.0,
  "calibreMax": 4,
  "longueur": "Immergée 20m, hors tout 30m",
  "vitesses": {
   "pres": 5.5,
   "largue": 13.5,
   "grandLargue": 12.0,
   "ventArriere": 6.5
  },
  "equipageMax": 50,
  "equipageManoeuvre": 14,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "14 matelots",
    "matelots": 14,
    "psMature": 7,
    "psCoque": 9,
    "batteries": []
   },
   {
    "nom": "Course",
    "detail": "29 matelots",
    "matelots": 29,
    "psMature": 7,
    "psCoque": 8,
    "batteries": [
     {
      "desc": "2×4 pièces de 3",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "une pièce de 4",
      "position": "chasse",
      "vd": -1,
      "recharge": 3
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "29 matelots",
    "matelots": 29,
    "psMature": 9,
    "psCoque": 11,
    "batteries": [
     {
      "desc": "2×4 pièces de 4",
      "position": "bordée",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "une pièce de 4",
      "position": "chasse",
      "vd": -1,
      "recharge": 3
     }
    ]
   }
  ]
 },
 {
  "nom": "Goélette Franche",
  "greement": "Voiles auriques (2 mâts)",
  "taille": "Goélette",
  "mats": 2,
  "tonnage": 100.0,
  "tonnageUtile": 80.0,
  "tirantEau": "3,5m",
  "fonction": "Transport rapide, pirates et Royale",
  "epoque": "Flibuste (fin de la période), piraterie et Royale",
  "manoeuvrabilite": 2,
  "avirons": "",
  "vitMoyenne": 120.0,
  "calibreMax": 6,
  "longueur": "Immergée 36m, hors tout 57m",
  "vitesses": {
   "pres": 5.5,
   "largue": 12.0,
   "grandLargue": 10.0,
   "ventArriere": 5.5
  },
  "equipageMax": 60,
  "equipageManoeuvre": 12,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "18 matelots",
    "matelots": 18,
    "psMature": 8,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "36 matelots",
    "matelots": 36,
    "psMature": 9,
    "psCoque": 11,
    "batteries": [
     {
      "desc": "2×4 pièces de 4",
      "position": "bordée",
      "vd": 5,
      "recharge": 12
     },
     {
      "desc": "une pièce de 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     },
     {
      "desc": "2×6 pierriers",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "8 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 2,
      "recharge": 8
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "40 matelots",
    "matelots": 40,
    "psMature": 12,
    "psCoque": 14,
    "batteries": [
     {
      "desc": "2×4 pièces de 4 et 2×3 pièces de 6",
      "position": "bordée",
      "vd": 8,
      "recharge": 24
     },
     {
      "desc": "une pièce de 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     }
    ]
   }
  ]
 },
 {
  "nom": "Goélette à Hunier",
  "greement": "Voiles auriques et hunier (2 mâts)",
  "taille": "Goélette",
  "mats": 2,
  "tonnage": 125.0,
  "tonnageUtile": 100.0,
  "tirantEau": "3,5m",
  "fonction": "Transport rapide, flibuste, pirates et Royale",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": 1,
  "avirons": "",
  "vitMoyenne": 120.0,
  "calibreMax": 9,
  "longueur": "Immergée 30m, hors tout 50m",
  "vitesses": {
   "pres": 5.0,
   "largue": 12.0,
   "grandLargue": 10.5,
   "ventArriere": 5.5
  },
  "equipageMax": 120,
  "equipageManoeuvre": 19,
  "gardesMarines": 2,
  "soldats": 20,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "28 matelots",
    "matelots": 28,
    "psMature": 10,
    "psCoque": 12,
    "batteries": [
     {
      "desc": "2×3 pièces de 4",
      "position": "bordée",
      "vd": 3,
      "recharge": 9
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "73 matelots",
    "matelots": 73,
    "psMature": 11,
    "psCoque": 13,
    "batteries": [
     {
      "desc": "2×8 pièces de 6",
      "position": "bordée",
      "vd": 9,
      "recharge": 32
     },
     {
      "desc": "une pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "2×8 pierriers",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "6 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": 0,
      "recharge": 6
     },
     {
      "desc": "10 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 10
     }
    ]
   },
   {
    "nom": "Galiote à bombe",
    "detail": "25 matelots",
    "matelots": 25,
    "psMature": 11,
    "psCoque": 17,
    "batteries": [
     {
      "desc": "2×1 mortiers de 36",
      "position": "bordée",
      "vd": 11,
      "recharge": 3
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "75 matelots",
    "matelots": 75,
    "psMature": 13,
    "psCoque": 15,
    "batteries": [
     {
      "desc": "2×3 pièces de 9 et 2×4 pièces de 6",
      "position": "bordée",
      "vd": 10,
      "recharge": 34
     },
     {
      "desc": "une pièce de 9",
      "position": "chasse",
      "vd": 2,
      "recharge": 6
     },
     {
      "desc": "2×4 canons de muraille",
      "position": "bordée",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "2 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 12
     }
    ]
   }
  ]
 },
 {
  "nom": "Hourque",
  "greement": "Voiles carrées (2 mâts)",
  "taille": "Sloop",
  "mats": 2,
  "tonnage": 60.0,
  "tonnageUtile": 50.0,
  "tirantEau": "2m",
  "fonction": "Transport",
  "epoque": "Aventuriers, flibuste, piraterie et Royale (peu commun)",
  "manoeuvrabilite": 0,
  "avirons": "",
  "vitMoyenne": 70.0,
  "calibreMax": 3,
  "longueur": "Immergée 20m, hors tout 21m",
  "vitesses": {
   "pres": 1.5,
   "largue": 6.0,
   "grandLargue": 6.5,
   "ventArriere": 4.5
  },
  "equipageMax": 30,
  "equipageManoeuvre": 14,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "23 matelots",
    "matelots": 23,
    "psMature": 10,
    "psCoque": 9,
    "batteries": [
     {
      "desc": "2×3 pièces de 3",
      "position": "bordée",
      "vd": 2,
      "recharge": 9
     }
    ]
   }
  ]
 },
 {
  "nom": "Lougre",
  "greement": "Voiles au tiers (3 mâts), avirons",
  "taille": "Sloop",
  "mats": 3,
  "tonnage": 90.0,
  "tonnageUtile": 75.0,
  "tirantEau": "2m",
  "fonction": "Pirates et Royale homme) dont 2 peuvent tirer en chasse (VD = -4, recharge = 2",
  "epoque": "Flibuste (Europe seulement), piraterie (rare dans les In- des) et Royale hommes) et 2×2 espingoles en bordée (recharge =",
  "manoeuvrabilite": 1,
  "avirons": "2 nœuds",
  "vitMoyenne": 100.0,
  "calibreMax": 4,
  "longueur": "Immergée 17m, hors tout 34m",
  "vitesses": {
   "pres": 4.0,
   "largue": 10.0,
   "grandLargue": 10.0,
   "ventArriere": 7.0
  },
  "equipageMax": 50,
  "equipageManoeuvre": 10,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "16 matelots",
    "matelots": 16,
    "psMature": 8,
    "psCoque": 8,
    "batteries": [
     {
      "desc": "2×1 pierrier",
      "position": "bordée",
      "vd": -7,
      "recharge": 1
     },
     {
      "desc": "2 pierrier (prises sur la bordée)",
      "position": "chasse",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "2×2 espingoles",
      "position": "bordée",
      "vd": null,
      "recharge": 2
     },
     {
      "desc": "4 espingoles (prises sur la bordée)",
      "position": "fuite",
      "vd": null,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "35 matelots",
    "matelots": 35,
    "psMature": 8,
    "psCoque": 8,
    "batteries": [
     {
      "desc": "2×5 pièces de 3",
      "position": "bordée",
      "vd": 4,
      "recharge": 15
     },
     {
      "desc": "2×4 pierriers",
      "position": "bordée",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "un canon de muraille",
      "position": "chasse",
      "vd": -4,
      "recharge": 2
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "34 matelots",
    "matelots": 34,
    "psMature": 9,
    "psCoque": 9,
    "batteries": [
     {
      "desc": "2×4 pièces de 4 et 2×3 pièces de 3",
      "position": "bordée",
      "vd": 7,
      "recharge": 21
     },
     {
      "desc": "une pièce de 4",
      "position": "chasse",
      "vd": -1,
      "recharge": 3
     }
    ]
   }
  ]
 },
 {
  "nom": "Marchand",
  "greement": "Voiles carrées et brigantine (3 mâts)",
  "taille": "Frégate",
  "mats": 3,
  "tonnage": 200.0,
  "tonnageUtile": 170.0,
  "tirantEau": "5m",
  "fonction": "Transport",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": -1,
  "avirons": "",
  "vitMoyenne": 75.0,
  "calibreMax": 12,
  "longueur": "Immergée 43m, hors tout 54m",
  "vitesses": {
   "pres": 1.5,
   "largue": 6.5,
   "grandLargue": 7.5,
   "ventArriere": 5.0
  },
  "equipageMax": 170,
  "equipageManoeuvre": 21,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce",
    "detail": "37 matelots",
    "matelots": 37,
    "psMature": 17,
    "psCoque": 17,
    "batteries": [
     {
      "desc": "2×4 pièces de 6",
      "position": "bordée",
      "vd": 6,
      "recharge": 16
     }
    ]
   },
   {
    "nom": "Négrier",
    "detail": "26 matelots",
    "matelots": 26,
    "psMature": 13,
    "psCoque": 14,
    "batteries": [
     {
      "desc": "2 orgues de 40 tubes sur les hunes et une de 20 tubes",
      "position": "bordée",
      "vd": 17,
      "recharge": 8
     }
    ]
   },
   {
    "nom": "Compagnie des Indes Occidentales",
    "detail": "97 matelots",
    "matelots": 97,
    "psMature": 25,
    "psCoque": 25,
    "batteries": [
     {
      "desc": "2×4 pièces de 3",
      "position": "bordée",
      "vd": 13,
      "recharge": 76
     }
    ]
   },
   {
    "nom": "Compagnie des Indes Orientales",
    "detail": "121 matelots",
    "matelots": 121,
    "psMature": 30,
    "psCoque": 30,
    "batteries": [
     {
      "desc": "2×4 pièces de 4",
      "position": "bordée",
      "vd": 14,
      "recharge": 100
     }
    ]
   }
  ]
 },
 {
  "nom": "Petit Prao ou Pirogue",
  "greement": "Assimilé à une voile latine (1 mât), avirons",
  "taille": "Chaloupe",
  "mats": 1,
  "tonnage": 1.0,
  "tonnageUtile": 1.0,
  "tirantEau": "0.5m (petits praos) et entre 20cm et 1m ",
  "fonction": "Pirogue de pêche et de guerre, pirates",
  "epoque": "Toutes périodes (Mers du Sud) pour les petits praos ; toutes les périodes pour les pirogues",
  "manoeuvrabilite": 2,
  "avirons": "",
  "vitMoyenne": 120.0,
  "calibreMax": 0,
  "longueur": "Immergée 10m, hors tout 12m (petits ",
  "vitesses": {
   "pres": 10.0,
   "largue": 18.0,
   "grandLargue": 15.0,
   "ventArriere": 8.5
  },
  "equipageMax": 4,
  "equipageManoeuvre": 1,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Petit prao",
    "detail": "1 matelot",
    "matelots": 1,
    "psMature": 1,
    "psCoque": 1,
    "batteries": []
   },
   {
    "nom": "Pirogue",
    "detail": "2 à 40 pagayeurs",
    "matelots": 2,
    "psMature": 0,
    "psCoque": 2,
    "batteries": []
   }
  ]
 },
 {
  "nom": "Poon de Hollande",
  "greement": "Voile aurique (1 mât), avirons",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 70.0,
  "tonnageUtile": 60.0,
  "tirantEau": "1,5m ou 3m (dérive baissée)",
  "fonction": "Transport fluvial",
  "epoque": "Flibuste (Provinces Unies), piraterie (Europe) et Royale",
  "manoeuvrabilite": 2,
  "avirons": "1 nœud",
  "vitMoyenne": 85.0,
  "calibreMax": 0,
  "longueur": "Immergée 18m, hors tout 25m",
  "vitesses": {
   "pres": 3.5,
   "largue": 9.5,
   "grandLargue": 7.0,
   "ventArriere": 4.0
  },
  "equipageMax": 20,
  "equipageManoeuvre": 5,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "11 matelots",
    "matelots": 11,
    "psMature": 9,
    "psCoque": 7,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   }
  ]
 },
 {
  "nom": "Prao caraïbe",
  "greement": "Assimilé à une voile latine (1 mât), avironsCatégorie de Taille. Sloop",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 12.0,
  "tonnageUtile": 9.0,
  "tirantEau": "1m",
  "fonction": "Pirogue de pêche et de guerre",
  "epoque": "Toutes périodes (Mer des Caraïbes)",
  "manoeuvrabilite": 0,
  "avirons": "3 nœuds",
  "vitMoyenne": 80.0,
  "calibreMax": 0,
  "longueur": "Immergée 18m, hors tout 22 m",
  "vitesses": {
   "pres": 6.0,
   "largue": 12.5,
   "grandLargue": 10.0,
   "ventArriere": 5.5
  },
  "equipageMax": 40,
  "equipageManoeuvre": 4,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Prao",
    "detail": "4 matelots",
    "matelots": 4,
    "psMature": 5,
    "psCoque": 4,
    "batteries": []
   }
  ]
 },
 {
  "nom": "Sloop",
  "greement": "Voile aurique (1 mât) recharge = 3 hommes) et 2×4 pierriers en bordée (VD = -1, re-",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 15.0,
  "tonnageUtile": 12.0,
  "tirantEau": "2m",
  "fonction": "Cabotage, flibuste, pirates et Royale",
  "epoque": "Flibuste (fin du XVIIème siècle), piraterie et Royale charge = 4 hommes) dont 4 peuvent tirer en chasse (VD = -1, rechar",
  "manoeuvrabilite": 2,
  "avirons": "",
  "vitMoyenne": 90.0,
  "calibreMax": 4,
  "longueur": "Immergée 15m 2×7 pièc, hors tout 27m une pièc",
  "vitesses": {
   "pres": 4.0,
   "largue": 10.5,
   "grandLargue": 7.5,
   "ventArriere": 4.0
  },
  "equipageMax": 50,
  "equipageManoeuvre": 6,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "12 matelots",
    "matelots": 12,
    "psMature": 9,
    "psCoque": 7,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "32 matelots",
    "matelots": 32,
    "psMature": 10,
    "psCoque": 8,
    "batteries": [
     {
      "desc": "2×3 pièces de 4 et 2×2 pièces de 3",
      "position": "bordée",
      "vd": 5,
      "recharge": 15
     },
     {
      "desc": "une pièce de 4",
      "position": "chasse",
      "vd": -1,
      "recharge": 3
     },
     {
      "desc": "2×4 pierriers",
      "position": "bordée",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": -1,
      "recharge": 4
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "34 matelots",
    "matelots": 34,
    "psMature": 11,
    "psCoque": 9,
    "batteries": [
     {
      "desc": "2×7 pièces de 4",
      "position": "bordée",
      "vd": 7,
      "recharge": 21
     },
     {
      "desc": "une pièce de 4",
      "position": "chasse",
      "vd": -1,
      "recharge": 3
     },
     {
      "desc": "2×2 pierriers",
      "position": "bordée",
      "vd": -4,
      "recharge": 2
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": -1,
      "recharge": 4
     }
    ]
   }
  ]
 },
 {
  "nom": "Tartane",
  "greement": "Voiles latines (1, 2 ou 3 mâts), avirons",
  "taille": "Sloop",
  "mats": 1,
  "tonnage": 110.0,
  "tonnageUtile": 90.0,
  "tirantEau": "2m",
  "fonction": "Transport, flibuste et marine de guerre espagnole",
  "epoque": "Aventuriers (Méditerranée), flibuste (navires espagnols et ottomans), piraterie et Royale",
  "manoeuvrabilite": 1,
  "avirons": "2 nœuds",
  "vitMoyenne": 100.0,
  "calibreMax": 6,
  "longueur": "Immergée 20m, hors tout 29m",
  "vitesses": {
   "pres": 5.0,
   "largue": 10.0,
   "grandLargue": 8.0,
   "ventArriere": 4.5
  },
  "equipageMax": 60,
  "equipageManoeuvre": 8,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "14 matelots",
    "matelots": 14,
    "psMature": 9,
    "psCoque": 9,
    "batteries": [
     {
      "desc": "2×2 pièces de 3",
      "position": "bordée",
      "vd": 0,
      "recharge": 6
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "41 matelots",
    "matelots": 41,
    "psMature": 9,
    "psCoque": 9,
    "batteries": [
     {
      "desc": "2×2 pièces de 4 et 2×3 pièces de 3",
      "position": "bordée",
      "vd": 5,
      "recharge": 15
     },
     {
      "desc": "deux canons de muraille",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "2×7 pierriers",
      "position": "bordée",
      "vd": 1,
      "recharge": 7
     },
     {
      "desc": "4 pierriers (prises sur la bordée)",
      "position": "chasse",
      "vd": -1,
      "recharge": 4
     },
     {
      "desc": "10 pierriers (prises sur la bordée)",
      "position": "fuite",
      "vd": 3,
      "recharge": 10
     }
    ]
   },
   {
    "nom": "Guerre",
    "detail": "32 matelots",
    "matelots": 32,
    "psMature": 11,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×2 pièces de 6 et 2×4 pièces de 4",
      "position": "bordée",
      "vd": 7,
      "recharge": 20
     },
     {
      "desc": "une pièce 6",
      "position": "chasse",
      "vd": 0,
      "recharge": 4
     }
    ]
   }
  ]
 },
 {
  "nom": "Trois-mâts goélette",
  "greement": "Voiles auriques et hunier (3 mâts)",
  "taille": "Goélette",
  "mats": 3,
  "tonnage": 250.0,
  "tonnageUtile": 210.0,
  "tirantEau": "5m",
  "fonction": "Pêche hauturière et transport",
  "epoque": "Piraterie et Royale",
  "manoeuvrabilite": 0,
  "avirons": "",
  "vitMoyenne": 105.0,
  "calibreMax": 4,
  "longueur": "Immergée 34m, hors tout 52m",
  "vitesses": {
   "pres": 4.0,
   "largue": 10.5,
   "grandLargue": 9.5,
   "ventArriere": 5.0
  },
  "equipageMax": 90,
  "equipageManoeuvre": 30,
  "gardesMarines": 0,
  "soldats": 0,
  "configurations": [
   {
    "nom": "Commerce & défense",
    "detail": "42 matelots",
    "matelots": 42,
    "psMature": 10,
    "psCoque": 10,
    "batteries": [
     {
      "desc": "2×4 pièces de 3",
      "position": "bordée",
      "vd": 3,
      "recharge": 12
     }
    ]
   },
   {
    "nom": "Course",
    "detail": "60 matelots",
    "matelots": 60,
    "psMature": 13,
    "psCoque": 13,
    "batteries": [
     {
      "desc": "2×10 pièces de 4",
      "position": "bordée",
      "vd": 9,
      "recharge": 30
     }
    ]
   }
  ]
 },
 {
  "nom": "Trois-ponts",
  "greement": "Voiles carrées (3 mâts) recharge = 70 hommes) et 2×8 canons de muraille en bordée",
  "taille": "Vaisseau de ligne",
  "mats": 3,
  "tonnage": 1600.0,
  "tonnageUtile": 1250.0,
  "tirantEau": "10m (VD = +22, recharge = 427 hommes), 2",
  "fonction": "Royale de 24 en chasse (VD = +13, recharge = 54 hommes), 2 pièces de 36, 2 pièce",
  "epoque": "Flibuste, piraterie et Royale",
  "manoeuvrabilite": -3,
  "avirons": "",
  "vitMoyenne": 70.0,
  "calibreMax": 42,
  "longueur": "Immergée 65m, hors tout 90m chasse (",
  "vitesses": {
   "pres": 1.5,
   "largue": 6.0,
   "grandLargue": 6.5,
   "ventArriere": 4.5
  },
  "equipageMax": 1200,
  "equipageManoeuvre": 100,
  "gardesMarines": 24,
  "soldats": 200,
  "configurations": [
   {
    "nom": "Guerre léger",
    "detail": "Vaisseau de rang 3, 635 matelots",
    "matelots": 635,
    "psMature": 200,
    "psCoque": 200,
    "batteries": [
     {
      "desc": "2×12 pièces de 9 et 2×2 pièces de 6",
      "position": "bordée",
      "vd": 21,
      "recharge": 379
     },
     {
      "desc": "2 pièces de 36 et 2 pièces de 24",
      "position": "chasse",
      "vd": 13,
      "recharge": 54
     },
     {
      "desc": "2 pièces de 24 et 2 pièces de 12",
      "position": "fuite",
      "vd": 14,
      "recharge": 70
     },
     {
      "desc": "2×8 canons de muraille",
      "position": "bordée",
      "vd": 5,
      "recharge": 16
     },
     {
      "desc": "4 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 2,
      "recharge": 8
     },
     {
      "desc": "10 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 6,
      "recharge": 20
     }
    ]
   },
   {
    "nom": "Guerre moyen",
    "detail": "Vaisseau de rang 2, 723 matelots",
    "matelots": 723,
    "psMature": 250,
    "psCoque": 250,
    "batteries": [
     {
      "desc": "2×13 pièces de 9 et 2×6 pièces de 6",
      "position": "bordée",
      "vd": 22,
      "recharge": 427
     },
     {
      "desc": "2 pièces de 24 et 2 pièces de 12",
      "position": "chasse",
      "vd": 14,
      "recharge": 70
     },
     {
      "desc": "2 pièces de 24 et 2 pièces de 18 et 2 pièces de 9",
      "position": "fuite",
      "vd": 15,
      "recharge": 86
     },
     {
      "desc": "2×10 canons de muraille",
      "position": "bordée",
      "vd": 6,
      "recharge": 20
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "14 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 7,
      "recharge": 28
     }
    ]
   },
   {
    "nom": "Guerre lourd",
    "detail": "Vaisseau de rang 1, 934 matelots",
    "matelots": 934,
    "psMature": 300,
    "psCoque": 300,
    "batteries": [
     {
      "desc": "2×14 pièces de 12 et 2×8 pièces de 6",
      "position": "bordée",
      "vd": 23,
      "recharge": 564
     },
     {
      "desc": "2 pièces de 30 et 4 pièces de 18",
      "position": "chasse",
      "vd": 16,
      "recharge": 102
     },
     {
      "desc": "4 pièces de 30 et 4 pièces de 18",
      "position": "fuite",
      "vd": 17,
      "recharge": 128
     },
     {
      "desc": "2×10 canons de muraille",
      "position": "bordée",
      "vd": 6,
      "recharge": 20
     },
     {
      "desc": "6 canons de muraille (prises sur la bordée)",
      "position": "chasse",
      "vd": 3,
      "recharge": 12
     },
     {
      "desc": "14 canons de muraille (prises sur la bordée)",
      "position": "fuite",
      "vd": 7,
      "recharge": 28
     }
    ]
   }
  ]
 }
];

"""Corrections manuelles de l'extraction des Pouvoirs (titres aux lettres espacées, paramètres perdus dans l'autre colonne).

Clé : (page, puissance, nom tel qu'extrait). Les titres sont relus sur le PDF (versions pdftotext brute, -layout et pypdf).
"""

# (page, puissance, nom extrait) -> (nom, nom natif[, conditions])
TITRES = {
    (171, 2, "Infatigable chasseur c h ioü e llé m a b oü i k a b ou c at i t i )"): ("Infatigable chasseur", "manchioüellémaboüikaboucatiti"),
    (173, 4, "P r o f o n d s o mm e i l"): ("Profond sommeil", "hilacayeu"),
    (176, 1, "Celui qui convie au festin"): ("Celui qui convie au festin", "ayalacriti"),
    (177, 3, "L' ê t r e qu i s e t r o m p e lu i - m ê m e"): ("L'être qui se trompe lui-même", "aboüaragouti locoüa"),
    (179, 6, "C o mm a n de m e n t"): ("Commandement", "aonacani"),
    (179, 6, "Je lui ai donné son dieu"): ("Je lui ai donné son dieu", "nichiguiénli iouloúcayemz lone"),
    (183, 6, "Blessure (niboucaboli)/Guérison"): ("Blessure / Guérison", "niboucaboli / lagnouracani"),
    (184, 10, "Mort subite (abyémenic liem)/"): ("Mort subite / Résurrection", "abyémenic liem / acacochoni"),
    (186, 2, "F e mm e s e s p r i t s d u v e n t"): ("Femmes esprits du vent", "watoripë"),
    (187, 4, "Esprits du gibier de la forêt ( ya r o r i p ë ) ."): ("Esprits du gibier de la forêt", "yaroripë"),
    (189, 7, "C r o i s s a n c e i mm a n e n t e"): ("Croissance immanente", "në rope"),
    (191, 1, "P a r o le d e l ' h o mm e e n c o lè r e"): ("Parole de l'homme en colère", "cataickeu"),
    (192, 3, "A t t i s e l a f l a mm e"): ("Attise la flamme", "béyabanum"),
    (195, 9, "M u lt i p li c at i o n"): ("Multiplication", "libamouli"),
    (199, 1, "Incitations du jour du calendrier"): ("Incitations du jour du calendrier", "tlaimman tonalli tonalamapan"),
    (199, 1, "Incitations de la trecena du c a le n d r i e r"): ("Incitations de la trecena du calendrier", "tlaimman cencalli tonalamapan"),
    (199, 3, "Transgression des incitations du jour du calendrier lm at i t l a i mm a n ton a lli tonalamapan)"):
        ("Transgression des incitations du jour du calendrier", "ahuilmati tlaimman tonalli tonalamapan"),
    (199, 3, "Transgression des incitations de e n a du c a le n dr i e r"):
        ("Transgression des incitations de la trecena du calendrier", "ahuilmati tlaimman cencalli tonalamapan"),
    (201, 5, "Maudire les transgressions des r e c o mm a n dat i o n s d u c a le n d r i e r"):
        ("Maudire les transgressions des recommandations du calendrier", "telchihua ahuilmati tlaimman tonalamapan"),
    (201, 6, "Aspect du dieu du jour du c a le n d r i e r"): ("Aspect du dieu du jour du calendrier", "tlachiyaliztli teotltonalli tonalamapan"),
    (202, 8, "Pouvoirs du dieu du jour du c a le n dr i e r"): ("Pouvoirs du dieu du jour du calendrier", "cehuelitiliztli teotltonalli tonalamapan"),
    (204, 3, "Fils du Soleil"): ("Fils du Soleil", "Tonatiuh yacapantli"),
    (204, 3, "M i r o i r li qu i d e"): ("Miroir liquide", "tezcahuia atl"),
    (205, 4, "C o r p s m i r o i r"): ("Corps miroir", "inacayc tezcahuia"),
    (205, 5, "T r a n s pa r e n c e"): ("Transparence", "tehuilticayotl"),
    (206, 5, "Main de vent"): ("Main de vent", "ehecatl cemmactzinco"),
    (206, 6, "Êtres illusoires"): ("Êtres illusoires", "tlalnacalt netapololtiliztli"),
    (207, 6, "P r i s o n li qu i d e"): ("Prison liquide", "malli altco"),
    (207, 7, "V oyag e pa r le s f l a mm e s"): ("Voyage par les flammes", "nehnemini tlecomotlicopa"),
    (208, 8, "L a mo r t d e l ' i mm o b i le"): ("La mort de l'immobile", "miquitzli ayollinco"),
    (208, 9, "Sourire du Soleil"): ("Sourire du Soleil", "Tonatiuh ihixhuetzca"),
    (210, 2, "Arrière Satan ( Vade retro Satanas, christianisme) ou Shatan"):
        ("Arrière Satan (christianisme) ou Shatan (judaïsme)", "Vade retro Satanas"),
    (210, 3, "Tu suivras le c o mm a n d e m e n t d u S e i g n e u r !"): ("Tu suivras le commandement du Seigneur !", ""),
    (211, 4, "Maudites soient les entreprises de q u i m a n q u e au x c o mm a n d e m e n t s d e D i e u"):
        ("Maudites soient les entreprises de qui manque aux commandements de Dieu", "", "Judaïsme uniquement."),
    (211, 5, "Sermon (christianisme) ou Parasha"): ("Sermon (christianisme) ou Parasha (judaïsme)", ""),
    (212, 6, "Manquement collectif aux c o mm a n d e m e n t s d e D i e u"):
        ("Manquement collectif aux commandements de Dieu", "", "Judaïsme uniquement."),
    (212, 6, "L' oe i l d e l a c o n s c i e n c e"): ("L'œil de la conscience", ""),
    (212, 6, "Maudits les fruits de qui manque au x c o mm a n d e m e n t s d e D i e u"):
        ("Maudits les fruits de qui manque aux commandements de Dieu", "", "Judaïsme uniquement."),
    (213, 7, "L è v e - to i e t m a r c h e"): ("Lève-toi et marche", "", "Christianisme uniquement."),
    (213, 8, "Que pourrisse le corps de qui m a n q u e au x c o mm a n d e m e n t s d e D i e u"):
        ("Que pourrisse le corps de qui manque aux commandements de Dieu", "", "Judaïsme uniquement."),
    (213, 8, "Béatification (christianisme) ou"): ("Béatification (christianisme) ou Âme glorifiée (judaïsme)", ""),
    (243, 8, "O s e"): ("Ose", "Accusateur ou Exécuteur"),
    (244, 8, "A m y"): ("Amy", "Accusateur ou Exécuteur"),
    (244, 8, "O r i a s"): ("Orias", "Accusateur ou Exécuteur"),
    (244, 8, "V a p u l a"): ("Vapula", "Accusateur ou Exécuteur"),
    (244, 8, "Z aga n"): ("Zagan", "Accusateur ou Exécuteur"),
    (244, 8, "V a l ac"): ("Valac", "Accusateur ou Exécuteur"),
    (245, 8, "A n dr a s"): ("Andras", "Accusateur ou Exécuteur"),
    (245, 8, "F l au r o s"): ("Flauros", "Accusateur ou Exécuteur"),
    (247, 10, "Âme Damnée tée : Personnelle ; Cible : Moi ; Durée : Permanent."): ("Âme Damnée", ""),
    (248, 1, "L u g , p r o t e c t e u r d u c o mm e r c e"): ("Lug, protecteur du commerce", ""),
    (252, 6, "E ta i n , l a f e mm e c yg n e"): ("Etain, la femme cygne", ""),
    (253, 7, "L e s mu lt i p le s f o r m e s d e T ua n M ac"): ("Les multiples formes de Tuan Mac Cairill", ""),
    (265, 5, "Ph i lt r e"): ("Philtre", ""),
    (277, 5, "C o mm a n d e au p e u p le m a r i n"): ("Commande au peuple marin", "komann pèp lanmè"),
    (279, 9, "Dessèchement"): ("Dessèchement / Crue", "desè / dlo anvayi"),
    (280, 1, "B é n é d i c t i o n d ' u n acc o r d"): ("Bénédiction d'un accord", "benediksyon konsanti"),
    (280, 1, "V e i n e c o mm e r c i a le"): ("Veine commerciale", "chans negos"),
    (282, 4, "Anneau de confiance"): ("Anneau de confiance", "bag konfyans"),
    (283, 5, "I mm o b i li t é d u s e r p e n t"): ("Immobilité du serpent", "kiks koulèv"),
    (284, 5, "R i c h e s s e s i n c o mm e n s u r a b le s"): ("Richesses incommensurables", "gwo trezo"),
    (285, 9, "U lt i m e m e s s ag e r"): ("Ultime messager", "denyè mesaj"),
    (285, 10, "Pluie de serpents (lapli koulèv) /"): ("Pluie de serpents / Forêt de serpents", "lapli koulèv / rakbwa koulèv"),
    (289, 8, "L' a mou r e s t av e u g le"): ("L'amour est aveugle", "lanmou avèg"),
    (289, 9, "C atac lys m e s o c i a l"): ("Cataclysme social", "desas nan la sosyete"),
    (295, 1, "Venez lwas (vini lwas) /"): ("Venez lwas / Partez lwas", "vini lwas / pati lwas"),
    (302, 4, "Ingrédient manquant"): ("Ingrédient manquant", "bagay manke"),
    (302, 5, "A lt é r e r le s p r o p r i é t é s v é g é ta le s"): ("Altérer les propriétés végétales", "chanje le propriyete plant"),
    (304, 8, "R e to u r d e f l a mm e"): ("Retour de flamme", "reverse la flanm"),
    (305, 2, "L e pa p i llo n da n s l a f l a mm e"): ("Le papillon dans la flamme", "la paiyon nan la flanm"),
    (306, 3, "U lt i m at u m"): ("Ultimatum", "denye avèti"),
    (307, 6, "R e g a r d e n f l a mm é"): ("Regard enflammé", "rega flanm"),
    (308, 9, "H o mm e de f e r"): ("Homme de fer", "moun fè"),
    (310, 4, "D u r c o mm e le r o c"): ("Dur comme le roc", "di tan roch"),
    (310, 4, "P lo i e c o mm e l a c a n n e à s u c r e"): ("Ploie comme la canne à sucre", "koube tankou kann"),
    (311, 5, "Métamorphose terrestre"): ("Métamorphose terrestre", "chanj fom zanimmo tè"),
    (312, 7, "Appel de la bête"): ("Appel de la bête", "rele la bèt sauvaj"),
    (312, 8, "Métamorphose aérienne"): ("Métamorphose aérienne", "chanj fom zanimmo lè"),
}

# (page, puissance, nom corrigé) -> « Portée : … ; Cible : … ; Durée : … »
PARAMETRES = {
    (186, 2, "Colère, courage, apparence resplendissante des esprits chamaniques"): "Portée : Vue/Voix/Ouïe ; Cible : Toi ; Durée : 1 cycle.",
    (205, 4, "Déchirement de la progéniture"): "Portée : Voix ; Cible : Vous ; Durée : Permanent.",
    (208, 10, "Résurrection des os de jade"): "Portée : Toucher ; Cible : Toi ; Durée : Permanent.",
    (218, 3, "Caliel"): "Portée : Personnelle ; Cible : Moi ; Durée : 30 min.",
    (238, 5, "Marchosias"): "Portée : Là ; Cible : Moi (Don...) ou Vue/Voix/Ouïe ; Durée : 4 h ou 1 mois (Don...).",
    (244, 8, "Orias"): "Portée : Là ; Cible : Moi (Métamorphose..., Souffle) ; Durée : 24 h.",
    (247, 10, "Âme Damnée"): "Portée : Personnelle ; Cible : Moi ; Durée : Permanent.",
    # Le livre imprime « Portée » à la place de « Durée »
    (262, 1, "Paroles de sagesse"): "Portée : Voix ; Cible : Toi ; Durée : 1 cycle ou 24 h (rendre sage).",
    (268, 8, "Mort de la raison"): "Portée : Ici ; Cible : Vous ; Durée : Permanent.",
    (268, 9, "Malédiction"): "Portée : Voix ; Cible : Lui ; Durée : Permanent.",
    (311, 6, "Désert urbain"): "Portée : Là-bas ; Cible : Eux ; Durée : 1 mois (solitude dans la foule) ou 1 année.",
    # Le livre inverse Portée et Cible
    (181, 3, "Âme en peine"): "Portée : Là ; Cible : Toi ; Durée : 1 h ou Permanent (laisse un mort sans repos, donne le repos à un mort).",
    (202, 9, "Pouvoirs du dieu de la trecena du calendrier"): "Portée : Là-bas ; Cible : Eux ; Durée : Jusqu'à la fin de la trecena.",
}

# Deux titres côte à côte p. 302 : « Ingrédient manquant » a absorbé « Maladies ».
SCINDER = {
    (302, 4, "Ingrédient manquant"): {
        "visions": ["Un élément essentiel vient à manquer.", "Persuade qu'une action est impossible du fait du manque d'un élément.",
                    "Trouve l'élément qui manque."],
        "compulsions": "Composer un breuvage ou baume en omettant un ingrédient. Rechercher sans répit tout élément manquant.",
        "nouveau": {"puissance": 5, "nom": "Maladies", "nomNatif": "maladi",
                    "parametres": "Portée : Ici ; Cible : Lui ; Durée : 1 semaine ou Permanent (soigne une maladie, stoppe une épidémie).",
                    "visions": ["Diagnostique une maladie.", "Inflige une maladie.", "Soigne une maladie.", "Stoppe une épidémie."],
                    "compulsions": "Survivre à une maladie. Soigner une maladie. Permettre à une épidémie de se répandre."},
    },
}

RELIGIONS_SEULES = {"christianisme": "Christianisme uniquement.", "judaïsme": "Judaïsme uniquement.", "judaisme": "Judaïsme uniquement."}

# Débris de l'autre colonne glissés dans les paramètres : (texte fautif, correction)
DEBRIS_PARAMETRES = [
    (" linhac ", " "), (" 1 mois sauv ", " 1 mois "), ("24 h. ·", "24 h."), (" en Portée singe", " en singe"),
    ("Perma- janvie nent", "Permanent"), ("(Don Por de familier)", "(Don de familier)"),
    ("ou Lui ou 4 \xad Vous", "ou Lui ou Vous"), ("(Amour..., Porté Pacte...)", "(Amour..., Pacte...)"),
    ("Conf ère", "Confère"), ("Durée : 1 \xad D 1 année", "Durée : 1 année"), ("Permanent qu' (", "Permanent ("),
    ("(contrôle des Portée mouvements", "(contrôle des mouvements"), ("Vue /Voix", "Vue/Voix"), ("Là-Bas", "Là-bas"),
]

# Pouvoirs absorbés par leur voisin de l'autre colonne : on garde les n premières visions,
# le reste (ou les visions données) va au Pouvoir recréé.
SCINDER.update({
    (224, 7, "Daniel"): {
        "garder": 9,
        "attributs": {"Attribut": "Le Signe des Miséricordes.", "Heure": "16h20 à 16h40.",
                      "Jours": "28 novembre au 2 décembre. 10 mai, 24 juillet, 7 octobre, 19 décembre, 27 février.",
                      "Couleurs/Cristal": "Indigo/Pierre de croix.", "Prière": "« Miserator et misericors Dominus. Longanimis et misericors. »"},
        "nouveau": {"puissance": 7, "nom": "Hahaziah", "nomNatif": "Principauté", "parametres": "Portée : Là ; Cible : Vous ; Durée : 24 h."},
    },
    (304, 1, "Bruissement"): {
        "garder": 3,
        "compulsions": "Faire passer un bruit humain pour un bruissement d'arme. Créer une avalanche de cailloux.",
        "attributs": {},
        "nouveau": {"puissance": 1, "nom": "Douce chaleur", "nomNatif": "dous tièdè", "parametres": "Portée : Ici ; Cible : Toi ; Durée : 1 cycle.",
                    "visions": ["Réchauffe le corps engourdi par le froid.", "Chaleur agréable.", "Chaleur suffisante pour pousser à se dévêtir légèrement.",
                                "Sensation d'un corps proche.", "Apaise un enfant.", "Apaise et calme auprès d'un feu."],
                    "compulsions": "Se réchauffer au coin du feu. Serrer le corps d'un membre du sexe opposé."},
    },
    (200, 4, "Connaissance, conscience, contrôle des porteurs de la trecena"): {
        "garder": 7,
        "compulsions": "Écrire un journal personnel détaillé pendant un mois.",
        "nouveau": {"puissance": 4, "nom": "Pouvoirs mineurs du dieu du jour du calendrier",
                    "nomNatif": "achihtzin chihualiztli teotltonalli tonalamapan", "parametres": "Portée : Ici ; Cible : Toi ; Durée : 24 h.",
                    "visions": ["Utiliser un des pouvoirs (avec les paramètres ci-dessus) du dieu du jour, mais dont la puissance (faible) est limitée par le maître de jeu."],
                    "compulsions": "Briller de vaillance et de génie pendant une journée mémorable."},
    },
})

# Prose ou titre de l'autre colonne collés à la fin d'une vision ou d'une compulsion : tout ce qui suit le marqueur est retiré.
COUPES = {
    "Mort subite / Résurrection": " Les mécanismes",
    "Maître du coton": " Les zémis",
    "Connaissance, conscience, contrôle des porteurs de la trecena": " ons.",
    "Incarnation des dieux du calendrier": " Mythe des Cinq Soleils",
    "Daniel": " ziah (Principauté)",
    "Omnipotence du Dagda": " CONTRÉES",
}

# Remplacements ponctuels dans les visions et compulsions : (nom, faux, juste) ; « | » sépare deux visions.
REMPLACEMENTS = [
    ("Incitations de la trecena du calendrier", " l a t r e c trecena", " trecena"),
    ("Enfantement", "Accouchement sans encombre. s un acte sexuel", "Accouchement sans encombre.|Après un acte sexuel"),
    ("Botis", "religion. -", "religion."),
]

REMPLACEMENTS += [
    ("Botis", " · ", "|"),
    ("Maquillage", "Enlaidir u'un", "Enlaidir quelqu'un"),
]

# Champs complétés à la main : (page, puissance, nom) -> valeurs
CHAMPS = {
    (294, 8, "Bannissement"): {"compulsions": "Chasser définitivement un proche. Détruire un zombie."},
    (312, 7, "Métamorphose aquatique"): {"nomNatif": "chanj fom zanimmo dlo"},
    (218, 3, "Nelchael"): {"attributs+": {"Attribut": "Dieu seul et unique.", "Heure": "6h40 à 7h00."}},
    (225, 7, "Nithael"): {"attributs+": {"Attribut": "Roi des cieux."}},
    (240, 6, "Vepar"): {"attributs+": {"Aspect": "Sirène."}},
    # Pouvoir sans visions : règle de création d'objet, résumée
    (201, 7, "Cristal du sorcier"): {"visions": ["Crée un cristal de sorcier à partir d'un cristal pur : vecteur de pouvoir (Affinité pour les Voies aztèques) ou réceptacle de Pouvoirs des Voies aztèques (trois au plus)."]},
}

REMPLACEMENTS += [
    ("Murmure du Soleil", " r un chien chasser", " Regarder un chien chasser"),
    ("Blessure sociale", " légendes qui Soigner", " Soigner"),
    ("Matérialisation féerique", " le faire boi Aider", " Aider"),
    ("Sang-froid", " contra Rester", " Rester"),
    ("Régénération", "blessures né. légères", "blessures légères"),
    ("Trempe", "Conf ère", "Confère"),
]

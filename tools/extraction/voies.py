import json, os, re, secrets, string, unicodedata
OUT = 'src/packs/voies'
os.makedirs(OUT, exist_ok=True)
ALPHA = string.ascii_letters + string.digits
rid = lambda: ''.join(secrets.choice(ALPHA) for _ in range(16))


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


STATS = {"compendiumSource": None, "duplicateSource": None, "coreVersion": "13.345", "systemId": "pavillon-noir-2",
         "systemVersion": "0.7.0", "createdTime": 0, "modifiedTime": 0, "lastModifiedBy": None}
VAUDOU = "Un houngan ou une mambo n'a accès qu'à trois Voies du vaudou, choisies par le MJ ; sa Connaissance des Mystères est nulle dans les autres."
SANS_TRANSE = "Pas de Transe dans cette Voie : seulement des Rituels."
DOSSIERS = [
    ("Religion caraïbe", "Caraïbe", [
        ("Voie d'Ichéiricou pour la guerre", 171, False, "L'Ichéiricou du boyer appelé pour la guerre, conçue comme un raid par surprise : rassembler et diriger les guerriers, veiller sur leur repos et endormir l'ennemi, les rendre discrets, forts et courageux, reconnaître l'adversaire, prendre sa forme, le terrifier.", "Les Caraïbes invoquent leur dieu Ichéiricou de trois façons : trois Voies pour un même dieu."),
        ("Voie d'Ichéiricou pour le conseil", 176, False, "Ichéiricou dans la vie sociale : festins, conseils, gestion des conflits, rencontres, départs et quêtes. Il prévient le boyer des dangers et l'aide à les écarter (chasser les nuages, voir les récifs, retrouver un assassin).", "C'est par un Pouvoir de cette Voie qu'un boyer transmet un Ichéiricou à celui qui deviendra boyer à son tour."),
        ("Voie d'Ichéiricou pour la protection et la punition", 180, False, "Ichéiricou protecteur et justicier : protéger les siens et leurs biens, détourner le malheur, punir ceux qui offensent le boyer ou la communauté.", None),
    ]),
    ("Religion yanomami", "Yanomami", [
        ("Voie des Xapiripë", 185, False, "Les esprits de la forêt (xapiripë) sont innombrables et défilent devant le chaman qui leur prête son corps. Une Voie unique donne accès aux pouvoirs, très ciblés, de nombreux esprits : concepts (la faim, le soir), animaux, arbres, rapides, revenants.", "Religion de possession proche du vaudou, mais où un seul rite convoque une foule d'esprits."),
    ]),
    ("Religion arawak", "Arawak", [
        ("Voie des Zémis", 191, False, "Pouvoirs communs aux zémis, esprits envoyés par Yocahú pour défendre les Arawaks contre Juracan : soigner, communiquer avec les morts, régler la vie sociale (assistance, enquête, mensonge, séduction).", "Il faut posséder un zémi pour parcourir cette Voie. Le pouvoir propre de chaque zémi (Orage, Lune, Amitié…) relève de la compétence Objet de pouvoir, pas de la Voie."),
    ]),
    ("Religions aztèque et maya", "Aztèque et maya", [
        ("Voie du Calendrier", 199, True, "Celui qui sait lire le calendrier sacré connaît les dieux et les auspices du jour, pousse les hommes à suivre ses préceptes ou à les braver, punit les transgressions et communique avec les dieux du jour et de la treizaine.", "Voie de divination (règles du calendrier : p. 150-151). " + SANS_TRANSE),
        ("Voie des Cinq Soleils", 203, False, "La connaissance des mythes des âges du monde et de leurs destructions donne prise sur les cinq éléments : Soleil-Terre, Soleil-Feu, Soleil-Air, Soleil-Eau et Soleil-Mouvement.", None),
    ]),
    ("Religions du livre", "Christianisme et judaïsme", [
        ("Voie de Dieu", 209, False, "L'unique Voie chrétienne, partagée avec le judaïsme : miracles des deux livres saints, assistance aux saints et aux martyrs, lutte contre le Malin et ses adorateurs, bénédiction et guidance des fidèles, punition des impies, consécration (eau bénite, reliques, béatification).", "Certains Pouvoirs n'existent que dans le christianisme."),
        ("Voie des Sephiroth", 214, True, "Kabbale : l'Arbre de vie et ses chœurs d'anges, chemin vers Dieu par l'étude et la méditation.", "Accessible aux kabbalistes et aux sorcières (sorciers) blanches, qui gardent alors les Rites, Actes de foi et Péchés du paganisme. Découverte d'un Pouvoir par une semaine de lecture et de méditation, sans compulsion. " + SANS_TRANSE),
        ("Voie des Qlipoth", 229, True, "Kabbale : l'Arbre inversé et ses démons, le pendant ténébreux des Sephiroth.", "Accessible aux sorcières (sorciers) noires, qui gardent les Rites, Actes de foi et Péchés du paganisme ; on ne peut suivre à la fois les Sephiroth et les Qlipoth. Pas de compulsion. " + SANS_TRANSE),
    ]),
    ("Traditions européennes", "Paganisme européen", [
        ("Voie du Druidisme", 248, False, "Les dieux celtes (Lug, Brigit…) : protocole et rencontres, conseil, lumière et nuit, protection des voyageurs, des marchands et des artisans.", None),
        ("Voie du Folklore", 256, False, "Le monde des fées et des créatures du folklore européen, que l'incrédulité des hommes affaiblit : les invoquer, s'en protéger, user de leurs pouvoirs.", "Voie des sorcières et sorciers (paganisme)."),
        ("Voie de la Cartomancie", 269, True, "Divination par les Lames du tarot, Arcanes majeurs et mineurs : chaque Lame, droite ou renversée, est un Pouvoir.", "Règles spéciales (p. 152-157) : le nombre de Pouvoirs connus vaut 3 × Connaissance des Mystères, et connaître une Lame droite donne la Lame renversée. Pas de compulsion. " + SANS_TRANSE),
    ]),
    ("Vaudou", "Vaudou", [
        ("Voie d'Agwé", 276, False, "Lwa de l'eau, des navires, de la quête et des voyages ; il protège les voyageurs, et d'abord les marins.", VAUDOU),
        ("Voie de Dambala", 279, False, "Lwa serpent : tout ce qui touche aux serpents, et aux rapports sociaux, en particulier la réussite, la richesse, la confiance et les accords.", VAUDOU),
        ("Voie d'Erzulie", 285, False, "Les rapports amoureux, la femme, le scandale, l'image que l'on renvoie, et la protection des lwas pour leur sœur chérie.", VAUDOU),
        ("Voie des Guédés", 290, False, "Baron Samedi et les Guédés : la mort, les malédictions et leur levée, les protections (gads) et les poupées vaudoues.", VAUDOU),
        ("Voie de Papa Legba", 295, False, "Gardien de la barrière qui sépare du monde invisible : force, vieillesse, entraide, esprits et possession, protection des maisons et des croisées des chemins, imitation et adaptation.", VAUDOU),
        ("Voie des Frères Marassa", 300, False, "Les jumeaux : le corps et la guérison, l'union, l'enfance, les plantes, les baumes, potions et philtres. Eux seuls peuvent rendre la vie à un mort sans en faire un zombie.", VAUDOU),
        ("Voie d'Ogou", 304, False, "Les incarnations d'Ogou, lwa de la guerre, du fer et du feu.", VAUDOU),
        ("Voie de Cousin Zaka", 308, False, "Les animaux, les plantes, les germes de la vie et le dur travail des champs, mais aussi la métamorphose.", VAUDOU),
    ]),
]
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
sort_dossier = 100000
total = 0
for nom_dossier, religion, voies in DOSSIERS:
    fid = rid()
    dossier = {"_id": fid, "_key": f"!folders!{fid}", "name": nom_dossier, "type": "Item", "folder": None, "sorting": "a",
               "sort": sort_dossier, "color": None, "description": "", "flags": {}, "_stats": STATS}
    sort_dossier += 100000
    with open(f"{OUT}/{slug(nom_dossier)}_{fid}.json", "w", encoding="utf-8", newline="\n") as fh:
        json.dump(dossier, fh, indent=2, ensure_ascii=False)
    for i, (nom, page, sans_transe, resume, note) in enumerate(voies):
        iid = rid()
        desc = f"<p>{resume}</p>" + (f"<p><em>{note}</em></p>" if note else "") + \
            "<p>Réglez sur cette Voie la Foi (communion) ou la Connaissance des Mystères (possession) et l'Affinité du personnage, puis ajoutez ses Pouvoirs connus.</p>"
        item = {"_id": iid, "_key": f"!items!{iid}", "name": nom, "type": "voie", "img": "icons/svg/sun.svg",
                "system": {"description": desc, "source": f"Entre ciel et terre, p. {page}", "cle": "", "religion": religion,
                           "groupeColere": "", "foi": 0, "mysteres": 0, "affinite": 0, "rites": "", "sansTranse": sans_transe},
                "effects": [], "folder": fid, "sort": (i + 1) * 100000, "ownership": {"default": 0}, "flags": {}, "_stats": STATS}
        with open(f"{OUT}/{slug(nom)}_{iid}.json", "w", encoding="utf-8", newline="\n") as fh:
            json.dump(item, fh, indent=2, ensure_ascii=False)
        total += 1
print(total, "Voies,", len(DOSSIERS), "dossiers")

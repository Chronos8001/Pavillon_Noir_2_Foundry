import json, os, re, secrets, string, unicodedata
OUT = 'src/packs/voies'
PACK = 'Compendium.pavillon-noir-2.voies.Item.'
ALPHA = string.ascii_letters + string.digits
rid = lambda: ''.join(secrets.choice(ALPHA) for _ in range(16))


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


docs = {}
for f in os.listdir(OUT):
    d = json.load(open(os.path.join(OUT, f), encoding='utf-8'))
    docs[f] = d
voies = {d['name']: (f, d) for f, d in docs.items() if d.get('type') == 'voie'}
dossiers = {d['name']: d for d in docs.values() if d['_key'].startswith('!folders!')}
# Supprime d'éventuels objets Religion d'un passage précédent
for f, d in list(docs.items()):
    if d.get('type') == 'religion':
        os.remove(os.path.join(OUT, f))

DOMAINES = {
    "Voie d'Ichéiricou pour la guerre": "Guerre et raids",
    "Voie d'Ichéiricou pour le conseil": "Vie sociale, conseil et quêtes",
    "Voie d'Ichéiricou pour la protection et la punition": "Protection et punition",
    "Voie des Xapiripë": "Esprits de la forêt",
    "Voie des Zémis": "Soins, morts et vie sociale",
    "Voie du Calendrier": "Divination par le calendrier sacré",
    "Voie des Cinq Soleils": "Les cinq éléments",
    "Voie de Dieu": "Miracles, bénédiction, lutte contre le Malin",
    "Voie des Sephiroth": "Arbre de vie et chœurs d'anges",
    "Voie des Qlipoth": "Arbre inversé et démons",
    "Voie du Druidisme": "Dieux celtes : protocole, conseil, échanges",
    "Voie du Folklore": "Fées et créatures du folklore",
    "Voie de la Cartomancie": "Divination par le tarot",
    "Voie d'Agwé": "Mer, navires et voyages",
    "Voie de Dambala": "Serpents, réussite, richesse et accords",
    "Voie d'Erzulie": "Amour, femme, scandale et apparences",
    "Voie des Guédés": "Mort, malédictions et protections",
    "Voie de Papa Legba": "Monde invisible, possession, croisées des chemins",
    "Voie des Frères Marassa": "Corps, guérison, enfance, potions et philtres",
    "Voie d'Ogou": "Guerre, fer et feu",
    "Voie de Cousin Zaka": "Animaux, plantes et travail des champs",
}
VAUDOU = ["Voie d'Agwé", "Voie de Dambala", "Voie d'Erzulie", "Voie des Guédés", "Voie de Papa Legba", "Voie des Frères Marassa", "Voie d'Ogou", "Voie de Cousin Zaka"]
# (nom, type, dossier, correspondances, voies, voie principale ?, description, page)
RELIGIONS = [
    ("Christianisme", "communion", "Religions du livre", "Catholique ; Protestant (huguenot, réformé) ; Anglican", ["Voie de Dieu"],
     "Religions chrétiennes (catholique, protestante, anglicane) : religion de communion, la Foi relie le fidèle à Dieu.", "89, 93"),
    ("Judaïsme", "communion", "Religions du livre", "Juif", ["Voie de Dieu", "Voie des Sephiroth", "Voie des Qlipoth"],
     "Religion de communion : la Foi relie le fidèle à Dieu. La Kabbale (Sephiroth, Qlipoth) s'y rattache.", "93, 209"),
    ("Religion aztèque", "communion", "Religions aztèque et maya", "Religion aztèque", ["Voie du Calendrier", "Voie des Cinq Soleils"],
     "Religion solaire de communion : le lien entre le fidèle et ses dieux est la Foi.", "89, 93"),
    ("Religion maya", "communion", "Religions aztèque et maya", "Religion maya", ["Voie du Calendrier", "Voie des Cinq Soleils"],
     "Religion solaire de communion, qui partage avec les Aztèques le calendrier religieux.", "89, 196"),
    ("Culte du Soleil (Natchez)", "communion", "Religions aztèque et maya", "Culte du Soleil (Natchez)", [],
     "Religion solaire de communion. Le supplément ne décrit pas de Voie d'illumination qui lui soit propre.", "89"),
    ("Vaudou", "possession", "Vaudou", "Vaudou", VAUDOU,
     "Religion de possession : le houngan ou la mambo prête son corps aux lwas. Un prêtre n'a accès qu'à trois Voies, choisies par le MJ.", "89-90"),
    ("Religion caraïbe", "possession", "Religion caraïbe", "Religion caraïbe",
     ["Voie d'Ichéiricou pour la guerre", "Voie d'Ichéiricou pour le conseil", "Voie d'Ichéiricou pour la protection et la punition"],
     "Religion de possession : le boyer invoque son Ichéiricou de trois façons, d'où trois Voies pour un même dieu.", "89, 171"),
    ("Religion arawak", "possession", "Religion arawak", "Religion arawak", ["Voie des Zémis"],
     "Religion de possession : le béhique s'appuie sur les zémis, esprits envoyés par Yocahú contre Juracan.", "89, 191"),
    ("Religion yanomami", "possession", "Religion yanomami", "", ["Voie des Xapiripë"],
     "Religion de possession des Indios Bravos : le chaman prête son corps aux esprits de la forêt.", "89, 185"),
    ("Paganisme européen (sorcellerie)", "possession", "Traditions européennes", "",
     ["Voie du Folklore", "Voie de la Cartomancie", "Voie des Sephiroth", "Voie des Qlipoth"],
     "Sorcières et sorciers. Le supplément ne les classe ni en communion ni en possession, mais parle de Connaissance des Mystères (Cartomancie, Folklore) : le type possession est retenu pour le Seuil de Rejet, à confirmer par le MJ. Une sorcière blanche a accès aux Sephiroth, une sorcière noire aux Qlipoth, jamais aux deux.", "89, 152, 256"),
    ("Druidisme", "", "Traditions européennes", "", ["Voie du Druidisme"],
     "Druides et dieux celtes. Le type de religion n'est pas précisé par le supplément : à fixer par le MJ.", "248"),
]
PRINCIPALE = {"Voie de Dieu": "Christianisme", "Voie des Sephiroth": "Judaïsme", "Voie des Qlipoth": "Judaïsme",
              "Voie du Calendrier": "Religion aztèque", "Voie des Cinq Soleils": "Religion aztèque"}

stats = next(iter(voies.values()))[1]['_stats']
ids = {}
for i, (nom, type_, dossier, corr, liste, desc, page) in enumerate(RELIGIONS):
    iid = rid()
    ids[nom] = iid
    for v in liste:
        assert v in voies, v
    item = {"_id": iid, "_key": f"!items!{iid}", "name": nom, "type": "religion", "img": "icons/svg/temple.svg",
            "system": {"description": f"<p>{desc}</p>", "source": f"Entre ciel et terre, p. {page}", "cle": "", "type": type_,
                       "groupeColere": "", "voies": [PACK + voies[v][1]['_id'] for v in liste], "correspondances": corr},
            "effects": [], "folder": dossiers[dossier]['_id'], "sort": i, "ownership": {"default": 0}, "flags": {}, "_stats": stats}
    with open(f"{OUT}/{slug(nom)}_{iid}.json", "w", encoding="utf-8", newline="\n") as fh:
        json.dump(item, fh, indent=2, ensure_ascii=False)

# Voies : domaine et religion principale
for nom, (f, d) in voies.items():
    principale = PRINCIPALE.get(nom) or next(r[0] for r in RELIGIONS if nom in r[4])
    sysd = d['system']
    nouveau = {}
    for k, v in sysd.items():
        if k in ("religionUuid", "domaine"):
            continue
        nouveau[k] = v
        if k == "religion":
            nouveau["religion"] = principale
            nouveau["religionUuid"] = PACK + ids[principale]
            nouveau["domaine"] = DOMAINES[nom]
    d['system'] = nouveau
    with open(os.path.join(OUT, f), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(d, fh, indent=2, ensure_ascii=False)
print(len(RELIGIONS), "religions ;", len(voies), "Voies mises à jour")

"""Ajoute aux compendiums les Avantages et les PNJ propres à Entre ciel et terre.

Usage (racine du dépôt) : python tools/extraction/ect_pnj_avantages.py
- Avantages (p. 87-88) : même modèle que les autres avantages du compendium « avantages-faiblesses ».
- PNJ : le zombie (p. 76) et les fées de la Voie du Folklore (p. 256-262), sur le modèle des PNJ du compendium « pnj ».
Les textes sont des résumés ; les identifiants sont stables (regénération sans changer les UUID).
"""
import copy
import hashlib
import html
import json
import os
import re
import string
import unicodedata

ALPHA = string.ascii_letters + string.digits
AV = "src/packs/avantages-faiblesses"
PNJ = "src/packs/pnj"
SOURCE = "Entre ciel et terre"
e = lambda s: html.escape(s, quote=False)


def ident(*parts):
    h = hashlib.sha256("|".join(map(str, ("ect",) + parts)).encode()).digest()
    return "".join(ALPHA[b % len(ALPHA)] for b in h[:16])


def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:60]


def lire(dossier, nom):
    return json.load(open(os.path.join(dossier, nom), encoding="utf-8"))


def ecrire(dossier, doc):
    with open(os.path.join(dossier, f"{slug(doc['name'])}_{doc['_id']}.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)


def modele(dossier, pred):
    for f in sorted(os.listdir(dossier)):
        d = lire(dossier, f)
        if pred(d):
            return d
    raise SystemExit(f"modèle introuvable dans {dossier}")


def dossier_compendium(dossier, nom, sort, cle):
    m = copy.deepcopy(modele(dossier, lambda d: d["_key"].startswith("!folders!")))
    fid = ident("dossier", cle)
    m.update({"_id": fid, "_key": f"!folders!{fid}", "name": nom, "sort": sort, "folder": None})
    ecrire(dossier, m)
    return fid


# --------------------------------------------------------------------------------------------
# Avantages (p. 87-88)
# --------------------------------------------------------------------------------------------
AVANTAGES = [
    {
        "name": "Versé dans les arcanes", "cout": "-4 à -7 PC", "page": 87,
        "options": [("Une Voie", -4), ("Deux Voies", -6), ("Trois Voies", -7)],
        "prerequis": "Prêtre d'une religion (profession donnant accès à des Voies d'illumination).",
        "description": [
            "Donne un vrai pouvoir sacré : sans cet Avantage, le prêtre ne peut que célébrer sa divinité et doit accomplir une quête avant d'être touché par le divin.",
            "Le personnage est Initié à toutes les Voies de sa religion indiquées à la création (le nombre de Voies n'est pas un choix) et y débute avec 1 en Foi / Connaissance des mystères. Il peut célébrer les divinités et accomplir des Rituels.",
            "Vaudou : le houngan ou la mambo n'a accès qu'à trois Voies, choisies par le MJ, et connaît dans chacune un Pouvoir de Puissance 1 choisi (ou tiré) par le MJ.",
        ],
    },
    {
        "name": "Touché par le divin", "cout": "-3 PC", "page": 87,
        "prerequis": "Versé dans les arcanes ; fidèle d'une religion ; personnage non prêtre.",
        "description": [
            "Le personnage est touché par le divin sans exercer de sacerdoce : il n'a pas d'obligations envers des fidèles, mais en a envers sa divinité et l'humanité.",
            "Les modificateurs d'Auspices dus à la Beauté des rites (bonus comme malus) sont divisés par deux, arrondis à l'inférieur.",
            "Il ne peut pas célébrer la divinité seul : il participe à la cérémonie d'un véritable prêtre, ce qui améliore tout de même les Auspices de son Rituel.",
            "Il n'est pas possible d'être Touché par le divin avec la seule Voie de la Cartomancie.",
        ],
    },
    {
        "name": "Objet de pouvoir", "cout": "Variable", "page": 87, "variable": True,
        "description": [
            "Le joueur choisit le nombre de PC investis et la forme de l'objet (pipe, récipient, paquet-kongo, chapelet, eau bénite, ossements d'un ancêtre…).",
            "Le MJ choisit en secret le Pouvoir contenu (Voie de la religion du prêtre ; n'importe quelle Voie pour les zémis et les objets enchantés) et répartit les PC entre la Puissance du Pouvoir, la Fréquence d'utilisation et la Durée d'activation (table p. 88). Le joueur ne connaît que la Durée d'activation et les Rites.",
            "Si le personnage doit trouver lui-même les Rites, le coût de l'objet diminue de 3 PC. Les paramètres du Pouvoir sont ceux du Pouvoir divin.",
            "Exemple du livre (6 PC) : « bon juju, mauvais juju » (Puissance 2 : 1 PC), une fois par semaine (3 PC), activation de trente minutes (2 PC).",
        ],
    },
    {
        "name": "Affinité", "cout": "-1 PC", "page": 88, "multiple": True,
        "prerequis": "Prêtre d'une religion.",
        "description": [
            "Affinité pour une Voie de sa religion (dans le vaudou, le lwa racine, transmis des parents aux enfants) : attachement mystique et parfaite connaissance de la divinité associée.",
            "Rend plus favorables les Auspices des Rituels et des Transes dans cette Voie. Reportez-la dans le champ Affinité de la Voie, onglet Magie.",
        ],
    },
    {
        "name": "Initié", "cout": "-2 PC par point", "page": 88, "multiple": True,
        "prerequis": "Versé dans les arcanes.",
        "description": [
            "+1 en Foi / Connaissance des mystères dans une seule Voie d'illumination de sa religion, pour 2 PC.",
            "Deux fois au plus par Voie : la Foi / Connaissance des mystères est ainsi limitée à 3 à la création.",
        ],
    },
]


def avantages():
    base = modele(AV, lambda d: d.get("type") == "avantage" and d["system"].get("nature") == "avantage")
    fid = dossier_compendium(AV, "Magie (Entre ciel et terre)", 700000, "avantages-magie")
    for i, a in enumerate(AVANTAGES):
        d = copy.deepcopy(base)
        iid = ident("avantage", a["name"])
        d.update({"_id": iid, "_key": f"!items!{iid}", "name": a["name"], "folder": fid, "sort": (i + 1) * 100, "effects": [], "flags": {}})
        d["img"] = base["img"]
        s = d["system"]
        s.update({
            "description": "".join(f"<p>{e(p)}</p>" for p in a["description"]),
            "source": f"{SOURCE}, p. {a['page']}", "nature": "avantage", "categorie": "Magie", "cout": a["cout"],
            "modificateurs": "", "pc": None, "choix": "", "variable": a.get("variable", False), "maxPc": 0,
            "multiple": a.get("multiple", False), "effet": "", "escrimeType": "", "prerequis": a.get("prerequis", ""),
            "options": [{"label": l, "pc": pc, "modificateurs": ""} for l, pc in a.get("options", [])],
        })
        ecrire(AV, d)
    return len(AVANTAGES)


# --------------------------------------------------------------------------------------------
# PNJ : zombie et fées
# --------------------------------------------------------------------------------------------
CARACS = ["adr", "ada", "cha", "res", "eru", "exp", "for", "per", "pou"]   # ordre des blocs du livre
TOUJOURS = "Toujours activé en tant que fée"
FLETRISSURE = ("Fée : invisible aux humains sauf matérialisation ; chaque rencontre avec un groupe incrédule la flétrit d'un niveau "
               "(plus de cinq incrédules : un niveau par tour et par personne au-delà de la première). Elle meurt après 2 niveaux "
               "(fée mineure), 4 (majeure) ou 6 (extraordinaire). Voir la Voie du Folklore, p. 256.")

FEES = [
    ("Banshee", 257, "6 8 5 6 6 3 6 9 8", "Fée Majeure des Forêts et des Villes", [
        ("Mineur", "Angoisse", "Voix", "Eux", "1 cycle", "Un son guttural plonge ceux qui l'entendent dans une angoisse atroce : ils cherchent à se cacher, sans pour autant renoncer à défendre leur vie."),
        ("Majeur", "Cri de mort", "Voix", "Eux", "1 cycle ou Permanent", "Cri en trois temps entendu jusqu'à l'horizon, qui glace l'âme et peut arrêter les cœurs fragiles ; se boucher les oreilles n'y change rien. Un seul cri par jour.")]),
    ("Basilic", 257, "5 5 4 9 4 3 8 5 5", "Fée Majeure des Forêts", [
        ("Mineur", "Caméléon", "Personnelle", "Moi", TOUJOURS, "Se fond dans les couleurs de la forêt ; immobile, il devient presque invisible."),
        ("Majeur", "Regard pétrifiant", "Vue", "Lui", "Permanent", "Change en pierre les personnes proches qu'il regarde ; elles peuvent résister quelques dizaines de secondes.")]),
    ("Chimère", 257, "9 8 4 6 5 4 6 6 6", "Fée Majeure des Forêts, des Villes et des Déserts", [
        ("Mineur", "Rêves", "Là-bas", "Vous", "1 nuit", "Influence les rêves et communique avec les rêveurs."),
        ("Majeur", "Illusions", "Vue/Voix/Ouïe", "Lui", "1 h", "Illusions nourries des connaissances de la cible, donc très crédibles.")]),
    ("Dame Blanche", 257, "6 7 8 4 6 7 3 9 5", "Fée Majeure des Forêts et des Villes", [
        ("Mineur", "Tristesse", "Vue/Voix", "Lui", "1 mois", "Communique une tristesse infinie et sans objet, à laquelle la victime finit par trouver une raison personnelle."),
        ("Majeur", "Intangible", "Personnelle", "Moi", TOUJOURS, "Esprit translucide et intangible ; la traverser donne des frissons inquiétants.")]),
    ("Dame Cygne", 258, "7 6 7 5 9 8 4 6 8", "Fée Majeure des Forêts", [
        ("Mineur", "Métamorphose", "Personnelle", "Moi", TOUJOURS, "Passe à volonté de la forme de cygne à celle de femme, en une dizaine de secondes."),
        ("Majeur", "Sorcière", "Vue", "Lui", "1 mois", "Pouvoirs immenses : métamorphose, esprit, soins et liens entre les êtres vivants.")],
        "Peut être rencontrée sous forme humaine, visible de tous et sans flétrissure."),
    ("Dame Noire", 258, "7 5 1 6 7 9 8 5 6", "Fée Majeure des Forêts et des Villes", [
        ("Mineur", "Griffes noires", "Toucher", "Lui", "Jusqu'à guérison", "Griffes suppurantes de dix centimètres : les blessures causent une douleur atroce, proportionnelle à leur gravité."),
        ("Majeur", "Noirceur", "Voix", "Lui", "1 mois", "Ne crée pas de mauvais sentiments mais libère les pulsions inavouables.")]),
    ("Dame Rouge", 258, "8 7 9 7 5 7 3 7 7", "Fée Majeure des Forêts et des Villes", [
        ("Mineur", "Désir", "Vue/Voix", "Lui", TOUJOURS, "Les « succubes » : suscitent un désir irrépressible, sous la forme qui touche le plus la victime."),
        ("Majeur", "Repas sexuel", "Acte sexuel", "Lui", "Lune", "Se repaît du plaisir de la victime et accroît ainsi son Charisme et sa Résistance.")]),
    ("Dragon", 258, "8 5 8 20 9 7 13 8 10", "Fée Extraordinaire des Déserts et des Forêts", [
        ("Mineur", "Carapace magique", "Personnelle", "Moi", TOUJOURS, "Seules les armes naturelles des fées et les armes chimériques le blessent ; ses écailles ne le protègent pas de l'incrédulité, et sa taille l'expose aux regards."),
        ("Majeur", "Souffle draconien", "Là", "Eux", TOUJOURS, "Flammes, venin et acide : brûle et décompose matières vivantes et inertes."),
        ("Extraordinaire", "Pouvoirs draconiens", "Là", "Toi", TOUJOURS, "Immunisé contre toute magie ; maîtrise les quatre éléments ; prend à volonté sa propre forme humaine ; déplace et assemble les objets par la volonté.")],
        "Écailles : protection 4 sur toutes les localisations. Peut être rencontré sous forme humaine, visible de tous et sans flétrissure.", 4),
    ("Elfe", 259, "7 7 8 5 6 7 4 7 6", "Fée Mineure des Forêts", [
        ("Mineur", "Paix", "Vue/Voix", "Vous", TOUJOURS, "Sa seule présence efface rancœur, violence et haine.")]),
    ("Gremlin", 259, "6 6 3 5 4 5 4 6 4", "Fée Mineure des Villes", [
        ("Mineur", "Dérèglement", "Toucher", "Lui", "Permanent", "Un mécanisme touché devient imprévisible et dangereux : le fusil change de cible, le navire n'obéit plus.")]),
    ("Homme-arbre", 259, "5 5 4 15 4 3 8 5 5", "Fée Majeure des Forêts", [
        ("Mineur", "Forêt hantée", "Personnelle", "Moi", TOUJOURS, "Prend l'apparence d'un arbre ordinaire ; de la nuit à l'aube, fait apparaître yeux phosphorescents, bouches et bras décharnés pour effrayer."),
        ("Majeur", "Multiples bras", "Personnelle", "Moi", TOUJOURS, "Ses branches, non préhensiles, font trébucher, fouettent et retiennent bras et jambes.")]),
    ("Hydre", 259, "7 9 6 12 5 2 9 5 6", "Fée Extraordinaire des Marais et des Mers", [
        ("Mineur", "Venin", "Toucher", "Lui", "Minute", "Morsure paralysante ; paralysé au torse, on meurt asphyxié faute de résister."),
        ("Majeur", "Régénération des membres", "Personnelle", "Moi", TOUJOURS, "Les têtes tranchées repoussent en moins d'une minute : seule la décapitation simultanée des neuf têtes la tue."),
        ("Extraordinaire", "Fusion", "Ici", "Moi", "Minute", "Les têtes tranchées non tenues séparées fusionnent en quelques minutes en une nouvelle Hydre identique.")],
        "Neuf têtes attaquent à la fois. Au corps à corps, 1d10 donne la tête touchée ; sur 10, le coup frappe le corps sans dommages."),
    ("Léviathan", 259, "2 3 12 20 6 0 20 7 9", "Fée Extraordinaire des Mers", [
        ("Mineur", "Celui qui caresse la surface", "Là", "Toi", "1 h", "Maîtrise le vent, sans pouvoir déclencher tornade ni forte tempête."),
        ("Majeur", "Engouffrer", "Personnelle", "Moi", TOUJOURS, "Avale n'importe quoi, d'un navire à un château, et le digère pendant des siècles ; son estomac abrite villes et flottes peuplées."),
        ("Extraordinaire", "Lame de fond", "Là-bas", "Lui", TOUJOURS, "Contrôle toute la puissance de l'océan ; un raz-de-marée par siècle seulement.")],
        "Résistance et Force titanesques (20 sur la fiche, à ajuster par le MJ)."),
    ("Licorne", 260, "6 6 7 7 7 4 6 6 7", "Fée Majeure des Forêts", [
        ("Mineur", "Soins", "Toucher", "Lui", "Permanent", "Sa corne soigne n'importe quelle blessure, mais ne ressuscite pas et n'efface pas les séquelles anciennes."),
        ("Majeur", "Aveuglement", "Ici", "Eux", TOUJOURS, "Qui l'approche avec de mauvaises intentions est aveuglé par sa bonté tant qu'il reste près d'elle.")]),
    ("Loup-garou (fée du folklore européen)", 260, "7 7 3 8 5 3 8 8 7", "Fée Majeure des Forêts", [
        ("Mineur", "Métamorphose", "Personnelle", "Moi", "1 nuit", "La nuit, forme mi-loup mi-homme, guidée par l'instinct, sans souvenir à l'aube ; la terreur qu'il inspire le protège de l'incrédulité."),
        ("Majeur", "Malédiction", "Morsure", "Lui", "Jusqu'à la mort du Loup-garou", "La lycanthropie se transmet par la morsure (la victime est en général dévorée).")],
        "Version européenne du folklore, sans rapport avec le loup-garou vaudou (vampire) de la Voie des Guédés. Le jour, sous forme humaine, il est visible de tous et sans flétrissure."),
    ("Lutin", 260, "7 6 6 4 5 6 2 6 5", "Fée Mineure des Forêts", [
        ("Mineur", "Dissimulation", "Personnelle", "Moi", "Minute", "Invisible même aux autres fées, quoi qu'il fasse ; en profite pour leur chiper de petits objets.")]),
    ("Méduse", 260, "6 5 2 11 5 7 7 5 8", "Fée Majeure des Déserts", [
        ("Mineur", "Cheveux de vermine", "Personnelle", "Moi", TOUJOURS, "Chevelure de serpents venimeux qui mordent à un mètre (un demi-mètre pour les aspics), comme des serpents ordinaires."),
        ("Majeur", "Pétrification", "Vue (vue par la cible)", "Eux", "Permanent", "Qui la regarde longuement, alors qu'elle en est consciente, se change lentement en pierre ; résistance possible, transformation irréversible sauf décision du MJ.")]),
    ("Nymphe", 261, "7 7 9 4 5 4 3 7 6", "Fée Majeure des Forêts", [
        ("Mineur", "Charme", "Vue/Voix", "Lui", TOUJOURS, "Aucun homme ne la voit sans tomber sous le charme : il oublie tout et court la rejoindre."),
        ("Majeur", "Amour extatique", "Vue", "Lui", "Permanent (mort) et une Lune (avantages)", "Les amoureux les plus faibles mentalement meurent de bonheur ; la Nymphe en resplendit une lune et son charme grandit. Une sorcière doit être sous forme de Nymphe, sauf Charisme 8 ou plus.")]),
    ("Ogre", 261, "3 2 2 11 3 3 10 4 3", "Fée Majeure des Forêts et des Déserts", [
        ("Mineur", "Coup de force", "Toucher", "Lui", "Colère", "En colère, réussit automatiquement tout tour de force (lancer un rocher, arracher un arbre, déchirer un homme)."),
        ("Majeur", "Chair fraîche", "Ingestion", "Lui", "Lune", "Dévorer un homme cru accroît sa force et sa résistance pendant une lune ; pour en obtenir, il perd tout bon sens.")]),
    ("Otarin", 261, "5 6 6 5 5 5 5 7 6", "Fée Mineure des Mers", [
        ("Mineur", "Métamorphose", "Personnelle", "Moi", TOUJOURS, "Passe d'humain à phoque, et inversement, en quelques secondes.")]),
    ("Pégase", 261, "7 6 7 9 7 5 7 6 6", "Fée Mineure des Forêts", [
        ("Mineur", "Amitié", "Vue/Voix/Ouïe", "Eux", TOUJOURS, "Nul ne cherche volontairement à le blesser, même monté par un cavalier hostile ; sans effet sur les autres fées.")]),
    ("Pillywinggy", 261, "9 6 10 1 5 5 1 6 4", "Fée Mineure des Forêts", [
        ("Mineur", "Adorable", "Vue/Voix/Ouïe", "Eux", TOUJOURS, "Hommes, animaux et fées le contemplent des journées entières sans le déranger ; blesser un Pillywinggy attire une funeste malédiction.")]),
    ("Pooka", 262, "6 7 6 5 5 7 5 6 5", "Fée Mineure des Forêts et des Villes", [
        ("Mineur", "Métamorphose", "Personnelle", "Moi", TOUJOURS, "Se change instantanément en humain ou en n'importe quel animal inoffensif, du lapin à la vache.")]),
    ("Sirène", 262, "6 6 8 6 6 9 4 8 8", "Fée Majeure des Mers", [
        ("Mineur", "Écume", "Là-bas", "Moi", "Minute", "Se fond dans l'écume et réapparaît à quelques milles nautiques, d'où leur présence près des récifs et des côtes."),
        ("Majeur", "Chant des Sirènes", "Voix", "Eux", "Durée du chant", "Tout homme qui l'entend, sauf solidement attaché, plonge la rejoindre et lui obéit tant qu'elle chante, puis lui reste attaché à vie.")]),
]


def acteur(base, nom, caracs, notes, role, importance, folder, sort, img, competences=None, protection=None):
    d = copy.deepcopy(base)
    aid = ident("pnj", nom)
    d.update({"_id": aid, "_key": f"!actors!{aid}", "name": nom, "folder": folder, "sort": sort, "img": img,
              "items": [], "effects": [], "flags": {}})
    s = d["system"]
    for k, v in caracs.items():
        s["caracs"][k]["value"] = v
    for k in s["skills"]:
        s["skills"][k]["value"] = (competences or {}).get(k, 0)
        s["skills"][k]["xp"] = False
    s["specs"] = {}
    s["notes"] = notes
    s["role"] = role
    s["importance"] = importance
    for loc in s["sante"]["loc"].values():
        loc["coches"] = 0
        loc["protection"] = protection or 0
    return d


def pnj():
    base = modele(PNJ, lambda d: d.get("type") == "pnj" and d["name"] == "Crocodile")
    fid = dossier_compendium(PNJ, "Surnaturel (Entre ciel et terre)", 600000, "pnj-surnaturel")
    zombie = acteur(base, "Zombie", {"adr": 4, "res": 8, "for": 7, "ada": 3, "eru": 5, "per": 5, "cha": 4, "exp": 1, "pou": 7},
        "<p>Mort ramené par un grand houngan pour le servir : lent, maladroit, articulations raides, mais redoutable au combat.</p>"
        "<ul><li>Aucun malus de douleur ; invulnérable aux armes perforantes ; détruit par cinq niveaux de dommages sur une même localisation.</li>"
        "<li>Comédie (faire le mort) 5 ; Combat à mains nues 3, deux attaques par tour (griffes, dégâts +3).</li>"
        "<li>Griffes : la localisation blessée noircit. Test de Résistance, sinon Test de contraction de maladie : bras ou jambes, gangrène ; torse, peste ; tête, fièvre jaune.</li></ul>"
        f"<p><em>{SOURCE}, p. 76.</em></p>",
        "Mort-vivant (vaudou)", "mineure", fid, 100, "systems/pavillon-noir-2/assets/icons/pnj.svg",
        competences={"comedie": 5, "mainsNues": 3})
    ecrire(PNJ, zombie)
    # Loup-garou vaudou : un houngan habité en permanence par un lwa Guédé (+2 dans toutes les Caractéristiques)
    houngan = modele(PNJ, lambda d: d.get("type") == "pnj" and d["name"] == "Houngan vaudou")
    hs = houngan["system"]
    vampire = acteur(houngan, "Loup-garou vaudou (vampire)", {k: v["value"] + 2 for k, v in hs["caracs"].items()},
        "<p><strong>Version vaudou</strong>, à ne pas confondre avec le loup-garou du folklore européen (fée de la Voie du Folklore) : "
        "c'est un vampire, un houngan habité en permanence par un lwa Guédé. Sa soif insatiable le pousse à sucer le sang, "
        "qui lui donne des pouvoirs extraordinaires (créer des zombies à volonté) mais lui fait commettre des actes atroces.</p>"
        "<ul><li>Caractéristiques : celles du Houngan vaudou, +2 partout.</li>"
        "<li>Pouvoirs : tous les pouvoirs les plus destructeurs des Guédés et de Baron Samedi (compendium des Pouvoirs, Voie des Guédés), "
        "dont « Loup-garou » (Puissance 10).</li></ul>"
        f"<p><em>{SOURCE}, p. 76 et 290-295.</em></p>",
        "Mort-vivant (vaudou)", "majeure", fid, 150, houngan["img"],
        competences={k: v["value"] for k, v in hs["skills"].items()})
    vampire["system"]["specs"] = copy.deepcopy(hs.get("specs", {}))
    vampire["system"]["facilites"] = copy.deepcopy(hs["facilites"])
    vampire["items"] = copy.deepcopy(houngan.get("items", []))
    ecrire(PNJ, vampire)
    for i, (nom, page, valeurs, categorie, pouvoirs, *extra) in enumerate(FEES):
        note = extra[0] if extra else ""
        protection = extra[1] if len(extra) > 1 else None
        caracs = dict(zip(CARACS, map(int, valeurs.split())))
        lignes = "".join(f"<li><strong>{rang} — {e(p)}</strong> (Portée : {e(po)} ; Cible : {e(ci)} ; Durée : {e(du)}) : {e(t)}</li>"
                         for rang, p, po, ci, du, t in pouvoirs)
        notes = (f"<p><strong>{e(categorie)}.</strong>{' ' + e(note) if note else ''}</p><ul>{lignes}</ul>"
                 f"<p>{e(FLETRISSURE)}</p><p><em>{SOURCE}, p. {page}.</em></p>")
        importance = "capitale" if "Extraordinaire" in categorie else "majeure" if "Majeure" in categorie else "moyenne"
        ecrire(PNJ, acteur(base, nom, caracs, notes, categorie, importance, fid, (i + 2) * 100,
                           "systems/pavillon-noir-2/assets/icons/animal.svg", protection=protection))
    return 2 + len(FEES)


if __name__ == "__main__":
    print(avantages(), "avantages ;", pnj(), "PNJ")

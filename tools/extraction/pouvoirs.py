"""Analyse des Pouvoirs du chapitre 5 d'Entre ciel et terre (p. 171-312) à partir des colonnes de pdftotext -layout."""
import json
import re
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colonnes2 import colonnes

# Titres des Voies tels qu'imprimés (ligne seule), et page de début (table des matières)
VOIES = [
    ("Voie d'Ichéiricou pour la guerre", 171, ["Voie d'Ichéiricou", "pour la guerre"]),
    ("Voie d'Ichéiricou pour le conseil", 176, ["Voie d'Ichéiricou", "pour le conseil"]),
    ("Voie d'Ichéiricou pour la protection et la punition", 180, ["Voie d'Ichéiricou", "pour la protection"]),
    ("Voie des Xapiripë", 185, ["Voie des Xapiripë"]),
    ("Voie des Zémis", 191, ["Voie des Zémis"]),
    ("Voie du Calendrier", 199, ["Voie du Calendrier"]),
    ("Voie des Cinq Soleils", 203, ["Voie des Cinq Soleils"]),
    ("Voie de Dieu", 209, ["Voie de Dieu"]),
    ("Voie des Sephiroth", 214, ["Voie des Sephiroth"]),
    ("Voie des Qlipoth", 229, ["Voie des Qlipoth", "Voie des Qliphoth"]),
    ("Voie du Druidisme", 248, ["Voie du Druidisme"]),
    ("Voie du Folklore", 256, ["Voie du Folklore"]),
    ("Voie de la Cartomancie", 269, ["Voie de la Cartomancie"]),
    ("Voie d'Agwé", 276, ["Voie d'Agwé"]),
    ("Voie de Dambala", 279, ["Voie de Dambala"]),
    ("Voie d'Erzulie", 285, ["Voie d'Erzulie"]),
    ("Voie des Guédés", 290, ["Voie des Guédés"]),
    ("Voie de Papa Legba", 295, ["Voie de Papa Legba"]),
    ("Voie des Frères Marassa", 300, ["Voie des Frères Marassa"]),
    ("Voie d'Ogou", 304, ["Voie d'Ogou"]),
    ("Voie de Cousin Zaka", 308, ["Voie de Cousin Zaka"]),
]
FIN = 313
# Pages descriptives sans Pouvoirs : mode d'emploi du calendrier, fées du Folklore
EXCLUES = set(range(196, 199)) | set(range(256, 262))

PARASITES = re.compile(r"^(V : Voies et pouvoirs|Voies (de la religion|des religions|du Vaudou|de la Kabbale)[^.]*|Autres religions et|traditions européennes|et mayas|Chapitre ?5|\d{3})$")
TITRE = re.compile(r"^(\d{1,2})\s*[\xad\u2013\u2014-]\s+(\S.*)$")
ATTRIBUTS = {"Aspect", "Heure", "Jours", "Couleurs/Cristal", "Prière", "Attribut", "Démon", "Ange", "Chœur", "Choeur"}


def nettoyer(l):
    l = l.replace("\xa0", " ").strip()
    # texte de marge (numéro de page, titre courant) collé devant le texte de la colonne
    m = re.match(r"^(.*?)\s{2,}(\S.*)$", l)
    if m and PARASITES.match(m.group(1)):
        l = m.group(2)
    # fragment de l'autre colonne collé en fin de ligne : « … texte · Débu »
    # débris de l'autre colonne : puce, titre de Pouvoir ou « Portée » collés en milieu de ligne
    for motif, depart in ((r"\S\s+·(\s|$)", 1), (r"[^\s=]\s+\d{1,2}\s*\xad\s", 1), (r"\S\s+Port(ée)?(\s|$|\s*:)", 4)):
        m = re.compile(motif).search(l, depart)
        if m:
            l = l[:m.start() + 1]
    l = re.sub(r"\s{3,}.*$", "", l)          # texte de marge séparé par une large espace
    l = re.sub(r"^[.,;:]\s+", "", l)          # débris de ponctuation en tête
    return l.strip()


def flux():
    """Lignes du chapitre, colonne gauche puis droite, page par page, avec la page."""
    for n in range(171, FIN):
        if n in EXCLUES:
            yield n, "@@COUPURE@@"
            continue
        g, d = colonnes(n)
        for l in g + d:
            l = nettoyer(l)
            if l and not PARASITES.match(l):
                yield n, l


def joindre(a, b):
    """Joint deux lignes en gérant la césure (« pé-» + « riodes »)."""
    if a.endswith("-") and b[:1].islower():
        return a[:-1] + b
    return f"{a} {b}"


def page_voie(n):
    v = VOIES[0][0]
    for nom, debut, _ in VOIES:
        if n >= debut:
            v = nom
    return v


def titre_voie(lignes, i, voie_actuelle):
    """Nom de la Voie dont le titre commence à la ligne i (ou None)."""
    n, l = lignes[i]
    suivante = lignes[i + 1][1] if i + 1 < len(lignes) else ""
    for nom, debut, alias in VOIES:
        if nom == voie_actuelle or n < debut - 1 or n > debut + 1:
            continue
        if len(alias) == 2 and alias[0] == "Voie d'Ichéiricou":
            proches = [lignes[k][1] for k in range(i + 1, min(i + 6, len(lignes)))]
            if l.startswith(alias[0]) and any(x.startswith(alias[1]) for x in proches):
                return nom
        elif any(l == a or l.startswith(a + " ") and len(l) < len(a) + 4 for a in alias):
            return nom
    return None


def analyser():
    pouvoirs = []
    courant = None
    zone = None
    lignes = list(flux())
    voie = VOIES[0][0]
    i = 0
    while i < len(lignes):
        n, l = lignes[i]
        if courant and zone == "titre":
            # paramètres dont le début a été mangé par la gouttière ou précédé d'un débris
            m = re.match(r"^[^A-Za-zÀ-ÿ]{0,3}\w{0,2},?\s*(Portée\s*:.*)$", l)
            if m:
                l = m.group(1)
            elif re.match(r"^-?bas\s*;\s*Cible", l):
                l = "Portée : Là-" + l.lstrip("-")
            elif re.match(r"^[A-Za-zé]{0,5}\s*:\s*[^;:]+;\s*Cible\s*:", l):
                l = "Portée : " + l.split(":", 1)[1].strip()
        nouvelle = titre_voie(lignes, i, voie)
        attendue = page_voie(n)
        if not nouvelle and attendue != voie and n >= next(d for nm, d, _ in VOIES if nm == attendue) + 1:
            nouvelle = attendue
        if nouvelle:
            voie = nouvelle
            if courant:
                pouvoirs.append(courant)
                courant = None
            i += 1
            continue
        # Coupure : page descriptive ou changement de Voie
        if l == "@@COUPURE@@" or (courant and voie != courant["voie"]):
            if courant:
                pouvoirs.append(courant)
                courant = None
            if l == "@@COUPURE@@":
                i += 1
                continue
        m = TITRE.match(l)
        if m and int(m.group(1)) <= 10:
            if courant:
                pouvoirs.append(courant)
            titre = m.group(2)
            # nom natif sur plusieurs lignes (au plus deux, jamais au-delà des paramètres)
            suite = lambda: i + 1 < len(lignes) and not lignes[i + 1][1].startswith(("Portée", "·", "@@")) and not TITRE.match(lignes[i + 1][1])
            for _ in range(2):
                if titre.count("(") > titre.count(")") and suite():
                    i += 1
                    titre = joindre(titre, lignes[i][1])
            # titre sur plusieurs lignes : la suite commence par une minuscule ou par le nom natif
            for _ in range(4):
                if "(" in titre or not suite() or not re.match(r"^[(a-zàâçéèêëîïôûü]", lignes[i + 1][1]):
                    break
                i += 1
                titre = joindre(titre, lignes[i][1])
            if "(" in titre:
                for _ in range(2):
                    if titre.count("(") > titre.count(")") and suite():
                        i += 1
                        titre = joindre(titre, lignes[i][1])
            if titre.count("(") > titre.count(")"):
                titre += ")"
            mm = re.match(r"^(.*?)\s*\((.*)\)\s*$", titre)
            nom, natif = (mm.group(1), mm.group(2)) if mm else (titre, "")
            courant = {"voie": voie, "page": n, "puissance": int(m.group(1)), "nom": nom.strip(), "nomNatif": re.sub(r"\s+", " ", natif).strip(),
                       "parametres": "", "texte": [], "visions": [], "compulsions": "", "attributs": {}}
            zone = "titre"
        elif courant is None:
            pass
        elif l.startswith("Portée") and zone == "titre":
            p = l
            while "Durée" not in p or not p.rstrip().endswith("."):
                if i + 1 >= len(lignes) or lignes[i + 1][1].startswith("·"):
                    break
                i += 1
                p = joindre(p, lignes[i][1])
            courant["parametres"] = p
            zone = "texte"
        elif l.startswith("·"):
            contenu = l.lstrip("· ").strip()
            ma = re.match(r"^([A-ZÉÈÀa-zéèêûôçœ/]+)\.\s*(.*)$", contenu)
            if contenu.startswith("Visions"):
                zone = "visions"
                reste = contenu[len("Visions"):].lstrip(". ").strip()
                if reste:
                    courant["visions"].append(reste)
            elif contenu.startswith("Compulsions"):
                courant["compulsions"] = contenu[len("Compulsions."):].strip()
                zone = "compulsions"
            elif ma and ma.group(1) in ATTRIBUTS:
                courant["attributs"][ma.group(1)] = ma.group(2)
                zone = ("attribut", ma.group(1))
            elif zone in ("visions",):
                courant["visions"].append(contenu)
            else:
                courant["visions"].append(contenu)
                zone = "visions"
        else:
            # suite de la ligne précédente ; au-delà d'une phrase complète déjà longue, c'est la prose de la page suivante
            if zone in ("visions", "compulsions"):
                dernier = courant["visions"][-1] if zone == "visions" and courant["visions"] else courant["compulsions"]
                if len(dernier) > 200 and dernier.rstrip().endswith(".") and l[:1].isupper():
                    zone = "hors"
            if zone == "visions" and courant["visions"]:
                courant["visions"][-1] = joindre(courant["visions"][-1], l)
            elif zone == "compulsions":
                courant["compulsions"] = joindre(courant["compulsions"], l) if courant["compulsions"] else l
            elif isinstance(zone, tuple):
                courant["attributs"][zone[1]] = joindre(courant["attributs"][zone[1]], l)
            elif zone == "texte":
                courant["texte"].append(l)
        i += 1
    if courant:
        pouvoirs.append(courant)
    return pouvoirs


def titres_bruts():
    """Titres « N ­ Nom (natif) » tels que pdftotext les extrait en mode brut (bonne casse, mots corrects)."""
    import subprocess
    brut = subprocess.run(['pdftotext', '-f', '171', '-l', str(FIN - 1), 'Pavillon Noir 2/Entre ciel et terre.pdf', '-'], capture_output=True).stdout.decode('latin-1')
    lignes = [l.strip() for l in brut.splitlines()]
    out = {}
    for k, l in enumerate(lignes):
        m = TITRE.match(l)
        if not m:
            continue
        t = m.group(2)
        j = k
        while t.count("(") > t.count(")") and j + 1 < len(lignes) and j < k + 2:
            j += 1
            t = joindre(t, lignes[j])
        if "(" not in t and j + 1 < len(lignes) and lignes[j + 1].startswith("("):
            t = joindre(t, lignes[j + 1])
        out.setdefault(cle_lettres(t), t)
    return out


def cle_lettres(t):
    return re.sub(r"[^a-zàâäçéèêëîïôöùûüÿœ]", "", t.lower())


def titres_pypdf():
    """Titres de l'extraction pypdf : mots séparés par deux espaces, coupures internes par une espace."""
    import colonnes as cp
    out = {}
    for l in "\n".join(cp.colonnes(n) for n in range(171, FIN)).splitlines():
        m = re.match(r"^\s*(\d{1,2})\s*[–­-]\s*(.+)$", l.strip())
        if not m:
            continue
        t = m.group(2)
        nom, _, natif = t.partition("(")
        mots = [w.replace(" ", "") for w in re.split(r"\s{2,}", nom.strip()) if w.strip()]
        propre = " ".join(mots).lower()
        propre = propre[:1].upper() + propre[1:]
        out.setdefault(cle_lettres(nom), propre)
    return out


def recoller(t):
    """Recolle un texte aux lettres espacées (« h i l a c ay e u » → « hilacayeu »)."""
    return re.sub(r"\s+", "", t) if re.search(r"(\w{1,2}\s+){3,}", t) else t


def corriger_titre(p, bruts):
    """Remplace un titre aux lettres espacées par sa version brute correcte."""
    complet = f"{p['nom']} ({p['nomNatif']})" if p["nomNatif"] else p["nom"]
    if not re.search(r"(\w\s+){3,}", complet):
        return
    t = bruts.get(cle_lettres(complet))
    if not t:
        nom = TITRES_PYPDF.get(cle_lettres(p["nom"]))
        if nom and re.search(r"(\w{1,2}\s+){3,}", p["nom"]):
            p["nom"] = nom
        p["nomNatif"] = recoller(p["nomNatif"])
        return
    mm = re.match(r"^(.*?)\s*\((.*)\)\s*$", t)
    p["nom"], p["nomNatif"] = (mm.group(1).strip(), mm.group(2).strip()) if mm else (t.strip(), "")


def textes(p, C):
    """Nettoie visions et compulsions : compulsions collées dans une vision, prose et débris de l'autre colonne."""
    vis = []
    for v in p["visions"]:
        m = re.search(r"\s(?:\w{0,5}lsions|sions)\.\s+(.*)$", v)
        if m:
            if not p["compulsions"]:
                p["compulsions"] = m.group(1)
            v = v[:m.start()]
        v = re.sub(r"\s*Exemple de description de vision.*$", "", v)
        vis.append(v)
    p["visions"] = vis
    for nom, faux, juste in C.REMPLACEMENTS:
        if p["nom"] == nom:
            p["visions"] = "\n".join(p["visions"]).replace(faux, juste).replace("|", "\n").split("\n")
            p["compulsions"] = p["compulsions"].replace(faux, juste)
    marque = C.COUPES.get(p["nom"])
    if marque:
        p["visions"] = [v.split(marque)[0] for v in p["visions"]]
        p["compulsions"] = p["compulsions"].split(marque)[0]
    p["visions"] = [re.sub(r"\s+", " ", v).strip() for v in p["visions"] if v.strip()]
    p["compulsions"] = re.sub(r"\s+", " ", p["compulsions"]).strip()


def parametres(p):
    """Sépare « Portée : X ; Cible : Y ; Durée : Z. »."""
    out = {"portee": "", "cible": "", "duree": ""}
    s = re.sub(r"\s+", " ", p.replace("\xa0", " "))
    s = re.sub(r"\s*(V : Voies et pouvoirs|Voies (de la religion|des religions|du Vaudou)( [a-zéèêïë]+)*( du livre| aztèques et mayas)?|Autres religions et traditions européennes)\s*", " ", s)
    s = re.sub(r"(\w)- (\w)", r"\1\2", s)                      # césure : « Du- rée »
    for cle, mot in (("portee", "Portée"), ("cible", "Cible"), ("duree", "Durée")):
        m = re.search(mot + r"\s*:\s*(.*?)(?:\s*;\s*(?=Portée|Cible|Durée)|\.?\s*$)", s)
        if m:
            out[cle] = m.group(1).strip().rstrip(".")
    return out


if __name__ == '__main__':
    TITRES_PYPDF = titres_pypdf()
    ps = analyser()
    bruts = titres_bruts()
    import corrections as C
    for p in list(ps):
        cle = (p["page"], p["puissance"], p["nom"])
        if cle in C.TITRES:
            nom, natif, *cond = C.TITRES[cle]
            p["nom"], p["nomNatif"] = nom, natif
            if cond:
                p["conditions"] = cond[0]
        else:
            corriger_titre(p, bruts)
        if p["nomNatif"].lower() in C.RELIGIONS_SEULES:
            p["conditions"] = C.RELIGIONS_SEULES[p["nomNatif"].lower()]
            p["nomNatif"] = ""
        cle = (p["page"], p["puissance"], p["nom"])
        if cle in C.PARAMETRES:
            p["parametres"] = C.PARAMETRES[cle]
        if cle in C.SCINDER:
            s = C.SCINDER[cle]
            n = s.get("garder", len(s.get("visions", [])))
            reste = p["visions"][n:]
            nouveau = {**p, "conditions": "", "texte": [], "attributs": dict(p["attributs"]), "visions": reste, "compulsions": p["compulsions"], **s["nouveau"]}
            p["visions"] = s.get("visions", p["visions"][:n])
            p["compulsions"] = s.get("compulsions", p["compulsions"])
            if "attributs" in s:
                p["attributs"] = s["attributs"]
            ps.insert(ps.index(p) + 1, nouveau)
    for p in ps:
        textes(p, C)
        for champ, valeur in C.CHAMPS.get((p["page"], p["puissance"], p["nom"]), {}).items():
            if champ == "attributs+":
                p["attributs"] = {**valeur, **p["attributs"]}
            else:
                p[champ] = valeur
        # le livre emploie le trait d'union conditionnel comme tiret
        for champ in ("nom", "nomNatif", "compulsions"):
            p[champ] = p[champ].replace(" \xad ", " – ").replace("\xad", "-")
        p["visions"] = [v.replace(" \xad ", " – ").replace("\xad", "-") for v in p["visions"]]
    for p in ps:
        p.setdefault("conditions", "")
        for faux, juste in C.DEBRIS_PARAMETRES:
            p["parametres"] = p["parametres"].replace(faux, juste)
        p.update(parametres(p["parametres"]))
    json.dump(ps, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    c = Counter(p["voie"] for p in ps)
    for nom, _, _ in VOIES:
        sans = sum(1 for p in ps if p["voie"] == nom and not p["duree"])
        print(f"{c.get(nom, 0):4d}  {nom}  (sans paramètres : {sans})")
    print(len(ps), "Pouvoirs")

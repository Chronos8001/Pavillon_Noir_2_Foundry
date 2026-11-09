"""Génère le compendium des Pouvoirs (src/packs/pouvoirs) à partir de pouvoirs-brut.json.

Usage (racine du dépôt) : python tools/extraction/pouvoirs_pack.py
Les identifiants sont dérivés de la Voie, de la Puissance et du nom : une regénération garde les mêmes UUID.
"""
import hashlib
import html
import json
import os
import re
import string
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pouvoirs import VOIES  # noqa: E402

SOURCE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pouvoirs-brut.json")
VOIES_PACK = "src/packs/voies"
OUT = "src/packs/pouvoirs"
PREFIXE = "Compendium.pavillon-noir-2.voies.Item."
ALPHA = string.ascii_letters + string.digits
STATS = {"compendiumSource": None, "duplicateSource": None, "coreVersion": "13.345", "systemId": "pavillon-noir-2",
         "systemVersion": "0.7.0", "createdTime": 0, "modifiedTime": 0, "lastModifiedBy": None}
ORDRE_ATTRIBUTS = ["Attribut", "Aspect", "Heure", "Jours", "Couleurs/Cristal", "Prière"]


def ident(*parts):
    """Identifiant Foundry (16 caractères alphanumériques) stable."""
    h = hashlib.sha256("|".join(map(str, parts)).encode()).digest()
    return "".join(ALPHA[b % len(ALPHA)] for b in h[:16])


def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:60]


def cle_voie(nom):
    """Même clé que cleVoie() de module/magie/regles.mjs."""
    s = unicodedata.normalize("NFD", nom)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def description(p):
    e = lambda s: html.escape(s, quote=False)
    parties = []
    if p["visions"]:
        parties.append("<p><strong>Visions</strong></p><ul>" + "".join(f"<li>{e(v)}</li>" for v in p["visions"]) + "</ul>")
    if p["compulsions"]:
        parties.append(f"<p><strong>Compulsions.</strong> {e(p['compulsions'])}</p>")
    attrs = [(k, p["attributs"][k]) for k in ORDRE_ATTRIBUTS if k in p["attributs"]]
    if attrs:
        parties.append("<ul>" + "".join(f"<li><strong>{e(k)}.</strong> {e(v)}</li>" for k, v in attrs) + "</ul>")
    if len(" ".join(p["texte"])) > 40:
        parties.append(f"<p><em>Règles particulières : voir Entre ciel et terre, p. {p['page']}.</em></p>")
    return "".join(parties)


def main():
    pouvoirs = json.load(open(SOURCE, encoding="utf-8"))
    voies = {}
    for f in os.listdir(VOIES_PACK):
        d = json.load(open(os.path.join(VOIES_PACK, f), encoding="utf-8"))
        if d.get("type") == "voie":
            voies[d["name"]] = d
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    dossiers = {}
    for rang, (nom, _, _) in enumerate(VOIES):
        if not any(p["voie"] == nom for p in pouvoirs):
            continue
        fid = ident("dossier", nom)
        dossiers[nom] = fid
        d = {"_id": fid, "_key": f"!folders!{fid}", "name": nom, "type": "Item", "folder": None, "sorting": "m",
             "sort": (rang + 1) * 100000, "color": None, "description": "", "flags": {}, "_stats": STATS}
        with open(os.path.join(OUT, f"{slug(nom)}_{fid}.json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(d, fh, indent=2, ensure_ascii=False)

    vus = set()
    par_voie = {}
    for p in pouvoirs:
        voie = voies[p["voie"]]
        iid = ident("pouvoir", p["voie"], p["puissance"], p["nom"])
        assert iid not in vus, p["nom"]
        vus.add(iid)
        par_voie.setdefault(p["voie"], []).append(p)
        rang = len(par_voie[p["voie"]])
        item = {
            "_id": iid, "_key": f"!items!{iid}", "name": p["nom"], "type": "pouvoir", "img": "icons/svg/aura.svg",
            "system": {
                "description": description(p),
                "source": f"Entre ciel et terre, p. {p['page']}",
                "voie": cle_voie(p["voie"]),
                "voieUuid": PREFIXE + voie["_id"],
                "puissance": p["puissance"],
                "nomNatif": p["nomNatif"],
                "compulsion": p["compulsions"],
                "accessible": True,
                "visions": " · ".join(p["visions"]),
                "portee": p["portee"],
                "cible": p["cible"],
                "impact": "",
                "duree": p["duree"],
                "conditions": p.get("conditions", ""),
                "references": "",
                "application": "manuel",
            },
            "effects": [], "folder": dossiers[p["voie"]], "sort": p["puissance"] * 10000 + rang,
            "ownership": {"default": 0}, "flags": {}, "_stats": STATS,
        }
        with open(os.path.join(OUT, f"{slug(p['nom'])}_{iid}.json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(item, fh, indent=2, ensure_ascii=False)
    print(len(pouvoirs), "Pouvoirs,", len(dossiers), "dossiers")


if __name__ == "__main__":
    main()

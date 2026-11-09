"""Texte d'une page en deux colonnes à partir de pdftotext -layout : détection de la gouttière blanche."""
import subprocess
import sys

PDF = 'Pavillon Noir 2/Entre ciel et terre.pdf'


def layout(n):
    brut = subprocess.run(['pdftotext', '-layout', '-f', str(n), '-l', str(n), PDF, '-'], capture_output=True).stdout
    return brut.decode('latin-1').replace('\x0c', '').splitlines()


def gouttiere(lignes):
    """Début de la colonne droite : position la plus fréquente d'un texte qui suit un blanc d'au moins 3 espaces."""
    import re
    from collections import Counter
    debuts = Counter()
    for l in lignes:
        for m in re.finditer(r"\S\s{3,}(?=\S)", l):
            pos = m.end()
            if 30 <= pos <= 110:
                debuts[pos] += 1
                break
    if not debuts:
        return None
    # regroupe les positions voisines (±2) et garde la plus peuplée
    meilleur = max(debuts, key=lambda p: sum(debuts[q] for q in range(p - 2, p + 3)))
    if sum(debuts[q] for q in range(meilleur - 2, meilleur + 3)) < 5:
        return None
    return min(q for q in range(meilleur - 2, meilleur + 3) if debuts[q])


def coupure(l, g):
    """Position de coupure d'une ligne : la gouttière, sauf si elle tranche un mot d'une puce décalée de la colonne droite.
    On recule alors jusqu'à la puce « · » ou au blanc de deux espaces le plus proche."""
    if len(l) <= g or not l[g:].strip():
        return g
    debut = max(0, g - 30)
    # la partie droite n'est pas une puce alors qu'une puce précède de peu la gouttière : c'est elle qui ouvre la colonne
    if not l[g:].lstrip().startswith("·"):
        puce = l.rfind(" · ", debut, g + 1)
        if puce >= 0:
            return puce + 1
    if l[g - 1] == " " or l[g] == " ":
        return g
    blanc = l.rfind("  ", debut, g)
    return blanc + 2 if blanc >= 0 else g


def colonnes(n):
    lignes = layout(n)
    g = gouttiere(lignes)
    if g is None:
        return [l.strip() for l in lignes if l.strip()], []
    gauche, droite = [], []
    for l in lignes:
        c = coupure(l, g)
        gauche.append(l[:c].strip())
        droite.append(l[c:].strip())
    return [l for l in gauche if l], [l for l in droite if l]


if __name__ == '__main__':
    for n in range(int(sys.argv[1]), int(sys.argv[2]) + 1):
        g, d = colonnes(n)
        print(f"##### PAGE {n}")
        print("\n".join(g))
        print("=== colonne droite ===")
        print("\n".join(d))

"""Extrait le texte d'une page PDF colonne par colonne (gauche puis droite), lignes triées de haut en bas."""
import sys
import pypdf

PDF = 'Pavillon Noir 2/Entre ciel et terre.pdf'
r = pypdf.PdfReader(PDF)


def colonnes(n, milieu=300.5):
    page = r.pages[n - 1]
    frags = []

    def visiteur(texte, cm, tm, police, taille):
        if not texte or not texte.strip():
            return
        # position absolue : matrice de texte combinée à la matrice courante
        x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
        y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
        frags.append((x, y, texte, taille))

    page.extract_text(visitor_text=visiteur)
    cols = {0: [], 1: []}
    for x, y, t, tl in frags:
        cols[0 if x < milieu else 1].append((x, y, t))
    sortie = []
    for c in (0, 1):
        lignes = {}
        for x, y, t in cols[c]:
            cle = round(y / 2.5)
            lignes.setdefault(cle, []).append((x, t))
        for cle in sorted(lignes, reverse=True):
            sortie.append("".join(t for x, t in sorted(lignes[cle])).replace("\n", " ").strip())
        sortie.append("=== colonne suivante ===")
    return "\n".join(l for l in sortie if l)


if __name__ == '__main__':
    for n in range(int(sys.argv[1]), int(sys.argv[2]) + 1):
        print(f"##### PAGE {n}")
        print(colonnes(n))

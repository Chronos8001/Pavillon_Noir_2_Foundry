"""Ajoute aux compendiums les Objets de pouvoir (p. 158-161) et les Suivants (p. 162-169) d'Entre ciel et terre.

Usage (racine du dépôt) : python tools/extraction/ect_objets_suivants.py
- Objets de pouvoir : objets d'équipement, dossier « Objets de pouvoir (Entre ciel et terre) » du compendium « equipement ».
- Suivants : PNJ, dossier « Suivants (Entre ciel et terre) » du compendium « pnj » (disciple, servant, six catégories de familiers).
Règle maison : pas de cartes. Une Lame droite du livre devient un Succès sacré (d10 de 1 à 5),
une Lame renversée une Colère divine (d10 de 6 à 10). Textes résumés ; identifiants stables.
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ect_pnj_avantages import PNJ, SOURCE, acteur, dossier_compendium, e, ecrire, ident, modele  # noqa: E402

EQ = "src/packs/equipement"

UTILISATION = (
    "Utilisation (p. 160) : tenir l'objet, formuler un souhait lié à son Pouvoir et accomplir le rite pendant toute la Durée "
    "d'activation, puis réussir un Test d'Objets de pouvoir (Charisme) avec au moins 2 Succès (sinon la divinité reste muette). "
    "Le MJ déclenche les effets dans les 24 heures, comme pour un Rituel. Il faut ensuite attendre la Fréquence d'utilisation, "
    "que le possesseur ignore souvent, avant de recommencer. Actif : exige l'Avantage Versé dans les arcanes ; passif : utilisable "
    "par un profane ; autonome : l'objet décide lui-même d'utiliser ses pouvoirs."
)
CREATION_PERMANENT = (
    "Création (p. 160-161) : connaître le Pouvoir qui permet de créer ce type d'objet, façonner l'objet, puis invoquer par un "
    "Rituel le Pouvoir à y insuffler et obtenir au moins autant de Succès sacrés que sa Puissance. Les Succès sacrés en plus "
    "améliorent, au choix du MJ, la Fréquence d'utilisation (0 : un jour précis de l'année ; 1 : une fois par an ; 2 : un jour "
    "précis du mois ; 3 : une fois par mois ; 4 : une fois par semaine ; 5 : à une heure précise ; 6 : une fois par jour ; "
    "7 : trois fois par jour) et la Durée d'activation (0 : 24 h ; 1 : 4 h ; 2 : 1 h ; 3 : 30 min ; 4 : 10 min ; 5 : 1 min ; "
    "6 : 10 s ; 8 : instantanée). Coûts relus sur la table de la p. 161, à vérifier. Le Pouvoir garde les paramètres de la Voie."
)
CREATION_EPHEMERE = (
    "Création (p. 161) : connaître le Pouvoir qui permet de créer ce type d'objet, préparer les doses, puis les consacrer. "
    "Par un Rituel invoquant le Pouvoir à insuffler : une dose par Succès sacré. Par une Transe (Pouvoir dans le Chemin "
    "d'illumination) : une dose par Succès sacré au-delà de la Puissance. Chaque dose s'utilise une fois ; la réussite est "
    "automatique et l'effet est celui qui convient le mieux à la situation, ou le souhait de l'utilisateur."
)

# (nom, mode, résumé)
EPHEMERES = [
    ("Baume", "passif", "Appliqué sur le corps, le plus souvent pour soigner une blessure."),
    ("Charme", "passif", "Bourse d'herbes portée au cou, que l'on broie pour libérer l'effet (charmes yanomamis de chasse, d'amour… ; chez les Caraïbes, chair de mansfenix broyée pour le courage)."),
    ("Herbe", "passif", "Le prêtre la brûle et en fait inhaler les vapeurs à la Cible."),
    ("Huile", "passif", "Étalée sur un objet pour libérer son pouvoir ; effets assez courts."),
    ("Philtre", "passif", "Ingéré par la victime ; effet parfois néfaste et alors permanent (le philtre de Tristan et Iseult)."),
    ("Poudre", "passif", "Jetée devant soi : affecte les objets ou les personnes qu'elle recouvre."),
    ("Potion", "actif", "Transmet son Pouvoir à qui la boit, qui peut l'activer comme s'il était en Transe."),
    ("Sortilège pour sarbacane", "actif", "Mélange d'herbes et de latex enduisant une aiguille de sarbacane ; agit en infligeant une blessure."),
]
PERMANENTS = [
    ("Baka (gad)", "passif", "Esprit protecteur, souvent un petit nain de terre, qui garde maisons et navires ; esprit maléfique, il peut se retourner contre son porteur et ses proches."),
    ("Collier de mabouya", "passif", "Statuette effrayante à l'effigie de Mabouya, consacrée par le boyer et portée au cou par le Caraïbe pour se protéger des coups du démon."),
    ("Bottou qui rend fou", "actif", "Bottou consacré par le Pouvoir « Le bottou qui rend fou » : Affinité (+1) dans la Voie d'Ichéiricou pour la protection et la punition pour transmettre ses maléfices, qui ne se déclenchent qu'en frappant l'ennemi avec le bottou."),
    ("Objet enchanté conscient", "autonome", "Objet doué de volonté (balai qui fait le ménage, épée qui contrôle son porteur, corde qui rampe) ; pouvoirs de la Voie du Folklore ou tout effet intelligent, utile ou amusant."),
    ("Objet enchanté inanimé", "passif", "Simple réceptacle d'un Pouvoir (une épée contenant « Vision féerique » fait voir les fées à qui la tient)."),
    ("Cristal magique", "actif", "Vecteur des sorciers aztèques, symbole de Tezcatlipoca : voir le passé, le futur et ce qui est caché (voir aussi le Pouvoir « Cristal du sorcier »)."),
    ("Os consacrés", "actif", "Os long d'un ancêtre ou d'un proche, consacré et enveloppé dans un chiffon : Affinité du boyer dans toutes les Voies caraïbes (plusieurs os n'en donnent pas davantage)."),
    ("Paquet-kongo", "actif", "Poupée de chiffon remplie d'herbes : Affinité pour tout Pouvoir vaudou bénéfique à la personne représentée."),
    ("Poupée vaudoue", "actif", "Statuette de chiffon faite de la substance même de la victime : rend permanents les maléfices dirigés contre elle."),
    ("Relique", "passif", "Ossement d'un saint, ou objet ayant appartenu au Christ ou l'ayant touché ; doit être consacrée pour recevoir un Pouvoir."),
    ("Wanga", "actif ou passif", "Assemblage de feuilles broyées ou d'organes et d'os animaux, enveloppé de tissu en silhouette humaine : protège son porteur par des pouvoirs défensifs et offensifs."),
    ("Zémi", "actif", "Esprit libre de la nature enfermé dans une statuette conique : donne accès à la Voie des Zémis et contient ses propres Pouvoirs, fixés par le MJ (nom, Puissance de 1 à 10, Portée, Cible, Durée ; Impact égal à la Puissance). Un zémi puissant permet de diriger les Arawaks."),
]


def objets():
    base = modele(EQ, lambda d: d.get("type") == "equipement")
    fid = dossier_compendium(EQ, "Objets de pouvoir (Entre ciel et terre)", 1100000, "objets-pouvoir")
    n = 0
    for groupe, liste, creation, page in (("éphémère", EPHEMERES, CREATION_EPHEMERE, 158), ("permanent", PERMANENTS, CREATION_PERMANENT, 159)):
        for i, (nom, mode, resume) in enumerate(liste):
            d = copy.deepcopy(base)
            iid = ident("objet", nom)
            d.update({"_id": iid, "_key": f"!items!{iid}", "name": nom, "folder": fid, "effects": [], "flags": {},
                      "sort": (100000 if groupe == "permanent" else 0) + (i + 1) * 100})
            d["system"].update({
                "description": (f"<p><strong>Objet de pouvoir {groupe} ({e(mode)}).</strong> {e(resume)}</p>"
                                "<p>Le MJ choisit le Pouvoir contenu, que le possesseur ne connaît en général pas ; la divinité "
                                "peut lui envoyer des rêves cryptiques.</p>"
                                f"<p><em>{e(UTILISATION if groupe == 'permanent' else '')}</em></p>".replace("<p><em></em></p>", "")
                                + f"<p><em>{e(creation)}</em></p>"),
                "source": f"{SOURCE}, p. {page if groupe == 'éphémère' else (159 if nom != 'Zémi' and nom not in ('Poupée vaudoue', 'Relique', 'Wanga') else 160)}",
                "categorie": f"Objet de pouvoir {groupe}", "quantite": 1, "prix": "", "modificateur": "",
            })
            ecrire(EQ, d)
            n += 1
    return n


# --------------------------------------------------------------------------------------------
# Suivants
# --------------------------------------------------------------------------------------------
FIABILITE = ("Fiabilité : 1d10 + 1d6 − 3, −5 si le démon n'offre pas habituellement de familier, +2 s'il est réputé en donner de fiables. "
             "À chaque appel à son Pouvoir ou à sa Capacité spéciale : Test de Chance sur la Fiabilité (−2 maltraité … +2 choyé). "
             "Dé inférieur : il obéit ; égal : il obéit après un tour de tergiversations (toutes les actions du Mage Noir) ; "
             "supérieur : pas aujourd'hui ; 10 : nouveau Test de Chance, sinon le danger du familier se réalise.")
FAMILIER_COMMUN = (
    "Âme damnée donnée par une Puissance infernale de l'Arbre inversé (demandée par un Pouvoir des Qlipoth). Invisible sauf pour le Mage Noir, "
    "sauf s'il décide de se montrer. Catégorie : D20 + modificateur du démon (−2 à +2 selon sa violence). Puissance : celle du Pouvoir "
    "d'invocation + les Succès sacrés réservés à cet effet ; elle fixe le rang et le Pouvoir de familier. Il ne s'éloigne pas au-delà de la "
    "Portée de ce Pouvoir, n'affecte que ses Cibles, au toucher, pour une durée quotidienne totale limitée à sa Durée. "
    "Nombre maximal : moitié du Niveau en Religion (Kabbale), arrondie au supérieur. Il a aussi une Capacité spéciale (D100, p. 167-169). "
    "Deux familiers de même catégorie s'entendent ; de catégories différentes, ils se chamaillent.")
RANGS = ["Esprit (Puissance 1 à 3)", "Petit démon (4 à 6)", "Démon (7 à 9)", "Grand démon (10 à 12)", "Puissant démon (13 et plus)"]
FAMILIERS = [
    ("Nephilim", "D20 de 1 à 4 ; les voluptueux, associés aux Ondins (eau)", 164,
     "Âmes immortelles de géants nés d'anges déchus et de femmes, en quête d'un corps d'emprunt.",
     "Cherche à revivre les sensations de son corps perdu ; aime attirer ses victimes dans l'eau pour les noyer.",
     ["Grande taille : voit ce que verrait quelqu'un de 3 m.",
      "Attirance contre nature : au toucher, crée une attirance « contre nature ».",
      "Espion dans un corps : entre dans une personne et entend ce qu'elle dit, voit ce qu'elle fait (pas ses pensées).",
      "Contrôle d'un corps : expulse l'âme d'une personne et prend sa place ; le corps reste en stase ensuite, sans souvenirs.",
      "Lycanthropie : fusionne avec le Mage Noir en grand loup bipède (For +2, Adr +2, Rés +3, Per +2, Ada +1 ; Esquive, Athlétisme, Discrétion, Vigilance, Combat à mains nues +2D, Intimidation +3D)."],
     "Peut refuser d'obéir au moment crucial pour revivre une sensation perdue."),
    ("Rephaïm", "D20 de 5 à 8 ; les lâches, associés aux Sylphes (air)", 164,
     "Esprits d'humains morts, sans corps (prisonnier du Shéol).",
     "Aigris et méchants : aiment effrayer, nuire, provoquer des accidents, siffler des obscénités aux oreilles.",
     ["Esprit frappeur : fait voler les petits objets d'une pièce ; Test de Pouvoir ou sortir (sauf le Mage Noir).",
      "Brise maudite : une brise qui n'éteint que les flammes.",
      "Oreilles indiscrètes : en courant d'air, rapporte ce que disent les gens.",
      "Télékinésie : soulève et manipule grossièrement un objet (pas de mécanismes).",
      "Forme fantomatique : en un tour, allège le Mage Noir jusqu'à le rendre intangible."],
     "Bruits, chutes d'objets et frayeurs au mauvais moment."),
    ("Anakim", "D20 de 9 à 12 ; les révoltés, associés aux Gnomes (terre)", 166,
     "Humain gigantesque (au moins 2 m) au physique terrifiant ; Goliath descendait des Anakim.",
     "Pervers et en révolte contre les religions du livre ; aime écraser les autres.",
     ["Gigantisme terrifiant : le Mage Noir paraît immense (Intimidation 4 F 8).",
      "Révolte : instille un profond sentiment de révolte.",
      "Fracassement : brise un objet, une porte, un pan de mur ou de toit, une fois par semaine au plus.",
      "Force du géant : confère au Mage Noir une Force de 9.",
      "Disparition dans la terre : engloutit le Mage Noir avec lui (il n'a plus besoin de respirer) jusqu'à ce qu'il veuille remonter."],
     "Sabote les Rituels invoquant un Ange : le Mage Noir lance 1d6 d10 sacrés de plus, dont seules les Colères comptent."),
    ("Amalekite", "D20 de 13 à 16 ; les agresseurs, associés à la Force première (son)", 166,
     "Fait de vibrations, de son et de voix.",
     "Agressif envers tout ce qui contrarie le Mage Noir ; vindicatif et patient ; brise les objets fragiles par vibrations.",
     ["Harcèlement : bruits, menaces, voix qui complotent ; la victime (puis son entourage) croit devenir folle.",
      "Subversion de la Création : altère subtilement la matière (corde rongée, canon déformé qui explose, mécanisme hors d'usage).",
      "Cri de la Mort : cri d'un mourant, ou terreur infligeant un malus de facilité égal à un Test d'Intimidation (Cha) du Mage Noir.",
      "Invisibilité : rend la Cible invisible et inaudible.",
      "Verbe créateur dévoyé : crée en 1 h 1 kg d'objets finis (mécanismes, sans explosif) ou 10 kg d'objets grossiers."],
     "Si le Mage Noir se tourne davantage vers l'Arbre de vie, il prépare patiemment sa trahison et sa mort."),
    ("Geburim", "D20 de 17 à 22 ; les violents, associés à la Salamandre (feu)", 166,
     "Prend en général forme humaine pour rester visible.",
     "Homme d'action qui déteste l'inertie et adore la destruction par le feu.",
     ["Chaleur : dégage la chaleur d'un poêle, sans blesser.",
      "Enflammer les esprits : attise la colère d'une personne jusqu'à la rage.",
      "Projection de flammes : fait exploser un feu et projette braises et flammes (3 F 6 pour toucher, dégâts +3).",
      "Le feu de l'action : +1 Action par tour au Mage Noir.",
      "Incendie : enflamme une matière inflammable (une minute pour une poutre)."],
     "Si le Mage Noir refuse trop longtemps la violence, il le prévient une fois, puis déchaîne ses pouvoirs (ne le blesse que par inadvertance)."),
]
DAMNES = [
    "Séraphin déchu (ordre de Belzébuth) — la Vallée de la Mort : la victime est maudite, Pouvoir −4 tant qu'il reste sur elle.",
    "Chérubin déchu (Python) — la Vallée de l'Oubli : manipule et pervertit les pensées.",
    "Trône déchu (Bélial) — la Vallée du Sommeil : isole une personne de son groupe par brimades et mépris.",
    "Domination déchue (Asmodel) — les Portes de la Mort : la victime ne vit plus que par les sept péchés capitaux.",
    "Puissance déchue (Shatan) — l'Ombre de la Mort : un élément (feu, vent, eau, sol meuble) menace la victime (Test d'Athlétisme (Rés) par tour, sinon 2 points de dégâts ; ou Test de Pouvoir sinon pétrifiée).",
    "Vertu déchue (Meririm) — le Puits de l'Abîme : mensonge invétéré, ou toxicité inattendue d'un minéral.",
    "Principauté déchue (Abbadon) — l'Ordure et la Boue : la végétation enchevêtre et engloutit (Test d'Athlétisme (For) par tour, sinon 2 points de dégâts ; ou Test de Pouvoir sinon pétrifiée).",
    "Archange déchu (Astharoth) — la Perdition : ordonne à un animal de menacer ou d'attaquer la victime.",
    "Ange déchu (Mammon) — la Fosse : la victime transgresse les Commandements comme s'ils n'existaient pas.",
    "10 : c'est un Reschaïm ; relancer le D20 en ignorant ce résultat.",
]
CAPACITES = [
    "1-3 Animal : forme animale visible et tangible", "4-6 Bon démon : n'utilise pas ses pouvoirs pour faire souffrir",
    "7-9 Bourse pleine : l'argent dépensé revient le lendemain à 8 h (les vendeurs sont floués)",
    "10-12 Diablotin : tapote l'oreille droite pour l'Arbre de vie, tire la gauche pour l'Arbre inversé",
    "13-14 Dobie : spectre d'un ancêtre du Mage Noir", "15-17 Enfermable : dans une boîte ou une lampe",
    "18-19 Érudit : Religion (Kabbale) et Sciences +1D ; 20-21 : +2D", "22-24 Espiègle : joue des tours (orientables vers d'autres)",
    "25-27 Extatique : en suçant un peu de sang (1 point de dégâts), fait vivre une extase ; addiction après 3 fois",
    "28-30 Fantasme : ne communique qu'en rêve", "31-32 Héritage : transmissible au fils aîné",
    "33-35 Horaire : ne se montre qu'à une heure précise", "36-38 Horloger : avance ou recule l'horloge à son gré",
    "39-41 Infernal : +1 Faveur aux Rituels de l'Arbre inversé", "42-44 Mandragore : choyé, double la vitesse de guérison",
    "45-47 Monsieur le Maître : impose son rythme (sinon part un mois) ; connaît les chemins les plus courts",
    "48-50 Monstre : Intimidation 4 F 8 quand il se montre", "51-53 Opulent : vaisselle et mets somptueux (temporairement)",
    "54-56 Oracle : une question par semaine, réponse oui ou non", "57-59 Partageur : peut assister un autre personnage consentant (hors maximum)",
    "60-62 Pied léger : courir six fois plus vite qu'un cheval", "63-65 Sage : Perception +1 ; 66-68 Adaptabilité +1 ; 69-71 Érudition +2",
    "72-74 Saugrenu : souffle des idées farfelues",
    "75-89 Savant : compétence de connaissance substituable, Niveau 1 (75-77) à 5 (87-89)",
    "90-92 Servant : rend les services d'un servant", "93-95 Vampyre : boit chaque soir le sang du Mage Noir (1 point de dégâts)",
    "96-98 Ventriloque : projette sa voix ou celle du Mage Noir dans la Portée", "99-100 : relancer deux fois",
]


def notes_familier(nom, de, page, forme, caractere, pouvoirs, danger):
    liste = "".join(f"<li><strong>{e(r)}</strong> : {e(p)}</li>" for r, p in zip(RANGS, pouvoirs))
    return (f"<p><strong>Familier Reschaïm : {e(nom)}</strong> ({e(de)}).</p>"
            f"<p><strong>Forme.</strong> {e(forme)} <strong>Caractère.</strong> {e(caractere)}</p>"
            f"<p><strong>Pouvoir de familier selon la Puissance</strong> (un seul) :</p><ul>{liste}</ul>"
            f"<p><strong>Danger.</strong> {e(danger)}</p>")


def commun_familier():
    return (f"<p>{e(FAMILIER_COMMUN)}</p><p>{e(FIABILITE)}</p>"
            "<p><strong>Capacités spéciales (D100)</strong> :</p><ul>"
            + "".join(f"<li>{e(c)}</li>" for c in CAPACITES) + "</ul>")


def suivants():
    base = modele(PNJ, lambda d: d.get("type") == "pnj" and d["name"] == "Crocodile")
    fid = dossier_compendium(PNJ, "Suivants (Entre ciel et terre)", 700000, "pnj-suivants")
    img_pnj = "systems/pavillon-noir-2/assets/icons/pnj.svg"
    cinq = {k: 5 for k in base["system"]["caracs"]}
    docs = []
    docs.append(acteur(base, "Disciple (Kabbale)", cinq,
        "<p>Disciple d'un kabbaliste : il l'aide à installer et entretenir son lieu de culte en échange de son enseignement. "
        "Plus le Mage étudie l'Arbre de vie, plus ses disciples sont modérés et altruistes ; plus il étudie l'Arbre inversé, plus ils sont "
        "matérialistes, malveillants, voire meurtriers. Disciples et servants s'entendent très mal.</p><ul>"
        "<li><strong>Recrutement.</strong> D100 inférieur ou égal au Niveau de Gloire du Mage : un disciple se présente. Sinon, convaincre "
        "un candidat : Test de Persuasion (Exp) avec 3 Succès.</li>"
        "<li><strong>Nombre maximal.</strong> Le double du Niveau en Religion (Kabbale).</li>"
        "<li><strong>Avantages.</strong> Tests de Religion (Kabbale) Assez faciles (+1) avec deux disciples, Faciles (+2) au-delà ; "
        "installation plus rapide du lieu de Rituel (p. 129). Une fois par invocation, annuler 1 Colère en renonçant à 1 Succès sacré : "
        "tous les disciples perdent alors confiance et partent, sauf autant que la Réussite d'un Test de Persuasion (Exp).</li>"
        "<li><strong>Trahison.</strong> Disciples attirés par les Qlipoth : dans une situation critique d'un Rituel, le MJ lance en secret "
        "un D10 ; s'il est au plus égal au nombre de disciples − Faveurs, le Mage lance un d10 sacré supplémentaire dont seule une Colère "
        "compte. Il ne sait pas qui l'a trahi.</li></ul>"
        f"<p><em>{SOURCE}, p. 162.</em></p>",
        "Suivant (Kabbale, Arbre de vie)", "mineure", fid, 100, img_pnj))
    docs.append(acteur(base, "Servant (Arbre inversé)", cinq,
        "<p>Créature vaguement humaine (on la prend pour un humain laid et difforme), sotte et obéissante, donnée par une Puissance "
        "infernale quand une vision du Pouvoir le prévoit. Ne rechigne que si elle est maltraitée.</p><ul>"
        "<li><strong>Nombre maximal.</strong> Le double du Niveau en Religion (Kabbale).</li>"
        "<li><strong>Aide.</strong> Aménage le lieu de Rituel (p. 129), fait le guet, cultive, range et nettoie.</li>"
        "<li><strong>Sacrifice.</strong> Lors d'un Rituel, juste après un Succès sacré ou la première Colère qui le suit, sacrifier un ou "
        "deux servants (dévorés par la Puissance infernale) retire autant de Colère (2 au plus). Les autres servants, terrifiés, rechignent "
        "une semaine par servant sacrifié, et un disciple part sans retour.</li></ul>"
        f"<p><em>{SOURCE}, p. 163.</em></p>",
        "Suivant (Kabbale, Arbre inversé)", "mineure", fid, 200, img_pnj))
    commun = commun_familier()
    for i, (nom, de, page, forme, caractere, pouvoirs, danger) in enumerate(FAMILIERS):
        notes = notes_familier(nom, de, page, forme, caractere, pouvoirs, danger) + commun + f"<p><em>{SOURCE}, p. {page} et 163-169.</em></p>"
        docs.append(acteur(base, f"Familier : {nom}", cinq, notes, "Familier (Arbre inversé)", "moyenne", fid, 300 + i * 100, img_pnj))
    damnes = "".join(f"<li>{e(d)}</li>" for d in DAMNES)
    docs.append(acteur(base, "Familier : Être spirituel damné", cinq,
        "<p><strong>Familier : Être spirituel damné</strong> (D20 de 17 à 22 : le livre donne la même plage que les Geburim, le MJ tranche) : un des êtres spirituels "
        "qui ont créé le monde depuis le chaos. Plus fiable que les Reschaïm : sans danger, sauf s'il est maltraité ou moqué. "
        f"Son Pouvoir dépend d'un D10 :</p><ol>{damnes}</ol>" + commun + f"<p><em>{SOURCE}, p. 167-169.</em></p>",
        "Familier (Arbre inversé)", "moyenne", fid, 900, img_pnj))
    for d in docs:
        d["system"]["sante"]["loc"] = {k: {**v, "protection": 0} for k, v in d["system"]["sante"]["loc"].items()}
        ecrire(PNJ, d)
    return len(docs)


if __name__ == "__main__":
    print(objets(), "Objets de pouvoir ;", suivants(), "Suivants")

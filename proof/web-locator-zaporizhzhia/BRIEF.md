---
format: web
type: locator
---

# Beat — À quelle distance faut-il reculer pour que « la plus grosse d'Europe » soit vraie ? (web)

**Type:** locator (map). **Medium/format:** map / **web**. **Frame:** la carte est VIVANTE — une
carte MapTiler plein cadre, contrôles, glisser, molette et survol de MapTiler, sous laquelle une
image figée par recul reste quand la clé, les tuiles ou le réseau tombent.

## Claim

**La centrale de Zaporijjia, 6 000 MW, est la plus grosse centrale bas-carbone que ce fichier
recense en Europe** — et sa plus proche rivale est à **2 367 km**. Dans un rayon de 130 km sa
voisine est un barrage de 1 538 MW ; à 320 km, l'autre centrale nucléaire ukrainienne, 3 000 MW ; à
800 km, les tranches russes de 4 000 MW ; sur toute l'étendue du fichier, les 5 460 MW de
Gravelines — et le sujet est un point sur 8 899.

## Le geste, et pourquoi ce n'est celui d'aucun frère

**`vantage.ts`, un vocabulaire nouveau : le RECUL est rendu au lecteur.**

Une carte de repérage n'a ni magnitude, ni taux, ni gradient. Elle n'a qu'une chose à dire — *où*,
et *près de quoi* — et cette chose entière est décidée par **à quelle distance l'auteur s'est mis**.
C'est le seul type dont le geste éditorial *est* le cadrage. Un still ne peut choisir qu'un recul ;
il ne peut pas dire qu'il y en avait quatre, et le lecteur lit le seul qu'on lui donne comme si
c'était la carte, pas comme une décision.

Les quatre reculs de ce beat ne sont pas quatre grossissements. Chacun est une **réponse d'auteur à
« où est-ce »**, avec sa propre règle de ce qui mérite d'être dessiné, son propre décompte de ce que
le cadre contient, sa propre barre d'échelle et sa propre phrase :

| recul | sélection | cadre | ce que le cadre tient | ce qu'il dit |
| --- | --- | ---: | --- | --- |
| **Le site** | rayon 130 km | 167 km | 6 centrales, 1 ville | sa voisine est un barrage de 1 538 MW, à 55 km |
| **La région** *(publié)* | rayon 320 km | 642 km | 23 centrales, 4 villes | l'autre nucléaire ukrainien, moitié moins gros, à 254 km |
| **Le voisinage** | rayon 800 km | 1 694 km | 177 centrales, 17 villes | les tranches russes de 4 000 MW entrent, aucune n'atteint 6 000 |
| **L'Europe** | tout le fichier | 3 886 km | 8 899 centrales, 12 dessinées | le titre devient vérifiable, et le sujet cesse d'être situable |

Le rayon **sélectionne** ce qui est candidat ; le **cadre** est la boîte des marques que ce recul
dessine, agrandie de 10 %. C'est dérivé et non tapé, et c'est ce qui tient deux promesses à la fois :
aucune marque dessinée n'est coupée, et le cadre ne montre pas de terre dont le recul n'a rien à
dire. Une boîte quasi carrée posée dans la boîte 3,1:1 que la règle du plein cadre donne au plot est
liée par sa HAUTEUR et déborde de trois fois sa largeur en longitude — mesuré sur la première version
de ce beat, où le recul le plus large est revenu en montrant l'Europe du Nord-Ouest avec le sujet
hors du cadre.

**Ce n'est pas le zoom de MapTiler, et le beat le dit.** Le zoom et le glisser sont là — ruling R1,
et le frère à symboles proportionnels a raison d'écrire qu'ils ne sont *pas* un geste : un zoom est
continu, anonyme, sans argument, et il ne change ni ce qui est dessiné ni ce qui est écrit. Les
quatre reculs sont nommés, discrets, défendables, et chacun **change la règle de dessin, la légende,
la barre d'échelle et la phrase en même temps que la caméra**. Le lecteur ne grossit pas l'image :
il essaie une autre décision éditoriale que celle qu'on a publiée.

**Et l'arbitrage n°1 est tenu par construction.** « Rien ne bouge sans que le lecteur voie
pourquoi » : ici le mouvement *est* ce que le lecteur a demandé, par son nom, une frappe plus tôt —
et il est interpolé (`fitBounds` animé, arbitrage n°4), donc on voit d'où on part et où on arrive.
Aucune marque ne se déplace par rapport au sol : une position reste une donnée.

**Le geste survit ENTIER sans JavaScript, et c'est ce qui distingue ce beat du choroplèthe.** Chez
le choroplèthe, la moitié carte du geste est morte sans script (aucune feuille de style n'atteint
une couche MapLibre) et le geste a déménagé dans le tableau. Ici le geste est la CAMÉRA — et une
caméra, ça se photographie. La page embarque **une image figée par recul**, prises sur sa propre
carte vivante, et les quatre s'échangent en CSS pur (`:has()` + `:checked`), sans une ligne de
script. Sans JavaScript le lecteur a les quatre cartes, les quatre légendes et les quatre phrases.

## Ce que Mercator coûte à CE type — et ce n'est pas la surface

Un choroplèthe se lit à la surface, donc Mercator lui coûte des aires. **Un locator se lit à la
DISTANCE, donc Mercator lui coûte sa barre d'échelle** — le seul instrument que ce type doit au
lecteur. En Web Mercator l'échelle au sol varie en `cos(latitude)` : une barre juste au centre du
cadre est fausse à ses bords, et de combien est une fonction du recul. Mesuré sur les quatre :

| recul | erreur de la barre d'échelle entre les deux bords du cadre |
| --- | ---: |
| Le site | **1,044 fois** |
| La région | **1,122 fois** |
| Le voisinage | **1,313 fois** |
| L'Europe | **1,534 fois** |

C'est dérivé à chaque rendu, imprimé par le runner, porté par le chapô (le cadrage publié et le plus
large) et par la phrase du recul le plus large. Le titre compte des MÉGAWATTS, pas des kilomètres, et
survit intact ; la barre, non. Sa LONGUEUR, elle, est relevée sur la caméra vivante à chaque
mouvement — deux points distants de cent pixels, déprojetés, et la distance orthodromique entre eux —
donc la distance qu'elle énonce reste vraie pendant que le lecteur zoome. Ses MOTS sont cuits, un par
recul : une chaîne assemblée dans le navigateur est une chaîne dont aucun glyphe n'a été taillé dans
les fontes que la page embarque.

## Les marques — uniformes, par la règle du type

« Marker size gets used to imply importance » est le seul défaut que la fiche du type nomme. Ici
**aucune marque n'est dimensionnée** : `radius: "fixed"` (`live-map.mjs` : *une épingle n'est pas une
mesure*), même rayon écran à tous les zooms et à tous les reculs. La puissance ne dimensionne rien ;
elle sert de **priorité déclarée** — la fiche du type appelle exactement ça pour le déclutter — qui
décide quelles 12 centrales du cadre sont dessinées. Le décompte de ce qui n'est pas dessiné est
imprimé, à chaque recul.

Trois traitements, pas une rampe : le sujet (accent, cerné), les autres centrales (lavis de
l'accent), les villes (encre neutre). Le type autorise la couleur comme CATÉGORIE et rien d'autre.

## Les étiquettes sont à nous, jamais à MapTiler

Aucune couche `symbol` MapTiler : une famille nue demandée à MapTiler revient en Noto Sans sans
erreur, et §2 de `map-plan.md` dit que le beat écrit chaque mot dans la carte. Les noms sont une
surcouche HTML dans la boîte de la carte, reprojetée à chaque mouvement de caméra — donc dans les
faces que la page embarque, dans le registre de la direction, et **dans la photo figée**, qui est
prise sur cette boîte-là. Aucune étiquette n'en chevauche une autre : mesuré dans le navigateur, sur
les rectangles rendus, aux quatre reculs, et refusé plutôt que jugé à l'œil.

## Verification

Ouvrir `renders/<direction>.local.html` depuis le disque et regarder — c'est ainsi que le
propriétaire vérifie. À 1512×860 : boîte carte **1464 × 466,8**, document **860**, aucun défilement.
Sans script : une image figée, une ligne de recensement, une barre et une phrase, exactement une de
chacune à chaque recul, zéro contrôle MapLibre, zéro contrôle mort. Quatre mutations lancées, quatre
tuées. Le détail est dans `live-locator-report.md`.

## Source

WRI Global Power Plant Database v1.3.0 (`stations.csv`) · villes Natural Earth 50 m
(`places.csv`) · frontières et fond MapTiler (Countries + `dataviz-light`), teintés par la
direction. `shapes.geojson` sert à une seule chose : vérifier, par point-dans-polygone, que le sujet
tombe bien en Ukraine — la phrase du titre, tenue contre une géométrie plutôt que contre une colonne
de CSV.

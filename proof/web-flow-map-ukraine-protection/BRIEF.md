---
format: web
type: flow-map
---

# Beat — 4,5 millions d'Ukrainiens sous protection temporaire en Europe (web)

**Type :** flow map (éventail origine-destination). **Medium/format :** carte / **web**.
**Refait le 2026-09-15 sur le patron validé** (`proof/web-choropleth-europe-lowcarbon`, « là c'est
top ») : chaque marque est une couche MapLibre sur les tuiles MapTiler, les contrôles et le survol
viennent de MapTiler, la carte prend toute la largeur de la figure, et une image figée cuite depuis
la MÊME page reste quand la clé expire.

## Claim

**4 504 080 Ukrainiens détenaient une protection temporaire en Europe en juin 2026, et l'Allemagne
et la Pologne en accueillent 49,1 %** — 1 250 825 et 958 885. Le beat refuse de rendre si le total
passe sous quatre millions ou si les deux plus grands ne font pas à peu près la moitié.

## Minard, retourné — et ses quatre règles tenues

La référence est la planche de Minard (1862) : beaucoup d'origines, une destination, largeur de
bande en tonnes. C'est la même forme, la flèche retournée.

- **La largeur EST la quantité**, et rien d'autre sur la page ne l'encode.
- **L'échelle des largeurs est dans la légende, dans l'unité de la mesure en cours.**
- **Le tracé est schématique et le fond est du mobilier** — le chapô dit que la courbe n'est pas un
  itinéraire, parce qu'une courbe sur une carte se lit comme tel.
- **Une bande trop fine pour être vue est comptée, pas dessinée** : elle entre dans un reste énoncé
  en personnes.

## Le geste — `live-flow.ts`, un vocabulaire nouveau : **ce qui DIVISE une bande**

### La question du lecteur

*« L'Allemagne est la plus large. Large de quoi — de monde, ou de place ? »*

### Pourquoi ce geste-là et aucun autre

Une carte de flux est le seul des huit types dont la marque **relie deux lieux**. Un aplat de
choroplèthe, un hexagone, un cercle proportionnel, une case de cartogramme, un point de densité :
tous mesurent **le lieu sur lequel ils sont posés**, donc ils n'ont qu'un dénominateur possible, et
c'est celui-là qu'ils portent. Une bande, elle, mesure **ce qui est parti d'un lieu et arrivé dans
un autre** : elle a un dénominateur, et ce dénominateur est le pays qui reçoit — ses habitants, son
sol, ou rien du tout. **Une planche fixe doit en choisir un, et l'image ne porte aucune trace du
choix.** Le lecteur voit « large = beaucoup » et ne peut pas savoir beaucoup de quoi.

Et c'est aussi la réponse au défaut n°1 du type, celui que la fiche du catalogue nomme : **une carte
de flux devient une pelote**, parce que chaque bande dessinée est un trait en travers de toutes les
autres. Sous la mesure « personnes », **13 des 31 destinations sont trop fines pour être dessinées**
et disparaissent dans un reste ; sous « pour 1 000 habitants » il n'en reste que **2** ; sous
« pour 1 000 km² », **7**. Ce ne sont pas les mêmes treize, les mêmes deux et les mêmes sept. **Ce
que la planche cache — la moitié des flux, et tout ce que chacun porte d'autre — change avec le
dénominateur, et c'est le lecteur qui tient le dénominateur.**

### Les trois mesures, et les trois éventails

| pastille | ce que la largeur mesure | qui est en tête | combien de bandes tombent sous le plancher |
| --- | --- | --- | --- |
| **personnes** *(défaut, la planche)* | le nombre de personnes | Allemagne 1 250 825 | 13 sur 31 |
| pour 1 000 habitants | personnes ÷ population du pays d'accueil | Tchéquie 36,1 | 2 sur 31 |
| pour 1 000 km² | personnes ÷ surface réelle du pays d'accueil | Malte 9 640 | 7 sur 31 |

Les trois numérateurs sont le même nombre ; les trois dénominateurs sont dans les fichiers gelés du
beat (`population.csv`, et la surface sphérique calculée sur `shapes.geojson`). **La part du total
n'est PAS une quatrième pastille** : c'est le même éventail à un facteur près, donc un état égal à
l'état par défaut, et le format le refuserait à juste titre.

### Pourquoi ce n'est le geste d'aucun frère

- **`classing.ts`** (choroplèthe) change **où l'on coupe** une liste de valeurs fixes. Ici les
  bornes n'existent pas : il n'y a pas de palier, il y a une largeur continue.
- **`area-scale.ts`** (symbole proportionnel) change **la LOI** qui transforme une valeur en taille
  (l'exposant). Ici la loi ne bouge jamais — largeur ∝ valeur, la règle de Minard, non négociable —
  c'est **la valeur** qui change.
- **`pool.ts`** (hex grid) change **sur combien de cases** une case additionne son numérateur ET son
  dénominateur. Le taux pour 1 000 habitants y est une propriété d'UN lieu ; ici c'est le rapport
  d'une PAIRE.
- **`filter.ts`** promet que les marques hors d'un ensemble nommé PARTENT, **et que le cadre contre
  lequel elles étaient mesurées ne bouge pas**. Ici c'est exactement l'inverse : rien n'est
  sélectionné, l'échelle entière est refaite, et ce qui sort du dessin en sort parce que la nouvelle
  mesure l'a rendu trop mince — jamais parce que le lecteur l'a désigné.

### Ce qui change dans l'image, et ce qui ne bouge pas

**Aucune bande ne se déplace, jamais.** Les deux extrémités d'une bande sont des lieux, donc des
données : la géométrie de chaque courbe est identique dans les trois états, à l'octet. Ce qui change
est la **largeur du trait** (`line-width`, une propriété de peinture MapLibre, interpolée sur la
même durée que le tableau — l'arbitrage n°4) et **quelles bandes sont dessinées du tout**.

Dans le tableau, **aucune ligne ne se déplace non plus** : l'ordre reste celui des personnes. Ce qui
change est le **rang** de chaque ligne (trois `<span>` empilés à une seule place, la feuille en
révèle un) et **la largeur de son échantillon de bande**, qui suit la mesure en CSS pur.

### Les contrôles déclarés

| # | la question du lecteur | le geste | ce qui change dans l'image |
| --- | --- | --- | --- |
| 1 | « Large de quoi — de monde, ou de place ? » | `toggle-a-comparison` | Les 31 bandes se redessinent à la largeur que la mesure leur donne, sans qu'aucune ne bouge d'un pixel ; la légende réécrit ses trois largeurs dans l'unité de la mesure ; le tableau renumérote ses rangs sur place ; et une phrase dit qui passe en tête et combien de destinations tombent sous le plancher de lisibilité. |
| 2 | « Cette bande-là, elle vaut combien exactement ? » | `ask-a-mark` | La bande pointée s'épaissit depuis sa propre encre et répond avec la destination, le nombre, sa part, ses trois rangs, la population et la surface qui la divisent. |
| 3 | « Et les trente-et-une, sans la carte — ou sans JavaScript ? » | `open-the-full-table` | Les 31 lignes s'ouvrent sous la carte, avec les trois mesures à la fois ; l'échantillon de largeur et le rang de chaque ligne suivent la mesure en CSS pur. C'est là que le geste survit quand la carte ne le peut pas. |

## Les deux choses que les couches doivent tenir

**1. La largeur est un VOLUME, donc elle ne grandit pas avec le zoom.** `live-map.mjs` nomme trois
comportements de rayon ; celui-ci est **`camera`** : dérivé du plan une fois, puis **tenu constant en
pixels d'écran** pendant que le lecteur zoome, « parce que le même nombre ne doit pas vouloir dire
deux choses à deux zooms ». Conséquence de construction : une bande est une couche **`line`**, dont
le `line-width` de MapLibre est nativement en pixels d'écran, et on obtient le comportement en
**n'écrivant AUCUNE expression de zoom**. Ce n'est surtout pas `ground` : un ruban dessiné en
polygone doublerait de largeur à chaque niveau de zoom et un volume deviendrait une surface.

**2. La courbe est une géométrie qu'on fabrique, et elle ne doit pas laisser croire à un trajet.**
Chaque bande est une **Bézier quadratique calculée dans le plan de Mercator lui-même** (x = longitude,
y = mercY(latitude)), échantillonnée en 48 points reconvertis en latitudes, puis remise à MapLibre
comme une `LineString` en degrés. Deux propriétés, et ce sont elles qui la rendent honnête :

- **la forme est une fonction PURE des deux extrémités** — le point de contrôle est sur la
  médiatrice de la corde, à une fraction fixe de sa longueur. Deux flux de volumes opposés entre les
  mêmes deux lieux donneraient exactement la même courbe. **La forme ne porte donc aucune donnée**,
  et un lecteur ne peut y lire aucun passage : il n'y a rien à y lire ;
- **elle est calculée dans le plan que la carte dessine**, donc elle est la même courbe à tous les
  zooms et reste collée à ses deux extrémités. Une courbe calculée à l'écran glisserait sur la
  géographie au premier déplacement.

Le chapô le dit en toutes lettres. Ce qui est exact, c'est la largeur, les deux extrémités et le
relèvement auquel la bande quitte l'origine.

## La caméra tient L'ÉVENTAIL, et c'est une affirmation de ce type-là

Le choroplèthe frère cadre **chaque pays en entier**, et il le doit : son sujet est un jeu de formes
qu'un cadre peut trancher, donc un pays coupé sous un titre qui compte des pays est une image qui
contredit sa propre phrase. **Le sujet d'une carte de flux, ce sont les bandes.** Le pays est du
mobilier ; la marque est le mouvement, ses deux extrémités et la courbe entre les deux. Ce que le
cadre doit au lecteur, c'est donc **chaque point de chaque bande**, et rien de plus.

Mesuré, parce que l'écart n'est pas petit. Cadrer les pays en entier atteint le cap Nord à 71,09° N,
dont aucune bande n'approche à six degrés près : à la boîte livrée cela coûtait **207° de longitude
dessinée** pour un éventail large de 52°. Cadrer l'ÉVENTAIL en coûte **169°**. L'océan que la
fenêtre large achetait est un océan vide.

La garde suit : elle refuse une fenêtre qui coupe une bande, et elle teste **la courbe entière**, pas
ses deux bouts — une bande BOMBE, donc une fenêtre qui tient les deux sièges peut encore couper le
milieu de l'arc, et un ruban qui quitte la planche et y revient est un trajet que la donnée n'a pas.

## Ce que Mercator coûte à CE sujet, mesuré

Une carte plate en Web Mercator étire le nord, et sur un éventail l'étirement ne frappe pas une
surface : il frappe **la LONGUEUR des bras**. Mesuré sur les sièges gelés de ce beat, la bande vers
l'Islande est dessinée **1,41 fois plus longue par kilomètre réel** que la bande vers Chypre
(Finlande ×1,37, Norvège ×1,37, Suède ×1,34). Un lecteur lit donc les destinations du nord comme
plus lointaines qu'elles ne sont. Le chiffre est dérivé au rendu et imprimé dans le chapô ; il n'est
jamais tapé. Le titre compte des PERSONNES et survit intact ; l'image, non.

## Vérification — faite, et les nombres

Copie keyée `renders/<direction>.local.html` ouverte depuis le disque et regardée, comme le
propriétaire vérifie.

| | boîte carte à 1512 × 860 | document | longitude montrée |
| --- | ---: | ---: | ---: |
| creme | **1464 × 455** | **860** | 169° |
| rapport | **1464 × 476** | **860** | 162° |
| nocturne | **1464 × 423** | **860** | 182° |
| *le patron (choroplèthe)* | *1464 × 519,6* | *860* | *186°* |

Le document ne défile pas et rien ne déborde à l'horizontale. La boîte est plus courte que celle du
patron d'une cinquantaine de pixels, et pour une raison qui appartient au type : **les échelons de la
légende sont dessinés à la largeur qu'ils nomment**, donc le plus large fait 30 px de haut là où la
pastille d'un choroplèthe en fait 14.

**Mesuré sur la page vivante** : 2 contrôles MapLibre (« Zoomer » / « Dézoomer ») et zéro bouton à
nous · aucune couche de texte MapTiler visible · zoom natif 2,606 → 3,606 au clic réel · glisser
réel, centre 7,45° → 15,25° E · plafond de zoom **dérivé** (Suisse–Liechtenstein, 1,417°) · les trois
mesures peignent 18 / 29 / 24 bandes et le tableau compte 13 / 2 / 7 échantillons en pointillé, les
mêmes · zéro erreur de page.

**Survol** : 16 des 18 bandes dessinées répondent d'elles-mêmes ; les 13 bandes comptées ne répondent
rien, ce qui est juste puisqu'elles ne sont pas dessinées ; l'Allemagne et la Pologne répondent la
bande plus fine dessinée PAR-DESSUS elles à ce pixel-là, ce qui est également juste — c'est celle que
le lecteur voit.

**Script coupé**, sur le fichier commité : la photo figée occupe la même boîte (1464 × 469), zéro
contrôle MapLibre, `mw-live` absent, la phrase d'aide calcule 0 px de hauteur, et le tableau garde le
geste en CSS pur.

## Source

Eurostat `migr_asytpsm`, juin 2026 · population 2023 via Our World in Data · surfaces calculées sur
les formes gelées du beat · fond MapTiler. `data.csv` et `shapes.geojson` sont des copies à l'octet
de `proof/static-flow-map-ukraine-protection/` ; `population.csv` de celle du beat hex grid.

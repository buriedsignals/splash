---
format: web
type: dot-density
medium: map
grounding: supported
derived: v1
---

# Beat — Sur 8 299 centrales bas-carbone européennes, 72 sont nucléaires (web)

**Type:** dot density (map). **Medium/format:** map / **web**.

## Claim

Of the **8 299** low-carbon power stations the database lists in Europe, **72 are nuclear — 0,9 % of
the sites — and they carry 35,6 % of the combined capacity.** Nuclear is also the most concentrated
fuel by capacity per site (**2 241 MW** against 96 for hydro, 28 for wind, 8 for solar), and that
ranking is **derived**: a data refresh that overturned it would change the sentence, and the beat
would throw.

## Le geste, écrit avant le code

**Ce que ce type cache et qu'aucun autre ne cache : ce qu'un point VAUT.** Un choroplèthe cache les
bornes de ses classes, un cartogramme la géographie qu'il a sacrifiée, une carte à symboles
l'échelle de l'aire. Un dot density cache la **valeur du point** — et cette valeur n'est pas un
réglage de rendu, c'est la phrase entière. Changez-la et le même fichier raconte l'inverse.

**Le geste : le lecteur choisit ce qu'un point vaut.** Trois résolutions, sur exactement les mêmes
8 299 lignes gelées :

| ce qu'un point vaut | points dessinés | points nucléaires | sites qui n'obtiennent aucun point |
| --- | ---: | ---: | ---: |
| **une centrale** | 8 299 | 72 — **0,87 %** de l'encre | 0 |
| **50 MW** | 9 062 | 3 236 — **35,7 %** de l'encre | 5 800 (69,9 %) |
| **500 MW** | 906 | 337 — **37,2 %** de l'encre | 7 748 (93,4 %) |

La première ligne et la deuxième déposent **la même quantité d'encre** (9 062 contre 8 299, à 9 %
près) et ce n'est pas une coïncidence : la valeur du point est **dérivée**, pas tapée — c'est la
puissance moyenne par site (453 082 MW ÷ 8 299 = 54,6 MW), arrondie au palier lisible le plus proche.
Les deux images portent donc le même poids d'encre et **seul l'endroit où elle est posée change**.
C'est exactement la revendication : 0,87 % de l'encre devient 35,7 % sans qu'une seule ligne du
fichier bouge.

La troisième rang est le **piège de la fiche du type, montré au lieu d'être évité** : « pick it too
large and a real concentration renders as a handful of sparse dots that reads as empty ». À 500 MW,
93 % des sites quittent la carte. La moitié opposée du piège (valeur trop petite, l'encre se referme
en pâté) est **mesurée et non livrée** : à 10 MW le semis compte 45 308 points, et le runner imprime
ce nombre à chaque rendu pour que la raison du refus soit un chiffre et pas un avis.

**Ce qu'un still ne peut pas faire.** Un still, une vidéo ou un scrolly peuvent DIRE qu'un point vaut
quelque chose ; aucun ne peut laisser le lecteur reposer la même encre trois fois et voir le
nucléaire passer de 0,87 % à 35,7 % de la planche sans qu'aucune donnée n'ait changé.

**Et la règle de placement, que le lecteur ne voit jamais, devient visible.** Sous la règle des
lieux, un point est à sa coordonnée réelle. Sous une règle en mégawatts, un site de 1 300 MW reçoit
26 points : ils sont posés en **spirale de phyllotaxie autour du site**, à un pas dérivé du rayon au
sol du point lui-même, de sorte que **l'aire de l'amas est proportionnelle à la puissance**. Le semis
ne « ment » donc pas sur la position : il dit que la puissance occupe du sol. La règle est écrite sur
la planche, déterministe, et le survol la rend palpable — pointer un point allume **tous les points
du même site**, donc le lecteur voit d'un coup combien de points ce lieu a obtenus. C'est la réponse
propre à ce type : ce qu'un dot density cache, c'est combien de points un lieu a reçus.

**La répartition des restes est une règle, pas un arrondi.** Chaque site reçoit `plancher(MW / valeur
du point)` points, puis les points restants vont aux plus gros restes (méthode des plus forts restes)
jusqu'à ce que le total soit exactement `arrondi(MW total / valeur du point)`. Un arrondi
indépendant par site aurait fait disparaître la donnée par les bords sans que le total le dise.

## Treatments spent

- `the-dots-resolution-is-what-the-data-supports` — **spent differently, and that is the gesture**:
  the resolution is no longer settled by the author. The file is a register of places, so ONE of the
  three rules is "one dot is one place" — and the beat ships the two rules that are not, side by
  side, because the choice is the argument.
- `three-classes-of-place-three-treatments` — the fuels are three treatments, not a ramp: the claim
  counts places by kind. **Les trois traitements sont trois COULEURS et une seule taille** — voir
  ci-dessous, c'est une correction de la forme précédente.
- `the-basemap-gives-up-its-contrast` — the coastline is a step off the ground and nothing more.

## Ce qui est corrigé par rapport à la forme SVG du 12 septembre

1. **Le nucléaire n'est plus dessiné deux fois plus gros.** La forme précédente donnait aux 72 points
   nucléaires un rayon de 3,4 contre 1,7 aux autres. Sur un dot density, **la taille d'un point EST
   sa valeur** : deux tailles, c'est deux valeurs du point dans la même image. Et surtout, cela
   fabriquait la visibilité que la revendication dit justement absente — la planche affirmait « 0,9 %
   des sites » en peignant le nucléaire à 3,4 % de l'encre. Un seul rayon, partout, sous les trois
   règles.
2. **Le rayon suit le zoom.** Un point couvre une aire de sol CONSTANTE, donc son rayon à l'écran
   double par niveau de zoom — une expression `["interpolate", ["exponential", 2], ["zoom"], …]`, pas
   un nombre. Conséquence mesurée et énoncée sur la planche : **la texture du semis est invariante
   d'échelle**, donc zoomer change ce qui est dans le cadre et jamais ce que la carte affirme. C'est
   toute la raison d'être de la règle au sol.
3. **La fenêtre déclarée de la caméra coupait l'étude.** Elle s'arrêtait à 42° E et 68° N ; les
   stations vont jusqu'à 44,93° E et 71,01° N. Le CADRE, lui, allait jusqu'à 46,4° E, donc rien ne
   rougissait — le défaut exact que le choroplèthe a nommé : une fenêtre trop courte est pardonnée
   par le débordement du cadre sur l'axe qui ne contraint pas. Fenêtre élargie, plaques recuites, et
   la garde mesure désormais la FENÊTRE.
4. **La portée du pointeur ne dépend plus du rayon du point.** Le défaut consigné sur l'ancienne
   forme — un point au sol de 1,2 px contre une portée de pointeur de 32 px — se mesure autrement ici
   : le survol est résolu par `queryRenderedFeatures` sur une **boîte** de 28 px (la cible que ce
   format donne partout ailleurs), et le point le plus proche du centre de la boîte répond. La taille
   du point ne gouverne plus rien de la réponse, ce qui est la seule façon d'avoir à la fois un point
   honnête (petit, au sol) et une cible atteignable.

## What the web adds

A dot map shows **where** and **how many** and says nothing about how big. The pointer answers with
the station's fuel, its megawatts, its country and its share of that country's fleet — the weight the
count deliberately drops — **and with how many dots that one site owns under the rule in force**,
which is the reading the dot value hides.

## Le repli, et ce que le geste devient sans script

Une couche MapLibre n'est atteignable par aucune feuille de style : la moitié CARTE du geste est donc
du script (`setLayoutProperty` sur trois couches de points). Ce que garde un lecteur sans JavaScript :
la photo figée de la carte vivante, la clé « 1 point = … » sous les trois règles, et **un tableau par
pays dont chaque cellule porte les trois comptes de points, dont un seul est révélé, en CSS pur**. Le
geste n'a pas disparu ; il a déménagé de l'image vers le tableau, et la planche le dit.

## Le fond de carte est MapTiler vivant, et ce que la projection coûte À CE TYPE

Le fond n'est plus une plaque cuite avec des marques SVG par-dessus : c'est une **carte MapTiler
vivante**, chaque point est une entité d'une couche `circle`, et le zoom, le déplacement, le clavier
et le survol viennent de MapLibre. Sous elle, une **photo figée de la carte vivante de cette page**
(pas du fond seul : un dot density replié sur son fond est une carte sans données). La clé n'entre
dans aucun fichier commité ; le runner écrit en plus `renders/<direction>.local.html`, ignoré par git.

**Ce que Mercator coûte ici n'est pas ce qu'il coûte au choroplèthe d'à côté**, et c'est pour cette
raison que ce beat n'a pas besoin de garder une caméra équivalente pour mesurer. Un point n'a pas
d'aire propre à gonfler, et le titre est un COMPTE et une SOMME : ni la phrase ni les marques ne sont
touchées. Ce qui est touché, c'est **le sol SOUS les points**, et un dot density se lit en encre par
sol. Mesuré sur les formes gelées du beat, à cette caméra, Russie mise à part :

- Norvège + Suède + Finlande couvrent **31,6 %** de la terre dessinée pour **16,5 %** de la terre
  réelle → le même semis y paraît **1,9 fois moins dense** qu'il ne l'est.
- Et la deuxième moitié du même fait, qui n'appartient qu'à ce type : `circle-radius` est une
  longueur d'ÉCRAN et l'échelle de Mercator dépend de la latitude, donc **un point couvre 12,8 km de
  rayon à 35° N contre 5,0 km à 71° N — 6,4 fois plus d'aire au sol au sud qu'au nord.** La taille au
  sol déclarée (9,4 km) est vraie à la latitude de référence du cadre et nulle part ailleurs.

Le chapô porte la première paire dans les mots du lecteur ; le runner imprime les deux à chaque
rendu, et refuse la phrase si la mesure cessait de la rendre vraie. `camera.ts` (Lambert azimutal
équivalent, EPSG:3035) reste dans le beat comme la caméra qui MESURE.

## Ce qu'un point vaut au sol, et pourquoi ce n'est pas un goût

Un point couvre **9,4 km de rayon**, et ce nombre est dérivé à l'envers : depuis **le plus petit
disque qu'un écran dessine honnêtement**, au cadrage que le beat publie. Mesuré sur la page livrée,
le même semis dessiné à neuf rayons constants et l'encre déposée comparée au r² qu'elle revendique :

| rayon px | 0,40 | 0,50 | 0,60 | 0,75 | 0,90 | 1,00 | 1,25 | 1,50 | 2,00 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| encre / r² | 0,31 | 0,44 | 0,58 | 0,77 | 0,92 | **0,99** | 1,09 | 1,10 | 1,00 |

À 1,0 px un cercle dépose encore 99 % de l'encre que son aire annonce ; à 0,75 px, 77 % ; à 0,50 px,
44 %. Le plancher est donc **1,0 px**, et la taille au sol du point est choisie pour que le point
tombe **exactement sur ce plancher** dans la boîte la plus courte des trois directions à 1512 × 860
(1464 × 466) — donc `minZoom` étant le cadrage ajusté, **le plancher n'est jamais en vigueur sur la
page livrée**. Il existe pour un conteneur plus étroit, où il achète un semis visible au prix d'une
densité surévaluée, et la page le dit.

## Source

Global Power Plant Database (WRI) · fond de carte MapTiler. `stations.csv` and `shapes.geojson` are
byte-for-byte copies of `proof/static-dot-density-europe-stations/`.

## Precision

```json splash:precision
{
  "kind": "pointer",
  "rounding": null,
  "asserts": [],
  "values": {},
  "staticFloor": [],
  "onDemand": [],
  "unfound": [],
  "covers": {
    "claim-datum": null,
    "dot-positions-are-declared-synthetic-where": null,
    "the-trap-is-measured-in-both": null,
    "a-dot-has-no-area-to": null,
    "asserted-in-the-js-off-floor": null
  }
}
```

## The choreography

```json splash:choreography
{
  "kind": "pointer",
  "promiseSource": "slot",
  "controls": [
    {
      "order": 1,
      "gesture": "toggle-a-comparison",
      "input": "tap"
    },
    {
      "order": 2,
      "gesture": "open-the-full-table",
      "input": "tap"
    },
    {
      "order": 3,
      "gesture": "ask-a-mark",
      "input": "hover"
    }
  ],
  "keyboard": true,
  "degradesTo": "static-frame"
}
```

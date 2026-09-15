---
format: web
type: cartogram
---

# Beat — Le lecteur rend à l'Europe la géographie que la grille lui a prise (web)

**Type:** cartogram (tile variant). **Medium/format:** map / **web**. **Frame:** fluid in width,
fixed in proportion.

## Claim

La même que le frère statique, et elle est un COUPLE : pondérée par la SURFACE, l'Europe est à
**44,9 %** bas-carbone ; pondérée par PAYS, à **65,1 %**. Vingt points d'écart, pas un chiffre
différent. La Russie occupe à elle seule **73,1 %** du dessin du choroplèthe, à **35,9 %**, et tire
la première moyenne vers le bas. 41 cases sont dessinées, 40 portent une lecture, 1 (l'Ukraine) est
creuse.

## Ce que ce type cache, et ce n'est pas ce que cachent les sept autres

Un choroplèthe cache les bornes de ses classes. Une carte de flux cache tout ce qui n'est pas le flux
dominant. Un cartogramme, lui, **cache la géographie qu'il a sacrifiée** — et il est le seul des huit
à sacrifier quoi que ce soit volontairement. Un lieu ne se déplace pas, dit le brief commun ; le
cartogramme est l'exception nommée, celle qui déforme POUR MESURER. C'est donc aussi le seul type
pour lequel l'arbitrage n°1 du propriétaire — *rien ne bouge sans que le lecteur voie pourquoi* — est
satisfait **par le mouvement lui-même**, à la seule condition que le mouvement soit le geste du
lecteur et jamais un effet de bord.

Ce que la grille a pris, exactement, est en deux morceaux, et les deux se mesurent :

1. **le LIEU** — où chaque pays est réellement. La Suède est à 5,27 cases de sa place, la médiane des
   41 vaut 1,97 case, et la Macédoine du Nord est à 0,17 case de la sienne.
2. **la SURFACE** — ce que chaque pays pèse sur une carte. Le carré de la Russie vaut **5,42 fois**
   la case que la grille lui donne ; celui de Malte en vaut **0,022**.

Et c'est le second morceau, pas le premier, qui fabrique le chiffre : rendre le lieu ne change pas
65,1 % d'un millième de point ; rendre la surface rend **44,9 %**, qui est le chiffre du choroplèthe.
**La distorsion du cartogramme n'est pas une distorsion de position, c'est une distorsion de poids**,
et la page le rend démontrable au lieu de l'affirmer.

## Le geste — `restore.ts`, un vocabulaire nouveau : **ce qu'une carte déformée rend de la géographie qu'elle a troquée**

Trois pastilles. Les 41 cases sont **un seul dessin**, dessiné aux coordonnées de la grille, que la
feuille générée TRANSLATE et MET À L'ÉCHELLE. Chacune des trois positions est un objet
cartographique réel et nommable, pas un cran de potentiomètre :

| pastille | ce que la case reprend | l'objet | la moyenne |
| --- | --- | --- | --- |
| **une case par pays** *(défaut)* | rien | le cartogramme en cases, tel qu'il est déposé | **65,1 %** |
| chaque case à sa place | le LIEU | des carrés égaux aux vrais centroïdes (un cartogramme de Demers) | **65,1 %** |
| chaque case à sa surface | le LIEU et la SURFACE | le cartogramme non contigu par la surface — le choroplèthe, en carrés | **44,9 %** |

**Une case reste toujours un carré.** Une étape déclare un centre et UN côté ; il n'y a pas de place
pour un facteur par axe, donc aucune étape ne peut aplatir un pays. Le chemin d'une étape à l'autre
est donc `translate() scale()` — une similitude, continue et exacte, ce qui est précisément ce que
l'arbitrage n°4 demande (« ça pourrait changer en lerp smooth au lieu de saccader »).

### Ce que chaque étape révèle, et chaque chiffre est lu sur la géométrie, jamais tapé

- **chaque case à sa place** — la moyenne ne bouge pas d'un millième : 65,1 % avant, 65,1 % après.
  Ce qui bouge, c'est la lisibilité : des 41 cases, **12 restent dégagées** et 29 se recouvrent. Le
  pays le plus déplacé est la Suède (5,27 cases) ; la médiane vaut 1,97 case.
- **chaque case à sa surface** — la moyenne tombe à **44,9 %**, le chiffre du choroplèthe, parce que
  c'est le même dessin. La Russie prend 73,1 % de l'encre à 35,9 % bas-carbone ; son carré vaut 5,42
  cases de côté contre 0,022 pour Malte, soit un rapport de **245 pour 1** entre les deux côtés.
  **20 cases sur 41 restent dégagées** — plus qu'à l'étape précédente, parce que rendre la surface
  écarte les petits pays au lieu de les empiler.

Le défaut ne révèle rien : ce n'est pas une contre-épreuve, c'est la revendication que le titre
énonce, et `assertRestoreDeclaration` refuse une phrase sous le défaut.

### Pourquoi ce n'est pas un zoom, et pourquoi ce n'est pas un pan

Un zoom déplace la CAMÉRA et coûte le cadrage que `camera.ts` argumente. Ici la caméra ne bouge
jamais : le `viewBox` est le même dans les trois états, la projection équivalente est la même, et ce
sont les MARQUES qui se déplacent à l'intérieur. Les trois états sont trois drawings de la même
fenêtre, pas trois fenêtres sur le même dessin.

### Pourquoi c'est un fichier neuf, et pourquoi aucun des vingt-et-un voisins ne pouvait le porter

- **`stack.ts`** déplace des colonnes sur une tour : un empilement n'a ni lieu ni surface, et sa
  géométrie est un ordre, pas une position.
- **`weigh.ts`** dit ce qu'une marque VAUT et re-échelonne une valeur ; ici la valeur (la part
  bas-carbone, la classe, la couleur) ne bouge dans aucun état. Ce qui change est le **support** de
  la marque, pas sa lecture.
- **`side.ts`** fait voyager des bandes et il a établi le mécanisme que ce fichier reprend — mais son
  refus central est *une coupure ne redimensionne jamais une bande*, parce qu'il n'existe aucun
  chemin continu entre deux rectangles de largeurs différentes. Ici le redimensionnement EST le
  geste, et il est licite pour une raison que `side.ts` ne peut pas exprimer : une case est un
  CARRÉ, donc son changement de taille est une **similitude**, et une similitude est un chemin
  continu qu'un lecteur lit comme le même objet. Un vocabulaire dont la garde principale est « la
  taille ne change jamais » ne peut pas porter un geste dont la moitié de l'intérêt est qu'elle
  change.
- **`reorder.ts` / `sort-or-reorder`** remettent les mêmes marques dans un autre ORDRE. Ici il n'y a
  pas d'ordre : il y a des coordonnées, et elles sont une donnée mesurée sur `shapes.geojson` dans la
  projection de `camera.ts`, pas une mise en page.
- **`filter.ts` (carte)** dit ce qui peut PARTIR. Rien ne part ici : les 41 cases sont là dans les
  trois états, y compris la case creuse.

`skills/map-web/assets/` porte `filter.ts` et `geo-symbol.ts`. Aucun des deux ne dit ce qu'une carte
RESTITUE, et `geo-symbol.ts` raisonne sur des points à rayon proportionnel dans une plaque cuite —
ce beat n'a pas de plaque, sa géométrie EST la donnée.

**Où le fichier est posé, et l'arbitrage du dépôt qui décide pour lui.** `restore.ts` est sous
`skills/chart-web/assets/` et non sous `skills/map-web/assets/`, pour une raison mécanique et non
par confort : ce beat rend par `skills/chart-web/scripts/render-web.mjs` (comme son voisin
choroplèthe-web, et pour la raison qu'il écrit — une carte vectorielle sans tuiles n'a que faire du
plan live de `map-web`), et surtout `no-cross-skill-imports.test.ts` interdit à TOUT fichier sous un
skill d'importer hors de ce skill. Un `restore.ts` sous `map-web` ne pourrait donc pas importer
`skills/chart-web/assets/control-chrome.ts` — et il devrait recopier le chrome des contrôles, ce que
le brief de ce lot interdit explicitement (« Ne recopiez pas de CSS de chrome depuis un frère »). Le
choix est entre les deux règles ; celle du chrome est la plus récente, la plus chèrement payée
(vingt copies dérivées, trois refus du propriétaire) et la seule des deux qui a un défaut visible à
l'écran.

### Les refus que `restore.ts` fait, et six qu'aucun voisin ne peut faire

1. **Une étape qui sort une case du cadre.** Une place que le lecteur ne peut pas voir n'est pas une
   place. Ni `side.ts` ni `stack.ts` n'ont de cadre à quitter.
2. **Une étape dont les côtés ne disent pas la surface qu'elle déclare.** Chaque étape déclare, par
   case, la part de surface que son carré prétend porter, et le fichier vérifie `côté² / Σcôté²`
   contre elle à 1e-9. C'est le refus « le dessin et la lecture sont deux lectures d'une seule
   arithmétique », dans les unités d'une carte — la manière exacte dont une page en vient à imprimer
   44,9 % au-dessus d'un dessin qui ne le dessine pas.
3. **Un nom posé sur une case qui ne peut pas le tenir.** C'est la règle du frère statique (« the
   tile has to hold its own name »), rendue PAR ÉTAPE : mesurée sur le côté RÉELLEMENT dessiné à
   cette étape, pas sur le pas de la grille. Sur ce beat elle mord immédiatement — le carré de Malte
   fait 1,9 unité de côté.
4. **Un nom retiré d'une case qui pouvait le tenir.** Le pendant du précédent, et c'est lui qui rend
   la règle STRUCTURELLE plutôt que déclarée : le fichier DÉRIVE quels noms sont dessinés, à partir
   des côtés et des recouvrements, et refuse la page écrite si elle en dessine d'autres. Un auteur
   n'a pas le droit d'éteindre une étiquette gênante.
5. **Une étape qui ne bouge rien** — le défaut sous un second nom, le refus de
   `directed-interaction.md` dans les unités de ce fichier.
6. **Une case qui n'est pas un carré** — structurel : une étape déclare UN côté.
7. Et les refus que les frères tiennent déjà, réhérités plutôt que réinventés : le dessin qui
   RÉPOND (`.pt` dans le `<svg>` qui voyage), le dessin non `aria-hidden`, une étape sans plaque de
   clic, une étape sans règle de révélation, la règle-couverture émise APRÈS la révélation du
   défaut, l'absence de `transition` (les cases sauteraient), une case à moitié étiquetée
   (`data-restore-cell` sans `data-mark`), une étape sans phrase, un défaut qui en porte une, un nom
   accessible qui ne contient pas son étiquette visible (WCAG 2.5.3).

## Les arbitrages du propriétaire, pris de face

**1. « Rien ne bouge sans que le lecteur voie pourquoi. »** C'est le geste, et c'est la seule page du
lot où le mouvement EST le contenu. Les garanties :

- **Aucun texte de furniture ne bouge.** Ni le titre, ni le caveat, ni la clé des classes, ni les
  pastilles, ni la phrase révélée. Le seul texte qui se déplace est **le nom d'une case, qui voyage
  AVEC sa case** — et la raison est la plus visible qui soit : le carré sous lui vient de partir. Le
  radar que le propriétaire a refusé deux fois déplaçait des intitulés d'AXE, c'est-à-dire de la
  furniture, sous un contrôle qui ne touchait pas à la géométrie.
- **Le nom ne CHANGE jamais de taille.** La case grandit, le nom non : le texte est dans un groupe
  qui est seulement translaté, jamais mis à l'échelle. Un nom à 5,42× serait une typographie
  déformée par une donnée.
- **Un nom s'éteint exactement quand sa case ne peut plus le porter**, et le fichier le DÉRIVE. La
  page dit, à chaque étape, combien de cases restent dégagées — le prix est imprimé, pas caché.

**2. « Pas de rond au survol. »** Ce qui répond est la case elle-même, assombrie depuis SON PROPRE
remplissage, à une dose CHERCHÉE jusqu'à un écart mesuré. La case creuse (Ukraine) n'a pas de
remplissage à assombrir : elle s'allume sur son CONTOUR, ce que le vocabulaire déclare par case
(`lift: "fill" | "stroke"`). C'est une nuance que seul ce type produit — *missing is drawn outside
the ramp*, donc la marque absente n'a pas d'encre d'où partir.

**3. « Pas d'encadré au survol ni au filtre. »** Le chrome vient de `control-chrome.ts` sans une
variation locale : lavis, anneau, mots.

**4. « Le changement d'état s'interpole quand c'est possible. »** Un seul dessin, toujours rendu,
`transform` transitionné. `display` ne sert qu'aux plaques de clic, aux phrases et à la ligne de
moyenne — jamais à l'image.

**5. « Le geste doit être propre au type. »** Aucun autre des huit types de carte ne peut le prendre :
sept d'entre eux ont pour promesse qu'un lieu ne se déplace PAS.

**6. « Une couleur se mesure contre le fond que la page peint vraiment. »** Voir `PALETTE.md`,
réécrit pour cette page.

## Ce que le mouvement coûte, dit plutôt que caché

**Ce qui bouge n'est pas ce qui répond.** `interaction.mjs` résout la marque pointée sur des `cx`/`cy`
lus une fois à l'initialisation, qu'aucun `transform` ne met à jour. Le dessin est donc
`aria-hidden`, sans événement de pointeur ; **trois plaques de clic transparentes**, une par étape,
échangées par `display`, portent les 41 points, cuits aux coordonnées de LEUR étape. Pendant le vol,
la plaque est déjà à l'arrivée : un lecteur qui pointe en plein vol est renseigné sur la case **qui
arrive**. Rien n'est jamais répondu depuis une place qu'aucune case n'occupera.

**Le piège d'accessibilité de la fiche, pris de face.** La fiche écrit que sur ce type la couleur
devient souvent le seul canal d'identité, « with no keyboard-navigable fallback for a non-mouse user
to relocate a specific region by name ». Ici c'est l'inverse : les 41 points sont `tabindex=0` dans
les TROIS étapes, chacun avec son `aria-label` complet, donc un nom éteint sur la planche reste
atteignable au clavier — et la réponse de chaque point dit, à chaque étape, ce que cette étape vient
de rendre à ce pays.

## Le piège de la fiche du type, et ce qu'il s'est révélé être ici

La fiche dépose que **confondre les deux variantes est LA faute** : la variante conservant la forme
(chaque polygone mis à l'échelle autour de son centroïde, vraie carte dessous) et la variante en
grille (une case égale par région, toute géographie jetée). « Know, explicitly, which variant a given
map is. »

Ce beat est la variante en grille. Le piège, sous un contrôle, prend une forme que la fiche n'avait
pas à envisager : **la page porte maintenant les deux variantes**, et le risque n'est plus de les
confondre en les nommant mal, c'est de les confondre en les DESSINANT l'une à la place de l'autre.
La réponse est que chaque étape est nommée par ce qu'elle rend (rien / le lieu / le lieu et la
surface) et que la moyenne affichée change avec elle — un lecteur qui voit 44,9 % sait, sans qu'on
le lui dise, qu'il ne regarde plus un cartogramme en cases.

La fiche demande aussi, pour la variante en grille, *« an explicit decoder line stating "each cell =
one region, equal size; colour = value" earns its place directly in the map's own furniture »*.
Cette ligne existe déjà dans le caveat du beat, et elle devient elle aussi une fonction de l'étape :
l'égalité des cases n'est vraie que sous le défaut, et la ligne de moyenne le dit.

## Ce que le web ajoute, en une phrase (`earns`)

Le lecteur rend à la carte le lieu, puis la surface, et voit que rendre le lieu ne déplace pas la
moyenne d'un millième tandis que rendre la surface la fait tomber de 65,1 % à 44,9 % — un still doit
choisir une des deux pondérations et imprimer l'autre en légende, une vidéo et un scrolly choisissent
en plus l'ORDRE, qui est déjà un argument.

## Les contrôles, et ce que chacun doit passer

| # | la question du lecteur | le geste | ce qui change dans l'image |
| --- | --- | --- | --- |
| 1 | « Où sont vraiment ces pays, et qu'est-ce que ça change au chiffre ? » | `toggle-a-comparison` | Chaque case glisse jusqu'à son vrai centroïde puis se met à sa vraie surface ; les noms voyagent avec leur case et s'éteignent quand elle ne peut plus les porter ; la ligne de moyenne se réécrit et une phrase nomme ce que l'étape vient de rendre. |
| 2 | « Qu'est-ce que cette case-là a perdu ? » | `ask-a-mark` | La case pointée s'assombrit depuis son propre remplissage (la case creuse sur son contour) et répond avec le pays, sa part exacte, les bornes de son palier, ses TWh, son rang — et, selon l'étape, ce qu'elle occupe vraiment du dessin. |

Deux contrôles écartés, et la mesure derrière chacun :

- **Un zoom/pan.** Refusé par le brief du lot et par la caméra : le cadrage est une affirmation
  éditoriale argumentée dans `camera.ts`, et un zoom la dépense pour rien.
- **Filtrer par palier.** Il y a cinq paliers et 41 cases toutes visibles ; retirer des cases
  détruirait exactement ce que les trois étapes mesurent, qui est une géométrie de l'ENSEMBLE (les
  recouvrements, la part de surface, la moyenne). Un filtre et ce geste ne peuvent pas coexister sur
  cette planche.

## Traitements

- `a-missing-cell-is-drawn-as-missing` — **dépensé, et il gagne une conséquence.** La case creuse
  n'a pas d'encre, donc elle ne peut pas s'assombrir : elle s'allume sur son contour. *Missing* n'est
  pas une classe, et ça se voit jusque dans le survol.
- `the-key-prints-its-breaks-in-the-data-s-units` — la clé nomme ses paliers en pour cent, et elle ne
  bouge dans aucune étape : c'est la couleur qui est l'invariant de cette page.
- `the-scale-is-stepped-not-continuous`, `the-key-names-its-classes-in-their-own-colours` — comme le
  frère statique et le choroplèthe.

## La couleur

Argumentée et mesurée dans `PALETTE.md`, réécrit : le fichier de ce beat était l'une des 40 copies
identiques à l'octet raisonnant sur une aire partagée en deux moitiés à une année pivot, ce qui n'est
le sujet d'aucune page ici.

## Le `lineHeight` codé en dur

Aucun. Ce beat n'était pas dans la liste des dix de `KNOWN-STATE.md` et n'en ajoute pas.

## Le défaut systémique de la cellule étirée

Ce type dessine des **carrés**, c'est-à-dire des FORMES, et son `<svg>` porte déjà
`preserveAspectRatio="xMidYMid meet"` — parce qu'un cartogramme en cases promet que chaque case est
LA MÊME case, et qu'une boîte étirée en fait le même rectangle, ce qui est une autre promesse. La
mesure de l'anisotropie de la cellule est reportée dans la vérification.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 ·
surfaces et centroïdes mesurés sur les mêmes formes gelées, dans la même projection équivalente.
`data.csv` et `shapes.geojson` sont des copies octet pour octet de
`proof/static-cartogram-europe-lowcarbon/`.

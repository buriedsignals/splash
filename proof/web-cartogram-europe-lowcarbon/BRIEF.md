---
format: web
type: cartogram
medium: map
grounding: supported
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

1. **le LIEU** — où chaque pays est réellement. La grille déposée est à **16,4 % de la largeur de la
   carte** du vrai centroïde en médiane, et à 43,9 % pour la Suède : c'est ce que la grille a pris,
   mesuré, et elle ne l'a jamais dit.
2. **la SURFACE** — ce que chaque pays pèse sur une carte. Le carré de la Russie vaut **5,33 fois**
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
| chaque case près de sa place | le LIEU | des carrés égaux relaxés depuis les vrais centroïdes (Demers) | **65,1 %** |
| chaque case à sa surface | le LIEU et la SURFACE | le cartogramme non contigu par la surface — le choroplèthe, en carrés | **44,9 %** |

**Une case reste toujours un carré.** Une étape déclare un centre et UN côté ; il n'y a pas de place
pour un facteur par axe, donc aucune étape ne peut aplatir un pays. Le chemin d'une étape à l'autre
est donc `translate() scale()` — une similitude, continue et exacte, ce qui est précisément ce que
l'arbitrage n°4 demande (« ça pourrait changer en lerp smooth au lieu de saccader »).

### La relaxation, et pourquoi elle est l'instrument et non un arrangement

Des carrés déposés sur leurs vrais centroïdes se recouvrent, et ici massivement : **125 paires sur
38 des 41 cases** au vrai lieu, **40 paires sur 35** à la vraie surface. La première réponse de ce
beat a été de rendre ce tas VISIBLE — une frontière cuirassée sur chaque carré, qui a fait passer la
pire frontière lisible de 1,18:1 à 1,79:1. **Le propriétaire a lu la page et l'a déclarée illisible
une seconde fois** (« le positionnement au filtre rend les trucs illisibles »), et il a raison : un
tas bien dessiné reste un tas.

L'instrument établi pour ce cas exact est la **relaxation de cartogramme** — Dorling pour les
cercles, **Demers pour les carrés**, qui est ce cas. Elle tient trois choses à la fois :

- **la surface n'est JAMAIS touchée.** Le côté d'un carré EST sa quantité ; la relaxation ne déplace
  que des centres, donc `côté² / Σcôté²` — la part que l'étape déclare et que
  `assertRestoreDeclaration` contrôle à 1e-9 — est exactement la même avant et après. Le chiffre que
  la page imprime est dessiné.
- **l'agencement relatif est conservé.** Chaque carré part de son vrai centroïde et n'est poussé que
  par un carré qu'il recouvre réellement, le long de l'axe où il le recouvre le MOINS : la
  séparation la moins chère est celle qui est prise, rien n'est re-trié ni re-empaqueté.
- **le recouvrement tombe à zéro.** C'est la condition d'arrêt, pas une cible : le balayage se répète
  jusqu'à ce qu'aucune paire ne soit plus proche que ses deux demi-côtés plus le jour de fond, et la
  fonction LÈVE une erreur chiffrée si elle n'y arrive pas. Aucune page ne part avec un tas.

Deux choix à l'intérieur, tous deux mesurés : une paire se sépare **au prorata de la surface de
l'autre** (un petit pays cède devant un grand — sur un cartogramme, la surface EST la quantité, donc
la lecture qui a le plus à perdre dans une position est celle qui la garde), et chaque balayage ne
retire que **0,7** du recouvrement d'une paire — retirer tout est ce qu'on écrit spontanément et
c'est mesurablement pire : les poussées dépassent, les voisins ricochent, et l'agencement se pose
plus loin de la vérité que nécessaire (18,2 % contre 14,7 % de pire écart, pour le même zéro
recouvrement).

### Ce que ça coûte, dit et non caché

| étape | paires qui se recouvrent | écart au vrai centroïde, médiane | pire écart |
| --- | --- | --- | --- |
| une case par pays *(la grille déposée)* | **0** | **181,3 u — 16,4 % de la largeur** | Suède 484,9 u — 43,9 % |
| chaque case près de sa place | **0** | **84,2 u — 7,6 %** | Serbie 190,3 u — 17,2 % |
| chaque case à sa surface | **0** | **17,6 u — 1,6 %** | Slovénie 59,8 u — 5,4 % |

**La comparaison qui met le prix en proportion est la grille déposée elle-même**, qui facture le
même prix en silence et en facture DAVANTAGE : une grille en cases dessinée à la main est deux fois
plus loin des vrais centroïdes que l'étape relaxée. Chaque étape imprime son écart dans sa phrase, et
chaque case répond avec le sien. Aucun carré n'est placé où il est par souci de propreté ; chacun est
aussi près de son pays que le zéro recouvrement le permet.

Et le prix est BORNÉ plutôt que constaté : `RESTORE_DISPLACEMENT_CEILING` refuse une étape relaxée
qui pousserait un carré à plus d'un quart de la largeur de la carte de son centroïde — au-delà, un
lecteur qui cherche son propre pays le trouve à côté du mauvais voisin, ce qui est la seule chose que
rendre le lieu servait à faire.

### Ce que la relaxation a retiré du dessin

- **la couche de frontières cuirassées** — le recensement (`restoreCrowdingOf`) ne trouve plus une
  seule paire en collision dans aucune étape, donc la couche n'a plus rien à séparer : 82 rectangles
  invisibles et leurs règles sont partis. `restore.ts` GARDE le recensement et garde le refus : dès
  qu'une étape empile à nouveau, les contours redeviennent obligatoires et la page est refusée sans
  eux.
- **le halo des noms** — il existait pour qu'un mot survive aux frontières qui le traversaient. Plus
  de frontières, plus de recouvrement : un nom est seul sur son propre remplissage, c'est-à-dire
  exactement la condition contre laquelle son encre a été mesurée. Un halo qui peint du remplissage
  sur du remplissage est de l'encre que personne ne voit.

### Ce que les mots de la plaque ne disent plus

Une pastille ne dit plus « chaque case à sa place » : un carré est **près** de son centroïde, pas
dessus. Ce qui reste exact est la SURFACE, et cette pastille-là le dit. Chaque phrase révélée porte
l'écart réellement laissé.

### Ce que chaque étape révèle, et chaque chiffre est lu sur la géométrie, jamais tapé

- **chaque case près de sa place** — la moyenne ne bouge pas d'un millième : 65,1 % avant, 65,1 %
  après. Ce qui bouge, c'est la lisibilité, et elle bouge dans le bon sens : **les 41 cases restent
  dégagées** (contre 12 avant la relaxation), donc les 41 noms sont lisibles. Le trajet depuis la
  grille vaut 2,01 case en médiane, 4,07 pour la Suède.
- **chaque case à sa surface** — la moyenne tombe à **44,9 %**, le chiffre du choroplèthe, parce que
  c'est le même dessin. La Russie prend 73,1 % de l'encre à 35,9 % bas-carbone ; son carré vaut 5,42
  cases de côté contre 0,022 pour Malte, soit un rapport de **245 pour 1** entre les deux côtés.
  **41 cases sur 41 restent dégagées** après relaxation — contre 20 avant.

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

**Où le fichier est posé, et la prémisse fausse qui avait failli le poser ailleurs.** `restore.ts`
est sous **`skills/map-web/assets/`**, avec `filter.ts` et `geo-symbol.ts`, parce qu'un répertoire de
skill doit pouvoir se copier tel quel : un vocabulaire de CARTE garé dans `chart-web` est un
vocabulaire qu'une rédaction qui installe `map-web` ne reçoit jamais.

Un premier jet l'avait posé sous `chart-web`, au motif que `no-cross-skill-imports.test.ts` aurait
empêché un `restore.ts` sous `map-web` d'importer `skills/chart-web/assets/control-chrome.ts`, et
qu'il aurait donc fallu recopier le chrome des contrôles — ce que le brief de ce lot interdit. **La
prémisse était fausse, et c'est l'arrangement qui la rendait vraie.** La règle contraint les
fichiers À L'INTÉRIEUR d'un skill ; un beat sous `proof/` n'est dans aucun skill et importe de
n'importe lequel. Donc `restore.ts` **n'importe rien du tout** — comme `classing.ts`, écrit en
parallèle pour le choroplèthe — et c'est `DirectedCartogramWeb.tsx` qui appelle `controlChromeCss`
de `chart-web` et `restore.ts` de `map-web` côte à côte. Le chrome n'est recopié nulle part, et la
règle des imports est verte.

Ce qui restait de « chrome propre à ce contrôle » n'était pas du dessin : c'étaient deux arguments
(les phrases sont EMPILÉES dans une seule cellule de grille, et trois ems leur sont réservés), que
le beat passe maintenant lui-même.

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
5bis. **Une étape qui se dit relaxée et ne l'est pas.** `relaxed: true` dit trois choses — surfaces
   exactes, zéro recouvrement, et chaque carré aussi près de son centroïde que ça le permet — et les
   trois sont CONTRÔLÉES : une étape relaxée qui ne déclare pas où sont vraiment ses pays est
   refusée (un écart que personne ne peut mesurer est un écart que personne n'a à rapporter), une
   étape relaxée qui empile encore est refusée avec le compte des paires, et une étape qui pousse un
   carré au-delà de son plafond est refusée avec le nombre.
5ter. **Une plaque de clic cuite aux coordonnées d'une autre étape.** Lu sur la page écrite : le
   point qui répond pour un pays doit être à moins d'un demi-millième du cadre du carré que l'étape
   déclare. C'est le seul refus de ce fichier qui lit un NOMBRE sur la page plutôt que la présence
   d'un attribut, et il tient ensemble les deux moitiés que la séparation dessin/plaque a créées :
   la position du carré vient de la feuille de style que `restore.ts` génère, celle du point est
   écrite par le BEAT.
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

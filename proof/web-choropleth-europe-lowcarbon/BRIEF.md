---
format: web
type: choropleth
medium: map
grounding: supported
---

# Beat — La carte montre sept pays parce qu'on a choisi de couper à 94 % (web)

**Type:** choropleth (map). **Medium/format:** map / **web**. **Frame:** la carte est VIVANTE — une
carte MapTiler plate, sans viewBox, qui prend toute la largeur de la figure et montre le sol que
cette largeur lui donne. La plaque cuite sous elle porte le même cadre.

## Claim

**Sept pays européens ont tiré plus de 94 % de leur électricité 2024 de sources bas-carbone** —
Albanie, Islande, Suède, Norvège, Suisse, Finlande, France. 41 pays sont dessinés, 40 portent une
lecture et **1 est dessiné en creux**, faute de lecture.

Le titre est un COMPTE de pays au-dessus d'un seuil énoncé. Il est vrai sous n'importe quelle règle
de classement, et c'est précisément ce qui rend le geste de cette page possible sans toucher à la
revendication : ce qui bouge n'est jamais le nombre, c'est la CARTE.

## La question du lecteur, et pourquoi aucun still ne peut y répondre

Un choroplèthe ne montre pas des nombres. Il montre une PARTITION de nombres — une décision prise
par quelqu'un, avant le dessin, sur l'endroit où une couleur s'arrête et où la suivante commence. Le
lecteur ne voit jamais cette décision. Il voit son résultat, et il le lit comme une propriété du
monde : « voilà les pays foncés ».

Sur ces mêmes 40 lectures, la bande la plus foncée compte :

| la règle | ses bornes | pays dans la bande la plus foncée |
| --- | --- | ---: |
| seuil énoncé (celle de la planche) | 50 / 70 / 94 % | **7** |
| quantiles (paliers de 10 pays) | 46,1 / 69,2 / 86,0 % | **10** |
| intervalles égaux (4 tranches de 22,3 pts) | 33,0 / 55,3 / 77,7 % | **13** |
| ruptures naturelles (Fisher-Jenks) | 45,6 / 64,9 / 84,3 % | **13** |

Trois règles sur quatre — toutes parfaitement standard, deux d'entre elles les défauts de n'importe
quel outil de cartographie — peignent dix ou treize pays dans la couleur que le lecteur lit comme
« le haut du panier ». **Le sept est celui de la PHRASE ; la carte, elle, n'en montre sept que parce
qu'on a coupé à 94.** Un still ne peut pas dire ça : il EST l'une des quatre cartes, et rien en lui
n'indique qu'il y en avait trois autres. Une vidéo pourrait les faire défiler, mais dans un ordre
choisi par l'auteur, sans que le lecteur puisse revenir comparer deux règles précises. Un scrolly a
le même défaut, plus long.

C'est la question : **« sept pays — sept selon quelle règle, et qui change de couleur si on coupe
autrement ? »**

## Le geste — `classing.ts`, un vocabulaire de carte neuf : **la règle qui coupe les classes**

`skills/map-web/assets/classing.ts`. Quatre radios natives, du CSS généré au build, zéro script. Le
lecteur choisit la RÈGLE, jamais les bornes une par une — une règle est un objet éditorial qu'on
peut nommer et défendre, un curseur ne l'est pas, et un curseur coûte un script, un état clavier et
une histoire sans JavaScript que les bandes nommées donnent gratuitement (`filter.ts` prend la même
décision pour la même raison).

Ce qui change dans l'image, et rien d'autre :

1. **Les 40 pays se re-teintent**, chacun dans le cran de la rampe que la règle choisie lui donne.
   La rampe, elle, ne change JAMAIS : mêmes quatre couleurs, même ordre, même sens. Ce qui se
   déplace, c'est la frontière entre elles.
2. **Les bornes de la légende se réécrivent**, en pourcentage, avec le nombre de pays que chaque
   palier contient sous cette règle. La distribution devient visible : 12/8/13/7 sous le seuil,
   10/10/10/10 sous les quantiles, 5/9/13/13 sous les intervalles égaux.
3. **Une phrase dérivée** dit ce que la règle fait à la lecture — combien de pays entrent dans la
   bande la plus foncée, lesquels, et combien des 40 changent de palier par rapport à la planche.

**Aucun pays ne bouge (la caméra ne change pas). Aucune étiquette ne bouge. Aucun mot du titre, du chapô, de la note de
revendication ou de la source ne bouge.** L'arbitrage n°1 du propriétaire est tenu structurellement
et pas par prudence : ce vocabulaire n'a nulle part où déclarer une position, il ne sait émettre
qu'un `fill`. Et les bornes de la légende, qui SONT du texte qui change, sont empilées dans une
seule cellule de grille — chaque pastille de légende a donc la largeur de la plus longue de ses
quatre variantes, sous les quatre règles, et le rang de légende ne bouge pas d'un pixel quand le
lecteur change d'avis. Le texte change *sur place*, pour une raison que le lecteur vient lui-même de
demander.

**Le changement s'interpole** (arbitrage n°4) : `fill` se transitionne, et les 40 pays traversent
d'un cran à l'autre en 260 ms. C'est là que le geste devient une lecture plutôt qu'une bascule — on
VOIT quels pays changent, parce qu'eux seuls se déplacent dans la rampe pendant que les autres
restent. Le survol, lui, reste instantané : `.mark-active` coupe la transition à l'aller.

### Ce que l'architecture vivante a coûté à ce geste, dit ici et pas découvert plus tard

**Passe du 15 septembre 2026.** Le propriétaire a tranché : *« la map doit prendre toute la largeur
quitte à afficher plus de map. Regarde le pilote qu'on a produit dans scrolly, c'est presque la même
sauf qu'avec web on peut avoir des contrôles, zoom, déplacement et hover en plus directement dans
MapTiler. »* Et, sur la projection : *« oui une carte MapLibre plate pas un globe. »*

C'est une décision d'architecture, pas de style. Les marques de cette page étaient 41 `<path>` SVG
au-dessus d'une plaque cuite. Un SVG a un `viewBox`, donc un rapport, donc une borne de largeur qu'il
faut arbitrer — et chacun des arbitrages produits a été refusé. **Une carte vivante n'a pas de
viewBox** : elle remplit son conteneur. Le problème ne s'arbitre plus, il disparaît. Les aplats, les
bordures, le pays en creux et le pays pointé sont désormais des couches MapLibre lisant les tuiles
**MapTiler Countries**, jointes par code **ISO A2** — la même source et la même jointure que le
pilote scrolly que le propriétaire a validé.

**Le coût, énoncé.** Le geste était du CSS pur au-dessus d'un SVG : quatre radios natives, des règles
générées à la construction, zéro script. Aucune feuille de style n'atteint une couche MapLibre, donc
**la moitié CARTE du geste est maintenant du script** — un `setPaintProperty` par règle, sur une
expression construite à la CONSTRUCTION depuis le même index que le balisage. Ce qu'un lecteur sans
JavaScript perd, c'est la carte qui se re-teinte. Ce qu'il garde : la plaque, les bornes et les
effectifs de la légende sous les quatre règles, la phrase dérivée, et **un tableau des 41 lectures
dont les pastilles se re-teintent en CSS pur, exactement comme avant**. Le geste n'a pas disparu sans
script ; il a déménagé de l'image vers le tableau. Mesuré, script coupé, sur les trois directions :
les pastilles du tableau ET les bornes de la légende changent bien sous chacune des quatre règles.

**Et les deux moitiés dérivent d'un seul index.** `assertOneClassing` relit le balisage de la page
écrite ; `assertClassingReachesTheLayers` relit le plan de la même page ; les deux sont tenues contre
la réponse unique de `buildClassingIndex`.

### Pourquoi ce n'est ni un zoom, ni un pan, ni l'un des dix-neuf vocabulaires existants

Le zoom et le déplacement EXISTENT maintenant, et ils viennent de MapTiler : ce sont ses contrôles à
lui, sa molette, son glisser, son clavier. Mais ils ne sont pas LE GESTE de ce beat — ils sont ce
qu'une carte web doit à son lecteur depuis la décision R1 (« la carte doit rester interactive tout le
temps sinon il n'y a pas d'intérêt d'être sur le web si on peut pas naviguer dedans »). Le geste,
lui, reste la règle de classement, et il ne touche pas à la caméra : aucun pays ne bouge quand la
règle change.

Aucun vocabulaire existant ne l'exprime, et ce n'est pas faute d'avoir regardé :

- `filter.ts` (chart ET map) fait DISPARAÎTRE un sous-ensemble. Ici rien ne disparaît jamais : les
  40 pays sont peints dans les quatre états, et un pays qui s'en irait serait un mensonge sur la
  distribution que la règle partitionne.
- `level.ts` couche les niveaux d'une donnée en travers du plot pour qu'on lise les autres contre
  elle. Un choroplèthe n'a pas d'axe à coucher quoi que ce soit en travers.
- `cutoff.ts` déplace UNE ligne sur un axe et souligne la région qu'elle sélectionne. Une règle de
  classement déplace TROIS bornes à la fois, et solidairement : c'est la règle qui les produit, pas
  l'auteur qui les pose. Un `cutoff` à trois lignes indépendantes offrirait au lecteur de fabriquer
  une partition que personne ne défend.
- `side.ts` décide de quel côté d'une couture un barreau ordonné compte ; `rebase.ts` rend à une
  bande la ligne de base que l'empilement lui cache. Les deux sont des vocabulaires de graphique et
  supposent un axe.
- `geo-symbol.ts` dimensionne un cercle, `map-web/filter.ts` retire des marques d'une couche vive.

**Et surtout : `classing` n'est pas un filtre déguisé.** Le dépôt a déjà payé un mot voulant dire
deux comportements (`map-web` RETIRAIT là où `chart-web` ATTÉNUAIT). Le fichier vit donc dans
`skills/map-web/assets/`, avec son nom à lui, et il n'émet qu'une propriété : la couleur de
remplissage d'une forme, plus la borne que la légende affiche.

### Ce que `classing.ts` refuse, et pourquoi chaque refus a coûté quelque chose à quelqu'un

- **Une règle dont la partition égale celle par défaut** — c'est la carte de départ sous un second
  nom, l'exacte forme qu'`assertFilterDeclaration` refuse depuis qu'elle existe.
- **Deux règles qui partitionnent identiquement** — deux pastilles pour une image.
- **Une règle qui laisse un palier vide** — une couleur dans la légende que la carte ne peint nulle
  part, ce que le lecteur lit comme « aucun pays ici » alors que c'est « cette règle ne sait pas
  faire quatre paquets ».
- **Un nombre de paliers qui diffère d'une règle à l'autre** — la légende ne pourrait plus empiler
  ses bornes dans une cellule fixe, et le rang se remettrait à bouger.
- **Une forme dessinée qui ne porte pas le vocabulaire** — la moitié des pays se re-teindrait et
  l'autre garderait la couleur de la règle précédente. C'est le défaut B6.18b, une couche plus bas.
- **Une feuille de style qui ne répond à aucune option** — chaque attribut resterait parfaitement
  correct et rien ne changerait à l'écran ; c'est la mutation qui a fait naître cette famille de
  gardes (`descend.ts`).
- **Une règle de classement émise APRÈS la règle du pointeur** — la spécificité de
  `:has(#id:checked)` vaut (1,3,0) contre (0,3,0) pour `[data-mark].mark-active` : sans une règle de
  pointeur par option, le pays survolé garderait sa couleur de palier sous trois règles sur quatre.

## Le piège de la fiche du type, et ce qu'il s'est révélé être ici

`skills/map-beat/references/types/choropleth.md` nomme comme « la seule chose qui va mal » la
**jointure silencieuse** entre les lignes de données et les formes : `ISO_A3` vaut `-99` pour la
France et la Norvège dans Natural Earth, le Kosovo est `OWID_KOS` d'un côté et `KOS` de l'autre, et
un pays manquant se dessine comme une classe légitime que personne ne remet en cause.

Ici, la forme littérale du piège est déjà fermée par la sœur statique : les deux fichiers sont gelés
et copiés à l'octet, la jointure passe par `ADM0_A3`, et le seul pays sans lecture (l'Ukraine) est
dessiné en creux et pointillé, nommé dans la légende, jamais rangé dans le palier le plus bas.

**Mais sa RAISON est grande ouverte, et c'est exactement ce que ce geste attaque.** La fiche dit :
*« une région dont la clé ne correspond pas se rend simplement en pas-de-donnée — une classe
légitime déjà dans la légende, dans une teinte qu'un lecteur accepte sans y repenser »*. Le mécanisme
du piège n'est pas la clé : c'est **qu'une classe est acceptée sans y repenser**. La même fiche pose
plus loin la règle jumelle — *« une échelle divergente n'est honnête que s'il existe un vrai point
de référence que la donnée traverse … et ce point doit être déclaré explicitement, pas laissé à ce
que le min/max produisent »*. Une échelle séquentielle n'échappe pas à la règle : ses bornes aussi
sont produites par quelque chose, et ce quelque chose n'est écrit nulle part sur la carte. Ce beat
écrit les quatre.

## Ce que le web ajoute, en une phrase (`earns`)

Un still et une vidéo peuvent AFFIRMER que les bornes d'un choroplèthe sont un choix ; ni l'un ni
l'autre ne peut laisser le lecteur reposer la même question à quatre règles standard et voir treize
pays entrer dans la bande la plus foncée là où la planche en montre sept.

## Les contrôles, et ce que chacun doit passer

**1. La règle de classement.** Question : *« sept pays — sept selon quelle règle, et qui change de
couleur si on coupe autrement ? »* Geste : `toggle-a-comparison`. Ce qui change : les 40 pays
traversent la rampe jusqu'au cran que la règle choisie leur donne, les quatre bornes de la légende
se réécrivent sur place avec le compte de pays de chaque palier, et une phrase dit combien de pays
entrent dans la bande la plus foncée et combien des 40 ont changé de palier.

**2. Le pays lui-même.** Question : *« ce pays-là, il vaut combien exactement, et est-ce qu'il change
de couleur selon la règle ? »* Geste : `ask-a-mark`. Ce qui change : le pays pointé s'assombrit
depuis SON PROPRE remplissage — celui du palier où la règle courante l'a mis, jamais une dose fixe —
et répond avec sa part exacte, ses TWh bas-carbone sur son total, son rang sur 40, et **s'il garde
le même palier sous les quatre règles ou non**. Cette dernière lecture est le seul endroit où les
quatre règles se lisent d'un coup, pays par pays, et elle ne dépend d'aucune d'elles : c'est
pourquoi elle peut être cuite dans la réponse alors que le palier courant, lui, ne le peut pas.

Le palier courant a été RETIRÉ de la réponse au pointeur, et c'est une correction de cette passe :
`interaction.mjs` lit `data-detail` une fois et une chaîne cuite qui nommerait « palier 70–94 % »
mentirait sous trois règles sur quatre. La couleur dit le palier ; le pointeur dit le nombre que la
couleur cache. Les deux lectures ne se recouvrent plus.

## Traitements

- `the-key-names-its-classes-in-their-own-colours` — la légende EST les paliers, dans leurs propres
  pastilles, avec leurs bornes en pourcentage et leur effectif. Sous chacune des quatre règles.
- `the-ramp-is-monotone-in-lightness` — les paliers ne montent que dans un sens, donc l'ordre
  survit à une impression en noir et blanc et à une déficience de vision des couleurs. Mesuré :
  voir « La couleur ».
- `a-missing-cell-is-drawn-as-missing` — creux, pointillé, nommé dans la légende, et **exclu des
  quatre règles** : une règle de classement se calcule sur les lectures qui existent.
- Un anneau trop petit pour être aminci est gardé entier — la règle qui empêche Malte de disparaître.

## La couleur

Quatre paliers, pas cinq, et c'est une mesure, pas un goût — le détail est dans `PALETTE.md`.

## Le défaut systémique de la cellule étirée

Ce beat ne dessine aucune FORME au sens du défaut (a) : pas de cercle, pas de pointe de flèche, pas
d'icône. Il dessine une géographie, et il la protège autrement — `preserveAspectRatio="xMidYMid
meet"` sur le `<svg>`, contre le `none` du format, parce qu'une projection équivalente étirée sur un
axe n'est plus équivalente. La cellule est mesurée à 1,000 dans les trois directions ci-dessous.

## Verification — passe « carte vivante » du 15 septembre 2026

Tout ci-dessous est lu dans un vrai navigateur, sur la page émise, avec la vraie clé MapTiler
substituée dans une COPIE qui n'approche jamais le dépôt.

**Les deux nombres en tête.** À 1512 × 860 : la carte est dessinée **1464 px de large** — toute la
largeur que la figure laisse une fois ses marges de 24 px respectées, **zéro gouttière** — et la
**hauteur du document est de 1429 px** (creme 1446, nocturne 1445), donc la page défile de 569 px.
Le débordement horizontal est nul. Avant cette passe, la même page dessinait sa carte **760 px de
large** dans une figure de 1464 : c'est le défaut que le propriétaire a signalé.

**Pourquoi la hauteur ne rentre pas dans la fenêtre, mesuré et non supposé.** La largeur est fixée
par la décision du propriétaire ; la seule variable libre est la HAUTEUR de la boîte. Tenir le
document dans la fenêtre laisse à la carte ~550 px sous 1464 px — une boîte de 2,7:1 — et un jeu
d'étude presque carré une fois projeté occupe `1/rapport` de la largeur quelle que soit la caméra :
cette boîte-là demanderait **environ 179° de longitude** pour un sujet large de 69°. Ça a été cuit et
REGARDÉ : l'Europe tient dans le tiers central, avec le Groenland, le Canada et la Sibérie autour.
C'est pire que le défaut réparé. La hauteur du gabarit est donc gardée (`flex: 0 0 auto` sur le plot)
et la page défile — le troisième terme du trio que `FULL-WIDTH-BRIEF.md` consigne, et celui que le
beat à symboles proportionnels livre déjà. Au cadrage retenu la carte montre **87° pour 69°**
(1,26×).

**La carte vivante, aux trois directions.** `mw-live` annoncé, les `[data-plate]` retirés, **2
contrôles MapLibre** et zéro bouton à nous, nommés en français (« Zoomer », « Dézoomer ») ;
`joinMissing: []` — **les 41 codes ISO A2 sont bien présents dans les tuiles Countries** ; 40 pays
peints, l'Ukraine en creux ; `Water` et `Background` repeints aux deux teintes de la plaque ;
**aucune couche de texte MapTiler visible**. Aucune erreur de page.

**Les gestes, chacun mesuré** (rapport, 1512 × 860) : clic réel sur le zoom natif 3,562 → 4,562 ·
glisser souris réel en dix pas, centre 7,85° → 11,97°E · `ArrowRight` sur le canvas de MapLibre,
centre → 14,94°E · `+` au clavier → 6,000 · douze clics sur le zoom arrière ramènent à **3,562**,
exactement le cadrage publié, 87,14° de longitude.

**Le plafond de zoom est dérivé, pas tapé** : le lecteur peut s'approcher jusqu'à ce que **le plus
petit pays que la carte compte** (Malte, 0,22° de large) atteigne les 28 px que ce format donne à une
cible — soit **+2,95 niveaux** (3,562 → 6,517). La formule précédente (« là où le jeu d'étude cesse
de remplir le cadre ») lisait la LARGEUR du cadre, que la décision pleine largeur a justement rendue
plus grande que le sujet : elle répondait **+0,43 niveau**, c'est-à-dire une carte vivante dans
laquelle on ne peut pas se déplacer.

**Le survol répond sur les entités des couches** (`queryRenderedFeatures`), jamais sur un test de
collision à nous : **6/6** au cadrage publié, **4/4** après un zoom, **4/4** après un glisser, **6/6**
après le retour — chaque sonde un vrai pointeur déplacé sur la position client vivante du pays. Il
n'y a aucune coordonnée lue une fois à l'initialisation, donc le piège que cet arbre a payé trois
fois est fermé par construction.

**Les quatre règles atteignent LES DEUX moitiés**, mesurées chacune sur une page fraîche : le plan
peint de la carte est identique à l'expression du plan pour la règle cochée, et les pastilles du
tableau se répartissent en **12/8/13/7 · 10/10/10/10 · 5/9/13/13 · 9/9/9/13** sur exactement quatre
couleurs ; les quatre bornes de la légende se réécrivent ; exactement une phrase est révélée (zéro
sous la règle de la planche).

**Script coupé** : la plaque est là, pleine largeur (1464 × 1112,6), `mw-live` absent, **0 contrôle
MapLibre**, la phrase d'aide calcule `display: none`, et le parcours au clavier compte **5 arrêts —
les 4 radios et le `<summary>` du tableau**. Aucun contrôle mort. Les quatre règles marchent : mesuré
au pixel, la légende ET le tableau changent bien d'une règle à l'autre, JavaScript désactivé.

**Clé absente** (c'est l'état de l'artefact commité) : la page ne devient pas blanche — la plaque
cuite occupe la même boîte, `mw-live` n'est jamais posé, le plan porte le placeholder de livraison.

**375 × 812** : largeur de document 375 (aucun débordement horizontal), document 1057 px, carte
327 × 248,5, carte vivante et ses deux contrôles, 41 lignes de tableau. Malte n'est pas pointable au
cadrage publié (0,8 px de large) — c'est exactement ce que le plafond de zoom dérivé existe pour
rendre atteignable. Le téléphone n'a pas été travaillé au-delà : desktop d'abord.

### Les mutations — onze lancées, **onze tuées**, l'arbre restauré à l'octet (sha256 vérifiés)

| # | la mutation | ce qui a rougi |
| --- | --- | --- |
| M1 | un pays reçoit la mauvaise classe DANS LE PLAN seulement | `assertClassingReachesTheLayers` — « the live map paints NO … where the index the markup carries says … » |
| M2 | la page ne porte plus de plan vivant | « the page carries no live plan, so its map is a picture and its control moves the legend only » |
| M3 | la phrase d'aide livrée visible | « … not hidden in the delivered markup … the dead control this arrangement exists not to ship » |
| M4 | le plan nomme un style que la plaque n'a pas cuit | « the live map loads the MapTiler style "streets-v2" and the plate under it was baked from "dataviz-light" » |
| M5 | un pays clé sur autre chose qu'un code ISO A2 | « GBR (Royaume-Uni) has no ISO A2 code, so the live map would paint it nothing » |
| M6 | une pastille de ligne sans le vocabulaire | `assertOneClassing` — « 40 readings are classed and 39 element(s) carry data-classing » |
| M7 | la feuille de classement jamais émise | « nothing in the page's stylesheet answers the rule "seuil" » |
| M8 | la fenêtre déclarée de la caméra ramenée à 68° N | « the camera's declared window cuts 3 of the 41 countries this map counts: Suède, Norvège, Finlande » |
| M9 | la passe de style livrée avec ses `export` intacts | « … a syntax error in a classic script … the fallback would stand with no error anyone could see » |
| M10 | le plafond de zoom tapé au lieu d'être dérivé | « the zoom ceiling is derived from the narrowest country the map counts, and the declaration names none » |
| M11 | un pays étudié que la couche vivante ne peint pas | « under the rule "seuil" the live map paints MD null where the index the markup carries says … » |

**Quatre d'entre elles sont restées vertes au premier passage, et c'est le plus utile de ce
travail.**

1. **M1 — une garde qui se comparait à elle-même.** `assertClassingReachesTheLayers` tenait les
   expressions du plan contre `rule.fillByCode` — l'objet même dont le plan est construit. Deux
   lectures d'une variable ne sont pas une vérification : les deux moitiés se trompaient ensemble.
   Elle reconstruit désormais ce que chaque pays DEVRAIT porter comme le balisage le fait — l'index,
   puis la rampe — et la mutation rougit.
2. **M4 — une garde qui ne lisait que ce que la mutation avait changé.** Elle vérifiait que l'URL du
   style porte le placeholder pour LE style déclaré ; changer le style changeait les deux côtés. Elle
   compare maintenant le style du plan à celui que la plaque a ENREGISTRÉ dans son `geometry.json`.
3. **M8 — le cache de plaque.** Muter la fenêtre déclarée de la caméra ne rougissait rien parce que
   **rien ne recuisait** : la page gardait la caméra d'un fichier qui ne le disait plus. Le runner
   recuit désormais dès que la plaque en cache n'a plus le bon cadre ou que sa fenêtre enregistrée ne
   tient plus le jeu d'étude.
4. **M8 encore, une fois recuit** : la garde mesurait le CADRE, et un cadre déborde la fenêtre
   demandée sur l'axe qui ne contraint pas — ici de 22° en longitude. Elle mesure maintenant la
   **fenêtre déclarée**, et c'est ce qui a révélé qu'elle était trois degrés trop courte à l'est : la
   Turquie atteint 44,82° E et la fenêtre s'arrêtait à 40,2.

### Trois défauts trouvés en pilotant, qui auraient été livrés

1. **Le survol ne répondait rien.** Le script est inliné DANS la figure, et le format écrit son
   `#tooltip` APRÈS la figure : capturé à l'initialisation, l'élément est `null` pour la vie de la
   page. Le pays s'allumait et ne disait rien. Il est cherché tardivement maintenant.
2. **Le tableau ne se re-teintait jamais**, sous aucune règle — mesuré au PIXEL, pas au style
   calculé. Une pastille portait sa couleur par défaut en `style` inline, et un style inline bat
   toute règle d'auteur ; l'attribut de présentation `fill` d'un `<rect>`, lui, était le plancher que
   toute règle dépasse, et il n'a pas d'équivalent en HTML. La couleur par défaut est une RÈGLE
   désormais. (Et la pastille est une boîte HTML plutôt qu'un `<rect>` : en SVG, l'invalidation
   `:has()` d'une propriété de présentation héritée s'est mesurée périmée là où un voisin HTML
   portant le même attribut se mettait à jour dans le même recalcul.)
3. **Le seul pays sans donnée n'était pas pointable.** Un pays en creux est une LIGNE, et
   `queryRenderedFeatures` ne répond pour une ligne qu'à un pixel ou deux du tracé : on obtenait la
   réponse du pays précédent au milieu de l'Ukraine. Un remplissage invisible porte sa cible.

### Et un quatrième, trouvé en mesurant à 375 px

**Malte disparaissait de la carte sur un téléphone.** À 375 × 812 la caméra ajuste ce jeu d'étude au
zoom 1,40, et à ce niveau de tuile le jeu Countries ne porte **rien** pour Malte — ni son polygone de
niveau 0 ni ses conseils de niveau 1. Un pays qui rapporte quittait la carte sans que rien ne
rougisse : c'est le piège de la fiche du type sous son autre visage — non pas une clé qui ne
correspond pas, mais une clé qui ne correspond à rien **à ce zoom**. Malte est désormais dessinée
depuis le `shapes.geojson` gelé du beat, à tous les zooms. Vérifié : 40 pays peints à 1512 × 860 ET à
375 × 812.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024 ·
fond de carte MapTiler. `data.csv` et `shapes.geojson` sont des copies à l'octet de
`proof/static-choropleth-europe-lowcarbon/`.

## Le fond de carte est MapTiler, et ce que la projection change

**Passe du 11 septembre 2026.** Le fond n'est plus un tracé Natural Earth projeté ici : c'est une
plaque **MapTiler** cuite par `bake.mjs`, et tout ce que la page dessine est placé par la caméra
enregistrée de cette plaque — `frameCorners`, mesuré avec `map.unproject()` après stabilisation de la
caméra, jamais les `bounds` nominales, que `fitBounds` élargit pour préserver le format du cadre.

**Une plaque par direction filée, teintée par la direction.** `the-basemap-gives-up-its-contrast` ne
peut pas être satisfait en choisissant entre deux styles publiés : `dataviz-dark` peint une terre
sombre sous une mer BLEU CLAIR, ce qui, sur le navy de `nocturne`, fait de l'eau l'objet le plus
contrasté de la page. Le bake reçoit donc les deux teintes que la direction lui donne — l'eau prend
un peu de l'accent (`water-is-a-tint-not-a-grey`), la terre un pas du fond vers l'encre. Les couches
de texture (couverture du sol, ombrage, routes, étiquettes, frontières) sont éteintes. La plaque est
cuite à 1600 × 1216 : une page web s'ouvre sur un écran à deux pixels par point, et une plaque cuite
à la taille du dessin y serait molle. Sa fenêtre déclarée est **−24,5..44,9° E, 34,5..71,2° N** —
mesurée, pas tapée : la plus grande partie de chaque pays, ce qui écarte la Réunion, Curaçao,
Svalbard et les Açores sans en nommer aucun. La Russie est la seule exception déclarée (sa plus
grande partie atteint 180° E) et la page dessine la Russie d'Europe.

**Le coût de Mercator, MESURÉ et pas affirmé.** Le propriétaire a tranché le 15 septembre 2026 :
*« oui une carte MapLibre plate pas un globe »*. Une carte MapLibre plate est en Web Mercator, et un
choroplèthe se lit à la SURFACE — ce n'est donc pas un défaut à corriger ici, c'est un coût que la
page porte, et une page qui porte un coût le dit. Mesuré sur les formes gelées de ce beat, à cette
caméra, **la Russie mise à part** (81 % de la terre dessinée, et seulement en partie dans le cadre) :

| | part de la terre DESSINÉE | part de la terre RÉELLE |
| --- | ---: | ---: |
| Norvège + Suède + Finlande | **31,8 %** | **16,6 %** |
| les sept au-dessus de 94 % | 42,1 % | 27,5 % |

Par kilomètre carré, contre la France = 1 : **Norvège ×2,61 · Islande ×2,64 · Finlande ×2,58 ·
Suède ×2,29.**

Le titre de ce beat est un COMPTE de pays, pas une surface, donc il survit intact. **L'IMAGE, non**:
l'arc sombre du nord occupe à peu près le double de la page qu'il occuperait sur une caméra
équivalente. Le chapô le dit donc en toutes lettres, avec les deux nombres, parce qu'un lecteur qui
n'est pas prévenu lit l'encre comme une surface. `camera.ts` reste dans le beat : c'est la caméra qui
MESURE, en Lambert azimutal équivalent (EPSG:3035), et le runner imprime les deux à chaque rendu. Les
trois plaques sont vérifiées identiques en caméra avant le rendu.

**Ce que le creux montre.** L'Ukraine, seul pays sans production publiée pour 2024, est dessinée en
creux : sous elle on voit la terre de la plaque, pas le papier. Un pays sans donnée ressemble donc au
reste du monde hors étude, ce qui est exactement ce qu'il est — et son contour reste en pointillé
pour qu'on ne le confonde pas avec un pays hors cadre.

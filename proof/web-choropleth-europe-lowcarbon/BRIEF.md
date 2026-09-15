---
format: web
type: choropleth
---

# Beat — La carte montre sept pays parce qu'on a choisi de couper à 94 % (web)

**Type:** choropleth (map). **Medium/format:** map / **web**. **Frame:** fluid in width, fixed in
proportion.

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

**Aucun pays ne bouge. Aucune étiquette ne bouge. Aucun mot du titre, du chapô, de la note de
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

### Pourquoi ce n'est ni un zoom, ni un pan, ni l'un des dix-neuf vocabulaires existants

Un zoom coûterait le cadrage que `camera.ts` argumente, et le brief le dit : c'est la réponse
paresseuse. Ce geste ne touche pas à la caméra du tout.

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

## Verification — passe du 15 septembre 2026

`bun proof/web-choropleth-europe-lowcarbon/render-directions-web.mjs` — trois directions produites,
aucune refusée. Puis, sur chacune des trois :

**1. La vérification du format, `skills/chart-web/scripts/verify-web.mjs --file renders/<id>.html`.**
creme **95 checks passed, 0 failed, 8 skipped** · rapport **89 / 0 / 7** · nocturne **83 / 0 / 7**.
Les huit sauts sont ceux de la forme de ce beat (pas de `filter`, pas d'étiquette HTML par-dessus le
plot) et chacun est nommé dans la sortie. Les sept fenêtres tiennent, de 3440 × 900 à 375 × 812 :
sur nocturne, `phone 375x812: no vertical scroll — document 812px in a 812px window (overflow 0px)`.
**C'est la fermeture du débordement de 12 px au téléphone** qui restait à confirmer après la coupe du
chapô. Mesuré à part sur les trois directions : débordement horizontal 0 px à 375, 390 et 414 de
large, et hauteur de document exactement égale à la fenêtre. Sous 375 la page redevient scrollable
(nocturne 895 px dans 780 à 360 de large) — hors du contrat du format, noté et pas corrigé.

**2. Le vocabulaire lui-même, piloté à la souris.** Un pilote (`page.mouse.click` à des coordonnées
entières réelles, jamais `.click()` ni `dispatchEvent`) passe les quatre règles en revue sur chaque
direction : **30 assertions vertes, 0 rouge**, trois fois. Il mesure, règle par règle, que les 40
pays se répartissent bien en 12/8/13/7, 10/10/10/10, 5/9/13/13 et 9/9/9/13 sur **quatre `fill`
distincts et pas un de plus**, que la légende n'affiche que les quatre bornes de la règle en cours,
qu'exactement une phrase est révélée (zéro sous la règle par défaut), et que le seul pays sans
lecture reste en creux sous les quatre. Le piège de spécificité est visé directement : sous `seuil`
PUIS sous `egaux`, le Portugal pointé s'assombrit depuis SON PROPRE remplissage
(`rgb(46,103,187) → rgb(36,80,146)` puis `rgb(23,87,182) → rgb(17,66,138)` en creme) et la réponse
nomme le pays sans jamais citer de palier cuit. La cellule est isotrope à 1,0000 aux trois largeurs.

**3. Le même pilote, JavaScript coupé : 26 vertes, 0 rouge, trois fois.** Les quatre différences
sont les quatre assertions du pointeur. Les quatre règles, les bornes, les effectifs et les phrases
marchent donc sans une ligne de script — ce que le vocabulaire promettait.

**4. Les mutations — 8 tuées sur 8, l'arbre restauré à l'octet (sha256 vérifiés).** Chaque mutation
est appliquée, le runner rejoué, la refus lu, la source restaurée :

| # | la mutation | ce qui a rougi |
| --- | --- | --- |
| M1 | l'appel à `classingCss` remplacé par `""` | « nothing in the page's stylesheet answers the rule "seuil" » |
| M2 | le bloc d'une seule règle jamais émis | idem, sur `"egaux"` |
| M3 | la règle du pointeur émise AVANT les classes | « the rule "seuil" paints its classes AFTER its pointer rule » |
| M4 | une borne révélée avant la règle-couverture | « reveals a bound label BEFORE the blanket rule » |
| M5 | un pays dessiné et classé sans `data-classing` | « 40 readings are classed and 39 element(s) carry data-classing » |
| M6 | une seconde règle qui partitionne comme la planche | « two pills for one picture. That is the plate under a second name » |
| M7 | une règle qui laisse un palier vide | « leaves class 1 of 4 empty over the 40 readings » |
| M8 | une règle qui coupe un nombre de classes différent | « declares 2 break(s) where 4 classes need 3 » |

**5. Ce que les mutations ont trouvé, et qui n'était pas une mutation.** `assertOneClassing` —
la garde qui relit la PAGE ÉCRITE, et la seule qui puisse prononcer M1 à M5 — **n'était appelée
nulle part**. Elle était livrée en code mort. Le runner l'appelle maintenant sur le fichier relu
depuis le disque, dans le `try` qui refuse et efface le rendu. Contrôle exécuté pour le prouver :
avec M5 injecté ET la garde débranchée comme le beat la livrait, le runner sort en **0** et annonce
« creme -> renders/creme.html » — et la page produite est fausse, le pilote y compte **10 rouges**
(le Portugal sort de tout palier, 2 pays en creux au lieu d'un). Les cinq refus les plus chers de ce
vocabulaire étaient donc décoratifs jusqu'à cette passe.

**6. Les images ont été regardées**, à 1280 × 900 en 2×, sur les trois directions, sous la règle par
défaut et sous `intervalles égaux`. Ce qui s'y vérifie et qu'aucune assertion ci-dessus ne peut
voir : le rang de légende et le bord haut de la carte sont au MÊME pixel dans les deux états — les
bornes se réécrivent sur place, la phrase apparaît sans pousser la carte — et l'Ukraine en creux
laisse voir la terre de la plaque, indistinguable du monde hors étude, pointillé compris.

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
à la taille du dessin y serait molle.

**Le coût, énoncé.** Web Mercator gonfle le nord : à 60° une forme dessine deux fois la surface
qu'elle occupe. Le titre de ce beat est un COMPTE de pays, pas une surface, donc il survit intact —
et le chapô le dit au lieu de revendiquer une lecture équivalente qu'il n'a plus. `camera.ts` reste
dans le beat : c'est la caméra qui MESURE, et le runner imprime les deux. Les trois plaques sont
vérifiées identiques en caméra avant le rendu.

**Ce que le creux montre.** L'Ukraine, seul pays sans production publiée pour 2024, est dessinée en
creux : sous elle on voit la terre de la plaque, pas le papier. Un pays sans donnée ressemble donc au
reste du monde hors étude, ce qui est exactement ce qu'il est — et son contour reste en pointillé
pour qu'on ne le confonde pas avec un pays hors cadre.

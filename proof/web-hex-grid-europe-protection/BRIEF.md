---
format: web
type: hex-grid
medium: map
grounding: supported
derived: v1
---

# Beat — Le taux dépend de la case qu'on regarde : le Liechtenstein passe de 23,9 à 1,8 pour 1 000 sans qu'un seul pays bouge (web)

**Type:** hex grid (hex cartogram). **Medium/format:** map / **web**. **Frame:** fluid.
**Plaque cuite:** aucune — sur ce type la géométrie EST la donnée.

## Claim

Les **31 pays d'accueil** qui déclarent des bénéficiaires de la protection temporaire, une case
hexagonale chacun, toutes de la même taille, plus la case neutre de l'Ukraine (pays d'origine, hors
mesure). Par habitant, la **Tchéquie** mène à **36,1 pour 1 000** ; en nombre absolu c'est
l'**Allemagne** (1 250 825 personnes, **11e** par habitant). C'est la revendication du frère statique,
dessinée comme lui.

Puis la page rend au lecteur la chose que la planche fixe a dû trancher pour lui : **à quelle
échelle une case met sa valeur en commun.**

Tout est dérivé dans le runner depuis les fichiers gelés et affirmé là avant qu'on dessine. Le beat
refuse de rendre si un grain ne fait changer de classe à personne, si deux grains peignent la même
carte, si un grain aplatit la carte sur une seule classe, si un regroupement a une population nulle,
ou si une case est trop étroite pour tenir son propre code.

## L'interaction, écrite avant le code

### Ce que ce type cache, et pourquoi ce n'est ni un zoom ni une infobulle

Un zoom et un pan sont la réponse paresseuse, et ici ils ne coûteraient même pas un cadrage : il n'y
a pas de géographie à cadrer. Ce que le hex grid cache, c'est **le découpage lui-même**. La fiche du
type le dit en toutes lettres pour la lecture « binning » : *« Le mode d'agrégation change
silencieusement ce que la MÊME teinte VEUT DIRE, et la carte ne dit pas au lecteur dans quel mode
elle est, sauf si la légende le dit explicitement. »* Et pour l'accessibilité : *« La taille de
cellule et le mode d'agrégation sont tous deux invisibles depuis l'image finale seule. »*

Ce beat est l'autre lecture du type — un **cartogramme hexagonal**, une case par pays nommé — et la
fiche dit que les cases n'y sont *« pas arbitraires du tout »*. C'est vrai de la case. **Ça ne l'est
pas du regroupement.** Une case porte un taux qui est déjà un quotient de deux sommes, et dès qu'on
met deux cases en commun le quotient des sommes n'est plus la moyenne des quotients. C'est le
problème de l'unité aréale modifiable, et sur cette planche il est mesurable :

| grain | Liechtenstein | Lituanie | Europe de l'Ouest | classes utilisées | cases qui changent de classe |
| --- | --- | --- | --- | --- | --- |
| le pays | **23,9** | 17,5 | 7 valeurs de 0,7 à 8,1 | 5 | — |
| le voisinage | **1,8** | **26,6** | — | 4 | **21 / 31** |
| la région | 4,3 | 18,3 | **4,3** (moyenne des 7 membres : **11,0**) | 3 | **21 / 31** |

Le Liechtenstein perd 22 points et trois classes parce qu'il pèse 40 000 habitants contre les 68
millions de la France assise à côté de lui dans le dessin. La Lituanie en gagne neuf. Pour l'Europe
entière le taux mis en commun est **9,68 pour 1 000** quand la moyenne des 31 taux est **12,24** —
deux nombres vrais qui ne répondent pas à la même question.

**Une planche fixe ne peut faire qu'une chose de ça : choisir un grain, l'imprimer dans le chapô, et
demander qu'on lui fasse confiance.** Une vidéo ou un scrolly peuvent jouer les trois grains dans
l'ordre de l'auteur, une fois. Ici le lecteur tient le grain, fait l'aller-retour autant qu'il veut,
et regarde **les mêmes 32 hexagones aux mêmes 32 places** se repeindre.

### Le geste, et pourquoi ce n'est celui d'aucun frère

`pool.ts`, écrit pour ce beat dans `skills/map-web/assets/`, argumenté contre les trois vocabulaires
qui existaient déjà côté carte :

- **`filter.ts`** (carte) promet que *les marques hors d'un ensemble nommé PARTENT*. Rien ne part
  ici : les 32 cases sont présentes dans les trois états, et ce qui change est ce que chacune
  MESURE.
- **`classing.ts`** (choroplèthe) change **où on coupe** une même liste de valeurs. C'est le geste
  frère et la distinction est exacte : là les valeurs sont fixes et les bornes bougent, ici **les
  bornes sont fixes et les valeurs bougent**. Conséquence visible, et c'est elle qui décide : la
  légende de cette page **ne change pas d'un état à l'autre**, parce que les cinq classes sont
  toujours les mêmes cinq tranches de « pour 1 000 habitants ». Un lecteur qui regarde la légende
  n'a rien à réapprendre ; ce qu'il voit changer, c'est la carte.
- **`area-scale.ts`** (symbole proportionnel) décide ce que vaut une AIRE. Une case de ce
  cartogramme n'a pas d'aire encodée — elles sont toutes égales, c'est l'achat du type.

Côté graphique, le quasi-manqué est `unit.ts` (pictogramme), qui demande **ce que vaut UN carré** et
dont le produit est **combien il y a de carrés**. Ici le nombre de cases ne bouge jamais : il y a 32
cases parce qu'il y a 32 pays. Ce qui bouge est **sur combien de cases une case additionne son
numérateur et son dénominateur**.

### Ce qui change dans l'image, et ce qui ne bouge pas

**Aucune case ne se déplace, jamais.** Le centre de chaque hexagone est une fonction de la grille
dessinée et d'aucun grain : les trois états sont les mêmes polygones aux mêmes places, avec des
remplissages différents. C'est l'arbitrage n°1 tenu par la construction, pas par une promesse — et
c'est aussi la réponse à la question de l'interpolation de l'arbitrage n°4. **Le geste ne change pas
la tessellation DESSINÉE, seulement la fenêtre d'agrégation**, donc il n'y a pas deux grilles entre
lesquelles une case devrait voyager : `fill` est une propriété CSS réelle sur un élément toujours
rendu, et elle s'interpole sur 420 ms. Mesuré : **0 case sur 32 change de `points`**, les trois états
partagent le même attribut à l'octet.

Aucun mot ne bouge non plus. Le code du pays est du mobilier : il est écrit une fois et ne change
dans aucun état. Le nombre de chaque case est **trois `<text>` empilés à une seule place** et la
feuille en révèle un — les chiffres changent, le span ne voyage pas.

**Le trait de bloc** apparaît au grain « la région » : c'est le contour des six blocs,
dessiné à partir des arêtes qui séparent deux blocs différents. Il est toujours dans le DOM et c'est
son `opacity` qui bouge, donc il s'interpole aussi. Au grain « le pays » il n'y a aucun groupe de
plus d'une case, donc rien à contourner. Au grain « le voisinage » il n'y en a pas non plus, et pour
une raison qui est le fond du geste : **un voisinage n'est pas une partition, c'est une fenêtre
glissante** — les voisinages se recouvrent, la Tchéquie est dans le sien et dans celui de cinq
autres. Une fenêtre n'a pas de frontière à dessiner. La phrase dérivée le dit au lecteur.

### Ce que le survol ajoute, et pourquoi il ne change PAS avec le grain

Chaque case répond avec **les trois valeurs à la fois** — son taux propre, son taux mis en commun
avec ses voisines, celui de sa région — plus les personnes, la population qui les divise, et son
rang dans les deux classements (par habitant et en nombre). C'est une lecture qui est vraie dans les
trois états, donc la cible de survol ne change jamais, et un lecteur qui pointe une case obtient la
comparaison **sans avoir à appuyer sur quoi que ce soit**. C'est aussi ce qui évite ici la
mécanique à trois `<svg>` que le pictogramme a dû payer : `interaction.mjs` résout la marque pointée
sur des `cx`/`cy` lus une seule fois à l'initialisation, et un seul jeu de `.pt` ne peut pas se
tromper d'état.

## Ce que le premier jet faisait, et les deux défauts corrigés

Le jet du 2026-09-12 ne déclarait **aucune interaction** : c'était le statique plus une infobulle,
ce que le mandat refuse.

**Défaut mesuré et corrigé : les étiquettes se chevauchaient.** Le jet dessinait `NAMES[code]` — le
nom français entier — au centre d'un hexagone large de 76 unités : « Liechtenstein » à 13 px en
demande près de 90. La fiche du type donne la règle et le frère statique l'applique déjà : *« le code
de l'unité s'assoit dans sa propre case, et une case trop étroite pour le tenir est un refus, pas une
taille de caractère plus petite. »* La page dessine donc le **code ISO**, et le nom entier est dans
le survol, dans l'`aria-label` et dans l'alternative textuelle. Le refus du frère statique
(`codeOwes`) est porté ici et vérifié par mutation.

**Le cadre.** La géométrie est maintenant dérivée de l'étendue réellement occupée par les 32
hexagones plutôt que d'un `(colonnes + 0,5)` supposé, et le runner affirme que **chaque hexagone est
entièrement dans le viewBox** avant de dessiner. Le `<svg>` garde `preserveAspectRatio="xMidYMid
meet"` : un hexagone étiré n'est pas un hexagone, et six arêtes égales sont tout l'intérêt du type.

## Les refus, chacun vérifié par mutation

1. un grain qui ne fait changer de classe à aucune case — le lecteur appuierait et la carte
   resterait immobile ;
2. deux grains qui peignent exactement les mêmes classes — un état, deux noms, une pastille en trop ;
3. un grain qui met toutes les cases dans une seule classe — une carte d'une seule couleur n'est pas
   une comparaison ;
4. un regroupement dont le dénominateur est nul — une division silencieuse par zéro devient un taux
   infini et une case noire ;
5. une case dessinée qui n'appartient à aucun regroupement d'un grain — sa couleur ne serait réglée
   par aucune règle et elle serait peinte dans tous les états à la fois ;
6. la feuille lue à l'envers : un blanket émis APRÈS les règles qu'il doit surclasser (deux sélecteurs
   d'attribut pèsent pareil, l'ordre d'émission est tout le mécanisme) ;
7. une case trop étroite pour tenir son propre code ;
8. un hexagone qui sort du cadre ;
9. une grandeur que la page imprime et qui s'arrondit à rien — l'Islande répondait « 4 800 personnes
   pour **0 millions** d'habitants », sur une page dont tout le sujet est que le dénominateur change ;
10. la case hors du compte peinte de la même couleur qu'une classe — mesurée à **1,007:1** contre
    « moins de 5 », parce que deux couleurs calées indépendamment sur le même plancher contre le même
    fond sortent identiques par construction. La case est maintenant le fond, un siège vide cerné
    d'un trait qui passe le plancher non-texte.

## Palette

`PALETTE.md` porte le raisonnement réel de cette page et les contrastes mesurés contre le fond que
chaque direction peint vraiment. Une seule teinte, cinq crans en clarté, les mêmes cinq dans les
trois états — c'est la conséquence directe du choix de bouger les valeurs et pas les bornes. La plus
pâle passe le plancher non-texte de justesse (3,13 · 3,06 · 3,14 pour 1), les crans voisins se
séparent de 1,33 à 1,49, et **la case hors du compte a quitté la rampe** : elle est le fond, parce
qu'il n'y a aucune place légale entre 3,0 et la classe 1 à 4,19.

## L'architecture, refaite le 2026-09-15 — le geste est le même, la carte est vivante

Le propriétaire a validé `proof/web-choropleth-europe-lowcarbon/` comme **le patron** de toute carte
web. Ce beat dessinait ses cases en SVG au-dessus d'une image ; il les dessine désormais en
**couches MapLibre sur les tuiles MapTiler**. `skills/map-web/assets/live-hex.ts` est la moitié du
patron propre à ce type. **Le geste n'a pas changé** : le lecteur tient le GRAIN, et `pool.ts` reste
le vocabulaire.

**La grille est construite en MÈTRES de Web Mercator puis dé-projetée en lon/lat.** C'est la seule
chose qui garde les 32 cases rigoureusement congruentes : une grille posée en DEGRÉS serait dessinée
plus haute au nord qu'au sud, et six arêtes égales est tout l'achat du type. L'ancrage est un
**siège**, pas une géolocalisation — la disposition imite l'Europe, donc la grille s'assoit sur
l'Europe, et la vraie côte qui apparaît autour d'elle est exactement ce que la fiche du type appelle
*la géographie qu'un cartogramme sacrifie*.

**Le coût de Mercator sur CE sujet, mesuré et imprimé dans le chapô** : les cases restent égales —
elles sont égales en mètres de Mercator — mais **le sol sous la case la plus au nord est dessiné
2,1 fois plus grand que sous la plus au sud**.

**Ce que l'architecture coûte au geste.** Aucune feuille de style n'atteint une couche MapLibre, donc
la moitié CARTE du grain est du script (`setPaintProperty` + `setLayoutProperty`, sur des expressions
construites à la construction depuis les MÊMES classes mises en commun que le balisage). Ce qu'un
lecteur sans JavaScript garde : l'image figée, la légende — **identique sous les trois grains**, ce
qui est toute la distinction de ce vocabulaire d'avec `classing.ts` — la phrase dérivée, et un
**tableau des 32 lectures** dont le taux ET la pastille suivent le grain en CSS pur. Le geste a
déménagé de l'image vers le tableau ; il n'a pas disparu. `assertPoolReachesTheLayers` est la garde
du croisement entre les deux moitiés.

**Les libellés sont des couches `symbol` DANS LES FONTES DE LA PAGE**, ce qui est une mesure et non un
compromis : MapTiler ne sert que 18 familles et répond **200 avec Noto Sans** pour tout autre nom
(83 352 octets, rien ne le signale) ; 17 des 18 sont des Google Fonts, et les trois directions filées
se résolvent justement sur Open Sans, Montserrat et Merriweather. Le runner **sonde** la pile de
glyphes et refuse la sentinelle Noto plutôt que de lui faire confiance.

**Deux couches, toujours.** Sous la carte vivante, une image figée **photographiée depuis la carte
vivante de CETTE page** — pas un second pipeline. C'est ce qui reste quand la clé expire, quand les
tuiles tombent, quand il n'y a pas de réseau, et c'est ce qu'est toujours l'artefact commité : **la
clé n'entre dans aucun fichier du dépôt**, le rendu porte `__MAPTILER_KEY__`, et le runner écrit EN
PLUS `renders/<direction>.local.html` avec la vraie clé (ignoré par git) — c'est ce fichier-là que le
propriétaire ouvre.

### Le trait de bloc, corrigé le 2026-09-15 — un mur entre deux cases, jamais une boîte autour d'un groupe

Le propriétaire a ouvert `la région` et répondu : « je comprends pas le filtre la région qui met des
bouts d'encadrés ». Il avait raison, et la cause est géométrique. **Mesuré sur cette disposition : les
six blocs nommés tombent en NEUF morceaux connexes** — `Nordiques` = ISL seule + NOR+DNK+SWE+FIN,
`Europe du Sud` = PRT+ESP, ITA+MLT et GRC+HRV+CYP. Il n'y a donc **aucune union à cerner d'un seul
trait**, et MapLibre ne peut pas dissoudre ce qui n'est pas connexe.

Sur les 128 segments livrés, **61 tombaient sur une arête sans aucun voisin** — le pourtour de la
grille. Ce sont eux qui refermaient les formes en boîtes. Ils sont supprimés : **un trait n'est tracé
que là où deux cases VOISINES ne sont pas dans le même bloc** (67 segments). Le trait sépare donc
toujours deux choses que le lecteur voit, et une case isolée comme l'Islande n'est jamais cernée toute
seule. Ce qui relie les morceaux épars d'un même bloc est ce qui l'a toujours fait et qui se lit :
**toutes les cases d'un bloc portent le MÊME chiffre**, donc la même teinte. Un refus tient la règle.
Et la phrase du grain dit maintenant ce que les blocs SONT, en les nommant.

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
    "bin-aggregation-is-computed-from-the": null,
    "the-cells-are-rigorously-equal-because": null,
    "area-inflates-by-1-cos-lat": null,
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

---
format: web
type: hex-grid
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

**Le liseré du regroupement** apparaît au grain « la région » : c'est le contour des six blocs,
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

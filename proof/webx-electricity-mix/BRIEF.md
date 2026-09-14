---
format: web
type: stacked-bar
---

# Beat — La Norvège tire 99 % de son électricité du renouvelable, la Pologne 69 % du fossile (web)

**Type:** stacked bar (100 %-empilée). **Medium/format:** chart / **web**. **Frame:** fluid.
**Channel:** article web.

Web sibling of `proof/static-electricity-mix-source` — same subject, same frozen data, same asserted
claim, and a presentation that is deliberately NOT the plate with a tooltip on it.

## Claim

**La Norvège a produit 98,61 % de son électricité à partir de renouvelables en 2024, la part la plus
élevée des six pays comparés ici ; la Pologne est celle qui s'appuie le plus sur le fossile, à
68,85 %.** Les deux bouts sont asserted dans le runner avant que le composant ne voie la donnée.

## Treatments spent

- `the-stack-gives-back-the-total-it-hides` — chaque colonne vaut son propre total, et le total
  absolu (les TWh) n'est nulle part sur la plaque : il est ce que chaque colonne répond au survol.
- `a-segment-not-starting-at-zero-carries-its-own-number` — chaque bande assez épaisse imprime sa
  part à l'intérieur d'elle-même, dans une encre mesurée contre SA PROPRE teinte.
- **La bande du bas est la seule qui parte d'une ligne commune**, et c'est de ce défaut de type que
  sort l'interaction ci-dessous.

## What the web adds — written before the code

Le piège du type, nommé par `references/types/stacked-bar.md` et par la fiche catalogue : **seule la
bande du bas partage une référence commune aux six colonnes.** Toutes les autres démarrent à une
hauteur qui change d'un pays à l'autre, donc leur épaisseur ne se compare pas à l'œil. Un fixe ne
peut que subir ça : il n'a qu'une ligne de base et il l'a déjà dépensée.

### Contrôle 1 — poser une autre bande sur la ligne de base

- **La question du lecteur** : « La bande nucléaire de la Suède a-t-elle l'air plus épaisse que celle
  de la Suisse parce qu'elle l'est, ou parce qu'elle commence plus bas ? »
- **Le geste** : `toggle-a-comparison` — trois radios natives, une par bande, dans un `<fieldset>`.
- **Ce qui change dans l'image** : les six colonnes pivotent (rotation CYCLIQUE de l'ordre, jamais un
  re-tri par colonne) jusqu'à ce que la bande choisie repose sur la ligne de base ; ses six longueurs
  repartent d'un même trait et se lisent sur l'axe. L'entrée de cette bande s'allume dans la légende
  pendant que les deux autres reculent ; un joint au fond sépare les bandes déplacées ; l'écart entre
  la plus longue et la plus courte s'inscrit au sommet de la plus longue ; une phrase en donne les
  deux bouts. Fossile au sol : Pologne 68,85 % contre Suède 1,21 %. Nucléaire au sol : France
  67,72 % contre trois pays à 0,00 %. Aucune de ces deux comparaisons n'existe sur la plaque.
- **Sans script** : identique. Radios `:checked` plus CSS généré à la construction
  (`chart-web/assets/stack.ts`), zéro octet de JavaScript — vérifié en pilotant un vrai navigateur
  avec le script désactivé, dans les trois directions.

### Contrôle 2 — interroger une colonne

- **La question du lecteur** : « Cette bande vaut 1 %, 2 % ou rien du tout ? Et combien de TWh y
  a-t-il derrière une part trop fine pour porter son chiffre ? »
- **Le geste** : `ask-a-mark` — survol, toucher, ou focus clavier.
- **Ce qui change dans l'image** : la colonne entière s'allume et répond avec ses trois parts au
  centième ET les TWh derrière chacune, plus la production totale du pays. Le pourcentage imprimé
  est arrondi à l'unité et n'est imprimé que dans les bandes assez épaisses ; ces quantités-là ne
  sont sur aucun axe de la plaque.

### Les deux contrôles qui ont été REFUSÉS, et la mesure derrière chacun

1. **Un point d'interrogation par BANDE (dix-huit cibles) plutôt que par colonne.** C'est ce que ce
   beat livrait avant d'être dirigé, avec son propre script. Il ne survit pas au contrôle 1 :
   `assets/interaction.mjs` résout un pointeur vers la lecture la plus proche à partir des `cx`/`cy`
   lus UNE FOIS à l'initialisation, qu'aucune transformation CSS ne change. Les dix-huit points
   auraient continué de répondre pour la hauteur où leur bande se trouvait AVANT que le lecteur ne
   repose la pile — une réponse fausse et assurée, la pire chose qu'un graphique interactif puisse
   donner. La bande d'un pays est le CADRE, un cadre ne bouge pas, et une seule réponse porte les
   trois parts — ce qui évite aussi au lecteur d'avoir à viser une bande de 1 % de haut.
2. **Un filtre qui retire un pays.** Rien ne doit quitter cette image : les six pays SONT la
   comparaison, et `web-discipline.md` refuse qu'un contrôle puisse enlever la démonstration.

## What the render taught

- **Les mots coûtent de la hauteur, et la fenêtre est le budget.** La première version de la légende
  nommait la composition de chaque bande (« Renouvelables (hydro, éolien, solaire, bio) ») : à 375 px
  ces trois entrées tiennent sur trois lignes et, sur `nocturne` — display 32 px capitales — la ligne
  de source passait 39 px sous le pli. La composition est descendue dans le chapeau, la légende ne
  porte plus qu'un mot par bande.
- **Le point d'interrogation ne peut pas être posé sur le bord du cadre.** À `y = 0` — le haut de la
  colonne, que toutes partagent dans tous les états — la moitié du cercle tombe hors du `viewBox` :
  `verify-web` a mesuré 0 lecture sur 6 répondant à 375 px pendant que les 6 répondaient à 1280. Il
  est à 8 % du cadre, dedans à toutes les tailles.
- **L'écart s'inscrit DEDANS la bande la plus longue, pas au-dessus.** Au-dessus, il tombait
  exactement sur le « 5 % » de la bande voisine de la France.
- **À 375 px l'étiquette la plus large (34,3 px sur `creme`) remplit la barre (34,1 px).** Mesuré
  dans les trois directions : le débordement le pire parmi les étiquettes dessinées est de 0,2 px.
  C'est juste, et c'est la marge qu'une direction au registre `value` plus gros dépenserait.

## Verification

`verify-web.mjs --file renders/<direction>.html` — **96 passed, 0 failed** sur les trois directions.
Le contrôle de re-base lui-même est piloté séparément (les six bandes partagent une ligne, cette
ligne EST la base du plot, chaque colonne fait toujours exactement une hauteur de plot, une seule
phrase révélée, l'écart imprimé, la légende allumée), avec le script ACTIVÉ puis DÉSACTIVÉ, dans les
trois directions : **90 passed, 0 failed**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` est la copie gelée de `proof/static-electricity-mix-source/data.csv`, re-vérifiée ici
(6 lignes, les neuf colonnes sources, et les deux bouts de la revendication).

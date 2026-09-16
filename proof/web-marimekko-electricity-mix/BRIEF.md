---
format: web
type: marimekko
medium: chart
grounding: supported
---

# Beat — Les deux tuiles de charbon ont presque la même surface, et elles ne disent pas la même chose (web)

**Type :** marimekko (mosaïque). **Medium/format :** chart / **web**. **Cadre :** fluide.
**Frère statique :** `proof/static-marimekko-electricity-mix`, dont les données gelées, la
revendication et les mots sont le **plancher** de cette page.

## La revendication, identique au frère statique

Six pays européens, 2024, **1 638 TWh**. Le charbon pèse **201 TWh — 12,3 % des six — et 99,5 % de
ce charbon est brûlé en Allemagne et en Pologne.** Ailleurs la bande de charbon est un filet ou rien.

## Ce que le statique ne peut pas faire, et ce n'est pas un détail de confort

**Une surface est un PRODUIT, et l'œil ne sait pas refactoriser un produit.** C'est le piège propre
à ce type, et il est mesurable sur cette plaque même :

| | largeur (production) | hauteur (part du mix) | surface (TWh) |
| --- | --- | --- | --- |
| Allemagne · charbon | 263,5 u — 496 TWh | 81,5 u — **21,4 %** | 21 475 u² — **106,3 TWh** |
| Pologne · charbon | 91,4 u — 172 TWh | 206,4 u — **54,3 %** | 18 865 u² — **93,5 TWh** |

Les deux tuiles diffèrent de **14 % de surface** : sur la planche, elles se ressemblent. Et pourtant
la part polonaise vaut **2,53 fois** la part allemande, parce que l'Allemagne produit **2,88 fois**
plus d'électricité. Un lecteur qui regarde la mosaïque ne peut pas savoir laquelle des deux
**tourne** au charbon — les deux facteurs se sont annulés dans la surface qu'il voit.

Un still peut *dire* ces trois nombres dans sa légende ; il ne peut pas les faire voir, parce que le
seul moyen de les faire voir est de **tenir un des deux facteurs immobile** et de regarder l'autre
bouger. Une vidéo le ferait une fois, dans l'ordre de l'auteur. Un scrolly aussi. Ici c'est le
lecteur qui tient, qui relâche, qui compare, et qui revient.

## Le geste, écrit avant le code

**Contrôle 1 — « tenir »** (`toggle-a-comparison`, vocabulaire `hold.ts`, écrit pour ce beat).

*La question du lecteur :* « Cette tuile est grosse parce que le pays est gros, ou parce que le
charbon y pèse lourd ? »

*Le geste :* trois boutons radio natifs. **La mosaïque** (par défaut, et c'est la planche du frère
statique) · **À largeurs égales** · **À l'échelle des TWh**.

*Ce qui change dans l'image :*

- **À largeurs égales** — les six colonnes glissent et s'étirent jusqu'à faire toutes 145 unités de
  large. La largeur ne dit plus rien ; **la hauteur seule parle**, et c'est la part du mix. La tuile
  polonaise du charbon fait alors 206 unités contre 81 à l'allemande : le rapport de 2,53 que la
  mosaïque avait dissous devient la chose la plus visible de la planche.
- **À l'échelle des TWh** — largeurs égales encore, mais les hauteurs sont désormais proportionnelles
  à la production absolue (France = 380 unités, Suisse = 53). La surface redevient des TWh, sauf
  qu'elle est maintenant **lisible comme une longueur depuis un sol commun** : 71,9 unités de
  charbon allemand contre 63,2 de polonais, à 14 % l'une de l'autre, quand la colonne allemande tout
  entière écrase la polonaise.

Les trois états sont trois lectures honnêtes du même fichier : la mosaïque énonce le produit comme
une surface, « à largeurs égales » donne **un facteur**, « à l'échelle des TWh » donne **le produit
comme une longueur**. Le troisième facteur — la taille du pays — se lit sur la hauteur totale de la
colonne dans le dernier état. Rien n'est caché derrière un contrôle : le titre, la mise en garde, la
phrase de lecture et la source sont dessinés dans les trois états.

**Contrôle 2 — « demander à une tuile »** (`ask-a-mark`). *La question :* « Cette bande vaut combien
de TWh, et quelle part des six ? » La tuile répond avec son pays, sa source, sa part du mix, ses TWh
et sa part des 1 638 TWh — la quantité que la surface représente et qu'aucun œil ne sait relever.

**Et il ne répond que dans la mosaïque, délibérément.** `interaction.mjs` résout la marque pointée
sur des `cx`/`cy` lus une fois à l'initialisation ; un `transform` CSS ne les change jamais. Sous un
état tenu, les colonnes ont bougé de plusieurs centaines d'unités — un pointeur sur la tuile
polonaise résoudrait sur le centre allemand et répondrait « Allemagne ». Le format a une règle pour
ça et elle est plus vieille que ce beat : **une marque qui bouge n'est pas celle qui répond.** Donc
sous un état tenu, la couche de réponse est retirée (`pointer-events: none` sur la zone de clic,
`display: none` sur les points, ce qui les sort aussi du parcours clavier) et ce sont la phrase du
contrôle et le chiffre posé sur la planche qui portent les lectures. Le lecteur revient à la
mosaïque et le pointeur revient avec elle.

## Le vocabulaire : un nouveau fichier, et pourquoi aucun de ceux qui existaient ne convient

`filter.ts` dit ce qui peut **partir**. `stack.ts` dit ce qui peut **bouger** — et il bouge par
`translate(dx, dy)`, un déplacement par membre. `level.ts` couche une référence en travers.
`withdraw.ts` retire d'une somme. Aucun ne sait **redimensionner**.

Or égaliser des largeurs n'est pas un déplacement : c'est une **mise à l'échelle**. Un `dx` ne
changera jamais la largeur d'une colonne. `skills/chart-web/assets/hold.ts` est donc écrit pour ça —
**une transformation affine par colonne, dans les unités de la géométrie** : `translate(tx, ty)
scale(sx, sy)`, ce qui est exactement ce qu'il faut pour tenir immobile une des deux dimensions
d'une mosaïque et laisser l'autre parler. C'est le même idiome que `stack.ts` (des `input[type=radio]`
natifs plus du CSS engendré à la construction, zéro octet de script, la planche entière sans
JavaScript) avec la seule opération qui lui manquait.

**Il émet les identifiants `chart-stack-…` et l'attribut `data-stack-note`, et ce n'est pas un
copier-coller distrait.** Ces deux chaînes sont le **contrat de découverte** du format pour « un
contrôle qui bouge » : `interaction-plan.ts` lit les contrôles livrés **sur le balisage**, pas sur la
déclaration, et refuse celui dont la phrase révélée n'apprend rien. Une troisième grammaire de
mouvement qui se serait inventé ses propres orthographes serait devenue **invisible à la garde
écrite pour la refuser** — c'est exactement ce que l'en-tête de `filter.ts` raconte de ses deux
orthographes, qui avaient rendu la vérification creuse sur quatre pages sur cinq.

## Ce que le catalogue annonçait, et ce que la mesure a dit

La fiche `types/marimekko.md` nomme **deux** défauts déjà livrés. Le premier — l'encre d'une
étiquette dans une tuile choisie par une règle de luminosité plutôt que par un contraste mesuré —
**n'était pas présent** : le beat appelait déjà `inkOnFill`, qui mesure. Le second — **les étiquettes
de colonnes qui se touchent quand deux colonnes voisines deviennent étroites** — **était présent, et
la rustine portait le nom du rythme vertical.**

Les deux `lineHeight: 1.05` littéraux de ce composant (`KNOWN-STATE.md` en compte dix sur dix beats)
corrigeaient tous les deux un débordement, et tous les deux avec le levier de l'interligne :

- **L'étiquette de colonne** (`{nom}<br>{TWh}`) était en `white-space: normal` avec
  `overflow-wrap: anywhere` : dans une colonne de 15 px de large au téléphone, « Allemagne » se
  cassait en quatre lignes qui ne tenaient pas dans les 42 px de la rangée. 1,05 au lieu des 1,20 du
  registre gagnait les 13 % qui manquaient. **Le bon levier était celui que la fiche du type
  prescrit** : `white-space: nowrap`, exactement deux lignes, l'unité « TWh » énoncée une fois
  au-dessus au lieu d'être répétée six fois, **et un décalage sur deux rangées** (colonnes paires en
  haut, impaires en bas), ce qui double la place de chaque étiquette. La hauteur de la rangée se
  dérive maintenant du registre — quatre lignes de `fontSize × lineHeight` — au lieu d'être le
  nombre 42.
- **L'étiquette dans la tuile** était en `white-space: normal` avec une `max-width` égale à la
  largeur de la bande, donc « hydraulique 13 % » se cassait en deux lignes qu'une bande courte ne
  pouvait pas tenir. Le bon levier est `nowrap` **et une mesure vivante** : la décision
  `h >= 20 && w >= 70` était prise en **unités de viewBox**, c'est-à-dire à une seule largeur — au
  téléphone les mêmes 20 unités valent 5,8 px et l'étiquette débordait de toute façon. Elle est
  remplacée par une `@container` sur la tuile elle-même, avec un seuil **dérivé du registre de la
  direction** (`fontSize × lineHeight`) et non tapé. Une tuile trop courte ou trop étroite ne
  s'écrit pas ; elle répond au pointeur.

L'interligne est rendu aux deux registres. Et le remplacement est strictement meilleur que la
rustine : le nouveau seuil est repris à chaque largeur et dans chacun des trois états, ce que
`h >= 20 && w >= 70` ne pouvait pas faire.

## Deux défauts que seule la mesure a trouvés

- **Les pastilles de la clé étaient sous le plancher.** La clé dessine chaque teinte en carré de
  13 px posé sur le fond. Mesurés contre ce fond, les quatre premiers crans donnent 1,24 / 1,48 /
  1,79 / 2,17:1 sur les deux fonds clairs et les trois premiers 1,31 / 1,73 / 2,36:1 sur le fond
  sombre — sous le plancher non-textuel de 3:1. Dans le graphique c'est juste et on n'y touche pas :
  une bande est bornée par ses voisines, jamais par la page. Dans la CLÉ, non. Le filet d'1 px qui
  entourait la pastille valait 1,83 / 1,84 / 2,20:1 et ne sauvait donc rien ; il est calé au
  plancher et re-mesuré après le calage — **3,12 / 3,15 / 3,02:1**. Le détail complet et les
  vingt-sept contrastes d'encre dans les tuiles sont dans `PALETTE.md`.
- **Le point de réponse de la bande la plus haute tombait hors du graphique.** La bande dont la part
  arrondit à zéro centre son point 0,19 unité sous le bord supérieur du cadre, soit 0,03 px à
  375 px : mesuré sur `rapport`, le haut du `<svg>` était à 425,30 et le centre du point à 425,35,
  qui s'arrondit à 425. Un pointeur arrondi au pixel tombe donc AU-DESSUS de la `.hit-area`, seul
  élément câblé pour répondre, et la lecture n'apparaît jamais. Le point est maintenant tenu à
  1,5 unité des bords — un quart de pixel à 375 px, deux pixels à 1280 — ce qui préserve l'ordre de
  toutes les bandes sous `nearestCell` : la voisine de celle-là centre à 2,19. Et **une bande sous
  1,5 % de sa colonne ne reçoit plus de boîte d'étiquette du tout** : la `@container` répond « cette
  tuile tient-elle son nom À CETTE largeur », pas « le tiendrait-elle un jour », et une boîte
  dessinée pour un nom que personne ne verra jamais participe quand même à la mise en page et se
  pose sous le pointeur.

## Ce qui survit sans script

La plaque entière : les six colonnes aux vraies largeurs, les neuf bandes de chaque colonne, les
étiquettes qui tiennent dans leur tuile, les noms et les productions sous l'axe, le titre, la mise en
garde, la clé, la phrase de lecture et la source. **Et les trois états du contrôle**, qui sont des
`input[type=radio]` natifs plus du CSS `:has(… :checked)` engendré à la construction — aucune ligne
de script n'est nécessaire pour tenir une dimension immobile. Ce qui ne survit pas : la réponse au
pointeur, qui a toujours eu besoin d'un script dans ce format.

## Vérification

`verify-web.mjs`, une direction par ligne, contre les rendus livrés :

| | avant (rendus commités) | maintenant |
| --- | --- | --- |
| creme | 62 passés, **13 échecs** | **102 passés, 0 échec**, 6 sautés |
| nocturne | 59 passés, **13 échecs** | **96 passés, 0 échec**, 5 sautés |
| rapport | 59 passés, **13 échecs** | **96 passés, 0 échec**, 5 sautés |

Les treize échecs de départ étaient, sur chaque direction : les polices cuites (`Avenir Next`,
`Futura`, `Superclarendon`, rien d'embarqué — l'état que `KNOWN-STATE.md` décrit), le débordement
horizontal au téléphone (380 / 385 / 381 px dans une fenêtre de 375) et, sur deux directions, le
débordement vertical (73 px sur `nocturne`, 6 px sur `rapport`). Tous fermés.

Le contrôle a été piloté dans un vrai navigateur, **une fois avec script et une fois sans**, et les
deux relevés sont identiques au pixel : la mosaïque donne 361 / 125 / 57 px de large à l'Allemagne,
la Pologne et la Suisse ; « Les largeurs » donne 198 / 199 / 198 ; « L'échelle des TWh » donne les
mêmes largeurs pour des hauteurs de 429 / 149 / 68 px dont les bas coïncident tous à 769 px — le sol
commun. Sous un état tenu, `.pt` et `.hit-area` passent à `display: none` et reviennent quand le
lecteur revient à la mosaïque.

**Quatre mutations, quatre rouges**, chacune avec son propre message et `process.exitCode = 1` :

1. une option qui laisse chaque colonne exactement où la planche la dessine → *« that is the
   untouched view under a second name »* ;
2. une option qui place cinq colonnes sur six → *« says nothing about "CHE" … a mosaic whose widths
   no longer add up »* ;
3. des colonnes re-espacées jusqu'à se chevaucher → *« overlaps "FRA" and "DEU" ([0.00, 145.00]
   against [90.60, 235.60]) — two columns on the same pixels encode nothing »* ;
4. les deux phrases révélées vidées de leurs lectures → refus de `assertInteractionPlan` : *« the
   stack's 2 option(s) changes nothing »*. **C'est cette quatrième qui prouve que le contrat de
   découverte tient** : `interaction-plan.ts` voit bien les deux options de `hold.ts` et les mesure,
   parce que le fichier a rejoint l'orthographe du format au lieu de s'en inventer une.

Tests ciblés : `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
skills/splash/test/web-entrance-is-an-addition.test.ts` → **473 passés, 2 échecs**, tous deux
antérieurs et étrangers à ce beat (le recensement des 120 entrées décrit dans `KNOWN-STATE.md`, et
la `preview.png` périmée du seed `chart-web`, dont le `.tsx` était déjà modifié à l'ouverture de
l'arbre).

Deux vérifications restent en rouge apparent et ne le sont pas : `typeface: Open Sans 400 really
DRAWS, not its fallback` mesure **0,3 px d'écart sur 2 126,5** et `document.fonts` tient la face en
`loaded` — c'est le faux rouge que l'en-tête de `stack.ts` documente déjà sur la face 700, la sonde
concaténant tous les caractères d'une même pile en un seul sac où les différences par caractère
s'annulent. Elles n'apparaissent plus dans le compte ci-dessus parce que la `creme` livrée les passe.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` est une copie octet pour octet de `proof/static-marimekko-electricity-mix/data.csv`.

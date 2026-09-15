---
format: web
type: diverging-stacked-bar
---

# Beat — Le nucléaire décide seul de quel côté penche la France (web)

**Type:** diverging stacked bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Le mix électrique 2024 de six pays européens, dressé sur une **échelle ordonnée à cinq barreaux** et
penché de part et d'autre d'un centre :

| barreau | ce qu'il regroupe | renouvelable ? | brûle-t-il ? |
| --- | --- | --- | --- |
| charbon et pétrole | Coal + Oil | non | oui |
| gaz | Gas | non | oui |
| nucléaire | Nuclear | non | non |
| biomasse | Bioenergy | oui (directive) | oui |
| éolien, solaire, hydraulique | Wind + Solar + Hydropower + Other renewables | oui | non |

La **coupure par défaut est celle du frère statique** : le fossile à gauche, le renouvelable à
droite, et le **nucléaire à cheval sur le centre**. Sous cette coupure la bande centrale française
vaut **67,7 %**, contre 5,1 % de fossile et 27,2 % de renouvelable — plus large que ses deux ailes
réunies. C'est la revendication du frère statique, et elle est dessinée sans qu'on touche à rien.

Les trois barreaux font 100 % pour chaque pays, **sous chacune des quatre coupures**, et le runner
refuse la page sinon.

## La question du lecteur, et pourquoi aucun still ne peut y répondre

Un still doit choisir **où passe la coupure**. Le frère statique l'a choisie une fois, l'a écrite
dans son caveat et demande qu'on lui fasse confiance. Or ce choix est précisément ce sur quoi
l'Europe se dispute depuis dix ans : la directive RED compte la biomasse comme renouvelable et pas
le nucléaire ; la taxonomie climat compte le nucléaire et discute la biomasse ; la comptabilité
carbone ne regarde ni l'un ni l'autre mais ce qui sort de la cheminée. **Trois définitions, trois
coupures, et le même fichier gelé.**

La question que le lecteur arrive avec est donc : *« et si on comptait autrement ? »* Et sur ce
sujet elle n'est pas rhétorique, parce que la réponse renverse la planche :

> **La France passe de +89,8 points à droite à −45,6 points à gauche — et sous deux des quatre
> coupures elle est le pays des six qui penche LE PLUS vers la gauche, devant la Pologne, dont 57 %
> du courant vient du charbon et du pétrole. Pas un seul chiffre n'a changé.**

Un still ne peut pas montrer ça : il faudrait quatre planches côte à côte, et un lecteur qui compare
quatre planches compare des dessins, pas une définition. Une vidéo pourrait les enchaîner, mais elle
choisirait l'ordre — or l'ordre est justement l'argument de quelqu'un. Un scrolly ferait pareil. Ce
format-ci laisse la coupure au lecteur, garde tout le reste immobile, et lui rend la mesure du
basculement.

## Le geste — `side.ts`, un vocabulaire nouveau : **de quel côté chaque barreau ordonné compte**

Le lecteur déplace **la coupure** le long de l'échelle. Quatre positions, chacune une position
éditoriale réelle et citable :

| pastille | coupure | à gauche | à droite |
| --- | --- | --- | --- |
| **nucléaire à cheval** *(défaut)* | SUR le nucléaire | fossile | biomasse + renouvelables |
| ce qui n'est pas fossile | après le gaz | fossile | nucléaire + biomasse + renouvelables |
| ce qui est renouvelable | après le nucléaire | fossile + nucléaire | biomasse + renouvelables |
| éolien, solaire, hydraulique seuls | après la biomasse | fossile + nucléaire + biomasse | renouvelables |

**Rien n'est ajouté, rien n'est retiré, rien n'est remesuré.** Chaque barreau garde exactement la
part qu'il avait ; seul le CÔTÉ où il est dessiné change. C'est ce qui rend le basculement lisible :
un lecteur qui voit une bande traverser le centre sait que c'est la définition qui a bougé, pas la
donnée. Les six barres restent dans leur ordre alphabétique, les six noms ne bougent pas d'un pixel,
l'axe garde ses cinq graduations et ses mêmes mots.

### Ce que chaque coupure rend comme lecture

Les trois pastilles non-défaut révèlent une phrase, et chaque chiffre dedans est lu sur la donnée
gelée, jamais tapé :

- **ce qui n'est pas fossile** — la France monte à +89,8, mais trois pays la devancent encore
  (Suède +97,6, Norvège +97,2, Suisse +96,2). Compter le nucléaire comme le solaire ne met pas la
  France en tête.
- **ce qui est renouvelable** — la France bascule à **−45,6** et devient le pays qui penche le plus
  à gauche des six, **devant la Pologne (−37,7)**.
- **éolien, solaire, hydraulique seuls** — l'Allemagne traverse le centre à son tour (**−3,3** après
  +17,3) : ses 10,3 % de biomasse faisaient à eux seuls la différence.

Le défaut, lui, ne révèle rien : ce n'est pas une contre-épreuve, c'est la revendication que le
titre énonce, et `assertSideDeclaration` refuse une phrase sous le défaut.

### Pourquoi c'est un fichier neuf et pas l'un des dix-neuf, et surtout pas les deux voisins

**`datum.ts` (la barre divergente) — le lecteur déplace le ZÉRO.** Là-bas l'axe est numérique et la
référence glisse le long de lui : une valeur de 12 devient −3 parce que le zéro est passé à 15. Les
catégories ne bougent pas, elles n'existent pas — il n'y en a qu'une par ligne. Ici le centre ne
bouge jamais (il est à 50 % de la planche dans les quatre états, et c'est vérifié), et ce qui change
est **l'appartenance d'un barreau à un camp**. Une part de 67,7 % reste 67,7 % ; elle change de
côté. Le zéro d'une barre divergente est une valeur ; la coupure d'une barre divergente empilée est
une **frontière entre catégories ordonnées**, et aucune arithmétique de `datum.ts` ne sait l'écrire.

**`qualify.ts` (le dot strip) — le lecteur choisit ce qui compte dans le NUMÉRATEUR.** Là-bas
l'échelle est une soustraction stricte : à chaque cran une source sort du numérateur, donc chaque
marque ne peut que RECULER, et c'est la seule règle que le lecteur a pour lire le contrôle. Ici rien
ne sort de rien : le dénominateur ET le numérateur sont intacts sous les quatre coupures, chaque
ligne fait toujours 100 %, et une ligne peut aller dans **les deux sens** selon la coupure (la
France recule, l'Allemagne recule, la Norvège ne bouge presque pas, la Pologne ne bouge pas du
tout). Un vocabulaire dont la garde centrale est « rien ne va jamais vers la droite » ne peut pas
porter un geste dont la moitié de l'intérêt est qu'une ligne traverse.

**`cutoff.ts`** tire une ligne sur un axe de VALEURS et sélectionne ce qui la franchit ; sa coupure
est un nombre. Celle-ci est un **rang dans une liste ordonnée**, et la contiguïté de cette liste est
la garde principale de ce fichier — ce dont `cutoff.ts` n'a aucune notion.

**`withdraw.ts`** retire un terme d'une somme et regarde ce que le reste devient (le total se
referme). Ici le total ne se referme pas et ne bouge pas : c'est toujours 100 %.

**`stack.ts`** empile ou déplie des colonnes sur une tour ; il n'a pas de centre et pas de camps.
Un empilement divergent n'est pas un empilement avec une ligne au milieu : la ligne est le sens du
dessin, pas un ornement.

### Les refus que `side.ts` fait, et trois qu'aucun voisin ne peut faire

1. **Une coupure non contiguë.** Le camp de gauche doit être un PRÉFIXE de l'échelle et celui de
   droite son SUFFIXE, avec au plus un barreau à cheval sur la couture. Une coupure qui prendrait le
   premier et le quatrième barreau à gauche n'est pas une coupure : c'est une re-catégorisation, et
   tout le contrat du type — une échelle ORDONNÉE autour d'un milieu — s'effondre avec elle. Aucun
   voisin n'a la notion d'échelle ordonnée, donc aucun ne peut refuser ça.
2. **Une coupure qui change la TAILLE d'un barreau.** Chaque barreau garde sa part exacte dans les
   quatre coupures, à 1e-9 près. Une coupure qui remesurait serait `qualify.ts` déguisé, et le
   lecteur verrait une bande rétrécir sans savoir si c'est la définition ou la donnée.
3. **Une ligne qui ne fait pas 100 %, mesurée DANS CHAQUE COUPURE.** C'est le défaut que la fiche du
   type dépose, et il devient ici quatre fois plus facile à commettre : la promesse « ces segments
   sont la totalité de cette ligne » est faite une fois PAR COUPURE, pas une fois par page.
4. **Deux barreaux à cheval, ou un barreau à cheval ailleurs qu'à la couture.** Un graphique à deux
   neutres n'a pas de centre.
5. **Une échelle réordonnée d'une coupure à l'autre.** L'ordre des barreaux est la prémisse du type ;
   une coupure qui le change redessine le graphique au lieu de déplacer la coupure.
6. **Plus de cinq barreaux** — la limite que la fiche du type écrit noir sur blanc
   (`<!-- limit: levels > 5 -->`) : au-delà, les deux nuances par côté se télescopent en silence.
7. **Une coupure dont la planche égale celle du défaut** — pas une ligne dont le net bouge de plus
   du plancher déclaré. C'est le refus de `directed-interaction.md`, dans les unités de ce fichier.
8. **Un net déclaré qui n'est pas le net des parts.** La lecture et le dessin sont deux lectures
   d'une seule arithmétique.
9. **Une coupure sans phrase, un défaut qui en porte une, un nom accessible qui ne contient pas son
   étiquette visible** (WCAG 2.5.3) — les conventions que tous les voisins tiennent.
10. Sur la **page écrite** (`assertOneCut`) : une bande à moitié étiquetée, un vocabulaire qui
    n'émet aucune règle, et la règle-couverture émise APRÈS la révélation de la coupure par défaut.

## L'arbitrage du propriétaire qui mord ce type, pris de face

**« Rien ne bouge sans que le lecteur voie pourquoi. »** Ce geste déplace des bandes, donc il doit
rendre des comptes :

- **Les six noms de pays ne bougent jamais.** Les lignes sont dans l'ordre alphabétique français —
  Allemagne, France, Norvège, Pologne, Suède, Suisse — qui est un ordre du monde et pas un ordre de
  résultat. Trier par résultat était la tentation évidente et elle est refusée trois fois : la fiche
  du type l'interdit explicitement (« rows keep their own natural order … never re-sorted by
  result »), `interaction.mjs` résout le pointeur sur des `cx`/`cy` lus une fois à l'init donc une
  ligne re-triée répondrait pour le pays dont elle occupe la place, et six étiquettes qui se
  réorganisent à chaque clic sont exactement le radar que le propriétaire a refusé deux fois.
- **Ce qui bouge, ce sont les bandes elles-mêmes**, et la pastille dit quel barreau vient de changer
  de camp. La raison est dans le dessin, pas dans une phrase qui l'excuse.
- **Les graduations ne bougent pas** : cinq positions fixes (−100, −50, 0, +50, +100), les mêmes
  mots dans les quatre coupures. L'axe n'est jamais recalculé.

**« Pas de rond au survol. »** Ce qui répond au pointeur, c'est **la bande elle-même**, assombrie
depuis SON PROPRE remplissage par une dose CHERCHÉE jusqu'à un écart mesuré (1,14:1 sur la couleur
réellement peinte), jamais une dose fixe. Les `.pt` sont invisibles et ne servent qu'à nommer la
bande (`data-mark-ref` → `data-mark`), ce que le format prévoit.

**« Le changement d'état s'interpole quand c'est possible. »** Les rails se coupent net — ils
DOIVENT, parce que `interaction.mjs` lit les coordonnées une fois à l'init et qu'une bande animée
répondrait pour la position qu'elle a quittée. Ce qui s'interpole, c'est **le repère de net** : un
petit trait HTML par ligne, TOUJOURS rendu, dont la position est générée par coupure et transitionnée.
C'est la forme qu'une transition demande (`display` ne s'interpole pas), et c'est le seul mouvement
de la page dont le lecteur voit la raison parce que **le mouvement EST la lecture** : le net d'une
ligne est ce que le contrôle rend, et le trait est ce net dessiné.

**« Pas d'encadré au survol ni au filtre »** et **« la pastille n'est pas une dalle d'encre »** :
le chrome vient de `control-chrome.ts` sans une variation locale, lavis + anneau + mots.

## Le piège de la fiche du type, et ce qu'il s'est révélé être ici

La fiche dépose deux défauts silencieux : **le neutre doit être NOMMÉ** (sinon la pile dérive hors du
centre, et deux niveaux voisins ont déjà fusionné en une seule bande), et **chaque ligne doit vraiment
faire 100 %**.

Le premier arrive ici sous une forme que la fiche n'avait pas à envisager : **avec un contrôle, le
neutre n'est pas une constante, c'est une fonction de la coupure.** Sous le défaut il y en a un (le
nucléaire, à cheval) ; sous les trois autres il n'y en a aucun. Un neutre « au milieu du tableau par
défaut » serait faux dans trois états sur quatre. `side.ts` le prend donc par coupure, nommément, et
refuse qu'il soit ailleurs qu'à la couture ou qu'il y en ait deux.

Le second se multiplie de la même façon — quatre promesses de 100 % au lieu d'une — et est vérifié
par coupure.

La fiche pose aussi un **piège d'accessibilité** : l'encre d'une étiquette DANS un segment doit être
mesurée contre le remplissage de CE segment, parce qu'un seuil unique clair/foncé échoue sur un
ton médian. **Ce beat refuse l'étiquette dans le segment** et l'a remplacée par les deux totaux de
côté, posés aux deux bouts de la barre, SUR LE FOND — la règle non filée que le frère statique suit
déjà et cite (« the totals belong outside the bar, at the ends »). Une seule mesure contre le fond
remplace cinq mesures contre cinq remplissages, et c'est aussi le seul chiffre qui change quand la
coupure bouge. Les cinq parts individuelles sont rendues par le pointeur, qui a la place de les
écrire.

## Ce que le web ajoute, en une phrase (`earns`)

Le lecteur déplace la coupure entre les deux camps et voit la France passer de +89,8 à −45,6 sans
qu'un seul chiffre change — un still doit choisir une définition et demander qu'on lui fasse
confiance, une vidéo et un scrolly choisissent en plus l'ORDRE dans lequel on les voit, qui est
l'argument de quelqu'un.

## Les contrôles, et ce que chacun doit passer

| # | la question du lecteur | le geste | ce qui change dans l'image |
| --- | --- | --- | --- |
| 1 | « Et si on comptait autrement ? » | `toggle-a-comparison` | Chaque barreau reste de la même taille et change de camp ; les bandes traversent le centre, les deux totaux de bout se réécrivent, le repère de net glisse jusqu'à sa nouvelle position et une phrase nomme ce que la nouvelle coupure renverse. |
| 2 | « Qu'est-ce qu'il y a dans cette bande ? » | `ask-a-mark` | La bande pointée s'assombrit depuis son propre remplissage et répond avec le pays, le barreau, sa part, les sources qui le composent et de quel côté cette coupure le range. |

Deux contrôles écartés, et la mesure derrière chacun :

- **Trier les lignes par net.** Refusé, voir l'arbitrage ci-dessus. Ce que ça coûte est dit dans la
  planche : la coupure rend les camps comparables, elle ne classe pas les pays. Le classement est
  dans la phrase révélée, où il ne déplace aucune étiquette.
- **Filtrer les pays.** Il y en a six, tous visibles, et la comparaison des six EST la planche. Un
  filtre ne retirerait que des lignes que le lecteur regarde déjà.

## Traitements

- `the-neutral-straddles-the-centre` — **dépensé, et il change de nature ici.** Sous le défaut le
  nucléaire est à cheval parce qu'il n'appartient à aucun des deux camps *par définition*. Sous les
  trois autres coupures il n'y a pas de neutre du tout, et c'est honnête : le lecteur vient de
  décider qu'il en appartient à un.
- `name-each-half-in-words` — **dépensé, et il devient le contrôle.** Les deux camps sont nommés
  au-dessus des lignes, et ces noms CHANGENT avec la coupure, parce que c'est exactement ce que la
  coupure fait.
- **Une famille de teinte, des forces qui se creusent vers l'extérieur** — la fiche exige une rampe
  par côté, jamais une rampe unique traversant le centre. Voir `PALETTE.md`.

## La couleur

Argumentée et mesurée dans `PALETTE.md`, qui a été réécrit : le fichier de ce beat était l'une des 40
copies identiques à l'octet raisonnant sur une aire partagée en deux moitiés à une année pivot, ce
qui n'est le sujet d'aucune page ici. Le résumé : **la couleur appartient au BARREAU, pas au camp**,
parce que le camp est ce que le lecteur vient de choisir et qu'un barreau doit rester reconnaissable
en changeant de côté ; la rampe est bâtie **vers l'extérieur depuis le centre**, chaque cran poussé
contre son voisin jusqu'à 1,45:1, parce que deux couleurs calées indépendamment sur le même plancher
contre le même fond sortent identiques par construction. **La première version de la rampe a été
refusée par son propre rendu** : le neutre, bâti sur le mélange encre/accent plein, mesurait 13,4:1
contre le fond — l'objet le plus lourd de la page était la bande qui veut dire « ni l'un ni l'autre »,
et la planche française était une dalle quasi noire large de 67,7 %.

## Le `lineHeight` codé en dur

Aucun. Ce composant n'en pose pas : l'interligne reste au registre. (Ce beat n'était pas dans la liste
des dix de `KNOWN-STATE.md`.)

## Le défaut systémique de la cellule étirée

Ce type dessine des **rectangles**, c'est-à-dire des LONGUEURS dans le plan : elles appartiennent au
plan et doivent suivre l'étirement. Les deux seules formes de la page qui ne le doivent pas sont les
pastilles du chrome et **le repère de net**, et toutes deux sont du HTML à largeur fixe en pixels CSS
hors du `viewBox`. Le tronc réparé fait le reste : mesuré en Chrome, `scaleX / scaleY` vaut **1,0000**
à 1512x860 et à 1280x1024, et **1,0001** à 375x812, contre une barre de ±0,005.

## Ce que les rendus ont appris, et chacun a été lu dans une capture ou dans un navigateur piloté

1. **Le neutre était le plus lourd de la page** (voir ci-dessus). Retourné : le neutre est maintenant
   le plus CLAIR des cinq (3,01 / 3,13 / 3,03:1 contre les trois fonds), et l'intensité se creuse vers
   les deux bouts (6,6 / 7,3 / 6,7:1). C'est exactement l'ordre que la fiche du type demande, obtenu
   en construisant la rampe dans cet ordre plutôt qu'en calant cinq couleurs séparément.
2. **Les deux totaux de côté étaient dessinés dans l'accent** parce que `regs.value` le porte. Sur
   cette page l'accent plein est le camp de droite : un total de gauche habillé d'accent dit que la
   gauche est l'argument. Les deux passent à l'encre, au plancher de texte.
3. **Le titre à onze mots faisait déborder `nocturne`** de 39 px hors de sa fenêtre de 812 px et
   poussait la ligne de source hors écran — `nocturne` compose son registre display en capitales
   espacées. Mesuré en Chrome, pas deviné. « En 2024, » est parti au caveat, à la source et à l'alt.
   Les trois directions tiennent maintenant à 812/812.
4. **Les deux gouttières mangeaient 214 px des 375** d'une fenêtre de téléphone, ce qui laissait une
   cellule de 113 x 48 px. Ramenées à 110 et 64 px — assez pour « Allemagne » et pour « 100,0 % »,
   mesuré sur le rendu — la cellule passe à 153 x 65 px. **Le téléphone reste dégradé** et c'est la
   dette mobile déjà consignée au tronc (le bump y tombe à 107 x 35 px pour la même raison) : desktop
   d'abord, consigné et non corrigé ici.
5. **Le contrôle actionné, regardé dans les trois directions** : la bande nucléaire de la France
   traverse le centre d'un bloc, la barre française dépasse celle de la Pologne vers la gauche, et le
   repère de net glisse de +22,1 à −45,6 pendant que les six noms ne bougent pas d'un pixel. Sur
   `non-brûlé`, le repère de l'Allemagne passe juste à gauche du centre (−3,3) : le mouvement le plus
   petit de la page est celui qui se lit le mieux, parce qu'il traverse.

## Verification

- `verify-web.mjs` sur les trois rendus : **creme 101 / 0, nocturne 99 / 0, rapport 93 / 0**
  (les 5 ou 6 skips sont les contrôles de FILTRE, que ce beat ne déclare pas). Le navigateur est
  piloté avec script **et sans** : les 27 marques répondent à un vrai pointeur dans les deux fenêtres,
  et sans script la planche complète est là.
- Anisotropie de la cellule, mesurée en Chrome sur les trois pages et trois fenêtres : **1,0000 /
  1,0000 / 1,0001**.
- La pastille choisie, mesurée sur le pixel peint après la transition de 120 ms : lavis **1,409 /
  1,619 / 1,410:1** contre le fond, mots cochés **14,49 / 10,98 / 14,89:1** sur le lavis, anneau
  **6,64 / 10,80 / 7,09:1**. Un lavis et un anneau, pas l'encre la plus lourde.
- `bun test skills/chart-web/test/` : **203 pass / 0 fail**.
- `bun test` ciblé (parité des vocabulaires, recensement des interactions, chrome partagé, copies
  portées, filtres déclarés, couleurs nommées, interligne) : **788 pass / 1 fail**, et l'unique rouge
  est antérieur et commun à tout le corpus — `claims-grounded-in-data` ne connaît pas
  `render-directions-web.mjs` dans son `BEAT_SCRIPTS`, donc les **146** rendus dirigés de tous les
  beats `web-*` lui sont orphelins, les deux frères qui viennent d'atterrir compris.

### Mutations — six lancées, cinq rouges, une verte et c'est la mutation qui avait tort

| mutation | ce qui rougit |
| --- | --- |
| la règle-couverture est émise APRÈS la révélation de la planche par défaut | `assertOneCut`, dans les trois directions |
| une coupure déclare un neutre hors de sa couture (`left: 3`, couture `biomasse`, neutre `gaz`) | `assertSideDeclaration` |
| un net déclaré s'écarte de 4 points du net des parts | `assertSideDeclaration`, qui imprime les deux |
| une cinquième coupure identique au défaut sous un autre nom | « moves no row's net lean by more than 0.000 » |
| les bandes cessent de porter `sideBandAttrs` | `assertOneCut` : « not one element carries `data-side-band` » |
| le plan cesse de déclarer le contrôle que la page embarque | `assertInteractionPlan` |

La verte est dite plutôt que cachée : la première tentative posait `straddle: "biomasse"` sur la
coupure `left: 3` **dont la couture EST la biomasse**. C'était une coupure légale, pas une garde
creuse — refaite en `straddle: "gaz"`, elle rougit. Aucune mutation n'a planté au lieu de refuser.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` est une copie octet pour octet de `proof/static-diverging-stacked-electricity/data.csv`.

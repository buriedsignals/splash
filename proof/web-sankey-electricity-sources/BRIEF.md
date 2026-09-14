---
format: web
type: sankey
---

# Beat — Le lecteur suit UNE source d'un bout à l'autre, et l'arithmétique du trajet est écrite (web)

**Type:** sankey. **Medium/format:** chart / **web**. **Frame:** fluid in width, fixed in proportion.

## Le geste, avant le code

### La question du lecteur

Un sankey dessine cinquante rubans qui se croisent. La difficulté propre à la forme n'est pas de
lire un total : c'est de **suivre un trajet**. Le lecteur arrive avec SA source — le nucléaire parce
qu'il se demande ce que la France en fait, le charbon parce qu'il se demande où il tient encore, le
solaire parce qu'il se demande s'il pèse — et il veut la voir partir, se diviser, et arriver. Une
plaque fixe ne peut pas répondre à ça : elle choisit une source pour lui (ici le nucléaire, parce
que c'est le titre) et les huit autres restent un enchevêtrement dans lequel l'œil se perd au premier
croisement. Une vidéo ne le peut pas davantage — elle choisirait l'ordre. Un scrolly non plus : il
choisirait le nombre de trajets.

### Le geste

**Le lecteur choisit la source, et tout son aval s'allume pendant que le reste recule.** Le nœud de
la source passe à l'accent, ses rubans passent au premier plan, les nœuds-pays qui ne reçoivent rien
d'elle deviennent **creux** — contour pointillé, fond vide — et les pays atteints portent, sous leur
étiquette, **la part de leur propre électricité que cette source fournit**. Sous le contrôle, une
phrase écrit l'arithmétique complète du trajet : combien part, combien arrive à chaque destination,
et **combien la plaque ne dessine pas**.

C'est ce qu'aucun autre genre ne fait : neuf trajets disponibles, un seul à la fois, choisi par le
lecteur, et le même dessin à chaque fois — donc comparable d'une source à l'autre, ce qu'une suite
de neuf plaques ne serait pas.

### Ce qui change dans l'image

| | état par défaut (nucléaire) | après un choix (charbon) |
|---|---|---|
| rubans | les 3 du nucléaire à l'accent, les 32 autres en gris reculé | les 2 du charbon à l'accent |
| nœud source | nucléaire à l'accent | charbon à l'accent, nucléaire au gris |
| nœuds pays | Allemagne, Pologne, Norvège **creux** | Suède, Norvège, Suisse **creux** |
| sous l'étiquette pays | France 67,7 % · Suède 29,4 % · Suisse 30,6 % | Allemagne 21,4 % · Pologne 54,3 % |
| sous le nœud source | 455 TWh sortent · 3 pays · 0 TWh non dessiné | 201 TWh sortent · 2 pays · 1,0 TWh non dessiné |
| phrase sous le contrôle | (c'est la revendication : elle est imprimée au repos) | l'arithmétique du charbon |

### Comment un lecteur sans script l'obtient

Neuf `<input type="radio">` natifs dans un vrai `<fieldset>`, et **du CSS généré à la construction** —
`:has(#id:checked)` sur la figure. Aucun écouteur, aucun état, pas un octet de JavaScript. C'est le
mécanisme de `filter.ts`, `stack.ts`, `level.ts` et `withdraw.ts` ; c'est le geste qui est nouveau.
Le `fill=` porté par chaque ruban est un **attribut de présentation SVG**, donc il perd contre
n'importe quelle règle CSS — et ce qu'il achète, c'est l'état sans feuille du tout : le dessin reste
celui de la revendication. Mesuré, script coupé, dans les trois directions : `page.click` sur
`#chart-trace-coal` par le modèle de boîte CDP (aucun script de page n'est en jeu), puis lecture de
`CSS.getComputedStyleForNode` — ruban charbon accent à 0,95, ruban nucléaire neutre à 0,5, nœud
charbon accent, France/Suède/Norvège/Suisse creux.

## Un cinquième fichier de vocabulaire : `trace.ts`

Les quatre existants ne disent pas ça. `filter.ts` dit ce qui peut **partir** — ici rien ne part, le
réseau non tracé est exactement le point de comparaison. `stack.ts` dit ce qui peut **bouger** — ici
rien ne bouge. `level.ts` dit ce qui peut être **couché en travers**. `withdraw.ts` dit ce qui peut
être **retiré d'une somme**.

Un tracé demande une cinquième chose : **une PARTITION ARITHMÉTIQUE d'un nœud à travers ses
destinations**. Sa déclaration n'est ni un ensemble, ni un arrangement, ni une soustraction : c'est
une origine, la liste ordonnée de ses segments avec ce que chacun vaut aux deux bouts, et le reste
que la plaque ne dessine pas. Et c'est le seul des cinq qui puisse **refuser une option parce que son
arithmétique ne boucle pas** — ce qui, sur ce beat, refuse effectivement une source.

## Le piège du type, vérifié à nouveau — et il était rouvert

`sankey.md` : *« un nœud promet que tout ce qui entre égale tout ce qui sort ».* Le runner précédent
vérifiait cette promesse **contre les données**, jamais contre **ce que la plaque dessine**. Or
quinze liaisons tombent sous le demi-pixel et ne sont pas dessinées. Mesuré, par source :

| source | TWh du nœud | dessiné | non dessiné |
|---|---|---|---|
| nucléaire | 455,14 | 455,14 | 0 |
| hydraulique | 346,16 | 344,05 | 2,11 |
| éolien | 268,15 | 267,97 | 0,18 |
| charbon | 200,85 | 199,83 | 1,02 |
| solaire | 127,01 | 126,48 | 0,53 |
| gaz | 118,82 | 116,97 | 1,85 |
| biomasse | 81,17 | 79,89 | 1,28 |
| pétrole | 38,39 | 34,48 | 3,91 |
| **autres renouv.** | **1,83** | **0,00** | **1,83** |

Sept nœuds sur neuf sortent moins qu'ils n'annoncent, et la ligne de reste globale de la page
(« 15 liaisons, 12,7 TWh ») le noyait dans un agrégat. **« Autres renouvelables » ne sort RIEN** :
un nœud qui affiche 2 TWh et dont aucun ruban ne part. Un contrôle qui crée un état par source rend
ce trou visible source par source, donc `trace.ts` **refuse une origine dont la plaque ne dessine
aucun segment** — et cette source n'est pas offerte. Pour les huit autres, chaque phrase écrit son
propre reste, et le runner vérifie `dessiné + non dessiné = total du nœud` **dans chacun des huit
états**.

## Deux choses trouvées en chemin

- **Les mots du plot devaient être gainés.** Le trajet suivi est posé à 0,95 : l'encre par-dessus ce
  composite mesure 2,4:1 en `creme`, sous le plancher texte de 4,5:1. Le nom d'un pays devenait
  illisible exactement quand le lecteur allumait le trajet qui l'atteint. Chaque mot dans le plot
  porte donc un contour de la couleur du fond sous son remplissage (`paint-order: stroke fill`), donc
  ce contre quoi l'encre est mesurée est le fond — déjà tenu au plancher — et non le ruban derrière.
- **La flèche `→` de l'infobulle a été remplacée par « vers ».** U+2192 est dans la plage `latin`
  qu'Open Sans DÉCLARE et n'est pas dans le fichier : il atterrit donc seul dans la branche
  « demandé par son nom », où Google répond avec un sous-ensemble vide et une URL de kit qui rend
  400. Le garde refuse plutôt que de laisser le glyphe tomber dans une police de secours — mesuré :
  le texte de l'ancienne page échoue à l'identique, donc ce n'était pas une régression de cette
  passe, mais elle bloquait le rendu.

## Traitements dépensés

- `every-node-carries-its-own-total` — inchangé : chaque nœud imprime ses TWh.
- `ribbons-are-translucent-so-crossings-are-honest` — **restreint au champ reculé, et dit**. Deux
  rubans reculés qui se croisent donnent une troisième valeur, mesurée à 1,51:1 du simple : le
  croisement se lit. Le trajet tracé, lui, est posé à 0,95 et **occulte volontairement** — un trajet
  qu'on a demandé à suivre et qui devient transparent à chaque croisement est un trajet qu'on ne
  suit pas.
- `a-band-too-thin-to-see-is-not-drawn-it-is-counted` — inchangé dans la forme, **rendu vérifiable**
  par source plutôt qu'agrégé (tableau ci-dessus).

## Palette

Douze remplissages sont devenus quatre, et `PALETTE.md` écrit pourquoi : la rampe à neuf tons
séparait ses cinq derniers pas de 1,006 à 1,016:1 — cinq sources peintes comme si c'étaient cinq
catégories. Le contrôle fait le travail que la rampe ne pouvait pas faire, donc un ruban n'a plus que
deux états. Le seul chiffre sous le plancher — un ruban reculé à 1,96:1 du fond — est dit plutôt que
caché : trois niveaux sur un fond, c'est un de plus que la plage fond-accent ne sait porter.

## Vérification

Trois directions rendues, capturées avec le contrôle opéré (`Page.captureScreenshot`, jamais
`page.screenshot()`), pilotées script actif et script coupé. Mutations dans le rapport de session.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-sankey-electricity-sources/data.csv`.

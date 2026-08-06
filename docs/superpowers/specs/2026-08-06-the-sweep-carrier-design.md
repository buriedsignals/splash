# Le porteur du balayage — ce qui fait avancer un récit de carte

**Origine** : Rémy, 2026-08-06, en corrigeant mon cadrage — *« si on n'a pas de route ça ne marche
plus, et nous on doit pouvoir adapter nos outils à tous les sujets »*.
**Référence** : `skills/map-explainer` de Buried Signals (repo `buriedsignals/materials`), Fig. 4 du
dossier water-wars.

## 1. Le dispositif, une fois l'eau enlevée

La Fig. 4 se lit comme « un fleuve qui se dessine et allume les pays au passage ». Ce n'est pas ça :

> **Un scalaire continu avance, et chaque marque s'allume quand il l'atteint** — sa bordure se
> dessine, son remplissage éclot, son étiquette monte.

Le fleuve n'est qu'un **porteur** de ce scalaire. Dans le code de Tom, la seule ligne qui parle
d'eau est le calcul de `stop`, la fraction d'arrivée. Chez nous c'est pareil : `stagedEntrance()`
est déjà générique et seul `trigger = RIVER_START + t.stop * (RIVER_END − RIVER_START)`
(`RouteReveal.tsx`) est routier.

**Le défaut n'était donc pas un dispositif manquant — c'est un dispositif à UN SEUL porteur, et ce
porteur exige une route.** Un sujet sans parcours n'avait rien.

## 2. La règle

**Le porteur est un choix, pas une donnée du moteur.** Cinq porteurs, un seul dispositif ; ils ne
diffèrent QUE par le calcul du `stop` de chaque marque, jamais par ce qui se passe ensuite.

| porteur | ce qui avance | une marque s'allume | exige des données |
|---|---|---|---|
| `route` | la ligne se dessine | à son arrivée sur la marque | une route/un tracé |
| `time` | une date avance | à sa date | un champ temporel |
| `threshold` | une valeur descend du max au min | quand le seuil passe sa valeur | un champ numérique |
| `space` | une ligne balaie selon un cap | à son passage sur le point | des coordonnées |
| `order` | un compteur avance | à son rang dans la marche | rien |

Deux conséquences que ce tableau impose :

1. **Aucun sujet n'est exclu.** `threshold` et `space` ne demandent rien qu'une carte n'ait déjà.
2. **Le `stepped` rentre dans la famille** : c'est le porteur `order`. Story et stepped cessent
   d'être deux moteurs — **un moteur, un choix de porteur**, dont le plus rigide avance sur le seul
   rang.

## 3. Ce qui est proposable se LIT, jamais ne se récite

Même discipline que le genre narratif : les porteurs offerts sont **dérivés de la donnée**
(`carriersFor`), jamais d'une liste tapée. Une carte sans champ temporel ne se voit pas proposer
`time`, et son absence est **expliquée** (`whyNotOffered`), pas tue. Leçon déjà payée deux fois :
une capacité affirmée de mémoire est fausse tôt ou tard, et un refus est crédible — donc il meurt
sans bruit.

## 4. Ce qui ne change pas

- **`stagedEntrance`** — bordure → remplissage → étiquette. Le porteur décide QUAND, jamais COMMENT.
- **Sans porteur déclaré, rien ne change** — une production d'hier rend à l'octet ce qu'elle
  rendait. C'est l'invariant qui borne le lot.
- **Le storyboard** — le porteur ordonne les entrées ; les phrases restent celles du journaliste.

## 5. Décisions prises, et pourquoi

- **Une marque que le porteur ne peut pas placer atterrit à la FIN**, jamais au début : la placer
  d'abord affirmerait un rang que la donnée n'a pas donné.
- **Des marques de valeur identique s'allument ensemble** — les échelonner inventerait un ordre.
- **La peinture est UNE expression data-driven**, pas une boucle `setPaintProperty` par région : un
  choroplèthe porte des centaines de régions et le moteur re-parse le style à chaque mutation.
- **`__stop` est cuit sur la feature**, pour que l'expression compare sans rien re-dériver.
- **`SWEEP_BLOOM` est une constante**, comme les durées de Tom : piloter l'éclosion par une tranche
  du balayage fait défiler une carte dense en un éclair.

## 6. Hors périmètre

- **Cesium / le survol 3D** (Fig. 3) — moteur absent, chantier entier.
- **Le plateau fixe** (`render-stability.md`) — motif à risque présent (`jumpTo` par frame), mais
  symptôme **non démontré** : mesuré le 2026-08-06 sur un rendu réel, l'écart entre frames est
  lisse et proportionnel au mouvement, sans plancher de bruit pendant les poses. À rouvrir si un
  fond texturé (satellite, hillshade) le révèle.

## 7. Les règles non négociables

1. **Un porteur non rendu n'est pas proposé**, et son absence est expliquée.
2. **Ce qui est offert est LU de la donnée**, jamais récité.
3. **Sans porteur, rien ne change.**
4. **Une affirmation visuelle non rendue n'est pas une affirmation.**

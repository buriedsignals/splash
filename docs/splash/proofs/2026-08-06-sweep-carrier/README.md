# Le balayage par seuil, sur un sujet sans route

Frames d'un vrai mp4 — part d'électricité renouvelable par pays européen. **Aucune route dans ce
sujet** : c'est tout l'intérêt.

| frame | ce qu'on voit |
|---|---|
| `threshold-first.png` | le seuil est haut : seule la **Norvège** (la valeur la plus élevée) est peinte |
| `threshold-second.png` | le seuil est descendu : la **Suède** s'allume à son tour, avec son 68 % |

Les régions s'allument dans l'ordre décroissant des valeurs, à mesure que le seuil descend — le
dispositif de la Fig. 4 de Buried Signals (le fleuve qui allume les pays), avec le porteur choisi
pour le sujet au lieu d'un fleuve que le sujet n'a pas.

## Les deux porteurs qui manquaient au choroplèthe (lot A)

`time` et `space` étaient écrits et testés dans le cœur, et **inatteignables depuis un
choroplèthe** : ses marques ne portaient que `{name, value}`, donc `carriersFor` ne les offrait
jamais et chaque région atterrissait à 1. Deux vrais mp4 (`choropleth.json`, 819 frames,
`SPLASH_CHANNEL=article-web`), un par porteur.

**Porteur `time`** — colonne `since` ajoutée aux rows (**colonne de démonstration**, pas une
donnée Ember), délibérément l'INVERSE du classement des valeurs : POL 1995 … NOR 2019. Si le
balayage suivait encore la valeur, la Norvège (99 %) s'allumerait la première.

| frame | ce qu'on voit |
|---|---|
| `time-early.png` (430) | la caméra est sur la **Suède** (2ᵉ valeur) et la Suède est **blanche** ; ce sont la **Pologne** et l'**Italie** — les deux dates les plus anciennes — qui sont peintes |
| `time-late.png` (760) | tout le reste est peint, la **Norvège reste blanche** : 2019, la date la plus tardive, arrive en dernier — alors que la légende la donne à 99 % |

**Porteur `space`** — aucune colonne ajoutée : les centroïdes viennent de la géométrie
(`regionBounds`, la boîte même que cadre la caméra des beats). Cap 90° par défaut, ouest→est.

| frame | ce qu'on voit |
|---|---|
| `space-early.png` (260) | la caméra est sur la **Norvège** et la Norvège est blanche ; seul le **Royaume-Uni**, à l'ouest, est peint |
| `space-late.png` (815) | tout est peint sauf la **Pologne**, la plus à l'est |

Dans les deux cas la caméra suit toujours la marche de saillance (Norvège d'abord), et la
**peinture** suit le porteur — c'est exactement la séparation voulue : le porteur décide QUAND,
jamais COMMENT.

> ⚠️ **Le trou visible sur les deux frames « late » n'est pas le porteur** : la dernière marque
> (`__stop = 1`) n'atteint jamais son éclosion parce que la fenêtre du balayage de
> `ChoroplethStory` court encore jusqu'à `durationInFrames - 1` en s'arrêtant à 1. C'est le défaut
> que `sweep-schedule.ts` (lot B) corrige — `sweptFraction` va jusqu'à `1 + SWEEP_BLOOM` et la
> fenêtre se ferme une entrée complète avant la fin. `ChoroplethStory` reste à recâbler dessus ;
> le défaut est antérieur au lot A et commun aux cinq porteurs (visible aussi sous `threshold`,
> où c'est la valeur la plus basse qui ne s'allume pas).

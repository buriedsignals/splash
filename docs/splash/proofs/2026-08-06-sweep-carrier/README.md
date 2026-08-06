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

## Le même dispositif sur les autres types de carte (lot B)

Deux vrais mp4 de plus, `cameraMode: "guided-tour"`, rendus depuis les échantillons du skill.

**Symbole — porteur `threshold`** (`assets/sample-data/symbol.json`, 948 frames) : six villes,
financement en $bn. Le porteur descend du plus élevé au plus bas ; chaque point fait son entrée
échelonnée (cercle qui grandit, opacité, étiquette) à SON passage, pas à celui de son beat.

| frame | ce qu'on voit |
|---|---|
| `symbol-threshold-1-highest-alone.png` (130) | **Londres seule** (296) — les cinq autres villes sont noires |
| `symbol-threshold-2-five-in-lowest-dark.png` (880) | Londres, Paris, Madrid, Berlin pleins ; **Rome (67) en cours d'entrée** ; Amsterdam (52, la plus basse) toujours absente |
| `symbol-threshold-3-all-six.png` (946) | **les six**, Amsterdam comprise : la fenêtre du balayage se ferme une entrée complète avant la dernière frame, donc la marque atteinte en dernier a le temps de fleurir |

**Locator — porteur `space`** (`assets/sample-data/locator-few.json`, 948 frames) : cinq sites
parisiens, aucune valeur numérique. Le porteur balaie d'ouest en est (cap 90° par défaut).

| frame | ce qu'on voit |
|---|---|
| `locator-space-1-westernmost-alone.png` (140) | **Tour Eiffel / Trocadéro seule** — le point le plus à l'ouest |
| `locator-space-2-second-entering.png` (450) | le **Pont Alexandre III** entre à son tour ; les trois sites à l'est restent noirs |
| `locator-space-3-all-five.png` (946) | les cinq, **Pont d'Austerlitz** (le plus à l'est) en dernier |

`threshold` sur un locator n'aurait rien donné — ses marqueurs ne portent aucune valeur, et le
cœur pose alors chaque marque à la FIN plutôt que d'inventer un rang. C'est pour ça que la preuve
du locator est faite avec `space` : le porteur se lit dans la donnée, il ne se récite pas.

**Sans porteur, rien ne change** — vérifié mécaniquement, pas affirmé : le même `symbol.json`
(sans `sweepCarrier`) rendu sur le commit d'avant le lot et sur le lot donne le MÊME mp4,
`sha256 270323089e2959c65f2bb34146a1fd6cf4ce90e468bbb3b24ad41c985b64f492` des deux côtés.

# Plan — le porteur du balayage

Spec : `docs/superpowers/specs/2026-08-06-the-sweep-carrier-design.md`.
Branche : `feat/sweep-carriers`.

## Fait (2026-08-06)

- **Tâche 1 — le cœur pur** : `skills/map-native/src/sweep-carrier.ts` — `CarrierKind`,
  `SweepMark`, `carriersFor()` (dérivé de la donnée), `whyNotOffered()`, `sweepStops()` pour les
  cinq porteurs. 10 tests.
- **Tâche 2 — le choroplèthe balaie** : `ChoroplethStory` accepte `sweepCarrier`, cuit `__stop` sur
  chaque feature, et peint par UNE expression data-driven. Sans `sweepCarrier`, chemin inchangé.
- **Preuve rendue** : `threshold` sur le choroplèthe européen (aucune route dans le sujet) — la
  Norvège seule d'abord, puis la Suède quand le seuil descend à 68 %.

## Reste

### Lot A — les deux porteurs dérivables qui manquent au choroplèthe
`time` et `space` sont écrits dans le cœur mais le choroplèthe ne leur donne pas de quoi lire :
`sweepMarks` ne porte que `name` + `value`. Threader un champ temporel déclaré (`timeField`) et
le centroïde de chaque région (déjà calculé pour les caméras). Preuve rendue par porteur.

### Lot B — les cinq autres types de carte
`SymbolStory`, `LocatorStory`, `DotDensityStory`, `CartogramStory`, `HexGridStory` : même couture
(`__stop` cuit + expression data-driven), en réutilisant `stagedEntrance` là où le composant l'a
déjà. Un test de couverture pin QUI balaie et pourquoi les autres non.

### Lot C — le porteur est proposé, pas deviné
`carriersFor` exposé par `lib/host/cli.ts` (sœur de `narrative-kinds`), et la prose de
`splash-proposition` propose le porteur une fois la vidéo carte épinglée : la liste vient de la
requête, la recommandation du récit. Un porteur non offert est expliqué, jamais tu.

## Contraintes qui valent pour les trois lots

- **Sans porteur, rien ne change** — l'invariant qui rend le lot sûr.
- **Ce qui est offert est LU de la donnée.**
- **Une marque non plaçable atterrit à la fin**, jamais au début.
- **Une affirmation visuelle non rendue n'est pas une affirmation** : chaque lot finit sur des
  frames extraites d'un vrai mp4.

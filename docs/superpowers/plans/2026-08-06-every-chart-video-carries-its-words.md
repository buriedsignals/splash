# Plan — toute vidéo de graphique porte les mots de sa marche

Spec : `docs/superpowers/specs/2026-08-06-every-chart-video-carries-its-words-design.md`.
Branche : `feat/chart-video-walk-everywhere`.

## Contraintes globales

- **Sans marche, rien ne change** — 41 fichiers touchés, un seul invariant les rend sûrs.
- **Le grain est dit** au journaliste, jamais supposé.
- **Une ancre non honorable est refusée fort.**
- **Chaque garde doit être vu rougir**, mutation vérifiée comme atterrie.
- **Une affirmation visuelle non rendue n'est pas une affirmation.**

## Tâche 1 — le registre des marches, et il couvre les 41

`skills/chart-native/src/core/chart-walk.ts`. Pour chaque type : son **grain** (`anchored` /
`sequenced`), son **champ d'ancre** quand il en a un (`catField`, `labelField`, `xField`), son
**calendrier d'entrée** (`start`, `step`, `span`) quand il est ancré, et s'il **réordonne**
(`bar` seul).

RED : les 41 types du registre Remotion sont couverts, aucun de plus ; `bar` est ancré+réordonnant ;
`pie` est séquencé ; un type inconnu est une erreur, pas un défaut silencieux.

## Tâche 2 — le calendrier est LU du composant

Test de dérive : pour chaque type ancré, lire le `stagger(p, …)` de son composant et comparer aux
nombres du registre. Un composant retouché sans son registre rougit.

RED : muter un `stagger` d'un composant → le test nomme le type.

## Tâche 3 — la légende sait les deux grains

`core/walk.ts` : `captionAt` généralisé. Ancré (avec ou sans réordonnancement) = la fenêtre du beat
s'ouvre quand SON sujet entre. Séquencé = N segments égaux sur la progression, un par beat.
Signature explicite plutôt qu'un devinage : le grain vient du registre.

RED : sur un séquencé à 3 beats, le beat 2 est à l'écran au tiers du temps ; sur un ancré
non-réordonnant, la fenêtre suit l'index de données, pas la permutation.

## Tâche 4 — les 41 enveloppes passent par la scène

`RevealStage` sur chaque `*Reveal.tsx`, avec le descripteur du type. Un test de couverture pin que
**les 41** y passent — plus de liste « qui porte des mots et qui non ».

RED : sans `beats`, le DOM rendu est celui d'avant (l'invariant) ; avec, la phrase est là.

## Tâche 5 — la validation accepte les beats de tous, et refuse ce qu'elle ne peut honorer

`chart-story.ts` : `narrativeBeatErrors` connaît la surface (scrolly / vidéo). Vidéo ⇒ tous les
types ; ancre validée fort sur un type ancré ; ancre **refusée** sur un séquencé. Scrolly ⇒ liste
inchangée (`line`, `bar`).

RED : un `stacked-bar` vidéo avec beats ancrés passe ; un `pie` vidéo avec `category` est refusé en
disant pourquoi ; un `stacked-bar` **scrolly** avec beats reste refusé comme avant.

## Tâche 6 — le garde et l'offre s'ouvrent, ensemble

`WALK_CAPABLE_CHART_TYPES` dérivé du registre (donc : tous). `narrativeKindsFor` offre
`stepped`+`reveal` pour tout type de graphique, et son `why` dit le grain. Le balayage
offre↔garde de `narrative-kinds.test.ts` couvre désormais les deux grains.

RED : un `pie` vidéo offre deux genres ; choisi `stepped` sans marche, il est refusé.

## Tâche 7 — la preuve au rendu

Deux mp4 réels, frames extraites **aux frontières de beats** (jamais le still de revue) :
un **ancré non-bar** (lollipop ou stacked-bar) et un **séquencé** (pie ou sankey). Ce qu'il faut
voir : la phrase du beat 1, puis celle du beat 2, lisibles, hors de la ligne de source.

## Tâche 8 — gate, prose, revue

`bun run check` machine calme. `splash-proposition` : le grain fait partie de ce qui est dit au
journaliste. Revue finale ciblée sur l'invariant « sans marche, rien ne change » à travers les 41.

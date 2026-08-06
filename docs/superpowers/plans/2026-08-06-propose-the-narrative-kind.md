# Plan — proposer le genre narratif

Spec : `docs/superpowers/specs/2026-08-06-the-narrative-kind-is-proposed-design.md`.
Branche : `feat/narrative-kind-proposed`.

## ★ La conséquence que la spec impose et qu'il faut traiter en premier

Le garde de marche exige aujourd'hui un storyboard pour **toute** vidéo de barres. Sous la règle
nouvelle, c'est faux : un journaliste peut légitimement choisir `reveal` pour un graphique — une
animation de données sans mots — et il ne doit alors rien écrire.

**Donc le genre choisi doit voyager avec la proposition.** Sans lui, le garde ne peut que deviner :
soit il exige toujours (et force à écrire pour un reveal), soit il n'exige jamais (et le storyboard
redevient facultatif, ce qu'on vient de fermer). C'est le cœur de ce lot, pas un détail de
plomberie.

## Contraintes globales

- **Aucun défaut silencieux.** Ne pas répondre n'est pas une réponse ; le genre absent est une
  question ouverte, jamais un choix supposé.
- **Ce qui est proposé est LU du registre.** La leçon du 2026-08-06 : une capacité récitée est
  fausse tôt ou tard, et un refus est crédible — donc il meurt sans bruit.
- **`reveal` ne demande jamais de storyboard**, et le journaliste doit savoir en le choisissant
  qu'il renonce aux mots à l'écran.
- **Sans genre ni marche, rien ne change** — un run d'hier reprend, une production sans marche rend
  à l'octet ce qu'elle rendait.
- **Chaque garde doit être vu rougir**, mutation vérifiée comme atterrie.

## Tâche 1 — quels genres ce type rend, réellement

`skills/splash/src/narrative-kinds.ts`. Pure : `narrativeKindsFor(producer, nativeType)` rend la
liste des genres **rendus** pour ce type, chacun avec ce qu'il porte, s'il demande un storyboard,
et la phrase à dire au journaliste.

Lue du registre et des listes déjà déclarées (`ProducerManifest`, `WALK_REACHES_READER`,
`WALK_CAPABLE_CHART_TYPES`) — **jamais une quatrième liste**. Une carte rend trois genres ; un
graphique en rend deux (pas de caméra, pas de `story`) ; un type qui ne peut porter aucune marche
n'en rend qu'un, `reveal`, et le dit.

RED : une carte choroplèthe rend `story`/`stepped`/`reveal` ; un `bar` rend `stepped`/`reveal` ;
un `pie` ne rend que `reveal`, avec sa raison. Mutation : retirer un genre du registre → rougit.

## Tâche 2 — la question est posable

`lib/host/cli.ts narrative-kinds --producer <p> --type <t>`, sœur de `can-carry-walk` : lecture
seule, sans `--run`, interrogeable au tour exact où la proposition se compose.

RED : la sortie JSON liste les genres et, pour chacun, `owesStoryboard`.

## Tâche 3 — le genre choisi voyage, et le garde le lit

Le genre retenu se pose sur la proposition (`narrativeKind`), pour les DEUX pistes. Côté carte il
se traduit en `cameraMode` (le champ que les moteurs lisent déjà) ; côté graphique il est le seul
porteur, puisque rien d'autre ne distingue les deux genres.

`narrativeWalkError` exige alors une marche **si et seulement si le genre narre**. Un genre absent
est une question ouverte : refuser en le nommant vaut mieux que supposer — et c'est la règle « pas
de défaut silencieux » rendue mécanique.

RED : un graphique vidéo `reveal` ne doit rien ; le même en `stepped` sans marche est refusé ; une
carte vidéo sans genre est refusée en demandant lequel.

## Tâche 4 — la prose propose, et ne récite pas

`splash-proposition` : une fois la vidéo épinglée, **proposer les genres** — leur liste vient de la
requête, la recommandation vient de l'histoire et de la donnée. Dire ce que chacun donne et ce
qu'il coûte, y compris que `reveal` n'affiche aucun mot.

Enchaîner : `story`/`stepped` → le storyboard est proposé dans la foulée (§ déjà écrit) ; `reveal`
→ on produit, et on le dit.

## Tâche 5 — gate, et un run réel

`bun run check` machine calme. Puis un vrai `/using-splash` sur un article de Rémy : la question du
genre doit apparaître après le choix de la vidéo, et le storyboard ne doit suivre que si le genre
narre. C'est le seul contrôle qui a jamais dit la vérité sur cette chaîne — trois sessions sur
trois l'ont prouvé.

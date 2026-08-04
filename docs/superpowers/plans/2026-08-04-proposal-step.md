# Plan — sous-projet ③, l'étape de proposition

Spec : `docs/superpowers/specs/2026-08-04-proposal-step-design.md`. Branche : `feat/proposal-step`.

## Contraintes globales

- **Aucun champ neuf requis** — les runs d'hier reprennent. Aucun garde n'exige un champ que rien
  n'écrit encore.
- **`draftText` n'est jamais promu en `text`** — le verrou `unauthoredBeats` reste le seul verrou.
- **Une seule réponse pour le routeur et le drafter** (`canDraftBeats`) — jamais deux listes.
- **Chaque garde doit être vu rougir**, mutation vérifiée comme atterrie (`git diff --stat`) avant
  d'être crue.
- Périmètre : `choropleth`, `symbol`, `locator`, `cartogram`, `dot-density` — **jamais** `route`,
  `hex-grid`, ni le track chart en `video`.

## Tâche 1 — le cerveau sait proposer une marche de carte

`lib/brain/beats.ts`. `suggestBeats` accepte les cinq types carto : la première colonne est la clé
de région, la dernière numérique la valeur ; les ancres saillantes se choisissent comme
`barAnchorIndices` (les trois têtes + la queue) ; `anchor.kind = "region"` ; `draftText` reste
factuel (`« Genève — 1780 CHF »`) ; `beatSource` réutilise `sharedFacts` **tel quel**.

RED : un type carto refusé aujourd'hui doit rendre une marche à ≥ 3 beats, ancres `region`.
Mutation : retirer les types carto de la liste → le test rougit en nommant le type.

## Tâche 2 — le pont : une marche unifiée atteint le moteur carte

`lib/core/production-brief.ts`, `lib/loop/assemble/brief.ts`, `lib/loop/assemble/map-native.ts`.
Aujourd'hui `arcBeats` a **zéro occurrence dans `lib/`** : la marche du journaliste ne peut pas
atteindre une carte par la boucle. `beatsFor` **jette** sur une ancre `region`/`place`
(`brief.ts:20`), en nommant ③ comme celui qui doit la rendre atteignable.

Le brief porte la marche de carte ; `beatsFor` projette `{anchor.value, role, text}` →
`{region, role, text}` sans inventer ; `assembleMapNative` émet `arcBeats` dans le spec.
Le refus de `beatsFor` **reste** pour le track chart (une ancre `region` n'a toujours pas de champ
`BriefBeat` où aller).

RED : un élément carte avec une marche confirmée produit un spec portant `arcBeats` ; retirer
l'émission → rougit.

## Tâche 3 — le routeur ouvre la carte, en scrolly ET en vidéo

`lib/brain/beats.ts` (`canDraftBeats` devient `(nativeType, format)`), `lib/loop/manifest.ts:862`.
Le routage cesse d'être `format === "scrolly"` seul : une carte narrative (scrolly ou vidéo) est
routée à `draft-beats`, donc gardée par `author-beats`. Le track chart en `video` reste **fermé**,
et le commentaire nomme ④ comme celui qui l'ouvrira — les 7 `*Reveal` ignorent les beats, proposer
y ferait écrire pour rien.

RED : une carte choroplèthe en vidéo sans marche répond `draft-beats` ; le même élément en
`interactive` ne l'est pas ; un chart en vidéo ne l'est pas.

## Tâche 4 — le beat porte son mouvement, validé contre le moteur qui rendra

`lib/brain/beats.ts` (proposition), `lib/loop/produce.ts` (revalidation). La marche proposée ne
compose que dans le vocabulaire déclaré (①) ; `beatMotionErrors(beat, {engine, nativeType, format})`
— premier appelant de `lib/core/beat-motion.ts` — revalide avant production et **refuse en nommant
l'alternative**.

RED : un beat portant un geste hors vocabulaire refuse au produce, avec le nom du geste et la liste
de ce que le type déclare. Mutation : retirer l'appel → rougit.

## Tâche 5 — gate et revue

`bun run check` machine calme, les rouges connus nommés d'avance (`eligibility`, `DRIFT 2`, plus les
3 causés par le `NEWSROOM-PROFILE.md` non suivi de `splash-merge`). Revue finale ciblée sur les
coutures : ce que ③ livre à ④ est-il appelable par ④ ?

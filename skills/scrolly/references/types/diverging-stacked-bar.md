# Diverging stacked bar (Likert) — scrolly

**Argues:** A diverging stacked bar answers "how did opinion split, for many items at once, when the response scale itself has a neutral middle" — a survey's strongly-disagree-to-strongly-agree results, one row per question, segments stacked outward from a shared centre instead of from a shared zero.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the two-sided stack is set against the shared centre
- **Filter** — the segment the claim is about keeps its ink
- **Name** — a segment's share is named once isolated
- **Pull back** — the whole stack returns, every segment still legible

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- let the neutral-centre category silently vanish instead of naming why it split at zero

## Precision to assert
- segment shares sum to the same asserted total in every card

## Devices the worked example implements
- **One row opens into a sub-layout** — the subject row's `compare` field splits it into two lanes (nuclear above, the other two camps laid end to end below it from the same start), the row climbing to the first slot while every other row steps back. Use when one row's own composition needs a beat of its own without leaving the shared chart.

## Worked example
`proof/scrolly-diverging-stacked-electricity/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedDivergingStackScrolly.tsx` (the marks) and `diverging-stack-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type diverging-stacked-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/diverging-stacked-bar.md` (read-only, other worktree) and its `proof/video-diverging-stacked-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

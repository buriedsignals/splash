# Grouped bar — scrolly

**Argues:** A small number of series placed side by side within each category, so a reader can make two comparisons off one chart: within a group (this series here against that one, same category) and across groups (this series here against itself over there, a different category).

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the grouped bars within one category are set against each other
- **Reorder / re-sort** — groups settle into the order that answers the question
- **Name** — a bar's value is named once reached
- **Pull back** — every group stands together

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- one shared value scale from zero across every card and every group

## Devices the worked example implements
- **Pair collapses into a signed difference bar** — two grouped bars (`wind`, `solar`) collapse into ONE bar either side of zero (`gap`), coloured by whichever source leads — the group's own re-encode from "two values side by side" to "one signed difference," the same family as the diverging-bar's level-to-change morph.
- **Ghost of a prior year, dashed** — the previous year's same computed value (its own `gap`) is drawn as a dashed outline behind the current bar, its value written (`ghost`). Compare the dumbbell worked example's identical device.

## Worked example
`proof/scrolly-wind-vs-solar/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedWindSolarScrolly.tsx` (the marks) and `windsolar-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type grouped-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/grouped-bar.md` (read-only, other worktree) and its `proof/video-grouped-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

# Bullet — scrolly

**Argues:** A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a single bar grows from zero to the actual value, a tick mark shows the target it was measured against, and a neutral backdrop can carry qualitative zones (poor / ok / good) behind the bar.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the measure bar and its target/qualitative bands are set against each other
- **Count up** — the measure's value climbs to its bar's length
- **Name** — the target and the measure are named once reached
- **Pull back** — every bullet in the set stands together

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the target marker's position is computed from the same data as the bar, asserted equal
- qualitative bands keep a fixed, asserted order across every card

## Devices the worked example implements
- **Zoom as a domain, not a stretch** — every bar length is recomputed as `(value − lo) / (ceiling − lo)`, `lo` travelling from 0 to the zoom's own start — never a scale transform on a fixed-domain bar. A value that falls under the new floor has no length at all and its row steps back, rather than being visually clipped.
- **Measured reorder** — the row pitch is read on every resize, and each row's name, track and value travel together from their starting order to their sorted place (`bullet-drive.mjs`'s own `reorder`), so the reorder is exact in the reader's own pixels at any width, not an assumed constant offset.

## Worked example
`proof/scrolly-bullet-low-carbon-share/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBulletScrolly.tsx` (the marks) and `bullet-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type bullet --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/bullet.md` (read-only, other worktree) and its `proof/video-bullet-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

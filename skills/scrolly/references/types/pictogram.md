# Pictogram (isotype) — scrolly

**Argues:** A pictogram states a magnitude as a countable row of equal-size icons, where ONE icon always stands for a stated number of units and count — never icon size — carries the value.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — icons fill one by one or in grouped ranks
- **Count up** — a figure climbs as icons appear
- **Compare** — two icon counts are set side by side
- **Name** — the counted total is named

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- one icon always equals the same asserted unit value across every card

## Devices the worked example implements
- **Position-mode / count-mode re-encode** — `mode` re-encodes the same squares from a position on a 0–100% axis (each stacked in its share's column, a crowd reading as a tower) to a counted block, rather than replacing one picture with another. The pictogram's own instance of the count↔weight family (compare the dot-density and the hex-grid worked examples).
- **Largest-square rung selection** — a block's own row width is picked from a fixed ladder of rungs (20/16/13/10/8 icons per row) — whichever rung gives the LARGEST icon for that block's own count, rather than one fixed row width for every block.

## Worked example
`proof/scrolly-pictogram-europe-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedPictogramScrolly.tsx` (the marks) and `pictogram-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type pictogram --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/pictogram.md` (read-only, other worktree) and its `proof/video-pictogram-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

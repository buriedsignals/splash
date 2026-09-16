# Marimekko (mosaic plot) — scrolly

**Argues:** A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's share of the grand total, and the segments stacked inside each column encode that group's own internal composition — so a single cell's AREA is the joint share, group-size × internal-split, in one glance.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Filter** — the tile or column the claim is about keeps its ink
- **Compare** — two tiles or columns are set against each other
- **Zoom / focus** — a narrow tile grows to print its own share
- **Name** — a tile's value is named once isolated

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- both axes (column width and tile height) stay proportional to their own asserted totals in every card

## Worked example
`proof/scrolly-marimekko-electricity-mix/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedMarimekkoScrolly.tsx` (the marks) and `marimekko-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type marimekko --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/marimekko.md` (read-only, other worktree) and its `proof/video-marimekko-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

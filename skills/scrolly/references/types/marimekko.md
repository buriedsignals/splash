# Marimekko (mosaic plot) — scrolly

**Argues:** A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's share of the grand total, and the segments stacked inside each column encode that group's own internal composition — so a single cell's AREA is the joint share, group-size × internal-split, in one glance.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Filter** — the tile or column the claim is about keeps its ink
- **Compare** — two tiles or columns are set against each other
- **Zoom / focus** — a narrow tile grows to print its own share
- **Name** — a tile's value is named once isolated

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- both axes (column width and tile height) stay proportional to their own asserted totals in every card

## Devices the worked example implements
- **Area kept when bands regroup** — the tracked source's bands leave their own columns for ONE gathered column (`stack`); the gathered column's WIDTH is set to the tracked share of the whole plot, so its height is the plot's own full height and one TWh still draws the same area it did split across columns. The honesty check this type's own regroup gesture needs — a naive regroup that keeps width fixed and only grows height silently lies about area.

## Worked example
`proof/scrolly-marimekko-electricity-mix/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedMarimekkoScrolly.tsx` (the marks) and `marimekko-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type marimekko --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/marimekko.md` (read-only, other worktree) and its `proof/video-marimekko-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

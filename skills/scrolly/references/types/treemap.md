# Treemap — scrolly

**Argues:** A treemap answers "how does a total break down, when the pieces ALSO belong to groups worth keeping together" — area encodes each item's value, and items sharing a group are laid out as contiguous tiles, so the group itself reads as a visible region of the frame, not just a shared colour scattered across the page.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Zoom / focus** — one tile grows to fill the frame, printing its own children
- **Filter** — the branch the claim is about keeps its ink
- **Name** — a tile's value is named once isolated
- **Pull back** — the whole treemap stands, named tiles still marked

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- tile area stays proportional to the same asserted value in every card, including during a zoom

## Devices the worked example implements
- **Squarified layout** (Bruls, Huizing & van Wijk) — `squarify` in `treemap-drive.mjs` keeps cells in each row as near square as the running total allows, because a sliver reads as a shape whose area cannot be judged; this is the type's OWN mechanism, not an optional add-on — read it before changing how cells are laid out.
- **Text degrades basis first, value last** — a shrinking cell gives up its content in a fixed order (basis, then subject, then value), so the LAST thing a reader loses is the number itself — a general graceful-degrade rule for any label whose box shrinks with its own mark.

## Worked example
`proof/scrolly-treemap-europe-capacity/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedTreemapScrolly.tsx` (the marks) and `treemap-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type treemap --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/treemap.md` (read-only, other worktree) and its `proof/video-treemap-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.

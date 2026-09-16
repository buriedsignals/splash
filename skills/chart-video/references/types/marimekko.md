# Marimekko — in video

**Argues:** A Marimekko shows two nested part-to-whole proportions at once: column WIDTH encodes each group's share of the grand total, and the segments stacked inside each column encode that group's own internal composition — so a single cell's AREA is the joint share, group-size × internal-split, in one glance.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-marimekko-electricity-mix` (2026-09-15), from `proof/static-marimekko-electricity-mix`.

- **A band is an area, so start from the whole**: one block as wide as the total, its figure under it, parts into the columns as
  the gaps open — no width changes (one px per unit); names over, totals under their braces.
- **Fill in order**: column after column the bands grow up from the foot (linear), the tracked band first, so its place is fixed.
- **Pour the tracked band out, area kept**: the rest steps back; each tracked cell drops out of its column (its hole stays) and
  reshapes into its slot of one strip under the plot, height eased, width always area ÷ height. The strip spans the whole
  width, so its height is the band's share of all columns and its pieces are each column's share of the band; name the pieces
  that carry it. Reserve the strip's room under the plot by measurement (the totals and credit are off screen while it is).
- **End on the whole chart**: the pieces fly back into their holes, everything returns, the decisive cells ringed; credit on one line.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — split** — the grand total is one neutral block carrying its value; gaps open and it parts into the columns, widths kept, the names and per-column totals arriving
- **`reveal` — reveal in order** — column after column the bands grow up from the foot, linearly, in a fixed source order
- **`subject` — filter + pour** — every band but the subject steps back, and each subject cell DROPS out of its column leaving its hole and reshapes — AREA KEPT — into one strip tiled in column order, so the joint share becomes a single readable length
- **`conclusion` — pull back + name** — each piece flies back into its own hole, area kept, and the cells the claim names are ringed; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-print-share-inside` — print a share inside a cell — the cell's area IS the share, and a number in it invites reading the height as the value
- `no-reshape-cell-conserving` — reshape a cell without conserving its area: the pour is only honest if every frame of it holds the same area

## Precision to assert
- column width is on one unit-per-value scale and band height a share of the same 100 %, so a cell's area is the quantity, in every shot
- each poured piece's area equals its cell's, asserted frame by frame, and the strip's height is the asserted overall share
- the narrowest column stays wide enough to encode its width legibly, measured rather than assumed

## Devices the worked example implements
- **The area-conserving pour** — cells leave their columns and tile into one strip, which is the only way the joint share is directly comparable (`states.mjs`)
- **Holes left behind** — the emptied cells stay visible, so the pour reads as a move rather than a redraw (`MarimekkoFrame.tsx`)
- **Totals on braces under the columns** — width is given a number once, not per cell (`build.mjs`)

## Worked example
`proof/video-marimekko-electricity-mix/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type marimekko --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

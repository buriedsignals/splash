# Area — in video

**Argues:** A single-series area chart is a line chart with the space beneath it filled.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-area-swiss-co2` (validated 2026-09-15), from `proof/static-area-swiss-co2`.

- **The fill** comes first: the surface advances through time, linear in years, closed on zero — its surface is the
  stock — while the running total counts up; every total's text is measured in Bun.
- **The argument looks for the half**: the surface steps back to its tint and a rule sweeps back from the last year,
  linear in years, repainting the recent surface in the accent. The stock's gauge — a bar under the total, its half
  marked — fills from its right with the share the rule has passed, slice by slice, and the rule lands on the midpoint.
- **Then it flattens**: each half's top levels to its mean height, the curve turning into two blocks of the same surface
  (a polygon's surface is linear in its heights, so every frame of the move is honest), each named inside with its years
  and its length. The means are computed from the drawn outline and asserted to hold its surface.
- **The last shot is the whole curve**: the blocks sink back, the names ride to their seats inside the curve, the rule
  and the gauge stay.
- The years are asserted consecutive before anything is drawn: an area closes silently over a gap. The stock and its
  gauge stand in the empty upper left, under the top gridline; the credit sits on one line under the years.

## Shot gestures
- **`establish` — title card, 1.5 s** — the eyebrow and a short title alone on the ground, its window closed before frame 0
- **`reference` — furniture** — the value ticks and the year axis, zero-based, before any surface exists
- **`reveal` — fill + count up** — the surface advances year by year, LINEAR in years, while the running stock climbs beside it
- **`subject` — sweep + measure** — a rule travels back from the last year repainting the recent surface in the accent, a gauge filling with the share it has passed, and stops on the year that halves the stock
- **`conclusion` — flatten, then pull back** — each half levels to its mean so the curve becomes two blocks of equal surface, named by their spans, then rises back into the whole curve; the credit on one line
- **`hold` — ≈60 frames** — nothing moves; the state equals the conclusion exactly. The beat runs about 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- fill an area across a gap in the series — an area drawn over unreported years measures years nobody reported
- lift the surface off zero for any shot: the surface IS the stock, so a floated baseline changes the quantity being claimed

## Precision to assert
- the years are asserted consecutive before a single frame is drawn
- every outline in the flatten holds the same surface as the curve it replaces (a polygon's surface is linear in its points' heights), so the motion itself is honest
- the midpoint year, the later share and the two spans are computed in the runner and refused there if the frozen file stops supporting them

## Devices the worked example implements
- **The travelling rule with a gauge** — one cursor carries both the year and the share it has passed, so the count and the picture can never disagree (`states.mjs`, drawn in `AreaFrame.tsx`)
- **The equal-surface flatten** — each half's top is levelled to its own mean, checked equal in surface to the curve it stands for (`states.mjs`)
- **Linear years** — the fill's progress is `fieldAt` with easing refused, so 1994 and 1995 occupy the same screen time (`scene.mjs`)

## Worked example
`proof/video-area-swiss-co2/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type area --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

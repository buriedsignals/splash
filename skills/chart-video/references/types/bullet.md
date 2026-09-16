# Bullet — in video

**Argues:** A bullet chart answers "did this hit its target" for one or more measures, each on its own row: a single bar grows from zero to the actual value, a tick mark shows the target it was measured against, and a neutral backdrop can carry qualitative zones (poor / ok / good) behind the bar.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-bullet-low-carbon-share` (validated 2026-09-15, recut as an argument), from
`proof/static-bullet-low-carbon-share`.

- **A share is a frontier inside a whole**: each row is one bar for the whole to 100 % — the earlier share in the pale tint,
  the rest in a neutral — and at the later date the frontier moves, the part gained filling in the saturated hue while the
  rest recedes, each gain counting in a column of its own. A key of three swatches says which part is which.
- **Re-sort in front of the viewer**: the rows start in the earlier order and re-sort by gain as an insertion computed in
  Bun — one row at a time climbs to its slot over the rows it passes (drawn over them, words haloed); a step that moves
  nothing is not a step.
- **End on the whole chart**: a reference line (« la moitié ») drops through it and the row the title names is ringed;
  nothing steps back. Credit on one line; about 18 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal** — every row extends to its full whole (100 %), split into the part already held and the rest, in the ORIGINAL order
- **`reveal` — move the frontier + count** — row after row the boundary between the two parts travels to its later position, the gained part filling in behind it, and each gain counts up in points
- **`subject` — reorder** — an insertion sort plays out: one row at a time climbs over the rows it passes into the order of gain
- **`conclusion` — reference line + name** — the target rule drops through the whole chart at once and the row that fails it is ringed alone; the credit on one line
- **`hold` — ≈60 frames**. About 18 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-qualitative-bands` — let the qualitative bands change order or width between shots — the backdrop is the constant the bar is judged against
- `no-let-target-arrive` — let the target arrive before the values it judges: dropping the rule last is what makes the single failure readable

## Precision to assert
- the target marker's position is computed from the same data as the bar and asserted equal to it
- each row's parts sum to the same asserted whole in every shot
- the final order is the asserted order of gain, reached by a sort the viewer watches rather than a cut

## Devices the worked example implements
- **The moving frontier** — a share is shown as a boundary travelling inside a fixed whole, not as a bar growing (`states.mjs`)
- **Watched insertion sort** — the reorder is played step by step so the ranking is earned on screen (`states.mjs`, `BulletFrame.tsx`)
- **The late reference rule** — one line dropped across every row at the conclusion, which is the whole claim (`BulletFrame.tsx`)

## Worked example
`proof/video-bullet-low-carbon-share/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type bullet --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

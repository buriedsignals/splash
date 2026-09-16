# Bar and column — in video

**Argues:** One value per category, encoded as the LENGTH of a rectangle from a shared baseline.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-bar-top-emitters-2024` (validated 2026-09-14, recut as an argument), from
`proof/static-bar-top-emitters-2024`.

- **Columns only when every name holds in two lines of its slot; rows otherwise** — the scrolly's own rule, measured.
- **Start from the whole the ranking is cut from**: the total as one bar on the first row, the ranked members marked inside
  it end to end, the first already in place; the others fall out into the rows below keeping their lengths, then the camera
  closes the scale (geometrically) until the first fills the row and the rest of the whole runs out of the frame. No row is
  spent on the whole alone.
- **Do the arithmetic with the bars**: the members the claim adds up line up end to end under the first, their sum
  counting; the first's end dropped as a dashed line that stops above them. A seam of the ground is taken out of a block,
  never added. A derived comparison can be shown the same way — the next member slid into the gap, and fitting.
- **End on the whole chart**: every bar back in its row at its length, what was learned still marked (the members bracketed
  with their sum), the rest stepped back; the credit on one line.
- Every count carries the unit; every text a count passes through is measured in Bun, rounding edges included.

## Shot gestures
- **`establish` — title card, 1.5 s** — eyebrow and short title, alone on the ground
- **`reference` — reveal** — the WHOLE the ranking comes out of is drawn first as one bar, with the ranked members marked inside it end to end
- **`reveal` — split + rescale** — the members fall out of that whole into their own rows, largest first, each KEEPING its length; the scale then closes until the leader fills the row, and each value lands at its bar's end
- **`subject` — reorder + count** — the bars the claim is about slide onto one row end to end and their sum counts up against the leader's dropped end line; the rest step back
- **`conclusion` — compare + pull back** — the test bar slides into the remaining gap, then every bar returns to its row with the claim bracketed; the credit on one line
- **`hold` — ≈60 frames** — the state equals the conclusion. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-float-baseline-rescale` — float the baseline or rescale between two shots that are being compared — length is the encoding, so one scale holds across the whole beat
- `no-draw-columns-name` — draw columns when a name cannot hold one line of its slot: the corpus turns to rows rather than truncating a category

## Precision to assert
- one value scale from zero for every shot
- a regrouped bar's length is a real computed sum, asserted in the runner, never a visual approximation
- the search behind the headline (how many members it takes to pass the leader) is derived and asserted, not counted by eye

## Devices the worked example implements
- **The world-down split** — the ranking is shown as a partition of a stated whole before it is shown as rows, so the reader sees where the numbers come from (`states.mjs`)
- **Length-preserving fall-out** — each member keeps its drawn length through the split, so the rescale is the only thing that changes size (`scene.mjs`, `BarFrame.tsx`)
- **The dropped end line** — the leader's end becomes a dashed rule the sum is measured against, replacing a sentence (`BarFrame.tsx`)

## Worked example
`proof/video-bar-top-emitters-2024/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type bar-and-column --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

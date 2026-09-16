# Radar — in video

**Argues:** A radar chart plots several variables as axes radiating from a shared centre, each on the SAME radial scale, with one item's readings across all axes joined into a closed polygon — so the shape of that polygon is the read.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-radar-electricity-mix` (2026-09-16), from `proof/static-radar-electricity-mix`.

- **Start from the items' wholes as bars**: one bar per item on one absolute scale (TWh), growing at one speed, each stopping
  at its own total, seen magnified; the totals after them.
- **Make each bar its own denominator, then cut it**: the shorter bar stretches to the longer one's length — both now 100 %
  on the wheel's own px per % — and gaps cut both into the spokes' parts, in spoke order.
- **Carry the parts onto the wheel**: the camera pulls back as the rings come in; spoke after spoke, both items' parts swing
  onto their spoke side by side, inner end at the centre, length kept; a tip joins the one before only once both have landed,
  the spoke's name and values arriving with it.
- **End on the whole radar**: the outlines close and fill, the parts give way to the vertices, the claim's spoke values ringed,
  the names as the key in a corner; the credit on one line. 18,5 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — grow** — the compared items are first two BARS on one absolute scale, so the reader knows what the shares will be shares of
- **`reveal` — rescale + split** — the shorter bar stretches to the other's length (the denominator shown rather than written) and both are cut into their sources, at the spoke order
- **`subject` — pull back + carry + trace** — the camera pulls back as the rings and spokes fade in, and source after source each pair of parts SWINGS onto its spoke, inner end at the centre, length kept, thinning into the outline; a tip joins only a tip that has landed
- **`conclusion` — close + name** — both outlines close and fill, the parts give way to vertices, and the spoke the claim turns on is ringed; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-spoke-take` — let a spoke take its own scale — one radial scale for every spoke, or area stops meaning anything
- `no-reorder-spokes-nicer` — reorder the spokes for a nicer shape: the order is an editorial decision, made once and stated (here: by family, clockwise from twelve)

## Precision to assert
- every spoke keeps the same fixed scale, and a part's drawn length is its share × that scale at every frame of the swing
- the bars' pixels-per-percent equals the wheel's, so the rescale is the only denominator change in the beat
- an edge is drawn only between two landed tips, so no vertex is implied before its value exists

## Devices the worked example implements
- **Bars before spokes** — the polygon is constructed from lengths the reader has already accepted (`states.mjs`)
- **The stated rescale** — one ratio applied once, which is what converts absolutes into shares on screen (`states.mjs`)
- **Tip-to-tip closure** — the outline is built rather than drawn, so a spike can never precede its reading (`RadarFrame.tsx`)

## Worked example
`proof/video-radar-electricity-mix/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type radar --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

# Waterfall — in video

**Argues:** A waterfall chart shows how a starting total arrives at an ending total through a sequence of signed steps — a revenue build, a budget variance, an opening-to-closing balance.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-waterfall-germany-electricity-bridge` (2026-09-15), from `proof/static-germany-electricity-bridge`.

- **The steps are what separates two mixes, so start from the mixes**: the opening total grows from zero, a copy is carried to
  the closing slot; seams of the ground cut both into their members (named beside the opening while it is a mix), and the
  copy's members go to their closing lengths, its total counting — every counter text the stack's own height, measured.
- **Pull the change out of the bars**: in the order the bridge walks, the part the closing mix gained (the top of its member in
  the copy) and the parts the opening lost (the top of each fallen member) light up in the accent and slide, keeping their
  lengths, carried across at the height they left and then set onto the running total — no part crosses a slot another part
  or a written change holds. The names ride to their slots first; each change and its connector arrive as it lands.
- Stack the member the bridge walks first on top: its gain then sits where its step lands.
- **End on the whole waterfall**: the seams close, the net change traced between the totals' inner edges; the credit on one line.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal + carry** — the opening total grows from zero and a COPY of it slides across to the closing slot, so the two ends exist before any step does
- **`reveal` — split + morph + count** — seams cut both totals into their members and the copy's members travel to their closing lengths, the closing total counting as they do
- **`subject` — detach + slide** — the parts gained and the parts lost light up and slide, keeping their lengths, onto the running total, each landing exactly on its step's [from, to] with its connector: the steps are DERIVED from the two mixes rather than read from a list
- **`conclusion` — pull back + bracket** — the seams close, the totals are whole again and the net change is bracketed between them; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-draw-steps-were` — draw the steps as if they were readings — they are what separates two mixes, and the beat shows them being extracted from those mixes
- `no-let-bridge-stop` — let the bridge stop replaying: opening plus every step must equal the closing, checked to the stated precision, before a frame is drawn

## Precision to assert
- the running total after every step is asserted arithmetically consistent with the frozen data (opening + steps = closing, to the tenth)
- one scale from zero for the totals, the members and the steps
- each detached part lands exactly on its step's from/to, lengths preserved through the slide

## Devices the worked example implements
- **Two mixes, one bridge** — the steps are built out of the opening and closing compositions (`states.mjs`)
- **Carried copy of the opening** — the closing slot is occupied before it has a value, so nothing pops into existence (`states.mjs`)
- **Names that ride to their slots** — a member's label becomes a step's label, tying the two readings together (`WaterfallFrame.tsx`)

## Worked example
`proof/video-waterfall-germany-electricity-bridge/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type waterfall --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

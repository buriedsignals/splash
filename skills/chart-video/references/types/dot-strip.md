# Dot strip — in video

**Argues:** A dot strip lays one horizontal lane per category and marks every raw observation in that category as a dot positioned by its own value, with a small deterministic jitter and enough transparency that overlapping points still show through each other — plus one neutral tick per lane marking that category's mean.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-dot-strip-lowcarbon-spread` (2026-09-15), from `proof/static-dot-strip-lowcarbon-spread`.

- **Start from the first strip the viewer can read**: both rails on one scale from the first shot, the chips pinned on the
  earlier strip; floor first, a copy of each chip leaves its pin and travels to its later seat (two dates: an arrival,
  eased), its leader drawn behind it, its stem arriving as it lands. Chips stack into rows, never sideways.
- **Measure the field, then carry the measure**: the rest step back, the floor's and the ceiling's leaders thicken with their
  changes beside them (seated where no other leader passes); the earlier span traces along its rail (linear), then a copy
  slides onto the later rail pinned to the ceiling — a translation, its length kept — and the part past the new floor turns,
  the closure written over it.
- **End on both strips whole**: the overhang folds away, every chip back at full ink, the two spans left on their rails, the
  two changes on their leaders; the credit on one line. About 19 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — both lanes ruled on ONE scale, the ticks, the lane names, and the first lane's chips already pinned
- **`reveal` — trace** — floor first, a copy of each chip leaves its pin and travels to its seat in the second lane, its leader drawn behind it and its stem arriving as it lands
- **`subject` — filter + name + compare** — the others step back, the two extreme leaders thicken and carry their changes, and the first lane's SPAN is traced along its rail, then slid down onto the second rail as a translation that keeps its length: the overhang IS the closing
- **`conclusion` — pull back** — the overhang folds away, every chip returns at full ink; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-chip-colour` — let a chip's colour change between the lanes — a chip is the same category twice, and recolouring it makes it look like two
- `no-stack-chips-sideways` — stack chips sideways to fit: they stack into rows, because a sideways nudge is a value moved

## Precision to assert
- one scale for both lanes, over the full domain, in every shot
- the slid span's length equals the measured first-lane span, its far end pinned on the real later value, and the overhang equals the arithmetic difference of the two changes
- no two chips of a lane touch, checked at every frame of the travel

## Devices the worked example implements
- **The span as a movable object** — the spread is measured, lifted and laid on the other lane, so "the field closed" is a length a viewer can see (`states.mjs`)
- **Leaders joining a category to itself** — the only line on the plate, which is what stops the two lanes reading as two populations (`DotStripFrame.tsx`)
- **Linear span traversal** — the measured axis is swept linearly, never eased (`scene.mjs`)

## Worked example
`proof/video-dot-strip-lowcarbon-spread/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type dot-strip --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

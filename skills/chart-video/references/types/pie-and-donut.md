# Pie and donut — in video

**Argues:** A pie (or donut — same chart, a hole in the middle and a total in it) answers exactly one question: of a fixed whole, what share does each part hold, when there are few enough parts that the reader can hold all of them in view at once.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-donut-world-co2-share` (2026-09-15), from `proof/static-donut-world-co2-share`.

- **Start from the whole as one ring**: the world at the first date, its members' arcs laid end to end clockwise from
  twelve o'clock at their shares, traced in; the ring's circumference is the whole's absolute value on a px-per-unit scale.
- **Grow the whole to the second date on that scale**: a copy grows out of the first ring, its radius the new total, every
  member's arc its own absolute value in length at every frame — so the angles become the new shares while the viewer sees
  the whole grow (the trap of a share chart, shown rather than written). No number is written until it has landed.
- **Split the whole into its members**: one after another, each member's two arcs fly to their own ring in a row, the
  centre, radius and start travelling, the sweep never changing — one turn is the whole on every ring.
- **End on the small multiple**: every ring with its share in the hole, its name and both absolute values under it, the
  subject's number ringed; the credit on one line. 18 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — trace** — the first period's ring draws clockwise from twelve o'clock, arc after arc, its whole printed in the hole: one full turn IS the whole
- **`reveal` — grow** — a second ring grows out of the first with its radius proportional to the new total, every arc sliding to its new quantity on the SAME length-per-unit scale, so a share and an absolute change are visible at once
- **`subject` — split** — each member's two arcs fly off to their own small ring, keeping their ANGLES while the radius shrinks and the start turns back to twelve, landing in a row with the share in each hole
- **`conclusion` — name** — the subject's number is ringed; nothing of the world rings is left; the credit on one line
- **`hold` — ≈60 frames**. About 18 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-turn-mean` — let a turn mean something different on two rings — one full turn is the whole, on every ring, in every shot
- `no-change-arc-angle` — change an arc's angle while it is in flight: the split moves rings, it does not re-proportion them

## Precision to assert
- wedge angles sum to the same asserted whole (360°) on every ring
- the growing ring's circumference is the new total on one stated length-per-unit scale, and each arc's length is its own quantity at every frame
- the earlier period is drawn in a neutral MEASURED to be distinguishable from a tint of the accent, not assumed to be

## Devices the worked example implements
- **Circumference as a quantity** — the ring's size carries the total while its angles carry the shares, which is what lets one shot say both (`states.mjs`)
- **Angle-preserving split** — six small rings derived from one, so no reader has to trust that the shares survived (`DonutFrame.tsx`)
- **The hole as the label slot** — the total, then each share, printed where no arc can be crowded (`build.mjs`)

## Worked example
`proof/video-donut-world-co2-share/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type pie-and-donut --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

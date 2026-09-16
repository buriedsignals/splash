# Stacked bar — in video

**Argues:** Several series summed into one bar per category, so a single mark carries both the total (the bar's full length) and the composition (each segment's own length within it).

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-stacked-bar-lowcarbon-growth` (2026-09-15), from `proof/static-stacked-bar-lowcarbon-growth`.

- **Build the stack in the order it happened**: the earlier levels grow from zero in their own order, each number past its
  end once; then row after row the later part extends from the level's end, its count in a column of its own, the level's
  number giving way.
- **Measure a head start with copies**: copies of the small level lift off their bar and lay end to end along the large
  one, « ×5 » counting — asserted only when the copies end within 1 % of it, so the count is a picture and not a rounding.
- **Pull the change off the stack**: every added part slides to zero keeping its length, the levels stepping back, and the
  rows re-sort by it — the words give way while the rows cross.
- **End on the whole stack**: each part slides back onto its level, the two rows the title names ringed; the credit on one
  line; about 18,6 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order** — the base segments grow from zero in their original order, each carrying its number
- **`reveal` — stack + count** — row after row the second segment extends from the first's end and the increment counts up in its own column
- **`subject` — copies to a ratio → detach → reorder** — copies of the small base are laid end to end on the large one to state the starting ratio as a count, then every added part SLIDES OFF its level to zero keeping its length and the rows re-sort by it: the composition claim and the total claim are separated on screen
- **`conclusion` — pull back + name** — the parts slide back onto their levels and the two named categories are ringed; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-change-segment-order-between` — change the segment order between shots — bottom-to-top order is fixed, or two bars stop being comparable
- `no-compare-segments-share` — compare two segments that do not share a baseline without detaching them first: that is precisely the type's blind spot, and the detach is the fix

## Precision to assert
- one zero-based scale for the levels, the increments and every copy
- shares sum to the same asserted total in every shot, and a detached part keeps its length exactly
- the ratio counted in copies is rounded by a stated rule, and its end is asserted within a stated tolerance of the compared length

## Devices the worked example implements
- **Detach-to-zero** — the stacked segment is brought to a shared baseline so it can be ranked honestly (`states.mjs`)
- **Ratio in copies of the smaller base** — the starting difference is counted rather than printed (`states.mjs`)
- **Two swatches and one unit line** — the key is the only furniture, since every bar carries its own numbers (`build.mjs`)

## Worked example
`proof/video-stacked-bar-lowcarbon-growth/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type stacked-bar --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

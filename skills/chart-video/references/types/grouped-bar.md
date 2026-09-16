# Grouped bar — in video

**Argues:** A small number of series placed side by side within each category, so a reader can make two comparisons off one chart: within a group (this series here against that one, same category) and across groups (this series here against itself over there, a different category).

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-grouped-bar-wind-vs-solar` (validated 2026-09-15, recut as an argument), from
`proof/static-wind-vs-solar`.

- **Show where the compared values come from**: each group's whole (its electricity mix) rises as one column to 100 %,
  the compared series on top in their colours, every other part in two alternating neutrals. The others fade; the column
  parts side by side where the two stand, *then* the two descend to the baseline keeping their heights — they never cross;
  the scale closes (geometrically) from 100 % onto them.
- **Make the comparison one group at a time**: the first series' level carried across over the second as a dashed line; a
  count of the groups where the claim holds climbs as each line lands. The exception is found by the count stopping and
  the second bar clearing the line; the others step back.
- **End on the whole chart**: every group back, the exception ringed (bars, shares and name), the credit on one line.
- Every bar labelled lets the axis go; a value wider than its bar prints bare and the unit is said once after the series'
  names, each after a swatch. A brisk rhythm: about 18 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal** — each category's WHOLE is built first, source on source to 100 %, with the two compared series already in their own inks on top
- **`reveal` — split + rescale** — everything else fades, each column parts into the two series side by side, they slide down to the baseline keeping their heights, and the scale closes from the whole onto them
- **`subject` — compare + count + filter** — group after group the leading series' level carries across over its partner as a dashed line, a count climbs for every group that falls under it, and the exception is the group left standing
- **`conclusion` — pull back** — every group returns, the exception ringed; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-give-series-different` — give the two series different scales, or let the scale move between two groups being compared
- `no-print-callout-naming` — print a callout naming the exception: the count stops short and the one group left standing says it

## Precision to assert
- one shared value scale from zero across every group and every shot
- every mix is asserted to add to its stated whole before the split
- the count of groups where one series leads is derived and asserted, and the exception is its complement

## Devices the worked example implements
- **Whole-then-part** — the two compared shares are shown coming out of the country's whole electricity, so the denominator is never implied (`states.mjs`)
- **The carried level** — one series' height dragged across its partner as a dashed rule, which replaces the sentence (`GroupedBarFrame.tsx`)
- **Bare share labels** — the unit is said once after the series names because a label with the unit is wider than its bar (`build.mjs`)

## Worked example
`proof/video-grouped-bar-wind-vs-solar/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type grouped-bar --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

# Lollipop — in video

**Argues:** A lollipop chart is a bar chart's thin sibling: same job (rank or compare a magnitude per category), same baseline-at-zero rule, same everything about the encoding — just a thin stem and a dot standing in for the solid rectangle.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-lollipop-co2-per-person` (validated 2026-09-15, recut as an argument), from
`proof/static-lollipop-co2-per-person`.

- **Measure a ratio with the marks themselves**: copies of the smaller stem fly over one after another and stack end to end
  beside the larger stem, cut at its head, so the last copy shows only its fraction and « ×N » is literally the copies
  that fit. When the dates change the copies grow or shrink with their stem and the stack, still cut at the head, holds
  more or fewer. While the ratio shows, the larger head's own value gives way.
- **Two dates are one hue at two chromas**: the stems rise at their slot's centre; at the second date each travels (eased,
  an arrival) and slides right while a tint of it stays at the first date on the left. Dates said once, under the first
  pair; the unit once.
- **End on the whole chart**: the copies go, every pair back with both dates, the subject's later head ringed; the credit on
  one line. A brisk rhythm: about 18 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal** — the first period's stems rise from one zero line, each counting its own value up
- **`reveal` — compare by measuring** — the others step back and copies of one stem fly over and stack END TO END beside the stem it is compared with, cut at its head: the ratio is counted in stems, not printed
- **`subject` — move + re-measure** — every stem travels to the later period, a tint staying behind at the earlier one, the copies grow with their stem, and fewer of them fit: the same measurement repeated is the whole argument
- **`conclusion` — pull back** — the copies go, every category returns, the subject's later head ringed; the credit on one line
- **`hold` — ≈60 frames**. About 18 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- lift the stems off zero — the stem is a length, so the zero rule is the bar's rule
- paint a value label in the accent: printed values stay in the page's neutral ink and the stem carries the accent

## Precision to assert
- one zero-based value scale for every stem and every copy, in every shot
- the stack of copies is cut exactly at the compared head, and the printed ratio is the arithmetic one
- the earlier period is a tint of the later one's hue — one hue at two chromas, never two hues

## Devices the worked example implements
- **Ratio measured in copies of the subject's own stem** — the comparison uses the chart's own unit instead of a number (`states.mjs`)
- **The tint left behind** — the earlier level stays as a tint so the movement is legible without a second chart (`LollipopFrame.tsx`)
- **Bare values over the heads** — the unit said once, because a labelled head is wider than its stem (`build.mjs`)

## Worked example
`proof/video-lollipop-co2-per-person/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type lollipop --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

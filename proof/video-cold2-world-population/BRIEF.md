---
format: video
size: landscape
type: area
---

# Beat — World population passed 8 billion in 2022 (video)

**Type:** area. **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen series (`../static-world-population/data.csv`, World, 1800–2023) and the same claim as
`proof/static-world-population`: the years are consecutive, the series first reaches 8 billion in 2022 (8.02) and ends at
8.09 billion in 2023, more than eight times its 1800 level of 0.98 billion. The area is drawn from zero — a level, a stock
of people. Every number is derived from the rows and asserted in `subject.mjs`.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the zero-based area on the whole frame, a column reserved right of 2023 for the stack; the running
   population in the empty upper left during the fill.
3. **No end card** — the video ends on the whole curve, the eight stacked 1800 levels beside its end, the 2022 crossing
   dotted and named; the credit on one line under the years.

## The choreography

The area **fills** from 1800 to 2023, linear in years, while the population counts up. Then it **measures the end
against the start**: the surface steps back to its tint, the 1800 slice at the left edge lifts in the accent, and eight
copies of it travel across the chart and stack, one on another, in the column beside 2023 — on the same scale, so the
stack of eight stops just under the curve's end (7.86 < 8.09). The count « ×8 » stands over it. The surface returns to
the accent and the 2022 point where the curve reaches 8 billion is dotted and named.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | height is people, from zero | — (furniture) | ticks 0–8 billion, the years | consecutive years |
| `reveal` | 0.98 → 8.09 billion | **fill + count up** | the surface fills left to right, linear in years; « {n} billion » climbs | first and last levels |
| `subject` | more than eight times 1800 | **lift + stack (compare on one scale)** | surface tints; the 1800 slice lifts; eight copies fly right and stack beside 2023; « ×8 » | 8 × 1800 ≤ 2023 < 9 × 1800 |
| `conclusion` | 8 billion in 2022 | **pull back + name** | surface back to the accent, the counter leaves, the 2022 dot and « 8 billion · 2022 », the credit | first year ≥ 8 billion = 2022 |
| `hold` |  | — | nothing | hold = conclusion |

## The owner's rules — checked before the render

- [x] The title card from frame 0, no longer than 1.5 s; the final frame held at least 60 frames; 18 to 22 s in all.
- [x] Every event but the hold changes the picture; the hold changes nothing.
- [x] The video follows the scrolly's picture and choreography, without its cards.
- [x] A documentary argument — transform, magnify, morph — not marks toggled on.
- [x] As little text as the picture allows: no sentence, no standfirst; a close-up names only what it frames.
- [x] A close-up centres its subject on both axes.
- [x] No end card: the video ends on its picture, the credit on one line.
- [x] No word under the type floor at any event's end; every word drawn at its measured width.
- [x] ONE art direction, composed from the newsroom's identity (NEWSROOM.md) — never the three filed demo directions.
- [x] The no-break space written as the `\u00A0` escape in the scripts, never typed.
- [x] Looked at before the mp4: every event's last frame and the middle of each gesture.

## Direction

One — the design base's best composed candidate for the newsroom and this beat's text
(`render-directions-video.mjs`): `renders/<label>.mp4`, `renders/<label>-final-frame.png`, `renders/<label>-props.json`.

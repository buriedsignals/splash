# Beat 1 — the Rhone glacier, eight readings, one scroll

**Slot 1 of `STORYBOARD.md`. Medium `chart`, format `scrolly`, no size (a scrolly exports no single
frame). Chosen treatment: Line. Producer: custom — `datawrapperMatch` returns `null` for
chart/scrolly/Line, so the producer question was never asked.**

## What this beat has to prove

> The Rhone glacier's area falls from 1.82 km² in 1990 to 0.61 in 2025 — two thirds gone — with one
> five-year interval, 2000 to 2005, in which the recorded area does not move at all.

## The model: a SCRUB, not an assembly

`scrolly` recognises two models and this beat declares the second by its markup: one persistent
picture, lifted out of the frame stack on boot and driven off the scaffold's own `data-progress`.
Eight steps, one per measurement. Between two measurements the line DRAWS ITSELF — the reader's own
gesture moves the head, not a 0.3s fade at the boundary.

`verify-scrolly.mjs` reads that model off the markup (`requiresScrub`: 8 frames, 1 with content) and
holds this beat to what a scrub owes: intra-step motion on every step, and every declared mark
reaching `data-state="reached"` before the scroll ends.

## What is drawn, and why each mark is there

| Mark | What it is | Why |
| --- | --- | --- |
| the faint full line | all eight readings, in `muted` at 0.5 | The header states the claim in full before any step. Nothing is withheld; the reveal says where the reader IS in the record, not what happens next. |
| the accent line | the record up to the reader's own position | The one mark that moves under the gesture. |
| the shaded band | between the 1990 level and the line | Its VERTICAL extent at any year is the area lost since 1990, in the y axis's own unit. Never an area under the curve, which would be square kilometres multiplied by years and would mean nothing. |
| the dashed rule | the 1990 level, 1.82 km² | The comparison the takeaway makes. A decorative dash: no `pathLength`, no dash offset, so it is not the screen-space reveal dash `revealDashInScreenSpace` refuses. |
| eight dots | one per measurement | Each carries `data-state`, `pending` until the narrative reaches it. Strength says how close; colour says whether it got there. |
| the head readout | the year and reading the scroll has arrived at | Pinned to the top-left gutter, so the travelling card can never cut it in half. |

## The y axis starts at zero

The takeaway is PROPORTIONAL — "two thirds gone" is only readable off a plot whose baseline is
nothing. That costs the bottom 30% of the plot to empty ground, and it is the right trade: an axis
cropped to 0.6–1.9 would make the same eight numbers look like a collapse to zero.

## The step that redraws nothing — decided, not assumed

The frozen table records the same area and the same volume for 2000 and 2005, and the article says so
outright. `step-redraws` exists for a step that gives the reader nothing for their scroll, and the
honest question is whether this is one.

It is not, and the guard agrees. Measured on the delivered file at all three widths, the
2000 → 2005 step redraws **22.0%** of the graphic's painted marks — the accent line extends by a
flat segment (which is the fact), the shaded band widens by that segment, the head dot travels a
full interval, the 2005 mark flips to `reached`, and the "2000–2005: no change" callout arrives. A
step whose DATUM does not move is not the same thing as a step whose PICTURE does not move; the
plateau is what this step draws.

## The colours

`PALETTE.md` at the story root, `origin: subject` — the water convention, `#1F6FB2` on the
newsroom's own `#16191B`, measured 3.34:1. That clears the 3:1 non-text floor a MARK has to clear
and does not clear the 4.5:1 a run of small text does, so the accent draws the line and the band and
sets no type. The head readout is `ink`.

## The typeface, and the gap

`TYPEFACE.md` at the story root records `Helvetica, Arial, sans-serif`, `origin: default`, because
`NEWSROOM.md`'s own Space Grotesk does not resolve on this machine. **`scrolly` has no
`useTypeface` and never reads that file** — a gap this format's own `SKILL.md` names. The stack this
beat draws in happens to be the recorded answer, and that is a coincidence of the answer, not a
mechanism. Named again in the hand-over.

## What was measured

- `bun skills/scrolly/scripts/verify-scrolly.mjs renders/rhone-glacier.html` — **0 failures**, at
  1600x900, 1280x800 and 375x812.
- Per-step redraw: 19.1 / 24.0 / 22.0 / 26.9 / 23.5 / 25.0 / 26.4 per cent against a 1% floor.
- Intra-step motion: 22.4 / 20.4 / 20.0 / 20.0 / 23.5 / 20.0 / 23.1 per cent — no stalled step.
- 7 of 8 marks start `pending`; all 8 read `reached` at the end of the scroll.
- `data-progress` 0.00 → 7.00, worst step/progress drift 0.59 against a 0.65 ceiling.
- Panel contrast 17.66:1.
- First-step ink coverage, **measured by hand because nothing in the toolchain measures it for a new
  beat**: 3.3% at 1600x900 and 10.1% at 375x812, against this format's own 1.2% floor.

## The residue

- `detachVisual` exists because the vehicle has no way for a beat to DECLARE "my visual is one
  persistent element". Copied from the pattern `proof/scrolly-one-chart-swiss-life-expectancy`
  established; it is what that missing declaration costs today.
- The volume series is in the data and in the prose, and is not plotted. Two quantities on two
  scales in one frame would need two y axes.

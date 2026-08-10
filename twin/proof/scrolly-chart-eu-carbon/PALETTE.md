---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md`.

`palette`'s proposal was run for this beat's own subject line — *"CO2 emissions per person
across the 27 European Union member states, 1990 to 2024"* — and returned **one** option, the house
theme: `matchConvention` fires on none of the four grounded conventions, because none of
`renewable`, `coal|fossil|oil`, `water` or `heat|temperature|warming` appears in a subject that is
about how much carbon each country's population accounts for.

**The near-black `fossil` grey was considered and refused, and the refusal is the interesting
part.** Phrasing the same subject as *"carbon dioxide emitted per person from fossil fuels and
industry"* — which is literally what the indicator measures — makes `matchConvention` return
`fossil` and offer `#3A3A3A` at 11.37:1. It is not taken, for a reason that belongs to this beat
rather than to the table: the `fossil` convention is the material's own colour, meant for a series
that stands AGAINST another fuel. Nothing here is plotted against anything; the four charts compare
27 countries with each other, and the derived muted grey is already carrying 26 of them on every
frame. An accent one step darker than that grey would mark nothing.

Measured against this ground: **5.18:1**, comfortably clear of the 3:1 floor a graphical object has
to hold (WCAG 2.2 SC 1.4.11). The accent carries no text at 15px or below; the words on this beat
clear 4.5:1 through `deriveFurniture`, from the same ground.

**What the accent is spent on, one frame at a time — one mark per chart, never a palette.**

| Frame | The accent marks | Everything else |
| --- | --- | --- |
| line | the median of the 27 | 27 country lines in derived muted, 50% |
| ranked bar | the highest and the lowest bar — the two ends the ratio is between | 25 bars in derived muted |
| slope | the largest fall | 26 lines in derived muted; the one riser in `ink`, furniture rather than a second hue |
| dot strip | all 27 dots — here they ARE the subject, and there is no "everything else" to separate them from | the median rule and the ±2 t band in `ink`/`muted` |

`render.mjs` and `ChartFrames.tsx` name no hex of their own. Both colours arrive through
`readPalette`; `ink`, `muted` and `grid` are derived from the ground by `deriveFurniture` and
handed to the frames as props.

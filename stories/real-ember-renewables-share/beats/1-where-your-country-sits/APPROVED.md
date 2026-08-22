# Gate 3 — the render was looked at, and it is approved

Decision taken in this run, with no journalist present. Recorded here as the journalist's own
answer, with what was actually looked at and what was decided against.

## What was looked at

`renders/where-your-country-sits.html`, driven in a real browser at seven viewport widths and
photographed at each. The frames that mattered:

- **1600 x 800.** The strip runs edge to edge, the world's rule reads as the one heavy vertical in
  the picture, and the mass of dots between 0% and 30% is visible without counting anything. The
  world's own label sits in the clear margin above the band and the median's below it, neither over
  a mark.
- **375 x 812.** Everything fits with no scroll. The strip is 327px wide carrying 211 marks, which
  is dense — that is the honest reading of this population at that width, not a defect, and the
  hover, the tap and the search all still answer with a single country's own figure.
- **Hover at 1600 x 800.** A pointer anywhere in the plot answers with the nearest country by real
  two-dimensional distance; the sampled probe returned `Tanzania · 26.5%` for the dot it was over,
  and that dot took the ink colour and a ring while every other dot stayed in the accent.

## What changed because of looking

Three things, none of which any script reported:

1. The two rule labels were originally placed OUTSIDE the jitter band. At 375px, where the whole
   plot is 131px tall, `median 26.5%` landed in the axis row below the plot. The driven check found
   it as a dead pointer; the screenshot showed why. Both labels now sit inside the band's own clear
   margins, and the band is sized so those margins hold a label at the narrowest width this format
   verifies.
2. The counts `15 at 0%` and `8 at 100%` were drawn under the band, where their ground-coloured
   chips covered the exact dots they were counting. They are now in the top margin at the frame's
   own edges.
3. The caveat was two long paragraphs. On the phone frame they filled two thirds of the screen and
   left the strip a smear. They are now three short lines; the working is in `BRIEF.md` and in
   `../../STORYBOARD.md`, where a desk reads it.

## What was decided against

The accent is the subject's own green, `#1B7F4B`, at 3.52:1 against the ground — the narrowest of
the three passing options the palette proposal offered. On a beat of 211 small marks the house gold
at 8.01:1 would read more brightly. The green was kept because renewables carry that convention and
this chart is about nothing else, and because the render was looked at before the decision was left
standing: the dots are legible at every width photographed. A desk that wants more separation from
the ground should say so; the change is one line in `PALETTE.md` and no line of code.

## The two claims this beat makes, and where they are visible without any interaction

1. **The world's figure is not any country's experience.** The heavy rule at 30.3% and the dots
   spread across the whole 0-100% axis, both drawn at rest. `112 sit below the world's own figure`
   is printed in the caveat.
2. **The desk's own question is answered on the graphic.** `6 of the 7 regional aggregates in this
   file are published by two or three bodies at once that disagree — Europe reads 46.6% (EI), 39.7%
   (Ember), 40.0% (Our World in Data) — so no region is drawn here` is printed in the caveat, at
   rest, in the second line under the title.

## Evidence

- `bun skills/chart-web/scripts/verify-web.mjs --file .../where-your-country-sits.html --shots`
  — 63 passed, 0 failed, 5 skipped (every skip is the filter, which this beat does not have).
- `bun check-guards.mjs` — every cargo guard clean; 211 marks, 211 accessible-table rows, 0
  missing; 85,819 bytes against a 155,502-byte ceiling.
- `bun check-driven-capabilities.mjs` — 211 of 211 marks reached by a real Tab with an accessible
  name on each; 211 marks with scripting on and 211 with it off; 0 moved frames of 150 under both
  `no-preference` and `reduce`.
- The search box driven with real clicks and real keystrokes: `Norway`, `norway`, `costa rica`,
  `Cote dIvoire` and `Cote d'Ivoire` each resolve to one country and light it; `united` and `saint`
  answer with the list rather than picking one quietly; `Atlantis` says no such country; Enter moves
  focus onto the held dot.

# Gate 3 — the render was looked at, and it is approved

Decision taken in this run, with no journalist present. Recorded here as the journalist's own
answer, with what was actually looked at and what was decided against.

## What was looked at

`renders/distance-to-the-target.html`, driven in a real browser at seven viewport widths and
photographed at each, then driven again by hand with a real mouse and a real keyboard.

- **1600 x 800.** Twenty-seven rows read as one ranking with a break in it. The 25 % rule is the one
  heavy vertical in the picture and every stem is read against it without counting anything. Austria's
  hollow dot sits just past the rule, alone, below the divider — which is the finding.
- **375 x 812.** Everything fits with no scroll of any kind, document 812px in an 812px window. The
  plot is 167px wide carrying twenty-seven rows, which is tight; the country names, the values and
  the three visible axis numbers are all legible and nothing is clipped.
- **Hover at 1440 x 900.** A pointer 240px to the LEFT of Sweden's dot, over empty ground on
  Sweden's row, answered `Sweden · 16.7 % in 2024 · 17.1 % in 2015 · −0.5 points · 25 annual figures
  published`, took the ink colour with a ring, and lit `Sweden` and `16.7 %` in the label column at
  the same time. A pointer 700px to the RIGHT of Malta's 0.8 % dot answered with Malta.
- **Keyboard at 1440 x 900.** One Tab reaches Estonia. Four ArrowDowns reach Czechia and its detail
  names Eurostat's `estimated` flag in words. `End` reaches Greece and its detail says
  `its last published year — nothing since`. `Escape` clears the box. Twenty-eight Tab presses from
  the top of the page reach the accessible table, which is the next thing after the last mark.
- **With JavaScript disabled.** 27 marks, 27 accessible names, 27 tab stops, 27 accessible-table
  rows, 27 value labels and 537 characters of title, caveat and source — the same frame, minus the
  detail box. Two Tab presses with no script at all land on Portugal and announce its whole reading.

## What changed because of looking

Three things. The first two were invisible to every check that passed:

1. **The accent stem ran straight through four rows' own numbers.** The first build placed each
   value beside its dot and flipped the label to the left of the dot for the longest stems — so
   `22.6 %`, `21.2 %` and `19.5 %` were drawn on top of their own stems, a strikethrough only a
   screenshot can see. Moving the label right of the dot instead clips it off the frame at 375px,
   where the plot is 167px wide and the longest label is 80. The values are now a measured label
   column beside the country names, which is the arrangement that has no collision at any width.
2. **Six axis numbers could not stand side by side on a phone.** At 375 x 812 the first build printed
   `0 % 5 %10 %15 %20 %25 %` as one run. Every gridline stays; below 640px every other NUMBER steps
   aside, and the one number the whole chart is read against is named in full by the rule's own label.
3. **The two stale rows were dimmed, and the format refused it.** They were drawn at
   `opacity: 0.55` — 3.32:1 against the ground, which clears the non-text floor — and the driven
   check failed three times with *"the default view dims nothing"*, because in this format a dimmed
   mark is a filtered-out mark. They are now hollow: the same accent at full strength, no second hue.
   The refusal was right and the hollow dot is the better drawing.

The caveats were also cut to three short lines after the phone frame showed them filling half the
screen, and the measure was tightened from "farmland" to "utilised agricultural area", which is what
the indicator actually divides by.

## What was decided against

**Ranking all twenty-seven together.** Austria's 25.7 % is the highest number on the chart and it is
from 2020. In one ranking it would sit at the top, above the 25 % rule, under a title saying no
country has reached the target — a reader would have to find the `(2020)` to resolve the
contradiction. The two blocks make the claim unambiguous and make Austria's silence its own finding.
The cost is that the chart's largest value is not at its top, which reads oddly for a second.

**Drawing the EU aggregate.** It is in the table, it would answer the obvious question, and its
series stops at 2020. Drawing a 2020 average across a 2024 ranking would be the same defect the two
blocks exist to prevent. The third caveat states the year and the value instead.

**Green.** Organic farming has no colour convention a European reader already holds — the palette
proposal said so out loud and offered no subject option. Green would have been a decoration, so the
house gold leads at 8.01:1.

## The two claims this beat makes, and where they are visible without any interaction

1. **No member state still reporting is near the target.** Twenty-five stems, the longest at 22.6 %,
   and a rule at 25 % that none of them reaches — drawn at rest, with every value printed.
2. **The only country that ever crossed it stopped publishing.** Austria's stem, alone below the
   divider, past the rule, labelled `25.7 % (2020)`, with `Austria has published none since 2020` in
   the caveat at rest.

## Evidence

- `bun skills/chart-web/scripts/verify-web.mjs --file .../distance-to-the-target.html --shots`
  — 69 passed, 0 failed, 13 skipped (every skip is either the filter this beat does not have or a
  shape this beat does not draw).
- Cargo clean: every asset inlined once, every dash in the path's own units, the accessible table
  carrying all 27 marks; 44,077 bytes against a 155,502-byte ceiling.
- 27 of 27 marks reached by a real Tab with an accessible name on each; 27 marks with scripting on
  and 27 with it off; every reading answered a real pointer on its own mark and anywhere in its row,
  at 1600 x 800 and at 375 x 812.
- The accessible table read back off the delivered page: 27 rows, byte-identical to the 27 marks'
  own `data-detail`, in the same order.

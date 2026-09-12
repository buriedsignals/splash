# Financial Times — Visual Vocabulary, `bar-diverging-stacked`

- url: `https://ft-interactive.github.io/visual-vocabulary/bar-diverging-stacked/`
- archive: `search`
- harvested: 2026-09-08, browser, no consent dialog, no entry screen
- what was actually looked at: `graphic.png` — the `<svg>` at `documentTop` 697, **1920 × 1080**.
  That size is the tell: this page draws the *same* chart into a stack of FT frames (print columns
  1–6, web S/M/L, social, video), and the picker took the largest, which is the **video frame**.
  The dark ground below is that frame's, not the FT's page ground.

## What it is

The FT graphics desk's entry for this form in its **Visual Vocabulary** — the FT's public catalogue
of chart types, filed under *Deviation* with the description, in the catalogue's own
`chartTypes.csv`: *"Perfect for presenting survey results which involve sentiment (eg disagree,
neutral, agreed"*. A **specimen** again, and the only one of the three in this family drawn by a
newsroom.

Seven rows: `Question 1` … `Question 5`, then `Male` and `Female` — one file mixing questions and
a demographic split. Five levels, legend across the top: `Stringly disagree` *(sic — the typo is in
the FT's own `data.csv`)*, `Disagree`, `Dont know`, `Agree`, `Strongly Agree`.

## What it does with information

- Segments diverge from a shared centre; the neutral `Dont know` **straddles** the zero.
- Title `Answers to a series of questions`, subtitle `Number of people`, source line
  `Thomson Reuters Datastream` — the FT's standard three-part furniture, present even on a
  specimen.
- The axis is **signed**: `−15 −10 −5 0 5 10 15 20`, under a subtitle that says the unit is a number
  of people. A count of people is being labelled −10.
- **This is the one reference in the family whose ramp does not deepen outward.** The chart's own
  `data.csv` is `Stringly disagree,Disagree,Dont know,Agree,Strongly Agree` = `-5,-6,2,6,10`, and
  what the picture shows on the disagree side is the *stronger* level nearer the centre with
  `Disagree` outside it, while the agree side runs `Agree` inside, `Strongly Agree` outside. The two
  halves of the same chart obey opposite rules.
- Rows are in given order; no re-sorting by result.
- No numbers on the bars (`labels=false` in the page's own config).

## What it does with style

Read from `record.pixel`, whose `routes.pixel.measuredFrom` is `graphic.png`:

- ground `#212121` at **78.694 %** — the video frame's near-black.
- chromatic: `#1F5E99` 4.782 %, `#A7FF59` 4.679 %, `#00D9CA` 2.932 %, `#EB3F50` 2.479 %,
  `#BF9413` 2.128 %.
- **`pixel.shape` is reported as `categorical`.** The pixel route and the eye agree: these five are
  a categorical set — blue, acid green, teal, red, gold — applied to an *ordered* scale. There is no
  ramp and no neutral hue.
- `style.marks` carries fifteen fills at count 8 each: three palettes of five, one per frame family
  (web, print, social/video), so the same chart is drawn in three different colourways on one page.
  The web/print sets include `#006A93`, `#55A2C7`, `#C6D6CC`, `#DDB831`, `#AD1C21`.
- Furniture: gridlines and axis in mid-greys (`#909090`, `#757575`), text in `#D4D4D4` on the dark
  frame.

Type: `record.style.typeSource` is **"the page, which contains the graphic — the two are not
separated"**, but here the page *is* the chart, so the tuples are usable with one caveat below.
Every text tuple names the family **`metric`** — the FT's own Metric — at one of three scale steps,
one per frame size: title `metric 12/600`, `25/400`, `68/600`; subtitle and labels `metric 9.6`,
`18`, `48`; source `metric 7.2`, `14`, `36`. One typeface, one weight pair, three sizes chosen per
output.

## What is transferable

- **The specimen carries the desk's furniture.** Title, subtitle naming the unit, source line — the
  FT does not treat a chart-type demo as exempt from its own house apparatus.
- **One chart, drawn at every output size on one page.** The type scale steps (7.2 / 9.6 / 12 for
  print columns, 36 / 48 / 68 for video) are the same three roles re-sized, not three different
  designs. That is a directly transferable model for a beat that has to ship as still, web and
  video.
- **One typeface across the whole graphic**, weight doing the work that a second family would
  otherwise do.
- The neutral straddling the centre, as in the Vega-Lite reference.

## What was not verified

- **The typeface did not render.** The record's declared family is `metric`, but the picture shows a
  serif fallback: the FT's webfont is not served to this GitHub Pages page. Every size and weight
  above is *declared*, and the shapes in `graphic.png` are the browser's substitute. No claim about
  how FT Metric looks may be founded on this image.
- Which of the three palettes in `style.marks` belongs to which frame. Only the video frame was
  photographed; the web and print colourways are known to exist from the marks list and were not
  looked at.
- Whether the FT applies this same categorical palette in production. This is the catalogue's demo
  data with a typo in it; a published FT survey chart was not found in this harvest, so the
  categorical-on-ordered choice is **not** evidence of FT practice — only of what the catalogue
  ships.
- Contrast: no in-segment labels exist to measure, and label-on-dark contrast was not computed.

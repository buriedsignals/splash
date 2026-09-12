# How projects overshot their budgets — Datawrapper

`https://datawrapper.dwcdn.net/Dig4F/` · harvested 2026-09-08 · archive `search`
Both routes `ok`; `routes.pixel.measuredFrom` is `graphic.png` (the `<svg>`, 925 × 190 at
`documentTop` 110). `style.typeSource` is *"the page, which contains the graphic — the two are not
separated"*: this url IS the chart's own document, so every type tuple below is the graphic's own
voice and not a publisher's furniture.

## What it is

**The only genuine bullet chart this harvest found.** Four German public projects — Elbphilharmonie,
the electronic health insurance card, Stuttgart 21, Flughafen Berlin — each drawn as one row
carrying two lengths from a shared zero: a **thick pale bar** for *Planned costs* and a **thin
saturated bar** for *Actual costs*, the thin one centred inside the thick one so the overshoot reads
as the dark bar running out past the pale one's end.

What was actually read: the chart at its own permalink, no masthead, no consent wall, nothing else
on the page. It is **Datawrapper's own example chart** for the bullet-bar type — real data, credited
`Chart: Florian Stalph · Source: SPIEGEL` — reached from the Academy article
`datawrapper.de/academy/how-to-create-a-bullet-bar-chart`. It is a chart, not documentation, but it
is the vendor's own hand and it is the vendor's *demonstration* of the form.

## What it does with information

- **The target is a second bar, not a tick.** `skills/chart-beat/references/types/bullet.md` says
  the target "renders as a distinct tick mark crossing the bar's own track, not as a second bar, so
  'value' and 'target' stay visually different kinds of mark rather than two competing lengths."
  Datawrapper — the default chart tool of the desks this corpus is drawn from — implements the
  opposite, and it is the only implementation of the form the tool offers. The distinction is
  carried by **bar thickness and lightness**, not by mark kind.
- **Two lengths from one zero, per row, on one shared scale.** Every row is measured against the
  same 0 → 7bn axis, so the four projects are also comparable with each other. The type page's rule
  ("each row on its OWN scale") is a rule for KPIs in different units; here the unit is one currency
  and the shared scale is the right call — the reader is meant to see that Stuttgart 21 overshot by
  more than the Elbphilharmonie's entire budget.
- **No value labels on the marks at all.** The numbers live in prose under each row name
  ("costs rising 15-fold, from 70 to 600 Million Euro"; "planned for 1,6 Billion Euro, experts
  estimate the current budget at at least 5 Billion Euro"). The plate asks the reader to read the
  axis, and gives the exact figures in words instead.
- **The row name carries a sentence.** Each of the four labels is a bold name (Roboto 12/700) plus
  two or three lines of 12/400 explaining what the overrun was. The label column is roughly a third
  of the plate's width.
- **One directed annotation.** A leader arrow from the Elbphilharmonie's actual bar to
  *"Time Magazine placed Hamburg's Elbphilharmonie on its 'World's 100 Greatest Places of 2018'
  list"* — the smallest row on the plate is the one given the redeeming fact.
- **A defect, on the vendor's own example.** The axis reads `0b 1b 1b 2b 2b 3b 3b 4b 4b 5b 5b 6b 6b
  7b` — fourteen ticks at half-billion intervals, every label rounded to a whole billion, so seven
  labels are duplicated. On a chart whose whole argument is the size of an overrun, the axis cannot
  be read to better than a billion.

## What it does with style

Colour is read from `record.pixel` (`measuredFrom: graphic.png`); type from `record.style.type`,
which on this record is the graphic's own document.

```
ground     #FFFFFF   74.357 %
actual     #1D81A2   14.224 %   h 194.9°  chroma 0.522
planned    #A1C4D7    7.034 %   h 201.1°  chroma 0.212
(edge)     #1B4D5D    0.025 %
furniture  #F4F4F4 2.005 %, #D8D8D8 0.689 %, #181818 0.247 %
shape      sequential, one cluster at hue 195, 3 members, 21.28 % of the frame
```

**One hue at two chromas carries value-versus-target.** 194.9° and 201.1° are six degrees apart —
the same blue — and the separation is entirely lightness and saturation: 0.522 against 0.212 chroma,
0.375 against 0.737 lightness. `pixel.shape` reports `sequential, 1 cluster` because arithmetically
this palette is one ramp, which is exactly what the design intends: not two categories, one measure
at two states.

Type, the graphic's own (Roboto throughout):

```
22 / 700  rgb(0,0,0)       title        "How projects overshot their budgets"
14 / 400  rgb(24,24,24)    subtitle     "Comparison of the original budget vs. actual costs, billions of Euros"
12 / 700  rgb(24,24,24)    row name     "Elbphilharmonie"            ×4
12 / 400  rgb(24,24,24)    legend, row prose, axis, annotation      ×23
11 / 400  rgb(136,136,136) credit       "Chart: …"   link rgb(0,136,204)
```

Four sizes, one family, and the ink steps down with them — black, near-black, near-black, grey. The
only chromatic text on the plate is the source link.

`style.marks` records exactly `stroke rgb(24,24,24) ×2`: the zero rule and the annotation arrow.
Every bar is a fill, so the marks list is short by construction — that is what the style route can
see, not a count of the chart's marks.

## What is transferable

- **Value and target as one hue at two chromas** rather than two hues. The reader is told these are
  two states of the same quantity before reading a single label. Costs nothing, and it is the only
  colour decision the chart makes.
- **The thin bar in front of the thick bar** as the way to keep two lengths on one row legible
  without a tick: the pale bar reads as the backdrop the type page asks for, and the saturated bar
  reads as the measure, purely from area and chroma.
- **The row label as a sentence, not a name.** Four rows is few enough that the explanation can sit
  in the label column instead of a caption, and each row then carries its own precise numbers where
  the axis is too coarse to give them.
- **The annotation goes to the smallest bar.** The plate's one piece of directed text is spent on
  the row a reader would otherwise skip.

## What was not verified

- **No qualitative bands.** This chart has none, and the type page's "poor / ok / good" backdrop is
  not evidenced anywhere in this family's corpus. Datawrapper's bullet-bar type does not offer them.
- **No hit/miss colour split.** All four rows overshot, so whether the tool or the designer would
  recolour a row that came in under budget is untested here.
- The graphic clip is the `<svg>` only, which on this chart is the **plot area**: the row labels and
  the credit line sit outside it in the page. Every number quoted above under *style* comes from
  `record.pixel`, whose frame is the plot area; the wording of the labels was read from
  `screenshot.png` by eye and no colour is quoted from it.
- **`#F4F4F4` at 2.005 %** is the alternating row band, not a bullet backdrop — it is the pale stripe
  behind alternate rows, and it does not encode anything.
- The bars' precise values were not read; the axis cannot support it (see the duplicated tick
  labels above) and no value labels exist. Everything numeric here is either from the row prose or
  from the pixel record.
- This is **one publication and it is the tool's own hand**. Nothing here is corroborated by a
  second desk, and the corpus contains no second bullet chart.

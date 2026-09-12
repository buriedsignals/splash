# Storytelling with Data — "Inbound Delivery Progression", from the May 2018 #SWDchallenge recap

- url: https://www.storytellingwithdata.com/blog/2018/5/15/may-swdchallenge-recap-the-waterfall-chart
- archive: url-list (found by searching the form's own vocabulary; the post is a recap of a
  community challenge whose brief was "create and share a waterfall chart". Not a line of the
  alive-urls file.)
- readAs: the published post at 1440×900. `style.graphic.tag` is **`img`** 950×1188 at
  `documentTop: 17632`, `nearTheTop: false` — the graphic is a raster of one submission, seventeen
  screens down a long recap page. `routes.pixel.measuredFrom: "graphic.png"`. Because the graphic
  is a raster, **the chart's own type could not be read at all**: `style.type` (proxima-nova
  17.6/400, 22.4/700) is the SWD article's furniture, not the chart's.
- **Whose work this is:** a reader's submission published by SWD, not SWD's own design. It is
  filed for what it shows, and it is not evidence of a *desk's* practice.

## What it is

Two linked waterfalls of a delivery backlog. Above: five monthly levels (`1-Jan` 24, `1-Feb` 63,
`1-Mar` 54, `1-Apr` 32, `1-May` 45) with a `New` and a `Delivered` step between each pair. Below:
the same for every business day in January, drilling into the first month.

## What it does with information

**The level is the only coloured thing on the plate.** The five month-start balances are
`#009BFF` at **5.813 %**, the single chromatic reading in the record. Both step types are greys:
`#7F7F7F` at 4.391 % for `New` and `#BFBFBF` at 3.747 % for `Delivered`. The chart is not saying
"up is good, down is bad" — it is saying *this is the number, and these are the two flows that move
it*, and it spends its only colour on the number.

**The two steps are separated by lightness, not hue.** Dark grey adds, light grey subtracts. That
survives every colour-vision deficiency and every monochrome print — and it costs the chart the
instant sign-reading that a hue pair gives.

**A zoom is drawn as a zoom.** Two diverging lines run from the ends of the `Jan` group in the upper
chart to the full width of the lower one, which is the standard detail-inset device applied to a
bridge. The daily chart has 21 pairs of steps and is legible only because the reader arrives at it
already knowing what one pair means.

**Labels are painted inside the bars, in white** — `73`, `−34`, `36`, `−45` — and this is where the
form's own accessibility trap is visible in the wild: white on `#BFBFBF` is roughly 1.9:1, a clear
fail, and the `−34`/`−45`/`−46` labels are the hardest things on the plate to read. The design that
spends its colour on the level has nowhere left to put a legible label except outside the bar, and
it did not.

**Each chart carries a legend naming the three roles** (`Pending Deliveries`, `New`, `Delivered`) —
necessary here precisely because two of the three are greys that no reader could guess.

## What it does with style

Ground `#FFFFFF` at **81.15 %**; palette read as **sequential**, which is the honest reading of one
blue plus two greys. Furniture and steps: `#7F7F7F` 4.391 %, `#BFBFBF` 3.747 %, `#F3F3F3` 0.953 %
(the plot's alternating bands), `#404040` 0.309 % (ink). The chromatic tail (`#81CEFF` 0.045 %,
`#CEECFF` 0.041 %) is the blue's antialias.

The chart's typography is unmeasurable — it is inside a raster. The page around it is `proxima-nova`
17.6/400 body and 22.4/700 for the contributors' names.

## What is transferable

- **Spend the accent on the running level and draw the flows in neutrals**, when the reader's
  question is "what is the balance" rather than "what went up".
- **Separate two step roles by lightness** when hue is already committed elsewhere.
- **A bridge can carry a detail inset** of a sub-period, joined by the usual two diverging rules.
- **And the counter-lesson, measured here:** a value label painted inside a light step fails
  contrast. The fix the family's other references use — float the label just outside the bar's
  growing edge, in ink or in the step's own colour — costs nothing and is what this chart needed.

## What was not verified

The chart's typeface, sizes and weights (raster). The submission's author beyond the recap page's
own crediting, which was not read as pixels. Whether the arithmetic reconciles
(24 + 73 − 34 = 63 does; the remaining months were not checked). The tool is evidently Tableau from
the embedded player chrome in the capture, but that was not confirmed from the page source.

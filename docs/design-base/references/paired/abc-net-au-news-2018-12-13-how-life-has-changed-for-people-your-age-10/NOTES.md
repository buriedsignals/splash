# ABC News — "How life has changed for people your age"

- url: https://www.abc.net.au/news/2018-12-13/how-life-has-changed-for-people-your-age/10303912
- archive: url-list
- type: a page of slope charts, two dated rails, two series each
- export: interactive (an age-band selector, `0-10` … `70+`, changes which slopes are shown)
- readAs: the live SVG charts, reached by scrolling the article to its middle and end — NOT the state
  the harvester photographed. `screenshot.png` is the title card; `graphic.png` is a decorative navy
  panel deep in the page. `graphic-scrolled.png` in this directory is what was actually read, and the
  pixel figures below were measured on it with `scripts/design-base/pixel-palette.mjs`.

## What it is

An age-banded then-and-now: for each of eight age bands, a stack of slope charts comparing **1981**
to **2016** on a saturated navy ground. Every chart is two vertical rails, dated at the top, with one
straight two-point line per series — **MALE** in cyan, **FEMALE** in yellow. Above each chart, a bold
finding ("The heart disease death rate has fallen 80 per cent") and, under it, the unit ("Heart
attack deaths per 100,000, for ages 45-54").

## What it does with information

**The change is stated three times, in three registers, each in its own place.** As the slope's
angle; as the two values, printed at the two ends; and as a **percent-change pill** at the right,
filled with the series' own colour — `- 83%`, `+50%`, `- 23%`. A reader gets direction from the
picture, level from the numbers, and magnitude from the pill without any of them competing.

**The pill separates the delta from the value.** The end block reads: series name in caps and bold,
then the 2016 value, then the pill. Three different facts, three different weights, one column.

**There is no y axis and there are no ticks.** The rails are plain rules; the scale is carried
entirely by the four printed numbers. That is honest here because each panel has exactly four values,
and it is what lets two panels of wildly different magnitude (202 vs 33 deaths per 100,000) sit side
by side without either being flattened — but it also means the two panels are NOT comparable to each
other, and the piece does not claim they are.

**The finding is the chart's title and the unit is its deck.** Nothing is left for a caption.

**The percent in the pill is a percent OF a percent where the values are already percentages.**
`69% → 53%` is labelled `- 23%`, which is the relative change ((53−69)/69 = −23.2 %), not the 16
percentage points. `28% → 18%` is labelled `- 36%` ((18−28)/28 = −35.7 %). Both check out
arithmetically, and both are readable as "23 points" by a reader who does not stop. **A relative
change of an already-percentage quantity needs its word, and this piece does not give it one.**

## What it does with style

Measured on `graphic-scrolled.png`. Ground **`#175482` at 83.7 %** — a saturated navy paper, not a
tint. The pixel route calls the palette **sequential, one hue cluster at 206°**, which is *the ground
itself*: the cyan and yellow series are far too small by coverage to survive the noise floor against
a chromatic ground. **A strongly coloured ground makes the pixel route's palette shape unreadable**
— the ground enters the chromatic set and swamps it. The series colours had to come from the style
route instead.

Style route, marks, on the full page: **`stroke rgb(14, 51, 79)` ×122** (the rails and the ground's
own darker line work), **`fill rgb(255, 215, 13)` ×75** — yellow `#FFD70D`, **`fill rgb(52, 231, 216)`
×60** — cyan `#34E7D8`, and `fill rgb(247, 255, 247)` ×65, the near-white ink `#F7FFF7`.

Type, three families, `abcserif` + `abcsans` + `ABCSans-bold`:

| role | family | size | weight | case | ink | runs |
| --- | --- | ---: | ---: | --- | --- | ---: |
| display | abcserif | 40 | 700 | none | `#EBEBEB` | 1 |
| chart title | ABCSans-bold | 18 | 700 | none | `#F7FFF7` | 56 |
| deck / unit | ABCSans-bold | 15 | 700 | none | `#B0E6FF` | 41 |
| body | abcsans | 18 | 400 | none | `#EBEBEB` | 102 |
| rail date | ABCSans-bold | 12 | 700 | none | `#F7FFF7` | 280 |
| series name | ABCSans-bold | 12 | 900 | **uppercase** | `#F7FFF7` | 61 |
| value | ABCSans-bold | 15 | 900 | none | `#F7FFF7` | 86 |

**Zero italic runs**; tracking is 0 everywhere in the graphic (the one tracked uppercase run, 1.14, is
a scroll prompt). The hierarchy is carried by weight — 400 / 700 / 900 — and by one serif/sans
contrast, not by tracking or case. Text column 653 px / **73 ch**.

## What is transferable

- **State the change as a coloured pill at the end of the line**, separate from the value, filled in
  the series' colour. Three facts get three weights in one column.
- **A slope of four printed values needs no axis.** Drop the ticks and let the numbers carry the
  scale — and then do not invite a comparison across panels that the missing axis cannot support.
- **Put the finding in the chart's title and the unit in its deck**, so the chart is readable with no
  surrounding prose.
- **Say "relative" when a percent change is computed on a percentage.** This piece is the warning,
  not the model.

## What is this piece's own

The ABC navy, cyan and yellow; the licensed ABCSans / abcserif; the age-band selector; the faint
line-drawn icons in the ground.

## What was not verified

Whether the pills' figures come from the plotted values or from a separate field — they are
consistent with them at the four points checked. Whether the cyan and yellow clear a contrast floor
on `#175482` — not measured. What the seven other age bands draw: only the `51-60` and `70+` bands
were read.

# Flourish — "Magnificent Seven no more" (Tesla's share price as a 100-step waterfall)

- url: https://flourish.studio/blog/waterfall-charts/
- archive: url-list (found by searching the form's own vocabulary; the post is Flourish's own
  announcement of its waterfall mode. Not a line of the alive-urls file.)
- readAs: the published post at 1440×900, after the harvester dismissed a consent dialog —
  `consent: "#onetrust-accept-btn-handler"` is recorded, so this is a page in a state the harvester
  put it in. `style.graphic.tag` is **`iframe`** 1000×650 at `documentTop: 743`, frame
  `https://flo.uri.sh/visualisation/17486666/embed?auto=1`; `routes.pixel.measuredFrom:
  "graphic.png"`. **Type comes from `style.graphicFrame.type`**; `style.type` (Canva Sans Variable)
  is flourish.studio's own page furniture.

## What it is

Six months of Tesla's daily closing price drawn as a waterfall: roughly 120 steps, each one day's
change floating from the previous close, with a single opening bar rising from the axis at
01/10/2023. The form pushed to the point where it stops looking like a bridge and starts looking
like a candlestick chart — which is what a daily-change waterfall is.

## What it does with information

**A bridge with no labels and no totals in the middle.** At this step count there is no room for a
signed label on any bar, and none is drawn; the reader gets the level from the y-axis and the daily
change from the bar's height. The chart has abandoned the thing that makes a small bridge precise
and kept the thing that makes it a bridge — every bar starts where the last one ended.

**No connectors.** With bars this dense, the dotted connector every other reference in this family
uses would be continuous ink. Adjacency does the connecting instead.

**The red/green pair, on purpose.** `#70BA8A` at 0.563 % and `#FA5D57` at 0.516 % — precisely the
pairing the form's own guidance warns against, chosen because in this one subject the convention is
older than the chart and a finance reader already holds it. It is the exception that proves the
rule needs a subject test, not a blanket ban.

**The time axis is on top and the value axis on the left**, gridlines forming a coarse rectangle —
one vertical rule per month, one horizontal per $25. The chart is read as a field, not as a
sequence of named steps.

## What it does with style

Ground `#121212` at **94.07 %** — the only dark-ground reference in this family, and the reason its
two role colours can sit at 0.5 % coverage and still dominate. Palette read as **diverging**.
Furniture: type in `#F0F0F0` at 0.419 %, gridlines `#636363` 0.470 % and `#5D5D5D` 0.384 %,
`#222222` 0.620 % for the panel behind the plot.

Type inside the frame: `Lato` 32.2/700 for the title (`Magnificent Seven no more`), `Source Sans
Pro` 17.5/400 for the subtitle (`Tesla's stock price in the past six months`), `Lato` 14/400 for the
axis (12 runs), `Lato` 12.6/400 and 12.6/700 for the source line — every run in `rgb(240, 240, 240)`.
**One ink for all type on a dark ground**, with hierarchy carried entirely by size and weight.

## What is transferable

- **A dark ground makes two low-coverage role colours carry a whole chart.** Half a percent of green
  and half a percent of red are unmissable on `#121212`.
- **Past ~30 steps, drop the labels and the connectors** and let adjacency do the work — but accept
  that the chart is then read as a shape, not as an argument about named causes.
- **One type ink, hierarchy by size and weight**, on a dark plate.
- **A subject with an established colour convention overrides the accessibility default** — and the
  chart should be able to say which convention it is invoking.

## What was not verified

Whether this is Flourish's waterfall template or its "Line, Bar, Pie" template (the source line
credits the latter, so the chart may not be a waterfall in the tool's sense even though it is one in
the reader's). The consent dialog was dismissed before measurement. The prose of the post around the
chart was not read as pixels. The exact step count was estimated from the capture, not counted.
One publication.

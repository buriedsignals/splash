# ABC News — "How Buddy Franklin scaled footy's Everest"

- url: https://www.abc.net.au/news/2022-03-26/is-lance-franklin-the-greatest-of-all-time-afl-vfl/100919332
- archive: url-list
- type: noisy time series under a smoothed line
- export: scrolly
- readAs: the page's own chart element, photographed **mid-reveal** — see below. This piece is
  already cited by `doctrine/references/reference-set.md` (row 5), whose description of it —
  *"every year's actual value plotted as a faint dot, with a bold five-year moving-average line
  drawn over the top"* — agrees with what was seen here.

## What it is

Average goals per team per game in the AFL/VFL since 1965, on ABC's cream ground: **every year's
actual value as a faint pale-blue dot, with a bold blue moving-average line drawn over them.**

## What it does with information

**The noise stays honest and the shape still reads.** The year-to-year scatter is visible as dots —
a reader can see how variable the seasons are — while the multi-decade movement reads off the
smoothed line alone. Smoothing without the dots hides the variance; dots without the line leaves the
trend to the reader's eye.

**Dashed vertical gridlines, and a horizontal rule at a named level.** The "16" tick carries its own
rule across the plot, so a value is read against a stated level rather than estimated off a spine.

**The chart is set inside the prose, not beside it**, on the same cream ground as the article, with
pull-quotes following immediately below. The chart and the sentences it supports are one column.

## What it does with style

ABC's cream ground again — the same `#FFFCEE` family as the mullet piece — with a single blue
accent and a paler tint of it for the raw dots. **The accent and its own tint carry the two series**:
no second hue is spent on the distinction between raw and smoothed.

## What is transferable

- **Faint per-reading dots under a bold smoothed line**, for any long series whose year-to-year
  noise would otherwise force a choice between honesty and legibility.
- **Distinguish raw from smoothed by TINT of the one accent**, not by a second hue. The two are the
  same measurement at two resolutions, and a second accent would say they were different things.
- **Rule the axis at the level being argued about**, rather than at even intervals.

## What was not verified — and a harvester limitation this reference exposed

**The capture caught the chart mid-animation.** Only the 1965–1975 portion of the series is drawn in
the record's `graphic.png`; the reveal had not finished. The harvester scrolls one viewport and back,
which *triggers* a scroll-driven reveal without waiting for it to settle. The reading above is the
part that was drawn plus `reference-set.md`'s independent description of the same chart; the exact
extent, the endpoint and the annotation set were **not** read. **A record of an animated chart is
suspect until the harvester waits for the animation.**

The claims about football, and the five-year window in particular, are `reference-set.md`'s, not a
measurement made here.

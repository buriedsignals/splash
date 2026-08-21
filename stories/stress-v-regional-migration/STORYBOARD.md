---
takeaway: "Net migration was negative in four of the seven regions in 2025: a national balance of -9380, with Centre alone down 21800 while Montagne barely moved at 780."
grounding: supported
reference: "Republik -- 'Mensch gesund, Klima krank?' (21 March 2025), the chart titled 'Die Emissionen des Zulieferers des Zulieferers ...' -- a bar too short to hold its own number keeps its label OUTSIDE it, at the same scale as every other bar, so the smallness is seen rather than rescaled away"
subject: "each region's own net migration balance for 2025, losses and gains read off one signed scale"
comparison: "Centre's -21800 against Montagne's -780 -- the smallest balance is 3.6% of the largest, and both are drawn at the same scale"
limits: "population sits beside net_migration_2025 in the same frozen table and this beat draws the RAW balance, not a rate. Per 1000 residents the order of the three gainers reverses -- Sud 5.1, Littoral 4.7, Ouest 4.6 -- and Montagne's -780 is proportionally the same loss as Est's -3100 (-2.5 per 1000 each). The figure is a single year's net balance, not a population change: births and deaths are not in this table."
placement: "replaces the paragraph that recites the seven figures one at a time, directly under the headline"
credit: "unattributed · as of 21 August 2026"
effectiveDate: "2026-08-21"
language: en
slots:
  - id: 1
    proves: "that four of the seven regions lost people on balance in 2025 and Centre's loss is in a different order of magnitude from every other region's"
    medium: chart
    format: video
    size: portrait
    reachable: yes
    candidates: ["Diverging bar", "Waterfall (bridge)"]
    chosen: "Diverging bar"
---

## What the visual shows

One row per region, ordered from the largest gain to the largest loss, each bar growing out of a
single vertical zero line. Three bars run right (Ouest, Sud, Littoral), four run left (Montagne,
Est, Nord, Centre). Every bar is drawn on the same scale, so Montagne's 780 is a sliver beside
Centre's 21,800 and its number sits outside the bar rather than inside it -- the reference's own
lesson, applied to a signed scale.

The order in time is the argument: the zero line is drawn first and read as the thing every bar is
measured from, the bars then grow out of it, and only after all seven have landed does Centre take
the accent. The closing line states the national balance, which no single bar shows.

## Why a diverging bar and not a waterfall

Both were offered. A waterfall would read the seven regions as consecutive steps building the
national balance of -9,380, which is true arithmetic and a false picture: the regions are not a
sequence, and a waterfall's floating bars make each region's own size hard to compare against the
next. The diverging bar keeps every region on the same baseline and answers the question the
article actually asks -- who lost, who gained, and by how much.

## The per-capita question, asked and answered

The profiler named `population` as a candidate denominator and the grounding check repeated the
warning. It was examined rather than waved through. A net migration balance is a FLOW of people,
and the reason the article gives for caring about it -- schools, housing, services -- scales with
the count of people, not with the share of the region they came from. So the beat draws the raw
balance. What the raw view hides is recorded in `limits` and printed as the beat's own caveat: per
1,000 residents the three gainers change order, and Montagne's tiny-looking loss is proportionally
identical to Est's four-times-larger one.

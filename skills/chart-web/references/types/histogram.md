# Histogram — in web

Worked example: `proof/web-histogram-carbon-footprint` (2026-09-15), from `proof/static-carbon-footprint-spread`.

- **The gesture**: the reader stands the distribution's OWN QUANTILES up across the plot — the readings
  no choice of bins can move.
- **Refused first, and it shapes everything: the bin width is NOT handed over.** That is the obvious
  control and `BRIEF.md` records the three measurements that closed the door. So the page hands over
  what survives any binning instead.
- **Build it with `chart-web/assets/level.ts`.** Three quarters of the world's countries stop at 5,8 t,
  which is 14 % of this chart's width; the last 40 % of it carries two countries. Not one of those
  numbers is a bin edge, so not one can be printed on a still of this claim.
- **Every bar also answers** — with its interval, its count, its share of the whole, the running share
  up to its own top edge, and the countries inside it.
- **Name a bin by BOTH edges and leave the last one open.** A histogram labelled `0 2 4 6` leaves the
  reader guessing which side of 4 a country at exactly 4 t fell on. The shape is the argument, so the
  bars are one neutral and the accent goes to the bins the headline counts.

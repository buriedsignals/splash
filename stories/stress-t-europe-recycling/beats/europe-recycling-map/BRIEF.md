---
size: portrait
---

# Beat brief — europe-recycling-map

**Slot 1 of `STORYBOARD.md`.** Medium `map`, format `video`, size `portrait`, treatment
**Choropleth**, producer custom (no Datawrapper mapping exists for map x video).

## What this beat has to prove

That among the eleven national agencies that reported, Germany's recycling rate is the highest and
Macedonia's the lowest — and that most of Europe is not in this survey at all.

## Subject, comparison, caveat

- **Subject** — Germany. It gets the outline, the label and the accent; nothing else on the map does.
- **Comparison** — Macedonia, the other end of the gap the article names. Labelled in ink, never in
  the accent: one semantic accent, spent on the subject.
- **Caveat** — thirty-one of the forty-two European countries drawn did not report, and the agencies
  that did do not share one definition of "recycled". Both are on the frame, not only in this file.

## The data, and what had to be done to it by hand

The frozen `source/data.csv` is keyed by a country NAME somebody typed, and four of the eleven names
do not match any shapefile: `Holland` (the shape is `NLD`), `Macedonia` (`MKD`), `Czech Republic`
(`CZE`) and `Belgiumm` — a plain typo (`BEL`). Nothing in this toolchain maps a name to a shape key,
so `RECYCLING_ALIAS` in `geo-recycling.ts` is written by hand and shows every judgement it makes.

It is written shape-key → SOURCE STRING rather than as a cleaned csv, deliberately: keyed that way,
`unmatchedValues` measures the raw names the journalist's file actually carries, so a name this
table forgets is refused BY THAT NAME instead of vanishing from the map.

`Sweden` appears twice, byte for byte. `source/profile.json` recorded it (`duplicates.count: 1`) and
nothing downstream of the profile reads that field, so `ratesFromCsv` finds it again at the join,
drops the exact repeat with its row numbers named, and throws if a repeat ever carries a different
reading.

`survey_date` is not drawn. It mixes `2025-03-01`, `01/03/2025` and `March 2025`, which is why
`intake` typed it `text`; the effective date is stated in words in the credit instead.

## Frame

1080 x 1920. Every `<text>` is at or above the 36px floor for this size and inside Meta's
269..1248 safe band; the plate is 640 square, which is what the band has left once the furniture a
phone reader must be able to read has taken its share.

## Timing

`RECYCLING_TIMING` — 330 frames at 30fps. Furniture up; the continent laid down under the no-data
hatch (the reference: most of Europe did not report); a 0.73s pause; the ten other reporting
countries fill in lowest rate first; Germany lands on its own; the closing sentence; a one-second
hold.

## Render

```sh
bun stories/stress-t-europe-recycling/beats/europe-recycling-map/bake-plate.mjs --size 680
bun stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs --final-frame
bun stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs --video
```

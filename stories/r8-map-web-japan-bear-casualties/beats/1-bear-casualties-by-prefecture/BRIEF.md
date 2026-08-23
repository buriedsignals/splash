# Beat 1 — Bear casualties by prefecture, Japan, fiscal 2025

**Slot** `1-bear-casualties-by-prefecture` · **medium** map · **format** web · **producer** custom
**Treatment** Proportional symbol (symbol / bubble map) · **language** en

## The one thing this beat has to prove

Japan's record bear year was a Tohoku year: 158 of the 238 people hurt by bears in fiscal 2025 were
hurt in the six northern prefectures, and 67 of them in Akita alone.

## Where every number comes from

`../../source/data.csv`, column `計_被害者数` — the ministry's own annual casualty total per
prefecture, transcribed from `Ｒ０７年度におけるクマの人身被害件数［速報値］` (env.go.jp,
retrieved 23 August 2026). `prepare-inputs.mjs` reads that column and nothing else.

- **The measure is people, not incidents and not deaths.** The table publishes three columns per
  period. `人身被害件数` counts incidents (216); `被害者数` counts people (238); `死亡者数` counts
  deaths (13). The takeaway counts people, so the beat draws `被害者数`. The ministry's own note —
  `※被害者数に死亡者数含む。` — says the casualty figure already contains the deaths, so the two
  are never added, here or in the caveat.
- **The 計 row is excluded and declared.** The ministry prints its national total as the last row of
  the same table under the same 区分 column. `AGGREGATE_ROWS` names it; `JOIN.json` records that it
  was dropped and what it held. Left in, it would draw one circle larger than the country.
- **The join is declared in all three directions.** `JOIN.json` records 47 aliases applied (Natural
  Earth writes `秋田県`, the ministry writes `秋田`; `北海道` keeps its `道`), 8 shapes with no
  reading, and 0 readings with no shape. The 39 drawn values sum to 238, which is the ministry's own
  published total.

## What is drawn, and what is not

| | count | how it is drawn |
|---|---|---|
| Prefectures the ministry lists with a casualty | 22 | a circle whose AREA is the count, one accent for the subject and the ground's own muted grey for the rest |
| Prefectures the ministry lists with zero | 17 | no circle — a zero has no area. Each keeps its hit target, its keyboard stop and its table row |
| Prefectures absent from the ministry's table | 8 | nothing at all. Named in the caveat. **Absent is not zero** |

The third row is the rule lifted at the reference loop from Weiss & Bauer's Republik graphic: the
part that cannot be placed is excluded from the marks and declared, never folded into a residual.

## The camera

`[[128.5, 30.5], [146.5, 45.8]]`, `dataviz-dark`, baked once at 1000px wide; the height (1089) comes
from the camera. It holds the whole archipelago, not only the prefectures with a value, so a reader
recognises the outline before they read a circle. Kyushu and Okinawa are inside the frame and carry
no mark; the caveat says why.

**The water is derived, not defaulted.** `#376084`, reached by walking one blue in lightness until
it cleared 3:1 under the accent and stayed 2.67:1 above the ground. The format's own bake paints
`#aac9e0` from a literal; on this beat's ground that measured 0.557 relative luminance against an
accent of 0.426 and a ground of 0.009 — the sea brighter than every data mark, and an accent circle
over it at 1.27:1, under the floor the palette refuses at. See `../../NOTES-FOR-MAINTAINER.md`.

## Colours and type

`../../PALETTE.md`: ground `#16191B`, accent `#D4A853`, `origin: newsroom`, measured 8.01:1.
`../../TYPEFACE.md` records `Helvetica, Arial, sans-serif`, `origin: default` — this format writes
that stack into the page it delivers and has no reader for the recorded answer, which the record
says out loud.

## What the reader can ask, and what they are never made to ask

Every one of the 39 prefectures answers with its exact value on hover, on keyboard focus, in its own
`title` with JavaScript off, and in the table — which ships OPEN on this beat, because 17 marks have
no pointer path at all and the table is their only complete reading.

Nothing the title claims is behind an interaction: the title's own claim is Tohoku's concentration,
all six Tohoku prefectures are labelled on the unfiltered map at the widths that can hold a label,
and the subject line under the map prints Akita's 67 and the national 238 in full.

The filter is Japan's own eight-region grouping, minus Kyushu, which has no reporting prefecture.
It narrows the map, the labels and the table together. "All regions" is checked, so the unfiltered
view already carries the whole claim.

## What this beat must not be read as

It is a count of people, not a rate. The ministry publishes no population beside these figures and
this beat divides nothing. Akita's 67 in a prefecture of roughly 900,000 and Tokyo's 1 in a
prefecture of 14 million are the same kind of number here and only the same kind of number.

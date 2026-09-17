---
size: landscape
type: bullet
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Poland has gained 17 points of low-carbon electricity since 2015, and is still the only one of the six under half

**Type:** bullet (measure, comparative state, neutral track). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Low-carbon electricity — nuclear plus every renewable — as a share of each country's own generation,
2015 against 2024:

| | 2015 | 2024 | change |
| --- | --- | --- | --- |
| Poland | 13.8 % | **31.1 %** | **+17.3 pts** |
| Germany | 43.8 % | 58.6 % | +14.8 pts |
| France | 92.2 % | 94.9 % | +2.7 pts |
| Switzerland | 97.2 % | 98.1 % | +0.9 pts |
| Norway | 98.0 % | 98.6 % | +0.7 pts |
| Sweden | 98.1 % | 98.8 % | +0.7 pts |

**Poland moved furthest and is the only one of the six still under 50 %.** Both halves of that
sentence are asserted in `render-directions.mjs` before the render, on shares computed from the
frozen file.

## Why a bullet

Because every row carries a measure AND a comparative state on one bounded scale, which is exactly
the shape this form is for. The 2015 share is not a target — no policy is being scored here — and the
plate says so in its reading line: it is the same measure at an earlier date, which is what
`two-states-of-one-measure-are-one-hue-at-two-chromas` is about.

The track runs the full 0–100 %, per `the-track-runs-the-full-scale-so-the-remainder-is-legible`,
because the remainder is the reading a bare bar cannot give — and here the remainder IS the story for
Poland.

## What the harvest gave it

Six references across five publications — the BBC's election night, two Datawrapper plates, ICAEW,
two Statista charts — and four rules two of them agree on are filed: the comparative line names
itself, the track runs the full scale, the two states are one hue at two chromas, and the verdict is
printed as a derived number rather than left as a subtraction for the reader.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, 2015 and 2024, frozen beside this beat as `data.csv`.

## The choreography

This bullet draws no target. The reading the type usually gives a marker is given here by the 2015
bar itself — thick and pale behind the thin saturated 2024 bar — so every row carries its own
before and after on one track to 100 %. The eye enters on Poland, the one row in the accent and
the one row whose pair of bars stops short of the middle of its track. The gained points are
printed at the right, outside the track, and read last: the number confirms what the short bar
already said.

**The eye enters at** `the Poland row`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the six rows` | `the Poland row` |
| reference | `the 2015 bars` | `the Poland row` |
| reveal | `the 2024 bars` | `the 2015 bars` |
| subject | `the Poland row` | — |
| conclusion | `the points-gained column` | `the Poland row` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the Poland row",
  "stations": [
    {
      "station": "establish",
      "carries": "the six rows",
      "subordinateTo": "the Poland row"
    },
    {
      "station": "reference",
      "carries": "the 2015 bars",
      "subordinateTo": "the Poland row"
    },
    {
      "station": "reveal",
      "carries": "the 2024 bars",
      "subordinateTo": "the 2015 bars"
    },
    {
      "station": "subject",
      "carries": "the Poland row",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the points-gained column",
      "subordinateTo": "the Poland row"
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **The headline figure is measured** — Poland's 13,8 % and 31,1 % are read off the frozen file and the 17,3 points between them is their difference, not a rounded headline.
- **The 2015 bar plays the marker** — where this type would place a target, this plate places the earlier reading, computed from the same rows as the bar it sits behind and asserted equal to it.
- **Each share comes from the source columns** — low-carbon share is nuclear plus renewables over generation, computed from columns that exist in the file.
- **Both halves are asserted before the render** — furthest moved, and the only one of the six under half, are two separate searches and both must hold or the beat throws.
- **Gain and level sit in one frame** — the change and the standing are read on the same row at the same moment; splitting them into two pictures would lose the sentence.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-headline-figure-is-measured",
    "the-2015-bar-plays-the-marker",
    "each-share-comes-from-the-source",
    "both-halves-are-asserted-before-the",
    "gain-and-level-sit-in-one"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-headline-figure-is-measured",
    "the-target-marker-position-is-computed": "the-2015-bar-plays-the-marker",
    "the-share-is-computed-from-the": "each-share-comes-from-the-source",
    "both-halves-of-the-claim": "both-halves-are-asserted-before-the",
    "asserted-in-the-one-frame": "gain-and-level-sit-in-one"
  }
}
```

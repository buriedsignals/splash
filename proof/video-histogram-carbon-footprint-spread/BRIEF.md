---
format: video
size: landscape
type: histogram
medium: chart
grounding: supported
derived: v1
---

# Beat — 6 pays sur 10 émettent moins de 4 tonnes de CO₂ par personne (video)

**Type:** histogram (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-carbon-footprint-spread/data.csv`, Global Carbon Budget via Our World in Data)
and the same assertions as `proof/static-carbon-footprint-spread`: 213 countries with a 3-letter code and a value in 2023,
ten 4-tonne bins from 0 with the last one open (36+), every country in exactly one bin; 127 of 213 under the declared
4-tonne threshold, the share rounding to 6 in 10. One count scale from zero for the cells, the bins and the columns.

## The argument

A histogram is countries piled by how much they emit — so the video lays the 213 countries along the tonnes axis, drops
each into its bin as one cell of the count scale, then carries the whole tail beyond 4 tonnes into one column beside the
first bin, keeping every length, and cuts both into tenths of the 213: six against four.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the ten bins on the whole frame, their names under them, the count ticks at the left.
3. **No end card** — the video ends on the whole histogram, the 4-tonne cut ruled in the accent, « 127 » on the first bin;
   the credit on one line. 19.5 s.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | 213 countries, each at its tonnes | **trace** | the zero line and the bin names; a tick per country along the axis, swept from 0 to 36+ at the data's pace | 213 ticks, each inside its bin |
| `reveal` | piled by bin, one cell a country | **fall + count** | every tick widens into one cell and stacks into its bin, all bins rising at the same pace; the count ticks arrive | each bin's height is its count; the cells sum to 213 |
| `subject` | where 6 in 10 comes from | **cut + stack + tenths** | the 4-tonne cut rises in the accent, « 127 » on the first bin; the tail's bins (15, 9, 3, 2, 3, 1) rise and slide, keeping their lengths, onto the 4–8 bin — its count going 53 → 86; seams cut both columns into tenths of 213 | 86 = 213 − 127; 6 tenths and 4 tenths, 6 = the title's share |
| `conclusion` | the whole distribution | **pull back** | the seams close; the tail's bins slide back into their slots, top first; the credit | every bin back at its count |
| `hold` | the answer | — | nothing | hold = conclusion |

```json splash:choreography
{
  "kind": "time",
  "fps": 30,
  "shots": [
    {
      "shot": "establish",
      "gesture": [],
      "start": 0,
      "duration": 45,
      "asserts": []
    },
    {
      "shot": "reference",
      "gesture": [
        "trace"
      ],
      "start": 45,
      "duration": 60,
      "asserts": [
        "213-ticks",
        "each-inside-its-bin"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "fall",
        "count"
      ],
      "start": 105,
      "duration": 150,
      "asserts": [
        "each-bin-height-is-its-count",
        "the-cells-sum-to-213"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "cut",
        "stack",
        "tenths"
      ],
      "start": 255,
      "duration": 180,
      "asserts": [
        "86-213-127",
        "6-tenths-and-4-tenths",
        "6-the-title-share"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 435,
      "duration": 90,
      "asserts": [
        "every-bin-back-at-its-count"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 525,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The ten bin names, the count ticks, « 127 », the column's count. No unit line, no standfirst, no sentence.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "213-ticks",
    "each-inside-its-bin",
    "each-bin-height-is-its-count",
    "the-cells-sum-to-213",
    "86-213-127",
    "6-tenths-and-4-tenths",
    "6-the-title-share",
    "every-bin-back-at-its-count",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "213-ticks",
      "each-inside-its-bin"
    ],
    "reveal": [
      "each-bin-height-is-its-count",
      "the-cells-sum-to-213"
    ],
    "subject": [
      "86-213-127",
      "6-tenths-and-4-tenths",
      "6-the-title-share"
    ],
    "conclusion": [
      "every-bin-back-at-its-count"
    ],
    "hold": [
      "hold-conclusion"
    ]
  },
  "onlyOnHold": [
    "hold-conclusion"
  ],
  "covers": {
    "claim-datum": null,
    "every-observation-falls-in-exactly-one": null,
    "one-count-scale-from-zero-for": null,
    "the-threshold-count-and-its-complement": null,
    "asserted-per-shot": null
  }
}
```

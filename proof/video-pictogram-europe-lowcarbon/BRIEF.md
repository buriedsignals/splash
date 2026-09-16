---
format: video
size: landscape
type: pictogram
medium: chart
grounding: supported
derived: v1
---

# Beat — L'Europe électrique est aux deux bouts : 6 pays seulement au milieu (video)

**Type:** pictogram (unit grid). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-pictogram-europe-lowcarbon/data.csv`, Ember and Energy Institute via Our World
in Data) and the same assertions as `proof/static-pictogram-europe-lowcarbon`: the 40 European countries reporting 2024
generation, one square each (Ukraine not drawn); 16 at or above 75 % low-carbon, 6 from 60 to 75 %, 18 under 60 %; the
three blocks account for every country and the middle holds under a quarter of them. The square's fill is the static
plate's five-class ramp (breaks 40, 60, 75, 94).

## The argument

A block's count comes from where its countries sit: the video stands the 40 squares on the low-carbon axis, one column
per 5 points, rules the two cuts and parts the axis there, then lets each part settle into a block of six-square columns
anchored where it stood — the ends against the ends, the middle at its middle — every block counted at one pace, so the
middle stops at 6 while the two ends climb to 18 and 16; the parts then close into the pictogram, magnified.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the axis across the whole frame, « 0 % » and « 100 % bas-carbone » under its ends, the squares
   standing on it.
3. **No end card** — the video ends on the three blocks closed together and magnified, the cuts « 60 % » and « 75 % »
   ruled in the accent in the gaps, each block's count over it, « 6 pays » ringed; the credit on one line. 19 s.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | 40 countries, each at its low-carbon share | **trace** | the axis and its two end words; a square drops onto its column as a front sweeps from 0 to 100 % at the data's pace | 40 squares, each in the 5-point column of its share, stacked from the axis |
| `reveal` | three parts, cut at 60 and 75 % | **cut + split** | the two cuts rise in the accent with their words; the axis parts at them, the part under 60 % sliding left and the part from 75 % sliding right, every column keeping its squares | every square left of 60 % in the left part, right of 75 % in the right part; the middle part unmoved |
| `subject` | where 18, 6 and 16 come from | **gather + count up** | each part's squares settle into columns of six from its anchor (the left edge, the right edge, the middle between the cuts); the j-th square of every block lands at the same moment; each block's count climbs as its squares land | each block's count is its landed squares; 18 + 6 + 16 = 40; the middle stops first |
| `conclusion` | only 6 in the middle | **pull back + name** | the parts close together, every square magnified by one factor about its block's corner, a cut in the middle of each gap; a ring closes round « 6 pays »; the credit | each block keeps its shape; 6 × 4 < 40 |
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
      "duration": 105,
      "asserts": [
        "40-squares",
        "each-in-the-5-point-column",
        "stacked-from-the-axis"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "cut",
        "split"
      ],
      "start": 150,
      "duration": 75,
      "asserts": [
        "every-square-left-of-60-in",
        "right-of-75-in-the-right",
        "the-middle-part-unmoved"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "gather",
        "count up"
      ],
      "start": 225,
      "duration": 195,
      "asserts": [
        "each-block-count-is-its-landed",
        "18-6-16-40",
        "the-middle-stops-first"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back",
        "name"
      ],
      "start": 420,
      "duration": 90,
      "asserts": [
        "each-block-keeps-its-shape",
        "6-4-40"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 510,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

« 0 % », « 60 % », « 75 % », « 100 % bas-carbone », the three counts. No key, no unit line, no standfirst, no sentence.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "40-squares",
    "each-in-the-5-point-column",
    "stacked-from-the-axis",
    "every-square-left-of-60-in",
    "right-of-75-in-the-right",
    "the-middle-part-unmoved",
    "each-block-count-is-its-landed",
    "18-6-16-40",
    "the-middle-stops-first",
    "each-block-keeps-its-shape",
    "6-4-40",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "40-squares",
      "each-in-the-5-point-column",
      "stacked-from-the-axis"
    ],
    "reveal": [
      "every-square-left-of-60-in",
      "right-of-75-in-the-right",
      "the-middle-part-unmoved"
    ],
    "subject": [
      "each-block-count-is-its-landed",
      "18-6-16-40",
      "the-middle-stops-first"
    ],
    "conclusion": [
      "each-block-keeps-its-shape",
      "6-4-40"
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
    "one-icon-always-equals-the-same": null,
    "the-groups-are-exhaustive-and-disjoint": null,
    "the-magnification-at-the-end-is": null,
    "asserted-per-shot": null
  }
}
```

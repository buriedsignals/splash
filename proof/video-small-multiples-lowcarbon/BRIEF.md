---
format: video
size: landscape
type: small-multiples
medium: chart
grounding: supported
derived: v1
---

# Beat — Les seize ont tous progressé, et ceux qui partaient de plus bas le plus (video)

**Type:** small multiples (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-small-multiples-lowcarbon/data.csv`, Ember / Energy Institute via Our World in
Data) and the same assertions as `proof/static-small-multiples-lowcarbon`: the low-carbon share of electricity
(renewables and nuclear) in 2000 and in 2024 for sixteen European countries, one panel each, every panel on the one
0–100 % scale. Asserted, as the static does: all sixteen rose; the correlation between the 2000 level and the gain is
clearly negative (−0,76); Denmark gained the most, Sweden — the highest start — the least.

## The argument, in one sentence

One row of sixteen 2000 bars on one scale is cut into sixteen named panels; each 2024 bar slides out of its 2000 bar and
rises; then every part added since 2000 drops to the baseline beside where its country started, and once the panels
re-sort by that start, lowest first, the added parts shrink row after row as the starts fill their panels.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — a grid of 4 × 4 panels, each its 2000 bar in the pale tint and its 2024 bar in the full accent on its
   own short baseline, the name and the gain beside the pair; over the grid the shared scale stated once and a key of two
   swatches.
3. **No end card** — the video ends on the whole grid in the order of the 2000 start, Denmark and Sweden ringed; the
   credit on one line.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | where sixteen countries started, on one scale | **reveal in order → split** | sixteen pale bars grow side by side in one row on one baseline; the row is cut — each bar, keeping its height, travels to its own panel, its stretch of baseline shrinking to the panel's own, its name arriving | every bar's height = its 2000 share on the one scale, through the cut |
| `reveal` | all sixteen rose | **copy slides out + grows + count** | panel after panel a copy of the 2000 bar slides out beside it and rises to 2024 in the accent, the gain counting beside it | every gain > 0, each count its rounded gain |
| `subject` | the lowest starters rose most | **detach → reorder** | in every panel the part added since 2000 drops to the baseline keeping its length, beside the 2000 bar, the rest of the 2024 bar stepping away; the panels re-sort by their 2000 start, lowest first — the pale bars fill row after row while the accent bars shrink | the order of the start; every added part keeps its length |
| `conclusion` | the whole chart | **pull back + name** | every added part climbs back onto its level, the 2024 bars whole again; Denmark (+74) and Sweden (+2) ringed; the credit | gains land on their levels; the ringed pair = largest and smallest gain |
| `hold` | the grid | — | nothing | hold = conclusion |

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
        "reveal in order",
        "split"
      ],
      "start": 51,
      "duration": 84,
      "asserts": [
        "every-bar-height-its-2000-share",
        "through-the-cut"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "copy slides out",
        "grows",
        "count"
      ],
      "start": 135,
      "duration": 120,
      "asserts": [
        "every-gain-0",
        "each-count-its-rounded-gain"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "detach",
        "reorder"
      ],
      "start": 255,
      "duration": 147,
      "asserts": [
        "the-order-of-the-start",
        "every-added-part-keeps-its-length"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back",
        "name"
      ],
      "start": 402,
      "duration": 90,
      "asserts": [
        "gains-land-on-their-levels",
        "the-ringed-pair-largest-and-smallest"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 492,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The shared scale, the two key words, the names, the gains. A brisk rhythm: 18,4 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "every-bar-height-its-2000-share",
    "through-the-cut",
    "every-gain-0",
    "each-count-its-rounded-gain",
    "the-order-of-the-start",
    "every-added-part-keeps-its-length",
    "gains-land-on-their-levels",
    "the-ringed-pair-largest-and-smallest",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "every-bar-height-its-2000-share",
      "through-the-cut"
    ],
    "reveal": [
      "every-gain-0",
      "each-count-its-rounded-gain"
    ],
    "subject": [
      "the-order-of-the-start",
      "every-added-part-keeps-its-length"
    ],
    "conclusion": [
      "gains-land-on-their-levels",
      "the-ringed-pair-largest-and-smallest"
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
    "every-panel-keeps-the-same-axis": null,
    "each-mark-keeps-its-height-through": null,
    "the-correlation-or-ranking-the-reorder": null,
    "asserted-per-shot": null
  }
}
```

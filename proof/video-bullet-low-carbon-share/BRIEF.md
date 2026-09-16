---
format: video
size: landscape
type: bullet
medium: chart
grounding: supported
derived: v1
---

# Beat — Pologne : +17,3 points de bas-carbone depuis 2015, toujours la seule sous la moitié (video)

**Type:** bullet (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-bullet-low-carbon-share/data.csv`, Ember / Energy Institute via Our World in
Data) and the same derivation as `proof/static-bullet-low-carbon-share`: the low-carbon share of six countries' electricity
in 2015 and 2024, ranked by gain. Asserted: the country that gained most is the only one still under half; the insertion
from the 2015 order ends on the order of gain.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — six rows, each one bar for the country's whole electricity to 100 %: the low-carbon part of 2015 in the
   pale tint, the part gained by 2024 in the saturated hue, the fossil rest in a neutral; the names at the left, the gains
   in a column at the right, the ticks under; over them the unit and a key of three swatches.
3. **No end card** — the video ends on the whole chart by gain, the 50 % line dropped, Poland ringed; the credit on one line.

## The choreography — an argument, not a reveal

What only a video can do is **move the frontier**: each country's electricity is a whole, and between 2015 and 2024 the
line between its low-carbon part and its fossil rest moves — then the rows re-sort by how far it moved.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | each country's electricity in 2015 | **reveal** | the rows in their 2015 order extend to 100 %: the low-carbon part, then the fossil rest | the 2015 order |
| `reveal` | 2024 | **move the frontier + count** | row after row the frontier moves right: the part gained fills in, fossil recedes; each gain counts in points | every gain |
| `subject` | Poland gained most | **reorder** | the insertion: one row at a time climbs to its slot over the rows it passes; Poland first, to the top | the order of gain |
| `conclusion` | still the only one under half | **reference line + name** | the 50 % line drops through the whole chart; Poland alone ends short of it, ringed; the credit | the only one under 50 % |
| `hold` | the ranking | — | nothing | hold = conclusion |

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
        "reveal"
      ],
      "start": 51,
      "duration": 75,
      "asserts": [
        "the-2015-order"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "move the frontier",
        "count"
      ],
      "start": 126,
      "duration": 120,
      "asserts": [
        "every-gain"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "reorder"
      ],
      "start": 246,
      "duration": 150,
      "asserts": [
        "the-order-of-gain"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "reference line",
        "name"
      ],
      "start": 396,
      "duration": 90,
      "asserts": [
        "the-only-one-under-50"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 486,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The unit, the three key words, the names, the gains. A brisk rhythm: 18,2 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "the-2015-order",
    "every-gain",
    "the-order-of-gain",
    "the-only-one-under-50",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "the-2015-order"
    ],
    "reveal": [
      "every-gain"
    ],
    "subject": [
      "the-order-of-gain"
    ],
    "conclusion": [
      "the-only-one-under-50"
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
    "the-target-marker-position-is-computed": null,
    "each-row-parts-sum-to-the": null,
    "the-final-order-is-the-asserted": null,
    "asserted-per-shot": null
  }
}
```

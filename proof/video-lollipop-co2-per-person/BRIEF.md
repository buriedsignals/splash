---
format: video
size: landscape
type: lollipop
medium: chart
grounding: supported
derived: v1
---

# Beat — La Chine a triplé son CO₂ par personne, l'écart avec les États-Unis est passé de 7,5 à 1,7 (video)

**Type:** lollipop (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-lollipop-co2-per-person/data.csv`, Global Carbon Budget 2025 and population via
Our World in Data) and the same derivation as `proof/static-lollipop-co2-per-person`: the six largest emitters of 2023
(per person × population), their CO₂ per person in 2000 and 2023. Asserted: China and the United States among the six,
China more than 2,5 times its 2000 level, the ratio from above five to between one and two and a half.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — six pairs of stems from one zero line, a value over every head; the unit said once at the top left, the
   dates once under the first pair. The 2000 stem is a tint of the 2023 stem's hue — the still's rule.
3. **No end card** — the video ends on the whole chart, both dates for every pair, China's 2023 head ringed; the credit on
   one line.

## The choreography — an argument, not a reveal

The still prints the ratio. The video **measures it with China's own stem**: copies of it stacked beside the American stem
until they reach its head — seven and a half — then, at 2023, the same copies grown with China's stem, and fewer fitting.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the six largest emitters, per person, in 2000 | **reveal** | the six 2000 stems rise, each counting its value | every 2000 level |
| `reveal` | an American emits 7,5 Chinese | **compare by measuring** | the four others step back; copies of China's stem fly over one after another and stack end to end just left of the American stem, cut at its head; « ×7,5 » over the stack | 7,5 |
| `subject` | 2023: 1,7 | **move + re-measure** | every stem travels to 2023 and a tint stays at 2000 on its left; the copies grow with China's stem and the stack, still cut at the American head, holds fewer — « ×1,7 » | 1,7; China ×3 |
| `conclusion` | the whole comparison | **pull back** | the copies go; the four others come back — the whole chart; China's 2023 head ringed; the credit | — |
| `hold` | the change | — | nothing | hold = conclusion |

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
      "duration": 60,
      "asserts": [
        "every-2000-level"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "compare by measuring"
      ],
      "start": 111,
      "duration": 150,
      "asserts": [
        "7-5"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "move",
        "re-measure"
      ],
      "start": 261,
      "duration": 120,
      "asserts": [
        "1-7",
        "china-3"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 381,
      "duration": 90,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 471,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The unit, the dates, the values, « ×7,5 » and « ×1,7 ». No standfirst, no change row, no selection rule. A brisk rhythm:
17,7 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "every-2000-level",
    "7-5",
    "1-7",
    "china-3",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "every-2000-level"
    ],
    "reveal": [
      "7-5"
    ],
    "subject": [
      "1-7",
      "china-3"
    ],
    "conclusion": [],
    "hold": [
      "hold-conclusion"
    ]
  },
  "onlyOnHold": [
    "hold-conclusion"
  ],
  "covers": {
    "claim-datum": null,
    "one-zero-based-value-scale-for": null,
    "the-stack-of-copies-is-cut": null,
    "the-earlier-period-is-a-tint": null,
    "asserted-per-shot": null
  }
}
```

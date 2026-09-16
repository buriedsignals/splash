---
format: video
size: landscape
type: dumbbell
medium: chart
grounding: supported
derived: v1
---

# Beat — Tous les dix ont gagné des années de vie ; la Pologne 5,0 ans, les États-Unis 2,5 (video)

**Type:** dumbbell (range plot). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../more-dumbbell-life-expectancy-gains/data.csv`) and the same assertions as
`proof/more-dumbbell-life-expectancy-gains`: life expectancy at birth in 2000 and 2023 in ten countries; every one gained;
Poland gained the most (+5,0 years), the United States the least (+2,5). One shared value scale, not anchored at zero; the
two years one hue at two chromas (the directed plate's rule), the subject's row ringed, not recoloured.

## The argument

The order of 2000 is not the order of the gains: the rows start ranked by their 2000 level, where Poland is last; every dot
travels to 2023, then the rows re-rank by what they gained and Poland climbs from last to first — and the gains, pulled off
their dumbbells and set side by side on one start line, keeping their lengths, show it: the longest is Poland's, the
shortest the United States'.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — ten rows, names on the left, the value axis at the foot, the two years named once by their dots above
   the rows, the rise counted beside them, each gain written on the right.
3. **No end card** — the video ends on the whole dumbbell ranked by gain, Poland's row ringed, Poland's and the United
   States' gains in the accent; the credit on one line.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | ten countries in 2000 | — (furniture) | the axis, the ten names ranked by their 2000 level, each 2000 dot, the « 2000 » key | Poland last in 2000 |
| `reveal` | every one of the ten gained | **trace + count** | row by row, the dot travels right to 2023 (an arrival, eased), the gain drawn behind it; « {n} en hausse » climbs as each lands; the « 2023 » key arrives | all 10 rose |
| `subject` | Poland gained the most, the United States the least | **reorder + compare** | the rows glide into the order of their gains, Poland from last to first, the other names dimming as they cross; a copy of each gain detaches and slides left onto Poland's 2000 start (a hairline), keeping its length, one after another — a staircase; each gain is written on the right as its copy lands; the dumbbells step back; Poland's row is ringed | the ranks by gain; every copy starts on one x and keeps its length |
| `conclusion` | the whole dumbbell | **pull back** | the copies slide back onto their dumbbells and merge, the start line goes, every row back at full ink; the credit | nothing stepped back |
| `hold` | the dumbbell | — | nothing | hold = conclusion |

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
      "gesture": [],
      "start": 51,
      "duration": 54,
      "asserts": [
        "poland-last-in-2000"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace",
        "count"
      ],
      "start": 105,
      "duration": 120,
      "asserts": [
        "all-10-rose"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "reorder",
        "compare"
      ],
      "start": 225,
      "duration": 210,
      "asserts": [
        "the-ranks-by-gain",
        "every-copy-starts-on-one-x"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 435,
      "duration": 75,
      "asserts": [
        "nothing-stepped-back"
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

Names, the axis values, the two years, the count, the gains. A brisk rhythm: 19 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "poland-last-in-2000",
    "all-10-rose",
    "the-ranks-by-gain",
    "every-copy-starts-on-one-x",
    "nothing-stepped-back",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "poland-last-in-2000"
    ],
    "reveal": [
      "all-10-rose"
    ],
    "subject": [
      "the-ranks-by-gain",
      "every-copy-starts-on-one-x"
    ],
    "conclusion": [
      "nothing-stepped-back"
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
    "the-drawn-connector-length-equals-the": null,
    "every-copy-of-a-gap-starts": null,
    "the-order-after-the-reorder-is": null,
    "asserted-per-shot": null
  }
}
```

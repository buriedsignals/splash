---
format: video
size: landscape
type: dot-strip
medium: chart
grounding: supported
derived: v1
---

# Beat — Le plancher européen est monté de 30 points, le plafond de 2 (video)

**Type:** dot strip (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-dot-strip-lowcarbon-spread/data.csv`) and the same assertions as
`proof/static-dot-strip-lowcarbon-spread`: the low-carbon share of sixteen European countries' own electricity in 2000 and
2024; the floor (Poland, 1,6 → 31,1 %) rose far, the ceiling (Sweden, 96,7 → 98,8 %) barely, the spread closed by more than a
fifth; Poland was the floor in 2000. One scale, 0 to 100 %, for both strips; chips stack into rows, never sideways; the
accent spent on Poland alone, nothing about a chip's colour changing between the strips.

## The argument

The field of 2000, measured as one span from Poland to Sweden, slides down onto 2024 keeping its length, pinned to a ceiling
that rose 2,1 points — and it overhangs the new floor by 27,4 points: the gap Poland's +29,5 closed.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — two ruled strips on one scale, the years in the left gutter, sixteen chips pinned by stems, the leaders
   joining each country to itself.
3. **No end card** — the video ends on both strips whole, every chip and leader at full ink, the two spans lying on their
   rails (the lower one shorter), +29,5 and +2,1 on Poland's and Sweden's leaders; the credit on one line.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | sixteen countries in 2000 | — (furniture) | both rails on one scale, the ticks, « 2000 » and « 2024 », the sixteen chips on the 2000 strip | Poland the floor, Sweden the ceiling in 2000 |
| `reveal` | every country moved right | **trace** | floor first, in the order of 2000, a copy of each chip leaves its pin and travels to its 2024 seat (an arrival, eased), its leader drawn behind it, its stem arriving as it lands | all sixteen rose; no two chips of a strip touch |
| `subject` | the floor rose 29,5, the ceiling 2,1 — so the field closed by 27,4 | **filter + name + compare** | the other fourteen step back; Poland's and Sweden's leaders thicken, « +29,5 » and « +2,1 » written beside them; the 2000 span traces along its rail from Poland to Sweden (linear: a measured axis); a copy of it slides down onto the 2024 rail pinned to Sweden's 2024 share — a translation, its length kept; the part past Poland's 2024 pin turns to the guide tone, « −27,4 » over it | copy length = 2000 span; its right end = Sweden 2024; overhang = 29,5 − 2,1 = 27,4 |
| `conclusion` | the whole field, twice | **pull back** | the overhang and its figure fold away, leaving the 2024 span; the fourteen back at full ink; the credit | nothing stepped back |
| `hold` | the two strips | — | nothing | hold = conclusion |

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
        "poland-the-floor",
        "sweden-the-ceiling-in-2000"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace"
      ],
      "start": 105,
      "duration": 120,
      "asserts": [
        "all-sixteen-rose",
        "no-two-chips-of-a-strip"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "filter",
        "name",
        "compare"
      ],
      "start": 225,
      "duration": 210,
      "asserts": [
        "copy-length-2000-span",
        "its-right-end-sweden-2024",
        "overhang-29-5-2-1-27"
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

The codes, the ticks, the two years, three figures. A brisk rhythm: 19 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "poland-the-floor",
    "sweden-the-ceiling-in-2000",
    "all-sixteen-rose",
    "no-two-chips-of-a-strip",
    "copy-length-2000-span",
    "its-right-end-sweden-2024",
    "overhang-29-5-2-1-27",
    "nothing-stepped-back",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "poland-the-floor",
      "sweden-the-ceiling-in-2000"
    ],
    "reveal": [
      "all-sixteen-rose",
      "no-two-chips-of-a-strip"
    ],
    "subject": [
      "copy-length-2000-span",
      "its-right-end-sweden-2024",
      "overhang-29-5-2-1-27"
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
    "one-scale-for-both-lanes-over": null,
    "the-slid-span-length-equals-the": null,
    "no-two-chips-of-a-lane": null,
    "asserted-per-shot": null
  }
}
```

---
format: video
size: landscape
type: line
medium: chart
grounding: supported
derived: v1
---

# Beat — En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967 (video)

**Type:** line. **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen series (`../co2-suisse/data.csv`, Global Carbon Budget 2025 via Our World in Data) and the same
geometry (`../co2-suisse/crossing-geometry.ts`) as the static line beat: territorial CO₂, 1950–2024, peaking at 46,2 Mt in
1973, back under the 1967 level (32,5 Mt) at 32,1 Mt in 2024. Asserted: the peak is 1973, the 2024 reading is under the
1967 level, and the last year before the peak at or under today's reading is 1966.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the chart on the whole frame: three value ticks (floor, the 1967 level, top), decades along the bottom,
   the credit on one line under them.
3. **No end card** — the video ends on the whole line, 2024 and its landing in 1967 ringed, the level line between them.

## The choreography — an argument, not a reveal

A line's argument is its shape through time. The video **draws the time, then rewinds it**: the line traces 1950 → 2024,
then a level line shoots back from the 2024 reading, the years counting down at its head, until it meets the line on its
way up — in 1967.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the scale | — (furniture) | the ticks and decades | — |
| `reveal` | 75 years of emissions | **trace** | the line draws 1950 → 2024, linear in years; the tip carries « {année} · {valeur} Mt »; « pic de 1973 » once passed | peak = 1973 |
| `subject` | 2024 is back at 1967 | **name + rewind** | the 2024 point ringed; a dashed level line shoots back from it, the year counting down at its head, and lands where the rising line first reached today's reading — « 1967 », ringed | the landing between 1966 and 1967 |
| `conclusion` | — | — | the credit | — |
| `hold` | the line, readable | — | nothing | hold = conclusion |

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
      "duration": 45,
      "asserts": []
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace"
      ],
      "start": 96,
      "duration": 240,
      "asserts": [
        "peak-1973"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "name",
        "rewind"
      ],
      "start": 336,
      "duration": 150,
      "asserts": [
        "the-landing-between-1966-and-1967"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [],
      "start": 486,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 546,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The tip label, « pic de 1973 », the year at the head. No rule named in advance: the rewind finds 1967. A brisk rhythm: 20,2 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "peak-1973",
    "the-landing-between-1966-and-1967",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [],
    "reveal": [
      "peak-1973"
    ],
    "subject": [
      "the-landing-between-1966-and-1967"
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
    "a-gap-in-the-series-breaks": null,
    "the-peak-the-last-reading-and": null,
    "the-traversal-is-linear-in-the": null,
    "asserted-per-shot": null
  }
}
```

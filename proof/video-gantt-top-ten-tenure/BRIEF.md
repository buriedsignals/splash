---
format: video
size: landscape
type: gantt
medium: chart
grounding: supported
derived: v1
---

# Beat — Six pays n'ont jamais quitté le top 10 des émetteurs depuis 1990 (video)

**Type:** gantt (positioned spans on a shared date axis). **Medium/format:** chart / **video**. **Size:** landscape
(1920 × 1080).

Same subject, same frozen file (`../static-gantt-top-ten-tenure/data.csv`, Global Carbon Budget 2025 via Our World in Data)
and the same derivation as `proof/static-gantt-top-ten-tenure`: the ten largest emitters each year 1990–2024, every
country's runs of consecutive years, the rows by first year then tenure. Asserted: sixteen countries, six every year and
they are the first six rows, Italy and South Korea the two interrupted rows, and the count of the 1990 ten who never left
runs from 10 to 6.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — sixteen rows, their names at the left, the years under them; the count over the rows, no plate.
3. **No end card** — the video ends on the whole chart, the six in the accent; the credit on one line. About 18 s.

## The choreography

What only a video can do is **run the clock**: every bar grows year by year, linear in years, so a bar that stops is seen
stopping, and the count of the 1990 ten who never left falls at the very moment one of them does.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | who was in the ten in 1990 | — (furniture) | sixteen empty rows; the ten names of 1990 in ink, the six later entrants muted | the 1990 ten |
| `reveal` | 35 years of membership | **sweep + trace + count** | a year cursor sweeps 1990 → 2024, the year riding it under the rows and the ten seats of that year marked on it — the seats change hands as it moves; the bars grow behind it; « {n} pays jamais sortis » falls 10 → 9 → 8 → 7 → 6, each drop muting the name of the country that left | 10 to 6; ten seats a year |
| `subject` | these six never left | **filter** | the six rows take the accent, the ten others step back | the six |
| `conclusion` | the whole tenure | **release** | the ten others come back — the whole chart — the six kept in the accent; the credit on one line | — |
| `hold` | the tenure | — | nothing | hold = conclusion |

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
      "asserts": [
        "the-1990-ten"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "sweep",
        "trace",
        "count"
      ],
      "start": 96,
      "duration": 240,
      "asserts": [
        "10-to-6",
        "ten-seats-a-year"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "filter"
      ],
      "start": 336,
      "duration": 75,
      "asserts": [
        "the-six"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "release"
      ],
      "start": 411,
      "duration": 60,
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

No standfirst, no reading line, no span labels: the viewer has watched each bar grow and stop; the count names the claim.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "the-1990-ten",
    "10-to-6",
    "ten-seats-a-year",
    "the-six",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "the-1990-ten"
    ],
    "reveal": [
      "10-to-6",
      "ten-seats-a-year"
    ],
    "subject": [
      "the-six"
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
    "a-bar-drawn-length-is-proportional": null,
    "the-runs-are-computed-from-the": null,
    "the-count-every-step-is-tied": null,
    "asserted-per-shot": null
  }
}
```

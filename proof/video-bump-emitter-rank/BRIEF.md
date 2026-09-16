---
format: video
size: landscape
type: bump
medium: chart
grounding: supported
derived: v1
---

# Beat — L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂ (video)

**Type:** bump (ranking over time). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-bump-emitter-rank/data.csv`, Global Carbon Budget 2025 via Our World in Data) and
the same derivation as `proof/static-bump-emitter-rank`: the top ten by year 1990–2024, the sixteen countries ever in it, a
line stopping where a country leaves. Asserted: India 8th in 1990, 3rd in 2024; among the countries still in the top ten it
passed Germany (1999), Japan (2006) and Russia (2009).

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — ten rows, years along the bottom; the 1990 ranks named at the left, the 2024 ranks at the right.
3. **No end card** — the video ends on the whole chart, India in the accent; the credit on one line.

## The choreography — an argument, not a reveal

A bump chart's argument is its crossings. The video **follows the climber**: the camera closes in on India's tip and tracks
it as the clock runs, every line in the top ten named at its tip, so each pass happens in close-up between two named lines
— then the camera pulls back and the whole climb is seen at once.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the top ten in 1990 | — (furniture) | the ten rows; the 1990 names, India 8th in the accent | India 8th in 1990 |
| `reveal` | 35 years of the ranking, up close | **track + trace + name** | the camera closes ×1,7 on India's tip and holds it while every line advances 1990 → 2024; the lines named at their tips; the year in the corner; « Inde · {rang}e » rides India's tip; each pass ringed as it happens | India 3rd in 2024; every pass |
| `subject` | India passed Germany, Japan and Russia | **pull back + filter** | the camera pulls back to the whole chart, the 2024 names landing; every line but India and the three it passed steps back | the three still in the top ten |
| `conclusion` | the whole ranking | **release** | every line comes back; the credit | — |
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
      "gesture": [],
      "start": 51,
      "duration": 60,
      "asserts": [
        "india-8th-in-1990"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "track",
        "trace",
        "name"
      ],
      "start": 111,
      "duration": 270,
      "asserts": [
        "india-3rd-in-2024",
        "every-pass"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "pull back",
        "filter"
      ],
      "start": 381,
      "duration": 90,
      "asserts": [
        "the-three-still-in-the-top"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "release"
      ],
      "start": 471,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 531,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The names, the year, India's rank. A brisk rhythm: 19,7 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "india-8th-in-1990",
    "india-3rd-in-2024",
    "every-pass",
    "the-three-still-in-the-top",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "india-8th-in-1990"
    ],
    "reveal": [
      "india-3rd-in-2024",
      "every-pass"
    ],
    "subject": [
      "the-three-still-in-the-top"
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
    "rank-at-each-period-is-computed": null,
    "every-pass-named-in-the-words": null,
    "the-tracking-camera-zoom-is-a": null,
    "asserted-per-shot": null
  }
}
```

---
format: video
size: landscape
type: parallel-coordinates
medium: chart
grounding: supported
derived: v1
---

# Beat — 2 pays sur 16 ont plus de 25 % de nucléaire et plus de 20 % d’éolien (video)

**Type:** parallel coordinates (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-parallel-coordinates-electricity-mix/data.csv`, Ember / Energy Institute via
Our World in Data, 2024) and the same assertions as `proof/static-parallel-coordinates-electricity-mix`: sixteen
countries, seven axes, each the source's share of the country's own generation (all nine columns); five clear 25 % of
nuclear, ten clear 20 % of wind, two do both — Finland and Sweden; the correlation between the two shares is negative.

## The argument, in one sentence

A country's electricity is one bar that stands up, source by source, onto seven rails — its line is the tops; sixteen
such lines, and opening the gap between the two adjacent rails the claim is about, a floor rising on the nuclear rail
leaves five lines, a floor rising on the wind rail leaves two.

## One scale for the seven rails

The still fits each rail to its own column. The video stands a country's pieces up on the rails keeping their lengths, so
**every rail carries the same scale** (0–70 %): a height is a share everywhere, and the slope between two neighbours is a
difference in points, not an artefact of two ceilings. The floors (« 25 % », « 20 % ») are the scale's only numbers.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — seven rails, names at their heads, sixteen lines; names seated once per line, at its highest vertex (« R.-U. » only where the full name would cross a neighbouring rail
   on every rail);
   in the close-up the eight lines with some nuclear named beside the nuclear rail; the count « {n} pays » between the two
   close rails.
3. **No end card** — the whole chart, Finland and Sweden in the accent, the two floors marked on their rails; the credit on
   one line.

## The choreography — an argument, not a reveal

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | a country is its mix, stood on seven rails | **whole → split → stand + trace** | Finland's electricity grows along the foot as one bar, « 100 % » at its end; gaps cut it into its seven sources and the rest; each piece rises onto its rail keeping its length (the rest fades), the rail and its name arriving as it lands; Finland's line joins the tops, the pieces thin into it, its name travels to its seat | bar = 100 × scale; every piece's length = share × scale at every frame; a standing piece's top = the line's vertex |
| `reveal` | sixteen countries, sixteen lines | **trace** | the fifteen other lines drawn across the rails one after another, the largest nuclear share first; each name arrives at its seat | all 16 drawn, all 16 named |
| `subject` | only two clear both floors | **magnify + sweep + count** | the gap between the nuclear and wind rails opens across the frame (heights kept, the other rails slide out); a floor rises on the nuclear rail to 25 %, each line it passes steps back, « 16 pays » falls to « 5 pays »; a floor rises on the wind rail to 20 %, « 5 pays » falls to « 2 pays », Belgium last at 18,5 %; Finland and Sweden take the accent | count = lines at or above both floors, at every frame; 5 then 2; vertex heights identical in the close-up |
| `conclusion` | the whole chart, the lesson marked | **pull back** | the rails close back to the overview, every line returns, the pair in the accent, the two floors marked on their rails; the credit | nothing stepped back |
| `hold` | the chart | — | nothing | hold = conclusion |

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
        "whole",
        "split",
        "stand",
        "trace"
      ],
      "start": 51,
      "duration": 135,
      "asserts": [
        "bar-100-scale",
        "every-piece-length-share-scale-at",
        "a-standing-piece-top-the-line"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace"
      ],
      "start": 186,
      "duration": 105,
      "asserts": [
        "all-16-drawn",
        "all-16-named"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "magnify",
        "sweep",
        "count"
      ],
      "start": 291,
      "duration": 216,
      "asserts": [
        "count-lines-at-or-above-both",
        "at-every-frame",
        "5-then-2",
        "vertex-heights-identical-in-the-close"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 507,
      "duration": 78,
      "asserts": [
        "nothing-stepped-back"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 585,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

Rail names, country names, « 100 % », the two floors, « {n} pays ». A brisk rhythm: 21,5 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "bar-100-scale",
    "every-piece-length-share-scale-at",
    "a-standing-piece-top-the-line",
    "all-16-drawn",
    "all-16-named",
    "count-lines-at-or-above-both",
    "at-every-frame",
    "5-then-2",
    "vertex-heights-identical-in-the-close",
    "nothing-stepped-back",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "bar-100-scale",
      "every-piece-length-share-scale-at",
      "a-standing-piece-top-the-line"
    ],
    "reveal": [
      "all-16-drawn",
      "all-16-named"
    ],
    "subject": [
      "count-lines-at-or-above-both",
      "at-every-frame",
      "5-then-2",
      "vertex-heights-identical-in-the-close"
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
    "every-rail-carries-the-same-stated": null,
    "the-count-is-recomputed-as-lines": null,
    "vertex-heights-are-identical-between-the": null,
    "asserted-per-shot": null
  }
}
```

---
format: video
size: landscape
type: heatmap
medium: chart
grounding: supported
derived: v1
---

# Beat — Trois chemins vers une électricité bas-carbone, 12 pays européens × 9 sources (video)

**Type:** heatmap (matrix). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../static-heatmap-europe-electricity/data.csv`, Ember / Energy Institute via Our World in
Data, 2024) and the same derivation as `proof/static-heatmap-europe-electricity`: Ukraine dropped (no generation reported),
the seven countries past 94 % low-carbon across the whole file plus the largest producers to twelve rows, rows by
low-carbon share, columns by family, six stepped classes in one hue. Asserted: seven countries past 94 %, partitioned into
three disjoint routes — without nuclear (Islande, Albanie, Norvège), both (Suède, Suisse, Finlande), nuclear-led (France,
67,7 %) — and Russia, Europe's largest producer, last.

## The argument

A heatmap row is one country's whole production cut into its sources: the video lays each country's electricity down as
one bar of 100 %, counts the seven past 94 %, then splits every bar into its nine sources, each length becoming the colour of
its cell — and regroups the seven so the nuclear column shows three routes.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — twelve bars of 100 % across the grid over a dashed 94 % line, the count beside the top rows; then the
   matrix: heads and families above, the low-carbon share column and the bracket at the right, the key and the credit under.
3. **No end card** — the video ends on the whole matrix in rank order, the seven bracketed, « 7 pays ».

## The choreography

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | each country's electricity is a whole; seven are past 94 % | **reveal in order + count** | row after row, a bar grows across the grid's width to 100 %, linear in share, its sources as segments — low-carbon in the accent, fossil in a neutral — over the dashed « 94 % » line; « {n} pays » climbs beside the top rows as each bar past the line lands | 7 countries past 94 %; every bar's segments sum to the grid width |
| `reveal` | the whole splits into its sources; a length becomes a colour | **transform** | row after row, each segment slides to its source's column and folds into its cell, taking its class's colour; the 94 % line goes; the heads, families, share column, bracket and key come in | every segment lands on its cell; its class is its share's |
| `subject` | three routes | **filter + reorder + compare** | the five other rows step back; Norvège and Suède swap rows; the seven part into three blocks; the single bracket becomes three — « renouvelables », « les deux », « nucléaire » — and the nuclear column of the seven is ringed: empty, middle, dark | the partition 3 + 3 + 1 = 7; only one pair of rows moves |
| `conclusion` | the whole matrix | **pull back** | the names and ring go, the blocks close, the two rows swap back, the others come back — the whole matrix in rank order, the seven bracketed, « 7 pays »; the credit on one line | rank order restored |
| `hold` | the picture | — | nothing | hold = conclusion |

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
        "count"
      ],
      "start": 51,
      "duration": 135,
      "asserts": [
        "7-countries-past-94",
        "every-bar-segments-sum-to-the"
      ]
    },
    {
      "shot": "reveal",
      "gesture": [
        "transform"
      ],
      "start": 186,
      "duration": 135,
      "asserts": [
        "every-segment-lands-on-its-cell",
        "its-class-is-its-share"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "filter",
        "reorder",
        "compare"
      ],
      "start": 321,
      "duration": 150,
      "asserts": [
        "the-partition-3-3-1-7",
        "only-one-pair-of-rows-moves"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [
        "pull back"
      ],
      "start": 471,
      "duration": 90,
      "asserts": [
        "rank-order-restored"
      ]
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 561,
      "duration": 60,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

The country names, « 94 % », « 7 pays », the source heads and the three family names, the share column, the three route
names, the key's breaks. A brisk rhythm: 20,7 s.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "7-countries-past-94",
    "every-bar-segments-sum-to-the",
    "every-segment-lands-on-its-cell",
    "its-class-is-its-share",
    "the-partition-3-3-1-7",
    "only-one-pair-of-rows-moves",
    "rank-order-restored",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [
      "7-countries-past-94",
      "every-bar-segments-sum-to-the"
    ],
    "reveal": [
      "every-segment-lands-on-its-cell",
      "its-class-is-its-share"
    ],
    "subject": [
      "the-partition-3-3-1-7",
      "only-one-pair-of-rows-moves"
    ],
    "conclusion": [
      "rank-order-restored"
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
    "the-class-breaks-are-computed-once": null,
    "every-segment-length-is-its-share": null,
    "the-partition-the-claim-rests-on": null,
    "asserted-per-shot": null
  }
}
```

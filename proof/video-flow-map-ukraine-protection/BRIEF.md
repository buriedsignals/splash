---
format: video
size: landscape
type: flow-map
medium: map
grounding: supported
derived: v1
---

# Beat — 4,5 millions d'Ukrainiens sous protection temporaire ; l'Allemagne et la Pologne en accueillent la moitié (video)

**Type:** flow map (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen data (`../static-flow-map-ukraine-protection/data.csv`, Eurostat migr_asytpsm, 2026-06) and
the same assertions as `proof/static-flow-map-ukraine-protection`: the subject is the largest host, the two largest take
about half (49,1 %), the total is over four million (4 504 080). One band per host, its width the number of people, each
leaving the node at its own bearing with a slight bow; the camera is the box the ten largest hosts need.

## The map: the live MapTiler map of the scrolly pilot (2026-09-15)

The owner (2026-09-15): the map videos are produced « comme dans scrolly » — `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`.

- **The plan** (`map-plan.mjs`): MapTiler dataviz style, flat Web Mercator, every country drawn by the basemap; the sea
  the bare ground and the land one step off it (`PALETTE.md`). The still camera fits the box the origin and the ten
  largest hosts need (their seats, the vertex mean inside the static window, padded 16 %) "meet" into the stage right of
  the key column; it never moves, so each direction has its own (its key column's width).
- **The bands** are one GeoJSON `line` layer each, the arc (the same bow in px) sampled in Bun and taken back to
  lon/lat, the width a constant in px, the opacity bound per band. **The trace is a cut, not a gradient**: a
  `line-gradient` reads `line-progress`, which `validateScrollyPlan` refuses in a binding, and a `line-dasharray`
  restarts at every tile edge. At each frame the composition hands a band's source its arc cut at the drawn share of
  its px length (`arcAt`, `setData`); a GeoJSON source counts as loading until re-tiled, so the frame waits for it.
- **On the map**: the node (circle + « Ukraine » symbol) and the ten named hosts — a seat dot and a symbol layer each
  (text at the axis size, ≥ 30 px), bound to the name's arrival. A name stands beside the seat dots, never on one.
- **The words outside the map** (the counts, the width scale, the credit) stay SVG, placed from `measured.json`: the
  real map measured once at the last frame (`measure.mjs`), its projected seats matching `projectorOf` to a tenth of a
  pixel; the key over measured open sea clear of every band; the names placed on it, their halos the measured colour.
- **The credit** is one line over open sea with « © MapTiler © OpenStreetMap ». The bottom-left sea holds only
  « Eurostat, 2026-06 · © MapTiler © OpenStreetMap » — provisional, the owner to rule.
- The key reaches MapTiler only through the local proxy; `no-key.live.test.ts` holds every output to it.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the map on the whole frame, the sea the bare ground and the land one step off it (the still's
   `PALETTE.md`); the key — the counts and the width scale — standing in a column at the left, the camera fitted to its right.
3. **No end card** — the video ends on every band with the ten largest hosts named; the credit in a free corner.

## The choreography

What only time can do here is **the trace**: each band drawing itself out of Ukraine toward its host, the largest first,
while the count of people climbs — the total built band by band.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | everyone leaves from here | — (furniture) | the land; the node on Ukraine lands with its name; the width scale comes up | — |
| `reveal` | 4,5 million people, host by host | **trace + count up** | the bands draw out of the node, largest first; each host's name lands as its band arrives (the ten largest); « personnes » climbs to 4 504 080 | total > 4 M |
| `subject` | Germany and Poland take half | **filter + count up** | every other band steps back; « Allemagne + Pologne : 49,1 % » counts up | DEU largest; top two 45–55 % |
| `conclusion` | — | — | the others return; the credit is set | — |
| `hold` | the flow map, readable | — | nothing | hold = conclusion |

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
      "asserts": []
    },
    {
      "shot": "reveal",
      "gesture": [
        "trace",
        "count up"
      ],
      "start": 117,
      "duration": 210,
      "asserts": [
        "total-4-m"
      ]
    },
    {
      "shot": "subject",
      "gesture": [
        "filter",
        "count up"
      ],
      "start": 333,
      "duration": 120,
      "asserts": [
        "deu-largest",
        "top-two-45-55"
      ]
    },
    {
      "shot": "conclusion",
      "gesture": [],
      "start": 459,
      "duration": 60,
      "asserts": []
    },
    {
      "shot": "hold",
      "gesture": [],
      "start": 519,
      "duration": 90,
      "asserts": [
        "hold-conclusion"
      ]
    }
  ]
}
```

## Write as little as the picture allows

No standfirst, no reading line (« le tracé n'est pas un itinéraire »), no note on the hosts left unnamed. The key is two
counts and two widths; a host's label is its name and its number.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.

## Precision

```json splash:precision
{
  "kind": "time",
  "rounding": null,
  "asserts": [
    "total-4-m",
    "deu-largest",
    "top-two-45-55",
    "hold-conclusion"
  ],
  "values": {},
  "perShot": {
    "establish": [],
    "reference": [],
    "reveal": [
      "total-4-m"
    ],
    "subject": [
      "deu-largest",
      "top-two-45-55"
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
    "the-route-drawn-order-matches-the": null,
    "a-band-width-is-the-quantity": null,
    "the-camera-is-the-box-the": null,
    "asserted-per-shot": null
  }
}
```

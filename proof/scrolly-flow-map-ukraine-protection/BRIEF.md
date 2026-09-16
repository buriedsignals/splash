---
format: scrolly
type: flow map
medium: map
grounding: supported
derived: v1
---

# Beat — 4,5 millions d'Ukrainiens sous protection temporaire ; l'Allemagne et la Pologne en accueillent la moitié (scrolly)

**Type:** flow map (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `flow map` type in the scrolly format, drawn once per filed direction from the same flows, claim, assertions,
ten drawn bands and camera rule as `static-flow-map-ukraine-protection`.

## The choreography

A fan out of one origin is read band by band, largest first; the scroll traces them in that order and counts what
they carry (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | June 2026: 4,504,080 people in 31 countries | — | Ukraine's node on the map; the total |
| 2 | one band per host, width is people; the widest to Germany, 27.8 % | **trace + count** | the band traced out of Ukraine to Germany; the share counts |
| 3 | the second, Poland: together 49.1 %, half | **trace + count** | Poland's band; the share reaches 49.1 % |
| 4 | the eight next, Czechia to Austria: 81 % | **trace + count** | eight bands traced one after another, each named as it arrives |
| 5 | the 21 other countries, 19 %: a dot each | **reveal** | a dot at each smaller host in frame |
| 6 | the bands are not itineraries; only width measures | **pull back** | everything, the two largest named in bold, the width key |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "trace",
        "count"
      ],
      "changes": [
        "bands"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "trace",
        "count"
      ],
      "changes": [
        "bands",
        "pair"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "trace",
        "count"
      ],
      "changes": [
        "bands",
        "pair"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "reveal"
      ],
      "changes": [
        "others"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "key",
        "pair"
      ]
    }
  ]
}
```

## Precision

- **Vectors in the equal-area projection**, land one step off the bare-ground sea (floored so the coast reads on
  `nocturne`), seats at the area-weighted centre of each country's part in frame.
- **The camera is the static beat's box** (Ukraine and the ten hosts, padded), fitted with room kept for the
  western names and for Ukraine's node, so neither is cut at the stage edge.
- **Widths in pixels**: the widest band takes up to 18 px and every other its share; the key's bars are drawn at
  the same scale. Bands bow away from the fan's mean bearing so close bearings part.
- **On a narrow stage** only the five largest bands carry a name, the node carries the origin's code, and the fan
  sits in the upper part of the stage above the resting card.
- **Every sentence is asserted**: Germany the largest host, the two largest between 45 and 55 %, a total over four
  million, one month in the file.
- **Batch pass (2026-09-16)**: all three directions baked and rendered. The reference box (fitted to the
  origin and ten hosts, not the whole window every other map in this batch uses) came out wider than the
  measured 1280×800 stage, so `shapeSelectionCss` picked the phone-baked "tall" image at the desktop
  breakpoint — its own top anchor lost under a centred `object-fit: cover`, 36.6 % of the wide stage's pixels
  off from the live map. Fixed by flooring the reference height so "wide" always covers the measured wide
  viewport (`render-directions-scrolly.mjs`); the camera's own zoom and centre are unchanged, since neither
  depends on the reference's height. `verify-scrolly.mjs` and `verify-live-map-scrolly.mjs` clean on all
  three; the swap check on `creme` now reads 0.33 % (wide) and 0.11 % (tall), labels only.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "vectors-in-the-equal-area-projection",
    "the-camera-is-the-static-beat",
    "widths-in-pixels",
    "on-a-narrow-stage",
    "every-sentence-is-asserted",
    "batch-pass-2026-09-16"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "the-route-drawn-order-matches-the": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.

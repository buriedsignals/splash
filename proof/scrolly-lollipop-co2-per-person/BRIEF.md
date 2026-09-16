---
format: scrolly
type: lollipop
medium: chart
grounding: supported
derived: v1
---

# Beat — La Chine a triplé son CO₂ par personne depuis 2000 ; l'Américain moyen n'en émet plus que 1,7 fois plus (scrolly)

**Type:** lollipop (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `lollipop` type in the scrolly format, drawn once per filed direction from the same data, computed six, claim and
assertions as `static-lollipop-co2-per-person`.

## The choreography

A lollipop pair reads levels first and the gap second; the scroll grows the levels one year at a time, then measures
the one gap the headline is about (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the six largest emitters; in 2000, 21.4 t per American, 2.9 t per Chinese | **grow** | six tinted stems rise from zero |
| 2 | in 2023 China climbs to 8.6 t, the United States falls to 14.3 t | **grow** | a solid stem rises beside each, China ringed |
| 3 | China and the United States side by side | **filter + move** | the other four leave; the two pairs slide to either side of the centre |
| 4 | 7.5 times in 2000, 1.7 times in 2023 | **measure** | a dashed rule at China's head across to the American stem and a span up it, for each year |
| 5 | four up, two down | **reveal** | the six return with their triangles and percentages |
| 6 | the reading line; the six are 63.9 % of the world | **pull back** | the static plate |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "grow"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "grow"
      ],
      "changes": [
        "after"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "filter",
        "move"
      ],
      "changes": [
        "pair"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "measure"
      ],
      "changes": [
        "ratio"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "reveal"
      ],
      "changes": [
        "change",
        "pair",
        "ratio"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "share"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: six slots, two stems each, head radius with the slot width; on a narrow slot
  the earlier year label steps aside once the later stem is drawn, and the triangle sits above its number at the
  axis size.
- **One hue, two chromas**: the earlier stem is a tint of the later one's hue, floored against the ground.
- **Every sentence is asserted**: China and the United States among the computed six, China at least ×2.5, the ratio
  from above five to between one and two and a half, the American average down, the six above 55 % of the world.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "one-hue-two-chromas",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "stem-length-is-proportional-to-the": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.

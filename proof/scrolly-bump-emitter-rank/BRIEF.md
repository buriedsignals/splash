---
format: scrolly
type: bump
medium: chart
grounding: supported
derived: v1
---

# Beat — L'Inde est passée du 8e au 3e rang mondial des émetteurs de CO2 (scrolly)

**Type:** bump (ranking over time). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `bump` type in the scrolly format, drawn once per filed direction from the same frozen Global Carbon Budget file,
ranking and claim as `static-bump-emitter-rank`, with the country names in French.

## The choreography

A still bump chart has to draw every crossing at rest; the scroll gives the crossings back their moment — the playhead
reaches each one, and it is ringed as it happens (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the ten largest emitters in 1990, first at the top: the United States lead, India 8th | **reveal** | the 1990 column, ten names |
| 2 | by 1999 India passes the United Kingdom (1991), Ukraine (1992) and Germany (1999) | **trace** | the playhead draws the lines to 1999, each pass ringed as it is reached |
| 3 | then Japan (2006) and Russia (2009): India 3rd; China passed the United States in 2006 | **trace** | the playhead to 2009; China's swap visible and not ringed |
| 4 | to 2024, India holds 3rd | **trace + filter** | the playhead to 2024, every other line stepping back, the latest pass captioned |
| 5 | two of the passed countries have since left the top ten: the United Kingdom after 2008, Ukraine after 1995 | **highlight** | their lines in the ink, where they stop written |
| 6 | the reading line | **pull back** | the static plate |

```json splash:choreography
{
  "kind": "scroll",
  "cards": [
    {
      "card": 1,
      "gesture": [
        "reveal"
      ],
      "changes": []
    },
    {
      "card": 2,
      "gesture": [
        "trace"
      ],
      "changes": [
        "year"
      ]
    },
    {
      "card": 3,
      "gesture": [
        "trace"
      ],
      "changes": [
        "year"
      ]
    },
    {
      "card": 4,
      "gesture": [
        "trace",
        "filter"
      ],
      "changes": [
        "retreat",
        "year"
      ]
    },
    {
      "card": 5,
      "gesture": [
        "highlight"
      ],
      "changes": [
        "exit",
        "rings"
      ]
    },
    {
      "card": 6,
      "gesture": [
        "pull back"
      ],
      "changes": [
        "exit",
        "retreat",
        "rings"
      ]
    }
  ]
}
```

## Precision

- **Laid out in the reader's pixels**: one row a rank, one column a year, names at the playhead; a line that leaves the
  top ten stops at its last year, and its name fades within half a year of it.
- **Crossings are derived from the values**, not the ranks: a country above India in the top ten one year and below it
  the next; a caption waits until the playhead's names have moved clear of it.
- **Every sentence is asserted**: every year present, India in the top ten throughout, 8th in 1990 and 3rd in 2024,
  the five passes and their years exactly, India 3rd every year from 2009, the United Kingdom and Ukraine the only
  passed countries no longer in the top ten.

```json splash:precision
{
  "kind": "scroll",
  "rounding": null,
  "asserts": [
    "laid-out-in-the-reader-pixels",
    "crossings-are-derived-from-the-values",
    "every-sentence-is-asserted"
  ],
  "values": {},
  "perCard": {},
  "covers": {
    "claim-datum": null,
    "rank-at-each-step-is-computed": null,
    "asserted-per-card": null
  }
}
```

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.

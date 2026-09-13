# rapport

- name: Rapport
- measuredFrom: projects-propublica-org-california-farmers-colorado-river
- ground: #FFFFFF
- groundSource: chosen
- accent: #1F5C8B
- accentSource: chosen
- leadingSource: chosen
- pad: 46
- header: split
- headRule: true

## Ground and accent

**Both are CHOSEN, and neither is in the reference.** Re-measured on 2026-09-08, after the harvester
repair, the reference's graphic — the Colorado basin map, `img 1399 x 1105` — reads a ground of
`#E1E4E6` and an accent of `#2A86C5`, the blue of the arrow leaving the delta. Neither is what this
direction takes, and the reasons are below rather than in a paragraph a machine cannot count.

- `ground: #FFFFFF` — the reference's map sits on `#E1E4E6`, a pale grey field; the page behind it is
  effectively white. White is taken as the direction's paper, and the reference's pale grey is read
  as its own choice of a quiet field for a terrain plate rather than as this direction's ground.
- `accent: #1F5C8B` — a step deeper than the reference's own `#2A86C5`, which reads 3.09:1 on
  `#E1E4E6` and would fail the 4.5 text floor for the two registers that set type in the accent
  (`eyebrow`, `value`). An accent here must carry emphasis at nine and a half points; the map's
  arrow blue is sized to work at 1400 px wide.

## Registers

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | serif | 27 | 700 | no | −0.3 | none | ink | 0.9706 |
| eyebrow | sans | 9.5 | 700 | no | 1.6 | uppercase | accent | 0.8812 |
| body | serif | 13 | 400 | **yes** | 0 | none | muted | 1.1535 |
| axis | sans | 11 | 400 | no | 0.5 | none | muted | 0.8812 |
| annot | sans | 10 | 700 | no | 1.3 | uppercase | ink | 1.0280 |
| value | sans | 14.5 | 700 | no | 0 | none | accent | 0.8812 |

**The leading is CHOSEN, and calibrated rather than measured.** Nothing harvests a reference's line
height yet — it would also need the reference's own face metrics. Each value is the multiplier every
directed component used to type (`display 1.22`, `body 1.45`, `annot 1.4`, and `1.2` for the
single-line registers) divided by the natural line height of the head of the register's role
ladder, read out of its file. On the head face the page does not move; on any other face the line
follows the face. See `docs/splash/2026-09-13-adaptive-leading-spec.md` §4.

Style route on the reference: **four families** (Tiempos Headline, Tiempos Text, Graphik, graphik),
weights 400 / 500 / 700 / 900, **eight distinct sizes from 13.3 to 47.8 px**, eleven italic runs,
ten letter-spaced runs, and a text column of 78 characters. The serif-prose-against-sans-furniture
split and the italic body are all measurements.

## Stroke

- stroke: series 2.2, rule 1

## Not yet verified

Contrast floors. And the `split` header — title left, caveat right — is this direction's own
composition rather than the reference's; the reference is a scrollytelling piece whose prose floats
over the graphic, which a static beat cannot do.

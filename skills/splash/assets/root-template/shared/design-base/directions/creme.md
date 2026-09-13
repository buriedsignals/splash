# creme

- name: Crème éditoriale
- measuredFrom: abc-net-au-news-2024-05-23-afl-mullet-count-data-analysis-103850072
- ground: #FFFCEE
- accent: #1757B6
- pad: 52
- header: stack
- headRule: true
- leadingSource: chosen

Every value below is a measurement of that reference, with the route that produced it. Nothing here
was chosen for taste.

## Ground and accent

- `ground: #FFFCEE` — pixel route, modal colour, **93.0 % coverage**. A warm paper, not white.
- `accent: #1757B6` — pixel route, the single hue cluster at 216°, carrying its own lighter tints;
  the palette reads **sequential**, one pole.

## Registers

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | serif | 30 | 700 | no | −0.2 | none | ink | 0.9706 |
| eyebrow | sans | 10 | 600 | no | 1.9 | uppercase | accent | 0.8812 |
| body | sans | 13 | 400 | no | 0 | none | muted | 1.0648 |
| axis | sans | 11 | 500 | no | 0.4 | none | muted | 0.8812 |
| annot | serif | 13 | 400 | **yes** | 0 | none | muted | 1.1138 |
| value | sans | 15 | 600 | no | 0 | none | accent | 0.8812 |

**The leading is CHOSEN, and calibrated rather than measured.** Nothing harvests a reference's line
height yet — it would also need the reference's own face metrics. Each value is the multiplier every
directed component used to type (`display 1.22`, `body 1.45`, `annot 1.4`, and `1.2` for the
single-line registers) divided by the natural line height of the head of the register's role
ladder, read out of its file. On the head face the page does not move; on any other face the line
follows the face. See `docs/splash/2026-09-13-adaptive-leading-spec.md` §4.

Style route on the reference: **three families** (`abcserif` for display, `abcsans` and `ABCSans`
for furniture), **11 italic runs, 77 letter-spaced runs, 57 case-transformed runs**. The italic
annotation and the tracked uppercase eyebrow are both taken from those counts, not invented.

## Stroke

- stroke: series 2.5, rule 1

## Not yet verified

Contrast floors have not been measured on this ground. The concrete families above are the
reference's own licensed faces and must be substituted by the typeface ladder at render time;
`a-direction-covers-its-glyphs` decides whether a substitute can set the beat's text.

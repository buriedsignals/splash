# nocturne

- name: Nocturne
- measuredFrom: pudding-cool-2022-06-streaming
- ground: #111044
- accent: #4FE0C0
- pad: 56
- header: centre
- headRule: false

## Ground and accent

- `ground: #111044` — pixel route, modal colour on the piece's own graphic element. A deep saturated
  navy, and the most consequential decision in the direction.
- `accent` — **chosen, not measured, and that is stated plainly.** The reference carries four
  identity hues as thin luminous strokes, which the coverage-weighted pixel route under-reads as a
  single pole at 241° (see the reference's own note). A direction takes one accent, and none of the
  four is the reference's "accent" in this system's sense. `#4FE0C0` is a luminous tone in that
  family, and it must clear the contrast gate on this ground before the direction can be offered.

## Registers

| register | family | size | weight | italic | tracking | case | ink |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| display | geometric sans | 32 | 400 | no | 3.4 | **uppercase** | ink |
| eyebrow | geometric sans | 9.5 | 500 | no | 2.6 | uppercase | accent |
| body | sans | 12.5 | 400 | no | 0 | none | muted |
| axis | geometric sans | 10 | 400 | no | 1.2 | none | muted |
| annot | geometric sans | 10 | 500 | no | 1.8 | uppercase | ink |
| value | geometric sans | 14 | 600 | no | 0 | none | accent |

Style route on the reference: two families (National 2 Web, Poppins), **weights 300 / 500 / 700**,
eleven case-transformed runs, display set light, uppercase and widely tracked. The light display
weight is the reference's own; this repository has never used a weight below 400 anywhere.

## Stroke

- stroke: series 1.8, rule 0.8

Thinner than the light directions, because a dark ground carries more contrast per unit of ink.

## Not yet verified

**Contrast floors, and this direction is the one most likely to fail them.** Not offered until
`a-direction-clears-the-contrast-floors` passes on it.

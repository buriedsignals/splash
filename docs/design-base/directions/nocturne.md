# nocturne

- name: Nocturne
- measuredFrom: pudding-cool-2022-06-streaming
- ground: #111044
- groundSource: measured
- accent: #4FE0C0
- accentSource: chosen
- leadingSource: chosen
- pad: 56
- header: centre
- headRule: false

## Ground and accent

- `ground: #111044` — pixel route, modal colour on the piece's own graphic element. A deep saturated
  navy, and the most consequential decision in the direction.
- `accent` — **chosen, not measured, and that is stated plainly.** The reason has changed, and the
  new one is weaker. The original note said the coverage-weighted pixel route under-read the piece's
  four identity hues as a single pole at 241°; that was an artefact of measuring the page rather
  than the graphic, and the 2026-09-08 re-harvest resolves all four cleanly — `#FDF200`, `#5451CE`,
  `#FB576F`, `#1ED760`, on the piece's own `#111044`. So the measurement is no longer the obstacle.

  What remains is that three of the four are **third-party brand marks** — Spotify's green, Apple's
  pink — and the fourth, the periwinkle of the `ARTIST` mark, reads **2.92:1** on this ground and
  fails the non-text floor. Only the yellow is both the piece's own and legible, at 15.13:1.
  `#4FE0C0` is a luminous tone in the same family and was chosen before any of this was measurable.
  **This is now a live decision rather than a settled one**, and it is recorded here as such.

## Registers

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | geometric sans | 32 | 400 | no | 3.4 | **uppercase** | ink | 1.0008 |
| eyebrow | geometric sans | 9.5 | 500 | no | 2.6 | uppercase | accent | 0.9844 |
| body | sans | 12.5 | 400 | no | 0 | none | muted | 1.0648 |
| axis | geometric sans | 10 | 400 | no | 1.2 | none | muted | 0.9844 |
| annot | geometric sans | 10 | 500 | no | 1.8 | uppercase | ink | 1.1485 |
| value | geometric sans | 14 | 600 | no | 0 | none | accent | 0.9844 |

**The leading is CHOSEN, and calibrated rather than measured.** Nothing harvests a reference's line
height yet — it would also need the reference's own face metrics. Each value is the multiplier every
directed component used to type (`display 1.22`, `body 1.45`, `annot 1.4`, and `1.2` for the
single-line registers) divided by the natural line height of the head of the register's role
ladder, read out of its file. On the head face the page does not move; on any other face the line
follows the face. See `docs/splash/2026-09-13-adaptive-leading-spec.md` §4.

Style route on the reference: two families (National 2 Web, Poppins), **weights 300 / 500 / 700**,
eleven case-transformed runs, display set light, uppercase and widely tracked. The light display
weight is the reference's own; this repository has never used a weight below 400 anywhere.

## Stroke

- stroke: series 1.8, rule 0.8

Thinner than the light directions, because a dark ground carries more contrast per unit of ink.

## Not yet verified

**Contrast floors, and this direction is the one most likely to fail them.** Not offered until
`a-direction-clears-the-contrast-floors` passes on it.

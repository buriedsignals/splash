---
ground: "#16191B"
accent: "#D4A853"
accents: "#5B8A8A"
origin: newsroom
---

# The palette for this story

`palette`'s proposal (`proposePalette`) found no subject convention for "public transport
ridership in Portuguese cities" — none of the grounded conventions (renewables, fossil, water,
heat) fires on a ridership count — so the newsroom's own house colours led, per
`references/subject-conventions.md`.

Both recorded house accents were scored against the house ground and both cleared the 3:1 non-text
floor (WCAG 2.2 SC 1.4.11): `#D4A853` at 8.01:1 (the proposal's `recommended`) and `#5B8A8A` at
4.58:1. Both are recorded here rather than derived at render time, so a
beat that ever needs the second one takes the newsroom's own rather than inventing a shade.

The division of labour, fixed here so three beats cannot disagree about it:

- `#D4A853` — the accent, and it always carries **the subject of the beat**: Lisboa in beat 1,
  Lisboa again in beat 2, Aveiro in beat 3.
- `#5B8A8A` — recorded, and **not used by any of these three beats**. Beat 2 is a slopegraph, and
  `chart-beat/references/types/slope.md` allows at most two hues in total — one neutral for the
  context lines, one accent for the line the reader is meant to notice. A second accent there would
  be a third hue and the beat would have no accent at all.
- everything else is furniture, derived from the ground by `deriveFurniture`, never another colour.

No journalist was present to answer this proposal interactively. Per `skills/palette/SKILL.md`,
"When nobody is there to answer," the proposal's own `recommended` option is recorded verbatim, and
`origin: newsroom` names where it actually came from rather than claiming a journalist answered.

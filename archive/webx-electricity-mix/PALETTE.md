---
ground: "#FFFFFF"
accent: "#009E73"
origin: journalist
---

The answer recorded for this beat: a green the journalist chose — the Okabe-Ito green this beat has
been drawn in since it was first built — kept over the house teal. `origin: journalist` says who
chose it. This is the palette `composeDirections` reconciles the three filed directions against; the
delivered pages under `renders/` are drawn in whichever direction governs them, never in this one.

**The three recorded accents are gone, and what replaced them is a derivation, not a default.** Until
this beat was directed it recorded three hues — `#009E73`, `#0072B2`, `#D55E00` — and `seriesInks`
handed them to the component in the order the stack draws its bands (`STACK_ORDER` in
`stacked-bar-geometry.ts`: renouvelables, nucléaire, fossile). A directed page cannot read them: a
direction hands a beat ONE accent and ONE ground, and two of those three clear no floor at all on
`nocturne`'s `#111044`. `seriesInks` was asked to shade three apart from a single accent instead and
**refuses on all three filed grounds — it runs out at two.** So the bands are derived the way
`proof/web-diverging-stacked-electricity` derives its own, from the direction's two poles:

- **renouvelables** — the direction's accent, untouched. The bottom band, the one the plate's claim
  is about, and the only one that starts from a common line before the reader touches anything.
- **nucléaire** — that accent mixed 55 % toward the direction's ground, then taken to the 3:1 mark
  floor against it.
- **fossile** — the ground mixed 62 % toward the direction's ink, then taken to the same floor.

**The argument for three DISTINCT fills survives the move; it is the answer that changed.** A
100 %-stacked column encodes its three categories by FILL and nothing else — the non-bottom bands
float on a moving floor, so a reader identifies a band by its colour before its position. That is why
the control the page ships repaints NOTHING: `stack.ts` takes neither a lit nor a stepped-back fill
from this beat (the option has no spare channel, and stepping twelve of eighteen segments back to one
neutral would delete the encoding). And it is why the three fills are held to each other and not only
to the page: `readApart` — the trunk's own predicate, contrast OR redmean distance — is asserted over
all three pairs in every direction. The fossil step is `0.62` and not the `0.5` its sibling uses
because at `0.5` the nuclear tint and the fossil neutral FAIL that predicate on both light directions
(creme 1,27:1 at redmean 97 ; rapport 1,27:1 at 73): two adjacent bands a reader cannot tell apart.

Measured, over the nine (direction, band) pairs the page actually draws — fill, its contrast on that
direction's ground, and the ink the printed share is set in against that fill (`inkOnFill`, which
asks which of the direction's two poles reads better on the band BEFORE adjusting either):

| direction | renouvelables | nucléaire | fossile |
| --- | --- | --- | --- |
| creme (`#FFFCEE`) | `#1757B6` 6,64:1 · share in `#FFFCEE` 6,64:1 | `#7c92af` 3,10:1 · share in `#000000` 6,59:1 | `#61605a` 6,13:1 · share in `#FFFCEE` 6,13:1 |
| rapport (`#FFFFFF`) | `#1F5C8B` 7,09:1 · share in `#FFFFFF` 7,09:1 | `#7e95a6` 3,12:1 · share in `#000000` 6,74:1 | `#616161` 6,19:1 · share in `#FFFFFF` 6,19:1 |
| nocturne (`#111044`) | `#4FE0C0` 10,80:1 · share in `#111044` 10,80:1 | `#2d6e7c` 3,08:1 · share in `#FFFFFF` 5,78:1 | `#a5a4b8` 7,28:1 · share in `#111044` 7,28:1 |

**A live decision the composer refuses to hide.** `#009E73` reads **3,42:1** on `#FFFFFF`: clear of
the 3:1 floor an accent must hold as a MARK, and under the 4,5:1 floor a word must hold. Every filed
direction sets its eyebrow and its value register IN THE ACCENT, so `composeDirections` holds up
**no composition at all** for this beat and prints the reason nine times, once per (type, space) pair.
That is not a render failure — the three directions render, each in its own accent — it is the
composer telling the journalist that the colour they recorded cannot carry type on the ground they
recorded it against. Raising it is the newsroom's call, not this file's, and it is written here so
the next reader meets it rather than rediscovering it.

`palette`'s subject option was checked and deliberately NOT taken, and this is the beat where that
matters most. `matchConvention` would fire on BOTH `renewables` and `fossil` here — and it returns
null on a multi-match precisely so no table picks which of two series carries the argument. The
subject conventions also propose ONE accent against a ground, never a categorical set: they are out
of scope for a three-way split by their own reference sheet. So the recorded answer stands.

`render-directions-web.mjs` beside this file reads this record with `readPalette` and names no hex of
its own; `DirectedStackedMixWeb.tsx` names none either — every colour it draws comes from the
direction it is handed.

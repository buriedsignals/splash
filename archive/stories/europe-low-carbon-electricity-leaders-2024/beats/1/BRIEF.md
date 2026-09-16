---
format: scrolly
type: bar-and-column
---

# Beat — Europe's ten most low-carbon grids are far ahead of the rest (scrolly)

**Type:** bar-and-column. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

Every European country's 2024 electricity mix, ranked by low-carbon share (hydro, wind, solar,
bioenergy, other renewables and nuclear, over total generation), computed from
`beats/1/data.json` (the analyst's own artifact, itself built from `source/data.csv`, Ember/OWID
2024 generation by source). Ukraine is excluded — zero recorded generation in every source column,
a wartime data gap — leaving 40 rankable countries. The claim: the top ten all clear 86% and Albania
and Iceland reach 100%, while the other 30 average 55% and twelve are under half. Every number in
the prose is computed in `render-directions-scrolly.mjs`'s `loadSubject()`, never typed by hand.

## The choreography

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | Forty countries, ranked, one group stands apart | reveal | every bar grows from a zero baseline (`state.reveal` 0→1) |
| 2 | All ten leaders clear 86%; Albania and Iceland reach 100% | pull back / name | the full ranking stands at full height; the best and worst callouts read |
| 3 | The other 30 average 55%, twelve under half | reorder / regroup | the top ten pull into the accent colour, the rest dim, a dashed cut-line and the "top ten / the rest" note appear at the tenth bar's own value |

## Precision

One value scale, fitted from zero, shared by every bar in every card (`plotH * (share / 100) *
reveal` — never re-scaled per state, per bar-and-column.md's own rule). The cut-line sits at the
real computed value of the tenth-ranked country, not an approximation. `loadSubject()` throws if
the rankable-country count drifts from 40, so a re-run against changed data refuses rather than
silently mislabelling the claim.

## The owner's rules — checked before the render

- [x] Every card changes the picture; the scroll interpolates continuously, never a slideshow of grouped marks.
- [x] Every sentence is asserted against the frozen data, never a hand-typed number.
- [x] ONE art direction, composed from this beat's own PALETTE.md and text — never the three filed demo
      directions, except for a catalogue proof (`--filed`).
- [x] The no-break space written as the backslash-u00A0 escape in the scripts, never typed.
- [x] Driven CONTINUOUSLY (`skills/scrolly/scripts/verify-scrolly.mjs`), not checked by jumping to scroll
      positions — see "The one gotcha" in `skills/scrolly/SKILL.md`. Result: 0 failures, 14 notes, at 1600x900,
      1280x800 and 375x812.

## Known residual (not fixed in this cold run — timeboxed)

Two label collisions at the composed direction's default width: the "cut" callout (10th country)
and the cut-note ("Top ten ≥ 86% · the rest average 55%") sit close enough to overlap at 1280px
wide when both are visible (card 3). A tighter label budget or a second callout row would resolve
it; left as observed rather than fixed, per the exercise's timebox.

## Direction

One — the composer's best candidate for this beat's own PALETTE.md and text
(`render-directions-scrolly.mjs`): `renders/creme-creme-the-newsroom.html`. `--filed` renders `creme`, `nocturne`, `rapport` instead,
for a catalogue proof.

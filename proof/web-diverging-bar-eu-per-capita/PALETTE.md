---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; **the delivered page is drawn in
whichever direction governs it, never in this one**, so every number below is measured on what the
three rendered files actually paint, read back out of `renders/*.html`.

## What this page has to colour, and why it is exactly two fills

A diverging bar's colour has one job the rest of the bar family does not give it: it carries a
**sign**. So the count is fixed at two by the type sheet — *"exactly two hues, one per sign, both
colourblind-safe — never default to a plain red/green pairing"* — and the pair chosen here is the
direction's own accent against one neutral, which differ in **lightness** as much as in hue and
therefore survive a CVD simulation that a two-hue pair at equal lightness would not.

Above the datum takes the accent; below it takes the neutral. That assignment is generated **per
option**, from the sign the chosen reference gives that row, so the two channels — side of the rule,
and colour — cannot drift apart when the reader moves the zero. It is the treatment
`sign-is-direction-and-hue-only-doubles-it` held in every state of the page rather than only in the
one that was rendered.

Measured on the three files, against the ground each one paints:

| direction | ground | above (accent) | below (neutral) | above : ground | below : ground | above : below |
| --- | --- | --- | --- | ---: | ---: | ---: |
| creme | `#FFFCEE` | `#1757B6` | `#94928a` | 6,64:1 | 3,03:1 | 2,191:1 |
| nocturne | `#111044` | `#4FE0C0` | `#757493` | 10,80:1 | 3,96:1 | 2,732:1 |
| rapport | `#FFFFFF` | `#1F5C8B` | `#949494` | 7,09:1 | 3,03:1 | 2,337:1 |

The neutral is `mix(ground, ink, 0.42)` lifted to the 3:1 non-text floor against that direction's own
ground — it lands **exactly** on 3,03 twice, which is the lift doing its job rather than a coincidence.

## The one measurement this type needs and no other type does

Each fill also has a pointed-at state, darkened (lightened, on `nocturne`) off **its own fill** — no
ring, no dot, no fixed dose. Two floors hold it: it must still read against the ground, and the step
must clear 1,12:1, `proof/web-bar-top-emitters-2024`'s searched floor.

But there is a third, and it belongs to this type alone: **the pointer must not speak louder than the
sign.** If pointing at a bar repainted it by more than the distance between the two signs, a reader
running the mouse down the list would watch bars appear to change sides under their own cursor.

| direction | above → pointed | below → pointed | the two signs apart | margin |
| --- | ---: | ---: | ---: | ---: |
| creme | 1,541:1 | 1,840:1 | 2,191:1 | 19 % |
| nocturne | 1,143:1 | 1,710:1 | 2,732:1 | 60 % |
| rapport | 1,527:1 | 1,837:1 | 2,337:1 | 27 % |

Creme's 19 % is the narrowest margin on the page and it is why this is asserted in the component
rather than assumed. **Mutated:** raising the pointer dose from 0,3 to 0,6 refuses `creme` (3,649:1
against 2,191) and `rapport` (3,693 against 2,337) — and leaves `nocturne` green, correctly, because
lightening a mint on a dark ground moves the ratio less than darkening a blue on a pale one. The
guard measures the pair, not the dose.

## The rule, the graduations and the words — none of them chromatic

The zero rule and every value label are the direction's own ink, taken to the 4,5:1 text floor
against its ground: `#000000` at 20,41:1 on creme, `#ffffff` at 17,78:1 on nocturne, `#000000` at
21,00:1 on rapport. The value labels are ink **including the subject's**, which is the type sheet's
own accessibility trap — *"a value label painted in the bar's own accent hue … is the specific mistake
that has failed WCAG contrast here before"* — and the first pass of this beat had made exactly that
mistake on Croatia's label.

A label with no room outside its bar is drawn **inside** it, and there the ink would face two fills
at once: 6,74:1 and 3,08:1 on creme, 4,49:1 and **1,65:1** on nocturne, where white on the mint is a
word nobody reads. It is not solved with a second ink. `.end-label` already ships a ground chip
(`background: var(--ground)`, the format's own sheet) and this beat does not take it away — the
streamgraph beat overrode it to `transparent` and paid for it in the owner's own reading — so there
is ONE pair to measure, ink against ground, and it is the row above.

The gridlines at ±10,5 t and the axis words are steps off the direction's own ground, computed by
`deriveFurniture` at render time and never written here as a literal. Nothing else on the page is
chromatic, and the newsroom's `#0B7A75` is painted nowhere: it is the colour the three directions are
reconciled AGAINST, not a colour this page draws.

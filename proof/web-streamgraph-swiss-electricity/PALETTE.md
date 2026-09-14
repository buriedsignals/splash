---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one — `creme` `#1757B6` on `#FFFCEE`, `rapport`
`#1F5C8B` on `#FFFFFF`, `nocturne` `#4FE0C0` on `#111044`.

## One hue at nine chromas, because the layer ORDER is the argument

Nine bands, one hue. They are stacked in a stated order — largest through the middle, the thin ones
tapering outward — so their positions are ORDERED, and an ordered set takes a sequential ramp of the
direction's own accent rather than nine categorical hues (`METHOD.md` correction 28). The control
this page ships depends on that: laying a band flat SHEARS the plate and preserves every band's
place in the order, so the ramp still means what it meant, in every state, without one rule
repainting anything. That is also why this beat declares no `lit`/`dim` fills the way
`proof/webx-electricity-mix` declares none — there is no spare channel, and the gesture does not
need one.

## The measurement, and it is a real defect: the ramp does not carry nine steps

Every step is mixed from the direction's ground toward its accent and then lifted, if it falls
short, to the WCAG non-text floor against that ground. Lifting is what makes the pale end usable at
all — and it is also what makes the pale end collapse, because several steps get lifted to the same
place. Adjacent-step contrast, measured on the colours the three pages actually paint:

| step | creme | rapport | nocturne |
|---|---|---|---|
| nucléaire vs hydraulique | 1,230 | 1,264 | 1,217 |
| solaire vs nucléaire | 1,245 | 1,272 | 1,235 |
| biomasse vs solaire | 1,246 | 1,247 | 1,242 |
| éolien vs biomasse | 1,133 | 1,147 | 1,276 |
| gaz vs éolien | **1,011** | **1,005** | 1,296 |
| pétrole vs gaz | **1,011** | **1,012** | 1,146 |
| charbon vs pétrole | **1,016** | **1,009** | **1,010** |
| autres renouv. vs charbon | **1,006** | **1,004** | **1,021** |

**On the two light directions the last five bands are one colour**: four adjacent pairs at or under
1,016:1, which no reader separates. On the dark direction the ramp gets further — the collapse
starts two steps later — so `nocturne` carries six separable bands and the light ones carry four.
This is the ramp limit `METHOD.md` warns about, met head-on: past four or five steps, name rather
than shade.

**What carries identity where the ramp cannot**, and it is the reason nine bands are still honest
here: the stack ORDER, which the shear preserves and which no colour has to encode; the in-band
names on the three bands thick enough to hold one; and — the part the web genre adds — the per-year
readout, which names **all nine sources in rank order** with their TWh. A reader who cannot tell
charbon from pétrole by colour reads them off the pointer, in the order that is the claim.

## Everything drawn ON a band is the ground, and that is two measured pairs rather than thirty-six

The seams between bands, the dashed graduations of the axis an option earns, the casing under the
floor rule, the guide that lights a year, the chip under each carried name and the casing around the
2016 marker are all the direction's own ground. They need nothing measured against nine fills,
because each fill was already lifted to the non-text floor against that exact ground: worst of the
nine, **3,07:1** (creme), **3,08:1** (rapport), **3,05:1** (nocturne). The ink laid on that casing is
the direction's ink taken to the TEXT floor against the ground — **20,41:1**, **21,00:1**,
**17,78:1**. Both pairs are refused in the component before anything is drawn. No opacity is laid
over anything, which is the failure two beats on this branch shipped at 1,75:1 and 2,19:1.

## The pole flip was not a feature — it was the defect, and the arithmetic is closed

The page first solved each in-band name against the fill it sits on, picking whichever of ink and
ground reads better there (`inkOnFill`). The owner's read of `renders/rapport.html` retired that:
*« le petit cercle et texte "solaire" en noir sont pas très lisibles »*.

He is reading the arithmetic. `inkOnFill`'s answer **changes pole between band two and band three** —
on `creme`, hydraulique and nucléaire take the ground `#FFFCEE` (6,64:1 and 5,40:1) while solaire
takes `#000000` (4,71:1) — so one word came out black between two cream ones. And the black is not a
bad choice, it is the *best available*: solaire's fill sits near the middle of the luminance range,
where **4,76:1 is the ceiling** for any ink whatsoever (pure black; pure white reaches 4,41). A
mid-tone fill runs both poles out of room at once. No ink fixes it, so the ink is not where the fix
goes.

The 2016 marker was worse, and for a reason the fill-by-fill rule could not even see. It is r=6 on a
band that is **6,11 units thick in 2016**, so it does not sit on the solaire fill at all — it crosses
**four** of them (nucléaire 2,95 u, solaire 6,11 u, biomasse 2,66 u, éolien 0,28 u) and its single
stroke was measured against none:

| direction | ring, worst fill it crosses | after casing |
|---|---|---|
| creme | 3,78:1 (nucléaire) | 20,41:1 on ground, ground ≥ 3,07:1 on every band |
| rapport | 3,74:1 (nucléaire) | 21,00:1 on ground, ground ≥ 3,08:1 on every band |
| nocturne | **2,00:1** (nucléaire) | 17,78:1 on ground, ground ≥ 3,05:1 on every band |

`nocturne` was **under the 3:1 non-text floor** on the one year the whole claim turns on — a white
ring on the mint end of the ramp, gone. That is a second, independent defect the owner's light-ground
read would never have shown.

Both now take the ground casing the floor rule already used, and both are measured in the component:
the casing against every step of the ramp, the ink against the casing. The worst in-band name goes
from **4,71:1** (creme, solaire, on its band) to **20,41:1** (on its chip); the ring from **2,00:1**
(nocturne) to **17,78:1**.

The axis labels, the x-axis years, the totals at both ends and the sentence under the control are
steps off the direction's own ground, computed by `deriveFurniture` at render time and never written
here as a literal.

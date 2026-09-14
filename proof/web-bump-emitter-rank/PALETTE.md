---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. `palette`'s subject-fit branch was
checked and does not apply: `matchConvention` holds conventions for renewables, fossil fuel, water
and heat, and a country's rank among the world's largest emitters matches none of them. When no
convention applies, the house theme wins.

This file is what `composeDirections` reconciles the three filed directions against; **the delivered
page is drawn in whichever direction governs it, never in this one**, so every figure below is
measured on what a direction actually paints.

## One hue, and the second emphasis is not a colour

A bump chart needs two emphases at once and only one of them may be chromatic.

- **The accent carries the claim.** India's line, and nothing else on the page. The type sheet
  allows two or three accent lines; this beat draws **one**, because the recorded palette carries one
  and a second hue would be a colour nobody chose.
- **The follow control's emphasis is INK, not a hue.** A reader who pulls a line out of the tangle
  gets it in the page's own text ink at a heavier stroke, while the rest of the field steps back.
  That is deliberate and it is what keeps rule 5 true in colour as well as in markup: in every state
  of this page there is exactly one coloured line and it is the subject's, so a reader who follows
  Germany is never looking at two things that claim to be the argument.

Measured on what each direction paints, against its own ground:

| | creme `#FFFCEE` | rapport `#FFFFFF` | nocturne `#111044` |
| --- | --- | --- | --- |
| accent — the subject's line | `#1757B6` · **6,637:1** | `#1F5C8B` · **7,090:1** | `#4FE0C0` · **10,797:1** |
| the field at rest | `#76746E` · **4,542:1** | `#767676` · **4,542:1** | `#81819D` · **4,707:1** |
| the field stepped back | `#939189` · **3,068:1** | `#939393` · **3,072:1** | `#636284` · **3,056:1** |
| a followed line, against the field at rest | **4,494:1** | **4,623:1** | **3,777:1** |
| every name on the plate | `#000000` · **20,411:1** | `#000000` · **21,000:1** | `#FFFFFF` · **17,775:1** |
| a stepped-back name | `#61605A` · **6,131:1** | `#616161` · **6,193:1** | `#A5A4B8` · **7,281:1** |

Nothing here is written as a literal in the component: ground and accent are the direction's, and
`ink` / `muted` / `grid` come from `deriveFurniture` at render time.

## The step back is TWO values and no opacity, and that is measured rather than assumed

"The others recede" has to be a real change in the picture and must still leave a line a reader can
see. So the field sits at **4,5:1** at rest and steps back to **3,0:1** — the non-text floor exactly,
computed with `adjustToContrast` and refused by the component if it lands under it — and the
recession is a change of VALUE, never an opacity. That is not caution in the abstract:
`proof/web-slope-europe-lowcarbon` lifted its neutral to the 3:1 floor and then drew it at
`strokeOpacity={0.75}`, and the lines reached the reader at **2,19:1**. Nothing on this page carries
an opacity except the follow rings, which are revealed from 0 to 1 and never drawn part-way.

## The one place a hue is refused outright

`chart-beat/references/types/bump.md` names this type's own shipped accessibility failure: a name
painted in its line's colour. **The committed render of this page did exactly that** —
`color: l.code === subject ? accent : ink` on both the start label and the end label, so "8e Inde"
and "3e Inde" were in the accent in all three directions. At creme's 6,637:1 the blue would have
passed a contrast check and still been the wrong thing: the rule is not a floor, it is that a name is
text and colour here is already carrying the series.

Every name on this plate — the subject's included — is now in the page's own text ink, at
**17,8:1 to 21,0:1**. The subject is told apart by **weight** (700 against the register's own) and by
a **swatch**: a small filled disc in the accent, beside the name, `aria-hidden`. The sheet's own fix,
in its own words — "carry it on a small decorative swatch glyph next to the name rather than on the
text itself — a decorative mark is exempt from the text-contrast rule in a way the name itself never
is."

## What is not chromatic

The rank rows, the year labels, the follow control's own pills and the sentence it reveals are all
steps off the direction's ground, computed at render time. The control's checked pill is
ink-on-ground and never a series ink, for the reason `level.ts` states one file over: on a chart that
needs this control, colour is already carrying the subject, and a control that borrowed it would make
the colour that means "the claim" also mean "you clicked here".

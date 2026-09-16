---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

This is the palette `composeDirections` reconciles the three filed directions against. **The
delivered page is drawn in whichever direction governs it, never in this one** — the record is what
the composer is held to, not what the pixels are.

## Why the house theme, and not a convention

`palette`'s subject option was checked and has nothing to offer. `matchConvention` holds four
grounded conventions — renewables, fossil, water, heat — and this beat's subject, life expectancy at
birth in Switzerland from 1950 to 2023, fires none of them. Health was among the colours considered
for a convention and left out for the reason `palette/references/subject-conventions.md` gives at
length: the association is not one readers already hold, so a colour chosen for it would be one that
felt right rather than one a reader arrives carrying. When no convention applies, the house theme
wins.

## The same two colours as the static sibling, and that is the record, not a copy of one

`proof/more-line-swiss-life-expectancy` reaches `#0B7A75` on `#FFFFFF` and it reaches them by this
same route: no convention fires, so the house theme decides. Same subject, same frozen file, same
claim, same newsroom — a different answer here would mean one of those four had changed, and none
has. So the two records agree, and they agree for a stated reason rather than because one was copied
over the other.

## What directing the beat changed about this record

The undirected build of this page WAS drawn in the two colours above, and this file used to account
for the five it put on screen. It is now drawn **three times, in three filed directions**, and each
brings its own ground and accent. What this record still governs is the composer: `#FFFFFF` /
`#0B7A75` is the newsroom palette every candidate is reconciled against, and it is why all three
offered candidates read `colour: the newsroom's recorded palette`.

**Six of six directions hold up for this beat; three are offered and three refused** — every
`rapport`-typed candidate is refused because two of its registers differ on only one axis, and this
beat declares two ranked levels of evidence, so they would not read as two voices.

## Every colour each delivered page draws, and where each comes from

No hex is named anywhere in `DirectedLifeExpectancyWeb.tsx` or `render-directions-web.mjs`. The
ground and accent are the direction's own; `ink`, `muted` and `grid` are derived from that ground by
`deriveFurniture` in the node runner and never in the component, so there is one implementation of
the furniture rule per render.

| role | drawn on | creme | nocturne | rapport |
| --- | --- | --- | --- | --- |
| ground | the plate rect, the backing behind every overlay label, the tooltip | `#FFFCEE` | `#111044` | `#FFFFFF` |
| accent, at the non-text floor | the line's stroke, the 2023 end dot, the end label, the eyebrow | `#1755b2` | `#53e1c1` | `#1e5a88` |
| `mix(ground, ink, 0.5)` | the dashed 1950 rule, the 2001 crossing dot | `#807e77` | `#8888a2` | `#808080` |
| `muted` | both notes, every axis tick label, the caveat, the reading and source lines, the tooltip's border | `#61605a` | `#a5a4b8` | `#616161` |
| `grid` | the two regular gridlines (75 and 80) | `#d1cfc3` | `#3c3b66` | `#d1d1d1` |
| `ink`, at the text floor | the title, the tooltip's text, the keyboard focus ring | `#000000` | `#ffffff` | `#000000` |

## One accent on the page, not two a step apart — a defect found by counting

The first directed render of this beat put **two** accents on each page: the direction's raw accent
on the eyebrow (whose register's ink role IS `accent`) and the floor-adjusted one on the line. On
creme that was `#1757B6` beside `#1755b2` — one decision, two values, differing by a step no reader
would read as deliberate and every reader would see as a mismatch if they ever landed side by side.

The registers are now handed the **floor-adjusted** accent, so the words and the marks are one
colour. Adjusted is the safe one to unify on: it is the only one held to a floor, and it clears the
TEXT floor as well in all three directions.

## Measured

Against each direction's own ground:

| direction | accent as drawn | contrast | rule | contrast |
| --- | --- | ---: | --- | ---: |
| creme | `#1755b2` on `#FFFCEE` | **6.85 : 1** | `#807e77` | 3.95 : 1 |
| nocturne | `#53e1c1` on `#111044` | **10.93 : 1** | `#8888a2` | 5.16 : 1 |
| rapport | `#1e5a88` on `#FFFFFF` | **7.31 : 1** | `#808080` | 3.95 : 1 |

Every accent clears the 3 : 1 non-text floor (WCAG 2.2 SC 1.4.11) and the 4.5 : 1 text floor as
well, which it has to: the end label and the eyebrow are text set in it. The reference rule clears
the non-text floor on all three grounds.

## One accent, and the interaction did not earn a second

The beat draws **one** series — `data.csv` carries one entity and one value column — so one accent is
the whole requirement, and the end label is set in that same accent because this type's sheet asks
for a direct label instead of a legend.

The interaction adds **no colour**. The mark a reader is asking lights with
`.pt-active { fill: var(--muted) }` and the tooltip is drawn in `ground` / `ink` / `muted` — all
three already on the plate. A reader who touches nothing and a reader driving every control are
looking at the same six values. That was worth checking rather than assuming: a seventh colour
arriving through a hover state would be a colour no record had ever been asked about.

---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as documented in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them.

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

What is genuinely this beat's own is what the WEB format adds on top of those two, because the
static plate has no equivalent of any of it. Measured on `life-expectancy.html` as it ships — **five
distinct colours, and each one is accounted for**:

| value | role | where it is drawn |
| --- | --- | --- |
| `#FFFFFF` | ground | the plate rect, and the backing behind every overlay label and the tooltip |
| `#0B7A75` | accent | the one line's stroke, the 2023 end dot, the end label's text |
| `#616161` | `muted`, derived from ground | the dashed 1950 rule, the 2001 crossing dot, both notes, every axis tick label, the tooltip's border |
| `#D1D1D1` | `grid`, derived from ground | the two regular gridlines (75 and 80) |
| `#000000` | `ink`, derived from ground | the title, the caveat, the source line, the tooltip's own text, the keyboard focus ring |

Three of those five are derived by `deriveFurniture` from `ground`, in the node runner and never in
the component, so there is one implementation of the furniture rule per render. No hex is named
anywhere in `render-web.mjs` or `LifeExpectancyWeb.tsx`; both read this file through `readPalette`
and refuse rather than default.

## One accent, and the interaction did not earn a second

The beat draws **one** series — `data.csv` carries one entity and one value column — so one accent
is the whole requirement, and the end label is set in that same accent because this type's sheet
asks for a direct label instead of a legend.

The interaction added in this pass answers every one of the 74 readings, and it adds **no colour**.
The mark a reader is asking lights with `.pt-active { fill: var(--muted) }` and the tooltip is drawn
in `ground`/`ink`/`muted` — all three already on the plate. A reader who touches nothing and a reader
driving every control are looking at the same five values. That was worth checking rather than
assuming: a sixth colour arriving through a hover state would be a colour the newsroom's recorded
answer had never been asked about.

## Measured

`#0B7A75` against `#FFFFFF`: **5.18:1**, clear of the 3:1 non-text floor an accent has to hold
(WCAG 2.2 SC 1.4.11), and clear of 4.5:1 as well, which the end label needs because it is text.

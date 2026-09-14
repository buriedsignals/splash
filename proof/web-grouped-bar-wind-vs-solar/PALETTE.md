---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## What this page is, and what it is not

**Two series across six countries, and the series are two CATEGORIES.** Wind and solar are two
generation technologies. A reader is asked to hold "the left bar in every group is wind, and it is
always this colour" across six groups, because with a legend instead of per-bar series labels colour
is the ONLY thing carrying that association — `references/types/grouped-bar.md`, "the trap that's
specific to this one".

The text that stood here before said the opposite, and said it about a different page. It reasoned
about "one quantity partitioned into two halves of itself — the emissions before and after the year
the cumulative total reaches its midpoint", claimed
`two-states-of-one-measure-are-one-hue-at-two-chromas` on that basis, and concluded "no imported
second hue". **None of that describes this beat.** It is one of forty byte-identical copies of
`proof/web-area-swiss-co2`'s file; the beat it actually describes is an area chart of one series
split at a midpoint year. The treatment's own imported source is explicit — Statista: "two states of
one measure should not read as two categories" — and this page was claiming it in reverse, to make
two categories read as two states of one measure. **The treatment is withdrawn** (recorded in
`BRIEF.md` under "Treatments spent, and one WITHDRAWN").

## Two hues is what two categories want, and the substrate records one

A directed beat is drawn in a FILED DIRECTION, and a direction records exactly one accent —
`creme #1757B6`, `nocturne #4FE0C0`, `rapport #1F5C8B`. There is no second house hue to reach for:
`composeDirections` carries `ground` and `accent`, singular, and `readDirection` parses no more. The
recorded newsroom palette holds one accent too. So a second hue on this page would be a colour
nobody measured and no direction chose, which is the one thing `palette` exists to stop.

**The refusal is the finding, and it is the honest outcome rather than a workaround.** This type
genuinely wants two categorical hues; the directed substrate can supply one. Every other multi-series
directed web beat in this tree is in the same position and resolves it the same way — measured:
`web-stacked-bar-lowcarbon-growth`, `web-marimekko-electricity-mix` and
`web-dumbbell-life-expectancy-gains` all ramp one accent. What is new here is that the ramp is
measured against what the type actually needs instead of being justified by a treatment that does
not apply.

## What the page ships, and every number behind it

The accent goes to **solar** — `accent-marks-the-thread`: the claim is that solar passes wind in one
country, so solar is the series the argument rides on. Wind takes one step of the same accent toward
the ground, pushed back up to the 3:1 non-text floor when the step went under it.

| direction | ground | solar (accent) | vs ground | wind (tint) | before the clamp | vs ground | solar vs wind |
| --- | --- | --- | ---: | --- | --- | ---: | ---: |
| creme | `#FFFCEE` | `#1757B6` | 6,64:1 | `#7e92ab` | `#9eb7d6` at 2,00:1 | 3,10:1 | **2,142:1** |
| nocturne | `#111044` | `#4FE0C0` | 10,80:1 | `#336d7d` | `#2b6778` at 2,81:1 | 3,07:1 | **3,519:1** |
| rapport | `#FFFFFF` | `#1F5C8B` | 7,09:1 | `#8196a5` | `#a1bbce` at 2,00:1 | 3,07:1 | **2,309:1** |

Both inks clear WCAG 2.2 SC 1.4.11's 3:1 non-text floor against their own ground in all three
directions, asserted at render time by `assertLegible`. The last column is the one the catalogue
sheet's trap is really about, and it is held by the beat at **1,5:1** — the same lightness gap
`seriesInks`'s own docblock states.

## Why `readApart` is NOT the instrument here, measured

`seriesInks` accepts a candidate on EITHER a 1,5:1 lightness gap OR a redmean hue distance of 100.
On two chromas of ONE hue the hue half is meaningless, and it is not a theoretical worry — run on
this tree, `seriesInks({ ground: "#111044", accent: "#4FE0C0" }, 2)` returns `#4FE0C0` and `#a7f0e0`,
which measure **1,269:1** against each other and pass `readApart` on a redmean of 151. Two series a
reader could not separate would have shipped. So the applicable half is held on its own, and the
generic helper is not used for this pair.

## And the separation survives colour-vision deficiency, which two hues would not have guaranteed

The catalogue's named trap is an orange next to a vermillion — a pair separated by HUE, the channel
CVD attacks. This pair is separated by LIGHTNESS, the channel CVD preserves. Simulated (Machado
matrices, severity 1,0), solar against wind:

| direction | protanopia | deuteranopia | tritanopia |
| --- | ---: | ---: | ---: |
| creme | 2,041:1 | 2,355:1 | 2,002:1 |
| nocturne | 3,449:1 | 3,168:1 | 3,554:1 |
| rapport | 2,243:1 | 2,559:1 | 2,159:1 |

Nine of nine stay above the 1,5:1 the beat holds, and none of them moves by more than 0,35 from the
unsimulated figure. The literal form of the trap cannot occur on a one-hue page; its REASON — the
tie between a bar and its series has to survive every reader — is measured rather than assumed.

## The accent is spent once, and the subject is ringed

`the-subject-is-ringed-not-recoloured`: "recolouring spends a channel that is already carrying
something." On this page that channel is the series. The version this replaces printed Switzerland's
name in `var(--accent)` — one of the two series inks — so the one country the claim is about had its
name written in a colour that means "wind", on a page whose claim is about its solar. **Switzerland
now takes full ink, a weight, and a ring on its two bars. No hue.** The same is true of the
yardstick: choosing a country rings its bars and lights its name, and repaints nothing — a pointer
or an option that repainted a column would break the one association the type runs on.

Nothing else on the page is chromatic. The axis labels, the gridlines, the baseline and the two
dashed reference rules (drawn in their own series' ink, which is the point of them) are the
direction's own furniture, computed by `deriveFurniture` at render time and never written here as a
literal. `render-directions-web.mjs` and `DirectedGroupedBarWeb.tsx` name no hex.

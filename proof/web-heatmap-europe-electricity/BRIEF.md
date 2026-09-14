---
format: web
type: heatmap
---

# Beat — 7 pays européens tirent plus de 94 % de leur électricité de sources bas-carbone (web)

**Type:** heatmap (matrix). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**Seven European countries draw more than 94 % of their electricity from low-carbon sources — and
they get there by three different routes.** Albania, Iceland and Norway do it **without any nuclear
at all**. France does it **on nuclear**, 67,7 % of its mix. Sweden, Switzerland and Finland do it on
**both**, each above 50 % renewables *and* above 25 % nuclear.

The three routes are a **computed partition**, not a caption: three disjoint tests, and a country
falling into none of them or into two throws.

## Treatments spent

- `a-sequential-grid-is-one-hue-cluster` — one hue at increasing strength. Nine sources are nine
  columns, **not nine colours**: a qualitative palette here would say the sources differ in kind
  along the axis that is supposed to carry magnitude.
- `the-cell-value-is-printed-or-the-region-is-named` — the cells that carry the argument print their
  own share, and **every one of the 63 answers with its exact value** under the pointer.
- `order-is-chosen-from-the-answer` — rows ordered by low-carbon share, columns grouped renewables
  first, so the three routes are three **shapes** rather than three facts to assemble.

## The interaction, written before the code

**What this page earns, that a still and a video of the same claim cannot:** *a reader can raise the
floor under the grid and watch which cells survive — the 44 of 63 that are rounding error leave, and
the page says how much of each country's electricity the survivors still account for.* A still has to
draw all 63 at once, and 29 of them are under 0,5 %.

### The reader's problem this type has, stated first

A heatmap is a grid of cells whose only quantitative channel is colour. Colour ranks; it does not
measure. Two cells that are not side by side cannot be compared by eye at all — the grid puts eight
other cells between the two a reader wants to hold against each other — and the low end of any
sequential ramp is, by construction, close to the ground. On this beat that is 29 cells under 0,5 %
and 44 under 5 %: **two thirds of the grid is a pale wash a reader cannot read and does not need
to.** That is the picture the controls below are aimed at, not "a heatmap could use a tooltip".

### Control 1 — the floor

- **The reader's question:** *"Which sources actually run each of these countries — and how little is
  the rest of this grid worth?"*
- **The gesture:** `filter-to-a-subset` (`assets/filter.ts`, the **threshold-as-named-bands** form
  the vocabulary's own header names: `keys: rows.filter(r => r.value >= t)`, nested, so `data-filter`
  is a token list and `≥ 25 %` is a subset of `≥ 15 %` is a subset of `≥ 5 %`). One radio group, one
  generated CSS rule per band, **no script**: the floor works identically with JavaScript off.
- **What changes in the picture:** every cell under the chosen share leaves — the rect, the printed
  value, the hit target and, when a whole source falls away, that source's own column label. What is
  left is each country's skeleton: at ≥ 5 % the grid goes from 63 cells to **19** on **6** sources,
  at ≥ 15 % to **13** on **4**, at ≥ 25 % to **10** on **3**.
- **The derived reading it owes the reader,** computed in the runner from the frozen file and printed
  nowhere at rest: **how much of each country's electricity the survivors still account for**, and
  how many sources it takes. At ≥ 5 % the 19 remaining cells still carry 88,5 % (France) to 99,9 %
  (Iceland) of a country's mix — **Albania runs on one cell, France needs three.** That count *is*
  the three routes, restated as a number rather than as a shape.

**Why the threshold and not a filter by route.** The routes are already named in the paragraph under
the grid; a chip that isolates one would hide four rows to tell a reader something the page has
already told them in words. The floor is the reading the plate genuinely cannot give: it is the same
variable the colour encodes, deliberately, because *that* is the channel this type is weak on.

**Why a whole source leaves with its label.** The frame a cell is measured against is the **ramp
key**, and the key never moves under any band — the seven bins and their breaks are drawn unchanged,
so a surviving cell means the same thing in every state. A column whose every cell fell below the
floor is not frame, it is an empty category; leaving its name over a blank strip would be the orphan
defect `filter.ts` exists to refuse, one axis over. Every one of the seven **rows** survives all
three bands (measured: 7/7 at ≥ 5, ≥ 15 and ≥ 25 %), so no country ever disappears from the ranking.

### Control 2 — the cell

- **The reader's question:** *"What is this cell actually worth, and is this country big or small on
  this source?"*
- **The gesture:** `ask-a-mark` — hover, tap or keyboard focus, resolved by CELL (`data-hit="cell"`;
  seven rows share every x, so the format's by-x resolution would answer with the wrong country).
- **What changes:** the cell answers with its exact share, the TWh behind it, and the country's rank
  among the seven for that source. The rank is the derived half: it is the comparison the grid's own
  geometry makes impossible, and it is on no other channel.

## The ramp, measured against what the page ships

The catalogue sheet's one failure mode for this type is a ramp whose brightness does not move in one
direction. Measured on the seven stops each direction actually paints (`mix(ground, accent, 0,10 +
i/6 × 0,90)`), relative luminance, start to finish:

| direction | ramp | monotonic | adjacent step (min – max) | full range |
| --- | --- | --- | --- | --- |
| creme | `#e8ece8` → `#1757b6` | yes, falling | **1,278 – 1,384:1** | 5,721:1 |
| nocturne | `#172550` → `#4fe0c0` | yes, rising | **1,344 – 1,518:1** | 9,003:1 |
| rapport | `#e9eff3` → `#1f5c8b` | yes, falling | **1,280 – 1,419:1** | 6,113:1 |

Every adjacent pair clears **1,25:1**, the floor the donut pass set after finding a seven-tone ramp
stepping 1,007:1 between neighbours — mathematically invisible. This ramp is not built inside
`contrast(accent, ground)/3`: it runs the whole way from the ground to the accent, which is why seven
levels fit where a donut's seven did not.

**What the floor still costs, said rather than papered over.** The palest bin measures **1,160:1**
against the ground in creme and rapport, 1,199:1 in nocturne — under the 3:1 non-text floor the sheet
asks of every stop. That is a deliberate refusal of the rule, recorded below under "what the render
taught". The compensation is measured too and it is thin: the cell edge `mix(ground, ink, 0,22)`
reads **1,684:1** (creme), **1,968:1** (nocturne), **1,690:1** (rapport) against the ground. So the
page does not claim a reader can *read* the palest bin — it claims they can see there is a cell
there, that the key names it, and that the floor control removes it from the picture entirely.

**Printed values clear contrast on every level they can land on.** A number is printed only where
`v ≥ 70 %`, which is bin 6 only, and `inkOnFill` picks its ink against that cell's own fill, never
against the plate. Measured across all seven bins so the rule holds if the print rule ever widens:
the lowest reading anywhere is **4,551:1** (nocturne, bin 3) and the value on bin 6 reads 6,637:1
(creme), 10,797:1 (nocturne), 7,090:1 (rapport). All seven levels clear the 4,5:1 text floor in all
three directions.

## What the render taught, and it corrects a rule

The first ramp lifted **every** bin to the non-text contrast floor against the ground. That is the
right rule for a **mark** and the wrong one for a **ramp**: `adjustToContrast` darkens toward the
ground's opposite pole, so the two lightest bins came out grey while the rest stayed blue — a
sequential scale that changes hue halfway is not a sequential scale. A ramp's low end is *supposed*
to be close to the ground; what it owes the reader is a key, which this page prints, a cell edge,
which it draws, and — on this page — a control that takes the unreadable end away.

Three stacked annotation lines cost 44 px of an 812 px phone window; they are one paragraph now.

## Verification

`verify-web.mjs --file renders/<direction>.html` — **97 / 91 / 91 ok**, one skip (a typeface the
build-time scan mis-attributes), and **four failures that belong to the verifier rather than to this
beat**: its `checkFilter` is still written against the seed's own rainfall filter
(`input[name=period]`, `#period-all/early/late`, `.seg[data-period]`, opacity dimming, `.note.peak-label`)
and cannot read a filter declared through `assets/filter.ts`, which hides rather than dims and names
its radios `chart-filter`. It goes red on any beat that ships the vocabulary. Not fixed here: it is a
shared script and three other beats are in this tree.

So the floor was driven directly instead, with real `page.mouse.click` at each pill's own centre —
**3 directions × {script ON, script OFF} × {1600×800, 375×812} × 14 checks, all green.** What is
checked: the default is the unfiltered view with all 63 cells laid out and no note; the "15 %" pill
is a 24 px+ target; a real click leaves **exactly 13 cells**, keeps **all seven row labels**, takes
the **five emptied sources away with their columns**, reveals **exactly one** narrowing note, leaves
the **seven-bin key untouched**, and leaves title, caveat and source fully drawn; the unfiltered chip
restores all 63. Identical with JavaScript disabled — the floor is `:checked` plus generated CSS and
nothing else.

**The fit was re-measured, because the control costs height.** The fieldset is 74–78 px of an 812 px
phone window, and the page overflowed by 83 px (creme) the first time it was rendered with one. What
paid for it was prose that said the same thing twice — "9 colonnes ne sont pas 9 couleurs" beside
"une seule teinte", "différentes" beside "trois routes", and the reading line's account of how the
pointer resolves. All three directions now measure **exactly 812 px in an 812 px window**; nocturne
was **already 71 px over before this pass** (its `display` register sets the title at 39 px a line)
and is now inside.

Three mutations, each red in the right place and only there: a band that keeps every cell
(`BANDS = [0, …]`) → refused by `assertFilterDeclaration` in all three directions; a band that empties
a country (`BANDS = […, 50]`) → refused by this beat's own row check, naming Suède and Finlande; the
column labels stripped of the vocabulary → the driven check "the 5 emptied sources leave with their
cells" goes red in all three directions and in both scripting states, and nothing else does.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024,
40 European countries measured, 7 above the floor. `data.csv` is a byte-for-byte copy of
`proof/static-heatmap-europe-electricity/data.csv`.

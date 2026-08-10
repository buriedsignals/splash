---
size: landscape
type: heatmap
---

# Beat — coal's retreat across Europe's most coal-dependent power systems

**Type:** heatmap (matrix). **Medium/genre:** chart / static. **Channel:** article web,
1920 x 1080 — landscape, the one row of the export table this type can enter. It was tuned at
900 x 760, a frame nobody chose and nothing exported; see "Size" at the foot.

## Claim

Coal's share of electricity fell in all twelve of the EU-27-plus-UK countries where it supplied
the largest share in 2010. Poland is the only one still above half (54% in 2024, down from 87%);
six of the twelve are now under 10%; and the steepest fall is the United Kingdom's, from 28% to
0.7%, a 98% collapse.

Computed in `render.mjs` from `data.csv` and printed before the render:

- **"all twelve"** is `every(row => 2024 < 2010)`, and the render throws rather than draw the
  headline if that ever stops being true.
- **"the only one still above half"** is a filter, and the render throws if the count is not
  exactly one — the headline names one country and would be false with two.
- **"six of the twelve are now under 10%"**, **"the darkest cell is Poland in 2010 at 87%"** and
  **"the United Kingdom fades furthest"** are each a computation over the frozen readings; the
  steepest fall is ranked by *relative* fall, which is a different question from the largest
  drop in points (Greece lost 48.7 points, the most, but from a higher base).

## Which twelve, and the caveat that has to travel with them

Of the EU-27 plus the United Kingdom, the twelve where coal supplied the largest share of
electricity in **2010** — the grid's own first column, so the selection rule is visible in the
picture.

The rule is *inside* the data, which is unusual and is why the subtitle says so plainly: these are
the countries with the most coal to lose, so this is a grid about the **decline of coal**, not a
picture of Europe. A reader who took it for Europe would conclude European power is far more
coal-heavy than it is. Austria and Portugal, at zero today, are not here — their absence is the
selection, not a finding.

## The ramp, which is what this type actually is

A heatmap's colour carries the entire quantitative channel, so `references/types/heatmap.md`'s
rules are implemented as **measurements**, not intentions:

- **Sequential and luminance-monotonic.** `assertRampIsReadable` samples the ramp at 21 stops and
  throws if the contrast sequence ever moves back on itself. Because contrast against a fixed
  ground is a monotonic function of a stop's own luminance, a monotonic ratio sequence *is* a
  monotonic luminance ramp — the sheet's mechanical test, run rather than described.
- **Every stop clears 3:1 against the real ground.** The pale end is not the ground and not a
  fixed tint: `paleStop` walks from the ground toward the accent and returns the first mix that
  measures 3:1 (WCAG 2.2 SC 1.4.11, the non-text floor — a cell is a shape, not prose). The
  sheet's accessibility trap is exactly the ramp whose low end fades into its own canvas.
- **The deep end reaches past the accent.** It is the accent carried 35% toward the ink
  `deriveFurniture` already derives from this ground — the same derivation, applied at the other
  end. No new hue is named. Why it exists is under "what went wrong" below.
- **A value label takes its colour from its own cell**, chosen by measuring both poles against
  that exact fill and taking the higher — never a luminance threshold standing in for a
  measurement (`bar-and-column.md`'s trap, which applies verbatim to any label on a coloured
  mark). It visibly flips mid-grid: Romania's `13` is white, Hungary's `6.4` black. The component
  then asserts every printed label clears 4.5:1 on the fill it really sits on.

Rows are ordered by the 2010 share, descending — a deliberate order, so real clusters read as
blocks rather than scattering. Columns are chronological. Cells are near-square with a hairline of
ground between them, so the eye reads discrete cells and not a smear.

## Why only two columns carry numbers

180 printed numbers is a table, and a table is what a heatmap exists not to be. The two years the
claim is about carry their values; the fifteen-column pattern between them is what the grid is
for. Their column labels are set in ink and bold, the intervening years in muted two-digit form —
so the two years a reader is asked to compare are findable without fifteen four-digit labels
competing.

## Colours

`PALETTE.md`, `origin: subject` — the fossil convention, `matchConvention` firing on exactly one
convention and returning it alone. Near-black grey reads as coal, the material's own colour.

It also happens to be the ideal accent for this *type*, which is worth recording rather than
treating as luck: a ramp built between two greys is monotonic in luminance by construction, which
is the property the type's one failure mode is about. Measured 11.36:1 against this ground, which
is what leaves room for a long ramp whose palest stop still clears 3:1. `render.mjs` and the
component name no hex; every stop is derived.

## Source

Ember, via Our World in Data · `electricity-mix.csv?csvType=full&metric=share_of_generation&
source=coal`, frozen as `data.csv` filtered locally to the twelve countries, 2010-2024 (180 rows)
· extracted 9 August 2026.

The **full** CSV was taken and filtered here rather than fetched with `country=`. On this endpoint
that parameter is not honoured — a twelve-country `country=` fetch returned all 190-odd entities
with HTTP 200, and adding `csvType=filtered` returned every entity for a single year instead of a
time series. That is `intake/references/ourworldindata-csv-filter-trap.md`, met twice while
preparing this beat. `render.mjs` re-checks the frozen file against the candidate list and throws
on any stray entity or any missing year, because a heatmap has no honest way to draw a hole: at
this density a missing cell reads as a low value.

2025 readings exist in the source and were **excluded** — the same endpoint's "latest" view maps
2025 to an original year of 2024 for many countries, the shape of a partial year, and a partial
year at the end of a falling series would read as a collapse that has not happened.

## What went wrong, caught by looking — twice

**The first render was a flat grey slab.** Every number in it was right, the ramp passed its own
monotonic and 3:1 assertions, and the exit code was zero. It was still unreadable: the pale floor
that `heatmap.md` requires sits at a solid mid-grey on a white ground, which leaves roughly 90 of
255 levels for the whole ramp — and spending those *linearly* across a domain running to 87%, when
three quarters of the real readings sit under 25%, put nearly every reading in the same grey. The
United Kingdom's 98% collapse, the beat's own steepest, was invisible.

The fix was the **scale, not the floor**: colour position is now the square root of the value's
share of the maximum. It is monotonic, so nothing about the type's failure mode changes — a bigger
share is still a darker cell, always. What it costs is proportionality, and that cost is paid in
the open: the legend's own tick spacing is visibly uneven, and the subtitle says what was done.
Hand-chosen bins were considered and rejected — they would let a country crossing an edge flip a
whole shade for a rounding's worth of change.

**The second render was still too flat**, so the deep end was extended past the accent toward the
ink, buying back about a third more range at the end that is free to move. Only then did Greece's,
Denmark's, the UK's and Finland's rows visibly fade left to right while Poland's stayed near-black
— which is the finding.

**The tension this beat leaves standing, honestly.** The palest cell in the grid is a mid-grey,
not a pale one, and that is the 3:1 floor's price on a white ground: "very little coal" cannot
look like "almost nothing". The beat pays it rather than quietly lowering the floor, and the alt
text says "mid-grey", not "pale grey", so a reader who cannot see the grid is not told something
the grid does not show.

## Size — 2026-08-10

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize`, verified from
the delivered PNG's own IHDR. It shipped 1800 x 1520 before — a 900 x 760 element rasterised at
`fitTo: width x 2`, at a frame height (760) that is not in the table at all.

**Square and portrait are refused by `type-at-size.mjs` itself.** A heatmap is a GRID: it is
row-driven already, so there is no twin form to transpose into, and no aspect range has been
measured for the type. The runner refuses both by name before a cell is drawn. Reversing that is
one sweep in `proof/aspect-range-probe/`, not an argument — and for a 15-column grid a phone frame
is unlikely to survive it.

**Two base tokens rose from 11 to 12**, and it is not a taste change. `sizes.mjs` calibrates
landscape's 2.2 multiplier so the SEED's smallest token, 12, lands exactly on the 26px floor that a
1920px frame read in a 900px article column implies. 11 scales to 24.2px and `assertTypeFloor`
refuses it — correctly, and loudly. The floor is never lowered, so the year label and the cell
value label rose.

### What the frame cost, stated rather than absorbed

The landscape frame is SHORTER in type units than the one this beat was tuned at: 1080 / 2.2 = 491
against 760 / 1 = 760. Twelve rows of country names do not fit under a four-line standfirst, and
what runs out is not room for a shape — it is PITCH. Measured, and the ladder is run rather than
declared (`ladderFor`, which the runner and the component call on the same inputs):

| standfirst | lines | grid | row pitch | needs | fits |
|---|---|---|---|---|---|
| all four sentences | 4 | 284px | 23.7px | 33.1px | no |
| three | 4 | 284px | 23.7px | 33.1px | no — **and it recovers nothing** |
| two | 3 | 328px | 27.3px | 33.1px | no |
| one | 1 | 416px | 34.7px | 33.1px | yes |

`33.1px` is 1.2x the row labels' own MEASURED ink (ascent plus descender, so "Hungary" is budgeted
for its `g` and `y`), not a font size. The 1.2 is a knob with a measurement behind it:
`type-at-size.mjs` records the population pyramid's break at a pitch/type ratio of about 1.1 —
"the band labels touch" — so 1.0 is provably too little and 1.1 is the failure.

**So R3 fires and takes three sentences.** What the reader loses, named rather than absorbed:

- *"not a picture of Europe, which uses far less coal than this grid alone would suggest"* — the
  caveat this brief has its own section for. It is the one R3's own `loses` field describes as
  "context the title mostly implies", and here that is nearly true: the headline says **Europe's
  most coal-dependent countries**, which is the selection rule in the reader's first line.
- *the square-root colour scale, disclosed in prose.* This one is a real loss, and it now rests
  entirely on the legend's visibly uneven tick spacing (0 · 5 · 10 · 25 · 50 · 87%), which is drawn
  and which the render was designed to make carry it.
- *"Only 2010 and 2024 carry printed values"* — the grid shows this.

**The rung that recovers nothing does not fire, and finding that out cost a refusal.** Dropping only
the last sentence re-wraps to the same four lines and frees zero pixels. A ladder that stepped down
one rung at a time read that as "the ladder is spent" and refused a frame two removals fit
comfortably. `ladderFor` searches for the FEWEST removals that fit instead, so a rung is only
reported when the standfirst it produces is the one actually drawn.

**The refusal is real, not decorative.** With the ladder disabled in a copy under `/tmp`, the render
stops with `the grid gives 12 rows 23.7px each, against 27.6px of row-label ink … R9: this beat does
not ship landscape` — the picture it would otherwise have delivered clips nothing and collides with
nothing by any counter in this project.

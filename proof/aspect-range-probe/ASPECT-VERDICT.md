# Aspect-range probe — what a person saw

`ASPECT-MEASUREMENTS.md` beside this file is written by `render.mjs`. **This half is not
generated.** Every arm named below was opened and looked at, one at a time, and the sentence beside
it is what the picture did — not what its numbers implied.

The instrument is stated once, because everything under it depends on it: within a regime the
plot's **width** and the **type size** are held constant and only its **height** varies, so aspect
is the only quantity separating two arms of one type. The default regime is 900px of plot at 26px
type — the article's own reading distance (`sizes.mjs`, `landscape.minTypePx`). The line is
measured a second time at 700px/36px, which is what a 1080-wide frame really gives a chart at the
phone's floor, because a bound learned at one ratio of type to plot is worth nothing until it has
been checked at the other one this toolchain exports.

**A bound is only recorded where two arms bracket it** — one that reads and one that does not. A
single arm that "looks fine" is where 0.8 came from last time.

---

## 1 — waterfall · **0.35 – 4.6**

| arm | what it did |
|---|---|
| `waterfall-0p35` | Reads. The bridge is intact — 639.2, +102.7, −91.8, −154.1, 496.0 — and two-thirds of the frame below the connectors is empty. Dead space is not a defect; nothing is misread. |
| `waterfall-0p5` · `0p9` · `1p5` | Reads. 1.5 is the most comfortable of the set: the three step slabs sit clear of each other and of the two totals. |
| `waterfall-2p4` · `3p6` | Reads. At 3.6 the smallest step is 28.7px against a 159px bar width — a slab rather than a bar — but +102.7 and −91.8 are still visibly different lengths. |
| `waterfall-4p6` | **The last arm that reads.** Value-axis labels 39px apart at 26px type; every step is still a rectangle. |
| `waterfall-6` | **Breaks.** 0/200/400/600/800 fall to a 30px pitch and touch, and the two middle steps (17px and 22px) stop being comparable — the reader is asked to judge two slabs a fifth the height of the type beside them. |

No floor was found. 0.35 was the flattest arm rendered and it reads, so the floor is recorded as
the flattest arm rendered, and it is below anything the three export sizes can produce.

## 2 — slope · **0.35 – 1.8**

A slope chart's argument is **which lines cross**. That is what the sweep destroys, and it goes
before anything is clipped or collides.

| arm | what it did |
|---|---|
| `slope-0p35` · `0p5` | Reads. Poland crossing France is unmistakable, the six end labels sit on their own values, no de-collision fires. |
| `slope-0p9` · `1p5` | Reads. Two, then four, of the six right-hand labels are nudged by the de-collider, which is what it is for; the crossing is still plain. |
| `slope-1p8` | **The last arm that reads.** The crossing has moved to about 55% across and is still visible. |
| `slope-2` | **Breaks.** The crossing is squeezed hard against the left rail, where France and Poland now read as one thickened line for most of their length. |
| `slope-2p2` · `2p4` · `3p6` | Gone. Five of six end labels are displaced off their own value; the label column, which is where a reader reads the value, no longer encodes position. Germany's line runs through the France/Poland pair rather than over it. |

## 3 — small-multiples (six panels) · **0.5 – 1.3**

The packing rule is the beat's own (`SolarSmallMultiples.tsx`'s `columnsFor`, kept near a 1.6:1
panel): it absorbs the tall side entirely and runs out of columns on the flat side.

| arm | what it did |
|---|---|
| `small-multiples-0p5` | Reads, and is the best arm in the set. One column of six, every country name, every end value, one shared axis at the foot. |
| `small-multiples-0p9` | Reads. 2×3, panel 429×255 — a 1.7:1 panel, which is the shape the sheet targets. |
| `small-multiples-1p1` · `1p2` | Reads. Value labels 48px and 43px apart. |
| `small-multiples-1p3` | **The last arm that reads.** Panels 429×152, the five shared value labels 38px apart at 26px — tight, clear. |
| `small-multiples-1p5` | **Breaks.** Panels 121px tall; 20.0% and 15.0% touch. |
| `small-multiples-2p4` · `3p6` | At 2.4 the packing goes to 3×2 and the value labels collide; at 3.6 the left-hand column of every row is a black smear and the panels are 42px tall. |

## 4 — bump (six tracks, ten rank rows) · **0.5 – 2.9**

| arm | what it did |
|---|---|
| `bump-0p5` · `0p9` | Reads. Every crossing (China over Russia in 1991, over the United States in 2006, India over Japan, Germany's slide to 10th) is legible and every name sits on its own row. |
| `bump-1p5` · `2p4` | Reads. Rows 67px then 42px apart. |
| `bump-2p9` | **The last arm that reads.** Rows 34.4px apart against a 28px name — the names are tight but separated. |
| `bump-3p2` | **Breaks.** 31.2px pitch, under the name's own line: "United States / Russia / China" at the left end becomes one solid block of type. |
| `bump-3p6` | Worse, and the finding that matters: **the crossings are still perfectly visible** at 27.8px pitch. What ends a bump chart is its name column, not its lines. |

## 5 — population-pyramid · it is a **band-scale** type, and this is the evidence

Rendered across the same sweep, and the shape of its failure is the answer:

| arm | band pitch | what it did |
|---|---|---|
| `population-pyramid-0p5` | 85.7px | Reads. A textbook pyramid — 21 bands, every label clear, both magnitude axes readable. |
| `population-pyramid-0p9` | 47.6px | Reads. |
| `population-pyramid-1p2` | 35.7px | **The last arm that reads.** |
| `population-pyramid-1p5` | 28.6px | Band labels touch. |
| `population-pyramid-1p8` | 23.8px | Labels overprint. |
| `population-pyramid-2p4` · `3p6` | 17.9 · 11.9px | "95-99" prints through "90-94" prints through "85-89"; by 3.6 the centre gutter is an illegible stack. |

**It reads best at the tall frames and fails at the flat ones, and it fails by running out of ROWS
— not by distorting a shape.** That is the signature of a band-scale type and of no other kind: the
bar family behaves exactly this way, which is why `BAND_SCALE_TYPES` exists. A pyramid's category
axis is ordinal age bands; it is already row-driven; and its twin form is the form it is already
in, so R0 is the identity for it. Its constraint is a row budget, which `assertRowsFit` reads and
an aspect range cannot, because a row budget is a fact about a COUNT.

Recorded, and deliberately not acted on here: `formForSize` answers `as-is` at landscape for
everything, so nothing in this file refuses the pyramid at the one frame where it does break. That
is the same hole `proof/static-swiss-age-pyramid` already records in its own artifact
(`data-ladder`: the zero spine has vanished, 21 labels at 26px leaving gaps that touch).

## 6 — line · **0.7 – 3.6**, and the square defect is not an aspect defect

### The single-series sweep, 900px plot / 26px type

| arm | end-to-end angle | what it did |
|---|---|---|
| `line-0p5` | 62.0° | **Breaks.** A wall. Past banking-to-45° by 17°, so a steady 34-year climb reads as a cliff and the 1950s year-to-year noise reads as drama. Four gridlines over 1800px leave empty bands the eye reads as structure. |
| `line-0p7` | 53.3° | **The steepest arm that reads.** |
| `line-0p83` | 48.6° | Reads. |
| `line-0p9` | 46.3° | Reads, and is the best-banked arm in the set. |
| `line-1p5` · `1p9` · `2p4` · `2p9` | 32.1 · 26.3 · 21.4 · 17.9° | Read. |
| `line-3p6` | 14.6° | **The flattest arm that reads.** The 2020 dip — a real feature of this series — is small but present. |
| `line-4p5` | 11.8° | **Breaks.** The 2020 dip is gone, and so is the 1962 one. The trend survives; every event in it does not. |

### The same sweep at the phone's regime, 700px plot / 36px type

`line-0p7` · `0p83` · `1p0` · `1p3` · `1p8` · `2p6` — **every one reads.** Type is 1.4× larger
against a plot 0.78× as wide, and nothing collides; the x tick labels at 0.83 are the tightest
thing in the set and they are clear. **The range does not move between the two regimes.**

### So what was wrong with the square `vidx-line-life-expectancy`?

Not its aspect. That beat's square render (re-rendered and opened for this probe, and its own
`BRIEF.md` describes it the same way) has the "80 years" reference label lying across both lines
and the two end labels running off to the frame's edge, at 0.83:1. Two arms settle it:

- `line-two-series-0p83-w700t36` — two series, a reference level, the same 0.83:1, at the plot
  width a 1080 frame gives once the end-label gutter is paid for at a NORMAL label length. **Reads.
  Zero lines under the reference label, end labels 66px apart.**
- `line-two-series-0p83-w370t36` — the same aspect at the plot width the beat actually got, because
  its own end labels ("Switzerland · 83.95 years") take 55% of the frame. **The reference label lies
  on both lines (measured: 2), the year labels collapse into a smear, the end labels crowd.**
- `line-two-series-1p5-w370t36` — an aspect **comfortably inside** the recorded range, same width.
  **The identical defects, worse.**

**The defect travels with the plot's WIDTH against the ink drawn in it, and it is aspect-blind.**
Tightening the floor to refuse 0.83 would refuse a picture that reads, and would still pass the
picture that does not. The bound is corrected here to what the sweep measured — `0.7 – 3.6`, both
ends re-bracketed — and the square defect is named for what it is: a label-placement failure,
whose honest instrument is a measured minimum plot width or the annotation-over-marks guard, not
`assertPlotAspect`.

The corrected ceiling also settles the corpus's own contradiction. `proof/life-expectancy` delivers
a square plot at **2.4:1** and a portrait one at **2.55:1**, both outside the old 1.8 and both
inside 3.6; `more-line-swiss-life-expectancy` refuses square at 6.02:1 and portrait at 4.43:1, and
still does.

---

## What this probe does not settle

- **Every range above is measured at one COUNT** — five waterfall steps, six slope series, six
  panels, ten rank rows, 21 age bands. Three of the four breaks are a count of things ceasing to
  fit down the frame, so the same type at a different count is a different measurement. That is a
  real limitation of an aspect range as an instrument, and it is why the pyramid is answered by
  `BAND_SCALE_TYPES` and a row budget instead of by a number here.
- **One data set per type.** A slope chart with no crossing would not break where this one does.
- **No phone has been looked at**, in the words of `MOBILE-FIRST-WIREFRAME.md` §6, which still
  holds: §"the phone's regime" above is arithmetic against published breakpoints, rendered.
- **The furniture is not in these arms** by design — no title, no standfirst, no credit. What the
  header costs a plot is the removal ladder's question. A range that silently included the header
  would move every time a headline got longer.

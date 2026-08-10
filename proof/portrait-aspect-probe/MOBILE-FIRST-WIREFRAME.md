# The portrait frame, designed from the phone

This is the design, written before it is code, so that what the renders are being judged against is
stated rather than inferred from them afterwards.

It supersedes the composition half of `PORTRAIT-VERDICT.md` and `CENTRING-VERDICT.md` on one point
and one only: **those two took a block composed for an article column and moved it around inside a
tall frame.** Every arm they rendered — including `h-b2-story-type`, the arm they liked best — is a
repositioning. The owner's ruling is that a portrait frame should be *composed from the phone*, and
that what fits should decide what is drawn.

Everything the two verdicts established about the CHART still holds: the plot's aspect must be
clamped into the range the type supports, and the platform's safe band is where the content goes.
Both are carried forward here as inputs.

---

## 1 — The grounded practices, and how thin each one is

Nothing below is asserted from memory. Where the evidence is thin the entry says so, because the
number is going to be used and a reader has to know what it is worth.

### 1.1 Minimum legible type

| what | figure | source | standing |
|---|---|---|---|
| WCAG states no minimum font size | — | Datawrapper, *Which fonts to use for your charts and tables* — "the WCAG can't give us a minimum font size", because "the readability of a typeface depends not just on font size, but also on font family, capitalization, letter spacing, and text color" <https://www.datawrapper.de/blog/fonts-for-data-visualization> | **strong** — this is the reason there is no single authority to cite for the rest of this table |
| practical floor for chart text | **12 px** | Same article: "Text annotations in Datawrapper use a default 14px for Roboto. Depending on the font family, everything below 12px will likely be too small." | **strong for our purpose** — a working chart tool stating its own default and its own floor |
| minimum for screens | **9 pt** (≈12 px) | U.S. federal *Data Visualization Standards*, Typography — "we recommend using a minimum font size of 9pt for screens and 6pt for print" <https://xdgov.github.io/data-design-standards/components/typography> | **medium** — a published standard, but it gives no derivation |
| the size to aim at | **16 px** | Same page — "websites often use a 16pt font size as it is optimized for legibility"; "striving for font sizes as close to 16pt as possible will ensure your data visualizations are as readable" | **medium** |
| iOS minimum text size | **11 pt** | Apple Human Interface Guidelines → Typography states a recommended default and minimum per platform <https://developer.apple.com/design/human-interface-guidelines/typography>. **I could not read the figure off Apple's own page** — it is client-rendered and returns no body text to a fetch. The 11 pt figure is taken from secondary summaries that agree with each other, e.g. <https://median.co/blog/apples-ui-dos-and-donts-typography> ("The minimum font size for iOS and iPadOS apps is 11 pt") | **weak — second-hand.** Used only as corroboration; it agrees with the two above and changes no number in this document |

**Convergence:** three independent sources put the floor at 11–12 px and the target at 16 px. That
agreement is the only reason a floor is written into this design at all.

### 1.2 Touch targets

- WCAG 2.2 SC 2.5.8 *Target Size (Minimum)*, Level AA: "The size of the target for pointer inputs is
  at least 24 by 24 CSS pixels", with five exceptions.
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html> — **strong, normative.**
- **It does not apply to this frame.** A story-format export is a static image; it has no targets.
  It is recorded because the same wireframe will be asked for in the interactive portrait, and there
  24 CSS px becomes **72 px in a 1080-wide frame** by §2. Stating it now stops it being invented
  later.

### 1.3 What a phone frame can carry, and what newsrooms actually do

The strongest single source is Horak, Brehmer, Stoiber, Kister & Bach, *Responsive Visualization
Design for Mobile Devices*, chapter 2 of **Mobile Data Visualization** (CRC Press, 2021).
<https://www.imld.de/cnt/uploads/Horak2021_MobileDataVisBook_Chap02_Responsive.pdf>

- **Portrait is the case, not an edge case.** "as much as 92% of mobile phone usage is carried out
  while holding the device in portrait mode" (ch. 2 §2.4.1, citing Rahmati et al.).
- **Filling the frame's height is not automatically right.** "For line charts and chart types with
  continuous axes, such a change in aspect ratio can negatively affect perception"; "visualization
  designers need not to use the full display height; in many cases, a square aspect ratio is
  sufficient, and it is indeed the norm in mobile social media applications such as Instagram"
  (§2.4.2). — *This is independent confirmation of the clamp `PORTRAIT-VERDICT.md` arrived at by
  rendering.*
- **Transposition is a named strategy with named limits.** "A simple example of this strategy is
  converting a vertical bar chart into a horizontal one"; "text should remain un-rotated to ensure
  its legibility"; and against over-applying it: "rotating a scatterplot would violate conventions
  of reading direction… Line charts also resist rotation, due to the convention that the horizontal
  axis represents time proceeding from left to right" (§2.4.2). — *Confirms both halves of the
  ranking result: transpose the band-scale types, and only those.*
- **Removal is what newsrooms do.** "Hoffswell et al. document more than two dozen examples of news
  graphics where marks are removed when converting a desktop graphic to a mobile one" (§2.4.5); "In
  their survey of responsive visualization design in news graphics, Hoffswell et al. show that
  annotation and guides are often re-positioned, simplified, or removed altogether" (§2.4.6).
- **But there is no published order of removal.** "These surveys are helpful in that they illustrate
  that there is no single order of precedence for re-positioning, simplifying, or removing
  annotation and guide elements; in some cases, a critical annotation for a single data mark may be
  more important to retain and emphasize than an axis" (§2.4.6). — **This is the thin part, and it
  is thin in the literature, not in my reading of it.** §4's ladder is therefore *our* order, argued
  from cost, not quoted from anyone.
- **One documented order does exist, for one type.** Andrews & Smrdel's responsive line chart: "as
  the display size decreases, axis labels first rotate and then are progressively removed at equal
  intervals, until they are removed altogether. Finally, axes and titles are removed altogether,
  leaving only a sparkline with annotated endpoint values" (§2.4.6, fig. 2.3). — The ladder's rungs
  1, 2 and 5 are this order, applied to a portrait frame instead of a narrowing one.
- **Reducing the number of bins is a named, legitimate move.** "Reclassification is a related
  concept, in which the number of categories or quantitative bins is reduced and consolidated…
  examples include reducing the number of bins in a histogram, or consolidating categories in a
  color legend" (§2.4.4) — with the condition, from §2.4.5, that "it is critical to inform the
  viewer that this has taken place as a responsive design measure".
- **Mobile-first is endorsed by name.** "a mobile-first design approach may lead designers to more
  responsive designs relative to a desktop-first approach" (§2.4.9).

Corpus size behind those claims: Hoffswell, Li & Liu, *Techniques for Flexible Responsive
Visualization Design*, CHI 2020 — **231 responsive visualizations** analysed
(count as reported by Kim, Hullman & Hoffswell, *Cicero*, CHI 2022, §2:
"qualitative analysis of 231 responsive visualizations", <https://dl.acm.org/doi/10.1145/3313831.3376777>,
<https://users.eecs.northwestern.edu/~jhullman/Responsive_Visualization_Grammar.pdf>).

Two more, narrower:

- **Long labels are a reason to transpose, not to rotate.** Nielsen Norman Group, *Choosing Chart
  Types* — "Placing labels in vertical or diagonal alignment makes them hard to read"; "Horizontal
  bar charts are a good option when your items have long names."
  <https://www.nngroup.com/articles/choosing-chart-types/> — **medium** (practitioner guidance, no
  study behind the sentence).
- **A line's aspect has a target, not just a range.** Cleveland's "banking to 45°", as formalised by
  Heer & Agrawala, *Multi-Scale Banking to 45°*, InfoVis 2006 —
  <http://vis.stanford.edu/files/2006-Banking-InfoVis.pdf> — **strong**, and it is the reason
  `PORTRAIT-VERDICT.md` distrusted its own derived floor for the line.

**Where the evidence is genuinely thin, stated plainly:** nobody publishes "a phone chart may carry
N series / N categories / N ticks". I looked and did not find it. What the literature gives is
*which strategies* to apply and *that* elements get removed — never how many are too many. So this
design does not assert a category count. It asserts a **budget in pixels** and lets the count fall
out of the budget, which is measurable and defensible; §4's ladder is the mechanism.

### 1.4 The frame itself

Carried forward from `CENTRING-VERDICT.md`, unchanged:

- Meta publishes one safe zone for Stories and Reels: **14% top, 35% bottom, 6% each side**, which on
  1080×1920 is **269 px / 672 px / 65 px**, leaving a band of **269–1248 px, 979 px tall, 51% of the
  frame**. <https://www.facebook.com/business/help/980593475366490/>
- TikTok publishes no pixels and says the zone shrinks as the caption grows; Meta's band sits inside
  the figures third-party guides cite for TikTok, so satisfying Meta satisfies both.
- Content outside the band is **at risk of being covered**, not clipped.

---

## 2 — The one piece of arithmetic that makes the frame a phone

A 1080×1920 story image is displayed **full-bleed** on the phone. So a size in the frame is not a
size on the device until it is divided by the scale factor.

Android's window size classes put **"compact" at width < 600 dp**, which the documentation says is
"99.96% of phones in portrait"
(<https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes>). Real
phones sit at the narrow end of that class — 360 dp is the common floor, current iPhones are 390–430
pt. **This design uses 360**, the narrowest, because a floor derived from the widest phone is not a
floor.

> **1 frame px = 360 / 1080 = 1/3 CSS px.**
> **Every legibility figure in §1.1 multiplies by 3.**

| §1.1 figure | on the phone | in the 1080-wide frame |
|---|---|---|
| Datawrapper's "below 12px will likely be too small" | 12 CSS px | **36 px** |
| xdgov's 9 pt screen minimum | ≈12 CSS px | **36 px** |
| Apple's 11 pt (second-hand) | ≈14.7 CSS px | **44 px** |
| Datawrapper's own annotation default | 14 CSS px | **42 px** |
| xdgov's "as close to 16pt as possible" | 16 CSS px | **48 px** |
| WCAG 2.5.8 target (interactive only) | 24 CSS px | **72 px** |

**This is the whole mobile-first argument in one line.** The shipped portrait row draws its axis
labels at 25 px and its source at 27 px — 8.3 and 9 CSS px on the phone, below every floor in the
table. `h-b2-story-type`, the arm the earlier probe called "the only one of the four I would
publish", does exactly the same: its multipliers grow the *header*, and its axis and source are
still under the floor. Praising it was reading the picture at desktop size.

---

## 3 — The wireframe

```
   0 ┌───────────────────────────────────────────┐  ▲
     │▒▒▒▒▒  PLATFORM: profile row, name   ▒▒▒▒▒▒│  │ 269 px — 14%
     │▒▒▒▒▒  NOTHING OF OURS IS DRAWN HERE ▒▒▒▒▒▒│  ▼
 269 ├───────────────────────────────────────────┤  ▲
     │ ‹72›                                 ‹72› │  │
     │  TITLE — the claim, 72 px / lead 86       │  │
     │  up to 3 lines, never truncated           │  │
     │                                           │  │
     │  standfirst — 48 px / lead 62, sentences  │  │
     │                                           │  │
     │  Number of countries — 39 px unit caption │  │
     │  ┌─────────────────────────────────────┐  │  │
     │  │                                     │  │  │  S T A G E
     │  │   PLOT                              │  │  │  979 px — 51%
     │  │   width 1080 − 2·72 − y-gutter      │  │  │
     │  │   height ≥ plotWidth / maxAspect    │  │  │  everything the
     │  │   height ≤ plotWidth / minAspect    │  │  │  reader needs
     │  │                                     │  │  │  lives INSIDE
     │  └─────────────────────────────────────┘  │  │
     │    tick  tick  tick        (39 px)        │  │
     │                                           │  │
     │  ─────────────────────────────────────    │  │
     │  Lead-in. annotation, 48 px / lead 62     │  │
     │                                           │  │
     │  Source: … 36 px — the floor exactly      │  │
1248 ├───────────────────────────────────────────┤  ▼
     │▒▒▒▒▒  PLATFORM: caption, buttons,   ▒▒▒▒▒▒│  ▲
     │▒▒▒▒▒  progress bar                  ▒▒▒▒▒▒│  │ 672 px — 35%
     │▒▒▒▒▒  NOTHING OF OURS IS DRAWN HERE ▒▒▒▒▒▒│  │
1920 └───────────────────────────────────────────┘  ▼
```

### 3.1 The regions and what each is for

| region | extent | contains | why |
|---|---|---|---|
| platform top | 0–269 | nothing | Meta's published 14% reserve |
| **stage** | **269–1248** | title · standfirst · unit caption · plot · axis · annotation · source | the only 979 px both platforms leave clear |
| platform bottom | 1248–1920 | nothing | Meta's published 35% reserve |
| side margin | 72 px each | nothing | Meta reserves 6% = 65 px; 72 is the next value that is also 2× the 36 px type floor, so the margin can never be thinner than the smallest word is tall |

**The source credit moves inside the stage.** `CENTRING-VERDICT.md` left this open: the seed pins the
credit to the frame's bottom margin, and the bottom 35% belongs to the platform, and the two rules
contradict. Resolved here in favour of attribution — **a covered credit is an attribution failure,
not a cosmetic one**, so the credit is the last line of the stage and costs the budget 36 px.

**The block is centred on the stage, not on the page** — `269 + (979 − blockHeight) / 2`. That is
`CENTRING-VERDICT.md`'s recommendation 2, unchanged. In practice a mobile-first block nearly fills
the stage, so the shift is small; the rule stays because a short beat still needs it.

### 3.2 The type scale

One scale, in frame px, with its phone equivalent and the §1.1 line it answers. **These are absolute
sizes, not multipliers of an article's scale.** That is the difference between designing for the
phone and enlarging a page.

| role | frame px | lead | on a 360 dp phone | grounded in |
|---|---|---|---|---|
| TITLE | **72** | 86 | 24 CSS px | above the 16 px target with headline margin |
| STANDFIRST | **48** | 62 | 16 CSS px | xdgov's "as close to 16pt as possible" |
| ANNOTATION body & lead-in | **48** | 62 | 16 CSS px | same |
| direct / value label | **42** | — | 14 CSS px | Datawrapper's own annotation default |
| axis tick | **39** | — | 13 CSS px | above the 12 px floor, above Apple's 11 pt |
| SOURCE | **36** | — | 12 CSS px | **the floor exactly** — the smallest thing permitted |

**The value axis carries its unit in a CAPTION above the plot, not on its top tick.** Appending it —
"100 countries" — set the left gutter to 320 px, a third of the frame's width, and the gutter is
subtracted from the plot's width, which is what the plot's own height floor is computed from. One
39 px caption buys back about 160 px of width. Measured, not borrowed.

**`FLOOR = 36`. Nothing is drawn below it, ever, and the ladder never lowers a size.** A rule that
reads "make it smaller" is the rule that fails at the moment it is needed; every rung in §4 removes
something instead.

### 3.3 The minimum plot height

Derived, not chosen:

```
minPlotHeight = plotWidth / maxAspect        maxAspect = the type's own measured ceiling
maxPlotHeight = plotWidth / minAspect        minAspect = the type's own measured floor
```

with the ranges `PORTRAIT-MEASUREMENTS.md` derived by rendering — histogram **1.1 – 2.9**, line
**0.8 – 1.8**. So the floor is the flattest plot the type's own accepted renders ever produced, and
nothing new is invented. For the histogram at `plotWidth ≈ 846` that is **292 px**; for the line at
`plotWidth ≈ 800` it is **445 px**.

Two failure conditions, both of them stop conditions for §4:

- **overflow** — the block's ink is taller than the 979 px stage;
- **flat plot** — the plot is shorter than `plotWidth / maxAspect`.

`PORTRAIT-VERDICT.md` recorded that the line's derived floor of 0.8 is suspect because it was learned
from a square render that was already stretched. **Carried forward as a known defect**: this design
uses the range as given so the comparison stays honest, and reports the line's end-to-end slope in
degrees beside it so a reader can see whether banking-to-45° is satisfied independently of the range.

---

## 4 — What gets removed, and in what order

The ladder runs while `blockInk > 979 || plotHeight < plotWidth / maxAspect`. Each rung is applied,
the block is re-measured, and the ladder stops the moment both conditions clear. **Every rung that
fires is recorded and emitted with the render** — invariant 1: nothing is dropped in a decision
nobody chose, and "the standfirst lost a line" must be visible to the journalist, not silent.

The order is argued from **information lost per pixel recovered**, cheapest first, data last.

| rung | what goes | recovers | what is lost | grounding |
|---|---|---|---|---|
| **R0** | **the FORM, before anything else.** If the type's category axis is a band scale — bar/column, lollipop, dumbbell, diverging bar — transpose to horizontal rows and stop; a transposed ranking has no aspect to distort and fills the frame natively | the whole problem | nothing, except where the argument is drawn as a rule across the columns (`PORTRAIT-VERDICT.md`'s known regression) | Horak §2.4.2 "converting a vertical bar chart into a horizontal one"; NN/g on long names. **Neither type in this probe takes R0** — a histogram's x is a continuum and "line charts also resist rotation" |
| **R1** | the axis TITLE; its unit folds into the last tick label | ≈ 75 px | the unit's prominence, nothing else | Andrews & Smrdel: "axes and titles are removed altogether" |
| **R2** | value-axis ticks 5 → 3 (floor, middle, top) | the y gutter narrows, so the plot gets WIDER and its height floor drops — slack without losing height | reading precision between gridlines | Andrews & Smrdel: labels "progressively removed at equal intervals" |
| **R3** | the standfirst's LAST SENTENCE, repeatedly, down to one | 60–170 px a sentence | context the title mostly implies | the cheapest editorial unit in the block |
| **R4** | annotations, dropped **last-first**, one at a time, to zero | 190–320 px each — by far the largest single recovery | a stated fact per rung. At 48 px one annotation costs a fifth of the whole stage | Horak §2.4.6: annotation and guides "often re-positioned, simplified, or removed altogether" |
| **R5** | the reference mark's LABEL (e.g. "Median 3.1 t"); the rule stays drawn and the value is named in prose | **nothing vertical** — see §4.1 | — | listed for completeness; in practice this rung never fires |
| **R7** | the standfirst **entirely** | its whole height | the only line that says what the numbers ARE | the last thing tried before changing the data |
| **R8** | **reclassify the data** — histogram bins 10 → 6, ranking rows 10 → 6 — **and say so** | large, and it is the only rung that changes what the chart states | the shape itself; for a ranking, the claim | Horak §2.4.4 reclassification, with §2.4.5's condition: "it is critical to inform the viewer that this has taken place" |
| **R9** | **refuse.** The beat does not ship portrait; the journalist is offered square (1080×1080) or landscape with the reason named | — | the format | see §5 |

**Why R2 is free.** It is the only rung that gives slack back without removing anything vertical:
fewer tick labels means a narrower y gutter, a wider plot, and — since the plot's height floor is
`plotWidth / maxAspect` — a *lower* floor to clear. It is always tried before anything is dropped.

### 4.1 — Three things rendering changed about this ladder, after it was written

Recorded rather than quietly edited, because a design that is silently rewritten to match its own
output is not a design.

1. **Reclassification moved from the middle of the ladder to the end (R6 → R8).** The first draft
   argued a sentence is recoverable outside the frame and shape detail is not, so data should go
   before words. Rendering settled it the other way: consolidating this beat's ten bins into six
   merged the 0–4 and 4–8 bins into a single 179-country column and **the right-skew — the whole
   claim — disappeared**. Horak lists bin reduction as a legitimate strategy; for a distribution
   whose point *is* its shape it is the most destructive rung on the ladder. It stays available
   only because the alternative is refusing, and it is emitted for veto.
2. **Removing the standfirst became its own late rung (R7), separate from reducing it (R3).** With
   only "reduce to one sentence" available, the histogram **refused** — it was 13 px short of its
   plot floor. Cutting a two-sentence standfirst to one and deleting it altogether are different
   sizes of loss and cannot be the same rung.
3. **A rung that recovers nothing does not fire.** The first run dropped the median's label, whose
   whole effect is inside the plot rectangle and which frees no budget at all — the reader lost the
   median for nothing. Every rung is now applied speculatively and kept only if the **slack**
   (`stage height − block − plot's own floor`) actually improved. R5 consequently never fires, which
   is the correct behaviour and makes it a documented no-op rather than a hidden one.

**And one rule that turned out not to be a rung at all.** The line's end label was specified as
`subject value unit` with a rung to shorten it. At 42 frame px "the sample town 604 mm" is 500 px of
ink — half the plot's width — laid across the series it labels, and the subject is already the
headline's subject. **Portrait uses the short form by default**; there is nothing left for a rung to
reduce.

---

## 5 — Refusal is a legitimate outcome

If the ladder runs out, the answer is not a smaller chart. **The right output is no portrait render
and a stated reason** — because at 36 px floor and a 979 px stage the frame's carrying capacity is a
measurable quantity, and a beat can genuinely exceed it: a twelve-series line, a scatter with two
hundred labelled points, a stacked bar with nine segments each needing a legend entry.

This is the leading hypothesis in the session handover and this design takes it: the phone frame is
a **budget**, and a budget that cannot be exceeded is not a budget. R7 exists so that "it did not
fit" is a sentence the tool can say, instead of a picture the reader cannot read.

---

## 6 — What this design does not settle

- **No phone has been looked at.** Every figure in §2 is arithmetic against published breakpoints.
  One screenshot of one of these PNGs in a real story composer would settle more than the rest of
  this document.
- **The category-count question is unanswered**, and §1.3 says why: nobody publishes a number. The
  budget stands in for it. Whether a budget-derived count matches what a designer would choose is
  untested.
- **The line's aspect range is known to be wrong** and is used anyway, so the line arm below inherits
  a defect it did not create.
- **R0's transposition is asserted from the earlier probe and the literature, not re-rendered here.**
- **Only two types.** A scatter, a heatmap, a pyramid and every map are untouched, and the map family
  has no plot rectangle for §3.3 to clamp.

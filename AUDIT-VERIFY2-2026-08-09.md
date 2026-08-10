# Second verification of the render audit — 2026-08-09

`twin/AUDIT-VERIFY-2026-08-09.md` (commit `4800369e`) re-checked the 27 findings of
`twin/AUDIT-2026-08-09.md` and reported **8 closed, 15 open, 2 changed, 2 disputed**. Four agents
then worked the fifteen open ones across eleven commits and each reported its own findings closed.
Nobody had checked them. This file is that check.

**Snapshot:** branch `experiment/doctrine-twin`, HEAD `fa6af309`. The previous pass's snapshot was
`85e233ca`; 18 commits separate them. Four files are untracked at the time of writing
(`vidy-pyramid-niger-population/pyramid-final-frame.png` + `-props.json`,
`vidy-waterfall-germany-electricity-mix/waterfall-final-frame.png` + `-props.json`) — measurements
touching those are true of the working tree, not of any commit.

**Nothing in this pass was fixed. One file was created: this one.**

**Method.** Every verdict rests on the delivered artifact. PNGs were opened with an image reader and
looked at, and pixel-measured where a number is claimed. HTML was driven in real Chrome at real
viewports with real pointer and CDP touch events at rounded integer coordinates — never `.focus()`
in place of a pointer. Every mp4 verdict comes from frames extracted **from the mp4 itself** with
`ffmpeg`, never from a committed `*-still.png` or `frame-*.png`. Every numeric claim was recomputed
from the beat's own frozen data, in code run here. Two claimed guards were **mutation-checked in a
`git archive` copy under `/tmp`**, never in the shared tree.

**`bun test` is green** — `cd twin && bun test`: **1522 pass, 3 skip, 0 fail**, 3845 assertions,
82 files, 126s. (Up from 1254/3/0 at the previous pass: the two new guard files.)

---

## 1. The fifteen

| # | Finding, in short | Previous verdict | **This pass** |
|---|---|---|---|
| F6 | Both locator maps call their farthest marker "nearby" | OPEN (and worse) | **CLOSED** |
| F9 | Axis half: tick prints "80" for a gridline at 79.5 | OPEN | **CLOSED** |
| F10 | Storyboard's recorded fact-check carries three wrong numbers | OPEN | **CLOSED** |
| F11 | "2,567 km from the Black Forest to the Black Sea" | OPEN | **CLOSED** |
| F13 | A credit that does not cover the points the claim rests on | OPEN | **CLOSED** |
| F14 | A stated map extent that is not the extent | OPEN | **CLOSED** |
| F15–F17 | Doc-borne false claims (10 sub-items) | OPEN (majority) | **OPEN** (5 of 10) |
| D2 | Boxplot switches denominators between title and label | OPEN | **CLOSED** |
| D3 | Pyramid's zero spine strikes through all 21 band labels | OPEN | **CLOSED** |
| D4 | Waterfall's conclusion label sits in the Coal bar's fill | OPEN | **CLOSED** |
| D6 | Text drawn over the thing it describes (2 still open of 6) | OPEN (2 of 6) | **CLOSED** |
| D7 | Clipped and colliding at narrow widths (3 still open of 6) | OPEN (3 of 6) | **CLOSED** |
| D8 | Colour discipline (4 items) | OPEN (3 of 4) | **OPEN** (3 of 4) |
| D9 | The promised scrollable tooltip cannot be scrolled | OPEN | **CHANGED** |
| D10 | Smaller, real (14 items) | OPEN (8 of 14) | **OPEN** (9 of 14) |

### Headline count

> **11 CLOSED · 1 CHANGED · 3 OPEN**
>
> Of the three still open, none was touched by this cycle's commits: D8 and D10 were not worked at
> all, and F15–F17 was worked on five of its ten sub-items and closed on exactly those five.

Plus **two new defects introduced by this cycle's repairs** (§4), both minor and both measured, and
**two corrections to the previous verifier** (§3).

---

## 2. Evidence, finding by finding

### F6 — the locator maps' "nearby" · **CLOSED**

Both delivered artifacts were re-read. `map-geneva-locator/render/static.svg`'s `<desc>` now says:
*"9 of the markers … sit together within 1.5 km of the United Nations Office at Geneva, while 2
stand alone in the frame and are labelled beside their own points — the World Economic Forum … 4.2
km east and the International Civil Defence Organisation … 4.0 km south of that cluster."*
`mapgen-locator-web/locator.html` carries the same sentence. `grep -c nearby` on the web artifact:
**0**. The false exclusivity claim the previous pass found — *"the one marker outside the cluster"* —
is gone from both.

Recomputed from `geneva-orgs.csv` with my own haversine, independently of the render:

| stated | measured |
|---|---|
| 9 within 1.5 km of UNOG | max **1.5137 km** (`toFixed(1)` → "1.5") |
| 9 within 1.3 km of their common centre | max **1.2831 km** |
| WEF 4.2 km east | **4.1828 km**, bearing **92.1°** |
| ICDO 4.0 km south | **3.9975 km**, bearing **194.7°** |
| 4 UN / 5 other intergovernmental / 2 other international | 4 / 5 / 2 |

Nearest-neighbour distances confirm the previous pass's sharpening: ICDO **3.317 km**, WEF
**3.252 km**, everything else ≤ 0.962 km. The split is now derived from the largest gap in the
sorted nearest-neighbour list (2.29 km wide, printed by the render), so the count, the compass
headings and the singular/plural all follow the coordinates.

I opened `render/static.png` and cropped the label cluster at 3×: WEF and ICDO are both labelled and
no label overlaps a marker. I drove `locator.html` at 1200×900 and at 375×900 and looked at both:
three labels drawn, none crossing a marker at either width.

**Guard mutation-checked.** In a `/tmp` copy I dropped the WEF label from the placement filter
(`p.key !== "o9"`) and re-ran `render-web.mjs`: it **threw** at `LocatorWeb.tsx:337` — *"the
furniture names World Economic Forum, but the … layout left it unlabelled."* Unmutated, the same
script reproduces the committed `locator.html` **byte-identically** (SHA-256 `f2ac94de83de6ec7…`).

*Nit, not a finding: `toFixed(1)` prints "within 1.5 km" for a true maximum of 1.5137 km — 14 m
understated. `toFixed` rounds to nearest; a "within" claim wants `ceil`.*

### F9 — the life-expectancy axis · **CLOSED**

Frame 239 of 240, extracted from `life-expectancy.mp4` and looked at: the bottom tick reads
**"79.5"**, the top **"84 yrs"**, and the 2000 reading now sits above a gridline that names its own
position. Recomputed: `scaleLinear().domain([79.834, 83.9536]).nice()` → `[79.5, 84]`.
`LifeExpectancyVideo.tsx` now derives the decimal count from the value (`exactDecimals`) and carries
a separate tripwire that re-reads the printed label as a number and throws if it is not the gridline.

The committed `life-expectancy-still.png` — a file no script produces — was refreshed and is
byte-identical to the (untracked) `-final-frame.png`; against frame 239 pulled from the mp4 it
differs only by codec noise. **It no longer preserves the "80" the source stopped drawing.**

### F10 — the storyboard's own fact-check · **CLOSED**

Recomputed from `co2-suisse/data.csv` (167 rows, 1858–2024, converted to Mt):

| STORYBOARD now states | measured |
|---|---|
| 1973 = 46,20 Mt | **46.2049** |
| 2005 = 45,78 Mt | **45.7761** |
| 2005 is the **4th** highest | rank **4** |
| the peak's real margin is over **1991 (46,13 Mt)**, at **0,07 Mt** | 1991 = **46.1307**, margin **0.0742** |
| 1973 leads 2005 by **0,43 Mt** | **0.4288** |

The line is now labelled as recomputed and carries a dated retraction naming what it used to say.
The two headline figures elsewhere in the document also reproduce (2024 = 32.07 → "32,1";
1967 = 32.53 → "32,5").

### F11 — "2,567 km … to the Black Sea" · **CLOSED**

Frame 325 of 326, extracted from `mapgen-flowmap-video/render/flowmap.mp4`: the conclusion reads
**"2,567 km from the Black Forest to the Danube Delta — 9 of the 10 countries crossed, in order."**

Recomputed over the 911 frozen points of `danube-route.csv`: great-circle sum **2567.31 km**; last
point **(28.747, 45.23074)**, which is **68.0 km** from Chilia, **71.5 km** from Sulina and
**76.4 km** from Sfântu Gheorghe — i.e. at the head of the delta, which is what the sentence now
says. `grep` over the whole tree: no delivered artifact still attaches 2,567 km to the sea.

The committed `frame-hold.png`, which no script produces, was refreshed with it — the one file in
this cycle that would otherwise have preserved the retracted sentence. `final-frame.png` matches the
mp4's last frame. `frame-early.png` / `frame-mid.png` were not refreshed and did not need to be: I
cropped the conclusion band of both and it is empty at those points in the reveal.

*Adjacent, unchanged and pre-existing: the destination dot still clips badge 9 (D10 #2), and the
"Danube Delta" label now ends against badge 9's halo without overlapping its digit.*

### F13 — the credit that dropped Maddison · **CLOSED**

`web-income-life-expectancy/income-life-expectancy.html` now prints: *"Source: United Nations World
Population Prospects (2024) & **Maddison Project Database 2023 (Bolt and van Zanden)**, via Our World
in Data · 2022 data"*. "World Bank" no longer appears.

The credit is now built from a frozen `owid-metadata.json` committed beside the data, which I read:
`columns/GDP per capita/citationShort` = *"Bolt and van Zanden – Maddison Project Database 2023"*,
and the life-expectancy column's processing note gives UN WPP for 1950 onward — the plotted year is
2022. Recomputed from `data.csv`: Cuba **$7,648.70 / 77.63 yrs** (desc: "about $7,600, 77.6 years"),
Switzerland **$63,323 / 83.20**, United States **$58,487 / 77.98**. The desc's "164 countries"
against 165 rows reconciles: Central African Republic is excluded by name in `render-web.mjs` with a
documented data-quality reason, and the delivered file draws **164** points.

The committed `preview.png` was re-rendered — I opened it and read the new credit off the image.

### F14 — the stated map extent · **CLOSED**

`mapgen-hexgrid-web/hex-grid.html` now prints *"The map holds **64°S–80°N** … and **118 of the
14,175** catalogued events fall outside it"*, both derived in `render-web.mjs` from the plate's own
`frameCorners` and from parsed-minus-kept rather than typed.

Verified against the frozen plate and CSV: `frameCorners` = south **−64.4777**, north **79.8465**,
west **−179.9**, east **179.9**; `plate/geometry.json` holds **14,057** points against **14,175** CSV
rows. I reconciled the 118 exactly — **45** rows fall outside the latitude band and **73** outside
the longitude band; the union is **118**. So the sentence is true of the frame in both axes, not
only the one it names. I drove the artifact at 375×812 and read the caveat off the render.

*Nit: `Math.abs(north).toFixed(0)` rounds 79.847 UP to 80, so the stated ceiling is 0.15° beyond the
frame; the southern bound rounds the safe way.*

### F15–F17 — the doc-borne set · **OPEN**, 5 of 10 sub-items

**Closed (5).**

- *`COMPARISON.md` "the frame is full: −45 to 84"* — corrected, and the correction's own arithmetic
  reproduces. I decoded `3-MIGRATION--main-datawrapper.png` myself: **1200 × 676**, gridlines at
  y = **172.5 / 254.5 / 336.5 / 418.5**, bold zero rule at **499.5** → **4.0875 px/unit**, so −45
  lands at **y ≈ 683** and the canvas floor is **−43.2**. The paragraph now says −3.4 to 84 and
  carries a dated correction.
- *`COMPARISON.md`'s blanket "every pixel claim … was verified directly"* — now says the opposite in
  its own words, naming the counter-example.
- *The four `vidx-*/BRIEF.md` row counts* — I re-measured all five CSVs and their per-entity splits
  independently: grouped-bar **1008 rows, 1750–2024, World 230 / US 225 / Brazil 169 / India 156 /
  China 118 / Nigeria 110**; line **356 rows, 1816–2023, France 208 from 1816, Switzerland 148 from
  1876**; slope **543 rows, 1876–2024, Switzerland 149 from 1876**; stacked-bar **26 rows,
  2000–2025**; scatter **165 / 2022 / 165**. Every figure now printed matches.
- *`migration/timing-contract.ts`* — now carries a retraction naming the invented series verbatim and
  states the frozen file's own numbers. Recomputed: 34 rows 1991–2024, negatives **1996 (−5.807)**
  and **1997 (−6.834)**, **1998 = +1.177**, peak **2023 (+139.118)**. All four reproduce.

**Open (5).**

- *`COMPARISON.md:180` "dropping the non-subject labels"* — unchanged. I opened `ranking-twin.png`:
  it prints **all 16 country names and all 16 values**; the non-subject rows are grey and non-bold.
  Demoted, not dropped — and the same document says "all sixteen rows" at `:123`.
- *`COMPARISON.md:376` "`1-CO2--main-chartnative.png` labels its final year, 2024"* — unchanged. I
  opened the image: the end label reads **"Émissions territoriales / 32,1"**. No year is printed
  anywhere but the x-axis, whose last tick is **2020**. The argument the sentence supports survives;
  the sentence does not.
- *"European average, 6,55 t" (`:35`, `:216`)* — unchanged, still without saying which average.
  Flagged uncertain, as before.
- *`vidy-waterfall/BRIEF.md:3-7`* — unchanged and wrong. Recomputed from the beat's own `data.csv`:
  coal **−138.11** + nuclear **−133.34** = **−271.45** ✓; wind+solar+bioenergy = **+171.24**; all
  renewables = **+171.69**. The ratio is **1.585×**, not "more than twice", and the **171.69**
  attached to "wind, solar and bioenergy" is the all-renewables figure. (The rendered video's own
  numbers are sound — 2010 total **624.21**, 2023 **506.72**, net **−117.49**, all reproduced.)
- *`vidy-histogram/BRIEF.md`* — unchanged and wrong. Measured 2023 rows: **261**, not 259.
  Aggregates: **24** (my raw classifier says 25 and the BRIEF's own documented exception, Kosovo, is
  the difference), not 22. The subtraction still lands on the drawn and guarded **237**.
- *`map-quake-density/BRIEF.md`* — unchanged. It states a median non-empty cell of **12** while the
  delivered SVG prints **"133× the median non-empty cell"**, a ratio only 13 produces (1,724 / 12 =
  143.7). `render.mjs:90` takes index `floor(150/2)` — the upper middle, 13 — where the median of
  150 values is **12.5**, so the artifact's own denominator is also not quite the median.

### D2 — the boxplot's denominators · **CLOSED**

Frame 259 of 260, from the mp4. Headline *"…the US and Canada each emit **over 4×** the region's
median"*; conclusion labels *"United States 14.3 · **4.8× the Americas median**"* (upper) and
*"Canada 13.9 · **4.6× the Americas median**"* (lower); Americas box labelled **3.0**; and a new
subtitle line *"Median across all 53 countries — 3.7 (dashed line)"* naming the other denominator
explicitly.

Recomputed from `data.csv` through the render's own continent map, in my own code: Americas n=12,
median **3.0063**; United States **14.31945 → 4.7631×**; Canada **13.880179 → 4.6170×**;
all-53 median **3.6921**. `floor(min(4.617, 4.763))` = 4 → "over 4×". Every printed number is
consistent with every other.

The claim now has a tripwire — `titleGroundedInLabels` in `render.mjs` derives the headline multiple
from the smallest label multiple, re-reads each label's own rounded string, and throws if any is not
above the headline or if the title states a second multiple. The cosmetic half is closed too: the
higher value now prints above the lower one.

**Adjacent damage checked and absent.** I extracted frames 100–259 and measured the two label rows'
vertical bands on every one: **507–519 and 529–541 throughout**, never merged, never closer than
10 px. The labels arrive at frame 101 and do not collide at any point.

### D3 — the pyramid's zero spine · **CLOSED**

Frame 336 of 336, from the mp4, magnified 4× down the centre gutter: the dashed spine **breaks at
every band label**. "85-89", "95-99", "90-94", "100+", "0-4" all read correctly. The mechanism is a
mask whose clearance rect is each label's own measured glyph band.

Measured across all 336 extracted frames, sampling the spine column only at rows where no hyphen
sits: each band shows the dash through its own label for **3–5 frames (0.10–0.17 s)** while that
label crossfades in, because the mask rect carries the label's opacity. At those frames the label is
itself faint. Recorded in §4 as a residual of the repair, not as a live defect.

The committed `pyramid-still.png` was refreshed and matches the mp4's last frame.

### D4 — the waterfall's conclusion label · **CLOSED**

Frame 314 of 314, from the mp4, pixel-measured. The Coal bar's vermillion rect spans **x 741–831,
y 402–513**; dark glyph pixels inside it: **2** (both at x=741, the connector's own dash), against
the previous pass's 286. The conclusion label `506.72 TWh · net −117.49 TWh` now occupies
**x 861–1006, y 466–517** — clear of the Coal bar, and clear of the 2023 total bar, whose fill I
localised at **x 871–916, y 518–903** and inside which there is not one glyph pixel.

Scanned all 314 frames for dark pixels inside the Coal footprint: only frames **194–195**, and those
are the bar's own "−138.11" value label sitting below a bar that has not yet grown into the space —
I cropped and looked. The label's box does sit partly over the pale `#E7E7E7` reference band behind
the 2023 bar; contrast there is ≈17:1 and it is not a bar's own fill.

All three rendered totals reproduce from `data.csv`: 2010 **624.21**, 2023 **506.72**, net
**−117.49**.

### D6 — text drawn over the thing it describes · **CLOSED** (both remaining instances)

- **`map-quake-symbol` legend caption.** The caption now **wraps to two lines** inside the 308px
  column — *"Magnitude (radius scaled to √magnitude, not to"* / *"energy released)"* — and the block
  grows upward so the reference circles stay put. I opened the PNG: nothing reaches the plate, which
  begins at x 372. The fit check was rewritten to measure the wrapped block's real top.
- **`static-wind-vs-solar` leader.** I opened the still: the callout is two lines and the dashed
  leader now begins **below** them. *"reversal in this group"* is intact; the leader descends clear
  of the "7.2" value label.

*Adjacent, pre-existing, not from this repair: the symbol map's point labels print "M8" while its
legend prints "M8.0" — the same value in two formats in one frame.*

### D7 — clipped and colliding at narrow widths · **CLOSED** (all six)

Items 4, 5 and 6 were already closed and re-confirmed. The three that were open:

1. **`mapgen-hexgrid-web` legend caption at 375 — CLOSED.** My own measurement, driving the file in
   Chrome at 375×812: **20 text nodes, maximum right-edge overrun −16.46 px** (i.e. every one inside
   its SVG), `scrollWidth == clientWidth == 375` so no horizontal scroll. The caption wraps to two
   lines and **"aggregate mode: count"** is visible — I screenshotted and read it. The pre-fix file
   measures **+55.6 px** of overrun, so the defect was real.
2. **`more-heatmap` UK row label at 375 — CLOSED.** Left edge **13.41** against a frame pad of
   **14.00** (was 1.95). A 0.59 px residual, sub-pixel.
3. **`more-heatmap` at 481–830 — CLOSED.** The breakpoint moved 480 → 675, so 481 and 600 now scale
   the narrow rung **up** instead of the desktop rung down: title **20.5 / 25.6 / 22.1 px** at
   481 / 600 / 830, source line **12.8 / 16.0 / 12.0**, legend labels **11.5 / 14.4 / 12.0**. The
   audit's 12.83 / 6.95 / 6.41 reproduce on the pre-fix file. Nothing renders below 9.00 px at any
   width tested.

Pairwise text-box sweeps at 375 / 600 / 900 / 1440 on both repaired artifacts: **0 overlaps, 0
clipped texts, no horizontal scroll**, and interaction survives (56/56 heatmap cells and 156/156
hexgrid cells focusable, hover and Tab both raising an in-viewport tooltip with the right content).

### D8 — colour discipline · **OPEN**, 3 of 4

Not touched by this cycle. Every number re-measured from the current PNGs with an independently
written sRGB→Lab conversion; I reproduced the two headline ΔE values myself to three decimals.

- **Danube colour collapse — OPEN.** `mapmore-flow-danube/render/static.png`: Austria (200,229,243)
  vs Adriatic (170,201,224) = **ΔE76 11.057**; Romania vs Ukraine = **15.599**; Croatia vs Serbia =
  **9.720**; Bulgaria vs Ukraine = **8.980**. The mechanism is arithmetic, not inference: `#88CCEE`
  at `fillOpacity 0.42` over the `#F7F7F7` ground is exactly (200.4, 229.0, 243.3). **The same
  palette lives in four delivered artifacts**, not one — the video's static plate, the mp4 itself and
  the scrolly all carry it. And the confusion is more direct than "directly above the Adriatic":
  Austria's fill comes within **7.6 px of actually-rendered water** at the Bodensee.
- **Inland lakes painted as land — OPEN, and larger than stated.** In
  `mapmore-dot-population/render/static.png`, with the projection re-derived from the plate's own
  bounds and validated against six known points: Vänern, Vättern, Balaton, Saimaa, IJsselmeer and
  Lough Neagh all sample study-land `(240,240,240)` with **zero water pixels**; the control, Ladoga,
  is **89.5% water**. Two additions: **Lake Geneva** is a seventh instance, and **Lake Peipus is cut
  in half by the border** — 49.6% land on the Estonian side, water on the Russian side, in one frame.
  Dots land on Balaton (12 of 121 sampled px) and the IJsselmeer (55).
- **Study vs no-data countries — OPEN.** `#F0F0F0` vs `#F7F7F7`: **ΔE76 2.436**, luminance contrast
  **1.064:1** (I recomputed both). For scale, the same map separates land from sea by ΔE 22.0.
- **`webx-carbon-footprint` median label contrast — CLOSED, residual understated.** Sampled per
  pixel inside the label's own rect at both widths: opaque white chip, black glyphs, **21.00:1** at
  375 and at 900 (was 3.39:1). The residual grows with viewport rather than sitting at "8×13px at
  900": clearance **+2.89 px at 375**, **−8.02 px at 900** (105.9 px² bitten out of the tallest bar),
  **−22.56 px at 1600** (293.4 px²) — a notch in every desktop rendering.

### D9 — the tooltip that cannot be scrolled · **CHANGED**

The capability was **withdrawn rather than repaired**, and the artifact now says so.
`webx-carbon-footprint/BRIEF.md:36` reads *"**It does not scroll, and an earlier build of this brief
said it did.**"*, with the previous pass's own measurement quoted and the reason given (the tooltip
is `pointer-events: none`, so a wheel goes to the bin underneath; keyboard focus stays on the bin; a
finger inside a fixed overlay fights the page scroll).

Driven for real in Chrome over the 0–4 t bin:

| viewport | clientHeight | scrollHeight | overflowY | box | fits |
|---|---|---|---|---|---|
| 1440×900 | **502** | **502** | visible | top 8, bottom 512 | yes |
| 375×667 | **502** | **502** | visible | top 8, bottom 512 | yes |

Nothing is hidden and there is nothing to scroll. The 56.6% of the list that was unreachable is
reachable. Verdict CHANGED rather than CLOSED because the finding as written — a promised scroll
that does not work — no longer applies in that form: the promise is gone.

*Residual, measured while checking: with the tooltip open, it covers the median label entirely
(black glyph pixels in the label's rect drop from 158 to 56).*

### D10 — smaller, real · **OPEN**, 9 of 14

Not worked this cycle. All fourteen re-verified against current artifacts.

| # | Item | Verdict | Measured |
|---|---|---|---|
| 1 | stacked-bar `78.4 TWh` on the 80-TWh gridline | **OPEN** | Frame 247 from the mp4: glyph rows y 322–336, gridline y 335–336. The value itself is right (2024 column sum 78.37) |
| 2 | flowmap destination dot clips badge 9 | **OPEN** | Badge (946.5, 525.0) r=9.0; dot (948.5, 538.5) r=7.0; centre distance **13.65** vs radii sum 16.0 → 2.35px fill overlap, ~3px of arc replaced |
| 3 | `web-co2-ranking` French comma | **CHANGED** | Comma gone; labels print `7.1 t`. Live hover still returns `Poland · 7.0801 t` — 4 dp against a 1 dp label |
| 4 | `weby-lollipop` raw-float tooltips | **OPEN** | Live hover: `Belgium · 7.2798314 t`, `Italy · 5.087886 t`; all 15 targets carry the unrounded float |
| 5 | `weby-dumbbell` gains that don't reconcile | **OPEN** | 2 of 10, recomputed: Switzerland raw gain 4.1196 printed `+4.1 (79.8 → 84.0)`; Netherlands 4.0276 printed `+4.0 (78.1 → 82.2)` |
| 6 | pyramid `(669,962)` on the wrong side | **CLOSED** | Number absent from the visible render; leader now 214 px terminating on the 55-59 men's bar |
| 7 | `vidy-lollipop` undisclosed Netherlands drop | **CHANGED** | 14 drawn, BRIEF says fourteen. But `data.csv:122` still holds `Netherlands,NLD,2025,51.20035` and the BRIEF's own fetch URL still requests 15; no reason stated anywhere |
| 8 | quake legend cannot function as a ruler | **OPEN** | Radii **28.128 / 28.994 / 29.835** (6.07% spread) labelled M8.0 / M8.5 / M9.0, against a largest mark r=30 at M9.1. Byte-identical |
| 9 | shapefile names leak into furniture | **OPEN** | "Faeroe Is." in callout, live tooltip, `aria-label`, SVG `<title>` and table row, under a headline reading "The Faroe Islands". Likewise "Bosnia and Herz." |
| 10 | "Western European" over a non-Western set | **OPEN** | Title, `<h1>` and `<desc>` all say Western European; the ten drawn include Poland, Italy, Norway and Spain |
| 11 | `496` with no decimal | **CHANGED** | Web prints `496.0`; the static copy still prints bare `496` and its `<desc>` degrades to whole numbers throughout (639 / 103 / 92 / 154 / 496) while the picture keeps one decimal |
| 12 | boxplot ticks `0.0, 5, 10, 15, 20` | **OPEN** | Read off frame 259 at 4×: unchanged |
| 13 | bare `<desc>`, no `role="img"` | **OPEN**, sub-counts **DISPUTED** | 0 root svgs with `role="img"`, 0 with a direct-child `<title>` — but **2 carry `aria-label`**, not 0, and the bare-`<desc>` tally is **19 files / 23 root svgs**, not 17 |
| 14 | frame 0 of every mp4 blank white | **CLOSED**, historically **DISPUTED** | Frame 0 of all **25** mp4s: **1.322%–4.136%** non-ground. At `6044a492`, `mapgen-choropleth-video`'s frame 0 already measured 1.322%, so "every" was false when written |

---

## 3. Where I differ from the previous verifier

**1. D10 #13's "0 with `aria-label`" is wrong, and its `<desc>` tally is low.** Two root `<svg>`s
carry an `aria-label`: `mapgen-dot-web` and `mapgen-symbol-web`, both with `role="group"` and a
paragraph-length label. The bare-`<desc>` count is **19 files / 23 root svgs**, not 17. The core
finding — no `role="img"`, no direct-child `<title>` — stands.

**2. D10 #14's explanation over-generalises.** The verdict (closed) is right, but *"title and source
are painted"* is not true of every mp4: `mapgen-choropleth-video`'s frame 0 is furniture-free — its
1.322% is map texture, no text at all. The measured range is 1.322%–4.136% against the previous
pass's 1.72%–4.57%; threshold-dependent, same conclusion.

I found **no** case where a fix reported this cycle had not actually landed, and no case where the
previous pass called something open that is in fact closed.

---

## 4. New defects introduced by this cycle's repairs

Two, both minor, both measured. Neither reaches a false claim.

1. **The pyramid's spine strikes through each label for 3–5 frames while it fades in**
   (`vidy-pyramid-niger-population`). The clearance mask carries the label's own opacity, so at
   α ≈ 0.5 the label is half-drawn and the dash is half-erased: at frame 120, "70-74" reads
   "70⌐74". Measured per band across all 336 frames: **0.10–0.17 s each**, 19 bands, always during
   the band's own arrival and never in the held frame. The alternative — pre-cutting 21 gaps into a
   rule drawn before any band arrives — is what the implementation deliberately avoided, so this is
   a trade rather than an oversight, but it is not what the code comment claims ("the gap opens
   exactly as the label lands on it").

2. **The heatmap's new breakpoint makes the graphic jump scale** (`more-heatmap-…-decades`). Moving
   the rung boundary 480 → 675 fixed the tiny type at 481–674, but the phone rung is now stretched
   to **1.80×** at 674 px — title rendering at **28.76 px** — and drops to **18.03 px** the instant
   the desktop rung takes over at 676. Nothing collides and nothing clips; between 481 and 674 it is
   a phone layout blown up on a tablet column.

**And one thing this cycle did NOT introduce, checked because it hit three times before.** Every
committed artifact whose source changed this cycle was re-checked against its source:

- `life-expectancy-still.png`, `pyramid-still.png`, `frame-hold.png` and `preview.png` — all four
  committed files with no producer, or with a producer nobody runs — were refreshed and now match
  what their source draws. I verified each against the mp4 or the re-render, not against the commit.
- The remaining **nine** video beats that commit a `<name>-still.png` with no `-final-frame.png`
  beside it are, today, **content-identical to their own mp4's true last frame**: I extracted the
  final frame of each and diffed — **0 pixels differing by more than 60 levels, in all nine**. The
  class is unguarded, and it is currently honest.

**One guard mutation-checked, and it goes red properly.** `interaction-promises-are-kept.test.ts`
passes 217/217 on the tree. In a `/tmp` copy I removed the touch exemption from
`webx-life-expectancy`'s `pointerleave` handler — the exact defect it was written for — and it
failed with the right diagnosis: *"tap: 3 of 3 probed marks show nothing … (tap is read AFTER the
finger lifts — an unguarded `pointerleave` on a touch pointer wipes the tooltip the tap just
opened)"*. Driving all **nine** artifacts that make the reader-facing promise, with a real CDP
touch sequence: **9 of 9 keep the tooltip after the finger lifts**. Mouse hover still clears
correctly on all three repaired beats, so the fix did not trade one input for another. Three further
artifacts (`co2-suisse`, `web-income-life-expectancy`, `webz-bump-emitter-rank`) still lose the
tooltip on touchend, and none of them promises tap to a reader — but their inlined interaction
module's own doc-comment says it wires "hover, tap and keyboard", which is the comment being wrong
rather than the artifact.

---

## 5. What is still open, ranked by how badly it misleads a reader

1. **D8 — the two maps' colour.** Austria reads as sea at ΔE 11.06 and touches rendered water 7.6 px
   away; seven inland lakes are painted as land while the one lake outside the study set stays blue,
   with dots scattered over the IJsselmeer as if people lived on it; excluded countries sit 2.4 ΔE
   from included ones, about one JND. Three separate ways to read the map wrong, in four artifacts.
2. **D10 #9 and #10 — furniture that names the wrong thing.** "Faeroe Is." in the tooltip, the
   `aria-label`, the SVG title and the table under a headline reading "The Faroe Islands"; and
   "Western European" over a set containing Poland, Italy, Norway and Spain.
3. **F15–F17's waterfall brief — "more than twice as much as renewables gained"** where the measured
   ratio is 1.585×, with 171.69 attached to a trio that sums to 171.24. It does not reach a reader,
   but it is the editorial contract the next render is written against.
4. **D10 #5 — dumbbell gains that do not reconcile inside one string.** "+4.1 years (79.8 → 84.0)"
   asks the reader to do a subtraction that gives 4.2.
5. **D10 #8 — a legend that cannot serve as a ruler.** Three circles within 6.07% of each other
   labelled M8.0 / M8.5 / M9.0, and the largest data mark is bigger than the top reference.
6. **D10 #1, #2, #12 — small render defects a reader sees**: a value label resting on a gridline, a
   dot eating a badge's digit, an axis reading `0.0, 5, 10, 15, 20`.
7. **D10 #3, #4, #11 — precision that contradicts itself**: 4-to-7 decimal floats in tooltips over
   one-decimal labels, and a static `<desc>` that rounds to whole numbers under a picture that does
   not — a screen-reader user getting a strictly less precise chart than a sighted one.
8. **D10 #7 — an undisclosed dropped country.** The data file and the fetch URL still hold the
   Netherlands; nothing anywhere says why fourteen are drawn.
9. **F15–F17's remaining `COMPARISON.md` items.** No reader sees them, but this is the document that
   decides whether the twin wins, and two of its statements about its own images are still false
   ("dropping the non-subject labels"; "labels its final year, 2024").
10. **F15–F17's histogram and quake-density briefs**, and the "6,55 t" that names no average.
11. **D10 #13 — no `role="img"`, no accessible name** on 23 root svgs; and the pyramid's own repair
    left its graphic nameless.

---

## 6. Where this verification is uncertain

- **F13 rests on an external fact** — that the World Bank does not publish GDP per capita for Cuba
  and Taiwan — which I did not re-verify against the World Bank. What I did verify is stronger for
  this repair: the credit is now **built from a frozen copy of the provider's own metadata**, which
  names Maddison for the GDP column, so the artifact no longer depends on anyone's memory.
- **D2's ratios** were recomputed through the continent map that lives in `render.mjs`, not in the
  CSV. A wrong continent assignment would move the median and I would not see it; the guard would
  not either.
- **The pyramid's crossfade measurement** samples the spine column at the label's top and bottom
  rows to avoid the hyphen; a band whose glyphs happen to sit on the centre line (the "100+" row,
  which has no hyphen) reads as struck for the whole video and is a false positive of my instrument,
  not a defect.
- **`map-quake-density`'s median.** I read the render's own printed ratio and its `median` line
  rather than re-binning the hexagons, so my statement that the true median of 150 cells is 12.5
  rests on the cell counts the render reports, not on my own binning.
- **Four files are untracked**, including both `-final-frame.png` files the pyramid and waterfall
  repairs produced. The stills committed beside them match, so nothing hangs on it, but a fresh
  clone will not contain the frames those repairs were verified against.

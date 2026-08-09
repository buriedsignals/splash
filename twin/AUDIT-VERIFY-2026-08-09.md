# Verification of the render audit — 2026-08-09

`twin/AUDIT-2026-08-09.md` was written, roughly a dozen agents then worked in this tree, and nobody
re-ran it. This file establishes what is actually closed.

**Snapshot:** branch `experiment/doctrine-twin`, HEAD `85e233ca`. The audit's own snapshot was
`6044a492`; 43 commits separate them. The tree grew while this pass ran — the artifact count moved
from 70 PNG / 20 HTML / 19 mp4 (the audit's inventory) to **113 PNG / 23 HTML / 24 mp4**, and three
beats that did not exist at the audit's snapshot appeared during it.

**Nothing in this pass was fixed.** It is a report only. One file was created: this one.

**Method.** Every verdict below rests on the current artifact, not on source and not on a commit
message. PNGs were opened and looked at. HTML was driven in real Chrome at real viewports with real
pointer and touch events at rounded integer coordinates — never `.focus()`, never a synthesised
event. mp4 verdicts come from frames extracted **from the mp4 itself** with `ffmpeg`, never from a
still committed beside it. Numeric claims were recomputed from the beat's own frozen data.

**`bun test` is green** — `cd twin && bun test`: **1254 pass, 3 skip, 0 fail**, 3636 assertions,
80 files, 74s. (Running `bun test` from the *repository* root instead runs `main`'s old Splash suite,
which needs Datawrapper and MapTiler credentials and reports 355 fail / 331 errors. That is not the
twin and is not a finding.)

---

## 1. The real numbering

The audit carries **27 numbered labels — F1–F17 and D1–D10** — laid out in 25 sections, because
`F15–F17` is one combined section holding five bullets. The table below has one row per label.

| # | Finding, in short | Verdict |
|---|---|---|
| F1 | 8 comparison PNGs render a fabricated series credited to the FSO | **CHANGED** |
| F2 | The trial PNGs repeat it; `TRIAL-THREE-BEATS.md` scored beat B a pass | **CHANGED** *(+1 DISPUTE inside)* |
| F3 | Hex-density map draws the world 1.58 times | **CLOSED** |
| F4 | Symbol map promises a size difference its geometry makes 2.9% | **CLOSED** |
| F5 | Dot-density alt confuses count with density | **CLOSED** |
| F6 | Both locator maps call their farthest marker "nearby" | **OPEN** |
| F7 | Histogram alt puts Qatar in a bin Qatar is not in | **CLOSED** |
| F8 | Slope alt contradicts the labels printed beside it | **CLOSED** |
| F9 | "Nearly a year" for a 0.72-year drop; axis tick misstates itself | **OPEN** (1 of 2 halves) |
| F10 | A storyboard's recorded fact-check carries two wrong numbers | **OPEN** |
| F11 | "From the Black Forest to the Black Sea: 2,567 km" | **OPEN** |
| F12 | The scrolly's alt says "tap" works; tap is broken | **CLOSED** *(class live elsewhere — §4)* |
| F13 | A credit that does not cover the points the claim rests on | **OPEN** |
| F14 | A stated map extent that is not the extent | **OPEN** |
| F15–F17 | Doc-borne false claims that do not reach a reader (5 bullets) | **OPEN** (majority) |
| D1 | Histogram x-ticks at bin centres while naming bin edges (×2) | **CLOSED** |
| D2 | Boxplot switches denominators between title and label | **OPEN** |
| D3 | Pyramid's zero spine strikes through all 21 band labels | **OPEN** |
| D4 | Waterfall's conclusion label overprints a bar | **OPEN** |
| D5 | Scroll vehicle hides a badge at every scroll offset | **CLOSED** |
| D6 | Text drawn over the thing it describes (6 instances) | **OPEN** (2 of 6) |
| D7 | Clipped and colliding at 375px (6 items) | **OPEN** (3 of 6) |
| D8 | Colour discipline (4 items) | **OPEN** (3 of 4) |
| D9 | The promised scrollable tooltip cannot be scrolled | **OPEN** |
| D10 | Smaller, real (14 items) | **OPEN** (8 of 14) |

### Headline count

> **8 CLOSED · 15 OPEN · 2 CHANGED · 2 DISPUTED**
>
> (27 labels; the two disputes sit *inside* F2 and D10, whose own verdicts are CHANGED and OPEN, so
> they are counted separately and do not double-count. Of the 15 OPEN, 9 are wholly open and 6 are
> partially closed — the per-item detail is in §2.)

Plus **one live instance of a closed finding's class, in two artifacts the audit scored sound** (§4),
and **one thing no guard covers and no audit has touched** (§6).

---

## 2. Evidence, finding by finding

### F1 — the eight superseded comparison PNGs · **CHANGED**

The pixels are untouched. I opened `3-MIGRATION--twin.png`: it still prints *"Twice since 1990"*,
callouts `1997: −1.9` and `1998: −3.4`, credit *"Source: Federal Statistical Office, data 2024."*
I recomputed `proof/migration/data.csv` (34 rows, 1991–2024): the negative years are **1996 (−5.807)**
and **1997 (−6.834)**, **1998 is +1.177 — positive**, and the maximum is **2023 (139.118)**. The
audit's measurement reproduces exactly. `2-VIE--twin.png` still shows `2020 82.9` and an endpoint
`84.2 years` at **2024**, a year the frozen series does not contain.

What changed is the standing, not the render. The audit asked for "re-render or delete"; a third
option was taken:

- `proof/comparison/SUPERSEDED.md` and `proof/trial/SUPERSEDED.md` — full recomputations, with the
  corrected renders linked, and four checkable reasons why a faithful re-render is unavailable.
- A PNG `tEXt` retraction stamped into the image metadata so the warning travels with the file.
  I extracted the chunks from all 21 PNGs in both folders: **exactly the 8 comparison files and the
  2 trial files carry `Warning / SUPERSEDED 2026-08-09`**, and the four sound `1-CO2--*` do not. The
  stamp is on the files it is true of and no others.
- `COMPARISON.md` gained retraction blockquotes at each affected section (`:300`, `:323`, `:317`).

Verdict CHANGED rather than CLOSED because a reader who opens the PNG without reading its metadata
still receives the false figures under a real institution's name. The mitigation is honest about
this: `stamp-superseded.mjs`'s own header calls it "strictly better than nothing and strictly worse
than a banner".

### F2 — the trial PNGs · **CHANGED**, and one assertion **DISPUTED**

Same retraction mechanism. The audit's second ask is met: `TRIAL-THREE-BEATS.md:85` now reads
*"three beats shipped a false claim. Beat B's artifact carries a worse one than beat A's"* — beat B
is no longer scored a success on claim-grounding.

**DISPUTE.** The audit wrote of beat C: *"Not provable — `trial/` commits **no `data.csv`**, so
nothing here is recomputable at all."* That was false when written, and I can measure it three ways
at the audit's own snapshot `6044a492`:

- `trial/beat-b-migration.png` and `comparison/3-MIGRATION--twin.png` are **byte-identical**
  (SHA-256 `76b0fa59fdfb04e7…`).
- `trial/beat-c-life-expectancy.png` and `comparison/2-VIE--twin.png` are **byte-identical**
  (SHA-256 `de03f5faf0496…`).
- Beat A is recomputable too. Norway's series is frozen in a sibling beat: from
  `proof/vidz-bump-emitter-rank/data.csv`, 1993 = **35.948 Mt** (render prints "35.9"), 2024 =
  **37.183 Mt** (render prints "37.2"), and of the 31 years 1993–2023 exactly **one** sits below
  2024 — 1993 itself. The title is false, the two rendered values are correct roundings.

So all three trial PNGs were recomputable from data already in the tree. The audit recomputed two of
them under one filename in F1 and declared the same bytes un-recomputable under another filename
fifteen lines later. The folder was never the unit of recomputability; the image was.

### F3 — the hex-density map's world copies · **CLOSED**

I opened `map-quake-density/render/static.png`: one world, Pacific-centred, hexagons continuous
across the frame including over the Americas — the empty right-hand copy is gone. Mechanically,
`plate/geometry.json` now records `frame 836×480` (was 836×300) and
`frameCorners: west −179.9 … north 78.223, south −60.537`, with the world filling the frame.
`bake.mjs:188-210` now asserts *the world must fill the frame's width* and *the plate must not crop
the study area*, and documents why `renderWorldCopies: false` was the wrong fix (MapLibre clamps and
crops instead). The delivered caveat prints a derived "**61°S–78°N**" and "104 of the 14,175
catalogued events fall outside it".

### F4 — the symbol map's "wide margin" and its date range · **CLOSED**

The delivered `<desc>` in `render/static.svg` now reads: *"It is the largest circle, **but only just**:
radius goes as the square root of magnitude from zero, so it is **under 3% wider** than the
magnitude-8.6 circle off Sumatra — a difference of **0.8 pixels** at this size. The accent outline,
not the size, is what identifies it."* Derived, and it says the honest thing.

The date range is fixed on the render I opened: title *"…between **2005 and 2017**"*, source
*"M7.8+, western Pacific, **2005–2017**"*. Recomputed from `quakes-symbol.csv`: 17 rows, first event
**2005-03-28**, last **2017-01-22**.

*(Residual, not this finding: five events at 97–103°E are Indonesian, on the Indian-Ocean side of
Sumatra, under a "western Pacific" label. The audit flagged that as uncertain and it is unchanged.)*

### F5 — the dot-density alt · **CLOSED**

The delivered `<desc>` now separates the two quantities: the five named countries "carry the five
biggest **clouds of dots** … 1,646 of the 2,996 dots", and then, explicitly, *"a tighter fill means
more people per square kilometre rather than a bigger population — **the tightest fills on this map
are over Malta, Netherlands and Belgium, none of them among the five**."* The adjective that was
wrong is now a derived, separately-stated ranking.

### F6 — both locator maps still call their farthest marker "nearby" · **OPEN**, and sharper

Both artifacts are unchanged on the audited string. `map-geneva-locator/render/static.svg`'s `<desc>`:
*"5 other intergovernmental bodies in orange **nearby**"*. `mapgen-locator-web/locator.html`'s
`<desc>`: *"other intergovernmental bodies in orange **nearby**"*, still singling out the WEF as the
eastern one and never mentioning the southern outlier.

Recomputed from `geneva-orgs.csv` (11 markers, haversine):

| marker | tier | km from UN-system centroid | km to its own nearest neighbour |
|---|---|---|---|
| World Economic Forum | green | 4.255 | 3.252 |
| **International Civil Defence Organisation** | **orange** | **4.119** | **3.317** |
| Inter-Parliamentary Union | orange | 1.175 | 0.962 |
| *(the other eight)* | | ≤ 1.079 | ≤ 0.525 |

By nearest-neighbour distance the ICDO is **the most isolated marker on the map** — more isolated
than the WEF. It is orange, and the alt calls the orange tier "nearby".

**One half closed and one half got worse.** The labelling complaint is closed: both the WEF and the
ICDO are now labelled on the render, so a sighted reader can find them. But the static beat's caveat
now adds an exclusivity claim it did not carry before: *"The World Economic Forum's sits 4.3 km east
of the other 10, **the one marker outside the cluster**, and is labelled on the map."* The 4.3 km is
right (I measure 4.288 to the centroid of the other ten). "The one marker outside the cluster" is
false — there are two, and the picture directly beside the sentence shows the second one alone in the
southern third of the frame.

### F7 — the histogram's open bin · **CLOSED**

Delivered `<desc>`: *"topped by Qatar alone **above 36 tonnes, at 40.1 tonnes**"*. Recomputed: Qatar
= **40.127865**, the only value ≥ 36; 127 countries in [0,4); median **3.139173** → the printed
"Median: 3.1 t"; 213 rows → "213 countries" and "Six in ten" (127/213 = 59.6%).

### F8 — the slope chart's alt · **CLOSED**

The "mid-60s" clause is gone. Delivered `<desc>`: *"The others: **Sweden 63% to 69%, Switzerland 62%
to 67%**, Poland 14% to 31%, France 16% to 27%."* I recomputed all twelve values from `data.csv`
(renewables ÷ total generation) — 63.27→69.36, 62.24→67.45, 29.44→58.64, 97.95→98.61, 13.81→31.15,
16.00→27.18 — and every one matches its printed end label to the displayed digit.

### F9 — life expectancy · **OPEN** (one of two halves)

**Half one, closed.** From the mp4's own final frame (frame 239 of 240, extracted with ffmpeg): the
title reads *"Covid cost Switzerland **8.6 months** of life expectancy — and it took three years to
win it back."* Recomputed: 83.7804 − 83.0626 = 0.7178 yr = **8.6136 months**, and the beat's props
carry it as `fallMonths`, derived rather than typed.

**Half two, open.** The bottom y tick still prints "80" for a gridline at 79.5. I recomputed the
scale with the same library the component uses: `scaleLinear().domain([79.834, 83.9536]).nice()`
returns **`[79.5, 84]`**, and `LifeExpectancyVideo.tsx:274` still formats the first tick as
`en(v, 0)` — 79.5 renders as **"80"**. In the extracted frame the 2000 reading (**79.834**) sits
visibly *above* the gridline labelled 80. On a chart whose whole subject is a 0.72-year move, the
axis still misstates itself by half a year.

### F10 — the storyboard's own fact-check · **OPEN**, unchanged

`co2-suisse/STORYBOARD.md:30-31` still reads: *"**Vérifié dans les données gelées :** 1973 = 46,20 Mt ;
**2005 = 45,83 Mt**. 1973 est bien le maximum, **de 0,37 Mt**."*

Recomputed from `co2-suisse/data.csv` (167 rows, 1858–2024):

| stated | true |
|---|---|
| 2005 = 45,83 Mt | **45,776** Mt |
| 1973's margin = 0,37 Mt | **0,4288** Mt over 2005 |
| (implied) 2005 is the runner-up | **1991 = 46,131 Mt** is; 1973's true margin is **0,0742 Mt** |

All three of the audit's figures reproduce. The line is still labelled as the *verified* one, and it
is still the only line in the document that was not computed. The rendered `co2-suisse-still.png`
remains sound.

### F11 — "2,567 km from the Black Forest to the Black Sea" · **OPEN**, unchanged

From the mp4's own final frame, the on-screen conclusion still reads *"**2,567 km from the Black
Forest to the Black Sea** — 9 of the 10 countries crossed, in order."* Haversine over the 911 frozen
points in `danube-route.csv` = **2567.31 km** — the arithmetic is right. The route's last point is
(45.2307, 28.747): **71.2 km** from Sulina, **76.9 km** from Chilia, **77.3 km** from Sfântu Gheorghe.
The map now labels that endpoint "Danube Delta" and the alt text says "delta near the Ukrainian
border"; only the headline number still claims the sea.

### F12 — the small-multiples tap · **CLOSED** at the named artifact

Driven for real at 390×844 with touch emulation, `touchStart` → 150ms → `touchEnd` → 500ms:

```
pointerdown<rect.hit-area> tipHidden=true | touchstart tipHidden=false | pointerup tipHidden=false
| pointerleave<rect.hit-area> tipHidden=false | pointerleave<svg.panel-chart> tipHidden=false | …
DURING touch: {hidden:false, display:"block", text:"Germany, 1987: 13.2 t CO2/capita"}
AFTER  touch: {hidden:false, display:"block", text:"Germany, 1987: 13.2 t CO2/capita"}
```

The trailing `pointerleave` cascade no longer clears the tooltip. The alt's "hover, tap or keyboard
focus" is now true of this beat. **The class is live in two other beats — see §4.**

### F13 — the credit that drops Maddison · **OPEN**, unchanged

`web-income-life-expectancy/income-life-expectancy.html` still prints
*"Source: UN World Population Prospects (2024) & **World Bank**, via Our World in Data · 2022 data"*.
`grep -c Maddison` on the delivered file: **0**. The frozen `data.csv` carries Taiwan
(GDP per capita **53142.984**) and Cuba (**7648.704**), and the delivered `<desc>` names Cuba as one
of the three highlighted points the headline rests on: *"Cuba (about $7,600, 77.6 years) is also
highlighted, nearly matching the United States' life expectancy at roughly an eighth of its income."*
The beat's own `BRIEF.md:13` still says "World Bank / **Maddison Project Database**". The rendered
credit still does not.

### F14 — the stated map extent · **OPEN**, unchanged

`mapgen-hexgrid-web/hex-grid.html` still prints *"The map holds **60°S–78°N**"*. The beat's own
frozen `plate/geometry.json` records `frameCorners: south **−64.478**, north **79.847**`. And
14,175 CSV rows against 14,057 points in the geometry = **118 events silently dropped** under a
source line that says "worldwide" — the audit's figure exactly.

Worth naming: the sibling beat `map-quake-density`, which shares the mechanism, now prints a
**derived** "61°S–78°N" off its own `frameCorners`. The fix exists one beat over and did not travel.

### F15–F17 — the doc-borne claims · **OPEN** (majority still wrong)

**`COMPARISON.md` — all five sub-items still present.**

- *"the frame is full: **−45 to 84** rendered edge to edge"* (`:333`) — still there, and the
  surrounding retraction covers only the data's provenance, not this reading. I opened the named
  image, `3-MIGRATION--main-datawrapper.png`: axis ticks 0 / 20 / 40 / 60 / 80, bold zero rule, series
  spanning roughly −4 to +85. Decoded to pixels, the scale is 4.0875 px/unit and **−45 would fall at
  y ≈ 683 in a 676px-tall image — it is not on the canvas.** −45 is the *twin's* floor, which the
  same document states three paragraphs later.
- *"every pixel claim, every axis range … was verified directly"* (`:543`) — present and unqualified.
  The three carve-outs above it do not cover the item above, which falsifies it.
- *"**dropping** the non-subject labels"* (`:181`) — still says *dropping*. `ranking-twin.png` prints
  all 16 country names **and** all 16 values; the non-subject rows are grey and non-bold, i.e.
  **demoted**. `COMPARISON.md:123` says "all sixteen rows" in the same document.
- *"`1-CO2--main-chartnative.png` **labels its final year, 2024**"* (`:365`) — present. Neither
  image prints a year: the end labels read "Émissions territoriales / 32,1" and "Life expectancy /
  84.2". Years appear only on the x-axis ticks, and the CO₂ render has no 2024 tick.
- *"European average, **6,55 t**"* (`:35`, `:216`) — present, and the document still does not say
  which average. Recomputed from the frozen 41-country file: **unweighted mean 5.3848**, median
  5.0768; population-weighted over the frozen population file, 5.2385. 6,55 is reachable only by
  adding Russia and weighting by population — and Russia is in neither frozen file. Still flagged
  uncertain rather than asserted wrong, but now with the reconstruction named.

**`vidy-waterfall/BRIEF.md:3-7` — still wrong.** *"coal and nuclear together lost 271.45 TWh, **more
than twice as much as renewables gained**"*. Recomputed from the beat's `data.csv`: coal −138.11 +
nuclear −133.34 = **−271.45** ✓, wind+solar+bioenergy = **+171.24**, all renewables = **+171.69**.
Ratio **1.585×** on either denominator. And `BRIEF.md:4` still attaches **171.69** to "wind, solar
and bioenergy", which sum to 171.24.

**`vidx-*/BRIEF.md` row counts — 4 of 5 still one too low.** I re-measured every CSV myself
(bytes → lines, dropping the empty tail, minus the header), independently of the sub-agent:

| beat | BRIEF states | measured |
|---|---|---|
| grouped-bar | 1007 rows, 1750–2023 | **1008 rows, 1750–2024** |
| line | 355 rows (356 with header), 1751–2023, "France's begins in 1751" | **356 rows, 1816–2023, France begins 1816** |
| scatter | 165 rows, 2022, 165 countries | **165 / 2022 / 165** ✓ |
| slope | 542 rows (543 with header), 1751–2023 | **543 rows, 1876–2024** |
| stacked-bar | 25 rows (26 with header), 2000–2025 | **26 rows**, 2000–2025 ✓ |

All five CSVs end without a trailing newline, which is the cause. The "(N with header)" phrasing
added since does not fix it — it is off by one in the same direction.

**`vidy-histogram/BRIEF.md` — still wrong.** States 259 entity rows and 22 aggregates; measured
**261** and **24**. The subtraction works only because both are short by the same 2; the drawn 237
and every bin count are correct.

**`proof/migration/` — half corrected.** `MigrationVideo.tsx` is clean: all four cited sites now
carry 1991 / 1996 / 1997 / −5.8 / −6.8 / +139.1. `timing-contract.ts` is **not**: `:2` still says
*"Twice since **1990**"*, `:5-6` *"the subject (**1997, 1998**) … those two years sit at **−1.9 and
−3.4**"*, `:7` *"against swings up to **+84.1**"* — with no marker of any kind saying these are
superseded. And `migration/BRIEF.md:66` now says the residue is in `MigrationVideo.tsx`'s header,
which was fixed; it never names `timing-contract.ts`, which was not.

**`map-quake-density/BRIEF.md` — corrected on 5 of 6.** The beat was re-baked, so the audit's ground
truth is superseded; against the *current* delivered SVG the BRIEF now reproduces exactly on
hexagon count (150), class counts (76/37/23/10/4), legend breaks (1–13, 14–51, 52–284, 285–663,
664+), densest cell (1,724) and ranked counts. One value remains wrong: it states a median non-empty
cell of **12** while the render computes **13** (and prints a 133× ratio only 13 produces); the true
statistical median of 150 cells is 12.5. The BRIEF contradicts its own ratio.

### D1 — histogram x-ticks at bin centres · **CLOSED**, both copies

Static: I read the tick `x` positions straight out of the delivered SVG — **127.58, 200.02, 272.46,
344.91, 417.35, 489.79, 562.23, 634.67, 707.12, 779.56, 852**. Those are the scale's own positions
(the audit measured `0 → 127.6`, `4 → 200.0`); the half-bin offset of +36.2px is gone. Confirmed on
the PNG: the "0" tick sits at the left edge of the first bar, "4" at the boundary between bars, and
the dashed median at 3.1 falls inside the first bar just left of "4".

Web: `webx-carbon-footprint` was rebuilt onto the fluid frame and its ticks are now HTML positioned
at `left: 0% / 10% / 20% … 100%` — eleven ticks for ten bins, i.e. bin edges by construction.

### D2 — the boxplot's denominator switch · **OPEN**, unchanged

From the mp4's own final frame (frame 259 of 260): title *"…the US and Canada each emit **over 4×
the region's median**"*; conclusion labels *"Canada 13.9 · **3.8× overall median**"* and
*"United States 14.3 · **3.9× overall median**"*; the Americas box labelled **3.0**. A reader sees a
headline claiming over 4× sitting above two labels saying 3.8 and 3.9 and a box saying 3.0. Both
statements remain true against their own denominators — the audit's own correction of its
sub-auditor stands — and the drift from `timing-contract.ts`'s intended wording is unchanged.

The audit's second point also holds: I read every `throw` in `render.mjs`. It asserts the continent
count (4), the continent order, the presence of the subject continent, and
`americas.outliers.length !== 2`. **Nothing guards the 4× claim.**

Cosmetic half also unchanged: Canada (13.9, the lower dot) still prints **above** United States
(14.3, the higher one).

### D3 — the pyramid's zero spine · **OPEN**, unchanged

Extracted the final frame of `pyramid.mp4` and magnified the centre gutter 4×. The dashed spine runs
through every age-band label: **"85-89" renders as "85+89"**, "95-99" and "90-94" as `95⌐99` /
`90⌐94`, "100+" with the rule through the zero, "0-4" as `0⌐4`. All 21 bands. The numbers remain
correct.

### D4 — the waterfall's conclusion label inside a bar · **OPEN**, unchanged

Pixel-measured on the mp4's own final frame (frame 313 of 314, 1080×1080). The Coal bar's vermillion
rect spans **x 794–843, y 406–513**. Dark glyph pixels inside that rect: **286**, in a bbox of
x 795–843, y 490–503. The conclusion label `506.72 TWh · net −117.49 TWh` still sits in the bar's own
fill, and `BRIEF.md:112` still states *"Value labels never sit inside a bar's own fill — the type
doctrine names this exact trap."*

### D5 — the scroll vehicle's hidden badges · **CLOSED**

Driven at 1600×900 at five scroll offsets, resolving each badge's centre through
`document.elementFromPoint` and testing whether the hit lands inside a `.step-panel`:

| Scroll | Active step's badges | Badges under a prose panel | Panels intersecting viewport | Panels clipped by the frame |
|---|---|---|---|---|
| 0% | 1,2,3 | **0** | 1 | 0 |
| 25% | 1–6 | **0** | 2 | 0 |
| 50% | 1–8 | **0** | 2 | 0 |
| 75% | 1–9 | **0** | 2 | 0 |
| 100% | 1–9 | **0** | 1 | 0 |

Was: a badge hidden at **every** offset, and panels clipped at −20 / 940 / −19. Both are gone. Two
panels are still simultaneously on screen at 3 of 5 offsets (was 4 of 5) — the transition overlap
the audit called polish. I screenshotted all five and looked: at 50% the panel sits low-centre with
every badge legible.

### D6 — text drawn over the thing it describes · **OPEN**, 2 of 6

| Instance | Verdict | What I measured |
|---|---|---|
| `map-quake-symbol` legend caption | **OPEN** | Measured the delivered SVG in Chrome: the caption's bbox is **x 32, width 367.98 → right edge 399.98**, and the plate `<image>` begins at **x 372**. A **27.98px overrun** onto the map — the audit's 27. On the PNG the closing ")" of "released)" sits on the ocean. |
| `static-wind-vs-solar` leader | **OPEN** | Opened the PNG: the dashed leader still runs vertically through the callout's second line, cutting "gr\|oup" in *"reversal in this group"*. |
| `co2-suisse` @375 | **CLOSED** | Cropped at 3× DPR: "Niveau de 1967" now sits *above* the dashed rule with clear space; the teal curve passes to its right. |
| `weby-small-multiples` end-label | **CLOSED** | The "7.1" label now sits beside the line with an end dot; no halo, no severed line. |
| `webx-life-expectancy` | **CLOSED** | At 375 and 900, "first year past 80" sits above the rising line with clearance. |
| `webx-world-population` @375 | **CLOSED** | "passed 1 billion in 1805" now sits above the area edge with short dash leaders either side; the line does not cross it. |

The four closures share a cause: those beats were rebuilt onto the fluid frame, where text is HTML
in normal flow and cannot be positioned into a collision. The two that stayed open are the two that
were not rebuilt.

### D7 — clipped and colliding at 375px · **OPEN**, 3 of 6

1. **`mapgen-hexgrid-web` legend caption — OPEN, and worse than audited.** The caption grew to
   *"Earthquakes per cell (count, not energy or magnitude) — aggregate mode: count"*. I measured it
   myself in Chrome at 375: the visible caption's right edge is at **414.64 CSS px** against an SVG
   right edge of **359** — a **55.6px overrun** into `overflow: hidden`, so `mode: count` is
   entirely invisible, and `document.scrollWidth` is 375 so there is no scroll to recover it.
   (Audit: right edge 398.6 in a 360 viewBox.)
2. **`more-heatmap` UK row label — OPEN.** Left edge **1.95px** where every other frame element sits
   at the 14px pad; `Co2HeatmapWeb.tsx:78` still holds the literal `rowLabelGutter: 62` against a
   widest label of 64.05px.
3. **`more-heatmap` @481–830px — OPEN.** At 481px the desktop SVG scales by 0.5344: title **12.83px**,
   source line **6.95px**, legend labels **6.41px** — the audit's numbers to the digit.
4. **`weby-population-pyramid` annotation overlap — CHANGED.** Rebuilt fluid; the overlapping
   annotation no longer exists as a rendered element. Full pairwise sweep of all 31 text boxes: **0
   overlaps at 375 and at 900**.
5. **`webx-carbon-footprint` tick/title overlaps — CLOSED.** 8 → **0**; ticks end at y 439.56, axis
   title starts at 445.56, a 6.00px gap.
6. **`web-co2-decline-slope` document height — CLOSED.** `scrollHeight` at 375×800 is **800** (last
   painted pixel at 798), with no scrollbar. Was 1120px with a ~200px dead band.

### D8 — colour discipline · **OPEN**, 3 of 4

- **Danube colour collapse — OPEN.** ΔE76 measured with an independent sRGB→Lab conversion on the
  current PNG: Austria (200,229,243) vs Adriatic (170,201,224) = **11.06**; Romania vs Ukraine =
  **15.60**; Croatia vs Serbia = **9.72**. The audit's 11.1 / 15.6 / 9.7. Austria's fill is
  byte-identical to the audited one, and Austria still sits directly above the Adriatic. One worse
  pair the audit missed: **Bulgaria vs Ukraine = 8.98**.
- **Inland lakes painted as land — OPEN.** All six named lakes inside study countries sample the land
  colour (240,240,240): Vänern, Vättern, Balaton, Saimaa, IJsselmeer, Lough Neagh. Ladoga, outside
  the study set, still samples water (170,201,224) — the control the audit named holds exactly. Dots
  still land on Balaton (12 of 121 sampled px) and the IJsselmeer (19 of 121).
- **Study vs no-data countries — OPEN.** `#F0F0F0` vs `#F7F7F7`, **ΔE76 2.436**, luminance contrast
  1.064:1. A reader still cannot see that Russia and Turkey are excluded.
- **`webx-carbon-footprint` median label contrast — CLOSED.** The label is now an HTML span on an
  opaque white chip: measured **21.00:1** at both 375 and 900 (was 3.39:1), with 2.93px clearance
  from the first bar at 375. Residual: at 900 the white chip occludes an 8×13px corner of the
  tallest bar.

### D9 — the tooltip that cannot be scrolled · **OPEN**, unchanged

Driven for real in Chrome at 1440×900, hovering the 0–4 t bin:

```
tooltip: pointerEvents="none"  overflowY="auto"  clientHeight=218  scrollHeight=502  scrollTop=0
elementFromPoint at the tooltip's own centre → rect.bin-hit bin-active   (the bin underneath it)
after page.mouse.wheel({deltaY:200})        → scrollTop=0
```

**56.6%** of the 502px of content is unreachable by pointer, and `BRIEF.md:33` still promises the
tooltip *"scrolls internally … rather than truncating the list — the one deliberate departure from
the skill's default"*.

The sub-parts of D9 re-measured on all delivered HTML: hover works everywhere I drove it, and
keyboard Tab reaches a mark on every file. **One sub-claim is now out of date rather than wrong:**
the audit wrote *"Owner's item 5 (unstyled radios) does not arise — no `:checked`/`:has()` filters
exist yet"*, which was true at `6044a492` (I checked: `mapgen-symbol-web` did not exist there).
It exists now and ships **5 real radios with 5 labels** in its live DOM. See §5.

### D10 — smaller, real · **OPEN**, 8 of 14

| # | Item | Verdict | Measured |
|---|---|---|---|
| 1 | stacked-bar `78.4 TWh` on the 80-TWh gridline | **OPEN** | Glyph pixels y 322–336; gridline occupies y 335–336 — the label's bottom two rows land on the grid. |
| 2 | flowmap destination dot clips badge 9 | **OPEN** | Badge centre (946, 525.5) r≈9.5; dot centre (948.5, 538.5) r≈7; centre distance **13.2** vs radii sum 16.5 → fills overlap ~3.3px, and the dot's halo cuts the "9"'s bottom stroke. |
| 3 | `web-co2-ranking` French comma in an English chart | **CHANGED** | Comma gone (`grep '[0-9],[0-9]* t'` → 0). Tooltips still print 4 decimals (`Poland · 7.0801 t`) against labels printing 1. |
| 4 | `weby-lollipop` raw-float tooltips | **OPEN** | Live hover: `Belgium · 7.2798314 t`, `Italy · 5.087886 t` — 6–7 varying decimals against a chart printing 7.3 / 5.1. |
| 5 | `weby-dumbbell` gains that don't reconcile | **OPEN** | Still 2 of 10, now inside one string: `Switzerland: +4.1 years (79.8 → 84.0)` (4.2) and `Netherlands: +4.0 years (78.1 → 82.2)` (4.1). |
| 6 | pyramid `(669,962)` on the wrong side, stub leader | **CLOSED** | The number is gone from the visible render (visually-hidden alt only); the leader is now 227.77px at 900 and 155.10px at 375, terminating inside the 55-59 row band. |
| 7 | `vidy-lollipop` undisclosed Netherlands exclusion | **CHANGED** | Final frame draws 14 rows and the BRIEF now says fourteen — internally consistent. But `data.csv` still contains `Netherlands,NLD,2025,51.20035`, the BRIEF's own fetch URL still requests 15, and no reason for the drop is stated anywhere. |
| 8 | quake legend cannot function as a ruler | **OPEN** | Legend circle radii **28.128 / 28.994 / 29.835** (6.07% spread) labelled M8.0 / M8.5 / M9.0, against a largest data mark of r=30 at **M9.1**. Byte-identical to the audit. |
| 9 | shapefile names leak into furniture | **OPEN** | Headline "The Faroe Islands"; callout, tooltip, `aria-label`, SVG `<title>` and table row all "**Faeroe Is.**". Likewise "Bosnia and Herz.". |
| 10 | "Western European" over a non-Western set | **OPEN** | Title and `<desc>` say Western European; the ten drawn are Germany, UK, Sweden, Switzerland, France, **Poland**, **Italy**, Austria, **Norway**, **Spain**. |
| 11 | `496` with no decimal | **CHANGED** | Web copy CLOSED — prints `496.0`. Static copy still prints bare `496`, and its `<desc>` degrades further to whole numbers throughout (639 / 103 / 92 / 154 / 496). |
| 12 | boxplot ticks `0.0, 5, 10, 15, 20` | **OPEN** | Read off the final frame at 3×: unchanged. |
| 13 | bare `<desc>`, no `role="img"` | **OPEN** | Across the delivered HTML: **0** root `<svg>` with `role="img"`, **0** with a direct-child `<title>`, **0** with `aria-label`; 17 carry a bare `<desc>`. Two beats moved to a better mechanism (`<p class="visually-hidden">`); `mapmore-scrolly-danube` opts out entirely (`aria-hidden="true"` on all four step frames). *(The static SVGs, which are not in this count, do carry `role="img"`.)* |
| 14 | frame 0 of every mp4 blank white | **CLOSED**, and **DISPUTED** as written | See below. |

**DISPUTE on D10's final bullet.** It asserts: *"Frame 0 of every mp4 is blank white (measured: 0
non-white pixels)."* I extracted frame 0 from all **24** mp4s in the tree and measured non-ground
pixels against each frame's own modal colour: every one now carries **1.72%–4.57%** — title and
source are painted. So the finding is closed. But it was also **wrong when written**: I checked out
`mapgen-choropleth-video/render/choropleth.mp4` at the audit's own snapshot `6044a492` and its frame
0 already carried **1.721%** non-ground pixels. "Every" was false at the moment of writing, for at
least one of the nineteen mp4s the audit inventoried. The tree's own handover reached the same
conclusion independently — "'every' was one beat too broad" — so this corroborates a correction
already made rather than raising a new one.

---

## 3. OPEN findings, ranked by how badly they mislead a reader

1. **F6 — the locator maps.** A screen-reader user is told the orange tier is "nearby" when its most
   isolated member is 4.12 km out and is, by nearest-neighbour distance, the most separated marker on
   the map. Worse, the static beat's caveat now asserts the WEF is *"the one marker outside the
   cluster"* — a claim the picture directly beside it refutes. This is the only finding that got
   **more** wrong since the audit.
2. **F13 — the credit that drops Maddison.** Cuba is one of three points the headline rests on, and
   the credit names an institution that does not publish its GDP figure. Misattribution to a real
   institution is this project's own named worst class, and the beat's own BRIEF holds the right
   answer.
3. **F14 — the stated map extent.** A caveat that names an extent 4.5° short at the south and 1.8°
   short at the north, over a source line reading "worldwide", while 118 events are silently
   dropped. The corrected mechanism already exists one beat over.
4. **F11 — 2,567 km "to the Black Sea".** The number is exact and the endpoint is 71 km short of any
   mouth. A reader takes away a river length that is neither the route's nor the Danube's.
5. **D2 — the boxplot's denominators.** The headline says over 4×; the two labels beside it say 3.8×
   and 3.9× and the box says 3.0. The reader sees the claim refuted by its own graphic, and no
   tripwire guards the claim at all.
6. **F9's axis half.** A gridline labelled 80 drawn at 79.5, on a chart whose entire subject is a
   0.72-year move. Every value a reader estimates off that axis is half a year out.
7. **D8 — the two maps' colour.** Austria reads as sea (ΔE 11.1, directly above the Adriatic); six
   inland lakes are painted as land while the one lake outside the study set stays blue; excluded
   countries are 2.4 ΔE from included ones, about one JND. Three separate ways to read the map wrong.
8. **D9 — the tooltip that cannot scroll.** A documented capability that does not work, hiding 57%
   of the largest bin's country list from any pointer user.
9. **F15–F17 — the doc-borne set.** No reader sees these, but a maintainer follows the sentences
   first, and `COMPARISON.md` is the document that decides whether the twin wins. Its blanket
   "everything else was verified directly" is falsified by four items in its own text.
10. **D3 — "85-89" reads as "85+89"** on all 21 bands: a wrong label, not a smudge.
11. **D7's hexgrid clip.** "mode: count" is entirely invisible at 375px — and the string grew since
    the audit, so the clip is worse.
12. **D4 — the waterfall's label inside its own bar**, against the rule the beat's own BRIEF states.
13. **F10 — the storyboard's fact-check**, all three numbers wrong, in the one line labelled verified.
14. **D6 — the quake legend caption 28px onto the plate**, and the wind-vs-solar leader through
    "gr|oup".
15. **D10's residue** — shapefile names in reader-facing furniture, "Western European" over Poland
    and Spain, an undisclosed dropped country, a legend that cannot serve as a ruler, and 4-to-7
    decimal floats in tooltips.

---

## 4. One live instance of a finding the audit closed elsewhere

F12 is closed at the beat where it was found. **The same defect is live in two beats the audit scored
sound, and both state the false capability in their screen-reader alt text.**

Driving all delivered HTML at 390×844 with touch emulation and a real `touchStart`/`touchEnd`:

| Beat | Alt text says | During touch | After finger lifts |
|---|---|---|---|
| `weby-small-multiples` | "hover, tap or keyboard focus" | tooltip shown | **shown** ✓ |
| **`webx-life-expectancy`** | **"hover, tap or keyboard focus"** | tooltip shown | **`hidden=true, display:none`** ✗ |
| **`webx-world-population`** | **"hover, tap or keyboard focus"** | tooltip shown | **`hidden=true, display:none`** ✗ |
| `co2-suisse` | *(does not claim tap)* | shown | cleared ✗ |
| `web-income-life-expectancy` | *(does not claim tap)* | shown | cleared ✗ |

The event trace is the audit's own diagnosis, verbatim:

```
pointerdown<rect.hit-area> tipHidden=true | touchstart tipHidden=false | pointerup tipHidden=false
| pointerleave<rect.hit-area> tipHidden=false | pointerleave<svg.chart> tipHidden=TRUE  ← cleared
| pointerleave<DIV.chart-plot> … | touchend | click
```

Two of the nine delivered artifacts that promise "hover, tap or keyboard focus" do not deliver tap.
On any touch device those two beats have no tooltip at all — which is exactly what F12 described,
one genre over.

Why it survived the audit: D9 records that hover was driven with real pointer events on all 14
interactive files. It does not record that **tap** was driven on any of them except the one beat
where the defect was already suspected. The method was right and the sweep was narrower than the
claim it cleared.

---

## 5. Things that changed underneath the audit

Recorded so the next reader does not mistake them for findings.

- **The tree grew during both passes.** 70/20/19 PNG/HTML/mp4 at the audit; **113/23/24** now.
  Nine beat folders are present but **untracked** at the time of writing — `mapgen-dot-web`,
  `mapgen-symbol-web`, `mapvid-dot-population`, `mapvid-hexgrid-quakes`, `mapvid-locator-geneva`,
  `static-bump-emitter-rank`, `static-diverging-bar-eu-per-capita`, `webz-bump-emitter-rank`,
  `webz-diverging-bar-eu-per-capita` — i.e. another agent's work in flight. Measurements below that
  touch them are true of the working tree, not of any commit.
- **The first real filter controls shipped** — in an untracked beat. `mapgen-symbol-web` carries
  **5 radios and 5 labels** in its live DOM. Every other delivered HTML carries **0 controls** — and
  18 of them ship the *stylesheet* for a segmented control inside a CSS comment block, with no
  control in the document to style. The web genres' filter capability, described in `HANDOVER.md` as
  shipped in both, is demonstrated in **1 of 23** delivered artifacts, and that one is not committed.
- **Six beats now have no `BRIEF.md`.** The handover named thirteen and they were largely written;
  the new arrivals (`mapgen-dot-web`, `mapgen-symbol-web`, `mapvid-dot-population`,
  `mapvid-locator-geneva`, `static-bump-emitter-rank`, `webz-bump-emitter-rank`) restored the gap at
  a smaller size.
- **`claims-grounded-in-data.test.ts` now exists** — the guard the audit's §7 called "diagnosed but
  never mechanized". It implements both halves (grounding and provenance) and its header declares
  its own blind spots at length, including that it cannot see "mid-60s" or any non-numeric claim.

---

## 6. The owner's question: what would still have to happen before this could be called validated

Two blockers are already known and are not re-derived here: **no real journalist has ever used it**
(`twin/JOURNALIST-TEST.md` is an unplayed protocol), and **the guards each declare their own blind
spots** — `claims-grounded-in-data.test.ts` spends sixty lines saying what it cannot see, which is
the right behaviour and means those gaps are on the record.

The third is the one nobody declared, and it is measurable:

> **Nothing in this repository ever touches a delivered artifact with a pointer. The entire
> interaction layer is self-attested.**

The measurements:

- **80 test files.** Files that dispatch a pointer, touch or mouse event: **0**. Files that launch a
  browser at all: **1** (`twin-map-web/test/standalone.test.ts`, and it checks self-containment, not
  behaviour).
- **9 delivered artifacts state, in the text a screen reader reads aloud, that every reading is
  "available on hover, tap or keyboard focus."** No guard can go red if that stops being true.
- **2 of those 9 are false right now**, and I found them by driving a browser for twenty minutes
  (§4). A third artifact promises in its BRIEF that its tooltip "scrolls internally rather than
  truncating the list"; it cannot scroll, and 57% of the list is unreachable (D9).

This is not the same gap as the two known ones, and it is not covered by them. The grounding guard's
declared blind spot is *non-numeric claims about data*. An interaction claim is a different kind of
sentence: a functional assertion about how the artifact behaves under a finger. No guard in the tree
is even in that business, so no guard declares itself blind to it — which is why it reads as covered.

It also has the shape this project keeps rediscovering. `HANDOVER.md` already records the lesson in
its sharpest form — an overlay without `pointer-events: none` swallowed every hover while keyboard
focus still worked, *"because `.focus()` bypasses hit testing, which is exactly why no test reached
it."* That was written as a story about one bug. It is a statement about the whole layer: the only
thing that has ever verified an interaction claim in this repository is a person deciding to look,
and the corpus now contains two demonstrations that a person looking is not enough — the audit drove
hover on all fourteen files and cleared beats whose tap was broken.

So the third thing that would have to happen: **an executable guard that opens each delivered
interactive artifact, dispatches a real pointer event and a real touch sequence at a real mark, and
asserts that what the alt text promises actually happens** — and, until that exists, no claim of the
form "hover, tap or keyboard focus" should be written into an artifact at all, because the tree has
no way to keep it true.

Two smaller things belong beside it, both measured above and neither yet on any list:

- **A capability is documented as shipped in both web genres and appears in 1 of 23 artifacts** (§5).
  Eighteen files carry the CSS for a control they do not contain. Nothing distinguishes "built" from
  "demonstrated" anywhere in the tree.
- **Retraction has no guard.** `SUPERSEDED.md` and the PNG `tEXt` stamps are a good mechanism and I
  verified they landed on exactly the right ten files — by hand. Nothing re-checks that the stamped
  set still matches the superseded set, and the tree already contains one instance of a retraction
  drifting: `migration/BRIEF.md:66` names the file that *was* fixed and never names
  `timing-contract.ts`, which still carries the false numbers verbatim.

---

## 7. Where this verification is uncertain

- **F15–F17's "6,55 t"** is still flagged uncertain rather than wrong. It is not reachable from any
  frozen file in this tree; it becomes reachable only by adding Russia and weighting by population,
  and Russia is in neither the 41-country file nor the population file. The document should say
  which average it means, whatever the answer.
- **F13** rests on an external fact — that the World Bank does not publish GDP per capita for Taiwan
  and Cuba — which I did not re-verify against the World Bank API. The *internal* inconsistency
  needs no external check: the beat's own BRIEF names Maddison and the rendered credit does not.
- **D2's ratios** were not re-derived from scratch: the continent mapping lives in `render.mjs`, not
  in the CSV. I confirmed the defect on the rendered frame (headline "over 4×" against labels 3.8×
  and 3.9× and a box labelled 3.0) and confirmed by reading every `throw` in `render.mjs` that the
  4× claim carries no tripwire.
- **`map-quake-density`'s BRIEF** was re-measured against a re-baked beat, so the audit's ground
  truth for it is superseded rather than refuted. The median is the one value still wrong.
- **Three beats appeared between the audit and this pass** and were not part of either. Another agent
  was writing in this tree throughout; artifact counts moved under both passes.

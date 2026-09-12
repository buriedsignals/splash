# Proposal — the gantt family

The **timeline of spans**: one row per entity, each drawn as a bar from its own start date to its own
end date. Tenures, sentences, outbreaks, wars, careers, legislative sessions. Harvested 2026-09-08
from zero references. **Seven references filed** under `docs/design-base/references/gantt/`; nothing
outside that directory, this file and my own pool file was touched. Nothing is filed into
`treatments/` or `directions/` — everything below is a proposal.

---

## The harvest, in numbers

| archive | drawn | harvested | survived looking | filed |
| --- | ---: | ---: | ---: | ---: |
| datavizproject | 100 | 2 | 2 | 2 |
| url-list | 13 | 13 | 5 | 5 |
| **total** | **113** | **15** | **7** | **7** |

Fifteen of fifteen came back `style ok` and fourteen of fifteen `pixel ok`. **Eight of the fifteen
had not reached a gantt**, and one route reported honestly that its page had no graphic at all.

**Five publications**, which is what the evidence floor counts: `usafacts.org`, `abc.net.au`,
`aljazeera.com`, `threestory.com` (twice) and `100.datavizproject.com` (twice).

---

## What the datavizproject draw taught, and it is a structural fact about that archive

`100.datavizproject.com` is the only archive indexed by FORM, and **it does not contain this form.
It cannot.** All 100 thumbnails were downloaded and looked at as four contact sheets. The site
encodes one dataset — World Heritage site counts for Denmark, Norway and Sweden in **2004** and in
**2022** — and that dataset carries no durations at all. Nothing in it has a start and an end in
time, so no bar anywhere in the hundred can have length = elapsed time, which is the one thing this
form exists to draw. Where a Ferdio encoding does draw a bar between two positions (#6, #15, #19,
#71), the axis underneath it is a COUNT.

This is worth writing down because it generalises: **a form-indexed archive is only as broad as the
dataset it encodes**, and a family whose defining variable that dataset lacks will draw nothing from
it however many pages remain. `100.datavizproject.com` will never yield a gantt, a survival curve or
a duration histogram, and the next wave should not spend the pages looking.

Two were harvested anyway, as **documented near-neighbours and explicitly not as the form**:

- **`100-datavizproject-com-data-type-viz15`** — vertical span arrows between two dated levels on one
  shared scale, both ends capped and labelled with their DATE while the value is left to the axis,
  plus a fourth `AVG.` column drawn in the same geometry as a reference. Ground `#FFFFFF` at
  **97.672 %**; `#EE5440` **0.095 %**, `#3274DA` **0.082 %**, Norway's navy `#283250` **0.091 %** in
  the neutral list. Two hue clusters, 7° and 216°.
- **`100-datavizproject-com-data-type-viz58`** — one bar cut by a full-plate hairline into two named
  eras, each named by a bracket ending in an **open arrowhead**: *"Up until 2004"*, *"After 2004"*.
  Ground `#FFFFFF` **93.653 %**; `#3274D8` **2.316 %**, `#EE5440` **1.554 %**, `#283250` **1.285 %**.

Both notes say, in their own `## What was not verified`, that no gantt treatment may be founded on
them. One of them nonetheless supplies half the evidence for a treatment below, because the bracket
it draws is furniture that belongs to any chart with a time axis, not to gantts specifically.

---

## What died at step 3, and what killed it

Eight of thirteen url-list candidates were deleted rather than filed. The distribution is close to
`METHOD.md`'s standing one-in-three, and two of the eight are failure modes not yet in that file.

| what was harvested | what the picture actually was |
| --- | --- |
| `cnn.com/politics/longest-government-shutdown-vis` | a full-bleed collage illustration of the Capitol dome — correction 1, unchanged |
| `npr.org/…/government-shutdown-length-history` | a blank white element; the page shot shows a **Tiny Desk giveaway modal** over the article |
| `visualcapitalist.com/charted-the-history-of-u-s-government-shutdowns` | a **Cloudflare "Vérification de sécurité"** bot check. The site is declining automated reading and was not worked around |
| `ourworldindata.org/slavery` | a real, excellent graphic — and a **stepped area chart**, not a gantt |
| `statista.com/chart/12624/duration-of-government-shutdowns` | duration bars on an **ordinal** axis of start dates. See the contrast below |
| `academy.datawrapper.de/article/292-…` | a screenshot of the **Datawrapper colour panel** — tool documentation, not a chart |
| `datawrapper.de/blog/weekly-chart-range-plot-…` | a 300 × 150 **promo thumbnail for a different blog post** |
| `abc.net.au/news/2015-09-25/the-long-road-to-become-pm/6794310` | see below — the one worth a correction |

### The correction this wave produced: a promotional card can be the article's own lead image, captioned as such, and still get harvested

ABC's *From Menzies to Malcolm: the careers of Australia's prime ministers visualised* is a genuine
gantt — vertical columns per prime minister, role spans as rounded capsules, hatched for shadow
roles, coloured by party. The harvester reached `img 806 × 453` at `documentTop 380`, both routes
`ok`, and the picture shows exactly that chart.

**It is a perspective-tilted, drop-shadowed mock-up of the interactive, and the page says so in its
own caption**: *"A screenshot of an interactive which compares the careers of Australia's prime
ministers from Menzies onward."* The chart in the picture is rotated a few degrees and cut off at
three edges. `doctrine/references/reference-set.md`'s standing rule — a lesson written from a
promotional card is not a lesson — applies precisely, and every pixel share read off it would have
been a measurement of a transform. The interactive itself is no longer on the page (`WebFetch`
confirms no separate `/interactives/` url), so the record was **deleted, not filed**.

What makes it worth a correction rather than a line in a table: **nothing in the record could have
caught it.** `documentTop 380` and `nearTheTop: true` say the graphic leads the article, which it
does. The tag is `img`, which is what a static chart is. The only tells were the tilt, which is a
design decision the harvester cannot distinguish from a chart's own styling, and the caption, which
is text beside the graphic and which step 3 exists to read. It is the strongest argument in this
wave for the runbook's insistence that step 3 is not automatable.

### And the contrast Statista supplies, which is refused as a record and kept as an observation

Statista's *The Timeline of U.S. Government Shutdowns* and AJLabs' *A history of US government
shutdowns* draw the same twenty rows from the same source (AJ credits USAFacts; Statista credits
CRS). Statista puts the start dates on an **ordinal** x-axis — `Sep '76, Sep '77, Oct '77 … Dec '18,
Oct '25` — evenly spaced. The sixteen years between the 1995 shutdown and the 2013 one occupy
exactly one tick, the same width as the eleven days between two 1977 shutdowns. AJLabs draws the
same rows in the same order and **writes the gap in**: *"The US government went 16 years without a
shutdown."*

That is the type reference's *"a genuine to-scale time scale, not an ordinal list of periods"*,
demonstrated by two desks on one dataset. Statista is not filed — it is not the form — but the
comparison is the clearest single argument in this harvest for treatment 2 below.

---

## What the five surviving publications actually draw

- **`usafacts-org-articles-the-viz-lab-supreme-court-tenure`** — a true gantt, and the most designed
  artifact in the family. One column per **seat**, time vertical, a custom Flourish template
  (`@ambert/court-tenure-chart`). Party as fill, chief justice as **hatch**, every bar in a
  `rgb(34, 34, 34)` hairline outline (121 of them), names rotated inside the spans, presidents down
  the left and years down the right, and prose annotations bracketed to stretches of the axis.
  Ground `#F7F7F3` **78.762 %**, `#EC92A1` **6.763 %**, `#89B6FF` **3.479 %**, clusters 350° and
  217°. Three type tuples inside the frame, all Aeonik.
- **`threestory-com-scotus`** — a true gantt, nine sitting justices, bars from oath date to today on
  one date axis, **every right end aligned at the present** and capped with the justice's
  photograph, name outside the bar. `#FFFFFF` **83.296 %**, `#D69E9C` **7.586 %**, `#B1C3E0`
  **2.730 %**. Three type tuples, all proxima-nova at weight 600.
- **`threestory-com-scotus-scotus-all-html`** — the same publication's other chart: 116 justices,
  ranked duration bars, `34 YRS 10 MON` printed at each bar's end, a lightness ramp putting
  chronology back after the sort destroyed it, one hue (`#799DCB` **1.180 %**) for "currently
  serving", a black stroke for chief justices. Nine grey ramp values all within 0.5 pp of each other
  by area.
- **`aljazeera-com-news-2025-10-1-…-shutdowns`** — duration bars with the span written out in every
  row label, a **president gutter in which each presidency is one merged block** spanning its rows,
  a dated dashed rule where the encoding changes with the reason written beside it, and the sixteen
  year gap named. The data bars are neutral (`#262E36` **3.593 %**, `#B9C3D3` **2.512 %**) and the
  only saturated ink is the metadata (`#B23A47` **5.417 %**, `#335A96` **3.927 %**).
- **`abc-net-au-news-2018-08-23-…-spills-chart`** — duration bars in three party blocks, row label
  `Bill Shorten | 2013 - '18`, an unbounded span written as a bare trailing dash, a `#F2F2F2` track
  behind every bar taking up **36.404 %** of the plate. Roboto, one family, two weights, and the
  only bold in the plate is the three group subheads.

---

## Treatments proposed

### 1. `span-on-a-real-date-axis` — **imported**, ready to file

- kind: imported
- name: A gantt bar is positioned in time, not grown from zero
- applies: whenever a beat's rows carry a start and an end
- evidence: `usafacts-org-articles-the-viz-lab-supreme-court-tenure`
- evidence: `threestory-com-scotus`
- publications: usafacts.org, threestory.com — **two, independent**

Both draw one row per entity, both put the bar's **left edge at the start date and its right edge at
the end date** against one shared to-scale date axis, and in both the empty space to the left and
right of a bar is a real statement about when the entity did not exist. USAFacts runs the axis
vertically and indexes it twice, by president on one side and by year on the other; Threestory runs
it horizontally and sorts strictly by start date. Neither has an axis that begins at zero, and
neither could answer its own question if it did — the whole point of the SCOTUS charts is *when*.

What separates this from an ordinary bar chart of durations is that **two bars of equal on-screen
length always represent equal elapsed time, and two bars at the same x always represent the same
year.** The Statista/AJLabs contrast above is the measured demonstration of what the second half
buys.

### 2. `the-span-is-written-in-the-row-label` — **imported**, ready to file

- kind: imported
- name: When bar length is a duration, both dates go in the row's own label
- applies: any duration bar whose axis is not itself a date scale
- evidence: `abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10`
- evidence: `aljazeera-com-news-2025-10-1-a-history-of-us-government-shutdowns-ever`
- publications: abc.net.au, aljazeera.com — **two, independent**

`Bill Shorten | 2013 - '18`. `Sep 30, 1976 – Oct 11, 1976`. Two desks, two continents, two subjects,
the same device: the row label carries the span so the bar can safely be a plain comparable length.
The type reference names the missing time-axis caption as this form's subtle, easy-to-miss failure —
a reader silently reading duration as magnitude. **This is that caption, delivered once per row
instead of once per chart, where it cannot be scrolled past.**

ABC adds a refinement worth carrying: the opening year in full, the closing year abbreviated
(`1996 - '01`). The full year anchors; the short one is the delta.

### 3. `colour-carries-the-category-never-the-duration` — **imported**, ready to file

- kind: imported
- name: Length is time; hue is a category and never a second quantity
- applies: always in this family
- evidence: `usafacts-org-articles-the-viz-lab-supreme-court-tenure`
- evidence: `aljazeera-com-news-2025-10-1-a-history-of-us-government-shutdowns-ever`
- evidence: `abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10`
- evidence: `threestory-com-scotus`
- publications: usafacts.org, aljazeera.com, abc.net.au, threestory.com — **four, independent**

All four spend their hue on a categorical attribute of the row — the nominating president's party,
the party of the leadership, the president in office — and not one uses colour to restate or modify
the length. The type reference's warning that a gantt's bar length is time and never a magnitude is
obeyed by every desk here, and the reason is legible in the measurements: each of the four palettes
resolves to **two or three hue clusters** (USAFacts 350°/217°, AJ 354°/216°, Threestory 2°/217°,
ABC 160°/216°/1°), well inside the six-hue ceiling the type reference sets.

A sub-rule with two publications of its own: **the category the scheme cannot express gets a
chromaless value, not a third hue.** USAFacts fills the pre-party justices `rgb(209, 209, 203)`;
AJLabs draws the whole data series in two neutrals and keeps colour for the gutter.

### 4. `a-second-channel-without-a-second-hue` — **imported**, ready to file, with a caveat

- kind: imported
- name: Texture or outline carries the second category, so the first keeps the colour
- applies: whenever a row has two categorical attributes that both matter
- evidence: `usafacts-org-articles-the-viz-lab-supreme-court-tenure`
- evidence: `threestory-com-scotus-scotus-all-html`
- publications: usafacts.org, threestory.com — **two, independent by host**

USAFacts hatches: `fill url("#hatchR")` × 9, `#hatchO` × 4, `#hatchD` × 4 — one hatch per fill, so a
bar says *chief justice* and *Republican-nominated* at once. Threestory outlines:
`stroke rgb(0, 0, 0)` × 17 over the lightness ramp, same second category, no hue spent.

**The caveat, stated because the floor cannot see it.** These are two publications and one SUBJECT:
both are charts of the US Supreme Court, and "chief justice" is the natural second attribute of that
dataset. Two desks reaching for texture on the same data is weaker evidence than two desks reaching
for it on different data. `METHOD.md` correction 4 draws the line at the publication because that is
where independence can be *read*; this is the case where reading it there is generous, and the next
wave should look for a third use on a subject that is not a court.

### 5. `the-unbounded-end-is-notated` — **imported**, ready to file

- kind: imported
- name: A span with no end date must say so; three desks say it three ways
- applies: any row whose end is open at publication
- evidence: `abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10`
- evidence: `threestory-com-scotus`
- evidence: `100-datavizproject-com-data-type-viz58`
- publications: abc.net.au, threestory.com, 100.datavizproject.com — **three, independent**

The three notations are genuinely different and that is the finding, not a weakness:

| desk | notation |
| --- | --- |
| ABC News | a bare trailing dash in the row label — `Malcolm Turnbull \| 2015 -` |
| Threestory | every open span's right edge **aligned at the present**, so the shared edge is the notation |
| Ferdio (#58) | the period bracket ends in an **open arrowhead** rather than a cap |

`METHOD.md`'s note against `two-points-are-not-a-line` is the reason this is framed as *notate it*
rather than as one geometry: three desks obey the requirement and draw it three ways, so a rule
naming one drawing would be refuted by the other two on the day it was filed. What all three refuse
is the alternative — silently substituting today's date and letting the bar look finished.

### 6. `name-a-stretch-of-the-axis` — **imported**, ready to file

- kind: imported
- name: A period is named by a bracket over the axis, not by a caption under the chart
- applies: whenever a stretch of the time axis has a name or an explanation
- evidence: `usafacts-org-articles-the-viz-lab-supreme-court-tenure`
- evidence: `100-datavizproject-com-data-type-viz58`
- publications: usafacts.org, 100.datavizproject.com — **two, independent**

USAFacts brackets 1946–1953 and 1881–1888 and writes a sentence against each
(*"From 1946 to 1953, all seats on the court were filled by judges nominated by Democratic
presidents"*). Ferdio brackets *"Up until 2004"* and *"After 2004"*. In both cases **the bracket's
extent says which years, and the words say why they matter** — a caption can do the second and never
the first.

Ferdio's bracket is drawn in the palest furniture value in its whole record (its neutral list runs
`#DCE3E4` **0.076 %**, `#CACDD4` **0.035 %**, `#E9ECED` **0.033 %**), which is the practical note:
this furniture sits on ground rather than on marks, so it can be very light and still work.

### 7. `annotate-the-gap` — **imported**, one publication, NOT ready

- evidence: `aljazeera-com-news-2025-10-1-a-history-of-us-government-shutdowns-ever` — only.

*"The US government went 16 years without a shutdown."* On a chart of spans the empty stretch is the
one reading with no mark of its own, and AJLabs is the only desk in this harvest that gives it ink.
It is plainly real and it rests on one publication, so it is **not filed**. What a second wave must
target: a span chart from a desk that is not Al Jazeera which draws or labels the interval between
its bars.

### 8. `the-row-is-the-thing-that-persists` — **imported**, one publication, NOT ready

- evidence: `usafacts-org-articles-the-viz-lab-supreme-court-tenure` — only.

One column per **seat**, not per justice, so a colour change inside a column is a handover and the
chart's subject — *who put them there* — is the thing the geometry shows. This is the single
strongest editorial idea in the family and it has one desk behind it. **Not filed.** Look for a
second in charts of constituencies, ministerial portfolios, hospital beds or job titles.

### 9. `draw-the-track` — **imported**, one publication, NOT ready

- evidence: `abc-net-au-news-2018-08-23-…-spills-chart` — only.

`#F2F2F2` at **36.404 %** of the plate: the pale rail behind every bar showing the full extent of the
axis. More than a third of the ink is *unspent time*, and without it Kevin Rudd's 79 days is a fleck
in white rather than a stub against a whole. One publication. **Not filed.**

### 10. `print-the-duration-in-its-own-unit` — **imported**, ready to file

- kind: imported
- name: The number on the bar is a duration and names its unit
- applies: any span or duration bar where an exact value is worth printing
- evidence: `threestory-com-scotus-scotus-all-html`
- evidence: `abc-net-au-news-2018-08-23-malcolm-turnbull-leadership-spills-chart-10`
- publications: threestory.com, abc.net.au — **two, independent**

Threestory prints `34 YRS 10 MON` at the end of every one of 116 bars, in a small-caps face at
12.3 px weight 300; ABC prints `1,775` inside each bar in white under a deck that reads *"Number of
days in power…"*. Both make the exact value readable without a scale — and neither plate carries a
numbered axis, which is the point. **Where the unit is in the number itself (Threestory) the chart
needs no caption at all; where it is in the deck (ABC) it is stated once and the numbers are bare.**

### Derived treatments proposed — each needs a `detect` and a `provenBy` render before filing

None of these can be filed here, because `METHOD.md` step 6 requires the render first and step 7
requires watching the guard go red. Each names the fact the beat's own data or geometry carries.

**D1. `end-never-before-start`** — kind: derived. The type reference calls the inverted span this
form's one catastrophic error: *"an inverted date pair shouldn't render at all rather than draw
backwards or silently clamp."*
- detect: for every row, `+end >= +start`; a row failing it throws at build rather than rendering.
- provenBy: a gantt beat render, plus a mutation that swaps one row's dates and turns the guard red.

**D2. `the-axis-says-it-is-time`** — kind: derived. The beat's own scale knows it is a date scale;
the drawing must say so where the reader is, in an axis caption naming the unit.
- detect: the rendered artifact carries an axis caption whose text names a time unit, or every row
  label carries its span (treatment 2). Neither present → fail.
- provenBy: a gantt beat render.

**D3. `rows-sorted-by-start`** — kind: derived. The type reference asks for it and both true gantts
here obey it; the beat's own data already carries the key.
- detect: the rendered row order equals the beat's rows sorted ascending by start date, except where
  the beat declares an institutional order (USAFacts' seats, Threestory's chief-justice-first).
- provenBy: a gantt beat render.

**D4. `a-null-end-is-not-today`** — kind: derived, and the data-side half of treatment 5. A
still-running row arrives as a null end; coercing it to the render date makes an ongoing span look
finished and makes it eligible for a "longest" superlative it has not earned.
- detect: rows with a null end render with the unbounded notation AND are excluded from any computed
  maximum unless the beat's copy says "so far".
- provenBy: a gantt beat render with at least one open row.

---

## Directions proposed

Three, because three coherent wholes were measured. A direction needs one reference by design.

### `bench` — from `usafacts-org-articles-the-viz-lab-supreme-court-tenure`

- ground: `#F7F7F3` (**78.762 %**, pixel route, `measuredFrom: graphic.png`)
- poles: `#EC92A1` (**6.763 %**, cluster 350°) and `#89B6FF` (**3.479 %**, cluster 217°) — tints, not
  saturated party colours, because 10 % of the plate is going to be covered in them
- out-of-scheme fill: `rgb(209, 209, 203)`
- outline: `rgb(34, 34, 34)`, on **every** mark
- ink: `#000000` **0.231 %**, `#222222` **0.123 %**
- type (`style.graphicFrame.type`, the graphic being an `iframe`): Aeonik 14 / 400 for labels,
  Aeonik 12 / 400 for the scale, Aeonik 14 / **700** for the five names the annotations pick out —
  **three tuples for a 116-row chart**
- shape: `diverging`, `ramped: 2`

The whole is a two-party chart on warm paper where the hues are deliberately weak and the black
hairline does the separating. Note this is **not** the publisher's own furniture: `style.type` on
that record is USAFacts' article stack — Aeonik at 64 / 40 / 30 / 20 / 16 / 14 plus Aeonik Mono
uppercase for the kicker — and the two must not be conflated.

### `seniority` — from `threestory-com-scotus`

- ground: `#FFFFFF` (**83.296 %**) — inside a site whose own ground is `rgb(72, 73, 75)`
- poles: `#D69E9C` (**7.586 %**) and `#B1C3E0` (**2.730 %**), read directly off the SVG as
  `fill rgb(214, 158, 156)` × 6 and `fill rgb(177, 195, 224)` × 3
- ink: `#000000` **0.365 %**; gridlines `#F5F5F5` **0.740 %**, `#EBEBEB` **0.079 %**
- type (`style.type`, the graphic being an inline `svg`): proxima-nova 14 / 600 for the nine names,
  12 / 600 for numerals, 13 / 600 for the two panel captions — **one family, one weight, three sizes**
- shape: `diverging`, `ramped: 1`

A white plate cut out of a dark site, with pale party tints chosen so that **photographs can be the
saturated thing on the page**. The eight browns in its chromatic list (`#5D2A03` **0.053 %** down to
`#3C230B` **0.024 %**) are those photographs and are not a palette.

### `ajlabs-spans` — from `aljazeera-com-news-2025-10-1-…-shutdowns`

- ground: `#FFFFFF` (**72.102 %**) — with the caveat below
- data, in neutral: `#262E36` **3.593 %** and `#B9C3D3` **2.512 %**
- metadata, in colour: `#B23A47` **5.417 %** and `#335A96` **3.927 %**; clusters 354° and 216°
- furniture: `#F4F4F4` **0.675 %**, `#EBEBEC` **0.488 %** and `#E4E4E4` **0.338 %** gridlines at 5-day intervals
- shape: `diverging`, `ramped: 2`

The inversion is the direction: **the subject is grey and the context is coloured**, which works
because the duration reading is ordinal and the party reading is categorical, so the two never
compete. Its type is **not** recorded — the graphic is a raster and `style.type` on that record is
Al Jazeera's Roboto/Georgia page furniture — so this direction supplies colour and proportion only,
and any beat drawn in it must take its registers from elsewhere.

**And this record's clip is contaminated.** Al Jazeera's masthead is painted across roughly the
first 120 px of `graphic.png`: `#FA9000` at **0.426 %** is the AJ logo and is not a chart colour,
and the white nav strip is inside the ground figure, so the true ground share is slightly lower than the
**72.102 %** recorded. `METHOD.md` correction 15 again, caught by eye, recorded rather than
averaged away.

---

## What the pool taught

**1. A form-indexed archive is bounded by its dataset, not by its page count.** Seventy
`100.datavizproject.com` pages remained and none of them could have been a gantt. Before drawing
from that archive, ask whether its one dataset carries the family's defining variable. For duration,
survival, waiting time and anything else measured in elapsed time, the answer is no.

**2. Searching for what the form SAYS works, and works badly.** Around twenty queries across
`~/.claude/scripts/search.sh` and the WebSearch tool, phrased as *"how long each president served"*,
*"how long the war lasted"*, *"every outbreak since"*, returned Wikipedia lists, Statista pages and
listicles almost exclusively. What actually found the five survivors were **subject guesses at desks
known to serve openly** — the US government shutdown (a live news event with several desks charting
the same twenty rows) and Supreme Court tenure (a dataset whose natural form is this one). The
warning in the brief is correct that the form's NAME returns project-management software; what it
under-states is that the form's SENTENCE returns encyclopaedias. **A gantt is found by picking a
subject that can only be drawn this way, and then asking which open desks covered it.**

**3. SearXNG returned zero results for every query after the first three.** Fourteen sibling agents
were harvesting simultaneously against one self-hosted instance; the engines behind it rate-limited
and the script kept answering `{"results": []}` rather than erroring. A parallel wave should not
plan on that tool. WebSearch answered throughout, and blocks `reuters.com`, `apnews.com`,
`news.sky.com` and `theguardian.com` outright — four of the most likely desks for this form.

**4. Two desks charting the same event is worth more than two desks charting anything.** The
Statista/AJLabs pair and the USAFacts/Threestory pair are the two most informative comparisons in
this wave, precisely because the data is held constant and only the design varies. When a family
needs a second publication, **find the second desk that covered the SAME story**, not another story
in the same shape.

**5. Nine of the fifteen graphics were `img` or `iframe`, and only two were inline `svg`.** In this
family the graphic is usually another document (Flourish, Datawrapper) or a raster. That means
`style.type` is the publisher's furniture more often than it is the chart's, and a note that quotes
it as the chart's typography is wrong. Every note in this family states which it is quoting.

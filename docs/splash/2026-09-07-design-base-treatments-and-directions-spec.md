# Design base: treatments and directions

**Status:** design, approved in conversation on 2026-09-07. Not yet planned or implemented.
**Owner decision recorded here:** the colour surface is opened deliberately (§9).

## 1. The problem, measured

Splash produces correct, clean, conventional graphics. Two things separate them from the work of
newsrooms that do this well, and both were measured on 2026-09-07 rather than asserted.

**Information encoding.** The Swiss CO₂ beat states its finding in the title and never draws it.
`crossingGeometry` computes the year the series crosses back under the 1967 level and nothing
renders it. When a probe drew it, the answer came back **2023, not 2024** — and 2024 (32,07 Mt) is
*higher* than 2023 (31,98 Mt). A treatment surfaced an editorial fact the chart was hiding. The
gap is not decorative.

**Style and art direction.** Across **122 components** the repository uses:

| | Splash | Pudding | ProPublica | Reuters | SCMP | ABC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| simultaneous families | **1** | 2 | 4 | 3 | 3 | 3 |
| lightest weight | **400** | 300 | 400 | **100** | 300 | 400 |
| italic runs | **0** | 0 | 11 | 0 | 3 | 11 |
| letter-spaced runs | **0** | 0 | 10 | 12 | 8 | **77** |
| case-transformed runs | **0** | 11 | 6 | 7 | 9 | **57** |

Zero italic, zero tracking, zero case variation — not once, anywhere. The reference figures are
computed styles read out of the live pages by `ad-harvest.mjs`, not impressions.

**This uniformity is not doctrine.** `doctrine/references/visual-system.md` locks colour and
ornament — flat field, one semantic accent, furniture derived from the newsroom ground — and says
nothing about type scale, weight, italic, tracking, case, frame proportion, header composition or
rhythm. Those decisions hardened by copied constants; nobody took them.

## 2. Goal and non-goals

**Goal.** A structured, measured knowledge base, extracted from real published work, that reaches
the pixel and can be proved to have reached it — raising both the information encoding and the art
direction of what Splash renders.

**Non-goals.**

- Not a style gallery. A reference that produces no applicable treatment or direction is not filed.
- Not per-story bespoke design. Everything recorded must be transferable: true of any dataset with
  the stated shape, or of any beat under the stated direction.
- Not a replacement for `reference-set.md`. That file indexes **argument structure → information
  logic** and stays exactly as it is. This base is a third axis beside it, not a rewrite of it.

## 3. The two axes and why their natures differ

A **treatment** is *conditional and plural*: it applies when the data has a shape (a reference
level exists; the subject sits among peers; the series is long and noisy), and several apply at
once. Composition is therefore a first-order problem — measured, not predicted: with five
treatments enabled, three labels stacked in the same corner because each placed *its own* correctly
and none could see the others.

A **direction** is *global and exclusive*: exactly one governs a beat, and they never compose.

## 4. The interface: registers

The two axes meet through **registers**, and only through registers.

A treatment names the register it writes into. A direction says what that register looks like.
Neither knows the other's internals.

Registers, fixed by this spec:

| register | what it is for |
| --- | --- |
| `display` | the title |
| `eyebrow` | the category or section line above the title |
| `body` | the caveat/standfirst and the source line |
| `axis` | tick labels and axis furniture |
| `annot` | annotation text — reference captions, event labels, callouts |
| `value` | a number attached to a mark (end label, value label) |

A direction supplies, per register: family, size, weight, italic, tracking, case, and the ink role
(`ink`, `muted`, `accent`). Ink stays *derived* from the ground — `deriveFurniture` already handles
a dark ground correctly and the nocturne probe confirmed it.

A direction additionally supplies: ground, accent, padding, header composition
(`stack` | `centre` | `split`), series and rule stroke weights, and whether a hairline sits under
the header block.

## 5. Data model

### 5.1 Reference record

One directory per reference under the corpus. Contains:

- `measured.json` — mechanical, written by the harvester: url, **which of the three archives it came
  from** (§6.1), title, page ground, every distinct
  `(family, size, weight, style, tracking, case)` tuple actually painted with its run count and a
  text sample, mark fills and strokes, text-column measure in characters, the largest graphic's box
  and ratio — **and, from the pixel route (§6.2), the ground, the chromatic palette with each
  colour's coverage, the neutral furniture, and the palette's shape.** Each fact carries the route
  that produced it.
- `screenshot.png` — the visual trace, at a fixed 1440×900 viewport.
- `NOTES.md` — hand-written, and the only place a judgement lives. Required sections:
  **What it is** (artifact type × export type) · **What it does with information** (any treatment
  it evidences) · **What it does with style** (any direction it evidences) · **What is transferable
  and what is this piece's own** · **What was not verified.**

A reference with no treatment and no direction in `NOTES.md` is not filed. Collecting is not the
deliverable.

### 5.2 Treatment

```
id            kebab-case, unique
name          one line
applies       a predicate on the beat's own facts, stated so a script can evaluate it
              e.g. "the beat carries a reference level AND the series crosses it"
draws         what it adds, named by register
evidence      >= 2 reference ids that use it, each with the exact place it is used
detect        how to measure, on the delivered artifact, whether it was applied
priority      integer; the arbiter's tie-breaker when two treatments want the same space
```

### 5.3 Direction

```
id            kebab-case, unique
name          one line
measuredFrom  the reference id, and the measurement that produced each value
ground        hex
accent        hex
pad           px
header        stack | centre | split
registers     one entry per register in §4
stroke        { series, rule }
headRule      boolean
```

## 6. The methodology — the part that must repeat

This section is a runbook. It is written so a second family costs harvesting and judgement, never
re-invention, and so two families can run in parallel without colliding.

**Parallel safety:** each family owns its own corpus directory and its own treatment and direction
files. Two families touch no shared file except the two indexes in §8, which are *generated*, never
hand-edited. Two agents may therefore run steps 1–6 for different families at the same time.

1. **Draw the candidate pool from all three archives.** They are different kinds of source and are
   read by different routes, but every one of them feeds every axis — see §6.1. Every family draws
   from all three; a family whose pool comes from one archive only is under-drawn and `METHOD.md`
   must say so.
2. **Harvest by BOTH routes, always.** The **style route** reads computed styles and reaches type
   everywhere and marks wherever they are SVG. The **pixel route** (§6.2) reads the colour
   signature off the rendered pixels and reaches everything else — posters, canvas, video frames.
   Run both on every reference and record which one produced each fact; neither is a fallback for
   the other, and a reference measured by one route only is under-measured. Failures are recorded
   as failures; a reference that would not load is never described from its metadata.
3. **Look at the pixels, and read what sits next to them.** This is `reference-set.md`'s own
   standing rule and it applies here unchanged: a lesson written from a promotional card, a
   metadata image or a design mockup is not a lesson. Note in `NOTES.md` which kind of artifact was
   actually read.
4. **Write `NOTES.md`.** Separate what is transferable from what belongs to that publication.
5. **Extract.** Every treatment needs **two independent references** before it is filed; a
   direction needs one, because a direction is a coherent whole and averaging two would produce
   neither.
6. **Prove it renders.** Implement the treatment or direction, render the family's own beat through
   the real engine, and look at the result. A treatment that cannot be drawn is not filed.
7. **Guard it.** Add the `detect` (§5.2) and confirm it goes red when the treatment is removed —
   mutation, not a green test.
8. **Regenerate the indexes** (§8) and re-run the three guards (§7) across the whole corpus.

### 6.1 The three archives, and what each is actually for

Characterised on 2026-09-07 by loading each and reading it, not from reputation. They differ in
kind, and treating them alike would waste two of the three.

| archive | what it actually is | its own index | feeds | read by |
| --- | --- | --- | --- | --- |
| `~/Downloads/infoviz-source-urls-alive.txt` | 3 827 published newsroom interactives across 525 domains — WaPo 547, NYT 490, Bloomberg 112, SCMP 103, Reuters 198, ProPublica 112, Guardian 46, ABC 61, Pudding 29 | none — a flat list | directions, treatments, form, colour — across all four exports | **style route** (SVG marks expose computed styles) + pixel route |
| `informationisbeautiful.net` | an independent collective's poster-style infographics and data-visuals | subject — 11 themes | directions, treatments, form, colour — statically | **pixel route** (its graphics are rasters: four pieces returned 17–23 type tuples and **zero** mark colours) + style route for the page's own type |
| `100.datavizproject.com` | **one** dataset (World Heritage Sites, 3 countries, 2 years) encoded **100 ways**, by Ferdio | STORY / PROPERTY / SHAPE | treatments — the form vocabulary: what else this data could be | style route; carries little direction value, being one house style throughout |

**Every archive feeds every axis. What differs is the ROUTE, never the value.** An earlier draft of
this spec claimed only the url list could yield directions, on the grounds that IIB serves images
with no computed styles. That confused *hard to measure mechanically* with *carries nothing*, and
it would have discarded two archives out of three. A poster has an art direction — frequently a
stronger one than a newsroom page. The pixel route (§6.2) exists to take it.

Two further notes for the runbook:

- **DVP is the strongest treatment source**, and its whole point is that the dataset is held
  constant — exactly the control an encoding comparison needs.
- **DVP's own taxonomy (STORY / PROPERTY / SHAPE) is reused** as the vocabulary of
  `INDEX-BY-ARTIFACT.md`'s shape column, rather than inventing a parallel one.

### 6.2 The pixel route

For any artifact whose graphic is a raster — an IIB poster, a canvas chart, an extracted video
frame — the colour signature is read off the pixels: bucket at 5 bits per channel, split by
saturation into the direction's **chromatic** palette and its **neutral** furniture, and report the
ground as the modal colour, splitting the two by **chroma** rather than HSL saturation (defect 3
below). `scripts/design-base/pixel-palette.mjs` does this today, and photographs the graphic
element rather than cropping the page shot (defect 4).

It also classifies the palette's **shape** — `diverging` | `sequential` | `categorical` |
`monochrome` — by clustering hues. Four defects were found and fixed while building it, two on the
IIB pieces and two on the first real harvest, and all four are recorded here because a later
reader will otherwise reintroduce them:

1. **Spread is not shape.** A first version used `max(hue) − min(hue)` and called "Left vs. Right"
   *categorical* at 207° — a poster whose whole mechanism is two opposed poles. Spread cannot tell
   two clusters from six. Cluster count decides; hue is circular, so 358° and 2° are four degrees
   apart.
2. **The noise floor is relative to the ink, not to the image.** An absolute floor of 0.4 % of all
   pixels called "Who's Suing Whom in AI" *monochrome* — six hues from 5° to 331°, each covering
   ~0.3 % of a page that is 90.9 % white. On a sparse graphic every real pole sits under any
   absolute floor. Measured against the coloured ink, they are all substantial.
3. **Chroma, not HSL saturation, separates a mark from tinted paper.** Found on the first real
   harvest: ABC's cream ground `#FFFCEE` has an HSL saturation of **1.0**, because saturation is
   `d / (2 − max − min)` and runs away toward both poles — a two-percent warmth on near-white reads
   as fully saturated. Counted as palette, that ground outweighed the piece's real blue accent by
   coverage and the harvester reported a blue-accented chart as *monochrome at 49°*, its own paper's
   hue. Chroma (`max − min` on the raw channels) puts cream at 0.067 and the accent at 0.62. The
   same failure waits at the other pole for a warm near-black ink.
4. **The graphic is photographed, never cropped out of the page shot.** A first version cropped the
   viewport screenshot to the graphic's `getBoundingClientRect`. That box is viewport-relative and
   the largest graphic is routinely below the fold: the first real harvest produced
   `crop 0,1840,1440,900` against a 1440×900 image and read zero pixels. Screenshotting the element
   scrolls it into view and captures exactly it — no coordinate arithmetic, and the palette read is
   the graphic's rather than the site's chrome.

Validated on 2026-09-07: Left vs. Right → diverging (19°, 225°, both ramped); $$$Billions →
diverging (172° against 35°); Common Mythconceptions → categorical (3 clusters); Who's Suing Whom →
categorical (4 clusters, 3 ramped). Four for four against a reading by eye.

The Buried Signals archive is a fourth pool, used for existing project references; it is drawn from
the same way as the url list.

### 6.3 The yield log

**What this runbook must record as it goes, in a `METHOD.md` living beside the corpus:** the
candidate pool's filter, how many candidates were drawn, how many harvested, how many survived
step 3, and how many produced a filed treatment or direction — **broken down by archive**, so the
next family learns which pool paid. The yield is the number that tells the next family whether the
pool was good.

## 7. The three guards, each produced by a probe rather than by reasoning

1. **Composition.** No two labels belonging to different treatments may overlap on the delivered
   artifact. Evidence: five treatments enabled stacked three labels in one corner. The arbiter
   (§8) resolves; this guard proves it did.
2. **Glyph coverage.** A direction's family must cover every character it is asked to set, checked
   **before** render. Evidence: `CO2` sets in the requested family at the requested weight; `CO₂`
   (U+2082) drops the **entire text run** to an oblique fallback and loses the weight — measured on
   Superclarendon, Iowan Old Style and Futura, three for three, with the render exiting zero. This
   does not bite today only because the default family is Helvetica. It bites the day a newsroom
   records a display serif, which is the day this axis opens.
3. **Contrast.** Every direction passes the existing contrast gate before it may be offered. The
   nocturne direction (`#111044` ground, `#4FE0C0` accent) is **not** cleared as of this spec —
   it has not been measured.

## 8. Corpus layout and the two indexes

```
docs/design-base/
  METHOD.md                     the runbook of §6, and the yield log
  references/<family>/<id>/      measured.json · screenshot.png · NOTES.md
  treatments/<id>.md             §5.2
  directions/<id>.md             §5.3
  INDEX-BY-ARTIFACT.md           generated: chart/map type × export type -> references
  INDEX-BY-LEVER.md              generated: treatment / direction -> references
```

Both indexes are generated from the records. Hand-editing either is a defect, because two families
running in parallel would conflict on them.

**The arbiter** lives in code, not in the corpus: given a beat's facts it returns the applicable
treatments, resolves their competing placements by `priority` and by measured overlap, and returns
a report of *available* against *taken*. The journalist is shown that report; the choice is not made
silently.

## 9. Reconciliation with existing doctrine — an owned decision

`visual-system.md` states that colour is derived from the newsroom ground and that exactly one
semantic accent exists; `anti-patterns.md`'s closing entry names copying a reference's styling
instead of its information logic as the most common misreading of the reference loop.

Two positions, stated plainly:

- **The treatments axis does not conflict.** Every treatment in the probe kept one accent, kept the
  field flat, and derived its furniture. It extends `design-rubric.md`'s shape — a rule plus a
  detect — from floors to ambitions.
- **The directions axis does conflict, on colour.** Two of the three probe directions carry their
  own ground and accent rather than the newsroom's. The owner was shown this and chose the wider
  scope deliberately on 2026-09-07. It is recorded here as a decision, not an oversight, and it
  must be presented to Tom as one.

The anti-pattern itself is respected in substance: a direction records *measured decisions* —
weight range, tracking, case, header composition — not a publication's identity. No borrowed
typeface, no borrowed logo, no borrowed hue where the newsroom has recorded one.

**Open, and owed to Tom:** whether a direction may override a newsroom's recorded ground and accent,
or may only supply type and space when the newsroom has recorded a palette. This spec does not
decide it; it flags it as the one question that needs his answer.

## 10. First lot

**The temporal line family, across all four exports** — static, web, video, scrolly. Roughly 15
references, drawn from all three archives (§6.1): the url list for the directions and the
export-specific treatments, `100.datavizproject.com` for the encoding alternatives to a time
series, `informationisbeautiful.net` for static form and colour. Chosen because the family's own
beat already exists and is understood (`proof/co2-suisse`), which means step 6 of the runbook is
provable on day one.

The lot is complete when: the corpus holds the references with their notes; at least four
treatments and three directions are filed with evidence; the arbiter runs; the three guards are
green and each has been shown to go red under mutation; and the family's beat renders in every
filed direction through the real engine.

## 11. What this spec does not settle

- The colour question of §9, which is Tom's to answer.
- Whether directions are chosen per newsroom, per story, or per beat. The palette's own ladder
  (newsroom, else subject) is the obvious model and is the working assumption, but no probe has
  tested it.
- Video and scrolly: both probes were static. Nothing here has been proved for a direction that
  must hold across motion or across scroll steps.

## 12. Probe artifacts this spec argues from

Throwaway, in `.sdd/design-probe/` (gitignored): `TreatmentLine.tsx` (five treatments),
`ArtDirectedLine.tsx` (three directions), `glyph-probe.mjs`.

**Two pieces are not throwaway and are the seed of step 2**, currently in the session scratchpad
and to be promoted by the plan:

- `ad-harvest.mjs` — the style route. Validated on six newsroom pieces and four IIB pieces.
- `pixel-palette.mjs` — the pixel route (§6.2). Validated on four IIB pieces, four for four against
  a reading by eye, after the two defects recorded there were fixed.

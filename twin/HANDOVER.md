# The doctrine twin — handover

**What this is: the branch's ORIGIN STORY, frozen. It is not a status report, and reading it as one
will mislead you.** It says why the twin exists, what it decided and why, and what the first three
days measured — and every one of those is still true. Its NUMBERS are not: they were written
2026-08-06 to 2026-08-08 and the tree has moved every day since.

Where the current state actually lives, in this order:

| For | Read |
|---|---|
| what is true of the tree right now | `bun test` from `twin/`, and `twin/MATRIX.md` (generated; `bun run matrix:check` fails on drift) |
| what the owner asked for and what is closed | `twin/FEEDBACK-2026-08-10.md` — the status column is the record, nothing else is |
| what each chantier was told to do | `twin/specs/W*.md`, and `twin/PLAN-2026-08-11-closeout.md` for the order |
| what was measured against those specs | the five `twin/AUDIT-*.md` |

A concrete illustration of why that table exists, because this file caused it: §4 below said
"**364 tests green**" for three days while `skills/splash-twin/test/` alone ran over a thousand, and
§4 and §7 both called the reference set "4 rows" after it had grown to 7. Both are corrected in
place below and dated. Do not add a new count here — add it to the thing that regenerates.

Branch `experiment/doctrine-twin`, worktree `/Users/rmdms/Sites/Professional/splash-twin`,
**never to be merged**. Written 2026-08-06 to 2026-08-08; numbers re-measured 2026-08-11.

---

## 1. Why this branch exists

Tom Vaillant shipped three light skills — `3d-flyover`, `map-explainer`,
`newsroom-chart-animations` — and produced the Water Wars video with them. `newsroom-chart-animations`
is 14 KB of prose with **zero assets and zero scripts**. The engine this project twins carries
~115,000 lines across nine skills and scores 71/100 on its own audit.

The question: **does the light structure produce better work at equal mission?**

The twin keeps the same mission — a newsroom with no data team brings its article, and gets a
finished, owned visual — and changes the method: doctrine in prose plus bespoke code per story,
instead of a registry of parameterised chart types.

---

## 2. The tools — the twin invents nothing

Decided by Rémy, 2026-08-08. Same toolbox as the engine; only the method differs.

| | static | web (hover, filters) | video |
|---|---|---|---|
| **chart** | Datawrapper | D3 | Remotion + D3 |
| **map** | Datawrapper or MapTiler | MapTiler | Remotion + MapTiler |

---

## 3. The architecture — three objects

**The Splash root.** Installed once in a folder the journalist picks: dependencies, probed keys,
`NEWSROOM.md` (name, url, language, house colour, ground, typefaces), and a vendored `shared/`
carrying the craft mechanism so a beat is portable.

**The story workspace.** `stories/<slug>/` inside the root — frozen source, `STORYBOARD.md`, the
bespoke components of *this* story, renders, export.

**The beat.** One visual unit with **one thing to prove**. Two orthogonal axes: a *medium*
(chart · map · image · terrain) and a *genre* (static · interactive · video). A beat is always
standalone and deliverable alone. **Scrolly is a vehicle, not a medium** — it carries one beat that
steps, or several beats of different media.

```
<splash-root>/
├── NEWSROOM.md · .env · package.json
├── shared/                     vendored craft mechanism (render, inspect)
└── stories/<slug>/
    ├── STORYBOARD.md           the editorial contract; gates close INTO it
    ├── source/                 frozen article · frozen data · profile.json
    ├── beats/<n>-<name>/       BRIEF.md · <Component>.tsx · renders/
    └── export/                 the chosen delivery form only
```

### The journey

| Phase | What happens | Gate closes into |
|---|---|---|
| 0 Preflight | root, deps **resolved** (not just present), keys **probed**, `NEWSROOM.md` | — |
| 1 Intake | article + data frozen, silently profiled | `source/profile.json` |
| 2 Framing | intent, **takeaway verbatim**, channel, language | `STORYBOARD.md → takeaway:` |
| 3 Storyboard | the six-movement exchange, slots × candidates | `STORYBOARD.md → slots:` |
| 4 Production | bespoke code, render ladder, pixel checklist, 3-turn budget then stall | `beats/*/renders/` |
| 5 Assembly | video montage or scroll scaffold — skipped for a single beat | — |
| 6 Delivery | the forms the genre allows; only the chosen one is built | `export/` |

**The orchestrator holds no state.** `whereIs(storyDir)` reads the directory and returns the phase.
A session resuming days later knows where it stands from the filesystem alone.

### One skill per MECHANISM, never per type

The test: *does it wire differently, or does it draw differently?* Line, bar and scatter share the
wiring — one skill, plus a prose sheet per type. Chart vs map differ in mechanism — separate skills.
Genre may deserve a split (static/web vs video) because Remotion frame-gating is a different wiring;
type never does. **41 skills would be the registry under another name, with the routing becoming the
registry.**

### Skill anatomy (the Tom canon)

```
skills/<id>/
├── SKILL.md          8 sections: Overview · When to use · gotcha · Architecture ·
│                     How it works · Quick start · Tuning knobs (each a number) · Files
├── references/*.md   the hard-won knowledge, as prose  (+ types/*.md — where the 41 types live)
├── scripts/*.mjs     deterministic, dependency-free ESM (Bun/Node built-ins only)
└── assets/           ONE seed marked "REPLACE ME. Do not parameterise me." + sample-data + preview
```

**Three floors:** the seed teaches the *mechanics*, not a type · `references/types/*.md` carries the
per-type knowledge as prose · `assets/geometry/` holds pure functions only. The boundary is testable:
*if a function knows a colour, a label or a font size, it is not geometry.*

---

## 4. State — what is built

**How many tests are green: run `bun test` from `twin/`.** ~~364 tests green.~~ That number was
written on 2026-08-08 and was still sitting here on 2026-08-11, by which time
`skills/splash-twin/test/` **alone** ran 1,041 across 31 files. A count in a frozen document is a
claim that decays daily and that nobody re-measures — which is the same failure this file records
under §11's "eleven orphan stills". No new number is written here on purpose.

| Skill | State |
|---|---|
| `splash-twin` | orchestrator, preflight (probed keys, resolved deps), `whereIs`, story scaffolder |
| `twin-intake` | freeze + RFC 4180 reader + profiler |
| `twin-storyboard` | the six movements, `checkStoryboard`, **claim-grounding** |
| `twin-doctrine` | editorial standard · visual system · information architecture · anti-patterns · motion grammar · geo discipline · reference set (**7 rows as of 2026-08-11 — 4 when this was written, and still the weak point**) |
| `twin-chart-beat` | static, on d3 primitives + `inspect-render` (measures painted pixels) |
| `twin-chart-video` | Remotion + d3, editable timing contract |
| `twin-dw-beat` | Datawrapper, **with `range-annotations`** the engine's mapper does not expose |
| `twin-map-beat` | MapTiler static + video, one baked camera |
| `twin-deliver` | forms offered, waited on, only the chosen one built |

**In flight when this was written** (results will land after): `twin-chart-web` (the interactive
gap), the engine's interactive side for comparison, and an attempt to wire `infoviz.design` into the
reference set.

---

## 5. What was measured — do not overstate it

### The thesis, in its verified form

Tested on four shapes, one of them run **specifically to break it**:

| shape | visual channel | can the registry designate an element? |
|---|---|---|
| line · video · choropleth | continuous | **no** |
| ranking (bars) | **discrete** | **yes, and well** |

**A type whose only visual channel is continuous cannot designate an element.** A bar chart can,
because it is made of discrete objects — and the engine's `highlight` does it cleanly there, at lower
cost. So *"a parameterised registry cannot mark an interior subject"* is **false in general, true for
the line and the choropleth**.

Corollary found last: the twin wins the map because it made its **legend discrete** (classed bins
carrying two marks) where Datawrapper keeps a continuous ramp labelled only at its ends. The
constraint was a legend choice nobody had posed as a choice.

### Blind judging — three rounds, three times 3/3 for the twin

Pairs anonymised, shuffled per case, key kept outside the judges' folder, judges told not to
determine provenance. Two judges on static (different models, no contact), one on video. All picked
the twin's render in every case, and all reported "no consistent A/B winner" because the labels
alternated — none realised it was consistent by system.

The video judge characterised the two systems better than the project had:
> **Grammar 1** — establish the comparison as a labelled rule *before any data arrives*; draw the
> series so the viewer watches it cross; land emphasis last, on the subject, with its value. Built as
> an argument; the reference is baked into the scale.
> **Grammar 2** — title, gridlines, draw end to end, label the last point. A competent animated
> chart, no argument. Its single emphatic gesture is **structurally bound to the endpoint**.

### Cost, measured once

Video, two cases, identical work: engine 152k tokens, twin 212k — **≈1.4× at the margin**, far less
than earlier claims. Plus ~314k of one-time construction for the twin's video path. **A substantial
up-front investment plus a modest marginal premium** — which amortises over stories.

### Two real bugs found in the engine

1. `d3-bars` static export **truncated** at 16 rows — the "never crop" path failed and the render-size
   guard **asserts only the width leg** on a row-driven type. The guard is blind in the dimension
   that varies.
2. Datawrapper exposes `range-annotations` (verified live); the engine's mapper does not use it —
   `grep -rn "range-annotation" skills/dw-chart/src` returns nothing. **Three changes to close.**

---

## 6. Rulings — decided, do not re-litigate

- **Correctness governs over the plan.** A real defect in the plan's own code gets fixed and the plan
  amended. (Rémy, after Task 3.)
- **No cross-skill imports at RUNTIME. A TEST may import across skills** for the sole purpose of
  asserting two implementations agree.
- **The seed is written from scratch, not harvested from the engine** — otherwise the experiment
  measures the engine repackaged.
- **Primitives yes, chart libraries no.** `d3-scale`/`d3-array`/`d3-shape` are data → coordinates and
  are exactly what the doctrine calls pure geometry. Observable Plot, Recharts, Chart.js hand you a
  type with props — the registry under another name.
- **The exchange accompanies, it does not extract.** (Rémy, 2026-08-08 — the most structural
  correction of the project.) When the journalist does not know, the system **proposes with its
  reasoning**; "none" is a legitimate answer and is recorded as given, never replaced by an invented
  caveat. The decision is always the journalist's; when they hand it back, propose the most suitable
  option and say why, with the trade-offs.
- **Isolation is mechanical.** Nothing under `twin/` reads the engine's `skills/`. One real breach
  occurred (an agent opened three `SKILL.md` files to check a formatting convention); every dispatch
  since forbids it explicitly.

---

## 7. What to do next, in order

**1. Close the interactive gap** (in flight). `twin-chart-web` — D3, hover, keyboard, responsive,
self-contained HTML. It is the engine's DEFAULT format for an article-web channel, so it is
potentially the most-used path and it was missing.

**2. Grow the reference set — the single weakest thing in the project.** Four rows had failed on
**three consecutive real stories** by the time this was written, the third time with a real
journalist rejecting both analogies offered. The file holds **7 rows** as of 2026-08-11, indexed by
argument structure — which is the change asked for below, half-made; the floor in
`reference-set.test.ts` is still 7, and no fourth story has been run against it. The design calls this quality lever number one; in practice it has never worked.
What it needs: retrieval **by argument structure**, not by chart type. "Bar chart" is useless at the
moment of need; "a long series read against a historical level", "a profile of dimensions with an
internal contradiction", "a ranking whose subject sits mid-table" are what the storyboard phase
actually holds. `infoviz.design` (Buried Signals) is the candidate source.

**3. Harvest `references/types/*.md`** — the ~41 type sheets. This is where the engine's real
knowledge survives, as prose. Harvesting, not writing.

**4. The remaining craft skills**, in this order of value: map interactive · `twin-image-beat` ·
the assembly vehicles (`montage`, `scroll`).

**5. The two doctrine debts still open:** the axis-density rule was fixed for static but the video
judge says it is **still wrong for motion**; and the twin bakes the comparison value into the
y-domain, which guarantees verifiability but **costs vertical resolution** — a real trade-off never
posed as one.

---

## 8. The one question none of this answers

**A journalist who does not know this system, on their own article, under deadline.**

The protocol is written and committed: `twin/JOURNALIST-TEST.md`, with refutation criteria stated in
advance so an uncomfortable result cannot be rationalised afterwards. Two sessions have been run —
one with Rémy, one with Rémy playing Yvan — and both produced real findings, but both had a
participant who knows the system.

**This session decides more than everything measured.** It costs nothing but their time, and it tests
the only layer the engine cannot absorb with a patch.

---

## 9. The recommendation on record (2026-08-08) — OVERTURNED THE SAME DAY

> **Overturned by Rémy, 2026-08-08, before any of §7 was resumed.** His words: the twin's structure,
> architecture and logic are better, and he wants it pushed until it rivals the engine. The
> recommendation below is kept because its reasoning is still the honest case against, and because a
> reader who finds it should know it was heard and set aside rather than missed. **It is no longer
> the project's position.** What follows from the reversal is §11.

**Do not develop the twin as a product. Keep it as a laboratory.**

Almost everything it wins is repairable in the engine within days: `range-annotations`, a `highlight`
field on the line component, a height guard on row-driven exports, the axis-density rule, and the
**mutation-verification discipline** — break the line on purpose, confirm the test goes red.

Two things cannot be patched in, because they are not features: **the editorial exchange** and the
**editable timing contract**. Their fate depends on the journalist session.

---

## 10. Method lessons worth keeping regardless of the verdict

1. **Mutation verification caught ~30 real defects** that no green suite would have shown.
2. **Verification instruments are the weakest link, and they fail in the reassuring direction** — six
   occurrences in two days, including one the controller built into a blind test that penalised only
   the opponent, and then asserted was not its fault.
3. **The convenient substitute replaces the thing**: caption tracks instead of the graphic, metadata
   instead of the image, a social card instead of the published chart, tests instead of the PNG.
4. **A report that overstates its own guarantee ends the surveillance of a known risk.**
5. **A rule applied outside its domain** — three occurrences: the zero baseline (a bar rule on a
   line), the conclusion rule (an annotation rule applied to a title), sparse ticks (a motion rule
   applied to a static chart).

---

## 11. The canon restoration (2026-08-08, 30 commits)

The twin claimed Tom's structure. It was measured against it and did not hold. Spec:
`docs/superpowers/specs/2026-08-08-twin-canon-restoration-design.md`; plan:
`docs/superpowers/plans/2026-08-08-twin-canon-restoration.md`. Suite went 382 → **460 tests, 457
pass, 3 skip, 0 fail**.

**What was measured, before anything was changed.** `SKILL.md` was compliant 9/9. `assets/` was
compliant 1/4. Nine runtime cross-skill imports existed in shipped code, against the project's own
§6 rule. `wrap()` was copied three times with nothing making the copies disagree.

**Two rules were settled by reading Tom's actual skills rather than by reasoning.** Neither had been
written down, and both had been guessed wrong first:
- **Skills duplicate; they never link.** No import leaves a skill's own directory in
  `~/Downloads/cesium-flyover` or `map-explainer`, and his two geo-prep scripts — same job, 105 and
  130 lines — share *zero* function names. A shared-library refactor was designed and rejected on
  this evidence.
- **The idiom is a labelled seam, not genericity.** `prep-geo.mjs` hardcodes its story
  (`COUNTRIES`, `RIVER`, per-country `ANCHOR_BBOX`) behind `// ===== CONFIG — edit for your river`.
  A skill's script *is* its seed's runner; what must be visible is what the journalist replaces.
- Corollary, found later: **his seed IS his story** — `sample-data/yarlung-flow.json` is the real
  river. A draft that asked for a story-free seed was more abstract than anything he ships.
- And: **he has no tests at all.** His gate is the rendered artifact committed beside the skill.
  Here the suite is kept, but test *counts* were ruled estimates; the artifact is the gate.

**What now holds, each verified by attacking it, not by reading it.** One seed per genre a skill
ships, marked verbatim, with sample data, a generated preview and an `output-proof`. Every preview
regenerable and `--check`-guarded. Story artifacts live in `proof/<slug>/`. **No import leaves a
skill** — `skills/splash-twin/test/no-cross-skill-imports.test.ts`, which took five fix rounds and
whose header states honestly what it cannot catch. **A skill copied alone still renders** —
`seed-renders-standalone.test.ts` copies a skill into a temp root holding nothing else and renders
its seed; proven by re-adding a `proof/` import and watching the isolated render fail. Duplication
is made safe by `helper-parity.test.ts`, comparing 10 `wrap` and 10 `measureText` copies within
substrate families.

**Open, deliberately, with rulings:**
1. **Alias/symlink indirection defeats the guard silently.** A `package.json` `imports` mapping or a
   symlink into `skills/` is invisible to a path scan. Both are now asserted against, but the
   general class needs an AST. **Priority is higher than it looks:** `shared/` already holds
   skill-named directories of byte-identical copies, so "why are these duplicated, let's symlink
   them" is the most natural tidy-up there is, and it is the exact move that blinds the guard.
2. **None of the three video beats has a frozen dataset**, and each credits a real institution
   ("Federal Statistical Office", "Global Carbon Budget via Our World in Data") with nothing
   committed that reproduces it. Pre-existing, not worsened here. It is still a false attribution in
   a repository about journalistic craft, and the fix is small: commit the CSVs, or credit sample
   data the way the seeds now do.
3. **The `--check` guards do not travel.** They byte-compare PNGs rendered with this machine's
   fonts, and the map one needs `MAPTILER_KEY` plus a warm `/tmp` plate cache — and hard-fails
   rather than skipping, unlike the `DATAWRAPPER_TOKEN` convention. On a fresh clone they go red for
   reasons that are not defects.
4. **`twin-chart-video` is still CO₂-branded** — composition id, `BEAT`, filename — around a
   rainfall seed. This is believed to be *why* seven false documentation claims survived three
   sweeps: "EmissionsVideo" and "co2-suisse" make "shares geometry with `proof/co2-suisse`" read as
   plausible instead of obviously wrong.
5. Smaller: the video parity family only ever exercises its no-DOM fallback, never the real canvas
   measurer; `proof/co2-suisse/render-web.mjs` reaches the skill directly rather than through
   `#shared/*`; there is still no typecheck gate.

**The method lesson this plan adds to §10.** Every guard built here scans **code**. Markdown is
scanned by nothing — and seven false statements about the code survived in documentation, needing
three sweeps, the last settled only by running `git log` instead of reading. The code is now guarded
six ways; the sentences describing it are guarded by nobody, and a reader follows the sentences
first.

## 12. The night of 2026-08-08 — the journey becomes real

The canon restoration (§11) made the skills sound. This pass made the **journey** work: an article
in, a delivered visual out. Suite went 460 → 662 tests.

### What was found by walking it, not by reading it

A clean-room run — an operator allowed to read only documentation, never implementation — took a
real article and real Swiss electricity data through the whole journey. It reached a delivered
chart and produced **eleven findings**. The four that mattered:

1. **Delivery knew only the `static` genre.** `twin-chart-web` and `twin-chart-video` were complete,
   tested, documented skills whose output could not be delivered at all — `offerForms` threw. The
   journalist had asked for "the web". Nothing warned; the wall was hit at the last phase.
2. **The newsroom's identity was collected and never used.** Preflight validated `NEWSROOM.md`;
   nothing threaded its colours into a render. The Quick start showed them as literals with a
   `// from NEWSROOM.md` comment — an instruction to copy by eye.
3. **`measureText` under-measured by 3.3× and said nothing.** It takes an options object; passing a
   bare number returns exactly what passing nothing returns, because resvg falls back to a default
   size. The function whose whole purpose is that gutters are measured rather than guessed.
4. **Preflight was unconditional**, probing MapTiler for a chart-only story and reporting a failed
   environment for a key that story would never use.

### What now holds

- **The genre contract.** A genre must be produceable *and* deliverable, checked at the moment of
  choice. Delivery learned `web` and `video`. A drift test fails if a producer appears without a
  delivery path, or the reverse.
- **Preflight establishes what is possible, not a verdict.** It returns `{ready, blockers, checks,
  capabilities}`; a missing key **narrows capabilities**, never blocks the session. The stop became
  mechanical (`assertPreflightReady`) instead of prose. Key names from the sibling engine are
  accepted as aliases. The storyboard consumes `capabilityGap` and refuses a medium the environment
  cannot honour — "map beats are unavailable: no MapTiler key", never "environment failed".
- **`NEWSROOM.md` has three outcomes, not two:** valid, missing, or **declined**. A declined theme
  is a recorded choice, checked before validation — not a silent default. The anti-fallback rule
  exists so a visual never ships in a colour nobody chose; an explicit refusal is not that.
- **`twin-newsroom-charter`** derives a charter by measuring the newsroom's own site, showing every
  value beside the markup it was read from. Tested against four real newsrooms: two yielded a brand
  colour, and **nzz.ch yielded nothing and said so** — correctly rejecting a carousel library's
  default blue rather than presenting it as measured. That refusal is the skill's whole point.
- **A hosted embed, deployed for real.** Cloudflare Pages direct upload, four API calls matched
  against Wrangler's own source, no CLI and no new dependency. Proven by deploying and fetching
  back byte-identical.
- **A CMS insertion form, marked UNPROVEN in three places** — `SKILL.md`'s Overview, its How it
  works, and the first line of the file it emits. `assertNotPartialReplace` guards We.Publish's
  total-replace `updateArticle`: mutation-proven to refuse a dropped paragraph, an altered body, an
  empty previous body. When someone reaches a real CMS, the guard is already there.
- **`twin-scrolly`**, the assembly vehicle. Proven by driving a browser: stepping, no-JS survival,
  reduced motion, 375px.
- **22 per-type prose sheets** (16 chart, 6 map), each carrying what the type is for, when *not* to
  use it, the one thing that goes wrong, and its accessibility trap. Both READMEs name the 28 types
  **not** covered, so the set cannot be mistaken for complete.
- **Cross-cutting craft lessons harvested into the doctrine** — label-vs-mark contrast, fixed
  gutters where a measurement belongs, genre-scoped axis and end-label rules, and a rewritten geo
  rule 7 (it recommended no-data hatching, contradicting the engine's own shipped flat colour and
  its own best-practice doc calling hatch illegible).

### The correction that mattered most

The three video beats credited real institutions for numbers nothing committed could reproduce;
each render read a CSV from `/tmp`. Freezing the real data into each story folder exposed two
falsehoods:

- **migration** claimed 1997 and 1998 were negative. The real FSO series: 1996 and 1997 negative,
  **1998 positive at +1,177**. The chart carried callouts on a year that contradicted its own claim.
  Corrected to 1996/1997, title narrowed to "Twice since 1991".
- **life-expectancy** credited the Federal Statistical Office, which publishes only sex-split
  series. Averaging them by hand would have been an invented number under a real name. Re-credited
  to UN World Population Prospects via Our World in Data.

**And fabricated data hides layout bugs.** The synthetic series were smooth; the real ones are
jagged, and re-rendering surfaced a label collision the fake curve had been concealing.

### The lesson this night adds

**Prose is the unguarded surface.** Every mechanical guard built here scans code — `.mjs`, `.ts`,
`.tsx`. Markdown is scanned by nothing. Seven false statements about the code survived in
documentation across three separate sweeps, and the last was settled only by running `git log`
rather than reading. The code is guarded six ways; the sentences describing it are guarded by
nobody — and a reader follows the sentences first. **A test asserting that every exported signature
named in a `SKILL.md` still exists in that shape is the next thing worth building.**

### The production sweep, and what only producing could find

Sixteen beats were produced from real data, each in its own `proof/<slug>/` with its source frozen
beside it: **eight static chart types** (grouped bar, stacked bar, scatter, area, slope, histogram,
waterfall, population pyramid), **three web** (bar, scatter, slope), **two video** (area, dumbbell),
and **three map types** (proportional symbol with a video build, locator, hex grid). Plus
`twin-image-beat`, a new medium, and `twin-scrolly` revised.

**One shared bug surfaced only by reading a rendered tooltip:** the French number formatter `fr()`
mis-grouped digits past one decimal place. It is shared, so it was wrong everywhere it was used —
and no test noticed, because every copy agreed. Two independent agents also found the same data
artefact (one country's 2022 life expectancy at 18.8 years against its own neighbouring years of
40.3 and 57.4) and both excluded it rather than drawing it.

**The type sheets earned themselves.** They are not decoration in the repository — they show up in
the output. The pyramid's subtitle explains that sorting by size would destroy the shape the chart
exists to show. The hex grid's legend says "count, not energy or magnitude" and its footnote warns
that a cell packed with small quakes outranks one with fewer large ones. Both are the sheets' "the
one thing that goes wrong" arriving in the artifact.

**Defects only a wider sweep could expose:**

- **MapTiler's `dataviz-light` paints water grey**, breaking the doctrine's water/land/no-data
  colour discipline. Invisible on the existing choropleth because polygons covered everything;
  glaring the moment a symbol or hex map left water showing. Fixed at every bake.
- **A baked plate at 900×560 drawn into an 836×330 box with no scale correction** — every hex cell
  would have sat offset from the coastline beneath it. A silent geographic lie.
- Two datasets were **replaced after looking at the render**: a waterfall whose steps were 1% of
  its base and invisible at scale, and a scatter carrying a data artefact (one country reading 18.8
  years against its own neighbouring years of 40.3 and 57.4).
- Caught by looking, not by tests: an off-by-one tick-label list, a fixed-width legend colliding, an
  annotation off-frame, a clipped source line, a locator label running off the edge, and **a stale
  hard-coded number in alt text that contradicted the chart beside it**.

**The scrolly was corrected twice, on the owner's instruction.** Prose now travels **over** the
sticky graphic rather than beside it (contrast measured at 21:1 where they overlap), and the
scaffold is media-agnostic: its seed assembles a photograph and a drawn diagram, not four states of
one chart. `SKILL.md` now says the thing that matters — **if every step shows the same chart, do not
reach for this; animate the beat instead.** A vehicle earns its existence only by carrying different
media.

### The count, measured on disk rather than reported

At the close: **28 beat folders, 28 frozen CSVs** — every beat carries its own data — **32 PNGs, 6
self-contained HTML files, 6 mp4s**. **32 chart type sheets and 8 map type sheets.** **14 skills**,
up from 9: `twin-chart-web`, `twin-newsroom-charter`, `twin-image-beat`, `twin-map-web` and
`twin-scrolly` are new. Suite 460 → **774 tests, 771 pass, 3 skip, 0 fail**, tree clean, 44 commits.

**Why that paragraph says "measured on disk".** Folder counts were being reported as delivered work,
and an audit found **five beats that declared a genre and had never produced its artifact** — two
video beats with no mp4, a web beat with no HTML, and more. From the outside nothing distinguished
them: same component, same render script, same frozen data, suite fully green. This is the same
failure the whole week has produced in different clothes — the presence of a file mistaken for the
existence of a result. All five were rendered and committed; the guard below now makes the class
impossible to repeat.

### The six mechanical guards, and why each exists

Every one was born from a defect found this week, never from an intuition — and every one states in
its own header what it does **not** catch, because a guard trusted beyond what it verifies is worse
than none.

| Guard | The defect that created it |
|---|---|
| no cross-skill imports | nine violations in shipped code, against the project's own rule |
| seed renders standalone | a skill that did not build once copied — the premise, untested |
| helper parity | ten copies of `wrap`/`measureText` that could drift silently |
| preview freshness (`--check`) | a hand-made `preview.png` that had drifted from its seed |
| `SKILL.md` matches code | seven false documentation claims surviving three sweeps |
| beat produces its artifact | five beats counted as delivered with nothing rendered |

The one class still unguarded is **prose assertions** — natural-language claims a structural scan
cannot reach without unacceptable false positives. Three of the seven documentation defects were
exactly that. It remains the softest surface in the project.

### A parallelism lesson worth keeping

Up to six agents wrote into this one tree at once. Two failure modes appeared, neither obvious:

- **A whole-tree `git add` swept another agent's uncommitted work into an unrelated commit.** The
  content survived under a wrong message. Disjoint *file sets* are not enough — every agent must
  commit only its own explicit paths.
- **One agent's mutation test turns the shared tree red for everyone.** Three agents reported
  failures that were not theirs; all three correctly said so, but one "fixing" what it thought was
  broken would have cost real work. Mutate in a copy, or declare the window.

### The web genres became genuinely responsive, and what it cost to get there

The owner overturned a documented decision: the web genre pre-rendered **two fixed layouts** (900px
and 360px) swapped by a media query, defended in `web-discipline.md` as "two rungs, not a continuous
reflow". He wanted full-width, continuously adaptive output.

**The problem that decision had been avoiding:** in a fluid SVG, scaling the viewBox scales the
*text with it*. A title correct at 900px is oversized at 1600 and unreadable at 400.

**The answer, now shipped in both web genres:** the SVG carries **geometry only — zero `<text>`
elements** — and every word (title, caveat, source, axis labels, annotations) is HTML positioned in
percentages over the same grid cell, at a fixed pixel font size. Geometry stretches; type does not.
Measured: 24px title at 1600, 1024, 768 and 375. The map genre took the same separation, plus a
deliberate plate decision — bake generously at 1000px and scale within that, **never distort**, since
a stretched basemap is a lie about distance and shape.

Both genres gained **filters** in pure CSS (`:checked` + `:has()`, no script, so they survive with
JavaScript disabled), and the map gained **bounded pan-and-zoom over the same baked plate** — live
tiles were considered and rejected in writing, because they would break self-containment and ship a
MapTiler key inside the delivered file. One rule governs all of it: **nothing argument-bearing sits
behind a control.** The default view already shows what the title claims.

**Two defects only real browser driving could find:** an HTML overlay with no `pointer-events: none`
silently swallowed every hover while keyboard focus still worked — because `.focus()` bypasses hit
testing, which is exactly why no test reached it; and a label-flip margin hardcoded to the old plate
size clipped a right-edge label at 375px.

### The number that matters most: one beat in four carried a false claim

Every beat's rendered title, subtitle, annotations and alt text were checked against its own frozen
data, recomputing each assertion from the file rather than trusting the brief. **55 beats checked.
12 carried a false claim** — five found earlier by eye, seven more by the sweep.

What they were: a year typed instead of derived ("passed 8 billion in 2023"; the data crosses in
2022, in two separate beats). Two negative years named when the data says two different ones. A
count asserted ("nine countries") that the beat's own footnote contradicts. A credit naming an
institution that does not publish the figure shown. A range wrong by five years. "Well under half"
where the real figure is ~65%. An alt text naming the wrong region for a map's densest cell. And
once in the other direction — "almost entirely" where the value is exactly 100% every year.

**Every one had the same cause: a value typed by hand instead of computed from the data.** Not one
was caught by a test, and the suite was green throughout. The corrections were required to *derive*
their values, because a hand-typed correction is the same defect with a better number.

**A spot-check is not a check.** The controller personally verified one figure in the age pyramid's
alt text, found it correct, and reported the beat sound — while two further claims in the same
sentence were wrong. Checking one assertion in a sentence says nothing about the others.

**This is the strongest argument in the repository for freezing data beside the beat.** None of
these was findable before the data travelled with the artifact; a render reading a CSV from `/tmp`
cannot be audited at all.

### Open, and precisely described

**The eleven web chart beats are not retrofitted onto the new seed.** They work, on the old
two-rung pattern. Retrofitting means re-rendering and re-driving each one — the verification that
takes the time and cannot be skipped without reproducing what this session spent the night fixing.

**The scroll vehicle's prose panel collides with the graphic's own annotations.** At some scroll
offsets within a step the opaque panel covers the step's label (verified: "flood day" reduced to
"flo…" at 1600×900, 55% scroll), and during transitions two steps' panels are visible at once. The
vehicle does the four hard things — graphic pinned, N steps, full width, nothing clipped by the
frame — and this is collision polish between panel and annotation. Five rounds went into this
element; a fresh eye will do better than a sixth.

**A verification script of its own can be wrong.** One agent found a race in its own checker — a
live `IntersectionObserver` reasserting the wrong step mid-measurement. Another disputed the render
audit twice and was right both times: an alt text the audit called false was correct, and a video
the audit called clean was defective. **The audit is a report like any other.**

### The work queued when the session ran out of agents (2026-08-09, owner's list)

Nine items, given by the owner after looking at the rendered output. **None is started.** They are
written here in his priority order so a fresh session picks them up without re-deriving them.

1. **Colours must follow the newsroom theme or fit the subject — ground included — and be PROPOSED
   to the journalist, who accepts or chooses otherwise.** This is the biggest gap: `NEWSROOM.md`
   carries `brandColor`, `ground` and `typefaces`, preflight validates them, and **nothing threads
   them into a render**. `twin-chart-beat`'s Quick start still shows them as literals with a
   `// from NEWSROOM.md` comment — an instruction to copy by eye. Three parts: make the values
   reach the render; make the palette a proposal carrying its reasoning, with the journalist's
   answer recorded; keep the contrast guard firing, because a house brand colour can easily fail
   against the house ground and an unreadable chart is worse than no proposal. Subject-fit means a
   grounded convention (green for renewables, grey for coal), not a colour that "feels right" —
   when no convention applies, the house theme wins.

   **Started 2026-08-09 (`d3012f71`).** `twin/skills/twin-palette/scripts/palette.mjs` exists and
   holds the whole mechanism: `proposePalette` (house option + subject option, each with its
   provenance, its reasoning and its measured contrast), `matchConvention` over a deliberately
   short table of conventions, `adjustToContrast` (a remedy shown beside a failing option, never
   swapped in), and `readPalette`, which throws naming every directory it searched rather than
   defaulting. The accent floor is WCAG 2.2 SC 1.4.11 non-text, 3:1 — not 4.5:1, because the
   accent carries no text; the words already clear 4.5:1 through `deriveFurniture`. Subject-fit
   is grounded on Lin, Fortuna, Kulkarni, Stone & Heer, *Selecting Semantically-Resonant Colors
   for Data Visualization*, Computer Graphics Forum 32(3), Proc. EuroVis 2013 — expert-chosen
   resonant colours measurably speed up chart reading. **What remains:** `format-proposal.mjs`
   (the question the journalist answers, mirroring `twin-newsroom-charter`'s), the two
   `references/` files, `assets/PALETTE.example.md`, `SKILL.md`, tests, a `contrast` family added
   to `helper-parity.test.ts`, and the threading itself — a duplicated `readPalette` in each craft
   skill plus a Quick start that calls it instead of showing hex literals. Then one real beat
   re-rendered under a real house profile, as proof.

   **CLOSED 2026-08-09 (`850db5e5`).** All of the above shipped. `twin-palette` is a complete skill
   — `format-proposal.mjs`, both `references/` files, `assets/PALETTE.example.md`, `SKILL.md`,
   tests. `readPalette`/`parsePalette` are vendored into all six `render-still.mjs` copies (a beat
   already imports that module to render at all; a second import path for two colours is one more
   thing to get wrong), and `helper-parity.test.ts` gained a `contrast` family and a `parsePalette`
   family across all seven copies — mutation-checked by relaxing the `origin` rule in one copy,
   which turned it red and named the copy that drifted. `twin-chart-beat`'s Quick start calls
   `readPalette` and names no hex.

   **The proof is `proof/palette-proof/`**: the same render script, naming no hex value anywhere,
   run under two recorded answers — teal on white (`origin: newsroom`), then amber on near-black
   (`origin: journalist`), the furniture inverting with the ground because `deriveFurniture`
   derives ink/muted/grid from whatever it is handed. Both PNGs were opened and looked at. Third
   run: `PALETTE.md` moved aside, and the render THROWS naming every directory searched, rather
   than producing a chart in a default colour.

   **Two defects in the 2026-08-09 draft, both surfaced by the tests, both corrected against
   measurement rather than reasoning.** (1) `proposePalette` recommended a FAILING option — with
   only a failing house colour it fell back to `options[0]`, handing back a 1.61:1 brand marked
   "recommended" three lines under the words "FAILS the 3:1 floor"; it now falls to another passing
   option, and to nothing if none passes. (2) The claim that a mid-grey ground defeats
   `adjustToContrast` was **false**. Swept over 4352 grounds: zero nulls at 3:1, zero at 4.5:1,
   first at 5:1; the hardest ground is `#747474` at 3.0000809:1. The `null` branch exists for a
   caller who raises `min`, not for a ground that defeats the default. That false claim had been
   written into the code comment, a `references/` file AND the `SKILL.md` gotcha — one hand-written
   assertion propagated three times, which is the prose-is-the-unguarded-surface lesson arriving in
   documentation instead of in a chart title.

   **What remains of this item, honestly bounded** (recorded in `proof/palette-proof/PROOF.md`):
   only the STATIC chart genre has been re-rendered through a recorded answer. Web, video, map and
   scrolly import the same vendored `readPalette` and are guarded for parity, but none has been
   proven end to end. And `typefaces` — `NEWSROOM.md`'s third identity field — still reaches
   nothing: the one font stack is `FONT_FAMILY` in `render-still.mjs`, and threading a newsroom's
   own faces means shipping or resolving those faces, a different problem, not started.
2. **A web beat must fit the visible window** — no scrolling inside the visual. Today width fills
   and height grows with it, so a wide viewport produces a beat taller than the screen.
3. **Verify hovers really work**, in both web genres, by dispatching real pointer events at real
   coordinates. One defect of exactly this kind was already found: an HTML overlay without
   `pointer-events: none` swallowed every hover while keyboard focus still worked, because
   `.focus()` bypasses hit testing — which is why no test caught it.
4. **Verify filters the same way**, with real clicks, confirming the picture changes and the
   default state shows the full claim.
5. **The filter controls look unstyled** — plain radios read as a placeholder. They need a
   considered treatment, still keyboard reachable, still working with JavaScript disabled.
6. **The accessible region table becomes opt-in, not default** (owner's call). When turning it off,
   `map-web-discipline.md` must state plainly what those readers lose: a map is spatial, a screen
   reader has no spatial access, and the table was the answer.
7. **The scroll vehicle must carry different media** — chart, map and image tracks, not one kind of
   frame. Its seed currently assembles a photograph and a drawn diagram; a real map track and a
   real chart track are the point of the vehicle.
8. **Complete the type × genre matrix.** Measured from the briefs: chart static 12 types, chart web
   15, chart video 12. Missing statics include heatmap, small multiples and bar-and-column; missing
   videos include line, lollipop and bar-and-column. Maps have six types spread across the genres.

   **CLOSED 2026-08-09.** Two agents re-measured the matrix before touching it, and the paragraph
   above was **wrong about the video genre**: it shipped **14** distinct types, not 12 — line and
   lollipop were already done. The static count of 12 and the web count of 15 were right, and the
   three missing statics were exactly the three named.

   Static went **12 → 15** (heatmap, small multiples, bar-and-column). Video went **14 → 17**:
   bar-and-column, the one type the web genre had and video did not, plus **bump** and **diverging
   bar**, which NO genre carried — rank-over-time is the type motion earns most, and the deviation
   family had never appeared at all.

   **Three findings worth more than the counts.** (1) The heatmap first rendered as a **flat grey
   slab** with every assertion true and every contrast check passing: the 3:1 pale floor on a light
   ground leaves roughly 90 of 255 levels, and spending them linearly across a domain that runs to
   87% while three quarters of readings sit under 25% put nearly everything in one grey — a 98%
   collapse was invisible. Fixed at the SCALE (square-root position, monotonic, legend ticks on the
   same transform so its uneven spacing shows the non-linearity), not by lowering the floor. The
   tension is general to any luminance-encoded type on a light ground and is now written into
   `twin-chart-beat/references/types/heatmap.md`; **no guard exists for "technically compliant and
   visually flat"**. (2) In the bar-and-column video, frame 100 printed "3.19" above a column
   standing at 2.15 — a label naming a height it had not reached, **invisible in the still** and
   found only by extracting frames from the mp4. (3) In the diverging bar, the conclusion's dashed
   rule struck through four value labels and turned Malta's "−3.39" into what reads as "+3.39": a
   reader would have seen a country rise that fell. Not cosmetic — a claim defect, found by looking.

   **And the class that came out of it, now being closed separately: every pre-existing video beat
   has a BLANK frame 0** (measured: zero non-white pixels on `lollipop.mp4`, `line.mp4`,
   `waterfall.mp4`). Frame 0 is the poster frame — the thumbnail a CMS or a social platform pulls.
   The reveal sequence starts at 0, so everything gated on it is invisible in the one image a reader
   sees before pressing play.
9. **Re-verify every render, old and new.** The last audit covered 46 artifacts and found 11
   defective; the tree now holds 88.

**And one gap found while measuring the matrix: 13 beats have no `BRIEF.md`** — every map beat,
plus `life-expectancy` and `migration`. The brief is the beat's editorial contract: what it proves,
its reveal order, its single accent, its anti-patterns. Those thirteen have data, a component and an
artifact, but nothing recording what they were meant to demonstrate — and it is why the map half of
the matrix cannot be measured as reliably as the chart half.

### What the night of 2026-08-09 added, beyond the nine items

**A redesign silently broke every beat in its own genre, and the suite stayed green.** `a1fc4d92`
replaced the chart-web genre's two fixed layouts with one fluid frame — the owner's own overturn,
correct and not in question — and removed `layouts` from `renderWeb`'s signature **without migrating
the fifteen beats that pass it**. Every one now dies with `Cannot destructure property 'width' from
null`. Established by exporting four commits with `git archive` into `/tmp` and running the same
script in each: it passed at `a1fc4d92~1` and failed at `a1fc4d92`. Nothing was red, because a beat's
render script is not a test — **the genre had fifteen artifacts on disk and no way to reproduce any
of them.** The tree documented a fluid window-fitting genre while every shipped `.html` was two-rung
HTML from before it. This is the deepest instance yet of the file-mistaken-for-a-result class: not a
missing artifact, but fifteen present ones that had become unreproducible.

**The number formatter was three different functions wearing one name.** Nine copies of `fr()`:
three delegating to `Intl.NumberFormat("fr-FR")` (correct), three hand-rolled regexes emitting a
PLAIN space — which lets a browser break a line inside a number — half of them missing the regex's
`g` flag so only the first thousand grouped, and **three defined as `value.toFixed(decimals)`: a
function named `fr` returning an English number.** That last one reached delivered artifacts.
Unified onto `Intl`, guarded by a new `fr` family in `helper-parity.test.ts` — and then a re-render
exposed the deeper defect the unification had hidden: **five of the six beats using it declare
`lang="en"`.** They now printed French decimals under English prose, an axis reading `68,9` beneath
a headline reading "rose 15.0 years". The real rule is that **a beat's formatter takes its locale
from the beat's own declared language**, the same way its colours now come from `PALETTE.md`, and
not from a function's historical name. Being right about the function and wrong about the beat is
its own lesson: unifying copies makes them consistent, not correct.

**`helper-parity.test.ts` guarded six of twenty copies.** A hand-written import list cannot know
about a file created after it was written. `render-still-parity.test.ts` now WALKS the tree and
compares every `render-still.mjs` function by function — a superset (`twin-image-beat` adds six) and
a subset (every `proof/` copy carries no `readPalette`) are both legitimate; two copies of the same
function disagreeing is not. Whitespace is stripped entirely rather than collapsed, because
collapsing reported `twin-scrolly` as drifted twice and both were the formatter breaking a method
chain across lines. **A guard a formatter can turn red is a guard someone disables.**

**Two missing guards, not one — and the second is the harder half.** Of the false claims delivered
to readers, one shape is a **false title over true numbers** (the data is real and correctly drawn;
the headline overstates it). A grounding check catches that: claim and data are both present and
they disagree. The other shape is a **true title over invented numbers** — three evidence artifacts
render a migration series existing nowhere in the tree, credited to the Federal Statistical Office,
with negatives at 1997/1998 where the real series has 1996/1997 and 1998 **positive**. Those titles
agree perfectly with the numbers beside them; every consistency check passes. What is wrong is that
the render read a CSV from `/tmp` that no longer exists. That needs a **provenance** guard — does a
beat's render resolve all its inputs inside its own folder — which is a different and more
mechanical question than "is this sentence true of this data".

**A render script whose default output path points outside the repository.** `mapmore-scrolly-danube`
defaulted to `/tmp/scrolly-twin/`. Run the obvious way, it produced a fresh artifact nobody looks at,
printed a path, exited zero, and left the committed one stale — so its own non-collision measurements
had been taken against a build the repository did not contain. Fixed to write beside the beat.

**Frame 0 of every pre-existing video is blank** (measured: 19 of 22 mp4s at 0.0000% non-ground
pixels; `mapgen-choropleth-video` was the one beat that already got it right, so "every" was one
beat too broad). The reveal starts at frame 0, so everything gated on it is invisible in **the
poster frame** — the one image a reader sees before pressing play, and the thumbnail a CMS or social
platform pulls. All 19 fixed, guarded by `video-first-frame-not-empty.test.ts`, which takes the
frame's own MODAL colour as ground rather than hardcoding white, so a dark house theme cannot pass a
blank black poster.

**And the class behind it, found while fixing it: 32 beat render scripts defaulted their OUTPUT to
`/tmp`.** Run one the obvious way and it wrote a fresh artifact into a scratch directory, printed a
path, exited zero, and left the committed one stale — **a fix reaches source and never reaches an
artifact**. The project had already frozen every beat's DATA beside it, and froze the 11 map beats'
PLATES beside them this same night; output was never done. All 32 now write beside their own beat,
guarded by `render-output-lands-in-its-own-beat.test.ts`, which collects destinations
*behaviourally* (the first argument of every write call, every `outDir:` property) rather than by
grepping for `/tmp`. The strongest evidence it worked: **all 16 web beats, re-run with no arguments,
produced output byte-identical to what is committed** — so the fifteen artifacts the fluid-frame
redesign had made unreproducible are both current and reproducible again.

The input half of that class survives OUTSIDE `proof/`, and one instance is the exact shape that
produced the invented migration series: `twin-chart-video/scripts/render-video.mjs`'s `--data`
defaults to `/tmp/video-twin/data.csv` — a renderer whose DATA default is a scratch file.
`twin-map-beat/scripts/render-preview.mjs` compares its `--check` guard against a plate in `/tmp`.
Both are named rather than fixed, because their skills were being edited concurrently.

**"Eleven video beats commit a `<name>-still.png` that no script produces" — MEASURED, AND FALSE.**
This claim was reported by one agent, repeated by the coordinator several times across the night,
and written into this file, before anyone checked it. The measurement: for every beat holding a
`*-still.png`, does any `.mjs` in that beat write that name? **Exactly one does not: `co2-suisse`.**
The three beats holding both a `-still.png` and a `-final-frame.png` (`life-expectancy`,
`migration`, `vidy-pyramid-niger-population`) write both, deliberately, and the pairs are
byte-identical.

Worth keeping for two reasons. First, the one real case is the telling one: **`co2-suisse` is the
project's first beat** — the reference everything else was written against — and it is the only beat
with no `BRIEF.md` AND the only one with an unproduced artifact. The most-cited beat is the least
tended. Second, this is the failure the whole night was about, committed by the person policing it:
a number taken from a report, repeated until it sounded established, and false the whole time. It
cost nothing here only because someone finally ran the check.

The real open question is narrower than the false one: three beats write the same image under two
names. That is a duplicate, not an orphan, and which name is the artifact of record is still an
editorial call.

### Still open

- The map track for the scrolly; images as a medium; the assembly phase in `whereIs`.
- CMS insertion is unproven — no real endpoint exists to reach.
- The `--check` preview guards do not travel: they byte-compare PNGs rendered with this machine's
  fonts, and the map one needs `MAPTILER_KEY` plus a warm plate cache and hard-fails rather than
  skipping. On a fresh clone they go red for reasons that are not defects.
- Alias/symlink indirection still defeats the cross-skill import guard, and `shared/` already holds
  skill-named directories of byte-identical copies — so "let's symlink these" is the most natural
  tidy-up there is and it blinds the guard silently.
- No typecheck gate.

## Evidence

`twin/COMPARISON.md` (the full comparison dossier) · `twin/PROOF.md` (the journey end to end) ·
`twin/TRIAL-THREE-BEATS.md` (the copy-paste trial) · `twin/JOURNALIST-TEST-RESULT.md` (the first
session) · `twin/JOURNALIST-TEST.md` (the protocol for the real one) ·
`twin/proof/` (renders, storyboards, briefs, comparison evidence).

Spec: `docs/superpowers/specs/2026-08-06-splash-doctrine-twin-design.md`.
Plan SP1: `docs/superpowers/plans/2026-08-06-doctrine-twin-sp1-spine.md`.
Execution ledger (gitignored): `.superpowers/sdd/2026-08-06-doctrine-twin-sp1-spine/progress.md`.

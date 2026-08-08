# The doctrine twin — handover

**Read this first.** It is the single document that lets someone resume without the conversation
that produced the branch. Everything else is evidence it points at.

Branch `experiment/doctrine-twin`, worktree `/Users/rmdms/Sites/Professional/splash-twin`,
**never to be merged**. Written 2026-08-06 to 2026-08-08.

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

**364 tests green.** `cd twin && bun test`.

| Skill | State |
|---|---|
| `splash-twin` | orchestrator, preflight (probed keys, resolved deps), `whereIs`, story scaffolder |
| `twin-intake` | freeze + RFC 4180 reader + profiler |
| `twin-storyboard` | the six movements, `checkStoryboard`, **claim-grounding** |
| `twin-doctrine` | editorial standard · visual system · information architecture · anti-patterns · motion grammar · geo discipline · reference set (**4 rows — the weak point**) |
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

**2. Grow the reference set — the single weakest thing in the project.** Four rows have now failed on
**three consecutive real stories**, the third time with a real journalist rejecting both analogies
offered. The design calls this quality lever number one; in practice it has never worked.
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

## 9. The recommendation on record (2026-08-08)

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

## Evidence

`twin/COMPARISON.md` (the full comparison dossier) · `twin/PROOF.md` (the journey end to end) ·
`twin/TRIAL-THREE-BEATS.md` (the copy-paste trial) · `twin/JOURNALIST-TEST-RESULT.md` (the first
session) · `twin/JOURNALIST-TEST.md` (the protocol for the real one) ·
`twin/proof/` (renders, storyboards, briefs, comparison evidence).

Spec: `docs/superpowers/specs/2026-08-06-splash-doctrine-twin-design.md`.
Plan SP1: `docs/superpowers/plans/2026-08-06-doctrine-twin-sp1-spine.md`.
Execution ledger (gitignored): `.superpowers/sdd/2026-08-06-doctrine-twin-sp1-spine/progress.md`.

# Production-skill parity by traits — design

**Date:** 2026-08-20
**Status:** design, approved in conversation; implementation plan not yet written
**Supersedes nothing.** Extends the mechanism landed by
`docs/superpowers/plans/2026-08-19-creation-process-parity.md`.

## The problem, stated from measurements

The guard catalogue closed one class of gap: a defect that earned a rule in one skill now has to be
carried by every skill the defect can reach, or argued unreachable in prose, and the suite refuses
debt. `GUARDS.md` reads 0 owed cells, down from 15.

It closed that class with a mechanism that has a hole at its centre: **the reachable set of every
rule is typed by hand.** Two consequences, both measured on 2026-08-20, the day after it landed.

**A rule already fails to reach a sibling.** `map-beat` ships the video genre — its own `SKILL.md`
says so: *"Both formats ship here, unlike the chart engine where video is a separate skill"* — and
carries `assets/timing.ts`, the same timing contract `chart-video` has. Six map beats under `proof/`
declare a `total` frame count. So a map video is a timed build that ends, and `reveal-completes`
(`neverArrives`), written the previous evening, applies to it exactly as it applies to a chart video.
It is declared by `chart-video` alone, because that is the skill someone typed into the row. The
defect the catalogue exists to prevent reappeared inside the catalogue itself, within a day.

**Capabilities are asymmetric between siblings, and nothing says so.** A crude sweep of the producing
skills:

| capability | chart-web | map-web | scrolly | chart-beat | map-beat | image-beat |
| --- | --- | --- | --- | --- | --- | --- |
| accessible table (`role="table"`) | **0** | 5 | 0 | 0 | 0 | 0 |
| `prefers-reduced-motion` | 3 | **0** | 2 | 0 | 0 | 0 |
| `aria-label` | 2 | 4 | **0** | 0 | 0 | 1 |
| keyboard (`tabindex` / `keydown`) | 5 | 7 | 1 | 0 | 0 | 0 |
| weight ceiling | 1 | 1 | 1 | **0** | **0** | 3 |

`map-web` can hand the same facts to a reader with no spatial access to the map; `chart-web` cannot,
though a chart is exactly as unreadable to a screen reader. `map-web` animates a live basemap and
honours no reduced-motion preference. `scrolly` — the most interactive vehicle in the tree — carries
no `aria-label` at all. These are grep counts and therefore a signal, not the inventory; the
inventory is step 2 of the sweep below.

## What this is not

**Not a shared code core.** A per-group core (`shared/chart`, `shared/map`, …) imported by the skills
was designed and rejected on 2026-08-20 after measurement, and the reasons are recorded here so the
question is not re-opened from intuition:

- Of 15 file families duplicated across skills, only two are byte-identical (`compare-png.mjs` ×9,
  `splash-root.mjs` ×3) plus `filter.ts` at 100%. `render-preview.mjs` exists in 7 copies and shares
  **14%** of its lines; `render-web.mjs` in 2 copies sharing **16%**. A core built on shared filenames
  would force convergence where the tree deliberately diverged.
- `sizes.mjs` is 72% common, and the missing 28% is `dw-beat` deliberately carrying **no**
  `typeScale`, with a comment saying that absence is the point. A core serving all three needs a
  flag, and the first flag is how a core becomes a configuration surface.
- Copies cost drift; a core costs blast radius. One edit would reach six skills with no per-skill
  test barrier, in a tree whose own history records edits made under pressure and measured afterwards.
- The parity tests compare doc comments as well as bodies, because *"a copy that kept the code and
  dropped the reasoning is a rule the next author will delete"*. A core moves that reasoning out of
  the directory an agent opens.

The single measured drift incident in the tree's history — `marksFromSource` gaining the
`style={{ }}` form in one copy and not the other, *"within one afternoon"* — was caught by the parity
test before shipping. Copies are dangerous; the mechanism that watches them worked.

## Architecture

Three pieces: what a skill declares about itself, what a rule requires, and the derivation that joins
them.

### 1. Traits — what a skill IS

Each producing skill carries `TRAITS.json` at its root: the mechanisms it has, not the work it does.
The initial vocabulary, with the witness that proves each one:

| trait | witness (checked, never trusted) |
| --- | --- |
| `draws-own-geometry` | the skill writes marks itself — `scripts/render-still.mjs` present |
| `projects-geography` | `scripts/bake-plate.mjs`, which is where a camera is resolved and points are projected — the same file that witnesses `bakes-a-plate`, because in this tree nothing projects without baking |
| `bakes-a-plate` | `scripts/bake-plate.mjs` writing `plate.png` **and** `geometry.json` |
| `owns-a-surface-it-did-not-choose` | either witness of `bakes-a-plate`, or a provider client returning an artefact (`delegates-rendering`) — derived from the other two rather than declared on its own |
| `timed-build-that-ends` | a timing contract declaring a `total` (`assets/timing.ts`) |
| `reader-driven-reveal` | a driver reading the scaffold's published scroll position |
| `ships-standalone-html` | a script writing a `.html` artefact |
| `delegates-rendering` | a provider client — the artefact is fetched, not drawn |
| `embeds-reader-photos` | a manifest of the journalist's own images |

Measured on 2026-08-20, the witnesses already present:

```
                bake  timing  html  render-still  delegates
chart-beat       .      .      .        Y            .
chart-web        .      .      Y        Y            .
chart-video      .      Y      .        Y            .
dw-beat          .      .      Y        .            Y
map-beat         Y      Y      .        Y            .
map-web          Y      .      Y        Y            .
image-beat       .      .      .        Y            .
scrolly          Y      .      Y        Y            .
```

**Two non-negotiables.**

- **A trait has a witness.** A declared trait its own files contradict fails the suite, in both
  directions: claiming one it has not got, and — the one that matters — dropping one it has in order
  to escape a rule.
- **A trait is declared by the skill**, never in a central table. A skill knows what it is; a central
  table drifts from the tree without saying so.

### 2. Rules — what has to be shared

`skills/doctrine/references/guard-catalogue.json` becomes `rule-catalogue.json`: `guards` becomes
`rules`, and each rule carries

| field | meaning |
| --- | --- |
| `id` | kebab-case, as today |
| `kind` | `guard` · `capability` · `discipline` |
| `requires` | **the traits it needs — never a list of skills** |
| `refuses` (guard) / `offers` (capability, discipline) | what it stops, or what it gives a reader |
| `earnedBy` | the defect or need that earned it — required, as today |
| `decidedBy` / `detectedBy` / `writtenIn` | how a skill is confirmed to carry it |
| `states` | per derived skill: `carried` or `owed` |
| `exceptions` | per derived skill: the **measured** reason it does not apply despite the trait |

A cartographic rule requires `projects-geography`, so it cannot land on a chart skill. A future
`map-video` inherits every cartographic rule the day it declares the trait, with nobody remembering.

### 3. Derivation and the five invariants

`reachable(rule) = { skill : traits(skill) ⊇ rule.requires }`, computed, never typed. The parity test
refuses:

1. a derived skill with **no state** — carried, owed, or an exception;
2. a `carried` state the rule's own detector **does not confirm**;
3. a rule **naming a skill outside** its derived set — the anti-noise invariant: cartographic rules
   cannot be written onto chart skills even by hand;
4. an **exception without a measured reason** (the existing prose-length floor applies);
5. **any owed cell at all** — `owedRows()` stays empty across all three kinds, as it has been since
   `7957cdb0`.

Invariant 3 is the separation the owner asked for, mechanised. Invariant 1 is the one that stops a
fix made in one place from never reaching the others: the day a skill has the trait, the cell exists
and it is red until it is carried or argued.

## Detection, by kind

This is where a parity mechanism turns into theatre, so the detector is what defines the kind.

**`guard`** — unchanged from the landed mechanism: the skill declares the decision in its `GUARDS`
array, the decision is walked byte-for-byte against every other copy, and a mutation must redden it.

**`capability`** — a detector that reads the **delivered artefact**, never the source. A `role="table"`
found by grep proves nothing; what proves is a delivered page carrying a table whose rows hold the
same values as the marks. Reduced motion is constated by driving the page under
`prefers-reduced-motion: reduce` and measuring that the reading changes — `verify-scrolly.mjs`
already drives exactly that. Keyboard access is constated by reaching every interactive mark with
`Tab` and getting the detail hover gives.

> **The separation rule that prevents theatre: a capability whose detector can only grep the source
> is not a capability — it is a discipline.** It changes kind rather than pretending.

**`discipline`** — presence of the rule's id in the skill's `SKILL.md` or references, and **nothing
more is claimed**. The generated document prints disciplines in their own table under an explicit
caveat: *written where an author reads it, not mechanically verified*.

## Generated state

`GUARDS.md` becomes `RULES.md`, generated by `scripts/rules.mjs` (`--write` / `--check`), keeping the
existing shape: a matrix per kind, the owed list, the argued-blank list with its reasons, and a
section per rule naming what it refuses or offers and the defect or need that earned it. Traits get
their own table, so a reader sees why a rule reaches the skills it reaches.

`bun run rules:check` replaces `guards:check` in the release baseline.

## The norm, in `AGENTS.md`

> A fix or a capability that touches a mechanism more than one skill has is declared as a **rule**, at
> the moment it is made — not later. A rule declares the **traits** it requires, never skills: the set
> it reaches is derived, so a skill that acquires the trait inherits the rule without anyone
> remembering. The suite **refuses debt**: a reachable cell nobody carries is a named red, and the only
> two ways out are to carry it, or to write an exception with the measurement behind it. **Removing a
> trait to escape a rule is refused by that trait's witness.**

## The sweep

The work list is **discovered, not decided**, so the order matters:

1. `TRAITS.json` for the eight producing skills, plus the witness test.
2. Migrate the ten existing guards from hand-typed skills to `requires`. The derivation immediately
   produces new cells — `map-beat` × `reveal-completes` is the first known one; there will be others.
   **These reds are the chantier.**
3. Add the capabilities with their artefact detectors: accessible table, reduced motion, keyboard
   reach, no-JavaScript degradation, weight ceiling, alt text and credit.
4. Close cell by cell — failing test first, mutation, and **look at the render** — one skill at a
   time, one commit per cell.
5. Disciplines last: cheapest, least mechanical, and honest about being so.

**Step 4 cannot be sized before step 2 runs.** The number of red cells is a measurement, not an
estimate, and the implementation plan is written after the derivation reports it.

## Verification strategy

Every mechanism in this design is mutation-checked before it lands, the way the landed one was:

- a declared trait removed from a skill that still has its witness → red;
- a witness removed while the trait stays declared → red;
- a rule naming a skill outside its derived set → red;
- a `carried` state whose detector finds nothing → red;
- an exception whose reason is too short to be a reason → red;
- one cell flipped back to `owed` → the debt assertion reddens by name.

## Risks

- **The trait vocabulary can be wrong.** A trait too coarse makes a rule reach a skill it should not;
  too fine and every rule needs its own trait. Mitigation: a derived cell stays arguable — an
  exception with a measured reason is always available, and its prose says which way the model was
  wrong.
- **Capability detectors are expensive.** Several need a browser, which the existing drivers already
  pay for; the detector belongs beside them rather than in a new pipeline.
- **The sweep touches the render path of every producing skill.** It belongs on its own branch, not on
  `fix/scrolly-cargo-guards`, which is 40 commits ahead, unmerged, and is what the partner will read.

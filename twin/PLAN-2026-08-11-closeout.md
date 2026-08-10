# Closeout plan — 2026-08-11

Written after the owner read the five spec audits and the reconciled backlog, and said: do these one
by one, do not do a global thing that fails to cover, keep the skills' construction logic respected
and updated everywhere, and make it actually work end to end.

**Sources of truth for this plan, in order**: `FEEDBACK-2026-08-10.md` (the owner's own list, now
reconciled: 25 closed / 18 partial / 20 open), the five `AUDIT-*.md` files, and this document for
ordering. Nothing here supersedes the owner's list — it schedules it.

## The method this plan may not trade away

The twin is Tom Vaillant's self-contained-skill method. A skill stays copy-pasteable on its own, so
helpers are **duplicated, never imported across skills** (`no-cross-skill-imports.test.ts`). The word
"engine" describes the ORIGINAL Splash and must not be used here — reaching for a shared layer is
proposing the wrong architecture.

So "make X true for 23 types" is always: **the same change, made identically in each craft skill,
with a WALKING parity test proving the copies stay in step.** Canonical copy first, then vendored,
then the walker re-run.

Four invariants: nothing renders in a value nobody chose (a missing input throws, naming what it
looked for) · every reader-facing number is derived from the beat's own frozen data · a beat's inputs
and outputs live in its own folder · **a guard that cannot go red is worse than none**, so every
guard ships with the mutation that reddens it, run in a copy outside the tree.

## What the audits proved, that this plan exists to fix

Four failures of the same shape — **the mechanism was built, and nothing uses it**:

1. **Live maps** — the seed is good (NavigationControl, leash after the runtime fit, one filter
   vocabulary) and **0 of 9 committed map HTMLs contain maplibregl or api.maptiler.com**. Stripping
   the live block leaves **354 tests passing**; the only guard that sees the live layer reads a
   hand-written path outside the repo that no script produces.
2. **Export sizes** — `size` passes the gate and **no producer reads it**: 0 of 17 statics, 0 of 19
   videos, 0 of 18 webs draw at a table size. `typeScale = width/900` for all three rows, so all
   three land at the same apparent size — 5.3 CSS px on a phone against a 11–12 px floor.
3. **Credits and typeface** — credits at the bottom in 9 of 64 components, while the doctrine file
   already asserts the placement 55 of 64 do not have. `FONT_FAMILY` is a literal in every renderer
   while `typefaces` is measured, recorded and read back at preflight.
4. **The journey's verdicts** — `genreGap`/`capabilityGap`/`groundTakeaway`/`reachable` are called
   **nowhere**: a grep across all scripts returns only their four definitions.

Plus: 5 of the 9 crossfade-fixed beats still ship an mp4 that predates the fix (guards green,
artifact wrong), and several guards cannot go red at all.

## Order of work — one chantier per agent, scoped by FILE so they cannot collide

| # | Chantier | Owns these files | Blocked by |
|---|---|---|---|
| **1** | **Live maps everywhere** — every map × web beat really uses MapTiler, always; controls and filters where useful; the out-of-map zoom button removed; the 9 committed HTMLs regenerated; the delivery key made real (second, domain-restricted) and its guard's three holes closed; the guard that stays green when the live layer is stripped made able to fail. | `skills/map-web/*`, `proof/mapgen-*-web/`, `proof/mapmore-*-web/` | — |
| **2** | **Furniture: credits at the bottom, then the typeface actually used** — canonical change in `chart-beat`, vendored to every copy, all 64 components, genre by genre; `typefaces` threaded from `NEWSROOM.md` to every render with refusal before the render when a face cannot resolve; every affected proof re-rendered. | every `render-still.mjs`, the video components, `map-beat`, `image-beat`, `dw-beat` | — |
| **3** | **Export sizes honoured end to end** — the journalist's chosen size reaches the producer and the delivered file carries it; per-size type scale so portrait and square are legible on a phone (the mobile-first probe's budget); refusal when a type cannot enter a format; the size guard that cannot go red replaced. | `sizes.mjs` and its copies, `Root.tsx` compositions, the produce path, `chart-web` responsive | 2 (shares renderers) |
| **4** | **The journey, finished** — the four verdicts actually consulted; the phase check that reports "done" on an unapproved beat; the delivery folder that wipes the previous beat's; the proposal opened up to genuinely different visuals with a reason each, verified reachable. | `skills/intake`, `skills/storyboard`, `skills/splash/scripts/{where,deliver,gate}.mjs` | — |
| **5** | **The erroneous guards** — every guard the audits caught not going red, fixed and re-mutated; the stale `MATRIX.md` check wired into the suite; the spec header that records seven closed items falsely. | `test/*` across skills, `scripts/matrix.mjs` | — |
| **6** | **Map scrolly navigation is a highlight** — the camera goes to what the step names; per type. | the map scrolly beats | the vehicle work in flight |
| **8a** | **Per-beat defects, charts × web** — B6.1 (a missing x label), B6.2 (full available width), B6.6 (the widest band unreadable and off-centre), B6.9 (missing axis and connector lines, plus a hover tooltip on the connecting line), B6.15 (flow/route × web, the empty matrix cell). | `skills/chart-web/*`, its proofs | — |
| **8b** | **Per-beat defects, charts × static** — B6.3 and B6.5 (a dashed rule and its label unreadable over the bars; the pyramid's centre labels cut), B6.8 (axis and connector lines not drawn), and the mechanism all six annotation items share: an annotation placed and coloured **without reference to what it annotates**. The derivation exists in six places in the tree and none of the eight live sites calls it. | `skills/chart-beat/assets/*.tsx`, its static proofs — **never `render-still.mjs`** | — |
| **8c** | **Per-beat defects, maps and video** — B6.4 and B6.7 (two label layers overlapping on the highlighted datum), B6.10 (a country label not centred on its shape), B6.13 (colours that do not work together, and the unbalanced empty space), B6.16 (a hexagon emphasised with nothing said about it), B6.17 (symbol overlap and size when close together). | map static/video components, chart video components | 2 (shares those files) |
| **9** | **B4.1 — a map for ANY focus area**: the planet, several continents, one country, a region, a city. The largest single item in the owner's list; the audit measured the 138× extent gap still empty. | `skills/map-beat`, the camera derivation | 1, 8c |
| **7** | **Proofs refreshed** — every committed artifact regenerated so no stale or buggy proof survives; the 5 pre-fix mp4s first. | `proof/**` | 1, 2, 3 |

## The rename, decided by the owner 2026-08-11 — do NOT do it early

The twin replaces Splash. At the moment the branch is merged toward `rd-dev`, **everything is renamed
`splash` → `splash` and `twin-*` → the product names**. Recorded here because it is the one task
that cannot be improvised at merge time.

**Why it is not a find-and-replace.** The two trees coexist today *precisely because their ids are
disjoint* — `splash` + `twin-*` against `splash`, `chart-native`, … — which is what lets both be
installed on one machine without overwriting each other. Renaming makes them collide on:

- the 15 skill ids and their front matter;
- **both doors** — `~/.claude/skills/splash` and the flat links in `~/.agents/skills`, which the
  old product also occupies;
- the env var names, the `#shared/*` resolution root, `.claude-plugin/plugin.json`, `SPLASH_*` vars;
- `splash-doctor` on `~/.local/bin`.

So the rename needs a decision first: **what happens to an already-installed old Splash** — is it
removed, left in place under its old name, or migrated — and at what moment its links come down.
Write that answer before touching a single identifier.

## The public page — splash.buriedsignals.com

Served by GitHub Pages from `buriedsignals/splash`, **branch `main`, path `/`** (`CNAME` +
`index.html`, 1440 lines). Any change to the public explanation is a change to `main`, i.e. public
the moment it is pushed. Two inconsistencies already stand there and belong in the same pass:

- it states **"MIT licensed"** while R3 defers the licence question for the installer and the engine
  is private and unlicensed;
- the repository description still reads **"Atelier"**, superseded by the rename to Splash.

## Rules every chantier follows

- Work the owner's list item by item, and **update `FEEDBACK-2026-08-10.md`'s status column as each
  lands** — with the evidence, not the intention. That file went a whole session unmaintained and
  cost a full reconciliation to repair.
- A doctrine or reference file is updated **with** the code, never ahead of it. `static-discipline.md`
  asserting a placement 55 components do not have is what that failure looks like.
- Re-render what you change and **open it and look**. Every serious defect in this project came from
  opening the artifact, not from reading code.
- Report what you measured before what you chose.

---
title: Creation-process parity — no producing skill weaker than its neighbour
status: design
opened: 2026-08-19
plan: docs/superpowers/plans/2026-08-19-creation-process-parity.md
---

# Creation-process parity

## The problem, in one measurement

Eight skills produce visuals. What each one can VERIFY about what it produced, counted as
assertions in its own verification scripts, on 2026-08-19:

| producing skill | formats it owns | verification assertions |
| --- | --- | --- |
| `scrolly` | scroll-driven interactive | **42** |
| `map-web` | map · web | 10 (all in `verify-live-map.mjs`) |
| `chart-web` | chart · web | 4 |
| `dw-beat` | chart · static, hosted embed | 1 |
| `chart-beat` | chart · static | **0** |
| `chart-video` | chart · video | **0** |
| `map-beat` | map · static, map · video | **0** |
| `image-beat` | image · static | **0** |

Four of the eight have no verification driver at all. The tree ships **19 chart types over 56
beats** and **6 map types over 18 beats** through those paths.

This is not an abstract worry. Every guard `scrolly` now carries was earned by a defect a reader
found on a real page, and **each of those defects is reachable from at least one of the four unarmed
paths**:

- a dash that measures its own path while `vector-effect: non-scaling-stroke` computes it in screen
  space — a line drawn as head, hole and tail. `chart-video`'s line reveals and `chart-web`'s
  entrance animations use exactly this mechanism;
- a raster plate cropped under an overlay that letterboxes, so every mark lands somewhere the
  basemap never claimed — `map-beat` and `map-web` both bake plates and draw marks over them;
- a plate baked on the opposite side of the theme the beat declares, which makes correct furniture
  unreadable — same two skills;
- the same asset inlined many times into a self-contained file — every web and scrolly output;
- a mark the narrative reaches that never says so — any format with a reveal, which is all of them
  except a bare static frame.

## What this is not

**Not a shared library.** This tree's rule is that a skill is self-contained and a beat's own
scripts stay copy-pasteable; `map-web`, `map-beat` and `scrolly` each carry their own
`resolveChrome`, deliberately. The answer to duplication here is a **walking parity test**, not an
import.

**Not a demand that every skill grow 42 assertions.** A guard belongs to a skill only if the defect
it catches is reachable there. A static chart cannot have a stalled scroll step.

**Not a rewrite of the render ladder.** Every skill already renders something lookable
(`render-still`, `render-web`, `render-video`, `render-scrolly`). What is missing is what happens
AFTER the render.

## The mechanism

### 1. One written catalogue, in the doctrine

`skills/doctrine/references/guard-catalogue.md` — the single list of guards this project has earned,
each with: what it refuses, the defect that earned it, the formats it is REACHABLE in, and the exact
name of the pure function that decides it. The doctrine is already the one place every producing
skill reads before writing rendering code, so this is where a rule stops being local.

The catalogue is a table a machine can read, not prose: one row per guard, a `formats:` column of
declared applicability.

### 2. One parity test that walks every skill

`skills/doctrine/test/guard-parity.test.ts` reads the catalogue and, for every guard, checks that
every format the catalogue declares it reachable in has a verification script carrying it. A skill
that lacks a guard its formats can reach fails the test **by name**, so the gap is visible in the
suite rather than in someone's memory.

This is the mechanism that answers "never end up with a creation process weaker than another": the
weakness becomes a red test.

### 3. The guards themselves, copy-parity

Each guard's decision is a PURE function taking measurements, already the shape `verify-scrolly.mjs`
uses (`stillSteps`, `duplicatedPayload`, `projectionDisagreements`, `revealDashInScreenSpace`,
`requiresScrub`, `stalledSteps`, `neverReached`, `plateFollowsGround`). A guard reaching a second
skill is copied there verbatim, with its own unit tests, and the parity test asserts the copies
agree — the same treatment `strokeWidthsFor`-style duplication already gets in this tree.

## The catalogue as it stands today

Earned guards, and where each is reachable. **R** = reachable and carried, **·** = reachable and
MISSING, blank = not reachable.

| guard | chart-beat | chart-web | chart-video | dw-beat | map-beat | map-web | image-beat | scrolly |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| duplicated inlined asset | | · | | | | · | · | **R** |
| plate ↔ overlay projection | | | | | · | · | | **R** |
| plate follows the theme | | | | | · | · | | **R** |
| dash measured in screen space | · | · | · | | · | · | | **R** |
| a reached mark declares it | | · | · | | | · | | **R** |
| step redraws / scrub not slideshow | | | | | | | | **R** |
| WCAG floor on the real ground | R | R | · | R | · | · | R | R |
| alt text present and true | R | R | | R | · | · | R | · |

Two columns are worth naming: `chart-video` is reachable by four guards and carries none, and
`map-beat` is reachable by five and carries none.

## Sequencing

The order is by exposure, not by convenience:

1. **`chart-video`** — 19 chart types can be produced as video, the dash-reveal defect is native to
   it, and it has no driver.
2. **`map-beat`** — 6 map types, static and video, plates and overlays, no driver.
3. **`chart-beat`** and **`image-beat`** — static frames; fewer reachable guards, but the payload and
   contrast ones bite.
4. **`chart-web`** and **`map-web`** — drivers exist; guards are added to them rather than created.
5. **`dw-beat`** — rendering is delegated to Datawrapper, so only the owned artefact is checkable.

Each step is independently useful: after step 1, chart videos are held to what scrollies are held to.

## What "done" means

- the catalogue exists and every guard in the tree appears in it;
- `guard-parity.test.ts` is green, meaning no format is missing a guard its own catalogue row says it
  can reach;
- each guard added to a skill arrives with its own unit tests and is mutation-checked — red when the
  defect is reintroduced;
- `MATRIX.md`'s sibling, a generated `GUARDS.md`, states the coverage so a reader sees the state
  without running anything.

## The rule this whole document exists to encode

Three defects in one day were found by the owner watching a page scroll, and none by an instrument
here. Every one of them was then made mechanical. **A fix that stays in the beat it was found in is
half a fix**; a fix that stays in the skill it was found in is three quarters. The catalogue and its
parity test are what make the last quarter automatic.

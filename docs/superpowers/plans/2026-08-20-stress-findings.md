# Stress-test findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the nine defects a stress test found by running the toolchain against input a journalist would actually bring — and, for every defect that can happen in more than one skill, close it as a **rule in the catalogue** so the derivation carries it to every skill its traits reach, instead of to the one place it was found.

**Architecture:** Each finding is fixed where it lives, and then asked one question: *can this defect happen in another skill?* If yes, it becomes a `guard`, `capability` or `discipline` in `skills/doctrine/references/guard-catalogue.json`, declaring the TRAITS it requires; the derivation decides which skills it reaches and the suite refuses debt. If no, it is fixed with a regression test and stays local.

**Tech Stack:** Bun, `bun:test`, plain `.mjs`, the rule catalogue landed on 2026-08-20.

**Source:** the stress test of 2026-08-20 — `stories/stress-a-energy-bills`, `stories/stress-b-piped-water`, `stories/stress-c-vacant-homes`, and the two beats they produced.

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, and is watched failing.
- English only, everywhere. No mention of any AI tool in code, comments or commit messages.
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED and registered in the `COPIES` map of `skills/splash/test/guard-copies-parity.test.ts`.
- Edit through `Bash`, never Edit/Write — a global formatter hook breaks byte-identical copies.
- Every mechanism added is **mutation-checked**, exact red message in the commit body.
- `owedRows()` and `unstatedRows()` must be empty when a task finishes; an exception needs a MEASURED reason.
- **The frozen stress stories are the acceptance test.** A fix that does not change what those three stories produce has not been demonstrated.

---

### Finding 1 — the grounding check confirms a direction the data contradicts

**Severity: the worst of the nine.** `groundTakeaway("The share of vacant homes has risen steadily over the last four years, from 8.4% to 7.2%.")` returns two `supported` verdicts, one per number, because each sits inside the column's range. The file's own header says it exists to catch *"a number **or a direction** the frozen data itself contradicts"* and that *"it never returns 'supported' for something it did not verify, because silence and confirmation must not look alike"*. Both claims are false today.

**Files:** `skills/storyboard/scripts/ground-claim.mjs`, `skills/storyboard/test/`.

- [ ] Failing test first, with the stress sentence verbatim.
- [ ] A direction word (`rose`, `risen`, `climbed`, `grew`, `increased`, `fell`, `dropped`, `declined`, `shrank`) paired with an ordered pair of numbers is checked for AGREEMENT with the pair's own order. Disagreement is `refuted`, naming both numbers and the direction.
- [ ] A number in range whose sentence carries a direction the check could not evaluate is `unverifiable`, never `supported` — silence and confirmation must not look alike.
- [ ] Mutation: flip the sentence to "fell … from 8.4% to 7.2%" and watch it come back supported.
- [ ] **Sharing question, answered in the commit body:** `storyboard` is the only skill that grounds a takeaway, and it is not a producing skill, so the catalogue cannot reach it. State that; do not force a rule.

---

### Finding 2 — one thousands separator disarms verification of the story's central claim

`"1,234.5"` and `" 987.25 "` make the profiler type `price_eur` as `text`, so `min`/`max`/`sum` are `null`, so the article's own "forty times" comparison extracts NOTHING from the grounding check. A formatting imperfection becomes a silent blind spot.

**Files:** `skills/intake/scripts/profile.mjs`, its tests; the catalogue.

- [ ] Failing test first, from the frozen stress-a profile.
- [ ] A value that is a number a human wrote — thousands separators, surrounding spaces — is typed `number`, and the profile records HOW it was read. The existing `NUMERIC_RE` discipline stays: `Number()` is never trusted before a regex, and `0x1F` must still be `text`. Ambiguity that cannot be settled (`1,234` as one thousand two hundred or as a decimal comma) is typed `text` with the reason recorded, never guessed.
- [ ] Every column carries a `reason` when its type is `text` despite looking numeric — a profile that rejects a column silently is what made this invisible.
- [ ] Re-freeze a copy of the stress-a fixture (never the frozen story) and show `price_eur` typed `number`.
- [ ] **Sharing:** `valuesFromCsv` (map-beat) and the beats' own readers type values too. Declare a `guard` requiring the trait shared by every skill that reads a journalist's CSV, or state in the commit why the defect cannot reach them.

---

### Finding 3 — the BOM lands inside the column name

`"﻿country"`. A downstream skill selecting `country` finds nothing. `" price_eur "` keeps its spaces for the same reason: nothing normalises a header.

**Files:** `skills/intake/scripts/csv.mjs`, its tests.

- [ ] Failing test first: a BOM'd, space-padded header round-trips to clean names.
- [ ] Strip a leading BOM once, at the reader's mouth; trim header names; keep VALUES untouched (a leading space in a value is data).
- [ ] Mutation: reintroduce the BOM and watch the named red.

---

### Finding 4 — the pattern every beat copies parses CSV with `split(",")`

`proof/more-line-swiss-life-expectancy/render.mjs` — the worked example the skills point authors at — would silently corrupt `"1,234.5"` and `"Netherlands, the"`. Measured 2026-08-20: many `render.mjs` files under `proof/` split a real `.csv` by hand while `intake` ships a real RFC 4180 reader.

**Files:** the beats that read a CSV; the catalogue; `skills/splash/test/`.

- [ ] Failing test first: a walking test that finds every file which reads a `.csv` and splits it by hand, asserting the list is empty, with the real count in its comment.
- [ ] Fix the pattern beat first, then the others; each keeps its own copy of the reader (no cross-skill import), registered in `COPIES`.
- [ ] **Sharing:** this is a `guard` — the defect is reachable in every skill that reads a journalist's CSV. Declare it with the trait that names them, and let the derivation find the population.

---

### Finding 5 — an exact duplicate row is reported by nothing

It is only inferable by subtracting `distinct` from `rowCount`.

**Files:** `skills/intake/scripts/profile.mjs`, its tests.

- [ ] Failing test first, from the stress-a fixture (Spain appears twice).
- [ ] The profile records duplicated rows: how many, and which. Reporting, never removal — the journalist decides.

---

### Finding 6 — the join checks shapes without values, never values without shapes

`Atlantis`, a country that does not exist, carries a value through the whole join without a word. The join's own doctrine says a bad join "renders as no-data and looks legitimate"; the mirror case renders as nothing at all.

**Files:** `skills/map-beat/assets/geo.ts` and every copy; the catalogue.

- [ ] Failing test first: a value whose key matches no shape in the study set.
- [ ] `joinValues` throws on unmatched VALUES too, naming them, unless they are declared out of scope — symmetric with the existing throw, and never softened into a warning.
- [ ] **Sharing:** every skill that joins data to geometry. Declare it against the trait that names them.

---

### Finding 7 — `palette` has no unattended path

`readPalette` throws until a `PALETTE.md` exists, and nothing routes an agent from a craft skill to `palette`'s proposal. The refusal is correct; the dead end is not.

**Files:** `skills/palette/`, the craft skills' `SKILL.md`.

- [ ] The refusal names the exact next action, including the non-interactive one.
- [ ] Every craft skill whose render reads a palette says where the file comes from. **Sharing:** a `discipline`, declared against the trait every skill that reads a palette shares.

---

### Finding 8 — nothing challenges a framing that does not serve the point

Both stress beats are TRUE and neither FIGHTS. `vacant-homes` puts a 14% fall on a zero baseline, where it is nearly invisible — the picture does not show what its own title asserts. `energy-bills` lets a 40× outlier reduce six countries to stubs. This is the partner's "default render" complaint, mechanised.

**This one needs a decision before code.** Two candidate shapes, and the executor must NOT pick by whichever is easier:
1. A `guard` on the RENDERED geometry: the marks a takeaway names must differ by more than a stated fraction of the plot's own extent, or the beat says why.
2. A `discipline` in the doctrine: when the spread is small against the baseline, or one mark dwarfs the rest, the treatment is reconsidered before it is drawn.

- [ ] Measure first, across every delivered static beat: how many put their takeaway's own marks inside a few per cent of the plot height, and how many carry an outlier over 10× the median. **The measurement decides which shape is honest**, and it goes in the plan before any code.
- [ ] Ask the owner with the measurement in hand.

---

### Finding 9 — the harness's session trailer forced a history rewrite

A subagent stripping the injected `Claude-Session:` trailer used `git commit --amend`, which absorbed another agent's staged files and dropped their commit. Recovered; the cause stands.

- [ ] Prevent the trailer at its source rather than amending after it. Record the arrangement where the next session reads it.

---

## Self-review

**Coverage.** Nine findings, nine tasks. Four ask the sharing question and answer it in the catalogue (2, 4, 6, 7); two are local by construction and say so (1, 3, 5 — 3 and 5 live in the one reader every story passes through); one needs a measurement before its shape is chosen (8); one is environmental (9).

**The acceptance test is not a unit test.** Every task re-runs the three frozen stress stories and shows what changed in what they produce. A fix nobody can see in the output has not been demonstrated.

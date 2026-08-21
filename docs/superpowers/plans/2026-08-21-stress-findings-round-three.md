# Stress findings, round three — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Close the eleven defects the third stress test found — six beats across the whole grid, three cells never produced before — and, for every defect that can happen in more than one skill, close it as a **rule in the catalogue** so the derivation carries it everywhere its traits reach.

**The theme, and why one task is a redesign rather than a fix.** Three rounds have each patched one shape of the editorial check and left its neighbours open: round one taught it directions, round two taught it totality, and round three walked past it with a superlative, a partial period, a French decimal and a thousands separator. **A checker that recognises shapes will always be one shape behind.** Task A changes its contract instead.

**Source:** the round-three stress test — `stress-j-partial-year-permits`, `stress-k-flat-inspections`, `stress-l-mixed-unit-clinics`, `stress-m-forest-loss`, `stress-n-chomage-cantons`, `stress-o-museum-visits`.

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, watched failing.
- English only in code, comments and commits. A beat's own delivered TEXT may be in the story's language. No mention of any AI tool anywhere. **Never `git commit --amend`** in this tree.
- **No cross-skill runtime imports.** A decision reaching a second skill is COPIED and registered in `COPIES`.
- Edit through `Bash`, never Edit/Write.
- Every mechanism is **mutation-checked**, exact red message in the commit body.
- `owedRows()`/`unstatedRows()` empty at the end; an exception needs a MEASURED reason.
- **The six frozen stress stories are the acceptance test.**

---

### Task A — the editorial check stops pretending silence is confirmation (findings 1, 2, 3, 4)

Four findings, one cause.

- **A false comparative shipped through the whole chain.** An agent wrote *"Brazil lost more forest than the other six countries combined"* — false (1,120,000 vs 1,582,000 summed) — and nothing caught it; it was found by adding six numbers by hand.
- **A misleading headline came back `supported`.** *"Building permits collapse in 2026"* → the only claim extracted was the bare numeral `2026`, trivially inside the year column's range.
- **Superlatives without a numeral return `[]`** — *"Germany has the most"*, *"Brazil leads the annual figures again"* — not refuted, not unverifiable: unseen.
- **The number reader is naive.** `NUMBER_RE` splits `"14,205"` into `14` and `205`, and the French `"1,7"` into `1` and `7`; fragments then match column ranges **by coincidence** and report `supported`.

Three changes, in this order:

- [ ] **One number reader, shared.** `skills/intake/scripts/profile.mjs` already reads thousands separators and refuses ambiguity with a recorded reason. The grounding check must read numbers the same way. Copy the decision (never import across skills), register it in `COPIES`, and prove both skills agree on the same string.
- [ ] **Superlative and comparative shapes, computed against the data**: "the most", "the highest", "leads", "tops", "more than all the others combined", "more than any other". Each is decidable from a column's own values — a maximum, or a sum of the rest. Where it is decidable, decide it; where the sentence names an entity the profile cannot resolve to a row, return `unverifiable` **naming what it could not resolve**.
- [ ] **Coverage, so silence stops looking like confirmation.** `groundTakeaway` returns, beside its claims, how much of the takeaway it actually evaluated — the sentences it read and the sentences it could not. A takeaway whose every claim is unverifiable must be visibly different from one that was checked and passed. State the shape in the doc comment; a caller that ignores it is the next defect, so say who reads it.
- [ ] **Partial periods, narrowly and honestly.** A superlative or a comparison over a period is `unverifiable` when the frozen data carries a column marking that row incomplete (a coverage count like `months_covered`, or a completeness flag). Do not try to detect incompleteness in general — detect the column, name it, and refuse to confirm.
- [ ] Acceptance: run all four sentences above against their own frozen profiles and put the verdicts in the commit body. **Local to `storyboard`; the catalogue cannot reach it — say so.**

---

### Task B — the delegated producer's web branch is unguarded (findings 5, 6, 7)

- **The surface guard runs only on the static branch.** `format: "interactive"` returns before `assertExportedSurface` exists, so the white-on-dark mismatch that was refused on `stress-i` yesterday shipped silently on `stress-n` and was marked `local-complete`.
- **The newsroom's accent is ignored by the published embed.** `custom-colors` is sent and stored (`GET /v3/charts/1u88u` confirms it) and the bars render in Datawrapper's own blue.
- **`pageLanguageMatchesStory` exists and nothing calls it** in `produce.mjs`; the check happened only because an agent ran it by hand.

- [ ] Guard the web branch with the same decision the static branch carries, on whatever surface that branch actually owns — measure what is fetchable before choosing.
- [ ] The accent: establish live whether a delegated bar chart can carry it at all. If it cannot, that is a **provider limitation** and belongs beside the attribution one already recorded in this skill, stated in the delivered beat's own record rather than left as a surprise.
- [ ] Wire the language check into the producer, not only into a test.
- [ ] **Sharing:** ask whether each can happen in another skill, and declare what does.

---

### Task C — the profiler is blind to a column that is not one measure (finding 8)

`stress-l`'s `value` column mixes a COUNT (910–1880) and a RATE (17.2–21.9); a sibling `unit` column says which, and the profile ranged the whole column as one measure.

- [ ] When another column's values partition a numeric column into groups with different units, the profile says so: the measure is not one measure, and it names the column that says it. Reporting, never repair — and never guess a unit relationship that is not stated.

---

### Task D — three ergonomics defects (findings 9, 10, 11)

- **Nothing enforces a closed `STORYBOARD.md` before a craft skill renders.** The orchestrator refuses phase jumps; the craft skills do not, so a beat renders with no editorial gate behind it. Decide whether the craft skills should refuse, and if so declare it as a rule against the trait every producing skill shares.
- **Choropleth value labels collide and clip** — Germany's "1,880" against its own outline, the Benelux labels overlapping until nudged by hand. Fix it where the labels are placed, not per beat.
- **`verify-scrolly.mjs` does not resolve a relative CLI path** and reports `net::ERR_INVALID_URL` instead of naming the real problem.

---

## Self-review

**Coverage.** Eleven findings, four tasks. Task A is a redesign and says why; B, C and D are fixes. Two ask the sharing question and answer it in the catalogue (B, D); A and C are local to the one checker and the one profiler every story passes through.

**The acceptance test is the six frozen stories**, and Task A's is the four sentences that beat it.

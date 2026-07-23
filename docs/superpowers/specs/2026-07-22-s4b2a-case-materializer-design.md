# S4b-2a · Coverage-cell case materializer (recombine) — Design

> Sub-project **S4b-2a** of pillar S4 (Certification rigoureuse), AUDIT #2. The **autonomous, low-spend** half
> of S4b-2: turn the 66 covering-array cell-specs from S4b-1 into runnable harness cases by RECOMBINING the 105
> existing cases' fragments. Running those cases (spawning real actor+persona+judge `claude` processes) is
> **S4b-2b** — the spend event, gated on a measured pilot. Implementation in `../splash-harness` (branch
> `master`). Strategy decision (Rémy): **recombine existing fragments**, not synthesize from scratch.

## 0. Grounded facts

- S4b-1 emitted `coverage/covering-array-cells.json` — 66 cells, each `{family, channel, language, format, theme}`
  pinning real (non-sentinel) values (incl. `format=video`/`scrolly`, which the corpus never tests).
- A harness case = `cases/<slug>/` with `article.md`, `data.csv`, `persona.json` (`{angle, channel,
  formatPreference, constraints, answersPolicy, redLines}`), `expect.json` (`{expectFamily, expectFormat?,
  mustReachDeliverable, hint}`). Optional `newsroom-profile.md` fixture → the driver (`driver.ts:513`) copies it
  to the sandbox root as `NEWSROOM-PROFILE.md`, which splash's `loadNewsroomProfile` reads (this is how a THEME
  reaches the run).
- The harness runs a case by slug: `bun src/run-e2e.mjs <slug>`. A `cases/<slug>/` dir is picked up
  automatically.
- Cost driver (why S4b-2b is gated): `driver.ts` spawns a real `claude -p` per case — actor (full multi-turn
  Splash) + persona + judge. 66 cells × that = the monthly-limit scale.

## 1. Goal

`bun scripts/materialize-cells.mjs` — read `coverage/covering-array-cells.json`, and for each cell produce a
runnable `cases/gen-<slug>/` that faithfully targets the cell's 5 axes, by recombining a real source case's
fragments. Zero run-spend (the only per-case generation cost is a translation call when the target language has
no same-family source). Output: N new `cases/gen-*/` dirs + a `materialize-report.md` (which source each cell
recombined, which needed translation, which cells could not be materialized and why).

## 2. How each axis is hit by recombination

| Axis | How |
|---|---|
| **family** | Pick a SOURCE case whose `expect.json.expectFamily` == the cell's family (the content/data must fit the family). This is the anchor — the source's `article.md` + `data.csv` come from here. |
| **channel** | Set `persona.json.channel` to a canonical phrasing for the target channel ("web article" / "social vertical (Instagram/TikTok)" / "Instagram feed (square post)"). A channel is a delivery *request*, not article content. |
| **format** | Set `persona.json.formatPreference` to request the target format + `expect.json.expectFormat` = the format. A format (static/interactive/video/scrolly) is a *request* — an article can be asked as video without being "video content". This is how video/scrolly (absent from the corpus) are reached. |
| **language** | If a same-family source already exists in the target language, use it (no translation). Else TRANSLATE the source `article.md` (+ persona angle/redlines prose) to the target language — the one per-case LLM step. `data.csv` stays (numbers are language-neutral; column headers translated). |
| **theme** | `themed` → write a `newsroom-profile.md` into the case dir with a theme (e.g. `theme: dark` or a `themeBg` hex + a `palette`); `default` → omit the file. |

`expect.json.hint` is regenerated to describe the target (family+format). `mustReachDeliverable: true`.

## 3. Architecture

Three units:

### 3.1 `src/materialize/source-pick.ts`
`pickSource(cell, sourceCases): {slug, dir} | null` — choose the best source case for a cell: exact
`expectFamily` match preferred; among matches, prefer one ALREADY in the cell's target language (avoids
translation); deterministic tie-break (slug order) for reproducibility. Returns `null` if no case has the
target family (that cell is un-materializable by recombination — reported, not faked).

### 3.2 `src/materialize/recombine.ts`
`recombine(cell, source, translate): MaterializedCase` — pure assembly of the new case's files from the source +
the cell, using the §2 rules. `translate` is an injected function `(text, fromLang, toLang) => Promise<string>`
(so the pure recombination logic is testable with a stub translator; the real translator is a `claude -p` call,
wired only in the CLI). Produces `{ slug, files: { "article.md", "data.csv", "persona.json", "expect.json",
"newsroom-profile.md"? } }`. Slug = `gen-<family>-<channel>-<lang>-<format>-<theme>` (sanitized, deterministic).

### 3.3 `scripts/materialize-cells.mjs`
CLI: read the cells JSON + the source corpus, pick+recombine each, run the real translator when needed, WRITE
the `cases/gen-*/` dirs, and emit `materialize-report.md`. It does NOT run the cases (that is S4b-2b). The
generated `cases/gen-*/` are written under `cases/` so the harness picks them up by slug.

## 4. The translator (the only generation-spend in S4b-2a)

`translateArticle(text, fromLang, toLang)` — a single `claude -p` call per case that needs it (target language
≠ every available same-family source's language). Prompt: "translate this news article to <lang>, preserving
figures, names, and the journalistic register; do not add or remove facts." This is small (one short call per
translated case), NOT the actor+judge multi-turn cost of a RUN. Cases whose target language already has a
same-family source skip it entirely.

## 5. Testing

- **`pickSource`**: a cell whose family exists → returns a source of that family; prefers a same-language source
  when one exists; a cell whose family is absent from the corpus → `null` (reported, not faked).
- **`recombine`** (with a STUB translator): the produced `persona.json.channel` matches the target channel; the
  `expect.json.expectFormat` == target format; `newsroom-profile.md` present iff `theme==="themed"`; when target
  language ≠ source language, the stub translator IS invoked on the article; `data.csv` carried through.
- **Extract-axes round-trip** (the honesty check): feed each MATERIALIZED case back through S4b-1's `extractAxes`
  — the extracted axes must EQUAL the cell's target axes (family/channel/language/format/theme). This proves a
  materialized case actually hits its cell (a materializer that drifts is caught mechanically). This is the key
  test — it closes the loop between S4b-1's measurement and S4b-2a's generation.
- **CLI smoke** (no real translator, no fs pollution): the report builder lists sources + un-materializable cells.
- All bun:test. Full harness suite stays 0-fail.

## 6. Non-goals (deferred)

- **Running the materialized cases** — **S4b-2b** (spawns actor+persona+judge per case; the spend event; run a
  1-2 cell PILOT first to measure per-cell cost/time, then scale to the full set with an informed decision).
- Synthesizing cases from scratch (Rémy chose recombine).
- Adversarial mutations + freshness protocol (S4b-2b / later).
- Committing the generated `cases/gen-*/` to git by default — they are reproducible from the cells JSON +
  corpus; decide at implementation whether to git-ignore `cases/gen-*/` (like `coverage/`) or commit them.

## 7. Risks

- **Un-materializable cells** (target family absent, or a language with no same-family source AND translation
  refused) → reported honestly in `materialize-report.md`, never faked. The count of un-materializable cells is
  itself a finding (the corpus can't even seed some combos).
- **Translation drifts facts** → §4 prompt constrains it; §5 extract-axes round-trip doesn't check facts, so a
  human spot-check of a few translated cases is recommended before S4b-2b runs them (cheap, pre-spend).
- **A recombined case is unrealistic** (e.g. a video request grafted onto an article that reads oddly as video)
  → acceptable for a STRESS test (the point is to exercise the tool on combos it rarely sees); the pilot (S4b-2b)
  surfaces any case the tool genuinely can't handle, which is the signal we want.

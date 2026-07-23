# S4b-1 · Coverage analyzer + covering-array cell generator — Design

> Sub-project **S4b-1** of pillar S4 (Certification rigoureuse) of AUDIT #2 — the autonomous, zero-spend half of
> S4b (covering-array). Answers the audit's §6 claim — the 105-case cert matrix is "un re-run de matrice, pas un
> vrai stress-test" — WITH DATA (a pairwise-coverage report), and generates the minimal cell-spec list to fill
> the holes. Implementation in the harness repo `../splash-harness` (branch `master`). Running the generated
> cells is **S4b-2** (spend-gated, deferred).

## 0. Grounded facts (the design rests on these)

- A case = `cases/<slug>/` with `article.md` (105/105), `persona.json` (105/105, always has `channel`+`angle`+
  `formatPreference`), `expect.json` (105/105, `expectFamily` 83/105, `expectFormat` 8, `expectProducer` 9),
  `data.csv` (96/105). Language is structured on only 2/105.
- The tool's format constraint lives in `splash-merge/skills/splash/src/channel.ts`: `Channel =
  "social-vertical"|"social-feed"|"article-web"`, `VisualFormat = "static"|"interactive"|"video"|"scrolly"`,
  `CHANNELS[c].allowedFormats` — `article-web` = all 4; the two social channels are restricted
  (`interactiveDefault:false`). This is the pairwise constraint the covering array must respect.
- `expectFamily` corpus values (as-is): trend, spatial, comparison, change-over-time, correlation, ranking,
  magnitude, distribution, part-to-whole, geographic, map-native, geo-point-magnitude, flow, evolution,
  deviation, composition (16 values; a messy taxonomy with synonyms). Used AS-IS (synonym-merging is a noted
  non-goal — the analyzer reports the corpus's real taxonomy, warts included).
- `persona.channel` is free-text and heavily clustered: 65/105 "web article", handful social, incl. German
  "Website (Artikel-Embed)".

## 1. Goal

A standalone CLI that, over the 105 cases, (a) extracts/infers each case's axes, (b) computes pairwise
coverage against the valid combinatorial space (constraint = the tool's `allowedFormats`), and (c) generates a
constraint-aware pairwise covering array → the minimal cell-spec list to fill the uncovered pairs. Output: a
human coverage report + a machine cell-spec JSON. **No actor, no judge, no spend.**

## 2. Axes (the combinatorial space)

Five axes, each with an explicit domain + an extraction rule. Honesty: where neither structured nor reliably
inferrable, a sentinel value (`"unknown"`/`"unpinned"`) is used AND counted separately — the report says how
much of the corpus is un-pinnable, never fabricates an axis value.

| Axis | Domain | Extraction |
|---|---|---|
| `family` | the 16 corpus `expectFamily` values + `"unknown"` | `expect.json.expectFamily`; `"unknown"` if absent |
| `channel` | `social-vertical`, `social-feed`, `article-web`, `"unknown"` | normalize `persona.json.channel` free-text (§3.1) |
| `language` | `fr`, `de`, `it`, `en`, `"unknown"` | infer from `article.md` (§3.2) |
| `format` | `static`, `interactive`, `video`, `scrolly`, `"unpinned"` | `expect.json.expectFormat`; `"unpinned"` if absent |
| `theme` | `default`, `themed` | `themed` if the case sets a newsroom theme/brand (persona/profile mentions `theme`/`brandHue`/`themeBg`/`palette`), else `default` |

`persona-style` and `producer` are **non-goals** (persona-style has no structured signal; `producer` is
derivable from family+format at run time, and is 9/105 — too sparse to be an independent axis).

## 3. Extraction detail

### 3.1 Channel normalizer (`src/coverage/axes.ts`)

Pure `normalizeChannel(freeText: string): Channel | "unknown"`, lower-cased substring rules, first match wins:
- contains `social` AND (`vertical`|`instagram`|`tiktok`|`story`|`full-screen mobile`) → `social-vertical`
- contains `social` AND (`feed`|`horizontal`) → `social-feed`
- contains `social` (no vertical/feed qualifier) AND `video` → `social-vertical` (a bare "social video" is vertical by the tool's default)
- contains `web`|`article`|`embed`|`website`|`artikel`|`long-form`|`scrolly` → `article-web`
- else → `"unknown"`

A test pins the normalizer against the real corpus's distinct channel strings (from §0) so a new phrasing that
falls through to `"unknown"` is visible.

### 3.2 Language detector (`src/coverage/lang.ts`)

Pure `detectLanguage(articleText: string): "fr"|"de"|"it"|"en"|"unknown"` — a lightweight stopword-frequency
heuristic (NO dependency). Count occurrences of a small per-language stopword set over the article's first ~2000
chars: fr `{le,la,les,des,une,est,que,dans,pour}`, de `{der,die,das,und,nicht,mit,ist,auch,werden}`, it
`{il,la,di,che,non,per,con,sono,anche}`, en `{the,and,of,to,in,that,with,for,is}`. Pick the max; if the top
score is below a small floor or ties, return `"unknown"`. It's a heuristic — the report flags language as
inferred, and `"unknown"` is honest, not forced.

## 4. Coverage computation (`src/coverage/coverage.ts`)

- `extractAllAxes(casesDir): CaseAxes[]` — one `{slug, family, channel, language, format, theme}` per case.
- `axisDomains(cases): Record<Axis, string[]>` — the observed value set per axis (incl. sentinels), plus the
  full canonical domains (so a value present in the canonical domain but absent from the corpus is a hole, not
  invisible).
- `pairwiseCoverage(cases, constraint)` — for every unordered axis-pair (10 pairs over 5 axes) and every
  value-combo that is VALID under the constraint (§5), count covering cases. Output: `{ pairsTotal, pairsCovered,
  pct, holes: Array<{axisA, valA, axisB, valB}>, clusters: topN over-covered combos }`. Sentinel values
  (`unknown`/`unpinned`) are counted but reported in a separate "un-pinnable" tally — they are NOT treated as a
  covered "real" combo.

## 5. Constraint (`src/coverage/constraint.ts`)

A small table `CHANNEL_FORMAT_ALLOWED: Record<Channel, VisualFormat[]>` that **mirrors
`channel.ts`'s `CHANNELS[c].allowedFormats` exactly** (re-encoded, not cross-repo-imported, so the analyzer runs
standalone with no dependency on a resolved splash-repo path). `isPairValid(axisA, valA, axisB, valB)`: the only
constraint today is channel×format — a `(channel, format)` combo is valid iff `format ∈
CHANNEL_FORMAT_ALLOWED[channel]` (sentinels are always "valid" for counting but flagged un-pinnable). All other
axis pairs are unconstrained. **A test locks the table** to the known rules (article-web = all 4; social-* =
their restricted sets) with a comment pointing at `channel.ts` as the source of truth — if the tool's rules
change, the test is the tripwire prompting a manual re-sync.

## 6. Covering-array generator (`src/coverage/covering-array.ts`)

`generatePairwiseArray(domains, constraint): Cell[]` — an IPOG-style greedy pairwise generator: seed with the
axis of largest domain, extend one axis at a time, each new row greedily covering the most still-uncovered valid
pairs; skip any row violating the constraint. `Cell = Record<Axis, string>` (concrete values, no sentinels — a
generated target cell pins every axis). Then `cellsToFillHoles(existingCases, array): Cell[]` — the subset of
the covering array covering pairs NOT already covered by the corpus (the actual to-ADD list). Correctness
property (tested): the union of (existing coverage ∪ generated cells) covers every valid pair.

## 7. Output (`scripts/coverage.mjs`)

A runnable CLI (`bun scripts/coverage.mjs`, standalone — reads `cases/`, writes to a `coverage/` dir):
- `coverage-report.md` — human: pairwise-coverage % , the per-axis value distribution (showing the clustering,
  e.g. "channel: 89% article-web"), the un-pinnable tally (e.g. "family unknown: 22/105; language inferred"),
  and the top holes.
- `covering-array-cells.json` — machine: the `cellsToFillHoles` list (the cell-specs S4b-2 will materialize +
  run), each cell = the 5 pinned axis values, with a note that materialization/running is deferred.

## 8. Testing

- **Channel normalizer**: the real corpus's distinct channel strings (§0) map to the expected canonical value;
  an unrecognized string → `"unknown"`.
- **Language detector**: a FR / DE / IT / EN article snippet each → the right code; gibberish/too-short → `"unknown"`.
- **Extractor**: a case with full metadata → correct axes; a metadata-sparse case → the right sentinels.
- **Coverage**: a tiny synthetic corpus with ONE deliberately-missing valid pair → that pair appears in `holes`
  and nowhere else; a fully-covered synthetic corpus → `holes` empty.
- **Constraint table lock**: `CHANNEL_FORMAT_ALLOWED` equals the known rules (article-web = 4 formats; social-*
  = their sets); `isPairValid("channel","social-vertical","format","interactive")` is false.
- **Covering-array correctness**: for a small domain set, the generated array covers every valid pair (compute
  the pair set independently and assert full coverage); no generated cell violates the constraint.
- All bun:test. The full harness suite stays 0-fail (currently 397/0; new tests add to the count).

## 9. Non-goals (deferred / excluded)

- **Materializing cell-specs into runnable cases + running them through the actor/judge** — **S4b-2**, spend-gated.
- **Adversarial mutations + freshness protocol** — S4b-2.
- **Synonym-merging the `expectFamily` taxonomy** — the analyzer reports the corpus's real taxonomy; cleaning it
  is a separate corpus-hygiene task.
- **persona-style / producer axes** — no reliable structured signal / too sparse (§2).
- **Changing any case or the splash tool** — S4b-1 only READS the corpus + reports.

## 10. Risks

- **Language heuristic mislabels** (short/multilingual article) → returns `"unknown"` on low confidence (honest);
  the report marks language inferred. Not load-bearing for the coverage %; a wrong lang label at worst mis-bins
  one case.
- **Constraint table drifts from `channel.ts`** → §5 lock test is the tripwire; the comment names the source of
  truth. (A future S4 step could import it directly if the harness gains a stable splash-repo path.)
- **Family taxonomy noise** (16 semi-synonymous values) inflates the "holes" (many family values × few cases) →
  the report presents coverage RAW (no synonym-merging — §9 non-goal) and, when the raw holes are dominated by
  taxonomy noise, states that explicitly as the finding ("the corpus's family taxonomy is inconsistent — N
  semi-synonymous values"). Surfaced, not hidden, and not silently cleaned.

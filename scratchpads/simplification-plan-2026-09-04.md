# Splash: simplification plan for #57–#65

Written 2026-09-04 after a whole-tree read. Every claim below was checked against the tree on that
date; line numbers are from main at `kswosvkm` (986c2fd8). Run this in a fresh session, top to
bottom. Batches are sized so that `bun test` runs once per batch, and one commit closes each batch.

House rules that apply throughout (from Tom, verbatim in spirit):

- Lean towards simplification. Prefer deleting a question, a field or a gate to adding one.
- Do not run the full suite after every edit. Run the files the change touches; `bun test` once per batch.
- Do not commit per issue. Batch 2–3 issues, full suite, then commit (jj, colocated; git is read-only).
- Never fabricate a record to satisfy a required field.
- `landing/` belongs to Tom. Do not touch it.
- Close each issue with what was actually done, and why where less was done than asked.

---

## Part A — what the tree looks like, and what is over-built

### A1. What is load-bearing and must not be thinned

These are the deterministic input-to-output checks the newsroom depends on. Nothing in this plan
weakens them.

- `skills/storyboard/scripts/ground-claim.mjs` (4,017 lines) and its seven tests. This is the
  "does the takeaway match the frozen data" check. Big, but every consumer is real
  (`propose.mjs`, `storyboard.mjs`, `claims-grounded-in-data.test.ts`).
- The rendered-artifact tests in `skills/splash/test/` (18 files, ~7,600 lines: `video-handover-is-a-cut`,
  `interaction-promises-are-kept`, `annotation-reads-over-what-it-crosses`, `delivered-size-matches-the-pin`,
  `web-annotation-clears-its-marks`, and so on). They render `proof/` pages and measure pixels and DOM.
  They found #52, #53, #55. They are the heavy lane, and they stay.
- `where.mjs`'s state machine (phase resolution, beat/export digests, review binding, reservations —
  lines 689–1351). Widest consumer set in the repo.
- `matrix.mjs`, `type-survey.mjs`, `visual-catalog.mjs`: generated documents with real runtime readers.
- `no-cross-skill-imports.test.ts`: the constraint that makes a skill directory copy-pasteable. Real.
- `size-table-parity.test.ts`: the model for how carried copies should be checked. Real.

### A2. The over-engineering, ranked by how much it produces bugs

1. **Two hand-written gate readers (#62).** Proven divergent today, not just at risk. A storyboard
   with `claimShape: maximum` and no `claimColumn`, `destination: print` on a `format: web` slot, and
   `assembles: [chart]` on that slot is refused four ways by `checkStoryboard` and reported
   `production / ready` by `whereIs` (script: `scratchpad/diverge.mjs`, run 2026-09-04). `where.mjs`
   contains zero mentions of `destination`, `assembles` or `claimShape`. Its `sizeGapFor` takes a
   scalar where storyboard's `sizeGap` takes a list, so the "recorded twice" refusal has no twin.
   Its `producerGapFor` words one refusal differently from `producer-gate.mjs` ("does not implement
   the selected treatment" vs "does not implement <treatment>"). The comment in `storyboard.mjs:14-24`
   saying the divergence class was "closed by construction" is not true of the tree.
   There is also a **third** reader: `skills/analyst/scripts/*` carries `parseStoryboardForAnalyst`,
   compared semantically to `parseStoryboard` by `analyst/test/parity.test.ts:31-69`.
2. **Parity tests that patch each other.** 12 files carry "parity" in the name. Four exist to close a
   hole in another's roster (`render-still-parity` because `helper-parity` hard-codes; `bake-parity`
   because `render-still-parity` only matches one basename; `geo-parity` because `helper-parity`
   missed 18 files). Meanwhile 9 of the 16 byte-identical file groups in the tree are guarded by
   nothing at all (`header.mjs`, `type-at-size.mjs`, `verify-guards.mjs`, `check-delivered-guards.mjs`,
   `inline-asset.mjs`, `trait-witness.mjs`, `splash-root.mjs`, the four `TYPEFACE.md`, and the
   root-template copy of `timing.ts`). The pattern is right (carry verbatim, byte-compare) and the
   walker is missing.
3. **The guard catalogue machinery.** `GUARDS.md` documents exactly one rule (`weight-has-a-ceiling`).
   Generating and defending it costs 718 lines of root scripts (`guards.mjs`, `guard-model.mjs`,
   `guard-runtime.mjs`, `traits.mjs`) plus 1,047 lines of doctrine tests, ~1,800 lines total. Nothing
   reads `GUARDS.md`. The *runtime* enforcement of the rule is separate and stays: each of
   `image-beat`, `map-beat`, `map-web`, `scrolly` carries `verify-guards.mjs` +
   `check-delivered-guards.mjs`, which import nothing from the root scripts (checked:
   `map-beat/scripts/check-delivered-guards.mjs:1-19`).
4. **Drift asserted twice.** `matrix:check`, `catalog:check` and `landing:check` each run as a
   package script in CI *and* as a test (`matrix-is-current`, `format-shippability` /
   `storyboard/test/visual-catalog.test.ts`, `landing-matches-the-catalogue`).
5. **Code with no consumer.** `skills/splash/scripts/new-story.mjs` (110 lines; only caller is its own
   130-line test; not in SKILL.md). `scripts/open-live-copy.mjs` (116 lines; mentioned only in the
   PRD). `skills/dw-chart/` is an empty directory; `keys.mjs:5` and `bake-plate.mjs:132` describe it
   and a `skills/map-native` that also does not exist.
6. **Comments describing files that do not exist.** `storyboard.mjs:51` and
   `credit-vocabulary.test.ts:15` cite `palette/scripts/typeface.mjs` as "landed this same round";
   there is no such file. `storyboard.mjs:91-93` says `isUnattributedCredit` is walked by
   `splash/test/guard-copies-parity.test.ts`; no such test exists. `exchange.md:438,445` calls
   `proposeTypeface` / `writeTypeface`; neither exists anywhere, and three STORYBOARD.md files claim
   they were run. This is #57's actual state: the typeface *proposal* was written into the doctrine
   and never into code.
7. **The catalogue disagrees with the gate.** `visual-catalog.json` gives `image/static`
   `sizeRule: {kind: "required", options: [...]}` while `sizeGap` refuses any size for an image beat.
   `proposeSizes(format)` in `propose.mjs:879` takes no medium, so it offers three sizes the gate
   then refuses. This is #58's actual state.
8. **A recorded field nobody reads.** `destination` (`screen | print`) is asked at G2c for static
   beats, validated by `destinationGap`, and read by no downstream code: the only "destination" hits
   in `deliver/` are path-replacement comments. This is #59's actual state.

### A3. Corrections to things the issues assume

- #65 says `ranking-walk-ratchet.test.ts` pins the sixteen `intent: unrecorded` stories. That file is
  **not on main**. It exists only in the dangling commit `ttpvwmzu`, and there it pins a field named
  `rankingWalk`, which main does not have. On main, nothing stops a new story writing
  `intent: unrecorded` to pass the gate.
- 16 of 30 `stories/` carry a STORYBOARD.md; 2 carry `beats/` and `export/`. Most are intake-only fixtures.
- `analyst/test/parity.test.ts` does byte-compare `profile.mjs` and `csv.mjs` across intake/analyst.
  `header.mjs` is the one it misses.

---

## Part B — the work, in batches

### Batch 1 — #62 (gate contract carried, not re-implemented) + #63 (test lanes)

Do #62 first; #63 second so the rest of the session runs on the fast lane.

#### #62 steps

1. **Create `skills/storyboard/scripts/gate-contract.mjs`**, pure and dependency-free except for
   `./producer-gate.mjs` (which needs `../references/datawrapper-chart-types.json`). Move into it,
   verbatim, from `storyboard.mjs`:
   `HAND`, `REQUIRED_SCALARS`, `REQUIRED_SLOT_FIELDS`, `EXPORT_SIZES`, `SIZED_FORMATS`, `sizeGap`,
   `PUBLICATION_DESTINATIONS`, `DESTINED_FORMATS`, `destinationGap` (see #59: this may be deleted
   instead), `ASSEMBLING_FORMATS`, `assemblyGap`, `recorded`, `GROUNDING_VERDICTS`, `OVERRIDE_RE`,
   `isResolvedGrounding`, `SCALAR_GAP`, `LANGUAGE_TAG`, `isLanguageTag`, `SCALAR_VOCABULARY`,
   `SCALAR_VOCABULARY_GAP`, `SLOT_SUB_GATE`, `UNRECORDED`, `SLOT_VOCABULARY`, `slotGap`,
   `isNullSentinel`, `splitArrayItems`, `scalar`, `parseStoryboard` and its helpers
   (`documentParts`, `linesWithEndings`, `slotBlocks`, `fieldInBlock`, `canonicalizeLegacyFormatKeys`),
   `recordedClaimGaps`, `recordedClaimOf`, `checkStoryboard`, and the `surveyGap` **sentence** as an
   exported constant `SURVEY_GAP` (the file read stays in each reader).
   Also move `RECORDED_CLAIM_SHAPES` out of `ground-claim.mjs` into the contract and have
   `ground-claim.mjs` import it, so the contract does not depend on the 4,000-line grounder.
2. **Move `orderedStoryboardGate` (where.mjs:643-687) into the contract as `openGate(meta)`.**
   Today "which gate is open next" exists only in `where.mjs`; it belongs beside the rule it orders.
   Rewrite it over parsed `meta` slots rather than raw frontmatter.
3. `storyboard.mjs` re-exports everything it used to export from `./gate-contract.mjs`. No caller of
   `storyboard.mjs` changes (propose.mjs, the storyboard tests, deliver, analyst).
4. **Carry the contract into splash.** Copy `gate-contract.mjs`, `producer-gate.mjs` and
   `references/datawrapper-chart-types.json` into `skills/splash/scripts/` (json beside them, path
   adjusted in the copy's import — see the marker rule in step 7 for how a one-line difference is
   allowed). `where.mjs` imports its own copy and **deletes** lines 136–157 (`surveyGap` body keeps
   the fs read, uses `SURVEY_GAP`), 181–223 (frontmatter helpers, replaced by `parseStoryboard`),
   225–483 (every carried constant and function), 487–687 (`splitArrayItems`, `scalarValue`,
   `parseSlotsForGate`, `missingForGate2`, `orderedStoryboardGate`). `resolveStoryState` calls
   `parseStoryboard(text)`, `checkStoryboard(meta)` and `openGate(meta)`.
   Expected: where.mjs from 1,351 to roughly 800 lines.
   **Wording:** one wording, storyboard's (it names the gate that never closed). where.mjs's
   "read aloud to somebody resuming" phrasings (`a confirmed takeaway`, `no medium was ever chosen`)
   go. Update `where.test.ts`, `phases.test.ts`, `orchestration-conformance.test.ts` expectations
   accordingly. Check `skills/splash/SKILL.md:196-199` table (it cites `HAND.length` mirroring).
5. **Carry the contract into analyst.** `analyst/scripts/` gets the same three files;
   `parseStoryboardForAnalyst` and any refusal in `build-data.mjs` that re-states a gate rule
   (the `reference` refusal that was missed in #40 is the precedent) are replaced by imports from
   the carried copy. Then delete the semantic half of `analyst/test/parity.test.ts:31-69`.
6. **Carry `capability-gap.mjs` into splash** and have `preflight.mjs` import it; delete
   `storyboard/test/capability-gap-parity.test.ts` (99 lines). Same defect shape, same fix.
7. **One walker for all carried copies: `skills/splash/test/carried-copies.test.ts`.**
   Rule: a carried file's **first line** is
   `// CARRIED VERBATIM from skills/<skill>/<path> — edit the canonical, then copy.`
   The walker finds every source file (`.mjs .ts .tsx .json .md`) under `skills/` and `shared/` whose
   first line matches, resolves the canonical path, and asserts bytes from line 2 onward equal the
   canonical's whole content (the `filter-vocabulary-parity.test.ts:62-68` line-1 exclusion, generalised).
   It also asserts every canonical named by a marker exists (a renamed canonical reddens, not silences)
   and that the run found more than N copies (no vacuous green). No hard-coded list anywhere.
   Add the marker to every byte-identical copy in the tree, including the nine unguarded groups
   listed in A2.2. For the three `sizes.mjs` variants that differ on purpose, do **not** mark them;
   `size-table-parity.test.ts` stays as is.
8. **Retire, with the walker in place:**
   - `where.test.ts` blocks `1079–1300` (gate-2 agreement, size string-for-string, intent agreement,
     survey wording): the two readers now share one function, so agreement is a tautology. Keep the
     whereIs state-machine tests above line 1079. Keep one fixture per gate that asserts `whereIs`
     reports the gate `openGate` names.
   - `annotation-ink-parity.test.ts` (byte walk of one basename; the marker walker subsumes it).
   - `root-template-shared.test.ts` byte halves (lines 32, 51, 80, 114, 136); keep the one `#shared`
     specifier check at line 60 if it still has a subject.
   - `analyst/test/parity.test.ts` entirely (byte half subsumed, semantic half deleted in step 5).
   - `filter-vocabulary-parity.test.ts:62-68` byte block; the ~35 behavioural tests below it test
     one module's behaviour and can stay as `chart-web/test/filter.test.ts`, run against one copy.
   - `capability-gap-parity.test.ts` (step 6).
   - `helper-parity.test.ts` (419 lines, the hard-coded list whose hole spawned two other tests):
     verify each function it names is covered by `render-still-parity` or the marker walker, then
     delete. If one is not covered, add it to render-still-parity's family rather than keep the list.
   Leave in place (they compare near-duplicates that are *not* carried verbatim, and converting those
   is a separate, larger job): `render-still-parity`, `bake-parity`, `video-helper-parity`,
   `geo-parity`, `hoverable-line-parity`, `size-table-parity`.
9. Fix the stale comments from A2.6 while in these files (`storyboard.mjs:51,91-93`,
   `credit-vocabulary.test.ts:15`). Delete the empty `skills/dw-chart/` and correct `keys.mjs:5`,
   `bake-plate.mjs:132`.
10. Update `AGENTS.md` "Keep skills self-contained" paragraph: the pattern is *carry verbatim with a
    marker line, guarded by `carried-copies.test.ts`*; re-implementation is not the pattern.

Verification for #62: re-run `scratchpad/diverge.mjs` (both readers must now refuse the same four
lines); `bun test skills/storyboard/test skills/splash/test/where.test.ts skills/splash/test/phases.test.ts skills/analyst/test skills/splash/test/carried-copies.test.ts`.

#### #63 steps

CI already hand-lists a "secretless contract" lane in `.github/workflows/ci.yml:31-45`. That list
is the hard-coded roster the issue argues against. Replace it with a derived one.

1. `scripts/test-lanes.mjs`: walk every `*.test.ts`; a file is **heavy** if it, or any repo module it
   imports (transitively, relative imports only), references `puppeteer`, `puppeteer-core`,
   `@puppeteer/browsers`, `remotion`, `@remotion/`, `@resvg/resvg-js`, `maplibre-gl`, or spawns a
   render script (`render-*.mjs`, `bake*.mjs`, `verify-*.mjs`) via `child_process`/`Bun.spawn`.
   `.live.test.ts` is its own lane (credential-gated) and never in fast. `--fast` / `--heavy` /
   `--live` print the file list; `--check` refuses if any test file matches no lane.
2. `package.json`: `test` = `bun test $(bun scripts/test-lanes.mjs --fast)`; `test:heavy`; `test:all`
   = `bun test`. (Bun accepts a list of paths.)
3. `ci.yml`: the secretless job runs `bun run test` and then `bun run test:heavy` as a separate
   step, so a fast failure is visible in seconds. Delete the hand list.
4. `AGENTS.md` Verification section: name the two lanes and the rule ("run `bun run test` while
   iterating; `bun run test:heavy` before a commit").
5. Measured baseline (fill in from the timing run):

   | lane | files | tests | wall time |
   |---|---|---|---|
   | fast | 140 | 2,653 | 6.2 s |
   | heavy | 50 | ~1,150 | ~275 s |
   | full | 190 | 3,803 (3,797 pass, 6 env-skipped, 0 fail) | 278.8 s |

   Measured 2026-09-04 on main. Two files are 64% of the suite: `scrolly/test/scroll-integrity`
   (127 s) and `splash/test/interaction-promises-are-kept` (51 s). Slowest-file table in the appendix.
   Two files are slow without any static tell (`seed-renders-standalone` 10.5 s, `panel-grounding`
   1.4 s): the walker should also accept an explicit `// LANE: heavy` first-line marker for those,
   and `--check` should list any fast-lane file that took over 2 s in the last run.

Batch 1 close: `bun test` once, commit "gate contract carried, not re-implemented; test lanes derived".

---

### Batch 2 — #64 (annotation report can never fail) + #65 (the unrecorded-intent pin) + #59 (print)

#### #64

Option 2 from the issue, because the detector is a 1/25-sample-point approximation and the two pages
are committed fixtures: pin the exact allowed set and fail on anything outside it.

1. In `web-annotation-clears-its-marks.test.ts`, replace the `[reported, not failed]` branch with an
   `ACCEPTED` map keyed by `"<proof path> @ <width>: <annotation text>"` holding exactly the four
   standing findings. Any finding not in the map fails naming itself; any entry in the map that is no
   longer found also fails (so a fixed page strikes its pin). Header gains one sentence: the detector
   samples 25 points and is approximate, which is why the set is pinned rather than the pages fixed.
2. Do not re-render the two proof pages. That is a separate editorial decision on committed evidence.

#### #65

1. Restore the pin on main, adapted to `intent`: `skills/splash/test/unrecorded-intent-is-counted.test.ts`
   (~40 lines, fast lane). `CARRYING` names the 16 stories with counts (regex
   `^\s+intent:\s*unrecorded\s*$`). Reddens on a story not in the map, and on a pinned story whose
   count fell (strike it). The gate itself keeps accepting the word; the pin is what stops it
   being an escape hatch. Take the file from `ttpvwmzu` and change the field name; do not adopt the
   rest of that commit.
2. **Do not pay any of the 16 down in this session.** The issue's own text says the intents cannot
   be reconstructed; writing one from the recorded takeaway is the after-the-fact justification the
   field exists to prevent. If Tom wants specific stories re-walked (the issue names
   `heat-pump-adoption-across-europe` as live reference material), that is a journalist's edit, made
   one story at a time, and the pin is struck as each lands.
3. Close #65 stating: pin restored on main (it was only in a dangling commit, against a field that
   no longer exists); debt stays at 16; the only way down is a real re-walk.

#### #59

Decide **no**, and delete the question rather than document it.

1. `destination` is recorded by G2c for static beats, validated by `destinationGap`, and read by no
   producer or deliverer. A field nothing reads is the #55 defect. Delete: `PUBLICATION_DESTINATIONS`,
   `DESTINED_FORMATS`, `destinationGap`, the reopen-on-format-change rule (`storyboard.mjs:942-951`),
   `formatPublicationDestinationGate` and `DESTINATION_COPY` in `format-gate.mjs:214-247`, the
   `exchange.md:349-377` paragraph, the `publication-destination.test.ts` and
   `destination-follows-the-format.test.ts` files. Leave existing `destination:` lines in the six
   frozen stories; the parser ignores unknown slot keys (confirm; if it refuses, strip the lines).
2. Where the question was asked, write one sentence in `exchange.md` movement ⑦ and in
   `sizes.mjs`'s header: every export is a screen artefact at one of three sizes; a printed edition
   re-lays it out downstream; there is no print row. Rename gate 2b's "Static / print" label to
   "Static" in `format-gate.mjs:8-9` so the slash stops asking a question nothing answers.
3. Close #59 as "no, and the destination field is gone with it"; note #1's print ask is answered as
   "produced at a screen size".

If Tom would rather keep `destination` as a recorded fact for a future print path, do step 2 only and
say so in the close. Recommendation is deletion.

Batch 2 close: `bun test`, commit.

---

### Batch 3 — #58 (image beats at gate 2c) + #60 (ramp ownership) + #57 (typeface)

#### #58

Decide **option 3**: the width is a house constant, chosen on purpose, and the catalogue must say so.

1. `catalog/visual-catalog.json` (and the generated storyboard derivative via `bun run catalog`):
   `image/static.sizeRule` becomes `{kind: "none", reason: "height follows the captions; width is the
   house column, image-beat FRAME_WIDTH"}`. Then `sizeGap`'s `medium === "image"` special case can
   be replaced by reading the catalogue's rule (`FORMAT_CATALOG[pair].sizeRule.kind`), which removes
   the medium check from the gate and makes `size-table-parity`'s roster derive from the same fact
   with no `medium !== "image"` clause. One source for "is this pair sized".
2. `proposeSizes(format)` → `proposeSizes(medium, format)`, reading the same rule, so a photo essay
   is never offered three sizes the gate refuses.
3. `ImageBeatSeed.tsx:48`: comment above `FRAME_WIDTH = 900` stating it is the house article column
   and the one place it is decided. No new row, no new field.

#### #60

Name the owner without adding a question. The ramp is a *derivation* of the recorded palette, not a
second choice:

1. `skills/palette/SKILL.md:52-55` currently says the skill is not for sequential scales and stops.
   Add the sentence that follows from the code: a choropleth's ramp is derived from `PALETTE.md`'s
   `accent` on its `ground` by the map craft skill's own `geo.ts` (`sequentialRamp`, `dataRampEnd`),
   and measured at render by `assertRampReads` (neighbours ≥ 0.02 luminance apart, top class ≥ 3:1).
   The journalist's decision is the accent; the ramp has no separate provenance because it has no
   separate choice.
2. Class count and break method are about the data, and analyst already owns them:
   `analyst/scripts/profile.mjs:1385-1435` (`classBreaksOf`) proposes quantile breaks and says the
   journalist decides what the classes mean. Cite that in the palette sentence. Do not add a field.
3. `map-web` has no ramp at all (its seed is proportional-symbol; `map-web/SKILL.md:49-51` names the
   choropleth web beat as the next to write). When it is written it carries `geo.ts`'s ramp
   functions under the `@parity` tag that `geo-parity.test.ts` already walks. Nothing to do now.
4. Close #60: owner named (map craft skill's geo core, derived from PALETTE.md, measured at render);
   no ramp skill, no ramp gate.

#### #57

The proposal side was written into the doctrine and never into code (A2.6). Build the smallest
thing that matches the palette pattern, and delete the fiction.

1. `skills/palette/scripts/typeface.mjs` (the file two comments already claim exists):
   `typefaceDecision({ newsroom, resolves })` → `{ ask: false, typeface: { family, origin: "newsroom" } }`
   when the first recorded face in `NEWSROOM.md.typefaces` resolves on this machine, else
   `{ ask: true, reason, proposal }` listing each recorded face with `present | absent` and the
   nearest available stack. `resolves(family)` is injected: the probe-string measurement already
   exists in every `render-still.mjs` (`useTypeface`), so palette calls the same check rather than
   carrying a second one. `formatTypeface({ family, origin })` writes the `TYPEFACE.md` front matter
   the seeds already read (`readTypeface` / `parseTypeface`, `render-still.mjs:422-499`).
2. `exchange.md` movement ⑨: replace the `proposeTypeface` / `writeTypeface` calls with
   `typefaceDecision` / `formatTypeface`; ask only when `ask: true`. Record once per story, into the
   story's `TYPEFACE.md`, beside `PALETTE.md`.
3. Do **not** add a typeface field to `REQUIRED_SLOT_FIELDS` or a G2 sub-gate. The read side already
   refuses at render; the proposal side now exists so the refusal stops being the first anybody hears
   of it. Same shape as #41's palette default.
4. The three STORYBOARD.md files that say `proposeTypeface` was run
   (`stress-x-tunisian-water:120`, `r8-chart-static-german-road-deaths-by-mode:128`,
   `stress-ad-polish-hospital-beds:152`) recorded a call that did not exist. Leave the story records
   alone (they are frozen evidence) and say so in the close.
5. Test: `skills/palette/test/typeface.test.ts`, fast lane, with a stubbed `resolves`.

Batch 3 close: `bun test`, commit.

---

### Batch 4 — #61 (article structure) — last, and optional

Smallest form that gives movement ③ real positions:

1. At freeze, `intake/scripts/freeze.mjs` derives a section index from the article's markdown
   headings (`^#{1,6} `) and records it on the manifest's prose entry:
   `{ id: "article", kind: "prose", digest, sections: [{ id, heading, line }] }`. Nothing about
   `article.md` changes; the index is derived, so a re-freeze reproduces it.
2. Movement ③ offers the headings as positions. `placement` stays the prose HAND field; no slot field
   is added. The "which section does this follow" check the issue suggests is not built: it would
   be a new required field, and the house rule is to delete those, not add them.
3. Leave the 20-section concatenation case alone; with a heading index, one file with headings is
   enough structure.

If the session runs short, close #61 with the note that the index is a one-function addition to
`freeze.mjs` and where it goes.

---

## Part C — deletions outside the issues (do only if Batch 1–3 land first)

Each is a pure deletion or a stale-reference fix. Take them in one commit, "delete what nothing reads".

1. **Guard catalogue machinery** (A2.3): delete `scripts/guards.mjs`, `guard-model.mjs`,
   `guard-runtime.mjs`, `traits.mjs`, `GUARDS.md`, `skills/doctrine/references/guard-catalogue.json`,
   the six `skills/doctrine/test/guard-*.test.ts` + `traits.test.ts`, the `guards` / `guards:check`
   package scripts and the CI step. Runtime enforcement (`verify-guards.mjs`,
   `check-delivered-guards.mjs`, `trait-witness.mjs` in the four skills) is untouched. Before deleting,
   grep once more for any importer of `scripts/traits.mjs` outside `scripts/` and `skills/doctrine/test`.
   Update `skills/doctrine/SKILL.md` if it points at the catalogue.
2. `skills/splash/scripts/new-story.mjs` + `new-story.test.ts` (no consumer). If `README.md` tells a
   journalist to run it, keep it and add it to `skills/splash/SKILL.md` instead; check first.
3. `scripts/open-live-copy.mjs` (no consumer).
4. Drift-asserted-twice (A2.4): drop `matrix-is-current.test.ts` and keep `matrix:check` (or the
   reverse; one of each). Leave `landing-matches-the-catalogue.test.ts` and `landing:check` to Tom.
5. `docs/splash/*-prd.md` (2,211 lines) stays: its deletion gate U11 is not met
   (`interactive-preflight-verification.md` lists four open blockers). Not over-engineering, just large.

---

## Part D — housekeeping (from Tom's notes)

1. `ttpvwmzu`: abandon **after** Batch 2 step #65.1 has copied the ratchet test out of it
   (`jj file show -r ttpvwmzu skills/splash/test/ranking-walk-ratchet.test.ts`). Then `jj abandon ttpvwmzu`.
2. `wrtnospy` ("localhost Splash studio; thin MCP; Apertus adapter", +2169/−1353, Aug 25): unmerged,
   predates everything here. Not touched by this plan. Rebasing it onto main after Batch 1 will
   conflict in `where.mjs` if it touches the gate region; flag for Tom rather than resolve.
3. `snapshot.max-new-file-size = "2MiB"` is in the user-level repo config
   (`~/.config/jj/repos/5bfa3f138eb1a817148a/config.toml`, not `.jj/repo/config.toml`). Large files
   now snapshot silently. Before each commit in this plan, run
   `jj diff --stat | sort -t'|' -k2 -rn | head` and refuse anything over 200 KB that is not a proof
   fixture. Consider lowering it back to the default once the table-on proof is committed.

---

## Order of work, summarised

| batch | issues | expected net lines | commit |
|---|---|---|---|
| 1 | #62, #63 | roughly −1,500 (where.mjs −550, tests −900, +contract +walker +lanes) | 1 |
| 2 | #64, #65, #59 | roughly −300 | 1 |
| 3 | #58, #60, #57 | roughly +150 (typeface.mjs) −50 | 1 |
| 4 | #61 | +40 | 1 |
| C | deletions | roughly −2,200 | 1 |

Close each issue on GitHub as its batch commits, with the actual diff summary.

---

## Appendix — timing run, 2026-09-04

Each file run alone, seconds:

| s | file |
|---|---|
| 126.95 | skills/scrolly/test/scroll-integrity.test.ts |
| 50.73 | skills/splash/test/interaction-promises-are-kept.test.ts |
| 10.51 | skills/splash/test/seed-renders-standalone.test.ts |
| 9.25 | skills/map-web/test/live-map.test.ts |
| 8.43 | skills/splash/test/the-palette-reaches-the-pixels.test.ts |
| 6.62 | skills/splash/test/hoverable-line-answers.test.ts |
| 5.91 | skills/splash/test/annotation-reads-over-what-it-crosses.test.ts |
| 5.90 | skills/splash/test/helper-parity.test.ts |
| 5.67 | skills/chart-beat/test/inspect-render.test.ts |
| 5.61 | skills/splash/test/video-handover-is-a-cut.test.ts |
| 5.25 | skills/chart-beat/test/three-sizes-no-collision.test.ts |
| 3.36 | skills/map-web/test/canon.test.ts |
| 3.26 | skills/image-beat/test/canon.test.ts |
| 3.16 | skills/splash/test/filters-are-declared-or-absent.test.ts |
| 2.92 | skills/chart-beat/test/render-still.test.ts |
| 2.71 | skills/splash/test/web-annotation-clears-its-marks.test.ts |

Heavy-lane reasons (48 files by static rule + 2 by measurement): puppeteer direct (8), puppeteer via
render/verify script (3), @puppeteer/browsers (1), remotion (1), @resvg via render-still.mjs (17),
spawns `bun` to render or build (13), spawns `bun` on a cheap generator (4), maplibre env-gated (2).
Five string-only false positives (`"engine-managed-chromium"` in the catalogue, `--headless` fixture
strings) must stay in the fast lane: `apps/goose/test/{a-la-carte,selection}`,
`installer/test/setup-security`, `splash/test/format-shippability`, `storyboard/test/visual-catalog`.
The rule should therefore match import specifiers and spawn calls, not bare strings.

The derived lists from this run are in `scratchpads/test-lanes-2026-09-04/` (`fast.txt`, `heavy.txt`,
`times.tsv`) for comparison against what `scripts/test-lanes.mjs` derives.


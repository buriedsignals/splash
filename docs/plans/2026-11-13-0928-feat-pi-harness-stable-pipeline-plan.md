---
title: Pi Harness — every step stable on both students - Plan
type: feat
date: 2026-11-13
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
extends: docs/plans/2026-11-07-1448-feat-pi-harness-tom-method-plan.md
---

# Pi Harness — every step stable on both students - Plan

## Goal Capsule

- **Objective (Rémy, 2026-11-13):** the whole tool is stable, tested and improved with Tom's method, step by step. Every step works on both students, the 12B (`osaurus`) and Qwen3.5-9B (`osaurus-qwen`), and gives a result of good quality. Rémy gives licence to rethink logic where Tom's method calls for it.
- **Method (authority):** Tom's debrief and "Going sovereign".
  - Routing lives in code.
  - Every refusal names the next step or hands the model the answer.
  - Before any change, each miss is triaged to one owner: Tune, Harness or Helper.
  - Narrow tuning comes last.
- **Stable means:** the same step passes twice in a row on the same input with no resume, and its output is looked at, not only its exit code.
- **Segmentation:** each step is measured on its own, from a frozen input, so an error shows within minutes rather than at the end of a full run.
- **Constraints:**
  - No spend.
  - One run at a time.
  - Battery guard at 30%, disk at 8 GB free.
  - Don't touch `skills/` or `shared/`.
  - Commit with explicit paths.
  - Push only `refs/heads/feat-pi-harness:refs/heads/feat-pi-harness`.
  - No Claude mention.
- **Stop and report to Rémy:**
  - when a step needs a product decision;
  - when a step would need training (T6 of the 11-07 plan);
  - when a fix would touch `skills/` or `shared/`.

## The steps of the tool (from `src/driver.ts`)

| # | Step | Owner in code | Model? | Measured so far |
|---|---|---|---|---|
| S0 | Intake (freeze article and data, profile) | `phase === "intake"` | no (code) | indirectly, in every run |
| S1 | Editor proposals, Gate 1 | `persona:editor` + `editor-check.ts` | yes | never on its own |
| S2 | Storyboard, Gate 2: takeaway, claim, hand, language, slot (medium, format, size, intent, producer, chosen), subjects | `skill:storyboard` | yes | 4/4 on Qwen, some only after a resume |
| S3 | Palette (propose and record, inside the storyboard session) | `paletteTools` | yes | never on its own |
| S4 | Analyst (`data.json`) | `skill:analyst` → `build-data.mjs` | no (code) | indirectly |
| S5 | Craft | `CRAFT_OWNERS`: chart-beat, chart-web, chart-video, map-beat, map-web, scrolly | yes | static widely; web, video and scrolly little |
| S6 | Designer review | `persona:designer` | yes | almost never |
| S7 | Delivery (offer the forms, materialise the chosen one) | `skill:deliver` | yes | through full runs |

In scope as well (Rémy, 2026-11-13), all three are currently missing from the harness:
- **Image beats:** `image-beat` is not in `CRAFT_OWNERS`.
- **Datawrapper production:** `dw-beat`. The token is `DATAWRAPPER_API_TOKEN` in `sp1/.env`; it is read, never printed.
- **Multi-beat stories:** the storyboard prompt says "This run produces slot 1 only", and `firstBeat()` picks a single beat.

## Key Technical Decisions

- **KD1 — One leg per step, with a frozen input.** Each step gets a seeded leg that starts from the state the previous step leaves behind, so it can be run alone. A leg is cheap (minutes), and a defect points to exactly one step. Craft already has its seeded leg (`run-eval --seeds`). The other steps get theirs in U1.
- **KD2 — The stability matrix is the gate.** It covers each step × each student, and the craft step × {chart, map} × {static, web, video, scrolly}. A cell is green after two passes in a row with no resume and an output that was looked at.
- **KD3 — The storyboard's closed questions move into code.** Today the model is asked to word questions the harness already knows: chart/map/image, format, size, intent, Custom or Datawrapper, and palette accept. The model then loops when it drifts (Qwen: MANIFEST read three times, re-asks, six re-asks of format). Instead, the driver asks those questions to the journalist itself and records the answers with the same `record_slot` code path. The model keeps the judgement work: the restitution, the survey, the takeaway, the claim, the hand, and the pick among candidates. This is the main rethink, done in its own worktree (U4) so the running matrices keep a fixed code base.
- **KD4 — Fixes follow K3 of the 11-07 plan.** Each fix takes four steps: a failing test on the live path, the fix, a mutation check, and a commit. Each miss goes to `TUNE.md`, `HELPER.md` or a harness fix, with evidence.
- **KD5 — The two students are always measured on the same leg, back to back,** and both are reported in one table.

## Implementation Units

### U1. Seeded legs for every step (harness, free)

- **Goal:** S1, S2, S3, S6 and S7 can each be run alone from a frozen state, the way craft already can.
- **Files:** `eval/run-eval.ts`, `src/driver.ts` (stop and start points), `eval/seeds/legs/<step>/` (frozen story states), tests beside.
- **Approach:**
  - Generalise the two existing stop points (`SPLASH_STOP_AFTER_STORYBOARD`, `SPLASH_STOP_AFTER_CRAFT`) into one `SPLASH_STOP_AFTER=<phase>` that still reads the old names.
  - Freeze the input states from runs that are already kept. For S1/S2/S3 that is the story after intake; for S6 a crafted beat; for S7 a reviewed beat.
- **Tests:** each stop returns its own outcome, and a leg seeded at S6 runs only the designer.
- **Exit:** each leg runs once on Qwen, in under 15 minutes.

### U2. Craft stability matrix (running now)

- **Goal:** S5 is stable on chart (`gx-bullet`) and map (`gx-proportional-symbol-symbol-bubble-map`), each in static, web, video and scrolly, on both students.
- **Status:** Qwen `m1`, then the 12B `m2`, run one cell at a time.
- **Approach:**
  - Look at every render: the PNG, the frames extracted from the mp4, and each scroll state.
  - Triage every miss and fix only that one cell, then re-run that cell.
  - Run a second pass on every green cell to confirm it is stable.
- **Exit:** 16 cells green twice, or a named Tune/Helper miss for each cell that is not.

### U3. Storyboard, editor and palette on their own (measurement)

- **Goal:** know how often S1–S3 succeed first time, on both students.
- **Approach:**
  - Run the four stress stories (p, v, ad, x) through S1→S3 only, with no resume, on both students.
  - Count first-pass closes, resumed closes and stops.
  - Check that each storyboard is faithful to its sheet.
  - Read the palette record against its WCAG floor.
- **Exit:** a baseline table, which U4 must beat.

### U4. Storyboard routing in code (harness rethink, own worktree)

- **Goal:** the closed questions no longer depend on the model (KD3).
- **Where:** a worktree `feat-pi-storyboard-routing` under the container, branched from `feat-pi-harness`. It merges back only after U3 and U4 have been compared.
- **Files:** `src/driver.ts` (storyboard phase), `src/conversation.ts` (a code turn to the journalist), `src/tools/storyboard.ts` (record through the same code path), `src/tools/palette.ts`, tests beside.
- **Approach:**
  - Read the open gap. When it is a closed question, the driver sends the exact question to the scripted journalist and records the answer through the existing record code; the model only takes over again for open gaps.
  - Keep the journalist-facing wording identical, so the sheets and the scripted journalist still work.
  - Remove the prompt text and refusals that only existed to steer the model through those questions (K4: rewrite every instruction the takeover makes untrue).
- **Tests:**
  - A slot's medium, format, size and intent get recorded with no model turn.
  - The model is never offered a closed gap.
  - A journalist answer outside the menu gets one honest re-ask, then a stop.
- **Exit:** re-run U3. On both students, first-pass closes are ≥ the U3 baseline, and storyboard time and turns go down.

### U5. Analyst and intake checks (code steps)

- **Goal:** S0 and S4 fail loud and early, never silently.
- **Approach:**
  - Run `build-data.mjs` and intake over every seed and stress story.
  - Assert that `data.json` matches the slot's intent, the values and the units.
  - For any silent mismatch: write a test, then fix.
- **Exit:** every input story passes, or fails with a message that names the cause.

### U6. Designer review (S6)

- **Goal:** the review's verdicts are grounded and actionable on both students.
- **Approach:**
  - Run the S6 leg on the crafted beats from U2: one chart and one map per format.
  - Check that each verdict cites `review_facts`.
  - Check that a deliberately broken beat is flagged. The broken beat is made by mutating a copy, e.g. removing the source line or the accent.
  - Move into code anything the review recomputes by eye.
- **Exit:** the broken beats are caught on both students, and no green beat gets a false fail.

### U7. Delivery (S7)

- **Goal:** each format's forms are offered, and the chosen one is materialised and passes the export guard.
- **Approach:**
  - Run the S7 leg for each format cell of U2.
  - Look at the delivered file. For web and scrolly, open the URL; for video, extract frames from the mp4.
- **Exit:** 8 delivery cells green twice per student.

### U8. End-to-end confirmation

- **Goal:** the composed steps hold without the seeds.
- **Approach:** one full run per student on two stories, one chart and one map, with no resume.
- **Exit:** both runs reach `done` and their output passes the U2/U7 look.

### U10. Image beats (S5, new medium)

- **Goal:** a slot whose medium is "image" goes through craft (`skill:image-beat`), review and delivery on both students.
- **Files:**
  - `src/driver.ts` (`CRAFT_OWNERS`, the craft profile for image-beat);
  - `src/sessions.ts` / profiles;
  - a stress story with the journalist's own photographs under `eval/`;
  - tests beside.
- **Approach:**
  - Wire `image-beat` the same way as the other craft owners.
  - Seed an image story.
  - Check the image discipline in code: alt text and credit are required; the photo is letterboxed, not cropped or stretched; EXIF orientation is detected.
  - Then add the image cells to the U2 matrix: static, and a scrolly image sequence.
- **Exit:** image static and image scrolly are green twice per student.

### U11. Datawrapper producer (S5, second producer)

- **Goal:** when the journalist answers "Datawrapper" for an eligible slot, `dw-beat` publishes the chart and takes back an owned PNG and web artifact.
- **Files:** `src/driver.ts` (owner `skill:dw-beat`), `eval/seeds/` (a seed with `producer: datawrapper`), tests beside.
- **Approach:**
  - Use the real API with the token from `sp1/.env`, passed by environment, no mock.
  - Write one test chart per run and delete it afterwards, unless it is kept as evidence.
  - Check that the chart ID is persisted in the beat and that delivery reads it.
- **Exit:** one bar chart and one map (if Datawrapper supports that map type) are green twice per student.

### U12. Multi-beat stories (S2→S7)

- **Goal:** a story with two or more slots goes through every slot.
- **Files:** `src/driver.ts` (`firstBeat` → per-beat loop over craft/review/delivery), the storyboard prompt, `src/tools/storyboard.ts`, tests beside.
- **Approach:**
  - Lift the "slot 1 only" limit. The storyboard records N slots; the craft, review and delivery phases loop over the beats in `whereIs` order.
  - Seed a two-slot story: a chart then a map, in different formats.
- **Tests:** `whereIs` advances from beat 1 to beat 2, and a failure on beat 2 does not undo beat 1.
- **Exit:** the two-slot story reaches `done` twice per student.

### U9. Report and hand-off

- **Files:** `eval/RESULTS.md` (stability matrix section), `TUNE.md`, `HELPER.md`.
- **Approach:**
  - Write one table per step × student.
  - List the misses still open, by owner.
  - Push with the explicit refspec.
  - Send Rémy a five-line report.

## Order

Order of work: U2 (running), then U1, then U3, then U4, then U5, then U6, then U7, then U10, then U11, then U12, then U8, then U9. U1 and U5 have no model runs and fit between matrix cells. The next leg starts only after the previous one has been looked at.

## Verification Contract

- Every harness fix needs a test that fails before the fix and fails again under a mutation, and the full `bun test` suite must be green.
- Every green cell needs two consecutive passes and an output that was looked at, with the path of the PNG, frames or URL recorded in `RESULTS.md`.
- No step is called stable from its exit code alone.

## Definition of Done

The matrix in `RESULTS.md` covers:
- S0–S7 × both students;
- for S5, chart and map × the four formats, plus image (static and scrolly) and Datawrapper;
- the two-slot story.

Every cell is either green twice or tied to a named Tune or Helper miss with its evidence. U4 has been measured against its baseline. The branch has been pushed and Rémy has had his report.

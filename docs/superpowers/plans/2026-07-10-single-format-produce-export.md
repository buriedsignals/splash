# Single-Format Produce→Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one visual element produce and deliver exactly ONE format — kill the over-produce (all formats built) and the over-materialize (all delivery forms dumped).

**Architecture:** Pin a single `VisualFormat` on the accepted spec at PROPOSITION; pass it down so each producer builds only that format; refactor `export-code` so static/video deliver the media file directly and interactive/scrolly propose the a/b/c form and build+deliver only the chosen one (lazy). Remove the auto no-JS `static.html` a11y fallback.

**Tech Stack:** Bun, TypeScript, `bun:test`. Producers: chart-native (React+D3+Remotion via Vite), map-native (MapLibre), dw-chart (Datawrapper API). Orchestrator: `skills/atelier`.

**Spec:** `docs/superpowers/specs/2026-07-10-single-format-produce-export-design.md`.

## Global Constraints

- Runtime **Bun** (never npm/node). Tests `bun:test`, TDD (failing test first).
- Code, comments, identifiers, commit messages, branches: **English only**.
- **No mention of Claude/Anthropic/any AI vendor** anywhere (commits, comments, docs).
- **No `any` introduced.** `bunx tsc --noEmit` clean on touched dirs.
- Gate `bun run check` must stay **16/16** at the end.
- `VisualFormat = "static" | "interactive" | "video" | "scrolly"` (from `skills/atelier/src/channel.ts:12`). The chosen format MUST be a member of `allowedFormats(channel)`.
- Frequent commits (one per task minimum).

---

### Task 1: Pin a single `format` on the spec + suggester chooses one

**Files:**
- Modify: `skills/atelier/src/channel.ts` — export a `normalizeFormat`/validator if not present; confirm `VisualFormat` + `isFormatAllowed` are exported.
- Modify: `skills/suggest-chart/SKILL.md` + `skills/suggest-article/SKILL.md` — the emitted proposal/spec carries exactly ONE `format` (a `VisualFormat`) chosen within `allowedFormats(channel)`; `interactiveDefault` remains the default for article-web, but the suggester commits to ONE (not the whole set).
- Modify: `skills/atelier/SKILL.md` — PROPOSITION (Gate 2) states the format is part of the vetoable proposal (journalist may change it); the accepted `spec.format` is the single pinned format that flows to produce.
- Test: `skills/atelier/src/format-pin.test.ts` (new).

**Interfaces:**
- Produces: `spec.format: VisualFormat` present on every accepted proposal; helper `assertFormatAllowed(channel, format): void` (throws if not in the allowed set).

- [ ] **Step 1: Write the failing test** — `assertFormatAllowed` accepts a member of the channel's allowed set and throws on a non-member (e.g. `interactive` on `social-vertical`).

```ts
import { test, expect } from "bun:test";
import { assertFormatAllowed } from "./channel.ts";

test("assertFormatAllowed passes a member of the channel's allowed set", () => {
  expect(() => assertFormatAllowed("article-web", "interactive")).not.toThrow();
});
test("assertFormatAllowed throws when the format is not allowed for the channel", () => {
  expect(() => assertFormatAllowed("social-vertical", "interactive")).toThrow(/not allowed/i);
});
```

- [ ] **Step 2: Run to verify it fails** — `cd skills/atelier && bun test src/format-pin.test.ts` → FAIL (`assertFormatAllowed` not exported).
- [ ] **Step 3: Implement `assertFormatAllowed` in `channel.ts`** (reuse existing `isFormatAllowed`):

```ts
export function assertFormatAllowed(channel: Channel, format: VisualFormat): void {
  if (!isFormatAllowed(channel, format))
    throw new Error(`format "${format}" not allowed for channel "${channel}" (allowed: ${allowedFormats(channel).join(", ")})`);
}
```

- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Update the three SKILL.md files** so the proposal/spec pins ONE `format` (prose; quote `allowedFormats` + `assertFormatAllowed` as the guard the produce step will apply). No new gate — format lives in the existing PROPOSITION.
- [ ] **Step 6: Commit** — `feat(atelier): pin a single VisualFormat on the accepted spec at PROPOSITION`.

---

### Task 2: chart-native `produce.mjs` builds ONLY the requested format

**Files:**
- Modify: `skills/chart-native/scripts/produce.mjs` — the `formats` arg (`process.argv[5]`, default `"all"`) becomes a single `VisualFormat`. Build ONLY that format. Keep an EPHEMERAL review still for interactive/scrolly (a `interactive.png`/beat snapshot for Gate-3 review + the interaction snaps) but do NOT build the other formats' artifacts (no `static.png`/`static.html` for an interactive; no `interactive.html` for a video; no `responsive-*` unless the format needs them).
- Test: `skills/chart-native/tests/produce-single-format.test.ts` (new) — asserts, given format `X`, the outDir contains only `X`'s artifacts (+ the ephemeral review still) and NONE of the other formats' files.

**Interfaces:**
- Consumes: `produce.mjs <type> <config.json> <outDir> <format>` where `<format> ∈ {static, interactive, video, scrolly}`.
- Produces (in `<outDir>`): static → `static.png` (the media) only; interactive → `interactive.html` + `interactive.png` (ephemeral review) ; video → `<aspect>.mp4` + `video-<aspect>-still.png` (review) ; scrolly → `scrolly.html` + a beat still (review). NO cross-format byproducts.

- [ ] **Step 1: Write the failing test** — run produce with `interactive` and assert `static.png`/`static.html` are ABSENT and `interactive.html` is PRESENT; run with `video` and assert `interactive.html` ABSENT, `.mp4` PRESENT.

```ts
import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { runProduce } from "./helpers/run-produce.ts"; // small wrapper that shells produce.mjs into a tmp outDir

test("produce interactive builds interactive.html and NOT the static/video artifacts", async () => {
  const out = await runProduce("bar", "assets/sample-data/bars.json", "interactive");
  expect(existsSync(`${out}/interactive.html`)).toBe(true);
  expect(existsSync(`${out}/static.html`)).toBe(false);
  expect(existsSync(`${out}/portrait.mp4`)).toBe(false);
  expect(existsSync(`${out}/landscape.mp4`)).toBe(false);
});
test("produce static builds only the image, no html", async () => {
  const out = await runProduce("bar", "assets/sample-data/bars.json", "static");
  expect(existsSync(`${out}/static.png`)).toBe(true);
  expect(existsSync(`${out}/interactive.html`)).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails** (current `"all"`/`"static"` handling builds extra artifacts).
- [ ] **Step 3: Implement single-format dispatch in `produce.mjs`** — replace the `if (formats === "all") { …video… }` + the static/interactive build with a `switch (format)` that runs exactly the one format's build path. Preserve `assertRenderedSize` (channel conformance) for the produced format. Keep the Gate-3 review still generation but mark it ephemeral (the existing snap already writes `interactive.png`).
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Run the full chart-native suite + audit** — `cd skills/chart-native && bun test && bun run audit` → all green, `bunx tsc --noEmit` clean.
- [ ] **Step 6: Commit** — `feat(chart-native): produce builds only the single requested format`.

---

### Task 3: map-native + dw-chart `produce.mjs` build ONLY the requested format

**Files:**
- Modify: `skills/map-native/scripts/produce.mjs` — same single-format dispatch (static PNG | interactive.html+review | video mp4+still | scrolly.html). It already channel-gates the interactive (`fix/channel-gated-produce`); extend to a strict single-format build.
- Modify: `skills/dw-chart/src/produce.ts` / `skills/dw-chart/scripts/*` — a dw-chart is hosted; `static` → the DW static PNG/SVG media; `interactive` → the DW hosted embed (publicUrl) as the artifact (no local html). Build only what the format needs.
- Test: `skills/map-native/tests/produce-single-format.test.ts` (new) mirroring Task 2's assertions for map-native.

**Interfaces:**
- Consumes: same `produce.mjs <type> <config> <outDir> <format>` contract as Task 2.
- Produces: map-native symbol/choropleth per format; dw-chart static → media, interactive → publicUrl recorded in the report (already present per the earlier dw-interactive-export fix).

- [ ] **Step 1: Write the failing test** for map-native (interactive build omits static.png/mp4).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement single-format dispatch in map-native produce.mjs.**
- [ ] **Step 4: Implement dw-chart single-format** (static→media only; interactive→publicUrl, no extra local build).
- [ ] **Step 5: Run both suites + tsc.** `cd skills/map-native && bun test`; `cd skills/dw-chart && bun test`.
- [ ] **Step 6: Commit** — `feat(map-native,dw-chart): produce builds only the single requested format`.

---

### Task 4: `produce-all.mjs` passes the single format

**Files:**
- Modify: `skills/atelier/scripts/produce-all.mjs` — read `spec.format`, `assertFormatAllowed(channel, spec.format)`, and invoke each producer's `produce.mjs` with that single format instead of `"all"`.
- Test: `skills/atelier/scripts/produce-all-format.test.ts` (new) — asserts the producer is invoked with the spec's format and that a disallowed format fails hard.

**Interfaces:**
- Consumes: `spec.format` (Task 1), the single-format `produce.mjs` contract (Tasks 2–3).
- Produces: per-proposal build dir containing only the single format's artifacts.

- [ ] **Step 1: Write the failing test** (stub the producer invocation; assert it receives `spec.format`, and that `assertFormatAllowed` throws for a disallowed one).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** — thread `spec.format` through `produce-all`, call `assertFormatAllowed`, pass the format arg.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `feat(atelier): produce-all builds each proposal at its single pinned format`.

---

### Task 5: `assertDelivered` — new per-format delivery rules

**Files:**
- Modify: `skills/atelier/src/export-guard.ts` — `assertDelivered` no longer requires `static.html` for an interactive. New rule: the delivery is valid iff it matches the format's shape — `static`→a single image file; `video`→a single `.mp4`; `interactive`/`scrolly`→the chosen form (a `.html` file, OR a source-bundle dir, OR a recorded hosted URL). No `EMBED.md`-lists-everything requirement.
- Test: `skills/atelier/src/export-guard.test.ts` — replace the static.html-required assertions; add per-format-shape assertions.

**Interfaces:**
- Consumes: `spec.format` + the chosen delivery form.
- Produces: `assertDelivered(files, { format, form })` — throws unless the delivered artifact matches `(format, form)`.

- [ ] **Step 1: Write the failing tests** — `static` delivery of a lone `chart.png` passes; an `interactive` delivery of a lone `interactive.html` passes (NO static.html needed); a `static` delivery that is an empty folder fails.

```ts
test("assertDelivered accepts a static delivery of a single image, no html", () => {
  expect(() => assertDelivered(["chart.png"], { format: "static", form: null })).not.toThrow();
});
test("assertDelivered accepts an interactive delivery of just interactive.html (no static.html)", () => {
  expect(() => assertDelivered(["interactive.html"], { format: "interactive", form: "html" })).not.toThrow();
});
```

- [ ] **Step 2: Run to verify it fails** (current assertDelivered demands static.html).
- [ ] **Step 3: Implement the `(format, form)`-shaped rules.**
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit** — `feat(atelier): assertDelivered validates the single-format delivery shape`.

---

### Task 6: `export-code.mjs` refonte — per-format delivery + lazy form

**Files:**
- Modify: `skills/atelier/scripts/export-code.mjs` — branch on `spec.format`:
  - `static` → copy the media file to a clean delivered path, print it. No folder, no `.html`, no EMBED.md.
  - `video` → deliver the `.mp4` directly.
  - `interactive`/`scrolly` → emit the a/b/c proposal (keep `EXPORT_FORMS_JSON` + the relayable block from the export-form-choice work), then — **only after the choice** — materialize the ONE chosen form: `html` → the `interactive.html`/`scrolly.html`; `code source` → run `export-source.mjs` NOW to build the React bundle; `embed` → run `deploy-embed.mjs` NOW. Do NOT pre-build the bundle or `static.html`.
- Modify: `skills/atelier/SKILL.md` EXPORT §6 — the new flow (static/video = media direct; interactive/scrolly = propose→wait→build-only-chosen); remove the "produce all forms unconditionally" wording.
- Test: `skills/atelier/scripts/export-code.test.ts` — update to the new per-format behavior (static delivers the media; interactive emits the proposal and, given a chosen form, delivers only that; the React bundle is absent unless "code source" was chosen).

**Interfaces:**
- Consumes: `spec.format` (Task 1), `assertDelivered({format, form})` (Task 5), `export-source.mjs` (bundle), `deploy-embed.mjs` (fly.io).
- Produces: a single delivered artifact matching `(format, chosen form)`.

- [ ] **Step 1: Write the failing tests** — static format → export-code delivers the lone media file (no `-export` folder); interactive + chosen form `code source` → the `<id>-source/` bundle exists AND `static.html` does NOT; interactive + chosen form `html` → only `interactive.html`, NO bundle, NO static.html.
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement the format branch + lazy-form materialization.** Reuse the export-form-choice emit machinery; gate the bundle/embed build on the chosen form.
- [ ] **Step 4: Run to verify it passes.** `cd skills/atelier && bun test scripts/export-code.test.ts`.
- [ ] **Step 5: Real e2e render-verify (chart-native interactive):** produce an interactive, run export-code with form `code source`, confirm the `-export` contains the bundle and NO `static.html`; with form `html`, confirm ONLY `interactive.html`. With a static format, confirm the lone image is delivered.
- [ ] **Step 6: Commit** — `feat(atelier): export-code delivers one format, one lazily-built form; drop the static.html fallback`.

---

### Task 7: judge.md rubric + locked-decision reversals in the docs

**Files:**
- Modify: `../atelier-harness/judge.md` — EXPORT/Gate 4 rubric: one format produced alone; static/video = media file directly; interactive/scrolly = the ONE chosen form (lazy); NO auto `static.html`; **"multiple formats produced" or "all delivery forms dumped" is now a DEFECT to flag**; a `static.html` is no longer expected/required.
- Modify: `CLAUDE.md` (Décisions verrouillées + État courant + backlog) and `docs/atelier/CHANGELOG.md` — record the two reversals (auto static.html a11y fallback removed → a11y = choose `static`; export-form-choice → lazy single-form). Note the out-of-scope follow-ups (seismes video hang, harness a/b/c capture).
- Test: none (prose). Run `bun run check` (atelier) to confirm the code changes still pass.

- [ ] **Step 1: Update `judge.md`** EXPORT step + Gate-4 table to the single-format model; make over-produce a flagged defect.
- [ ] **Step 2: Update `CLAUDE.md` + `CHANGELOG.md`** with the two decision reversals and the out-of-scope follow-ups.
- [ ] **Step 3: Final gate** — `bun run check` → **16/16**; run the touched skills' suites once more.
- [ ] **Step 4: Commit** — `docs(atelier): record single-format redesign + judge rubric; reverse static.html + produce-all-forms decisions`.

---

## Self-Review

**Spec coverage:** spec §Axe 1 → Tasks 1–4; §Axe 2 (lazy form) → Task 6; §Livraison par format → Tasks 2/3/6; §"ce qui disparaît" (static.html) → Tasks 5/6; §Gardes mécaniques (assertDelivered, judge.md) → Tasks 5/7; §Renversement de décision → Task 7. Out-of-scope items (video hang, harness capture) intentionally absent. ✓

**Placeholders:** none — each task names exact files + real test code + the concrete change.

**Type consistency:** `VisualFormat`, `assertFormatAllowed(channel, format)`, `assertDelivered(files, {format, form})`, `spec.format`, `produce.mjs <type> <config> <outDir> <format>` used consistently across tasks.

**Note on `<form>` values:** `form ∈ {"html", "code-source", "embed", null}`; `null` for static/video (no form axis). Every task using `form` uses these literals.

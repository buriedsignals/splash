# Format-reach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `video` really offerable and really produced by the editorial loop, and make `scrolly` structurally reachable, without touching the ranking or the `chosenId` contract.

**Architecture:** Three independent seams. (1) A new `DeliverableKind` axis in the core vocabulary lets `lib/brain/offer.ts` reserve its LAST row for a deliverable kind the earlier rows do not already cover — a selection rule, not a ranking change. (2) A `requestedFormat` field on the run element flows into `lib/brain/eligibility.ts` as a HARD legality filter, with a named refusal when the channel forbids it. (3) A `producerForFormat()` redirection in `lib/core/registry.ts` teaches the brain that the `scrolly` format is built by the `scrolly` producer hosting its engine's track — which unblocks the format, and (with 9 amended KB sheets plus an exported dispatch set) makes it legal, marked, and drift-guarded.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod (manifest schema) · React/Remotion (the scrolly + video engines).

**Spec:** `docs/superpowers/specs/2026-07-26-format-reach-design.md`

## Global Constraints

- Runtime is **Bun**. Never `npm`, never `node`.
- Tests are `bun:test` and written **TDD — the failing test first, run it, watch it fail**.
- Code, comments, identifiers, commit messages and branch names in **English**. No exceptions, even though this plan's prose is French-adjacent.
- **No model-vendor mention** in any published artifact (commits, PRs, docs).
- **No `any` introduced.** No non-null assertion added to work around a type you can narrow.
- Guards fail **loud**. A silent degradation is a defect, not a fallback.
- `lib/` must never import from `skills/` (the one exception is the existing composition root `lib/loop/engines.ts`).
- Gate: `bun run check` (24-ish checks: tsc + per-directory `bun test`). It must be green at the end of every task.
- Branch `feat/format-reach`, worktree `/Users/rmdms/Sites/Professional/splash-reach`, off `feat/proposal-brain`.

---

### Task 1: The deliverable-kind axis

**Files:**
- Modify: `lib/core/vocabulary.ts` (append after `isVisualFormat`, around line 40)
- Test: `lib/core/vocabulary.test.ts` (create if absent; otherwise append)

**Interfaces:**
- Consumes: `VISUAL_FORMATS`, `VisualFormat` (already exported from this file).
- Produces: `export type DeliverableKind = "element" | "motion" | "page"` and `export const DELIVERABLE_KIND: Record<VisualFormat, DeliverableKind>`. Task 2 reads `DELIVERABLE_KIND[c.format]`.

- [ ] **Step 1: Write the failing test**

Append to `lib/core/vocabulary.test.ts`:

```ts
import { test, expect } from "bun:test";
import { VISUAL_FORMATS, DELIVERABLE_KIND } from "./vocabulary";

test("every visual format has a deliverable kind — the map is TOTAL, not partial", () => {
  for (const f of VISUAL_FORMATS) expect(DELIVERABLE_KIND[f]).toBeDefined();
  expect(Object.keys(DELIVERABLE_KIND).sort()).toEqual([...VISUAL_FORMATS].sort());
});

test("the three kinds separate an embeddable element, a motion asset and a narrative page", () => {
  expect(DELIVERABLE_KIND.static).toBe("element");
  expect(DELIVERABLE_KIND.interactive).toBe("element");
  expect(DELIVERABLE_KIND.video).toBe("motion");
  expect(DELIVERABLE_KIND.scrolly).toBe("page");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-reach && bun test lib/core/vocabulary.test.ts`
Expected: FAIL — `DELIVERABLE_KIND` is not exported by `./vocabulary`.

- [ ] **Step 3: Implement**

Append to `lib/core/vocabulary.ts`:

```ts
// What a journalist actually walks away with. Two formats can differ (static vs interactive)
// and still be the SAME decision — an element embedded in the article. A video is a different
// artifact entirely (the only format whose file is not HTML — see lib/loop/produce.ts's
// artifactFileFor), and a scrolly is a whole narrative page rather than an embeddable element
// (the distinction lib/brain/eligibility.ts's ARTICLE_BRANCH_ENGINES comment already draws).
// lib/brain/offer.ts uses this to keep the offer from being mono-format.
export type DeliverableKind = "element" | "motion" | "page";

// TOTAL over VisualFormat on purpose: adding a format to VISUAL_FORMATS must force a decision
// here rather than fall into a silent default.
export const DELIVERABLE_KIND: Record<VisualFormat, DeliverableKind> = {
  static: "element",
  interactive: "element",
  video: "motion",
  scrolly: "page",
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test lib/core/vocabulary.test.ts`
Expected: PASS (4 assertions across 2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/core/vocabulary.ts lib/core/vocabulary.test.ts
git commit -m "feat(core): deliverable kind — element, motion, page"
```

---

### Task 2: The reserved last row in the offer

**Files:**
- Modify: `lib/brain/offer.ts:34-51` (the `buildOffer` loop)
- Test: `lib/brain/offer.test.ts` (append; keep every existing test passing)

**Interfaces:**
- Consumes: `DELIVERABLE_KIND` (Task 1); `rank()` and `Candidate` unchanged.
- Produces: no signature change. `buildOffer(input, pairs?)` keeps its shape; only which options come back changes.

**Context the implementer needs:** `lib/brain/rank.ts` is NOT touched in this task or any other. The reservation is a SELECTION rule. Also: the offer's `id`s must stay unique — `lib/loop/manifest.ts:156`, `:247`, `:343` and `lib/loop/produce.ts:56` all resolve `chosenId` with `options.find(o => o.id === chosenId)`, so two rows sharing an `id` would silently produce the wrong artifact.

- [ ] **Step 1: Write the failing tests**

Append to `lib/brain/offer.test.ts`:

```ts
import { DELIVERABLE_KIND } from "../core/vocabulary";

test("the last row is reserved for a deliverable kind the earlier rows do not cover", () => {
  const options = buildOffer(INPUT).options;
  expect(options.length).toBe(3);
  const kinds = options.map((o) => DELIVERABLE_KIND[o.format]);
  // The real KB offers video on article-web, so the reserved row must not be a third element.
  expect(new Set(kinds).size).toBeGreaterThan(1);
  expect(kinds[2]).not.toBe(kinds[0]);
});

test("a social channel gets a motion row too — the rule is not article-web-only", () => {
  const options = buildOffer({ ...INPUT, channel: "social-vertical" }).options;
  expect(options.map((o) => DELIVERABLE_KIND[o.format])).toContain("motion");
});

test("ids stay unique even with the reserved row — chosenId resolves to exactly one option", () => {
  const ids = buildOffer(INPUT).options.map((o) => o.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("no candidate of an uncovered kind ⇒ the last row falls back, and the offer keeps its length", () => {
  // Three single-format fixture sheets: every candidate is `static`, so no second kind exists.
  const pairs = ["fx-a", "fx-b", "fx-c"].map((id) => ({
    sheet: fakeSheet(id, {}),
    engine: "fake-engine",
    key: "fake-key",
  }));
  const offer = buildOffer(INPUT, pairs);
  expect(offer.options.length).toBe(3);
  expect(new Set(offer.options.map((o) => o.id)).size).toBe(3);
});

test("max 1 reserves nothing — there is no last row distinct from the first", () => {
  const offer = buildOffer({ ...INPUT, max: 1 });
  expect(offer.options.length).toBe(1);
  // With max 1 the single row is simply the top-ranked candidate.
  expect(offer.options[0]!.id).toBe(buildOffer({ ...INPUT, max: 3 }).options[0]!.id);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/brain/offer.test.ts`
Expected: FAIL on "the last row is reserved…" (all three kinds are `element` today) and on the social-channel test (`motion` absent). The other three should already pass — that is fine and expected; they are regression locks.

- [ ] **Step 3: Implement**

Replace the loop in `lib/brain/offer.ts` (lines 40-49) with:

```ts
  const max = input.max ?? DEFAULT_MAX;
  const options: OfferOption[] = [];
  const seen = new Set<string>();
  const kinds = new Set<DeliverableKind>();
  const take = (c: Candidate) => {
    seen.add(c.id);
    kinds.add(DELIVERABLE_KIND[c.format]);
    options.push(toOption(c, input));
  };
  // Fill every row but the last by the plain rule: one row per FORM, best-ranked first. Two
  // rows of the same form would also break `chosenId`, which resolves by id alone
  // (lib/loop/manifest.ts:156, lib/loop/produce.ts:56) and would silently pick the first.
  for (const c of ordered) {
    if (options.length >= max - 1) break;
    if (seen.has(c.id)) continue;
    take(c);
  }
  // THE RESERVED ROW. Without it the offer is mono-format: the ranking's last tie-break puts
  // interactive ahead of static ahead of video, so on article-web all three rows were
  // interactive and on a social channel all three were static — 20 legal, unmarked, actually
  // buildable video candidates never surfaced. What separates rows for a journalist is not the
  // format but what they walk away with (an embeddable element, an mp4, a whole narrative
  // page), so the last row goes to the best-ranked candidate of a kind not already on the
  // table. If there is none, it falls back to the plain rule — the offer never shrinks because
  // of the reservation.
  if (options.length < max) {
    const reserved = ordered.find(
      (c) => !seen.has(c.id) && !kinds.has(DELIVERABLE_KIND[c.format]),
    );
    const fallback = ordered.find((c) => !seen.has(c.id));
    const last = reserved ?? fallback;
    if (last) take(last);
  }
```

Add the imports at the top of the file:

```ts
import { DELIVERABLE_KIND, type DeliverableKind } from "../core/vocabulary";
```

Note: `max - 1` is `0` when `max === 1`, so the first loop takes nothing and the reserved block takes the top-ranked candidate — which is the plain behaviour, exactly as the `max 1` test asserts.

- [ ] **Step 4: Run the brain suite**

Run: `bun test lib/brain/`
Expected: PASS, including every pre-existing offer/eligibility/rank/acceptance test.

- [ ] **Step 5: Prove it against the real KB, not only the fixtures**

Write `probe-reach.ts` at the repo root (temporary, deleted in the same step):

```ts
import "./lib/loop/engines";
import { buildOffer } from "./lib/brain/offer";
import { deriveFacts } from "./lib/brain/facts";
import { DELIVERABLE_KIND } from "./lib/core/vocabulary";

const facts = deriveFacts({
  columns: ["canton", "2019", "2024"],
  numericColumns: ["2019", "2024"],
  rowCount: 8,
});
for (const channel of ["article-web", "social-vertical"] as const) {
  const rows = buildOffer({ facts, channel, intents: ["change-over-time"] }).options;
  console.log(channel, rows.map((o) => `${o.id}/${o.format}(${DELIVERABLE_KIND[o.format]})`).join(" · "));
}
```

Run: `bun probe-reach.ts && rm probe-reach.ts`
Expected: each line contains at least one `(motion)` row. **Paste the two output lines into the commit body** — this is the measured evidence the spec's success criterion 1 asks for.

- [ ] **Step 6: Commit**

```bash
git add lib/brain/offer.ts lib/brain/offer.test.ts
git commit -m "feat(brain): the offer reserves its last row for an uncovered deliverable kind"
```

---

### Task 3: `producerForFormat` — who actually builds a format

**Files:**
- Modify: `lib/core/registry.ts` (append after `allProducers`)
- Test: `lib/core/registry.test.ts` (create if absent; otherwise append)

**Interfaces:**
- Consumes: `getProducer(name)`, `VisualFormat`.
- Produces: `export function producerForFormat(engine: string, format: VisualFormat): string`. Tasks 4 and 5 both call it.

**Context:** `skills/chart-native/scripts/produce.mjs:400` and `skills/map-native/scripts/produce.mjs:467` both REFUSE the `scrolly` format and name the `scrolly` producer as the one that hosts their track. `skills/image-native/src/manifest.ts:23` declares `formats: ["scrolly"]` — image-native builds its own scrolly and must NOT be redirected.

- [ ] **Step 1: Write the failing test**

Append to `lib/core/registry.test.ts`:

```ts
import { test, expect } from "bun:test";
import { producerForFormat } from "./registry";
import "../loop/engines"; // self-registers every engine manifest

test("scrolly is built by the scrolly producer hosting the engine's track", () => {
  expect(producerForFormat("chart-native", "scrolly")).toBe("scrolly");
  expect(producerForFormat("map-native", "scrolly")).toBe("scrolly");
});

test("an engine that declares the format builds it itself — image-native is not redirected", () => {
  expect(producerForFormat("image-native", "scrolly")).toBe("image-native");
});

test("every other pairing is the identity", () => {
  expect(producerForFormat("chart-native", "video")).toBe("chart-native");
  expect(producerForFormat("map-dw", "static")).toBe("map-dw");
  expect(producerForFormat("unknown-engine", "static")).toBe("unknown-engine");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/core/registry.test.ts`
Expected: FAIL — `producerForFormat` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/core/registry.ts`:

```ts
// The `scrolly` format belongs to no engine. skills/scrolly HOSTS its host engine's track,
// keeping that engine's own render key — the taxonomy the project already locked ("scrolly is
// the shared MECHANISM, not a peer engine; the format belongs to the host and inherits its
// furniture"). Both native produce scripts say the same thing at runtime by refusing the
// format and NAMING this producer (skills/chart-native/scripts/produce.mjs:400,
// skills/map-native/scripts/produce.mjs:467). This is that rule, machine-readable, so the
// proposal brain stops silently dropping a format it can legitimately offer.
const FORMAT_HOST: Partial<Record<VisualFormat, string>> = { scrolly: "scrolly" };

/** Which producer actually builds `format` for `engine`. */
export function producerForFormat(engine: string, format: VisualFormat): string {
  // An engine that declares the format builds it itself — image-native owns image-scrolly and
  // must not be handed to the scrolly producer, which has no type of its own.
  if (getProducer(engine)?.formats.includes(format)) return engine;
  return FORMAT_HOST[format] ?? engine;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `bun test lib/core/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/core/registry.ts lib/core/registry.test.ts
git commit -m "feat(core): producerForFormat — the scrolly format is built by its host producer"
```

---

### Task 4: Eligibility reads the EFFECTIVE producer

**Files:**
- Modify: `lib/brain/eligibility.ts:91-101` (the producer-format filter) and `:229-233` (the buildability mark)
- Test: `lib/brain/eligibility.test.ts` (append)

**Interfaces:**
- Consumes: `producerForFormat` (Task 3), `isLoopBuildable` / `unbuildableEngineReason` (`lib/loop/buildable.ts`, unchanged).
- Produces: no signature change.

**Why both sites, not just the filter:** if only the filter is redirected, a `chart-native` + `scrolly` candidate comes out **clean** — `isLoopBuildable("chart-native")` is true — while nothing can actually build it. That is the "loud offer of something that cannot be built" the file's own comment refuses.

- [ ] **Step 1: Write the failing tests**

Append to `lib/brain/eligibility.test.ts`:

```ts
test("a scrolly candidate is never clean — nothing can build it yet, and the offer says so", () => {
  const sheet = fakeSheet("fx-scrolly", {});
  sheet.formats = ["scrolly"];
  sheet.engines = { "chart-native": ["line"] };
  const { eligible: legal } = eligible(
    { facts: FACTS, channel: "article-web" },
    [{ sheet, engine: "chart-native", key: "line" }],
  );
  expect(legal.length).toBe(1);
  expect(legal[0]!.format).toBe("scrolly");
  expect(legal[0]!.readiness?.status).toBe("missing");
  expect(legal[0]!.readiness?.reason).toContain("scrolly");
});

test("a producer that genuinely lacks a format still loses it — map-dw has no video", () => {
  const sheet = fakeSheet("fx-dw-video", {});
  sheet.formats = ["video"];
  sheet.engines = { "map-dw": ["choropleth"] };
  const { eligible: legal, excluded } = eligible(
    { facts: FACTS, channel: "article-web" },
    [{ sheet, engine: "map-dw", key: "choropleth" }],
  );
  expect(legal).toEqual([]);
  expect(excluded.length).toBe(1);
});
```

If `eligibility.test.ts` has no `FACTS` constant or its `fakeSheet` returns a frozen object, mirror whatever the file already uses — read the top of the file first and reuse its own fixture helper rather than adding a second one.

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/brain/eligibility.test.ts`
Expected: FAIL — the first test gets `legal.length === 0` (the scrolly format is filtered out today).

- [ ] **Step 3: Implement**

In `lib/brain/eligibility.ts`, import the redirection:

```ts
import { getProducer, producerForFormat } from "../core/registry";
```

Replace the producer-format filter (currently lines 91-94) with:

```ts
    // The format's EFFECTIVE producer, not the sheet's engine: skills/scrolly hosts a native
    // engine's track, so a chart-native or map-native sheet declaring `scrolly` is built by
    // the scrolly producer and must not be dropped for a format its host engine never claims.
    const formats = channelFormats.filter((f) =>
      getProducer(producerForFormat(engine, f))?.formats?.includes(f) ?? true,
    );
```

Keep the `formats.length === 0` exclusion below it, but reword its message so it no longer claims the sheet's engine is the only renderer:

```ts
    if (formats.length === 0) {
      const renders = channelFormats
        .map((f) => `${f}: ${producerForFormat(engine, f)}`)
        .join(", ");
      exclude(
        sheet.id,
        `nothing renders this form in a format the ${input.channel} channel allows — the channel needs one of ${channelFormats.join(", ")} (${renders})`,
      );
      continue;
    }
```

Then, in `withMarks`, resolve the effective producer before the buildability check (currently lines 229-233):

```ts
  const builder = producerForFormat(c.engine, c.format);
  if (!isLoopBuildable(builder))
    marks.push({ status: "missing", reason: unbuildableEngineReason(builder) });
```

- [ ] **Step 4: Run the brain suite**

Run: `bun test lib/brain/`
Expected: PASS. If a pre-existing test asserted the old exclusion wording, update that assertion — the message genuinely changed, and the test should follow the code, not the reverse.

- [ ] **Step 5: Commit**

```bash
git add lib/brain/eligibility.ts lib/brain/eligibility.test.ts
git commit -m "feat(brain): eligibility filters and marks on the effective producer"
```

---

### Task 5: `produce` refuses with the same sentence the offer showed

**Files:**
- Modify: `lib/loop/produce.ts:74-80` (the `isLoopBuildable` guard)
- Test: `lib/loop/produce.test.ts` (append)

**Interfaces:**
- Consumes: `producerForFormat` (Task 3).
- Produces: no signature change.

**Why:** `lib/loop/buildable.ts`'s header states the invariant — the brain's mark and produce's refusal must be the SAME sentence. Task 4 moved the brain to the effective producer; produce must move with it, or a chosen scrolly option would be handed to `chart-native`, whose `produce.mjs` refuses it with a different, engine-internal message.

- [ ] **Step 1: Write the failing test**

Append to `lib/loop/produce.test.ts` (reuse the file's own manifest/run-dir fixture helpers — read the top of the file first):

```ts
test("a chosen scrolly option is refused with the mark's own sentence, never handed to chart-native", async () => {
  const { run, el, runDir } = makeRunWithChosenOption({
    id: "line",
    nativeType: "line",
    engine: "chart-native",
    format: "scrolly",
  });
  const res = await produce(run, el, runDir);
  expect(res.ok).toBe(false);
  if (res.ok) throw new Error("unreachable");
  expect(res.code).toBe("not-implemented");
  expect(res.message).toContain("scrolly");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/loop/produce.test.ts`
Expected: FAIL — today the guard passes (`chart-native` is buildable) and produce goes on to spawn the engine.

- [ ] **Step 3: Implement**

In `lib/loop/produce.ts`, import the redirection and resolve the builder before the guard:

```ts
import { producerForFormat } from "../core/registry";
```

```ts
  // The producer that would ACTUALLY build this — skills/scrolly hosts a native engine's track,
  // so a chart-native option in the scrolly format is not a chart-native build. Resolved the
  // same way lib/brain/eligibility.ts resolves it, so the refusal a journalist reads here is
  // the sentence the offer already showed them.
  const builder = producerForFormat(chosen.engine ?? "chart-native", chosen.format ?? "static");
  if (!isLoopBuildable(builder))
    return fail(
      "not-implemented",
      `produce: "${chosen.id}" is a ${builder} form (${chosen.format ?? "static"}) — ${unbuildableEngineReason(builder)}`,
    );
```

Delete the previous `isLoopBuildable(chosen.engine)` guard it replaces.

- [ ] **Step 4: Run the loop suite**

Run: `bun test lib/loop/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/produce.ts lib/loop/produce.test.ts
git commit -m "fix(loop): produce refuses on the effective producer, matching the offer's mark"
```

---

### Task 6: The scrolly dispatch gets a machine-readable set, and stops rendering unknown maps as choropleths

**Files:**
- Modify: `skills/scrolly/src/Scrolly.tsx` (export `CHART_SCROLLY_TYPES` at line 53; add `MAP_SCROLLY_TYPES` beside it; guard the map story branch; add the render-side flag beside `unsupportedChart` at line 291)
- Test: `skills/scrolly/tests/scrolly-types.test.ts` (create)

**Interfaces:**
- Produces: `export const CHART_SCROLLY_TYPES: Set<string>` and `export const MAP_SCROLLY_TYPES: Set<string>`. Task 7's drift test imports both.

**Context:** the story builder (`Scrolly.tsx:115-240`) dispatches `symbol → hex-grid → dot-density → locator → cartogram`, then **falls through to choropleth**. So a `route` config — a real `map-native` type with no scrolly branch — is silently rendered as a choropleth. The chart track already refuses an unsupported `nativeType` gracefully (`Scrolly.tsx:130`); this makes the map track symmetric.

- [ ] **Step 1: Write the failing test**

Create `skills/scrolly/tests/scrolly-types.test.ts`:

```ts
import { test, expect } from "bun:test";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "../src/Scrolly";

test("the chart track hosts exactly the three narrative chart types", () => {
  expect([...CHART_SCROLLY_TYPES].sort()).toEqual(["bar", "line", "scatter"]);
});

test("the map track hosts exactly the types the dispatch has a branch for", () => {
  expect([...MAP_SCROLLY_TYPES].sort()).toEqual([
    "cartogram",
    "choropleth",
    "dot-density",
    "hex-grid",
    "locator",
    "symbol",
  ]);
});

test("route is NOT hosted — it has no branch and would be drawn as a choropleth", () => {
  expect(MAP_SCROLLY_TYPES.has("route")).toBe(false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/scrolly && bun test tests/scrolly-types.test.ts`
Expected: FAIL — neither const is exported.

- [ ] **Step 3: Implement**

In `skills/scrolly/src/Scrolly.tsx`, replace line 53 with:

```ts
// The types each track actually hosts. EXPORTED because they are the source of truth for two
// readers that must never disagree: this dispatch, and the KB drift test that checks which
// sheets may declare the `scrolly` format.
export const CHART_SCROLLY_TYPES = new Set(["line", "bar", "scatter"]);
// `choropleth` is the dispatch's default branch (ScrollyMap + computeChoropleth), so it is
// hosted — but the default must not swallow types that are NOT. `route` has no branch and was
// being drawn as a choropleth: a wrong render, silently.
export const MAP_SCROLLY_TYPES = new Set([
  "symbol",
  "hex-grid",
  "dot-density",
  "locator",
  "cartogram",
  "choropleth",
]);
```

Then, in the `story` `useMemo`, immediately AFTER the `"nativeType" in config` block and BEFORE `if (config.type === "symbol")`, add:

```ts
    // Unsupported MAP type → an empty but valid story, mirroring the chart track above. Without
    // this the ternary chain's final `else` renders any unknown type as a choropleth.
    if (!MAP_SCROLLY_TYPES.has(config.type)) {
      return {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        visual: "map",
        steps: [],
      } as ReturnType<typeof mapStoryToChapters>;
    }
```

And beside `unsupportedChart` (around line 291) add:

```ts
  const unsupportedMap =
    !("visual" in config) && !("nativeType" in config) && !MAP_SCROLLY_TYPES.has(config.type)
      ? config.type
      : null;
```

Render it wherever `unsupportedChart` is already rendered — find that JSX and extend its condition to `unsupportedChart ?? unsupportedMap`, so an unknown map type shows the same clear message instead of an empty scaffold.

- [ ] **Step 4: Run the scrolly suite**

Run: `cd skills/scrolly && bun test`
Expected: PASS, including the pre-existing conformance/chapters suites.

- [ ] **Step 5: Verify at the RENDER, not only in the tests**

The spec's §13 requires this: a unit test cannot show that a real map scrolly still draws. Render one known-good map scrolly and open it.

Run: `cd skills/scrolly && bun scripts/produce.mjs <a known-good choropleth or symbol scrolly config> /tmp/scrolly-check scrolly`
(the exact fixture config lives beside the existing scrolly tests — reuse one they already load rather than authoring a new one)
Expected: `scrolly.html` produced; opened in a browser the map draws and the beats read. **Record what you rendered and what you saw in the commit body.** If it does not draw, STOP and report — do not adjust the test to match.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/Scrolly.tsx skills/scrolly/tests/scrolly-types.test.ts
git commit -m "fix(scrolly): export the hosted-type sets and refuse an unknown map type"
```

---

### Task 7: The KB declares the scrolly format, and a drift test keeps it honest

**Files:**
- Modify (frontmatter `formats` only, one line each):
  - `knowledge/references/chart/types/line.md`
  - `knowledge/references/chart/types/bar.md`
  - `knowledge/references/chart/types/scatter.md`
  - `knowledge/references/map/types/choropleth.md`
  - `knowledge/references/map/types/symbol.md`
  - `knowledge/references/map/types/hex-grid.md`
  - `knowledge/references/map/types/dot-density.md`
  - `knowledge/references/map/types/locator.md`
  - `knowledge/references/map/types/cartogram.md`
- Test: `skills/scrolly/tests/kb-scrolly-drift.test.ts` (create)

**Interfaces:**
- Consumes: `CHART_SCROLLY_TYPES`, `MAP_SCROLLY_TYPES` (Task 6); `loadTypology()` (`lib/brain/typology.ts`).
- Produces: nothing new.

**Context:** only ONE sheet of 45 declares `scrolly` today (`image/types/image-scrolly.md`), while the BODY of several map sheets documents shipped scrolly components (`dot-density.md:201-202`, `cartogram.md:191-204`, `hex-grid.md:143-145`). This task moves that knowledge from prose into the facets. `route.md` deliberately does NOT get it.

**Where this test lives, and why (decided before execution):** it goes in `skills/scrolly/tests/`, NOT beside its DRIFT 1/2 siblings in `lib/brain/`. The Global Constraint forbids `lib/ → skills/`; the reverse direction is the normal one and already practised (`skills/scrolly/src/manifest.ts` imports `lib/core/registry`). So the test reads the engine's exported sets directly and imports `loadTypology` from `lib`. `skills/scrolly` is already in the gate's `TEST_DIRS`. Do NOT put this test in `lib/brain/typology-drift.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `skills/scrolly/tests/kb-scrolly-drift.test.ts`:

```ts
import { test, expect } from "bun:test";
import { loadTypology } from "../../../lib/brain/typology";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "../src/Scrolly";

test("DRIFT 3: a sheet may declare the scrolly format exactly when a track hosts its type", () => {
  const hosted = new Set([
    ...CHART_SCROLLY_TYPES,
    ...MAP_SCROLLY_TYPES,
    "image-scrolly", // image-native builds its own scrolly (manifest.ts:23)
  ]);
  const declares: string[] = [];
  for (const sheet of loadTypology())
    if (sheet.formats.includes("scrolly")) declares.push(sheet.id);
  // Both directions: nothing declares it without a host, nothing hosted lacks the declaration.
  expect(declares.filter((id) => !hosted.has(id))).toEqual([]);
  expect([...hosted].filter((id) => !declares.includes(id))).toEqual([]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/scrolly && bun test tests/kb-scrolly-drift.test.ts`
Expected: FAIL — the second assertion lists the 9 hosted types whose sheets do not declare `scrolly`.

- [ ] **Step 3: Amend the nine sheets**

In each of the nine files, append `scrolly` to the frontmatter `formats` list. Example, `knowledge/references/map/types/dot-density.md`:

```yaml
formats: [static, interactive, video, scrolly]
```

Change ONLY that line. Do not touch the body, the limits, the intents, or `route.md`.

- [ ] **Step 4: Run it and watch it pass**

Run: `cd skills/scrolly && bun test && cd ../.. && bun test lib/brain/`
Expected: PASS both. `DRIFT 1` and `DRIFT 2` in `lib/brain/typology-drift.test.ts` must still pass — the render keys are untouched.

- [ ] **Step 5: Verify the format is now genuinely reachable**

Write a temporary probe at the repo root:

```ts
import "./lib/loop/engines";
import { eligible } from "./lib/brain/eligibility";
import { deriveFacts } from "./lib/brain/facts";

const facts = deriveFacts({ columns: ["c", "a", "b"], numericColumns: ["a", "b"], rowCount: 8 });
const { eligible: legal } = eligible({ facts, channel: "article-web" });
const scrolly = legal.filter((c) => c.format === "scrolly");
console.log("scrolly candidates:", scrolly.length);
console.log("all marked:", scrolly.every((c) => c.readiness?.status === "missing"));
```

Run it, then delete it. Expected: **more than one** candidate (it was 1 before), and `all marked: true`. Paste both lines into the commit body.

- [ ] **Step 6: Commit**

```bash
git add knowledge/references skills/scrolly/tests/kb-scrolly-drift.test.ts
git commit -m "feat(kb): nine sheets declare the scrolly format, locked by a drift test"
```

---

### Task 8: `requestedFormat` — the hard filter in the legal layer

**Files:**
- Modify: `lib/brain/eligibility.ts` (`EligibilityInput`, the return type of `eligible`, and the check right after the channel-format filter)
- Modify: `lib/brain/offer.ts` (`Offer` gains `refusal?`, `buildOffer` passes it through)
- Test: `lib/brain/eligibility.test.ts`, `lib/brain/offer.test.ts` (append)

**Interfaces:**
- Consumes: `isFormatAllowed`, `allowedFormats` (`lib/core/channel-policy.ts`).
- Produces: `EligibilityInput.requestedFormat?: VisualFormat`; `eligible()` returns `{ eligible, excluded, refusal? }`; `Offer` becomes `{ options, excluded, refusal?: string }`. Task 9 sets the field from the manifest.

**Why this is legality and not ranking:** a requested format is a FACT of the run, not an intent read from prose. Wave 7 locked "an explicit journalist format signal WINS"; making it a ranking nudge would reduce a locked decision to a fallible one. Nothing semantic enters `eligibility.ts` — the constraint is measurable.

- [ ] **Step 1: Write the failing tests**

Append to `lib/brain/eligibility.test.ts`:

```ts
test("a requested format is a hard filter — only that format survives", () => {
  const { eligible: legal } = eligible({
    facts: FACTS,
    channel: "article-web",
    requestedFormat: "video",
  });
  expect(legal.length).toBeGreaterThan(0);
  expect(legal.every((c) => c.format === "video")).toBe(true);
});

test("a requested format the channel forbids is refused by name, with no exclusion spam", () => {
  const res = eligible({
    facts: FACTS,
    channel: "social-vertical",
    requestedFormat: "scrolly",
  });
  expect(res.eligible).toEqual([]);
  expect(res.excluded).toEqual([]);
  expect(res.refusal).toContain("social-vertical");
  expect(res.refusal).toContain("scrolly");
});

test("a form that does not come in the requested format is excluded with its own reason", () => {
  const sheet = fakeSheet("fx-static-only", {});
  sheet.formats = ["static"];
  const res = eligible(
    { facts: FACTS, channel: "article-web", requestedFormat: "video" },
    [{ sheet, engine: "fake-engine", key: "fake-key" }],
  );
  expect(res.eligible).toEqual([]);
  expect(res.excluded.length).toBe(1);
  expect(res.excluded[0]!.reason).toContain("video");
});
```

Append to `lib/brain/offer.test.ts`:

```ts
test("a refusal rides on the offer, and there is nothing to choose", () => {
  const offer = buildOffer({ ...INPUT, channel: "social-vertical", requestedFormat: "scrolly" });
  expect(offer.options).toEqual([]);
  expect(offer.refusal).toBeTruthy();
});

test("a requested format makes every row that format — no interactive default sneaks back", () => {
  const offer = buildOffer({ ...INPUT, requestedFormat: "video" });
  expect(offer.options.length).toBeGreaterThan(0);
  expect(offer.options.every((o) => o.format === "video")).toBe(true);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/brain/`
Expected: FAIL — `requestedFormat` is not a known property of `EligibilityInput` (a type error at the call site is a legitimate red).

- [ ] **Step 3: Implement**

In `lib/brain/eligibility.ts`, add to `EligibilityInput`:

```ts
  /** A format the journalist asked for explicitly. A FACT of the run, not an intent read from
   *  prose — so it constrains legality, not order (CLAUDE.md, Wave 7: "an explicit journalist
   *  format signal WINS"). Absent ⇒ no constraint. */
  requestedFormat?: VisualFormat;
```

Widen the return type of `eligible` to `{ eligible: Candidate[]; excluded: Excluded[]; refusal?: string }`, and add, as the FIRST thing the function does:

```ts
  // A format the channel does not allow is one refusal about the run, not 45 identical
  // refusals about 45 sheets. Named loudly; never silently downgraded to the default.
  if (input.requestedFormat && !isFormatAllowed(input.channel, input.requestedFormat))
    return {
      eligible: [],
      excluded: [],
      refusal: `you asked for a ${input.requestedFormat}, and the ${input.channel} channel does not carry that format — it allows ${allowedFormats(input.channel).join(", ")}`,
    };
```

Import `allowedFormats` alongside the existing `isFormatAllowed`.

Inside the per-sheet loop, right AFTER `channelFormats` is computed and its emptiness handled, narrow it:

```ts
    // The requested format, applied per sheet: a form that does not come in it is excluded
    // with a reason of its own, which is genuinely useful information.
    if (input.requestedFormat && !channelFormats.includes(input.requestedFormat)) {
      exclude(
        sheet.id,
        `you asked for a ${input.requestedFormat}, and this form does not come in that format (it comes in ${sheet.formats.join(", ")})`,
      );
      continue;
    }
    const wanted = input.requestedFormat
      ? channelFormats.filter((f) => f === input.requestedFormat)
      : channelFormats;
```

…then use `wanted` in place of `channelFormats` in the producer-format filter from Task 4 (both the `.filter` and the message that lists what the channel needs).

In `lib/brain/offer.ts`, widen the type and pass it through:

```ts
export type Offer = { options: OfferOption[]; excluded: Excluded[]; refusal?: string };
```

```ts
  const { eligible: legal, excluded, refusal } = eligible(input, pairs);
  ...
  return { options, excluded, ...(refusal ? { refusal } : {}) };
```

- [ ] **Step 4: Run the brain suite**

Run: `bun test lib/brain/`
Expected: PASS.

- [ ] **Step 5: Lock the empty-offer path in `phrase`**

Append to `lib/loop/phrase.test.ts`:

```ts
test("a refused offer is refused LOUD by phrasing — a refusal never travels as a why", () => {
  const run = makeRunWithProposal([]); // reuse the file's own fixture helper
  expect(() => applyPhrasing(run, "el-1", [])).toThrow(/no offer to phrase/);
});
```

Run: `bun test lib/loop/phrase.test.ts`
Expected: PASS **without changing `phrase.ts`** — `lib/loop/phrase.ts:57` already throws, and that is the intended behaviour. This test exists to keep it that way.

- [ ] **Step 6: Commit**

```bash
git add lib/brain/eligibility.ts lib/brain/offer.ts lib/brain/eligibility.test.ts lib/brain/offer.test.ts lib/loop/phrase.test.ts
git commit -m "feat(brain): an explicitly requested format is a hard legality filter"
```

---

### Task 9: Thread `requestedFormat` from the manifest, and make CADRAGE record it

**Files:**
- Modify: `lib/loop/manifest.ts` (`RunElementSchema`, around line 48)
- Modify: `lib/loop/propose.ts` (the `buildOffer` call)
- Modify: `skills/splash/SKILL.md` (the Stage-2 format-signal paragraph, around line 303)
- Test: `lib/loop/manifest.test.ts`, `lib/loop/propose.test.ts` (append)

**Interfaces:**
- Consumes: `EligibilityInput.requestedFormat` (Task 8).
- Produces: `RunElement.requestedFormat?: VisualFormat`.

**Design note:** flat on the element, not nested in a `request` object — it is the only such field, and YAGNI. On the ELEMENT and not the run because the channel is already run-level and one run may carry several elements with different format intentions. Optional ⇒ **no `schemaVersion` bump**; manifests written before this task stay readable.

- [ ] **Step 1: Write the failing tests**

Append to `lib/loop/manifest.test.ts`:

```ts
test("an element may carry an explicitly requested format, and a manifest without one still loads", () => {
  const withFormat = parseManifest({ ...FIXTURE, elements: [{ ...FIXTURE.elements[0], requestedFormat: "video" }] });
  expect(withFormat.elements[0]!.requestedFormat).toBe("video");
  const without = parseManifest(FIXTURE);
  expect(without.elements[0]!.requestedFormat).toBeUndefined();
});

test("a requested format outside the vocabulary is refused at parse time", () => {
  expect(() =>
    parseManifest({ ...FIXTURE, elements: [{ ...FIXTURE.elements[0], requestedFormat: "gif" }] }),
  ).toThrow();
});
```

(Use whatever the file already calls its parse entry point and its fixture — read the top of the file first.)

Append to `lib/loop/propose.test.ts`:

```ts
test("the element's requested format reaches the brain — every option honours it", () => {
  const run = makeRunWithProfile();
  run.elements[0]!.requestedFormat = "video";
  const { options } = propose(run);
  expect(options.length).toBeGreaterThan(0);
  expect(options.every((o) => o.format === "video")).toBe(true);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/loop/`
Expected: FAIL — the field is stripped by the schema and never reaches `buildOffer`.

- [ ] **Step 3: Implement**

In `lib/loop/manifest.ts`, add to `RunElementSchema` (right after `id`):

```ts
  // A format the journalist asked for explicitly, at CADRAGE. State, not a remembered
  // instruction: the brain applies it as a HARD filter (lib/brain/eligibility.ts), which is
  // what makes "an explicit format signal WINS" mechanical rather than documentary.
  requestedFormat: z.enum(VISUAL_FORMATS).optional(),
```

Import `VISUAL_FORMATS` from `../core/vocabulary` if it is not already imported.

In `lib/loop/propose.ts`, add to the `buildOffer` call:

```ts
    ...(el?.requestedFormat ? { requestedFormat: el.requestedFormat } : {}),
```

In `skills/splash/SKILL.md`, in the Stage-2 paragraph that already says *"An explicit journalist format signal (« une image statique », « pour le print ») WINS over the default"*, append:

```markdown
Recording it is what makes it win: write that format to the element's `requestedFormat` on the run
manifest BEFORE the proposal is built. The brain then filters the whole offer down to it and names
a refusal if the channel does not carry it — an unrecorded signal is a signal the offer never sees.
```

- [ ] **Step 4: Run the loop suite**

Run: `bun test lib/loop/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/propose.ts lib/loop/manifest.test.ts lib/loop/propose.test.ts skills/splash/SKILL.md
git commit -m "feat(loop): thread the journalist's requested format from the manifest to the brain"
```

---

### Task 10: The end-to-end proof — a real mp4 out of the loop

**Files:**
- Test: `lib/loop/video-e2e.test.ts` (create)
- Modify: `docs/splash/CHANGELOG.md` (record the proof)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing importable — this task's deliverable is evidence.

**Why opt-in:** a Remotion render takes minutes; the gate must stay fast. The pattern already exists in this repo (the live-proof test that shows as `1 skip` in the `lib` suite). But it MUST be run once, by hand, during this task — the project's own lesson is that *a live proof on a fixture does not prove the real path* (that is exactly what let "every artifact served as HTML" through).

**Environment prerequisite (not a defect):** `cd skills/chart-native && bun install`.

- [ ] **Step 1: Write the test**

Create `lib/loop/video-e2e.test.ts`:

```ts
import { test, expect } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DELIVERABLE_KIND } from "../core/vocabulary";

// Opt-in: a real Remotion render, minutes long. Run it with SPLASH_VIDEO_E2E=1.
const RUN = process.env.SPLASH_VIDEO_E2E === "1";

test.skipIf(!RUN)(
  "a chosen motion row produces a real mp4 under the run dir",
  async () => {
    // 1. Build a run whose frozen input is a real CSV (reuse the fixture the other loop e2e
    //    tests already freeze — do NOT author a new dataset).
    // 2. propose() → find the option whose DELIVERABLE_KIND is "motion", set it as chosenId.
    // 3. produce() → assert ok.
    // 4. Assert the artifact is a real .mp4 on disk, of non-trivial size.
    const { run, el, runDir } = await makeProducibleRun();
    const { options } = propose(run);
    const motion = options.find((o) => DELIVERABLE_KIND[o.format!] === "motion");
    expect(motion, "the offer must contain a motion row").toBeDefined();
    el.proposal = { options, excluded: [], chosenId: motion!.id };

    const res = await produce(run, el, runDir);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(res.message);

    const artifact = join(runDir, res.value.artifact!.path);
    expect(existsSync(artifact)).toBe(true);
    expect(artifact.endsWith(".mp4")).toBe(true);
    expect(statSync(artifact).size).toBeGreaterThan(50_000);
    expect(res.value.artifact!.provenanceHash.length).toBeGreaterThan(0);
  },
  20 * 60 * 1000,
);
```

Replace `makeProducibleRun`, `propose` and `produce` with the real imports and the real fixture helper the neighbouring loop tests use — read `lib/loop/driver.test.ts` (or whichever file already drives a full produce) and reuse its setup verbatim rather than inventing one.

- [ ] **Step 2: Run the gate suite and confirm it SKIPS**

Run: `bun test lib/loop/video-e2e.test.ts`
Expected: 1 skipped, 0 failed. The gate stays fast.

- [ ] **Step 3: Run it for real, once**

Run: `cd skills/chart-native && bun install && cd ../.. && SPLASH_VIDEO_E2E=1 bun test lib/loop/video-e2e.test.ts`
Expected: PASS. If it fails, STOP and report the exact output — do not weaken the assertions.

- [ ] **Step 4: Record the evidence**

Note in `docs/splash/CHANGELOG.md`, under a dated entry for this slice: the artifact path, its byte size, and the wall-clock render time you observed. One or two lines. This is the spec's success criterion 4 — an unrecorded proof is not a proof.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/video-e2e.test.ts docs/splash/CHANGELOG.md
git commit -m "test(loop): opt-in end-to-end proof that a chosen motion row renders a real mp4"
```

---

### Task 11: Full gate, and the measured success criteria

**Files:** none modified unless the gate finds something.

- [ ] **Step 1: Run the whole gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-reach && bun run check`
Expected: every check PASS. If `skills/map-native`'s interactive produce times out, re-run that directory alone — it is a known contention flake (CLAUDE.md), not a regression. Anything else that fails is yours.

- [ ] **Step 2: Re-measure criterion 6 — the default path is unchanged**

Check out the pre-slice offer behaviour and compare: on `feat/proposal-brain`, run the Task 2 probe; on this branch, run it with the reserved row disabled (temporarily set `max - 1` to `max`). The first two rows must be identical, id for id. Report the comparison — do not commit the temporary change.

- [ ] **Step 3: Write the closing summary**

In the commit body, state each of the spec's six success criteria and how it was verified: the probe output (1), the requested-format tests (2), the scrolly candidate count (3), the mp4 path and size (4), the gate line (5), the row-for-row comparison (6).

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: format-reach slice verified against its success criteria"
```

---

## Self-Review

**Spec coverage.** §3 → Task 1. §4 → Task 2. §5.1 → Task 9. §5.2 → Task 8. §5.3 → Task 9. §6.1 → Task 3. §6.2 → Tasks 4 and 5. §6.3 → Task 7 (drift test in skills/scrolly/tests, per the pre-flight ruling). §6.4 → Task 6. §7 (nothing moves) → asserted by the regression locks in Tasks 2, 4 and 11 step 2. §8 → the error table is covered by Tasks 4, 5, 8. §9 tests 1-10 → Tasks 1, 2, 3, 4, 6, 7, 8, 9. §10 → Task 10. §11 → Task 11. §12/§13 → Global Constraints and Task 6 step 5.

**Known gaps the implementer must close by reading, not guessing.** Three tasks reuse fixture helpers this plan names but does not reproduce (`fakeSheet`/`FACTS` in `eligibility.test.ts`, `makeRunWithChosenOption` in `produce.test.ts`, `makeProducibleRun` in the loop e2e tests). That is deliberate: inventing a second fixture where one exists is the more expensive mistake. Read the neighbouring test file's top before writing.

**Type consistency.** `DELIVERABLE_KIND` / `DeliverableKind` (Task 1) are used under those exact names in Tasks 2 and 10. `producerForFormat(engine, format)` (Task 3) is called with that signature in Tasks 4 and 5. `Offer.refusal` (Task 8) is read in Task 8's own offer tests only. `RunElement.requestedFormat` (Task 9) matches `EligibilityInput.requestedFormat` (Task 8). `CHART_SCROLLY_TYPES` / `MAP_SCROLLY_TYPES` (Task 6) are imported under those names in Task 7.

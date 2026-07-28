# Engine Assemblers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The editorial loop can assemble a spec for all six engines, so a journalist who chooses a map, a scrolly, an image sequence or a Datawrapper form gets an artifact instead of `not-implemented`.

**Architecture:** One assembler module per engine under `lib/loop/assemble/`, each a pure function from a flat `ProductionBrief` (composed once by `produce()`) to the spec that engine's own `validate` accepts. A table of those assemblers replaces the hand-written `LOOP_BUILDABLE_ENGINES` list, so "buildable" becomes a consequence of the code rather than a promise someone has to remember. Everything downstream — the registry, the `render` verb, the subprocess/in-process dispatch — already exists and is untouched.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod (manifest schema) · Playwright (render proofs) · Remotion (video) · MapTiler + Datawrapper (hosted / keyed engines).

**Spec:** `docs/superpowers/specs/2026-07-27-engine-assemblers-design.md`

## Global Constraints

- **Runtime is Bun.** Never `npm`, never `node`. Tests are `bun:test`.
- **Code, comments, identifiers, commit messages: English.** Non-negotiable, whatever the language of the conversation.
- **No mention of Claude / Anthropic** in any commit, doc, or published artifact.
- **TDD.** The failing test is written and *run* before the implementation, every task.
- **Invariant I1 — a verb never throws.** Assemblers return `VerbResult`; a throw is a bug.
- **Layering.** `lib/core` imports neither `lib/loop` nor `skills/`. `lib/loop` may import both. Engine-owned validators are imported directly from the engine, never re-implemented.
- **Verify at the render, never at a grep of a built bundle.** A single-file bundle inlines the whole palette registry; grepping it is not evidence. Open the artifact.
- **A key enters `ASSEMBLERS` only in the same commit as its proof.** Adding a key promises the brain the form can be offered unmarked.
- **Per-task verification is scoped**, because the full gate's Datawrapper suites need network: `cd <dir> && bunx tsc --noEmit` and `cd <dir> && bun test`. The full `bun run check` (22 checks) runs once, in Task 14.
- **Two basemaps ship**: `world` (join key `iso_a3`) and `us-states` (join key `postal`), in `skills/map-native/assets/geo/`. No task adds a third.

---

## File Structure

**Created**

| file | responsibility |
|---|---|
| `lib/core/production-brief.ts` | the `ProductionBrief` / `GeoMatch` / `ImageInput` types + the `Assembler` signature. Types only, no logic — so `lib/core` keeps importing nothing. |
| `lib/loop/assemble/brief.ts` | `briefFor(...)` — composes a brief from the run, the element, the CSV and the source verdict. |
| `lib/loop/assemble/chart-native.ts` | the assembler moved out of `produce.ts`. |
| `lib/loop/assemble/map-native.ts` | the region-family and point-family map assemblers. |
| `lib/loop/assemble/scrolly.ts` | composes chart-native's or map-native's output, plus beats. |
| `lib/loop/assemble/image-native.ts` | the `ImageStory` assembler. |
| `lib/loop/assemble/dw-chart.ts` | the `ChartSpec` assembler. |
| `lib/loop/assemble/map-dw.ts` | the `MapSpec` assembler. |
| `lib/loop/assemble/index.ts` | the `ASSEMBLERS` table — the one place a moteur becomes buildable. |
| `skills/map-native/src/geo-match.ts` | matches a data column against a shipped basemap's join key. Lives in the engine because the basemaps are the engine's. |
| `lib/loop/assemble/*.test.ts` | one unit suite per assembler. |
| `lib/loop/map-e2e.test.ts` | opt-in map render proof. |
| `lib/loop/image-e2e.test.ts` | opt-in image-scrolly render proof. |
| `lib/loop/dw-e2e.test.ts` | opt-in Datawrapper proof (both DW engines). |

**Modified**

| file | change |
|---|---|
| `lib/loop/produce.ts:90-152` | `assembleNativeSpec` + `narrativeBeatsFor` + `NarrativeBeatSpec` move out; `produce()` composes a brief and calls the table; dispatch switches to `resolveBuilder`. |
| `lib/loop/buildable.ts:34-40` | `LOOP_BUILDABLE_ENGINES` derived from `ASSEMBLERS`; `isLoopBuildable` becomes type-aware. |
| `lib/loop/orient.ts` | `OrientResult` gains `geo`. |
| `lib/loop/manifest.ts:241-247` | the persisted `orient` object gains `geo`; `input` gains `images`. |
| `lib/loop/init.ts` | the run declaration accepts an image input. |
| `skills/scrolly/src/Scrolly.tsx:588` | a real root element carrying `data-splash-root` (residual A34). |
| `scripts/proofs.mjs` | the three new proofs join the roster. |
| `docs/splash/residuals.md` | A34 struck. |

---

## Task 1: `ProductionBrief` — the named payload an assembler receives

**Files:**
- Create: `lib/core/production-brief.ts`
- Create: `lib/loop/assemble/brief.ts`
- Test: `lib/loop/assemble/brief.test.ts`

**Interfaces:**
- Consumes: `VerbResult` / `ok` / `fail` from `lib/core/verbs`, `ArcRole` from `lib/core/claim-arc`, `VisualFormat` from `lib/core/vocabulary`, `RunManifest` / `RunElement` / `chosenOption` from `lib/loop/manifest`.
- Produces: `ProductionBrief`, `BriefBeat`, `GeoMatch`, `ImageInput`, `Assembler` (all from `lib/core/production-brief`); `briefFor(run, el, dataCsv, attribution, sourceUrl, format)` from `lib/loop/assemble/brief`.

- [ ] **Step 1: Write the failing test**

`lib/loop/assemble/brief.test.ts`:

```ts
import { test, expect } from "bun:test";
import { briefFor } from "./brief";
import type { RunManifest } from "../manifest";

const RUN: RunManifest = {
  version: 4,
  runId: "r1",
  channel: "article-web",
  input: { data: { path: "data.csv", sha256: "x" } },
  elements: [
    {
      id: "e1",
      angle: {
        confirmedTakeaway: "Summer sea ice has lost a third of its extent",
        altInsight: "A line falling from 7 to 4.3 million square kilometres",
        unit: "million km²",
        emphasis: "2007",
      },
      proposal: {
        chosenId: "o1",
        options: [
          { id: "o1", nativeType: "line", engine: "chart-native", format: "static", why: "a trend over time" },
        ],
      },
    },
  ],
  events: [],
} as unknown as RunManifest;

test("the brief carries the angle, the pinned format and the credit — and nothing ambient", () => {
  const brief = briefFor(RUN, RUN.elements[0]!, "year,extent\n1979,7", "NSIDC", "https://nsidc.org", "static");
  expect(brief.elementId).toBe("e1");
  expect(brief.nativeType).toBe("line");
  expect(brief.format).toBe("static");
  expect(brief.angle.confirmedTakeaway).toBe("Summer sea ice has lost a third of its extent");
  expect(brief.angle.emphasis).toBe("2007");
  expect(brief.attribution).toBe("NSIDC");
  expect(brief.sourceUrl).toBe("https://nsidc.org");
  expect(brief.dataCsv).toContain("1979,7");
  expect(brief.beats).toBeUndefined();
  // The manifest itself is NOT reachable from a brief: an assembler cannot go looking
  // for ambient state it was not handed.
  expect(Object.keys(brief)).not.toContain("run");
});

test("an element with a narrative plan carries its beats, anchor kind preserved", () => {
  const el = {
    ...RUN.elements[0]!,
    narrative: {
      beats: [
        { id: "b1", anchor: { kind: "x", value: "1979" }, role: "setup", text: "It held on 7 million km²." },
        { id: "b2", anchor: { kind: "category", value: "Basel" }, role: "turn", text: "Then Basel broke away." },
      ],
    },
  } as unknown as RunManifest["elements"][number];
  const brief = briefFor(RUN, el, "year,extent\n1979,7", "NSIDC", undefined, "scrolly");
  expect(brief.beats).toEqual([
    { x: "1979", role: "setup", text: "It held on 7 million km²." },
    { category: "Basel", role: "turn", text: "Then Basel broke away." },
  ]);
});
```

- [ ] **Step 2: Run it and watch it fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/brief.test.ts
```
Expected: FAIL — `Cannot find module './brief'`.

- [ ] **Step 3: Write the types**

`lib/core/production-brief.ts`:

```ts
// WHAT AN ASSEMBLER RECEIVES — flat, named, and deliberately not the manifest.
//
// Two reasons it is flat, both measured (design spec §3.1):
//   1. lib/core imports neither lib/loop nor skills/, so a brief typed on RunManifest could
//      not live here — and here is where it belongs, since the engines are lib/core's subject.
//   2. assembleNativeSpec's `run` parameter was already DEAD: the signature took it, the body
//      never read it. An assembler handed the whole manifest can reach for ambient state; one
//      handed a brief cannot. That is invariant I2 ("the contract carries no ambient state"),
//      applied one layer earlier.
//
// Every field is JSON-serializable, like the render payload it ends up feeding.
import type { VerbResult } from "./verbs";
import type { VisualFormat } from "./vocabulary";
import type { ArcRole } from "./claim-arc";

/** A narrative beat in the shape the engines want: the anchor's KIND picks the field, so a
 *  plan drafted for a line (x) can never arrive shaped like a bar walk (category). */
export type BriefBeat = {
  x?: string;
  category?: string;
  role: ArcRole;
  text: string;
};

/** What the data's geography turned out to be, measured against the shipped basemaps.
 *  `unmatched` is the point of the type: a partial join is SHOWN, never silently mapped. */
export type GeoMatch = {
  column: string;
  basemap: string;
  matched: number;
  total: number;
  unmatched: string[];
};

/** The journalist's own photographs, declared with the run. Splash never generates an image,
 *  and never writes an alt or a credit — both are asked for and carried here verbatim. */
export type ImageInput = {
  dir: string;
  frames: {
    frameRef: string;
    alt: string;
    credit: { name: string; url?: string };
  }[];
};

export type ProductionBrief = {
  elementId: string;
  nativeType: string;
  format: VisualFormat;
  angle: {
    confirmedTakeaway: string;
    altInsight: string;
    unit?: string;
    emphasis?: string;
  };
  dataCsv: string;
  attribution: string;
  sourceUrl?: string;
  beats?: BriefBeat[];
  geo?: GeoMatch;
  images?: ImageInput;
};

/** One per engine. NEVER throws (invariant I1) — a spec it cannot compose comes back as a
 *  refusal naming what is missing, in the journalist's words. */
export type Assembler = (brief: ProductionBrief) => VerbResult<unknown>;
```

- [ ] **Step 4: Write the composition**

`lib/loop/assemble/brief.ts`:

```ts
import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import type { VisualFormat } from "../../core/vocabulary";
import { chosenOption, type RunManifest, type RunElement } from "../manifest";

function beatsFor(el: RunElement): BriefBeat[] {
  return (el.narrative?.beats ?? []).map((b) => ({
    ...(b.anchor.kind === "x" ? { x: b.anchor.value } : { category: b.anchor.value }),
    role: b.role,
    text: b.text,
  }));
}

/**
 * The manifest element, flattened into the payload an assembler is allowed to see.
 *
 * Composed AFTER every gate of produce() (declared source, authored beats, pinned format,
 * resolved channel), so an assembler re-validates nothing — it translates.
 *
 * The angle's parts fall back to "" rather than refusing, exactly as assembleNativeSpec did:
 * produce() has already required an angle, and a second refusal here would be a second place
 * to keep in step. A caller reaching it without one gets a spec the engine's own validator
 * rejects (a blank title fails hard at conformance) — loud, not silent.
 */
export function briefFor(
  run: RunManifest,
  el: RunElement,
  dataCsv: string,
  attribution: string,
  sourceUrl: string | undefined,
  format: VisualFormat,
): ProductionBrief {
  const chosen = chosenOption(el);
  return {
    elementId: el.id,
    nativeType: chosen?.nativeType ?? "",
    format,
    angle: {
      confirmedTakeaway: el.angle?.confirmedTakeaway ?? "",
      altInsight: el.angle?.altInsight ?? "",
      ...(el.angle?.unit ? { unit: el.angle.unit } : {}),
      ...(el.angle?.emphasis ? { emphasis: el.angle.emphasis } : {}),
    },
    dataCsv,
    attribution,
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(el.narrative ? { beats: beatsFor(el) } : {}),
    ...(run.orient?.geo ? { geo: run.orient.geo } : {}),
    ...(run.input.images ? { images: run.input.images } : {}),
  };
}
```

> `run.orient?.geo` and `run.input.images` do not exist yet (Tasks 4 and 10 add them). For THIS
> task, omit those two spread lines entirely and add them back in their own tasks — a plan that
> asks you to reference a field no schema declares is asking you to write code that will not
> typecheck. The two lines are shown here so you recognise them when their task arrives.

- [ ] **Step 5: Run the tests**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble && bunx tsc --noEmit
```
Expected: PASS, and a clean typecheck of `lib`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/production-brief.ts lib/loop/assemble/
git commit -m "feat(loop): name what an engine assembler receives"
```

---

## Task 2: Move chart-native's assembler behind the table — byte-identical

**Files:**
- Create: `lib/loop/assemble/chart-native.ts`
- Create: `lib/loop/assemble/index.ts`
- Create: `lib/loop/assemble/chart-native.test.ts`
- Modify: `lib/loop/produce.ts:90-152` (remove `assembleNativeSpec`, `narrativeBeatsFor`, `NarrativeBeatSpec`), `lib/loop/produce.ts:303` (call the table)
- Modify: `lib/loop/buildable.ts:34-40`
- Modify: `lib/loop/beats-render-proof.test.ts:151`, `lib/loop/produce.test.ts:629,652`

**Interfaces:**
- Consumes: `ProductionBrief`, `Assembler` (Task 1), `briefFor` (Task 1).
- Produces: `assembleChartNative(brief)`, `ASSEMBLERS: Record<string, Assembler>`, and a `LOOP_BUILDABLE_ENGINES` that is now `Object.keys(ASSEMBLERS)`.

- [ ] **Step 1: Write the failing test — the move must not change one field**

`lib/loop/assemble/chart-native.test.ts`:

```ts
import { test, expect } from "bun:test";
import { assembleChartNative } from "./chart-native";
import type { ProductionBrief } from "../../core/production-brief";

const BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "line",
  format: "static",
  angle: {
    confirmedTakeaway: "Summer sea ice has lost a third of its extent",
    altInsight: "A line falling from 7 to 4.3 million square kilometres",
    unit: "million km²",
    emphasis: "2007",
  },
  dataCsv: "year,extent\n1979,7.0\n2025,4.3",
  attribution: "NSIDC Sea Ice Index",
  sourceUrl: "https://nsidc.org/data/seaice_index",
};

test("the assembled spec is exactly the shape produce has always rendered", () => {
  const r = assembleChartNative(BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value).toEqual({
    nativeType: "line",
    title: "Summer sea ice has lost a third of its extent",
    altInsight: "A line falling from 7 to 4.3 million square kilometres",
    unit: "million km²",
    source: { name: "NSIDC Sea Ice Index", url: "https://nsidc.org/data/seaice_index" },
    highlight: "2007",
    format: "static",
    data: "year,extent\n1979,7.0\n2025,4.3",
  });
});

test("no url, no unit, no emphasis, no beats — the optional fields stay absent, not empty", () => {
  const r = assembleChartNative({
    ...BRIEF,
    sourceUrl: undefined,
    angle: { confirmedTakeaway: "t", altInsight: "a" },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const spec = r.value as Record<string, unknown>;
  expect(spec.source).toEqual({ name: "NSIDC Sea Ice Index" });
  expect("highlight" in spec).toBe(false);
  expect("beats" in spec).toBe(false);
  expect(spec.unit).toBe("");
});
```

- [ ] **Step 2: Run it and watch it fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/chart-native.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Move the body**

`lib/loop/assemble/chart-native.ts` — the body of `assembleNativeSpec` (`produce.ts:90-111`), unchanged except that it reads the brief and returns `ok(...)`. Copy the existing header comment across; it explains why the angle falls back to `""` and it is still true.

```ts
import { ok } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import type { VerbResult } from "../../core/verbs";

export function assembleChartNative(brief: ProductionBrief): VerbResult<unknown> {
  return ok({
    nativeType: brief.nativeType,
    title: brief.angle.confirmedTakeaway,
    altInsight: brief.angle.altInsight,
    unit: brief.angle.unit ?? "",
    source: {
      name: brief.attribution,
      ...(brief.sourceUrl ? { url: brief.sourceUrl } : {}),
    },
    ...(brief.angle.emphasis ? { highlight: brief.angle.emphasis } : {}),
    ...(brief.format ? { format: brief.format } : {}),
    data: brief.dataCsv,
    ...(brief.beats ? { beats: brief.beats } : {}),
  });
}
```

`lib/loop/assemble/index.ts`:

```ts
// THE TABLE. A key here is a promise the loop can assemble that engine's spec — and, since
// buildable.ts derives LOOP_BUILDABLE_ENGINES from these keys, it is also a promise to the
// brain that the form can be OFFERED unmarked. Add a key only in the commit that adds its
// proof (design spec §4.6).
import type { Assembler } from "../../core/production-brief";
import { assembleChartNative } from "./chart-native";

export const ASSEMBLERS: Record<string, Assembler> = {
  "chart-native": assembleChartNative,
};
```

- [ ] **Step 4: Derive the buildable list**

In `lib/loop/buildable.ts`, replace the hand-written array:

```ts
import { ASSEMBLERS } from "./assemble";

// DERIVED, not declared. Before this, the list was a sentence someone had to remember to keep
// true; now a moteur is buildable if and only if an assembler exists for it, which is the
// promise this file's header has always asked for.
export const LOOP_BUILDABLE_ENGINES: readonly string[] = Object.keys(ASSEMBLERS);
```

Keep `isLoopBuildable`, `unbuildableEngineReason`, `unbuildableFormReason` and `resolveBuilder` exactly as they are — the four readers (`produce.ts:211`, `lib/brain/eligibility.ts:308`, `manifest.ts:512`, `choose.ts:67`) must not change in this task.

- [ ] **Step 5: Point `produce()` at the table**

At `produce.ts:303`, replace the `assembleNativeSpec(...)` call:

```ts
  const brief = briefFor(run, el, dataCsv, published.attribution, published.url, format);
  const assembler = ASSEMBLERS[builder];
  if (!assembler)
    return fail(
      "not-implemented",
      `produce: "${chosen.id}" is a ${builder} form (${format}) — ${unbuildableEngineReason(builder)}`,
    );
  const assembled = assembler(brief);
  if (!assembled.ok) return assembled;
  const nativeSpec = assembled.value as Record<string, unknown>;
```

Delete `assembleNativeSpec`, `narrativeBeatsFor` and the local `NarrativeBeatSpec` type from `produce.ts`, and drop the now-unused `ArcRole` import.

- [ ] **Step 6: Fix the three callers**

`produce.test.ts:629,652` and `beats-render-proof.test.ts:151` call `assembleNativeSpec(run, el, csv, attribution, url, format)`. Replace each with:

```ts
const spec = assembleChartNative(briefFor(run, el, csv, attribution, url, format));
// …then read spec.value
```

The render proof's header explains it must not build a parallel path — it still does not: `briefFor` + the table entry is literally what `produce()` now runs.

- [ ] **Step 7: Prove the move changed no pixel**

This is the one regression proof of the tranche. Add to `lib/loop/assemble/chart-native.test.ts`:

```ts
test("the moved assembler produces the spec the pre-move code produced, field for field", () => {
  // The expected object is the one recorded from the pre-move implementation, pasted here
  // rather than recomputed: a regression proof compares against HISTORY, not against itself.
  const r = assembleChartNative(BRIEF);
  expect(r.ok && JSON.stringify(r.value)).toBe(
    JSON.stringify({
      nativeType: "line",
      title: "Summer sea ice has lost a third of its extent",
      altInsight: "A line falling from 7 to 4.3 million square kilometres",
      unit: "million km²",
      source: { name: "NSIDC Sea Ice Index", url: "https://nsidc.org/data/seaice_index" },
      highlight: "2007",
      format: "static",
      data: "year,extent\n1979,7.0\n2025,4.3",
    }),
  );
});
```

Key order matters here on purpose: `JSON.stringify` compares the emission order too, and the
engine's mapper has never depended on it — but if the order moves, you have rewritten the
function rather than moved it.

- [ ] **Step 8: Run everything that touches the loop**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bunx tsc --noEmit && bun test lib
```
Expected: PASS. `lib` is ~1400 tests and takes about 5 minutes.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(loop): the chart-native assembler moves behind a table, unchanged"
```

---

## Task 3: Dispatch on the resolved builder, and make buildability type-aware

**Files:**
- Modify: `lib/loop/produce.ts:385-400`
- Modify: `lib/loop/buildable.ts` (`isLoopBuildable`)
- Modify: `lib/loop/assemble/index.ts`
- Test: `lib/loop/produce.test.ts`, `lib/loop/assemble/index.test.ts`

**Interfaces:**
- Consumes: `ASSEMBLERS` (Task 2), `resolveBuilder` (existing).
- Produces: `isLoopBuildable(engine?, nativeType?)`; `ASSEMBLERS` entries gain an optional `supports(nativeType): boolean`.

**Why now, before any engine is added.** `produce.ts:385-400` already documents this: `render({ engine: chosen.engine ?? … })` is correct today only because one engine is buildable and the only redirecting format (`scrolly`) is not. The day `scrolly` enters the table, a chart-native option in the scrolly format clears the guard (builder = `scrolly`) and is then dispatched to `chart-native`, whose manifest does not declare `scrolly` → `unsupported-format` on a form the guard just promised. Fix it before it can bite.

**And why type-aware.** map-native renders seven types; the assembler tasks below cover them in two families. If buildability stayed engine-level, an offered type the loop cannot assemble would clear the gate and die at produce — the exact dead end `buildable.ts` exists to prevent. Type-awareness lets the brain MARK it in the offer instead.

- [ ] **Step 1: Write the failing tests**

`lib/loop/assemble/index.test.ts`:

```ts
import { test, expect } from "bun:test";
import { ASSEMBLERS, assemblerFor } from "./index";
import { isLoopBuildable, LOOP_BUILDABLE_ENGINES } from "../buildable";

test("the buildable list is exactly the table's keys — no hand-written second copy", () => {
  expect([...LOOP_BUILDABLE_ENGINES].sort()).toEqual(Object.keys(ASSEMBLERS).sort());
});

test("an engine with no per-type restriction builds any of its types", () => {
  expect(isLoopBuildable("chart-native", "line")).toBe(true);
  expect(isLoopBuildable("chart-native", "sankey")).toBe(true);
});

test("an unknown engine is not buildable, with or without a type", () => {
  expect(isLoopBuildable("crayon")).toBe(false);
  expect(isLoopBuildable("crayon", "line")).toBe(false);
});

test("no engine at all is the pre-brain default path, which is chart-native", () => {
  expect(isLoopBuildable(undefined)).toBe(true);
});
```

In `lib/loop/produce.test.ts`, add:

```ts
test("a scrolly-format option dispatches to the scrolly producer, not to the chosen engine", async () => {
  // Regression guard for the trap produce.ts:385-400 documents. Asserted on the dispatch,
  // not on a render: the point is WHICH engine key is asked for.
  const { resolveBuilder } = await import("./buildable");
  expect(resolveBuilder({ engine: "chart-native", format: "scrolly" })).toBe("scrolly");
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/index.test.ts
```
Expected: FAIL — `assemblerFor` is not exported.

- [ ] **Step 3: Make the table type-aware**

`lib/loop/assemble/index.ts`:

```ts
import type { Assembler } from "../../core/production-brief";
import { assembleChartNative } from "./chart-native";

export type AssemblerEntry = {
  assemble: Assembler;
  /** Absent = every type this engine declares. Present = the types the LOOP can compose a
   *  spec for, which can lag the engine's own catalogue while a family is being wired. */
  supports?: (nativeType: string) => boolean;
};

export const ASSEMBLERS: Record<string, AssemblerEntry> = {
  "chart-native": { assemble: assembleChartNative },
};

export function assemblerFor(engine: string, nativeType?: string): Assembler | undefined {
  const entry = ASSEMBLERS[engine];
  if (!entry) return undefined;
  if (nativeType && entry.supports && !entry.supports(nativeType)) return undefined;
  return entry.assemble;
}
```

- [ ] **Step 4: Make `isLoopBuildable` type-aware**

```ts
export function isLoopBuildable(engine?: string, nativeType?: string): boolean {
  if (engine == null) return true; // pre-brain manifests take the default path (chart-native)
  return assemblerFor(engine, nativeType) !== undefined;
}
```

Then update the two call sites that have a type in hand to pass it: `produce.ts:211`
(`isLoopBuildable(builder, chosen.nativeType)`) and `lib/brain/eligibility.ts:308`
(the option's own `nativeType`). `manifest.ts` and `choose.ts` route through
`unbuildableFormReason`, so widen that helper the same way — it already receives the whole
option and can read `chosen.nativeType` itself.

- [ ] **Step 5: Update produce's lookup to the new table shape**

Task 2 wrote `const assembler = ASSEMBLERS[builder];` when the table's values were bare
functions. They are now entries, so that line becomes:

```ts
  const assembler = assemblerFor(builder, chosen.nativeType);
```

The refusal underneath it is unchanged and still correct: it is reached when the engine is
absent from the table *or* when the table does not support this type, and
`unbuildableEngineReason` names the buildable engines either way.

- [ ] **Step 6: Dispatch on the builder**

At `produce.ts:400`, replace `engine: chosen.engine ?? LOOP_BUILDABLE_ENGINES[0]!` with
`engine: builder`, and replace the long comment block above it with the two lines that are
still true: `builder` is what `resolveBuilder` resolved, the same value the guard checked and
the same value the assembler table was keyed on — one name, one resolution, three readers.

- [ ] **Step 7: Run the loop and the brain**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bunx tsc --noEmit && bun test lib
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix(loop): produce dispatches on the resolved builder, and buildability knows types"
```

---

## Task 4: The geographic match — measured in `orient`, shown, correctable

**Files:**
- Create: `skills/map-native/src/geo-match.ts`
- Create: `skills/map-native/src/geo-match.test.ts`
- Modify: `lib/loop/orient.ts`, `lib/loop/manifest.ts:241-247`
- Test: `lib/loop/orient.test.ts`

**Interfaces:**
- Consumes: `GeoMatch` (Task 1), `BASEMAPS` from `skills/map-native/src/basemaps`, `parseCsvRows` from `lib/loop/profile`.
- Produces: `matchGeography(columns, rows): GeoMatch | undefined`; `OrientResult.geo?: GeoMatch`; the manifest's `orient.geo`.

**Where it lives and why.** The matcher is in the ENGINE, because the basemaps and their join keys are the engine's (`basemaps.ts` is deliberately Node-safe — no Vite `?raw` — "so it can be unit-tested and used by config validation"). The TYPE is in `lib/core`, because `lib/core` may not import `skills/`. `lib/loop/orient.ts` imports the matcher the way `skills/scrolly`'s manifest imports chart-native's validator: engine-owned knowledge, imported directly, never re-implemented.

- [ ] **Step 1: Write the failing test**

`skills/map-native/src/geo-match.test.ts`:

```ts
import { test, expect } from "bun:test";
import { matchGeography } from "./geo-match";

test("an ISO-A3 column matches the world basemap and reports a full join", () => {
  const rows = [
    { country: "CHE", value: "12" },
    { country: "FRA", value: "9" },
    { country: "DEU", value: "7" },
  ];
  const m = matchGeography(["country", "value"], rows);
  expect(m).toBeDefined();
  expect(m!.column).toBe("country");
  expect(m!.basemap).toBe("world");
  expect(m!.matched).toBe(3);
  expect(m!.total).toBe(3);
  expect(m!.unmatched).toEqual([]);
});

test("two-letter US postal codes match us-states, not world", () => {
  const rows = [{ state: "CA", v: "1" }, { state: "TX", v: "2" }];
  const m = matchGeography(["state", "v"], rows);
  expect(m!.basemap).toBe("us-states");
  expect(m!.matched).toBe(2);
});

test("a partial join is REPORTED, with the orphans named — never rounded to a count", () => {
  const rows = [
    { country: "CHE", v: "1" },
    { country: "FRA", v: "2" },
    { country: "Genève", v: "3" },
    { country: "Vaud", v: "4" },
  ];
  const m = matchGeography(["country", "v"], rows);
  expect(m!.matched).toBe(2);
  expect(m!.total).toBe(4);
  expect(m!.unmatched).toEqual(["Genève", "Vaud"]);
});

test("data with no geography at all matches nothing — undefined, not an empty match", () => {
  const rows = [{ year: "1979", extent: "7.0" }, { year: "2025", extent: "4.3" }];
  expect(matchGeography(["year", "extent"], rows)).toBeUndefined();
});
```

- [ ] **Step 2: Run and watch it fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers/skills/map-native && bun test src/geo-match.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the matcher**

`skills/map-native/src/geo-match.ts`:

```ts
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeoMatch } from "../../../lib/core/production-brief";
import { BASEMAPS } from "./basemaps";

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/geo");

// The join-key values a basemap actually contains, read once per process. world.geojson is 4 MB
// and orient runs once per run, so the read is amortised — but a second call must not pay it.
const keyCache = new Map<string, Set<string>>();

function keysOf(basemap: string): Set<string> {
  const hit = keyCache.get(basemap);
  if (hit) return hit;
  const joinKey = BASEMAPS[basemap]!.joinKey;
  const fc = JSON.parse(
    readFileSync(join(assetsDir, `${basemap}.geojson`), "utf8"),
  ) as GeoJSON.FeatureCollection;
  const keys = new Set(
    fc.features
      .map((f) => f.properties?.[joinKey])
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().toUpperCase()),
  );
  keyCache.set(basemap, keys);
  return keys;
}

/**
 * WHICH COLUMN IS THE GEOGRAPHY, AND AGAINST WHICH SHIPPED BASEMAP.
 *
 * Tries every column against every shipped basemap's join key and keeps the best join. Returns
 * undefined when nothing joins at all — data with no geography is not a failed map, it is a
 * chart, and saying so is orient's job.
 *
 * The caller decides what to DO with a partial join (lib/loop/assemble/map-native.ts refuses
 * below half). This function only measures, and it always names the orphans: a count alone
 * would let a journalist ship a map with two holes in it and never know which two.
 */
export function matchGeography(
  columns: string[],
  rows: Record<string, string | number>[],
): GeoMatch | undefined {
  let best: GeoMatch | undefined;
  for (const basemap of Object.keys(BASEMAPS)) {
    const keys = keysOf(basemap);
    for (const column of columns) {
      const values = rows.map((r) => String(r[column] ?? "").trim());
      const unmatched = values.filter((v) => v !== "" && !keys.has(v.toUpperCase()));
      const matched = values.filter((v) => v !== "" && keys.has(v.toUpperCase())).length;
      if (matched === 0) continue;
      if (!best || matched > best.matched)
        best = { column, basemap, matched, total: values.length, unmatched };
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the matcher tests**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers/skills/map-native && bun test src/geo-match.test.ts && bunx tsc --noEmit
```
Expected: PASS. If `us-states.geojson`'s `postal` values are lower-case in the file, the
upper-casing above already covers it; if a test fails on a value you did not expect, read the
geojson before changing the test — the asset is the truth here.

- [ ] **Step 5: Thread it through `orient`**

`lib/loop/orient.ts` — add to the success return, and only there (data with no rows or no
numeric columns has already answered):

```ts
import { matchGeography } from "../../skills/map-native/src/geo-match";
import { parseCsvRows } from "./profile";

export type OrientResult = {
  profile: DataProfile;
  supportsPoint: boolean;
  note?: string;
  /** What the desk found when it tried to place this data on a shipped basemap. Absent when
   *  nothing joined — which is the ordinary case for a time series. */
  geo?: GeoMatch;
};
```

```ts
  const { columns, rows } = parseCsvRows(dataCsv);
  const geo = matchGeography(columns, rows);
  return { profile, supportsPoint: true, ...(geo ? { geo } : {}) };
```

- [ ] **Step 6: Persist it**

`lib/loop/manifest.ts:241-247` — the `orient` object gains the field. Use a zod object that
mirrors `GeoMatch` exactly; do not loosen it to `z.record`:

```ts
const GeoMatchSchema = z.object({
  column: z.string(),
  basemap: z.string(),
  matched: z.number(),
  total: z.number(),
  unmatched: z.array(z.string()),
});
```

and inside the `orient` object: `geo: GeoMatchSchema.optional(),`.

Then add the two spread lines to `briefFor` that Task 1 told you to leave out:
`...(run.orient?.geo ? { geo: run.orient.geo } : {}),`.

- [ ] **Step 7: Write the loop-level test**

In `lib/loop/orient.test.ts`:

```ts
test("orient reports the geography when the data carries one, and stays silent when it does not", () => {
  const geoRun = orient("country,value\nCHE,12\nFRA,9");
  expect(geoRun.geo?.basemap).toBe("world");
  expect(geoRun.geo?.column).toBe("country");
  const timeSeries = orient("year,extent\n1979,7.0\n2025,4.3");
  expect(timeSeries.geo).toBeUndefined();
});
```

- [ ] **Step 8: Run**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bunx tsc --noEmit && bun test lib/loop
cd skills/map-native && bunx tsc --noEmit && bun test
```
Expected: PASS both.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(loop): the desk measures whether the data has a geography it can place"
```

---

## Task 5: The map-native region family — choropleth, cartogram, dot-density

**Files:**
- Create: `lib/loop/assemble/map-native.ts`
- Create: `lib/loop/assemble/map-native.test.ts`

**Interfaces:**
- Consumes: `ProductionBrief.geo` (Task 4), `parseCsvRows`, `mapNativeConfigErrors` from `skills/map-native/src/validate-config`.
- Produces: `assembleMapNative(brief): VerbResult<unknown>`.

**The contract is the engine's validator.** Every test in this task ends with
`expect(mapNativeConfigErrors(spec)).toEqual([])`. That is not a proxy for correctness — it IS
the interface `render` will run before dispatching, so a config that clears it is a config the
engine accepts.

**The target shapes**, read from `skills/map-native/src/validate-config.ts` (do not re-derive
them; do read the validator for the details each one checks):

- `choropleth`: `{ type, regionKey, valueField, rows, basemap, title, description?, unit?, source?, labelField? }`
- `cartogram`: `{ type: "cartogram", values: { id, value }[], basemap, title, … }`
- `dot-density`: `{ type: "dot-density", regionKey, boundaries, rows, valueField?, basemap, title, … }`

- [ ] **Step 1: Write the failing tests**

`lib/loop/assemble/map-native.test.ts`:

```ts
import { test, expect } from "bun:test";
import { assembleMapNative } from "./map-native";
import { mapNativeConfigErrors } from "../../../skills/map-native/src/validate-config";
import type { ProductionBrief } from "../../core/production-brief";

const REGION_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A map of Africa shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19",
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org",
  geo: { column: "country", basemap: "world", matched: 4, total: 4, unmatched: [] },
};

test("a choropleth config clears the engine's own validator", () => {
  const r = assembleMapNative(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as Record<string, unknown>;
  expect(cfg.type).toBe("choropleth");
  expect(cfg.regionKey).toBe("country");
  expect(cfg.valueField).toBe("access");
  expect(cfg.basemap).toBe("world");
  expect(cfg.title).toBe("Electricity access is lowest across the Sahel");
  expect(cfg.source).toEqual({ name: "World Bank", url: "https://data.worldbank.org" });
});

test("no geography measured — the refusal names the shipped basemaps, so the fix is knowable", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, geo: undefined });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("world");
  expect(r.message).toContain("us-states");
});

test("fewer than half the rows join — refused, and every orphan is named", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    geo: {
      column: "country",
      basemap: "world",
      matched: 1,
      total: 4,
      unmatched: ["Genève", "Vaud", "Valais"],
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("Genève");
  expect(r.message).toContain("Vaud");
  expect(r.message).toContain("Valais");
});

test("several numeric columns and none named in the takeaway — refused, candidates listed", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,access,population\nCHE,100,8\nTCD,11,17",
    angle: { ...REGION_BRIEF.angle, confirmedTakeaway: "Two very different countries" },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("access");
  expect(r.message).toContain("population");
});

test("several numeric columns, one named in the takeaway — that one is used", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,access,population\nCHE,100,8\nTCD,11,17",
    angle: { ...REGION_BRIEF.angle, confirmedTakeaway: "Access to electricity splits the continent" },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).valueField).toBe("access");
});

test("a cartogram carries id/value pairs, not rows", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, nativeType: "cartogram" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as { values: { id: string; value: number }[] };
  expect(cfg.values[0]).toEqual({ id: "CHE", value: 100 });
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/map-native.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the region family**

`lib/loop/assemble/map-native.ts`. The two decisions this file makes, both written down in the
design spec §4.2 and both required to be visible in the code:

```ts
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief, GeoMatch } from "../../core/production-brief";
import { parseCsvRows } from "../profile";
import { BASEMAP_NAMES } from "../../../skills/map-native/src/basemaps";

const REGION_TYPES = new Set(["choropleth", "cartogram", "dot-density"]);

/** WHICH COLUMN HOLDS THE VALUE. One numeric column is unambiguous. Several is a real
 *  question, and the takeaway is where the journalist already answered it: the column whose
 *  name appears in the confirmed takeaway wins. Neither ⇒ refuse and LIST them — guessing
 *  here paints the wrong quantity on a map and nothing downstream can tell. */
function valueFieldFor(
  numeric: string[],
  takeaway: string,
): { field: string } | { candidates: string[] } {
  if (numeric.length === 1) return { field: numeric[0]! };
  const said = numeric.filter((c) =>
    takeaway.toLowerCase().includes(c.toLowerCase().replace(/[_-]+/g, " ")),
  );
  if (said.length === 1) return { field: said[0]! };
  return { candidates: numeric };
}

/** HALF THE ROWS. Below it, this basemap does not know this geography and a map would be
 *  mostly holes; above it, the orphans travel as a warning the caller shows. The threshold is
 *  a decision, not a measurement — it is written here once so it is arguable in one place. */
function geoRefusal(geo: GeoMatch | undefined): string | undefined {
  if (!geo)
    return (
      `this data carries no geography Splash can place — the shipped basemaps are ` +
      `${BASEMAP_NAMES.join(" and ")}, and no column matched either of them`
    );
  if (geo.matched * 2 < geo.total)
    return (
      `only ${geo.matched} of ${geo.total} rows match the ${geo.basemap} basemap — ` +
      `unmatched: ${geo.unmatched.join(", ")}`
    );
  return undefined;
}
```

Then the assembler itself: refuse on `geoRefusal`, parse the rows, resolve the value field,
and build the per-type shape. Read `validateChoroplethConfig`, `validateCartogramConfig` and
`validateDotDensityConfig` before writing each branch — they are the acceptance criteria and
they check more than the required fields (palette kind, camera mode, arc beats).

For `dot-density`, `boundaries` is typed `string` in `DotDensityConfigShape` with no validator
branch found for it: set it to the matched basemap name, run the validator, and if the render
in Task 7 shows it means something else, **report it rather than guess** — an invented value
here is exactly the silent-wrong-artifact class this tranche exists to close.

- [ ] **Step 4: Run the tests**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/map-native.test.ts && bunx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/assemble/map-native.ts lib/loop/assemble/map-native.test.ts
git commit -m "feat(loop): assemble the region-family map configs from a brief"
```

---

## Task 6: The map-native point family — symbol, hex-grid, locator, route

**Files:**
- Modify: `lib/loop/assemble/map-native.ts`, `lib/loop/assemble/map-native.test.ts`

**Interfaces:**
- Consumes: everything from Task 5.
- Produces: the same `assembleMapNative`, now covering all seven `MAP_TYPES`.

**The target shapes**, read from `validate-config.ts`:

- `symbol`: `{ type: "symbol", points: { lon, lat, value, label? }[], basemap, title, … }`
- `hex-grid`: `{ type: "hex-grid", points: { lon, lat, value? }[], basemap, title, … }`
- `locator`: `{ type: "locator", markers: LocatorMarker[], basemap, title, … }`
- `route`: `{ type: "route", route: [lon, lat][], basemap, title, … }`

- [ ] **Step 1: Write the failing tests**

```ts
const POINT_BRIEF: ProductionBrief = {
  elementId: "e2",
  nativeType: "symbol",
  format: "static",
  angle: {
    confirmedTakeaway: "The strongest quakes cluster along the Pacific rim",
    altInsight: "A map with the largest circles down the Pacific coast",
    unit: "magnitude",
  },
  dataCsv: "place,lat,lon,magnitude\nValparaíso,-33.05,-71.62,8.2\nSendai,38.26,140.87,9.1",
  attribution: "USGS",
};

test("lat/lon columns become the symbol points, label included", () => {
  const r = assembleMapNative(POINT_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as { points: { lon: number; lat: number; value: number; label?: string }[] };
  expect(cfg.points).toEqual([
    { lon: -71.62, lat: -33.05, value: 8.2, label: "Valparaíso" },
    { lon: 140.87, lat: 38.26, value: 9.1, label: "Sendai" },
  ]);
});

test("longitude spelled `long` or `lng` is still longitude", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,latitude,lng,magnitude\nSendai,38.26,140.87,9.1",
  });
  expect(r.ok).toBe(true);
});

test("a point type with no coordinates is refused, naming the columns it looked for", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, dataCsv: "place,magnitude\nSendai,9.1" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("lat");
  expect(r.message).toContain("lon");
});

test("an out-of-range coordinate is refused, naming the row — never plotted in the sea", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,lat,lon,magnitude\nSendai,138.26,140.87,9.1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("Sendai");
});

test("a route is the ordered coordinates, as pairs", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "route" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  expect((r.value as { route: [number, number][] }).route).toEqual([
    [-71.62, -33.05],
    [140.87, 38.26],
  ]);
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/map-native.test.ts
```
Expected: FAIL — the symbol branch does not exist.

- [ ] **Step 3: Implement the point family**

Add to `map-native.ts`:

```ts
const POINT_TYPES = new Set(["symbol", "hex-grid", "locator", "route"]);

const LAT_NAMES = ["lat", "latitude", "lat_dd", "y"];
const LON_NAMES = ["lon", "lng", "long", "longitude", "lon_dd", "x"];

/** The coordinate columns, by name. Deliberately a CLOSED list rather than a heuristic on the
 *  values: a column of small numbers is not a latitude just because it could be one, and a map
 *  that plots the wrong column looks exactly like a map that plots the right one. */
function coordColumns(columns: string[]): { lat: string; lon: string } | undefined {
  const find = (names: string[]): string | undefined =>
    columns.find((c) => names.includes(c.trim().toLowerCase()));
  const lat = find(LAT_NAMES);
  const lon = find(LON_NAMES);
  return lat && lon ? { lat, lon } : undefined;
}
```

Coordinates are refused when out of range (`|lat| > 90`, `|lon| > 180`) with the row's label in
the message. The label column is the first non-numeric, non-coordinate column.

- [ ] **Step 4: Declare which types the loop supports**

In `lib/loop/assemble/index.ts`, add the entry (it does not go live until Task 7 adds the
proof — write it, keep it commented out with a one-line note, or land Tasks 6 and 7 as one
commit; do not ship an unproven key):

```ts
  "map-native": {
    assemble: assembleMapNative,
    supports: (t) => MAP_TYPES.includes(t as (typeof MAP_TYPES)[number]),
  },
```

- [ ] **Step 5: Run**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble && bunx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(loop): assemble the point-family map configs from a brief"
```

---

## Task 7: map-native goes live — the render proof

**Files:**
- Create: `lib/loop/map-e2e.test.ts`
- Modify: `lib/loop/assemble/index.ts`, `scripts/proofs.mjs`

**Interfaces:**
- Consumes: `produce` (`lib/loop/produce`), `freezeInput` (`lib/loop/freeze`), the assembler table.
- Produces: the `map-native` key in `ASSEMBLERS`, live.

**Gate:** `SPLASH_MAP_E2E=1`. Needs a MapTiler key in `.env` (the repo has one; see the
theme-slice notes — one key serves both Vite and Remotion).

- [ ] **Step 1: Write the proof**

`lib/loop/map-e2e.test.ts`, modelled on `lib/loop/beats-render-proof.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "./produce";
import { assembleMapNative } from "./assemble/map-native";
import { mapNativeConfigErrors } from "../../skills/map-native/src/validate-config";

const RUN_IT = process.env.SPLASH_MAP_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// ALWAYS ON — the 3.5 ms half. The fixture is handed to the ENGINE'S OWN validator, with no
// browser, no network and no render. This is what stops this proof rotting silently the way
// four others did before `bun run proofs` existed (spec 2026-07-27-proofs-run §4).
test("the fixture assembles into a config the engine accepts, before any render", () => {
  const r = assembleMapNative(FIXTURE_BRIEF);
  expect(r.ok ? mapNativeConfigErrors(r.value) : [r.message]).toEqual([]);
});

proof("a chosen choropleth produces a real PNG at the channel's size", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "splash-map-e2e-"));
  try {
    writeFileSync(join(runDir, "data.csv"), ACCESS_CSV);
    // A run whose source is DECLARED — an undeclared one is refused before any render, and
    // that refusal is the source policy working, not this proof failing.
    const run = /* initRun with sources: { mode: "real", data: { kind: "public", … } } */;
    const el = /* an element with an angle and a chosen choropleth option, format "static" */;

    const result = await produce(run, el, runDir);
    expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe("produced");
    if (!result.ok) return;

    // THE POSITIVE CONTROL — the PNG's own header, not the producer's report.
    const png = readFileSync(join(runDir, "elements", el.id, "static.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect([width, height]).toEqual([1200, 675]); // article-web media size, ±0 — IHDR is exact
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
```

The `/* … */` placeholders above are the run and element construction — copy them from
`lib/loop/multi-deliverable-e2e.test.ts`, which already stands up exactly this shape, rather
than inventing a second way to build a run.

The positive control is not optional and not a file-exists check. For `static`: read the PNG
header and assert the channel's media size. For `interactive`: open it in Playwright and read
the legend and the `Source:` line out of the DOM. A green that only proves "no refusal" is the
false green this whole layer exists to kill.

- [ ] **Step 2: Run it and watch it fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && SPLASH_MAP_E2E=1 bun test lib/loop/map-e2e.test.ts
```
Expected: FAIL — `produce` refuses, because `map-native` is not in the table yet. That refusal
IS the pre-condition: read it and check it is the sentence the offer shows.

- [ ] **Step 3: Add the key**

Uncomment the `map-native` entry in `lib/loop/assemble/index.ts`.

- [ ] **Step 4: Run the proof for real**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && SPLASH_MAP_E2E=1 bun test lib/loop/map-e2e.test.ts
```
Expected: PASS, in roughly 60–120 s. A MapLibre produce is slow and flakes under contention —
run it alone, never alongside another render.

- [ ] **Step 5: Join the roster**

In `scripts/proofs.mjs`, add to `PROOFS`:

```js
  {
    file: "lib/loop/map-e2e.test.ts",
    what: "a chosen map is assembled by the loop and rendered by the engine",
    env: { SPLASH_MAP_E2E: "1" },
  },
```

- [ ] **Step 6: Check the marks disappeared**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/brain lib/loop
```
Expected: PASS — and any brain test asserting that a map form is MARKED unbuildable now has to
change, because it is not. Change the assertion, never the derivation.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(loop): the loop builds map-native, proved on a rendered artifact"
```

---

## Task 8: Residual A34 — a scrolly page with a real root

**Files:**
- Modify: `skills/scrolly/src/Scrolly.tsx:588`
- Test: `skills/scrolly/src/scaffold-root.test.tsx` (create)
- Modify: `docs/splash/residuals.md` (the A34 section, ~line 453)

**Interfaces:**
- Consumes: nothing new.
- Produces: a `data-splash-root` element wrapping the whole scrolly page, and `data-splash-title` on the page title.

**Why here.** Measured live and written up as A34: the capture layer's fallback selector
`#root > div` resolves a **454 × 63 px** element — the title banner — because `Scrolly.tsx:588`
returns a fragment whose first child is the header. The whole `capture → review → approve`
chain would measure a fragment. It is latent only because `scrolly` is not buildable; Task 9
makes it buildable, so it closes here, one task earlier, with the render under your eyes.

**The two obvious fixes each fail** (measured, in the residual): wrapping in a `<div>` adds a box
to a `position: sticky` subtree, so the sticky containing block can move; `display: contents`
avoids the box but returns a zero `getBoundingClientRect()`, which breaks the very crop being
repaired. So: A/B the rendered page before and after, and keep the sticky behaviour identical.

- [ ] **Step 1: Capture the BEFORE**

Build a scrolly (the sample config in `skills/scrolly/assets/sample-data/` is enough) and, in
Playwright, record: the scroll position at which each `[data-step-index]` becomes active, and
`document.querySelector("#root > div").getBoundingClientRect()`. Save both to the scratchpad.
Expected: the rect is about 454 × 63.

- [ ] **Step 2: Write the failing test**

```tsx
test("the scrolly page has one root element that contains the whole page", () => {
  const html = renderToStaticMarkup(<Scrolly story={SAMPLE} />);
  const roots = html.match(/data-splash-root/g) ?? [];
  expect(roots.length).toBe(1);
  // the title lives INSIDE the root, and is addressable on its own
  expect(html.indexOf("data-splash-root")).toBeLessThan(html.indexOf("data-splash-title"));
});
```

- [ ] **Step 3: Run and watch it fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers/skills/scrolly && bun test src/scaffold-root.test.tsx
```
Expected: FAIL — no such attribute.

- [ ] **Step 4: Implement**

Replace the fragment at `Scrolly.tsx:588` with a real element carrying `data-splash-root`, and
put `data-splash-title` on the header's text node. If the sticky context moves (Step 5 shows
it), the fix is a CSS one on the new box (`display: block; position: static;` and letting the
existing children keep their own positioning) — not a retreat to `display: contents`.

- [ ] **Step 5: Capture the AFTER and compare**

Same measurement as Step 1. Two things must hold: the step activation scroll positions are
unchanged (that is the sticky A/B), and `#root > div` — or better, `[data-splash-root]` — now
returns the full page box, not 454 × 63.

- [ ] **Step 6: Point the capture layer at the marker**

Find the capture layer's fallback selector (`#root > div`) and prefer `[data-splash-root]`
when present. Keep the fallback: pages built before this change still exist.

- [ ] **Step 7: Run**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers/skills/scrolly && bunx tsc --noEmit && bun test
cd ../.. && bun test lib/verify
```
Expected: PASS.

- [ ] **Step 8: Strike A34**

In `docs/splash/residuals.md`, mark the A34 section closed with the two measurements (before
454 × 63, after the full page box) and the sticky A/B result.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "fix(scrolly): the page has a root the capture layer can measure"
```

---

## Task 9: scrolly — composition, not a sixth assembler

**Files:**
- Create: `lib/loop/assemble/scrolly.ts`, `lib/loop/assemble/scrolly.test.ts`
- Modify: `lib/loop/assemble/index.ts`, `lib/loop/beats-render-proof.test.ts`

**Interfaces:**
- Consumes: `assembleChartNative` (Task 2), `assembleMapNative` (Tasks 5–6), `MAP_TYPES`.
- Produces: `assembleScrolly(brief)`.

**What scrolly's own manifest already says**, and what this assembler must not contradict: a
chart-track config **is** a chart-native `NativeSpec` (validated by `nativeSpecErrors` +
`narrativeBeatErrors`); a map-track config is one of the map-native family, dispatched by
`type`; and an explicit `beats` override on the MAP track is refused loud, because the map
track derives its own story and would ignore it.

- [ ] **Step 1: Write the failing tests**

```ts
test("a chart-track scrolly is exactly the chart-native spec, beats included", () => {
  const brief = { ...CHART_BRIEF, format: "scrolly" as const, beats: BEATS };
  const s = assembleScrolly(brief);
  const c = assembleChartNative(brief);
  expect(s.ok && c.ok && JSON.stringify(s.value)).toBe(JSON.stringify(c.ok && c.value));
});

test("a map-track scrolly is the map config, and an explicit beat plan is refused loud", () => {
  const r = assembleScrolly({ ...REGION_BRIEF, format: "scrolly", beats: BEATS });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("map scrolly");
});

test("a map-track scrolly without beats assembles the map config unchanged", () => {
  const r = assembleScrolly({ ...REGION_BRIEF, format: "scrolly" });
  const m = assembleMapNative({ ...REGION_BRIEF, format: "scrolly" });
  expect(r.ok && m.ok && JSON.stringify(r.value)).toBe(JSON.stringify(m.ok && m.value));
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/scrolly.test.ts
```

- [ ] **Step 3: Implement the composition**

```ts
import { fail, type VerbResult } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import { MAP_TYPES } from "../../../skills/map-native/src/map-types";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";

/** scrolly hosts another engine's track — so this composes, it never re-derives. Duplicating
 *  either engine's rules here is what produced the two geo-prep layers the umbrella spec
 *  faults the V1 for. */
export function assembleScrolly(brief: ProductionBrief): VerbResult<unknown> {
  const isMap = (MAP_TYPES as readonly string[]).includes(brief.nativeType);
  if (!isMap) return assembleChartNative(brief);
  if (brief.beats?.length)
    return fail(
      "invalid-request",
      "a map scrolly derives its own walk from the data — an authored beat plan belongs to a chart scrolly, " +
        "so this walk cannot be published as written",
    );
  return assembleMapNative(brief);
}
```

- [ ] **Step 4: Add the key and check `draft-beats` became reachable**

Add `"scrolly": { assemble: assembleScrolly }` to `ASSEMBLERS`. Then verify the note at
`manifest.ts:528` is no longer true: `nextActionsForElement` must now be able to answer
`draft-beats`. Write a test that asserts it for a chart-track scrolly element with no plan yet.

- [ ] **Step 5: Upgrade the beats proof to go through `produce()`**

`beats-render-proof.test.ts`'s header says it calls `render()` directly *because* scrolly was
not buildable. It is now. Rewrite step 3 of that proof to call `produce(run, el, runDir)` and
delete the header paragraph explaining the workaround. Keep the DOM measurement exactly as it
is — reading the captions off `[data-step-index]` in a browser is the part that made it a
proof.

- [ ] **Step 6: Run it**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && SPLASH_PROVE_BEATS=1 bun test lib/loop/beats-render-proof.test.ts
```
Expected: PASS, ~25–40 s, with the four French claims read off the rendered page.

- [ ] **Step 7: Run the suites**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bunx tsc --noEmit && bun test lib
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(loop): the loop builds a scrolly by composing its host engine's track"
```

---

## Task 10: The run can declare the journalist's photographs

**Files:**
- Modify: `lib/loop/manifest.ts:232` (the `input` object), `lib/loop/init.ts`, `lib/loop/assemble/brief.ts`
- Modify: `lib/host/drive.ts` (the declaration path)
- Test: `lib/loop/init.test.ts`, `lib/host/*.test.ts`

**Interfaces:**
- Consumes: `ImageInput` (Task 1).
- Produces: `RunManifest["input"]["images"]?: ImageInput`, declarable at `init`.

**Why this task exists, and why the spec was wrong about it.** The design spec called
image-native "quasi trivial". Measured while planning: it is not. `RunManifest.input` is
`{ data?, article? }` — **there is no image input at all** — and `checkImageConformance`
hard-requires, per frame, `frameRef`, `caption`, `alt` (which must differ from the caption) and
`credit.name`. Splash never generates an image and never writes an alt or a credit: the
`suggest-image` skill asks the journalist for both, and refuses to fill them in. So the loop
cannot assemble an `ImageStory` until the run can carry the photographs and their per-image alt
and credit. That is this task. The captions come from the authored beats (Task 11).

- [ ] **Step 1: Write the failing test**

```ts
test("a run can freeze a folder of the journalist's images, each with its alt and credit", () => {
  const run = initRun({
    runId: "r1",
    input: { data: { path: "data.csv" }, images: {
      dir: "/abs/photos",
      frames: [
        { frameRef: "01.jpg", alt: "A flooded street, cars to the roof", credit: { name: "M. Rossi" } },
        { frameRef: "02.jpg", alt: "The same street, dry, two years later", credit: { name: "M. Rossi" } },
      ],
    } },
    sources: { mode: "real", data: { kind: "public", label: "Federal Office", url: "https://…" } },
  }, runDir);
  expect(run.ok).toBe(true);
  if (!run.ok) return;
  expect(run.value.input.images?.frames).toHaveLength(2);
});

test("an image declared without an alt is refused — Splash never writes one", () => {
  const run = initRun({ /* …one frame, alt: "" … */ }, runDir);
  expect(run.ok).toBe(false);
  if (run.ok) return;
  expect(run.message).toContain("alt");
});

test("an image declared without a credit is refused — a photo carries its photographer", () => { /* … */ });

test("a frameRef that escapes the folder is refused", () => {
  // "../../etc/passwd" and "/etc/passwd" both. The engine's conformance refuses these too;
  // refusing at declaration means the bad value never reaches a manifest on disk.
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/init.test.ts
```

- [ ] **Step 3: Extend the schema**

In `lib/loop/manifest.ts`, beside `HashRef`:

```ts
const ImageFrameSchema = z.object({
  frameRef: z.string().min(1),
  alt: z.string().min(1),
  credit: z.object({ name: z.string().min(1), url: z.string().optional() }),
});
const ImageInputSchema = z.object({
  dir: z.string().min(1),
  frames: z.array(ImageFrameSchema),
});
```

and `input: z.object({ data: HashRef.optional(), article: HashRef.optional(), images: ImageInputSchema.optional() })`.

- [ ] **Step 4: Refuse a traversal at declaration**

`initRun` rejects a `frameRef` that is absolute, contains `..`, or starts with a drive letter —
the same three shapes `checkImageConformance` refuses, refused one layer earlier so the value
never lands in a manifest. Quote the engine's message rather than inventing a second wording.

- [ ] **Step 5: Add the brief line**

In `lib/loop/assemble/brief.ts`, add the line Task 1 deferred:
`...(run.input.images ? { images: run.input.images } : {}),`.

- [ ] **Step 6: Run**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bunx tsc --noEmit && bun test lib
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(loop): a run can declare the journalist's own photographs, with alt and credit"
```

---

## Task 11: image-native — the `ImageStory` assembler and its proof

**Files:**
- Create: `lib/loop/assemble/image-native.ts`, `lib/loop/assemble/image-native.test.ts`, `lib/loop/image-e2e.test.ts`
- Modify: `lib/loop/assemble/index.ts`, `scripts/proofs.mjs`

**Interfaces:**
- Consumes: `ImageInput` (Task 10), `checkImageConformance` / `ImageStory` from `skills/image-native/src/image-story`.
- Produces: `assembleImageNative(brief)`.

**The mapping, field by field** (from `ImageStory` / `ImageStep`):

| ImageStory field | comes from |
|---|---|
| `title` | `brief.angle.confirmedTakeaway` |
| `description` | `brief.angle.altInsight` |
| `source` | `{ name: brief.attribution, url: brief.sourceUrl }` |
| `imageDir` | `brief.images.dir` (absolute — the spine writes specs to a tmp config, so a relative path resolves nowhere) |
| `frames[i].frameRef` / `.alt` / `.credit` | `brief.images.frames[i]`, verbatim |
| `frames[i].caption` | `brief.beats[i].text` — the journalist's authored beat |
| `frames[i].id` | a safe slug derived from the index (`f1`, `f2`, …): the id becomes an output FILENAME |
| `keyFrame` | `0` unless a beat is marked as the arc's peak |
| `fit` | `"canvas-frame"` — the safe editorial default |

- [ ] **Step 1: Write the failing tests**

```ts
test("captions are the authored beats, alt and credit are the journalist's, verbatim", () => {
  const r = assembleImageNative(IMAGE_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(checkImageConformance(r.value as ImageStory, { format: "scrolly" })).toEqual([]);
  const story = r.value as ImageStory;
  expect(story.frames.map((f) => f.caption)).toEqual(IMAGE_BRIEF.beats!.map((b) => b.text));
  expect(story.frames[0]!.alt).toBe(IMAGE_BRIEF.images!.frames[0]!.alt);
  expect(story.frames[0]!.credit.name).toBe("M. Rossi");
});

test("more photographs than authored beats — refused, naming the count on each side", () => {
  const r = assembleImageNative({ ...IMAGE_BRIEF, beats: IMAGE_BRIEF.beats!.slice(0, 1) });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("3");
  expect(r.message).toContain("1");
});

test("no photographs declared — the refusal says what to bring", () => {
  const r = assembleImageNative({ ...IMAGE_BRIEF, images: undefined });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("photograph");
});

test("fewer than three frames — the engine's own floor, refused before any render", () => {
  // checkImageConformance(scrolly) requires 3–6. Assert the assembler refuses at 2 with the
  // engine's own sentence, not a second wording of it.
});
```

- [ ] **Step 2: Run and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/image-native.test.ts
```

- [ ] **Step 3: Implement**

Compose the mapping table above; refuse when `images` is absent, when the frame count and the
beat count disagree, and when the frame count is outside the engine's 3–6 window for a scrolly.
`sourcePassage` stays absent: the loop has no vision matching, the caption is the journalist's
own sentence, and inventing a passage would give the overlap tripwire something to check
against that nobody wrote.

- [ ] **Step 4: Add the key and write the proof**

`lib/loop/image-e2e.test.ts`, gate `SPLASH_IMAGE_E2E=1`, with the always-on fixture-validity
test. Three real JPEGs are needed; put them in a fixtures folder under `lib/loop/fixtures/` and
keep them small (a few kB each). The positive control: open the built `scrolly.html` in
Playwright, read the three captions off `[data-step-index]`, and read the `alt` attribute off
each `<img>` — the alt is the accessibility promise, and only the DOM can prove it shipped.

- [ ] **Step 5: Run the proof**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && SPLASH_IMAGE_E2E=1 bun test lib/loop/image-e2e.test.ts
```
Expected: PASS.

- [ ] **Step 6: Join the roster** in `scripts/proofs.mjs`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(loop): the loop builds an image scrolly from declared photographs and authored beats"
```

---

## Task 12: dw-chart — the hosted chart assembler

**Files:**
- Create: `lib/loop/assemble/dw-chart.ts`, `lib/loop/assemble/dw-chart.test.ts`
- Create: `lib/loop/dw-e2e.test.ts`
- Modify: `lib/loop/assemble/index.ts`, `scripts/proofs.mjs`

**Interfaces:**
- Consumes: `validateChartSpec`, `CHART_TYPES`, `ChartSpec` from `skills/dw-chart/src/chart-spec`.
- Produces: `assembleDwChart(brief)`.

**The mapping** (from `ChartSpec`, `chart-spec.ts:167`):

| ChartSpec field | comes from |
|---|---|
| `type` | `brief.nativeType` — must be one of `CHART_TYPES` |
| `title` | `brief.angle.confirmedTakeaway` |
| `intro` | `brief.angle.altInsight` |
| `data` | `brief.dataCsv` |
| `highlight` | `brief.angle.emphasis`, only for `HIGHLIGHT_TYPES` |
| `channel` | left absent — the spine injects the canonical channel before dispatch (`withProposalChannel`) |

- [ ] **Step 1: Write the failing tests**

```ts
test("a dw chart spec clears the engine's own validator", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, nativeType: "d3-bars" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(validateChartSpec(r.value)).toEqual({ ok: true, spec: r.value, warnings: expect.anything() });
});

test("a type Datawrapper does not build is refused, listing what it does", () => {
  const r = assembleDwChart({ ...CHART_BRIEF, nativeType: "beeswarm" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("d3-bars");
});

test("emphasis becomes a highlight only where the engine supports one", () => {
  const bars = assembleDwChart({ ...CHART_BRIEF, nativeType: "d3-bars", angle: { ...CHART_BRIEF.angle, emphasis: "Basel" } });
  expect((bars.ok && (bars.value as ChartSpec).highlight)).toBe("Basel");
  const lines = assembleDwChart({ ...CHART_BRIEF, nativeType: "d3-lines", angle: { ...CHART_BRIEF.angle, emphasis: "Basel" } });
  expect(lines.ok && "highlight" in (lines.value as object)).toBe(false);
});
```

Read `validateChartSpec`'s real return shape before writing the first assertion — it may return
`{ ok, spec, warnings }` or an errors array; match it exactly rather than adapting the code to
a guessed shape.

- [ ] **Step 2: Run the tests and watch them fail**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/dw-chart.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { fail, ok, type VerbResult } from "../../core/verbs";
import type { ProductionBrief } from "../../core/production-brief";
import { CHART_TYPES } from "../../../skills/dw-chart/src/chart-spec";

export function assembleDwChart(brief: ProductionBrief): VerbResult<unknown> {
  if (!(CHART_TYPES as readonly string[]).includes(brief.nativeType))
    return fail(
      "invalid-request",
      `Datawrapper does not build a "${brief.nativeType}" — it builds ${CHART_TYPES.join(", ")}`,
    );
  return ok({
    type: brief.nativeType,
    title: brief.angle.confirmedTakeaway,
    ...(brief.angle.altInsight ? { intro: brief.angle.altInsight } : {}),
    data: brief.dataCsv,
    // The highlight is a single-series bar/column affordance only. Read HIGHLIGHT_TYPES from
    // chart-spec.ts and gate on it — emitting one on a line chart is a field DW ignores, and
    // a field nobody reads is the disease this tranche is curing.
    ...(brief.angle.emphasis && isHighlightType(brief.nativeType)
      ? { highlight: brief.angle.emphasis }
      : {}),
  });
}
```

`channel` is deliberately absent: the spine injects the canonical channel with
`withProposalChannel` before dispatch, and a second writer for it would be two homes for one
fact.

- [ ] **Step 4: Run the tests**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun test lib/loop/assemble/dw-chart.test.ts && bunx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5: Add the key and write the proof**

`lib/loop/dw-e2e.test.ts`, gate `SPLASH_DW_E2E=1`, needs `DATAWRAPPER_API_TOKEN`. It covers
both DW engines (this task adds the chart half; Task 13 adds the map half to the same file).
Positive control: the returned `publicUrl` is a resolvable https URL AND the exported PNG's
IHDR matches the channel's media size — the same floor `skills/dw-chart`'s own e2e asserts.

- [ ] **Step 6: Run the proof**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && SPLASH_DW_E2E=1 bun test lib/loop/dw-e2e.test.ts
```

- [ ] **Step 7: Join the roster, commit**

```bash
git add -A
git commit -m "feat(loop): the loop builds a hosted Datawrapper chart"
```

---

## Task 13: map-dw — the hosted map assembler

**Files:**
- Create: `lib/loop/assemble/map-dw.ts`, `lib/loop/assemble/map-dw.test.ts`
- Modify: `lib/loop/assemble/index.ts`, `lib/loop/dw-e2e.test.ts`

**Interfaces:**
- Consumes: `validateMapSpec`, `MAP_DW_TYPES`, `MapSpec` from `skills/map-dw/src/map-spec`; `brief.geo`.
- Produces: `assembleMapDw(brief)`.

**The mapping** (from `ChoroplethMapSpec`, `map-spec.ts:56`):

| MapSpec field | comes from |
|---|---|
| `mapType` | `brief.nativeType` ∈ `MAP_DW_TYPES` |
| `basemap` | a DW basemap id (e.g. `world-2019`) — **not** map-native's basemap name |
| `mapKeyAttr` | the DW join key (e.g. `DW_STATE_CODE`) |
| `regionKey` | `brief.geo.column` |
| `valueColumn` | the same value-field rule as Task 5 |
| `data` | `brief.dataCsv` |
| `title` / `intro` / `altInsight` | takeaway / — / altInsight |
| `unit` | `brief.angle.unit` — appended VERBATIM, never doubled with a `%` numberFormat token |

**Two bounded facts, from the registry itself:** `map-dw` builds only `static` and
`interactive` (animated maps are map-native's), and its `symbol` type is declared `deferred`
because `validateMapSpec`'s symbol branch pushes an unconditional error — it can never produce
one. `supports` therefore excludes `symbol`, and the refusal routes to map-native, which is
what the registry comment already tells a reader to do.

- [ ] **Step 1: Write the failing tests** — the same three shapes as Task 12 (validator clears,
      unknown type refused with the list, `symbol` refused with the map-native pointer), plus:

```ts
test("the unit is not doubled when the number format already renders a percent", () => {
  // The measured DW behaviour (map-spec.ts:235): DW APPENDS the unit without multiplying.
  // Emitting both a "%" unit and a "%" numberFormat token shipped a doubled "10% %" legend.
  const r = assembleMapDw({ ...REGION_BRIEF, nativeType: "choropleth", angle: { ...REGION_BRIEF.angle, unit: "%" } });
  const spec = r.ok ? (r.value as { unit?: string; numberFormat?: string }) : undefined;
  expect(spec?.unit === "%" && spec?.numberFormat?.includes("%")).toBe(false);
});
```

- [ ] **Step 2: Run, implement, run.**

- [ ] **Step 3: Extend the proof** in `lib/loop/dw-e2e.test.ts` with a choropleth case, same
      gate, same positive control (resolvable `publicUrl`, IHDR on the exported PNG).

- [ ] **Step 4: Add the key, run, commit**

```bash
git add -A
git commit -m "feat(loop): the loop builds a hosted Datawrapper map"
```

---

## Task 14: Close-out — the whole gate, all the proofs, the register

**Files:**
- Modify: `lib/loop/buildable.ts` (header), `lib/loop/README.md` if one exists, `docs/splash/residuals.md`, `CLAUDE.md` (the *État courant* section)

- [ ] **Step 1: The header of `buildable.ts` is now partly historical**

It describes a hand-written list and three readers. Rewrite it for what the file does now:
the list is derived from `lib/loop/assemble/index.ts`, buildability is type-aware, and the
promise it used to ask for ("adding an engine here is a promise") is now discharged by the
table's own existence. Keep every sentence that is still true — the four readers, the
resolveBuilder story, the no-cycle argument.

- [ ] **Step 2: Run the full gate**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun run check
```
Expected: 22/22. The Datawrapper suites need network; if they fail with
`FailedToOpenSocket` / `ConnectionRefused`, that is the environment, not the change — say so
explicitly rather than reporting a green you did not see.

- [ ] **Step 3: Run every proof, serially**

```
cd /Users/rmdms/Sites/Professional/splash-assemblers && bun run proofs
```
Expected: 9/9 (the six that existed plus map, image, DW). Roughly 6–10 minutes. A SKIP is a
FAILURE here — the runner enforces it.

- [ ] **Step 4: Update the register and the state note**

`docs/splash/residuals.md`: A34 struck (done in Task 8) — check it reads right in context.
`CLAUDE.md`'s *État courant*: one paragraph recording that the loop builds all six engines,
with the proof names and the two-basemap limit stated plainly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: the loop builds all six engines — gate and proofs recorded"
```

---

## Notes for the implementer

**The measured correction this plan carries.** The design spec calls image-native "quasi
trivial" (§4.4). It is not: the run manifest has no image input, and the engine hard-requires a
per-frame alt and credit that Splash is forbidden to generate. Tasks 10 and 11 close that
honestly. If you find another such gap, do the same — write down the measurement, adjust the
task, and say so. A plan that is wrong in the open is worth more than one that is quietly
worked around.

**The ordering constraint with residual A21.** A21 (`sourceKind` threading) makes
`assembleNativeSpec` emit a new field; Task 2 moves that function. A21 lands first, on
`fix/res-a21`; rebase this branch onto it before Task 2 and carry the field across in the move.

**What is deliberately NOT in this plan:** removing the V1 path (`skills/splash/SKILL.md`,
`produce-all.mjs`), adding basemaps, adding types, and the map-scrolly / image-native beat work
that is the article branch's second half.

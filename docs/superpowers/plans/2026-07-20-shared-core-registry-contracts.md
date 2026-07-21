# Shared Core + Producer Registry + Contracts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hand-mirrored engine "cores" and the orchestrator's reach-into-`src/` coupling with one imported shared-core package, a data-driven producer registry, and a single contract-validated dispatcher — so a fix lands once and every engine inherits it, and adding an engine is one file.

**Architecture:** A non-skill `lib/core/` package exposes cross-cutting correctness primitives (contrast, theme, locale, text-fit, video-verify, conformance-L0) behind one `index.ts` barrel. Each engine imports `core` via the barrel only, never another engine's `src/`. Each engine exports a `ProducerManifest` (name, formats, zod spec schema, execution model, produce fn); the orchestrator builds dispatch from a registry instead of hard-coded switches. A single dispatcher runs both transports (subprocess/in-process) behind one context/artifact contract. A `bun:test` import-guard enforces the boundary mechanically.

**Tech Stack:** Bun, TypeScript, `bun:test`, `zod` (already a dependency of the DW engines — verify at Task 7).

## Global Constraints

- Runtime **Bun** only — never `npm`/`node`. Tests use `bun:test` (`describe`/`it`/`expect`).
- **TDD**: failing test before implementation, every task.
- Code, comments, identifiers, commit messages, branch names: **English** (non-negotiable).
- **No Claude/Anthropic mention** in any committed artifact (commits, code, docs). No `Co-Authored-By`.
- **No new `any`.** No new cross-engine `src/` imports (that is the whole point).
- **Gate green each task**: `bun run check` (20 checks) must pass before every commit. It is token-free (DW/MapTiler suites self-skip without API tokens).
- **Option B**: no monorepo, no build-step. `core` is plain TS imported by relative path via its barrel.
- **Behaviour-preserving**: no rendered-output change. Where two mirrored copies diverged, a per-primitive parity test proves equivalence before the mirror is deleted.
- Work on a dedicated branch off the skills baseline (NOT `feat/splash-apertus-sovereign`). Create it in Task 0.

---

### Task 0: Scaffold `lib/core` and wire typecheck

**Files:**
- Create: `lib/core/index.ts`
- Create: `lib/core/README.md`
- Create: `lib/core/tsconfig.json` (if the repo typechecks per-dir; see step 3)
- Modify: `package.json` (scripts) and/or `scripts/check.mjs` — only if a new typecheck dir is needed
- Test: `lib/core/index.test.ts`

**Interfaces:**
- Produces: the `lib/core` barrel module (initially empty) that every later task extends. Import path from an engine at `skills/<engine>/src/foo.ts` is `../../../lib/core` (verify depth at step 4).

- [ ] **Step 1: Create the branch**

```bash
cd /Users/rmdms/Sites/Professional/splash
git checkout -b feat/shared-core-registry
```

- [ ] **Step 2: Verify the plugin loader will not treat `lib/` as a skill**

Run: `grep -rn "skills/" .claude-plugin/ 2>/dev/null; cat .claude-plugin/plugin.json`
Expected: confirm skills are discovered under `skills/` only. `lib/` is outside that root, so a dir there is not scanned for `SKILL.md`. If `plugin.json` pins an explicit skills path that would include `lib/`, fall back to a sibling non-skill path and record it. Document the chosen path in `lib/core/README.md`.

- [ ] **Step 3: Write the barrel placeholder + a smoke test**

`lib/core/index.ts`:
```ts
// Splash shared core — the single source of cross-cutting correctness primitives
// (contrast, theme, locale, text-fit, video-verify, conformance-L0). Engines import
// ONLY from this barrel, never from each other's src/. See docs/superpowers/specs/
// 2026-07-20-shared-core-registry-contracts-design.md.
export const CORE_MARKER = "splash-core" as const;
```

`lib/core/index.test.ts`:
```ts
import { describe, it, expect } from "bun:test";
import { CORE_MARKER } from "./index";

describe("core barrel", () => {
  it("exposes the marker so the package resolves", () => {
    expect(CORE_MARKER).toBe("splash-core");
  });
});
```

- [ ] **Step 4: Confirm the import depth from an engine**

Run: `cd /Users/rmdms/Sites/Professional/splash && bun -e "import.meta.resolve && console.log(require('path').relative('skills/chart-native/src','lib/core'))"`
Expected: prints `../../../lib/core`. Use this exact relative prefix in every later engine import. If the repo has path aliases (`tsconfig` `paths`), prefer an alias `@core` and add it once here instead.

- [ ] **Step 5: Add `lib` to the typecheck set if the gate typechecks per-dir**

Run: `cat scripts/check.mjs`
If it enumerates typecheck dirs, add `lib` (or `lib/core`). If it runs a single root `tsc`, no change is needed.

- [ ] **Step 6: Run the gate**

Run: `bun run check`
Expected: PASS (20 checks + the new smoke test).

- [ ] **Step 7: Commit**

```bash
git add lib/core scripts/check.mjs package.json
git commit -m "feat(core): scaffold shared-core barrel and wire typecheck"
```

---

### Task 1: Extract the contrast primitives (canary)

The pattern for every primitive-extraction task (Tasks 1–6): (a) write a parity test asserting `core.X` equals the current implementation on representative inputs, (b) move the code into `core`, (c) re-export from the old locations OR repoint importers, (d) delete the mirror, (e) gate green. Task 1 is worked in full; Tasks 2–6 apply this identical recipe to the files named in each.

**Files:**
- Create: `lib/core/contrast.ts`
- Modify: `lib/core/index.ts` (re-export contrast)
- Modify: `skills/chart-native/src/core/conformance.ts` (`relativeLuminance`, `contrastRatio` now re-exported from core)
- Modify: `skills/chart-native/src/core/contrast-scan.ts:5` (`import { contrastRatio } from "./conformance"` unchanged — conformance re-exports)
- Modify: `skills/dw-chart/src/contrast.ts` (delete the duplicated `relativeLuminance`/`contrastRatio`/`channel`, re-export from core)
- Test: `lib/core/contrast.test.ts`

**Interfaces:**
- Produces (from `core`):
  - `relativeLuminance(hex: string): number` — WCAG luminance of `#rrggbb`; throws on non-`#rrggbb`.
  - `contrastRatio(a: string, b: string): number` — 1..21.
  - `MIN_CONTRAST = 4.5`, `LARGE_TEXT_CONTRAST = 3`, `LARGE_TEXT_NORMAL_PX = 24`, `LARGE_TEXT_BOLD_PX = 18.66`.
  - `wcagMinContrast(fontPx: number, bold: boolean): number`
  - `worstContrast(fill: string, bgs: string[]): number`
  - `isContrastViolation(fill: string, bgs: string[], min?: number): boolean`
- Consumes: nothing (leaf primitive).

- [ ] **Step 1: Write the parity test (must fail — `core/contrast` does not exist)**

`lib/core/contrast.test.ts`:
```ts
import { describe, it, expect } from "bun:test";
import { relativeLuminance, contrastRatio, wcagMinContrast } from "./contrast";
// The current authoritative implementations we must stay byte-equal to:
import {
  relativeLuminance as cnLum,
  contrastRatio as cnRatio,
} from "../../skills/chart-native/src/core/conformance";

const SAMPLES = ["#ffffff", "#000000", "#18181b", "#009e73", "#71717a", "#e5e7eb"];

describe("core/contrast parity with chart-native/conformance", () => {
  it("relativeLuminance matches on every sample", () => {
    for (const c of SAMPLES) expect(relativeLuminance(c)).toBeCloseTo(cnLum(c), 12);
  });
  it("contrastRatio matches on every ordered pair", () => {
    for (const a of SAMPLES)
      for (const b of SAMPLES)
        expect(contrastRatio(a, b)).toBeCloseTo(cnRatio(a, b), 12);
  });
  it("throws on a non-#rrggbb colour", () => {
    expect(() => relativeLuminance("red")).toThrow();
  });
  it("wcagMinContrast is 3 for large/bold text, 4.5 otherwise", () => {
    expect(wcagMinContrast(24, false)).toBe(3);
    expect(wcagMinContrast(18.66, true)).toBe(3);
    expect(wcagMinContrast(16, false)).toBe(4.5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/core/contrast.test.ts`
Expected: FAIL — `Cannot find module './contrast'`.

- [ ] **Step 3: Create `lib/core/contrast.ts` with the canonical primitives**

```ts
// WCAG contrast primitives (pure). The single source for luminance/ratio/min-contrast
// across all engines — previously duplicated in chart-native/src/core/conformance.ts
// and dw-chart/src/contrast.ts.
export const MIN_CONTRAST = 4.5;
export const LARGE_TEXT_CONTRAST = 3;
export const LARGE_TEXT_NORMAL_PX = 24; // 18pt
export const LARGE_TEXT_BOLD_PX = 18.66; // 14pt

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG SC 1.4.3 minimum contrast for text of a given rendered size (CSS px) and weight. */
export function wcagMinContrast(fontPx: number, bold: boolean): number {
  const isLarge =
    fontPx >= LARGE_TEXT_NORMAL_PX || (bold && fontPx >= LARGE_TEXT_BOLD_PX);
  return isLarge ? LARGE_TEXT_CONTRAST : MIN_CONTRAST;
}

export function worstContrast(fill: string, bgs: string[]): number {
  if (bgs.length === 0) return 21;
  return bgs.reduce((w, bg) => Math.min(w, contrastRatio(fill, bg)), 21);
}

export function isContrastViolation(
  fill: string,
  bgs: string[],
  min: number = MIN_CONTRAST,
): boolean {
  return worstContrast(fill, bgs) < min;
}
```

- [ ] **Step 4: Run the parity test to verify it passes**

Run: `bun test lib/core/contrast.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-export from `core` barrel**

Append to `lib/core/index.ts`:
```ts
export * from "./contrast";
```

- [ ] **Step 6: Repoint chart-native's conformance to core (keep its public names)**

In `skills/chart-native/src/core/conformance.ts`, replace the local `channel`/`relativeLuminance`/`contrastRatio` definitions with a re-export so every existing importer (`contrast-scan.ts:5`, others) keeps working unchanged:
```ts
export {
  relativeLuminance,
  contrastRatio,
  MIN_CONTRAST,
} from "../../../../lib/core/contrast";
```
Then delete the now-duplicated local definitions of those three symbols in that file. (Verify the exact relative depth from `skills/chart-native/src/core/` is `../../../../lib/core/contrast` — one deeper than `src/`.)

- [ ] **Step 7: Delete dw-chart's mirror**

In `skills/dw-chart/src/contrast.ts`, delete the local `channel`/`relativeLuminance`/`contrastRatio` and re-export from core, preserving the file's other exports (`WHITE`, `INK`):
```ts
export { relativeLuminance, contrastRatio, MIN_CONTRAST } from "../../../lib/core/contrast";
export const WHITE = "#ffffff";
export const INK = "#18181b";
```

- [ ] **Step 8: Run the full gate**

Run: `bun run check`
Expected: PASS. chart-native and dw-chart contrast tests still green (they now exercise the core implementation through the re-exports).

- [ ] **Step 9: Commit**

```bash
git add lib/core skills/chart-native/src/core/conformance.ts skills/dw-chart/src/contrast.ts
git commit -m "refactor(core): extract WCAG contrast primitives into shared core"
```

---

### Task 2: Extract theme / `deriveFurniture`

**Files:**
- Create: `lib/core/theme.ts`; Test: `lib/core/theme.test.ts`
- Modify: `skills/chart-native/src/core/tokens.ts` (source of `deriveFurniture`), `skills/map-native/src/theme/map-tokens.ts` (the mirror), `lib/core/index.ts`

**Interfaces:**
- Consumes: `core/contrast` (theme derivation uses contrast to pick max-contrast ink poles).
- Produces: `deriveFurniture(themeBg: string): Furniture` and `resolveFrameColors(themeBg: string): FrameColors` — **read `skills/chart-native/src/core/tokens.ts` for the exact `Furniture` shape and signature before writing the test**; the two mirrors may have diverged (audit: map has a second impl), so diff them first.

- [ ] **Step 1: Diff the two implementations**

Run: `diff <(sed -n '/deriveFurniture/,/^}/p' skills/chart-native/src/core/tokens.ts) <(sed -n '/deriveFurniture/,/^}/p' skills/map-native/src/theme/map-tokens.ts)`
Expected: shows where they diverge. If they diverge in behaviour (not just naming), STOP and decide the correct WCAG-grounded rule before merging (spec §5 invariant); record the decision in the commit body. If identical modulo names, proceed.

- [ ] **Step 2: Write the parity test (fails — `core/theme` absent)**

`lib/core/theme.test.ts` — assert `core.deriveFurniture(bg)` deep-equals the current chart-native `deriveFurniture(bg)` for a spread of backgrounds:
```ts
import { describe, it, expect } from "bun:test";
import { deriveFurniture } from "./theme";
import { deriveFurniture as cnFurniture } from "../../skills/chart-native/src/core/tokens";

const BGS = ["#ffffff", "#0b1220", "#f4c9d7", "#36454f", "#71717a", "#009e73"];
describe("core/theme parity with chart-native tokens", () => {
  it("deriveFurniture matches on every background", () => {
    for (const bg of BGS) expect(deriveFurniture(bg)).toEqual(cnFurniture(bg));
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bun test lib/core/theme.test.ts` → FAIL (`Cannot find module './theme'`).

- [ ] **Step 4: Move `deriveFurniture` (+ `resolveFrameColors` + the `Furniture`/`FrameColors` types) into `lib/core/theme.ts`**

Copy the canonical implementation from `skills/chart-native/src/core/tokens.ts` verbatim into `lib/core/theme.ts`, changing its contrast imports to `./contrast`. Export the types and functions.

- [ ] **Step 5: Run the parity test → PASS.** `bun test lib/core/theme.test.ts`

- [ ] **Step 6: Re-export + repoint both engines**

Append `export * from "./theme";` to `lib/core/index.ts`. In `tokens.ts` and `map-tokens.ts`, delete the local `deriveFurniture`/`resolveFrameColors` and re-export from `../../../../lib/core/theme` (chart) and `../../../../lib/core/theme` (map — verify depth from `skills/map-native/src/theme/`).

- [ ] **Step 7: Gate green.** `bun run check` → PASS.

- [ ] **Step 8: Commit.** `git commit -am "refactor(core): extract theme/deriveFurniture into shared core"`

---

### Task 3: Extract locale / i18n furniture

**Files:**
- Create: `lib/core/locale.ts`, `lib/core/i18n-furniture.ts`; Tests alongside
- Modify (delete mirrors, re-export): `skills/chart-native/src/core/locale.ts`, `skills/map-native/src/core/locale.ts`, `skills/dw-chart/src/furniture-i18n.ts`, `skills/map-dw/src/furniture-i18n.ts`, `lib/core/index.ts`

**Interfaces:**
- Produces: number/locale formatting fns and the i18n furniture fns — **read the four listed files for exact signatures before writing tests**; they are mirrors, so pick chart-native/map-native `locale.ts` as canonical for `locale`, and `dw-chart/src/furniture-i18n.ts` as canonical for `i18n-furniture`.

- [ ] **Step 1:** Diff the mirror pairs (`chart-native/src/core/locale.ts` vs `map-native/src/core/locale.ts`; `dw-chart/src/furniture-i18n.ts` vs `map-dw/src/furniture-i18n.ts`). Same divergence rule as Task 2 Step 1.
- [ ] **Step 2:** Write parity tests (`core.locale.*` deep-equals current canonical on a locale/number spread incl. `fr`/`de`/`it`; `core.i18nFurniture.*` deep-equals current). Run → FAIL.
- [ ] **Step 3:** Move canonical impls into `lib/core/locale.ts` and `lib/core/i18n-furniture.ts`. Run parity → PASS.
- [ ] **Step 4:** Re-export from barrel; delete the four mirrors' bodies, re-export from core.
- [ ] **Step 5:** `bun run check` → PASS. Commit `refactor(core): extract locale + i18n furniture into shared core`.

---

### Task 4: Extract text-fit

**Files:**
- Create: `lib/core/text-fit.ts`; Test alongside
- Modify: the text-measurement/gutter source (`skills/chart-native/src/core/text.ts` — `endLabelGutterPx`, `leftLabelGutterPx`, `sourceFooterReserve`) and any map/scrolly mirror; `lib/core/index.ts`

**Interfaces:**
- Produces: `endLabelGutterPx`, `leftLabelGutterPx`, `sourceFooterReserve`, and the text-measurement helpers — **read `skills/chart-native/src/core/text.ts` for exact signatures first.** Consumes: none (pure geometry).

- [ ] **Step 1:** `rg -l "endLabelGutterPx|leftLabelGutterPx|sourceFooterReserve|measureText" skills/` to find every definition and mirror.
- [ ] **Step 2:** Write parity test vs the current chart-native `text.ts` exports on representative label strings/widths. Run → FAIL.
- [ ] **Step 3:** Move the canonical impl into `lib/core/text-fit.ts`. Run parity → PASS.
- [ ] **Step 4:** Re-export from barrel; repoint importers; delete mirrors.
- [ ] **Step 5:** `bun run check` → PASS. Commit `refactor(core): extract text-fit gutters into shared core`.

---

### Task 5: Extract video-verify

**Files:**
- Create: `lib/core/video-verify.ts`; Test alongside
- Modify: `skills/chart-native/src/core/video-verify.ts`, `skills/map-native/src/core/video-verify.ts` (the audit confirms map's header reads "MIRROR of chart-native"), `lib/core/index.ts`

**Interfaces:**
- Produces: the video-verify contract fns — **read both files first**; chart-native is canonical, map-native is the declared mirror. Consumes: possibly `core/contrast` (still-frame checks) — verify.

- [ ] **Step 1:** Diff the two `video-verify.ts`. Same divergence rule.
- [ ] **Step 2:** Write parity test vs current chart-native exports. Run → FAIL.
- [ ] **Step 3:** Move canonical into `lib/core/video-verify.ts`. Run parity → PASS.
- [ ] **Step 4:** Re-export; delete both mirrors' bodies, re-export from core.
- [ ] **Step 5:** `bun run check` → PASS. Commit `refactor(core): extract video-verify into shared core`.

---

### Task 6: Extract the L0 conformance base

**Files:**
- Create: `lib/core/conformance-l0.ts`; Test alongside
- Modify: `skills/chart-native/src/core/conformance.ts`, `skills/map-native/src/conformance.ts` (header: "Shared L0 … mirrors chart-native's"), `skills/scrolly/src/conformance.ts`, `lib/core/index.ts`

**Interfaces:**
- Produces: the header-rules base that EVERY type/format must satisfy — presence of title/source/alt-text, furniture invariants. **This is the subtlest extraction: read all three `conformance.ts` files and identify the genuinely-common L0 rules vs the per-type rules that must stay.** Only the L0 base moves; per-type rules stay in each engine and call `core.conformanceL0(...)`.

- [ ] **Step 1:** In each of the three `conformance.ts`, mark the L0 header-rule block (the checks that reference only title/source/alt-text/furniture, not type geometry). Confirm they encode the same rule (map-native's header claims so).
- [ ] **Step 2:** Write a parity test: feed a fixture header record (title/source/alt present, then each missing) and assert `core.conformanceL0` returns the same violations the current chart-native L0 block returns. Run → FAIL.
- [ ] **Step 3:** Move the L0 block into `lib/core/conformance-l0.ts` as a pure `conformanceL0(header): Violation[]`. Run parity → PASS.
- [ ] **Step 4:** In each engine's `conformance.ts`, replace the inline L0 block with a call to `core.conformanceL0(...)`, keeping the per-type rules. Re-export from barrel.
- [ ] **Step 5:** `bun run check` → PASS. Commit `refactor(core): extract L0 conformance base into shared core`.

---

### Task 7: Producer registry

**Files:**
- Create: `lib/core/registry.ts` (types + `registerProducer`/`getProducer`/`allProducers`)
- Create: `skills/chart-native/src/manifest.ts`, `skills/map-native/src/manifest.ts`, `skills/dw-chart/src/manifest.ts`, `skills/map-dw/src/manifest.ts`, `skills/scrolly/src/manifest.ts`
- Modify: `skills/splash/src/producer-spec.ts` (`Producer` becomes derived from the registry), `skills/splash/src/adapters.ts` (dispatch reads the registry), and the enumeration sites `validate-gate.ts`, `producer-guard.ts`, `guardrail-parity.ts`, `brand-profile.ts`, `export-code.mjs`
- Test: `lib/core/registry.test.ts`

**Interfaces:**
- Consumes: `VisualFormat` (from `producer-spec.ts`).
- Produces:
  ```ts
  type ExecutionModel = "subprocess" | "in-process";
  interface ProducerManifest {
    name: string;                       // e.g. "chart-native"
    formats: readonly VisualFormat[];
    specSchema: import("zod").ZodTypeAny; // spec-in contract
    execution: ExecutionModel;
    // subprocess: { scriptPath, skillDir, threadsChannel }
    // in-process: { produce(spec, ctx): Promise<DeliveredArtifact> }
    subprocess?: { scriptPath: string; skillDir: string; threadsChannel: boolean };
    inProcess?: (spec: unknown, ctx: import("./contract").ProduceContext) => Promise<import("./contract").DeliveredArtifact>;
  }
  function registerProducer(m: ProducerManifest): void;
  function getProducer(name: string): ProducerManifest | undefined;
  function allProducers(): ProducerManifest[];
  ```

- [ ] **Step 1: Verify `zod` is available**

Run: `grep -rn '"zod"' skills/*/package.json package.json; bun pm ls 2>/dev/null | grep zod`
Expected: zod present (dw-chart/map-dw use validators). If absent as a root dep, add it: `bun add zod`.

- [ ] **Step 2: Write the registry unit test (fails — module absent)**

`lib/core/registry.test.ts`:
```ts
import { describe, it, expect } from "bun:test";
import { registerProducer, getProducer, allProducers } from "./registry";
import { z } from "zod";

describe("producer registry", () => {
  it("registers and retrieves a manifest with no other edits", () => {
    registerProducer({
      name: "fake-engine",
      formats: ["static"],
      specSchema: z.object({ x: z.number() }),
      execution: "in-process",
      inProcess: async () => ({ format: "static", form: "file", files: [], report: {} }),
    });
    expect(getProducer("fake-engine")?.formats).toEqual(["static"]);
    expect(allProducers().some((m) => m.name === "fake-engine")).toBe(true);
  });
});
```

- [ ] **Step 3: Run → FAIL.** `bun test lib/core/registry.test.ts`

- [ ] **Step 4: Implement `lib/core/registry.ts`**

```ts
import type { VisualFormat } from "../../skills/splash/src/producer-spec";
import type { ProduceContext, DeliveredArtifact } from "./contract";
import type { ZodTypeAny } from "zod";

export type ExecutionModel = "subprocess" | "in-process";

export interface ProducerManifest {
  name: string;
  formats: readonly VisualFormat[];
  specSchema: ZodTypeAny;
  execution: ExecutionModel;
  subprocess?: { scriptPath: string; skillDir: string; threadsChannel: boolean };
  inProcess?: (spec: unknown, ctx: ProduceContext) => Promise<DeliveredArtifact>;
}

const REGISTRY = new Map<string, ProducerManifest>();

export function registerProducer(m: ProducerManifest): void {
  if (REGISTRY.has(m.name)) throw new Error(`producer already registered: ${m.name}`);
  if (m.execution === "subprocess" && !m.subprocess)
    throw new Error(`subprocess producer ${m.name} missing subprocess config`);
  if (m.execution === "in-process" && !m.inProcess)
    throw new Error(`in-process producer ${m.name} missing inProcess fn`);
  REGISTRY.set(m.name, m);
}
export function getProducer(name: string): ProducerManifest | undefined {
  return REGISTRY.get(name);
}
export function allProducers(): ProducerManifest[] {
  return [...REGISTRY.values()];
}
```
(NOTE: `./contract` is created in Task 8. To keep Task 7 self-testing, define `ProduceContext`/`DeliveredArtifact` as minimal placeholders in `lib/core/contract.ts` now — Task 8 fills them in.)

- [ ] **Step 5: Create the five manifests** (one per engine), each importing its existing spec schema/validator and produce entry. Example `skills/dw-chart/src/manifest.ts`:
```ts
import { z } from "zod";
import { registerProducer } from "../../../lib/core/registry";
import { produceChart } from "./produce";
// ... reuse the engine's existing spec schema; wrap produceChart in the in-process contract in Task 8.
registerProducer({
  name: "dw-chart",
  formats: ["static", "interactive"],
  specSchema: z.any(), // replace with the real ChartSpec zod schema (read chart-spec.ts)
  execution: "in-process",
  inProcess: async () => { throw new Error("wired in Task 8"); },
});
```
Subprocess engines (chart-native, map-native, scrolly) set `execution: "subprocess"` with `scriptPath`/`skillDir` copied from the current `SCRIPT`/`SKILL_DIR` maps in `adapters.ts:121-134` and `threadsChannel` from `CHANNEL_THREADED_PRODUCERS`.

- [ ] **Step 6: Derive `Producer` from the registry** in `producer-spec.ts` (keep the string union as the canonical type for now, but add a runtime `isRegisteredProducer(name)` check that reads `getProducer`). Migrate `isFileBased`, the `SCRIPT`/`SKILL_DIR` maps, and the `realDispatch` producer switch in `adapters.ts` to read `getProducer(p.producer)` instead of hard-coded branches. Migrate the enumerations in `validate-gate.ts`, `producer-guard.ts`, `guardrail-parity.ts`, `brand-profile.ts`, `export-code.mjs` to `allProducers()`/`getProducer()`.

- [ ] **Step 7: Add the "one file adds an engine" proof test.** In `lib/core/registry.test.ts`, assert that dispatch for a freshly-registered manifest works through the registry without importing any engine-specific dispatch code.

- [ ] **Step 8: Gate green.** `bun run check` → PASS.

- [ ] **Step 9: Commit.** `git commit -am "refactor(splash): dispatch via a producer registry instead of hard-coded sites"`

---

### Task 8: Unified dispatcher + zod contracts

**Files:**
- Create/fill: `lib/core/contract.ts` (`ProduceContext`, `DeliveredArtifact`, `assertDeliveredContract`)
- Modify: `skills/splash/src/adapters.ts` (single `realDispatch` reading `manifest.execution`), `skills/splash/src/export-guard.ts` (fold `assertDelivered` into the contract), the five `manifest.ts` `inProcess`/subprocess wrappers
- Test: `lib/core/contract.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ProduceContext { channel: Channel; format: VisualFormat; outDir: string; id: string; themeBg?: string; locale?: string; }
  interface DeliveredArtifact { format: VisualFormat; form: "file" | "hosted"; files: string[]; publicUrl?: string; report: Record<string, unknown>; }
  function assertDeliveredContract(a: DeliveredArtifact): void; // throws on shape violation (single-format delivery)
  ```
- Consumes: registry (Task 7), `Channel`/`VisualFormat` (`producer-spec.ts`, `channel.ts`).

- [ ] **Step 1: Write the contract test (fails).** Assert: a valid in-process artifact passes `assertDeliveredContract`; a static artifact with 2 files throws; a hosted artifact with no `publicUrl` throws. Assert `specSchema.parse` on a bad spec throws with a field-listing message.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `lib/core/contract.ts`** (`ProduceContext`, `DeliveredArtifact`, `assertDeliveredContract` — port the current `assertDelivered` logic from `skills/splash/src/export-guard.ts:68` into the contract clause).

- [ ] **Step 4: Rewrite `realDispatch` as one uniform path**: look up `getProducer(p.producer)`, `specSchema.parse(p.spec)` at the boundary, build `ProduceContext`, run `execution === "subprocess"` (spawn via the existing `dispatchFileBased`/`execFileSync`, threading channel per `threadsChannel`) or `inProcess(spec, ctx)`, then `assertDeliveredContract(result)`. Delete the per-producer `if (p.producer === "dw-chart")`/`map-dw` branches (`adapters.ts:325-387`) — they become one path. Wire each engine's real produce fn into its manifest (`produceChart`/`produceMap` in-process; the subprocess wrapper for natives returning a `DeliveredArtifact` from `collectOutputs`).

- [ ] **Step 5: Point `export-guard.ts` at the contract** (`assertDelivered` delegates to `assertDeliveredContract`), preserving its call sites in `export-code.mjs`.

- [ ] **Step 6: Gate green.** `bun run check` → PASS (adapters/export-guard suites still green).

- [ ] **Step 7: Commit.** `git commit -am "refactor(splash): single contract-validated dispatcher (spec-in/artifact-out)"`

---

### Task 9: Activate the import-guard

**Files:**
- Create: `skills/splash/src/import-guard.test.ts` (or `lib/core/import-guard.test.ts`)

**Interfaces:** Consumes: the finished state of Tasks 1–8 (no cross-engine reach-ins remain). Produces: a gate check that fails on any future reach-in.

- [ ] **Step 1: Write the guard test (should PASS now that reach-ins are gone).**

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { Glob } from "bun";

// No engine may import another engine's src/; shared code comes only from lib/core.
const ENGINES = ["chart-native", "map-native", "dw-chart", "map-dw", "scrolly"];
const OFFENDER = /from\s+["']\.\.\/\.\.\/(chart-native|map-native|dw-chart|map-dw)\/src\//;
// Allowlist: scrolly composes host-engine RENDER COMPONENTS (documented in the spec).
const ALLOW = (file: string) => file.includes("/scrolly/");

describe("import-guard: no cross-engine src reach-in", () => {
  it("no engine reaches into another engine's src (except scrolly components)", async () => {
    const offenders: string[] = [];
    for (const eng of ENGINES) {
      const glob = new Glob(`skills/${eng}/**/*.{ts,tsx,mjs}`);
      for await (const f of glob.scan(".")) {
        if (ALLOW(f)) continue;
        if (OFFENDER.test(readFileSync(f, "utf8"))) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → PASS.** `bun test skills/splash/src/import-guard.test.ts`. If any offender remains, it is a reach-in Tasks 1–8 missed — fix it (repoint to `lib/core`) before continuing.

- [ ] **Step 3: Ensure the guard is in the gate.** Confirm the test dir is in `scripts/check.mjs` TEST_DIRS (splash is). Run `bun run check` → PASS.

- [ ] **Step 4: Commit.** `git commit -am "test(core): enforce no cross-engine src imports (import-guard)"`

---

## Self-Review

**Spec coverage:** §4.1 core modules → Tasks 1–6; §4.2 import-guard → Task 9; §4.3 registry → Task 7; §4.4 contracts/dispatcher → Task 8; §5 migration order (contrast→…→L0→registry→dispatcher→guard) → Task order 1-9 matches; §6 tests (parity per primitive, import-guard, "add engine = one file", zod rejection) → covered in Tasks 1-9; §7 risks (blind-merge → parity tests; loader path → Task 0 Step 2; big-bang → per-task gate; guard-last → Task 9; scrolly → allowlist in Task 9). No gap.

**Placeholder scan:** Tasks 2–6 use a deliberately uniform recipe and instruct reading the exact source before writing each parity test — this is because they are *move* refactors of files not read at plan-time; the recipe, file paths, and parity-test template are concrete, and Task 1 is the fully-worked reference. This is honest for a mechanical move (fabricating unread signatures would be worse). Task 7 Step 5 `z.any()` is a labelled interim replaced by the real schema in the same step's instruction. No silent TODOs.

**Type consistency:** `ProducerManifest`, `ProduceContext`, `DeliveredArtifact`, `ExecutionModel`, `registerProducer/getProducer/allProducers`, `assertDeliveredContract` are named identically across Tasks 7–9. `lib/core/contract.ts` is introduced as a placeholder in Task 7 Step 4 and filled in Task 8 (noted explicitly to avoid a forward-reference break).

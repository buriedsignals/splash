# Deterministic Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production→export mechanical spine so the splash pipeline produces every accepted proposal in code (never silently drops one), catches the dw-chart fallback, and refuses to ship an unproduced/unapproved visual — while `②` stays the host agent.

**Architecture:** A pure, injectable batch loop (`produceAll`) iterates accepted proposals and returns a structured report; real per-producer adapters do the dispatch (file-based CLIs vs cloud-publishing fns); a thin CLI wraps it; the irreversible export/deploy scripts refuse unless a proposal is `produced` and render-approved. New code lives in `skills/splash/src` (typed, typechecked) with `.mjs` CLI entries.

**Tech Stack:** Bun, TypeScript, `bun:test`. No new runtime deps.

## Global Constraints

- Runtime **Bun** only (never npm/node), except where an existing producer already shells out.
- Code, comments, identifiers, commit messages, branch names: **English**.
- **No Claude/Anthropic mention** in any artifact (code, comments, commits).
- `bun run check` (root) MUST stay green after every task (tsc for the tsconfig skills + all test suites).
- No `any`, no `@ts-ignore` (match the tsc-floor discipline just merged).
- TDD: failing test first, minimal impl, green, commit. Frequent commits.
- Scope: this plan is the splash spine ONLY. Out of scope (follow-on plans): the typed `producer`/`format` discriminant on every producer spec type; the blocking-vs-advisory warning taxonomy across all validators; conformance-at-produce; the 4→41 native dispatch table. This plan reads `producer`/`format` as runtime fields on the accepted proposals (as the SKILL.md convention already emits them).

---

## File Structure

- Create `skills/splash/src/producer-spec.ts` — the `AcceptedProposal`, `ProposalResult`, `ProduceReport` types + `Producer`/`VisualFormat` unions. One responsibility: the orchestration contract.
- Create `skills/splash/src/produce-all.ts` — the pure batch loop `produceAll(accepted, outDir, dispatch)`. No I/O; dispatch injected.
- Create `skills/splash/src/map-data.ts` — `toCsv(rows)` / `toRows(csv)`, the map DATA-layer derivation (geo binding NOT derived).
- Create `skills/splash/src/adapters.ts` — `realDispatch`: per-producer adapter (file-based exec vs cloud fn) + `VisualFormat`→producer-flag mapping.
- Create `skills/splash/src/gate.ts` — `applyRenderGate(report, id, artifactPath)`: the ONLY writer of `renderApproved` + `approvedHash`.
- Create `skills/splash/scripts/produce-all.mjs` — CLI: read `accepted.json`, run `produceAll` with `realDispatch`, print the report JSON.
- Create `skills/splash/scripts/gate-render.mjs` — CLI: `applyRenderGate` on a report file after the human says "ship it".
- Create `skills/splash/tsconfig.json` + `skills/splash/package.json` — so `bunx tsc --noEmit` covers the new code.
- Modify `skills/splash/scripts/export-code.mjs` + `skills/splash/scripts/deploy-embed.mjs` — refuse (non-zero) unless the shipped proposal is `produced` AND render-approved.
- Modify `scripts/check.mjs` — add `skills/splash` to `TSC_DIRS`.
- Tests under `skills/splash/tests/`.

---

## Task 1: Orchestration types + splash typecheck wiring

**Files:**
- Create: `skills/splash/src/producer-spec.ts`
- Create: `skills/splash/tsconfig.json`
- Create: `skills/splash/package.json`
- Modify: `scripts/check.mjs` (add `skills/splash` to `TSC_DIRS`)
- Test: `skills/splash/tests/producer-spec.test.ts`

**Interfaces:**
- Produces: the types every later task consumes — exact shapes below.

- [ ] **Step 1: Write `producer-spec.ts`**

```ts
// The orchestration contract: what the agent hands the spine, and what it gets back.
export type Producer =
  | "dw-chart" | "chart-native" | "map-dw" | "map-native" | "scrolly";
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

export interface AcceptedProposal {
  id: string;                 // stable, unique per run (keys the per-proposal outDir)
  producer: Producer;
  format: VisualFormat;
  spec: unknown;              // the producer-specific, already-validated spec
  provenance?: "table" | "prose" | "none";
  confirmedTable?: boolean;   // Gate 2b: set true only after the human confirms the prose table
}

export type ProduceStatus =
  | "produced" | "failed" | "needs-fallback" | "needs-confirmation";

export interface ProposalResult {
  id: string;
  producer: Producer;
  format: VisualFormat;
  status: ProduceStatus;
  outputs?: string[];         // file paths (file-based producers)
  publicUrl?: string;         // hosted URL (cloud producers)
  reason?: string;            // needs-fallback / needs-confirmation explanation
  error?: string;             // failed explanation
  renderApproved: boolean;    // Gate 3, default false
  approvedHash?: string;      // sha256 of the approved artifact, set by the render gate
}

export interface ProduceReport { results: ProposalResult[]; }
```

- [ ] **Step 2: Write `skills/splash/package.json`**

```json
{
  "name": "splash-orchestration",
  "private": true,
  "devDependencies": { "@types/node": "26.1.0", "typescript": "6.0.3" },
  "scripts": { "test": "bun test" }
}
```

Run: `cd skills/splash && bun install`
Expected: installs @types/node + typescript.

- [ ] **Step 3: Write `skills/splash/tsconfig.json`** (mirror the other skills, minus react)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"],
    "allowImportingTsExtensions": true
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 4: Write the failing test `tests/producer-spec.test.ts`**

```ts
import { describe, it, expect } from "bun:test";
import type { ProposalResult } from "../src/producer-spec";

describe("producer-spec", () => {
  it("models a produced result with the required bookkeeping fields", () => {
    const r: ProposalResult = {
      id: "p1", producer: "chart-native", format: "video",
      status: "produced", outputs: ["out/p1/landscape.mp4"], renderApproved: false,
    };
    expect(r.status).toBe("produced");
    expect(r.renderApproved).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests + typecheck**

Run: `cd skills/splash && bun test tests/producer-spec.test.ts && bunx tsc --noEmit`
Expected: test PASS, tsc exits 0.

- [ ] **Step 6: Add splash to the root gate**

In `scripts/check.mjs`, change `const TSC_DIRS = ["skills/chart-native", "skills/map-native", "skills/scrolly"];` to include `"skills/splash"`.

Run: `bun run check`
Expected: `13/13 checks passed.` (12 previous + splash tsc)

- [ ] **Step 7: Commit**

```bash
git add skills/splash/src/producer-spec.ts skills/splash/tsconfig.json skills/splash/package.json skills/splash/tests/producer-spec.test.ts skills/splash/bun.lock scripts/check.mjs
git commit -m "feat(splash): orchestration contract types + typecheck wiring"
```

---

## Task 2: Map DATA-layer derivation (toCsv / toRows)

**Files:**
- Create: `skills/splash/src/map-data.ts`
- Test: `skills/splash/tests/map-data.test.ts`

**Interfaces:**
- Produces: `toCsv(rows: Row[]): string`, `toRows(csv: string): Row[]`, `interface Row { [col: string]: string | number }`.

- [ ] **Step 1: Write the failing test `tests/map-data.test.ts`**

```ts
import { describe, it, expect } from "bun:test";
import { toCsv, toRows } from "../src/map-data";

describe("map-data derivation", () => {
  it("round-trips rows -> csv -> rows (numbers stay numbers)", () => {
    const rows = [{ code: "FRA", value: 10 }, { code: "SWE", value: 70 }];
    expect(toRows(toCsv(rows))).toEqual(rows);
  });
  it("toCsv emits a header from the first row's keys", () => {
    expect(toCsv([{ code: "FRA", value: 10 }])).toBe("code,value\nFRA,10");
  });
  it("toRows keeps non-numeric cells as strings", () => {
    expect(toRows("city,pop\nParis,2100")).toEqual([{ city: "Paris", pop: 2100 }]);
  });
  it("toCsv of an empty array is an empty string", () => {
    expect(toCsv([])).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/map-data.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/map-data.ts`**

```ts
// The two map DATA views (map-dw uses a CSV string, map-native uses a rows array).
// Only the DATA payload is mechanically derivable; the geo binding (basemap, join key)
// is producer-specific and supplied by the agent — NOT derived here.
export interface Row { [col: string]: string | number }

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const body = rows
    .map((r) => cols.map((c) => String(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function toRows(csv: string): Row[] {
  const lines = csv.trim().split("\n");
  const cols = lines[0].split(",");
  return lines.slice(1).filter((l) => l.length > 0).map((line) => {
    const cells = line.split(",");
    const row: Row = {};
    cols.forEach((c, i) => {
      const raw = cells[i] ?? "";
      const n = Number(raw);
      row[c] = raw !== "" && !Number.isNaN(n) ? n : raw;
    });
    return row;
  });
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `cd skills/splash && bun test tests/map-data.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc 0.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/map-data.ts skills/splash/tests/map-data.test.ts
git commit -m "feat(splash): map data-layer derivation (toCsv/toRows)"
```

---

## Task 3: The pure batch loop (produceAll) — the drop-proof guarantee

**Files:**
- Create: `skills/splash/src/produce-all.ts`
- Test: `skills/splash/tests/produce-all.test.ts`

**Interfaces:**
- Consumes: `AcceptedProposal`, `ProposalResult`, `ProduceReport` (Task 1).
- Produces: `type Dispatch = (p: AcceptedProposal, outDir: string) => Promise<Pick<ProposalResult, "status" | "outputs" | "publicUrl" | "reason" | "error">>` and `produceAll(accepted, outDir, dispatch): Promise<ProduceReport>`.

- [ ] **Step 1: Write the failing test `tests/produce-all.test.ts`**

```ts
import { describe, it, expect } from "bun:test";
import { produceAll, type Dispatch } from "../src/produce-all";
import type { AcceptedProposal } from "../src/producer-spec";

const p = (id: string, extra: Partial<AcceptedProposal> = {}): AcceptedProposal => ({
  id, producer: "chart-native", format: "static", spec: {}, ...extra,
});

describe("produceAll", () => {
  it("reports EVERY accepted proposal even when the middle one throws (drop-proof)", async () => {
    const dispatch: Dispatch = async (prop) => {
      if (prop.id === "p2") throw new Error("boom");
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    const { results } = await produceAll([p("p1"), p("p2"), p("p3")], "out", dispatch);
    expect(results.map((r) => r.id)).toEqual(["p1", "p2", "p3"]);
    expect(results.map((r) => r.status)).toEqual(["produced", "failed", "produced"]);
    expect(results[1].error).toContain("boom");
  });

  it("refuses a prose proposal without confirmation (needs-confirmation, not produced)", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { provenance: "prose" })], "out", dispatch,
    );
    expect(results[0].status).toBe("needs-confirmation");
  });

  it("produces a prose proposal once confirmedTable is true", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { provenance: "prose", confirmedTable: true })], "out", dispatch,
    );
    expect(results[0].status).toBe("produced");
  });

  it("passes the per-proposal outDir <outDir>/<id> to dispatch", async () => {
    let seen = "";
    const dispatch: Dispatch = async (_p, dir) => { seen = dir; return { status: "produced" }; };
    await produceAll([p("p1")], "root", dispatch);
    expect(seen).toBe("root/p1");
  });

  it("carries dispatch's needs-fallback through unchanged", async () => {
    const dispatch: Dispatch = async () => ({ status: "needs-fallback", reason: "UnsupportedNativeType: sankey" });
    const { results } = await produceAll([p("p1")], "out", dispatch);
    expect(results[0].status).toBe("needs-fallback");
    expect(results[0].reason).toContain("sankey");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/produce-all.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/produce-all.ts`**

```ts
import type { AcceptedProposal, ProduceReport, ProposalResult } from "./producer-spec";

// Produce ONE proposal → its outcome (bookkeeping fields are added by produceAll).
export type Dispatch = (
  p: AcceptedProposal,
  outDir: string,
) => Promise<Pick<ProposalResult, "status" | "outputs" | "publicUrl" | "reason" | "error">>;

// The reliability win: this loop lives in CODE, not in the agent's diligence. Every
// accepted proposal appears in results with a status — a secondary proposal cannot drop.
export async function produceAll(
  accepted: AcceptedProposal[],
  outDir: string,
  dispatch: Dispatch,
): Promise<ProduceReport> {
  const results: ProposalResult[] = [];
  for (const p of accepted) {
    const base = {
      id: p.id, producer: p.producer, format: p.format, renderApproved: false,
    };
    // Gate 2b: a prose figure must be human-confirmed before it is charted. The trigger
    // (provenance === "prose") is set by suggest-article from the data, so this gate is
    // mechanical (not a self-declared boolean from the shipping step).
    if (p.provenance === "prose" && p.confirmedTable !== true) {
      results.push({
        ...base, status: "needs-confirmation",
        reason: "prose provenance requires human table confirmation (Gate 2b)",
      });
      continue;
    }
    try {
      const r = await dispatch(p, `${outDir}/${p.id}`);
      results.push({ ...base, ...r });
    } catch (e) {
      results.push({
        ...base, status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { results };
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `cd skills/splash && bun test tests/produce-all.test.ts && bunx tsc --noEmit`
Expected: PASS (5 tests), tsc 0.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/produce-all.ts skills/splash/tests/produce-all.test.ts
git commit -m "feat(splash): drop-proof produce-all batch loop"
```

---

## Task 4: Real dispatch adapters (file-based vs cloud producers)

**Files:**
- Create: `skills/splash/src/adapters.ts`
- Test: `skills/splash/tests/adapters.test.ts`

**Interfaces:**
- Consumes: `AcceptedProposal`, the `Dispatch` shape (Task 3), `toCsv` (Task 2).
- Produces: `realDispatch: Dispatch`; `formatFlag(producer, format): string` (exported for testing).

**Context — read the real producer entries first (they differ):**
- File-based: `skills/chart-native/scripts/produce-from-spec.mjs` (`<nativeSpec.json> <outDir> [all|static]`, exit code 2 = `FALLBACK_TO_DW`), `skills/map-native/scripts/produce.mjs` (`<config.json> <outDir> <static|reveal|story|scrolly|all>`), `skills/scrolly/scripts/produce.mjs` (`<config.json> <outDir>`).
- Cloud: `skills/dw-chart/src/produce.ts` `produceChart(spec, pngPath)` and `skills/map-dw/src/produce.ts` `produceMap(spec, pngPath)` — return `{ chartId, publicUrl, embed, pngPath }`. Read their exact return fields before writing the adapter.

- [ ] **Step 1: Write the failing test `tests/adapters.test.ts`** (unit-test the pure `formatFlag` mapping; the exec paths are covered by the Task 5 CLI smoke test)

```ts
import { describe, it, expect } from "bun:test";
import { formatFlag } from "../src/adapters";

describe("formatFlag — VisualFormat → producer flag", () => {
  it("maps chart-native video → all, static → static", () => {
    expect(formatFlag("chart-native", "video")).toBe("all");
    expect(formatFlag("chart-native", "static")).toBe("static");
  });
  it("maps map-native interactive → static (web build), video → all", () => {
    expect(formatFlag("map-native", "interactive")).toBe("static");
    expect(formatFlag("map-native", "video")).toBe("all");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/adapters.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/adapters.ts`.** Implement `formatFlag(producer, format)` (the VisualFormat→producer-flag table, per the producer CLIs read above) and `realDispatch`. For file-based producers: write `p.spec` to a temp config, `execFileSync("bun", [<produce script>, config, outDir, formatFlag(...)], { cwd: <skill dir> })`; on a non-zero exit whose stderr contains `FALLBACK_TO_DW`, return `{ status: "needs-fallback", reason: <stderr line> }`; on other non-zero, return `{ status: "failed", error }`; on success, collect the written file paths under `outDir` → `{ status: "produced", outputs }`. For cloud producers: `await produceChart/produceMap(p.spec, <outDir>/<id>.png)` → `{ status: "produced", outputs: [pngPath], publicUrl }`. No `any`; type `p.spec` through the producer's exported spec type where practical, else `Record<string, unknown>`.

- [ ] **Step 4: Run test + typecheck**

Run: `cd skills/splash && bun test tests/adapters.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc 0.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/adapters.ts skills/splash/tests/adapters.test.ts
git commit -m "feat(splash): per-producer dispatch adapters + format-flag mapping"
```

---

## Task 5: The produce-all CLI + end-to-end smoke

**Files:**
- Create: `skills/splash/scripts/produce-all.mjs`
- Test: `skills/splash/tests/produce-all-cli.test.ts`

**Interfaces:**
- Consumes: `produceAll` (Task 3), `realDispatch` (Task 4).

- [ ] **Step 1: Write `scripts/produce-all.mjs`**

```js
// CLI: bun scripts/produce-all.mjs <accepted.json> <outDir>
// Reads the accepted proposals, runs the in-code batch loop, prints the report as JSON.
import { readFileSync } from "node:fs";
import { produceAll } from "../src/produce-all.ts";
import { realDispatch } from "../src/adapters.ts";

const acceptedPath = process.argv[2];
const outDir = process.argv[3];
if (!acceptedPath || !outDir) {
  console.error("usage: produce-all.mjs <accepted.json> <outDir>");
  process.exit(1);
}
const accepted = JSON.parse(readFileSync(acceptedPath, "utf8"));
const report = await produceAll(accepted, outDir, realDispatch);
console.log(JSON.stringify(report, null, 2));
// Exit non-zero if anything failed, so a caller can detect trouble; needs-fallback and
// needs-confirmation are NOT failures (the agent acts on them), so they exit 0.
const failed = report.results.some((r) => r.status === "failed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Write the smoke test `tests/produce-all-cli.test.ts`** (drives the CLI with a fixture that needs no external API — a prose proposal that lands `needs-confirmation`, proving the wiring without a Datawrapper token or a heavy render)

```ts
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("produce-all CLI", () => {
  it("reports needs-confirmation for an unconfirmed prose proposal without touching a producer", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-cli-"));
    const accepted = join(dir, "accepted.json");
    writeFileSync(accepted, JSON.stringify([
      { id: "p1", producer: "chart-native", format: "static", spec: {}, provenance: "prose" },
    ]));
    const out = execFileSync("bun", ["scripts/produce-all.mjs", accepted, join(dir, "out")],
      { cwd: join(import.meta.dir, ".."), encoding: "utf8" });
    const report = JSON.parse(out);
    expect(report.results[0].status).toBe("needs-confirmation");
  });
});
```

- [ ] **Step 3: Run the smoke test + typecheck**

Run: `cd skills/splash && bun test tests/produce-all-cli.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc 0.

- [ ] **Step 4: Commit**

```bash
git add skills/splash/scripts/produce-all.mjs skills/splash/tests/produce-all-cli.test.ts
git commit -m "feat(splash): produce-all CLI + wiring smoke test"
```

---

## Task 6: The render gate (the only writer of renderApproved)

**Files:**
- Create: `skills/splash/src/gate.ts`
- Create: `skills/splash/scripts/gate-render.mjs`
- Test: `skills/splash/tests/gate.test.ts`

**Interfaces:**
- Consumes: `ProduceReport`, `ProposalResult` (Task 1).
- Produces: `applyRenderGate(report: ProduceReport, id: string, artifactBytes: Uint8Array): ProduceReport` (pure; returns a new report with that proposal's `renderApproved: true` + `approvedHash`).

- [ ] **Step 1: Write the failing test `tests/gate.test.ts`**

```ts
import { describe, it, expect } from "bun:test";
import { applyRenderGate } from "../src/gate";
import type { ProduceReport } from "../src/producer-spec";

const report = (): ProduceReport => ({ results: [
  { id: "p1", producer: "chart-native", format: "static", status: "produced", renderApproved: false },
] });

describe("applyRenderGate", () => {
  it("sets renderApproved + a content hash on the named produced proposal", () => {
    const out = applyRenderGate(report(), "p1", new TextEncoder().encode("PNGDATA"));
    expect(out.results[0].renderApproved).toBe(true);
    expect(out.results[0].approvedHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("refuses to approve a proposal that is not produced", () => {
    const r = report(); r.results[0].status = "failed";
    expect(() => applyRenderGate(r, "p1", new Uint8Array())).toThrow(/not produced/);
  });
  it("throws on an unknown id", () => {
    expect(() => applyRenderGate(report(), "nope", new Uint8Array())).toThrow(/unknown proposal/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/gate.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/gate.ts`**

```ts
import { createHash } from "node:crypto";
import type { ProduceReport } from "./producer-spec";

// The ONLY writer of renderApproved. Binds approval to the exact artifact bytes, so a
// later re-produce (which changes the bytes) leaves the old hash mismatched — an honest
// audit marker + accident-resistance, NOT enforcement against a deliberate skip.
export function applyRenderGate(
  report: ProduceReport,
  id: string,
  artifactBytes: Uint8Array,
): ProduceReport {
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    if (r.status !== "produced")
      throw new Error(`cannot approve proposal ${id}: not produced (status=${r.status})`);
    const approvedHash = createHash("sha256").update(artifactBytes).digest("hex");
    return { ...r, renderApproved: true, approvedHash };
  });
  if (!results.some((r) => r.id === id)) throw new Error(`unknown proposal ${id}`);
  return { results };
}
```

- [ ] **Step 4: Write `scripts/gate-render.mjs`**

```js
// CLI: bun scripts/gate-render.mjs <report.json> <proposalId> <artifactPath>
// Run AFTER the human sees the render and says "ship it". Writes renderApproved back.
import { readFileSync, writeFileSync } from "node:fs";
import { applyRenderGate } from "../src/gate.ts";

const [reportPath, id, artifactPath] = process.argv.slice(2);
if (!reportPath || !id || !artifactPath) {
  console.error("usage: gate-render.mjs <report.json> <proposalId> <artifactPath>");
  process.exit(1);
}
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const next = applyRenderGate(report, id, readFileSync(artifactPath));
writeFileSync(reportPath, JSON.stringify(next, null, 2));
console.log(`render approved: ${id}`);
```

- [ ] **Step 5: Run test + typecheck**

Run: `cd skills/splash && bun test tests/gate.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc 0.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/src/gate.ts skills/splash/scripts/gate-render.mjs skills/splash/tests/gate.test.ts
git commit -m "feat(splash): render gate (sole writer of renderApproved + content hash)"
```

---

## Task 7: Export-completeness gate in the irreversible scripts

**Files:**
- Create: `skills/splash/src/export-guard.ts`
- Modify: `skills/splash/scripts/export-code.mjs`, `skills/splash/scripts/deploy-embed.mjs`
- Test: `skills/splash/tests/export-guard.test.ts`

**Interfaces:**
- Consumes: `ProduceReport` (Task 1).
- Produces: `assertShippable(report: ProduceReport, id: string): void` — throws unless that proposal is `produced` AND `renderApproved`.

**Context:** read `skills/splash/scripts/export-code.mjs` and `deploy-embed.mjs` first for their current arg parsing. The guard must live INSIDE these scripts (the irreversible action) so a lower-level call cannot bypass it.

- [ ] **Step 1: Write the failing test `tests/export-guard.test.ts`**

```ts
import { describe, it, expect } from "bun:test";
import { assertShippable } from "../src/export-guard";
import type { ProduceReport } from "../src/producer-spec";

const rep = (over: Partial<ProduceReport["results"][0]>): ProduceReport => ({ results: [
  { id: "p1", producer: "chart-native", format: "static", status: "produced", renderApproved: true, ...over },
] });

describe("assertShippable", () => {
  it("passes a produced + render-approved proposal", () => {
    expect(() => assertShippable(rep({}), "p1")).not.toThrow();
  });
  it("refuses a produced-but-unapproved proposal", () => {
    expect(() => assertShippable(rep({ renderApproved: false }), "p1")).toThrow(/not render-approved/);
  });
  it("refuses an unproduced proposal", () => {
    expect(() => assertShippable(rep({ status: "failed", renderApproved: false }), "p1")).toThrow(/not produced/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/export-guard.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/export-guard.ts`**

```ts
import type { ProduceReport } from "./producer-spec";

// The one MECHANICAL gate: nothing ships unless it was actually produced AND the human
// approved the render. Lives in the irreversible-action scripts so a lower-level call
// cannot bypass it.
export function assertShippable(report: ProduceReport, id: string): void {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  if (r.status !== "produced")
    throw new Error(`refusing to export ${id}: not produced (status=${r.status})`);
  if (!r.renderApproved)
    throw new Error(`refusing to export ${id}: not render-approved (run gate-render first)`);
}
```

- [ ] **Step 4: Wire the guard into `export-code.mjs` and `deploy-embed.mjs`.** Add two required args `--results <report.json> --id <proposalId>`; near the top of each script (before any copy/upload), `import { assertShippable } from "../src/export-guard.ts"`, read+parse the report, and call `assertShippable(report, id)` — a thrown error must exit non-zero. Keep the rest of each script unchanged. Also convert the existing warn-only ephemeral-path check in `export-code.mjs` (the `isEp…`/scratchpad warning) to a hard non-zero exit.

- [ ] **Step 5: Update the existing script tests.** In `skills/splash/scripts/export-code.test.ts` and `deploy-embed.test.ts`, add a case: calling with a report whose proposal is not `produced`+`renderApproved` exits non-zero; the happy path passes a shippable report. Follow each test's existing invocation pattern.

- [ ] **Step 6: Run the splash suite + typecheck + root gate**

Run: `cd skills/splash && bun test && bunx tsc --noEmit` then `cd ../.. && bun run check`
Expected: all splash tests PASS, tsc 0, root gate green.

- [ ] **Step 7: Commit**

```bash
git add skills/splash/src/export-guard.ts skills/splash/scripts/export-code.mjs skills/splash/scripts/deploy-embed.mjs skills/splash/scripts/export-code.test.ts skills/splash/scripts/deploy-embed.test.ts skills/splash/tests/export-guard.test.ts
git commit -m "feat(splash): export-completeness gate in the irreversible ship scripts"
```

---

## Follow-on (out of this plan)

- Wire `produce-all` into `skills/splash/SKILL.md` as the PRODUCTION step (replace the per-producer prose commands with: emit `accepted.json`, run `produce-all`, act on the report; run `gate-render` after each "ship it"; export via the guarded scripts).
- The typed `producer`/`format` discriminant on every producer spec type (additive) — a separate small plan.
- The blocking-vs-advisory warning taxonomy across all validators + a standalone `validate` command.
- Conformance-at-produce (needs a shared color-resolver first); the 4→41 native dispatch table + completeness test.

## Self-Review

- **Spec coverage:** in-code batch loop (Task 3), per-producer adapters (Task 4), structured report (Task 1), export-completeness in the irreversible script (Task 7), needs-confirmation for prose (Task 3), render gate as sole writer + content-hash (Task 6), data-layer-only map derivation (Task 2), typed contract (Task 1). Deferred pieces are listed in the spec's "OUT" section and echoed in Follow-on. No gaps for the spine.
- **Placeholder scan:** none — Tasks 4/5/7 reference exact producer files to read but each new module ships full code; the two MODIFY tasks (4's exec paths, 7's script wiring) give exact instructions + the guard code.
- **Type consistency:** `AcceptedProposal`/`ProposalResult`/`ProduceReport` defined in Task 1 are used verbatim in Tasks 3–7; `Dispatch` defined in Task 3 is consumed in Tasks 4–5; `ProduceStatus` values (`produced|failed|needs-fallback|needs-confirmation`) are consistent across the loop, gate, and guard.

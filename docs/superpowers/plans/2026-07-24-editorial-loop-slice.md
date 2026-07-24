# Editorial Loop Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the thinnest state-driven editorial loop (`orient → propose → produce → revise`, data→chart) that proves the re-conceived shell's soul — an instrument you play, fully revisitable — over a file-state centre, calling chart-native intact through a subprocess seam.

**Architecture:** A new `lib/loop/` package. A `RunManifest` (plain TS) is the single source of truth; each step is a pure-ish `(manifest) → manifest'` operation. A `provenanceHash` over `{data, angle, chosenForm}` makes any upstream edit invalidate the produced artifact (`stalenessOf`), so the one back-edge (`revise`) routes back to `produce` by construction. The only engine call is a subprocess to `skills/chart-native/scripts/produce-from-spec.mjs` — never a `src/` import.

**Tech Stack:** Bun, TypeScript, `bun:test`. Hashing via `@noble/hashes/blake3.js` (already a repo dependency). No `zod` (not installed — plain TS types).

## Global Constraints

- Runtime **Bun** only — never `npm`/`node`. Tests use `bun:test` (`describe`/`it`/`expect`).
- **TDD**: a failing test before implementation, every task.
- Code, comments, identifiers, file names, commit messages, branch names: **English** (non-negotiable).
- **No Claude/Anthropic mention** in any committed artifact (commits, code, docs). No `Co-Authored-By`.
- **No new `any`.** **No import from another engine's `src/`** — the chart-native seam is a subprocess call to its CLI.
- Gate **`bun run check` green before every commit** (it typechecks + tests `lib`, which already covers `lib/loop`).
- Work happens on branch **`feat/editorial-loop-slice`** (worktree `/Users/rmdms/Sites/Professional/splash-loop`). All paths below are relative to that worktree root.
- Provenance hashing uses the repo's proven pattern: `Buffer.from(blake3(new TextEncoder().encode(material))).toString("hex")`.

---

## File Structure

All under `lib/loop/` (mirrors the `lib/core/` pattern: plain TS modules + co-located `.test.ts`). Covered by the existing `"lib"` entry in `scripts/check.mjs` TSC_DIRS/TEST_DIRS — **no gate edit needed**.

- `lib/loop/manifest.ts` — `RunManifest`/`FormOption`/`DataProfile` types, `provenanceHash`, `stalenessOf`, `readManifest`/`writeManifest`, `nextActions`. The centre.
- `lib/loop/profile.ts` — `profileCsv(dataCsv) → DataProfile`. Self-contained CSV profiler.
- `lib/loop/orient.ts` — `orient(dataCsv) → OrientResult`. Factual profile + honest supports-point verdict.
- `lib/loop/propose.ts` — `propose(manifest) → FormOption[]`. Thin data→chart options with a grounded WHY.
- `lib/loop/produce.ts` — `produce(manifest, outDir) → RunManifest`. The craft-verb seam to chart-native.
- `lib/loop/revise.ts` — `revise(manifest, change) → RunManifest`. The one back-edge.
- `lib/loop/driver.ts` — `advance(manifest, outDir) → RunManifest`. State-driven step runner.

---

### Task 1: Manifest core — types, provenance, staleness

**Files:**
- Create: `lib/loop/manifest.ts`
- Test: `lib/loop/manifest.test.ts`

**Interfaces:**
- Produces: `type RunManifest`, `type FormOption`, `type DataProfile`; `provenanceHash(m: RunManifest): string`; `stalenessOf(m: RunManifest): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/manifest.test.ts
import { test, expect } from "bun:test";
import { provenanceHash, stalenessOf, type RunManifest } from "./manifest";

const base: RunManifest = {
  runId: "r1", schemaVersion: 1,
  input: { dataCsv: "canton,2015,2024\nGenève,449,583", statedPoint: "premiums rose" },
  angle: { confirmedTakeaway: "Premiums rose", altInsight: "alt", unit: "CHF" },
  proposal: { options: [{ id: "slope", nativeType: "slope", why: "two points" }], chosenId: "slope" },
};

test("provenanceHash is stable for identical inputs", () => {
  expect(provenanceHash(base)).toBe(provenanceHash(structuredClone(base)));
});
test("provenanceHash changes when the angle changes", () => {
  const changed = structuredClone(base); changed.angle!.emphasis = "Genève";
  expect(provenanceHash(changed)).not.toBe(provenanceHash(base));
});
test("stalenessOf is false when artifact provenance matches current", () => {
  const m = structuredClone(base); m.artifact = { path: "/x.png", provenanceHash: provenanceHash(base) };
  expect(stalenessOf(m)).toBe(false);
});
test("stalenessOf flips true after the angle changes under a produced artifact", () => {
  const m = structuredClone(base); m.artifact = { path: "/x.png", provenanceHash: provenanceHash(base) };
  m.angle!.emphasis = "Genève";
  expect(stalenessOf(m)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/manifest.test.ts)`
Expected: FAIL — cannot resolve `./manifest`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/manifest.ts
import { blake3 } from "@noble/hashes/blake3.js";

export type FormOption = { id: string; nativeType: string; why: string };
export type DataProfile = { columns: string[]; numericColumns: string[]; rowCount: number };

export type RunManifest = {
  runId: string;
  schemaVersion: 1;
  input: { dataCsv: string; statedPoint: string };
  orient?: { profile: DataProfile; supportsPoint: boolean; note?: string };
  angle?: { confirmedTakeaway: string; emphasis?: string; altInsight: string; unit: string };
  proposal?: { options: FormOption[]; chosenId?: string };
  artifact?: { path: string; provenanceHash: string };
};

// The artifact depends on exactly these. Any change ⇒ the produced artifact is stale.
export function provenanceHash(m: RunManifest): string {
  const material = JSON.stringify({
    dataCsv: m.input.dataCsv,
    angle: m.angle ?? null,
    chosenId: m.proposal?.chosenId ?? null,
  });
  return Buffer.from(blake3(new TextEncoder().encode(material))).toString("hex").slice(0, 32);
}

export function stalenessOf(m: RunManifest): boolean {
  return m.artifact != null && m.artifact.provenanceHash !== provenanceHash(m);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/manifest.test.ts)`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/manifest.test.ts
git commit -m "feat(loop): manifest core — provenance hash + staleness"
```

---

### Task 2: Manifest IO + state-driven next actions

**Files:**
- Modify: `lib/loop/manifest.ts`
- Test: `lib/loop/manifest-io.test.ts`

**Interfaces:**
- Consumes: `RunManifest`, `stalenessOf` (Task 1).
- Produces: `writeManifest(path, m)`, `readManifest(path): RunManifest`; `type NextAction`, `nextActions(m): NextAction[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/manifest-io.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest, writeManifest, nextActions, provenanceHash, type RunManifest } from "./manifest";

const m: RunManifest = {
  runId: "r1", schemaVersion: 1,
  input: { dataCsv: "canton,2015,2024\nGenève,449,583", statedPoint: "p" },
};

test("writeManifest then readManifest round-trips", () => {
  const p = join(mkdtempSync(join(tmpdir(), "loop-io-")), "run.json");
  writeManifest(p, m);
  expect(readManifest(p)).toEqual(m);
});
test("nextActions asks to orient first", () => {
  expect(nextActions(m)).toEqual(["orient"]);
});
test("nextActions returns [] (off-ramp) when the data supports no visual", () => {
  const off = { ...m, orient: { profile: { columns: ["x"], numericColumns: [], rowCount: 0 }, supportsPoint: false } };
  expect(nextActions(off)).toEqual([]);
});
test("nextActions routes to produce when the artifact is stale", () => {
  const full: RunManifest = {
    ...m,
    orient: { profile: { columns: ["c","2015","2024"], numericColumns: ["2015","2024"], rowCount: 1 }, supportsPoint: true },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" },
    artifact: { path: "/x.png", provenanceHash: "stale" },
  };
  expect(nextActions(full)).toEqual(["produce"]);
});
test("nextActions is show when a fresh artifact exists", () => {
  const full: RunManifest = {
    ...m,
    orient: { profile: { columns: ["c","2015","2024"], numericColumns: ["2015","2024"], rowCount: 1 }, supportsPoint: true },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" },
  };
  const fresh = { ...full, artifact: { path: "/x.png", provenanceHash: provenanceHash(full) } };
  expect(nextActions(fresh)).toEqual(["show"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/manifest-io.test.ts)`
Expected: FAIL — `writeManifest`/`nextActions` not exported.

- [ ] **Step 3: Write minimal implementation** (append to `lib/loop/manifest.ts`)

```ts
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function writeManifest(path: string, m: RunManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, path); // atomic replace
}

export function readManifest(path: string): RunManifest {
  return JSON.parse(readFileSync(path, "utf8")) as RunManifest;
}

export type NextAction = "orient" | "confirm-angle" | "propose" | "choose-form" | "produce" | "show";

export function nextActions(m: RunManifest): NextAction[] {
  if (!m.orient) return ["orient"];
  if (!m.orient.supportsPoint) return []; // honest off-ramp: nothing to visualise
  if (!m.angle) return ["confirm-angle"];
  if (!m.proposal) return ["propose"];
  if (!m.proposal.chosenId) return ["choose-form"];
  if (!m.artifact || stalenessOf(m)) return ["produce"];
  return ["show"];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/manifest-io.test.ts)`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/manifest-io.test.ts
git commit -m "feat(loop): manifest IO (atomic) + state-driven nextActions"
```

---

### Task 3: CSV profiler

**Files:**
- Create: `lib/loop/profile.ts`
- Test: `lib/loop/profile.test.ts`

**Interfaces:**
- Consumes: `DataProfile` (Task 1).
- Produces: `profileCsv(dataCsv: string): DataProfile`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/profile.test.ts
import { test, expect } from "bun:test";
import { profileCsv } from "./profile";

test("profileCsv finds numeric columns and row count", () => {
  const p = profileCsv("canton,2015,2024\nGenève,449,583\nVaud,412,531");
  expect(p.columns).toEqual(["canton", "2015", "2024"]);
  expect(p.numericColumns).toEqual(["2015", "2024"]);
  expect(p.rowCount).toBe(2);
});
test("profileCsv treats a column with any non-number as non-numeric", () => {
  const p = profileCsv("name,note\nA,ok\nB,12");
  expect(p.numericColumns).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/profile.test.ts)`
Expected: FAIL — cannot resolve `./profile`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/profile.ts
import type { DataProfile } from "./manifest";

// Minimal profiler for the slice: simple comma split (no RFC4180 quoting — deferred).
// A column is numeric only when every row cell parses as a finite number.
export function profileCsv(dataCsv: string): DataProfile {
  const lines = dataCsv.trim().split(/\r?\n/);
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines.slice(1).filter((l) => l.trim() !== "").map((l) => l.split(",").map((c) => c.trim()));
  const numericColumns = columns.filter(
    (_, i) => rows.length > 0 && rows.every((r) => r[i] !== "" && r[i] !== undefined && !Number.isNaN(Number(r[i]))),
  );
  return { columns, numericColumns, rowCount: rows.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/profile.test.ts)`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/profile.ts lib/loop/profile.test.ts
git commit -m "feat(loop): minimal CSV profiler"
```

---

### Task 4: Orient — factual profile + honest verdict

**Files:**
- Create: `lib/loop/orient.ts`
- Test: `lib/loop/orient.test.ts`

**Interfaces:**
- Consumes: `profileCsv` (Task 3), `DataProfile` (Task 1).
- Produces: `type OrientResult`, `orient(dataCsv: string): OrientResult`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/orient.test.ts
import { test, expect } from "bun:test";
import { orient } from "./orient";

test("orient supports the point when the data has numeric columns and rows", () => {
  const r = orient("canton,2015,2024\nGenève,449,583");
  expect(r.supportsPoint).toBe(true);
  expect(r.profile.numericColumns).toEqual(["2015", "2024"]);
});
test("orient refuses honestly when there is no numeric data (no fabrication)", () => {
  const r = orient("name,quote\nA,hello\nB,world");
  expect(r.supportsPoint).toBe(false);
  expect(r.note).toContain("figures");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/orient.test.ts)`
Expected: FAIL — cannot resolve `./orient`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/orient.ts
import { profileCsv } from "./profile";
import type { DataProfile } from "./manifest";

export type OrientResult = { profile: DataProfile; supportsPoint: boolean; note?: string };

// The desk describes what the brought data factually contains and says, honestly,
// whether there is anything to chart. It never invents data and never proposes a
// story — the journalist owns the angle. (Deeper honesty checks — per-capita,
// denominator, time window — are the proposal-cerveau sub-project.)
export function orient(dataCsv: string): OrientResult {
  const profile = profileCsv(dataCsv);
  if (profile.rowCount === 0) {
    return { profile, supportsPoint: false, note: "The data has a header but no rows." };
  }
  if (profile.numericColumns.length === 0) {
    return { profile, supportsPoint: false, note: "No numeric columns in what you brought — there is nothing to chart for this point. Bring the figures." };
  }
  return { profile, supportsPoint: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/orient.test.ts)`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/orient.ts lib/loop/orient.test.ts
git commit -m "feat(loop): orient — factual profile + honest supports-point verdict"
```

---

### Task 5: Propose — data→chart options with a WHY

**Files:**
- Create: `lib/loop/propose.ts`
- Test: `lib/loop/propose.test.ts`

**Interfaces:**
- Consumes: `RunManifest`, `FormOption` (Task 1).
- Produces: `propose(m: RunManifest): FormOption[]`.

Note: `nativeType` values below are real chart-native types (verified in `skills/chart-native/src/spec-to-config.ts`): `slope`, `dumbbell`, `line`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/propose.test.ts
import { test, expect } from "bun:test";
import { propose } from "./propose";
import type { RunManifest } from "./manifest";

function withNumeric(numericColumns: string[]): RunManifest {
  return {
    runId: "r", schemaVersion: 1,
    input: { dataCsv: "x", statedPoint: "p" },
    orient: { profile: { columns: ["label", ...numericColumns], numericColumns, rowCount: 3 }, supportsPoint: true },
  };
}

test("propose offers slope + dumbbell for two time points, each with a why", () => {
  const opts = propose(withNumeric(["2015", "2024"]));
  expect(opts.map((o) => o.id)).toEqual(["slope", "dumbbell"]);
  expect(opts[0].why.length).toBeGreaterThan(20);
});
test("propose offers a line for three or more points", () => {
  const opts = propose(withNumeric(["2010", "2015", "2020"]));
  expect(opts.map((o) => o.nativeType)).toEqual(["line"]);
});
test("propose returns nothing before orient has run", () => {
  expect(propose({ runId: "r", schemaVersion: 1, input: { dataCsv: "x", statedPoint: "p" } })).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/propose.test.ts)`
Expected: FAIL — cannot resolve `./propose`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/propose.ts
import type { RunManifest, FormOption } from "./manifest";

// Thin proposal for the data→chart branch: legal chart-native forms, each with a
// grounded WHY the journalist can judge. It OFFERS — it never chooses (P1: instrument).
// The full typology + FT/perception grounding is the proposal-cerveau sub-project.
export function propose(m: RunManifest): FormOption[] {
  const profile = m.orient?.profile;
  if (!profile) return [];
  const cols = profile.numericColumns;
  if (cols.length === 2) {
    return [
      { id: "slope", nativeType: "slope", why: `Two points in time (${cols[0]} → ${cols[1]}) — a slope shows each row's change and whether the gap widens or narrows.` },
      { id: "dumbbell", nativeType: "dumbbell", why: "A dumbbell marks the two endpoints per row — better when the size of each gap matters more than the trajectory." },
    ];
  }
  if (cols.length >= 3) {
    return [{ id: "line", nativeType: "line", why: `${cols.length} points over time — a line traces each series' trajectory.` }];
  }
  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/propose.test.ts)`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/propose.ts lib/loop/propose.test.ts
git commit -m "feat(loop): propose — data→chart options with grounded why"
```

---

### Task 6: Produce — the chart-native seam

**Files:**
- Create: `lib/loop/produce.ts`
- Test: `lib/loop/produce.test.ts`

**Interfaces:**
- Consumes: `RunManifest`, `provenanceHash` (Task 1).
- Produces: `produce(m: RunManifest, outDir: string): RunManifest`.

This is an **integration task**: the test runs chart-native's real CLI (network-free, ~seconds), exactly like the manual walkthrough. It proves the seam is a clean subprocess call.

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/produce.test.ts
import { test, expect } from "bun:test";
import { existsSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produce } from "./produce";
import { provenanceHash, type RunManifest } from "./manifest";

test("produce renders a real static PNG through the chart-native seam", () => {
  const m: RunManifest = {
    runId: "t", schemaVersion: 1,
    input: { dataCsv: "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352", statedPoint: "premiums rose" },
    orient: { profile: { columns: ["canton", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 3 }, supportsPoint: true },
    angle: { confirmedTakeaway: "Health premiums rose in every canton shown", altInsight: "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.", unit: "Monthly adult premium (CHF)", emphasis: "Genève" },
    proposal: { options: [{ id: "slope", nativeType: "slope", why: "two points in time" }], chosenId: "slope" },
  };
  const outDir = mkdtempSync(join(tmpdir(), "loop-produce-"));
  const after = produce(m, outDir);
  expect(existsSync(after.artifact!.path)).toBe(true);
  expect(statSync(after.artifact!.path).size).toBeGreaterThan(5000);
  expect(after.artifact!.provenanceHash).toBe(provenanceHash(m));
}, 60000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/produce.test.ts)`
Expected: FAIL — cannot resolve `./produce`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/produce.ts
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provenanceHash, type RunManifest } from "./manifest";

// From lib/loop → repo root → the chart-native CLI. import.meta.dir === lib/loop.
const CHART_NATIVE_PRODUCE = join(
  import.meta.dir, "..", "..", "skills", "chart-native", "scripts", "produce-from-spec.mjs",
);

// The ONE craft verb of the slice. Assembles a NativeSpec from the manifest and
// renders it via chart-native's real CLI (subprocess — never a src/ import), then
// records the artifact + its provenance so stalenessOf() can track it.
export function produce(m: RunManifest, outDir: string): RunManifest {
  if (!m.angle || !m.proposal?.chosenId) throw new Error("produce: need an angle and a chosen form");
  const chosen = m.proposal.options.find((o) => o.id === m.proposal!.chosenId);
  if (!chosen) throw new Error(`produce: no option with id ${m.proposal.chosenId}`);

  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: m.angle.confirmedTakeaway,
    altInsight: m.angle.altInsight,
    unit: m.angle.unit,
    source: { name: "Provided by the newsroom" },
    ...(m.angle.emphasis ? { highlight: m.angle.emphasis } : {}),
    format: "static",
    data: m.input.dataCsv,
  };

  const specPath = join(mkdtempSync(join(tmpdir(), "loop-spec-")), "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], { stdio: "pipe" });

  return { ...m, artifact: { path: join(outDir, "static.png"), provenanceHash: provenanceHash(m) } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/produce.test.ts)`
Expected: PASS (1 test, a few seconds). If it fails with a conformance error, read the error — it means a required NativeSpec field is missing; the walkthrough proved `slope` + these fields render.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/produce.ts lib/loop/produce.test.ts
git commit -m "feat(loop): produce — chart-native subprocess seam"
```

---

### Task 7: Revise — the back-edge

**Files:**
- Create: `lib/loop/revise.ts`
- Test: `lib/loop/revise.test.ts`

**Interfaces:**
- Consumes: `RunManifest`, `stalenessOf`, `nextActions` (Tasks 1–2).
- Produces: `type ReviseChange`, `revise(m: RunManifest, change: ReviseChange): RunManifest`.

- [ ] **Step 1: Write the failing test** — this is the key back-edge test.

```ts
// lib/loop/revise.test.ts
import { test, expect } from "bun:test";
import { revise } from "./revise";
import { stalenessOf, nextActions, provenanceHash, type RunManifest } from "./manifest";

function produced(): RunManifest {
  const m: RunManifest = {
    runId: "r", schemaVersion: 1,
    input: { dataCsv: "c,2015,2024\nA,1,2", statedPoint: "p" },
    orient: { profile: { columns: ["c", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 1 }, supportsPoint: true },
    angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
    proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" },
  };
  return { ...m, artifact: { path: "/x.png", provenanceHash: provenanceHash(m) } };
}

test("revising the emphasis marks the artifact stale and routes back to produce", () => {
  const before = produced();
  expect(stalenessOf(before)).toBe(false);
  const after = revise(before, { kind: "emphasis", emphasis: "A" });
  expect(after.angle!.emphasis).toBe("A");
  expect(stalenessOf(after)).toBe(true);
  expect(nextActions(after)).toEqual(["produce"]);
});
test("revise throws before an angle exists", () => {
  const m: RunManifest = { runId: "r", schemaVersion: 1, input: { dataCsv: "x", statedPoint: "p" } };
  expect(() => revise(m, { kind: "emphasis", emphasis: "A" })).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/revise.test.ts)`
Expected: FAIL — cannot resolve `./revise`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/revise.ts
import type { RunManifest } from "./manifest";

export type ReviseChange =
  | { kind: "emphasis"; emphasis: string }
  | { kind: "takeaway"; confirmedTakeaway: string; altInsight: string };

// A back-edge: the journalist changes the angle after seeing the visual. We update
// the angle; the artifact's provenance no longer matches, so stalenessOf() flips true
// and nextActions() routes back to produce. Staleness is derived — we do NOT delete
// the old artifact here.
export function revise(m: RunManifest, change: ReviseChange): RunManifest {
  if (!m.angle) throw new Error("revise: nothing to revise before an angle exists");
  const angle =
    change.kind === "emphasis"
      ? { ...m.angle, emphasis: change.emphasis }
      : { ...m.angle, confirmedTakeaway: change.confirmedTakeaway, altInsight: change.altInsight };
  return { ...m, angle };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/revise.test.ts)`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/revise.ts lib/loop/revise.test.ts
git commit -m "feat(loop): revise — the one back-edge (invalidates via provenance)"
```

---

### Task 8: Driver + end-to-end loop

**Files:**
- Create: `lib/loop/driver.ts`
- Test: `lib/loop/driver.test.ts`

**Interfaces:**
- Consumes: `nextActions` (Task 2), `orient` (Task 4), `propose` (Task 5), `produce` (Task 6), `revise` (Task 7).
- Produces: `advance(m: RunManifest, outDir: string): RunManifest`.

- [ ] **Step 1: Write the failing test** — the full instrument-revisitable loop.

```ts
// lib/loop/driver.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance } from "./driver";
import { revise } from "./revise";
import { nextActions, stalenessOf, type RunManifest } from "./manifest";

test("full loop: orient → (human) → propose → (human) → produce → revise → produce, state always coherent", () => {
  const outDir = mkdtempSync(join(tmpdir(), "loop-e2e-"));
  let m: RunManifest = {
    runId: "e2e", schemaVersion: 1,
    input: { dataCsv: "canton,2015,2024\nGenève,449,583\nVaud,412,531", statedPoint: "premiums rose" },
  };

  m = advance(m, outDir); // orient
  expect(m.orient!.supportsPoint).toBe(true);
  expect(nextActions(m)).toEqual(["confirm-angle"]);

  // human turn: author the angle
  m = { ...m, angle: { confirmedTakeaway: "Premiums rose in both cantons", altInsight: "Both cantons' adult premium rose from 2015 to 2024.", unit: "CHF" } };
  expect(nextActions(m)).toEqual(["propose"]);

  m = advance(m, outDir); // propose
  expect(m.proposal!.options.length).toBeGreaterThan(0);
  expect(nextActions(m)).toEqual(["choose-form"]);

  // human turn: choose a form
  m = { ...m, proposal: { ...m.proposal!, chosenId: "slope" } };
  expect(nextActions(m)).toEqual(["produce"]);

  m = advance(m, outDir); // produce
  expect(stalenessOf(m)).toBe(false);
  expect(nextActions(m)).toEqual(["show"]);

  // back-edge: seeing the visual, the journalist changes the emphasis
  m = revise(m, { kind: "emphasis", emphasis: "Genève" });
  expect(stalenessOf(m)).toBe(true);           // never shown as current while stale
  expect(nextActions(m)).toEqual(["produce"]);

  m = advance(m, outDir); // re-produce
  expect(stalenessOf(m)).toBe(false);
  expect(nextActions(m)).toEqual(["show"]);
}, 90000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `(cd lib && bun test loop/driver.test.ts)`
Expected: FAIL — cannot resolve `./driver`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/loop/driver.ts
import { nextActions, type RunManifest } from "./manifest";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";

// State-driven: never a hard-coded forward chain. Read the manifest, ask nextActions()
// what is valid, run the matching deterministic step. Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances — the instrument is
// played, not delegated.
export function advance(m: RunManifest, outDir: string): RunManifest {
  const [next] = nextActions(m);
  switch (next) {
    case "orient":
      return { ...m, orient: orient(m.input.dataCsv) };
    case "propose":
      return { ...m, proposal: { options: propose(m) } };
    case "produce":
      return produce(m, outDir);
    default:
      return m; // confirm-angle / choose-form / show / [] are human turns
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `(cd lib && bun test loop/driver.test.ts)`
Expected: PASS (1 test, a few seconds — it produces twice).

- [ ] **Step 5: Run the full gate**

Run: `bun run check`
Expected: green (typecheck + all `lib` tests, including `lib/loop`).

- [ ] **Step 6: Commit**

```bash
git add lib/loop/driver.ts lib/loop/driver.test.ts
git commit -m "feat(loop): driver — state-driven advance + end-to-end revisitable loop"
```

---

## Self-Review

**Spec coverage (§5):**
- 5.3 units: `manifest` (T1–2), `profile` (T3), `orient` (T4), `propose` (T5), `produce` seam (T6), `revise` (T7), `driver` (T8). ✓ All present.
- 5.4 contract `RunManifest` + `provenanceHash`/`stalenessOf`: T1. ✓
- 5.5 flow (orient→confirm→propose→choose→produce→show→revise→produce): T8 end-to-end. ✓
- 5.6 off-ramps: `nextActions` returns `[]` when unsupported (T2); `orient` refuses without numeric data (T4); stale never `show` (T2/T7/T8). ✓ (chart-native's own conformance gates fire inside `produce` — proven at the walkthrough.)
- 5.7 tests: provenance golden (T1), staleness (T1), the back-edge key test (T7), the seam integration (T6), end-to-end (T8). ✓
- 5.8 success criteria: T8 exercises offer→choose→see→change-emphasis→updated, state coherent, no stale shown as current. ✓
- 5.9 de-risk: T1+T7+T8 exercise bounded-revisitable + provenance invalidation; T6 exercises the seam cleanliness. ✓

**Placeholder scan:** No TBD/TODO; every code and test step is complete. ✓

**Type consistency:** `RunManifest`/`FormOption`/`DataProfile` defined in T1 and used verbatim in T2–T8; `NextAction` in T2 used in T8; `OrientResult` in T4; `ReviseChange` in T7. `provenanceHash`/`stalenessOf`/`nextActions` signatures stable across tasks. ✓

**Deferred (each has a home in the spec §4 ledger), do NOT add here:** setup/preflight, the text-fork/whole-article branch, deliver/embed, the full proposal-cerveau typology, delegated agents, RFC4180-quoted CSV, richer honesty checks.

**Finding to watch (the slice's purpose):** if T6 shows the chart-native call dragging engine internals, or T7/T8 show the provenance-invalidation getting awkward, that is a real signal that reshapes the shell design (spec §3) — report it, don't paper over it.

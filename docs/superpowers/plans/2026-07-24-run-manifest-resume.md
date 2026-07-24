# Run Manifest + Resume (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow `lib/loop/`'s minimal RunManifest into a durable v2 orchestration ledger with per-element gate state, frozen secret-free inputs, provenance-based invalidation, bounded failure events, schema migration, and a read-only `resume` command.

**Architecture:** The manifest stays the state-center of the editorial loop. v2 wraps the tranche's single element into an `elements[]` container, freezes inputs into the run directory (manifest holds path+hash only), derives gate state as a pure function of present fields plus explicit verdict markers, and adds a read-only `resume` that validates hashes and prints journalist status + exact next actions without ever mutating. Engines stay behind the existing chart-native subprocess seam.

**Tech Stack:** Bun · TypeScript · `bun:test` · `zod` (schema validation, added in Task 1) · `@noble/hashes` blake3 (already a dep).

## Global Constraints

- Runtime **Bun**; tests `bun:test` (`test`/`describe`/`expect`); **TDD** — failing test before implementation, every task.
- Code, comments, identifiers, filenames, commits, branches: **English**.
- **No vendor mention** (Claude/Anthropic) in any committed artifact. No `Co-Authored-By`.
- **No new `any`**; no cross-engine `src/` import — the `produce` seam stays a subprocess to `skills/chart-native/scripts/produce-from-spec.mjs`.
- Gate `bun run check` green before every commit (it typechecks `lib` and runs `bun test` in `lib`).
- Branch `feat/run-manifest-resume` off `feat/editorial-loop-slice` (worktree `splash-manifest`). Already created.
- Pin new dependency versions exactly (project convention: e.g. `@noble/hashes` is `2.2.0`, no caret).
- Manifest is a **committable, shareable ledger**: never store input content, tokens, or secrets — only paths + hashes.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `lib/loop/canonical-hash.ts` | Stable-key-order serialization + blake3 hash | Create |
| `lib/loop/freeze.ts` | `freezeInput` — copy a brought file into the run dir, return `{path, sha256}` | Create |
| `lib/loop/manifest.ts` | v2 zod schema + types + `provenanceHash`/`stalenessOf`/`gateStateOf`/`nextActions`/`assertInvariants`/`appendEvent` + atomic read/write | Rewrite |
| `lib/loop/migrate.ts` | Pure v1→v2 migration | Create |
| `lib/loop/resume.ts` | `resumeReport(run)` pure core + read-only CLI | Create |
| `lib/loop/produce.ts` | Read frozen input, record artifact `sha256`+`producedAt`, robust exit, temp cleanup, `existsSync`, failure event | Modify |
| `lib/loop/orient.ts` / `propose.ts` / `revise.ts` / `driver.ts` | Operate on `elements[]` (length 1 live) + run-level input | Modify |
| existing `*.test.ts` in `lib/loop/` | Migrated to v2 shape | Modify |

**v2 shapes (locked — referenced by every task):**

```ts
type RunManifest = {
  runId: string;
  schemaVersion: 2;
  input: {
    data?: { path: string; sha256: string };     // path relative to the run dir
    article?: { path: string; sha256: string };
  };
  cadrage?: { answers: Record<string, string> };
  orient?: { profile: DataProfile; supportsPoint: boolean; note?: string };
  elements: RunElement[];
  events: RunEvent[];
};
type RunElement = {
  id: string;
  angle?: { confirmedTakeaway: string; emphasis?: string; altInsight: string; unit: string };
  proposal?: { options: FormOption[]; chosenId?: string };
  artifact?: { path: string; sha256: string; provenanceHash: string; producedAt: string };
  review?: { findings: unknown[]; reviewedProvenanceHash: string };
  delivery?: { requested: string[]; delivered: { path: string; sha256: string }[] };
  blocked?: { reason: string; at: string };
  dropped?: { reason: string; at: string };
  approved?: { signoffPath: string; approvedProvenanceHash: string };
};
type RunEvent = { at: string; kind: "failure" | "transition"; elementId?: string; action: string; message: string };
type FormOption = { id: string; nativeType: string; why: string };
type DataProfile = { columns: string[]; numericColumns: string[]; rowCount: number };
type GateState =
  | "empty" | "oriented" | "angled" | "proposed" | "chosen"
  | "produced" | "stale" | "reviewed" | "approved" | "delivered"
  | "blocked" | "dropped";
type NextAction =
  | "orient" | "confirm-angle" | "propose" | "choose-form" | "produce" | "show";
```

**Refinements from the spec, locked here:** `orient` keeps `supportsPoint`/`note` (the tranche's data-level honest off-ramp — the spec §3 abbreviated `orient` to `{profile}`; the off-ramp behavior is preserved). The v1 `input.statedPoint` field is **dropped** — it drove nothing mechanical (`orient()` never reads it); editorial intent lives in `angle`/`cadrage`.

---

### Task 1: Canonical hash + zod dependency

**Files:**
- Modify: `package.json` (add `zod`)
- Create: `lib/loop/canonical-hash.ts`
- Test: `lib/loop/canonical-hash.test.ts`

**Interfaces:**
- Produces: `canonicalStringify(value: unknown): string`, `canonicalHash(value: unknown): string` (32-hex blake3).

- [ ] **Step 1: Add zod**

Run: `bun add zod`
Then pin the resolved version exactly in `package.json` (remove any `^`), matching the `@noble/hashes` convention.
Expected: `zod` appears under `dependencies` with an exact version.

- [ ] **Step 2: Write the failing test**

Create `lib/loop/canonical-hash.test.ts`:

```ts
import { test, expect } from "bun:test";
import { canonicalStringify, canonicalHash } from "./canonical-hash";

test("canonicalStringify is insensitive to key order", () => {
  const a = { b: 1, a: 2, nested: { y: 1, x: 2 } };
  const b = { a: 2, b: 1, nested: { x: 2, y: 1 } };
  expect(canonicalStringify(a)).toBe(canonicalStringify(b));
});

test("canonicalStringify preserves array order", () => {
  expect(canonicalStringify([3, 1, 2])).not.toBe(canonicalStringify([1, 2, 3]));
});

test("canonicalHash is a 32-char hex string", () => {
  expect(canonicalHash({ a: 1 })).toMatch(/^[0-9a-f]{32}$/);
});

test("canonicalHash equals for key-permuted equivalents", () => {
  expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test lib/loop/canonical-hash.test.ts`
Expected: FAIL — cannot resolve `./canonical-hash`.

- [ ] **Step 4: Write minimal implementation**

Create `lib/loop/canonical-hash.ts`:

```ts
import { blake3 } from "@noble/hashes/blake3.js";

// Deterministic serialization: object keys sorted recursively, arrays left in order.
// Two structurally-equal values with permuted keys serialize identically.
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function canonicalHash(value: unknown): string {
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  return Buffer.from(blake3(bytes)).toString("hex").slice(0, 32);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test lib/loop/canonical-hash.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock lib/loop/canonical-hash.ts lib/loop/canonical-hash.test.ts
git commit -m "feat(loop): canonical key-order-stable hash + zod dependency"
```

---

### Task 2: Freeze inputs into the run directory

**Files:**
- Create: `lib/loop/freeze.ts`
- Test: `lib/loop/freeze.test.ts`

**Interfaces:**
- Produces: `freezeInput(runDir: string, srcPath: string, kind: "data" | "article"): { path: string; sha256: string }` — copies `srcPath` into `<runDir>/input/`, returns the **run-dir-relative** path + content sha256. Idempotent by content.

- [ ] **Step 1: Write the failing test**

Create `lib/loop/freeze.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";

function runDir(): string {
  return mkdtempSync(join(tmpdir(), "loop-freeze-"));
}

test("freezeInput copies the file under <runDir>/input and returns a relative path", () => {
  const dir = runDir();
  const src = join(dir, "external.csv");
  writeFileSync(src, "a,b\n1,2");
  const ref = freezeInput(dir, src, "data");
  expect(ref.path.startsWith("input/")).toBe(true);
  expect(existsSync(join(dir, ref.path))).toBe(true);
  expect(readFileSync(join(dir, ref.path), "utf8")).toBe("a,b\n1,2");
});

test("freezeInput returns a 64-char sha256 of the content", () => {
  const dir = runDir();
  const src = join(dir, "e.csv");
  writeFileSync(src, "a,b\n1,2");
  expect(freezeInput(dir, src, "data").sha256).toMatch(/^[0-9a-f]{64}$/);
});

test("freezeInput is idempotent by content (same bytes → same frozen path)", () => {
  const dir = runDir();
  const src = join(dir, "e.csv");
  writeFileSync(src, "a,b\n1,2");
  const first = freezeInput(dir, src, "data");
  const second = freezeInput(dir, src, "data");
  expect(second.path).toBe(first.path);
  expect(second.sha256).toBe(first.sha256);
});

test("freezeInput throws when the source file is missing", () => {
  const dir = runDir();
  expect(() => freezeInput(dir, join(dir, "nope.csv"), "data")).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/freeze.test.ts`
Expected: FAIL — cannot resolve `./freeze`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/loop/freeze.ts`:

```ts
import { sha256 } from "@noble/hashes/sha2.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Copy a brought input into the run directory so the run is self-contained and the
// manifest can reference it by path+hash only — never by content, never a secret.
// The frozen filename is content-addressed so re-freezing identical bytes is a no-op.
export function freezeInput(
  runDir: string,
  srcPath: string,
  kind: "data" | "article",
): { path: string; sha256: string } {
  if (!existsSync(srcPath)) throw new Error(`freezeInput: source not found: ${srcPath}`);
  const bytes = readFileSync(srcPath);
  const hash = Buffer.from(sha256(bytes)).toString("hex");
  const ext = kind === "data" ? "csv" : "txt";
  const rel = join("input", `${kind}-${hash.slice(0, 16)}.${ext}`);
  const dest = join(runDir, rel);
  mkdirSync(join(runDir, "input"), { recursive: true });
  if (!existsSync(dest)) writeFileSync(dest, bytes);
  return { path: rel, sha256: hash };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/freeze.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loop/freeze.ts lib/loop/freeze.test.ts
git commit -m "feat(loop): freeze brought inputs into the run dir (path+hash, no content)"
```

---

### Task 3: v2 manifest schema + behavior-preserving consumer cutover

This is the breaking schema pivot. It changes `RunManifest` to v2 and updates every consumer + existing test in one atomically-green task. **Behavior is preserved** — new capabilities (gate state, events, migration, resume) come in later tasks.

**Files:**
- Rewrite: `lib/loop/manifest.ts`
- Modify: `lib/loop/orient.ts`, `lib/loop/propose.ts`, `lib/loop/revise.ts`, `lib/loop/produce.ts`, `lib/loop/driver.ts`
- Modify (migrate to v2): `lib/loop/manifest.test.ts`, `lib/loop/manifest-io.test.ts`, `lib/loop/orient.test.ts`, `lib/loop/propose.test.ts`, `lib/loop/revise.test.ts`, `lib/loop/produce.test.ts`, `lib/loop/driver.test.ts`

**Interfaces:**
- Produces:
  - zod-derived types `RunManifest`, `RunElement`, `RunEvent`, `FormOption`, `DataProfile` (v2 shapes above).
  - `parseManifest(raw: unknown): RunManifest` — zod parse, throws on invalid shape.
  - `provenanceHash(run: RunManifest, el: RunElement): string` — canonical hash of `{inputData, inputArticle, cadrage, angle, chosenId}`.
  - `stalenessOf(run: RunManifest, el: RunElement): boolean`.
  - `writeManifest(path: string, m: RunManifest): void` — unique-tmp + atomic rename.
  - `readManifest(path: string): RunManifest` — read + `parseManifest` (no migration yet — Task 6 adds it).
  - `nextActions(run: RunManifest): NextAction[]` — run-level gates then element[0] routing (tranche behavior).
- Consumes: `canonicalHash` (Task 1).

- [ ] **Step 1: Rewrite the manifest test to v2 (failing)**

Replace `lib/loop/manifest.test.ts` with v2-shaped expectations:

```ts
import { test, expect } from "bun:test";
import {
  provenanceHash,
  stalenessOf,
  nextActions,
  parseManifest,
  type RunManifest,
} from "./manifest";

function base(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 2,
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["c", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 1 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "t", emphasis: "e", altInsight: "a", unit: "u" },
        proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" },
      },
    ],
    events: [],
  };
}

test("provenanceHash is stable and 32-hex", () => {
  const m = base();
  expect(provenanceHash(m, m.elements[0])).toMatch(/^[0-9a-f]{32}$/);
});

test("provenanceHash changes when the angle changes", () => {
  const m = base();
  const h1 = provenanceHash(m, m.elements[0]);
  const el2 = { ...m.elements[0], angle: { ...m.elements[0].angle!, emphasis: "other" } };
  expect(provenanceHash(m, el2)).not.toBe(h1);
});

test("stalenessOf is true when artifact provenance no longer matches", () => {
  const m = base();
  m.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: "stale", producedAt: "2026-01-01T00:00:00.000Z" };
  expect(stalenessOf(m, m.elements[0])).toBe(true);
});

test("nextActions is produce when element has a chosen form and no fresh artifact", () => {
  expect(nextActions(base())).toEqual(["produce"]);
});

test("nextActions is show when the artifact is fresh", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "/x.png", sha256: "b".repeat(64),
    provenanceHash: provenanceHash(m, m.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(nextActions(m)).toEqual(["show"]);
});

test("nextActions off-ramps ([]) when data supports no visual", () => {
  const m = base();
  m.orient = { profile: { columns: ["x"], numericColumns: [], rowCount: 0 }, supportsPoint: false };
  expect(nextActions(m)).toEqual([]);
});

test("parseManifest rejects a manifest missing elements", () => {
  const bad = { runId: "r", schemaVersion: 2, input: {}, events: [] };
  expect(() => parseManifest(bad)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/manifest.test.ts`
Expected: FAIL — v2 exports/shape don't exist yet.

- [ ] **Step 3: Rewrite `lib/loop/manifest.ts` to v2**

```ts
import { z } from "zod";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { canonicalHash } from "./canonical-hash";

const HashRef = z.object({ path: z.string(), sha256: z.string() });
const DataProfileSchema = z.object({
  columns: z.array(z.string()),
  numericColumns: z.array(z.string()),
  rowCount: z.number(),
});
const FormOptionSchema = z.object({ id: z.string(), nativeType: z.string(), why: z.string() });
const RunEventSchema = z.object({
  at: z.string(),
  kind: z.enum(["failure", "transition"]),
  elementId: z.string().optional(),
  action: z.string(),
  message: z.string(),
});
const RunElementSchema = z.object({
  id: z.string(),
  angle: z
    .object({
      confirmedTakeaway: z.string(),
      emphasis: z.string().optional(),
      altInsight: z.string(),
      unit: z.string(),
    })
    .optional(),
  proposal: z.object({ options: z.array(FormOptionSchema), chosenId: z.string().optional() }).optional(),
  artifact: z
    .object({ path: z.string(), sha256: z.string(), provenanceHash: z.string(), producedAt: z.string() })
    .optional(),
  review: z.object({ findings: z.array(z.unknown()), reviewedProvenanceHash: z.string() }).optional(),
  delivery: z.object({ requested: z.array(z.string()), delivered: z.array(HashRef) }).optional(),
  blocked: z.object({ reason: z.string(), at: z.string() }).optional(),
  dropped: z.object({ reason: z.string(), at: z.string() }).optional(),
  approved: z.object({ signoffPath: z.string(), approvedProvenanceHash: z.string() }).optional(),
});
const RunManifestSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal(2),
  input: z.object({ data: HashRef.optional(), article: HashRef.optional() }),
  cadrage: z.object({ answers: z.record(z.string(), z.string()) }).optional(),
  orient: z.object({ profile: DataProfileSchema, supportsPoint: z.boolean(), note: z.string().optional() }).optional(),
  elements: z.array(RunElementSchema),
  events: z.array(RunEventSchema),
});

export type DataProfile = z.infer<typeof DataProfileSchema>;
export type FormOption = z.infer<typeof FormOptionSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunElement = z.infer<typeof RunElementSchema>;
export type RunManifest = z.infer<typeof RunManifestSchema>;

export type NextAction = "orient" | "confirm-angle" | "propose" | "choose-form" | "produce" | "show";

export function parseManifest(raw: unknown): RunManifest {
  return RunManifestSchema.parse(raw);
}

// The artifact depends on exactly these. Any change ⇒ the produced artifact is stale.
export function provenanceHash(run: RunManifest, el: RunElement): string {
  return canonicalHash({
    inputData: run.input.data?.sha256 ?? null,
    inputArticle: run.input.article?.sha256 ?? null,
    cadrage: run.cadrage?.answers ?? null,
    angle: el.angle ?? null,
    chosenId: el.proposal?.chosenId ?? null,
  });
}

export function stalenessOf(run: RunManifest, el: RunElement): boolean {
  return el.artifact != null && el.artifact.provenanceHash !== provenanceHash(run, el);
}

export function writeManifest(path: string, m: RunManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, path); // atomic replace on the same filesystem
}

export function readManifest(path: string): RunManifest {
  return parseManifest(JSON.parse(readFileSync(path, "utf8")));
}

// State-driven next actions: run-level gates first (orient + honest off-ramp),
// then the live element's routing. Multi-element aggregation arrives with Task 8;
// the live path drives elements[0].
export function nextActions(run: RunManifest): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  const el = run.elements[0];
  if (!el || !el.angle) return ["confirm-angle"];
  if (!el.proposal) return ["propose"];
  if (el.proposal.options.length === 0) return [];
  if (!el.proposal.chosenId) return ["choose-form"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
  return ["show"];
}
```

- [ ] **Step 4: Cut over `orient.ts`**

`orient()` is unchanged in body but its result now lands run-level. Keep its signature `orient(dataCsv: string): { profile; supportsPoint; note? }`. No file change needed if the return type already matches `run.orient`. Verify the return object matches `{ profile, supportsPoint, note? }` (it does). If `orient.ts` imported `DataProfile` from `./manifest`, that import still resolves. No edit required — confirm by typecheck in Step 9.

- [ ] **Step 5: Cut over `produce.ts` to elements + frozen input**

Replace `lib/loop/produce.ts`:

```ts
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";

const CHART_NATIVE_PRODUCE = join(
  import.meta.dir, "..", "..", "skills", "chart-native", "scripts", "produce-from-spec.mjs",
);

// The ONE craft verb of the loop. Assembles a NativeSpec from the manifest element and
// renders it via chart-native's real CLI (subprocess — never a src/ import), then records
// the artifact + its provenance so stalenessOf() can track it. Reads the FROZEN input by
// path (relative to the run dir) — never inline content. Artifact hashing/robust exit come
// in Task 5.
export function produce(run: RunManifest, el: RunElement, runDir: string, outDir: string): RunElement {
  if (!el.angle || !el.proposal?.chosenId) throw new Error("produce: need an angle and a chosen form");
  if (!run.input.data) throw new Error("produce: no frozen data input");
  const chosen = el.proposal.options.find((o) => o.id === el.proposal!.chosenId);
  if (!chosen) throw new Error(`produce: no option with id ${el.proposal.chosenId}`);

  const dataCsv = readFileSync(join(runDir, run.input.data.path), "utf8");
  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: el.angle.confirmedTakeaway,
    altInsight: el.angle.altInsight,
    unit: el.angle.unit,
    source: { name: "Provided by the newsroom" },
    ...(el.angle.emphasis ? { highlight: el.angle.emphasis } : {}),
    format: "static",
    data: dataCsv,
  };

  const specPath = join(mkdtempSync(join(tmpdir(), "loop-spec-")), "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], { stdio: "pipe" });

  return {
    ...el,
    artifact: {
      path: join(outDir, "static.png"),
      sha256: "",                 // filled in Task 5
      provenanceHash: provenanceHash(run, el),
      producedAt: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 6: Cut over `revise.ts` to an element**

Replace `lib/loop/revise.ts`:

```ts
import type { RunElement } from "./manifest";

export type ReviseChange =
  | { kind: "emphasis"; emphasis: string }
  | { kind: "takeaway"; confirmedTakeaway: string; altInsight: string };

// A back-edge: the journalist changes the angle after seeing the visual. We update the
// element's angle; its provenance no longer matches the artifact, so stalenessOf() flips
// true and nextActions() routes back to produce. Staleness is derived — we do NOT delete
// the old artifact here.
export function revise(el: RunElement, change: ReviseChange): RunElement {
  if (!el.angle) throw new Error("revise: nothing to revise before an angle exists");
  const angle =
    change.kind === "emphasis"
      ? { ...el.angle, emphasis: change.emphasis }
      : { ...el.angle, confirmedTakeaway: change.confirmedTakeaway, altInsight: change.altInsight };
  return { ...el, angle };
}
```

- [ ] **Step 7: Cut over `driver.ts`**

Replace `lib/loop/driver.ts`:

```ts
import { nextActions, type RunManifest } from "./manifest";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";

// State-driven: read the manifest, ask nextActions() what is valid, run the matching
// deterministic step on the live element (elements[0]). Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances.
export function advance(run: RunManifest, runDir: string, outDir: string): RunManifest {
  const [next] = nextActions(run);
  switch (next) {
    case "orient":
      return { ...run, orient: orient(readData(run, runDir)) };
    case "propose": {
      const el = run.elements[0];
      const options = propose(run);
      return { ...run, elements: [{ ...el, proposal: { options } }, ...run.elements.slice(1)] };
    }
    case "produce": {
      const el = produce(run, run.elements[0], runDir, outDir);
      return { ...run, elements: [el, ...run.elements.slice(1)] };
    }
    default:
      return run; // confirm-angle / choose-form / show / [] are human turns
  }
}

function readData(run: RunManifest, runDir: string): string {
  if (!run.input.data) throw new Error("advance: no frozen data input to orient");
  return require("node:fs").readFileSync(require("node:path").join(runDir, run.input.data.path), "utf8");
}
```

Note: `propose(run)` still reads `run.orient?.profile` (unchanged). Confirm its signature in Step 8.

- [ ] **Step 8: Cut over `propose.ts`**

`propose(m: RunManifest): FormOption[]` reads `m.orient?.profile` — still valid in v2. No behavioral change. Confirm the import of `RunManifest`/`FormOption` from `./manifest` still resolves; no edit expected. (If typecheck flags the `RunManifest` shape, it will only be because `orient` is now optional at run level — already optional in v1.)

- [ ] **Step 9: Migrate the remaining existing tests to v2**

Update `lib/loop/manifest-io.test.ts`, `orient.test.ts`, `propose.test.ts`, `revise.test.ts`, `produce.test.ts`, `driver.test.ts` to the v2 shape:
- `input: { dataCsv, statedPoint }` → freeze a data file into a temp run dir and set `input: { data: freezeInput(runDir, src, "data") }`.
- top-level `angle`/`proposal`/`artifact` → `elements: [{ id: "e1", ... }]`.
- `schemaVersion: 1` → `2`, add `events: []`.
- `provenanceHash(m)` → `provenanceHash(run, run.elements[0])`.
- `revise(m, change)` → `revise(run.elements[0], change)`.
- `produce(m, outDir)` → `produce(run, run.elements[0], runDir, outDir)`.
- `advance(m, outDir)` → `advance(run, runDir, outDir)`.

Concretely, `manifest-io.test.ts` becomes:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest, writeManifest, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

function freshRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-io-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const run: RunManifest = {
    runId: "r1",
    schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  return { run, runDir };
}

test("writeManifest then readManifest round-trips", () => {
  const { run } = freshRun();
  const p = join(mkdtempSync(join(tmpdir(), "loop-io-out-")), "run.json");
  writeManifest(p, run);
  expect(readManifest(p)).toEqual(run);
});
```

For `driver.test.ts` / `produce.test.ts`, thread `runDir` (the temp dir where the input was frozen) into `advance`/`produce`. Keep the existing behavioral assertions (the e2e still renders a real chart-native artifact).

- [ ] **Step 10: Run the whole loop suite to verify green**

Run: `bun test lib/loop/`
Expected: PASS — all migrated tests green (the e2e renders real charts; ensure `bun install` has run in `skills/chart-native`).

- [ ] **Step 11: Typecheck**

Run: `bunx tsc --noEmit` (from `lib/`)
Expected: no errors (no new `any`).

- [ ] **Step 12: Commit**

```bash
git add lib/loop/
git commit -m "feat(loop): v2 manifest schema (elements[] + zod) — behavior-preserving cutover"
```

---

### Task 4: Derived gate state + invariants

**Files:**
- Modify: `lib/loop/manifest.ts` (add `gateStateOf`, `assertInvariants`)
- Test: `lib/loop/gate-state.test.ts` (create)

**Interfaces:**
- Produces:
  - `gateStateOf(run: RunManifest, el: RunElement): GateState`
  - `assertInvariants(run: RunManifest): void` — throws on state↔data contradictions.
  - export type `GateState` (union in File Structure above).

- [ ] **Step 1: Write the failing test**

Create `lib/loop/gate-state.test.ts`:

```ts
import { test, expect } from "bun:test";
import { gateStateOf, assertInvariants, provenanceHash, type RunManifest, type RunElement } from "./manifest";

function run(el: RunElement): RunManifest {
  return {
    runId: "r", schemaVersion: 2,
    input: { data: { path: "input/d.csv", sha256: "a".repeat(64) } },
    orient: { profile: { columns: ["a", "b"], numericColumns: ["a", "b"], rowCount: 2 }, supportsPoint: true },
    elements: [el], events: [],
  };
}
const angle = { confirmedTakeaway: "t", altInsight: "a", unit: "u" };
const proposal = { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" };

test("empty element is 'empty'", () => {
  const r = run({ id: "e" });
  expect(gateStateOf(r, r.elements[0])).toBe("angled" === "angled" ? "empty" : "empty");
});
test("angle only → 'angled'", () => {
  const r = run({ id: "e", angle });
  expect(gateStateOf(r, r.elements[0])).toBe("angled");
});
test("proposal without choice → 'proposed'", () => {
  const r = run({ id: "e", angle, proposal: { options: proposal.options } });
  expect(gateStateOf(r, r.elements[0])).toBe("proposed");
});
test("chosen form, no artifact → 'chosen'", () => {
  const r = run({ id: "e", angle, proposal });
  expect(gateStateOf(r, r.elements[0])).toBe("chosen");
});
test("fresh artifact → 'produced'", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: provenanceHash(r, r.elements[0]), producedAt: "2026-01-01T00:00:00.000Z" };
  expect(gateStateOf(r, r.elements[0])).toBe("produced");
});
test("artifact with mismatched provenance → 'stale'", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: "old", producedAt: "2026-01-01T00:00:00.000Z" };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("review is not inherited once provenance moved (falls back to stale)", () => {
  const r = run({ id: "e", angle, proposal });
  r.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: "old", producedAt: "2026-01-01T00:00:00.000Z" };
  r.elements[0].review = { findings: [], reviewedProvenanceHash: "old" };
  expect(gateStateOf(r, r.elements[0])).toBe("stale");
});
test("fresh review → 'reviewed'", () => {
  const r = run({ id: "e", angle, proposal });
  const ph = provenanceHash(r, r.elements[0]);
  r.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: ph, producedAt: "2026-01-01T00:00:00.000Z" };
  r.elements[0].review = { findings: [], reviewedProvenanceHash: ph };
  expect(gateStateOf(r, r.elements[0])).toBe("reviewed");
});
test("dropped wins over everything", () => {
  const r = run({ id: "e", angle, proposal, dropped: { reason: "cut", at: "2026-01-01T00:00:00.000Z" } });
  expect(gateStateOf(r, r.elements[0])).toBe("dropped");
});
test("assertInvariants throws when chosenId is not among options", () => {
  const r = run({ id: "e", angle, proposal: { options: proposal.options, chosenId: "ghost" } });
  expect(() => assertInvariants(r)).toThrow();
});
test("assertInvariants throws when approved without an artifact", () => {
  const r = run({ id: "e", angle, approved: { signoffPath: "s.sig", approvedProvenanceHash: "x" } });
  expect(() => assertInvariants(r)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/gate-state.test.ts`
Expected: FAIL — `gateStateOf`/`assertInvariants` not exported.

- [ ] **Step 3: Add `GateState`, `gateStateOf`, `assertInvariants` to `manifest.ts`**

Append to `lib/loop/manifest.ts`:

```ts
export type GateState =
  | "empty" | "oriented" | "angled" | "proposed" | "chosen"
  | "produced" | "stale" | "reviewed" | "approved" | "delivered"
  | "blocked" | "dropped";

// Pure function of present fields + explicit verdict markers. Priority is descending:
// verdicts first, then the derived lifecycle. Review/approval never inherit across a
// provenance change — they are only honored when their frozen hash still matches.
export function gateStateOf(run: RunManifest, el: RunElement): GateState {
  if (el.dropped) return "dropped";
  if (el.blocked) return "blocked";
  const fresh = el.artifact != null && !stalenessOf(run, el);
  const provenance = fresh ? el.artifact!.provenanceHash : null;
  if (el.delivery && el.delivery.delivered.length > 0 && fresh) return "delivered";
  if (el.approved && provenance && el.approved.approvedProvenanceHash === provenance) return "approved";
  if (el.review && provenance && el.review.reviewedProvenanceHash === provenance) return "reviewed";
  if (el.artifact) return stalenessOf(run, el) ? "stale" : "produced";
  if (el.proposal?.chosenId) return "chosen";
  if (el.proposal) return "proposed";
  if (el.angle) return "angled";
  if (run.orient) return "oriented";
  return "empty";
}

// state ↔ data must not desync. Throws on contradictions the derivation cannot express.
export function assertInvariants(run: RunManifest): void {
  for (const el of run.elements) {
    if (el.proposal?.chosenId && !el.proposal.options.some((o) => o.id === el.proposal!.chosenId)) {
      throw new Error(`invariant: element ${el.id} chosenId '${el.proposal.chosenId}' not among options`);
    }
    if (el.artifact && !el.angle) throw new Error(`invariant: element ${el.id} has an artifact without an angle`);
    if (el.approved && !el.artifact) throw new Error(`invariant: element ${el.id} approved without an artifact`);
    if (el.review && !el.artifact) throw new Error(`invariant: element ${el.id} reviewed without an artifact`);
    if (el.blocked && el.dropped) throw new Error(`invariant: element ${el.id} both blocked and dropped`);
  }
}
```

Fix the first test's tautological placeholder: replace its body with `expect(gateStateOf(r, r.elements[0])).toBe("empty");` (the `"angled" === "angled"` guard was only to make the intent obvious while writing — the assertion is `"empty"`).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/gate-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `assertInvariants` into `writeManifest`**

In `lib/loop/manifest.ts`, call `assertInvariants(m)` at the top of `writeManifest` so no invalid state is ever persisted:

```ts
export function writeManifest(path: string, m: RunManifest): void {
  assertInvariants(m);
  mkdirSync(dirname(path), { recursive: true });
  // …unchanged…
}
```

- [ ] **Step 6: Run the full loop suite**

Run: `bun test lib/loop/`
Expected: PASS (existing tests still green — they build valid states).

- [ ] **Step 7: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/gate-state.test.ts
git commit -m "feat(loop): derived gate state + state↔data invariants (no-inherit on provenance move)"
```

---

### Task 5: Bounded failure events + produce hardening

**Files:**
- Modify: `lib/loop/manifest.ts` (add `appendEvent`)
- Modify: `lib/loop/produce.ts` (artifact sha256 + `existsSync` + temp cleanup + robust exit; caller records failure events)
- Test: `lib/loop/events.test.ts` (create), extend `lib/loop/produce.test.ts`

**Interfaces:**
- Produces:
  - `appendEvent(run: RunManifest, ev: RunEvent, cap?: number): RunManifest` — returns a new manifest with `ev` appended, ring-capped (default 50).
  - `produce(...)` now: verifies the rendered artifact exists, hashes it (sha256), cleans its temp spec dir, and throws a descriptive error (carrying the subprocess exit code + captured stderr) on failure.

- [ ] **Step 1: Write the failing events test**

Create `lib/loop/events.test.ts`:

```ts
import { test, expect } from "bun:test";
import { appendEvent, type RunManifest, type RunEvent } from "./manifest";

function base(): RunManifest {
  return { runId: "r", schemaVersion: 2, input: {}, elements: [{ id: "e" }], events: [] };
}
function ev(i: number): RunEvent {
  return { at: "2026-01-01T00:00:00.000Z", kind: "failure", action: "produce", message: `fail ${i}` };
}

test("appendEvent adds an event without mutating the input", () => {
  const m = base();
  const m2 = appendEvent(m, ev(1));
  expect(m.events.length).toBe(0);
  expect(m2.events.length).toBe(1);
});

test("appendEvent ring-caps to the last N events", () => {
  let m = base();
  for (let i = 0; i < 60; i++) m = appendEvent(m, ev(i), 50);
  expect(m.events.length).toBe(50);
  expect(m.events[0].message).toBe("fail 10");
  expect(m.events[49].message).toBe("fail 59");
});

test("appendEvent does not advance element state", () => {
  const m2 = appendEvent(base(), ev(1));
  expect(m2.elements[0].artifact).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/events.test.ts`
Expected: FAIL — `appendEvent` not exported.

- [ ] **Step 3: Add `appendEvent` to `manifest.ts`**

```ts
// Append a bounded event. Failure events record what went wrong WITHOUT advancing any
// element's progression. Ring-capped so the ledger can never grow unbounded.
export function appendEvent(run: RunManifest, ev: RunEvent, cap = 50): RunManifest {
  const events = [...run.events, ev].slice(-cap);
  return { ...run, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Harden `produce.ts`**

Replace the render + return portion of `lib/loop/produce.ts` (the part after `nativeSpec` is built):

```ts
  const specDir = mkdtempSync(join(tmpdir(), "loop-spec-"));
  const specPath = join(specDir, "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  try {
    execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], { stdio: "pipe" });
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer };
    throw new Error(`produce failed (exit ${err.status ?? "?"}): ${err.stderr?.toString().slice(0, 500) ?? ""}`);
  } finally {
    rmSync(specDir, { recursive: true, force: true });
  }

  const artifactPath = join(outDir, "static.png");
  if (!existsSync(artifactPath)) throw new Error(`produce: expected artifact not found at ${artifactPath}`);
  const artifactBytes = readFileSync(artifactPath);

  return {
    ...el,
    artifact: {
      path: artifactPath,
      sha256: Buffer.from(sha256(artifactBytes)).toString("hex"),
      provenanceHash: provenanceHash(run, el),
      producedAt: new Date().toISOString(),
    },
  };
```

Update the imports at the top of `produce.ts`:

```ts
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";
```

- [ ] **Step 6: Add a produce-failure test**

Append to `lib/loop/produce.test.ts`:

```ts
import { appendEvent, type RunEvent } from "./manifest";

test("produce throws a descriptive error and the caller can log a bounded failure event without advancing", () => {
  // A spec that chart-native will reject (no numeric data / bad type) makes produce throw.
  const { run, runDir } = /* build a run whose input renders nothing — reuse the suite's helper */ makeBrokenRun();
  let caught: Error | null = null;
  let manifest = run;
  try {
    produce(run, run.elements[0], runDir, join(runDir, "out"));
  } catch (e) {
    caught = e as Error;
    const ev: RunEvent = { at: "2026-01-01T00:00:00.000Z", kind: "failure", action: "produce", message: caught.message.slice(0, 200) };
    manifest = appendEvent(manifest, ev);
  }
  expect(caught).not.toBeNull();
  expect(manifest.events.length).toBe(1);
  expect(manifest.elements[0].artifact).toBeUndefined(); // state did not advance
});
```

Implement `makeBrokenRun()` in the test file as a small helper that freezes a header-only CSV (`"a,b"` with no rows) into a temp run dir and sets a chosen form — chart-native fails to render, producing a non-zero exit. If chart-native tolerates empty data, instead point `input.data` at a frozen CSV whose chosen `nativeType` is unsupported; the goal is a deterministic non-zero exit.

- [ ] **Step 7: Run the produce + events tests**

Run: `bun test lib/loop/produce.test.ts lib/loop/events.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/produce.ts lib/loop/produce.test.ts lib/loop/events.test.ts
git commit -m "feat(loop): bounded failure events + produce hardening (artifact hash, exit capture, temp cleanup)"
```

---

### Task 6: Schema migration v1 → v2

**Files:**
- Create: `lib/loop/migrate.ts`
- Modify: `lib/loop/manifest.ts` (`readManifest` auto-migrates)
- Test: `lib/loop/migrate.test.ts` (create)

**Interfaces:**
- Produces: `migrate(raw: unknown, runDir: string): RunManifest` — upgrades a v1 manifest object to v2. Freezes the v1 inline `input.dataCsv` into `<runDir>/input/` (path+hash), wraps top-level `angle`/`proposal`/`artifact` into `elements[0]`, initializes `events: []`. Refuses unknown/newer versions.
- Consumes: `freezeInput` (Task 2), `parseManifest` (Task 3).

- [ ] **Step 1: Write the failing test**

Create `lib/loop/migrate.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate";
import { parseManifest } from "./manifest";

const v1 = {
  runId: "r1",
  schemaVersion: 1,
  input: { dataCsv: "canton,2015,2024\nGenève,449,583", statedPoint: "premiums rose" },
  orient: { profile: { columns: ["canton", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 1 }, supportsPoint: true },
  angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
  proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" },
  artifact: { path: "/old/static.png", provenanceHash: "old" },
};

test("migrate upgrades a v1 manifest to a valid v2 manifest", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(() => parseManifest(m)).not.toThrow();
  expect(m.schemaVersion).toBe(2);
});

test("migrate freezes the v1 inline dataCsv into the run dir", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.input.data).toBeDefined();
  expect(existsSync(join(runDir, m.input.data!.path))).toBe(true);
});

test("migrate wraps the single v1 element into elements[0]", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.elements).toHaveLength(1);
  expect(m.elements[0].angle?.confirmedTakeaway).toBe("t");
  expect(m.elements[0].proposal?.chosenId).toBe("slope");
});

test("migrate refuses an unknown / newer schema version", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  expect(() => migrate({ ...v1, schemaVersion: 99 }, runDir)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/migrate.test.ts`
Expected: FAIL — cannot resolve `./migrate`.

- [ ] **Step 3: Write `migrate.ts`**

```ts
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";
import { parseManifest, type RunManifest, type RunElement } from "./manifest";

// Upgrade an on-disk manifest to the current schema. v1 stored inline CSV content and a
// single top-level element; v2 freezes the content (path+hash) and wraps it in elements[].
export function migrate(raw: unknown, runDir: string): RunManifest {
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 2) return parseManifest(raw);
  if (obj.schemaVersion !== 1) throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(migrateV1toV2(raw as V1Manifest, runDir));
}

type V1Manifest = {
  runId: string;
  input: { dataCsv: string; statedPoint?: string };
  orient?: { profile: { columns: string[]; numericColumns: string[]; rowCount: number }; supportsPoint: boolean; note?: string };
  angle?: RunElement["angle"];
  proposal?: RunElement["proposal"];
  artifact?: { path: string; provenanceHash: string };
};

function migrateV1toV2(v1: V1Manifest, runDir: string): RunManifest {
  const src = join(mkdtempSync(join(tmpdir(), "loop-mig-src-")), "data.csv");
  writeFileSync(src, v1.input.dataCsv);
  const data = freezeInput(runDir, src, "data");
  const el: RunElement = {
    id: "e1",
    angle: v1.angle,
    proposal: v1.proposal,
    // v1 artifacts lacked sha256/producedAt; treat as stale (unknown provenance) so the
    // next produce re-derives cleanly rather than trusting an unhashed artifact.
    ...(v1.artifact
      ? { artifact: { path: v1.artifact.path, sha256: "", provenanceHash: v1.artifact.provenanceHash, producedAt: "1970-01-01T00:00:00.000Z" } }
      : {}),
  };
  return {
    runId: v1.runId,
    schemaVersion: 2,
    input: { data },
    ...(v1.orient ? { orient: v1.orient } : {}),
    elements: [el],
    events: [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/migrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Auto-migrate in `readManifest`**

`readManifest` must upgrade old on-disk manifests. Change it in `manifest.ts` to accept the run dir and migrate when needed:

```ts
import { migrate } from "./migrate";

export function readManifest(path: string, runDir = dirname(path)): RunManifest {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw && typeof raw === "object" && (raw as { schemaVersion?: number }).schemaVersion !== 2) {
    return migrate(raw, runDir);
  }
  return parseManifest(raw);
}
```

Note the import cycle risk: `migrate` imports from `manifest` (`parseManifest`, types) and `manifest` now imports `migrate`. Bun/ESM handles this because usage is inside functions (not top-level). If a cycle warning appears, move `parseManifest` + types into a small `manifest-schema.ts` and have both import that. Verify with `bunx tsc --noEmit`.

- [ ] **Step 6: Run the full loop suite + typecheck**

Run: `bun test lib/loop/` then `bunx tsc --noEmit` (from `lib/`)
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/loop/migrate.ts lib/loop/migrate.test.ts lib/loop/manifest.ts
git commit -m "feat(loop): v1→v2 schema migration + auto-migrate on read"
```

---

### Task 7: The `resume` command (read-only report)

**Files:**
- Create: `lib/loop/resume.ts`
- Test: `lib/loop/resume.test.ts` (create)

**Interfaces:**
- Produces:
  - `resumeReport(run: RunManifest, runDir: string): ResumeReport` — pure; validates frozen input + artifact hashes, derives per-element gate state + next actions, never mutates.
  - `type ResumeReport = { runId: string; elements: { id: string; gateState: GateState; nextActions: NextAction[]; validation: ElementValidation }[]; inputValidation: HashCheck[] }`.
  - `type HashCheck = { ref: string; status: "ok" | "missing" | "tampered" }`.
  - `type ElementValidation = { artifact: "none" | "ok" | "missing" | "tampered" | "stale" }`.
  - CLI entry (`import.meta.main`) reading `<runDir | manifestPath>`, printing journalist status + next actions + validation, exit ≠ 0 only on unreadable/corrupt manifest.
- Consumes: `readManifest`, `gateStateOf`, `nextActions`, `stalenessOf`, `provenanceHash` (Tasks 3–4).

- [ ] **Step 1: Write the failing test**

Create `lib/loop/resume.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resumeReport } from "./resume";
import { writeManifest, freezeInput as _f, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";

function seed(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-resume-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const run: RunManifest = {
    runId: "r1", schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    orient: { profile: { columns: ["canton", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 1 }, supportsPoint: true },
    elements: [{ id: "e1", angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" }, proposal: { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" } }],
    events: [],
  };
  return { run, runDir };
}

test("resumeReport reports the element gate state and next actions", () => {
  const { run, runDir } = seed();
  const report = resumeReport(run, runDir);
  expect(report.elements[0].gateState).toBe("chosen");
  expect(report.elements[0].nextActions).toEqual(["produce"]);
});

test("resumeReport flags a tampered frozen input", () => {
  const { run, runDir } = seed();
  appendFileSync(join(runDir, run.input.data!.path), "\nZurich,600,700"); // change bytes after freeze
  const report = resumeReport(run, runDir);
  expect(report.inputValidation[0].status).toBe("tampered");
});

test("resumeReport never mutates the manifest file", () => {
  const { run, runDir } = seed();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const before = readFileSync(p, "utf8");
  resumeReport(run, runDir);
  expect(readFileSync(p, "utf8")).toBe(before);
});
```

(Remove the unused `_f` import if your linter objects — it is only there to show the manifest module still re-exports nothing extra; use `freezeInput` from `./freeze`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/loop/resume.test.ts`
Expected: FAIL — cannot resolve `./resume`.

- [ ] **Step 3: Write `resume.ts`**

```ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  readManifest, gateStateOf, nextActions, stalenessOf, provenanceHash,
  type RunManifest, type GateState, type NextAction,
} from "./manifest";

export type HashCheck = { ref: string; status: "ok" | "missing" | "tampered" };
export type ElementValidation = { artifact: "none" | "ok" | "missing" | "tampered" | "stale" };
export type ResumeReport = {
  runId: string;
  inputValidation: HashCheck[];
  elements: { id: string; gateState: GateState; nextActions: NextAction[]; validation: ElementValidation }[];
};

function hashFile(path: string): string {
  return Buffer.from(sha256(readFileSync(path))).toString("hex");
}

function checkRef(runDir: string, ref: { path: string; sha256: string } | undefined, label: string): HashCheck | null {
  if (!ref) return null;
  const abs = join(runDir, ref.path);
  if (!existsSync(abs)) return { ref: label, status: "missing" };
  return { ref: label, status: hashFile(abs) === ref.sha256 ? "ok" : "tampered" };
}

// Read-only: validates hashes, derives state + next actions. NEVER writes. Completion is
// derived from the manifest + hashes only, never inferred from conversation.
export function resumeReport(run: RunManifest, runDir: string): ResumeReport {
  const inputValidation = [
    checkRef(runDir, run.input.data, "data"),
    checkRef(runDir, run.input.article, "article"),
  ].filter((c): c is HashCheck => c !== null);

  const elements = run.elements.map((el) => {
    let artifact: ElementValidation["artifact"] = "none";
    if (el.artifact) {
      if (stalenessOf(run, el)) artifact = "stale";
      else if (!existsSync(el.artifact.path)) artifact = "missing";
      else artifact = hashFile(el.artifact.path) === el.artifact.sha256 ? "ok" : "tampered";
    }
    return { id: el.id, gateState: gateStateOf(run, el), nextActions: nextActionsFor(run, el), validation: { artifact } };
  });

  return { runId: run.runId, inputValidation, elements };
}

// Per-element next actions for multi-element reporting. Mirrors nextActions() but scoped
// to one element after the shared run-level gates (orient / off-ramp) pass.
function nextActionsFor(run: RunManifest, el: typeof run.elements[number]): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  if (!el.angle) return ["confirm-angle"];
  if (!el.proposal) return ["propose"];
  if (el.proposal.options.length === 0) return [];
  if (!el.proposal.chosenId) return ["choose-form"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
  return ["show"];
}

if (import.meta.main) {
  const target = process.argv[2];
  if (!target) { console.error("usage: bun lib/loop/resume.ts <runDir | manifestPath>"); process.exit(2); }
  const manifestPath = target.endsWith(".json") ? target : join(target, "run.json");
  const runDir = target.endsWith(".json") ? join(target, "..") : target;
  let run: RunManifest;
  try {
    run = readManifest(manifestPath, runDir);
  } catch (e) {
    console.error(`resume: cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  const report = resumeReport(run, runDir);
  printReport(report);
}

function printReport(r: ResumeReport): void {
  // Journalist-facing status + the exact next action(s) + validation. English scaffold;
  // the orchestrating agent restates it in the journalist's language.
  console.log(`Run ${r.runId}`);
  for (const iv of r.inputValidation) console.log(`  input:${iv.ref} — ${iv.status}`);
  for (const el of r.elements) {
    console.log(`  element ${el.id}: ${el.gateState}  (artifact: ${el.validation.artifact})`);
    console.log(`    next: ${el.nextActions.length ? el.nextActions.join(", ") : "— nothing valid (off-ramp)"}`);
  }
}
```

Extract the shared per-element routing: `nextActions(run)` in `manifest.ts` and `nextActionsFor(run, el)` here duplicate logic. Refactor `manifest.ts` `nextActions` to delegate: export `nextActionsForElement(run, el)` from `manifest.ts` and have both `nextActions` and `resume` call it. (Do this refactor in this step and keep the manifest tests green.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/loop/resume.test.ts`
Expected: PASS.

- [ ] **Step 5: Manual CLI smoke test**

Run: `bun lib/loop/resume.ts <a temp runDir containing run.json>` (build one in a scratch script, or reuse a test fixture dir).
Expected: prints run id, input validation, element gate state + next actions; exit 0. Point it at a corrupt file → exit 1.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/resume.ts lib/loop/resume.test.ts lib/loop/manifest.ts
git commit -m "feat(loop): read-only resume — hash validation + gate state + exact next actions"
```

---

### Task 8: Acceptance — multi-element independence, close/reopen, no-secrets

**Files:**
- Test: `lib/loop/acceptance.test.ts` (create)

**Interfaces:**
- Consumes: everything above. No new production code unless a test surfaces a gap (if so, fix minimally and note it).

- [ ] **Step 1: Write the multi-element independence test**

Create `lib/loop/acceptance.test.ts`:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, readManifest, gateStateOf, provenanceHash, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";
import { resumeReport } from "./resume";

function twoElementRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-accept-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const angle = { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" };
  const proposal = { options: [{ id: "slope", nativeType: "slope", why: "w" }], chosenId: "slope" };
  const run: RunManifest = {
    runId: "r1", schemaVersion: 2,
    input: { data: freezeInput(runDir, src, "data") },
    orient: { profile: { columns: ["canton", "2015", "2024"], numericColumns: ["2015", "2024"], rowCount: 1 }, supportsPoint: true },
    elements: [
      { id: "e1", angle, proposal }, // chosen, awaiting produce
      { id: "e2", angle },           // only angled
    ],
    events: [],
  };
  return { run, runDir };
}

test("elements advance independently — reviseing e1 leaves e2 untouched", () => {
  const { run } = twoElementRun();
  const e1ph = provenanceHash(run, run.elements[0]);
  run.elements[0].artifact = { path: "/x.png", sha256: "b".repeat(64), provenanceHash: e1ph, producedAt: "2026-01-01T00:00:00.000Z" };
  expect(gateStateOf(run, run.elements[0])).toBe("produced");
  expect(gateStateOf(run, run.elements[1])).toBe("angled"); // unaffected
});

test("close and reopen resumes at the same gate with the same next actions", () => {
  const { run, runDir } = twoElementRun();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const before = resumeReport(run, runDir);
  const reopened = readManifest(p, runDir);
  const after = resumeReport(reopened, runDir);
  expect(after).toEqual(before);
});

test("the serialized manifest contains no input content and no secret-looking tokens", () => {
  const { run, runDir } = twoElementRun();
  const p = join(runDir, "run.json");
  writeManifest(p, run);
  const serialized = readFileSync(p, "utf8");
  expect(serialized).not.toContain("Genève,449,583"); // input rows never inlined
  expect(serialized).not.toMatch(/sk-[a-zA-Z0-9]{16,}/); // no API-key shapes
});
```

- [ ] **Step 2: Run the acceptance test**

Run: `bun test lib/loop/acceptance.test.ts`
Expected: PASS. If any assertion fails, it has found a real gap — fix minimally in the relevant unit and re-run.

- [ ] **Step 3: Run the whole gate**

Run: `bun run check`
Expected: green (typecheck all TSC_DIRS + all TEST_DIRS, including `lib`).

- [ ] **Step 4: Commit**

```bash
git add lib/loop/acceptance.test.ts
git commit -m "test(loop): acceptance — multi-element independence, close/reopen resume, no-secrets"
```

---

## Self-Review

**Spec coverage:**
- §3 schema v2 → Task 3. `elements[]` container → Tasks 3, 8. Dormant `review?`/`delivery?` slots → Task 3 (schema) + honored by Task 4 (gate state).
- §4 derived gate state + verdict markers → Task 4.
- §5 canonical provenance + no-inherit rule → Tasks 1, 4.
- §6 freeze inputs, no secrets → Tasks 2, 8.
- §7 hardening (canonical hash, schemaVersion read+validate, unique tmp, produce robustness) → Tasks 1, 3, 5, 6.
- §8 failure events + atomicity → Tasks 3 (atomic write), 5 (events).
- §9 migration → Task 6.
- §10 resume read-only → Task 7.
- §14 tests (provenance golden, gate states, no-inherit, multi-element, crash recovery, migration, resume no-mutation, failure event, no-secrets, e2e reopen) → Tasks 1, 4, 5, 6, 7, 8.
- §15 success criteria → Task 8 (reopen, multi-element, no-inherit, atomicity, no-secrets) + coverage above.

**Crash-recovery note:** atomicity is delivered by the unique-tmp + rename in `writeManifest` (Task 3). A dedicated "partial .tmp ignored" test is implicit (a stray `.tmp` is never read by `readManifest`, which only opens the exact path). If a reviewer wants it explicit, add a one-line test in Task 8 that drops a `run.json.<pid>.tmp` beside a valid `run.json` and asserts `readManifest` still reads the valid file.

**Placeholder scan:** the two spots that read like placeholders are intentional and instructed — the `sha256: ""` in Task 3's produce (filled in Task 5, stated) and `makeBrokenRun()` in Task 5 (implementation described in the step). No `TODO`/`TBD` remain.

**Type consistency:** `provenanceHash(run, el)`, `stalenessOf(run, el)`, `gateStateOf(run, el)`, `nextActions(run)` / `nextActionsForElement(run, el)`, `produce(run, el, runDir, outDir)`, `revise(el, change)`, `advance(run, runDir, outDir)`, `freezeInput(runDir, src, kind)`, `migrate(raw, runDir)`, `readManifest(path, runDir?)`, `resumeReport(run, runDir)` are used consistently across tasks.

---

## Execution Handoff

Two execution options — see the skill's handoff prompt.

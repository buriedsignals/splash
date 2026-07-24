# Verb Contract + Adapters — B1 (craft seam) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `runVerb("render", …)` the single execution path to any engine — for the legacy orchestrator **and** for the editorial loop — behind a neutral, JSON-serializable payload and a typed result that never throws.

**Architecture:** The dispatch mechanism already exists but lives in `skills/splash/src/adapters.ts` (legacy-coupled) while `lib/loop/produce.ts` bypasses it with its own `execFileSync`. This plan hoists the *mechanism* into `lib/core/verbs/` behind a neutral `RenderPayload`, drops the *policy* (native→DW fallback routing stays with the legacy caller), inverts the `lib/core → skills/splash` type dependency via a new `lib/core/vocabulary.ts` with re-exports, and reduces `realDispatch` to a translator. The legacy test suite is the regression net: it must pass **unchanged**.

**Tech Stack:** Bun · TypeScript · `bun:test` · existing `lib/core/registry.ts` + `lib/core/contract.ts`.

**Spec:** `docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md`

## Global Constraints

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD** — failing test before implementation, every task.
- Code, comments, identifiers, filenames, commits, branches: **English**.
- **No vendor mention** (Claude/Anthropic) in any committed artifact. No `Co-Authored-By`.
- **No new `any`.** No mocking of external APIs — real keys, real failures (Datawrapper tests self-skip without `DATAWRAPPER_API_TOKEN`, project convention).
- Gate `bun run check` green before every commit.
- Branch `feat/verb-contract-adapters` off `feat/run-manifest-resume` (worktree `splash-verbs`).
- **The legacy test suite is the safety net.** `skills/splash/tests/adapters.test.ts`, `skills/splash/src/adapters.test.ts`, and `skills/splash/scripts/produce-all-format.test.ts` must pass **unchanged** — never edit them to fit an implementation. They assert **byte-exact** error strings (`adapters.ts:377-383`); preserve those strings character for character.
- **Mechanism moves, policy stays.** `formatFlag`, `channelEnvFor`'s `undefined` defaulting, `withProposalChannel`, and the native→DW fallback routing are legacy-owned and stay in `skills/splash/src/adapters.ts`.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `lib/core/vocabulary.ts` | Canonical `VisualFormat` / `Channel` / `VERBS` / `Verb` / `isVerb` — no upward imports | Create |
| `lib/core/vocabulary.test.ts` | Closed-enum + `isVerb` coverage | Create |
| `lib/core/id-safety.ts` | `isSafeId` / `assertSafeId` / `unsafeIdMessage` — moved down, pure | Create |
| `lib/core/verbs/types.ts` | `RenderPayload`, `VerbErrorCode`, `VerbResult<T>`, `ok`/`fail` helpers | Create |
| `lib/core/verbs/exec.ts` | Subprocess mechanism moved from `adapters.ts`: `runProducerScript`, `freshOutDir`, `collectOutputs`, `channelEnvForEngine` | Create |
| `lib/core/verbs/render.ts` | The `render` verb: request validation → registry lookup → transport branch → contract assert | Create |
| `lib/core/verbs/index.ts` | `runVerb(verb, payload)` over the closed enum; `capture`/`review`/`publish` → `not-implemented` | Create |
| `lib/core/verbs/*.test.ts` | Per-unit tests (colocated, matching `lib/core` convention) | Create |
| `skills/splash/src/producer-spec.ts:11` | `VisualFormat` becomes a re-export | Modify |
| `skills/splash/src/channel.ts:8,13` | `Channel` + `VisualFormat` become re-exports (ends the hand-sync duplication) | Modify |
| `skills/splash/src/id-safety.ts` | Becomes a re-export of `lib/core/id-safety` | Modify |
| `skills/splash/src/adapters.ts` | Re-exports moved helpers; `realDispatch` becomes a translator | Modify |
| `lib/loop/produce.ts` | Drops `execFileSync` + the `skills/` path; one `render` call; returns `VerbResult` | Modify |
| `lib/loop/driver.ts` | Consumes `VerbResult` → `appendEvent`, no `try/catch`; becomes `async` | Modify |
| `lib/loop/{produce,driver,acceptance}.test.ts` | Call sites become `await` | Modify |

---

### Task 1: Canonical vocabulary + dependency inversion

**Files:**
- Create: `lib/core/vocabulary.ts`
- Create: `lib/core/vocabulary.test.ts`
- Modify: `skills/splash/src/producer-spec.ts:11`
- Modify: `skills/splash/src/channel.ts:8`, `skills/splash/src/channel.ts:13`
- Modify: `lib/core/contract.ts:20-21`, `lib/core/registry.ts:10`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `VisualFormat`, `Channel`, `VERBS`, `Verb`, `isVerb(v: unknown): v is Verb` from `lib/core/vocabulary.ts`.

- [ ] **Step 1: Write the failing test**

Create `lib/core/vocabulary.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { VERBS, isVerb } from "./vocabulary";

describe("VERBS — the closed verb vocabulary", () => {
  it("declares exactly the four contract verbs, in order", () => {
    expect([...VERBS]).toEqual(["render", "capture", "review", "publish"]);
  });

  it("accepts a declared verb", () => {
    for (const v of VERBS) expect(isVerb(v)).toBe(true);
  });

  it("rejects an undeclared operation — this is what 'bounded verbs' means", () => {
    expect(isVerb("fetch-data")).toBe(false);
    expect(isVerb("")).toBe(false);
    expect(isVerb(undefined)).toBe(false);
    expect(isVerb(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test core/vocabulary.test.ts`
Expected: FAIL — `Cannot find module './vocabulary'`.

- [ ] **Step 3: Create the canonical vocabulary**

Create `lib/core/vocabulary.ts`:

```ts
// The canonical vocabulary of the execution contract. Nothing here imports upward into
// skills/ — that inversion is exactly what this file exists to end: lib/core/contract.ts
// and lib/core/registry.ts used to type-import VisualFormat/Channel from
// skills/splash/src/, which meant the new shell could not exist without the legacy
// orchestrator. skills/splash/src/producer-spec.ts and channel.ts now RE-EXPORT from
// here, so their ~46 existing importers are untouched, and VisualFormat stops being
// duplicated by hand between producer-spec.ts and channel.ts.
// See docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md §2.1.

export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

// The three canonical distribution channels a journalist picks in CADRAGE Q3.
export type Channel = "social-vertical" | "social-feed" | "article-web";

// The CLOSED verb vocabulary. A closed enum is what makes "bounded verbs" mechanical
// rather than documentary: an operation outside this list is a refusal, not an
// improvisation. Only `render` has a body in B1 — capture (issue #10), review (#9) and
// publish (#4) are declared slots their own sub-project fills.
export const VERBS = ["render", "capture", "review", "publish"] as const;
export type Verb = (typeof VERBS)[number];

export function isVerb(v: unknown): v is Verb {
  return typeof v === "string" && (VERBS as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd lib && bun test core/vocabulary.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Point the existing definitions at it**

In `skills/splash/src/producer-spec.ts`, replace line 11:

```ts
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";
```

with:

```ts
// Canonical definition lives in lib/core/vocabulary.ts (the contract's vocabulary);
// re-exported here so this module's existing importers are unchanged.
export type { VisualFormat } from "../../../lib/core/vocabulary";
```

In `skills/splash/src/channel.ts`, replace lines 8 and 13 (and drop the now-false
"kept in sync by hand" comment above line 13):

```ts
export type { Channel, VisualFormat } from "../../../lib/core/vocabulary";
```

In `lib/core/contract.ts`, replace lines 20-21:

```ts
import type { VisualFormat } from "./vocabulary";
import type { Channel } from "./vocabulary";
```

In `lib/core/registry.ts`, replace line 10:

```ts
import type { VisualFormat } from "./vocabulary";
```

- [ ] **Step 6: Run the full gate to prove the ~46 importers still resolve**

Run: `bun run check`
Expected: PASS. The typecheck of `lib`, `skills/splash`, and every engine dir is what
proves the re-export is transparent — type identity cannot be asserted at runtime.

- [ ] **Step 7: Commit**

```bash
git add lib/core/vocabulary.ts lib/core/vocabulary.test.ts lib/core/contract.ts lib/core/registry.ts skills/splash/src/producer-spec.ts skills/splash/src/channel.ts
git commit -m "feat(core): canonical vocabulary — invert the core→skills type dependency"
```

---

### Task 2: Move id-safety down + expose its message

**Files:**
- Create: `lib/core/id-safety.ts`
- Create: `lib/core/id-safety.test.ts`
- Modify: `skills/splash/src/id-safety.ts` (whole file → re-export)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `isSafeId(id: unknown): id is string`, `assertSafeId(id: unknown): void`, `unsafeIdMessage(id: unknown): string` from `lib/core/id-safety.ts`.

The verb must reject an unsafe id **without throwing** (invariant I1), so the message
becomes an exported function instead of living inline in the thrower.

- [ ] **Step 1: Write the failing test**

Create `lib/core/id-safety.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { isSafeId, assertSafeId, unsafeIdMessage } from "./id-safety";

describe("id-safety — no LLM-supplied id reaches a path resolution unchecked", () => {
  it("accepts a plain slug", () => {
    expect(isSafeId("rents-2026")).toBe(true);
    expect(isSafeId("a_B9")).toBe(true);
  });

  it("rejects traversal, separators, empties and over-long ids", () => {
    for (const bad of ["../../evil", "/etc", "a/b", "", "..", "a\\b", ".hidden"])
      expect(isSafeId(bad)).toBe(false);
    expect(isSafeId("x".repeat(129))).toBe(false);
    expect(isSafeId(undefined)).toBe(false);
  });

  it("unsafeIdMessage names the offending id and the rule", () => {
    const msg = unsafeIdMessage("../../evil");
    expect(msg).toMatch(/not a safe slug/i);
    expect(msg).toContain("../../evil");
  });

  it("assertSafeId throws exactly unsafeIdMessage — one message, two shapes", () => {
    expect(() => assertSafeId("a/b")).toThrow(unsafeIdMessage("a/b"));
    expect(() => assertSafeId("ok-id")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test core/id-safety.test.ts`
Expected: FAIL — `Cannot find module './id-safety'`.

- [ ] **Step 3: Create the moved module**

Create `lib/core/id-safety.ts` — the body of `skills/splash/src/id-safety.ts` moved
verbatim (keep its full header comment explaining the data-loss primitive), with the
message extracted:

```ts
const MAX_ID_LENGTH = 128;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export function isSafeId(id: unknown): id is string {
  return (
    typeof id === "string" && id.length <= MAX_ID_LENGTH && SAFE_ID.test(id)
  );
}

// The single refusal message, exported because the contract needs it in TWO shapes: the
// legacy spine THROWS it (assertSafeId), the verb RETURNS it in a VerbResult (invariant
// I1 — a non-JS host has no catch). Same words either way.
export function unsafeIdMessage(id: unknown): string {
  const shown =
    typeof id === "string" ? id : id === undefined ? "(missing)" : String(id);
  return (
    `element id "${shown}" is not a safe slug (letters, digits, - and _ only, ` +
    `1-${MAX_ID_LENGTH} chars) — ids become directory and file names, so an id with ` +
    `a path separator, "..", or an absolute path could read or delete files outside ` +
    `the output folder`
  );
}

export function assertSafeId(id: unknown): void {
  if (!isSafeId(id)) throw new Error(unsafeIdMessage(id));
}
```

- [ ] **Step 4: Turn the old module into a re-export**

Replace the whole body of `skills/splash/src/id-safety.ts` with:

```ts
// Canonical definition moved to lib/core/id-safety.ts (the contract needs it, and
// lib/core may not import upward into skills/). Re-exported so produce-all.ts,
// adapters.ts and id-safety.test.ts are unchanged.
export {
  isSafeId,
  assertSafeId,
  unsafeIdMessage,
} from "../../../lib/core/id-safety";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd lib && bun test core/id-safety.test.ts`
Expected: PASS (4 tests).

Run: `cd skills/splash && bun test src/id-safety.test.ts src/id-safety-spine.test.ts`
Expected: PASS — unchanged files, proving the re-export is transparent.

- [ ] **Step 6: Commit**

```bash
git add lib/core/id-safety.ts lib/core/id-safety.test.ts skills/splash/src/id-safety.ts
git commit -m "refactor(core): move id-safety down + export its refusal message"
```

---

### Task 3: Move the subprocess mechanism into `lib/core/verbs/exec.ts`

**Files:**
- Create: `lib/core/verbs/exec.ts`
- Create: `lib/core/verbs/exec.test.ts`
- Modify: `skills/splash/src/adapters.ts` (delete the moved bodies, re-export, keep `channelEnvFor` as a back-compat wrapper)

**Interfaces:**
- Consumes: `Channel` from `lib/core/vocabulary` (Task 1); `getProducer` from `lib/core/registry`.
- Produces:
  - `type ExecOutcome = { status: "produced" } | { status: "needs-fallback"; reason: string } | { status: "failed"; error: string }`
  - `runProducerScript(cmd: string, args: string[], cwd: string, env?: Record<string, string>): ExecOutcome`
  - `freshOutDir(dir: string): string`
  - `collectOutputs(dir: string): string[]`
  - `channelEnvForEngine(engine: string, channel: Channel): Record<string, string>`

`formatFlag`, `withProposalChannel` and the `undefined`-channel defaulting stay in
`adapters.ts` — they are legacy semantics, not mechanism.

- [ ] **Step 1: Write the failing test**

Create `lib/core/verbs/exec.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../skills/splash/src/register-producers";
import { freshOutDir, collectOutputs, channelEnvForEngine } from "./exec";

describe("freshOutDir — every dispatch writes into a WHOLLY FRESH directory", () => {
  it("removes a stale artifact left by a superseded attempt", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "exec-fresh-")), "el");
    freshOutDir(dir);
    writeFileSync(join(dir, "stale.html"), "old");
    const abs = freshOutDir(dir);
    expect(existsSync(join(abs, "stale.html"))).toBe(false);
    expect(readdirSync(abs)).toEqual([]);
  });
});

describe("collectOutputs — flat listing, sorted, absolute", () => {
  it("lists files only, sorted", () => {
    const dir = freshOutDir(join(mkdtempSync(join(tmpdir(), "exec-out-")), "el"));
    writeFileSync(join(dir, "b.png"), "x");
    writeFileSync(join(dir, "a.json"), "x");
    expect(collectOutputs(dir).map((f) => f.split("/").pop())).toEqual([
      "a.json",
      "b.png",
    ]);
  });
});

describe("channelEnvForEngine — threading is the manifest's declaration, not a hard-coded list", () => {
  it("threads SPLASH_CHANNEL for an engine whose manifest declares threadsChannel", () => {
    expect(channelEnvForEngine("chart-native", "social-vertical")).toEqual({
      SPLASH_CHANNEL: "social-vertical",
    });
    expect(channelEnvForEngine("map-native", "social-feed")).toEqual({
      SPLASH_CHANNEL: "social-feed",
    });
  });

  it("threads nothing for an engine that declares it does not read a channel", () => {
    expect(channelEnvForEngine("scrolly", "social-vertical")).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test core/verbs/exec.test.ts`
Expected: FAIL — `Cannot find module './exec'`.

- [ ] **Step 3: Create `lib/core/verbs/exec.ts` by moving the bodies**

Move — do not rewrite — `collectOutputs` (`:179-184`), `toText` (`:186-188`),
`tail` (`:190-194`), `ExecOutcome` (`:196-199`), `runProducerScript` (`:201-253`) and
`freshOutDir` (`:255-272`) out of `skills/splash/src/adapters.ts` into
`lib/core/verbs/exec.ts`. Keep every explanatory comment — they document real bugs
(interleaved build logs corrupting the report JSON, stray artifacts from a superseded
attempt). Leave `FileDispatchOutcome` (`:169-175`) where it is; Task 8 deletes it.
Then add the engine-keyed channel env builder:

```ts
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { getProducer } from "../registry";
import type { Channel } from "../vocabulary";

// … moved verbatim: toText, tail, ExecOutcome, runProducerScript, freshOutDir,
// collectOutputs (with their original comments) …

// The extra env a subprocess dispatch needs. Whether SPLASH_CHANNEL is threaded is the
// engine manifest's `threadsChannel` flag, never a hard-coded producer list: the two
// native engines render at the channel's size/aspect and set it; scrolly / image-native
// do not read a channel. The channel here is ALWAYS resolved — the contract's
// RenderPayload.channel is non-optional, so the legacy's `?? "article-web"` defaulting
// stays with the legacy caller where it belongs.
export function channelEnvForEngine(
  engine: string,
  channel: Channel,
): Record<string, string> {
  const sub = getProducer(engine)?.subprocess;
  if (!sub)
    throw new Error(`no subprocess config registered for producer "${engine}"`);
  return sub.threadsChannel ? { SPLASH_CHANNEL: channel } : {};
}
```

- [ ] **Step 4: Re-export from `adapters.ts` so the legacy suite is untouched**

In `skills/splash/src/adapters.ts`, delete the moved bodies and add:

```ts
import {
  channelEnvForEngine,
  collectOutputs,
  freshOutDir,
  runProducerScript,
  type ExecOutcome,
} from "../../../lib/core/verbs/exec";

// The subprocess mechanism now lives in lib/core/verbs/exec.ts (runtime-neutral). These
// re-exports keep every existing importer and test working unchanged — including
// tests/adapters.test.ts, which dynamically imports THIS module's URL in a spawned
// process to exercise runProducerScript's env forwarding.
export { runProducerScript, freshOutDir, collectOutputs, type ExecOutcome };
```

and rewrite `channelEnvFor` (currently `adapters.ts:122-132`) as the back-compat wrapper
that keeps the legacy `undefined` defaulting:

```ts
// Legacy shape: an AcceptedProposal's channel is optional, and an absent one defaults to
// article-web (back-compat — legacy proposals without a channel still dispatch fine).
// The mechanism itself takes a RESOLVED channel; the defaulting is this caller's policy.
export function channelEnvFor(
  producer: FileBasedProducer,
  channel: Channel | undefined,
): Record<string, string> {
  return channelEnvForEngine(producer, channel ?? DEFAULT_CHANNEL);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd lib && bun test core/verbs/exec.test.ts`
Expected: PASS (4 tests).

Run: `cd skills/splash && bun test tests/adapters.test.ts`
Expected: PASS, file unchanged — including the spawned-subprocess env-forwarding test at
`tests/adapters.test.ts:71-100`.

- [ ] **Step 6: Commit**

```bash
git add lib/core/verbs/exec.ts lib/core/verbs/exec.test.ts skills/splash/src/adapters.ts
git commit -m "refactor(core): hoist the subprocess dispatch mechanism into lib/core/verbs"
```

---

### Task 4: Verb result types + `render` request validation

**Files:**
- Create: `lib/core/verbs/types.ts`
- Create: `lib/core/verbs/render.ts`
- Create: `lib/core/verbs/render.test.ts`

**Interfaces:**
- Consumes: `VisualFormat`/`Channel` (Task 1), `isSafeId`/`unsafeIdMessage` (Task 2), `getProducer` from `lib/core/registry`.
- Produces:
  - `type RenderPayload = { engine: string; spec: unknown; format: VisualFormat; channel: Channel; outDir: string; id: string }`
  - `type VerbErrorCode = "invalid-request" | "unknown-engine" | "unsupported-format" | "invalid-spec" | "engine-declined" | "engine-failed" | "not-implemented"`
  - `type VerbResult<T> = { ok: true; value: T } | { ok: false; code: VerbErrorCode; message: string }`
  - `ok<T>(value: T): VerbResult<T>`, `fail(code: VerbErrorCode, message: string): VerbResult<never>`
  - `render(p: RenderPayload): Promise<VerbResult<DeliveredArtifact>>`

- [ ] **Step 1: Write the failing test**

Create `lib/core/verbs/render.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { render } from "./render";
import type { RenderPayload } from "./types";

const base: RenderPayload = {
  engine: "chart-native",
  spec: { nativeType: "bar" },
  format: "static",
  channel: "article-web",
  outDir: "/tmp/splash-verb-unused",
  id: "el1",
};

describe("render — request validation happens before any filesystem or engine touch", () => {
  it("refuses an unsafe id as invalid-request, never a throw (invariant I1)", async () => {
    const r = await render({ ...base, id: "../../evil" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
    expect(r.message).toMatch(/not a safe slug/i);
  });

  it("refuses an unregistered engine as unknown-engine", async () => {
    const r = await render({ ...base, engine: "nope" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unknown-engine");
    // Byte-identical to the legacy dispatcher's string (adapters.ts:332).
    expect(r.message).toBe('unknown producer "nope"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: FAIL — `Cannot find module './render'`.

- [ ] **Step 3: Create the result types**

Create `lib/core/verbs/types.ts`:

```ts
import type { Channel, VisualFormat } from "../vocabulary";

// The `render` payload — NEUTRAL by contract (invariant I2): it knows nothing of
// AcceptedProposal (the legacy orchestrator) nor RunManifest (the editorial loop). Each
// caller translates into it. Every field is JSON-serializable (invariant I6) and `spec`
// is OPAQUE (invariant I3) — only the engine's own manifest validator understands it.
export type RenderPayload = {
  engine: string; // registry key: "chart-native", "dw-chart", …
  spec: unknown;
  format: VisualFormat;
  channel: Channel; // always resolved — defaulting is the caller's policy
  outDir: string;
  id: string; // slug; checked before any path resolution
};

export type VerbErrorCode =
  | "invalid-request" // verb outside the enum, or a malformed payload
  | "unknown-engine" // no manifest registered under this key
  | "unsupported-format" // the engine does not declare this format
  | "invalid-spec" // the engine's validator returned errors
  | "engine-declined" // the engine refuses THIS spec (chart-native exit 2)
  | "engine-failed" // non-zero execution, or a broken delivery
  | "not-implemented"; // declared verb, no body yet

// Invariant I1: every path returns one of these. A verb NEVER throws — the legacy's
// "drop-proof" discipline generalized, because a non-JS host has no catch.
export type VerbResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: VerbErrorCode; message: string };

export function ok<T>(value: T): VerbResult<T> {
  return { ok: true, value };
}

export function fail(code: VerbErrorCode, message: string): VerbResult<never> {
  return { ok: false, code, message };
}
```

- [ ] **Step 4: Create `render` with validation only**

Create `lib/core/verbs/render.ts`:

```ts
import { getProducer } from "../registry";
import { isSafeId, unsafeIdMessage } from "../id-safety";
import type { DeliveredArtifact } from "../contract";
import { fail, type RenderPayload, type VerbResult } from "./types";

// The ONE craft verb of B1. Callers hand it a neutral payload; it resolves the engine
// from the registry and dispatches on the DECLARED transport. It reports what the engine
// said and never routes: the native→Datawrapper fallback is the CALLER's policy.
export async function render(
  p: RenderPayload,
): Promise<VerbResult<DeliveredArtifact>> {
  // Path-safety BEFORE any resolve/mkdir/rmSync — `id` becomes a directory name and
  // freshOutDir recursively deletes what it resolves.
  if (!isSafeId(p.id)) return fail("invalid-request", unsafeIdMessage(p.id));

  const manifest = getProducer(p.engine);
  if (!manifest)
    return fail("unknown-engine", `unknown producer "${p.engine}"`);

  return fail(
    "not-implemented",
    `render: transport "${manifest.execution}" is not wired yet`,
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/core/verbs/types.ts lib/core/verbs/render.ts lib/core/verbs/render.test.ts
git commit -m "feat(verbs): typed verb result + render request validation"
```

---

### Task 5: `render` — the subprocess transport

**Files:**
- Modify: `lib/core/verbs/render.ts`
- Modify: `lib/core/verbs/render.test.ts`

**Interfaces:**
- Consumes: `runProducerScript`, `freshOutDir`, `collectOutputs`, `channelEnvForEngine` (Task 3); `assertDeliveredContract` from `lib/core/contract`.
- Produces: `render` returning `ok({ format, form: "file", files, report: {} })` for subprocess engines.

- [ ] **Step 1: Write the failing tests**

Append to `lib/core/verbs/render.test.ts`:

```ts
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outDirFor = (name: string): string =>
  join(mkdtempSync(join(tmpdir(), `render-${name}-`)), "el1");

describe("render — subprocess transport", () => {
  it("reports an engine that DECLINES this spec as engine-declined, with its reason", async () => {
    // chart-native exits 2 + "FALLBACK_TO_DW: …" when the native type is unmapped. The
    // verb reports the refusal; it never decides to route to Datawrapper — that is the
    // caller's policy.
    const r = await render({
      engine: "chart-native",
      spec: {
        nativeType: "definitely-not-a-native-type",
        title: "t",
        altInsight: "a",
        unit: "u",
        source: { name: "s" },
        format: "static",
        data: "a,b\n1,2\n",
      },
      format: "static",
      channel: "article-web",
      outDir: outDirFor("declined"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-declined");
    expect(r.message).toMatch(/FALLBACK_TO_DW|unsupported/i);
  }, 120_000);

  it("reports a failing engine as engine-failed with bounded stderr", async () => {
    const r = await render({
      engine: "chart-native",
      spec: { nativeType: "bar" }, // structurally invalid: no data, no title
      format: "static",
      channel: "article-web",
      outDir: outDirFor("failed"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("engine-failed");
    expect(r.message.length).toBeGreaterThan(0);
  }, 120_000);

  it("renders a real static artifact and contract-checks it", async () => {
    const outDir = outDirFor("ok");
    const r = await render({
      engine: "chart-native",
      spec: {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the four cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n",
      },
      format: "static",
      channel: "article-web",
      outDir,
      id: "el1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.form).toBe("file");
    expect(r.value.format).toBe("static");
    expect(r.value.files.some((f) => f.endsWith("static.png"))).toBe(true);
    // A real PNG, not a zero-byte placeholder.
    const png = r.value.files.find((f) => f.endsWith("static.png"))!;
    expect(readFileSync(png).length).toBeGreaterThan(1000);
  }, 300_000);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: FAIL — all three get `not-implemented`.

- [ ] **Step 3: Implement the subprocess branch**

In `lib/core/verbs/render.ts`, add the imports and replace the `not-implemented` return:

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertDeliveredContract, type DeliveredArtifact } from "../contract";
import {
  channelEnvForEngine,
  collectOutputs,
  freshOutDir,
  runProducerScript,
  type ExecOutcome,
} from "./exec";

// … inside render(), after the manifest lookup:

  if (manifest.execution === "subprocess") {
    const sub = manifest.subprocess!;
    const absOutDir = freshOutDir(p.outDir);
    // The engine reads its spec from a file on argv. Written to a temp dir (never into
    // outDir, which must hold deliverables only) and removed whatever happens — the
    // cleanup lib/loop/produce.ts already did and the legacy dispatcher did not.
    const specDir = mkdtempSync(join(tmpdir(), "splash-verb-spec-"));
    const specPath = join(specDir, "config.json");
    writeFileSync(specPath, JSON.stringify(p.spec, null, 2));
    // An IIFE rather than a `let` assigned inside try/finally: an unannotated `let` would
    // infer `any`, which the project forbids, and annotating it would then trip TS's
    // "used before assigned".
    const outcome = ((): ExecOutcome => {
      try {
        return runProducerScript(
          "bun",
          [sub.scriptPath, specPath, absOutDir, p.format],
          sub.skillDir,
          channelEnvForEngine(p.engine, p.channel),
        );
      } finally {
        rmSync(specDir, { recursive: true, force: true });
      }
    })();
    // The engine DECLINED this spec (chart-native's exit 2 + FALLBACK_TO_DW). Reported,
    // never acted on: routing to another engine is the caller's policy, not the verb's.
    if (outcome.status === "needs-fallback")
      return fail("engine-declined", outcome.reason);
    if (outcome.status === "failed") return fail("engine-failed", outcome.error);

    const artifact: DeliveredArtifact = {
      format: p.format,
      form: "file",
      files: collectOutputs(absOutDir),
      report: {},
    };
    // A native produce writes byproducts beside the deliverable; the produce-stage
    // contract is lenient about those and asserts only the single-format media shape.
    // It THROWS on a violation — converted here, because a verb never throws (I1).
    try {
      assertDeliveredContract(artifact);
    } catch (e) {
      return fail("engine-failed", (e as Error).message);
    }
    return ok(artifact);
  }

  return fail(
    "not-implemented",
    `render: transport "${manifest.execution}" is not wired yet`,
  );
```

Add `ok` to the existing import from `./types`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: PASS (5 tests). The real render takes ~1-3 min (Vite build) — that is why the
test carries a 300s timeout.

- [ ] **Step 5: Commit**

```bash
git add lib/core/verbs/render.ts lib/core/verbs/render.test.ts
git commit -m "feat(verbs): render — subprocess transport with declined/failed/delivered outcomes"
```

---

### Task 6: `render` — the in-process transport

**Files:**
- Modify: `lib/core/verbs/render.ts`
- Modify: `lib/core/verbs/render.test.ts`

**Interfaces:**
- Consumes: `ProduceContext` from `lib/core/contract`; `manifest.formats`, `manifest.validate`, `manifest.inProcess` from `lib/core/registry`.
- Produces: `render` returning the engine's own `DeliveredArtifact` for in-process engines.

**The error strings are load-bearing.** `skills/splash/src/adapters.test.ts:44-100` and
`skills/splash/scripts/produce-all-format.test.ts:127+` assert the format-gate message
**byte for byte**. Copy it exactly.

- [ ] **Step 1: Write the failing tests**

Append to `lib/core/verbs/render.test.ts`:

```ts
describe("render — in-process transport (hosted Datawrapper engines)", () => {
  // The real ChartSpec shape (skills/dw-chart/src/chart-spec.ts requires type, title,
  // data and altInsight; source is the furniture). Copied from the engine's own test
  // fixtures, never invented.
  const dwSpec = {
    type: "d3-lines",
    title: "Unemployment is at a five-year low",
    data: "year,value\n2018,5.1\n2023,3.7",
    source: { name: "Sample data" },
    altInsight: "The rate falls from 5.1% in 2018 to 3.7% in 2023",
  };

  it('rejects "video" BEFORE any network call, with the byte-exact legacy string', async () => {
    const r = await render({
      engine: "dw-chart",
      spec: dwSpec,
      format: "video",
      channel: "article-web",
      outDir: outDirFor("dw-video"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
    expect(r.message).toBe(
      'dw-chart cannot build format "video" — it supports "static" or ' +
        '"interactive" only (video/scrolly require chart-native)',
    );
  });

  it('map-dw rejects "scrolly" naming map-native as the engine that owns it', async () => {
    const r = await render({
      engine: "map-dw",
      spec: dwSpec,
      format: "scrolly",
      channel: "article-web",
      outDir: outDirFor("mapdw-scrolly"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toBe(
      'map-dw cannot build format "scrolly" — it supports "static" or ' +
        '"interactive" only (video/scrolly require map-native)',
    );
  });

  it("reports a spec the engine's own validator rejects as invalid-spec", async () => {
    const r = await render({
      engine: "dw-chart",
      spec: { type: "d3-lines" }, // no title, no data, no altInsight
      format: "static",
      channel: "article-web",
      outDir: outDirFor("dw-invalid"),
      id: "p1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-spec");
    expect(r.message.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: FAIL — the three new tests get `not-implemented`.

- [ ] **Step 3: Implement the in-process branch**

In `lib/core/verbs/render.ts`, replace the trailing `not-implemented` return:

```ts
// The native engine that DOES own video/scrolly for each in-process (hosted-DW) engine —
// used only to keep the format-refusal string byte-identical to the legacy messages that
// two existing test suites assert character for character.
const IN_PROCESS_NATIVE_FALLBACK: Record<string, string> = {
  "dw-chart": "chart-native",
  "map-dw": "map-native",
};

// … at the end of render():

  // FORMAT GATE FIRST — reject a format the engine cannot honor BEFORE any API call.
  if (!manifest.formats.includes(p.format))
    return fail(
      "unsupported-format",
      `${p.engine} cannot build format "${p.format}" — it supports "static" or ` +
        `"interactive" only (video/scrolly require ${IN_PROCESS_NATIVE_FALLBACK[p.engine] ?? "the native engine"})`,
    );

  // Spec-in validation at the boundary: for these engines the manifest validator IS the
  // one produceChart/produceMap run internally, so this fails a bad spec cleanly before
  // the network instead of letting the engine throw it.
  const validationErrors = manifest.validate(p.spec);
  if (validationErrors.length)
    return fail("invalid-spec", validationErrors.join("; "));

  const absOutDir = freshOutDir(p.outDir);
  // themeBg / locale are best-effort context read off the spec — unchanged from the
  // legacy dispatcher, the one place the contract peeks at an otherwise opaque spec.
  const ctx: ProduceContext = {
    channel: p.channel,
    format: p.format,
    outDir: absOutDir,
    id: p.id,
    themeBg: (p.spec as { themeBg?: string } | null)?.themeBg,
    locale: (p.spec as { lang?: string } | null)?.lang,
  };
  try {
    const artifact = await manifest.inProcess!(p.spec, ctx);
    assertDeliveredContract(artifact);
    return ok(artifact);
  } catch (e) {
    return fail("engine-failed", (e as Error).message);
  }
```

Add `type ProduceContext` to the existing import from `../contract`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/core/verbs/render.ts lib/core/verbs/render.test.ts
git commit -m "feat(verbs): render — in-process transport with the byte-exact format gate"
```

---

### Task 7: `runVerb` — the closed enum + JSON round-trip

**Files:**
- Create: `lib/core/verbs/index.ts`
- Create: `lib/core/verbs/index.test.ts`

**Interfaces:**
- Consumes: `isVerb`/`VERBS` (Task 1), `render` (Tasks 4-6), `RenderPayload`/`VerbResult` (Task 4).
- Produces: `runVerb(verb: string, payload: unknown): Promise<VerbResult<unknown>>`, and `isRenderPayload(p: unknown): p is RenderPayload`.

- [ ] **Step 1: Write the failing test**

Create `lib/core/verbs/index.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import "../../../skills/splash/src/register-producers";
import { runVerb, isRenderPayload } from "./index";
import type { RenderPayload, VerbResult } from "./types";

const payload: RenderPayload = {
  engine: "chart-native",
  spec: { nativeType: "bar" },
  format: "static",
  channel: "article-web",
  outDir: "/tmp/splash-verb-unused",
  id: "el1",
};

describe("runVerb — the vocabulary is CLOSED (invariant I4)", () => {
  it("refuses an operation outside the enum instead of improvising", async () => {
    const r = await runVerb("fetch-data", payload);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("fetch-data");
  });

  it("answers not-implemented for a DECLARED verb with no body yet", async () => {
    for (const verb of ["capture", "review", "publish"]) {
      const r = await runVerb(verb, {});
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("unreachable");
      expect(r.code).toBe("not-implemented");
    }
  });

  it("refuses a malformed render payload as invalid-request, before any dispatch", async () => {
    const r = await runVerb("render", { engine: "chart-native" });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
  });
});

describe("isRenderPayload — shape gate", () => {
  it("accepts a well-formed payload and rejects wrong-typed fields", () => {
    expect(isRenderPayload(payload)).toBe(true);
    expect(isRenderPayload({ ...payload, format: "gif" })).toBe(false);
    expect(isRenderPayload({ ...payload, channel: 7 })).toBe(false);
    expect(isRenderPayload(null)).toBe(false);
  });
});

describe("invariant I6 — every request and result round-trips through JSON", () => {
  it("survives JSON.parse(JSON.stringify(x)) unchanged — this is what makes the CLI façade free", async () => {
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    const results: VerbResult<unknown>[] = [
      await runVerb("fetch-data", payload),
      await runVerb("capture", {}),
      await runVerb("render", { engine: "nope", ...payload, engine: "nope" }),
    ];
    for (const r of results) expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test core/verbs/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implement the dispatcher**

Create `lib/core/verbs/index.ts`:

```ts
import { isVerb, VERBS } from "../vocabulary";
import { render } from "./render";
import { fail, type RenderPayload, type VerbResult } from "./types";

export * from "./types";
export { render } from "./render";

const FORMATS = ["static", "interactive", "video", "scrolly"];
const CHANNELS = ["social-vertical", "social-feed", "article-web"];

// Shape gate for the neutral payload. Explicit rather than schema-driven: the contract
// has one payload today, and every field must be checked before anything touches the
// filesystem. `spec` is deliberately unchecked — it is OPAQUE (invariant I3).
export function isRenderPayload(p: unknown): p is RenderPayload {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.engine === "string" &&
    typeof r.outDir === "string" &&
    typeof r.id === "string" &&
    typeof r.format === "string" &&
    FORMATS.includes(r.format) &&
    typeof r.channel === "string" &&
    CHANNELS.includes(r.channel) &&
    "spec" in r
  );
}

// The single entry point of the execution contract. The verb name is checked against the
// CLOSED vocabulary: an operation outside it is refused mechanically, which is what
// "bounded verbs" means. Never throws (invariant I1).
export async function runVerb(
  verb: string,
  payload: unknown,
): Promise<VerbResult<unknown>> {
  if (!isVerb(verb))
    return fail(
      "invalid-request",
      `unknown verb "${verb}" — the contract declares ${VERBS.join(", ")}`,
    );
  if (verb !== "render")
    return fail(
      "not-implemented",
      `verb "${verb}" is declared but has no implementation yet`,
    );
  if (!isRenderPayload(payload))
    return fail(
      "invalid-request",
      "render: payload must carry engine, spec, format, channel, outDir and id",
    );
  return render(payload);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test core/verbs/index.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/core/verbs/index.ts lib/core/verbs/index.test.ts
git commit -m "feat(verbs): runVerb over the closed vocabulary + JSON round-trip invariant"
```

---

### Task 8: `realDispatch` becomes a translator

**Files:**
- Modify: `skills/splash/src/adapters.ts` (delete `dispatchFileBased`, `FileDispatchOutcome`, `subprocessConfigFor`; rewrite `realDispatch`)

**Interfaces:**
- Consumes: `render` (Tasks 4-6).
- Produces: `realDispatch` with an unchanged external signature (`Dispatch` from `./produce-all`).

The translation table — this is where the dropped policy lands:

| `VerbResult` | `DispatchResult` |
|---|---|
| `{ ok: true }` | `{ status: "produced", outputs, publicUrl, actualProducer }` |
| `code: "engine-declined"` | `{ status: "needs-fallback", reason }` ← **the native→DW policy, legacy-owned** |
| any other `code` | `{ status: "failed", error }` |

- [ ] **Step 1: Run the safety net BEFORE touching anything, and record the baseline**

Run: `cd skills/splash && bun test tests/adapters.test.ts src/adapters.test.ts scripts/produce-all-format.test.ts`
Expected: PASS. Note the pass counts — they must be identical after Step 3.

- [ ] **Step 2: Rewrite `realDispatch` as a translator**

In `skills/splash/src/adapters.ts`, delete `FileDispatchOutcome`, `dispatchFileBased`
and `subprocessConfigFor` (all now inside the verb), and replace `realDispatch`
(`:311-420`) with:

```ts
// A TRANSLATOR, not a dispatcher: AcceptedProposal → the contract's neutral RenderPayload
// → DispatchResult. Everything mechanical lives in lib/core/verbs/render.ts and is shared
// with the editorial loop. What stays HERE is legacy policy: the absent-channel default,
// the spec-level channel injection, and the native→Datawrapper fallback routing.
export const realDispatch: Dispatch = async (
  p: AcceptedProposal,
  outDir: string,
): Promise<DispatchResult> => {
  const manifest = getProducer(p.producer);
  // Spec-level channel injection applies to the hosted-DW engines ONLY (they size their
  // export off spec.channel). Native engines receive the channel as SPLASH_CHANNEL and
  // must keep the spec they were given — injecting a field would change their input.
  const spec =
    manifest?.execution === "in-process"
      ? withProposalChannel(p.spec as { channel?: string }, p.channel)
      : p.spec;

  const result = await render({
    engine: p.producer,
    spec,
    format: p.format,
    channel: p.channel ?? DEFAULT_CHANNEL,
    outDir,
    id: p.id,
  });

  if (result.ok)
    return {
      status: "produced",
      outputs: result.value.files,
      publicUrl: result.value.publicUrl,
      actualProducer: p.producer,
    };
  // The engine declined THIS spec — the legacy flow's answer is the Datawrapper fallback.
  // That decision lives here, not in the contract.
  if (result.code === "engine-declined")
    return { status: "needs-fallback", reason: result.message };
  return { status: "failed", error: result.message };
};
```

Add `import { render } from "../../../lib/core/verbs";` and keep the existing
`getProducer` import.

- [ ] **Step 3: Run the safety net to verify it is green UNCHANGED**

Run: `cd skills/splash && bun test tests/adapters.test.ts src/adapters.test.ts scripts/produce-all-format.test.ts`
Expected: PASS with the **same counts** as Step 1, with **zero edits** to those three
files. If any assertion fails, the hoist changed behavior — fix `render`, never the test.

- [ ] **Step 4: Run the whole gate**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/adapters.ts
git commit -m "refactor(splash): realDispatch becomes a translator over the render verb"
```

---

### Task 9: The editorial loop calls the verb

**Files:**
- Modify: `lib/loop/produce.ts`
- Modify: `lib/loop/driver.ts`
- Modify: `lib/loop/produce.test.ts:53,114`
- Modify: `lib/loop/driver.test.ts:29,49,65,79,100,114,124,177`
- Modify: `lib/loop/acceptance.test.ts` (every `advance(` call site)

**Interfaces:**
- Consumes: `render` (Tasks 4-6).
- Produces:
  - `produce(run: RunManifest, el: RunElement, runDir: string): Promise<VerbResult<RunElement>>`
  - `advance(run: RunManifest, runDir: string): Promise<RunManifest>`

`render` is async (the in-process transport awaits a network call), so `produce` and
`advance` become async. That is the ripple: **9 `advance(` call sites and 3 `produce(`
call sites** get `await`, and their enclosing `test(` callbacks become `async`.

- [ ] **Step 1: Write the failing test**

Add to `lib/loop/produce.test.ts`:

```ts
test("produce goes through the verb contract — no engine path of its own", async () => {
  const src = readFileSync(join(import.meta.dir, "produce.ts"), "utf8");
  expect(src).not.toContain("execFileSync");
  expect(src).not.toContain("skills");
  expect(src).toContain("render(");
});

test("a refused render becomes a typed failure, not a throw", async () => {
  // Build the run exactly as the existing happy-path test does (produce.test.ts:14-66),
  // then point the chosen option at a type chart-native cannot map: the engine declines,
  // and produce REPORTS it instead of throwing.
  const { run, runDir } = makeBrokenRun();
  const r = await produce(run, run.elements[0], runDir);
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("unreachable");
  expect(["engine-declined", "engine-failed"]).toContain(r.code);
}, 120_000);
```

`makeBrokenRun()` already exists at `produce.test.ts:67-107` — it builds a run whose spec
the engine rejects. Reuse it; do not invent a second fixture.

**One existing test in this file becomes false by construction.**
`produce.test.ts:108` is named *"produce throws a descriptive error and the caller can log
a bounded failure event without advancing"* and asserts a throw. `produce` no longer
throws — that IS the change. Rewrite that test (do not delete it: its guarantee still
matters) to assert the same outcome in the new shape:

```ts
test("produce returns a descriptive typed failure and the caller logs a bounded event without advancing", async () => {
  const { run, runDir } = makeBrokenRun();
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message.length).toBeGreaterThan(0);
  // The element is untouched: a failure never advances state.
  expect(run.elements[0].artifact).toBeUndefined();
});
```

Keep every other assertion of that test as it was.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test loop/produce.test.ts`
Expected: FAIL — `produce.ts` still contains `execFileSync`, and `produce` is not async.

- [ ] **Step 3: Rewrite `lib/loop/produce.ts` on the verb**

Keep the NativeSpec assembly exactly as it is; replace the transport:

```ts
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, render, type VerbResult } from "../core/verbs";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";

// The décor is stubbed until the SETUP/preflight sub-project exists: every element of
// this tranche renders for the web-article channel. Documented as a stub, not a default
// buried in a call — the contract requires a RESOLVED channel (no ambient env, I5).
const STUBBED_CHANNEL = "article-web" as const;

export async function produce(
  run: RunManifest,
  el: RunElement,
  runDir: string,
): Promise<VerbResult<RunElement>> {
  if (!el.angle || !el.proposal?.chosenId)
    return fail("invalid-request", "produce: need an angle and a chosen form");
  if (!run.input.data)
    return fail("invalid-request", "produce: no frozen data input");
  const chosen = el.proposal.options.find((o) => o.id === el.proposal!.chosenId);
  if (!chosen)
    return fail(
      "invalid-request",
      `produce: no option with id ${el.proposal.chosenId}`,
    );

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

  const result = await render({
    engine: "chart-native",
    spec: nativeSpec,
    format: "static",
    channel: STUBBED_CHANNEL,
    outDir: join(runDir, "elements", el.id),
    id: el.id,
  });
  if (!result.ok) return result;

  const artifactPath = result.value.files.find((f) => f.endsWith("static.png"));
  if (!artifactPath)
    return fail("engine-failed", "produce: no static.png in the delivery");
  const artifactBytes = readFileSync(artifactPath);

  return ok({
    ...el,
    artifact: {
      path: relative(runDir, artifactPath),
      sha256: Buffer.from(sha256(artifactBytes)).toString("hex"),
      provenanceHash: provenanceHash(run, el),
      producedAt: new Date().toISOString(),
    },
  });
}
```

- [ ] **Step 4: Rewrite the driver's produce arm without `try/catch`**

In `lib/loop/driver.ts`, make `advance` async and replace the `produce` case
(`:24-37`):

```ts
export async function advance(
  run: RunManifest,
  runDir: string,
): Promise<RunManifest> {
  // …
    case "produce": {
      const result = await produce(run, run.elements[0], runDir);
      if (result.ok)
        return { ...run, elements: [result.value, ...run.elements.slice(1)] };
      // A refusal is DATA now, not an exception: the verb never throws, so the driver
      // records the bounded failure event directly.
      return appendEvent(run, {
        at: new Date().toISOString(),
        kind: "failure",
        elementId: run.elements[0].id,
        action: "produce",
        message: result.message.slice(0, 200),
      });
    }
  // …
}
```

- [ ] **Step 5: Await every call site**

In `lib/loop/driver.test.ts` (`:29,49,65,79,100,114,124,177`), `lib/loop/produce.test.ts`
(`:53,114`) and `lib/loop/acceptance.test.ts`, prefix every `advance(` and `produce(`
call with `await` and mark the enclosing `test(`/`it(` callbacks `async`.

**Change nothing else.** The only assertion that may change is the throw→result rewrite
of `produce.test.ts:108` specified in Step 1 — everything else must stay identical,
because the behavior must not change. In particular `driver.test.ts:137` ("records a
produce failure as a bounded event without advancing state") must pass **with its
assertions untouched**: the driver still records exactly the same event, it just reads a
result instead of catching an exception.

- [ ] **Step 6: Run the loop suite to verify it passes**

Run: `cd lib && bun test loop/`
Expected: PASS — every pre-existing loop test still green, plus the two new ones.

- [ ] **Step 7: Commit**

```bash
git add lib/loop/produce.ts lib/loop/driver.ts lib/loop/produce.test.ts lib/loop/driver.test.ts lib/loop/acceptance.test.ts
git commit -m "refactor(loop): produce goes through the render verb, failures become data"
```

---

### Task 10: The two-transport proof + full gate

**Files:**
- Create: `lib/core/verbs/two-transport.test.ts`

**Interfaces:**
- Consumes: `runVerb` (Task 7).
- Produces: nothing — this is the proof that closes the tranche.

This is success criterion ③: **one call site drives both engines, the caller never
learning the transport.** The Datawrapper leg hits the real API (project convention: no
mocking external APIs) and self-skips without a token, capped at **one** chart.

- [ ] **Step 1: Write the failing test**

Create `lib/core/verbs/two-transport.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../skills/splash/src/register-producers";
import { runVerb } from "./index";
import type { DeliveredArtifact } from "../contract";

// ONE call site. The engine key is data; the transport (subprocess vs in-process) is the
// registry's business and never the caller's.
async function renderVia(engine: string, spec: unknown, format: string) {
  return runVerb("render", {
    engine,
    spec,
    format,
    channel: "article-web",
    outDir: join(mkdtempSync(join(tmpdir(), `two-transport-${engine}-`)), "el1"),
    id: "el1",
  });
}

const CSV = "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n";

describe("one verb, two transports — the abstraction is not a one-off", () => {
  it("renders through the SUBPROCESS transport (chart-native, network-free)", async () => {
    const r = await renderVia(
      "chart-native",
      {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the three cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: CSV,
      },
      "static",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    const a = r.value as DeliveredArtifact;
    expect(a.form).toBe("file");
    expect(readFileSync(a.files.find((f) => f.endsWith("static.png"))!).length)
      .toBeGreaterThan(1000);
  }, 300_000);
});

// Live: the IN-PROCESS transport hits the real Datawrapper API. One chart only.
const d = process.env.DATAWRAPPER_API_TOKEN ? describe : describe.skip;

d("one verb, two transports — the in-process leg (live)", () => {
  it("renders through the IN-PROCESS transport (dw-chart) via the same call", async () => {
    const r = await renderVia(
      "dw-chart",
      {
        // The real ChartSpec shape — see skills/dw-chart/tests/highlight.test.ts:31-43.
        type: "d3-bars",
        title: "Rents rose fastest in Geneva",
        data: CSV,
        source: { name: "Provided by the newsroom" },
        altInsight: "Geneva leads the three cantons on rent growth.",
      },
      "static",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.message);
    const a = r.value as DeliveredArtifact;
    expect(a.format).toBe("static");
    expect(a.files.length).toBeGreaterThan(0);
  }, 180_000);
});
```

- [ ] **Step 2: Run the test**

Run: `cd lib && bun test core/verbs/two-transport.test.ts`
Expected: PASS. Without `DATAWRAPPER_API_TOKEN` the live block reports as skipped — that
is the project's standing convention, not a failure.

If the dw-chart leg reports `invalid-spec`, read the exact required fields from
`skills/dw-chart/src/chart-spec.ts` (`validateChartSpec` — `type`, `title`, `data`,
`altInsight` are required; `baseColor`, if present, must be an Okabe-Ito colour) and
correct the fixture. Never weaken the assertion to make it pass.

- [ ] **Step 3: Verify success criteria ① and ② mechanically**

Run:

```bash
grep -c "execFileSync\|skills" lib/loop/produce.ts
```

Expected: `0`.

Run: `cd skills/splash && git diff --stat HEAD~3 -- tests/adapters.test.ts src/adapters.test.ts scripts/produce-all-format.test.ts`
Expected: empty — the safety net was never edited.

- [ ] **Step 4: Run the full gate**

Run: `bun run check`
Expected: PASS, all checks green.

- [ ] **Step 5: Commit**

```bash
git add lib/core/verbs/two-transport.test.ts
git commit -m "test(verbs): one call site renders through both transports"
```

---

## Definition of Done

1. `lib/loop/produce.ts` holds no `execFileSync` and no `skills/` path — one `render` call.
2. `realDispatch` is a translator, and `skills/splash/tests/adapters.test.ts`,
   `skills/splash/src/adapters.test.ts`, `skills/splash/scripts/produce-all-format.test.ts`
   pass **unedited**.
3. The same call site renders chart-native (subprocess) and dw-chart (in-process).
4. Every request and result round-trips through JSON (Task 7).
5. `bun run check` green.

## Finding to report back (the de-risk purpose)

If the neutral payload proved insufficient — if any `AcceptedProposal` field had to be
smuggled back into `RenderPayload` to keep the legacy green — record it. Per spec §4.3
that is a finding that reshapes B2 **before** any surface is exposed to Goose.

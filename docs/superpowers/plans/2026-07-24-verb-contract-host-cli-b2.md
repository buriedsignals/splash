# Verb Contract — B2 (host seam: the CLI façade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a JSON-in/JSON-out CLI façade over the verb contract, so a host that is not JavaScript — Goose, a shell recipe, a local model driven by a script — can read the run's state, ask what is valid next, and execute a verb, without importing anything.

**Architecture:** A neutral core in `lib/host/` (pure functions returning JSON-serializable objects, never throwing) plus one `cli.ts` entry that parses argv, reads a JSON request on stdin, prints JSON on stdout, and exits with a stable code. It invents nothing: `state` and `next` dress `lib/loop/`'s existing `resumeReport`/`nextActions`, and `verb` calls `runVerb` from `lib/core/verbs/`. Three prerequisites recorded by B1 are closed first (Tasks 1–2) because a host has none of the upstream gates the legacy orchestrator sits behind.

**Tech Stack:** Bun · TypeScript · `bun:test` · the verb contract delivered by B1 (`lib/core/verbs/`).

**Spec:** `docs/superpowers/specs/2026-07-24-verb-contract-adapters-design.md` §4 (design) and §4.4 (what B1 revealed).
**B1 execution record (the parked findings this plan absorbs):** `.superpowers/sdd/2026-07-24-verb-contract-adapters-b1/progress.md`.

## Design decisions taken when writing this plan (deviations from §4.2, with reasons)

1. **`splash verb <name>` takes NO `--run` flag.** §4.2 sketched `splash verb <name> --run <dir> < req`. B1 proved the payload is neutral and self-sufficient — it carries its own `outDir` — so handing the verb a run directory would re-couple the contract to the editorial loop, undoing invariant I2. `state` and `next` keep `--run`; `verb` reads its whole request from stdin.
2. **The format gate closes without unfreezing B1's regression net.** The frozen assertion (`skills/splash/tests/adapters.test.ts:396-401`) requires `status: "failed"` and the engine's own v1 message. A pre-dispatch `unsupported-format` still maps to `failed` in the translator, so the only requirement is that the refusal *message* stays the engine's. The manifest therefore declares its own refusal message. No production declaration is widened and no frozen test is edited.
3. **The never-throw invariant moves INTO `render`.** B1's final review noted the loop calls `render()` directly and so sits outside `runVerb`'s boundary catch. Making the loop call `runVerb` would cost it its typing (`VerbResult<unknown>`). Wrapping `render`'s own body instead makes the invariant structural at *both* entry points with no loss of type information.

## Global Constraints

- Runtime **Bun**; tests `bun:test` (`describe`/`it`/`expect`). **TDD** — failing test before implementation, every task.
- Code, comments, identifiers, filenames, commit messages: **English**.
- **No vendor mention** (Claude/Anthropic) in any committed artifact. **No `Co-Authored-By` trailer.**
- **No new `any`.** No mocking of external APIs — real keys, real failures (Datawrapper tests self-skip without `DATAWRAPPER_API_TOKEN`).
- Gate `bun run check` green before every commit. Run it in the **foreground** (Bash `timeout: 600000`); never background it.
- `skills/image-native` `tests/produce.test.ts` is a **known flaky** test unrelated to this work — if it fails, re-run it in isolation to confirm the flake and say so.
- **The verb contract's invariants bind every change here:** a verb never throws (I1) · the payload is neutral (I2) · the engine spec is opaque (I3) · the verb vocabulary is a closed enum (I4) · no ambient state — the contract never reads `process.env` (I5) · every request and result survives a JSON round trip, asserted with `toStrictEqual` (I6) · verbs exchange **paths, never bytes** (I7).
- **Never hand-duplicate the vocabulary.** Formats, channels, verbs and error codes come from `lib/core/vocabulary.ts` / `lib/core/verbs/types.ts`, never from a local literal list. B1 had to fix exactly this drift once.
- Branch `feat/verb-host-cli` off `feat/verb-contract-adapters`, in its own worktree (sibling-directory pattern, worktree named after the branch).

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `skills/image-native/src/format-support.ts` | The single source of image-native's v1 refusal message | Create |
| `skills/image-native/scripts/produce.mjs:32-36` | Imports that constant instead of holding its own copy | Modify |
| `skills/image-native/src/manifest.ts` | Declares `unsupportedFormatMessage` | Modify |
| `lib/core/registry.ts` | `ProducerManifest` gains optional `unsupportedFormatMessage` | Modify |
| `lib/core/verbs/render.ts` | Format gate covers both transports; body wrapped for I1 | Modify |
| `lib/loop/driver.ts:43-47` | `readData` guarded — a missing frozen input is an event, not a throw | Modify |
| `lib/core/verbs/types.ts` | `VERB_ERROR_CODES` const array; `VerbErrorCode` derived from it | Modify |
| `lib/host/capabilities.ts` | `capabilities()` — the machine-readable contract declaration | Create |
| `lib/host/state.ts` | `describeState(runDir)` / `describeNext(runDir)` — never throw | Create |
| `lib/host/cli.ts` | argv parsing, the four commands, stdin JSON, stable exit codes | Create |
| `lib/host/*.test.ts` | Per-unit tests, colocated (matches `lib/core` convention) | Create |

**The host's shared response envelope** (used by every command, JSON-serializable by construction):

```ts
// lib/host/types.ts is NOT a separate file — this type lives in lib/host/state.ts and is
// re-exported by cli.ts. Keeping it beside its only producers avoids a one-type module.
export type HostResponse =
  | { ok: true; value: unknown }
  | { ok: false; code: string; message: string };
```

`verb` returns the `VerbResult` verbatim (it already has this shape). `state`, `next` and `verbs` produce the same envelope so a host parses one shape for everything.

---

### Task 1: The format gate covers both transports

**Files:**
- Create: `skills/image-native/src/format-support.ts`
- Modify: `skills/image-native/scripts/produce.mjs:32-36`
- Modify: `skills/image-native/src/manifest.ts`
- Modify: `lib/core/registry.ts` (the `ProducerManifest` interface)
- Modify: `lib/core/verbs/render.ts` (the gate + its `KNOWN GAP` comment)
- Test: `lib/core/verbs/render.test.ts`

**Interfaces:**
- Consumes: `getProducer` from `lib/core/registry`; `fail` from `lib/core/verbs/types`.
- Produces: `ProducerManifest.unsupportedFormatMessage?: string`; `IMAGE_NATIVE_V1_FORMAT_MESSAGE` from `skills/image-native/src/format-support.ts`.

**Why this is first:** the legacy orchestrator sits behind `produce-all`'s upstream gates and the editorial loop only ever asks `chart-native` for `static`, so today the gap is invisible. A CLI host has no upstream gate at all — it would receive `engine-failed` plus a 30-line stderr dump where the contract promises `unsupported-format`. Closing it is a prerequisite of the façade, not a cleanup.

- [ ] **Step 1: Write the failing test**

Append to `lib/core/verbs/render.test.ts`:

```ts
describe("the format gate covers BOTH transports", () => {
  it("refuses a format a subprocess engine does not declare, before spawning anything", async () => {
    // chart-native declares static/interactive/video; scrolly belongs to the scrolly engine.
    const r = await render({
      engine: "chart-native",
      spec: { nativeType: "bar" },
      format: "scrolly",
      channel: "article-web",
      outDir: outDirFor("subprocess-unsupported"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
  });

  it("uses the engine's OWN refusal message when its manifest declares one", async () => {
    // image-native ships "scrolly" only in v1 and says so in its own words. The contract
    // must not replace a message a journalist may already have seen with a generic one.
    const r = await render({
      engine: "image-native",
      spec: { frames: [] },
      format: "static",
      channel: "article-web",
      outDir: outDirFor("image-native-v1"),
      id: "el1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("unsupported-format");
    expect(r.message).toContain('image-native builds "scrolly" only in v1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: both FAIL — today the subprocess branch reaches the engine CLI and comes back `engine-failed`.

- [ ] **Step 3: Give image-native's refusal message one source**

Create `skills/image-native/src/format-support.ts`:

```ts
// image-native ships "scrolly" ONLY in v1 (2026-07-16 decision — narrower than the spec's
// static+video+scrolly grid). The refusal a journalist sees lives HERE, once, because two
// callers need the same words: the engine's own CLI (scripts/produce.mjs, which refuses a
// non-scrolly format itself) and the manifest, which hands it to the verb contract's
// pre-dispatch format gate so the contract refuses in the engine's voice instead of a
// generic one.
export const IMAGE_NATIVE_V1_FORMAT_MESSAGE =
  'image-native builds "scrolly" only in v1 — static/video are follow-ups';
```

In `skills/image-native/scripts/produce.mjs`, add to the existing import block (the file already imports from `../src/image-story.ts`, so importing TypeScript from this script is an established pattern here):

```js
import { IMAGE_NATIVE_V1_FORMAT_MESSAGE } from "../src/format-support.ts";
```

and replace the literal at `:32-36`:

```js
if (format !== "scrolly") {
  console.error(IMAGE_NATIVE_V1_FORMAT_MESSAGE);
  process.exit(1);
}
```

- [ ] **Step 4: Let a manifest declare its own refusal**

In `lib/core/registry.ts`, add to the `ProducerManifest` interface, right after `formats`:

```ts
  // The refusal this engine wants a caller to see when it is asked for a format it does
  // not declare. Optional: without it the contract composes a generic message. It exists
  // so a pre-dispatch gate does not silently replace wording a journalist may already
  // know from the engine's own CLI (image-native's v1 message is the live case).
  unsupportedFormatMessage?: string;
```

In `skills/image-native/src/manifest.ts`, import the constant and declare it in the `registerProducer` call, directly after `formats`:

```ts
import { IMAGE_NATIVE_V1_FORMAT_MESSAGE } from "./format-support";
// …
  unsupportedFormatMessage: IMAGE_NATIVE_V1_FORMAT_MESSAGE,
```

- [ ] **Step 5: Extend the gate to both transports**

In `lib/core/verbs/render.ts`, replace the whole `KNOWN GAP` comment block and the gate's condition. Delete the `execution === "in-process"` conjunct, and keep the in-process message **byte-identical** (two frozen suites assert it character for character):

```ts
  // FORMAT GATE — runs BEFORE the transport branch, from registry data alone, so no
  // process is spawned and no API is called for a format the engine cannot honor. It
  // covers BOTH transports: a host driving this contract directly (the CLI façade) has
  // none of the upstream gates the legacy orchestrator sits behind, so this is the only
  // place an undeclared format is caught.
  // `formats` is read defensively: a malformed manifest (no formats array) must not throw
  // a TypeError out of a verb (I1) — it declares nothing, so it supports nothing.
  // An engine may declare its own refusal wording (unsupportedFormatMessage); the contract
  // uses it rather than replacing words a journalist may already know from that engine's
  // own CLI. The in-process default message is byte-frozen by two legacy suites.
  const declared: readonly string[] = Array.isArray(manifest.formats)
    ? manifest.formats
    : [];
  if (!declared.includes(p.format))
    return fail(
      "unsupported-format",
      manifest.unsupportedFormatMessage ??
        (manifest.execution === "in-process"
          ? `${p.engine} cannot build format "${p.format}" — it supports "static" or ` +
            `"interactive" only (video/scrolly require ${IN_PROCESS_NATIVE_FALLBACK[p.engine] ?? "the native engine"})`
          : `${p.engine} cannot build format "${p.format}" — it declares ${declared.length ? declared.map((f) => `"${f}"`).join(", ") : "no formats"}`),
    );
```

- [ ] **Step 6: Run the tests to verify they pass — including the frozen net**

Run: `cd lib && bun test core/verbs/render.test.ts`
Expected: PASS.

Run: `cd skills/splash && bun test tests/adapters.test.ts src/adapters.test.ts scripts/produce-all-format.test.ts`
Expected: PASS with the three files **unedited**. `tests/adapters.test.ts:396-401` asserts `status: "failed"` plus image-native's v1 message — the gate now refuses earlier, but with the engine's own words, so the assertion still holds. **If it fails, fix the message plumbing — never the test.**

Run: `cd skills/image-native && bun test`
Expected: PASS — `tests/produce.test.ts:96` asserts the same string that now comes from the shared constant.

- [ ] **Step 7: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add skills/image-native/src/format-support.ts skills/image-native/scripts/produce.mjs skills/image-native/src/manifest.ts lib/core/registry.ts lib/core/verbs/render.ts lib/core/verbs/render.test.ts
git commit -m "fix(verbs): the format gate covers both transports, in the engine's own words"
```

---

### Task 2: The never-throw invariant becomes structural in `render`, and the loop's last unguarded read

**Files:**
- Modify: `lib/core/verbs/render.ts` (wrap the body)
- Modify: `lib/loop/driver.ts:43-47` (`readData`)
- Test: `lib/core/verbs/render.test.ts`, `lib/loop/driver.test.ts`

**Interfaces:**
- Consumes: `fail` from `lib/core/verbs/types`; `appendEvent` from `lib/loop/manifest`.
- Produces: no signature change — `render` and `advance` keep their existing types.

**Why:** B1's final review found the loop calls `render()` directly, so it sits outside `runVerb`'s boundary catch — and that catch's own justification was that never-throw must be structural rather than audited. It also found `readData` still throws `ENOENT` out of `advance()` when the frozen input is missing and the next action is `orient` (the `produce` step was guarded, the `orient` step was not).

- [ ] **Step 1: Write the failing tests**

Append to `lib/core/verbs/render.test.ts`:

```ts
it("returns rather than throws even when a registered manifest is hostile (I1 is structural)", async () => {
  // The hostile member must be one `registerProducer` itself never reads, or the throw
  // fires at registration instead of inside render and the test proves nothing.
  // registerProducer reads name / execution / subprocess / inProcess; it never reads
  // unsupportedFormatMessage, which the format gate reads on the refusal path.
  const { registerProducer } = await import("../registry");
  registerProducer({
    name: "hostile-message-engine",
    formats: ["static"],
    validate: () => [],
    execution: "subprocess",
    subprocess: { scriptPath: "/nonexistent", skillDir: "/tmp", threadsChannel: false },
    get unsupportedFormatMessage(): string {
      throw new Error("hostile manifest");
    },
  });
  // Ask for a format it does not declare → the gate fires → it reads the throwing member.
  const r = await render({
    engine: "hostile-message-engine",
    spec: {},
    format: "video",
    channel: "article-web",
    outDir: outDirFor("hostile"),
    id: "el1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("unreachable");
  expect(r.code).toBe("engine-failed");
  expect(r.message).toContain("hostile manifest");
});
```

Append to `lib/loop/driver.test.ts`:

```ts
test("a missing frozen input at the orient step is a bounded event, not a throw", async () => {
  // Same guarantee the produce step already has. Build a run whose frozen data file has
  // been removed, with NO orient yet so nextActions() routes to `orient`.
  const { run, runDir } = makeRunMissingFrozenInput();
  const after = await advance(run, runDir);
  expect(after.orient).toBeUndefined();
  const failures = after.events.filter((e) => e.kind === "failure");
  expect(failures).toHaveLength(1);
  expect(failures[0].action).toBe("orient");
  expect(failures[0].message).toMatch(/ENOENT|cannot read/i);
});
```

Add `makeRunMissingFrozenInput()` as a local helper in that file. The imports it needs (`mkdtempSync`, `writeFileSync`, `rmSync`, `tmpdir`, `join`, `freezeInput`, `RunManifest`) are already at the top of `driver.test.ts`:

```ts
// A run whose frozen input is referenced by the manifest but gone from disk — the shape a
// run takes when its directory is moved, restored partially, or hand-edited. No orient
// yet, so nextActions() routes to `orient`.
function makeRunMissingFrozenInput(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-missing-input-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const data = freezeInput(runDir, src, "data");
  rmSync(join(runDir, data.path)); // the manifest still points at it
  return {
    run: {
      runId: "missing-input",
      schemaVersion: 2,
      input: { data },
      elements: [{ id: "e1" }],
      events: [],
    },
    runDir,
  };
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test core/verbs/render.test.ts loop/driver.test.ts`
Expected: both FAIL — the hostile manifest escapes as a rejection, and `advance()` throws `ENOENT`.

- [ ] **Step 3: Wrap `render`'s body**

In `lib/core/verbs/render.ts`, wrap the entire function body in one `try`/`catch`, mirroring the shape already in `lib/core/verbs/index.ts`:

```ts
export async function render(
  p: RenderPayload,
): Promise<VerbResult<DeliveredArtifact>> {
  // The whole body sits inside one try/catch. Each path below already guards itself, but
  // render() is a PUBLIC entry point of the contract — the editorial loop calls it
  // directly, and typed, rather than going through runVerb's `unknown`-valued result. The
  // invariant therefore has to be structural HERE too, not only at runVerb's boundary,
  // or the loop would sit outside it.
  try {
    // … existing body unchanged …
  } catch (e) {
    return fail("engine-failed", (e as Error)?.message ?? String(e));
  }
}
```

Do not change any existing guard inside the body — they produce specific, better codes than the catch-all.

- [ ] **Step 4: Guard the loop's last unguarded read**

In `lib/loop/driver.ts`, `readData` currently throws. Change the `orient` arm so a missing or unreadable frozen input becomes a bounded failure event instead, exactly as the `produce` arm does:

```ts
    case "orient": {
      let data: string;
      try {
        data = readData(run, runDir);
      } catch (e) {
        return appendEvent(run, {
          at: new Date().toISOString(),
          kind: "failure",
          elementId: run.elements[0].id,
          action: "orient",
          message: (e as Error).message.slice(0, 200),
        });
      }
      return { ...run, orient: orient(data) };
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd lib && bun test core/verbs/render.test.ts loop/driver.test.ts loop/`
Expected: PASS — every pre-existing loop test still green, plus the two new ones.

- [ ] **Step 6: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add lib/core/verbs/render.ts lib/core/verbs/render.test.ts lib/loop/driver.ts lib/loop/driver.test.ts
git commit -m "fix(verbs,loop): never-throw becomes structural at render, orient guards its input"
```

---

### Task 3: The contract declares itself

**Files:**
- Modify: `lib/core/verbs/types.ts`
- Create: `lib/host/capabilities.ts`
- Test: `lib/host/capabilities.test.ts`

**Interfaces:**
- Consumes: `VERBS`, `VISUAL_FORMATS`, `CHANNELS` from `lib/core/vocabulary`.
- Produces:
  - `VERB_ERROR_CODES: readonly VerbErrorCode[]` from `lib/core/verbs/types`
  - `capabilities(): Capabilities` from `lib/host/capabilities`, where

```ts
export type Capabilities = {
  contract: "splash-verbs/1";
  verbs: { name: string; implemented: boolean; payload?: PayloadField[] }[];
  vocabulary: { formats: readonly string[]; channels: readonly string[] };
  errorCodes: readonly string[];
};
export type PayloadField = { name: string; type: string; required: boolean; enum?: readonly string[] };
```

**Why:** this is what makes a host able to discover the contract instead of hard-coding it — and it is what would let an MCP wrapper generate its tools mechanically later, which is the reason §4.1 chose a CLI now without closing that door.

- [ ] **Step 1: Write the failing test**

Create `lib/host/capabilities.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { capabilities } from "./capabilities";
import { VERBS, VISUAL_FORMATS, CHANNELS } from "../core/vocabulary";
import { VERB_ERROR_CODES } from "../core/verbs/types";

describe("capabilities — the contract describes itself", () => {
  it("declares every verb in the closed vocabulary, and which have bodies", () => {
    const c = capabilities();
    expect(c.verbs.map((v) => v.name)).toEqual([...VERBS]);
    expect(c.verbs.filter((v) => v.implemented).map((v) => v.name)).toEqual(["render"]);
  });

  it("derives its enumerations from the vocabulary — never a local copy", () => {
    const c = capabilities();
    expect(c.vocabulary.formats).toEqual([...VISUAL_FORMATS]);
    expect(c.vocabulary.channels).toEqual([...CHANNELS]);
    expect(c.errorCodes).toEqual([...VERB_ERROR_CODES]);
  });

  it("describes render's payload, with the enums a host must respect", () => {
    const render = capabilities().verbs.find((v) => v.name === "render")!;
    const byName = Object.fromEntries((render.payload ?? []).map((f) => [f.name, f]));
    expect(Object.keys(byName).sort()).toEqual(
      ["channel", "engine", "format", "id", "outDir", "spec"].sort(),
    );
    expect(byName.format.enum).toEqual([...VISUAL_FORMATS]);
    expect(byName.channel.enum).toEqual([...CHANNELS]);
    // spec is OPAQUE by contract (I3) — declared, never described.
    expect(byName.spec.type).toBe("unknown");
  });

  it("is JSON-serializable without loss (I6)", () => {
    const c = capabilities();
    expect(JSON.parse(JSON.stringify(c))).toStrictEqual(c);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test host/capabilities.test.ts`
Expected: FAIL — `Cannot find module './capabilities'`.

- [ ] **Step 3: Give the error codes a const array**

In `lib/core/verbs/types.ts`, replace the hand-written `VerbErrorCode` union with a const array plus a derived union, exactly the way `lib/core/vocabulary.ts` already derives `Verb` from `VERBS` (the comments on each code stay):

```ts
export const VERB_ERROR_CODES = [
  "invalid-request", // verb outside the enum, or a malformed payload
  "unknown-engine", // no manifest registered under this key
  "unsupported-format", // the engine does not declare this format
  "invalid-spec", // the engine's validator returned errors
  "engine-declined", // the engine refuses THIS spec (chart-native exit 2)
  "engine-failed", // non-zero execution, or a broken delivery
  "not-implemented", // declared verb, no body yet
] as const;

export type VerbErrorCode = (typeof VERB_ERROR_CODES)[number];
```

- [ ] **Step 4: Write the declaration**

Create `lib/host/capabilities.ts`:

```ts
import { CHANNELS, VERBS, VISUAL_FORMATS } from "../core/vocabulary";
import { VERB_ERROR_CODES } from "../core/verbs/types";

export type PayloadField = {
  name: string;
  type: string;
  required: boolean;
  enum?: readonly string[];
};

export type Capabilities = {
  contract: "splash-verbs/1";
  verbs: { name: string; implemented: boolean; payload?: PayloadField[] }[];
  vocabulary: { formats: readonly string[]; channels: readonly string[] };
  errorCodes: readonly string[];
};

// Verbs with a body today. The vocabulary is CLOSED and declared in full — a host must be
// able to see that `capture`/`review`/`publish` exist and are not callable yet, rather
// than discovering it as an error.
const IMPLEMENTED = new Set<string>(["render"]);

const RENDER_PAYLOAD: PayloadField[] = [
  { name: "engine", type: "string", required: true },
  // OPAQUE by contract (I3): only the engine's own validator understands it, so the
  // declaration says it exists and stops there.
  { name: "spec", type: "unknown", required: true },
  { name: "format", type: "string", required: true, enum: VISUAL_FORMATS },
  { name: "channel", type: "string", required: true, enum: CHANNELS },
  { name: "outDir", type: "string", required: true },
  { name: "id", type: "string", required: true },
];

// The machine-readable contract. Every enumeration is DERIVED from the vocabulary, never
// re-typed here: a local copy would drift from the union the payload type is built on, and
// this declaration is exactly what a host trusts instead of reading our source.
export function capabilities(): Capabilities {
  return {
    contract: "splash-verbs/1",
    verbs: VERBS.map((name) => ({
      name,
      implemented: IMPLEMENTED.has(name),
      ...(name === "render" ? { payload: RENDER_PAYLOAD } : {}),
    })),
    vocabulary: { formats: VISUAL_FORMATS, channels: CHANNELS },
    errorCodes: VERB_ERROR_CODES,
  };
}
```

- [ ] **Step 4b: Run the test to verify it passes**

Run: `cd lib && bun test host/capabilities.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS — the `VerbErrorCode` change is type-level and must not break any consumer.

```bash
git add lib/core/verbs/types.ts lib/host/capabilities.ts lib/host/capabilities.test.ts
git commit -m "feat(host): the contract declares itself, derived from the vocabulary"
```

---

### Task 4: `state` and `next` as never-throwing host functions

**Files:**
- Create: `lib/host/state.ts`
- Test: `lib/host/state.test.ts`

**Interfaces:**
- Consumes: `readManifest`, `nextActions` from `lib/loop/manifest`; `resumeReport` from `lib/loop/resume`.
- Produces:
  - `type HostResponse = { ok: true; value: unknown } | { ok: false; code: string; message: string }`
  - `describeState(runDir: string): HostResponse`
  - `describeNext(runDir: string): HostResponse`

**Why:** §4.2 is explicit that these dress what sub-project A already wrote — they invent no state logic. Their whole job is to make an unreadable manifest a typed refusal instead of an exception, because the CLI must print JSON and exit with a code, never a stack trace.

- [ ] **Step 1: Write the failing test**

Create `lib/host/state.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeState, describeNext } from "./state";

const emptyDir = (): string => mkdtempSync(join(tmpdir(), "host-state-"));

describe("describeState / describeNext — never throw, always a typed response", () => {
  it("refuses a directory with no manifest instead of throwing", () => {
    const r = describeState(emptyDir());
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("no-run");
    expect(r.message).toContain("run.json");
  });

  it("refuses a corrupt manifest instead of throwing", () => {
    const dir = emptyDir();
    writeFileSync(join(dir, "run.json"), "{ not json");
    const r = describeState(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-run");
  });

  it("describeNext refuses the same way", () => {
    const r = describeNext(emptyDir());
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("no-run");
  });
});
```

Then add this test over a REAL run directory, built with the loop's own helpers rather than a hand-written manifest:

```ts
import { writeManifest, nextActions, type RunManifest } from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

// A real run on disk: one frozen input, one element, nothing done yet.
function makeRun(): { dir: string; run: RunManifest } {
  const dir = emptyDir();
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "host-state",
    schemaVersion: 2,
    input: { data: freezeInput(dir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return { dir, run };
}

describe("describeState / describeNext over a real run", () => {
  it("reports the run's own state and the loop's own next actions", () => {
    const { dir, run } = makeRun();

    const s = describeState(dir);
    expect(s.ok).toBe(true);
    if (!s.ok) throw new Error(s.message);
    const report = s.value as {
      runId: string;
      elements: { id: string; gateState: string; nextActions: string[] }[];
    };
    expect(report.runId).toBe("host-state");
    expect(report.elements).toHaveLength(1);
    expect(report.elements[0].id).toBe("e1");
    expect(report.elements[0].gateState.length).toBeGreaterThan(0);

    const n = describeNext(dir);
    expect(n.ok).toBe(true);
    if (!n.ok) throw new Error(n.message);
    // The host invents no routing: it reports exactly what the manifest computes.
    expect(n.value).toStrictEqual({ nextActions: nextActions(run) });

    // I6 — every host response survives a JSON round trip without loss.
    expect(JSON.parse(JSON.stringify(s))).toStrictEqual(s);
    expect(JSON.parse(JSON.stringify(n))).toStrictEqual(n);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test host/state.test.ts`
Expected: FAIL — `Cannot find module './state'`.

- [ ] **Step 3: Implement**

Create `lib/host/state.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { nextActions, readManifest, type RunManifest } from "../loop/manifest";
import { resumeReport } from "../loop/resume";

// The one response shape every host command answers with, so a host parses one thing.
// Mirrors the verb contract's VerbResult on purpose: same discipline, same reasoning —
// a host outside JavaScript has no `catch`, so a failure has to be a value.
export type HostResponse =
  | { ok: true; value: unknown }
  | { ok: false; code: string; message: string };

function loadRun(
  runDir: string,
): { run: RunManifest } | { fail: HostResponse } {
  const manifestPath = join(runDir, "run.json");
  if (!existsSync(manifestPath))
    return {
      fail: {
        ok: false,
        code: "no-run",
        message: `no run.json in ${runDir} — this directory holds no run`,
      },
    };
  try {
    return { run: readManifest(manifestPath, runDir) };
  } catch (e) {
    return {
      fail: {
        ok: false,
        code: "invalid-run",
        message: `cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`,
      },
    };
  }
}

// The run's current truth: validated hashes, derived gate state, exact next actions.
// resumeReport (sub-project A) does all the work — this only makes its failure modes into
// values and its output into a host response.
export function describeState(runDir: string): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  try {
    return { ok: true, value: resumeReport(loaded.run, runDir) };
  } catch (e) {
    return {
      ok: false,
      code: "invalid-run",
      message: (e as Error)?.message ?? String(e),
    };
  }
}

// What is valid to do next, run-level. Deliberately narrower than describeState: a host
// polling for "can I act yet" should not have to parse a whole report.
export function describeNext(runDir: string): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  try {
    return { ok: true, value: { nextActions: nextActions(loaded.run) } };
  } catch (e) {
    return {
      ok: false,
      code: "invalid-run",
      message: (e as Error)?.message ?? String(e),
    };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd lib && bun test host/state.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add lib/host/state.ts lib/host/state.test.ts
git commit -m "feat(host): state and next as never-throwing host responses"
```

---

### Task 5: The CLI façade

**Files:**
- Create: `lib/host/cli.ts`
- Test: `lib/host/cli.test.ts`

**Interfaces:**
- Consumes: `capabilities()` (Task 3); `describeState`/`describeNext`/`HostResponse` (Task 4); `runVerb` from `lib/core/verbs`; the composition root `lib/loop/engines.ts`.
- Produces: the executable surface —

```
bun lib/host/cli.ts verbs                    → Capabilities JSON        exit 0
bun lib/host/cli.ts state --run <dir>        → HostResponse JSON        exit 0 | 2
bun lib/host/cli.ts next  --run <dir>        → HostResponse JSON        exit 0 | 2
bun lib/host/cli.ts verb <name> < request    → VerbResult JSON          exit 0 | 1 | 2
```

Exit codes, stable and documented: **0** success · **1** the verb was refused (`ok:false` from the contract) · **2** usage error, unreadable input, or an unreadable run.

**The composition root matters here more than anywhere.** B1's most dangerous defect was a module that worked in tests and was dead in production, because only the test files imported the engine registrations. `cli.ts` must import `lib/loop/engines.ts` itself — Task 6 proves it in a process that imports nothing else.

- [ ] **Step 1: Write the failing test**

Create `lib/host/cli.test.ts`. Drive the CLI as a **subprocess** — that is the only way to test argv, stdin, stdout and exit codes for real:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "cli.ts");

async function run(
  args: string[],
  stdin = "",
): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

describe("the CLI façade — JSON in, JSON out, stable exit codes", () => {
  it("verbs prints the capability declaration and exits 0", async () => {
    const r = await run(["verbs"]);
    expect(r.code).toBe(0);
    const c = JSON.parse(r.out);
    expect(c.contract).toBe("splash-verbs/1");
    expect(c.verbs.map((v: { name: string }) => v.name)).toContain("render");
  });

  it("an unknown command exits 2 with a JSON error, never a stack trace", async () => {
    const r = await run(["explode"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    expect(r.err).not.toContain("at ");
  });

  it("state on a directory with no run exits 2 with a typed refusal", async () => {
    const r = await run(["state", "--run", mkdtempSync(join(tmpdir(), "cli-norun-"))]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("no-run");
  });

  it("a verb outside the closed vocabulary exits 1 with invalid-request", async () => {
    const r = await run(["verb", "fetch-data"], JSON.stringify({}));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
  });

  it("a declared but unimplemented verb exits 1 with not-implemented", async () => {
    const r = await run(["verb", "publish"], JSON.stringify({}));
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).code).toBe("not-implemented");
  });

  it("unparseable stdin exits 2, and says so as JSON", async () => {
    const r = await run(["verb", "render"], "{ not json");
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
  });

  it("stdout carries ONLY the JSON document — a host parses it whole", async () => {
    const r = await run(["verbs"]);
    expect(() => JSON.parse(r.out)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd lib && bun test host/cli.test.ts`
Expected: FAIL — `cli.ts` does not exist.

- [ ] **Step 3: Implement the façade**

Create `lib/host/cli.ts`:

```ts
// The host façade: JSON in, JSON out, stable exit codes. This is the surface a host that
// is not JavaScript drives — a shell recipe, an agent CLI, a script around a local model.
// It holds no state: the run lives in its directory, so every invocation is independent
// and the host has nothing to keep.
//
// Exit codes are part of the contract:
//   0  success
//   1  the verb was refused (a well-formed request the contract declined)
//   2  usage error, unparseable input, or an unreadable run
//
// stdout carries ONLY the JSON document, so a host can parse it whole. Anything humans
// need to read goes to stderr.
//
// The engine registrations come in through the loop's composition root: the verb contract
// dispatches from a registry that engines self-register into, and a registry nobody
// populated answers `unknown-engine` for every engine that exists. This import is the
// difference between a façade that works and one that only works inside a test file that
// happened to import the registrations itself.
import "../loop/engines";
import { runVerb } from "../core/verbs";
import { capabilities } from "./capabilities";
import { describeNext, describeState, type HostResponse } from "./state";

function emit(body: unknown, code: number): never {
  console.log(JSON.stringify(body, null, 2));
  process.exit(code);
}

function usage(message: string): never {
  emit({ ok: false, code: "usage", message }, 2);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function readStdin(): Promise<string> {
  return await new Response(Bun.stdin.stream()).text();
}

async function main(): Promise<never> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "verbs") emit(capabilities(), 0);

  if (command === "state" || command === "next") {
    const runDir = flag(rest, "--run");
    if (!runDir) usage(`${command} needs --run <dir>`);
    const r: HostResponse =
      command === "state" ? describeState(runDir) : describeNext(runDir);
    // An unreadable run is an input problem, not a refused verb: exit 2.
    emit(r, r.ok ? 0 : 2);
  }

  if (command === "verb") {
    const name = rest[0];
    if (!name) usage("verb needs a name: verb <name> < request.json");
    const raw = await readStdin();
    if (!raw.trim())
      usage("verb reads its request as JSON on stdin, and stdin was empty");
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      usage(`stdin is not valid JSON: ${(e as Error).message}`);
    }
    const result = await runVerb(name, payload);
    // A refusal is a well-formed answer, not a usage error — exit 1, print the result.
    emit(result, result.ok ? 0 : 1);
  }

  usage(
    `unknown command ${JSON.stringify(command ?? "")} — expected verbs, state, next or verb`,
  );
}

if (import.meta.main) await main();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd lib && bun test host/cli.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add lib/host/cli.ts lib/host/cli.test.ts
git commit -m "feat(host): the CLI facade — JSON in, JSON out, stable exit codes"
```

---

### Task 6: Prove the façade reaches an engine in a process that imports nothing else

**Files:**
- Create: `lib/host/wiring.test.ts`

**Interfaces:**
- Consumes: the CLI from Task 5.
- Produces: nothing — this is the guard against B1's most dangerous defect class.

**Why this is its own task:** B1 shipped a module that returned `unknown-engine` in production while its test suite was green, because only the TEST files imported the engine registrations. A test that imports `register-producers` itself would reproduce exactly that blindness. The only honest proof is a process that runs the CLI and nothing else.

- [ ] **Step 1: Write the failing test**

Create `lib/host/wiring.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// NOTE: this file deliberately imports NOTHING from the project — not the CLI, not the
// registry, not the engine registrations. It spawns the façade and reads its JSON. If the
// façade forgets its composition root, the registry is empty in that process and the
// contract answers `unknown-engine`, which is exactly the failure this test exists to
// catch. Importing anything of ours here would hide it.
const CLI = join(import.meta.dir, "cli.ts");

describe("the façade carries its own engine registrations", () => {
  it("reaches a real engine in a process that imports only the CLI", async () => {
    const outDir = join(mkdtempSync(join(tmpdir(), "host-wiring-")), "el1");
    const request = {
      engine: "chart-native",
      spec: {
        nativeType: "bar",
        title: "Rents rose fastest in Geneva",
        altInsight: "Geneva leads the three cantons on rent growth.",
        unit: "%",
        source: { name: "Provided by the newsroom" },
        format: "static",
        data: "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n",
      },
      format: "static",
      channel: "article-web",
      outDir,
      id: "el1",
    };
    const p = Bun.spawn(["bun", CLI, "verb", "render"], {
      stdin: new TextEncoder().encode(JSON.stringify(request)),
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(p.stdout).text();
    const code = await p.exited;
    const body = JSON.parse(out);
    // The precise failure this guards against: an empty registry answers unknown-engine.
    expect(body.code).not.toBe("unknown-engine");
    expect(code).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.value.files.some((f: string) => f.endsWith("static.png"))).toBe(true);
  }, 300_000);
});
```

- [ ] **Step 2: Run the test**

Run: `cd lib && bun test host/wiring.test.ts`
Expected: PASS if Task 5's `import "../loop/engines"` is present.

**Verify the test can actually fail** — a guard that cannot fail is not a guard. Temporarily comment out `import "../loop/engines";` in `cli.ts`, re-run, and confirm the test fails with `unknown-engine`. Then restore the import and re-run. Record both outcomes in your report.

- [ ] **Step 3: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add lib/host/wiring.test.ts
git commit -m "test(host): the facade reaches an engine with no test-only wiring"
```

---

### Task 7: The whole journey through the CLI, and the documented surface

**Files:**
- Create: `lib/host/journey.test.ts`
- Create: `lib/host/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing — this is the closing proof plus the surface a host reads.

- [ ] **Step 1: Write the failing test**

Create `lib/host/journey.test.ts`. Everything under test goes **through the CLI**; the loop's helpers appear only to build the run directory, which is setup, not the subject:

```ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, type RunManifest } from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: unknown }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  const body = JSON.parse(out);
  // I6, on every single response the host sees.
  expect(JSON.parse(JSON.stringify(body))).toStrictEqual(body);
  return { code, body };
}

describe("the whole journey through the façade", () => {
  it("declares itself, reports a run, renders, and the run is still readable", async () => {
    const dir = mkdtempSync(join(tmpdir(), "host-journey-"));
    const src = join(dir, "src.csv");
    writeFileSync(src, "canton,growth\nGeneva,4.1\nVaud,2.8\nBern,1.9\n");
    const run: RunManifest = {
      runId: "journey",
      schemaVersion: 2,
      input: { data: freezeInput(dir, src, "data") },
      elements: [{ id: "el1" }],
      events: [],
    };
    writeManifest(join(dir, "run.json"), run);

    // 1. The host discovers the contract.
    const verbs = await cli(["verbs"]);
    expect(verbs.code).toBe(0);
    const declared = (verbs.body as { verbs: { name: string; implemented: boolean }[] }).verbs;
    expect(declared.find((v) => v.name === "render")!.implemented).toBe(true);

    // 2. It reads where the run stands — no artifact yet.
    const before = await cli(["state", "--run", dir]);
    expect(before.code).toBe(0);
    const beforeReport = (before.body as { value: { elements: { validation: { artifact: string } }[] } }).value;
    expect(beforeReport.elements[0].validation.artifact).toBe("none");

    // 3. It executes the verb. The payload is the HOST's to build — the contract is
    //    neutral and takes no run directory.
    const outDir = join(dir, "elements", "el1");
    const rendered = await cli(
      ["verb", "render"],
      JSON.stringify({
        engine: "chart-native",
        spec: {
          nativeType: "bar",
          title: "Rents rose fastest in Geneva",
          altInsight: "Geneva leads the three cantons on rent growth.",
          unit: "%",
          source: { name: "Provided by the newsroom" },
          format: "static",
          data: readFileSync(src, "utf8"),
        },
        format: "static",
        channel: "article-web",
        outDir,
        id: "el1",
      }),
    );
    expect(rendered.code).toBe(0);
    const result = rendered.body as { ok: boolean; value: { files: string[] } };
    expect(result.ok).toBe(true);
    const png = result.value.files.find((f) => f.endsWith("static.png"))!;
    expect(readFileSync(png).length).toBeGreaterThan(1000);

    // 4. The run is untouched by the verb: the contract writes artifacts, the loop writes
    //    state. A host that renders has not silently mutated the ledger.
    const after = await cli(["state", "--run", dir]);
    expect(after.code).toBe(0);
    expect(after.body).toStrictEqual(before.body);
  }, 300_000);
});
```

- [ ] **Step 2: Run the test to verify it fails, then passes**

Run: `cd lib && bun test host/journey.test.ts`
Expected: FAIL first (the file does not exist), then PASS once written. If a step fails for a real reason, fix the façade — **never weaken an assertion**.

- [ ] **Step 3: Document the surface**

Create `lib/host/README.md`: the four commands with a real example invocation and a real example response for each (copy actual output from your test run — do not invent it), the three exit codes, the note that stdout carries only JSON, and the statement that the run directory holds all state so the host keeps nothing. Add one short section, "Why a CLI and not MCP", summarising spec §4.1: a CLI works in every host that can spawn a process, and `verbs` is what would let an MCP wrapper generate its tools mechanically later.

- [ ] **Step 4: Run the gate and commit**

Run: `bun run check` (foreground, `timeout: 600000`)
Expected: PASS.

```bash
git add lib/host/journey.test.ts lib/host/README.md
git commit -m "test(host): the whole journey through the facade, and its documented surface"
```

---

## Definition of Done

1. `bun lib/host/cli.ts verbs | state | next | verb` all answer JSON on stdout with the documented exit codes.
2. The façade reaches a real engine in a process that imports only the CLI (Task 6), and that guard is proven able to fail.
3. The format gate refuses an undeclared format on **both** transports, in the engine's own words where one is declared — with B1's three frozen legacy test files still **unedited** and green.
4. `render` and `advance` never throw: both proven by a test that drives a hostile path.
5. Every host response round-trips through JSON, asserted with `toStrictEqual`.
6. `bun run check` green.

## Findings to report back

Two things B2 is positioned to learn, and the next sub-project needs:

- **Does the four-command surface actually cover a host's needs**, or did driving the journey reveal a missing command (a `verbs --verb render` detail view, a way to list runs)? Record what was missing rather than adding it mid-plan.
- **Is `capabilities()` sufficient to generate an MCP tool definition mechanically?** §4.1 chose a CLI on the argument that it prepares an MCP wrapper rather than closing it off. If the declaration turns out to be too thin for that — no schema for `spec`, no description strings — say so, because it changes what the delivery sub-project inherits.

# Inspiration 02b-1 — Splash: the agent's search uses a connected Infoviz account when Engine has one — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Splash runs under Engine and the journalist has connected an Infoviz account in Indicator Labs, the `inspiration` skill's single command runs the search through `bsig run splash inspiration-search` (Engine injects `INFOVIZ_TOKEN`, 10 searches a day); otherwise it keeps searching anonymously. Safe to ship before Engine knows the credential.

**Architecture:** `search.mjs` stays a pure library and learns an optional Bearer `token` plus an `invalid-token` reason. A closed entry `sealed-search.mjs` (run by Engine through `run-operation.mjs`) searches with the injected token and, on `invalid-token`, runs exactly one anonymous search flagged `accountNeedsReconnect`. `managed.mjs` decides the path from `SPLASH_BSIG_PATH` and `bsig keys status INFOVIZ_TOKEN`, with the Engine launcher injected. `engine.mjs` is the only module that spawns `bsig`. The agent's command moves to `cli.mjs`, the only module wiring the real launcher, so fast-lane tests never import a spawn.

**Tech Stack:** Bun ESM `.mjs`, `bun:test` TypeScript tests.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` — Part 2b-1 (decisions D9-D11).

## Global Constraints

- Worktree `/Users/rmdms/Sites/Professional/splash/feat-inspiration`, branch `feat-inspiration`. Run every command from the worktree root. **Never push, never merge.**
- Bun only. Code, comments, copy, commit messages in English. No mention of Claude/Anthropic; commits carry no trailer of any kind.
- Credential ID: `INFOVIZ_TOKEN`. Engine operation ID: `inspiration-search`. Operation request on stdin: `{"parameters":{"query":"<subject>"}}`; sealed entry request on stdin: `{"query":"<subject>"}`.
- bsig control output is NDJSON events `{"event":"progress"|"result"|"error", ...}`; the last event is terminal. `bsig --json keys status INFOVIZ_TOKEN` → terminal `result` with `data.stored` (boolean). `bsig --json run splash inspiration-search` → terminal `result` with `data.stdout` (the runner's single JSON line).
- Path rule: `SPLASH_BSIG_PATH` unset → direct anonymous search. Set and status `stored === true` → Engine operation. Status not stored, unknown ID, non-zero exit, error event, timeout or unparseable output → direct anonymous search. Once the Engine operation has been started, a failure is reported as `engine-failed` and **no second search runs** (the operation may already have spent one).
- Timeouts: key status **20000** ms (the OS may ask the journalist to approve keychain access); operation **90000** ms.
- One request per search; `invalid-token` inside the sealed entry is the only case with a second (anonymous) request, flagged `accountNeedsReconnect: true`.
- Reconnect sentence, verbatim: `Your Infoviz account needs reconnecting: Indicator Labs → Connected services → Infoviz → Reconnect.`
- Engine-failure sentence: `Indicator Labs could not run the search (<detail>).`
- No change to `CREDENTIAL_IDS`, `CREDENTIAL_POLICIES`, `self-managed.mjs`, `legacy-env.mjs` or `.env.example` in this plan (spec 2b-2, after the Engine release).
- Skill modules import nothing outside `skills/inspiration/`. No fast-lane test spawns a process; only `engine.mjs` contains `Bun.spawn(`.
- Green gate: `bun run test:lanes` passes; `bun run test` has no failure (baseline at plan start: 2357 pass, 0 fail); `bun test skills/inspiration/test/engine.test.ts` passes.

---

### Task 0: Baseline

**Files:** none.

- [ ] **Step 1: Record the baseline**

```bash
cd /Users/rmdms/Sites/Professional/splash/feat-inspiration
git status --short
bun run test:lanes 2>&1 | tail -1
bun run test 2>&1 | tail -5
```

Expected: clean tree; `test lanes: fast 119, heavy 64, live 2` (or the current counts); fast lane 0 fail. Record the numbers in the ledger.

---

### Task 1: The search can carry an account token

**Files:**
- Modify: `skills/inspiration/scripts/search.mjs` (`searchInspiration`)
- Test: `skills/inspiration/test/search.test.ts` (append a `describe`)

**Interfaces:**
- Produces: `searchInspiration({ query, fetchFn, timeoutMs, apiBase, token = "" })`; when `token` is a non-empty string the request carries `authorization: Bearer <token>`; a 401 answer **with** a token → `{ ok: false, reason: "invalid-token" }`; a 401 without a token stays `{ ok: false, reason: "unexpected-response", status: 401 }`.

- [ ] **Step 1: Append the failing tests** to `skills/inspiration/test/search.test.ts`

```ts
describe("searchInspiration with an account token", () => {
  it("should send the token as a Bearer header", async () => {
    let headers: Record<string, string> = {};
    const fetchFn = async (_url, init) => {
      headers = init.headers;
      return answer([])();
    };
    await searchInspiration({ query: "floods", fetchFn, token: "tok-123" });
    expect(headers.authorization).toBe("Bearer tok-123");
  });

  it("should send no authorization header without a token", async () => {
    let headers: Record<string, string> = {};
    const fetchFn = async (_url, init) => {
      headers = init.headers;
      return answer([])();
    };
    await searchInspiration({ query: "floods", fetchFn });
    expect("authorization" in headers).toBe(false);
  });

  it("should report a refused token as invalid-token", async () => {
    const fetchFn = async () => new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 });
    expect(await searchInspiration({ query: "floods", fetchFn, token: "expired" })).toEqual({
      ok: false,
      reason: "invalid-token",
    });
  });

  it("should keep a 401 without a token as an unexpected response", async () => {
    const fetchFn = async () => new Response(JSON.stringify({ error: "invalid_token" }), { status: 401 });
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "unexpected-response",
      status: 401,
    });
  });
});
```

(`answer` and `searchInspiration` are already defined/imported at the top of this file.)

- [ ] **Step 2: Run to verify they fail**

Run: `bun test skills/inspiration/test/search.test.ts`
Expected: the first and third new tests FAIL (no header; `unexpected-response` instead of `invalid-token`).

- [ ] **Step 3: Implement** — in `searchInspiration`:

1. Add `token = "",` to the destructured options, after `apiBase = INFOVIZ_API,`.
2. Replace the `headers: { "content-type": "application/json", "user-agent": USER_AGENT },` line with:

```js
      headers: {
        "content-type": "application/json",
        "user-agent": USER_AGENT,
        ...(typeof token === "string" && token ? { authorization: `Bearer ${token}` } : {}),
      },
```

3. Immediately after `const body = await response.json().catch(() => null);` add:

```js
    if (response.status === 401 && typeof token === "string" && token) {
      return { ok: false, reason: "invalid-token" };
    }
```

4. In the JSDoc above `searchInspiration`, replace `Searches the gallery once for \`query\`.` with `Searches the gallery once for \`query\`, with the journalist's account when a \`token\` is given.`

- [ ] **Step 4: Run the tests**

Run: `bun test skills/inspiration/test/search.test.ts`
Expected: PASS (all previous tests plus 4 new).

- [ ] **Step 5: Mutation check** — change `response.status === 401 && ...` to `response.status === 403 && ...` → `should report a refused token as invalid-token` red; revert.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/search.mjs skills/inspiration/test/search.test.ts
git commit -m "feat(inspiration): a search can carry the journalist's Infoviz account, and says when it is refused"
```

---

### Task 2: The words for an account that needs reconnecting and for an Engine failure

**Files:**
- Modify: `skills/inspiration/scripts/format.mjs`
- Test: `skills/inspiration/test/format.test.ts` (append)

**Interfaces:**
- Consumes: reasons `invalid-token` (Task 1) and `engine-failed` with `detail` (Task 5); the flag `accountNeedsReconnect` (Task 3).
- Produces: `formatInspiration(result)` — `invalid-token` → the reconnect sentence; `engine-failed` → the Engine-failure sentence; any result with `accountNeedsReconnect: true` → the reconnect sentence, a blank line, then the normal rendering of that result.

- [ ] **Step 1: Append the failing tests** to `skills/inspiration/test/format.test.ts`

```ts
const RECONNECT = "Your Infoviz account needs reconnecting: Indicator Labs → Connected services → Infoviz → Reconnect.";

describe("formatInspiration and the Infoviz account", () => {
  it("should ask to reconnect when the token was refused", () => {
    expect(formatInspiration({ ok: false, reason: "invalid-token" })).toBe(RECONNECT);
  });

  it("should put the reconnect sentence before an anonymous list", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: 5, remaining: 4, resetsAt: null },
      accountNeedsReconnect: true,
    });
    expect(text).toBe(`${RECONNECT}\n\nNothing in the gallery for “floods”.\n\n4 of 5 searches left today.`);
  });

  it("should put the reconnect sentence before an anonymous failure", () => {
    const text = formatInspiration({
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 5, remaining: 0, resetsAt: null },
      accountNeedsReconnect: true,
    });
    expect(text).toBe(`${RECONNECT}\n\nThe gallery's daily limit is reached (5 searches a day). It resets at midnight UTC.`);
  });

  it("should say Indicator Labs could not run the search", () => {
    expect(formatInspiration({ ok: false, reason: "engine-failed", detail: "exit code 1" })).toBe(
      "Indicator Labs could not run the search (exit code 1).",
    );
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test skills/inspiration/test/format.test.ts`
Expected: the 4 new tests FAIL.

- [ ] **Step 3: Implement** — in `skills/inspiration/scripts/format.mjs`:

1. Above `function formatFailure(result) {` add:

```js
const RECONNECT =
  "Your Infoviz account needs reconnecting: Indicator Labs → Connected services → Infoviz → Reconnect.";
```

2. In `formatFailure`'s `switch`, before `default:`, add:

```js
    case "invalid-token":
      return RECONNECT;
    case "engine-failed":
      return `Indicator Labs could not run the search (${result.detail}).`;
```

3. Rename the existing exported function body: change `export function formatInspiration(result) {` to `function formatResult(result) {` (keep its JSDoc on the new export below), and add after it:

```js
/**
 * Renders a `searchInspiration` result as markdown for the journalist.
 */
export function formatInspiration(result) {
  const body = formatResult(result);
  return result.accountNeedsReconnect ? `${RECONNECT}\n\n${body}` : body;
}
```

Remove the now-duplicated JSDoc line above `function formatResult` so only the export carries it.

- [ ] **Step 4: Run the tests**

Run: `bun test skills/inspiration/test/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation check** — in `formatInspiration`, return `body` unconditionally → `should put the reconnect sentence before an anonymous list` red; revert.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/format.mjs skills/inspiration/test/format.test.ts
git commit -m "feat(inspiration): say when the Infoviz account needs reconnecting, and when Indicator Labs could not search"
```

---

### Task 3: The closed entry Engine runs

**Files:**
- Create: `skills/inspiration/scripts/sealed-search.mjs`
- Test: `skills/inspiration/test/sealed-search.test.ts`

**Interfaces:**
- Consumes: `searchInspiration({query, token})` (Task 1).
- Produces: `sealedSearch(request, { searchFn = searchInspiration, env = process.env })` → a search result object; request must be exactly `{ query }`; uses `env.INFOVIZ_TOKEN ?? ""`; on `reason === "invalid-token"` runs one anonymous `searchFn({ query })` and returns it with `accountNeedsReconnect: true`. Command: reads bounded JSON from stdin (≤ 64 KiB), prints the result as one JSON line; exit 1 with a message on a malformed request.

- [ ] **Step 1: Write the failing tests** — `skills/inspiration/test/sealed-search.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { sealedSearch } from "../scripts/sealed-search.mjs";

const LIST = { ok: true, query: "floods", items: [], quota: { limit: 10, remaining: 9, resetsAt: null } };
const ANON = { ok: true, query: "floods", items: [], quota: { limit: 5, remaining: 4, resetsAt: null } };

function recorder(answers) {
  const calls: any[] = [];
  const searchFn = async (options) => {
    calls.push(options);
    return answers[calls.length - 1];
  };
  return { calls, searchFn };
}

describe("sealedSearch", () => {
  it("should search once with the token Engine injected", async () => {
    const { calls, searchFn } = recorder([LIST]);
    const result = await sealedSearch({ query: "floods" }, { searchFn, env: { INFOVIZ_TOKEN: "tok-123" } });
    expect(result).toEqual(LIST);
    expect(calls).toEqual([{ query: "floods", token: "tok-123" }]);
  });

  it("should run exactly one anonymous search when the token is refused, and say so", async () => {
    const { calls, searchFn } = recorder([{ ok: false, reason: "invalid-token" }, ANON]);
    const result = await sealedSearch({ query: "floods" }, { searchFn, env: { INFOVIZ_TOKEN: "expired" } });
    expect(result).toEqual({ ...ANON, accountNeedsReconnect: true });
    expect(calls).toEqual([{ query: "floods", token: "expired" }, { query: "floods" }]);
  });

  it("should not search again for any other failure", async () => {
    const limit = { ok: false, reason: "limit-reached", query: "floods", quota: { limit: 10, remaining: 0, resetsAt: null } };
    const { calls, searchFn } = recorder([limit]);
    expect(await sealedSearch({ query: "floods" }, { searchFn, env: { INFOVIZ_TOKEN: "tok" } })).toEqual(limit);
    expect(calls).toHaveLength(1);
  });

  it("should refuse a request with any field other than query", async () => {
    const { searchFn } = recorder([LIST]);
    await expect(sealedSearch({ query: "floods", token: "x" }, { searchFn, env: {} })).rejects.toThrow(/closed contract/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test skills/inspiration/test/sealed-search.test.ts`
Expected: FAIL — `Cannot find module '../scripts/sealed-search.mjs'`.

- [ ] **Step 3: Implement** — `skills/inspiration/scripts/sealed-search.mjs`

```js
#!/usr/bin/env bun

// Engine's closed entry for an inspiration search made with the journalist's Infoviz account.
// Engine injects INFOVIZ_TOKEN and passes only the subject on stdin; the token never reaches the
// model, the command line or the output. A refused token is the one case that searches twice: the
// anonymous answer comes back flagged, so the journalist learns the account needs reconnecting
// instead of silently losing their allowance.

import { searchInspiration } from "./search.mjs";

const MAX_REQUEST_BYTES = 64 * 1024;

function exactKeys(value, expected) {
  const actual =
    value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    throw new Error("sealed inspiration request fields do not match the closed contract");
  }
}

/**
 * Searches with the injected account token; on a refused token, once more without it.
 */
export async function sealedSearch(request, { searchFn = searchInspiration, env = process.env } = {}) {
  exactKeys(request, ["query"]);
  const result = await searchFn({ query: request.query, token: env.INFOVIZ_TOKEN ?? "" });
  if (result.reason !== "invalid-token") return result;
  const anonymous = await searchFn({ query: request.query });
  return { ...anonymous, accountNeedsReconnect: true };
}

async function readRequest() {
  const chunks = [];
  let total = 0;
  for await (const chunk of Bun.stdin.stream()) {
    total += chunk.byteLength;
    if (total > MAX_REQUEST_BYTES) throw new Error("sealed inspiration request has an invalid size");
    chunks.push(chunk);
  }
  if (total === 0) throw new Error("sealed inspiration request has an invalid size");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

if (import.meta.main) {
  try {
    const result = await sealedSearch(await readRequest());
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "sealed inspiration search failed");
    process.exitCode = 1;
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test skills/inspiration/test/sealed-search.test.ts`
Expected: PASS (4).

- [ ] **Step 5: Mutation check** — drop `, accountNeedsReconnect: true` from the return → the second test red; revert.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/sealed-search.mjs skills/inspiration/test/sealed-search.test.ts
git commit -m "feat(inspiration): a closed entry Engine runs with the account token, reconnect-aware"
```

---

### Task 4: The Splash runner knows the operation

**Files:**
- Modify: `skills/splash/scripts/run-operation.mjs` (`OPERATION_IDS`, `runOperation` switch)
- Test: `skills/splash/test/run-operation.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `skills/inspiration/scripts/sealed-search.mjs` (Task 3) as a child entrypoint.
- Produces: `runOperation("inspiration-search", request, { runSkillEntrypointFn })` — requires `request.parameters` to be exactly `{ query }` with a string of 1-1000 characters after trimming; calls `runSkillEntrypointFn(<checkout>/skills/inspiration/scripts/sealed-search.mjs, [], { query })` and returns its result unchanged.

- [ ] **Step 1: Append the failing tests** to `skills/splash/test/run-operation.test.ts` (at the end of the file; `runOperation` and `OPERATION_IDS` are imported at its top — add them to that import if missing)

```ts
describe("inspiration-search operation", () => {
  it("should be a closed operation ID", () => {
    expect(OPERATION_IDS).toContain("inspiration-search");
  });

  it("should run the inspiration skill's sealed entry with only the query", async () => {
    const seen: any[] = [];
    const result = await runOperation(
      "inspiration-search",
      { parameters: { query: "floods" } },
      {
        runSkillEntrypointFn: async (path, args, input) => {
          seen.push({ path, args, input });
          return { ok: true, query: "floods", items: [], quota: { limit: 10, remaining: 9, resetsAt: null } };
        },
      },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].path.endsWith("skills/inspiration/scripts/sealed-search.mjs")).toBe(true);
    expect(seen[0].args).toEqual([]);
    expect(seen[0].input).toEqual({ query: "floods" });
    expect(result.quota.limit).toBe(10);
  });

  it("should refuse parameters other than query", async () => {
    await expect(
      runOperation("inspiration-search", { parameters: { query: "floods", token: "x" } }, { runSkillEntrypointFn: async () => ({}) }),
    ).rejects.toThrow(/closed contract/);
  });

  it("should refuse an empty or oversized query", async () => {
    const runner = { runSkillEntrypointFn: async () => ({}) };
    await expect(runOperation("inspiration-search", { parameters: { query: "   " } }, runner)).rejects.toThrow(/1 to 1000/);
    await expect(runOperation("inspiration-search", { parameters: { query: "x".repeat(1001) } }, runner)).rejects.toThrow(/1 to 1000/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test skills/splash/test/run-operation.test.ts`
Expected: the 4 new tests FAIL (`unknown closed Splash operation` / not contained).

- [ ] **Step 3: Implement** — in `skills/splash/scripts/run-operation.mjs`:

1. In `OPERATION_IDS`, after `"cloudflare-deploy",` add `"inspiration-search",`.
2. In `runOperation`'s `switch`, add before the `case "datawrapper-produce": {` line:

```js
    case "inspiration-search": {
      const parameters = requireParameters(request, ["query"]);
      const query = typeof parameters.query === "string" ? parameters.query.trim() : "";
      if (!query || query.length > 1000)
        throw new Error("inspiration search query must be 1 to 1000 characters");
      return runSkillEntrypointFn(
        runtimeEntrypoint("inspiration", "skills/inspiration/scripts/sealed-search.mjs"),
        [],
        { query },
      );
    }
```

- [ ] **Step 4: Run the tests**

Run: `bun test skills/splash/test/run-operation.test.ts skills/splash/test/no-cross-skill-imports.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation check** — change `query.length > 1000` to `query.length > 2000` → `should refuse an empty or oversized query` red; revert.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/scripts/run-operation.mjs skills/splash/test/run-operation.test.ts
git commit -m "feat(splash): the closed runner accepts inspiration-search and hands only the query to the skill"
```

---

### Task 5: Choosing the account path

**Files:**
- Create: `skills/inspiration/scripts/managed.mjs`
- Test: `skills/inspiration/test/managed.test.ts`

**Interfaces:**
- Consumes: `searchInspiration`, `MAX_QUERY_LENGTH` (`search.mjs`).
- Produces:
  - `KEY_STATUS_TIMEOUT_MS = 20_000`, `OPERATION_TIMEOUT_MS = 90_000`
  - `searchWithAccount({ query, env = process.env, runEngineFn, searchFn = searchInspiration })` → a search result object. `runEngineFn(bsigPath, args, stdin, { timeoutMs })` → `Promise<{ exitCode: number, events: object[] }>` (implemented by `engine.mjs`, Task 6). Behaviour exactly per Global Constraints' path rule.

- [ ] **Step 1: Write the failing tests** — `skills/inspiration/test/managed.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { searchWithAccount, KEY_STATUS_TIMEOUT_MS, OPERATION_TIMEOUT_MS } from "../scripts/managed.mjs";

const BSIG = "/Applications/Indicator Labs.app/Contents/Resources/bsig";
const DIRECT = { ok: true, query: "floods", items: [], quota: { limit: 5, remaining: 4, resetsAt: null } };
const ACCOUNT = { ok: true, query: "floods", items: [], quota: { limit: 10, remaining: 9, resetsAt: null } };

function fakes({ status, run }: { status?: any; run?: any }) {
  const engineCalls: any[] = [];
  const directCalls: any[] = [];
  const runEngineFn = async (path, args, stdin, options) => {
    engineCalls.push({ path, args, stdin, options });
    const answer = args[0] === "keys" ? status : run;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  const searchFn = async (options) => {
    directCalls.push(options);
    return DIRECT;
  };
  return { engineCalls, directCalls, runEngineFn, searchFn };
}

const stored = (value: boolean) => ({ exitCode: 0, events: [{ event: "result", data: { id: "INFOVIZ_TOKEN", stored: value } }] });
const ran = (result: any) => ({ exitCode: 0, events: [{ event: "progress" }, { event: "result", data: { stdout: `${JSON.stringify(result)}\n` } }] });

describe("searchWithAccount", () => {
  it("should search directly when Splash is not under Engine", async () => {
    const f = fakes({});
    expect(await searchWithAccount({ query: "floods", env: {}, runEngineFn: f.runEngineFn, searchFn: f.searchFn })).toEqual(DIRECT);
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "floods" }]);
  });

  it("should search directly when no account is stored", async () => {
    const f = fakes({ status: stored(false) });
    expect(await searchWithAccount({ query: "floods", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn })).toEqual(DIRECT);
    expect(f.engineCalls.map((c) => c.args)).toEqual([["keys", "status", "INFOVIZ_TOKEN"]]);
  });

  it("should search directly when Engine does not know the credential", async () => {
    const f = fakes({ status: { exitCode: 1, events: [{ event: "error", message: "unknown key" }] } });
    expect(await searchWithAccount({ query: "floods", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn })).toEqual(DIRECT);
  });

  it("should search directly when the status check itself fails", async () => {
    const f = fakes({ status: new Error("Engine timed out") });
    expect(await searchWithAccount({ query: "floods", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn })).toEqual(DIRECT);
  });

  it("should run the Engine operation with the query JSON-encoded when an account is stored", async () => {
    const subject = 'floods "in" $HOME\nand `rain`';
    const f = fakes({ status: stored(true), run: ran({ ...ACCOUNT, query: subject }) });
    const result = await searchWithAccount({ query: subject, env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn });
    expect(result.quota.limit).toBe(10);
    expect(f.directCalls).toEqual([]);
    expect(f.engineCalls[0].options).toEqual({ timeoutMs: KEY_STATUS_TIMEOUT_MS });
    expect(f.engineCalls[1].path).toBe(BSIG);
    expect(f.engineCalls[1].args).toEqual(["run", "splash", "inspiration-search"]);
    expect(JSON.parse(f.engineCalls[1].stdin)).toEqual({ parameters: { query: subject } });
    expect(f.engineCalls[1].options).toEqual({ timeoutMs: OPERATION_TIMEOUT_MS });
  });

  it("should report an Engine failure after the operation started, without a second search", async () => {
    const f = fakes({ status: stored(true), run: { exitCode: 1, events: [{ event: "error", message: "splash operation inspiration-search exited with code 1" }] } });
    const result = await searchWithAccount({ query: "floods", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn });
    expect(result).toEqual({ ok: false, reason: "engine-failed", detail: "splash operation inspiration-search exited with code 1" });
    expect(f.directCalls).toEqual([]);
  });

  it("should report unreadable operation output as an Engine failure", async () => {
    const f = fakes({ status: stored(true), run: { exitCode: 0, events: [{ event: "result", data: { stdout: "not json" } }] } });
    const result = await searchWithAccount({ query: "floods", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn });
    expect(result.reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should let the direct search refuse an empty subject without asking Engine anything", async () => {
    const f = fakes({ status: stored(true) });
    await searchWithAccount({ query: "  ", env: { SPLASH_BSIG_PATH: BSIG }, runEngineFn: f.runEngineFn, searchFn: f.searchFn });
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "  " }]);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test skills/inspiration/test/managed.test.ts`
Expected: FAIL — `Cannot find module '../scripts/managed.mjs'`.

- [ ] **Step 3: Implement** — `skills/inspiration/scripts/managed.mjs`

```js
// Which way a search goes. Under Engine, with an Infoviz account connected in Indicator Labs, the
// search runs as the closed `inspiration-search` operation so Engine can inject the account token;
// in every other case it runs directly and anonymously. Anything unclear before the operation
// starts falls back to the direct search. Once the operation has started, a failure is reported
// and nothing searches again: the operation may already have spent one of the day's searches.

import { MAX_QUERY_LENGTH, searchInspiration } from "./search.mjs";

export const KEY_STATUS_TIMEOUT_MS = 20_000;
export const OPERATION_TIMEOUT_MS = 90_000;

const CREDENTIAL_ID = "INFOVIZ_TOKEN";
const OPERATION_ID = "inspiration-search";

function terminal(outcome) {
  const events = Array.isArray(outcome?.events) ? outcome.events : [];
  return events.length ? events[events.length - 1] : null;
}

function describeFailure(outcome, event) {
  if (typeof event?.message === "string" && event.message) return event.message;
  if (typeof event?.data?.message === "string" && event.data.message) return event.data.message;
  return `exit code ${outcome?.exitCode ?? "unknown"}`;
}

async function accountStored(bsigPath, runEngineFn) {
  try {
    const outcome = await runEngineFn(bsigPath, ["keys", "status", CREDENTIAL_ID], "", {
      timeoutMs: KEY_STATUS_TIMEOUT_MS,
    });
    const event = terminal(outcome);
    return outcome.exitCode === 0 && event?.event === "result" && event.data?.stored === true;
  } catch {
    return false;
  }
}

/**
 * Searches with the connected Infoviz account when Engine has one, anonymously otherwise.
 */
export async function searchWithAccount({ query, env = process.env, runEngineFn, searchFn = searchInspiration }) {
  const bsigPath = env.SPLASH_BSIG_PATH;
  const subject = typeof query === "string" ? query.trim() : "";
  if (!bsigPath || !subject || subject.length > MAX_QUERY_LENGTH) return searchFn({ query });
  if (!(await accountStored(bsigPath, runEngineFn))) return searchFn({ query });

  let outcome;
  try {
    outcome = await runEngineFn(
      bsigPath,
      ["run", "splash", OPERATION_ID],
      JSON.stringify({ parameters: { query: subject } }),
      { timeoutMs: OPERATION_TIMEOUT_MS },
    );
  } catch (error) {
    return { ok: false, reason: "engine-failed", detail: error instanceof Error ? error.message : String(error) };
  }

  const event = terminal(outcome);
  if (outcome.exitCode !== 0 || event?.event !== "result" || typeof event.data?.stdout !== "string") {
    return { ok: false, reason: "engine-failed", detail: describeFailure(outcome, event) };
  }
  try {
    const result = JSON.parse(event.data.stdout);
    if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
  } catch {
    // falls through to the unreadable-output report below
  }
  return { ok: false, reason: "engine-failed", detail: "Indicator Labs returned an unreadable result" };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test skills/inspiration/test/managed.test.ts`
Expected: PASS (8).

- [ ] **Step 5: Mutation checks** (break, run, see red, revert)
  - In `accountStored`, return `true` from the `catch` → `should search directly when the status check itself fails` red.
  - In `searchWithAccount`, replace `return { ok: false, reason: "engine-failed", detail: describeFailure(outcome, event) };` with `return searchFn({ query });` → `should report an Engine failure after the operation started, without a second search` red.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/managed.mjs skills/inspiration/test/managed.test.ts
git commit -m "feat(inspiration): choose the account path from Engine, and never search twice once it started"
```

---

### Task 6: The only module that starts bsig

**Files:**
- Create: `skills/inspiration/scripts/engine.mjs`
- Test: `skills/inspiration/test/engine.test.ts` (heavy lane — it spawns a fake executable)

**Interfaces:**
- Produces: `runEngine(bsigPath, args, stdin, { timeoutMs })` → `Promise<{ exitCode, events }>`; spawns `[bsigPath, "--json", ...args]`, writes `stdin`, reads stdout ≤ 1 MiB, parses NDJSON lines (each must be an object whose `event` is `progress`, `result` or `error`), rejects on a relative path, malformed output, no events, or timeout (the child is killed).

- [ ] **Step 1: Write the failing test** — `skills/inspiration/test/engine.test.ts`

```ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runEngine } from "../scripts/engine.mjs";

let dir = "";
let fake = "";
let slow = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "inspiration-engine-"));
  fake = join(dir, "bsig");
  writeFileSync(
    fake,
    [
      "#!/bin/sh",
      'input="$(cat)"',
      'printf \'{"event":"progress"}\\n\'',
      'printf \'{"event":"result","data":{"args":"%s","stdin":"%s"}}\\n\' "$*" "$input"',
    ].join("\n"),
  );
  chmodSync(fake, 0o755);
  slow = join(dir, "slow");
  writeFileSync(slow, "#!/bin/sh\nsleep 5\n");
  chmodSync(slow, 0o755);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("runEngine", () => {
  it("should pass --json, the arguments and stdin, and parse the events", async () => {
    const outcome = await runEngine(fake, ["keys", "status", "INFOVIZ_TOKEN"], "hello", { timeoutMs: 5000 });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.events[0]).toEqual({ event: "progress" });
    expect(outcome.events[1].data).toEqual({ args: "--json keys status INFOVIZ_TOKEN", stdin: "hello" });
  });

  it("should refuse a relative executable path", async () => {
    await expect(runEngine("bsig", ["keys"], "", { timeoutMs: 1000 })).rejects.toThrow(/absolute/);
  });

  it("should stop a process that outlives its deadline", async () => {
    const started = Date.now();
    await expect(runEngine(slow, [], "", { timeoutMs: 200 })).rejects.toThrow(/timed out/);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test skills/inspiration/test/engine.test.ts`
Expected: FAIL — `Cannot find module '../scripts/engine.mjs'`.

- [ ] **Step 3: Implement** — `skills/inspiration/scripts/engine.mjs`

```js
// The only place the inspiration skill starts Engine's `bsig`. It passes arguments as an argv
// array and data on stdin — never through a shell — and reads Engine's NDJSON control events.

import { isAbsolute } from "node:path";

const MAX_OUTPUT_BYTES = 1 << 20;
const EVENTS = new Set(["progress", "result", "error"]);

async function readBounded(stream) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > MAX_OUTPUT_BYTES) throw new Error("Engine output exceeded its bound");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue;
    const event = JSON.parse(line);
    if (!event || typeof event !== "object" || Array.isArray(event) || !EVENTS.has(event.event)) {
      throw new Error("Engine returned an unsupported control event");
    }
    events.push(event);
  }
  if (events.length === 0) throw new Error("Engine returned no control event");
  return events;
}

/**
 * Runs `bsig --json <args>` with `stdin`, bounded in time and output.
 */
export async function runEngine(bsigPath, args, stdin, { timeoutMs }) {
  if (typeof bsigPath !== "string" || !isAbsolute(bsigPath)) {
    throw new Error("Engine executable path must be absolute");
  }
  const child = Bun.spawn([bsigPath, "--json", ...args], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  child.stdin.write(stdin);
  child.stdin.end();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  try {
    const [stdout, , exitCode] = await Promise.all([
      readBounded(child.stdout),
      readBounded(child.stderr),
      child.exited,
    ]);
    if (timedOut) throw new Error("Engine timed out");
    return { exitCode, events: parseEvents(stdout) };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run the test and the lane check**

```bash
bun test skills/inspiration/test/engine.test.ts
bun run test:lanes 2>&1 | tail -1
bun scripts/test-lanes.mjs --heavy | tr ' ' '\n' | grep inspiration
bun scripts/test-lanes.mjs --fast | tr ' ' '\n' | grep inspiration
```

Expected: 3 pass; lanes check passes; `engine.test.ts` listed heavy; `search`, `format`, `sealed-search`, `managed`, `routing` tests listed fast.

- [ ] **Step 5: Mutation check** — remove `"--json", ` from the spawn array → the first test red; revert.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/engine.mjs skills/inspiration/test/engine.test.ts
git commit -m "feat(inspiration): start bsig with argv and stdin only, bounded in time and output"
```

---

### Task 7: The command and the contract

**Files:**
- Create: `skills/inspiration/scripts/cli.mjs`
- Modify: `skills/inspiration/scripts/search.mjs` (remove the `import.meta.main` block, `STDIN_LIMIT_BYTES`, `readStdinSubject` and the `formatInspiration` import)
- Modify: `skills/inspiration/SKILL.md` (Architecture, How it works, Quick start, Files, one account line)

**Interfaces:**
- Consumes: `parseArgs` (`search.mjs`), `searchWithAccount` (`managed.mjs`), `runEngine` (`engine.mjs`), `formatInspiration` (`format.mjs`).
- Produces: command `bun skills/inspiration/scripts/cli.mjs [--json] [--stdin] <subject>` — same flags, usage error (exit 2) and exit codes as the former `search.mjs` command.

- [ ] **Step 1: Create `skills/inspiration/scripts/cli.mjs`**

```js
#!/usr/bin/env bun

// The inspiration skill's one command. It reads the subject (argv or stdin), lets managed.mjs
// choose between the connected Infoviz account under Engine and the anonymous search, and prints
// what the journalist reads — or the structured result with --json.

import { formatInspiration } from "./format.mjs";
import { runEngine } from "./engine.mjs";
import { searchWithAccount } from "./managed.mjs";
import { parseArgs } from "./search.mjs";

const STDIN_LIMIT_BYTES = 64 * 1024;

async function readStdinSubject(stream) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    chunks.push(chunk);
    if (total >= STDIN_LIMIT_BYTES) break;
  }
  return Buffer.concat(chunks).subarray(0, STDIN_LIMIT_BYTES).toString("utf8").trim();
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(`Usage: cli.mjs [--json] [--stdin] <subject>\n${parsed.error}`);
  process.exit(2);
}
const query = parsed.readStdin ? await readStdinSubject(process.stdin) : parsed.query;
const result = await searchWithAccount({ query, runEngineFn: runEngine });
console.log(parsed.asJson ? JSON.stringify(result, null, 2) : formatInspiration(result));
if (!result.ok) process.exitCode = 1;
```

- [ ] **Step 2: Make `search.mjs` a pure library** — delete from `skills/inspiration/scripts/search.mjs`: the line `import { formatInspiration } from "./format.mjs";`, the line `const STDIN_LIMIT_BYTES = 64 * 1024;`, the whole `async function readStdinSubject(stream) { … }`, and the whole `if (import.meta.main) { … }` block. Keep `parseArgs` exactly as it is. Update its header comment's last sentence if it mentions the command line, so it describes a library.

- [ ] **Step 3: Update `skills/inspiration/SKILL.md`**
  - **Architecture table** — replace the two rows with:

```markdown
| Command | `scripts/cli.mjs` | reads the subject (argv or `--stdin`), searches, prints the markdown or `--json`; exit 1 when there is no list, 2 on a usage error |
| Path | `scripts/managed.mjs` | `searchWithAccount({query, env, runEngineFn, searchFn})` — under Engine with a stored `INFOVIZ_TOKEN`, runs `bsig run splash inspiration-search`; otherwise the direct search; never a second search once the operation started |
| Engine | `scripts/engine.mjs` | `runEngine(bsigPath, args, stdin, {timeoutMs})` — the only place `bsig` is started: argv and stdin, bounded |
| Account entry | `scripts/sealed-search.mjs` | `sealedSearch(request, {searchFn, env})` — Engine's closed entry: searches with the injected token, one anonymous retry flagged `accountNeedsReconnect` when the token is refused |
| Request | `scripts/search.mjs` | `searchInspiration({query, fetchFn, timeoutMs, apiBase, token})` — one POST under one deadline covering request and body; returns the list and quota, or the reason there is none; never throws |
| Words | `scripts/format.mjs` | `formatInspiration(result)` — the numbered list, the quota line, the reconnect sentence, or the plain sentence for each failure |
```

  - **Everywhere in SKILL.md** — replace every `bun skills/inspiration/scripts/search.mjs` and every prose mention of `search.mjs` as the command with `bun skills/inspiration/scripts/cli.mjs` / `cli.mjs` (check with `grep -n "search.mjs" skills/inspiration/SKILL.md`: only the Architecture, Tuning and Files mentions of the library may remain).
  - **Quick start** — After the paragraph that starts "The markdown form is what the journalist reads", add:

```markdown
With an Infoviz account connected in Indicator Labs (Connected services → Infoviz → Connect), the
same command uses it — 10 searches a day instead of 5. Nothing about the account is ever done or
said in chat; if the account needs reconnecting, the output says so in its first line.
```

  - **How it works** — add a step before the current step 2 ("Ask once"): `**Choose the path.** Under Engine (\`SPLASH_BSIG_PATH\`) with a stored \`INFOVIZ_TOKEN\`, the search runs as \`bsig run splash inspiration-search\`; otherwise directly and anonymously.` and renumber the following steps.
  - **Files** — replace the `scripts/search.mjs` bullet and add bullets so the section lists, in this order:

```markdown
- `scripts/cli.mjs` — the one command the agent runs.
- `scripts/managed.mjs` — `searchWithAccount`, `KEY_STATUS_TIMEOUT_MS`, `OPERATION_TIMEOUT_MS` — the path
  choice between the connected account and the anonymous search.
- `scripts/engine.mjs` — `runEngine` — starts `bsig` with argv and stdin only.
- `scripts/sealed-search.mjs` — `sealedSearch` — Engine's closed entry for a search with the account token.
- `scripts/search.mjs` — `searchInspiration`, `normaliseItems`, `parseArgs` — the one bounded request, the item
  filter and the command's argument reader.
- `scripts/format.mjs` — `formatInspiration` — every sentence the journalist reads.
- `test/managed.test.ts` — every path decision, with Engine faked.
- `test/sealed-search.test.ts` — the token, the single anonymous retry, the closed request.
- `test/engine.test.ts` — argv, stdin, events and the deadline against a fake executable (heavy lane).
```

  (keep the existing `test/search.test.ts`, `test/format.test.ts`, `test/search.live.test.ts` and `test/routing.test.ts` bullets after these.)
  - **Tuning knobs** — add a row: ``| How long Engine may take to say whether an account is stored, and to run the search | `20000` / `90000` ms | `KEY_STATUS_TIMEOUT_MS`, `OPERATION_TIMEOUT_MS`, `managed.mjs` |``

- [ ] **Step 4: Check the command without spending a search**

```bash
bun skills/inspiration/scripts/cli.mjs --help; echo "exit $?"
printf '   ' | bun skills/inspiration/scripts/cli.mjs --stdin; echo "exit $?"
grep -n "import.meta.main" skills/inspiration/scripts/search.mjs || echo "search.mjs is a library"
```

Expected: usage on stderr and `exit 2`; `Name a subject to search for.` and `exit 1`; `search.mjs is a library`.

- [ ] **Step 5: Check the account path end to end with a fake bsig** (no network: the fake answers both calls)

```bash
D="$(mktemp -d)"
cat > "$D/bsig" <<'SH'
#!/bin/sh
cat >/dev/null
case "$*" in
  *"keys status INFOVIZ_TOKEN"*) printf '%s\n' '{"event":"result","data":{"id":"INFOVIZ_TOKEN","stored":true}}' ;;
  *"run splash inspiration-search"*) printf '%s\n' '{"event":"result","data":{"stdout":"{\"ok\":true,\"query\":\"floods\",\"items\":[],\"quota\":{\"limit\":10,\"remaining\":9,\"resetsAt\":null},\"accountNeedsReconnect\":true}\n"}}' ;;
esac
SH
chmod +x "$D/bsig"
printf 'floods' | SPLASH_BSIG_PATH="$D/bsig" bun skills/inspiration/scripts/cli.mjs --stdin; echo "exit $?"
rm -rf "$D"
```

Expected output: the reconnect sentence, a blank line, `Nothing in the gallery for “floods”.`, a blank line, `9 of 10 searches left today.`, `exit 0`.

- [ ] **Step 6: Run the guards and tests**

```bash
bun test skills/inspiration/ skills/splash/test/skill-md-matches-code.test.ts skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/run-operation.test.ts
bun run test:lanes 2>&1 | tail -1
```

Expected: all pass (the live test skips); lanes check passes.

- [ ] **Step 7: Commit**

```bash
git add skills/inspiration/scripts/cli.mjs skills/inspiration/scripts/search.mjs skills/inspiration/SKILL.md
git commit -m "feat(inspiration): one command that uses the Indicator Labs account when there is one"
```

---

### Task 8: Verification

**Files:** none changed (a failure goes back to the task that owns it).

- [ ] **Step 1: Repository gates**

```bash
bun run test:lanes 2>&1 | tail -1
bun run test 2>&1 | tail -5
bun test skills/inspiration/test/engine.test.ts 2>&1 | tail -3
bun run catalog:check 2>&1 | tail -1
bash tests/journalist-install-cta-check.sh; echo "cta exit $?"
git status --short
```

Expected: lanes pass; fast lane 0 fail (baseline + the new fast tests); engine test passes; catalog check passes; CTA exit 0; clean tree.

- [ ] **Step 2: Grep the invariants**

```bash
grep -rn "Bun.spawn" skills/inspiration/scripts/ | grep -v engine.mjs || echo "only engine.mjs spawns"
grep -rn "INFOVIZ_TOKEN" apps installer skills/splash/scripts/keys.mjs .env.example || echo "no credential list touched"
```

Expected: `only engine.mjs spawns`; `no credential list touched`.

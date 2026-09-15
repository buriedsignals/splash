# Inspiration 02b-1c — Splash: the account path through the Splash MCP, and a token to copy for Indicator Labs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Under Indicator Labs, the agent searches inspiration with the journalist's Infoviz account through a new `search_inspiration` tool on the existing Splash MCP server; the inspiration page lets a signed-in reader copy the token to paste into Indicator Labs; the skill's own command becomes plainly anonymous.

**Architecture:** `apps/goose/inspiration.mjs` holds the path decision with `invokeEngineFn` and `searchFn` injected: with an Engine path and a stored `INFOVIZ_TOKEN` it runs `bsig run splash inspiration-search` through the existing `invokeEngine` (which already filters the environment and restores the journalist's home); otherwise it searches directly. `createServer` registers `search_inspiration` when given that service; `main()` wires it. The skill's `managed.mjs`/`engine.mjs` (which duplicated the bridge) are removed and `cli.mjs` calls `searchInspiration` directly. The page gains a copy button.

**Tech Stack:** Bun ESM, `@modelcontextprotocol/sdk` + zod v4 (already used by `apps/goose/server.mjs`), `bun:test`; static HTML/JS for the page.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` — Part 2b-1 (D9 revised, D12).

## Global Constraints

- Worktree `/Users/rmdms/Sites/Professional/splash/feat-inspiration`, branch `feat-inspiration`. Run every command from the worktree root. **Never push, never merge.**
- Bun only. English code/comments/copy/commits. No mention of Claude/Anthropic; commits carry no trailer of any kind. Commit with an explicit pathspec: `git commit -m "<message>" -- <paths>`.
- MCP tool name `search_inspiration`; input exactly `{ query: string (1-1000) }`; unknown fields rejected. Description must say to pass only the journalist's subject and never a credential.
- Engine calls (through `invokeEngine` from `installer/setup/engine-bridge.mjs`): `["keys","status","INFOVIZ_TOKEN"]` with stdin `""` → terminal `result` `data.stored === true` means stored; `["run","splash","inspiration-search"]` with stdin `{"parameters":{"query":"<trimmed subject>"}}\n` → terminal `result` `data.stdout` holds the runner's JSON line.
- Path rule: no Engine path → direct search. Not stored / error / non-zero exit / throw during the status check → direct search. Once the run has been attempted, any failure (throw, non-zero exit, error event, unreadable stdout) → `{ ok: false, reason: "engine-failed", detail }` and **no second search**.
- Do not use `bridge.status()` for `INFOVIZ_TOKEN` (it refuses IDs outside `CREDENTIAL_IDS` until spec 2b-2). No change to `CREDENTIAL_IDS`, `CREDENTIAL_POLICIES`, `self-managed.mjs`, `legacy-env.mjs`, `.env.example`.
- Copy button label `Copy token for Indicator Labs`; confirmation `Copied. Paste it in Indicator Labs → Connected services → Infoviz → Enter token…`; failure `Your browser refused the clipboard.` The token is never rendered in the page.
- Baseline at plan start (after plan 02b-1): fast lane 2378 pass, 4 skip, 0 fail. Green gate: `bun run test:lanes` passes; fast lane 0 fail; `bun test apps/goose/test/server.test.ts` passes.

---

### Task 0: Baseline

- [ ] **Step 1:**

```bash
cd /Users/rmdms/Sites/Professional/splash/feat-inspiration
git status --short
bun run test:lanes 2>&1 | tail -1
bun run test 2>&1 | tail -4
bun test apps/goose/test/server.test.ts 2>&1 | tail -3
```

Expected: clean tree; lanes pass; fast lane 0 fail; server tests pass. Record the numbers.

---

### Task 1: The inspiration service the MCP server uses

**Files:**
- Create: `apps/goose/inspiration.mjs`
- Test: `apps/goose/test/inspiration.test.ts`

**Interfaces:**
- Consumes: `searchInspiration`, `MAX_QUERY_LENGTH` (`skills/inspiration/scripts/search.mjs`); `formatInspiration` (`skills/inspiration/scripts/format.mjs`).
- Produces: `createInspirationService({ bsigPath, invokeEngineFn, searchFn = searchInspiration })` → `{ search(query) → Promise<result>, format(result) → string }`. `invokeEngineFn(executable, args, stdin) → Promise<{ events, exitCode }>` (the signature of `invokeEngine`).

- [ ] **Step 1: Write the failing tests** — `apps/goose/test/inspiration.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { createInspirationService } from "../inspiration.mjs";

const BSIG = "/Applications/Indicator Labs.app/Contents/Resources/bsig";
const DIRECT = { ok: true, query: "floods", items: [], quota: { limit: 5, remaining: 4, resetsAt: null } };
const ACCOUNT = { ok: true, query: "floods", items: [], quota: { limit: 10, remaining: 9, resetsAt: null } };

function fakes({ status, run }: { status?: any; run?: any }) {
  const engineCalls: any[] = [];
  const directCalls: any[] = [];
  const invokeEngineFn = async (path, args, stdin) => {
    engineCalls.push({ path, args, stdin });
    const answer = args[0] === "keys" ? status : run;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  const searchFn = async (options) => {
    directCalls.push(options);
    return DIRECT;
  };
  return { engineCalls, directCalls, invokeEngineFn, searchFn };
}

const stored = (value: boolean) => ({ exitCode: 0, events: [{ event: "result", data: { id: "INFOVIZ_TOKEN", stored: value } }] });
const ran = (result: any) => ({ exitCode: 0, events: [{ event: "progress" }, { event: "result", data: { stdout: `${JSON.stringify(result)}\n` } }] });

describe("createInspirationService", () => {
  it("should search directly without an Engine path", async () => {
    const f = fakes({});
    const service = createInspirationService({ bsigPath: undefined, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(await service.search("floods")).toEqual(DIRECT);
    expect(f.engineCalls).toEqual([]);
  });

  it("should search directly when no account is stored", async () => {
    const f = fakes({ status: stored(false) });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(await service.search("floods")).toEqual(DIRECT);
    expect(f.engineCalls.map((c) => c.args)).toEqual([["keys", "status", "INFOVIZ_TOKEN"]]);
  });

  it("should search directly when Engine does not know the credential", async () => {
    const f = fakes({ status: { exitCode: 1, events: [{ event: "error", message: "unknown key id" }] } });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(await service.search("floods")).toEqual(DIRECT);
  });

  it("should search directly when the status check throws", async () => {
    const f = fakes({ status: new Error("Engine executable is not a real executable file") });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(await service.search("floods")).toEqual(DIRECT);
  });

  it("should run the Engine operation with the trimmed subject when an account is stored", async () => {
    const f = fakes({ status: stored(true), run: ran(ACCOUNT) });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    const result = await service.search('  floods "in" $HOME\nand `rain`  ');
    expect(result).toEqual(ACCOUNT);
    expect(f.directCalls).toEqual([]);
    expect(f.engineCalls[1].path).toBe(BSIG);
    expect(f.engineCalls[1].args).toEqual(["run", "splash", "inspiration-search"]);
    expect(JSON.parse(f.engineCalls[1].stdin)).toEqual({ parameters: { query: 'floods "in" $HOME\nand `rain`' } });
  });

  it("should report a failed run without a second search", async () => {
    const f = fakes({ status: stored(true), run: { exitCode: 1, events: [{ event: "error", message: "splash operation inspiration-search exited with code 1" }] } });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(await service.search("floods")).toEqual({
      ok: false,
      reason: "engine-failed",
      detail: "splash operation inspiration-search exited with code 1",
    });
    expect(f.directCalls).toEqual([]);
  });

  it("should report a run that throws without a second search", async () => {
    const f = fakes({ status: stored(true), run: new Error("Engine credential operation timed out") });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    const result = await service.search("floods");
    expect(result.reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should report unreadable run output without a second search", async () => {
    const f = fakes({ status: stored(true), run: { exitCode: 0, events: [{ event: "result", data: { stdout: "not json" } }] } });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect((await service.search("floods")).reason).toBe("engine-failed");
    expect(f.directCalls).toEqual([]);
  });

  it("should let the direct search refuse an empty subject without asking Engine", async () => {
    const f = fakes({ status: stored(true) });
    const service = createInspirationService({ bsigPath: BSIG, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    await service.search("   ");
    expect(f.engineCalls).toEqual([]);
    expect(f.directCalls).toEqual([{ query: "   " }]);
  });

  it("should format with the skill's own words", async () => {
    const f = fakes({});
    const service = createInspirationService({ bsigPath: undefined, invokeEngineFn: f.invokeEngineFn, searchFn: f.searchFn });
    expect(service.format(DIRECT)).toBe("Nothing in the gallery for “floods”.\n\n4 of 5 searches left today.");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test apps/goose/test/inspiration.test.ts`
Expected: FAIL — `Cannot find module '../inspiration.mjs'`.

- [ ] **Step 3: Implement** — `apps/goose/inspiration.mjs`

```js
// The inspiration search the Splash MCP server offers the agent. Engine gives this server — and
// nothing the agent runs itself — the Engine path and the journalist's real home, so this is the one
// place a search can use the Infoviz account stored in Indicator Labs. With an account, the search
// runs as the closed `inspiration-search` operation; otherwise it runs directly and anonymously.
// Once the operation has been attempted, a failure is reported and nothing searches again: it may
// already have spent one of the day's searches.

import { MAX_QUERY_LENGTH, searchInspiration } from "../../skills/inspiration/scripts/search.mjs";
import { formatInspiration } from "../../skills/inspiration/scripts/format.mjs";

const CREDENTIAL_ID = "INFOVIZ_TOKEN";
const OPERATION_ID = "inspiration-search";

function terminal(outcome) {
  const events = Array.isArray(outcome?.events) ? outcome.events : [];
  return events.length ? events[events.length - 1] : null;
}

/**
 * Builds the search the `search_inspiration` tool calls.
 */
export function createInspirationService({ bsigPath, invokeEngineFn, searchFn = searchInspiration }) {
  async function accountStored() {
    if (!bsigPath) return false;
    try {
      const outcome = await invokeEngineFn(bsigPath, ["keys", "status", CREDENTIAL_ID], "");
      const event = terminal(outcome);
      return outcome.exitCode === 0 && event?.event === "result" && event.data?.stored === true;
    } catch {
      return false;
    }
  }

  async function search(query) {
    const subject = typeof query === "string" ? query.trim() : "";
    if (!subject || subject.length > MAX_QUERY_LENGTH) return searchFn({ query });
    if (!(await accountStored())) return searchFn({ query });

    let outcome;
    try {
      outcome = await invokeEngineFn(
        bsigPath,
        ["run", "splash", OPERATION_ID],
        `${JSON.stringify({ parameters: { query: subject } })}\n`,
      );
    } catch (error) {
      return {
        ok: false,
        reason: "engine-failed",
        detail: error instanceof Error ? error.message : "Indicator Labs could not be reached",
      };
    }

    const event = terminal(outcome);
    if (outcome.exitCode !== 0 || event?.event !== "result" || typeof event.data?.stdout !== "string") {
      const detail =
        typeof event?.message === "string" && event.message ? event.message : `exit code ${outcome.exitCode}`;
      return { ok: false, reason: "engine-failed", detail };
    }
    try {
      const result = JSON.parse(event.data.stdout);
      if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
    } catch {
      // reported as unreadable below
    }
    return { ok: false, reason: "engine-failed", detail: "Indicator Labs returned an unreadable result" };
  }

  return { search, format: formatInspiration };
}
```

- [ ] **Step 4: Run the tests and the lane check**

```bash
bun test apps/goose/test/inspiration.test.ts
bun run test:lanes 2>&1 | tail -1
bun scripts/test-lanes.mjs --fast | tr ' ' '\n' | grep "apps/goose/test/inspiration"
```

Expected: 10 pass; lanes check passes; `inspiration.test.ts` is in the fast lane.

- [ ] **Step 5: Mutation checks** (break → named test red → revert)
  - Replace the `detail` return after a non-zero run with `return searchFn({ query });` → `should report a failed run without a second search` red.
  - In the `catch` around the run, return `searchFn({ query })` → `should report a run that throws without a second search` red.
  - Send `query` instead of `subject` in the stdin JSON → `should run the Engine operation with the trimmed subject when an account is stored` red.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(goose): the inspiration search the Splash MCP offers, with the Indicator Labs account when stored" -- apps/goose/inspiration.mjs apps/goose/test/inspiration.test.ts
```

(`git add` both files first: `git add apps/goose/inspiration.mjs apps/goose/test/inspiration.test.ts`.)

---

### Task 2: The `search_inspiration` tool

**Files:**
- Modify: `apps/goose/server.mjs` (`createServer`, `main`, imports)
- Test: `apps/goose/test/server.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `createInspirationService` (Task 1); `invokeEngine` (already imported in `server.mjs`).
- Produces: `createServer({ statusProvider, studio, onToolCall, inspiration })` — when `inspiration` (`{ search, format }`) is given, registers `search_inspiration` with input `{ query }` (string 1-1000, strict); the tool calls `onToolCall("search_inspiration")`, returns `{ content: [{ type: "text", text: inspiration.format(result) }], structuredContent: { inspiration: result } }`; a thrown service error returns `isError: true` with the text `The inspiration search could not run. Nothing was searched.`; `main()` passes `createInspirationService({ bsigPath: process.env.SPLASH_BSIG_PATH, invokeEngineFn: invokeEngine })`.

- [ ] **Step 1: Append the failing tests** to `apps/goose/test/server.test.ts`

```ts
describe("search_inspiration tool", () => {
  async function inspirationFixture(search: (query: string) => Promise<any>) {
    const calls: string[] = [];
    const queries: string[] = [];
    const server = createServer({
      statusProvider: { read: async () => structuredClone(statusFixture()) },
      studio: { start: async () => ({}), openLocally: async () => ({ ok: true }), close() {} },
      onToolCall(name: string) {
        calls.push(name);
      },
      inspiration: {
        search: async (query: string) => {
          queries.push(query);
          return search(query);
        },
        format: (result: any) => (result.ok ? `list for ${result.query}` : `failed: ${result.reason}`),
      },
    });
    const client = new Client({ name: "splash-inspiration-test", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    close.push(
      async () => client.close(),
      async () => server.close(),
    );
    return { client, calls, queries };
  }

  it("should be listed beside open_splash", async () => {
    const { client } = await inspirationFixture(async () => ({ ok: true, query: "floods", items: [] }));
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(["open_splash", "search_inspiration"]);
    const tool = tools.find((t) => t.name === "search_inspiration")!;
    expect(tool.description).toMatch(/never a credential/i);
  });

  it("should return the formatted text and the structured result", async () => {
    const result = { ok: true, query: "floods", items: [], quota: { limit: 10, remaining: 9, resetsAt: null } };
    const { client, calls, queries } = await inspirationFixture(async () => result);
    const answer = await client.callTool({ name: "search_inspiration", arguments: { query: "floods" } });
    expect(answer.isError).not.toBe(true);
    expect(answer.content).toEqual([{ type: "text", text: "list for floods" }]);
    expect(answer.structuredContent).toEqual({ inspiration: result });
    expect(calls).toEqual(["search_inspiration"]);
    expect(queries).toEqual(["floods"]);
  });

  it("should reject unknown fields before searching", async () => {
    const { client, queries } = await inspirationFixture(async () => ({ ok: true, query: "x", items: [] }));
    const answer = await client.callTool({ name: "search_inspiration", arguments: { query: "floods", token: "secret-token-123" } });
    expect(answer.isError).toBe(true);
    expect(queries).toEqual([]);
    expect(JSON.stringify(answer)).not.toContain("secret-token-123");
  });

  it("should say nothing was searched when the service throws", async () => {
    const { client } = await inspirationFixture(async () => {
      throw new Error("boom");
    });
    const answer = await client.callTool({ name: "search_inspiration", arguments: { query: "floods" } });
    expect(answer.isError).toBe(true);
    expect(JSON.stringify(answer.content)).toContain("Nothing was searched");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test apps/goose/test/server.test.ts`
Expected: the 4 new tests FAIL (tool not listed / unknown tool); the existing tests still pass.

- [ ] **Step 3: Implement** — in `apps/goose/server.mjs`:

1. Add the import next to the other local imports:

```js
import { createInspirationService } from "./inspiration.mjs";
```

2. Change the signature `export function createServer({ statusProvider, studio, onToolCall = () => {} } = {}) {` to `export function createServer({ statusProvider, studio, onToolCall = () => {}, inspiration } = {}) {`.
3. Immediately before `return server;` at the end of `createServer`, add:

```js
  if (inspiration) {
    server.registerTool(
      "search_inspiration",
      {
        title: "Search inspiration",
        description:
          "Search the infoviz.design gallery once for what newsrooms have already published on a subject. Pass only the journalist's subject, never a credential. Uses the journalist's Infoviz account when Indicator Labs has one. Show the returned text to the journalist as it is.",
        inputSchema: exactObject({ query: z.string().min(1).max(1000) }),
      },
      async ({ query }) => {
        onToolCall("search_inspiration");
        try {
          const result = await inspiration.search(query);
          return textResult(inspiration.format(result), { inspiration: result });
        } catch {
          return {
            isError: true,
            ...textResult("The inspiration search could not run. Nothing was searched.", {
              inspiration: { ok: false, reason: "unreachable" },
            }),
          };
        }
      },
    );
  }
```

4. In `main()`, change the `createServer({ … })` call to:

```js
  const server = createServer({
    statusProvider: dependencies.statusProvider,
    studio: dependencies.studio,
    inspiration: createInspirationService({
      bsigPath: process.env.SPLASH_BSIG_PATH,
      invokeEngineFn: invokeEngine,
    }),
  });
```

- [ ] **Step 4: Run the tests**

Run: `bun test apps/goose/test/server.test.ts apps/goose/test/inspiration.test.ts apps/goose/test/protocol-boundary.test.ts`
Expected: PASS (the existing "exposes only open_splash" test still passes: its fixture passes no `inspiration`).

- [ ] **Step 5: Mutation check** — remove `exactObject(...)` and use `z.object({ query: z.string() })` → `should reject unknown fields before searching` red; revert.

- [ ] **Step 6: Commit**

```bash
git add apps/goose/server.mjs apps/goose/test/server.test.ts
git commit -m "feat(goose): search_inspiration on the Splash MCP, beside open_splash" -- apps/goose/server.mjs apps/goose/test/server.test.ts
```

---

### Task 3: The skill stops duplicating the bridge

**Files:**
- Delete: `skills/inspiration/scripts/managed.mjs`, `skills/inspiration/scripts/engine.mjs`, `skills/inspiration/test/managed.test.ts`, `skills/inspiration/test/engine.test.ts`
- Modify: `skills/inspiration/scripts/cli.mjs`, `skills/inspiration/SKILL.md`, `skills/splash/SKILL.md` (the `inspiration` routing bullet)

**Interfaces:**
- Produces: `cli.mjs` = anonymous search only; SKILL.md tells the agent to use `search_inspiration` when the host has it.

- [ ] **Step 1: Remove the duplicate modules**

```bash
git rm -q skills/inspiration/scripts/managed.mjs skills/inspiration/scripts/engine.mjs skills/inspiration/test/managed.test.ts skills/inspiration/test/engine.test.ts
```

- [ ] **Step 2: `cli.mjs` searches directly** — in `skills/inspiration/scripts/cli.mjs`:
  - delete the imports of `runEngine` and `searchWithAccount`; add `searchInspiration` to the `./search.mjs` import (`import { parseArgs, searchInspiration } from "./search.mjs";`);
  - replace `const result = await searchWithAccount({ query, runEngineFn: runEngine });` with `const result = await searchInspiration({ query });`;
  - replace the header comment with:

```js
// The inspiration skill's command for hosts without the Splash MCP tool: it reads the subject (argv or
// stdin), searches the gallery anonymously once, and prints what the journalist reads — or the
// structured result with --json. Under Indicator Labs the agent uses the `search_inspiration` tool
// instead, which can use the journalist's Infoviz account.
```

- [ ] **Step 3: `skills/inspiration/SKILL.md`**
  - **Architecture**: delete the `Path` (`scripts/managed.mjs`) and `Engine` (`scripts/engine.mjs`) rows; change the `Command` row's Role to `the anonymous search for hosts without the Splash MCP tool: reads the subject (argv or \`--stdin\`), prints the markdown or \`--json\`; exit 1 when there is no list, 2 on a usage error`.
  - **How it works** step 2 becomes: `2. **Choose the path.** Under Indicator Labs the agent calls the Splash MCP tool \`search_inspiration\`, which runs the search as \`bsig run splash inspiration-search\` when an Infoviz account is stored and directly otherwise; without that tool, \`cli.mjs\` searches anonymously.`
  - **Quick start**: replace the paragraph starting `With an Infoviz account connected in Indicator Labs` with:

```markdown
When the host exposes the Splash MCP tool `search_inspiration`, call it with the journalist's subject
instead of running a command: it uses the Infoviz account connected in Indicator Labs (10 searches a
day instead of 5) and returns the same text. Nothing about the account is ever done or said in chat;
if the account needs reconnecting, the text says so in its first line. The journalist connects the
account once, outside chat: sign in on https://splash.buriedsignals.com/inspiration.html, press
"Copy token for Indicator Labs", paste it in Indicator Labs → Connected services → Infoviz.
```

  - **Files**: delete the `scripts/managed.mjs`, `scripts/engine.mjs`, `test/managed.test.ts` and `test/engine.test.ts` bullets; change the `scripts/cli.mjs` bullet to `- \`scripts/cli.mjs\` — the anonymous command for hosts without the Splash MCP tool.`; add `- \`../../apps/goose/inspiration.mjs\` — \`createInspirationService\` — the account-aware search behind the Splash MCP tool \`search_inspiration\`.`
  - **Tuning knobs**: delete the `KEY_STATUS_TIMEOUT_MS` / `OPERATION_TIMEOUT_MS` row.
- [ ] **Step 4: `skills/splash/SKILL.md`** — in the `inspiration` routing bullet, after `hand over directly to \`inspiration\`` add ` (through the Splash MCP tool \`search_inspiration\` when the host has it)`.

- [ ] **Step 5: Checks**

```bash
grep -rn "managed.mjs\|engine.mjs\|searchWithAccount\|runEngine" skills/inspiration || echo "no leftovers"
bun test skills/inspiration/ skills/splash/test/skill-md-matches-code.test.ts skills/splash/test/phases.test.ts skills/splash/test/no-cross-skill-imports.test.ts
bun run test:lanes 2>&1 | tail -1
printf '   ' | bun skills/inspiration/scripts/cli.mjs --stdin; echo "exit $?"
```

Expected: `no leftovers`; tests pass; lanes pass; `Name a subject to search for.` then `exit 1`.

If `skill-md-matches-code` cannot resolve `../../apps/goose/inspiration.mjs` from the Files bullet, replace that bullet's path with `apps/goose/inspiration.mjs` (the guard also resolves from the repo root) and rerun.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/cli.mjs skills/inspiration/SKILL.md skills/splash/SKILL.md
git commit -m "refactor(inspiration): the account path lives in the Splash MCP; the command stays anonymous" -- skills/inspiration skills/splash/SKILL.md
```

---

### Task 4: A token to copy for Indicator Labs

**Files:**
- Modify: `landing/inspiration.html` (account line markup, CSS, script)

**Interfaces:**
- Consumes: `account` (in-memory `{token, email, expires_at}`), `$`, `drawAccount` (existing).
- Produces: `#acopy` button and `#acopied` status inside `#acct`.

- [ ] **Step 1: Markup** — in `div.quota#acct`, between `<span id="aemail"></span>` and `<button type="button" id="aout">Sign out</button>`, add:

```html
      <button type="button" id="acopy">Copy token for Indicator Labs</button>
      <span id="acopied" role="status" hidden></span>
```

- [ ] **Step 2: CSS** — next to the `#aout{…}` and `#aemail{…}` rules add:

```css
  #acct{flex-wrap:wrap}
  #acopy{flex:0 0 auto;white-space:nowrap}
  #acopied{flex:1 0 100%;white-space:normal}
```

- [ ] **Step 3: Script** — immediately after the `$('aout').addEventListener('click', () => { … });` block, add:

```js
  /* The token goes to the clipboard, never onto the page: the reader pastes it into Indicator Labs,
     whose protected prompt keeps it in the operating system's credential store. */
  let copiedTimer = 0;
  $('acopy').addEventListener('click', async () => {
    if (!account) return;
    const note = $('acopied');
    try {
      await navigator.clipboard.writeText(account.token);
      note.textContent = 'Copied. Paste it in Indicator Labs → Connected services → Infoviz → Enter token…';
    } catch {
      note.textContent = 'Your browser refused the clipboard.';
    }
    note.hidden = false;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { note.hidden = true; }, 8000);
  });
```

And in `drawAccount`, add as its last line: `$('acopied').hidden = true;`

- [ ] **Step 4: Checks**

```bash
grep -n "account.token" landing/inspiration.html
```

Expected: exactly two lines — `authHeaders` and the clipboard write. Extract the main `<script>` (the one containing `const API`) to `$TMPDIR/inspiration-main.js` and run `bun build --no-bundle $TMPDIR/inspiration-main.js --outfile $TMPDIR/inspiration-check.js` → exit 0. Check every `$('…')` id exists in the markup (`grep -oE "\\$\\('[a-zA-Z0-9]+'\\)"` vs `grep -oE 'id="[a-zA-Z0-9]+"'`).

- [ ] **Step 5: Commit**

```bash
git add landing/inspiration.html
git commit -m "feat(landing): copy the Infoviz token for Indicator Labs, without ever showing it" -- landing/inspiration.html
```

---

### Task 5: Verification

**Files:** none changed.

- [ ] **Step 1: Repository gates**

```bash
bun run test:lanes 2>&1 | tail -1
bun run test 2>&1 | tail -4
bun test apps/goose/test/server.test.ts 2>&1 | tail -3
bun run catalog:check 2>&1 | tail -1
bash tests/journalist-install-cta-check.sh; echo "cta exit $?"
git status --short
grep -rn "INFOVIZ_TOKEN" apps/goose/contract.mjs installer/setup/engine-bridge.mjs apps/goose/self-managed.mjs installer/setup/legacy-env.mjs .env.example || echo "no credential list touched"
```

Expected: all pass; clean tree; `no credential list touched`.

- [ ] **Step 2: The MCP tool against a fake Engine** (no network for the account path; the fake answers both calls)

```bash
D="$(mktemp -d)"
cat > "$D/bsig" <<'SH'
#!/bin/sh
cat >/dev/null
case "$*" in
  *"keys status INFOVIZ_TOKEN"*) printf '%s\n' '{"event":"result","data":{"id":"INFOVIZ_TOKEN","stored":true}}' ;;
  *"run splash inspiration-search"*) printf '%s\n' '{"event":"result","data":{"stdout":"{\"ok\":true,\"query\":\"floods\",\"items\":[],\"quota\":{\"limit\":10,\"remaining\":9,\"resetsAt\":null}}\n"}}' ;;
esac
SH
chmod +x "$D/bsig"
D="$D" bun -e '
import { createInspirationService } from "./apps/goose/inspiration.mjs";
import { invokeEngine } from "./installer/setup/engine-bridge.mjs";
const service = createInspirationService({ bsigPath: `${process.env.D}/bsig`, invokeEngineFn: invokeEngine });
const result = await service.search("floods");
console.log(service.format(result));
'
rm -rf "$D"
```

Expected: `Nothing in the gallery for “floods”.`, blank line, `9 of 10 searches left today.`

- [ ] **Step 3: The copy button in a browser** (desktop first, then 390 px) — a scratch copy of the page with a stub injected before the page's own script, so no network and no real token are involved:

```bash
S="$TMPDIR/inspiration-copy-check"; rm -rf "$S"; cp -R landing "$S"
python3 - "$S/inspiration.html" <<'INNER'
import sys
path = sys.argv[1]
page = open(path, encoding="utf-8").read()
stub = """<script>
window.__copied = null;
try { localStorage.setItem('infoviz.token', JSON.stringify({token:'test-token-abc',email:'reporter@example.org',expires_at:'2099-01-01T00:00:00Z'})); } catch {}
Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (v) => { window.__copied = v; } } });
const realFetch = window.fetch.bind(window);
window.fetch = async (url, init) => String(url).endsWith('/auth/status')
  ? new Response(JSON.stringify({authenticated:true,email:'reporter@example.org',daily_limit:10,queries_remaining:10,queries_used:0,resets_at:null}), {status:200, headers:{'content-type':'application/json'}})
  : realFetch(url, init);
</script>"""
assert page.count("<head>") == 1
open(path, "w", encoding="utf-8").write(page.replace("<head>", "<head>" + stub, 1))
INNER
(cd "$S" && python3 -m http.server 5174 --bind 127.0.0.1 > "$S/http.log" 2>&1 &)
sleep 1
browser-use open http://localhost:5174/inspiration.html >/dev/null; sleep 3
browser-use eval "JSON.stringify({acct: !document.getElementById('acct').hidden, copyButton: !!document.getElementById('acopy')})"
browser-use eval "document.getElementById('acopy').click(); 'ok'" >/dev/null; sleep 1
browser-use eval "JSON.stringify({copied: window.__copied, note: document.getElementById('acopied').textContent, noteVisible: !document.getElementById('acopied').hidden, tokenOnPage: document.body.innerText.includes('test-token-abc')})"
browser-use screenshot "$S/copy-desktop.png" >/dev/null
browser-use close >/dev/null
pkill -f "http.server 5174"
```

Expected: `{"acct":true,"copyButton":true}`; then `copied` = `test-token-abc`, `note` = the confirmation sentence, `noteVisible` true, `tokenOnPage` false. Then check the 390 px layout of the hero bar (account line, copy button, sign out, confirmation wrapping) with a Puppeteer script like the plan-4 mobile check (viewport 390×844, `isMobile: true`), screenshot `$S/copy-mobile.png`, and confirm no horizontal overflow (`document.documentElement.scrollWidth === 390`). Record observations and screenshot paths in the ledger.

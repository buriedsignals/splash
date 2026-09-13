# Inspiration 03 — the `inspiration` skill, anonymous — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Splash a story-less `inspiration` skill: the journalist names a subject, the agent runs one search against the infoviz.design gallery and shows the raw list (title, newsroom, date, link) with the day's remaining quota.

**Architecture:** Two small ESM scripts inside `skills/inspiration/`: `search.mjs` makes one bounded, never-throwing request and returns a structured result; `format.mjs` turns that result into the exact words the journalist reads. The skill is not a phase: `whereIs` never sees it, it creates no story and opens no gate. The orchestrator's `## When to use` routes to it. Anonymous only — the account (10 searches a day) arrives with Part 2.

**Tech Stack:** Bun (ESM `.mjs` scripts, `bun:test` TypeScript tests), no dependencies.

**Spec:** `docs/superpowers/specs/2026-09-13-inspiration-journey-design.md` — Part 3.

## Global Constraints

- Worktree: `/Users/rmdms/Sites/Professional/splash/feat-inspiration`, branch `feat-inspiration`. Run every command from the worktree root. **Never push, never merge.**
- Runtime: Bun only (`bun`, `bun test`) — never npm or node.
- Code, comments, copy, commit messages in English. No mention of Claude/Anthropic anywhere; commits carry no trailer of any kind.
- API: `https://infoviz.design`, endpoint `POST /api/graphics/examples` with JSON `{"query": "<subject>"}`; response `{query, items:[{title, source, date, url, image}]}`, headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; `429 {error, limit, resets_at, authenticated}` when the day's quota is spent. Anonymous quota: 5 per day per address.
- Longest subject sent: **1000** characters. Request deadline (request and body together): **15000** ms.
- One request per search. No retry, no reformulation, no second query.
- The skill never imports anything outside `skills/inspiration/` (`skills/splash/test/no-cross-skill-imports.test.ts`). Tests may.
- No credential, no preflight capability, no `CREDENTIAL_IDS` change in this plan (spec Part 3: adding `INFOVIZ_TOKEN` before Engine knows it breaks every credential).
- A test that makes a real network call lives in a `*.live.test.ts` file and runs only when `SPLASH_LIVE_INFOVIZ=1` (it spends one of the day's anonymous searches).
- Green gate: `bun run test:lanes` passes, and the fast lane (`bun run test`) has no new failure against the Task 0 baseline.

---

### Task 0: Install and baseline

**Files:** none.

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/rmdms/Sites/Professional/splash/feat-inspiration
bun --version
bun install --frozen-lockfile
```

Expected: install completes. If `--frozen-lockfile` refuses because the lockfile is out of date, run `bun install` and do **not** commit the lockfile change; note it in the ledger.

- [ ] **Step 2: Record the baseline**

```bash
bun run test:lanes 2>&1 | tail -3
bun run test 2>&1 | tail -6
bash tests/journalist-install-cta-check.sh; echo "cta exit $?"
```

Record the pass/fail counts and any failing test names in the execution ledger. Those are the pre-existing reds.

---

### Task 1: The search request

**Files:**
- Create: `skills/inspiration/scripts/search.mjs`
- Test: `skills/inspiration/test/search.test.ts`

**Interfaces:**
- Produces: `searchInspiration({ query, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, apiBase = INFOVIZ_API }) → Promise<Result>` where `Result` is one of
  - `{ ok: true, query: string, items: Item[], quota: { limit: number|null, remaining: number|null, resetsAt: string|null } }`
  - `{ ok: false, reason: "empty-query" }`
  - `{ ok: false, reason: "query-too-long", limit: number }`
  - `{ ok: false, reason: "limit-reached", query: string, quota: { limit: number|null, remaining: 0, resetsAt: string|null } }`
  - `{ ok: false, reason: "unexpected-response", status: number }`
  - `{ ok: false, reason: "unreachable", detail: string }`
- Produces: `normaliseItems(items) → Item[]`, `Item = { title: string, source: string|null, date: string|null, url: string, image: string|null }`
- Produces constants: `INFOVIZ_API = "https://infoviz.design"`, `DEFAULT_TIMEOUT_MS = 15_000`, `MAX_QUERY_LENGTH = 1000`.

- [ ] **Step 1: Write the failing tests** — `skills/inspiration/test/search.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import {
  searchInspiration,
  normaliseItems,
  INFOVIZ_API,
  MAX_QUERY_LENGTH,
} from "../scripts/search.mjs";

const RESET = "2026-09-14T00:00:00+00:00";

const ITEM = {
  title: "Mapping the floods that swallowed Pakistan",
  source: "Reuters Graphics",
  date: "2022-09-01T00:00:00+00:00",
  url: "https://example.org/floods-pakistan",
  image: "https://example.org/1.jpg",
};

function answer(items, { limit = "5", remaining = "4" } = {}) {
  return async () =>
    new Response(JSON.stringify({ query: "floods", items }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": limit,
        "x-ratelimit-remaining": remaining,
        "x-ratelimit-reset": RESET,
      },
    });
}

describe("searchInspiration", () => {
  it("should return the items and the quota the gallery reports", async () => {
    const result = await searchInspiration({ query: "floods", fetchFn: answer([ITEM]) });
    expect(result).toEqual({
      ok: true,
      query: "floods",
      items: [ITEM],
      quota: { limit: 5, remaining: 4, resetsAt: RESET },
    });
  });

  it("should send one POST with the trimmed subject and its own user agent", async () => {
    const calls: { url: string; init: any }[] = [];
    const fetchFn = async (url, init) => {
      calls.push({ url: String(url), init });
      return answer([])();
    };
    await searchInspiration({ query: "  floods  ", fetchFn });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${INFOVIZ_API}/api/graphics/examples`);
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body)).toEqual({ query: "floods" });
    expect(calls[0].init.headers["user-agent"]).toStartWith("splash-inspiration/");
  });

  it("should refuse an empty subject without calling the gallery", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return answer([])();
    };
    expect(await searchInspiration({ query: "   ", fetchFn })).toEqual({ ok: false, reason: "empty-query" });
    expect(called).toBe(false);
  });

  it("should refuse a subject longer than the gallery accepts without calling it", async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return answer([])();
    };
    const result = await searchInspiration({ query: "x".repeat(MAX_QUERY_LENGTH + 1), fetchFn });
    expect(result).toEqual({ ok: false, reason: "query-too-long", limit: MAX_QUERY_LENGTH });
    expect(called).toBe(false);
  });

  it("should report the daily limit and its reset time on 429", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({ error: "Daily query limit reached", limit: 5, resets_at: RESET, authenticated: false }),
        { status: 429, headers: { "x-ratelimit-limit": "5", "x-ratelimit-remaining": "0" } },
      );
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "limit-reached",
      query: "floods",
      quota: { limit: 5, remaining: 0, resetsAt: RESET },
    });
  });

  it("should report an unexpected status as such", async () => {
    const fetchFn = async () => new Response("boom", { status: 500 });
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "unexpected-response",
      status: 500,
    });
  });

  it("should report a 200 that is not JSON as unexpected", async () => {
    const fetchFn = async () => new Response("<html>challenge</html>", { status: 200 });
    expect(await searchInspiration({ query: "floods", fetchFn })).toEqual({
      ok: false,
      reason: "unexpected-response",
      status: 200,
    });
  });

  it("should report a fetch that throws as unreachable", async () => {
    const fetchFn = async () => {
      throw new Error("getaddrinfo ENOTFOUND infoviz.design");
    };
    const result = await searchInspiration({ query: "floods", fetchFn });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unreachable");
    expect(result.detail).toContain("ENOTFOUND");
  });

  it("should give up on a request that never answers", async () => {
    const started = Date.now();
    const result = await searchInspiration({
      query: "floods",
      fetchFn: () => new Promise(() => {}),
      timeoutMs: 40,
    });
    expect(Date.now() - started).toBeLessThan(500);
    expect(result.reason).toBe("unreachable");
    expect(result.detail).toMatch(/timed out/);
  });

  it("should give up on a body that never finishes", async () => {
    const started = Date.now();
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => new Promise(() => {}),
    });
    const result = await searchInspiration({ query: "floods", fetchFn, timeoutMs: 40 });
    expect(Date.now() - started).toBeLessThan(500);
    expect(result.reason).toBe("unreachable");
  });
});

describe("normaliseItems", () => {
  it("should keep only items with a title and an http(s) link", () => {
    const items = normaliseItems([
      ITEM,
      { ...ITEM, title: "" },
      { ...ITEM, url: "javascript:alert(1)" },
      { ...ITEM, url: undefined },
      null,
    ]);
    expect(items).toEqual([ITEM]);
  });

  it("should blank an image that is not an http(s) URL", () => {
    expect(normaliseItems([{ ...ITEM, image: "data:image/png;base64,AAAA" }])[0].image).toBeNull();
  });

  it("should turn a missing newsroom and date into null", () => {
    const [item] = normaliseItems([{ title: "A", url: "https://example.org/a" }]);
    expect(item).toEqual({ title: "A", source: null, date: null, url: "https://example.org/a", image: null });
  });

  it("should answer an empty list for anything that is not an array", () => {
    expect(normaliseItems(undefined)).toEqual([]);
    expect(normaliseItems({ items: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test skills/inspiration/test/search.test.ts`
Expected: FAIL — `Cannot find module '../scripts/search.mjs'`.

- [ ] **Step 3: Implement** — `skills/inspiration/scripts/search.mjs`

```js
// One search against the infoviz.design gallery, one honest answer. The gallery rations searches
// per address, so this file never retries and never rephrases: it sends the journalist's subject
// once, under one deadline that covers the request and its body, and returns either the list or
// the reason there is none. It never throws.

export const INFOVIZ_API = "https://infoviz.design";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_QUERY_LENGTH = 1000;

// Names the requester in the gallery's access log; some edge filters refuse anonymous clients.
const USER_AGENT = "splash-inspiration/1 (+https://github.com/buriedsignals/splash)";

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Keeps what a journalist can open: an item needs a title and an http(s) link; every other field
 * is optional and becomes null when absent or unusable.
 */
export function normaliseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && text(item.title) && isHttpUrl(item.url))
    .map((item) => ({
      title: text(item.title),
      source: text(item.source),
      date: text(item.date),
      url: item.url,
      image: isHttpUrl(item.image) ? item.image : null,
    }));
}

function readQuota(headers) {
  const number = (name) => {
    const raw = headers?.get?.(name);
    if (raw === null || raw === undefined) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  };
  return {
    limit: number("x-ratelimit-limit"),
    remaining: number("x-ratelimit-remaining"),
    resetsAt: headers?.get?.("x-ratelimit-reset") ?? null,
  };
}

async function withDeadline(work, controller, timeoutMs) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches the gallery once for `query`.
 */
export async function searchInspiration({
  query,
  fetchFn = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  apiBase = INFOVIZ_API,
} = {}) {
  const subject = typeof query === "string" ? query.trim() : "";
  if (!subject) return { ok: false, reason: "empty-query" };
  if (subject.length > MAX_QUERY_LENGTH) return { ok: false, reason: "query-too-long", limit: MAX_QUERY_LENGTH };

  const controller = new AbortController();
  const exchange = (async () => {
    const response = await fetchFn(`${apiBase}/api/graphics/examples`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": USER_AGENT },
      body: JSON.stringify({ query: subject }),
      signal: controller.signal,
    });
    const quota = readQuota(response.headers);
    const body = await response.json().catch(() => null);

    if (response.status === 429) {
      return {
        ok: false,
        reason: "limit-reached",
        query: subject,
        quota: {
          limit: Number.isFinite(body?.limit) ? body.limit : quota.limit,
          remaining: 0,
          resetsAt: text(body?.resets_at) ?? quota.resetsAt,
        },
      };
    }
    if (!response.ok || body === null || typeof body !== "object") {
      return { ok: false, reason: "unexpected-response", status: response.status };
    }
    return { ok: true, query: subject, items: normaliseItems(body.items), quota };
  })();

  try {
    return await withDeadline(exchange, controller, timeoutMs);
  } catch (error) {
    return { ok: false, reason: "unreachable", detail: error.message };
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test skills/inspiration/test/search.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Mutation checks** (break, run the file, see the named test red, revert; `git diff skills/inspiration/scripts` must be empty of the mutation afterwards)
  - Remove the `if (response.status === 429)` block → `should report the daily limit and its reset time on 429` red.
  - Move `const body = await response.json()...` outside `exchange` so it is awaited after `withDeadline` returns → `should give up on a body that never finishes` red.
  - Delete `&& isHttpUrl(item.url)` from the filter → `should keep only items with a title and an http(s) link` red.

- [ ] **Step 6: Commit**

```bash
git add skills/inspiration/scripts/search.mjs skills/inspiration/test/search.test.ts
git commit -m "feat(inspiration): one bounded search against the infoviz gallery, never thrown"
```

---

### Task 2: The words the journalist reads, and the command line

**Files:**
- Create: `skills/inspiration/scripts/format.mjs`
- Modify: `skills/inspiration/scripts/search.mjs` (append the command-line entry)
- Test: `skills/inspiration/test/format.test.ts`

**Interfaces:**
- Consumes: the `Result` shapes from Task 1.
- Produces: `formatInspiration(result) → string` (markdown).
- Produces: command line `bun skills/inspiration/scripts/search.mjs <subject…> [--json]` — prints `formatInspiration(result)` (or the JSON result with `--json`); exit code 0 when `result.ok`, 1 otherwise.

- [ ] **Step 1: Write the failing tests** — `skills/inspiration/test/format.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { formatInspiration } from "../scripts/format.mjs";

const QUOTA = { limit: 5, remaining: 4, resetsAt: "2026-09-14T00:00:00+00:00" };

describe("formatInspiration", () => {
  it("should number each visual with its link, newsroom and date, then the quota left", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      quota: QUOTA,
      items: [
        { title: "Mapping the floods", source: "Reuters Graphics", date: "2022-09-01T00:00:00+00:00", url: "https://example.org/a", image: null },
        { title: "Europe's floods", source: "Financial Times", date: "2024-06-12T00:00:00+00:00", url: "https://example.org/b", image: null },
      ],
    });
    expect(text).toBe(
      [
        "2 published visuals for “floods”:",
        "",
        "1. [Mapping the floods](https://example.org/a) — Reuters Graphics, 2022-09-01",
        "2. [Europe's floods](https://example.org/b) — Financial Times, 2024-06-12",
        "",
        "4 of 5 searches left today.",
      ].join("\n"),
    );
  });

  it("should say one visual in the singular", () => {
    const text = formatInspiration({
      ok: true,
      query: "heat",
      quota: QUOTA,
      items: [{ title: "Heat", source: "The Guardian", date: null, url: "https://example.org/h", image: null }],
    });
    expect(text.split("\n")[0]).toBe("1 published visual for “heat”:");
    expect(text).toContain("1. [Heat](https://example.org/h) — The Guardian");
  });

  it("should keep a title with brackets and a link with parentheses intact as markdown", () => {
    const text = formatInspiration({
      ok: true,
      query: "x",
      quota: QUOTA,
      items: [{ title: "Floods [interactive]", source: null, date: null, url: "https://example.org/a_(b) c", image: null }],
    });
    expect(text).toContain("1. [Floods \\[interactive\\]](https://example.org/a_%28b%29%20c) — newsroom unknown");
  });

  it("should say plainly when the gallery has nothing on the subject", () => {
    expect(formatInspiration({ ok: true, query: "floods", items: [], quota: QUOTA })).toBe(
      "Nothing in the gallery for “floods”.\n\n4 of 5 searches left today.",
    );
  });

  it("should leave out the quota line when the gallery did not report one", () => {
    const text = formatInspiration({
      ok: true,
      query: "floods",
      items: [],
      quota: { limit: null, remaining: null, resetsAt: null },
    });
    expect(text).toBe("Nothing in the gallery for “floods”.");
  });

  it("should give the daily limit and the reset time when the quota is spent", () => {
    expect(
      formatInspiration({ ok: false, reason: "limit-reached", query: "floods", quota: { limit: 5, remaining: 0, resetsAt: "2026-09-14T00:00:00+00:00" } }),
    ).toBe("The gallery's daily limit is reached (5 searches a day). It resets at 2026-09-14T00:00:00+00:00.");
  });

  it("should fall back to midnight UTC when the reset time is unknown", () => {
    expect(
      formatInspiration({ ok: false, reason: "limit-reached", query: "floods", quota: { limit: null, remaining: 0, resetsAt: null } }),
    ).toBe("The gallery's daily limit is reached. It resets at midnight UTC.");
  });

  it("should name why the gallery could not be reached", () => {
    expect(formatInspiration({ ok: false, reason: "unreachable", detail: "timed out after 15000ms" })).toBe(
      "infoviz.design could not be reached (timed out after 15000ms).",
    );
  });

  it("should report an unexpected answer with its status", () => {
    expect(formatInspiration({ ok: false, reason: "unexpected-response", status: 503 })).toBe(
      "infoviz.design answered with status 503, so there is no list to show.",
    );
  });

  it("should ask for a subject when there was none", () => {
    expect(formatInspiration({ ok: false, reason: "empty-query" })).toBe("Name a subject to search for.");
  });

  it("should ask for a shorter subject when it was too long", () => {
    expect(formatInspiration({ ok: false, reason: "query-too-long", limit: 1000 })).toBe(
      "Keep the subject under 1000 characters.",
    );
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test skills/inspiration/test/format.test.ts`
Expected: FAIL — `Cannot find module '../scripts/format.mjs'`.

- [ ] **Step 3: Implement** — `skills/inspiration/scripts/format.mjs`

```js
// The words a journalist reads after an inspiration search. Every sentence the skill says about a
// result is decided here, so the agent never paraphrases a quota, never guesses a reset time and
// never invents a reason the gallery did not give.

function escapeLinkText(title) {
  return title.replace(/[[\]\\]/g, "\\$&");
}

// Parentheses and spaces would end a markdown link target early.
function escapeLinkTarget(url) {
  return url.replace(/[() ]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function quotaLine(quota) {
  if (!quota || quota.remaining === null || quota.remaining === undefined) return null;
  const of = quota.limit === null || quota.limit === undefined ? "" : ` of ${quota.limit}`;
  return `${quota.remaining}${of} searches left today.`;
}

function formatFailure(result) {
  switch (result.reason) {
    case "empty-query":
      return "Name a subject to search for.";
    case "query-too-long":
      return `Keep the subject under ${result.limit} characters.`;
    case "limit-reached": {
      const perDay = result.quota?.limit ? ` (${result.quota.limit} searches a day)` : "";
      const reset = result.quota?.resetsAt ?? "midnight UTC";
      return `The gallery's daily limit is reached${perDay}. It resets at ${reset}.`;
    }
    case "unexpected-response":
      return `infoviz.design answered with status ${result.status}, so there is no list to show.`;
    case "unreachable":
      return `infoviz.design could not be reached (${result.detail}).`;
    default:
      return "The search did not complete.";
  }
}

/**
 * Renders a `searchInspiration` result as markdown for the journalist.
 */
export function formatInspiration(result) {
  if (!result.ok) return formatFailure(result);

  const { query, items, quota } = result;
  const lines = [];
  if (items.length === 0) {
    lines.push(`Nothing in the gallery for “${query}”.`);
  } else {
    lines.push(`${items.length} published ${items.length === 1 ? "visual" : "visuals"} for “${query}”:`, "");
    items.forEach((item, index) => {
      const credit = [item.source ?? "newsroom unknown", item.date ? item.date.slice(0, 10) : null]
        .filter(Boolean)
        .join(", ");
      lines.push(`${index + 1}. [${escapeLinkText(item.title)}](${escapeLinkTarget(item.url)}) — ${credit}`);
    });
  }

  const left = quotaLine(quota);
  if (left) lines.push("", left);
  return lines.join("\n");
}
```

- [ ] **Step 4: Append the command line to `skills/inspiration/scripts/search.mjs`**

Add at the top, after the header comment block and before `export const INFOVIZ_API`:

```js
import { formatInspiration } from "./format.mjs";
```

Add at the end of the file:

```js
if (import.meta.main) {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const query = args.filter((arg) => arg !== "--json").join(" ");
  const result = await searchInspiration({ query });
  console.log(asJson ? JSON.stringify(result, null, 2) : formatInspiration(result));
  if (!result.ok) process.exitCode = 1;
}
```

- [ ] **Step 5: Run the tests**

Run: `bun test skills/inspiration/test/format.test.ts skills/inspiration/test/search.test.ts`
Expected: PASS (11 + 14).

- [ ] **Step 6: Check the command line without spending quota**

```bash
bun skills/inspiration/scripts/search.mjs "   "; echo "exit $?"
bun skills/inspiration/scripts/search.mjs --json; echo "exit $?"
```

Expected: `Name a subject to search for.` then `exit 1`; the JSON `{"ok": false, "reason": "empty-query"}` then `exit 1`. Neither contacts the gallery.

- [ ] **Step 7: Mutation checks** (break, run `format.test.ts`, see red, revert)
  - In `escapeLinkTarget`, return `url` unchanged → `should keep a title with brackets and a link with parentheses intact as markdown` red.
  - In `formatFailure`, replace `?? "midnight UTC"` with `?? ""` → `should fall back to midnight UTC when the reset time is unknown` red.

- [ ] **Step 8: Commit**

```bash
git add skills/inspiration/scripts/format.mjs skills/inspiration/scripts/search.mjs skills/inspiration/test/format.test.ts
git commit -m "feat(inspiration): the list the journalist reads, and a command line to run it"
```

---

### Task 3: The skill contract

**Files:**
- Create: `skills/inspiration/SKILL.md`
- Create: `skills/inspiration/test/search.live.test.ts`

**Interfaces:**
- Consumes: `searchInspiration`, `normaliseItems`, `DEFAULT_TIMEOUT_MS`, `MAX_QUERY_LENGTH`, `INFOVIZ_API` (`scripts/search.mjs`); `formatInspiration` (`scripts/format.mjs`).
- Produces: a `SKILL.md` whose `## Architecture`, `## Tuning knobs` and `## Files` sections satisfy `skills/splash/test/skill-md-matches-code.test.ts` (every backticked path resolves; every identifier named beside a code path appears in that file).

- [ ] **Step 1: Write `skills/inspiration/SKILL.md`**

````markdown
---
name: inspiration
description: Use when a journalist wants to see what newsrooms have already published on a subject — before a story exists, during one, or with no intention of producing anything — by searching the infoviz.design gallery once and showing the raw list (title, newsroom, date, link) with the searches left today. Needs no story directory, opens no gate, produces nothing.
---

# inspiration — what newsrooms already made of a subject

## Overview

A journalist often wants to look before they build: how did other newsrooms show floods, an
election night, a heatwave? The infoviz.design gallery indexes thousands of published charts, maps
and interactives. This skill asks it once and puts the answer in front of the journalist as a
plain numbered list — the title linked to the original, the newsroom, the date — followed by how
many searches are left today.

It is a separate journey, not a phase. It never creates or reads a story directory, never opens a
gate, never hands over to a craft skill, and never decides that one of the results is the right
treatment. What the journalist does with the list is theirs.

Three rules shape it:

1. **One search per request.** The gallery rations searches per address (five a day without an
   account). The skill sends the journalist's own subject once. It never rephrases, never retries
   with other words, and never runs a second query to "improve" the list.
2. **The raw list, unedited.** No ranking, no summary, no grouping by technique. An empty list is
   said as an empty list.
3. **The quota is always said.** After every search, the searches left today; when none are left,
   the time the count resets.

## When to use

- The journalist asks what has already been done on a subject, wants examples, precedent or
  inspiration — with or without a story, with or without the intent to produce anything.
- Run it with the journalist's subject as they said it. If they gave no subject, ask for one before
  running anything.
- **Not** a substitute for the storyboard's reference loop, and **not** a step of the production
  flow: it does not move a story forward and `whereIs` does not know it.
- **Not** for choosing a treatment on the journalist's behalf.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Request | `scripts/search.mjs` | `searchInspiration({query, fetchFn, timeoutMs, apiBase})` — one POST under one deadline covering request and body; returns the list and quota, or the reason there is none; never throws |
| Words | `scripts/format.mjs` | `formatInspiration(result)` — the numbered list, the quota line, or the plain sentence for each failure |

## How it works (the shape)

1. **Check the subject.** Blank → `empty-query`; longer than the gallery accepts → `query-too-long`.
   Neither contacts the gallery.
2. **Ask once.** `POST https://infoviz.design/api/graphics/examples` with `{"query": subject}`, read
   `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
3. **Keep what can be opened.** An item needs a title and an http(s) link; newsroom, date and image
   become null when missing.
4. **Say it.** `formatInspiration` renders the list and the searches left, or the reason:
   `limit-reached` (with the reset time), `unexpected-response` (with the status), `unreachable`
   (with the cause).

## Quick start

```bash
bun skills/inspiration/scripts/search.mjs "floods in Pakistan"
bun skills/inspiration/scripts/search.mjs "election night maps" --json
```

The first prints the markdown to show the journalist as it is. The second prints the structured
result. Both exit with code 1 when there is no list.

```js
import { searchInspiration } from "./scripts/search.mjs";
import { formatInspiration } from "./scripts/format.mjs";

const result = await searchInspiration({ query: "heatwaves" });
console.log(formatInspiration(result));
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How long one search may run, request and body together | `15000` ms | `DEFAULT_TIMEOUT_MS`, `search.mjs` (override via `searchInspiration({timeoutMs})`) |
| The longest subject sent to the gallery | `1000` characters | `MAX_QUERY_LENGTH`, `search.mjs` |
| Which gallery is asked | `https://infoviz.design` | `INFOVIZ_API`, `search.mjs` (override via `searchInspiration({apiBase})`) |

## Files

- `scripts/search.mjs` — `searchInspiration`, `normaliseItems` — the one bounded request and the
  item filter; also the command line.
- `scripts/format.mjs` — `formatInspiration` — every sentence the journalist reads.
- `test/search.test.ts` — the request, the 429, the unexpected answers, the hung request and the
  stalled body, against stubbed responses.
- `test/format.test.ts` — the rendered list, the markdown escaping, and each failure sentence.
- `test/search.live.test.ts` — one real search, run only with `SPLASH_LIVE_INFOVIZ=1` because it
  spends one of the day's searches.
````

- [ ] **Step 2: Write the live test** — `skills/inspiration/test/search.live.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { searchInspiration } from "../scripts/search.mjs";

// A real search spends one of the day's anonymous searches for this address, so it runs only when
// asked for explicitly.
describe("against the real infoviz.design gallery", () => {
  const enabled = process.env.SPLASH_LIVE_INFOVIZ === "1";
  if (!enabled) {
    console.log("Skipping live infoviz search: set SPLASH_LIVE_INFOVIZ=1 to spend one anonymous search.");
  }

  it.skipIf(!enabled)(
    "should return a list, or say the daily limit is reached, for a real subject",
    async () => {
      const result = await searchInspiration({ query: "floods" });
      if (!result.ok) {
        expect(result.reason).toBe("limit-reached");
        return;
      }
      expect(Array.isArray(result.items)).toBe(true);
      for (const item of result.items) {
        expect(item.url).toStartWith("http");
        expect(item.title.length).toBeGreaterThan(0);
      }
      expect(result.quota.limit).toBeGreaterThan(0);
    },
    30000,
  );
});
```

- [ ] **Step 3: Run the guards that read every skill**

```bash
bun test skills/splash/test/skill-md-matches-code.test.ts skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/carried-copies.test.ts skills/splash/test/the-key-has-one-home.test.ts
bun test skills/inspiration/
bun run test:lanes 2>&1 | tail -3
```

Expected: all pass; `skills/inspiration/test/search.live.test.ts` is classified **live**, the other two **fast**; the live test prints its skip line.

- [ ] **Step 4: Mutation check** — in `SKILL.md`'s Tuning knobs, rename `DEFAULT_TIMEOUT_MS` to `DEFAULT_TIMEOUT` → `skill-md-matches-code.test.ts` red; revert.

- [ ] **Step 5: Commit**

```bash
git add skills/inspiration/SKILL.md skills/inspiration/test/search.live.test.ts
git commit -m "feat(inspiration): the skill contract, and a live search that runs only when asked"
```

---

### Task 4: Routing and the hand-kept inventories

**Files:**
- Modify: `skills/splash/SKILL.md` (`## When to use`)
- Create: `.agents/skills/inspiration` (relative symlink)
- Create: `skills/inspiration/test/routing.test.ts`
- Modify: `README.md` (line 7, the skills table, line 257)
- Modify: `llms.txt` (`## Skill contracts`)
- Modify: `llms_full.txt` (`## 16. Executable skill contracts`)
- Modify: `tests/journalist-install-cta-check.sh` (line 19)
- Modify: `landing/docs/index.html` (lines 8, 15, 23, 311 and the skills grid)

**Interfaces:**
- Consumes: the skill directory from Tasks 1-3.

- [ ] **Step 1: Write the failing test** — `skills/inspiration/test/routing.test.ts`

```ts
import { describe, it, expect } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

const SKILL_DIR = join(import.meta.dir, "..");
const REPO = join(SKILL_DIR, "..", "..");

function section(markdown: string, header: string) {
  const start = markdown.indexOf(`\n## ${header}\n`);
  if (start === -1) return "";
  const rest = markdown.slice(start + header.length + 5);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

describe("inspiration is reachable", () => {
  it("should be routed from the orchestrator's When to use", () => {
    const orchestrator = readFileSync(join(REPO, "skills", "splash", "SKILL.md"), "utf8");
    expect(section(orchestrator, "When to use")).toContain("`inspiration`");
  });

  it("should be linked into the agents store like every other skill", () => {
    expect(realpathSync(join(REPO, ".agents", "skills", "inspiration"))).toBe(realpathSync(SKILL_DIR));
  });

  it("should be counted in the full LLM reference", () => {
    const full = readFileSync(join(REPO, "llms_full.txt"), "utf8");
    expect(full).toContain("currently ships 17 directories containing executable `SKILL.md` contracts");
    expect(full).toContain("- `inspiration`:");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test skills/inspiration/test/routing.test.ts`
Expected: FAIL on all three.

- [ ] **Step 3: Route from the orchestrator** — in `skills/splash/SKILL.md`, insert this bullet immediately **before** the bullet that starts `- **Not** for writing a chart, map, brief, or export`:

```markdown
- When the journalist wants to see what newsrooms have already published on a subject — with or
  without a story, with or without the intent to produce anything — hand over to `inspiration`.
  It creates no story, opens no gate and is never a phase: `whereIs` does not know it, and it does
  not move a story forward.
```

- [ ] **Step 4: Link the skill into the agents store**

```bash
ln -s ../../skills/inspiration .agents/skills/inspiration
ls -l .agents/skills/inspiration
```

Expected: `.agents/skills/inspiration -> ../../skills/inspiration`.

- [ ] **Step 5: Update the inventories and counts** (exact edits)

`README.md`:
- line 7: `16 skills, 4 formats, local-first.` → `17 skills, 4 formats, local-first.`
- line 257: `All 16 skills use the \`splash:\` namespace` → `All 17 skills use the \`splash:\` namespace`
- in the skills table, after the row ``| `newsroom-charter` | Newsroom configuration and constraints. |`` add:
  ``| `inspiration` | What newsrooms have already published on a subject. |``

`llms.txt`, after the `newsroom-charter` line under `## Skill contracts`, add:

```
- [inspiration](https://github.com/buriedsignals/splash/blob/main/skills/inspiration/SKILL.md): what newsrooms have already published on a subject
```

`llms_full.txt`:
- `The repository currently ships 16 directories containing executable \`SKILL.md\` contracts:` → `17 directories`
- after the line ``- `newsroom-charter`: measured newsroom configuration and constraints`` add:
  ``- `inspiration`: what newsrooms have already published on a subject, searched without a story``

`tests/journalist-install-cta-check.sh` line 19: `currently ships 16 directories` → `currently ships 17 directories`.

`landing/docs/index.html`:
- lines 8, 15, 23 and 311: `sixteen skills` → `seventeen skills` (four occurrences; check with `grep -c "seventeen skills" landing/docs/index.html` → `4` and `grep -c "sixteen" landing/docs/index.html` → `0`).
- in the skills grid, after the `newsroom-charter` cell, add:

```html
    <div class="cell"><span class="tag">Reference</span><b><code>inspiration</code></b><p>Shows what newsrooms have already published on a subject — no story needed.</p></div>
```

- [ ] **Step 6: Run the checks**

```bash
bun test skills/inspiration/ skills/splash/test/phases.test.ts skills/splash/test/skill-md-matches-code.test.ts
bash tests/journalist-install-cta-check.sh; echo "cta exit $?"
bun run landing:check 2>&1 | tail -3
```

Expected: tests pass; CTA check exit 0; `landing:check` passes.

- [ ] **Step 7: Mutation check** — remove the new bullet from `skills/splash/SKILL.md` → `should be routed from the orchestrator's When to use` red; restore.

- [ ] **Step 8: Commit**

```bash
git add skills/splash/SKILL.md .agents/skills/inspiration skills/inspiration/test/routing.test.ts README.md llms.txt llms_full.txt tests/journalist-install-cta-check.sh landing/docs/index.html
git commit -m "feat(inspiration): routed from the orchestrator and counted where the skills are listed"
```

---

### Task 5: Verification

**Files:** none changed (a failure here goes back to the task that owns it).

- [ ] **Step 1: The repository gates**

```bash
bun run test:lanes 2>&1 | tail -3
bun run test 2>&1 | tail -6
bun run catalog:check 2>&1 | tail -2
bash tests/journalist-install-cta-check.sh; echo "cta exit $?"
```

Expected: lanes check passes; fast lane has no failure outside the Task 0 baseline; catalog check passes; CTA exit 0.

- [ ] **Step 2: One real search** (spends one anonymous search for this machine's address today)

```bash
bun skills/inspiration/scripts/search.mjs "floods"; echo "exit $?"
```

Expected: a numbered list of real published visuals with links, then `N of 5 searches left today.`, `exit 0` — or, if the address has already spent its five, the daily-limit sentence with the reset time and `exit 1`. Paste the output into the ledger.

- [ ] **Step 3: The live test once**

```bash
SPLASH_LIVE_INFOVIZ=1 bun test skills/inspiration/test/search.live.test.ts
```

Expected: PASS (a list, or the honest limit answer).

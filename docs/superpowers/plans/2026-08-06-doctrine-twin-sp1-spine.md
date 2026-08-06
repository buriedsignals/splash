# Doctrine Twin — SP1 "The Spine" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An article and its data go in; a bespoke static chart comes out; every gate closes into a file on disk.

**Architecture:** Twelve prose-first skills live under `twin/skills/`. Each owns its own dependency-free `.mjs` scripts — there is no shared engine. The journalist's work happens in a *Splash root*, a folder installed once that holds dependencies, probed keys, `NEWSROOM.md`, and one `stories/<slug>/` workspace per article. The orchestrator holds no state: a story's phase is recovered by reading its directory. SP1 builds only the spine — `chart-beat` limited to the `static` genre, no assembly, no video.

**Tech Stack:** Bun · TypeScript · `bun:test` · React + D3 (in the Splash root only) · plain ESM `.mjs` for every skill script.

**Spec:** `docs/superpowers/specs/2026-08-06-splash-doctrine-twin-design.md` §11 SP1.

## Global Constraints

- **English only.** Every file in this branch — prose, code, comments, commits, skill text. No exceptions.
- **Runtime is Bun.** Never `npm`, never `node`. Tests are `bun:test`.
- **No vendor attribution.** No mention of Claude or Anthropic in any artifact, commit, or doc.
- **Isolation is mechanical.** Nothing under `twin/` may import from, read, or reference `skills/`. Harvesting from `main` is read-and-rewrite by a human-reviewed step, never a copy that keeps a link.
- **Skill ids are namespaced.** Orchestrator is `splash-twin`; every other skill is `twin-<name>`. This prevents the two entities overwriting each other in `~/.claude/skills`.
- **Skill scripts are dependency-free ESM `.mjs`** — Bun/Node built-ins only. The single exception is a script that runs *inside* a Splash root and uses dependencies the root template declares; such a script must say so in its header comment.
- **Every test must be seen failing first.** Step 2 of each task runs the test against absent or broken implementation and records the actual failure message. A test that never went red does not count as a test.
- **Nothing is worked around.** A missing prerequisite is reported, never designed around. This applies to the implementation as much as to the product.
- Test command from the branch root: `cd twin && bun test`.

---

## File Structure

```
twin/
├── package.json                     # bun test entry for the twin only
├── README.md                        # what this branch is, and the isolation rule
└── skills/
    ├── splash-twin/                 # orchestrator
    │   ├── SKILL.md                 # Task 9
    │   ├── scripts/
    │   │   ├── keys.mjs             # Task 1 — real key probes
    │   │   ├── newsroom.mjs         # Task 1 — NEWSROOM.md contract
    │   │   ├── preflight.mjs        # Task 1 — root verdict
    │   │   ├── new-story.mjs        # Task 2 — story workspace scaffolder
    │   │   └── where.mjs            # Task 3 — phase recovery from disk
    │   ├── assets/root-template/    # Task 1 — the Splash root skeleton
    │   └── test/                    # Tasks 1-3, 9
    ├── twin-intake/
    │   ├── SKILL.md                 # Task 4
    │   ├── scripts/{csv.mjs,profile.mjs,freeze.mjs}   # Task 4
    │   └── test/
    ├── twin-storyboard/
    │   ├── SKILL.md                 # Task 5
    │   ├── references/exchange.md   # Task 5
    │   ├── scripts/storyboard.mjs   # Task 5
    │   └── test/
    ├── twin-doctrine/
    │   ├── SKILL.md                 # Task 6
    │   ├── references/{editorial-standard.md,visual-system.md,anti-patterns.md,reference-set.md}
    │   ├── scripts/check-reference-set.mjs           # Task 6
    │   └── test/
    ├── twin-chart-beat/
    │   ├── SKILL.md                 # Task 7
    │   ├── references/{seed-anatomy.md,static-discipline.md}
    │   ├── assets/{ChartSeed.tsx,sample-data/rainfall.json,preview.png}
    │   ├── scripts/{render-still.mjs,inspect-render.mjs}   # Tasks 7, 8
    │   └── test/
    └── twin-deliver/
        ├── SKILL.md                 # Task 10
        ├── scripts/deliver.mjs      # Task 10
        └── test/
```

Each skill owns its scripts and its tests. Files that change together live together. No `twin/lib/`, no shared utility module — if two skills need the same helper, each carries its own copy, because a shared module is the first vertebra of the engine this branch exists to avoid.

---

## Task 1: Splash root — template, NEWSROOM contract, preflight with real key probes

**Files:**
- Create: `twin/package.json`
- Create: `twin/README.md`
- Create: `twin/skills/splash-twin/scripts/keys.mjs`
- Create: `twin/skills/splash-twin/scripts/newsroom.mjs`
- Create: `twin/skills/splash-twin/scripts/preflight.mjs`
- Create: `twin/skills/splash-twin/assets/root-template/package.json`
- Create: `twin/skills/splash-twin/assets/root-template/tsconfig.json`
- Create: `twin/skills/splash-twin/assets/root-template/NEWSROOM.example.md`
- Test: `twin/skills/splash-twin/test/keys.test.ts`
- Test: `twin/skills/splash-twin/test/newsroom.test.ts`
- Test: `twin/skills/splash-twin/test/preflight.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `probeMapTiler(key: string, fetchFn: typeof fetch): Promise<{ok: boolean, status: number|null, detail: string}>`
  - `probeDatawrapper(token: string, fetchFn: typeof fetch): Promise<{ok: boolean, status: number|null, detail: string}>`
  - `parseNewsroom(text: string): {name, url, language, brandColor, ground, typefaces}`
  - `validateNewsroom(profile: object): string[]` — empty array means valid
  - `runPreflight({root: string, env: Record<string,string>, fetchFn: typeof fetch}): Promise<{ok: boolean, checks: Array<{id: string, status: 'pass'|'fail'|'missing', detail: string}>}>`

**Why the probe is real:** `main` is blocked today by a MapTiler key that is *present* and returns 403. A preflight that checks presence reports green while production fails. This task's entire point is that `status: 'pass'` means a real call succeeded.

**Amended after mutation-testing review (post-implementation).** The test lists below were run
through mutation testing and five mutations survived — the suite stayed green against deliberately
broken code. This amendment folds the four fixes back into the plan so this test list is no longer
prescribed as sufficient when it demonstrably wasn't:
- `probeMapTiler`/`probeDatawrapper` need assertions on the *shape* of the request handed to
  `fetchFn` (the key present in the URL, the bearer token present in the header) — not just on the
  response translated back. A probe that silently stopped sending the key would have stayed green
  forever.
- `runPreflight`'s `maptiler-key` check needs a case with `env: {}` (key absent) asserting
  `"missing"` — nothing in the original list ever exercised the fail-vs-missing branch on the
  absent side.
- `runPreflight`'s `newsroom-profile` check needs to tell "file could not be read" (`"missing"`)
  apart from "file read but unparseable" (`"fail"`, with the parse error in `detail`) — the
  original bare `catch` collapsed both into the same false diagnosis. It also needs a
  present-but-incomplete-profile case asserting `"fail"`, since the pass/fail branch itself was
  untested.
- The real-network test must not pass vacuously when `MAPTILER_KEY` is absent from the environment
  (the empty-key guard short-circuits before any network call). It now skips explicitly with a
  printed reason when the key is absent, and asserts `result.status !== null` when it runs.

- [ ] **Step 1: Write the failing test for the key probes**

```ts
// twin/skills/splash-twin/test/keys.test.ts
import { describe, it, expect } from "bun:test";
import { probeMapTiler, probeDatawrapper } from "../scripts/keys.mjs";

describe("probeMapTiler", () => {
  it("should report ok when the tiles endpoint answers 200", async () => {
    const fetchFn = async () => new Response("{}", { status: 200 });
    const result = await probeMapTiler("any-key", fetchFn);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("should report not ok with the status when the key is rejected", async () => {
    const fetchFn = async () => new Response("Invalid key", { status: 403 });
    const result = await probeMapTiler("stale-key", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.detail).toContain("403");
  });

  it("should report not ok when the key is absent, without calling the network", async () => {
    let called = false;
    const fetchFn = async () => { called = true; return new Response("", { status: 200 }); };
    const result = await probeMapTiler("", fetchFn);
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("should report not ok when the network throws", async () => {
    const fetchFn = async () => { throw new Error("getaddrinfo ENOTFOUND"); };
    const result = await probeMapTiler("any-key", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(null);
    expect(result.detail).toContain("ENOTFOUND");
  });

  it("should send the key in the request URL, not silently drop it", async () => {
    let capturedUrl = "";
    const fetchFn = async (url) => { capturedUrl = String(url); return new Response("{}", { status: 200 }); };
    await probeMapTiler("secret-key-123", fetchFn);
    expect(capturedUrl).toContain("secret-key-123");
  });
});

describe("probeDatawrapper", () => {
  it("should report ok when /v3/me answers 200", async () => {
    const fetchFn = async () => new Response("{}", { status: 200 });
    expect((await probeDatawrapper("token", fetchFn)).ok).toBe(true);
  });

  it("should report not ok on 401", async () => {
    const fetchFn = async () => new Response("", { status: 401 });
    const result = await probeDatawrapper("token", fetchFn);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("should send the bearer token in the Authorization header, not silently drop it", async () => {
    let capturedInit;
    const fetchFn = async (url, init) => { capturedInit = init; return new Response("{}", { status: 200 }); };
    await probeDatawrapper("secret-token-456", fetchFn);
    expect(capturedInit?.headers?.Authorization).toBe("Bearer secret-token-456");
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/keys.test.ts`
Expected: FAIL — `Cannot find module '../scripts/keys.mjs'`.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/splash-twin/scripts/keys.mjs
// Real key probes. A present key is not a working key.

const MAPTILER_PROBE = (key) =>
  `https://api.maptiler.com/maps/dataviz/style.json?key=${encodeURIComponent(key)}`;
const DATAWRAPPER_PROBE = "https://api.datawrapper.de/v3/me";

async function probe(url, init, fetchFn, label) {
  try {
    const response = await fetchFn(url, init);
    return response.ok
      ? { ok: true, status: response.status, detail: `${label} answered ${response.status}` }
      : { ok: false, status: response.status, detail: `${label} answered ${response.status}` };
  } catch (error) {
    return { ok: false, status: null, detail: `${label} threw: ${error.message}` };
  }
}

export async function probeMapTiler(key, fetchFn) {
  if (!key) return { ok: false, status: null, detail: "MAPTILER_KEY is not set" };
  return probe(MAPTILER_PROBE(key), {}, fetchFn, "MapTiler");
}

export async function probeDatawrapper(token, fetchFn) {
  if (!token) return { ok: false, status: null, detail: "DATAWRAPPER_TOKEN is not set" };
  return probe(DATAWRAPPER_PROBE, { headers: { Authorization: `Bearer ${token}` } }, fetchFn, "Datawrapper");
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/keys.test.ts`
Expected: PASS, 8 tests (6 original + 2 request-shape assertions added post-review).

- [ ] **Step 5: Write the failing test for the NEWSROOM contract**

`NEWSROOM.md` is YAML front matter plus free prose. Only the front matter is machine-read.

```ts
// twin/skills/splash-twin/test/newsroom.test.ts
import { describe, it, expect } from "bun:test";
import { parseNewsroom, validateNewsroom } from "../scripts/newsroom.mjs";

const COMPLETE = `---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#0B7A75"
ground: "#FFFFFF"
typefaces: "Source Serif, Source Sans"
---

Anything below the front matter is prose for the journalist, ignored by the tools.
`;

describe("parseNewsroom", () => {
  it("should read every declared field from the front matter", () => {
    const profile = parseNewsroom(COMPLETE);
    expect(profile.name).toBe("Heidi.news");
    expect(profile.language).toBe("fr");
    expect(profile.brandColor).toBe("#0B7A75");
  });

  it("should throw when there is no front matter at all", () => {
    expect(() => parseNewsroom("just prose")).toThrow("no front matter");
  });
});

describe("validateNewsroom", () => {
  it("should return no error for a complete profile", () => {
    expect(validateNewsroom(parseNewsroom(COMPLETE))).toEqual([]);
  });

  it("should name every missing field rather than the first one", () => {
    const errors = validateNewsroom({ name: "X" });
    expect(errors).toContain("url is missing");
    expect(errors).toContain("language is missing");
    expect(errors).toContain("brandColor is missing");
  });

  it("should reject a brandColor that is not a hex triplet", () => {
    const errors = validateNewsroom({ ...parseNewsroom(COMPLETE), brandColor: "teal" });
    expect(errors).toContain("brandColor must be #rrggbb, got \"teal\"");
  });
});
```

- [ ] **Step 6: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/newsroom.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the minimal implementation**

```js
// twin/skills/splash-twin/scripts/newsroom.mjs
// NEWSROOM.md: YAML front matter (machine-read) + prose (ignored).

const FIELDS = ["name", "url", "language", "brandColor", "ground", "typefaces"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseNewsroom(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error("NEWSROOM.md has no front matter");
  const profile = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    profile[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  return profile;
}

export function validateNewsroom(profile) {
  const errors = [];
  for (const field of FIELDS) {
    if (!profile[field]) errors.push(`${field} is missing`);
  }
  for (const field of ["brandColor", "ground"]) {
    const value = profile[field];
    if (value && !HEX.test(value)) errors.push(`${field} must be #rrggbb, got ${JSON.stringify(value)}`);
  }
  return errors;
}
```

- [ ] **Step 8: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/newsroom.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 9: Write the failing test for the preflight verdict**

```ts
// twin/skills/splash-twin/test/preflight.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPreflight } from "../scripts/preflight.mjs";

const okFetch = async () => new Response("{}", { status: 200 });
let root: string;

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "splash-root-")); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const complete = `---
name: Heidi.news
url: https://www.heidi.news
language: fr
brandColor: "#0B7A75"
ground: "#FFFFFF"
typefaces: "Source Serif"
---
`;

describe("runPreflight", () => {
  it("should report the newsroom profile missing when NEWSROOM.md is absent", async () => {
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "k" }, fetchFn: okFetch });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("missing");
    expect(verdict.ok).toBe(false);
  });

  it("should report a key as failed when the probe is rejected, not merely absent", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const rejecting = async () => new Response("Invalid key", { status: 403 });
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "present-but-stale" }, fetchFn: rejecting });
    const check = verdict.checks.find((c) => c.id === "maptiler-key");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("403");
    expect(verdict.ok).toBe(false);
  });

  it("should pass when the root is installed, the profile is valid and the key probes green", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "k" }, fetchFn: okFetch });
    expect(verdict.ok).toBe(true);
    expect(verdict.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("should report dependencies missing when node_modules is absent", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "k" }, fetchFn: okFetch });
    expect(verdict.checks.find((c) => c.id === "dependencies").status).toBe("missing");
  });

  it("should report the maptiler key as missing, not failed, when MAPTILER_KEY is absent from env", async () => {
    await writeFile(join(root, "NEWSROOM.md"), complete);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({ root, env: {}, fetchFn: okFetch });
    const check = verdict.checks.find((c) => c.id === "maptiler-key");
    expect(check.status).toBe("missing");
    expect(verdict.ok).toBe(false);
  });

  it("should report the newsroom profile as failed, not missing, when the file exists but cannot be parsed", async () => {
    // A leading blank line breaks the front-matter regex without ever making the file unreadable.
    await writeFile(join(root, "NEWSROOM.md"), `\n${complete}`);
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "k" }, fetchFn: okFetch });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("front matter");
  });

  it("should report the newsroom profile as failed when NEWSROOM.md is present but incomplete", async () => {
    await writeFile(join(root, "NEWSROOM.md"), "---\nname: X\n---\n");
    await mkdir(join(root, "node_modules"), { recursive: true });
    const verdict = await runPreflight({ root, env: { MAPTILER_KEY: "k" }, fetchFn: okFetch });
    const check = verdict.checks.find((c) => c.id === "newsroom-profile");
    expect(check.status).toBe("fail");
    expect(verdict.ok).toBe(false);
  });
});
```

- [ ] **Step 10: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/preflight.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11: Write the minimal implementation**

```js
// twin/skills/splash-twin/scripts/preflight.mjs
// Phase 0. Nothing here is worked around: a gap is reported, never designed around.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseNewsroom, validateNewsroom } from "./newsroom.mjs";
import { probeMapTiler } from "./keys.mjs";

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

export async function runPreflight({ root, env, fetchFn }) {
  const checks = [];

  checks.push(await exists(join(root, "node_modules"))
    ? { id: "dependencies", status: "pass", detail: "root dependencies are installed" }
    : { id: "dependencies", status: "missing", detail: "run bun install in the Splash root" });

  let newsroomText;
  try {
    newsroomText = await readFile(join(root, "NEWSROOM.md"), "utf8");
  } catch {
    // The file could not be read at all: missing, or inaccessible. Not a parse question.
    checks.push({ id: "newsroom-profile", status: "missing", detail: "NEWSROOM.md is absent" });
  }

  if (newsroomText !== undefined) {
    try {
      const errors = validateNewsroom(parseNewsroom(newsroomText));
      checks.push(errors.length === 0
        ? { id: "newsroom-profile", status: "pass", detail: "NEWSROOM.md is complete" }
        : { id: "newsroom-profile", status: "fail", detail: errors.join("; ") });
    } catch (error) {
      // The file exists but is not what we expect: a real failure, distinct from absent.
      checks.push({ id: "newsroom-profile", status: "fail", detail: `NEWSROOM.md could not be parsed: ${error.message}` });
    }
  }

  const maptiler = await probeMapTiler(env.MAPTILER_KEY ?? "", fetchFn);
  checks.push({
    id: "maptiler-key",
    status: maptiler.ok ? "pass" : (env.MAPTILER_KEY ? "fail" : "missing"),
    detail: maptiler.detail,
  });

  return { ok: checks.every((c) => c.status === "pass"), checks };
}
```

(The split of the `newsroom-profile` check into a read step and a parse step — rather than one
`try` with a single bare `catch` — is itself a fix folded in after mutation-testing review: a bare
catch swallowed "file could not be read" and "file read but unparseable" into the same `"missing"`
verdict, which is a false diagnosis for the second case.)

- [ ] **Step 12: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/preflight.test.ts`
Expected: PASS, 7 tests (4 original + 3 added post-review: maptiler-key absent → `"missing"`,
newsroom-profile present-but-unparseable → `"fail"`, newsroom-profile present-but-incomplete →
`"fail"`).

- [ ] **Step 13: Add one real-network integration test**

External APIs are never mocked in this codebase. This test asserts the probe *returns a verdict about reality*, not that the key is currently good — the MapTiler key is expected to be red today, and a test that demanded green would be a lie. It must also not pass vacuously: if `MAPTILER_KEY` is absent from the environment the empty-key guard in `probeMapTiler` short-circuits before any network call, so the test skips explicitly (with a printed reason) rather than silently passing on an untested path; when the key is present it asserts `result.status !== null`, i.e. that a real call actually happened.

```ts
// append to twin/skills/splash-twin/test/keys.test.ts
describe("probeMapTiler against the real endpoint", () => {
  const key = process.env.MAPTILER_KEY ?? "";
  if (!key) {
    console.log("Skipping real MapTiler probe: MAPTILER_KEY is not set in the environment.");
  }

  it.skipIf(!key)("should return a concrete verdict using the key in the environment", async () => {
    const result = await probeMapTiler(key, fetch);
    expect(typeof result.ok).toBe("boolean");
    expect(result.status).not.toBe(null);
    expect(result.detail.length).toBeGreaterThan(0);
    console.log(`MapTiler verdict: ok=${result.ok} status=${result.status} — ${result.detail}`);
  });
});
```

Run: `cd twin && MAPTILER_KEY=<key> bun test skills/splash-twin/test/keys.test.ts` and read the logged verdict. Record it in the commit message. Without `MAPTILER_KEY` set, the same run must show the test as skipped with the printed reason, not silently passed.

- [ ] **Step 14: Write the root template and the twin package manifest**

```json
// twin/package.json
{
  "name": "splash-doctrine-twin",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
```

```json
// twin/skills/splash-twin/assets/root-template/package.json
{
  "name": "splash-root",
  "private": true,
  "type": "module",
  "dependencies": {
    "d3-array": "^3.2.4",
    "d3-scale": "^4.0.2",
    "d3-shape": "^3.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

```json
// twin/skills/splash-twin/assets/root-template/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["stories", "shared"]
}
```

`NEWSROOM.example.md` carries the front matter from the tests plus a prose block explaining each field in one line.

- [ ] **Step 15: Write `twin/README.md`**

Three short sections: what this branch is (the doctrine twin, never merged), the isolation rule verbatim from spec §9, and how to run the tests. No marketing.

- [ ] **Step 16: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin
git add twin/
git commit -m "feat(twin): splash root preflight — a present key is probed, not assumed"
```

---

## Task 2: Story workspace scaffolder

**Files:**
- Create: `twin/skills/splash-twin/scripts/new-story.mjs`
- Test: `twin/skills/splash-twin/test/new-story.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 at runtime.
- Produces:
  - `slugify(title: string): string`
  - `createStory({root: string, title: string}): Promise<{slug: string, dir: string}>` — throws if the story already exists.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/splash-twin/test/new-story.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { slugify, createStory } from "../scripts/new-story.mjs";

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "splash-root-")); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("slugify", () => {
  it("should lowercase, strip accents and join with hyphens", () => {
    expect(slugify("Annemasse, capitale du n'importe quoi")).toBe("annemasse-capitale-du-n-importe-quoi");
  });
  it("should collapse repeated separators and trim them", () => {
    expect(slugify("  --Water   Wars--  ")).toBe("water-wars");
  });
});

describe("createStory", () => {
  it("should create the whole workspace shape", async () => {
    const { slug, dir } = await createStory({ root, title: "Water Wars" });
    expect(slug).toBe("water-wars");
    for (const child of ["source", "beats", "export"]) {
      expect((await stat(join(dir, child))).isDirectory()).toBe(true);
    }
  });

  it("should refuse to overwrite an existing story", async () => {
    await createStory({ root, title: "Water Wars" });
    await expect(createStory({ root, title: "Water Wars" })).rejects.toThrow("already exists");
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/new-story.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/splash-twin/scripts/new-story.mjs
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

export function slugify(title) {
  return title
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createStory({ root, title }) {
  const slug = slugify(title);
  const dir = join(root, "stories", slug);
  try {
    await stat(dir);
    throw new Error(`story "${slug}" already exists at ${dir}`);
  } catch (error) {
    if (!error.message.includes("already exists")) {
      for (const child of ["source", "beats", "export"]) {
        await mkdir(join(dir, child), { recursive: true });
      }
      return { slug, dir };
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/new-story.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add twin/skills/splash-twin
git commit -m "feat(twin): one workspace per story, refusing to overwrite one that exists"
```

---

## Task 3: Phase recovery from disk

**Files:**
- Create: `twin/skills/splash-twin/scripts/where.mjs`
- Test: `twin/skills/splash-twin/test/where.test.ts`

**Interfaces:**
- Consumes: the directory shape from Task 2.
- Produces: `whereIs(storyDir: string): Promise<{phase: Phase, missing: string[]}>` where
  `Phase = "intake" | "framing" | "storyboard" | "production" | "delivery" | "done"`.

The orchestrator holds no state. This function *is* the state.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/splash-twin/test/where.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whereIs } from "../scripts/where.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  for (const child of ["source", "beats", "export"]) await mkdir(join(dir, child), { recursive: true });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

const storyboard = `---
takeaway: "Rainfall fell by a third in ten years."
slots:
  - id: 1
    chosen: trajectory
---
`;

describe("whereIs", () => {
  it("should report intake when the source is empty", async () => {
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).toContain("source/profile.json");
  });

  it("should report intake with only article.md missing", async () => {
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/article.md");
    expect(state.missing).not.toContain("source/profile.json");
  });

  it("should report intake with only profile.json missing", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    const state = await whereIs(dir);
    expect(state.phase).toBe("intake");
    expect(state.missing).toContain("source/profile.json");
    expect(state.missing).not.toContain("source/article.md");
  });

  it("should report framing once the source is frozen but no storyboard exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const state = await whereIs(dir);
    expect(state.phase).toBe("framing");
    expect(state.missing).toContain("STORYBOARD.md");
  });

  it("should report production once the storyboard carries a takeaway", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
  });

  it("should stay in storyboard when STORYBOARD.md exists but has no takeaway", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), "---\nslots: []\n---\n");
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is an empty string", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), `---\ntakeaway: ""\nslots: []\n---\n`);
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), `---\ntakeaway: null\nslots: []\n---\n`);
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is YAML tilde null", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), `---\ntakeaway: ~\nslots: []\n---\n`);
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway is only whitespace", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), `---\ntakeaway:   \nslots: []\n---\n`);
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should stay in storyboard when takeaway: appears in prose below frontmatter", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), `---\nslots: []\n---\nThis takeaway: is in prose, not frontmatter.\n`);
    const state = await whereIs(dir);
    expect(state.phase).toBe("storyboard");
    expect(state.missing).toContain("a confirmed takeaway");
  });

  it("should report delivery once a beat has a render", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), { recursive: true });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(join(dir, "beats", "1-rainfall", "renders", "still.png"), "x");
    expect((await whereIs(dir)).phase).toBe("delivery");
  });

  it("should report done once the export holds a file and a render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await mkdir(join(dir, "beats", "1-rainfall", "renders"), { recursive: true });
    await writeFile(join(dir, "beats", "1-rainfall", "BRIEF.md"), "brief");
    await writeFile(join(dir, "beats", "1-rainfall", "renders", "still.png"), "x");
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    expect((await whereIs(dir)).phase).toBe("done");
  });

  it("should report inconsistency when export holds a file but no render exists", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), storyboard);
    await writeFile(join(dir, "export", "rainfall.png"), "x");
    const state = await whereIs(dir);
    expect(state.phase).toBe("production");
    expect(state.missing).toContain("no renders exist in any beat");
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/where.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/splash-twin/scripts/where.mjs
// The state of a story is its directory. Nothing is remembered between sessions.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function list(path) {
  try { return await readdir(path); } catch { return []; }
}

async function read(path) {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("---", 3);
  if (end === -1) return null;
  return content.substring(3, end);
}

function hasConfirmedTakeaway(frontmatter) {
  if (!frontmatter) return false;
  const match = frontmatter.match(/^takeaway:[ \t]*([^\n]+)$/m);
  if (!match) return false;
  const value = match[1].trim();
  if (!value) return false;
  if (value === '""' || value === "''" || value === "null" || value === "~") return false;
  return true;
}

async function hasAnyRender(storyDir) {
  for (const beat of await list(join(storyDir, "beats"))) {
    if ((await list(join(storyDir, "beats", beat, "renders"))).length > 0) {
      return true;
    }
  }
  return false;
}

export async function whereIs(storyDir) {
  const source = await list(join(storyDir, "source"));
  if (!source.includes("article.md") || !source.includes("profile.json")) {
    return { phase: "intake", missing: ["source/article.md", "source/profile.json"].filter((f) => !source.includes(f.split("/")[1])) };
  }

  const storyboard = await read(join(storyDir, "STORYBOARD.md"));
  if (storyboard === null) return { phase: "framing", missing: ["STORYBOARD.md"] };

  const frontmatter = extractFrontmatter(storyboard);
  if (!hasConfirmedTakeaway(frontmatter)) return { phase: "storyboard", missing: ["a confirmed takeaway"] };

  const hasRender = await hasAnyRender(storyDir);
  const exported = await list(join(storyDir, "export"));

  if (!hasRender && exported.length > 0) {
    return { phase: "production", missing: ["no renders exist in any beat"] };
  }

  if (exported.length > 0) return { phase: "done", missing: [] };
  if (hasRender) return { phase: "delivery", missing: [] };

  return { phase: "production", missing: [] };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/where.test.ts`
Expected: PASS, 14 tests (6 original + 8 added post-review: three missing-filter variants, four takeaway edge cases, one inconsistency case).

- [ ] **Step 5: Commit**

```bash
git add twin/skills/splash-twin
git commit -m "feat(twin): a story's phase is read from its directory, never remembered"
```

---

## Task 4: Intake — freeze the source, profile the data

**Files:**
- Create: `twin/skills/twin-intake/scripts/csv.mjs`
- Create: `twin/skills/twin-intake/scripts/profile.mjs`
- Create: `twin/skills/twin-intake/scripts/freeze.mjs`
- Create: `twin/skills/twin-intake/SKILL.md`
- Test: `twin/skills/twin-intake/test/csv.test.ts`
- Test: `twin/skills/twin-intake/test/profile.test.ts`
- Test: `twin/skills/twin-intake/test/freeze.test.ts`

**Interfaces:**
- Consumes: the workspace shape from Task 2.
- Produces:
  - `parseCsv(text: string): string[][]` — RFC 4180: quoted fields, embedded commas, embedded newlines, doubled quotes.
  - `profileTable(rows: string[][]): {rowCount: number, columns: Array<{name: string, type: "number"|"date"|"text", missing: number, distinct: number, min: number|null, max: number|null}>}`
  - `freezeSource({storyDir, articlePath, dataPath}): Promise<{article: string, data: string, profile: object}>`

RFC 4180 is inherited knowledge: `main` shipped a naive splitter that broke on quoted commas and had to be fixed under fuzz. It is written correctly here the first time.

- [ ] **Step 1: Write the failing test for the CSV parser**

```ts
// twin/skills/twin-intake/test/csv.test.ts
import { describe, it, expect } from "bun:test";
import { parseCsv } from "../scripts/csv.mjs";

describe("parseCsv", () => {
  it("should parse a plain table", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("should keep a comma that lives inside quotes", () => {
    expect(parseCsv('name,value\n"Annemasse, Haute-Savoie",42\n'))
      .toEqual([["name", "value"], ["Annemasse, Haute-Savoie", "42"]]);
  });

  it("should keep a newline that lives inside quotes", () => {
    expect(parseCsv('a\n"line one\nline two"\n')).toEqual([["a"], ["line one\nline two"]]);
  });

  it("should unescape a doubled quote", () => {
    expect(parseCsv('a\n"he said ""no"""\n')).toEqual([["a"], ['he said "no"']]);
  });

  it("should accept CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("should not emit a trailing empty row", () => {
    expect(parseCsv("a\n1\n")).toHaveLength(2);
  });

  it("should treat a lone CR (no paired LF) as a row terminator, not field text", () => {
    expect(parseCsv("a,b\r1,2\r")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/twin-intake/test/csv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

**Corrected from the first draft** (probed and fixed during Task 4 — see task-4-report.md): the original single-line CR/LF check (`if (char === "\r" && text[i + 1] === "\n")`) only ever recognised `\r\n`. A lone `\r` (classic Mac line endings, stray CR from copy-paste) fell through to `field += char`, silently corrupting the row into garbled field text instead of being rejected or reported. Fixed by treating any `\r` as a row terminator, consuming a following `\n` when present.

```js
// twin/skills/twin-intake/scripts/csv.mjs
// RFC 4180. A naive split on "," is the bug this file exists to prevent.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    // A lone CR (no paired LF) still terminates a row — classic Mac line endings,
    // and stray CRs from copy-paste, must not be swallowed into field text.
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-intake/test/csv.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing test for the profiler**

```ts
// twin/skills/twin-intake/test/profile.test.ts
import { describe, it, expect } from "bun:test";
import { profileTable } from "../scripts/profile.mjs";

const ROWS = [
  ["commune", "year", "rainfall"],
  ["Annemasse", "2015", "912"],
  ["Annemasse", "2025", "604"],
  ["Gaillard", "2015", ""],
];

describe("profileTable", () => {
  it("should count the data rows, excluding the header", () => {
    expect(profileTable(ROWS).rowCount).toBe(3);
  });

  it("should type a numeric column as number and give its range", () => {
    const rainfall = profileTable(ROWS).columns.find((c) => c.name === "rainfall");
    expect(rainfall.type).toBe("number");
    expect(rainfall.min).toBe(604);
    expect(rainfall.max).toBe(912);
  });

  it("should count missing values instead of silently dropping them", () => {
    expect(profileTable(ROWS).columns.find((c) => c.name === "rainfall").missing).toBe(1);
  });

  it("should type a text column as text with no range", () => {
    const commune = profileTable(ROWS).columns.find((c) => c.name === "commune");
    expect(commune.type).toBe("text");
    expect(commune.min).toBe(null);
    expect(commune.distinct).toBe(2);
  });

  it("should not crash on an entirely empty table", () => {
    expect(profileTable([])).toEqual({ rowCount: 0, columns: [] });
  });

  it("should not type a hex-looking value as a number", () => {
    const table = profileTable([["v"], ["0x10"], ["10"]]);
    const v = table.columns.find((c) => c.name === "v");
    expect(v.type).toBe("text");
    expect(v.min).toBe(null);
  });
});
```

- [ ] **Step 6: Run it and record the failure**

Run: `cd twin && bun test skills/twin-intake/test/profile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the minimal implementation**

**Corrected from the first draft** (probed and fixed during Task 4 — see task-4-report.md): two real defects.
1. `const [header, ...body] = rows` crashed with a raw `TypeError` when `rows` was `[]` (an entirely empty CSV file) — `header` was `undefined`, so `header.map` threw before any domain-shaped error could be reported. Fixed with a destructuring default (`header = []`), so an empty table profiles to `{rowCount: 0, columns: []}` instead of crashing.
2. `typeOf` trusted `Number(v)` directly, which silently accepts things a journalist's CSV cell was never meant to mean as a number — `Number("0x10")` is `16`. Fixed by checking a strict decimal-literal regex before `Number()` is trusted at all; `Number.isFinite` is kept alongside it as a second guard (catches `"1e400"` overflowing to `Infinity`).

```js
// twin/skills/twin-intake/scripts/profile.mjs

// A plain decimal literal: optional sign, digits, optional exponent.
// Deliberately narrower than Number() — Number("0x10") is 16 and Number("Infinity")
// is a finite check away from slipping through; a blank/whitespace value never matches.
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function isNumeric(v) {
  return NUMERIC_RE.test(v) && Number.isFinite(Number(v));
}

function typeOf(values) {
  const present = values.filter((v) => v !== "");
  if (present.length === 0) return "text";
  if (present.every(isNumeric)) return "number";
  if (present.every((v) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v))) return "date";
  return "text";
}

export function profileTable(rows) {
  const [header = [], ...body] = rows;
  const columns = header.map((name, index) => {
    const values = body.map((row) => (row[index] ?? "").trim());
    const type = typeOf(values);
    const numbers = type === "number" ? values.filter((v) => v !== "").map(Number) : [];
    return {
      name,
      type,
      missing: values.filter((v) => v === "").length,
      distinct: new Set(values.filter((v) => v !== "")).size,
      min: numbers.length ? Math.min(...numbers) : null,
      max: numbers.length ? Math.max(...numbers) : null,
    };
  });
  return { rowCount: body.length, columns };
}
```

- [ ] **Step 8: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-intake/test/profile.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 9: Write the failing test for the freeze**

```ts
// twin/skills/twin-intake/test/freeze.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeSource } from "../scripts/freeze.mjs";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "story-"));
  await mkdir(join(dir, "source"), { recursive: true });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("freezeSource", () => {
  it("should copy the article and the data into source/ and write a profile", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n2025,604\n");

    const result = await freezeSource({ storyDir: dir, articlePath, dataPath });

    expect(await readFile(join(dir, "source", "article.md"), "utf8")).toBe("# Rainfall\n");
    expect(result.profile.rowCount).toBe(2);
    const written = JSON.parse(await readFile(join(dir, "source", "profile.json"), "utf8"));
    expect(written.columns).toHaveLength(2);
  });

  it("should refuse to freeze twice, so the frozen source stays frozen", async () => {
    const articlePath = join(dir, "draft.md");
    const dataPath = join(dir, "rainfall.csv");
    await writeFile(articlePath, "# Rainfall\n");
    await writeFile(dataPath, "year,rainfall\n2015,912\n");
    await freezeSource({ storyDir: dir, articlePath, dataPath });
    await expect(freezeSource({ storyDir: dir, articlePath, dataPath })).rejects.toThrow("already frozen");
  });
});
```

- [ ] **Step 10: Run it and record the failure**

Run: `cd twin && bun test skills/twin-intake/test/freeze.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11: Write the minimal implementation**

```js
// twin/skills/twin-intake/scripts/freeze.mjs
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "./csv.mjs";
import { profileTable } from "./profile.mjs";

export async function freezeSource({ storyDir, articlePath, dataPath }) {
  const frozen = join(storyDir, "source", "article.md");
  try { await stat(frozen); throw new Error("source is already frozen"); }
  catch (error) { if (error.message.includes("already frozen")) throw error; }

  const article = await readFile(articlePath, "utf8");
  const data = await readFile(dataPath, "utf8");
  const profile = profileTable(parseCsv(data));

  await writeFile(frozen, article);
  await writeFile(join(storyDir, "source", "data.csv"), data);
  await writeFile(join(storyDir, "source", "profile.json"), JSON.stringify(profile, null, 2));
  return { article, data, profile };
}
```

- [ ] **Step 12: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-intake/test/freeze.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 13: Write `twin-intake/SKILL.md`**

Eight sections, per the canon. Frontmatter `name: twin-intake`, one-line description. The body states: this phase is **silent** — it asks nothing, it freezes and profiles; the article and data are never modified after freezing; a second freeze is refused so the record of what was analysed cannot drift.

- [ ] **Step 14: Commit**

```bash
git add twin/skills/twin-intake
git commit -m "feat(twin-intake): freeze the source once, profile it with an RFC 4180 reader"
```

---

## Task 5: The storyboard contract and its gate

**Files:**
- Create: `twin/skills/twin-storyboard/scripts/storyboard.mjs`
- Create: `twin/skills/twin-storyboard/SKILL.md`
- Create: `twin/skills/twin-storyboard/references/exchange.md`
- Test: `twin/skills/twin-storyboard/test/storyboard.test.ts`

**Interfaces:**
- Consumes: the phase names from Task 3 (`whereIs` reads `takeaway:` out of this file).
- Produces:
  - `parseStoryboard(text: string): {meta: object, prose: string}`
  - `checkStoryboard(meta: object): string[]` — empty means Gate 2 may close.

A gate closes into a file. `STORYBOARD.md` carries YAML front matter that is machine-checkable and prose beneath it that the journalist actually reads.

**Amended after implementation review.** The prescribed `scalar()` only trims and strips quotes,
which turns a bare `takeaway: null` (or `takeaway: ~`) into the non-empty string `"null"` — truthy,
so `checkStoryboard` would call Gate 2 closed. But `twin/skills/splash-twin/scripts/where.mjs`'s
`hasConfirmedTakeaway` explicitly refuses those same two raw tokens, so `whereIs` would still report
`phase: "storyboard"`. The two gates this task's own interface note requires to agree
("`whereIs` reads `takeaway:` out of this file") would disagree on the one input that matters most —
a takeaway nobody actually set. Step 3's `scalar()` below is corrected to resolve the bare `null`/`~`
sentinels to a real `null` before `checkStoryboard` sees them; a regression test locks this in
Step 1. Everything else in the prescribed code, including the rest of the hand-rolled YAML subset
reader, held up under mutation testing (every line targeted by a test was confirmed to flip that
test red when broken, then reverted).

**Amended again after a second review round.** Two more findings on the corrected code above:

1. The inline-array split (`value.slice(1, -1).split(",")`) is naive — it splits on every comma,
   including one inside a quoted element. `candidates: ["a, b", "c"]` parses as three candidates
   (`"a"`, `"b"`, `"c"`), so a slot with `chosen: "a, b"` — listed verbatim in its source array —
   is wrongly reported `chosen "a, b" is not among its candidates`: a legitimate storyboard
   spuriously gate-blocked by a parsing bug. Fixed with a `splitArrayItems()` helper that tracks
   quote state and only splits outside a quoted element; a test pins the exact `["a, b", "c"]`
   case.
2. `candidates.length > 0 && !candidates.includes(slot.chosen)` left the `candidates.length > 0`
   guard completely unverified in both directions — no test exercised a slot with a `chosen` value
   and empty/absent `candidates`. Decision: this is **malformed, not legitimate** — a chosen
   treatment is only a real choice if it was verifiably picked from a list that was actually shown
   (`references/exchange.md` §③: this is what stops the exchange from being disguised parameter
   collection). The compound condition is split into two explicit branches — an empty/absent
   `candidates` with a `chosen` value now refuses on its own
   (`chosen "…" but no candidates were listed`), distinct from a genuine mismatch — and a test
   pins both the missing-field and the empty-array case.

Both fixes and their tests are folded into Steps 1 and 3 below; the code blocks reflect the
doubly-amended version, not the original brief.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/twin-storyboard/test/storyboard.test.ts
import { describe, it, expect } from "bun:test";
import { parseStoryboard, checkStoryboard } from "../scripts/storyboard.mjs";

const VALID = `---
takeaway: "Rainfall over Annemasse fell by a third in ten years."
subject: "Annemasse"
comparison: "the 1991-2020 average"
limits: "One station; says nothing about the wider basin."
placement: "after the fourth paragraph"
credit: "MeteoSwiss"
effectiveDate: "2026-05-31"
language: "fr"
channel: "article-web"
slots:
  - id: 1
    proves: "The fall is a trend, not one bad year."
    medium: "chart"
    genre: "static"
    candidates: ["trajectory", "comparison"]
    chosen: "trajectory"
---

The prose the journalist reads.
`;

describe("parseStoryboard", () => {
  it("should split the front matter from the prose", () => {
    const { meta, prose } = parseStoryboard(VALID);
    expect(meta.takeaway).toBe("Rainfall over Annemasse fell by a third in ten years.");
    expect(meta.slots).toHaveLength(1);
    expect(prose).toContain("The prose the journalist reads.");
  });
});

describe("checkStoryboard", () => {
  it("should pass a complete storyboard", () => {
    expect(checkStoryboard(parseStoryboard(VALID).meta)).toEqual([]);
  });

  it("should refuse an empty takeaway", () => {
    const meta = { ...parseStoryboard(VALID).meta, takeaway: "" };
    expect(checkStoryboard(meta)).toContain("takeaway is missing");
  });

  it("should name every missing hand-of-the-journalist field", () => {
    const errors = checkStoryboard({ takeaway: "x", slots: [] });
    expect(errors).toContain("subject is missing");
    expect(errors).toContain("comparison is missing");
    expect(errors).toContain("limits is missing");
    expect(errors).toContain("credit is missing");
  });

  it("should refuse a storyboard with no slot", () => {
    const meta = { ...parseStoryboard(VALID).meta, slots: [] };
    expect(checkStoryboard(meta)).toContain("no slot: nothing would be produced");
  });

  it("should refuse a slot whose chosen treatment is not among its candidates", () => {
    const meta = parseStoryboard(VALID).meta;
    meta.slots[0].chosen = "map";
    expect(checkStoryboard(meta)).toContain('slot 1: chosen "map" is not among its candidates');
  });

  it("should refuse a slot that has candidates but nothing chosen", () => {
    const meta = parseStoryboard(VALID).meta;
    delete meta.slots[0].chosen;
    expect(checkStoryboard(meta)).toContain("slot 1: nothing chosen — gate 2 is not closed");
  });

  it("should treat a comma inside a quoted candidate as part of that candidate, not a separator", () => {
    // A naive `.split(",")` on the inline array's inner text would tear `"a, b"` into two
    // candidates ("a" and "b"), then spuriously refuse a `chosen` value quoted verbatim from the
    // source array as "not among its candidates" — a legitimate storyboard gate-blocked by a
    // parsing bug, not an editorial problem.
    const text = VALID.replace(
      '    candidates: ["trajectory", "comparison"]\n    chosen: "trajectory"',
      '    candidates: ["a, b", "c"]\n    chosen: "a, b"',
    );
    const { meta } = parseStoryboard(text);
    expect(meta.slots[0].candidates).toEqual(["a, b", "c"]);
    expect(checkStoryboard(meta)).toEqual([]);
  });

  it("should refuse a slot with a chosen treatment but no candidates ever listed", () => {
    // Distinct from "nothing chosen" (no chosen value at all) and from "not among its candidates"
    // (a candidates list exists but doesn't include the chosen value) — this is the third,
    // previously-unverified branch: chosen IS set, but candidates is absent or empty, so there was
    // nothing to verify the choice against. Treated as malformed, not legitimate (see the comment
    // in checkStoryboard): a real choice can only be confirmed from a list that was actually shown.
    const missingField = parseStoryboard(VALID).meta;
    delete missingField.slots[0].candidates;
    expect(checkStoryboard(missingField)).toContain(
      'slot 1: chosen "trajectory" but no candidates were listed',
    );

    const emptyArray = parseStoryboard(VALID).meta;
    emptyArray.slots[0].candidates = [];
    expect(checkStoryboard(emptyArray)).toContain(
      'slot 1: chosen "trajectory" but no candidates were listed',
    );
  });

  it("should not consider a bare YAML null or tilde takeaway confirmed, agreeing with whereIs", () => {
    // where.mjs's hasConfirmedTakeaway (twin/skills/splash-twin/scripts/where.mjs) refuses the
    // raw tokens "null" and "~" as a confirmed takeaway. parseStoryboard must resolve the same
    // two YAML null sentinels to a real missing value, or the two gates would disagree about
    // whether G1 has closed.
    const nullText = VALID.replace(
      'takeaway: "Rainfall over Annemasse fell by a third in ten years."',
      "takeaway: null",
    );
    const tildeText = VALID.replace(
      'takeaway: "Rainfall over Annemasse fell by a third in ten years."',
      "takeaway: ~",
    );
    expect(checkStoryboard(parseStoryboard(nullText).meta)).toContain("takeaway is missing");
    expect(checkStoryboard(parseStoryboard(tildeText).meta)).toContain("takeaway is missing");
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/twin-storyboard/test/storyboard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

A dependency-free reader for the narrow YAML subset used here: scalars, and a list of maps whose values are scalars or inline string arrays. `scalar()` resolves the bare `null`/`~` sentinels to a real `null` (see the first amendment) so this parser and `where.mjs` cannot disagree about what a confirmed takeaway is, and splits inline arrays quote-aware (see the second amendment) so a comma inside a candidate name cannot fragment it.

```js
// twin/skills/twin-storyboard/scripts/storyboard.mjs

const HAND = ["subject", "comparison", "limits", "placement", "credit", "effectiveDate"];

// Bare (unquoted) YAML null sentinels. where.mjs's hasConfirmedTakeaway refuses these same two
// raw tokens as a confirmed takeaway — this parser has to resolve them to a real missing value
// too, or the two gates would disagree about whether G1 has closed. A *quoted* "null" or "~" is
// a literal string, not the sentinel, so this only fires on the bare form.
function isNullSentinel(value) {
  return value === "null" || value === "~";
}

// Splits an inline array's inner text on commas that are NOT inside a quoted element, so a
// treatment name that itself contains a comma (`"a, b"`) stays one element instead of being torn
// in two by a naive `.split(",")`.
function splitArrayItems(inner) {
  const items = [];
  let current = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items;
}

function scalar(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return splitArrayItems(value.slice(1, -1))
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (isNullSentinel(value)) return null;
  return value.replace(/^["']|["']$/g, "");
}

export function parseStoryboard(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error("STORYBOARD.md has no front matter");
  const meta = {};
  let slots = null;
  let slot = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (/^slots:\s*$/.test(line)) { slots = []; meta.slots = slots; continue; }
    if (slots && /^\s+-\s+/.test(line)) {
      slot = {};
      slots.push(slot);
      const first = /^\s+-\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      if (first) slot[first[1]] = scalar(first[2]);
      continue;
    }
    if (slot && /^\s{4,}[A-Za-z]+:/.test(line)) {
      const pair = /^\s+([A-Za-z]+):\s*(.*)$/.exec(line);
      slot[pair[1]] = scalar(pair[2]);
      continue;
    }
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (pair) meta[pair[1]] = scalar(pair[2]);
  }
  return { meta, prose: match[2] };
}

export function checkStoryboard(meta) {
  const errors = [];
  if (!meta.takeaway) errors.push("takeaway is missing");
  for (const field of HAND) if (!meta[field]) errors.push(`${field} is missing`);

  const slots = meta.slots ?? [];
  if (slots.length === 0) errors.push("no slot: nothing would be produced");

  for (const slot of slots) {
    const candidates = Array.isArray(slot.candidates) ? slot.candidates : [];
    if (!slot.chosen) {
      errors.push(`slot ${slot.id}: nothing chosen — gate 2 is not closed`);
      continue;
    }
    // A chosen treatment is only a real choice if it was verifiably picked from a shown list —
    // that is what stops the exchange from being disguised parameter collection (references/
    // exchange.md, §③). A slot with `chosen` set but no `candidates` ever listed means the
    // proposal step was skipped, not that there was nothing to check membership against — so
    // this is malformed, not legitimate, and refuses on its own, distinct from a mismatch.
    if (candidates.length === 0) {
      errors.push(`slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} but no candidates were listed`);
      continue;
    }
    if (!candidates.includes(slot.chosen)) {
      errors.push(`slot ${slot.id}: chosen ${JSON.stringify(slot.chosen)} is not among its candidates`);
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-storyboard/test/storyboard.test.ts`
Expected: PASS, 10 tests (7 original + 1 null/tilde regression from the first review round + 2
quoted-comma/no-candidates-listed regressions from the second review round).

- [ ] **Step 5: Write `references/exchange.md`**

The six movements of the editorial exchange, verbatim from spec §7: restitution; the confirmed takeaway (G1); the five hand-of-the-journalist questions **with the destination column intact** — the destination is what stops them becoming disguised parameter collection; the shown reference loop; the slots-and-candidates proposal (G2); the beat brief. Then the discipline list: one question at a time · always carry a recommendation · never ask twice · silence is not consent · the journalist's language governs · never write in their place · a gate closes into a file.

- [ ] **Step 6: Write `twin-storyboard/SKILL.md`**

Eight sections. It must state plainly that this skill **proposes and does not interrogate**, that the storyboard shape is slots-with-candidates so that one visual and a sequence are the same object, and that nothing is produced outside the storyboard.

- [ ] **Step 7: Commit**

```bash
git add twin/skills/twin-storyboard
git commit -m "feat(twin-storyboard): slots carry candidates, so one visual and a sequence are one object"
```

---

## Task 6: The doctrine skeleton and its reference-set check

**Files:**
- Create: `twin/skills/twin-doctrine/SKILL.md`
- Create: `twin/skills/twin-doctrine/references/editorial-standard.md`
- Create: `twin/skills/twin-doctrine/references/visual-system.md`
- Create: `twin/skills/twin-doctrine/references/anti-patterns.md`
- Create: `twin/skills/twin-doctrine/references/reference-set.md`
- Create: `twin/skills/twin-doctrine/scripts/check-reference-set.mjs`
- Test: `twin/skills/twin-doctrine/test/reference-set.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `checkReferenceSet(markdown: string): string[]` — empty means every row is usable.

A reference without a URL, a timecode and a transferable lesson is decoration. This check makes that structural rather than hoped-for.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/twin-doctrine/test/reference-set.test.ts
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { checkReferenceSet } from "../scripts/check-reference-set.mjs";

const GOOD = `| Reference | Moment | Transferable lesson |
| --- | ---: | --- |
| Max Fisher — [America's job market is collapsing](https://example.org/a) | 0:48 | Warm paper field, source under the title, stable timeline. |
`;

describe("checkReferenceSet", () => {
  it("should accept a row carrying a link, a timecode and a lesson", () => {
    expect(checkReferenceSet(GOOD)).toEqual([]);
  });

  it("should reject a row with no link", () => {
    const bad = GOOD.replace("[America's job market is collapsing](https://example.org/a)", "some video");
    expect(checkReferenceSet(bad)[0]).toContain("no link");
  });

  it("should reject a row with no timecode", () => {
    const bad = GOOD.replace("| 0:48 |", "|  |");
    expect(checkReferenceSet(bad)[0]).toContain("no timecode");
  });

  it("should reject a lesson shorter than five words", () => {
    const bad = GOOD.replace("Warm paper field, source under the title, stable timeline.", "Nice.");
    expect(checkReferenceSet(bad)[0]).toContain("lesson is too thin");
  });

  it("should require at least six references in the shipped file", async () => {
    const shipped = await readFile(new URL("../references/reference-set.md", import.meta.url), "utf8");
    const rows = shipped.split("\n").filter((line) => /^\|/.test(line) && !/^\|\s*-+/.test(line));
    expect(rows.length - 1).toBeGreaterThanOrEqual(6);
    expect(checkReferenceSet(shipped)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/twin-doctrine/test/reference-set.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/twin-doctrine/scripts/check-reference-set.mjs
// A reference without a link, a timecode and a lesson is decoration.

export function checkReferenceSet(markdown) {
  const errors = [];
  const rows = markdown.split("\n").filter((line) => line.startsWith("|") && !/^\|\s*:?-+/.test(line));
  rows.slice(1).forEach((row, index) => {
    const [, reference = "", moment = "", lesson = ""] = row.split("|").map((cell) => cell.trim());
    const label = `reference ${index + 1}`;
    if (!/\]\(https?:\/\/\S+\)/.test(reference)) errors.push(`${label}: no link`);
    if (!/\d+:\d{2}/.test(moment)) errors.push(`${label}: no timecode`);
    if (lesson.split(/\s+/).filter(Boolean).length < 5) errors.push(`${label}: lesson is too thin`);
  });
  return errors;
}
```

- [ ] **Step 4: Write the four reference documents**

- `editorial-standard.md` — every visible layer must encode data, supply context, establish hierarchy, support verification, or direct attention; if removing a layer does not reduce comprehension, remove it. Visual interest comes from sequencing, comparison, annotation and the arrival of evidence, never from ornament.
- `visual-system.md` — flat field; neutral colours for history and comparison; **one semantic accent** reserved for the subject; flat fills, gradients only when they encode quantity; endpoint labels and direct annotation over detached legends; **all furniture derived from the newsroom ground, never a hard-coded colour**; contrast measured on the real background, with escalation to the pure pole on the mid-grey band.
- `anti-patterns.md` — decoration that encodes nothing; fake texture, glassmorphism, dashboard chrome; gradients without quantitative meaning; repeated years or values; detached legends; tiny footer sources; missing scale, unit, source or honest baseline; accent colour on every mark; a title that claims more than the source; copying a reference's styling instead of its information logic.
- `reference-set.md` — at least six rows, each with a real link, a timecode, and the transferable lesson.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-doctrine/test/reference-set.test.ts`
Expected: PASS, 5 tests — including the one that reads the shipped file.

- [ ] **Step 6: Write `twin-doctrine/SKILL.md`**

Eight sections. It states that this skill is never invoked alone: every production skill reads it before writing a line, and the reference loop of `twin-storyboard` draws its named set from here. Live reference research runs only when the argument structure is new to the set.

- [ ] **Step 7: Commit**

```bash
git add twin/skills/twin-doctrine
git commit -m "feat(twin-doctrine): the standard, the anti-patterns, and a reference set that must carry its lessons"
```

---

## Task 7: chart-beat — the seed and the static render ladder

**Files:**
- Create: `twin/skills/twin-chart-beat/assets/ChartSeed.tsx`
- Create: `twin/skills/twin-chart-beat/assets/sample-data/rainfall.json`
- Create: `twin/skills/twin-chart-beat/scripts/render-still.mjs`
- Create: `twin/skills/twin-chart-beat/SKILL.md`
- Create: `twin/skills/twin-chart-beat/references/seed-anatomy.md`
- Create: `twin/skills/twin-chart-beat/references/static-discipline.md`
- Test: `twin/skills/twin-chart-beat/test/render-still.test.ts`

**Interfaces:**
- Consumes: the newsroom ground and brand colour from Task 1 (`parseNewsroom`).
- Produces:
  - `deriveFurniture(ground: string): {ink: string, muted: string, grid: string}` — every colour derived from the ground, none hard-coded.
  - `renderStill({element, width, height, outDir, name}): Promise<{svgPath: string, pngPath: string}>`

**The seed is not a type.** `ChartSeed.tsx` demonstrates the anatomy — a pure geometry function, furniture derived from the ground, direct annotation, one accent — and carries the comment `REPLACE ME. Do not parameterise me.` at the top.

- [ ] **Step 1: Decide the rasteriser by running it, not by assuming it**

Two candidates: `@resvg/resvg-js` (no browser, fast) and a headless browser screenshot. Write a five-line scratch script under `/tmp` that rasterises a trivial SVG containing text with each candidate and open both PNGs. Record which one renders the text correctly with the fonts available on this machine, and use that one. If neither works, stop and report — do not design around it.

- [ ] **Step 2: Write the failing test**

```ts
// twin/skills/twin-chart-beat/test/render-still.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "../scripts/render-still.mjs";
import { ChartSeed } from "../assets/ChartSeed.tsx";
import rainfall from "../assets/sample-data/rainfall.json";

let outDir: string;
beforeEach(async () => { outDir = await mkdtemp(join(tmpdir(), "renders-")); });
afterEach(async () => { await rm(outDir, { recursive: true, force: true }); });

describe("deriveFurniture", () => {
  it("should put dark ink on a light ground", () => {
    expect(deriveFurniture("#FFFFFF").ink).toBe("#000000");
  });
  it("should put light ink on a dark ground", () => {
    expect(deriveFurniture("#101820").ink).toBe("#FFFFFF");
  });
  it("should never return a colour it was not given a ground for", () => {
    expect(() => deriveFurniture("teal")).toThrow("ground must be #rrggbb");
  });
});

describe("renderStill", () => {
  it("should write an SVG carrying the title, the source and the alt text", async () => {
    const element = createElement(ChartSeed, {
      data: rainfall,
      title: "Rainfall over Annemasse fell by a third",
      source: "MeteoSwiss, as of 31 May 2026",
      alt: "A line falling from 912 mm in 2015 to 604 mm in 2025.",
      ground: "#FFFFFF",
      accent: "#0B7A75",
      subject: "Annemasse",
    });
    const { svgPath, pngPath } = await renderStill({ element, width: 900, height: 560, outDir, name: "still" });

    const svg = await readFile(svgPath, "utf8");
    expect(svg).toContain("Rainfall over Annemasse fell by a third");
    expect(svg).toContain("MeteoSwiss");
    expect(svg).toContain("A line falling from 912 mm");
    expect((await stat(pngPath)).size).toBeGreaterThan(2000);
  });

  it("should not render a colour that was hard-coded rather than derived", async () => {
    const element = createElement(ChartSeed, {
      data: rainfall, title: "T", source: "S", alt: "A",
      ground: "#101820", accent: "#E6A700", subject: "Annemasse",
    });
    const { svgPath } = await renderStill({ element, width: 900, height: 560, outDir, name: "dark" });
    const svg = await readFile(svgPath, "utf8");
    expect(svg).not.toContain("#333333");
    expect(svg).not.toContain("#666666");
  });
});
```

- [ ] **Step 3: Run it and record the failure**

Run: `cd twin && bun test skills/twin-chart-beat/test/render-still.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write the sample data and the seed**

`rainfall.json` is an array of `{year: number, value: number}` covering 2015 to 2025 for one station, with one genuinely missing year so the seed has to show how a gap is handled.

`ChartSeed.tsx` — under 150 lines, in this order: a pure `lineGeometry(data, {width, height, padding})` returning points and ticks; `deriveFurniture(ground)` for every colour; a `<title>`-free SVG (no root tooltip — the inherited `main` fix) carrying `role="img"` and `<desc>{alt}</desc>`; the title, the source line under the header, the plot, sparse ticks, and **one direct end label on the subject in the accent colour, every other mark in muted ink**.

- [ ] **Step 5: Write the render script**

```js
// twin/skills/twin-chart-beat/scripts/render-still.mjs
// Runs inside a Splash root: uses react-dom/server from the root's dependencies.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function deriveFurniture(ground) {
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16) / 255);
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ink = luminance > 0.5 ? "#000000" : "#FFFFFF";
  const mix = (ratio) => {
    const base = ink === "#000000" ? 0 : 255;
    const groundChannels = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
    return "#" + groundChannels
      .map((value) => Math.round(value + (base - value) * ratio).toString(16).padStart(2, "0"))
      .join("");
  };
  return { ink, muted: mix(0.62), grid: mix(0.18) };
}

export async function renderStill({ element, width, height, outDir, name }) {
  await mkdir(outDir, { recursive: true });
  const svg = renderToStaticMarkup(element);
  const svgPath = join(outDir, `${name}.svg`);
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(svgPath, svg);
  await writeFile(pngPath, await rasterise(svg, width, height));
  return { svgPath, pngPath };
}
```

`rasterise` is the function chosen in Step 1, written at the bottom of this file with a header comment naming which candidate was picked and why.

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-chart-beat/test/render-still.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Look at the render**

Open the PNG produced by the test for a light ground and for a dark ground. Confirm by eye: the title reads, the source is legible under the header and not in a tiny footer, one mark carries the accent and no other, the end label is not clipped. **This step is not optional and is not satisfied by the test passing** — the checklist applies to pixels.

- [ ] **Step 8: Write the two references and the SKILL.md**

- `seed-anatomy.md` — what the seed teaches and what it does not: it is a demonstration of wiring (pure geometry → derived furniture → direct annotation → one accent), never a type to parameterise. Replacing it per story is the expected behaviour.
- `static-discipline.md` — honest baseline and visible zero; sparse ticks; source under the header; direct end labels rather than a legend; **gutters measured from the widest label, never fixed** (the four real clips this cost `main`); no root `<title>`; `role="img"` plus `<desc>` for alt text.
- `SKILL.md` — eight sections, `name: twin-chart-beat`, scope stated as **static genre only in SP1**.

- [ ] **Step 9: Commit**

```bash
git add twin/skills/twin-chart-beat
git commit -m "feat(twin-chart-beat): a seed that teaches the anatomy, and a still that gets looked at"
```

---

## Task 8: The render inspection tool

**Files:**
- Create: `twin/skills/twin-chart-beat/scripts/inspect-render.mjs`
- Test: `twin/skills/twin-chart-beat/test/inspect-render.test.ts`

**Interfaces:**
- Consumes: `deriveFurniture` from Task 7 (contrast is measured against the real ground).
- Produces: `inspectSvg(svg: string, {ground: string}): {contrast: Array<{fill: string, ratio: number, pass: boolean}>, altText: {present: boolean, text: string|null}, rootTitle: boolean}`

**This is a tool the model runs and reads, not a gate that blocks.** SP1 ships no conformance engine. It exists because three items on the checklist cannot be judged by eye — a 4.4:1 ratio looks fine.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/twin-chart-beat/test/inspect-render.test.ts
import { describe, it, expect } from "bun:test";
import { inspectSvg } from "../scripts/inspect-render.mjs";

const svg = (body: string) => `<svg role="img" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

describe("inspectSvg", () => {
  it("should measure contrast against the real ground, not against assumed white", () => {
    const dark = inspectSvg(svg('<text fill="#767676">x</text>'), { ground: "#101820" });
    const light = inspectSvg(svg('<text fill="#767676">x</text>'), { ground: "#FFFFFF" });
    expect(dark.contrast[0].ratio).not.toBeCloseTo(light.contrast[0].ratio, 1);
  });

  it("should fail a fill below 4.5:1 on the given ground", () => {
    const result = inspectSvg(svg('<text fill="#AAAAAA">x</text>'), { ground: "#FFFFFF" });
    expect(result.contrast[0].pass).toBe(false);
  });

  it("should pass black on white", () => {
    const result = inspectSvg(svg('<text fill="#000000">x</text>'), { ground: "#FFFFFF" });
    expect(result.contrast[0].ratio).toBeCloseTo(21, 0);
    expect(result.contrast[0].pass).toBe(true);
  });

  it("should report alt text missing when there is no desc", () => {
    expect(inspectSvg(svg("<text>x</text>"), { ground: "#FFFFFF" }).altText.present).toBe(false);
  });

  it("should read the alt text out of desc", () => {
    const result = inspectSvg(svg("<desc>A falling line.</desc>"), { ground: "#FFFFFF" });
    expect(result.altText).toEqual({ present: true, text: "A falling line." });
  });

  it("should flag a root title, which becomes a redundant cursor tooltip", () => {
    expect(inspectSvg(svg("<title>Chart</title>"), { ground: "#FFFFFF" }).rootTitle).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/twin-chart-beat/test/inspect-render.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/twin-chart-beat/scripts/inspect-render.mjs
// Three checklist items the eye cannot judge. A tool, not a gate.

function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

export function inspectSvg(svg, { ground }) {
  const fills = [...svg.matchAll(/<text[^>]*fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  const desc = /<desc>([\s\S]*?)<\/desc>/.exec(svg);
  return {
    contrast: fills.map((fill) => {
      const value = ratio(fill, ground);
      return { fill, ratio: Number(value.toFixed(2)), pass: value >= 4.5 };
    }),
    altText: { present: Boolean(desc), text: desc ? desc[1].trim() : null },
    rootTitle: /<svg[^>]*>\s*<title>/.test(svg),
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-chart-beat/test/inspect-render.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the tool on the real render from Task 7**

Feed the SVG produced in Task 7 to `inspectSvg` for both grounds. Every fill must pass and the alt text must be present. If a fill fails, fix the seed, re-render, and **look at the PNG again**.

- [ ] **Step 6: Commit**

```bash
git add twin/skills/twin-chart-beat
git commit -m "feat(twin-chart-beat): measure the three things the eye cannot judge"
```

---

## Task 9: The orchestrator, and a test that prose and code agree

**Files:**
- Create: `twin/skills/splash-twin/SKILL.md`
- Test: `twin/skills/splash-twin/test/phases.test.ts`

**Interfaces:**
- Consumes: `whereIs` from Task 3.
- Produces: nothing at runtime. The value is the consistency test.

`SKILL.md` documents six phases. `where.mjs` recognises a set of phases. A plan where those two drift is how `main`'s `SKILL.md` came to promise a fallback the code had stopped producing — a documented, real miss. This task makes the drift a test failure.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/splash-twin/test/phases.test.ts
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";

const PHASES = ["intake", "framing", "storyboard", "production", "delivery", "done"];

describe("the orchestrator's prose and its code agree", () => {
  it("should name every phase that where.mjs can return", async () => {
    const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");
    for (const phase of PHASES) {
      expect(skill.toLowerCase()).toContain(phase);
    }
  });

  it("should return only phases the prose names", async () => {
    const code = await readFile(new URL("../scripts/where.mjs", import.meta.url), "utf8");
    const returned = [...code.matchAll(/phase:\s*"([a-z]+)"/g)].map((m) => m[1]);
    expect(returned.length).toBeGreaterThan(0);
    for (const phase of returned) expect(PHASES).toContain(phase);
  });

  it("should carry the anti-improvisation rule verbatim", async () => {
    const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");
    expect(skill).toContain("never designed around");
  });

  it("should not name a skill id that does not exist on disk", async () => {
    const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");
    const { readdir } = await import("node:fs/promises");
    const present = await readdir(new URL("../../", import.meta.url));
    for (const id of [...skill.matchAll(/`(twin-[a-z-]+)`/g)].map((m) => m[1])) {
      expect(present).toContain(id);
    }
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/splash-twin/test/phases.test.ts`
Expected: FAIL — `SKILL.md` does not exist.

- [ ] **Step 3: Write `splash-twin/SKILL.md`**

Eight sections. Four responsibilities and no fifth: sequence the phases and refuse the jumps; hold state on disk, never in memory; make the gates close **into a file**; dispatch to the craft skill. Then, explicitly:

- the phase table from spec §4, with the gate that closes each one and the file it writes;
- the abstract verb vocabulary (`read-file`, `write-file`, `execute-shell`, `search`, `fetch`, `invoke-skill`) used throughout, so the twin can leave this runtime without a rewrite;
- the never-list: the orchestrator produces nothing itself, writes no ad-hoc script, moves no artifact by hand, and never continues past a producer that exited non-zero. A missing prerequisite is reported and **never designed around**;
- the turn budget: three cycles per beat, then stall — hand back with the gaps named and what was tried.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/splash-twin/test/phases.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add twin/skills/splash-twin
git commit -m "feat(splash-twin): the orchestrator, and a test that its prose cannot drift from its code"
```

---

## Task 10: Delivery — offer the forms, build only the chosen one

**Files:**
- Create: `twin/skills/twin-deliver/scripts/deliver.mjs`
- Create: `twin/skills/twin-deliver/SKILL.md`
- Test: `twin/skills/twin-deliver/test/deliver.test.ts`

**Interfaces:**
- Consumes: the beat directory shape from Tasks 2 and 7.
- Produces:
  - `offerForms({medium, genre}): Array<{id: string, label: string, gives: string}>`
  - `materialise({form, beatDir, exportDir}): Promise<string[]>` — the paths written.

Materialisation is **lazy**: nothing is built before the journalist chooses. That reverses `main`'s habit of producing every form up front.

- [ ] **Step 1: Write the failing test**

```ts
// twin/skills/twin-deliver/test/deliver.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { offerForms, materialise } from "../scripts/deliver.mjs";

let beatDir: string, exportDir: string;
beforeEach(async () => {
  const base = await mkdtemp(join(tmpdir(), "beat-"));
  beatDir = join(base, "1-rainfall");
  exportDir = join(base, "export");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await writeFile(join(beatDir, "Rainfall.tsx"), "export const Rainfall = () => null;");
  await writeFile(join(beatDir, "data.json"), "[]");
});
afterEach(async () => { await rm(join(beatDir, ".."), { recursive: true, force: true }); });

describe("offerForms", () => {
  it("should offer the owned file and the source bundle for a static chart", () => {
    const ids = offerForms({ medium: "chart", genre: "static" }).map((f) => f.id);
    expect(ids).toEqual(["owned-file", "source-bundle"]);
  });

  it("should never offer an embed for a static beat", () => {
    expect(offerForms({ medium: "chart", genre: "static" }).map((f) => f.id)).not.toContain("embed");
  });

  it("should describe what each form gives, so the choice is informed", () => {
    for (const form of offerForms({ medium: "chart", genre: "static" })) {
      expect(form.gives.split(/\s+/).length).toBeGreaterThan(4);
    }
  });
});

describe("materialise", () => {
  it("should write only the owned file when that form is chosen", async () => {
    const written = await materialise({ form: "owned-file", beatDir, exportDir });
    const files = await readdir(exportDir);
    expect(files).toContain("still.png");
    expect(files).toContain("still.svg");
    expect(files).not.toContain("package.json");
    expect(written).toHaveLength(2);
  });

  it("should write a runnable bundle only when the source form is chosen", async () => {
    await materialise({ form: "source-bundle", beatDir, exportDir });
    const files = await readdir(exportDir);
    expect(files).toContain("package.json");
    expect(files).toContain("Rainfall.tsx");
  });

  it("should refuse a form that was never offered", async () => {
    await expect(materialise({ form: "embed", beatDir, exportDir })).rejects.toThrow("not an offered form");
  });
});
```

- [ ] **Step 2: Run it and record the failure**

Run: `cd twin && bun test skills/twin-deliver/test/deliver.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

```js
// twin/skills/twin-deliver/scripts/deliver.mjs
// Lazy by design: nothing is built before the journalist has chosen.

import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const FORMS = {
  "owned-file": { label: "The file itself", gives: "a PNG and an SVG the newsroom owns outright" },
  "source-bundle": { label: "Runnable source", gives: "a folder that rebuilds this chart with bun install and bun run build" },
};

export function offerForms({ medium, genre }) {
  if (genre !== "static") throw new Error(`SP1 delivers the static genre only, got ${JSON.stringify(genre)}`);
  return ["owned-file", "source-bundle"].map((id) => ({ id, ...FORMS[id] }));
}

export async function materialise({ form, beatDir, exportDir }) {
  if (!FORMS[form]) throw new Error(`${form} is not an offered form`);
  await mkdir(exportDir, { recursive: true });
  const written = [];

  if (form === "owned-file") {
    for (const file of await readdir(join(beatDir, "renders"))) {
      await copyFile(join(beatDir, "renders", file), join(exportDir, file));
      written.push(join(exportDir, file));
    }
    return written;
  }

  for (const file of await readdir(beatDir)) {
    if (file === "renders") continue;
    await copyFile(join(beatDir, file), join(exportDir, file));
    written.push(join(exportDir, file));
  }
  const manifest = join(exportDir, "package.json");
  await writeFile(manifest, JSON.stringify({
    name: "splash-beat", private: true, type: "module",
    scripts: { build: "bun run build.ts" },
  }, null, 2));
  written.push(manifest);
  return written;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd twin && bun test skills/twin-deliver/test/deliver.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write `twin-deliver/SKILL.md`**

Eight sections. It must state that the forms are **offered and then waited on** — silence is not a choice — and that only the chosen form is built.

- [ ] **Step 6: Commit**

```bash
git add twin/skills/twin-deliver
git commit -m "feat(twin-deliver): offer the forms, wait, then build only the chosen one"
```

---

## Task 11: The end-to-end proof

**Files:**
- Create: `twin/PROOF.md`
- Create (outside the repo): a real Splash root with one real story.

No new production code. This task exists because every prior task proves a part and none proves the method.

- [ ] **Step 1: Build a real Splash root**

Copy `assets/root-template/` to a folder outside this repo, run `bun install`, write a real `NEWSROOM.md`, and run the preflight. Record its verdict verbatim — including a red key if a key is red.

- [ ] **Step 2: Bring a real article and real data**

Not a fixture. An actual article with an actual dataset. Freeze it with `freezeSource` and read `source/profile.json`.

- [ ] **Step 3: Run the editorial exchange as written**

Follow `twin-storyboard/references/exchange.md` in order, playing the journalist honestly — restitution first, the takeaway confirmed verbatim, the five questions one at a time, the reference loop shown with real links, then the slots-and-candidates proposal. Write `STORYBOARD.md` and run `checkStoryboard` until it returns `[]`.

- [ ] **Step 4: Produce the beat**

Write `BRIEF.md`. Then write a **bespoke** component for this story — starting from `ChartSeed.tsx` and replacing it, not parameterising it. Render the still. **Look at the PNG.** Run `inspectSvg`. Iterate at most three times; if the third cycle does not pass, stall and write down the gaps rather than continuing.

- [ ] **Step 5: Deliver**

Offer the two forms, choose one, materialise only that one.

- [ ] **Step 6: Write `twin/PROOF.md`**

The honest record: the preflight verdict, the storyboard, the number of cycles the beat took, the wall-clock, what the pixel checklist caught, what it missed, and the final PNG committed next to it. Where the method was worse than `main`, say so — this document is evidence for the SP7 verdict, not a press release.

- [ ] **Step 7: Commit**

```bash
git add twin/PROOF.md twin/proof/
git commit -m "docs(twin): the spine, end to end, on a real article"
```

---

## Self-Review

**Spec coverage.** §3 objects → Tasks 1, 2, 7. §4 journey → Tasks 3, 9 (phases and gates), 4 (intake), 5 (framing and storyboard), 7 (production), 10 (delivery). §5 root → Task 1. §6 inventory → SP1 builds six of the twelve skills; `map-beat`, `flyover-beat`, `dw-beat`, `image-beat`, `montage` and `scroll` are SP3–SP6 by design and are named as out of scope in this plan's goal. §6 three floors → Task 7 (seed) and Task 6 (doctrine); `references/types/*.md` and `shared/geometry/` are SP2 and are not in this plan. §7 exchange → Task 5 Step 5. §8 loop → Task 7 Step 7, Task 8 Step 5, Task 9 Step 3, Task 11 Step 4. §9 isolation → Global Constraints and Task 1 Step 15. §10 verdict → Task 11.

**Gap found and closed.** The turn budget and stall protocol had no home; they are now written into `SKILL.md` in Task 9 Step 3 and exercised in Task 11 Step 4.

**Placeholder scan.** No TBD, no "handle edge cases", no "similar to Task N". Task 7 Step 1 is a decision made by running two candidates, with the failure path stated (stop and report), not a deferral.

**Type consistency.** `deriveFurniture(ground)` is defined in Task 7 and reused in Task 8 with the same signature. `whereIs` returns the six phases asserted in Task 9. `offerForms`/`materialise` share the `form.id` vocabulary. `parseNewsroom`/`validateNewsroom` are consumed by `runPreflight` with the signatures Task 1 declares.

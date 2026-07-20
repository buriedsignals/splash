# C2 — Mechanical Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** no journalist ever reaches PRODUCTION before Splash has checked — and said, in their
language — that the routed engine's keys and deps are ready (Tom's #4: "preflight never ran,
never asked for a DW key").

**Architecture:** a declarative per-engine prerequisite manifest (`skills/splash/src/preflight.ts`)
consumed at two moments: (1) a CLI (`scripts/preflight.mjs`) the orchestrator runs at PROPOSITION
to annotate not-ready engines in the proposal; (2) a blocking check inside `produce-all.ts`'s
per-proposal loop, before validation, replacing today's lazy deep failures
(`datawrapper.ts:3-8` throws mid-PRODUCTION; MapTiler throws at component load).

**Tech Stack:** TypeScript, Bun, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun runtime, bun:test, TDD.
- Journalist-facing message text: which key, where to get it, where to put it (`/splash/.env`).
- Single source of truth with the installer: every env var the manifest names must be one the
  installer writes (`install/configurator-core.ts` `serializeEnv`) — parity-tested.
- `FLY_API_TOKEN` belongs to the EMBED DELIVERY FORM, not to an engine — `deploy-embed.mjs:71-79`
  already fail-fasts on it; C2 does not move that check, only aligns its message format.

---

### Task 1: The manifest + `preflightFindings` (pure core)

**Files:**
- Create: `skills/splash/src/preflight.ts`
- Test: `skills/splash/tests/preflight.test.ts`

**Interfaces:**
- Consumes: `Producer` from `./producer-spec`.
- Produces:
  - `ENGINE_REQUIREMENTS: Record<Producer, EngineRequirements>`
  - `preflightFindings(producer: Producer, opts?: PreflightOpts): PreflightFinding[]`
    (empty array = ready)
  - `interface PreflightFinding { kind: "env" | "deps"; message: string }`
  - `interface PreflightOpts { env?: Record<string, string | undefined>; resolveDep?: (pkg: string, fromDir: string) => boolean }`
    (injection seams for tests and for the CLI's root-`.env` fallback)
  - **Tri-state wrapper (Spotlight A2, spec §C2):**
    `enginePreflightStatus(producer, opts?): EngineStatus` with
    `interface EngineStatus { status: "green" | "yellow" | "red"; checkedAt: string; reason: string }`
    — derived from the findings: no findings ⇒ `green` · env-only findings ⇒ `yellow`
    (journalist-fixable via `.env`; the engine is ANNOTATED in proposals, and blocked at
    dispatch until fixed) · any deps finding ⇒ `red` (install problem — `bun install`
    instruction). `checkedAt` is injected (`opts.now?: string`) so tests stay
    clock-deterministic; `reason` concatenates the findings' messages (empty for green).

- [ ] **Step 1: Write the failing tests**

```ts
// preflight.test.ts — the per-engine readiness manifest. Pure: env and dep resolution are
// injected, so these tests never depend on the machine's real .env or node_modules.
import { describe, expect, it } from "bun:test";
import { ENGINE_REQUIREMENTS, preflightFindings } from "../src/preflight";

const ALL_SET = {
  DATAWRAPPER_API_TOKEN: "dw-token",
  VITE_MAPTILER_KEY: "mt-key",
  REMOTION_MAPTILER_KEY: "mt-key",
};
const resolves = () => true;
const neverResolves = () => false;

describe("preflightFindings", () => {
  it("should return no findings for dw-chart when the DW token is set", () => {
    expect(
      preflightFindings("dw-chart", { env: ALL_SET, resolveDep: resolves }),
    ).toEqual([]);
  });

  it("should name DATAWRAPPER_API_TOKEN, its purpose and /splash/.env when missing for dw-chart", () => {
    const findings = preflightFindings("dw-chart", { env: {}, resolveDep: resolves });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("env");
    expect(findings[0].message).toContain("DATAWRAPPER_API_TOKEN");
    expect(findings[0].message).toContain("/splash/.env");
    expect(findings[0].message).toContain("datawrapper.de");
  });

  it("should accept EITHER MapTiler prefix for map-native (mirror rule)", () => {
    const onlyRemotion = { REMOTION_MAPTILER_KEY: "mt-key" };
    const envFindings = preflightFindings("map-native", {
      env: onlyRemotion,
      resolveDep: resolves,
    }).filter((f) => f.kind === "env");
    expect(envFindings).toEqual([]);
  });

  it("should flag map-native deps when remotion/react do not resolve (Tom's crash class)", () => {
    const findings = preflightFindings("map-native", {
      env: ALL_SET,
      resolveDep: neverResolves,
    });
    expect(findings.some((f) => f.kind === "deps")).toBe(true);
    expect(findings.find((f) => f.kind === "deps")!.message).toContain("bun install");
  });

  it("should treat an empty-string env var as missing", () => {
    const findings = preflightFindings("dw-chart", {
      env: { DATAWRAPPER_API_TOKEN: "  " },
      resolveDep: resolves,
    });
    expect(findings).toHaveLength(1);
  });

  it("should cover every producer in the manifest", () => {
    for (const producer of ["dw-chart", "chart-native", "map-dw", "map-native", "scrolly"] as const) {
      expect(ENGINE_REQUIREMENTS[producer]).toBeDefined();
    }
  });
});

describe("enginePreflightStatus (tri-state, Spotlight A2)", () => {
  const NOW = "2026-07-16T12:00:00Z";
  it("should be green with an empty reason when everything resolves", () => {
    expect(
      enginePreflightStatus("dw-chart", { env: ALL_SET, resolveDep: resolves, now: NOW }),
    ).toEqual({ status: "green", checkedAt: NOW, reason: "" });
  });
  it("should be yellow (journalist-fixable) on a missing key", () => {
    const s = enginePreflightStatus("dw-chart", { env: {}, resolveDep: resolves, now: NOW });
    expect(s.status).toBe("yellow");
    expect(s.reason).toContain("DATAWRAPPER_API_TOKEN");
  });
  it("should be red on unresolved deps, even when keys are set (install problem beats key problem)", () => {
    const s = enginePreflightStatus("map-native", { env: ALL_SET, resolveDep: neverResolves, now: NOW });
    expect(s.status).toBe("red");
    expect(s.reason).toContain("bun install");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/splash && bun test tests/preflight.test.ts`
Expected: FAIL — `Cannot find module '../src/preflight'`.

- [ ] **Step 3: Implement `preflight.ts`**

```ts
// preflight.ts — mechanical per-engine readiness (C2, Tom feedback #4). One declarative
// manifest, two consumers: the PROPOSITION-time CLI (scripts/preflight.mjs, annotates
// not-ready engines in the ranked list) and produce-all's blocking gate (fail-fast in
// journalist language BEFORE production, replacing the lazy deep throws: dw-chart's
// token() at the first API call, map-native's key throw at component load).
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Producer } from "./producer-spec";

const here = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(here, "../..");

// Each inner array is an ALTERNATIVES group: at least one member must be set (the MapTiler
// mirror rule — either prefix satisfies both builds, produce.mjs mirrors one onto the other).
export interface EngineRequirements {
  env: string[][];
  envHelp: Record<string, string>; // per-var: where the journalist gets it
  criticalDeps: { fromSkillDir: string; packages: string[] } | null;
}

export interface PreflightFinding {
  kind: "env" | "deps";
  message: string;
}

export interface PreflightOpts {
  env?: Record<string, string | undefined>;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
}

const DW_HELP =
  "create a token at https://app.datawrapper.de/account/api-tokens (free account works)";
const MT_HELP = "create a free key at https://cloud.maptiler.com/account/keys/";

export const ENGINE_REQUIREMENTS: Record<Producer, EngineRequirements> = {
  "dw-chart": {
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    criticalDeps: null, // cloud producer: fetch only, no heavy local deps
  },
  "map-dw": {
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    criticalDeps: null,
  },
  "chart-native": {
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "chart-native", packages: ["react", "vite"] },
  },
  "map-native": {
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: {
      VITE_MAPTILER_KEY: MT_HELP,
      REMOTION_MAPTILER_KEY: MT_HELP,
    },
    criticalDeps: {
      fromSkillDir: "map-native",
      packages: ["react", "remotion", "maplibre-gl"],
    },
  },
  scrolly: {
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: {
      VITE_MAPTILER_KEY: MT_HELP,
      REMOTION_MAPTILER_KEY: MT_HELP,
    },
    criticalDeps: { fromSkillDir: "scrolly", packages: ["react", "vite"] },
  },
};

// The embed DELIVERY FORM's requirement (not an engine's): deploy-embed.mjs owns the
// fail-fast; exported here so its message and the parity test share the single list.
export const EMBED_DELIVERY_ENV = ["FLY_API_TOKEN", "SPLASH_EMBED_APP"] as const;

function defaultResolveDep(pkg: string, fromDir: string): boolean {
  try {
    Bun.resolveSync(pkg, fromDir);
    return true;
  } catch {
    return false;
  }
}

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

export function preflightFindings(
  producer: Producer,
  opts: PreflightOpts = {},
): PreflightFinding[] {
  const req = ENGINE_REQUIREMENTS[producer];
  const env = opts.env ?? process.env;
  const resolveDep = opts.resolveDep ?? defaultResolveDep;
  const findings: PreflightFinding[] = [];

  for (const group of req.env) {
    if (group.some((name) => isSet(env[name]))) continue;
    const helps = group
      .map((name) => `${name} (${req.envHelp[name] ?? "see the install guide"})`)
      .join(" or ");
    findings.push({
      kind: "env",
      message:
        `${producer} needs ${helps} — add it to /splash/.env (the installer's ` +
        `"Configure Splash" page writes it for you), then retry`,
    });
  }

  if (req.criticalDeps) {
    const fromDir = join(SKILLS_ROOT, req.criticalDeps.fromSkillDir);
    const missing = req.criticalDeps.packages.filter(
      (pkg) => !resolveDep(pkg, fromDir),
    );
    if (missing.length) {
      findings.push({
        kind: "deps",
        message:
          `${producer}'s dependencies are not installed (${missing.join(", ")} missing) — ` +
          `run \`bun install\` in skills/${req.criticalDeps.fromSkillDir}, then retry`,
      });
    }
  }

  return findings;
}

// Tri-state status object (Spotlight A2, docs/splash/spotlight-learnings.md): what gets
// PERSISTED per project and read by the PROPOSITION-time CLI. Derivation: green = ready;
// yellow = env-only findings (journalist-fixable via .env — the engine stays proposable,
// annotated); red = any deps finding (install problem — needs `bun install`, not a key).
export interface EngineStatus {
  status: "green" | "yellow" | "red";
  checkedAt: string;
  reason: string;
}

export function enginePreflightStatus(
  producer: Producer,
  opts: PreflightOpts & { now?: string } = {},
): EngineStatus {
  const findings = preflightFindings(producer, opts);
  const checkedAt = opts.now ?? new Date().toISOString();
  if (findings.length === 0) return { status: "green", checkedAt, reason: "" };
  const status = findings.some((f) => f.kind === "deps") ? "red" : "yellow";
  return { status, checkedAt, reason: findings.map((f) => f.message).join("; ") };
}
```

- [ ] **Step 4: Run the tests — green**

Run: `cd skills/splash && bun test tests/preflight.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/preflight.ts skills/splash/tests/preflight.test.ts
git commit -m "feat(splash): per-engine preflight manifest + findings core"
```

---

### Task 2: Installer parity — manifest env vars ⊆ what the installer writes

**Files:**
- Test: `skills/splash/tests/preflight.test.ts` (extend)

**Interfaces:**
- Consumes: `serializeEnv`, `ConfiguratorConfig` from `install/configurator-core.ts`;
  `ENGINE_REQUIREMENTS`, `EMBED_DELIVERY_ENV` from `../src/preflight`.

- [ ] **Step 1: Write the failing (or immediately-green) parity test**

Append to `preflight.test.ts`:

```ts
import { serializeEnv } from "../../../install/configurator-core";
import { EMBED_DELIVERY_ENV } from "../src/preflight";

describe("installer parity", () => {
  it("should only require env vars the installer's configurator writes", () => {
    const written = serializeEnv({
      runtime: "claude",
      maptiler: "x",
      datawrapper: "x",
      anthropic: "x",
      embedApp: "x",
      flyToken: "x",
    });
    const writtenNames = new Set(
      written
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split("=")[0]),
    );
    const required = new Set<string>(EMBED_DELIVERY_ENV);
    for (const req of Object.values(ENGINE_REQUIREMENTS))
      for (const group of req.env) for (const name of group) required.add(name);
    for (const name of required) expect(writtenNames.has(name)).toBe(true);
  });
});
```

(If the relative import path `../../../install/configurator-core` does not resolve from
`skills/splash/tests/`, check the actual repo layout — `install/` sits at the repo root — and
adjust the number of `../` segments; the test must import the REAL `serializeEnv`, never a
copied list.)

- [ ] **Step 2: Run it**

Run: `cd skills/splash && bun test tests/preflight.test.ts`
Expected: PASS (every manifest var is already in `serializeEnv`). If it fails, the manifest
names a var the installer never writes — fix the manifest (or extend the installer), never
delete the test.

- [ ] **Step 3: Commit**

```bash
git add skills/splash/tests/preflight.test.ts
git commit -m "test(splash): preflight manifest stays in parity with the installer env list"
```

---

### Task 3: Blocking gate in produce-all (fail-fast BEFORE validation/dispatch)

**Files:**
- Modify: `skills/splash/src/produce-all.ts` (inside the per-proposal loop, right after the
  channel gate at lines 101-112, BEFORE Gate 2b at line 116)
- Test: `skills/splash/tests/produce-all.test.ts` (extend)

**Interfaces:**
- Consumes: `preflightFindings(producer, opts?)` from `./preflight`.
- Produces: `produceAll` gains an optional `preflight` parameter (default: the real
  `preflightFindings`) so tests inject a fake — same injection pattern the function already
  uses for `dispatch` and `validate`.

- [ ] **Step 1: Write the failing test**

Append to `produce-all.test.ts` (reuse the file's existing helpers for a minimal accepted
proposal + fake dispatch — follow its local naming):

```ts
it("should fail a proposal loud, in journalist language, when the engine preflight is not ready", async () => {
  const dispatched: string[] = [];
  const fakeDispatch = async (p: { id: string }) => {
    dispatched.push(p.id);
    return { status: "produced" as const, outputs: [] };
  };
  const alwaysValid = () => ({ ok: true as const, warnings: [] });
  const notReady = () => [
    {
      kind: "env" as const,
      message:
        "dw-chart needs DATAWRAPPER_API_TOKEN (create a token at https://app.datawrapper.de/account/api-tokens) — add it to /splash/.env",
    },
  ];
  const report = await produceAll(
    [
      {
        id: "el-1",
        producer: "dw-chart",
        format: "static",
        spec: { title: "t", data: "a,b\n1,2" },
        confirmedTakeaway: "the takeaway",
      },
    ],
    "/tmp/preflight-test-out",
    fakeDispatch,
    alwaysValid,
    undefined,
    notReady,
  );
  expect(report.results[0].status).toBe("failed");
  expect(report.results[0].error).toContain("DATAWRAPPER_API_TOKEN");
  expect(report.results[0].error).toContain("/splash/.env");
  expect(dispatched).toEqual([]); // never dispatched — blocked BEFORE production
});
```

(Match the exact `produceAll` signature in `produce-all.ts` — the existing test file shows the
current parameter order for `dispatch`/`validate`/`profile`; add `preflight` as the LAST
parameter with the real function as default.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd skills/splash && bun test tests/produce-all.test.ts`
Expected: FAIL (produceAll has no 6th parameter; the proposal dispatches).

- [ ] **Step 3: Implement the gate**

In `skills/splash/src/produce-all.ts`:

1. Import: `import { preflightFindings, type PreflightFinding } from "./preflight";`
2. Add the parameter (mirroring how `validate` is injected):

```ts
export async function produceAll(
  accepted: AcceptedProposal[],
  outDir: string,
  dispatch: Dispatch,
  validate: ValidateFn,
  profile?: NewsroomProfile,
  preflight: (p: Producer) => PreflightFinding[] = preflightFindings,
): Promise<ProduceReport> {
```

(Adjust names/types to the file's actual signature — keep every existing call site compiling:
the new parameter is optional and last.)

3. Insert AFTER the channel gate (`assertFormatAllowed` try/catch, ends line 112) and BEFORE
Gate 2b (line 116):

```ts
    // C2 preflight — the engine's keys/deps are checked HERE, before anything is promised
    // or produced, replacing the lazy deep failures (dw-chart's token() throw at the first
    // API call mid-PRODUCTION, map-native's key throw at component load). The message is
    // journalist-language: which key, where to get it, where to put it.
    const notReady = preflight(p.producer);
    if (notReady.length) {
      results.push({
        ...base,
        status: "failed",
        error: `preflight: ${notReady.map((f) => f.message).join("; ")}`,
      });
      continue;
    }
```

- [ ] **Step 4: Run the suite — green, no regression**

Run: `cd skills/splash && bun test`
Expected: PASS (existing produce-all tests unaffected: the default `preflightFindings` finds a
ready engine for fake dispatch cases only if env is set — if existing tests break because the
real default checks real env, pass an always-ready `() => []` preflight in those existing tests'
calls; never weaken the manifest to make a test pass).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/produce-all.ts skills/splash/tests/produce-all.test.ts
git commit -m "feat(splash): produce-all preflight gate — engine keys/deps fail fast before production"
```

---

### Task 4: PROPOSITION-time CLI + SKILL.md annotation rule

**Files:**
- Create: `skills/splash/scripts/preflight.mjs`
- Modify: `skills/splash/SKILL.md` (PROPOSITION section, after the "Only offer what is confirmed
  producible" block around line 241-245)
- Test: `skills/splash/tests/preflight-cli.test.ts`

**Interfaces:**
- Consumes: `preflightFindings`, `enginePreflightStatus`, `ENGINE_REQUIREMENTS` from
  `../src/preflight.ts`.
- Produces: `bun scripts/preflight.mjs [producer…] [--project <dir>]` → prints JSON
  `{ engines: { [producer]: { ready: boolean, status: EngineStatus, findings: PreflightFinding[] } } }`,
  exit 0 always (reporting, not gating — the produce-time gate is Task 3). **Persistence
  (Spotlight A2):** the CLI also WRITES the tri-state map to `<project>/.splash-preflight.json`
  (`{ schemaVersion: "1", engines: { [producer]: EngineStatus } }`, default project = cwd) so
  later turns/resumes read the persisted statuses instead of re-probing every run; a re-run of
  the CLI refreshes the file (statuses carry `checkedAt`). Add a CLI test: after running, the
  file exists, parses, and its `dw-chart.status` matches the printed one.

- [ ] **Step 1: Write the failing CLI test**

```ts
// preflight-cli.test.ts — the PROPOSITION-time readiness report the orchestrator runs
// before presenting engines to the journalist.
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../scripts/preflight.mjs");

describe("preflight CLI", () => {
  it("should report every named engine with ready flag + findings, exit 0", () => {
    const out = execFileSync("bun", [CLI, "dw-chart", "map-native"], {
      env: { ...process.env, DATAWRAPPER_API_TOKEN: "" }, // force the dw finding
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    expect(report.engines["dw-chart"].ready).toBe(false);
    expect(report.engines["dw-chart"].findings[0].message).toContain(
      "DATAWRAPPER_API_TOKEN",
    );
    expect(report.engines["map-native"]).toBeDefined();
  });

  it("should default to ALL engines when no argument is given", () => {
    const out = execFileSync("bun", [CLI], { encoding: "utf8" });
    const report = JSON.parse(out);
    for (const p of ["dw-chart", "chart-native", "map-dw", "map-native", "scrolly"])
      expect(report.engines[p]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/splash && bun test tests/preflight-cli.test.ts`
Expected: FAIL (script does not exist).

- [ ] **Step 3: Implement the CLI**

```js
// CLI: bun scripts/preflight.mjs [producer…] — PROPOSITION-time engine readiness report.
// Prints JSON; ALWAYS exits 0 (it informs the ranked-list annotation — the blocking gate
// lives in produce-all). Falls back to the repo-root .env for key lookup so a standard
// install (launcher sources /splash/.env) and a bare dev shell report identically.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENGINE_REQUIREMENTS, preflightFindings } from "../src/preflight.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = resolve(here, "../../../.env");

function rootEnv() {
  const out = {};
  try {
    for (const line of readFileSync(ROOT_ENV, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {
    // no root .env — process.env alone decides
  }
  return out;
}

const env = { ...rootEnv(), ...process.env };
const producers =
  process.argv.length > 2 ? process.argv.slice(2) : Object.keys(ENGINE_REQUIREMENTS);
const engines = {};
for (const producer of producers) {
  if (!ENGINE_REQUIREMENTS[producer]) {
    console.error(`unknown producer "${producer}" — known: ${Object.keys(ENGINE_REQUIREMENTS).join(", ")}`);
    process.exit(1);
  }
  const findings = preflightFindings(producer, { env });
  engines[producer] = { ready: findings.length === 0, findings };
}
console.log(JSON.stringify({ engines }, null, 2));
```

- [ ] **Step 4: Run the CLI tests — green**

Run: `cd skills/splash && bun test tests/preflight-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the SKILL.md annotation rule**

In `skills/splash/SKILL.md`, insert AFTER the "Only offer what is confirmed producible."
paragraph (ends around line 245):

```markdown
**Preflight annotation (C2).** Before presenting engines/types, run
`bun skills/splash/scripts/preflight.mjs` (JSON report, per engine). A type whose engine is
NOT ready is **annotated, never silently omitted** — e.g. « ce type passe par Datawrapper —
il te faudra une clé (gratuite) ; je te guide si tu le choisis » — so the journalist can pick
it and fix the key, or pick a ready alternative. The produce-time gate (produce-all) re-checks
mechanically either way; this annotation is honesty, not the enforcement.
```

- [ ] **Step 6: Full suite + commit**

Run: `cd skills/splash && bun test`
Expected: PASS.

```bash
git add skills/splash/scripts/preflight.mjs skills/splash/tests/preflight-cli.test.ts skills/splash/SKILL.md
git commit -m "feat(splash): preflight CLI + PROPOSITION annotation rule — engines announce their missing keys"
```

---

### Task 5: Align the two existing deep failures' messages (no behavior move)

**Files:**
- Modify: `skills/dw-chart/src/datawrapper.ts:3-8`
- Modify: `skills/splash/scripts/deploy-embed.mjs:71-79` (message only)

**Interfaces:**
- Consumes: nothing new (message strings only — the checks stay where they are, as
  belt-and-suspenders behind the new gate).

- [ ] **Step 1: Enrich dw-chart's lazy throw (kept as last-resort)**

In `skills/dw-chart/src/datawrapper.ts`, replace the `token()` error message:

```ts
function token(): string {
  const t = process.env.DATAWRAPPER_API_TOKEN;
  if (!t)
    throw new Error(
      "DATAWRAPPER_API_TOKEN is not set — create a token at " +
        "https://app.datawrapper.de/account/api-tokens and add it to /splash/.env " +
        "(preflight should have caught this before production; if you see this, " +
        "the preflight gate was bypassed)",
    );
  return t;
}
```

- [ ] **Step 2: Align deploy-embed's message format**

In `skills/splash/scripts/deploy-embed.mjs` (lines 71-79), keep the fail-fast exactly where it
is; extend the message to name where to get the token and where it goes, matching the preflight
voice: `"embed delivery needs FLY_API_TOKEN (create a deploy token with \`flyctl tokens create deploy\`) — add it to /splash/.env, or choose the standalone HTML form (b) instead"`.

- [ ] **Step 3: Run both suites + commit**

Run: `cd skills/dw-chart && bun test` then `cd ../splash && bun test`
Expected: PASS (message-only changes; if a test asserts the old message text, update the
assertion to the new text).

```bash
git add skills/dw-chart/src/datawrapper.ts skills/splash/scripts/deploy-embed.mjs
git commit -m "chore(preflight): align the two residual deep-failure messages with the preflight voice"
```

---

### Task 6: Gate + acceptance

- [ ] **Step 1: Full gate**

Run: `bun run check`
Expected: green.

- [ ] **Step 2: Live acceptance (real keys, no mocks)**

With a real `/splash/.env` absent-then-present, run
`bun skills/splash/scripts/preflight.mjs` both ways and paste both JSON outputs in the PR:
one showing `dw-chart.ready: false` with the journalist message, one all-ready.

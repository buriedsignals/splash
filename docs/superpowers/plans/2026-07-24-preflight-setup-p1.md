# Préflight — P1 (the newsroom decor as typed state) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the newsroom "decor" — which capabilities this newsroom has, which it *wants*, and which language it works in — a typed, pure, file-backed state that the proposal offer, the delivery copy and a non-JavaScript host all actually consume.

**Architecture:** A new `lib/newsroom/` directory owns the decor: one declarative capability registry (hoisted out of the legacy orchestrator, which then re-exports it), one state file `newsroom.json` at the repo root next to `.env`, one pure readiness function, one language resolver, and one impure composition seam (`loadDecor`) that reads them. Three consumers land in the same slice so nothing ships dead: the `propose` offer gains a CAPACITÉ axis, `export-code.mjs` stops printing hard-coded French, and the host façade gains a fifth command `splash newsroom`.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod 4.4.3 (already used by `lib/loop/manifest.ts`)

**Spec:** `docs/superpowers/specs/2026-07-24-preflight-setup-design.md` — §4 is this plan's scope. §3 is the model, §5 is P2 (not this plan).

## Design decisions taken when writing this plan (deviations from the spec, with reasons)

1. **No `settings` map in P1's state.** §3.2 sketched `capabilities[id].settings` for non-secret provider identifiers. But `CLOUDFLARE_ACCOUNT_ID` and `SPLASH_EMBED_PROJECT` are read from the environment by the shipped `skills/splash/scripts/deploy-embed.mjs`, so putting them in `newsroom.json` too would give one field two homes — exactly what §3.1 forbids — and moving them would break a working delivery path. `.env` stays the single home for everything a provider needs; `newsroom.json` holds only what no provider reads: `enabled`, `lastVerified`, `runtime`, `uiLang`, `publisher`. The *declaration* of which fields the page must ask for (and which are secret) lives on the capability, where P2 needs it.
2. **Capability ids are producer names plus delivery ids** (`chart-native`, `map-native`, …, `embed-cloudflare`), matching `kind: "engine" | "delivery"` in §3.2. Grouping them into journalist-facing checkboxes ("maps" covering `map-native` + `scrolly`) is presentation, and belongs to P2's page — not to the state model.
3. **`resolveLanguage` reads the content language through the existing profile loader** (`loadNewsroomProfile(dir)?.lang`, `skills/splash/src/brand-profile.ts:369`). No second markdown parser, and `NEWSROOM-PROFILE.md` keeps its single reader.
4. **The legacy migration runs from `loadDecor`, once**, when `newsroom.json` is absent and at least one legacy file exists. It is the only write on a read path in this slice, and it is what makes an existing install not get re-interrogated.

## Global Constraints

- Runtime **Bun**; tests `bun:test` (`describe`/`it`/`expect`). **TDD** — failing test before implementation, every task.
- Code, comments, identifiers, filenames, commit messages: **English**. (Spec prose is French; code is not.)
- **No vendor mention** (Claude/Anthropic) in any committed artifact. **No `Co-Authored-By` trailer.**
- **No new `any`.** No mocking of external APIs — real keys, real failures.
- Gate `bun run check` green before every commit. Run it in the **foreground** (Bash `timeout: 600000`); never background it.
- **No new gate row is needed:** `scripts/check.mjs` already lists `lib` in both `TSC_DIRS` and `TEST_DIRS`, so `lib/newsroom/**` is typechecked and tested by the existing gate.
- `skills/image-native` `tests/produce.test.ts` is a **known flake** unrelated to this work — if it fails, re-run it in isolation to confirm the flake and say so.
- **The verb contract's invariants still bind:** the contract never reads `process.env` (**I5**). Capability checks therefore live in `lib/newsroom` and in *callers* (driver, export script, host command) — never inside `lib/core/verbs/`.
- **Never hand-duplicate a vocabulary.** Engine requirements come from `lib/newsroom/capabilities.ts` after Task 1; host error codes from `lib/host/errors.ts`; formats/channels/verbs from `lib/core/vocabulary.ts`.
- Branch `feat/preflight-setup` off `feat/verb-host-cli`, worktree `../splash-preflight` (already created).

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `lib/newsroom/capabilities.ts` | The declarative capability registry: what each capability requires, in journalist language | Create |
| `lib/newsroom/capabilities.test.ts` | Registry shape invariants (labels are not env var names, help keys are real vars, unimplemented ⇒ delivery) | Create |
| `skills/splash/src/preflight.ts` | `ENGINE_REQUIREMENTS` / `EMBED_DELIVERY_ENV(+_HELP)` **derived** from the registry; behaviour unchanged | Modify |
| `skills/splash/tests/capability-parity.test.ts` | The key sets of the registry and of `Producer` cannot drift | Create |
| `lib/newsroom/state.ts` | `NewsroomState` schema · atomic read/write of `newsroom.json` · never throws | Create |
| `lib/newsroom/state.test.ts` | Round-trip · corrupt file · unknown-key stripping · atomicity | Create |
| `lib/newsroom/migrate-decor.ts` | One-time absorption of `.splash-runtime` + `.splash-preflight.json`; `.env` untouched | Create |
| `lib/newsroom/migrate-decor.test.ts` | Every migration branch, including "`.env` byte-identical after" | Create |
| `lib/newsroom/language.ts` | `resolveLanguage` — ui vs content, default English, override wins without persisting | Create |
| `lib/newsroom/language.test.ts` | Default · saved · unknown BCP-47 · override precedence · ui ≠ content | Create |
| `lib/newsroom/ui-copy.ts` | The interface-copy locale layer; the export proposal block in `en` + `fr` | Create |
| `lib/newsroom/ui-copy.test.ts` | Unknown language falls back to English; the French strings are the shipped ones | Create |
| `skills/splash/scripts/export-code.mjs:536-570` | Emits its proposal through the resolved language instead of hard-coded French | Modify |
| `skills/splash/tests/export-code-proposal-cli.test.ts:118-131` | Its French-literal `WAIT_LINE_PARTS` becomes language-derived; two language cases added | Modify |
| `lib/newsroom/readiness.ts` | Pure readiness: `ready` / `missing` / `unverified` / `disabled` + blockers | Create |
| `lib/newsroom/readiness.test.ts` | The four statuses · disabled never a blocker · injected env wins · alternatives groups | Create |
| `lib/newsroom/decor.ts` | The composition seam: repo root, env resolution, migration-on-first-read, `loadDecor` | Create |
| `lib/newsroom/decor.test.ts` | Migration fires once · decor reflects state + env · no throw on a broken tree | Create |
| `lib/loop/manifest.ts:13-17` | `FormOption` gains optional `requires` + `readiness` (stored manifests stay valid) | Modify |
| `lib/loop/propose.ts` | Annotates every option with the readiness of what it requires; removes none | Modify |
| `lib/loop/driver.ts:41-51` | Passes the decor into `propose` | Modify |
| `lib/host/newsroom.ts` | `describeNewsroom(dir?)` — the decor as a `HostResponse`, never throwing | Create |
| `lib/host/cli.ts:123-173` | The fifth command `newsroom [--dir <dir>]` | Modify |
| `lib/host/README.md` | "The four commands" becomes five; the new command documented | Modify |
| `lib/host/newsroom.test.ts` | Unit + a façade-only subprocess wiring test | Create |

---

## Task 1: Hoist the capability registry

**Files:**
- Create: `lib/newsroom/capabilities.ts`, `lib/newsroom/capabilities.test.ts`
- Create: `skills/splash/tests/capability-parity.test.ts`
- Modify: `skills/splash/src/preflight.ts:15-103`

**Interfaces:**
- Produces: `type NewsroomCapability = { id: string; label: string; kind: "engine" | "delivery"; env: string[][]; envHelp: Record<string, string>; settingsFields?: CapabilitySettingField[]; criticalDeps: { fromSkillDir: string; packages: string[] } | null; implemented: boolean }`, `type CapabilitySettingField = { name: string; label: string; secret: boolean }`, `NEWSROOM_CAPABILITIES: Record<string, NewsroomCapability>`, `engineCapabilities(): NewsroomCapability[]`, `deliveryCapabilities(): NewsroomCapability[]`.
- Consumes: nothing (first task).

**Why the existing suite matters more than the new one:** `skills/splash/tests/preflight.test.ts` is the regression net. It must pass **unchanged** — do not edit it. That is the evidence the hoist lost nothing, exactly as `skills/splash/tests/adapters.test.ts` was for B1.

- [ ] **Step 1: Write the failing test**

Create `lib/newsroom/capabilities.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  NEWSROOM_CAPABILITIES,
  deliveryCapabilities,
  engineCapabilities,
} from "./capabilities";

describe("the newsroom capability registry", () => {
  it("declares the six engines and the delivery capabilities", () => {
    expect(engineCapabilities().map((c) => c.id).sort()).toEqual([
      "chart-native",
      "dw-chart",
      "image-native",
      "map-dw",
      "map-native",
      "scrolly",
    ]);
    expect(deliveryCapabilities().map((c) => c.id)).toContain(
      "embed-cloudflare",
    );
  });

  it("labels every capability in newsroom language, never as an env var", () => {
    for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
      expect(cap.label.trim().length).toBeGreaterThan(0);
      // An env var name as the primary label is the exact failure issue #5 names.
      expect(cap.label).not.toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(cap.label).not.toContain("_");
    }
  });

  it("only documents env vars it actually requires", () => {
    for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
      const declared = new Set(cap.env.flat());
      for (const name of Object.keys(cap.envHelp))
        expect(declared.has(name)).toBe(true);
    }
  });

  it("keys the registry by the capability's own id", () => {
    for (const [key, cap] of Object.entries(NEWSROOM_CAPABILITIES))
      expect(cap.id).toBe(key);
  });

  it("marks a declared-but-unbuilt capability as delivery and not implemented", () => {
    const declared = Object.values(NEWSROOM_CAPABILITIES).filter(
      (c) => !c.implemented,
    );
    // The publisher adapters the Livraison sub-project (#4) will fill in.
    expect(declared.map((c) => c.id).sort()).toEqual([
      "embed-cms",
      "embed-fly",
      "embed-s3",
    ]);
    for (const cap of declared) expect(cap.kind).toBe("delivery");
  });

  it("asks for the credentials a publisher needs, and says which are secret", () => {
    const cf = NEWSROOM_CAPABILITIES["embed-cloudflare"]!;
    expect(cf.implemented).toBe(true);
    expect(cf.settingsFields?.map((f) => f.name).sort()).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "SPLASH_EMBED_PROJECT",
    ]);
    expect(
      cf.settingsFields?.find((f) => f.name === "CLOUDFLARE_API_TOKEN")?.secret,
    ).toBe(true);
    expect(
      cf.settingsFields?.find((f) => f.name === "SPLASH_EMBED_PROJECT")?.secret,
    ).toBe(false);
  });
});
```

Create `skills/splash/tests/capability-parity.test.ts`:

```ts
// The registry lives in lib/newsroom; the Producer union lives here. Neither may drift from
// the other, and only this side of the arrow is allowed to know both.
import { describe, expect, it } from "bun:test";
import { engineCapabilities } from "../../../lib/newsroom/capabilities";
import { ENGINE_REQUIREMENTS, EMBED_DELIVERY_ENV } from "../src/preflight";
import type { Producer } from "../src/producer-spec";

// Typed exhaustively: adding a member to the Producer union without adding a capability
// fails the compile, not just the test.
const PRODUCERS: Producer[] = [
  "dw-chart",
  "chart-native",
  "map-dw",
  "map-native",
  "scrolly",
  "image-native",
];

describe("capability registry / producer parity", () => {
  it("has exactly one engine capability per producer", () => {
    expect(engineCapabilities().map((c) => c.id).sort()).toEqual(
      [...PRODUCERS].sort(),
    );
  });

  it("derives ENGINE_REQUIREMENTS from the registry", () => {
    for (const cap of engineCapabilities()) {
      const req = ENGINE_REQUIREMENTS[cap.id as Producer];
      expect(req.env).toEqual(cap.env);
      expect(req.envHelp).toEqual(cap.envHelp);
      expect(req.criticalDeps).toEqual(cap.criticalDeps);
    }
  });

  it("derives the embed delivery vars from the registry", () => {
    expect([...EMBED_DELIVERY_ENV].sort()).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "SPLASH_EMBED_PROJECT",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd lib && bun test newsroom/capabilities.test.ts
cd ../skills/splash && bun test tests/capability-parity.test.ts
```

Expected: FAIL — `Cannot find module './capabilities'` / `'../../../lib/newsroom/capabilities'`.

- [ ] **Step 3: Write the registry**

Create `lib/newsroom/capabilities.ts`. The help sentences and the dep lists are **copied verbatim** from `skills/splash/src/preflight.ts:33-103` — they are the journalist-facing text that already ships, and the comment about `@maptiler/sdk` records a real trap.

```ts
// capabilities.ts — the newsroom DECOR's declarative model: what each capability requires,
// in newsroom language. Hoisted out of skills/splash/src/preflight.ts, which now derives its
// ENGINE_REQUIREMENTS from here: the same dependency-arrow inversion lib/core/vocabulary.ts
// performed for formats and channels, for the same reason — lib/ must not depend on the
// legacy orchestrator's vocabulary.
//
// A capability is what a newsroom can TURN ON. Which of them a given newsroom has enabled is
// STATE (lib/newsroom/state.ts); whether an enabled one is usable right now is READINESS
// (lib/newsroom/readiness.ts). This file only declares requirements.

/** One field the setup page must ask for. `secret: true` ⇒ it belongs in .env, never elsewhere. */
export type CapabilitySettingField = {
  name: string;
  label: string;
  secret: boolean;
};

export type NewsroomCapability = {
  /** Registry key. Engine ids are producer names; delivery ids name the publisher. */
  id: string;
  /** Newsroom-facing label. NEVER an env var name — that is issue #5's complaint. */
  label: string;
  kind: "engine" | "delivery";
  /** Each inner array is an ALTERNATIVES group: at least one member must be set. */
  env: string[][];
  /** Per-var: where the journalist gets it. */
  envHelp: Record<string, string>;
  /** What the setup page asks for, and which of it is secret. */
  settingsFields?: CapabilitySettingField[];
  criticalDeps: { fromSkillDir: string; packages: string[] } | null;
  /** false = declared here, filled in by its own sub-project (Livraison, #4). */
  implemented: boolean;
};

const DW_HELP =
  "create a token at https://app.datawrapper.de/account/api-tokens (free account works)";
const MT_HELP = "create a free key at https://cloud.maptiler.com/account/keys/";

const DW_FIELD: CapabilitySettingField = {
  name: "DATAWRAPPER_API_TOKEN",
  label: "Datawrapper API token",
  secret: true,
};
const MT_FIELD: CapabilitySettingField = {
  name: "VITE_MAPTILER_KEY",
  label: "MapTiler key",
  secret: true,
};

export const NEWSROOM_CAPABILITIES: Record<string, NewsroomCapability> = {
  "dw-chart": {
    id: "dw-chart",
    label: "Datawrapper charts",
    kind: "engine",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null, // cloud producer: fetch only, no heavy local deps
    implemented: true,
  },
  "map-dw": {
    id: "map-dw",
    label: "Datawrapper maps",
    kind: "engine",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null,
    implemented: true,
  },
  "chart-native": {
    id: "chart-native",
    label: "Charts built in-house (no account needed)",
    kind: "engine",
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "chart-native", packages: ["react", "vite"] },
    implemented: true,
  },
  "map-native": {
    id: "map-native",
    label: "Maps built in-house (interactive and video)",
    kind: "engine",
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: { VITE_MAPTILER_KEY: MT_HELP, REMOTION_MAPTILER_KEY: MT_HELP },
    settingsFields: [MT_FIELD],
    criticalDeps: {
      fromSkillDir: "map-native",
      // @maptiler/sdk (a DIRECT map-native dependency), never maplibre-gl: the latter only
      // resolves via hoisting through the SDK's dep graph — a phantom check that would go
      // permanently red on a healthy install if the SDK ever re-arranged its deps.
      packages: ["react", "remotion", "@maptiler/sdk"],
    },
    implemented: true,
  },
  scrolly: {
    id: "scrolly",
    label: "Scrollytelling stories",
    kind: "engine",
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: { VITE_MAPTILER_KEY: MT_HELP, REMOTION_MAPTILER_KEY: MT_HELP },
    settingsFields: [MT_FIELD],
    criticalDeps: { fromSkillDir: "scrolly", packages: ["react", "vite"] },
    implemented: true,
  },
  "image-native": {
    id: "image-native",
    label: "Photo narratives",
    kind: "engine",
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "image-native", packages: ["sharp"] },
    implemented: true,
  },
  "embed-cloudflare": {
    id: "embed-cloudflare",
    label: "Publish an embeddable link (Cloudflare Pages)",
    kind: "delivery",
    env: [
      ["CLOUDFLARE_API_TOKEN"],
      ["CLOUDFLARE_ACCOUNT_ID"],
      ["SPLASH_EMBED_PROJECT"],
    ],
    envHelp: {
      CLOUDFLARE_API_TOKEN:
        'create an account API token with the "Cloudflare Pages: Edit" permission at https://dash.cloudflare.com (Manage Account → API Tokens → Create Token)',
      CLOUDFLARE_ACCOUNT_ID:
        "copy it from the Workers & Pages page at https://dash.cloudflare.com (Account details → Account ID)",
      SPLASH_EMBED_PROJECT:
        'choose a Cloudflare Pages project name that identifies the newsroom (e.g. "heidi-news-splash") — it becomes the public URL <visual>.<project>.pages.dev, so it must not be generic',
    },
    settingsFields: [
      {
        name: "CLOUDFLARE_API_TOKEN",
        label: "Cloudflare API token",
        secret: true,
      },
      {
        name: "CLOUDFLARE_ACCOUNT_ID",
        label: "Cloudflare account ID",
        secret: false,
      },
      {
        name: "SPLASH_EMBED_PROJECT",
        label: "Project name (becomes the public link)",
        secret: false,
      },
    ],
    criticalDeps: null,
    implemented: true,
  },
  // Declared, not built — the publisher adapters the Livraison sub-project (#4) fills in.
  // Readiness never reports an unimplemented capability as ready (readiness.ts).
  "embed-cms": {
    id: "embed-cms",
    label: "Publish through the newsroom's CMS",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
  "embed-s3": {
    id: "embed-s3",
    label: "Publish to the newsroom's own object storage",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
  "embed-fly": {
    id: "embed-fly",
    label: "Publish to Fly.io",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
};

export function engineCapabilities(): NewsroomCapability[] {
  return Object.values(NEWSROOM_CAPABILITIES).filter(
    (c) => c.kind === "engine",
  );
}

export function deliveryCapabilities(): NewsroomCapability[] {
  return Object.values(NEWSROOM_CAPABILITIES).filter(
    (c) => c.kind === "delivery",
  );
}
```

- [ ] **Step 4: Derive the legacy exports from the registry**

In `skills/splash/src/preflight.ts`, delete the literal `ENGINE_REQUIREMENTS`, `EMBED_DELIVERY_ENV`, `EMBED_DELIVERY_ENV_HELP`, `DW_HELP` and `MT_HELP` bodies (`:33-103`) and derive them. Keep `EngineRequirements`, `PreflightFinding`, `PreflightOpts`, `EmbedDeliveryStatus`, `embedDeliveryStatus`, `preflightFindings`, `enginePreflightStatus` exactly as they are — only the data source changes.

```ts
import {
  NEWSROOM_CAPABILITIES,
  engineCapabilities,
} from "../../../lib/newsroom/capabilities";
import type { Producer } from "./producer-spec";

// The engine half of the newsroom capability registry, in this module's original shape. The
// registry is the single declaration (lib/newsroom/capabilities.ts); this is a projection of
// it, so the two cannot drift (skills/splash/tests/capability-parity.test.ts).
export const ENGINE_REQUIREMENTS: Record<Producer, EngineRequirements> =
  Object.fromEntries(
    engineCapabilities().map((cap) => [
      cap.id,
      {
        env: cap.env,
        envHelp: cap.envHelp,
        criticalDeps: cap.criticalDeps,
      },
    ]),
  ) as Record<Producer, EngineRequirements>;

// The embed DELIVERY FORM's requirement (not an engine's): deploy-embed.mjs owns the
// fail-fast; exported here so its message and the parity test share the single list.
const EMBED_CAPABILITY = NEWSROOM_CAPABILITIES["embed-cloudflare"]!;
export const EMBED_DELIVERY_ENV: readonly string[] =
  EMBED_CAPABILITY.env.flat();
export const EMBED_DELIVERY_ENV_HELP: Record<string, string> =
  EMBED_CAPABILITY.envHelp;
```

If `tsc` reports a consumer that needed `EMBED_DELIVERY_ENV`'s literal tuple type, do **not** widen the consumer: keep the literal `as const` array in `capabilities.ts` and re-export it here.

- [ ] **Step 5: Run the tests to verify they pass — including the untouched net**

```bash
cd lib && bun test newsroom/capabilities.test.ts
cd ../skills/splash && bun test tests/capability-parity.test.ts tests/preflight.test.ts tests/preflight-cli.test.ts
git diff --stat skills/splash/tests/preflight.test.ts
```

Expected: all PASS, and the last command prints **nothing** — the regression net was not edited.

- [ ] **Step 6: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/capabilities.ts lib/newsroom/capabilities.test.ts skills/splash/src/preflight.ts skills/splash/tests/capability-parity.test.ts
git commit -m "feat(newsroom): the capability model gets one declaration, in newsroom language"
```

---

## Task 2: The newsroom state file

**Files:**
- Create: `lib/newsroom/state.ts`, `lib/newsroom/state.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent).
- Produces: `NEWSROOM_STATE_FILE = "newsroom.json"`, `type CapabilityState = { enabled: boolean; lastVerified?: { at: string; result: "ok" | "rejected" | "unreachable" } }`, `type NewsroomState = { schemaVersion: 1; runtime: string; uiLang: string; capabilities: Record<string, CapabilityState>; publisher?: string }`, `DEFAULT_NEWSROOM_STATE`, `readNewsroomState(dir: string): NewsroomState`, `writeNewsroomState(dir: string, state: NewsroomState): void`, `newsroomStatePath(dir: string): string`.

- [ ] **Step 1: Write the failing test**

Create `lib/newsroom/state.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
  readNewsroomState,
  writeNewsroomState,
  type NewsroomState,
} from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "newsroom-state-"));
}

const FILLED: NewsroomState = {
  schemaVersion: 1,
  runtime: "goose",
  uiLang: "de",
  capabilities: {
    "chart-native": { enabled: true },
    "dw-chart": {
      enabled: true,
      lastVerified: { at: "2026-07-24T10:00:00.000Z", result: "ok" },
    },
    "map-native": { enabled: false },
  },
  publisher: "embed-cloudflare",
};

describe("the newsroom state file", () => {
  it("round-trips a filled state", () => {
    const d = dir();
    writeNewsroomState(d, FILLED);
    expect(readNewsroomState(d)).toEqual(FILLED);
  });

  it("defaults to English when nothing has been saved", () => {
    expect(readNewsroomState(dir())).toEqual(DEFAULT_NEWSROOM_STATE);
    expect(DEFAULT_NEWSROOM_STATE.uiLang).toBe("en");
  });

  it("falls back to the default state on a corrupt file, without throwing", () => {
    const d = dir();
    writeFileSync(join(d, NEWSROOM_STATE_FILE), "{ not json");
    expect(() => readNewsroomState(d)).not.toThrow();
    expect(readNewsroomState(d)).toEqual(DEFAULT_NEWSROOM_STATE);
  });

  it("falls back to the default state on a shape it does not recognise", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({ schemaVersion: 99, uiLang: 7 }),
    );
    expect(readNewsroomState(d)).toEqual(DEFAULT_NEWSROOM_STATE);
  });

  // The decor state must be incapable of holding a credential: .env is the single home.
  it("strips any field the schema does not declare — a credential cannot survive a read", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        token: "dw-secret-should-not-survive",
        capabilities: {
          "dw-chart": { enabled: true, apiKey: "also-should-not-survive" },
        },
      }),
    );
    const state = readNewsroomState(d);
    writeNewsroomState(d, state);
    const onDisk = readFileSync(join(d, NEWSROOM_STATE_FILE), "utf8");
    expect(onDisk).not.toContain("dw-secret-should-not-survive");
    expect(onDisk).not.toContain("also-should-not-survive");
  });

  it("writes atomically and leaves no temporary file behind", () => {
    const d = dir();
    writeNewsroomState(d, FILLED);
    expect(readdirSync(d)).toEqual([NEWSROOM_STATE_FILE]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd lib && bun test newsroom/state.test.ts
```

Expected: FAIL — `Cannot find module './state'`.

- [ ] **Step 3: Implement**

Create `lib/newsroom/state.ts`. The atomic write mirrors `lib/loop/manifest.ts:111-116` — same discipline, same reason.

```ts
// state.ts — the newsroom scope of state: the decor that persists BETWEEN articles, as
// opposed to lib/loop's per-article run manifest. It lives next to .env at the install root.
//
// What is NOT here, deliberately: credentials. Secrets and the provider identifiers that sit
// beside them (CLOUDFLARE_ACCOUNT_ID, SPLASH_EMBED_PROJECT — read from the environment by
// deploy-embed.mjs) stay in .env, which keeps every field to exactly one home. The schema is
// therefore strict: an unknown key in the file is dropped on read, so a credential written
// here by mistake cannot survive a round trip.
import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const NEWSROOM_STATE_FILE = "newsroom.json";

const CapabilityStateSchema = z.object({
  /** What the newsroom WANTS. A disabled capability is never reported as a failure. */
  enabled: z.boolean(),
  /** The last live provider check, when one has run (the setup page performs it). */
  lastVerified: z
    .object({
      at: z.string(),
      result: z.enum(["ok", "rejected", "unreachable"]),
    })
    .optional(),
});

const NewsroomStateSchema = z.object({
  schemaVersion: z.literal(1),
  /** The agentic runtime chosen at install (absorbed from .splash-runtime). */
  runtime: z.string(),
  /** INTERFACE language (BCP-47). The deliverables' language lives in NEWSROOM-PROFILE.md. */
  uiLang: z.string(),
  capabilities: z.record(z.string(), CapabilityStateSchema),
  /** The delivery capability id the newsroom publishes through, when it has chosen one. */
  publisher: z.string().optional(),
});

export type CapabilityState = z.infer<typeof CapabilityStateSchema>;
export type NewsroomState = z.infer<typeof NewsroomStateSchema>;

export const DEFAULT_NEWSROOM_STATE: NewsroomState = {
  schemaVersion: 1,
  runtime: "claude",
  uiLang: "en",
  capabilities: {},
};

export function newsroomStatePath(dir: string): string {
  return join(dir, NEWSROOM_STATE_FILE);
}

/**
 * Read the decor. NEVER throws: an absent, unreadable or unrecognised file yields the
 * default state, because a broken decor must not stop a run from starting — the setup page
 * is how it gets fixed.
 */
export function readNewsroomState(dir: string): NewsroomState {
  const path = newsroomStatePath(dir);
  if (!existsSync(path)) return DEFAULT_NEWSROOM_STATE;
  try {
    const parsed = NewsroomStateSchema.safeParse(
      JSON.parse(readFileSync(path, "utf8")),
    );
    return parsed.success ? parsed.data : DEFAULT_NEWSROOM_STATE;
  } catch {
    return DEFAULT_NEWSROOM_STATE;
  }
}

export function writeNewsroomState(dir: string, state: NewsroomState): void {
  mkdirSync(dir, { recursive: true });
  const path = newsroomStatePath(dir);
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, path); // atomic replace on the same filesystem
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd lib && bun test newsroom/state.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/state.ts lib/newsroom/state.test.ts
git commit -m "feat(newsroom): the decor gets a state file that cannot hold a credential"
```

---

## Task 3: Absorb the three legacy supports

**Files:**
- Create: `lib/newsroom/migrate-decor.ts`, `lib/newsroom/migrate-decor.test.ts`

**Interfaces:**
- Consumes: `NEWSROOM_CAPABILITIES`, `engineCapabilities`, `deliveryCapabilities` (Task 1); `NewsroomState`, `DEFAULT_NEWSROOM_STATE`, `readNewsroomState`, `writeNewsroomState`, `NEWSROOM_STATE_FILE` (Task 2).
- Produces: `LEGACY_RUNTIME_FILE = ".splash-runtime"`, `LEGACY_PREFLIGHT_FILE = ".splash-preflight.json"`, `needsDecorMigration(dir: string): boolean`, `migrateDecor(dir: string, env: Record<string, string | undefined>): { state: NewsroomState; removed: string[] }`.

**The rule this task must not break:** `.env` is never written, never rewritten, never deleted. The test proves it byte-for-byte.

- [ ] **Step 1: Write the failing test**

Create `lib/newsroom/migrate-decor.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LEGACY_PREFLIGHT_FILE,
  LEGACY_RUNTIME_FILE,
  migrateDecor,
  needsDecorMigration,
} from "./migrate-decor";
import { NEWSROOM_STATE_FILE, readNewsroomState } from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "newsroom-migrate-"));
}

const FULL_ENV = {
  DATAWRAPPER_API_TOKEN: "dw-token",
  VITE_MAPTILER_KEY: "mt-key",
  CLOUDFLARE_API_TOKEN: "cf-token",
  CLOUDFLARE_ACCOUNT_ID: "cf-account",
  SPLASH_EMBED_PROJECT: "a-newsroom-splash",
};

describe("absorbing the legacy decor", () => {
  it("needs no migration once the state file exists", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    writeFileSync(join(d, NEWSROOM_STATE_FILE), "{}");
    expect(needsDecorMigration(d)).toBe(false);
  });

  it("needs migration when a legacy file exists and the state file does not", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    expect(needsDecorMigration(d)).toBe(true);
  });

  it("needs no migration on a fresh tree with nothing in it", () => {
    expect(needsDecorMigration(dir())).toBe(false);
  });

  it("carries the chosen runtime over and removes the legacy file", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    const { state, removed } = migrateDecor(d, {});
    expect(state.runtime).toBe("goose");
    expect(removed).toContain(LEGACY_RUNTIME_FILE);
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(false);
    expect(readNewsroomState(d).runtime).toBe("goose");
  });

  it("enables what an existing install already has keys for, and nothing else", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, FULL_ENV);
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual([
      "chart-native",
      "dw-chart",
      "embed-cloudflare",
      "image-native",
      "map-dw",
      "map-native",
      "scrolly",
    ]);
  });

  it("enables only the key-free engines when the environment is empty", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, {});
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native"]);
  });

  it("never enables a capability that is only declared", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, FULL_ENV);
    for (const id of ["embed-cms", "embed-s3", "embed-fly"])
      expect(state.capabilities[id]?.enabled).toBe(false);
  });

  it("carries a green persisted status as a verification stamp, and drops the rest", () => {
    const d = dir();
    writeFileSync(
      join(d, LEGACY_PREFLIGHT_FILE),
      JSON.stringify({
        schemaVersion: "1",
        engines: {
          "dw-chart": {
            status: "green",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "",
          },
          "map-native": {
            status: "yellow",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "needs a key",
          },
          scrolly: {
            status: "red",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "deps missing",
          },
        },
      }),
    );
    const { state, removed } = migrateDecor(d, FULL_ENV);
    expect(state.capabilities["dw-chart"]?.lastVerified).toEqual({
      at: "2026-07-20T09:00:00.000Z",
      result: "ok",
    });
    // yellow/red mean "a key or a dep is missing" — readiness recomputes that from the
    // environment on every read, so carrying them would only make the state stale.
    expect(state.capabilities["map-native"]?.lastVerified).toBeUndefined();
    expect(state.capabilities["scrolly"]?.lastVerified).toBeUndefined();
    expect(removed).toContain(LEGACY_PREFLIGHT_FILE);
  });

  it("ignores a corrupt persisted status file", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_PREFLIGHT_FILE), "not json at all");
    expect(() => migrateDecor(d, {})).not.toThrow();
    expect(existsSync(join(d, LEGACY_PREFLIGHT_FILE))).toBe(false);
  });

  it("leaves .env byte-identical", () => {
    const d = dir();
    const envText = 'DATAWRAPPER_API_TOKEN="dw-token"\nVITE_MAPTILER_KEY="mt-key"\n';
    writeFileSync(join(d, ".env"), envText);
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    migrateDecor(d, FULL_ENV);
    expect(readFileSync(join(d, ".env"), "utf8")).toBe(envText);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd lib && bun test newsroom/migrate-decor.test.ts
```

Expected: FAIL — `Cannot find module './migrate-decor'`.

- [ ] **Step 3: Implement**

Create `lib/newsroom/migrate-decor.ts`:

```ts
// migrate-decor.ts — a one-time absorption, so an existing install is RECOGNISED instead of
// re-interrogated (#5: "existing configurator installations migrate without losing .env
// values"). Two legacy supports fold into newsroom.json and are then removed:
//   .splash-runtime        → state.runtime
//   .splash-preflight.json → state.capabilities[id].lastVerified (green stamps only)
// .env is NEVER touched: it is and stays the single home of every credential.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
  writeNewsroomState,
  type CapabilityState,
  type NewsroomState,
} from "./state";

export const LEGACY_RUNTIME_FILE = ".splash-runtime";
export const LEGACY_PREFLIGHT_FILE = ".splash-preflight.json";

export function needsDecorMigration(dir: string): boolean {
  if (existsSync(join(dir, NEWSROOM_STATE_FILE))) return false;
  return (
    existsSync(join(dir, LEGACY_RUNTIME_FILE)) ||
    existsSync(join(dir, LEGACY_PREFLIGHT_FILE))
  );
}

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

// A capability an existing install can already exercise was, in effect, already chosen: the
// journalist supplied its key. Enabling exactly those is what stops the migration from
// asking a working install to configure itself again.
function enabledByEnv(
  capId: string,
  env: Record<string, string | undefined>,
): boolean {
  const cap = NEWSROOM_CAPABILITIES[capId]!;
  if (!cap.implemented) return false;
  return cap.env.every((group) => group.some((name) => isSet(env[name])));
}

function readGreenStamps(dir: string): Record<string, string> {
  const path = join(dir, LEGACY_PREFLIGHT_FILE);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      engines?: Record<string, { status?: string; checkedAt?: string }>;
    };
    const out: Record<string, string> = {};
    for (const [id, s] of Object.entries(raw.engines ?? {}))
      if (s?.status === "green" && typeof s.checkedAt === "string")
        out[id] = s.checkedAt;
    return out;
  } catch {
    return {}; // a cache of re-computable state, never a source of truth
  }
}

export function migrateDecor(
  dir: string,
  env: Record<string, string | undefined>,
): { state: NewsroomState; removed: string[] } {
  const removed: string[] = [];

  let runtime = DEFAULT_NEWSROOM_STATE.runtime;
  const runtimePath = join(dir, LEGACY_RUNTIME_FILE);
  if (existsSync(runtimePath)) {
    const text = readFileSync(runtimePath, "utf8").trim();
    if (text) runtime = text;
  }

  const stamps = readGreenStamps(dir);
  const capabilities: Record<string, CapabilityState> = {};
  for (const id of Object.keys(NEWSROOM_CAPABILITIES)) {
    const entry: CapabilityState = { enabled: enabledByEnv(id, env) };
    if (stamps[id]) entry.lastVerified = { at: stamps[id]!, result: "ok" };
    capabilities[id] = entry;
  }

  const state: NewsroomState = {
    schemaVersion: 1,
    runtime,
    uiLang: DEFAULT_NEWSROOM_STATE.uiLang,
    capabilities,
  };
  writeNewsroomState(dir, state);

  for (const file of [LEGACY_RUNTIME_FILE, LEGACY_PREFLIGHT_FILE]) {
    const path = join(dir, file);
    if (existsSync(path)) {
      rmSync(path);
      removed.push(file);
    }
  }
  return { state, removed };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd lib && bun test newsroom/migrate-decor.test.ts
```

Expected: PASS (10 tests).

- [ ] **Step 5: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/migrate-decor.ts lib/newsroom/migrate-decor.test.ts
git commit -m "feat(newsroom): absorb the scattered decor files, and never touch .env"
```

---

## Task 4: The language preference, resolved and consumed

**Files:**
- Create: `lib/newsroom/language.ts`, `lib/newsroom/language.test.ts`
- Create: `lib/newsroom/ui-copy.ts`, `lib/newsroom/ui-copy.test.ts`
- Modify: `skills/splash/tests/export-code-proposal-cli.test.ts` (its `WAIT_LINE_PARTS` at `:118-131` asserts the FRENCH wording — see the trap below)
- Modify: `skills/splash/scripts/export-code.mjs` (imports near `:28-45`, `emitProposal`'s relay block `:536-570`, and the missing-key reason at `:514`)

**Interfaces:**
- Consumes: `readNewsroomState` (Task 2); `loadNewsroomProfile` from `skills/splash/src/brand-profile.ts:369` (returns `BrandProfile | null` with an optional `lang`).
- Produces: `DEFAULT_UI_LANG = "en"`, `type ResolvedLanguage = { ui: string; content: string }`, `resolveLanguage(input: { override?: { ui?: string; content?: string }; uiLang?: string; profileLang?: string }): ResolvedLanguage`, `exportProposalCopy(lang: string): ExportProposalCopy`, and the documented per-run override env var **`SPLASH_UI_LANG`**.

**Why the resolver and its consumer are one task:** B1's recorded lesson — a module with no live caller passes its tests while being dead on the shipped path. The resolver lands with the emitter that uses it.

**The trap, found while writing this plan:** `skills/splash/tests/export-code-proposal-cli.test.ts:118-131` asserts the WAIT instruction with three **French** regexes (`/ATTENDRE la réponse du journaliste/`, …). It runs the real script, which after this task resolves to English on a machine with no saved preference — so that suite goes red unless its assertion becomes language-derived. Do not "fix" it by pinning French: the assertion's purpose is that the block *carries* the instruction, not that it is French.

**Why `SPLASH_UI_LANG` exists:** `export-code.mjs` resolves the decor from the INSTALL ROOT, not the working directory, so a test cannot point it at a temp newsroom. A per-run override is required by issue #6 anyway ("a one-run override works and does not silently rewrite the saved default") — this is its mechanism, and it is what makes the French branch testable without writing to the repo root.

- [ ] **Step 1: Write the failing tests**

Create `lib/newsroom/language.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { DEFAULT_UI_LANG, resolveLanguage } from "./language";

describe("resolving the newsroom's language", () => {
  it("conducts everything in English when nothing has been chosen", () => {
    expect(resolveLanguage({})).toEqual({ ui: "en", content: "en" });
    expect(DEFAULT_UI_LANG).toBe("en");
  });

  it("reuses a saved interface language without asking again", () => {
    expect(resolveLanguage({ uiLang: "de" })).toEqual({
      ui: "de",
      content: "de",
    });
  });

  it("keeps the deliverables' language separate from the interface's", () => {
    expect(resolveLanguage({ uiLang: "en", profileLang: "fr" })).toEqual({
      ui: "en",
      content: "fr",
    });
  });

  it("accepts an unknown BCP-47 value as given", () => {
    expect(resolveLanguage({ uiLang: "rm-CH" }).ui).toBe("rm-CH");
  });

  it("lets a per-run override win without changing what was saved", () => {
    const saved = { uiLang: "fr", profileLang: "fr" };
    expect(resolveLanguage({ ...saved, override: { ui: "it" } })).toEqual({
      ui: "it",
      content: "fr",
    });
    // The inputs are untouched: persisting is the caller's separate, explicit act.
    expect(saved).toEqual({ uiLang: "fr", profileLang: "fr" });
  });

  it("ignores blank values instead of resolving to an empty language", () => {
    expect(resolveLanguage({ uiLang: "   ", profileLang: "" })).toEqual({
      ui: "en",
      content: "en",
    });
  });
});
```

Create `lib/newsroom/ui-copy.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { exportProposalCopy } from "./ui-copy";

describe("the interface-copy locale layer", () => {
  it("answers in English for an unknown language", () => {
    expect(exportProposalCopy("rm-CH").intro).toBe(
      exportProposalCopy("en").intro,
    );
  });

  it("keeps the shipped French wording for a French newsroom", () => {
    expect(exportProposalCopy("fr").intro).toBe(
      "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
    );
  });

  it("resolves a regional tag to its base language", () => {
    expect(exportProposalCopy("fr-CH").intro).toBe(
      exportProposalCopy("fr").intro,
    );
  });

  it("offers the same set of lines in every language it declares", () => {
    const en = Object.keys(exportProposalCopy("en")).sort();
    expect(Object.keys(exportProposalCopy("fr")).sort()).toEqual(en);
  });
});
```

Add the language cases to the **existing** `skills/splash/tests/export-code-proposal-cli.test.ts` — it already owns the fixture helpers (`writeReport`, `runPhase1`, `WORK`, the `afterEach` cleanup) and the assertion that has to change. Two edits:

**(a) Make the WAIT assertion language-derived.** Replace `WAIT_LINE_PARTS` and `expectWaitInstruction` (`:118-131`) with:

```ts
import { resolveLanguage } from "../../../lib/newsroom/language";
import { exportProposalCopy } from "../../../lib/newsroom/ui-copy";
import { readNewsroomState } from "../../../lib/newsroom/state";

// The instruction must be PRESENT and verbatim — in whatever language this install resolves
// to. Pinning the French wording here would re-introduce exactly the defect issue #6 reports.
function expectedWaitInstruction(overrideUi?: string): string {
  const root = join(import.meta.dir, "../../..");
  const { ui } = resolveLanguage({
    override: { ui: overrideUi },
    uiLang: readNewsroomState(root).uiLang,
  });
  return exportProposalCopy(ui).waitInstruction;
}

function expectWaitInstruction(stdout: string, overrideUi?: string): void {
  const block = stdout.slice(
    stdout.indexOf("EXPORT_FORMS_PROPOSAL"),
    stdout.indexOf("END_EXPORT_FORMS_PROPOSAL"),
  );
  expect(block).toContain(expectedWaitInstruction(overrideUi));
}
```

The two existing `expectWaitInstruction(stdout)` call sites keep working unchanged.

**(b) Add the language cases** in a new `describe` at the end of the file:

```ts
// The defect this locks (issue #6): an English conversation reached a French export menu,
// because emitProposal printed French string literals. The block now follows the resolved
// interface language — English on a fresh install, and a per-run SPLASH_UI_LANG override.
describe("export-code phase 1 — the proposal follows the newsroom's language", () => {
  function nativeInteractive(name: string): {
    outDir: string;
    exportDir: string;
    reportPath: string;
  } {
    const outDir = join(WORK, name, "el");
    const exportDir = join(WORK, name, "el-export");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    const reportPath = writeReport(join(WORK, name), {
      id: "el",
      producer: "chart-native",
      format: "interactive",
      status: "produced",
      reviewed: true,
      renderApproved: true,
    });
    return { outDir, exportDir, reportPath };
  }

  it("speaks English when no preference is saved and none is overridden", () => {
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-default");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "",
    });
    expect(stdout).toContain(exportProposalCopy("en").intro);
    expect(stdout).not.toContain(exportProposalCopy("fr").intro);
  });

  it("honours a per-run override without touching what is saved", () => {
    const root = join(import.meta.dir, "../../..");
    const before = existsSync(join(root, "newsroom.json"))
      ? readFileSync(join(root, "newsroom.json"), "utf8")
      : null;
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-fr");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "fr",
    });
    expect(stdout).toContain(exportProposalCopy("fr").intro);
    expectWaitInstruction(stdout, "fr");
    // The override is per-run: the saved preference is byte-identical afterwards (and an
    // install that had none still has none).
    const after = existsSync(join(root, "newsroom.json"))
      ? readFileSync(join(root, "newsroom.json"), "utf8")
      : null;
    expect(after).toBe(before);
  });

  it("keeps the machine markers out of the locale layer", () => {
    const { outDir, exportDir, reportPath } = nativeInteractive("lang-markers");
    const stdout = runPhase1(outDir, exportDir, reportPath, "el", {
      ...process.env,
      SPLASH_UI_LANG: "fr",
    });
    for (const marker of [
      "EXPORT_FORMS_JSON",
      "EXPORT_FORMS_PROPOSAL",
      "END_EXPORT_FORMS_PROPOSAL",
    ])
      expect(stdout).toContain(marker);
  });
});
```

Add `existsSync` and `readFileSync` to the file's `node:fs` import, and `runPhase1`'s existing `env` parameter (`:76`) is what carries `SPLASH_UI_LANG` — no new helper.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd lib && bun test newsroom/language.test.ts newsroom/ui-copy.test.ts
cd ../skills/splash && bun test tests/export-code-proposal-cli.test.ts
```

Expected: FAIL — the two `lib` files do not exist yet, and the proposal suite cannot resolve `../../../lib/newsroom/ui-copy`.

- [ ] **Step 3: Write the resolver**

Create `lib/newsroom/language.ts`:

```ts
// language.ts — one resolution, two languages (issue #6): the INTERFACE language the
// orchestration speaks, and the CONTENT language the deliverables are made in. They have
// separate homes — uiLang in newsroom.json, lang in NEWSROOM-PROFILE.md — so a newsroom can
// work in English and publish in French.
//
// Resolution is pure: an override wins for this run only, and persisting a preference is a
// separate, explicit act by the caller. Nothing here writes.
export const DEFAULT_UI_LANG = "en";

export type ResolvedLanguage = {
  /** prompts, menus, readiness messages, delivery instructions */
  ui: string;
  /** titles, chart furniture, "Source:" — the deliverable's own language */
  content: string;
};

function firstSet(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates)
    if (typeof c === "string" && c.trim()) return c.trim();
  return undefined;
}

export function resolveLanguage(input: {
  override?: { ui?: string; content?: string };
  uiLang?: string;
  profileLang?: string;
}): ResolvedLanguage {
  const ui =
    firstSet(input.override?.ui, input.uiLang) ?? DEFAULT_UI_LANG;
  // A newsroom that set no deliverable language works in the language it reads: falling back
  // to `ui` beats falling back to English for a German newsroom that never filled the profile.
  const content = firstSet(input.override?.content, input.profileLang) ?? ui;
  return { ui, content };
}
```

- [ ] **Step 4: Write the copy layer**

Create `lib/newsroom/ui-copy.ts`. The French entries are the strings `export-code.mjs` ships today, copied byte-for-byte so a French newsroom sees no change.

```ts
// ui-copy.ts — the interface-copy side of the locale layer. lib/core/locale.ts localises
// NUMBERS and a visual's furniture; this localises what a SCRIPT prints to the journalist.
// The distinction matters: the conversation's prose comes from the orchestrating agent, but
// an emitted block is code, and code cannot be told to "answer in English".
//
// Adding a language = one entry. An unknown language falls back to English, which is also the
// documented default for a fresh install (issue #6).
import { DEFAULT_UI_LANG } from "./language";

export type ExportProposalCopy = {
  intro: string;
  formCodeSource: (path: string) => string;
  formHtml: (path: string) => string;
  formEmbedLive: (url: string) => string;
  formEmbedMissingKeys: (keys: string) => string;
  formEmbedAvailable: string;
  question: (forms: string) => string;
  waitInstruction: string;
  missingEmbedKeysReason: (reason: string) => string;
};

const EN: ExportProposalCopy = {
  intro:
    "The visual is produced. Choose how it should be delivered (nothing is built yet — the form you choose is generated on demand):",
  formCodeSource: (path) =>
    `  a) Source code — a standalone React project you can rebuild and customise (bun install && bun run build): ${path}`,
  formHtml: (path) =>
    `  b) Standalone HTML — one self-contained file you can drop anywhere: ${path}`,
  formEmbedLive: (url) =>
    `  c) Embed (hosted) — a link that is already live and reusable anywhere: ${url}`,
  formEmbedMissingKeys: (keys) =>
    `  c) Embed (hosted) — needs a missing key (${keys}). I can ask you for it, save it, and then deliver c); otherwise take b) (an equivalent standalone HTML file).`,
  formEmbedAvailable:
    "  c) Embed (hosted) — publish to your Cloudflare Pages project to get a reusable link",
  question: (forms) =>
    `Which form would you like? (${forms}) — then re-run export-code with --form <html|code-source|embed>.`,
  waitInstruction:
    "WAIT for the journalist's answer to THIS proposal before any --form: never choose for them — even when only one form is possible, the journalist confirms it, and across several elements never assume a shared answer (a grouped answer only counts when THEY give it).",
  missingEmbedKeysReason: (reason) =>
    `Missing key(s) for the hosted embed: ${reason}. Provide them (they will be saved via save-key.mjs) to deliver c), or choose b) (standalone HTML).`,
};

const FR: ExportProposalCopy = {
  intro:
    "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
  formCodeSource: (path) =>
    `  a) Code source — projet React autonome à rebuilder/personnaliser (bun install && bun run build) : ${path}`,
  formHtml: (path) =>
    `  b) HTML autonome — un seul fichier autonome à déposer n'importe où : ${path}`,
  formEmbedLive: (url) =>
    `  c) Embed (hébergé) — lien déjà en ligne, réutilisable partout : ${url}`,
  formEmbedMissingKeys: (keys) =>
    `  c) Embed (hébergé) — nécessite une clé manquante (${keys}). Je peux vous la demander et l'enregistrer, puis livrer en c) ; sinon prenez b) (fichier HTML autonome équivalent).`,
  formEmbedAvailable:
    "  c) Embed (hébergé) — publier sur votre projet Cloudflare Pages pour obtenir un lien à réutiliser",
  question: (forms) =>
    `Quelle forme souhaitez-vous ? (${forms}) — puis relancer export-code avec --form <html|code-source|embed>.`,
  waitInstruction:
    "ATTENDRE la réponse du journaliste à CETTE proposition avant tout --form : ne jamais choisir à sa place — même quand une seule forme est possible, c'est le journaliste qui la confirme, et sur plusieurs éléments jamais de « pour les deux » présumé (une réponse groupée n'est valable que si c'est LUI qui la donne).",
  missingEmbedKeysReason: (reason) =>
    `Clé(s) manquante(s) pour l'embed hébergé : ${reason}. Fournissez-la/les (elles seront enregistrées via save-key.mjs) pour livrer en c), ou choisissez b) (HTML autonome).`,
};

const TABLE: Record<string, ExportProposalCopy> = { en: EN, fr: FR };

export function exportProposalCopy(lang: string): ExportProposalCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return TABLE[base] ?? EN;
}
```

- [ ] **Step 5: Route the emitted block through it**

In `skills/splash/scripts/export-code.mjs`, add to the import block (after the existing `../src/…` imports, matching their `.ts`-extension style):

```js
import { readNewsroomState } from "../../../lib/newsroom/state.ts";
import { resolveLanguage } from "../../../lib/newsroom/language.ts";
import { exportProposalCopy } from "../../../lib/newsroom/ui-copy.ts";
import { loadNewsroomProfile } from "../src/brand-profile.ts";
```

Add the resolution helper next to the other module-level helpers (it reads the install root, the same directory `.env` and `NEWSROOM-PROFILE.md` live in):

```js
// The interface language for everything this script PRINTS. A fresh install resolves to
// English (issue #6); a newsroom that saved a preference gets it without being asked again;
// SPLASH_UI_LANG overrides both for ONE run and writes nothing.
function uiCopy() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const { ui } = resolveLanguage({
    override: { ui: process.env.SPLASH_UI_LANG },
    uiLang: readNewsroomState(root).uiLang,
    profileLang: loadNewsroomProfile(root)?.lang,
  });
  return exportProposalCopy(ui);
}
```

Then replace the literals. In `emitProposal`, immediately before building `relay`:

```js
  const copy = uiCopy();
  const relay = ["EXPORT_FORMS_PROPOSAL", copy.intro];
  if (forms.a) relay.push(copy.formCodeSource(forms.a.path));
  if (forms.b) relay.push(copy.formHtml(forms.b.path));
  if (forms.c)
    relay.push(
      forms.c.url
        ? copy.formEmbedLive(forms.c.url)
        : forms.c.available === false
          ? copy.formEmbedMissingKeys(forms.c.missingKeys.join(", "))
          : copy.formEmbedAvailable,
    );
  relay.push(
    copy.question(Object.keys(forms).join(" / ")),
    // The explicit WAIT instruction, at the point of temptation (observed violation: QA wave
    // 10 emitted the proposal for two elements and ran --form embed for both without a single
    // journalist turn). Localised, not weakened.
    copy.waitInstruction,
    "END_EXPORT_FORMS_PROPOSAL",
  );
```

And at `:514`, replace the French `reason` string with `copy.missingEmbedKeysReason(embedStatus.reason)` — resolve `copy` in that scope with `uiCopy()` if it is a different function.

Leave every machine marker untouched: `EXPORT_FORMS_JSON`, `EXPORT_FORMS_PROPOSAL`, `END_EXPORT_FORMS_PROPOSAL` are parsed by the orchestrator and by the QA harness, and they are not copy.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd lib && bun test newsroom/language.test.ts newsroom/ui-copy.test.ts
cd ../skills/splash && bun test tests/export-code-proposal-cli.test.ts tests/export-code.test.ts
```

Expected: PASS. `export-code.test.ts` must stay green untouched — it asserts markers and file outcomes, not copy. Also grep the tree for any other assertion on the French wording before declaring the task done:

```bash
rg -n "Choisissez la forme|ATTENDRE la réponse|HTML autonome" --glob '!node_modules' .
```

Every hit must be either `lib/newsroom/ui-copy.ts` (the French table) or a test that derives its expectation from it.

- [ ] **Step 7: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/language.ts lib/newsroom/language.test.ts lib/newsroom/ui-copy.ts lib/newsroom/ui-copy.test.ts skills/splash/scripts/export-code.mjs skills/splash/tests/export-code-proposal-cli.test.ts
git commit -m "feat(newsroom): the delivery proposal follows the newsroom's language, English by default"
```

**Note for the reviewer, and for the CHANGELOG:** the private QA harness (`../splash-harness`) drives the a/b/c answer. If its detector matches the French wording, it needs the English variant added **there** — out of scope for this branch, but say so in the task's completion notes so it is not discovered during a wave.

---

## Task 5: Readiness

**Files:**
- Create: `lib/newsroom/readiness.ts`, `lib/newsroom/readiness.test.ts`

**Interfaces:**
- Consumes: `NEWSROOM_CAPABILITIES`, `NewsroomCapability` (Task 1); `NewsroomState` (Task 2).
- Produces: `type ReadinessStatus = "ready" | "missing" | "unverified" | "disabled"`, `type CapabilityReadiness = { id: string; label: string; status: ReadinessStatus; reason: string; help: string[] }`, `type ReadinessOpts = { env: Record<string, string | undefined>; resolveDep?: (pkg: string, fromDir: string) => boolean; skillsRoot?: string }`, `capabilityReadiness(cap, state, opts): CapabilityReadiness`, `decorReadiness(state, opts): CapabilityReadiness[]`, `readinessBlockers(list): CapabilityReadiness[]`.

- [ ] **Step 1: Write the failing test**

Create `lib/newsroom/readiness.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import {
  capabilityReadiness,
  decorReadiness,
  readinessBlockers,
} from "./readiness";
import { DEFAULT_NEWSROOM_STATE, type NewsroomState } from "./state";

const ALL_DEPS_PRESENT = () => true;

function state(capabilities: NewsroomState["capabilities"]): NewsroomState {
  return { ...DEFAULT_NEWSROOM_STATE, capabilities };
}

const DW = NEWSROOM_CAPABILITIES["dw-chart"]!;
const MAP = NEWSROOM_CAPABILITIES["map-native"]!;
const CHART = NEWSROOM_CAPABILITIES["chart-native"]!;
const CMS = NEWSROOM_CAPABILITIES["embed-cms"]!;

describe("capability readiness", () => {
  it("is ready when enabled, keyed and installed", () => {
    const r = capabilityReadiness(DW, state({ "dw-chart": { enabled: true } }), {
      env: { DATAWRAPPER_API_TOKEN: "t" },
      resolveDep: ALL_DEPS_PRESENT,
    });
    expect(r.status).toBe("ready");
    expect(r.reason).toBe("");
  });

  it("is missing, with newsroom-language remediation, when a key is absent", () => {
    const r = capabilityReadiness(DW, state({ "dw-chart": { enabled: true } }), {
      env: {},
      resolveDep: ALL_DEPS_PRESENT,
    });
    expect(r.status).toBe("missing");
    expect(r.reason).toContain(DW.label);
    expect(r.help.join(" ")).toContain("app.datawrapper.de");
  });

  it("accepts either member of an alternatives group", () => {
    for (const name of ["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]) {
      const r = capabilityReadiness(
        MAP,
        state({ "map-native": { enabled: true } }),
        { env: { [name]: "k" }, resolveDep: ALL_DEPS_PRESENT },
      );
      expect(r.status).toBe("ready");
    }
  });

  it("is missing when a critical dependency is not installed", () => {
    const r = capabilityReadiness(
      CHART,
      state({ "chart-native": { enabled: true } }),
      { env: {}, resolveDep: (pkg) => pkg !== "vite" },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("vite");
    expect(r.reason).toContain("bun install");
  });

  it("is unverified when the last live check could not reach the provider", () => {
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-24T09:00:00.000Z", result: "unreachable" },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: "t" }, resolveDep: ALL_DEPS_PRESENT },
    );
    // Unreachable is NOT invalid: a valid key behind a corporate proxy must not be condemned.
    expect(r.status).toBe("unverified");
  });

  it("is missing when the provider actively rejected the credential", () => {
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-24T09:00:00.000Z", result: "rejected" },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: "t" }, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("rejected");
  });

  it("is disabled — never red — when the newsroom did not enable it", () => {
    const r = capabilityReadiness(DW, DEFAULT_NEWSROOM_STATE, {
      env: {},
      resolveDep: ALL_DEPS_PRESENT,
    });
    expect(r.status).toBe("disabled");
  });

  it("is disabled for a capability that is only declared", () => {
    const r = capabilityReadiness(
      CMS,
      state({ "embed-cms": { enabled: true } }),
      { env: {}, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.status).toBe("disabled");
    expect(r.reason).toContain("not available yet");
  });

  it("names the variable, never its value — a reason cannot leak a credential", () => {
    const secret = "dw-token-must-never-be-quoted";
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-24T09:00:00.000Z", result: "rejected" },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: secret }, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.reason).not.toContain(secret);
    expect(r.help.join(" ")).not.toContain(secret);
  });

  it("takes its environment from the caller, never from the process", () => {
    process.env.DATAWRAPPER_API_TOKEN = "ambient-token-must-be-ignored";
    try {
      const r = capabilityReadiness(
        DW,
        state({ "dw-chart": { enabled: true } }),
        { env: {}, resolveDep: ALL_DEPS_PRESENT },
      );
      expect(r.status).toBe("missing");
    } finally {
      delete process.env.DATAWRAPPER_API_TOKEN;
    }
  });
});

describe("the decor's readiness report", () => {
  it("reports every capability, and blockers exclude what is disabled", () => {
    const s = state({
      "dw-chart": { enabled: true },
      "chart-native": { enabled: true },
    });
    const all = decorReadiness(s, { env: {}, resolveDep: ALL_DEPS_PRESENT });
    expect(all.length).toBe(Object.keys(NEWSROOM_CAPABILITIES).length);

    const blockers = readinessBlockers(all);
    expect(blockers.map((b) => b.id)).toEqual(["dw-chart"]);
    for (const b of blockers) expect(b.status).toBe("missing");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd lib && bun test newsroom/readiness.test.ts
```

Expected: FAIL — `Cannot find module './readiness'`.

- [ ] **Step 3: Implement**

Create `lib/newsroom/readiness.ts`:

```ts
// readiness.ts — is an enabled capability usable RIGHT NOW? Pure by construction: the
// environment and dependency resolution are injected, so a readiness answer never depends on
// the machine that happens to be running the test. That purity is also what keeps the verb
// contract's invariant I5 intact — the contract reads no ambient state, so capability checks
// live here and are performed by CALLERS (the driver, the export script, the host command).
//
// Four statuses, and the two nuances that matter:
//   disabled   — the newsroom did not enable it, or it is only declared. NEVER a failure.
//   unverified — the last live check could not REACH the provider. Not "invalid": a valid key
//                behind a corporate proxy would be condemned for life.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NEWSROOM_CAPABILITIES, type NewsroomCapability } from "./capabilities";
import type { NewsroomState } from "./state";

export type ReadinessStatus = "ready" | "missing" | "unverified" | "disabled";

export type CapabilityReadiness = {
  id: string;
  label: string;
  status: ReadinessStatus;
  /** Empty when ready or disabled-by-choice; otherwise one actionable sentence. */
  reason: string;
  /** Where the journalist gets what is missing. */
  help: string[];
};

export type ReadinessOpts = {
  env: Record<string, string | undefined>;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
  /** Defaults to this repo's skills/ directory; injected by tests. */
  skillsRoot?: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILLS_ROOT = resolve(here, "../../skills");

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

export function capabilityReadiness(
  cap: NewsroomCapability,
  state: NewsroomState,
  opts: ReadinessOpts,
): CapabilityReadiness {
  const base = { id: cap.id, label: cap.label, help: [] as string[] };

  if (!cap.implemented)
    return {
      ...base,
      status: "disabled",
      reason: `${cap.label} is not available yet — it arrives with the publisher adapters`,
    };

  if (state.capabilities[cap.id]?.enabled !== true)
    return { ...base, status: "disabled", reason: "" };

  const missingGroups = cap.env.filter(
    (group) => !group.some((name) => isSet(opts.env[name])),
  );
  if (missingGroups.length) {
    const names = missingGroups.map((g) => g.join(" or ")).join(", ");
    return {
      ...base,
      status: "missing",
      reason: `${cap.label} needs ${names} — the Splash setup page collects it for you, then retry`,
      help: missingGroups.flatMap((g) =>
        g.map((n) => cap.envHelp[n]).filter((h): h is string => Boolean(h)),
      ),
    };
  }

  if (cap.criticalDeps) {
    const resolveDep = opts.resolveDep ?? defaultResolveDep;
    const fromDir = join(
      opts.skillsRoot ?? DEFAULT_SKILLS_ROOT,
      cap.criticalDeps.fromSkillDir,
    );
    const missing = cap.criticalDeps.packages.filter(
      (pkg) => !resolveDep(pkg, fromDir),
    );
    if (missing.length)
      return {
        ...base,
        status: "missing",
        reason:
          `${cap.label} is not installed (${missing.join(", ")} missing) — ` +
          `run \`bun install\` in skills/${cap.criticalDeps.fromSkillDir}, then retry`,
      };
  }

  const verified = state.capabilities[cap.id]?.lastVerified;
  if (verified?.result === "rejected")
    return {
      ...base,
      status: "missing",
      reason: `${cap.label}: the provider rejected this credential — re-check it in the Splash setup page`,
      help: Object.values(cap.envHelp),
    };
  if (verified?.result === "unreachable")
    return {
      ...base,
      status: "unverified",
      reason: `${cap.label} could not be reached when it was last checked — it may still work`,
    };

  return { ...base, status: "ready", reason: "" };
}

export function decorReadiness(
  state: NewsroomState,
  opts: ReadinessOpts,
): CapabilityReadiness[] {
  return Object.values(NEWSROOM_CAPABILITIES).map((cap) =>
    capabilityReadiness(cap, state, opts),
  );
}

/** What actually stands in the way. A disabled capability is not a failure, so it is absent. */
export function readinessBlockers(
  list: CapabilityReadiness[],
): CapabilityReadiness[] {
  return list.filter((r) => r.status === "missing");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd lib && bun test newsroom/readiness.test.ts
```

Expected: PASS (10 tests).

- [ ] **Step 5: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/readiness.ts lib/newsroom/readiness.test.ts
git commit -m "feat(newsroom): readiness that never condemns an unreachable provider"
```

---

## Task 6: The decor reaches the offer

**Files:**
- Create: `lib/newsroom/decor.ts`, `lib/newsroom/decor.test.ts`
- Modify: `lib/loop/manifest.ts:13-17` (the `FormOption` schema)
- Modify: `lib/loop/propose.ts`
- Modify: `lib/loop/driver.ts:41-51`
- Modify: `lib/loop/propose.test.ts` (new cases; existing ones must keep passing)

**Interfaces:**
- Consumes: `NEWSROOM_CAPABILITIES` (Task 1); `readNewsroomState` (Task 2); `needsDecorMigration`, `migrateDecor` (Task 3); `resolveLanguage` (Task 4); `decorReadiness`, `readinessBlockers`, `CapabilityReadiness` (Task 5); `loadNewsroomProfile` from `skills/splash/src/brand-profile.ts`.
- Produces: `type Decor = { root: string; state: NewsroomState; language: ResolvedLanguage; readiness: CapabilityReadiness[] }`, `installRoot(): string`, `decorEnv(root: string): Record<string, string | undefined>`, `loadDecor(root?: string): Decor`, and on `FormOption`: optional `requires: string[]` + optional `readiness: { status: ReadinessStatus; reason: string }`.

**Import-direction note:** `lib/newsroom/decor.ts` reads the deliverable language through `skills/splash/src/brand-profile.ts`. That is the same upward type/function reach `lib/core/registry.ts` already makes, and the profile loader is the single reader of `NEWSROOM-PROFILE.md` (deviation 3). Do not write a second markdown parser.

- [ ] **Step 1: Write the failing tests**

Create `lib/newsroom/decor.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decorEnv, loadDecor } from "./decor";
import { LEGACY_RUNTIME_FILE } from "./migrate-decor";
import { NEWSROOM_STATE_FILE } from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "decor-"));
}

describe("loading the decor", () => {
  it("reads the saved state, its language and its readiness", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "de",
        capabilities: { "dw-chart": { enabled: true } },
      }),
    );
    const decor = loadDecor(d);
    expect(decor.state.uiLang).toBe("de");
    expect(decor.language.ui).toBe("de");
    expect(decor.readiness.find((r) => r.id === "dw-chart")?.status).toBe(
      "missing",
    );
  });

  it("runs the legacy migration once, on first read", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    expect(loadDecor(d).state.runtime).toBe("goose");
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(false);
    expect(existsSync(join(d, NEWSROOM_STATE_FILE))).toBe(true);
    // Second read touches nothing and answers the same.
    expect(loadDecor(d).state.runtime).toBe("goose");
  });

  it("answers on a bare directory instead of throwing", () => {
    const decor = loadDecor(dir());
    expect(decor.state.uiLang).toBe("en");
    expect(decor.language).toEqual({ ui: "en", content: "en" });
  });

  it("takes the deliverable language from the newsroom profile", () => {
    const d = dir();
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      ['---', 'lang: "fr"', 'source:', '  name: "A Newsroom"', '---', '', '# guide', ''].join("\n"),
    );
    const decor = loadDecor(d);
    expect(decor.language).toEqual({ ui: "en", content: "fr" });
  });

  it("reads .env from the install root, with the process environment winning", () => {
    const d = dir();
    writeFileSync(join(d, ".env"), 'DATAWRAPPER_API_TOKEN="from-file"\n');
    expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-file");
    process.env.DATAWRAPPER_API_TOKEN = "from-process";
    try {
      expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-process");
    } finally {
      delete process.env.DATAWRAPPER_API_TOKEN;
    }
  });
});
```

Append to `lib/loop/propose.test.ts` (keep every existing case untouched):

```ts
import { propose } from "./propose";
import type { Decor } from "../newsroom/decor";

function decorWith(status: "ready" | "missing"): Decor {
  return {
    root: "/nowhere",
    state: {
      schemaVersion: 1,
      runtime: "claude",
      uiLang: "en",
      capabilities: { "chart-native": { enabled: status === "ready" } },
    },
    language: { ui: "en", content: "en" },
    readiness: [
      {
        id: "chart-native",
        label: "Charts built in-house (no account needed)",
        status,
        reason: status === "missing" ? "chart-native is not installed" : "",
        help: [],
      },
    ],
  };
}

test("every offered form names the capability it needs", () => {
  for (const option of propose(withNumeric(["a", "b"])))
    expect(option.requires).toEqual(["chart-native"]);
});

test("a form whose capability is missing is offered MARKED, never removed", () => {
  const offered = propose(withNumeric(["a", "b"]), decorWith("missing"));
  expect(offered.map((o) => o.id)).toEqual(["slope", "dumbbell"]);
  for (const option of offered) {
    expect(option.readiness?.status).toBe("missing");
    expect(option.readiness?.reason).toContain("not installed");
  }
});

test("a ready capability annotates without a reason", () => {
  for (const option of propose(withNumeric(["a", "b"]), decorWith("ready")))
    expect(option.readiness).toEqual({ status: "ready", reason: "" });
});

test("without a decor the offer is unannotated, exactly as before", () => {
  for (const option of propose(withNumeric(["a", "b"])))
    expect(option.readiness).toBeUndefined();
});
```

Append to `lib/loop/manifest.test.ts`:

```ts
test("a stored proposal from before the capability axis still parses", () => {
  const raw = {
    runId: "r",
    schemaVersion: 2,
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    elements: [
      {
        id: "e1",
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "because" }],
        },
      },
    ],
    events: [],
  };
  expect(() => parseManifest(raw)).not.toThrow();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd lib && bun test newsroom/decor.test.ts loop/propose.test.ts loop/manifest.test.ts
```

Expected: FAIL — missing `./decor`, `propose` takes one argument, `requires`/`readiness` absent.

- [ ] **Step 3: Write the composition seam**

Create `lib/newsroom/decor.ts`:

```ts
// decor.ts — the one impure function in lib/newsroom: it reads the install root and hands
// back the decor as data. Everything else in this directory is pure, which is what makes the
// decor testable without a machine.
//
// The install root is resolved from THIS module's location, not from process.cwd(): a
// producer, the loop and the host façade all run from different working directories, and the
// decor must not change depending on which one asked.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadNewsroomProfile } from "../../skills/splash/src/brand-profile";
import { resolveLanguage, type ResolvedLanguage } from "./language";
import { migrateDecor, needsDecorMigration } from "./migrate-decor";
import { decorReadiness, type CapabilityReadiness } from "./readiness";
import { readNewsroomState, type NewsroomState } from "./state";

const here = dirname(fileURLToPath(import.meta.url));

export type Decor = {
  root: string;
  state: NewsroomState;
  language: ResolvedLanguage;
  readiness: CapabilityReadiness[];
};

export function installRoot(): string {
  return resolve(here, "../..");
}

/**
 * The environment the decor judges against: the install's own .env, with the process
 * environment winning. Bun auto-loads .env from the CWD only, and a producer may run from
 * anywhere — reading the install's file is what keeps a readiness answer from claiming a key
 * is missing while it sits in the file the launcher sources.
 */
export function decorEnv(root: string): Record<string, string | undefined> {
  const fromFile: Record<string, string> = {};
  try {
    for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m) fromFile[m[1]!] = m[2]!;
    }
  } catch {
    // no .env — the process environment alone decides
  }
  return { ...fromFile, ...process.env };
}

export function loadDecor(root: string = installRoot()): Decor {
  const env = decorEnv(root);
  // The one write on a read path, and the reason an existing install is recognised instead of
  // re-interrogated. It happens once: afterwards newsroom.json exists.
  const state = needsDecorMigration(root)
    ? migrateDecor(root, env).state
    : readNewsroomState(root);
  const language = resolveLanguage({
    uiLang: state.uiLang,
    profileLang: loadNewsroomProfile(root)?.lang,
  });
  return { root, state, language, readiness: decorReadiness(state, { env }) };
}
```

- [ ] **Step 4: Widen `FormOption` and annotate the offer**

In `lib/loop/manifest.ts`, extend the schema (both fields OPTIONAL, so every stored manifest keeps parsing):

```ts
const FormOptionSchema = z.object({
  id: z.string(),
  nativeType: z.string(),
  why: z.string(),
  /** Capability ids this form needs — the decor's CAPACITÉ axis. */
  requires: z.array(z.string()).optional(),
  /** Filled when the offer was made with a decor: what stands in the way, if anything. */
  readiness: z
    .object({
      status: z.enum(["ready", "missing", "unverified", "disabled"]),
      reason: z.string(),
    })
    .optional(),
});
```

Rewrite `lib/loop/propose.ts`:

```ts
import type { Decor } from "../newsroom/decor";
import type { RunManifest, FormOption } from "./manifest";

// Thin proposal for the data→chart branch: legal chart-native forms, each with a grounded WHY
// the journalist can judge. It OFFERS — it never chooses (P1: instrument). The full typology
// + FT/perception grounding is the proposal-cerveau sub-project.
//
// The decor supplies the CAPACITÉ axis (spec §3.4): a form whose capability is not ready is
// offered MARKED, never silently dropped and never silently offered. Dropping it would decide
// for the journalist; offering it bare would promise something the install cannot do.
const CHART_NATIVE = "chart-native";

export function propose(m: RunManifest, decor?: Decor): FormOption[] {
  const profile = m.orient?.profile;
  if (!profile) return [];
  const cols = profile.numericColumns;
  const options: FormOption[] = [];
  if (cols.length === 2) {
    options.push(
      {
        id: "slope",
        nativeType: "slope",
        why: `Two points in time (${cols[0]} → ${cols[1]}) — a slope shows each row's change and whether the gap widens or narrows.`,
        requires: [CHART_NATIVE],
      },
      {
        id: "dumbbell",
        nativeType: "dumbbell",
        why: "A dumbbell marks the two endpoints per row — better when the size of each gap matters more than the trajectory.",
        requires: [CHART_NATIVE],
      },
    );
  } else if (cols.length >= 3) {
    options.push({
      id: "line",
      nativeType: "line",
      why: `${cols.length} points over time — a line traces each series' trajectory.`,
      requires: [CHART_NATIVE],
    });
  }
  return decor ? options.map((o) => annotate(o, decor)) : options;
}

// The worst status among what the form requires is the status of the form: a form is only as
// available as its least available capability.
const SEVERITY = { ready: 0, unverified: 1, disabled: 2, missing: 3 } as const;

function annotate(option: FormOption, decor: Decor): FormOption {
  const relevant = decor.readiness.filter((r) =>
    (option.requires ?? []).includes(r.id),
  );
  if (!relevant.length) return option;
  const worst = relevant.reduce((a, b) =>
    SEVERITY[b.status] > SEVERITY[a.status] ? b : a,
  );
  return {
    ...option,
    readiness: { status: worst.status, reason: worst.reason },
  };
}
```

In `lib/loop/driver.ts`, pass the decor. Add the import and widen the signature — the parameter is optional so existing callers and tests keep working, and tests inject a fake decor instead of touching the machine:

```ts
import { loadDecor, type Decor } from "../newsroom/decor";

export async function advance(
  run: RunManifest,
  runDir: string,
  decor: Decor = loadDecor(),
): Promise<RunManifest> {
```

and in the `propose` branch:

```ts
    case "propose": {
      if (!live) return run;
      const options = propose(run, decor);
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd lib && bun test newsroom/ loop/
```

Expected: PASS, including every pre-existing `lib/loop` case.

- [ ] **Step 6: Run the gate and commit**

```bash
bun run check
git add lib/newsroom/decor.ts lib/newsroom/decor.test.ts lib/loop/manifest.ts lib/loop/manifest.test.ts lib/loop/propose.ts lib/loop/propose.test.ts lib/loop/driver.ts
git commit -m "feat(loop): the offer knows what this newsroom can actually do"
```

---

## Task 7: `splash newsroom`

**Files:**
- Create: `lib/host/newsroom.ts`, `lib/host/newsroom.test.ts`
- Modify: `lib/host/cli.ts:123-173`
- Modify: `lib/host/README.md` (the "The four commands" section and its heading)
- Modify: `lib/host/cli.test.ts` (the unknown-command message assertion)

**Interfaces:**
- Consumes: `loadDecor`, `Decor` (Task 6); `readinessBlockers` (Task 5); `HostResponse` from `lib/host/state.ts:12`; `HostErrorCode` from `lib/host/errors.ts`.
- Produces: `describeNewsroom(dir?: string): HostResponse` whose `value` is `{ root, runtime, language, capabilities, blockers }`.

**The B1 lesson this task must honour:** a façade's wiring is only proven in a process that imports **only** the façade. The subprocess test below is that proof — a test that imports `describeNewsroom` directly proves nothing about the CLI.

- [ ] **Step 1: Write the failing test**

Create `lib/host/newsroom.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describeNewsroom } from "./newsroom";

const CLI = resolve(import.meta.dir, "./cli.ts");

function newsroomDir(uiLang: string): string {
  const d = mkdtempSync(join(tmpdir(), "host-newsroom-"));
  writeFileSync(
    join(d, "newsroom.json"),
    JSON.stringify({
      schemaVersion: 1,
      runtime: "goose",
      uiLang,
      capabilities: { "dw-chart": { enabled: true } },
    }),
  );
  return d;
}

describe("describeNewsroom", () => {
  it("answers with the decor in the shared envelope", () => {
    const r = describeNewsroom(newsroomDir("de"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const value = r.value as {
      runtime: string;
      language: { ui: string };
      capabilities: { id: string; status: string }[];
      blockers: { id: string }[];
    };
    expect(value.runtime).toBe("goose");
    expect(value.language.ui).toBe("de");
    expect(value.capabilities.length).toBeGreaterThan(0);
    // dw-chart is enabled but this temp dir has no token: a blocker, and the only one.
    expect(value.blockers.map((b) => b.id)).toEqual(["dw-chart"]);
  });

  it("never throws on a directory that holds nothing", () => {
    const r = describeNewsroom(mkdtempSync(join(tmpdir(), "host-empty-")));
    expect(r.ok).toBe(true);
  });
});

describe("the newsroom command, in a process that imports only the façade", () => {
  it("prints the decor as JSON and exits 0", () => {
    const r = spawnSync("bun", [CLI, "newsroom", "--dir", newsroomDir("fr")], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const body = JSON.parse(r.stdout) as {
      ok: boolean;
      value: { language: { ui: string } };
    };
    expect(body.ok).toBe(true);
    expect(body.value.language.ui).toBe("fr");
  });

  it("refuses an unknown flag as a usage error, exit 2", () => {
    const r = spawnSync("bun", [CLI, "newsroom", "--bogus", "x"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
    const body = JSON.parse(r.stdout) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
  });

  it("names newsroom among the commands it expects", () => {
    const r = spawnSync("bun", [CLI, "nonsense"], { encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("newsroom");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd lib && bun test host/newsroom.test.ts
```

Expected: FAIL — `Cannot find module './newsroom'`.

- [ ] **Step 3: Implement the command**

Create `lib/host/newsroom.ts`:

```ts
// The decor, as a host sees it. A host outside JavaScript cannot read newsroom.json and
// recompute readiness — and should not have to: it asks, and gets one JSON document holding
// what this newsroom can do, what language it works in, and what stands in the way.
import { loadDecor } from "../newsroom/decor";
import { readinessBlockers } from "../newsroom/readiness";
import type { HostResponse } from "./state";

export function describeNewsroom(dir?: string): HostResponse {
  try {
    const decor = loadDecor(dir);
    return {
      ok: true,
      value: {
        root: decor.root,
        runtime: decor.state.runtime,
        language: decor.language,
        publisher: decor.state.publisher ?? null,
        capabilities: decor.readiness,
        blockers: readinessBlockers(decor.readiness),
      },
    };
  } catch (e) {
    // loadDecor is written not to throw; this is the boundary that makes it true anyway.
    return {
      ok: false,
      code: "internal",
      message: `the newsroom decor could not be read: ${(e as Error)?.message ?? String(e)}`,
    };
  }
}
```

In `lib/host/cli.ts`, add the branch after the `state`/`next` branch:

```ts
  if (command === "newsroom") {
    const parsed = parseFlags(rest, ["--dir"]);
    if (!parsed.ok) usage(parsed.message);
    // --dir is optional: without it the decor resolves from the install root.
    const r = describeNewsroom(parsed.flags["--dir"]);
    emit(r, r.ok ? 0 : 2);
  }
```

with the import `import { describeNewsroom } from "./newsroom";`, and update the final usage message:

```ts
  usage(
    `unknown command ${JSON.stringify(command ?? "")} — expected verbs, state, next, verb or newsroom`,
  );
```

- [ ] **Step 4: Update the surface doc and the affected assertion**

In `lib/host/README.md`: retitle `## The four commands` to `## The five commands`, and add a section documenting `newsroom [--dir <dir>]` — what it returns (`runtime`, `language`, `publisher`, `capabilities`, `blockers`), that it is read-only **except** for the one-time legacy migration, and that `0` / `2` are its only exit codes (it refuses nothing: there is no verb to decline).

In `lib/host/cli.test.ts`, update the assertion on the unknown-command message to the new wording. Do not weaken it to a substring match — the exact message is part of the surface.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd lib && bun test host/
```

Expected: PASS, including every pre-existing `lib/host` case.

- [ ] **Step 6: Run the gate and commit**

```bash
bun run check
git add lib/host/newsroom.ts lib/host/newsroom.test.ts lib/host/cli.ts lib/host/cli.test.ts lib/host/README.md
git commit -m "feat(host): a host can read the newsroom's decor"
```

---

## Definition of Done

- [ ] `bun run check` green (every check, foreground). No new gate row was needed — `lib` is already in `TSC_DIRS` and `TEST_DIRS`.
- [ ] `skills/splash/tests/preflight.test.ts` and `skills/splash/tests/adapters.test.ts` pass **unedited** (`git diff` shows no change to either).
- [ ] The six success criteria of the spec §4.8 are demonstrably met:
  1. a fresh tree resolves to English (`loadDecor` on an empty dir → `{ui:"en"}`; the export block prints English);
  2. a capability that is not enabled never appears in `readinessBlockers`;
  3. every option `propose` returns names its `requires`, and is annotated rather than dropped when the capability is missing;
  4. `.env` remains the only home for credentials — the state schema cannot hold one, and the migration leaves `.env` byte-identical;
  5. an install carrying keys in `.env` migrates with those capabilities already enabled;
  6. `bun run check` green.
- [ ] No new `any`; no vendor mention; no `Co-Authored-By` trailer in any commit on this branch.
- [ ] **Write §4.9's answers back into the spec** (`docs/superpowers/specs/2026-07-24-preflight-setup-design.md`), in a new subsection "Ce que P1 a effectivement révélé", covering: did the capability model hold delivery as well as engines, and did pure readiness prove sufficient without a live network check. P2's page design depends on those two answers.
- [ ] Note in the completion summary whether the private QA harness (`../splash-harness`) needs its a/b/c detector taught the English wording (Task 4).

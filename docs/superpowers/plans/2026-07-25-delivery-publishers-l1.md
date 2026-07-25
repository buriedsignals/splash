# Delivery Publishers — L1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the delivery destination a first-class object — a provider-neutral publisher registry, a `publish` verb, and two proven adapters (hosted Cloudflare Pages, local ZIP) — so an artifact reaches a newsroom's destination without asking the journalist to pick a packaging format.

**Architecture:** Mirror of what the verb contract already did for `render`: the registry lives in `lib/core/publishers.ts` (so the verb reads it without inverting the dependency arrow), the adapters live in `lib/delivery/adapters/`, and one composition root (`lib/delivery/index.ts`) registers them exactly once. `lib/loop/deliver.ts` is the only module that resolves credentials — the contract never reads ambient state. Delivery is recorded in the run manifest with its own `deliveredProvenanceHash`, so a revision after publication makes the gate fall back instead of silently claiming the live link is current.

**Tech Stack:** Bun · TypeScript · zod (manifest schema) · `@noble/hashes` (sha256) · **fflate** (new dependency, pure-JS ZIP) · `bun:test`.

**Spec:** `docs/superpowers/specs/2026-07-25-delivery-publishers-design.md` (§4 = L1, the tranche this plan implements).

## Global Constraints

- Runtime **Bun**. Never npm, never node. Tests are `bun:test` (`describe` / `it` / `expect`).
- **TDD**: the failing test is written and run RED before the implementation, every task.
- Code, comments, identifiers, file names, commit messages, branch names: **English**. (Prose in specs/plans is French; nothing else.)
- **No vendor mention** (Claude/Anthropic) in any committed artifact. No `Co-Authored-By` trailer.
- **No new `any`.** No mocking of external APIs — real keys, real failures.
- Verb-contract invariants apply to every new file under `lib/core/verbs/`: **I1** a verb never throws · **I3** opaque payload fields · **I5** never reads `process.env` · **I6** request and result survive `JSON.parse(JSON.stringify(x))` · **I7** results carry paths, never bytes.
- Preflight invariant holds: **no `.env` value ever lands in `newsroom.json`.**
- `bun run check` green before every commit. `lib` is already in `TEST_DIRS` (`scripts/check.mjs:9-23`), so `lib/delivery` and `lib/core` tests are picked up with **no new gate line**.
- Worktree `/Users/rmdms/Sites/Professional/splash-delivery`, branch `feat/delivery-publishers`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/core/publishers.ts` | Provider-neutral registry: `Publisher`, `PublishRequest`, `PublishOutcome`, `DeliveryMetadata`, `registerPublisher`, `lookupPublisher`, `allPublishers` | 1 |
| `lib/core/verbs/types.ts` | `unknown-publisher` joins `VERB_ERROR_CODES` | 2 |
| `lib/core/verbs/publish.ts` | The verb body: shape gate, lookup, typed refusals, never throws | 2 |
| `lib/core/verbs/index.ts` | `publish` leaves the `not-implemented` branch | 2 |
| `lib/delivery/snippet.ts` | Renders the newsroom's embed template. Pure | 3 |
| `lib/delivery/metadata.ts` | Builds `DeliveryMetadata` from an element + profile facts. Pure | 4 |
| `lib/delivery/adapters/zip.ts` | The portable package publisher, deterministic bytes | 5 |
| `lib/delivery/adapters/cloudflare-pages.ts` | Hoisted from `skills/splash/src/cloudflare-pages.ts`, wrapped as a `Publisher` | 6 |
| `skills/splash/src/cloudflare-pages.ts` | Re-exports from the new home — no importer touched | 6 |
| `lib/delivery/index.ts` | Composition root + `PUBLISHERS_REGISTERED` | 6 |
| `lib/loop/manifest.ts` | Real `delivery` slot · `schemaVersion` 3 · `deliver` in `NextAction` · `gateStateOf` | 7 |
| `lib/loop/migrate.ts` | v2→v3 migration | 7 |
| `lib/host/state.ts` | The read-only façade's schema floor moves to 3 | 7 |
| `lib/newsroom/capabilities.ts` | `zip` capability added | 8 |
| `lib/newsroom/state.ts` | `delivery?` (3 optional fields) on `NewsroomState` | 8 |
| `lib/loop/deliver.ts` | The loop step: preconditions → decor → `runVerb("publish")` → record | 9 |
| `lib/loop/driver.ts` | The `deliver` branch of `advance` | 9 |

---

### Task 1: The publisher registry

**Files:**
- Create: `lib/core/publishers.ts`
- Test: `lib/core/publishers.test.ts`

**Interfaces:**
- Consumes: `VerbResult` from `lib/core/verbs/types.ts` (already exists: `{ ok: true; value: T } | { ok: false; code: VerbErrorCode; message: string }`).
- Produces: the types `DeliveryMetadata`, `PublishRequest`, `PublishOutcome`, `Publisher`, and the functions `registerPublisher(p: Publisher): void`, `lookupPublisher(id: string): Publisher | undefined`, `allPublishers(): Publisher[]`, `resetPublishersForTest(): void`. Every later task uses these names verbatim.

- [ ] **Step 1: Write the failing test**

Create `lib/core/publishers.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import {
  registerPublisher,
  lookupPublisher,
  allPublishers,
  resetPublishersForTest,
  type Publisher,
} from "./publishers";
import { ok } from "./verbs/types";

function stub(id: string, implemented = true): Publisher {
  return {
    id,
    kind: "package",
    implemented,
    publish: async () =>
      ok({
        publisherId: id,
        kind: "package" as const,
        path: "/tmp/x.zip",
        snippet: "",
        publishedAt: "1980-01-01T00:00:00.000Z",
      }),
  };
}

describe("publisher registry", () => {
  beforeEach(() => resetPublishersForTest());

  it("should return the publisher that was registered under its id", () => {
    const p = stub("zip");
    registerPublisher(p);
    expect(lookupPublisher("zip")).toBe(p);
  });

  it("should return undefined for an id nobody registered", () => {
    expect(lookupPublisher("embed-nowhere")).toBeUndefined();
  });

  it("should throw on a duplicate id rather than shadow the first registration", () => {
    registerPublisher(stub("zip"));
    expect(() => registerPublisher(stub("zip"))).toThrow(
      "publisher already registered: zip",
    );
  });

  it("should list every registered publisher, declared-but-unimplemented ones included", () => {
    registerPublisher(stub("zip"));
    registerPublisher(stub("embed-fly", false));
    expect(allPublishers().map((p) => p.id).sort()).toEqual([
      "embed-fly",
      "zip",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-delivery && bun test lib/core/publishers.test.ts`
Expected: FAIL — `Cannot find module './publishers'`.

- [ ] **Step 3: Write the implementation**

Create `lib/core/publishers.ts`:

```ts
// The publisher registry — the single source of truth for delivery dispatch, and the twin of
// lib/core/registry.ts (the producer registry the render verb dispatches from).
//
// It lives in core, not in lib/delivery, for one reason: lib/core/verbs/publish.ts must be
// able to look a publisher up, and a core module importing lib/delivery would invert the
// dependency arrow the verb-contract branch exists to fix. The ADAPTERS live in
// lib/delivery/adapters/ and register themselves through lib/delivery/index.ts.
//
// See docs/superpowers/specs/2026-07-25-delivery-publishers-design.md §3.1.
import type { VerbResult } from "./verbs/types";

/** What a destination needs to know about the visual. Assembled by lib/delivery/metadata.ts. */
export type DeliveryMetadata = {
  title: string;
  /** WCAG 1.1.1. Required by the type: the engines' alt-text refusal must not be lost at packaging. */
  altText: string;
  source: string;
  credit: string;
  /** BCP-47 — the CONTENT language (NEWSROOM-PROFILE.md), never the interface language. */
  lang: string;
  width?: number;
  height?: number | "responsive";
};

export type PublishRequest = {
  /** I7: a path, never bytes. */
  artifactPath: string;
  /** Slug source; checked before any path resolution. */
  id: string;
  metadata: DeliveryMetadata;
  /** NON-secret provider identifiers, from newsroom.json. */
  settings: Record<string, string>;
  /** Resolved by the CALLER (lib/loop/deliver.ts). The contract never reads ambient state (I5). */
  credentials: Record<string, string>;
  /** Where a "package" publisher drops its file. */
  outDir: string;
};

export type PublishOutcome = {
  publisherId: string;
  kind: "hosted" | "package";
  /** Hosted destinations. */
  url?: string;
  /** Owned packages. */
  path?: string;
  snippet: string;
  publishedAt: string;
};

export interface Publisher {
  /** Matches the decor's capability id ("embed-cloudflare", "zip", …). */
  id: string;
  kind: "hosted" | "package";
  /** false = declared, no body yet. Refused before any I/O. */
  implemented: boolean;
  publish(req: PublishRequest): Promise<VerbResult<PublishOutcome>>;
}

const REGISTRY = new Map<string, Publisher>();

// Throws on a duplicate id — intentional, and the same choice registerProducer made: it catches
// a double-import of the composition root instead of silently shadowing an adapter.
export function registerPublisher(p: Publisher): void {
  if (REGISTRY.has(p.id))
    throw new Error(`publisher already registered: ${p.id}`);
  REGISTRY.set(p.id, p);
}

export function lookupPublisher(id: string): Publisher | undefined {
  return REGISTRY.get(id);
}

export function allPublishers(): Publisher[] {
  return [...REGISTRY.values()];
}

/** Test seam only. The composition root registers once per process; a test needs a clean slate. */
export function resetPublishersForTest(): void {
  REGISTRY.clear();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test lib/core/publishers.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/core/publishers.ts lib/core/publishers.test.ts
git commit -m "feat(publishers): a provider-neutral registry, twin of the producer one"
```

---

### Task 2: The `publish` verb

**Files:**
- Create: `lib/core/verbs/publish.ts`
- Create: `lib/core/verbs/publish.test.ts`
- Modify: `lib/core/verbs/types.ts` (add `unknown-publisher` to `VERB_ERROR_CODES`, line 16-24)
- Modify: `lib/core/verbs/index.ts` (line 46-50: `publish` leaves the `not-implemented` branch)

**Interfaces:**
- Consumes: `lookupPublisher`, `PublishRequest`, `PublishOutcome` (Task 1); `fail`, `ok`, `VerbResult` (`lib/core/verbs/types.ts`).
- Produces: `isPublishPayload(p: unknown): p is PublishRequest` and `publish(payload: PublishRequest): Promise<VerbResult<PublishOutcome>>`, both exported from `lib/core/verbs/publish.ts` and re-exported by `lib/core/verbs/index.ts`.

- [ ] **Step 1: Write the failing test**

Create `lib/core/verbs/publish.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  registerPublisher,
  resetPublishersForTest,
  type Publisher,
  type PublishRequest,
} from "../publishers";
import { runVerb } from "./index";
import { ok } from "./types";

const NEVER_CREATED = join(tmpdir(), "splash-publish-must-not-exist");

function request(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    artifactPath: join(import.meta.dir, "publish.test.ts"),
    id: "e1",
    metadata: {
      title: "T",
      altText: "A",
      source: "S",
      credit: "C",
      lang: "en",
    },
    settings: {},
    credentials: {},
    outDir: NEVER_CREATED,
    ...overrides,
  };
}

function publisher(over: Partial<Publisher> & { id: string }): Publisher {
  return {
    kind: "package",
    implemented: true,
    publish: async () =>
      ok({
        publisherId: over.id,
        kind: "package" as const,
        path: "/tmp/x.zip",
        snippet: "<iframe></iframe>",
        publishedAt: "1980-01-01T00:00:00.000Z",
      }),
    ...over,
  } as Publisher;
}

describe("the publish verb", () => {
  beforeEach(() => resetPublishersForTest());

  it("should refuse an id no adapter registered, with unknown-publisher", async () => {
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "embed-nowhere" },
    });
    expect(r).toMatchObject({ ok: false, code: "unknown-publisher" });
    expect((r as { message: string }).message).toContain("embed-nowhere");
  });

  it("should name the omitted field when no destination was given at all", async () => {
    // A missing publisherId is a MALFORMED request, not an unknown destination: answering
    // `no publisher registered as "undefined"` tells a host nothing about what to fix.
    const r = await runVerb("publish", request());
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("publisherId");
  });

  it("should refuse a declared-but-unimplemented publisher without touching the filesystem", async () => {
    registerPublisher(publisher({ id: "embed-fly", implemented: false }));
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "embed-fly" },
    });
    expect(r).toMatchObject({ ok: false, code: "not-implemented" });
    expect(existsSync(NEVER_CREATED)).toBe(false);
  });

  it("should refuse a payload missing a required field, with invalid-request", async () => {
    const { artifactPath, ...incomplete } = request();
    const r = await runVerb("publish", incomplete);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should turn an adapter that throws into engine-failed, never a thrown error", async () => {
    registerPublisher(
      publisher({
        id: "zip",
        publish: async () => {
          throw new Error("boom");
        },
      }),
    );
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "zip" },
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain("boom");
  });

  it("should return an outcome that survives a JSON round trip (I6)", async () => {
    registerPublisher(publisher({ id: "zip" }));
    const r = await runVerb("publish", {
      ...request(),
      settings: { publisherId: "zip" },
    });
    expect(r.ok).toBe(true);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/core/verbs/publish.test.ts`
Expected: FAIL — every case answers `not-implemented` today (`lib/core/verbs/index.ts:46`), and `unknown-publisher` is not a valid code.

- [ ] **Step 3: Add the error code**

In `lib/core/verbs/types.ts`, inside `VERB_ERROR_CODES` (after the `"engine-failed"` entry):

```ts
  "unknown-publisher", // no adapter registered under this publisher id
```

- [ ] **Step 4: Write the verb body**

Create `lib/core/verbs/publish.ts`:

```ts
// The `publish` verb — dispatch to a registered publisher adapter.
//
// The publisher id travels in `settings.publisherId` rather than as a payload field of its
// own: `settings` is the adapter-opaque bag (I3), and the destination IS an adapter concern.
// The shape gate below is explicit rather than schema-driven, exactly like isRenderPayload —
// every field is checked before anything touches the filesystem.
import { lookupPublisher, type PublishOutcome, type PublishRequest } from "../publishers";
import { fail, type VerbResult } from "./types";

export function isPublishPayload(p: unknown): p is PublishRequest {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  const m = r.metadata as Record<string, unknown> | undefined;
  return (
    typeof r.artifactPath === "string" &&
    typeof r.id === "string" &&
    typeof r.outDir === "string" &&
    typeof r.settings === "object" &&
    r.settings !== null &&
    typeof r.credentials === "object" &&
    r.credentials !== null &&
    typeof m === "object" &&
    m !== null &&
    typeof m.title === "string" &&
    typeof m.altText === "string" &&
    typeof m.source === "string" &&
    typeof m.credit === "string" &&
    typeof m.lang === "string"
  );
}

// Both refusals below land BEFORE any I/O: an unknown or unimplemented destination must not
// create a directory, stage a file, or open a socket. That is the decor's second bite
// (preflight spec §3.4) expressed in the contract.
export async function publish(
  payload: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  const id = payload.settings.publisherId;
  if (typeof id !== "string" || id === "")
    return fail(
      "invalid-request",
      "publish: settings.publisherId names the destination and was missing",
    );
  const adapter = lookupPublisher(id);
  if (!adapter)
    return fail("unknown-publisher", `publish: no publisher registered as "${id}"`);
  if (!adapter.implemented)
    return fail(
      "not-implemented",
      `publish: "${id}" is declared but has no adapter yet`,
    );
  return adapter.publish(payload);
}
```

- [ ] **Step 5: Wire it into the dispatcher**

In `lib/core/verbs/index.ts`, replace the blanket refusal at lines 46-50:

```ts
    if (verb === "publish") {
      if (!isPublishPayload(payload))
        return fail(
          "invalid-request",
          "publish: payload must carry artifactPath, id, metadata, settings, credentials and outDir",
        );
      return await publish(payload);
    }
    if (verb !== "render")
      return fail(
        "not-implemented",
        `verb "${verb}" is declared but has no implementation yet`,
      );
```

and add to the imports + re-exports at the top of the file:

```ts
import { isPublishPayload, publish } from "./publish";
export { isPublishPayload, publish } from "./publish";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test lib/core/verbs/`
Expected: PASS — the new 5 tests plus every existing verb test (`index.test.ts` asserts `capture`/`review` still answer `not-implemented`; `publish` no longer does, so update that assertion if it names `publish` explicitly).

- [ ] **Step 7: Commit**

```bash
git add lib/core/verbs/publish.ts lib/core/verbs/publish.test.ts lib/core/verbs/types.ts lib/core/verbs/index.ts lib/core/verbs/index.test.ts
git commit -m "feat(verbs): publish dispatches to a registered adapter, refusing before any I/O"
```

---

### Task 3: The embed snippet

**Files:**
- Create: `lib/delivery/snippet.ts`
- Test: `lib/delivery/snippet.test.ts`

**Interfaces:**
- Consumes: `DeliveryMetadata` (Task 1).
- Produces: `export type SnippetInput = { url: string; id: string; metadata: DeliveryMetadata; template?: string }` and `renderSnippet(input: SnippetInput): VerbResult<string>`, plus `DEFAULT_SNIPPET_TEMPLATE`.

- [ ] **Step 1: Write the failing test**

Create `lib/delivery/snippet.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { renderSnippet } from "./snippet";
import type { DeliveryMetadata } from "../core/publishers";

const META: DeliveryMetadata = {
  title: "Primes cantonales",
  altText: "Les primes montent partout",
  source: "OFSP",
  credit: "Heidi.news",
  lang: "fr",
  width: 700,
  height: 420,
};

describe("renderSnippet", () => {
  it("should substitute every placeholder the newsroom template declares", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      template: '<iframe src="{url}" title="{title}" id="{id}" width="{width}" height="{height}"></iframe>',
    });
    expect(r).toEqual({
      ok: true,
      value:
        '<iframe src="https://a.example.pages.dev" title="Primes cantonales" id="primes" width="700" height="420"></iframe>',
    });
  });

  it("should refuse a template carrying a placeholder it cannot fill", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
      template: '<iframe src="{url}" data-x="{campaign}"></iframe>',
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("{campaign}");
  });

  it("should render a working default iframe when the newsroom configured no template", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: META,
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value).toContain(
      'src="https://a.example.pages.dev"',
    );
    expect((r as { value: string }).value).toContain('height="420"');
  });

  it("should emit a responsive height as a percentage-driven style rather than a number", () => {
    const r = renderSnippet({
      url: "https://a.example.pages.dev",
      id: "primes",
      metadata: { ...META, height: "responsive" },
    });
    expect(r.ok).toBe(true);
    expect((r as { value: string }).value).toContain("aspect-ratio");
    expect((r as { value: string }).value).not.toContain('height="responsive"');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/delivery/snippet.test.ts`
Expected: FAIL — `Cannot find module './snippet'`.

- [ ] **Step 3: Write the implementation**

Create `lib/delivery/snippet.ts`:

```ts
// The embed snippet a newsroom pastes into its CMS. PURE — no I/O, no clock, no environment.
//
// An unknown placeholder is a REFUSAL, not a pass-through: a literal "{width}" left inside
// published HTML is a defect invisible from Splash and visible to the reader. That is the one
// opinion this module holds.
import type { DeliveryMetadata } from "../core/publishers";
import { fail, ok, type VerbResult } from "../core/verbs/types";

export type SnippetInput = {
  url: string;
  id: string;
  metadata: DeliveryMetadata;
  /** The newsroom's tested template. Absent ⇒ DEFAULT_SNIPPET_TEMPLATE. */
  template?: string;
};

export const DEFAULT_SNIPPET_TEMPLATE =
  '<iframe src="{url}" title="{title}" width="{width}" height="{height}" style="border:0;max-width:100%" loading="lazy"></iframe>';

const RESPONSIVE_TEMPLATE =
  '<iframe src="{url}" title="{title}" style="border:0;width:100%;max-width:{width}px;aspect-ratio:16/9" loading="lazy"></iframe>';

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g;

export function renderSnippet(input: SnippetInput): VerbResult<string> {
  const { metadata: m } = input;
  const responsive = m.height === "responsive";
  const template =
    input.template ??
    (responsive ? RESPONSIVE_TEMPLATE : DEFAULT_SNIPPET_TEMPLATE);

  const values: Record<string, string> = {
    url: input.url,
    id: input.id,
    title: m.title,
    source: m.source,
    credit: m.credit,
    lang: m.lang,
    width: String(m.width ?? 700),
    height: responsive ? "" : String(m.height ?? 420),
  };

  const unknown: string[] = [];
  const rendered = template.replace(PLACEHOLDER, (whole, name: string) => {
    const v = values[name];
    if (v === undefined) {
      unknown.push(whole);
      return whole;
    }
    return v;
  });
  if (unknown.length)
    return fail(
      "invalid-request",
      `snippet: the delivery template carries ${unknown.join(", ")}, which Splash cannot fill — ` +
        `known placeholders are ${Object.keys(values).map((k) => `{${k}}`).join(", ")}`,
    );
  return ok(rendered);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test lib/delivery/snippet.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/snippet.ts lib/delivery/snippet.test.ts
git commit -m "feat(delivery): render the newsroom embed snippet, refusing placeholders it cannot fill"
```

---

### Task 4: The delivery metadata

**Files:**
- Create: `lib/delivery/metadata.ts`
- Test: `lib/delivery/metadata.test.ts`

**Interfaces:**
- Consumes: `DeliveryMetadata` (Task 1); `RunElement` from `lib/loop/manifest.ts` (existing type: carries `angle?: { confirmedTakeaway: string; emphasis?: string; altInsight: string; unit: string }`).
- Produces: `export type ProfileFacts = { source?: string; credit?: string; lang?: string }`, `export type DeliverySizing = { width?: number; height?: number | "responsive" }`, and `deliveryMetadata(el: RunElement, profile: ProfileFacts, sizing: DeliverySizing): VerbResult<DeliveryMetadata>`.

- [ ] **Step 1: Write the failing test**

Create `lib/delivery/metadata.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { deliveryMetadata } from "./metadata";
import type { RunElement } from "../loop/manifest";

const EL: RunElement = {
  id: "e1",
  angle: {
    confirmedTakeaway: "Les primes montent partout",
    altInsight: "Toutes les courbes cantonales montent depuis 2010",
    unit: "CHF",
  },
};

describe("deliveryMetadata", () => {
  it("should take the title from the confirmed takeaway and the alt text from the alt insight", () => {
    const r = deliveryMetadata(EL, { source: "OFSP", lang: "fr" }, {});
    expect(r).toMatchObject({
      ok: true,
      value: {
        title: "Les primes montent partout",
        altText: "Toutes les courbes cantonales montent depuis 2010",
        source: "OFSP",
        lang: "fr",
      },
    });
  });

  it("should refuse an element with no angle rather than invent one", () => {
    const r = deliveryMetadata({ id: "e1" }, {}, {});
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("should refuse a blank alt text, so the engines' WCAG refusal survives packaging", () => {
    const r = deliveryMetadata(
      { ...EL, angle: { ...EL.angle!, altInsight: "   " } },
      {},
      {},
    );
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("alt");
  });

  it("should fall back to neutral source, credit and English when the profile says nothing", () => {
    const r = deliveryMetadata(EL, {}, {});
    expect(r).toMatchObject({
      ok: true,
      value: { source: "Provided by the newsroom", credit: "", lang: "en" },
    });
  });

  it("should carry the newsroom's sizing rules through unchanged", () => {
    const r = deliveryMetadata(EL, {}, { width: 640, height: "responsive" });
    expect(r).toMatchObject({
      ok: true,
      value: { width: 640, height: "responsive" },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/delivery/metadata.test.ts`
Expected: FAIL — `Cannot find module './metadata'`.

- [ ] **Step 3: Write the implementation**

Create `lib/delivery/metadata.ts`:

```ts
// DeliveryMetadata, derived from what the run already holds — never invented.
//
// PURE, and deliberately decoupled from the newsroom profile's own type: the caller reads
// NEWSROOM-PROFILE.md and hands the three facts down. That is what keeps lib/delivery free of
// any dependency on skills/.
import type { DeliveryMetadata } from "../core/publishers";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { RunElement } from "../loop/manifest";

export type ProfileFacts = { source?: string; credit?: string; lang?: string };
export type DeliverySizing = { width?: number; height?: number | "responsive" };

const NEUTRAL_SOURCE = "Provided by the newsroom";

export function deliveryMetadata(
  el: RunElement,
  profile: ProfileFacts,
  sizing: DeliverySizing,
): VerbResult<DeliveryMetadata> {
  if (!el.angle)
    return fail(
      "invalid-request",
      `metadata: element ${el.id} has no confirmed angle to describe`,
    );
  // The alt text is REQUIRED by DeliveryMetadata for a reason: chart-native refuses to produce
  // without one (WCAG 1.1.1), and that refusal must not be quietly recovered at packaging time.
  if (el.angle.altInsight.trim() === "")
    return fail(
      "invalid-request",
      `metadata: element ${el.id} carries a blank alt text — the accessibility description cannot be empty`,
    );
  return ok({
    title: el.angle.confirmedTakeaway,
    altText: el.angle.altInsight,
    source: profile.source?.trim() || NEUTRAL_SOURCE,
    credit: profile.credit?.trim() ?? "",
    lang: profile.lang?.trim() || "en",
    ...(sizing.width !== undefined ? { width: sizing.width } : {}),
    ...(sizing.height !== undefined ? { height: sizing.height } : {}),
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test lib/delivery/metadata.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/delivery/metadata.ts lib/delivery/metadata.test.ts
git commit -m "feat(delivery): derive delivery metadata from the run, never invent it"
```

---

### Task 5: The ZIP publisher

**Files:**
- Create: `lib/delivery/adapters/zip.ts`
- Test: `lib/delivery/adapters/zip.test.ts`
- Modify: `package.json` (add the `fflate` dependency)

**Interfaces:**
- Consumes: `Publisher`, `PublishRequest`, `PublishOutcome` (Task 1); `renderSnippet` (Task 3).
- Produces: `export const zipPublisher: Publisher` (id `"zip"`, kind `"package"`, `implemented: true`) and `export function zipReadme(m: DeliveryMetadata, id: string): string`.

- [ ] **Step 1: Add the dependency**

Run: `cd /Users/rmdms/Sites/Professional/splash-delivery && bun add fflate`
Expected: `fflate` appears under `dependencies` in `package.json`. It is pure JS with no transitive dependencies — chosen over the system `zip` binary, which does not exist on Windows and the installer is cross-platform.

- [ ] **Step 2: Write the failing test**

Create `lib/delivery/adapters/zip.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync, strFromU8 } from "fflate";
import { sha256 } from "@noble/hashes/sha2.js";
import { zipPublisher } from "./zip";
import type { PublishRequest } from "../../core/publishers";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "splash-zip-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function request(): PublishRequest {
  const artifact = join(root, "interactive.html");
  writeFileSync(artifact, "<html><body>chart</body></html>");
  const outDir = join(root, "out");
  mkdirSync(outDir, { recursive: true });
  return {
    artifactPath: artifact,
    id: "primes",
    metadata: {
      title: "Primes cantonales",
      altText: "Les primes montent",
      source: "OFSP",
      credit: "Heidi.news",
      lang: "fr",
      width: 700,
      height: 420,
    },
    settings: { publisherId: "zip" },
    credentials: {},
    outDir,
  };
}

describe("the zip publisher", () => {
  it("should write an archive holding exactly the four documented entries", async () => {
    const r = await zipPublisher.publish(request());
    expect(r.ok).toBe(true);
    const zipPath = (r as { value: { path: string } }).value.path;
    const entries = Object.keys(unzipSync(readFileSync(zipPath))).sort();
    expect(entries).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);
  });

  it("should produce byte-identical archives across two runs", async () => {
    const a = await zipPublisher.publish(request());
    const b = await zipPublisher.publish(request());
    const digest = (r: unknown) =>
      Buffer.from(
        sha256(readFileSync((r as { value: { path: string } }).value.path)),
      ).toString("hex");
    expect(digest(a)).toEqual(digest(b));
  });

  it("should carry the alt text into metadata.json", async () => {
    const r = await zipPublisher.publish(request());
    const zipPath = (r as { value: { path: string } }).value.path;
    const meta = JSON.parse(
      strFromU8(unzipSync(readFileSync(zipPath))["metadata.json"]!),
    );
    expect(meta.altText).toBe("Les primes montent");
    expect(meta.id).toBe("primes");
  });

  it("should refuse an artifact path that does not exist, without writing an archive", async () => {
    const req = request();
    const r = await zipPublisher.publish({
      ...req,
      artifactPath: join(root, "absent.html"),
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
  });

  it("should report kind package with no url", async () => {
    const r = await zipPublisher.publish(request());
    expect(r).toMatchObject({
      ok: true,
      value: { publisherId: "zip", kind: "package", url: undefined },
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test lib/delivery/adapters/zip.test.ts`
Expected: FAIL — `Cannot find module './zip'`.

- [ ] **Step 4: Write the implementation**

Create `lib/delivery/adapters/zip.ts`:

```ts
// The portable package publisher — the universal fallback, and the reason there is only ONE
// delivery path: it "publishes" to disk. It needs no key, so the decor always reports it ready.
//
// The archive wraps the artifact AS THE ENGINES PRODUCE IT (a self-contained index.html). The
// spec records this as a deliberate partial answer to issue #4's "clean separate files": a
// non-inlined build would touch every producer and create a second artifact shape to keep
// green. See the spec §2 decision 8.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import {
  type DeliveryMetadata,
  type Publisher,
  type PublishOutcome,
  type PublishRequest,
} from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";

// The ZIP epoch floor, as a Date rather than 0: the archive's bytes must not depend on the
// clock, or the golden determinism test becomes a clock test. A Date object also avoids any
// falsy-zero handling inside the encoder.
const FIXED_MTIME = new Date("1980-01-01T00:00:00Z");
// Same reason the mtime is pinned: the recorded publication instant must not vary between two
// otherwise identical runs, which is what makes an archive reproducible end to end.
const FIXED_PUBLISHED_AT = FIXED_MTIME.toISOString();

export function zipReadme(m: DeliveryMetadata, id: string, snippet: string): string {
  return [
    `# ${m.title}`,
    "",
    m.altText,
    "",
    "## How to integrate",
    "",
    "1. Upload `index.html` anywhere your newsroom serves static files.",
    "2. Paste the snippet below into your article, replacing the URL with where you uploaded it.",
    "",
    "```html",
    snippet,
    "```",
    "",
    `Source: ${m.source}`,
    m.credit ? `Credit: ${m.credit}` : "",
    `Identifier: ${id}`,
    "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}

async function publish(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  // The URL is unknown for an owned package — the newsroom decides where it lands — so the
  // snippet carries the documented placeholder the README tells them to replace.
  const snippet = renderSnippet({
    url: "YOUR-URL-HERE",
    id: req.id,
    metadata: req.metadata,
  });
  if (!snippet.ok) return snippet;

  let artifact: Uint8Array;
  try {
    artifact = new Uint8Array(readFileSync(req.artifactPath));
  } catch (e) {
    return fail(
      "engine-failed",
      `zip: cannot read the artifact ${req.artifactPath}: ${(e as Error).message}`,
    );
  }

  const metadata = { ...req.metadata, id: req.id };
  const opts = { mtime: FIXED_MTIME };
  const archive = zipSync(
    {
      "index.html": [artifact, opts],
      "EMBED.txt": [strToU8(snippet.value + "\n"), opts],
      "README.md": [strToU8(zipReadme(req.metadata, req.id, snippet.value)), opts],
      "metadata.json": [
        strToU8(JSON.stringify(metadata, null, 2) + "\n"),
        opts,
      ],
    },
    { level: 6 },
  );

  const path = join(req.outDir, `${req.id}.zip`);
  try {
    writeFileSync(path, archive);
  } catch (e) {
    return fail(
      "engine-failed",
      `zip: cannot write the archive ${path}: ${(e as Error).message}`,
    );
  }
  return ok({
    publisherId: "zip",
    kind: "package",
    path,
    snippet: snippet.value,
    publishedAt: FIXED_PUBLISHED_AT,
  });
}

export const zipPublisher: Publisher = {
  id: "zip",
  kind: "package",
  implemented: true,
  publish,
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test lib/delivery/adapters/zip.test.ts`
Expected: PASS, 5 tests. If the determinism test fails, the encoder ignored `mtime` — pass `{ mtime: FIXED_MTIME, level: 6 }` per entry and re-run; do NOT relax the assertion.

- [ ] **Step 6: Commit**

```bash
git add lib/delivery/adapters/zip.ts lib/delivery/adapters/zip.test.ts package.json bun.lock
git commit -m "feat(delivery): a portable zip publisher with reproducible bytes"
```

---

### Task 6: Hoist the Cloudflare adapter and register both publishers

**Files:**
- Create: `lib/delivery/adapters/cloudflare-pages.ts` (moved content + the `Publisher` wrapper)
- Create: `lib/delivery/index.ts`
- Create: `lib/delivery/index.test.ts`
- Modify: `skills/splash/src/cloudflare-pages.ts` (becomes a re-export)
- Modify: `skills/splash/scripts/deploy-embed.mjs` (re-export `stageArtifact`/`servedMatcher` from the new home instead of defining them)

**Interfaces:**
- Consumes: `Publisher`, `registerPublisher` (Task 1); `renderSnippet` (Task 3); `zipPublisher` (Task 5).
- Produces: `export const cloudflarePublisher: Publisher` (id `"embed-cloudflare"`, kind `"hosted"`), the moved functions (`embedSlug`, `assertEmbedProject`, `embedTokenConfigured`, `resolveEmbedConfig`, `contentTypeFor`, `hashAsset`, `ensureProject`, `deployDirectory`, `resolveAliasUrl`, `verifyServed`, `stageArtifact`, `servedMatcher`, and the types `EmbedConfig`, `DeployResult`), and, from `lib/delivery/index.ts`, `export function registerAllPublishers(): void` plus `export const PUBLISHERS_REGISTERED = true`.

- [ ] **Step 1: Write the failing test**

Create `lib/delivery/index.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "bun:test";
import { PUBLISHERS_REGISTERED, registerAllPublishers } from "./index";
import {
  lookupPublisher,
  allPublishers,
  resetPublishersForTest,
} from "../core/publishers";

// The registry is global and bun test shares one process: any earlier file that reset it
// would leave this one empty, because module caching means the root's side effect never runs
// twice. Resetting and re-registering here makes this file independent of test file order.
beforeEach(() => {
  resetPublishersForTest();
  registerAllPublishers();
});

describe("the delivery composition root", () => {
  it("should be load-bearing rather than a bare side-effect import", () => {
    expect(PUBLISHERS_REGISTERED).toBe(true);
  });

  it("should register the two publishers L1 ships", () => {
    expect(allPublishers().map((p) => p.id).sort()).toEqual([
      "embed-cloudflare",
      "zip",
    ]);
  });

  it("should expose the cloudflare adapter as a hosted publisher", () => {
    const p = lookupPublisher("embed-cloudflare");
    expect(p).toMatchObject({ kind: "hosted", implemented: true });
  });

  it("should refuse to deploy without credentials, before opening a socket", async () => {
    const p = lookupPublisher("embed-cloudflare")!;
    const r = await p.publish({
      artifactPath: import.meta.path,
      id: "e1",
      metadata: {
        title: "T",
        altText: "A",
        source: "S",
        credit: "C",
        lang: "en",
      },
      settings: { publisherId: "embed-cloudflare" },
      credentials: {},
      outDir: "/nonexistent",
    });
    expect(r).toMatchObject({ ok: false, code: "engine-failed" });
    expect((r as { message: string }).message).toContain("CLOUDFLARE_API_TOKEN");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/delivery/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Move the Cloudflare module**

```bash
git mv skills/splash/src/cloudflare-pages.ts lib/delivery/adapters/cloudflare-pages.ts
```

Then move `stageArtifact` and `servedMatcher` out of `skills/splash/scripts/deploy-embed.mjs` (lines 45-61) into `lib/delivery/adapters/cloudflare-pages.ts`, unchanged, adding the imports they need (`cpSync`, `mkdirSync`, `statSync`, `join`).

- [ ] **Step 4: Add the Publisher wrapper**

Append to `lib/delivery/adapters/cloudflare-pages.ts`:

```ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import type { Publisher, PublishOutcome, PublishRequest } from "../../core/publishers";
import { fail, ok, type VerbResult } from "../../core/verbs/types";
import { renderSnippet } from "../snippet";

// The Publisher face of an adapter that already existed and was MEASURED against the live API
// (docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md). Nothing about
// the protocol changes here — the wrapper only turns thrown errors into typed refusals (I1)
// and reads its credentials from the request instead of the environment (I5).
async function publishToPages(
  req: PublishRequest,
): Promise<VerbResult<PublishOutcome>> {
  let cfg;
  try {
    cfg = resolveEmbedConfig(req.credentials);
  } catch (e) {
    return fail("engine-failed", (e as Error).message);
  }

  const slug = embedSlug(req.id);
  let stageDir: string;
  try {
    stageDir = join(mkdtempSync(join(tmpdir(), "splash-embed-")), "site");
    stageArtifact(req.artifactPath, stageDir);
  } catch (e) {
    return fail(
      "engine-failed",
      `cloudflare: cannot stage ${req.artifactPath} for upload: ${(e as Error).message}`,
    );
  }

  try {
    await ensureProject(cfg);
    const { deploymentId } = await deployDirectory(stageDir, slug, cfg);
    const url = await resolveAliasUrl(deploymentId, cfg);
    // The delivery proof: a 200 is not evidence the right bytes landed. Without this check no
    // outcome is recorded at all.
    await verifyServed(
      url,
      servedMatcher(readFileSync(join(stageDir, "index.html"), "utf8")),
    );
    const snippet = renderSnippet({
      url,
      id: req.id,
      metadata: req.metadata,
      ...(req.settings.snippetTemplate
        ? { template: req.settings.snippetTemplate }
        : {}),
    });
    if (!snippet.ok) return snippet;
    return ok({
      publisherId: "embed-cloudflare",
      kind: "hosted",
      url,
      snippet: snippet.value,
      publishedAt: new Date().toISOString(),
    });
  } catch (e) {
    return fail(
      "engine-failed",
      `cloudflare pages deploy failed: ${(e as Error).message}`,
    );
  }
}

export const cloudflarePublisher: Publisher = {
  id: "embed-cloudflare",
  kind: "hosted",
  implemented: true,
  publish: publishToPages,
};
```

- [ ] **Step 5: Leave a re-export behind**

Replace the whole body of `skills/splash/src/cloudflare-pages.ts` with:

```ts
// Moved to lib/delivery/adapters/cloudflare-pages.ts (the Livraison sub-project, spec
// 2026-07-25 §3.3). This file re-exports so no importer changes — the same dependency-arrow
// inversion lib/core/vocabulary.ts and lib/newsroom/capabilities.ts performed before it.
export * from "../../../lib/delivery/adapters/cloudflare-pages";
```

In `skills/splash/scripts/deploy-embed.mjs`, replace the local definitions of `stageArtifact` and `servedMatcher` with a re-export from the module it already imports:

```js
export { stageArtifact, servedMatcher } from "../src/cloudflare-pages.ts";
```

and add both names to the existing import list at the top of the file so the `main()` body still resolves them.

- [ ] **Step 6: Write the composition root**

Create `lib/delivery/index.ts`:

```ts
// The delivery COMPOSITION ROOT — the one place adapters are registered, and the twin of
// lib/loop/engines.ts.
//
// The publish verb dispatches from a registry that nobody populates on its own: without this
// import every publish answers `unknown-publisher` for an adapter that exists. The value
// export below is what keeps the import load-bearing — a lone side-effect import is exactly
// the line a future "unused import" cleanup deletes, and the failure that causes is a runtime
// refusal, not a compile error.
import { registerPublisher } from "../core/publishers";
import { cloudflarePublisher } from "./adapters/cloudflare-pages";
import { zipPublisher } from "./adapters/zip";

// Exported as a function, not only as a module-level side effect: the registry is global to
// the module and `bun test` shares one process across files, so a test file that calls
// resetPublishersForTest() would otherwise leave every LATER file with an empty registry —
// module caching means the side effect never runs twice. A test resets, then calls this.
export function registerAllPublishers(): void {
  registerPublisher(cloudflarePublisher);
  registerPublisher(zipPublisher);
}

registerAllPublishers();

export const PUBLISHERS_REGISTERED = true;
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun test lib/delivery/ && bun test skills/splash/tests/cloudflare-pages.test.ts && bun test skills/splash/scripts/deploy-embed.test.ts`
Expected: PASS everywhere. **The two existing suites must pass UNCHANGED** — that is the net proving the hoist lost nothing. If either needs an edit beyond an import path, stop and report: the move changed behaviour.

- [ ] **Step 8: Commit**

```bash
git add lib/delivery skills/splash/src/cloudflare-pages.ts skills/splash/scripts/deploy-embed.mjs
git commit -m "refactor(delivery): hoist the cloudflare adapter behind the publisher interface"
```

---

### Task 7: The delivery slot in the run manifest

**Files:**
- Modify: `lib/loop/manifest.ts` (`RunElementSchema.delivery` at line 64-66 · `schemaVersion` at line 75 · `NextAction` at line ~92 · `nextActionsForElement` · `gateStateOf` at line ~197)
- Modify: `lib/loop/migrate.ts` (v2→v3)
- Modify: `lib/host/state.ts:56-65` (the read-only schema floor)
- Test: `lib/loop/manifest.test.ts`, `lib/loop/migrate.test.ts` (extend both)

**Interfaces:**
- Consumes: nothing new.
- Produces: `RunElement["delivery"]` typed as `{ requested: string[]; delivered: DeliveryRecord[] }` where `DeliveryRecord = { publisherId: string; kind: "hosted" | "package"; url?: string; artifact?: { path: string; sha256: string }; snippet: string; publishedAt: string; deliveredProvenanceHash: string }`; `NextAction` gains `"deliver"`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/loop/manifest.test.ts`:

```ts
describe("the delivery slot", () => {
  const base = (): RunManifest => ({
    runId: "r1",
    schemaVersion: 3,
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
        proposal: {
          options: [{ id: "o1", nativeType: "line", why: "w" }],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  });

  const produced = (): RunManifest => {
    const m = base();
    const el = m.elements[0]!;
    return {
      ...m,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "d",
            provenanceHash: provenanceHash(m, el),
            producedAt: "1980-01-01T00:00:00.000Z",
          },
        },
      ],
    };
  };

  it("should stay on show while the journalist has requested no destination", () => {
    expect(nextActions(produced())).toEqual(["show"]);
  });

  it("should ask for deliver once a destination has been requested", () => {
    const m = produced();
    const el = { ...m.elements[0]!, delivery: { requested: ["zip"], delivered: [] } };
    expect(nextActions({ ...m, elements: [el] })).toEqual(["deliver"]);
  });

  it("should report delivered when a record carries the current provenance", () => {
    const m = produced();
    const el = m.elements[0]!;
    const delivered = {
      ...el,
      delivery: {
        requested: ["zip"],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            artifact: { path: "out/e1.zip", sha256: "z" },
            snippet: "<iframe></iframe>",
            publishedAt: "1980-01-01T00:00:00.000Z",
            deliveredProvenanceHash: el.artifact!.provenanceHash,
          },
        ],
      },
    };
    const run = { ...m, elements: [delivered] };
    expect(gateStateOf(run, delivered)).toBe("delivered");
  });

  it("should fall back out of delivered when the angle changes after publication", () => {
    const m = produced();
    const el = m.elements[0]!;
    const delivered = {
      ...el,
      angle: { ...el.angle!, emphasis: "Genève" },
      delivery: {
        requested: ["zip"],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            snippet: "",
            publishedAt: "1980-01-01T00:00:00.000Z",
            deliveredProvenanceHash: el.artifact!.provenanceHash,
          },
        ],
      },
    };
    const run = { ...m, elements: [delivered] };
    expect(gateStateOf(run, delivered)).toBe("stale");
  });
});
```

Append to `lib/loop/migrate.test.ts`:

```ts
it("should drop the dormant v2 delivery slot rather than carry an unconvertible shape forward", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-mig-v3-"));
  const v2 = {
    runId: "r1",
    schemaVersion: 2,
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    elements: [
      {
        id: "e1",
        delivery: { requested: ["embed"], delivered: [{ path: "x", sha256: "y" }] },
      },
    ],
    events: [],
  };
  writeFileSync(join(dir, "input.csv"), "a\n1\n");
  const out = migrate(v2, dir);
  expect(out.schemaVersion).toBe(3);
  expect(out.elements[0]!.delivery).toBeUndefined();
  rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/loop/manifest.test.ts lib/loop/migrate.test.ts`
Expected: FAIL — the schema still declares `schemaVersion: 2` and the old `delivered: HashRef[]`.

- [ ] **Step 3: Change the schema**

In `lib/loop/manifest.ts`, replace the `delivery` block (lines 64-66):

```ts
  delivery: z
    .object({
      /** The publisher ids the JOURNALIST chose. Setting this is what makes `deliver` valid. */
      requested: z.array(z.string()),
      delivered: z.array(
        z.object({
          publisherId: z.string(),
          kind: z.enum(["hosted", "package"]),
          url: z.string().optional(),
          artifact: HashRef.optional(),
          snippet: z.string(),
          publishedAt: z.string(),
          // A delivery NEVER inherits across a provenance change — the same discipline
          // review and approved already follow. This is what makes "published, but no longer
          // what you are looking at" a state the manifest can express.
          deliveredProvenanceHash: z.string(),
        }),
      ),
    })
    .optional(),
```

Bump line 75 to `schemaVersion: z.literal(3)`, and add the exported record type next to the other inferred types:

```ts
export type DeliveryRecord = NonNullable<RunElement["delivery"]>["delivered"][number];
```

- [ ] **Step 4: Extend the derivations**

In `lib/loop/manifest.ts`, add `"deliver"` to `NextAction`:

```ts
export type NextAction =
  "orient" | "confirm-angle" | "propose" | "produce" | "choose-form" | "show" | "deliver";
```

In `nextActionsForElement`, replace the final `return ["show"]` with:

```ts
  // `deliver` is a step a DECISION triggers, never an automatic advance — the symmetric of
  // proposal.chosenId. A fresh artifact nobody asked to publish stays on show.
  if (el.delivery && needsDelivery(run, el)) return ["deliver"];
  return ["show"];
```

and add the helper below it:

```ts
function needsDelivery(run: RunManifest, el: RunElement): boolean {
  const current = provenanceHash(run, el);
  return el.delivery!.requested.some(
    (id) =>
      !el.delivery!.delivered.some(
        (d) => d.publisherId === id && d.deliveredProvenanceHash === current,
      ),
  );
}
```

In `gateStateOf`, replace the `delivered` branch:

```ts
  if (
    el.delivery &&
    provenance &&
    el.delivery.delivered.some((d) => d.deliveredProvenanceHash === provenance)
  )
    return "delivered";
```

- [ ] **Step 5: Write the migration**

In `lib/loop/migrate.ts`, change the dispatcher and add the v2→v3 step:

```ts
export function migrate(raw: unknown, runDir: string): RunManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("migrate: manifest is not an object");
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 3) return parseManifest(raw);
  if (obj.schemaVersion === 2) return parseManifest(migrateV2toV3(raw));
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(migrateV2toV3(migrateV1toV2(raw as V1Manifest, runDir)));
}

// v2's delivery slot was DORMANT: no live path ever wrote it, and its `delivered: HashRef[]`
// carries neither a publisher nor a provenance hash — there is nothing to convert honestly.
// Dropping it is written down here rather than left as a silent loss.
function migrateV2toV3(v2: unknown): unknown {
  const m = v2 as { elements?: Record<string, unknown>[] };
  return {
    ...(v2 as object),
    schemaVersion: 3,
    elements: (m.elements ?? []).map(({ delivery, ...rest }) => rest),
  };
}
```

Change the `migrateV1toV2` return literal from `schemaVersion: 2` to a plain object (it now feeds `migrateV2toV3`), and type it as `unknown` rather than `RunManifest` so it no longer has to satisfy the current schema.

- [ ] **Step 6: Move the read-only façade's floor**

In `lib/host/state.ts:56-65`, replace the two occurrences of `2` with `3` and update the message text to `not 3`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun test lib/loop/ lib/host/`
Expected: PASS. Existing fixtures that hard-code `schemaVersion: 2` must be updated to `3` — that is expected churn, not a behaviour change.

- [ ] **Step 8: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/migrate.ts lib/host/state.ts lib/loop/manifest.test.ts lib/loop/migrate.test.ts
git commit -m "feat(manifest): a real delivery slot, anchored on its own provenance hash"
```

---

### Task 8: The decor learns about zip and sizing

**Files:**
- Modify: `lib/newsroom/capabilities.ts` (add the `zip` entry to `NEWSROOM_CAPABILITIES`)
- Modify: `lib/newsroom/state.ts` (`NewsroomStateSchema` gains `delivery?`)
- Test: `lib/newsroom/capabilities.test.ts`, `lib/newsroom/state.test.ts` (extend both)

**Interfaces:**
- Consumes: `NewsroomCapability` (existing).
- Produces: `NEWSROOM_CAPABILITIES.zip` and `NewsroomState["delivery"]` typed as `{ snippetTemplate?: string; maxWidth?: number; height?: number | "responsive" } | undefined`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/newsroom/capabilities.test.ts`:

```ts
it("should declare zip as an implemented delivery capability that needs no key", () => {
  const zip = NEWSROOM_CAPABILITIES.zip!;
  expect(zip).toMatchObject({ kind: "delivery", implemented: true, env: [] });
  expect(deliveryCapabilities().map((c) => c.id)).toContain("zip");
});
```

Append to `lib/newsroom/state.test.ts`:

```ts
it("should round-trip the delivery preferences", () => {
  const dir = mkdtempSync(join(tmpdir(), "newsroom-delivery-"));
  writeNewsroomState(dir, {
    ...DEFAULT_NEWSROOM_STATE,
    delivery: { snippetTemplate: '<iframe src="{url}"></iframe>', maxWidth: 640 },
  });
  expect(readNewsroomState(dir).delivery).toEqual({
    snippetTemplate: '<iframe src="{url}"></iframe>',
    maxWidth: 640,
  });
  rmSync(dir, { recursive: true, force: true });
});

it("should keep reading a state file written before delivery preferences existed", () => {
  const dir = mkdtempSync(join(tmpdir(), "newsroom-delivery-old-"));
  writeFileSync(
    join(dir, NEWSROOM_STATE_FILE),
    JSON.stringify({ schemaVersion: 1, runtime: "claude", uiLang: "en", capabilities: {} }),
  );
  expect(readNewsroomState(dir).delivery).toBeUndefined();
  rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test lib/newsroom/`
Expected: FAIL — `NEWSROOM_CAPABILITIES.zip` is undefined and `delivery` is stripped on read.

- [ ] **Step 3: Add the zip capability**

In `lib/newsroom/capabilities.ts`, insert before the `embed-cms` entry:

```ts
  // The universal fallback: it publishes to disk, so it needs no key and is therefore ALWAYS
  // ready. That is what makes "no host configured" a working path rather than a dead end.
  zip: {
    id: "zip",
    label: "Download a portable package (works everywhere)",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: true,
  },
```

- [ ] **Step 4: Add the delivery preferences**

In `lib/newsroom/state.ts`, inside `NewsroomStateSchema`, after `publisher`:

```ts
  /**
   * The three transverse delivery preferences. Everything else a publisher needs is declared
   * BY that publisher through settingsFields — no generic field without a reader
   * (spec 2026-07-25 §3.6). Optional, so a state file written before they existed still reads.
   */
  delivery: z
    .object({
      snippetTemplate: z.string().optional(),
      maxWidth: z.number().optional(),
      height: z.union([z.number(), z.literal("responsive")]).optional(),
    })
    .optional(),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test lib/newsroom/`
Expected: PASS. `readiness.test.ts` may need the new capability added to a count assertion — update the count, never loosen the assertion.

- [ ] **Step 6: Commit**

```bash
git add lib/newsroom/capabilities.ts lib/newsroom/state.ts lib/newsroom/capabilities.test.ts lib/newsroom/state.test.ts
git commit -m "feat(newsroom): declare the zip publisher and the three delivery preferences"
```

---

### Task 9: The `deliver` loop step

**Files:**
- Create: `lib/loop/deliver.ts`
- Test: `lib/loop/deliver.test.ts`
- Modify: `lib/loop/driver.ts` (add the `deliver` branch to the `switch` in `advance`)

**Interfaces:**
- Consumes: `runVerb` (`lib/core/verbs`), `PUBLISHERS_REGISTERED` (Task 6), `deliveryMetadata` + `ProfileFacts` (Task 4), `stalenessOf` / `provenanceHash` / `DeliveryRecord` (Task 7), `Decor` (`lib/newsroom/decor.ts`), `decorEnv` (`lib/newsroom/decor.ts`), `NEWSROOM_CAPABILITIES` (`lib/newsroom/capabilities.ts`), `capabilityReadiness` (`lib/newsroom/readiness.ts`).
- Produces: `deliver(run: RunManifest, el: RunElement, runDir: string, decor: Decor, profile?: ProfileFacts): Promise<VerbResult<RunElement>>`.

- [ ] **Step 1: Write the failing test**

Create `lib/loop/deliver.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deliver } from "./deliver";
import { provenanceHash, type RunElement, type RunManifest } from "./manifest";
import { neutralDecor, type Decor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { registerAllPublishers } from "../delivery";
import { resetPublishersForTest } from "../core/publishers";

let runDir: string;

beforeEach(() => {
  // bun test shares one process, and lib/core/verbs/publish.test.ts resets the global
  // registry: re-register here so this file does not depend on test file order.
  resetPublishersForTest();
  registerAllPublishers();
  runDir = mkdtempSync(join(tmpdir(), "splash-deliver-"));
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "not-a-png");
});
afterEach(() => rmSync(runDir, { recursive: true, force: true }));

function decorWith(over: Partial<Decor> = {}): Decor {
  return {
    ...neutralDecor(),
    state: {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: { zip: { enabled: true } },
    },
    ...over,
  };
}

function runWith(el: Partial<RunElement>): { run: RunManifest; el: RunElement } {
  const base: RunManifest = {
    runId: "r1",
    schemaVersion: 3,
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
        proposal: { options: [{ id: "o1", nativeType: "line", why: "w" }], chosenId: "o1" },
      },
    ],
    events: [],
  };
  const partial = { ...base.elements[0]!, ...el };
  const full: RunElement = {
    ...partial,
    artifact: partial.artifact ?? {
      path: "elements/e1/static.png",
      sha256: "d",
      provenanceHash: provenanceHash(base, partial),
      producedAt: "1980-01-01T00:00:00.000Z",
    },
  };
  return { run: { ...base, elements: [full] }, el: full };
}

describe("deliver", () => {
  it("should record an outcome carrying the current provenance", async () => {
    const { run, el } = runWith({ delivery: { requested: ["zip"], delivered: [] } });
    const r = await deliver(run, el, runDir, decorWith());
    expect(r.ok).toBe(true);
    const rec = (r as { value: RunElement }).value.delivery!.delivered[0]!;
    expect(rec).toMatchObject({ publisherId: "zip", kind: "package" });
    expect(rec.deliveredProvenanceHash).toBe(provenanceHash(run, el));
  });

  it("should refuse to publish a stale artifact", async () => {
    const { run, el } = runWith({ delivery: { requested: ["zip"], delivered: [] } });
    const revised: RunElement = { ...el, angle: { ...el.angle!, emphasis: "Genève" } };
    const r = await deliver({ ...run, elements: [revised] }, revised, runDir, decorWith());
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("stale");
  });

  it("should refuse a destination whose capability is not ready, naming the variable never its value", async () => {
    const { run, el } = runWith({
      delivery: { requested: ["embed-cloudflare"], delivered: [] },
    });
    const decor = decorWith({
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: { "embed-cloudflare": { enabled: true } },
      },
    });
    const r = await deliver(run, el, runDir, decor, {}, { env: {} });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("CLOUDFLARE_API_TOKEN");
  });

  it("should refuse when the profile requires signers and the element carries no matching approval", async () => {
    const { run, el } = runWith({ delivery: { requested: ["zip"], delivered: [] } });
    const r = await deliver(run, el, runDir, decorWith(), {
      requiredSigners: ["yvan"],
    });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain("sign-off");
  });

  it("should keep every credential out of the recorded element", async () => {
    const { run, el } = runWith({ delivery: { requested: ["zip"], delivered: [] } });
    const r = await deliver(run, el, runDir, decorWith(), {}, {
      env: { CLOUDFLARE_API_TOKEN: "SECRET-TOKEN-VALUE" },
    });
    expect(r.ok).toBe(true);
    expect(JSON.stringify((r as { value: RunElement }).value)).not.toContain(
      "SECRET-TOKEN-VALUE",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/loop/deliver.test.ts`
Expected: FAIL — `Cannot find module './deliver'`.

- [ ] **Step 3: Write the implementation**

Create `lib/loop/deliver.ts`:

```ts
// The delivery step of the loop — and the ONLY module in the delivery path that touches the
// environment. The verb contract never reads ambient state (I5): resolving credentials is the
// CALLER's policy, exactly as resolving `channel` is.
//
// Every refusal below lands before the verb is called, so a refused delivery leaves nothing
// staged, nothing uploaded, and no record written.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, runVerb, type VerbResult } from "../core/verbs";
// Populates the publisher registry the publish verb dispatches from — without it every
// publish answers `unknown-publisher`. Same discipline as produce.ts importing ./engines.
import { PUBLISHERS_REGISTERED } from "../delivery";
import type { PublishOutcome } from "../core/publishers";
import { deliveryMetadata, type ProfileFacts } from "../delivery/metadata";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { decorEnv, type Decor } from "../newsroom/decor";
import { capabilityReadiness } from "../newsroom/readiness";
import {
  provenanceHash,
  stalenessOf,
  type DeliveryRecord,
  type RunElement,
  type RunManifest,
} from "./manifest";

export type DeliverOpts = {
  /** The environment credentials are read from. Defaults to the decor's. */
  env?: Record<string, string | undefined>;
};

export async function deliver(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  decor: Decor,
  profile: ProfileFacts & { requiredSigners?: string[] } = {},
  opts: DeliverOpts = {},
): Promise<VerbResult<RunElement>> {
  if (!PUBLISHERS_REGISTERED)
    return fail("engine-failed", "deliver: the publisher registry did not load");
  if (!el.artifact)
    return fail("invalid-request", "deliver: nothing produced to deliver yet");
  if (stalenessOf(run, el))
    return fail(
      "invalid-request",
      "deliver: the artifact is stale — produce it again before publishing",
    );
  const requested = el.delivery?.requested ?? [];
  if (requested.length === 0)
    return fail(
      "invalid-request",
      "deliver: no destination requested — the journalist chooses where it goes",
    );
  // Opt-in editorial gate (spec §2 decision 6). Without requiredSigners nothing is asked; with
  // them, the element's approval must match the artifact being published, never an older one.
  const current = provenanceHash(run, el);
  if ((profile.requiredSigners ?? []).length > 0) {
    if (!el.approved || el.approved.approvedProvenanceHash !== current)
      return fail(
        "invalid-request",
        `deliver: this newsroom requires an editorial sign-off (${profile.requiredSigners!.join(", ")}) for the exact artifact being published`,
      );
  }

  const env = opts.env ?? decorEnv(decor.root);
  const records: DeliveryRecord[] = [...(el.delivery?.delivered ?? [])];

  for (const publisherId of requested) {
    if (records.some((d) => d.publisherId === publisherId && d.deliveredProvenanceHash === current))
      continue;
    const cap = NEWSROOM_CAPABILITIES[publisherId];
    if (!cap)
      return fail(
        "invalid-request",
        `deliver: "${publisherId}" is not a delivery capability this install knows`,
      );
    const readiness = capabilityReadiness(cap, decor.state, { env });
    if (readiness.status !== "ready")
      return fail("invalid-request", `deliver: ${readiness.reason}`);

    const metadata = deliveryMetadata(el, profile, {
      ...(decor.state.delivery?.maxWidth !== undefined
        ? { width: decor.state.delivery.maxWidth }
        : {}),
      ...(decor.state.delivery?.height !== undefined
        ? { height: decor.state.delivery.height }
        : {}),
    });
    if (!metadata.ok) return metadata;

    // Credentials are collected HERE and handed to the contract explicitly. They are read from
    // the capability's own declared variables — never a blanket copy of the environment.
    const credentials: Record<string, string> = {};
    for (const group of cap.env)
      for (const name of group) {
        const v = env[name];
        if (v !== undefined) credentials[name] = v;
      }

    const result = await runVerb("publish", {
      artifactPath: join(runDir, el.artifact.path),
      id: el.id,
      metadata: metadata.value,
      settings: {
        publisherId,
        ...(decor.state.delivery?.snippetTemplate
          ? { snippetTemplate: decor.state.delivery.snippetTemplate }
          : {}),
      },
      credentials,
      outDir: join(runDir, "elements", el.id),
    });
    if (!result.ok) return result;

    const outcome = result.value as PublishOutcome;
    records.push({
      publisherId: outcome.publisherId,
      kind: outcome.kind,
      ...(outcome.url ? { url: outcome.url } : {}),
      ...(outcome.path ? { artifact: hashRef(outcome.path, runDir) } : {}),
      snippet: outcome.snippet,
      publishedAt: outcome.publishedAt,
      deliveredProvenanceHash: current,
    });
  }

  return ok({
    ...el,
    delivery: { requested, delivered: records },
  });
}

// A run dir must stay portable, so a delivered package is recorded run-dir-relative — the same
// rule produce.ts follows for the artifact it records.
function hashRef(path: string, runDir: string): { path: string; sha256: string } {
  return {
    path: relative(runDir, path),
    sha256: Buffer.from(sha256(readFileSync(path))).toString("hex"),
  };
}
```

- [ ] **Step 4: Wire the driver branch**

In `lib/loop/driver.ts`, add to the `switch` in `advance`, after the `produce` case:

```ts
    case "deliver": {
      if (!live) return run;
      const result = await deliver(run, live, runDir, decor);
      if (result.ok)
        return { ...run, elements: [result.value, ...run.elements.slice(1)] };
      return appendEvent(run, {
        at: new Date().toISOString(),
        kind: "failure",
        elementId: live.id,
        action: "deliver",
        message: result.message.slice(0, 200),
      });
    }
```

and add `import { deliver } from "./deliver";` to the imports.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test lib/loop/`
Expected: PASS — the 5 new tests plus every existing loop test.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/deliver.ts lib/loop/deliver.test.ts lib/loop/driver.ts
git commit -m "feat(loop): a deliver step that refuses before it publishes"
```

---

### Task 10: End-to-end proof

**Files:**
- Create: `lib/loop/acceptance-deliver.test.ts` (offline, in the gate)
- Create: `skills/splash/scripts/verify-embed-delivery.mjs` (live Cloudflare, opt-in, OUTSIDE the gate)

**Interfaces:**
- Consumes: everything above.
- Produces: no new exported API. The opt-in script is run by hand: `bun skills/splash/scripts/verify-embed-delivery.mjs`.

- [ ] **Step 1: Write the failing offline acceptance test**

Create `lib/loop/acceptance-deliver.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unzipSync } from "fflate";
import { advance } from "./driver";
import { gateStateOf, nextActions, type RunManifest } from "./manifest";
import { neutralDecor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { registerAllPublishers } from "../delivery";
import { resetPublishersForTest } from "../core/publishers";

let runDir: string;

beforeEach(() => {
  // Independent of test file order — see lib/loop/deliver.test.ts for why.
  resetPublishersForTest();
  registerAllPublishers();
  runDir = mkdtempSync(join(tmpdir(), "splash-e2e-deliver-"));
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "artifact-bytes");
});
afterEach(() => rmSync(runDir, { recursive: true, force: true }));

const decor = () => ({
  ...neutralDecor(),
  state: { ...DEFAULT_NEWSROOM_STATE, capabilities: { zip: { enabled: true } } },
});

describe("delivering a produced element, end to end and offline", () => {
  it("should publish to zip, then fall back out of delivered once the angle is revised", async () => {
    const produced: RunManifest = JSON.parse(
      readFileSync(join(import.meta.dir, "fixtures/produced-run.json"), "utf8"),
    );
    // The journalist chooses the destination — that decision is the caller's, not the driver's.
    let run: RunManifest = {
      ...produced,
      elements: [
        { ...produced.elements[0]!, delivery: { requested: ["zip"], delivered: [] } },
      ],
    };
    expect(nextActions(run)).toEqual(["deliver"]);

    run = await advance(run, runDir, decor());
    expect(gateStateOf(run, run.elements[0]!)).toBe("delivered");

    const rec = run.elements[0]!.delivery!.delivered[0]!;
    const archive = unzipSync(readFileSync(join(runDir, rec.artifact!.path)));
    expect(Object.keys(archive).sort()).toEqual([
      "EMBED.txt",
      "README.md",
      "index.html",
      "metadata.json",
    ]);

    // The revisitable beat: changing the emphasis must not leave the state claiming the
    // published package is current.
    const revised = {
      ...run,
      elements: [
        {
          ...run.elements[0]!,
          angle: { ...run.elements[0]!.angle!, emphasis: "Genève" },
        },
      ],
    };
    expect(gateStateOf(revised, revised.elements[0]!)).toBe("stale");
    expect(nextActions(revised)).toEqual(["produce"]);
  });
});
```

Create the fixture `lib/loop/fixtures/produced-run.json` holding a v3 manifest whose single element `e1` carries an `angle` (`confirmedTakeaway`, `altInsight`, `unit`), a `proposal` with `chosenId`, and an `artifact` at `elements/e1/static.png` whose `provenanceHash` matches — generate it once by calling `provenanceHash` in a scratch script and paste the value, so the fixture is a real manifest and not a hand-guessed hash.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test lib/loop/acceptance-deliver.test.ts`
Expected: FAIL — the fixture does not exist yet, then FAIL on the gate state until every prior task is in place.

- [ ] **Step 3: Make it pass**

Create the fixture as described. No production code should need changing — if it does, a prior task's implementation is incomplete; fix it there, not here.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test lib/loop/acceptance-deliver.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the live Cloudflare proof (opt-in, outside the gate)**

Create `skills/splash/scripts/verify-embed-delivery.mjs`:

```js
// LIVE proof of the embed delivery path — deliberately NOT in `bun run check`: it deploys to a
// real Cloudflare Pages project and a first deploy takes ~100s of edge provisioning. Same
// regime as verify-source-bundle.mjs. Run it by hand:
//   bun skills/splash/scripts/verify-embed-delivery.mjs
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lookupPublisher } from "../../../lib/core/publishers.ts";
import "../../../lib/delivery/index.ts";

const root = mkdtempSync(join(tmpdir(), "splash-embed-live-"));
const artifact = join(root, "interactive.html");
writeFileSync(
  artifact,
  `<html><body><h1>splash delivery proof ${process.pid}</h1></body></html>`,
);
mkdirSync(join(root, "out"), { recursive: true });

const publisher = lookupPublisher("embed-cloudflare");
const result = await publisher.publish({
  artifactPath: artifact,
  id: `delivery-proof-${process.pid}`,
  metadata: {
    title: "Delivery proof",
    altText: "A page proving the embed path delivers real bytes",
    source: "Splash",
    credit: "",
    lang: "en",
    width: 700,
    height: 420,
  },
  settings: { publisherId: "embed-cloudflare" },
  credentials: process.env,
  outDir: join(root, "out"),
});

if (!result.ok) {
  console.error(`FAILED (${result.code}): ${result.message}`);
  process.exit(1);
}
console.log(`DELIVERED ${result.value.url}`);
console.log(result.value.snippet);
```

- [ ] **Step 6: Run the live proof**

Run: `bun skills/splash/scripts/verify-embed-delivery.mjs`
Expected: `DELIVERED https://<slug>.<project>.pages.dev` plus the rendered snippet. The URL must actually serve the artifact — `verifyServed` already asserts that inside the adapter, so a printed URL IS the proof. If credentials are absent the script exits 1 naming the missing variable; record that outcome honestly rather than reporting the task green.

- [ ] **Step 7: Run the full gate**

Run: `bun run check`
Expected: every check passes. Report the exact count.

- [ ] **Step 8: Commit**

```bash
git add lib/loop/acceptance-deliver.test.ts lib/loop/fixtures/produced-run.json skills/splash/scripts/verify-embed-delivery.mjs
git commit -m "test(delivery): offline end-to-end acceptance plus an opt-in live embed proof"
```

---

## Self-Review

**Spec coverage (§4.2 DANS, item by item):**

| Spec item | Task |
|---|---|
| `lib/core/publishers.ts` | 1 |
| `lib/core/verbs/publish.ts` + the 2 error codes | 2 (`unknown-publisher` added; `not-implemented` reused as the spec §3.2 states) |
| `lib/delivery/` — cloudflare hoist, zip, snippet, metadata, composition root | 3, 4, 5, 6 |
| Real `delivery` slot + migration 2→3 + `deliver` in `NextAction`/`gateStateOf` | 7 |
| `lib/loop/deliver.ts` | 9 |
| `zip` in the decor's capabilities + the 3 `newsroom.json` fields | 8 |
| §4.4 test list — net, registry, verb, zip, snippet, metadata, manifest, deliver refusals, secret invariant, live e2e, offline e2e | 1-10 (each task's own test block; the 4 refusals and the secret invariant are Task 9; both e2e are Task 10) |
| §4.5 success criterion 6 — an adapter is one file + one registry line | Demonstrated by Task 5 (zip is exactly that) and asserted structurally by Task 6's composition root |

**Not covered here, by design:** S3 (L2), We.Publish and Fly (L3), the legacy `export-code.mjs` menu (spec §2 decision 1), the agent-side destination prompt (spec §4.2 HORS — prose in `SKILL.md`, not code).

**Type consistency check:** `PublishRequest` / `PublishOutcome` / `DeliveryMetadata` / `Publisher` are defined once in Task 1 and used verbatim in Tasks 2, 3, 4, 5, 6, 9. `renderSnippet` (Task 3) is consumed by Tasks 5 and 6 with the same `SnippetInput` shape. `deliveryMetadata(el, profile, sizing)` (Task 4) is called with exactly that arity in Task 9. `DeliveryRecord` (Task 7) is the element type Task 9 pushes. `publisherId` travels in `settings.publisherId` in Tasks 2, 5, 6, 9 alike.

**One live-code dependency worth flagging to the implementer:** Task 7 bumps the manifest schema to 3, and `lib/host/state.ts` hard-codes the accepted version. Any fixture or test in `lib/loop/` and `lib/host/` that writes `schemaVersion: 2` must move to 3 in the same commit, or the host façade will answer `stale-schema` for runs the loop just wrote.

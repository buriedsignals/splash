# Proposal Brain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `propose` beat from 60 lines of hard-coded rules into a brain that offers 2-3 ranked forms with a grounded why, plus what it discarded and why, over every type a registered engine can render.

**Architecture:** A new pure `lib/brain/` computes a LEGAL SET from measurable facts (data shape × channel × capability × physical style limits) and RANKS it by FT intent — legality is deterministic and tested, ranking is a soft heuristic that can never change the legal set. The typology's machine facets live in the frontmatter of the KB sheets that already hold the prose; the type catalogue comes from the producer registry, so a deferred type is structurally unofferable. The model only phrases the offer, behind a `verifyOffer` guard.

**Tech Stack:** Bun · TypeScript · `bun:test` · zod 4.4.3 (already a dep) · no new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-25-proposal-brain-design.md`

## Global Constraints

- Runtime **Bun**. Tests `bun:test` (`describe`/`it`/`expect`). **TDD**: a failing test before the implementation, every task.
- Code, comments, identifiers, file names, commits, branches: **English**. (Prose docs may be French; code may not.)
- **No vendor mention** (Claude/Anthropic) in any committed artifact. No `Co-Authored-By` trailer.
- **No new `any`.** No new dependency — the frontmatter parser is hand-written on a flat subset.
- `lib/brain/` and `lib/loop/` must not import from `skills/*/src/` — the type catalogue arrives through `lib/core/registry`, exactly as rendering arrives through the verb. The one existing exception stays: `lib/loop/engines.ts` (the composition root).
- `bun run check` green before every commit.
- Branch `feat/proposal-brain`, worktree `/Users/rmdms/Sites/Professional/splash-brain`, off `feat/delivery-s3`.
- Baseline before starting: `bun test lib` = 490 pass / 0 fail (1 skip = the opt-in live S3 proof).

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `lib/core/channel-policy.ts` | The channel → {aspect, size, allowed formats} POLICY table, hoisted out of `skills/` so the brain can read it |
| `lib/brain/intents.ts` | The closed FT intent vocabulary. A constant and two predicates |
| `lib/brain/frontmatter.ts` | Minimal flat-YAML frontmatter reader. Fail-hard outside its subset |
| `lib/brain/typology.ts` | Load + zod-validate the KB sheets into `TypeSheet[]`; join to the registry |
| `lib/brain/facts.ts` | Derive measurable facts from a `DataProfile` (series, points, rows) |
| `lib/brain/eligibility.ts` | The legal set + every exclusion with its reason |
| `lib/brain/rank.ts` | Soft ordering of the legal set |
| `lib/brain/offer.ts` | Assemble the offer: top-3 + excluded + grounded fragments |
| `lib/brain/verify-offer.ts` | The mechanical guard on what the model phrased |

**Modified**

| File | Change |
|---|---|
| `lib/core/registry.ts` | `ProducerManifest.types` + `engineTypes()` + `isRenderable()` |
| `skills/{chart-native,map-native,dw-chart,map-dw,image-native,scrolly}/src/manifest.ts` | Declare `types` from each engine's canonical catalogue |
| `skills/map-dw/src/map-spec.ts` | Extract the inline `mapType` union into a canonical `MAP_DW_TYPES` |
| `skills/splash/src/channel.ts` | Re-export the hoisted policy (no behaviour change, ~46 importers untouched) |
| `knowledge/references/chart/types/*.md` (38) · `map/types/*.md` (7) | Add the frontmatter header |
| `knowledge/references/image/types/image-scrolly.md` | New sheet (the one reachable type with no sheet) |
| `lib/loop/manifest.ts` | `FormOption` extension · `proposal.excluded` · `route` · `channel` · schemaVersion 4 |
| `lib/loop/migrate.ts` | v3 → v4 |
| `lib/loop/propose.ts` | Becomes a thin caller of `lib/brain` |
| `lib/loop/produce.ts` | Read `run.channel` instead of `STUBBED_CHANNEL` |
| `skills/suggest-chart/SKILL.md` | Strip the selection logic that the typology now owns |

---

### Task 1: Hoist the channel policy into `lib/core`

The brain needs the SCOPE axis (which formats a channel allows). That table lives in `skills/splash/src/channel.ts`, which `lib/brain/` may not import. The `Channel`/`VisualFormat` *types* are already in `lib/core/vocabulary.ts`; only the *policy* is stranded. Note `vocabulary.ts` already exports a `CHANNELS` const (the key array) — the policy table therefore gets a distinct name, `CHANNEL_POLICY`, and `skills/splash/src/channel.ts` keeps exporting its own `CHANNELS` alias so its ~46 importers are untouched.

**Files:**
- Create: `lib/core/channel-policy.ts`, `lib/core/channel-policy.test.ts`
- Modify: `skills/splash/src/channel.ts:10-82` (the type/table/predicate block becomes a re-export)

**Interfaces:**
- Consumes: `Channel`, `VisualFormat` from `lib/core/vocabulary`
- Produces: `CHANNEL_POLICY: Record<Channel, ChannelEntry>` · `allowedFormats(c: Channel): VisualFormat[]` · `isFormatAllowed(c: Channel, f: VisualFormat): boolean` · `assertFormatAllowed(c: Channel, f: VisualFormat): void` · types `ChannelAspect`, `ChannelSize`, `ChannelEntry`

- [ ] **Step 1: Write the failing test**

```ts
// lib/core/channel-policy.test.ts
import { test, expect } from "bun:test";
import {
  CHANNEL_POLICY,
  allowedFormats,
  isFormatAllowed,
} from "./channel-policy";

test("article-web is the only channel that allows an interactive", () => {
  expect(isFormatAllowed("article-web", "interactive")).toBe(true);
  expect(isFormatAllowed("social-vertical", "interactive")).toBe(false);
  expect(isFormatAllowed("social-feed", "interactive")).toBe(false);
});

test("every channel allows static and video", () => {
  for (const c of ["social-vertical", "social-feed", "article-web"] as const) {
    expect(allowedFormats(c)).toContain("static");
    expect(allowedFormats(c)).toContain("video");
  }
});

test("the policy carries a media size for every channel", () => {
  expect(CHANNEL_POLICY["social-vertical"].mediaSize).toEqual({
    width: 1080,
    height: 1920,
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-brain && bun test lib/core/channel-policy.test.ts`
Expected: FAIL — `Cannot find module './channel-policy'`

- [ ] **Step 3: Create the policy module**

Move — do not retype — the block currently at `skills/splash/src/channel.ts:10-82` (`ChannelAspect`, `ChannelSize`, `ChannelEntry`, the `CHANNELS` table, `ALL_CHANNELS`, `allowedFormats`, `isFormatAllowed`, `assertFormatAllowed`) into the new file, renaming the table to `CHANNEL_POLICY`:

```ts
// lib/core/channel-policy.ts
// The channel POLICY: what each distribution channel allows and at what size. The
// vocabulary (the channel KEYS) lives in vocabulary.ts; this is the policy hung off them.
// It sits in lib/core rather than skills/splash because the proposal brain needs the SCOPE
// axis and lib/ must not reach into skills/ (spec §4.1). skills/splash/src/channel.ts
// re-exports every symbol below under its historical names, so its importers are untouched.
import type { Channel, VisualFormat } from "./vocabulary";

export type ChannelAspect = "portrait" | "square" | "landscape" | "responsive";

export interface ChannelSize {
  width: number;
  height: number;
}

export interface ChannelEntry {
  aspect: ChannelAspect;
  mediaSize: ChannelSize;
  allowedFormats: VisualFormat[];
  interactiveDefault: boolean;
  interactiveAspect: ChannelAspect;
}

export const CHANNEL_POLICY: Record<Channel, ChannelEntry> = {
  "social-vertical": {
    aspect: "portrait",
    mediaSize: { width: 1080, height: 1920 },
    allowedFormats: ["static", "video"],
    interactiveDefault: false,
    interactiveAspect: "responsive",
  },
  "social-feed": {
    aspect: "square",
    mediaSize: { width: 1080, height: 1080 },
    allowedFormats: ["static", "video"],
    interactiveDefault: false,
    interactiveAspect: "responsive",
  },
  "article-web": {
    aspect: "landscape",
    mediaSize: { width: 1200, height: 675 },
    allowedFormats: ["static", "interactive", "video", "scrolly"],
    interactiveDefault: true,
    interactiveAspect: "responsive",
  },
};

export const ALL_CHANNELS: Channel[] = [
  "social-vertical",
  "social-feed",
  "article-web",
];

export function allowedFormats(channel: Channel): VisualFormat[] {
  return CHANNEL_POLICY[channel].allowedFormats;
}

export function isFormatAllowed(
  channel: Channel,
  format: VisualFormat,
): boolean {
  return CHANNEL_POLICY[channel].allowedFormats.includes(format);
}

export function assertFormatAllowed(
  channel: Channel,
  format: VisualFormat,
): void {
  if (!isFormatAllowed(channel, format))
    throw new Error(
      `format "${format}" not allowed for channel "${channel}" (allowed: ${allowedFormats(channel).join(", ")})`,
    );
}
```

- [ ] **Step 4: Re-export from the skill so nothing downstream changes**

In `skills/splash/src/channel.ts`, delete the moved block and put in its place:

```ts
import {
  CHANNEL_POLICY,
  type ChannelEntry,
} from "../../../lib/core/channel-policy";

export {
  ALL_CHANNELS,
  allowedFormats,
  isFormatAllowed,
  assertFormatAllowed,
} from "../../../lib/core/channel-policy";
export type {
  ChannelAspect,
  ChannelSize,
  ChannelEntry,
} from "../../../lib/core/channel-policy";

// Historical name kept for this file's ~46 importers: the table is CHANNEL_POLICY upstream.
export const CHANNELS: Record<Channel, ChannelEntry> = CHANNEL_POLICY;
```

Keep the render-size accessors (`mediaSize`, `channelAspect`, `renderSize`, `assertRenderedSize`) where they are — they are producer-facing and no `lib/` caller needs them. They now read `CHANNELS`, which is the same object.

- [ ] **Step 5: Run the new test and the whole downstream suite**

Run: `bun test lib/core/channel-policy.test.ts && bun test skills/splash && bunx tsc --noEmit -p skills/splash`
Expected: new test PASS · `skills/splash` 766/0 · tsc clean

- [ ] **Step 6: Commit**

```bash
git add lib/core/channel-policy.ts lib/core/channel-policy.test.ts skills/splash/src/channel.ts
git commit -m "refactor(core): the channel policy moves where both the loop and the skill can read it"
```

---

### Task 2: The engine type catalogues reach the registry

Today the registry knows a producer's name, formats and validator — not which TYPES it can render. Those catalogues exist per engine (`NATIVE_TYPES`, `MAP_TYPES`, `CHART_TYPES`, and map-dw's inline union). Declaring them on the manifest is what makes "a deferred type cannot be offered" structural instead of vigilant.

**Files:**
- Modify: `lib/core/registry.ts` · `skills/chart-native/src/manifest.ts` · `skills/map-native/src/manifest.ts` · `skills/dw-chart/src/manifest.ts` · `skills/map-dw/src/manifest.ts` · `skills/map-dw/src/map-spec.ts:352-362` · `skills/image-native/src/manifest.ts` · `skills/scrolly/src/manifest.ts`
- Test: `lib/core/registry-types.test.ts`

**Interfaces:**
- Consumes: `registerProducer` (Task 0 — existing)
- Produces: `type EngineType = { id: string; deferred?: string }` · `ProducerManifest.types?: readonly EngineType[]` · `engineTypes(name: string): readonly EngineType[]` · `isRenderable(engine: string, typeId: string): boolean` (false for an unknown engine, an unknown type, **and a deferred one**)

- [ ] **Step 1: Write the failing test**

```ts
// lib/core/registry-types.test.ts
import { test, expect } from "bun:test";
import { engineTypes, isRenderable } from "./registry";
import "../loop/engines"; // populates the registry

test("chart-native declares its canonical catalogue, deferred types included", () => {
  const ids = engineTypes("chart-native").map((t) => t.id);
  expect(ids).toContain("slope");
  expect(ids).toContain("sankey"); // declared…
  expect(isRenderable("chart-native", "sankey")).toBe(false); // …but deferred
  expect(isRenderable("chart-native", "slope")).toBe(true);
});

test("a deferred type carries the reason it is deferred", () => {
  const sankey = engineTypes("chart-native").find((t) => t.id === "sankey");
  expect(sankey?.deferred).toBeTruthy();
});

test("every registered engine that renders types declares them", () => {
  for (const name of ["chart-native", "map-native", "dw-chart", "map-dw"])
    expect(engineTypes(name).length).toBeGreaterThan(0);
});

test("an unknown engine or type is simply not renderable", () => {
  expect(isRenderable("nope", "slope")).toBe(false);
  expect(isRenderable("chart-native", "nope")).toBe(false);
});

test("dw-chart uses ITS OWN render keys, which differ from the KB ids", () => {
  const ids = engineTypes("dw-chart").map((t) => t.id);
  expect(ids).toContain("d3-lines");
  expect(ids).not.toContain("line");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/core/registry-types.test.ts`
Expected: FAIL — `engineTypes is not a function`

- [ ] **Step 3: Extend the registry**

In `lib/core/registry.ts`, add above `ProducerManifest`:

```ts
// One renderable type of an engine, in the engine's OWN render-key vocabulary (chart-native
// says "slope", dw-chart says "d3-range-plot" for the same KB sheet). `deferred` carries the
// reason a type is declared but not reachable — declaring it is what lets the proposal brain
// say "not offered, and here is why" instead of pretending the type does not exist.
export type EngineType = { id: string; deferred?: string };
```

Add the field to the interface (optional — `scrolly` is a mechanism, not a type owner):

```ts
  /** What this engine can render. Absent/empty ⇒ the engine owns no type of its own. */
  types?: readonly EngineType[];
```

Add the two accessors at the bottom:

```ts
export function engineTypes(name: string): readonly EngineType[] {
  return REGISTRY.get(name)?.types ?? [];
}

// Renderable = declared by that engine AND not deferred. Both halves matter: an undeclared
// type has no mapper, a deferred one has no guard.
export function isRenderable(engine: string, typeId: string): boolean {
  const t = engineTypes(engine).find((e) => e.id === typeId);
  return t != null && t.deferred == null;
}
```

- [ ] **Step 4: Declare the catalogue in each engine manifest**

`skills/chart-native/src/manifest.ts` — add the import and the field inside `registerProducer({...})`:

```ts
import { NATIVE_TYPES } from "./native-types";
// …
  types: NATIVE_TYPES.map((t) => ({
    id: t.id,
    ...(t.deferred ? { deferred: t.deferred } : {}),
  })),
```

`skills/map-native/src/manifest.ts`:

```ts
import { MAP_TYPES } from "./map-types";
// …
  types: MAP_TYPES.map((id) => ({ id })),
```

`skills/dw-chart/src/manifest.ts`:

```ts
import { CHART_TYPES } from "./chart-spec";
// …
  types: CHART_TYPES.map((id) => ({ id })),
```

`skills/image-native/src/manifest.ts`:

```ts
  types: [{ id: "image-scrolly" }],
```

`skills/scrolly/src/manifest.ts` — add the comment, no field:

```ts
  // No `types`: scrolly is the shared MECHANISM, not a type owner — the scrolly sub-format
  // belongs to the host engine and inherits its furniture (see CLAUDE.md, engine taxonomy).
```

- [ ] **Step 5: Give map-dw a canonical catalogue**

`map-dw` has no const list — its three types are compared inline. Extract them, then have the validator read the list, so the catalogue has one home:

```ts
// skills/map-dw/src/map-spec.ts — near the top, beside the spec types
export const MAP_DW_TYPES = ["choropleth", "symbol", "locator"] as const;
export type MapDwType = (typeof MAP_DW_TYPES)[number];
```

Replace the inline triple comparison at `map-spec.ts:352-362` with:

```ts
  if (!(MAP_DW_TYPES as readonly string[]).includes(s.mapType as string))
    return {
      ok: false,
      errors: ['mapType must be "choropleth", "symbol", or "locator"'],
    };
```

Keep the error string byte-identical — it is asserted by existing map-dw tests. Then in `skills/map-dw/src/manifest.ts`:

```ts
import { MAP_DW_TYPES } from "./map-spec";
// …
  types: MAP_DW_TYPES.map((id) => ({ id })),
```

- [ ] **Step 6: Run the tests**

Run: `bun test lib/core/registry-types.test.ts && bun test skills/map-dw && bun test skills/chart-native/tests/native-types.test.ts`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add lib/core/registry.ts lib/core/registry-types.test.ts skills/*/src/manifest.ts skills/map-dw/src/map-spec.ts
git commit -m "feat(core): the registry that renders a type is the registry that lists it"
```

---

### Task 3: The intent vocabulary and the frontmatter reader

Two small, independent primitives the loader needs. The parser deliberately accepts only what the sheets use — a flat subset — and throws on anything else, because a guessed frontmatter would silently impoverish the offer.

**Files:**
- Create: `lib/brain/intents.ts`, `lib/brain/intents.test.ts`, `lib/brain/frontmatter.ts`, `lib/brain/frontmatter.test.ts`

**Interfaces:**
- Produces: `INTENTS: readonly Intent[]` · `type Intent` · `isIntent(v: unknown): v is Intent` · `splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string }` (throws on a missing or malformed header)

- [ ] **Step 1: Write the failing tests**

```ts
// lib/brain/intents.test.ts
import { test, expect } from "bun:test";
import { INTENTS, isIntent } from "./intents";

test("the vocabulary is the nine FT Visual Vocabulary categories", () => {
  expect(INTENTS.length).toBe(9);
  expect(INTENTS).toContain("change-over-time");
  expect(INTENTS).toContain("part-to-whole");
  expect(INTENTS).toContain("spatial");
});
test("anything outside the canon is not an intent", () => {
  expect(isIntent("ranking")).toBe(true);
  expect(isIntent("pretty")).toBe(false);
  expect(isIntent(3)).toBe(false);
});
```

```ts
// lib/brain/frontmatter.test.ts
import { test, expect } from "bun:test";
import { splitFrontmatter } from "./frontmatter";

const SHEET = `---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
  - "a rank change between two periods"
notFor:
  - "more than two points in time — that is a line"
---

# Slope chart

Body prose.
`;

test("it reads scalars, inline lists, dash lists, inline maps and nested maps", () => {
  const { data } = splitFrontmatter(SHEET);
  expect(data.id).toBe("slope");
  expect(data.engines).toEqual({ "chart-native": "slope" });
  expect(data.intent).toEqual(["change-over-time", "ranking"]);
  expect(data.limits).toEqual({ points: 2, maxSeries: 12 });
  expect((data.bestFor as string[])[0]).toBe(
    "a before/after across a handful of categories",
  );
});

test("the body survives untouched", () => {
  expect(splitFrontmatter(SHEET).body.trim().startsWith("# Slope chart")).toBe(
    true,
  );
});

test("a sheet with no header is a hard error, never an empty facet set", () => {
  expect(() => splitFrontmatter("# Just prose\n")).toThrow(/frontmatter/);
});

test("a construct outside the supported subset throws rather than being guessed", () => {
  expect(() =>
    splitFrontmatter("---\nnested:\n  - a: 1\n    b: 2\n---\nbody\n"),
  ).toThrow(/unsupported/);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/brain/`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement both**

```ts
// lib/brain/intents.ts
// The CLOSED intent vocabulary: the nine categories of the FT Visual Vocabulary, the canon
// the KB sheets already cite in their own source headers. Closed on purpose — an intent
// outside this list would be a fact nobody can rank against.
export const INTENTS = [
  "deviation",
  "correlation",
  "ranking",
  "distribution",
  "change-over-time",
  "magnitude",
  "part-to-whole",
  "spatial",
  "flow",
] as const;

export type Intent = (typeof INTENTS)[number];

export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v);
}
```

```ts
// lib/brain/frontmatter.ts
// A frontmatter reader for the FLAT subset the KB sheets use: scalars, inline lists
// [a, b], dash lists, inline maps { a: 1 }, and one level of nested `key:` → `sub: value`.
// It THROWS on anything else instead of guessing. The project has no YAML dependency and
// adding one to read five shapes would be the wrong trade; more importantly, a parser that
// silently ignored a construct would silently drop a facet, and a dropped facet is a form
// the journalist never gets offered (spec §10).
export type Frontmatter = { data: Record<string, unknown>; body: string };

export function splitFrontmatter(raw: string): Frontmatter {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) throw new Error("frontmatter: sheet has no --- header block");
  return { data: parseBlock(m[1]), body: raw.slice(m[0].length) };
}

function parseBlock(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);
  let key: string | null = null;
  let list: string[] | null = null;
  let map: Record<string, unknown> | null = null;

  const flush = () => {
    if (key == null) return;
    if (list) out[key] = list;
    else if (map) out[key] = map;
    key = null;
    list = null;
    map = null;
  };

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indented = /^\s/.test(line);
    const t = line.trim();

    if (indented && t.startsWith("- ")) {
      if (!key) throw new Error(`frontmatter: list item outside a key: ${t}`);
      (list ??= []).push(scalar(t.slice(2)) as string);
      continue;
    }
    if (indented) {
      const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t);
      if (!kv || kv[2] === "")
        throw new Error(`frontmatter: unsupported construct: ${t}`);
      if (!key) throw new Error(`frontmatter: nested value outside a key: ${t}`);
      (map ??= {})[kv[1]] = scalar(kv[2]);
      continue;
    }

    flush();
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(t);
    if (!kv) throw new Error(`frontmatter: unsupported construct: ${t}`);
    if (kv[2] === "") key = kv[1];
    else out[kv[1]] = value(kv[2]);
  }
  flush();
  return out;
}

function value(v: string): unknown {
  const s = v.trim();
  if (s.startsWith("[") && s.endsWith("]"))
    return splitTop(s.slice(1, -1)).map(scalar);
  if (s.startsWith("{") && s.endsWith("}")) {
    const out: Record<string, unknown> = {};
    for (const pair of splitTop(s.slice(1, -1))) {
      const kv = /^([A-Za-z0-9_-]+):\s*(.+)$/.exec(pair.trim());
      if (!kv) throw new Error(`frontmatter: unsupported map entry: ${pair}`);
      out[kv[1]] = scalar(kv[2]);
    }
    return out;
  }
  return scalar(s);
}

// Commas inside quotes are content, not separators.
function splitTop(s: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      buf += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === ",") {
      parts.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim() !== "") parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

function scalar(v: string): string | number | boolean {
  const s = v.trim().replace(/^["'](.*)["']$/s, "$1");
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === "true") return true;
  if (s === "false") return false;
  return s;
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/brain/intents.ts lib/brain/intents.test.ts lib/brain/frontmatter.ts lib/brain/frontmatter.test.ts
git commit -m "feat(brain): the closed intent vocabulary and a frontmatter reader that refuses to guess"
```

---

### Task 4: The typology loader

Reads the KB sheets, validates each header with zod, and returns `TypeSheet[]`. Tested against a FIXTURE directory — the real sheets have no frontmatter until Tasks 5-8, and the drift tests against the real KB are Task 9.

**Files:**
- Create: `lib/brain/typology.ts`, `lib/brain/typology.test.ts`

**Interfaces:**
- Consumes: `splitFrontmatter`, `INTENTS`/`isIntent`, `VISUAL_FORMATS`
- Produces:

```ts
type TypeSheet = {
  id: string;
  sheetPath: string;           // repo-relative, for whySource
  engines: Record<string, string>;   // engine name → that engine's render key
  intent: Intent[];
  shape: string;
  limits: Record<string, number>;
  formats: VisualFormat[];
  bestFor: string[];
  notFor: string[];
  body: string;
};
loadTypology(root?: string): TypeSheet[]   // default root = the repo's knowledge/references
```

- [ ] **Step 1: Write the failing test**

```ts
// lib/brain/typology.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTypology } from "./typology";

function fixture(sheets: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "brain-kb-"));
  mkdirSync(join(root, "chart", "types"), { recursive: true });
  for (const [name, content] of Object.entries(sheets))
    writeFileSync(join(root, "chart", "types", name), content);
  return root;
}

const SLOPE = `---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
notFor:
  - "more than two points in time — that is a line"
---

Body.
`;

test("it loads a sheet into typed facets and keeps the body for grounding", () => {
  const [sheet] = loadTypology(fixture({ "slope.md": SLOPE }));
  expect(sheet.id).toBe("slope");
  expect(sheet.engines["chart-native"]).toBe("slope");
  expect(sheet.intent).toEqual(["change-over-time", "ranking"]);
  expect(sheet.limits.maxSeries).toBe(12);
  expect(sheet.body).toContain("Body.");
  expect(sheet.sheetPath.endsWith("chart/types/slope.md")).toBe(true);
});

test("an intent outside the closed vocabulary is a hard error", () => {
  const bad = SLOPE.replace("[change-over-time, ranking]", "[pretty]");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/intent/);
});

test("an unknown format is a hard error", () => {
  const bad = SLOPE.replace("[static, interactive, video]", "[hologram]");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/format/i);
});

test("a sheet whose id disagrees with its filename is a hard error", () => {
  const bad = SLOPE.replace("id: slope", "id: dumbbell");
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow(/filename/);
});

test("a sheet with no bestFor is a hard error — an option with no why is not offerable", () => {
  const bad = SLOPE.replace(
    'bestFor:\n  - "a before/after across a handful of categories"\n',
    "",
  );
  expect(() => loadTypology(fixture({ "slope.md": bad }))).toThrow();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology.test.ts`
Expected: FAIL — `Cannot find module './typology'`

- [ ] **Step 3: Implement the loader**

```ts
// lib/brain/typology.ts
// The typology: the KB sheets, read as data. One sheet per type, ONE file — the machine
// facets in the header, the prose the header points at in the body. There is no second
// registry to drift from (spec §5).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { INTENTS } from "./intents";
import { splitFrontmatter } from "./frontmatter";
import { VISUAL_FORMATS } from "../core/vocabulary";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(here, "../../knowledge/references");
// The families of sheets, in load order. A family with no directory is skipped, so a KB
// that does not ship maps still loads.
const FAMILIES = ["chart/types", "map/types", "image/types"];

const HeaderSchema = z.object({
  id: z.string().min(1),
  engines: z.record(z.string(), z.string()).refine((e) => Object.keys(e).length > 0, {
    message: "engines: a sheet must name at least one engine",
  }),
  intent: z.array(z.enum(INTENTS)).min(1),
  shape: z.string().min(1),
  limits: z.record(z.string(), z.number()).default({}),
  formats: z.array(z.enum(VISUAL_FORMATS)).min(1),
  bestFor: z.array(z.string().min(1)).min(1),
  notFor: z.array(z.string().min(1)).min(1),
});

export type TypeSheet = z.infer<typeof HeaderSchema> & {
  sheetPath: string;
  body: string;
};

export function loadTypology(root: string = DEFAULT_ROOT): TypeSheet[] {
  const sheets: TypeSheet[] = [];
  for (const family of FAMILIES) {
    const dir = join(root, family);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const path = join(dir, file);
      const { data, body } = splitFrontmatter(readFileSync(path, "utf8"));
      const parsed = HeaderSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(
          `typology: ${relative(root, path)} — ${parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      if (parsed.data.id !== file.replace(/\.md$/, ""))
        throw new Error(
          `typology: ${relative(root, path)} — id "${parsed.data.id}" disagrees with its filename`,
        );
      sheets.push({
        ...parsed.data,
        sheetPath: join(family, file),
        body,
      });
    }
  }
  return sheets;
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/typology.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/brain/typology.ts lib/brain/typology.test.ts
git commit -m "feat(brain): load the knowledge sheets as typed facets, refusing a half-valid one"
```

---

### Tasks 5-8: Authoring the frontmatter

These four tasks are **authoring**, not coding: they add a header to sheets whose prose already holds every answer. The derivation is mechanical, and the same for all four:

| Facet | Where it comes from — no invention |
|---|---|
| `id` | the filename without `.md` |
| `engines` | the render key of each engine that can produce it: chart-native → `NATIVE_TYPES` id · dw-chart → the `CHART_TYPES` id · map-native → `MAP_TYPES` id · map-dw → `MAP_DW_TYPES` id. **Omit an engine that cannot render it.** A sheet whose type is `deferred` everywhere still gets a header — it is declared and legitimately never offered |
| `intent` | the FT categories the sheet's own `> Sources:` header quotes (slope.md: `"change over time" / "ranking"` → `[change-over-time, ranking]`). If the header quotes none, take the intent from `knowledge/references/chart-selection.md`'s intent table |
| `shape` | chart-native's `NATIVE_TYPES[].shape` for that id; `spatial` for a map sheet |
| `limits` | the NUMBERS the sheet already states (slope.md: "exactly two points", "≤ ~12 lines" → `{ points: 2, maxSeries: 12 }`). No number in the sheet ⇒ omit the key. Keys, all optional: `points`, `minPoints`, `maxPoints`, `maxSeries`, `maxCategories`, `minRows` |
| `formats` | intersect what the sheet's engines declare in their manifest `formats` with what the sheet says is sane (a sheet that says "never animate this" drops `video`) |
| `bestFor` / `notFor` | one line per bullet of the sheet's "When to use / when NOT" section, **compressed but not reinterpreted** |

Rules that hold across all four tasks:

- **Never invent a threshold.** If the prose has no number, the facet has no key — an absent limit means "not constrained", and that is the honest reading.
- **Never edit the body.** These tasks only prepend a header.
- Sheets whose type no registered engine declares (e.g. `gantt.md`, `lorenz.md` if absent from every catalogue) get `engines: {}` — which the loader rejects. For those, **omit the header entirely and list the sheet in the task's commit message**; Task 9's drift test tolerates a sheet with no header only if no engine declares its type, and fails loudly otherwise.

Each task ends with the same scoped verification and its own commit.

---

### Task 5: Frontmatter — chart-native `single`-shape sheets

**Files:**
- Modify (headers only): `knowledge/references/chart/types/{bar,line,pie,diverging-bar,waterfall,lollipop,bullet,treemap,waffle,dot-strip,radial-bar}.md`
- Test: `lib/brain/typology-coverage.test.ts` (created here, extended by Tasks 6-8)

**Interfaces:**
- Consumes: `loadTypology`, `engineTypes`
- Produces: the fixture-free half of the coverage test — `sheetsFor(shape: string): TypeSheet[]`

- [ ] **Step 1: Write the failing test**

```ts
// lib/brain/typology-coverage.test.ts
import { test, expect } from "bun:test";
import { loadTypology } from "./typology";
import { engineTypes } from "../core/registry";
import "../loop/engines";

const SINGLE = [
  "bar",
  "line",
  "pie",
  "diverging-bar",
  "waterfall",
  "lollipop",
  "bullet",
  "treemap",
  "waffle",
  "dot-strip",
  "radial-bar",
];

test("every single-shape chart sheet carries a complete, engine-true header", () => {
  const byId = new Map(loadTypology().map((s) => [s.id, s]));
  const chartNative = new Set(engineTypes("chart-native").map((t) => t.id));
  for (const id of SINGLE) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.intent.length).toBeGreaterThan(0);
    expect(sheet!.bestFor.length).toBeGreaterThan(0);
    expect(sheet!.notFor.length).toBeGreaterThan(0);
    // every declared render key must exist in that engine's catalogue
    for (const [engine, key] of Object.entries(sheet!.engines))
      if (engine === "chart-native")
        expect(chartNative.has(key), `${id} → chart-native:${key}`).toBe(true);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: FAIL — the loader throws on the first sheet with no `---` header

- [ ] **Step 3: Write the headers**

For each of the 11 sheets, open it, read its `> Sources:` line and its "When to use / when NOT" section, and prepend the header per the derivation table above. Two worked examples — follow their shape exactly.

`knowledge/references/chart/types/bar.md`:

```yaml
---
id: bar
engines:
  chart-native: bar
  dw-chart: d3-bars
intent: [magnitude, ranking]
shape: single
limits: { maxCategories: 30 }
formats: [static, interactive, video]
bestFor:
  - "comparing sizes across categories on a common baseline"
  - "a ranking where the order itself is the message"
notFor:
  - "a trend over many time points — that is a line"
  - "a baseline that does not start at zero — length encodes the value"
---
```

`knowledge/references/chart/types/pie.md`:

```yaml
---
id: pie
engines:
  chart-native: pie
  dw-chart: d3-pies
intent: [part-to-whole]
shape: single
limits: { maxCategories: 5 }
formats: [static, interactive]
bestFor:
  - "the components of one whole, with few slices and clearly different sizes"
notFor:
  - "more than about five slices — use bars"
  - "comparing angles precisely, or anything that is not a part of one whole"
---
```

- [ ] **Step 4: Run the test**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/chart/types lib/brain/typology-coverage.test.ts
git commit -m "docs(knowledge): the single-shape chart sheets declare their machine facets"
```

---

### Task 6: Frontmatter — chart-native `wide`-shape sheets

**Files:**
- Modify (headers only): `knowledge/references/chart/types/{grouped-bar,stacked-bar,stacked-area,slope,population-pyramid,bump,diverging-stacked,fan,heatmap}.md`
- Modify: `lib/brain/typology-coverage.test.ts`

**Interfaces:**
- Consumes: same as Task 5

- [ ] **Step 1: Extend the test (it must fail)**

Add to `lib/brain/typology-coverage.test.ts`:

```ts
const WIDE = [
  "grouped-bar",
  "stacked-bar",
  "stacked-area",
  "slope",
  "population-pyramid",
  "bump",
  "diverging-stacked",
  "fan",
  "heatmap",
];

test("every wide-shape chart sheet carries a complete, engine-true header", () => {
  const byId = new Map(loadTypology().map((s) => [s.id, s]));
  const chartNative = new Set(engineTypes("chart-native").map((t) => t.id));
  for (const id of WIDE) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.shape).toBe("wide");
    expect(sheet!.bestFor.length).toBeGreaterThan(0);
    for (const [engine, key] of Object.entries(sheet!.engines))
      if (engine === "chart-native")
        expect(chartNative.has(key), `${id} → chart-native:${key}`).toBe(true);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: FAIL — `slope.md must load` (or the loader throws on the first header-less sheet)

- [ ] **Step 3: Write the headers**

Mind the KB-name ↔ render-key divergence recorded in `skills/chart-native/tests/completeness.test.ts:21-26`: `grouped-bar.md` → `grouped`, `stacked-bar.md` → `stacked`, `diverging-bar.md` → `diverging`, `population-pyramid.md` → `pyramid`. The worked example (use it as the template — its numbers come from the sheet's own prose):

`knowledge/references/chart/types/slope.md`:

```yaml
---
id: slope
engines:
  chart-native: slope
intent: [change-over-time, ranking]
shape: wide
limits: { points: 2, maxSeries: 12 }
formats: [static, interactive, video]
bestFor:
  - "a before/after across a handful of categories"
  - "a rank change between two periods"
  - "an 'every X did A except Y' story where one line bucks the trend"
notFor:
  - "more than two points in time — that is a line chart"
  - "many categories with similar values — the lines tangle into a hairball"
  - "part-to-whole, or magnitude from zero"
---
```

`knowledge/references/chart/types/grouped-bar.md`:

```yaml
---
id: grouped-bar
engines:
  chart-native: grouped
  dw-chart: d3-bars-grouped
intent: [magnitude, ranking]
shape: wide
limits: { maxSeries: 3 }
formats: [static, interactive, video]
bestFor:
  - "comparing a few series side by side within each category"
notFor:
  - "more than three series — use small multiples"
  - "a composition of one whole — that is a stacked bar"
---
```

- [ ] **Step 4: Run the test**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/chart/types lib/brain/typology-coverage.test.ts
git commit -m "docs(knowledge): the wide-shape chart sheets declare their machine facets"
```

---

### Task 7: Frontmatter — chart-native `paired` and `distribution` sheets

**Files:**
- Modify (headers only): `knowledge/references/chart/types/{scatter,dumbbell,connected-scatter,histogram,boxplot,beeswarm,violin}.md`
- Modify: `lib/brain/typology-coverage.test.ts`

- [ ] **Step 1: Extend the test (it must fail)**

```ts
const PAIRED_AND_DISTRIBUTION = [
  "scatter",
  "dumbbell",
  "connected-scatter",
  "histogram",
  "boxplot",
  "beeswarm",
  "violin",
];

test("every paired/distribution chart sheet carries a complete header", () => {
  const byId = new Map(loadTypology().map((s) => [s.id, s]));
  for (const id of PAIRED_AND_DISTRIBUTION) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(["paired", "distribution"]).toContain(sheet!.shape);
    expect(sheet!.notFor.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the headers**

Worked example:

`knowledge/references/chart/types/scatter.md`:

```yaml
---
id: scatter
engines:
  chart-native: scatter
  dw-chart: d3-scatter-plot
intent: [correlation, distribution]
shape: paired
limits: { minRows: 10 }
formats: [static, interactive, video]
bestFor:
  - "the relationship between two numeric variables"
  - "spotting outliers against the cloud of everything else"
notFor:
  - "a handful of rows — a scatter needs a cloud to read as one"
  - "a trend over time with one series — that is a line"
---
```

`knowledge/references/chart/types/dumbbell.md`:

```yaml
---
id: dumbbell
engines:
  chart-native: dumbbell
  dw-chart: d3-range-plot
intent: [ranking, deviation]
shape: paired
limits: { points: 2, maxCategories: 25 }
formats: [static, interactive, video]
bestFor:
  - "the SIZE of the gap between two values per category"
  - "a before/after where the distance matters more than the trajectory"
notFor:
  - "more than two points per category"
  - "a story about the trajectory itself — that is a slope"
---
```

- [ ] **Step 4: Run the test**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: PASS (three tests)

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/chart/types lib/brain/typology-coverage.test.ts
git commit -m "docs(knowledge): the paired and distribution chart sheets declare their machine facets"
```

---

### Task 8: Frontmatter — maps, the image sheet, and the remaining chart sheets

Closes coverage: the 7 map sheets, a new sheet for `image-scrolly` (the one reachable type with no sheet at all), and every remaining chart sheet whose type a registered engine declares — including the deferred ones, which get a header and are simply never offered.

**Files:**
- Modify (headers only): `knowledge/references/map/types/{choropleth,proportional-symbol,locator,route,dot-density,hex-grid,cartogram}.md` + every chart sheet not covered by Tasks 5-7 whose type appears in a catalogue
- Create: `knowledge/references/image/types/image-scrolly.md`
- Modify: `lib/brain/typology-coverage.test.ts`

- [ ] **Step 1: Extend the test (it must fail)**

```ts
const MAPS = [
  "choropleth",
  "proportional-symbol",
  "locator",
  "route",
  "dot-density",
  "hex-grid",
  "cartogram",
];

test("every map sheet is spatial and engine-true", () => {
  const byId = new Map(loadTypology().map((s) => [s.id, s]));
  const mapNative = new Set(engineTypes("map-native").map((t) => t.id));
  for (const id of MAPS) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.intent).toContain("spatial");
    for (const [engine, key] of Object.entries(sheet!.engines))
      if (engine === "map-native")
        expect(mapNative.has(key), `${id} → map-native:${key}`).toBe(true);
  }
});

test("the image-scrolly sheet exists and is scrolly-only", () => {
  const sheet = loadTypology().find((s) => s.id === "image-scrolly");
  expect(sheet).toBeDefined();
  expect(sheet!.formats).toEqual(["scrolly"]);
  expect(sheet!.engines["image-native"]).toBe("image-scrolly");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology-coverage.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the map headers**

Mind the KB-name ↔ render-key divergence: `proportional-symbol.md` → map-native `symbol`. Worked example:

`knowledge/references/map/types/choropleth.md`:

```yaml
---
id: choropleth
engines:
  map-native: choropleth
  map-dw: choropleth
intent: [spatial, magnitude]
shape: spatial
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a rate or a ratio across areas that already mean something to the reader"
notFor:
  - "raw counts — big areas will dominate; normalise first"
  - "areas so small or so many that the pattern is unreadable at publication size"
---
```

- [ ] **Step 4: Create the image sheet**

`knowledge/references/image/types/image-scrolly.md` — its prose is sourced from `docs/superpowers/specs/2026-07-10-image-scrolly-design.md`, which is the engine's own design:

```markdown
---
id: image-scrolly
engines:
  image-native: image-scrolly
intent: [spatial, change-over-time]
shape: narrative
limits: { minRows: 2 }
formats: [scrolly]
bestFor:
  - "a place or an object the reader should look at while the text explains it"
  - "a before/after the reader crossfades through by scrolling"
notFor:
  - "anything whose message is a quantity — an image cannot be measured"
  - "images the newsroom does not have the rights to publish"
---

# Image scrolly — per-type best practice

> Source: the engine's own design, `docs/superpowers/specs/2026-07-10-image-scrolly-design.md`.
> Inherits the shared scrolly discipline in `formats/interactive.md`.

An image scrolly pins a photograph (or a sequence of them) and advances it as the reader
scrolls: crossfade between states, one editorial beat per state. The pictures carry the
observation; the text carries the claim.

## When to use / when NOT

- **Use** for: a place portrait; a before/after the reader should experience as a transition;
  a sequence where each image is a step of one argument.
- **Not** for: anything quantitative — a reader cannot measure a photograph.
- **Not** for: material without publication rights. The caption and the credit are part of the
  visual, not decoration around it.

## Correctness

1. **Every image carries its caption and its credit**, and they survive the export.
2. **One beat per state.** A state the reader cannot name is a state that should not exist.
3. **Alt text per image** (WCAG 1.1.1) — the produce path refuses without it.
```

- [ ] **Step 5: Sweep the remaining chart sheets**

For every file in `knowledge/references/chart/types/` still without a header, check whether any engine catalogue declares its type. Write the header if one does — deferred types included (`sankey`, `radar`, `streamgraph`, `gantt`, `calendar`, `lorenz`, `candlestick`, `chord`, `sunburst`, `parallel`, `marimekko`). Leave a sheet header-less only if no engine declares it, and name those files in the commit message.

Verify the split mechanically before writing:

```bash
bun -e '
import {engineTypes} from "./lib/core/registry.ts";
await import("./lib/loop/engines.ts");
const all = new Set(["chart-native","map-native","dw-chart","map-dw","image-native"].flatMap(e=>engineTypes(e).map(t=>t.id)));
console.log([...all].sort().join(" "));
'
```

- [ ] **Step 6: Run the test**

Run: `bun test lib/brain/`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add knowledge/references lib/brain/typology-coverage.test.ts
git commit -m "docs(knowledge): the map, image and remaining chart sheets declare their machine facets"
```

---

### Task 9: The three drift tests

Now that every sheet has a header, the invariants can be enforced against the REAL KB and the REAL registry. This is what keeps knowledge and rules from diverging for good.

**Files:**
- Create: `lib/brain/typology-drift.test.ts`
- Modify: `lib/brain/typology.ts` (add `renderableSheets`)

**Interfaces:**
- Produces: `renderableSheets(sheets?: TypeSheet[]): { sheet: TypeSheet; engine: string; key: string }[]` — one entry per (sheet, engine) pair the registry says is renderable today

- [ ] **Step 1: Write the failing test**

```ts
// lib/brain/typology-drift.test.ts
import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypology, renderableSheets } from "./typology";
import { allProducers, engineTypes } from "../core/registry";
import { INTENTS } from "./intents";
import "../loop/engines";

const KB = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../knowledge/references",
);

test("DRIFT 1: every declared render key exists in that engine's catalogue", () => {
  for (const sheet of loadTypology())
    for (const [engine, key] of Object.entries(sheet.engines)) {
      const ids = engineTypes(engine).map((t) => t.id);
      expect(ids, `${sheet.id} declares ${engine}:${key}`).toContain(key);
    }
});

test("DRIFT 2: every reachable engine type has a sheet", () => {
  const claimed = new Map<string, string>(); // `${engine}:${key}` → sheet id
  for (const sheet of loadTypology())
    for (const [engine, key] of Object.entries(sheet.engines))
      claimed.set(`${engine}:${key}`, sheet.id);
  const missing: string[] = [];
  for (const p of allProducers())
    for (const t of engineTypes(p.name))
      if (!t.deferred && !claimed.has(`${p.name}:${t.id}`))
        missing.push(`${p.name}:${t.id}`);
  expect(missing).toEqual([]);
});

test("DRIFT 3: every intent used belongs to the closed vocabulary", () => {
  for (const sheet of loadTypology())
    for (const i of sheet.intent) expect(INTENTS).toContain(i);
});

test("a header-less sheet is only tolerated when no engine declares its type", () => {
  const declared = new Set(
    allProducers().flatMap((p) => engineTypes(p.name).map((t) => t.id)),
  );
  for (const family of ["chart/types", "map/types", "image/types"])
    for (const file of readdirSync(join(KB, family)).filter((f) =>
      f.endsWith(".md"),
    )) {
      const raw = readFileSync(join(KB, family, file), "utf8");
      if (raw.startsWith("---")) continue;
      const id = file.replace(/\.md$/, "");
      expect(declared.has(id), `${family}/${file} has no header`).toBe(false);
    }
});

test("renderableSheets pairs a sheet with each engine that can render it today", () => {
  const pairs = renderableSheets();
  expect(pairs.length).toBeGreaterThan(20);
  expect(
    pairs.some((p) => p.sheet.id === "slope" && p.engine === "chart-native"),
  ).toBe(true);
  // a deferred type never pairs
  expect(pairs.some((p) => p.sheet.id === "sankey")).toBe(false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/typology-drift.test.ts`
Expected: FAIL — `renderableSheets is not exported` (and, if any authoring gap remains, DRIFT 2 lists it — fix the sheets, do not weaken the test)

- [ ] **Step 3: Add `renderableSheets`**

Append to `lib/brain/typology.ts`:

```ts
import { isRenderable } from "../core/registry";

export type RenderableSheet = { sheet: TypeSheet; engine: string; key: string };

// A sheet is only offerable through an engine that can render it TODAY. This is the join
// that makes a deferred type structurally unofferable (spec §3): nothing downstream has to
// remember to filter it, because it never enters the candidate set.
export function renderableSheets(
  sheets: TypeSheet[] = loadTypology(),
): RenderableSheet[] {
  const out: RenderableSheet[] = [];
  for (const sheet of sheets)
    for (const [engine, key] of Object.entries(sheet.engines))
      if (isRenderable(engine, key)) out.push({ sheet, engine, key });
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/brain/typology.ts lib/brain/typology-drift.test.ts
git commit -m "test(brain): knowledge and engines can no longer drift apart in silence"
```

---

### Task 10: Facts and the legal set

The deterministic half of the brain: measurable facts from the data profile, then the four legality conditions — each exclusion carrying the reason a journalist can read.

**Files:**
- Create: `lib/brain/facts.ts`, `lib/brain/facts.test.ts`, `lib/brain/eligibility.ts`, `lib/brain/eligibility.test.ts`

**Interfaces:**
- Consumes: `DataProfile` (`lib/loop/manifest`), `CapabilityReadiness` (`lib/newsroom/readiness`), `isFormatAllowed` (`lib/core/channel-policy`), `renderableSheets`
- Produces:

```ts
type Facts = { rows: number; series: number; points: number; columns: string[]; numericColumns: string[] };
deriveFacts(profile: DataProfile): Facts

type Candidate = { id: string; engine: string; key: string; format: VisualFormat; sheet: TypeSheet };
type Excluded = { id: string; reason: string };
type EligibilityInput = {
  facts: Facts;
  channel: Channel;
  readiness?: CapabilityReadiness[];
  themeBg?: string;         // absent ⇒ light ⇒ no style exclusion
  route: "embed" | "article";
};
eligible(input: EligibilityInput, pairs?: RenderableSheet[]): { eligible: Candidate[]; excluded: Excluded[] }
```

- [ ] **Step 1: Write the failing tests**

```ts
// lib/brain/facts.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";

test("series and points are the numeric columns, counted the two useful ways", () => {
  const f = deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 26,
  });
  expect(f.rows).toBe(26);
  expect(f.series).toBe(26); // one series per row for a wide, two-point sheet
  expect(f.points).toBe(2); // one point per numeric column
});
```

```ts
// lib/brain/eligibility.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible } from "./eligibility";

const TWO_POINTS = deriveFacts({
  columns: ["canton", "2019", "2024"],
  numericColumns: ["2019", "2024"],
  rowCount: 8,
});

const BASE = { facts: TWO_POINTS, channel: "article-web", route: "embed" } as const;

test("a two-point wide dataset makes slope legal", () => {
  const { eligible: ok } = eligible({ ...BASE });
  expect(ok.some((c) => c.id === "slope")).toBe(true);
});

test("a limit the data breaks excludes the form WITH its reason", () => {
  const many = deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 40, // slope caps maxSeries at 12
  });
  const { eligible: ok, excluded } = eligible({ ...BASE, facts: many });
  expect(ok.some((c) => c.id === "slope")).toBe(false);
  const why = excluded.find((e) => e.id === "slope");
  expect(why?.reason).toMatch(/40/);
});

test("a channel that forbids a format excludes it, with the channel named", () => {
  const { eligible: ok, excluded } = eligible({
    ...BASE,
    channel: "social-vertical",
  });
  expect(ok.every((c) => c.format !== "interactive")).toBe(true);
  expect(excluded.some((e) => /social-vertical/.test(e.reason))).toBe(true);
});

test("a missing capability MARKS the form — it never removes it", () => {
  const { eligible: ok } = eligible({
    ...BASE,
    readiness: [
      {
        id: "chart-native",
        label: "Charts built in-house",
        status: "missing",
        reason: "chart-native is not installed",
        help: [],
      },
    ],
  });
  const slope = ok.find((c) => c.id === "slope");
  expect(slope).toBeDefined(); // still offered…
  expect(slope!.readiness?.status).toBe("missing"); // …but marked
});

test("a dark house theme excludes the Datawrapper engine, with the physical reason", () => {
  const { eligible: ok, excluded } = eligible({ ...BASE, themeBg: "#12233A" });
  expect(ok.every((c) => c.engine !== "dw-chart")).toBe(true);
  expect(
    excluded.some((e) => /Datawrapper|light background/i.test(e.reason)),
  ).toBe(true);
});

test("every exclusion carries a non-empty reason — no silent drop", () => {
  const { excluded } = eligible({ ...BASE, channel: "social-feed" });
  for (const e of excluded) expect(e.reason.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/brain/facts.test.ts lib/brain/eligibility.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement `facts.ts`**

```ts
// lib/brain/facts.ts
// The measurable half of the brain's input. Every number a limit can be checked against comes
// from here and nowhere else, so a limit is never checked against a guess.
import type { DataProfile } from "../loop/manifest";

export type Facts = {
  rows: number;
  /** How many things get their own mark: one per row in the wide/tidy shapes the KB assumes. */
  series: number;
  /** How many measured moments each row carries — one per numeric column. */
  points: number;
  columns: string[];
  numericColumns: string[];
};

export function deriveFacts(profile: DataProfile): Facts {
  return {
    rows: profile.rowCount,
    series: profile.rowCount,
    points: profile.numericColumns.length,
    columns: profile.columns,
    numericColumns: profile.numericColumns,
  };
}
```

- [ ] **Step 4: Implement `eligibility.ts`**

```ts
// lib/brain/eligibility.ts
// The LEGAL SET. Four conditions, each measurable, each producing a readable reason when it
// excludes. Nothing semantic happens here — the intent never reaches this file, which is what
// guarantees a mis-read intent cannot change what is legal (spec §4.2).
import type { Channel, VisualFormat } from "../core/vocabulary";
import { isFormatAllowed } from "../core/channel-policy";
import type { CapabilityReadiness } from "../newsroom/readiness";
import { renderableSheets, type RenderableSheet, type TypeSheet } from "./typology";
import type { Facts } from "./facts";

export type Candidate = {
  id: string;
  engine: string;
  key: string;
  format: VisualFormat;
  sheet: TypeSheet;
  readiness?: { status: CapabilityReadiness["status"]; reason: string };
  requires?: string[];
  /** How full this form is against its own cap, 0..1 (0 when the sheet declares no cap).
   *  Computed here because this is where both the facts and the limits are in hand; the
   *  ranking consumes the number without needing either. */
  fill: number;
};

export type Excluded = { id: string; reason: string };

export type EligibilityInput = {
  facts: Facts;
  channel: Channel;
  /** The decor's capability readiness. Absent ⇒ no CAPACITÉ marking (spec §10). */
  readiness?: CapabilityReadiness[];
  /** The house background. Absent or light ⇒ no style exclusion. */
  themeBg?: string;
  route: "embed" | "article";
};

// The engines whose output is a narrative page rather than an embeddable element. Until the
// article branch exists they are offered MARKED, never dropped (spec §8).
const ARTICLE_BRANCH_ENGINES = new Set(["scrolly", "image-native"]);
const ARTICLE_BRANCH = "article-branch";

export function eligible(
  input: EligibilityInput,
  pairs: RenderableSheet[] = renderableSheets(),
): { eligible: Candidate[]; excluded: Excluded[] } {
  const out: Candidate[] = [];
  const excluded: Excluded[] = [];
  const seenExclusion = new Set<string>();
  const exclude = (id: string, reason: string) => {
    if (seenExclusion.has(id)) return;
    seenExclusion.add(id);
    excluded.push({ id, reason });
  };

  for (const { sheet, engine, key } of pairs) {
    const limit = limitFailure(sheet, input.facts);
    if (limit) {
      exclude(sheet.id, limit);
      continue;
    }
    if (isDark(input.themeBg) && engine === "dw-chart") {
      exclude(
        sheet.id,
        "the house theme has a dark background and Datawrapper only renders on a light one",
      );
      continue;
    }
    const formats = sheet.formats.filter((f) =>
      isFormatAllowed(input.channel, f),
    );
    if (formats.length === 0) {
      exclude(
        sheet.id,
        `the ${input.channel} channel allows none of the formats this form comes in (${sheet.formats.join(", ")})`,
      );
      continue;
    }
    const fill = fillRatio(sheet, input.facts);
    for (const format of formats)
      out.push(
        withMarks({ id: sheet.id, engine, key, format, sheet, fill }, input),
      );
  }
  return { eligible: out, excluded };
}

// A limit is only checked when the sheet declares it: an absent limit means "not constrained",
// never zero.
function limitFailure(sheet: TypeSheet, f: Facts): string | null {
  const l = sheet.limits;
  if (l.points != null && f.points !== l.points)
    return `this form needs exactly ${l.points} measured points per row, and the data has ${f.points}`;
  if (l.minPoints != null && f.points < l.minPoints)
    return `this form needs at least ${l.minPoints} points, and the data has ${f.points}`;
  if (l.maxPoints != null && f.points > l.maxPoints)
    return `this form takes at most ${l.maxPoints} points, and the data has ${f.points}`;
  if (l.maxSeries != null && f.series > l.maxSeries)
    return `this form stays readable up to ${l.maxSeries} series, and the data has ${f.series}`;
  if (l.maxCategories != null && f.rows > l.maxCategories)
    return `this form stays readable up to ${l.maxCategories} categories, and the data has ${f.rows}`;
  if (l.minRows != null && f.rows < l.minRows)
    return `this form needs at least ${l.minRows} rows to read as one, and the data has ${f.rows}`;
  return null;
}

// How close a form runs to its own readability cap. A slope carrying 11 of its 12 lines is
// legal and cramped; one carrying 4 is legal and comfortable, and that difference is worth an
// ordering nudge (never a legality one). No cap declared ⇒ 0: an unconstrained form must not
// win a fit it never claimed.
function fillRatio(sheet: TypeSheet, f: Facts): number {
  const cap = sheet.limits.maxSeries ?? sheet.limits.maxCategories;
  if (cap == null || cap <= 0) return 0;
  const used = sheet.limits.maxSeries != null ? f.series : f.rows;
  return Math.min(1, used / cap);
}

// CAPACITÉ and the article branch MARK, they never remove: the worst status among what a form
// requires is the status of the form (the rule already in lib/loop/propose.ts).
const SEVERITY = { ready: 0, unverified: 1, disabled: 2, missing: 3 } as const;

function withMarks(c: Candidate, input: EligibilityInput): Candidate {
  const requires = [
    c.engine,
    ...(ARTICLE_BRANCH_ENGINES.has(c.engine) || c.format === "scrolly"
      ? [ARTICLE_BRANCH]
      : []),
  ];
  const marks: { status: CapabilityReadiness["status"]; reason: string }[] = [];
  if (requires.includes(ARTICLE_BRANCH) && input.route !== "article")
    marks.push({
      status: "missing",
      reason:
        "this is the whole-article branch — it is not built yet, and it changes what gets delivered",
    });
  for (const r of input.readiness ?? [])
    if (requires.includes(r.id) && r.status !== "ready")
      marks.push({ status: r.status, reason: r.reason });
  if (marks.length === 0) return { ...c, requires };
  const worst = marks.reduce((a, b) =>
    SEVERITY[b.status] > SEVERITY[a.status] ? b : a,
  );
  return { ...c, requires, readiness: worst };
}

// The house ground is "light", "dark", or any #rrggbb (skills/splash/src/brand-profile.ts:35).
// Relative luminance against the WCAG mid point — the same split the producers use to pick a
// basemap. A background below it is "dark", and dark is where Datawrapper cannot follow.
function isDark(themeBg?: string): boolean {
  if (!themeBg) return false;
  const t = themeBg.trim();
  if (t === "dark") return true;
  if (t === "light") return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
```

- [ ] **Step 5: Run the tests**

Run: `bun test lib/brain/facts.test.ts lib/brain/eligibility.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/brain/facts.ts lib/brain/facts.test.ts lib/brain/eligibility.ts lib/brain/eligibility.test.ts
git commit -m "feat(brain): the legal set is measurable, and every exclusion says why"
```

---

### Task 11: The soft ranking

**Files:**
- Create: `lib/brain/rank.ts`, `lib/brain/rank.test.ts`

**Interfaces:**
- Consumes: `Candidate`, `Intent`
- Produces: `rank(candidates: Candidate[], intents: Intent[]): Candidate[]` — a NEW sorted array, same membership, stable for equal scores

- [ ] **Step 1: Write the failing test — this is the key test of the whole design**

```ts
// lib/brain/rank.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible } from "./eligibility";
import { rank } from "./rank";

const BASE = {
  facts: deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 8,
  }),
  channel: "article-web",
  route: "embed",
} as const;

test("THE INVARIANT: a wrong intent changes the ORDER and never the legal set", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const right = rank(legal, ["change-over-time"]);
  const wrong = rank(legal, ["flow"]); // nothing here serves flow
  const ids = (cs: typeof legal) => [...cs.map((c) => `${c.id}:${c.format}`)].sort();
  expect(ids(right)).toEqual(ids(legal)); // same membership
  expect(ids(wrong)).toEqual(ids(legal)); // same membership
  expect(right.map((c) => c.id)).not.toEqual(wrong.map((c) => c.id)); // different order
});

test("a form that serves the intent outranks one that does not", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const ordered = rank(legal, ["change-over-time"]);
  const slope = ordered.findIndex((c) => c.id === "slope");
  const dumbbell = ordered.findIndex((c) => c.id === "dumbbell");
  expect(slope).toBeLessThan(dumbbell); // slope declares change-over-time, dumbbell does not
});

test("a marked form ranks below an equally-fitting ready one", () => {
  const { eligible: legal } = eligible({
    ...BASE,
    readiness: [
      {
        id: "dw-chart",
        label: "Datawrapper",
        status: "missing",
        reason: "no API token",
        help: [],
      },
    ],
  });
  const ordered = rank(legal, ["magnitude"]);
  const firstMarked = ordered.findIndex((c) => c.readiness);
  const lastReady = ordered.map((c) => !c.readiness).lastIndexOf(true);
  if (firstMarked !== -1) expect(firstMarked).toBeGreaterThan(lastReady - 1);
});

test("between two forms that serve the intent equally, the roomier one leads", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const ordered = rank(legal, ["ranking"]);
  const scores = ordered
    .filter((c) => c.sheet.intent.includes("ranking"))
    .map((c) => c.fill);
  // fill is a 0..1 ratio, and the ordering is non-decreasing in it among equal-intent peers
  expect(scores).toEqual([...scores].sort((a, b) => a - b));
});

test("ranking never mutates its input", () => {
  const { eligible: legal } = eligible({ ...BASE });
  const before = legal.map((c) => c.id);
  rank(legal, ["ranking"]);
  expect(legal.map((c) => c.id)).toEqual(before);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/rank.test.ts`
Expected: FAIL — `Cannot find module './rank'`

- [ ] **Step 3: Implement**

```ts
// lib/brain/rank.ts
// The SOFT half. Ordering only — the membership of the array it is handed is the membership it
// returns. That is the whole reason a semantic input (the intent, read from prose) is allowed
// anywhere near the brain: it can be wrong and cost nothing but an order.
//
// The ordering is task-efficiency-first, per FT Visual Vocabulary + the effectiveness-by-task
// literature (Saket, TVCG 2019 · Kim & Heer). No solver, no learned weights, and the model is
// never asked to rank (spec §4.2).
import type { Intent } from "./intents";
import type { Candidate } from "./eligibility";

const MARK_PENALTY = 10;
const FORMAT_ORDER: Record<string, number> = {
  interactive: 0,
  static: 1,
  video: 2,
  scrolly: 3,
};

export function rank(candidates: Candidate[], intents: Intent[]): Candidate[] {
  return [...candidates]
    .map((c, i) => ({ c, i, score: score(c, intents) }))
    .sort((a, b) => a.score - b.score || a.i - b.i) // stable on ties
    .map((x) => x.c);
}

function score(c: Candidate, intents: Intent[]): number {
  const matches = c.sheet.intent.filter((i) => intents.includes(i)).length;
  // A form that serves the stated intent comes first; among those, one that serves it with
  // fewer other purposes is the more specific answer.
  const intentScore = matches > 0 ? -matches : 1;
  const marked = c.readiness ? MARK_PENALTY : 0;
  // c.fill (0..1, computed in eligibility) nudges a form that runs close to its own
  // readability cap below a roomier peer — never enough to outweigh serving the intent.
  return (
    intentScore * 4 + c.fill + marked + (FORMAT_ORDER[c.format] ?? 4) * 0.1
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/rank.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/brain/rank.ts lib/brain/rank.test.ts
git commit -m "feat(brain): intent orders the offer and can never change what is legal"
```

---

### Task 12: Assembling the offer

**Files:**
- Create: `lib/brain/offer.ts`, `lib/brain/offer.test.ts`

**Interfaces:**
- Consumes: `eligible`, `rank`, `deriveFacts`
- Produces:

```ts
type OfferOption = {
  id: string; nativeType: string; engine: string; format: VisualFormat;
  intent: Intent[]; requires?: string[];
  readiness?: { status: ReadinessStatus; reason: string };
  whySource: { sheet: string; fragments: string[]; facts: Record<string, string> };
};
type Offer = { options: OfferOption[]; excluded: Excluded[] };
buildOffer(input: EligibilityInput & { intents: Intent[]; max?: number }): Offer
```

- [ ] **Step 1: Write the failing test**

```ts
// lib/brain/offer.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { buildOffer } from "./offer";

const INPUT = {
  facts: deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 8,
  }),
  channel: "article-web" as const,
  route: "embed" as const,
  intents: ["change-over-time" as const],
};

test("it offers at most three forms", () => {
  expect(buildOffer(INPUT).options.length).toBeLessThanOrEqual(3);
});

test("one form appears once — the best format for it, not one row per format", () => {
  const ids = buildOffer(INPUT).options.map((o) => o.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("every option carries the grounding a why can be written from", () => {
  for (const o of buildOffer(INPUT).options) {
    expect(o.whySource.sheet).toMatch(/\.md$/);
    expect(o.whySource.fragments.length).toBeGreaterThan(0);
    expect(Object.keys(o.whySource.facts).length).toBeGreaterThan(0);
  }
});

test("the facts are the real numbers, as strings ready to be quoted", () => {
  const [first] = buildOffer(INPUT).options;
  expect(first.whySource.facts.rows).toBe("8");
  expect(first.whySource.facts.points).toBe("2");
});

test("what was discarded rides along with the offer", () => {
  const offer = buildOffer({ ...INPUT, channel: "social-vertical" });
  expect(offer.excluded.length).toBeGreaterThan(0);
  for (const e of offer.excluded) expect(e.reason.length).toBeGreaterThan(0);
});

test("nothing legal ⇒ an empty offer that still explains itself", () => {
  const offer = buildOffer({
    ...INPUT,
    facts: deriveFacts({ columns: ["name"], numericColumns: [], rowCount: 3 }),
  });
  expect(offer.options).toEqual([]);
  expect(offer.excluded.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/offer.test.ts`
Expected: FAIL — `Cannot find module './offer'`

- [ ] **Step 3: Implement**

```ts
// lib/brain/offer.ts
// What the desk puts on the table: a few ranked forms, each carrying the material a why is
// written from, plus what was discarded and why. It offers — it never chooses (P1).
import type { Intent } from "./intents";
import { eligible, type Candidate, type EligibilityInput, type Excluded } from "./eligibility";
import { rank } from "./rank";
import type { RenderableSheet } from "./typology";
import type { VisualFormat } from "../core/vocabulary";
import type { ReadinessStatus } from "../newsroom/readiness";

export type OfferOption = {
  id: string;
  nativeType: string;
  engine: string;
  format: VisualFormat;
  intent: Intent[];
  requires?: string[];
  readiness?: { status: ReadinessStatus; reason: string };
  whySource: {
    sheet: string;
    fragments: string[];
    facts: Record<string, string>;
  };
};

export type Offer = { options: OfferOption[]; excluded: Excluded[] };

const DEFAULT_MAX = 3;

export function buildOffer(
  input: EligibilityInput & { intents: Intent[]; max?: number },
  pairs?: RenderableSheet[],
): Offer {
  const { eligible: legal, excluded } = eligible(input, pairs);
  const ordered = rank(legal, input.intents);
  const options: OfferOption[] = [];
  const seen = new Set<string>();
  for (const c of ordered) {
    // One row per FORM, not per format: the ranking already put that form's best format
    // first, and offering the same form three times would bury the other forms.
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    options.push(toOption(c, input));
    if (options.length === (input.max ?? DEFAULT_MAX)) break;
  }
  return { options, excluded };
}

function toOption(c: Candidate, input: EligibilityInput): OfferOption {
  return {
    id: c.id,
    nativeType: c.key,
    engine: c.engine,
    format: c.format,
    intent: c.sheet.intent,
    ...(c.requires ? { requires: c.requires } : {}),
    ...(c.readiness ? { readiness: c.readiness } : {}),
    whySource: {
      sheet: c.sheet.sheetPath,
      // The ONLY prose the model may draw on: the sheet's own words for what this form is
      // good at, and what it is not.
      fragments: [...c.sheet.bestFor, ...c.sheet.notFor],
      facts: {
        rows: String(input.facts.rows),
        series: String(input.facts.series),
        points: String(input.facts.points),
        ...(input.facts.numericColumns.length
          ? { measures: input.facts.numericColumns.join(", ") }
          : {}),
      },
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/offer.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/brain/offer.ts lib/brain/offer.test.ts
git commit -m "feat(brain): assemble an offer that carries its grounding and its discards"
```

---

### Task 13: The guard on what the model phrased

**Files:**
- Create: `lib/brain/verify-offer.ts`, `lib/brain/verify-offer.test.ts`

**Interfaces:**
- Consumes: `Offer`, `OfferOption`
- Produces: `type PhrasedOption = { id: string; why: string }` · `verifyOffer(phrased: PhrasedOption[], offer: Offer): void` (throws — never returns a boolean, mirroring `assertFormatAllowed`)

- [ ] **Step 1: Write the failing test**

```ts
// lib/brain/verify-offer.test.ts
import { test, expect } from "bun:test";
import { verifyOffer } from "./verify-offer";
import type { Offer } from "./offer";

const OFFER: Offer = {
  options: [
    {
      id: "slope",
      nativeType: "slope",
      engine: "chart-native",
      format: "static",
      intent: ["change-over-time"],
      whySource: {
        sheet: "chart/types/slope.md",
        fragments: ["a before/after across a handful of categories"],
        facts: { rows: "8", series: "8", points: "2" },
      },
    },
    {
      id: "dumbbell",
      nativeType: "dumbbell",
      engine: "chart-native",
      format: "static",
      intent: ["ranking"],
      readiness: { status: "missing", reason: "chart-native is not installed" },
      whySource: {
        sheet: "chart/types/dumbbell.md",
        fragments: ["the SIZE of the gap between two values"],
        facts: { rows: "8", series: "8", points: "2" },
      },
    },
  ],
  excluded: [{ id: "pie", reason: "8 categories — a pie takes at most 5" }],
};

test("a faithful phrasing passes", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "Deux dates (2 points) pour 8 cantons : la pente montre qui monte et qui descend." },
        { id: "dumbbell", why: "Marque l'écart aux deux bouts. Nécessite chart-native, qui n'est pas installé." },
      ],
      OFFER,
    ),
  ).not.toThrow();
});

test("an option the brain never offered is refused", () => {
  expect(() =>
    verifyOffer([{ id: "sankey", why: "joli" }, ...[]], OFFER),
  ).toThrow(/not offered|sankey/i);
});

test("a discarded form presented as offered is refused", () => {
  expect(() => verifyOffer([{ id: "pie", why: "un camembert" }], OFFER)).toThrow(
    /discarded|pie/i,
  );
});

test("reordering is refused — the ranking is not the model's to change", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "dumbbell", why: "l'écart aux deux bouts" },
        { id: "slope", why: "la pente entre deux dates" },
      ],
      OFFER,
    ),
  ).toThrow(/order/i);
});

test("a number that is in neither the facts nor the offer is refused", () => {
  expect(() =>
    verifyOffer(
      [{ id: "slope", why: "La pente couvre 26 cantons." }],
      OFFER,
    ),
  ).toThrow(/26/);
});

test("a marked form phrased as if it were ready is refused", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "8 cantons, 2 dates." },
        { id: "dumbbell", why: "Marque l'écart aux deux bouts." }, // says nothing about the gap
      ],
      OFFER,
    ),
  ).toThrow(/readiness|marked/i);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/brain/verify-offer.test.ts`
Expected: FAIL — `Cannot find module './verify-offer'`

- [ ] **Step 3: Implement**

```ts
// lib/brain/verify-offer.ts
// The seam guard. The model writes the offer's prose; this decides whether what came back is
// still the offer. It throws rather than returning a verdict, for the reason
// assertFormatAllowed throws: a caller that wants to be lenient has to say so out loud.
import type { Offer } from "./offer";

export type PhrasedOption = { id: string; why: string };

export function verifyOffer(phrased: PhrasedOption[], offer: Offer): void {
  const offered = offer.options.map((o) => o.id);
  const discarded = new Set(offer.excluded.map((e) => e.id));

  for (const p of phrased) {
    if (discarded.has(p.id))
      throw new Error(
        `verifyOffer: "${p.id}" was discarded, and is presented as offered`,
      );
    if (!offered.includes(p.id))
      throw new Error(`verifyOffer: "${p.id}" was not offered`);
  }
  const got = phrased.map((p) => p.id);
  if (got.length !== offered.length || got.some((id, i) => id !== offered[i]))
    throw new Error(
      `verifyOffer: the order changed — offered ${offered.join(", ")}, phrased ${got.join(", ")}`,
    );

  for (const p of phrased) {
    const option = offer.options.find((o) => o.id === p.id)!;
    // Claim grounding: every number in the prose must be a number the brain computed, or one
    // the sheet's own fragments already contain. Anything else is invented.
    const allowed = new Set([
      ...Object.values(option.whySource.facts).flatMap(numbersIn),
      ...option.whySource.fragments.flatMap(numbersIn),
      ...numbersIn(option.readiness?.reason ?? ""),
    ]);
    for (const n of numbersIn(p.why))
      if (!allowed.has(n))
        throw new Error(
          `verifyOffer: "${p.id}" claims the number ${n}, which is in neither the facts nor the sheet`,
        );
    // A marked form must SAY it is marked: offering it bare promises what the install cannot do.
    if (option.readiness && !mentionsMark(p.why, option.readiness.reason))
      throw new Error(
        `verifyOffer: "${p.id}" is marked (${option.readiness.status}) and its why does not say so`,
      );
  }
}

function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}

// The mark has to survive translation, so this cannot match on wording: it asks that the why
// carry a content word of the reason the brain produced.
function mentionsMark(why: string, reason: string): boolean {
  const words = reason
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 3);
  const hay = why.toLowerCase();
  return words.some((w) => hay.includes(w));
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test lib/brain/verify-offer.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/brain/verify-offer.ts lib/brain/verify-offer.test.ts
git commit -m "feat(brain): the model may write the offer, not change it"
```

---

### Task 14: Manifest v4 — the offer, the discards, the route, the channel

**Files:**
- Modify: `lib/loop/manifest.ts:13-27` (FormOption), `:41-48` (proposal), `:93` (input/run level), `:88` (schemaVersion)
- Modify: `lib/loop/migrate.ts`
- Test: `lib/loop/manifest.test.ts`, `lib/loop/migrate.test.ts`

**Interfaces:**
- Produces: `FormOption` + `engine`, `format`, `intent`, `whySource` · `proposal.excluded` · run-level `route: "embed" | "article"` and `channel: Channel` · `schemaVersion: 4`

- [ ] **Step 1: Write the failing tests**

```ts
// append to lib/loop/manifest.test.ts
import { parseManifest } from "./manifest";

test("v4 carries the route and the channel at run level", () => {
  const m = parseManifest({
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [],
    events: [],
  });
  expect(m.route).toBe("embed");
  expect(m.channel).toBe("article-web");
});

test("a proposal records what was discarded, with its reason", () => {
  const m = parseManifest({
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [
      {
        id: "e1",
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static",
              intent: ["change-over-time"],
              why: "…",
              whySource: {
                sheet: "chart/types/slope.md",
                fragments: ["a before/after"],
                facts: { rows: "8" },
              },
            },
          ],
          excluded: [{ id: "pie", reason: "8 categories — a pie takes at most 5" }],
        },
      },
    ],
    events: [],
  });
  expect(m.elements[0].proposal!.excluded![0].id).toBe("pie");
});

test("an unknown channel is refused", () => {
  expect(() =>
    parseManifest({
      runId: "r",
      schemaVersion: 4,
      route: "embed",
      channel: "billboard",
      input: {},
      elements: [],
      events: [],
    }),
  ).toThrow();
});
```

```ts
// append to lib/loop/migrate.test.ts
test("a v3 manifest migrates to v4 with the embed route and the web channel", () => {
  const dir = mkdtempSync(join(tmpdir(), "mig-v4-"));
  const v3 = {
    runId: "r",
    schemaVersion: 3,
    input: {},
    elements: [{ id: "e1", proposal: { options: [], chosenId: undefined } }],
    events: [],
  };
  const m = migrate(v3, dir);
  expect(m.schemaVersion).toBe(4);
  expect(m.route).toBe("embed");
  expect(m.channel).toBe("article-web");
  expect(m.elements[0].proposal!.excluded).toEqual([]);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test lib/loop/manifest.test.ts lib/loop/migrate.test.ts`
Expected: FAIL — schemaVersion literal is 3

- [ ] **Step 3: Extend the schema**

In `lib/loop/manifest.ts`:

```ts
import { INTENTS } from "../brain/intents";
import { VISUAL_FORMATS, CHANNELS as CHANNEL_KEYS } from "../core/vocabulary";

const WhySourceSchema = z.object({
  sheet: z.string(),
  fragments: z.array(z.string()),
  facts: z.record(z.string(), z.string()),
});

const FormOptionSchema = z.object({
  id: z.string(),
  nativeType: z.string(),
  /** Which engine will render it — the brain offers across engines, not just chart-native. */
  engine: z.string().optional(),
  format: z.enum(VISUAL_FORMATS).optional(),
  intent: z.array(z.enum(INTENTS)).optional(),
  why: z.string(),
  /** Where the why came from. Present on anything the brain built (spec §6). */
  whySource: WhySourceSchema.optional(),
  requires: z.array(z.string()).optional(),
  readiness: z
    .object({
      status: z.enum(["ready", "missing", "unverified", "disabled"]),
      reason: z.string(),
    })
    .optional(),
});
```

`engine`/`format`/`intent`/`whySource` are optional so a v3 option that migrated forward still parses; the brain always writes them.

In `RunElementSchema`, extend `proposal`:

```ts
  proposal: z
    .object({
      options: z.array(FormOptionSchema),
      // What the brain refused to offer, and why. State, not a sentence: it survives a resume
      // and the journalist can ask for one back (spec §6).
      excluded: z.array(z.object({ id: z.string(), reason: z.string() })).default([]),
      chosenId: z.string().optional(),
    })
    .optional(),
```

In `RunManifestSchema`:

```ts
  schemaVersion: z.literal(4),
  /** The relationship to the text: an embeddable element, or the visual article itself. */
  route: z.enum(["embed", "article"]).default("embed"),
  /** Where this run publishes — the SCOPE axis, and what produce renders at. */
  channel: z.enum(CHANNEL_KEYS).default("article-web"),
```

- [ ] **Step 4: Migrate v3 → v4**

In `lib/loop/migrate.ts`, add the step and chain it:

```ts
  if (obj.schemaVersion === 4) return parseManifest(raw);
  if (obj.schemaVersion === 3) return parseManifest(migrateV3toV4(raw));
  if (obj.schemaVersion === 2) return parseManifest(migrateV3toV4(migrateV2toV3(raw)));
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(
    migrateV3toV4(migrateV2toV3(migrateV1toV2(raw as V1Manifest, runDir))),
  );
```

```ts
// v3 had neither a route nor a channel: every v3 run was an embeddable element rendered for
// the web article, which is exactly what produce.ts hard-coded as STUBBED_CHANNEL. Writing
// those two defaults down is the migration — nothing is lost, a stub becomes state.
function migrateV3toV4(v3: unknown): unknown {
  const m = v3 as { elements?: Record<string, unknown>[] };
  return {
    ...(v3 as object),
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    elements: (m.elements ?? []).map((el) => {
      const proposal = el.proposal as Record<string, unknown> | undefined;
      return proposal
        ? { ...el, proposal: { excluded: [], ...proposal } }
        : el;
    }),
  };
}
```

Also update `readManifest`'s version check in `lib/loop/manifest.ts` from `!== 3` to `!== 4`.

- [ ] **Step 5: Run the loop suite**

Run: `bun test lib/loop`
Expected: PASS. Fixtures that hard-code `schemaVersion: 3` must be bumped to 4 with `route`/`channel` added — update them, do not loosen the schema.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/migrate.ts lib/loop/*.test.ts
git commit -m "feat(loop): the manifest holds the route, the channel and what the brain discarded"
```

---

### Task 15: Wire the brain into the loop

**Files:**
- Modify: `lib/newsroom/decor.ts:57-64` + `:96-113` (expose the house theme) · `lib/loop/propose.ts` (replaced wholesale) · `lib/loop/driver.ts:47-58` · `lib/loop/produce.ts:10-13`
- Test: `lib/newsroom/decor.test.ts`, `lib/loop/propose.test.ts` (rewritten), `lib/loop/driver.test.ts`

**Interfaces:**
- Consumes: `buildOffer`
- Produces: `propose(m: RunManifest, decor?: Decor): { options: FormOption[]; excluded: Excluded[] }` — **the return type changes**; `driver.ts` is its only production caller

- [ ] **Step 1: Write the failing test**

```ts
// lib/loop/propose.test.ts — replaces the hard-coded-rule tests
import { test, expect } from "bun:test";
import { propose } from "./propose";
import type { RunManifest } from "./manifest";

function run(numericColumns: string[], rowCount = 8): RunManifest {
  return {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["label", ...numericColumns], numericColumns, rowCount },
      supportsPoint: true,
    },
    elements: [{ id: "e1", angle: { confirmedTakeaway: "Les écarts se creusent entre 2019 et 2024", altInsight: "…", unit: "CHF" } }],
    events: [],
  };
}

test("it offers forms with an engine, a format and their grounding", () => {
  const { options } = propose(run(["2019", "2024"]));
  expect(options.length).toBeGreaterThan(0);
  expect(options.length).toBeLessThanOrEqual(3);
  for (const o of options) {
    expect(o.engine).toBeTruthy();
    expect(o.format).toBeTruthy();
    expect(o.whySource!.fragments.length).toBeGreaterThan(0);
  }
});

test("it reports what it discarded", () => {
  const { excluded } = propose(run(["2019", "2024"], 400));
  expect(excluded.length).toBeGreaterThan(0);
});

test("nothing before orient has run", () => {
  const m = run(["2019", "2024"]);
  const { options, excluded } = propose({ ...m, orient: undefined });
  expect(options).toEqual([]);
  expect(excluded).toEqual([]);
});

test("the channel constrains the offer", () => {
  const m = run(["2019", "2024"]);
  const { options } = propose({ ...m, channel: "social-vertical" });
  expect(options.every((o) => o.format !== "interactive")).toBe(true);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test lib/loop/propose.test.ts`
Expected: FAIL — `propose(...)` returns an array, not `{ options, excluded }`

- [ ] **Step 3: Put the house theme on the decor (the STYLE axis has no other way in)**

`loadDecor` already reads the `BrandProfile` (`lib/newsroom/decor.ts:102`) but projects only a delivery view — the house theme never reaches a caller. The STYLE axis needs it. Add the failing test first:

```ts
// append to lib/newsroom/decor.test.ts
test("the decor carries the house theme so the offer can judge what is renderable", () => {
  // Use this file's existing fixture helper to write a NEWSROOM-PROFILE.md with `theme: "#12233A"`
  // into a temp install root, then:
  const decor = loadDecor(root);
  expect(decor.theme).toBe("#12233A");
});

test("an install with no profile has no theme, not a fabricated light one", () => {
  expect(loadDecor(emptyRoot).theme).toBeUndefined();
});
```

Then, in `lib/newsroom/decor.ts`, add to the `Decor` type:

```ts
  /** The house ground: "light" | "dark" | "#rrggbb". Absent ⇒ the install declared none.
   *  It is the STYLE axis's only input: a dark ground is what makes a Datawrapper form
   *  physically unrenderable (spec §4.1). */
  theme?: string;
```

and to the returned object in `loadDecor`:

```ts
    ...(profile?.theme ? { theme: profile.theme } : {}),
```

Add the same to `neutralDecor()` (no theme — a decor that failed to load must not claim a house style). Run: `bun test lib/newsroom/decor.test.ts` — expect PASS.

- [ ] **Step 4: Replace `propose.ts`**

```ts
// lib/loop/propose.ts
// The loop's door onto the brain. It threads state in and shapes the offer out — every rule
// about WHAT may be offered lives in lib/brain (spec §3).
import type { Decor } from "../newsroom/decor";
import type { RunManifest, FormOption } from "./manifest";
import { buildOffer } from "../brain/offer";
import { deriveFacts } from "../brain/facts";
import { intentsFromAngle } from "../brain/rank-intent";
import type { Excluded } from "../brain/eligibility";

export function propose(
  m: RunManifest,
  decor?: Decor,
): { options: FormOption[]; excluded: Excluded[] } {
  const profile = m.orient?.profile;
  if (!profile) return { options: [], excluded: [] };
  const el = m.elements[0];
  const offer = buildOffer({
    facts: deriveFacts(profile),
    channel: m.channel,
    route: m.route,
    ...(decor ? { readiness: decor.readiness } : {}),
    ...(decor?.theme ? { themeBg: decor.theme } : {}),
    intents: intentsFromAngle(el?.angle?.confirmedTakeaway ?? ""),
  });
  return {
    options: offer.options.map((o) => ({
      id: o.id,
      nativeType: o.nativeType,
      engine: o.engine,
      format: o.format,
      intent: o.intent,
      // The brain hands over GROUNDING; the phrasing is the desk's turn, behind verifyOffer.
      // Until it has been phrased, the why IS the sheet's own first fragment — never blank.
      why: o.whySource.fragments[0],
      whySource: o.whySource,
      ...(o.requires ? { requires: o.requires } : {}),
      ...(o.readiness ? { readiness: o.readiness } : {}),
    })),
    excluded: offer.excluded,
  };
}
```

- [ ] **Step 5: Add the intent reader**

```ts
// lib/brain/rank-intent.ts
// Deriving an intent from the journalist's takeaway is the ONE semantic step, and it is
// deliberately crude: a keyword pass over the confirmed takeaway. It feeds the ranking only
// (spec §4.2), so being wrong costs an order, never a form. A richer reader can replace this
// file without touching anything else.
import { INTENTS, type Intent } from "./intents";

const CUES: Record<Intent, RegExp> = {
  "change-over-time": /\b(evolution|évolu|trend|tendance|since|depuis|grew|grow|augment|baiss|decline|entre \d{4}|over time|au fil)\b/i,
  magnitude: /\b(how (much|many)|combien|size|taille|total|amount|montant)\b/i,
  ranking: /\b(rank|classement|top|best|worst|highest|lowest|premier|dernier|plus élevé|plus faible)\b/i,
  "part-to-whole": /\b(share|part|proportion|percentage|pourcentage|breakdown|répartition|composition)\b/i,
  distribution: /\b(distribution|spread|répartit|range|écart-type|median|médiane|typical)\b/i,
  correlation: /\b(correlat|corrél|relationship|relation|link|lien|versus|vs\.?|against)\b/i,
  deviation: /\b(gap|écart|difference|différence|above|below|au-dessus|en dessous|deviation|surplus|deficit)\b/i,
  spatial: /\b(map|carte|region|région|canton|commune|country|pays|where|où|geograph|géograph)\b/i,
  flow: /\b(flow|flux|from .* to|transfer|migration|move[ds]? to)\b/i,
};

export function intentsFromAngle(takeaway: string): Intent[] {
  const hits = INTENTS.filter((i) => CUES[i].test(takeaway));
  // No cue ⇒ no intent: the ranking then falls back on fit and readiness, which is the honest
  // behaviour. It must NOT guess "magnitude" and quietly reorder the offer around a guess.
  return hits;
}
```

Add its test file `lib/brain/rank-intent.test.ts` with at least: a French takeaway about an evolution yields `change-over-time`; a takeaway with no cue yields `[]`; a takeaway naming cantons yields `spatial`.

- [ ] **Step 6: Update the driver and un-stub the channel**

`lib/loop/driver.ts`, the `propose` branch:

```ts
    case "propose": {
      if (!live) return run;
      const { options, excluded } = propose(run, decor);
      return {
        ...run,
        elements: [
          { ...live, proposal: { options, excluded } },
          ...run.elements.slice(1),
        ],
      };
    }
```

`lib/loop/produce.ts` — delete `STUBBED_CHANNEL` and its comment, and read the manifest instead:

```ts
// The channel is STATE now (manifest v4), not a stub: the brain offered within it, so produce
// must render within the same one.
const channel = run.channel;
```

Replace every `STUBBED_CHANNEL` use with `channel`.

- [ ] **Step 7: Run the full loop suite**

Run: `bun test lib && bunx tsc --noEmit -p skills/splash`
Expected: PASS — the whole `lib` suite green, tsc clean

- [ ] **Step 8: Commit**

```bash
git add lib/newsroom/decor.ts lib/newsroom/decor.test.ts lib/loop/propose.ts lib/loop/propose.test.ts lib/loop/driver.ts lib/loop/produce.ts lib/brain/rank-intent.ts lib/brain/rank-intent.test.ts
git commit -m "feat(loop): the propose beat asks the brain, and produce renders in the offered channel"
```

---

### Task 16: End-to-end, and one source of truth for selection

**Files:**
- Create: `lib/brain/acceptance.test.ts`
- Modify: `skills/suggest-chart/SKILL.md`

**Interfaces:**
- Consumes: everything above

- [ ] **Step 1: Write the failing acceptance test**

```ts
// lib/brain/acceptance.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance } from "../loop/driver";
import { freezeInput } from "../loop/freeze";
import { nextActions, type RunManifest } from "../loop/manifest";
import { verifyOffer } from "./verify-offer";

const CSV = `canton,2019,2024
Genève,1200,1850
Vaud,980,1410
Valais,760,1120
Fribourg,700,1010
Jura,640,900
Neuchâtel,610,880
Berne,590,870
Zurich,1500,2100
`;

function newRun(): { run: RunManifest; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "brain-e2e-"));
  const src = join(dir, "src.csv");
  writeFileSync(src, CSV);
  const data = freezeInput(dir, src, "data");
  return {
    dir,
    run: {
      runId: "e2e",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data },
      elements: [{ id: "e1" }],
      events: [],
    },
  };
}

test("a real run reaches an offer that carries its discards and can be phrased", async () => {
  const { run, dir } = newRun();
  let m = await advance(run, dir); // orient
  expect(m.orient!.supportsPoint).toBe(true);

  m = {
    ...m,
    elements: [
      {
        ...m.elements[0],
        angle: {
          confirmedTakeaway: "L'écart entre cantons se creuse entre 2019 et 2024",
          altInsight: "Tous les cantons montent, Zurich le plus fort",
          unit: "CHF",
        },
      },
    ],
  };
  expect(nextActions(m)).toEqual(["propose"]);

  m = await advance(m, dir); // propose
  const proposal = m.elements[0].proposal!;
  expect(proposal.options.length).toBeGreaterThan(0);
  expect(proposal.options.length).toBeLessThanOrEqual(3);
  for (const o of proposal.options) expect(o.whySource).toBeDefined();

  // the phrasing seam: a faithful rendering of the offer passes its guard
  const phrased = proposal.options.map((o) => ({
    id: o.id,
    why: `${o.whySource!.fragments[0]} (${o.whySource!.facts.rows} lignes, ${o.whySource!.facts.points} points)${o.readiness ? ` — ${o.readiness.reason}` : ""}`,
  }));
  expect(() =>
    verifyOffer(phrased, {
      options: proposal.options.map((o) => ({
        id: o.id,
        nativeType: o.nativeType,
        engine: o.engine!,
        format: o.format!,
        intent: o.intent!,
        ...(o.readiness ? { readiness: o.readiness } : {}),
        whySource: o.whySource!,
      })),
      excluded: proposal.excluded ?? [],
    }),
  ).not.toThrow();

  expect(nextActions(m)).toEqual(["choose-form"]);
});

test("a run whose channel forbids interactive is never offered one", async () => {
  const { run, dir } = newRun();
  let m = await advance({ ...run, channel: "social-vertical" }, dir);
  m = {
    ...m,
    elements: [
      {
        ...m.elements[0],
        angle: {
          confirmedTakeaway: "L'écart se creuse entre 2019 et 2024",
          altInsight: "…",
          unit: "CHF",
        },
      },
    ],
  };
  m = await advance(m, dir);
  for (const o of m.elements[0].proposal!.options)
    expect(o.format).not.toBe("interactive");
});
```

- [ ] **Step 2: Run it and watch it fail (then pass)**

Run: `bun test lib/brain/acceptance.test.ts`
Expected: FAIL first if any wiring is off; fix the wiring, never the assertion.

- [ ] **Step 3: Strip the selection logic from `suggest-chart`**

Read `skills/suggest-chart/SKILL.md` in full. Delete the sections that decide WHICH type to use (the intent→type reasoning, the per-type "use this when" prose, the fallback routing rules) — the typology owns them now. Keep only what is about emitting a spec for a chosen type. At the top of what remains, add:

```markdown
> Type selection is NOT decided here. `lib/brain` computes the legal set from the KB sheets
> (`knowledge/references/**/types/*.md` frontmatter) and offers it to the journalist; this
> skill only emits a spec for the form that was chosen. Adding or changing a type is an edit
> to its sheet, never to this file.
```

Then confirm nothing still depends on what was removed:

```bash
grep -rn "suggest-chart" --include=*.ts --include=*.mjs lib skills | grep -v node_modules
```

Any hit that reads the deleted prose is a real break — fix it in this task.

- [ ] **Step 4: Run the full gate**

Run: `bun run check`
Expected: all checks green (the pre-existing map-native interactive produce test may flake under contention — re-run it alone before treating it as a regression, per CLAUDE.md).

- [ ] **Step 5: Commit**

```bash
git add lib/brain/acceptance.test.ts skills/suggest-chart/SKILL.md
git commit -m "feat(brain): prove the offer end to end, and leave one source of truth for selection"
```

---

## Self-Review

**Spec coverage.** §3 architecture → Tasks 3-4, 10-13 (one file per unit) · §3 registry-sourced catalogue → Task 2 · §4.1 legality, four axes → Task 10 (data shape, channel, capability, style) with the channel hoist in Task 1 · §4.2 soft ranking + the invariant → Task 11, plus `rank-intent.ts` in Task 15 · §5 frontmatter contract → Tasks 3-8 · §5 three drift tests → Task 9 · §6 manifest contract (FormOption, excluded, route, channel, v4 + migration) → Task 14 · §7 model seam + guard → Task 13 · §8 prose/data routing → Task 10 (`ARTICLE_BRANCH_ENGINES` marking) + Task 14 (`route`) · §9 retiring suggest-chart → Task 16 · §10 off-ramps → Task 10 (reasons), Task 4 (fail-hard load), Task 12 (empty offer that explains itself) · §11 tests → each task's test block · §12 success criteria → Task 16 acceptance.

**Known gaps, named rather than hidden.** (1) The STYLE axis needed a field that did not exist: `Decor` reads the `BrandProfile` but exposed only a delivery view, so Task 15 Step 3 adds `Decor.theme` with its own failing test rather than reaching through a path that was never there. (2) Task 8's sweep depends on which types each catalogue actually declares; the step includes the exact command that prints the truth before any sheet is written. (3) The fit nudge is a plain 0..1 ratio computed once in eligibility (`Candidate.fill`) and consumed by the ranking — deliberately simple. The test that matters in Task 11 is the invariant, not the tie-break.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-proposal-brain.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — tasks executed in this session with checkpoints for review.

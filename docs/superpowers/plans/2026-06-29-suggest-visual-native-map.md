# suggest-visual native-map routing (slice 1b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route a geographic story that the format ladder escalates to interactive/video to the NATIVE map (`map-native`), not the static `map-dw`. Add `validateChoroplethConfig` to map-native, teach `scoreSpec` to discriminate the two map producers, broaden the suggester's map branch, and prove it.

**Architecture:** A new framework-free `validateChoroplethConfig` in map-native validates the raw config the suggester emits. `scoreSpec` discriminates `producer: "map-dw"` (→ `validateMapSpec`) vs `producer: "map-native"` (→ `validateChoroplethConfig`) and can assert `expect.producer`. `suggest-chart/SKILL.md` applies the format ladder within the map family (static→map-dw, interactive/video→map-native). Producer seam already exists (`map-native/scripts/produce.mjs <config.json>`).

**Tech Stack:** Bun, TypeScript, bun:test. Skills: `map-native` (the native producer + new validator), `suggest-chart` (the suggester + eval).

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages in English.
- **No attribution:** never mention Claude/Anthropic. No `Co-Authored-By`.
- **Grounded routing:** the static-vs-native choice follows the format ladder (`<repo-root>/knowledge/references/formats/format-selection.md`, Gates 1–4) — static→`map-dw`, interactive/video→`map-native`. Gate 5 (map vs chart) is unchanged from slice 1.
- **Each engine owns its spec validation** (`validateChartSpec`/`validateMapSpec`/`validateChoroplethConfig`).
- **Key hygiene:** the MapTiler key (map-native produce) via env only; never hard-code/log it.

## Reused interfaces

- `ChoroplethData` (`skills/map-native/src/choropleth-geo.ts`): `{ regionKey: string; valueField: string; rows: Record<string, string|number>[] }`. The full config adds `basemap, title, description?, unit?, valueUnit?, source?: {name,url}`.
- `validateChartSpec` / `validateMapSpec` already imported by `skills/suggest-chart/eval/score.ts`.
- `scoreSpec(spec, expect)` + `Expectation` (`skills/suggest-chart/eval/score.ts`).

---

### Task 1: `validateChoroplethConfig` in map-native

**Files:**
- Create: `skills/map-native/src/validate-config.ts`
- Test: `skills/map-native/tests/validate-config.test.ts`

**Interfaces:**
- Produces: `export function validateChoroplethConfig(spec: unknown): { ok: true; spec: ChoroplethConfigShape; warnings: string[] } | { ok: false; errors: string[] }`.
- `ChoroplethConfigShape = ChoroplethData & { basemap: string; title: string; description?: string; unit?: string; valueUnit?: string; source?: { name?: string; url?: string } }`.

- [ ] **Step 1: Write the failing tests**

Create `skills/map-native/tests/validate-config.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { validateChoroplethConfig } from "../src/validate-config";

const ok = {
  regionKey: "code",
  valueField: "share",
  rows: [{ code: "NOR", share: 99 }, { code: "POL", share: 21 }],
  basemap: "world",
  title: "Renewables form a clear north–south gradient across Europe",
  description: "Share of electricity from renewables, by country, 2024",
  valueUnit: "%",
  source: { name: "Ember", url: "https://example.org" },
};

describe("validateChoroplethConfig", () => {
  it("accepts a well-formed config", () => {
    const r = validateChoroplethConfig(ok);
    expect(r.ok).toBe(true);
    expect(r.ok && r.warnings.length).toBe(0);
  });
  it("errors when rows is empty or a row lacks the keys", () => {
    expect(validateChoroplethConfig({ ...ok, rows: [] }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, rows: [{ code: "NOR" }] }).ok).toBe(false); // no share
    expect(validateChoroplethConfig({ ...ok, rows: [{ code: "NOR", share: "x" }] }).ok).toBe(false); // non-numeric
  });
  it("errors on a missing regionKey/valueField/basemap", () => {
    expect(validateChoroplethConfig({ ...ok, regionKey: "" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, valueField: "" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, basemap: "" }).ok).toBe(false);
  });
  it("errors on a title that is not an insight (too short / a year range)", () => {
    expect(validateChoroplethConfig({ ...ok, title: "Map" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, title: "2019–2024" }).ok).toBe(false);
  });
  it("warns (furniture) when description or source is missing", () => {
    const r1 = validateChoroplethConfig({ ...ok, description: undefined });
    expect(r1.ok && r1.warnings.some((w) => /description/i.test(w))).toBe(true);
    const r2 = validateChoroplethConfig({ ...ok, source: undefined });
    expect(r2.ok && r2.warnings.some((w) => /source/i.test(w))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/validate-config.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/validate-config.ts`**

```ts
import type { ChoroplethData } from "./choropleth-geo";

export type ChoroplethConfigShape = ChoroplethData & {
  basemap: string;
  title: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  source?: { name?: string; url?: string };
};

// Framework-free structural validation of the raw map-native config the suggester
// emits (pre-render — no MapTiler / geojson needed). Errors block; warnings flag the
// furniture standard (title + description + source).
export function validateChoroplethConfig(
  spec: unknown,
):
  | { ok: true; spec: ChoroplethConfigShape; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (spec ?? {}) as Record<string, unknown>;

  const regionKey = typeof s.regionKey === "string" ? s.regionKey.trim() : "";
  const valueField = typeof s.valueField === "string" ? s.valueField.trim() : "";
  if (!regionKey) errors.push("regionKey must be a non-empty string");
  if (!valueField) errors.push("valueField must be a non-empty string");
  if (typeof s.basemap !== "string" || !s.basemap.trim())
    errors.push("basemap must be a non-empty string");

  const rows = s.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push("rows must be a non-empty array");
  } else if (regionKey && valueField) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown> | null;
      if (!row || typeof row !== "object") {
        errors.push(`row ${i} is not an object`);
        continue;
      }
      if (!(regionKey in row)) errors.push(`row ${i} missing "${regionKey}"`);
      if (!(valueField in row)) {
        errors.push(`row ${i} missing "${valueField}"`);
      } else if (typeof row[valueField] !== "number" || Number.isNaN(row[valueField])) {
        errors.push(`row ${i} "${valueField}" must be numeric`);
      }
    }
  }

  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (title.length < 12) errors.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    errors.push(`title is a year range, not an insight: "${title}"`);

  // Furniture standard (warnings, not blockers).
  if (typeof s.description !== "string" || !s.description.trim())
    warnings.push("missing description — a module should state what/when/where");
  const src = s.source as { name?: string; url?: string } | undefined;
  if (!src?.name?.trim() || !src?.url?.trim())
    warnings.push("missing source (name + url) — an embedded module should carry its own source");

  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as ChoroplethConfigShape, warnings };
}
```

- [ ] **Step 4: Run the gates**

Run: `cd skills/map-native && bun test` → whole suite passes (new validate-config tests + existing).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/validate-config.ts skills/map-native/tests/validate-config.test.ts
git commit -m "feat(map-native): validateChoroplethConfig — structural validation of the raw map config"
```

---

### Task 2: `scoreSpec` discriminates the two map producers

**Files:**
- Modify: `skills/suggest-chart/eval/score.ts`
- Test: `skills/suggest-chart/eval/tests/score.test.ts`

**Interfaces:**
- `Expectation` gains `producer?: "dw-chart" | "chart-native" | "map-dw" | "map-native"`.
- When the emitted spec is a map: `producer === "map-native"` → validate via `validateChoroplethConfig`; else (`map-dw` / basemap+mapKeyAttr) → `validateMapSpec` (slice 1). If `expect.producer` is set, the emitted producer must match.

- [ ] **Step 1: Write the failing tests**

In `eval/tests/score.test.ts`, add:

```ts
import { scoreSpec } from "../score";

const nativeMap = {
  producer: "map-native",
  regionKey: "code",
  valueField: "share",
  rows: [{ code: "NOR", share: 99 }, { code: "POL", share: 21 }],
  basemap: "world",
  title: "Renewables form a clear north–south gradient across Europe",
  description: "Share of electricity from renewables, by country, 2024",
  valueUnit: "%",
  source: { name: "Ember", url: "https://example.org" },
};

describe("scoreSpec — native map", () => {
  it("passes a valid map-native config when producer map-native is expected", () => {
    const r = scoreSpec(nativeMap, { family: "geographic", element: "map", producer: "map-native" });
    expect(r.pass).toBe(true);
  });
  it("fails when producer map-native is expected but a map-dw spec was emitted", () => {
    const mapDw = {
      producer: "map-dw", mapType: "choropleth", basemap: "world", mapKeyAttr: "ISO_A3",
      regionKey: "code", valueColumn: "share", data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    const r = scoreSpec(mapDw, { family: "geographic", element: "map", producer: "map-native" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /producer/i.test(n))).toBe(true);
  });
  it("still accepts a map-dw spec when producer is unset (element-level only)", () => {
    const mapDw = {
      producer: "map-dw", mapType: "choropleth", basemap: "world", mapKeyAttr: "ISO_A3",
      regionKey: "code", valueColumn: "share", data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    expect(scoreSpec(mapDw, { family: "geographic", element: "map" }).validates).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/suggest-chart && bun test eval/tests/score.test.ts` → FAIL.

- [ ] **Step 3: Implement**

In `score.ts`: import `validateChoroplethConfig` from `../../map-native/src/validate-config`; add `producer?: "dw-chart" | "chart-native" | "map-dw" | "map-native"` to `Expectation`. In the existing `if (isMap)` block, BEFORE validating:

```ts
    const producer = (spec as Record<string, unknown>)?.["producer"];
    if (expect.producer && producer !== expect.producer) {
      notes.push(`expected producer "${expect.producer}", got "${producer ?? "(none)"}"`);
      return { validates: false, familyMatch: false, guardrailsOk: false, pass: false, notes };
    }
    const isNative = producer === "map-native";
    const v = isNative ? validateChoroplethConfig(spec) : validateMapSpec(spec);
    if (!v.ok) notes.push(...v.errors);
    const warns = v.ok ? v.warnings.length : Infinity;
    const guardrailsOk = warns <= (expect.maxWarnings ?? 0);
    if (!guardrailsOk) notes.push(`map: ${warns} warnings > ${expect.maxWarnings ?? 0}`);
    return { validates: v.ok, familyMatch: true, guardrailsOk, pass: v.ok && guardrailsOk, notes };
```

(Replace the slice-1 map block that called `validateMapSpec` unconditionally with this producer-aware version. Keep the `wantMap !== isMap` Gate-5 check above it unchanged.)

- [ ] **Step 4: Run the gates**

Run: `cd skills/suggest-chart && bun test` → whole suite passes (slice-1 map tests + new native-map tests + chart tests).

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/eval/score.ts skills/suggest-chart/eval/tests/score.test.ts
git commit -m "feat(suggest): score discriminates map-dw vs map-native (validateChoroplethConfig + expect.producer)"
```

---

### Task 3: SKILL.md map-format ladder + eval case + live e2e

**Files:**
- Modify: `skills/suggest-chart/SKILL.md`
- Create: `skills/suggest-chart/eval/cases/eu-renewables-explore.json`
- Create/append: `skills/suggest-chart/eval/e2e-map-proof.md` (a native-map section)

- [ ] **Step 1: Broaden the map branch in SKILL.md**

In the `map-dw` / map area of `SKILL.md`: after Gate 5 routes to a map, apply the FORMAT ladder within the map family — **static** (default) → `map-dw` (`MapSpec`, slice 1); **interactive** (Gate 2) or **video** (Gate 4) → **`map-native`**: emit `{ producer: "map-native", regionKey, valueField, rows:[{<regionKey>,<valueField>}…], basemap:"world", title (insight), description, unit, valueUnit, source }`. Region codes MUST be ISO-A3 (else fall back to `map-dw` or bars). Self-check via map-native's `validateChoroplethConfig`. Produce with `bun skills/map-native/scripts/produce.mjs <config.json> <outDir> [all|static]` (key from `.env`, never logged). Keep the slice-1 `map-dw` path + all chart paths intact.

- [ ] **Step 2: Add the eval case**

`eval/cases/eu-renewables-explore.json` — a spatial story with an exploration hook → expect `map-native`:
```json
{
  "id": "eu-renewables-explore",
  "data": "code,share\nNOR,99\nSWE,68\nDEU,59\nGBR,48\nFRA,27\nESP,44\nITA,41\nPOL,21",
  "intent": "Let readers explore how each European country's renewable share compares — find your country on the map",
  "expect": { "family": "geographic", "element": "map", "producer": "map-native", "maxWarnings": 0 }
}
```

- [ ] **Step 3: Live e2e — emit a native config from a spatial+interactive story → produce**

Construct the `{ producer:"map-native", …ChoroplethConfig }` for the explore case; validate it with `validateChoroplethConfig` (must be ok); write it to a temp JSON; run `bun skills/map-native/scripts/produce.mjs <config.json> /tmp/system-test/native-map all` (key sourced from `.env`, never logged) → interactive HTML + 3 mp4s + static PNG. Append a "native map (interactive/video)" section to `eval/e2e-map-proof.md` recording the config, the validation result, and the produced artifact paths. The controller eyeballs the interactive + a video still.

- [ ] **Step 4: Gates**

Run: `cd skills/suggest-chart && bun test` → green. Confirm `eu-renewables-explore.json` is valid JSON.

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/SKILL.md skills/suggest-chart/eval/cases/eu-renewables-explore.json skills/suggest-chart/eval/e2e-map-proof.md
git commit -m "feat(suggest): map format ladder (static→map-dw, interactive/video→map-native) + explore eval case + native e2e"
```

## Notes for the executor

- The controller will visually verify the produced native map (interactive HTML + a video still) in Task 3's e2e.
- Slice 1b is interactive/video map via `map-native`. Do NOT wire scrolly (slice 2) or symbol maps.
- ISO-A3 is the join key for the `world` preset; a story whose region codes can't be matched to ISO-A3 falls back to `map-dw` or bars — never force a native map onto unmatched regions.
- Never hard-code or log the MapTiler/Datawrapper token.

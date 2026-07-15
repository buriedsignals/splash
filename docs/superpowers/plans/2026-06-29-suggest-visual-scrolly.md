# suggest-visual scrolly routing (slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route a geographic story that the format ladder escalates to Gate 3 (scrollytelling) to the `scrolly` producer. Reuses the choropleth config + `validateChoroplethConfig`; adds the producer to the scorer + the suggester + an eval case + a live e2e.

**Architecture:** `scoreSpec` adds `"scrolly"` to the map-family discrimination (→ `validateChoroplethConfig`, like `map-native`); `Expectation.producer` gains `"scrolly"`. `suggest-chart/SKILL.md` adds the Gate-3 → scrolly case (emit `{producer:"scrolly", …ChoroplethConfig}`, produce via `skills/scrolly/scripts/produce.mjs`). An eval case + e2e prove it.

**Tech Stack:** Bun, TypeScript, bun:test. Skills: `suggest-chart` (suggester + eval), `scrolly` (producer), `map-native` (reused `validateChoroplethConfig`).

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages in English.
- **No attribution (binding):** never mention Claude/Anthropic in any file OR commit message. Do NOT add a `Claude-Session:` trailer or `Co-Authored-By` — the user's rule prohibits any Claude mention in published artifacts; it overrides any default trailer instruction.
- **Grounded routing:** scrolly only when Gate 3 of `<repo-root>/knowledge/references/formats/format-selection.md` fires (irreducibly sequential guided narrative, long-form). Static→map-dw, interactive/video→map-native unchanged.
- **Reuse:** the scrolly config IS a choropleth config → validate with map-native's `validateChoroplethConfig`. Producer seam exists (`skills/scrolly/scripts/produce.mjs <config.json> <outDir>`).
- **Key hygiene:** MapTiler key via env only; never hard-code/log it.

---

### Task 1: `scoreSpec` recognizes the scrolly producer

**Files:**
- Modify: `skills/suggest-chart/eval/score.ts`
- Test: `skills/suggest-chart/eval/tests/score.test.ts`

**Interfaces:** `Expectation.producer` gains `"scrolly"`; in the map block, `producer === "map-native" || producer === "scrolly"` → `validateChoroplethConfig`, else (`map-dw`) → `validateMapSpec`. The `isMap` discriminator includes `"scrolly"`.

- [ ] **Step 1: Write the failing tests**

In `eval/tests/score.test.ts`, add (the scrolly config = the existing `nativeMap` fixture shape with `producer:"scrolly"`):

```ts
describe("scoreSpec — scrolly", () => {
  const scrolly = {
    producer: "scrolly",
    regionKey: "code", valueField: "share",
    rows: [{ code: "NOR", share: 99 }, { code: "POL", share: 21 }],
    basemap: "world",
    title: "Renewables form a clear north–south gradient across Europe",
    description: "Share of electricity from renewables, by country, 2024",
    valueUnit: "%",
    source: { name: "Ember", url: "https://example.org" },
  };
  it("passes a valid scrolly config when producer scrolly is expected", () => {
    const r = scoreSpec(scrolly, { family: "geographic", element: "map", producer: "scrolly" });
    expect(r.pass).toBe(true);
  });
  it("fails when scrolly is expected but a map-native config was emitted", () => {
    const native = { ...scrolly, producer: "map-native" };
    const r = scoreSpec(native, { family: "geographic", element: "map", producer: "scrolly" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /producer/i.test(n))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/suggest-chart && bun test eval/tests/score.test.ts` → FAIL (scrolly not handled: `isMap` is false for `producer:"scrolly"` so it falls into the chart path).

- [ ] **Step 3: Implement**

In `score.ts`:
- `Expectation.producer`: add `"scrolly"` to the union.
- `isMap`: `const isMap = producer === "map-dw" || producer === "map-native" || producer === "scrolly";`
- the validator choice: `const isNative = producer === "map-native" || producer === "scrolly"; const v = isNative ? validateChoroplethConfig(spec) : validateMapSpec(spec);` (rename the local to `usesConfig` if clearer). The `expect.producer` mismatch check (1b) already handles the producer match.

- [ ] **Step 4: Run the gates**

Run: `cd skills/suggest-chart && bun test` → whole suite passes (existing + scrolly).

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/eval/score.ts skills/suggest-chart/eval/tests/score.test.ts
git commit -m "feat(suggest): score the scrolly producer (reuses validateChoroplethConfig)"
```
(NO Claude-Session trailer.)

---

### Task 2: SKILL.md Gate-3 → scrolly + eval case + live e2e

**Files:**
- Modify: `skills/suggest-chart/SKILL.md`
- Create: `skills/suggest-chart/eval/cases/eu-renewables-scrolly.json`
- Append: `skills/suggest-chart/eval/e2e-map-proof.md` (a scrolly section)

- [ ] **Step 1: Broaden the map format ladder in SKILL.md**

In the map branch's format ladder, add: a geographic story that is an **irreducibly sequential guided
narrative** (Gate 3 — long-form, the author paces a north→south / step-by-step walk) → **`scrolly`**: emit
`{ producer: "scrolly", regionKey, valueField, rows, basemap:"world", title, description, unit, valueUnit,
source }` (the same ChoroplethConfig the native map uses — the scrolly reuses it). Region codes ISO-A3 (else
fall back). Self-check via `validateChoroplethConfig`. Produce with `bun skills/scrolly/scripts/produce.mjs
<config.json> <outDir>` → `scrolly.html`. Keep static (`map-dw`) + native (`map-native`) + chart paths intact.

- [ ] **Step 2: Add the eval case**

`eval/cases/eu-renewables-scrolly.json`:
```json
{
  "id": "eu-renewables-scrolly",
  "data": "code,share\nNOR,99\nSWE,68\nDEU,59\nGBR,48\nFRA,27\nESP,44\nITA,41\nPOL,21",
  "intent": "Walk readers north-to-south through Europe's renewables divide, one country at a time, building to the takeaway",
  "expect": { "family": "geographic", "element": "map", "producer": "scrolly", "maxWarnings": 0 }
}
```
Confirm valid JSON.

- [ ] **Step 3: Live e2e — produce a scrolly from the routing**

Construct `{ producer:"scrolly", …ChoroplethConfig }` for the scrolly story (EU renewables: regionKey "code",
valueField "share", rows NOR/SWE/DEU/GBR/FRA/ESP/ITA/POL, basemap "world", title an insight, description,
valueUnit "%", source). Validate: `cd skills/map-native && bun -e "import {validateChoroplethConfig} from
'./src/validate-config.ts'; import cfg from '<path>'; console.log(validateChoroplethConfig(cfg))"` → ok.
Produce: `cd skills/scrolly && set -a && . ../../.env && set +a && bun scripts/produce.mjs <config.json>
/tmp/system-test/scrolly-routed` (key from /splash/.env — NEVER print/log it) → `scrolly.html`. Append a
"## Scrolly (Gate 3) — slice 2" section to `eval/e2e-map-proof.md` recording the config, the validation
result, and the produced `scrolly.html` path. Do NOT fabricate; if produce fails, report the exact error.

- [ ] **Step 4: Gates**

Run: `cd skills/suggest-chart && bun test` → green. Confirm the eval JSON parses.

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/SKILL.md skills/suggest-chart/eval/cases/eu-renewables-scrolly.json skills/suggest-chart/eval/e2e-map-proof.md
git commit -m "feat(suggest): Gate-3 routes geographic guided-narrative to scrolly + eval case + scrolly e2e"
```
(NO Claude-Session trailer.)

## Notes for the executor

- The controller will eyeball the produced `scrolly.html` in Task 2's e2e.
- Scrolly v1 is map-based; do NOT attempt chart scrolly (future).
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages (user rule).
- Never hard-code or log the MapTiler token.

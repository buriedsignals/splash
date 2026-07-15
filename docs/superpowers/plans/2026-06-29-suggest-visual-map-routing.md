# suggest-visual map routing (slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the suggester route a claim to chart vs map (grounded by the format-selection ladder + Gate 5), and wire the first map producer path — static choropleth via `map-dw`. A genuinely spatial story yields a real map; a ranking-of-regions story correctly stays a sorted bar chart.

**Architecture:** Extend the suggester's deterministic gate (`eval/score.ts`) to recognize a MAP decision (validate a `MapSpec` via `map-dw`'s `validateMapSpec`, enforce the chart-vs-map expectation). Broaden `suggest-chart/SKILL.md`'s runtime to detect geographic data, apply Gate 5 and the format ladder, and emit a `MapSpec` (producer `map-dw`) for the static-map case. Add eval cases proving both directions + a live e2e map.

**Tech Stack:** Bun, TypeScript, bun:test. Skills: `suggest-chart` (the suggester), `map-dw` (the static-map producer), `dw-chart` (chart validator).

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages in English.
- **No attribution:** never mention Claude/Anthropic. No `Co-Authored-By`. Commit trailer (only if used) EXACTLY: `Claude-Session: https://claude.ai/code/session_01Paz87P3M49t27P9GksL246`
- **Grounded judgment:** the routing follows `<repo-root>/knowledge/references/formats/format-selection.md` (the ladder + Gate 5) + `chart-selection.md` — NOT a new hardcoded heuristic. Gate 5: geographic data → map ONLY when the spatial pattern is the story (+ normalized + legible regions); else a sorted bar chart.
- **Key hygiene:** the Datawrapper token comes from `/splash/.env` (`DATAWRAPPER_API_TOKEN`); never hard-code or log it.
- **Honest provenance:** prose-extracted figures keep an honest source (the source the article names); a value charted/mapped must appear verbatim in the article.

## Reused interfaces

- `validateChartSpec` (`skills/dw-chart/src/chart-spec.ts`) → `{ ok, spec, warnings } | { ok:false, errors }`.
- `validateMapSpec` (`skills/map-dw/src/map-spec.ts`) → `{ ok, spec, warnings } | { ok:false, errors }`. `MapSpec = ChoroplethMapSpec | SymbolMapSpec | LocatorMapSpec`; `ChoroplethMapSpec = { basemap, mapKeyAttr, regionKey, valueField, title, source?, … }`.
- `scoreSpec(spec, expect)` + `Expectation` (`skills/suggest-chart/eval/score.ts`).

---

### Task 1: Score a map decision — extend `scoreSpec`

**Files:**
- Modify: `skills/suggest-chart/eval/score.ts`
- Test: `skills/suggest-chart/eval/tests/score.test.ts` (or the existing score test file — find it)

**Interfaces:**
- `Expectation` gains `element?: "chart" | "map"` (default `"chart"`).
- A map spec is discriminated by `producer === "map-dw"` (or a `basemap` field). When the expected element is `map`, validate via `validateMapSpec`; when `chart`, the current `validateChartSpec` path. A mismatch (expected chart, got a map — or vice versa) fails with a Gate-5 note.

- [ ] **Step 1: Write the failing tests**

Find the existing score test (`grep -rl scoreSpec skills/suggest-chart/eval/tests`). Add:

```ts
import { scoreSpec } from "../score";

const validMap = {
  producer: "map-dw",
  basemap: "world",
  mapKeyAttr: "ISO_A3",
  regionKey: "code",
  valueField: "share",
  title: "Renewables form a clear north–south gradient across Europe",
  source: { name: "Ember", url: "https://example.org" },
  data: "code,share\nNOR,99\nFRA,27",
};

describe("scoreSpec — map routing", () => {
  it("passes a valid map when a map is expected", () => {
    const r = scoreSpec(validMap, { family: "geographic", element: "map" });
    expect(r.pass).toBe(true);
  });
  it("fails when a map is expected but a chart was emitted (under-routing)", () => {
    const chart = { type: "d3-bars", title: "x", data: "code,share\nNOR,99", altInsight: "x" };
    const r = scoreSpec(chart, { family: "geographic", element: "map" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map/i.test(n))).toBe(true);
  });
  it("fails when a chart is expected but a map was emitted (Gate 5: ranking should stay bars)", () => {
    const r = scoreSpec(validMap, { family: "ranking", element: "chart" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map|gate 5/i.test(n))).toBe(true);
  });
  it("defaults element to chart (existing behaviour unchanged)", () => {
    const chart = { type: "d3-bars", title: "Departments by budget share", data: "department,budget\nEducation,42\nRoads,31\nHealth,28", altInsight: "Education gets the largest share", baseColor: "#0072B2", sort: "desc" };
    const r = scoreSpec(chart, { family: "ranking" }); // no element → chart
    expect(r.validates).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/suggest-chart && bun test eval/tests/` (the score test) — FAIL (element/map not handled).

- [ ] **Step 3: Implement**

In `score.ts`: import `validateMapSpec` from `../../map-dw/src/map-spec`; add `element?: "chart" | "map"` to `Expectation`. Near the top of `scoreSpec` (after the `"none"` branch), add the element discrimination:

```ts
  const producer = (spec as Record<string, unknown> | null)?.["producer"];
  const isMap =
    producer === "map-dw" ||
    (!!spec && typeof spec === "object" && "basemap" in (spec as object));
  const wantMap = expect.element === "map";

  if (wantMap !== isMap) {
    notes.push(
      wantMap
        ? "expected a map, got a chart — the spatial pattern is the story (Gate 5)"
        : "expected a chart, got a map — ranking/magnitude should stay bars (Gate 5)",
    );
    return { validates: false, familyMatch: false, guardrailsOk: false, pass: false, notes };
  }

  if (isMap) {
    const v = validateMapSpec(spec);
    if (!v.ok) notes.push(...v.errors);
    const warns = v.ok ? v.warnings.length : Infinity;
    const guardrailsOk = warns <= (expect.maxWarnings ?? 0);
    if (!guardrailsOk) notes.push(`map: ${warns} warnings > ${expect.maxWarnings ?? 0}`);
    return {
      validates: v.ok,
      familyMatch: true, // a map is its own element; family is geographic by construction
      guardrailsOk,
      pass: v.ok && guardrailsOk,
      notes,
    };
  }
```

Leave the existing chart-scoring code below this block unchanged (it runs when `isMap` is false).

- [ ] **Step 4: Run the gates**

Run: `cd skills/suggest-chart && bun test` → all pass (new map tests + existing chart tests).

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/eval/score.ts skills/suggest-chart/eval/tests/
git commit -m "feat(suggest): score a map decision (validateMapSpec + chart-vs-map Gate-5 enforcement)"
```

---

### Task 2: Broaden the suggester runtime — `suggest-chart/SKILL.md`

**Files:**
- Modify: `skills/suggest-chart/SKILL.md`

**Interfaces:** documentation/procedure — no code.

- [ ] **Step 1: Broaden the scope + runtime**

Edit `SKILL.md`:
- **Description/overview:** broaden from "decide which chart" to "decide the visual ELEMENT (chart or map) + FORMAT + producer". Add keywords: map, choropleth, geographic, map-dw, format selection.
- **Runtime procedure** — insert these steps (grounded, citing the KB):
  1. After profiling, **detect geographic structure**: a column of region identifiers (country names / ISO-A2/A3 / a recognised admin code). Record the region column + candidate basemap.
  2. **Gate 5 (geographic only):** read `<repo-root>/knowledge/references/formats/format-selection.md` (Gate 5). Emit a **map** ONLY when the spatial pattern is the story AND the value is a normalized rate AND the regions are legible (or a self-location motive). OTHERWISE emit a **sorted bar chart** (`d3-bars`, `sort:"desc"`) — the honest default for "which region is highest". State WHY (cite Gate 5).
  3. **Format (Gates 1–4):** static is the default; escalate to interactive/scrolly/video only on the named conditions. Slice 1 PRODUCES the static path; for a map that is `map-dw`. (Record a richer-format recommendation if the judgment warrants it — produced in later slices.)
- **Producer section:** add the **map** producer — `map-dw` (static choropleth). Document the emitted spec for the map case: a `MapSpec` with `producer: "map-dw"` (the discriminator), `basemap` + `mapKeyAttr` (the DW basemap whose key matches the region identifiers; slice 1 supports countries → `world`), `regionKey`, `valueField` (the normalized rate), `title` (the insight), `intro` (the description), `source` (honest). If no basemap matches the regions → FALL BACK to a sorted bar chart (no forced map). Produce via `map-dw`'s `MapSpec → produceMap` seam (token from `.env`, never logged).
- **Self-check:** the emitted `MapSpec` MUST pass `map-dw`'s `validateMapSpec` (run it). Title states the insight, not a label.
- Keep ALL existing chart guidance (dw-chart default, chart-native for motion/interactivity, the guardrails) intact.

- [ ] **Step 2: Consistency pass**

Re-read the edited SKILL.md: the map path and the chart path are clearly separated; Gate 5 is stated; the producer set is {dw-chart, chart-native, map-dw}; the KB paths are the repo-root forms. No placeholder text.

- [ ] **Step 3: Commit**

```bash
git add skills/suggest-chart/SKILL.md
git commit -m "feat(suggest): broaden runtime to route chart vs map (Gate 5) + emit MapSpec for map-dw"
```

---

### Task 3: Eval cases + run.md + live e2e proof

**Files:**
- Create: `skills/suggest-chart/eval/cases/eu-renewables-gradient.json` (spatial → map)
- Create: `skills/suggest-chart/eval/cases/region-unemployment-ranking.json` (ranking-geo → bar, Gate 5)
- Create: `skills/suggest-chart/eval/cases/regions-no-basemap.json` (unmatched → bar fallback)
- Modify: `skills/suggest-chart/eval/run.md` (note the map path + reading format-selection.md)
- Create: `skills/suggest-chart/eval/e2e-map-proof.md` (the live proof)

- [ ] **Step 1: Add the routing eval cases**

`eu-renewables-gradient.json` — a spatial pattern, normalized rate, legible countries → expect a map:
```json
{
  "id": "eu-renewables-gradient",
  "data": "code,share\nNOR,99\nSWE,68\nDEU,59\nGBR,48\nFRA,27\nESP,44\nITA,41\nPOL,21",
  "intent": "Renewables form a clear north–south gradient across Europe",
  "expect": { "family": "geographic", "element": "map", "maxWarnings": 0 }
}
```

`region-unemployment-ranking.json` — ranking of a few regions, magnitude → expect a sorted bar, NOT a map:
```json
{
  "id": "region-unemployment-ranking",
  "data": "region,rate\nAndalusia,19\nMadrid,10\nCatalonia,11\nBasque Country,8",
  "intent": "Which Spanish region has the highest unemployment?",
  "expect": { "family": "ranking", "element": "chart", "maxWarnings": 0 }
}
```

`regions-no-basemap.json` — region labels with no matching basemap → bar fallback:
```json
{
  "id": "regions-no-basemap",
  "data": "zone,value\nZone A,42\nZone B,31\nZone C,28",
  "intent": "Which internal sales zone performed best?",
  "expect": { "family": "ranking", "element": "chart", "maxWarnings": 0 }
}
```

- [ ] **Step 2: Update run.md**

In `eval/run.md`, step 1 ("Act as ②"): add that the agent also reads `<repo-root>/knowledge/references/formats/format-selection.md` (the ladder + Gate 5), and may emit a `MapSpec` (producer `map-dw`) for a spatial story instead of a `ChartSpec`. Note that `scoreSpec` now takes `expect.element` and validates a map via `validateMapSpec`.

- [ ] **Step 3: Run the eval on the three new cases (act as ②, score)**

Following `run.md`: for each new case, act as ② (read SKILL.md + the KB, emit a spec WITHOUT peeking at `expect`), then `scoreSpec(emitted, case.expect)`. Expected: `eu-renewables-gradient` → a valid `MapSpec` (pass); `region-unemployment-ranking` and `regions-no-basemap` → a sorted `d3-bars` (pass; a map would fail Gate 5). Record the rows.

- [ ] **Step 4: Live e2e — a real spatial article → a real map**

Take a short real article whose story is a SPATIAL pattern (a normalized rate across legible regions). Source the Datawrapper token (`set -a && . .env && set +a`, never log it). Run the full flow (suggest → MapSpec → `map-dw` produce) to a published choropleth embed + PNG under `/tmp/system-test/`. Record the article, the decision (map, citing Gate 5), the embed URL, and the PNG path in `eval/e2e-map-proof.md` (mirror `map-dw`'s existing `e2e-proof.md`). The controller will eyeball the produced map.

- [ ] **Step 5: Commit**

```bash
git add skills/suggest-chart/eval/cases/eu-renewables-gradient.json skills/suggest-chart/eval/cases/region-unemployment-ranking.json skills/suggest-chart/eval/cases/regions-no-basemap.json skills/suggest-chart/eval/run.md skills/suggest-chart/eval/e2e-map-proof.md
git commit -m "test(suggest): map-routing eval cases (spatial→map, ranking→bars Gate-5, unmatched→bars) + live map e2e"
```

## Notes for the executor

- The deterministic proof is `scoreSpec` (Task 1) + the cases (Task 3). The DECISION quality (does ② route correctly) is agent-orchestrated per `run.md` + the judge — the controller runs the e2e and eyeballs the map.
- Slice 1 is the STATIC map (`map-dw`) only. Do NOT wire `map-native` (interactive/video) or scrolly — those are later slices (a richer-format recommendation may be RECORDED but not produced here).
- Gate 5 is the load-bearing rule: never map geographic data by default — a ranking of regions stays bars. The eval's `region-unemployment-ranking` case guards this.
- Never hard-code or log the Datawrapper token.

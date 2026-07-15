# common module furniture (map-native description) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring map-native to the shared module-furniture standard — add a `description` (what/when/where) shown under the title in every format, make its overlays responsive, and require it in conformance. The scrolly inherits automatically (it reuses the choropleth config). chart-native and dw-chart already conform.

**Architecture:** Add `description?: string` to the choropleth config; render it as a subtitle under the title in `ChoroplethMap` (interactive/static) and the `ChoroplethStory` title card (video); make `ChoroplethMap`'s overlays responsive via `min()/clamp()/vw`; extend `checkChoroplethConformance` to require it.

**Tech Stack:** Bun, TypeScript, bun:test, React 19, MapTiler SDK. Engine: `skills/map-native`.

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages in English.
- **No attribution:** never mention Claude/Anthropic. No `Co-Authored-By`. Commit trailer (only if used) EXACTLY: `Claude-Session: https://claude.ai/code/session_01Paz87P3M49t27P9GksL246`
- **Furniture standard** (from `docs/splash/embeddable-module-best-practices.md`): insight title + description + source, each once + responsive. The `description` is the what/when/where line, distinct from the long `unit` (legend label) and short `valueUnit`.
- **Responsive recipe**: `min()/clamp()/vw` inline; cap fixed overlays at `min(Npx, calc(100vw - gutter))`.
- **Determinism (video):** pure function of `frame`; no `Date`/`Math.random`. **Key hygiene:** MapTiler key via env only; never hard-code/log it.

---

### Task 1: Conformance requires description + config fields + sample

**Files:**
- Modify: `skills/map-native/src/conformance.ts`
- Modify: `skills/map-native/tests/conformance.test.ts`
- Modify: `skills/map-native/src/ChoroplethMap.tsx` (add `description?` to `ChoroplethConfig`)
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx` (add `description?` to its config prop type)
- Modify: `skills/map-native/assets/sample-data/choropleth.json` (add `description`)

**Interfaces:**
- `checkChoroplethConformance` input gains `description?: string`; a missing/empty description is a violation.

- [ ] **Step 1: Write the failing tests**

In `tests/conformance.test.ts`, the existing passing fixture must gain a `description`, and add two cases. Find the object passed to `checkChoroplethConformance` in the "passes" test and add `description: "Share of electricity from renewables, by country, 2024"`. Then add:

```ts
it("flags a missing description (a module must state what/when/where)", () => {
  const base = {
    title: "Renewables power Europe's north",
    description: "Share of electricity from renewables, by country, 2024",
    source: { name: "Ember", url: "https://example.org" },
    scaleColors: ["#deebf7", "#9ecae1", "#4292c6"],
    scaleType: "sequential" as const,
    hasLegend: true,
    regionsWithData: 8,
    regionsTotal: 200,
    boundsNonEmpty: true,
  };
  const r = checkChoroplethConformance({ ...base, description: undefined }, ["#1a1a1a"] as unknown as { text: string[]; bg: string });
  // NOTE: match the EXACT textColors shape the existing tests use ({ text:[...], bg:"..." });
  // copy it from a passing test rather than the placeholder above.
  expect(r.some((v) => /description/i.test(v))).toBe(true);
});
```

(IMPORTANT: read the existing `conformance.test.ts` and mirror its exact `textColors` argument shape `{ text: [...], bg: "..." }` and its fixture style — the snippet above is illustrative. The real assertion: a valid input WITHOUT `description` yields a `/description/i` violation; WITH it, none.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL (description not checked).

- [ ] **Step 3: Implement the conformance check**

In `src/conformance.ts`, add `description?: string;` to the `input` type, and after the title checks add:

```ts
  if (!input.description?.trim())
    v.push("missing description — a module must state what/when/where");
```

- [ ] **Step 4: Add the config fields**

In `src/ChoroplethMap.tsx`, add `description?: string;` to the `ChoroplethConfig` interface (next to `unit`/`valueUnit`).
In `src/components/ChoroplethStory.tsx`, add `description?: string;` to the component's `config` prop type (next to `insight?`).
(Note: `ScrollyMapConfig` in scrolly already has `description?` — no change there; the scrolly inherits.)

- [ ] **Step 5: Add the sample description**

In `assets/sample-data/choropleth.json`, add after `"title"`:
`"description": "Share of electricity from renewables, by country, 2024",`

- [ ] **Step 6: Run the gates**

Run: `cd skills/map-native && bun test` → whole suite passes.
Run: `cd skills/map-native && bunx tsc --noEmit 2>&1 | grep -iE "ChoroplethMap|ChoroplethStory|conformance" || echo "no new type errors"` → no new errors (ignore pre-existing react-dom TS2688).

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts skills/map-native/src/ChoroplethMap.tsx skills/map-native/src/components/ChoroplethStory.tsx skills/map-native/assets/sample-data/choropleth.json
git commit -m "feat(map-native): description furniture field + conformance requires it"
```

---

### Task 2: Render the description subtitle + responsive overlays — `ChoroplethMap.tsx`

**Files:**
- Modify: `skills/map-native/src/ChoroplethMap.tsx`

**Interfaces:** consumes `config.description` (Task 1).

- [ ] **Step 1: Render the description under the title + make the title card responsive**

Replace the title-overlay block (currently `{config.title && (<div style={{… maxWidth: 320 …}}><div style={{ font: "600 13px/1.3 sans-serif", color: "#1a1a1a" }}>{config.title}</div></div>)}`) with:

```tsx
      {config.title && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "rgba(255,255,255,0.92)",
            padding: "8px 12px",
            borderRadius: 6,
            // Responsive: never overflow a phone screen.
            maxWidth: "min(320px, calc(100vw - 32px))",
            boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          }}
        >
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 600,
              fontSize: "clamp(13px, 3.6vw, 14px)",
              lineHeight: 1.3,
              color: "#1a1a1a",
            }}
          >
            {config.title}
          </div>
          {config.description && (
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: "clamp(11px, 3vw, 12px)",
                lineHeight: 1.35,
                color: "#555",
                marginTop: 3,
              }}
            >
              {config.description}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Make the legend overlay responsive**

Find the legend container `<div ref={legendRef} style={{ … minWidth: 120 … }} />` and add a responsive max width so it never eats a phone screen: add `maxWidth: "min(160px, 42vw)"` to that style object (keep `minWidth: 120`). The legend's inner rows already use small fonts; no other change.

- [ ] **Step 3: Typecheck**

Run: `cd skills/map-native && bunx tsc --noEmit 2>&1 | grep -i "ChoroplethMap" || echo "no ChoroplethMap type errors"` → no errors.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/ChoroplethMap.tsx
git commit -m "feat(map-native): render description subtitle + responsive title/legend overlays"
```

---

### Task 3: Video title-card subtitle + SKILL.md + dw-chart confirm

**Files:**
- Modify: `skills/map-native/src/components/ChoroplethStory.tsx`
- Modify: `skills/map-native/SKILL.md`
- Read/confirm: `skills/dw-chart/src/chart-spec.ts` (validator)

**Interfaces:** consumes `config.description`.

- [ ] **Step 1: Add a description subtitle to the video title card**

In `ChoroplethStory.tsx`, the `TitleCard` component is `const TitleCard: React.FC<{ text: string; phase: Phase; frame: number }>`. Extend it to accept an optional `description?: string` and render it as a smaller line under the title `<p>`. Inside the centered flex container, replace the single title `<p>` with the title `<p>` followed by an optional description `<p>`:

```tsx
const TitleCard: React.FC<{ text: string; description?: string; phase: Phase; frame: number }> = ({
  text,
  description,
  phase,
  frame,
}) => {
  // ... keep the existing opacity calc ...
  return (
    <div style={{ /* keep existing: inset:0, flex center, background:#1c1c1c, opacity, pointerEvents:none */ }}>
      <div style={{ maxWidth: "70%", textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            color: "#F5F2ED",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          {text}
        </p>
        {description && (
          <p
            style={{
              margin: "18px 0 0",
              color: "#C9C4BB",
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.3,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
```

(Keep the existing `opacity` interpolation logic and the outer `<div>`'s style — only restructure so the title + description sit in a centered column.)

- [ ] **Step 2: Pass the description where TitleCard is used**

Find the `<TitleCard text={mapState.beats[0].copy} … />` usage (the title-beat render) and add `description={config.description}`.

- [ ] **Step 3: Typecheck**

Run: `cd skills/map-native && bunx tsc --noEmit 2>&1 | grep -i "ChoroplethStory" || echo "no ChoroplethStory type errors"` → no errors.

- [ ] **Step 4: SKILL.md — module furniture note**

Add a short note to `skills/map-native/SKILL.md` (near the conformance/overview section): every map module carries insight title + description + source, each once, with responsive overlays (`min()/clamp()/vw`); see `docs/splash/embeddable-module-best-practices.md`. The scrolly inherits this via the shared config.

- [ ] **Step 5: Confirm dw-chart already conforms**

Read `skills/dw-chart/src/chart-spec.ts` + its validator (`validateChartSpec`). Confirm `intro` (the description) is supported and that a missing `intro` is at least warned. If there is NO warning for a missing `intro`, add one Minor warning (mirroring the other `validateChartSpec` warnings); if it already warns or the team treats `intro` as optional-by-design, change nothing and note it in the report. Do NOT restructure dw-chart.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/components/ChoroplethStory.tsx skills/map-native/SKILL.md skills/dw-chart/src/chart-spec.ts
git commit -m "feat(map-native): video title-card description subtitle + SKILL furniture note; confirm dw-chart conforms"
```

(If dw-chart needs no change, drop it from the `git add`.)

## Notes for the executor

- The controller will VISUALLY verify after these tasks: produce the interactive (title shows title + description subtitle; overlays fit at ~390px) and a video title-card still (title + description). The scrolly is then re-produced to confirm it inherits the description from the shared config.
- `chart-native` is intentionally untouched — it already renders title + subtitle (from `unit`) + source responsively via `core/ChartFrame`. A dedicated `description` field for charts is a future codemod, out of scope.
- Never run the browser audit more than needed (MapTiler tile limits). Never commit or log the key.

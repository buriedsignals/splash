# Map dark-video parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. This lot closes the
> dark-mode VIDEO/scrolly facet the render-quality lot deferred: the map video/scrolly components hardcode a
> LIGHT basemap and drop `mapStyle:"dataviz-dark"`. Fix = mirror the **already-dark-wired DotDensity video trio**
> (the in-repo reference) + the static Tasks 2-3 dark wiring.

**Goal:** 6 target components honor `mapStyle:"dataviz-dark"` (basemap + legend + labels + furniture + page bg),
so a dark map exported as video/scrolly renders dark — matching static/interactive.

**Worktree:** `/Users/rmdms/Sites/Professional/.splash-wt/darkvideo`, branch `feat/map-dark-video` (base main
7652ff6). Runs in parallel with the Family A lot (disjoint files). `bun run check` green in this worktree.

## Global Constraints
- Bun; English; zero `any`/`@ts-ignore` (note ChoroplethReveal has pre-existing `(config as any)` casts — do NOT
  add new ones; don't need to remove pre-existing); no vendor. `bun run check` green at end of every task.
- **Reference to mirror = `DotDensityStory/Reveal/Scrolly.tsx`** (already fully dark-wired: `dark =
  resolveMapStyle(config.mapStyle)==="dataviz-dark"`; `style = dark?DARK:LIGHT`; `bg = dark?"#0e0f12":"#f4f4f4"`;
  dark stroke; legend dark; `<MapFrame dark={dark}>`; `<ScrollyPanel dark={dark}>`). DotDensity is NOT a target.
- Shared theming ALREADY exists — just consume: `MapFrame` accepts `dark` (core/MapFrame.tsx:27,73);
  `ScrollyPanel` accepts `dark` (ScrollyPanel.tsx:71-76); `legendTheme(dark)` (theme/legend-theme.ts).
- **Controller render-verifies every component dark AND light at a still** (`set -a && . ./.env && set +a`, then
  produce a story/reveal/scrolly still). Dark is frame-invariant → determinism holds (style fixed at init).

**Grounding (verified file:line — from the dark-video scout):**
- Choropleth video (needs `mapStyle?` ADDED to the prop type — ChoroplethData has none):
  - `ChoroplethStory.tsx`: basemap :145; region base stroke :264 `#ffffff`; highlight stroke :281 `#1a1a1a`; legend innerHTML :426/433/434 + box bg :475; page bg :452; MapFrame :455 no dark; `LEGEND_THEME_LIGHT` shim :41/:113.
  - `ChoroplethReveal.tsx`: basemap :79; region stroke :167; legend :204/211/212 + box :269; page bg :245; MapFrame :247; shim :31/:59. (no highlight stroke — fixed camera, simplest.)
  - `ChoroplethScrolly.tsx`: basemap :158; region stroke :273; highlight :291; legend :416/423/424 + box :459; page bg :436; MapFrame :437; **ScrollyPanel :472 no dark**; shim :42/:138.
- Symbol video (config is already `SymbolConfig` which types `mapStyle?` — NO prop-type change):
  - `SymbolStory.tsx`: basemap :88; on-map label ink+halo :155-156 (`#1a1a1a`/`#ffffff` → flip like static SymbolMap:278-279 `dark?"#f4f4f5":"#1a1a1a"` / `dark?"rgba(0,0,0,0.85)":"#ffffff"`); page bg :301; MapFrame :303 no dark. NO legend in symbol video.
  - `SymbolScrolly.tsx`: basemap :82; label :149-150; emphasis ring :262 `#1a1a1a` → light; page bg :276; MapFrame :277; **ScrollyPanel :293 no dark**.
  - `SymbolReveal.tsx`: basemap :75; label :139-140; page bg :177; MapFrame :178. (no highlight, no callout — simplest.)
- Leave theme-neutral (DotDensity reference leaves them too): `TitleCard`, `CaptionCard`, `CountryLabel` callout (light text + heavy shadow reads on both).

---

## Task 1: Choropleth video trio dark (Story/Reveal/Scrolly)

**Files:** `src/components/ChoroplethStory.tsx`, `ChoroplethReveal.tsx`, `ChoroplethScrolly.tsx`; the prop-type/config that feeds them (add `mapStyle?: string`).

- [ ] Add `mapStyle?: string` to the Choropleth video prop type (the `ChoroplethData & {...}` intersection each uses — ChoroplethData itself has no mapStyle).
- [ ] Each component: `import { resolveMapStyle } from "../../route-geo"` (adjust path from components/), `const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark"`. Thread (mirror DotDensityStory):
  - basemap `style = dark ? DATAVIZ.DARK : DATAVIZ.LIGHT`
  - **drop the `LEGEND_THEME_LIGHT` shim** → `const theme = legendTheme(dark)` (hoist concern: keep it stable — `useMemo(()=>legendTheme(dark),[dark])` or accept the light-only shim replacement; dark is frame-invariant so a plain call is deterministic — match how DotDensityStory does it)
  - region base stroke `#ffffff` → `dark ? "#1c1c1f" : "#ffffff"`; highlight stroke `#1a1a1a` → `dark ? "#f4f4f5" : "#1a1a1a"` (Story/Scrolly only)
  - page bg `#f4f4f4` → `dark ? "#0e0f12" : "#f4f4f4"`
  - `<MapFrame dark={dark}>`; ChoroplethScrolly: `<ScrollyPanel dark={dark}>` (:472)
- [ ] **Controller render-verify**: dark + light still of story, reveal, scrolly → all dark surfaces (basemap, legend box, region strokes, page bg, panel) follow the basemap; light unchanged. **Commit** `fix(map-native): choropleth video/scrolly honor mapStyle:dark (basemap+legend+furniture)`.

---

## Task 2: Symbol video trio dark (Story/Scrolly/Reveal)

**Files:** `src/components/SymbolStory.tsx`, `SymbolScrolly.tsx`, `SymbolReveal.tsx`. (config already types `mapStyle?` — no prop-type change.)

- [ ] Each: `resolveMapStyle` → `dark`. Thread:
  - basemap `style = dark ? DARK : LIGHT`
  - on-map label text-color+halo → `dark ? "#f4f4f5" : "#1a1a1a"` / `dark ? "rgba(0,0,0,0.85)" : "#ffffff"` (mirror static SymbolMap:278-279)
  - page bg → `dark ? "#0e0f12" : "#f4f4f4"`
  - `<MapFrame dark={dark}>`; SymbolScrolly: emphasis ring `#1a1a1a` → `dark ? "#f4f4f5" : "#1a1a1a"` (:262) + `<ScrollyPanel dark={dark}>` (:293)
  - SYMBOL_FILL/SYMBOL_STROKE unchanged (fine on dark). No legend in symbol video.
- [ ] **Controller render-verify**: dark + light still of story, scrolly, reveal → labels legible on dark, basemap dark, ring visible; light unchanged. **Commit** `fix(map-native): symbol video/scrolly honor mapStyle:dark (basemap+labels+furniture)`.

---

## Task 3: Regression guard — extend resolve-map-style-parity to the video/scrolly components

**Files:** `tests/resolve-map-style-parity.test.ts` (extend), maybe a small note in `knowledge/references/map/formats/video.md`.

- [ ] The render-quality lot's `resolve-map-style-parity.test.ts` asserts the 7 `*Map.tsx` consume `resolveMapStyle`, and DELIBERATELY EXCLUDED the video/scrolly components (they were deferred). Now that Tasks 1-2 fix them, **extend the test** to also assert the 6 fixed video/scrolly components (ChoroplethStory/Reveal/Scrolly, SymbolStory/Scrolly/Reveal) — AND the DotDensity trio (already wired) — consume `resolveMapStyle`. Non-vacuous (fails if one drops it). Update the test's scoping comment.
- [ ] **Do NOT** try to extend snap-theme to video (Remotion still render at dark is heavier + best-effort; the parity test is the reliable guard). Note video-dark in `knowledge/references/map/formats/video.md` if a rule line fits.
- [ ] `bun run check` green. **Commit** `test(map-native): parity test covers video/scrolly resolveMapStyle consumption (dark-video)`.

---

## Definition of done
- 6 video/scrolly components honor mapStyle:dark; each render-verified dark AND light at a still by the controller.
- Parity test extended to the video/scrolly components (regression guard). `bun run check` green after every task.
- Per-task review + whole-branch opus before merge `--no-ff`. Zero `any`/vendor. Record in CLAUDE.md.

## Backlog (out of scope)
- snap-theme on video (Remotion dark still — heavier, best-effort; parity test suffices).
- DotDensity video legend inlines dark literals instead of `legendTheme(dark)` (cosmetic DRY, reference is correct).

# Runnable source bundle for map-native & scrolly — design

> Option 3, item 3. Give the export "code source" delivery form a genuinely **runnable**
> React source bundle for the `map-native` and `scrolly` engines — matching the capability
> `chart-native` already ships (`bun install && bun run build` reproduces the visual from
> zero). Today "code source" for these two engines is a bare copy of the single interactive
> HTML — byte-identical to the "HTML autonome" form, with no source to rebuild or customise.
>
> All code claims below were adversarially verified against the tree on 2026-07-13
> (workflow `verify-item3-claims`, 7 verifiers) — file:line citations are load-bearing.

## Why (the gap)

`export-code.mjs` routes the `code-source` form through a `hasNativeSource` gate
(`skills/splash/scripts/export-code.mjs:194`) that keys **strictly** on
`native-source.json` + `config.json` in `outDir`. Only the chart-native producer writes
those (`skills/chart-native/scripts/produce.mjs:165-166`). For map-native / scrolly the gate
is always false, so `code-source` falls into the non-native branch
(`export-code.mjs:267-280`), which does exactly one thing: `copyFileSync(outDir/interactive
→ exportDir/interactive)` — the same operation as `form=html` at `:224`. The delivered files
are identical; only the reported metadata differs. There is **no** `export-source.mjs`
equivalent under map-native / scrolly.

This is a documented follow-up (`CLAUDE.md:41`, `:121` — "bundle React runnable pour
map-native/scrolly … leur src pas auto-contenu → factoriser un core auto-contenu"). It is a
**public flagship promise** for Splash (map-scrolly), so the capability matters beyond the
grant deliverable.

### Why chart-native's recipe does not transfer as-is

`export-source.mjs` copies `chart-native/src` **wholesale** (minus `mount.tsx`) and relies on
that tree being self-contained: zero cross-skill relative imports, only standard npm deps
(react, react-dom, d3-array/chord/scale/shape/time-format). map-native and scrolly are
**entangled**:

- `scrolly/src` imports both `../../chart-native/src/*` and `../../map-native/src/*` (~30
  cross-skill imports, e.g. `skills/scrolly/src/ScrollyMap.tsx:32`).
- `map-native/src` imports `../../scrolly/src/*` from exactly **two** off-interactive-path
  files: `route-story.ts:14` (a story file, consumed only by `components/*Scrolly.tsx`) and
  `conformance.ts:4` (a produce-time audit module, dynamically imported only by the Node
  build script `produce.mjs:167`).
- Runtime deps beyond React: `@maptiler/sdk` (+ its CSS), `@turf/turf`, and — verified,
  contra intuition — **`remotion`** (see below).

## Locked decisions (from brainstorming)

1. **Scope**: both engines; **map-native proven first**, then scrolly, in this chantier.
2. **"Code source" for maps = a rebuildable bundle + documented caveat.** A map interactive
   is inherently online (basemap tiles fetched from MapTiler at runtime) and needs the
   **journalist's own** `VITE_MAPTILER_KEY`. We do **not** bake the splash key (shipping a
   private, revocable, quota'd secret in a delivered artifact is out). The bundle is
   *rebuildable*, not *offline* — inherent to the hosted-style basemap design, documented in
   the bundle README + `.env.example`.
3. **Approach B** — layout-preserving, **closure-driven** copy: reproduce the repo-relative
   `skills/<name>/{src,assets}` arrangement so existing relative imports resolve unchanged,
   plus a root Vite scaffold. Closure discovered via the esbuild metafile (no import
   rewriting, no drift).
4. **chart-native stays on its proven path** (`export-source.mjs` + its from-zero build
   test) this chantier. The new generator serves map/scrolly only. Unification is a noted
   follow-up.
5. **Verification depth**: build **+ headless render** from zero on a representative subset
   (choropleth, symbol, one geo-heavy type e.g. route or cartogram) + a scrolly variant;
   structural `bun run build` (no render) on the remaining map types.

## Two verified constraints that shape the mechanism

**C1 — Deps MUST be derived from the metafile, never hand-authored.** `remotion` is on the
interactive path: `mount.tsx → each map component → route-geo.ts:2 → video-scene.ts:5 →
import { interpolate, Easing } from "remotion"` (top-level). Today's interactive `vite build`
succeeds only because `map-native/package.json:16` declares remotion and `interpolate/Easing`
are browser-safe pure functions. Reusing chart-native's "strip remotion" pattern
(`export-source.mjs:17` comment) would **hard-break** the map bundle at Rollup bare-specifier
resolution. A metafile-driven dep list is self-correcting: remotion appears as an external
automatically.

**C2 — The copy MUST be closure-driven, not a blanket `cpSync` of the skill's `src`.** The
interactive map closure from `mount.tsx` is **39 files, 100% within `skills/map-native/
{src,assets}`, zero scrolly/chart-native imports** (verified per-component for all 7 map
types; no dynamic `import()` anywhere in `map-native/src`). But a naive whole-`src` copy would
drag in `conformance.ts` + `route-story.ts`, whose `../../scrolly/src/*` imports would then
dangle — forcing scrolly (and transitively chart-native) to be vendored, defeating the point.
Copying exactly the closure avoids this, keeps the bundle small, and drops the 3.9 MB
`world.geojson` duplicates + video-only files.

## Architecture

A single shared, engine-agnostic generator plus per-producer marker emission and an
export-code wiring change.

### 1. `skills/splash/scripts/bundle-source.mjs` (new — the generator)

Owned by the orchestrator (it already resolves engine script paths, cf.
`export-code.mjs:49`). Signature:

```
bun bundle-source.mjs <source-manifest.json> <config.json> <destDir>
```

Steps:

1. **Read the manifest** → `{ engine, ... }` identifying the entry (see §2).
2. **Resolve the entry module**: the engine's real `mount.tsx`
   (`skills/map-native/src/mount.tsx`, `skills/scrolly/src/mount.tsx`) — reused **verbatim**,
   no generated component switch (zero drift). Config is baked via Vite `define`
   (`__CONFIG__` read from `config.json` at `vite.config` eval time, `__INTERACTIVE__ = true`)
   — the exact mechanism `mount.tsx` already expects (`map-native/src/mount.tsx:28-37`,
   `map-native/vite.config.ts:18`).
3. **Compute the module closure** with a small **custom static-import tracer** (not esbuild):
   plain `esbuild --metafile` cannot resolve Vite's `?raw` / `.css` query imports
   (`world.geojson?raw`, `@maptiler/sdk/dist/maptiler-sdk.css`) without a plugin, and
   map-native/scrolly src has **no dynamic `import()`** (verified), so a static tracer is both
   simpler and correct. It walks `import … from "…"` / side-effect `import "…"` / `export …
   from "…"` from the entry, resolving relative specifiers (trying `.ts/.tsx/.js/.jsx/.json/
   .geojson` + `/index.*`, stripping `?raw`/`?url`) into the file copy set (assets are just
   leaf files in this set), and collecting bare specifiers into the dep set. The from-zero
   build+render test is the backstop.
4. **Copy the closure preserving repo-relative layout**: each file under
   `<destDir>/skills/<name>/…`, assets at their relative paths. Relative + `?raw` imports
   resolve unchanged. (map = one tree ~39 files; scrolly = three trees, all supplied by the
   metafile.)
5. **Derive `package.json` deps from the metafile externals**, versions read from the
   **union** of the touched skills' `package.json` (never hardcoded). Add devDeps: `vite`,
   `@vitejs/plugin-react`, `vite-plugin-singlefile`, `typescript`, relevant `@types/*`.
6. **Emit the scaffold** at `<destDir>`: `vite.config.ts` (react + singlefile + the config
   `define`), `tsconfig.json` (`include` scoped to the copied dirs so tsc never sees
   non-copied files), `index.html` (`<script src>` → the copied `mount.tsx`), `README.md`,
   and — for the map/scrolly-with-map case — `.env.example` (`VITE_MAPTILER_KEY=`) plus README
   text on the key + network-tiles caveat.
7. Print `BUNDLE_SOURCE_RESULT {json}` (dir, engine, entry) for the caller.

**Interfaces / boundaries.** Input: a manifest + config + destDir. Output: a self-contained
Vite project directory. Depends on: esbuild (via skill node_modules), the engine `src`/
`assets` trees, the skills' `package.json` for versions. Testable in isolation: given a
manifest+config, assert the emitted tree (closure files present, deps complete, scaffold
files, no dangling cross-skill import in any copied file).

### 2. Producer marker emission

Each producer drops a `source-manifest.json` into `outDir` (mirroring chart-native's
`native-source.json`, but engine-tagged and richer where needed):

- **map-native** (`skills/map-native/scripts/produce.mjs`): on an `interactive` produce,
  write `source-manifest.json = { engine: "map-native", type: parsedConfig.type }` **and**
  copy the rendered config to `outDir/config.json` (today it writes neither — only
  `interactive.html`, `produce.mjs:298`). Cheap: the type is already `parsedConfig.type`
  (`produce.mjs:168`).
- **scrolly** (`skills/scrolly/scripts/produce.mjs`): write `source-manifest.json =
  { engine: "scrolly", kind: <VisualKind>, chapters: [<pinned types>] }` + copy `config.json`.
  Its `produce.mjs` receives neither type nor format on the CLI (`produce.mjs:29-34`); the
  marker captures the host-engine `VisualKind` (`chapters.ts:4` — `map | chart | image`) and
  the underlying pinned types needed to resolve the entry. A scrolly may be multi-visual —
  the marker/config already carry the chapters, and the reused `scrolly/src/mount.tsx` drives
  the rest.
- **chart-native**: unchanged (`native-source.json`).

### 3. `export-code.mjs` wiring

- Add a `hasSourceManifest` check alongside `hasNativeSource`
  (near `export-code.mjs:194`). The `code-source` branch:
  - `hasNativeSource` (chart-native) → existing `export-source.mjs` path, unchanged.
  - `hasSourceManifest` (map-native / scrolly) → invoke `bundle-source.mjs` → the runnable
    bundle folder `<id>-source`.
  - neither → keep the current lone-html copy as a defensive fallback (should not occur once
    producers emit markers).
- **Tighten `assertDelivered({ format, form: "code-source" })`**
  (`skills/splash/src/export-guard.ts:122`, today only checks a non-empty dir): for a
  bundle, require `package.json` **and** `vite.config.ts` present, so a regression back to a
  lone-html copy fails loudly.
- **`emitProposal`** (`export-code.mjs:342-453`): form `a` for map/scrolly becomes
  `kind: "react-source-bundle"`, label "Code source (bundle React autonome)" — no longer
  "fichiers construits".

### 4. MapTiler key & the non-offline caveat

- The copied source contains **no key** — components read `import.meta.env.VITE_MAPTILER_KEY`
  at runtime (`ChoroplethMap.tsx:42`, same in every `*Map.tsx`) and throw
  `"VITE_MAPTILER_KEY missing"` if absent. Safe to ship.
- Vite auto-exposes `VITE_`-prefixed env from a root `.env`. The bundle's `.env.example` +
  README instruct the journalist to supply their own key before `vite build`.
- **Failure is at runtime, not build time**: `vite build` succeeds even with no key (inlines
  an empty value); the page then throws in the browser. Hence verification must **render**,
  not merely build (see §5).
- Basemap tiles are fetched from MapTiler at runtime (`ChoroplethMap.tsx:207`,
  `MapStyle.DATAVIZ`) — the bundle is rebuildable but **online-only**. There is no code path
  to an offline map bundle without swapping to a self-hosted basemap style (explicitly out of
  scope).

## Verification (definition of done)

A from-zero test (new, under `skills/splash` or a harness script), run in the gate env where
`VITE_MAPTILER_KEY` is set (produce already relies on it):

- For a representative map subset (**choropleth, symbol, one geo-heavy type — route or
  cartogram**) and **one scrolly variant** (a map-scrolly, exercising the 3-tree closure):
  produce → `code-source` → `bun install && bun run build` in the emitted bundle from a clean
  state → **headless render** of `dist/index.html` and assert it renders (no missing-key
  throw, map/marks present) — reusing map-native's existing snap/verify harness where
  possible.
- For the remaining map types: structural `bun run build` (no render) asserting the build
  succeeds and the bundle shape is well-formed (deps complete, closure files present, no
  dangling cross-skill import in any copied file).
- Gate `assertDelivered` tightening covered by a unit test (bundle passes, lone-html fails).

## Out of scope (noted follow-ups)

- Unifying chart-native onto `bundle-source.mjs` (decision 4).
- Decoupling the map interactive path from `remotion` (breaking `route-geo → video-scene`) so
  the bundle need not carry remotion — a map-native refactor, not this chantier.
- An offline/self-hosted-basemap map bundle.
- image-scrolly bundle (image engine) — separate.
- Fixing the stale `CLAUDE.md:121` "15 déférés" → **14** Family B types (heatmap moved B→A);
  a doc touch, folded into this chantier's doc pass, not a code change.

## Risks

- **Metafile fidelity**: if the esbuild trace misses a `?raw`/dynamic edge, the bundle build
  breaks. Mitigation: `map-native/src` has **no** dynamic imports (verified); the from-zero
  render test is the backstop.
- **Scrolly 3-tree closure size / cross-tree version skew**: react/@maptiler/@turf versions
  must be consistent across the union `package.json`. Mitigation: dedupe by taking a single
  version per specifier and failing loudly on a genuine conflict.
- **world.geojson (3.9 MB) inlined `?raw`** into several modules → heavy bundle, but not a
  build blocker (`assetsInlineLimit` 100 MB on the interactive path).

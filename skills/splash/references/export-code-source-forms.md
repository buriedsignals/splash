# EXPORT form (a) "Code source" — per-producer bundle mechanics

Detail for the `a) Code source` delivery form (`forms.a`) referenced from `skills/splash/SKILL.md`
§6 EXPORT — Gate 4. The delivery depends on the producer:

- **chart-native** (`kind: "react-source-bundle"`) → a `<id>-source/` **runnable React source bundle**,
  assembled ON DEMAND by `skills/chart-native/scripts/export-source.mjs` from the `config.json` +
  `native-source.json` the producer drops in the build subdir: a self-contained Vite project (`src/` = a
  copy of chart-native/src, `config.json`, `main.tsx`/`index.html` that import the chart + config
  statically, `package.json` with the interactive deps only — no remotion, `vite.config.ts`,
  `tsconfig.json`, `README.md`). The journalist runs `bun install && bun run build` → `dist/index.html`
  (the interactive). THIS is the headline form-1 capability.
- **map-native / scrolly** (`kind: "react-source-bundle"` too) → a `<id>-source/` **runnable Vite
  project**, assembled ON DEMAND by `skills/splash/scripts/bundle-source.mjs`, which closure-traces
  from the `source-manifest.json` + `config.json` the producer drops (their `src/` is entangled —
  map-native imports scrolly; scrolly imports chart-native + map-native + maptiler/turf — so the copy
  PRESERVES the repo-relative `skills/<engine>/{src,assets}` layout and deps are DERIVED from the
  traced closure, remotion included on the map path). `bun install && bun run build` → `dist/index.html`
  — but the map fetches basemap tiles from MapTiler at runtime, so this bundle is **online-only** and
  needs the journalist's OWN `VITE_MAPTILER_KEY` (never baked in; documented in the bundle's
  `.env.example` + `README.md`).

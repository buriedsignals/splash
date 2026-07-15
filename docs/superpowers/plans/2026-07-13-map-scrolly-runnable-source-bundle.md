# Runnable source bundle for map-native & scrolly — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the export "code source" delivery form a genuinely runnable React source bundle for the `map-native` and `scrolly` engines (`bun install && bun run build` reproduces the visual from zero), replacing today's bare interactive-HTML copy.

**Architecture:** A shared, engine-agnostic generator (`skills/splash/scripts/bundle-source.mjs`) traces the entry module's import closure with a custom static-import tracer, copies exactly the reached files + assets **preserving the repo-relative `skills/<name>/{src,assets}` layout** (so existing relative imports resolve unchanged), derives deps from the closure's bare specifiers (self-correcting — remotion IS on the interactive map path), and emits a root Vite scaffold that bakes `config.json`. Each producer drops a `source-manifest.json` marker; `export-code.mjs` routes map/scrolly `code-source` to the generator. chart-native keeps its proven `export-source.mjs` path.

**Tech Stack:** Bun, TypeScript, `bun:test` (TDD), Vite 8 + `@vitejs/plugin-react` + `vite-plugin-singlefile`, MapTiler SDK, node ESM `.mjs` scripts.

## Global Constraints

- Runtime **Bun** only — never npm/node. Tests `bun:test`, TDD (failing test first).
- Code, comments, identifiers, commit messages, branch names: **English** (non-negotiable).
- **No Claude/Anthropic mention** in any committed artifact (commits, PRs, docs, code).
- **Deps are derived from the traced closure, never hand-authored.** `remotion` is reachable on the interactive map path (`mount.tsx → map component → route-geo.ts:2 → video-scene.ts:5 → import "remotion"`); omitting it hard-breaks the build.
- **Copy is closure-driven, never a blanket `cpSync` of a skill `src`** — a whole-`src` copy of map-native drags in `conformance.ts` + `route-story.ts` whose `../../scrolly/*` imports would dangle.
- Versions are **exact pinned semver** (no `^`/`~`) — copy verbatim from the skills' `package.json`.
- MapTiler key is **never baked** — the bundle reads `import.meta.env.VITE_MAPTILER_KEY` at runtime; the scaffold ships `.env.example` + README telling the journalist to supply their own. Map bundles are rebuildable but **online-only** (tiles fetched from MapTiler).
- The from-zero build+render verification does **real network install + live tile fetch** — it is an **opt-in harness script**, NOT part of the always-on `bun run check` gate (which stays network-light). The gate only gets fast, no-network **assembly** tests.
- Branch: `feat/map-scrolly-source-bundle` (already created; spec committed at `2e08160`).

**Repo-relative layout invariant:** the bundle root contains `skills/<name>/…` mirroring the repo, plus root-level `package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`, `config.json`, `README.md`, `.env.example`. `index.html`'s `<script src>` points at `/skills/<engine>/src/mount.tsx`.

---

## File Structure

**Create:**
- `skills/splash/scripts/bundle-source.mjs` — the shared generator (tracer + dep derivation + scaffold emitters + CLI).
- `skills/splash/scripts/bundle-source.test.ts` — unit tests for the pure helpers + CLI assembly test (no network).
- `skills/splash/scripts/verify-source-bundle.mjs` — opt-in from-zero build+render harness (not in the gate).

**Modify:**
- `skills/map-native/scripts/produce.mjs` — emit `source-manifest.json` + `config.json` in the interactive case.
- `skills/map-native/scripts/produce.mjs` (or a tiny new `skills/map-native/src/source-manifest.ts`) — export a pure `mapSourceManifest(config)` helper for unit testing.
- `skills/scrolly/scripts/produce.mjs` — emit `source-manifest.json` + `config.json`; export a pure `scrollySourceManifest(config)` helper.
- `skills/splash/src/export-guard.ts:122-128` — tighten `assertDelivered(code-source)` to require `package.json` + `vite.config.ts`.
- `skills/splash/scripts/export-code.mjs` — add a `hasSourceManifest` branch invoking the generator; relabel `emitProposal` form a.
- `skills/splash/scripts/export-code.test.ts` — cover routing + labeling.
- Docs: `skills/splash/SKILL.md`, `CLAUDE.md`, `docs/splash/CHANGELOG.md`, `export-code.mjs` header.

---

## Task 1: Static-import tracer + closure (`bundle-source.mjs` core)

**Files:**
- Create: `skills/splash/scripts/bundle-source.mjs`
- Test: `skills/splash/scripts/bundle-source.test.ts`

**Interfaces:**
- Produces: `stripQuery(spec: string): string`, `importSpecifiers(src: string): string[]`, `resolveRelative(fromFileAbs: string, spec: string): string | null`, `traceClosure(entryAbs: string): { files: string[]; bareSpecifiers: string[] }`.

- [ ] **Step 1: Write failing tests for the tracer helpers**

```ts
// skills/splash/scripts/bundle-source.test.ts
import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import {
  stripQuery,
  importSpecifiers,
  resolveRelative,
  traceClosure,
} from "./bundle-source.mjs";

const REPO = join(import.meta.dir, "..", "..", ".."); // skills/splash/scripts → repo root
const MAP_MOUNT = join(REPO, "skills", "map-native", "src", "mount.tsx");

describe("stripQuery", () => {
  it("removes a ?raw / ?url vite suffix", () => {
    expect(stripQuery("../assets/world.geojson?raw")).toBe("../assets/world.geojson");
    expect(stripQuery("./x")).toBe("./x");
  });
});

describe("importSpecifiers", () => {
  it("finds from-imports, side-effect imports and export-from", () => {
    const src = [
      `import React from "react";`,
      `import { a } from "./a";`,
      `import type { T } from "../b";`,
      `import "@maptiler/sdk/dist/maptiler-sdk.css";`,
      `export { z } from "./z";`,
    ].join("\n");
    const specs = importSpecifiers(src);
    expect(specs).toContain("react");
    expect(specs).toContain("./a");
    expect(specs).toContain("../b");
    expect(specs).toContain("@maptiler/sdk/dist/maptiler-sdk.css");
    expect(specs).toContain("./z");
  });
});

describe("resolveRelative", () => {
  it("resolves an extensionless relative import to a real .tsx file", () => {
    const choro = join(REPO, "skills", "map-native", "src", "ChoroplethMap.tsx");
    expect(resolveRelative(MAP_MOUNT, "./ChoroplethMap")).toBe(choro);
  });
  it("returns null for an unresolvable specifier", () => {
    expect(resolveRelative(MAP_MOUNT, "./does-not-exist")).toBeNull();
  });
});

describe("traceClosure — map-native interactive entry", () => {
  const { files, bareSpecifiers } = traceClosure(MAP_MOUNT);
  const rel = files.map((f) => f.slice(REPO.length + 1));
  it("includes the 7 map components reached from mount.tsx", () => {
    expect(rel).toContain("skills/map-native/src/ChoroplethMap.tsx");
    expect(rel).toContain("skills/map-native/src/SymbolMap.tsx");
    expect(rel).toContain("skills/map-native/src/CartogramMap.tsx");
  });
  it("stays entirely within skills/map-native (no scrolly/chart-native)", () => {
    expect(rel.every((r) => r.startsWith("skills/map-native/"))).toBe(true);
  });
  it("excludes the off-path files that import ../../scrolly", () => {
    expect(rel).not.toContain("skills/map-native/src/conformance.ts");
    expect(rel).not.toContain("skills/map-native/src/route-story.ts");
  });
  it("pulls remotion as a bare dep (via route-geo → video-scene)", () => {
    expect(bareSpecifiers).toContain("remotion");
    expect(bareSpecifiers).toContain("@maptiler/sdk");
    expect(bareSpecifiers).toContain("react-dom/client");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: FAIL — `Cannot find module "./bundle-source.mjs"` (file not created yet).

- [ ] **Step 3: Implement the tracer**

```js
// skills/splash/scripts/bundle-source.mjs
// EXPORT (form 1 — "Code source") generator for the map-native / scrolly engines: assemble a
// SELF-CONTAINED, runnable Vite project for ONE interactive/scrolly element so a technical
// journalist can `bun install && bun run build` and rebuild/customise it from source.
//
// Unlike chart-native (whose src is self-contained, so export-source.mjs copies it wholesale),
// map-native/scrolly src is cross-entangled and pulls @maptiler/@turf/remotion. So we CLOSURE-
// trace from the engine's real mount.tsx (reused verbatim; config baked via the Vite __CONFIG__
// define) and copy exactly the reached files + assets PRESERVING the repo-relative
// skills/<name>/... layout, so every existing relative import resolves unchanged. Deps are
// DERIVED from the traced bare specifiers (never hand-authored — remotion is on the interactive
// map path). Map bundles are rebuildable but online-only and need the journalist's own
// VITE_MAPTILER_KEY (.env) — never baked.
//
//   bun bundle-source.mjs <source-manifest.json> <config.json> <destDir>
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(scriptDir, "..", "..", ".."); // skills/splash/scripts → repo root

const RESOLVE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".json", ".geojson"];

// Strip a Vite query suffix (?raw, ?url) so the underlying file resolves.
export function stripQuery(spec) {
  const i = spec.indexOf("?");
  return i === -1 ? spec : spec.slice(0, i);
}

// All import/export specifiers in a source file. map-native/scrolly use only STATIC imports
// (no dynamic import() — verified), so two regexes over `… from "x"` and side-effect
// `import "x"` cover every edge (import/import type/export-from/side-effect css).
export function importSpecifiers(src) {
  const specs = new Set();
  for (const m of src.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.add(m[1]);
  for (const m of src.matchAll(/(?:^|[;\n{}(]|\s)import\s*["']([^"']+)["']/g))
    specs.add(m[1]);
  return [...specs];
}

// Resolve a RELATIVE specifier to an absolute file, trying extensions + /index.*, honouring
// an explicit extension (.json/.geojson/.css) and stripping ?raw/?url first.
export function resolveRelative(fromFileAbs, spec) {
  const base = resolve(dirname(fromFileAbs), stripQuery(spec));
  const candidates = [];
  if (extname(base)) candidates.push(base);
  for (const e of RESOLVE_EXTS) candidates.push(base + e);
  for (const e of RESOLVE_EXTS) candidates.push(join(base, "index" + e));
  for (const c of candidates)
    if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

// Walk the static import graph from an entry file. Returns the reached local files (the copy
// set — assets are leaf files here) and the bare specifiers (the dep set).
export function traceClosure(entryAbs) {
  const files = new Set();
  const bare = new Set();
  const stack = [resolve(entryAbs)];
  while (stack.length) {
    const f = stack.pop();
    if (files.has(f)) continue;
    files.add(f);
    if (/\.(json|geojson|css)$/i.test(f)) continue; // leaf asset — no imports to follow
    const src = readFileSync(f, "utf8");
    for (const spec of importSpecifiers(src)) {
      if (spec.startsWith(".") || spec.startsWith("/")) {
        const r = resolveRelative(f, spec);
        if (!r)
          throw new Error(
            `bundle-source: cannot resolve "${spec}" imported by ${relative(REPO_ROOT, f)}`,
          );
        stack.push(r);
      } else {
        bare.add(stripQuery(spec));
      }
    }
  }
  return { files: [...files], bareSpecifiers: [...bare] };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: PASS (all `traceClosure`/`importSpecifiers`/`resolveRelative`/`stripQuery` tests green).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/bundle-source.mjs skills/splash/scripts/bundle-source.test.ts
git commit -m "feat(splash): static-import closure tracer for the source-bundle generator"
```

---

## Task 2: Dependency derivation (`deriveDeps` + `packageName`)

**Files:**
- Modify: `skills/splash/scripts/bundle-source.mjs`
- Test: `skills/splash/scripts/bundle-source.test.ts`

**Interfaces:**
- Consumes: `traceClosure(...).bareSpecifiers`.
- Produces: `packageName(spec: string): string`, `deriveDeps(bareSpecifiers: string[], skillPkgs: Array<{dependencies?: object; devDependencies?: object}>): { dependencies: Record<string,string>; devDependencies: Record<string,string> }`.

- [ ] **Step 1: Write failing tests**

```ts
// append to skills/splash/scripts/bundle-source.test.ts
import { packageName, deriveDeps } from "./bundle-source.mjs";

describe("packageName", () => {
  it("keeps a scoped package name, drops the subpath", () => {
    expect(packageName("@maptiler/sdk/dist/maptiler-sdk.css")).toBe("@maptiler/sdk");
    expect(packageName("react-dom/client")).toBe("react-dom");
    expect(packageName("react")).toBe("react");
  });
});

describe("deriveDeps", () => {
  const pkgs = [
    { dependencies: { "@maptiler/sdk": "3.6.0", remotion: "4.0.482", react: "19.2.7", "react-dom": "19.2.7" },
      devDependencies: { vite: "8.1.0", "@vitejs/plugin-react": "6.0.3", "vite-plugin-singlefile": "2.3.3", typescript: "6.0.3", "@types/react": "19.2.17", "@types/react-dom": "19.2.3" } },
  ];
  it("maps closure specifiers to pinned versions and includes fixed devDeps", () => {
    const { dependencies, devDependencies } = deriveDeps(
      ["react", "react-dom/client", "@maptiler/sdk", "@maptiler/sdk/dist/maptiler-sdk.css", "remotion"],
      pkgs,
    );
    expect(dependencies).toEqual({ react: "19.2.7", "react-dom": "19.2.7", "@maptiler/sdk": "3.6.0", remotion: "4.0.482" });
    expect(devDependencies.vite).toBe("8.1.0");
    expect(devDependencies["vite-plugin-singlefile"]).toBe("2.3.3");
  });
  it("skips node: builtins", () => {
    const { dependencies } = deriveDeps(["node:child_process", "react"], pkgs);
    expect(dependencies["node:child_process"]).toBeUndefined();
    expect(dependencies.react).toBe("19.2.7");
  });
  it("throws when a specifier has no version in the involved skills", () => {
    expect(() => deriveDeps(["left-pad"], pkgs)).toThrow(/no version for/);
  });
  it("throws on a version conflict across skills", () => {
    const conflicting = [{ dependencies: { react: "19.2.7" } }, { dependencies: { react: "18.0.0" } }];
    expect(() => deriveDeps(["react"], conflicting)).toThrow(/version conflict/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: FAIL — `packageName`/`deriveDeps` not exported.

- [ ] **Step 3: Implement**

```js
// append to skills/splash/scripts/bundle-source.mjs

// The bundle always needs these dev deps (Vite scaffold + types), version-resolved from the
// same skills so the lockfile-resolved pins never drift.
const FIXED_DEV_DEPS = [
  "vite",
  "@vitejs/plugin-react",
  "vite-plugin-singlefile",
  "typescript",
  "@types/react",
  "@types/react-dom",
];

// The npm PACKAGE name for a bare specifier: keep @scope/name, drop any subpath.
export function packageName(spec) {
  const s = stripQuery(spec);
  if (s.startsWith("@")) return s.split("/").slice(0, 2).join("/");
  return s.split("/")[0];
}

// Build the bundle's package.json dep maps from the traced bare specifiers, resolving each to a
// single pinned version drawn from the UNION of the involved skills' package.json. Fails loudly
// on a missing or conflicting version rather than guessing.
export function deriveDeps(bareSpecifiers, skillPkgs) {
  const versions = {};
  for (const p of skillPkgs) {
    for (const [k, v] of Object.entries({
      ...(p.dependencies ?? {}),
      ...(p.devDependencies ?? {}),
    })) {
      if (versions[k] && versions[k] !== v)
        throw new Error(
          `bundle-source: version conflict for "${k}" across skills: ${versions[k]} vs ${v}`,
        );
      versions[k] = v;
    }
  }
  const dependencies = {};
  for (const spec of bareSpecifiers) {
    const name = packageName(spec);
    if (name.startsWith("node:")) continue;
    if (dependencies[name]) continue;
    const v = versions[name];
    if (!v)
      throw new Error(
        `bundle-source: no version for dependency "${name}" in the involved skills' package.json`,
      );
    dependencies[name] = v;
  }
  const devDependencies = {};
  for (const name of FIXED_DEV_DEPS) {
    const v = versions[name];
    if (!v)
      throw new Error(`bundle-source: no version for devDependency "${name}"`);
    devDependencies[name] = v;
  }
  return { dependencies, devDependencies };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/bundle-source.mjs skills/splash/scripts/bundle-source.test.ts
git commit -m "feat(splash): derive bundle deps from the traced closure (version-union, fail-loud)"
```

---

## Task 3: Scaffold emitters (vite.config / index.html / tsconfig / README / .env.example)

**Files:**
- Modify: `skills/splash/scripts/bundle-source.mjs`
- Test: `skills/splash/scripts/bundle-source.test.ts`

**Interfaces:**
- Produces: `bundleViteConfig(engine: "map-native"|"scrolly"): string`, `bundleIndexHtml(engine: string, title: string): string`, `bundleTsconfig(): string`, `bundleReadme(engine: string, title: string): string`, `bundleEnvExample(): string`.

- [ ] **Step 1: Write failing tests**

```ts
// append to skills/splash/scripts/bundle-source.test.ts
import {
  bundleViteConfig,
  bundleIndexHtml,
  bundleTsconfig,
  bundleReadme,
  bundleEnvExample,
} from "./bundle-source.mjs";

describe("scaffold emitters", () => {
  it("map vite.config bakes ./config.json into __CONFIG__ and forces interactive", () => {
    const cfg = bundleViteConfig("map-native");
    expect(cfg).toContain('readFileSync(new URL("./config.json"');
    expect(cfg).toContain("__INTERACTIVE__: JSON.stringify(true)");
    expect(cfg).toContain("viteSingleFile()");
  });
  it("scrolly vite.config dedupes react (single copy) and bakes __CONFIG__", () => {
    const cfg = bundleViteConfig("scrolly");
    expect(cfg).toContain('dedupe: ["react", "react-dom"]');
    expect(cfg).toContain("__CONFIG__");
  });
  it("index.html points its module script at the engine mount", () => {
    expect(bundleIndexHtml("map-native", "Ma carte")).toContain(
      'src="/skills/map-native/src/mount.tsx"',
    );
    expect(bundleIndexHtml("map-native", "Ma carte")).toContain("<title>Ma carte</title>");
  });
  it("env example declares the MapTiler key, empty", () => {
    expect(bundleEnvExample()).toContain("VITE_MAPTILER_KEY=");
  });
  it("README documents the key + build and the online-only caveat", () => {
    const r = bundleReadme("map-native", "Ma carte");
    expect(r).toContain("bun install");
    expect(r).toContain("VITE_MAPTILER_KEY");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: FAIL — emitters not exported.

- [ ] **Step 3: Implement**

```js
// append to skills/splash/scripts/bundle-source.mjs

// The bundle's Vite config. Reuses each engine's real behaviour but sources the baked config
// from ./config.json (NOT process.env.CONFIG), so `vite build` alone rebuilds the visual.
export function bundleViteConfig(engine) {
  const isScrolly = engine === "scrolly";
  const defineBlock = isScrolly
    ? `  define: { __CONFIG__: JSON.stringify(injectedConfig) },`
    : `  define: {\n    __INTERACTIVE__: JSON.stringify(true),\n    __CONFIG__: JSON.stringify(injectedConfig),\n  },`;
  // Scrolly builds pull chart-native + map-native React copies too; dedupe to one React or hooks
  // throw (mirrors skills/scrolly/vite.config.ts).
  const resolveBlock = isScrolly
    ? `  resolve: {\n    dedupe: ["react", "react-dom"],\n    alias: {\n      react: resolve(here, "node_modules/react"),\n      "react-dom": resolve(here, "node_modules/react-dom"),\n    },\n  },\n`
    : "";
  const header = isScrolly
    ? `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport { viteSingleFile } from "vite-plugin-singlefile";\nimport { readFileSync } from "node:fs";\nimport { resolve } from "node:path";\nimport { fileURLToPath } from "node:url";\n\nconst here = fileURLToPath(new URL(".", import.meta.url));\n`
    : `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport { viteSingleFile } from "vite-plugin-singlefile";\nimport { readFileSync } from "node:fs";\n`;
  return `${header}
const injectedConfig = JSON.parse(
  readFileSync(new URL("./config.json", import.meta.url), "utf8"),
);

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
${defineBlock}
${resolveBlock}  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: "index.html" },
  },
});
`;
}

export function bundleIndexHtml(engine, title) {
  const t = String(title ?? "Visuel").replace(/[<>&]/g, "");
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t}</title>
    <style>html,body{margin:0;padding:0}#root{width:100%}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/skills/${engine}/src/mount.tsx"></script>
  </body>
</html>
`;
}

export function bundleTsconfig() {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          resolveJsonModule: true,
          allowImportingTsExtensions: true,
          noEmit: true,
          types: ["vite/client"],
        },
        include: ["skills"],
      },
      null,
      2,
    ) + "\n"
  );
}

export function bundleEnvExample() {
  return `# Your own MapTiler SDK key — required to fetch basemap tiles at runtime.
# Get one free at https://www.maptiler.com/ , then: cp .env.example .env and fill it in.
VITE_MAPTILER_KEY=
`;
}

export function bundleReadme(engine, title) {
  return `# ${title ?? "Visuel"} — interactive source bundle

Self-contained Vite project for this ${engine} element. Rebuild or customise it from source.

## Rebuild

    cp .env.example .env      # then paste your own VITE_MAPTILER_KEY
    bun install
    bun run build

The built file is \`dist/index.html\` — a single self-contained HTML you can open or embed.

## Note — online basemap

The map fetches its basemap tiles from MapTiler at runtime, so this bundle needs network
access and **your own** \`VITE_MAPTILER_KEY\` (free tier works). \`bun run build\` succeeds even
without a key, but the page then throws \`VITE_MAPTILER_KEY missing\` in the browser — set the
key before building.

## Customise

- **Data & options:** edit \`config.json\`, then \`bun run build\` again.
- **The visual itself:** edit the components under \`skills/${engine}/src/\`.
`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/bundle-source.mjs skills/splash/scripts/bundle-source.test.ts
git commit -m "feat(splash): source-bundle scaffold emitters (vite/index/tsconfig/readme/env)"
```

---

## Task 4: Generator CLI (`main`) + assembly test on a real map config

**Files:**
- Modify: `skills/splash/scripts/bundle-source.mjs`
- Test: `skills/splash/scripts/bundle-source.test.ts`

**Interfaces:**
- Consumes: all Task 1-3 exports.
- Produces: the CLI `bun bundle-source.mjs <source-manifest.json> <config.json> <destDir>` printing `BUNDLE_SOURCE_RESULT {json}`; the assembled bundle directory tree.
- Manifest shape: `{ engine: "map-native" | "scrolly", type?: string, kind?: "map"|"chart"|"image" }`.

- [ ] **Step 1: Write the failing assembly test**

Uses map-native's committed sample config so no producer run is needed.

```ts
// append to skills/splash/scripts/bundle-source.test.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("bundle-source CLI — map-native assembly", () => {
  const scriptPath = join(import.meta.dir, "bundle-source.mjs");
  const sampleConfig = join(REPO, "skills", "map-native", "assets", "sample-data", "choropleth.json");

  it("assembles a runnable, layout-preserving map bundle", () => {
    const work = mkdtempSync(join(tmpdir(), "bundle-source-map-"));
    const manifestPath = join(work, "source-manifest.json");
    writeFileSync(manifestPath, JSON.stringify({ engine: "map-native", type: "choropleth" }));
    const dest = join(work, "carte-source");
    try {
      const out = execFileSync("bun", [scriptPath, manifestPath, sampleConfig, dest], { encoding: "utf8" });
      expect(out).toContain("BUNDLE_SOURCE_RESULT");
      // Layout preserved — the engine mount + a reached component live under skills/map-native/src.
      expect(existsSync(join(dest, "skills", "map-native", "src", "mount.tsx"))).toBe(true);
      expect(existsSync(join(dest, "skills", "map-native", "src", "ChoroplethMap.tsx"))).toBe(true);
      // Off-path cross-skill importers are NOT copied.
      expect(existsSync(join(dest, "skills", "map-native", "src", "conformance.ts"))).toBe(false);
      // Scaffold pieces present.
      for (const f of ["package.json", "vite.config.ts", "index.html", "tsconfig.json", "config.json", "README.md", ".env.example"])
        expect(existsSync(join(dest, f))).toBe(true);
      // Deps complete AND include remotion (the trap the metafile/tracer self-corrects).
      const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
      expect(pkg.dependencies["@maptiler/sdk"]).toBe("3.6.0");
      expect(pkg.dependencies.remotion).toBe("4.0.482");
      expect(pkg.scripts.build).toBe("vite build");
      // No copied file has a DANGLING cross-skill relative import (would break a rebuild).
      const allTs = walk(join(dest, "skills")).filter((f) => /\.(ts|tsx)$/.test(f));
      for (const f of allTs) {
        const src = readFileSync(f, "utf8");
        for (const m of src.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)) {
          const target = require("node:path").resolve(require("node:path").dirname(f), m[1].replace(/\?.*$/, ""));
          const exts = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".geojson"];
          const ok = exts.some((e) => existsSync(target + e)) || exts.some((e) => existsSync(join(target, "index" + e)));
          expect(ok).toBe(true);
        }
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: FAIL — no `BUNDLE_SOURCE_RESULT` (CLI `main` not implemented).

- [ ] **Step 3: Implement the CLI main**

```js
// append to skills/splash/scripts/bundle-source.mjs

const ENGINE_ENTRY = {
  "map-native": "skills/map-native/src/mount.tsx",
  scrolly: "skills/scrolly/src/mount.tsx",
};

// Which skills a copy set spans (for the version union).
function touchedSkills(files) {
  const set = new Set();
  for (const f of files) {
    const m = relative(REPO_ROOT, f).match(/^skills\/([^/]+)\//);
    if (m) set.add(m[1]);
  }
  return [...set];
}

if (import.meta.main) {
  const [manifestPath, configPath, destDir] = process.argv.slice(2);
  if (!manifestPath || !configPath || !destDir) {
    console.error("usage: bundle-source.mjs <source-manifest.json> <config.json> <destDir>");
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    console.error(`bundle-source: cannot read manifest ${manifestPath}: ${e.message}`);
    process.exit(1);
  }
  const engine = manifest.engine;
  const entryRel = ENGINE_ENTRY[engine];
  if (!entryRel) {
    console.error(`bundle-source: unknown engine "${engine}" (expected map-native | scrolly)`);
    process.exit(1);
  }
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error(`bundle-source: cannot read config ${configPath}: ${e.message}`);
    process.exit(1);
  }

  const entryAbs = join(REPO_ROOT, entryRel);
  const { files, bareSpecifiers } = traceClosure(entryAbs);

  const abs = resolve(destDir);
  mkdirSync(abs, { recursive: true });

  // Copy the closure preserving repo-relative layout so every relative import resolves unchanged.
  for (const f of files) {
    const relPath = relative(REPO_ROOT, f);
    const dest = join(abs, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(f, dest);
  }
  // Copy the engine's vite-env.d.ts (declares ?raw modules + VITE_MAPTILER_KEY) if present —
  // not import-reached, but the journalist's editor wants it.
  const envDts = join(REPO_ROOT, "skills", engine, "src", "vite-env.d.ts");
  if (existsSync(envDts)) {
    const dest = join(abs, "skills", engine, "src", "vite-env.d.ts");
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(envDts, dest);
  }

  // Deps from the traced specifiers, versions from the union of touched skills' package.json.
  const skillPkgs = touchedSkills(files).map((s) =>
    JSON.parse(readFileSync(join(REPO_ROOT, "skills", s, "package.json"), "utf8")),
  );
  const { dependencies, devDependencies } = deriveDeps(bareSpecifiers, skillPkgs);

  const title = config.title ?? config.story?.title ?? "Visuel";
  const id = require("node:path").basename(abs).replace(/-source$/, "") || engine;
  writeFileSync(join(abs, "config.json"), JSON.stringify(config, null, 2) + "\n");
  writeFileSync(
    join(abs, "package.json"),
    JSON.stringify(
      { name: `${id}-source`, private: true, type: "module", scripts: { dev: "vite", build: "vite build" }, dependencies, devDependencies },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(abs, "vite.config.ts"), bundleViteConfig(engine));
  writeFileSync(join(abs, "index.html"), bundleIndexHtml(engine, title));
  writeFileSync(join(abs, "tsconfig.json"), bundleTsconfig());
  writeFileSync(join(abs, "README.md"), bundleReadme(engine, title));
  writeFileSync(join(abs, ".env.example"), bundleEnvExample());

  console.log("BUNDLE_SOURCE_RESULT " + JSON.stringify({ dir: abs, engine, files: files.length }));
}
```

Note: replace the two `require("node:path")` uses with the already-imported `basename`/`resolve`/`dirname` — add `basename` to the top `import … from "node:path"` line. (The test's inline `require` is fine in a `bun test` file.)

- [ ] **Step 4: Run to verify pass**

Run: `cd skills/splash && bun test scripts/bundle-source.test.ts`
Expected: PASS — the map bundle assembles, layout preserved, deps include remotion, no dangling import.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/bundle-source.mjs skills/splash/scripts/bundle-source.test.ts
git commit -m "feat(splash): bundle-source CLI — closure copy + scaffold for map-native/scrolly"
```

---

## Task 5: map-native producer emits `source-manifest.json` + `config.json`

**Files:**
- Create: `skills/map-native/src/source-manifest.ts` (pure helper, unit-testable)
- Modify: `skills/map-native/scripts/produce.mjs:283-310` (interactive case)
- Test: `skills/map-native/tests/source-manifest.test.ts`

**Interfaces:**
- Produces: `mapSourceManifest(config: { type?: string }): { engine: "map-native"; type: string }`.

- [ ] **Step 1: Write failing test**

```ts
// skills/map-native/tests/source-manifest.test.ts
import { describe, it, expect } from "bun:test";
import { mapSourceManifest } from "../src/source-manifest";

describe("mapSourceManifest", () => {
  it("tags the engine and takes the config type", () => {
    expect(mapSourceManifest({ type: "symbol" })).toEqual({ engine: "map-native", type: "symbol" });
  });
  it("defaults a missing type to choropleth (the producer's implicit default)", () => {
    expect(mapSourceManifest({})).toEqual({ engine: "map-native", type: "choropleth" });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/map-native && bun test tests/source-manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// skills/map-native/src/source-manifest.ts
// The entry marker the EXPORT "code source" generator (skills/splash/scripts/bundle-source.mjs)
// reads to build a runnable bundle. Mirrors chart-native's native-source.json but engine-tagged.
export function mapSourceManifest(config: { type?: string }): {
  engine: "map-native";
  type: string;
} {
  // choropleth is this producer's implicit default type (see the conformance guard).
  return { engine: "map-native", type: config.type ?? "choropleth" };
}
```

- [ ] **Step 4: Wire it into produce.mjs (interactive case)**

In `skills/map-native/scripts/produce.mjs`, add the import near the other `../src` imports at the top (around line 40):

```js
import { mapSourceManifest } from "../src/source-manifest.ts";
```

Then inside `case "interactive":`, right after the `interactive.html` copy (current lines 297-300, after the `console.log(\`[produce map] interactive.html → …\`)`), insert:

```js
    // Drop the entry marker + the exact rendered config next to the outputs so EXPORT
    // (form 1 — "Code source") can assemble a runnable source bundle (bundle-source.mjs).
    // Both are .json — ignored by export-code's artifact glob and by assert-selfcontained.
    writeFileSync(
      join(outDir, "source-manifest.json"),
      JSON.stringify(mapSourceManifest(parsedConfig), null, 2) + "\n",
    );
    copyFileSync(configPath, join(outDir, "config.json"));
```

(`writeFileSync`, `copyFileSync`, `join`, `parsedConfig`, `configPath`, `outDir` are all already in scope — verified.)

- [ ] **Step 5: Run helper test + typecheck**

Run: `cd skills/map-native && bun test tests/source-manifest.test.ts && bunx tsc --noEmit`
Expected: PASS + clean typecheck.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/source-manifest.ts skills/map-native/tests/source-manifest.test.ts skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): emit source-manifest.json + config.json for the code-source bundle"
```

---

## Task 6: scrolly producer emits `source-manifest.json` + `config.json`

**Files:**
- Create: `skills/scrolly/src/source-manifest.ts`
- Modify: `skills/scrolly/scripts/produce.mjs:35-43`
- Test: `skills/scrolly/tests/source-manifest.test.ts`

**Interfaces:**
- Produces: `scrollySourceManifest(config: object): { engine: "scrolly"; kind: "map"|"chart"|"image" }`.
- Kind rule: a chart-scrolly config carries `nativeType` (see `mount.tsx` — chart configs use `nativeType`, map configs use `type`); an image config carries `visual: "image"`. Default `map`.

- [ ] **Step 1: Write failing test**

```ts
// skills/scrolly/tests/source-manifest.test.ts
import { describe, it, expect } from "bun:test";
import { scrollySourceManifest } from "../src/source-manifest";

describe("scrollySourceManifest", () => {
  it("tags a chart-scrolly by its nativeType marker", () => {
    expect(scrollySourceManifest({ nativeType: "bar" })).toEqual({ engine: "scrolly", kind: "chart" });
  });
  it("tags a map-scrolly (has type, no nativeType)", () => {
    expect(scrollySourceManifest({ type: "choropleth" })).toEqual({ engine: "scrolly", kind: "map" });
  });
  it("tags an image-scrolly by visual", () => {
    expect(scrollySourceManifest({ visual: "image" })).toEqual({ engine: "scrolly", kind: "image" });
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/scrolly && bun test tests/source-manifest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// skills/scrolly/src/source-manifest.ts
// Entry marker for the EXPORT "code source" generator (bundle-source.mjs). A scrolly is
// multi-visual, so it records the host kind (chart | map | image) rather than a single type.
export function scrollySourceManifest(config: {
  nativeType?: string;
  type?: string;
  visual?: string;
}): { engine: "scrolly"; kind: "map" | "chart" | "image" } {
  const kind =
    config.visual === "image"
      ? "image"
      : "nativeType" in config && config.nativeType != null
        ? "chart"
        : "map";
  return { engine: "scrolly", kind };
}
```

- [ ] **Step 4: Wire it into produce.mjs**

In `skills/scrolly/scripts/produce.mjs`, add the import after the existing imports (line 6):

```js
import { writeFileSync } from "node:fs";
import { scrollySourceManifest } from "../src/source-manifest.ts";
```

Then after the `scrolly.html` copy (current lines 42-43, after `copyFileSync(join(root, "dist", "index.html"), out)`), insert before the `PRODUCE_RESULT` log:

```js
const parsedConfig = JSON.parse(readFS(configPath, "utf8"));
writeFileSync(join(outDir, "source-manifest.json"), JSON.stringify(scrollySourceManifest(parsedConfig), null, 2) + "\n");
copyFileSync(configPath, join(outDir, "config.json"));
```

(`readFS`, `copyFileSync`, `join`, `configPath`, `outDir` already in scope; `writeFileSync` added above.)

- [ ] **Step 5: Run test + typecheck**

Run: `cd skills/scrolly && bun test tests/source-manifest.test.ts && bunx tsc --noEmit`
Expected: PASS + clean typecheck.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/source-manifest.ts skills/scrolly/tests/source-manifest.test.ts skills/scrolly/scripts/produce.mjs
git commit -m "feat(scrolly): emit source-manifest.json + config.json for the code-source bundle"
```

---

## Task 7: Tighten `assertDelivered(code-source)` to require a real bundle

**Files:**
- Modify: `skills/splash/src/export-guard.ts:122-128`
- Test: `skills/splash/src/export-guard.test.ts` (append; create if absent)

**Interfaces:**
- Consumes/Produces: unchanged `assertDelivered(files, { format, form })` signature; stricter `code-source` rule.

- [ ] **Step 1: Write failing tests**

```ts
// append to skills/splash/src/export-guard.test.ts (create with the import header if missing)
import { describe, it, expect } from "bun:test";
import { assertDelivered } from "./export-guard";

describe("assertDelivered — code-source now requires a runnable bundle", () => {
  it("accepts a real bundle (package.json + vite.config.ts present)", () => {
    expect(() =>
      assertDelivered(["package.json", "vite.config.ts", "index.html", "config.json", "skills"], {
        format: "interactive",
        form: "code-source",
      }),
    ).not.toThrow();
  });
  it("rejects a lone-html copy masquerading as code-source", () => {
    expect(() =>
      assertDelivered(["interactive.html"], { format: "interactive", form: "code-source" }),
    ).toThrow(/runnable source bundle/);
  });
  it("still rejects an empty dir", () => {
    expect(() => assertDelivered([], { format: "scrolly", form: "code-source" })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd skills/splash && bun test src/export-guard.test.ts`
Expected: FAIL — the lone-html case does not throw yet (current rule only checks non-empty).

- [ ] **Step 3: Implement the tightened rule**

Replace `skills/splash/src/export-guard.ts:122-128` with:

```ts
  if (form === "code-source") {
    if (files.length === 0)
      throw new Error(
        `not a delivery: ${format} form=code-source requires a non-empty source-bundle directory`,
      );
    // A runnable bundle carries a Vite project at its root — package.json + vite.config.ts.
    // This stops a regression back to a lone interactive.html copy from passing as code-source.
    if (!files.includes("package.json") || !files.includes("vite.config.ts"))
      throw new Error(
        `not a delivery: ${format} form=code-source must be a runnable source bundle (package.json + vite.config.ts at its root), got ${JSON.stringify(files)}`,
      );
    return;
  }
```

- [ ] **Step 4: Run to verify pass + full splash suite**

Run: `cd skills/splash && bun test src/export-guard.test.ts && bun test`
Expected: PASS — new rule holds; no regression in the rest of the splash suite (chart-native's bundle already carries package.json + vite.config.ts, so its code-source delivery still passes).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/export-guard.ts skills/splash/src/export-guard.test.ts
git commit -m "feat(splash): code-source delivery must be a runnable bundle (package.json + vite.config)"
```

---

## Task 8: Route map/scrolly `code-source` through the generator in `export-code.mjs`

**Files:**
- Modify: `skills/splash/scripts/export-code.mjs` (`hasNativeSource` region ~191-196; code-source branch ~235-281; `emitProposal` form a ~367-404; header comment)
- Test: `skills/splash/scripts/export-code.test.ts`

**Interfaces:**
- Consumes: `bundle-source.mjs` CLI (`BUNDLE_SOURCE_RESULT`), `source-manifest.json` in `outDir`.
- Produces: for a map/scrolly `--form code-source`, a delivered `<id>-source` runnable bundle folder.

- [ ] **Step 1: Add the generator path constant + hasSourceManifest**

Near the top constants (`export-code.mjs:49-56`, beside `EXPORT_SOURCE_SCRIPT`), add:

```js
// The engine-agnostic runnable-bundle generator for map-native / scrolly (their src is
// entangled, so bundle-source.mjs closure-copies it; chart-native keeps export-source.mjs).
const BUNDLE_SOURCE_SCRIPT = join(dirname(SELF), "bundle-source.mjs");
```

In `main`, beside `hasNativeSource` (~191-196), add:

```js
  // map-native / scrolly drop source-manifest.json + config.json → their code-source form is a
  // runnable bundle assembled by bundle-source.mjs (NOT the old lone-html copy).
  const hasSourceManifest =
    existsSync(join(outDir, "source-manifest.json")) &&
    existsSync(join(outDir, "config.json")) &&
    !hasNativeSource;
```

- [ ] **Step 2: Write a failing routing test**

```ts
// append to skills/splash/scripts/export-code.test.ts
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("export-code — map-native code-source builds a runnable bundle", () => {
  const script = join(import.meta.dir, "export-code.mjs");
  it("assembles <id>-source with a Vite project when a source-manifest is present", () => {
    const work = mkdtempSync(join(tmpdir(), "export-code-map-"));
    const outDir = join(work, "out");
    mkdirSync(outDir, { recursive: true });
    // Minimal produced outDir for an interactive map element.
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    writeFileSync(join(outDir, "source-manifest.json"), JSON.stringify({ engine: "map-native", type: "choropleth" }));
    // Reuse the committed sample config as this element's config.
    const sample = join(import.meta.dir, "..", "..", "map-native", "assets", "sample-data", "choropleth.json");
    execFileSync("cp", [sample, join(outDir, "config.json")]);
    // A minimal shippable report for id "m1".
    const report = { results: [{ id: "m1", format: "interactive", status: "produced", reviewed: true, renderApproved: true }] };
    const reportPath = join(work, "report.json");
    writeFileSync(reportPath, JSON.stringify(report));
    const exportDir = join(work, "exports", "carte");
    try {
      const out = execFileSync("bun", [script, outDir, exportDir, "--results", reportPath, "--id", "m1", "--form", "code-source"], { encoding: "utf8" });
      expect(out).toContain("EXPORT_CODE_RESULT");
      expect(existsSync(join(exportDir, "m1-source", "package.json"))).toBe(true);
      expect(existsSync(join(exportDir, "m1-source", "vite.config.ts"))).toBe(true);
      expect(existsSync(join(exportDir, "m1-source", "skills", "map-native", "src", "mount.tsx"))).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Run to verify fail**

Run: `cd skills/splash && bun test scripts/export-code.test.ts`
Expected: FAIL — code-source currently copies the lone html (no `m1-source` dir).

- [ ] **Step 4: Implement the branch**

In the `if (form === "code-source")` block, after the `hasNativeSource` branch and BEFORE the current built-files fallback (`export-code.mjs:266-280`), insert:

```js
    if (hasSourceManifest) {
      const bundleDir = join(absExportDir, `${id}-source`);
      execFileSync(
        "bun",
        [BUNDLE_SOURCE_SCRIPT, join(outDir, "source-manifest.json"), join(outDir, "config.json"), bundleDir],
        { stdio: "inherit" },
      );
      assertDelivered(readdirSync(bundleDir), { format, form: "code-source" });
      done({ format, form: "code-source", kind: "react-source-bundle", path: bundleDir, exportDir: absExportDir });
      return;
    }
```

(The old built-files fallback stays only as a defensive last resort for an outDir with neither marker.)

- [ ] **Step 5: Relabel the proposal (emitProposal form a)**

In `emitProposal` (`export-code.mjs:367-404`), the `forms.a` currently branches on `hasNativeSource` only. Pass `hasSourceManifest` into `emitProposal`'s `ctx` (add it where `emitProposal({...})` is called ~200-212 and destructured ~343-355), then change the `forms.a` assignment so a **source-manifest** element advertises a runnable bundle:

```js
    forms.a =
      hasNativeSource || hasSourceManifest
        ? {
            kind: "react-source-bundle",
            label: "Code source (bundle React autonome)",
            path: join(absExportDir, `${id}-source`),
            pending: true,
            deliver: `${deliverBase} --form code-source`,
          }
        : {
            kind: "built-files-folder",
            label: "Code source (fichiers construits)",
            path: absExportDir,
            pending: true,
            deliver: `${deliverBase} --form code-source`,
          };
```

And in the human relay block (`export-code.mjs:424-429`), the `forms.a.kind === "react-source-bundle"` branch already prints the runnable-bundle line — no change needed there.

- [ ] **Step 6: Run to verify pass + full splash suite**

Run: `cd skills/splash && bun test scripts/export-code.test.ts && bun test`
Expected: PASS — map code-source assembles `m1-source`; chart-native + hosted-DW paths unchanged.

- [ ] **Step 7: Update the header comment**

In `export-code.mjs` header (lines 13-18), update the `code-source` description to reflect map/scrolly now producing a runnable bundle via `bundle-source.mjs` (not the built-files folder). Keep it one or two lines.

- [ ] **Step 8: Commit**

```bash
git add skills/splash/scripts/export-code.mjs skills/splash/scripts/export-code.test.ts
git commit -m "feat(splash): route map-native/scrolly code-source through bundle-source (runnable bundle)"
```

---

## Task 9: Opt-in from-zero build+render verification harness

**Files:**
- Create: `skills/splash/scripts/verify-source-bundle.mjs`

**Interfaces:**
- CLI: `bun verify-source-bundle.mjs` — produces representative elements, bundles them, runs `bun install && bun run build`, headless-renders `dist/index.html`, asserts the map renders (no missing-key throw, a canvas/map node present). Requires `VITE_MAPTILER_KEY` in env. **Not** wired into `bun run check`.

- [ ] **Step 1: Implement the harness**

The script, for each representative case `{ engine, type/config }`:
1. run the engine `produce.mjs` for the `interactive`/`scrolly` format into a temp `outDir` (real, network);
2. run `bundle-source.mjs <outDir/source-manifest.json> <outDir/config.json> <bundleDir>`;
3. `execFileSync("bun", ["install"], { cwd: bundleDir })` then `execFileSync("bun", ["run", "build"], { cwd: bundleDir, env: { ...process.env } })`;
4. assert `existsSync(join(bundleDir, "dist", "index.html"))`;
5. headless-render it with Playwright (already a devDep) — load `dist/index.html` via `file://`, wait for the map canvas / an expected DOM node, assert no page error containing `VITE_MAPTILER_KEY missing`, screenshot to a proof path;
6. print a PASS/FAIL line per case.

Representative set: `map-native` choropleth, `map-native` symbol, one geo-heavy (`route` or `cartogram`), and one map-scrolly. Structural-only (skip step 5 render) for the remaining map types.

```js
// skills/splash/scripts/verify-source-bundle.mjs
// OPT-IN from-zero proof (real network install + live MapTiler tiles) that a map/scrolly
// code-source bundle rebuilds and renders. NOT part of `bun run check` (keeps the gate
// network-light). Run manually: VITE_MAPTILER_KEY=… bun skills/splash/scripts/verify-source-bundle.mjs
// … (implementation drives produce.mjs → bundle-source.mjs → bun install → bun run build →
//    playwright render; prints PASS/FAIL per case, writes proof PNGs under a temp proof dir.)
```

(Full implementation is mechanical; model it on `skills/map-native/scripts/snap-proof.mjs` for the Playwright render + on `bundle-source.test.ts` for driving the CLI.)

- [ ] **Step 2: Run it for real (the definition-of-done proof)**

Run: `VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY bun skills/splash/scripts/verify-source-bundle.mjs`
Expected: PASS for choropleth, symbol, the geo-heavy type, and the map-scrolly — each `dist/index.html` renders a map (proof PNGs written). Capture the output in the commit message / CHANGELOG.

- [ ] **Step 3: Commit**

```bash
git add skills/splash/scripts/verify-source-bundle.mjs
git commit -m "test(splash): opt-in from-zero build+render proof for map/scrolly source bundles"
```

---

## Task 10: Docs + gate + backlog reconciliation

**Files:**
- Modify: `skills/splash/SKILL.md` (export section — describe the now-runnable map/scrolly code-source form)
- Modify: `CLAUDE.md` (fix `:121` "15 déférés" → **14**; mark option-3 item 3 done; add a État-courant bullet)
- Modify: `docs/splash/CHANGELOG.md` (dated session entry)

- [ ] **Step 1: Run the full gate**

Run: `bun run check`
Expected: 20/20 checks pass (the new tests live under existing TEST_DIRS `skills/splash`, `skills/map-native`, `skills/scrolly` — no new gate row, no network in the gate).

- [ ] **Step 2: Update SKILL.md**

In `skills/splash/SKILL.md`, in the EXPORT/form section, note that form a (Code source) now yields a runnable React bundle for map-native/scrolly too (was chart-native only), with the MapTiler-key + online caveat. Keep it to the existing style/length.

- [ ] **Step 3: Reconcile CLAUDE.md**

- Fix line 121: `Family B types natifs (15 déférés)` → `Family B types natifs (14 déférés)`.
- In the backlog/État-courant, mark option-3 item 3 (runnable bundle map-native/scrolly) done, referencing this plan + the verify script.

- [ ] **Step 4: CHANGELOG entry**

Add a dated `2026-07-13` entry to `docs/splash/CHANGELOG.md` summarising: the closure-driven `bundle-source.mjs`, the two producer markers, the export-code routing + tightened `assertDelivered`, and the from-zero render proof results (paste the verify output).

- [ ] **Step 5: Commit**

```bash
git add skills/splash/SKILL.md CLAUDE.md docs/splash/CHANGELOG.md
git commit -m "docs(splash): runnable code-source bundle for map-native/scrolly shipped; backlog reconciled"
```

---

## Self-Review

**Spec coverage:**
- §Architecture 1 (generator) → Tasks 1-4. §Architecture 2 (producer markers) → Tasks 5-6. §Architecture 3 (export wiring + assertDelivered + emitProposal) → Tasks 7-8. §Architecture 4 (MapTiler caveat, .env.example, README) → Task 3 (`bundleEnvExample`/`bundleReadme`) + Task 9 (render gates on the key). §Verification → Task 9 (from-zero build+render, representative subset) + assembly tests in Tasks 1-4, 7-8. §Out-of-scope items 5 (CLAUDE.md 14) → Task 10. All covered.
- **Constraint C1 (deps from closure)** → Task 2 `deriveDeps` + Task 4 test asserts `remotion` present. **Constraint C2 (closure-driven copy)** → Task 1 test asserts `conformance.ts`/`route-story.ts` excluded + Task 4 test asserts no dangling import.

**Placeholder scan:** Task 9's harness body is described procedurally with a modelled reference (`snap-proof.mjs`) rather than full code — acceptable because it is a mechanical Playwright+CLI driver with no novel logic and no interface other tasks consume; every gate-affecting task (1-8, 10) has complete code. No "TBD/handle edge cases/similar to" left.

**Type consistency:** `mapSourceManifest`/`scrollySourceManifest` return `{engine, …}` consumed by `bundle-source.mjs` `main` via `manifest.engine` (Task 4 `ENGINE_ENTRY`). `traceClosure → {files, bareSpecifiers}` feeds `deriveDeps(bareSpecifiers, skillPkgs)` and the copy loop (`files`). `bundleViteConfig(engine)` / `bundleIndexHtml(engine, title)` take the same `engine` string the manifest carries. `assertDelivered(files, {format, form:"code-source"})` tightened rule matches the bundle shape Task 4/8 produce (`package.json` + `vite.config.ts` at root). Consistent.

**Note on the spec's closure mechanism:** implemented as a custom static-import tracer (Task 1), not the esbuild metafile the spec first named — esbuild can't resolve Vite `?raw`/`.css` query imports without a plugin, and the src has no dynamic imports. Spec updated to match.

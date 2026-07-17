// EXPORT (form 1 — "Code source") generator for the map-native / scrolly engines: assemble a
// SELF-CONTAINED, runnable Vite project for ONE interactive/scrolly element so a technical
// journalist can `bun install && bun run build` and rebuild/customise it from source.
//
// Unlike chart-native (whose src is self-contained, so export-source.mjs copies it wholesale),
// map-native/scrolly src is cross-entangled and pulls @maptiler/@turf. So we CLOSURE-
// trace from the engine's real mount.tsx (reused verbatim; config baked via the Vite __CONFIG__
// define) and copy exactly the reached files + assets PRESERVING the repo-relative
// skills/<name>/... layout, so every existing relative import resolves unchanged. Deps are
// DERIVED from the traced bare specifiers (never hand-authored; since the scene-constants/
// map-styles extraction the interactive closure no longer reaches remotion — video stays
// remotion-backed via video-scene.ts, which bundle-source never traces). Map bundles are rebuildable but online-only and need the journalist's own
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
import { dirname, join, resolve, relative, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(scriptDir, "..", "..", ".."); // skills/splash/scripts → repo root

const RESOLVE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".json", ".geojson"];

// Strip a Vite query suffix (?raw, ?url) so the underlying file resolves.
export function stripQuery(spec) {
  const i = spec.indexOf("?");
  return i === -1 ? spec : spec.slice(0, i);
}

// Strip `/* … */` block comments then `//` line comments so commented-out imports don't
// pollute the closure. Block first, then line — a `//` preceded by `:` is left alone so a
// `https://…` URL string is never mangled (TS/TSX source never has a bare `//` line comment
// immediately after a `:`).
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// All import/export specifiers in a source file. map-native/scrolly use only STATIC imports
// (no dynamic import() — verified), so two regexes over `… from "x"` and side-effect
// `import "x"` cover every edge (import/import type/export-from/side-effect css). Comments are
// stripped first so a commented-out import is not traced. The `from` regex refuses a
// QUOTE right before the keyword: a string literal `"from",` in data code (image-native's
// stop-word list) would otherwise parse as `from "<next-gap>"` and invent a bogus dep.
export function importSpecifiers(src) {
  const code = stripComments(src);
  const specs = new Set();
  for (const m of code.matchAll(/(?<!["'])\bfrom\s*["']([^"']+)["']/g))
    specs.add(m[1]);
  for (const m of code.matchAll(/(?:^|[;\n{}(]|\s)import\s*["']([^"']+)["']/g))
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
  // Review F3: an image-scrolly's frames are NOT bundled yet (the traced closure carries no
  // .jpg and config.framesDir is an absolute producing-machine tmp path) — a "runnable" bundle
  // would rebuild with broken images and leak local paths. Fail LOUD like the hosted-DW form
  // does, until frames ship inside the bundle (backlog follow-up).
  if (engine === "scrolly" && manifest.kind === "image") {
    console.error(
      "bundle-source: the code-source form is not yet supported for an image-scrolly — " +
        "the frames are not bundled; deliver the standalone HTML form (b) instead",
    );
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
  const id = basename(abs).replace(/-source$/, "") || engine;
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

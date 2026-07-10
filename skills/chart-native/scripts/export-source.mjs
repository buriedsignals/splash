// EXPORT (form 1 — "Code source"): assemble a SELF-CONTAINED, runnable Vite project
// for ONE chart-native chart, so a technical journalist can `bun install && bun run build`
// and rebuild/customise the interactive from source. chart-native/src has zero cross-skill
// relative imports and only standard npm deps (react, react-dom, d3-array/scale/shape/
// time-format/chord), so a straight copy of src + a static-config entry is fully buildable.
//
// The bundle bakes the config in via a STATIC import (config.json) instead of the producer's
// build-time CONFIG= env injection — so `vite build` alone (no env, no orchestrator) produces
// the interactive. Layout written at <destDir>:
//   src/            copy of chart-native/src (library components + core), minus the producer's
//                   DOM entry mount.tsx (replaced by main.tsx; it is the only src file that
//                   imports ../assets, so dropping it keeps the bundle self-contained).
//   config.json     this chart's config (data + options).
//   main.tsx        entry: imports the interactive component (by baked-in type) + config.json.
//   index.html      Vite entry HTML.
//   vite.config.ts  react + single-file plugin; no env injection.
//   tsconfig.json / package.json (interactive deps only — no remotion) / README.md
//
//   bun export-source.mjs <type> <config.json> <destDir>
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  rmSync,
  existsSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const chartNativeRoot = join(scriptsDir, "..");

// The interactive component ids the bundle can render — parsed straight from
// INTERACTIVE_REGISTRY's source so the generator refuses an unknown/static-only type
// (which would build a bundle that throws at runtime) instead of shipping it broken.
export function interactiveRegistryKeys(registrySrc) {
  const block = registrySrc.match(
    /INTERACTIVE_REGISTRY[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!block) return [];
  const keys = [];
  const re = /(?:^|\n)\s*(?:"([^"]+)"|([A-Za-z0-9_-]+))\s*:/g;
  let m;
  while ((m = re.exec(block[1])) !== null) keys.push(m[1] ?? m[2]);
  return keys;
}

// The interactive dep set, versions taken from chart-native/package.json so the bundle
// never drifts from the known-good, lockfile-resolved versions. Remotion is deliberately
// excluded (video-only — the bundle is the interactive, so `bun install` stays light).
const RUNTIME_DEPS = [
  "react",
  "react-dom",
  "d3-array",
  "d3-chord",
  "d3-scale",
  "d3-shape",
  "d3-time-format",
];
const DEV_DEPS = [
  "@types/react",
  "@types/react-dom",
  "@types/d3-array",
  "@types/d3-chord",
  "@types/d3-scale",
  "@types/d3-shape",
  "@types/d3-time-format",
  "@vitejs/plugin-react",
  "vite",
  "vite-plugin-singlefile",
  "typescript",
];

export function bundlePackageJson(id, versions) {
  const pick = (names) =>
    Object.fromEntries(
      names.map((n) => {
        const v = versions[n];
        if (!v)
          throw new Error(
            `export-source: no version for "${n}" in chart-native/package.json`,
          );
        return [n, v];
      }),
    );
  return (
    JSON.stringify(
      {
        name: `${id}-source`,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build" },
        dependencies: pick(RUNTIME_DEPS),
        devDependencies: pick(DEV_DEPS),
      },
      null,
      2,
    ) + "\n"
  );
}

export function bundleMainTsx(type) {
  return `// Standalone entry for the exported "${type}" chart. The type is baked in at export
// time; the config is imported statically from config.json — so \`vite build\` alone
// (no env, no orchestrator) produces the interactive.
import { createRoot } from "react-dom/client";
import { INTERACTIVE_REGISTRY } from "./src/component-registry";
import config from "./config.json";

const CHART_TYPE = ${JSON.stringify(type)};
const Interactive = INTERACTIVE_REGISTRY[CHART_TYPE];
if (!Interactive) throw new Error(\`unknown chart type: \${CHART_TYPE}\`);

const el = document.getElementById("root");
if (!el) throw new Error("missing #root element");
createRoot(el).render(<Interactive config={config} animateOn="load" />);
`;
}

export function bundleIndexHtml(title) {
  const t = String(title ?? "Chart").replace(/[<>&]/g, "");
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t}</title>
    <style>
      html,body{margin:0;padding:24px;background:#f4f4f4}
      #root{width:100%;box-sizing:border-box}
      #root > div{margin:0 auto}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`;
}

export function bundleViteConfig() {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Self-contained interactive build. No env injection: main.tsx imports config.json
// statically, so \`vite build\` alone produces dist/index.html (a single inlined file).
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { outDir: "dist", emptyOutDir: true, assetsInlineLimit: 100000000 },
});
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
          types: ["react", "react-dom"],
          noEmit: true,
          resolveJsonModule: true,
          allowImportingTsExtensions: true,
        },
        include: ["src", "main.tsx"],
      },
      null,
      2,
    ) + "\n"
  );
}

export function bundleReadme(title, type) {
  return `# ${title ?? "Chart"} — interactive source bundle

Self-contained Vite project for this chart-native "${type}" chart. Everything needed is
in this folder — no network services, no build-time injection.

## Rebuild the interactive

    bun install
    bun run build

The built interactive is \`dist/index.html\` — a single self-contained file. Open it in a
browser or embed it anywhere.

## Develop (hot reload)

    bun install
    bun run dev

## Customise

- **Data & options:** edit \`config.json\`.
- **The chart itself:** edit the component in \`src/\` (the \`Interactive*\` component for this
  chart type, plus the shared pieces in \`src/core/\`).
`;
}

if (import.meta.main) {
  const [type, configPath, destDir] = process.argv.slice(2);
  if (!type || !configPath || !destDir) {
    console.error("usage: export-source.mjs <type> <config.json> <destDir>");
    process.exit(1);
  }

  const registrySrc = readFileSync(
    join(chartNativeRoot, "src", "component-registry.tsx"),
    "utf8",
  );
  const keys = interactiveRegistryKeys(registrySrc);
  if (!keys.includes(type)) {
    console.error(
      `export-source: "${type}" is not an interactive chart-native type (known: ${keys.join(", ")})`,
    );
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error(`export-source: cannot read config ${configPath}: ${e.message}`);
    process.exit(1);
  }

  const cnPkg = JSON.parse(
    readFileSync(join(chartNativeRoot, "package.json"), "utf8"),
  );
  const versions = { ...cnPkg.dependencies, ...cnPkg.devDependencies };

  const abs = resolve(destDir);
  mkdirSync(abs, { recursive: true });

  // src/ = a copy of chart-native/src, minus mount.tsx (the producer's DOM entry, which
  // is the only src file importing ../assets — main.tsx replaces it).
  cpSync(join(chartNativeRoot, "src"), join(abs, "src"), { recursive: true });
  const mountPath = join(abs, "src", "mount.tsx");
  if (existsSync(mountPath)) rmSync(mountPath);

  const id = basename(abs).replace(/-source$/, "") || type;
  writeFileSync(join(abs, "config.json"), JSON.stringify(config, null, 2) + "\n");
  writeFileSync(join(abs, "main.tsx"), bundleMainTsx(type));
  writeFileSync(join(abs, "index.html"), bundleIndexHtml(config.title));
  writeFileSync(join(abs, "vite.config.ts"), bundleViteConfig());
  writeFileSync(join(abs, "tsconfig.json"), bundleTsconfig());
  writeFileSync(join(abs, "package.json"), bundlePackageJson(id, versions));
  writeFileSync(join(abs, "README.md"), bundleReadme(config.title, type));

  console.log(
    "EXPORT_SOURCE_RESULT " + JSON.stringify({ dir: abs, type, id }),
  );
}

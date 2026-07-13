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
export const REPO_ROOT = resolve(scriptDir, "..", "..", ".."); // skills/atelier/scripts → repo root

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
// stripped first so a commented-out import is not traced.
export function importSpecifiers(src) {
  const code = stripComments(src);
  const specs = new Set();
  for (const m of code.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.add(m[1]);
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

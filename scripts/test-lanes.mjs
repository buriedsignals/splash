// THE TEST LANES ARE DERIVED, NOT LISTED — issue #63.
//
// `bun test` ran 190 files in ~280 s, and two of them (a Chrome scroll-integrity run and a
// four-viewport interaction sweep) were 64% of that. The 140 files that answer most changes run in
// six seconds. CI hand-listed a "secretless" subset, which is the roster this file replaces: a
// test file is HEAVY when it, or a repository module it imports, reaches for a browser, a video
// renderer, a rasteriser, a map engine, or spawns a process to render or build — and that is read
// off the source, not remembered in a list. A new heavy test lands in the heavy lane the moment
// it imports puppeteer, with nobody editing anything here.
//
//   bun scripts/test-lanes.mjs --fast    the files that need no browser, renderer or subprocess
//   bun scripts/test-lanes.mjs --heavy   the rest (excluding live)
//   bun scripts/test-lanes.mjs --live    credential- or browser-gated `*.live.test.ts`
//   bun scripts/test-lanes.mjs --check   every test file is in exactly one lane, or exit 1
//
// A file that is slow without any static tell (a seed that renders in-process, say) opts in with
// `// LANE: heavy` within its first five lines. That is the only marker, and it only ever moves a
// file OUT of the fast lane.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ROOTS = ["skills", "apps", "installer", "proof", "shared", "scripts"];
const SKIP = new Set(["node_modules", ".git", "output-proof", "landing"]);
const TEST = /\.test\.(ts|tsx|mjs|js)$/;
const LIVE = /\.live\.test\.(ts|tsx|mjs|js)$/;
const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;

// Package specifiers that mean "this test drives a real engine".
const HEAVY_PACKAGES = [
  /^puppeteer(-core)?(\/|$)/,
  /^@puppeteer\//,
  /^remotion(\/|$)/,
  /^@remotion\//,
  /^@resvg\//,
  /^maplibre-gl(\/|$)/,
];
// A subprocess that renders, verifies a render, builds, or runs a script under `bun`/`node`.
const SPAWN = /\b(spawn|spawnSync|execFile|execFileSync|exec|execSync)\s*\(\s*(["'`])(bun|node|ffmpeg|git)\2|Bun\.spawn(Sync)?\s*\(/;
const LANE_MARKER = /^\/\/\s*LANE:\s*heavy\b/m;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every specifier a module imports or requires, from its comment-stripped source. */
function specifiers(text) {
  const out = [];
  const code = stripComments(text);
  for (const m of code.matchAll(/\b(?:import|export)\b[^"'`;]*?\bfrom\s*["'`]([^"'`]+)["'`]/g)) out.push(m[1]);
  for (const m of code.matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g)) out.push(m[1]);
  for (const m of code.matchAll(/\brequire\s*\(\s*["'`]([^"'`]+)["'`]/g)) out.push(m[1]);
  for (const m of code.matchAll(/^\s*import\s+["'`]([^"'`]+)["'`]/gm)) out.push(m[1]);
  return out;
}

function resolveRelative(from, spec) {
  const base = resolve(dirname(from), spec.replace(/[?#].*$/, ""));
  const candidates = [base, ...[".ts", ".tsx", ".mjs", ".js", ".mts", ".cjs"].map((ext) => base + ext)];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const index of ["index.ts", "index.tsx", "index.mjs", "index.js"]) {
    const candidate = join(base, index);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const reasons = new Map();

/** Why this module is heavy, or null. Follows relative imports transitively, once per file. */
function heavyReason(path, seen = new Set()) {
  if (reasons.has(path)) return reasons.get(path);
  if (seen.has(path)) return null;
  seen.add(path);
  const text = readFileSync(path, "utf8");
  let reason = null;
  if (LANE_MARKER.test(text.split("\n").slice(0, 5).join("\n"))) reason = "LANE: heavy marker";
  const code = stripComments(text);
  if (!reason && SPAWN.test(code)) reason = "spawns a process";
  if (!reason) {
    for (const spec of specifiers(text)) {
      if (HEAVY_PACKAGES.some((re) => re.test(spec))) {
        reason = `imports ${spec}`;
        break;
      }
      if (spec.startsWith(".") || spec.startsWith("#shared/")) {
        const target = spec.startsWith("#shared/")
          ? join(ROOT, "shared", spec.slice("#shared/".length))
          : resolveRelative(path, spec);
        if (target && SOURCE.test(target) && !target.includes("node_modules")) {
          const via = heavyReason(target, seen);
          if (via) {
            reason = `${relative(ROOT, target)} ${via}`;
            break;
          }
        }
      }
    }
  }
  reasons.set(path, reason);
  return reason;
}

export function lanes() {
  const fast = [];
  const heavy = [];
  const live = [];
  for (const root of ROOTS) {
    const dir = join(ROOT, root);
    if (!existsSync(dir)) continue;
    for (const path of walk(dir)) {
      if (!TEST.test(path)) continue;
      const rel = relative(ROOT, path);
      if (LIVE.test(path)) {
        live.push({ file: rel, reason: "live" });
        continue;
      }
      const reason = heavyReason(path);
      (reason ? heavy : fast).push({ file: rel, reason });
    }
  }
  const byFile = (a, b) => a.file.localeCompare(b.file);
  return { fast: fast.sort(byFile), heavy: heavy.sort(byFile), live: live.sort(byFile) };
}

if (import.meta.main) {
  const arg = process.argv[2] ?? "--fast";
  const { fast, heavy, live } = lanes();
  if (arg === "--fast") console.log(fast.map((t) => t.file).join("\n"));
  else if (arg === "--heavy") console.log(heavy.map((t) => t.file).join("\n"));
  else if (arg === "--live") console.log(live.map((t) => t.file).join("\n"));
  else if (arg === "--why") {
    for (const t of heavy) console.log(`${t.file}\t${t.reason}`);
  } else if (arg === "--check") {
    const all = [...fast, ...heavy, ...live].map((t) => t.file);
    const dupes = all.filter((f, i) => all.indexOf(f) !== i);
    if (dupes.length > 0 || all.length === 0) {
      console.error(`test lanes: ${dupes.length} files in two lanes, ${all.length} total`);
      process.exit(1);
    }
    console.log(`test lanes: fast ${fast.length}, heavy ${heavy.length}, live ${live.length}`);
  } else {
    console.error("usage: bun scripts/test-lanes.mjs --fast | --heavy | --live | --why | --check");
    process.exit(2);
  }
}

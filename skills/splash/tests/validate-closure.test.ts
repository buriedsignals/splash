// validate-closure.test.ts — drift guard: the VALIDATION import closure must stay free of
// the video/map runtime. produce-all (and validate-gate, its heaviest import) must load on
// a machine where map-native's node_modules is not installed — a 100 % Datawrapper batch
// must never require the video stack (C1, Tom's 2026-07-16 crash: route-geo re-exported a
// scene constant from a remotion module, killing every produce-all at import time; the
// same graph also reached @turf/turf, another map-native-local dependency).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Every runtime dependency of map-native is forbidden in the closure — they only exist in
// skills/map-native/node_modules, so any of them re-entering the graph recreates Tom's
// crash on a machine that never installed the map/video skill. The list is read from the
// package.json so a newly added map-native dependency is guarded automatically.
const mapNativePkg = JSON.parse(
  readFileSync(
    resolve(import.meta.dir, "../../map-native/package.json"),
    "utf8",
  ),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
// dependencies AND devDependencies (review finding): a devDep statically imported into the
// closure crashes a fresh clone exactly like remotion did — both count. (Follow-up, wider
// invariant: forbid every sibling-skill-local package — d3-* via chart-native and playwright
// via dw-chart are ALREADY in the produce-all closure, pre-existing crash class on selective
// installs; tracked in the programme backlog.)
const FORBIDDEN = new Set([
  "remotion",
  "react",
  "react-dom",
  ...Object.keys(mapNativePkg.dependencies ?? {}),
  ...Object.keys(mapNativePkg.devDependencies ?? {}),
]);
const ENTRIES = [
  resolve(import.meta.dir, "../src/validate-gate.ts"),
  resolve(import.meta.dir, "../scripts/produce-all.mjs"),
];

// STATIC import/export-from/side-effect specifiers ONLY. `import type` / `export type` are
// erased at runtime and pull nothing; a DYNAMIC `import("x")` is a LAZY edge that cannot
// crash module load (the guard's whole invariant is load-time survival on a partial install
// — label-safety.ts's playwright is the sanctioned example: type-only + lazy launch). Both
// are deliberately NOT matched. The clause part ([^"']*?) deliberately spans newlines:
// multi-line import lists (`import {\n  a,\n} from "x"`) are the norm in this codebase.
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^"']*?from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']/g;

function read(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// Resolve a RELATIVE specifier to a real file (ts/tsx/mjs/js, or index). Throws when a
// relative import cannot be resolved — a silent skip would blind the guard.
function resolveRelative(spec: string, fromFile: string): string {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.js`,
    join(base, "index.ts"),
  ];
  for (const c of candidates) if (read(c) !== null) return c;
  throw new Error(`cannot resolve relative import "${spec}" from ${fromFile}`);
}

// Package name of a bare specifier ("remotion/color" → "remotion", "@turf/turf" → "@turf/turf").
function packageName(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function closurePackages(entries: string[]): Map<string, string> {
  const seenFiles = new Set<string>();
  const packages = new Map<string, string>(); // package → first importing file
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seenFiles.has(file)) continue;
    seenFiles.add(file);
    const src = read(file);
    if (src === null) throw new Error(`cannot read ${file}`);
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      if (spec.startsWith(".")) {
        queue.push(resolveRelative(spec, file));
      } else if (!spec.startsWith("node:")) {
        if (!packages.has(packageName(spec)))
          packages.set(packageName(spec), file);
      }
    }
  }
  return packages;
}

describe("validation import closure", () => {
  it("should never pull remotion or react into produce-all/validate-gate", () => {
    const packages = closurePackages(ENTRIES);
    const offenders = [...packages.entries()].filter(([pkg]) =>
      FORBIDDEN.has(pkg),
    );
    expect(
      offenders.map(([pkg, file]) => `${pkg} (imported via ${file})`),
    ).toEqual([]);
  });
});

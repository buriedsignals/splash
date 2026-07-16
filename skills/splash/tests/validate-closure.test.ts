// validate-closure.test.ts — drift guard: the VALIDATION import closure must stay free of
// the video runtime. produce-all (and validate-gate, its heaviest import) must load on a
// machine where map-native's remotion/react are not installed — a 100 % Datawrapper batch
// must never require the video stack (C1, Tom's 2026-07-16 crash: route-geo re-exported a
// scene constant from a remotion module, killing every produce-all at import time).
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const FORBIDDEN = new Set(["remotion", "react", "react-dom"]);
const ENTRIES = [
  resolve(import.meta.dir, "../src/validate-gate.ts"),
  resolve(import.meta.dir, "../scripts/produce-all.mjs"),
];

// import/export-from/dynamic-import specifiers. `import type` / `export type` are erased at
// runtime and pull nothing — skip them so a type-only edge is never a false positive.
// The clause part ([^"']*?) deliberately spans newlines: multi-line import lists
// (`import {\n  a,\n} from "x"`) are the norm in this codebase.
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^"']*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s*["']([^"']+)["']/g;

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
      const spec = m[1] ?? m[2] ?? m[3];
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

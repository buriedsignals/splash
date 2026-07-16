# C1 — Validate-closure Remotion Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** a 100 % Datawrapper `produce-all` run must load and run on a machine where
`skills/map-native`'s deps (remotion, react) are not installed — Tom's crash
(`Cannot find package 'react' from …/remotion/…/index.mjs`).

**Architecture:** one shared constant (`TITLE_SCENE_FRAMES`), re-exported from a Remotion module
(`video-scene.ts`), drags the whole video runtime into the validation import closure
(`produce-all.mjs` → `validate-gate.ts` → `map-native/validate-config.ts` → `route-geo.ts:2` →
`video-scene.ts:5` → `remotion` → `react`). Fix: extract the constants into a runtime-free
module; add a drift-guard test that resolves the static import closure and fails if
`remotion`/`react` ever re-enters it.

**Tech Stack:** TypeScript, Bun, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor (Claude/Anthropic) mention anywhere.
- Runtime Bun (never npm/node). Tests bun:test, TDD.
- Byte-identical rendering: the constants keep their exact values (75, 12).

---

### Task 1: Drift-guard test — the validation closure must never touch remotion/react

**Files:**
- Test: `skills/splash/tests/validate-closure.test.ts` (create)

**Interfaces:**
- Consumes: nothing (walks source files on disk).
- Produces: the failing test that Task 2 turns green; stays forever as the drift guard.

- [ ] **Step 1: Write the failing test**

```ts
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
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^"'\n]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s*["']([^"']+)["']/g;

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
        if (!packages.has(packageName(spec))) packages.set(packageName(spec), file);
      }
    }
  }
  return packages;
}

describe("validation import closure", () => {
  it("should never pull remotion or react into produce-all/validate-gate", () => {
    const packages = closurePackages(ENTRIES);
    const offenders = [...packages.entries()].filter(([pkg]) => FORBIDDEN.has(pkg));
    expect(
      offenders.map(([pkg, file]) => `${pkg} (imported via ${file})`),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails on the current chain**

Run: `cd skills/splash && bun test tests/validate-closure.test.ts`
Expected: FAIL — offenders list contains `remotion (imported via …/map-native/src/video-scene.ts)`
(react enters via remotion's own package, not via a first-party file — remotion alone in the
offenders is the expected proof; if react also appears via another first-party file, that is a
second edge to cut the same way).

- [ ] **Step 3: Commit the red test**

```bash
git add skills/splash/tests/validate-closure.test.ts
git commit -m "test(splash): drift guard — validation closure must not reach remotion/react (red)"
```

---

### Task 2: Extract the scene constants into a runtime-free module

**Files:**
- Create: `skills/map-native/src/scene-constants.ts`
- Modify: `skills/map-native/src/video-scene.ts:5-8`
- Modify: `skills/map-native/src/route-geo.ts:2`
- Test: `skills/splash/tests/validate-closure.test.ts` (Task 1, goes green)

**Interfaces:**
- Consumes: nothing.
- Produces: `TITLE_SCENE_FRAMES: number` and `CROSSFADE_FRAMES: number` exported from
  `skills/map-native/src/scene-constants.ts`. `video-scene.ts` re-exports BOTH, so its 20+
  existing importers (`components/*Reveal.tsx`, `*Scrolly.tsx`, `*Story.tsx`,
  `remotion/src/Root.tsx:53`) keep compiling untouched.

- [ ] **Step 1: Create the constants module**

```ts
// scene-constants.ts — frame counts of the shared two-scene model for map videos.
// Runtime-free ON PURPOSE: route-geo (imported by validate-config, itself inside the
// splash validate-gate closure) needs TITLE_SCENE_FRAMES without dragging remotion
// (and its react peer) into a pure-validation import graph — a Datawrapper-only
// produce-all must never require the video runtime to be installed
// (skills/splash/tests/validate-closure.test.ts is the drift guard).
export const TITLE_SCENE_FRAMES = 75; // ~2.5s @ 30fps — matches the storytelling title hold
export const CROSSFADE_FRAMES = 12; // ~0.4s @ 30fps
```

- [ ] **Step 2: Point video-scene.ts at it (re-export preserves every existing importer)**

In `skills/map-native/src/video-scene.ts`, replace lines 5-8:

```ts
import { interpolate, Easing } from "remotion";

export const TITLE_SCENE_FRAMES = 75; // ~2.5s @ 30fps — matches the storytelling title hold
export const CROSSFADE_FRAMES = 12; // ~0.4s @ 30fps
```

with:

```ts
import { interpolate, Easing } from "remotion";

// Constants live in scene-constants.ts (runtime-free — see that file's header); re-exported
// here so the 20+ video components keep their historical `from "../video-scene"` import.
export { TITLE_SCENE_FRAMES, CROSSFADE_FRAMES } from "./scene-constants";
import { CROSSFADE_FRAMES } from "./scene-constants";
```

(`resolveScene` below uses `CROSSFADE_FRAMES`; the local import keeps it in scope.)

- [ ] **Step 3: Point route-geo.ts at the runtime-free module**

In `skills/map-native/src/route-geo.ts`, replace line 2:

```ts
import { TITLE_SCENE_FRAMES } from "./video-scene";
```

with:

```ts
import { TITLE_SCENE_FRAMES } from "./scene-constants";
```

- [ ] **Step 4: Run the drift-guard test — green**

Run: `cd skills/splash && bun test tests/validate-closure.test.ts`
Expected: PASS. If a DIFFERENT first-party edge still surfaces (e.g. a chart-native module),
cut it the same way (extract the runtime-free piece, re-export) — the test names the exact
importing file.

- [ ] **Step 5: Tom-repro verification — validate-gate loads without map-native deps**

Run (map-native `node_modules` must be ABSENT — `ls skills/map-native/node_modules` errors; if
present, `mv skills/map-native/node_modules /tmp/mn-backup` first and restore after):

```bash
cd skills/splash && bun -e 'await import("./src/validate-gate.ts"); console.log("OK: validation closure loads without the video runtime")'
```

Expected: `OK: validation closure loads without the video runtime` (before the fix this dies
with `Cannot find package 'remotion'` / `'react'`).

- [ ] **Step 6: Full regression — map-native + splash suites**

Run: `cd skills/map-native && bun install && bun test` then `cd ../splash && bun test`
Expected: both PASS (byte-identical constants → no video behavior change).

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/scene-constants.ts skills/map-native/src/video-scene.ts skills/map-native/src/route-geo.ts
git commit -m "fix(map-native): extract scene constants — validation closure no longer requires remotion/react"
```

---

### Task 3: Gate + acceptance

- [ ] **Step 1: Run the full gate**

Run: `bun run check` (repo root)
Expected: all checks green (map-native interactive produce may flake under network contention —
re-run in isolation if it times out; see CLAUDE.md).

- [ ] **Step 2: Acceptance note for Tom**

Record in the PR description: "repro fixed — `produce-all` on a Datawrapper batch now runs with
`skills/map-native/node_modules` absent; drift guard `validate-closure.test.ts` keeps the video
runtime out of the validation closure permanently."

// lib/geo/static-geojson-imports.test.ts
//
// THIS IS A SOURCE-SCAN DRIFT LOCK, modelled line-for-line on
// lib/loop/schema-version-drift.test.ts. It proves nothing about whether a given map component
// correctly renders injected geometry — that is proven by execution tests elsewhere in this
// phase. What this guard buys is narrower and purely textual: it makes it impossible to silently
// REINTRODUCE a static `.geojson` import or a `fetch(staticFile("....geojson"))` call at a NEW
// call site without a failing test naming the exact file.
//
// Why this exists: this branch removed static geojson imports from the interactive map
// components (ChoroplethMap.tsx, CartogramMap.tsx, DotDensityMap.tsx, RouteMap.tsx and their
// scrolly siblings) so geometry could be injected per-run instead of shipped as a bundled asset.
// The two suites that guarded that removal (skills/map-native/tests/choropleth-map-imports.test.ts,
// skills/scrolly/tests/no-static-geojson-imports.test.ts) banned exactly one spelling
// (`/\.geojson\?raw/`) across a hardcoded list of seven named files — blind to the non-`?raw`
// import form already sitting in the tree (RouteReveal.tsx, RouteScrolly.tsx), to the runtime
// `fetch(staticFile("geo/world.geojson"))` form (nine files), and to any file added after the
// list was written. This test replaces both with a tree walk plus two match shapes, so a new
// static reference anywhere under lib/** or skills/** fails loud with its own file:line instead
// of silently passing because it isn't on a list.
//
// Four exemption classes, and nothing else:
//   (a) any `*.test.ts` / `*.test.tsx` file — a fixture is allowed to construct any geojson path
//       or import real geometry to exercise the code under test (e.g.
//       skills/map-native/tests/arc-beats-threading.test.ts imports world.geojson as sample
//       data); that is the point of a fixture, not a drift risk.
//   (b) any `*.d.ts` file — an ambient module declaration (`declare module "*.geojson"`,
//       `declare module "*.geojson?raw"`) describes the TYPE of an import specifier for the
//       bundler; it does not itself import or fetch any geometry.
//   (c) the Remotion registration root ONLY (remotion/src/Root.tsx) — this used to also exempt
//       ChoroplethReveal/Story/Scrolly, CartogramReveal/Story/Scrolly and
//       DotDensityReveal/Story/Scrolly (Task 7's decision: a DECLARED geography refuses the video
//       format instead of those nine reading injected geometry). map-storyboard-and-video-geography
//       closed that gap for every SHIPPED geography (Task 10: `resolveVideoGeometry` reads
//       `config.geometry`, the same decode static/interactive/scrolly already use) — all nine are
//       now clean of any static geojson reference, confirmed by this guard itself once the
//       exemption is lifted, so they are exempt no longer. RouteReveal and RouteScrolly went
//       through the identical move earlier (Task 9) and were already off this list. `Root.tsx`
//       stays exempt: `:85` is a real static import feeding the Remotion Studio's default-props
//       geometry (a dev-only preview convenience, never a shipped render path), not a regression
//       of the bug this guard exists to catch.
//   (d) standalone dev tooling, named individually below, where the reference is either not the
//       shipped asset or not a runtime import at all — see BUILD_TOOLING_FILES for the reason on
//       each.
//
// Anything else that statically imports or fetches a `.geojson` path in lib/**/*.ts(x) or
// skills/**/*.ts(x)/*.mjs is exactly the class of reference this test exists to catch.
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

const SKIP_DIRS = new Set(["node_modules", "dist"]);

// Walks a directory tree collecting files whose name passes `keep`, pruning SKIP_DIRS along the
// way — same shape as lib/loop/schema-version-drift.test.ts's `walk`, widened to also keep
// `.tsx` (unlike the schema-version guard, this one's real hits live in React components: the
// map-native Story/Reveal/Scrolly files and RouteReveal.tsx/RouteScrolly.tsx are all `.tsx`).
function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) return [];
      return walk(join(dir, e.name), keep);
    }
    return keep(e.name) ? [join(dir, e.name)] : [];
  });
}

const IS_SOURCE_FILE = (n: string) =>
  n.endsWith(".ts") || n.endsWith(".tsx") || n.endsWith(".mjs");

const LIB_FILES = walk(join(ROOT, "lib"), IS_SOURCE_FILE);
const SKILLS_FILES = walk(join(ROOT, "skills"), IS_SOURCE_FILE);
const ALL_FILES = [...LIB_FILES, ...SKILLS_FILES];

// Exemption class (c): the Remotion registration root ONLY (see header comment) — a real static
// import feeding the Studio's default-props geometry, not a shipped render path.
const REMOTION_ROOT_PATH = new Set(
  [join("skills", "map-native", "remotion", "src", "Root.tsx")].map((p) =>
    join(ROOT, p),
  ),
);

// Exemption class (d): dev tooling. Each reference here is either not a runtime import of the
// shipped world.geojson at all, or a script that never ships in a bundle — named individually
// because, unlike the video family, they don't share one reason.
const BUILD_TOOLING_REASONS = new Map<string, string>([
  [
    join("lib", "geo", "subset.ts"),
    // Line 111: `const filtered = join(tmp, "filtered.geojson")` — a filename this function
    // chooses for its OWN transient mapshaper output when subsetting a journalist-supplied
    // geometry file. It never reads or ships the default world.geojson asset.
    "writes its own transient subset output file; not a reference to the shipped default asset",
  ],
  [
    join("lib", "geo", "scripts", "fetch-natural-earth-admin1.mjs"),
    // Line 46: `admin1.geojson` is a scratch conversion artifact in the OS tmpdir. The script's
    // own header documents it as "run by hand, not part of `bun run check`" — a one-time offline
    // build step for the committed ADM1 sidecar, not shipped runtime code.
    "one-time hand-run build script; the .geojson is its own scratch artifact, not the shipped asset",
  ],
  [
    join("skills", "splash", "scripts", "bundle-source.mjs"),
    // Line 36: `RESOLVE_EXTS` lists extensions the export bundler's dependency tracer knows how
    // to resolve. ".geojson" here is a generic capability declaration, not an import of any
    // specific file.
    "extension the export bundler's dependency tracer can resolve; not an import of a specific file",
  ],
  [
    join("skills", "map-native", "scripts", "audit-story.mjs"),
    // package.json's `audit:story` script — a standalone dev check (not in the `bun run check`
    // TEST_DIRS gate) that reads world.geojson via readFileSync to assert narrative invariants on
    // the default-world story. Never bundled into shipped output.
    "standalone `bun run audit:story` dev script, not part of the gate; reads via readFileSync, never bundled",
  ],
  [
    join("skills", "scrolly", "scripts", "audit-scrolly.mjs"),
    // Same as audit-story.mjs, for the scrolly sibling's `audit:scrolly` script.
    "standalone `bun run audit:scrolly` dev script, not part of the gate; reads via readFileSync, never bundled",
  ],
]);
const BUILD_TOOLING_PATHS = new Set(
  [...BUILD_TOOLING_REASONS.keys()].map((p) => join(ROOT, p)),
);

function isExempt(file: string): boolean {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return true; // class (a)
  if (file.endsWith(".d.ts")) return true; // class (b)
  if (REMOTION_ROOT_PATH.has(file)) return true; // class (c)
  if (BUILD_TOOLING_PATHS.has(file)) return true; // class (d)
  return false;
}

// A static import or re-export of a geojson module, `?raw` or not: `import x from "./y.geojson"`,
// `import x from "./y.geojson?raw"`, `join(dir, "y.geojson")`. Deliberately does NOT match the
// MapLibre source-type string `type: "geojson"` or the `GeoJSON.Feature`/`GeoJSON.FeatureCollection`
// TypeScript type (no literal `.` immediately before "geojson" in either) — the interactive map
// components use both extensively and are not the concern this guard targets.
const STATIC_IMPORT = /\.geojson(\?raw)?["']/;
// The runtime fetch-the-shipped-asset form: `fetch(staticFile("geo/world.geojson"))`.
const STATIC_FETCH = /staticFile\(["'][^"']*\.geojson/;

// Strips `//` line comments and `/* … */` block comments (including JSDoc) from source text
// before it is matched, replacing comment characters with spaces so line numbers and column
// offsets are preserved. Without this, the guard fires on its own prose — this file's header
// and the code it walks both describe past static-geojson bugs in English, and a naive scan
// matches the sentence describing the fault as readily as the fault itself (the project's own
// "pas de charte maison" lesson, reproduced here). String literals (single/double/backtick) are
// tracked as opaque so a `//` inside a URL is never mistaken for the start of a comment.
function stripComments(src: string): string {
  let out = "";
  let state:
    | "code"
    | "line-comment"
    | "block-comment"
    | "string-single"
    | "string-double"
    | "template" = "code";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line-comment";
        out += "  ";
        i++;
      } else if (c === "/" && next === "*") {
        state = "block-comment";
        out += "  ";
        i++;
      } else if (c === "'" || c === '"' || c === "`") {
        state =
          c === "'"
            ? "string-single"
            : c === '"'
              ? "string-double"
              : "template";
        out += c;
      } else {
        out += c;
      }
      continue;
    }
    if (state === "line-comment") {
      if (c === "\n") {
        state = "code";
        out += c;
      } else {
        out += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (c === "*" && next === "/") {
        state = "code";
        out += "  ";
        i++;
      } else {
        out += c === "\n" ? "\n" : " ";
      }
      continue;
    }
    // string-single, string-double, template: copy verbatim (preserving any `//` or `/*` inside
    // a string literal, e.g. a URL) and honour backslash escapes so an escaped quote does not
    // end the string early.
    const quote =
      state === "string-single" ? "'" : state === "string-double" ? '"' : "`";
    if (c === "\\" && next !== undefined) {
      out += c + next;
      i++;
    } else if (c === quote) {
      state = "code";
      out += c;
    } else {
      out += c;
    }
  }
  return out;
}

describe("static geojson reference drift lock (source-scan only, not a correctness proof)", () => {
  it("scans a real, non-zero set of files under lib/ and skills/", () => {
    // A guard whose scan silently comes back empty is a guard that passes for the wrong reason —
    // the same discipline lib/loop/schema-version-drift.test.ts already holds itself to.
    expect(ALL_FILES.length).toBeGreaterThan(500);
  });

  it("every static .geojson import or staticFile(...) fetch outside the four exempt classes is a regression", () => {
    const offenders: string[] = [];
    for (const file of ALL_FILES) {
      if (isExempt(file)) continue;
      const src = stripComments(readFileSync(file, "utf8"));
      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (STATIC_IMPORT.test(lines[i]) || STATIC_FETCH.test(lines[i])) {
          offenders.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      }
    }
    expect(
      offenders,
      offenders.length
        ? `static geojson reference(s) found outside the exempt classes — inject geometry instead, or add a named exemption with a written reason:\n${offenders.join("\n")}`
        : undefined,
    ).toEqual([]);
  });
});

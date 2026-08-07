// lib/loop/engine-binding-drift.test.ts
//
// engines.ts's header used to claim that it was "the loop's only point of knowledge about
// skills/" and that "nothing else imports skills/". Both sentences were false when written —
// ten other production modules under lib/loop/ import skills/ — and nothing compared the claim
// to the tree, so it rotted quietly for a whole branch and then survived the charter fix adding
// an eleventh import site.
//
// The rewritten header states a rule that IS true, and this file is what keeps it true:
//
//   · DECLARATIONS (type ids, capability lists, validators, refusal strings, pure helpers)
//     may cross from skills/ into lib/loop anywhere. They register nothing, so importing one
//     cannot make an engine reachable.
//   · The ENGINE SET crosses in engines.ts and nowhere else: it is the only import under
//     lib/loop/ whose module graph reaches a top-level `registerProducer(...)` — the side
//     effect that binds an engine's scriptPath/skillDir and makes getProducer() answer.
//
// The distinction is enforced by MODULE GRAPH, not by filename: a new
// `assemble/foo.ts` that imports an engine's constants stays legal without editing this test,
// while any loop module that (directly or three hops down) pulls in a manifest goes red. That
// is the asymmetry that matters — the first is the pattern the loop already relies on, the
// second is a second composition root growing in the dark.
//
// TEST-FILE SCOPE: only NON-test modules are checked. Loop tests import register-producers on
// purpose (they populate the registry for the code under test), and engines.test.ts documents
// at :8 that it deliberately does not. A fixture wiring its own registry is not drift.
//
// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed before
// results were read; the file was restored from a backup between them). Counts below are the
// MEASURED ones, not the ones first guessed — the two parity cases deliberately overlap, so a
// single planted binding turns BOTH red, and writing "3 pass / 1 fail" here would have been a
// fresh instance of the defect this file exists to fix:
//   · adding `import "../../skills/splash/src/register-producers";` to lib/loop/produce.ts →
//     2 pass / 2 fail; both parity cases red, the diff naming produce.ts and the seven
//     manifests it now reaches.
//   · adding `import "../../../skills/chart-native/src/manifest";` to lib/loop/assemble/index.ts
//     (a manifest reached DIRECTLY, one hop, rather than through register-producers) →
//     2 pass / 2 fail, naming assemble/index.ts. The guard is graph-based, not name-based.
//   · deleting the `register-producers` import from engines.ts → 2 pass / 2 fail: the
//     "engines.ts still binds" case red on the empty composition root, and the binder-list case
//     red because the list became [] instead of ["engines.ts"].
//   · pointing engines.ts's specifier at a path that does not exist (…/register-producerz) →
//     0 pass / 1 fail: the scan runs at module load, so the unresolved-import expectation
//     throws for the whole FILE rather than one case. That is the intended refusal — a guard
//     must not report green on a graph it could not follow.
//   · NEGATIVE CONTROL — adding a harmless declaration import (`import { MAP_TYPES } from
//     "../../skills/map-native/src/map-types";` in lib/loop/beats.ts) → ALL 4 PASS. This is the
//     case that proves the guard encodes the real rule: the crossing the loop legitimately does
//     every day must not trip it, or the rule collapses back into the false "nothing imports
//     skills/" the header used to state.
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const LOOP = join(ROOT, "lib", "loop");

const SKIP_DIRS = new Set(["node_modules", "dist"]);

/** Every .ts under lib/loop that is not a test — the modules that actually ship. */
function productionModules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      return SKIP_DIRS.has(e.name) ? [] : productionModules(join(dir, e.name));
    }
    if (!e.name.endsWith(".ts") || e.name.endsWith(".test.ts")) return [];
    return [join(dir, e.name)];
  });
}

/** Import/export specifiers of a module, both `from "x"` and bare `import "x"` forms. */
function specifiersOf(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [
    ...[...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]!),
    ...[...src.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)].map(
      (m) => m[1]!,
    ),
  ];
}

/** Relative specifiers only — a bare package name is node_modules, never our tree. */
function resolveSpecifier(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Transitive closure of a module's in-tree imports, including the entry itself. */
function closureOf(entry: string): string[] {
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const spec of specifiersOf(cur)) {
      const next = resolveSpecifier(cur, spec);
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...seen];
}

// A TOP-LEVEL call, anchored at column 0 — that is the shape every manifest uses, and it is what
// makes the registration a side effect of import. `export function registerProducer(` in
// lib/core/registry.ts (the definition) is indented differently and is not a call, so it does
// not match; neither does a call nested inside a function body, which would not fire on import.
const REGISTERS = /^registerProducer\(/m;

/** The modules under lib/loop that import skills/, paired with what those imports reach. */
type Crossing = {
  module: string;
  specifier: string;
  entry: string;
  /** Modules in the closure that self-register a producer on import. */
  registrars: string[];
};

function crossings(): Crossing[] {
  const out: Crossing[] = [];
  for (const module of productionModules(LOOP)) {
    for (const specifier of specifiersOf(module)) {
      if (!specifier.includes("skills/")) continue;
      const entry = resolveSpecifier(module, specifier);
      // An unresolvable skills/ specifier is itself a defect (a moved or renamed engine
      // module), and silently skipping it would let this guard pass on a broken graph.
      expect(
        entry,
        `lib/loop/${relative(LOOP, module)} imports "${specifier}", which resolves to no file. ` +
          `Fix the import — do not let this guard scan a graph it cannot follow.`,
      ).not.toBeNull();
      out.push({
        module: relative(LOOP, module),
        specifier,
        entry: relative(ROOT, entry!),
        registrars: closureOf(entry!)
          .filter((f) => REGISTERS.test(readFileSync(f, "utf8")))
          .map((f) => relative(ROOT, f))
          .sort(),
      });
    }
  }
  return out;
}

const CROSSINGS = crossings();
const BINDERS = [
  ...new Set(
    CROSSINGS.filter((c) => c.registrars.length > 0).map((c) => c.module),
  ),
].sort();

describe("engines.ts is the loop's ONE binding of the engine set (not its only skills/ import)", () => {
  it("scans a real, non-empty set of loop modules and skills/ crossings (never passes vacuously)", () => {
    // A scan that silently comes back empty passes for the wrong reason — the same discipline
    // schema-version-drift.test.ts and mappers-doc-parity.test.ts hold themselves to. The
    // floors sit well under today's MEASURED numbers (35 production modules, 17 skills/
    // crossings across 11 of them) so ordinary growth or deletion does not churn this line;
    // only a scan that has stopped working trips it.
    expect(productionModules(LOOP).length).toBeGreaterThan(20);
    expect(CROSSINGS.length).toBeGreaterThan(8);
  });

  it("engines.ts still binds the engine set — the composition root is not empty", () => {
    const fromEngines = CROSSINGS.filter((c) => c.module === "engines.ts");
    expect(
      fromEngines.some((c) => c.registrars.length > 0),
      "lib/loop/engines.ts no longer reaches any registerProducer() call. The registry ships " +
        "empty and render() answers `unknown-engine` for every engine that exists — the exact " +
        "failure engines.ts:26-29's value export exists to make impossible to delete quietly.",
    ).toBe(true);
  });

  it("no OTHER loop module reaches a producer registration", () => {
    // toEqual on the module list, not a boolean: the diff bun prints IS the answer to "which
    // module grew a second composition root".
    expect(BINDERS).toEqual(["engines.ts"]);
  });

  it("the other crossings are declarations — they register nothing", () => {
    // The positive half of the rule the header states. Stated as its own case so a failure
    // reads as "this import binds an engine" rather than only as "the binder list changed".
    const offenders = CROSSINGS.filter(
      (c) => c.module !== "engines.ts" && c.registrars.length > 0,
    ).map(
      (c) =>
        `lib/loop/${c.module} -> ${c.specifier} reaches ${c.registrars.join(", ")}`,
    );
    expect(
      offenders,
      "A loop module other than engines.ts now reaches a producer manifest. Declarations " +
        "(type ids, capability lists, validators, pure helpers) may cross freely; the ENGINE " +
        "SET may not. Import the constant you need, not the manifest that registers the engine.",
    ).toEqual([]);
  });
});

// HONEST CEILING: this reads import graphs, not behaviour. It cannot tell whether a declaration
// that crosses is the RIGHT one to read, nor whether lib/core would be a better home for it, nor
// catch a registration performed through a dynamic `await import()` (nothing in this tree does
// that; every manifest registers at module top level). It pins one asymmetry — declarations may
// cross, the engine set may not — which is exactly the claim engines.ts's header now makes.

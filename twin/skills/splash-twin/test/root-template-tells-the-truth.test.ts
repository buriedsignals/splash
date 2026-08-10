/**
 * THE DEFECT THIS GUARD EXISTS FOR, and why a hand-written list could not have caught it.
 *
 * `assets/root-template/` IS the install — `SKILL.md`'s own words. Preflight then validates a
 * newsroom's root by resolving what that same template declares (`preflight.mjs`'s
 * `declaredDependencyNames`), which makes the check circular: **anything the template omits is
 * invisible to preflight by construction.** Measured before this guard existed, the template
 * declared six packages while the tree imported nine, and vendored two `#shared/` files while the
 * tree imported four. A freshly installed root reported `dependencies: pass`, `ready: true`, and
 * could render exactly one of the four genres — every video, map, web and scrolly beat died at
 * module load, after the journalist had been told the environment was fine.
 *
 * So this guard WALKS the tree and derives the requirement, rather than restating it. That is not
 * style: `helper-parity.test.ts` is this repository's standing counter-example, where a hand-kept
 * list turned the suite red for a correct change and two agents kept a dead export alive to satisfy
 * it. A list cannot know about an import added after it was written; a walk cannot fail to.
 *
 * FOUR THINGS IT ASSERTS, each with the mutation that reddens it (all four run and verified in a
 * copy of the tree under /tmp — invariant 4 of PLAN-2026-08-10.md):
 *
 *   1. every BARE import specifier anywhere under skills/, proof/ and shared/ is declared in the
 *      template's `dependencies`.
 *      MUTATION: delete "remotion" from root-template/package.json.
 *      Before this guard, that mutation changed nothing at all — which was the proof it was missing.
 *
 *   2. every `#shared/<path>` specifier resolves to a file the template actually vendors.
 *      MUTATION: delete root-template/shared/twin-chart-video/timing.ts (57 files import it).
 *
 *   3. every version the template pins EQUALS the version this repository's own root pins, for
 *      every name they share.
 *      MUTATION: loosen "remotion": "4.0.507" to "^4.0.0".
 *      This is the `zod` defect the ORIGINAL Splash paid for, guarded from the other side: there, a
 *      root manifest folded last overrode an engine that had pinned deliberately, and printed a
 *      version-mismatch block twice in front of the journalist. A template that drifts from the
 *      tree it installs is the same failure with the two files swapped.
 *
 *   4. every binary a script SPAWNS out of `node_modules/.bin/` is provided by a declared
 *      dependency. Spawning is invisible to an import scan, and it is how the video genre runs:
 *      three skill scripts and eighteen proof beats exec `node_modules/.bin/remotion`, which is
 *      shipped by `@remotion/cli` — a package NOTHING imports, so rule 1 alone would never ask for
 *      it, and a root without it fails at spawn with ENOENT rather than at module load.
 *      MUTATION: delete "@remotion/cli" from root-template/package.json.
 *
 * WHAT IT PROVABLY DOES NOT CATCH, stated so nobody reads it as more than it is:
 *
 *   - A specifier CONSTRUCTED AT RUNTIME. This is a static text scan; it never evaluates anything.
 *     Same boundary `no-cross-skill-imports.test.ts` states for itself, for the same reason.
 *   - A dependency reached over the NETWORK rather than resolved. Measured, and it is real here:
 *     `maplibre-gl` is referenced 41 times and imported ZERO times — every map bake pulls it from
 *     `unpkg.com/maplibre-gl@4.7.1` at render time. It is therefore correctly absent from the
 *     template, and a hand-written list would very likely have added it. What it actually needs is
 *     outbound network at bake time, which no manifest can express and preflight does not check.
 *   - Whether the declared version RESOLVES or is compatible. That is `bun install`'s job, and the
 *     clean-room install is what proves it.
 *   - Whether the packages are actually INSTALLED in a given root. That is preflight's job — and
 *     preflight's own resolution has its own false-green, guarded separately and out of process in
 *     `preflight-resolves-in-the-tree.test.ts`, because in-process it cannot manifest.
 */
import { describe, it, expect } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SPLASH_TWIN = join(import.meta.dirname, "..");
const TWIN = join(SPLASH_TWIN, "..", "..");
const TEMPLATE = join(SPLASH_TWIN, "assets", "root-template");
const TEMPLATE_SHARED = join(TEMPLATE, "shared");

// Where a journalist's own tree comes from. `shared/` is included because the vendored copies are
// themselves modules a beat loads, so their imports are the root's imports too.
const WALKED = ["skills", "proof", "shared"];

const SOURCE_EXT = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (SOURCE_EXT.test(e.name)) yield p;
  }
}

/**
 * `src` with comments removed. Necessary, not fastidious: this repository's prose is dense with
 * sentences like "a beat imports the copy that lands at #shared/twin-chart-beat/render-still.mjs",
 * and a scan that read comments would demand packages named after English words. A first pass at
 * this guard did exactly that and asked the template to declare `no-data`.
 */
function stripComments(src: string): string {
  let out = "";
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        i++;
      }
      out += quote;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Every module specifier in `src`, read from the SYNTAX that carries a string literal rather than
 * from the raw text. The four shapes a specifier can take, and nothing else:
 * `… from "x"`, `import("x")`, `require("x")`, and a bare side-effect `import "x"`.
 *
 * WHY THIS IS A SCANNER AND NOT A REGEX OVER COMMENT-STRIPPED TEXT. That was the first attempt and
 * it produced two false demands, both from ordinary prose sitting INSIDE a string literal:
 *
 *     md.push("Regenerate with `bun proof/…/portrait-probe.mjs` from `twin/`.")
 *
 * Stripping comments does not help — this is code, and the sentence is the string's own value. A
 * regex over the remaining text reads `from `twin/`` and demands a package called `twin`. Reading
 * the syntax instead is what makes the difference: a literal's CONTENT is consumed as a literal and
 * never re-scanned, and only the code immediately before it decides whether it is a specifier.
 */
function specifiers(src: string): string[] {
  const found: string[] = [];
  // The code seen so far, with literals and comments elided — its tail is what says whether the
  // literal about to be read is a module specifier.
  let code = "";
  const carriesASpecifier =
    /(?:\bfrom|\bimport\s*\(|\brequire\s*\(|\bimport)\s*$/;
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // A REGEX LITERAL, which must be consumed whole. This is not fastidiousness either — it was the
    // second false demand. `twin-newsroom-charter/scripts/extract.mjs` parses HTML, so it holds
    // `/<html[^>]*\slang=["']([^"']+)["']/i`. A scanner that does not know regex literals reads the
    // `"` inside that character class as opening a string, consumes code as though it were text,
    // and every subsequent comment and literal in the file is read at the wrong offset — which is
    // how a `/** … from `<html lang="…">` … */` COMMENT twelve lines later became a demand for a
    // package named `<html lang="…">`. A desynchronised scanner does not fail loudly; it invents.
    //
    // Regex-versus-division is genuinely ambiguous without a parser. The standard heuristic is
    // used: a `/` opens a regex unless the previous significant token could END an expression (an
    // identifier, a number, or a closing bracket), with the keywords that can precede a regex
    // despite ending in a letter listed explicitly.
    if (c === "/") {
      const tail = code.replace(/\s+$/, "");
      const endsAnExpression = /[A-Za-z0-9_$)\]]$/.test(tail);
      const keywordBefore =
        /\b(return|typeof|instanceof|in|of|case|do|else|yield|await|new|delete|void|throw)$/.test(
          tail,
        );
      if (!endsAnExpression || keywordBefore) {
        let j = i + 1;
        let inClass = false;
        let closed = false;
        while (j < n) {
          const ch = src[j];
          if (ch === "\\") {
            j += 2;
            continue;
          }
          if (ch === "\n") break; // a regex literal cannot span lines — this was division after all
          if (ch === "[") inClass = true;
          else if (ch === "]") inClass = false;
          else if (ch === "/" && !inClass) {
            closed = true;
            break;
          }
          j++;
        }
        if (closed) {
          i = j + 1;
          while (i < n && /[a-z]/.test(src[i])) i++; // flags
          code += " ";
          continue;
        }
      }
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      let value = "";
      while (j < n && src[j] !== quote) {
        if (src[j] === "\\") {
          value += src[j] + (src[j + 1] ?? "");
          j += 2;
          continue;
        }
        value += src[j];
        j++;
      }
      if (carriesASpecifier.test(code)) found.push(value);
      code += " "; // the literal is opaque; it only ever separates two pieces of code
      i = j + 1;
      continue;
    }
    code += c;
    i++;
  }
  return found;
}

/** `react-dom/server` → `react-dom`; `@remotion/cli/x` → `@remotion/cli`. */
function packageNameOf(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

async function walkedSpecifiers(): Promise<Map<string, Set<string>>> {
  const bySpec = new Map<string, Set<string>>();
  for (const top of WALKED) {
    for await (const file of sourceFiles(join(TWIN, top))) {
      const src = await readFile(file, "utf8");
      for (const spec of specifiers(src)) {
        if (!bySpec.has(spec)) bySpec.set(spec, new Set());
        bySpec.get(spec)!.add(relative(TWIN, file));
      }
    }
  }
  return bySpec;
}

const templatePkg = JSON.parse(
  await readFile(join(TEMPLATE, "package.json"), "utf8"),
);
const twinPkg = JSON.parse(await readFile(join(TWIN, "package.json"), "utf8"));
const declared = new Set(Object.keys(templatePkg.dependencies ?? {}));
const allSpecs = await walkedSpecifiers();

describe("the root template declares every package the tree actually imports", () => {
  it("should leave no bare import specifier undeclared", () => {
    const undeclared: string[] = [];
    for (const [spec, files] of allSpecs) {
      if (spec.startsWith(".") || spec.startsWith("/")) continue; // relative — not a package
      if (spec.startsWith("node:") || spec.startsWith("bun:")) continue; // runtime builtins
      if (spec.startsWith("#")) continue; // subpath imports — asserted separately below
      // A template literal with an interpolation is CONSTRUCTED AT RUNTIME — the header states
      // that family as this scan's stated boundary, and it is genuinely out of reach for a text
      // scan. Skipped here rather than left to be read as a package: without this, a real
      // `await import(`${join(dir, "x.mjs")}?copy=1`)` in a test was reported as a demand for a
      // package literally named `${join(dir, "x.mjs")}?copy=1`.
      if (spec.includes("${")) continue;
      const name = packageNameOf(spec);
      if (declared.has(name)) continue;
      const [example] = [...files].sort();
      undeclared.push(`${name} (as "${spec}", e.g. ${example})`);
    }
    expect(undeclared.sort()).toEqual([]);
  });
});

describe("the root template vendors every #shared file the tree actually imports", () => {
  it("should leave no #shared specifier unvendored", () => {
    const missing: string[] = [];
    for (const [spec, files] of allSpecs) {
      if (!spec.startsWith("#shared/")) continue;
      const rel = spec.slice("#shared/".length);
      if (existsSync(join(TEMPLATE_SHARED, rel))) continue;
      const [example] = [...files].sort();
      missing.push(`shared/${rel} (imported by ${example})`);
    }
    expect(missing.sort()).toEqual([]);
  });

  /**
   * The dev root and a journalist's root must run the SAME shared code. `twin/shared/` is what
   * every proof beat in this repository loads; `root-template/shared/` is what a newsroom's beats
   * load. A fix applied to one and not the other means this repository can no longer reproduce
   * what it ships — the drift `root-template-shared.test.ts` guards file by file, asserted here as
   * whole trees so a NEW file cannot land on one side alone.
   */
  it("should mirror twin/shared exactly, file for file and byte for byte", async () => {
    const treeOf = async (root: string) => {
      const files: string[] = [];
      const walk = async (dir: string) => {
        for (const e of await readdir(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) await walk(p);
          else files.push(relative(root, p).split(sep).join("/"));
        }
      };
      if (existsSync(root)) await walk(root);
      return files.sort();
    };
    const live = await treeOf(join(TWIN, "shared"));
    const vendored = await treeOf(TEMPLATE_SHARED);
    expect(vendored).toEqual(live);
    for (const rel of live) {
      expect(await readFile(join(TEMPLATE_SHARED, rel), "utf8")).toBe(
        await readFile(join(TWIN, "shared", rel), "utf8"),
      );
    }
  });
});

describe("the root template pins what this repository pins", () => {
  /**
   * A newsroom must get the versions the craft skills were actually built and proven against. The
   * template is the manifest that lands in their root, and it is written by hand — so the only
   * thing keeping it in step with the tree is this assertion.
   */
  it("should carry the same version string as twin/package.json for every shared name", () => {
    const twinDeps: Record<string, string> = {
      ...(twinPkg.dependencies ?? {}),
      ...(twinPkg.devDependencies ?? {}),
    };
    const drift: string[] = [];
    for (const [name, version] of Object.entries(
      templatePkg.dependencies ?? {},
    )) {
      const here = twinDeps[name];
      if (here === undefined) continue; // template-only (typescript) — nothing to agree with
      if (here !== version)
        drift.push(`${name}: template ${version} vs tree ${here}`);
    }
    expect(drift.sort()).toEqual([]);
  });
});

describe("the root template declares every binary the tree spawns", () => {
  /**
   * Read from the DECLARED packages' own `bin` fields in this repository's installed tree, not from
   * a name this test decided. `@remotion/cli` is imported by nothing and spawned by twenty-one
   * files; without this rule the template would legitimately pass rule 1 while every video beat
   * exited ENOENT.
   */
  it("should have a declared dependency providing each node_modules/.bin/<name> that is spawned", async () => {
    const spawned = new Set<string>();
    for (const top of WALKED) {
      for await (const file of sourceFiles(join(TWIN, top))) {
        const code = stripComments(await readFile(file, "utf8"));
        for (const m of code.matchAll(
          /node_modules\/\.bin\/([A-Za-z0-9_@./-]+)/g,
        )) {
          spawned.add(m[1]);
        }
      }
    }

    const providedBy = new Map<string, string>();
    for (const name of declared) {
      let meta;
      try {
        meta = JSON.parse(
          await readFile(
            join(TWIN, "node_modules", name, "package.json"),
            "utf8",
          ),
        );
      } catch {
        continue; // not installed in THIS tree — rule 1 and the clean room cover that
      }
      const bin = meta.bin;
      if (typeof bin === "string")
        providedBy.set(meta.name.split("/").pop(), name);
      else if (bin && typeof bin === "object")
        for (const binName of Object.keys(bin)) providedBy.set(binName, name);
    }

    const unprovided = [...spawned].filter((b) => !providedBy.has(b)).sort();
    expect(unprovided).toEqual([]);
    expect(spawned.size).toBeGreaterThan(0); // the scan found something to check at all
  });
});

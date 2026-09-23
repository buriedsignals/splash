/**
 * A SHIPPED SCRIPT THAT DOES NOT PARSE IS A SKILL THAT DOES NOT RUN, AND THE FAST LANE WAS GREEN.
 *
 * Measured 2026-09-23. A CSS comment added inside `render-web.mjs`'s stylesheet template literal
 * carried backticks — `min-height`, `flex-basis` — and each one closed the literal. The file was a
 * syntax error from that moment on, every map and chart web beat in the toolchain was unrunnable,
 * and `bun run test` reported 4939 pass / 0 fail: nothing in the fast lane imports that module,
 * because everything that does drives a browser and lives in the heavy lane.
 *
 * So the fast lane could not see a whole skill being broken. Parsing is not importing — it needs no
 * browser, no renderer, no key, and it takes about a second for the tree — so it belongs here.
 *
 * It parses only. Whether a specifier resolves is a different question, held by
 * `every-import-is-declared` and `nothing-a-journalist-receives-reaches-into-skills`.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const ROOTS = ["skills", "shared"];
const SKIP = new Set([
  "node_modules",
  ".git",
  "output-proof",
  "renders",
  "plate",
  "fallback",
]);
const LOADER: Record<string, "tsx" | "ts" | "js"> = {
  ".tsx": "tsx",
  ".ts": "ts",
  ".mts": "ts",
  ".mjs": "js",
  ".cjs": "js",
  ".js": "js",
  ".jsx": "tsx",
};

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

/** Every source file the toolchain ships, test files included — a broken test is a broken guard. */
function shipped(): {
  name: string;
  source: string;
  loader: "tsx" | "ts" | "js";
}[] {
  const out: { name: string; source: string; loader: "tsx" | "ts" | "js" }[] =
    [];
  for (const root of ROOTS)
    for (const path of walk(join(ROOT, root))) {
      const ext = path.slice(path.lastIndexOf("."));
      const loader = LOADER[ext];
      if (!loader) continue;
      if (statSync(path).size > 2_000_000) continue;
      out.push({
        name: path.slice(ROOT.length + 1),
        source: readFileSync(path, "utf8"),
        loader,
      });
    }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

describe("every script this toolchain ships", () => {
  it("finds them at all, so this file cannot pass by looking at nothing", () => {
    expect(shipped().length).toBeGreaterThanOrEqual(400);
  });

  it("parses", () => {
    const broken: string[] = [];
    for (const { name, source, loader } of shipped()) {
      try {
        new Bun.Transpiler({ loader }).scan(source);
      } catch (error) {
        broken.push(
          `${name}: ${String((error as Error).message).split("\n")[0]}`,
        );
      }
    }
    expect(broken).toEqual([]);
  });
});

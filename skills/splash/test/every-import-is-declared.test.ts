/**
 * A BEAT CANNOT IMPORT A PACKAGE NOBODY DECLARED, and thirty-three files did.
 *
 * `bake.mjs.tmpl` — the map scaffold's own template, the file a journalist receives — opened with
 * `import puppeteer from "puppeteer"`. Neither this repository's manifest nor the root template's
 * declares `puppeteer`; both declare `puppeteer-core`. It worked here only because something else
 * in the tree pulls `puppeteer` in transitively, and it worked nowhere else.
 *
 * Measured 2026-09-23, scaffolding a real story's choropleth into an installed stories root and
 * running it:
 *
 *   error: Cannot find package 'puppeteer' from '…/beats/eu-inequality-map/bake.mjs'
 *
 * The call already passed `executablePath: resolveChrome()`, which is exactly what `puppeteer-core`
 * needs and what every verifier in this tree already does — so the import was the only thing wrong,
 * and it had been wrong in thirty-three files including two scaffold templates.
 *
 * WHAT THIS WALKS. The scaffold templates and the shared trunk, which are what a story's own beats
 * are made of. It reads bare specifiers only: a relative path is this tree's own business, and a
 * `#shared/` specifier is the root template's import map, which its own test already pins.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** Everything the root template's manifest promises a story's root will have installed. */
function declared(): Set<string> {
  const pkg = JSON.parse(readFileSync(join(ROOT, "skills/splash/assets/root-template/package.json"), "utf8"));
  return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
}

/** Every scaffold template and vendored trunk file — what a story's own beats are made of. */
function shipped(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|tmpl|ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  for (const skill of readdirSync(join(ROOT, "skills"), { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    walk(join(ROOT, "skills", skill.name, "assets"));
  }
  walk(join(ROOT, "shared"));
  return out;
}

/** The bare package specifiers a file imports — node builtins, relative paths and #shared aside. */
function bareImports(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/(?:^|\n)\s*import[^;'"]*from\s+["']([^"']+)["']/g)) found.add(m[1]);
  for (const m of source.matchAll(/\bawait import\(\s*["']([^"']+)["']\s*\)/g)) found.add(m[1]);
  return [...found]
    .filter(
      (spec) =>
        !spec.startsWith(".") &&
        !spec.startsWith("#") &&
        !spec.startsWith("node:") &&
        // The runtime's own test module, which is to Bun what `node:` is to Node.
        spec !== "bun:test" &&
        // An unfilled scaffold token: `%%UP%%/skills/…` is a relative path once the template is
        // filled, and the fill itself is pinned by each scaffold's own "no token survives" test.
        !spec.startsWith("%%"),
    )
    // A scoped package's own subpath (`@remotion/renderer/x`) is declared by its root name.
    .map((spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]));
}

describe("every package a shipped file imports", () => {
  it("finds the files at all, so this cannot pass by looking at nothing", () => {
    expect(shipped().length).toBeGreaterThan(40);
  });

  it("is one the root template's manifest declares", () => {
    const known = declared();
    const undeclared: string[] = [];
    for (const path of shipped())
      for (const spec of bareImports(readFileSync(path, "utf8")))
        if (!known.has(spec)) undeclared.push(`${path.slice(ROOT.length + 1)} imports ${spec}`);
    expect([...new Set(undeclared)]).toEqual([]);
  });
});

/**
 * THE HOVERABLE LINE IS DUPLICATED, SO IT IS WALKED.
 *
 * This project duplicates helpers rather than sharing them — a skill has to stay copy-pasteable on
 * its own, and `no-cross-skill-imports.test.ts` enforces that a beat never reaches into a skill's
 * internals. The risk that buys is silent divergence: two copies that both claim to implement the
 * same rule, drifting apart with nothing to notice. `render-still-parity.test.ts` walks the
 * rasteriser's helpers for exactly this reason; this file does the same job for the line primitive
 * introduced for B6.9 and B6.15.
 *
 * WHAT IS COMPARED, and it is BODIES, not signatures. The historic bug in this tree's first parity
 * guard was comparing signatures, which left every function with a destructured parameter inert.
 * Each copy's source is normalised — comments stripped, whitespace collapsed — and the resulting
 * strings must be identical. A comment-only difference is correctly ignored: each copy explains
 * itself in its own beat's terms and only the code has to agree.
 *
 * WHAT IS WALKED: every `hoverableLineProps` and every `LINE_HIT_WIDTH` under `skills/` and
 * `proof/`, found by reading the files rather than from a list — a new beat that duplicates the
 * primitive is walked the day it lands, without anyone remembering to add it here. The guard also
 * refuses a run that found fewer than two copies: one copy is not parity, and a walker that
 * silently found nothing is the green guard this project has already been burned by.
 *
 * THE MUTATION THAT REDDENS IT, run in a copy of the tree under `/tmp/line-parity-mut/`, never here.
 * `LINE_HIT_WIDTH` changed from 24 to 18 in the beat's copy only:
 *
 *   0 pass · 1 fail
 *   Received: "LINE_HIT_WIDTH differs between proof/web-co2-decline-slope/SlopeWeb.tsx and
 *   skills/twin-chart-web/assets/ChartWebSeed.tsx"
 *
 * And in the other direction, run in the same copy: two comments added to ONE copy only — one above
 * the constant, one inside the function body — leave it **2 pass · 0 fail**, which is what proves
 * the normalisation is doing its job rather than the guard being loose.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const TWIN = resolve(import.meta.dirname, "../../..");

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(path);
  }
  return out;
}

/** Comments out, whitespace collapsed. What is left is the code and nothing else. */
function normalise(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The text of a top-level declaration, from its own `export` keyword to the matching close. Brace
 *  counting rather than a parser: these are two small declarations in a known shape, and a real
 *  parser would be a dependency this tree does not carry. */
function declaration(source: string, name: string): string | null {
  const at = source.indexOf(`export function ${name}(`);
  if (at >= 0) {
    let depth = 0;
    let started = false;
    for (let i = at; i < source.length; i++) {
      if (source[i] === "{") {
        depth += 1;
        started = true;
      } else if (source[i] === "}") {
        depth -= 1;
        if (started && depth === 0) return source.slice(at, i + 1);
      }
    }
    return null;
  }
  const constAt = source.indexOf(`export const ${name} =`);
  if (constAt < 0) return null;
  const end = source.indexOf(";", constAt);
  return end < 0 ? null : source.slice(constAt, end + 1);
}

const NAMES = ["LINE_HIT_WIDTH", "hoverableLineProps"];

describe("the hoverable line primitive's copies stay in step", () => {
  for (const name of NAMES)
    it(`${name} is identical in every copy`, () => {
      const copies = sources(TWIN)
        .map((path) => ({
          path: relative(TWIN, path),
          body: declaration(readFileSync(path, "utf8"), name),
        }))
        .filter((c): c is { path: string; body: string } => c.body !== null);

      // One copy is not parity, and a walker that found nothing must be loud rather than green.
      expect(copies.length).toBeGreaterThanOrEqual(2);

      const first = copies[0];
      const canonical = normalise(first.body);
      const differing = copies
        .slice(1)
        .filter((c) => normalise(c.body) !== canonical)
        .map((c) => `${name} differs between ${first.path} and ${c.path}`);
      expect(differing.join("\n")).toBe("");
    });
});

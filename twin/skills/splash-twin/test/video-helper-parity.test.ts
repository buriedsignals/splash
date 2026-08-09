/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * Every video beat carries its OWN `measureText`/`wrap`, and that is deliberate: they run on the
 * browser-Canvas substrate (`document.createElement("canvas").getContext("2d")`), not the resvg one
 * the still renderers use, and the two return different numbers for the same string. A skill must
 * stay copy-pasteable on its own, so these are duplicated rather than shared, and the risk that
 * buys is silent divergence.
 *
 * `helper-parity.test.ts` guards that family by importing a hand-written list of FOUR copies.
 * Measured 2026-08-09: the tree holds **27**. Twenty-three were guarded by nothing.
 *
 * This is the second time the same shape has been found tonight — `render-still.mjs` had six copies
 * named out of twenty — and the cause is the same both times: a list cannot know about a file
 * created after it was written. It went further than a stale list here. Three agents writing new
 * video beats each reported "I added a copy your list does not cover" and correctly did not edit the
 * test; a fourth, on a different family, kept a DEAD export alive purely so the list would keep
 * importing it. **A guard maintained by remembering is a guard that quietly stops covering things,
 * and occasionally makes people write worse code to satisfy it.** So this file WALKS the tree.
 *
 * WHY BY TEXT AND NOT BY IMPORT. These copies live in `.tsx` components that import `remotion` and
 * build React elements; importing 27 of them into one test to compare two small functions pulls in
 * the whole video stack for no gain. This reads the source and compares the functions' own text,
 * the same technique `render-still-parity.test.ts` uses for the same reason.
 *
 * WHY THE COMPARISON IS NORMALISED. Whitespace is stripped ENTIRELY and trailing commas dropped
 * before a closer. Collapsing whitespace to a single space was tried first on the sibling guard and
 * was not enough: the repository's formatter breaks method chains across lines, so
 * `x.replace(a).replace(b)` becomes `x\n  .replace(a)\n  .replace(b)`, and collapsing leaves
 * `x .replace(a) .replace(b)` — still unequal, still a pure formatting difference, still a red guard
 * nobody would keep. **A guard a formatter can turn red is a guard someone disables.** The cost,
 * named: two bodies differing only by whitespace inside a string literal compare equal here.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **The other substrate.** These are compared only against each other, never against the resvg
 *    `measureText` in `render-still.mjs`. That comparison is the "impossible assertion"
 *    `helper-parity.test.ts` documents at length: in this Bun test environment `document` is
 *    undefined, so every canvas copy runs its own `text.length * fontSize * 0.5` fallback and
 *    returns a completely different number from the resvg one. Two right answers to two different
 *    questions.
 * 2. **A copy that renames the helper.** Only functions whose names match the canonical set are
 *    compared. A beat with a `measure()` doing the same job by another name is invisible here.
 * 3. **Behaviour.** This compares source text, not results. Two copies could agree character for
 *    character and both be wrong, and this file would be satisfied — it defends against DRIFT
 *    between copies, never against a defect they share. `helper-parity.test.ts` executes four of
 *    them on real strings; that is the complementary half, and it is why this file does not replace
 *    it.
 * 4. **Helpers duplicated in a video beat that are NOT in the canonical set** — `drawnSoFar`, `en`,
 *    a beat's own geometry. Several are duplicated at least as widely. Adding one here means
 *    deciding it has a single canonical form, which is a claim about the code, not a scan.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const CANONICAL = join(
  TWIN,
  "skills",
  "twin-chart-video",
  "assets",
  "EmissionsVideo.tsx",
);

// The two helpers every video beat vendors. Both are named in `helper-parity.test.ts`'s own
// canvas/video family, which is where this set comes from rather than from inspection.
const FAMILY = ["measureText", "wrap"];

// The marker that says a file carries the canvas substrate at all — the line that creates the
// measuring context. A component without it is not part of this family.
const SUBSTRATE = "measuringContext";

function findComponents(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findComponents(p, out);
    else if (
      e.name.endsWith(".tsx") &&
      readFileSync(p, "utf8").includes(SUBSTRATE)
    )
      out.push(p);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    // Whole-line `//` comments and `/* … */` blocks only. A copy legitimately carries different
    // explanatory prose — this guard's own header argues that for file headers, and the same is
    // true inside a function: `twin-image-beat`'s `renderStill` is character-identical to the
    // canonical one except for a two-line comment, and reporting that as drift is noise.
    //
    // Deliberately NOT stripping trailing `//` after code, because a regex literal like
    // `/\bwidth="(\d+)"/` contains no `//` but a URL or a divided expression could, and eating
    // code here would make the comparison vacuously equal on both sides — a guard that always
    // passes is worse than one that occasionally cries wolf.
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalise(source: string): string {
  return source
    // `export` is not part of a function's logic. The canonical copy exports both helpers; several
    // beats keep theirs module-private, which is correct — nothing outside the component needs
    // them. Stripping it was NOT in the first draft, and this guard's first run duly reported
    // `map-quake-symbol` and `mapgen-flowmap-video` as drifted on both helpers when their bodies
    // are character-for-character identical. Third false positive one of my own instruments
    // produced tonight; the rule is to check before believing a guard, including this one.
    .replace(/^export\s+/, "")
    .replace(/,(\s*[)\]}])/g, "$1")
    .replace(/\s+/g, "");
}

/** Top-level `function NAME(…) {…}` declarations, by brace matching. Nested forms are invisible. */
function topLevelFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // The body's `{`, found by BALANCING THE ARGUMENT PARENTHESES first — not by taking the next
    // `{` after the name. That naive version was the first draft and it was quietly broken: in
    // `wrap(text: string, maxWidth: number, font: { fontSize: number })` the next `{` is the
    // ARGUMENT TYPE's, so brace-matching from there closed at the end of the signature and every
    // comparison below ran on a signature instead of a body. Found by mutating a real `wrap`'s
    // `>` to `>=` and watching this guard stay green — a test that cannot go red proves nothing,
    // and this one could not, for every function whose parameters carry an inline object type or
    // a destructured argument. Which is most of them.
    let p = text.indexOf("(", m.index);
    if (p === -1) continue;
    let pd = 0;
    for (; p < text.length; p++) {
      if (text[p] === "(") pd++;
      else if (text[p] === ")") {
        pd--;
        if (pd === 0) break;
      }
    }
    const open = text.indexOf("{", p);
    if (open === -1) continue;
    let depth = 0;
    let end = open;
    for (; end < text.length; end++) {
      if (text[end] === "{") depth++;
      else if (text[end] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    found.set(m[1], normalise(stripComments(text.slice(m.index, end + 1))));
  }
  return found;
}

const canonical = topLevelFunctions(readFileSync(CANONICAL, "utf8"));
const copies = findComponents(TWIN).filter((p) => p !== CANONICAL);

describe("canvas-substrate helpers — every copy in the tree, discovered rather than listed", () => {
  it("should find the canonical component carrying the family this guard compares", () => {
    // Without this, renaming or emptying the canonical file would leave every comparison below
    // vacuously green. The premise is pinned, not assumed.
    for (const name of FAMILY) {
      expect([name, canonical.has(name)]).toEqual([name, true]);
    }
  });

  it("should find far more copies than the hand-written import list names", () => {
    // Measured 2026-08-09: 27 copies in the tree, 4 named by `helper-parity.test.ts`. The exact
    // number moves with the beats; a tree where this walk found fewer than the import list names
    // would mean the walk is broken, not that the tree got tidy.
    expect(copies.length).toBeGreaterThanOrEqual(4);
  });

  for (const copy of copies) {
    const label = relative(TWIN, copy);
    it(`${label} should not disagree with the canonical copy about a shared helper`, () => {
      const theirs = topLevelFunctions(readFileSync(copy, "utf8"));
      const drifted: string[] = [];
      for (const name of FAMILY) {
        // A copy that does not carry a helper at all is fine — not every video beat wraps text.
        // Only a copy that carries it AND disagrees is a defect.
        if (theirs.has(name) && canonical.get(name) !== theirs.get(name))
          drifted.push(name);
      }
      expect([label, drifted]).toEqual([label, []]);
    });
  }
});

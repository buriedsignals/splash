/**
 * THE GEOMETRY CORES' OWN WALK — AND WHY IT DOES NOT TAKE A CANONICAL.
 *
 * Eighteen files (`proof/*​/geo-*.ts`, `map-beat/assets/geo.ts`,
 * `map-web/assets/geo-symbol.ts`), 6,400+ lines, guarded by nothing before this file:
 * `helper-parity.test.ts`'s hand-written list names not one `geo-*` function, and
 * `map-beat/test/geo.test.ts` exercises only the skill's own copy.
 *
 * `render-still-parity.test.ts` takes a canonical, and that works because its family is ONE file
 * copied wholesale: every shared name really is the same function. **The geometry family is not
 * that.** It is six type-specific cores that share a namespace as much by accident as by design.
 * Measured 2026-08-10, before this guard existed: nineteen multi-copy function names disagreed, and
 * at least six of the disagreements were CORRECT code —
 *
 *   - `readingOrder` sorts by `.value` on a choropleth, `.population` on a dot map, ascending
 *     `.priority` on a locator: four beats' reading orders, not four drifts.
 *   - `valuesFromCsv` takes a `year` where the beat animates a year and does not where it does not.
 *   - `quakePointsFromCsv` delegates to `keptRows` in the beat that also needs the kept rows.
 *
 * A naive "every shared name must agree" walk would have gone red on nineteen families on day one.
 * That is `helper-parity.test.ts`'s own failure mode at six times the scale, and a guard that
 * reddens for correct work is a guard someone disables.
 *
 * A single hard-coded canonical is worse still: no one file holds all six type families, so every
 * function the canonical lacked would be silently unguarded. That is the hand-written-list mistake
 * wearing a walk's clothes.
 *
 * THE MECHANISM: **the code states the claim, the walk finds it.** A function meant to be one
 * function everywhere carries `@parity` in its docblock. The walk compares every tagged name across
 * every file that declares it, PAIRWISE — no canonical, and the failure names all disagreeing
 * copies. The omission hole is closed by the second assertion: **a file declaring a name that is
 * tagged anywhere must carry the tag too, or carry `@parity-exempt <reason>` on that declaration.**
 * You cannot silently create an untagged twin of a tagged function; you have to write down why it
 * is different, in the diff, where a reviewer sees it.
 *
 * TWO WAYS THIS DEPARTS FROM THE RENDER-STILL WALK'S COMPARISON, both forced by measurement:
 *
 * 1. **Generic functions.** `render-still-parity.test.ts`'s regex is `function\s+NAME\s*\(`, which
 *    cannot match `function readingOrder<T extends { value: number }>(rows: T[])`. Four of the
 *    disagreeing names in this family are generic, and every one of them was INVISIBLE to that
 *    method. The scan below steps over a balanced `<…>` before looking for the argument list.
 * 2. **Type annotations are erased before comparing.** `pointInRing` is byte-identical in six copies
 *    except that three type their ring `Ring` and three `Pt` — a difference that does not exist at
 *    runtime, because a beat names its own types. Comparing them raw reports six drifts that are not
 *    drifts. Parameter NAMES and DEFAULT VALUES survive erasure and are compared, which is what
 *    keeps `fr(value, decimals = 0)` and `fr(value, decimals = 1)` a real disagreement.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Module-level constants (`HEX`, `NO_DATA_FILL`, `MAX_RADIUS`) —
 * the same hole `render-still-parity.test.ts:41-45` names for its own family. Helpers written as
 * `const NAME = (…) => …`. Imports. And any function nobody thought to tag: the second assertion
 * only fires once a name is tagged SOMEWHERE, so a family duplicated under a name that is tagged
 * nowhere is invisible. That is a deliberate trade — the alternative is the red-on-day-one guard
 * this file exists to avoid.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");

function findAll(
  dir: string,
  matches: (name: string) => boolean,
  out: string[] = [],
): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findAll(p, matches, out);
    else if (matches(e.name)) out.push(p);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalise(source: string): string {
  return source.replace(/,(\s*[)\]}])/g, "$1").replace(/\s+/g, "");
}

/**
 * Drop TypeScript type annotations from a parameter list, keeping names and defaults.
 *
 * `name: Type` → `name`; `name: Type = 40` → `name = 40`; `{ a, b }: Shape` → `{ a, b }`. A depth
 * counter keeps `frame: { width: number }` and `Map<string, number>` from being split at their own
 * inner commas and colons. This is what makes a beat free to name its own `Ring`/`Pt`/`PixelRing`
 * without the guard calling it drift, while `margin = 40` versus `margin = 90` stays visible.
 */
function eraseParamTypes(params: string): string {
  const out: string[] = [];
  let depth = 0;
  let piece = "";
  let inType = false;
  for (const ch of params) {
    if ("([{<".includes(ch)) depth++;
    else if (")]}>".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(piece);
      piece = "";
      inType = false;
      continue;
    }
    if (ch === ":" && depth === 0) {
      inType = true;
      continue;
    }
    if (ch === "=" && depth === 0) inType = false;
    if (!inType) piece += ch;
  }
  out.push(piece);
  return out
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .join(",");
}

type Declaration = {
  name: string;
  body: string;
  tag: "parity" | "exempt" | null;
  exemptReason: string;
};

/** Top-level `function NAME<…>(…) {…}`, with its immediately preceding docblock read for tags. */
function declarations(text: string): Map<string, Declaration> {
  const found = new Map<string, Declaration>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*[<(]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // Step over a balanced generic parameter list, if any, before looking for the arguments. This
    // is the step `render-still-parity.test.ts`'s regex does not take, and four of this family's
    // disagreements hid behind it.
    let p = m.index + m[0].length - 1;
    if (text[p] === "<") {
      let ad = 0;
      for (; p < text.length; p++) {
        if (text[p] === "<") ad++;
        else if (text[p] === ">") {
          ad--;
          if (ad === 0) break;
        }
      }
      p = text.indexOf("(", p);
      if (p === -1) continue;
    }
    const paramsFrom = p + 1;
    let pd = 0;
    for (; p < text.length; p++) {
      if (text[p] === "(") pd++;
      else if (text[p] === ")") {
        pd--;
        if (pd === 0) break;
      }
    }
    const params = eraseParamTypes(stripComments(text.slice(paramsFrom, p)));
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

    // The docblock is whatever `/** … */` ends immediately before this declaration.
    const before = text.slice(0, m.index).trimEnd();
    let tag: Declaration["tag"] = null;
    let exemptReason = "";
    if (before.endsWith("*/")) {
      const doc = before.slice(before.lastIndexOf("/**"));
      const exempt = /@parity-exempt\s*:?\s*([^\n*]*)/.exec(doc);
      if (exempt) {
        tag = "exempt";
        exemptReason = exempt[1]!.trim();
      } else if (/@parity\b/.test(doc)) tag = "parity";
    }

    found.set(m[1], {
      name: m[1],
      body: normalise(stripComments(`(${params})` + text.slice(open, end + 1))),
      tag,
      exemptReason,
    });
  }
  return found;
}

const files = findAll(TWIN, (n) => /^geo(-[a-z]+)?\.ts$/.test(n));
const perFile = new Map(
  files.map((f) => [f, declarations(readFileSync(f, "utf8"))] as const),
);

const taggedSomewhere = new Set<string>();
for (const decls of perFile.values())
  for (const d of decls.values())
    if (d.tag === "parity") taggedSomewhere.add(d.name);

describe("the geometry cores — one function, or a written reason why not", () => {
  it("should find the eighteen cores rather than a list of them", () => {
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  it("should find enough tagged names that the comparison below is not vacuous", () => {
    const shared = [...taggedSomewhere].filter(
      (name) =>
        [...perFile.values()].filter((d) => d.get(name)?.tag === "parity")
          .length >= 2,
    );
    expect([shared.length, shared.length >= 10]).toEqual([shared.length, true]);
  });

  for (const name of [...taggedSomewhere].sort()) {
    it(`@parity ${name} should have the same body in every copy that claims it`, () => {
      const bodies = new Map<string, string[]>();
      for (const [file, decls] of perFile) {
        const d = decls.get(name);
        if (!d || d.tag !== "parity") continue;
        const key = d.body;
        if (!bodies.has(key)) bodies.set(key, []);
        bodies.get(key)!.push(relative(TWIN, file));
      }
      // In agreement there is exactly one group, and the assertion reads `[name, []]` on both
      // sides. In disagreement it prints every group with the files in it, so the failure names
      // which copies parted company rather than just saying that some did.
      const groups = [...bodies.values()].map((g) => g.sort().join(" + "));
      expect([name, groups.length > 1 ? groups : []]).toEqual([name, []]);
    });
  }

  for (const [file, decls] of perFile) {
    const label = relative(TWIN, file);
    it(`${label} should not carry an untagged twin of a function tagged elsewhere`, () => {
      const silent: string[] = [];
      for (const d of decls.values())
        if (taggedSomewhere.has(d.name) && d.tag === null) silent.push(d.name);
      expect([label, silent]).toEqual([label, []]);
    });

    it(`${label} should give a reason with every @parity-exempt`, () => {
      const reasonless = [...decls.values()]
        .filter((d) => d.tag === "exempt" && d.exemptReason.length < 12)
        .map((d) => d.name);
      expect([label, reasonless]).toEqual([label, []]);
    });
  }
});

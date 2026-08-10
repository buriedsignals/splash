/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The defect it was built from, measured by EXECUTING all nine copies rather than reading them:
 * this tree shipped **three incompatible implementations of one function name**. Three delegated to
 * `Intl.NumberFormat("fr-FR")` and were correct. Three were hand-rolled regexes emitting a PLAIN
 * space (U+0020, which lets a browser break a line in the middle of a number), half of them missing
 * the regex's `g` flag so only the first thousand grouped — `fr(1234567, 1)` returned "1 234567,0".
 * And three were `value.toFixed(decimals)`: **a function named `fr` returning an English number**.
 * That last one reached delivered artifacts, printing 0.2, 10.3 and 14.9 with English decimal
 * points in beats whose formatter was named for French.
 *
 * Unifying them onto `Intl` fixed the function and exposed a deeper defect: **five of the six beats
 * using it declare `lang="en"`**, so they then printed French decimals under English prose — an
 * axis reading `68,9` beneath a headline reading "rose 15.0 years". Being right about the function
 * and wrong about the beat is its own lesson: unifying copies makes them consistent, not correct.
 *
 * So this guard asserts the two rules that survived both rounds:
 *
 *   1. **No hand-rolled thousands grouping.** A formatter delegates to `Intl.NumberFormat`, which
 *      the platform owns and which cannot drift back into a regex. Every one of the three bugs
 *      above lived in a hand-rolled separator.
 *   2. **A name must not lie about its locale.** A function named `fr` may not format in English;
 *      a function named `en` may not format in French. This is deliberately narrower than "the
 *      locale matches the beat's declared language" — see below for why that stronger rule is not
 *      asserted here.
 *
 * WHY IT DISCOVERS RATHER THAN LISTS. `helper-parity.test.ts` guards duplicated helpers by
 * importing a hand-written list, and that list is a liability: while this session was running, an
 * agent legitimately removed `fr` from one beat, and the import list — not the code — turned the
 * suite red. Worse, two other agents then kept a DEAD `fr` export alive in their beats purely so
 * that test would keep importing it. A guard that forces dead code to exist has inverted its own
 * purpose. This file walks the tree instead, so a formatter deleted, added or renamed needs nobody
 * to remember anything.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **Whether a beat's formatter matches the beat's own declared language.** That is the rule the
 *    second round actually established, and it is not asserted here because the mapping from a
 *    source file to the HTML it ends up in is not mechanical in this tree: a geometry module is
 *    imported by a runner which passes props to a component which the skill renders into a page
 *    that declares `lang`. Following that chain is an import-graph tool, not a scan. What is
 *    checked instead is the narrower, purely local claim above — the name against its own body.
 *    A beat whose formatter is honestly named `formatNumber` and quietly uses the wrong locale
 *    passes this file completely.
 * 2. **A locale that is right but a FORMAT that is wrong** — wrong decimal count, a percentage
 *    written as a share, a unit appended to the wrong number. `Intl` is asked for; what is asked
 *    of it is not audited.
 * 3. **Anything outside a function whose body mentions `Intl.NumberFormat` or a grouping regex.**
 *    A formatter built from `toFixed` alone with no separator at all is invisible here, because on
 *    a value under a thousand that is indistinguishable from a correct English formatter. The three
 *    `toFixed`-only copies were caught by executing them side by side, not by a scan — see
 *    `helper-parity.test.ts`'s `fr` family, which still does that for the copies that remain.
 * 4. **Deliberate non-locale grouping.** Three files format US dollars and English thousands with
 *    a comma on purpose (`usd`-shaped helpers). They are excluded by rule 2 only because their
 *    names do not claim a locale; a badly named one would be flagged, correctly.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const SOURCE_EXT = [".ts", ".tsx", ".mjs"];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist")
      continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SOURCE_EXT.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** Top-level `function NAME(…) {…}` declarations, by brace matching. */
function topLevelFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const open = text.indexOf("{", m.index + m[0].length - 1);
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
    found.set(m[1], text.slice(m.index, end + 1));
  }
  return found;
}

// The exact shape of the bug: a lookahead counting groups of three digits, inserting a separator by
// hand. Written to match the family, not one spelling — with or without the `g` flag, which is the
// half of it that produced "1 234567,0".
const HAND_ROLLED_GROUPING = /\\B\(\?=\(\\d\{3\}\)\+\(\?!\\d\)\)/;

// A name that CLAIMS a locale. `formatNumber`, `billions`, `usd` claim none and are not judged on
// their output; `fr`/`en`/`frFormat` do.
const LOCALE_CLAIMING = /^(fr|en|de|it)([A-Z_].*)?$/;
const CLAIMED_LOCALE: Record<string, string> = {
  fr: "fr",
  en: "en",
  de: "de",
  it: "it",
};

type Finding = { file: string; fn: string; why: string };

const sources = walk(TWIN);

describe("number formatters are honest about what they do", () => {
  it("should delegate grouping to Intl.NumberFormat, never to a hand-rolled regex", () => {
    const offenders: Finding[] = [];
    for (const file of sources) {
      if (file.includes(join("skills", "splash", "test"))) continue; // this file names the regex
      const text = readFileSync(file, "utf8");
      if (!HAND_ROLLED_GROUPING.test(text)) continue;
      for (const [fn, body] of topLevelFunctions(text)) {
        if (!HAND_ROLLED_GROUPING.test(body)) continue;
        // A comma-grouped English/US helper is a deliberate choice, not a locale claim — see
        // limitation 4. It is only a defect when the NAME claims a locale, which rule 2 covers.
        if (!LOCALE_CLAIMING.test(fn)) continue;
        offenders.push({
          file: relative(TWIN, file),
          fn,
          why: "hand-rolled thousands grouping under a locale-claiming name",
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should never let a locale-claiming name format in a different locale", async () => {
    const offenders: Finding[] = [];
    for (const file of sources) {
      if (file.includes(join("skills", "splash", "test"))) continue;
      const text = readFileSync(file, "utf8");
      for (const [fn, body] of topLevelFunctions(text)) {
        const claim =
          CLAIMED_LOCALE[(LOCALE_CLAIMING.exec(fn)?.[1] as string) ?? ""];
        if (!claim) continue;
        const used = /Intl\.NumberFormat\(\s*["'`]([a-zA-Z-]+)["'`]/.exec(
          body,
        )?.[1];
        if (!used) {
          // No Intl call at all: either a hand-rolled body (rule 1 reports it) or a `toFixed`-only
          // body, which limitation 3 says this scan cannot judge. Neither is reported twice here.
          continue;
        }
        if (!used.toLowerCase().startsWith(claim)) {
          offenders.push({
            file: relative(TWIN, file),
            fn,
            why: `named for ${claim} but formats with Intl.NumberFormat("${used}")`,
          });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("should find formatters at all — so a green result is never an empty scan", () => {
    // Without this, deleting every formatter, or breaking the walk, would leave the two checks
    // above vacuously green. Measured at landing: well over a dozen files carry one.
    const withIntl = sources.filter((f) =>
      readFileSync(f, "utf8").includes("Intl.NumberFormat"),
    );
    expect(withIntl.length).toBeGreaterThanOrEqual(8);
  });
});

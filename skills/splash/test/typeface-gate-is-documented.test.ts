/**
 * A GATE NOBODY DOCUMENTED IS A GATE NOBODY CAN PREPARE FOR — issue #54.
 *
 * `TYPEFACE.md` is a required gate file with a refusal path. `readTypeface` walks up from the beat's
 * directory and THROWS when it finds none; `useTypeface` refuses a family this machine cannot
 * resolve rather than letting the rasteriser substitute one silently. Both behaviours are right.
 *
 * And `grep -rl "TYPEFACE.md" skills/*​/SKILL.md` returned nothing. The file's own prose states the
 * doctrine well — a newsroom's face is proposed and never imposed, a face that cannot be resolved is
 * refused and never substituted, `origin` records whether anybody actually chose — and it stated all
 * of it only to itself. Nothing an agent reads before producing a beat mentioned the file existed.
 *
 * What that cost, on a real run: the render stopped at the typeface after preflight, intake, G1, the
 * whole storyboard exchange, the palette gate, the analyst, the bake and two successful web
 * deliveries. The refusal message says what to do — it is a good message — but it arrives several
 * phases after the point where a journalist should have been asked, and after all the expensive
 * work. The asymmetry with colour is visible in the code itself: `render-map.mjs` reads the palette
 * and the typeface three lines apart and comments them as parallel, but `palette` has an entire
 * skill, a proposal function, a `formatProposal` renderer, a documented gate position and a
 * `SKILL.md`, and the typeface had none of it.
 *
 * ── WHY THIS TEST EXISTS RATHER THAN JUST THE DOCS ──────────────────────────────────────────────
 *
 * Documentation added once rots the moment a fifth skill starts rasterising type. So the roster is
 * DERIVED — from the call sites themselves, the same discipline `size-table-parity.test.ts` uses
 * after its own absence blind spot (#55) — and never typed here. A skill that gains the gate has to
 * document it in the same commit, with nobody remembering to update a list.
 *
 * ── WHAT IT DELIBERATELY DOES NOT CHECK ─────────────────────────────────────────────────────────
 *
 * That the documentation is GOOD. It asserts the file is named and that the two load-bearing
 * properties are described — refusal rather than substitution, and `origin` recording who chose —
 * because those are the two an author who has not read `TYPEFACE.md` will otherwise meet as a
 * surprise. It cannot assert that the prose around them is worth reading.
 *
 * And it does not assert the typeface has a GATE POSITION, because it does not have one. Movement
 * (9) of `references/exchange.md` is titled "The palette and the typeface" and asks about colour
 * only. The honest common case for a real newsroom is that `newsroom-charter` measures faces which
 * are then not installed on the rendering machine, so the run ends in a refusal nobody was offered
 * the chance to answer. That is the other half of #54 and belongs with #41; this file guards the
 * half that is fixed, and the SKILL.md text says plainly that the other half is open.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const SKILLS = join(TWIN, "skills");

/** Every file under `dir`, skipping node_modules and this project's own test directories — a call
 *  site in a test is not a skill that ships the gate. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "test") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (/\.(mjs|ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/**
 * The skills that put a recorded typeface in force before drawing — read off the code, never
 * listed. `useTypeface(` as a CALL, so the function's own definition does not enrol the skill that
 * merely carries a copy of it: `splash` vendors `render-still.mjs` into its root template, which
 * defines `useTypeface` and calls it nowhere, and enrolling `splash` would demand a `TYPEFACE.md`
 * in a skill that renders nothing.
 */
const gated = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((skill) => {
    const dir = join(SKILLS, skill);
    return sourceFiles(dir).some((file) => {
      const text = readFileSync(file, "utf8");
      // The definition line reads `export function useTypeface(`; a call site does not.
      return /(?<!function\s)\buseTypeface\(/.test(
        text.replace(/export function useTypeface\(/g, "«def»("),
      );
    });
  })
  .sort();

describe("the typeface gate — documented wherever it is enforced", () => {
  it("should find the gate in the craft skills that rasterise their own type", () => {
    // The premise, so every assertion below cannot go vacuously green on an empty roster. These
    // four rasterise type themselves; `dw-beat` lays it out server-side and `map-web`, `scrolly`
    // and `image-beat` draw theirs as HTML in a stylesheet.
    expect(gated).toEqual(["chart-beat", "chart-video", "chart-web", "map-beat"]);
  });

  it("should ship a TYPEFACE.md in every skill that enforces the gate", () => {
    for (const skill of gated) {
      const path = join(SKILLS, skill, "TYPEFACE.md");
      expect([skill, "ships TYPEFACE.md", existsSync(path)]).toEqual([
        skill,
        "ships TYPEFACE.md",
        true,
      ]);
      expect([skill, "is a regular file", statSync(path).isFile()]).toEqual([
        skill,
        "is a regular file",
        true,
      ]);
    }
  });

  it("should name TYPEFACE.md in the SKILL.md an author actually reads", () => {
    // The whole defect, in one assertion. Before #54 this was false for all four.
    for (const skill of gated) {
      const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
      expect([skill, "SKILL.md names TYPEFACE.md", text.includes("TYPEFACE.md")]).toEqual([
        skill,
        "SKILL.md names TYPEFACE.md",
        true,
      ]);
    }
  });

  it("should say that the gate REFUSES rather than substitutes, and that origin records who chose", () => {
    // Naming the file is not enough: an author who has not opened `TYPEFACE.md` needs the two
    // properties that will otherwise surprise them. A render that stops is the intended behaviour,
    // and `default` meaning "nobody chose" is the reason the field exists at all.
    for (const skill of gated) {
      const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
      expect([skill, "documents the refusal", /refus\w+, never substitut/i.test(text)]).toEqual([
        skill,
        "documents the refusal",
        true,
      ]);
      expect([skill, "documents origin", /`origin`/.test(text) && /nobody/i.test(text)]).toEqual([
        skill,
        "documents origin",
        true,
      ]);
    }
  });

  it("should tell an author which formats need the file, so they learn it before a render stops", () => {
    // Issue #54, item 4, in its own words: "An author cannot currently tell which formats need the
    // file until a render stops." Every gated skill has to name at least one format that does NOT
    // need it, because the useful half of that sentence is the exemption.
    for (const skill of gated) {
      const text = readFileSync(join(SKILLS, skill, "SKILL.md"), "utf8");
      const namesAnExemption = ["dw-beat", "map-web", "scrolly", "image-beat"].some((other) =>
        text.includes(`\`${other}\``),
      );
      expect([skill, "names a format that does not need it", namesAnExemption]).toEqual([
        skill,
        "names a format that does not need it",
        true,
      ]);
    }
  });
});

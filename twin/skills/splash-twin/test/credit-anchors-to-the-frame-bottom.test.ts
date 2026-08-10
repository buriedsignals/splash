/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The credit belongs at the BOTTOM of the visual (owner feedback B1.1). Measured on 2026-08-10,
 * before this guard existed: **60 `const sourceBaseline =` / `const sourceTop =` definitions in 60
 * distinct `.tsx` files, and not one of them anchored to `height - PAD`.** Every one derived the
 * source's y from something ABOVE it — `titleBaseline`, `titleTop`, `subtitleTop`,
 * `limitsBaseline`, `caveatBaseline`, `noteBaseline` — so the source hung under the header on every
 * genre this project ships.
 *
 * Five of those 60 are the CRAFT SKILLS' OWN SEEDS, and a seed is what the next beat is copied
 * from. This guard walks the skills and asserts that every source anchor there names the frame's
 * own height with a subtraction, and names none of the header rungs. It DISCOVERS the components
 * by walking `skills/**&#47;*.tsx`; a craft skill added tomorrow is covered the moment its component
 * lands, with nobody remembering to wire it up.
 *
 * WHY IT STOPS AT `skills/` — the residue, stated rather than hidden.
 *
 * 55 of the 60 are beats under `proof/`, and as of 2026-08-10 only three of them have been
 * migrated. Pointing this walk at `proof/` today would turn the suite red on ~52 beats that
 * already shipped. **That is a migration, not a guard** — the same argument
 * `seed-reads-a-recorded-palette.test.ts` makes for its own boundary, and the same reason
 * `PLAN-2026-08-10.md` orders seeds before beats: fixing beats while leaving seeds regenerates the
 * defect on the next beat written, whereas fixing seeds first means the backlog stops growing even
 * while it has not yet shrunk.
 *
 * The scope is a DIRECTORY, never a list of exempted files. When the beats are migrated, `ROOTS`
 * below gains `proof` and nothing else changes — no exemption list to prune, which is the
 * `helper-parity.test.ts` failure mode this branch has already paid for twice.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **That the glyph LANDS at the bottom.** It proves the EXPRESSION names the frame's bottom. A
 *    component could compute `height - PAD` and then draw the `<text>` at `y={12}`. The seed
 *    previews are re-rendered and opened for that; a rendered-SVG guard over the beats is worth
 *    building when the beats are migrated (the spec calls it Guard C) and would cover only the 17
 *    beats that ship an SVG beside their PNG.
 * 2. **A component that draws the source at a literal `y` with no named const.** Nothing here can
 *    see it, because there is no definition to read.
 * 3. **The 52 un-migrated beats**, per the boundary above.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");

/** The populations this guard covers. A directory, never a file list — see the header. */
const ROOTS = ["skills"];

/** The header rungs a source anchor may never be derived from: naming any of them means the credit
 *  hangs under the header, which is the defect. */
const HEADER_RUNGS = [
  "titleBaseline",
  "titleTop",
  "subtitleTop",
  "subtitleBaseline",
  "limitsBaseline",
  "caveatBaseline",
  "caveatTop",
  "noteBaseline",
];

function* tsxFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* tsxFiles(path);
    else if (entry.name.endsWith(".tsx")) yield path;
  }
}

/** Every `const sourceBaseline = …;` / `const sourceTop = …;`, with its right-hand side read to
 *  the terminating semicolon so a multi-line expression is judged whole. */
function sourceAnchors(src: string): { name: string; expression: string }[] {
  const found: { name: string; expression: string }[] = [];
  const re = /const\s+(sourceBaseline|sourceTop|sourceBottom)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const end = src.indexOf(";", m.index);
    if (end < 0) continue;
    found.push({
      name: m[1]!,
      expression: src.slice(m.index + m[0].length, end).trim(),
    });
  }
  return found;
}

const COMPONENTS = ROOTS.flatMap((root) => [...tsxFiles(join(TWIN, root))])
  .map((path) => ({ path, label: relative(TWIN, path) }))
  .filter(({ path }) => sourceAnchors(readFileSync(path, "utf8")).length > 0)
  .sort((a, b) => a.label.localeCompare(b.label));

describe("the credit is anchored to the frame's bottom, discovered rather than listed", () => {
  it("should find every craft-skill component that positions a source line", () => {
    // If the walk breaks, every assertion below goes vacuously green. Measured 2026-08-10: five
    // components across three craft skills carry a source anchor.
    expect(COMPONENTS.length).toBeGreaterThanOrEqual(5);
    const labels = COMPONENTS.map((c) => c.label);
    for (const expected of [
      "skills/twin-chart-beat/assets/ChartSeed.tsx",
      "skills/twin-chart-video/assets/EmissionsVideo.tsx",
      "skills/twin-chart-web/assets/ChartWebSeed.tsx",
      "skills/twin-map-beat/assets/Co2MapStill.tsx",
      "skills/twin-map-beat/assets/Co2MapVideo.tsx",
    ]) {
      expect([expected, labels.includes(expected)]).toEqual([expected, true]);
    }
  });

  for (const { path, label } of COMPONENTS) {
    it(`${label} should anchor its source to the frame's bottom, not to a header rung`, () => {
      const anchors = sourceAnchors(readFileSync(path, "utf8"));
      const byName = new Map(anchors.map((a) => [a.name, a.expression]));
      const offenders: string[] = [];
      for (const { name, expression } of anchors) {
        // A `sourceTop` derived from `sourceBottom` is the wrapped-block case: the LAST line lands
        // on the margin and the first is walked back up by the leading. That is the rule, not a
        // violation — but it is only the rule if `sourceBottom` ITSELF names the frame's bottom,
        // so the chain is FOLLOWED rather than trusted. (Not following it was a real hole: a
        // mutation putting `sourceBottom = titleTop + 30` back on the header rung passed the first
        // draft of this guard silently, because nothing ever read that definition.)
        const resolved =
          /\bsourceBottom\b/.test(expression) && name !== "sourceBottom"
            ? (byName.get("sourceBottom") ?? expression)
            : expression;
        const anchoredToBottom =
          /\b(height|FRAME\.height)\b/.test(resolved) && resolved.includes("-");
        if (!anchoredToBottom)
          offenders.push(
            `${name} does not resolve to the frame's height with a subtraction: ${resolved}`,
          );
        for (const rung of HEADER_RUNGS)
          if (new RegExp(`\\b${rung}\\b`).test(resolved))
            offenders.push(`${name} resolves to the header rung ${rung}`);
      }
      expect([label, offenders]).toEqual([label, []]);
    });
  }
});

/**
 * GUARD C — the glyph, not the expression.
 *
 * The guard above proves a component's source ANCHOR names the frame's bottom. It cannot prove the
 * `<text>` lands there: a component could compute `height - PAD` and then draw at `y={12}`. This
 * one reads the COMMITTED SVG a beat ships and measures the credit's own `y` against that file's
 * own `viewBox` height — the same measurement the W2 audit made by hand, which is what produced
 * its "14 of 17 static beats still draw the source in the top quarter" line.
 *
 * WHAT COUNTS AS A BEAT, and why that is not an exemption list. The population is every `.svg`
 * under a directory that holds a `BRIEF.md` — the tree's own definition of a beat, the same one
 * `claims-grounded-in-data.test.ts` and the audits use. A probe workspace that ships measurements
 * rather than a beat (`proof/portrait-aspect-probe/`) has no `BRIEF.md` and is therefore outside
 * the population by the tree's rule, not by anybody remembering to skip it. A beat added tomorrow
 * is inside it the moment its `BRIEF.md` lands.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Only the genres that ship an SVG beside their PNG — the mp4 and
 * the HTML genres are not covered here (Guard A covers their expression; the HTML genres would
 * need a DOM-ORDER check, never a byte-offset one, which the audit records as a measurement that
 * reports "bottom" and is wrong on a scrolly page). And it reads the credit's FIRST line: a
 * component drawing its wrapped credit downward off the frame would still pass, which is why the
 * arithmetic in every migrated component walks a wrapped block UPWARD from the margin.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree at /tmp/twinmut, never in this one:
 *
 *   M-C1  `proof/static-wind-vs-solar/…-still.svg`, the credit `<text y>` 500 -> 118 (a header
 *         value):
 *           (fail) … static-wind-vs-solar-still.svg should draw its credit in the bottom eighth
 *           "Source: Ember, Energy Institute — Statis…" is drawn at y=118 of a 560-high viewBox
 *           (0.211 down the frame; the bottom eighth starts at 0.875)
 *           34 pass, 1 fail
 *
 *   M-C2  every `BRIEF.md` renamed, so the walk finds no beats and the whole block would
 *         otherwise go vacuously green:
 *           (fail) … should find the beats that ship an SVG
 *           Expected: >= 24   Received: 0
 *           6 pass, 1 fail
 */
const BOTTOM_EIGHTH = 0.875;

/** A credit line, in any language this tree's beats are written in. The `<text>` content is the
 *  discriminator — never a class name, never a file name. */
const CREDIT_OPENERS = /^\s*(Source|Sources|Quelle|Fonte|Fuente)\b/i;

function* beatSvgs(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* beatSvgs(path);
    else if (entry.name.endsWith(".svg")) yield path;
  }
}

const BEAT_SVGS = (
  existsSync(join(TWIN, "proof"))
    ? readdirSync(join(TWIN, "proof"), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => join(TWIN, "proof", e.name))
        .filter((d) => existsSync(join(d, "BRIEF.md")))
        .flatMap((d) => [...beatSvgs(d)])
    : []
)
  .map((path) => ({ path, label: relative(TWIN, path) }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Every `<text …>…</text>` whose content opens with a credit word, with the `y` it is drawn at. */
function creditTexts(svg: string): { y: number; text: string }[] {
  const found: { y: number; text: string }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const y = /\by="([\d.]+)"/.exec(m[1]!);
    if (!y) continue;
    const text = m[2]!.replace(/<[^>]*>/g, "").trim();
    if (CREDIT_OPENERS.test(text)) found.push({ y: Number(y[1]), text });
  }
  return found;
}

describe("the credit LANDS at the frame's bottom in the committed artifact", () => {
  it("should find the beats that ship an SVG", () => {
    // Without this the whole block goes vacuously green if the walk breaks. Measured 2026-08-10:
    // 28 SVGs across the beat folders, and every one of them carries a credit `<text>`. The floor
    // is set below the measurement on purpose — a beat removed should not redden this, a broken
    // walk should.
    expect(BEAT_SVGS.length).toBeGreaterThanOrEqual(24);
    const withCredit = BEAT_SVGS.filter(
      ({ path }) => creditTexts(readFileSync(path, "utf8")).length > 0,
    );
    expect(withCredit.length).toBeGreaterThanOrEqual(20);
  });

  for (const { path, label } of BEAT_SVGS) {
    it(`${label} should draw its credit in the bottom eighth of its own viewBox`, () => {
      const svg = readFileSync(path, "utf8");
      const credits = creditTexts(svg);
      if (credits.length === 0) return; // a plate, a legend, a fragment: nothing to place
      const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      expect([label, box === null]).toEqual([label, false]);
      const height = Number(box![2]);
      const offenders = credits
        .filter(({ y }) => y < height * BOTTOM_EIGHTH)
        .map(
          ({ y, text }) =>
            `"${text.slice(0, 40)}…" is drawn at y=${y} of a ${height}-high viewBox ` +
            `(${(y / height).toFixed(3)} down the frame; the bottom eighth starts at ${BOTTOM_EIGHTH})`,
        );
      expect([label, offenders]).toEqual([label, []]);
    });
  }
});

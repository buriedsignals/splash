// `references/type-survey.md` is a GENERATED copy of material that lives in two other skills'
// `references/types/` directories, because a script inside this skill may not read them: that path
// resolves inside another skill and `no-cross-skill-imports.test.ts` flags it whatever it points
// at. The twin's answer to that is the one `MATRIX.md` already uses — generate into the skill, and
// drift-check the copy — and this file is the drift check.
//
// It reads the sibling skills' directories from a `test/` directory, which is the one place this
// branch allows crossing a skill boundary, and for exactly this purpose: asserting that a
// deliberate copy still agrees with what it was copied from.
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");
const SURVEY = join(SKILLS, "storyboard", "references", "type-survey.md");

const SHEET_DIRS = [
  join(SKILLS, "chart-beat", "references", "types"),
  join(SKILLS, "map-beat", "references", "types"),
];

function sheetTitles(): string[] {
  const titles: string[] = [];
  for (const dir of SHEET_DIRS) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md") || name === "README.md") continue;
      titles.push(
        readFileSync(join(dir, name), "utf8")
          .split(/\r?\n/)[0]
          .replace(/^#\s*/, "")
          .trim(),
      );
    }
  }
  return titles;
}

describe("the type survey has not drifted from the type sheets", () => {
  it("should regenerate byte-identically from the tree", async () => {
    const run = Bun.spawnSync({
      cmd: ["bun", "scripts/type-survey.mjs", "--check"],
      cwd: TWIN,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output =
      new TextDecoder().decode(run.stderr) +
      new TextDecoder().decode(run.stdout);
    expect(output.trim()).toContain("matches the tree");
    expect(run.exitCode).toBe(0);
  });

  it("should carry a row for every type sheet on disk", () => {
    const survey = readFileSync(SURVEY, "utf8");
    const titles = sheetTitles();
    // Not vacuous: 40 sheets ship today, and a survey generated from an empty directory would pass
    // a per-title loop with no titles in it.
    expect(titles.length).toBeGreaterThan(30);
    for (const title of titles) {
      expect(survey).toContain(`| **${title}** |`);
    }
  });

  it("should say, for every type, whether any format is proven on disk", () => {
    const survey = readFileSync(SURVEY, "utf8");
    const rows = survey.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line));
    expect(rows.length).toBe(sheetTitles().length);
    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim());
      // type | what it is for | when NOT to reach for it | refuses when | same idea as |
      // proven formats | sheet
      expect(cells[6].length).toBeGreaterThan(0);
      expect(
        /^(static|web|video|scrolly)(, (static|web|video|scrolly))*$/.test(
          cells[6],
        ) || cells[6] === "— none rendered here yet",
      ).toBe(true);
    }
  });

  // Round four, finding 24. The survey carried each sheet's *What it is for* sentence and nothing
  // else, so a scatter of six rows could close a slot although `types/scatter.md` refuses it in
  // words that were on disk the whole time. Both halves are generated now, and this is the drift
  // check for the second one: every refusal in the survey is a string the sheet itself contains.
  it("should carry every sheet's own refusal, in the sheet's own words", () => {
    const survey = readFileSync(SURVEY, "utf8");
    const rows = survey.split(/\r?\n/).filter((line) => /^\| \*\*/.test(line));
    let checked = 0;
    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim());
      const refusal = cells[3];
      const sheet = cells[7].replace(/`/g, "");
      const text = readFileSync(join(SKILLS, sheet), "utf8").replace(/\s+/g, " ");
      expect(refusal.length).toBeGreaterThan(40);
      // The generated cell joins wrapped lines with single spaces, which is the only edit made to
      // it; every sentence in it is otherwise the sheet's own.
      for (const sentence of refusal.split(". ")) {
        expect(text).toContain(sentence.replace(/\.$/, ""));
      }
      checked += 1;
    }
    expect(checked).toBe(rows.length);
    expect(checked).toBeGreaterThan(30);
  });

  // A count a sheet states in prose that no machine can see is the same defect one layer down, so
  // the generator refuses a sheet that states one and declares no machine-readable limit beside it.
  it("should declare, machine-readably, every count a sheet's refusal states in prose", () => {
    const survey = readFileSync(SURVEY, "utf8");
    const declared = survey
      .split(/\r?\n/)
      .filter((line) => /^\| \*\*/.test(line))
      .map((line) => line.split("|").map((c) => c.trim()))
      .filter((cells) => cells[4] !== "—")
      .map((cells) => `${cells[1].replace(/\*\*/g, "")}: ${cells[4]}`);
    expect(declared).toEqual([
      "Diverging stacked bar (Likert): levels > 5",
      "Pie and donut: slices > 5",
      "Scatter (and bubble): rows < 8",
    ]);
  });
});

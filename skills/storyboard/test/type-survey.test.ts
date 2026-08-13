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
      // type | what it is for | proven formats | sheet
      expect(cells[3].length).toBeGreaterThan(0);
      expect(
        /^(static|web|video|scrolly)(, (static|web|video|scrolly))*$/.test(
          cells[3],
        ) || cells[3] === "— none rendered here yet",
      ).toBe(true);
    }
  });
});

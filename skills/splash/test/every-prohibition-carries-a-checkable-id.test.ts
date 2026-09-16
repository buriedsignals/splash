/**
 * EVERY PROHIBITION IS CITABLE BY ID, IN ALL FOUR EXPORT FAMILIES.
 *
 * `## A choreography must NOT` was prose when the four families got their frame: 841 bullets across
 * 160 sheets, every one of them a rule and not one of them nameable. A checker that reads a beat's
 * declaration can only report "this violates something in bar-and-column.md"; it cannot say WHICH
 * rule, and a report that cannot name the rule cannot be acted on without rereading the sheet.
 *
 * So each bullet now leads with a short id in backticks — `` - `no-overlap-pictures-card` — overlap
 * two pictures on one card `` — and `checkChoreography` reports violations by that id.
 *
 * HOW THE IDS WERE DERIVED, so the next sheet gets one that fits. The id is `no-` followed by the
 * first three content words of the bullet's LEAD CLAUSE (everything before its first em dash or
 * colon), accents and possessives stripped, stop words dropped; a fourth and a fifth word are added
 * only where three collide inside the same export family. Derived from the text, so the SAME
 * prohibition written the same way in twenty sheets lands on the same id twenty times — which is
 * what makes "this beat broke `no-pop-marks-groups`" mean one thing across a whole family.
 *
 * WHAT THIS FILE CHECKS
 *   1. every bullet under the heading carries an id, in all 160 sheets;
 *   2. inside one export family, one text has one id and one id has one text — the property a
 *      checker's report depends on;
 *   3. `parseTypeSheet` (`shared/editorial/frame.mjs`) actually reads those ids back, so the sheets
 *      and the reader cannot drift apart silently.
 *
 * The ids are LITERAL TEXT IN THE SHEETS, not computed at read time. Adding a 41st type therefore
 * cannot renumber the other forty.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - stripped the id from one bullet of `skills/chart-web/references/types/bar-and-column.md`
 *     → RED on assertion 1, naming that file and that bullet. Restored → green.
 *   - gave `skills/map-beat/references/types/choropleth.md`'s first prohibition the id of its
 *     second → RED on assertion 2, naming both texts. Restored → green.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
// @ts-expect-error — the trunk is ESM JavaScript, read from TypeScript tests the way this tree does.
import { parseTypeSheet } from "../../../shared/editorial/frame.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** The four export families, and where each keeps its type sheets. Charts and maps, per export. */
const FAMILIES: Record<string, string[]> = {
  scrolly: ["skills/scrolly/references/types"],
  video: [
    "skills/chart-video/references/types",
    "skills/map-beat/references/types/video",
  ],
  web: ["skills/chart-web/references/types", "skills/map-web/references/types"],
  static: [
    "skills/chart-beat/references/types",
    "skills/map-beat/references/types",
  ],
};

const HEADING = "## A choreography must NOT";

/** Every sheet of a family that carries the heading — README and index files carry none. */
function sheetsOf(family: string): string[] {
  const out: string[] = [];
  for (const dir of FAMILIES[family]) {
    if (!existsSync(join(TWIN, dir))) continue;
    for (const file of readdirSync(join(TWIN, dir)).sort()) {
      if (!file.endsWith(".md")) continue;
      const path = join(dir, file);
      if (readFileSync(join(TWIN, path), "utf8").includes(HEADING))
        out.push(path);
    }
  }
  return out;
}

/** The raw bullets under the heading, markers stripped, in the order the sheet writes them. */
function prohibitionBullets(text: string): string[] {
  const at = text.indexOf(HEADING);
  if (at < 0) return [];
  const rest = text.slice(at + HEADING.length);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end))
    .split("\n")
    .filter((line) => /^\s*[-*]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim());
}

const ALL = Object.keys(FAMILIES).flatMap((family) =>
  sheetsOf(family).map((sheet) => ({ family, sheet })),
);

describe("every prohibition carries a checkable id", () => {
  it("should find all 160 type sheets across the four export families", () => {
    expect(ALL.length).toBe(160);
  });

  it.each(ALL)("should give every $sheet prohibition an id", ({ sheet }) => {
    const bullets = prohibitionBullets(readFileSync(join(TWIN, sheet), "utf8"));
    expect(bullets.length, `${sheet}: no prohibitions`).toBeGreaterThanOrEqual(
      2,
    );
    for (const bullet of bullets)
      expect(
        /^`no-[a-z0-9-]+`\s+[—–]\s+\S/.test(bullet),
        `${sheet}: prohibition carries no id — ${bullet.slice(0, 70)}`,
      ).toBe(true);
  });

  it.each(Object.keys(FAMILIES))(
    "should keep one id per prohibition, and one prohibition per id, across %s",
    (family) => {
      const idOfText = new Map<string, string>();
      const textOfId = new Map<string, string>();
      for (const sheet of sheetsOf(family)) {
        for (const { id, says } of parseTypeSheet(
          readFileSync(join(TWIN, sheet), "utf8"),
        ).prohibitions as { id: string; says: string }[]) {
          expect(
            id,
            `${sheet}: unparsed id for "${says.slice(0, 50)}"`,
          ).not.toBeNull();
          const seenId = idOfText.get(says);
          if (seenId !== undefined)
            expect(seenId, `${sheet}: "${says.slice(0, 50)}" has two ids`).toBe(
              id,
            );
          const seenText = textOfId.get(id);
          if (seenText !== undefined)
            expect(
              seenText,
              `${sheet}: \`${id}\` names two different prohibitions`,
            ).toBe(says);
          idOfText.set(says, id);
          textOfId.set(id, says);
        }
      }
      expect(idOfText.size).toBeGreaterThan(0);
    },
  );
});

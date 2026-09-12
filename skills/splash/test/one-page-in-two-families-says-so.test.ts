/**
 * A PAGE FILED UNDER TWO FAMILIES MUST SAY SO, IN BOTH.
 *
 * Filing one page in two families is legitimate and the corpus has good cases: ProPublica's
 * workers-comp piece carries a state × year matrix AND three dated cartograms, so it is read once
 * under `heatmap` and once under `paired`. What matters is that somebody DECIDED that.
 *
 * THE DEFECT THIS CLOSES. Fourteen harvests ran in parallel and could not see each other. Five of
 * eleven records one of them reached belonged to a sibling's form, and one was already filed under
 * a byte-identical id — caught only because that agent checked by hand and handed them over. The
 * arithmetic guard cannot help: `two-records-that-agree-exactly-are-both-wrong` exempts same-page
 * pairs BY CONSTRUCTION, because it was written to stop reporting ProPublica's deliberate double
 * filing as the corpus's worst defect.
 *
 * So the exemption that makes the arithmetic guard usable is the hole this one fills. Measured when
 * it was written: ten pages sat in two families and only six of the twenty sides mentioned the
 * other. A duplication nobody declared is a duplication nobody chose.
 *
 * It also protects the evidence floor, which counts PUBLICATIONS: one page cited from two families
 * is still one publication, and a reader who cannot see the second filing cannot see that.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const REFS = join(ROOT, "docs", "design-base", "references");

const dirsIn = (p: string) =>
  existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];

/** Every reference id that appears under more than one family, with the families it appears in. */
function filedTwice(): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  for (const family of dirsIn(REFS))
    for (const id of dirsIn(join(REFS, family))) {
      if (!existsSync(join(REFS, family, id, "measured.json"))) continue;
      seen.set(id, [...(seen.get(id) ?? []), family]);
    }
  return new Map([...seen].filter(([, families]) => families.length > 1));
}

describe("a page filed under more than one family", () => {
  it("should name the other family, in every record of it", () => {
    const findings: string[] = [];
    for (const [id, families] of filedTwice())
      for (const family of families) {
        const notes = join(REFS, family, id, "NOTES.md");
        if (!existsSync(notes)) continue;
        const text = readFileSync(notes, "utf8").toLowerCase();
        const others = families.filter((f) => f !== family);
        if (!others.some((other) => text.includes(other)))
          findings.push(
            `${family}/${id} is also filed under ${others.join(", ")} and its note does not say so`,
          );
      }
    expect(findings).toEqual([]);
  });

  it("should be one publication however many families cite it", () => {
    // Not a rule this test can enforce on prose — it is the reason the rule above exists, and it is
    // stated here so the next reader meets it where the duplication is detected.
    for (const [, families] of filedTwice()) expect(new Set(families).size).toBe(families.length);
  });
});

// twin/skills/twin-doctrine/test/reference-set.test.ts
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { checkReferenceSet } from "../scripts/check-reference-set.mjs";

const GOOD = `| Reference | Moment | Transferable lesson |
| --- | ---: | --- |
| Max Fisher — [America's job market is collapsing](https://example.org/a) | 0:48 | Warm paper field, source under the title, stable timeline. |
`;

describe("checkReferenceSet", () => {
  it("should accept a row carrying a link, a timecode and a lesson", () => {
    expect(checkReferenceSet(GOOD)).toEqual([]);
  });

  it("should reject a row with no link", () => {
    const bad = GOOD.replace(
      "[America's job market is collapsing](https://example.org/a)",
      "some video",
    );
    expect(checkReferenceSet(bad)[0]).toContain("no link");
  });

  it("should reject a row with no timecode", () => {
    const bad = GOOD.replace("| 0:48 |", "|  |");
    expect(checkReferenceSet(bad)[0]).toContain("no timecode");
  });

  it("should reject a lesson shorter than five words", () => {
    const bad = GOOD.replace(
      "Warm paper field, source under the title, stable timeline.",
      "Nice.",
    );
    expect(checkReferenceSet(bad)[0]).toContain("lesson is too thin");
  });

  it("should require at least six references in the shipped file", async () => {
    const shipped = await readFile(
      new URL("../references/reference-set.md", import.meta.url),
      "utf8",
    );
    const rows = shipped
      .split("\n")
      .filter((line) => /^\|/.test(line) && !/^\|\s*-+/.test(line));
    expect(rows.length - 1).toBeGreaterThanOrEqual(6);
    expect(checkReferenceSet(shipped)).toEqual([]);
  });
});

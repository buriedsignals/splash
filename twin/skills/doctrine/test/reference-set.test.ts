// twin/skills/doctrine/test/reference-set.test.ts
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  checkReferenceSet,
  countReferenceRows,
} from "../scripts/check-reference-set.mjs";

const GOOD = `| Argument structure | Reference | Moment | Transferable lesson |
| --- | --- | ---: | --- |
| a long, noisy series read against a historical level | Max Fisher — [America's job market is collapsing](https://example.org/a) | 0:48 | Warm paper field, source under the title, stable timeline. |
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

  it("should reject a row with no locator at all (a published graphic has no timecode, but it still needs one)", () => {
    const bad = GOOD.replace("| 0:48 |", "|  |");
    expect(checkReferenceSet(bad)[0]).toContain("no locator");
  });

  it("should accept a non-timecode locator — a figure number, a panel, a section, a chart title", () => {
    const withFigure = GOOD.replace("| 0:48 |", "| Fig. 3 |");
    expect(checkReferenceSet(withFigure)).toEqual([]);
  });

  it("should reject a moment that merely contains a timecode-shaped fragment inside other text", () => {
    // Anchored: "around 0:48 or so" is prose, not cleanly a timecode, and it is
    // not accepted as a generic locator either, because it read as an attempted
    // (half-formed) timecode the moment it contains a colon at all.
    const bad = GOOD.replace("| 0:48 |", "| around 0:48 or so |");
    expect(checkReferenceSet(bad)[0]).toContain("no locator");
  });

  it("should reject a lesson shorter than five words", () => {
    const bad = GOOD.replace(
      "Warm paper field, source under the title, stable timeline.",
      "Nice.",
    );
    expect(checkReferenceSet(bad)[0]).toContain("lesson is too thin");
  });

  it("should reject a lesson of exactly four words (pins the five-word floor)", () => {
    const bad = GOOD.replace(
      "Warm paper field, source under the title, stable timeline.",
      "Only four words here.",
    );
    expect(checkReferenceSet(bad)[0]).toContain("lesson is too thin");
  });

  it("should not mis-split a lesson that needs a literal pipe", () => {
    // A naive `row.split("|")` treats the escaped "\|" below as an extra column
    // boundary, truncating the lesson to everything before it — "Sixty \" is two
    // words, well under the five-word floor, so a broken split rejects this
    // genuinely substantive (12-word) lesson as "too thin". The pipe is placed
    // early in the sentence deliberately, so a truncation can't coincidentally
    // still clear five words the way a later pipe could.
    const withEscapedPipe = GOOD.replace(
      "Warm paper field, source under the title, stable timeline.",
      "Sixty \\| forty, always shown before any framing claim appears clearly stated.",
    );
    expect(checkReferenceSet(withEscapedPipe)).toEqual([]);
  });

  it("should validate a row even when it is missing its own leading pipe", () => {
    // GFM tables do not require a leading "|". A row-detector that requires one
    // makes a malformed row invisible instead of catching it — the row is
    // skipped from the count and from validation alike.
    const bad = `| Argument structure | Reference | Moment | Transferable lesson |
| --- | --- | ---: | --- |
a long, noisy series read against a historical level | some video without a link | 0:48 | Warm paper field, source under the title, stable timeline. |
`;
    expect(checkReferenceSet(bad)[0]).toContain("no link");
  });

  it("should validate a row even when the table is indented", () => {
    const bad = `| Argument structure | Reference | Moment | Transferable lesson |
| --- | --- | ---: | --- |
  | a long, noisy series read against a historical level | some video without a link | 0:48 | Warm paper field, source under the title, stable timeline. |
`;
    expect(checkReferenceSet(bad)[0]).toContain("no link");
  });

  // The column the file's own opening sentence promised for three rounds and never had: without it
  // the reference loop cannot LOOK a structure UP, it can only read seven long prose cells and
  // judge. A key shorter than the floor is a chart family, not a shape of argument.
  it("should reject a row whose argument structure cell is empty", () => {
    const bad = GOOD.replace(
      "| a long, noisy series read against a historical level |",
      "|  |",
    );
    expect(checkReferenceSet(bad)[0]).toContain("no argument structure");
  });

  it("should reject a structure key too short to be one (pins the 12-character floor)", () => {
    const bad = GOOD.replace(
      "| a long, noisy series read against a historical level |",
      "| ranking |",
    );
    expect(checkReferenceSet(bad)[0]).toContain("no argument structure");
  });

  it("should give every shipped row a distinct argument structure, since the loop looks one up", async () => {
    const shipped = await readFile(
      new URL("../references/reference-set.md", import.meta.url),
      "utf8",
    );
    const structures = shipped
      .split("\n")
      .filter(
        (line) => /^\|/.test(line.trim()) && !/^[\s|:-]+$/.test(line.trim()),
      )
      .slice(1)
      .map((line) => line.split("|")[1].trim());
    expect(structures.length).toBeGreaterThanOrEqual(8);
    expect(new Set(structures).size).toBe(structures.length);
  });

  it("should require at least eight references in the shipped file", async () => {
    // The floor tracks what the file actually ships, not an aspiration — a
    // failing assertion has no signal value once it is permanently red, and a
    // permanently-red test trains everyone to ignore the next real regression.
    // Six was the original target; the set that shipped at four survived
    // three rounds of getting verification wrong, and a fourth round (see
    // reference-set.md's own preamble) added three more rows — each newly
    // verified against its own live pixels and the text beside them — to
    // cover argument structures the four-row set had no answer for. A fifth
    // round added the eighth, for the structure the owner's own run needed
    // and this file had to answer "nothing" to: a total whose majority
    // escapes the subject named in the title. It stayed at seven while the
    // only candidates were NGO reports, which is the floor doing its job.
    // The floor here tracks that honestly-verified reality, eight, so it goes
    // red the moment a row is silently dropped from what is true today —
    // not because it fell short of an aspiration nobody re-affirmed.
    const shipped = await readFile(
      new URL("../references/reference-set.md", import.meta.url),
      "utf8",
    );
    expect(countReferenceRows(shipped)).toBeGreaterThanOrEqual(8);
    expect(checkReferenceSet(shipped)).toEqual([]);
  });
});

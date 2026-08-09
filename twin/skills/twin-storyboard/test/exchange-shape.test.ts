// A PROSE guard, and worth its twenty lines because the defect it pins is a documentation defect
// and the documentation is the only artifact it lives in.
//
// What it pins: the ORDER of the exchange, and the one clause whose removal is the whole of A3.
// `exchange.md`'s hand table used to end question 4 with "Also feeds channel and size" — which is
// not a destination at all but a DECISION taken four movements early, at ③, before the survey at
// ④ had named a single type. The run duly settled genre and size inside a hand question and showed
// the journalist bars three times before asking whether this was a chart. Genre and size are now
// movements ⑥ and ⑦, where the journalist is actually asked; re-add the clause and this reddens.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const EXCHANGE = readFileSync(
  join(import.meta.dirname, "..", "references", "exchange.md"),
  "utf8",
);

const MOVEMENTS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

// The hand table: from its header row to the blank line that ends it.
function handTable(): string[] {
  const lines = EXCHANGE.split(/\r?\n/);
  const header = lines.findIndex((l) =>
    l.startsWith("| The question, as asked |"),
  );
  expect(header).toBeGreaterThan(-1);
  const rows: string[] = [];
  for (let i = header + 2; i < lines.length && lines[i].startsWith("|"); i++)
    rows.push(lines[i]);
  return rows;
}

describe("the exchange keeps its documented order", () => {
  it("should open exactly one heading per movement, ① through ⑩", () => {
    for (const mark of MOVEMENTS) {
      const headings = EXCHANGE.split(/\r?\n/).filter((line) =>
        line.startsWith(`## ${mark}`),
      );
      expect(headings.length).toBe(1);
    }
  });

  it("should place its headings in numerical order", () => {
    const order = EXCHANGE.split(/\r?\n/)
      .filter((line) => /^## [①-⑩]/.test(line))
      .map((line) => MOVEMENTS.indexOf(line.slice(3, 4)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("should ask five hand questions and no more, all of them medium-neutral", () => {
    const rows = handTable();
    expect(rows.length).toBe(5);
    // The four that used to presume a chart, plus credit. What is banned is the clause that
    // DECIDED downstream, not the questions themselves — subject has to stay early, because the
    // survey at ④ and the palette at ⑨ are OF it.
    expect(rows.join("\n")).not.toContain("channel and size");
  });

  it("should keep grounding at the takeaway, not at the proposal", () => {
    const grounding = EXCHANGE.indexOf("grounding");
    const survey = EXCHANGE.indexOf("## ④");
    expect(grounding).toBeGreaterThan(-1);
    expect(grounding).toBeLessThan(survey);
  });

  it("should decide the medium before the genre, and the genre before the size", () => {
    const medium = EXCHANGE.indexOf("## ⑤ The medium");
    const genre = EXCHANGE.indexOf("## ⑥ The genre");
    const size = EXCHANGE.indexOf("## ⑦ The size");
    expect(medium).toBeGreaterThan(-1);
    expect(genre).toBeGreaterThan(medium);
    expect(size).toBeGreaterThan(genre);
  });

  it("should end the reference loop in a question rather than a display", () => {
    const loop = EXCHANGE.slice(
      EXCHANGE.indexOf("## ⑧"),
      EXCHANGE.indexOf("## ⑨"),
    );
    expect(loop).toContain("ends in a real question");
    expect(loop).toContain("reference:");
  });

  it("should forbid drawing a recommendation as a chart before a medium is chosen", () => {
    expect(EXCHANGE).toContain(
      "A recommendation may not be DRAWN as a chart before a chart has been chosen",
    );
  });
});

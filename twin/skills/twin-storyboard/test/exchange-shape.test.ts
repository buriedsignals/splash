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
import { sizeGap } from "../scripts/storyboard.mjs";
import { proposeSizes } from "../scripts/propose.mjs";

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

  // The heading counted FOUR over a table of five, for as long as the five-row table existed. A
  // model reading the heading, asking four and leaving one field empty is refused by both gates
  // with no explanation of which question it skipped -- so the number in the prose is checked
  // against the number of rows, not typed twice and hoped over.
  //
  // RED, in a copy of the tree under /tmp, with the heading restored to "four questions":
  //   error: expect(received).toBe(expected)   Expected: 5   Received: 4
  //   (fail) should count its own hand questions correctly in its heading
  it("should count its own hand questions correctly in its heading", () => {
    const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
    const heading = EXCHANGE.split(/\r?\n/).find((line) => /^## ③/.test(line))!;
    const spelled = WORDS.findIndex((w) => new RegExp(`\\b${w}\\b`, "i").test(heading));
    expect(spelled).toBe(handTable().length);
  });

  // A size value this file tells a model to record must be one the gate ACCEPTS. Movement ⑦ named
  // `fluid` for web and scrolly while `sizeGap` refused exactly that value and refused it without
  // ever naming it -- live, reachable, and it failed in the middle of the journey. So movement ⑦
  // now carries the set as an indented block, and this compares it against `proposeSizes` (what may
  // be offered) AND `sizeGap` (what closes the gate), genre by genre. Prose greps could not do this
  // job: the original defect never wrote the string `size: fluid` at all, it wrote a sentence.
  //
  // RED, in a copy of the tree under /tmp, with `fluid` restored as movement ⑦'s value for web:
  //
  //   error: expect(received).toEqual(expected)
  //   Expected: []            Received: [ "fluid" ]
  //   (fail) should state the same size set the gate enforces, genre by genre
  it("should state the same size set the gate enforces, genre by genre", () => {
    const stated = new Map(
      [...EXCHANGE.matchAll(/^ {4}(static|video|web|scrolly): (.+)$/gm)].map((m) => [
        m[1],
        m[2].trim() === "none" ? [] : m[2].split(",").map((v) => v.trim()),
      ]),
    );
    expect([...stated.keys()].sort()).toEqual(["scrolly", "static", "video", "web"]);
    for (const [genre, sizes] of stated) {
      expect(sizes).toEqual(proposeSizes(genre));
      for (const size of sizes) expect(sizeGap(genre, size, 1)).toBeNull();
      if (sizes.length === 0) expect(sizeGap(genre, undefined, 1)).toBeNull();
    }
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

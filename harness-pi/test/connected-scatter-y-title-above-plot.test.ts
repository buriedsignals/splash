import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// gx-connected-scatter web, Qwen3.5-9B (mvq18): the y title sat in the plot's top-left, "the corner the data leaves
// empty" — for the worked example's data only. Germany (36 %, 16 % of the total) was there, and at 375 px the title,
// held to 44 % of a 257 px cell, wrapped to four lines over its name: a refusal no word in beat.mjs could answer.
const tsx = readFileSync(join(import.meta.dir, "../craft/web/connected-scatter/DirectedConnectedScatterWeb.tsx"), "utf8");
const body = tsx.slice(tsx.indexOf('<div className="overlay"'));
const plot = body.slice(0, body.indexOf("{/* THE SUBJECT'S FIGURE, WHERE THE PLOT CANNOT HOLD IT"));

describe("the connected-scatter web y title", () => {
  it("should not be drawn in the overlay over the cell", () => {
    expect(plot.length > 0 && !plot.includes("{yTitle}")).toBe(true);
  });
  it("should ride the y graduations' column, above the cell", () => {
    const axis = tsx.indexOf('<div className="y-axis"');
    const row = tsx.indexOf('className="y-title"');
    expect(axis > 0 && row > axis && row < tsx.indexOf("<svg", axis) && /bottom: "calc\(100% \+ 4px\)"/.test(tsx.slice(row, row + 300))).toBe(true);
  });
});

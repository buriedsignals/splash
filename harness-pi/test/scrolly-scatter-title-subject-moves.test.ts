import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// gx-connected-scatter scrolly, Qwen3.5-9B (gx-connected-scatter-scrolly-seeded-osaurus-qwen-17948653586): the title
// "France lost 11.8 points of weight" was refused as stating a figure no entity holds, although card 4 writes the
// subject's two moves at its arc. The video kit already counts those moves as drawn; the scrolly kit did not.
const src = readFileSync(join(import.meta.dir, "..", "craft", "scrolly", "connected-scatter", "render-beat.mjs"), "utf8");
const at = src.indexOf("assertHeadlineNumbersDrawn(", src.indexOf("const titleForms"));
const call = src.slice(at, src.indexOf('"entities"', at));

describe("the scrolly connected-scatter title figures", () => {
  it("should count the subject's move along x as drawn", () => {
    expect(call).toContain("Math.abs(reading.subject.dx)");
  });
  it("should count the subject's move along y as drawn", () => {
    expect(call).toContain("Math.abs(reading.subject.dy)");
  });
});

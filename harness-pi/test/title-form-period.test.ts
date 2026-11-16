import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard } from "../craft/_shared/guards.mjs";

// gx-connected-scatter scrolly, Qwen3.5-9B (mvq21, mvq22): the takeaway framed its claim with a period, "between 2000
// and 2024", and every short form that kept 16 and 11.8 was refused for leaving the two years out. A period frames the
// claim; the full form carries it. A single year the claim measures against ("more than in 1990") stays required.
function beatDir(takeaway: string) {
  const root = mkdtempSync(join(tmpdir(), "splash-period-"));
  const dir = join(root, "beats", "1");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, "STORYBOARD.md"), `---\ntakeaway: "${takeaway}"\n---\n`);
  return dir;
}

describe("a shorter title form and the takeaway's period", () => {
  it("should accept a form that drops a span of years the takeaway frames its claim with", () => {
    const dir = beatDir("All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight");
    const b = { title: ["All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight", "All 16 cleaned up at home, France lost 11.8 points of weight"] };
    expect(() => applyStoryboard(b, dir)).not.toThrow();
  });
  it("should still refuse a form that drops the one year the claim measures against", () => {
    const dir = beatDir("Croatia is the only EU country emitting more than in 1990");
    const b = { title: ["Croatia is the only EU country emitting more than in 1990", "Croatia, the only EU country emitting more"] };
    expect(() => applyStoryboard(b, dir)).toThrow(/leaves out 1990/);
  });
  it("should still refuse a form that drops a number of the claim beside the period", () => {
    const dir = beatDir("All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight");
    const b = { title: ["All 16 countries cleaned up their own electricity between 2000 and 2024, yet France lost 11.8 points of weight", "All 16 cleaned up at home, France lost weight"] };
    expect(() => applyStoryboard(b, dir)).toThrow(/leaves out 11.8/);
  });
});

import { describe, expect, it } from "bun:test";
import { mergeDots } from "../craft/_shared/dot-merge.mjs";

// gx-dot-density web (Qwen3.5-9B, mvq61): 8 900 dots drawn as one <circle> each, in every state of the page, never
// finished painting between two frames, and verify-web refused the page five times for a motion the model never wrote.
describe("mergeDots", () => {
  const dots = Array.from({ length: 3000 }, (_, i) => ({ x: i % 100, y: Math.floor(i / 100), key: i % 3 === 0 ? "Nuclear" : "Wind" }));
  const styleOf = (d: { key: string }) => (d.key === "Nuclear" ? { fill: "#000", r: 1.6 } : { fill: "#999", r: 1.1 });

  it("should draw one shape per group and style, however many dots there are", () => {
    expect(mergeDots(dots, styleOf).length).toBe(2);
  });

  it("should keep every dot of a group in its shape", () => {
    const nuclear = mergeDots(dots, styleOf).find((g) => g.key === "Nuclear")!;
    expect(nuclear.d.match(/M/g)!.length).toBe(1000);
  });

  it("should draw each dot as a closed circle of its style's radius", () => {
    const [g] = mergeDots([{ x: 10, y: 20, key: "A" }], () => ({ fill: "#000", r: 2 }));
    expect(g.d).toBe("M8.0 20.0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z");
  });
});

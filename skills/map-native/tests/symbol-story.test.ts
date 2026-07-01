import { describe, it, expect } from "bun:test";
import { deriveSymbolStory, DEFAULT_MAX_REVEALS } from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";

const pts: SymbolPoint[] = [
  { lon: 0, lat: 51, value: 300, label: "London", radius: 40 },
  { lon: 2, lat: 48, value: 200, label: "Paris", radius: 30 },
  { lon: 13, lat: 52, value: 150, label: "Berlin", radius: 25 },
  { lon: 12, lat: 41, value: 120, label: "Rome", radius: 22 },
  { lon: -3, lat: 40, value: 90, label: "Madrid", radius: 18 },
  { lon: 4, lat: 50, value: 60, label: "Brussels", radius: 14 },
];
const meta = { title: "Tech funding", insight: "London leads", unit: "$bn" };

describe("deriveSymbolStory maxReveals", () => {
  it("emits exactly maxReveals reveal beats, the top-N by value descending", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 3 });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(3);
    expect(reveals.map((b) => b.highlight[0])).toEqual([
      "London",
      "Paris",
      "Berlin",
    ]);
  });
  it("defaults to DEFAULT_MAX_REVEALS when no cap is given", () => {
    const beats = deriveSymbolStory(pts, meta);
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(
      DEFAULT_MAX_REVEALS,
    );
  });
  it("clamps to the number of points when fewer than maxReveals", () => {
    const beats = deriveSymbolStory(pts.slice(0, 2), meta, { maxReveals: 5 });
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(2);
  });
  it("opens title/establish and closes takeaway, each reveal callout carries the unit", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 2 });
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    for (const b of beats.filter((x) => x.kind === "reveal")) {
      expect(b.callout?.value.includes("$bn")).toBe(true);
    }
  });
});

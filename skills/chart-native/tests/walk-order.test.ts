import { describe, it, expect } from "bun:test";
import { walkPositions } from "../src/core/walk";

// ---------------------------------------------------------------------------
// SUB-PROJECT ④ — the chart track's VIDEO learns the journalist's order.
//
// A bar video's bars enter in READING order (BarChart's `stagger(p, i, …)`), whatever the
// journalist's confirmed walk says. So a walk they wrote and validated changed nothing on
// screen — the same defect the map reveals had, one engine over.
//
// This is the pure half: given the chart's own anchor values and the walk, which POSITION does
// each subject enter at. No walk means the position IS the index, so a chart nobody wrote a
// storyboard for renders byte-identically.
// ---------------------------------------------------------------------------
describe("walkPositions — the order subjects enter in", () => {
  const CATS = ["Genève", "Zug", "Zurich", "Vaud", "Jura"];

  it("with no walk, the position IS the index — not a frame moves", () => {
    expect(walkPositions(CATS, undefined)).toEqual([0, 1, 2, 3, 4]);
    expect(walkPositions(CATS, [])).toEqual([0, 1, 2, 3, 4]);
  });

  it("puts the walk's subjects first, in the walk's own order", () => {
    const pos = walkPositions(CATS, [
      { category: "Jura", role: "establish", text: "" },
      { category: "Zurich", role: "payoff", text: "" },
    ]);
    expect(pos[CATS.indexOf("Jura")]).toBe(0);
    expect(pos[CATS.indexOf("Zurich")]).toBe(1);
  });

  it("subjects the walk does not name come AFTER it, keeping their own order", () => {
    const pos = walkPositions(CATS, [
      { category: "Jura", role: "establish", text: "" },
      { category: "Zurich", role: "payoff", text: "" },
    ]);
    const rest = CATS.map((c, i) => ({ c, p: pos[i]! })).filter(
      (e) => !["Jura", "Zurich"].includes(e.c),
    );
    for (const e of rest) expect(e.p).toBeGreaterThanOrEqual(2);
    // …and among themselves, still in data order.
    const byPos = [...rest].sort((a, b) => a.p - b.p).map((e) => e.c);
    expect(byPos).toEqual(["Genève", "Zug", "Vaud"]);
  });

  it("is a permutation — every position used once, so no subject is starved or doubled", () => {
    const pos = walkPositions(CATS, [
      { category: "Vaud", role: "establish", text: "" },
      { category: "Genève", role: "payoff", text: "" },
    ]);
    expect([...pos].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("ignores a walk anchor the chart does not carry, rather than shifting everything", () => {
    const pos = walkPositions(CATS, [
      { category: "Atlantide", role: "establish", text: "" },
      { category: "Jura", role: "payoff", text: "" },
    ]);
    expect(pos[CATS.indexOf("Jura")]).toBe(0);
    expect([...pos].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("reads an `x` anchor too — a line's walk uses the x column", () => {
    const pos = walkPositions(["1979", "2007", "2025"], [
      { x: "2025", role: "establish", text: "" },
    ]);
    expect(pos[2]).toBe(0);
  });
});

it("stays a permutation when the walk names the same subject twice", () => {
  // Legal: a scrolly walk may return to a point it already visited.
  const CATS = ["A", "B", "C"];
  const pos = walkPositions(CATS, [
    { category: "C", role: "establish", text: "" },
    { category: "A", role: "build", text: "" },
    { category: "C", role: "payoff", text: "" },
  ] as never);
  expect([...pos].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  expect(pos[2]).toBe(0); // first mention wins — where the reader meets it
});

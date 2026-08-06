import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, test, expect } from "bun:test";
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

// ---------------------------------------------------------------------------
// WHICH BEAT IS ON SCREEN — sub-project ① (2026-08-06). A bar video honours the walk's ORDER
// since 2026-08-04, but shows none of its WORDS: the journalist writes five sentences, validates
// them, and the video displays nothing. This is the half that answers "which sentence now".
//
// It reads the SAME schedule BarChart drives its bars from. A second set of windows would be a
// second clock, and a second clock is a caption sitting over the wrong bar — the defect
// route-story.ts documents at length and this repo has already paid for once.
// ---------------------------------------------------------------------------
import { activeBeatAt, BAR_ENTRANCE } from "../src/core/walk";
import { stagger } from "../src/core/math";

describe("activeBeatAt — the beat a caption names", () => {
  const N = 4;
  const order = [0, 1, 2, 3];

  it("names beat 0 before anything else has begun", () => {
    expect(activeBeatAt(0, order, N)).toBe(0);
    expect(activeBeatAt(BAR_ENTRANCE.start, order, N)).toBe(0);
  });

  it("names the beat whose bar is entering, at the moment it enters", () => {
    for (const i of [1, 2, 3]) {
      // The instant this subject's window opens, plus a hair.
      const p = BAR_ENTRANCE.start + i * (BAR_ENTRANCE.step(N) as number) + 1e-4;
      expect(activeBeatAt(p, order, N)).toBe(i);
    }
  });

  it("walks forward through every beat, in order, skipping none", () => {
    const seen: number[] = [];
    for (let s = 0; s <= 1000; s++) {
      const i = activeBeatAt(s / 1000, order, N);
      if (seen[seen.length - 1] !== i) seen.push(i);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it("follows the JOURNALIST'S order, not the data's", () => {
    // Walk runs last-to-first: the last row is beat 0, so it is named first.
    const reversed = [3, 2, 1, 0];
    const p = BAR_ENTRANCE.start + 1e-4;
    // Subject 3 sits at position 0 in the walk, so IT is the one entering first.
    expect(activeBeatAt(p, reversed, N)).toBe(3);
  });

  it("agrees with the bars: the named subject is the one actually growing", () => {
    for (const p of [0.25, 0.4, 0.55, 0.7]) {
      const named = activeBeatAt(p, order, N);
      const growth = order.map((pos) =>
        stagger(p, pos, N, BAR_ENTRANCE.start, BAR_ENTRANCE.step(N), BAR_ENTRANCE.span),
      );
      // Nobody after the named subject has started growing.
      for (let i = named + 1; i < N; i++) expect(growth[i]).toBeLessThanOrEqual(0);
    }
  });

  it("stays inside the walk when there is none, rather than answering -1", () => {
    expect(activeBeatAt(0.5, [], 0)).toBe(-1);
  });
});

// ONE CLOCK, pinned. `activeBeatAt` answers "which sentence now" from BAR_ENTRANCE; BarChart
// grows its bars from the same constant. If either re-inlines the literals, the caption and the
// bars drift apart silently — a sentence over the wrong bar, which is the whole failure mode this
// helper exists to prevent.
test("BarChart drives its entrance from the shared schedule, not from its own literals", () => {
  const src = readFileSync(
    join(import.meta.dir, "..", "src", "BarChart.tsx"),
    "utf8",
  );
  expect(src).toContain("BAR_ENTRANCE.start");
  expect(src).toContain("BAR_ENTRANCE.step(n)");
  expect(src).toContain("BAR_ENTRANCE.span");
  // …and the literals it used to carry are gone, so there is nothing to drift back to.
  expect(src).not.toMatch(/stagger\(\s*p,\s*entryOrder\[i\] \?\? i,\s*n,\s*0\.18/);
});

// ★ THE SCHEDULE ITSELF, pinned to LITERALS — and this test exists because its absence was
// caught by a mutation that should have bitten and did not. Every other test in this file
// computes its expectations FROM BAR_ENTRANCE, so they all move with it: changing `start` from
// 0.18 to 0.40 left fourteen tests green while every bar in every bar video entered late.
//
// A test that derives its expectation from the thing it is testing cannot fail. This one can:
// the numbers are written down, so changing the schedule is a deliberate, visible edit to a
// value two readers depend on (BarChart's bars and the caption that names them).
test("the bar entrance schedule is exactly these numbers", () => {
  expect(BAR_ENTRANCE.start).toBe(0.18);
  expect(BAR_ENTRANCE.span).toBe(0.35);
  // step is per-count: five bars share the same half of the timeline the two-bar case does.
  expect(BAR_ENTRANCE.step(5)).toBeCloseTo(0.1, 10);
  expect(BAR_ENTRANCE.step(2)).toBeCloseTo(0.25, 10);
  // …and EVERY subject is visually complete on the final frame. Asserted on the rendered
  // growth, not on the raw window: at 20 bars the last window closes at 1.005, so a
  // window-arithmetic assertion fails while the bar is in fact full — easeOutCubic's tail is
  // flat, and what a reader sees is the only thing worth pinning here.
  for (const n of [2, 4, 8, 20])
    for (let i = 0; i < n; i++)
      expect(
        stagger(
          1,
          i,
          n,
          BAR_ENTRANCE.start,
          BAR_ENTRANCE.step(n),
          BAR_ENTRANCE.span,
        ),
      ).toBeGreaterThan(0.999);
});

import { describe, it, expect } from "bun:test";
import { checkChordConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/chord.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const colors = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
];

describe("the shipped chord is conformant (global ++ chord)", () => {
  it("passes with zero violations (square matrix, 5 entities, CVD-safe)", () => {
    const v = checkChordConformance(
      {
        title: sample.title,
        source: sample.source,
        matrix: sample.matrix,
        labels: sample.labels,
        entityColors: colors,
      },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags a non-square matrix", () => {
    const v = checkChordConformance(
      {
        title: sample.title,
        source: sample.source,
        matrix: [
          [0, 1, 2],
          [1, 0, 3],
        ],
        labels: ["A", "B"],
        entityColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("square"))).toBe(true);
  });

  it("flags more than 8 entities", () => {
    const labels = Array.from({ length: 9 }, (_, i) => `E${i}`);
    const matrix = labels.map(() => labels.map(() => 1));
    const v = checkChordConformance(
      {
        title: sample.title,
        source: sample.source,
        matrix,
        labels,
        entityColors: colors,
      },
      text,
    );
    expect(v.some((m) => m.includes("> 8"))).toBe(true);
  });

  it("flags an off-palette entity colour", () => {
    const v = checkChordConformance(
      {
        title: sample.title,
        source: sample.source,
        matrix: sample.matrix,
        labels: sample.labels,
        entityColors: [...colors, "#123456"],
      },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});

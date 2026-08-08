import { describe, it, expect } from "bun:test";
import { checkPictogramConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/pictogram.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const base = {
  title: sample.title,
  source: sample.source,
  iconColor: OKABE_ITO.blue,
  unitPerIcon: sample.unitPerIcon,
  unitStated: true,
  // the row counts the shipped sample actually renders — 8.4, 5.6, 3.8, 2.2, 0.9 icons
  rows: sample.rows.map((r) => ({
    label: String(r.district),
    count: Number(r.residents) / sample.unitPerIcon,
  })),
};

describe("the shipped pictogram is conformant (global ++ pictogram)", () => {
  it("passes with zero violations (CVD-safe icon, unit stated)", () => {
    expect(checkPictogramConformance(base, text)).toEqual([]);
  });

  it("flags an unstated unit (count undecodable)", () => {
    const v = checkPictogramConformance({ ...base, unitStated: false }, text);
    expect(v.some((m) => m.includes("each icon = N"))).toBe(true);
  });

  it("flags a non-positive unit-per-icon", () => {
    const v = checkPictogramConformance({ ...base, unitPerIcon: 0 }, text);
    expect(v.some((m) => m.includes("positive unit-per-icon"))).toBe(true);
  });

  it("flags an off-palette icon colour", () => {
    const v = checkPictogramConformance(
      { ...base, iconColor: "#123456" },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});

// ── countability: the two ways a pictogram stops being one ───────────────────
// The type's whole claim is "verify by counting". Two data shapes silently void it, and
// both were live in the shipped geometry before this guard: a row longer than a reader
// will ever count, and a row whose real, positive value draws no icon at all. The KB sheet
// tells a journalist to reach for a bar in those cases; this is what makes the advice
// binding instead of advisory.
const rowsOf = (counts: number[]) =>
  counts.map((count, i) => ({ label: `Row ${i + 1}`, count }));

describe("countability guard — a count no one can count is not a pictogram", () => {
  it("passes a row count inside the ceiling", () => {
    const v = checkPictogramConformance(
      { ...base, rows: rowsOf([8.4, 5.6, 0.9]) },
      text,
    );
    expect(v).toEqual([]);
  });

  it("flags the row a reader would have to count past the ceiling", () => {
    // the defect's own number: 380 icons on one row, rendered ~2 px each.
    const v = checkPictogramConformance(
      { ...base, rows: rowsOf([380, 12]) },
      text,
    );
    expect(v.some((m) => /Row 1/.test(m) && /380/.test(m))).toBe(true);
    expect(v.some((m) => /count/.test(m))).toBe(true);
  });

  it("flags a positive value that draws no icon (a real quantity rendered as zero)", () => {
    const v = checkPictogramConformance(
      { ...base, rows: rowsOf([9, 0.004]) },
      text,
    );
    expect(v.some((m) => /Row 2/.test(m))).toBe(true);
  });

  it("a genuine zero is not a violation — no icons IS the honest drawing of none", () => {
    const v = checkPictogramConformance(
      { ...base, rows: rowsOf([9, 0]) },
      text,
    );
    expect(v).toEqual([]);
  });
});

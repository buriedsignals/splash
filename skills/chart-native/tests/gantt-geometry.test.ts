import { describe, it, expect } from "bun:test";
import {
  computeGanttLayout,
  growGanttBar,
  type GanttData,
} from "../src/gantt-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 120 },
};

const data: GanttData = {
  items: [
    { label: "Design", start: "2023-01", end: "2023-06", category: "Plan" },
    { label: "Build", start: "2023-06", end: "2024-09", category: "Deliver" },
    { label: "Survey", start: "2022-10", end: "2023-02", category: "Plan" },
  ],
};

// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed;
// `git checkout --` restored between them):
//   - dropping `endOfGrain` from the end parse (an end date closing at the FIRST instant of
//     the month it names) → "reads an end date as the END of the period it names" FAILS.
//   - changing the end<start refusal to a silent swap → "refuses an interval that ends
//     before it starts, naming the row" FAILS.
//   - taking the label out of that error message → the same test FAILS on the /Survey/ match.
//   - accepting "03/04/2024" (routing the parse through Date.parse) → "refuses an ambiguous
//     numeric date rather than picking a reading" FAILS.
//   - hardcoding the tick format back to d3's "%b %Y" → "labels the time axis in the
//     deliverable's language" FAILS on the French month.

describe("computeGanttLayout", () => {
  it("orders rows by start date (top → bottom)", () => {
    const l = computeGanttLayout(data, dims);
    expect(l.bars.map((b) => b.label)).toEqual(["Survey", "Design", "Build"]);
  });

  it("makes bar width proportional to duration", () => {
    const l = computeGanttLayout(data, dims);
    const design = l.bars.find((b) => b.label === "Design")!; // ~6 months
    const build = l.bars.find((b) => b.label === "Build")!; // ~16 months
    expect(build.x1 - build.x0).toBeGreaterThan(design.x1 - design.x0);
  });

  it("keeps every bar inside the plot", () => {
    const l = computeGanttLayout(data, dims);
    for (const b of l.bars) {
      expect(b.x0).toBeGreaterThanOrEqual(-0.5);
      expect(b.x1).toBeLessThanOrEqual(l.innerWidth + 0.5);
    }
  });

  it("reads an end date as the END of the period it names", () => {
    // "2023-01" → "2023-01" is ONE MONTH of work, not an instant. Closing the bar at the
    // first of the month it names would draw it zero-wide.
    const l = computeGanttLayout(
      { items: [{ label: "X", start: "2023-01", end: "2023-01" }] },
      dims,
    );
    expect(l.bars[0].durationDays).toBe(31);
    expect(l.bars[0].x1).toBeGreaterThan(l.bars[0].x0);
    // and a "through June" end really reaches 1 July
    expect(l.domainMs[1]).toBe(Date.UTC(2023, 1, 1));
  });

  it("refuses an interval that ends before it starts, naming the row", () => {
    expect(() =>
      computeGanttLayout(
        {
          items: [
            { label: "Design", start: "2023-01", end: "2023-06" },
            { label: "Survey", start: "2023-06", end: "2023-01" },
          ],
        },
        dims,
      ),
    ).toThrow(/Survey/);
    expect(() =>
      computeGanttLayout(
        { items: [{ label: "Survey", start: "2023-06", end: "2023-01" }] },
        dims,
      ),
    ).toThrow(/ends before it starts/);
  });

  it("names the row AND the field when a date cannot be read", () => {
    expect(() =>
      computeGanttLayout(
        { items: [{ label: "Land acquisition", start: "soon", end: "2023" }] },
        dims,
      ),
    ).toThrow(/Land acquisition/);
  });

  it("refuses an ambiguous numeric date rather than picking a reading", () => {
    // "03/04/2024" is two different days in the four languages splash ships.
    expect(() =>
      computeGanttLayout(
        { items: [{ label: "X", start: "03/04/2024", end: "2024-12" }] },
        dims,
      ),
    ).toThrow(/YYYY-MM-DD/);
  });

  it("labels the time axis in the deliverable's language, month by NAME", () => {
    // A span under three years labels by month; the month is a NAME so "03/04" can never be
    // read as two different days.
    const short: GanttData = {
      items: [
        { label: "A", start: "2023-01", end: "2023-04" },
        { label: "B", start: "2023-02", end: "2023-06" },
      ],
    };
    const en = computeGanttLayout(short, dims);
    const fr = computeGanttLayout(short, dims, { lang: "fr" });
    expect(en.timeTicks.some((t) => /Feb|Mar|Apr/.test(t.label))).toBe(true);
    expect(fr.timeTicks.some((t) => /févr\.|mars|avr\./.test(t.label))).toBe(
      true,
    );
    for (const t of fr.timeTicks) expect(t.label).not.toMatch(/Feb|Apr|Dec/);
  });

  it("labels a multi-year span by year, identically in every language", () => {
    const long: GanttData = {
      items: [
        { label: "A", start: "2015", end: "2020" },
        { label: "B", start: "2018", end: "2026" },
      ],
    };
    const en = computeGanttLayout(long, dims);
    const de = computeGanttLayout(long, dims, { lang: "de" });
    expect(en.timeTicks.map((t) => t.label)).toEqual(
      de.timeTicks.map((t) => t.label),
    );
    for (const t of en.timeTicks) expect(t.label).toMatch(/^\d{4}$/);
  });
});

describe("growGanttBar — grows from the start", () => {
  it("has zero width at progress 0 and full width at progress 1", () => {
    const l = computeGanttLayout(data, dims);
    const b = l.bars[0];
    expect(growGanttBar(b, 0)).toBeCloseTo(b.x0, 5);
    expect(growGanttBar(b, 1)).toBeCloseTo(b.x1, 5);
  });
});

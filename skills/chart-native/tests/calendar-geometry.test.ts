import { describe, it, expect } from "bun:test";
import {
  computeCalendarLayout,
  type CalendarData,
} from "../src/calendar-geometry";

const dims = {
  width: 800,
  height: 300,
  padding: { top: 30, right: 20, bottom: 30, left: 40 },
};

// 70 consecutive days from a Monday (2024-01-01 is a Monday)
const data: CalendarData = {
  unit: "events",
  days: Array.from({ length: 70 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1) + i * 864e5);
    return { date: d.toISOString().slice(0, 10), value: i % 10 };
  }),
};

describe("computeCalendarLayout", () => {
  it("places one cell per day", () => {
    const l = computeCalendarLayout(data, dims);
    expect(l.cells).toHaveLength(70);
  });

  it("puts Monday on row 0 and Sunday on row 6", () => {
    const l = computeCalendarLayout(data, dims);
    const jan1 = l.cells.find((c) => c.date === "2024-01-01")!; // a Monday
    const jan7 = l.cells.find((c) => c.date === "2024-01-07")!; // the Sunday
    expect(jan1.row).toBe(0);
    expect(jan7.row).toBe(6);
  });

  it("advances the column each new week", () => {
    const l = computeCalendarLayout(data, dims);
    const jan1 = l.cells.find((c) => c.date === "2024-01-01")!;
    const jan8 = l.cells.find((c) => c.date === "2024-01-08")!; // next Monday
    expect(jan8.col).toBe(jan1.col + 1);
  });

  it("colours by value on a monotonic-luminance ramp (more = darker)", () => {
    const l = computeCalendarLayout(data, dims);
    const lowCell = l.cells.reduce((a, b) => (a.value < b.value ? a : b));
    const highCell = l.cells.reduce((a, b) => (a.value > b.value ? a : b));
    expect(lowCell.color).not.toBe(highCell.color);
  });

  it("keeps every cell inside the plot", () => {
    const l = computeCalendarLayout(data, dims);
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(-0.5);
      expect(c.y).toBeGreaterThanOrEqual(-0.5);
      expect(c.x + c.w).toBeLessThanOrEqual(dims.width + 0.5);
      expect(c.y + c.h).toBeLessThanOrEqual(dims.height + 0.5);
    }
  });

  it("throws with fewer than 2 days", () => {
    expect(() =>
      computeCalendarLayout(
        { unit: "x", days: [{ date: "2024-01-01", value: 1 }] },
        dims,
      ),
    ).toThrow(/≥ 2 days/);
  });
});

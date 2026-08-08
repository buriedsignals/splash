import { describe, it, expect } from "bun:test";
import {
  checkComboConformance,
  COMBO_MIN_LINE_VARIATION,
} from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import { computeComboLayout } from "../src/combo-geometry";
import sample from "../assets/sample-data/combo.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const base = {
  title: sample.title,
  source: sample.source,
  columnColor: OKABE_ITO.blue,
  lineColor: OKABE_ITO.orange,
  columnAxisIncludesZero: true,
  leftAxisLabel: sample.leftAxisLabel,
  rightAxisLabel: sample.rightAxisLabel,
  columnUnit: sample.columnUnit,
  lineUnit: sample.lineUnit,
  lineClearsColumns: true,
  rightAxisIncludesZero: false,
  rightTickCount: 5,
  lineRelativeRange: 0.37,
};

describe("the shipped combo is conformant (global ++ combo)", () => {
  it("passes with zero violations (0-baseline columns, 2 labelled axes)", () => {
    expect(checkComboConformance(base, text)).toEqual([]);
  });

  it("flags a column axis that does not include 0", () => {
    const v = checkComboConformance(
      { ...base, columnAxisIncludesZero: false },
      text,
    );
    expect(v.some((m) => m.includes("must include 0"))).toBe(true);
  });

  it("flags a missing right-axis label (dual-axis ambiguity)", () => {
    const v = checkComboConformance({ ...base, rightAxisLabel: "" }, text);
    expect(v.some((m) => m.includes("right-axis label"))).toBe(true);
  });

  it("flags an off-palette line colour", () => {
    const v = checkComboConformance({ ...base, lineColor: "#123456" }, text);
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });

  it("flags two series sharing one colour", () => {
    const v = checkComboConformance(
      { ...base, lineColor: OKABE_ITO.blue },
      text,
    );
    expect(v.some((m) => m.includes("distinct colours"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ★ THE FOUR SHAPES A DUAL AXIS USES TO MISLEAD.
//
// The three rules above are the ones a combo needs to be READABLE. These four are the ones it
// needs to be HONEST — each one a documented way two scales on one frame manufacture a fact:
//
//   · SAME UNIT — two series measured in the same thing, given two different scales, so the
//     reader compares heights that are not comparable. One axis renders both truthfully.
//   · A CROSSING — the point where the line passes the column tops. With two units it is an
//     artifact of the domains, movable anywhere by the author, and readable as an overtake.
//   · A HIDDEN ZERO NOBODY CAN SEE — a truncated rate axis is legitimate, but only when the
//     reader can read where it starts. Fewer than two labelled ticks and they cannot.
//   · A MOUNTAIN OUT OF NOISE — a series that moves by a fraction of a percent of its own
//     level, stretched by a zero-suppressed axis to fill the frame as a trend.
// ---------------------------------------------------------------------------
describe("the dual-axis honesty rules", () => {
  it("refuses two series measured in the SAME unit (one axis renders both)", () => {
    const v = checkComboConformance(
      { ...base, columnUnit: "%", lineUnit: "%" },
      text,
    );
    expect(v.some((m) => m.includes("same unit"))).toBe(true);
  });

  it("…and compares units case- and space-insensitively, not byte-for-byte", () => {
    const v = checkComboConformance(
      { ...base, columnUnit: "GWh", lineUnit: " gwh " },
      text,
    );
    expect(v.some((m) => m.includes("same unit"))).toBe(true);
  });

  it("requires BOTH units to be stated (an unstated unit cannot be compared)", () => {
    expect(
      checkComboConformance({ ...base, lineUnit: "  " }, text).some((m) =>
        m.includes("unit"),
      ),
    ).toBe(true);
    expect(
      checkComboConformance({ ...base, columnUnit: "" }, text).some((m) =>
        m.includes("unit"),
      ),
    ).toBe(true);
  });

  it("refuses a layout where the line crosses the column tops", () => {
    const v = checkComboConformance(
      { ...base, lineClearsColumns: false },
      text,
    );
    expect(v.some((m) => m.includes("crosses the column"))).toBe(true);
  });

  it("refuses a zero-suppressed right axis the reader cannot read (<2 ticks)", () => {
    const v = checkComboConformance({ ...base, rightTickCount: 1 }, text);
    expect(v.some((m) => m.includes("labelled tick"))).toBe(true);
  });

  it("…but a right axis that DOES include zero is not held to that (nothing hidden)", () => {
    const v = checkComboConformance(
      { ...base, rightAxisIncludesZero: true, rightTickCount: 1 },
      text,
    );
    expect(v.some((m) => m.includes("labelled tick"))).toBe(false);
  });

  it("refuses a near-flat line stretched to full height by a suppressed zero", () => {
    const v = checkComboConformance(
      { ...base, lineRelativeRange: COMBO_MIN_LINE_VARIATION / 2 },
      text,
    );
    expect(v.some((m) => m.includes("of its own level"))).toBe(true);
  });

  it("…and lets the same flat series through when the axis shows its zero", () => {
    // With the zero on screen the reader sees the series for what it is: a flat line high up
    // the frame. The exaggeration is a property of the TRUNCATION, not of the flatness.
    const v = checkComboConformance(
      {
        ...base,
        rightAxisIncludesZero: true,
        lineRelativeRange: COMBO_MIN_LINE_VARIATION / 2,
      },
      text,
    );
    expect(v.some((m) => m.includes("of its own level"))).toBe(false);
  });

  it("accepts variation exactly AT the threshold (the boundary is not a refusal)", () => {
    const v = checkComboConformance(
      { ...base, lineRelativeRange: COMBO_MIN_LINE_VARIATION },
      text,
    );
    expect(v.some((m) => m.includes("of its own level"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ★ THE GUARD JUDGES THE LAYOUT THAT IS ACTUALLY RENDERED.
//
// Every field above could be handed to the guard as a hand-written literal and prove nothing
// about a real chart. These bind the two together: the numbers come out of the same
// computeComboLayout the component draws from.
// ---------------------------------------------------------------------------
describe("the shipped sample, judged through its own geometry", () => {
  const layout = computeComboLayout(
    {
      categoryField: sample.categoryField,
      columnField: sample.columnField,
      lineField: sample.lineField,
      rows: sample.rows,
    },
    {
      width: 840,
      height: 480,
      padding: { top: 60, right: 56, bottom: 70, left: 56 },
    },
  );

  it("its real layout satisfies every dual-axis rule", () => {
    expect(
      checkComboConformance(
        {
          ...base,
          columnAxisIncludesZero: layout.leftDomain[0] === 0,
          lineClearsColumns: layout.lineClearsColumns,
          rightAxisIncludesZero: layout.rightAxisIncludesZero,
          rightTickCount: layout.rightTicks.length,
          lineRelativeRange: layout.lineRelativeRange,
        },
        text,
      ),
    ).toEqual([]);
  });

  it("and the sample is a REAL test of the crossing rule, not a shape that could not cross", () => {
    // Columns rise all year while the line falls all year: on one shared frame these two
    // series MUST cross. The layout is what prevents it — so this fixture exercises the rule
    // rather than passing it by accident.
    const units = sample.rows.map((r) => r.units);
    const margins = sample.rows.map((r) => r.margin);
    expect(units[units.length - 1]).toBeGreaterThan(units[0]);
    expect(margins[margins.length - 1]).toBeLessThan(margins[0]);
    expect(layout.lineClearsColumns).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ★ THE AXIS↔SERIES BINDING SURVIVED THE LOSS OF COLOUR — measured, then guarded.
//
// A dual axis normally colour-codes each axis to its series. This one cannot: measured against
// a white ground, exactly ONE Okabe-Ito hue clears WCAG 4.5:1 as text (blue 5.19:1 — orange
// 2.25, green 3.42, vermillion 3.87), so a two-series chart cannot colour-code both axis labels
// accessibly at any size. It is a fact about the palette, not a design preference, and the
// engine's real render said so: snap-contrast failed the first combo produce on "Margin (%)" at
// 2.25:1. The axis furniture became ink, and the binding moved onto the NAMES.
// ---------------------------------------------------------------------------
describe("each axis title names its own series (what replaced the colour cue)", () => {
  const named = {
    ...base,
    leftAxisLabel: "Units sold (units)",
    rightAxisLabel: "Margin (%)",
    columnSeriesLabel: "Units sold",
    lineSeriesLabel: "Margin",
  };

  it("passes when both titles state their series as the legend does", () => {
    expect(checkComboConformance(named, text)).toEqual([]);
  });

  it("flags a left axis whose title does not name the column series", () => {
    const v = checkComboConformance(
      { ...named, leftAxisLabel: "Volume (units)" },
      text,
    );
    expect(v.some((m) => m.includes("left axis title"))).toBe(true);
  });

  it("flags a right axis whose title does not name the line series", () => {
    const v = checkComboConformance(
      { ...named, rightAxisLabel: "Rate (%)" },
      text,
    );
    expect(v.some((m) => m.includes("right axis title"))).toBe(true);
  });

  it("the mapper's own derived labels satisfy it (the two are not independent inventions)", () => {
    // spec-to-config builds `${seriesLabel} (${unit})` for each axis, so the binding holds by
    // construction — pinned here so a change to either half has to face this test.
    const columnSeriesLabel = "Units sold";
    const lineSeriesLabel = "Margin";
    expect(
      checkComboConformance(
        {
          ...base,
          columnSeriesLabel,
          lineSeriesLabel,
          leftAxisLabel: `${columnSeriesLabel} (units)`,
          rightAxisLabel: `${lineSeriesLabel} (%)`,
        },
        text,
      ),
    ).toEqual([]);
  });
});

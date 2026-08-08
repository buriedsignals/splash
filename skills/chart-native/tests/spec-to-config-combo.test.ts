import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { ShapeMismatchError } from "../src/shape-validation";
import { computeComboLayout } from "../src/combo-geometry";

const base = {
  title: "Sales climbed all year while the margin slipped",
  source: { name: "Company accounts", url: "https://example.org/accounts" },
  unit: "monthly units sold vs gross margin",
};

const DATA = "month,units,margin\nJan,1850,31.4\nJun,2910,26.8\nDec,4310,19.7";

// ---------------------------------------------------------------------------
// ★ THE DECISION THE DEFERRAL WAS ABOUT: which series is the LINE and which the COLUMNS.
//
// combo was deferred as "family-B: per-series encoding choice" — not for want of a data shape
// but for want of a decision. Two numeric columns arrive; one will be drawn as length from a
// zero baseline and the other as position on a scale that hides its zero. Get it backwards and
// the chart says the opposite of the truth: a rate drawn as column length implies a magnitude
// it does not have, and a count on a truncated axis hides the zero that gives it meaning.
//
// The rule, in order:
//   1. THE SPEC SAYS SO — `comboLine` names the column to draw as the line. Always wins.
//   2. ONE UNAMBIGUOUS, LANGUAGE-FREE MARKER — exactly one of the two headers carries `%`.
//      A percent SYMBOL in a header is a declared unit, not prose, and it means the same thing
//      in every language this engine ships (fr/de/it/en). A count is never written "%".
//   3. OTHERWISE, REFUSE AND ASK — by name, at the gate, before anything is produced.
//
// There is deliberately NO third heuristic (magnitude separation, integer-ness, header words).
// Each of those is wrong often enough to invert a chart silently, and a silent inversion is
// exactly the defect this type was held back for.
// ---------------------------------------------------------------------------
describe("specToNativeConfig — combo: which series is the line", () => {
  it("1. an explicit `comboLine` wins, and the OTHER numeric series becomes the columns", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: DATA,
      comboLine: "margin",
      comboColumnUnit: "units",
      comboLineUnit: "%",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("combo");
    expect(config.categoryField).toBe("month");
    expect(config.columnField).toBe("units");
    expect(config.lineField).toBe("margin");
  });

  it("1b. …including when it names the FIRST numeric column (no positional assumption)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: DATA,
      comboLine: "units",
      comboColumnUnit: "%",
      comboLineUnit: "units",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.lineField).toBe("units");
    expect(config.columnField).toBe("margin");
  });

  it("2. with no `comboLine`, a single `%`-marked header is the line", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: "month,units,margin %\nJan,1850,31.4\nDec,4310,19.7",
      comboColumnUnit: "units",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.lineField).toBe("margin %");
    expect(config.columnField).toBe("units");
    // …and the marker also supplies the unit, so nothing has to be restated.
    expect(config.lineUnit).toBe("%");
  });

  it("2b. …in whichever position it sits (the marker decides, not the column order)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: "month,share (%),tonnes\nJan,31.4,1850\nDec,19.7,4310",
      comboColumnUnit: "t",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.lineField).toBe("share (%)");
    expect(config.columnField).toBe("tonnes");
  });

  it("3. REFUSES to guess when neither signal is present, and names both candidates", () => {
    const spec: NativeSpec = { ...base, nativeType: "combo", data: DATA };
    expect(() => specToNativeConfig(spec)).toThrow(/comboLine/);
    try {
      specToNativeConfig(spec);
    } catch (e) {
      const m = (e as Error).message;
      expect(m).toContain("units");
      expect(m).toContain("margin");
    }
  });

  it("3b. REFUSES when BOTH headers carry the marker (the marker no longer discriminates)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: "month,share %,margin %\nJan,60,31.4\nDec,55,19.7",
    };
    expect(() => specToNativeConfig(spec)).toThrow(/comboLine/);
  });

  it("refuses a `comboLine` naming a column that is not a numeric series", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: DATA,
      comboLine: "month",
      comboColumnUnit: "units",
      comboLineUnit: "%",
    };
    expect(() => specToNativeConfig(spec)).toThrow(/month/);
  });

  it("refuses MORE than two numeric series — a combo draws exactly one of each", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: "month,units,margin,staff\nJan,1850,31.4,12\nDec,4310,19.7,15",
      comboLine: "margin",
      comboColumnUnit: "units",
      comboLineUnit: "%",
    };
    expect(() => specToNativeConfig(spec)).toThrow(/exactly two/);
  });

  it("refuses a single numeric series before the mapper is reached (shape gate)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "combo",
      data: "month,units\nJan,1850\nDec,4310",
      comboLine: "units",
    };
    expect(() => specToNativeConfig(spec)).toThrow(ShapeMismatchError);
  });
});

// ---------------------------------------------------------------------------
// ★ THE UNITS ARE PART OF THE DECISION, NOT DECORATION.
//
// checkComboConformance refuses a combo whose two series share a unit — that is THE dual-axis
// abuse. It cannot apply that rule to units it was never told, so the mapper will not build a
// config without them. They are asked for once, at the gate, in a message that says why.
// ---------------------------------------------------------------------------
describe("specToNativeConfig — combo: the units the honesty rule needs", () => {
  it("carries both declared units onto the config", () => {
    const { config } = specToNativeConfig({
      ...base,
      nativeType: "combo",
      data: DATA,
      comboLine: "margin",
      comboColumnUnit: "units sold",
      comboLineUnit: "%",
    } as NativeSpec);
    expect(config.columnUnit).toBe("units sold");
    expect(config.lineUnit).toBe("%");
  });

  it("refuses a missing column unit, naming the field to set", () => {
    expect(() =>
      specToNativeConfig({
        ...base,
        nativeType: "combo",
        data: DATA,
        comboLine: "margin",
        comboLineUnit: "%",
      } as NativeSpec),
    ).toThrow(/comboColumnUnit/);
  });

  it("refuses a missing line unit, naming the field to set", () => {
    expect(() =>
      specToNativeConfig({
        ...base,
        nativeType: "combo",
        data: DATA,
        comboLine: "margin",
        comboColumnUnit: "units",
      } as NativeSpec),
    ).toThrow(/comboLineUnit/);
  });

  it("refuses two series declared in the SAME unit at the gate, before any render", () => {
    expect(() =>
      specToNativeConfig({
        ...base,
        nativeType: "combo",
        data: DATA,
        comboLine: "margin",
        comboColumnUnit: "GWh",
        comboLineUnit: " gwh ",
      } as NativeSpec),
    ).toThrow(/same unit/);
  });
});

// ---------------------------------------------------------------------------
// ★ THE LABELS ARE DERIVED, NOT WRITTEN — and derived without a word of any language.
// ---------------------------------------------------------------------------
describe("specToNativeConfig — combo: axis and legend furniture", () => {
  const { config } = specToNativeConfig({
    ...base,
    nativeType: "combo",
    data: "month,units_sold,margin\nJan,1850,31.4\nDec,4310,19.7",
    comboLine: "margin",
    comboColumnUnit: "units",
    comboLineUnit: "%",
  } as NativeSpec);

  it("humanizes raw identifiers into series labels", () => {
    expect(config.columnSeriesLabel).toBe("Units sold");
    expect(config.lineSeriesLabel).toBe("Margin");
  });

  it("builds each axis label from its series and its unit, with no English glue word", () => {
    // "Units sold" already carries "units", so the unit is not repeated — the first rendered
    // proof read "Units (units)", and a stutter is what a reader actually sees.
    expect(config.leftAxisLabel).toBe("Units sold");
    expect(config.rightAxisLabel).toBe("Margin (%)");
    // The join is punctuation only — nothing here needs translating for a fr/de/it deliverable.
    for (const label of [config.leftAxisLabel, config.rightAxisLabel])
      expect(String(label)).not.toMatch(/[A-Za-z]{2,}\s+(in|per|of|by)\s+/);
  });

  it("appends the unit when the series name does NOT already carry it", () => {
    const { config: c } = specToNativeConfig({
      ...base,
      nativeType: "combo",
      data: "year,generation,intensity\n2020,410,320\n2021,455,298",
      comboLine: "intensity",
      comboColumnUnit: "GWh",
      comboLineUnit: "gCO2/kWh",
    } as NativeSpec);
    expect(c.leftAxisLabel).toBe("Generation (GWh)");
    expect(c.rightAxisLabel).toBe("Intensity (gCO2/kWh)");
  });

  it("and the axis title still names its series either way (the binding conformance checks)", () => {
    expect(String(config.leftAxisLabel)).toContain(
      String(config.columnSeriesLabel),
    );
    expect(String(config.rightAxisLabel)).toContain(
      String(config.lineSeriesLabel),
    );
  });

  it("produces a config the combo geometry accepts and lays out honestly", () => {
    const layout = computeComboLayout(
      {
        categoryField: config.categoryField as string,
        columnField: config.columnField as string,
        lineField: config.lineField as string,
        rows: config.rows as Record<string, string | number>[],
      },
      {
        width: 840,
        height: 480,
        padding: { top: 60, right: 56, bottom: 70, left: 56 },
      },
    );
    expect(layout.columns).toHaveLength(2);
    expect(layout.leftDomain[0]).toBe(0);
    expect(layout.lineClearsColumns).toBe(true);
  });
});

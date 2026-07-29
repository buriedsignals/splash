import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  isFrench,
  decimalSep,
  groupSep,
  formatLocaleNumber,
  localizeDecimal,
  sourceLabel,
  localizeValueLabel,
} from "../src/core/locale";
import { formatNumber } from "../src/core/math";
import { BoxplotChart, type BoxplotConfig } from "../src/BoxplotChart";
import { BulletChart, type BulletConfig } from "../src/BulletChart";
import { ComboChart, type ComboConfig } from "../src/ComboChart";
import { DotStripChart, type DotStripConfig } from "../src/DotStripChart";
import { LollipopChart, type LollipopConfig } from "../src/LollipopChart";
import { LorenzChart, type LorenzConfig } from "../src/LorenzChart";
import { ParallelChart, type ParallelConfig } from "../src/ParallelChart";
import { SankeyChart, type SankeyConfig } from "../src/SankeyChart";
import { SlopeChart, type SlopeConfig } from "../src/SlopeChart";
import { ViolinChart, type ViolinConfig } from "../src/ViolinChart";
import { WaffleChart, type WaffleConfig } from "../src/WaffleChart";

// French uses a narrow no-break space (U+202F) for thousands and a comma decimal —
// the same output Intl.NumberFormat('fr-FR') produces, but computed by an explicit,
// deterministic formatter (no Intl locale-data drift across Node/Remotion/browser).
const NBSP = " ";
const SRC = { name: "INSEE", url: "https://insee.fr" };

describe("locale — language detection", () => {
  it("treats fr / fr-FR / FR as French, everything else as not", () => {
    expect(isFrench("fr")).toBe(true);
    expect(isFrench("fr-FR")).toBe(true);
    expect(isFrench("FR")).toBe(true);
    expect(isFrench("en")).toBe(false);
    expect(isFrench("en-US")).toBe(false);
    expect(isFrench(undefined)).toBe(false);
  });

  it("picks the right separators per language", () => {
    expect(decimalSep("fr")).toBe(",");
    expect(decimalSep("en")).toBe(".");
    expect(decimalSep(undefined)).toBe(".");
    expect(groupSep("fr")).toBe(NBSP);
    expect(groupSep("en")).toBe(",");
    expect(groupSep(undefined)).toBe(",");
  });
});

describe("formatLocaleNumber — full grouped number", () => {
  it("groups thousands and applies the decimal separator (FR)", () => {
    expect(formatLocaleNumber(1900, "fr")).toBe(`1${NBSP}900`);
    expect(formatLocaleNumber(19.3, "fr")).toBe("19,3");
    expect(formatLocaleNumber(12345.6, "fr")).toBe(`12${NBSP}345,6`);
    expect(formatLocaleNumber(-1900, "fr")).toBe(`-1${NBSP}900`);
    expect(formatLocaleNumber(890.2, "fr")).toBe("890,2");
  });

  it("leaves English formatting unchanged (comma thousands, dot decimal)", () => {
    expect(formatLocaleNumber(1900, "en")).toBe("1,900");
    expect(formatLocaleNumber(19.3, "en")).toBe("19.3");
    expect(formatLocaleNumber(12345.6, "en")).toBe("12,345.6");
    expect(formatLocaleNumber(1900)).toBe("1,900"); // default = en
  });
});

describe("localizeDecimal — decimal separator on an already-formatted string", () => {
  it("swaps the decimal point for a comma in French, leaves English alone", () => {
    expect(localizeDecimal("1.9k", "fr")).toBe("1,9k");
    expect(localizeDecimal("19.3", "fr")).toBe("19,3");
    expect(localizeDecimal("1.8M", "fr")).toBe("1,8M");
    expect(localizeDecimal("1.9k", "en")).toBe("1.9k");
    expect(localizeDecimal("1.9k")).toBe("1.9k");
  });
});

describe("sourceLabel — localized furniture", () => {
  it("uses the French typographic space before the colon", () => {
    expect(sourceLabel("fr")).toBe("Source :");
    expect(sourceLabel("en")).toBe("Source:");
    expect(sourceLabel(undefined)).toBe("Source:");
  });
});

describe("formatNumber — abbreviation stays, decimal becomes locale-aware", () => {
  it("keeps English output byte-identical (regression guard)", () => {
    expect(formatNumber(19.3)).toBe("19.3");
    expect(formatNumber(1900)).toBe("1.9k");
    expect(formatNumber(1_800_000)).toBe("1.8M");
    expect(formatNumber(42)).toBe("42");
  });

  it("uses a comma decimal in French, same abbreviation", () => {
    expect(formatNumber(19.3, "fr")).toBe("19,3");
    expect(formatNumber(1900, "fr")).toBe("1,9k");
    expect(formatNumber(1_800_000, "fr")).toBe("1,8M");
    expect(formatNumber(42, "fr")).toBe("42");
  });
});

// German + Italian are the other Swiss-newsroom languages. Both use a comma decimal
// and a period thousands separator (the mirror of English), with their own "Source"
// furniture word — sourced from the standard de-DE / it-IT conventions.
describe("locale — German (de)", () => {
  it("picks a comma decimal and a period thousands separator", () => {
    expect(decimalSep("de")).toBe(",");
    expect(groupSep("de")).toBe(".");
    expect(decimalSep("de-CH")).toBe(","); // region variant → base German
  });

  it("groups thousands with a period and uses a comma decimal", () => {
    expect(formatLocaleNumber(1900, "de")).toBe("1.900");
    expect(formatLocaleNumber(19.3, "de")).toBe("19,3");
    expect(formatLocaleNumber(12345.6, "de")).toBe("12.345,6");
    expect(formatLocaleNumber(-1900, "de")).toBe("-1.900");
  });

  it("localizes the abbreviated decimal and the Source furniture", () => {
    expect(localizeDecimal("1.9k", "de")).toBe("1,9k");
    expect(formatNumber(1900, "de")).toBe("1,9k");
    expect(sourceLabel("de")).toBe("Quelle:");
  });
});

describe("locale — Italian (it)", () => {
  it("picks a comma decimal and a period thousands separator", () => {
    expect(decimalSep("it")).toBe(",");
    expect(groupSep("it")).toBe(".");
  });

  it("groups thousands with a period and uses a comma decimal", () => {
    expect(formatLocaleNumber(1900, "it")).toBe("1.900");
    expect(formatLocaleNumber(12345.6, "it")).toBe("12.345,6");
  });

  it("localizes the abbreviated decimal and the Source furniture", () => {
    expect(localizeDecimal("1.8M", "it")).toBe("1,8M");
    expect(formatNumber(1_800_000, "it")).toBe("1,8M");
    expect(sourceLabel("it")).toBe("Fonte:");
  });
});

describe("locale — unknown language falls back to English", () => {
  it("keeps English separators + furniture for an unmapped tag", () => {
    expect(decimalSep("pt")).toBe(".");
    expect(groupSep("pt")).toBe(",");
    expect(formatLocaleNumber(1900, "pt")).toBe("1,900");
    expect(sourceLabel("pt")).toBe("Source:");
  });
});

describe("localizeValueLabel — the shared chart-native value-label helper", () => {
  it("an integer stays bare, a decimal keeps one place, both take the locale", () => {
    expect(localizeValueLabel(52, "fr")).toBe("52");
    expect(localizeValueLabel(52.4, "fr")).toBe("52,4");
    expect(localizeValueLabel(3200, "fr")).toBe(`3${NBSP}200`);
    expect(localizeValueLabel(52, "en")).toBe("52");
    expect(localizeValueLabel(52.4, "en")).toBe("52.4");
    expect(localizeValueLabel(3200)).toBe("3,200"); // default = en
  });
});

// Task 8: the eleven chart-native files that printed a value label without going
// through the locale table (the measured defect — a French chart showed "52.0" and
// "3200.0": a parasitic decimal on an integer AND an English decimal point). Each
// case below renders the REAL component in French with one integer value and one
// decimal value, and checks BOTH halves of the defect are gone. Ten route through
// `localizeValueLabel` (a per-function `fmt`/`fmtVal` closure binding config.lang);
// LorenzChart's Gini legend is a genuinely different shape (always 2 decimals, no
// bare-integer branch) and calls `localizeNumberString` directly — see its own case.
describe("chart-native value labels reach the locale table (task 8)", () => {
  it("BoxplotChart: median/IQR labels, bare integer + one-decimal, fr separators", () => {
    const config: BoxplotConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      valueLabel: "unit",
      categories: [
        { label: "Cadres", values: [3200, 3200, 3200, 3200] },
        { label: "Ouvriers", values: [52.4, 52.4, 52.4, 52.4] },
      ],
    };
    const svg = renderToStaticMarkup(
      createElement(BoxplotChart, { config, interactive: true }),
    );
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("BulletChart: measure value label, bare integer + one-decimal, fr separators", () => {
    const config: BulletConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "pts",
      rows: [
        {
          label: "A",
          unit: "pts",
          value: 3200,
          target: 3000,
          max: 5000,
          bands: [1000, 3000, 5000],
        },
        {
          label: "B",
          unit: "pts",
          value: 52.4,
          target: 50,
          max: 100,
          bands: [30, 70, 100],
        },
      ],
    };
    const svg = renderToStaticMarkup(createElement(BulletChart, { config }));
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("ComboChart: column-series AND line-series aria-label value, bare integer + one-decimal, fr separators", () => {
    // Column value (c.value) and line value (linePoints[...].value) are DISTINCT
    // fields interpolated at the same aria-label site — a fixed pair caught the
    // line-series half at task-8 time but let the column-series half (c.value,
    // interpolated raw beside it) slip through review because 10/20 render
    // identically in every locale. Using thousands-crossing + decimal values for
    // BOTH fields here means a raw (unlocalized) interpolation of EITHER one
    // reddens this test.
    const config: ComboConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "u",
      categoryField: "cat",
      columnField: "col",
      lineField: "line",
      leftAxisLabel: "L",
      rightAxisLabel: "R",
      columnSeriesLabel: "Columns",
      lineSeriesLabel: "Line",
      rows: [
        { cat: "A", col: 3200, line: 6100 },
        { cat: "B", col: 52.4, line: 74.8 },
      ],
    };
    const svg = renderToStaticMarkup(
      createElement(ComboChart, { config, interactive: true }),
    );
    expect(svg).toContain(`3${NBSP}200`); // column, row A
    expect(svg).toContain(`6${NBSP}100`); // line, row A
    expect(svg).toContain("52,4"); // column, row B
    expect(svg).toContain("74,8"); // line, row B
    expect(svg).not.toContain("3200"); // raw/unlocalized column integer
    expect(svg).not.toContain("6100"); // raw/unlocalized line integer
    expect(svg).not.toContain("52.4"); // raw/unlocalized column decimal
    expect(svg).not.toContain("74.8"); // raw/unlocalized line decimal
  });

  it("DotStripChart: min/max/mean aria-label, bare integer + one-decimal, fr separators", () => {
    const config: DotStripConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "pts",
      categoryField: "cat",
      valueField: "val",
      rows: [
        { cat: "A", val: 3200 },
        { cat: "B", val: 52.4 },
      ],
    };
    const svg = renderToStaticMarkup(
      createElement(DotStripChart, { config, interactive: true }),
    );
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("LollipopChart: dot value label, bare integer + one-decimal, fr separators", () => {
    const config: LollipopConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "pts",
      catField: "cat",
      valField: "val",
      rows: [
        { cat: "A", val: 3200 },
        { cat: "B", val: 52.4 },
      ],
    };
    const svg = renderToStaticMarkup(createElement(LollipopChart, { config }));
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("LorenzChart: Gini legend, English decimal point becomes a comma (fr) — different shape (2dp, no bare-integer)", () => {
    const config: LorenzConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "u",
      xLabel: "Population",
      yLabel: "Income",
      series: [
        {
          label: "Country",
          points: [
            { x: 0, y: 0 },
            { x: 0.5, y: 0 },
            { x: 1, y: 1 },
          ], // trapezoid rule → gini = 0.50 exactly
        },
      ],
    };
    const svg = renderToStaticMarkup(createElement(LorenzChart, { config }));
    expect(svg).toContain("0,50");
    expect(svg).not.toContain("0.50");
  });

  it("ParallelChart: axis min/max labels, bare integer + one-decimal, fr separators", () => {
    const config: ParallelConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "u",
      dimensions: [
        { key: "d1", label: "D1" },
        { key: "d2", label: "D2" },
      ],
      items: [
        { label: "Item A", d1: 3200, d2: 100 },
        { label: "Item B", d1: 52.4, d2: 200 },
      ],
    };
    const svg = renderToStaticMarkup(createElement(ParallelChart, { config }));
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("SankeyChart: link aria-label value, bare integer + one-decimal, fr separators", () => {
    // Node labels truncate to fit their gutter at this default width (unrelated to
    // locale), so this reads the link aria-label instead — same `fmt`, untruncated.
    const config: SankeyConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "u",
      nodes: [
        { id: "a", label: "A", column: 0 },
        { id: "b", label: "B", column: 1 },
        { id: "c", label: "C", column: 0 },
        { id: "d", label: "D", column: 1 },
      ],
      links: [
        { source: "a", target: "b", value: 3200 },
        { source: "c", target: "d", value: 52.4 },
      ],
    };
    const svg = renderToStaticMarkup(
      createElement(SankeyChart, { config, interactive: true }),
    );
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("SlopeChart: left/right value labels, bare integer + one-decimal, fr separators", () => {
    // The measured defect: a French chart showed "52.0" and "3200.0" — a parasitic
    // decimal on an integer AND an English decimal point. Both halves, one expression.
    const config: SlopeConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "u",
      labelField: "label",
      leftField: "left",
      rightField: "right",
      leftPeriod: "2015",
      rightPeriod: "2024",
      rows: [{ label: "Cadres", left: 3200, right: 52.4 }],
    };
    const svg = renderToStaticMarkup(createElement(SlopeChart, { config }));
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("ViolinChart: median/quartile aria-label, bare integer + one-decimal, fr separators", () => {
    const config: ViolinConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "pts",
      categories: [
        { label: "Cadres", values: [3200, 3200, 3200, 3200, 3200] },
        { label: "Ouvriers", values: [52.4, 52.4, 52.4, 52.4, 52.4] },
      ],
    };
    const svg = renderToStaticMarkup(
      createElement(ViolinChart, { config, interactive: true }),
    );
    expect(svg).toContain(`3${NBSP}200`);
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("3200.0");
    expect(svg).not.toContain("52.0");
  });

  it("WaffleChart: legend value label, bare integer + one-decimal, fr separators", () => {
    const config: WaffleConfig = {
      title: "T",
      source: SRC,
      lang: "fr",
      unit: "%",
      items: [
        { label: "A", value: 32 },
        { label: "B", value: 52.4 },
      ],
    };
    const svg = renderToStaticMarkup(createElement(WaffleChart, { config }));
    expect(svg).toContain("32");
    expect(svg).toContain("52,4");
    expect(svg).not.toContain("32.0");
    expect(svg).not.toContain("52.0");
  });
});

import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { unitSuffix, SHORT_UNIT_MAX_CHARS } from "../src/core/locale";

// QA Wave 8 (aging scrolly, minor): the scrolly bar highlight-walk labelled each
// walked bar with a bare number ("34,2") while the unit ("%") lived only in the
// subtitle — a directly-labelled value must read complete on its own (the same
// rule map-native's conformance enforces for symbol labels). Fix: the EMBEDDED
// bar render (the scrolly host's sticky graphic) appends a SHORT unit to every
// direct value label, locale-aware. A LONG unit ("millions de nuitées") stays in
// the subtitle — repeating it per label is noise.

const rows = [
  { region: "Savoie", part: 34.2 },
  { region: "Haute-Savoie", part: 28.7 },
  { region: "Ain", part: 9.1 },
];

function config(overrides: Partial<BarConfig> = {}): BarConfig {
  return {
    title: "La Savoie concentre un tiers des nuitées touristiques",
    source: { name: "Insee 2025", url: "https://example.org/x" },
    unit: "%",
    catField: "region",
    valField: "part",
    orientation: "horizontal",
    sort: "desc",
    lang: "fr",
    rows,
    ...overrides,
  };
}

/** Text content of every value label (the font-weight 600 <text> nodes). */
function valueLabels(markup: string): string[] {
  const labels: string[] = [];
  for (const m of markup.matchAll(
    /<text\b[^>]*font-weight="600"[^>]*>([^<]*)<\/text>/g,
  )) {
    labels.push(m[1]);
  }
  return labels;
}

describe("unitSuffix — locale-aware short-unit suffix for direct value labels", () => {
  it("suffixes a short unit with a narrow no-break space in French", () => {
    expect(unitSuffix("%", "fr")).toBe(" %");
    expect(unitSuffix("km", "fr")).toBe(" km");
  });

  it("attaches % directly in English, spaces word units", () => {
    expect(unitSuffix("%", "en")).toBe("%");
    expect(unitSuffix("km", "en")).toBe(" km");
  });

  it("returns nothing for a LONG unit (kept in the subtitle, not per label)", () => {
    expect(unitSuffix("millions de nuitées", "fr")).toBe("");
    expect("km".length).toBeLessThanOrEqual(SHORT_UNIT_MAX_CHARS);
    expect(unitSuffix("nuits", "fr")).toBe(""); // 5 chars > threshold
  });

  it("returns nothing for an empty/blank unit", () => {
    expect(unitSuffix(undefined, "fr")).toBe("");
    expect(unitSuffix("  ", "fr")).toBe("");
  });
});

describe("BarChart — embedded (scrolly host) value labels carry a short unit", () => {
  it("appends the short unit to every direct value label when embedded (FR: '34,2 %')", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config()} progress={1} embedded />,
    );
    const labels = valueLabels(markup);
    expect(labels.length).toBe(3);
    expect(labels).toContain("34,2 %");
    for (const l of labels) expect(l.endsWith(" %")).toBe(true);
  });

  it("keeps bare numbers when the unit is LONG (unit stays in the subtitle)", () => {
    const markup = renderToStaticMarkup(
      <BarChart
        config={config({ unit: "millions de nuitées" })}
        progress={1}
        embedded
      />,
    );
    const labels = valueLabels(markup);
    expect(labels).toContain("34,2");
    for (const l of labels) expect(l.includes("nuitées")).toBe(false);
  });

  it("keeps bare numbers in the standalone (non-embedded) render — unit stated once in the subtitle", () => {
    const markup = renderToStaticMarkup(
      <BarChart config={config()} progress={1} />,
    );
    const labels = valueLabels(markup);
    expect(labels).toContain("34,2");
    for (const l of labels) expect(l.includes("%")).toBe(false);
  });
});

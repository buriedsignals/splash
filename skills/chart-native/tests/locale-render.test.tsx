import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { LineChart, type ChartConfig } from "../src/LineChart";
import { WaterfallChart, type WaterfallConfig } from "../src/WaterfallChart";

// End-to-end furniture + number localization at the component level: a config with
// lang:"fr" must render the French "Source :" furniture and French value labels
// (comma decimal), while the default (no lang) stays English.
const base: BarConfig = {
  title: "Le Nord domine la production régionale",
  source: { name: "INSEE 2025", url: "https://example.org/x" },
  unit: "part (%)",
  catField: "region",
  valField: "value",
  orientation: "horizontal",
  sort: "desc",
  rows: [
    { region: "Nord", value: 19.3 },
    { region: "Sud", value: 8.7 },
  ],
};

describe("BarChart — French localization", () => {
  it('renders "Source :" (French spacing) when lang is fr', () => {
    const fr = renderToStaticMarkup(
      <BarChart config={{ ...base, lang: "fr" }} responsive={false} />,
    );
    expect(fr).toContain("Source :");
    expect(fr).not.toContain("Source: ");
  });

  it('renders "Source:" (English) by default', () => {
    const en = renderToStaticMarkup(
      <BarChart config={base} responsive={false} />,
    );
    expect(en).toContain("Source:");
    expect(en).not.toContain("Source :");
  });

  it("renders value labels with the French comma decimal", () => {
    const fr = renderToStaticMarkup(
      <BarChart config={{ ...base, lang: "fr" }} responsive={false} />,
    );
    expect(fr).toContain("19,3");
    expect(fr).not.toContain("19.3");
  });

  it("keeps English value labels with a dot decimal by default", () => {
    const en = renderToStaticMarkup(
      <BarChart config={base} responsive={false} />,
    );
    expect(en).toContain("19.3");
    expect(en).not.toContain("19,3");
  });
});

// LineChart previously did NOT support lang at all (no field, English furniture +
// numbers) — the exact reason a German deliverable rendered "Source:" and "1,900".
const lineBase: ChartConfig = {
  title: "Die Erwerbsquote steigt seit 2019 stetig an",
  source: { name: "BFS 2025", url: "https://example.org/x" },
  unit: "Personen",
  directLabel: "Erwerbstätige",
  xField: "year",
  yField: "value",
  xType: "linear",
  points: [
    { year: 2019, value: 1200 },
    { year: 2024, value: 1900 },
  ],
};

describe("LineChart — German localization", () => {
  it('renders "Quelle:" furniture and a comma-decimal abbreviation when lang is de', () => {
    const de = renderToStaticMarkup(
      <LineChart config={{ ...lineBase, lang: "de" }} responsive={false} />,
    );
    expect(de).toContain("Quelle:");
    expect(de).not.toContain("Source:");
    // FT-style abbreviation, German decimal comma (value 1900 → "1,9k", not "1.9k").
    // The full period-grouped "1.900" form is proven for formatLocaleNumber in locale.test.ts.
    expect(de).toContain("1,9k");
    expect(de).not.toContain("1.9k");
  });

  it('renders "Source:" (English) and a dot-decimal abbreviation by default', () => {
    const en = renderToStaticMarkup(
      <LineChart config={lineBase} responsive={false} />,
    );
    expect(en).toContain("Source:");
    expect(en).not.toContain("Quelle:");
    expect(en).toContain("1.9k");
    expect(en).not.toContain("1,9k");
  });
});

// WaterfallChart's signed step labels ("+2,4" / "−0,5") bypassed formatLocaleNumber —
// a French deliverable rendered "+2.4" (English period) inside the ink label.
const wfBase: WaterfallConfig = {
  title: "Le budget communal bascule dans le rouge en 2025",
  source: { name: "Ville 2025", url: "https://example.org/x" },
  unit: "millions €",
  rows: [
    { label: "Début", value: 10, total: true },
    { label: "Recettes", value: 2.4 },
    { label: "Charges", value: -0.5 },
    { label: "Fin", value: 11.9, total: true },
  ],
};

describe("WaterfallChart — French localization", () => {
  it('renders "Source :" furniture and comma-decimal signed steps when lang is fr', () => {
    const fr = renderToStaticMarkup(
      <WaterfallChart config={{ ...wfBase, lang: "fr" }} responsive={false} />,
    );
    expect(fr).toContain("Source :");
    expect(fr).toContain("+2,4"); // French comma decimal on the signed step
    expect(fr).toContain("−0,5");
    expect(fr).not.toContain("+2.4");
  });

  it("keeps English signed steps (period decimal) by default", () => {
    const en = renderToStaticMarkup(
      <WaterfallChart config={wfBase} responsive={false} />,
    );
    expect(en).toContain("+2.4");
    expect(en).not.toContain("+2,4");
  });
});

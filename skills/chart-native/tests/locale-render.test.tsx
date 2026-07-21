import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";
import { LineChart, type ChartConfig } from "../src/LineChart";
import { WaterfallChart, type WaterfallConfig } from "../src/WaterfallChart";
import { DumbbellChart, type DumbbellConfig } from "../src/DumbbellChart";

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

// DumbbellChart hard-coded `String(v)` for its value labels/tooltip instead of routing
// through lib/core's formatLocaleNumber — a French deliverable rendered "2.1" (English
// period) instead of "2,1" (certification finding).
const dumbbellBase: DumbbellConfig = {
  title: "L'écart salarial reste marqué dans la finance",
  source: { name: "Enquête Riverton", url: "https://example.org/x" },
  unit: "salaire médian, k€",
  labelField: "sector",
  leftField: "start",
  rightField: "end",
  leftLabel: "2010",
  rightLabel: "2020",
  rows: [{ sector: "Finance", start: 4, end: 2.1 }],
};

describe("DumbbellChart — French localization", () => {
  it("renders value labels with the French comma decimal when lang is fr", () => {
    const fr = renderToStaticMarkup(
      <DumbbellChart config={{ ...dumbbellBase, lang: "fr" }} progress={1} />,
    );
    expect(fr).toContain("2,1");
    expect(fr).not.toContain("2.1");
    expect(fr).toContain("Source :");
  });

  it("keeps the English dot decimal by default", () => {
    const en = renderToStaticMarkup(
      <DumbbellChart config={dumbbellBase} progress={1} />,
    );
    expect(en).toContain("2.1");
    expect(en).not.toContain("2,1");
  });
});

// SERIOUS: endpoints must be positioned/coloured/labelled by COLUMN identity
// (leftField vs rightField), never re-ordered by value magnitude — otherwise a
// DECREASING series (start > end) could render with its endpoints swapped and
// visually read as an increase. Verified end-to-end at the rendered SVG: the
// leftField dot/label always carries leftVal, the rightField dot/label always
// carries rightVal, regardless of which is numerically bigger.
describe("DumbbellChart — endpoints ordered by column identity, not magnitude", () => {
  it("a DECREASING series (start > end) keeps start on its own dot/colour and end on its own — never sorted by value", () => {
    const markup = renderToStaticMarkup(
      <DumbbellChart config={dumbbellBase} progress={1} />,
    );
    // leftField ("start" = 4) dot: Okabe-Ito orange, at the larger x (further right).
    // (scoped to the "dumbbell-dot" class — the legend swatch also uses these hues.)
    const leftDot =
      /class="dumbbell-dot" cx="([\d.]+)"[^>]*fill="#E69F00"/.exec(markup);
    // rightField ("end" = 2.1) dot: Okabe-Ito blue, at the smaller x (further left).
    const rightDot =
      /class="dumbbell-dot" cx="([\d.]+)"[^>]*fill="#0072B2"/.exec(markup);
    expect(leftDot).not.toBeNull();
    expect(rightDot).not.toBeNull();
    const leftX = Number(leftDot![1]);
    const rightX = Number(rightDot![1]);
    // The value (4) is bigger than (2.1) → its dot sits at a BIGGER x. If endpoints
    // were reordered by magnitude instead of column identity, this relationship
    // would flip regardless of which field is "start" vs "end".
    expect(leftX).toBeGreaterThan(rightX);
    // Each dot's own value label is present (the decrease reads as 4 → 2.1, not
    // silently re-labelled as an increase).
    expect(markup).toContain("2.1");
    expect(markup).toContain(">4<");
  });
});

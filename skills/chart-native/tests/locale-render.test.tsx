import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";

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

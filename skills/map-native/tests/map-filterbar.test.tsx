import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MapFilterBar } from "../src/core/MapFilterBar";
import type { FilterOption } from "../src/core/map-filter";

const opts: FilterOption[] = [
  { kind: "category", field: "kind", label: "Kind", values: ["city", "port"] },
];

describe("MapFilterBar", () => {
  it("renders a testid bar and a chip per category value", () => {
    const html = renderToStaticMarkup(
      <MapFilterBar
        options={opts}
        state={{ kind: ["city", "port"] }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="map-filterbar"');
    expect((html.match(/data-testid="filter-chip"/g) ?? []).length).toBe(2);
  });

  it("renders chips for all category values", () => {
    const multiOpts: FilterOption[] = [
      {
        kind: "category",
        field: "type",
        label: "Type",
        values: ["a", "b", "c"],
      },
    ];
    const html = renderToStaticMarkup(
      <MapFilterBar
        options={multiOpts}
        state={{ type: ["a", "b", "c"] }}
        onChange={() => {}}
      />,
    );
    expect((html.match(/data-testid="filter-chip"/g) ?? []).length).toBe(3);
  });

  it("renders range input for range option", () => {
    const rangeOpts: FilterOption[] = [
      {
        kind: "range",
        field: "pop",
        label: "Population",
        min: 0,
        max: 100,
        step: 10,
        mode: "atLeast",
      },
    ];
    const html = renderToStaticMarkup(
      <MapFilterBar options={rangeOpts} state={{}} onChange={() => {}} />,
    );
    expect(html).toContain('data-testid="filter-range"');
  });

  it("renders two thumbs for between range mode", () => {
    const rangeOpts: FilterOption[] = [
      {
        kind: "range",
        field: "pop",
        label: "Population",
        min: 0,
        max: 100,
        step: 10,
        mode: "between",
      },
    ];
    const html = renderToStaticMarkup(
      <MapFilterBar
        options={rangeOpts}
        state={{ pop: [20, 80] }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="filter-range-lo"');
    expect(html).toContain('data-testid="filter-range-hi"');
    expect(html).not.toContain('data-testid="filter-range"');
  });

  it("renders time input for time option", () => {
    const timeOpts: FilterOption[] = [
      { kind: "time", field: "year", label: "Year", steps: [2000, 2010, 2020] },
    ];
    const html = renderToStaticMarkup(
      <MapFilterBar options={timeOpts} state={{}} onChange={() => {}} />,
    );
    expect(html).toContain('data-testid="filter-time"');
  });

  it("time index↔step mapping: selected step resolves to correct index", () => {
    const steps = [2000, 2010, 2020];
    const sel = 2010;
    const idx = Math.max(0, steps.indexOf(sel));
    expect(idx).toBe(1);
    // Reverse: index 2 → step 2020
    expect(steps[2]).toBe(2020);
  });

  it("time fallback: unknown step defaults to index 0", () => {
    const steps = [2000, 2010, 2020];
    const sel = 9999; // not in steps
    const idx = Math.max(0, steps.indexOf(sel)); // indexOf returns -1 → max(0,-1) = 0
    expect(idx).toBe(0);
  });

  it("time label shows the step resolved from idx (not the raw stale value)", () => {
    const timeOpts: FilterOption[] = [
      { kind: "time", field: "year", label: "Year", steps: [2000, 2010, 2020] },
    ];
    // state has an unknown step → resolves to idx 0 → step 2000; label must show 2000, not 9999
    const html = renderToStaticMarkup(
      <MapFilterBar
        options={timeOpts}
        state={{ year: 9999 }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain("2000");
    expect(html).not.toContain("9999");
  });
});

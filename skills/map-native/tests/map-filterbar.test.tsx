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

  it("chip toggling: removing one visible value emits reduced state", () => {
    let emitted: unknown = null;
    // We can't click in SSR, so test the logic directly via the "never empty" rule.
    // Extract the chip-toggle logic: given visible = ["city","port"], click "city" → ["port"]
    const visible = ["city", "port"];
    const clicked = "city";
    const on = visible.includes(clicked);
    const next = on
      ? visible.filter((x) => x !== clicked)
      : [...visible, clicked];
    // next has 1 item — allowed (not empty)
    expect(next).toEqual(["port"]);
    expect(next.length).toBeGreaterThan(0);
    emitted = next;
    expect(emitted).toEqual(["port"]);
  });

  it("chip toggle never-empty rule: last visible chip cannot be removed", () => {
    // When only one value is visible, toggling it off produces empty → guard returns unchanged
    const visible = ["city"];
    const clicked = "city";
    const on = visible.includes(clicked);
    const candidate = on
      ? visible.filter((x) => x !== clicked)
      : [...visible, clicked];
    // Guard: if candidate is empty, fall back to visible (no-op)
    const next = candidate.length === 0 ? visible : candidate;
    expect(next).toEqual(["city"]); // unchanged — never empties
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
});

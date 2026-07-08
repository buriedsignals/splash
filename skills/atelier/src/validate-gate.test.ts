import { describe, expect, it } from "bun:test";
import { validateAccepted } from "./validate-gate";
import type { AcceptedProposal } from "./producer-spec";

const base = { id: "x", format: "static" as const };

function accept(
  producer: AcceptedProposal["producer"],
  spec: unknown,
): AcceptedProposal {
  return { ...base, producer, spec };
}

describe("validateAccepted — the spine validation gate", () => {
  it("rejects an invalid dw-chart spec (missing title + data) with errors", () => {
    const r = validateAccepted(accept("dw-chart", { type: "d3-bars" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("accepts a valid dw-chart spec", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("passes a chart-native spec whose type is UNMAPPED (FALLBACK_TO_DW, not a validation failure)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "sankey",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "a,b\n1,2",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a chart-native spec whose SHAPE is malformed for its mapped type", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "category\nA", // no value column — bad shape for a bar
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("validates a map-native choropleth config", () => {
    const r = validateAccepted(
      accept("map-native", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("validates a SYMBOL scrolly via the map-native path (not the choropleth validator)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        type: "symbol",
        points: [{ lon: 2.35, lat: 48.85, value: 100, label: "Paris" }],
        basemap: "world",
        title: "Where the closures hit hardest across France",
        source: { name: "X", url: "https://x" },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("validates a CHART scrolly via the native path (not the DW ChartSpec validator)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2020,6",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("returns a FAILURE (never a crash) for a producer outside the union", () => {
    const r = validateAccepted({
      ...base,
      producer: "sankey-native" as never,
      spec: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("unknown producer");
  });
});

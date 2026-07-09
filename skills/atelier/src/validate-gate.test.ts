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

  // GUARD 2 — reject placeholder / reserved-domain source URLs (RFC 2606/6761). A
  // fabricated `…example.com` source must fail validation for EVERY producer, before the
  // producer ever runs — the spine is the single mechanical wire point.
  it("REJECTS a dw-chart spec whose source URL is a reserved placeholder domain", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: { name: "Made up", url: "https://example.com/data" },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("example.com");
  });

  it("REJECTS a map-native config whose source URL uses a reserved TLD", () => {
    const r = validateAccepted(
      accept("map-native", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Fabricated", url: "https://dataset.test/table" },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("test");
  });

  it("REJECTS a chart-native spec whose source URL is localhost", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "s", url: "http://localhost:3000/x" },
        unit: "u",
        data: "country,rate\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("still ACCEPTS a real, specific source URL (guard does not over-reject)", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: {
          name: "Eurostat",
          url: "https://ec.europa.eu/eurostat/databrowser/view/env_waspac/default/table",
        },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("does NOT reject a name-only source with no URL (the legitimate prose fallback)", () => {
    // GUARD 2 only fires on a PRESENT placeholder URL; a missing URL is handled by the
    // producers' own leniency / Gate 2c, not here — so the honest prose fallback passes.
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "Figures as reported in this article" },
        unit: "u",
        data: "country,rate\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(true);
  });
});

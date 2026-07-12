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

  it("accepts a CHART scrolly whose explicit beats anchor on real data values", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2005,8\n2020,6",
        beats: [
          { x: "1990", xEnd: "2005", text: "The plateau years" },
          { x: "2020", text: "The drop" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("REJECTS a CHART scrolly whose explicit beat anchors a value absent from the data (typo tripwire)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2020,6",
        beats: [{ x: "2019", text: "no such point" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("2019");
  });

  it("REJECTS explicit beats on a MAP scrolly track (chart-track override only — never silently ignored)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        type: "symbol",
        points: [{ lon: 2.35, lat: 48.85, value: 100, label: "Paris" }],
        basemap: "world",
        title: "Where the closures hit hardest across France",
        source: { name: "X", url: "https://x" },
        beats: [{ category: "Paris" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/map/i);
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

  // ENFORCEMENT SLICE 2 — the deterministic guardrails that used to live ONLY in
  // suggest-chart's eval (scoreSpec), now re-applied at the spine so a HAND-AUTHORED spec
  // that skipped suggest-chart must clear the same bar. There is no trust boundary
  // (orchestrator == suggest-chart, one LLM), so this is the tractable defense.
  const withChannel = (
    producer: AcceptedProposal["producer"],
    spec: unknown,
    channel: AcceptedProposal["channel"],
  ): AcceptedProposal => ({ ...base, producer, spec, channel });

  it("REJECTS a hand-authored row-driven d3-bars on a portrait (social-vertical) channel", () => {
    const r = validateAccepted(
      withChannel(
        "dw-chart",
        {
          type: "d3-bars",
          title: "Estonia recycles the most packaging waste in Europe",
          subject: "recycling",
          baseColor: "#009E73",
          data: "country,rate\nEstonia,63\nMalta,31",
          altInsight: "Estonia recycles the most packaging waste in Europe.",
        },
        "social-vertical",
      ),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("row-driven");
  });

  it("ACCEPTS the SAME otherwise-valid d3-bars on the article-web (landscape) channel", () => {
    const r = validateAccepted(
      withChannel(
        "dw-chart",
        {
          type: "d3-bars",
          title: "Estonia recycles the most packaging waste in Europe",
          subject: "recycling",
          baseColor: "#009E73",
          data: "country,rate\nEstonia,63\nMalta,31",
          altInsight: "Estonia recycles the most packaging waste in Europe.",
        },
        "article-web",
      ),
    );
    expect(r.ok).toBe(true);
  });

  it("catches the portrait channel carried ONLY on the dw spec (not on the proposal)", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        subject: "recycling",
        baseColor: "#009E73",
        data: "country,rate\nEstonia,63\nMalta,31",
        altInsight: "Estonia recycles the most packaging waste in Europe.",
        channel: "stories", // free-text portrait channel on the spec itself
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("row-driven");
  });

  it("REJECTS a chart-native spec that is missing its source name (furniture parity)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Rents keep climbing across the canton",
        unit: "CHF",
        data: "commune,rent\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("source name");
  });

  it("REJECTS a chart-native spec on a blue-family hue for a non-water subject", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Cross-border commuting keeps rising",
        source: { name: "OFS" },
        subject: "cross-border commuting",
        baseColor: "#56B4E9", // sky-blue — the live defect
        unit: "commuters",
        data: "year,commuters\n2019,63\n2024,90",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("blue");
  });

  it("ACCEPTS a clean chart-native spec (subject-fit hue, title + source present)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Cross-border commuting keeps rising",
        source: { name: "OFS" },
        subject: "cross-border commuting",
        baseColor: "#D55E00", // vermilion — a subject-fit flow hue
        unit: "commuters",
        data: "year,commuters\n2019,63\n2024,90",
      }),
    );
    expect(r.ok).toBe(true);
  });
});

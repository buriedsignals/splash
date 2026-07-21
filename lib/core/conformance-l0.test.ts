import { describe, it, expect } from "bun:test";
import { conformanceL0 } from "./conformance-l0";
import { checkGlobalConformance } from "../../skills/chart-native/src/core/conformance";
import { checkGlobalMapConformance } from "../../skills/map-native/src/conformance";

// A colour-conformant, subject-free chart header — so checkGlobalConformance's
// chart-only extras (Okabe-Ito data colour, subject-fit) contribute ZERO violations
// and the two functions' outputs are directly comparable on the shared L0 subset.
const chartColors = {
  data: "#0072B2", // Okabe-Ito blue — passes the chart-only colour check
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};

const mapTextColors = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };

const validTitle = "Renters spend more in the capital than anywhere else";
const validSource = {
  name: "Statistics Office 2025",
  url: "https://example.org",
};

describe("core.conformanceL0 — parity with chart-native's checkGlobalConformance", () => {
  it("matches on a fully valid header (both empty)", () => {
    const core = conformanceL0({
      title: validTitle,
      source: validSource,
      altInsight: "Renters pay a growing premium to live in the capital",
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: validTitle,
      source: validSource,
      colors: chartColors,
      altInsight: "Renters pay a growing premium to live in the capital",
    });
    expect(core).toEqual([]);
    expect(chart).toEqual([]);
    expect(core).toEqual(chart);
  });

  it("matches when the title is missing/too short", () => {
    const core = conformanceL0({
      title: "",
      source: validSource,
      altInsight: "x".repeat(20),
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: "",
      source: validSource,
      colors: chartColors,
      altInsight: "x".repeat(20),
    });
    expect(core.sort()).toEqual(chart.sort());
    expect(core.some((m) => m.includes("title too short"))).toBe(true);
  });

  it("matches when the source name is missing", () => {
    const core = conformanceL0({
      title: validTitle,
      source: { name: "", url: "" },
      altInsight: "x".repeat(20),
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: validTitle,
      source: { name: "", url: "" },
      colors: chartColors,
      altInsight: "x".repeat(20),
    });
    expect(core.sort()).toEqual(chart.sort());
    expect(core).toContain("missing source name");
  });

  it("matches when altInsight is missing (opt-in)", () => {
    const core = conformanceL0({
      title: validTitle,
      source: validSource,
      altInsight: undefined,
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: validTitle,
      source: validSource,
      colors: chartColors,
      altInsight: undefined,
    });
    expect(core.sort()).toEqual(chart.sort());
    expect(core.some((m) => m.includes("altInsight"))).toBe(true);
  });

  it("altInsight is a true opt-in no-op when the key is not declared at all", () => {
    const core = conformanceL0({ title: validTitle, source: validSource });
    expect(core).toEqual([]);
  });

  it("matches on a year-range title", () => {
    const core = conformanceL0({
      title: "2015-2024",
      source: validSource,
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: "2015-2024",
      source: validSource,
      colors: chartColors,
    });
    expect(core.sort()).toEqual(chart.sort());
  });

  it("matches on an ALL CAPS title", () => {
    const t = "RENTERS SPEND MORE IN THE CAPITAL THAN ANYWHERE ELSE";
    const core = conformanceL0({
      title: t,
      source: validSource,
      textColors: chartColors,
    });
    const chart = checkGlobalConformance({
      title: t,
      source: validSource,
      colors: chartColors,
    });
    expect(core.sort()).toEqual(chart.sort());
    expect(core.some((m) => m.includes("ALL CAPS"))).toBe(true);
  });

  it("matches on low-contrast text", () => {
    const badColors = { data: "#0072B2", text: ["#BBBBBB"], bg: "#FFFFFF" };
    const core = conformanceL0({
      title: validTitle,
      source: validSource,
      textColors: badColors,
    });
    const chart = checkGlobalConformance({
      title: validTitle,
      source: validSource,
      colors: badColors,
    });
    expect(core.sort()).toEqual(chart.sort());
    expect(core.some((m) => m.includes("contrast"))).toBe(true);
  });
});

describe("core.conformanceL0 — parity with map-native's checkGlobalMapConformance", () => {
  const mapOk = {
    title: "Renewables power most of Europe's north, less of its south",
    description: "Share of electricity from renewables, by country, 2024",
    source: validSource,
  };

  it("matches on a fully valid header (title/source/contrast subset)", () => {
    const core = conformanceL0({
      title: mapOk.title,
      source: mapOk.source,
      textColors: mapTextColors,
    });
    const map = checkGlobalMapConformance(mapOk, mapTextColors);
    expect(core).toEqual([]);
    expect(map).toEqual([]);
  });

  it("matches on a too-short title", () => {
    const core = conformanceL0({
      title: "Too short",
      source: mapOk.source,
      textColors: mapTextColors,
    });
    const map = checkGlobalMapConformance(
      { ...mapOk, title: "Too short" },
      mapTextColors,
    );
    // map's output additionally has none extra here (description present) — compare
    // the title-related violation is present in both.
    expect(core.some((m) => m.includes("too short"))).toBe(true);
    expect(map.some((m) => m.includes("too short"))).toBe(true);
  });

  it("matches on an ALL CAPS title", () => {
    const t = "RENEWABLES POWER EUROPE'S NORTH AND ITS SOUTH TOO";
    const core = conformanceL0({
      title: t,
      source: mapOk.source,
      textColors: mapTextColors,
    });
    const map = checkGlobalMapConformance(
      { ...mapOk, title: t },
      mapTextColors,
    );
    expect(core.some((m) => /ALL CAPS/.test(m))).toBe(true);
    expect(map.some((m) => /ALL CAPS/.test(m))).toBe(true);
  });

  it("matches on a missing source name", () => {
    const core = conformanceL0({
      title: mapOk.title,
      source: {},
      textColors: mapTextColors,
    });
    const map = checkGlobalMapConformance(
      { ...mapOk, source: {} },
      mapTextColors,
    );
    expect(core).toContain("missing source name");
    expect(map).toContain("missing source name");
  });
});

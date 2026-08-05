import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProduceMapDwConformance } from "../produce-conformance";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";

// TDD floor for Tier-2 #10 — map-dw was the weakest-guarded engine per the quality audit:
// produce.ts checked i18n source metadata, rendered PNG size, and join-match rate, but
// NOTHING checked furniture (title/source/alt-text) or mark-colour contrast/CVD-safety.
// These tests are PURE (no DW API, no network) so they run inside the fast gate — mirrors
// produce-format.test.ts's / e2e.test.ts's own no-token posture.

// A minimal, otherwise-conformant choropleth spec (title/source/altInsight all valid) —
// callers override only the field(s) under test. colorScale/brandHue/brandExplicit are
// left unset by default (the DEFAULT_BLUE path — always CVD-safe, nothing chosen to check).
function choroplethSpec(extra: Record<string, unknown> = {}): MapSpec {
  return {
    mapType: "choropleth",
    basemap: "world-2019",
    mapKeyAttr: "DW_STATE_CODE",
    regionKey: "code",
    valueColumn: "value",
    data: "code,value\nUSA,88\nFRA,84\nDEU,92\nGBR,95",
    title: "Internet penetration across four large economies",
    altInsight:
      "Internet penetration ranges from 84% in France to 95% in the UK",
    source: { name: "ITU" },
    ...extra,
  } as unknown as MapSpec;
}

function locatorSpec(extra: Record<string, unknown> = {}): MapSpec {
  return {
    mapType: "locator",
    title: "Three sites along the Arve valley",
    altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
    source: { name: "OpenStreetMap" },
    markers: [
      { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
      { lng: 6.1432, lat: 46.2044, label: "Geneva" },
      { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
    ],
    ...extra,
  } as unknown as MapSpec;
}

// A dark-light-dark ramp — luminance goes 0 -> 1 -> 0, neither monotonically increasing
// nor decreasing, so isMonotonicLuminanceRamp (house-ramp.ts's own documented CVD-safety
// criterion for a sequential ramp) rejects it.
const NON_MONOTONIC_RAMP = [
  { color: "#000000", position: 0 },
  { color: "#ffffff", position: 0.5 },
  { color: "#000000", position: 1 },
];

// A light -> dark blue ramp (luminance strictly decreasing) — CVD-safe.
const SAFE_RAMP = [
  { color: "#deebf7", position: 0 },
  { color: "#0072b2", position: 1 },
];

describe("runProduceMapDwConformance — L0 furniture floor", () => {
  it("flags a missing/too-short title as a violation", () => {
    const { violations } = runProduceMapDwConformance(
      choroplethSpec({ title: "Map" }),
    );
    expect(violations.some((v) => /title too short/.test(v))).toBe(true);
  });

  it("flags an ALL CAPS title as a violation", () => {
    const { violations } = runProduceMapDwConformance(
      choroplethSpec({ title: "INTERNET PENETRATION IN EUROPE" }),
    );
    expect(violations.some((v) => /ALL CAPS/.test(v))).toBe(true);
  });

  it("flags a missing source name as a violation (the real, previously-unguarded gap)", () => {
    const { violations } = runProduceMapDwConformance(
      choroplethSpec({ source: undefined }),
    );
    expect(violations.some((v) => /missing source name/.test(v))).toBe(true);
  });

  it("flags a missing altInsight as a violation (WCAG 1.1.1)", () => {
    const { violations } = runProduceMapDwConformance(
      choroplethSpec({ altInsight: "" }),
    );
    expect(violations.some((v) => /altInsight/.test(v))).toBe(true);
  });

  it("a fully conformant choropleth spec has no violations and no concerns", () => {
    const result = runProduceMapDwConformance(choroplethSpec());
    expect(result.violations).toEqual([]);
    expect(result.concerns).toEqual([]);
  });

  it("a fully conformant locator spec has no violations and no concerns", () => {
    const result = runProduceMapDwConformance(locatorSpec());
    expect(result.violations).toEqual([]);
    expect(result.concerns).toEqual([]);
  });
});

describe("runProduceMapDwConformance — choropleth ramp CVD-safety (always hard, no downgrade)", () => {
  it("rejects an explicit colorScale that is not CVD-safe (hard violation)", () => {
    const result = runProduceMapDwConformance(
      choroplethSpec({ colorScale: NON_MONOTONIC_RAMP }),
    );
    expect(result.violations.some((v) => /not CVD-safe/.test(v))).toBe(true);
    expect(result.concerns).toEqual([]);
  });

  // Tier-2 #10 review finding: this used to downgrade a brand-explicit failing ramp to a
  // kept concern, claiming to mirror map-native's "policy b" / dw-chart's F2 — but neither
  // precedent covers the RAMP case. map-native pushes a RAMP_TYPES CVD failure straight into
  // `violations` unconditionally (policy b there is ONLY the single-fill WCAG 1.4.11
  // contrast concern for symbol/route/dot-density); chart-native's heatmap ramp CVD failure
  // ("luminance is not monotonic") is never matched by reconcileBrandViolations's
  // CVD_VIOLATION regex (categorical-only), so it too is always hard. The downgrade made
  // map-dw MORE LENIENT than both siblings for the same construct. Tightened: brandExplicit
  // no longer downgrades a ramp CVD failure — it is hard-rejected like its siblings.
  it("hard-rejects a failing ramp even when it is the newsroom's own brand colour (matches map-native/chart-native — no lenient outlier)", () => {
    const result = runProduceMapDwConformance(
      choroplethSpec({ colorScale: NON_MONOTONIC_RAMP, brandExplicit: true }),
    );
    expect(result.violations.some((v) => /not CVD-safe/.test(v))).toBe(true);
    expect(result.concerns).toEqual([]);
  });

  it("a CVD-safe explicit colorScale has no violations or concerns", () => {
    const result = runProduceMapDwConformance(
      choroplethSpec({ colorScale: SAFE_RAMP }),
    );
    expect(result.violations).toEqual([]);
    expect(result.concerns).toEqual([]);
  });

  it("the DEFAULT_BLUE path (no colorScale, no brandHue) is never checked — always safe", () => {
    const result = runProduceMapDwConformance(choroplethSpec());
    expect(result.violations).toEqual([]);
  });

  it("locator markers are OUT of scope for the ramp/contrast check (they cycle a palette, not a single fill — mirrors map-native's own exclusion)", () => {
    const result = runProduceMapDwConformance(
      locatorSpec({
        markers: [
          { lng: 6.2347, lat: 46.1939, label: "Annemasse", color: "#000000" },
        ],
      }),
    );
    expect(result.violations).toEqual([]);
    expect(result.concerns).toEqual([]);
  });
});

async function withoutToken(fn: () => Promise<void>): Promise<void> {
  // "No token" means BOTH homes are empty (registry E17): clearing process.env alone stopped
  // being enough the day the producer started reading the key where the preflight judged it —
  // the install's own .env. SPLASH_INSTALL_ROOT is the seam that tells a test apart from a
  // developer's real install.
  const saved = process.env.DATAWRAPPER_API_TOKEN;
  const savedRoot = process.env.SPLASH_INSTALL_ROOT;
  delete process.env.DATAWRAPPER_API_TOKEN;
  process.env.SPLASH_INSTALL_ROOT = mkdtempSync(
    join(tmpdir(), "no-token-install-"),
  );
  try {
    await fn();
  } finally {
    if (saved !== undefined) process.env.DATAWRAPPER_API_TOKEN = saved;
    if (savedRoot !== undefined) process.env.SPLASH_INSTALL_ROOT = savedRoot;
    else delete process.env.SPLASH_INSTALL_ROOT;
  }
}

describe("produceMap — conformance floor fires BEFORE any API call", () => {
  it("rejects a spec with no cited source with the conformance error (not the missing-token error)", async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-conformance-source-${Date.now()}.png`);
      await expect(
        produceMap(locatorSpec({ source: undefined }), out, {
          format: "static",
        }),
      ).rejects.toThrow(
        /map-dw conformance floor failed.*missing source name/s,
      );
      expect(existsSync(out)).toBe(false);
    });
  });

  it("rejects a choropleth with a non-brand CVD-unsafe colorScale BEFORE the dataless-join guard's live basemap fetch", async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-conformance-ramp-${Date.now()}.png`);
      await expect(
        produceMap(choroplethSpec({ colorScale: NON_MONOTONIC_RAMP }), out, {
          format: "static",
        }),
      ).rejects.toThrow(/map-dw conformance floor failed.*not CVD-safe/s);
      expect(existsSync(out)).toBe(false);
    });
  });

  it("accepts a conformant locator spec — the next failure is the missing token, i.e. the API step", async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-conformance-ok-${Date.now()}.png`);
      await expect(
        produceMap(locatorSpec(), out, { format: "static" }),
      ).rejects.toThrow(/DATAWRAPPER_API_TOKEN is not set/);
      expect(existsSync(out)).toBe(false);
    });
  });
});

/**
 * ROUND-FIVE FINDING Y3. The accent reached no non-bar chart type, because round three fixed the
 * family it happened to measure on rather than the field it had measured. `accentPaintsTheMarks` is
 * the decision that says what both live measurements actually found, once: the recorded accent has
 * to be in `base-color`, whatever the mark.
 */
import { describe, expect, it } from "bun:test";
import { accentPaintsTheMarks } from "../scripts/detect-accent-reaches-the-marks.mjs";
import { buildChartPayload } from "../scripts/metadata-spec.mjs";

const DATA = [
  { year: 1950, coverage: 10.25 },
  { year: 1967, coverage: 32.53 },
  { year: 2024, coverage: 32.07 },
];

function baseSpec(overrides = {}) {
  return {
    takeaway: "Coverage does not follow size",
    limits: "All municipalities surveyed.",
    credit: "unattributed",
    effectiveDate: "2025-06-30",
    language: "en",
    color: "#5B8A8A",
    chartType: "d3-scatter-plot",
    format: "static",
    data: DATA,
    ...overrides,
  };
}

describe("accentPaintsTheMarks", () => {
  it("passes the payload this producer builds, for a mark family that is not a bar", () => {
    expect(accentPaintsTheMarks(buildChartPayload(baseSpec()), "#5B8A8A")).toBe(true);
  });

  it("passes for a bar/column family too — one decision, not a per-type table", () => {
    expect(accentPaintsTheMarks(buildChartPayload(baseSpec({ chartType: "d3-bars" })), "#5B8A8A")).toBe(
      true,
    );
  });

  // The exact payload the delivered stress-y scatter was produced from: the accent present, stored,
  // echoed back on a GET, and in the key round three had already measured inert.
  it("refuses a payload carrying the accent only in custom-colors", () => {
    const payload = buildChartPayload(baseSpec());
    delete payload.metadata.visualize["base-color"];
    expect(payload.metadata.visualize["custom-colors"]).toEqual({ Coverage: "#5B8A8A" });
    expect(accentPaintsTheMarks(payload, "#5B8A8A")).toBe(false);
  });

  it("refuses a payload painting a different colour from the one recorded", () => {
    const payload = buildChartPayload(baseSpec());
    payload.metadata.visualize["base-color"] = "#18A1CD";
    expect(accentPaintsTheMarks(payload, "#5B8A8A")).toBe(false);
  });

  it("does not care about the case a hex was written in", () => {
    const payload = buildChartPayload(baseSpec({ color: "#5b8a8a" }));
    expect(accentPaintsTheMarks(payload, "#5B8A8A")).toBe(true);
  });

  it("says nothing when no accent was recorded to check against", () => {
    expect(accentPaintsTheMarks({ metadata: { visualize: {} } }, "")).toBe(true);
  });
});

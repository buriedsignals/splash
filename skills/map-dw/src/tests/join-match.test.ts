import { describe, it, expect } from "bun:test";
import {
  joinMatchRate,
  columnValues,
  assessJoinMatch,
  datalessJoinError,
  MIN_JOIN_MATCH_RATE,
} from "../join-match";

describe("joinMatchRate (pure)", () => {
  it("is 0 when no data code matches a region (the dataless join)", () => {
    const region = new Set(["FRA", "DEU", "SWE"]);
    expect(joinMatchRate(region, ["USA", "CHN", "IND"])).toBe(0);
  });

  it("is 1 when every data code matches a region", () => {
    const region = new Set(["FRA", "DEU", "SWE"]);
    expect(joinMatchRate(region, ["FRA", "DEU", "SWE"])).toBe(1);
  });

  it("is the matched fraction for a partial join", () => {
    const region = new Set(["FRA", "DEU", "SWE"]);
    expect(joinMatchRate(region, ["FRA", "USA"])).toBe(0.5);
  });

  it("is 0 for empty data (nothing to encode)", () => {
    expect(joinMatchRate(new Set(["FRA"]), [])).toBe(0);
  });
});

describe("columnValues (pure)", () => {
  it("extracts the trimmed, non-empty values of a named column", () => {
    const csv = "code,value\nFRA,10\nDEU,40\nSWE,70";
    expect(columnValues(csv, "code")).toEqual(["FRA", "DEU", "SWE"]);
  });

  it("returns [] for an absent column or header-only data", () => {
    expect(columnValues("code,value\nFRA,10", "nope")).toEqual([]);
    expect(columnValues("code,value", "code")).toEqual([]);
  });
});

describe("dataless-join guard threshold", () => {
  it("MIN_JOIN_MATCH_RATE sits strictly between a failed (0) and a healthy (1) join", () => {
    expect(MIN_JOIN_MATCH_RATE).toBeGreaterThan(0);
    expect(MIN_JOIN_MATCH_RATE).toBeLessThan(1);
  });

  it("a zero-match report reads as a dataless-choropleth failure that names the grey outcome", () => {
    const msg = datalessJoinError({
      rate: 0,
      matched: 0,
      total: 10,
      basemap: "world-2019",
      mapKeyAttr: "ISO_A3",
    });
    expect(msg).toMatch(/dataless choropleth/);
    expect(msg).toMatch(/grey/);
    expect(msg).toMatch(/ISO_A3/);
  });
});

// Live: prove the guard's real join-match rate against the actual DW basemap geometry —
// ISO_A3 on world-2019 matches 0 rows (grey), DW_STATE_CODE matches them all.
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;
const data = "code,value\nUSA,88\nFRA,84\nDEU,92\nGBR,95";

d("assessJoinMatch (live)", () => {
  it("reports rate 0 for the wrong key (ISO_A3 on world-2019) — below the guard threshold", async () => {
    const r = await assessJoinMatch("world-2019", "ISO_A3", data, "code");
    expect(r.rate).toBe(0);
    expect(r.rate).toBeLessThan(MIN_JOIN_MATCH_RATE);
  }, 30000);

  it("reports rate 1 for the correct key (DW_STATE_CODE on world-2019)", async () => {
    const r = await assessJoinMatch(
      "world-2019",
      "DW_STATE_CODE",
      data,
      "code",
    );
    expect(r.rate).toBe(1);
    expect(r.rate).toBeGreaterThanOrEqual(MIN_JOIN_MATCH_RATE);
  }, 30000);
});

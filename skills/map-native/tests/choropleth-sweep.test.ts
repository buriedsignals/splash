// The choropleth's own adapter to the sweep carriers — the seam that made `time` and `space`
// REACHABLE. Both were written and tested in the pure core and could not be chosen from a
// choropleth: its marks carried `{name, value}` alone, so `carriersFor` never offered them and
// every region landed at the end of the sweep.

import { describe, it, expect } from "bun:test";
import {
  choroplethCarriers,
  choroplethSweepMarks,
  parseSweepTimes,
  regionCentroids,
} from "../src/choropleth-sweep";
import { sweepStops } from "../src/sweep-carrier";
import { validateChoroplethConfig } from "../src/validate-config";

const ROWS = [
  { code: "NOR", share: 99, first: 1991 },
  { code: "POL", share: 21, first: 2005 },
  { code: "DEU", share: 59, first: 1998 },
];

const NO_PLACE = () => undefined;

/** Three square regions, west to east, as a basemap hands them over. */
const WORLD: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: (
    [
      ["NOR", 8],
      ["DEU", 10],
      ["POL", 19],
    ] as [string, number][]
  ).map(([code, lon]) => ({
    type: "Feature" as const,
    properties: { iso: code },
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [lon - 1, 50],
          [lon + 1, 50],
          [lon + 1, 52],
          [lon - 1, 52],
          [lon - 1, 50],
        ],
      ],
    },
  })),
};

describe("a declared timeField makes `time` reachable", () => {
  it("offers the time carrier, and the stops follow the dates", () => {
    const fields = {
      regionKey: "code",
      valueField: "share",
      timeField: "first",
    };
    expect(choroplethCarriers(ROWS, fields).map((c) => c.kind)).toContain(
      "time",
    );

    const stops = sweepStops(
      "time",
      choroplethSweepMarks(ROWS, fields, NO_PLACE),
    );
    // 1991 → 2005: the earliest lights up first, the latest last, and the middle sits where
    // its own date sits — not where its VALUE sits (99, 21, 59 would order NOR, DEU, POL).
    expect(stops.NOR).toBe(0);
    expect(stops.POL).toBe(1);
    expect(stops.DEU).toBeCloseTo((1998 - 1991) / (2005 - 1991), 5);
  });

  it("without it, `time` is not offered — a temporal-looking column is never guessed", () => {
    const kinds = choroplethCarriers(ROWS, {
      regionKey: "code",
      valueField: "share",
    }).map((c) => c.kind);
    expect(kinds).not.toContain("time");
  });
});

describe("parseSweepTimes — one scale for the whole column", () => {
  it("reads bare years as years", () => {
    expect(parseSweepTimes([1991, "2005", 1998])).toEqual([1991, 2005, 1998]);
  });

  it("reads ISO dates as milliseconds", () => {
    expect(parseSweepTimes(["2019-03-04", "2019-03-05"])).toEqual([
      Date.parse("2019-03-04"),
      Date.parse("2019-03-05"),
    ]);
  });

  it("a mixed column goes through one parser, never two units in one sweep", () => {
    // 2019 alongside a full date must not become 2019 alongside 1.5e12 — that is not an
    // ordering, it is an artefact of two units.
    const parsed = parseSweepTimes(["2019", "2020-06-01"]);
    expect(parsed[0]).toBe(Date.parse("2019"));
    expect(parsed[1]! - parsed[0]!).toBeGreaterThan(0);
  });

  it("a cell it cannot read yields nothing, so the mark lands at the end", () => {
    const stops = sweepStops("time", [
      { name: "a", time: parseSweepTimes(["2001", "n/a"])[0] },
      { name: "b", time: parseSweepTimes(["2001", "n/a"])[1] },
      { name: "c", time: 2003 },
    ]);
    expect(stops.b).toBe(1);
  });
});

describe("region centroids make `space` reachable", () => {
  it("reads a centre for every region the data names", () => {
    const c = regionCentroids(WORLD, "iso", ["NOR", "DEU", "POL"]);
    expect(c.get("NOR")).toEqual([8, 51]);
    expect(c.get("POL")).toEqual([19, 51]);
  });

  it("offers the space carrier, and sweeps west→east across the real geometry", () => {
    const centroids = regionCentroids(WORLD, "iso", ["NOR", "DEU", "POL"]);
    const marks = choroplethSweepMarks(
      ROWS,
      { regionKey: "code", valueField: "share" },
      (k) => centroids.get(k),
    );
    expect(
      choroplethCarriers(ROWS, {
        regionKey: "code",
        valueField: "share",
      }).map((c) => c.kind),
    ).toContain("space");

    const stops = sweepStops("space", marks);
    expect(stops.NOR).toBe(0); // lon 8, the westernmost
    expect(stops.POL).toBe(1); // lon 19
    expect(stops.DEU).toBeCloseTo((10 - 8) / (19 - 8), 5);
  });

  it("a region the geometry does not carry has no place, and lands at the end", () => {
    const centroids = regionCentroids(WORLD, "iso", ["NOR", "DEU", "POL"]);
    const marks = choroplethSweepMarks(
      [...ROWS, { code: "ATL", share: 40, first: 2010 }],
      { regionKey: "code", valueField: "share" },
      (k) => centroids.get(k),
    );
    expect(sweepStops("space", marks).ATL).toBe(1);
  });
});

describe("a choropleth with neither still has carriers — no subject is excluded", () => {
  it("offers threshold and order", () => {
    expect(
      choroplethCarriers(ROWS, { regionKey: "code", valueField: "share" }).map(
        (c) => c.kind,
      ),
    ).toEqual(["threshold", "space", "order"]);
  });

  it("with no numeric column either, order alone remains", () => {
    const marks = choroplethSweepMarks(
      [{ code: "NOR", share: "n/a" }],
      { regionKey: "code", valueField: "share" },
      NO_PLACE,
    );
    // NaN is a `number` to typeof — unguarded it would offer `threshold` on a column that
    // cannot drive one.
    expect(marks[0]!.value).toBeUndefined();
  });
});

const BASE = {
  regionKey: "code",
  valueField: "share",
  rows: ROWS,
  basemap: "world",
  title: "Renewables form a clear north–south gradient across Europe",
  description: "Share of electricity from renewables, by country, 2024",
  valueUnit: "%",
  source: { name: "Ember", url: "https://example.org" },
};

describe("validateChoroplethConfig — a carrier the data cannot drive is refused BY NAME", () => {
  it("accepts a carrier the rows can drive", () => {
    expect(
      validateChoroplethConfig({ ...BASE, sweepCarrier: "threshold" }).ok,
    ).toBe(true);
    expect(
      validateChoroplethConfig({
        ...BASE,
        timeField: "first",
        sweepCarrier: "time",
      }).ok,
    ).toBe(true);
  });

  it("refuses `time` without a timeField, and names the act that resolves it", () => {
    const r = validateChoroplethConfig({ ...BASE, sweepCarrier: "time" });
    expect(r.ok).toBe(false);
    const msg = (r as { errors: string[] }).errors.join(" ");
    expect(msg).toContain("no date");
    expect(msg).toContain("timeField");
    expect(msg).not.toMatch(/invalid|unsupported/i);
  });

  it("refuses `route` on a choropleth, and names the map that carries a path", () => {
    const r = validateChoroplethConfig({ ...BASE, sweepCarrier: "route" });
    expect(r.ok).toBe(false);
    expect((r as { errors: string[] }).errors.join(" ")).toContain("route map");
  });

  it("refuses a carrier that is not one of the five, listing the five", () => {
    const r = validateChoroplethConfig({ ...BASE, sweepCarrier: "clock" });
    expect(r.ok).toBe(false);
    expect((r as { errors: string[] }).errors.join(" ")).toContain(
      "route, time, threshold, space, order",
    );
  });

  it("refuses a timeField that names no column, listing the columns there are", () => {
    const r = validateChoroplethConfig({ ...BASE, timeField: "year" });
    expect(r.ok).toBe(false);
    const msg = (r as { errors: string[] }).errors.join(" ");
    expect(msg).toContain('timeField "year"');
    expect(msg).toContain("first");
  });

  it("says nothing at all when no carrier is declared — the invariant that bounds the lot", () => {
    const r = validateChoroplethConfig(BASE);
    expect(r.ok).toBe(true);
  });
});

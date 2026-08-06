import { describe, it, expect } from "bun:test";
import { sweepMarksFrom } from "../src/sweep-marks";
import {
  CARRIER_KINDS,
  carriersFor,
  whyNotOffered,
} from "../src/sweep-carrier";

describe("sweepMarksFrom — a config's own data, read as marks", () => {
  it("keys a region table on the join column, the way the components key it", () => {
    const read = sweepMarksFrom({
      basemap: "world",
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "NOR", share: 99 },
        { code: "SWE", share: 68 },
      ],
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    // No `type` at all IS the choropleth's shape — mount.tsx's default.
    expect(read.type).toBe("choropleth");
    expect(read.marks.map((m) => [m.name, m.value])).toEqual([
      ["NOR", 99],
      ["SWE", 68],
    ]);
    // A region is a shape on the basemap, so it has a place — choropleth-sweep.ts's pre-render
    // stand-in, which is what makes the geographic sweep offerable on a region table.
    expect(read.marks.every((m) => typeof m.lon === "number")).toBe(true);
  });

  it("reads a cartogram's human label when one is declared, its id otherwise", () => {
    const values = [
      { id: "CHN", name: "Chine", value: 11 },
      { id: "IND", name: "Inde", value: 2.6 },
    ];
    const withLabel = sweepMarksFrom({
      type: "cartogram",
      labelField: "name",
      values,
    });
    expect(withLabel.ok && withLabel.marks.map((m) => m.name)).toEqual([
      "Chine",
      "Inde",
    ]);
    const bare = sweepMarksFrom({ type: "cartogram", values });
    expect(bare.ok && bare.marks.map((m) => m.name)).toEqual(["CHN", "IND"]);
  });

  it("carries a point's coordinates, which is what makes the geographic sweep readable", () => {
    const read = sweepMarksFrom({
      type: "symbol",
      basemap: "world",
      points: [
        { lon: 2.35, lat: 48.85, value: 181, label: "Paris" },
        { lon: -0.12, lat: 51.5, value: 296, label: "London" },
      ],
    });
    expect(read.ok && carriersFor(read.marks).map((c) => c.kind)).toEqual([
      "threshold",
      "space",
      "order",
    ]);
  });

  it("gives an unlabelled mark a position rather than an empty name", () => {
    const read = sweepMarksFrom({
      type: "locator",
      basemap: "world",
      markers: [
        { lon: 2.35, lat: 48.85 },
        { lon: 4.9, lat: 52.4 },
      ],
    });
    expect(read.ok && read.marks.map((m) => m.name)).toEqual(["#1", "#2"]);
  });

  // A half-empty column is the newsroom's own data; reading it as a number would offer a
  // carrier with nothing to advance on (`typeof NaN === "number"`).
  it("drops a value that is not a number, and a date the column cannot yield", () => {
    const read = sweepMarksFrom({
      regionKey: "code",
      valueField: "share",
      timeField: "when",
      rows: [{ code: "NOR", share: "n/a", when: "soon" }],
    });
    expect(read.ok && read.marks.length).toBe(1);
    expect(read.ok && read.marks[0]!.value).toBeUndefined();
    expect(read.ok && read.marks[0]!.time).toBeUndefined();
  });

  it("reads a declared temporal column as a year or as a date", () => {
    const read = sweepMarksFrom({
      regionKey: "code",
      timeField: "when",
      rows: [
        { code: "A", when: 2019 },
        { code: "B", when: "2021-11-14" },
      ],
    });
    expect(read.ok && read.marks.map((m) => typeof m.time)).toEqual([
      "number",
      "number",
    ]);
  });

  // The two types whose marks are computed at produce time — answered with the reason, never
  // with a list assembled from whatever else the file carries.
  it("refuses to read the types whose marks only exist after produce", () => {
    for (const [type, word] of [
      ["route", "territories"],
      ["hex-grid", "cells"],
    ] as const) {
      const read = sweepMarksFrom({ type, basemap: "world" });
      expect(read.ok).toBe(false);
      if (read.ok) continue;
      expect(read.type).toBe(type);
      expect(read.why).toContain(word);
    }
  });

  // `type: null` is the "not a map at all" answer, which is an input problem rather than a
  // statement about a map — the host turns it into a usage refusal.
  it("separates a file that is not a map config from a map it cannot read", () => {
    for (const bad of [
      null,
      "a string",
      [1, 2],
      { type: "bar", rows: [] },
      { title: "a chart with no type and no rows" },
    ]) {
      const read = sweepMarksFrom(bad);
      expect(read.ok).toBe(false);
      if (read.ok) continue;
      expect(read.type).toBeNull();
      expect(read.why.length).toBeGreaterThan(10);
    }
  });
});

// The offer a journalist reads is `carriersFor(marks)`, and the rest of `CARRIER_KINDS` is what
// gets NAMED with its reason instead of going silently missing (lib/host/cli.ts's
// sweep-carriers). Both halves of that subtraction have to hold up.
describe("the set an offer is subtracted from", () => {
  it("gives every carrier a reason it can say when it is not offered", () => {
    for (const kind of CARRIER_KINDS)
      expect(whyNotOffered(kind).length).toBeGreaterThan(20);
  });

  it("covers everything an offer can hold, so nothing falls between the two lists", () => {
    const offered = carriersFor([
      { name: "a", value: 1, time: 2019, lon: 1, lat: 2, routeStop: 0.5 },
      { name: "b", value: 2, time: 2021, lon: 3, lat: 4, routeStop: 1 },
    ]).map((c) => c.kind);
    expect(offered.length).toBe(CARRIER_KINDS.length);
    expect(offered.every((k) => CARRIER_KINDS.includes(k))).toBe(true);
  });
});

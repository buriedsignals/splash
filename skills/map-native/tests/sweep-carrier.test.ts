import { describe, it, expect } from "bun:test";
import { carriersFor, sweepStops, type SweepMark } from "../src/sweep-carrier";

const MARKS: SweepMark[] = [
  { name: "Valais", value: 5, lon: 7.5, lat: 46.2, time: 2019 },
  { name: "Vaud", value: 12, lon: 6.6, lat: 46.5, time: 2021 },
  { name: "Grisons", value: 8, lon: 9.8, lat: 46.7, time: 2020 },
];

describe("carriersFor — read from the data, never recited", () => {
  it("offers every carrier the data can drive, order last", () => {
    expect(carriersFor(MARKS).map((c) => c.kind)).toEqual([
      "time",
      "threshold",
      "space",
      "order",
    ]);
  });

  it("a map with only names still gets one carrier — no subject is excluded", () => {
    expect(carriersFor([{ name: "a" }, { name: "b" }]).map((c) => c.kind)).toEqual(["order"]);
  });

  it("a route's own arrival fraction leads when the config carries one", () => {
    const withRoute = MARKS.map((m, i) => ({ ...m, routeStop: i / 2 }));
    expect(carriersFor(withRoute)[0]!.kind).toBe("route");
  });
});

describe("sweepStops — where each mark sits on the sweep", () => {
  it("threshold DESCENDS: the highest value lights up first", () => {
    const s = sweepStops("threshold", MARKS);
    expect(s.Vaud).toBe(0); // 12, the highest
    expect(s.Valais).toBe(1); // 5, the lowest
    expect(s.Grisons).toBeCloseTo(1 - (8 - 5) / 7, 5);
  });

  it("time ADVANCES: the earliest date lights up first", () => {
    const s = sweepStops("time", MARKS);
    expect(s.Valais).toBe(0); // 2019
    expect(s.Vaud).toBe(1); // 2021
  });

  it("space sweeps west→east by default, and honours a bearing", () => {
    const west = sweepStops("space", MARKS);
    expect(west.Vaud).toBe(0); // lon 6.6, the westernmost
    expect(west.Grisons).toBe(1); // lon 9.8
    const northSouth = sweepStops("space", MARKS, { bearingDeg: 0 });
    expect(northSouth.Valais).toBe(0); // lat 46.2, the southernmost
  });

  it("order is the walk itself — this is what a stepped video already is", () => {
    expect(sweepStops("order", MARKS)).toEqual({ Valais: 0, Vaud: 0.5, Grisons: 1 });
  });

  it("a mark the carrier cannot place lands at the END, never first", () => {
    // Putting it first would assert a rank the data never gave.
    const s = sweepStops("threshold", [...MARKS, { name: "Inconnu" }]);
    expect(s.Inconnu).toBe(1);
  });

  it("marks that share one value light together rather than in an invented order", () => {
    const flat = sweepStops("threshold", [
      { name: "a", value: 3 },
      { name: "b", value: 3 },
    ]);
    expect(flat).toEqual({ a: 0, b: 0 });
  });

  it("a carrier that can read nothing leaves the map empty until the close", () => {
    const s = sweepStops("time", [{ name: "a" }, { name: "b" }]);
    expect(s).toEqual({ a: 1, b: 1 });
  });
});

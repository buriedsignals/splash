// lib/geo/join.test.ts
import { describe, it, expect } from "bun:test";
import {
  unresolvedGeoJoins,
  staleGeoJoinDecisions,
  type GeoJoinLedger,
} from "./join";

describe("unresolvedGeoJoins", () => {
  it("returns an empty list when there is no ledger at all (nothing pending yet)", () => {
    expect(unresolvedGeoJoins(undefined)).toEqual([]);
  });

  it("lists the pending values by name — the fixture: 'Buenos Aires', ambiguous between the province and the autonomous city (spec D6, measured)", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [],
      pending: ["Buenos Aires"],
    };
    expect(unresolvedGeoJoins(ledger)).toEqual(["Buenos Aires"]);
  });

  it("drops a value once it has a decision recorded", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [
        {
          value: "Buenos Aires",
          featureId: "ARG-buenosaires-city",
          basis: "journalist",
        },
      ],
      pending: [],
    };
    expect(unresolvedGeoJoins(ledger)).toEqual([]);
  });
});

describe("staleGeoJoinDecisions", () => {
  it("is false when there is no ledger yet — nothing to be stale", () => {
    expect(staleGeoJoinDecisions(undefined, "abc123")).toBe(false);
  });

  it("is false when the ledger's geographySha256 matches the current file's hash", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [],
      pending: [],
    };
    expect(staleGeoJoinDecisions(ledger, "abc123")).toBe(false);
  });

  it("is true when the geometry file changed under an already-decided ledger — the PH-13 fixture (spec D6): a code REASSIGNED to a different region must not silently replay", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "hash-of-2019-boundaries",
      decisions: [
        { value: "PH-13", featureId: "old-region-13", basis: "journalist" },
      ],
      pending: [],
    };
    expect(staleGeoJoinDecisions(ledger, "hash-of-2024-boundaries")).toBe(true);
  });
});

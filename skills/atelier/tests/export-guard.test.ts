import { describe, it, expect } from "bun:test";
import { assertShippable } from "../src/export-guard";
import type { ProduceReport } from "../src/producer-spec";

const rep = (over: Partial<ProduceReport["results"][0]>): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      renderApproved: true,
      ...over,
    },
  ],
});

describe("assertShippable", () => {
  it("passes a produced + render-approved proposal", () => {
    expect(() => assertShippable(rep({}), "p1")).not.toThrow();
  });
  it("refuses a produced-but-unapproved proposal", () => {
    expect(() => assertShippable(rep({ renderApproved: false }), "p1")).toThrow(
      /not render-approved/,
    );
  });
  it("refuses an unproduced proposal", () => {
    expect(() =>
      assertShippable(rep({ status: "failed", renderApproved: false }), "p1"),
    ).toThrow(/not produced/);
  });
});

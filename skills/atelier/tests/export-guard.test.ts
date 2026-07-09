import { describe, it, expect } from "bun:test";
import { assertShippable, assertDelivered } from "../src/export-guard";
import type { ProduceReport } from "../src/producer-spec";

const rep = (over: Partial<ProduceReport["results"][0]>): ProduceReport => ({
  results: [
    {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      reviewed: true,
      renderApproved: true,
      ...over,
    },
  ],
});

describe("assertShippable", () => {
  it("passes a produced + reviewed + render-approved proposal", () => {
    expect(() => assertShippable(rep({}), "p1")).not.toThrow();
  });
  it("refuses a produced-but-unreviewed proposal", () => {
    expect(() => assertShippable(rep({ reviewed: false }), "p1")).toThrow(
      /not render-reviewed/,
    );
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

describe("assertDelivered", () => {
  it("passes an interactive export folder that carries interactive.html + static.html + EMBED.md", () => {
    expect(() =>
      assertDelivered(["interactive.html", "static.html", "EMBED.md"]),
    ).not.toThrow();
  });
  it("refuses an interactive export missing the static.html a11y fallback", () => {
    expect(() => assertDelivered(["interactive.html", "EMBED.md"])).toThrow(
      /static\.html/,
    );
  });
  it("refuses a folder with no EMBED.md (export-code never completed)", () => {
    expect(() => assertDelivered(["interactive.html", "static.html"])).toThrow(
      /EMBED\.md/,
    );
  });
  it("refuses produce-time byproducts masquerading as a delivery (no .html)", () => {
    expect(() =>
      assertDelivered(["static.png", "interactive.png", "EMBED.md"]),
    ).toThrow(/no \.html/);
  });
  it("exempts a scrolly from the static.html requirement", () => {
    expect(() =>
      assertDelivered(["scrolly.html", "EMBED.md"], { scrolly: true }),
    ).not.toThrow();
  });
});

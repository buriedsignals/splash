import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { flowNameLayer } from "../../skills/map-web/assets/live-flow.ts";
// @ts-expect-error untyped module
import { nameAnchor } from "../craft/web/flow-map-route-and-origin-destination/names.mjs";

const names = {
  font: ["Open Sans Regular"],
  size: 12,
  ink: "#222222",
  halo: "#eeeeee",
  places: [
    { code: "DE", text: "Allemagne", lon: 10, lat: 51, anchor: "right" },
    { code: "PL", text: "Pologne", lon: 19, lat: 52, anchor: "right" },
  ],
};

describe("flowNameLayer", () => {
  it("should carry every destination's own name as a symbol", () => {
    expect(
      flowNameLayer(names).data.features.map((f: any) => f.properties.text),
    ).toEqual(["Allemagne", "Pologne"]);
  });
  it("should give the widest band's name the first claim on the room", () => {
    expect(
      flowNameLayer(names).data.features.map((f: any) => f.properties.rank),
    ).toEqual([0, 1]);
  });
  // MapLibre drops a layer whose text-size is not a number without a word on the page: the names
  // simply never drew (a "13px" register read through Number() gave NaN, serialised as null).
  it("should refuse a size that is not a number, naming a value that works", () => {
    expect(() => flowNameLayer({ ...names, size: Number("13px") })).toThrow(
      /size .* e\.g\. 13/,
    );
  });
});

describe("nameAnchor", () => {
  it("should set a name west of a seat that lies west of the node", () => {
    expect(nameAnchor([31, 49], [10, 51])).toBe("right");
  });
  it("should set a name north of a seat that lies due north of the node", () => {
    expect(nameAnchor([31, 49], [30, 62])).toBe("bottom");
  });
});

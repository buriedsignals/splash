import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";

const symbolLayer = (layout) => ({
  id: "labels",
  type: "symbol",
  data: { type: "FeatureCollection", features: [] },
  layout,
});

describe("the expression guard", () => {
  it("should accept an offset that is a literal pair", () => {
    expect(
      validateExpressions({
        layers: [symbolLayer({ "text-offset": [0, 0.85] })],
      }),
    ).toEqual([]);
  });

  it("should accept an offset that is one expression returning a pair", () => {
    expect(
      validateExpressions({
        layers: [symbolLayer({ "text-offset": ["get", "offset"] })],
      }),
    ).toEqual([]);
  });

  it("should report an offset built as an array OF expressions, which draws nothing", () => {
    const bad = symbolLayer({
      "text-offset": [
        ["get", "ox"],
        ["get", "oy"],
      ],
    });
    expect(validateExpressions({ layers: [bad] })).toEqual([
      'layer "labels": "text-offset" is an array of expressions — MapLibre rejects it and the layer draws nothing',
    ]);
  });
});

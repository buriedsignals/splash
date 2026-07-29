import { describe, expect, it } from "bun:test";
import { isOkabeIto, nearestOkabeIto, OKABE_ITO } from "./nearest-okabe-ito";

describe("the way out of a non-CVD-safe house colour", () => {
  it("recognises the frozen set", () => {
    expect(OKABE_ITO).toHaveLength(8);
    expect(isOkabeIto("#009e73")).toBe(true);
    expect(isOkabeIto("#2E7D57")).toBe(false);
  });

  it("proposes the perceptually nearest accessible hue, not a hue-wheel neighbour", () => {
    // The measured house green from the sweep. Its nearest Okabe-Ito is the bluish green,
    // not the orange that a naive RGB distance can land on.
    expect(nearestOkabeIto("#2E7D57").hex).toBe("#009E73");
  });

  it("returns the colour itself when it is already in the set", () => {
    expect(nearestOkabeIto("#0072B2")).toEqual({ hex: "#0072B2", distance: 0 });
  });
});

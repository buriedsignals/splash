// The area video centred "38 ans après 1986 : 49,9 % du total" (600 px) on a bracket 337 px wide: the words spilled
// left over the 1973 peak and hid the ring that named it. A bracket's words sit under it only when they fit its span;
// otherwise they go to the caption band above the plot, where no reading can be under them.
import { describe, expect, it } from "bun:test";
import { bracketNoteFits } from "../craft/_shared/gesture-family-time.mjs";

const plot = { t0: 1858, t1: 2024, plotWidth: 1510 };

describe("bracketNoteFits", () => {
  it("should refuse words wider than the bracketed run", () => {
    expect(bracketNoteFits({ ...plot, width: 600, from: 1987, to: 2024 })).toBe(false);
  });
  it("should accept words that fit the bracketed run", () => {
    expect(bracketNoteFits({ ...plot, width: 300, from: 1987, to: 2024 })).toBe(true);
  });
});

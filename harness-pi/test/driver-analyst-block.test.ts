import { describe, expect, it } from "bun:test";
import { analystRefusal } from "../src/driver.ts";

// Plan U5: an analyst refusal stops the run loud, with the analyst's own words; it used to log the exit and loop until
// the run stalled on a generic "Invoke analyst" reason.
describe("analystRefusal", () => {
  it("should carry the analyst's refusal into the run's reason", () => {
    expect(analystRefusal("1", { exitCode: 1, stderr: "refused: source/data.csv is missing — intake never froze the data\n" })).toBe("analyst slot 1: refused: source/data.csv is missing — intake never froze the data");
  });

  it("should let a successful analyst through", () => {
    expect(analystRefusal("1", { exitCode: 0, stderr: "" })).toBeUndefined();
  });
});

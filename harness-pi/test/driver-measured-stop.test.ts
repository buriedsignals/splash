import { describe, expect, it } from "bun:test";
import { measuredStop } from "../src/driver.ts";

// A segmented measurement ends where its fix is measured: a full real-gwis run is 20–45 minutes, of which the
// storyboard alone is 6–16 (Osaurus runs 27–35, 2026-11-10).
describe("measuredStop", () => {
  it("should stop a storyboard measurement as soon as the run reaches production", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke analyst for the production phase." }, { SPLASH_STOP_AFTER_STORYBOARD: "1" })).toBe("storyboarded");
  });

  it("should let a storyboard measurement run while it is still framing", () => {
    expect(measuredStop({ phase: "framing", resume: "Stop at G2-treatment for slot 1" }, { SPLASH_STOP_AFTER_STORYBOARD: "1" })).toBeUndefined();
  });

  it("should stop a craft measurement when the designer is next", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke designer for the production phase." }, { SPLASH_STOP_AFTER_CRAFT: "1" })).toBe("crafted");
  });

  it("should never stop a run that measures nothing in particular", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke designer for the production phase." }, {})).toBeUndefined();
  });
});

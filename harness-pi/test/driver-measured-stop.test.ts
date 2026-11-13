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

  // Plan U1: one stop variable for every step, so each leg runs alone; the two old names still work.
  it("should stop after the analyst once a craft owner is next", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke chart-video for the production phase." }, { SPLASH_STOP_AFTER: "analyst" })).toBe("analysed");
  });

  it("should not stop after the analyst while the analyst is still next", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke analyst for the production phase. Missing: beat 1: run analyst (data.json)." }, { SPLASH_STOP_AFTER: "analyst" })).toBeUndefined();
  });

  it("should stop after the designer once the run reaches delivery", () => {
    expect(measuredStop({ phase: "delivery", resume: "Invoke deliver for the delivery phase." }, { SPLASH_STOP_AFTER: "designer" })).toBe("reviewed");
  });

  it("should read the generalised name for the craft stop", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke designer for the production phase." }, { SPLASH_STOP_AFTER: "craft" })).toBe("crafted");
  });

  it("should read the generalised name for the storyboard stop", () => {
    expect(measuredStop({ phase: "production", resume: "Invoke analyst for the production phase." }, { SPLASH_STOP_AFTER: "storyboard" })).toBe("storyboarded");
  });

  it("should refuse a stop name it does not know, naming the ones it does", () => {
    expect(() => measuredStop({ phase: "framing", resume: "" }, { SPLASH_STOP_AFTER: "palette" })).toThrow(/SPLASH_STOP_AFTER: .*storyboard, analyst, craft, designer/);
  });
});

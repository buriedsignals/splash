import { describe, it, expect } from "bun:test";
import { triggerFrameByRegion } from "./story-triggers.ts";

const beats = [
  { kind: "title", highlight: [] },
  { kind: "establish", highlight: [] },
  { kind: "reveal", highlight: ["NOR"] },
  { kind: "reveal", highlight: ["SWE"] },
  { kind: "takeaway", highlight: [] },
] as any;
const phases = [
  { startFrame: 0 },
  { startFrame: 75 },
  { startFrame: 135 },
  { startFrame: 225 },
  { startFrame: 315 },
] as any;

describe("triggerFrameByRegion", () => {
  it("maps each reveal beat's subject key to its phase startFrame", () => {
    const m = triggerFrameByRegion(beats, phases);
    expect(m.get("NOR")).toBe(135);
    expect(m.get("SWE")).toBe(225);
  });
  it("ignores non-reveal beats and empty highlights", () => {
    const m = triggerFrameByRegion(beats, phases);
    expect(m.has("")).toBe(false);
    expect(m.size).toBe(2);
  });
});

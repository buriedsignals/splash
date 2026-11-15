import { describe, expect, it } from "bun:test";
import { armOf, craftVerdict, formatOf } from "../eval/harvest.ts";

const ok = [
  "CRAFT kit: static/cartogram-area-distortion-and-tile-cartogram.gestures (gestures)",
  "TOOL write_file: \"wrote beats/1/beat.mjs\"",
  "CRAFT final render: exit 0",
];

describe("a kept run's craft leg as a gold candidate", () => {
  it("should accept a leg whose last render passed with the headline drawn", () => {
    expect(craftVerdict(ok, true).gold).toBe(true);
  });
  it("should reject a leg whose last render failed", () => {
    expect(craftVerdict([...ok.slice(0, 2), "CRAFT final render: exit 1"], true).rejected).toContain("render");
  });
  it("should reject a leg a repair carried", () => {
    expect(craftVerdict(["CRAFT repaired beat 1", ...ok], true).rejected).toContain("repair");
  });
  it("should reject a leg the fallback carried", () => {
    expect(craftVerdict(["CRAFT fallback: stock kit", ...ok], true).rejected).toContain("fallback");
  });
  it("should reject a leg whose headline is not drawn", () => {
    expect(craftVerdict(ok, false).rejected).toContain("headline");
  });
  it("should reject a run that never reached craft", () => {
    expect(craftVerdict(["STATE storyboard/blocked"], true).rejected).toContain("render");
  });
});

describe("a kept run's name", () => {
  it("should read the Qwen arm whole", () => {
    expect(armOf("gx-beeswarm-seeded-osaurus-qwen-1794761561698")).toBe("osaurus-qwen");
  });
  it("should read the 12B Osaurus arm", () => {
    expect(armOf("gx-beeswarm-seeded-osaurus-1794761561698")).toBe("osaurus");
  });
  it("should read the format from the kit line", () => {
    expect(formatOf(ok)).toBe("static");
  });
});

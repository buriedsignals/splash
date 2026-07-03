import { describe, it, expect } from "bun:test";
import { chartDistSub } from "../src/build-paths";

// Guardrail for F4: vite.config.ts and snap-proof.mjs BOTH import chartDistSub, so the
// build-write path and the snap-read path cannot diverge. Pin the contract.
describe("chartDistSub (shared build-dir path — F4 no drift)", () => {
  it("special-cases the line chart to the bare dist/<sub>", () => {
    expect(chartDistSub("line", "static")).toBe("dist/static");
    expect(chartDistSub("line", "interactive")).toBe("dist/interactive");
  });
  it("nests every other chart under dist/<chart>/<sub>", () => {
    expect(chartDistSub("bar", "static")).toBe("dist/bar/static");
    expect(chartDistSub("scatter", "interactive")).toBe(
      "dist/scatter/interactive",
    );
  });
});

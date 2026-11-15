// A failed Remotion render reached the model as its last twelve lines: eleven react-dom stack frames, and the one
// line it could act on ("… was laid out 206.29px wide in Bun …") last or cut off. The failure leads with what failed.
import { describe, expect, it } from "bun:test";
import { remotionFailure } from "../craft/_shared/remotion-failure.mjs";

const frames = Array.from({ length: 14 }, (_, i) => `at commitLayoutEffectOnFiber (node_modules/react-dom/cjs/react-dom-client.production.js:${9000 + i})`);
const error = ` Error  "20 t : 6 pays" was laid out 206.29px wide in Bun and Chrome draws it 210.98px wide — past the width agreement's max(1px, 2%) (spec §4.1).`;

describe("a failed Remotion render's text", () => {
  it("should lead with the error line when it is printed after the stack", () => {
    expect(remotionFailure(["Rendering frame 216", ...frames, error].join("\n")).split("\n")[0]).toContain("was laid out 206.29px wide");
  });

  it("should keep the error line when the stack is longer than the tail", () => {
    expect(remotionFailure([error, ...frames, ...frames].join("\n"))).toContain("was laid out 206.29px wide");
  });

  it("should not lead with a source code-frame line that merely contains the word", () => {
    expect(remotionFailure(["231 │     new Error(", ...frames, error].join("\n")).split("\n")[0]).toContain("was laid out");
  });

  it("should drop the stack frames", () => {
    expect(remotionFailure([...frames, error].join("\n"))).not.toContain("react-dom-client");
  });

  it("should fall back to the output's tail when no line names an error", () => {
    expect(remotionFailure("one\ntwo\nthree")).toBe("one\ntwo\nthree");
  });
});

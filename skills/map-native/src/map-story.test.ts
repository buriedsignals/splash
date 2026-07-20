import { describe, it, expect } from "bun:test";
import { resolveRevealMode } from "./map-story.ts";

describe("resolveRevealMode", () => {
  it("defaults to context when unset", () => {
    expect(resolveRevealMode({})).toBe("context");
  });
  it("passes through a valid sequential", () => {
    expect(resolveRevealMode({ revealMode: "sequential" })).toBe("sequential");
  });
  it("falls back to context on an unknown value (fail-safe)", () => {
    expect(resolveRevealMode({ revealMode: "wat" as never })).toBe("context");
  });
});

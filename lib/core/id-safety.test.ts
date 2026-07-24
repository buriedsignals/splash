import { describe, it, expect } from "bun:test";
import { isSafeId, assertSafeId, unsafeIdMessage } from "./id-safety";

describe("id-safety — no LLM-supplied id reaches a path resolution unchecked", () => {
  it("accepts a plain slug", () => {
    expect(isSafeId("rents-2026")).toBe(true);
    expect(isSafeId("a_B9")).toBe(true);
  });

  it("rejects traversal, separators, empties and over-long ids", () => {
    for (const bad of [
      "../../evil",
      "/etc",
      "a/b",
      "",
      "..",
      "a\\b",
      ".hidden",
    ])
      expect(isSafeId(bad)).toBe(false);
    expect(isSafeId("x".repeat(129))).toBe(false);
    expect(isSafeId(undefined)).toBe(false);
  });

  it("unsafeIdMessage names the offending id and the rule", () => {
    const msg = unsafeIdMessage("../../evil");
    expect(msg).toMatch(/not a safe slug/i);
    expect(msg).toContain("../../evil");
  });

  it("assertSafeId throws exactly unsafeIdMessage — one message, two shapes", () => {
    expect(() => assertSafeId("a/b")).toThrow(unsafeIdMessage("a/b"));
    expect(() => assertSafeId("ok-id")).not.toThrow();
  });
});

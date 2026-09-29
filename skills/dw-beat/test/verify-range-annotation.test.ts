import { describe, it, expect } from "bun:test";
import { verifyRangeAnnotation } from "../scripts/verify-range-annotation.mjs";

describe("verifyRangeAnnotation", () => {
  it("should refuse to run without a token — this round-trip is never faked", async () => {
    await expect(
      verifyRangeAnnotation({ token: "", outPath: "/tmp/x.png" }),
    ).rejects.toThrow(/DATAWRAPPER_TOKEN is not set/);
  });
});

// The live pin itself is in verify-range-annotation.live.test.ts: it creates a real Datawrapper
// chart, so it runs only in the live lane (scripts/test-lanes.mjs).

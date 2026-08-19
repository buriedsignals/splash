import { describe, it, expect } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyRangeAnnotation,
  CANDIDATE_SHAPE,
} from "../scripts/verify-range-annotation.mjs";

describe("verifyRangeAnnotation", () => {
  it("should refuse to run without a token — this round-trip is never faked", async () => {
    await expect(
      verifyRangeAnnotation({ token: "", outPath: "/tmp/x.png" }),
    ).rejects.toThrow(/DATAWRAPPER_TOKEN is not set/);
  });
});

// This is the exact live round-trip the task requires to pin `metadata-spec.mjs`'s range-annotation
// shape: create a chart, PATCH the candidate, GET it back, export the PNG, look at it. It is
// written and ready — it has simply never run in an environment with a working token (see
// references/range-annotation-shape.md §3). The moment DATAWRAPPER_TOKEN is set, this stops
// skipping and becomes the actual proof.
describe("verifyRangeAnnotation against the real Datawrapper API", () => {
  const token = process.env.DATAWRAPPER_TOKEN ?? "";
  if (!token) {
    console.log(
      "Skipping the live range-annotation pin: DATAWRAPPER_TOKEN is not set in the environment.",
    );
  }

  it.skipIf(!token)(
    "should round-trip the candidate shape and write a PNG for a human to look at",
    async () => {
      const outDir = await mkdtemp(join(tmpdir(), "dw-beat-verify-"));
      const outPath = join(outDir, "probe.png");
      try {
        const result = await verifyRangeAnnotation({
          token,
          fetchFn: fetch,
          outPath,
        });
        expect(result.sentShape).toBe(CANDIDATE_SHAPE);
        expect(result.roundTrippedRangeAnnotations).toBeDefined();
        const info = await stat(outPath);
        expect(info.size).toBeGreaterThan(0);
        console.log(
          `Wrote ${outPath} — open it and confirm the rule actually drew at y=5 between 2000 and 2010.`,
        );
      } finally {
        await rm(outDir, { recursive: true, force: true });
      }
    },
    30000,
  );
});

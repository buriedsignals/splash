import { describe, it, expect } from "bun:test";
import { resolveDatawrapperToken } from "../scripts/produce.mjs";
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
  // THE GATE THAT DECIDES WHETHER A LIVE TEST RUNS, reading the credential the way the SKILL reads it
  // (2026-08-23). This read `process.env.DATAWRAPPER_TOKEN` while `produce.mjs` declares
  // `DATAWRAPPER_TOKEN_ALIASES = ["DATAWRAPPER_API_TOKEN"]` and this checkout's root `.env` holds
  // only the alias — so every live Datawrapper test here printed "skipping, not set" against a
  // working token, and this format's live path had never once been exercised on this machine. In
  // `produce.test.ts` the same file already TESTS the resolver a few hundred lines below.
  //
  // Fourth sighting of one shape in a week: the map probe read its key with no alias list, then the
  // GATE deciding whether that probe runs did, then the operation that calls the provider did, and
  // now the gates that decide whether a test runs. A skip nobody reads is a pass.
  const token = resolveDatawrapperToken(process.env);
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

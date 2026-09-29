import { describe, it, expect } from "bun:test";
import { probeMapTiler } from "../scripts/keys.mjs";

// LIVE LANE: a real MapTiler round trip the moment MAPTILER_KEY is in the environment, so it lives
// in a `*.live.test.ts` (scripts/test-lanes.mjs) and never runs with the fast lane. The offline
// probe contracts stay in keys.test.ts.
describe("probeMapTiler against the real endpoint", () => {
  const key = process.env.MAPTILER_KEY ?? "";
  if (!key) {
    console.log(
      "Skipping real MapTiler probe: MAPTILER_KEY is not set in the environment.",
    );
  }

  it.skipIf(!key)(
    "should return a concrete verdict using the key in the environment",
    async () => {
      const result = await probeMapTiler(key, fetch);
      expect(typeof result.ok).toBe("boolean");
      expect(result.status).not.toBe(null);
      expect(result.detail.length).toBeGreaterThan(0);
      console.log(
        `MapTiler verdict: ok=${result.ok} status=${result.status} — ${result.detail}`,
      );
    },
  );
});

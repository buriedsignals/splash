// The registry lives in lib/newsroom; the Producer union lives here. Neither may drift from
// the other, and only this side of the arrow is allowed to know both.
import { describe, expect, it } from "bun:test";
import { engineCapabilities } from "../../../lib/newsroom/capabilities";
import { ENGINE_REQUIREMENTS, EMBED_DELIVERY_ENV } from "../src/preflight";
import type { Producer } from "../src/producer-spec";

// Typed exhaustively: adding a member to the Producer union without adding a capability
// fails the compile, not just the test.
const PRODUCERS: Producer[] = [
  "dw-chart",
  "chart-native",
  "map-dw",
  "map-native",
  "scrolly",
  "image-native",
];

describe("capability registry / producer parity", () => {
  it("has exactly one engine capability per producer", () => {
    expect(
      engineCapabilities()
        .map((c) => c.id)
        .sort(),
    ).toEqual([...PRODUCERS].sort());
  });

  it("derives ENGINE_REQUIREMENTS from the registry", () => {
    for (const cap of engineCapabilities()) {
      const req = ENGINE_REQUIREMENTS[cap.id as Producer];
      expect(req.env).toEqual(cap.env);
      expect(req.envHelp).toEqual(cap.envHelp);
      expect(req.criticalDeps).toEqual(cap.criticalDeps);
    }
  });

  it("derives the embed delivery vars from the registry", () => {
    expect([...EMBED_DELIVERY_ENV].sort()).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "SPLASH_EMBED_PROJECT",
    ]);
  });
});

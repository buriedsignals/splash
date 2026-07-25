import { describe, expect, it } from "bun:test";
import {
  NEWSROOM_CAPABILITIES,
  deliveryCapabilities,
  engineCapabilities,
} from "./capabilities";

describe("the newsroom capability registry", () => {
  it("declares the six engines and the delivery capabilities", () => {
    expect(
      engineCapabilities()
        .map((c) => c.id)
        .sort(),
    ).toEqual([
      "chart-native",
      "dw-chart",
      "image-native",
      "map-dw",
      "map-native",
      "scrolly",
    ]);
    expect(deliveryCapabilities().map((c) => c.id)).toContain(
      "embed-cloudflare",
    );
  });

  it("labels every capability in newsroom language, never as an env var", () => {
    for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
      expect(cap.label.trim().length).toBeGreaterThan(0);
      // An env var name as the primary label is the exact failure issue #5 names.
      expect(cap.label).not.toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(cap.label).not.toContain("_");
    }
  });

  it("only documents env vars it actually requires", () => {
    for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
      const declared = new Set(cap.env.flat());
      for (const name of Object.keys(cap.envHelp))
        expect(declared.has(name)).toBe(true);
    }
  });

  it("keys the registry by the capability's own id", () => {
    for (const [key, cap] of Object.entries(NEWSROOM_CAPABILITIES))
      expect(cap.id).toBe(key);
  });

  it("marks a declared-but-unbuilt capability as delivery and not implemented", () => {
    const declared = Object.values(NEWSROOM_CAPABILITIES).filter(
      (c) => !c.implemented,
    );
    // The publisher adapters the Livraison sub-project (#4) will fill in.
    expect(declared.map((c) => c.id).sort()).toEqual([
      "embed-cms",
      "embed-fly",
      "embed-s3",
    ]);
    for (const cap of declared) expect(cap.kind).toBe("delivery");
  });

  it("asks for the credentials a publisher needs, and says which are secret", () => {
    const cf = NEWSROOM_CAPABILITIES["embed-cloudflare"]!;
    expect(cf.implemented).toBe(true);
    expect(cf.settingsFields?.map((f) => f.name).sort()).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_TOKEN",
      "SPLASH_EMBED_PROJECT",
    ]);
    expect(
      cf.settingsFields?.find((f) => f.name === "CLOUDFLARE_API_TOKEN")?.secret,
    ).toBe(true);
    expect(
      cf.settingsFields?.find((f) => f.name === "SPLASH_EMBED_PROJECT")?.secret,
    ).toBe(false);
  });

  it("should declare zip as an implemented delivery capability that needs no key", () => {
    const zip = NEWSROOM_CAPABILITIES.zip!;
    expect(zip).toMatchObject({ kind: "delivery", implemented: true, env: [] });
    expect(deliveryCapabilities().map((c) => c.id)).toContain("zip");
  });
});

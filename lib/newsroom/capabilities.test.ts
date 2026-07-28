import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    // The publisher adapters the Livraison sub-project (#4) will fill in. embed-s3 left this
    // set in L2, and embed-cms in L3 (measured against a real We.Publish, 2026-07-27) — so
    // embed-fly is the last one still declared without a body.
    expect(declared.map((c) => c.id).sort()).toEqual(["embed-fly"]);
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

  it("should declare embed-s3 as an implemented delivery capability with its own settings", () => {
    const s3 = NEWSROOM_CAPABILITIES["embed-s3"]!;
    expect(s3).toMatchObject({ kind: "delivery", implemented: true });
    // Both secrets must be declared, or deliver() cannot forward them: it only forwards
    // variables the capability itself declares (lib/loop/deliver.ts).
    expect(s3.env.flat()).toEqual(
      expect.arrayContaining([
        "SPLASH_S3_ACCESS_KEY_ID",
        "SPLASH_S3_SECRET_ACCESS_KEY",
      ]),
    );
    const secretFields = (s3.settingsFields ?? [])
      .filter((f) => f.secret)
      .map((f) => f.name);
    expect(secretFields).toEqual(
      expect.arrayContaining([
        "SPLASH_S3_ACCESS_KEY_ID",
        "SPLASH_S3_SECRET_ACCESS_KEY",
      ]),
    );
    // And the non-secret settings the adapter needs must be askable.
    const allFields = (s3.settingsFields ?? []).map((f) => f.name);
    for (const n of ["endpoint", "region", "bucket", "publicBaseUrl"])
      expect(allFields).toContain(n);
  });

  it("should give every declared env var a help string, so a missing key is actionable", () => {
    const s3 = NEWSROOM_CAPABILITIES["embed-s3"]!;
    for (const name of s3.env.flat()) expect(s3.envHelp[name]).toBeTruthy();
  });

  // A23: `required` is what lets readiness answer for a destination whose provider identifiers
  // live in newsroom.json rather than in .env — but the fact is now written in two places, here
  // and in the adapter's own REQUIRED_SETTINGS. This reads the adapters as TEXT rather than
  // importing them: lib/newsroom must not grow a dependency on lib/delivery (decor.ts says so),
  // and a drift guard is not a reason to open that door. Adding a name to an adapter's list
  // without declaring it here would put readiness back to answering "ready" for a destination
  // that refuses every delivery.
  it("declares exactly the settings its adapter refuses to run without", () => {
    const adapters: Record<string, string> = {
      "embed-s3": "s3.ts",
      "embed-cms": "wepublish.ts",
      "embed-cloudflare": "cloudflare-pages.ts",
    };
    for (const [id, file] of Object.entries(adapters)) {
      const src = readFileSync(
        join(import.meta.dir, "../delivery/adapters", file),
        "utf8",
      );
      const block = src.match(/const REQUIRED_SETTINGS = \[([\s\S]*?)\]/);
      const demanded = [...(block?.[1] ?? "").matchAll(/"([^"]+)"/g)]
        .map((m) => m[1]!)
        .sort();
      const declared = (NEWSROOM_CAPABILITIES[id]?.settingsFields ?? [])
        .filter((f) => f.required)
        .map((f) => f.name)
        .sort();
      expect(declared).toEqual(demanded);
    }
  });

  it("never marks a secret as a required SETTING — a secret lives in .env", () => {
    for (const cap of Object.values(NEWSROOM_CAPABILITIES))
      for (const f of cap.settingsFields ?? [])
        if (f.secret) expect(f.required).toBeUndefined();
  });
});

import { describe, expect, it, test } from "bun:test";
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

  // Fly.io was superseded by Cloudflare Pages and never built. A destination the page announces
  // as "not available yet" is a promise nobody intends to keep.
  test("every capability the page offers is actually built", () => {
    const declared = Object.values(NEWSROOM_CAPABILITIES).filter(
      (c) => !c.implemented,
    );
    expect(declared).toEqual([]);
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

  // The journalist picks what he wants to be able to make; the engine is a means. Every engine
  // therefore belongs to a want, and the tools that serve the same want group under one heading.
  test("every engine declares the want it serves", () => {
    for (const cap of engineCapabilities()) expect(cap.want).toBeTruthy();
    const charts = engineCapabilities()
      .filter((c) => c.want === "charts")
      .map((c) => c.id)
      .sort();
    expect(charts).toEqual(["chart-native", "dw-chart"]);
    const maps = engineCapabilities()
      .filter((c) => c.want === "maps")
      .map((c) => c.id)
      .sort();
    expect(maps).toEqual(["map-dw", "map-native"]);
  });

  // A delivery destination is not a want: it answers "where does it go", which is its own section.
  test("delivery capabilities declare no want", () => {
    for (const cap of deliveryCapabilities()) expect(cap.want).toBeUndefined();
  });

  // Fix round 1, Finding 1: `label` is a standalone NAME — readiness.ts, the setup page's
  // blocker line, and skills/splash's ENGINE_LABELS all interpolate it as the SUBJECT of a
  // sentence their own template supplies the verb for ("${label} needs …", "${label} was not
  // installed completely …"). `choice` is the checkbox row's own caption, read only by
  // capabilityRow. The regression this guards: a caption put back into `label` reads fine in
  // isolation but breaks the second it's interpolated — "With a Datawrapper account needs
  // DATAWRAPPER_API_TOKEN" and "In-house, needs a MapTiler key (includes video) needs
  // VITE_MAPTILER_KEY" are both real sentences that shipped before this was caught.
  test("an engine's label reads as a sentence subject, never the checkbox caption it opens on", () => {
    // Every readiness.ts template supplies its own verb right after `${cap.label}` — a label
    // that already contains one of these words doubles it up mid-sentence, which is the exact
    // shape of the "needs … needs …" break above.
    const wordTheTemplateSupplies =
      /\b(needs|missing|installed|available|configured|reached|rejected)\b/i;
    // A checkbox caption opens on how/where/what-with the tool works — "With a Datawrapper
    // account", "In-house, needs a MapTiler key…", "From the newsroom's own photographs",
    // "Scroll-driven stories". A name that stands as a sentence subject never leads this way.
    const opensLikeACaption =
      /^(with|without|from|in-house|scroll-driven|for|using)\b/i;
    for (const cap of engineCapabilities()) {
      expect(cap.label).not.toMatch(wordTheTemplateSupplies);
      expect(cap.label).not.toMatch(opensLikeACaption);
      // Every engine's row wants its own caption today; only delivery falls back silently to
      // `label` (asserted above: delivery never declares a `want`, and none carries a `choice`
      // distinct from its name because none needs one).
      expect(cap.choice).toBeTruthy();
      expect(cap.choice).not.toBe(cap.label);
    }
  });
});

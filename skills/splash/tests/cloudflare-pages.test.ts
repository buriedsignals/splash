// Unit coverage for the Cloudflare Pages embed adapter's pure surface. Each assertion pins a
// behaviour that was MEASURED against the live API (see the 2026-07-19 design spec) — these
// are not preferences, they are the platform's rules encoded so a regression fails loudly.
// The networked path is exercised by scripts/verify-embed-deploy.mjs (opt-in, real deploy).
import { describe, expect, it } from "bun:test";
import { blake3 } from "@noble/hashes/blake3.js";
import {
  assertEmbedProject,
  contentTypeFor,
  embedSlug,
  embedTokenConfigured,
  hashAsset,
  resolveEmbedConfig,
} from "../src/cloudflare-pages.ts";
import { embedDeliveryStatus } from "../src/preflight.ts";

describe("embedSlug — Cloudflare rewrites branch labels lossily, so we normalise first", () => {
  it("should strip accents instead of letting Cloudflare delete them", () => {
    // Measured: Cloudflare turns "Élections-Municipales" into "lections-municipales" —
    // the É is DROPPED, not transliterated. A French newsroom would get mangled URLs.
    expect(embedSlug("Élections municipales")).toStartWith(
      "elections-municipales",
    );
    // The failure mode is the leading letter being eaten, so anchor on the start.
    expect(embedSlug("Élections municipales")).not.toStartWith("lections");
  });

  it("should replace underscores, which Cloudflare rewrites to hyphens", () => {
    // Measured: branch "budget_commune_2026" is aliased as "budget-commune-2026", so a
    // constructed underscore URL 404s.
    expect(embedSlug("budget_commune_2026")).toStartWith("budget-commune-2026");
    expect(embedSlug("budget_commune_2026")).not.toContain("_");
  });

  it("should stay within the 28-char label budget Cloudflare truncates at", () => {
    const long =
      "Élections municipales 2026 — Annemasse, budget communal détaillé";
    expect(embedSlug(long).length).toBeLessThanOrEqual(28);
  });

  it("should be deterministic so a redeploy keeps the same URL", () => {
    const id = "Élections municipales 2026 — Annemasse";
    expect(embedSlug(id)).toBe(embedSlug(id));
  });

  it("should distinguish ids that collide after truncation", () => {
    // Without our own digest these two would share a truncated label and Cloudflare would
    // append a RANDOM suffix — unpredictable, therefore unusable as a stable embed URL.
    const a = embedSlug(
      "Élections municipales 2026 — Annemasse, budget communal",
    );
    const b = embedSlug(
      "Élections municipales 2026 — Annemasse, autre découpage",
    );
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(28);
    expect(b.length).toBeLessThanOrEqual(28);
  });

  it("should produce a valid DNS label for an id with no usable characters", () => {
    expect(embedSlug("—— !! ——")).toMatch(/^embed-[a-z0-9]{1,3}$/);
  });

  it("should only ever emit lowercase alphanumerics and hyphens", () => {
    for (const id of [
      "Élections 2026",
      "budget_commune",
      "ÀÉÎÕÜ ça",
      "A/B testing (v2)",
    ]) {
      expect(embedSlug(id)).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

describe("assertEmbedProject — the project name is the newsroom's public identity", () => {
  it("should accept a newsroom-identifying name", () => {
    expect(assertEmbedProject("heidi-news-splash")).toBe("heidi-news-splash");
  });

  it("should refuse an empty name rather than invent a shared default", () => {
    expect(() => assertEmbedProject("")).toThrow(/SPLASH_EMBED_PROJECT/);
  });

  it("should refuse a generic name that would collide across newsrooms", () => {
    for (const generic of [
      "splash",
      "embeds",
      "demo",
      "test",
      "splash-embeds",
    ]) {
      expect(() => assertEmbedProject(generic)).toThrow(/too generic/);
    }
  });

  it("should refuse characters that are not valid in a pages.dev label", () => {
    for (const bad of ["Heidi-News", "heidi_news", "-heidi", "ab", "héidi"]) {
      expect(() => assertEmbedProject(bad)).toThrow(
        /invalid SPLASH_EMBED_PROJECT/,
      );
    }
  });
});

describe("embedTokenConfigured — all three or the embed form is not offerable", () => {
  const full = {
    CLOUDFLARE_API_TOKEN: "t",
    CLOUDFLARE_ACCOUNT_ID: "a",
    SPLASH_EMBED_PROJECT: "heidi-news-splash",
  };

  it("should be true only when token, account and project are all set", () => {
    expect(embedTokenConfigured(full)).toBe(true);
  });

  it("should be false when any one is missing", () => {
    for (const key of Object.keys(full)) {
      expect(embedTokenConfigured({ ...full, [key]: "" })).toBe(false);
    }
  });

  it("should not be satisfied by whitespace", () => {
    expect(embedTokenConfigured({ ...full, CLOUDFLARE_API_TOKEN: "   " })).toBe(
      false,
    );
  });
});

describe("resolveEmbedConfig — actionable messages, never a half-configured deploy", () => {
  it("should name the missing credential and where to get it", () => {
    expect(() => resolveEmbedConfig({})).toThrow(/CLOUDFLARE_API_TOKEN/);
    expect(() => resolveEmbedConfig({ CLOUDFLARE_API_TOKEN: "t" })).toThrow(
      /CLOUDFLARE_ACCOUNT_ID/,
    );
  });

  it("should still enforce the project rules once credentials are present", () => {
    expect(() =>
      resolveEmbedConfig({
        CLOUDFLARE_API_TOKEN: "t",
        CLOUDFLARE_ACCOUNT_ID: "a",
        SPLASH_EMBED_PROJECT: "demo",
      }),
    ).toThrow(/too generic/);
  });

  it("should return the resolved triple when everything is valid", () => {
    expect(
      resolveEmbedConfig({
        CLOUDFLARE_API_TOKEN: " t ",
        CLOUDFLARE_ACCOUNT_ID: " a ",
        SPLASH_EMBED_PROJECT: "heidi-news-splash",
      }),
    ).toEqual({ token: "t", accountId: "a", project: "heidi-news-splash" });
  });
});

describe("hashAsset — the manifest key wrangler expects", () => {
  it("should hash the BASE64 text plus the bare extension, not the raw bytes", () => {
    // The single most bug-prone line of the protocol: hashing raw bytes (or including the
    // dot) yields a manifest pointing at blobs that were never stored — a 404 served by a
    // deploy that reported success.
    const contents = Buffer.from("<h1>hi</h1>");
    const expected = Buffer.from(
      blake3(new TextEncoder().encode(`${contents.toString("base64")}html`)),
    )
      .toString("hex")
      .slice(0, 32);
    expect(hashAsset(contents, "/tmp/out/index.html")).toBe(expected);
  });

  it("should emit a 32-char hex key", () => {
    expect(hashAsset(Buffer.from("x"), "a.css")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("should pin the blake3 implementation against the published empty-input vector", () => {
    // Guards the dependency itself: a blake3 that drifts would break every deploy silently.
    expect(
      Buffer.from(blake3(new Uint8Array())).toString("hex").slice(0, 32),
    ).toBe("af1349b9f5f9a1a6a0404dea36dcc949");
  });

  it("should give different keys to identical bytes with different extensions", () => {
    const contents = Buffer.from("same");
    expect(hashAsset(contents, "a.html")).not.toBe(
      hashAsset(contents, "a.css"),
    );
  });
});

describe("contentTypeFor", () => {
  it("should map the types a produced artifact actually contains", () => {
    expect(contentTypeFor("interactive.html")).toBe("text/html");
    expect(contentTypeFor("assets/app.js")).toBe("text/javascript");
    expect(contentTypeFor("assets/logo.png")).toBe("image/png");
    expect(contentTypeFor("clip.mp4")).toBe("video/mp4");
  });

  it("should fall back to octet-stream rather than guess", () => {
    expect(contentTypeFor("data.unknownext")).toBe("application/octet-stream");
  });
});

describe("embedDeliveryStatus — a missing embed key is collectable, not a dead end", () => {
  const full = {
    CLOUDFLARE_API_TOKEN: "t",
    CLOUDFLARE_ACCOUNT_ID: "a",
    SPLASH_EMBED_PROJECT: "heidi-news-splash",
  };

  it("should be ready when all three are set", () => {
    expect(embedDeliveryStatus({ env: full })).toEqual({
      ready: true,
      missing: [],
      reason: "",
    });
  });

  it("should name every missing credential so the flow can ask for each one", () => {
    const s = embedDeliveryStatus({ env: {} });
    expect(s.ready).toBe(false);
    expect(s.missing).toEqual([
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SPLASH_EMBED_PROJECT",
    ]);
  });

  it("should carry a get-it URL for each missing credential, like an engine key does", () => {
    // Without this the orchestrator can only say "unavailable" and downgrade the delivery —
    // the exact silent degradation the key-prerequisite flow exists to prevent.
    const s = embedDeliveryStatus({ env: { CLOUDFLARE_API_TOKEN: "t" } });
    expect(s.missing).toEqual(["CLOUDFLARE_ACCOUNT_ID", "SPLASH_EMBED_PROJECT"]);
    expect(s.reason).toContain("dash.cloudflare.com");
    expect(s.reason).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(s.reason).toContain("SPLASH_EMBED_PROJECT");
  });

  it("should explain that the project name becomes the public URL", () => {
    expect(embedDeliveryStatus({ env: {} }).reason).toMatch(/public URL|pages\.dev/);
  });

  it("should treat whitespace as missing", () => {
    expect(embedDeliveryStatus({ env: { ...full, SPLASH_EMBED_PROJECT: "  " } }).ready).toBe(false);
  });
});

import { describe, expect, it } from "bun:test";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
  defaultCapabilities,
  readNewsroomState,
  writeNewsroomState,
  type NewsroomState,
} from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "newsroom-state-"));
}

const FILLED: NewsroomState = {
  schemaVersion: 1,
  runtime: "goose",
  uiLang: "de",
  capabilities: {
    "chart-native": { enabled: true },
    "dw-chart": {
      enabled: true,
      lastVerified: { at: "2026-07-24T10:00:00.000Z", result: "ok" },
    },
    "map-native": { enabled: false },
  },
  publisher: "embed-cloudflare",
};

describe("the newsroom state file", () => {
  it("round-trips a filled state", () => {
    const d = dir();
    writeNewsroomState(d, FILLED);
    expect(readNewsroomState(d)).toEqual(FILLED);
  });

  it("defaults to English when nothing has been saved", () => {
    expect(readNewsroomState(dir())).toEqual(DEFAULT_NEWSROOM_STATE);
    expect(DEFAULT_NEWSROOM_STATE.uiLang).toBe("en");
  });

  it("falls back to the default state on a corrupt file, without throwing", () => {
    const d = dir();
    writeFileSync(join(d, NEWSROOM_STATE_FILE), "{ not json");
    expect(() => readNewsroomState(d)).not.toThrow();
    expect(readNewsroomState(d)).toEqual(DEFAULT_NEWSROOM_STATE);
  });

  it("falls back to the default state on a shape it does not recognise", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({ schemaVersion: 99, uiLang: 7 }),
    );
    expect(readNewsroomState(d)).toEqual(DEFAULT_NEWSROOM_STATE);
  });

  // The decor state must be incapable of holding a credential: .env is the single home.
  it("strips any field the schema does not declare — a credential cannot survive a read", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        token: "dw-secret-should-not-survive",
        capabilities: {
          "dw-chart": { enabled: true, apiKey: "also-should-not-survive" },
        },
      }),
    );
    const state = readNewsroomState(d);
    writeNewsroomState(d, state);
    const onDisk = readFileSync(join(d, NEWSROOM_STATE_FILE), "utf8");
    expect(onDisk).not.toContain("dw-secret-should-not-survive");
    expect(onDisk).not.toContain("also-should-not-survive");
  });

  // A per-capability settings bag is exactly where someone would be tempted to put a secret
  // (spec 2026-07-24 §3.2). It is legitimate, DECLARED storage now — unlike the sibling
  // `apiKey` above, its values are meant to survive — but any OTHER, still-undeclared field
  // beside it must keep being stripped exactly as before: adding `settings` must not have
  // widened the schema's tolerance for anything else.
  it("keeps a capability's own declared settings values, while still stripping any other undeclared field beside them", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        capabilities: {
          "embed-s3": {
            enabled: true,
            settings: {
              endpoint: "http://127.0.0.1:9000",
              bucket: "splash-embeds",
            },
            apiKey: "still-should-not-survive-not-a-declared-field",
          },
        },
      }),
    );
    const state = readNewsroomState(d);
    expect(state.capabilities["embed-s3"]).toEqual({
      enabled: true,
      settings: {
        endpoint: "http://127.0.0.1:9000",
        bucket: "splash-embeds",
      },
    });
    writeNewsroomState(d, state);
    const onDisk = readFileSync(join(d, NEWSROOM_STATE_FILE), "utf8");
    expect(onDisk).toContain("http://127.0.0.1:9000");
    expect(onDisk).not.toContain(
      "still-should-not-survive-not-a-declared-field",
    );
  });

  // settingsFields is ONE flat list per capability, mixing the two `secret: true` S3 keys with
  // endpoint/bucket/region — and `settings` is keyed by those same names. Whoever fills the bag
  // reads that list, so the temptation is structural, and the invariant ".env values never land
  // in newsroom.json" cannot rest on a writer that does not exist yet. Both doors are closed
  // mechanically: a secret-named key is dropped on READ (so no consumer ever sees it, whoever
  // hand-edited the file) and on WRITE (so it cannot reach the disk in the first place).
  it("drops a secret-named settings key on read, keeping the non-secret ones beside it", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        capabilities: {
          "embed-s3": {
            enabled: true,
            settings: {
              endpoint: "http://127.0.0.1:9000",
              bucket: "splash-embeds",
              SPLASH_S3_ACCESS_KEY_ID: "AKIDSHOULDNOTSURVIVE",
              SPLASH_S3_SECRET_ACCESS_KEY: "secret-should-not-survive",
            },
          },
        },
      }),
    );
    expect(readNewsroomState(d).capabilities["embed-s3"]).toEqual({
      enabled: true,
      settings: {
        endpoint: "http://127.0.0.1:9000",
        bucket: "splash-embeds",
      },
    });
  });

  it("never writes a secret-named settings key to disk, even when handed one", () => {
    const d = dir();
    writeNewsroomState(d, {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: {
        "embed-s3": {
          enabled: true,
          settings: {
            endpoint: "http://127.0.0.1:9000",
            SPLASH_S3_SECRET_ACCESS_KEY: "secret-should-not-survive",
          },
        },
      },
    });
    const onDisk = readFileSync(join(d, NEWSROOM_STATE_FILE), "utf8");
    expect(onDisk).toContain("http://127.0.0.1:9000");
    expect(onDisk).not.toContain("secret-should-not-survive");
    expect(onDisk).not.toContain("SPLASH_S3_SECRET_ACCESS_KEY");
  });

  it("leaves a capability that declares no secret field untouched", () => {
    // The guard keys off `secret: true` in that capability's OWN settingsFields — it must not
    // become a blunt name filter that eats a legitimate setting from another capability.
    const d = dir();
    writeNewsroomState(d, {
      ...DEFAULT_NEWSROOM_STATE,
      capabilities: {
        zip: { enabled: true, settings: { SPLASH_S3_SECRET_ACCESS_KEY: "x" } },
      },
    });
    expect(readNewsroomState(d).capabilities["zip"]).toEqual({
      enabled: true,
      settings: { SPLASH_S3_SECRET_ACCESS_KEY: "x" },
    });
  });

  it("round-trips a capability's own persisted settings", () => {
    const d = dir();
    const state: NewsroomState = {
      ...FILLED,
      capabilities: {
        ...FILLED.capabilities,
        "embed-s3": {
          enabled: true,
          settings: {
            endpoint: "http://127.0.0.1:9000",
            region: "us-east-1",
            bucket: "splash-embeds",
            publicBaseUrl: "http://127.0.0.1:9000/splash-embeds",
          },
        },
      },
    };
    writeNewsroomState(d, state);
    expect(readNewsroomState(d)).toEqual(state);
  });

  it("still reads a newsroom.json written before capability settings existed", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        capabilities: { "embed-cloudflare": { enabled: true } },
      }),
    );
    expect(readNewsroomState(d).capabilities["embed-cloudflare"]).toEqual({
      enabled: true,
    });
  });

  it("writes atomically and leaves no temporary file behind", () => {
    const d = dir();
    writeNewsroomState(d, FILLED);
    expect(readdirSync(d)).toEqual([NEWSROOM_STATE_FILE]);
  });

  it("should round-trip the delivery preferences", () => {
    const d = mkdtempSync(join(tmpdir(), "newsroom-delivery-"));
    writeNewsroomState(d, {
      ...DEFAULT_NEWSROOM_STATE,
      delivery: {
        snippetTemplate: '<iframe src="{url}"></iframe>',
        maxWidth: 640,
      },
    });
    expect(readNewsroomState(d).delivery).toEqual({
      snippetTemplate: '<iframe src="{url}"></iframe>',
      maxWidth: 640,
    });
    rmSync(d, { recursive: true, force: true });
  });

  it("should keep reading a state file written before delivery preferences existed", () => {
    const d = mkdtempSync(join(tmpdir(), "newsroom-delivery-old-"));
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "en",
        capabilities: {},
      }),
    );
    expect(readNewsroomState(d).delivery).toBeUndefined();
    rmSync(d, { recursive: true, force: true });
  });
});

// The ONE home of the enablement default (C1): a key that is already present IS the choice.
// Both callers use this — `loadDecor` on a fresh install, and the legacy migration, which
// adds only `runtime` and the green stamps on top of it.
describe("defaultCapabilities", () => {
  it("enables a capability whose key is present, and nothing else", () => {
    const caps = defaultCapabilities({ DATAWRAPPER_API_TOKEN: "dw-token" });
    expect(caps["dw-chart"]?.enabled).toBe(true);
    expect(caps["map-dw"]?.enabled).toBe(true);
    expect(caps["map-native"]?.enabled).toBe(false);
    expect(caps["embed-cloudflare"]?.enabled).toBe(false);
  });

  it("enables the key-free capabilities on an empty environment", () => {
    const enabled = Object.entries(defaultCapabilities({}))
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native", "zip"]);
  });

  it("accepts EITHER member of an alternatives group (the MapTiler mirror rule)", () => {
    expect(
      defaultCapabilities({ REMOTION_MAPTILER_KEY: "mt" })["map-native"]
        ?.enabled,
    ).toBe(true);
  });

  it("treats a whitespace-only value as no key at all", () => {
    expect(
      defaultCapabilities({ DATAWRAPPER_API_TOKEN: "   " })["dw-chart"]
        ?.enabled,
    ).toBe(false);
  });

  it("never enables a capability that is only declared, however many keys are set", () => {
    const caps = defaultCapabilities({
      DATAWRAPPER_API_TOKEN: "x",
      VITE_MAPTILER_KEY: "x",
      CLOUDFLARE_API_TOKEN: "x",
      CLOUDFLARE_ACCOUNT_ID: "x",
      SPLASH_EMBED_PROJECT: "x",
    });
    for (const id of ["embed-cms", "embed-s3", "embed-fly"])
      expect(caps[id]?.enabled).toBe(false);
    expect(caps["embed-cloudflare"]?.enabled).toBe(true);
  });

  it("carries no verification stamp of its own — enablement is a want, not a check", () => {
    for (const c of Object.values(defaultCapabilities({})))
      expect(c.lastVerified).toBeUndefined();
  });
});

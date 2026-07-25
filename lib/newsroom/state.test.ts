import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

  it("writes atomically and leaves no temporary file behind", () => {
    const d = dir();
    writeNewsroomState(d, FILLED);
    expect(readdirSync(d)).toEqual([NEWSROOM_STATE_FILE]);
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

  it("enables the key-free engines on an empty environment", () => {
    const enabled = Object.entries(defaultCapabilities({}))
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native"]);
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

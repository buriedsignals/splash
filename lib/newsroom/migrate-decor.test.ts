import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LEGACY_PREFLIGHT_FILE,
  LEGACY_RUNTIME_FILE,
  migrateDecor,
  needsDecorMigration,
} from "./migrate-decor";
import { NEWSROOM_STATE_FILE, readNewsroomState } from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "newsroom-migrate-"));
}

const FULL_ENV = {
  DATAWRAPPER_API_TOKEN: "dw-token",
  VITE_MAPTILER_KEY: "mt-key",
  CLOUDFLARE_API_TOKEN: "cf-token",
  CLOUDFLARE_ACCOUNT_ID: "cf-account",
  SPLASH_EMBED_PROJECT: "a-newsroom-splash",
};

describe("absorbing the legacy decor", () => {
  it("needs no migration once the state file exists", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    writeFileSync(join(d, NEWSROOM_STATE_FILE), "{}");
    expect(needsDecorMigration(d)).toBe(false);
  });

  it("needs migration when a legacy file exists and the state file does not", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    expect(needsDecorMigration(d)).toBe(true);
  });

  it("needs no migration on a fresh tree with nothing in it", () => {
    expect(needsDecorMigration(dir())).toBe(false);
  });

  it("carries the chosen runtime over and removes the legacy file", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    const { state, removed } = migrateDecor(d, {});
    expect(state.runtime).toBe("goose");
    expect(removed).toContain(LEGACY_RUNTIME_FILE);
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(false);
    expect(readNewsroomState(d).runtime).toBe("goose");
  });

  it("enables what an existing install already has keys for, and nothing else", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, FULL_ENV);
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual([
      "chart-native",
      "dw-chart",
      "embed-cloudflare",
      "image-native",
      "map-dw",
      "map-native",
      "scrolly",
    ]);
  });

  it("enables only the key-free engines when the environment is empty", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, {});
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native"]);
  });

  it("never enables a capability that is only declared", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const { state } = migrateDecor(d, FULL_ENV);
    for (const id of ["embed-cms", "embed-s3", "embed-fly"])
      expect(state.capabilities[id]?.enabled).toBe(false);
  });

  it("carries a green persisted status as a verification stamp, and drops the rest", () => {
    const d = dir();
    writeFileSync(
      join(d, LEGACY_PREFLIGHT_FILE),
      JSON.stringify({
        schemaVersion: "1",
        engines: {
          "dw-chart": {
            status: "green",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "",
          },
          "map-native": {
            status: "yellow",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "needs a key",
          },
          scrolly: {
            status: "red",
            checkedAt: "2026-07-20T09:00:00.000Z",
            reason: "deps missing",
          },
        },
      }),
    );
    const { state, removed } = migrateDecor(d, FULL_ENV);
    expect(state.capabilities["dw-chart"]?.lastVerified).toEqual({
      at: "2026-07-20T09:00:00.000Z",
      result: "ok",
    });
    // yellow/red mean "a key or a dep is missing" — readiness recomputes that from the
    // environment on every read, so carrying them would only make the state stale.
    expect(state.capabilities["map-native"]?.lastVerified).toBeUndefined();
    expect(state.capabilities["scrolly"]?.lastVerified).toBeUndefined();
    expect(removed).toContain(LEGACY_PREFLIGHT_FILE);
  });

  it("ignores a corrupt persisted status file", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_PREFLIGHT_FILE), "not json at all");
    expect(() => migrateDecor(d, {})).not.toThrow();
    expect(existsSync(join(d, LEGACY_PREFLIGHT_FILE))).toBe(false);
  });

  it("leaves .env byte-identical", () => {
    const d = dir();
    const envText =
      'DATAWRAPPER_API_TOKEN="dw-token"\nVITE_MAPTILER_KEY="mt-key"\n';
    writeFileSync(join(d, ".env"), envText);
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    migrateDecor(d, FULL_ENV);
    expect(readFileSync(join(d, ".env"), "utf8")).toBe(envText);
  });
});

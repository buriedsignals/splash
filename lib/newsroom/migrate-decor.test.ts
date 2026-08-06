import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LEGACY_PREFLIGHT_FILE,
  LEGACY_RUNTIME_FILE,
  migratedDecorState,
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

  // ABSORBED, NOT REMOVED (P1). install/bootstrap.sh reads .splash-runtime on EVERY
  // invocation, including its documented "re-run this installer" recovery path, and
  // install/configurator.ts still writes it. Deleting it here silently reinstalled a
  // goose/codex/gemini newsroom under a different runtime. Removal moves to P2, with the
  // writers.
  it("carries the chosen runtime over and LEAVES the legacy file in place", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    const state = migrateDecor(d, {});
    expect(state.runtime).toBe("goose");
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(true);
    expect(readFileSync(join(d, LEGACY_RUNTIME_FILE), "utf8")).toBe("goose\n");
    expect(readNewsroomState(d).runtime).toBe("goose");
  });

  it("enables what an existing install already has keys for, and nothing else", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const state = migrateDecor(d, FULL_ENV);
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual([
      "chart-native",
      "dw-chart",
      "embed-cloudflare",
      // Key-free, like zip: the hand-over of an embed that is already published.
      "embed-hosted",
      "image-native",
      "map-dw",
      "map-native",
      "scrolly",
      "zip",
    ]);
  });

  it("enables only the key-free capabilities when the environment is empty", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const state = migrateDecor(d, {});
    const enabled = Object.entries(state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual([
      "chart-native",
      "embed-hosted",
      "image-native",
      "zip",
    ]);
  });

  // embed-s3 is deliberately NOT in this list any more: it is implemented, so it would pass
  // here only because FULL_ENV happens to carry no SPLASH_S3_* key — i.e. for a reason that has
  // nothing to do with the only-declared rule, and it would keep passing if that rule were
  // deleted. Its own case is asserted below instead. (Same defect the task review fixed in
  // driver.test.ts; this sibling was missed.)
  it("never enables a capability that is only declared", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    const state = migrateDecor(d, FULL_ENV);
    for (const id of ["embed-cms"])
      expect(state.capabilities[id]?.enabled).toBe(false);
  });

  // The other half of the rule, on an IMPLEMENTED capability: the keys decide. Both halves are
  // asserted on the same capability, so neither can pass by accident.
  it("enables an implemented capability once its keys are there, and not before", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    expect(migrateDecor(d, FULL_ENV).capabilities["embed-s3"]?.enabled).toBe(
      false,
    );

    const withKeys = migrateDecor(d, {
      ...FULL_ENV,
      SPLASH_S3_ACCESS_KEY_ID: "s3-key-id",
      SPLASH_S3_SECRET_ACCESS_KEY: "s3-secret",
    });
    expect(withKeys.capabilities["embed-s3"]?.enabled).toBe(true);
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
    const state = migrateDecor(d, FULL_ENV);
    expect(state.capabilities["dw-chart"]?.lastVerified).toEqual({
      at: "2026-07-20T09:00:00.000Z",
      result: "ok",
    });
    // yellow/red mean "a key or a dep is missing" — readiness recomputes that from the
    // environment on every read, so carrying them would only make the state stale.
    expect(state.capabilities["map-native"]?.lastVerified).toBeUndefined();
    expect(state.capabilities["scrolly"]?.lastVerified).toBeUndefined();
    expect(existsSync(join(d, LEGACY_PREFLIGHT_FILE))).toBe(true);
  });

  it("ignores a corrupt persisted status file", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_PREFLIGHT_FILE), "not json at all");
    expect(() => migrateDecor(d, {})).not.toThrow();
    expect(existsSync(join(d, LEGACY_PREFLIGHT_FILE))).toBe(true);
  });

  // I4: issue #6 asks a FRESH install to lead in English. An install that already exists is
  // not fresh: flipping a French newsroom's menus to English on the day it upgrades is a
  // regression. Its NEWSROOM-PROFILE.md is the only evidence P1 has of the language it works
  // in, so it seeds the interface language — once, here.
  it("keeps an existing French newsroom in French, seeding uiLang from its profile", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      [
        "---",
        'lang: "fr"',
        "source:",
        '  name: "Heidi"',
        "---",
        "",
        "# guide",
        "",
      ].join("\n"),
    );
    expect(migrateDecor(d, {}).uiLang).toBe("fr");
  });

  it("leaves a migrating newsroom with no profile in English", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "claude\n");
    expect(migrateDecor(d, {}).uiLang).toBe("en");
  });

  it("derives the same state without writing when nobody may write", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    const derived = migratedDecorState(d, FULL_ENV);
    expect(existsSync(join(d, NEWSROOM_STATE_FILE))).toBe(false);
    expect(derived).toEqual(migrateDecor(d, FULL_ENV));
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

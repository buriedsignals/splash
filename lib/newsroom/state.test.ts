import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_NEWSROOM_STATE,
  NEWSROOM_STATE_FILE,
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

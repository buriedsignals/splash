import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../skills/splash/src/register-producers";
import { freshOutDir, collectOutputs, channelEnvForEngine } from "./exec";

describe("freshOutDir — every dispatch writes into a WHOLLY FRESH directory", () => {
  it("removes a stale artifact left by a superseded attempt", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "exec-fresh-")), "el");
    freshOutDir(dir);
    writeFileSync(join(dir, "stale.html"), "old");
    const abs = freshOutDir(dir);
    expect(existsSync(join(abs, "stale.html"))).toBe(false);
    expect(readdirSync(abs)).toEqual([]);
  });
});

describe("collectOutputs — flat listing, sorted, absolute", () => {
  it("lists files only, sorted", () => {
    const dir = freshOutDir(
      join(mkdtempSync(join(tmpdir(), "exec-out-")), "el"),
    );
    writeFileSync(join(dir, "b.png"), "x");
    writeFileSync(join(dir, "a.json"), "x");
    expect(collectOutputs(dir).map((f) => f.split("/").pop())).toEqual([
      "a.json",
      "b.png",
    ]);
  });
});

describe("channelEnvForEngine — threading is the manifest's declaration, not a hard-coded list", () => {
  it("threads SPLASH_CHANNEL for an engine whose manifest declares threadsChannel", () => {
    expect(channelEnvForEngine("chart-native", "social-vertical")).toEqual({
      SPLASH_CHANNEL: "social-vertical",
    });
    expect(channelEnvForEngine("map-native", "social-feed")).toEqual({
      SPLASH_CHANNEL: "social-feed",
    });
  });

  it("threads nothing for an engine that declares it does not read a channel", () => {
    expect(channelEnvForEngine("scrolly", "social-vertical")).toEqual({});
  });
});

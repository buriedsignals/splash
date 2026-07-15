// Defense-in-depth for channel threading (fail-closed producer env parsing). The spine
// (produce-all's gate) normalizes the journalist's channel to the canonical enum BEFORE
// dispatch, so this producer only ever receives canonical values from it. But produce.mjs
// and vite.config.ts also read SPLASH_CHANNEL directly (manual runs, future callers) —
// and both used to SILENTLY default any unrecognized non-empty value to article-web (the
// most permissive channel, landscape 1200x675). Reproduced regression: SPLASH_CHANNEL
// "feed" + format "static" shipped a landscape render for a square social-feed proposal
// with a clean exit. An unrecognized NON-EMPTY value must fail hard, listing the
// canonical values; absent/empty keeps the article-web default (legacy callers). Aliases
// ("feed", "stories") are deliberately NOT accepted here — alias resolution lives once in
// the spine's normalizeChannel, never duplicated into producers.
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PRODUCE = join(root, "scripts", "produce.mjs");
const CONFIG = join(root, "assets", "sample-data", "bars.json");

// Runs produce.mjs with a controlled SPLASH_CHANNEL and captures the outcome. Real
// subprocess run (no mocks, repo convention) — cheap for the failure cases: the channel
// gate sits before any build/render work.
function runWithChannel(
  channelEnv: string | undefined,
  args: string[],
): { failed: boolean; stderr: string } {
  const env = { ...process.env };
  delete env.SPLASH_CHANNEL;
  if (channelEnv !== undefined) env.SPLASH_CHANNEL = channelEnv;
  try {
    execFileSync("bun", [PRODUCE, ...args], { cwd: root, env, stdio: "pipe" });
    return { failed: false, stderr: "" };
  } catch (e) {
    const stderr = (e as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
    return { failed: true, stderr };
  }
}

describe("produce.mjs SPLASH_CHANNEL parsing is fail-closed", () => {
  it('fails hard on an unrecognized non-empty SPLASH_CHANNEL ("feed") instead of defaulting to article-web', () => {
    const outDir = mkdtempSync(join(tmpdir(), "chart-native-channel-closed-"));
    const r = runWithChannel("feed", ["bar", CONFIG, outDir, "static"]);
    expect(r.failed).toBe(true);
    expect(r.stderr).toContain('unknown SPLASH_CHANNEL "feed"');
    // The message must list the canonical values the caller should have sent.
    expect(r.stderr).toContain("social-vertical");
    expect(r.stderr).toContain("social-feed");
    expect(r.stderr).toContain("article-web");
    // Nothing was built — no silent wrong-aspect ship.
    expect(readdirSync(outDir)).toEqual([]);
  });

  it("still defaults an EMPTY SPLASH_CHANNEL to article-web (fails later on the unknown type, not at the channel gate)", () => {
    // Uses a bogus chart type so the run stays cheap: reaching the type error proves
    // the empty channel sailed through the channel gate (which sits before it).
    const outDir = mkdtempSync(join(tmpdir(), "chart-native-channel-empty-"));
    const r = runWithChannel("", ["nope-type", CONFIG, outDir, "static"]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown SPLASH_CHANNEL");
    expect(r.stderr).toContain('unknown type "nope-type"');
  });

  it("still defaults an ABSENT SPLASH_CHANNEL to article-web (same cheap probe)", () => {
    const outDir = mkdtempSync(join(tmpdir(), "chart-native-channel-absent-"));
    const r = runWithChannel(undefined, ["nope-type", CONFIG, outDir, "static"]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown SPLASH_CHANNEL");
    expect(r.stderr).toContain('unknown type "nope-type"');
  });

  it("accepts a canonical value at the channel gate (fails later on the unknown type, not on the channel)", () => {
    const outDir = mkdtempSync(join(tmpdir(), "chart-native-channel-canon-"));
    const r = runWithChannel("social-feed", [
      "nope-type",
      CONFIG,
      outDir,
      "static",
    ]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown SPLASH_CHANNEL");
    expect(r.stderr).toContain('unknown type "nope-type"');
  });
});

describe("vite.config.ts SPLASH_CHANNEL parsing is fail-closed (the layer below produce.mjs)", () => {
  // produce.mjs re-asserts the validated channel into the env it spawns Vite with, but
  // vite.config.ts is also reachable directly (bunx vite build) — it must not silently
  // size an unrecognized channel as article-web either. Loading the config module in a
  // subprocess executes its top-level parse; the throw is the observable contract.
  function loadViteConfig(channelEnv: string | undefined): {
    failed: boolean;
    stderr: string;
  } {
    const env = { ...process.env };
    delete env.SPLASH_CHANNEL;
    delete env.CONFIG; // the config-injection path is irrelevant here
    if (channelEnv !== undefined) env.SPLASH_CHANNEL = channelEnv;
    try {
      execFileSync("bun", [join(root, "vite.config.ts")], {
        cwd: root,
        env,
        stdio: "pipe",
      });
      return { failed: false, stderr: "" };
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
      return { failed: true, stderr };
    }
  }

  it('throws on an unrecognized non-empty SPLASH_CHANNEL ("feed") instead of defaulting to article-web', () => {
    const r = loadViteConfig("feed");
    expect(r.failed).toBe(true);
    expect(r.stderr).toContain('unknown SPLASH_CHANNEL "feed"');
    expect(r.stderr).toContain("article-web"); // lists the canonical values
  });

  it("loads cleanly with an absent SPLASH_CHANNEL (article-web default preserved)", () => {
    expect(loadViteConfig(undefined).failed).toBe(false);
  });

  it("loads cleanly with a canonical SPLASH_CHANNEL", () => {
    expect(loadViteConfig("social-vertical").failed).toBe(false);
  });
});

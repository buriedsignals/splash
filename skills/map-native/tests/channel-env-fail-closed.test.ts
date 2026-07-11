// Defense-in-depth for channel threading (fail-closed producer env parsing), mirroring
// chart-native/tests/channel-env-fail-closed.test.ts. map-native's produce.mjs used to
// read ATELIER_CHANNEL with NO validation at all: an unrecognized value crashed later
// inside channelAspect() with an opaque TypeError (CHANNELS[channel] is undefined)
// instead of a clear refusal. The spine (produce-all's gate) normalizes aliases to the
// canonical enum before dispatch, so this producer only ever receives canonical values
// from it — an unrecognized NON-EMPTY value must fail hard with a message listing the
// canonical values; absent/empty keeps the article-web default (legacy/manual runs).
// Aliases ("feed", "stories") are deliberately NOT accepted here — alias resolution
// lives once in the spine's normalizeChannel, never duplicated into producers.
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const PRODUCE = join(root, "scripts", "produce.mjs");
const CONFIG = join(root, "assets", "sample-data", "choropleth.json");

// Real subprocess run (no mocks, repo convention) — cheap: the channel gate sits at
// module top, before any build/render work.
function runWithChannel(
  channelEnv: string | undefined,
  args: string[],
): { failed: boolean; stderr: string } {
  const env = { ...process.env };
  delete env.ATELIER_CHANNEL;
  if (channelEnv !== undefined) env.ATELIER_CHANNEL = channelEnv;
  try {
    execFileSync("bun", [PRODUCE, ...args], { cwd: root, env, stdio: "pipe" });
    return { failed: false, stderr: "" };
  } catch (e) {
    const stderr = (e as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
    return { failed: true, stderr };
  }
}

describe("map-native produce.mjs ATELIER_CHANNEL parsing is fail-closed", () => {
  it('fails hard with a clear message on an unrecognized non-empty ATELIER_CHANNEL ("feed") — no opaque TypeError, no article-web default', () => {
    const outDir = mkdtempSync(join(tmpdir(), "map-native-channel-closed-"));
    const r = runWithChannel("feed", [CONFIG, outDir, "static"]);
    expect(r.failed).toBe(true);
    expect(r.stderr).toContain('unknown ATELIER_CHANNEL "feed"');
    // The message must list the canonical values the caller should have sent.
    expect(r.stderr).toContain("social-vertical");
    expect(r.stderr).toContain("social-feed");
    expect(r.stderr).toContain("article-web");
    // Not the old opaque crash inside channelAspect().
    expect(r.stderr).not.toContain("TypeError");
    // Nothing was built.
    expect(readdirSync(outDir)).toEqual([]);
  });

  it("still defaults an EMPTY ATELIER_CHANNEL to article-web (fails later on the missing format argv, not at the channel gate)", () => {
    // No format argv → the usage error. Reaching it proves the empty channel sailed
    // through the channel gate (which sits before the argv check) — cheap probe.
    const r = runWithChannel("", [CONFIG]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown ATELIER_CHANNEL");
    expect(r.stderr).toContain("usage: produce.mjs");
  });

  it("still defaults an ABSENT ATELIER_CHANNEL to article-web (same cheap probe)", () => {
    const r = runWithChannel(undefined, [CONFIG]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown ATELIER_CHANNEL");
    expect(r.stderr).toContain("usage: produce.mjs");
  });

  it("accepts a canonical value at the channel gate (fails later on the missing format argv, not on the channel)", () => {
    const r = runWithChannel("social-vertical", [CONFIG]);
    expect(r.failed).toBe(true);
    expect(r.stderr).not.toContain("unknown ATELIER_CHANNEL");
    expect(r.stderr).toContain("usage: produce.mjs");
  });
});

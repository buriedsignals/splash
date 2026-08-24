import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

describe("the delivered landing page describes the authoritative inventories", () => {
  it("passes the landing drift check", () => {
    const run = Bun.spawnSync(["bun", "scripts/landing.mjs", "--check"], {
      cwd: ROOT,
    });
    const output = new TextDecoder()
      .decode(run.exitCode === 0 ? run.stdout : run.stderr)
      .trim();

    expect(`${run.exitCode}: ${output}`).toBe(
      "0: landing/index.html matches the catalogues",
    );
  });
});

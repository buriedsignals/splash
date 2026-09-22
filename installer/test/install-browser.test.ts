import { afterEach, expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Browser, computeExecutablePath, detectBrowserPlatform } from "@puppeteer/browsers";
import { PUPPETEER_REVISIONS } from "puppeteer-core/internal/revisions.js";
import { installBrowser } from "../install-browser.mjs";

const cleanups: string[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("installs the exact Puppeteer Chrome build and writes a lock-bound receipt", async () => {
  const parent = await realpath(await mkdtemp(join(tmpdir(), "splash-browser-test-")));
  cleanups.push(parent);
  const checkout = join(parent, "checkout");
  const runtimeRoot = join(parent, "runtime");
  await mkdir(checkout, { mode: 0o700 });
  await writeFile(join(checkout, "bun.lock"), "frozen-lock\n");
  const platform = detectBrowserPlatform();
  if (!platform) throw new Error("test platform is not supported by Puppeteer");

  let installOptions: unknown;
  const result = await installBrowser({
    checkoutRoot: checkout,
    runtimeRoot,
    installFn: async (options) => {
      installOptions = options;
      const executable = computeExecutablePath(options);
      await mkdir(dirname(executable), { recursive: true });
      await writeFile(executable, "fixture browser\n", { mode: 0o755 });
      return { browser: options.browser, buildId: options.buildId, platform: options.platform, path: runtimeRoot } as never;
    },
  });

  expect(installOptions).toEqual({
    browser: Browser.CHROME,
    buildId: PUPPETEER_REVISIONS.chrome,
    cacheDir: runtimeRoot,
    platform,
  });
  expect(result.executable).toBe(computeExecutablePath(installOptions as Parameters<typeof computeExecutablePath>[0]));
  const receipt = JSON.parse(await readFile(join(runtimeRoot, "browser.json"), "utf8"));
  expect(receipt).toMatchObject({
    schemaVersion: "engine-splash-browser/v1",
    buildId: PUPPETEER_REVISIONS.chrome,
    platform,
    executable: result.executable.slice(runtimeRoot.length + 1),
  });
  expect(receipt.lockSHA256).toMatch(/^[a-f0-9]{64}$/);
  expect(receipt.installedBytes).toBeGreaterThan(0);
  expect((await lstat(result.executable)).mode & 0o111).not.toBe(0);
});

/**
 * B2 — A FRESH INSTALL HUNG FOREVER HERE, AND THIS FILE IS WHY IT CAN BE FIXED WITHOUT ENGINE.
 *
 * Engine runs this script with `bun`, and `@puppeteer/browsers`' extraction deadlocks under Bun
 * 1.3.5: measured twice on 2026-09-22, 41 minutes and 18 minutes at 0% CPU with 225 MB of the
 * Chrome framework written and nine threads parked in `__ulock_wait2`. node does the identical
 * work in 50.8 seconds. Engine chooses the runtime and we cannot change that — but the script it
 * runs is ours, and it can hand the one step that deadlocks to node.
 *
 * The second test is the trap that makes the first dangerous: the entry guard was `import.meta.main`,
 * which only Bun defines. Run under node as-is, this file exits 0 having installed nothing, and a
 * silent success is worse than the hang it replaces.
 */
test("hands the extraction to node when Bun is the runtime and nobody injected an installer", async () => {
  const parent = await realpath(await mkdtemp(join(tmpdir(), "splash-delegate-")));
  cleanups.push(parent);
  const checkout = join(parent, "checkout");
  await mkdir(checkout, { recursive: true });
  await writeFile(join(checkout, "bun.lock"), "lock\n");
  const runtimeRoot = join(parent, "runtime");
  const recorded = join(parent, "argv.txt");

  // Stands in for node: records what it was asked to do, and installs nothing.
  const stub = join(parent, "fake-node");
  await writeFile(stub, `#!/bin/sh\nprintf '%s\\n' "$@" > ${JSON.stringify(recorded)}\nexit 0\n`, { mode: 0o755 });

  const previous = process.env.SPLASH_NODE;
  process.env.SPLASH_NODE = stub;
  try {
    // The extraction is delegated, so nothing lands and the verification after it refuses. What
    // this test holds is the delegation, which the recorded argv proves.
    await expect(installBrowser({ checkoutRoot: checkout, runtimeRoot })).rejects.toThrow();
  } finally {
    if (previous === undefined) delete process.env.SPLASH_NODE;
    else process.env.SPLASH_NODE = previous;
  }

  const argv = await readFile(recorded, "utf8");
  expect(argv).toContain("--install-only");
  expect(argv).toContain(runtimeRoot);
});

test("does its own work when node runs it, instead of exiting silently", async () => {
  const script = join(dirname(import.meta.dirname), "install-browser.mjs");
  const run = Bun.spawnSync({
    cmd: ["node", script, "--checkout-root", "/nonexistent-checkout", "--runtime-root", "/nonexistent/runtime"],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(run.exitCode).toBe(1);
  expect(run.stderr.toString().trim()).not.toBe("");
});

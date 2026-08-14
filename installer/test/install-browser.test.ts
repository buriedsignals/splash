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

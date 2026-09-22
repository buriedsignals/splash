#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Browser, computeExecutablePath, detectBrowserPlatform, install } from "@puppeteer/browsers";
import { PUPPETEER_REVISIONS } from "puppeteer-core/internal/revisions.js";

function option(argv, name) {
  const at = argv.indexOf(name);
  if (at < 0 || at + 1 >= argv.length) throw new Error(`${name} is required`);
  return argv[at + 1];
}

function beneath(root, path) {
  const rel = relative(root, path);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function realParent(path) {
  if (!isAbsolute(path) || resolve(path) !== path) throw new Error("runtime root must be a clean absolute path");
  const parent = dirname(path);
  const info = await lstat(parent);
  if (!info.isDirectory() || info.isSymbolicLink() || await realpath(parent) !== parent) {
    throw new Error("runtime root parent must be a real canonical directory");
  }
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function installedBytes(root) {
  let total = 0;
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) total += (await lstat(path)).size;
    }
  }
  if (!Number.isSafeInteger(total)) throw new Error("installed browser byte count is unsafe");
  return total;
}

/**
 * THE ONE STEP THAT DEADLOCKS UNDER BUN, HANDED TO NODE.
 *
 * Engine runs this script with `bun`, and `@puppeteer/browsers` unzipping Chrome under Bun 1.3.5
 * stops dead: measured twice on 2026-09-22, 41 minutes and 18 minutes at 0% CPU, 225 MB of the
 * framework binary written and nine threads parked in `__ulock_wait2`, with the 177 MB archive
 * already complete on disk. The same call under node v20 finishes in 50.8 seconds. Every install
 * attempt before that had reused a browser installed weeks earlier, which is why it took a
 * genuinely fresh machine to see it: step 5 only does real work when there is nothing to reuse.
 *
 * Engine picks the runtime and this repository cannot change that. What it can do is not perform
 * the failing step in it. Only the extraction is delegated — the checks after it, and the receipt,
 * stay in this process, so a delegated install is verified exactly as a local one is.
 *
 * `SPLASH_NODE` names the binary, for a host whose node is not on PATH and for the test that holds
 * this delegation in place.
 */
async function extractThroughNode({ buildId, cacheDir, platform }) {
  const node = process.env.SPLASH_NODE ?? "node";
  const run = spawnSync(
    node,
    [fileURLToPath(import.meta.url), "--install-only", "--build-id", buildId, "--cache-dir", cacheDir, "--platform", platform],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (run.error) {
    throw new Error(
      `the managed browser is extracted by node, which could not be started (${run.error.message}). Install node, or name it in SPLASH_NODE.`,
    );
  }
  if (run.status !== 0) {
    throw new Error(`node could not install the managed browser: ${String(run.stderr ?? "").trim() || `exit ${run.status}`}`);
  }
}

const RUNNING_UNDER_BUN = typeof process.versions.bun === "string";

/** True when this file is the program being run, under Bun (`import.meta.main`) or node. */
function isEntryPoint() {
  if (typeof import.meta.main === "boolean") return import.meta.main;
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

export async function installBrowser({ checkoutRoot, runtimeRoot, installFn } = {}) {
  // A caller that injected one gets theirs, whatever the runtime — that is the test seam. Nobody
  // injects in production, and that is exactly the path that has to avoid Bun.
  const extract = installFn ?? (RUNNING_UNDER_BUN ? extractThroughNode : install);
  await realParent(runtimeRoot);
  const checkout = await realpath(checkoutRoot);
  if (checkout !== checkoutRoot) throw new Error("checkout root must be canonical");
  const lockPath = join(checkout, "bun.lock");
  const lockSHA256 = await sha256(lockPath);
  const platform = detectBrowserPlatform();
  const buildId = PUPPETEER_REVISIONS.chrome;
  if (!platform || !/^[0-9]+(?:\.[0-9]+)+$/.test(buildId)) throw new Error("Puppeteer has no pinned Chrome build for this platform");
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  await extract({ browser: Browser.CHROME, buildId, cacheDir: runtimeRoot, platform });
  const executable = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir: runtimeRoot, platform });
  const canonicalExecutable = await realpath(executable);
  const executableInfo = await lstat(canonicalExecutable);
  if (!executableInfo.isFile() || executableInfo.isSymbolicLink() ||
      (process.platform !== "win32" && (executableInfo.mode & 0o111) === 0) ||
      !beneath(runtimeRoot, canonicalExecutable)) {
    throw new Error("installed Chrome executable escaped the Engine-managed runtime root");
  }
  const receipt = {
    schemaVersion: "engine-splash-browser/v1",
    buildId,
    platform,
    lockSHA256,
    executable: relative(runtimeRoot, canonicalExecutable),
    installedBytes: await installedBytes(runtimeRoot),
  };
  const receiptPath = join(runtimeRoot, "browser.json");
  const temporary = `${receiptPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(receipt)}\n`, { flag: "wx", mode: 0o600 });
  try {
    await rename(temporary, receiptPath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return { runtimeRoot, executable: canonicalExecutable, buildId, platform, lockSHA256 };
}

if (isEntryPoint()) {
  const argv = process.argv.slice(2);
  if (argv.includes("--install-only")) {
    // The delegated half, run by node: download and unpack, nothing else. Everything that decides
    // whether the result is acceptable stays with the caller.
    install({
      browser: Browser.CHROME,
      buildId: option(argv, "--build-id"),
      cacheDir: option(argv, "--cache-dir"),
      platform: option(argv, "--platform"),
    })
      .then(() => process.stdout.write("installed\n"))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : "managed browser extraction failed");
        process.exitCode = 1;
      });
  } else {
    installBrowser({ checkoutRoot: option(argv, "--checkout-root"), runtimeRoot: option(argv, "--runtime-root") })
      .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
      .catch((error) => {
        console.error(error instanceof Error ? error.message : "managed browser installation failed");
        process.exitCode = 1;
      });
  }
}

#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
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

export async function installBrowser({ checkoutRoot, runtimeRoot, installFn = install } = {}) {
  await realParent(runtimeRoot);
  const checkout = await realpath(checkoutRoot);
  if (checkout !== checkoutRoot) throw new Error("checkout root must be canonical");
  const lockPath = join(checkout, "bun.lock");
  const lockSHA256 = await sha256(lockPath);
  const platform = detectBrowserPlatform();
  const buildId = PUPPETEER_REVISIONS.chrome;
  if (!platform || !/^[0-9]+(?:\.[0-9]+)+$/.test(buildId)) throw new Error("Puppeteer has no pinned Chrome build for this platform");
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  await installFn({ browser: Browser.CHROME, buildId, cacheDir: runtimeRoot, platform });
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

if (import.meta.main) {
  const argv = process.argv.slice(2);
  installBrowser({ checkoutRoot: option(argv, "--checkout-root"), runtimeRoot: option(argv, "--runtime-root") })
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "managed browser installation failed");
      process.exitCode = 1;
    });
}

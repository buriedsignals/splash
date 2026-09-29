// THE CHROME THE TESTS DRIVE IS PINNED HERE — issue #82.
//
// Several heavy guards record what a real browser measured (rgb fills, sample counts, box sizes), and
// those numbers belong to one Chrome build. Before this file every test found its browser by falling
// through `CHROME_PATH`, `~/.cache/puppeteer/chrome` and finally `/Applications/Google Chrome.app` —
// which updates itself, so a recorded measurement could move under a suite nobody had touched. The
// pin is a Chrome for Testing build at the version the suite was measured on (Google Chrome
// 154.0.8037.58 on 2026-09-29), installed by `@puppeteer/browsers`:
//
//   bun run chrome:install      installs PINNED_CHROME into CHROME_CACHE (idempotent)
//
// WHY THE PUPPETEER CACHE, NOT A CACHE OF OUR OWN. Most browser guards do not launch Chrome
// themselves: they spawn a skill's script (render-web, verify-scrolly, bake-plate…), and every one of
// those resolves Chrome on its own — `CHROME_PATH`, then `~/.cache/puppeteer/chrome/<build>/…`, then
// system Chrome. Exporting `CHROME_PATH` from inside `bun test` does not reach them: Bun hands a child
// process the environment it started with, not `process.env` as mutated since (measured with Bun
// 1.3.14, both `node:child_process` and `Bun.spawnSync`). Installed into the puppeteer cache, the
// pinned build is what those scripts already find before system Chrome, with no change to them.
//
// `bunfig.toml` also preloads `scripts/test-preload.mjs`, which exports the pinned binary as
// `CHROME_PATH` for in-process resolvers, and says so — once per run — when the pin is missing (the
// run then falls back to system Chrome) or when another build in the cache would shadow it for a
// spawned script. An explicit `CHROME_PATH` still wins everywhere.

import { existsSync, openSync, closeSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
} from "@puppeteer/browsers";

/** The one place the pinned build is recorded. Change it only together with every recorded measurement it moves. */
export const PINNED_CHROME = "154.0.8037.58";

/** Where `bun run chrome:install` puts it: puppeteer's default cache, which every Splash script searches. */
export const CHROME_CACHE = join(homedir(), ".cache", "puppeteer");

/** The pinned binary's path on this platform, whether or not it is installed. */
export function pinnedChromePath() {
  return computeExecutablePath({
    browser: Browser.CHROME,
    buildId: PINNED_CHROME,
    cacheDir: CHROME_CACHE,
    platform: detectBrowserPlatform(),
  });
}

/** Every browser a Splash script would try after `CHROME_PATH`, in its own order: cached builds, newest name first, then system browsers. */
function scriptCandidates() {
  const candidates = [];
  const cache = join(CHROME_CACHE, "chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  );
  return candidates;
}

let warned = false;

/**
 * One line, once per `bun test` run. `bun test --parallel` re-evaluates every module per file in
 * each worker, so a module flag alone would print it once per file; the workers share their
 * coordinator's pid, and an exclusive marker file keyed on it lets the first one speak.
 */
function warnOnce(message) {
  if (warned) return;
  warned = true;
  if (process.env.BUN_TEST_WORKER_ID) {
    try {
      closeSync(openSync(join(tmpdir(), `splash-unpinned-chrome-${process.ppid}`), "wx"));
    } catch {
      return; // another worker of this run already said it
    }
  }
  console.warn(`chrome: ${message}`);
}

/** The pinned binary if installed, else the first unpinned browser found (with the warning), else null. */
export function testChrome() {
  const pinned = pinnedChromePath();
  const firstForScripts = scriptCandidates().find((path) => existsSync(path));
  if (existsSync(pinned)) {
    if (firstForScripts !== pinned && !process.env.CHROME_PATH)
      warnOnce(
        `${firstForScripts} sorts ahead of the pinned Chrome for Testing ${PINNED_CHROME} in ${join(CHROME_CACHE, "chrome")}, so a script a test spawns would render on it — remove it, or export CHROME_PATH=${pinned}`,
      );
    return pinned;
  }
  if (firstForScripts)
    warnOnce(
      `pinned Chrome for Testing ${PINNED_CHROME} is not installed (${pinned}) — run \`bun run chrome:install\`; using UNPINNED ${firstForScripts}, so recorded browser measurements may drift`,
    );
  return firstForScripts ?? null;
}

/**
 * The browser a test launches: an explicit `CHROME_PATH`, else the pinned build, else an unpinned
 * fallback with one warning. Refuses, naming every path tried, when there is none.
 */
export function resolveChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const found = testChrome();
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${[process.env.CHROME_PATH, pinnedChromePath(), ...scriptCandidates()].filter(Boolean).join("\n  ")}\nRun: bun run chrome:install`,
    );
  return found;
}

if (import.meta.main) {
  if (process.argv[2] !== "--install") {
    console.error("usage: bun scripts/chrome-for-testing.mjs --install");
    process.exit(2);
  }
  const platform = detectBrowserPlatform();
  if (!platform) {
    console.error("chrome: this platform has no Chrome for Testing build");
    process.exit(1);
  }
  const installed = await install({
    browser: Browser.CHROME,
    buildId: PINNED_CHROME,
    cacheDir: CHROME_CACHE,
    platform,
  });
  console.log(`chrome: Chrome for Testing ${PINNED_CHROME} at ${installed.executablePath}`);
}

// twin/shared/design-base/chrome.mjs
//
// WHERE CHROME IS — asked by a beat, on the one import path a beat has.
//
// `puppeteer-core` ships no browser, so every launch must be handed an `executablePath`. Four files
// in this tree had worked that out for themselves (two bakes, two verifiers) and one had not: the
// web-map runner's fallback capture launched with no path at all, so it failed on every machine,
// for every type, for every beat, with `An \`executablePath\` or \`channel\` must be specified for
// \`puppeteer-core\`` — twenty lines away from a sibling that gets it right. Measured 2026-09-23.
//
// The Engine installs a managed browser, so `CHROME_PATH` is consulted first and named in the
// refusal; the cache and the system Chrome are the fallbacks, in that order.

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The browser binary a `puppeteer-core` launch must be given, or a refusal naming every path tried. */
export function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

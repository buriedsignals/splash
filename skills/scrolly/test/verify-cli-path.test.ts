// FINDING 11 (stress round three): given a relative file argument, `verify-scrolly.mjs` builds
// `file://${file}` straight off `process.argv` and Chrome reports `net::ERR_INVALID_URL at
// file://stories/...` — a message that points at "an invalid URL" when the real problem is "this
// path was never resolved against the current directory". Reproduced on this tree, unpatched:
//
//   $ bun skills/scrolly/scripts/verify-scrolly.mjs proof/scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html --width=1600
//   error: net::ERR_INVALID_URL at file://proof/scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html
//       at navigate (node_modules/puppeteer-core/lib/esm/puppeteer/cdp/Frame.js:185:31)
//
// An hour of a driver's own time goes to that message pointing at the wrong problem. The fix is
// resolution, not detection: `resolveFileArg` is `path.resolve`, exported so the CLI's own
// behaviour is testable without launching Chrome — `verifyAll` calls it on every path it is given,
// so every existing caller (every test in this suite already passes an absolute path) sees no
// change, and a relative one now resolves against `process.cwd()` instead of reaching Chrome at all.
import { describe, it, expect } from "bun:test";
import { isAbsolute, resolve } from "node:path";
import { resolveFileArg } from "../scripts/verify-scrolly.mjs";

describe("resolveFileArg", () => {
  it("should resolve a relative path against the current working directory", () => {
    const relative =
      "stories/stress-o-museum-visits/beats/1-museum-visits-scrolly/render/museum-visits-scrolly.html";
    const resolved = resolveFileArg(relative);
    expect(isAbsolute(resolved)).toBe(true);
    expect(resolved).toBe(resolve(process.cwd(), relative));
  });

  it("should leave an already-absolute path unchanged", () => {
    const absolute = resolve(
      process.cwd(),
      "proof/scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html",
    );
    expect(resolveFileArg(absolute)).toBe(absolute);
  });
});

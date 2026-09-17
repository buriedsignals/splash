// LANE: heavy
/**
 * A FAMILY NAME BECOMES A FONT FILE, AND THE FILE IS CHECKED BEFORE IT IS KEPT.
 *
 * This is the mechanism the whole typeface flip rests on: `resolve-families.mjs` ladders Google
 * families, `render-still.mjs` hands resvg FILES with `loadSystemFonts: false`, and between the two
 * sits `typefaces.mjs`, which turns `Merriweather` into a `.ttf` on disk. Three properties have to
 * hold or the mechanism is worse than what it replaced.
 *
 *   1. IT REALLY FETCHES A FONT. Not a stylesheet, not a woff2 resvg cannot read, not an error page.
 *   2. A CACHE HIT COSTS NOTHING. Second use must not go near the network — proved by running the
 *      second call in a subprocess with `curl` unreachable, which is the only way to prove a
 *      negative about I/O from outside the module.
 *   3. A NON-FONT IS NEVER KEPT. A cached error page would set every later render in silence, which
 *      is the exact class of defect this branch exists to end.
 *
 * AND THE FOURTH, WHICH IS THE REFUSAL: a cache miss with no network says the family's name and
 * stops. It does not quietly fall back to a face this machine happens to have — `useTypeface`'s own
 * rule is that a silent stack has not chosen.
 *
 * WHAT IT DOES NOT REACH, stated rather than papered over: the refusal on a non-font DOWNLOAD is
 * exercised through `isFontFile` and through a poisoned cache entry, not by making Google serve an
 * error page, which this suite cannot arrange. The predicate and the cache path are the two places
 * the bytes are judged, and both are asserted here.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  isFontFile,
  typefaceFile,
  typefaceCacheDir,
  parseFaces,
  nearestFace,
} from "../../../shared/design-base/typefaces.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");
let cache: string;

beforeAll(() => {
  cache = mkdtempSync(join(tmpdir(), "typefaces-"));
  process.env.SPLASH_TYPEFACE_CACHE = cache;
});
afterAll(() => {
  delete process.env.SPLASH_TYPEFACE_CACHE;
  rmSync(cache, { recursive: true, force: true });
});

/** A `curl` that always fails, first on PATH. Emptying PATH is NOT enough — `execvp` falls back to
 *  the system's own default path, so the real curl is still found and the test would silently be
 *  measuring a working network. A shim makes "no network" a property of the test rather than of the
 *  machine it runs on. */
function noNetworkBin() {
  const dir = mkdtempSync(join(tmpdir(), "no-network-"));
  const shim = join(dir, "curl");
  writeFileSync(shim, "#!/bin/sh\necho 'curl: (7) could not connect' 1>&2\nexit 7\n");
  chmodSync(shim, 0o755);
  return dir;
}

/** One call to `typefaceFile`, out of process — so no in-memory memo can hide a fetch — with the
 *  environment the test chooses. */
function outOfProcess(
  family: string,
  weight: number,
  { cacheDir, network }: { cacheDir: string; network: boolean },
) {
  const program =
    `import { typefaceFile } from ${JSON.stringify(join(TWIN, "shared/design-base/typefaces.mjs"))};\n` +
    `process.stdout.write(typefaceFile(process.argv[2], Number(process.argv[3])));\n`;
  const scriptDir = mkdtempSync(join(tmpdir(), "typeface-probe-"));
  const script = join(scriptDir, "probe.mjs");
  writeFileSync(script, program);
  const blocked = network ? null : noNetworkBin();
  try {
    return spawnSync(process.execPath, [script, family, String(weight)], {
      encoding: "utf8",
      env: {
        SPLASH_TYPEFACE_CACHE: cacheDir,
        HOME: process.env.HOME ?? "",
        PATH: blocked ? `${blocked}:${process.env.PATH ?? ""}` : (process.env.PATH ?? ""),
      },
    });
  } finally {
    rmSync(scriptDir, { recursive: true, force: true });
    if (blocked) rmSync(blocked, { recursive: true, force: true });
  }
}

describe("the typeface cache", () => {
  it("should fetch a real TrueType file for a Google family", () => {
    const path = typefaceFile("Merriweather", 700);
    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path);
    // `00 01 00 00` — TrueType outlines. A woff2 would open `wOF2` and an error page `<`.
    expect([...bytes.slice(0, 4)]).toEqual([0x00, 0x01, 0x00, 0x00]);
    expect(bytes.length).toBeGreaterThan(20_000);
    expect(isFontFile(bytes)).toBe(true);
  });

  it("should answer a second call from the cache, with no network at all", () => {
    // BOTH calls out of process, and the FIRST one is what fills this suite's own cache
    // directory. In process it does not: `typefaces.mjs` memoises by family|weight|style for the
    // life of the process, and `bun test` loads every file of a lane into ONE process, so a
    // sibling suite that has already asked for Merriweather leaves a memo pointing at the REAL
    // cache under `~/.cache`. `typefaceFile` here then answered from that memo, this suite's
    // temp directory stayed empty, and the no-network call below found nothing to read — the
    // suite passed alone and failed in the lane. The memo is correct behaviour and is precisely
    // what this test must not lean on.
    const fill = outOfProcess("Merriweather", 700, {
      cacheDir: cache,
      network: true,
    });
    expect([fill.status, fill.stderr]).toEqual([0, ""]);
    const path = fill.stdout;
    const before = statSync(path).mtimeMs;

    // A fresh process, so no in-memory memo can hide a fetch — and no `curl` on PATH, so a fetch
    // could not have succeeded. If this returns the path, the answer came off disk.
    const run = outOfProcess("Merriweather", 700, {
      cacheDir: cache,
      network: false,
    });
    expect([run.status, run.stderr]).toEqual([0, ""]);
    expect(run.stdout).toBe(path);
    expect(statSync(path).mtimeMs).toBe(before);
  });

  it("should refuse, naming the family, on a cache miss with no network", () => {
    const empty = mkdtempSync(join(tmpdir(), "typefaces-empty-"));
    try {
      const run = outOfProcess("Libre Baskerville", 400, {
        cacheDir: empty,
        network: false,
      });
      expect(run.status).not.toBe(0);
      expect(run.stderr).toContain("Libre Baskerville");
      // It must not have written anything: a refusal that leaves a stub behind is a poisoned cache.
      expect(existsSync(join(empty, "Libre-Baskerville-400.ttf"))).toBe(false);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("should never hand back a cached file that is not a font", () => {
    const poisoned = mkdtempSync(join(tmpdir(), "typefaces-poisoned-"));
    try {
      mkdirSync(poisoned, { recursive: true });
      const path = join(poisoned, "Montserrat-400.ttf");
      // Exactly what a captive portal or a 404 page leaves behind under a `.ttf` name.
      writeFileSync(path, "<!DOCTYPE html><title>404</title>");
      expect(isFontFile(readFileSync(path))).toBe(false);

      const run = outOfProcess("Montserrat", 400, {
        cacheDir: poisoned,
        network: true,
      });
      expect([run.status, run.stderr]).toEqual([0, ""]);
      expect(run.stdout).toBe(path);
      expect(isFontFile(readFileSync(path))).toBe(true);
    } finally {
      rmSync(poisoned, { recursive: true, force: true });
    }
  });

  it("should read a non-font for what it is, whatever it pretends to be", () => {
    expect(isFontFile(Buffer.from("<!DOCTYPE html>"))).toBe(false);
    expect(isFontFile(Buffer.from("wOF2extra"))).toBe(false);
    expect(isFontFile(Buffer.from("wOFFextra"))).toBe(false);
    expect(isFontFile(Buffer.from([]))).toBe(false);
    expect(isFontFile(Buffer.from("OTTOxxxx"))).toBe(true);
    expect(isFontFile(Buffer.from([0x00, 0x01, 0x00, 0x00, 0x09]))).toBe(true);
  });

  it("should refuse a family name that could reach out of the cache directory", () => {
    expect(() => typefaceFile("../../etc/passwd", 400)).toThrow(
      /not a family name/,
    );
    expect(() => typefaceFile("Open Sans; rm -rf /", 400)).toThrow(
      /not a family name/,
    );
  });

  it("should keep the cache outside the repository, where nothing can commit it", () => {
    delete process.env.SPLASH_TYPEFACE_CACHE;
    try {
      expect(typefaceCacheDir().startsWith(TWIN)).toBe(false);
    } finally {
      process.env.SPLASH_TYPEFACE_CACHE = cache;
    }
  });

  it("should pick the nearest face Google really serves, rather than assume the one asked for", () => {
    // Lato has 400 and 700 and nothing between: css2 answers a request for 500 by omitting it
    // entirely, so the choice has to be made here where it can be seen.
    const css = `
      @font-face { font-family: 'Lato'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/a/400.ttf) format('truetype'); }
      @font-face { font-family: 'Lato'; font-style: italic; font-weight: 400; src: url(https://fonts.gstatic.com/a/400i.ttf) format('truetype'); }
      @font-face { font-family: 'Lato'; font-style: normal; font-weight: 700; src: url(https://fonts.gstatic.com/a/700.ttf) format('truetype'); }
    `;
    const faces = parseFaces(css);
    expect(faces.length).toBe(3);
    expect(nearestFace(faces, 500, false)).toMatchObject({
      weight: 400,
      style: "normal",
    });
    expect(nearestFace(faces, 600, false)).toMatchObject({
      weight: 700,
      style: "normal",
    });
    expect(nearestFace(faces, 700, true)).toMatchObject({
      weight: 400,
      style: "italic",
    });
    // A family with no italic at all answers with its upright rather than with nothing.
    expect(
      nearestFace(
        parseFaces(css).filter((f) => f.style === "normal"),
        400,
        true,
      ),
    ).toMatchObject({
      style: "normal",
    });
  });
});

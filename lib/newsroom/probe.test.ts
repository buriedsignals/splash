import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  defaultResolveDep,
  isSet,
  parseEnvFile,
  probeRemotionBrowser,
  remotionExecutablePath,
} from "./probe";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "newsroom-probe-"));
}

// These three primitives used to exist twice — once in lib/newsroom, once in
// skills/splash/src/preflight.ts — with a byte-identical .env regex. This file is the one
// place their behaviour is pinned; both consumers now import it.
describe("parseEnvFile", () => {
  it("reads KEY=value, quoted or bare", () => {
    const d = dir();
    writeFileSync(
      join(d, ".env"),
      'DATAWRAPPER_API_TOKEN="dw-token"\nVITE_MAPTILER_KEY=mt-key\n',
    );
    expect(parseEnvFile(join(d, ".env"))).toEqual({
      DATAWRAPPER_API_TOKEN: "dw-token",
      VITE_MAPTILER_KEY: "mt-key",
    });
  });

  it("yields an empty map for an absent file instead of throwing", () => {
    expect(() => parseEnvFile(join(dir(), ".env"))).not.toThrow();
    expect(parseEnvFile(join(dir(), ".env"))).toEqual({});
  });

  it("keeps an empty assignment as an empty value, which isSet then rejects", () => {
    const d = dir();
    writeFileSync(join(d, ".env"), "SPLASH_UI_LANG=\n");
    const parsed = parseEnvFile(join(d, ".env"));
    expect(parsed.SPLASH_UI_LANG).toBe("");
    expect(isSet(parsed.SPLASH_UI_LANG)).toBe(false);
  });
});

describe("isSet", () => {
  it("treats undefined, empty and whitespace-only as not set", () => {
    for (const v of [undefined, "", "   ", "\t"]) expect(isSet(v)).toBe(false);
  });
  it("treats any real value as set", () => {
    expect(isSet("x")).toBe(true);
  });
});

describe("defaultResolveDep", () => {
  it("answers false for a package that does not exist, without throwing", () => {
    expect(defaultResolveDep("no-such-package-anywhere", import.meta.dir)).toBe(
      false,
    );
  });
  it("answers true for one that does", () => {
    expect(defaultResolveDep("zod", import.meta.dir)).toBe(true);
  });
});

// probeRemotionBrowser — the fourth primitive. It exists because of a real incident: a stalled
// fetch left a 62.6 MB fragment of a 93.5 MB Chrome Headless Shell zip sitting unextracted in
// node_modules/.remotion, and `bun install` + package resolution both reported the engine
// "installed" while every subsequent video render died with an unreadable subprocess dump. This
// is a filesystem check only (no spawn, no network) so it costs nothing on every readiness call.
describe("probeRemotionBrowser", () => {
  it("is missing when nothing has been downloaded yet", () => {
    const r = probeRemotionBrowser(dir());
    expect(r.status).toBe("missing");
  });

  it("is missing when only a partial zip sits in the downloads folder, unextracted — the actual incident", () => {
    const d = dir();
    const downloadsFolder = join(
      d,
      "node_modules",
      ".remotion",
      "chrome-headless-shell",
    );
    mkdirSync(downloadsFolder, { recursive: true });
    // A stalled fetch: a fragment of the archive, never extracted. extractZipArchive() never
    // ran, so no platform folder — and therefore no executable — was ever created.
    writeFileSync(
      join(downloadsFolder, "chrome-headless-shell-mac-arm64.zip"),
      Buffer.alloc(62_600_000),
    );
    const r = probeRemotionBrowser(d);
    expect(r.status).toBe("missing");
  });

  it("is ready when the executable is fully extracted at Remotion's own cache path", () => {
    const d = dir();
    const executablePath = remotionExecutablePath(d);
    expect(executablePath).not.toBeNull();
    mkdirSync(dirname(executablePath!), { recursive: true });
    // A real headless-shell binary runs 50-90 MB; padding well past the probe's floor proves
    // the check does more than "the file exists".
    writeFileSync(executablePath!, Buffer.alloc(2_000_000));
    const r = probeRemotionBrowser(d);
    expect(r.status).toBe("ready");
    expect(r.executablePath).toBe(executablePath!);
  });

  it("is missing when the extracted file is a truncated stub, not a real binary", () => {
    const d = dir();
    const executablePath = remotionExecutablePath(d);
    mkdirSync(dirname(executablePath!), { recursive: true });
    writeFileSync(executablePath!, Buffer.alloc(10));
    const r = probeRemotionBrowser(d);
    expect(r.status).toBe("missing");
  });

  it("names the executable path even when nothing was ever downloaded — a caller can log it", () => {
    const r = probeRemotionBrowser(dir());
    expect(r.executablePath.length).toBeGreaterThan(0);
    expect(r.executablePath).toContain(".remotion");
  });
});

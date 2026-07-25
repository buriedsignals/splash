import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultResolveDep, isSet, parseEnvFile } from "./probe";

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

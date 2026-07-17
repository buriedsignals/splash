// save-key.mjs — the mechanical seam for journalist-supplied keys (key-prerequisite flow).
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../scripts/save-key.mjs");
const tmpEnv = () => join(mkdtempSync(join(tmpdir(), "save-key-")), ".env");

const run = (args: string[], envPath: string) =>
  execFileSync("bun", [CLI, ...args, "--env", envPath], { encoding: "utf8" });

describe("save-key CLI", () => {
  it("should write a quoted key, mirror the MapTiler pair, chmod 0600, and never echo the value", () => {
    const envPath = tmpEnv();
    const out = run(["VITE_MAPTILER_KEY", "mt-secret-123"], envPath);
    const file = readFileSync(envPath, "utf8");
    expect(file).toContain('VITE_MAPTILER_KEY="mt-secret-123"');
    expect(file).toContain('REMOTION_MAPTILER_KEY="mt-secret-123"');
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
    expect(out).not.toContain("mt-secret-123");
    expect(JSON.parse(out).saved).toBe("VITE_MAPTILER_KEY");
  });

  it("should REPLACE an existing line, never duplicate it", () => {
    const envPath = tmpEnv();
    writeFileSync(envPath, 'DATAWRAPPER_API_TOKEN="old"\nOTHER="keep"\n');
    run(["DATAWRAPPER_API_TOKEN", "new-token"], envPath);
    const file = readFileSync(envPath, "utf8");
    expect(file.match(/DATAWRAPPER_API_TOKEN/g)?.length).toBe(1);
    expect(file).toContain('DATAWRAPPER_API_TOKEN="new-token"');
    expect(file).toContain('OTHER="keep"');
  });

  it("should refuse an unknown key name (only manifest names are writable)", () => {
    const envPath = tmpEnv();
    expect(() => run(["EVIL_EXFIL_URL", "x"], envPath)).toThrow();
  });

  it("should refuse an empty value", () => {
    const envPath = tmpEnv();
    expect(() => run(["DATAWRAPPER_API_TOKEN", "  "], envPath)).toThrow();
  });

  it("should strip quotes and newlines from the value (installer escaping rule)", () => {
    const envPath = tmpEnv();
    run(["FLY_API_TOKEN", 'FlyV1 fm2_"abc"\ndef'], envPath);
    expect(readFileSync(envPath, "utf8")).toContain('FLY_API_TOKEN="FlyV1 fm2_abcdef"');
  });
});

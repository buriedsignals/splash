import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installedRuntime } from "./read-runtime.ts";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "splash-runtime-"));
}

describe("resolving which runtime this install uses", () => {
  it("reads it from the decor — newsroom.json is its one home", () => {
    const d = dir();
    writeFileSync(
      join(d, "newsroom.json"),
      JSON.stringify({ schemaVersion: 1, runtime: "goose", uiLang: "en" }),
    );
    expect(installedRuntime(d)).toBe("goose");
    rmSync(d, { recursive: true, force: true });
  });

  it("still reads an install that has not been through the setup page yet", () => {
    const d = dir();
    writeFileSync(join(d, ".splash-runtime"), "codex\n");
    expect(installedRuntime(d)).toBe("codex");
    rmSync(d, { recursive: true, force: true });
  });

  it("prefers the decor over the legacy file when both exist", () => {
    const d = dir();
    writeFileSync(join(d, ".splash-runtime"), "codex\n");
    writeFileSync(
      join(d, "newsroom.json"),
      JSON.stringify({ schemaVersion: 1, runtime: "gemini", uiLang: "en" }),
    );
    expect(installedRuntime(d)).toBe("gemini");
    rmSync(d, { recursive: true, force: true });
  });

  it("falls back rather than stopping an install — a broken decor is not a dead end", () => {
    const d = dir();
    writeFileSync(join(d, "newsroom.json"), "{not json");
    writeFileSync(join(d, ".splash-runtime"), "goose\n");
    expect(installedRuntime(d)).toBe("goose");

    const empty = dir();
    expect(installedRuntime(empty)).toBe("claude");
    rmSync(d, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  });

  it("refuses a runtime name that is not one of the shipped modules", () => {
    const d = dir();
    // The value is printed into the bootstrap's `$runtime` and used to build a file path. It
    // comes off disk, so it is untrusted input: an install carrying a mangled or hostile value
    // must resolve to the default, never to something the shell then interpolates.
    writeFileSync(join(d, ".splash-runtime"), "../../etc/passwd\n");
    expect(installedRuntime(d)).toBe("claude");
    writeFileSync(join(d, ".splash-runtime"), "goose; rm -rf /\n");
    expect(installedRuntime(d)).toBe("claude");
    rmSync(d, { recursive: true, force: true });
  });

  it("imports nothing — it runs before any dependency is installed", () => {
    const source = readFileSync(
      join(import.meta.dir, "read-runtime.ts"),
      "utf8",
    );
    for (const m of source.matchAll(/^\s*import .*from "([^"]+)"/gm))
      expect(m[1]!.startsWith("node:")).toBe(true);
  });
});

describe("the CLI the bootstrap calls", () => {
  it("prints the runtime and exits 0", () => {
    const d = dir();
    writeFileSync(
      join(d, "newsroom.json"),
      JSON.stringify({ schemaVersion: 1, runtime: "goose", uiLang: "en" }),
    );
    const r = Bun.spawnSync(["bun", join(import.meta.dir, "read-runtime.ts")], {
      cwd: d,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString().trim()).toBe("goose");
    rmSync(d, { recursive: true, force: true });
  });
});

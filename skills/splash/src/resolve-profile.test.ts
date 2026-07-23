import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProfile, resolveProfilePath } from "./resolve-profile";

const originalCwd = process.cwd();
let workDir: string | null = null;

afterEach(() => {
  process.chdir(originalCwd);
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true });
    workDir = null;
  }
});

function chdirToTemp(): string {
  workDir = mkdtempSync(join(tmpdir(), "splash-resolve-profile-"));
  process.chdir(workDir);
  // resolveProfilePath joins against process.cwd(), which resolves symlinks (e.g. macOS
  // /tmp -> /private/tmp) — return the SAME resolved form so the tests compare like-for-like.
  return realpathSync(workDir);
}

describe("resolveProfilePath", () => {
  it("discovers NEWSROOM-PROFILE.md in process.cwd() when no --profile is given", () => {
    const dir = chdirToTemp();
    const profilePath = join(dir, "NEWSROOM-PROFILE.md");
    writeFileSync(profilePath, "---\npalette:\n  - '#ff0000'\n---\n# N\n");
    expect(resolveProfilePath({})).toBe(profilePath);
  });

  it("prefers an explicit --profile over the cwd file", () => {
    const dir = chdirToTemp();
    writeFileSync(
      join(dir, "NEWSROOM-PROFILE.md"),
      "---\npalette:\n  - '#ff0000'\n---\n# N\n",
    );
    const elsewhere = mkdtempSync(
      join(tmpdir(), "splash-resolve-profile-alt-"),
    );
    const explicitPath = join(elsewhere, "OTHER-PROFILE.md");
    writeFileSync(explicitPath, "---\npalette:\n  - '#00ff00'\n---\n# N\n");
    try {
      expect(resolveProfilePath({ profile: explicitPath })).toBe(explicitPath);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("returns null when neither --profile nor a cwd NEWSROOM-PROFILE.md exists", () => {
    chdirToTemp();
    expect(resolveProfilePath({})).toBeNull();
  });
});

describe("resolveProfile", () => {
  it("parses the discovered cwd NEWSROOM-PROFILE.md into a BrandProfile", () => {
    const dir = chdirToTemp();
    writeFileSync(
      join(dir, "NEWSROOM-PROFILE.md"),
      "---\npalette:\n  - '#123456'\n---\n# N\n",
    );
    expect(resolveProfile({})).toEqual({ palette: ["#123456"] });
  });

  it("--profile overrides the cwd file's content too", () => {
    const dir = chdirToTemp();
    writeFileSync(
      join(dir, "NEWSROOM-PROFILE.md"),
      "---\npalette:\n  - '#ff0000'\n---\n# N\n",
    );
    const elsewhere = mkdtempSync(
      join(tmpdir(), "splash-resolve-profile-alt-"),
    );
    const explicitPath = join(elsewhere, "OTHER-PROFILE.md");
    writeFileSync(explicitPath, "---\npalette:\n  - '#00ff00'\n---\n# N\n");
    try {
      expect(resolveProfile({ profile: explicitPath })).toEqual({
        palette: ["#00ff00"],
      });
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("returns an empty {palette: []} profile when neither is found", () => {
    chdirToTemp();
    expect(resolveProfile({})).toEqual({ palette: [] });
  });
});

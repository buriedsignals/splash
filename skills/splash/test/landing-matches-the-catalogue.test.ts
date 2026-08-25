import { afterEach, describe, expect, it } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("the delivered landing page describes the authoritative inventories", () => {
  it("passes the maintained landing drift check", () => {
    const run = Bun.spawnSync(["bun", "scripts/landing.mjs", "--check"], {
      cwd: ROOT,
    });

    expect(run.exitCode).toBe(0);
  });

  it("exits nonzero for an isolated divergent landing page", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-landing-cli-"));
    scratch.push(root);
    mkdirSync(join(root, "scripts"), { recursive: true });
    mkdirSync(join(root, "landing"), { recursive: true });
    mkdirSync(join(root, "catalog"), { recursive: true });
    copyFileSync(
      join(ROOT, "scripts", "landing.mjs"),
      join(root, "scripts", "landing.mjs"),
    );
    const landingPath = join(root, "landing", "index.html");
    const divergent =
      '<button data-form="Bars" data-skill="chart-beat">Bars</button>\n';
    writeFileSync(landingPath, divergent);
    writeFileSync(
      join(root, "catalog", "visual-catalog.json"),
      '{"treatments":[]}\n',
    );

    const run = Bun.spawnSync(["bun", "scripts/landing.mjs", "--check"], {
      cwd: root,
    });

    expect(run.exitCode).toBe(1);
    expect(readFileSync(landingPath, "utf8")).toBe(divergent);
  });
});

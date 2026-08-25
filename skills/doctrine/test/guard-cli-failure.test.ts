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

const scratch: string[] = [];

afterEach(() => {
  for (const root of scratch.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("the maintained guard CLI fails closed", () => {
  it("exits nonzero for an isolated divergent GUARDS.md", () => {
    const checkout = resolve(import.meta.dirname, "..", "..", "..");
    const root = mkdtempSync(join(tmpdir(), "splash-guard-cli-"));
    scratch.push(root);
    mkdirSync(join(root, "scripts"), { recursive: true });
    for (const script of [
      "guard-model.mjs",
      "guard-runtime.mjs",
      "guards.mjs",
      "traits.mjs",
    ])
      copyFileSync(join(checkout, "scripts", script), join(root, "scripts", script));
    const doctrine = join(root, "skills", "doctrine");
    mkdirSync(join(doctrine, "references"), { recursive: true });
    writeFileSync(join(doctrine, "SKILL.md"), "# doctrine\n");
    writeFileSync(
      join(doctrine, "references", "guard-catalogue.json"),
      '{"rules":[]}\n',
    );
    const guardsPath = join(root, "GUARDS.md");
    writeFileSync(guardsPath, "divergent\n");

    const run = Bun.spawnSync(["bun", "scripts/guards.mjs", "--check"], {
      cwd: root,
    });
    const stderr = new TextDecoder().decode(run.stderr);

    expect(run.exitCode).toBe(1);
    expect(stderr).toContain("GUARDS.md");
    expect(readFileSync(guardsPath, "utf8")).toBe("divergent\n");
  });
});

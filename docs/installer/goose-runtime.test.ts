import { test, expect } from "bun:test";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  lstatSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { realLinkAgentsSkills } from "./link-helper";

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const gooseSh = readFileSync(join(RUNTIMES, "goose.sh"), "utf8");
const goosePs1 = readFileSync(join(RUNTIMES, "goose.ps1"), "utf8");

test("goose runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(gooseSh) }).exitCode,
  ).toBe(0);
});

test("runtime_launch_cmd echoes exactly `goose session`", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `. "${join(RUNTIMES, "goose.sh")}"; runtime_launch_cmd`,
  ]);
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toBe("goose session");
});

test("module defines the two contract functions and wires ~/.agents/skills discovery", () => {
  expect(gooseSh).toContain("runtime_install()");
  expect(gooseSh).toContain("runtime_launch_cmd()");
  // Goose reads native Agent Skills from ~/.agents/skills — the shared helper is the surfacing route.
  expect(gooseSh).toContain("link_agents_skills");
});

test("installs Goose via its official Rust-binary installer, never npm", () => {
  expect(gooseSh).toContain("github.com/block/goose");
  expect(gooseSh).toContain("download_cli.sh");
  expect(gooseSh).not.toContain("npm install");
  expect(gooseSh).not.toContain("bun add"); // Goose is not an npm package
  // guards a failed install with actionable guidance
  expect(gooseSh).toContain("could not be installed");
});

// Hermetic behavioural test: with a stub `goose` already on PATH (so the curl install is skipped)
// and a hermetic PATH (no real ~/.local/bin), runtime_install must symlink every fake skill into a
// fake ~/.agents/skills. No network, no real goose, robust to a goose installed on the dev machine.
test("runtime_install symlinks every skill into ~/.agents/skills (CLI install skipped)", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-goose-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    const fakeBin = join(work, "bin");
    const skills = ["alpha", "beta", "gamma"];
    mkdirSync(home, { recursive: true });
    mkdirSync(fakeBin, { recursive: true });
    for (const s of skills) {
      const d = join(dest, ".dist", "skills", s);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "SKILL.md"), `---\nname: ${s}\n---\n`);
    }
    // stub goose so `command -v goose` succeeds → runtime_install skips the real curl install
    const stub = join(fakeBin, "goose");
    writeFileSync(stub, "#!/bin/sh\nexit 0\n");
    chmodSync(stub, 0o755);

    // Hermetic PATH (fake bin + coreutils only — no ~/.local/bin) so only the stub goose is found.
    const harness = `set -euo pipefail
export HOME="${home}"
DEST="${dest}"
export PATH="${fakeBin}:/usr/bin:/bin"
${realLinkAgentsSkills()}
. "${join(RUNTIMES, "goose.sh")}"
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString()).toBe("");
    expect(r.exitCode).toBe(0);

    for (const s of skills) {
      const link = join(home, ".agents", "skills", s);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(realpathSync(link)).toBe(realpathSync(join(dest, ".dist", "skills", s)));
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// Windows mirror — string-level parity (no pwsh in CI).
test("goose.ps1 mirrors the module contract for Windows", () => {
  expect(goosePs1).toContain("function Runtime-Install");
  expect(goosePs1).toContain("function Runtime-LaunchCmd");
  expect(goosePs1).toContain("Link-AgentsSkills");
  expect(goosePs1).toMatch(/Runtime-LaunchCmd\s*\{\s*"goose session"\s*\}/);
  expect(goosePs1).not.toContain("npm install");
});

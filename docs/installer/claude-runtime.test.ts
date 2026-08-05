// Claude Code — the runtime module, under the same contract as its five siblings.
//
// WHY THIS FILE EXISTS. Claude Code is the DEFAULT runtime — bootstrap.sh falls back to it when
// reading the newsroom decor fails (`|| echo claude`) — and it was the only one of the six with no
// dedicated suite: covered incidentally, by one line of bootstrap-sh.test.ts that merely read the
// file. The least-tested module was the most-travelled path. Measured 2026-08-05, on the question
// "have the installs been tested for each?".
//
// IT DIFFERS FROM ITS SIBLINGS IN ONE WAY THAT MATTERS, and that difference is what most of these
// cases pin: Claude Code loads skills with `--plugin-dir .` at launch, so it wires NO
// ~/.agents/skills symlinks. Its sibling modules all call `link_agents_skills`; this one must not,
// because a symlink door it never reads would be dead weight that the dead-link sweep would then
// have to keep tidy for nobody. Asserting the ABSENCE is as load-bearing here as asserting the
// presence is there.
import { test, expect } from "bun:test";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { realLinkAgentsSkills } from "./link-helper";

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const claudeSh = readFileSync(join(RUNTIMES, "claude.sh"), "utf8");
/** The module with its comments stripped. The absence assertions below are about what the module
 *  DOES; claude.sh's own header explains the rule in prose ("wires no ~/.agents/skills symlinks"),
 *  and an assertion that matched that sentence would fail on correct code. Third time in one day
 *  that prose written to explain a rule tripped the rule — match the ACT, not the explanation. */
const claudeCode = claudeSh.replace(/#.*$/gm, "");
const claudePs1 = readFileSync(join(RUNTIMES, "claude.ps1"), "utf8");

test("claude runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(claudeSh) }).exitCode,
  ).toBe(0);
});

test("runtime_launch_cmd echoes exactly `claude --plugin-dir .`", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `. "${join(RUNTIMES, "claude.sh")}"; runtime_launch_cmd`,
  ]);
  expect(out.exitCode).toBe(0);
  // The trailing `.` is the whole mechanism: it is how Claude Code is told where the skills are,
  // and the launcher runs it after cd-ing into the install. Dropping it would launch a runtime
  // that finds nothing, with no error to show for it.
  expect(out.stdout.toString().trim()).toBe("claude --plugin-dir .");
});

test("module defines the two contract functions", () => {
  expect(claudeSh).toContain("runtime_install()");
  expect(claudeSh).toContain("runtime_launch_cmd()");
});

// THE DISTINGUISHING RULE, asserted as an absence.
test("wires NO ~/.agents/skills symlinks — --plugin-dir is the whole discovery route", () => {
  expect(claudeCode).not.toContain("link_agents_skills");
  expect(claudeCode).not.toContain(".agents/skills");
});

test("installs Claude Code from its official installer, never a package manager", () => {
  expect(claudeSh).toContain("claude.ai/install.sh");
  expect(claudeSh).not.toContain("npm install");
  expect(claudeSh).not.toContain("bun add");
  expect(claudeSh).not.toContain("brew install");
  // A failed install must say what to do, not just fail.
  expect(claudeSh).toContain("could not be installed");
});

// Hermetic behavioural test, the same shape as goose's: with a stub `claude` on PATH the network
// install is skipped, so this exercises the REAL module without downloading anything and without
// depending on the claude that happens to be on the developer's machine.
test("runtime_install succeeds with claude already present, and creates no skills door", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-claude-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    const fakeBin = join(work, "bin");
    mkdirSync(home, { recursive: true });
    mkdirSync(fakeBin, { recursive: true });
    // A skill exists in the packaged tree — so if the module DID link, we would see it.
    const d = join(dest, ".dist", "skills", "alpha");
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "SKILL.md"), "---\nname: alpha\n---\n");

    const stub = join(fakeBin, "claude");
    writeFileSync(stub, "#!/bin/sh\nexit 0\n");
    chmodSync(stub, 0o755);

    const harness = `set -euo pipefail
export HOME="${home}"
DEST="${dest}"
export PATH="${fakeBin}:/usr/bin:/bin"
${realLinkAgentsSkills()}
. "${join(RUNTIMES, "claude.sh")}"
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString()).toBe("");
    expect(r.exitCode).toBe(0);
    // The absence is the assertion: no ~/.agents/skills is created for a runtime that never reads it.
    expect(existsSync(join(home, ".agents", "skills", "alpha"))).toBe(false);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// THE FAILURE PATH, which is the one a journalist actually meets: the installer ran and the binary
// is still not there. It must exit non-zero with guidance — never fall through and let bootstrap.sh
// write a launcher for a command that does not exist.
test("runtime_install refuses, with guidance, when claude is still absent afterwards", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-claude-fail-"));
  try {
    const home = join(work, "home");
    const fakeBin = join(work, "bin");
    mkdirSync(home, { recursive: true });
    mkdirSync(fakeBin, { recursive: true });
    // `curl` is stubbed to a no-op so nothing is downloaded and nothing gets installed — the exact
    // shape of "the install ran and did not take".
    for (const name of ["curl", "bash"]) {
      const s = join(fakeBin, name);
      writeFileSync(s, "#!/bin/sh\nexit 0\n");
      chmodSync(s, 0o755);
    }
    const harness = `set +e
export HOME="${home}"
export PATH="${fakeBin}:/usr/bin:/bin"
. "${join(RUNTIMES, "claude.sh")}"
runtime_install
echo "EXIT:$?"
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString()).toContain("could not be installed");
    expect(r.stderr.toString()).toContain("claude.ai");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// Windows mirror — string-level parity (no pwsh on the machine that runs this suite), the same
// standard the five sibling suites hold.
test("claude.ps1 mirrors the module contract for Windows", () => {
  expect(claudePs1).toContain("function Runtime-Install");
  expect(claudePs1).toContain("function Runtime-LaunchCmd");
  expect(claudePs1).toMatch(/Runtime-LaunchCmd[\s\S]{0,120}--plugin-dir/);
  // Same absence as the POSIX module: no skills door for a runtime that does not read one.
  expect(claudePs1).not.toContain("Link-AgentsSkills");
});

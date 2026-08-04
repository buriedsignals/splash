import { test, expect } from "bun:test";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const MODULE = join(RUNTIMES, "claude-desktop.sh");
const sh = readFileSync(MODULE, "utf8");

test("claude-desktop runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode,
  ).toBe(0);
});

test("module defines the two contract functions", () => {
  expect(sh).toContain("runtime_install()");
  expect(sh).toContain("runtime_launch_cmd()");
});

// The whole point of a desktop runtime: the journalist never types a command again. The CLI module
// (claude.sh) launches `claude --plugin-dir .`, which is a terminal invocation and carries its own
// skill directory with it; the app has no such flag, so it is opened plain.
test("runtime_launch_cmd opens the app, never a terminal session", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `. "${MODULE}"; runtime_launch_cmd`,
  ]);
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toBe("open -a Claude");
  expect(out.stdout.toString()).not.toContain("--plugin-dir");
});

// bootstrap.sh writes the launcher through an UNQUOTED heredoc, so a `$` in the launch command is
// expanded when the launcher is WRITTEN rather than when it is RUN. This reproduces that write.
test("the launch command survives bootstrap's heredoc unexpanded", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `set -euo pipefail
. "${MODULE}"
launch_cmd="$(runtime_launch_cmd)"
launcher="$(mktemp)"
cat > "$launcher" <<LAUNCH
#!/usr/bin/env bash
cd "\\$(dirname "\\$0")" && set -a && . ./.env && set +a && $launch_cmd
LAUNCH
tail -1 "$launcher"
rm -f "$launcher"`,
  ]);
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toEndWith("open -a Claude");
});

test("an already-installed app is detected, never reinstalled over", () => {
  expect(sh).toContain("/Applications/Claude.app");
  expect(sh).toMatch(/if \[ ! -d "\$CLAUDE_APP" \]/);
});

// The Goose module was written against a cask name that does not exist (`goose` rather than
// `block-goose`) and only a measurement caught it. This one was measured too: `brew info --cask
// claude` resolves to Anthropic's official app.
test("the install channel is the measured cask, and failure is actionable", () => {
  expect(sh).toContain("--cask claude");
  expect(sh).toContain("could not be installed");
  expect(sh).toContain("claude.com/download");
});

// The app owns the account and the model screen. An installer that baked a key would both leak it
// into a shell profile and fight the app's own sign-in.
test("the module never touches the account or the model", () => {
  expect(sh).not.toMatch(/ANTHROPIC_API_KEY|CLAUDE_MODEL|--model/);
});

// The measurement this module rests on: the shipped bundle auto-loads every skill directory under
// ~/.claude/skills (the reserved `@skills-dir` marketplace) and mounts that same directory into the
// Cowork VM read-only. ~/.agents/skills — the default target, which Codex/Gemini/Goose read — is
// NOT a directory Claude Desktop looks at, so a module that called the helper bare would install a
// runtime that discovers nothing.
test("runtime_install fills ~/.claude/skills, not the default ~/.agents/skills", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-claudedesk-"));
  try {
    const home = join(work, "home");
    const app = join(work, "Claude.app");
    mkdirSync(home, { recursive: true });
    mkdirSync(app, { recursive: true });
    const receipt = join(work, "target-receipt");
    // Stub the shared helper the way goose-desktop-runtime.test.ts does, but record the target it
    // is handed: what this module must get right is WHICH directory it fills.
    const harness = `set -euo pipefail
export HOME="${home}"
DEST="${work}/dest"
export CLAUDE_APP="${app}"
export PATH="/usr/bin:/bin"
link_agents_skills() { printf '%s' "\${1:-$HOME/.agents/skills}" > "${receipt}"; }
. "${MODULE}"
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString()).toBe("");
    expect(r.exitCode).toBe(0);
    expect(readFileSync(receipt, "utf8")).toBe(join(home, ".claude", "skills"));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// An absent app with no Homebrew must fail loud. Silently continuing would produce an install that
// looks finished and has no runtime — the failure would then surface at the journalist's first use.
test("an absent app with no install channel exits non-zero", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-claudedesk-absent-"));
  try {
    const home = join(work, "home");
    mkdirSync(home, { recursive: true });
    const emptyBin = join(work, "bin");
    mkdirSync(emptyBin, { recursive: true });
    const harness = `set -uo pipefail
export HOME="${home}"
DEST="${work}/dest"
export CLAUDE_APP="${join(work, "absent.app")}"
export PATH="${emptyBin}:/usr/bin:/bin"
link_agents_skills() { :; }
. "${MODULE}"
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr.toString()).toContain("claude.com/download");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// The registry is what the setup page reads. Layer A (does the app discover our skills) is measured
// in the bundle; Layer B (does a visual come out of it) has not been seen, and this project does not
// let a product decision stand in for a proof.
test("claude-desktop is registered but NOT verified — no visual has come out of it", async () => {
  const { RUNTIMES: REG } = await import("../../install/configurator-core");
  expect(REG["claude-desktop"]).toBeDefined();
  expect(REG["claude-desktop"]!.label).toBe("Claude Desktop");
  expect(REG["claude-desktop"]!.verified).toBe(false);
});

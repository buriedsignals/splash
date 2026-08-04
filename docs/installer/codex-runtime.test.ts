import { test, expect } from "bun:test";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  lstatSync,
  readlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const runtimesDir = join(import.meta.dir, "../../install/runtimes");
const codexSh = readFileSync(join(runtimesDir, "codex.sh"), "utf8");
const codexPs1 = readFileSync(join(runtimesDir, "codex.ps1"), "utf8");
const bootstrapSh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);

// Extract the REAL shared link_agents_skills helper from bootstrap.sh so the behavioral test
// exercises the actual seam wiring codex.sh depends on, not a re-implementation of it.
function realLinkAgentsSkills(): string {
  const m = bootstrapSh.match(/^link_agents_skills\(\)\s*\{[\s\S]*?^\}/m);
  if (!m)
    throw new Error("link_agents_skills helper not found in bootstrap.sh");
  return m[0];
}

// Run a bash snippet in a fresh subprocess (isolated env/HOME) and return {exitCode, stdout}.
function runBash(script: string): { code: number; out: string; err: string } {
  const p = Bun.spawnSync(["bash", "-c", script]);
  return {
    code: p.exitCode,
    out: new TextDecoder().decode(p.stdout),
    err: new TextDecoder().decode(p.stderr),
  };
}

test("codex.sh is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(codexSh) }).exitCode,
  ).toBe(0);
});

test("runtime_launch_cmd echoes 'codex'", () => {
  const modulePath = join(runtimesDir, "codex.sh");
  const { code, out } = runBash(`. "${modulePath}"; runtime_launch_cmd`);
  expect(code).toBe(0);
  expect(out.trim()).toBe("codex");
});

test("runtime_install symlinks every skill into ~/.agents/skills and seeds ~/.codex/config.toml", () => {
  const tmp = mkdtempSync(join(tmpdir(), "codex-rt-"));
  try {
    const fakeHome = join(tmp, "home");
    const dest = join(tmp, "dest");
    const fakeBin = join(tmp, "bin");
    const modulePath = join(runtimesDir, "codex.sh");
    // Hermetic harness: fake $HOME + $DEST with two fake skills; a stub `codex` on PATH so
    // runtime_install SKIPS the real CLI install (no npm/curl/network) and we test only the
    // wiring — symlink discovery + config seed — like the seam's own behavioral checks.
    // Each fake skill carries a SKILL.md, because that file is what makes a directory a skill:
    // the helper links only those, and a host only discovers those.
    const script = `set -euo pipefail
export HOME="${fakeHome}"
DEST="${dest}"
mkdir -p "$DEST/.dist/skills/a" "$DEST/.dist/skills/b" "${fakeBin}"
printf '# a\\n' > "$DEST/.dist/skills/a/SKILL.md"
printf '# b\\n' > "$DEST/.dist/skills/b/SKILL.md"
printf '#!/bin/sh\\n' > "${fakeBin}/codex"
chmod +x "${fakeBin}/codex"
export PATH="${fakeBin}:$PATH"
${realLinkAgentsSkills()}
. "${modulePath}"
runtime_install`;
    const { code, err } = runBash(script);
    expect(err).toBe("");
    expect(code).toBe(0);

    for (const name of ["a", "b"]) {
      const link = join(fakeHome, ".agents/skills", name);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(readlinkSync(link)).toContain(`skills/${name}`);
    }

    const config = readFileSync(join(fakeHome, ".codex/config.toml"), "utf8");
    expect(config).toContain('sandbox_mode = "workspace-write"');
    expect(config).toContain("[sandbox_workspace_write]");
    expect(config).toContain("network_access = true");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("config seed is non-clobbering: an existing config.toml is left untouched", () => {
  const tmp = mkdtempSync(join(tmpdir(), "codex-rt-"));
  try {
    const fakeHome = join(tmp, "home");
    const dest = join(tmp, "dest");
    const fakeBin = join(tmp, "bin");
    const modulePath = join(runtimesDir, "codex.sh");
    const sentinel = "# USER OWNS THIS FILE\\n# keep-me-verbatim\\n";
    const script = `set -euo pipefail
export HOME="${fakeHome}"
DEST="${dest}"
mkdir -p "$DEST/.dist/skills/a" "${fakeBin}" "$HOME/.codex"
printf '${sentinel}' > "$HOME/.codex/config.toml"
printf '#!/bin/sh\\n' > "${fakeBin}/codex"
chmod +x "${fakeBin}/codex"
export PATH="${fakeBin}:$PATH"
${realLinkAgentsSkills()}
. "${modulePath}"
runtime_install`;
    const { code } = runBash(script);
    expect(code).toBe(0);
    // The user's file survives verbatim — we never overwrite it.
    const config = readFileSync(join(fakeHome, ".codex/config.toml"), "utf8");
    expect(config).toContain("# USER OWNS THIS FILE");
    expect(config).toContain("# keep-me-verbatim");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("an unwritable ~/.codex is reported with the chown fix, not a cryptic os error 13", () => {
  const tmp = mkdtempSync(join(tmpdir(), "codex-rt-"));
  try {
    const fakeHome = join(tmp, "home");
    const dest = join(tmp, "dest");
    const fakeBin = join(tmp, "bin");
    const modulePath = join(runtimesDir, "codex.sh");
    // Reproduce the real failure: ~/.codex exists but the user cannot write it (a root-owned dir
    // left by an earlier sudo run). runtime_install must surface the cause + the one-line fix,
    // not let Codex fail later with "app-server client: Permission denied (os error 13)".
    const script = `set +e
export HOME="${fakeHome}"
DEST="${dest}"
mkdir -p "$DEST/.dist/skills/a" "${fakeBin}" "$HOME/.codex"
chmod 500 "$HOME/.codex"
printf '#!/bin/sh\\n' > "${fakeBin}/codex"
chmod +x "${fakeBin}/codex"
export PATH="${fakeBin}:$PATH"
${realLinkAgentsSkills()}
. "${modulePath}"
runtime_install
echo "EXIT=$?"
test -f "$HOME/.codex/config.toml" && echo CONFIG_EXISTS || echo NO_CONFIG`;
    const { out, err } = runBash(script);
    expect(err).toContain("not writable");
    expect(err).toContain("chown -R");
    expect(out).toContain("EXIT=0"); // warns and continues — never crashes on os error 13
    expect(out).toContain("NO_CONFIG"); // no write attempted into the unwritable dir
  } finally {
    Bun.spawnSync(["chmod", "700", join(tmp, "home/.codex")]);
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("codex.sh installs the pinned @openai/codex CLI and wires ~/.agents/skills discovery", () => {
  expect(codexSh).toContain("@openai/codex@");
  expect(codexSh).toMatch(/CODEX_VERSION="\d+\.\d+\.\d+"/); // pinned, not @latest
  expect(codexSh).toContain("link_agents_skills"); // shared discovery helper
  expect(codexSh).not.toContain("brew");
});

test("codex.sh seeds network_access under workspace-write, non-clobbering", () => {
  expect(codexSh).toContain('sandbox_mode = "workspace-write"');
  expect(codexSh).toContain("network_access = true");
  expect(codexSh).toContain("approval_policy");
  expect(codexSh).toContain("config.toml");
  expect(codexSh).toMatch(/\[ ! -f "\$config" \]/); // writes only when absent
});

test("codex.ps1 mirrors the module contract (Runtime-Install / Runtime-LaunchCmd / discovery / config)", () => {
  expect(codexPs1).toContain("function Runtime-Install");
  expect(codexPs1).toContain("function Runtime-LaunchCmd");
  expect(codexPs1).toContain("Link-AgentsSkills"); // shared junction helper
  expect(codexPs1).toContain("@openai/codex@");
  expect(codexPs1).toContain("network_access = true");
  expect(codexPs1).toContain('"codex"'); // launch command
});

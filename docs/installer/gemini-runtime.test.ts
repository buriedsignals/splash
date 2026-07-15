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

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const geminiSh = readFileSync(join(RUNTIMES, "gemini.sh"), "utf8");
const geminiPs1 = readFileSync(join(RUNTIMES, "gemini.ps1"), "utf8");
const extensionRaw = readFileSync(
  join(import.meta.dir, "../../gemini-extension.json"),
  "utf8",
);

// (a) — the module must be syntactically valid bash (it is SOURCED by bootstrap.sh).
test("gemini runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(geminiSh) }).exitCode,
  ).toBe(0);
});

// (b) — sourcing the module and calling runtime_launch_cmd echoes exactly `gemini`
// (the plain interactive launch the double-click launcher runs after sourcing .env).
test("runtime_launch_cmd echoes exactly `gemini`", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `. "${join(RUNTIMES, "gemini.sh")}"; runtime_launch_cmd`,
  ]);
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toBe("gemini");
});

test("module defines the two contract functions and wires ~/.agents/skills discovery", () => {
  expect(geminiSh).toContain("runtime_install()");
  expect(geminiSh).toContain("runtime_launch_cmd()");
  // Gemini CLI discovers native Agent Skills from ~/.agents/skills — the shared helper
  // (defined by bootstrap.sh) is the PRIMARY surfacing route, so the module must call it.
  expect(geminiSh).toContain("link_agents_skills");
});

test("installs the Gemini CLI Bun-first (never npm) and pins @google/gemini-cli", () => {
  // The installer guarantees Bun; honour the Bun-always / never-npm toolchain rule.
  expect(geminiSh).toContain("bun add -g");
  expect(geminiSh).toContain("@google/gemini-cli");
  expect(geminiSh).not.toContain("npm install");
  expect(geminiSh).not.toContain("brew");
  // guards a failed install with actionable guidance rather than a silent dead-stop
  expect(geminiSh).toContain("could not be installed");
});

// (c) — hermetic behavioural test: with the CLI install MOCKED, runtime_install must
// populate a fake ~/.agents/skills from a fake $DEST/skills/*. No network, fake HOME.
test("runtime_install symlinks every skill into ~/.agents/skills (CLI install mocked)", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-gemini-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    const fakeBin = join(work, "bin");
    const skills = ["alpha", "beta", "gamma"];
    mkdirSync(home, { recursive: true });
    mkdirSync(fakeBin, { recursive: true });
    for (const s of skills) {
      const d = join(dest, "skills", s);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "SKILL.md"), `---\nname: ${s}\n---\n`);
    }

    // Fake `bun`: mocks `bun add -g @google/gemini-cli@…` by dropping an executable
    // `gemini` into $HOME/.bun/bin (where the module then looks). Logs its args so the
    // test can assert the install path was actually exercised.
    const bunLog = join(work, "bun.log");
    const fakeBun = join(fakeBin, "bun");
    writeFileSync(
      fakeBun,
      `#!/bin/sh
echo "$@" >> "${bunLog}"
mkdir -p "$HOME/.bun/bin"
cat > "$HOME/.bun/bin/gemini" <<'G'
#!/bin/sh
exit 0
G
chmod +x "$HOME/.bun/bin/gemini"
exit 0
`,
    );
    chmodSync(fakeBun, 0o755);

    // Harness: provides the shared helper exactly as bootstrap.sh defines it, sources the
    // module, and runs runtime_install with a fake HOME/DEST and the fake bun first on PATH.
    // Hermetic PATH: only the fake bin + coreutils, so a real `gemini`/`bun` already on the
    // dev machine's ~/.bun/bin can't be found — otherwise `command -v gemini` short-circuits
    // the install and the mocked `bun` (which writes bun.log) never runs. unset BUN_INSTALL so
    // the module's ${BUN_INSTALL:-$HOME/.bun}/bin resolves to the FAKE home, not the real one.
    const harness = `set -euo pipefail
export HOME="${home}"
DEST="${dest}"
unset BUN_INSTALL
export PATH="${fakeBin}:/usr/bin:/bin"
link_agents_skills() {
  mkdir -p "$HOME/.agents/skills"
  for skill_dir in "$DEST"/skills/*/; do
    ln -sfn "$skill_dir" "$HOME/.agents/skills/$(basename "$skill_dir")"
  done
}
. "${join(RUNTIMES, "gemini.sh")}"
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString() + r.stdout.toString()).toBeString();
    expect(r.exitCode).toBe(0);

    // the mocked install actually ran (module did not silently skip installing)
    expect(readFileSync(bunLog, "utf8")).toContain("@google/gemini-cli");

    // every skill dir is now a symlink under the fake ~/.agents/skills pointing at the source
    for (const s of skills) {
      const link = join(home, ".agents", "skills", s);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(realpathSync(link)).toBe(realpathSync(join(dest, "skills", s)));
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// (d) — the distribution-parity extension manifest is valid JSON with the required fields.
test("gemini-extension.json is valid JSON with the required manifest fields", () => {
  const m = JSON.parse(extensionRaw);
  // Required by the Gemini extension manifest schema: name + version.
  expect(typeof m.name).toBe("string");
  expect(m.name.length).toBeGreaterThan(0);
  // name must be lowercase / digits / dashes (no underscores or spaces)
  expect(m.name).toMatch(/^[a-z0-9-]+$/);
  expect(typeof m.version).toBe("string");
  expect(m.version).toMatch(/^\d+\.\d+\.\d+/);
  // description is optional in the schema but we ship one for the extensions gallery
  expect(typeof m.description).toBe("string");
  expect(m.description.length).toBeGreaterThan(0);
  // We deliberately DON'T set contextFileName: this adapter uses native Agent Skills, not the
  // legacy GEMINI.md @-include context bridge — pointing at a non-existent GEMINI.md would be a
  // dangling include (the exact bug in the old viznews adapter).
  expect(m.contextFileName).toBeUndefined();
});

// Windows mirror — string-level parity checks (no pwsh available in CI), matching the shape of
// the existing bootstrap-ps1 tests.
test("gemini.ps1 mirrors the module contract for Windows", () => {
  expect(geminiPs1).toContain("function Runtime-Install");
  expect(geminiPs1).toContain("function Runtime-LaunchCmd");
  expect(geminiPs1).toContain("Link-AgentsSkills");
  expect(geminiPs1).toContain("bun add -g");
  expect(geminiPs1).toContain("@google/gemini-cli");
  expect(geminiPs1).not.toContain("npm install");
  // launches plain interactive gemini
  expect(geminiPs1).toMatch(/Runtime-LaunchCmd\s*\{\s*"gemini"\s*\}/);
  // guards a failed install
  expect(geminiPs1).toContain("could not be installed");
});

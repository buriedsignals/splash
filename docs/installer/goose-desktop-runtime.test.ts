import { test, expect } from "bun:test";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  chmodSync,
  rmSync,
  lstatSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const MODULE = join(RUNTIMES, "goose-desktop.sh");
const sh = readFileSync(MODULE, "utf8");

test("goose-desktop runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode,
  ).toBe(0);
});

test("runtime_launch_cmd opens the app, never a terminal session", () => {
  const out = Bun.spawnSync([
    "bash",
    "-c",
    `. "${MODULE}"; runtime_launch_cmd`,
  ]);
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toBe("open -a Goose");
});

test("module defines the two contract functions and wires skill discovery", () => {
  expect(sh).toContain("runtime_install()");
  expect(sh).toContain("runtime_launch_cmd()");
  expect(sh).toContain("link_agents_skills");
});

test("an already-installed app is detected, never reinstalled over", () => {
  // A journalist who already uses Goose must not have their install replaced.
  expect(sh).toContain("/Applications/Goose.app");
  expect(sh).toMatch(/if \[ ! -d "\$GOOSE_APP" \]/);
});

test("a failed install exits with actionable guidance, not silently", () => {
  expect(sh).toContain("could not be installed");
  expect(sh).toContain("block.github.io/goose");
});

test("the module never touches the LLM provider — Goose is model-agnostic and owns that screen", () => {
  expect(sh).not.toMatch(/GOOSE_PROVIDER|GOOSE_MODEL|ANTHROPIC_API_KEY/);
});

// F4 (findings §"Le canal d'installation"): the cask is `block-goose` — plain `goose` does not
// exist — and the direct channel is a .zip from the release, whose owner is now `aaif-goose`.
// A URL on the old `block/goose` path works today only by redirect.
test("both install channels are the measured ones: the block-goose cask and the release .zip", () => {
  expect(sh).toContain("block-goose");
  expect(sh).toContain("aaif-goose/goose");
  expect(sh).toContain("Goose.zip");
  // There is no .dmg to mount for the desktop app.
  expect(sh).not.toContain("hdiutil");
  // Apple Silicon and Intel are different assets; shipping one to both is a silent wrong install.
  expect(sh).toContain("Goose_intel_mac.zip");
});

// F1 (findings §"Le contexte"): a quarantined app double-clicked from Downloads runs from a
// temporary read-only AppTranslocation mount. `[ -d /Applications/Goose.app ]` is then FALSE while
// Goose is running — the module must say so, not reinstall over a live app.
test("a translocated app is recognised as installed-but-misplaced, not as absent", () => {
  expect(sh).toContain("AppTranslocation");
  expect(sh).toContain("Applications");
});

// Hermetic: an existing bundle (stubbed through GOOSE_APP) skips every install channel and the
// module wires discovery. Passes on a machine with AND without a real Goose install.
test("runtime_install wires every skill when the app is already present", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-goosedesk-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    const app = join(work, "Goose.app");
    const skills = ["alpha", "beta", "gamma"];
    mkdirSync(home, { recursive: true });
    mkdirSync(app, { recursive: true });
    for (const s of skills) {
      const d = join(dest, "skills", s);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, "SKILL.md"), `---\nname: ${s}\n---\n`);
    }
    // The shared helper comes from bootstrap.sh in production; stub it the way goose-runtime.test.ts
    // does. ensure_bun_on_login_path is redefined AFTER the source so no login shell is spawned here
    // — its own behaviour has its own two tests below.
    const harness = `set -euo pipefail
export HOME="${home}"
DEST="${dest}"
export GOOSE_APP="${app}"
export PATH="/usr/bin:/bin"
link_agents_skills() {
  mkdir -p "$HOME/.agents/skills"
  for skill_dir in "$DEST"/skills/*/; do
    ln -sfn "$skill_dir" "$HOME/.agents/skills/$(basename "$skill_dir")"
  done
}
. "${MODULE}"
ensure_bun_on_login_path() { :; }
runtime_install
`;
    const r = Bun.spawnSync(["bash", "-c", harness]);
    expect(r.stderr.toString()).toBe("");
    expect(r.exitCode).toBe(0);
    for (const s of skills) {
      const link = join(home, ".agents", "skills", s);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(realpathSync(link)).toBe(realpathSync(join(dest, "skills", s)));
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

/** A fake login shell named `zsh` (the basename decides which profile is repaired) that reports
 *  whether `bun` resolves, exactly the way goose's own probe would. */
function fakeLoginShell(dir: string, bunResolves: boolean): string {
  mkdirSync(dir, { recursive: true });
  const shell = join(dir, "zsh");
  writeFileSync(shell, `#!/bin/sh\nexit ${bunResolves ? 0 : 1}\n`);
  chmodSync(shell, 0o755);
  return shell;
}

// F3 (findings §Q3.4): Goose Desktop recovers the real PATH by spawning a login+interactive shell,
// so a producer finds `bun` only if the journalist's own profile exports it. When it does not, the
// failure is SILENT at produce time. Repair it at install time instead of assuming.
test("a login shell that cannot resolve bun gets the export written to its profile", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-bunpath-"));
  try {
    const home = join(work, "home");
    const bunBin = join(home, ".bun", "bin");
    mkdirSync(bunBin, { recursive: true });
    writeFileSync(join(bunBin, "bun"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(bunBin, "bun"), 0o755);
    writeFileSync(join(home, ".zshrc"), "# existing profile\n");
    const shell = fakeLoginShell(join(work, "shellbin"), false);

    const r = Bun.spawnSync([
      "bash",
      "-c",
      `set -euo pipefail
export HOME="${home}"
export SHELL="${shell}"
export BUN_INSTALL="${join(home, ".bun")}"
. "${MODULE}"
ensure_bun_on_login_path`,
    ]);
    expect(r.exitCode).toBe(0);

    const profile = readFileSync(join(home, ".zshrc"), "utf8");
    expect(profile).toContain("# existing profile"); // never rewritten, only appended to
    expect(profile).toContain(join(home, ".bun"));
    expect(profile).toContain("PATH");

    // Idempotent: a second install must not stack a duplicate export.
    Bun.spawnSync([
      "bash",
      "-c",
      `set -euo pipefail
export HOME="${home}"
export SHELL="${shell}"
export BUN_INSTALL="${join(home, ".bun")}"
. "${MODULE}"
ensure_bun_on_login_path`,
    ]);
    const twice = readFileSync(join(home, ".zshrc"), "utf8");
    expect(twice.split("BUN_INSTALL").length - 1).toBe(
      profile.split("BUN_INSTALL").length - 1,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("a login shell that already resolves bun is left completely alone", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-bunpath-ok-"));
  try {
    const home = join(work, "home");
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, ".zshrc"), "# existing profile\n");
    const shell = fakeLoginShell(join(work, "shellbin"), true);

    const r = Bun.spawnSync([
      "bash",
      "-c",
      `set -euo pipefail
export HOME="${home}"
export SHELL="${shell}"
. "${MODULE}"
ensure_bun_on_login_path`,
    ]);
    expect(r.exitCode).toBe(0);
    expect(readFileSync(join(home, ".zshrc"), "utf8")).toBe(
      "# existing profile\n",
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

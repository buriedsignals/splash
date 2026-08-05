import { test, expect } from "bun:test";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  lstatSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
// Runs the real helper — extracted from the shipped script, never re-typed — so these tests
// exercise what installs, not a copy that can drift from it.
import { linkHelperScript } from "./link-helper";
import { join } from "node:path";

const sh = readFileSync(
  join(import.meta.dir, "../../install/bootstrap.sh"),
  "utf8",
);

const claudeModule = readFileSync(
  join(import.meta.dir, "../../install/runtimes/claude.sh"),
  "utf8",
);

test("bootstrap.sh is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode,
  ).toBe(0);
});

test("claude runtime module is valid bash", () => {
  expect(
    Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(claudeModule) })
      .exitCode,
  ).toBe(0);
});

test("installs Bun via its own installer, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
});

test("dispatches runtime install + launch to a per-runtime module, never a hardcoded runtime", () => {
  // The runtime-specific install command and launch line live in install/runtimes/<name>.sh,
  // sourced by name — so adding a runtime is a new module file, not an edit to bootstrap.sh.
  expect(sh).toContain('. "$runtime_module"');
  expect(sh).toContain("runtime_install");
  expect(sh).toContain("$(runtime_launch_cmd)");
  // no hardcoded runtime binary/installer leaked back into the shared script
  expect(sh).not.toContain("claude.ai/install.sh");
  expect(sh).not.toContain("claude --plugin-dir");
});

test("claude module installs Claude via its own installer and launches with --plugin-dir", () => {
  expect(claudeModule).toContain("https://claude.ai/install.sh");
  expect(claudeModule).toContain("claude --plugin-dir .");
  expect(claudeModule).not.toContain("brew");
});

test("shares an ~/.agents/skills symlink helper that globs every skill (Codex/Gemini discovery)", () => {
  expect(sh).toContain("link_agents_skills");
  expect(sh).toContain(".agents/skills");
  expect(sh).toMatch(/for skill_dir in "\$DEST"\/\.dist\/skills\/\*\//); // globs the PACKAGED tree
});

test("runs the local configurator and does NOT write .env from caller env vars", () => {
  expect(sh).toContain("install/configurator.ts");
  expect(sh).not.toContain("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY"); // no baked-key .env write
  expect(sh).toContain("Configuration was not completed"); // aborts if the configurator was closed
  // the configurator call must be guarded by the `if`, not a bare statement — otherwise
  // `set -euo pipefail` kills the script AT that line on a non-zero exit, and the
  // "re-run this installer" abort message below never runs (dead code under errexit).
  expect(sh).toMatch(
    /if ! \(\s*cd "\$DEST" && bun install\/configurator\.ts\s*\)/,
  );
});

test("acquires the repo by zip, installs the render engine, and makes a local launcher", () => {
  expect(sh).toContain("/archive/");
  expect(sh).toContain("playwright install chromium");
  expect(sh).toContain("Launch Splash.command");
});

test("keeps stderr on dependency install and guards each step (no silent dead-stop)", () => {
  // The old `bun install >/dev/null 2>&1` swallowed the cause of a failed dep install under
  // `set -e`, leaving a half-finished install with no launcher and no diagnostic.
  expect(sh).not.toContain("bun install >/dev/null 2>&1");
  expect(sh).toContain("Dependency install failed");
  expect(sh).toContain("Playwright Chromium download failed");
});

test("skips the configurator on a re-run that already has a verified .env", () => {
  expect(sh).toMatch(
    /if \[ ! -f "\$DEST\/\.env" \] \|\| \[ "\$\{SPLASH_RECONFIGURE:-0\}" = "1" \]; then/,
  );
});

test("link_agents_skills links only directories that carry a SKILL.md", () => {
  // A host reads ~/.agents/skills/ and silently ignores any directory without a SKILL.md, so a
  // library directory linked there inflates the link count while the host discovers one fewer
  // skill — measured on Goose Desktop: 12 linked, 11 discovered, with nothing said. Linking only
  // what a host can read makes the two counts agree, so a real gap shows up instead of hiding.
  const work = mkdtempSync(join(tmpdir(), "splash-skillmd-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    mkdirSync(join(home, ".agents", "skills"), { recursive: true });
    mkdirSync(join(dest, ".dist", "skills", "alpha"), { recursive: true });
    mkdirSync(join(dest, ".dist", "skills", "library"), { recursive: true });
    writeFileSync(
      join(dest, ".dist", "skills", "alpha", "SKILL.md"),
      "# alpha\n",
    );
    // `library` deliberately has no SKILL.md — a production library, not a skill.
    writeFileSync(
      join(dest, ".dist", "skills", "library", "index.ts"),
      "export {};\n",
    );

    const out = Bun.spawnSync(["bash", "-c", linkHelperScript(home, dest)]);
    expect(out.exitCode).toBe(0);

    expect(realpathSync(join(home, ".agents", "skills", "alpha"))).toBe(
      realpathSync(join(dest, ".dist", "skills", "alpha")),
    );
    // lstat, not existsSync: a link to a real directory would be reported either way, but this
    // asserts no entry of ANY kind was created for the library.
    expect(() =>
      lstatSync(join(home, ".agents", "skills", "library")),
    ).toThrow();
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("link_agents_skills fills the target it is given, and applies the same rules there", () => {
  // Not every host reads the same door: Claude Desktop scans ~/.claude/skills and never looks at
  // ~/.agents/skills. One helper with a target keeps the two rules — sweep dead links, link only
  // what carries a SKILL.md — from drifting apart between doors.
  const work = mkdtempSync(join(tmpdir(), "splash-target-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    const target = join(home, ".claude", "skills");
    mkdirSync(join(dest, ".dist", "skills", "alpha"), { recursive: true });
    mkdirSync(join(dest, ".dist", "skills", "library"), { recursive: true });
    writeFileSync(
      join(dest, ".dist", "skills", "alpha", "SKILL.md"),
      "# alpha\n",
    );
    writeFileSync(
      join(dest, ".dist", "skills", "library", "index.ts"),
      "export {};\n",
    );

    const out = Bun.spawnSync([
      "bash",
      "-c",
      linkHelperScript(home, dest, target),
    ]);
    expect(out.exitCode).toBe(0);

    expect(realpathSync(join(target, "alpha"))).toBe(
      realpathSync(join(dest, ".dist", "skills", "alpha")),
    );
    expect(() => lstatSync(join(target, "library"))).toThrow();
    // The default door must stay untouched when a target is given — otherwise a desktop install
    // would quietly also wire a runtime the journalist did not choose.
    expect(() => lstatSync(join(home, ".agents", "skills", "alpha"))).toThrow();
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("link_agents_skills removes a dead symlink before linking (a rename must not leave a host blind)", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-deadlink-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    mkdirSync(join(home, ".agents", "skills"), { recursive: true });
    mkdirSync(join(dest, ".dist", "skills", "alpha"), { recursive: true });
    writeFileSync(
      join(dest, ".dist", "skills", "alpha", "SKILL.md"),
      "# alpha\n",
    );

    // A link left by a previous install whose source tree was renamed away.
    symlinkSync(
      join(work, "gone", "skills", "stale"),
      join(home, ".agents", "skills", "stale"),
    );

    const out = Bun.spawnSync(["bash", "-c", linkHelperScript(home, dest)]);
    expect(out.exitCode).toBe(0);

    // The dead link is gone — check with lstat, because existsSync FOLLOWS a symlink and would
    // report false for a dead link that is still sitting there. That distinction is the whole test.
    expect(() => lstatSync(join(home, ".agents", "skills", "stale"))).toThrow();
    // …and the real skill is linked.
    expect(realpathSync(join(home, ".agents", "skills", "alpha"))).toBe(
      realpathSync(join(dest, ".dist", "skills", "alpha")),
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// The page measures the tree; the tree must therefore exist. Packaging and installing after the
// page is what made it report four healthy engines as missing on every real install. The browser
// download is part of that same tree — chart-native/map-native's readiness probe is a filesystem
// stat for the extracted Playwright browser — so it must land before the page too, not just
// pack-skills; a script that moved only the packaging call back after the page would still fail
// this test via the chromium leg.
test("packages and installs BEFORE opening the setup page", () => {
  const pack = sh.indexOf("bun run pack-skills");
  const chromium = sh.indexOf("playwright install chromium");
  const page = sh.indexOf("bun install/configurator.ts");
  const runtime = sh.indexOf("bun install/read-runtime.ts");
  expect(pack).toBeGreaterThan(0);
  expect(chromium).toBeGreaterThan(pack);
  expect(page).toBeGreaterThan(chromium);
  // The runtime module is chosen BY the page, so it still comes after it.
  expect(runtime).toBeGreaterThan(page);
});

test("the installer links the DELIVERED tree, not the engine checkout", () => {
  // Pointing the helper at $DEST/skills would ship a host the whole engine — the failure this
  // whole chantier exists to close. Asserted on the EXECUTABLE lines: `toContain(".dist/skills")`
  // and `toContain("pack-skills")` were both satisfied by this file's own comments, which mention
  // the packaged tree several times, so they would have held with the glob pointed anywhere.
  const code = sh
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("#"))
    .join("\n");
  expect(code).toMatch(/for skill_dir in "\$DEST"\/\.dist\/skills\/\*\/; do/);
  expect(code).toMatch(/bun run pack-skills/);
  // …and the dependency install + the Playwright download address the delivery, not the checkout.
  expect(code).toMatch(/cd "\$DEST\/\.dist" && bun install/);
  expect(code).toMatch(/cd "\$DEST\/\.dist\/skills\/chart-native"/);
  // The merged install replaces the per-engine one: a journalist must not install twice.
  expect(sh).not.toMatch(/for skill in "\$\{NATIVE_SKILLS\[@\]\}"/);
});

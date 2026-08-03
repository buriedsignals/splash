# Goose Desktop runtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A journalist installs Splash by double-clicking once, then launches it from the Dock as a desktop app and never sees a terminal again.

**Architecture:** A new runtime module `install/runtimes/goose-desktop.sh` sits beside the existing four, honouring the same two-function contract (`runtime_install`, `runtime_launch_cmd`). It detects or installs the Goose desktop application, repairs and wires skill discovery, and launches the app instead of a terminal session. One shared-helper fix (dead-symlink sweep) lands in `bootstrap.sh` because the defect it closes affects Codex and Gemini identically.

**Tech Stack:** Bash (macOS), Bun + `bun:test` for the hermetic tests, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-03-goose-desktop-runtime-design.md`

## Global Constraints

- Runtime is **Bun**, never npm, never node. Tests: `cd docs/installer && bun test <file>` or from repo root per existing convention.
- Code, comments, identifiers, commit messages, branch names: **English**. Non-negotiable.
- **No mention of any AI tool** in commits, code, docs or output.
- No `any`; `strict: true` in TypeScript.
- **Never stage anything under `output-proof/`** and never stage a rendered artefact. `git status --short` before every commit.
- **Commit before any long verification.** Every real loss on this project has been an uncommitted tree.
- Tests must be **hermetic**: no network, no real Goose install, and they must pass on a machine that already has Goose installed AND on one that does not.
- `verified: true` in `RUNTIMES` requires a passing **Layer B** proof. A product decision is not a proof.
- The installer's runtime modules are dispatched from `~/Splash/.splash-runtime`; adding a runtime is a new file in `install/runtimes/`, never a change to `bootstrap.sh` — **Task 2 is the one deliberate exception**, and it changes a shared helper, not the dispatch.

---

### Task 1: The verification gate — answer three questions before writing any code

**This task writes no product code.** It exists because the spec is invalidated if any answer is "no", and finding that out after implementation wastes the whole lot.

**Files:**
- Create: `docs/installer/goose-desktop-findings.md`

- [ ] **Step 1: Install the Goose desktop application**

Do **not** guess the channel. Check, in this order, and record which one worked verbatim:

```bash
# a) Homebrew cask (cleanest in a script, but requires Homebrew)
brew info --cask goose 2>/dev/null | head -5

# b) Official download page — record the exact .dmg URL if a cask does not exist
# https://block.github.io/goose/docs/getting-started/installation
```

Record: which channel exists, the exact command or URL, and whether Homebrew is a reasonable prerequisite for a journalist (it is not, if a `.dmg` path exists).

- [ ] **Step 2: Answer question 1 — where does the desktop app read skills?**

With the app installed and **no** skills wired, create a marker skill in each candidate directory:

```bash
for d in "$HOME/.agents/skills" "$HOME/.config/goose/skills"; do
  mkdir -p "$d/splash-probe"
  printf -- '---\nname: splash-probe\ndescription: A probe skill used once to establish where this host discovers skills. Safe to delete.\n---\n\n# Probe\n\nIf you can read this, the host discovered a skill in %s.\n' "$d" > "$d/splash-probe/SKILL.md"
done
```

Open the app, ask it to list its skills, and record **which directory (or both) surfaced `splash-probe`**. Then delete both probe directories.

- [ ] **Step 3: Answer question 2 — is a symlinked skill followed?**

Symlinking is the project's distribution mechanism (`link_agents_skills`). Replace the winning directory's probe with a **symlink** to a skill directory elsewhere on disk, reopen the app, and record whether it still surfaces. If it does not, the module must **copy** instead of link — record that as the finding.

- [ ] **Step 4: Answer question 3 — does the app execute a skill's scripts?**

Point the app at the real `splash` skill (symlink or copy per Step 3) and ask it to run any producer step that shells out. Record whether the app executes, refuses, or prompts. This is the make-or-break: a host that reads prose but cannot execute produces nothing.

- [ ] **Step 5: Write the findings file and STOP if any answer is negative**

`docs/installer/goose-desktop-findings.md` records, per question: what was run, what was observed verbatim, and the consequence for the module. If Step 2 finds no writable directory, or Step 4 shows no execution, **write that plainly, commit, and report BLOCKED** — the remaining tasks do not apply and forcing them would ship a module that cannot work.

- [ ] **Step 6: Commit**

```bash
git add docs/installer/goose-desktop-findings.md
git commit -m "docs(installer): what Goose Desktop actually discovers and executes"
```

---

### Task 2: The shared helper repairs dead skill links

**Why here and not in the new module:** a symlink whose target no longer exists is indistinguishable from an absent skill to the host — it simply finds nothing, with no error. The atelier→splash rename left nine such links on a real machine, so **Codex and Gemini are broken there too**. Fixing this only in the new module would leave three hosts broken.

**Files:**
- Modify: `install/bootstrap.sh` (the `link_agents_skills` helper, currently lines 15-21)
- Modify: `install/bootstrap.ps1` (the `Link-AgentsSkills` mirror)
- Test: `docs/installer/bootstrap-sh.test.ts`

**Interfaces:**
- Produces: `link_agents_skills` — unchanged signature, no arguments, reads `$DEST` and `$HOME` from scope. Every runtime module calls it exactly as before.

- [ ] **Step 1: Write the failing test**

Add to `docs/installer/bootstrap-sh.test.ts`:

```ts
test("link_agents_skills removes a dead symlink before linking (a rename must not leave a host blind)", () => {
  const work = mkdtempSync(join(tmpdir(), "splash-deadlink-"));
  try {
    const home = join(work, "home");
    const dest = join(work, "dest");
    mkdirSync(join(home, ".agents", "skills"), { recursive: true });
    mkdirSync(join(dest, "skills", "alpha"), { recursive: true });

    // A link left by a previous install whose source tree was renamed away.
    symlinkSync(join(work, "gone", "skills", "stale"), join(home, ".agents", "skills", "stale"));

    const script = `
      set -euo pipefail
      HOME="${home}"; DEST="${dest}"
      ${readFileSync(join(import.meta.dir, "../../install/bootstrap.sh"), "utf8")
        .split("link_agents_skills() {")[1]
        .split("\n}")[0]
        .replace(/^/, "link_agents_skills() {") + "\n}"}
      link_agents_skills
    `;
    const out = Bun.spawnSync(["bash", "-c", script]);
    expect(out.exitCode).toBe(0);

    // The dead link is gone — check with lstat, because existsSync FOLLOWS a symlink and would
    // report false for a dead link that is still sitting there. That distinction is the whole test.
    expect(() => lstatSync(join(home, ".agents", "skills", "stale"))).toThrow();
    // …and the real skill is linked.
    expect(realpathSync(join(home, ".agents", "skills", "alpha"))).toBe(realpathSync(join(dest, "skills", "alpha")));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
```

Add `symlinkSync` and `existsSync` to the file's `node:fs` import list if absent.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: FAIL — the dead `stale` link still exists after the helper runs.

- [ ] **Step 3: Implement the sweep**

Replace `link_agents_skills` in `install/bootstrap.sh`:

```bash
link_agents_skills() {
  mkdir -p "$HOME/.agents/skills"
  # A renamed or moved source tree leaves links that EXIST but resolve to nothing — and to a host
  # a dead link is indistinguishable from an absent skill: it simply finds nothing, silently.
  # Sweep them first so an install that predates a rename repairs itself on re-run.
  for link in "$HOME"/.agents/skills/*; do
    if [ -L "$link" ] && [ ! -e "$link" ]; then rm -f "$link"; fi
  done
  for skill_dir in "$DEST"/skills/*/; do
    ln -sfn "$skill_dir" "$HOME/.agents/skills/$(basename "$skill_dir")"
  done
}
```

(`[ -L ]` is true only for a symlink, so the unmatched-glob literal `*` is skipped; `[ ! -e ]` is true only when the target does not resolve.)

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: PASS, and every pre-existing test in that file still passes.

- [ ] **Step 5: Mutation-verify**

Remove the sweep loop, re-run: the new test must redden. Restore, confirm green. Record both outputs in the commit body — a lever that does not redden is not a lever.

- [ ] **Step 6: Mirror it on Windows**

Apply the same sweep to `Link-AgentsSkills` in `install/bootstrap.ps1` (junctions, not symlinks — use the PowerShell idiom already in that file), and extend `docs/installer/bootstrap-ps1.test.ts`'s parity assertions to cover it.

- [ ] **Step 7: Commit**

```bash
git add install/bootstrap.sh install/bootstrap.ps1 docs/installer/bootstrap-sh.test.ts docs/installer/bootstrap-ps1.test.ts
git commit -m "fix(installer): a dead skill link is swept before wiring, so a rename cannot blind a host"
```

---

### Task 3: The `goose-desktop` runtime module

**Files:**
- Create: `install/runtimes/goose-desktop.sh`
- Test: `docs/installer/goose-desktop-runtime.test.ts`

**Interfaces:**
- Consumes: `link_agents_skills` (Task 2), `$DEST` from `bootstrap.sh` scope.
- Produces: `runtime_install` (no args, exits non-zero with guidance on failure) and `runtime_launch_cmd` (echoes the launcher command string) — the contract in `install/runtimes/README.md`.

- [ ] **Step 1: Write the failing tests**

Create `docs/installer/goose-desktop-runtime.test.ts`, modelled on `goose-runtime.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RUNTIMES = join(import.meta.dir, "../../install/runtimes");
const sh = readFileSync(join(RUNTIMES, "goose-desktop.sh"), "utf8");

test("goose-desktop runtime module is valid bash", () => {
  expect(Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode).toBe(0);
});

test("runtime_launch_cmd opens the app, never a terminal session", () => {
  const out = Bun.spawnSync(["bash", "-c", `. "${join(RUNTIMES, "goose-desktop.sh")}"; runtime_launch_cmd`]);
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
```

- [ ] **Step 2: Run them and watch them fail**

Run: `cd docs/installer && bun test goose-desktop-runtime.test.ts`
Expected: FAIL — the module file does not exist.

- [ ] **Step 3: Write the module**

Create `install/runtimes/goose-desktop.sh`. **Fill the install channel from Task 1's findings file — do not invent it.** Use whichever of the two branches Task 1 recorded as existing; delete the other:

```bash
# Goose Desktop runtime module (macOS). Sourced by bootstrap.sh — see ./README.md.
#
# This is the NEWSROOM-facing runtime: the journalist installs once by double-click, then launches
# Splash from the Dock like any application and never sees a terminal again. The CLI module
# (goose.sh) stays for developer use — same agent, different audience.
#
# Goose is model-agnostic and the desktop app owns its own provider screen, so this module bakes
# no provider key. The Splash setup page collects the PRODUCT keys (MapTiler, Datawrapper); the
# journalist picks their model inside Goose.

GOOSE_APP="/Applications/Goose.app"

runtime_install() {
  if [ ! -d "$GOOSE_APP" ]; then
    echo "-> Installing Goose Desktop…"
    # BRANCH A — Homebrew cask (only if Task 1 found one AND Homebrew is present):
    #   brew install --cask goose
    # BRANCH B — official .dmg (the exact URL Task 1 recorded):
    #   tmp="$(mktemp -d)"
    #   curl -fsSL "<URL from findings>" -o "$tmp/goose.dmg"
    #   hdiutil attach -nobrowse -quiet "$tmp/goose.dmg" -mountpoint "$tmp/mnt"
    #   cp -R "$tmp/mnt/Goose.app" /Applications/
    #   hdiutil detach -quiet "$tmp/mnt"; rm -rf "$tmp"
  fi
  if [ ! -d "$GOOSE_APP" ]; then
    echo "Goose Desktop could not be installed. Install it from https://block.github.io/goose, then re-run this installer." >&2
    exit 1
  fi
  # Wire skill discovery. Task 1 records WHICH directory the app reads; if it reads more than one,
  # call the helper and additionally mirror into the second — never guess.
  link_agents_skills
}

runtime_launch_cmd() { echo 'open -a Goose'; }
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `cd docs/installer && bun test goose-desktop-runtime.test.ts`
Expected: PASS, all six.

- [ ] **Step 5: Add the hermetic wiring test**

Mirror `goose-runtime.test.ts`'s "runtime_install symlinks every skill" test: a fake `$HOME` and `$DEST`, a stubbed `/Applications/Goose.app` (a directory is enough — the detection is `[ -d ]`), and assert every fake skill is linked. It must pass on a machine with **and** without a real Goose install.

- [ ] **Step 6: Commit**

```bash
git add install/runtimes/goose-desktop.sh docs/installer/goose-desktop-runtime.test.ts
git commit -m "feat(installer): a goose-desktop runtime so a newsroom launches Splash from the Dock"
```

---

### Task 4: The setup page offers the desktop app as its own choice

**Files:**
- Modify: `install/configurator-core.ts` (the `RUNTIMES` map, lines 13-23)
- Test: `install/configurator-core.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `RUNTIMES["goose-desktop"] = { label: "Goose Desktop", verified: false }` — the key must match the module filename `goose-desktop.sh`, because `bootstrap.sh` dispatches on it.

- [ ] **Step 1: Write the failing test**

Add to `install/configurator-core.test.ts`:

```ts
test("goose-desktop is registered but NOT yet verified — Layer B is unproven", () => {
  expect(RUNTIMES["goose-desktop"]).toBeDefined();
  expect(RUNTIMES["goose-desktop"].label).toBe("Goose Desktop");
  // Flipped to true ONLY by Task 6, and only if the Layer B proof passes.
  expect(RUNTIMES["goose-desktop"].verified).toBe(false);
});

test("every registered runtime key has a module file of the same name", () => {
  for (const key of Object.keys(RUNTIMES)) {
    if (key === "claude") continue; // Claude Code wires via --plugin-dir, no discovery module needed
    expect(existsSync(join(import.meta.dir, "runtimes", `${key}.sh`))).toBe(true);
  }
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `cd install && bun test configurator-core.test.ts`
Expected: FAIL — `RUNTIMES["goose-desktop"]` is undefined.

- [ ] **Step 3: Add the entry**

```ts
  // The newsroom-facing runtime: installed once, launched from the Dock, no terminal after install.
  // NOT verified: Layer A (discovery) and Layer B (nested invocation → a produced file) must BOTH
  // pass first — see docs/installer/goose-desktop-proof.md. A product decision is not a proof.
  "goose-desktop": { label: "Goose Desktop", verified: false },
```

- [ ] **Step 4: Run and watch it pass**

Run: `cd install && bun test configurator-core.test.ts`
Expected: PASS, and the four existing runtime assertions still pass.

- [ ] **Step 5: Commit**

```bash
git add install/configurator-core.ts install/configurator-core.test.ts
git commit -m "feat(installer): the setup page offers Goose Desktop as its own runtime"
```

---

### Task 5: Layer A proof — installation and discovery, without spending a token

**Files:**
- Create: `docs/installer/goose-desktop-proof.md`

- [ ] **Step 1: Run the installer end to end on a clean-ish machine**

From a shell: set `SPLASH_RUNTIME=goose-desktop` (or pick it in the setup page), run `install/bootstrap.sh`, and record verbatim: whether the app was detected or installed, which channel ran, and any prompt the journalist would see.

- [ ] **Step 2: Prove the dead-link repair on a real broken state**

Before running, deliberately create a dead link (`ln -s /nonexistent/skills/foo ~/.agents/skills/foo`). After the install, confirm it is gone and the real skills are linked. This is the defect Task 2 closes; prove it on the real filesystem, not only in the hermetic test.

- [ ] **Step 3: Open the app and list the skills**

Record verbatim which skills appear. Expect the eight that `goose skills list` shows for the CLI. **Note any stray entries** — the CLI recurses into `node_modules` and surfaces two dependency skills; record whether the desktop app does the same, since the audit found it does not affect the other hosts.

- [ ] **Step 4: Write the proof document**

Follow `docs/installer/goose-proof.md`'s structure: verified facts with sources, what ships, the proof result, and **an explicit verdict** separating what was proven from what was not. Layer B is not proven at this point and the document must say so plainly.

- [ ] **Step 5: Commit**

```bash
git add docs/installer/goose-desktop-proof.md
git commit -m "docs(installer): Goose Desktop Layer A proven — install, repair, discovery"
```

---

### Task 6: Layer B proof — a produced file, and only then the flag

**This task decides whether `verified` flips. Do not flip it on Layer A.**

**Files:**
- Modify: `docs/installer/goose-desktop-proof.md`
- Modify: `install/configurator-core.ts` (only if Layer B passes)
- Modify: `install/configurator-core.test.ts` (only if Layer B passes)

- [ ] **Step 1: Run the journalist's path in the desktop app**

Use the fixture the host audit specified as cheapest: a French article + CSV that routes to `dw-chart` static — no Playwright, no MapTiler. Configure the app against the Anthropic plan (Rémy authorised its use for this).

- [ ] **Step 2: Record the six ordered criteria**

From `docs/splash/host-gates-audit-2026-08-02.md` §5.2. The first settles whether nested invocation happens at all (the unknown that has blocked Goose since 2026-07-14); the last confirms or refutes the finding that a Datawrapper chart is published to a live public URL **before** the journalist reviews it.

- [ ] **Step 3: If and only if all criteria pass, flip the flag**

```ts
  "goose-desktop": { label: "Goose Desktop", verified: true },
```

and update the test from Task 4 to assert `true`, with a comment naming the proof date and the fixture. **If any criterion fails, leave `verified: false`, write what failed, and stop** — a runtime a journalist cannot finish a visual on is not verified, whatever else works.

- [ ] **Step 4: Commit**

```bash
git add docs/installer/goose-desktop-proof.md install/configurator-core.ts install/configurator-core.test.ts
git commit -m "docs(installer): Goose Desktop Layer B — what the desktop app actually produced"
```

---

### Task 7: The gate, on a calm machine

- [ ] **Step 1:** Confirm nothing else is running (`pgrep -fl "bun test"` empty). Run `bun run check` from the repo root and paste the actual `<passed>/<total> checks passed.` line.
- [ ] **Step 2:** The known ambient failure is `lib/brain/eligibility.test.ts` ("a mark can never carry an empty reason", `readiness.ts:54`) — it fails in isolation too, in ~120 ms, and predates all of this. `lib/verify/capture-html.test.ts` is a Playwright contention flake that passes 20/20 in ~8 s alone. Anything else is a finding — report it with its output.
- [ ] **Step 3:** `git log main..HEAD --format='%s%n%b' | grep -in "claude\|anthropic\|co-authored"` → expect no match. Confirm nothing under `output-proof/` and no rendered artefact is committed.
- [ ] **Step 4:** A fresh worktree has **no `.env`** (it is untracked). Without it `skills/scrolly` reports 4 fail/3 errors and no render is possible — that is environment, not regression. `ln -s ../splash-merge/.env .env` before believing a failure.

---

## After the plan

A **fresh whole-branch review** before merge, on the most capable model. On this project that step has found a Critical on every plan that ran it, including two that per-task reviews missed entirely.

# Cross-Platform Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Mac + Windows installer for non-technical journalists, offered as BOTH a double-click launcher AND a copy-paste terminal one-liner, with API keys collected upfront — and unblock the native renderers on Windows.

**Architecture:** Split keys (generated, per-user) from install logic (versioned, hosted). Two hosted bootstrap scripts (`install/bootstrap.sh`, `install/bootstrap.ps1`) own all install logic and read keys from env vars. The installer page emits, per OS, a copy-paste one-liner and a thin key-carrying launcher — both converge on the same hosted bootstrap. A small pure guard switches the native producers' Chromium-launching steps from Bun to Node on Windows (Bun+Playwright hangs).

**Tech Stack:** Bun, bun:test, plain ESM JS (installer page), Bash, PowerShell, TypeScript (guard helper).

## Global Constraints

_Every task's requirements implicitly include this section._

- Runtime **Bun**; tests **bun:test**; **TDD** (failing test first). Frequent commits.
- **All code, comments, identifiers, commit messages, branch names in English** — non-negotiable.
- **No Claude/Anthropic attribution** in any published artifact (commits, PRs, docs). No `Co-Authored-By`, no "Generated with".
- **Zero code-signing** — macOS launcher stays unsigned (documented workaround); Windows never signed (signing no longer clears SmartScreen).
- **Keys inline** in the copy-paste one-liner; acquisition by **zip** (never `git`); **no Homebrew**; **Node.js on Windows only** to drive Playwright/Remotion.
- Verbatim install commands: Bun mac `curl -fsSL https://bun.sh/install | bash`; Bun win `irm bun.sh/install.ps1 | iex`; Claude mac `curl -fsSL https://claude.ai/install.sh | bash`; Claude win `irm https://claude.ai/install.ps1 | iex`.
- Only the **`claude`** runtime is `verified`; `codex`/`gemini`/`goose` stay "coming soon".
- The gate `bun run check` (currently 14/14) MUST stay green. **Zero new `any`.**
- Work branch: `feat/cross-platform-installer` (already checked out).
- Bootstraps live at repo-root `install/`, hosted via `raw.githubusercontent.com/<repo>/<ref>/install/…`. `REPO_URL` / `REF` are placeholders until the public repo is confirmed (tracked by `scripts/preflight-release.mjs`); `buriedsignals/atelier` + `main` are the working defaults.
- **★ AMENDMENT (supersedes the bare-`node` runner in Tasks 6–7):** snap steps run via **`tsx`** on Windows, not `node` — the snap scripts import `.ts` with **extensionless** specifiers that node cannot resolve (bun/tsx can), and node ≤22 can't read `.ts` at all. `tsx` runs under the Node runtime (avoids the Bun+Playwright hang) with bun-like resolution. Design: `snapCommand(p) → ["npx","tsx"] | ["bun"]`; `remotionCommand(p) → ["npx","remotion"] | ["bunx","remotion"]`. `tsx` is a pinned devDep in chart-native + map-native (esbuild already present). Validated on Mac: chart-native snap under local tsx → PNG byte-identical to bun; map-native `.ts` chain resolves under tsx. Where Tasks 6/7 below say `snapRunner`/`remotionRunner`/`node`, read `snapCommand`/`remotionCommand`/`tsx` per this amendment.

---

## File Structure

**Create:**
- `install/bootstrap.sh` — macOS/Linux install logic (no keys, idempotent).
- `install/bootstrap.ps1` — Windows install logic (no keys, idempotent).
- `skills/chart-native/src/platform-runners.ts` — pure runner-choice for Chromium steps.
- `skills/chart-native/tests/platform-runners.test.ts`
- `skills/map-native/src/platform-runners.ts` — same (duplicated per skill autonomy).
- `skills/map-native/tests/platform-runners.test.ts`
- `docs/installer/page.test.ts` — string-level regression lock on the page wiring.

**Modify:**
- `docs/installer/runtimes.js` — trim to form/UI metadata (`label`, `verified`, `keyLabel`, `keyUrl`, `keyEnv`).
- `docs/installer/runtimes.test.ts` — update field list.
- `docs/installer/generate.js` — replace `generateScript`/`scriptFilename` with `generateCopyPaste`, `generateLauncher`, `launcherFilename`, `bootstrapUrl`.
- `docs/installer/generate.test.ts` — rewrite for the new API.
- `docs/installer/index.html` — OS detection, two-mode UI, workaround docs.
- `docs/installer/style.css` — minimal styling for the OS toggle + two modes.
- `docs/installer/README.md` — hosting (raw@ref) + 2 OS × 2 modes smoke test + Windows native-render checklist.
- `skills/chart-native/scripts/produce.mjs` — snap steps `bun→SNAP`; `run` helper `shell: isWin`.
- `skills/chart-native/scripts/render-video.mjs` — `run` helper `shell: win32` (npx shim resolution).
- `skills/map-native/scripts/produce.mjs` — snap steps `bun→SNAP`, remotion `bunx→REMOTION`; `run` helper `shell: isWin`.

**No change needed:** `scripts/check.mjs` (new tests land in existing TEST_DIRS; new `src/*.ts` in existing TSC_DIRS).

---

## Task 1: Trim `runtimes.js` to form metadata

The bootstrap now owns install/launch; `runtimes.js` is only the form's source of truth. Drop the now-unused `installCmd`/`bin`/`launch` fields.

**Files:**
- Modify: `docs/installer/runtimes.js`
- Test: `docs/installer/runtimes.test.ts`

**Interfaces:**
- Produces: `RUNTIMES` — `{ claude: { label, verified:true, keyLabel, keyUrl, keyEnv }, codex|gemini|goose: { label, verified:false } }`.

- [ ] **Step 1: Update the test to the trimmed field set**

Replace the third test in `docs/installer/runtimes.test.ts` with:

```ts
test("verified runtime carries every field the form needs", () => {
  for (const key of ["label", "keyLabel", "keyUrl", "keyEnv"]) {
    expect(RUNTIMES.claude[key]).toBeTruthy();
  }
});

test("install/launch logic no longer lives in the registry (it moved to the bootstrap)", () => {
  expect(RUNTIMES.claude.installCmd).toBeUndefined();
  expect(RUNTIMES.claude.launch).toBeUndefined();
});
```

(Keep the existing "registry lists all four v1 runtimes" and "only Claude Code is verified in v1" tests unchanged.)

- [ ] **Step 2: Run tests, verify the new assertions FAIL**

Run: `cd docs/installer && bun test runtimes.test.ts`
Expected: FAIL (claude still has `installCmd`/`launch`).

- [ ] **Step 3: Trim `runtimes.js`**

Replace the file body with:

```js
// Source of truth for the installer FORM (labels, key metadata, which runtimes are
// selectable). Install + launch logic lives in the hosted bootstrap scripts, not here.
// Adding a verified runtime = fill claude-style fields + set verified:true + teach the
// bootstrap to install it.
export const RUNTIMES = {
  claude: {
    label: "Claude Code",
    verified: true,
    keyLabel: "Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  codex: { label: "Codex", verified: false },
  gemini: { label: "Gemini CLI", verified: false },
  goose: { label: "Goose", verified: false },
};
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `cd docs/installer && bun test runtimes.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/installer/runtimes.js docs/installer/runtimes.test.ts
git commit -m "refactor(installer): trim runtimes registry to form metadata"
```

---

## Task 2: New pure generators in `generate.js`

The core. Replace the single baked-script generator with per-OS, per-mode generators that carry keys and point at the hosted bootstrap.

**Files:**
- Modify (rewrite): `docs/installer/generate.js`
- Test (rewrite): `docs/installer/generate.test.ts`

**Interfaces:**
- Consumes: `RUNTIMES` from Task 1 (`rt.keyEnv`, `rt.verified`).
- Produces:
  - `bootstrapUrl(os: "mac"|"windows") -> string` (raw URL to `bootstrap.sh`/`bootstrap.ps1`).
  - `launcherFilename(os) -> "atelier-setup.command"|"atelier-setup.cmd"`.
  - `generateCopyPaste({ os, runtime, keys, embed }) -> string` (bash or PowerShell one-liner).
  - `generateLauncher({ os, runtime, keys, embed }) -> { filename, contents }`.
  - `keys = { ai, maptiler, datawrapper }`, `embed = { app, flyToken }`.

- [ ] **Step 1: Write the failing tests (rewrite `generate.test.ts`)**

```ts
import { test, expect } from "bun:test";
import {
  generateCopyPaste, generateLauncher, launcherFilename, bootstrapUrl,
} from "./generate.js";

const base = {
  runtime: "claude",
  keys: { ai: "sk-ant-TEST", maptiler: "MT-TEST", datawrapper: "DW-TEST" },
  embed: {},
};

test("throws on an unverified runtime", () => {
  expect(() => generateCopyPaste({ ...base, os: "mac", runtime: "goose" })).toThrow(/not yet available/);
});
test("throws on an unknown runtime", () => {
  expect(() => generateCopyPaste({ ...base, os: "mac", runtime: "nope" })).toThrow(/unknown runtime/);
});

test("mac copy-paste exports every key then curl|bash the sh bootstrap", () => {
  const s = generateCopyPaste({ ...base, os: "mac" });
  expect(s).toContain("export ANTHROPIC_API_KEY='sk-ant-TEST'");
  expect(s).toContain("export VITE_MAPTILER_KEY='MT-TEST'");
  expect(s).toContain("export REMOTION_MAPTILER_KEY='MT-TEST'");
  expect(s).toContain("export DATAWRAPPER_API_TOKEN='DW-TEST'");
  expect(s).toContain("curl -fsSL");
  expect(s).toContain("/install/bootstrap.sh");
  expect(s.trimEnd().endsWith("| bash")).toBe(true);
});

test("windows copy-paste sets every key then irm|iex the ps1 bootstrap", () => {
  const s = generateCopyPaste({ ...base, os: "windows" });
  expect(s).toContain("$env:ANTHROPIC_API_KEY='sk-ant-TEST'");
  expect(s).toContain("$env:DATAWRAPPER_API_TOKEN='DW-TEST'");
  expect(s).toContain("/install/bootstrap.ps1");
  expect(s.trimEnd().endsWith("| iex")).toBe(true);
});

test("copy-paste NEVER inlines install logic — only keys + a fetch", () => {
  const s = generateCopyPaste({ ...base, os: "mac" });
  expect(s).not.toContain("bun install");
  expect(s).not.toContain("playwright");
  expect(s).not.toContain("git clone");
});

test("mac launcher .command self-heals quarantine and is valid bash", () => {
  const { filename, contents } = generateLauncher({ ...base, os: "mac" });
  expect(filename).toBe("atelier-setup.command");
  expect(contents).toContain("xattr -d com.apple.quarantine");
  expect(contents.startsWith("#!/usr/bin/env bash")).toBe(true);
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(contents) });
  expect(proc.exitCode).toBe(0);
});

test("windows launcher .cmd wraps PowerShell with ExecutionPolicy Bypass, never a .ps1", () => {
  const { filename, contents } = generateLauncher({ ...base, os: "windows" });
  expect(filename).toBe("atelier-setup.cmd");
  expect(contents).toContain('set "ANTHROPIC_API_KEY=sk-ant-TEST"');
  expect(contents).toContain("powershell -ExecutionPolicy Bypass -Command");
  expect(contents).toContain("| iex");
  expect(filename.endsWith(".ps1")).toBe(false);
});

test("bootstrapUrl points at the raw hosted bootstrap per OS", () => {
  expect(bootstrapUrl("mac")).toMatch(/raw\.githubusercontent\.com\/.+\/install\/bootstrap\.sh$/);
  expect(bootstrapUrl("windows")).toMatch(/raw\.githubusercontent\.com\/.+\/install\/bootstrap\.ps1$/);
});

test("optional embed keys are carried when provided", () => {
  const s = generateCopyPaste({ ...base, os: "mac", embed: { app: "myroom-embeds", flyToken: "FLY-TEST" } });
  expect(s).toContain("export ATELIER_EMBED_APP='myroom-embeds'");
  expect(s).toContain("export FLY_API_TOKEN='FLY-TEST'");
});
```

- [ ] **Step 2: Run tests, verify they FAIL**

Run: `cd docs/installer && bun test generate.test.ts`
Expected: FAIL (old API `generateScript` gone / new exports missing).

- [ ] **Step 3: Rewrite `generate.js`**

```js
// Pure functions: (form config) -> the copy-paste one-liner OR the downloadable
// launcher, per OS. No side effects, no network. The INSTALL LOGIC lives in the hosted
// bootstrap scripts (install/bootstrap.{sh,ps1}); these functions only carry the user's
// keys and point at that bootstrap.
import { RUNTIMES } from "./runtimes.js";

const REPO_URL = "https://github.com/buriedsignals/atelier"; // confirm before public release
const REF = "main"; // pin to a release tag before public release
const REPO_PATH = new URL(REPO_URL).pathname.replace(/^\//, ""); // "buriedsignals/atelier"

export function bootstrapUrl(os) {
  const file = os === "windows" ? "bootstrap.ps1" : "bootstrap.sh";
  return `https://raw.githubusercontent.com/${REPO_PATH}/${REF}/install/${file}`;
}

export function launcherFilename(os) {
  return os === "windows" ? "atelier-setup.cmd" : "atelier-setup.command";
}

function assertRuntime(config) {
  const rt = RUNTIMES[config.runtime];
  if (!rt) throw new Error(`unknown runtime: ${config.runtime}`);
  if (!rt.verified) throw new Error(`runtime not yet available: ${config.runtime}`);
  return rt;
}

// Ordered [envVar, value] pairs, identical set for both OSes. API keys are
// alphanumeric/`-`/`_` (no quotes/%/&), so single-quote / set "K=V" quoting is safe.
function envPairs(config) {
  const rt = RUNTIMES[config.runtime];
  const k = config.keys ?? {};
  const e = config.embed ?? {};
  return [
    [rt.keyEnv, k.ai ?? ""],
    ["VITE_MAPTILER_KEY", k.maptiler ?? ""],
    ["REMOTION_MAPTILER_KEY", k.maptiler ?? ""],
    ["DATAWRAPPER_API_TOKEN", k.datawrapper ?? ""],
    ["ATELIER_EMBED_APP", e.app ?? ""],
    ["FLY_API_TOKEN", e.flyToken ?? ""],
  ];
}

export function generateCopyPaste(config) {
  assertRuntime(config);
  const os = config.os ?? "mac";
  const url = bootstrapUrl(os);
  const pairs = envPairs(config);
  if (os === "windows") {
    const sets = pairs.map(([k, v]) => `$env:${k}='${v}'`).join("; ");
    return `${sets}; irm ${url} | iex`;
  }
  const exports = pairs.map(([k, v]) => `export ${k}='${v}'`).join("; ");
  return `${exports}; curl -fsSL ${url} | bash`;
}

export function generateLauncher(config) {
  assertRuntime(config);
  const os = config.os ?? "mac";
  const url = bootstrapUrl(os);
  const pairs = envPairs(config);
  if (os === "windows") {
    const sets = pairs.map(([k, v]) => `set "${k}=${v}"`).join("\r\n");
    const contents =
      "@echo off\r\n" +
      "rem atelier-setup.cmd — generated by the Atelier installer. Has your keys; delete after a successful run.\r\n" +
      sets + "\r\n" +
      `powershell -ExecutionPolicy Bypass -Command "irm ${url} | iex"\r\n` +
      "pause\r\n";
    return { filename: launcherFilename(os), contents };
  }
  const exports = pairs.map(([k, v]) => `export ${k}='${v}'`).join("\n");
  const contents =
    "#!/usr/bin/env bash\n" +
    "# atelier-setup.command — generated by the Atelier installer. Has your keys; delete this file after a successful run.\n" +
    'chmod +x "$0" 2>/dev/null; xattr -d com.apple.quarantine "$0" 2>/dev/null || true\n' +
    exports + "\n" +
    `curl -fsSL ${url} | bash\n`;
  return { filename: launcherFilename(os), contents };
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `cd docs/installer && bun test generate.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/installer/generate.js docs/installer/generate.test.ts
git commit -m "feat(installer): per-OS copy-paste + launcher generators pointing at hosted bootstrap"
```

---

## Task 3: `install/bootstrap.sh` (macOS/Linux)

**Files:**
- Create: `install/bootstrap.sh`
- Test: `docs/installer/bootstrap-sh.test.ts`

**Interfaces:**
- Consumes (env, set by caller): `ANTHROPIC_API_KEY`, `VITE_MAPTILER_KEY`, `REMOTION_MAPTILER_KEY`, `DATAWRAPPER_API_TOKEN`, `ATELIER_EMBED_APP`, `FLY_API_TOKEN`, optional `ATELIER_REF`.
- Produces: `~/Atelier` populated, `~/Atelier/.env`, `~/Atelier/Launch Atelier.command`.

- [ ] **Step 1: Write the failing test**

`docs/installer/bootstrap-sh.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(join(import.meta.dir, "../../install/bootstrap.sh"), "utf8");

test("bootstrap.sh is valid bash", () => {
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) });
  expect(proc.exitCode).toBe(0);
});

test("installs Bun and Claude via their own installers, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).toContain("https://claude.ai/install.sh");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
});

test("acquires the repo by zip and installs the render engine", () => {
  expect(sh).toContain("/archive/");
  expect(sh).toContain("playwright install chromium");
});

test("writes .env from env vars and a local double-click launcher, then scrubs secrets", () => {
  expect(sh).toContain("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}");
  expect(sh).toContain("Launch Atelier.command");
  expect(sh).toContain("unset ANTHROPIC_API_KEY");
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: FAIL (file missing).

- [ ] **Step 3: Create `install/bootstrap.sh`**

```bash
#!/usr/bin/env bash
# Atelier bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys:
# the copy-paste one-liner and the downloaded launcher both set the key env vars BEFORE
# invoking this, and this script writes them into ~/Atelier/.env.
set -euo pipefail

REPO="https://github.com/buriedsignals/atelier"   # confirm before public release (preflight-release.mjs)
REF="${ATELIER_REF:-main}"
DEST="$HOME/Atelier"
NATIVE_SKILLS=("skills/chart-native" "skills/map-native")

echo "-> Installing Atelier (a few minutes)…"

# 1. Bun (its own installer — no Homebrew)
if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Runtime — Claude Code (native installer, lands in ~/.local/bin)
if ! command -v claude >/dev/null 2>&1; then
  echo "-> Installing Claude Code…"
  curl -fsSL https://claude.ai/install.sh | bash
fi
export PATH="$HOME/.local/bin:$PATH"

# 3. Atelier source (zip — no git; extracts to atelier-<ref>/)
if [ ! -d "$DEST" ]; then
  echo "-> Downloading Atelier…"
  tmp="$(mktemp -d)"
  curl -fsSL "$REPO/archive/$REF.zip" -o "$tmp/atelier.zip"
  unzip -q "$tmp/atelier.zip" -d "$tmp"
  mv "$tmp"/atelier-* "$DEST"
  rm -rf "$tmp"
fi

# 4. Producer deps + render engine (Playwright Chromium, shared cache)
echo "-> Installing render dependencies…"
for skill in "${NATIVE_SKILLS[@]}"; do
  ( cd "$DEST/$skill" && bun install >/dev/null 2>&1 )
done
( cd "$DEST/skills/chart-native" && bunx playwright install chromium )

# 5. Write ~/Atelier/.env from the env vars the caller set
echo "-> Writing configuration…"
cat > "$DEST/.env" <<ENV
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
VITE_MAPTILER_KEY=${VITE_MAPTILER_KEY:-}
REMOTION_MAPTILER_KEY=${REMOTION_MAPTILER_KEY:-}
DATAWRAPPER_API_TOKEN=${DATAWRAPPER_API_TOKEN:-}
ATELIER_EMBED_APP=${ATELIER_EMBED_APP:-}
FLY_API_TOKEN=${FLY_API_TOKEN:-}
ENV

# 6. Local double-click launcher (created locally → no quarantine → clean re-launch)
launcher="$DEST/Launch Atelier.command"
cat > "$launcher" <<'LAUNCH'
#!/usr/bin/env bash
cd "$(dirname "$0")" && set -a && . ./.env && set +a && claude --plugin-dir .
LAUNCH
chmod +x "$launcher"

echo ""
echo "Done! Double-click 'Launch Atelier.command' in $DEST to start."
echo "(Your keys live only in $DEST/.env, git-ignored.)"

# 7. Scrub the secrets from this process's environment
unset ANTHROPIC_API_KEY VITE_MAPTILER_KEY REMOTION_MAPTILER_KEY DATAWRAPPER_API_TOKEN FLY_API_TOKEN
```

- [ ] **Step 4: Run test, verify PASS**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add install/bootstrap.sh docs/installer/bootstrap-sh.test.ts
git commit -m "feat(installer): hosted macOS/Linux bootstrap (Bun+Claude, zip, .env, local launcher)"
```

---

## Task 4: `install/bootstrap.ps1` (Windows)

Same shape as Task 3, PowerShell, plus **Node.js** (needed only to drive Playwright/Remotion, which hang under Bun on Windows). No `pwsh` linter in CI → content assertions.

**Files:**
- Create: `install/bootstrap.ps1`
- Test: `docs/installer/bootstrap-ps1.test.ts`

**Interfaces:**
- Consumes (env): same keys as Task 3, optional `ATELIER_REF`.
- Produces: `%USERPROFILE%\Atelier` populated, `.env`, `Launch Atelier.cmd`.

- [ ] **Step 1: Write the failing test**

`docs/installer/bootstrap-ps1.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ps = readFileSync(join(import.meta.dir, "../../install/bootstrap.ps1"), "utf8");

test("installs Bun, Node (for Playwright), and Claude via native installers; no git", () => {
  expect(ps).toContain("bun.sh/install.ps1");
  expect(ps).toContain("OpenJS.NodeJS");            // Node for the Bun+Playwright hang workaround
  expect(ps).toContain("https://claude.ai/install.ps1");
  expect(ps).not.toContain("git clone");
});

test("acquires the repo by zip (Invoke-WebRequest + Expand-Archive)", () => {
  expect(ps).toContain("Invoke-WebRequest");
  expect(ps).toContain("Expand-Archive");
  expect(ps).toContain("/archive/");
});

test("writes .env from env vars, a .cmd launcher (never a .ps1), then scrubs secrets", () => {
  expect(ps).toContain("$($env:ANTHROPIC_API_KEY)");
  expect(ps).toContain("Launch Atelier.cmd");
  expect(ps).toContain("Remove-Item Env:");
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `cd docs/installer && bun test bootstrap-ps1.test.ts`
Expected: FAIL (file missing).

- [ ] **Step 3: Create `install/bootstrap.ps1`**

```powershell
# Atelier bootstrap (Windows). Idempotent — safe to re-run. Contains NO keys: the caller
# (copy-paste one-liner or downloaded .cmd launcher) sets the key env vars before invoking
# this, and this script writes them into %USERPROFILE%\Atelier\.env.
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/buriedsignals/atelier"   # confirm before public release
$Ref  = if ($env:ATELIER_REF) { $env:ATELIER_REF } else { "main" }
$Dest = Join-Path $HOME "Atelier"
$NativeSkills = @("skills\chart-native", "skills\map-native")

Write-Host "-> Installing Atelier (a few minutes)…"

# 1. Bun (native Windows build)
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Bun…"
  irm bun.sh/install.ps1 | iex
}
$env:PATH = "$HOME\.bun\bin;$env:PATH"

# 2. Node.js — ONLY to drive Playwright/Remotion (they hang under Bun on Windows: Bun #15679)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Node.js…"
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
}

# 3. Runtime — Claude Code (native installer)
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Claude Code…"
  irm https://claude.ai/install.ps1 | iex
}

# 4. Atelier source (zip — no git; extracts to atelier-<ref>\)
if (-not (Test-Path $Dest)) {
  Write-Host "-> Downloading Atelier…"
  $zip = Join-Path $env:TEMP "atelier.zip"
  Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $env:TEMP -Force
  Move-Item (Join-Path $env:TEMP "atelier-$Ref") $Dest
  Remove-Item $zip
}

# 5. Producer deps + render engine
Write-Host "-> Installing render dependencies…"
foreach ($skill in $NativeSkills) {
  Push-Location (Join-Path $Dest $skill); bun install | Out-Null; Pop-Location
}
Push-Location (Join-Path $Dest "skills\chart-native"); bunx playwright install chromium; Pop-Location

# 6. Write .env from env vars
Write-Host "-> Writing configuration…"
@"
ANTHROPIC_API_KEY=$($env:ANTHROPIC_API_KEY)
VITE_MAPTILER_KEY=$($env:VITE_MAPTILER_KEY)
REMOTION_MAPTILER_KEY=$($env:REMOTION_MAPTILER_KEY)
DATAWRAPPER_API_TOKEN=$($env:DATAWRAPPER_API_TOKEN)
ATELIER_EMBED_APP=$($env:ATELIER_EMBED_APP)
FLY_API_TOKEN=$($env:FLY_API_TOKEN)
"@ | Set-Content -Path (Join-Path $Dest ".env") -Encoding ascii

# 7. Local double-click launcher (.cmd — created locally → no MOTW → clean re-launch)
$launcher = Join-Path $Dest "Launch Atelier.cmd"
@'
@echo off
cd /d "%~dp0"
for /f "usebackq tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
claude --plugin-dir .
'@ | Set-Content -Path $launcher -Encoding ascii

Write-Host ""
Write-Host "Done! Double-click 'Launch Atelier.cmd' in $Dest to start."

# 8. Scrub secrets from this session's environment
Remove-Item Env:\ANTHROPIC_API_KEY, Env:\VITE_MAPTILER_KEY, Env:\REMOTION_MAPTILER_KEY, Env:\DATAWRAPPER_API_TOKEN, Env:\FLY_API_TOKEN -ErrorAction SilentlyContinue
```

- [ ] **Step 4: Run test, verify PASS**

Run: `cd docs/installer && bun test bootstrap-ps1.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add install/bootstrap.ps1 docs/installer/bootstrap-ps1.test.ts
git commit -m "feat(installer): hosted Windows bootstrap (Bun+Node+Claude, zip, .env, .cmd launcher)"
```

---

## Task 5: Two-mode, OS-aware installer page

Wire the generators into the page: detect OS, show that OS's block by default with a manual Mac/Windows toggle, render BOTH modes (copy-paste block + download button), and the unsigned-file workaround docs.

**Files:**
- Modify: `docs/installer/index.html`
- Modify: `docs/installer/style.css`
- Test: `docs/installer/page.test.ts`

**Interfaces:**
- Consumes: `generateCopyPaste`, `generateLauncher`, `launcherFilename` (Task 2); `RUNTIMES` (Task 1).

- [ ] **Step 1: Write the failing regression-lock test**

`docs/installer/page.test.ts`:

```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");

test("page wires the new generators, not the removed baked-script API", () => {
  expect(html).toContain("generateCopyPaste");
  expect(html).toContain("generateLauncher");
  expect(html).not.toContain("generateScript");
});

test("page offers both delivery modes and an OS toggle", () => {
  expect(html).toContain('data-testid="mode-copypaste"');
  expect(html).toContain('data-testid="mode-download"');
  expect(html).toContain('data-testid="os-toggle"');
});

test("page documents the unsigned-file workaround for both OSes", () => {
  expect(html.toLowerCase()).toContain("run anyway");            // Windows SmartScreen
  expect(html.toLowerCase()).toContain("privacy & security");    // macOS Gatekeeper (Sequoia+)
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `cd docs/installer && bun test page.test.ts`
Expected: FAIL (no data-testids / still references generateScript).

- [ ] **Step 3: Rewrite the `<body>` of `docs/installer/index.html`**

Replace everything between `<body>` and `</body>` with:

```html
  <main>
    <h1>Install Atelier</h1>
    <p>Fill this in, then choose one of the two ways to install. Your keys never leave this page.</p>

    <form id="setup">
      <fieldset>
        <legend>AI runtime</legend>
        <div id="runtimes"></div>
      </fieldset>

      <label>AI API key <span id="keyLabel"></span>
        <input name="ai" type="password" autocomplete="off" />
        <a id="keyUrl" href="#" target="_blank" rel="noopener">Where do I get this?</a>
      </label>
      <label>MapTiler key <small>(maps — skip to add later)</small>
        <input name="maptiler" type="password" autocomplete="off" />
        <a href="https://cloud.maptiler.com/account/keys/" target="_blank" rel="noopener">Get one</a>
      </label>
      <label>Datawrapper token <small>(charts — skip to add later)</small>
        <input name="datawrapper" type="password" autocomplete="off" />
        <a href="https://app.datawrapper.de/account/api-tokens" target="_blank" rel="noopener">Get one</a>
      </label>
      <details>
        <summary>Embed host (advanced, optional)</summary>
        <label>fly.io app name <input name="embedApp" type="text" autocomplete="off" /></label>
        <label>FLY_API_TOKEN <input name="flyToken" type="password" autocomplete="off" /></label>
      </details>
    </form>

    <section id="output" hidden>
      <div id="os-toggle" data-testid="os-toggle" role="tablist">
        <button type="button" data-os="mac" aria-selected="true">macOS</button>
        <button type="button" data-os="windows" aria-selected="false">Windows</button>
      </div>

      <div class="mode" data-testid="mode-copypaste">
        <h2>Option A — paste one line into the terminal</h2>
        <p class="hint" id="terminalHint"></p>
        <pre><code id="copypaste"></code></pre>
        <button type="button" id="copyBtn">Copy</button>
        <p class="note">After it finishes, close the terminal window (the line held your keys).</p>
      </div>

      <div class="mode" data-testid="mode-download">
        <h2>Option B — download a file and open it</h2>
        <button type="button" id="downloadBtn">Download my installer</button>
        <p class="note" id="workaround"></p>
      </div>
    </section>
  </main>

  <script type="module">
    import { RUNTIMES } from "./runtimes.js";
    import { generateCopyPaste, generateLauncher, launcherFilename } from "./generate.js";

    const form = document.getElementById("setup");
    const runtimesEl = document.getElementById("runtimes");
    const keyLabelEl = document.getElementById("keyLabel");
    const keyUrlEl = document.getElementById("keyUrl");
    const output = document.getElementById("output");
    const copypasteEl = document.getElementById("copypaste");
    const terminalHint = document.getElementById("terminalHint");
    const workaround = document.getElementById("workaround");

    let selectedRuntime = "claude";
    let os = /Win/i.test(navigator.platform || navigator.userAgent) ? "windows" : "mac";

    for (const [id, rt] of Object.entries(RUNTIMES)) {
      const label = document.createElement("label");
      label.className = "runtime" + (rt.verified ? "" : " disabled");
      label.innerHTML =
        `<input type="radio" name="runtime" value="${id}" ${id === selectedRuntime ? "checked" : ""}
          ${rt.verified ? "" : "disabled"} /> ${rt.label}` +
        (rt.verified ? "" : " <small>coming soon</small>");
      runtimesEl.appendChild(label);
    }

    function config() {
      const f = new FormData(form);
      return {
        os, runtime: selectedRuntime,
        keys: { ai: f.get("ai"), maptiler: f.get("maptiler"), datawrapper: f.get("datawrapper") },
        embed: { app: f.get("embedApp"), flyToken: f.get("flyToken") },
      };
    }

    const HINTS = {
      mac: "Open Terminal (Cmd-Space, type “Terminal”), paste, press Enter.",
      windows: "Open PowerShell (Start, type “PowerShell”), paste, press Enter.",
    };
    const WORKAROUND = {
      mac: "If macOS blocks the file: System Settings → Privacy & Security → “Open Anyway”.",
      windows: "If Windows shows “Windows protected your PC”: click More info → Run anyway.",
    };

    function render() {
      const rt = RUNTIMES[selectedRuntime];
      keyLabelEl.textContent = `(${rt.keyLabel})`;
      keyUrlEl.href = rt.keyUrl;
      document.querySelectorAll('#os-toggle button').forEach((b) =>
        b.setAttribute("aria-selected", String(b.dataset.os === os)));
      try {
        copypasteEl.textContent = generateCopyPaste(config());
      } catch { copypasteEl.textContent = ""; }
      terminalHint.textContent = HINTS[os];
      workaround.textContent = WORKAROUND[os];
      output.hidden = false;
    }
    render();

    form.addEventListener("change", (e) => {
      if (e.target.name === "runtime") selectedRuntime = e.target.value;
      render();
    });
    form.addEventListener("input", render);
    document.getElementById("os-toggle").addEventListener("click", (e) => {
      if (e.target.dataset.os) { os = e.target.dataset.os; render(); }
    });
    document.getElementById("copyBtn").addEventListener("click", () =>
      navigator.clipboard.writeText(copypasteEl.textContent));
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const { filename, contents } = generateLauncher(config());
      const blob = new Blob([contents], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  </script>
```

- [ ] **Step 4: Add minimal styles to `docs/installer/style.css`**

Append:

```css
#os-toggle { display: flex; gap: 0; margin: 1rem 0; }
#os-toggle button { padding: 0.5rem 1rem; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer; }
#os-toggle button[aria-selected="true"] { background: #0072B2; color: #fff; }
.mode { margin: 1.5rem 0; }
.mode pre { overflow-x: auto; background: #111; color: #eee; padding: 0.75rem; border-radius: 4px; }
.note { font-size: 0.85rem; color: #555; }
```

- [ ] **Step 5: Run the regression test, verify PASS**

Run: `cd docs/installer && bun test page.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Manual browser check (this task has UI that unit tests can't cover)**

Run: `cd docs/installer && bunx serve . -p 8123` (or `python3 -m http.server 8123`), open `http://localhost:8123`.
Confirm: OS auto-detected; toggling Mac/Windows swaps the one-liner between `curl…|bash` and `irm…|iex`; typing a key updates the one-liner live; **Copy** copies it; **Download** yields `atelier-setup.command` (Mac) / `atelier-setup.cmd` (Windows) with the keys baked and the right bootstrap URL; the workaround note matches the OS.

- [ ] **Step 7: Commit**

```bash
git add docs/installer/index.html docs/installer/style.css docs/installer/page.test.ts
git commit -m "feat(installer): OS-aware page offering copy-paste + download, with workaround docs"
```

---

## Task 6: Windows native-render guard — chart-native

Switch the Chromium-launching snap steps from Bun to Node on Windows, and make the `run` helpers resolve `.cmd` shims (`shell` on win32). chart-native video is already safe (`render-video.mjs` shells `npx remotion` → Chromium under Node) except for that same `.cmd` shim fix.

**Files:**
- Create: `skills/chart-native/src/platform-runners.ts`
- Create: `skills/chart-native/tests/platform-runners.test.ts`
- Modify: `skills/chart-native/scripts/produce.mjs`
- Modify: `skills/chart-native/scripts/render-video.mjs`

**Interfaces:**
- Produces: `snapRunner(platform: string) -> "node"|"bun"`, `remotionRunner(platform: string) -> "npx"|"bunx"`.

- [ ] **Step 1: Write the failing test**

`skills/chart-native/tests/platform-runners.test.ts`:

```ts
import { test, expect } from "bun:test";
import { snapRunner, remotionRunner } from "../src/platform-runners.ts";

test("snap steps run under Node on Windows (Bun+Playwright hang), Bun elsewhere", () => {
  expect(snapRunner("win32")).toBe("node");
  expect(snapRunner("darwin")).toBe("bun");
  expect(snapRunner("linux")).toBe("bun");
});

test("Remotion runs under npx on Windows, bunx elsewhere", () => {
  expect(remotionRunner("win32")).toBe("npx");
  expect(remotionRunner("darwin")).toBe("bunx");
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `cd skills/chart-native && bun test tests/platform-runners.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create `skills/chart-native/src/platform-runners.ts`**

```ts
// Pick the subprocess runner for steps that LAUNCH headless Chromium. On Windows,
// Playwright's chromium.launch() hangs indefinitely under the Bun runtime (Bun #15679 —
// Bun drops the CDP fd3 pipe Playwright uses), so those steps must run under Node. Other
// platforms are unaffected: Bun drives Chromium fine.
export function snapRunner(platform: string): "node" | "bun" {
  return platform === "win32" ? "node" : "bun";
}

// Same reasoning for Remotion (it launches its own Chromium): the Node package runner on
// Windows, the Bun one elsewhere.
export function remotionRunner(platform: string): "npx" | "bunx" {
  return platform === "win32" ? "npx" : "bunx";
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `cd skills/chart-native && bun test tests/platform-runners.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the guard into `produce.mjs`**

In `skills/chart-native/scripts/produce.mjs`:

Add to the imports (next to the other `../src/*` imports):
```js
import { snapRunner } from "../src/platform-runners.ts";
```

Immediately after `const root = join(here, "..");` add:
```js
const isWin = process.platform === "win32";
const SNAP = snapRunner(process.platform);
```

Change the `run` helper to resolve `.cmd` shims on Windows:
```js
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv }, shell: isWin });
```

Change the two Chromium-launching snap calls from `"bun"` to `SNAP`:
```js
run(SNAP, ["scripts/snap-proof.mjs"], { OUTDIR: outDir });
```
```js
run(SNAP, ["scripts/snap-contrast.mjs"]);
```

- [ ] **Step 6: Fix the `.cmd` shim in `render-video.mjs`**

In `skills/chart-native/scripts/render-video.mjs`, change the `run` helper to:
```js
const run = (args) =>
  execFileSync("npx", args, { stdio: "inherit", cwd: join(here, ".."), shell: process.platform === "win32" });
```

- [ ] **Step 7: Add a source regression-lock test**

Append to `skills/chart-native/tests/platform-runners.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("produce.mjs uses the platform runner for Chromium snap steps (no hardcoded bun)", () => {
  const src = readFileSync(join(import.meta.dir, "../scripts/produce.mjs"), "utf8");
  expect(src).toContain("snapRunner(process.platform)");
  expect(src).not.toContain('run("bun", ["scripts/snap-proof.mjs"]');
  expect(src).not.toContain('run("bun", ["scripts/snap-contrast.mjs"]');
});
```

- [ ] **Step 8: Run the full chart-native suite + tsc**

Run: `cd skills/chart-native && bun test tests/platform-runners.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc clean (0 errors).

- [ ] **Step 9: Verify no Mac regression (produce still runs on this machine)**

Run (macOS): `cd skills/chart-native && bun scripts/produce.mjs bar assets/sample-config.json /tmp/cn-guard-check static`
Expected: produces `static.png` (the guard is a no-op on darwin: `SNAP === "bun"`, `shell:false`).
_(If the sample config path differs, use any existing `assets/*config*.json`; the point is produce still runs green on Mac.)_

- [ ] **Step 10: Commit**

```bash
git add skills/chart-native/src/platform-runners.ts skills/chart-native/tests/platform-runners.test.ts skills/chart-native/scripts/produce.mjs skills/chart-native/scripts/render-video.mjs
git commit -m "fix(chart-native): drive Playwright via Node on Windows (Bun+Playwright hang)"
```

---

## Task 7: Windows native-render guard — map-native

Same recipe. map-native launches `bunx remotion` **directly** in `produce.mjs`, so it needs the `bunx→npx` switch too (unlike chart-native).

**Files:**
- Create: `skills/map-native/src/platform-runners.ts`
- Create: `skills/map-native/tests/platform-runners.test.ts`
- Modify: `skills/map-native/scripts/produce.mjs`

**Interfaces:**
- Produces: `snapRunner`, `remotionRunner` (same signatures as Task 6).

- [ ] **Step 1: Write the failing test**

`skills/map-native/tests/platform-runners.test.ts`:

```ts
import { test, expect } from "bun:test";
import { snapRunner, remotionRunner } from "../src/platform-runners.ts";

test("snap steps run under Node on Windows (Bun+Playwright hang), Bun elsewhere", () => {
  expect(snapRunner("win32")).toBe("node");
  expect(snapRunner("darwin")).toBe("bun");
});

test("Remotion runs under npx on Windows, bunx elsewhere", () => {
  expect(remotionRunner("win32")).toBe("npx");
  expect(remotionRunner("darwin")).toBe("bunx");
});
```

- [ ] **Step 2: Run test, verify it FAILS**

Run: `cd skills/map-native && bun test tests/platform-runners.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create `skills/map-native/src/platform-runners.ts`**

(Identical content to Task 6 Step 3 — repeated here so the file is self-contained; the two skills stay autonomous, no cross-skill import.)

```ts
// Pick the subprocess runner for steps that LAUNCH headless Chromium. On Windows,
// Playwright's chromium.launch() hangs indefinitely under the Bun runtime (Bun #15679 —
// Bun drops the CDP fd3 pipe Playwright uses), so those steps must run under Node. Other
// platforms are unaffected: Bun drives Chromium fine.
export function snapRunner(platform: string): "node" | "bun" {
  return platform === "win32" ? "node" : "bun";
}

// Same reasoning for Remotion (it launches its own Chromium): the Node package runner on
// Windows, the Bun one elsewhere.
export function remotionRunner(platform: string): "npx" | "bunx" {
  return platform === "win32" ? "npx" : "bunx";
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `cd skills/map-native && bun test tests/platform-runners.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the guard into `produce.mjs`**

In `skills/map-native/scripts/produce.mjs`:

Add to the imports:
```js
import { snapRunner, remotionRunner } from "../src/platform-runners.ts";
```

After the `root`/paths setup (before the `run` helper), add:
```js
const isWin = process.platform === "win32";
const SNAP = snapRunner(process.platform);
const REMOTION = remotionRunner(process.platform);
```

Change the `run` helper to add `shell: isWin`:
```js
const run = (cmd, args, extraEnv = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...env, ...extraEnv }, shell: isWin });
```

Change all five Chromium-launching snap calls from `"bun"` to `SNAP` — `snap-static.mjs`, `snap-proof.mjs`, `snap-responsive.mjs`, `snap-a11y.mjs`, `snap-theme.mjs`. For example:
```js
run(SNAP, ["scripts/snap-static.mjs"], { OUTDIR: outDir, SERVE_DIR: staticDir });
run(SNAP, ["scripts/snap-proof.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
run(SNAP, ["scripts/snap-responsive.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
run(SNAP, ["scripts/snap-a11y.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
run(SNAP, ["scripts/snap-theme.mjs"], { OUTDIR: outDir, SERVE_DIR: staticDir });
```
Leave the two `run("bunx", ["vite", "build"], …)` and `run("bun", ["scripts/assert-selfcontained.mjs", …])` calls **unchanged** (no Chromium).

Change the two Remotion calls in `renderVideoSet` from `"bunx"` to `REMOTION`:
```js
run(REMOTION, ["remotion", "still", remotionEntry, comp, stillOut,
  `--frame=${STILL_FRAME[kind]}`, "--gl=angle", `--props=${propsPath}`], { COMP: comp });
run(REMOTION, ["remotion", "render", remotionEntry, comp, mp4Out,
  "--gl=angle", "--concurrency=1", "--timeout=120000", `--props=${propsPath}`], { COMP: comp });
```

- [ ] **Step 6: Add a source regression-lock test**

Append to `skills/map-native/tests/platform-runners.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("produce.mjs routes Chromium snap + Remotion steps through the platform runners", () => {
  const src = readFileSync(join(import.meta.dir, "../scripts/produce.mjs"), "utf8");
  expect(src).toContain("snapRunner(process.platform)");
  expect(src).toContain("remotionRunner(process.platform)");
  expect(src).not.toContain('run("bun", ["scripts/snap-proof.mjs"]');
  expect(src).not.toContain('run("bunx", ["remotion", "still"');
});
```

- [ ] **Step 7: Run the map-native platform tests + tsc**

Run: `cd skills/map-native && bun test tests/platform-runners.test.ts && bunx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 8: Verify no Mac regression**

Run (macOS): produce any existing map sample in `static` mode (e.g. `cd skills/map-native && bun scripts/produce.mjs assets/<sample>.json /tmp/mn-guard-check static`).
Expected: produces static output green (guard is a no-op on darwin).

- [ ] **Step 9: Commit**

```bash
git add skills/map-native/src/platform-runners.ts skills/map-native/tests/platform-runners.test.ts skills/map-native/scripts/produce.mjs
git commit -m "fix(map-native): drive Playwright + Remotion via Node on Windows (Bun+Playwright hang)"
```

---

## Task 8: Hosting docs, smoke procedure, and the full gate

**Files:**
- Modify: `docs/installer/README.md`

- [ ] **Step 1: Rewrite `docs/installer/README.md`**

```markdown
# Atelier installer

Static, client-side page that generates, per OS, a copy-paste one-liner AND a downloadable
launcher — both fetch the hosted bootstrap. No backend, no keys stored.

## Pieces
- `index.html` / `generate.js` / `runtimes.js` — the page (collects keys, emits both modes).
- `install/bootstrap.sh` / `install/bootstrap.ps1` (repo root) — the install logic, no keys.

## Hosting
- Page: GitHub Pages serves `docs/` (Settings → Pages → main branch, `/docs`), URL
  `https://<org>.github.io/atelier/installer/`.
- Bootstraps: fetched over `raw.githubusercontent.com/<repo>/<ref>/install/bootstrap.{sh,ps1}`.
  `<repo>`/`<ref>` are set in `generate.js` (page side) and hardcoded in each bootstrap. Before
  the public release, confirm the real repo and pin `<ref>` to a release tag in BOTH places
  (`scripts/preflight-release.mjs` tracks the `REPO_URL`).

## Adding a runtime
1. Verify the Atelier plugin loads on that runtime.
2. Fill claude-style fields in `runtimes.js` + set `verified: true`.
3. Teach both bootstraps to install it.
4. `bun test docs/installer` must pass.

## Release smoke test (manual, required before announcing the URL)
On a clean macOS account AND a clean Windows VM, for BOTH modes:
1. Open the install URL, pick Claude Code, paste real Anthropic + MapTiler + Datawrapper keys.
2. **Copy-paste:** run the one-liner in Terminal (Mac) / PowerShell (Windows). **Download:**
   double-click `atelier-setup.command` (Mac) / `atelier-setup.cmd` (Windows); clear the OS
   warning per the on-page note.
3. Confirm: Bun (+ Node on Windows) + Claude Code install; `~/Atelier` is populated from zip;
   `~/Atelier/.env` holds the keys; a `Launch Atelier` file is created.
4. Double-click `Launch Atelier` → Atelier starts and reads the keys.
5. **Windows native render (validates the Task 6/7 guard):** produce one native chart
   (chart-native) and one native map (map-native) → they render (do NOT hang). Watch-item:
   if a username has a space (e.g. `C:\Users\Jean Dupont`), confirm the Remotion `--props`
   temp path still resolves under `shell:true`; if it breaks, write props into a space-free
   dir. The Datawrapper path (map-dw / dw-chart) needs no local render and works regardless.
```

- [ ] **Step 2: Run the full gate**

Run: `bun run check`
Expected: all checks PASS (the prior 14 + the new installer/skill tests; still green). If any FAIL, fix before committing.

- [ ] **Step 3: Commit**

```bash
git add docs/installer/README.md
git commit -m "docs(installer): hosting, 2×2 smoke procedure, Windows native-render validation"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §4 architecture → Tasks 2–5; §6 bootstrap Mac/Win → Tasks 3–4; §7 two modes → Tasks 2,5; §8 Windows render guard → Tasks 6–7; §5 components table → Tasks 1–7; §10 tests → every task's TDD steps + Task 8 gate; §11 locked decisions → Global Constraints. No uncovered section.
- **Placeholders:** none — every step has real code/commands. `<org>`/`<repo>`/`<ref>` in README are deliberate release-time placeholders, flagged as such and tracked by preflight.
- **Type consistency:** `snapRunner`/`remotionRunner` signatures identical across Tasks 6–7; `generateCopyPaste`/`generateLauncher`/`launcherFilename`/`bootstrapUrl` defined in Task 2 and consumed with matching shapes in Task 5; `config` shape (`{ os, runtime, keys:{ai,maptiler,datawrapper}, embed:{app,flyToken} }`) consistent between page and generators.

## Known follow-ons (out of scope, from the spec)
- macOS notarization (declined); FR translation of the page; pinning `<ref>` to a release tag (coupled to `REPO_URL` lock); broader Windows verification of non-native skills.

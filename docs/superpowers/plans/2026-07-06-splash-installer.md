# Splash Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, client-side install page that generates a config-baked `splash-setup.command` bash script, so a non-technical journalist installs Splash on macOS with one double-click.

**Architecture:** Three decoupled units under `docs/installer/`: a data-only **runtime registry** (`runtimes.js`), a pure **script generator** (`generate.js`, `(config) → bash string`), and a static **install page** (`index.html`) that renders cards from the registry and wires the form to the generator's download. GitHub Pages serves `docs/`. No backend; keys are baked client-side into the downloaded file only.

**Tech Stack:** Vanilla HTML/CSS/ES modules (browser), Bun + bun:test for the generator tests, GitHub Pages for hosting.

## Global Constraints

- All code, comments, identifiers, and commit messages in **English** (repo standard).
- Runtime is **Bun** — never npm/node. Tests use `bun:test`.
- No backend, no network calls from the page. Generation is 100% client-side.
- `runtimes.js` and `generate.js` are **ES modules** importable by both the browser (`<script type="module">`) and bun:test.
- v1 is **macOS-only** (`.command`). Do not add Windows/Linux branches.
- Only `verified: true` runtimes generate a script. Claude Code is the sole verified runtime in v1; Codex/Gemini/Goose ship as disabled "coming soon" cards.
- No secret ever leaves the browser or gets committed. The Splash repo's real `.env` stays gitignored.

---

### Task 1: Runtime registry

**Files:**
- Create: `docs/installer/runtimes.js`
- Test: `docs/installer/runtimes.test.ts`

**Interfaces:**
- Produces: `export const RUNTIMES` — an object keyed by runtime id. Each entry: `{ label: string, verified: boolean }` and, when `verified`, also `{ installCmd: string, bin: string, keyLabel: string, keyUrl: string, keyEnv: string, launch: string }`. `RUNTIMES.claude` is the only verified entry in v1.

- [ ] **Step 1: Write the failing test**

```ts
// docs/installer/runtimes.test.ts
import { test, expect } from "bun:test";
import { RUNTIMES } from "./runtimes.js";

test("registry lists all four v1 runtimes", () => {
  expect(Object.keys(RUNTIMES).sort()).toEqual(["claude", "codex", "gemini", "goose"]);
});

test("only Claude Code is verified in v1", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(false);
  expect(RUNTIMES.gemini.verified).toBe(false);
  expect(RUNTIMES.goose.verified).toBe(false);
});

test("verified runtime carries every field the generator needs", () => {
  for (const key of ["installCmd", "bin", "keyLabel", "keyUrl", "keyEnv", "launch"]) {
    expect(RUNTIMES.claude[key]).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Sites/Professional/splash && bun test docs/installer/runtimes.test.ts`
Expected: FAIL — cannot find module `./runtimes.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// docs/installer/runtimes.js
// Source of truth for both the form cards and the script generator.
// Adding a verified runtime = fill every field on its entry and flip `verified`.
export const RUNTIMES = {
  claude: {
    label: "Claude Code",
    verified: true,
    installCmd: "curl -fsSL https://claude.ai/install.sh | bash",
    bin: "claude",
    keyLabel: "Anthropic API key",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyEnv: "ANTHROPIC_API_KEY",
    launch: "cd ~/Splash && claude --plugin-dir .",
  },
  // Not yet verified — see the design's "Verification gates". Cards render disabled
  // ("coming soon") until each is confirmed to load the Splash plugin/skill.
  codex: { label: "Codex", verified: false },
  gemini: { label: "Gemini CLI", verified: false },
  goose: { label: "Goose", verified: false },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/installer/runtimes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/installer/runtimes.js docs/installer/runtimes.test.ts
git commit -m "feat(installer): runtime registry — Claude verified, others coming soon"
```

---

### Task 2: Script generator

**Files:**
- Create: `docs/installer/generate.js`
- Test: `docs/installer/generate.test.ts`

**Interfaces:**
- Consumes: `RUNTIMES` from `./runtimes.js` (Task 1).
- Produces:
  - `export function generateScript(config): string` — `config = { runtime: string, keys: { ai?: string, maptiler?: string, datawrapper?: string }, embed?: { app?: string, flyToken?: string } }`. Returns a complete bash script. Throws `Error` if the runtime is unknown or not `verified`.
  - `export function scriptFilename(): string` — returns `"splash-setup.command"`.

- [ ] **Step 1: Write the failing test**

```ts
// docs/installer/generate.test.ts
import { test, expect } from "bun:test";
import { generateScript, scriptFilename } from "./generate.js";

const base = {
  runtime: "claude",
  keys: { ai: "sk-ant-TEST", maptiler: "MT-TEST", datawrapper: "DW-TEST" },
  embed: {},
};

test("filename is the macOS double-click command file", () => {
  expect(scriptFilename()).toBe("splash-setup.command");
});

test("throws on an unverified runtime", () => {
  expect(() => generateScript({ ...base, runtime: "goose" })).toThrow(/not yet available/);
});

test("throws on an unknown runtime", () => {
  expect(() => generateScript({ ...base, runtime: "nope" })).toThrow(/unknown runtime/);
});

test("bakes every key into the script", () => {
  const s = generateScript(base);
  expect(s).toContain("ANTHROPIC_API_KEY=sk-ant-TEST");
  expect(s).toContain("VITE_MAPTILER_KEY=MT-TEST");
  expect(s).toContain("REMOTION_MAPTILER_KEY=MT-TEST");
  expect(s).toContain("DATAWRAPPER_API_TOKEN=DW-TEST");
});

test("includes install steps and the launch instruction", () => {
  const s = generateScript(base);
  expect(s).toContain("curl -fsSL https://claude.ai/install.sh | bash");
  expect(s).toContain("git clone");
  expect(s).toContain("cd ~/Splash && claude --plugin-dir .");
  expect(s.startsWith("#!/bin/bash")).toBe(true);
  expect(s).toContain("Delete this file"); // security self-warning
});

test("the generated script is valid bash", () => {
  const s = generateScript(base);
  const proc = Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(s) });
  expect(proc.exitCode).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/installer/generate.test.ts`
Expected: FAIL — cannot find module `./generate.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// docs/installer/generate.js
// Pure function: (form config) -> bash string. No side effects, no network.
import { RUNTIMES } from "./runtimes.js";

export function scriptFilename() {
  return "splash-setup.command";
}

const REPO_URL = "https://github.com/buriedsignals/splash.git"; // confirm before public release

export function generateScript(config) {
  const rt = RUNTIMES[config.runtime];
  if (!rt) throw new Error(`unknown runtime: ${config.runtime}`);
  if (!rt.verified) throw new Error(`runtime not yet available: ${config.runtime}`);

  const k = config.keys ?? {};
  const embed = config.embed ?? {};
  const env = [
    `${rt.keyEnv}=${k.ai ?? ""}`,
    `VITE_MAPTILER_KEY=${k.maptiler ?? ""}`,
    `REMOTION_MAPTILER_KEY=${k.maptiler ?? ""}`,
    `DATAWRAPPER_API_TOKEN=${k.datawrapper ?? ""}`,
    `SPLASH_EMBED_APP=${embed.app ?? ""}`,
    `FLY_API_TOKEN=${embed.flyToken ?? ""}`,
  ].join("\n");

  return `#!/bin/bash
# splash-setup.command — generated by the Splash installer.
# This file contains your API keys. Delete this file after a successful run.
set -e

echo "-> Installing Splash (this takes a few minutes)..."

if ! command -v brew >/dev/null 2>&1; then
  echo "-> Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun..."
  brew install oven-sh/bun/bun
fi

if ! command -v ${rt.bin} >/dev/null 2>&1; then
  echo "-> Installing ${rt.label}..."
  ${rt.installCmd}
fi

if [ ! -d "$HOME/Splash" ]; then
  echo "-> Downloading Splash..."
  git clone ${REPO_URL} "$HOME/Splash"
fi

echo "-> Writing configuration..."
cat > "$HOME/Splash/.env" <<'SPLASH_ENV'
${env}
SPLASH_ENV

if ! grep -q "${rt.keyEnv}" "$HOME/.zshrc" 2>/dev/null; then
  echo 'export ${rt.keyEnv}=${k.ai ?? ""}' >> "$HOME/.zshrc"
fi

echo ""
echo "Done! To launch Splash, open Terminal and run:"
echo "    ${rt.launch}"
echo ""
echo "Security note: this file contains your keys. You can delete it now."
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/installer/generate.test.ts`
Expected: PASS (6 tests), including the `bash -n` syntax check.

- [ ] **Step 5: Commit**

```bash
git add docs/installer/generate.js docs/installer/generate.test.ts
git commit -m "feat(installer): pure script generator with bash-syntax test"
```

---

### Task 3: Install page (form + wiring)

**Files:**
- Create: `docs/installer/index.html`
- Create: `docs/installer/style.css`

**Interfaces:**
- Consumes: `RUNTIMES` (Task 1) and `generateScript`, `scriptFilename` (Task 2).
- Produces: a browsable page at `docs/installer/index.html`. No exported symbols; verified by manual browser check (no unit test — DOM wiring).

- [ ] **Step 1: Write the page**

```html
<!-- docs/installer/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Install Splash</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>Install Splash</h1>
    <p>Fill this in, download one file, double-click it. No terminal needed. Your keys never
      leave this page.</p>

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

      <button type="submit">Download my installer</button>
    </form>
  </main>

  <script type="module">
    import { RUNTIMES } from "./runtimes.js";
    import { generateScript, scriptFilename } from "./generate.js";

    const form = document.getElementById("setup");
    const runtimesEl = document.getElementById("runtimes");
    const keyLabelEl = document.getElementById("keyLabel");
    const keyUrlEl = document.getElementById("keyUrl");

    let selected = "claude";

    for (const [id, rt] of Object.entries(RUNTIMES)) {
      const label = document.createElement("label");
      label.className = "runtime" + (rt.verified ? "" : " disabled");
      label.innerHTML =
        `<input type="radio" name="runtime" value="${id}" ${id === selected ? "checked" : ""}
          ${rt.verified ? "" : "disabled"} /> ${rt.label}` +
        (rt.verified ? "" : ` <small>coming soon</small>`);
      runtimesEl.appendChild(label);
    }

    function syncKeyField() {
      const rt = RUNTIMES[selected];
      keyLabelEl.textContent = `(${rt.keyLabel})`;
      keyUrlEl.href = rt.keyUrl;
    }
    syncKeyField();

    form.addEventListener("change", (e) => {
      if (e.target.name === "runtime") { selected = e.target.value; syncKeyField(); }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const script = generateScript({
        runtime: selected,
        keys: { ai: f.get("ai"), maptiler: f.get("maptiler"), datawrapper: f.get("datawrapper") },
        embed: { app: f.get("embedApp"), flyToken: f.get("flyToken") },
      });
      const blob = new Blob([script], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = scriptFilename();
      a.click();
      URL.revokeObjectURL(a.href);
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Write minimal styles**

```css
/* docs/installer/style.css */
body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
h1 { margin-bottom: 0.25rem; }
form { display: grid; gap: 1rem; margin-top: 1.5rem; }
label { display: grid; gap: 0.25rem; }
input { padding: 0.5rem; font: inherit; }
fieldset { border: 1px solid #ccc; border-radius: 6px; }
.runtime.disabled { color: #999; }
button { padding: 0.75rem; font: inherit; font-weight: 600; cursor: pointer; }
small { color: #666; font-weight: 400; }
```

- [ ] **Step 3: Verify in the browser**

Run: `cd docs/installer && bun x serve . -p 4173` (or `python3 -m http.server 4173`), open `http://localhost:4173/`.
Expected: four runtime radios (Codex/Gemini/Goose disabled + "coming soon"); the AI-key label reads "(Anthropic API key)"; submitting downloads `splash-setup.command`; opening it shows the baked keys.

- [ ] **Step 4: Commit**

```bash
git add docs/installer/index.html docs/installer/style.css
git commit -m "feat(installer): static install page wired to registry + generator"
```

---

### Task 4: GitHub Pages hosting + release smoke checklist

**Files:**
- Create: `docs/installer/README.md`
- Modify: repo GitHub Pages setting (serve from `docs/`) — done in the GitHub UI, documented in the README.

**Interfaces:**
- Consumes: the finished `docs/installer/` from Tasks 1–3.
- Produces: a public install URL (`https://<org>.github.io/splash/installer/`) and a documented manual smoke test that gates release.

- [ ] **Step 1: Write the installer README**

```markdown
<!-- docs/installer/README.md -->
# Splash installer

Static, client-side page that generates a config-baked `splash-setup.command`. No backend.

## Hosting
GitHub Pages serves `docs/`. In repo Settings → Pages → set source to the `main` branch, `/docs`
folder. The installer is then at `https://<org>.github.io/splash/installer/`.

## Adding a runtime
1. Verify the Splash plugin/skill actually loads on that runtime.
2. Fill every field on its `runtimes.js` entry and set `verified: true`.
3. `bun test docs/installer` — the registry + generator tests must pass.

## Release smoke test (manual, required before announcing the URL)
On a clean macOS user account:
1. Open the install URL, pick Claude Code, paste a real Anthropic key + MapTiler + Datawrapper.
2. Download and double-click `splash-setup.command`.
3. Confirm: Homebrew, Bun, and Claude Code install; `~/Splash` is cloned; `~/Splash/.env`
   holds the keys; the final message prints the launch command.
4. Run the launch command and confirm Splash starts and reads the keys.
```

- [ ] **Step 2: Confirm the full test suite passes**

Run: `bun test docs/installer`
Expected: PASS — all registry + generator tests green.

- [ ] **Step 3: Set GitHub Pages source**

In GitHub → Settings → Pages → Source: `main` / `/docs`. (Manual UI step; no code.)
Expected: `https://<org>.github.io/splash/installer/` serves the page.

- [ ] **Step 4: Commit**

```bash
git add docs/installer/README.md
git commit -m "docs(installer): hosting + release smoke checklist"
```

---

## Self-Review

**Spec coverage:**
- Static client-side page, no backend → Tasks 3–4. ✓
- Runtime registry (agnostic core, 4 entries, Claude verified) → Task 1. ✓
- Script generator (pure, per-runtime, keys baked) → Task 2. ✓
- Form fields (runtime, AI key, MapTiler, Datawrapper, embed advanced) → Task 3. ✓
- `.command` steps (brew, Bun, runtime install, clone, .env, auth export, launch msg) → Task 2 generator. ✓
- Auth = paste key baked in → Task 2 (`.env` + `.zshrc` export). ✓
- Verification gates (non-Claude disabled) → Task 1 `verified:false` + Task 3 disabled cards. ✓
- Security (client-side only, delete-after-run warning) → Task 2 header/footer + Task 3 `type="password"`. ✓
- Testing (generator snapshot-ish asserts + `bash -n` + manual smoke) → Tasks 2 & 4. ✓
- macOS-only, Bun, English → Global Constraints. ✓

**Placeholder scan:** `REPO_URL` and the Pages URL carry an explicit "confirm before public release" note (the repo is private until the Sept–Oct MIT release — the exact public org/URL is genuinely not knowable yet, so it is flagged, not silently stubbed). No other TBDs.

**Type consistency:** `generateScript(config)` / `scriptFilename()` signatures and the `config.keys.{ai,maptiler,datawrapper}` + `config.embed.{app,flyToken}` shape match between Task 2's definition and Task 3's call site. Registry field names (`installCmd`, `bin`, `keyEnv`, `keyLabel`, `keyUrl`, `launch`) match between Task 1 and Task 2's consumption. ✓

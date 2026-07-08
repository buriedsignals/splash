# Key-free Installer + Local Configurator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-align the Atelier installer to the Buried Signals canon — a **key-free** public page + one command, then a **local `127.0.0.1` configurator** (Bun) where the journalist enters keys, verified live, written to `~/Atelier/.env` (chmod 600) — never in Downloads or shell history.

**Architecture:** Public page shows a static key-free one-liner per OS + a key-free download. The hosted `install/bootstrap.{sh,ps1}` install Bun → fetch repo → **run `bun install/configurator.ts`** (serves a local form, verifies keys live, writes `.env` + the chosen runtime) → install runtime + deps → local launcher. The configurator is Bun-native (cross-platform, incl. Windows — our edge over Mycroft's Python/POSIX-only).

**Tech Stack:** Bun (`Bun.serve`, `fetch`, `node:fs`, `Bun.spawn`), bun:test, plain ESM JS (page), Bash, PowerShell, TypeScript (configurator).

## Global Constraints

_Every task's requirements implicitly include this section._

- Runtime **Bun**; tests **bun:test**; **TDD** (failing test first). Frequent commits.
- **English** code/comments/identifiers/commit messages. **No Claude/Anthropic/AI-vendor attribution** in any artifact (commits included); no `Co-Authored-By`. (Functional `claude.ai/install.sh`, `ANTHROPIC_API_KEY`, "Claude Code" label are legitimate runtime setup.)
- **Key-free** installer: the public page and the bootstrap carry NO keys. Keys are entered only in the local configurator and written straight to `~/Atelier/.env`.
- **Verify live** = real API calls, **no mocks** (per project rule). Network tests **self-skip** when the provider key isn't in env, to stay green on a clean checkout.
- `.env` written **chmod 600** (no-op on NTFS — documented). Acquisition by **zip**, never git. **Zero code-signing**. **Native Windows kept** (the tsx render guard is inherited, untouched).
- **Zero new `any`.** `bun run check` MUST end green.
- Work in the worktree on branch `feat/installer-local-configurator` (base `main`).
- `REPO_URL`=`https://github.com/buriedsignals/atelier`, `REF`=`main` are pre-release placeholders (tracked by `preflight-release.mjs`).

---

## File Structure

**Create:**
- `docs/installer/commands.js` — pure, key-free: `bootstrapUrl(os)`, `installCommand(os)`, `launcherContents(os)`, `launcherFilename(os)`.
- `docs/installer/commands.test.ts`
- `install/package.json`, `install/tsconfig.json` — make `install/` tsc-checkable + testable (mirror `skills/atelier`).
- `install/configurator-core.ts` — pure/testable: `RUNTIMES`, `serializeEnv`, `verifyMapTiler`/`verifyDatawrapper`/`verifyAnthropic` (real API), `renderConfiguratorHtml`, `freePortHint`.
- `install/configurator-core.test.ts`
- `install/configurator.ts` — thin Bun server entry (serve `127.0.0.1`, routes, open browser, write `.env`+runtime, exit).

**Modify:**
- `install/bootstrap.sh`, `install/bootstrap.ps1` — reorder to Bun→repo→configurator→runtime+deps→launcher; drop the "write .env from caller env" + secret scrub.
- `docs/installer/index.html` — strip the key form + runtime radio; static key-free command + download + workaround; import `commands.js`.
- `docs/installer/page.test.ts` — assert key-free page.
- `docs/installer/bootstrap-sh.test.ts`, `docs/installer/bootstrap-ps1.test.ts` — assert the reordered, configurator-launching bootstrap.
- `docs/installer/README.md` — key-free + configurator flow.
- `scripts/check.mjs` — add `install` to TSC_DIRS + TEST_DIRS.

**Remove:**
- `docs/installer/generate.js`, `generate.test.ts`, `runtimes.js`, `runtimes.test.ts` (per-user baking + registry — superseded).

---

## Task 1: Key-free command generators (`commands.js`)

**Files:**
- Create: `docs/installer/commands.js`, `docs/installer/commands.test.ts`

**Interfaces (produces):**
- `bootstrapUrl(os: "mac"|"windows") -> string`
- `installCommand(os) -> string` (`curl … | bash` / `irm … | iex`, no keys)
- `launcherFilename(os) -> "atelier-setup.command"|"atelier-setup.cmd"`
- `launcherContents(os) -> string` (key-free launcher)

- [ ] **Step 1: Write the failing tests**

`docs/installer/commands.test.ts`:
```ts
import { test, expect } from "bun:test";
import { installCommand, launcherContents, launcherFilename, bootstrapUrl } from "./commands.js";

test("mac install command is a key-free curl|bash of the sh bootstrap", () => {
  const c = installCommand("mac");
  expect(c).toBe(`curl -fsSL ${bootstrapUrl("mac")} | bash`);
  expect(c).toContain("/install/bootstrap.sh");
  expect(c).not.toMatch(/ANTHROPIC|MAPTILER|DATAWRAPPER|export |\$env:/);
});

test("windows install command is a key-free irm|iex of the ps1 bootstrap", () => {
  const c = installCommand("windows");
  expect(c).toBe(`irm ${bootstrapUrl("windows")} | iex`);
  expect(c).toContain("/install/bootstrap.ps1");
});

test("launchers are key-free, self-heal on mac, never a .ps1", () => {
  const mac = launcherContents("mac");
  const win = launcherContents("windows");
  expect(launcherFilename("mac")).toBe("atelier-setup.command");
  expect(launcherFilename("windows")).toBe("atelier-setup.cmd");
  expect(mac.startsWith("#!/usr/bin/env bash")).toBe(true);
  expect(mac).toContain("xattr -d com.apple.quarantine");
  expect(mac).toContain("curl -fsSL");
  expect(win).toContain("powershell -ExecutionPolicy Bypass");
  expect(win).toContain("| iex");
  expect(mac + win).not.toMatch(/ANTHROPIC|MAPTILER|DATAWRAPPER/);
  expect(launcherFilename("windows").endsWith(".ps1")).toBe(false);
});

test("bootstrapUrl points at the hosted bootstrap per OS", () => {
  expect(bootstrapUrl("mac")).toMatch(/raw\.githubusercontent\.com\/.+\/install\/bootstrap\.sh$/);
  expect(bootstrapUrl("windows")).toMatch(/\/install\/bootstrap\.ps1$/);
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `cd docs/installer && bun test commands.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create `docs/installer/commands.js`**
```js
// Pure, KEY-FREE command generators for the public installer page. The command is identical
// for every user (no per-user baking) — keys are collected later by the local configurator.
const REPO_URL = "https://github.com/buriedsignals/atelier"; // confirm before public release
const REF = "main"; // pin to a release tag before public release
const REPO_PATH = new URL(REPO_URL).pathname.replace(/^\//, "");

export function bootstrapUrl(os) {
  const file = os === "windows" ? "bootstrap.ps1" : "bootstrap.sh";
  return `https://raw.githubusercontent.com/${REPO_PATH}/${REF}/install/${file}`;
}

export function installCommand(os) {
  const url = bootstrapUrl(os);
  return os === "windows" ? `irm ${url} | iex` : `curl -fsSL ${url} | bash`;
}

export function launcherFilename(os) {
  return os === "windows" ? "atelier-setup.cmd" : "atelier-setup.command";
}

export function launcherContents(os) {
  const url = bootstrapUrl(os);
  if (os === "windows") {
    return (
      "@echo off\r\n" +
      "rem atelier-setup.cmd — installs Atelier. No keys inside; you enter them in the configurator.\r\n" +
      `powershell -ExecutionPolicy Bypass -Command "irm ${url} | iex"\r\n` +
      "pause\r\n"
    );
  }
  return (
    "#!/usr/bin/env bash\n" +
    "# atelier-setup.command — installs Atelier. No keys inside; you enter them in the configurator.\n" +
    'chmod +x "$0" 2>/dev/null; xattr -d com.apple.quarantine "$0" 2>/dev/null || true\n' +
    `curl -fsSL ${url} | bash\n`
  );
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `cd docs/installer && bun test commands.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add docs/installer/commands.js docs/installer/commands.test.ts
git commit -m "feat(installer): key-free static install-command + launcher generators"
```

---

## Task 2: Strip the public page to key-free

**Files:**
- Modify: `docs/installer/index.html`, `docs/installer/page.test.ts`, `docs/installer/style.css` (as needed)
- Remove: `docs/installer/generate.js`, `docs/installer/generate.test.ts`, `docs/installer/runtimes.js`, `docs/installer/runtimes.test.ts`

**Interfaces:** Consumes `installCommand`/`launcherContents`/`launcherFilename` (Task 1).

- [ ] **Step 1: Update `page.test.ts` (the failing spec)**

Replace `docs/installer/page.test.ts` with:
```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "index.html"), "utf8");

test("page is key-free: no key form, no runtime radio, no baked-key generator", () => {
  expect(html).not.toContain('name="ai"');
  expect(html).not.toContain('name="maptiler"');
  expect(html).not.toContain("generateCopyPaste");
  expect(html).not.toContain("runtimes.js");
});

test("page wires the static key-free command generators", () => {
  expect(html).toContain("installCommand");
  expect(html).toContain("commands.js");
});

test("page offers both modes, an OS toggle, and mentions the local configurator", () => {
  expect(html).toContain('data-testid="mode-copypaste"');
  expect(html).toContain('data-testid="mode-download"');
  expect(html).toContain('data-testid="os-toggle"');
  expect(html.toLowerCase()).toContain("configurator");
});

test("page documents the unsigned-file workaround for both OSes", () => {
  expect(html.toLowerCase()).toContain("run anyway");
  expect(html.toLowerCase()).toContain("privacy & security");
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd docs/installer && bun test page.test.ts`
Expected: FAIL (old page still has the form).

- [ ] **Step 3: Rewrite the `<body>` of `docs/installer/index.html`**

Replace everything between `<body>` and `</body>` with:
```html
  <main>
    <h1>Install Atelier</h1>
    <p>One command sets everything up. You'll enter your keys <strong>afterward</strong>, in a
      configurator that opens on your own machine — they never touch this website or your Downloads.</p>

    <div id="os-toggle" data-testid="os-toggle" role="tablist">
      <button type="button" data-os="mac" aria-selected="true">macOS</button>
      <button type="button" data-os="windows" aria-selected="false">Windows</button>
    </div>

    <section class="mode" data-testid="mode-copypaste">
      <h2>Option A — paste one line into the terminal</h2>
      <p class="hint" id="terminalHint"></p>
      <pre><code id="command"></code></pre>
      <button type="button" id="copyBtn">Copy</button>
    </section>

    <section class="mode" data-testid="mode-download">
      <h2>Option B — download a file and open it</h2>
      <button type="button" id="downloadBtn">Download the installer</button>
      <p class="note" id="workaround"></p>
    </section>

    <p class="note">After it installs, a <strong>configurator</strong> opens in your browser to collect
      your keys (MapTiler, Datawrapper, optionally an Anthropic API key). They're verified on the spot
      and saved to <code>~/Atelier/.env</code> on your machine.</p>
  </main>

  <script type="module">
    import { installCommand, launcherContents, launcherFilename } from "./commands.js";

    const cmdEl = document.getElementById("command");
    const terminalHint = document.getElementById("terminalHint");
    const workaround = document.getElementById("workaround");
    let os = /Win/i.test(navigator.platform || navigator.userAgent) ? "windows" : "mac";

    const HINTS = {
      mac: "Open Terminal (Cmd-Space, type “Terminal”), paste, press Enter.",
      windows: "Open PowerShell (Start, type “PowerShell”), paste, press Enter.",
    };
    const WORKAROUND = {
      mac: "If macOS blocks the file: System Settings → Privacy & Security → “Open Anyway”.",
      windows: "If Windows shows “Windows protected your PC”: click More info → Run anyway.",
    };

    function render() {
      document.querySelectorAll('#os-toggle button').forEach((b) =>
        b.setAttribute("aria-selected", String(b.dataset.os === os)));
      cmdEl.textContent = installCommand(os);
      terminalHint.textContent = HINTS[os];
      workaround.textContent = WORKAROUND[os];
    }
    render();

    document.getElementById("os-toggle").addEventListener("click", (e) => {
      if (e.target.dataset.os) { os = e.target.dataset.os; render(); }
    });
    document.getElementById("copyBtn").addEventListener("click", () =>
      navigator.clipboard.writeText(cmdEl.textContent));
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const blob = new Blob([launcherContents(os)], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = launcherFilename(os);
      a.click();
      URL.revokeObjectURL(a.href);
    });
  </script>
```

- [ ] **Step 4: Remove the superseded files**
```bash
git rm docs/installer/generate.js docs/installer/generate.test.ts docs/installer/runtimes.js docs/installer/runtimes.test.ts
```

- [ ] **Step 5: Run the page test, verify PASS**

Run: `cd docs/installer && bun test page.test.ts`
Expected: PASS (4 tests). Also run `cd docs/installer && bun test` — the whole installer suite (minus the removed files) must be green.

- [ ] **Step 6: Manual browser check (controller does this — UI unit tests can't cover it)**

Serve `docs/installer` over http, open it: confirm OS auto-detected; toggling Mac/Windows swaps the one-liner between `curl…|bash` and `irm…|iex`; **Copy** copies it; **Download** yields `atelier-setup.command` (Mac) / `atelier-setup.cmd` (Windows) with NO keys; the configurator note + workaround show.

- [ ] **Step 7: Commit**
```bash
git add docs/installer/index.html docs/installer/page.test.ts docs/installer/style.css
git commit -m "feat(installer): strip the public page to a key-free single command + download"
```

---

## Task 3: `install/` as a tested unit + configurator core (pure parts)

**Files:**
- Create: `install/package.json`, `install/tsconfig.json`, `install/configurator-core.ts`, `install/configurator-core.test.ts`
- Modify: `scripts/check.mjs`

**Interfaces (produces):**
- `RUNTIMES` — `{ claude: { label, verified:true }, codex|gemini|goose: { label, verified:false } }`
- `type ConfiguratorConfig = { runtime, maptiler, datawrapper, anthropic, embedApp, flyToken }` (all `string`)
- `serializeEnv(cfg: ConfiguratorConfig): string`
- `renderConfiguratorHtml(): string`
- `freePortHint(): number` (0 — let the OS assign; kept as a named seam)
- (verify functions added in Task 4)

- [ ] **Step 1: Create `install/package.json` + `install/tsconfig.json`** (mirror `skills/atelier`)

`install/package.json`:
```json
{
  "name": "atelier-installer",
  "private": true,
  "devDependencies": {
    "@types/node": "26.1.0",
    "bun-types": "1.3.14",
    "typescript": "6.0.3"
  },
  "scripts": { "test": "bun test" }
}
```
`install/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node", "bun-types"],
    "allowImportingTsExtensions": true
  },
  "include": ["."],
  "exclude": ["*.test.ts"]
}
```
Run `cd install && bun install` (populates local types for tsc).

- [ ] **Step 2: Write the failing test**

`install/configurator-core.test.ts`:
```ts
import { test, expect } from "bun:test";
import { serializeEnv, renderConfiguratorHtml, RUNTIMES } from "./configurator-core.ts";

const base = { runtime: "claude", maptiler: "MT", datawrapper: "DW", anthropic: "", embedApp: "", flyToken: "" };

test("serializeEnv emits every service key in KEY=value form", () => {
  const env = serializeEnv(base);
  expect(env).toContain("VITE_MAPTILER_KEY=MT");
  expect(env).toContain("REMOTION_MAPTILER_KEY=MT");
  expect(env).toContain("DATAWRAPPER_API_TOKEN=DW");
});

test("serializeEnv OMITS ANTHROPIC_API_KEY when blank (subscription/OAuth path)", () => {
  expect(serializeEnv(base)).not.toContain("ANTHROPIC_API_KEY");
});

test("serializeEnv INCLUDES ANTHROPIC_API_KEY when provided (API-key path)", () => {
  expect(serializeEnv({ ...base, anthropic: "sk-ant-X" })).toContain("ANTHROPIC_API_KEY=sk-ant-X");
});

test("only Claude Code is verified; others are coming-soon", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(false);
});

test("configurator HTML has the fields + the subscription note", () => {
  const h = renderConfiguratorHtml();
  expect(h).toContain('name="maptiler"');
  expect(h).toContain('name="datawrapper"');
  expect(h).toContain('name="anthropic"');
  expect(h.toLowerCase()).toContain("subscription"); // "leave blank if you use a subscription"
});
```

- [ ] **Step 3: Run, verify FAIL**

Run: `cd install && bun test configurator-core.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 4: Create `install/configurator-core.ts` (pure parts)**
```ts
// Pure, testable core for the local configurator. No server, no fs, no network here except the
// verify* functions (Task 4), which hit real provider APIs.
export const RUNTIMES: Record<string, { label: string; verified: boolean }> = {
  claude: { label: "Claude Code", verified: true },
  codex: { label: "Codex", verified: false },
  gemini: { label: "Gemini CLI", verified: false },
  goose: { label: "Goose", verified: false },
};

export type ConfiguratorConfig = {
  runtime: string;
  maptiler: string;
  datawrapper: string;
  anthropic: string; // optional — blank means "use the runtime's own OAuth login"
  embedApp: string;
  flyToken: string;
};

// The OS assigns a free port when a server binds to 0; this named seam keeps that explicit.
export function freePortHint(): number {
  return 0;
}

// Serialize to ~/Atelier/.env lines. Keys are alphanumeric (no quoting needed); the launcher
// sources this file. ANTHROPIC_API_KEY is omitted when blank so `claude` falls back to OAuth login.
export function serializeEnv(cfg: ConfiguratorConfig): string {
  const lines: string[] = [];
  if (cfg.anthropic) lines.push(`ANTHROPIC_API_KEY=${cfg.anthropic}`);
  lines.push(`VITE_MAPTILER_KEY=${cfg.maptiler}`);
  lines.push(`REMOTION_MAPTILER_KEY=${cfg.maptiler}`);
  lines.push(`DATAWRAPPER_API_TOKEN=${cfg.datawrapper}`);
  lines.push(`ATELIER_EMBED_APP=${cfg.embedApp}`);
  lines.push(`FLY_API_TOKEN=${cfg.flyToken}`);
  return lines.join("\n") + "\n";
}

export function renderConfiguratorHtml(): string {
  const runtimeOptions = Object.entries(RUNTIMES)
    .map(([id, rt]) =>
      `<label class="rt${rt.verified ? "" : " disabled"}"><input type="radio" name="runtime" value="${id}"` +
      `${id === "claude" ? " checked" : ""}${rt.verified ? "" : " disabled"}/> ${rt.label}` +
      `${rt.verified ? "" : " <small>coming soon</small>"}</label>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>Configure Atelier</title>
<style>body{font-family:system-ui;max-width:34rem;margin:2rem auto;padding:0 1rem}
label{display:block;margin:.8rem 0}input[type=password],input[type=text]{width:100%;padding:.4rem}
.status{font-size:.85rem}.ok{color:#2e7d32}.bad{color:#c62828}button{padding:.6rem 1rem;margin-top:1rem}
.rt{display:inline-block;margin-right:1rem}small{color:#777}</style></head><body>
<h1>Configure Atelier</h1>
<p>Your keys are verified with each provider and written to <code>~/Atelier/.env</code> on this machine — nothing is sent anywhere else.</p>
<form id="cfg">
<fieldset><legend>AI runtime</legend>${runtimeOptions}</fieldset>
<label>MapTiler key <input name="maptiler" type="password" autocomplete="off"/><span class="status" data-for="maptiler"></span></label>
<label>Datawrapper token <input name="datawrapper" type="password" autocomplete="off"/><span class="status" data-for="datawrapper"></span></label>
<label>Anthropic API key <small>(leave blank if you use a Claude subscription — you'll log in on first launch)</small>
<input name="anthropic" type="password" autocomplete="off"/><span class="status" data-for="anthropic"></span></label>
<details><summary>Embed host (optional)</summary>
<label>fly.io app name <input name="embedApp" type="text" autocomplete="off"/></label>
<label>FLY_API_TOKEN <input name="flyToken" type="password" autocomplete="off"/></label></details>
<button type="button" id="verify">Verify keys</button>
<button type="submit" id="save" disabled>Save &amp; continue</button>
</form>
<script>
const f=document.getElementById('cfg');
const data=()=>Object.fromEntries(new FormData(f));
document.getElementById('verify').onclick=async()=>{
  const r=await fetch('/verify',{method:'POST',body:JSON.stringify(data())});
  const v=await r.json();
  for(const k of ['maptiler','datawrapper','anthropic']){
    const el=document.querySelector('[data-for='+k+']');
    if(v[k]===null){el.textContent='';}
    else{el.textContent=v[k]?'✓ valid':'✗ invalid';el.className='status '+(v[k]?'ok':'bad');}
  }
  document.getElementById('save').disabled=!(v.maptiler!==false&&v.datawrapper!==false&&v.anthropic!==false);
};
f.onsubmit=async(e)=>{e.preventDefault();
  await fetch('/submit',{method:'POST',body:JSON.stringify(data())});
  document.body.innerHTML='<h1>Saved ✓</h1><p>Return to your Terminal — the install continues.</p>';};
</script></body></html>`;
}
```

- [ ] **Step 5: Run, verify PASS**

Run: `cd install && bun test configurator-core.test.ts && bunx tsc --noEmit`
Expected: PASS (5 tests), tsc clean.

- [ ] **Step 6: Wire `install/` into the root gate**

In `scripts/check.mjs`: add `"install"` to `TSC_DIRS` and to `TEST_DIRS`:
```js
const TSC_DIRS = ["skills/atelier", "skills/chart-native", "skills/map-native", "skills/scrolly", "install"];
```
```js
const TEST_DIRS = [
  "skills/dw-chart", "skills/chart-native", "skills/map-native", "skills/scrolly",
  "skills/map-dw/eval", "skills/map-dw/src", "skills/suggest-chart/eval",
  "skills/suggest-article/eval", "skills/atelier", "docs/installer", "install",
];
```

- [ ] **Step 7: Run the full gate**

Run: `bun run check`
Expected: all green (now includes `tsc install` + `test install`).

- [ ] **Step 8: Commit**
```bash
git add install/package.json install/tsconfig.json install/configurator-core.ts install/configurator-core.test.ts install/bun.lock scripts/check.mjs
git commit -m "feat(installer): configurator core (env serialize, runtime registry, form html) + gate install/"
```

---

## Task 4: Live key verification (real API)

**Files:**
- Modify: `install/configurator-core.ts` (add `verifyMapTiler`/`verifyDatawrapper`/`verifyAnthropic`), `install/configurator-core.test.ts`

**Interfaces (produces):**
- `verifyMapTiler(key: string): Promise<boolean>`
- `verifyDatawrapper(token: string): Promise<boolean>`
- `verifyAnthropic(key: string): Promise<boolean>`

- [ ] **Step 1: Append failing tests (self-skip without real keys)**

Append to `install/configurator-core.test.ts`:
```ts
import { verifyMapTiler, verifyDatawrapper, verifyAnthropic } from "./configurator-core.ts";

const MT = process.env.VITE_MAPTILER_KEY;
const DW = process.env.DATAWRAPPER_API_TOKEN;
const AN = process.env.ANTHROPIC_API_KEY;

test.skipIf(!MT)("verifyMapTiler: true for the real key, false for a bad one", async () => {
  expect(await verifyMapTiler(MT!)).toBe(true);
  expect(await verifyMapTiler("not-a-real-key")).toBe(false);
});

test.skipIf(!DW)("verifyDatawrapper: true for the real token, false for a bad one", async () => {
  expect(await verifyDatawrapper(DW!)).toBe(true);
  expect(await verifyDatawrapper("not-a-real-token")).toBe(false);
});

test.skipIf(!AN)("verifyAnthropic: true for the real key, false for a bad one", async () => {
  expect(await verifyAnthropic(AN!)).toBe(true);
  expect(await verifyAnthropic("sk-ant-not-real")).toBe(false);
});
```

- [ ] **Step 2: Run, verify FAIL (or skip if no keys)**

Run: `cd install && bun test configurator-core.test.ts`
Expected: the verify tests FAIL (functions missing) if keys are present, or SKIP if not. Either way the module import fails first — confirm the import error.

- [ ] **Step 3: Implement the verify functions in `install/configurator-core.ts`**
```ts
// Live verification — real provider GETs (no token cost). true iff the credential works.
export async function verifyMapTiler(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const r = await fetch(`https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`);
    return r.ok;
  } catch { return false; }
}

export async function verifyDatawrapper(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const r = await fetch("https://api.datawrapper.de/v3/me", { headers: { Authorization: `Bearer ${token}` } });
    return r.ok;
  } catch { return false; }
}

export async function verifyAnthropic(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    return r.ok;
  } catch { return false; }
}
```

- [ ] **Step 4: Run, verify PASS (or clean skip)**

Run: `cd install && bun test configurator-core.test.ts && bunx tsc --noEmit`
Expected: PASS (verify tests pass with real keys, skip without), tsc clean.

- [ ] **Step 5: Controller live-verify** (if real keys are in the repo `.env`)

From the repo root, source `.env` and run the verify tests so they actually hit the APIs:
`set -a && . ./.env && set +a && ( cd install && bun test configurator-core.test.ts )` — confirm the verify tests run (not skip) and pass.

- [ ] **Step 6: Commit**
```bash
git add install/configurator-core.ts install/configurator-core.test.ts
git commit -m "feat(installer): live key verification against MapTiler/Datawrapper/Anthropic APIs"
```

---

## Task 5: The configurator server (`configurator.ts`)

**Files:**
- Create: `install/configurator.ts`

**Interfaces:** Consumes everything from `configurator-core.ts`. Run by the bootstrap as `bun install/configurator.ts` from within `~/Atelier` (writes `.env` + `.atelier-runtime` in cwd).

- [ ] **Step 1: Create `install/configurator.ts`**
```ts
// Thin Bun server for the local configurator. Serves the form on 127.0.0.1:<free port>, opens the
// browser, verifies keys live, writes ~/Atelier/.env (chmod 600) + the chosen runtime, then exits so
// the bootstrap continues. Run from within ~/Atelier: `bun install/configurator.ts`.
import { writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import {
  renderConfiguratorHtml, serializeEnv, verifyMapTiler, verifyDatawrapper, verifyAnthropic,
  type ConfiguratorConfig,
} from "./configurator-core.ts";

const DEST = process.cwd(); // the bootstrap runs this from ~/Atelier
const NO_OPEN = process.env.ATELIER_NO_OPEN === "1"; // testability seam

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? ["open", url]
    : process.platform === "win32" ? ["cmd", "/c", "start", "", url]
    : ["xdg-open", url];
  try { Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" }); } catch { /* headless — ignore */ }
}

async function verifyAll(c: ConfiguratorConfig) {
  return {
    maptiler: c.maptiler ? await verifyMapTiler(c.maptiler) : null,
    datawrapper: c.datawrapper ? await verifyDatawrapper(c.datawrapper) : null,
    anthropic: c.anthropic ? await verifyAnthropic(c.anthropic) : null,
  };
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(renderConfiguratorHtml(), { headers: { "content-type": "text/html" } });
    }
    if (req.method === "POST" && url.pathname === "/verify") {
      const cfg = (await req.json()) as ConfiguratorConfig;
      return Response.json(await verifyAll(cfg));
    }
    if (req.method === "POST" && url.pathname === "/submit") {
      const cfg = (await req.json()) as ConfiguratorConfig;
      const envPath = join(DEST, ".env");
      writeFileSync(envPath, serializeEnv(cfg));
      try { chmodSync(envPath, 0o600); } catch { /* NTFS — no-op */ }
      writeFileSync(join(DEST, ".atelier-runtime"), (cfg.runtime || "claude") + "\n");
      queueMicrotask(() => { server.stop(); process.exit(0); });
      return new Response("ok");
    }
    return new Response("not found", { status: 404 });
  },
});

const localUrl = `http://127.0.0.1:${server.port}/`;
console.log(`-> Configure Atelier at ${localUrl}`);
if (!NO_OPEN) openBrowser(localUrl);
```

- [ ] **Step 2: Typecheck**

Run: `cd install && bunx tsc --noEmit`
Expected: clean (0 errors, no `any`).

- [ ] **Step 3: Controller run-verify** (this task's real proof — a server can't be unit-tested meaningfully)

In a temp dir acting as `~/Atelier`, run the configurator headless and drive it with a fetch/Playwright:
```bash
mkdir -p /tmp/atelier-cfg && cd /tmp/atelier-cfg
ATELIER_NO_OPEN=1 bun <repo>/install/configurator.ts &   # note the printed 127.0.0.1:<port>
# GET / returns the form; POST /submit with a JSON body writes .env + .atelier-runtime
curl -s -X POST 127.0.0.1:<port>/submit -d '{"runtime":"claude","maptiler":"MT","datawrapper":"DW","anthropic":"","embedApp":"","flyToken":""}'
cat /tmp/atelier-cfg/.env            # → VITE_MAPTILER_KEY=MT … (no ANTHROPIC line)
cat /tmp/atelier-cfg/.atelier-runtime # → claude
stat -f "%Lp" /tmp/atelier-cfg/.env  # → 600 (macOS)
```
Confirm: the server serves the form, `/submit` writes a correct `.env` (600) + `.atelier-runtime`, and the process exits 0. Verify `/verify` with a real key if available.

- [ ] **Step 4: Commit**
```bash
git add install/configurator.ts
git commit -m "feat(installer): local 127.0.0.1 configurator server (verify, write .env 600, exit)"
```

---

## Task 6: Reorder `install/bootstrap.sh` around the configurator

**Files:**
- Modify: `install/bootstrap.sh`, `docs/installer/bootstrap-sh.test.ts`

- [ ] **Step 1: Update `docs/installer/bootstrap-sh.test.ts`**

Replace with:
```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sh = readFileSync(join(import.meta.dir, "../../install/bootstrap.sh"), "utf8");

test("bootstrap.sh is valid bash", () => {
  expect(Bun.spawnSync(["bash", "-n"], { stdin: Buffer.from(sh) }).exitCode).toBe(0);
});

test("installs Bun and Claude via their own installers, no Homebrew, no git", () => {
  expect(sh).toContain("https://bun.sh/install");
  expect(sh).toContain("https://claude.ai/install.sh");
  expect(sh).not.toContain("brew");
  expect(sh).not.toContain("git clone");
});

test("runs the local configurator and does NOT write .env from caller env vars", () => {
  expect(sh).toContain("install/configurator.ts");
  expect(sh).not.toContain("ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY"); // no baked-key .env write
  expect(sh).toContain("Configuration was not completed"); // aborts if the configurator was closed
});

test("acquires the repo by zip, installs the render engine, and makes a local launcher", () => {
  expect(sh).toContain("/archive/");
  expect(sh).toContain("playwright install chromium");
  expect(sh).toContain("Launch Atelier.command");
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: FAIL (old bootstrap still writes .env from env, no configurator).

- [ ] **Step 3: Rewrite `install/bootstrap.sh`**
```bash
#!/usr/bin/env bash
# Atelier bootstrap (macOS / Linux). Idempotent — safe to re-run. Contains NO keys and receives
# none: it installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your
# keys — they are written straight to ~/Atelier/.env, never passed on the command line.
set -euo pipefail

REPO="https://github.com/buriedsignals/atelier"   # confirm before public release (preflight-release.mjs)
REF="${ATELIER_REF:-main}"
DEST="$HOME/Atelier"
NATIVE_SKILLS=("skills/chart-native" "skills/map-native")

echo "-> Installing Atelier (a few minutes)…"

# 1. Bun (its own installer — needed to run the configurator and the skills)
if ! command -v bun >/dev/null 2>&1; then
  echo "-> Installing Bun…"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# 2. Atelier source (zip — no git; contains the configurator)
if [ ! -d "$DEST" ]; then
  echo "-> Downloading Atelier…"
  tmp="$(mktemp -d)"
  curl -fsSL "$REPO/archive/$REF.zip" -o "$tmp/atelier.zip"
  unzip -q "$tmp/atelier.zip" -d "$tmp"
  mv "$tmp"/atelier-* "$DEST"
  rm -rf "$tmp"
fi

# 3. Local configurator — pick runtime + enter keys (verified live); writes ~/Atelier/.env
echo "-> Opening the configurator in your browser to collect your keys…"
( cd "$DEST" && bun install/configurator.ts )
if [ ! -f "$DEST/.env" ]; then
  echo "Configuration was not completed — re-run this installer." >&2
  exit 1
fi

# 4. Runtime — install the one the configurator recorded (Claude Code today)
runtime="$(cat "$DEST/.atelier-runtime" 2>/dev/null || echo claude)"
if [ "$runtime" = "claude" ] && ! command -v claude >/dev/null 2>&1; then
  echo "-> Installing Claude Code…"
  curl -fsSL https://claude.ai/install.sh | bash
fi
export PATH="$HOME/.local/bin:$PATH"

# 5. Producer deps + render engine (Playwright Chromium, shared cache)
echo "-> Installing render dependencies…"
for skill in "${NATIVE_SKILLS[@]}"; do
  ( cd "$DEST/$skill" && bun install >/dev/null 2>&1 )
done
( cd "$DEST/skills/chart-native" && bunx playwright install chromium )

# 6. Local double-click launcher (created locally → no quarantine → clean re-launch)
launcher="$DEST/Launch Atelier.command"
cat > "$launcher" <<'LAUNCH'
#!/usr/bin/env bash
cd "$(dirname "$0")" && set -a && . ./.env && set +a && claude --plugin-dir .
LAUNCH
chmod +x "$launcher"

echo ""
echo "Done! Double-click 'Launch Atelier.command' in $DEST to start."
echo "(Your keys live only in $DEST/.env, chmod 600.)"
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd docs/installer && bun test bootstrap-sh.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add install/bootstrap.sh docs/installer/bootstrap-sh.test.ts
git commit -m "refactor(installer): macOS/Linux bootstrap runs the local configurator (key-free)"
```

---

## Task 7: Reorder `install/bootstrap.ps1` around the configurator

**Files:**
- Modify: `install/bootstrap.ps1`, `docs/installer/bootstrap-ps1.test.ts`

- [ ] **Step 1: Update `docs/installer/bootstrap-ps1.test.ts`**

Replace with:
```ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ps = readFileSync(join(import.meta.dir, "../../install/bootstrap.ps1"), "utf8");

test("installs Bun, Node (for Playwright), and Claude via native installers; no git", () => {
  expect(ps).toContain("bun.sh/install.ps1");
  expect(ps).toContain("OpenJS.NodeJS");
  expect(ps).toContain("https://claude.ai/install.ps1");
  expect(ps).not.toContain("git clone");
});

test("runs the local configurator and does NOT write .env from caller env vars", () => {
  expect(ps).toContain("install/configurator.ts");
  expect(ps).not.toContain("$($env:ANTHROPIC_API_KEY)"); // no baked-key .env write
  expect(ps).toContain("Configuration was not completed");
});

test("acquires the repo by zip (glob-safe) and makes a .cmd launcher (never a .ps1)", () => {
  expect(ps).toContain("Invoke-WebRequest");
  expect(ps).toMatch(/Get-ChildItem .*-Filter "atelier-\*"/);
  expect(ps).toContain("Launch Atelier.cmd");
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `cd docs/installer && bun test bootstrap-ps1.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite `install/bootstrap.ps1`**
```powershell
# Atelier bootstrap (Windows). Idempotent — safe to re-run. Contains NO keys and receives none: it
# installs the toolchain, then opens a LOCAL configurator (127.0.0.1) where you enter your keys —
# written straight to %USERPROFILE%\Atelier\.env, never passed on the command line.
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/buriedsignals/atelier"   # confirm before public release
$Ref  = if ($env:ATELIER_REF) { $env:ATELIER_REF } else { "main" }
$Dest = Join-Path $HOME "Atelier"
$NativeSkills = @("skills\chart-native", "skills\map-native")

Write-Host "-> Installing Atelier (a few minutes)…"

# 1. Bun (native Windows build — needed to run the configurator and the skills)
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Bun…"
  irm bun.sh/install.ps1 | iex
}
$env:PATH = "$HOME\.bun\bin;$env:PATH"
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun could not be installed. Install it from https://bun.sh, then re-run this installer."
}

# 2. Node.js — ONLY to drive Playwright/Remotion (they hang under Bun on Windows: Bun #15679)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Node.js…"
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required (it drives Playwright/Remotion on Windows) but could not be installed via winget. Install Node LTS from https://nodejs.org, then re-run this installer."
}

# 3. Atelier source (zip — no git; contains the configurator)
if (-not (Test-Path $Dest)) {
  Write-Host "-> Downloading Atelier…"
  $tmp = Join-Path $env:TEMP "atelier-dl"
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp "atelier.zip"
  Invoke-WebRequest "$Repo/archive/$Ref.zip" -OutFile $zip
  Expand-Archive $zip -DestinationPath $tmp -Force
  # GitHub's archive top-dir strips a leading "v" / rewrites "/" in tags — match by glob (mirror .sh).
  Move-Item (Get-ChildItem $tmp -Directory -Filter "atelier-*" | Select-Object -First 1).FullName $Dest
  Remove-Item $tmp -Recurse -Force
}

# 4. Local configurator — pick runtime + enter keys (verified live); writes .env
Write-Host "-> Opening the configurator in your browser to collect your keys…"
Push-Location $Dest
bun install/configurator.ts
Pop-Location
if (-not (Test-Path (Join-Path $Dest ".env"))) {
  throw "Configuration was not completed — re-run this installer."
}

# 5. Runtime — install the one the configurator recorded (Claude Code today)
$runtime = if (Test-Path (Join-Path $Dest ".atelier-runtime")) { (Get-Content (Join-Path $Dest ".atelier-runtime") -Raw).Trim() } else { "claude" }
if ($runtime -eq "claude" -and -not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "-> Installing Claude Code…"
  irm https://claude.ai/install.ps1 | iex
}

# 6. Producer deps + render engine
Write-Host "-> Installing render dependencies…"
foreach ($skill in $NativeSkills) {
  Push-Location (Join-Path $Dest $skill)
  bun install | Out-Null
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "bun install failed in $skill." }
  Pop-Location
}
Push-Location (Join-Path $Dest "skills\chart-native")
bunx playwright install chromium
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Playwright Chromium download failed — re-run this installer to resume." }
Pop-Location

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
```

- [ ] **Step 4: Run, verify PASS**

Run: `cd docs/installer && bun test bootstrap-ps1.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add install/bootstrap.ps1 docs/installer/bootstrap-ps1.test.ts
git commit -m "refactor(installer): Windows bootstrap runs the local configurator (key-free)"
```

---

## Task 8: README + full gate

**Files:**
- Modify: `docs/installer/README.md`

- [ ] **Step 1: Rewrite `docs/installer/README.md`**
```markdown
# Atelier installer

Static, key-free public page → one command → a **local `127.0.0.1` configurator** (Bun) where the
journalist enters keys, verified live, written to `~/Atelier/.env` (chmod 600). No backend, no keys
in the page, the command, or the Downloads folder.

## Pieces
- `index.html` / `commands.js` — the public page (a static key-free command per OS + a key-free download).
- `install/bootstrap.{sh,ps1}` — install the toolchain, then run the configurator.
- `install/configurator.{ts,-core.ts}` — the Bun local server (form, live verification, writes `.env`).

## Flow
1. Public page shows `curl …/bootstrap.sh | bash` (mac) / `irm …/bootstrap.ps1 | iex` (win), or a key-free `.command`/`.cmd`.
2. The bootstrap installs Bun, fetches Atelier (zip), then runs `bun install/configurator.ts`.
3. The configurator opens on `127.0.0.1`, the journalist enters keys (MapTiler / Datawrapper / optional
   Anthropic — blank means the Claude subscription OAuth login). Keys are verified live, then written to
   `~/Atelier/.env` (chmod 600) with the chosen runtime.
4. The bootstrap installs the runtime + deps + Playwright, and drops a local `Launch Atelier` launcher.

## Hosting
- Page: GitHub Pages serves `docs/`. Bootstraps fetched over `raw.githubusercontent.com/<repo>/<ref>/install/`.
- Before public release: confirm the repo + pin `<ref>` to a tag in `commands.js` and both bootstraps.

## Auth
Works with a Claude **subscription** (leave the Anthropic key blank → `claude` does an OAuth browser
login on first launch) OR an **API key** (enter it → verified → written to `.env`).

## Windows
Native (no WSL): Bun + Node + Claude Code install natively; the configurator is Bun (cross-platform).
`chmod 600` is a no-op on NTFS — the `.env` lives in the protected user profile.

## Release smoke test (manual, before announcing the URL)
On a clean macOS account AND a clean Windows VM, both modes:
1. Run the command / double-click the file (clear the OS warning per the on-page note).
2. Confirm Bun (+ Node on Win) install; `~/Atelier` populated from zip; the **configurator opens**.
3. Enter keys → they verify live → `.env` (600) + `.atelier-runtime` written.
4. Claude Code + deps + Playwright install; `Launch Atelier` created; double-click → Atelier starts.
5. Windows native render (chart-native + map-native) does NOT hang (tsx guard, inherited).
```

- [ ] **Step 2: Run the full gate**

Run: `bun run check`
Expected: all green (installer suite + `install/` tsc & tests included). Fix anything red before committing.

- [ ] **Step 3: Commit**
```bash
git add docs/installer/README.md
git commit -m "docs(installer): key-free + local configurator flow, hosting, smoke test"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** §2 public page → T1,T2; §3 bootstrap reorder → T6,T7; §4 architecture → all; §5 components table → T1–T5 + T3 gate wiring; §6 configurator → T3,T4,T5; §7 auth (both paths) → T3 (omit-anthropic-when-blank) + T7/T6 (claude OAuth on launch); §8 tests → every task's TDD + T5/T4 controller verify + T8 gate; §9 locked decisions → Global Constraints. No uncovered section.
- **Placeholder scan:** none — real code/commands throughout. `<repo>`/`<ref>`/`<port>` are deliberate runtime placeholders, flagged.
- **Type consistency:** `ConfiguratorConfig` fields (`runtime,maptiler,datawrapper,anthropic,embedApp,flyToken`) consistent across `serializeEnv`/`verifyAll`/the form/`configurator.ts`. `installCommand`/`launcherContents`/`launcherFilename`/`bootstrapUrl` (T1) consumed with matching shapes in T2. `verify*` signatures (T4) consumed in T5. `.env` + `.atelier-runtime` written by T5, read by T6/T7.

## Known follow-ons (out of scope, from the spec)
- fly token: no live verify v1 (deploy token). NTFS ACL for `.env` on Windows. Other runtimes (Codex/Gemini/Goose) install + configurator entry. Release MIT: `REPO_URL` + pin `REF`. The tsx Windows render guard + producers: unchanged.

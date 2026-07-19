// Pure, testable core for the local configurator. No server, no fs, no network here except the
// verify* functions (Task 4), which hit real provider APIs.
export const RUNTIMES: Record<string, { label: string; verified: boolean }> = {
  claude: { label: "Claude Code", verified: true },
  codex: { label: "Codex", verified: true },
  // Enabled by decision (2026-07-13). Layer A (skill discovery) is proven; Layer B
  // (nested-invocation orchestration) is NOT yet proven — the free Gemini tier's quota
  // blocked it, so it needs a paid tier to confirm. See docs/installer/gemini-proof.md.
  gemini: { label: "Gemini CLI", verified: true },
  // Enabled by decision (2026-07-14). Layer A (skill discovery) proven live, and Goose activated the
  // splash skill + drove the flow — but Layer B was cut off by the free Gemini quota before the
  // nested invocation completed, so the full end-to-end is not proven. See docs/installer/goose-proof.md.
  goose: { label: "Goose", verified: true },
};

export type ConfiguratorConfig = {
  runtime: string;
  maptiler: string;
  datawrapper: string;
  anthropic: string; // optional — blank means "use the runtime's own OAuth login"
  // Embed hosting (optional): the newsroom's own Cloudflare Pages project. embedProject
  // becomes the PUBLIC url <visual>.<project>.pages.dev, so it must name the newsroom.
  embedProject: string;
  cloudflareToken: string;
  cloudflareAccount: string;
};

// The OS assigns a free port when a server binds to 0; this named seam keeps that explicit.
export function freePortHint(): number {
  return 0;
}

// Serialize to ~/Splash/.env lines. Values are DOUBLE-QUOTED and trimmed so BOTH launchers
// parse them safely: the macOS/Linux launcher sources the file with `. ./.env` (POSIX word-
// splits an unquoted space) and the Windows launcher reads it with `for /f … set "%%a=%%~b"`
// (the ~ strips the surrounding quotes). Some provider credentials carry a literal space, so
// unquoted values silently broke the launcher. We also drop the two chars
// that can't legitimately appear in these credentials but would corrupt the file on either
// platform: a double-quote and a newline (newline would also inject extra env lines).
// ANTHROPIC_API_KEY is omitted when blank so `claude` falls back to OAuth login.
function envValue(raw: string): string {
  return `"${raw.trim().replace(/[\r\n"]/g, "")}"`;
}
export function serializeEnv(cfg: ConfiguratorConfig): string {
  const lines: string[] = [];
  if (cfg.anthropic.trim())
    lines.push(`ANTHROPIC_API_KEY=${envValue(cfg.anthropic)}`);
  lines.push(`VITE_MAPTILER_KEY=${envValue(cfg.maptiler)}`);
  lines.push(`REMOTION_MAPTILER_KEY=${envValue(cfg.maptiler)}`);
  lines.push(`DATAWRAPPER_API_TOKEN=${envValue(cfg.datawrapper)}`);
  lines.push(`SPLASH_EMBED_PROJECT=${envValue(cfg.embedProject)}`);
  lines.push(`CLOUDFLARE_API_TOKEN=${envValue(cfg.cloudflareToken)}`);
  lines.push(`CLOUDFLARE_ACCOUNT_ID=${envValue(cfg.cloudflareAccount)}`);
  return lines.join("\n") + "\n";
}

export function renderConfiguratorHtml(): string {
  const runtimeOptions = Object.entries(RUNTIMES)
    .map(
      ([id, rt]) =>
        `<label class="rt${rt.verified ? "" : " disabled"}"><input type="radio" name="runtime" value="${id}"` +
        `${id === "claude" ? " checked" : ""}${rt.verified ? "" : " disabled"}/> ${rt.label}` +
        `${rt.verified ? "" : " <small>coming soon</small>"}</label>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>Configure Splash</title>
<style>body{font-family:system-ui;max-width:34rem;margin:2rem auto;padding:0 1rem}
label{display:block;margin:.8rem 0}input[type=password],input[type=text]{width:100%;padding:.4rem}
.status{font-size:.85rem;display:block}.ok{color:#2e7d32}.bad{color:#c62828}.warn{color:#b26a00}button{padding:.6rem 1rem;margin-top:1rem}
.rt{display:inline-block;margin-right:1rem}small{color:#777}</style></head><body>
<h1>Configure Splash</h1>
<p>Your keys are verified with each provider and written to <code>~/Splash/.env</code> on this machine — nothing is sent anywhere else.</p>
<form id="cfg">
<fieldset><legend>AI runtime</legend>${runtimeOptions}</fieldset>
<label>MapTiler key <small>(required for maps)</small> <input name="maptiler" type="password" autocomplete="off"/><span class="status" data-for="maptiler"></span></label>
<label>Datawrapper token <small>(required for Datawrapper charts)</small> <input name="datawrapper" type="password" autocomplete="off"/><span class="status" data-for="datawrapper"></span></label>
<label>Anthropic API key <small>(leave blank if you use a Claude subscription — you'll log in on first launch)</small>
<input name="anthropic" type="password" autocomplete="off"/><span class="status" data-for="anthropic"></span></label>
<details><summary>Embed hosting — Cloudflare Pages (optional)</summary>
<p><small>Only needed to publish embeddable links. Create an <em>account</em> API token with the
<strong>Cloudflare Pages: Edit</strong> permission (Manage Account &rarr; API Tokens), and copy your
Account ID from the Workers &amp; Pages page.</small></p>
<label>Project name <small>(becomes the public URL, e.g. <code>heidi-news-splash</code>)</small>
<input name="embedProject" type="text" autocomplete="off" placeholder="your-newsroom-splash"/></label>
<label>Cloudflare Account ID <input name="cloudflareAccount" type="text" autocomplete="off"/></label>
<label>Cloudflare API token <input name="cloudflareToken" type="password" autocomplete="off"/><span class="status" data-for="cloudflare"></span></label></details>
<button type="button" id="verify">Verify keys</button>
<button type="submit" id="save" disabled>Save &amp; continue</button>
</form>
<script>
const f=document.getElementById('cfg');
const REQUIRED=['maptiler','datawrapper'];
// The verify response is keyed by provider; the Cloudflare status covers the token field.
const FIELD={cloudflare:'cloudflareToken'};
// Trim every field: a stray space/newline pasted from a dashboard would otherwise verify as
// invalid (MapTiler 403 on an encoded trailing space) or leak into .env.
const data=()=>{const o=Object.fromEntries(new FormData(f));for(const k in o)if(typeof o[k]==='string')o[k]=o[k].trim();return o;};
document.getElementById('verify').onclick=async()=>{
  const d=data();
  const r=await fetch('/verify',{method:'POST',body:JSON.stringify(d)});
  const v=await r.json();
  for(const k of ['maptiler','datawrapper','anthropic','cloudflare']){
    const el=document.querySelector('[data-for='+k+']');
    // true=valid · false=provider rejected it · null=couldn't reach the provider OR blank.
    if(v[k]===true){el.textContent='✓ valid';el.className='status ok';}
    else if(v[k]===false){el.textContent='✗ invalid';el.className='status bad';}
    else if(d[FIELD[k]||k]){el.textContent='⚠ couldn’t reach the provider — check your connection, then retry';el.className='status warn';}
    else if(REQUIRED.includes(k)){el.textContent='⚠ required — maps / Datawrapper charts won’t work without it';el.className='status warn';}
    else{el.textContent='';el.className='status';}
  }
  // Only a KNOWN-invalid key (provider rejected) blocks Save. Blank/unreachable required keys
  // are allowed but confirmed at submit — chart-native needs neither key, so we never hard-block.
  document.getElementById('save').disabled=(v.maptiler===false||v.datawrapper===false||v.anthropic===false||v.cloudflare===false);
};
f.onsubmit=async(e)=>{e.preventDefault();
  const d=data();
  if((!d.maptiler||!d.datawrapper)&&!confirm('MapTiler and/or Datawrapper key is empty. Maps and Datawrapper charts will not work until you re-run the configurator. Continue anyway?'))return;
  const r=await fetch('/submit',{method:'POST',body:JSON.stringify(d)});
  if(!r.ok){const t=await r.text().catch(()=>'');alert(t||'Some keys did not verify. Click "Verify keys", fix the red ones, then save.');return;}
  document.body.innerHTML='<h1>Saved ✓</h1><p>Return to your Terminal — the install continues.</p>';};
</script></body></html>`;
}

// Live verification — real provider GETs (no token cost). Returns `true` iff the credential
// works, `false` iff the provider actively rejected it (e.g. 401/403), and `null` when the
// provider could not be REACHED (offline, filtering proxy, corporate TLS interception). The
// null case must NOT be shown as "invalid": a valid key behind a proxy would be, and the user
// would be permanently blocked. The caller distinguishes "unreachable" from "blank".
export async function verifyMapTiler(key: string): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetch(
      `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key.trim())}`,
    );
    return r.ok;
  } catch {
    return null;
  }
}

export async function verifyDatawrapper(
  token: string,
): Promise<boolean | null> {
  if (!token.trim()) return false;
  try {
    const r = await fetch("https://api.datawrapper.de/v3/me", {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    return r.ok;
  } catch {
    return null;
  }
}

// Listing Pages projects proves BOTH that the token authenticates AND that it carries the
// "Cloudflare Pages: Edit" permission on this account. Measured trap this exists to catch: a
// token with no Pages permission verifies happily against the generic token endpoint while
// failing every Pages call with error 10000 — so verifying the token alone would green-light
// a configuration that cannot deploy a single embed.
export async function verifyCloudflare(
  token: string,
  accountId: string,
): Promise<boolean | null> {
  if (!token.trim() || !accountId.trim()) return false;
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId.trim())}/pages/projects`,
      { headers: { Authorization: `Bearer ${token.trim()}` } },
    );
    if (!r.ok) return false;
    const body = (await r.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return null;
  }
}

export async function verifyAnthropic(key: string): Promise<boolean | null> {
  if (!key.trim()) return false;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key.trim(), "anthropic-version": "2023-06-01" },
    });
    return r.ok;
  } catch {
    return null;
  }
}

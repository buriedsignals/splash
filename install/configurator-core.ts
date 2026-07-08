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
    .map(
      ([id, rt]) =>
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

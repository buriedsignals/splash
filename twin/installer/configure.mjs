#!/usr/bin/env bun
// THE CONFIGURATOR — a local page on 127.0.0.1, and the reason it is a page and not a prompt.
//
// Copied deliberately from Spotlight's installer, whose own rationale is worth repeating verbatim
// because it is the whole point: *"Keys never appear in the shell command line, in shell history,
// or on any hosted page."* A journalist pasting a MapTiler key into a terminal has put it in
// `~/.zsh_history`; pasting it into a chat has put it in a transcript. A form on the loopback
// interface, served by a process that exits when it is done, is the only shape that avoids both.
//
// THREE PROPERTIES IT INHERITS FROM THAT DESIGN, each load-bearing:
//
//   1. **The port is ephemeral (port 0) and the host is 127.0.0.1.** Nothing is reachable from the
//      network, and no fixed port can be squatted. The URL is printed for the installer to open.
//   2. **Keys are VERIFIED BEFORE they are written.** `POST /verify` runs the same real probes
//      preflight runs — a live MapTiler style request, a Datawrapper `/v3/me` with the bearer
//      token. A key that answers 403 is reported as rejected instead of being written and
//      discovered nine phases later. A present key is not a working key.
//   3. **The payload cannot name an arbitrary environment variable.** Every key goes through
//      `recordKey`, which refuses any name outside the canonical set. The form is data arriving
//      over a socket; it is not trusted to decide what gets written where.
//
// It also times out. A journalist who closes the tab does not leave an install hanging for ever.
//
// `--headless` skips opening a browser, which is what makes this testable without one: the same
// endpoints are driven by POSTing to the printed URL.

import { createServer } from "node:http";
import { chmod, writeFile, readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const HEADLESS = argv.includes("--headless");
const ROOT = resolve(flag("--root", resolve(HERE, "..")));
const IDLE_MS = Number(flag("--idle-ms", String(30 * 60 * 1000)));

const { recordKey, probeMapTiler, probeDatawrapper, probeCloudflare } = await import(
  join(ROOT, "skills", "splash-twin", "scripts", "keys.mjs")
);
const { parseNewsroom, validateNewsroom } = await import(
  join(ROOT, "skills", "splash-twin", "scripts", "newsroom.mjs")
);

// The keys the form may write. Derived from what the toolchain reads, and every one of them is a
// name `recordKey` already accepts — so a field added here that `recordKey` does not know throws
// at the moment it is written rather than writing a variable nothing reads.
const KEY_FIELDS = [
  {
    name: "MAPTILER_KEY",
    label: "MapTiler key",
    opens: "every map beat",
    where: "maptiler.com/cloud → Account → Keys (the free tier is enough)",
  },
  {
    name: "MAPTILER_DELIVERY_KEY",
    label: "MapTiler delivery key (optional)",
    opens: "the key embedded in a delivered map page",
    where:
      "a SECOND MapTiler key, restricted to your own domain. A delivered web map carries its key in the file, so this one should not be the key above. An account's default key cannot be restricted, so create a dedicated one.",
  },
  {
    name: "DATAWRAPPER_TOKEN",
    label: "Datawrapper token (optional)",
    opens: "the delegated Datawrapper path",
    where: "app.datawrapper.de/account/api-tokens",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    label: "Cloudflare account id (optional)",
    opens: "the hosted embed delivery form",
    where: "dash.cloudflare.com",
  },
  {
    name: "CLOUDFLARE_API_TOKEN",
    label: "Cloudflare API token (optional)",
    opens: "the hosted embed delivery form",
    where: "a token with Pages:Edit",
  },
];

const NEWSROOM_FIELDS = [
  { name: "name", label: "Newsroom name", placeholder: "Heidi.news" },
  { name: "url", label: "Website", placeholder: "https://www.heidi.news" },
  { name: "language", label: "Editorial language", placeholder: "fr" },
  { name: "brandColor", label: "House accent colour", placeholder: "#0B7A75", type: "color" },
  { name: "ground", label: "House background", placeholder: "#FFFFFF", type: "color" },
  { name: "typefaces", label: "House typefaces", placeholder: "Source Serif, Source Sans" },
  { name: "credit", label: "Credit convention (optional)", placeholder: "Source : {source} · Heidi.news" },
];

function page() {
  const keyRows = KEY_FIELDS.map(
    (f) => `<label><span>${f.label}</span>
      <input name="${f.name}" type="password" autocomplete="off" spellcheck="false">
      <em>Opens ${f.opens}. ${f.where}</em></label>`,
  ).join("");
  const newsroomRows = NEWSROOM_FIELDS.map(
    (f) => `<label><span>${f.label}</span>
      <input name="${f.name}" type="${f.type === "color" ? "text" : "text"}" placeholder="${f.placeholder}" spellcheck="false">
    </label>`,
  ).join("");
  return `<!doctype html><meta charset="utf-8"><title>Set up Splash</title>
<style>
 body{font:16px/1.5 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1.25rem;color:#111}
 h1{font-size:1.6rem;margin:0 0 .25rem} h2{font-size:1.1rem;margin:2.5rem 0 .5rem}
 p.lede{color:#555;margin:0 0 1rem}
 label{display:block;margin:1rem 0} label span{display:block;font-weight:600;margin-bottom:.25rem}
 input{width:100%;padding:.5rem .6rem;border:1px solid #bbb;border-radius:6px;font:inherit}
 em{display:block;color:#666;font-size:.85rem;font-style:normal;margin-top:.25rem}
 button{margin-top:1.5rem;padding:.6rem 1.1rem;font:inherit;border-radius:6px;border:1px solid #0B7A75;background:#0B7A75;color:#fff;cursor:pointer}
 #out{margin-top:1.5rem;white-space:pre-wrap;font:14px ui-monospace,monospace;background:#f6f6f6;padding:1rem;border-radius:6px}
 .note{background:#fffbe6;border:1px solid #e8d98a;padding:.75rem 1rem;border-radius:6px;font-size:.9rem}
</style>
<h1>Set up Splash</h1>
<p class="lede">This page is served by the installer on your own machine, at 127.0.0.1. Nothing you
type here is sent anywhere except to the services you are giving a key for, and nothing lands in
your shell history.</p>
<form id="f">
  <h2>The newsroom</h2>
  <p class="lede">This becomes <code>NEWSROOM.md</code>. Leave it all blank if you would rather have
  Splash derive it by measuring your own website, or decline it later — both are recorded answers.</p>
  ${newsroomRows}
  <h2>Keys</h2>
  <p class="lede">Each key opens one capability. A missing key never blocks Splash; it narrows what
  it will offer. They are checked against the real service before anything is written.</p>
  ${keyRows}
  <button type="submit">Check and save</button>
</form>
<div id="out" hidden></div>
<script>
const out = document.getElementById("out");
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  out.hidden = false; out.textContent = "Checking…";
  const body = Object.fromEntries(new FormData(e.target).entries());
  const r = await fetch("/verify", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(body)});
  const v = await r.json();
  out.textContent = v.lines.join("\\n");
  if (v.rejected.length) { out.textContent += "\\n\\nNothing was written. Fix the rejected keys, or clear them and continue without."; return; }
  const s = await fetch("/submit", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(body)});
  const w = await s.json();
  out.textContent += "\\n\\n" + w.lines.join("\\n");
  if (w.ok) out.textContent += "\\n\\nYou can close this tab — the installer is carrying on.";
});
</script>`;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function verify(payload) {
  const lines = [];
  const rejected = [];
  for (const field of KEY_FIELDS) {
    const value = (payload[field.name] ?? "").trim();
    if (!value) {
      lines.push(`${field.name}: not given — ${field.opens} stays closed, which is a recorded answer, not a failure.`);
      continue;
    }
    let result;
    if (field.name === "MAPTILER_KEY") result = await probeMapTiler(value, fetch);
    else if (field.name === "DATAWRAPPER_TOKEN") result = await probeDatawrapper(value, fetch);
    else if (field.name === "CLOUDFLARE_API_TOKEN")
      result = await probeCloudflare((payload.CLOUDFLARE_ACCOUNT_ID ?? "").trim(), value, fetch);
    else if (field.name === "MAPTILER_DELIVERY_KEY") {
      // Deliberately NOT probed. MapTiler enforces an origin restriction server-side against the
      // request's own Origin, and a delivery key should be origin-restricted — so probing it from
      // here would report a correct key as broken. Recorded on trust and said so.
      lines.push(`${field.name}: accepted without a check — an origin-restricted key cannot be probed from this machine.`);
      continue;
    } else continue; // CLOUDFLARE_ACCOUNT_ID is checked together with its token
    lines.push(`${field.name}: ${result.ok ? "accepted" : "REJECTED"} — ${result.detail}`);
    if (!result.ok) rejected.push(field.name);
  }
  return { lines, rejected };
}

async function submit(payload) {
  const lines = [];

  for (const field of KEY_FIELDS) {
    const value = (payload[field.name] ?? "").trim();
    if (!value) continue;
    await recordKey({ root: ROOT, name: field.name, value });
    lines.push(`wrote ${field.name} into ${join(ROOT, ".env")}`);
  }
  try {
    await chmod(join(ROOT, ".env"), 0o600);
    lines.push("set .env to 0600");
  } catch {
    /* no .env written — no keys were given */
  }

  const given = NEWSROOM_FIELDS.filter((f) => (payload[f.name] ?? "").trim() !== "");
  if (given.length === 0) {
    lines.push(
      "no newsroom profile given — preflight will report `newsroom-profile: missing`, which is the prompt to derive one with twin-newsroom-charter or to record a decline.",
    );
    return { ok: true, lines };
  }

  const front = given.map((f) => `${f.name}: ${JSON.stringify(payload[f.name].trim())}`).join("\n");
  const text = `---\n${front}\n---\n\nWritten by the Splash installer from the answers given on the local setup page.\n`;
  // Validated with the SAME reader preflight uses, before it is written. A profile that would fail
  // preflight must fail here, where the journalist is still looking at the form.
  const errors = validateNewsroom(parseNewsroom(text));
  if (errors.length > 0) return { ok: false, lines: [...lines, `NEWSROOM.md not written — ${errors.join("; ")}`] };
  await writeFile(join(ROOT, "NEWSROOM.md"), text);
  lines.push(`wrote ${join(ROOT, "NEWSROOM.md")}`);
  return { ok: true, lines };
}

let idle;
const server = createServer(async (req, res) => {
  clearTimeout(idle);
  idle = setTimeout(() => server.close(() => process.exit(0)), IDLE_MS);
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page());
      return;
    }
    if (req.method === "POST" && req.url === "/verify") {
      const result = await verify(await readJson(req));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }
    if (req.method === "POST" && req.url === "/submit") {
      const result = await submit(await readJson(req));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
      if (result.ok) setTimeout(() => server.close(() => process.exit(0)), 1500);
      return;
    }
    res.writeHead(404).end("not found");
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, lines: [String(error.message)] }));
  }
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  console.log(`SPLASH_CONFIGURE_URL=http://127.0.0.1:${port}/`);
  if (!HEADLESS) Bun.spawn(["open", `http://127.0.0.1:${port}/`]);
  idle = setTimeout(() => server.close(() => process.exit(0)), IDLE_MS);
});

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
//
// THREE THINGS THE PAGE DOES BESIDES COLLECTING KEYS, each answering the same complaint — that the
// page asked the journalist for things it could have measured, and stayed silent about things it
// had already decided for them:
//
//   A. **It offers the derivation.** `twin-newsroom-charter` reads a newsroom's own site and
//      proposes the charter with the declaration each value was read from. The page used to merely
//      NAME that skill in a sentence; now `POST /derive` runs it, and the proposal arrives WITH its
//      evidence so the journalist confirms or corrects rather than accepting a black box. The
//      skill's own rule is honoured exactly: it proposes, it never writes. `/derive` writes nothing
//      whatsoever — `NEWSROOM.md` is still only written by `/submit`, from the form.
//
//   B. **It reports the doors instead of asking about them.** Two doors cover all five hosts and no
//      key differs per host, so there is correctly no question to ask — but a page that then says
//      nothing leaves a journalist unable to tell a wired install from an unwired one. The report
//      is read from `place-skills.mjs` itself (which hosts, which doors, what the placement would
//      do), never from a second list kept here, and it is asked in DRY-RUN: this page reports the
//      doors, `place-skills.mjs` places them.
//
//   C. **It collects the CMS credential.** `twin-deliver` builds We.Publish and Livingdocs mutation
//      shapes and sends neither, and there was nowhere for an endpoint or a token to live. Now
//      there is, through the same `recordKey` path at `0600`. It is NOT probed and the field says
//      so in its own help text: every other key here is verified against its real service first,
//      and a CMS credential cannot meet that standard while no instance of either CMS exists
//      anywhere in this project.

import { createServer } from "node:http";
import { chmod, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DOORS, HOSTS, detectHosts, planPlacement } from "./place-skills.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const HEADLESS = argv.includes("--headless");
const ROOT = resolve(flag("--root", resolve(HERE, "..")));
const HOME = resolve(flag("--home", homedir()));
const IDLE_MS = Number(flag("--idle-ms", String(30 * 60 * 1000)));

const { recordKey, probeMapTiler, probeDatawrapper, probeCloudflare } = await import(
  join(ROOT, "skills", "splash-twin", "scripts", "keys.mjs")
);
const { parseNewsroom, validateNewsroom } = await import(
  join(ROOT, "skills", "splash-twin", "scripts", "newsroom.mjs")
);
// The CMS kinds the delivery form actually knows how to build a mutation for — read from the file
// that builds them, so the page can never offer a third kind nothing downstream can honour.
const { CMS_KINDS, buildInsertion } = await import(join(ROOT, "skills", "twin-deliver", "scripts", "cms-insert.mjs"));

/**
 * What each offered CMS would actually be sent, ASKED OF THE BUILDER rather than described from
 * memory: `buildInsertion` is run once per kind against a fixture article, and the mutation name
 * and shape it returns are what the page shows. A hand-written sentence here would be a second,
 * drifting account of a mechanic that already has a first one — and this is the page where a
 * confident-sounding sentence about an unproven integration does the most damage.
 */
function cmsShapes() {
  const shapes = {};
  for (const kind of CMS_KINDS) {
    try {
      const built = buildInsertion({
        kind,
        articleId: "example",
        previousBody: "<p>the article as it stands</p>",
        insertionHtml: "<figure>the visual</figure>",
      });
      shapes[kind] = { mutation: built.mutation, shape: built.shape, unproven: built.unproven === true };
    } catch (error) {
      shapes[kind] = { mutation: null, shape: null, unproven: true, error: error.message };
    }
  }
  return shapes;
}

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

// The newsroom's own CMS. Same `recordKey` path, same 0600 file, same canonical-name refusal — and
// deliberately NOT the same verification, because there is none to be had (see keys.mjs). Every
// line of help text below has to keep that distinction visible: this buys a home for the
// credential, not a proven integration.
const CMS_FIELDS = [
  {
    name: "CMS_KIND",
    label: "Your CMS (optional)",
    input: "choice",
    choices: CMS_KINDS,
    help: "Only these two have a mutation shape built for them, so only these two are offered.",
  },
  {
    name: "CMS_ENDPOINT",
    label: "CMS API endpoint (optional)",
    input: "url",
    help: "The GraphQL/API URL of your own instance, e.g. https://cms.example.org/api. http or https only.",
  },
  {
    name: "CMS_TOKEN",
    label: "CMS API token (optional)",
    input: "secret",
    help:
      "NOT CHECKED, and that is the honest difference from every other key on this page. The keys above are probed against their real service before they are written; no We.Publish or Livingdocs instance exists anywhere in this project, so there is nothing to probe this against. Recording it gives the credential a home at 0600 — it does not make the CMS-insertion delivery form send anything. That form still writes a file describing the mutation, exactly as it did before.",
  },
];

// One scheme test, used by the two places a URL arrives over the socket: the site to measure, and
// the CMS endpoint. `http`/`https` only, and the refusal is not decorative — Bun's `fetch` reads
// `file://` URLs (measured on this machine: `fetch("file:///tmp/x.html")` answers 200 with the
// file's contents), so an unchecked scheme would turn "read my newsroom's site" into "read any file
// this process can reach".
function httpUrl(raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return { ok: false, reason: "no address given" };
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return { ok: false, reason: `${JSON.stringify(text)} is not a full address — write it as https://www.example.org` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `${parsed.protocol}// is not a scheme this page will fetch — http and https only`,
    };
  }
  return { ok: true, url: parsed.href };
}

// The form asks for the PLURAL of the two fields a newsroom rarely has only one of. `languages`
// (rather than `language`) because a newsroom publishes in one language or several — ruling R4 has
// the language of a visual follow the ARTICLE and be confirmed with the journalist, and with one
// recorded language that confirmation had nothing to check against. `accents` (beside, never
// instead of, `brandColor`) because a house palette is rarely one colour: `brandColor` stays the
// primary, and twin-palette scores every recorded accent against the ground, so a longer list is
// not a way past the contrast floor. A `NEWSROOM.md` written before either field existed stays
// valid and means exactly what it always meant — `newsroomLanguages`/`newsroomAccents` read both
// shapes.
const NEWSROOM_FIELDS = [
  { name: "name", label: "Newsroom name", placeholder: "Heidi.news" },
  { name: "url", label: "Website", placeholder: "https://www.heidi.news" },
  { name: "languages", label: "Editorial languages", placeholder: "fr, de, it" },
  { name: "brandColor", label: "House accent colour", placeholder: "#0B7A75", type: "color" },
  {
    name: "accents",
    label: "Further house accents (optional)",
    placeholder: "#C1440E, #1F6FB2",
    type: "color",
  },
  { name: "ground", label: "House background", placeholder: "#FFFFFF", type: "color" },
  { name: "typefaces", label: "House typefaces", placeholder: "Source Serif, Source Sans" },
  { name: "credit", label: "Credit convention (optional)", placeholder: "Source : {source} · Heidi.news" },
];

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const tilde = (path) => path.replace(HOME, "~");

// What each dry-run status means to somebody reading the page, in words about THEIR install rather
// than about the placement algorithm. `refused` deliberately has no entry: its own reason is
// carried on the result and is always more specific than anything that could be written here.
const DOOR_STATUS = {
  ok: "already wired",
  linked: "wired",
  created: "created",
  "would-link": "not wired yet — the installer wires this at step 5",
  "would-relink": "points somewhere else — the installer repoints it at step 5",
  "would-create": "this directory does not exist yet — the installer creates it at step 5",
};

/**
 * The doors, reported. Everything here is read from `place-skills.mjs` — the hosts, the doors, and
 * the plan — and the plan is asked for in DRY RUN, so rendering this page never creates, removes or
 * repoints a single link.
 */
function doorsSection() {
  const detected = detectHosts({ home: HOME });
  let plan;
  try {
    plan = planPlacement({ root: ROOT, home: HOME, dryRun: true });
  } catch (error) {
    return `<h2>The doors your AI hosts read</h2>
      <p class="note">The placement could not be read: ${esc(error.message)}</p>`;
  }

  const hostRows = detected
    .map((host) => {
      const doors = host.doorIds.map((id) => tilde(DOORS.find((d) => d.id === id).dir(HOME))).join("<br>");
      const evidence = host.detected
        ? `found <code>${esc(tilde(host.evidence[0]))}</code>`
        : `no trace of it (looked for ${host.looked.map((p) => `<code>${esc(tilde(p))}</code>`).join(", ")})`;
      return `<tr><td>${esc(host.name)}</td><td>${evidence}</td><td><code>${doors}</code></td></tr>`;
    })
    .join("");

  const doorRows = DOORS.map((door) => {
    const rows = plan.results.filter((r) => r.doorId === door.id);
    // A refusal is ALWAYS shown one line per link, with its own reason — that is the whole point of
    // reporting the doors. Everything else is grouped by status once there is more than a handful,
    // because fifteen identical lines saying "not wired yet" bury the one line that is not.
    const refused = rows.filter((r) => r.status === "refused");
    const rest = rows.filter((r) => r.status !== "refused");
    const grouped = [];
    for (const status of [...new Set(rest.map((r) => r.status))]) {
      const same = rest.filter((r) => r.status === status);
      grouped.push(
        same.length > 3
          ? `<tr><td><code>${esc(tilde(same[0].where))}</code> and ${same.length - 1} more</td><td>${esc(
              DOOR_STATUS[status] ?? status,
            )}</td></tr>`
          : same
              .map((r) => `<tr><td><code>${esc(tilde(r.where))}</code></td><td>${esc(DOOR_STATUS[status] ?? status)}</td></tr>`)
              .join(""),
      );
    }
    const body =
      refused
        .map((r) => `<tr><td><code>${esc(tilde(r.where))}</code></td><td><strong>refused</strong> — ${esc(r.detail)}</td></tr>`)
        .join("") + grouped.join("");
    return `<h3><code>${esc(tilde(door.dir(HOME)))}</code> — ${esc(door.name)}</h3>
      <p class="lede">${esc(door.why)}${
        refused.length > 0 ? " <strong>Nothing was placed here, and the reason is below.</strong>" : ""
      }</p>
      <table>${body || "<tr><td colspan=2>nothing to place</td></tr>"}</table>`;
  }).join("");

  const refusedCount = plan.results.filter((r) => r.status === "refused").length;
  return `<h2>The doors your AI hosts read</h2>
<p class="lede">There is no question here, and that is deliberate: the same two doors cover all five
hosts, no key differs between them, so the installer wires both unconditionally. What follows is
what it found and what it will do — read from <code>installer/place-skills.mjs</code>, the script
that actually does the placing. <strong>This page places nothing</strong>; it asked that script for
its plan without letting it touch anything.</p>
<table><tr><th>Host</th><th>On this machine</th><th>Door it reads</th></tr>${hostRows}</table>
<p class="lede">A host is spotted by the configuration directory it creates, which is evidence and
not proof — a directory left behind by an uninstall reads exactly the same.</p>
${doorRows}
${
  refusedCount > 0
    ? `<p class="note">${refusedCount} placement(s) refused. A refusal is never worked around: nothing that
       is not our own symlink is ever removed, and a skills directory that is itself a symlink belongs
       to whatever manages it.</p>`
    : ""
}
<p class="lede">${plan.ids.length} skills in <code>${esc(tilde(ROOT))}</code>.</p>`;
}

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
  const cmsRows = CMS_FIELDS.map((f) => {
    const control =
      f.input === "choice"
        ? `<select name="${f.name}"><option value="">— not now —</option>${f.choices
            .map((k) => `<option value="${esc(k)}">${esc(k)}</option>`)
            .join("")}</select>`
        : `<input name="${f.name}" type="${f.input === "secret" ? "password" : "text"}" autocomplete="off" spellcheck="false">`;
    return `<label><span>${esc(f.label)}</span>${control}<em>${esc(f.help)}</em></label>`;
  }).join("");
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
 h3{font-size:.95rem;margin:1.5rem 0 .25rem;font-weight:600}
 table{border-collapse:collapse;width:100%;font-size:.85rem;margin:.5rem 0}
 th,td{text-align:left;vertical-align:top;padding:.3rem .5rem;border-bottom:1px solid #e5e5e5}
 code{font:12.5px ui-monospace,monospace;word-break:break-all}
 select{width:100%;padding:.5rem .6rem;border:1px solid #bbb;border-radius:6px;font:inherit;background:#fff}
 fieldset{border:1px solid #ddd;border-radius:6px;padding:.25rem 1rem 1rem;margin:1rem 0}
 legend{font-weight:600;font-size:.9rem;padding:0 .35rem}
 button.secondary{margin-top:.5rem;background:#fff;color:#0B7A75}
 #derived table td:first-child{white-space:nowrap;font-weight:600}
</style>
<h1>Set up Splash</h1>
<p class="lede">This page is served by the installer on your own machine, at 127.0.0.1. Nothing you
type here is sent anywhere except to the services you are giving a key for, and nothing lands in
your shell history.</p>
<form id="f">
  <h2>The newsroom</h2>
  <p class="lede">This becomes <code>NEWSROOM.md</code>. Leave it all blank if you would rather
  decline it later — a recorded decline is an answer too.</p>
  <fieldset>
    <legend>Or let Splash read your own site</legend>
    <p class="lede">Splash can read your newsroom's homepage and a handful of its stylesheets, and
    propose <em>name, language, accent colour, ground and typefaces</em> from what they
    <strong>declare</strong> — each value shown beside the declaration it came from, so you confirm
    or correct it instead of trusting a black box. Anything the site does not declare comes back as
    a question, never as a plausible default. Your credit convention is editorial and is never
    derived. <strong>It proposes; it never writes.</strong> The proposal only fills the fields above
    — nothing reaches disk until you press <em>Check and save</em>.</p>
    <label><span>Your newsroom's address</span>
      <input id="deriveUrl" type="text" placeholder="https://www.heidi.news" spellcheck="false">
      <em>Read over the network from this machine, to the site you name here and nowhere else.</em>
    </label>
    <button type="button" class="secondary" id="deriveBtn">Read this site</button>
    <div id="derived" hidden></div>
  </fieldset>
  ${newsroomRows}
  <h2>Keys</h2>
  <p class="lede">Each key opens one capability. A missing key never blocks Splash; it narrows what
  it will offer. They are checked against the real service before anything is written.</p>
  ${keyRows}
  <h2>Your CMS</h2>
  <p class="lede">Choose your CMS — the list is short because it names only the two Splash can
  actually build an insertion for, and an "other" that silently did nothing would be worse than a
  short honest list. Unlike every key above, <strong>none of this is checked against anything</strong>:
  no We.Publish or Livingdocs instance exists in this project to check it against. Give all three
  or none.</p>
  ${cmsRows}
  <div id="cmsShape" class="note" hidden></div>
  <button type="submit">Check and save</button>
</form>
${doorsSection()}
<div id="out" hidden></div>
<script>
const out = document.getElementById("out");
const form = document.getElementById("f");
const derived = document.getElementById("derived");

// The page applies the proposal; it does not decide it. Which values are proposals and which are
// questions is settled on the server, where it is covered by a test — this only puts a confirmed
// value into an empty field and never overwrites something the journalist typed themselves.
document.getElementById("deriveBtn").addEventListener("click", async () => {
  const url = document.getElementById("deriveUrl").value;
  derived.hidden = false;
  derived.innerHTML = "<p>Reading " + escapeHtml(url) + "…</p>";
  let v;
  try {
    const r = await fetch("/derive", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({url})});
    v = await r.json();
  } catch (error) {
    derived.innerHTML = "<p class='note'>Could not reach the setup page's own server: " + escapeHtml(String(error)) + "</p>";
    return;
  }
  if (!v.ok) {
    derived.innerHTML = "<p class='note'><strong>Nothing was measured, so nothing is proposed.</strong> "
      + escapeHtml(v.message) + "</p><p>Fill the fields in yourself:</p><ul>"
      + (v.askInstead || []).map((q) => "<li>" + escapeHtml(q) + "</li>").join("") + "</ul>";
    return;
  }
  let html = "<p><strong>Proposed, not written.</strong> Read from " + escapeHtml(v.url) + ".</p>"
    + "<table><tr><th>Field</th><th>Value</th><th>Read from</th><th></th></tr>";
  for (const row of v.applied) {
    const input = form.elements[row.field];
    let what;
    if (!input) what = "no field for this";
    else if (input.value.trim() === "") { input.value = row.value; what = "filled in above"; }
    else if (input.value.trim() === row.value) what = "matches what you typed";
    else what = "you typed " + escapeHtml(input.value.trim()) + " — kept";
    html += "<tr><td>" + escapeHtml(row.label) + "</td><td>" + escapeHtml(row.value) + "</td><td>"
      + escapeHtml(row.source) + "<br><code>" + escapeHtml(row.evidence) + "</code></td><td>" + what + "</td></tr>";
  }
  html += "</table>";
  if (v.questions.length) {
    html += "<p class='note'><strong>" + v.questions.length + " field(s) your site does not declare.</strong> "
      + "They are left empty on purpose — a made-up house colour wearing the authority of a measurement "
      + "is the one thing this must never do.</p><ul>"
      + v.questions.map((q) => "<li>" + escapeHtml(q.question) + "</li>").join("") + "</ul>";
  }
  for (const note of v.notes || []) html += "<p class='lede'>" + escapeHtml(note) + "</p>";
  if (v.stylesheetsRead.length) html += "<p class='lede'>Stylesheets read: " + v.stylesheetsRead.map(escapeHtml).join(", ") + "</p>";
  if (v.stylesheetsFailed.length) html += "<p class='lede'>Could not be read: "
    + v.stylesheetsFailed.map((s) => escapeHtml(s.href + " (" + s.error + ")")).join(", ") + "</p>";
  derived.innerHTML = html;
});

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// The CMS choice is the journalist's, and what follows it adapts — with the mutation each kind
// would be sent, read off the builder itself rather than described here.
const CMS_SHAPES = ${JSON.stringify(cmsShapes())};
const cmsShape = document.getElementById("cmsShape");
form.elements.CMS_KIND.addEventListener("change", (e) => {
  const chosen = CMS_SHAPES[e.target.value];
  if (!chosen) { cmsShape.hidden = true; return; }
  cmsShape.hidden = false;
  cmsShape.innerHTML = "<strong>" + escapeHtml(e.target.value) + "</strong> — Splash would build the <code>"
    + escapeHtml(chosen.mutation) + "</code> mutation, shape <code>" + escapeHtml(chosen.shape) + "</code>."
    + (chosen.shape === "total-replace"
        ? " That mutation replaces the WHOLE article body, so Splash has to read the article first and carry every byte of it forward; the guard that refuses a partial article is built and tested."
        : " That mutation adds one component and never touches the rest of the article.")
    + (chosen.unproven
        ? " <strong>It has never been sent to a real instance from this project</strong>, and recording a credential here does not change that: the delivery form still writes a file describing the mutation."
        : "");
});

form.addEventListener("submit", async (e) => {
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

// Which charter field feeds which form field. `deriveCharter` returns exactly these five, and the
// question a missing one becomes is built from the form's OWN label rather than from a second list
// of wordings kept here — so a relabelled field cannot start asking about something else.
const DERIVED_FIELDS = ["name", "languages", "brandColor", "accents", "ground", "typefaces"];
// Everything except `accents`: a newsroom with one house colour is not missing an answer, so a
// failed derivation must not hand the journalist a question they have no reason to answer.
const ALWAYS_ASKED = DERIVED_FIELDS.filter((field) => field !== "accents");
const labelOf = (field) => NEWSROOM_FIELDS.find((f) => f.name === field)?.label ?? field;
// Two contexts, one wording, because they are two different facts: a site that DECLARES nothing for
// a field, and a site that could not be read at all. The second is explained by the message beside
// it, so the question itself stays a plain ask.
const askFor = (field) => `Give your ${labelOf(field).replace(/ \(optional\)$/, "").toLowerCase()}.`;
const questionFor = (field) => `Your site does not declare it — ${askFor(field).replace(/^Give/, "give")}`;

/**
 * Run `twin-newsroom-charter` against a site the journalist named, and hand back a proposal with
 * its evidence. It WRITES NOTHING — that is the skill's own rule 2 and this is its caller, so the
 * rule has to hold here too; `/submit` remains the only path to disk.
 *
 * A failure comes back as a readable message plus the questions to ask instead, never as a hang and
 * never as an empty success: `deriveCharter` bounds every fetch on its own timer (8s per document,
 * at most 4 stylesheets, the skill's own defaults) and returns `{ok:false, error, askInstead}` for a
 * site that cannot be read at all.
 */
async function derive(payload) {
  const checked = httpUrl(payload.url);
  if (!checked.ok) {
    return {
      ok: false,
      message: `${checked.reason}. Nothing was fetched.`,
      askInstead: ALWAYS_ASKED.map(askFor),
    };
  }

  let proposal;
  try {
    // Loaded HERE rather than at startup, deliberately: a root missing this skill should cost the
    // journalist the derivation and a readable line saying so, not the whole setup page — the form
    // is what writes, and it must stay usable whatever the network or the tree does.
    const { deriveCharter } = await import(join(ROOT, "skills", "twin-newsroom-charter", "scripts", "derive-charter.mjs"));
    proposal = await deriveCharter({ url: checked.url, fetchFn: fetch });
  } catch (error) {
    // `deriveCharter` documents that it never throws. If that ever stops being true — or if the
    // skill is not in this root at all — the page says so and stays usable, rather than turning a
    // 500 into a spinner that never resolves.
    return {
      ok: false,
      message: `reading ${checked.url} failed unexpectedly: ${error.message}`,
      askInstead: ALWAYS_ASKED.map(askFor),
    };
  }

  if (!proposal.ok) {
    return {
      ok: false,
      message: `${checked.url} could not be read (${proposal.error}).`,
      askInstead: ALWAYS_ASKED.map(askFor),
    };
  }

  const applied = DERIVED_FIELDS.filter((field) => proposal.fields[field]).map((field) => ({
    field,
    label: labelOf(field),
    value: proposal.fields[field].value,
    source: proposal.fields[field].source,
    evidence: proposal.fields[field].evidence,
  }));
  // The unresolved list is the skill's own — a field it looked for and did not find. It becomes a
  // question and stays empty; it never becomes a default.
  const questions = proposal.unresolved
    .filter((field) => DERIVED_FIELDS.includes(field))
    .map((field) => ({ field, label: labelOf(field), question: questionFor(field) }));

  // The outcome that is neither a value nor a question: a site declaring ONE accent colour has one
  // accent colour. Named out loud so it cannot be mistaken for something the derivation forgot.
  const notes = (proposal.nothingFurther ?? []).includes("accents")
    ? ["This site declares one accent colour and no others — an answer, not a gap. Add more only if your newsroom actually has them."]
    : [];

  return {
    ok: true,
    url: checked.url,
    notes,
    // The address itself is a measured fact — it is what was read — so it is proposed like the rest.
    applied: [{ field: "url", label: labelOf("url"), value: checked.url, source: "the address you gave", evidence: checked.url }, ...applied],
    questions,
    stylesheetsRead: proposal.stylesheetsRead,
    stylesheetsFailed: proposal.stylesheetsFailed,
  };
}

/**
 * The CMS credential, checked for SHAPE and never for truth — and the difference is said out loud
 * on every line, because the rest of this page sets a standard (probed against the real service
 * before it is written) that this one cannot meet: there is no instance of either CMS anywhere in
 * this project to probe. All three or none: a token with no endpoint is a credential that can never
 * be used and a half-answer nobody would find again.
 */
function verifyCms(payload) {
  const lines = [];
  const rejected = [];
  const values = Object.fromEntries(CMS_FIELDS.map((f) => [f.name, (payload[f.name] ?? "").trim()]));
  const given = CMS_FIELDS.filter((f) => values[f.name] !== "");

  if (given.length === 0) {
    lines.push(
      "CMS: not given — the CMS-insertion delivery form still writes a file describing the mutation, which is all it has ever done.",
    );
    return { lines, rejected };
  }
  if (given.length < CMS_FIELDS.length) {
    const missing = CMS_FIELDS.filter((f) => values[f.name] === "").map((f) => f.name);
    lines.push(`CMS: REJECTED — give all three or none; missing ${missing.join(", ")}.`);
    rejected.push(...missing);
    return { lines, rejected };
  }

  if (!CMS_KINDS.includes(values.CMS_KIND)) {
    lines.push(`CMS_KIND: REJECTED — ${JSON.stringify(values.CMS_KIND)} is not a CMS this toolchain can build a mutation for (known: ${CMS_KINDS.join(", ")}).`);
    rejected.push("CMS_KIND");
  }
  const endpoint = httpUrl(values.CMS_ENDPOINT);
  if (!endpoint.ok) {
    lines.push(`CMS_ENDPOINT: REJECTED — ${endpoint.reason}.`);
    rejected.push("CMS_ENDPOINT");
  }
  if (rejected.length === 0) {
    lines.push(
      `CMS: recorded WITHOUT any check — ${values.CMS_KIND} at ${endpoint.url}. Nothing was contacted: no We.Publish or Livingdocs instance exists in this project to contact, so unlike every key above this one cannot be verified before it is written. It gives the credential a home; it is not a proven integration, and the CMS-insertion form still writes a file describing the mutation rather than sending it.`,
    );
  }
  return { lines, rejected };
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
  const cms = verifyCms(payload);
  return { lines: [...lines, ...cms.lines], rejected: [...rejected, ...cms.rejected] };
}

async function submit(payload) {
  const lines = [];

  // The CMS shape is re-checked HERE, not only in `/verify`. `/verify` is a courtesy to the person
  // reading the page; this is a POST endpoint on a socket, and property 3 of this file's own header
  // is that the payload does not get to decide what is written. `recordKey` refuses an unknown
  // NAME; only this refuses a VALUE the toolchain could never honour — a CMS kind `buildInsertion`
  // would throw on, or an endpoint nothing can call.
  const cms = verifyCms(payload);
  if (cms.rejected.length > 0) return { ok: false, lines: cms.lines };

  for (const field of [...KEY_FIELDS, ...CMS_FIELDS]) {
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
    if (req.method === "POST" && req.url === "/derive") {
      const result = await derive(await readJson(req));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
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

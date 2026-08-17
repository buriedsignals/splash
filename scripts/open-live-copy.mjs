// OPEN A COMMITTED MAP THE WAY A READER WILL SEE IT.
//
// THE PROBLEM THIS EXISTS FOR, stated because it costs an hour every time somebody meets it fresh:
// **a committed map artifact is deliberately not the thing to judge the live map by.** R1b keeps the
// key out of the repository, so every tracked page carries the placeholder `__MAPTILER_KEY__`;
// `live-map.mjs` and `live-scroll-map.mjs` both refuse to boot on a placeholder (`planIsUnkeyed`),
// which is right — a proof artifact must not spend a newsroom's tile quota — and it means opening
// `proof/…/render/*.html` straight from the checkout shows the BAKED FALLBACK, with no `<canvas>`
// in the DOM. That is the correct behaviour and it looks exactly like the defect the owner reported.
//
// So this writes keyed copies OUTSIDE the repository, which is the same discipline every live probe
// in this tree already keeps (`verify-live-map.mjs`, each beat's `verify-live-tiles.mjs`): the key
// never lands anywhere `git` can see, so the live view cannot defeat the key guard
// (`splash/test/no-key-in-the-repository.test.ts`).
//
// It also SERVES them, because `file://` is not good enough: MapLibre fetches its style and tiles
// over the network, and a `file://` origin is opaque to CORS, so the map silently stays on the
// fallback and the page looks broken in exactly the way it is not.
//
// This is what `deliver` does for real, on the beat the journalist chose
// (`substituteKeys`, reading `MAPTILER_KEY`). This script is the LOOK-AT-IT path, not the delivery
// path, and deliberately reads that same credential so the two cannot disagree.
//
// Usage:
//   bun scripts/open-live-copy.mjs                    every tracked page that requests MapTiler
//   bun scripts/open-live-copy.mjs proof/mapmore-scrolly-danube
//   bun scripts/open-live-copy.mjs --out /tmp/x --port 8765

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TWIN = join(HERE, "..");
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const outDir = resolve(flag("--out", "/tmp/splash-live"));
const port = Number(flag("--port", 8765));
const filters = process.argv.slice(2).filter((a) => !a.startsWith("--") && !/^\d+$/.test(a) && !a.startsWith("/"));

/** The MapTiler API key, from the one legacy environment home this helper supports. */
function readKey() {
  const env = join(TWIN, ".env");
  if (!existsSync(env)) throw new Error(`no .env at ${env} — this needs a real MapTiler key`);
  const lines = readFileSync(env, "utf8").split(/\r?\n/);
  const name = "MAPTILER_KEY";
  const line = lines.find((value) => value.startsWith(`${name}=`));
  if (line) return { name, value: line.slice(name.length + 1).trim() };
  throw new Error(`no MAPTILER_KEY in ${env}`);
}

function trackedHtml() {
  return execFileSync("git", ["ls-files", "-z", "--", "."], { cwd: TWIN, encoding: "utf8" })
    .split("\0")
    .filter((rel) => rel.endsWith(".html"));
}

const key = readKey();
const pages = trackedHtml().filter(
  (rel) =>
    readFileSync(join(TWIN, rel), "utf8").includes("api.maptiler.com") &&
    (filters.length === 0 || filters.some((f) => rel.startsWith(f.replace(/\/$/, "")))),
);
if (pages.length === 0) throw new Error(`no tracked page requests MapTiler${filters.length ? ` under ${filters.join(", ")}` : ""}`);

mkdirSync(outDir, { recursive: true });
const written = [];
for (const rel of pages) {
  // The copy is named after its BEAT, not after its file: three beats ship a `render/*.html` and
  // two of them would otherwise land on each other in one directory.
  const beat = rel.split("/")[1];
  const name = `${beat}.html`;
  const html = readFileSync(join(TWIN, rel), "utf8");
  if (!html.includes(PLACEHOLDER))
    throw new Error(`${rel} requests MapTiler but carries no placeholder — refusing to touch it`);
  writeFileSync(join(outDir, name), html.replaceAll(PLACEHOLDER, key.value));
  written.push({ name, rel });
}

const MIME = { ".html": "text/html; charset=utf-8" };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "");
  if (rel === "") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      `<meta charset="utf-8"><h1>Live copies</h1><ul>` +
        written.map((w) => `<li><a href="/${w.name}">${w.name}</a> <small>${w.rel}</small></li>`).join("") +
        `</ul>`,
    );
    return;
  }
  const path = join(outDir, rel);
  if (!path.startsWith(outDir) || !existsSync(path)) return void res.writeHead(404).end("no");
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `${written.length} keyed cop${written.length === 1 ? "y" : "ies"} in ${outDir}, keyed from ${key.name}:\n` +
      written.map((w) => `  ${w.name}  ←  ${w.rel}`).join("\n") +
      `\n\nOpen  http://127.0.0.1:${port}/  (Ctrl-C to stop)\n` +
      `Nothing here is inside the repository, and the tracked files still carry the placeholder.`,
  );
});

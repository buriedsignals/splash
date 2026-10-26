// The half every MAP VIDEO zone kit shares — the map counterpart of video.mjs, kept inside the choropleth kit (the
// other map video kits carry a byte-identical copy). A map video is the map-beat skill's live-map path: the proof's
// map plan mounted on a real MapLibre map inside the Remotion composition, driven per frame, every tile fetched
// through a LOCAL PROXY that holds the MapTiler key in this process and never lets it reach the page, the props, the
// argv, a log or a file (skills/map-beat/SKILL.md, "The live-map video path").
//
// What video.mjs's `renderBeatVideo` cannot do for a map, and this file does instead:
//   - the words outside the map are placed in Bun from a MEASUREMENT of the real map at each fixed camera (the
//     proof's measure.mjs → measured.json). A story's plan is its own, so the kit measures it at render time and
//     keeps the measurement beside the beat (measured.json), reused while the plan's digest is unchanged;
//   - the composition reaches MapTiler only through the proxy, so the proxy must answer WHILE Remotion runs:
//     every spawn here is `Bun.spawn` (async) — `spawnSync` blocks the event loop the proxy serves on and the
//     render page hangs (skills/map-beat/scripts/render-video-map.mjs, "WHY Bun.spawn");
//   - `--gl=swangle` on every still and render (the live-map renderer's mandated rasteriser);
//   - the composition is bundled ONCE and every look still and the mp4 render from that bundle.
// The props file Remotion reads carries the plan pointed at the proxy's origin (no key); it lives in a temp folder
// and is removed. renders/<label>-props.json is the audit copy: the plan with its placeholder, no faces' bytes.
//
// A refusal anywhere throws; the kit's `refusing` (video.mjs) leaves renders/ empty.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertDeliveredSize, readPngSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { splashEnvPath, splashRoot } from "#shared/design-base/splash-root.mjs";

/** A Remotion process that runs longer than this is killed and the beat refused. */
export const MAP_RENDER_TIMEOUT_MS = 8 * 60_000;

const KEY_NAMES = ["MAPTILER_KEY", "MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** The map-beat skill's own scripts, wherever the root put the skill. */
export const mapBeat = (here, ...parts) => skillScriptFrom(here, "map-beat", "scripts", ...parts);

/** The MapTiler key: the process environment first, then the root's private .env. Never printed, never written. */
export function mapTilerKey(here) {
  for (const name of KEY_NAMES) if (process.env[name]) return process.env[name];
  const path = splashEnvPath(here);
  if (existsSync(path))
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
      if (m && KEY_NAMES.includes(m[1])) return m[2];
    }
  throw new Error(
    "a map video draws the live MapTiler map, so the render needs MAPTILER_KEY in the environment (this is not something beat.mjs can fix)",
  );
}

/** The environment a child process gets: this one without any MapTiler key (Remotion forwards REMOTION_* to the page). */
function keylessEnv() {
  const env = { ...process.env };
  for (const name of KEY_NAMES) delete env[name];
  return env;
}

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

/**
 * The real map measured at each fixed camera of this beat — the proof's measure.mjs for ONE direction, written to
 * `<here>/measured.json` in the proof's shape (`{ [size]: { size, planDigest: { [label]: sha }, states, cameras:
 * { [label]: … } } }`), so the proof's build.mjs reads it unchanged. Reused while the plan's digest and the size hold:
 * a re-render with the same data, words and direction measures nothing.
 *
 * @param states  { [camera]: mapStateAt(…) } — the picture each camera's words are seen over (the proof's MEASURED_FRAMES)
 * @param seats   { [key]: [lon, lat] } — every seat the overlay is placed from
 */
export async function measureMap({ here, label, plan, states, seats, size, key }) {
  const path = join(here, "measured.json");
  const digest = planDigestOf(plan);
  const all = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const row = all[size.name];
  const seatsDigest = planDigestOf(seats);
  if (row?.planDigest?.[label] === digest && row?.seatsDigest?.[label] === seatsDigest && row.size?.width === size.width && row.size?.height === size.height) {
    console.log(`measured.json is current for ${label} at ${size.name} (plan unchanged)`);
    return all;
  }
  const { measureLiveMap } = await import(mapBeat(here, "measure-live-map.mjs"));
  const { DEFAULT_CACHE_DIR } = await import(mapBeat(here, "maptiler-proxy.mjs"));
  const started = Date.now();
  const cameras = await measureLiveMap({ plan, states, seats, size: { width: size.width, height: size.height }, mapTilerKey: key, cacheDir: DEFAULT_CACHE_DIR, tints: plan.tints });
  for (const [name, m] of Object.entries(cameras)) if (!m.tilesLoaded) throw new Error(`the live map's ${name} camera was still loading a tile when it was measured — render again`);
  const out = { size: { width: size.width, height: size.height }, planDigest: { [label]: digest }, seatsDigest: { [label]: seatsDigest }, states, cameras: { [label]: cameras } };
  const next = { ...all, [size.name]: out };
  writeFileSync(path, JSON.stringify(next) + "\n");
  console.log(`measured the live map at ${Object.keys(states).length} camera(s) (${Math.round((Date.now() - started) / 1000)}s)`);
  return next;
}

const escapeXml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The words a map video draws, as SVG (video.mjs's renders/<label>-frames.svg, for review, delivery's alt and the
 * headline score): the title card (eyebrow, title — the root's aria-label) and the credit, then the words the MAP
 * itself prints (its symbol layers' texts: names, seas), then the overlay frame's markup at each event's end. `Frame`
 * must draw without a live map (`liveMap: () => null`). Only words are taken from the plan — never its URLs, so the
 * key placeholder (and a fortiori the key) is never in it.
 */
export function mapWordsDrawn(Frame, props) {
  const card = props.titleCard ?? {};
  const title = (card.title ?? []).map((l) => l.text).join(" ");
  const credit = props.credit ?? props.source ?? {};
  const mapWords = (props.mapPlan?.layers ?? [])
    .filter((l) => l.type === "symbol" && l.data?.features)
    .flatMap((l) => l.data.features.map((f) => f.properties?.text))
    .filter((t) => typeof t === "string" && t.trim());
  const lines = [card.eyebrow?.text, ...(card.title ?? []).map((l) => l.text), ...(credit.lines ?? []).map((l) => l.text), ...mapWords].filter(Boolean);
  const head = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}">${lines.map((t) => `<text>${escapeXml(t)}</text>`).join("")}</svg>`;
  const frames = EVENT_ORDER.map((event) => renderToStaticMarkup(createElement(Frame, { ...props, at: Math.min(endOf(props.timing[event]), props.timing.total) - 1 })));
  return [head, ...frames].join("\n");
}

async function spawnRemotion(root, args, what) {
  const started = Date.now();
  const proc = Bun.spawn([join(root, "node_modules", ".bin", "remotion"), ...args], { cwd: root, env: keylessEnv(), stdout: "pipe", stderr: "pipe" });
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    proc.kill("SIGKILL");
  }, MAP_RENDER_TIMEOUT_MS);
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const status = await proc.exited;
  clearTimeout(timer);
  const seconds = Math.round((Date.now() - started) / 1000);
  if (killed) throw new Error(`remotion ${what} ran past ${MAP_RENDER_TIMEOUT_MS / 60000} minutes and was stopped`);
  if (status !== 0) {
    const tail = `${out}${err}`.trim().split("\n").slice(-12).join("\n");
    throw new Error(`remotion ${what} exited with ${status}:\n${tail}`);
  }
  return seconds;
}

function mp4Size(path) {
  const probe = Bun.spawnSync(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path]);
  if (probe.exitCode !== 0) throw new Error(`ffprobe could not read ${path}: ${probe.stderr.toString().trim()}`);
  const [{ width, height }] = JSON.parse(probe.stdout.toString()).streams;
  return { width, height };
}

/**
 * Bundles the composition once, starts the key proxy, renders the look stills, prints `look at:`, then the mp4 —
 * one direction, concurrency 1, `--gl=swangle`, an empty `--env-file` on every spawn and no key in the child's env.
 *
 * @param props       what build.mjs returned as props (`mapPlan` with the key placeholder)
 * @param lookFrames  [{ name, frame }] — the proof's `--look` list; the frame named `final` is printed as `look at:`
 * @param Frame       the overlay frame, drawable in Bun without a map: renders/<label>-frames.svg (`mapWordsDrawn`)
 */
export async function renderMapVideo({ here, label, composition, size, props, wanted, lookFrames, lookOnly = false, key, Frame }) {
  const root = splashRoot(here);
  const { writeRenderProps } = await import(mapBeat(here, "video-faces.mjs"));
  const { assertMapTilerKey, DEFAULT_CACHE_DIR, startMapTilerProxy } = await import(mapBeat(here, "maptiler-proxy.mjs"));
  const { throughProxy } = await import(mapBeat(here, "measure-live-map.mjs"));
  const out = join(here, "renders");
  const look = join(here, "look");
  mkdirSync(look, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), "zone-map-video-"));
  await assertMapTilerKey(key, { onNote: (n) => console.log(n) });
  const proxy = startMapTilerProxy({ key, cacheDir: DEFAULT_CACHE_DIR });
  let propsPath;
  try {
    const audit = join(scratch, `${label}-props.json`);
    propsPath = await writeRenderProps({ props: { ...props, mapPlanProxied: throughProxy(props.mapPlan, proxy.origin) }, wanted, auditPath: join(scratch, "proxied-audit.json") });
    // The audit copy is the props as built — the plan with its placeholder, no proxy origin, no faces' bytes.
    const auditOnly = await writeRenderProps({ props, wanted, auditPath: audit });
    rmSync(dirname(auditOnly), { recursive: true, force: true });
    // AN EMPTY --env-file ON EVERY remotion SPAWN: the root's .env holds keys the composition must never see.
    const envFile = join(scratch, "empty.env");
    writeFileSync(envFile, "");
    const bundle = join(scratch, "bundle");
    const bundled = await spawnRemotion(root, ["bundle", relative(root, join(here, "index.ts")), `--out-dir=${bundle}`, `--env-file=${envFile}`], "bundle");
    console.log(`bundled the composition (${bundled}s)`);

    const startedLook = Date.now();
    const stills = [];
    for (const { name, frame } of lookFrames) {
      const png = join(look, `${label}-${String(frame).padStart(3, "0")}-${name}.png`);
      await spawnRemotion(root, ["still", bundle, composition, png, `--frame=${frame}`, `--props=${propsPath}`, "--gl=swangle", "--timeout=180000", `--env-file=${envFile}`], `still at frame ${frame}`);
      stills.push({ name, frame, png });
    }
    const final = stills.find((s) => s.name === "final") ?? stills.at(-1);
    assertDeliveredSize(readPngSize(readFileSync(final.png)), size.name, { what: final.png });
    console.log(`look stills (${stills.length}, ${Math.round((Date.now() - startedLook) / 1000)}s):`);
    for (const s of stills) console.log(`  frame ${String(s.frame).padStart(3)}  ${s.name.padEnd(20)} ${s.png}`);
    console.log(`look at: ${final.png}`);
    if (lookOnly) {
      console.log("--look-only: no mp4 rendered, renders/ left empty");
      return;
    }

    mkdirSync(out, { recursive: true });
    const movie = join(out, `${label}.mp4`);
    const seconds = await spawnRemotion(root, ["render", bundle, composition, movie, `--props=${propsPath}`, "--gl=swangle", "--concurrency=1", "--timeout=180000", `--env-file=${envFile}`], "render");
    assertDeliveredSize(mp4Size(movie), size.name, { what: `renders/${label}.mp4` });
    copyFileSync(final.png, join(out, `${label}-final-frame.png`));
    renameSync(audit, join(out, `${label}-props.json`));
    if (Frame) writeFileSync(join(out, `${label}-frames.svg`), mapWordsDrawn(Frame, props));
    const counts = Object.entries(proxy.counts).map(([k, v]) => `${k}: ${v}`).join(", ");
    console.log(`rendered renders/${label}.mp4 (${seconds}s, ${props.timing.total} frames at ${props.timing.fps} fps, concurrency 1) · proxy ${counts}`);
    console.log(`look at the mp4's own frames, not only the stills: ffmpeg -v error -i ${movie} -vf "select=eq(n\\,<frame>)" -frames:v 1 <png>`);
  } finally {
    proxy.stop();
    rmSync(scratch, { recursive: true, force: true });
    // writeRenderProps puts the props WITH the faces' bytes (and here the proxied plan) in a temporary folder of its own.
    if (propsPath) rmSync(dirname(propsPath), { recursive: true, force: true });
  }
}

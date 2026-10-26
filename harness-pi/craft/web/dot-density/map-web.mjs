// The half every WEB MAP zone kit shares — the map counterpart of _shared/web.mjs, kept inside the
// choropleth kit (the other map kits carry a byte-identical copy) until it moves to _shared/.
//
// A live map × web page is two layers (skills/map-web/SKILL.md, ruling R1): a LIVE MapTiler map the
// reader moves through, over a FROZEN FALLBACK image that stands with no script, no key or no
// network. The fallback is photographed from the page's OWN live map, never a second rendering. The
// delivered page carries the `__MAPTILER_KEY__` placeholder; a KEYED copy is written to
// shots/<label>.local.html (never into renders/, which is what delivery reads) and that copy is the
// page the verification drives, because the placeholder page's live layer cannot boot.
//
// What chart-web's verify-web cannot measure on a live map, and what this file does instead:
//   - its per-mark pointer test walks SVG marks; a live map's marks are MapLibre layers, so it finds
//     0/0 — `probeLiveMarks` below finds a pixel inside every mark with `queryRenderedFeatures`,
//     moves a real pointer there, and holds the tooltip to that mark's own reading;
//   - with script off no live layer mounts, so a control that repaints the MAP cannot repaint the
//     fallback — that is the format's stated degradation, not a defect.
// Those verify-web failures are WAIVED by exact name (LIVE_MAP_WAIVERS + the kit's own list), each
// waiver printed with its reason; any other failure refuses the page.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { resolveChrome } from "#shared/design-base/chrome.mjs";
import { splashEnvPath } from "#shared/design-base/splash-root.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { mapLibreSource } from "#shared/map-beat/maplibre-source.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { DESKTOP_SHOT, chartWeb } from "./web.mjs";

/** The map-web skill's own scripts and assets, wherever the root put the skill. */
export const mapWeb = (here, ...parts) => skillScriptFrom(here, "map-web", ...parts);

/** Assembled in two halves so this file never carries the placeholder delivery substitutes. */
export const PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** The window the fallback is photographed at (the proofs' review window, at 2x). */
export const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
/** The box the DRAFT page (the one photographed) is rendered at, as the proofs do. */
export const DRAFT_BOX = { width: 1464, height: 520 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const KEY_NAMES = ["MAPTILER_KEY", "MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** The MapTiler key: the process environment first, then the root's private .env. Never printed. */
export function maptilerKey(here) {
  for (const name of KEY_NAMES) if (process.env[name]) return process.env[name];
  const path = splashEnvPath(here);
  if (existsSync(path))
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
      if (m && KEY_NAMES.includes(m[1])) return m[2];
    }
  throw new Error(
    "a web map is a live MapTiler map, and its frozen fallback is photographed from that live map, so the render needs MAPTILER_KEY in the environment (this is not something beat.mjs can fix)",
  );
}

/** MapLibre (inlined into the page, one third-party host only) and the map-web style sweep as a
 *  classic-script source (its `export` keywords stripped: a page script cannot import). */
export function liveAssets(here) {
  const { js, css } = mapLibreSource();
  const styleModule = readFileSync(mapWeb(here, "assets", "style.mjs"), "utf8").replace(/^export /gm, "");
  return { maplibreJs: js, maplibreCss: css, styleModule };
}

/**
 * The basemap plate for this direction, baked once by the kit's bake.mjs into plate/<label>/ and
 * reused while it was painted in the same tints, at the same frame, and `current(facts)` holds.
 * Returns the bake's geometry.json (frame, frameCorners, bounds, style, zoom, degreesPerPixel).
 */
export function ensurePlate({ here, label, water, land, frame, args = [], current = () => true }) {
  const dir = join(here, "plate", label);
  const facts = () => JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
  if (plateWasPaintedWith(dir, { water, land })) {
    const was = facts();
    if (was.frame?.width === frame[0] && was.frame?.height === frame[1] && current(was)) return was;
  }
  console.log(`baking the ${label} plate (MapTiler, ${frame.join("x")}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(here, "bake.mjs"), "--size", frame.join("x"), "--water", water, "--land", land, "--out", dir, ...args],
    { cwd: here, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${label} (is MAPTILER_KEY in the environment?)`);
  const baked = facts();
  if (!baked.frameCorners || !(baked.frame?.width > 0)) throw new Error("the plate carries no camera facts: re-bake it");
  return baked;
}

/** Waits until the live map has drawn every tile of its current view. */
const settled = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const map = window.__mwMap;
        if (map.loaded() && map.areTilesLoaded()) return resolve();
        map.once("idle", resolve);
      }),
  );

/**
 * Photographs the `.map-layer` box of a keyed copy of `pagePath` once its live map is drawn — once,
 * or once per VIEW (`views: [{ slug, input }]`: the radio `#<input>` is checked before each shot, as
 * a reader would). `atView(page, slug)` runs before each shot and may throw (a measured refusal).
 * `hide` lists selectors kept out of the picture: MapLibre's zoom buttons (inert in an image — the
 * locator proof's rule) and any HTML the page draws OVER the map in every state (a size legend), which
 * a photograph would otherwise print a second time, offset, wherever the box's shape differs.
 */
async function photographLiveMap({ pagePath, files, key, window, views, atView, hide }) {
  const dir = mkdtempSync(join(tmpdir(), "mw-fallback-"));
  const keyed = join(dir, "draft.local.html");
  writeFileSync(keyed, readFileSync(pagePath, "utf8").split(PLACEHOLDER).join(key));
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: window.width, height: window.height, deviceScaleFactor: window.scale });
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), { timeout: 120000 });
    if (hide.length) await page.addStyleTag({ content: `${hide.join(", ")} { visibility: hidden !important; }` });
    await settled(page);
    let box = null;
    let mime = "image/webp";
    for (const view of views ?? [null]) {
      if (view?.input) {
        await page.evaluate((id) => {
          const input = document.getElementById(id);
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, view.input);
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              const map = window.__mwMap;
              const done = () => (map.loaded() && map.areTilesLoaded() ? resolve() : map.once("idle", resolve));
              map.once("moveend", done);
              setTimeout(done, 2000);
            }),
        );
        await new Promise((r) => setTimeout(r, 800));
      } else await new Promise((r) => setTimeout(r, 600));
      if (atView) await atView(page, view?.slug ?? null);
      const element = await page.$(".map-layer");
      if (!element) throw new Error("the page carries no live map box to photograph");
      const shot = await element.boundingBox();
      box = { width: Math.round(shot.width), height: Math.round(shot.height) };
      const outFile = files[view?.slug ?? ""];
      mkdirSync(join(outFile, ".."), { recursive: true });
      const png = `${outFile}.png`;
      await element.screenshot({ path: png });
      // webp at q92 when cwebp is installed (a page that inlines MapLibre stays near 1.5 MB); the
      // lossless PNG otherwise — heavier, the same picture.
      const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
      if (encode.status !== 0) {
        cpSync(png, outFile);
        mime = "image/png";
      }
      rmSync(png, { force: true });
    }
    return { ...box, mime };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The two-layer page: a draft rendered over a blank fallback, its live map photographed (cached in
 * fallback/<label>[-<view>].img + <label>.sha, re-photographed when the live plan changes), the page
 * rendered again over that picture, and a keyed copy written to shots/<label>.local.html.
 *
 * @param pageOf  async (plates, box) => { outPath } — the kit's renderWeb call. `plates` is one data
 *                URI, or with `views` an array of { slug, href }.
 * @param stamp   anything that decides the fallback (the live plan) — hashed with the window
 * @param views   optional [{ slug, input }]: one picture per state of a control that moves the camera
 */
export async function renderLiveMapPage({ here, label, key, stamp, pageOf, views = null, atView = null, hide = [".maplibregl-ctrl-group"] }) {
  const dir = join(here, "fallback");
  const files = Object.fromEntries((views ?? [{ slug: "" }]).map((v) => [v.slug, join(dir, `${label}${v.slug ? `-${v.slug}` : ""}.img`)]));
  const stampFile = join(dir, `${label}.sha`);
  const hash = createHash("sha256").update(JSON.stringify(stamp)).update(JSON.stringify(FALLBACK_WINDOW)).update(JSON.stringify(hide)).digest("hex").slice(0, 16);
  let record = null;
  if (Object.values(files).every((f) => existsSync(f)) && existsSync(stampFile)) {
    try {
      const kept = JSON.parse(readFileSync(stampFile, "utf8"));
      if (kept.stamp === hash) record = kept;
    } catch {
      record = null;
    }
  }
  const platesOf = (href) => (views ? views.map((v) => ({ slug: v.slug, href: href(v.slug) })) : href(""));
  if (!record) {
    const { outPath: draft } = await pageOf(platesOf(() => BLANK_PNG), DRAFT_BOX);
    console.log(`photographing the ${label} live map for the no-script fallback${views ? ` (${views.length} views)` : ""}…`);
    const shot = await photographLiveMap({ pagePath: draft, files, key, window: FALLBACK_WINDOW, views, atView, hide });
    record = { stamp: hash, ...shot };
    writeFileSync(stampFile, `${JSON.stringify(record)}\n`);
  }
  const { outPath } = await pageOf(platesOf((slug) => `data:${record.mime};base64,${readFileSync(files[slug]).toString("base64")}`), record);
  const html = readFileSync(outPath, "utf8");
  if (!html.includes(PLACEHOLDER)) throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
  const shots = join(here, "shots");
  mkdirSync(shots, { recursive: true });
  const keyedPath = join(shots, `${label}.local.html`);
  writeFileSync(keyedPath, html.split(PLACEHOLDER).join(key));
  return { outPath, keyedPath };
}

/** verify-web failures that are what a live map IS rather than what is wrong with it. */
export const LIVE_MAP_WAIVERS = [
  {
    test: /^\s*FAIL laptop-wide \(no JS\): this beat's marks are a live layer, and the layer is up\b/,
    why: "with script off no live layer mounts; the frozen fallback stands, by design (R1)",
  },
  {
    test: /^\s*FAIL laptop-wide \(no JS\): chart-[a-z]+: (choosing "[^"]+" repaints the drawing|every value of this parameter paints its own picture)\b/,
    why: "with script off the map cannot repaint (no stylesheet reaches a MapLibre layer); the CSS half of the control still answers",
  },
  {
    test: /^\s*FAIL interaction: the page's own handler really showed a detail string\s+— 0\/\d+ /,
    why: "a live map answers through MapLibre's queryRenderedFeatures, not chart-web's [data-detail] focus handler — the live-mark probe below holds every mark's answer instead",
  },
  {
    test: /^\s*FAIL [a-z-]+: every reading answers a real pointer on its own mark\s+— 0\/0\s*$/,
    why: "vacuous on a live map (no SVG marks to walk) — replaced by the live-mark probe below",
  },
];

/**
 * Finds one pixel inside every feature of `layers` (keyed by `keyProp`) on the keyed page's live map,
 * moves a real pointer there and holds `#tooltip` to `expected[key]`. Leaves
 * shots/map-hover-1600x800.png pointed at `subject`.
 */
export async function probeLiveMarks({ keyedPath, shots, layers, keyProp, expected, subject, anchors = {}, order = null, step = 3 }) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 1 });
    await page.goto(`file://${keyedPath}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), { timeout: 120000 });
    await settled(page);
    await new Promise((r) => setTimeout(r, 400));
    const reps = await page.evaluate(
      ({ layers, keyProp, step, anchors, order }) => {
        const map = window.__mwMap;
        const canvas = map.getCanvas();
        const r = canvas.getBoundingClientRect();
        const live = layers.filter((id) => map.getLayer(id));
        // Which mark a pixel answers for: the top feature, or — when the page resolves overlaps by
        // a rule (a symbol map answers with the SMALLEST circle under the pointer) — the hit with
        // the lowest order.
        const resolve = (hits) => {
          const keys = hits.map((h) => h.properties?.[keyProp]).filter((k) => k !== undefined && k !== null && k !== "");
          if (!order) return keys[0];
          return keys.filter((k) => k in order).sort((a, b) => order[a] - order[b])[0];
        };
        const points = {};
        // Whole CSS pixels: a pointer event's clientX/Y arrive as integers, so the pixel queried
        // here must be the pixel the page's own handler will be asked about.
        const top = Math.ceil(Math.max(r.top, 0)) + 1;
        const bottom = Math.min(r.bottom, window.innerHeight) - 1;
        const right = Math.min(r.right, window.innerWidth) - 1;
        for (let y = top; y < bottom; y += step)
          for (let x = Math.ceil(Math.max(r.left, 0)) + 1; x < right; x += step) {
            if (document.elementFromPoint(x, y) !== canvas) continue;
            const k = resolve(map.queryRenderedFeatures([x - r.left, y - r.top], { layers: live }));
            if (k) (points[k] ??= []).push([x, y]);
          }
        const out = {};
        for (const [k, pts] of Object.entries(points)) {
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          out[k] = pts.reduce((best, p) => ((p[0] - cx) ** 2 + (p[1] - cy) ** 2 < (best[0] - cx) ** 2 + (best[1] - cy) ** 2 ? p : best));
        }
        // A mark smaller than the grid step (Malta at continental zoom) is looked for pixel by
        // pixel around its own anchor, projected by the live camera.
        for (const [k, lonLat] of Object.entries(anchors)) {
          if (out[k]) continue;
          const c = map.project(lonLat);
          search: for (let radius = 0; radius <= 8; radius += 1)
            for (let dy = -radius; dy <= radius; dy += 1)
              for (let dx = -radius; dx <= radius; dx += 1) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
                const x = Math.round(r.left + c.x + dx);
                const y = Math.round(r.top + c.y + dy);
                if (y < 0 || y >= window.innerHeight || document.elementFromPoint(x, y) !== canvas) continue;
                // As strings: an object key always is one, a feature property may be a number.
                if (String(resolve(map.queryRenderedFeatures([x - r.left, y - r.top], { layers: live }))) === k) {
                  out[k] = [x, y];
                  break search;
                }
              }
        }
        return out;
      },
      { layers, keyProp, step, anchors, order },
    );
    const missing = [];
    const wrong = [];
    let answered = 0;
    const want = Object.entries(expected);
    for (const [k, detail] of want) {
      const at = reps[k];
      if (!at) {
        missing.push(k);
        continue;
      }
      await page.mouse.move(at[0], at[1]);
      await new Promise((r) => setTimeout(r, 60));
      const tip = await page.evaluate(() => {
        const t = document.getElementById("tooltip");
        return t ? { hidden: t.hidden, text: t.textContent } : { hidden: true, text: "" };
      });
      if (!tip.hidden && tip.text.trim() === String(detail).trim()) answered += 1;
      else wrong.push(`${k} at (${at[0]}, ${at[1]}): ${tip.hidden ? "no tooltip" : `"${tip.text.slice(0, 80)}"`}`);
    }
    if (subject && reps[subject]) {
      await page.mouse.move(reps[subject][0], reps[subject][1]);
      await new Promise((r) => setTimeout(r, 120));
      await page.screenshot({ path: join(shots, "map-hover-1600x800.png") });
    }
    return { total: want.length, answered, missing, wrong, stray: Object.keys(reps).filter((k) => !(k in expected)) };
  } finally {
    await browser.close();
  }
}

/**
 * Drives chart-web's verify-web over `file` (screenshots into shots/) and matches every failure
 * against `waivers` (plus LIVE_MAP_WAIVERS when `live`), printing each waiver with its reason.
 * Throws (the kit's `refusing` turns it into REFUSED + empty renders/) on anything not waived.
 * A page with no live layer (the cartogram) calls this alone, with `live: false`.
 */
export function verifyPage({ here, file, waivers = [], live = true }) {
  const shots = join(here, "shots");
  const verify = Bun.spawnSync(["bun", chartWeb(here, "scripts", "verify-web.mjs"), "--file", file, "--shots", "--out", shots], { stdout: "pipe", stderr: "pipe" });
  const lines = `${verify.stdout.toString()}${verify.stderr.toString()}`.split("\n");
  const fails = lines.filter((l) => /^\s*FAIL /.test(l));
  const all = [...(live ? LIVE_MAP_WAIVERS : []), ...waivers];
  const waived = [];
  const failed = [];
  for (const line of fails) {
    const w = all.find((x) => x.test.test(line));
    if (w) waived.push({ line: line.trim(), why: w.why });
    else failed.push(line.trim());
  }
  const counts = lines.find((l) => /^\d+ checks passed/.test(l)) ?? `(no summary — exit ${verify.exitCode})`;
  console.log(`\nverify-web (chart-web${live ? ", on the keyed copy" : ""}): ${counts.trim()}`);
  if (waived.length) {
    console.log(`waived (${waived.length}):`);
    for (const w of waived) console.log(`  - ${w.line.slice(0, 160)}\n      because ${w.why}`);
  }
  const desktop = join(shots, DESKTOP_SHOT);
  if (failed.length || !/^\d+ checks passed/.test(counts.trim())) {
    for (const f of failed) console.log(`  ${f.slice(0, 400)}`);
    if (existsSync(desktop)) console.log(`the refused page, for diagnosis —\nlook at: ${desktop}`);
    throw new Error(
      `the page rendered but the browser verification failed (${failed.length || "no summary"}): fix the words in beat.mjs the failures name (a label too long, two marks answering the same), then render again`,
    );
  }
  return { shots, desktop };
}

/** Copies the desktop screenshot to renders/<label>.png and prints `look at:`. */
export function lookAt({ here, label, shots, desktop }) {
  if (!existsSync(desktop)) throw new Error(`verify-web passed but wrote no ${DESKTOP_SHOT} into ${shots}`);
  const png = join(here, "renders", `${label}.png`);
  cpSync(desktop, png);
  console.log(`screenshots (hover, controls, phone, no-JS): ${shots}`);
  console.log(`look at: ${png}`);
}

/**
 * verifyPage over the KEYED copy, then the live-mark probe, then renders/<label>.png + `look at:`.
 */
export async function verifyLiveMap({ here, label, keyedPath, waivers = [], probe }) {
  // The keyed copy holds the MapTiler key in the journalist's story folder: it lives only as long as
  // the verification, passed or refused.
  try {
    await verifyLiveMapKeyed({ here, label, keyedPath, waivers, probe });
  } finally {
    rmSync(keyedPath, { force: true });
  }
}

async function verifyLiveMapKeyed({ here, label, keyedPath, waivers, probe }) {
  const { shots, desktop } = verifyPage({ here, file: keyedPath, waivers, live: true });
  const p = await probeLiveMarks({ keyedPath, shots, ...probe });
  console.log(`live-mark probe (1600x800): ${p.answered}/${p.total} marks found by a real pointer answered with their own reading${p.missing.length ? `; not found on screen: ${p.missing.join(", ")}` : ""}${p.stray.length ? `; marks answering with no reading: ${p.stray.join(", ")}` : ""}`);
  const mayMiss = typeof probe.mayMiss === "function" ? probe.mayMiss : (k) => (probe.mayMiss ?? []).includes(k);
  const missing = p.missing.filter((k) => !mayMiss(k));
  if (p.wrong.length || missing.length || p.answered === 0) {
    for (const w of p.wrong) console.log(`  wrong answer: ${w}`);
    if (existsSync(desktop)) console.log(`the refused page, for diagnosis —\nlook at: ${desktop}`);
    throw new Error(
      `the live map does not answer every mark with its own reading (${p.wrong.length} wrong, ${missing.length} not on screen: ${missing.join(", ")}) — check the join in beat.mjs (codes) and that every detail is distinct`,
    );
  }
  lookAt({ here, label, shots, desktop });
}

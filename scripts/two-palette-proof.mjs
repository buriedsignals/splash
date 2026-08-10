// twin/scripts/two-palette-proof.mjs
//
// THE GUARD THAT A DECOY CANNOT DEFEAT: render every beat TWICE, under two deliberately different
// recorded palettes, and measure whether the PIXELS moved.
//
// Why this exists rather than another static scan. `seed-reads-a-recorded-palette.test.ts` proves a
// runner MENTIONS the mechanism, and its own header says so; the W2 audit then mutated it and
// watched it stay green on `readPalette(...)` beside `const g = "#FFF" + "FFF"` (mutation M2b). And
// grepping a delivered artifact for a hex proves nothing either way — a bundled page inlines a
// whole colour registry, which is a false alarm this project has already paid an investigation for.
// The only evidence that survives both is the rendered picture: change the recorded answer, render
// again, and count the pixels that moved.
//
// THE TWO PALETTES SHARE THEIR GROUND, and that is the whole design. `deriveFurniture` derives ink,
// muted and grid from the ground alone, so holding the ground fixed makes every word, axis and grid
// line byte-identical between the two runs. Every pixel that moves is therefore something drawn in
// the ACCENT or derived from it — the line, the bars, the choropleth classes, the symbol fills, the
// dot field. A run that changes the ground too would move the whole frame and prove nothing about
// where the accent reaches.
//
// WHAT IT DOES NOT PROVE, stated. It cannot tell a beat whose whole data channel moved from a beat
// where only an accent-coloured LABEL moved — both are "the palette reached the picture", which is
// the question it is for. The two fractions printed beside every row are what separates them, and
// they are reported rather than scored because neither denominator is right for the whole tree
// (the argument is on `MIN_MOVED_PIXELS`).
//
// A SCROLLY IS PHOTOGRAPHED AT EVERY READING, because a scrolly's picture is the scroll. One shot
// at the position the page opens in answers about one step and reports it as the beat, which is how
// a beat that draws its whole reading in the recorded colour came to be called STILL. And the
// harness measures ITSELF before it measures anything: one run's pages are shot twice, and a beat
// whose repeat of its own bytes moves as far as the verdict's floor is reported unmeasured rather
// than judged. That check is the one an earlier step-aware shot did not have, and it is why it was
// thrown away rather than shipped.
//
// It runs in a pristine copy of HEAD under /tmp, never in this tree: it rewrites PALETTE.md files
// and re-renders artifacts, and doing that here would fight whoever else is working.
//
//   bun scripts/two-palette-proof.mjs                 every beat that records a palette
//   bun scripts/two-palette-proof.mjs --only static-  only beats whose name contains this
//   bun scripts/two-palette-proof.mjs --keep          leave the /tmp copy for inspection
//   bun scripts/two-palette-proof.mjs --from /tmp/mut  measure a prepared tree — how the mutation runs

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import puppeteer from "puppeteer";
import {
  contrast,
  adjustToContrast,
  parsePalette,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";

const TWIN = join(import.meta.dirname, "..");
// ASKED for, not computed by counting `..` upwards. The product used to sit one level inside the
// repository, so the repository was TWIN's parent; it is the repository itself now, and a hard-coded
// climb pointed one level too high — `git archive` then ran outside the repo and extracted nothing,
// which the walk reported as a missing directory rather than as a wrong root.
// Asked LAZILY, at the moment a tree is exported rather than at import: a fixture that imports
// `pickBest` to ask a question about an array should not need a git repository to be able to. It
// did, and the mutation copy under /tmp — which is a plain directory — is where that showed.
const repo = () =>
  execFileSync("git", ["-C", TWIN, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
// Outside the repository, always. `TWO_PALETTE_WORK` lets a second run — the one in the default
// suite — take its own directory so two runs cannot overwrite each other's renders.
const WORK = process.env.TWO_PALETTE_WORK || "/tmp/two-palette-proof";

/** HOW MANY PIXELS HAVE TO MOVE, in absolute count, before this is called a pass — and the two
 *  fractions are REPORTED rather than scored. Both denominators were tried and both are wrong for
 *  half the tree, which is why neither is the verdict:
 *
 *    - Divide by the FRAME and a sparse chart disappears into its own whitespace.
 *      `weby-dumbbell-life-expectancy-gains` — every one of twenty dumbbell endpoints changed hue,
 *      which is that chart's entire data channel — scored 0.195% and was called STILL. Opening the
 *      pair is what caught it, which is why this script's last line says to open one.
 *    - Divide by the INK — everything the beat drew that is not its ground — and a MAP disappears
 *      into its own basemap: the plate is ink by that definition, so a route or a marker set moves
 *      1% of a picture it is the entire subject of. `mapmore-flow-danube` scored 1.2%.
 *
 *  So the verdict answers the question the guard is actually for — *did the recorded answer reach
 *  the picture at all?* — and 200 pixels is comfortably above what a rasteriser's anti-aliasing can
 *  produce and comfortably below the smallest real mark in this tree. The mutation it exists to
 *  catch moves EXACTLY ZERO. How MUCH of the picture moved is a different question, and the two
 *  fractions beside every row are the honest answer to it. */
const MIN_MOVED_PIXELS = 200;

/** Two palettes as far apart as the floor allows, on any ground.
 *
 *  Four accents each, because a beat that records several takes them in order through `seriesInks`
 *  and must get the same COUNT in both runs or the comparison is measuring a different chart, not a
 *  different colour. Each is pushed to clear the beat's own ground before it is written, by the same
 *  `adjustToContrast` a refusal would print — so a dark-ground beat is measured too rather than
 *  skipped. */
const PALETTE_A = ["#0B7A75", "#1F6FB2", "#7A2E8E", "#2F6B1F"];
const PALETTE_B = ["#B4451F", "#C68900", "#8E1A3A", "#5A5F00"];

function legibleOn(ground, accents) {
  return accents.map((accent) =>
    contrast(accent, ground) >= NON_TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(accent, ground) ??
        (() => {
          throw new Error(`no variant of ${accent} clears ${ground}`);
        })()),
  );
}

function paletteFile(ground, accents) {
  return (
    `---\nground: "${ground}"\naccent: "${accents[0]}"\n` +
    `accents: "${accents.slice(1).join(", ")}"\norigin: journalist\n---\n\n` +
    `Written by scripts/two-palette-proof.mjs, in a throwaway copy of the tree. Not a decision — a\n` +
    `probe: the same beat is rendered under this and under one other, and the pixels are compared.\n`
  );
}

// ── the pristine copy ──────────────────────────────────────────────────────────────────────────

function freshTree() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  // `--from <dir>` copies a prepared tree instead of exporting HEAD. That is how the mutation is
  // run: export HEAD somewhere, break one beat there, point this at it, and watch the beat that was
  // "moved" become "STILL". Without it the only way to mutate this guard would be to commit the
  // mutation, which is the one thing invariant 4 forbids.
  const from = process.argv.includes("--from")
    ? process.argv[process.argv.indexOf("--from") + 1]
    : null;
  if (from) {
    execFileSync("sh", [
      "-c",
      `cp -R ${JSON.stringify(from)}/. ${JSON.stringify(WORK)}/`,
    ]);
  } else {
    execFileSync("sh", [
      "-c",
      `git -C ${JSON.stringify(repo())} archive HEAD | tar -x -C ${JSON.stringify(WORK)}`,
    ]);
  }
  // The archive used to unpack a `twin/` directory, because the product lived one level down. It
  // is the repository itself now, so the extracted tree IS the workspace. Derived rather than
  // named: whichever of the two holds `skills/`, so this keeps working from either shape.
  const tree = existsSync(join(WORK, "twin", "skills"))
    ? join(WORK, "twin")
    : WORK;
  rmSync(join(tree, "node_modules"), { force: true });
  execFileSync("ln", ["-s", join(TWIN, "node_modules"), join(tree, "node_modules")]);
  // The MapTiler key never enters the copy: every map beat here renders from its own committed
  // plate, and a probe must not spend a newsroom's tile quota.
  return tree;
}

// ── what to run, DERIVED rather than listed ────────────────────────────────────────────────────

/** A beat's runner is whatever `render*.mjs` it holds that is not the vendored rasteriser. */
function runnersOf(beatDir) {
  return readdirSync(beatDir)
    .filter((name) => /^render.*\.mjs$/.test(name) && name !== "render-still.mjs")
    .sort();
}

/** The flags the runner's own source tests for, in the order that reaches a still soonest. A hand
 *  written table would be the list-instead-of-walk mistake this repository names as its own. */
function flagsFor(source) {
  const declared = new Set(
    [...source.matchAll(/argv\.includes\("(--[a-z-]+)"\)/g)].map((m) => m[1]),
  );
  const wanted = ["--still", "--final-frame"].filter((f) => declared.has(f));
  return wanted.length > 0 ? [wanted[0]] : [];
}

/** Every artifact under the beat, with its size and mtime, so a run's OUTPUT can be found rather
 *  than assumed. */
function artifacts(dir, out = new Map(), root = dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) artifacts(path, out, root);
    else if (/\.(png|svg|html)$/.test(entry.name)) {
      const info = statSync(path);
      out.set(relative(root, path), { size: info.size, mtimeMs: info.mtimeMs });
    }
  }
  return out;
}

// ── pixels ─────────────────────────────────────────────────────────────────────────────────────

/** Moved pixels between two rendered images. Identical bytes short-circuit to zero; otherwise both
 *  are decoded to RGBA and compared channel by channel. */
export function movedFraction(a, b, ground) {
  const rawA = readFileSync(a);
  const rawB = readFileSync(b);
  const pixelsA = decode(a);
  const pixelsB = decode(b);
  if (!pixelsA || !pixelsB) return { moved: null, identical: rawA.equals(rawB) };
  if (pixelsA.width !== pixelsB.width || pixelsA.height !== pixelsB.height)
    return { moved: null, identical: false, note: "different size" };
  const [gr, gg, gb] = ground ? channelsOf(ground) : [255, 255, 255];
  let moved = 0;
  let inked = 0;
  const { data: da } = pixelsA;
  const { data: db } = pixelsB;
  for (let i = 0; i < da.length; i += 4) {
    // "Inked" is anything the beat drew: a pixel that is not its own ground, within a tolerance
    // that lets a rasteriser's anti-aliasing of a ground-coloured edge stay out of the count.
    if (
      Math.abs(da[i] - gr) > 6 ||
      Math.abs(da[i + 1] - gg) > 6 ||
      Math.abs(da[i + 2] - gb) > 6
    )
      inked++;
    if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) moved++;
  }
  const frame = pixelsA.width * pixelsA.height;
  return {
    moved,
    inked,
    frame,
    fraction: inked > 0 ? moved / inked : 0,
    frameFraction: moved / frame,
    identical: rawA.equals(rawB),
  };
}

/** #rrggbb to its three channels — a local copy, because this script imports the palette reader
 *  from the shared module and that module keeps `channels` private. */
function channelsOf(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** RGBA for a PNG, through `sharp`-free means: resvg can rasterise an SVG but not decode a PNG, so
 *  a PNG is decoded by embedding it in a one-image SVG and rendering that. Exact, and it needs no
 *  dependency this tree does not already install. */
function decode(path) {
  try {
    if (path.endsWith(".svg")) {
      const image = new Resvg(readFileSync(path, "utf8"), {
        font: { loadSystemFonts: true },
      }).render();
      return { data: image.pixels, width: image.width, height: image.height };
    }
    const png = readFileSync(path);
    const size = pngSize(png);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">` +
      `<image href="data:image/png;base64,${png.toString("base64")}" x="0" y="0" ` +
      `width="${size.width}" height="${size.height}"/></svg>`;
    const image = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
    return { data: image.pixels, width: image.width, height: image.height };
  } catch {
    return null;
  }
}

/**
 * A DELIVERED WEB PAGE IS MEASURED THROUGH THE BROWSER A READER USES, not by reading its bytes.
 *
 * This is the case the project has a written lesson about: a committed page inlines a whole
 * stylesheet and, on a map, a whole colour registry, so grepping it for a hex proves nothing in
 * either direction. It is opened at a fixed viewport and photographed instead.
 *
 * The map pages carry `__MAPTILER_KEY__` and therefore boot on their BAKED FALLBACK rather than on
 * live tiles — which is right here, and is what makes the shot deterministic: the plate underneath
 * is a frozen image and every shape drawn over it comes from the beat's own ramp. A probe must not
 * spend a newsroom's tile quota to answer a question about colour.
 *
 * A SCROLLY IS PHOTOGRAPHED AT EVERY STEP, because a scrolly's picture IS the scroll. Shot once at
 * the position it opens in, `scrolly-one-chart-swiss-life-expectancy` measured 0 px — it spends its
 * accent on steps 2-4 and step 1 is deliberately the bare shape — and the guard called a beat that
 * draws its whole reading in the recorded colour STILL.
 */
function resolveChrome() {
  // A DUPLICATE of the one in `map-web/scripts/render-preview.mjs`, for the reason that file
  // states about its own: this is a small helper and importing it would drag a script that launches
  // a browser the moment it loads. Puppeteer's own resolution finds nothing on a machine where
  // Chrome for Testing was installed outside its default cache, which is this machine.
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to photograph a delivered page with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

/** Page-side: the element the prose actually scrolls inside, and it is not the document. Under the
 *  scaffold's fixed-page model the DOCUMENT has no scroll distance at all, so a harness that drives
 *  `window.scrollTo` drives nothing and photographs a still page while reporting a scroll. Each
 *  beat's own `drive.mjs` carries this same function, found there by measurement. */
const FIND_PORT = () => {
  let best = null;
  for (const element of document.querySelectorAll("*")) {
    const overflow = getComputedStyle(element).overflowY;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const distance = element.scrollHeight - element.clientHeight;
    if (distance > 1 && (!best || distance > best.distance)) best = { element, distance };
  }
  window.__paletteProofPort = best ? best.element : document.scrollingElement;
  return best ? best.distance : 0;
};

/** Page-side: which reading is painted right now. `null` on a page that has no steps, which is how
 *  an ordinary web chart is told from a scrolly without a list of beat names. */
const ACTIVE_STEP = () => {
  const frame = document.querySelector(".step-frame.active");
  return frame ? frame.getAttribute("data-step") : null;
};

/** Page-side: put the port here and give the scaffold's own `scroll` handler one frame to run. */
const SCROLL_TO = (y) => {
  (window.__paletteProofPort ?? document.scrollingElement).scrollTop = y;
  return new Promise((painted) => requestAnimationFrame(() => painted()));
};

const SETTLE_POLL_MS = 350;
const SETTLE_TIMEOUT_MS = 30_000;

/**
 * PHOTOGRAPH ONLY A FRAME THAT HAS STOPPED CHANGING — and never on a sleep, because a sleep is a
 * guess and the guess is what produced the million.
 *
 * Measured, on `mapscrolly-quakes-three-ways` and its own unmodified code: shot one animation frame
 * after the scroll, its "strength" reading moved **1,036,828 px — 74% of the viewport** between two
 * runs, reproducing the 1,048,276 px the discarded step-aware shot reported. Nothing about the beat
 * differs between those two runs; what differs is that the step frame's crossfade and the map's
 * repaint had not finished. Waiting for three consecutive byte-identical frames instead, the same
 * reading is **1,763 px**, the size of the one ring that beat draws in the accent — and it is that
 * to the byte across repeated runs.
 *
 * Returns false rather than a shot when the page never stops moving, so a beat with a permanent
 * animation is reported unmeasured instead of measured against whichever frame the clock landed on.
 */
async function shootWhenSettled(page, path, { fullPage }) {
  let previous = null;
  let stable = 0;
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((wait) => setTimeout(wait, SETTLE_POLL_MS));
    const frame = Buffer.from(await page.screenshot({ encoding: "binary", fullPage }));
    if (previous && frame.equals(previous)) {
      stable += 1;
      if (stable >= 2) {
        writeFileSync(path, frame);
        return true;
      }
    } else stable = 0;
    previous = frame;
  }
  return false;
}

const PROBE_STOPS = 40;

/**
 * One delivered page, photographed wherever it has something to show.
 *
 * A page with no steps is shot once at full page, exactly as this script always did. A SCROLLY is
 * driven to each of its steps and shot there, at the MIDPOINT of the stretch of scroll positions
 * that step owns — never at the stretch's edge, which is the second trap the measurement found: at
 * the last position of a stretch the NEXT frame is already active, and all four of the quakes
 * beat's readings then photograph the same picture and report the same 1,763 px.
 *
 * `suffix` is `""` for the single shot and `.step-<id>` for a reading, so the two runs' images can
 * be paired by name and a step only one run reached is dropped rather than compared with another.
 */
async function shootPage(page, html, kind) {
  await page.goto(`file://${html}`, { waitUntil: "networkidle2", timeout: 60_000 });
  const distance = await page.evaluate(FIND_PORT);
  const opensOn = await page.evaluate(ACTIVE_STEP);
  if (opensOn === null || distance < 1) {
    const ok = await shootWhenSettled(page, `${html}${kind}.png`, { fullPage: true });
    return ok ? [""] : null;
  }
  // Which reading is painted where. Sampled rather than computed from the DOM's own offsets: what
  // decides the active frame is the scaffold's handler, and asking it is the only honest answer.
  const owns = new Map();
  for (let stop = 0; stop <= PROBE_STOPS; stop++) {
    const y = Math.round((distance * stop) / PROBE_STOPS);
    await page.evaluate(SCROLL_TO, y);
    const step = await page.evaluate(ACTIVE_STEP);
    if (!step) continue;
    if (!owns.has(step)) owns.set(step, []);
    owns.get(step).push(y);
  }
  const suffixes = [];
  for (const [step, positions] of owns) {
    await page.evaluate(SCROLL_TO, positions[Math.floor(positions.length / 2)]);
    const suffix = `.step-${step}`;
    const ok = await shootWhenSettled(page, `${html}${suffix}${kind}.png`, { fullPage: false });
    if (!ok) return null;
    suffixes.push(suffix);
  }
  return suffixes;
}

/**
 * Photograph every page of both runs — and photograph ONE run's pages TWICE.
 *
 * The second pass is the instrument measuring itself. It reloads the same bytes and drives the same
 * scroll, so every pixel that differs between a page's two photographs is the harness's own noise
 * and none of it is the palette's. `main` refuses to give a verdict on a beat whose noise reaches
 * the same floor the verdict does: a guard that can report a million pixels of noise is a guard that
 * would certify a beat drawing in no recorded colour at all, which is the failure the discarded
 * step-aware shot was thrown away for.
 */
async function shootPages(jobs) {
  const shot = new Map();
  if (jobs.length === 0) return shot;
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
    for (const job of jobs) {
      const suffixes = await shootPage(page, job.html, ".shot");
      if (suffixes === null) {
        shot.set(job.key, { suffixes: null, why: "the page never stopped moving" });
        continue;
      }
      let repeated = null;
      if (job.noiseCheck) {
        repeated = await shootPage(page, job.html, ".noise");
        if (repeated === null) {
          shot.set(job.key, { suffixes: null, why: "the page never stopped moving on its repeat" });
          continue;
        }
      }
      shot.set(job.key, { suffixes, repeated });
    }
  } finally {
    await browser.close();
  }
  return shot;
}

/**
 * THE ROW'S NUMBER IS THE BIGGEST MOVE, NOT THE BIGGEST FRACTION.
 *
 * The verdict reads `moved` in absolute pixels, so choosing the row's image by `fraction` compares
 * a beat against a number that was never a candidate for it. Latent while a beat wrote one
 * comparable image; wrong the moment it writes several, which is exactly what photographing a
 * scrolly at every step now makes ordinary — a step where 90 px of ink all changed wins at 100%
 * over a step where 40,000 px moved, and the beat is reported STILL. Its fixture is
 * `skills/splash/test/the-palette-proof-reports-the-biggest-move.test.ts`.
 */
export function pickBest(measured) {
  let best = null;
  for (const one of measured) {
    if (one.moved === null || one.moved === undefined) continue;
    if (!best || one.moved > best.moved) best = one;
  }
  return best;
}

/** Width and height straight out of the IHDR chunk. */
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// ── one beat, twice ────────────────────────────────────────────────────────────────────────────

function renderUnder(tree, beat, accents, label) {
  const beatDir = join(tree, "proof", beat);
  const recorded = parsePalette(readFileSync(join(beatDir, "PALETTE.md"), "utf8"));
  writeFileSync(
    join(beatDir, "PALETTE.md"),
    paletteFile(recorded.ground, legibleOn(recorded.ground, accents)),
  );
  const before = artifacts(beatDir);
  const runner = runnersOf(beatDir)[0];
  if (!runner) return { ok: false, why: "no runner" };
  const source = readFileSync(join(beatDir, runner), "utf8");
  const result = spawnSync(
    "bun",
    [join("proof", beat, runner), ...flagsFor(source)],
    { cwd: tree, encoding: "utf8", timeout: 600_000 },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      why: (result.stderr || result.stdout || "").trim().split("\n").slice(-3).join(" | "),
    };
  }
  const after = artifacts(beatDir);
  const written = [...after.entries()]
    .filter(([name, info]) => {
      const was = before.get(name);
      return !was || was.mtimeMs !== info.mtimeMs;
    })
    .map(([name]) => name)
    .sort();
  if (written.length === 0) return { ok: false, why: "wrote nothing" };
  const kept = join(WORK, "kept", label, beat);
  mkdirSync(kept, { recursive: true });
  for (const name of written) {
    mkdirSync(dirname(join(kept, name)), { recursive: true });
    writeFileSync(join(kept, name), readFileSync(join(beatDir, name)));
  }
  return { ok: true, written };
}

async function main() {
  const only = process.argv.includes("--only")
    ? process.argv[process.argv.indexOf("--only") + 1]
    : null;
  const tree = freshTree();
  const proof = join(tree, "proof");
  const beats = readdirSync(proof)
    .filter((name) => existsSync(join(proof, name, "PALETTE.md")))
    .filter((name) => existsSync(join(proof, name, "BRIEF.md")))
    .filter((name) => (only ? name.includes(only) : true))
    .sort();

  const rows = [];
  for (const beat of beats) {
    const a = renderUnder(tree, beat, PALETTE_A, "a");
    if (!a.ok) {
      rows.push({ beat, verdict: "unmeasured", why: a.why });
      console.log(`unmeasured  ${beat} — ${a.why}`);
      continue;
    }
    const b = renderUnder(tree, beat, PALETTE_B, "b");
    if (!b.ok) {
      rows.push({ beat, verdict: "unmeasured", why: b.why });
      console.log(`unmeasured  ${beat} — ${b.why}`);
      continue;
    }
    let comparable = a.written.filter(
      (name) => b.written.includes(name) && /\.(png|svg)$/.test(name),
    );
    // How far the harness's own repeat of the SAME page moved. `null` on a beat that writes its
    // images directly, where there is no browser between the render and the pixels.
    let noise = null;
    let noisePair = null;
    if (comparable.length === 0) {
      // A web beat writes only HTML. Photograph both, at every reading each has, and compare the
      // photographs — plus one run photographed twice, which is the instrument measuring itself.
      const pages = a.written.filter(
        (name) => b.written.includes(name) && name.endsWith(".html"),
      );
      const jobs = [];
      for (const name of pages)
        for (const label of ["a", "b"])
          jobs.push({
            key: `${label}/${name}`,
            html: join(WORK, "kept", label, beat, name),
            noiseCheck: label === "a",
          });
      const shot = await shootPages(jobs);
      const restless = [...shot.values()].find((one) => one.suffixes === null);
      if (restless) {
        rows.push({ beat, verdict: "unmeasured", why: restless.why });
        console.log(`unmeasured  ${beat} — ${restless.why}`);
        continue;
      }
      comparable = [];
      noisePair = [];
      for (const name of pages) {
        const first = shot.get(`a/${name}`);
        const second = shot.get(`b/${name}`);
        for (const suffix of first.suffixes)
          if (second.suffixes.includes(suffix))
            comparable.push(`${name}${suffix}.shot.png`);
        for (const suffix of first.repeated ?? [])
          if (first.suffixes.includes(suffix))
            noisePair.push([`${name}${suffix}.shot.png`, `${name}${suffix}.noise.png`]);
      }
    }
    if (comparable.length === 0) {
      rows.push({ beat, verdict: "unmeasured", why: `no comparable image (${a.written.join(", ")})` });
      console.log(`unmeasured  ${beat} — no comparable image among ${a.written.join(", ")}`);
      continue;
    }
    const ground = parsePalette(
      readFileSync(join(proof, beat, "PALETTE.md"), "utf8"),
    ).ground;
    if (noisePair) {
      noise = 0;
      for (const [shotName, noiseName] of noisePair) {
        const measured = movedFraction(
          join(WORK, "kept", "a", beat, shotName),
          join(WORK, "kept", "a", beat, noiseName),
          ground,
        );
        if (measured.moved !== null) noise = Math.max(noise, measured.moved);
      }
      // THE INSTRUMENT IS NOT ALLOWED TO CERTIFY ON ITS OWN NOISE. The same floor as the verdict,
      // because a harness whose repeat of one page moves 200 px cannot tell a 200 px verdict from
      // itself. This is the check the discarded step-aware shot would have failed at 1,048,276 px.
      if (noise >= MIN_MOVED_PIXELS) {
        const why = `the harness's own repeat moved ${noise} px — over the ${MIN_MOVED_PIXELS} px floor the verdict uses`;
        rows.push({ beat, verdict: "unmeasured", why, noise });
        console.log(`unmeasured  ${beat} — ${why}`);
        continue;
      }
    }
    const best = pickBest(
      comparable.map((name) => ({
        name,
        ...movedFraction(
          join(WORK, "kept", "a", beat, name),
          join(WORK, "kept", "b", beat, name),
          ground,
        ),
      })),
    );
    if (!best) {
      rows.push({ beat, verdict: "unmeasured", why: "could not decode" });
      console.log(`unmeasured  ${beat} — could not decode`);
      continue;
    }
    const verdict = best.moved >= MIN_MOVED_PIXELS ? "moved" : "STILL";
    rows.push({ beat, verdict, noise, images: comparable.length, ...best });
    console.log(
      `${verdict === "moved" ? "moved      " : "STILL      "}${beat}  ` +
        `${String(best.moved).padStart(7)} px — ${(best.fraction * 100).toFixed(1)}% of its ink, ` +
        `${(best.frameFraction * 100).toFixed(2)}% of its frame — ${best.name}` +
        (noise === null ? "" : `  (harness noise ${noise} px over ${comparable.length} images)`),
    );
  }

  const moved = rows.filter((r) => r.verdict === "moved").length;
  const still = rows.filter((r) => r.verdict === "STILL");
  const unmeasured = rows.filter((r) => r.verdict === "unmeasured");
  console.log(
    `\nDATA INK MOVED in ${moved} of ${rows.length} beats measured twice under two palettes.`,
  );
  if (still.length > 0)
    console.log(`STILL (the palette did not reach the picture): ${still.map((r) => r.beat).join(", ")}`);
  if (unmeasured.length > 0)
    console.log(`unmeasured: ${unmeasured.map((r) => `${r.beat} (${r.why})`).join("; ")}`);
  writeFileSync(join(WORK, "report.json"), JSON.stringify(rows, null, 2));
  console.log(`\nreport → ${join(WORK, "report.json")}`);
  console.log(`renders → ${join(WORK, "kept", "{a,b}")} — open a pair and look at them.`);
  if (!process.argv.includes("--keep")) console.log(`(the copy stays at ${WORK})`);
  process.exitCode = still.length > 0 ? 1 : 0;
}

// Run when it is the program, not when a fixture imports `pickBest` — importing it otherwise
// exports a clean tree and renders two beats to answer a question about an array.
if (import.meta.main) await main();

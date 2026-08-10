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
// WHAT IT DOES NOT PROVE, stated. It cannot tell a beat whose data moved from a beat where only an
// accent-coloured LABEL moved — both are "the palette reached something". The reported fraction is
// what separates them by eye, and `MIN_MOVED` below is set from the measured distribution rather
// than chosen: a label sits in the hundreds of pixels, a data field in the tens of thousands.
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
} from "#shared/twin-chart-beat/render-still.mjs";

const TWIN = join(import.meta.dirname, "..");
const REPO = join(TWIN, "..");
const WORK = "/tmp/two-palette-proof";

/** The fraction of a frame that has to move before this is called a pass.
 *
 *  Set from the measured distribution rather than picked: across the beats this walks, a genuine
 *  data channel moves whole percent of the frame, while a beat where only an accent-coloured word
 *  or a single highlighted label moved lands two orders of magnitude below. 0.2% sits in the empty
 *  band between the two, and every beat's own fraction is printed so the band stays visible rather
 *  than becoming a number nobody re-checks. */
const MIN_MOVED = 0.002;

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
      `git -C ${JSON.stringify(REPO)} archive HEAD | tar -x -C ${JSON.stringify(WORK)}`,
    ]);
  }
  const tree = join(WORK, "twin");
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
function movedFraction(a, b) {
  const rawA = readFileSync(a);
  const rawB = readFileSync(b);
  if (rawA.equals(rawB)) return { moved: 0, total: 1, identical: true };
  const pixelsA = decode(a);
  const pixelsB = decode(b);
  if (!pixelsA || !pixelsB) return { moved: null, total: null, identical: false };
  if (pixelsA.width !== pixelsB.width || pixelsA.height !== pixelsB.height)
    return { moved: null, total: null, identical: false, note: "different size" };
  let moved = 0;
  const { data: da } = pixelsA;
  const { data: db } = pixelsB;
  for (let i = 0; i < da.length; i += 4) {
    if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) moved++;
  }
  const total = pixelsA.width * pixelsA.height;
  return { moved, total, identical: false };
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
 */
function resolveChrome() {
  // A DUPLICATE of the one in `twin-map-web/scripts/render-preview.mjs`, for the reason that file
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

async function shootPages(pages) {
  if (pages.length === 0) return;
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
    for (const { html, png } of pages) {
      await page.goto(`file://${html}`, { waitUntil: "networkidle2", timeout: 60_000 });
      await new Promise((settle) => setTimeout(settle, 1200));
      await page.screenshot({ path: png, fullPage: true });
    }
  } finally {
    await browser.close();
  }
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
    if (comparable.length === 0) {
      // A web beat writes only HTML. Photograph both, and compare the photographs.
      const pages = a.written.filter(
        (name) => b.written.includes(name) && name.endsWith(".html"),
      );
      const shots = [];
      for (const name of pages) {
        for (const label of ["a", "b"]) {
          const html = join(WORK, "kept", label, beat, name);
          shots.push({ html, png: `${html}.shot.png` });
        }
      }
      await shootPages(shots);
      comparable = pages.map((name) => `${name}.shot.png`);
    }
    if (comparable.length === 0) {
      rows.push({ beat, verdict: "unmeasured", why: `no comparable image (${a.written.join(", ")})` });
      console.log(`unmeasured  ${beat} — no comparable image among ${a.written.join(", ")}`);
      continue;
    }
    let best = null;
    for (const name of comparable) {
      const measured = movedFraction(
        join(WORK, "kept", "a", beat, name),
        join(WORK, "kept", "b", beat, name),
      );
      if (measured.moved === null) continue;
      const fraction = measured.moved / measured.total;
      if (!best || fraction > best.fraction) best = { name, fraction, ...measured };
    }
    if (!best) {
      rows.push({ beat, verdict: "unmeasured", why: "could not decode" });
      console.log(`unmeasured  ${beat} — could not decode`);
      continue;
    }
    const verdict = best.fraction >= MIN_MOVED ? "moved" : "STILL";
    rows.push({ beat, verdict, ...best });
    console.log(
      `${verdict === "moved" ? "moved      " : "STILL      "}${beat}  ` +
        `${(best.fraction * 100).toFixed(2)}% of ${best.name}`,
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

await main();

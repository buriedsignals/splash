// skills/scrolly/scripts/live-map-cards-bake.mjs
//
// THE FROZEN CARD IMAGES UNDER A LIVE SCROLLY MAP, the browser and encoder half (the pure half and the rules it
// carries are in `live-map-cards.mjs`). A beat opens one context, renders each direction through
// `renderWithCardImages`, and closes the context:
//
//   const cards = await openLiveMapCards();                      // key, style, MapLibre, trunk digest, Chrome
//   const face = await cards.faceOf(regs.axis, "axis");          // a MapTiler face, refused if it is the fallback
//   const { outPath } = await renderWithCardImages(cards, {
//     id, plan, states, fallbackDir, stageGround,                // what the images picture, and where they live
//     project: [[lon, lat]], cardOf: (baked) => ({ zoom }),      // what the driver needs off each baked card
//     blankCard: { zoom: 0 },
//     renderPage: (fallbacks, shapes) => renderScrolly({ … }),   // the beat's own page, given its images
//   });
//   await cards.close();
//
// What `renderWithCardImages` does, in order: renders a draft page with blank images and measures its two stages
// with the page's scripts running; bakes every card in both shapes and both densities only when the plan hash or
// a file is missing; encodes the PNGs as lossless WebP and records each file's digest; reads each image ONCE,
// inlines it, and refuses a page whose images are not this direction's own bakes; renders the page; and refuses
// a written page whose stages differ from the ones its cards were baked at.
//
// Needs a MapTiler key in the environment and `cwebp` (brew `webp`) when a bake is redone.

import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { bakeCards } from "#shared/map-beat/bake.mjs";
import { assertNotFallback, mapTilerKeyIn, maptilerGlyphs } from "#shared/map-beat/glyphs.mjs";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { resolveChrome } from "./verify-scrolly.mjs";
import { toDataUri } from "./inline-asset.mjs";
import {
  MEASURED_VIEWPORTS,
  SCALES,
  SHAPE_ASPECTS,
  bakeSizesFor,
  blankCards,
  cardImageName,
  cardImageStem,
  checkCardImages,
  planHashOf,
  sha256Of,
  variantsOf,
} from "./live-map-cards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

/** THE CODE THE PIXELS DEPEND ON besides the plan: the trunk that mounts, sweeps and paints it, and this bake. A
 *  change in any of them re-bakes the card images instead of leaving stale ones behind the live map. */
const TRUNK_FILES = [
  ...["bake.mjs", "mount.mjs", "style.mjs", "scrolly.mjs", "scrolly-live.mjs"].map((f) => join(HERE, "../../../shared/map-beat", f)),
  join(HERE, "live-map-cards.mjs"),
  join(HERE, "live-map-cards-bake.mjs"),
];

/** MAPTILER SERVES FACES, NOT FAMILIES, and answers 200 with Noto Sans for a face it does not have. */
const FACE_WEIGHTS = { 400: "Regular", 500: "Medium", 700: "Bold" };

export async function openLiveMapCards({ env = process.env, styleName = "dataviz" } = {}) {
  const key = mapTilerKeyIn(env);
  if (!key)
    throw new Error(
      "no MapTiler key in the environment: this render proves the faces MapTiler serves and bakes the card images, " +
        "and neither can be faked. Run it with the worktree's .env loaded.",
    );
  const keyed = (value) => JSON.parse(JSON.stringify(value).split(KEY_PLACEHOLDER).join(key));
  const maplibreJs = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
  const maplibreCss = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
  const maplibreVersion = JSON.parse(await readFile(require.resolve("maplibre-gl/package.json"), "utf8")).version;
  const mapScript = await scrollyMapScript();
  const styleDoc = await (await fetch(`https://api.maptiler.com/maps/${styleName}/style.json?key=${key}`)).json();
  if (!styleDoc.glyphs) throw new Error(`the ${styleName} style carries no glyph endpoint`);
  const unkeyedStyle = JSON.parse(JSON.stringify(styleDoc).split(key).join(KEY_PLACEHOLDER));
  const trunkDigest = createHash("sha256")
    .update((await Promise.all(TRUNK_FILES.map((f) => readFile(f, "utf8")))).join("\0"))
    .digest("hex");
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });

  const servedFaces = new Map();
  /** A register's family and weight become the face name MapTiler uses, and the bytes it returns are compared
   *  with the fallback's before the face is written into a layer. */
  async function faceOf(register, role) {
    const family = String(register.fontFamily).split(",")[0].trim().replace(/^["']|["']$/g, "");
    const weight = FACE_WEIGHTS[Number(register.fontWeight)];
    if (!weight) throw new Error(`no MapTiler face name for ${family} at weight ${register.fontWeight} (the ${role} register)`);
    const italic = register.fontStyle === "italic";
    const suffix = [italic && weight === "Regular" ? null : weight, italic ? "Italic" : null].filter(Boolean).join(" ");
    const face = `${family} ${suffix}`;
    if (!servedFaces.has(face)) {
      const bytes = await maptilerGlyphs(face, "0-255", key);
      assertNotFallback(bytes, await maptilerGlyphs(`Zzz Fictive ${suffix}`, "0-255", key), face);
      assertNotFallback(bytes, await maptilerGlyphs(`Noto Sans ${suffix}`, "0-255", key), face);
      servedFaces.set(face, bytes.length);
    }
    return face;
  }

  /** THE STAGE A RENDERED PAGE PUBLISHES at each measured viewport, in the whole CSS pixels the live runtime reads
   *  (`clientWidth`, `clientHeight`). Read WITH the page's scripts, once its faces are loaded: the header sets the
   *  longest title form that fits, so a phone's stage is taller than the no-script layout's. */
  async function measureStages(file) {
    const out = {};
    for (const [shape, viewport] of Object.entries(MEASURED_VIEWPORTS)) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
        await page.goto(`file://${file}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
        out[shape] = await page.evaluate(() => {
          const stage = document.querySelector('[data-part="stage"]');
          return { width: stage.clientWidth, height: stage.clientHeight };
        });
      } finally {
        await page.close();
      }
    }
    return out;
  }

  /** A blank page carrying MapLibre and the whole map trunk, `window.__mountPlan` set (`bakeCards`' contract). */
  async function mapPage() {
    const page = await browser.newPage();
    await page.setContent(
      `<style>${maplibreCss} html,body{margin:0} #map{position:absolute;inset:0}</style><div id="map"></div><script>${maplibreJs}</script>` +
        `<script>${mapScript}\nwindow.__mountPlan = mountPlan;</script>`,
    );
    return page;
  }

  return {
    key,
    keyed,
    styleDoc,
    unkeyedStyle,
    maplibreJs,
    maplibreCss,
    maplibreVersion,
    mapScript,
    trunkDigest,
    browser,
    servedFaces,
    faceOf,
    measureStages,
    mapPage,
    close: () => browser.close(),
  };
}

const readRecord = async (path) => (existsSync(path) ? JSON.parse(await readFile(path, "utf8")) : null);

/**
 * One direction's page with its frozen card images. See the header for the order of operations.
 *
 * @param cards        the context from `openLiveMapCards`
 * @param id           the direction's id: every file this writes is named for it
 * @param plan         the key-free plan (its `cameras`, `tints`, `layers`); baked with the key substituted
 * @param states       each card's full state (camera fields included)
 * @param fallbackDir  where the images and `<id>.json` live, inside the beat
 * @param stageGround  what the canvas leaves transparent shows in the bake: the stage's own ground
 * @param project      [lon, lat] points read back through `map.project` at each card
 * @param cardOf       (baked card) → what the page's driver reads off it; stored in the record's `shapes`
 * @param blankCard    `cardOf`'s shape, zeroed, for the draft page
 * @param renderPage   (fallbacks, shapes) → `renderScrolly`'s answer (`{ outPath }`)
 * @param aspects      the bake aspects (`SHAPE_ASPECTS`)
 */
export async function renderWithCardImages(
  cards,
  { id, plan, states, fallbackDir, stageGround, project = [], cardOf = (b) => ({ zoom: b.zoom }), blankCard = { zoom: 0 }, renderPage, aspects = SHAPE_ASPECTS, log = console.log },
) {
  // THE STAGE FIRST: a draft page with blank card images publishes the same layout.
  const blank = blankCards(states.length, blankCard);
  const draft = await renderPage(blank.fallbacks, blank.shapes);
  const sizes = bakeSizesFor(await cards.measureStages(draft.outPath), aspects);
  const variants = variantsOf(SCALES);
  const planHash = planHashOf({ plan, sizes, stageGround, scales: SCALES, style: cards.unkeyedStyle, maplibre: cards.maplibreVersion, trunk: cards.trunkDigest });
  const recordPath = join(fallbackDir, `${id}.json`);
  const pathOf = (k, shape, scale, ext) => join(fallbackDir, cardImageName(id, k, shape, scale, ext));
  let record = await readRecord(recordPath);
  const missing = states.some((_, k) => variants.some(([shape, scale]) => !existsSync(pathOf(k, shape, scale, "webp")) && !existsSync(pathOf(k, shape, scale, "png"))));
  let baked = false;
  if (!record || record.planHash !== planHash || missing) {
    await mkdir(fallbackDir, { recursive: true });
    const page = await cards.mapPage();
    try {
      await page.evaluate((ground) => {
        document.documentElement.style.background = ground;
        document.body.style.background = ground;
      }, stageGround);
      const shapes = {};
      for (const [shape, scale] of variants) {
        const out = await bakeCards({
          page,
          plan: { ...cards.keyed(plan), style: cards.keyed(cards.styleDoc) },
          cameras: plan.cameras,
          size: sizes[shape],
          glyphsUrl: cards.styleDoc.glyphs,
          tints: plan.tints,
          keepLabels: [],
          statesForCards: states,
          outDir: fallbackDir,
          stem: cardImageStem(id, shape, scale),
          project,
          scale,
        });
        shapes[shape] = { size: sizes[shape], cards: out.map(cardOf) };
      }
      record = { planHash, shapes };
      baked = true;
    } finally {
      await page.close();
    }
  }

  // THE BAKES TRAVEL AS LOSSLESS WEBP: the same pixels as the PNG the browser wrote, in about 40 % of its bytes.
  // Each file's digest is taken off the file cwebp wrote and kept in the record.
  const images = { ...(baked ? {} : record.images ?? {}) };
  for (let k = 0; k < states.length; k++)
    for (const [shape, scale] of variants) {
      const png = pathOf(k, shape, scale, "png");
      const webp = pathOf(k, shape, scale, "webp");
      const name = cardImageName(id, k, shape, scale);
      if (existsSync(png)) {
        try {
          execFileSync("cwebp", ["-quiet", "-lossless", "-z", "9", "-exact", png, "-o", webp]);
        } catch (error) {
          throw new Error(`cwebp could not encode ${png} (brew install webp): ${error.message}`);
        }
        await rm(png);
        images[name] = sha256Of(await readFile(webp));
      } else if (images[name] === undefined) images[name] = sha256Of(await readFile(webp));
    }
  record = { planHash: record.planHash, shapes: record.shapes, images };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  if (baked) log(`${id}: baked ${states.length} cards at ${Object.values(sizes).map((s) => `${s.width} × ${s.height}`).join(" and ")}`);

  // EACH IMAGE IS READ ONCE: the digest checked and the data URI inlined come from the same bytes.
  const fallbacks = [];
  const inlined = [];
  for (let k = 0; k < states.length; k++) {
    const card = {};
    for (const shape of ["wide", "tall"]) {
      card[shape] = {};
      for (const scale of SCALES) {
        const name = cardImageName(id, k, shape, scale);
        const bytes = await readFile(join(fallbackDir, name));
        inlined.push({ name, sha256: sha256Of(bytes) });
        card[shape][`x${scale}`] = toDataUri(bytes, "image/webp");
      }
    }
    fallbacks.push({ wide: { x1: card.wide.x1, x2: card.wide.x2 }, tall: { x1: card.tall.x1, x2: card.tall.x2 } });
  }
  const others = [];
  for (const file of readdirSync(fallbackDir))
    if (file.endsWith(".json") && file !== `${id}.json`) others.push(JSON.parse(await readFile(join(fallbackDir, file), "utf8")));
  const problems = checkCardImages({ id, inlined, record, others });
  if (problems.length) throw new Error(`the card images inlined for ${id} are not its own bakes:\n  ${problems.join("\n  ")}`);

  const { outPath } = await renderPage(fallbacks, record.shapes);
  // The written page must publish the stages its cards were baked at, or the frozen card and the live map part.
  const published = await cards.measureStages(outPath);
  for (const shape of ["wide", "tall"]) {
    const at = published[shape];
    const bakedFor = sizes[shape];
    const kept = shape === "wide" ? at.height === bakedFor.height : at.width === bakedFor.width;
    if (!kept) throw new Error(`the ${shape} stage measured ${at.width} × ${at.height} on the written page, and its cards were baked for ${bakedFor.width} × ${bakedFor.height}`);
  }
  return { outPath, record, sizes, baked };
}

/** A COPY OF A PAGE WITH THE KEY IN IT, in a fresh temporary directory, for a guard or a capture. The committed
 *  page never carries the key; call `remove()` however the run ends. */
export function writeKeyedCopy(pagePath, key, { parent = tmpdir(), prefix = "live-scrolly-" } = {}) {
  const html = readFileSync(pagePath, "utf8");
  if (!html.includes(KEY_PLACEHOLDER)) throw new Error(`${pagePath} carries no key placeholder — is it a live map page?`);
  const dir = mkdtempSync(join(parent, prefix));
  const path = join(dir, "page.html");
  writeFileSync(path, html.split(KEY_PLACEHOLDER).join(key));
  return { path, dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
}

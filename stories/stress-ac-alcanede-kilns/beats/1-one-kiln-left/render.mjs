// The runner for the Alcanede kiln beat: one scroll carrying THREE media in the order the article
// asks for them — the chart, then the two photographs, then the map.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` (the
// media-agnostic scaffold above the CONFIG marker in
// `skills/scrolly/scripts/render-scrolly.mjs`) and builds its own `steps` array from its own frame
// components (`KilnFrames.tsx`). Nothing under `skills/` is edited by this file.
//
// Usage:
//   bun stories/stress-ac-alcanede-kilns/beats/1-one-kiln-left/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { creditLine, parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { renderScrolly } from "../../../../skills/scrolly/scripts/render-scrolly.mjs";
import { deriveFacts, group, parseRows } from "./kiln-data.ts";
import { ChartFrame, MapFrame, PhotoFrame } from "./KilnFrames.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");
const ROOT = resolve(HERE, "../../../..");

// Colours from the answer recorded in PALETTE.md beside the story — never a hex written here.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: ROOT });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "renders"));

/** A PNG's own pixel size, read from its IHDR chunk rather than assumed. Every placement on the
 *  photograph track is expressed in the picture's own coordinates, so this is the one fact the
 *  frame cannot do without — and a photograph a journalist swaps for another size must not silently
 *  move the caption off the picture. */
function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("a photograph in this beat is not a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** What each photograph shows, in the journalist's own words — the beat states what a frame is
 *  rather than letting a reader infer it from a year alone. */
const PHOTOGRAPHS = [
  {
    file: "ac-kiln-1980.png",
    yearOf: (facts) => facts.first.year,
    describe: "The Alcanede kiln yard, photographed in 1980.",
  },
  {
    file: "ac-kiln-2026.png",
    yearOf: (facts) => facts.last.year,
    describe: "The same yard, photographed in 2026.",
  },
];

/** The four steps, in the order the article names the media. `prose` is built from the derived
 *  facts — no figure below is a literal. */
function buildSteps(facts, ctx) {
  const shared = { ground, ink: furniture.ink, muted: furniture.muted, grid: furniture.grid, accent };
  const share = (from, to) => Math.round((1 - to / from) * 100);
  const lastTwo = facts.rows.slice(-3);

  return [
    {
      id: "record",
      prose: [
        `In ${facts.first.year} the lime kilns at Alcanede employed ${group(facts.first.workers)} people across ` +
          `${group(facts.first.kilns)} active kilns. In ${facts.last.year} the site employs ${group(facts.last.workers)}, ` +
          `and ${group(facts.last.kilns)} kiln is still firing.`,
        `Each interval takes a bigger share of what is left than the one before it: ` +
          `${share(lastTwo[0].kilns, lastTwo[1].kilns)}% of the kilns still standing in ${lastTwo[0].year} were gone by ` +
          `${lastTwo[1].year}, and ${share(lastTwo[1].kilns, lastTwo[2].kilns)}% of those left in ${lastTwo[1].year} by ` +
          `${lastTwo[2].year}. In kilns lost per YEAR the fall is slower now than it was in the 1990s — ` +
          `${facts.steepest.kilnsPerYear.toFixed(1)} a year between ${facts.steepest.from.year} and ` +
          `${facts.steepest.to.year} — because there is so little left to lose.`,
      ],
      frame: createElement(ChartFrame, { facts, ...shared }),
    },
    {
      id: "photo-first",
      prose: [
        `${PHOTOGRAPHS[0].describe} ${group(facts.first.kilns)} kilns were firing that year and ` +
          `${group(facts.first.workers)} people worked here.`,
        `There is no number for what a working yard looks like, which is why this frame is in the sequence at all.`,
      ],
      frame: createElement(PhotoFrame, {
        src: ctx.photos[0].href,
        natural: ctx.photos[0].natural,
        year: PHOTOGRAPHS[0].yearOf(facts),
        describe: PHOTOGRAPHS[0].describe,
        ground,
        ink: furniture.ink,
      }),
    },
    {
      id: "photo-last",
      prose: [
        `${PHOTOGRAPHS[1].describe} ${group(facts.last.kilns)} kiln, ${group(facts.last.workers)} workers, ` +
          `${facts.span.years} years later.`,
        `The two frames are the same rectangle, so the comparison is the reader's own — nothing here measures ` +
          `anything from a photograph.`,
      ],
      frame: createElement(PhotoFrame, {
        src: ctx.photos[1].href,
        natural: ctx.photos[1].natural,
        year: PHOTOGRAPHS[1].yearOf(facts),
        describe: PHOTOGRAPHS[1].describe,
        ground,
        ink: furniture.ink,
      }),
    },
    {
      id: "site",
      prose: [
        `The site sits at ${facts.site.lat.toFixed(2)}°N, ${Math.abs(facts.site.lon).toFixed(2)}°W, in the limestone ` +
          `country between Leiria and Santarem.`,
        `One point, not a route: the frozen file records the same coordinate on every one of its ` +
          `${group(facts.rows.length)} rows, so this map places the yard and never pretends to move with it.`,
      ],
      frame: createElement(MapFrame, {
        plate: ctx.plateDataUri,
        frame: ctx.plate.frame,
        site: { px: ctx.plate.site.px, py: ctx.plate.site.py, label: "Alcanede" },
        ground,
        ink: furniture.ink,
        accent,
      }),
    },
  ];
}

async function render() {
  const [csv, storyboardText, plateBuffer, plateGeometry, ...photoBuffers] = await Promise.all([
    readFile(join(STORY_DIR, "source", "data.csv"), "utf8"),
    readFile(join(STORY_DIR, "STORYBOARD.md"), "utf8"),
    readFile(join(HERE, "site-plate.jpg")),
    readFile(join(HERE, "site-plate.json"), "utf8"),
    ...PHOTOGRAPHS.map((p) => readFile(join(HERE, "photographs", p.file))),
  ]);

  const facts = deriveFacts(parseRows(csv));
  const board = parseStoryboard(storyboardText);
  const meta = board.meta ?? board;
  if (!meta.language) throw new Error("STORYBOARD.md records no language; the delivered page will not declare one");

  const ctx = {
    photos: photoBuffers.map((buffer) => ({
      href: `data:image/png;base64,${buffer.toString("base64")}`,
      natural: pngSize(buffer),
    })),
    plateDataUri: `data:image/jpeg;base64,${plateBuffer.toString("base64")}`,
    plate: JSON.parse(plateGeometry),
  };

  const steps = buildSteps(facts, ctx);

  const title = "One kiln left";
  const source =
    `${creditLine(meta.credit)}. ` +
    `Kiln and workforce counts, ${facts.first.year}-${facts.last.year}, ${group(facts.rows.length)} observations, ` +
    `from the story's own frozen file. Photographs supplied with the story; they are of the site, not of any one ` +
    `kiln in the count. Map: MapTiler dataviz basemap, (c) OpenStreetMap contributors, baked once and embedded. ` +
    `Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}. ` +
    `This format does not read the story's recorded typeface (TYPEFACE.md); the page is set in the vehicle's own ` +
    `fallback stack.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    language: meta.language,
    outDir,
    name: "one-kiln-left.html",
  });

  console.log(
    `alcanede-kilns scrolly -> ${outPath}  [${steps.length} steps, ` +
      `${new Set(["chart", "image", "image", "map"]).size} distinct media, ` +
      `panel contrast ${panelContrast.toFixed(2)}:1]`,
  );
  return { outPath, facts };
}

if (import.meta.main) await render();

export { render, buildSteps };

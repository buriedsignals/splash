// Producer for the stress-h-site-photographs beat.
//
// Runs inside a Splash root: uses `react-dom/server` and `@resvg/resvg-js` from the root's
// dependencies, the same as every other render-still.mjs copy in this tree.
//
// Two passes, on purpose:
//   1. The manifest exactly as intake froze it (source/data.csv) — tall.png's alt is empty,
//      huge.png has no credit field at all. This pass is expected to THROW, and the thrown
//      message is captured verbatim rather than swallowed.
//   2. The same manifest with the two gaps named explicitly rather than invented — the "ship
//      with the gap named" option `references/image-discipline.md` leaves open beside refusal.
//      No photo content is described and no rights holder is guessed; the field says only that
//      it is missing, in words a reader sees, not a blank the render hides.

import { createElement } from "react";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderStill,
  readImageMeta,
  checkOrientation,
  checkWeight,
  toDataUri,
} from "./render-still.mjs";
import { siteLayout, SitePhotographs } from "./SitePhotographs.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const TITLE = "Three photographs from the site";

const RAW_MANIFEST = JSON.parse(
  await readFile(join(STORY, "source", "data.csv"), "utf8"),
).photos;

async function resolvePhotos(manifest) {
  const files = manifest.map((entry) => ({
    path: join(HERE, entry.file),
    alt: entry.alt ?? "",
    credit: entry.credit ?? "",
  }));
  return Promise.all(
    files.map(async (f) => {
      const bytes = await readFile(f.path);
      const meta = readImageMeta(bytes);
      checkOrientation(bytes, f.path);
      return {
        ...f,
        bytes,
        dataUri: toDataUri(bytes, meta.mime),
        intrinsicWidth: meta.width,
        intrinsicHeight: meta.height,
      };
    }),
  );
}

// --- Pass 1: the manifest exactly as intake froze it ---
console.log("PASS 1 — raw manifest, as frozen in source/data.csv:");
try {
  const rawPhotos = await resolvePhotos(RAW_MANIFEST);
  siteLayout(rawPhotos, TITLE); // throws before any pixel is drawn
  console.log("  (unexpected: did not throw)");
} catch (error) {
  console.log(`  REFUSED: ${error.message}`);
}

// --- Pass 2: the same three photographs, gaps named rather than invented ---
console.log("\nPASS 2 — gaps named explicitly, nothing invented:");
const namedManifest = RAW_MANIFEST.map((entry) => ({
  ...entry,
  alt: entry.alt && entry.alt.trim() ? entry.alt : "[alt text not supplied by the newsroom]",
  credit: entry.credit && entry.credit.trim() ? entry.credit : "[credit not supplied by the newsroom]",
}));
const photos = await resolvePhotos(namedManifest);
checkWeight(photos);

const { width, height } = siteLayout(photos, TITLE);
const { svgPath, pngPath } = await renderStill({
  element: createElement(SitePhotographs, { photos, title: TITLE, ground: "#FFFFFF" }),
  width,
  height,
  outDir: join(HERE, "renders"),
  name: "still",
});
console.log(`  rendered: ${pngPath}`);

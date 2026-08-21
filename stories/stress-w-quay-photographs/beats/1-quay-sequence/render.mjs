// Producer for beat 1 of `stress-w-quay-photographs` — image / static, size landscape.
//
// The machinery is this beat's own vendored copies of the image format's scripts
// (`skills/image-beat/scripts/render-still.mjs`, `verify-image.mjs`,
// `detect-every-photo-says-what-it-shows.mjs`, `detect-weight-has-a-ceiling.mjs`), plus one file
// the image format does not have at all and this beat had to carry from `chart-beat`:
// `sizes.mjs`, which is the only place in this tree that knows what `size: landscape` MEASURES.
//
// FOUR PASSES, and the first three exist to be READ, not to ship:
//
//   1. the frozen manifest exactly as `source/data.csv` holds it — expected to be REFUSED, and the
//      refusal is captured verbatim rather than swallowed;
//   2. round two's own workaround, the bracketed placeholder, put back through the guard that was
//      written to catch it;
//   3. the same beat with the two absences stated in plain prose a person wrote — which renders,
//      and which the guard reports clean;
//   4. the beat that ships, which is pass 3 plus the size assertion.

import { createElement } from "react";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderStill,
  readImageMeta,
  checkOrientation,
  checkWeight,
  readPalette,
  toDataUri,
} from "./render-still.mjs";
import { duplicatedPayload } from "./verify-image.mjs";
import { photosDeclareAltAndCredit } from "./detect-every-photo-says-what-it-shows.mjs";
import { weightAgainstCeiling, CEILING_BYTES } from "./detect-weight-has-a-ceiling.mjs";
import { readPinnedSize, sizeFor, assertDeliveredSize, readPngSize } from "./sizes.mjs";
import { QuaySequence, quayLayout } from "./QuaySequence.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

const outFlag = process.argv.indexOf("--out");
const outDir = outFlag !== -1 ? process.argv[outFlag + 1] : join(HERE, "renders");
// NOT under `renders/`, and that is not tidiness. `deliver`'s `owned-file` form copies the WHOLE
// of `renders/` into `export/<outputId>/` (`deliver.mjs`, `copyTree(join(beatDir, "renders"), ...)`),
// so anything left in that directory reaches the newsroom as part of the delivery — a size probe,
// a guard receipt, a discarded variant. The delivered directory is exactly `renders/`, so working
// material lives beside it.
const probeDir = outFlag !== -1 ? join(outDir, "probe") : join(HERE, "probe");
const receiptDir = outFlag !== -1 ? outDir : HERE;

const TITLE = "The same stretch of quay, thirty-one years apart";

// The recorded honest empty answer for a credit nobody can give, in the exact words the rest of
// this toolchain prints for it (`storyboard/scripts/storyboard.mjs`, UNATTRIBUTED_CREDIT_LINE).
const NOT_STATED = "Source: not stated";

// The sentence the DESK wrote about the 2010 photograph's missing caption. It is a statement about
// the record — what the archive did and did not carry — and never a description of the picture.
// The article's own words are the source: "came from the archive without a caption or a
// photographer's name, and nobody at the paper can now say who took it".
const NO_CAPTION_SURVIVES =
  "No description survives: this photograph reached the paper from its own archive with no caption and no photographer's name, and nobody there can now say who took it. The desk has run it anyway because it is the only picture of the quay from that decade.";

/** A CSV reader that respects quoted fields — `source/data.csv`'s alt text contains a comma. */
function readCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ""));
  return body.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
}

const MANIFEST = readCsv(await readFile(join(STORY, "source", "data.csv"), "utf8"));
const { ground } = readPalette(HERE, { stopAt: STORY });

async function resolvePhotos(entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const path = join(HERE, entry.photograph);
      const bytes = await readFile(path);
      const meta = readImageMeta(bytes);
      checkOrientation(bytes, path);
      return {
        label: basename(path),
        bytes,
        dataUri: toDataUri(bytes, meta.mime),
        intrinsicWidth: meta.width,
        intrinsicHeight: meta.height,
        alt: entry.alt ?? "",
        credit: entry.credit ?? "",
        caption: entry.year,
        note: entry.note,
      };
    }),
  );
}

function frameFor(name) {
  const row = sizeFor(name);
  return { width: row.width, height: row.height, minTypePx: row.minTypePx, stage: row.stage };
}

function markup(photos, frame) {
  return renderToStaticMarkup(
    createElement(QuaySequence, { photos, title: TITLE, ground, frame }),
  );
}

// ── PASS 1 — the frozen manifest, untouched ──────────────────────────────────────────────────
console.log("PASS 1 — source/data.csv exactly as intake froze it:");
for (const row of MANIFEST) {
  console.log(
    `  ${row.photograph}  alt=${JSON.stringify(row.alt)}  credit=${JSON.stringify(row.credit)}`,
  );
}
try {
  quayLayout(await resolvePhotos(MANIFEST), TITLE, frameFor("landscape"));
  console.log("  (unexpected: did not throw)");
} catch (error) {
  console.log(`  REFUSED: ${error.message}`);
}

// ── PASS 2 — round two's bracketed placeholder, back through the guard ───────────────────────
console.log("\nPASS 2 — round two's workaround: the gap named inside [brackets]:");
const bracketed = MANIFEST.map((row) => ({
  ...row,
  alt: row.alt.trim() ? row.alt : "[alt text not supplied by the newsroom]",
  credit: row.credit.trim() ? row.credit : "[credit not supplied by the newsroom]",
}));
{
  const svg = markup(await resolvePhotos(bracketed), frameFor("landscape"));
  console.log(`  rendered without throwing (${svg.length} bytes of SVG)`);
  console.log(`  photosDeclareAltAndCredit: ${JSON.stringify(photosDeclareAltAndCredit(svg))}`);
}

// ── PASS 3 — the absences stated in prose a person wrote ─────────────────────────────────────
console.log("\nPASS 3 — the same absences, stated in prose:");
const stated = MANIFEST.map((row) => ({
  ...row,
  alt: row.alt.trim() ? row.alt : NO_CAPTION_SURVIVES,
  credit: row.credit.trim() ? row.credit : NOT_STATED,
  note: row.alt.trim() ? "" : "No caption or photographer came with this frame.",
}));
{
  const svg = markup(await resolvePhotos(stated), frameFor("landscape"));
  console.log(`  rendered without throwing (${svg.length} bytes of SVG)`);
  console.log(`  photosDeclareAltAndCredit: ${JSON.stringify(photosDeclareAltAndCredit(svg))}`);
}

// ── PASS 4 — the beat that ships ─────────────────────────────────────────────────────────────
console.log("\nPASS 4 — the delivered beat:");
const photos = await resolvePhotos(stated);
checkWeight(photos);

const size = await readPinnedSize(HERE, { readFile, dirname, join });
const row = sizeFor(size);
console.log(`  BRIEF.md pins size: ${size} (${row.width}x${row.height}, minTypePx ${row.minTypePx})`);

const frame = frameFor(size);
const layout = quayLayout(photos, TITLE, frame);
if (layout.width !== row.width || layout.height !== row.height) {
  throw new Error(
    `this beat draws at ${layout.width}x${layout.height} but BRIEF.md pins ${size} (${row.width}x${row.height})`,
  );
}

const svg = markup(photos, frame);

const duplicated = duplicatedPayload(svg);
if (duplicated.length) {
  const mb = (n) => (n / (1024 * 1024)).toFixed(2);
  throw new Error(
    "this beat embeds the same photograph more than once: " +
      duplicated.map((d) => `${d.copies} copies of one ${mb(d.bytes)} MB asset, ${mb(d.wastedBytes)} MB wasted`).join("; "),
  );
}

// Every font-size the markup actually carries, against the row's own floor. `image-beat` has no
// `assertTypeFloor` of its own; this is the same reading `chart-beat`'s does, made here by hand.
const tokens = [...svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]));
const under = [...new Set(tokens)].filter((px) => px < row.minTypePx).sort((a, b) => a - b);
if (under.length) {
  throw new Error(
    `type below the ${size} floor of ${row.minTypePx}px: ${under.join(", ")}px`,
  );
}

// Drawn at the export size, so it is rasterised 1:1 — `renderStill`'s `scale` default of 2 is the
// un-migrated path and would deliver 3840x2160 for a beat that pinned 1920x1080.
const { svgPath, pngPath } = await renderStill({
  element: createElement(QuaySequence, { photos, title: TITLE, ground, frame }),
  width: layout.width,
  height: layout.height,
  outDir,
  name: "still",
  scale: 1,
});

const png = await readFile(pngPath);
assertDeliveredSize(readPngSize(png), size, { what: basename(pngPath) });

const svgBytes = (await readFile(svgPath)).length;
const weight = weightAgainstCeiling(svgBytes, CEILING_BYTES);
if (weight.over) {
  throw new Error(`${basename(svgPath)} weighs ${weight.bytes} bytes, over this format's ${weight.ceiling}-byte ceiling`);
}

const declares = photosDeclareAltAndCredit(svg);
console.log(`  photosDeclareAltAndCredit: ${JSON.stringify(declares)}`);
console.log(`  delivered size: ${JSON.stringify(readPngSize(png))} against pinned ${size}`);
console.log(`  svg weight: ${weight.bytes} / ${weight.ceiling} bytes`);
console.log(`  type tokens: ${[...new Set(tokens)].sort((a, b) => a - b).join(", ")}px (floor ${row.minTypePx})`);
console.log(`  rendered: ${pngPath}`);
console.log("  now open it and look at it.");

// ── PROBE — the same beat at the one size no stress round has ever pinned ────────────────────
//
// Not a delivery: this beat's gate-2c answer is `landscape`. It is rendered because `portrait` is
// the size with a STAGE band (269..1248 of 1920, Meta's own Stories safe zone) and a 36 px type
// floor, and because nothing in `image-beat` knows either number exists. Look at it.
console.log("\nPROBE — the same three photographs at portrait (1080x1920):");
{
  const portrait = frameFor("portrait");
  // FIRST, inside the stage band a Stories frame actually leaves uncovered.
  try {
    quayLayout(photos, TITLE, portrait);
    console.log("  inside the stage band: laid out");
  } catch (error) {
    console.log(`  inside the stage band (269..1248): REFUSED — ${error.message}`);
  }
  // THEN edge to edge, which is what a producer that has never heard of the band does — and
  // `image-beat` has never heard of it, because it carries no size table at all.
  portrait.stage = null;
  const layoutP = quayLayout(photos, TITLE, portrait);
  const svgP = markup(photos, portrait);
  const tokensP = [...new Set([...svgP.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  const underP = tokensP.filter((px) => px < portrait.minTypePx);
  const out = await renderStill({
    element: createElement(QuaySequence, { photos, title: TITLE, ground, frame: portrait }),
    width: layoutP.width,
    height: layoutP.height,
    outDir: probeDir,
    name: "portrait-probe",
    scale: 1,
  });
  const pngP = await readFile(out.pngPath);
  assertDeliveredSize(readPngSize(pngP), "portrait", { what: basename(out.pngPath) });
  console.log(`  drawn edge to edge: y ${layoutP.stage.top}..${layoutP.stage.bottom} of ${portrait.height}`);
  console.log(`  type tokens: ${tokensP.join(", ")}px (floor ${portrait.minTypePx}) — under floor: ${underP.length ? underP.join(", ") : "none"}`);
  console.log(`  photosDeclareAltAndCredit: ${JSON.stringify(photosDeclareAltAndCredit(svgP))}`);
  console.log(`  rendered: ${out.pngPath}`);
}

await mkdir(receiptDir, { recursive: true });
await writeFile(
  join(receiptDir, "guards.json"),
  JSON.stringify(
    {
      photosDeclareAltAndCredit: declares,
      deliveredSize: readPngSize(png),
      pinnedSize: size,
      duplicatedPayload: duplicated,
      weightAgainstCeiling: weight,
      typeTokens: [...new Set(tokens)].sort((a, b) => a - b),
    },
    null,
    2,
  ),
);

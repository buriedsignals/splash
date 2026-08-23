// Producer for beat 1 of `r8-photographs-halemaumau-filling` — image / static, size landscape.
//
// The machinery is this beat's own vendored copies of the image format's scripts
// (`skills/image-beat/scripts/render-still.mjs`, `verify-image.mjs`, `sizes.mjs`,
// `detect-every-photo-says-what-it-shows.mjs`, `detect-weight-has-a-ceiling.mjs`,
// `detect-fills-its-frame.mjs`, `compare-png.mjs`).
//
// THREE PASSES. The first two exist to be READ, not to ship:
//
//   1. THE FROZEN MANIFEST, EXACTLY AS `source/data.csv` HOLDS IT. Expected to be refused. The
//      refusal is not swallowed: the pass loops, supplying the ONE field each refusal names, and
//      counts the round trips it took to reach a beat that would draw. That count is the
//      measurement — this format refuses one field at a time, and three gaps in a three-photograph
//      manifest cost three separate runs.
//   2. THE SEED'S OWN CAPTION ARITHMETIC, run on this beat's numbers. `ImageBeatSeed` computes
//      `captionTop = boxTop + BOX_HEIGHT + CAPTION_TOP_GAP` and draws the caption at that value as
//      an SVG `y`, which is a BASELINE and not a top. The pass prints where the seed's rule would
//      put the caption's own cap height relative to the bottom of the letterbox bar above it, and
//      where this beat's rule puts it.
//   3. THE BEAT THAT SHIPS. Renders, then measures: the delivered PNG's own size, the type floor
//      off the rendered markup, every photograph's declared alt and credit, the embedded payload's
//      weight against the base64 ceiling, no payload embedded twice, and the fraction of the frame
//      the drawing actually fills.

import { createElement } from "react";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderStill,
  readImageMeta,
  readOrientation,
  checkOrientation,
  checkWeight,
  readPalette,
  toDataUri,
  measureText,
} from "./render-still.mjs";
import { duplicatedPayload } from "./verify-image.mjs";
import { photosDeclareAltAndCredit } from "./detect-every-photo-says-what-it-shows.mjs";
import { weightAgainstCeiling, CEILING_BYTES } from "./detect-weight-has-a-ceiling.mjs";
import {
  graphicFillsItsFrame,
  frameFillFraction,
  FLOOR_FRACTION,
} from "./detect-fills-its-frame.mjs";
import {
  readPinnedSize,
  sizeFor,
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPngSize,
  frameInsetFor,
} from "./sizes.mjs";
import { CraterFilling, craterLayout } from "./CraterFilling.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

const outFlag = process.argv.indexOf("--out");
const outDir = outFlag !== -1 ? process.argv[outFlag + 1] : join(HERE, "renders");
// NOT under `renders/`: `deliver`'s owned-file form copies the WHOLE of `renders/` into
// `export/<outputId>/`, so working material left there reaches the newsroom as part of the
// delivery. Receipts and probes live beside it.
const receiptDir = outFlag !== -1 ? outDir : HERE;

// ─── the journalist's own words ───────────────────────────────────────────────────────────────

const TITLE = "Kīlauea is refilling the hole it blew in itself";

const DECK =
  "Sixty per cent of the void the 2018 collapse left in Halemaʻumaʻu has been filled back in, the " +
  "observatory says, raising the crater floor 490 metres. The vents are still 65 metres below the rim.";

const FOOTER =
  "Photographs: USGS Hawaiian Volcano Observatory, public domain. Figures quoted from USGS HVO, “Volcano Watch — When will " +
  "Halemaʻumaʻu fill with lava?”, 16 July 2026 — nothing here is computed by us. Buried Signals · 23 August 2026.";

// The three photographs, in the DESK's order, keyed by the file name the frozen manifest holds so
// the join to `source/data.csv` is by name and never by position.
const ORDER = [
  "episode_1_vs_50.jpg",
  "multimediaFile-4684.jpg",
  "multimediaFile-4699.jpg",
];

// Every caption names the date and the episode that produced the state its photograph shows — the
// lesson `STORYBOARD.md` records off reference row 4. The journalist's sentences, not the
// observatory's captions and not this script's.
const CAPTIONS = {
  "episode_1_vs_50.jpg":
    "Episode 1 above; episode 50, eighteen months later, below.",
  "multimediaFile-4684.jpg":
    "16 July 2026, after episode 51: the western floor resurfaced.",
  "multimediaFile-4699.jpg":
    "12 August 2026, episode 53: the north vent fountaining into the crater.",
};

// THE FIELDS THE FROZEN MANIFEST DOES NOT CARRY, answered by the desk, one per gap, and recorded
// here rather than typed into the manifest — the manifest is frozen and stays as it arrived.
//
// `alt` for the webcam pair: written by a person who opened the file and looked at it. USGS
// publishes a caption and a usage line and no alt text at all, so this field arrived empty for
// every photograph in the manifest; two were written at the desk before hand-over and this one
// was not. It is written now, by hand, because nothing mechanical may write it.
//
// `credit` for the webcam pair: the manifest's `credit` cell is empty. The observatory's own
// caption ends "USGS webcam images." — there is a rightsholder and there is no photographer, and
// the credit says exactly that.
const DESK_ANSWERS = {
  "episode_1_vs_50.jpg": {
    alt:
      "Two frames from one fixed webcam, one above the other. In the upper frame, dated 23 December 2024, " +
      "the crater is a deep bowl: a tall banded tan wall stands well above a dark sunken floor. In the lower " +
      "frame, dated 27 June 2026, that floor has risen into a wide flat grey plain and the wall above it is " +
      "far shorter. A small red lava fountain plays at the left edge of both frames.",
    credit: "USGS webcam images; no photographer",
  },
};

// ─── read the frozen record ───────────────────────────────────────────────────────────────────

/** RFC-4180 enough for the frozen file: quoted fields, embedded commas, doubled quotes. Carried
 *  rather than imported, the same rule every other file in this directory follows. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

const csv = parseCsv(await readFile(join(STORY, "source", "data.csv"), "utf8"));
const header = csv[0];
const manifest = new Map(
  csv.slice(1).map((r) => [r[header.indexOf("file")], Object.fromEntries(header.map((h, i) => [h, r[i]]))]),
);

const { ground, accent } = readPalette(HERE, { stopAt: STORY });

// Read every photograph's real bytes and refuse what is not safe to embed, before any element is
// built. `readImageMeta` reads the intrinsic size out of the JPEG's own Start-Of-Frame marker;
// `checkOrientation` reads the EXIF tag and throws on anything but "normal".
const orientationSeen = {};
const resolved = await Promise.all(
  ORDER.map(async (file) => {
    const bytes = await readFile(join(HERE, file));
    const meta = readImageMeta(bytes);
    checkOrientation(bytes, file);
    orientationSeen[file] = readOrientation(bytes);
    return {
      // `label`, not `path`. `checkWeight` names its offenders off `img.label`, and
      // `image-beat/SKILL.md`'s own worked example builds `{...f}` from `{ path, ... }`, which
      // makes the refusal read "undefined (12.5 MB)". Recorded in NOTES-FOR-MAINTAINER.md.
      label: file,
      bytes,
      dataUri: toDataUri(bytes, meta.mime),
      intrinsicWidth: meta.width,
      intrinsicHeight: meta.height,
      caption: CAPTIONS[file],
    };
  }),
);
checkWeight(resolved);

// ─── PASS 1 — the frozen manifest, exactly as it arrived ──────────────────────────────────────

const frozenPhotos = resolved.map((p) => ({
  ...p,
  alt: manifest.get(p.label).alt,
  credit: manifest.get(p.label).credit,
}));

const roundTrips = [];
const working = frozenPhotos.map((p) => ({ ...p }));
for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    craterLayout(working, TITLE, DECK, FOOTER);
    roundTrips.push({ attempt, refusal: null, filled: null });
    break;
  } catch (error) {
    const message = error.message;
    // Supply exactly the one field this refusal names, the way a journalist answering it would.
    const which = /^photo (\d+) of \d+/.exec(message);
    const index = which ? Number(which[1]) - 1 : -1;
    const field = /has no alt text/.test(message)
      ? "alt"
      : /has no credit/.test(message)
        ? "credit"
        : null;
    if (index < 0 || !field) {
      roundTrips.push({ attempt, refusal: message, filled: null });
      break;
    }
    const file = working[index].label;
    const answer = DESK_ANSWERS[file]?.[field];
    roundTrips.push({
      attempt,
      refusal: message,
      filled: { photo: index + 1, file, field, answered: Boolean(answer) },
    });
    if (!answer) break;
    working[index][field] = answer;
  }
}

// ─── PASS 2 — the seed's own caption arithmetic, on this beat's numbers ───────────────────────

const shipped = resolved.map((p) => ({
  ...p,
  alt: manifest.get(p.label).alt || DESK_ANSWERS[p.label]?.alt,
  credit: manifest.get(p.label).credit || DESK_ANSWERS[p.label]?.credit,
}));
const layout = craterLayout(shipped, TITLE, DECK, FOOTER);
const CAPTION_FONT_SIZE = 33;
const CAPTION_TOP_GAP = 22;
const boxBottom = layout.blocks[0].boxTop + layout.blocks[0].boxHeight;
// The conventional cap-height ratio `assertWithinStage` itself uses to turn a baseline into ink.
const CAP_HEIGHT_RATIO = 0.75;
const seedRule = {
  captionBaseline: boxBottom + CAPTION_TOP_GAP,
  inkTop: boxBottom + CAPTION_TOP_GAP - CAPTION_FONT_SIZE * CAP_HEIGHT_RATIO,
};
const thisRule = {
  captionBaseline: layout.blocks[0].captionFirstBaseline,
  inkTop: layout.blocks[0].captionFirstBaseline - CAPTION_FONT_SIZE * CAP_HEIGHT_RATIO,
};
const captionArithmetic = {
  boxBottom,
  namedGapPx: CAPTION_TOP_GAP,
  seed: { ...seedRule, gapBelowBox: seedRule.inkTop - boxBottom },
  thisBeat: { ...thisRule, gapBelowBox: thisRule.inkTop - boxBottom },
  says:
    `the seed's own rule puts the caption's ink ${(seedRule.inkTop - boxBottom).toFixed(1)}px below ` +
    `the bottom of the letterbox bar, against the ${CAPTION_TOP_GAP}px its constant is named for; ` +
    `this beat adds the font size and lands at ${(thisRule.inkTop - boxBottom).toFixed(1)}px`,
};

// ─── PASS 3 — the beat that ships ─────────────────────────────────────────────────────────────

const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
const row = sizeFor(pinned);
if (frameInsetFor(pinned) !== layout.pad)
  throw new Error(
    `this component's PAD is ${layout.pad} and frameInsetFor(${JSON.stringify(pinned)}) is ` +
      `${frameInsetFor(pinned)} — the frame's margin is the size table's, not the component's`,
  );

await mkdir(outDir, { recursive: true });
const element = createElement(CraterFilling, {
  photos: shipped,
  title: TITLE,
  deck: DECK,
  footer: FOOTER,
  ground,
  accent,
});
const { svgPath, pngPath } = await renderStill({
  element,
  width: row.width,
  height: row.height,
  outDir,
  name: "still",
  // 1:1, because this beat pins an export size. `renderStill`'s own default is 2 and its source
  // comment says a size-pinned beat passes 1; SKILL.md's worked example and its tuning-knob table
  // do not, and following them delivers a 3840x2160 PNG that `assertDeliveredSize` refuses.
  scale: 1,
});

const svg = renderToStaticMarkup(element);
const png = await readFile(pngPath);

// EVERY GUARD THIS BEAT DECLARES IS CALLED HERE, off what actually shipped — never only from a
// test. A decision nothing calls is a decision that does not run.
assertDeliveredSize(readPngSize(png), pinned, { what: "the delivered still.png" });
assertTypeFloor(svg, pinned, { what: "this beat's still" });
assertWithinStage(svg, pinned, { what: "this beat's still" });

const declared = photosDeclareAltAndCredit(svg);
if (declared.photos !== shipped.length)
  throw new Error(`the markup carries ${declared.photos} photo groups, not ${shipped.length}`);
if (declared.missingAlt || declared.missingCredit)
  throw new Error(
    `the delivered markup is missing ${declared.missingAlt} alt and ${declared.missingCredit} credit`,
  );

const embedded = weightAgainstCeiling(Buffer.byteLength(svg, "utf8"), CEILING_BYTES);
if (embedded.over)
  throw new Error(
    `the delivered SVG is ${embedded.bytes} bytes, over the ${embedded.ceiling} byte ceiling`,
  );

const duplicated = duplicatedPayload(svg);
if (duplicated.length)
  throw new Error(
    `a payload is embedded more than once: ${JSON.stringify(duplicated.slice(0, 2))}`,
  );

// NOTHING IN THIS FORMAT MEASURES A RUN THAT OVERFLOWS ITS OWN COLUMN. `decollide`
// (`render-still.mjs`) resolves VERTICAL collisions between label anchors and has no caller here;
// `photosDeclareAltAndCredit` reads the markup and never the geometry; `assertTypeFloor` reads
// sizes and never widths. The first render of this beat put "USGS webcam images — no photographer
// stated" 87px into the next photograph's credit, and every guard above answered green. So the
// beat measures it itself, off the rendered markup, the same way the format's own assertions do.
// STATED SCOPE: a run belongs to a column only when its baseline sits in the caption/credit band
// BELOW the boxes. The title, the deck and the footer are drawn at the same x as column 1 and run
// the full content width by design, so matching on x alone would refuse them; `bandTop` is what
// tells the two apart, and `bandBottom` — the accent rule — keeps the footer out of it too.
function runsOutsideTheirColumns(markup, columns, insetRight, bandTop, bandBottom) {
  const over = [];
  for (const m of markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    const x = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const size = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    const weight = Number(/font-weight="(\d+)"/.exec(attrs)?.[1] ?? 400);
    const words = m[2].replace(/<[^>]*>/g, "");
    if (!Number.isFinite(x) || !words.trim()) continue;
    const y = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const column =
      Number.isFinite(y) && y >= bandTop && y <= bandBottom
        ? columns.find((c) => c.left === x)
        : undefined;
    const right = column ? column.left + column.width : insetRight;
    const end = x + measureText(words, { fontSize: size, fontWeight: weight });
    if (end > right + 0.5)
      over.push({ text: words.slice(0, 44), x, endsAt: Math.round(end), allowedTo: right });
  }
  return over;
}
const columns = layout.blocks.map((b) => ({ left: b.boxLeft, width: b.boxWidth }));
const overrun = runsOutsideTheirColumns(
  svg,
  columns,
  layout.pad + layout.contentWidth,
  layout.blocks[0].boxTop + layout.blocks[0].boxHeight,
  layout.ruleY,
);
if (overrun.length)
  throw new Error(
    `${overrun.length} run(s) draw past the right edge of their own column: ` +
      `${overrun.map((o) => `"${o.text}" ends at ${o.endsAt}, allowed to ${o.allowedTo}`).join("; ")}`,
  );

const fill = frameFillFraction(png);
const fills = graphicFillsItsFrame(fill.fraction, FLOOR_FRACTION);
if (fills.under)
  throw new Error(
    `the drawing fills ${(fills.fraction * 100).toFixed(1)}% of the frame, under this format's ` +
      `${(fills.floor * 100).toFixed(1)}% floor`,
  );

const receipt = {
  pinnedSize: pinned,
  deliveredSize: readPngSize(png),
  photos: shipped.map((p) => ({
    file: p.label,
    intrinsic: { width: p.intrinsicWidth, height: p.intrinsicHeight },
    aspect: Number((p.intrinsicWidth / p.intrinsicHeight).toFixed(3)),
    exifOrientation: orientationSeen[p.label],
    rawBytes: p.bytes.length,
    box: { width: layout.boxWidth, height: layout.boxHeight },
    drawn: {
      width: Math.round(layout.blocks[shipped.indexOf(p)].fit.drawWidth),
      height: Math.round(layout.blocks[shipped.indexOf(p)].fit.drawHeight),
    },
    letterbox: {
      x: Math.round(layout.blocks[shipped.indexOf(p)].fit.offsetX),
      y: Math.round(layout.blocks[shipped.indexOf(p)].fit.offsetY),
    },
  })),
  photosDeclareAltAndCredit: declared,
  weightAgainstCeiling: embedded,
  duplicatedPayload: duplicated,
  graphicFillsItsFrame: fills,
  runsOutsideTheirColumns: overrun,
  typeTokens: [...new Set([...svg.matchAll(/font-size="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1])))].sort(
    (a, b) => a - b,
  ),
  minTypePx: row.minTypePx,
  frozenManifestRoundTrips: roundTrips,
  captionArithmetic,
  titleMeasuredPx: Math.round(measureText(TITLE, { fontSize: 57, fontWeight: 700 })),
};

await mkdir(receiptDir, { recursive: true });
await writeFile(join(receiptDir, "guards.json"), `${JSON.stringify(receipt, null, 2)}\n`);

console.log(`svg: ${svgPath}`);
console.log(`png: ${pngPath}`);
console.log(JSON.stringify(receipt, null, 2));

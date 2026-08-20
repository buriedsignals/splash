// twin/skills/image-beat/scripts/render-still.mjs
//
// This skill's OWN copy of the rasteriser — `deriveFurniture`/`contrast`/`measureText`/
// `renderStill` are byte-for-byte the same rule `chart-beat/scripts/render-still.mjs` and
// `scrolly/scripts/render-still.mjs` already carry. A skill never imports another skill's
// copy of its own machinery — see `chart-beat/SKILL.md`, Architecture, "A beat does not
// import this file from here" — so this file exists a third time rather than once, shared.
//
// The format-specific addition below `renderStill` is what a photograph needs that a drawn chart
// never does: reading a raster file's own intrinsic size and (for a JPEG) its EXIF orientation,
// fitting it into a fixed box without cropping or stretching, encoding it as a `data:` URI so the
// SVG this skill emits never references an external file, and refusing to render — loudly — past
// a total-weight ceiling. See `references/image-discipline.md` for the doctrine each function
// below is written under.
//
// Runs inside a Splash root: uses `react-dom/server` and `@resvg/resvg-js` from the root's
// dependencies, the same as its sibling copies.

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The one font stack. Matches the seed's own draw font — see `chart-beat/render-still.mjs`
 *  for why a mismatch here would make every measured gutter a lie. */
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(ground, toward, ratio) {
  const target = channels(toward);
  return (
    "#" +
    channels(ground)
      .map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** See `chart-beat/scripts/render-still.mjs` for the full derivation and the mid-grey
 *  counter-example a luminance threshold gets wrong. Identical rule, own copy. */
export function deriveFurniture(ground) {
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const ink = contrast("#000000", ground) >= contrast("#FFFFFF", ground) ? "#000000" : "#FFFFFF";
  let muted = ink;
  for (let step = 31; step <= 50; step++) {
    const candidate = mix(ground, ink, step / 50);
    if (contrast(candidate, ground) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  return { ink, muted, grid: mix(ground, ink, 0.18) };
}

const measured = new Map();

/**
 * The two colours a beat is drawn in — the ground and the one accent that carries the argument —
 * read back from the decision the journalist actually made.
 *
 * This lives HERE, beside `deriveFurniture`, rather than in `palette` where it is proposed: a
 * beat already imports this module to render at all, and a second import path for two colours is
 * one more thing to get wrong. `palette` owns the question; this owns the answer. The two
 * copies are the deliberate kind, guarded against drift by `helper-parity.test.ts`.
 *
 * Looks for `PALETTE.md` in `dir`, then in each ancestor up to `stopAt` — so one decision recorded
 * at the story root serves every beat under it, and a beat that genuinely needs its own can hold
 * one beside its data.
 *
 * This is a LOOKUP path, never a colour fallback. A search that finds nothing THROWS, naming every
 * directory it looked in. That is the point: a render that quietly defaulted to black-on-white
 * would publish a chart in a colour nobody chose, and it would look deliberate. Before this
 * existed, every beat named its colours as hex literals with a `// from NEWSROOM.md` comment
 * beside them — an instruction to copy by eye, which is exactly how a newsroom's identity gets
 * collected and then never used.
 */
export function readPalette(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    searched.push(candidate);
    if (existsSync(candidate)) return parsePalette(readFileSync(candidate, "utf8"), candidate);
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No PALETTE.md found for ${start}. This beat refuses to render without one, deliberately: a ` +
      `colour nobody chose would publish a newsroom's identity by accident.\n` +
      `Next: call proposePalette({ newsroom, subject }) and formatProposal(...) ` +
      `(skills/palette/scripts/palette.mjs, skills/palette/scripts/format-proposal.mjs), show the ` +
      `printed proposal to the journalist, and record their answer in PALETTE.md ` +
      `(skills/palette/assets/PALETTE.example.md is the shape) at or above this beat.\n` +
      `When no journalist is available to answer right now, the proposal's own measurement is ` +
      `the default: call proposePalette and read its recommended field. A named option WRITES ` +
      `— use exactly its ground and accent (and accents, when the newsroom carries more), set ` +
      `origin to that option's own origin, and say in the file's own prose that no journalist ` +
      `answered and which option was recorded — the shape every unattended stress story already ` +
      `carries. Never invent a colour and never record one that failed the 3:1 floor. A null ` +
      `recommendation — nothing passed — is the one case with no safe default: print the ` +
      `proposal and end the turn there, the same rule this project's every other human gate ` +
      `follows.\n` +
      `Looked in:\n  ${searched.join("\n  ")}`,
  );
}

export function parsePalette(text, source = "PALETTE.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${source} has no front matter`);
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const field of ["ground", "accent"]) {
    if (!record[field]) throw new Error(`${source} is missing ${field}`);
    if (!HEX.test(record[field])) {
      throw new Error(`${source}: ${field} must be #rrggbb, got ${JSON.stringify(record[field])}`);
    }
  }
  if (!["newsroom", "subject", "journalist"].includes(record.origin)) {
    throw new Error(
      `${source}: origin must be newsroom, subject or journalist — got ${JSON.stringify(record.origin)}. ` +
        `It records WHO chose these colours, and a render is allowed to say so.`,
    );
  }
  const further = String(record.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const hex of further) {
    if (!HEX.test(hex)) {
      throw new Error(
        `${source}: every entry in accents must be #rrggbb, got ${JSON.stringify(hex)}. ` +
          `accents lists the FURTHER house colours beside the primary one, comma-separated.`,
      );
    }
  }
  const all = [record.accent, ...further];
  const accents = all.filter((hex, index) => all.indexOf(hex) === index);
  for (const hex of accents) {
    assertLegible(hex, record.ground, {
      role: "mark",
      where: `${source}: the accent ${hex}`,
    });
  }
  return {
    ground: record.ground,
    accent: record.accent,
    accents,
    origin: record.origin,
    source,
  };
}

/**
 * THE TWO FLOORS, AND WHY THEY ARE NOT ONE NUMBER.
 *
 * WCAG sets two different minimums for two different things, and collapsing them is the mistake
 * that looks like rigour (`palette/references/contrast-floors.md` argues it at length):
 *
 *   - `mark` — 3:1, SC 1.4.11 Non-text Contrast. The visual information a reader identifies a
 *     GRAPHICAL OBJECT by: the line, the bar, the circle, a choropleth class against the ground.
 *     An accent carries no text, and holding it to a text threshold rejects perfectly legible
 *     house colours for failing a criterion they were never subject to.
 *   - `text` — 4.5:1, SC 1.4.3 Contrast (Minimum). Words.
 *   - `largeText` — 3:1, the same criterion's own relaxation for 24px, or 18.66px bold, or larger.
 *     It is a relaxation of the TEXT rule, not the mark rule, and it exists here so a caller who
 *     needs it names it rather than reaching for `mark` because the number happens to match.
 */
export const NON_TEXT_CONTRAST_MIN = 3;
export const TEXT_CONTRAST_MIN = 4.5;
export const LARGE_TEXT_CONTRAST_MIN = 3;

/**
 * The nearest variant of `colour` that clears `min` against `ground`, found by walking it toward
 * whichever pole the ground is NOT — darkening on a light ground, lightening on a dark one — in 2%
 * steps and stopping at the first step that passes.
 *
 * It returns a REMEDY, never a replacement. Nothing in this file ever swaps it in: a render that
 * quietly substituted the nearest passing colour would put a hex nobody chose into a published
 * chart, and the journalist, seeing a colour that is not their brand, would have no way to learn
 * why. It is shown in the refusal so the answer is one edit away.
 *
 * A verbatim duplicate of `palette/scripts/palette.mjs`'s, deliberately — that skill owns the
 * question and this file owns the answer, and neither imports the other. `helper-parity.test.ts`
 * compares them over a table of colours and grounds.
 *
 * Returns `null` when no step passes. Measured over 4352 grounds in `palette`: zero nulls at
 * 3:1, zero at 4.5, the first at 5 — so the branch is for a caller who raises the floor, not for a
 * ground that defeats the default.
 */
export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? "#000000" : "#FFFFFF";
  for (let step = 1; step <= 50; step++) {
    const candidate = mix(colour, towards, step / 50);
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * REFUSE A COLOUR A READER CANNOT SEE, AND SAY WHAT WAS MEASURED.
 *
 * `palette`'s proposal measures every option it offers and never recommends one that fails.
 * That is the first line, and it is the only one that existed until now — measured on 2026-08-10,
 * a `PALETTE.md` recording `accent: "#FFFF00"` on `ground: "#FFFFFF"` (1.07:1) rendered a clean
 * PNG with no warning at all, the beat's whole number set in yellow on white.
 *
 * A `PALETTE.md` can be written by hand, copied from another story, or produced by a path that
 * never asked — `newsroom-charter` proposes a `brandColor` and a `ground` off a newsroom's
 * own site. So the floor is measured HERE too, where the colour meets the render, and the refusal
 * names the ratio, the floor, the criterion it comes from and the nearest colour that clears it.
 *
 * It refuses rather than adjusts, for the reason `adjustToContrast` states above.
 */
export function assertLegible(colour, against, { role = "mark", where = "this colour" } = {}) {
  const floors = {
    mark: {
      min: NON_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.11 Non-text Contrast",
      governs: "a graphical object a reader identifies the data by",
    },
    text: {
      min: TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum)",
      governs: "text",
    },
    largeText: {
      min: LARGE_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum), large-text relaxation",
      governs: "text at 24px, or 18.66px bold, or larger",
    },
  };
  const floor = floors[role];
  if (!floor) {
    throw new Error(
      `assertLegible: role must be mark, text or largeText — got ${JSON.stringify(role)}. ` +
        `The floors differ by criterion, so the caller has to say which one it is asking about.`,
    );
  }
  if (!HEX.test(colour)) throw new Error(`${where} must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(against)) {
    throw new Error(
      `${where} is read against ${JSON.stringify(against)}, which is not #rrggbb`,
    );
  }
  const ratio = contrast(colour, against);
  if (ratio >= floor.min) return ratio;
  const remedy = adjustToContrast(colour, against, floor.min);
  throw new Error(
    `${where}: ${colour} on ${against} measures ${ratio.toFixed(2)}:1 — under the ${floor.min}:1 ` +
      `floor ${floor.criterion} sets for ${floor.governs}. A reader cannot see it. ` +
      (remedy
        ? `The nearest variant that clears the floor is ${remedy}, at ${contrast(remedy, against).toFixed(2)}:1 — ` +
          `record that, or another colour, or a ground it can be read on.`
        : `No variant of it clears that floor on this ground: choose another colour, or another ground.`),
  );
}

/**
 * CAN A READER TELL THESE TWO MARKS APART? Two measures, because one is not enough (the argument
 * and the measured numbers are in `seriesInks`'s own docblock, below).
 *
 * The hue measure is the "redmean" approximation — a weighted Euclidean distance in sRGB that
 * tracks perceived difference far better than a plain one and needs no colour-space conversion.
 * Its range is 0 to about 765.
 */
export function readApart(a, b) {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  const redmean = (r1 + r2) / 2;
  const distance = Math.sqrt(
    (2 + redmean / 256) * (r1 - r2) ** 2 +
      4 * (g1 - g2) ** 2 +
      (2 + (255 - redmean) / 256) * (b1 - b2) ** 2,
  );
  return contrast(a, b) >= 1.5 || distance >= 100;
}

/**
 * ONE INK PER SERIES, ALL OF THEM DERIVED FROM WHAT THE NEWSROOM RECORDED.
 *
 * Measured on 2026-08-10, before this existed: a multi-series beat built its fills as
 * `[accent, muted, muted]` — the house colour once and the furniture grey twice. A newsroom could
 * change its accent and two of three bands on a stacked bar would not move. `muted` is FURNITURE,
 * derived from the ground for axis labels and the source line; using it as a data ink means the
 * second and third series are drawn in a colour whose whole job is to recede.
 *
 * So: the recorded accents first, in the order the journalist recorded them — `accent` is the
 * primary and `accents` lists the rest, which is the same shape `NEWSROOM.md` uses. When a beat
 * needs more series than were recorded, further inks are DERIVED from those accents by walking
 * each a quarter, a half and three quarters of the way to the ink pole, and each derived one has
 * to earn its place twice: it clears the 3:1 mark floor against the ground, and it READS APART
 * from every ink already chosen.
 *
 * "Reads apart" is two measures, and it needs both. Measured on this tree's own accents:
 * `#0B7A75` and `#C1440E` sit at **1.01:1** against each other — a luminance test alone would
 * reject a newsroom's own two house colours as indistinguishable, which they plainly are not.
 * Conversely two shades of one hue differ only in lightness, and a hue test alone would let a
 * stacked bar ship two bands nobody can tell apart. So a candidate passes on EITHER a lightness
 * gap (1.5:1, which is what one quarter-step toward the ink measures — 1.51, 1.54, 1.55 across the
 * three rounds) or a hue gap (a redmean distance of 100 on a 0–765 scale; the teal/rust pair
 * measures 344, one quarter-step measures 62). Neither number is a WCAG floor and neither is
 * presented as one — the WCAG floor is the 3:1 against the GROUND, above.
 *
 * Three rounds means ONE recorded accent carries four series. When the walk cannot find enough it
 * THROWS and says how many were recorded against how many the beat asked for. It does not fall
 * back to grey. Recording a second accent in `PALETTE.md` is the answer, and that is a decision
 * for the newsroom rather than a default for this function.
 */
export function seriesInks(palette, count) {
  if (!palette || typeof palette !== "object" || !palette.ground || !palette.accent) {
    throw new Error(
      `seriesInks needs a parsed PALETTE record ({ground, accent, accents}), got ${JSON.stringify(palette)}`,
    );
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`seriesInks needs a positive series count, got ${JSON.stringify(count)}`);
  }
  const ground = palette.ground;
  const recorded =
    Array.isArray(palette.accents) && palette.accents.length > 0
      ? palette.accents
      : [palette.accent];
  const { ink } = deriveFurniture(ground);
  const chosen = recorded.slice(0, count);
  for (let round = 1; chosen.length < count && round <= 3; round++) {
    for (const accent of recorded) {
      if (chosen.length >= count) break;
      const candidate = mix(accent, ink, round / 4);
      const clearsTheFloor = contrast(candidate, ground) >= NON_TEXT_CONTRAST_MIN;
      const readsApart = chosen.every((taken) => readApart(taken, candidate));
      if (clearsTheFloor && readsApart) chosen.push(candidate);
    }
  }
  if (chosen.length < count) {
    throw new Error(
      `this beat draws ${count} series and ${palette.source || "the recorded palette"} holds ` +
        `${recorded.length} accent${recorded.length === 1 ? "" : "s"} (${recorded.join(", ")}). ` +
        `Shading them apart on ${ground} ran out at ${chosen.length}: the further shades either fell ` +
        `under the ${NON_TEXT_CONTRAST_MIN}:1 mark floor or read as one of the ones already chosen. ` +
        `Record more accents — accents: "#…, #…" beside accent: — rather than letting a series be ` +
        `drawn in a colour nobody chose.`,
    );
  }
  return chosen;
}

/** Identical contract to `chart-beat`'s own `measureText` — see that file for why the second
 *  argument must be an options object and why a missing `fontSize` throws instead of guessing. */
export function measureText(text, options) {
  if (!text) return 0;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(
      `measureText's second argument must be an options object shaped { fontSize, fontWeight?, fontFamily? }, got ${JSON.stringify(options)} (${typeof options})`,
    );
  }
  const { fontSize, fontWeight = 400, fontFamily = FONT_FAMILY } = options;
  if (typeof fontSize !== "number" || !Number.isFinite(fontSize)) {
    throw new Error(
      `measureText's options.fontSize must be a finite number, got ${JSON.stringify(fontSize)} — a missing fontSize silently defaults to resvg's own size and under-measures`,
    );
  }
  const key = `${fontFamily}|${fontWeight}|${fontSize}|${text}`;
  if (measured.has(key)) return measured.get(key);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const probe =
    `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="400">` +
    `<text x="0" y="300" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}">${escaped}</text>` +
    `</svg>`;
  const box = new Resvg(probe, { font: { loadSystemFonts: true } }).getBBox();
  const width = box ? box.x + box.width : 0;
  measured.set(key, width);
  return width;
}

/** Render one React element to an SVG on disk and a PNG beside it. Identical contract to the
 *  chart format's own `renderStill` — see that file for why rasterising at a size the element was
 *  not drawn at is refused rather than silently scaled. */
export async function renderStill({
  element,
  width,
  height,
  outDir,
  name,
  // HOW MANY DEVICE PIXELS PER FRAME PIXEL, and it is a migration rather than a preference.
  //
  // The frame IS the export size and it should be rasterised 1:1. Task 0 of the export-size spec
  // measured that: resvg is a VECTOR rasteriser, so a 1920x1080 frame at 1x and a 960x540 frame at
  // 2x are indistinguishable in their TYPE, and what actually differs is that at 2x every
  // `strokeWidth` and `strokeDasharray` DOUBLES — a component asking for a 1px gridline is
  // delivered a 2px one, and a `"6 4"` dash arrives as `"12 8"`. The rasteriser was taking a design
  // decision the component believed it had taken.
  //
  // The default stays 2 because the un-migrated statics are still drawn at 900x560 and its
  // neighbours, and retiring it for them would ship 900px stills. A beat that pins an export size
  // passes 1, and its delivered PNG then measures exactly what gate 2c chose. The remaining count
  // is held by `splash/test/delivered-size-matches-the-pin.test.ts` as a number that may only
  // go down — an inconsistency with a ratchet on it rather than an inconsistency.
  scale = 2,
}) {
  const svg = renderToStaticMarkup(element);
  if (!svg.startsWith("<svg")) throw new Error(`renderStill expects an element whose root is <svg>, got ${svg.slice(0, 40)}`);

  const drawn = { width: Number(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)?.[1]), height: Number(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)?.[1]) };
  if (drawn.width !== width || drawn.height !== height) {
    throw new Error(`asked to render at ${width}x${height}, but the element is drawn at ${drawn.width}x${drawn.height}`);
  }

  await mkdir(outDir, { recursive: true });
  const svgPath = join(outDir, `${name}.svg`);
  const pngPath = join(outDir, `${name}.png`);
  await writeFile(svgPath, svg);
  await writeFile(pngPath, rasterise(svg, width, scale));
  return { svgPath, pngPath };
}

function rasterise(svg, width, scale = 2) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: true },
    fitTo: { mode: "width", value: width * scale },
  }).render();
  return image.asPng();
}

// ===================== image-format additions =====================
// Nothing below this line has a sibling in `chart-beat`. A photograph is a raster file this
// skill did not draw, which is what all four of these exist to handle: reading its real size,
// refusing one an image viewer would silently rotate, fitting it into a shared box without lying
// about its shape, and keeping the embedded total honest.

/**
 * The MIME type + intrinsic pixel size of a PNG or JPEG, read from the file's own bytes — never
 * assumed from the extension, and never decoded through a library that would also try to correct
 * anything (see `checkOrientation` below for why correction is refused rather than attempted).
 *
 * PNG: the IHDR chunk is fixed at bytes 16..24 (8-byte signature, 4-byte length, 4-byte "IHDR",
 * then 4-byte width, 4-byte height, both big-endian) in every conformant PNG — there is nothing to
 * search for.
 *
 * JPEG: dimensions live in the first Start-Of-Frame marker (0xC0-0xCF, excluding the DHT/JPG/DAC
 * markers 0xC4/0xC8/0xCC, none of which carry a frame header), found by walking the marker chain
 * from byte 2 — a JPEG has no fixed offset for it the way PNG does, because arbitrary metadata
 * segments (EXIF, ICC, comments) can precede it.
 */
export function readImageMeta(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    if (bytes.length < 24) throw new Error("PNG bytes truncated before the IHDR chunk");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: "png", mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos] !== 0xff) throw new Error(`malformed JPEG: expected a marker at byte ${pos}, got 0x${bytes[pos].toString(16)}`);
      const marker = bytes[pos + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        pos += 2;
        continue;
      }
      if (marker === 0xda) break; // Start Of Scan: no more headers follow
      const length = view.getUint16(pos + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { format: "jpeg", mime: "image/jpeg", height: view.getUint16(pos + 5), width: view.getUint16(pos + 7) };
      }
      pos += 2 + length;
    }
    throw new Error("JPEG has no Start-Of-Frame marker — cannot read its dimensions");
  }
  throw new Error("not a PNG or a JPEG (checked the magic bytes) — this skill embeds only those two formats");
}

/**
 * The EXIF orientation tag (1..8) of a JPEG, or `null` if the file carries no EXIF APP1 segment
 * at all (a photo exported by most editors, or any PNG, has none — treated as already normal).
 * A PNG never carries this tag: `readOrientation` returns `null` for one without inspecting it.
 *
 * This function only ever READS the tag — see `checkOrientation` below for why nothing in this
 * skill rotates pixels to correct for it.
 */
export function readOrientation(bytes) {
  if (!(bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8)) return null; // not a JPEG
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null;
    const marker = bytes[pos + 1];
    if (marker === 0xda) return null; // Start Of Scan: EXIF always precedes it
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      pos += 2;
      continue;
    }
    const length = view.getUint16(pos + 2);
    if (marker === 0xe1) {
      const segmentStart = pos + 4;
      const isExif =
        bytes[segmentStart] === 0x45 && bytes[segmentStart + 1] === 0x78 && bytes[segmentStart + 2] === 0x69 &&
        bytes[segmentStart + 3] === 0x66 && bytes[segmentStart + 4] === 0x00 && bytes[segmentStart + 5] === 0x00;
      if (isExif) {
        const tiffStart = segmentStart + 6;
        const little = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49; // "II" vs "MM"
        const ifdOffset = little
          ? view.getUint32(tiffStart + 4, true)
          : view.getUint32(tiffStart + 4, false);
        const ifd0 = tiffStart + ifdOffset;
        const entryCount = little ? view.getUint16(ifd0, true) : view.getUint16(ifd0, false);
        for (let i = 0; i < entryCount; i++) {
          const entry = ifd0 + 2 + i * 12;
          const tag = little ? view.getUint16(entry, true) : view.getUint16(entry, false);
          if (tag === 0x0112) {
            return little ? view.getUint16(entry + 8, true) : view.getUint16(entry + 8, false);
          }
        }
        return null; // EXIF present, no orientation tag in it — treated as normal
      }
    }
    pos += 2 + length;
  }
  return null;
}

/**
 * Throws unless a JPEG's EXIF orientation is normal (`1`) or absent (`null`). See
 * `references/image-discipline.md`, "Colour and orientation" — reading the tag is simple and
 * reliable; correctly ROTATING pixels for all eight EXIF orientation values, including the four
 * mirrored ones, needs an image-transform library this skill does not carry, and a wrong rotation
 * would ship a photograph flipped with more confidence than doing nothing at all. Detecting and
 * refusing is the honest half of the problem to solve tonight; rotating is the other half, left
 * open and named, not attempted half-built.
 */
export function checkOrientation(bytes, label) {
  const orientation = readOrientation(bytes);
  if (orientation !== null && orientation !== 1) {
    throw new Error(
      `${label}: EXIF orientation is ${orientation}, not 1 (normal) — this skill does not rotate pixels to correct for it (see references/image-discipline.md, "Colour and orientation"). Re-export the photo already upright, then supply it again.`,
    );
  }
}

/**
 * Where an intrinsic-sized image lands inside a fixed box, preserving its own aspect ratio —
 * never cropped, never stretched. Pure: no colour, no file I/O, just the arithmetic. See
 * `references/image-discipline.md`, "Aspect ratio", for why this skill letterboxes instead of
 * cropping or stretching.
 */
export function fitBox(intrinsic, box) {
  if (intrinsic.width <= 0 || intrinsic.height <= 0) {
    throw new Error(`fitBox needs a positive intrinsic size, got ${intrinsic.width}x${intrinsic.height}`);
  }
  const scale = Math.min(box.width / intrinsic.width, box.height / intrinsic.height);
  const drawWidth = intrinsic.width * scale;
  const drawHeight = intrinsic.height * scale;
  return {
    drawWidth,
    drawHeight,
    offsetX: (box.width - drawWidth) / 2,
    offsetY: (box.height - drawHeight) / 2,
  };
}

/** A `data:` URI for an image already identified by `readImageMeta` — the one form an embedded
 *  photograph takes in this skill's SVG, so the artifact never references an external file. */
export function toDataUri(bytes, mime) {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** The most this skill will embed across every photograph in one beat, in raw (pre-base64) bytes.
 *  See `references/image-discipline.md`, "Weight", for where this number comes from and what a
 *  journalist is told to do when they hit it. */
export const WEIGHT_LIMIT_BYTES = 20 * 1024 * 1024;

/**
 * Throws, loudly and by name, if the images this beat is about to embed would exceed
 * `WEIGHT_LIMIT_BYTES` combined. Takes `{ label, bytes }` pairs rather than raw byte arrays so the
 * error can name which photograph to shrink, worst offender first — a total with no names attached
 * tells a journalist there is a problem but not which file to go re-export.
 */
export function checkWeight(images) {
  const total = images.reduce((sum, img) => sum + img.bytes.length, 0);
  if (total <= WEIGHT_LIMIT_BYTES) return;
  const worst = [...images].sort((a, b) => b.bytes.length - a.bytes.length);
  const mb = (n) => (n / (1024 * 1024)).toFixed(1);
  const named = worst.map((img) => `${img.label} (${mb(img.bytes.length)} MB)`).join(", ");
  throw new Error(
    `this beat would embed ${mb(total)} MB of photographs, over the ${mb(WEIGHT_LIMIT_BYTES)} MB limit ` +
      `(references/image-discipline.md, "Weight"). Largest first: ${named}. Re-export the largest ` +
      `one at a smaller size and supply it again — this skill does not recompress a photograph on ` +
      `its own, the same reason it does not crop one (see "Aspect ratio"): how much quality to give ` +
      `up is an editorial call, not one this skill makes silently.`,
  );
}

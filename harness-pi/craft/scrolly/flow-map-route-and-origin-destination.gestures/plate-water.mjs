// Harness copy of scripts/map-beat/plate-water.mjs. The one change is the decoder: `pngjs` is not a
// dependency a stories root carries, so the plate's pixels are read through `@resvg/resvg-js`, which
// every root carries for its stills — the PNG is wrapped in an SVG <image> at its own size and
// rasterised back unchanged (measured: the first pixel of a baked plate comes back as its recorded
// water tint, #c5d7de). Everything else — the classification and the chamfer transform — is verbatim.
//
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

/** RGBA pixels of a PNG, at its own size. */
function decodePng(path) {
  const bytes = readFileSync(path);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${bytes.toString("base64")}"/></svg>`;
  const image = new Resvg(svg, { fitTo: { mode: "original" } }).render();
  if (image.width !== width || image.height !== height) throw new Error(`the plate at ${path} decoded at ${image.width}x${image.height}, not its own ${width}x${height}`);
  return { width, height, data: image.pixels };
}

const channelsOf = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Chamfer distance, two passes, weights 1 and √2 — under 2 % off Euclidean, which is finer than
 *  the coastline this measures against. `seed` is 0 on the ground being measured and Infinity
 *  elsewhere; the result is, at every pixel of that ground, the distance to the nearest pixel that
 *  is NOT it. */
function distanceTransform(mask, width, height) {
  const D = new Float32Array(width * height);
  const DIAG = Math.SQRT2;
  for (let i = 0; i < D.length; i += 1) D[i] = mask[i] ? Infinity : 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (D[i] === 0) continue;
      let best = D[i];
      if (y > 0) best = Math.min(best, D[i - width] + 1);
      if (x > 0) best = Math.min(best, D[i - 1] + 1);
      if (y > 0 && x > 0) best = Math.min(best, D[i - width - 1] + DIAG);
      if (y > 0 && x < width - 1) best = Math.min(best, D[i - width + 1] + DIAG);
      D[i] = best;
    }
  for (let y = height - 1; y >= 0; y -= 1)
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      if (D[i] === 0) continue;
      let best = D[i];
      if (y < height - 1) best = Math.min(best, D[i + width] + 1);
      if (x < width - 1) best = Math.min(best, D[i + 1] + 1);
      if (y < height - 1 && x < width - 1) best = Math.min(best, D[i + width + 1] + DIAG);
      if (y < height - 1 && x > 0) best = Math.min(best, D[i + width - 1] + DIAG);
      D[i] = best;
    }
  // A ground that fills the whole plate has no edge to be far from; its depth is the plate itself.
  const cap = Math.hypot(width, height);
  for (let i = 0; i < D.length; i += 1) if (!Number.isFinite(D[i])) D[i] = cap;
  return D;
}

/**
 * THE FIELD `markOccupancy` READS, for the plate in `dir`.
 *
 * Every pixel is called water or land by whichever of the plate's own two RECORDED tints it is
 * nearer — the coastline's antialiasing included, which is how a one-pixel blur stops being a third
 * ground. The tints are read from `geometry.json`, never guessed: a plate that did not record what
 * it was painted with cannot be measured and says so.
 *
 * COORDINATES ARE THE FRAME'S, NOT THE PNG'S. A plate is screenshot at the browser's device ratio —
 * every one in this tree is 2x — while `frameCorners`, and therefore every beat's own `project`, is
 * in frame units. Measured in PNG pixels, every radius would be half what it is and every depth
 * twice, and the two errors do not cancel. So this takes and returns frame units and divides the
 * ratio out in one place.
 *
 * `scale` maps the caller's own units onto those frame units, for a beat that draws its marks at a
 * size other than the plate's own — every one of them does, and every one of them shares the plate's
 * camera, so it is one multiply and not a second projection.
 */
/**
 * THE FIELD, FROM A PNG AND THE TWO COLOURS IT WAS PAINTED IN.
 *
 * Every pixel is called water or land by whichever of the two RECORDED colours it is nearer — the
 * coastline's antialiasing included, which is how a one-pixel blur stops being a third ground.
 *
 * COORDINATES ARE THE FRAME'S, NOT THE PNG'S. A plate is screenshot at the browser's device ratio —
 * every one in this tree is 2x — while `frameCorners`, and therefore every beat's own `project`, is
 * in frame units. Measured in PNG pixels, every radius would be half what it is and every depth
 * twice, and the two errors do not cancel. So this takes and returns frame units and divides the
 * ratio out in one place.
 *
 * `scale` maps the caller's own units onto those frame units, for a beat that draws its marks at a
 * size other than the plate's own — every one of them does, and every one of them shares the plate's
 * camera, so it is one multiply and not a second projection.
 */
export function waterFieldFromPng({ path, water, land, frame, scale = 1 }) {
  const png = decodePng(path);
  const { width, height, data } = png;
  const ratio = width / frame.width;
  const W = channelsOf(water);
  const L = channelsOf(land);
  const waterMask = new Uint8Array(width * height);
  const landMask = new Uint8Array(width * height);
  let waterPixels = 0;
  for (let i = 0, p = 0; p < width * height; p += 1, i += 4) {
    const dw = (data[i] - W[0]) ** 2 + (data[i + 1] - W[1]) ** 2 + (data[i + 2] - W[2]) ** 2;
    const dl = (data[i] - L[0]) ** 2 + (data[i + 1] - L[1]) ** 2 + (data[i + 2] - L[2]) ** 2;
    if (dw < dl) {
      waterMask[p] = 1;
      waterPixels += 1;
    } else landMask[p] = 1;
  }
  const waterDepth = distanceTransform(waterMask, width, height);
  const landDepth = distanceTransform(landMask, width, height);
  const at = (D) => (x, y) => {
    const px = Math.round(x * scale * ratio);
    const py = Math.round(y * scale * ratio);
    if (px < 0 || py < 0 || px >= width || py >= height) return null;
    return D[py * width + px] / ratio;
  };
  return {
    frame,
    png: { width, height },
    ratio,
    scale,
    waterShare: waterPixels / (width * height),
    tints: { water, land },
    waterDepthAt: at(waterDepth),
    landDepthAt: at(landDepth),
  };
}

/**
 * THE FIELD `markOccupancy` READS, for the plate in `dir` — its PNG, and the two tints its own
 * `geometry.json` recorded being painted with. A plate that did not record them cannot be measured
 * and says so, rather than being classified against a guess.
 */
export function plateWaterField(dir, { scale = 1 } = {}) {
  const geometryPath = join(dir, "geometry.json");
  const platePath = join(dir, "plate.png");
  if (!existsSync(geometryPath) || !existsSync(platePath))
    throw new Error(`no baked plate at ${dir} — occupancy is measured on the plate the beat baked`);
  const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
  if (!geometry.water || !geometry.land)
    throw new Error(
      `the plate at ${dir} did not record the tints it was painted with, so its pixels cannot be ` +
        `called water or land — re-bake it with --water and --land`,
    );
  if (!(geometry.frame?.width > 0))
    throw new Error(`the plate at ${dir} records no frame, so its pixels cannot be put in the beat's units`);
  return waterFieldFromPng({
    path: platePath,
    water: geometry.water,
    land: geometry.land,
    frame: geometry.frame,
    scale,
  });
}

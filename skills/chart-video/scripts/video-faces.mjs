// twin/skills/chart-video/scripts/video-faces.mjs
//
// THE TYPEFACE A VIDEO FRAME IS SET IN, CARRIED INTO THE COMPOSITION AS BYTES.
//
// A Remotion composition is drawn by headless Chrome, not by resvg, so `useTypeface` putting a
// recorded family in force in THIS process changed nothing about the mp4: the composition carried
// its own literal stack, nothing loaded a face, and Chrome set every frame in whatever the machine
// had under the first name it could not find — Helvetica here, for a seed that names Open Sans.
// Measured on the seed's last frame, 2026-09-13.
//
// So the render resolves the faces here, in node, and hands them over as input props: the stack
// the composition must draw in, and the woff2 bytes for it. `embeddedWebFaces` is the web beats'
// own function (carried beside this file as `./typefaces.mjs`), so fetching, the `wOF2` check, the
// cache, the subset and the range read back off each cut file's cmap are the same code for both
// genres. Bytes rather than a stylesheet link for the reason `film/scripts/fetch-typefaces.mjs`
// gives: a frame painted before a network face arrives is a frame in the wrong face.
//
// The subset is cut against every string in the props plus the digits and separators a value is
// formatted with. Text a composition composes that this cannot foresee is caught on the other side,
// by `assets/face-coverage.ts`, against what the frame actually drew.

import { embeddedWebFaces, requestedFamily } from "./typefaces.mjs";

/** Every string anywhere in the props — the words a composition can be handed to draw. */
function stringsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") for (const item of Object.values(value)) stringsOf(item, out);
  return out;
}

/**
 * @param {{stack: string, weights: number[], props: object}} beat
 *        `stack` is the recorded TYPEFACE family; `weights` every weight the composition sets.
 * @returns {Promise<{fontFamily: string, faces: Array<{family, style, weight, weightTo, unicodeRange, base64}>}>}
 */
export async function videoFaces({ stack, weights, props }) {
  const family = requestedFamily(stack);
  const wanted = [...new Set(weights)].map((weight) => ({ family, weight }));
  const faces = await embeddedWebFaces(wanted, stringsOf(props).join("\n"));
  return {
    fontFamily: stack,
    faces: faces.map(({ family, style, weight, weightTo, unicodeRange, base64 }) => ({
      family,
      style,
      weight,
      weightTo,
      unicodeRange,
      base64,
    })),
  };
}

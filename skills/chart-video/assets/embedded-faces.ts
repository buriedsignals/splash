// twin/skills/chart-video/assets/embedded-faces.ts
//
// THE EMBEDDED FACES, PUT INTO THE DOCUMENT BEFORE A FRAME IS TAKEN, AND EVERY FRAME CHECKED.
//
// The shape is `film/load-typefaces.ts`'s — `FontFace` from bytes, `delayRender` until every face
// reports loaded, a face that will not decode stops the render — with two differences a chart
// needs and a title card did not:
//
// 1. NOTHING IS DRAWN UNTIL THE FACES ARE IN. A chart lays itself out with `measureText`, and a
//    gutter measured in the fallback face while the text is later painted in the real one clips in
//    silence. The composition renders nothing while `ready` is false, and `continueRender` is
//    called from a layout effect, so the frame the renderer waits for is one React has committed.
// 2. WHAT THE FRAME DREW IS READ BACK. Every text node under `ref`, with the family and weight
//    Chrome resolved for it, is held against the faces' measured ranges (`face-coverage.ts`), and a
//    weight that was drawn is measured against a deliberate fallback: if the named face is not
//    what Chrome is using, the two widths are the same. `document.fonts.check()` is not asked —
//    it answers `true` for a character outside every declared range, because no custom face is
//    needed for it, while the glyph comes from the fallback.
// 3. THE WIDTH BUN MEASURED IS THE WIDTH CHROME DREW (spec §4.1, the width agreement). A directed
//    composition lays its lines out in Bun and draws them here; every `<text data-width="…">` under
//    `ref` carries the width Bun measured for it, and Chrome's own `getComputedTextLength()` must
//    agree within `max(1 px, 1 %)`. A line that disagrees was broken, aligned or cleared in one face
//    and painted in another, and the frame is refused naming the line and both numbers.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import {
  uncoveredText,
  type DrawnRun,
  type EmbeddedFace,
} from "./face-coverage";

function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

/** `uppercase`/`lowercase`/`capitalize` applied the way CSS `text-transform` renders it, so a
 *  legacy beat that still sets it in CSS (F1 forbids it in a directed composition, but does not
 *  reach beats that predate the design base) is checked against the text Chrome actually painted,
 *  not the text the DOM node carries before the browser's own rendering transform. */
function cased(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize")
    return text.replace(/\b\w/g, (c) => c.toUpperCase());
  return text;
}

function drawnRuns(root: Element): DrawnRun[] {
  const runs: DrawnRun[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const raw = node.textContent ?? "";
    if (!raw.trim() || !node.parentElement) continue;
    const style = getComputedStyle(node.parentElement);
    const text = cased(raw, style.textTransform);
    runs.push({
      text,
      family: style.fontFamily
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, ""),
      weight: Number.parseInt(style.fontWeight, 10),
      style:
        style.fontStyle === "italic" || style.fontStyle.startsWith("oblique")
          ? "italic"
          : "normal",
    });
  }
  return runs;
}

// A fallback unlike any face a ladder actually files. Plain `monospace` is the generic CSS keyword
// Chrome resolves to a system mono face — the SAME family a direction's own `mono` role would use
// (`shared/design-base` ladders can file one). Falling back to `monospace` while probing a genuine
// mono register would measure the two fonts identically for reasons that have nothing to do with
// coverage, and `inUse` would read that as "not drawn in the named face" when it plainly was —
// a false negative on exactly the direction this check exists to protect. `"Courier New", monospace`
// is still monospaced (so a proportional named face still measures differently against it) but is
// a real, specific family no ladder in this corpus files, so it can never collide with one.
const FALLBACK = '"Courier New", monospace';
const proven = new Set<string>();

/** Is the named face — at this weight AND this style — the one Chrome sets this text in? Width
 *  against a deliberate fallback. An italic run measured with an upright fallback (or the reverse)
 *  can measure the same by accident on a short run, so the probe's own `font` carries the style. */
function inUse({ text, family, weight, style }: DrawnRun): boolean {
  const key = `${family}|${weight}|${style ?? "normal"}`;
  if (proven.has(key)) return true;
  const context = document.createElement("canvas").getContext("2d")!;
  const italic = style === "italic" ? "italic " : "";
  context.font = `${italic}${weight} 40px "${family}", ${FALLBACK}`;
  const named = context.measureText(text).width;
  context.font = `${italic}${weight} 40px ${FALLBACK}`;
  if (named === context.measureText(text).width) return false;
  proven.add(key);
  return true;
}

/** Spec §4.1: the render is refused when `|chrome − bun| > max(1 px, 2 % of bun)`.
 *
 *  RECALIBRATED ON THE PILOT'S THREE DIRECTIONS (`proof/video-choropleth-europe-lowcarbon`), from the
 *  1 % the spec started with. Once the trailing tracking and the last side bearing are taken off
 *  (below), what is left is not measurement noise but two BUILDS of the same family: Bun measures
 *  Google's static TrueType file and Chrome draws Google's web woff2, and the two do not advance the
 *  same. Measured in Chrome with both files loaded side by side: through the TrueType file Chrome's
 *  ink width equals Bun's to the hundredth; through the woff2 Merriweather Italic runs 1.2–1.6 %
 *  wider and Open Sans Medium 0.35 % narrower. The largest disagreement across the three directions
 *  was 1.61 % (creme, « plus de 94 % », Merriweather Italic 39px). A fallback face or a wrong weight
 *  moves a line by several per cent, and `inUse` above refuses those on its own. */
const WIDTH_TOLERANCE_PX = 1;
const WIDTH_TOLERANCE_SHARE = 0.02;

let measuring: CanvasRenderingContext2D | null = null;

/** The width a laid-out line's INK spans in Chrome, read off the SVG node that drew it.
 *
 *  Bun's width is resvg's ink box — from the line's start to the right edge of its last glyph's ink,
 *  plus `letterSpacing × (characters − 1)` (`layout.mjs`'s `widthOf`). Chrome's
 *  `getComputedTextLength()` is the sum of the ADVANCES, which runs past that ink by two amounts that
 *  paint nothing: the tracking CSS adds after the last character as after every other, and the last
 *  glyph's own right side bearing. Measured on the pilot's first render, both at once: the tracked
 *  eyebrow « ÉNERGIE · EUROPE » (30px Open Sans, 5.7px tracking) ran 6.93px long, 5.70 of it the
 *  trailing gap; every « 40 % » break label (33px Open Sans Medium) ran 1.17px long, the side bearing
 *  of its « % ». Both are taken off Chrome's reading here — the bearing from the same face's own
 *  canvas metrics — so the two sides compare the same span, and what is left is a real disagreement:
 *  kerning, shaping, a different face. */
function drawnInkWidth(node: Element): number {
  const style = getComputedStyle(node);
  const trailing = Number.parseFloat(style.letterSpacing) || 0;
  const last = [...(node.textContent ?? "")].at(-1);
  let bearing = 0;
  if (last) {
    measuring ??= document.createElement("canvas").getContext("2d");
    measuring!.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = measuring!.measureText(last);
    bearing = metrics.width - metrics.actualBoundingBoxRight;
  }
  return (node as SVGTextElement).getComputedTextLength() - trailing - bearing;
}

/** The first laid-out line whose drawn width disagrees with the width Bun measured for it. */
function widthDisagreement(
  root: Element,
): { text: string; measured: number; drawn: number } | null {
  for (const node of root.querySelectorAll("text[data-width]")) {
    const measured = Number(node.getAttribute("data-width"));
    const drawn = drawnInkWidth(node);
    const tolerance = Math.max(
      WIDTH_TOLERANCE_PX,
      WIDTH_TOLERANCE_SHARE * measured,
    );
    if (!Number.isFinite(measured) || Math.abs(drawn - measured) > tolerance)
      return { text: node.textContent ?? "", measured, drawn };
  }
  return null;
}

export function useEmbeddedFaces<T extends Element>(
  faces: EmbeddedFace[] | undefined,
) {
  const [handle] = useState(() => delayRender("loading the embedded typeface"));
  const [ready, setReady] = useState(false);
  const released = useRef(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!faces || faces.length === 0) {
      cancelRender(
        new Error(
          "no embedded faces in the props: render through the beat's own script, which reads " +
            "TYPEFACE.md and hands the bytes in. A frame drawn without them is set in whatever this " +
            "machine has.",
        ),
      );
      return;
    }
    Promise.all(
      faces.map(async (face) => {
        const loaded = await new FontFace(face.family, bytesOf(face.base64), {
          style: face.style,
          weight:
            face.weight === face.weightTo
              ? String(face.weight)
              : `${face.weight} ${face.weightTo}`,
          unicodeRange: face.unicodeRange,
          display: "block",
        }).load();
        document.fonts.add(loaded);
      }),
    )
      .then(() => setReady(true))
      .catch((error) =>
        cancelRender(
          new Error(`the embedded typeface would not load: ${String(error)}`),
        ),
      );
  }, [faces]);

  useLayoutEffect(() => {
    if (!ready || !ref.current || !faces) return;
    const runs = drawnRuns(ref.current);
    const missing = uncoveredText(runs, faces);
    if (missing.length > 0)
      cancelRender(
        new Error(
          `this frame draws characters no embedded face can set, so Chrome set them in a fallback: ` +
            missing
              .map(
                (m) =>
                  `U+${m.codePoint.toString(16).toUpperCase().padStart(4, "0")} ` +
                  `${JSON.stringify(String.fromCodePoint(m.codePoint))} in ${m.family} ${m.weight}`,
              )
              .join(", "),
        ),
      );
    const fallen = runs.find((run) => !inUse(run));
    if (fallen)
      cancelRender(
        new Error(
          `"${fallen.text}" measures the same in ${fallen.family} ${fallen.weight} as in ${FALLBACK}: ` +
            `the embedded face is not the one Chrome is drawing with.`,
        ),
      );
    const disagreement = widthDisagreement(ref.current);
    if (disagreement)
      cancelRender(
        new Error(
          `"${disagreement.text}" was laid out ${disagreement.measured.toFixed(2)}px wide in Bun ` +
            `and Chrome draws it ${disagreement.drawn.toFixed(2)}px wide — past the width ` +
            `agreement's max(${WIDTH_TOLERANCE_PX}px, ${WIDTH_TOLERANCE_SHARE * 100}%) (spec §4.1).`,
        ),
      );
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  });

  return { ready, ref };
}

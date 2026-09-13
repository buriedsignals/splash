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
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  });

  return { ready, ref };
}

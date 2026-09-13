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

function drawnRuns(root: Element): DrawnRun[] {
  const runs: DrawnRun[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (!text.trim() || !node.parentElement) continue;
    const style = getComputedStyle(node.parentElement);
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

const FALLBACK = "monospace";
const proven = new Set<string>();

/** Is the named face the one Chrome sets this text in? Width against a deliberate fallback. */
function inUse({ text, family, weight }: DrawnRun): boolean {
  const key = `${family}|${weight}`;
  if (proven.has(key)) return true;
  const context = document.createElement("canvas").getContext("2d")!;
  context.font = `${weight} 40px "${family}", ${FALLBACK}`;
  const named = context.measureText(text).width;
  context.font = `${weight} 40px ${FALLBACK}`;
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

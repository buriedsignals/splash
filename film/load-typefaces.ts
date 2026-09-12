// The two house faces, put into the document before the first frame is painted.
//
// This is a MODULE-LEVEL side effect on purpose. Remotion renders a composition in
// several browser processes, each of which imports this module once; a `useEffect`
// in a component would run after that component's first paint, and the frames
// painted before it would be set in the fallback face with nothing to say so. The
// `delayRender` handle is what makes the renderer wait: it does not start painting
// until every face has reported loaded.

import { continueRender, delayRender } from "remotion";
import { TYPEFACES } from "./typefaces";

function bytesOf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

let started = false;

export function loadTypefaces(): void {
  if (started || typeof document === "undefined") return;
  started = true;

  const handle = delayRender("loading the house typefaces");
  Promise.all(
    TYPEFACES.map(async (face) => {
      const loaded = await new FontFace(face.family, bytesOf(face.woff2), {
        weight: face.weight,
        unicodeRange: face.unicodeRange,
        display: "block",
      }).load();
      document.fonts.add(loaded);
    }),
  )
    .then(() => continueRender(handle))
    // A face that will not decode must stop the render rather than let it fall
    // back silently. A film in the wrong typeface still exports, and nothing in
    // the artifact says which one it is.
    .catch((error) => {
      throw new Error(`the house typefaces would not load: ${String(error)}`);
    });
}

loadTypefaces();

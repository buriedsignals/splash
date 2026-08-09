/**
 * The IMAGE frame — one photograph, its year, and its own credit, in a column sized to the
 * photograph itself.
 *
 * Four decisions, and each of them is what makes a photograph a legitimate scrolly track rather
 * than decoration.
 *
 * **1. CONTAINED, never cover-cropped.** `scrolly-discipline.md` files a photograph under scenery
 * and crops it, on the argument that "no part of the image is a claim". That is right for a stock
 * landscape behind an explainer and wrong here: this beat's entire claim is what is IN the frame,
 * and the four frames are only comparable because they were normalised to the same box. COVER at a
 * 1600×900 viewport would show the middle 27% of a portrait photograph's height — the reader would
 * be comparing four horizontal slices, and a slice is a crop nobody chose. So the photograph is
 * fitted, whole, into the content band above the prose lane, and it lands in the SAME rectangle on
 * every step, which is what lets a reader's eye hold the previous frame while the next one arrives.
 *
 * **2. The furniture is sized to the PHOTOGRAPH, not to the frame.** The first build anchored the
 * year to the frame's top-left and the credit to its bottom-left; at 1600×900 a contained portrait
 * photograph is 437px wide in the middle of the screen, and both labels sat stranded 600px away
 * from the thing they belonged to, across an empty white field. Looking at the render is the only
 * thing that showed it. The column below is exactly as wide as the photograph will render —
 * `min(available width, available height × the sequence's own aspect)`, computed in CSS from `vw`
 * and `vh` because the sticky graphic is exactly one viewport on both axes (the scaffold's own
 * `--graphic-h: 100vh`, and its width measured `left: 0 … right: innerWidth`). The aspect is a
 * PROP, derived from `photographs.csv`, so it cannot drift from the box the frames were normalised
 * to.
 *
 * **3. The credit sits on the photograph's own bottom margin**, in a constant place under every
 * frame — the rule `twin-chart-beat`'s seed keeps for a static chart's source line, applied here
 * where it matters most: a photograph's credit belongs to the photograph, and four photographs by
 * four people cannot be credited by one line in the page header. The header carries the collection
 * and the licence for the sequence; each frame carries the person who took it.
 *
 * **4. Every word is HTML at a fixed pixel size**, on an opaque chip of the render's own ground —
 * never laid over the image, whose effective background is different pixels on every frame and
 * therefore has no contrast that can be measured once.
 *
 * `alt=""` on purpose — `renderScrolly` wraps every frame `aria-hidden`, so an alt here would never
 * reach a screen reader. The argument is carried by the header and by each step's own prose.
 */

import type { Photograph } from "./photograph-data.ts";
import { creditFor } from "./photograph-data.ts";

/** The fraction of the graphic reserved at the bottom for the pinned prose panel. `render.mjs`
 *  hands the same number to `renderScrolly`, so the lane the CSS reserves and the band the
 *  photograph is fitted into are one number. */
export const PROSE_LANE = 0.28;
export const CONTENT_TOP = 1 - PROSE_LANE;

const FONT = "Helvetica, Arial, sans-serif";

/** The rows above and below the photograph, and the side gutter — the height the column spends on
 *  something other than the image, which is what makes the width calculation exact. */
const YEAR_ROW = 42;
const CREDIT_ROW = 24;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;
const SIDE_GUTTER = 16;
const CHROME = YEAR_ROW + CREDIT_ROW + PAD_TOP + PAD_BOTTOM;

export function ImageFrame({
  photograph,
  aspect,
  src,
  ground,
  ink,
  muted,
}: {
  photograph: Photograph;
  /** The sequence's own delivered aspect ratio (width ÷ height), derived from `photographs.csv`. */
  aspect: number;
  /** The photograph as a data URI — never a path: the delivered file is self-contained. */
  src: string;
  ground: string;
  ink: string;
  muted: string;
}) {
  const availableHeight = `(${CONTENT_TOP} * 100vh - ${CHROME}px)`;
  const columnWidth = `min(calc(100vw - ${SIDE_GUTTER * 2}px), calc(${availableHeight} * ${aspect.toFixed(4)}))`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: `${PAD_TOP}px`,
          width: columnWidth,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            height: `${YEAR_ROW}px`,
            fontSize: "30px",
            fontWeight: 700,
            color: ink,
            lineHeight: `${YEAR_ROW}px`,
          }}
        >
          {photograph.year}
        </div>
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "auto",
            maxHeight: `calc(${availableHeight})`,
            display: "block",
          }}
        />
        <div
          style={{
            height: `${CREDIT_ROW}px`,
            fontSize: "13px",
            color: muted,
            lineHeight: `${CREDIT_ROW}px`,
          }}
        >
          {creditFor(photograph)}
        </div>
      </div>
    </div>
  );
}

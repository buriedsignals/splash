/**
 * THE SEQUENCE — four photographs of one view, in one rectangle, with the reader's scroll dragging
 * the boundary between two of them across the frame.
 *
 * It used to be four separate frames handed to the scaffold, which faded one into the next. Driven
 * continuously — a per-frame recorder installed before the scroll was touched, both directions,
 * three widths — that measured **0 of 113, 0 of 97 and 0 of 78 intra-step frames on which any
 * geometry moved**: about half of every sweep changed only an opacity and the rest changed nothing.
 * Four fixed pictures and a cross-fade. `wipe-drive.mjs` carries the argument for a WIPE rather than
 * a dissolve, and it is an editorial argument: a dissolve paints a photograph of no year.
 *
 * Five decisions, and each of them is what makes a photograph a legitimate scrolly track rather
 * than decoration.
 *
 * **1. CONTAINED, never cover-cropped, and now filling the frame.** The owner's ruling of
 * 2026-08-10: *"Pour les scrolly images respecte le ratio mais remplis au max en largeur ou
 * hauteur."* This beat already contained — its whole claim is what is IN the frame, and COVER at
 * 1600×900 would show the middle 27% of a portrait photograph's height, four horizontal slices
 * nobody chose. What it did NOT do is fill: it fitted the picture into `CONTENT_TOP` of the
 * viewport, reserving 28% of every frame for a prose panel that has not parked there since the
 * vehicle's eighth correction and cannot park anywhere since its ninth. `PROSE_LANE` is 0 now, so
 * the photograph is as large as the binding axis allows. **The letterbox on the other axis is the
 * render's own `ground`** — the value every piece of this page's furniture is derived from, so it
 * is a colour someone chose rather than a default nobody picked.
 *
 * **2. The furniture is sized to the PHOTOGRAPH, not to the frame.** The first build anchored the
 * year to the frame's top-left and the credit to its bottom-left; at 1600×900 a contained portrait
 * photograph is 437px wide in the middle of the screen, and both labels sat stranded 600px away
 * from the thing they belonged to, across an empty white field. Looking at the render is the only
 * thing that showed it. The column below is exactly as wide as the photograph will render —
 * `min(available width, available height × the sequence's own aspect)`, computed in CSS from `vw`
 * and `vh` because the sticky graphic is exactly one viewport on both axes. The aspect is a PROP,
 * derived from `photographs.csv`, so it cannot drift from the box the frames were normalised to.
 *
 * **3. BOTH years and BOTH credits are on screen while both photographs are**, each on the side of
 * the picture it belongs to — the incoming one at the left edge it is revealing from, the outgoing
 * one at the right. This is what makes the wipe honest rather than merely continuous: at no scroll
 * position is a reader looking at a photograph the page has not named, and a photograph's credit
 * belongs to the photograph. The header carries the collection and the licence for the sequence;
 * each frame carries the person who took it.
 *
 * **4. The boundary is DRAWN.** A 2px rule of ink, so the seam between two documents is a thing the
 * reader can see rather than a soft edge that could be mistaken for the picture.
 *
 * **5. Every word is HTML at a fixed pixel size**, on the render's own ground — never laid over the
 * image, whose effective background is different pixels on every frame and therefore has no
 * contrast that can be measured once.
 *
 * `alt=""` on purpose — `renderScrolly` wraps every frame `aria-hidden`, so an alt here would never
 * reach a screen reader. The argument is carried by the header and by each step's own prose.
 */

import type { Photograph } from "./photograph-data.ts";
import { creditFor } from "./photograph-data.ts";
import { seamAt, wipeAt } from "./wipe-drive.mjs";

/**
 * The fraction of the graphic reserved at the bottom for a prose panel — RECLAIMED, and it is 0.
 *
 * It was 0.28, for a panel that parked at the bottom of the graphic's own box. The vehicle's eighth
 * correction moved the prose out of that box; its ninth puts the card back OVER the graphic,
 * travelling the whole height of it, and states in its own discipline file why no band can be
 * reserved from that — the card crosses every row equally often, and at the moment a step's own
 * sentence is on the lane's centre line the card is dead centre. So the band protected the one
 * place the card never dwells, at a cost of 28% of the photograph.
 */
export const PROSE_LANE = 0;
export const CONTENT_TOP = 1 - PROSE_LANE;

const FONT = "Helvetica, Arial, sans-serif";

/** The rows above and below the photograph, and the side gutter — the height the column spends on
 *  something other than the image, which is what makes the width calculation exact. */
const YEAR_ROW = 42;
/** TWO lines, not one, and the second line is what a wipe costs. While the boundary is crossing,
 *  BOTH photographs are on screen and both must be credited — and a full credit is about 250px
 *  against a 405px column at 1600x900, so side by side they collide: measured on the first render
 *  of the wipe, where "Carl Key · U.S. Geological Survey, 1981" and "T. J. Hileman · Glacier
 *  National Park Archives, 1938" overprinted each other in the middle of the row. Stacked, each
 *  keeps its whole credit, and each ends with its own year so it is unambiguous which half of the
 *  picture it belongs to. The row is this tall at every position, so nothing moves when the second
 *  line appears. */
const CREDIT_ROW = 44;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;
const SIDE_GUTTER = 16;
const CHROME = YEAR_ROW + CREDIT_ROW + PAD_TOP + PAD_BOTTOM;

export function ImageSequence({
  photographs,
  aspect,
  sources,
  position,
  ground,
  ink,
  muted,
}: {
  photographs: Photograph[];
  /** The sequence's own delivered aspect ratio (width ÷ height), derived from `photographs.csv`. */
  aspect: number;
  /** Each photograph as a data URI — never a path: the delivered file is self-contained. */
  sources: string[];
  /** Where the reader is, for the SSR'd frame. The driver recomputes on its first paint, so this
   *  only ever decides what a reader with no JavaScript sees: the first photograph, whole. */
  position: number;
  ground: string;
  ink: string;
  muted: string;
}) {
  // THE NO-JS FALLBACK SIZE, and it is deliberately conservative. The column's width has to be
  // derived from the height available to it, and the height available to it is the viewport MINUS
  // the header — which wraps to a different number of lines at every width and is not knowable in
  // CSS from inside the frame. The driver measures the real box on its first paint and overrides
  // this in pixels; what is left here is what a reader with no JavaScript gets, and 180px is the
  // header at its tallest plus this column's own chrome, so that reader sees the photograph whole
  // and slightly small rather than filling the frame and cut off at the bottom. Measured before the
  // subtraction was raised: at 1600x900 the picture ran 122px past the frame's floor and took the
  // credit line with it.
  const availableHeight = `(${CONTENT_TOP} * 100vh - ${CHROME + 96}px)`;
  const columnWidth = `min(calc(100vw - ${SIDE_GUTTER * 2}px), calc(${availableHeight} * ${aspect.toFixed(4)}))`;
  const { from, to, t } = wipeAt(position, photographs.length, false);
  // SSR has no measured box, so the seam is expressed as a fraction and the driver replaces it with
  // pixels on its first paint. At position 0 it is 0 either way, which is the no-JS picture.
  const seamFraction = seamAt(t, 1);

  const year = (i: number): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    left: i === to && t > 0.002 ? 0 : "auto",
    right: i === from && t > 0.002 ? 0 : "auto",
    ...(i === from && t <= 0.002 ? { left: 0 } : {}),
    fontSize: "30px",
    fontWeight: 700,
    color: ink,
    lineHeight: `${YEAR_ROW}px`,
    whiteSpace: "nowrap",
    opacity: i === from || (t > 0.002 && i === to) ? 1 : 0,
  });

  const credit = (i: number): React.CSSProperties => ({
    position: "absolute",
    // The incoming photograph's credit on the first line, the outgoing one's on the second.
    top: i === from && t > 0.002 ? 22 : 0,
    left: 0,
    fontSize: "13px",
    color: muted,
    lineHeight: "22px",
    whiteSpace: "nowrap",
    opacity: i === from || (t > 0.002 && i === to) ? 1 : 0,
  });

  return (
    <div
      data-visual="glacier-wipe"
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        overflow: "hidden",
      }}
    >
      <div
        data-part="column"
        data-chrome={CHROME}
        data-gutter={SIDE_GUTTER}
        data-aspect={aspect.toFixed(4)}
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: `${PAD_TOP}px`,
          width: columnWidth,
          fontFamily: FONT,
        }}
      >
        <div style={{ position: "relative", height: `${YEAR_ROW}px` }}>
          {photographs.map((p, i) => (
            <div key={p.year} data-year={i} style={year(i)}>
              {p.year}
            </div>
          ))}
        </div>

        <div
          data-part="stack"
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: `${aspect.toFixed(4)}`,
            overflow: "hidden",
          }}
        >
          {/* The OUTGOING photograph: the whole frame. */}
          {photographs.map((p, i) => (
            <img
              key={`plate-${p.year}`}
              data-plate={i}
              src={sources[i]}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                opacity: i === from ? 1 : 0,
              }}
            />
          ))}
          {/* The INCOMING photograph: a box growing from the left with the picture inside it at the
              frame's own width, so the picture does not stretch as the box grows. A clip-path would
              have done the same thing without changing any element's BOX — and an element's box is
              the one thing a per-frame recorder can see, which is how this beat shipped frozen with
              every guard green. Geometry, deliberately, not a filter. */}
          {photographs.map((p, i) => (
            <div
              key={`reveal-${p.year}`}
              data-reveal={i}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: i === to ? `${(seamFraction * 100).toFixed(4)}%` : 0,
                overflow: "hidden",
                opacity: i === to && t > 0 ? 1 : 0,
              }}
            >
              <img
                src={sources[i]}
                alt=""
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  maxWidth: "none",
                  display: "block",
                }}
              />
            </div>
          ))}
          <div
            data-part="seam"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(seamFraction * 100).toFixed(4)}%`,
              width: "2px",
              background: ink,
              opacity: t > 0.002 && t < 0.998 ? 1 : 0,
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            height: `${CREDIT_ROW}px`,
            marginBottom: `${PAD_BOTTOM}px`,
          }}
        >
          {photographs.map((p, i) => (
            <div key={`credit-${p.year}`} data-credit={i} style={credit(i)}>
              {creditFor(p)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not an image gallery and it is not a component library. It is the wiring of one static
 * image beat, written out once so the next one can be written from scratch in the same shape:
 *
 *   the journalist's own photos -> one consistent box, letterboxed -> the journalist's own words
 *   (title, per-photo caption, alt, credit) -> nothing generated, nothing interpreted
 *
 * The story that needs a different box shape, a grid instead of a stack, or a fourth photo writes
 * its own component. Adding a `layout` prop to this file is the failure this seed exists to
 * prevent — the same rule `chart-beat/assets/ChartSeed.tsx` states for a `variant` prop.
 *
 * WHAT THIS FILE DOES NOT DO, on purpose: it does not choose which photo comes first (the caller's
 * array order IS the order — the journalist's, never re-sorted), it does not write a caption from
 * a photo's pixels, and it does not invent an alt text when one is missing — it refuses to render
 * instead (`imageBeatLayout` below, and `references/image-discipline.md`, "Alt text and credit").
 * Editorial intent never leaves the journalist; this file's whole job is to lay their words and
 * their photographs out honestly, not to add a single word or a single judgement of its own.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
  fitBox,
} from "../scripts/render-still.mjs";

export type PhotoInput = {
  /** A `data:` URI — see `scripts/render-still.mjs`'s `toDataUri`. This component never reads a
   *  file; the runner resolves bytes to a data URI before this component ever sees a photo. */
  dataUri: string;
  /** The photo's own pixel size, read from its bytes (`readImageMeta`) — never assumed, and never
   *  the size of the box it will be letterboxed into. */
  intrinsicWidth: number;
  intrinsicHeight: number;
  /** Required. A photograph without alt text is unusable to a screen reader — there is no default
   *  and no beat without one (`references/image-discipline.md`). */
  alt: string;
  /** Required. A photograph without a credit is a rights problem — same rule, same file. */
  credit: string;
  /** Optional. The journalist's own caption, printed under the photo. Absent is fine; empty is
   *  treated the same as absent (no caption line is drawn) — a caption is the one field here this
   *  skill does not fail loudly on, because a photo can honestly need none. */
  caption?: string;
};

// THE ONE SIZE DECISION A PHOTO ESSAY HAS, and it is the house's, not the journalist's (issue #58).
// Width is the article column this format is read in; height is derived below from the
// photographs and how far each caption wraps. So gate 2c asks an image beat nothing, the catalogue
// records `sizeRule: none` for it, and this constant is where the width is decided, once.
const FRAME_WIDTH = 900;
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const CAPTION = { fontSize: 15, fontWeight: 400, lead: 20 };
const CREDIT = { fontSize: 13, fontWeight: 400 };
/** The one consistent box every photo is fitted into, whatever its own aspect ratio — see
 *  `references/image-discipline.md`, "Aspect ratio". Height only; width is the frame's own content
 *  width, `FRAME_WIDTH - PAD * 2`, so every box lines up under every other one. */
const BOX_HEIGHT = 420;
const CAPTION_TOP_GAP = 10;
const CREDIT_TOP_GAP = 4;
/** Air between one photo's whole block (box + caption + credit) and the next. */
const BLOCK_GAP = 32;

/** Wrap on the measured width of the real string, never on a character count — identical rule to
 *  `chart-beat/assets/ChartSeed.tsx`'s own `wrap`, this skill's own copy because a skill never
 *  imports another skill's. */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/**
 * Data (the journalist's photos, title and words) to a laid-out frame — coordinates, wrapped
 * lines and fitted boxes, nothing else. No colour, no font weight beyond what wrapping itself
 * needs to measure, no image bytes. That boundary is what makes this the part worth keeping when
 * the drawing is rewritten, the same promise `chart-beat`'s `lineGeometry` makes.
 *
 * The frame's HEIGHT is derived from the content — how many photos, how long each caption wraps
 * to — never a fixed constant the way the chart format's `FRAME` is: a photo essay is exactly as
 * tall as its own captions make it, and a fixed height would either clip a long caption or waste
 * space under a short one. `scripts/render-preview.mjs` calls this SAME function to learn the
 * height before calling `renderStill`, so the two never disagree about what gets drawn.
 *
 * Throws if there are fewer than two photos, or if any one photo is missing its alt text or its
 * credit — the two fields `references/image-discipline.md` calls "not optional and cannot be
 * derived." This is the ONE place that check lives; nothing downstream re-checks it.
 */
export function imageBeatLayout(photos: PhotoInput[], title: string) {
  if (photos.length < 2) {
    throw new Error(
      `an image beat needs at least two photographs, got ${photos.length}`,
    );
  }
  photos.forEach((photo, i) => {
    if (!photo.alt || !photo.alt.trim()) {
      throw new Error(
        `photo ${i + 1} of ${photos.length} has no alt text — a photograph without alt text is unusable to a screen reader (references/image-discipline.md, "Alt text and credit")`,
      );
    }
    if (!photo.credit || !photo.credit.trim()) {
      throw new Error(
        `photo ${i + 1} of ${photos.length} ("${photo.alt}") has no credit — a photograph without a credit is a rights problem (references/image-discipline.md, "Alt text and credit")`,
      );
    }
  });

  const boxWidth = FRAME_WIDTH - PAD * 2;
  const titleLines = wrap(title, boxWidth, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;

  let cursorY = PAD + titleLines.length * TITLE.lead + 20; // top of the first photo's box

  const blocks = photos.map((photo) => {
    const boxTop = cursorY;
    const fit = fitBox(
      { width: photo.intrinsicWidth, height: photo.intrinsicHeight },
      { width: boxWidth, height: BOX_HEIGHT },
    );
    const captionLines = photo.caption?.trim()
      ? wrap(photo.caption.trim(), boxWidth, CAPTION)
      : [];
    const captionTop = boxTop + BOX_HEIGHT + CAPTION_TOP_GAP;
    const creditTop =
      captionTop +
      captionLines.length * CAPTION.lead +
      (captionLines.length > 0 ? CREDIT_TOP_GAP : 0);
    const blockBottom = creditTop + CREDIT.fontSize;
    cursorY = blockBottom + BLOCK_GAP;

    return {
      boxTop,
      boxLeft: PAD,
      boxWidth,
      boxHeight: BOX_HEIGHT,
      fit,
      dataUri: photo.dataUri,
      alt: photo.alt,
      credit: photo.credit,
      captionLines,
      captionTop,
      creditTop,
    };
  });

  const lastBlock = blocks[blocks.length - 1];
  const height = lastBlock.creditTop + CREDIT.fontSize + PAD;

  return { width: FRAME_WIDTH, height, titleLines, titleBaseline, blocks };
}

export function ImageBeatSeed({
  photos,
  title,
  ground,
}: {
  photos: PhotoInput[];
  title: string;
  ground: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, titleLines, titleBaseline, blocks } = imageBeatLayout(
    photos,
    title,
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {blocks.map((block, i) => (
        // `role="img"` + `<desc>` on the GROUP, not on the `<image>` itself — an `<image>` element
        // cannot carry a `<desc>` child of its own in the SVG content model, but a `<g>` wrapping
        // it can, and the group is what a screen reader (or a document reader opening this .svg
        // directly, rather than the rasterised .png) reaches. This is the same
        // `role="img"` + `<desc>` pairing `chart-beat/assets/ChartSeed.tsx` uses at its own
        // root, one level lower because THIS frame holds several images, not one.
        <g key={i} role="img" aria-label={block.alt}>
          <desc>{block.alt}</desc>
          {/* The box itself, filled with `grid` — visible letterbox bars on any photo whose own
              aspect ratio does not fill the box, rather than an unexplained gap of raw ground. */}
          <rect
            x={block.boxLeft}
            y={block.boxTop}
            width={block.boxWidth}
            height={block.boxHeight}
            fill={grid}
          />
          <image
            x={block.boxLeft + block.fit.offsetX}
            y={block.boxTop + block.fit.offsetY}
            width={block.fit.drawWidth}
            height={block.fit.drawHeight}
            href={block.dataUri}
            preserveAspectRatio="xMidYMid meet"
          />
          {block.captionLines.map((line, j) => (
            <text
              key={line}
              x={block.boxLeft}
              y={block.captionTop + j * CAPTION.lead}
              fill={ink}
              fontSize={CAPTION.fontSize}
            >
              {line}
            </text>
          ))}
          <text
            x={block.boxLeft}
            y={block.creditTop + CREDIT.fontSize}
            fill={muted}
            fontSize={CREDIT.fontSize}
          >
            {block.credit}
          </text>
        </g>
      ))}
    </svg>
  );
}

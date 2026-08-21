/**
 * Beat 1 of `stress-w-quay-photographs` — three photographs of one stretch of quay, 1994 / 2010 /
 * 2025, in the journalist's own order, each letterboxed into one consistent box.
 *
 * Written from `image-beat/assets/ImageBeatSeed.tsx`'s SHAPE, not imported from it — the seed says
 * REPLACE ME and means it. Two things differ from the seed, both because gate 2c pinned a size:
 *
 *   1. THE FRAME IS FIXED AT 1920 x 1080. The seed derives its HEIGHT from the content, which is
 *      right for a page-length photo essay and cannot honour a pinned export size at all. Here the
 *      frame is the landscape row from `sizes.mjs` and the BOX HEIGHT is derived from what the
 *      frame has left after the title, the captions and the credits.
 *   2. THE THREE PHOTOGRAPHS SIT IN ONE ROW, not a stack. In a 1080-tall frame a stack of three
 *      would leave each photograph about 250 px high; side by side each box is 568 x 700.
 *
 * Everything the seed refuses, this refuses: it does not choose the order (the caller's array IS
 * the order), it does not write a caption from a photograph's pixels, and it does not invent an
 * alt text or a credit. `quayLayout` below carries the seed's own required-alt/required-credit
 * check verbatim in intent — one place, throwing before a pixel is drawn.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
  fitBox,
} from "./render-still.mjs";

export type PhotoInput = {
  /** A `data:` URI — the runner resolves bytes before this component sees a photo. */
  dataUri: string;
  /** The photo's own pixel size, read from its bytes by `readImageMeta`. */
  intrinsicWidth: number;
  intrinsicHeight: number;
  /** Required. What a screen reader is told this photograph shows. */
  alt: string;
  /** Required. Who took it, or the honest sentence saying nobody can say. */
  credit: string;
  /** Optional. The journalist's own caption — here, the year. */
  caption?: string;
  /** Optional. A visible sentence about a field the newsroom could not supply. It is about the
   *  RECORD, never about the picture: "no caption survives" is a fact a person checked, not a
   *  description this file wrote. Absent on a photograph whose record is complete. */
  note?: string;
};

/**
 * THE FRAME IS AN ARGUMENT, because gate 2c chooses it and `sizes.mjs` measures it.
 *
 * `image-beat` has no `sizes.mjs` of its own and its seed's frame is a 900-wide constant with a
 * content-derived height, so nothing in that format can honour a pinned export size. This beat
 * therefore takes the row — `{ width, height, minTypePx, stage }` — and derives every dimension
 * from it: the type tokens off `minTypePx`, the spacing off the same, and the arrangement off the
 * frame's own aspect (a row of three in a landscape frame, a stack of three in a portrait one,
 * because three columns in an 1080-wide frame are 320 px each and a photograph is not a thumbnail).
 *
 * `stage` is the band a platform leaves uncovered — `{ top, bottom }` for the portrait story
 * frame, the whole frame otherwise. Content outside it is at risk of being covered by the
 * platform's own chrome, so this beat draws inside it rather than edge to edge.
 */
export type Frame = {
  width: number;
  height: number;
  minTypePx: number;
  stage?: { top: number; bottom: number } | null;
};

/** Every type token, derived from the row's own floor so no size can ship type under it. */
function tokensFor(minTypePx: number) {
  const body = minTypePx + 2;
  const caption = Math.round(minTypePx * 1.3);
  const title = Math.round(minTypePx * 1.85);
  return {
    TITLE: { fontSize: title, fontWeight: 700, lead: Math.round(title * 1.25) },
    CAPTION: { fontSize: caption, fontWeight: 700, lead: Math.round(caption * 1.24) },
    NOTE: { fontSize: body, fontWeight: 400, lead: Math.round(body * 1.21) },
    CREDIT: { fontSize: body, fontWeight: 400 },
    PAD: Math.round(minTypePx * 2.77),
    GAP: Math.round(minTypePx * 1.38),
    TITLE_BOTTOM_GAP: Math.round(minTypePx * 1.08),
    CAPTION_TOP_GAP: Math.round(minTypePx * 0.62),
    NOTE_TOP_GAP: Math.round(minTypePx * 0.31),
    CREDIT_TOP_GAP: Math.round(minTypePx * 0.31),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
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
 * Data to a laid-out frame: coordinates, wrapped lines and fitted boxes. Pure. No colour, no image
 * bytes, no file reads.
 *
 * Throws if there are fewer than two photographs, if the frame cannot hold the row, or if any one
 * photograph is missing its alt text or its credit — the two fields
 * `image-beat/references/image-discipline.md` calls "not optional and cannot be derived". This is
 * the ONE place that check lives.
 */
export function quayLayout(photos: PhotoInput[], title: string, frame: Frame) {
  if (photos.length < 2) {
    throw new Error(
      `an image beat needs at least two photographs, got ${photos.length}`,
    );
  }
  photos.forEach((photo, i) => {
    if (!photo.alt || !photo.alt.trim()) {
      throw new Error(
        `photo ${i + 1} of ${photos.length} has no alt text — a photograph without alt text is unusable to a screen reader (image-beat/references/image-discipline.md, "Alt text and credit")`,
      );
    }
    if (!photo.credit || !photo.credit.trim()) {
      throw new Error(
        `photo ${i + 1} of ${photos.length} ("${photo.alt}") has no credit — a photograph without a credit is a rights problem (image-beat/references/image-discipline.md, "Alt text and credit")`,
      );
    }
  });

  const T = tokensFor(frame.minTypePx);
  const stageTop = frame.stage ? frame.stage.top : 0;
  const stageBottom = frame.stage ? frame.stage.bottom : frame.height;
  // A row while the frame is wider than it is tall; a stack once it is not.
  const stacked = frame.height > frame.width;

  const contentWidth = frame.width - T.PAD * 2;
  const columnWidth = stacked
    ? contentWidth
    : Math.floor((contentWidth - T.GAP * (photos.length - 1)) / photos.length);

  const titleLines = wrap(title, contentWidth, T.TITLE);
  const titleBaseline = stageTop + T.PAD + T.TITLE.fontSize;
  const firstBoxTop =
    stageTop + T.PAD + titleLines.length * T.TITLE.lead + T.TITLE_BOTTOM_GAP;

  // Every column's own text block, measured before the box height is known — in a row the tallest
  // one governs, so all three boxes stay the same height whatever their captions do. One
  // consistent box is the discipline; a per-photo height would break it.
  const textBlocks = photos.map((photo) => {
    const captionLines = photo.caption?.trim()
      ? wrap(photo.caption.trim(), columnWidth, T.CAPTION)
      : [];
    const noteLines = photo.note?.trim()
      ? wrap(photo.note.trim(), columnWidth, T.NOTE)
      : [];
    const height =
      T.CAPTION_TOP_GAP +
      captionLines.length * T.CAPTION.lead +
      (noteLines.length > 0 ? T.NOTE_TOP_GAP + noteLines.length * T.NOTE.lead : 0) +
      T.CREDIT_TOP_GAP +
      T.CREDIT.fontSize;
    return { captionLines, noteLines, height };
  });

  const tallestText = Math.max(...textBlocks.map((block) => block.height));
  const boxHeight = stacked
    ? Math.floor(
        (stageBottom - T.PAD - firstBoxTop - T.GAP * (photos.length - 1)) /
          photos.length,
      ) - tallestText
    : stageBottom - T.PAD - tallestText - firstBoxTop;

  if (boxHeight < frame.minTypePx * 4) {
    throw new Error(
      `the pinned ${frame.width}x${frame.height} frame leaves only ${boxHeight}px for each photograph once the title and ${photos.length} caption blocks are laid out — shorten the title or the captions, or pin a size with room for them`,
    );
  }

  let cursorY = firstBoxTop;
  const blocks = photos.map((photo, i) => {
    const boxLeft = stacked ? T.PAD : T.PAD + i * (columnWidth + T.GAP);
    const boxTop = stacked ? cursorY : firstBoxTop;
    const fit = fitBox(
      { width: photo.intrinsicWidth, height: photo.intrinsicHeight },
      { width: columnWidth, height: boxHeight },
    );
    const { captionLines, noteLines } = textBlocks[i];
    // `captionTop` is the TOP of the caption block, and the baseline is `captionTop + fontSize`.
    // The seed treats the same field as a BASELINE (`y={block.captionTop + j * CAPTION.lead}`,
    // `ImageBeatSeed.tsx`) while giving the credit below it the `+ fontSize` this line has — so a
    // caption's ascenders climb a whole cap-height into the photograph above it. At the seed's own
    // 15 px it is one pixel and invisible; at this beat's 34 px it is eight, and at portrait's
    // 47 px the year sits inside the picture. Look at `image-beat/assets/preview.png` and at this
    // beat's first render for the two ends of it.
    const captionTop = boxTop + boxHeight + T.CAPTION_TOP_GAP;
    const noteTop =
      captionTop + captionLines.length * T.CAPTION.lead + T.NOTE_TOP_GAP;
    const creditTop =
      (noteLines.length > 0
        ? noteTop + noteLines.length * T.NOTE.lead
        : captionTop + captionLines.length * T.CAPTION.lead) + T.CREDIT_TOP_GAP;
    cursorY = creditTop + T.CREDIT.fontSize + T.GAP;
    return {
      boxLeft,
      boxTop,
      boxWidth: columnWidth,
      boxHeight,
      fit,
      dataUri: photo.dataUri,
      alt: photo.alt,
      credit: photo.credit,
      captionLines,
      captionTop,
      noteLines,
      noteTop,
      creditTop,
    };
  });

  const lastBottom = blocks[blocks.length - 1].creditTop + T.CREDIT.fontSize;
  if (lastBottom > stageBottom) {
    throw new Error(
      `this beat draws down to y=${lastBottom} but the ${frame.width}x${frame.height} stage ends at y=${stageBottom} — content below it is at risk of being covered by the platform's own chrome`,
    );
  }

  return {
    width: frame.width,
    height: frame.height,
    tokens: T,
    stage: { top: stageTop, bottom: stageBottom },
    titleLines,
    titleBaseline,
    blocks,
  };
}

export function QuaySequence({
  photos,
  title,
  ground,
  frame,
}: {
  photos: PhotoInput[];
  title: string;
  ground: string;
  frame: Frame;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, tokens, titleLines, titleBaseline, blocks } =
    quayLayout(photos, title, frame);

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
          x={tokens.PAD}
          y={titleBaseline + i * tokens.TITLE.lead}
          fill={ink}
          fontSize={tokens.TITLE.fontSize}
          fontWeight={tokens.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {blocks.map((block, i) => (
        // `role="img"` + `<desc>` on the GROUP, and `data-credit` off the SAME string the visible
        // credit `<text>` draws — the pairing `photosDeclareAltAndCredit`
        // (`detect-every-photo-says-what-it-shows.mjs`) reads back off the delivered markup.
        <g key={i} role="img" aria-label={block.alt} data-credit={block.credit}>
          <desc>{block.alt}</desc>
          {/* The box, filled with `grid`: a photograph that does not reach its edges leaves a
              bar rather than an unexplained gap of raw ground. On this newsroom's dark ground
              that bar measures 1.75:1 against the ground and a dark photograph disappears into
              it — see the beat's own HANDOVER.md, which says so out loud rather than adding the
              hairline frame `image-discipline.md`'s "Every layer earns its place" forbids. */}
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
              y={block.captionTop + tokens.CAPTION.fontSize + j * tokens.CAPTION.lead}
              fill={ink}
              fontSize={tokens.CAPTION.fontSize}
              fontWeight={tokens.CAPTION.fontWeight}
            >
              {line}
            </text>
          ))}
          {block.noteLines.map((line, j) => (
            <text
              key={line}
              x={block.boxLeft}
              y={block.noteTop + tokens.NOTE.fontSize + j * tokens.NOTE.lead}
              fill={muted}
              fontSize={tokens.NOTE.fontSize}
            >
              {line}
            </text>
          ))}
          <text
            x={block.boxLeft}
            y={block.creditTop + tokens.CREDIT.fontSize}
            fill={muted}
            fontSize={tokens.CREDIT.fontSize}
          >
            {block.credit}
          </text>
        </g>
      ))}
    </svg>
  );
}

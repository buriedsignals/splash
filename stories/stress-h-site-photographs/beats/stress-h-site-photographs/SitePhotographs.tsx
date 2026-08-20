/**
 * Three photographs from the site: a wide establishing shot, a portrait taken on a phone, and one
 * very large drone frame. Written from `skills/image-beat/assets/ImageBeatSeed.tsx`'s shape for
 * THIS story's own three photos — not an import of the seed, a fresh component in its shape.
 */

import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
  fitBox,
} from "./render-still.mjs";

export type PhotoInput = {
  dataUri: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  alt: string;
  credit: string;
  caption?: string;
};

const FRAME_WIDTH = 900;
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const CAPTION = { fontSize: 15, fontWeight: 400, lead: 20 };
const CREDIT = { fontSize: 13, fontWeight: 400 };
const BOX_HEIGHT = 420;
const CAPTION_TOP_GAP = 10;
const CREDIT_TOP_GAP = 4;
const BLOCK_GAP = 32;

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

export function siteLayout(photos: PhotoInput[], title: string) {
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

  let cursorY = PAD + titleLines.length * TITLE.lead + 20;

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

export function SitePhotographs({
  photos,
  title,
  ground,
}: {
  photos: PhotoInput[];
  title: string;
  ground: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, titleLines, titleBaseline, blocks } = siteLayout(
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
        <g key={i} role="img" aria-label={block.alt} data-credit={block.credit}>
          <desc>{block.alt}</desc>
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

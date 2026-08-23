/**
 * Beat 1 of `r8-photographs-halemaumau-filling` — image / static, size `landscape` (1920x1080).
 *
 * Written from the shape `skills/image-beat/assets/ImageBeatSeed.tsx` teaches, NOT imported from
 * it and not an extension of it. Three differences from the seed, each forced by this beat:
 *
 *   1. THE FRAME IS PINNED, so the box is derived and not the height. The seed derives its frame
 *      HEIGHT from its content, which cannot honour a size gate 2c pinned. Here 1920x1080 is fixed
 *      and `craterLayout` solves for the box instead — exactly the inversion
 *      `stress-w-quay-photographs` had to make for the same reason.
 *   2. A ROW, not a stack. Three photographs stacked inside 1080 px of height would leave each of
 *      them about 130 px tall. Three abreast leaves each box 536 px wide, which is the only
 *      arrangement in which the panorama is still a photograph rather than a stripe.
 *   3. THE CAPTION'S TOP IS A TOP HERE. The seed computes
 *      `captionTop = boxTop + BOX_HEIGHT + CAPTION_TOP_GAP` and then draws the caption AT that
 *      value as an SVG `y`, which is a BASELINE — so a 10 px "gap" puts the caption's own cap
 *      height about a pixel ABOVE the bottom of the letterbox bar it is supposed to sit under.
 *      Measured on this beat's own numbers in `render.mjs`. This component adds the font size, so
 *      the named gap is the gap a reader sees.
 *
 * WHAT IT STILL DOES NOT DO, deliberately, because these are the seed's rules and they are right:
 * it never crops and never stretches (every photo is letterboxed with `fitBox` into ONE consistent
 * box), it never re-sorts the journalist's order, and it never writes an alt text, a caption or a
 * credit — `craterLayout` refuses to lay out a photograph missing alt or credit, exactly as
 * `imageBeatLayout` does, and that refusal is what this beat's own `render.mjs` runs first, against
 * the frozen manifest, and records.
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
  /** Required. No default, and never derived from the pixels. */
  alt: string;
  /** Required. Same rule, same reason. */
  credit: string;
  /** Optional. The journalist's own sentence. Every caption on this beat names the date and the
   *  episode that produced the state its photograph shows — the reference loop's own lesson,
   *  recorded in `STORYBOARD.md`. */
  caption?: string;
};

/** The pinned frame. `size: landscape` in `BRIEF.md`; the numbers themselves come from
 *  `sizes.mjs`, and `render.mjs` asserts them off the delivered PNG's own bytes. */
const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;
/** `frameInsetFor("landscape")` — `max(round(40/900 * 1920), 26 * 2)`. Written out rather than
 *  imported so this component stays a pure function of numbers; `render.mjs` asserts it agrees. */
const PAD = 85;

/** The 900x560 base tokens of the seed (26 / 15 / 13), taken up by the `landscape` row's own
 *  `typeScale` of 2.2. The smallest token here is 29, over the row's 26 px floor;
 *  `assertTypeFloor` measures the rendered markup rather than trusting this comment. */
const TITLE = { fontSize: 57, fontWeight: 700, lead: 70 };
const DECK = { fontSize: 33, fontWeight: 400, lead: 44 };
const CAPTION = { fontSize: 33, fontWeight: 400, lead: 44 };
const CREDIT = { fontSize: 29, fontWeight: 400, lead: 36 };

const COLUMN_GAP = 71;
const DECK_TOP_GAP = 22;
const BOXES_TOP_GAP = 32;
const CAPTION_TOP_GAP = 22;
const CREDIT_TOP_GAP = 12;
const FOOTER_RULE_GAP = 28;
const RULE_WEIGHT = 2;

/** Wrap on the measured width of the real string, never on a character count. The seed's own rule,
 *  carried because a beat may not import another skill's file. */
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
 * The journalist's photographs and words to a laid-out 1920x1080 frame. Pure: coordinates, wrapped
 * lines and fitted boxes, no colour and no bytes.
 *
 * Throws on fewer than two photographs, on a photograph with no alt, on a photograph with no
 * credit — the same three refusals `imageBeatLayout` makes, in the same one place — and on a box
 * that has been squeezed below `MIN_BOX_HEIGHT`, which the seed cannot refuse because its frame
 * grows instead.
 */
export const MIN_BOX_HEIGHT = 280;

export function craterLayout(
  photos: PhotoInput[],
  title: string,
  deck: string,
  footer: string,
) {
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

  const contentWidth = FRAME_WIDTH - PAD * 2;
  const boxWidth = Math.floor(
    (contentWidth - COLUMN_GAP * (photos.length - 1)) / photos.length,
  );

  const titleLines = wrap(title, contentWidth, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const deckLines = wrap(deck, contentWidth, DECK);
  const deckFirstBaseline =
    titleBaseline +
    (titleLines.length - 1) * TITLE.lead +
    DECK_TOP_GAP +
    DECK.fontSize;
  const deckBottom = deckFirstBaseline + (deckLines.length - 1) * DECK.lead;

  // The footer, measured up from the frame's own bottom margin.
  const footerLines = wrap(footer, contentWidth, CREDIT);
  const footerFirstBaseline =
    FRAME_HEIGHT - PAD - (footerLines.length - 1) * CREDIT.fontSize * 1.35;
  const ruleY = Math.round(
    footerFirstBaseline - CREDIT.fontSize - FOOTER_RULE_GAP,
  );

  // Every caption wraps to the box's own width; the block under every box is as tall as the
  // LONGEST of them, so the three credits sit on one line as a reader expects them to.
  const captionLines = photos.map((p) =>
    p.caption?.trim() ? wrap(p.caption.trim(), boxWidth, CAPTION) : [],
  );
  // THE CREDIT WRAPS TOO, and that is the second departure from the seed. `ImageBeatSeed` draws a
  // credit as one unwrapped `<text>`; a real credit — "USGS webcam images — no photographer
  // stated" — measures 623px against a 536px box and runs straight into the next photograph's
  // credit. Nothing in this format measures a run overflowing its own box: `decollide` in
  // `render-still.mjs` resolves VERTICAL collisions only, `photosDeclareAltAndCredit` reads the
  // markup and not the geometry, and the first render of this beat shipped that collision with
  // every guard green. Recorded in NOTES-FOR-MAINTAINER.md.
  const creditLines = photos.map((p) =>
    wrap(p.credit.trim(), boxWidth, CREDIT),
  );
  const maxCaptionLines = Math.max(...captionLines.map((l) => l.length));
  const maxCreditLines = Math.max(...creditLines.map((l) => l.length));
  const captionBlockHeight =
    CAPTION_TOP_GAP +
    maxCaptionLines * CAPTION.lead +
    (maxCaptionLines > 0 ? CREDIT_TOP_GAP : 0) +
    (maxCreditLines - 1) * CREDIT.lead +
    CREDIT.fontSize;

  const boxTop = deckBottom + BOXES_TOP_GAP;
  const boxHeight = ruleY - FOOTER_RULE_GAP - captionBlockHeight - boxTop;
  if (boxHeight < MIN_BOX_HEIGHT) {
    throw new Error(
      `this beat's title, deck, captions and footer leave ${boxHeight}px for each photograph's ` +
        `box, under the ${MIN_BOX_HEIGHT}px floor. The frame is pinned at ${FRAME_WIDTH}x${FRAME_HEIGHT} ` +
        `by gate 2c, so the words have to come down, not the frame up.`,
    );
  }

  const blocks = photos.map((photo, i) => {
    const boxLeft = PAD + i * (boxWidth + COLUMN_GAP);
    const fit = fitBox(
      { width: photo.intrinsicWidth, height: photo.intrinsicHeight },
      { width: boxWidth, height: boxHeight },
    );
    // THE CAPTION'S TOP IS A TOP. `+ CAPTION.fontSize` is the whole difference from the seed: an
    // SVG `<text y>` is a BASELINE, so a "top gap" used as a baseline puts the caption's ink
    // inside the letterbox bar above it.
    const captionFirstBaseline =
      boxTop + boxHeight + CAPTION_TOP_GAP + CAPTION.fontSize;
    // THE CREDITS SHARE ONE BASELINE, off `maxCaptionLines` and never off this photo's own count.
    // Derived per photo they step up and down with each caption's wrap and read as a ragged edge;
    // a reader takes three credits on one line as one row of attribution.
    const creditBaseline =
      captionFirstBaseline +
      (maxCaptionLines > 0
        ? (maxCaptionLines - 1) * CAPTION.lead +
          CREDIT_TOP_GAP +
          CREDIT.fontSize
        : 0);
    return {
      boxLeft,
      boxTop,
      boxWidth,
      boxHeight,
      fit,
      dataUri: photo.dataUri,
      alt: photo.alt,
      credit: photo.credit,
      captionLines: captionLines[i],
      creditLines: creditLines[i],
      captionFirstBaseline,
      creditBaseline,
    };
  });

  return {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    pad: PAD,
    contentWidth,
    titleLines,
    titleBaseline,
    titleLead: TITLE.lead,
    deckLines,
    deckFirstBaseline,
    deckLead: DECK.lead,
    footerLines,
    footerFirstBaseline,
    ruleY,
    blocks,
    boxHeight,
    boxWidth,
  };
}

export function CraterFilling({
  photos,
  title,
  deck,
  footer,
  ground,
  accent,
}: {
  photos: PhotoInput[];
  title: string;
  deck: string;
  footer: string;
  ground: string;
  accent: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const layout = craterLayout(photos, title, deck, footer);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      fontFamily={FONT_FAMILY}
      role="img"
      aria-label={title}
    >
      <desc>{`${title}. ${deck}`}</desc>
      <rect
        x={0}
        y={0}
        width={layout.width}
        height={layout.height}
        fill={ground}
      />

      {layout.titleLines.map((line, i) => (
        <text
          key={`t${i}`}
          x={layout.pad}
          y={layout.titleBaseline + i * layout.titleLead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {layout.deckLines.map((line, i) => (
        <text
          key={`d${i}`}
          x={layout.pad}
          y={layout.deckFirstBaseline + i * layout.deckLead}
          fill={muted}
          fontSize={DECK.fontSize}
        >
          {line}
        </text>
      ))}

      {layout.blocks.map((block, i) => (
        // `role="img"` + `<desc>` on the GROUP: an `<image>` cannot carry a `<desc>` child, the
        // group wrapping it can. `data-credit` comes off the SAME string the visible credit draws,
        // never a second source of truth — that is what makes the promise mechanically checkable
        // by `photosDeclareAltAndCredit`.
        <g
          key={`p${i}`}
          role="img"
          aria-label={block.alt}
          data-credit={block.credit}
        >
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
              key={`c${i}-${j}`}
              x={block.boxLeft}
              y={block.captionFirstBaseline + j * CAPTION.lead}
              fill={ink}
              fontSize={CAPTION.fontSize}
            >
              {line}
            </text>
          ))}
          {block.creditLines.map((line, j) => (
            <text
              key={`cr${i}-${j}`}
              x={block.boxLeft}
              y={block.creditBaseline + j * CREDIT.lead}
              fill={muted}
              fontSize={CREDIT.fontSize}
            >
              {line}
            </text>
          ))}
        </g>
      ))}

      {/* The one mark on this frame that is not a photograph, a caption or a credit: the rule that
          separates the evidence from the line saying where the numbers in the deck came from. It
          is drawn in the house accent because it is the only place the accent has to do. */}
      <rect
        x={layout.pad}
        y={layout.ruleY}
        width={layout.contentWidth}
        height={RULE_WEIGHT}
        fill={accent}
      />
      {layout.footerLines.map((line, i) => (
        <text
          key={`f${i}`}
          x={layout.pad}
          y={layout.footerFirstBaseline + i * CREDIT.fontSize * 1.35}
          fill={muted}
          fontSize={CREDIT.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

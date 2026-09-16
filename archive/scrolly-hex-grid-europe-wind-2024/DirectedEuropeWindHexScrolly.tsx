// SCAFFOLD: scaffolded --from proof/scrolly-hex-grid-europe-protection — this file is that beat's own code, renamed for this one. The
// header comment below, and every region marked SCAFFOLD:, describe proof/scrolly-hex-grid-europe-protection's own subject; rewrite them
// for this beat's. Read proof/scrolly-hex-grid-europe-protection/BRIEF.md alongside this code before changing the choreography.
/**
 * Ukrainians under temporary protection in Europe, one hexagon per country, drawn THROUGH the design base as a hex
 * grid and CHOREOGRAPHED by the scroll. The `hex grid` type in the scrolly format: the subject of
 * `static-hex-grid-europe-protection` — per inhabitant it is not Germany but Czechia — told with the gestures a
 * scroll can make (`scrolly/references/directed-type-choreography.md`): the same cells coloured by count, then by
 * rate; the cells leaving the map for a ranking and coming back.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one unit, one cell, all cells equal; odd rows offset by half a cell so every
 * neighbour shares an edge; cells separated by the ground's own colour; the code inside its cell in the ink or the
 * ground, whichever reads; one stepped ramp between the direction's poles, the lowest class floored against the
 * ground; Ukraine on the grid and outside the count, in a neutral outside the ramp.
 *
 * `hex-drive.mjs` places every cell in the reader's pixels on each paint. What is rendered here is the last card's
 * picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The Splash repo root — the nearest ancestor whose package.json declares the "#shared/*" import — found by
 *  walking up rather than counting levels, so this runner works unchanged from proof/<beat>/ or a story's own
 *  stories/<slug>/beats/<id>/. */
function splashRoot(startDir) {
  const looked = [];
  for (let dir = startDir; ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // an unparsable package.json is not this function's business — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\n  ${looked.join("\n  ")}`);
    dir = parent;
  }
}

const ROOT = splashRoot(HERE);
const { CardImages, shapeSelectionCss } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards.mjs"));

import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Tile = {
  code: string;
  row: number;
  col: number;
  name: string;
  count: number | null;
  rate: number | null;
  countClass: number | null;
  rateClass: number | null;
  rateText: string;
};
type Style = Record<string, string | number>;

export function DirectedEuropeWindHexScrolly({
  plan,
  fallbacks,
  reference,
  tiles,
  ranked,
  subject,
  largest,
  countBreaks,
  rateBreaks,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  plan: Record<string, unknown>;
  fallbacks: Record<"wide" | "tall", { x1: string; x2: string }>[];
  reference: { width: number; height: number };
  tiles: Tile[];
  ranked: string[];
  subject: string;
  largest: string;
  countBreaks: string[];
  rateBreaks: string[];
  words: {
    countUnit: string;
    rateUnit: string;
    countNote: string;
    rateNote: string;
    rankNote: string;
    pairNote: string;
    originNote: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const floor = (colour: string) =>
    contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN
      ? colour
      : (adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN) ?? colour);
  const low = floor(mix(accent, ground, 0.88));
  const high = mix(accent, ink, 0.3);
  const classCount = 5;
  const classFill = (i: number) => mix(low, high, i / (classCount - 1));
  const originFill = floor(mix(ground, ink, 0.16));
  const empty = mix(ground, ink, 0.07);
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const fills = Array.from({ length: classCount }, (_, i) => classFill(i));
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const W = 80;
  const hexPath = (cx: number, cy: number, r: number) =>
    `M${Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k - Math.PI / 2;
      return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join("L")}Z`;
  const key = (unit: string, breaks: string[], part: string) => (
    <span
      data-part={part}
      style={{
        gridArea: "1 / 1",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: "4px 14px",
      }}
    >
      <span
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${classCount}, 52px)`,
          gap: "2px",
          paddingBottom: "1.4em",
        }}
      >
        {fills.map((f, i) => (
          <span
            key={i}
            style={{ position: "relative", height: "10px", background: f }}
          >
            {i < breaks.length && (
              <span
                style={{
                  ...regs.axis,
                  position: "absolute",
                  left: "100%",
                  top: "12px",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  color: mutedInk,
                }}
              >
                {breaks[i]}
              </span>
            )}
          </span>
        ))}
      </span>
      <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
    </span>
  );

  const scope = '[data-part="symbols"]';
  const shapeCss = shapeSelectionCss(scope, reference);

  // SCAFFOLD: the JSX below is proof/scrolly-hex-grid-europe-protection's own key/counter/notes around the live map. Adapt the words and

  // swatches to this beat's own subject, keeping the data-part contract the driver and CSS rely on.

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-hex={JSON.stringify({
        tiles: tiles.map(({ code, row, col, countClass, rateClass }) => ({
          code,
          row,
          col,
          countClass,
          rateClass,
        })),
        ranked,
        subject,
        largest,
        colours: { fills, originFill, empty, ink, ground, accentInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: shapeCss }} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ display: "grid" }}>
          {(["countNote", "rateNote", "rankNote", "pairNote"] as const).map(
            (k) => (
              <span
                key={k}
                data-note={k}
                style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
              >
                {words[k]}
              </span>
            ),
          )}
        </span>
      </div>

      <div
        data-part="stage"
        style={{ position: "relative", minHeight: 0, overflow: "hidden" }}
      >
        <CardImages fallbacks={fallbacks} first={0} />
        <div
          data-part="live"
          style={{ position: "absolute", inset: 0, opacity: 0 }}
        />
        <script
          type="application/json"
          data-part="plan"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(plan).replace(/</g, "\\u003c"),
          }}
        />
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${W * 8.5} ${W * 0.866 * 6 + W * 0.3}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {tiles.map((t) => {
            const cx = W * (t.col + 0.5 + (t.row % 2 ? 0.5 : 0));
            const cy = W * 0.5 + t.row * W * 0.866;
            const fill =
              t.rateClass === null ? originFill : classFill(t.rateClass);
            return (
              <g key={t.code} data-tile={t.code}>
                <path
                  data-part="hex"
                  d={hexPath(cx, cy, W / Math.sqrt(3))}
                  fill={fill}
                  stroke={ground}
                  strokeWidth={2}
                />
                <path
                  data-part="ring"
                  d={hexPath(cx, cy, W / Math.sqrt(3) + 4)}
                  fill="none"
                  stroke={accentInk}
                  strokeWidth={2.5}
                  opacity={0}
                />
                <text
                  data-part="code"
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={legibleOn(fill)}
                  style={{
                    fontFamily: String(regs.axis.fontFamily),
                    fontSize: `${Number.parseFloat(String(regs.axis.fontSize))}px`,
                    fontWeight:
                      t.code === subject ? 700 : Number(regs.axis.fontWeight),
                    letterSpacing: String(regs.axis.letterSpacing ?? "normal"),
                  }}
                >
                  {t.code}
                </text>
                <text
                  data-part="value"
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={legibleOn(fill)}
                  opacity={0}
                  style={{
                    fontFamily: String(regs.value.fontFamily),
                    fontSize: `${Number.parseFloat(String(regs.axis.fontSize))}px`,
                    fontWeight: 700,
                  }}
                >
                  {t.rateText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "grid" }}>
        {key(words.countUnit, countBreaks, "count-key")}
        {key(words.rateUnit, rateBreaks, "rate-key")}
      </div>
      <span data-part="origin-note" style={{ ...regs.axis, color: mutedInk }}>
        {words.originNote}
      </span>
    </div>
  );
}

/**
 * The scrolly family component of the point / line / field maps (Geo F8): one map that fills the stage, the
 * static kit's baked plate under the marks' own projected geometry (GestureGeoPointMap.tsx), painted per scroll
 * position by the drive (gesture-geo-point-scrolly.mjs `applyGeoPointState`) from the cards' flat states — the camera
 * box fitted to the stage, each mark's accent / ring / step-back / arrival, each word seated over its mark in the
 * reader's pixels. With JavaScript off the closing card's picture stands whole, its words at their places.
 */
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  GeoPointMarks,
  type Geometry,
  type Roles,
} from "./GestureGeoPointMap.tsx";

export type ScrollyWord = {
  k: number;
  text: string;
  x: number;
  y: number;
  accent: boolean;
  kind: string;
  cards: number[];
};

export function GestureGeoPointScrolly({
  geometry: G,
  pictures,
  words,
  cams,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  land,
}: {
  geometry: Geometry;
  pictures: { roles: Roles }[];
  words: ScrollyWord[];
  cams: { vx: number; vy: number; vw: number; vh: number }[];
  unit: string;
  alt: string;
  regs: any;
  ground: string;
  accent: string;
  ink: string;
  land: string;
}) {
  const accentInk =
    contrast(accent, land) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(accent, land, TEXT_CONTRAST_MIN) ?? accent);
  const labelInk = adjustToContrast(ink, land, TEXT_CONTRAST_MIN) ?? ink;
  let neutral = mix(land, ink, 0.45);
  neutral = adjustToContrast(neutral, land, NON_TEXT_CONTRAST_MIN) ?? neutral;
  // A ring is a mark, not a word: a dark grey held to the non-text floor on the land, never the full ink.
  const ring = adjustToContrast(mix(land, ink, 0.62), land, NON_TEXT_CONTRAST_MIN) ?? mix(land, ink, 0.62);
  const inks = { accent, neutral, ring, ground, water: land };
  const closing = pictures.at(-1)!;
  const last = pictures.length - 1;
  const data = {
    marks: G.marks.map((m) => ({ kind: m.kind })),
    words: words.map((w) => ({ k: w.k, x: w.x, y: w.y })),
    refs: (G.references ?? []).map((r) => r.value),
    inks,
    cams,
  };
  return (
    <div
      data-geopoint={JSON.stringify(data)}
      style={{ position: "absolute", inset: 0, background: ground }}
    >
      <div
        data-part="stage"
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      >
        <svg
          data-part="field"
          role="img"
          aria-label={alt}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${G.whole.x} ${G.whole.y} ${G.whole.w} ${G.whole.h}`}
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <rect
            x={-5000}
            y={-5000}
            width={10000 + G.W}
            height={10000 + G.H}
            fill={inks.water}
          />
          <GeoPointMarks G={G} roles={closing.roles} inks={inks} indexed />
        </svg>
        {words.map((w) => (
          <span
            key={w.k}
            data-word={w.k}
            style={{
              ...(w.kind === "area"
                ? regs.axis
                : w.kind === "note" || w.kind === "name"
                  ? regs.value
                  : regs.annot),
              position: "absolute",
              left: `${(((w.x - G.whole.x) / G.whole.w) * 100).toFixed(3)}%`,
              top: `${(((w.y - G.whole.y) / G.whole.h) * 100).toFixed(3)}%`,
              transform: "translate(7px, -50%)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              fontStyle: w.kind === "water" ? "italic" : undefined,
              color: w.accent ? accentInk : labelInk,
              textShadow: `0 0 3px ${land}, 0 0 3px ${land}, 0 0 2px ${land}`,
              opacity: w.cards.includes(last) ? 1 : 0,
            }}
          >
            {w.text}
          </span>
        ))}
        {unit ? (
          <p
            style={{
              ...regs.axis,
              position: "absolute",
              left: 12,
              bottom: 8,
              margin: 0,
              color: labelInk,
              textShadow: `0 0 3px ${land}`,
            }}
          >
            {unit}
          </p>
        ) : null}
      </div>
    </div>
  );
}

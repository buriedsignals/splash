/**
 * Europe's low-carbon electricity in 2024, drawn THROUGH the design base as a choropleth and CHOREOGRAPHED
 * by the scroll. The `choropleth` type in the scrolly format: the subject of
 * `static-choropleth-europe-lowcarbon` — seven countries above 94 %, six in the north-west and Albania —
 * told with the gestures a scroll can make (`scrolly/references/directed-type-choreography.md`).
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: its camera (Web Mercator on the plate's own bounds and aspect);
 * one ramp between the direction's own poles in six classes, breaks in %; the reporting country with no
 * reading in a neutral outside the ramp; countries outside the study set in the faintest land step; the sea
 * and the land in the tints the plate is baked in (`plateTints`); names in the axis register.
 *
 * THE BASEMAP IS NOT BAKED HERE. The static plate sits on a MapTiler raster; this page draws the same
 * shapes as vectors so that each country can take its own fill as the scroll moves, and so that the zoom
 * onto the Balkans is a camera move rather than an enlarged picture. Relief and the basemap's own labels
 * are what is given up; the source line says the shapes are Natural Earth's.
 *
 * ONE COORDINATE SPACE. The SVG's viewBox is the camera; the zoom is that viewBox travelling onto a box
 * around Albania and its neighbours, fitted uniformly. Every name is HTML, placed on its country's seat
 * through the SVG's own screen matrix. What is rendered here is the last card's picture.
 */

import type { CSSProperties } from "react";
import { adjustToContrast, mix, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";

export type Shape = { iso: string; path: string; seat: { x: number; y: number }; value: number | null; studied: boolean; classIndex: number | null };
export type Name = { iso: string; text: string; role: "top" | "odd" | "neighbour" | "missing" };
type Style = Record<string, string | number>;

export function DirectedChoroplethScrolly({
  shapes,
  width,
  height,
  zoomBox,
  breaks,
  names,
  topCount,
  unit,
  missingLabel,
  waters,
  alt,
  regs,
  pad,
  stroke,
  ground,
  accent,
  ink,
  muted,
  grid,
  water,
}: {
  shapes: Shape[];
  width: number;
  height: number;
  zoomBox: { x: number; y: number; w: number; h: number };
  breaks: string[];
  names: Name[];
  topCount: { template: string; value: number };
  unit: string;
  missingLabel: string;
  waters: { text: string; x: number; y: number }[];
  alt: string;
  regs: Record<"display" | "eyebrow" | "body" | "axis" | "annot" | "value", Style>;
  pad: number;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  water: { water: string; land: string };
}) {
  const low = mix(accent, ground, 0.88);
  const high = mix(accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) => mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  const missingFill = mix(ground, ink, 0.13);
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const waterInk = adjustToContrast("#1F6FB2", water.water, TEXT_CONTRAST_MIN) ?? inkOnGround;
  const hairline = stroke.hairline ?? 0.6;
  const abs = (extra: CSSProperties): CSSProperties => ({ position: "absolute", ...extra });
  const fillOf = (s: Shape) => (!s.studied ? water.land : s.value === null ? missingFill : classFill(s.classIndex ?? 0));

  return (
    <div
      role="img"
      aria-label={alt}
      data-choropleth={JSON.stringify({
        width,
        height,
        zoomBox,
        shapes: shapes.filter((s) => s.studied).map(({ iso, seat, value, classIndex }) => ({ iso, seat, value, classIndex })),
        fills: { classes: Array.from({ length: classCount }, (_, i) => classFill(i)), missing: missingFill, land: water.land },
        top: names.filter((n) => n.role === "top" || n.role === "odd").map((n) => n.iso),
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        rowGap: "10px",
        // The page's own side gutter — the header's — so the map's edges line up with the title's.
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div data-part="count-panel" style={{ display: "flex", justifyContent: "flex-end" }}>
        <span data-part="top-count" data-template={topCount.template} data-value={topCount.value} style={{ ...regs.value, color: accentInk, whiteSpace: "nowrap" }}>
          {topCount.template.replace("{n}", String(topCount.value))}
        </span>
      </div>

      {/* THE MAP FILLS ITS ROW, gutter to gutter: `choropleth-drive.mjs` fits the camera's frame inside the
          stage and widens the view to the stage's own aspect, so no side of the row is left bare. */}
      <div data-part="stage" style={{ position: "relative", minHeight: 0, overflow: "hidden", background: water.water }}>
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={abs({ inset: 0, width: "100%", height: "100%" })}
        >
          {/* The geography is drawn 900 × 500 units past the frame (`choropleth-geometry.mjs`), so the
              stage is clipped to that margin, not to the frame: a wider stage and a low close-up show land
              and sea, never a cut coastline. */}
          <defs>
            <clipPath id="choropleth-frame">
              <rect x={-890} y={-490} width={width + 1780} height={height + 980} />
            </clipPath>
          </defs>
          <g clipPath="url(#choropleth-frame)">
          <rect data-part="sea" x={-890} y={-490} width={width + 1780} height={height + 980} fill={water.water} />
          {shapes.map((s) => (
            <path
              key={s.iso}
              data-shape={s.iso}
              d={s.path}
              fill={fillOf(s)}
              stroke={s.studied ? grid : ground}
              strokeWidth={hairline}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {shapes
            .filter((s) => names.some((n) => n.iso === s.iso && n.role === "odd"))
            .map((s) => (
              <circle key={`ring${s.iso}`} data-part="odd-ring" cx={s.seat.x} cy={s.seat.y} r={22} fill="none" stroke={accentInk} strokeWidth={(stroke.rule ?? 1) * 2} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>

        {waters.map((w) => (
          <span key={w.text} data-water data-x={w.x} data-y={w.y} style={abs({ ...regs.annot, color: waterInk, left: 0, top: 0, transform: "translate(-50%, -50%)", whiteSpace: "nowrap" })}>
            {w.text}
          </span>
        ))}
        {/* The leader from the odd one's name, lifted above the card that reads over it, down to its country. */}
        <div data-part="odd-leader" style={abs({ left: 0, top: 0, width: 0, height: 0, borderLeft: `${(stroke.rule ?? 1) * 1.5}px solid ${accentInk}`, opacity: 0 })} />
        {names.map((n) => (
          <span
            key={`${n.role}${n.iso}`}
            data-name={n.iso}
            data-role={n.role}
            style={abs({
              ...regs.axis,
              left: 0,
              top: 0,
              transform: "translate(-50%, -50%)",
              whiteSpace: "nowrap",
              background: ground,
              padding: "1px 5px",
              color: n.role === "top" || n.role === "odd" ? accentInk : inkOnGround,
              fontWeight: n.role === "odd" ? 700 : regs.axis.fontWeight,
            })}
          >
            {n.text}
          </span>
        ))}
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${classCount}, 34px)`, gap: "2px", paddingBottom: "1.5em" }}>
          {Array.from({ length: classCount }, (_, i) => (
            <div key={`c${i}`} data-class-swatch={i} style={{ position: "relative", height: "12px", background: classFill(i) }}>
              {i < breaks.length && (
                <span style={{ ...regs.axis, color: mutedInk, position: "absolute", left: "100%", top: "14px", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>{breaks[i]}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
          <span style={{ ...regs.axis, color: mutedInk, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ display: "inline-block", width: "34px", height: "12px", background: missingFill }} />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

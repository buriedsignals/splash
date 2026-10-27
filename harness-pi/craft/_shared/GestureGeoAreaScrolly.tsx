/**
 * The AREA maps' scrolly graphic — choropleth, tile cartogram, hex cartogram, dot density — as one component with a
 * `variant`: the FIXED map that fills the frame behind the travelling prose cards. It is drawn once, every element a
 * card changes carrying the data attributes ./gesture-geo-area-scrolly.mjs `applyGeoAreaState` paints from the
 * interpolated state: cells (`data-geo-key`, their class fill, washed fill and arrival land fill), dots
 * (`data-geo-dot`), rings (`data-geo-ring`, `data-kind` accent | ink), named values (`data-geo-name`), class-floor
 * outlines (`data-geo-floor`), and the camera as the SVG's viewBox. The markup is painted at the FIRST card's state,
 * so with JavaScript off the reader sees the first card's map.
 *
 * Geometry from ./gesture-geo-area-shapes.mjs (frozen shapes or designed grid; no live tiles), colours from
 * ./GestureGeoAreaStatic.tsx geoPalette, so a place reads the same as on the still and the page.
 */
import {
  adjustToContrast,
  contrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { geoPalette } from "./GestureGeoAreaStatic.tsx";
import { layoutCells } from "./gesture-geo-area-shapes.mjs";
import { classIndex } from "./gesture-family-geo.mjs";

export const SCROLLY_FRAME = { width: 900, height: 600 };

export function GestureGeoAreaScrolly({
  variant,
  rows,
  shapes,
  layoutGrid,
  points,
  breaks,
  format,
  first,
  classLabels,
  missingLabel,
  unit,
  alt,
  regs,
  direction,
  ground,
  ink,
  muted,
}: {
  variant: string;
  rows: Array<{ key: string; name: string; value: number | null }>;
  shapes?: any;
  layoutGrid?: string[];
  points?: Array<{ lon: number; lat: number; key: string }>;
  breaks: number[];
  format: (v: number) => string;
  first: Record<string, number>;
  classLabels: string[];
  missingLabel: string;
  unit: string;
  alt: string;
  regs: any;
  direction: any;
  ground: string;
  ink: string;
  muted: string;
}) {
  const { width: W, height: H } = SCROLLY_FRAME;
  const isDots = variant === "dot-density";
  const grids =
    variant === "cartogram-area-distortion-and-tile-cartogram" ||
    variant === "hex-grid-spatial-binning-and-hex-cartogram";
  const palette = geoPalette(direction, breaks.length + 1);
  const { classFill, backFill, missingFill, landFill, accentInk } = palette;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const layout = layoutCells(variant, {
    rows,
    shapes,
    grid: layoutGrid,
    points,
    box: { x: 0, y: 0, width: W, height: H },
  });
  const klass = (v: number | null) =>
    v === null ? null : classIndex(v, breaks);
  const at = (k: string) => (typeof first[k] === "number" ? first[k] : 0);
  const mixT = (a: string, b: string, t: number) =>
    mix(a, b, Math.max(0, Math.min(1, t)));
  const legibleOn = (fill: string) =>
    contrast(labelInk, fill) >= contrast(ground, fill) ? labelInk : ground;
  const rule = Math.max(direction.stroke?.rule ?? 1, 1.2);
  const ringR = (c: any) => Math.max(9, Math.min(26, c.size * 0.32));
  const view =
    typeof first.vw === "number" && first.vw > 0
      ? `${first.vx} ${first.vy} ${first.vw} ${first.vh}`
      : `0 0 ${W} ${H}`;
  const line = (r: any) => ({
    fontFamily: String(r.fontFamily),
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
  });

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: "12px var(--prose-gutter, clamp(16px, 6vw, 56px))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "2px 10px",
        }}
      >
        <span
          style={{ ...regs.axis, color: palette.mutedInk, fontWeight: 700 }}
        >
          {unit}
        </span>
        {!isDots &&
          classLabels.map((label, i) => (
            <span
              key={label}
              style={{
                ...regs.axis,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: classFill(i),
                  display: "inline-block",
                }}
              />
              {label}
            </span>
          ))}
        {!isDots && rows.some((r) => r.value === null) ? (
          <span
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                background: grids ? "transparent" : missingFill,
                border: grids ? `1px solid ${palette.mutedInk}` : undefined,
                display: "inline-block",
              }}
            />
            {missingLabel}
          </span>
        ) : null}
      </div>
      <svg
        data-geo-map={variant}
        data-frame-w={W}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={view}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {layout.land.map((l: any, i: number) => (
          <path
            key={`l${i}`}
            d={l.d}
            fill={landFill}
            stroke={ground}
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!isDots &&
          layout.cells.map((c: any) => {
            const i = klass(c.value);
            const fill =
              i === null ? (grids ? ground : missingFill) : classFill(i);
            const back = i === null ? fill : backFill(i);
            const painted =
              i === null
                ? fill
                : mixT(
                    landFill,
                    mixT(fill, back, at(`b:${c.key}`)),
                    at("classes") - i,
                  );
            return (
              <g
                key={c.key}
                data-geo-key={c.key}
                data-geo-class={i === null ? "none" : i}
                {...(i === null
                  ? {}
                  : {
                      "data-fill": fill,
                      "data-back": back,
                      "data-land": landFill,
                    })}
              >
                <path
                  d={c.d}
                  fill={painted}
                  stroke={c.value === null && grids ? palette.mutedInk : ground}
                  strokeWidth={grids ? rule : 0.7}
                  vectorEffect="non-scaling-stroke"
                />
                {grids && (
                  <text
                    x={c.seat.x}
                    y={c.seat.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    {...line(regs.axis)}
                    fontSize={13}
                    fill={legibleOn(at(`b:${c.key}`) > 0.5 ? back : fill)} data-ink-fill={legibleOn(fill)} data-ink-back={legibleOn(back)}
                  >
                    {c.key}
                  </text>
                )}
              </g>
            );
          })}
        {isDots &&
          layout.dots.map((d: any, i: number) => (
            <circle
              key={`d${i}`}
              data-geo-dot={d.key}
              cx={d.x.toFixed(1)}
              cy={d.y.toFixed(1)}
              r={1.2}
              fill={mix(muted, ground, 0.15)}
              opacity={1 - 0.7 * at(`b:${d.key}`)}
            />
          ))}
        {!isDots &&
          layout.cells
            .filter((c: any) => c.value !== null)
            .map((c: any) => (
              <path
                key={`f${c.key}`}
                data-geo-floor={c.key}
                d={c.d}
                fill="none"
                stroke={labelInk}
                strokeWidth={rule * 1.3}
                vectorEffect="non-scaling-stroke"
                opacity={at(`f:${c.key}`)}
              />
            ))}
        {/* Two rings per place, one per kind; the state's a:/r: fields fade them. */}
        {isDots
          ? layout.cells.flatMap((c: any) =>
              layout.dots
                .filter((d: any) => d.key === c.key)
                .flatMap((d: any, i: number) => [
                  <circle
                    key={`ra${c.key}${i}`}
                    data-geo-ring={c.key}
                    data-kind="accent"
                    cx={d.x.toFixed(1)}
                    cy={d.y.toFixed(1)}
                    r={4.2}
                    fill="none"
                    stroke={accentInk}
                    strokeWidth={1.3}
                    vectorEffect="non-scaling-stroke"
                    opacity={at(`a:${c.key}`)}
                  />,
                  <circle
                    key={`rr${c.key}${i}`}
                    data-geo-ring={c.key}
                    data-kind="ink"
                    cx={d.x.toFixed(1)}
                    cy={d.y.toFixed(1)}
                    r={3.6}
                    fill="none"
                    stroke={labelInk}
                    strokeWidth={0.9}
                    vectorEffect="non-scaling-stroke"
                    opacity={at(`r:${c.key}`)}
                  />,
                ]),
            )
          : layout.cells
              .filter((c: any) => c.value !== null)
              .flatMap((c: any) => {
                const shape = (
                  stroke: string,
                  width: number,
                  kind: string,
                  key: string,
                  halo = false,
                ) =>
                  grids ? (
                    <path
                      key={key}
                      {...(halo
                        ? {}
                        : { "data-geo-ring": c.key, "data-kind": kind })}
                      d={c.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={halo ? undefined : at(`${kind === "accent" ? "a" : "r"}:${c.key}`)}
                    />
                  ) : (
                    <circle
                      key={key}
                      {...(halo
                        ? {}
                        : { "data-geo-ring": c.key, "data-kind": kind })}
                      cx={c.seat.x}
                      cy={c.seat.y}
                      r={ringR(c)}
                      data-r0={ringR(c)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      vectorEffect="non-scaling-stroke"
                      opacity={halo ? undefined : at(`${kind === "accent" ? "a" : "r"}:${c.key}`)}
                    />
                  );
                return [
                  <g
                    key={`ga${c.key}`}
                    data-geo-ring={c.key}
                    data-kind="accent"
                    opacity={at(`a:${c.key}`)}
                  >
                    {shape(ground, rule * 4.4, "accent", `h${c.key}`, true)}
                    {shape(accentInk, rule * 2, "accent", `a${c.key}`, true)}
                  </g>,
                  shape(labelInk, rule * 1.2, "ink", `r${c.key}`),
                ];
              })}
        {/* Named places: name and value (grids: the value under the code), faded in by n:. */}
        {layout.cells
          .filter((c: any) => c.value !== null && !isDots)
          .map((c: any) => (
            <text
              key={`n${c.key}`}
              data-geo-name={c.key}
              data-sy={c.seat.y}
              data-dy={isDots ? -16 : grids ? 15 : ringR(c) + 14}
              data-fs={grids ? 13 : 15}
              x={c.seat.x}
              y={
                isDots
                  ? c.seat.y - 16
                  : grids
                    ? c.seat.y + 15
                    : c.seat.y + ringR(c) + 14
              }
              textAnchor="middle"
              dominantBaseline="middle"
              {...line(regs.annot)}
              fontSize={grids ? 13 : 15}
              fontWeight={700}
              fill={grids ? legibleOn(classFill(klass(c.value)!)) : labelInk}
              stroke={grids ? "none" : ground}
              strokeWidth={grids ? 0 : 3}
              paintOrder="stroke"
              opacity={at(`n:${c.key}`)}
            >
              {grids ? format(c.value) : `${c.name} ${format(c.value)}`}
            </text>
          ))}
      </svg>
    </div>
  );
}

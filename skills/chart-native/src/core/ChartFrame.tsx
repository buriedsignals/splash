// core/ChartFrame — the shared layout shell for every chart type: the insight
// title, an optional subtitle, the SVG slot, an optional tooltip, and the cited
// source. Two modes:
//   - responsive=false (video + static): fixed absolute layout.
//   - responsive=true (interactive): flow layout (title above the plot) with a
//     LINKED source (an embed can be clicked; a PNG can't).
// Line / bar / scatter all wrap their <svg> in this — the ~60-line shell each
// used to duplicate now lives here once (the L1 cartesian extraction).
//
// Header-height safety: chart components call resolveFrameWithHeader() which
// pre-computes padding.top ≥ estimated header height so a 2-line title never
// overlaps the subtitle or the first data row on the first (and only) render.
import type { ReactNode } from "react";
import { COLORS, FONT, TYPE } from "./tokens";

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  source: { name: string; url: string };
  width: number;
  height: number;
  responsive: boolean;
  /** the chart <svg> (absolutely positioned, inset 0) */
  children: ReactNode;
  /** optional HTML tooltip overlay (interactive) */
  tooltip?: ReactNode;
  /** typography/margin scale for non-landscape canvases (default 1) */
  scale?: number;
  /** embedded = the chart is a sticky graphic inside a HOST that already shows the
   *  title (as a header) and the source (as a footer) — a chart-scrolly. Suppress the
   *  chart's OWN title + source to avoid duplicating the host's, keeping only the unit
   *  subtitle (axis context the host does not show). Default false (standalone chart). */
  embedded?: boolean;
}

export function ChartFrame({
  title,
  subtitle,
  source,
  width,
  height,
  responsive,
  children,
  tooltip,
  scale = 1,
  embedded = false,
}: ChartFrameProps) {
  const PAD = 24 * scale; // header / source left-right inset
  const titleSize = TYPE.title * scale;
  const axisSize = TYPE.axis * scale;
  const sourceSize = TYPE.source * scale;
  const topPad = 18 * scale;
  if (responsive) {
    return (
      <div style={{ width, background: COLORS.bg, fontFamily: FONT }}>
        {/* Header: the standalone chart shows title + unit; an EMBEDDED chart shows
            only the unit (the host scaffold owns the title). */}
        {(!embedded || subtitle) && (
          <div style={{ padding: `4px ${PAD}px 0` }}>
            {!embedded && (
              <div
                style={{
                  fontSize: titleSize,
                  fontWeight: 700,
                  color: COLORS.ink,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: axisSize,
                  color: COLORS.muted,
                  marginTop: embedded ? 0 : 4,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        )}
        <div style={{ position: "relative", width, height }}>
          {children}
          {tooltip}
        </div>
        {/* Source footer — suppressed when embedded (the host shows the source). */}
        {!embedded && (
          <div
            style={{
              fontSize: sourceSize,
              color: COLORS.muted,
              padding: `4px ${PAD}px 8px`,
            }}
          >
            Source:{" "}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: COLORS.muted }}
              >
                {source.name}
              </a>
            ) : (
              source.name
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        background: COLORS.bg,
        fontFamily: FONT,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* title + subtitle in ONE flow block so a multi-line title never overlaps
          the subtitle (the plot sits below via padding.top / centred band).
          padding.top in the SVG children is pre-computed by resolveFrameWithHeader
          to be ≥ this block's height — no ResizeObserver or second render needed. */}
      <div style={{ position: "absolute", top: topPad, left: PAD, right: PAD }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: COLORS.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{ fontSize: axisSize, color: COLORS.muted, marginTop: 4 }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {children}
      {tooltip}
      <div
        style={{
          position: "absolute",
          bottom: 12 * scale,
          left: PAD,
          fontSize: sourceSize,
          color: COLORS.muted,
        }}
      >
        Source: {source.name}
      </div>
    </div>
  );
}

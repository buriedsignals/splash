// core/ChartFrame — the shared layout shell for every chart type: the insight
// title, an optional subtitle, the SVG slot, an optional tooltip, and the cited
// source. Two modes:
//   - responsive=false (video + static): fixed absolute layout.
//   - responsive=true (interactive): flow layout (title above the plot) with a
//     LINKED source (an embed can be clicked; a PNG can't).
// Line / bar / scatter all wrap their <svg> in this — the ~60-line shell each
// used to duplicate now lives here once (the L1 cartesian extraction).
import type { ReactNode } from "react";
import { COLORS, FONT, TYPE } from "./tokens";

const PAD = 24; // header / source left-right inset

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
}: ChartFrameProps) {
  if (responsive) {
    return (
      <div style={{ width, background: COLORS.bg, fontFamily: FONT }}>
        <div style={{ padding: `4px ${PAD}px 0` }}>
          <div
            style={{
              fontSize: TYPE.title,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{ fontSize: TYPE.axis, color: COLORS.muted, marginTop: 4 }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ position: "relative", width, height }}>
          {children}
          {tooltip}
        </div>
        <div
          style={{
            fontSize: TYPE.source,
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
      <div
        style={{
          position: "absolute",
          top: 18,
          left: PAD,
          right: PAD,
          fontSize: TYPE.title,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            position: "absolute",
            top: 18 + TYPE.title * 1.4,
            left: PAD,
            fontSize: TYPE.axis,
            color: COLORS.muted,
          }}
        >
          {subtitle}
        </div>
      )}
      {children}
      {tooltip}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: PAD,
          fontSize: TYPE.source,
          color: COLORS.muted,
        }}
      >
        Source: {source.name}
      </div>
    </div>
  );
}

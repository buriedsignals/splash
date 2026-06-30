// core/MapFrame — the shared furniture shell for every map type + format. Mirrors
// chart-native's core/ChartFrame.tsx. Overlays the insight title (top band) and the
// cited source (bottom band, ALWAYS rendered — incl. video) over the full-bleed map.
// The data is kept out of these bands by the consumer passing resolveMapFrame().pad to
// fitBounds. Web mode (responsive) puts a frosted pill behind the text; video mode uses
// a text-shadow.
import type { ReactNode } from "react";
import { FRAME_COLORS, FRAME_FONT } from "../theme/map-tokens";
import type { ResolvedMapFrame } from "./map-format";

export interface MapFrameProps {
  title: string;
  description?: string;
  source: { name: string; url?: string };
  width: number;
  height: number;
  responsive: boolean;
  frame: ResolvedMapFrame;
  children: ReactNode; // the map container <div>
}

export function MapFrame({
  title,
  description,
  source,
  width,
  height,
  responsive,
  frame,
  children,
}: MapFrameProps) {
  const m = Math.round(12 * frame.scale);
  const pillStyle = responsive
    ? {
        background: FRAME_COLORS.pill,
        borderRadius: 6,
        padding: `${Math.round(6 * frame.scale)}px ${Math.round(10 * frame.scale)}px`,
      }
    : { textShadow: "0 1px 6px rgba(255,255,255,0.9)" };

  return (
    <div
      style={{ position: "relative", width, height, fontFamily: FRAME_FONT }}
    >
      {children}
      {/* Title band (top-left) */}
      <div
        data-testid="map-title"
        style={{
          position: "absolute",
          top: m,
          left: m,
          zIndex: 10,
          maxWidth: width - 2 * m,
          pointerEvents: "none",
          ...pillStyle,
        }}
      >
        <div
          style={{
            fontSize: frame.type.title,
            fontWeight: 700,
            color: FRAME_COLORS.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: frame.type.description,
              color: FRAME_COLORS.muted,
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
      {/* Source band (bottom-left) — ALWAYS rendered, incl. video */}
      <div
        data-testid="map-source"
        style={{
          position: "absolute",
          bottom: m,
          left: m,
          zIndex: 10,
          fontSize: frame.type.source,
          color: FRAME_COLORS.muted,
          ...(responsive
            ? {}
            : { textShadow: "0 1px 4px rgba(255,255,255,0.9)" }),
        }}
      >
        Source:{" "}
        {responsive && source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: FRAME_COLORS.muted }}
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

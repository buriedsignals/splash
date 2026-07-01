// core/MapFrame — the shared furniture shell for every map type + format. Mirrors
// chart-native's core/ChartFrame.tsx. Overlays the insight title (top band) and the
// cited source (bottom band, ALWAYS rendered — incl. video) over the full-bleed map.
// The data is kept out of these bands by the consumer passing resolveMapFrame().pad to
// fitBounds. Web mode (responsive) puts a frosted pill behind the text; video mode uses
// a text-shadow.
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  FRAME_FONT,
} from "../theme/map-tokens";
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
  onTitleHeight?: (px: number) => void;
  furnitureOpacity?: number;
  /** Follow the basemap theme: dark pill + light ink when true. Defaults false (light). */
  dark?: boolean;
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
  onTitleHeight,
  furnitureOpacity = 1,
  dark = false,
}: MapFrameProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [, setMeasuredHeight] = useState(0);

  // `onTitleHeight` MUST be a stable callback (callers wrap it in useCallback) — otherwise
  // the ResizeObserver would disconnect and reconnect on every render.
  useLayoutEffect(() => {
    const node = titleRef.current;
    if (!node) return;

    const notify = (px: number) => {
      setMeasuredHeight((prev) => {
        if (px === prev) return prev;
        onTitleHeight?.(px);
        return px;
      });
    };

    // Measure immediately on layout.
    notify(node.offsetHeight);

    const ro = new ResizeObserver(() => {
      notify(node.offsetHeight);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [onTitleHeight]);

  const colors = dark ? FRAME_COLORS_DARK : FRAME_COLORS;
  const m = Math.round(16 * frame.scale); // furniture gutter: 16px at 1× scale
  const pillStyle = responsive
    ? {
        background: colors.pill,
        borderRadius: 6,
        padding: `${Math.round(6 * frame.scale)}px ${Math.round(10 * frame.scale)}px`,
      }
    : {
        textShadow: dark
          ? "0 1px 6px rgba(0,0,0,0.9)"
          : "0 1px 6px rgba(255,255,255,0.9)",
      };

  return (
    <div
      style={{ position: "relative", width, height, fontFamily: FRAME_FONT }}
    >
      {children}
      {/* Title band (top-left) */}
      <div
        ref={titleRef}
        data-testid="map-title"
        style={{
          position: "absolute",
          top: m,
          left: m,
          zIndex: 10,
          maxWidth: width - 2 * m,
          boxSizing: "border-box",
          pointerEvents: "none",
          opacity: furnitureOpacity,
          ...pillStyle,
        }}
      >
        <div
          style={{
            fontSize: frame.type.title,
            fontWeight: 700,
            color: colors.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: frame.type.description,
              color: colors.muted,
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
          opacity: furnitureOpacity,
          fontSize: frame.type.source,
          color: colors.muted,
          ...(responsive
            ? {}
            : {
                textShadow: dark
                  ? "0 1px 4px rgba(0,0,0,0.9)"
                  : "0 1px 4px rgba(255,255,255,0.9)",
              }),
        }}
      >
        Source:{" "}
        {responsive && source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.muted }}
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

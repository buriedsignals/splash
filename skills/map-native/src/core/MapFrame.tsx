// core/MapFrame — the shared furniture shell for every map type + format. Mirrors
// chart-native's core/ChartFrame.tsx. Overlays the insight title (top band) and the
// cited source (bottom band, ALWAYS rendered — incl. video) over the full-bleed map.
// The data is kept out of these bands by the consumer passing resolveMapFrame().pad to
// fitBounds. Web mode (responsive) puts a frosted pill behind the text; video mode uses
// a text-shadow.
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  DARK_FRAME_BG,
  FRAME_FONT,
  frameBgIsDark,
  resolveFrameColors,
} from "../theme/map-tokens";
import type { ResolvedMapFrame } from "./map-format";
import { sourceLabel, type Lang } from "./locale";

export interface MapFrameProps {
  title: string;
  description?: string;
  source: { name: string; url?: string };
  /** The geography file's own credit — spec D7. Rendered beside `source`, never merged into it:
   *  a data attribution and a boundary-file attribution are two different facts, and a
   *  newsroom correcting one must not silently touch the other. Absent for a shipped basemap
   *  (world/us-states) — those carry no attribution obligation (Natural Earth is public
   *  domain, "crediting is unnecessary"). */
  geoCredit?: { name: string; url?: string };
  width: number;
  height: number;
  responsive: boolean;
  frame: ResolvedMapFrame;
  children: ReactNode; // the map container <div>
  onTitleHeight?: (px: number) => void;
  furnitureOpacity?: number;
  /** Follow the basemap theme: dark pill + light ink when true. Defaults false (light). */
  dark?: boolean;
  /** Newsroom house ground (arbitrary #rrggbb) — themes the furniture pill/ink/muted off that
   * ground. Falls back to the `dark` binary (dark preset ground / light default) when unset, so
   * a map that only sets a dark `mapStyle` (no house theme) keeps its existing dark furniture. */
  themeBg?: string;
  /** Newsroom house hue (#rrggbb) — tints the derived `muted` furniture toward this hue while
   * preserving its lightness (hence its WCAG contrast). Defaults undefined (dead-neutral grey). */
  houseHue?: string;
  /** Optional node rendered directly below the title/description block, inside the title band. */
  belowTitle?: ReactNode;
  /** deliverable language — localizes the "Source" furniture label. Default English. */
  lang?: Lang;
  /**
   * This frame is the WHOLE deliverable, not one step inside a host page — so its title is
   * the page's headline and gets marked `[data-splash-title]`, the first rung of the Verify
   * layer's title ladder (lib/verify/capture.ts). Only the seven `src/*Map.tsx` top-level
   * maps pass it. Defaults FALSE because MapFrame is also the furniture of every
   * Reveal/Story/Scrolly step: in a map-scrolly page the verifier's `querySelector` would
   * return the first step's caption and record it as the headline. Unmarked, the ladder
   * degrades to the SVG accessible name exactly as it does today.
   */
  standalone?: boolean;
}

export function MapFrame({
  title,
  description,
  source,
  geoCredit,
  width,
  height,
  responsive,
  frame,
  children,
  onTitleHeight,
  furnitureOpacity = 1,
  dark = false,
  themeBg,
  houseHue,
  belowTitle,
  lang,
  standalone = false,
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

  // Effective furniture ground: the newsroom house `themeBg` when set, else the `dark` binary
  // (dark preset ground / light default). resolveFrameColors keeps light byte-identical.
  const furnitureBg = themeBg ?? (dark ? DARK_FRAME_BG : undefined);
  const colors = resolveFrameColors(furnitureBg, houseHue);
  // Video/no-pill mode uses a text-shadow; key its halo on whether the furniture ink is light
  // (dark ground → dark halo under light text) or dark (light ground → light halo).
  const furnitureDark = frameBgIsDark(furnitureBg);
  const m = Math.round(16 * frame.scale); // furniture gutter: 16px at 1× scale
  const pillStyle = responsive
    ? {
        background: colors.pill,
        borderRadius: 6,
        padding: `${Math.round(6 * frame.scale)}px ${Math.round(10 * frame.scale)}px`,
      }
    : {
        textShadow: furnitureDark
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
          data-splash-title={standalone ? "" : undefined}
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
              // The map chrome is not a paragraph slot: cap the description at 2 lines so the
              // banner can never grow tall enough to swallow the map data beneath it (a 6-line
              // description on mobile buried the epicentre cluster). The full text lives in the
              // article body. resolveMapFrame reserves at most a 2-line description to match.
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        )}
        {belowTitle && <div style={{ marginTop: 6 }}>{belowTitle}</div>}
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
          // The source band gets the SAME ground the title band has. Without it the muted text
          // sat bare on the basemap while the config-time guard measured it against an assumed
          // one — the two never agreed, and neither was wrong on its own terms.
          ...pillStyle,
        }}
      >
        {sourceLabel(lang)}{" "}
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
      {geoCredit && (
        <div
          data-testid="map-geo-credit"
          style={{
            position: "absolute",
            bottom: m,
            right: m,
            zIndex: 10,
            opacity: furnitureOpacity,
            fontSize: frame.type.source,
            color: colors.muted,
            ...pillStyle,
          }}
        >
          {responsive && geoCredit.url ? (
            <a
              href={geoCredit.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.muted }}
            >
              {geoCredit.name}
            </a>
          ) : (
            geoCredit.name
          )}
        </div>
      )}
    </div>
  );
}

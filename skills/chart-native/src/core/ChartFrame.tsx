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
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { themeColors, FONT, TYPE } from "./tokens";
import { sourceLabel, type Lang } from "./locale";
import { clampOffset } from "./tooltip-clamp";

// WCAG 1.1.1 — the fuller accessible DESCRIPTION of the chart (the insight; the
// accessible NAME is already the title via each <svg role="img" aria-label>).
// A context rather than a prop so it is provided ONCE at the shared mount/entry
// level from config.altInsight (mount.tsx) and every chart type inherits the
// visually-hidden description with zero per-component wiring. Default undefined →
// no emit (sample/legacy renders without an altInsight are byte-identical).
export const AltInsightContext = createContext<string | undefined>(undefined);

// The standard visually-hidden pattern (CSS clip) — NOT display:none, which would
// remove the node from the accessibility tree; this stays screen-reader-reachable.
const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// Keep any interactive tooltip inside the plot box. Each *Chart.tsx positions its
// `.tooltip` div to the right of / above the hovered mark with `whiteSpace: nowrap`
// and no bounds check, so a mark near an edge pushes the tooltip off-screen and its
// text clips. This shared wrapper (rendered by ChartFrame for EVERY chart type)
// measures the rendered tooltip after layout and flips/clamps it back in-bounds via a
// corrective transform. Measuring `tip - wrap` cancels the wrapper's own transform, so
// the correction is shift-independent and the effect converges in one extra pass.
function ClampedTooltip({
  children,
  width,
  height,
}: {
  children: ReactNode;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState({ dx: 0, dy: 0 });
  useLayoutEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const tip = wrap.querySelector<HTMLElement>(".tooltip");
    if (!tip) {
      if (shift.dx !== 0 || shift.dy !== 0) setShift({ dx: 0, dy: 0 });
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const rel = {
      left: tipRect.left - wrapRect.left,
      top: tipRect.top - wrapRect.top,
      width: tipRect.width,
      height: tipRect.height,
    };
    const { dx, dy } = clampOffset(rel, { width, height });
    if (dx !== shift.dx || dy !== shift.dy) setShift({ dx, dy });
  });
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        transform: `translate(${shift.dx}px, ${shift.dy}px)`,
      }}
    >
      {children}
    </div>
  );
}

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
  /** deliverable language — localizes the "Source" furniture label. Default English. */
  lang?: Lang;
  /** newsroom house theme BACKGROUND (F2 house `theme`): the resolved ground hex the chrome
   *  (bg/ink/muted/axis/grid) is DERIVED from. The plot's own marks are themed by each component.
   *  Undefined = the light default (byte-identical legacy path). */
  themeBg?: string;
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
  lang,
  themeBg,
}: ChartFrameProps) {
  const C = themeColors(themeBg);
  const srcLabel = sourceLabel(lang);
  // WCAG 1.1.1 — emit the altInsight (when provided) as a visually-hidden
  // description ONCE, in whichever layout branch renders. Sibling of the <svg>
  // (role="img" subtrees can be opaque to assistive tech), inside the frame div.
  const altInsight = useContext(AltInsightContext);
  const altDescription = altInsight?.trim() ? (
    <p style={VISUALLY_HIDDEN}>{altInsight}</p>
  ) : null;
  const PAD = 24 * scale; // header / source left-right inset
  const titleSize = TYPE.title * scale;
  const axisSize = TYPE.axis * scale;
  const sourceSize = TYPE.source * scale;
  const topPad = 18 * scale;
  if (responsive) {
    return (
      <div style={{ width, background: C.bg, fontFamily: FONT }}>
        {altDescription}
        {/* Header: the standalone chart shows title + unit; an EMBEDDED chart shows
            only the unit (the host scaffold owns the title). */}
        {(!embedded || subtitle) && (
          <div style={{ padding: `4px ${PAD}px 0` }}>
            {!embedded && (
              <div
                style={{
                  fontSize: titleSize,
                  fontWeight: 700,
                  color: C.ink,
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
                  color: C.muted,
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
          {tooltip && (
            <ClampedTooltip width={width} height={height}>
              {tooltip}
            </ClampedTooltip>
          )}
        </div>
        {/* Source footer — suppressed when embedded (the host shows the source). */}
        {!embedded && (
          <div
            style={{
              fontSize: sourceSize,
              color: C.muted,
              padding: `4px ${PAD}px 8px`,
            }}
          >
            {srcLabel}{" "}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.muted }}
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
        background: C.bg,
        fontFamily: FONT,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {altDescription}
      {/* title + subtitle in ONE flow block so a multi-line title never overlaps
          the subtitle (the plot sits below via padding.top / centred band).
          padding.top in the SVG children is pre-computed by resolveFrameWithHeader
          to be ≥ this block's height — no ResizeObserver or second render needed. */}
      <div style={{ position: "absolute", top: topPad, left: PAD, right: PAD }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: C.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: axisSize, color: C.muted, marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
      {tooltip && (
        <ClampedTooltip width={width} height={height}>
          {tooltip}
        </ClampedTooltip>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 12 * scale,
          left: PAD,
          fontSize: sourceSize,
          color: C.muted,
        }}
      >
        {srcLabel} {source.name}
      </div>
    </div>
  );
}

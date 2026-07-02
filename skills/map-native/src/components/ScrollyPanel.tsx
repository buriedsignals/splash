import React from "react";

// Panel geometry — pure so it is unit-testable. Narrow canvases (≤1080 wide: square/portrait)
// get a bottom card; wide canvases get a side column whose side is the step's `align`. `slide`
// runs 0 (below, entering) → 1 (pinned) → 2 (above, exited); opacity fades in over [0,0.35] and
// out over [1.65,2]; y travels upward as slide grows.
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function scrollyPanelLayout(input: {
  width: number;
  height: number;
  align?: "left" | "right" | "center";
  slide: number;
}): {
  side: "left" | "right" | "center" | "bottom";
  x: number;
  y: number;
  width: number;
  opacity: number;
} {
  const { width, height, slide } = input;
  const narrow = width <= 1080;
  const align = input.align ?? "center";
  const inset = Math.round(width * 0.04);

  // Opacity: in over [0,0.35], out over [1.65,2].
  const opacity =
    slide <= 1 ? clamp01(slide / 0.35) : clamp01((2 - slide) / 0.35);

  // Reading-zone anchor (pinned position) and travel distance for the slide.
  const travel = Math.round(height * 0.12);

  if (narrow) {
    const panelWidth = Math.round(width * 0.84);
    const pinnedY = Math.round(height * 0.7);
    const y = Math.round(pinnedY + (1 - slide) * travel);
    return {
      side: "bottom",
      x: Math.round((width - panelWidth) / 2),
      y,
      width: panelWidth,
      opacity,
    };
  }

  const panelWidth =
    align === "center" ? Math.round(width * 0.5) : Math.round(width * 0.33);
  let x: number;
  let side: "left" | "right" | "center";
  if (align === "left") {
    x = inset;
    side = "left";
  } else if (align === "right") {
    x = width - panelWidth - inset;
    side = "right";
  } else {
    x = Math.round((width - panelWidth) / 2);
    side = "center";
  }
  const pinnedY = Math.round(height * (align === "center" ? 0.62 : 0.4));
  const y = Math.round(pinnedY + (1 - slide) * travel);
  return { side, x, y, width: panelWidth, opacity };
}

export const ScrollyPanel: React.FC<{
  width: number;
  height: number;
  align?: "left" | "right" | "center";
  slide: number;
  prose: string;
  dark?: boolean;
}> = ({ width, height, align, slide, prose, dark }) => {
  const p = scrollyPanelLayout({ width, height, align, slide });
  if (p.opacity <= 0) return null;
  const bg = dark ? "rgba(18,18,20,0.82)" : "rgba(255,255,255,0.92)";
  const ink = dark ? "#f4f4f5" : "#1a1a1a";
  const narrow = width <= 1080;
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.width,
        background: bg,
        backdropFilter: "blur(6px)",
        borderRadius: 12,
        padding: narrow ? "20px 28px" : "22px 30px",
        opacity: p.opacity,
        pointerEvents: "none",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: ink,
          fontSize: narrow ? 30 : 26,
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: "0.01em",
        }}
      >
        {prose}
      </p>
    </div>
  );
};

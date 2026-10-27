/**
 * The Position family's scrolly visual (dumbbell, slope, dot strip, beeswarm, box plot as variants): ONE fixed SVG
 * holding every primitive any card's scene draws, each written once with its colour and words, its numbers painted by
 * the drive (`gesture-position-scrolly.mjs` `applyPositionState`) from the state the reader's scroll interpolates.
 * Without JavaScript the SVG stands as the closing card's picture at the middle stage shape: the whole field, what was
 * shown still marked. The header carries the unit and the note of the card being read.
 */

import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export function GesturePositionScrolly({
  prims,
  shapes,
  still,
  notes,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  prims: any[];
  shapes: { w: number; h: number }[];
  still: Record<string, number>;
  notes: string[];
  unit: string;
  alt: string;
  regs: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const colours: Record<string, string> = {
    ground,
    accent,
    ink,
    muted,
    neutral:
      adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
      mix(ground, ink, 0.5),
    early: ground,
    copy:
      adjustToContrast(mix(ground, ink, 0.7), ground, NON_TEXT_CONTRAST_MIN) ??
      ink,
    rule: mix(ground, ink, 0.55),
    grid: mix(ground, ink, 0.12),
  };
  const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOf = (role: string) =>
    role === "accent" ? accentInk : role === "muted" ? mutedInk : ink;
  const L = 1;
  const at = (p: any, a: string) => still[`L${L}_${p.i}_${a}`] ?? 0;
  const regOf = (reg: string) =>
    reg === "value" ? regs.value : reg === "annot" ? regs.annot : regs.axis;
  const shape = shapes[L];
  return (
    <div
      role="img"
      aria-label={alt}
      data-gpos={JSON.stringify({
        shapes,
        prims: prims.map((p) => ({ i: p.i, attrs: p.attrs })),
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
        padding: "12px var(--prose-gutter, clamp(16px, 6vw, 56px))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {notes.map((n, k) => (
            <span
              key={k}
              data-note={k}
              style={{
                ...regs.value,
                gridArea: "1 / 1",
                color: accentInk,
                opacity: k === notes.length - 1 ? 1 : 0,
              }}
            >
              {n}
            </span>
          ))}
        </span>
      </div>
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${shape.w} ${shape.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          aria-hidden="true"
        >
          {[...prims]
            .sort(
              (a, b) =>
                (a.role === "grid"
                  ? 0
                  : a.kind === "text"
                    ? 3
                    : a.stroke
                      ? 2
                      : 1) -
                (b.role === "grid"
                  ? 0
                  : b.kind === "text"
                    ? 3
                    : b.stroke
                      ? 2
                      : 1),
            )
            .map((p) => {
              const common = { "data-p": p.i, opacity: at(p, "o") } as any;
              const fill = colours[p.role] ?? ink;
              if (p.kind === "line")
                return (
                  <line
                    key={p.i}
                    {...common}
                    x1={at(p, "x1")}
                    y1={at(p, "y1")}
                    x2={at(p, "x2")}
                    y2={at(p, "y2")}
                    stroke={fill}
                    strokeWidth={p.w ?? 1}
                    strokeDasharray={p.dash ? "5 4" : undefined}
                    strokeLinecap="round"
                  />
                );
              if (p.kind === "circle") {
                if (p.stroke)
                  return (
                    <circle
                      key={p.i}
                      {...common}
                      cx={at(p, "cx")}
                      cy={at(p, "cy")}
                      r={at(p, "r")}
                      fill="none"
                      stroke={ink}
                      strokeWidth={1.2}
                    />
                  );
                if (p.role === "early" || p.hollow)
                  return (
                    <circle
                      key={p.i}
                      {...common}
                      cx={at(p, "cx")}
                      cy={at(p, "cy")}
                      r={at(p, "r")}
                      fill={ground}
                      stroke={colours[p.ring ?? p.role] ?? colours.neutral}
                      strokeWidth={1.6}
                    />
                  );
                return (
                  <circle
                    key={p.i}
                    {...common}
                    cx={at(p, "cx")}
                    cy={at(p, "cy")}
                    r={at(p, "r")}
                    fill={fill}
                  />
                );
              }
              if (p.kind === "rect") {
                if (p.stroke)
                  return (
                    <rect
                      key={p.i}
                      {...common}
                      x={at(p, "x")}
                      y={at(p, "y")}
                      width={Math.max(0, at(p, "width"))}
                      height={Math.max(0, at(p, "height"))}
                      fill="none"
                      stroke={ink}
                      strokeWidth={1.2}
                      rx={3}
                    />
                  );
                return (
                  <rect
                    key={p.i}
                    {...common}
                    x={at(p, "x")}
                    y={at(p, "y")}
                    width={Math.max(0, at(p, "width"))}
                    height={Math.max(0, at(p, "height"))}
                    fill={fill}
                  />
                );
              }
              if (p.kind === "text") {
                const r = regOf(p.reg);
                return (
                  <text
                    key={p.i}
                    {...common}
                    x={at(p, "x")}
                    y={at(p, "y")}
                    dominantBaseline="central"
                    textAnchor={p.anchor ?? "start"}
                    fontFamily={r.fontFamily}
                    fontSize={parseFloat(r.fontSize)}
                    fontWeight={p.bold ? 700 : r.fontWeight}
                    fontStyle={r.fontStyle}
                    fill={inkOf(p.role)}
                  >
                    {p.text}
                  </text>
                );
              }
              return null;
            })}
        </svg>
      </div>
    </div>
  );
}

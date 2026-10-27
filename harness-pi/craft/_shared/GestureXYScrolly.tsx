/**
 * An XY scrolly (scatter, bubbles, connected scatter) whose staging is the beat's own `gestures`: the points on two
 * fitted axes, and every gesture's marks — the subject's accent, rings, the points stepping back, a zoomed window,
 * a reference rule, a compare's legs, a path tracing itself — laid out in the reader's pixels on each paint by the
 * drive (`applyXYState`, gesture-xy-scrolly.mjs). What is rendered here as markup is every element the drive moves,
 * plus the closing card's picture for a reader without a script (a still SVG: the same points on the same axes, the
 * subject in the accent, every rule drawn).
 */

import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;

export function GestureXYScrolly({
  data,
  still,
  notes,
  yName,
  xName,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  data: any;
  still: {
    points: any[];
    paths: string[][];
    rules: any[];
    xTicks: any[];
    yTicks: any[];
  };
  notes: string[];
  yName: string;
  xName: string;
  alt: string;
  regs: Record<string, Style>;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const neutral = mix(ground, ink, 0.45);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = {
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
  } as const;
  const payload = {
    ...data,
    colours: { ground, neutral, accent, accentInk, ink: inkOnGround },
  };
  const noScript =
    `[data-gxy] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-gxy] [data-part="still"] { display: block !important; }`;
  const SW = 800;
  const SH = 450;

  return (
    <div
      role="img"
      aria-label={alt}
      data-gxy={JSON.stringify(payload)}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
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
          {yName}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {notes.map((t, k) => (
            <span
              key={k}
              data-note={k}
              style={{
                ...regs.annot,
                gridArea: "1 / 1",
                justifySelf: "end",
                textAlign: "right",
                color: accentInk,
                opacity: 0,
              }}
            >
              {t}
            </span>
          ))}
        </span>
      </div>
      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <svg
          data-part="still"
          viewBox={`0 0 ${SW} ${SH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {still.yTicks.map((t: any) => (
            <g key={`y${t.v}`}>
              <line
                x1={60}
                x2={SW - 6}
                y1={t.y * (SH - 34) + 8}
                y2={t.y * (SH - 34) + 8}
                stroke={mix(ground, ink, 0.12)}
              />
              <text
                x={52}
                y={t.y * (SH - 34) + 12}
                textAnchor="end"
                fill={mutedInk}
                style={{ ...regs.axis } as any}
              >
                {t.text}
              </text>
            </g>
          ))}
          {still.xTicks.map((t: any) => (
            <text
              key={`x${t.v}`}
              x={60 + t.x * (SW - 66)}
              y={SH - 8}
              textAnchor="middle"
              fill={mutedInk}
              style={{ ...regs.axis } as any}
            >
              {t.text}
            </text>
          ))}
          {still.rules.map((r: any, i: number) =>
            r.axis === "x" ? (
              <line
                key={`r${i}`}
                x1={60 + r.u * (SW - 66)}
                x2={60 + r.u * (SW - 66)}
                y1={8}
                y2={SH - 26}
                stroke={accentInk}
                strokeDasharray="5 4"
              />
            ) : (
              <line
                key={`r${i}`}
                x1={60}
                x2={SW - 6}
                y1={8 + (1 - r.v) * (SH - 34)}
                y2={8 + (1 - r.v) * (SH - 34)}
                stroke={accentInk}
                strokeDasharray="5 4"
              />
            ),
          )}
          {still.paths.map((pts, j) => (
            <polyline
              key={`sp${j}`}
              points={pts.join(" ")}
              fill="none"
              stroke={neutral}
              strokeDasharray="3 3"
            />
          ))}
          {still.points.map((p: any, i: number) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={p.hollow ? ground : p.accent ? accent : neutral}
              stroke={p.accent ? accent : neutral}
              fillOpacity={p.accent ? 1 : 0.6}
            />
          ))}
        </svg>

        <svg
          data-part="field"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {data.tickSets.flatMap((s: any, si: number) => [
            ...s.x.map((t: any) => (
              <line
                key={`gx${si}-${t.v}`}
                data-gridline={`x|${si}|${t.v}`}
                stroke={mix(ground, ink, 0.12)}
                strokeWidth={1}
                opacity={0}
              />
            )),
            ...s.y.map((t: any) => (
              <line
                key={`gy${si}-${t.v}`}
                data-gridline={`y|${si}|${t.v}`}
                stroke={mix(ground, ink, 0.12)}
                strokeWidth={1}
                opacity={0}
              />
            )),
          ])}
          {data.rules.map((r: any, i: number) => (
            <line
              key={`r${i}`}
              data-rule={i}
              stroke={data.ruleAccent ? accentInk : inkOnGround}
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
          ))}
          {data.paths.map((_: any, j: number) => (
            <polyline
              key={`p${j}`}
              data-path={j}
              fill="none"
              stroke={neutral}
              strokeDasharray="3 3"
            />
          ))}
          {data.paths.map((_: any, j: number) => (
            <polyline
              key={`t${j}`}
              data-trace={j}
              fill="none"
              stroke={inkOnGround}
              strokeWidth={2.4}
              opacity={0}
            />
          ))}
          {data.compares.map((_: any, i: number) => [
            <line
              key={`lx${i}`}
              data-leg={`${i}-x`}
              stroke={inkOnGround}
              strokeWidth={1.4}
              strokeDasharray="2 3"
              opacity={0}
            />,
            <line
              key={`ly${i}`}
              data-leg={`${i}-y`}
              stroke={inkOnGround}
              strokeWidth={1.4}
              strokeDasharray="2 3"
              opacity={0}
            />,
          ])}
          {data.drawOrder.map((i: number) => (
            <circle key={`pt${i}`} data-pt={i} fill={neutral} />
          ))}
          {data.marks.map((_: any, i: number) => (
            <circle
              key={`ring${i}`}
              data-ptring={i}
              fill="none"
              stroke={inkOnGround}
              strokeWidth={1.4}
              opacity={0}
            />
          ))}
        </svg>
        {data.tickSets.flatMap((s: any, si: number) => [
          ...s.x.map((t: any) => (
            <span
              key={`xt${si}-${t.v}`}
              data-xt={`${si}|${t.v}`}
              style={{ ...abs, ...regs.axis, color: mutedInk, opacity: 0 }}
            >
              {t.text}
            </span>
          )),
          ...s.y.map((t: any) => (
            <span
              key={`yt${si}-${t.v}`}
              data-yt={`${si}|${t.v}`}
              style={{ ...abs, ...regs.axis, color: mutedInk, opacity: 0 }}
            >
              {t.text}
            </span>
          )),
        ])}
        {data.rules.map((r: any, i: number) => (
          <span
            key={`rt${i}`}
            data-ruletag={i}
            style={{
              ...abs,
              ...regs.annot,
              color: data.ruleAccent ? accentInk : inkOnGround,
              textShadow: halo,
              opacity: 0,
            }}
          >
            {r.text}
          </span>
        ))}
        {data.tags.map((t: any, i: number) => (
          <span
            key={`tag${i}`}
            data-tag={i}
            style={{
              ...abs,
              ...regs.annot,
              color: inkOnGround,
              textShadow: halo,
              opacity: 0,
            }}
          >
            {t.text}
          </span>
        ))}
      </div>
      <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
        {xName}
      </span>
    </div>
  );
}

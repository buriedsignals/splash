/**
 * One frame of a Position GESTURE video (dumbbell, slope, dot strip, beeswarm, box plot as variants): the title card,
 * the field on its one fitted axis, whatever the beat's three gestures have laid by this frame — the accent, rings, a
 * step-back, a zoomed axis, a new order, a compare's copy, a reference rule, the current gesture's note — then the
 * credit. NOTHING HERE IS MEASURED OR CHOSEN: every primitive, word and width comes from the runner's scenes (laid
 * out in Bun); motion from `primsAt` (./gesture-position-video.mjs). Browser-safe.
 */

import type { Ref } from "react";
import { chromeAt, primsAt } from "./gesture-position-video.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };

export type GesturePositionFrameProps = {
  frame: { width: number; height: number };
  registers: Record<"display" | "eyebrow" | "value" | "axis" | "annot" | "source", Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: Record<string, string>;
  scenes: Record<string, { prims: any[] }>;
  timing: any;
  [key: string]: unknown;
};

function Text({ line, register, fill, opacity = 1, anchor, bold, central }: { line: Line; register: Register; fill: string; opacity?: number; anchor?: string; bold?: boolean; central?: boolean }) {
  return (
    <text
      x={line.x}
      y={line.y}
      fontFamily={register.fontFamily}
      fontSize={register.fontSize}
      fontWeight={bold ? 700 : register.fontWeight}
      fontStyle={register.fontStyle}
      letterSpacing={register.letterSpacing}
      fill={fill}
      opacity={opacity}
      textAnchor={anchor as any}
      dominantBaseline={central ? "central" : undefined}
      data-width={line.width}
    >
      {line.text}
    </text>
  );
}

export function GesturePositionFrame(props: GesturePositionFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours: c, credit, titleCard } = props;
  const prims = primsAt(props as any, props.at).filter((p: any) => p.o > 0.001);
  const chrome = chromeAt(props as any, props.at);
  const layer = (p: any) => (p.role === "grid" ? 0 : p.kind === "text" ? 3 : p.stroke ? 2 : 1);
  const inkOf = (role: string) => (role === "accent" ? c.accentInk : role === "muted" ? c.mutedInk : c.ink);
  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={c.ground} />
      {[...prims].sort((a: any, b: any) => layer(a) - layer(b)).map((p: any) => {
        const fill = c[p.role] ?? c.ink;
        if (p.kind === "line") return <line key={p.id} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={fill} strokeWidth={(p.w ?? 1) * Math.min(1.5, props.stroke as number)} strokeDasharray={p.dash ? "8 6" : undefined} strokeLinecap="round" opacity={p.o} />;
        if (p.kind === "circle") {
          if (p.stroke) return <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill="none" stroke={c.ink} strokeWidth={1.6 * (props.stroke as number)} opacity={p.o} />;
          if (p.role === "early" || p.hollow) return <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill={c.ground} stroke={c[p.ring ?? p.role] ?? c.neutral} strokeWidth={2 * (props.stroke as number)} opacity={p.o} />;
          return <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} fill={fill} opacity={p.o} />;
        }
        if (p.kind === "rect") {
          if (p.stroke) return <rect key={p.id} x={p.x} y={p.y} width={Math.max(0, p.width)} height={Math.max(0, p.height)} fill="none" stroke={c.ink} strokeWidth={1.6 * (props.stroke as number)} rx={4} opacity={p.o} />;
          return <rect key={p.id} x={p.x} y={p.y} width={Math.max(0.5, p.width)} height={Math.max(0.5, p.height)} fill={fill} opacity={p.o} />;
        }
        if (p.kind === "text") return <Text key={p.id} line={{ text: p.text, x: p.x, y: p.y, width: p.width }} register={(p.bold ? (r as any)[`${p.reg}Bold`] : null) ?? r[p.reg as "axis"] ?? r.axis} fill={inkOf(p.role)} opacity={p.o} anchor={p.anchor} central />;
        return null;
      })}
      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={chrome.source}>
        {credit.lines.map((line, i) => (
          <Text key={`credit${i}`} line={line} register={r.source} fill={c.mutedInk} />
        ))}
      </g>
      <g opacity={chrome.title}>
        <rect width={frame.width} height={frame.height} fill={c.ground} />
        <Text line={titleCard.eyebrow} register={r.eyebrow} fill={c.accentInk} />
        {titleCard.title.map((line, i) => (
          <Text key={`title${i}`} line={line} register={titleCard.register} fill={c.ink} />
        ))}
      </g>
    </svg>
  );
}

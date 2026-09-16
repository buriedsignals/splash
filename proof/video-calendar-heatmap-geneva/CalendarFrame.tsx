/**
 * One frame of « 31 jours d'affilée au-dessus de 20 °C à Genève » — the title card, the empty calendar, the year filling
 * day by day as the warm days are counted, the colder days stepping back while the run is outlined and counted, the
 * colours back (BRIEF.md).
 *
 * NOTHING HERE IS MEASURED OR CHOSEN: positions, texts and colours come from `build.mjs`; motion from `sceneAt`.
 */

import type { Ref } from "react";
import { blend } from "../video-cartogram-europe-lowcarbon/scene.mjs";
import { sceneAt } from "./scene.mjs";

type Register = { fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; letterSpacing: number; lead: number };
type Line = { text: string; x: number; y: number; width: number };
type Word = { text: string; width: number };
type Slot = "display" | "eyebrow" | "value" | "axis" | "source";
type Cell = { x: number; y: number; w: number; h: number };

export type CalendarFrameProps = {
  frame: { width: number; height: number };
  registers: Record<Slot, Register>;
  titleCard: { register: Register; eyebrow: Line; title: Line[] };
  credit: { at: { x: number; y: number }; halo: number; lines: Line[] };
  colours: { ground: string; ramp: string[]; empty: string; hot: string; cool: string; stepped: string; outline: string; text: Record<"eyebrow" | "title" | "axis" | "count", string> };
  days: Array<Cell & { value: number; bin: number; cx: number; cy: number }>;
  dot: number;
  thresholdLine: { y: number; left: number; right: number; label: Line };
  missing: Cell[];
  months: Line[];
  ticks: Line[];
  counters: { x: number; warm: number; run: number; texts: { warm: Record<string, Word>; run: Record<string, Word> } };
  legend: { at: { x: number; y: number }; halo: number; swatches: Array<{ x: number; y: number; width: number; height: number }>; bornes: Line[] };
  runs: Array<{ month: number; from: number; to: number; before: number; x: number; y: number; cellW: number; h: number }>;
  threshold: number;
  streakLength: number;
  strokes: { outline: number };
  halo: { value: number; axis: number };
  states: Record<string, number>[];
  timing: unknown;
};

function Text({ line, register, fill, opacity = 1, halo }: { line: Line; register: Register; fill: string; opacity?: number; halo?: { colour: string; width: number } }) {
  return (
    <text x={line.x} y={line.y} fontFamily={register.fontFamily} fontSize={register.fontSize} fontWeight={register.fontWeight} fontStyle={register.fontStyle} letterSpacing={register.letterSpacing} fill={fill} opacity={opacity} stroke={halo?.colour} strokeWidth={halo?.width} strokeLinejoin={halo ? "round" : undefined} paintOrder={halo ? "stroke" : undefined} data-width={line.width}>
      {line.text}
    </text>
  );
}

export function CalendarFrame(props: CalendarFrameProps & { at: number; svgRef?: Ref<SVGSVGElement> }) {
  const { frame, registers: r, colours, credit, titleCard, counters, legend } = props;
  const scene = sceneAt(props as never, props.at);
  const valueHalo = { colour: colours.ground, width: props.halo.value };
  const axisHalo = { colour: colours.ground, width: props.halo.axis };
  const warm = counters.texts.warm[String(scene.warm)];
  const run = counters.texts.run[String(scene.run)];

  return (
    <svg ref={props.svgRef} xmlns="http://www.w3.org/2000/svg" width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
      <rect width={frame.width} height={frame.height} fill={colours.ground} />
      {/* THE CURVE'S FURNITURE: the 20 °C line and its label, gone as the calendar comes in. */}
      <g opacity={scene.curveFurniture}>
        <line x1={props.thresholdLine.left} x2={props.thresholdLine.right} y1={props.thresholdLine.y} y2={props.thresholdLine.y} stroke={colours.outline} strokeWidth={props.strokes.outline * 0.6} strokeDasharray={`${props.dot * 2} ${props.dot * 1.5}`} />
        <Text line={props.thresholdLine.label} register={r.axis} fill={colours.text.axis} halo={axisHalo} />
      </g>
      {scene.line.through > 0 && scene.line.opacity > 0 ? (
        <polyline points={props.days.slice(0, scene.line.through + 1).map((d) => `${d.cx},${d.cy}`).join(" ")} fill="none" stroke={colours.cool} strokeWidth={props.dot * 0.6} strokeLinejoin="round" opacity={scene.line.opacity} />
      ) : null}

      <g opacity={scene.grid}>
        {props.months.map((m, i) => (
          <Text key={`month${i}`} line={m} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.ticks.map((t, i) => (
          <Text key={`tick${i}`} line={t} register={r.axis} fill={colours.text.axis} />
        ))}
        {props.missing.map((c, i) => (
          <rect key={`missing${i}`} x={c.x} y={c.y} width={c.w} height={c.h} fill={colours.empty} />
        ))}
        <g transform={`translate(${legend.at.x} ${legend.at.y})`}>
          {legend.swatches.map((s, i) => (
            <rect key={`swatch${i}`} x={s.x} y={s.y} width={s.width} height={s.height} fill={colours.ramp[i]} />
          ))}
          {legend.bornes.map((b, i) => (
            <Text key={`borne${i}`} line={b} register={r.axis} fill={colours.text.axis} halo={axisHalo} />
          ))}
        </g>
      </g>
      {props.days.map((d, i) => {
        const s = scene.cells[i];
        if (!(s.shown > 0)) return null;
        const onCurve = d.value >= props.threshold ? colours.hot : colours.cool;
        const fill = blend(blend(onCurve, colours.ramp[d.bin], s.fall), colours.stepped, s.stepped);
        return <rect key={`day${i}`} x={s.x} y={s.y} width={s.w} height={s.h} rx={props.dot * (1 - s.fall)} fill={fill} opacity={s.shown} />;
      })}

      {/* Every halo first, then every stroke: a month's halo never covers the next month's line. */}
      {(["halo", "line"] as const).flatMap((layer) =>
        props.runs.map((run, i) => {
          const days = Math.max(0, Math.min(run.to - run.from + 1, scene.reach - run.before));
          if (!(days > 0)) return null;
          return (
            <rect key={`${layer}${i}`} x={run.x} y={run.y} width={days * run.cellW} height={run.h} fill="none" strokeLinejoin="round" stroke={layer === "halo" ? colours.ground : colours.outline} strokeWidth={props.strokes.outline * (layer === "halo" ? 3 : 1)} />
          );
        }),
      )}

      <Text line={{ ...warm, x: counters.x, y: counters.warm }} register={r.value} fill={colours.text.count} opacity={scene.counting} halo={valueHalo} />
      <Text line={{ ...run, x: counters.x, y: counters.run }} register={r.value} fill={colours.text.count} opacity={scene.running} halo={valueHalo} />

      <g transform={`translate(${credit.at.x} ${credit.at.y})`} opacity={scene.source}>
        {credit.lines.map((line, i) => (
          <Text key={`credit${i}`} line={line} register={r.source} fill={colours.text.axis} halo={{ colour: colours.ground, width: credit.halo }} />
        ))}
      </g>

      <g opacity={scene.title}>
        <rect width={frame.width} height={frame.height} fill={colours.ground} />
        <Text line={titleCard.eyebrow} register={r.eyebrow} fill={colours.text.eyebrow} />
        {titleCard.title.map((line, i) => (
          <Text key={`title${i}`} line={line} register={titleCard.register} fill={colours.text.title} />
        ))}
      </g>
    </svg>
  );
}

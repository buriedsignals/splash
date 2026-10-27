/**
 * THE POSITION FAMILY'S STILL PLATE (craft/gestures/GRAMMAR.md §4 F3). One component draws all five types — dumbbell,
 * slope, dot strip, beeswarm, box plot — as variants of one scene (`gesture-family-position.mjs` `sceneOf`): marks at
 * their value on ONE fitted axis, never anchored at zero, the subject in the accent, every other row in one neutral,
 * a ring (never a second hue) on a row a gesture names, and every gesture's words written directly beside what they
 * are about (`placeNotes`). The per-type kits' fixed staging — the subject's accent, the dumbbell's gain column, the
 * slope's thread pair, the swarm's two callouts — is replaced by the state the beat's own gestures compose
 * (`gesture-position-static.mjs`).
 *
 * What it keeps from the per-type components: the registers of the run's direction, furniture derived from the ground
 * (`deriveFurniture`), type set on the ground and held to the text floor, the header ladder (the longest title and
 * standfirst forms that fit), and the rule that a row the frame cannot hold is said, not silently dropped.
 *
 * `SharedPlot` (exported) draws a scene's primitives as SVG: the web, video and scrolly components draw the same
 * scene with it, so the four formats can only differ in what their schedulers put in the state.
 */

import {
  adjustToContrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { placeNotes, sceneOf, wrapWords } from "./gesture-family-position.mjs";

type Reg = any;
export type Prim = Record<string, any> & {
  id: string;
  kind: string;
  o: number;
  role: string;
};

/** Every colour a scene's roles are drawn in, each held to its floor against the ground. */
export function paletteOf(ground: string, accent: string) {
  const { ink, muted } = deriveFurniture(ground);
  const neutral =
    adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.5);
  return {
    ground,
    accent,
    ink,
    muted,
    neutral,
    early: ground,
    copy:
      adjustToContrast(mix(ground, ink, 0.7), ground, NON_TEXT_CONTRAST_MIN) ??
      ink,
    rule: mix(ground, ink, 0.55),
    grid: mix(ground, ink, 0.12),
    accentInk: adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? ink,
    mutedInk: adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? ink,
  };
}

/** The registers a scene's words are set in, and the measures sceneOf needs. */
export function textOf(
  direction: any,
  {
    format,
    delta,
    moments,
  }: {
    format: (v: number) => string;
    delta: (v: number) => string;
    moments: string[];
  },
) {
  const regs: Record<string, Reg> = {
    axis: registerOf(direction, "axis"),
    annot: registerOf(direction, "annot"),
    value: registerOf(direction, "value"),
  };
  const sizeOf = (r: Reg) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
    fontStyle: r.fontStyle,
  });
  const measure = (t: string, reg = "annot") => {
    const r = regs[reg];
    const s = applyCase(String(t), r.transform);
    return (
      measureText(s, sizeOf(r)) +
      Number(r.letterSpacing ?? 0) * Math.max(0, s.length - 1)
    );
  };
  const lead = (reg = "annot") => leadOf(regs[reg]);
  return { regs, measure, lead, format, delta, moments, sizeOf };
}

/** One primitive as SVG, its colour from its role. */
export function SharedPlot({
  prims,
  colours,
  text,
  bold = 700,
}: {
  prims: Prim[];
  colours: any;
  text: ReturnType<typeof textOf>;
  bold?: number;
}) {
  const fillOf = (role: string) => colours[role] ?? colours.ink;
  const inkOf = (role: string) =>
    role === "accent"
      ? colours.accentInk
      : role === "muted"
        ? colours.mutedInk
        : role === "ink"
          ? colours.ink
          : fillOf(role);
  const shown = prims.filter((p) => p.o > 0.001);
  // Grid and rules under the marks, marks under the words.
  const layer = (p: Prim) =>
    p.role === "grid" ? 0 : p.kind === "text" ? 3 : p.stroke ? 2 : 1;
  return (
    <g>
      {[...shown]
        .sort((a, b) => layer(a) - layer(b))
        .map((p) => {
          if (p.kind === "line")
            return (
              <line
                key={p.id}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={fillOf(p.role)}
                strokeWidth={p.w ?? 1}
                strokeDasharray={p.dash ? "5 4" : undefined}
                strokeLinecap="round"
                opacity={p.o}
              />
            );
          if (p.kind === "circle") {
            if (p.stroke)
              return (
                <circle
                  key={p.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill="none"
                  stroke={colours.ink}
                  strokeWidth={1.2}
                  opacity={p.o}
                />
              );
            if (p.role === "early" || p.hollow)
              return (
                <circle
                  key={p.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill={colours.ground}
                  stroke={fillOf(p.ring ?? p.role)}
                  strokeWidth={1.6}
                  opacity={p.o}
                />
              );
            return (
              <circle
                key={p.id}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={fillOf(p.role)}
                stroke={p.edge ? colours.ground : "none"}
                strokeWidth={p.edge ? 0.6 : 0}
                opacity={p.o}
              />
            );
          }
          if (p.kind === "rect") {
            if (p.stroke)
              return (
                <rect
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  width={Math.max(0, p.width)}
                  height={Math.max(0, p.height)}
                  fill="none"
                  stroke={colours.ink}
                  strokeWidth={1.2}
                  rx={3}
                  opacity={p.o}
                />
              );
            return (
              <rect
                key={p.id}
                x={p.x}
                y={p.y}
                width={Math.max(0.5, p.width)}
                height={Math.max(0.5, p.height)}
                fill={fillOf(p.role)}
                opacity={p.o}
              />
            );
          }
          if (p.kind === "text") {
            const r = text.regs[p.reg ?? "annot"];
            const band = measureTextBand("Hxpg1,", text.sizeOf(r));
            const baseline = p.y + (band.ascent - band.descent) / 2;
            return (
              <text
                key={p.id}
                x={p.x}
                y={baseline}
                textAnchor={p.anchor ?? "start"}
                fontFamily={r.fontFamily}
                fontSize={r.fontSize}
                fontWeight={p.bold ? bold : r.fontWeight}
                fontStyle={r.fontStyle}
                letterSpacing={r.letterSpacing || undefined}
                fill={inkOf(p.role)}
                opacity={p.o}
                data-width={
                  Math.round(text.measure(p.text, p.reg ?? "annot") * 100) / 100
                }
              >
                {applyCase(String(p.text), r.transform)}
              </text>
            );
          }
          return null;
        })}
    </g>
  );
}

export function GesturePositionStatic({
  variant,
  model,
  plate,
  format,
  delta,
  title,
  limits,
  source,
  alt,
  eyebrow,
  unit,
  scope,
  direction,
  frame,
}: {
  variant: string;
  model: any;
  plate: { state: any; notes: any[] };
  format: (v: number) => string;
  delta: (v: number) => string;
  title: string | string[];
  limits: string | string[];
  source: string;
  alt: string | ((rows: any[]) => string);
  eyebrow: string;
  unit?: string;
  scope?: (drawn: number, all: number) => string;
  direction: any;
  frame: { width: number; height: number };
}) {
  const { width, height } = frame;
  const PAD = direction.pad;
  const colours = paletteOf(direction.ground, direction.accent);
  const text = textOf(direction, { format, delta, moments: model.moments });
  const display = registerOf(direction, "display");
  const eyebrowReg = registerOf(direction, "eyebrow");
  const body = registerOf(direction, "body");
  const sizeOf = (r: Reg) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
    fontStyle: r.fontStyle,
  });
  const widthOf = (t: string, r: Reg) =>
    measureText(applyCase(t, r.transform), sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, t.length - 1);
  const column = width - PAD * 2;
  const wrap = (t: string, r: Reg, w = column) =>
    wrapWords(applyCase(t, r.transform), w, (s: string) => widthOf(s, r));

  // ── header and footer: the longest forms that fit ──
  const titleForms = [title].flat().filter(Boolean);
  const limitForms = [limits].flat().filter(Boolean);
  const titleLines =
    titleForms.map((t) => wrap(t, display)).find((l) => l.length <= 2) ??
    wrap(titleForms.at(-1)!, display);
  const limitLines =
    limitForms.map((t) => wrap(t, body)).find((l) => l.length <= 3) ??
    wrap(limitForms.at(-1)!, body).slice(0, 4);
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + (titleLines.length - 1) * leadOf(display) + gapOf(body, 1.2);
  const plotTop =
    limitsTop + (limitLines.length - 1) * leadOf(body) + gapOf(body, 1.4);
  const sourceLines = wrap(source, body);
  const scopeLine =
    model.dropped && scope
      ? scope(model.rows.length, model.rows.length + model.dropped)
      : model.dropped
        ? `${model.rows.length} / ${model.rows.length + model.dropped}`
        : "";

  const draw = (underCount: number) => {
    const footLines =
      [...(unit ? [unit] : []), ...(scopeLine ? [scopeLine] : [])].length +
      underCount;
    const sourceTop = height - PAD - (sourceLines.length - 1) * leadOf(body);
    const plotBottom =
      sourceTop -
      body.fontSize -
      gapOf(body, 0.9) -
      footLines * text.lead("annot");
    const plotFrame = {
      x: PAD,
      y: plotTop,
      width: column,
      height: Math.max(80, plotBottom - plotTop),
    };
    const scene = sceneOf({
      model,
      state: plate.state,
      frame: plotFrame,
      text,
    });
    const placed = placeNotes({
      scene,
      notes: plate.notes,
      text,
      frame: {
        x: PAD,
        y: plotTop - 4,
        width: column,
        height: plotFrame.height + 4,
      },
    });
    return { scene, under: placed.under, plotFrame, plotBottom, sourceTop };
  };
  let layout = draw(0);
  for (let pass = 0; pass < 3; pass++) {
    const lines = layout.under.flatMap((u: any) =>
      wrapWords(u.text, column, (s: string) => text.measure(s)),
    );
    const next = draw(lines.length);
    if (next.under.length === layout.under.length) {
      layout = next;
      break;
    }
    layout = next;
  }
  const underLines = layout.under.flatMap((u: any) =>
    wrapWords(u.text, column, (s: string) => text.measure(s)),
  );
  const footer = [
    ...underLines.map((t: string) => ({
      text: t,
      role: "accent",
      reg: "annot",
    })),
    ...(unit ? [{ text: unit, role: "muted", reg: "axis" }] : []),
    ...(scopeLine ? [{ text: scopeLine, role: "muted", reg: "annot" }] : []),
  ];
  const footPrims: Prim[] = footer.map((f, i) => ({
    id: `foot-${i}`,
    kind: "text",
    x: PAD,
    y: layout.plotBottom + text.lead("annot") * (i + 0.9),
    text: f.text,
    anchor: "start",
    reg: f.reg,
    role: f.role,
    o: 1,
  }));
  const line = (r: Reg) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing || undefined,
    fill: r.fill,
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={typeof alt === "function" ? alt(model.rows) : alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />
      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {applyCase(eyebrow, eyebrowReg.transform)}
      </text>
      {titleLines.map((l: string, i: number) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={titleTop + i * leadOf(display)}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {limitLines.map((l: string, i: number) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={limitsTop + i * leadOf(body)}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      <SharedPlot
        prims={[...layout.scene.prims, ...footPrims]}
        colours={colours}
        text={text}
      />
      {sourceLines.map((l: string, i: number) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * leadOf(body)}
          {...line(body)}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

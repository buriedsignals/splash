/**
 * THE DRAWING EVERY KEYED FAMILY SHARES (interval, multiples, flow, profile): a family's scene — its furniture, its
 * marks, its words, its overlays and its notes, laid out once by the family's geometry (`gesture-family-<id>.mjs`)
 * — painted at one STATE of the gesture schedulers (`gesture-keyed.mjs`). One painter for every format: the static
 * plate paints the last state, the web page one state per plate, the video the state at each frame, the scrolly page
 * the closing state with every mark tagged for the drive (`applyKeyedState`) to repaint as the reader scrolls.
 *
 * DOCTRINE KEPT FROM THE PER-TYPE KITS: furniture derived from the ground (`deriveFurniture`), one accent carrying the
 * subject and every other mark in one neutral taken to the non-text floor, words set in the direction's registers and
 * written directly on the marks, emphasis by accent, ring and stepping back — never a second hue.
 *
 * Browser-safe (the Remotion bundle and the scrolly page import it): no Node module; colours are mixed here.
 */

export type Prim = {
  tag: "rect" | "path" | "circle" | "line" | "polyline";
  attrs: Record<string, string | number>;
  paint?: "fill" | "stroke";
  role?: string;
};
export type SceneText = {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  reg: string;
  role?: string;
  mark?: number;
  width: number;
  lines?: string[];
};
export type SceneNote = {
  k: number;
  text: string;
  lines: string[];
  x: number;
  y: number;
  anchor: "start";
  reg: string;
  width: number;
  lead: number;
  leader: null | { x1: number; y1: number; x2: number; y2: number };
};
export type Scene = {
  width: number;
  height: number;
  furniture: Prim[];
  marks: Array<{
    i: number;
    name: string;
    shapes: Prim[];
    ring: Prim;
    anchor: { x: number; y: number };
    hit: { x: number; y: number; r: number };
    detail: string;
    base?: number;
  }>;
  texts: SceneText[];
  overlays: Array<{ k: number; shapes: Prim[]; label?: SceneText }>;
  notes: SceneNote[];
  topRoom?: number;
};
export type Register = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: string;
  letterSpacing?: number;
  transform?: string;
};
export type KeyedColours = {
  ground: string;
  neutral: string;
  accent: string;
  track: string;
  grid: string;
  copy: string;
  rule: string;
  ring: string;
  text: { ink: string; muted: string; accent: string };
};
export type KeyedState = Record<string, number>;

// ── colour, browser-side (the bundle cannot import the Node colour helpers) ─────────────────────────
const rgb = (c: string) => {
  const m = c.replace("#", "");
  const v =
    m.length === 3
      ? m
          .split("")
          .map((x) => x + x)
          .join("")
      : m;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
export const mixHex = (a: string, b: string, t: number) => {
  const [p, q] = [rgb(a), rgb(b)];
  return `#${p
    .map((x, i) =>
      Math.round(x + (q[i] - x) * Math.min(1, Math.max(0, t)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (s: KeyedState, k: string) => (Number.isFinite(s[k]) ? s[k] : 0);
/** How far a stepped-back mark recedes (the drive uses the same 0.78). */
const BACK = 0.78;

export function caseOf(text: string, transform?: string) {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

export function textAttrs(r: Register, fill: string) {
  return {
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight as number,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill,
  };
}

function Shape({ p, extra }: { p: Prim; extra: Record<string, unknown> }) {
  const T = p.tag as any;
  const attrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p.attrs)) {
    // `data-base` is the scene's own note to the painter (a mark's resting opacity), never an SVG attribute.
    if (k === "data-base") continue;
    attrs[k.startsWith("data-") ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return <T {...attrs} {...extra} />;
}

/**
 * The scene at one state, as an SVG group translated to the plot's corner.
 *
 * @param tag      "scrolly": every mark, ring, word, overlay and note carries the drive's data attributes
 * @param measured "video": every <text> carries its measured width (`data-width`), as the video floor requires
 * @param hits     web: the hit points `interaction.mjs` resolves a pointer off, keyed `p<plate>-m<i>`
 */
export function KeyedLayer({
  scene,
  state,
  colours,
  regs,
  x = 0,
  y = 0,
  tag,
  measured,
  hits,
  plate = 0,
  active,
}: {
  scene: Scene;
  state: KeyedState;
  colours: KeyedColours;
  regs: Record<string, Register>;
  x?: number;
  y?: number;
  tag?: "scrolly";
  measured?: boolean;
  hits?: boolean;
  plate?: number;
  /** web: the pointer's step toward the ink from a fill (`--mark-active`, lit by interaction.mjs) */
  active?: (fill: string) => string;
}) {
  const C = colours;
  const opacityOf = (i: number) =>
    clamp(num(state, `s${i}`)) * (1 - BACK * clamp(num(state, `b${i}`)));
  const fillOf = (i: number) =>
    mixHex(C.neutral, C.accent, clamp(num(state, `a${i}`)));
  const roleFill: Record<string, string> = {
    ring: C.ring,
    track: C.track,
    grid: C.grid,
    axis: C.rule,
    node: C.neutral,
    copy: C.copy,
    rule: C.rule,
    link: C.rule,
    faint: C.track,
  };
  const width = (t: SceneText | SceneNote) =>
    measured ? { "data-width": t.width } : {};
  const lineOf = (
    t: SceneText,
    fill: string,
    extra: Record<string, unknown> = {},
  ) => {
    const r = regs[t.reg] ?? regs.axis;
    return (
      <text
        x={t.x}
        y={t.y}
        textAnchor={t.anchor}
        {...textAttrs(r, fill)}
        {...width(t)}
        {...extra}
      >
        {caseOf(t.text, r.transform)}
      </text>
    );
  };
  // A note written over a mark keeps a ring of ground around its letters, so it reads on any ink beneath.
  const halo = { stroke: C.ground, strokeWidth: 3, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };
  const strong = (i: number) =>
    clamp(num(state, `a${i}`)) > 0.5 || clamp(num(state, `r${i}`)) > 0.5;
  return (
    <g transform={`translate(${x} ${y})`}>
      {scene.furniture.map((p, j) => (
        <Shape
          key={`f${j}`}
          p={p}
          extra={
            p.tag === "line" || p.paint === "stroke"
              ? {
                  stroke: roleFill[p.role ?? "grid"] ?? C.grid,
                  strokeWidth: p.role === "axis" ? 1 : 0.6,
                  fill: "none",
                }
              : { fill: roleFill[p.role ?? "track"] ?? C.track }
          }
        />
      ))}
      {scene.marks.map((m) => {
        const op = opacityOf(m.i);
        const fill = fillOf(m.i);
        return (
          <g key={`m${m.i}`}>
            {m.shapes.map((p, j) => {
              const stroke = p.paint === "stroke";
              const base = Number(p.attrs["data-base"] ?? m.base ?? 1);
              const paint = stroke
                ? {
                    stroke: fill,
                    fill: "none",
                    strokeWidth: p.attrs["stroke-width"] ?? 1.6,
                  }
                : { fill };
              const drive =
                tag === "scrolly"
                  ? {
                      "data-ki": m.i,
                      "data-kfill": C.neutral,
                      "data-kaccent": C.accent,
                      "data-kpaint": stroke ? "stroke" : "fill",
                      "data-kbase": base,
                    }
                  : {};
              return (
                <Shape
                  key={j}
                  p={p}
                  extra={{
                    ...paint,
                    // A translucent mark (a ribbon) firms up as it takes the accent.
                    opacity: op * (base + (1 - base) * clamp(num(state, `a${m.i}`)) * 0.7),
                    ...drive,
                    ...(hits ? { [stroke ? "data-mark-edge" : "data-mark"]: `p${plate}-m${m.i}` } : {}),
                    ...(active ? { style: { ["--mark-active" as string]: active(fill) } } : {}),
                  }}
                />
              );
            })}
            <Shape
              p={m.ring}
              extra={{
                fill: "none",
                stroke: C.ring,
                strokeWidth: 1.6,
                opacity: clamp(num(state, `r${m.i}`)) * op,
                ...(tag === "scrolly" ? { "data-kr": m.i } : {}),
              }}
            />
          </g>
        );
      })}
      {scene.texts.map((t, j) => {
        const r = regs[t.reg] ?? regs.axis;
        const marked = t.mark !== undefined;
        const fill =
          marked && strong(t.mark!) && clamp(num(state, `a${t.mark}`)) > 0.5
            ? C.text.accent
            : t.role === "tick"
              ? C.text.muted
              : C.text.ink;
        const op = marked
          ? clamp(num(state, `s${t.mark}`)) *
            (1 - 0.7 * clamp(num(state, `b${t.mark}`)))
          : 1;
        const drive =
          tag === "scrolly" && marked
            ? {
                "data-kl": t.mark,
                "data-kink": C.text.ink,
                "data-kink-strong": C.text.accent,
              }
            : {};
        return (
          <text
            key={`t${j}`}
            x={t.x}
            y={t.y}
            textAnchor={t.anchor}
            {...textAttrs(r, fill)}
            fontWeight={
              marked && !measured && strong(t.mark!) ? 700 : (r.fontWeight as number)
            }
            opacity={op}
            pointerEvents="none"
            {...width(t)}
            {...drive}
          >
            {caseOf(t.text, r.transform)}
          </text>
        );
      })}
      {scene.overlays.map((o) => {
        const op = clamp(num(state, `o${o.k}`));
        return (
          <g
            key={`o${o.k}`}
            opacity={op}
            {...(tag === "scrolly" ? { "data-ko": o.k } : {})}
            pointerEvents="none"
          >
            {o.shapes.map((p, j) => (
              <Shape
                key={j}
                p={p}
                extra={
                  p.tag === "line" || p.paint === "stroke"
                    ? {
                        stroke:
                          p.role === "accent"
                            ? C.accent
                            : (roleFill[p.role ?? "rule"] ?? C.rule),
                        strokeWidth: p.role === "accent" || p.role === "ring" ? 2 : 1.2,
                        fill: "none",
                      }
                    : {
                        fill:
                          p.role === "accent"
                            ? C.accent
                            : (roleFill[p.role ?? "copy"] ?? C.copy),
                      }
                }
              />
            ))}
            {o.label ? lineOf(o.label, C.text.ink, halo) : null}
          </g>
        );
      })}
      {scene.notes.map((n) => {
        const r = regs[n.reg] ?? regs.annot;
        return (
          <g
            key={`n${n.k}`}
            opacity={clamp(num(state, `n${n.k}`))}
            {...(tag === "scrolly" ? { "data-kn": n.k } : {})}
            pointerEvents="none"
          >
            {n.leader ? (
              <line
                x1={n.leader.x1}
                y1={n.leader.y1}
                x2={n.leader.x2}
                y2={n.leader.y2}
                stroke={C.rule}
                strokeWidth={0.8}
              />
            ) : null}
            {n.lines.map((line, j) => (
              <text
                key={j}
                x={n.x}
                y={n.y + j * n.lead}
                {...textAttrs(r, C.text.ink)}
                {...halo}
                {...(measured ? { "data-width": (n as any).widths?.[j] ?? n.width } : {})}
              >
                {caseOf(line, r.transform)}
              </text>
            ))}
          </g>
        );
      })}
      {hits
        ? scene.marks.map((m) => (
            <circle
              key={`h${m.i}`}
              className="pt"
              cx={m.hit.x}
              cy={m.hit.y}
              r={m.hit.r}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={`p${plate}-m${m.i}`}
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))
        : null}
    </g>
  );
}

/** A text measurer bound to registers (the family geometries call measure(text, regName) and lead(regName)). */
export function measurers(
  regs: Record<string, Register & { lineHeight?: number }>,
  measureText: (t: string, o: any) => number,
) {
  const measure = (text: string, reg: string) => {
    const r = regs[reg] ?? regs.axis;
    const t = caseOf(String(text), r.transform);
    return (
      measureText(t, {
        fontSize: r.fontSize,
        fontWeight: r.fontWeight,
        fontFamily: r.fontFamily,
      }) +
      Number(r.letterSpacing ?? 0) * Math.max(0, t.length - 1)
    );
  };
  const lead = (reg: string) => {
    const r = regs[reg] ?? regs.axis;
    return (r.lineHeight ?? 1.25) * r.fontSize;
  };
  return { measure, lead };
}

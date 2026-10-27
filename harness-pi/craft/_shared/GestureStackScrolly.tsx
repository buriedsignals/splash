/**
 * The Stack family's scrolly — stacked-bar, diverging-stacked-bar-likert and waterfall-bridge as variants of one
 * page whose staging is the beat's own `gestures`: every mark (segments, the accent on a bar's name, a ring, the bars
 * stepping back, a bracket and its figure, a compare's copy, a reference rule) laid out in the reader's pixels on
 * each paint by the drive (`applyStackState`, gesture-stack-scrolly.mjs). Forked from the still plate
 * (GestureStackStatic.tsx): the same fills, one value axis for every card, every segment's value inside it where it
 * fits, a stacked bar's total past its end, a Likert's side totals at each end, a bridge's connectors.
 *
 * What is rendered here without a script is the closing card's picture: the same bars on the same axis, the bars a
 * gesture marked in the accent, every note written.
 */
import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;

/** The static plate's fills, per bar and part. */
export function stackFills({
  variant,
  stack,
  accent,
  ground,
  ink,
  muted,
  decreaseInk,
}: {
  variant: string;
  stack: any;
  accent: string;
  ground: string;
  ink: string;
  muted: string;
  decreaseInk?: string;
}) {
  return (bar: string, part: string): string => {
    if (variant === "stacked-bar") {
      const parts: string[] = stack.parts;
      const i = parts.indexOf(part);
      const t = parts.length === 1 ? 0 : 1 - i / (parts.length - 1);
      return mix(accent, ground, 0.62 * t);
    }
    if (variant === "diverging-stacked-bar-likert") {
      const side = stack.sideOf(part);
      if (side === "centre") return mix(ground, ink, 0.14);
      const list: string[] = side === "left" ? stack.left : stack.right;
      const t = (list.indexOf(part) + 1) / list.length;
      return side === "left"
        ? mix(mix(muted, ground, 0.2), ink, t * 0.6)
        : mix(mix(accent, ground, 0.7), accent, t);
    }
    if (stack.names.indexOf(bar) === 0) return muted;
    return stack.valueOf(bar, bar) >= 0
      ? accent
      : (decreaseInk ?? mix(ink, ground, 0.35));
  };
}

export function GestureStackScrolly({
  data,
  notes,
  still,
  keyParts,
  unit,
  rest,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  data: any;
  /** per gesture, the note its card's header reads ("" for none) */
  notes: string[];
  /** the closing card's picture: per drawn bar its emphasis, in the closing order */
  still: { order: number[]; accent: boolean[] };
  keyParts: { label: string; fill: string }[];
  unit: string;
  rest: string | null;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const inkOn = (fill: string) =>
    adjustToContrast(ink, fill, TEXT_CONTRAST_MIN) ?? ink;
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const [lo, hi] = data.domain as [number, number];
  const pct = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const writtenNotes = notes.filter((t) => t.trim());
  const noScript =
    `[data-gstack] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-gstack] [data-part="still"] { display: flex !important; }`;
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const columns = data.layout === "columns";
  // The still's rows: every bar (a bridge's steps and its closing level too), one horizontal axis.
  const stillRows = [
    ...still.order.map((i) => ({
      name: data.bars[i].name,
      segs: data.bars[i].segs,
      label: data.bars[i].total,
      left: data.bars[i].left,
      strong: still.accent[i],
    })),
    ...(columns
      ? [
          {
            name: data.closingName,
            segs: [
              {
                from: Math.min(0, data.closing),
                to: Math.max(0, data.closing),
                fill: muted,
              },
            ],
            label: data.closingLabel,
            left: null,
            strong: false,
          },
        ]
      : []),
  ];

  return (
    <div
      role="img"
      aria-label={alt}
      data-gstack={JSON.stringify({
        ...data,
        bars: data.bars.map((b: any) => ({
          segs: b.segs.map(({ fill: _f, label: _l, ...s }: any) => s),
        })),
        colours: { ink: inkOnGround, accent: accentInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "10px",
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
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "2px 12px",
            alignItems: "baseline",
          }}
        >
          {keyParts.map((k) => (
            <span
              key={k.label}
              style={{
                ...regs.annot,
                color:
                  adjustToContrast(k.fill, ground, TEXT_CONTRAST_MIN) ?? k.fill,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "0.7em",
                  height: "0.7em",
                  marginRight: "0.35em",
                  background: k.fill,
                }}
              />
              {k.label}
            </span>
          ))}
          <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
            {unit}
          </span>
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {data.plan.map((p: any, j: number) => (
            <span
              key={p.k}
              data-note={p.k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {notes[j]}
            </span>
          ))}
        </span>
      </div>

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{
            display: "none",
            position: "absolute",
            inset: 0,
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)",
              gridAutoRows: "minmax(0, 1fr)",
              alignItems: "center",
              columnGap: "12px",
            }}
          >
            {stillRows.map((r, i) => (
              <div key={i} style={{ display: "contents" }}>
                <span
                  style={{
                    ...regs.annot,
                    color: r.strong ? accentInk : inkOnGround,
                    fontWeight: r.strong ? 700 : regs.annot.fontWeight,
                    textAlign: "right",
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    position: "relative",
                    height: "100%",
                    margin: "0 8%",
                  }}
                >
                  {r.segs.map((s: any, p: number) => (
                    <span
                      key={p}
                      style={{
                        position: "absolute",
                        left: `${pct(s.from)}%`,
                        width: `${pct(s.to) - pct(s.from)}%`,
                        top: "19%",
                        height: "62%",
                        maxHeight: "34px",
                        background: s.fill,
                      }}
                    />
                  ))}
                  <span
                    style={{
                      ...regs.value,
                      position: "absolute",
                      top: "50%",
                      left: `${Math.max(...r.segs.map((s: any) => pct(s.to)))}%`,
                      transform: "translate(6px, -50%)",
                      color: r.strong ? accentInk : inkOnGround,
                      fontWeight: 700,
                    }}
                  >
                    {r.label}
                  </span>
                  {r.left ? (
                    <span
                      style={{
                        ...regs.value,
                        position: "absolute",
                        top: "50%",
                        left: `${Math.min(...r.segs.map((s: any) => pct(s.from)))}%`,
                        transform: "translate(calc(-100% - 6px), -50%)",
                        color: r.strong ? accentInk : inkOnGround,
                        fontWeight: 700,
                      }}
                    >
                      {r.left}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
            {rest ? (
              <span
                style={{ ...regs.annot, color: mutedInk, gridColumn: "1 / -1" }}
              >
                {rest}
              </span>
            ) : null}
          </div>
          {writtenNotes.length ? (
            <p
              style={{
                ...regs.value,
                color: accentInk,
                margin: 0,
                flex: "0 0 auto",
              }}
            >
              {writtenNotes.join(" · ")}
            </p>
          ) : null}
        </div>

        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <line data-part="baseline" stroke={mutedInk} strokeWidth={1} />
          {data.bars.map((b: any, i: number) => (
            <g key={i}>
              {b.segs.map((s: any, p: number) => (
                <rect key={p} data-seg={`${i}-${p}`} fill={s.fill} />
              ))}
              <rect
                data-ring={i}
                fill="none"
                stroke={inkOnGround}
                strokeWidth={1.6}
                rx={2}
                opacity={0}
              />
              {columns ? (
                <line
                  data-conn={i}
                  stroke={mutedInk}
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                  opacity={0}
                />
              ) : null}
            </g>
          ))}
          {columns ? <rect data-seg="c" fill={muted} /> : null}
          {data.plan.map((p: any) =>
            p.do === "compare" ? (
              <g key={p.k}>
                <rect data-copy={p.k} fill={inkOnGround} opacity={0} />
                <line
                  data-tick={p.k}
                  stroke={inkOnGround}
                  strokeWidth={1.5}
                  opacity={0}
                />
              </g>
            ) : p.do === "bracket" ? (
              <path
                key={p.k}
                data-bk={p.k}
                fill="none"
                stroke={inkOnGround}
                strokeWidth={1.3}
                opacity={0}
              />
            ) : p.do === "reference" ? (
              <line
                key={p.k}
                data-rule={p.k}
                stroke={accentInk}
                strokeWidth={1.2}
                strokeDasharray="4 3"
                opacity={0}
              />
            ) : (
              <g key={p.k}>
                {(p.rings ?? []).map(([i, s]: number[], m: number) => (
                  <rect
                    key={m}
                    data-sring={p.k}
                    data-at={`${i}-${s}`}
                    fill="none"
                    stroke={inkOnGround}
                    strokeWidth={1.6}
                    opacity={0}
                  />
                ))}
              </g>
            ),
          )}
        </svg>

        {data.bars.map((b: any, i: number) => (
          <div key={i}>
            <span
              data-name={i}
              style={abs({
                ...(columns ? regs.axis : regs.annot),
                color: inkOnGround,
                textAlign: "right",
                lineHeight: 1.15,
              })}
            >
              {b.name}
            </span>
            <span
              data-tot={i}
              style={abs({
                ...(columns
                  ? regs.value
                  : data.centre
                    ? regs.axis
                    : regs.value),
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
              })}
            >
              {b.total}
            </span>
            {b.left !== null ? (
              <span
                data-lt={i}
                style={abs({
                  ...regs.axis,
                  color: inkOnGround,
                  fontWeight: 700,
                  textShadow: halo,
                })}
              >
                {b.left}
              </span>
            ) : null}
            {b.segs.map((s: any, p: number) =>
              s.label ? (
                <span
                  key={p}
                  data-sv={`${i}-${p}`}
                  style={abs({
                    ...regs.annot,
                    color: inkOn(s.fill),
                    opacity: 0,
                  })}
                >
                  {s.label}
                </span>
              ) : null,
            )}
          </div>
        ))}
        {columns ? (
          <>
            <span
              data-name="c"
              style={abs({
                ...regs.axis,
                color: inkOnGround,
                lineHeight: 1.15,
              })}
            >
              {data.closingName}
            </span>
            <span
              data-tot="c"
              style={abs({
                ...regs.value,
                color: inkOnGround,
                fontWeight: 700,
                textShadow: halo,
              })}
            >
              {data.closingLabel}
            </span>
          </>
        ) : null}
        {rest ? (
          <span
            data-part="rest"
            style={abs({ ...regs.annot, color: mutedInk })}
          >
            {rest}
          </span>
        ) : null}
        {data.plan
          .filter((p: any) => p.label !== undefined)
          .map((p: any) => (
            <span
              key={p.k}
              data-label={p.k}
              style={abs({
                ...regs.value,
                color: p.do === "reference" ? accentInk : inkOnGround,
                fontWeight: 700,
                textShadow: halo,
                opacity: 0,
              })}
            >
              {p.label}
            </span>
          ))}
      </div>
    </div>
  );
}

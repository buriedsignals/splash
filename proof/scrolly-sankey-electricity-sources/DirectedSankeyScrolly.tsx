/**
 * Six countries' electricity by source, 2024, drawn THROUGH the design base as a sankey and CHOREOGRAPHED by the
 * scroll. The `sankey` type in the scrolly format: the subject of `static-sankey-electricity-sources` — the six's
 * nuclear power is 84 % French — told with the gestures a scroll can make
 * (`scrolly/references/directed-type-choreography.md`): the two rails alone, one source's ribbons, the whole web, then
 * the web read back from one country, and from another.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: every node carries its own total; conservation is drawn — the ribbons out of
 * a node add up to the node, on both rails; ribbons translucent, so a crossing darkens rather than hides; a flow too
 * small to see keeps a minimum width; one ordered ramp for the sources, the accent spent on the tracked flow.
 *
 * `sankey-drive.mjs` lays out every rail, ribbon and label in the reader's pixels on each paint. What is rendered here
 * is the last card's picture, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Node = {
  key: string;
  label: string;
  total: number;
  totalText: string;
};
export type Flow = {
  from: string;
  to: string;
  value: number;
  ofSource: string;
  ofTarget: string;
  fromLabel: string;
  valueText: string;
};
type Style = Record<string, string | number>;

export const NOTES = [
  "railNote",
  "sourceNote",
  "webNote",
  "subjectNote",
  "otherNote",
] as const;

export function DirectedSankeyScrolly({
  sources,
  targets,
  flows,
  tracked,
  focus,
  words,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  sources: Node[];
  targets: Node[];
  flows: Flow[];
  tracked: { from: string; to: string };
  focus: string[];
  words: Record<(typeof NOTES)[number] | "unit", string>;
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
  /** The static plate's ramp: the furniture's muted to a low tint of the accent, in the sources' family order. */
  const rampTo = mix(accent, ground, 0.62);
  const ribbonFill = (i: number) =>
    mix(muted, rampTo, sources.length > 1 ? i / (sources.length - 1) : 0);
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const railFill = (key: string, i: number) =>
    key === tracked.from || key === tracked.to
      ? accent
      : i >= 0
        ? (adjustToContrast(ribbonFill(i), ground, NON_TEXT_CONTRAST_MIN) ??
          mutedInk)
        : mutedInk;
  /** A share written on the tracked ribbon sits on the accent, in whichever ink reads there; every other on its halo. */
  const onAccent = contrast(ground, accent) >= contrast(ink, accent) ? ground : ink;
  const shareInk = (f: Flow): CSSProperties =>
    f.from === tracked.from && f.to === tracked.to ? { color: onAccent } : { color: inkOnGround, textShadow: halo };
  const nodeLabel = (n: Node, side: "source" | "target") => {
    const lit = n.key === tracked.from || n.key === tracked.to;
    return (
      <div
        key={`${side}-${n.key}`}
        data-node-label={`${side}:${n.key}`}
        style={abs({ textAlign: side === "source" ? "right" : "left" })}
      >
        <span
          data-part="name"
          style={{
            ...regs.annot,
            color: lit ? accentInk : inkOnGround,
            fontWeight: lit ? 700 : regs.annot.fontWeight,
          }}
        >
          {n.label}
        </span>
        <span data-part="sep"> </span>
        <span
          data-part="total"
          style={{
            ...regs.value,
            color: lit ? accentInk : mutedInk,
            fontWeight: 700,
          }}
        >
          {n.totalText}
        </span>
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label={alt}
      data-sankey={JSON.stringify({
        sources: sources.map((n) => ({ key: n.key, total: n.total })),
        targets: targets.map((n) => ({ key: n.key, total: n.total })),
        flows: flows.map((f) => ({ from: f.from, to: f.to, value: f.value })),
        tracked,
        focus,
        notes: NOTES,
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
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {NOTES.map((k) => (
            <span
              key={k}
              data-note={k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
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
          <defs>
            <clipPath id="sankey-grow-source">
              <rect
                data-clip="source"
                x={0}
                y={-10000}
                width={100000}
                height={20000}
              />
            </clipPath>
            <clipPath id="sankey-grow-web">
              <rect
                data-clip="web"
                x={0}
                y={-10000}
                width={100000}
                height={20000}
              />
            </clipPath>
          </defs>
          {flows.map((f) => {
            const i = sources.findIndex((s) => s.key === f.from);
            const isTracked = f.from === tracked.from && f.to === tracked.to;
            return (
              <path
                key={`${f.from}-${f.to}`}
                data-flow={`${f.from}|${f.to}`}
                clipPath={
                  f.from === tracked.from
                    ? "url(#sankey-grow-source)"
                    : "url(#sankey-grow-web)"
                }
                fill={isTracked ? accent : ribbonFill(i)}
                fillOpacity={isTracked ? 0.8 : 0.55}
              />
            );
          })}
          {sources.map((n, i) => (
            <rect
              key={`s${n.key}`}
              data-rail={`source:${n.key}`}
              fill={railFill(n.key, i)}
            />
          ))}
          {targets.map((n) => (
            <rect
              key={`t${n.key}`}
              data-rail={`target:${n.key}`}
              fill={railFill(n.key, -1)}
            />
          ))}
        </svg>

        {sources.map((n) => nodeLabel(n, "source"))}
        {targets.map((n) => nodeLabel(n, "target"))}

        {flows.map((f) => (
          <span
            key={`os${f.from}-${f.to}`}
            data-flow-share={`source|${f.from}|${f.to}`}
            style={abs({
              ...regs.value,
              ...shareInk(f),
              fontWeight: 700,
              opacity: 0,
            })}
          >
            {f.ofSource && (
              <>
                <span data-part="share-name">{`${f.valueText} · `}</span>
                {f.ofSource}
              </>
            )}
          </span>
        ))}
        {flows
          .filter((f) => focus.includes(f.to))
          .map((f) => (
            <span
              key={`ot${f.from}-${f.to}`}
              data-flow-share={`target|${f.from}|${f.to}`}
              style={abs({
                ...regs.value,
                ...shareInk(f),
                fontWeight: 700,
                opacity: 0,
              })}
            >
              {f.ofTarget && (
                <>
                  <span data-part="share-name">{`${f.fromLabel} `}</span>
                  {f.ofTarget}
                </>
              )}
            </span>
          ))}
      </div>
    </div>
  );
}

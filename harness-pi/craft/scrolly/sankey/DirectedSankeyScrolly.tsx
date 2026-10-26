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

  // THE LAST CARD'S PICTURE WITHOUT A SCRIPT (kit addition). The drive lays out every rail and
  // ribbon in the reader's pixels, so with no script the ribbons have no geometry and every node's
  // name sits at the stage's top-left corner, overprinted. A <noscript> stylesheet hides the drive's
  // layer and shows the last card: both rails stacked on one scale, every ribbon between them in the
  // drive's order, each node named with its total beside its rail.
  const stillTotal = sources.reduce((s, n) => s + n.total, 0);
  const STILL_GAP = 8;
  const stillScale = (1000 - STILL_GAP * (Math.max(sources.length, targets.length) - 1)) / stillTotal;
  const stillStack = (nodes: Node[]) => {
    const gap = nodes.length > 1 ? (1000 - stillTotal * stillScale) / (nodes.length - 1) : 0;
    let y = 0;
    return new Map(
      nodes.map((n) => {
        const box = { y0: y, h: n.total * stillScale };
        y += box.h + gap;
        return [n.key, box];
      }),
    );
  };
  const stillLeft = stillStack(sources);
  const stillRight = stillStack(targets);
  const rankOf = (list: Node[], key: string) => list.findIndex((n) => n.key === key);
  const stillOffL = new Map<string, number>();
  const stillOffR = new Map<string, number>();
  const stillRibbons = [...flows]
    .sort((a, b) => rankOf(sources, a.from) - rankOf(sources, b.from) || rankOf(targets, a.to) - rankOf(targets, b.to))
    .map((f) => {
      const h = Math.max(f.value * stillScale, 0.6);
      const ay = stillLeft.get(f.from)!.y0 + (stillOffL.get(f.from) ?? 0);
      const by = stillRight.get(f.to)!.y0 + (stillOffR.get(f.to) ?? 0);
      stillOffL.set(f.from, (stillOffL.get(f.from) ?? 0) + f.value * stillScale);
      stillOffR.set(f.to, (stillOffR.get(f.to) ?? 0) + f.value * stillScale);
      const isTracked = f.from === tracked.from && f.to === tracked.to;
      return {
        key: `${f.from}|${f.to}`,
        d: `M12 ${ay} C500 ${ay} 500 ${by} 988 ${by} L988 ${by + h} C500 ${by + h} 500 ${ay + h} 12 ${ay + h} Z`,
        fill: isTracked ? accent : ribbonFill(rankOf(sources, f.from)),
        opacity: isTracked ? 0.8 : 0.55,
      };
    });
  const stillLabel = (n: Node, side: "source" | "target", box: { y0: number; h: number }) => {
    const lit = n.key === tracked.from || n.key === tracked.to;
    return (
      <span key={`${side}-${n.key}`} style={abs({ top: `${((box.y0 + box.h / 2) / 1000) * 100}%`, transform: "translateY(-50%)", ...(side === "source" ? { left: "auto", right: 0 } : {}) })}>
        <span style={{ ...regs.annot, color: lit ? accentInk : inkOnGround, fontWeight: lit ? 700 : regs.annot.fontWeight }}>{n.label}</span>{" "}
        <span style={{ ...regs.value, color: lit ? accentInk : mutedInk, fontWeight: 700 }}>{n.totalText}</span>
      </span>
    );
  };
  // Each label column is as wide as its widest label: a zero-height copy of every label sizes it.
  const sizer = (nodes: Node[]) => (
    <div style={{ height: 0, overflow: "hidden", visibility: "hidden" }}>
      {nodes.map((n) => (
        <div key={n.key} style={{ whiteSpace: "nowrap" }}>
          <span style={{ ...regs.annot, fontWeight: 700 }}>{n.label}</span>{" "}
          <span style={{ ...regs.value, fontWeight: 700 }}>{n.totalText}</span>
        </div>
      ))}
    </div>
  );
  const noScript =
    `[data-sankey] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` +
    `[data-sankey] [data-part="still"] { display: grid !important; }`;

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

      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div
          data-part="still"
          style={{ display: "none", position: "absolute", inset: 0, gridTemplateColumns: "max-content minmax(0, 1fr) max-content", gridTemplateRows: "minmax(0, 1fr)", columnGap: "6px" }}
        >
          <div style={{ position: "relative" }}>
            {sizer(sources)}
            {sources.map((n) => stillLabel(n, "source", stillLeft.get(n.key)!))}
          </div>
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%", minHeight: 0, overflow: "visible" }}>
            {stillRibbons.map((r) => (
              <path key={r.key} d={r.d} fill={r.fill} fillOpacity={r.opacity} />
            ))}
            {sources.map((n, i) => (
              <rect key={`s${n.key}`} x={0} width={9} y={stillLeft.get(n.key)!.y0} height={Math.max(1, stillLeft.get(n.key)!.h)} fill={railFill(n.key, i)} />
            ))}
            {targets.map((n) => (
              <rect key={`t${n.key}`} x={991} width={9} y={stillRight.get(n.key)!.y0} height={Math.max(1, stillRight.get(n.key)!.h)} fill={railFill(n.key, -1)} />
            ))}
          </svg>
          <div style={{ position: "relative" }}>
            {sizer(targets)}
            {targets.map((n) => stillLabel(n, "target", stillRight.get(n.key)!))}
          </div>
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

/**
 * Nine sources flowing into six countries' 2024 electricity, drawn as a sankey THROUGH the design
 * base and delivered as an interactive page.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT A TOOLTIP. A sankey's own difficulty is that a reader cannot
 * FOLLOW one path through the crossings — which source ends where, and what fraction of it survives
 * each split. A plate picks one path for the reader (the one in the title) and leaves the other eight
 * as a tangle. This page lets the reader pick: the chosen source's whole downstream lights, the rest
 * of the network recedes, the countries it never reaches go HOLLOW, and the path's own arithmetic is
 * written at both ends — how much left, how much arrived, what share of the receiving country it is,
 * and how much of the source the plate does not draw at all.
 *
 * `every-node-carries-its-own-total` — a sankey's promise is conservation, and a node that does not
 * print its own total is asking to be trusted rather than checked.
 *
 * `ribbons-are-translucent-so-crossings-are-honest` — RESTRICTED TO THE RECEDED FIELD, and said out
 * loud. Two receded ribbons crossing composite to a third, darker value (measured at 1,51:1 from the
 * single), so a crossing still reads as a crossing rather than as a stacking order nobody chose. The
 * traced path is laid at 0,95 and deliberately occludes: a path the reader asked to follow that goes
 * half-transparent at every crossing is a path they cannot follow.
 *
 * `a-band-too-thin-to-see-is-not-drawn-it-is-counted` — unchanged in form, made CHECKABLE per source
 * rather than aggregated: `trace.ts` refuses an option whose drawn segments plus its stated remainder
 * do not equal the total its node prints, in every state the control can produce.
 *
 * THE COLOURS ARE MEASURED HERE AND PASSED IN, never named inside the vocabulary. Three levels on one
 * ground is more than the ground-to-accent range can carry at the non-text floor — measured, at every
 * combination of the two opacities and the neutral's tint, the best a receded ribbon can do while the
 * lit path stays 3:1 clear of it is 1,98:1 against the ground. So the receded field is scaffolding and
 * says so; what is held to the floor is the lit path against the ground AND against everything it
 * crosses.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  traceCss,
  traceChromeCss,
  traceDestinationsForMarkup,
  traceNotesForMarkup,
  traceOptionsForMarkup,
  traceSlugOf,
  traceStatedForMarkup,
  type TraceDeclaration,
} from "../../skills/chart-web/assets/trace.ts";

export const FRAME = { width: 1000, height: 520 };
const NODE_W = 14;

/** This format's own scope selector, and the id prefix the trace's radios take. The two arguments
 *  `trace.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const TRACE_ID_PREFIX = "chart-trace";
/** How long the network takes to change hands. Honoured only under `prefers-reduced-motion:
 *  no-preference` — `trace.ts` puts the whole transition inside the query rather than overriding it
 *  back, so under `reduce` there is nothing to resolve. */
const FADE_MS = 180;

/** THE TWO OPACITIES, MEASURED. See the header: this pair is the one that keeps the lit path 3:1
 *  clear of the receded field in all three filed directions while giving a receded crossing the most
 *  separation from a single receded ribbon that the constraint leaves available. */
const LIT_OPACITY = 0.95;
const RECEDE_OPACITY = 0.5;
/** How far the neutral is mixed off the ground toward the ink. Solid on a node, halved on a ribbon. */
const RECEDE_TINT = 0.55;

export type Node = {
  key: string;
  /** The node's own key in the trace's vocabulary — a source key on the left, a country code on the
   *  right. Distinct from `key`, which is prefixed to keep the two columns' React keys apart. */
  ref: string;
  name: string;
  side: 0 | 1;
  y: number;
  h: number;
  label: string;
};
export type Ribbon = {
  key: string;
  /** The ORIGIN this ribbon leaves, in the trace's vocabulary. What lights it. */
  flow: string;
  from: string;
  to: string;
  y0: number;
  y1: number;
  w: number;
  detail: string;
};

export function DirectedSankeyWeb({
  nodes,
  ribbons,
  trace,
  remainder,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  nodes: Node[];
  ribbons: Ribbon[];
  trace: TraceDeclaration;
  remainder: string | null;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, options: { fontSize: number; fontWeight?: number; fontFamily?: string }) => number;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // ── the three fills, measured against the ground they are painted on ────────────────────────
  const lit =
    contrast(accent, ground) < NON_TEXT_CONTRAST_MIN
      ? (adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent)
      : accent;
  const neutral = mix(ground, ink, RECEDE_TINT);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // The lit path must clear the non-text floor against the ground AND against the receded field it
  // crosses — the ribbon it crosses being the thing a reader is told to distinguish it from. Both
  // are checked on the colour the page actually PAINTS, which for a translucent fill is the
  // composite and not the fill.
  const litOnGround = mix(ground, lit, LIT_OPACITY);
  const recedeOnGround = mix(ground, neutral, RECEDE_OPACITY);
  const litOnRecede = mix(recedeOnGround, lit, LIT_OPACITY);
  for (const [what, a, b] of [
    ["the traced path against the ground", litOnGround, ground],
    ["the traced path against a receded ribbon it crosses", litOnRecede, recedeOnGround],
    ["a traced source's node against the ground", lit, ground],
    ["a neutral node against the ground", neutral, ground],
  ] as const) {
    const ratio = contrast(a, b);
    if (ratio < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `${direction.id ?? "this direction"}: ${what} measures ${ratio.toFixed(2)}:1, under the ` +
          `${NON_TEXT_CONTRAST_MIN}:1 non-text floor — a path a reader was told to follow has to be ` +
          `visible where it crosses the network it was picked out of`,
      );
  }

  const leftX = 0;
  const rightX = FRAME.width - NODE_W;
  const ribbonPath = (r: Ribbon) => {
    const x0 = leftX + NODE_W;
    const x1 = rightX;
    const cx = (x0 + x1) / 2;
    return (
      `M ${x0} ${r.y0} C ${cx} ${r.y0}, ${cx} ${r.y1}, ${x1} ${r.y1} ` +
      `L ${x1} ${r.y1 + r.w} C ${cx} ${r.y1 + r.w}, ${cx} ${r.y0 + r.w}, ${x0} ${r.y0 + r.w} Z`
    );
  };

  // ── the trace, and the state the page ships in ──────────────────────────────────────────────
  // THE FIRST OPTION IS THE DEFAULT AND IT IS THE CLAIM (`trace.ts` says why there is no untouched
  // state). Its colours are written as SVG PRESENTATION ATTRIBUTES, which lose to every CSS rule
  // there is — so the generated stylesheet always wins, and a reader who somehow gets the markup
  // with no stylesheet at all still gets the claim rather than a monochrome tangle.
  const defaultKey = trace.options[0].key;
  const defaultReach = new Set(trace.options[0].segments.map((s) => s.to));
  const traceOptions = traceOptionsForMarkup(trace, TRACE_ID_PREFIX);
  const traceNotes = traceNotesForMarkup(trace);
  const traceStated = traceStatedForMarkup(trace);
  const traceDestinations = traceDestinationsForMarkup(trace);

  const nodeAt = new Map(nodes.map((n) => [`${n.side}:${n.ref}`, n]));
  const labelFont = { fontSize: 13, fontWeight: regs.axis.fontWeight as number, fontFamily: String(regs.axis.fontFamily) };
  /**
   * EVERY WORD INSIDE THE PLOT IS CASED IN THE GROUND, and it is not decoration.
   *
   * The labels sit over the ribbons — there is nowhere else on a sankey for them to sit — and the
   * traced path is laid at 0,95, which is the whole point of it. Ink over that composite measures
   * 2,4:1 in creme, well under the 4,5:1 text floor, so a country's own name became unreadable
   * exactly when the reader lit the path that reaches it. A ground-coloured stroke UNDER the fill
   * (`paint-order`) puts the ground back immediately around each glyph, so what the ink is measured
   * against is the ground — which `adjustToContrast` has already held to the floor — rather than
   * whatever ribbon happens to pass behind.
   */
  const cased = (width: number) => ({
    stroke: ground,
    strokeWidth: width,
    strokeLinejoin: "round" as const,
    paintOrder: "stroke fill" as const,
  });
  // `measureText` builds a probe SVG and puts this straight into a `font-family="…"` attribute, so a
  // CSS stack — quotes, commas and all — is not a family name there: it is a broken attribute, and
  // resvg refuses the whole document. The first family, unquoted, is the one it will actually lay
  // out in. (The rendered `<text>` keeps the whole stack; only the ruler takes the head of it.)
  const measureFont = { ...labelFont, fontFamily: labelFont.fontFamily.split(",")[0].replace(/"/g, "") };

  const css = [
    traceChromeCss({ scope: SCOPE }),
    traceCss(trace, {
      scope: SCOPE,
      idPrefix: TRACE_ID_PREFIX,
      lit: { fill: lit, opacity: LIT_OPACITY },
      recede: { fill: neutral, opacity: RECEDE_OPACITY, node: neutral },
      // A destination the path never reaches is hollowed rather than emptied: the rectangle stays,
      // measurable against the same column as every other country, and the dashes say "nothing from
      // this source arrives here" — which on this beat is the second half of the claim.
      hollow: { fill: "none", stroke: neutral, dash: "3 3", solid: neutral },
      fadeMs: FADE_MS,
    }),
  ].join("\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* The control's own stylesheet, generated at build time from the declaration — the same
          mechanism filter.ts narrows with and withdraw.ts subtracts with. No listener, no state. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <fieldset className="chart-trace">
        <legend>{trace.label}</legend>
        <div className="options">
          {traceOptions.map((option) => (
            <label key={option.slug} htmlFor={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-trace"
                defaultChecked={option.isDefault}
                aria-label={option.announce}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
          margin: "10px 0 0",
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {ribbons.map((r) => (
            <path
              key={r.key}
              data-flow={r.flow}
              d={ribbonPath(r)}
              fill={r.flow === defaultKey ? lit : neutral}
              fillOpacity={r.flow === defaultKey ? LIT_OPACITY : RECEDE_OPACITY}
            />
          ))}

          {nodes.map((n) => {
            const reached = n.side === 1 && defaultReach.has(n.ref);
            const hollow = n.side === 1 && !reached;
            return (
              <rect
                key={n.key}
                {...(n.side === 0 ? { "data-origin": n.ref } : { "data-dest": n.ref })}
                x={n.side === 0 ? leftX : rightX}
                y={n.y}
                width={NODE_W}
                height={Math.max(1, n.h)}
                fill={hollow ? "none" : n.side === 0 && n.ref === defaultKey ? lit : neutral}
                stroke={hollow ? neutral : undefined}
                strokeWidth={hollow ? 1 : undefined}
                strokeDasharray={hollow ? "3 3" : undefined}
              />
            );
          })}

          {ribbons.map((r) => {
            const x0 = leftX + NODE_W;
            const x1 = rightX;
            return (
              <circle
                key={`hit-${r.key}`}
                className="pt"
                cx={(x0 + x1) / 2}
                cy={(r.y0 + r.y1) / 2 + r.w / 2}
                r={Math.max(3, Math.min(9, r.w / 2))}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={r.detail}
                data-detail={r.detail}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />

          {/* Words inside the viewBox for the same reason the radar's are: this beat letterboxes
              rather than stretching, so an HTML overlay in percentages of the grid cell would not
              land on the drawing. */}
          {nodes.map((n) => (
            <text
              pointerEvents="none"
              key={`l-${n.key}`}
              x={n.side === 0 ? leftX + NODE_W + 8 : rightX - 8}
              y={n.y + n.h / 2}
              fill={label}
              {...cased(3)}
              fontFamily={labelFont.fontFamily}
              fontSize={labelFont.fontSize}
              fontWeight={labelFont.fontWeight}
              textAnchor={n.side === 0 ? "start" : "end"}
              dominantBaseline="middle"
            >
              {n.label}
            </text>
          ))}

          {/* THE PATH'S HEADLINE, ON THE SAME BASELINE AS THE ORIGIN'S OWN LABEL AND AFTER IT.
              Not on a line of its own: the shortest source node here is half a pixel tall, so a
              second line under its label would land on the next node's. Placed by measuring the
              label it follows, so it tracks a longer name rather than being nudged by hand. */}
          {traceStated.map((stated) => {
            const node = nodeAt.get(`0:${stated.key}`);
            if (!node) throw new Error(`the trace names an origin this plate does not draw: ${stated.key}`);
            const after = leftX + NODE_W + 8 + measure(node.label, measureFont) + 12;
            return (
              <text
                pointerEvents="none"
                key={`stated-${stated.slug}`}
                data-trace-stated={stated.slug}
                {...(stated.slug === traceSlugOf(defaultKey) ? {} : { display: "none" })}
                x={after}
                y={node.y + node.h / 2}
                fill={label}
                {...cased(2.5)}
                fontFamily={labelFont.fontFamily}
                fontSize={11}
                fontWeight={labelFont.fontWeight}
                textAnchor="start"
                dominantBaseline="middle"
              >
                {stated.text}
              </text>
            );
          })}

          {/* WHAT THE PATH IS WORTH WHERE IT LANDS, under the receiving country's own label. The
              reading a still can print for one country and not for six, and the half of the
              question a ribbon's thickness never answers. */}
          {traceDestinations.map((row) => {
            const node = nodeAt.get(`1:${row.to}`);
            if (!node) throw new Error(`the trace lands on a country this plate does not draw: ${row.to}`);
            return (
              <text
                pointerEvents="none"
                key={`share-${row.slug}-${row.to}`}
                data-dest-share={row.slug}
                {...(row.slug === traceSlugOf(defaultKey) ? {} : { display: "none" })}
                x={rightX - 8}
                y={node.y + node.h / 2 + 14}
                fill={label}
                {...cased(2.5)}
                fontFamily={labelFont.fontFamily}
                fontSize={11}
                fontWeight={labelFont.fontWeight}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {row.text}
              </text>
            );
          })}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the path's whole arithmetic, including what the
          plate does not draw. The default's is readable at rest, because the default is the claim. */}
      <div className="trace-notes" role="status">
        {traceNotes.map((note) => (
          <p data-trace-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      {remainder ? (
        <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{remainder}</p>
      ) : null}
      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}

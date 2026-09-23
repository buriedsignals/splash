/**
 * Nine electricity sources into six countries, drawn THROUGH the design base.
 *
 * The twelfth component in this tree, and the third of the nine forms the harvest reached with no
 * directed component. Its four publications are the ones that actually draw energy flows — LLNL,
 * the IEA, Eurostat, Carbon Brief — and between them they agree on four things this file does.
 *
 * `every-node-carries-its-own-total` (three publications) — a sankey has no axis, so a node that
 * does not print its quantity leaves the reader estimating areas, which is the thing this form is
 * worst at. Every node here carries its name and its total in one register, with no size hierarchy:
 * the bar does the ranking.
 *
 * `the-neutral-is-the-largest-area` (three publications, all measured — LLNL's grey at 11 % of the
 * picture, the IEA's `#A1A1A1` at 5.31 % against a largest hue at 4.25 %, Carbon Brief's 16 %
 * neutral against 1 % accent) — the accent goes on the one flow the headline is about and nothing
 * else. Nine source hues would spend the whole palette on furniture.
 *
 * `ribbons-are-translucent-so-crossings-are-honest` (two publications) — at partial alpha a crossing
 * darkens instead of hiding what is under it, and the picture stops depending on draw order to be
 * true. An opaque ribbon set is a picture whose truth is a property of the loop that drew it.
 *
 * `conservation-is-kept-visible` (two publications) — 54 flows are drawn because the data carries
 * 54 flows. The smallest is under a hundredth of a per cent of the total and is still a ribbon, at
 * the minimum width a ribbon can be seen at; what it loses is its label, not its existence.
 */

import { scaleLinear } from "d3-scale";
import { mix } from "#shared/chart-beat/colour.mjs";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Node = { key: string; label: string; total: number };
export type Flow = { from: string; to: string; value: number };

export function DirectedSankey({
  sources,
  targets,
  flows,
  tracked,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  sources: Node[];
  targets: Node[];
  flows: Flow[];
  tracked: { from: string; to: string };
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── header and footer ─────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  /** WHAT THE NODE LABELS OWE, AND WHY THEY GET IT FIRST. A sankey has no axis, so every node
   *  prints its own total — fifteen labels that cannot be dropped, spaced by the annot register's
   *  own band. Nine of them are on the source rail, and nine pitches is a hard floor on the plot's
   *  height.
   *
   *  Measured at 1080 x 1080 on 2026-09-23: the plate had no ladder at all, so the copy took what it
   *  liked and the nine source labels were pushed OUT THE TOP of a plot that could not hold them —
   *  « Éolien 268,2 » and « Solaire 127,0 » ended up level with the standfirst, and in `nocturne`,
   *  whose registers are largest, « SOLAIRE 127,0 » printed through « sont produits en France ».
   *  `spacedLabels` clamped its stack at the foot and nowhere else, so the overflow had only one way
   *  to go. The clamp is now at both ends and the copy is a ladder that gives way to the labels. */
  const labelPitchOf = () => bandOf(annot).ascent + bandOf(annot).descent + 3;
  const labelPitch = labelPitchOf();

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop =
      sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);
    const plotTop = limitsTop + limitLines.length * bodyLead + gapOf(annot, 1.1429);
    const plotBottom = readingTop - gapOf(annot, 1.1429);
    return {
      titleLines,
      limitLines,
      readingLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      plotTop,
      plotBottom,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  /** The taller rail decides: its labels have to fit between the plot's own bounds without either
   *  end being pushed past them. */
  const labelsOwe = (Math.max(sources.length, targets.length) - 1) * labelPitch;
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    const room = l.plotBottom - l.plotTop;
    if (room > best) best = room;
    if (room >= labelsOwe) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the rails ${best.toFixed(0)}px and ${Math.max(sources.length, targets.length)} ` +
        `node labels owe ${labelsOwe.toFixed(0)}px at ${width} x ${height}. A sankey has no axis, so ` +
        `a node that does not print its total leaves the reader estimating areas — drawing fewer ` +
        `nodes is the only honest cut.`,
    );
  const layout = fits.layout;
  const {
    titleLines,
    limitLines,
    readingLines,
    eyebrowBaseline,
    titleTop,
    limitsTop,
    readingTop,
    sourceTop,
    plotTop,
    plotBottom,
  } = layout;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · rails ${(plotBottom - plotTop).toFixed(0)}px, labels owe ${labelsOwe.toFixed(0)}px`,
  );

  const labelled = on("every-node-carries-its-own-total");
  /** A node's label is `Name 380,5` on one line, in one register — Carbon Brief's arrangement, with
   *  Eurostat's confirmation that no node's label is set larger than another's. */
  const labelOf = (n: Node) => `${n.label}  ${format(n.total)}`;
  const leftRoom = labelled
    ? Math.max(...sources.map((n) => widthOf(set(labelOf(n), annot), annot))) + 12
    : 0;
  const rightRoom = labelled
    ? Math.max(...targets.map((n) => widthOf(set(labelOf(n), annot), annot))) + 12
    : 0;

  const RAIL = 9;
  const leftRail = PAD + leftRoom;
  const rightRail = width - PAD - rightRoom - RAIL;

  const total = sources.reduce((sum, n) => sum + n.total, 0);
  const GAP = 7;
  const stack = (nodes: Node[]) => {
    const room = plotBottom - plotTop - GAP * (nodes.length - 1);
    const scale = room / total;
    let y = plotTop;
    return nodes.map((n) => {
      const h = n.total * scale;
      const box = { ...n, y0: y, y1: y + h, h };
      y += h + GAP;
      return box;
    });
  };
  const left = stack(sources);
  const right = stack(targets);
  const byKey = (boxes: ReturnType<typeof stack>) => new Map(boxes.map((b) => [b.key, b]));
  const leftBy = byKey(left);
  const rightBy = byKey(right);

  /** CONSERVATION IS DRAWN. Every flow the data carries gets a ribbon, stacked in the rail's own
   *  order on both ends, so the ribbons out of a node add up to exactly the node. A flow under a
   *  pixel keeps a minimum width — what a hairline loses is its label, never its existence. */
  const MIN_RIBBON = 0.6;
  const offsets = { left: new Map<string, number>(), right: new Map<string, number>() };
  const scale = (plotBottom - plotTop - GAP * (Math.max(sources.length, targets.length) - 1)) / total;
  const ribbons = flows
    .slice()
    .sort(
      (a, b) =>
        sources.findIndex((s) => s.key === a.from) - sources.findIndex((s) => s.key === b.from) ||
        targets.findIndex((t) => t.key === a.to) - targets.findIndex((t) => t.key === b.to),
    )
    .map((f) => {
      const from = leftBy.get(f.from)!;
      const to = rightBy.get(f.to)!;
      const h = Math.max(f.value * scale, MIN_RIBBON);
      const ay = from.y0 + (offsets.left.get(f.from) ?? 0);
      const by = to.y0 + (offsets.right.get(f.to) ?? 0);
      offsets.left.set(f.from, (offsets.left.get(f.from) ?? 0) + h);
      offsets.right.set(f.to, (offsets.right.get(f.to) ?? 0) + h);
      const x0 = leftRail + RAIL;
      const x1 = rightRail;
      const mid = (x0 + x1) / 2;
      return {
        ...f,
        isTracked: f.from === tracked.from && f.to === tracked.to,
        d:
          `M${x0} ${ay} C${mid} ${ay} ${mid} ${by} ${x1} ${by} ` +
          `L${x1} ${by + h} C${mid} ${by + h} ${mid} ${ay + h} ${x0} ${ay + h} Z`,
      };
    });

  /** LABELS ARE SPACED, NOT DROPPED. `Autres renouv.` is 1.8 TWh — 0.4px of rail — and its label
   *  sits on `Bioénergie`'s if each one is centred on its own node. `conservation-is-kept-visible`
   *  says a flow too small to draw is still drawn and still labelled, so the labels are pushed
   *  apart instead: one pass down enforcing the register's own band as the minimum pitch, one pass
   *  up to pull the overflow back inside the plot. Order is preserved, which is what lets a label
   *  off its node's centre still name that node. */
  const spacedLabels = (boxes: ReturnType<typeof stack>) => {
    const pitch = labelPitch;
    const placed = boxes.map((b) => ({ node: b, y: (b.y0 + b.y1) / 2 }));
    for (let i = 1; i < placed.length; i++)
      placed[i].y = Math.max(placed[i].y, placed[i - 1].y + pitch);
    const overflow = placed[placed.length - 1].y - plotBottom;
    if (overflow > 0) {
      placed[placed.length - 1].y = plotBottom;
      for (let i = placed.length - 2; i >= 0; i--)
        placed[i].y = Math.min(placed[i].y, placed[i + 1].y - pitch);
    }
    /** THE STACK IS CLAMPED AT BOTH ENDS, OR THE OVERFLOW ONLY EVER GOES UP. The pass above pulls
     *  the stack back inside the foot; with no matching bound at the head, the first labels simply
     *  left the plot and landed in the standfirst. The ladder is what makes this unreachable, so
     *  reaching it means a rung was missed rather than that a label should be moved quietly. */
    if (placed[0].y < plotTop - 0.5)
      throw new Error(
        `the node labels do not fit their rail: ${placed.length} labels need ` +
          `${((placed.length - 1) * pitch).toFixed(0)}px between baselines and the rail allows ` +
          `${(plotBottom - plotTop).toFixed(0)}px. Spend a copy rung, or draw fewer nodes.`,
      );
    return placed;
  };

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  /** ONE ORDERED RAMP INSIDE THE NEUTRAL FIELD — the marimekko's correction, applied here.
   *
   *  Every ribbon was one muted grey, on the strength of `the-neutral-is-the-largest-area`: three
   *  publications, all measured, all drawing this same construction. That rule stands and this does
   *  not break it — the field is still neutral-dominant and the accent is still spent on one flow.
   *  What changes is that the nine sources are ORDERED (renewables, nuclear, fossil), and an ordered
   *  set can be told apart by a sequential ramp instead of being one undifferentiated mass. The
   *  ramp's poles are the furniture's own muted and a low tint of the direction's accent, so nothing
   *  on the plate is a colour the direction did not set, and the tracked flow — at full accent — is
   *  still the only saturated thing on it. */
  const rampFrom = muted;
  const rampTo = mix(direction.accent, direction.ground, 0.62);
  const sourceStep = new Map(sources.map((n, i) => [n.key, sources.length > 1 ? i / (sources.length - 1) : 0]));
  const ribbonFill = (from: string) => mix(rampFrom, rampTo, sourceStep.get(from) ?? 0);
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const isTrackedNode = (key: string) => key === tracked.from || key === tracked.to;
  /** Two publications draw at 0.6 and thereabouts; below that a single ribbon disappears, above it
   *  a crossing stops resolving. */
  const RIBBON_ALPHA = on("ribbons-are-translucent-so-crossings-are-honest") ? 0.55 : 1;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={readingTop + i * bodyLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {ribbons.map((f) => (
        <path
          key={`${f.from}-${f.to}`}
          d={f.d}
          fill={f.isTracked ? direction.accent : ribbonFill(f.from)}
          fillOpacity={f.isTracked ? Math.min(RIBBON_ALPHA + 0.25, 1) : RIBBON_ALPHA}
        />
      ))}

      {[...left.map((n) => ({ n, x: leftRail })), ...right.map((n) => ({ n, x: rightRail }))].map(
        ({ n, x }) => (
          <rect
            key={`rail-${x}-${n.key}`}
            x={x}
            y={n.y0}
            width={RAIL}
            height={Math.max(n.h, 1)}
            fill={
              isTrackedNode(n.key)
                ? direction.accent
                : sourceStep.has(n.key)
                  ? adjustToContrast(ribbonFill(n.key), direction.ground, NON_TEXT_CONTRAST_MIN) ??
                    mutedInk
                  : mutedInk
            }
          />
        ),
      )}

      {labelled &&
        spacedLabels(left).map(({ node: n, y }) => (
          <text
            key={`ll-${n.key}`}
            x={leftRail - 8}
            y={y + (annotBand.ascent - annotBand.descent) / 2}
            textAnchor="end"
            {...line(annot)}
            fill={isTrackedNode(n.key) ? accentInk : annot.fill}
            fontWeight={isTrackedNode(n.key) ? 700 : annot.fontWeight}
          >
            {set(labelOf(n), annot)}
          </text>
        ))}
      {labelled &&
        spacedLabels(right).map(({ node: n, y }) => (
          <text
            key={`rl-${n.key}`}
            x={rightRail + RAIL + 8}
            y={y + (annotBand.ascent - annotBand.descent) / 2}
            {...line(annot)}
            fill={isTrackedNode(n.key) ? accentInk : annot.fill}
            fontWeight={isTrackedNode(n.key) ? 700 : annot.fontWeight}
          >
            {set(labelOf(n), annot)}
          </text>
        ))}
    </svg>
  );
}

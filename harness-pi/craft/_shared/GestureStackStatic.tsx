/**
 * THE STACK FAMILY'S STILL PLATE — stacked-bar, diverging-stacked-bar-likert and waterfall-bridge as variants of one
 * drawing, driven by the composed gestures (`gesture-stack-static.mjs`) on the family's geometry
 * (`gesture-family-stack.mjs`). Forked from the three per-type components (static/<slug>/Directed*.tsx), keeping
 * their doctrine and dropping their fixed staging:
 *
 * - `a-segment-not-starting-at-zero-carries-its-own-number`: a segment prints its own value inside itself when it
 *   fits; only the first segment of a stack can be measured by eye.
 * - `the-stack-gives-back-the-total-it-hides`: a stacked bar prints its total past its end, in the value register.
 * - `two-states-of-one-measure-are-one-hue-at-two-chromas`: the parts of a stacked bar are one measure, one ramp of
 *   the direction's accent. A Likert's two sides are two ramps (muted to ink on the left, pale accent to accent on
 *   the right, `the-ramp-deepens-outward`) with the neutral straddling the centre. A bridge draws increases in the
 *   accent, decreases in the second recorded ink, and its opening and closing levels in the furniture's muted.
 * - Furniture from the ground (deriveFurniture), registers from the direction, direct labels: the key is a row of
 *   words in their own fill, not a legend box.
 *
 * Rows that do not fit are dropped from the bottom of the drawn order, never the ones a gesture acts on, and the
 * plate says how many are drawn (R8).
 */
import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

type Note = {
  index: number;
  do: string;
  anchor: "mark" | "span";
  segs: string[];
  bars: string[];
  text: string;
};
export type StackPlate = {
  order: string[];
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: Note[];
  brackets: {
    index: number;
    segs: string[];
    span: string[];
    bars: string[];
    whole: boolean;
    value: number;
    note?: string;
  }[];
  copies: {
    index: number;
    onto: string[];
    bars: string[];
    from: number;
    to: number;
    value: number;
  }[];
  references: { index: number; value: number; note?: string }[];
  count: { index: number; value: number; text: string } | null;
  keep: string[];
  reveal?: number;
};

type Props = {
  variant: "stacked-bar" | "diverging-stacked-bar-likert" | "waterfall-bridge";
  stack: any;
  plate: StackPlate;
  format: (v: number) => string;
  title: string | string[];
  limits: string | string[];
  source: string;
  alt: string | ((drawn: string[]) => string);
  eyebrow: string;
  unit?: string;
  /** Likert: the words over each side and the neutral. */
  sideNames?: { left?: string; right?: string; centre?: string };
  scope?: (shown: number, all: number) => string;
  direction: any;
  /** Waterfall: the decrease ink (the second recorded accent, or one derived from the first). */
  decreaseInk?: string;
  frame: { width: number; height: number };
};

export function GestureStackStatic(props: Props) {
  const { variant, stack, plate, format, source, eyebrow, direction, frame } =
    props;
  const { width, height } = frame;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const reg = (name: string) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");
  const set = (text: string, r: any) => applyCase(String(text), r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(set(text, r), sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, String(text).length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));
  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of set(text, r).split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    return out;
  }
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const inkOn = (fill: string) =>
    adjustToContrast(ink, fill, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const axisBand = bandOf(axis);
  const mid = (band: any) => (band.ascent - band.descent) / 2;
  const reveal = plate.reveal ?? 1;

  // ── fills ─────────────────────────────────────────────────────────────────────────────────────
  const parts: string[] = stack.parts;
  const fillOf = (bar: string, part: string): string => {
    if (variant === "stacked-bar") {
      const i = parts.indexOf(part);
      const t = parts.length === 1 ? 0 : 1 - i / (parts.length - 1);
      return mix(direction.accent, direction.ground, 0.62 * t);
    }
    if (variant === "diverging-stacked-bar-likert") {
      const side = stack.sideOf(part);
      if (side === "centre") return mix(direction.ground, ink, 0.14);
      const list: string[] = side === "left" ? stack.left : stack.right;
      const t = (list.indexOf(part) + 1) / list.length;
      return side === "left"
        ? mix(mix(muted, direction.ground, 0.2), ink, t * 0.6)
        : mix(
            mix(direction.accent, direction.ground, 0.7),
            direction.accent,
            t,
          );
    }
    const i = stack.names.indexOf(bar);
    if (i === 0) return muted;
    return stack.valueOf(bar, bar) >= 0
      ? direction.accent
      : (props.decreaseInk ?? mix(ink, direction.ground, 0.35));
  };

  // ── header, footer, the ladder ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleForms = [props.title].flat().filter(Boolean);
  const limitForms = [props.limits].flat().filter(Boolean);
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const sourceLines = wrap(source, column, body);
  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const rowsLayout = variant !== "waterfall-bridge";
  // The key: every part's word in its own fill, flowed over as many lines as it needs.
  const keyParts: { label: string; fill: string }[] = !rowsLayout
    ? []
    : (variant === "diverging-stacked-bar-likert"
        ? [...[...stack.left].reverse(), ...(stack.centre ? [stack.centre] : []), ...stack.right]
        : parts
      ).map((p: string) => ({ label: p, fill: fillOf(stack.names[0], p) }));
  const swatch = annotBand.ascent * 0.8;
  const keyLines: { label: string; fill: string; at: number }[][] = [];
  {
    let lineAt = 0;
    let current: { label: string; fill: string; at: number }[] = [];
    for (const k of keyParts) {
      const w = swatch + 6 + widthOf(k.label, annot) + 16;
      if (current.length && lineAt + w > column * 0.72) {
        keyLines.push(current);
        current = [];
        lineAt = 0;
      }
      current.push({ ...k, at: lineAt });
      lineAt += w;
    }
    if (current.length) keyLines.push(current);
  }
  const sidesRoom = variant === "diverging-stacked-bar-likert" && props.sideNames ? annotLead : 0;
  const keyRoom = Math.max(1, keyLines.length) * annotLead + sidesRoom + 12;
  const all: string[] = plate.order;
  const rowOwe = annotBand.ascent + annotBand.descent + 8;

  // Notes: rows draw them in a lane right of the plot; a bridge draws them in a band over its columns.
  const markNotes = plate.notes.filter((n) => n.anchor === "mark");
  const spanNotes = plate.notes.filter((n) => n.anchor === "span");
  const laneNotes = [
    ...markNotes,
    ...plate.brackets
      .filter((b) => b.note)
      .map((b) => ({
        index: b.index,
        do: "bracket",
        anchor: "mark" as const,
        segs: b.segs,
        bars: b.bars,
        text: b.note!,
      })),
  ];
  const headNotes = [
    ...(plate.count ? [{ text: plate.count.text, strong: true }] : []),
    ...spanNotes.map((n) => ({ text: n.text, strong: false })),
    ...plate.references
      .filter((r) => r.note)
      .map((r) => ({ text: r.note!, strong: false })),
  ];
  const lane =
    rowsLayout && laneNotes.length
      ? Math.min(250, Math.max(150, column * 0.27))
      : 0;
  const headLines = (w: number) =>
    headNotes.flatMap((n) =>
      wrap(n.text, w, n.strong ? value : annot).map((t) => ({
        t,
        strong: n.strong,
      })),
    );
  const bandNotes = rowsLayout
    ? []
    : markNotes.flatMap((n) => wrap(n.text, column, annot));

  const layoutFor = (t: number, l: number) => {
    const titleLines = wrap(titleForms[t], column, display);
    const limitLines = l < 0 ? [] : wrap(limitForms[l], column, body);
    const limitsTop =
      titleTop +
      (titleLines.length - 1) * titleLead +
      gapOf(body, 0.4828) +
      body.fontSize;
    const heads = headLines(column);
    const headTop =
      limitsTop +
      Math.max(0, limitLines.length - 1) * bodyLead +
      (limitLines.length ? bodyLead * 0.9 : 0);
    const headBottom =
      headTop + heads.length * annotLead + (heads.length ? 4 : 0);
    const bandTop = headBottom;
    const bandBottom =
      bandTop + bandNotes.length * annotLead + (bandNotes.length ? 6 : 0);
    const top = bandBottom + keyRoom;
    const bottom =
      sourceTop -
      bodyLead -
      (rowsLayout ? bodyLead + 6 : axisBand.ascent + axisBand.descent + annotLead * 2 + 8);
    return {
      titleLines,
      limitLines,
      limitsTop,
      heads,
      headTop,
      bandTop,
      top,
      bottom,
    };
  };
  const rungs: { t: number; l: number }[] = [];
  for (let t = 0; t < titleForms.length; t++) {
    for (let l = 0; l < limitForms.length; l++) rungs.push({ t, l });
    rungs.push({ t, l: -1 });
  }
  const room = (L: ReturnType<typeof layoutFor>) =>
    rowsLayout
      ? Math.floor((L.bottom - L.top) / rowOwe)
      : Math.floor((L.bottom - L.top) / 60) * 1000;
  let chosen = layoutFor(rungs[0].t, rungs[0].l);
  for (const r of rungs) {
    const L = layoutFor(r.t, r.l);
    chosen = L;
    if (room(L) >= all.length) break;
  }
  const layout = chosen;
  // R8: the rows that do not fit leave from the bottom of the drawn order; a row a gesture acts on stays.
  const capacity = Math.max(1, room(layout));
  let drawn = all;
  if (rowsLayout && all.length > capacity) {
    const keep = new Set(plate.keep);
    const kept = all.filter((b) => keep.has(b)).slice(0, capacity);
    const fill = all
      .filter((b) => !keep.has(b))
      .slice(0, Math.max(0, capacity - kept.length));
    drawn = all.filter((b) => kept.includes(b) || fill.includes(b));
  }
  const scopeLine =
    drawn.length < all.length
      ? (props.scope ?? ((s: number, a: number) => `${s} / ${a}`))(
          drawn.length,
          all.length,
        )
      : null;
  const altText =
    typeof props.alt === "function" ? props.alt(drawn) : props.alt;

  // ── the value axis: one for every state, never moved by a gesture ─────────────────────────────
  const [d0, d1] = stack.domain as [number, number];
  const copyEnds = plate.copies.map((c) => c.to);
  const refValues = plate.references.map((r) => r.value);
  const lo = Math.min(d0, ...refValues);
  const hi = Math.max(d1, ...copyEnds, ...refValues);
  const domain: [number, number] =
    variant === "diverging-stacked-bar-likert"
      ? [-Math.max(-lo, hi), Math.max(-lo, hi)]
      : [lo, hi];

  const els: any[] = [];
  const ringStroke = ink;

  if (rowsLayout) {
    const nameRoom = Math.max(...drawn.map((b) => widthOf(b, annot))) + 12;
    const totalRoom =
      variant === "stacked-bar"
        ? Math.max(
            ...drawn.map((b) => widthOf(format(stack.whole(b)), value)),
          ) + 14
        : Math.max(
            ...drawn.map((b) =>
              widthOf(format(stack.sideTotal(b, "right")), axis),
            ),
          ) + 10;
    const leftRoom =
      variant === "diverging-stacked-bar-likert"
        ? Math.max(
            ...drawn.map((b) =>
              widthOf(format(stack.sideTotal(b, "left")), axis),
            ),
          ) + 10
        : 0;
    const plotLeft = PAD + nameRoom + leftRoom;
    const plotRight = width - PAD - totalRoom - (lane ? lane + 18 : 0);
    const x = scaleLinear().domain(domain).range([plotLeft, plotRight]);
    const pitch = Math.min(
      (layout.bottom - layout.top) / drawn.length,
      rowOwe * 2.2,
    );
    const barH = Math.min(pitch - 6, annotBand.ascent + annotBand.descent + 10);
    const yOf = (b: string) =>
      layout.top + drawn.indexOf(b) * pitch + pitch / 2;

    // The key: every part's word in its own fill, over the bars it names; the side names above it.
    const keyTop = layout.top - keyRoom + 4;
    const keyY = keyTop + sidesRoom + annotBand.ascent;
    keyLines.forEach((items, li) =>
      items.forEach((k) => {
        const y = keyY + li * annotLead;
        els.push(<rect key={`ks${k.label}`} x={plotLeft + k.at} y={y - swatch} width={swatch} height={swatch} fill={k.fill} />);
        els.push(
          <text key={`kt${k.label}`} x={plotLeft + k.at + swatch + 6} y={y} {...line(annot)} fill={adjustToContrast(k.fill, direction.ground, TEXT_CONTRAST_MIN)} fontWeight={700}>
            {set(k.label, annot)}
          </text>,
        );
      }),
    );
    if (sidesRoom) {
      const yS = keyTop + axisBand.ascent;
      if (props.sideNames!.left)
        els.push(
          <text key="sl" x={x(0) - 6} y={yS} textAnchor="end" {...line(axis)} fill={mutedInk}>
            {set(`← ${props.sideNames!.left}`, axis)}
          </text>,
        );
      if (props.sideNames!.right)
        els.push(
          <text key="sr" x={x(0) + 6} y={yS} {...line(axis)} fill={mutedInk}>
            {set(`${props.sideNames!.right} →`, axis)}
          </text>,
        );
    }
    if (props.unit)
      els.push(
        <text
          key="unit"
          x={plotLeft + (keyLines.at(-1) ?? []).reduce((w, k) => Math.max(w, k.at + swatch + 6 + widthOf(k.label, annot)), 0) + 18}
          y={keyY + Math.max(0, keyLines.length - 1) * annotLead}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(props.unit, axis)}
        </text>,
      );
    if (variant === "diverging-stacked-bar-likert" || d0 < 0)
      els.push(
        <line
          key="zero"
          x1={x(0)}
          x2={x(0)}
          y1={layout.top - 4}
          y2={layout.top + drawn.length * pitch}
          stroke={grid}
          strokeWidth={1}
        />,
      );

    drawn.forEach((b) => {
      const y = yOf(b);
      const y0 = y - barH / 2;
      const thread = plate.accent.includes(b);
      const back = plate.stepBack.includes(b);
      const g: any[] = [];
      g.push(
        <text
          key="n"
          x={PAD + nameRoom - 10}
          y={y + mid(annotBand)}
          textAnchor="end"
          {...line(annot)}
          fill={thread ? accentInk : mutedInk}
          fontWeight={thread ? 700 : annot.fontWeight}
        >
          {set(b, annot)}
        </text>,
      );
      for (const p of stack.partsOf(b)) {
        const [f, t] = stack.segment(b, p);
        const shown = stack.shownOf(stack.markName(b, p), reveal);
        if (shown <= 0 || t === f) continue;
        const xa = x(f);
        const xb = x(f) + (x(t) - x(f)) * shown;
        const fill = fillOf(b, p);
        g.push(
          <rect
            key={`s${p}`}
            x={xa}
            y={y0}
            width={Math.max(0, xb - xa)}
            height={barH}
            fill={fill}
          />,
        );
        const label = format(Math.abs(stack.valueOf(b, p)));
        if (shown >= 1 && widthOf(label, annot) + 8 <= xb - xa)
          g.push(
            <text
              key={`v${p}`}
              x={(xa + xb) / 2}
              y={y + mid(annotBand)}
              textAnchor="middle"
              {...line(annot)}
              fill={inkOn(fill)}
            >
              {set(label, annot)}
            </text>,
          );
        if (plate.rings.includes(stack.markName(b, p)))
          g.push(
            <rect
              key={`r${p}`}
              x={xa - 2}
              y={y0 - 2}
              width={xb - xa + 4}
              height={barH + 4}
              fill="none"
              stroke={ringStroke}
              strokeWidth={1.6}
            />,
          );
      }
      if (plate.rings.includes(b)) {
        const [f, t] = stack.unit(
          stack.partsOf(b).map((p: string) => stack.markName(b, p)),
        ).extent;
        g.push(
          <rect
            key="ring"
            x={x(f) - 3}
            y={y0 - 3}
            width={x(t) - x(f) + 6}
            height={barH + 6}
            fill="none"
            stroke={ringStroke}
            strokeWidth={1.6}
          />,
        );
      }
      if (variant === "stacked-bar") {
        const [, t] = stack.unit(parts.map((p) => stack.markName(b, p))).extent;
        g.push(
          <text
            key="tot"
            x={x(t) + 8}
            y={y + mid(valueBand)}
            {...line(value)}
            fill={thread ? accentInk : mutedInk}
            fontWeight={thread ? 700 : value.fontWeight}
          >
            {set(format(stack.whole(b)), value)}
          </text>,
        );
      } else {
        const ext = stack.unit(parts.map((p) => stack.markName(b, p))).extent;
        g.push(
          <text
            key="lt"
            x={x(ext[0]) - 6}
            y={y + mid(axisBand)}
            textAnchor="end"
            {...line(axis)}
            fill={thread ? accentInk : mutedInk}
          >
            {set(format(stack.sideTotal(b, "left")), axis)}
          </text>,
        );
        g.push(
          <text
            key="rt"
            x={x(ext[1]) + 6}
            y={y + mid(axisBand)}
            {...line(axis)}
            fill={thread ? accentInk : mutedInk}
          >
            {set(format(stack.sideTotal(b, "right")), axis)}
          </text>,
        );
      }
      // A compare's copy: the compared length laid from where the subject starts, under the subject's bar.
      for (const c of plate.copies.filter(
        (c) => c.bars.length === 1 && c.bars[0] === b,
      )) {
        const yc = y0 + barH + 2;
        g.push(<rect key={`c${c.index}`} x={x(c.from)} y={yc} width={Math.max(1, x(c.to) - x(c.from))} height={3} fill={ink} />);
        g.push(<line key={`ct${c.index}`} x1={x(c.to)} x2={x(c.to)} y1={y0 + barH - 4} y2={yc + 7} stroke={ink} strokeWidth={1.4} />);
      }
      // A bracket inside one bar: over the segments it spans, just above the bar.
      for (const k of plate.brackets.filter(
        (k) => k.bars.length === 1 && k.bars[0] === b,
      )) {
        const [f, t] = stack.unit(k.whole ? k.span : k.segs).extent;
        const yb = y0 - 4;
        g.push(
          <path
            key={`b${k.index}`}
            d={`M${x(f)},${yb + 3}V${yb}H${x(t)}V${yb + 3}`}
            fill="none"
            stroke={ink}
            strokeWidth={1.2}
          />,
        );
      }
      els.push(
        <g key={`bar-${b}`} opacity={back ? 0.3 : 1}>
          {g}
        </g>,
      );
    });

    // A bracket over several bars: a spine beside the plot spanning their rows.
    const spineX = plotRight + totalRoom + 6;
    plate.brackets
      .filter((k) => k.bars.length > 1)
      .forEach((k) => {
        const ys = k.bars.filter((b) => drawn.includes(b)).map(yOf);
        if (!ys.length) return;
        const [ya, yb] = [
          Math.min(...ys) - barH / 2,
          Math.max(...ys) + barH / 2,
        ];
        els.push(
          <path
            key={`B${k.index}`}
            d={`M${spineX - 5},${ya}H${spineX}V${yb}H${spineX - 5}`}
            fill="none"
            stroke={ink}
            strokeWidth={1.2}
          />,
        );
      });
    // References: a rule across every row at the stated value.
    plate.references.forEach((r) =>
      els.push(
        <line
          key={`ref${r.index}`}
          x1={x(r.value)}
          x2={x(r.value)}
          y1={layout.top - 6}
          y2={layout.top + drawn.length * pitch}
          stroke={ink}
          strokeWidth={1}
          strokeDasharray="4 3"
        />,
      ),
    );
    // The lane: each note at its bars' height, pushed down where it would meet the one above.
    if (lane) {
      const laneX = width - PAD - lane;
      let floor = layout.top - keyRoom;
      laneNotes
        .map((n) => {
          const ys = n.bars.filter((b) => drawn.includes(b)).map(yOf);
          return {
            n,
            y: ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : layout.top,
            lines: wrap(n.text, lane, annot),
          };
        })
        .sort((a, b) => a.y - b.y)
        .forEach(({ n, y, lines }, k) => {
          const h = lines.length * annotLead;
          let top = Math.max(
            y - h / 2 + annotBand.ascent / 2,
            floor + annotBand.ascent,
          );
          floor = top + (lines.length - 1) * annotLead + annotBand.descent + 6;
          const strong = n.bars.some((b) => plate.accent.includes(b));
          lines.forEach((t, j) =>
            els.push(
              <text
                key={`ln${n.index}-${j}`}
                x={laneX}
                y={top + j * annotLead}
                {...line(annot)}
                fill={strong ? accentInk : ink}
              >
                {t}
              </text>,
            ),
          );
          // A leader only when the note had to move off its bars' height.
          if (Math.abs(top - annotBand.ascent / 2 - y) > annotLead * 0.6)
          els.push(
            <line
              key={`ll${n.index}-${k}`}
              x1={laneX - 14}
              x2={laneX - 4}
              y1={y}
              y2={top - annotBand.ascent / 2}
              stroke={mutedInk}
              strokeWidth={0.8}
            />,
          );
        });
    }
  } else {
    // ── the bridge: columns left to right, the closing level last ─────────────────────────────
    const steps: string[] = stack.names;
    const cols = [...steps, stack.closing.name];
    const plotLeft = PAD;
    const plotRight = width - PAD;
    const slot = (plotRight - plotLeft) / cols.length;
    const colW = slot * 0.62;
    // A bracket rides over the value labels of the steps it spans, with its note above it: room for both.
    const bracketRoom = plate.brackets.length ? valueBand.ascent + annotLead * 2 + 16 : valueBand.ascent + 8;
    const y = scaleLinear().domain(domain).range([layout.bottom, layout.top + bracketRoom]);
    const xOf = (i: number) => plotLeft + i * slot + (slot - colW) / 2;
    els.push(
      <line
        key="base"
        x1={plotLeft}
        x2={plotRight}
        y1={y(0)}
        y2={y(0)}
        stroke={grid}
        strokeWidth={1}
      />,
    );
    cols.forEach((b, i) => {
      const closingCol = i === cols.length - 1;
      const [f, t] = closingCol
        ? [Math.min(0, stack.closing.value), Math.max(0, stack.closing.value)]
        : stack.segment(b, b);
      const shown = closingCol
        ? reveal >= 1
          ? 1
          : 0
        : stack.shownOf(b, reveal);
      const back = plate.stepBack.includes(b);
      const ringed = plate.rings.includes(b) || plate.accent.includes(b);
      const v = closingCol ? stack.closing.value : stack.valueOf(b, b);
      const fill = closingCol ? muted : fillOf(b, b);
      const xa = xOf(i);
      const g: any[] = [];
      if (shown > 0) {
        const grow = i === 0 || closingCol || v >= 0;
        const top = grow ? y(f) - (y(f) - y(t)) * shown : y(t);
        const h = (y(f) - y(t)) * shown;
        g.push(
          <rect
            key="c"
            x={xa}
            y={grow ? top : y(t)}
            width={colW}
            height={Math.max(0.5, h)}
            fill={fill}
          />,
        );
        if (shown >= 1) {
          const label =
            i === 0 || closingCol
              ? format(v)
              : `${v >= 0 ? "+" : "−"}${format(Math.abs(v))}`;
          g.push(
            <text
              key="v"
              x={xa + colW / 2}
              y={y(t) - 6}
              textAnchor="middle"
              {...line(value)}
              fill={ringed ? accentInk : mutedInk}
              fontWeight={ringed ? 700 : value.fontWeight}
            >
              {set(label, value)}
            </text>,
          );
        }
        // The connector: the running level carried to the next column.
        if (i < cols.length - 1 && shown >= 1) {
          const level = stack.levelAfter(b);
          g.push(
            <line
              key="k"
              x1={xa + colW}
              x2={xOf(i + 1)}
              y1={y(level)}
              y2={y(level)}
              stroke={mutedInk}
              strokeWidth={0.8}
              strokeDasharray="2 2"
            />,
          );
        }
      }
      if (ringed)
        g.push(
          <rect
            key="r"
            x={xa - 3}
            y={y(t) - 3}
            width={colW + 6}
            height={y(f) - y(t) + 6}
            fill="none"
            stroke={ink}
            strokeWidth={1.6}
          />,
        );
      const nameLines = wrap(b, slot - 6, axis);
      nameLines.slice(0, 2).forEach((t2, j) =>
        g.push(
          <text
            key={`n${j}`}
            x={xa + colW / 2}
            y={layout.bottom + 6 + axisBand.ascent + j * leadOf(axis)}
            textAnchor="middle"
            {...line(axis)}
            fill={ringed ? accentInk : mutedInk}
            fontWeight={ringed ? 700 : axis.fontWeight}
          >
            {t2}
          </text>,
        ),
      );
      for (const c of plate.copies.filter(
        (c) => c.onto.length === 1 && c.onto[0] === b,
      )) {
        // The compared step's length, laid from where this step starts, beside it.
        const s0 = v >= 0 ? f : t;
        const end = v >= 0 ? s0 + Math.abs(c.value) : s0 - Math.abs(c.value);
        g.push(
          <rect
            key={`cp${c.index}`}
            x={xa + colW + 2}
            y={Math.min(y(s0), y(end))}
            width={Math.max(3, slot * 0.08)}
            height={Math.abs(y(s0) - y(end))}
            fill={direction.ground}
            stroke={ink}
            strokeWidth={1.4}
          />,
        );
      }
      els.push(
        <g key={`col-${b}`} opacity={back ? 0.3 : 1}>
          {g}
        </g>,
      );
    });
    plate.brackets.forEach((k) => {
      const idx = k.segs
        .map((m) => steps.indexOf(stack.barOf(m)))
        .filter((i) => i >= 0);
      if (!idx.length) return;
      const [a, b] = [Math.min(...idx), Math.max(...idx)];
      const tops = steps.slice(a, b + 1).map((s2) => y(stack.segment(s2, s2)[1]));
      const yb = Math.min(...tops) - valueBand.ascent - 14;
      els.push(<path key={`B${k.index}`} d={`M${xOf(a)},${yb + 5}V${yb}H${xOf(b) + colW}V${yb + 5}`} fill="none" stroke={ink} strokeWidth={1.2} />);
      if (k.note)
        wrap(k.note, (xOf(b) + colW - xOf(a)) * 1.2, annot)
          .reverse()
          .forEach((t2, j) =>
            els.push(
              <text key={`Bn${k.index}-${j}`} x={(xOf(a) + xOf(b) + colW) / 2} y={yb - 6 - j * annotLead} textAnchor="middle" {...line(annot)} fill={ink}>
                {t2}
              </text>,
            ),
          );
    });
    plate.references.forEach((r) =>
      els.push(
        <line
          key={`ref${r.index}`}
          x1={plotLeft}
          x2={plotRight}
          y1={y(r.value)}
          y2={y(r.value)}
          stroke={ink}
          strokeWidth={1}
          strokeDasharray="4 3"
        />,
      ),
    );
    if (props.unit)
      els.push(
        <text
          key="unit"
          x={plotLeft}
          y={layout.top - keyRoom + annotBand.ascent}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(props.unit, axis)}
        </text>,
      );
    bandNotes.forEach((t, j) =>
      els.push(
        <text
          key={`bn${j}`}
          x={PAD}
          y={layout.bandTop + annotBand.ascent + j * annotLead}
          {...line(annot)}
          fill={ink}
        >
          {t}
        </text>,
      ),
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={altText}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />
      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={`t${i}`}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={`l${i}`}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {layout.heads.map((h, i) => (
        <text
          key={`h${i}`}
          x={PAD}
          y={layout.headTop + annotBand.ascent + i * annotLead}
          {...line(h.strong ? value : annot)}
          fill={h.strong ? accentInk : ink}
        >
          {h.t}
        </text>
      ))}
      {els}
      {scopeLine && (
        <text x={PAD} y={sourceTop - bodyLead} {...line(body)} fill={mutedInk}>
          {set(scopeLine, body)}
        </text>
      )}
      {sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

/**
 * THE PAIRED FAMILY'S STILL PLATE — every type of the family as a variant (`variant`), its staging the beat's
 * composed gestures (`gesture-paired-static.mjs`) on the family's geometry (`gesture-family-paired.mjs`
 * `layoutPaired`). Forked from the per-type plates' doctrine, not their staging:
 *
 *   lollipop            two stems per key from zero, the earlier state pale, the later full (one hue, two chromas:
 *                       `two-states-of-one-measure-are-one-hue-at-two-chromas`); each head carries its value
 *   grouped-bar         two bars per key from zero, the first series full, the second pale; a legend names them
 *   bullet              a full neutral track to the ceiling, the comparative state thick and pale, the measure thin
 *                       and saturated over it (`the-track-runs-the-full-scale`); "a → b" printed at the track's end
 *   diverging-bar       one signed bar per key from a mid zero; its figure stands on the side of the zero its bar
 *                       does not use, so a long bar never runs into its own number
 *   population-pyramid  the first series left of a spine, the second right, bands in age order (youngest at the
 *                       foot), the band names in the spine, both halves on one magnitude scale with ticks
 *
 * Everything drawn rests on one value scale from zero (`domainOf` over every mark, copy and rule). One accent: the
 * subject's marks (or the highlighted ones) take it, every other mark is the ground's neutral; a ring marks a named
 * mark; a stepped-back key is drawn faint. Furniture — ink, muted, rule — derives from the ground. Words are set on
 * the ground, never inside a fill. Rows a frame cannot hold are left out from the middle of the order and the plate
 * says so (`scope`); the gestures' keys are always kept. The data's shape never refuses the plate.
 */

import {
  adjustToContrast,
  deriveFurniture,
  measureText,
  measureTextBand,
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
import {
  domainOf,
  keysToDraw,
  layoutPaired,
  SERIES_TONE,
} from "./gesture-family-paired.mjs";

type Mark = {
  name: string;
  value: number;
  key: string;
  series?: string;
  j: number;
};
type Note = {
  index: number;
  do: string;
  marks: string[];
  keys: string[];
  text: string;
};
export type PairedPlate = {
  order: string[];
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: Note[];
  copies: { index: number; onto: string; value: number }[];
  brackets: {
    index: number;
    marks: string[];
    keys: string[];
    sum: number;
    whole: number | null;
    note?: string;
  }[];
  references: { index: number; value: number; note?: string }[];
  keep: string[];
};

export function GesturePairedStatic({
  variant,
  keys,
  marks,
  series,
  plate,
  format,
  title,
  limits,
  source,
  alt,
  eyebrow,
  unit,
  ceiling,
  scope,
  direction,
  frame,
}: {
  variant: string;
  keys: { name: string; values: (number | null)[] }[];
  marks: Mark[];
  series: string[];
  plate: PairedPlate;
  format: (v: number) => string;
  title: string | string[];
  limits: string | string[];
  source: string;
  alt: string | ((drawn: { name: string; values: (number | null)[] }[]) => string);
  eyebrow: string;
  unit?: string;
  ceiling?: number;
  scope?: (shown: number, all: number) => string;
  direction: any;
  frame: { width: number; height: number };
}) {
  const { width, height } = frame;
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const reg = (name: string) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const annot = reg("annot");
  const valueReg = reg("value");
  const axis = reg("axis");
  const set = (text: string, r: any) => applyCase(String(text), r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(set(text, r), sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, String(text).length - 1);
  const band = (r: any) => {
    const b = measureTextBand("Hxpg1,", sizeOf(r));
    return { ascent: b.ascent, descent: b.descent, h: b.ascent + b.descent };
  };
  const wrap = (text: string, max: number, r: any) => {
    const lines: string[] = [];
    let cur = "";
    for (const w of String(text).split(/\s+/).filter(Boolean)) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && widthOf(t, r) > max) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const textInk = adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const column = width - PAD * 2;
  const pyramid = variant === "population-pyramid";
  const twoPerBand = variant === "grouped-bar" || variant === "lollipop";

  // ── header: the headline and the standfirst take the longest form that holds in its lines ──────────────
  const titles = [title].flat().filter(Boolean);
  const limitForms = [limits].flat().filter(Boolean);
  const titleLines =
    titles
      .map((t) => wrap(set(t, display), column, display))
      .find((l) => l.length <= 2) ??
    wrap(set(titles.at(-1)!, display), column, display);
  const eyebrowBase = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBase + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop +
    (titleLines.length - 1) * leadOf(display) +
    gapOf(body, 1.2) +
    body.fontSize * 0.2;

  // ── the rows a frame can hold ────────────────────────────────────────────────────────────────────────
  const pairLabel = twoPerBand ? axis : valueReg;
  const nameH = band(axis).h;
  const minPitch = twoPerBand
    ? 2 * band(pairLabel).h + 4
    : pyramid
      ? nameH + 2
      : Math.max(nameH, band(valueReg).h) + 3;
  const sourceLines = wrap(set(source, body), column, body);
  const sourceTop = height - PAD - (sourceLines.length - 1) * leadOf(body);
  const tickRoom = pyramid ? band(axis).h + 8 : 0;

  const layoutFor = (
    limitText: string,
    drawnCount: number,
    scopeLine: string,
  ) => {
    const limitLines = wrap(
      set(scopeLine ? `${scopeLine} ${limitText}` : limitText, body),
      column,
      body,
    );
    const legendTop =
      limitsTop + (limitLines.length - 1) * leadOf(body) + gapOf(body, 1.1);
    const plotTop =
      legendTop +
      (variant === "diverging-bar" ? 0 : band(axis).h + gapOf(axis, 1.2)) +
      4;
    return { limitLines, legendTop, plotTop };
  };
  // Notes with one key are written beside their row; the rest go on lines under the plot.
  const beside = (n: Note) =>
    n.keys.length === 1 && plate.order.includes(n.keys[0]);
  const underNotes = plate.notes.filter((n) => !beside(n));
  const bracketNotes = plate.brackets.map(
    (b) =>
      b.note ??
      (b.whole ? `${format(b.sum)} / ${format(b.whole)}` : format(b.sum)),
  );
  const refNotes = plate.references.filter((r) => r.note).map((r) => r.note!);
  const underText = [...underNotes.map((n) => n.text), ...refNotes];
  const underLines = underText.flatMap((t) =>
    wrap(set(t, annot), column, annot),
  );
  const plotBottom =
    sourceTop -
    body.fontSize -
    gapOf(body, 0.9) -
    underLines.length * leadOf(annot) -
    tickRoom;

  let chosen: any = null;
  for (let drawn = plate.order.length; drawn >= 1 && !chosen; drawn--) {
    const shown = keysToDraw({
      variant,
      order: plate.order,
      keep: plate.keep,
      capacity: drawn,
    });
    const scopeLine =
      shown.length < plate.order.length
        ? scope
          ? scope(shown.length, plate.order.length)
          : `${shown.length} / ${plate.order.length}`
        : "";
    for (const lt of limitForms) {
      const l = layoutFor(lt, shown.length, scopeLine);
      const pitch = (plotBottom - l.plotTop) / shown.length;
      const candidate = { ...l, shown, scopeLine, pitch };
      if (pitch >= minPitch || shown.length <= Math.max(1, plate.keep.length)) {
        chosen = candidate;
        break;
      }
      chosen = null;
    }
    if (!chosen && drawn === 1) {
      const l = layoutFor(limitForms.at(-1) ?? "", shown.length, scopeLine);
      chosen = {
        ...l,
        shown,
        scopeLine,
        pitch: (plotBottom - l.plotTop) / shown.length,
      };
    }
  }
  const { limitLines, legendTop, plotTop, shown, pitch } = chosen;
  if (pitch < minPitch)
    console.log(
      `  tight: ${shown.length} rows at ${pitch.toFixed(1)}px of pitch (owed ${minPitch.toFixed(1)}px) — every gesture's rows kept`,
    );
  if (shown.length < plate.order.length)
    console.log(
      `  ladder: ${shown.length} of ${plate.order.length} rows drawn`,
    );
  const shownSet = new Set(shown);
  const drawnMarks = marks.filter((m) => shownSet.has(m.key));
  const state = {
    order: shown,
    copies: plate.copies.filter((c) =>
      drawnMarks.some((m) => m.name === c.onto),
    ),
    references: plate.references,
  };
  const domain = domainOf({ variant, marks: drawnMarks, state, ceiling });

  // ── the plot's horizontal budget: names, the plot, the figures, the notes ─────────────────────────────────
  const nameW = Math.max(...shown.map((k: string) => widthOf(k, axis)));
  const gap = gapOf(axis, 0.6);
  const labelOf = (m: Mark) => format(m.value);
  const bulletLabel = (k: string) => {
    const ms = drawnMarks.filter((m) => m.key === k);
    return ms.length === 2
      ? `${format(ms[0].value)} → ${format(ms[1].value)}`
      : ms.map(labelOf).join("");
  };
  const valueRoom = pyramid
    ? 0
    : variant === "bullet"
      ? Math.max(
          ...shown.map((k: string) => widthOf(bulletLabel(k), valueReg)),
        ) + gap
      : variant === "diverging-bar"
        ? 0
        : Math.max(
            ...drawnMarks.map((m) => widthOf(labelOf(m), pairLabel)),
            ...plate.copies.map((c) => widthOf(format(c.value), pairLabel)),
          ) + gap;
  const besideNotes = plate.notes.filter(beside);
  const noteW = besideNotes.length
    ? Math.min(
        column * 0.34,
        Math.max(...besideNotes.map((n) => widthOf(n.text, annot))),
      ) + gap
    : 0;
  const bracketLane = plate.brackets.length
    ? 14 * plate.brackets.length +
      Math.min(
        column * 0.22,
        Math.max(...bracketNotes.map((t) => widthOf(t, annot))),
      ) +
      gap
    : 0;
  const divLabel =
    variant === "diverging-bar"
      ? Math.max(...drawnMarks.map((m) => widthOf(labelOf(m), valueReg))) + gap
      : 0;
  const plotLeft = pyramid
    ? PAD
    : PAD +
      nameW +
      gap +
      (variant === "diverging-bar" && domain[0] < 0 ? 0 : 0);
  const plotRight = width - PAD - valueRoom - noteW - bracketLane;
  const spineGutter = pyramid ? nameW + gap * 2 : 0;
  const plotFrame = {
    x: plotLeft,
    y: plotTop,
    width: Math.max(80, plotRight - plotLeft),
    height: plotBottom - plotTop,
    gutter: spineGutter,
  };
  // diverging: the figures stand on the zero's free side, inside the plot; the scale keeps room for them.
  let layoutDomain = domain;
  if (variant === "diverging-bar") {
    const [lo, hi] = domain;
    const pad = ((divLabel * 1.1) / plotFrame.width) * (hi - lo || 1);
    layoutDomain = [Math.min(lo, -pad), Math.max(hi, pad)];
  }
  const geo = layoutPaired({
    variant,
    keys,
    marks: drawnMarks,
    series,
    state,
    frame: plotFrame,
    domain: layoutDomain,
  });
  const tone = SERIES_TONE[variant as keyof typeof SERIES_TONE] ?? [1, 0.5];
  const accentSet = new Set(plate.accent);
  const ringSet = new Set(plate.rings);
  const back = new Set(plate.stepBack);
  const fillOf = (m: Mark) =>
    mix(
      direction.ground,
      accentSet.has(m.name) ? direction.accent : muted,
      tone[m.j] ?? 1,
    );
  // The subject's keys: every drawn mark of the key carries the accent (a highlighted series accents no key).
  const subjectKeys = new Set(
    shown.filter((k: string) => {
      const ms = drawnMarks.filter((m) => m.key === k);
      return ms.length > 0 && ms.every((m) => accentSet.has(m.name));
    }),
  );
  const opacity = (k: string) => (back.has(k) ? 0.28 : 1);

  const els: any[] = [];
  const texts: any[] = [];
  const T = (
    key: string,
    x: number,
    y: number,
    text: string,
    r: any,
    extra: any = {},
  ) =>
    texts.push(
      <text key={key} x={x} y={y} {...line(r)} {...extra}>
        {set(text, r)}
      </text>,
    );

  // header
  T("eyebrow", PAD, eyebrowBase, eyebrow, eyebrowReg);
  titleLines.forEach((l: string, i: number) =>
    T(`t${i}`, PAD, titleTop + i * leadOf(display), l, display),
  );
  limitLines.forEach((l: string, i: number) =>
    T(`l${i}`, PAD, limitsTop + i * leadOf(body), l, body),
  );
  sourceLines.forEach((l: string, i: number) =>
    T(`s${i}`, PAD, sourceTop + i * leadOf(body), l, body),
  );

  // legend: the series by their tone (the subject's hue when the subject carries the accent)
  if (variant !== "diverging-bar") {
    const ly = legendTop + band(axis).ascent;
    let x = pyramid ? PAD : plotLeft;
    if (pyramid) {
      T("lg0", geo.spine![0] - gap, ly, series[0], axis, {
        textAnchor: "end",
        fontWeight: 700,
        fill: textInk,
      });
      T("lg1", geo.spine![1] + gap, ly, series[1], axis, {
        fontWeight: 700,
        fill: textInk,
      });
    } else
      series.forEach((s, j) => {
        const hue = subjectKeys.size || drawnMarks.some((m) => m.j === j && accentSet.has(m.name)) ? direction.accent : muted;
        els.push(
          <rect
            key={`sw${j}`}
            x={x}
            y={ly - band(axis).ascent + 1}
            width={10}
            height={band(axis).ascent - 1}
            fill={mix(direction.ground, hue, tone[j] ?? 1)}
          />,
        );
        T(`lg${j}`, x + 14, ly, variant === "bullet" ? `${s}` : s, axis, {
          fill: textInk,
        });
        x += 14 + widthOf(s, axis) + gap * 2.5;
      });
  }

  // tracks (bullet), zero rules, marks
  const pitchY = (k: string) => geo.bands.get(k)!;
  if (variant === "bullet") {
    const top = ceiling ?? domain[1];
    for (const k of shown) {
      const b = pitchY(k);
      const h = b.h * 0.78;
      els.push(
        <rect
          key={`track-${k}`}
          x={geo.xOf(0)}
          y={b.y + (b.h - h) / 2}
          width={geo.xOf(top) - geo.xOf(0)}
          height={h}
          fill={mix(direction.ground, muted, 0.14)}
          opacity={opacity(k)}
        />,
      );
    }
  }
  for (const m of drawnMarks) {
    const g = geo.marks.get(m.name)!;
    const fill = fillOf(m);
    if (variant === "lollipop") {
      const r = Math.max(2.5, Math.min(g.h * 0.42, 6));
      els.push(
        <line
          key={`stem-${m.name}`}
          x1={g.base}
          x2={g.tip.x}
          y1={g.tip.y}
          y2={g.tip.y}
          stroke={fill}
          strokeWidth={Math.max(1.5, direction.stroke?.series ?? 2)}
          opacity={opacity(m.key)}
        />,
      );
      els.push(
        <circle
          key={`head-${m.name}`}
          cx={g.tip.x}
          cy={g.tip.y}
          r={r}
          fill={fill}
          opacity={opacity(m.key)}
        />,
      );
    } else
      els.push(
        <rect
          key={`bar-${m.name}`}
          x={g.x0}
          y={g.y}
          width={Math.max(g.x1 - g.x0, 1)}
          height={Math.max(g.h - (twoPerBand ? 1 : 0), 1)}
          fill={fill}
          opacity={opacity(m.key)}
        />,
      );
  }
  // compare: a copy of the compared length, outlined in ink, in the subject's own slot from the same zero
  for (const c of state.copies) {
    const g = geo.marks.get(c.onto);
    const m = drawnMarks.find((x) => x.name === c.onto);
    if (!g || !m) continue;
    const side = pyramid ? g.side : 1;
    const t = geo.xOf(c.value, side);
    els.push(
      <rect
        key={`copy-${c.index}`}
        x={Math.min(g.base, t)}
        y={g.y + g.h * 0.2}
        width={Math.max(Math.abs(t - g.base), 1)}
        height={g.h * 0.6}
        fill="none"
        stroke={textInk}
        strokeWidth={1}
        strokeDasharray="3 2"
      />,
    );
    els.push(
      <line
        key={`copytick-${c.index}`}
        x1={t}
        x2={t}
        y1={g.y - 2}
        y2={g.y + g.h + 2}
        stroke={textInk}
        strokeWidth={1.5}
      />,
    );
  }
  // name: a ring around the named mark
  for (const name of plate.rings) {
    const g = geo.marks.get(name);
    if (!g) continue;
    els.push(
      <rect
        key={`ring-${name}`}
        x={g.x0 - 3}
        y={g.y - 2}
        width={g.x1 - g.x0 + 6}
        height={g.h + 4}
        fill="none"
        stroke={ink}
        strokeWidth={direction.stroke?.rule ?? 1}
      />,
    );
  }
  // the zero(s)
  const yTop = plotTop - 2;
  const yBot = plotBottom + 2;
  if (pyramid)
    for (const x of geo.spine!)
      els.push(
        <line
          key={`zero-${x}`}
          x1={x}
          x2={x}
          y1={yTop}
          y2={yBot}
          stroke={ink}
          strokeWidth={direction.stroke?.rule ?? 1}
        />,
      );
  else
    els.push(
      <line
        key="zero"
        x1={geo.zero as number}
        x2={geo.zero as number}
        y1={yTop}
        y2={yBot}
        stroke={ink}
        strokeWidth={direction.stroke?.rule ?? 1}
      />,
    );
  // reference rules, over the marks
  for (const r of plate.references) {
    const xs = pyramid
      ? [geo.xOf(r.value, -1), geo.xOf(r.value, 1)]
      : [geo.xOf(r.value)];
    xs.forEach((x, i) =>
      els.push(
        <line
          key={`ref-${r.index}-${i}`}
          x1={x}
          x2={x}
          y1={yTop}
          y2={yBot}
          stroke={direction.accent}
          strokeWidth={direction.stroke?.rule ?? 1}
          strokeDasharray="6 5"
        />,
      ),
    );
  }

  // names: in the gutter (the pyramid's spine), the subject's bold in ink
  const nameBase = (k: string) =>
    pitchY(k).y +
    pitchY(k).h / 2 +
    (band(axis).ascent - band(axis).descent) / 2;
  for (const k of shown) {
    const bold =
      subjectKeys.has(k) ||
      drawnMarks.some((m) => m.key === k && ringSet.has(m.name));
    const x = pyramid ? (geo.spine![0] + geo.spine![1]) / 2 : plotLeft - gap;
    T(`name-${k}`, x, nameBase(k), k, axis, {
      textAnchor: pyramid ? "middle" : "end",
      fill: bold ? textInk : mutedInk,
      fontWeight: bold ? 700 : axis.fontWeight,
      opacity: opacity(k),
    });
    // A gap is said where its mark would stand: in its own half of the band when the band holds two marks, on the
    // free side of the zero (or the spine) otherwise.
    const values = keys.find((x) => x.name === k)?.values ?? [];
    values.forEach((v, j) => {
      if (v !== null) return;
      const b = pitchY(k);
      const inner = b.h * 0.78;
      const y = twoPerBand ? b.y + (b.h - inner) / 2 + (j + 0.5) * (inner / 2) + (band(axis).ascent - band(axis).descent) / 2 : nameBase(k);
      const x = pyramid ? (j === 0 ? geo.spine![0] - 4 : geo.spine![1] + 4) : geo.xOf(0) + 4;
      T(`na-${k}-${j}`, x, y, "n/a", axis, { fill: mutedInk, textAnchor: pyramid && j === 0 ? "end" : "start" });
    });
  }

  // figures
  const figureRight = plotFrame.x + plotFrame.width + gap;
  if (variant === "bullet")
    for (const k of shown)
      T(`fig-${k}`, figureRight, nameBase(k), bulletLabel(k), valueReg, {
        fill: subjectKeys.has(k) ? accentInk : mutedInk,
        fontWeight: subjectKeys.has(k) ? 700 : valueReg.fontWeight,
        opacity: opacity(k),
      });
  else if (twoPerBand)
    for (const m of drawnMarks) {
      const g = geo.marks.get(m.name)!;
      const copy = state.copies.find((c) => c.onto === m.name);
      const reach = Math.max(g.tip.x, copy ? geo.xOf(copy.value) : -Infinity);
      const y =
        g.y + g.h / 2 + (band(pairLabel).ascent - band(pairLabel).descent) / 2;
      const text = copy ? `${labelOf(m)} / ${format(copy.value)}` : labelOf(m);
      T(
        `fig-${m.name}`,
        Math.max(reach, geo.xOf(0)) + (variant === "lollipop" ? 9 : 5),
        y,
        text,
        pairLabel,
        {
          fill: accentSet.has(m.name) ? accentInk : mutedInk,
          fontWeight: accentSet.has(m.name) ? 700 : pairLabel.fontWeight,
          opacity: opacity(m.key),
        },
      );
    }
  else if (variant === "diverging-bar")
    for (const m of drawnMarks) {
      const neg = m.value < 0;
      T(
        `fig-${m.name}`,
        (geo.zero as number) + (neg ? 5 : -5),
        nameBase(m.key),
        labelOf(m),
        valueReg,
        {
          textAnchor: neg ? "start" : "end",
          fill: accentSet.has(m.name) ? accentInk : mutedInk,
          fontWeight: accentSet.has(m.name) ? 700 : valueReg.fontWeight,
          opacity: opacity(m.key),
        },
      );
    }
  else {
    // pyramid: ticks under each half, and a figure only where a gesture rings or names a mark (notes carry the rest)
    const top = layoutDomain[1];
    const ticks = [0, top / 2, top].map((v) => Number(v.toPrecision(2)));
    const ty = plotBottom + 4 + band(axis).ascent;
    for (const side of [-1, 1])
      ticks.forEach((v, i) => {
        if (v > top) return;
        T(`tick-${side}-${i}`, geo.xOf(v, side), ty, format(v), axis, {
          textAnchor: i === 0 ? (side < 0 ? "end" : "start") : "middle",
          fill: mutedInk,
        });
      });
    for (const name of plate.rings) {
      const m = drawnMarks.find((x) => x.name === name);
      const g = geo.marks.get(name);
      if (!m || !g || plate.notes.some((n) => n.marks.includes(name))) continue;
      const x = g.side < 0 ? g.x0 - 5 : g.x1 + 5;
      T(`fig-${name}`, x, nameBase(m.key), labelOf(m), axis, {
        textAnchor: g.side < 0 ? "end" : "start",
        fill: textInk,
        fontWeight: 700,
      });
    }
  }

  // notes beside their row, at the right; stacked downward when two rows' notes would touch
  const noteX = width - PAD - noteW - bracketLane + gap;
  let floor = -Infinity;
  const noteLines: any[] = [];
  for (const n of besideNotes.sort(
    (a, b) => nameBase(a.keys[0]) - nameBase(b.keys[0]),
  )) {
    const lines = wrap(set(n.text, annot), noteW - gap, annot);
    let y = nameBase(n.keys[0]) - ((lines.length - 1) * leadOf(annot)) / 2;
    if (y - band(annot).ascent < floor + 2) y = floor + 2 + band(annot).ascent;
    lines.forEach((l, i) =>
      noteLines.push({
        key: `note-${n.index}-${i}`,
        x: noteX,
        y: y + i * leadOf(annot),
        text: l,
      }),
    );
    floor = y + (lines.length - 1) * leadOf(annot) + band(annot).descent;
    const from = pyramid ? noteX - gap : figureRight + valueRoom - gap;
    if (noteX - from > 8)
      els.push(
        <line
          key={`leader-${n.index}`}
          x1={from + 2}
          x2={noteX - 4}
          y1={nameBase(n.keys[0]) - band(annot).ascent / 3}
          y2={nameBase(n.keys[0]) - band(annot).ascent / 3}
          stroke={mix(direction.ground, ink, 0.35)}
          strokeWidth={0.75}
        />,
      );
  }
  noteLines.forEach((l) =>
    T(l.key, l.x, l.y, l.text, annot, { fill: accentInk }),
  );
  // brackets (pyramid): a spine down the right lane over the bracketed bands, its figure beside it
  plate.brackets.forEach((b, k) => {
    const bs = b.keys.filter((x) => shownSet.has(x)).map(pitchY);
    if (!bs.length) return;
    const y0 = Math.min(...bs.map((x) => x.y)) + 1;
    const y1 = Math.max(...bs.map((x) => x.y + x.h)) - 1;
    const x = width - PAD - bracketLane + 6 + k * 14;
    els.push(
      <path
        key={`bracket-${b.index}`}
        d={`M${x - 5} ${y0} L${x} ${y0} L${x} ${y1} L${x - 5} ${y1}`}
        fill="none"
        stroke={direction.accent}
        strokeWidth={direction.stroke?.rule ?? 1}
      />,
    );
    const lines = wrap(
      set(bracketNotes[k], annot),
      bracketLane - 14 * plate.brackets.length - gap,
      annot,
    );
    const mid = (y0 + y1) / 2 - ((lines.length - 1) * leadOf(annot)) / 2;
    lines.forEach((l, i) =>
      T(
        `bn-${b.index}-${i}`,
        width - PAD - bracketLane + 14 * plate.brackets.length + gap / 2,
        mid + i * leadOf(annot),
        l,
        annot,
        { fill: accentInk },
      ),
    );
  });
  // notes on several rows and the rules' names, under the plot
  const underTop = plotBottom + tickRoom + gapOf(annot, 1) + band(annot).ascent;
  underLines.forEach((l, i) =>
    T(`under-${i}`, PAD, underTop + i * leadOf(annot), l, annot, {
      fill: accentInk,
    }),
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={typeof alt === "function" ? alt(keys.filter((k) => shownSet.has(k.name))) : alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />
      {els}
      {texts}
    </svg>
  );
}

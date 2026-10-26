// THE PICTURE AT ONE FRAME — pure arithmetic over build.mjs's props, run by the composition in Chrome and by the
// runner in Bun. Browser-safe: it imports only the video scheduler's time half (./gesture-video.mjs, copied flat
// beside it), never a skill or `#shared/chart-beat`.
//
// One value scale for every bar, its domain a state field (`lo`, `hi`) moving linearly; one row slot per bar
// (`slot<i>`), moving linearly; a bar's colour, ring and step-back arrive eased. Each gesture's own field (`g<k>`)
// drives what it lays: a compare's copy growing along the scale, a bracket's spine running down its rows while its
// figure climbs, a reference rule drawing itself, a count's figure climbing, a note arriving.
import { fieldAt, landedOf, moveOf, valueText } from "./gesture-video.mjs";

const NB = " ";
const withUnit = (unit, text) => (unit ? `${text}${NB}${unit}` : text);

/** Two #rrggbb colours mixed `t` of the way (from proof/video-cartogram-europe-lowcarbon/scene.mjs, as the per-type kit). */
export function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** A linear gesture's note lands by a cut once its motion has ended; an arrival's note arrives with it. */
const noteShown = (item, g) => (item.do === "highlight" || item.do === "name" || item.do === "annotate" || item.do === "filter" || item.do === "pull-back" ? g : g >= 1 ? 1 : 0);

export function sceneAt(props, frame) {
  const f = (field) => fieldAt(props, field, frame);
  const L = props.layout;
  const lo = f("lo");
  const hi = f("hi");
  const unit = L.span / (hi - lo);
  const right = L.valueLeft + L.span;
  const x = (v) => Math.min(right, Math.max(L.valueLeft, L.valueLeft + (v - lo) * unit));
  // A bar past the scale's top (a zoom onto shorter rows) runs out of the frame, and its count, which the cut bar no
  // longer measures, steps out until the scale returns.
  const bar = (v) => Math.min(props.frame.width, Math.max(L.valueLeft, L.valueLeft + (v - lo) * unit));
  const outside = (v) => v > hi + 1e-9 || v < lo - 1e-9;
  const x0 = x(0);
  const grown = f("grown");
  const ink = f("ink");
  const release = f("release");
  const n = props.rows.length;
  const g = props.plan.map((p) => f(p.field));

  const rows = props.rows.map((r, i) => {
    const slot = f(`slot${i}`);
    const top = L.plotTop + slot * L.pitch;
    const barY = top + L.barTop;
    const inked = props.hasReveal ? moveOf(ink, r.rank, n) : ink;
    const tipX = bar(r.value * grown);
    const cut = outside(r.value);
    const fullTip = x(r.value);
    const copyItem = props.plan.find((p) => p.do === "compare" && p.onto === r.key);
    const copyEnd = copyItem ? x(copyItem.value) : x0;
    const after = Math.max(fullTip, copyEnd, x0) + L.gap;
    const back = f(`back${i}`);
    // A positive bar's count stands past its tip (or its copy's, when that is longer); a negative bar's before its tip.
    const countX = r.value < 0 ? fullTip - L.gap - r.count.width : after;
    let cursor = r.value < 0 ? after : countX + r.count.width + L.gap;
    const notes = props.notes
      .filter((note) => note.row === i)
      .map((note) => {
        const item = props.plan[note.item];
        const at = { ...note, x: cursor, opacity: cut ? 0 : noteShown(item, g[note.item]) * (item.do === "zoom" ? 1 - release : 1) };
        cursor += note.width * 1.02 + L.gap;
        return at;
      });
    return {
      top,
      barY,
      barX: Math.min(x0, tipX),
      barW: Math.abs(tipX - x0),
      inked,
      accent: f(`accent${i}`),
      ring: f(`ring${i}`),
      back,
      countX,
      countOpacity: grown >= 1 && inked >= 1 && !cut ? 1 - 0.6 * back : 0,
      nameY: top + L.nameDy,
      countY: barY + L.barH / 2 + L.countShift,
      chainEnd: cut ? right : cursor - L.gap,
      notes,
    };
  });

  const copies = props.plan
    .filter((p) => p.do === "compare" && g[p.index] > 0)
    .map((p) => {
      const i = props.rows.findIndex((r) => r.key === p.onto);
      const row = rows[i];
      const tip = bar(p.value * g[p.index]);
      return { x: Math.min(x0, tip), y: row.barY + L.barH * 0.55, width: Math.abs(tip - x0), height: L.barH * 0.45 };
    });

  const brackets = props.plan
    .filter((p) => p.do === "bracket" && g[p.index] > 0)
    .map((p) => {
      const members = p.members.map((m) => props.rows.findIndex((r) => r.key === m));
      const slots = members.map((i) => f(`slot${i}`));
      const first = Math.min(...slots);
      const last = Math.max(...slots);
      const spanned = rows.filter((row, i) => {
        const s = f(`slot${i}`);
        return s >= first - 0.5 && s <= last + 0.5;
      });
      const spineX = Math.max(...spanned.map((row) => row.chainEnd)) + L.gap + L.tick;
      const y1 = L.plotTop + first * L.pitch + L.barTop;
      const y2 = L.plotTop + last * L.pitch + L.barTop + L.barH;
      const progress = g[p.index];
      const reach = y1 + (y2 - y1) * progress;
      const ticks = members.map((i) => rows[i].barY + L.barH / 2).filter((y) => y <= reach);
      const landed = landedOf(p, progress);
      const label = props.bracketLabels.find((b) => b.item === p.index);
      const figure = landed > 0 ? withUnit(props.unit, valueText(p.steps[landed - 1], props.format)) : null;
      const noted = progress >= 1 && label?.note;
      return { index: p.index, spineX, y1, reach, ticks, labelX: spineX + L.gap, labelY: (y1 + y2) / 2 + L.countShift, figure: noted ? null : figure, note: noted ? label.note : null };
    });

  const rules = props.plan
    .filter((p) => p.do === "reference" && g[p.index] > 0 && !outside(p.value))
    .map((p) => ({ index: p.index, x: x(p.value), y1: L.plotTop, y2: L.plotTop + (L.plotBottom - L.plotTop) * g[p.index] }));

  const captions = props.captions.map((c) => {
    const item = props.plan[c.item];
    const progress = g[c.item];
    if (c.kind === "count") {
      const landed = landedOf(item, progress);
      const figure = landed > 0 ? withUnit(props.unit, valueText(item.steps[landed - 1], props.format)) : null;
      const noted = progress >= 1 && c.lines.length > 0;
      return { ...c, figure: noted ? null : figure, opacity: noted ? 1 : 0 };
    }
    let dx = 0;
    if (c.kind === "rule") {
      const rule = rules.find((r) => r.index === c.item);
      const w = Math.max(...c.lines.map((l) => l.width)) * 1.02;
      if (rule) dx = Math.min(L.content.right - w, Math.max(L.content.left, rule.x + L.gap)) - L.content.left;
    }
    return { ...c, figure: null, dx, opacity: noteShown(item, progress) };
  });

  return {
    title: f("title"),
    furniture: f("furniture"),
    source: f("source"),
    x0,
    rows,
    copies,
    brackets,
    rules,
    captions,
  };
}

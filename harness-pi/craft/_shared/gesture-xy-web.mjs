// The XY web scheduler (craft/gestures/GRAMMAR.md §5): the gestures that can rest together (WEB_RESTING) are drawn
// at once on the page the reader lands on — the end states the static plate draws — and every further gesture is ONE
// reader control: two native radios (the resting picture, and the resting picture plus that gesture), mapped to the
// chart-web atom that names it. A control's state is a whole picture; nothing is folded from another control.
//
//   compare → toggle-a-comparison: the two points ringed, the legs between them drawn (the gap on x, on y)
//   filter  → filter-to-a-subset: the marks outside the set leave, the frame does not move
//   zoom    → zoom-and-pan: the plot enlarges ×f onto the zoomed marks, the factor printed
//   trace   → toggle-a-comparison: the path is drawn in ink, its steps keyed — the move set against the resting cloud
//
// Every control's note carries the gesture's own `note` (checked by the core) and the derived readings no plate
// prints (the gaps, the moves, a count), language-neutral (figures, names, + − × → = %). Every mark answers a pointer
// with its x, its y (and size), ask-a-mark. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { pictureAt, planXY } from "./gesture-family-xy.mjs";

export const WEB_CONTROLS = {
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  zoom: { atom: "zoom-and-pan", mechanism: "scale" },
  trace: { atom: "toggle-a-comparison", mechanism: "trace" },
};

/**
 * @param gestures validateGestures' list (family "xy", format "web")
 * @param xy       the adapter
 * @param format   y as printed; xFormat x as printed
 * @returns        { plan, accentMark, resting, controls }
 */
export function scheduleWebXY({ gestures, xy, format = String, xFormat = String }) {
  const { plan, accentMark } = planXY({ gestures, xy });
  const restingIdx = plan.filter((p) => WEB_RESTING.has(p.do)).map((p) => p.k);
  // Every resting note is drawn at once on the landing page: one note per mark, the later dropped.
  const noted = new Set();
  for (const k of restingIdx) {
    const p = plan[k];
    if (p.note === undefined || p.at === undefined) continue;
    if (noted.has(p.at))
      throw new GestureRefusal(`gestures[${k}].note`, `${p.at} already carries a note on the landing page, and every resting note is drawn at once: drop this note (the gesture stays)`, { set: { index: k, field: "note", value: undefined } });
    noted.add(p.at);
  }
  const restingPlan = plan.map((p) => (p.do === "pull-back" ? { ...p, release: false } : p));
  const on = (ks) => Object.fromEntries(ks.map((k) => [k, 1]));
  const resting = pictureAt({ plan: restingPlan, accentMark, xy, on: on(restingIdx) });
  const label = (n) => xy.byName.get(n).series ?? n;
  const at = (n) => xy.byName.get(n);
  const signed = (v, f) => `${v >= 0 ? "+" : "−"}${f(Math.abs(v))}`;

  const controls = [];
  for (const p of plan) {
    if (WEB_RESTING.has(p.do)) continue;
    const control = { index: p.k, do: p.do, ...WEB_CONTROLS[p.do], note: p.note, picture: pictureAt({ plan: restingPlan, accentMark, xy, on: on([...restingIdx, p.k]) }) };
    switch (p.do) {
      case "compare": {
        const [a, b] = [at(p.a), at(p.b)];
        Object.assign(control, {
          legend: `${label(p.a)} / ${label(p.b)}`,
          chip: `${label(p.a)} − ${label(p.b)}`,
          pieces: [`x: ${xFormat(a.x)} − ${xFormat(b.x)} = ${signed(a.x - b.x, xFormat)}`, `y: ${format(a.value)} − ${format(b.value)} = ${signed(a.value - b.value, format)}`],
          question: `Where does ${label(p.a)} stand against ${label(p.b)}, on both axes?`,
          changes: `Both points are ringed and the two legs between them are drawn: the gap along x, then along y.`,
          parameter: `whether gestures[${p.k}] sets ${label(p.a)} against ${label(p.b)}`,
        });
        break;
      }
      case "filter": {
        const kept = p.kept.map(label);
        Object.assign(control, {
          legend: p.axis ? `${p.side === "below" ? "<" : "≥"} ${(p.axis === "x" ? xFormat : format)(p.value)}` : kept.length <= 3 ? kept.join(" + ") : `${kept[0]} + ${kept.length - 1}`,
          chip: `${p.kept.length} / ${xy.heads.length}`,
          pieces: [`${p.kept.length} / ${xy.heads.length}`],
          question: `What do ${kept.length <= 3 ? kept.join(", ") : `these ${kept.length}`} look like without the others?`,
          changes: `The other points leave the plot; the axes and every remaining point stay exactly where they were.`,
          parameter: `whether gestures[${p.k}] keeps only ${kept.length} of ${xy.heads.length}`,
        });
        break;
      }
      case "zoom": {
        const f = p.factor.toFixed(1);
        Object.assign(control, {
          legend: p.marks.map(label).slice(0, 3).join(" + "),
          chip: `× ${f}`,
          pieces: [],
          question: `What do ${p.marks.map(label).join(", ")} look like with the plot enlarged onto them?`,
          changes: `The plot enlarges ×${f} onto ${p.marks.map(label).join(", ")}; points outside the window leave its edges, the factor is printed.`,
          parameter: `the zoom of gestures[${p.k}]`,
        });
        break;
      }
      case "trace": {
        const moves = p.series.map((s) => {
          const mv = xy.move(s);
          return `${s}: x ${signed(mv.dx, xFormat)}, y ${signed(mv.dy, format)}`;
        });
        Object.assign(control, {
          legend: p.series.slice(0, 3).join(" + "),
          chip: p.series.length === 1 ? `${p.series[0]} →` : `${p.series.length} →`,
          pieces: moves,
          question: `Which way did ${p.series.slice(0, 3).join(", ")} move, step by step?`,
          changes: `The path is drawn in ink from its first step to its last, each step named by its key.`,
          parameter: `whether gestures[${p.k}] traces ${p.series.length} path(s)`,
        });
        break;
      }
      default:
        throw new GestureRefusal(`gestures[${p.k}].do`, `"${p.do}" has no web control on this page`, { remove: p.k });
    }
    controls.push(control);
  }
  return { plan, accentMark, resting, restingIdx, controls };
}

/** The interaction declaration renderWeb holds the page against: ask-a-mark on every mark, then one per control. */
export function interactionPlanXY({ scheduled, xy, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "Where exactly does this point stand, on both axes?",
    gesture: "ask-a-mark",
    changes: "The point answers with its name, its x and its y, which the plate prints only for the marks a gesture names.",
    parameter: "which point is asked about",
    authorPicked: subject ?? xy.heads[0],
    readerPicks: "every mark",
    heldStill: HELD,
  };
  const controls = scheduled.controls.map((c) => ({
    question: c.question,
    gesture: c.atom,
    changes: c.changes,
    parameter: c.parameter,
    authorPicked: "on",
    readerPicks: ["rest", "on"],
    heldStill: HELD,
  }));
  return {
    earns:
      `A still of these ${xy.heads.length} points must draw every gesture at once and name only a few of them. ` +
      `Here the reader lands on the resting picture and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every point answers with its own two values.`,
    controls: [ask, ...controls],
  };
}

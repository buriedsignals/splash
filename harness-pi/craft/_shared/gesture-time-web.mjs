// The Time-series web scheduler (craft/gestures/GRAMMAR.md §5): the gestures that can rest together (WEB_RESTING) are
// drawn at once on the page the reader lands on — the same end states the still draws — and every further gesture is
// ONE reader control: two native radios, the resting picture and the picture with that gesture applied, mapped to the
// chart-web atom that names it (skills/chart-web/assets/interaction-plan.ts):
//
//   compare  → toggle-a-comparison  a level rewound from the earlier reading (line, rank, single area), a thickness
//                                    copied beside the band (stacks), or the solved crossings ringed (two series)
//   bracket  → toggle-a-comparison  the run of time tinted, its sum (and share of the whole) printed (stacks only)
//   filter   → filter-to-a-subset   the other series leave; the frame and every kept mark stay where they were
//   zoom     → zoom-and-pan         the time axis enlarges onto the marks' window; the factor is printed
//   trace    → brush-a-range        the series drawn up to the mark's time, the rest of it stepping back behind a
//                                    playhead
//
// A control's state is a whole picture (resting + that gesture); a control that would change nothing is refused with a
// fix that drops it. The interaction declaration renderWeb holds the page against is generated here; the 12B never
// writes it. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { pictureOf } from "./gesture-family-time.mjs";

export const TIME_WEB_CONTROLS = {
  compare: "toggle-a-comparison",
  bracket: "toggle-a-comparison",
  filter: "filter-to-a-subset",
  zoom: "zoom-and-pan",
  trace: "brush-a-range",
};

/** A ratio or a factor in the format's own decimal mark. */
function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param model  timeModel's output
 * @param valid  validateTime's `gestures`
 * @param format the beat's value format (the measure's: a bump's ranks are written "#3")
 * @returns      { accent, resting, controls }
 */
export function scheduleTimeWeb({ model, valid, format = String, subject }) {
  const { accent, items } = pictureOf(model, valid, { format, subject });
  const bump = model.variant === "bump-ranking-over-time";
  const fx = numberWith(format);
  const F = (name) => (bump ? `#${model.markOf.get(name).value}` : format(model.measureOf.get(name)));
  const short = (list) => (list.length <= 3 ? list.join(", ") : `${list[0]} + ${list.length - 1}`);
  const resting = { rings: [], points: [], references: [], captions: [] };
  const controls = [];
  const noted = new Set();

  for (const it of items) {
    if (WEB_RESTING.has(it.do)) {
      if (it.do === "highlight") {
        for (const s of it.ring) if (!resting.rings.includes(s)) resting.rings.push(s);
        if (it.note !== undefined) {
          if (it.at && !noted.has(it.at.name)) {
            resting.points.push({ k: it.k, at: it.at, text: it.note, ring: false });
            noted.add(it.at.name);
          } else resting.captions.push({ k: it.k, text: it.note });
        }
      } else if (it.do === "name" || it.do === "annotate") {
        noted.add(it.at.name);
        resting.points.push({ k: it.k, at: it.at, text: it.text, ring: it.do === "name" });
      } else if (it.do === "reference") resting.references.push({ k: it.k, value: it.value, text: it.note });
      else if (it.note !== undefined) resting.captions.push({ k: it.k, text: it.note });
      continue;
    }
    const g = valid[it.k];
    const control = { index: it.k, do: it.do, atom: TIME_WEB_CONTROLS[it.do], note: it.note, label: g.label === undefined ? undefined : String(g.label) };
    const unchanged = (what) => {
      throw new GestureRefusal(`gestures[${it.k}]`, `${it.do} ${what}, so its control would change nothing in the picture: drop it`, { remove: it.k });
    };
    switch (it.do) {
      case "compare":
        if (it.kind === "crossing") {
          const years = it.crossings.map((c) => fx(c.t, Number.isInteger(c.t) ? 0 : 1));
          Object.assign(control, {
            kind: "crossing",
            crossings: it.crossings,
            series: it.series,
            legend: `${it.series[0]} / ${it.series[1]}`,
            chip: `${it.series[0]} × ${it.series[1]}`,
            pieces: [`× ${years.join(", ")}`],
            question: `Where do ${it.series[0]} and ${it.series[1]} cross?`,
            changes: `Every point where the two series cross, solved from their readings, is ringed; nothing moves.`,
            parameter: `whether gestures[${it.k}] rings the crossings of ${it.series.join(" and ")}`,
          });
        } else {
          const { a, b } = it;
          const diff = a.value - b.value;
          Object.assign(control, {
            kind: it.kind,
            a,
            b,
            legend: `${a.key} / ${b.key}`,
            chip: `${F(a.name)} / ${F(b.name)}`,
            pieces: bump
              ? [`${b.key}: #${b.value} · ${a.key}: #${a.value}`]
              : [`${format(model.measureOf.get(a.name))} - ${format(model.measureOf.get(b.name))} = ${format(model.measureOf.get(a.name) - model.measureOf.get(b.name))}`, ...(b.value !== 0 ? [`${diff >= 0 ? "+" : ""}${fx((diff / Math.abs(b.value)) * 100)} %`] : [])],
            question: `How does ${a.series} at ${a.key} stand against ${b.series} at ${b.key}?`,
            changes:
              it.kind === "level"
                ? `The level of ${b.key} is laid across to ${a.key} as a dashed rule and the gap between them is drawn.`
                : `A copy of the band's thickness at ${b.key} is laid beside the band at ${a.key}, from the same base.`,
            parameter: `whether gestures[${it.k}] lays ${b.key} against ${a.key}`,
          });
        }
        break;
      case "bracket":
        Object.assign(control, {
          from: it.from,
          to: it.to,
          layers: it.layers,
          sum: it.sum,
          share: it.share,
          ofWhole: it.ofWhole,
          legend: `${model.keyOf.get(it.from)}–${model.keyOf.get(it.to)}`,
          chip: `= ${format(it.sum)}`,
          pieces: [`${format(it.sum)} / ${format(it.whole)} = ${fx(it.share)} %`],
          question: `What do the readings from ${model.keyOf.get(it.from)} to ${model.keyOf.get(it.to)} add up to?`,
          changes: `The run of time is tinted and bracketed, and its sum and share of the whole are printed above it.`,
          parameter: `whether the bracket of gestures[${it.k}] is drawn`,
        });
        break;
      case "filter": {
        if (!it.back.length) unchanged(`keeps every drawn series`);
        Object.assign(control, {
          keep: it.keep,
          back: it.back,
          legend: short(it.keep),
          chip: `${it.keep.length} / ${model.series.length}`,
          pieces: [`${it.keep.length} / ${model.series.length}`],
          question: `What do ${it.keep.join(", ")} look like without the others?`,
          changes: `The other series leave the plot; the axes and every kept mark stay exactly where they were.`,
          parameter: `whether gestures[${it.k}] keeps only ${it.keep.join(", ")}`,
        });
        break;
      }
      case "zoom": {
        const [ta, tb] = it.window;
        Object.assign(control, {
          window: it.window,
          factor: it.factor,
          legend: `${fx(ta, Number.isInteger(ta) ? 0 : 1)}–${fx(tb, Number.isInteger(tb) ? 0 : 1)}`,
          chip: `× ${fx(it.factor)}`,
          pieces: [`${fx(ta, Number.isInteger(ta) ? 0 : 1)}–${fx(tb, Number.isInteger(tb) ? 0 : 1)}`],
          question: `What do the readings look like with the time axis enlarged onto them?`,
          changes: `The time axis enlarges ×${fx(it.factor)} onto the window; the value axis does not move, the factor is printed.`,
          parameter: `the time window of gestures[${it.k}]`,
        });
        break;
      }
      case "trace": {
        if (!(it.to < model.t1)) unchanged(`draws the whole series, as the page already does`);
        Object.assign(control, {
          to: it.to,
          traced: it.traced,
          legend: `${model.keyOf.get(model.t0)}–${it.at?.key ?? model.keyOf.get(it.to)}`,
          chip: `${model.keyOf.get(model.t0)}–${it.at?.key ?? model.keyOf.get(it.to)}`,
          pieces: it.at ? [`${it.at.key}: ${F(it.at.name)}`] : [],
          question: `What did ${it.traced.join(", ")} look like up to ${it.at?.key ?? model.keyOf.get(it.to)}?`,
          changes: `The series is drawn up to the playhead; what came after steps back behind it.`,
          parameter: `the time gestures[${it.k}] stops the series at`,
        });
        break;
      }
      default:
        throw new GestureRefusal(`gestures[${it.k}].do`, `"${it.do}" has no web control on this page: stage it with ${Object.keys(TIME_WEB_CONTROLS).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`, { remove: it.k });
    }
    controls.push(control);
  }
  return { accent, resting, controls };
}

/** The interaction declaration: every reading answers a pointer, then one control per further gesture. */
export function interactionPlanTime({ scheduled, model, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const ask = {
    question: "What was this reading worth, and where did it stand among the series at that time?",
    gesture: "ask-a-mark",
    changes: "The reading pointed at lights and the answer prints its value and its place at that time, which the plate prints nowhere.",
    parameter: "which reading is asked about",
    authorPicked: subject ?? model.marks.at(-1).name,
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
      `A still of these ${model.marks.length} readings draws every gesture at once and prints a handful of values. ` +
      `Here the reader lands on the resting picture, asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every reading answers with its own value.`,
    controls: [ask, ...controls],
  };
}

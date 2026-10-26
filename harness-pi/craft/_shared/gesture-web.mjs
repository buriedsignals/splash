// The web scheduler (craft/gestures/GRAMMAR.md §5, §6.1, §9; plan KTD4, KTD7): the gestures that can rest together
// (WEB_RESTING) are drawn at once on the page the reader lands on — the same end states the static plate draws — and
// every further gesture becomes ONE reader control: two native radios (the resting picture, and the picture with that
// gesture applied), mapped to the chart-web `GESTURES` atom that names it (skills/chart-web/assets/interaction-plan.ts).
// The interaction declaration renderWeb holds the page against (`earns`, `controls[]`) is GENERATED here from the
// list; the 12B never writes it. With JavaScript off the page is the resting picture, every note written, and every
// control still works (radios plus :checked, no script).
//
// A control's state is a whole picture: the resting state plus that one gesture. Nothing a control shows is folded
// from another control, so two controls never disagree about what a third one drew; when a reader turns on two, the
// later in story order is the picture shown (the component's CSS says so in source order).
//
// Every control's note carries the gesture's own `note` (checked by the core) and the derived readings no plate
// prints — a share, a sum written out, a ratio — so the control adds a reading the resting page does not hold
// (`assertControlsChangeSomething`). Those readings are language-neutral (figures, names, + − × / = %).
//
// Nothing here reads the data's shape: any row count (the rest is stated, and summed into a bracket of the whole),
// any leader, long names, zero and negative values. What it refuses is staging that changes nothing (a reorder into
// the order already drawn, a zoom or rescale that keeps the scale) and a gesture with no web control; each refusal
// names the field and carries a fix, so SPLASH_GESTURE_REPAIR repairs it like any other. Browser-safe: no Node module.
import { applyFix, figuresIn, GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
// The rows a page draws: the same rule as the scrolly page (every gesture's rows, then the largest, the rest stated).
import { CAPACITY, selectRows } from "./gesture-scrolly.mjs";

export { CAPACITY };

/**
 * Each gesture beyond the resting state, as the reader control it becomes: the chart-web atom that names it, and the
 * chart-web vocabulary whose mechanism the control follows (radios plus :checked/:has(), CSS only).
 *
 * - bracket → `toggle-a-comparison`, as `stack.ts`: the bracketed rows leave their bands and stack into one bar, the
 *   sum printed at its end — a bracket of one row of the whole stacks every other row onto it, so the bar it becomes
 *   IS the whole.
 * - compare → `toggle-a-comparison`, as `level.ts`: the subject is MEASURED AGAINST the other length, a copy of it laid
 *   inside the subject's band from the same zero.
 * - filter → `filter-to-a-subset`, as `filter.ts`: the rows outside the set leave, the frame does not move.
 * - reorder → `sort-or-reorder`: the same rows in the order that answers the question (drawn as their own plate, as
 *   `reorder.ts` draws one plate per order, so a pointer is answered by the row it is over).
 * - rescale and zoom → `zoom-and-pan`. The repertoire has no "rescale" atom; a rescale moves the value axis's top and
 *   a zoom moves it onto a few rows, and both are the camera on the value axis moving while the marks stay the same
 *   data — the meaning of `zoom-and-pan` ("the camera moves and marks too close to tell apart come apart"). Neither is
 *   a filter (nothing leaves) nor a comparison (no second set is laid against the first).
 */
export const WEB_CONTROLS = {
  bracket: { atom: "toggle-a-comparison", mechanism: "stack" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  reorder: { atom: "sort-or-reorder", mechanism: "reorder" },
  rescale: { atom: "zoom-and-pan", mechanism: "scale" },
  zoom: { atom: "zoom-and-pan", mechanism: "scale" },
};

/** The value scale's headroom past its tallest state, for the figure printed after each bar's end. */
export const HEADROOM = 1.25;

/**
 * Refuses a gesture that is neither resting nor mapped to a web control, naming the formats that draw it and the
 * gestures this page can turn into a control. Its fix drops the gesture (applyFix), so a repair run goes on.
 */
export function assertWebMapping(gestures, controls = WEB_CONTROLS) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || controls[g.do]) return;
    throw new GestureRefusal(
      `gestures[${i}].do`,
      `"${g.do}" has no web control on this page: draw it in the static or video format, or stage the takeaway on the web with ${Object.keys(controls).join(", ")} (a control) or ${[...WEB_RESTING].join(", ")} (resting)`,
      { remove: i },
    );
  });
}

const splitMarks = (g) => {
  const own = g.marks.length - (Array.isArray(g.of) ? g.of.length : 0);
  return { own: g.marks.slice(0, own), of: g.marks.slice(own) };
};

/** A ratio or a share in the format's own decimal mark ("2,2" when `format` writes "1,5"). */
function numberWith(format) {
  const sample = String(format(1.5));
  const comma = /\d,\d/.test(sample) && !/\d\.\d/.test(sample);
  return (n, digits = 1) => Number(n).toFixed(digits).replace(".", comma ? "," : ".");
}

/**
 * @param gestures validateGestures' `gestures` (own marks first, then `of` rows, in `marks`)
 * @param rows     the rows the page draws, in the order it draws them: [{ name, value }]
 * @param rest     the rows it has no room for: { count, sum }
 * @param format   how a value is printed (plain spaces)
 * @param entities the takeaway's rows (validateGestures' `entities`): what a filter with no marks keeps
 * @returns        { resting, controls, lo, hi, whole }
 */
export function scheduleWeb({ gestures, rows, rest = { count: 0, sum: 0 }, format = String, entities = [] }) {
  const names = rows.map((r) => r.name);
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const sum = (list) => list.reduce((s, n) => s + valueOf.get(n), 0);
  const whole = sum(names) + rest.sum;
  const F = (v) => String(format(v));
  const fx = numberWith(format);
  const pct = (part) => `${fx((part / whole) * 100)} %`;
  const short = (list) => (list.length <= 3 ? list.join(" + ") : `${list[0]} + ${list.length - 1}`);

  const resting = { accent: [], rings: [], notes: [], references: [], reveal: false };
  const implicit = implicitAccent(gestures);
  if (rows.some((r) => r.name === implicit)) resting.accent.push(implicit);
  const controls = [];
  const laid = rows.map((r) => r.value);

  gestures.forEach((g, i) => {
    const { own, of } = splitMarks(g);
    const note = g.note === undefined || String(g.note).trim() === "" ? undefined : String(g.note);
    const unchanged = (what) => {
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} ${what}, so its control would change nothing in the picture: drop it`, { remove: i });
    };

    if (WEB_RESTING.has(g.do)) {
      switch (g.do) {
        case "highlight":
          for (const m of own) if (!resting.accent.includes(m)) resting.accent.push(m);
          if (note) resting.notes.push({ index: i, do: g.do, marks: own, text: note });
          break;
        case "name":
          if (!resting.rings.includes(own[0])) resting.rings.push(own[0]);
          resting.notes.push({ index: i, do: g.do, marks: own, text: note ?? `${own[0]} ${F(valueOf.get(own[0]))}` });
          break;
        case "annotate":
          // An annotate with no words writes the row's value: the page adapts rather than refusing.
          resting.notes.push({ index: i, do: g.do, marks: own, text: note ?? `${own[0]} ${F(valueOf.get(own[0]))}` });
          break;
        case "reference": {
          const value = Number(g.value);
          resting.references.push({ index: i, value, text: note });
          laid.push(value);
          if (note) resting.notes.push({ index: i, do: g.do, marks: [], text: note });
          break;
        }
        case "count": {
          const counted = own.length ? own : names;
          resting.notes.push({ index: i, do: g.do, marks: own, text: note ?? F(sum(counted) + (own.length ? 0 : rest.sum)) });
          break;
        }
        default:
          // reveal and pull-back: their end state is the whole chart, which the resting page already is.
          if (g.do === "reveal") resting.reveal = true;
          if (note) resting.notes.push({ index: i, do: g.do, marks: [], text: note });
      }
      return;
    }

    const control = { index: i, do: g.do, ...WEB_CONTROLS[g.do], note, label: g.label === undefined ? undefined : String(g.label) };
    switch (g.do) {
      case "bracket": {
        // One row of the whole: every other row (and the rows not drawn) stacks onto it, so the bar it becomes is the
        // whole. A run of rows: they stack onto the first of them. Either way the bar's end prints the sum.
        const ofWhole = own.length === 1 && g.of === "whole";
        const members = ofWhole ? [own[0], ...names.filter((n) => n !== own[0])] : names.filter((n) => [...own, ...of].includes(n));
        const total = ofWhole ? whole : sum(members);
        const s = sum(ofWhole ? own : members);
        Object.assign(control, {
          base: members[0],
          stacked: members.slice(1),
          restStacked: ofWhole && rest.count > 0 ? rest.sum : 0,
          ofWhole,
          total,
          legend: ofWhole ? `${own[0]} / ${F(whole)}` : short(members),
          chip: ofWhole ? `${F(s)} / ${F(whole)}` : `= ${F(total)}`,
          pieces: ofWhole
            ? [`${F(s)} / ${F(whole)} = ${pct(s)}`, `${F(whole)} - ${F(s)} = ${F(whole - s)}`]
            : [`${members.map((m) => F(valueOf.get(m))).join(" + ")} = ${F(total)}`, `${pct(total)}`],
          question: ofWhole ? `How much of the ${F(whole)} in all is ${own[0]}'s?` : `What do ${members.join(", ")} add up to together?`,
          changes: ofWhole
            ? `Every other bar leaves its band and stacks onto ${own[0]}'s, which becomes the whole, ${F(whole)}, printed at its end.`
            : `The bracketed bars leave their bands and stack onto ${members[0]}'s, their sum printed at the end.`,
          parameter: `whether the bracket of gestures[${i}] is drawn`,
        });
        laid.push(total);
        break;
      }
      case "compare": {
        const subject = own[0];
        const against = own.length > 1 ? own.slice(1) : g.of === "whole" ? names.filter((n) => n !== subject) : of;
        const value = own.length > 1 ? sum(own.slice(1)) : g.of === "whole" ? whole : sum(of);
        const a = valueOf.get(subject);
        const label = g.of === "whole" && own.length === 1 ? F(whole) : short(against);
        Object.assign(control, {
          subject,
          against,
          value,
          legend: `${subject} / ${label}`,
          chip: `${F(a)} / ${F(value)}`,
          pieces: [
            ...(value !== 0 ? [`${F(a)} / ${F(value)} = ${fx(a / value)} ×`] : []),
            `${F(a)} - ${F(value)} = ${F(a - value)}`,
          ],
          question: `How long is ${subject} against ${label}?`,
          changes: `A copy of ${label}'s length is laid inside ${subject}'s band, from the same zero, its figure at its end.`,
          parameter: `whether gestures[${i}] lays ${label} against ${subject}`,
        });
        laid.push(value);
        break;
      }
      case "filter": {
        const kept = names.filter((n) => own.includes(n));
        if (!kept.length) {
          const value = entities.filter((e) => names.includes(e));
          throw new GestureRefusal(`gestures[${i}].marks`, `a filter keeps the rows the claim is about: name them`, {
            set: { index: i, field: "marks", value: value.length ? value : [names[0]] },
          });
        }
        if (kept.length === names.length) unchanged(`keeps every drawn row`);
        Object.assign(control, {
          kept,
          legend: short(kept),
          chip: `${kept.length} / ${names.length + rest.count}`,
          pieces: [`${kept.length} / ${names.length + rest.count}`, `${kept.map((m) => F(valueOf.get(m))).join(" + ")} = ${F(sum(kept))}`],
          question: `What do ${kept.join(", ")} look like without the others?`,
          changes: `The other bars and their names leave the plot; the scale and every remaining bar stay exactly where they were.`,
          parameter: `whether gestures[${i}] keeps only ${kept.join(", ")}`,
        });
        break;
      }
      case "reorder": {
        const by = (dir) => [...names].sort((x, y) => (dir === "ascending" ? valueOf.get(x) - valueOf.get(y) : valueOf.get(y) - valueOf.get(x)));
        const order = g.value === "ascending" || g.value === "descending" ? by(g.value) : own.length ? [...own, ...names.filter((n) => !own.includes(n))] : by("descending");
        if (order.every((n, k) => n === names[k])) unchanged(`asks for the order the rows already hold (${names.join(", ")})`);
        Object.assign(control, {
          order,
          legend: `${order[0]} - ${order.at(-1)}`,
          chip: `${F(valueOf.get(order[0]))} - ${F(valueOf.get(order.at(-1)))}`,
          pieces: [order.map((n, k) => `${k + 1}. ${n}`).join(" ")],
          question: `What does the ranking look like with ${order[0]} first?`,
          changes: `The same bars move into the new order, names with them; every length and the scale stay as they were.`,
          parameter: `the order gestures[${i}] asks for`,
        });
        break;
      }
      case "rescale":
      case "zoom":
        // Their tops are relative to the resting scale, known once every gesture has laid its length: set below.
        Object.assign(control, { own });
        break;
    }
    controls.push(control);
  });

  const lo = Math.min(0, ...laid);
  const hi = Math.max(0, ...laid.map(Math.abs)) || 1;

  for (const c of controls) {
    if (c.do !== "rescale" && c.do !== "zoom") continue;
    const g = gestures[c.index];
    if (c.do === "rescale") {
      const top = Math.max(Number(g.value) || 0, ...rows.map((r) => Math.abs(r.value)));
      if (top === hi) {
        throw new GestureRefusal(`gestures[${c.index}]`, `rescale to ${top} keeps the top the scale already has, so its control would change nothing in the picture: drop it`, { remove: c.index });
      }
      Object.assign(c, {
        top,
        factor: hi / top,
        legend: `0 - ${F(top)}`,
        chip: `0 - ${F(top)}`,
        pieces: [`0 - ${F(top)}`, `× ${fx(hi / top, 2)}`],
        question: `What do the bars look like on a scale that runs to ${F(top)}?`,
        changes: `The value scale's end moves to ${F(top)} and every bar takes its length on it; nothing else moves.`,
        parameter: `the top gestures[${c.index}] gives the value scale`,
      });
    } else {
      const top = Math.max(...c.own.map((m) => Math.abs(valueOf.get(m)))) || 1;
      const factor = hi / top;
      if (!(factor > 1.0001)) {
        throw new GestureRefusal(`gestures[${c.index}]`, `zoom onto ${c.own.join(", ")} keeps the scale it had, so its control would change nothing in the picture: drop it`, { remove: c.index });
      }
      // The printed factor is the zoom's own (no-let-camera-magnification): the note states it, at its precision.
      const printed = figuresIn(g.note);
      if (!printed.some((n) => Math.abs(n.value - factor) <= 0.5 * 10 ** -n.decimals + 1e-9)) {
        const n = printed[0];
        const fixed = factor.toFixed(n.decimals).replace(".", n.separator === "," ? "," : ".");
        const value = g.note.slice(0, n.index) + fixed + g.note.slice(n.index + n.raw.length);
        throw new GestureRefusal(
          `gestures[${c.index}].note`,
          `prints the factor ${n.raw}, but zooming onto ${c.own.join(", ")} enlarges the scale ×${factor.toFixed(2)}: write "${value}"`,
          { set: { index: c.index, field: "note", value } },
        );
      }
      Object.assign(c, {
        top,
        factor,
        legend: short(c.own),
        chip: `× ${fx(factor)}`,
        // The note already prints the factor (checked above): the derived reading is the window the scale now spans.
        pieces: [`0 - ${F(top)}`],
        question: `What do ${c.own.join(", ")} look like with the scale enlarged onto them?`,
        changes: `The value scale enlarges ×${fx(factor)} onto ${c.own.join(", ")}; longer bars run off the plot's end, the factor is printed.`,
        parameter: `the zoom of gestures[${c.index}] onto ${c.own.join(", ")}`,
      });
    }
  }

  return { resting, controls, lo, hi, whole };
}

/**
 * The interaction declaration renderWeb holds the page against: every bar answers a pointer, tap or key with what the
 * plate prints nowhere (its share of the whole, its rank), then ONE control per gesture beyond the resting state, in
 * story order. Generated, never written by the model; the words are English metadata (PATTERN.md).
 */
export function interactionPlan({ scheduled, rows, rest = { count: 0, sum: 0 }, subject }) {
  const HELD = [".chart-header", ".chart-source"];
  const n = rows.length + rest.count;
  const ask = {
    question: "What is this bar worth against the whole, and where does it rank?",
    gesture: "ask-a-mark",
    changes: "The bar steps one shade toward the ink and the answer prints its share of the whole and its rank.",
    parameter: "which bar is asked about",
    authorPicked: subject ?? rows[0].name,
    readerPicks: "every mark",
    heldStill: HELD,
  };
  const controls = scheduled.controls.map((c) => ({
    question: c.question,
    gesture: c.atom,
    changes: c.changes,
    parameter: c.parameter,
    // The still draws every gesture at once: it had to settle each control "on".
    authorPicked: "on",
    readerPicks: ["rest", "on"],
    heldStill: HELD,
  }));
  const asked = scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ");
  return {
    earns:
      `A still of these ${n} rows must draw every gesture at once on one plate and print a fixed set of figures. ` +
      `Here the reader lands on the resting picture and asks for each further gesture in turn — ${asked} — and every bar answers with its share of the whole and its rank.`,
    controls: [ask, ...controls],
  };
}

/**
 * The whole staging: the core (format "web"), the web mapping, the rows drawn, the scheduler and the declaration. With
 * `repair`, each refusal's fix is applied to the model's own list until it is accepted (at most `steps` times), and
 * every repair is returned so the run reports it; without, the first refusal is thrown.
 */
export function stageWeb({ gestures, rows, claim, format = String, capacity = CAPACITY, repair = false, steps = 12, controls = WEB_CONTROLS }) {
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid, entities } = validateGestures({ gestures: list, rows, family: "length", format: "web", claim });
      assertWebMapping(valid, controls);
      const { drawn, rest } = selectRows({ rows, gestures: valid, capacity });
      const scheduled = scheduleWeb({ gestures: valid, rows: drawn, rest, format, entities });
      const subject = scheduled.resting.accent[0] ?? entities.find((e) => drawn.some((r) => r.name === e)) ?? drawn[0].name;
      const interaction = interactionPlan({ scheduled, rows: drawn, rest, subject });
      return { gestures: list, valid, drawn, rest, scheduled, interaction, subject, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix });
      list = applyFix(list, error.fix);
    }
  }
}

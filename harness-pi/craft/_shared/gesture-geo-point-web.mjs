// The web scheduler of the point / line / field maps (craft/gestures/GRAMMAR.md §5): the gestures that can rest
// together form the page the reader lands on; every further gesture is ONE reader control, whose state is the resting
// state with that gesture applied — a declaration (the marks in the accent, ringed, stepped back; the camera; the
// notes) a live map realises as layer visibility and a camera, and a fallback realises as one photographed picture per
// control (renderLiveMapPage's `views`). The page is complete with JS off: the resting picture plus every control's
// note as text. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { printFactor } from "./gesture-geo-point-family.mjs";

/** Each control gesture as the chart-web atom that names it (skills/chart-web/assets/interaction-plan.ts). */
export const GEO_POINT_WEB_CONTROLS = {
  // The marks outside the set step back on the live layers; the camera does not move.
  filter: { atom: "filter-to-a-subset", question: "Which marks is the claim about?", changes: "The marks outside the set step back; the camera does not move." },
  // Two bands set side by side: both named, the second ringed, the note states the gap or the ratio.
  compare: { atom: "toggle-a-comparison", question: "How do these two compare?", changes: "Both marks are named and the second ringed; the note states the gap or the ratio." },
  // The camera travels to the close-up the gesture names; its factor is printed.
  zoom: { atom: "zoom-and-pan", question: "What does the close-up show that the whole map cannot?", changes: "The camera travels to the close-up; the factor it stands closer is printed." },
};

/** Refuses a gesture that neither rests nor maps to a control (a trace has no web atom on a map). */
export function assertGeoPointWebMapping(gestures, controls = GEO_POINT_WEB_CONTROLS) {
  gestures.forEach((g, i) => {
    if (WEB_RESTING.has(g.do) || controls[g.do]) return;
    throw new GestureRefusal(`gestures[${i}].do`, `${g.do} has no reader control on a map page; the page turns ${Object.keys(controls).join(", ")} into controls, and rests ${[...WEB_RESTING].join(", ")}`, { remove: i });
  });
}

/**
 * @param gestures validateGestures' gestures (marks resolved)
 * @param adapter  createGeoPoint(…)
 * @returns        { resting, controls: [{ index, do, atom, question, changes, state, note, factor }] }
 */
export function scheduleGeoPointWeb({ gestures, adapter, controls = GEO_POINT_WEB_CONTROLS }) {
  assertGeoPointWebMapping(gestures, controls);
  const restingList = gestures.map((g, i) => [g, i]).filter(([g]) => WEB_RESTING.has(g.do));
  let resting = adapter.rest();
  for (const [g, i] of restingList) resting = adapter.apply(resting, g, i);
  const implicit = implicitAccent(gestures);
  if (!resting.accent.length && implicit !== undefined) resting = { ...resting, accent: [implicit] };
  adapter.invariants([resting]);
  const out = gestures
    .map((g, i) => [g, i])
    .filter(([g]) => !WEB_RESTING.has(g.do))
    .map(([g, i]) => {
      const state = adapter.apply(resting, g, i);
      try {
        adapter.invariants([resting, state]);
      } catch (error) {
        throw new GestureRefusal(`gestures[${i}]`, `${error.message}: drop it`, { remove: i });
      }
      if (adapter.equal(state, resting))
        throw new GestureRefusal(`gestures[${i}]`, `${g.do} leaves the resting page as it was, so its control would change nothing: drop it`, { remove: i });
      return { index: i, do: g.do, ...controls[g.do], state, note: g.note, factor: state.factor };
    });
  return { resting, controls: out };
}

/** A control's legend and pill, language-neutral: the marks it acts on, and what it prints. A count is grouped the
 *  story's way ("72 / 8 900" in French, not "72 / 8900"). */
export function controlWords(c, adapter, format, label, lang = "en") {
  const names = [...new Set((c.state.kept ?? c.state.focus ?? c.state.named.slice(-2)).map((n) => label(n)))];
  const short = names.length > 3 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  const count = (n) => new Intl.NumberFormat(lang).format(n).replace(/\u202f/g, "\u00a0");
  if (c.do === "filter") return { legend: short, chip: `${count(c.state.kept.length)} / ${count(adapter.names.length)}` };
  if (c.do === "zoom") return { legend: short, chip: `×${printFactor(c.factor)}` };
  const [a, b] = c.state.named.slice(-2);
  return { legend: `${label(a)} / ${label(b)}`, chip: `${format(adapter.valueOf(a))} / ${format(adapter.valueOf(b))}` };
}

/** A reader control's legend. A group is named by its value in the data ("Nuclear"), which is the data's language,
 *  not the story's: the worked example printed "Nuclear" on a French page, and Qwen3.5-9B copied it
 *  (gx-proportional-symbol web, 2026-11-13). A legend that would print the subject's raw value needs a label. */
export function controlLegend(gesture, legend, beat, lang = "en") {
  if (gesture.label !== undefined) return gesture.label;
  const raw = beat.subject?.equals;
  if (raw !== undefined && String(legend) === String(raw))
    throw new Error(`gestures: the "${gesture.do}" control on "${raw}" would print the data's own word "${raw}" as its legend; add label: the words for "${raw}" in the story's language ("${lang}"), e.g. { do: "${gesture.do}", mark: "${raw}", label: "…", note: … }`);
  return legend;
}

/** Where a word on a mark starts: at its circle's edge (a word written from the centre sat over its own circle), and
 *  leftward in the right part of the picture so it stays inside. */
export function wordAnchor(w, box) {
  const leftward = (w.x - box.x) / box.w > 0.6;
  const r = w.r ?? 0;
  return { x: leftward ? w.x - r : w.x + r, leftward };
}

/** The corner a size key is seated in: the one whose key-sized box covers the fewest marks, bottom-left first. */
export function sizeKeyCorner(marks, key, whole) {
  const corners = {
    "bottom-left": [whole.x, whole.y + whole.h - key.h],
    "bottom-right": [whole.x + whole.w - key.w, whole.y + whole.h - key.h],
    "top-left": [whole.x, whole.y],
    "top-right": [whole.x + whole.w - key.w, whole.y],
  };
  const under = ([x, y]) => marks.filter((m) => m.x + (m.r ?? 0) >= x && m.x - (m.r ?? 0) <= x + key.w && m.y + (m.r ?? 0) >= y && m.y - (m.r ?? 0) <= y + key.h).length;
  return Object.entries(corners).reduce((best, [name, at]) => (under(at) < best.n ? { name, n: under(at) } : best), { name: "", n: Infinity }).name;
}

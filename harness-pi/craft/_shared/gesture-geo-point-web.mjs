// The web scheduler of the point / line / field maps (craft/gestures/GRAMMAR.md §5): the gestures that can rest
// together form the page the reader lands on; every further gesture is ONE reader control, whose state is the resting
// state with that gesture applied — a declaration (the marks in the accent, ringed, stepped back; the camera; the
// notes) a live map realises as layer visibility and a camera, and a fallback realises as one photographed picture per
// control (renderLiveMapPage's `views`). The page is complete with JS off: the resting picture plus every control's
// note as text. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";

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

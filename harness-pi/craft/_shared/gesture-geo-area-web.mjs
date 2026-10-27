// The web scheduler for the AREA maps (GRAMMAR.md §5): the gestures that can rest together (WEB_RESTING) compose the
// page the reader lands on — the same declaration the static plate draws — and every further gesture becomes ONE
// reader control (two native radios: the resting picture, and the picture with that gesture applied). A control's
// state is a WHOLE picture, the resting state plus that one gesture, never folded from another control. With
// JavaScript off the page is the resting picture with every control's note written out.
//
// Map controls: filter → `filter-to-a-subset` (the others wash toward the ground, nothing moves), compare →
// `toggle-a-comparison` (the second place ringed beside the subject, both named), zoom → `zoom-and-pan` (the camera
// frames the places, its factor printed). Anything else that is not resting has no map control and is refused with a
// fix that drops it. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { WEB_RESTING } from "./gesture-registry.mjs";
import { accentKey } from "./gesture-geo-area-static.mjs";

export const GEO_WEB_CONTROLS = {
  filter: { atom: "filter-to-a-subset", mechanism: "filter" },
  compare: { atom: "toggle-a-comparison", mechanism: "level" },
  zoom: { atom: "zoom-and-pan", mechanism: "scale" },
};

/**
 * @param valid  validateGestures' gestures (format "web")
 * @param geo    createGeo(...)
 * @returns      { resting, controls: [{ index, do, atom, label, state, note, reading }], interaction }
 */
export function scheduleGeoWeb({ valid, geo, format = String }) {
  let resting = geo.rest();
  const accent = accentKey(geo, valid);
  if (accent) resting = { ...resting, accent };
  const later = [];
  valid.forEach((g, i) => {
    if (WEB_RESTING.has(g.do)) resting = geo.apply(resting, g);
    else if (GEO_WEB_CONTROLS[g.do]) later.push([g, i]);
    else
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} has no reader control on a map page; the controls are ${Object.keys(GEO_WEB_CONTROLS).join(", ")}: drop it`, { remove: i });
  });
  const controls = later.map(([g, i]) => {
    const state = geo.apply(resting, g);
    if (geo.equal(state, resting))
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} on ${g.marks.join(", ")} leaves the page as it rests: drop it`, { remove: i });
    const keys = g.marks.map(geo.resolve);
    const names = keys.map((k) => geo.nameOf(k));
    // A reading the resting page does not hold: the kept places' span, the two values and their ratio, the factor.
    const vs = keys.map((k) => geo.valueOf(k));
    const reading =
      g.do === "filter"
        ? `${keys.length} · ${format(Math.min(...vs))} – ${format(Math.max(...vs))}`
        : g.do === "compare"
          ? `${names[0]} ${format(vs[0])} · ${names[1]} ${format(vs[1])} · ${(vs[0] / vs[1]).toFixed(1)}×`
          : String(g.note ?? "");
    const label = g.do === "filter" ? names.length <= 3 ? names.join(", ") : `${names.length} ${g.do}` : g.do === "compare" ? `${names[0]} / ${names[1]}` : names.join(", ");
    return { index: i, do: g.do, ...GEO_WEB_CONTROLS[g.do], label, state, note: g.note === undefined ? undefined : String(g.note), reading };
  });
  if (!controls.length) {
    const subject = resting.accent ?? geo.marks[0].key;
    throw new GestureRefusal("gestures", `a web page needs at least one gesture a reader asks for (filter, compare or zoom); every gesture here rests on the page`, {
      add: { at: valid.length, gesture: { do: "filter", marks: [geo.nameOf(subject)] } },
    });
  }
  const interaction = {
    earns: controls.map((c) => c.atom),
    controls: controls.map((c) => ({ id: `g${c.index}`, atom: c.atom, mechanism: c.mechanism, label: c.label })),
    ask: "ask-a-mark",
  };
  return { resting, controls, interaction };
}

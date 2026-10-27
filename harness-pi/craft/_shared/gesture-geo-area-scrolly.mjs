// The scrolly scheduler for the AREA maps (GRAMMAR.md §5): one card per gesture, the map interpolating between their
// states as the reader scrolls, then a closing card carrying the limits on the whole map (camera back, nothing washed,
// what was shown still ringed). States are the flat numeric records the video uses (gesture-geo-area-video.mjs
// flatGeoState), plus the camera as a view box `vx, vy, vw, vh` the page's renderer measures from the layout, so
// the scaffold's linear interpolation moves the camera too.
//
// Every card's prose is checked like a note: a number in it must be one its gesture draws (the core's figures), one
// of the takeaway's, or a fact of the gesture's own places — else the card is refused with its gesture's own note as
// the fix (or dropped). Browser-safe; the drive below is ONE self-contained function (inlined by toString()).
import { figuresIn, GestureRefusal } from "./gesture-core.mjs";
import { accentKey } from "./gesture-geo-area-static.mjs";
import { flatGeoState } from "./gesture-geo-area-video.mjs";

export const GEO_APPLY = "applyGeoAreaState";

const formsOf = (card) => [card ?? []].flat().map(String).filter((t) => t.trim());

/**
 * @param valid  validateGestures' gestures (format "scrolly")
 * @param geo    createGeo(...)
 * @param claim  the claim the core checked against (takeaway, facts)
 * @param viewOf (state) → { vx, vy, vw, vh }: the camera box for a state (its close-up, else the whole map)
 * @returns      { cards: [{ id, gesture, prose, state }], states }
 */
export function scheduleGeoScrolly({ valid, geo, claim = {}, viewOf = () => ({ vx: 0, vy: 0, vw: 1, vh: 1 }) }) {
  const accent = accentKey(geo, valid);
  // A reveal brings the classes in, lowest first: before it the map stands without them.
  let s = { ...geo.rest(), accent, ...(valid.some((g) => g.do === "reveal") ? { classesShown: 0 } : {}) };
  const cards = [];
  const takeaway = figuresIn(claim.takeaway).map((n) => n.value);
  valid.forEach((g, i) => {
    const before = s;
    s = geo.apply(s, g);
    // A card whose map is the card before's gives the reader nothing to see change (the scaffold refuses it too).
    if (i > 0 && geo.equal(before, s))
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} leaves the map as the card before left it: drop it, or fold its words into that card`, { remove: i });
    const prose = formsOf(g.card).length ? formsOf(g.card) : g.note ? [String(g.note)] : [];
    if (!prose.length)
      throw new GestureRefusal(`gestures[${i}].card`, `every scrolly gesture carries the words of its card: give card (forms, longest first)`, {
        set: { index: i, field: "card", value: [g.note ?? geo.nameOf(g.marks?.[0] ?? geo.marks[0].key)] },
      });
    const known = [...(g.figures ?? []), ...takeaway, ...(g.marks ?? []).flatMap((m) => claim.facts?.[m] ?? []), ...figuresIn(g.note).map((n) => n.value)];
    for (const form of prose)
      for (const n of figuresIn(form)) {
        const ok = known.some((f) => [0, -3, -6, 3, 6, -2, 2].some((k) => Math.abs(n.value - f * 10 ** k) <= 0.5 * 10 ** -n.decimals + 1e-9));
        if (!ok)
          throw new GestureRefusal(`gestures[${i}].card`, `the card states ${n.raw}, which this ${g.do} does not draw: write the card from its own note`, {
            set: { index: i, field: "card", value: g.note ? [String(g.note)] : undefined },
          });
      }
    cards.push({ id: `g${i}-${g.do}`, gesture: i, prose, state: s });
  });
  const closing = { ...s, camera: "whole", focus: null, factor: null, kept: null };
  // The closing card pulls back to the whole map; when the last card already stands there, the limits are folded
  // into that last card instead of a card that would change nothing.
  if (geo.equal(closing, s)) cards[cards.length - 1].limits = true;
  else cards.push({ id: "limits", gesture: null, prose: null, state: closing });
  // The scaffold needs the map to evolve through at least three cards (two leave the scroll still at both ends).
  if (cards.length < 3) {
    const subject = accent ? geo.nameOf(accent) : geo.marks[0].name;
    throw new GestureRefusal("gestures", `this staging gives ${cards.length} cards and a scrolly needs at least 3: add a gesture the map shows changing, e.g. a filter on the places the claim is about`, {
      add: { at: valid.length, gesture: { do: "filter", marks: [subject], card: [subject] } },
    });
  }
  const states = cards.map((c) => ({ ...flatGeoState(geo, c.state), ...viewOf(c.state) }));
  return { cards, states };
}

/**
 * Paints one interpolated state onto the map SVG: SELF-CONTAINED (inlined alone). Cells and dots carry
 * data-geo-key / data-geo-dot with their class fill and washed fill in data-fill / data-back; rings, names and floor
 * outlines carry data-geo-ring / data-geo-name / data-geo-floor (+ data-kind="accent|ink" on rings); the camera is the
 * SVG's viewBox.
 */
export function applyGeoAreaState(root, state, context) {
  const svg = root.querySelector("svg[data-geo-map]");
  if (!svg) return;
  const mixHex = (a, b, t) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
  };
  const num = (k) => (typeof state[k] === "number" ? state[k] : 0);
  if (context.resized || !root.__geo) {
    root.__geo = {
      cells: [...svg.querySelectorAll("[data-geo-key]")],
      dots: [...svg.querySelectorAll("[data-geo-dot]")],
      rings: [...svg.querySelectorAll("[data-geo-ring]")],
      names: [...svg.querySelectorAll("[data-geo-name]")],
      floors: [...svg.querySelectorAll("[data-geo-floor]")],
    };
  }
  const g = root.__geo;
  const classes = num("classes");
  for (const el of g.cells) {
    const key = el.getAttribute("data-geo-key");
    const k = Number(el.getAttribute("data-geo-class"));
    const path = el.querySelector("path") || el;
    const fill = el.getAttribute("data-fill");
    const back = el.getAttribute("data-back");
    const land = el.getAttribute("data-land");
    if (!fill) continue;
    let colour = mixHex(fill, back, Math.max(0, Math.min(1, num(`b:${key}`))));
    // Classes arrive lowest first: class k is in at classes ≥ k + 1.
    if (Number.isFinite(k) && land) colour = mixHex(land, colour, Math.max(0, Math.min(1, classes - k)));
    path.setAttribute("fill", colour);
    // A code printed in its cell takes the ink that reads on the fill it now shows.
    const code = el.querySelector("text[data-ink-back]");
    if (code) code.setAttribute("fill", num(`b:${key}`) > 0.5 ? code.getAttribute("data-ink-back") : code.getAttribute("data-ink-fill"));
  }
  for (const el of g.dots) {
    const key = el.getAttribute("data-geo-dot");
    el.setAttribute("opacity", String(1 - 0.7 * Math.max(0, Math.min(1, num(`b:${key}`)))));
  }
  for (const el of g.rings) {
    const key = el.getAttribute("data-geo-ring");
    const kind = el.getAttribute("data-kind") === "accent" ? "a" : "r";
    el.setAttribute("opacity", String(Math.max(0, Math.min(1, num(`${kind}:${key}`)))));
  }
  for (const el of g.names) el.setAttribute("opacity", String(Math.max(0, Math.min(1, num(`n:${el.getAttribute("data-geo-name")}`)))));
  for (const el of g.floors) el.setAttribute("opacity", String(Math.max(0, Math.min(1, num(`f:${el.getAttribute("data-geo-floor")}`)))));
  if (typeof state.vw === "number" && state.vw > 0) {
    svg.setAttribute("viewBox", `${state.vx} ${state.vy} ${state.vw} ${state.vh}`);
    // Words and rings keep their size on screen while the camera closes in: they are scaled by the view's width.
    const s = state.vw / Number(svg.getAttribute("data-frame-w") || state.vw);
    for (const el of g.names) {
      const fs = Number(el.getAttribute("data-fs"));
      if (!fs) continue;
      el.setAttribute("font-size", String(fs * s));
      el.setAttribute("y", String(Number(el.getAttribute("data-sy")) + Number(el.getAttribute("data-dy")) * s));
      el.setAttribute("stroke-width", String(3 * s));
    }
    for (const el of svg.querySelectorAll("[data-r0]")) el.setAttribute("r", String(Number(el.getAttribute("data-r0")) * s));
  }
}

export const geoDriveSource = () => applyGeoAreaState.toString();

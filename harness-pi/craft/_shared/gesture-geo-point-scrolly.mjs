// The scrolly scheduler of the point / line / field maps (craft/gestures/GRAMMAR.md §5): one card per gesture, in
// story order, then a closing card standing at the whole camera with the limits. A card's state is the declaration
// the drive realises on the page (marks in the accent, ringed, stepped back; the camera; the notes; how many marks
// have arrived); between two cards the scroll interpolates the camera LINEARLY in Web-Mercator numbers, and a card's
// words show only once its camera has landed. The drive (`applyGeoPointState`) is one self-contained function, inlined
// into the page by toString(): it reads only its arguments. Browser-safe: no Node module.
import { GestureRefusal, implicitAccent } from "./gesture-core.mjs";

export const APPLY = "applyGeoPointState";

/**
 * @param gestures validateGestures' gestures
 * @param adapter  createGeoPoint(…)
 * @returns        { cards: [{ index, do, state, camera, note }], closing: { state, camera } }
 */
export function scheduleGeoPointScrolly({ gestures, adapter }) {
  const implicit = implicitAccent(gestures);
  let s = gestures[0]?.do === "reveal" ? { ...adapter.rest(), shown: 0 } : adapter.rest();
  const cards = [];
  const cameraOf = (state) => (state.camera === "closeUp" ? adapter.closeUpOn(state.focus) : adapter.cameras.whole);
  gestures.forEach((g, i) => {
    const next = adapter.apply(s, g, i);
    const withAccent = !next.accent.length && implicit !== undefined ? { ...next, accent: [implicit] } : next;
    try {
      adapter.invariants([s, withAccent]);
    } catch (error) {
      throw new GestureRefusal(`gestures[${i}]`, `${error.message}: drop it`, { remove: i });
    }
    if (i > 0 && g.do !== "pull-back" && adapter.equal(withAccent, s))
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} leaves the picture as the card before it left it: a card that changes nothing is dead scroll. Drop it`, { remove: i });
    cards.push({ index: i, do: g.do, state: withAccent, camera: cameraOf(withAccent), note: g.note });
    s = withAccent;
  });
  const closingState = { ...s, camera: "whole", focus: null, factor: null, kept: null, shown: adapter.marks.length };
  return { cards, closing: { state: closingState, camera: adapter.cameras.whole } };
}

/**
 * The scroll's states: one flat record of finite numbers per card (the scaffold interpolates them linearly). For every
 * mark i — a{i} accent, g{i} ringed, b{i} stepped back, h{i} not yet arrived; for every word k any card prints —
 * w{k} shown; for every reference line j — f{j} drawn; and the camera box vx, vy, vw, vh in the plate's view units.
 * @param pictures one picture per card (the closing card last): { roles, focus, factor, notes, named }
 * @param words    the union of every card's words, as wordsOf gives them (the drawing's own list)
 */
export function flatStates({ pictures, geometry, words, boxOf }) {
  const refs = geometry.references ?? [];
  return pictures.map((p, c) => {
    const box = boxOf(geometry, p.focus, p.factor);
    const on = new Set(words.filter((w) => w.cards.includes(c)).map((w) => w.k));
    const s = {};
    geometry.marks.forEach((m, i) => {
      s[`a${i}`] = p.roles.accent.includes(m.name) ? 1 : 0;
      s[`g${i}`] = p.roles.rings.includes(m.name) ? 1 : 0;
      s[`b${i}`] = p.roles.back.includes(m.name) ? 1 : 0;
      s[`h${i}`] = p.roles.hidden.includes(m.name) ? 1 : 0;
    });
    words.forEach((w) => (s[`w${w.k}`] = on.has(w.k) ? 1 : 0));
    refs.forEach((r, j) => (s[`f${j}`] = p.roles.lines.includes(r.value) ? 1 : 0));
    Object.assign(s, { vx: box.x, vy: box.y, vw: box.w, vh: box.h });
    return s;
  });
}

/**
 * The drive: one interpolated state painted on the page. SELF-CONTAINED (inlined by toString(); `fitViewBox` is the
 * scrolly scaffold's own, in scope on the page): the camera box is fitted to the stage, each mark's colour follows its
 * accent / ring flags and its opacity its step-back and arrival, each word is seated over its mark in the reader's
 * pixels and shown only while its flag holds and the camera is not travelling.
 */
export function applyGeoPointState(root, state, context) {
  const carrier = root.querySelector("[data-geopoint]");
  if (!carrier) return;
  if (context.resized || !root.__geo) {
    const data = JSON.parse(carrier.getAttribute("data-geopoint"));
    root.__geo = {
      data,
      stage: root.querySelector('[data-part="stage"]'),
      svg: root.querySelector('[data-part="field"]'),
      marks: data.marks.map((_, i) => root.querySelector(`[data-geo-i="${i}"]`)),
      words: data.words.map((w) => root.querySelector(`[data-word="${w.k}"]`)),
      refs: (data.refs || []).map((_, j) => root.querySelector(`[data-reference-i="${j}"]`)),
    };
  }
  const c = root.__geo;
  const SW = c.stage.clientWidth;
  const SH = c.stage.clientHeight;
  if (!(SW > 0 && SH > 0)) return;
  const fit = typeof fitViewBox === "function" ? fitViewBox : (box) => box;
  const vb = fit({ x: state.vx, y: state.vy, w: state.vw, h: state.vh }, { width: SW, height: SH }, { top: 8, right: 8, bottom: 8, left: 8 });
  c.svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  // Words exist only at a camera a card stands at: between two card cameras the picture travels and holds no words.
  const travelling = !c.data.cams.some((cam) => Math.abs(cam.vx - state.vx) < 0.5 && Math.abs(cam.vy - state.vy) < 0.5 && Math.abs(cam.vw - state.vw) < 0.5);
  c.data.marks.forEach((m, i) => {
    const el = c.marks[i];
    if (!el) return;
    const ink = state[`a${i}`] > 0.5 ? c.data.inks.accent : state[`g${i}`] > 0.5 ? c.data.inks.ring : c.data.inks.neutral;
    if (m.kind !== "summit" && m.kind !== "subject" && m.kind !== "point") el.setAttribute("stroke", ink);
    const base = m.kind === "circle" && !(state[`a${i}`] > 0.5 || state[`g${i}`] > 0.5) ? 0.75 : 1;
    el.setAttribute("opacity", String(base * (1 - 0.78 * state[`b${i}`]) * (1 - state[`h${i}`])));
  });
  c.refs.forEach((el, j) => el && el.setAttribute("opacity", String(state[`f${j}`])));
  c.data.words.forEach((w, k) => {
    const el = c.words[k];
    if (!el) return;
    const x = ((w.x - vb.x) / vb.w) * SW;
    const y = ((w.y - vb.y) / vb.h) * SH;
    const inside = x > 4 && x < SW - 40 && y > 8 && y < SH - 8;
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, opacity: String(!travelling && inside ? state[`w${w.k}`] : 0) });
  });
}

export const driveSource = () => applyGeoPointState.toString();

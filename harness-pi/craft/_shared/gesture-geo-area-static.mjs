// The static scheduler for the AREA maps (choropleth, tile cartogram, hex cartogram, dot density): every gesture's
// state composed onto ONE plate. The gestures are validated by the core with the geo family's hooks, folded into geo
// states in story order (gesture-family-geo.mjs `apply`), held to the family's locks, and returned as the plate's
// DECLARATION — who carries the accent, who is ringed, named, kept or stepped back, which class floor is outlined,
// and every note with the places it is written on. The per-type executor (a baked plan, an SVG grid) realises it.
// A temporal gesture (reveal, pull-back) draws its end state; a still has no zoom (the registry refuses it).
// Browser-safe: no Node module.
import { applyFix, figuresIn, GestureRefusal, implicitAccent, validateGestures } from "./gesture-core.mjs";

/**
 * Validates a list for a geo beat, applying each refusal's fix when `repair` is on (SPLASH_GESTURE_REPAIR=1), and
 * returns the accepted list with every repair named. `stage(valid)` may throw a GestureRefusal of its own (a
 * format's conflict); it is repaired the same way.
 */
export function stageGeo({ gestures, geo, format, claim, repair = false, steps = 12, stage = (v) => v }) {
  claim = withEntity(claim, geo);
  let list = structuredClone(gestures ?? []);
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const checked = validateGestures({ gestures: list, rows: geo.marks, family: "geo", format, claim, hooks: geo.hooks });
      const valid = checked.gestures;
      const entities = checked.entities;
      return { gestures: list, valid, entities, staged: stage(valid), repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push(`${error.message} → ${JSON.stringify(error.fix)}`);
      list = applyFix(list, error.fix);
    }
  }
}

const foldWords = (t) => ` ${String(t ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;

/**
 * The subject the journalist named in their subject answer ("la Tchéquie") wins over the first place the takeaway
 * names: "ce n'est pas l'Allemagne : la Tchéquie…" names Germany first, and the accent belongs to Czechia. With no
 * subject answer naming a place, the core's own choice (the first place the takeaway names, by whole word) stands.
 */
function withEntity(claim, geo) {
  if (claim.entity) return claim;
  const subj = foldWords(claim.subject);
  const bySubject = geo.marks.find((m) => [m.name, m.key].some((w) => subj.includes(foldWords(w))));
  return bySubject ? { ...claim, entity: bySubject.name } : claim;
}

/** The accent a list leaves (the takeaway's subject), as a key. */
export function accentKey(geo, valid) {
  const name = implicitAccent(valid) ?? valid.find((g) => g.do === "highlight")?.marks?.[0];
  if (name === undefined) return null;
  try {
    return geo.resolve(name);
  } catch {
    return null;
  }
}

/**
 * @param valid  validateGestures' gestures
 * @param geo    createGeo(...)
 * @returns      the plate: { state, accent, rings, named, kept, stepBack, floor, notes, keep } — keys throughout
 */
export function composeGeoStatic({ valid, geo, format = String }) {
  const states = [];
  let state = geo.rest();
  const accent = accentKey(geo, valid);
  if (accent) state = { ...state, accent };
  const noted = new Set();
  valid.forEach((g, i) => {
    const next = geo.apply(state, g);
    // A gesture that leaves the plate as it was changes nothing (a highlight on the already-accented place).
    if (geo.equal(state, next) && !["reveal", "pull-back"].includes(g.do))
      throw new GestureRefusal(`gestures[${i}]`, `${g.do} on ${g.marks.join(", ") || "the map"} leaves the plate as it was: drop it`, { remove: i });
    // Every note is drawn at once on a still: one note per place.
    for (const n of next.notes.slice(state.notes.length)) {
      const keys = n.keys ?? (n.key ? [n.key] : ["__map"]);
      const own = n.kind === "filter" ? ["__filter"] : n.kind === "reference" ? ["__reference"] : n.kind === "whole" ? ["__whole"] : n.kind === "compare" ? [`__compare${i}`] : keys;
      if (own.some((k) => noted.has(k)))
        throw new GestureRefusal(`gestures[${i}].note`, `${own[0].startsWith("__") ? `another ${g.do}` : geo.nameOf(own[0])} already carries a note, and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
          set: { index: i, field: "note", value: undefined },
        });
      own.forEach((k) => noted.add(k));
    }
    state = next;
    states.push(state);
  });
  geo.invariants(states);
  // A note that only repeats the value printed for the place is not a second note.
  const notes = state.notes.filter((n) => !(n.key && String(n.text).trim() === format(geo.valueOf(n.key))));
  const all = geo.marks.map((m) => m.key);
  return {
    state,
    states,
    accent: state.accent,
    rings: state.rings.filter((k) => k !== state.accent),
    named: [...new Set([...state.named, ...(state.accent ? [state.accent] : [])])],
    kept: state.kept,
    stepBack: state.kept ? all.filter((k) => !state.kept.includes(k)) : [],
    floor: state.floor,
    floorValue: state.floor === null ? null : geo.breaks[state.floor - 1] ?? null,
    notes,
    // Every place a gesture acts on stays drawn and named whatever the ladder drops.
    keep: [...new Set([state.accent, ...state.rings, ...state.named, ...(state.kept ?? [])].filter(Boolean))],
  };
}

/** The sentence forms a plate's callout box prints: every note in story order, then shorter forms. */
export function calloutForms(plate) {
  const texts = plate.notes.map((n) => String(n.text).trim()).filter(Boolean);
  if (!texts.length) return [];
  const end = (t) => (/[.!?…]$/.test(t) ? t : `${t}.`);
  const forms = [texts.map(end).join(" ")];
  for (let k = texts.length - 1; k >= 1; k--) forms.push(texts.slice(0, k).map(end).join(" "));
  return [...new Set(forms)];
}

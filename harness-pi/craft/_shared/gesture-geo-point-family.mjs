// The POINT / LINE / FIELD maps of the Geo family (craft/gestures/GRAMMAR.md §4 F8, §6; research/families.md §4):
// proportional symbol, flow (origin → destinations fan), locator and contour. The family itself (FAMILIES.geo, its
// gesture list, additive: false, cameras) is gesture-family-geo.mjs's, which this module imports and never edits; this
// module registers the four variants there and adds what a point, a band or a field needs that a class map does not:
//
//   · marks from the beat's own rows: a symbol per place (`#rank`, grouped by its group column and its place column),
//     a band per destination (keyed by ISO3), the subject and the settlements of a locator (valued by their distance
//     to the subject, the one figure a locator draws), the isolines and the summit of a contour field;
//   · cameras: `whole` (every mark), `closeUp` (a zoom's marks) — Web-Mercator numbers from the family's fitCamera,
//     so the factor a zoom prints is COMPUTED and checked (no-let-camera-magnification);
//   · the declaration a gesture compiles to — a flat state every executor (baked plate + SVG, live MapLibre, a video
//     plan, a scrolly drive) realises its own way — never a draw call;
//   · the family hooks the core runs (figures, refuse).
//
// Browser-safe: no Node module (the video bundle and the scrolly drive import it).
import { GestureRefusal, applyFix, figuresIn, validateGestures } from "./gesture-core.mjs";
import { fitCamera, registerGeoVariant, zoomFactor } from "./gesture-family-geo.mjs";

/** slug → the variant's short id, as the components' `variant` prop names it. */
export const POINT_VARIANTS = {
  "proportional-symbol-symbol-bubble-map": "symbol",
  "flow-map-route-and-origin-destination": "flow",
  locator: "locator",
  "contour-isoline": "contour",
};
export const variantOf = (slugOrId) => POINT_VARIANTS[slugOrId] ?? (Object.values(POINT_VARIANTS).includes(slugOrId) ? slugOrId : null);
const slugOf = (id) => Object.keys(POINT_VARIANTS).find((s) => POINT_VARIANTS[s] === id);

/**
 * What each variant draws, in all four formats (the registry drops zoom from static: a still has no camera move).
 * Fewer drawn well: a symbol map has no compare (two circles' areas are not read side by side), a flow fan never moves
 * its camera (it is fitted to the fan), a locator draws no value and no subset, a contour field has no rows to keep.
 */
export const POINT_GESTURES = {
  symbol: ["highlight", "name", "annotate", "filter", "zoom", "reveal", "pull-back"],
  flow: ["highlight", "name", "annotate", "compare", "filter", "reveal", "pull-back"],
  locator: ["highlight", "name", "annotate", "zoom", "reveal", "pull-back"],
  contour: ["highlight", "name", "annotate", "reference", "zoom", "reveal", "pull-back"],
};
registerGeoVariant(slugOf("symbol"), { gestures: POINT_GESTURES.symbol, basemap: "plate", seat: "point" });
registerGeoVariant(slugOf("flow"), { gestures: POINT_GESTURES.flow, basemap: "plate", seat: "centroid" });
registerGeoVariant(slugOf("locator"), { gestures: POINT_GESTURES.locator, basemap: "plate", seat: "point" });
registerGeoVariant(slugOf("contour"), { gestures: POINT_GESTURES.contour, basemap: "plate", seat: "point" });

/** Counts and amounts add up (people, MW); a distance or a field level does not. */
export const SUMS = { symbol: true, flow: true, locator: false, contour: false };

// ── marks ─────────────────────────────────────────────────────────────────────────────────────────

const EARTH_KM = 6371.0088;
const RAD = Math.PI / 180;
/** Great-circle distance in km. */
export function kmBetween([lon1, lat1], [lon2, lat2]) {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The core's marks for a variant, from rows the kit has already read and joined:
 *   symbol   points [{ value, lon, lat, group, place? }] → { name: "site <rank>", value, series: group, key: place }:
 *            a gesture names one circle by its rank ("site 1", the largest), every circle of a group ("Nuclear") or of a place ("France")
 *   flow     bands [{ key: ISO3, name, value, lon, lat }] → { name, value, key }
 *   locator  places [{ name, lon, lat, subject? }] → { name, value: km to the subject, lon, lat }
 *   contour  { levels: [{ name, value }], summit: { name, value, lon, lat } } → the lines and the summit
 * Never refuses the data's shape: any count, long names, ties (a tie keeps the data's order).
 */
export function pointMarks(variant, input) {
  switch (variant) {
    case "symbol": {
      const ranked = input.map((p, i) => ({ ...p, i })).sort((a, b) => b.value - a.value || a.i - b.i);
      return ranked.map((p, r) => ({
        name: `site ${r + 1}`,
        value: p.value,
        series: String(p.group),
        ...(p.place !== undefined && p.place !== "" ? { key: String(p.place) } : {}),
        lon: p.lon,
        lat: p.lat,
      }));
    }
    case "flow":
      return input.map((b) => ({ name: String(b.name), value: b.value, key: String(b.key), lon: b.lon, lat: b.lat }));
    case "locator": {
      const subject = input.find((p) => p.subject) ?? input[0];
      const seen = new Set();
      return input
        .filter((p) => !seen.has(p.name) && seen.add(p.name))
        .map((p) => ({ name: String(p.name), value: Math.round(kmBetween([subject.lon, subject.lat], [p.lon, p.lat])), lon: p.lon, lat: p.lat, ...(p === subject ? { subject: true } : {}) }));
    }
    case "contour":
      return [...input.levels.map((l) => ({ name: String(l.name), value: l.value, line: true })), { name: String(input.summit.name), value: input.summit.value, lon: input.summit.lon, lat: input.summit.lat }];
    default:
      throw new Error(`no point variant "${variant}" (symbol, flow, locator, contour)`);
  }
}

// ── the adapter ───────────────────────────────────────────────────────────────────────────────────

/** The nominal viewport cameras are fitted in: a factor is a ratio of two fits in one viewport, whatever its size. */
const VIEWPORT = { width: 1000, height: 760 };

/**
 * @param variant  symbol | flow | locator | contour
 * @param marks    pointMarks(variant, …)
 * @param bounds   [[west, south], [east, north]] the whole camera holds (the kit's own box); else every mark
 * @param span     degrees either side of ONE mark a close-up holds ({ lon, lat }; the locator's span)
 * @param field    contour only: { within(km) → % of land, deepest } — what a reference line's note may state
 */
export function createGeoPoint({ variant, marks, bounds = null, span = { lon: 2.5, lat: 1.6 }, field = null }) {
  if (!POINT_GESTURES[variant]) throw new Error(`no point variant "${variant}"`);
  const byName = new Map(marks.map((m) => [m.name, m]));
  const names = marks.map((m) => m.name);
  const positioned = marks.filter((m) => Number.isFinite(m.lon) && Number.isFinite(m.lat));
  const box = bounds
    ? [bounds[0], [bounds[1][0], bounds[0][1]], bounds[1], [bounds[0][0], bounds[1][1]]]
    : positioned.map((m) => [m.lon, m.lat]);
  const WHOLE = box.length ? fitCamera(box, { ...VIEWPORT, pad: 0.04 }) : { camX: 0.5, camY: 0.5, camZoom: 0 };
  // Ranked as the reveal brings them: largest first (symbol, flow), nearest first (locator), lowest line first (contour).
  const order = [...marks].sort((a, b) => (variant === "locator" || variant === "contour" ? a.value - b.value : b.value - a.value)).map((m) => m.name);

  /** The close-up camera on a set of marks: their box, or a span around one. Never closer than z 7. */
  function closeUpOn(ids) {
    const at = ids.map((n) => byName.get(n)).filter((m) => m && Number.isFinite(m.lon));
    if (!at.length) return null;
    const pts = at.length === 1
      ? [[at[0].lon - span.lon, at[0].lat - span.lat], [at[0].lon + span.lon, at[0].lat + span.lat]]
      : at.map((m) => [m.lon, m.lat]);
    const cam = fitCamera(pts, { ...VIEWPORT, pad: 0.12 });
    return { ...cam, camZoom: Math.max(WHOLE.camZoom, cam.camZoom) };
  }
  /** The factor a zoom onto these marks prints, from the two cameras (never typed). */
  const factorOf = (ids) => {
    const c = closeUpOn(ids);
    return c ? zoomFactor(WHOLE, c) : null;
  };

  // A state is a flat record every executor reads:
  //   camera   "whole" | "closeUp" — the only two cameras words are measured at
  //   focus    the marks a close-up holds (null at whole); factor its printed factor (a number)
  //   accent   the marks in the one accent (the subject: one row, or one group of circles)
  //   rings    marks ringed in ink (a highlight off the subject, a compare's second band)
  //   named    marks printed with their name and value
  //   notes    [{ index, do, marks, text, kind: "mark" | "pair" | "set" | "line" }]
  //   kept     the marks that keep their ink (a filter), or null
  //   lines    reference levels drawn as their own isoline (contour): [{ value, text }]
  //   shown    how many marks have arrived, in `order` (reveal moves it to all)
  const rest = () => ({ camera: "whole", focus: null, factor: null, accent: [], rings: [], named: [], notes: [], kept: null, lines: [], shown: marks.length });
  const uniq = (xs) => [...new Set(xs)];

  /** One validated gesture (marks resolved by the core) applied to a state: its declaration. */
  function apply(state, g, index = 0) {
    const own = g.marks ?? [];
    const s = { ...state, accent: [...state.accent], rings: [...state.rings], named: [...state.named], notes: [...state.notes], lines: [...state.lines] };
    const note = (kind, on = own) => g.note !== undefined && s.notes.push({ index, do: g.do, marks: on, text: String(g.note), kind });
    const subject = g.subject;
    switch (g.do) {
      case "highlight":
        // One accent carries the subject; a highlight on another mark rings it (emphasis by ring, never a 2nd hue).
        if (subject === undefined || own.includes(subject)) s.accent = uniq([...s.accent, ...own]);
        else s.rings = uniq([...s.rings, ...own]);
        note(own.length > 1 ? "set" : "mark");
        break;
      case "name":
        s.named = uniq([...s.named, own[0]]);
        if (!s.accent.includes(own[0])) s.rings = uniq([...s.rings, own[0]]);
        note("mark", [own[0]]);
        break;
      case "annotate":
        note("mark", [own[0]]);
        break;
      case "compare":
        s.named = uniq([...s.named, ...own.slice(0, 2)]);
        s.rings = uniq([...s.rings, ...own.slice(1, 2).filter((m) => !s.accent.includes(m))]);
        note("pair", own.slice(0, 2));
        break;
      case "filter":
        s.kept = own;
        note("set");
        break;
      case "reference":
        s.lines.push({ value: Number(g.value), text: g.note });
        break;
      case "zoom":
        s.camera = "closeUp";
        s.focus = own;
        s.factor = factorOf(own);
        break;
      case "reveal":
        s.shown = marks.length;
        break;
      case "pull-back":
        // The frame returns to the whole, the step-back lifts; what was shown stays marked.
        s.camera = "whole";
        s.focus = null;
        s.factor = null;
        s.kept = null;
        s.shown = marks.length;
        break;
      default:
        throw new Error(`${g.do} is not a ${variant} gesture`);
    }
    return s;
  }
  const fold = (gestures, from = rest()) => gestures.reduce((acc, g, i) => [...acc, apply(acc.at(-1), g, i)], [from]).slice(1);
  const normal = (s) => JSON.stringify({ ...s, accent: [...s.accent].sort(), rings: [...s.rings].sort(), named: [...s.named].sort(), kept: s.kept && [...s.kept].sort(), notes: s.notes.map((n) => n.text) });
  const equal = (a, b) => normal(a) === normal(b);

  /**
   * The family's locks: a close-up prints its factor (no-let-camera-magnification); one accent — the accent is never
   * spent on two groups (no-spend-accent-country); a filter keeps something.
   */
  function invariants(states) {
    states.forEach((s, i) => {
      if (s.camera === "closeUp" && !(s.factor > 0)) throw new Error(`state ${i} stands at a close-up whose factor cannot be computed (its marks carry no position)`);
      if (s.kept && !s.kept.length) throw new Error(`state ${i} keeps no mark`);
      const groups = new Set(s.accent.map((n) => byName.get(n)?.series ?? n));
      if (variant === "symbol" && groups.size > 1) throw new Error(`state ${i} spends the accent on ${[...groups].join(" and ")}: one accent carries one subject (no-spend-accent-country)`);
    });
  }

  // ── the core's hooks ──
  const sum = (ids) => ids.reduce((t, n) => t + (byName.get(n)?.value ?? 0), 0);
  const hooks = {
    /**
     * The figures a point gesture draws beyond its marks' values: the count of the set a highlight or filter acts on,
     * and — where the values add up (people, MW) — its sum; a reference line's share of land within it (contour).
     */
    figures(g, { marks: ids = [] }) {
      const out = [];
      // Only a gesture on a SET states how many it holds and what they add up to: a count offered on one mark, or on a
      // compare's pair, would let a repair print "2,0 times" for a ratio of 1.3.
      if ((g.do === "highlight" || g.do === "filter") && ids.length > 1) {
        out.push(ids.length);
        if (SUMS[variant]) out.push(sum(ids));
      }
      if (g.do === "reference" && field) out.push(field.within(Number(g.value)), 100 - field.within(Number(g.value)));
      if (g.do === "reveal" || g.do === "pull-back") out.push(marks.length);
      return out;
    },
    /**
     * Point-map conflicts: a gesture this variant does not draw (the geo hook's own list), a zoom whose printed factor
     * is not the factor the cameras give, a zoom onto a contour line (a line has no seat), a reference off the field,
     * a filter that keeps every mark, a compare on one mark.
     */
    refuse(g, { marks: ids = [], index: i }) {
      if (!POINT_GESTURES[variant].includes(g.do))
        throw new GestureRefusal(`gestures[${i}].do`, `a ${variant} map does not draw ${g.do}; it draws ${POINT_GESTURES[variant].join(", ")}`, { remove: i });
      // A locator's one ring is its subject: a ring on a settlement would read as a second subject.
      const subjectMark = marks.find((m) => m.subject)?.name;
      if (variant === "locator" && g.do === "highlight" && subjectMark !== undefined && ids.some((n) => n !== subjectMark))
        throw new GestureRefusal(`gestures[${i}].mark`, `a locator rings only its subject, ${subjectMark}; a settlement is named, not ringed: give mark "${subjectMark}", or annotate the settlement`, {
          set: { index: i, field: "mark", value: subjectMark },
        });
      if (g.do === "zoom") {
        const lines = ids.filter((n) => byName.get(n)?.line);
        if (lines.length)
          throw new GestureRefusal(`gestures[${i}].mark`, `a zoom stands closer to a place, and ${lines[0]} is a line across the whole field: zoom onto ${names.find((n) => !byName.get(n).line)}`, {
            set: { index: i, field: "mark", value: names.find((n) => !byName.get(n).line) },
          });
        const f = factorOf(ids);
        if (!(f > 0)) throw new GestureRefusal(`gestures[${i}]`, `the marks of this zoom carry no position, so no close-up can be framed: drop it`, { remove: i });
        // A factor "×N" (or "N×", "N times", "x N"); the core already refused a zoom whose note has no number.
        const stated = figuresIn(g.note).map((n) => n.value);
        const ok = stated.some((v) => Math.abs(v - f) <= Math.max(0.5, f * 0.1));
        const printed = f >= 10 ? String(Math.round(f)) : String(Math.round(f * 10) / 10);
        if (!ok) {
          const first = figuresIn(g.note)[0];
          const fixed = first ? String(g.note).slice(0, first.index) + printed + String(g.note).slice(first.index + first.raw.length) : `×${printed}`;
          throw new GestureRefusal(`gestures[${i}].note`, `the close-up on ${ids.join(", ")} stands ×${printed} closer than the whole map, and the note prints ${stated.join(", ")} (no-let-camera-magnification): write "${fixed}"`, {
            set: { index: i, field: "note", value: fixed },
          });
        }
      }
      if (g.do === "reference") {
        const v = Number(g.value);
        const top = field?.deepest ?? Math.max(...marks.map((m) => m.value));
        if (!(v > 0 && v < top))
          throw new GestureRefusal(`gestures[${i}].value`, `a reference is an isoline of the field, and ${g.value} is outside it (0 to ${Math.round(top)}): give a value inside, e.g. ${Math.round(field?.median ?? top / 2)}`, {
            set: { index: i, field: "value", value: Math.round(field?.median ?? top / 2) },
          });
      }
      if (g.do === "filter" && ids.length >= marks.length)
        throw new GestureRefusal(`gestures[${i}].marks`, `the filter keeps every mark, so nothing steps back: drop it, or keep only the marks the claim is about`, { remove: i });
      if (g.do === "compare" && ids.length !== 2)
        throw new GestureRefusal(`gestures[${i}].marks`, `a ${variant} compare sets two bands side by side, the subject first: give marks: [subject, other]`, {
          ...(ids.length > 2 ? { set: { index: i, field: "marks", value: ids.slice(0, 2) } } : { remove: i }),
        });
    },
  };

  return {
    family: "geo",
    variant,
    marks,
    names,
    order,
    cameras: { whole: WHOLE },
    closeUpOn,
    factorOf,
    rest,
    apply,
    fold,
    equal,
    invariants,
    hooks,
    valueOf: (n) => byName.get(n)?.value,
    markOf: (n) => byName.get(n),
  };
}

/** A factor as a note prints it: one decimal under 10, whole above. */
export const printFactor = (f) => (f >= 10 ? String(Math.round(f)) : String(Math.round(f * 10) / 10));

/**
 * The whole staging of a point-map beat in one format: the core (family "geo", this variant's hooks), then the
 * format's scheduler. With `repair`, each refusal's fix is applied to the model's own list until it is accepted (at
 * most `steps` times) and every repair is returned; without, the first refusal is thrown.
 * @param schedule (valid, adapter, entities) → the format's declaration
 */
export function stageGeoPoint({ variant, gestures, marks, claim, format, adapter: options = {}, schedule, repair = false, steps = 12 }) {
  const adapter = createGeoPoint({ variant, marks, ...options });
  let list = gestures;
  const repairs = [];
  for (let step = 0; ; step++) {
    try {
      const { gestures: valid, entities } = validateGestures({ gestures: list, rows: marks, family: "geo", format, claim, hooks: adapter.hooks });
      const scheduled = schedule(valid, adapter, entities);
      return { gestures: list, valid, entities, adapter, scheduled, repairs };
    } catch (error) {
      if (!(error instanceof GestureRefusal) || !repair || step >= steps) throw error;
      repairs.push({ field: error.field, fix: error.fix, message: error.message });
      list = applyFix(list, error.fix);
    }
  }
}

/** A refusal as the runners print it: the field, what is wrong, and a value that works. */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/**
 * A declaration state as the drawing reads it: the marks in the accent, ringed, stepped back (outside a filter) and
 * not yet arrived (past `shown`, in the adapter's arrival order), and the reference levels drawn.
 */
export function rolesOf(state, adapter) {
  const accent = state.accent;
  const kept = state.kept ? new Set(state.kept) : null;
  return {
    accent,
    rings: state.rings.filter((r) => !accent.includes(r)),
    back: kept ? adapter.names.filter((n) => !kept.has(n) && !accent.includes(n)) : [],
    hidden: adapter.order.slice(state.shown),
    lines: state.lines.map((l) => l.value),
  };
}

// The Geo family adapter (craft/gestures/GRAMMAR.md §4 F8, §4.2; research/families.md §4). Shared by every map type:
// the AREA maps (choropleth, tile cartogram, hex cartogram, dot density) and the POINT/LINE maps (proportional
// symbol, flow, locator, contour) each register their variant here and keep their own schedulers and components.
//
// A map gesture compiles to a DECLARATION — plan layers, state fields, cameras — never to a draw call: every executor
// (a baked static plate, live MapLibre layers on a web page, a per-frame video plan, a scrolly drive) realises the
// same declared state its own way. Bound paint must be data-constant, so `filter`, `highlight` and `reveal` are
// expressed as one layer per group whose membership is known at plan time (classLayer), never a runtime predicate.
// Words exist only at a measured camera: `seat(key, camera)` refuses a camera nobody measured.
//
// Marks are keyed by ISO3 (or a region / unit / group code): { name, value, key }. `name` is the row's printed name,
// `key` the code, `value` the measured value the class is read from. A gesture may name a mark by either (the core
// resolves a key through `grouped`). A row with no value (not reported) is drawn as "no data" and is NOT a mark: no
// gesture can act on, ring or state a figure for a country the source does not report.
//
// Values do not add up (rates, shares, classes): FAMILIES.geo.additive is false, so the core refuses bracket and
// count; a class membership is stated by a filter's note ("7 countries above 94 %"), whose count and floor the
// family's figures hook supplies.
//
// Browser-safe: no Node module (the video bundle and the scrolly drive import it).
import { figuresIn, GestureRefusal } from "./gesture-core.mjs";
import { FAMILIES } from "./gesture-registry.mjs";

// ── the family ────────────────────────────────────────────────────────────────────────────────────

/**
 * Every gesture some map variant draws. A variant draws a subset (registerGeoVariant); a gesture outside its own
 * subset is refused by the family hook with a fix that drops it.
 */
export const GEO_GESTURES = ["highlight", "name", "annotate", "compare", "filter", "reference", "zoom", "reveal", "trace", "pull-back"];

FAMILIES.geo ??= { gestures: GEO_GESTURES, additive: false };
for (const d of GEO_GESTURES) if (!FAMILIES.geo.gestures.includes(d)) FAMILIES.geo.gestures.push(d);

/** variant slug → { gestures, basemap, seatKind } */
const VARIANTS = new Map();

/**
 * Registers one map type of the family.
 * @param slug      the type's kit slug ("choropleth", "flow-map-route-and-origin-destination"…)
 * @param gestures  the gestures this variant draws in every format (a subset of GEO_GESTURES)
 * @param basemap   "plate" (a baked MapTiler plate), "live" (MapLibre), "none" (a designed grid: tiles, hexes)
 * @param seat      how a word attaches: "pole" | "centroid" | "point" | "cell" (documentation; the format measures it)
 */
export function registerGeoVariant(slug, { gestures, basemap = "plate", seat = "pole" }) {
  const unknown = gestures.filter((d) => !GEO_GESTURES.includes(d));
  if (unknown.length) throw new Error(`geo variant ${slug}: ${unknown.join(", ")} are not geo gestures (${GEO_GESTURES.join(", ")})`);
  VARIANTS.set(slug, { gestures: [...gestures], basemap, seat });
  return VARIANTS.get(slug);
}

/** The gestures a registered variant draws (all the family's when the variant registered none). */
export const geoGesturesOf = (variant) => VARIANTS.get(variant)?.gestures ?? GEO_GESTURES;
export const gesturesOf = geoGesturesOf;

/** basemapMode: how a variant's ground is drawn ("plate" | "live" | "none"). */
export const basemapMode = (variant) => VARIANTS.get(variant)?.basemap ?? "plate";

// The area maps this file's author draws. A filter on a cell grid keeps cells; no area map traces a path.
const AREA = ["highlight", "name", "annotate", "compare", "filter", "reference", "zoom", "reveal", "pull-back"];
registerGeoVariant("choropleth", { gestures: AREA, basemap: "plate", seat: "pole" });
registerGeoVariant("cartogram-area-distortion-and-tile-cartogram", { gestures: AREA, basemap: "none", seat: "cell" });
registerGeoVariant("hex-grid-spatial-binning-and-hex-cartogram", { gestures: AREA, basemap: "none", seat: "cell" });
// A dot map's marks are the groups its dots belong to; a reference (a class floor) has no class to sit on.
registerGeoVariant("dot-density", { gestures: AREA.filter((d) => d !== "reference"), basemap: "plate", seat: "point" });

// ── marks ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * The core's marks from a map's rows. rows: [{ key, name, value }] (key = ISO3 or code). Rows with no value are left
 * out (not reported is not a mark). Two rows on one key fail loud: a map shades one value per place.
 */
export function geoMarks(rows) {
  const seen = new Map();
  const marks = [];
  for (const r of rows) {
    if (r.key === undefined || r.key === null || r.key === "") throw new Error(`a map row has no key (ISO3 or code): ${JSON.stringify(r)}`);
    if (seen.has(r.key)) throw new Error(`${r.key} is drawn twice (${seen.get(r.key)} and ${r.name}): keep one row per place`);
    seen.set(r.key, r.name);
    if (r.value === null || r.value === undefined || !Number.isFinite(Number(r.value))) continue;
    marks.push({ name: String(r.name ?? r.key), value: Number(r.value), key: String(r.key) });
  }
  return marks;
}

// ── classes ───────────────────────────────────────────────────────────────────────────────────────

/** Round breaks for values with none given: 4 rising steps at a 1-2-5 round step (5 classes). */
export function roundBreaks(values, classes = 5) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length < 2) return [];
  const lo = v[0];
  const hi = v.at(-1);
  if (hi === lo) return [];
  const raw = (hi - lo) / classes;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const out = [];
  for (let b = Math.ceil(lo / step + 1e-9) * step; b < hi && out.length < classes - 1; b += step) out.push(Number(b.toPrecision(12)));
  return out;
}

/** Class index of a value: 0 below breaks[0], breaks.length at or above the last break. */
export const classIndex = (value, breaks) => breaks.filter((b) => value >= b).length;

// ── cameras ───────────────────────────────────────────────────────────────────────────────────────

/** Web-Mercator 0..1 of a lon/lat (y grows south), the camera model every live executor interpolates in. */
export function mercator(lon, lat) {
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}

/**
 * The camera that holds a set of lon/lat points in a viewport: { camX, camY, camZoom } (bearing and pitch are 0).
 * pad is the share of the viewport kept clear around the points.
 */
export function fitCamera(points, { width, height, pad = 0.15, tile = 512, maxZoom = 7 } = {}) {
  const m = points.map(([lon, lat]) => mercator(lon, lat));
  const xs = m.map((p) => p[0]);
  const ys = m.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max((x1 - x0) / (width * (1 - 2 * pad)), (y1 - y0) / (height * (1 - 2 * pad)), 1e-9);
  return { camX: (x0 + x1) / 2, camY: (y0 + y1) / 2, camZoom: Math.min(maxZoom, Math.log2(1 / (span * tile))) };
}

/** How much closer one camera stands than another (the factor a zoom prints). */
export const zoomFactor = (from, to) => 2 ** (to.camZoom - from.camZoom);

// ── the adapter ───────────────────────────────────────────────────────────────────────────────────

/**
 * @param variant   a registered slug
 * @param rows      [{ key, name, value }] — the drawn places (null values = no data)
 * @param breaks    the class limits, rising (fixed for the beat: no-let-colour-scale); omitted → roundBreaks
 * @param cameras   { whole, … } named cameras { camX, camY, camZoom } (optional for a plate or a grid: "whole" only)
 * @param seats     { [camera]: { [key]: { x, y } } } — word anchors MEASURED at each camera (frame px)
 * @param groups    optional { [key]: groupName } — a group every member of which moves together (a region, a dot's
 *                  kind); classLayer ids are always available, groups add their own layers
 */
export function createGeo({ variant, rows, breaks, cameras = {}, seats = {}, groups = {} }) {
  if (!VARIANTS.has(variant)) throw new Error(`"${variant}" is not a registered geo variant (${[...VARIANTS.keys()].join(", ")})`);
  const marks = geoMarks(rows);
  const byKey = new Map(marks.map((m) => [m.key, m]));
  const byName = new Map(marks.map((m) => [m.name, m]));
  const BREAKS = [...(breaks?.length ? breaks : roundBreaks(marks.map((m) => m.value)))].map(Number);
  for (let i = 1; i < BREAKS.length; i++)
    if (!(BREAKS[i] > BREAKS[i - 1])) throw new Error(`breaks must rise: ${BREAKS.join(", ")}`);
  const classOf = (key) => {
    const m = byKey.get(key);
    return m ? classIndex(m.value, BREAKS) : null;
  };
  const classes = Array.from({ length: BREAKS.length + 1 }, (_, id) => ({
    id,
    from: id === 0 ? -Infinity : BREAKS[id - 1],
    to: id === BREAKS.length ? Infinity : BREAKS[id],
    keys: marks.filter((m) => classIndex(m.value, BREAKS) === id).map((m) => m.key),
  }));

  /** A mark's key from its key or its printed name. */
  const resolve = (nameOrKey) => {
    const s = String(nameOrKey);
    if (byKey.has(s)) return s;
    if (byName.has(s)) return byName.get(s).key;
    const folded = marks.find((m) => m.name.toLowerCase() === s.toLowerCase() || m.key.toLowerCase() === s.toLowerCase());
    if (folded) return folded.key;
    throw new Error(`"${s}" is not a drawn place`);
  };
  const keysOf = (names = []) => names.map(resolve);

  /** One plan layer per class (membership fixed at plan time): the unit filter, highlight and reveal move by. */
  const classLayer = (id) => {
    const c = classes[id];
    if (!c) throw new Error(`no class ${id}; classes run 0..${classes.length - 1}`);
    return { id: `class-${id}`, keys: c.keys, from: c.from, to: c.to };
  };
  /** One layer per named group (a region, a dot's kind), when the beat declares groups. */
  const groupLayer = (name) => ({ id: `group-${name}`, keys: Object.entries(groups).filter(([, g]) => g === name).map(([k]) => k) });

  const camera = (name) => {
    if (name === "whole" && !cameras.whole) return { name: "whole" };
    if (!cameras[name]) throw new Error(`no camera "${name}"; the measured cameras are ${Object.keys(cameras).join(", ") || "whole"}`);
    return { name, ...cameras[name] };
  };
  /** Where a word attaches to a place, at a camera someone measured. Mid-travel there are no words. */
  const seat = (key, cameraName = "whole") => {
    const at = seats[cameraName];
    if (!at) throw new Error(`no seats were measured at camera "${cameraName}": words sit only at a measured camera`);
    const s = at[key];
    if (!s) throw new Error(`${key} has no seat at camera "${cameraName}" (too small to hold a word there)`);
    return s;
  };

  // A state is a flat record every executor reads:
  //   camera     the named camera the picture stands at ("whole" | "closeUp")
  //   focus      the keys a closeUp camera holds (null at whole)
  //   factor     the zoom factor printed (a zoom's note), or null
  //   accent     the key in the accent ring (one accent: the subject)
  //   rings      keys ringed in ink (a highlight on a non-subject place, a compare's second place)
  //   named      keys named with their value
  //   notes      [{ key | keys, text, kind: "note" | "compare" | "filter" | "reference" }]
  //   kept       keys that keep their ink (a filter), or null (all keep it)
  //   floor      a class index whose classes at or above it are outlined (a reference), or null
  //   classesShown  how many classes have arrived, lowest first (a reveal moves it 0 → all)
  const rest = () => ({
    camera: "whole",
    focus: null,
    factor: null,
    accent: null,
    rings: [],
    named: [],
    notes: [],
    kept: null,
    floor: null,
    classesShown: classes.length,
  });

  const uniq = (xs) => [...new Set(xs)];

  /**
   * One validated gesture (the core's output: marks resolved to row names) applied to a state: the declaration
   * the gesture compiles to. Never draws.
   */
  function apply(state, g) {
    const keys = keysOf(g.marks ?? []);
    const s = { ...state, rings: [...state.rings], named: [...state.named], notes: [...state.notes] };
    switch (g.do) {
      case "highlight":
        // One accent carries the subject; a highlight on any other place rings it in ink (emphasis by ring).
        if (g.subject !== undefined && keys[0] !== resolve(g.subject)) s.rings = uniq([...s.rings, keys[0]]);
        else s.accent = keys[0];
        if (g.note) s.notes.push({ key: keys[0], text: g.note, kind: "note" });
        break;
      case "name":
        s.named = uniq([...s.named, keys[0]]);
        if (s.accent !== keys[0]) s.rings = uniq([...s.rings, keys[0]]);
        if (g.note) s.notes.push({ key: keys[0], text: g.note, kind: "note" });
        break;
      case "annotate":
        if (g.note) s.notes.push({ key: keys[0], text: g.note, kind: "note" });
        break;
      case "compare":
        s.rings = uniq([...s.rings, ...keys.slice(1)]);
        s.named = uniq([...s.named, ...keys.slice(0, 2)]);
        if (g.note) s.notes.push({ keys: keys.slice(0, 2), text: g.note, kind: "compare" });
        break;
      case "filter":
        s.kept = keys;
        if (g.note) s.notes.push({ keys, text: g.note, kind: "filter" });
        break;
      case "reference":
        s.floor = classIndex(Number(g.value), BREAKS);
        if (g.note) s.notes.push({ text: g.note, kind: "reference", value: Number(g.value) });
        break;
      case "zoom":
        s.camera = "closeUp";
        s.focus = keys;
        s.factor = g.note ?? null;
        break;
      case "reveal":
        s.classesShown = classes.length;
        if (g.note) s.notes.push({ text: g.note, kind: "whole" });
        break;
      case "pull-back":
        // The frame returns to the whole; what was shown stays marked (rings, names), the filter's step-back lifts.
        s.camera = "whole";
        s.focus = null;
        s.factor = null;
        s.kept = null;
        if (g.note) s.notes.push({ text: g.note, kind: "whole" });
        break;
      case "trace":
        s.traced = keys.length ? keys : marks.map((m) => m.key);
        break;
      default:
        throw new Error(`${g.do} is not a geo gesture`);
    }
    return s;
  }

  /** The states a list passes through, cumulatively, from rest. */
  const fold = (gestures, from = rest()) => gestures.reduce((acc, g) => [...acc, apply(acc.at(-1), g)], [from]).slice(1);

  const normal = (s) => JSON.stringify({ ...s, rings: [...s.rings].sort(), named: [...s.named].sort(), kept: s.kept ? [...s.kept].sort() : null });
  const equal = (a, b) => normal(a) === normal(b);

  /**
   * The family's locks over a sequence of states: the colour domain is fixed (no-let-colour-scale — breaks never
   * move, so a state carries no domain at all); a closeUp prints its factor (no-let-camera-magnification); one accent.
   */
  function invariants(states) {
    states.forEach((s, i) => {
      if (s.camera !== "whole" && !s.factor) throw new Error(`state ${i} stands at a close-up without printing its factor (no-let-camera-magnification)`);
      if (s.kept && !s.kept.length) throw new Error(`state ${i} keeps no place: a filter keeps the places the claim is about`);
      if ("domain" in s) throw new Error(`state ${i} carries a colour domain: the classes are fixed for the beat (no-let-colour-scale)`);
    });
  }

  function derive(op, ids) {
    const v = keysOf(ids).map((k) => byKey.get(k).value);
    switch (op) {
      case "diff":
        return v[0] - v[1];
      case "ratio":
        return v[0] / v[1];
      case "rank":
        return [...marks].sort((a, b) => b.value - a.value).findIndex((m) => m.key === resolve(ids[0])) + 1;
      case "count":
        return ids.length;
      case "class":
        return classIndex(v[0], BREAKS);
      default:
        throw new Error(`no ${op} on the geo family (values are classes, not parts of a whole)`);
    }
  }

  /** The class floor a set of keys sits at or above, if the set is exactly the places at or above a break. */
  const floorOf = (keys) => {
    const set = new Set(keys);
    for (let b = 0; b < BREAKS.length; b++) {
      const above = marks.filter((m) => m.value >= BREAKS[b]).map((m) => m.key);
      if (above.length === set.size && above.every((k) => set.has(k))) return BREAKS[b];
      const below = marks.filter((m) => m.value < BREAKS[b]).map((m) => m.key);
      if (below.length === set.size && below.every((k) => set.has(k))) return BREAKS[b];
    }
    return null;
  };

  // ── the core's hooks ──
  const nearestBreak = (v) => BREAKS.reduce((p, b) => (Math.abs(b - v) < Math.abs(p - v) ? b : p), BREAKS[0]);
  const hooks = {
    /** The figures a geo gesture draws beyond its marks' values: a filter's count and floor, a reference's counts. */
    figures(g, { marks: names }) {
      const keys = (names ?? []).map((n) => {
        try {
          return resolve(n);
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (g.do === "filter") {
        const floor = floorOf(keys);
        const vs = keys.map((k) => byKey.get(k).value);
        // The count it keeps, against all the places, and (for a map whose marks are counts, a dot map's groups)
        // the whole they add up to: "72 sites of 8,900 stations".
        return [keys.length, marks.length, marks.reduce((t, m) => t + m.value, 0), ...(floor !== null ? [floor] : []), Math.min(...vs), Math.max(...vs)];
      }
      if (g.do === "reference") {
        const v = Number(g.value);
        return [v, marks.filter((m) => m.value >= v).length, marks.filter((m) => m.value < v).length, marks.length];
      }
      // The whole map's own readings: how many places, how many classes, and the mean of the places (each place
      // counted once — the tile cartogram's reading, not a territory-weighted one).
      const mean = marks.reduce((t, m) => t + m.value, 0) / (marks.length || 1);
      if (g.do === "reveal") return [classes.length, ...BREAKS, marks.length, mean];
      if (g.do === "pull-back") return [marks.length, mean];
      return [];
    },
    /** Geo conflicts: a gesture this variant does not draw, a reference off the class floors, a filter keeping all. */
    refuse(g, { marks: names, index: i }) {
      const drawn = geoGesturesOf(variant);
      if (!drawn.includes(g.do))
        throw new GestureRefusal(`gestures[${i}].do`, `a ${variant} map does not draw ${g.do}; it draws ${drawn.join(", ")}`, { remove: i });
      if (g.do === "reference") {
        const v = Number(g.value);
        if (!BREAKS.length)
          throw new GestureRefusal(`gestures[${i}]`, `this map has no class limits for a reference to sit on: drop it`, { remove: i });
        if (!BREAKS.some((b) => Math.abs(b - v) < 1e-9))
          throw new GestureRefusal(`gestures[${i}].value`, `on a map a reference is a class floor, and ${g.value} is not one of the class limits (${BREAKS.join(", ")}): give value ${nearestBreak(v)}, or set breaks to include ${g.value}`, {
            set: { index: i, field: "value", value: nearestBreak(v) },
          });
      }
      // A filter's count is the number of places it keeps: the core would also accept a kept place's RANK, and "7
      // countries above 94 %" passed on a filter keeping ten.
      if (g.do === "filter" && typeof g.note === "string") {
        const kept = (names ?? []).map((n) => byKey.get(resolve(n))?.value).filter(Number.isFinite);
        for (const n of figuresIn(g.note)) {
          if (n.percent || !Number.isInteger(n.value) || n.decimals) continue;
          const whole = marks.reduce((t, m) => t + m.value, 0);
          if (n.value === names.length || n.value === marks.length || Math.abs(whole - n.value) <= 0.5 || kept.some((v) => Math.abs(v - n.value) <= 0.5)) continue;
          const fixed = g.note.slice(0, n.index) + String(names.length) + g.note.slice(n.index + n.raw.length);
          throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw}, but the filter keeps ${names.length} places: write "${fixed}"`, {
            set: { index: i, field: "note", value: fixed },
          });
        }
      }
      // The core lets a family's figures stand as percentages; a count (places kept, classes) never is one: "10 %"
      // on a filter keeping ten places is refused here.
      if (typeof g.note === "string") {
        const counts = new Set([names?.length ?? 0, marks.length, classes.length, marks.reduce((t, m) => t + m.value, 0)]);
        const values = [...(names ?? []).map((n) => byKey.get(resolve(n))?.value), ...BREAKS, marks.reduce((t, m) => t + m.value, 0) / (marks.length || 1)].filter(Number.isFinite);
        for (const n of figuresIn(g.note))
          if (n.percent && counts.has(n.value) && !values.some((v) => Math.abs(v - n.value) <= 0.5 * 10 ** -n.decimals + 1e-9))
            throw new GestureRefusal(`gestures[${i}].note`, `states ${n.raw} %, but ${n.raw} is a count of places here, not a percentage: drop the % sign, or state a value the map draws`, {
              set: { index: i, field: "note", value: undefined },
            });
      }
      if (g.do === "filter" && names?.length >= marks.length)
        throw new GestureRefusal(`gestures[${i}].marks`, `the filter keeps every place, so nothing steps back: drop it, or keep only the places the claim is about`, { remove: i });
      if (g.do === "compare" && names?.length > 2)
        throw new GestureRefusal(`gestures[${i}].marks`, `a map compare rings two places, the subject first: give marks: [${names.slice(0, 2).map((n) => JSON.stringify(n)).join(", ")}]`, {
          set: { index: i, field: "marks", value: names.slice(0, 2) },
        });
    },
  };

  return {
    family: "geo",
    variant,
    basemapMode: basemapMode(variant),
    gestures: geoGesturesOf(variant),
    marks,
    breaks: BREAKS,
    classes,
    classOf,
    classLayer,
    groupLayer,
    resolve,
    keysOf,
    camera,
    seat,
    rest,
    apply,
    fold,
    equal,
    invariants,
    derive,
    floorOf,
    hooks,
    valueOf: (key) => byKey.get(resolve(key))?.value ?? null,
    nameOf: (key) => byKey.get(resolve(key))?.name ?? key,
  };
}

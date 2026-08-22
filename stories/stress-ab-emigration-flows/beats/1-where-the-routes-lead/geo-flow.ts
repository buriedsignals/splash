/**
 * The pure half of this beat: CSV parsing, the origin-destination table, the ribbon geometry, the
 * width scale, the legend's reference widths and the two reading orders. No browser, no rasteriser
 * — so the bake (node), the render (react-dom/server) and a test can all read it without dragging
 * Chromium behind any of them. Same split as `map-web/assets/geo-symbol.ts`, and this file is this
 * BEAT's own: a story workspace is not a skill, and nothing here is imported across a skill
 * boundary.
 *
 * WHY IT IS NOT `geo-symbol.ts`. That file's whole vocabulary is a POINT with a radius. This beat's
 * mark is a PAIR of points with a width, which has no radius, no `keepPoint` frame test that means
 * anything (a ribbon can leave the frame between its ends and still be correct), and a direction —
 * three facts the symbol core has no place to put. The two share the idea of a linear-in-value
 * encoding and nothing else, so nothing is copied from it.
 */

// ── The frozen table ───────────────────────────────────────────────────────────────────────────

/**
 * RFC 4180 row tokeniser, inlined rather than imported (no cross-skill runtime import, and a story
 * workspace is not a skill either). A naive comma split corrupts a quoted thousands separator or a
 * quoted place name carrying its own comma, so this walks the text one character at a time.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export type Route = {
  key: string;
  origin: string;
  destination: string;
  value: number;
  from: { lon: number; lat: number };
  to: { lon: number; lat: number };
};

export type Place = {
  key: string;
  name: string;
  lon: number;
  lat: number;
  role: "origin" | "destination" | "both";
  value: number;
};

const REQUIRED = ["origin", "destination", "people_2025", "origin_lat", "origin_lon", "dest_lat", "dest_lon"] as const;

/**
 * THE JOIN FAILS LOUD. `map-beat`'s own gotcha ("a data join fails silently") applies here in a
 * second shape: this table carries its coordinates inline, so there is no shapefile to miss — but a
 * column renamed upstream, or a row with a blank coordinate, would otherwise sail through as
 * `NaN` and project to the frame's top-left corner, which looks like a place. Every required column
 * and every cell is checked, and a bad one names itself.
 */
export function parseRoutes(csv: string): Route[] {
  const rows = parseCsvRows(csv.trim());
  const header = (rows.shift() ?? []).map((h) => h.trim());
  for (const column of REQUIRED)
    if (!header.includes(column))
      throw new Error(`the frozen table has no "${column}" column — it carries: ${header.join(", ")}`);
  const at = (name: string) => header.indexOf(name);
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r, index) => {
      const cell = (name: string) => (r[at(name)] ?? "").trim();
      const number = (name: string) => {
        const raw = cell(name);
        const parsed = Number(raw);
        if (raw === "" || !Number.isFinite(parsed))
          throw new Error(`row ${index + 2}: "${name}" is ${JSON.stringify(raw)}, which is not a number`);
        return parsed;
      };
      const origin = cell("origin");
      const destination = cell("destination");
      if (!origin || !destination) throw new Error(`row ${index + 2}: a route needs both an origin and a destination`);
      return {
        key: `${slugOf(origin)}--${slugOf(destination)}`,
        origin,
        destination,
        value: number("people_2025"),
        from: { lon: number("origin_lon"), lat: number("origin_lat") },
        to: { lon: number("dest_lon"), lat: number("dest_lat") },
      };
    });
}

/**
 * `[a-z0-9-]+` by construction — the one vocabulary the markup, the CSS and the live plan share.
 * It used to normalise NFD and strip combining marks before slugging, which no other copy does and
 * which nothing in this beat needs: not one of the fourteen place names in `source/data.csv`
 * carries a diacritic, so the extra pass changed no slug this page has ever emitted. A silent twin
 * of a tagged function, differing only in dead code, is exactly what the geometry walk exists to
 * find.

 *  @parity */
export function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Every distinct place the table names, with the total that LEAVES it (an origin) or ARRIVES at it
 * (a destination). A place that is both keeps both roles and the arriving total, because arriving is
 * what this beat's second reading is about; no place in this extract is both, and the branch exists
 * so that a later extract where one is does not silently pick a side.
 *
 * A place is identified by its NAME, and its coordinates are checked to agree across every row that
 * names it. Two rows disagreeing about where Porto is would otherwise draw two Portos.
 */
export function placesFrom(routes: Route[]): Place[] {
  const byName = new Map<string, Place>();
  const see = (name: string, lon: number, lat: number, role: "origin" | "destination", value: number) => {
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, { key: slugOf(name), name, lon, lat, role, value: role === "destination" ? value : value });
      return;
    }
    if (existing.lon !== lon || existing.lat !== lat)
      throw new Error(`"${name}" is at ${existing.lon},${existing.lat} on one row and ${lon},${lat} on another`);
    if (existing.role !== role) existing.role = "both";
    existing.value += value;
  };
  for (const route of routes) {
    see(route.origin, route.from.lon, route.from.lat, "origin", route.value);
    see(route.destination, route.to.lon, route.to.lat, "destination", route.value);
  }
  return [...byName.values()];
}

/** Arriving totals, largest first — the second reading, and the one no single ribbon can show. */
export function destinationsByArrivals(routes: Route[]): { name: string; key: string; value: number; routes: number }[] {
  const totals = new Map<string, { name: string; key: string; value: number; routes: number }>();
  for (const route of routes) {
    const row = totals.get(route.destination) ?? { name: route.destination, key: slugOf(route.destination), value: 0, routes: 0 };
    row.value += route.value;
    row.routes += 1;
    totals.set(route.destination, row);
  }
  return [...totals.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export const totalOf = (routes: Route[]): number => routes.reduce((sum, r) => sum + r.value, 0);

// ── The ribbon ─────────────────────────────────────────────────────────────────────────────────

export type Pt = { x: number; y: number };

/**
 * A RIBBON'S WIDTH IS LINEAR IN ITS VALUE, and that is not a style choice.
 *
 * A proportional SYMBOL is sized by area, so its radius goes as the square root — a circle's ink is
 * two-dimensional. A ribbon's ink is one-dimensional in the direction that encodes anything: its
 * length is geography and only its width is the number. Rooting the width would make 18400 read as
 * 3.1 times 1900 instead of 9.7 times, which is a lie about the one comparison the beat exists to
 * make. `maxWidth` is in the plate's own frame units (the SVG scales, so the ribbon scales with it).
 */
export function widthScale(maxValue: number, maxWidth: number): (value: number) => number {
  if (!(maxValue > 0)) throw new Error("a width scale needs a positive maximum");
  return (value) => (Math.max(0, value) / maxValue) * maxWidth;
}

/**
 * The ribbon: a quadratic Bezier from `a` to `b`, bowed to ONE consistent side of the direction of
 * travel by `bow` times the chord length.
 *
 * ONE SIDE, ALWAYS THE SAME SIDE. Three routes arrive at Paris and two at London; drawn as straight
 * chords they would meet at a point and the last few hundred pixels of each would be indistinguishable
 * from the others, which is exactly the tangle `flow-map.md` refuses this type for. A constant
 * signed offset separates them before they arrive, and keeping the SIGN constant is what makes the
 * separation read as one convention rather than as data: a reader who notices the bow learns it
 * means nothing, once, instead of hunting for what it encodes.
 */
export function ribbonPath(a: Pt, b: Pt, bow: number): { d: string; control: Pt } {
  const control = controlPoint(a, b, bow);
  return { d: `M ${round(a.x)} ${round(a.y)} Q ${round(control.x)} ${round(control.y)} ${round(b.x)} ${round(b.y)}`, control };
}

export function controlPoint(a: Pt, b: Pt, bow: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return { x: mid.x + dy * bow, y: mid.y - dx * bow };
}

/** A point on the quadratic, at `t` in [0, 1]. */
export function pointAt(a: Pt, control: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

/** The tangent's angle in degrees at `t` — what an arrowhead is rotated by so it points along the
 *  ribbon rather than along the chord. */
export function angleAt(a: Pt, control: Pt, b: Pt, t: number): number {
  const u = 1 - t;
  const dx = 2 * u * (control.x - a.x) + 2 * t * (b.x - control.x);
  const dy = 2 * u * (control.y - a.y) + 2 * t * (b.y - control.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** The ribbon densified into `steps` points — the ONE arc, sampled, so the fallback SVG path and the
 *  live map's own GeoJSON line are the same curve seen twice rather than two curves that can drift. */
export function samples(a: Pt, control: Pt, b: Pt, steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) out.push(pointAt(a, control, b, i / steps));
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

// ── Order ──────────────────────────────────────────────────────────────────────────────────────

/** Widest first, so a thin ribbon stays paintable on top of a wide one rather than buried under it
 *  — the same reasoning `geo-symbol.ts`'s own `drawOrder` gives for circles. */
export const drawOrder = <T extends { value: number; key: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

/** The order a keyboard walks and the table reads: the same one, largest first, so a reader moving
 *  between the two media never has to re-learn where they are. */
export const readingOrder = drawOrder;

// ── The legend ─────────────────────────────────────────────────────────────────────────────────

/**
 * Reference values for a WIDTH legend: the largest value as drawn, and a round number near a third
 * and near a tenth of it. Round to one significant figure so the reader is given numbers they can
 * hold, and never a value above the maximum — a legend key wider than anything on the map claims a
 * ribbon that is not there.
 */
export function niceWidthReferences(maxValue: number, count = 3): number[] {
  const fractions = [1, 0.35, 0.1].slice(0, count);
  const out: number[] = [];
  for (const fraction of fractions) {
    const raw = maxValue * fraction;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const rounded = Math.min(maxValue, Math.round(raw / magnitude) * magnitude);
    if (rounded > 0 && !out.includes(rounded)) out.push(rounded);
  }
  return out;
}

// ── Reading the numbers out ────────────────────────────────────────────────────────────────────

/** A count of people, grouped, in the story's own recorded language. Never a hex-literal locale:
 *  the caller passes the code `STORYBOARD.md` recorded. */
export const people = (value: number, language: string): string => value.toLocaleString(language);

/** A share of the eight recorded routes, to the nearest whole per cent. The denominator is NAMED by
 *  every caller — "of the eight recorded routes", never a bare "%" — because this extract is not
 *  all emigration and a bare percentage would claim it was. */
export const shareOf = (value: number, total: number): number => Math.round((value / total) * 100);

// ── Unprojecting the plate ─────────────────────────────────────────────────────────────────────

/** Web-Mercator northing, in world units where a full turn of longitude is 2 pi. */
export const mercY = (latDeg: number): number => Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
const invMercY = (y: number): number => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

export type FrameCorners = { west: number; east: number; north: number; south: number };

/**
 * A point in the plate's own pixel frame, back to lon/lat.
 *
 * Exact, not approximate: inside one frame at one zoom, Web Mercator is LINEAR in longitude across x
 * and linear in `mercY` down y, which is the same pair of facts the bake used to project forward.
 * This is what lets the fallback ribbon (drawn in frame units) and the live ribbon (a GeoJSON
 * LineString in lon/lat) be one curve rather than two: the arc is computed once, in frame units,
 * and the live layer gets THAT arc unprojected — never a second arc computed in degrees, which would
 * bow differently and put the two layers visibly out of register at the edges of the frame.
 */
export function unproject(corners: FrameCorners, frame: { width: number; height: number }, p: Pt): [number, number] {
  const lon = corners.west + (p.x / frame.width) * (corners.east - corners.west);
  const top = mercY(corners.north);
  const bottom = mercY(corners.south);
  return [lon, invMercY(top + (p.y / frame.height) * (bottom - top))];
}

// ── Separating ribbons that share a destination ────────────────────────────────────────────────

/**
 * ONE BOW FOR EVERY RIBBON — AND THE FAN THAT WAS TRIED INSTEAD, WRITTEN DOWN BECAUSE IT LOOKED
 * RIGHT AND WAS NOT.
 *
 * Three routes end at Paris and two at London, and a pointer driven at four viewports found
 * Porto-Paris (9,600 people) unreachable at all three of the points first sampled on it: it is
 * crossed by several thinner ribbons, and each sample happened to land on a crossing. The first fix
 * was a FANNED bow — routes sharing a destination bowing by different amounts, ordered by the
 * origin's own latitude — and it made the picture worse in a way no unit test could see. The bow is
 * perpendicular-left of travel, so changing its size swings a ribbon's whole middle sideways: the
 * three Paris ribbons stopped being a sheaf and became a lens of crossings in the middle of the
 * map, and Lisboa-London, the widest ribbon and the one the takeaway names, swung west across
 * Faro-London. Ordering the fan the other way simply moved which pair crossed.
 *
 * What was actually wrong was the MEASUREMENT, not the geometry: eight ribbons converging on five
 * cities cross, and "this exact point on the centreline answers for this ribbon" is not a property
 * a flow map can have. The claim that IS true, and that the beat's own driver checks, is that every
 * ribbon answers for itself somewhere along its own length at every viewport. With one bow it does.
 *
 * So: one bow, one side, always the same, meaning nothing — the convention a reader learns once.
 */
export const BOW = 0.14;

export function bowsFor(routes: Route[]): Map<string, number> {
  return new Map(routes.map((route) => [route.key, BOW]));
}

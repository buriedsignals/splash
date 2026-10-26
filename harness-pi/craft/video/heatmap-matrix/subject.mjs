// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-heatmap-europe-electricity/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every row's cells as shares of its own whole, the measure the floor
// is about (the cells of the measured families, added), the rows ranked by it, the rows past the floor counted, and those
// rows partitioned into the routes the video parts and names. The proof asserted its own answers (seven past 94 %, three
// routes by the nuclear share, Russia last); a story's answers are whatever its data gives, so each assertion becomes a
// refusal that names what to change in beat.mjs.
//
// Runs in Bun only.

/** A value as a refusal prints it: four significant digits, no float noise. */
const n = (v) => String(+v.toPrecision(4));
/** The worked example's class edges, in % of a row's whole. */
export const PROOF_BREAKS = [2, 5, 10, 20, 40];
export const MAX_ROWS = 14;
export const MAX_COLUMNS = 10;

/**
 * @param beat  beat.mjs's default export: `heads` [{ key, label, family }], `measured` [family names], `rows`
 *              [{ key, label, cells }], `floor`, `routes` [{ name, keys }], `ring` (a head's key), `breaks`?
 * @returns     `{ rows, route, columns, ringAt, above, floor, breaks }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const heads = beat.heads.map((h) => ({ key: String(h.key), label: String(h.label), family: String(h.family) }));
  if (!(heads.length >= 3 && heads.length <= MAX_COLUMNS)) throw new Error(`heads has ${heads.length} columns: the video draws 3 to ${MAX_COLUMNS} at landscape`);
  // A family's columns side by side: its rule and its name span them.
  heads.forEach((h, j) => {
    if (j > 0 && heads[j - 1].family !== h.family && heads.slice(0, j - 1).some((o) => o.family === h.family))
      throw new Error(`the columns of the family « ${h.family} » are not side by side: order heads so each family's columns follow each other`);
  });
  const measured = new Set([beat.measured].flat().map(String));
  const unknown = [...measured].filter((f) => !heads.some((h) => h.family === f));
  if (!measured.size || unknown.length) throw new Error(`measured must name families of heads (${[...new Set(heads.map((h) => h.family))].join(", ")}); got ${JSON.stringify([...measured])}`);
  if (heads.every((h) => measured.has(h.family))) throw new Error("every family is measured: the bar's two tones need at least one family outside the measure");
  const columns = heads.map((h, j) => ({ label: h.label, family: h.family, measured: measured.has(h.family), of: [j] }));

  if (!(beat.rows.length >= 3 && beat.rows.length <= MAX_ROWS)) throw new Error(`rows has ${beat.rows.length} rows: the video draws 3 to ${MAX_ROWS}`);
  const rows = beat.rows
    .map((r) => {
      const key = String(r.key);
      if (!(Array.isArray(r.cells) && r.cells.length === heads.length)) throw new Error(`${key}: cells must hold one share per head (${heads.length}), in the heads' order`);
      const bad = r.cells.findIndex((v) => typeof v !== "number" || !(v >= 0));
      if (bad >= 0) throw new Error(`${key}: the cell for ${heads[bad].label} is ${JSON.stringify(r.cells[bad])}; a cell is a share from 0 up`);
      const sum = r.cells.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.5) throw new Error(`${key}: its cells add up to ${n(sum)}, not 100 — each cell is the column's share of the row's own whole, in percent (a row grows as one bar of 100 %)`);
      const lowCarbon = r.cells.reduce((s, v, j) => s + (columns[j].measured ? v : 0), 0);
      return { key, label: String(r.label), total: r.total, shares: r.cells, lowCarbon };
    })
    .sort((a, b) => b.lowCarbon - a.lowCarbon);

  const floor = beat.floor;
  if (!(typeof floor === "number" && floor > 0 && floor < 100)) throw new Error(`floor is ${JSON.stringify(floor)}: the dashed line is a share between 0 and 100`);
  const above = rows.filter((r) => r.lowCarbon > floor);
  if (!(above.length >= 2 && above.length < rows.length))
    throw new Error(`${above.length} of the ${rows.length} rows are past ${floor} %: the video counts the rows past the floor and steps the others back, so at least two must be past it and one below`);

  // THE ROUTES: a partition of the rows past the floor, each checked (the proof: renewables, both, nuclear-led).
  const routes = [beat.routes].flat();
  if (!(routes.length >= 2 && routes.length <= 3))
    throw new Error(`routes has ${routes.length} routes: the video parts the rows past the floor into 2 or 3 blocks (the first rises, the last falls; a fourth would not be parted from its neighbour)`);
  const routeOfKey = new Map();
  routes.forEach((route, g) => {
    if (typeof route?.name !== "string" || !route.name.trim()) throw new Error(`routes[${g}].name must be a non-empty string`);
    const keys = [route.keys].flat().map(String);
    if (!keys.length) throw new Error(`the route « ${route.name} » is empty: the video names every route over its own rows`);
    for (const k of keys) {
      if (routeOfKey.has(k)) throw new Error(`${k} is in two routes`);
      routeOfKey.set(k, g);
    }
  });
  const missing = above.filter((r) => !routeOfKey.has(r.key)).map((r) => r.key);
  const extra = [...routeOfKey.keys()].filter((k) => !above.some((r) => r.key === k));
  if (missing.length || extra.length)
    throw new Error(`routes must split exactly the rows past ${floor} % (${above.map((r) => r.key).join(", ")})${missing.length ? `; not in any route: ${missing.join(", ")}` : ""}${extra.length ? `; in a route but not past the floor: ${extra.join(", ")}` : ""}`);
  const ringAt = heads.findIndex((h) => h.key === String(beat.ring));
  if (ringAt < 0) throw new Error(`ring is ${JSON.stringify(beat.ring)}, which is no head's key: name the column the routes differ by`);
  // The ring shows the routes as steps of that one column, in the order they are named: route after route, never overlapping.
  for (let g = 1; g < routes.length; g++) {
    const prev = above.filter((r) => routeOfKey.get(r.key) === g - 1).map((r) => r.shares[ringAt]);
    const here = above.filter((r) => routeOfKey.get(r.key) === g).map((r) => r.shares[ringAt]);
    if (!(Math.max(...prev) < Math.min(...here)))
      throw new Error(`the ring shows the routes as steps of « ${heads[ringAt].label} », route after route; « ${routes[g - 1].name} » reaches ${n(Math.max(...prev))} and « ${routes[g].name} » starts at ${n(Math.min(...here))} — order routes by that column, or ring the column they differ by`);
  }
  const route = rows.map((r) => (routeOfKey.has(r.key) ? routeOfKey.get(r.key) : null));
  const breaks = beat.breaks ?? PROOF_BREAKS;
  if (!(Array.isArray(breaks) && breaks.length >= 2 && breaks.every((b, i) => b > 0 && b < 100 && (i === 0 || b > breaks[i - 1]))))
    throw new Error(`breaks is ${JSON.stringify(beat.breaks)}: the class edges are rising shares between 0 and 100`);
  return { rows, route, columns, ringAt, above: above.length, floor, breaks, routeNames: routes.map((r) => r.name) };
}

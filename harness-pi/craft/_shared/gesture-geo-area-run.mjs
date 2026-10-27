// The Node half every AREA-map gesture kit shares (choropleth, tile cartogram, hex cartogram, dot density): the beat
// read and guarded in the order the bar kits use, the geo adapter built on its rows, and the claim read from
// STORYBOARD.md. Each kit's render-beat.mjs is a thin file that calls these with its variant and its format's
// scheduler. A refusal prints `REFUSED — <field>: <fix>`; with SPLASH_GESTURE_REPAIR=1 each gesture refusal's fix is
// applied instead (`REPAIRED gestures: …`) and the list staged again. Nothing here refuses the data's SHAPE: a place
// with no value is drawn as no data, long names wrap, any count of places is laid out.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createGeo } from "./gesture-family-geo.mjs";
import { gridCodes } from "./gesture-geo-area-shapes.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertNumbers, errorText, importBeat, rowFacts, runCheck } from "./guards.mjs";

export const AREA_VARIANTS = ["choropleth", "cartogram-area-distortion-and-tile-cartogram", "hex-grid-spatial-binning-and-hex-cartogram", "dot-density"];

const REQUIRED = ["eyebrow", "gestures", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];

/** The STORYBOARD.md front matter, field by field. */
export function storyFront(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/** A refusal as the 12B reads it: the field, what is wrong, and a value that works. */
export function refusalText(error) {
  if (!(error instanceof GestureRefusal)) return errorText(error);
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/** Runs a kit body, printing REFUSED and exiting 1 on any refusal. */
export async function refusingGeo(body) {
  try {
    await body();
  } catch (error) {
    console.log(`REFUSED — ${refusalText(error)}`);
    process.exit(1);
  }
}

/**
 * The beat read and guarded: rows (one per place; a dot map's rows are counted from its points), the drawn values,
 * check(), the title's figures, then the geo adapter and the claim.
 */
export async function readGeoBeat(here, variant) {
  const beat = await importBeat(here);
  applyStoryboard(beat, here, variant === "choropleth" || variant === "dot-density" ? {} : {});
  const missing = REQUIRED.filter((k) => beat[k] === undefined);
  if (variant === "dot-density" ? beat.points === undefined : beat.rows === undefined) missing.unshift(variant === "dot-density" ? "points" : "rows");
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, …, note } (see CONTRACT.md)");

  let rows;
  let points;
  if (variant === "dot-density") {
    if (!Array.isArray(beat.points) || !beat.points.length) throw new Error("points must be one { lon, lat, group } per dot (see CONTRACT.md)");
    const bad = beat.points.filter((p) => !Number.isFinite(p.lon) || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180);
    if (bad.length) throw new Error(`${bad.length} points have no usable lon/lat (e.g. ${JSON.stringify(bad[0])}): Number() the coordinate columns, and leave out rows with none (say so in limits)`);
    const counts = new Map();
    for (const p of beat.points) counts.set(String(p.group), (counts.get(String(p.group)) ?? 0) + 1);
    const names = beat.groupNames ?? {};
    rows = [...counts].map(([key, n]) => ({ key, name: String(names[key] ?? key), value: n })).sort((a, b) => b.value - a.value);
    points = beat.points.map((p) => ({ lon: p.lon, lat: p.lat, key: String(p.group) }));
  } else {
    if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be one { key, name, value } per place (see CONTRACT.md)");
    rows = beat.rows.map((r) => ({ key: String(r.key ?? r.iso ?? r.code ?? ""), name: String(r.name ?? r.key), value: r.value === null || r.value === undefined || r.value === "" ? null : Number(r.value) }));
    if (variant !== "choropleth") {
      const codes = new Set(gridCodes(variant, beat.grid));
      const off = rows.filter((r) => !codes.has(r.key)).map((r) => r.key);
      if (off.length) throw new Error(`the grid has no cell for ${off.join(", ")}; it places ${[...codes].join(" ")}: leave those rows out (and say so in limits), or give grid`);
    }
  }
  assertNumbers(rows.filter((r) => r.value !== null).map((r) => [r.key, r.value]));
  runCheck(beat);
  const values = rows.filter((r) => r.value !== null).map((r) => r.value);
  const titles = [beat.title].flat();
  const breaks = beat.breaks ?? undefined;
  const geo = createGeo({ variant, rows, breaks });
  assertHeadlineNumbersDrawn(titles[0], [...values, ...geo.breaks, rows.length, values.length], variant === "dot-density" ? "groups" : "places");

  const front = storyFront(here);
  const claim = {
    takeaway: front("takeaway") ?? titles[0],
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(here),
    unit: beat.unit,
  };
  return { beat, rows, points, geo, claim, titles, limits: [beat.limits].flat(), reading: [beat.reading].flat() };
}

/** The frozen country shapes beside the beat (choropleth, dot map), or none. */
export function readShapes(here) {
  const file = join(here, "shapes.geojson");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

export const REPAIR = () => process.env.SPLASH_GESTURE_REPAIR === "1";

/**
 * A zoom prints its factor (no-let-camera-magnification), and the factor it prints is the one the camera takes: the
 * close-up's width against the whole map's. A note stating another factor (outside 15 %) is refused with the measured
 * one written in. `factorOf(gesture)` returns the camera's factor for that zoom.
 */
export function assertZoomFactors(valid, factorOf) {
  valid.forEach((g, i) => {
    if (g.do !== "zoom") return;
    const factor = factorOf(g);
    const said = String(g.note ?? "").match(/[×x]\s?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s?[×x]/);
    const n = said ? Number((said[1] ?? said[2]).replace(",", ".")) : NaN;
    if (Number.isFinite(n) && Math.abs(n - factor) <= factor * 0.15) return;
    const value = `×${factor >= 10 ? Math.round(factor) : Math.round(factor * 10) / 10}`;
    throw new GestureRefusal(`gestures[${i}].note`, `the zoom's camera stands ${value} closer than the whole map: print that factor (no-let-camera-magnification)`, {
      set: { index: i, field: "note", value: said ? String(g.note).replace(said[0], value) : value },
    });
  });
}

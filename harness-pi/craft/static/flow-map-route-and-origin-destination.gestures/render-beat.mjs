// The generic half of a flow-map GESTURE beat: the per-type kit's runner
// (static/flow-map-route-and-origin-destination/render-beat.mjs) with its fixed staging — the widest band in the
// accent, every band named — replaced by the beat's `gestures`. Guard order: applyStoryboard → REQUIRED → the flows
// and the join → check() → the gesture core (validateGestures, family geo, this variant's hooks, the claim read from
// STORYBOARD.md) → the static scheduler (gesture-geo-point-static.mjs) → the bake, the camera → render. A band is
// named by its destination's name (`names`) or its ISO3 code. A gesture refusal prints REFUSED with the beat.mjs
// field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead. Nothing here
// refuses the data's SHAPE (which destination leads, how many): the plate adapts. Everything about THIS story lives
// in ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { composeDirection, composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { plateWaterField } from "./plate-water.mjs";
import { GestureGeoPointStatic } from "./GestureGeoPointStatic.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { pointMarks, refusalText, stageGeoPoint } from "./gesture-geo-point-family.mjs";
import { composeGeoPointStatic } from "./gesture-geo-point-static.mjs";
import { applyStoryboard, assertNumbers, assertDrawsClaimColumn, errorText, importBeat, rowFacts } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
/** The format this copy of the runner renders: the web, scrolly and video kits carry the same runner with FORMAT set. */
const FORMAT = "static";
const beat = await importBeat(HERE).catch((error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
});
applyStoryboard(beat, HERE, { basemap: "©MapTiler ©OpenStreetMap contributors" });
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const EXPORT_FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "key", "value", "origin", "originLabel", "gestures", "names", "unit", "format", "dottedNote", "keyNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((k) => beat[k] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
const forms = (v) => [v].flat();

// ── the flows, read from data.json by the columns the beat names ───────────
const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const at = (name, field) => {
  const i = (table.columns ?? []).findIndex((c) => c.name === name);
  if (i < 0)
    throw new Error(`beat.mjs's ${field} names the column ${JSON.stringify(name)}, which data.json does not have; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const num = (raw) => (typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", ".")));
const [KEY, VALUE] = [at(beat.key, "key"), at(beat.value, "value")];
const filters = Object.entries(beat.where ?? {}).map(([column, v]) => [at(column, "where"), String(v)]);
const rows = table.rows.filter((r) => filters.every(([i, v]) => String(r[i]) === v));
if (!rows.length) throw new Error(`no row of data.json matches where ${JSON.stringify(beat.where)}`);
const flows = rows.map((r) => ({ code: String(r[KEY]).trim(), people: num(r[VALUE]) }));
assertNumbers(flows.map((f) => [f.code, f.people]), beat.value);
const seen = new Map();
for (const f of flows) seen.set(f.code, (seen.get(f.code) ?? 0) + 1);
const doubled = [...seen].filter(([, n]) => n > 1);
if (doubled.length)
  throw new Error(`data.json holds ${doubled[0][1]} rows for destination ${doubled[0][0]}: one band per destination — filter with where (e.g. one month, one category) so each code has one row`);
const zero = flows.filter((f) => !(f.people > 0));
if (zero.length) throw new Error(`destinations with no positive ${beat.value}: ${zero.slice(0, 5).map((f) => f.code).join(", ")} — a band's width is the quantity; filter them out with where`);
if (flows.some((f) => f.code === beat.origin))
  throw new Error(`the origin ${beat.origin} is also a destination row: filter it out with where`);
const unnamed = flows.filter((f) => !beat.names[f.code]);
if (unnamed.length) throw new Error(`names has no entry for ${unnamed.map((f) => f.code).join(", ")}: give every destination its name in the story's language`);
assertDrawsClaimColumn(flows.map((f) => f.people), HERE);

const total = flows.reduce((s, f) => s + f.people, 0);
const ranked = [...flows].sort((a, b) => b.people - a.people);
beat.check();

// ── the gestures: checked against the bands the plate draws and the claim the journalist confirmed ───────────
const front = (() => {
  const file = join(HERE, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
})();
const nameOf = (code) => beat.names[code];
const marks = pointMarks("flow", flows.map((f) => ({ key: f.code, name: nameOf(f.code), value: f.people })));
const codeOf = new Map(marks.map((m) => [m.name, m.key]));
const claim = {
  takeaway: front("takeaway") ?? forms(beat.title)[0],
  subject: front("subject"),
  comparison: front("comparison"),
  entity: front("claimEntity") ?? (beat.subject ? nameOf(beat.subject) : undefined),
  versus: front("claimVersus"),
  facts: rowFacts(HERE),
  unit: beat.unit,
};
let staged;
try {
  staged = stageGeoPoint({
    variant: "flow",
    gestures: beat.gestures,
    marks,
    claim,
    format: FORMAT,
    repair: process.env.SPLASH_GESTURE_REPAIR === "1",
    schedule: (valid, adapter) => composeGeoPointStatic({ gestures: FORMAT === "static" ? valid : [], adapter, format: (v) => beat.format(v) }),
  });
} catch (error) {
  if (!(error instanceof GestureRefusal)) throw error;
  console.log(`REFUSED — ${refusalText(error)}`);
  process.exit(1);
}
for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
const plate = staged.scheduled;
const accentCodes = new Set(plate.accent.map((n) => codeOf.get(n)));
const roleOf = new Map([...plate.rings.map((n) => [codeOf.get(n), "ring"]), ...plate.stepBack.map((n) => [codeOf.get(n), "back"])]);
// A band's own note (or a pair's, on its subject) is printed at its end; a set's note joins the key's line.
const noteOf = new Map();
for (const n of plate.notes) if (n.kind !== "set" && !noteOf.has(codeOf.get(n.marks[0]))) noteOf.set(codeOf.get(n.marks[0]), n.text);
const setNotes = plate.notes.filter((n) => n.kind === "set").map((n) => n.text);
const SUBJECT = [...accentCodes][0] ?? beat.subject ?? ranked[0].code;

// ── the geography: the worked example's country file, joined on ISO3 ──────
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const known = new Set(geo.features.map((f) => f.properties.iso));
/** THE JOIN FAILS LOUD. A destination code the geometry does not carry would draw no band and nobody
 *  would know: the code is named, with what the file does carry. */
const unknown = [beat.origin, ...flows.map((f) => f.code)].filter((c) => !known.has(c));
if (unknown.length)
  throw new Error(`${unknown.join(", ")} match no country in the geometry (ISO 3166 alpha-3 codes, Europe and its neighbours): ${beat.key} must hold three-letter codes such as DEU, POL, FRA, and origin one of them`);

const bounds = beat.bounds ?? [[-25, 34], [48, 68]];
const PLATE_SIZE = "1000x760";
const VIEW = 1000;
const LAND_DOSE = 0.07;
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const bandsWords = flows.map((f) => beat.names[f.code]);
const textPerRegister = {
  display: forms(beat.title).join(" "),
  eyebrow: beat.eyebrow,
  body: `${forms(beat.limits).join(" ")} ${beat.source}`,
  axis: `${bandsWords.join(" ")} ${plate.notes.map((n) => n.text).join(" ")} ${beat.originLabel} ${beat.dottedNote(99, "99", true)} ${beat.keyNote(99, 99, total)} ${beat.unit}`,
  annot: forms(beat.reading).join(" "),
  value: `${beat.format(total)} ${flows.map((f) => beat.format(f.people)).join(" ")}`,
};

let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

/** A PLATE BELONGS TO A DIRECTION, A SIZE, A CAMERA AND TWO TINTS. */
const plateDir = (id) => join(HERE, "plate", nameAtSize(id, SIZE));
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  if (plateWasPaintedWith(dir, { water, land })) {
    const g = JSON.parse(readFileSync(join(dir, "geometry.json"), "utf8"));
    if (JSON.stringify(g.bounds) === JSON.stringify(bounds) && `${g.frame.width}x${g.frame.height}` === PLATE_SIZE) return;
  }
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, bounds ${bounds.flat().join(",")})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--bounds", bounds.flat().join(","), "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}: the basemap could not be baked (is MAPTILER_KEY set?)`);
}

const refused = [];
for (const { label: id, direction: picked } of chosen) {
  try {
    const tints = plateTints(picked, { landDose: LAND_DOSE });
    ensurePlate(id, tints.water, tints.land);
    const plateFacts = JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
    const FRAME = plateFacts.frame;
    const CORNERS = plateFacts.frameCorners;
    const CAMERA_ASPECT = FRAME.width / FRAME.height;
    const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const Y_NORTH = mercY(CORNERS.north);
    const Y_SOUTH = mercY(CORNERS.south);
    const project = ([lon, lat]) => {
      const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
      const py = ((mercY(Math.max(-85, Math.min(85, lat))) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
      return [(px / FRAME.width) * VIEW, (py / FRAME.width) * VIEW];
    };

    const MIN_STEP = VIEW / 1400;
    const thin = (ring) => {
      const out = [ring[0]];
      for (const p of ring.slice(1)) {
        const q = out[out.length - 1];
        if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
      }
      return out.length >= 4 ? out : ring;
    };
    const inFrame = ([x, y]) => x >= 0 && x <= VIEW && y >= 0 && y <= VIEW / CAMERA_ASPECT;
    /** THE SEAT IS THE CENTRE OF THE PART IN FRAME, not of the country. */
    const seatOf = (feature) => {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const poly of feature.geometry.coordinates)
        for (const ring of poly)
          for (const point of ring) {
            const p = project(point);
            if (!inFrame(p)) continue;
            sx += p[0];
            sy += p[1];
            n++;
          }
      return n ? [sx / n, sy / n] : null;
    };
    const hosts = new Set(flows.map((f) => f.code));
    const shapes = [];
    const seats = {};
    for (const f of geo.features) {
      const iso = f.properties.iso;
      const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => thin(ring.map(project)));
      if (rings.length)
        shapes.push({
          iso,
          host: hosts.has(iso),
          origin: iso === beat.origin,
          d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" "),
        });
      const seat = seatOf(f);
      if (seat) seats[iso] = seat;
    }
    if (!seats[beat.origin]) throw new Error(`the origin ${beat.origin} has no seat inside the camera ${JSON.stringify(bounds)}: every band leaves from it — widen bounds`);
    /** A DESTINATION OUTSIDE THE CAMERA IS NOT DRAWN, IT IS COUNTED — but the subject must be drawn. */
    if (!seats[SUBJECT]) throw new Error(`the subject ${SUBJECT} has no seat inside the camera ${JSON.stringify(bounds)}: widen bounds`);
    const outside = flows.filter((f) => !seats[f.code]).map((f) => f.code);
    if (outside.length) console.log(`outside the camera (counted under the key, not drawn): ${outside.join(", ")}`);

    /** THE CAMERA IS FITTED TO THE FLOWS IT DRAWS: the origin plus the ten largest destinations in
     *  frame, padded by 16 %. */
    const FOCUS_HOSTS = 10;
    const focusSeats = [seats[beat.origin], ...ranked.filter((f) => seats[f.code]).slice(0, FOCUS_HOSTS).map((f) => seats[f.code])];
    const focus = {
      x0: Math.min(...focusSeats.map((p) => p[0])),
      x1: Math.max(...focusSeats.map((p) => p[0])),
      y0: Math.min(...focusSeats.map((p) => p[1])),
      y1: Math.max(...focusSeats.map((p) => p[1])),
    };
    const padX = Math.max((focus.x1 - focus.x0) * 0.16, 20);
    const padY = Math.max((focus.y1 - focus.y0) * 0.16, 20);
    focus.x0 -= padX;
    focus.x1 += padX;
    focus.y0 -= padY;
    focus.y1 += padY;

    // A band to a destination outside the camera keeps a seat far off-plate so the component counts it.
    const bands = flows.map((f) => ({
      code: f.code,
      name: beat.names[f.code],
      people: f.people,
      seat: seats[f.code] ?? [-1e6, -1e6],
      subject: accentCodes.has(f.code) || (!accentCodes.size && f.code === SUBJECT),
      ...(roleOf.has(f.code) ? { role: roleOf.get(f.code) } : {}),
      ...(noteOf.has(f.code) ? { note: noteOf.get(f.code) } : {}),
    }));

    const waterField = plateWaterField(plateDir(id), { scale: FRAME.width / VIEW });
    const NARROWEST_MAP = 596;
    const WIDEST_BAND = Math.min(NARROWEST_MAP * 0.05, 17);
    const BIGGEST_FLOW = Math.max(...bands.map((b) => b.people));
    const OCCUPANCY = markOccupancy(
      bands.filter((b) => seats[b.code]).map((b) => ({
        kind: "band",
        name: b.name,
        points: [seats[beat.origin], b.seat],
        width: ((b.people / BIGGEST_FLOW) * WIDEST_BAND * VIEW) / NARROWEST_MAP,
      })),
      waterField,
    );
    console.log(occupancyLine(OCCUPANCY));

    /** The key: two bands at one significant figure, the largest round value under the widest band
     *  and a tenth of it, on the bands' own width scale. */
    const roundDown = (v) => {
      const e = 10 ** Math.floor(Math.log10(v));
      return Math.floor(v / e) * e;
    };
    const keyValues = [roundDown(BIGGEST_FLOW), roundDown(BIGGEST_FLOW) / 10];

    const facts = beatFacts(
      flows.map((f) => ({ key: f.code, label: beat.names[f.code], value: f.people })),
      {
        subject: beat.names[SUBJECT],
        flows: flows.map((f) => ({ from: beat.origin, to: f.code, value: f.people })),
        geography: { areas: flows.length + 1, settlements: 0, waters: 0, basemap: true },
        declaredSequence: beat.unit,
      },
    );
    const offered = applicableTreatments(facts);
    /** ONE RESOLUTION OF THE COLOUR, AND IT REACHES THE PAINT: the record owns the hue, the direction
     *  the value, and the floors are measured against the grounds the bands were measured to occupy.
     *  It refuses rather than falling back. */
    let composed;
    try {
      composed = composeDirection({ direction: picked, palette: readPalette(HERE), grounds: plateGrounds(tints, OCCUPANCY), textPerRegister });
    } catch (error) {
      throw new Error(`${error.message}. This is the story's PALETTE.md, not beat.mjs: bands that cross the sea need an accent at least 40° of hue from the water's blue — the palette must be decided again`);
    }
    const direction = resolveDirectionFamilies(composed, textPerRegister);
    if (FORMAT !== "static") {
      // THE GEOMETRY THE OTHER FORMATS DRAW: this plate and these marks, in the plate's view units.
      const { renderGeoPointFormat } = await import("./gesture-geo-point-render.mjs");
      const plain = (t) => String(t).replace(/[\u202f\u00a0]/g, " ");
      const o = seats[beat.origin];
      const NODE_R = 16;
      const inFocus = ([x, y]) => x > focus.x0 && x < focus.x1 && y > focus.y0 && y < focus.y1;
      const widthOf = (v) => (v / BIGGEST_FLOW) * 22;
      const fmt = (v) => plain(beat.format(v));
      const pathOf = (seat) => {
        const angle = Math.atan2(seat[1] - o[1], seat[0] - o[0]);
        const start = [o[0] + Math.cos(angle) * NODE_R, o[1] + Math.sin(angle) * NODE_R];
        const dx = seat[0] - start[0];
        const dy = seat[1] - start[1];
        const len = Math.hypot(dx, dy) || 1;
        const bow = Math.min(len * 0.1, 22) * (seat[1] < o[1] ? -1 : 1);
        const c = [(start[0] + seat[0]) / 2 - (dy / len) * bow, (start[1] + seat[1]) / 2 + (dx / len) * bow];
        return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} Q ${c[0].toFixed(1)} ${c[1].toFixed(1)} ${seat[0].toFixed(1)} ${seat[1].toFixed(1)}`;
      };
      const geometry = {
        variant: "flow",
        W: VIEW,
        H: VIEW / CAMERA_ASPECT,
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        // A band too thin to read (under one view unit) or outside the fan's box is counted, not drawn.
        marks: bands
          .filter((b) => seats[b.code] && inFocus(b.seat) && widthOf(b.people) >= 1)
          .map((b) => ({ name: b.name, kind: "band", x: b.seat[0], y: b.seat[1], d: pathOf(b.seat), w: widthOf(b.people), label: beat.bandLabel ? plain(beat.bandLabel(b.name, b.people)) : `${b.name} ${fmt(b.people)}`, detail: `${b.name} · ${fmt(b.people)} ${plain(beat.unit)} · ${((b.people / total) * 100).toFixed(1)} %` })),
        origin: { x: o[0], y: o[1], r: NODE_R, label: plain(beat.originLabel) },
        whole: { x: focus.x0, y: focus.y0, w: focus.x1 - focus.x0, h: focus.y1 - focus.y0 },
      };
      await renderGeoPointFormat(FORMAT, { here: HERE, picked, id, variant: "flow", beat, geometry, valid: staged.valid, adapter: staged.adapter, valueFormat: fmt, land: tints.land, textPerRegister });
      continue;
    }
    await renderStill({
      element: createElement(GestureGeoPointStatic, {
        variant: "flow",
        frame: { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height },
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        bands,
        originSeat: seats[beat.origin],
        focus,
        originLabel: beat.originLabel,
        total,
        aspect: CAMERA_ASPECT,
        title: forms(beat.title),
        limits: forms(beat.limits),
        reading: forms(beat.reading),
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
        keyValues,
        unit: beat.unit,
        format: beat.format,
        bandLabel: beat.bandLabel,
        keyNote: beat.keyNote,
        // A set's note (a filter's) opens the wrapped line under the key.
        dottedNote: setNotes.length ? (...a) => `${setNotes.join(" · ")}. ${beat.dottedNote(...a)}` : beat.dottedNote,
      }),
      width: EXPORT_FRAME.width,
      height: EXPORT_FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: EXPORT_FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);

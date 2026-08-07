// CLI: bun resolve-place.mjs <runDir> --place "<name>" [--label "<marker label>"]
//                                     [--expect peak] [--elevation <m>] [--lang <code>]
//
// THE SANCTIONED WAY A PLACE NAME BECOMES A COORDINATE — and the reason that coordinate can be
// argued with afterwards.
//
// SKILL.md already required a real lookup: "a real deterministic geocoding step — geocodePlace()
// from lib/geo/geocode.ts ... Use THAT function, not a hand-rolled fetch". It was followed, and it
// still went wrong: on exports/glaciers-requiem-2026 the host asked MapTiler for "Matterhorn",
// took what came back, and plotted "Cervin" on the GLACIER's centroid — 1063 m north of the
// summit — under a beat reading « Au sommet du Cervin, à 4478 mètres ». The journalist said the
// point was wrong BEFORE production ran. The run directory holds one line, `suggest-chart-invoked`.
// The warning had nowhere to go.
//
// The missing piece was never the lookup. It was that the lookup was the only step in the chain
// that RAN REAL CODE and left NOTHING BEHIND: the takeaway is confirmed verbatim on disk, the
// source is compared against the article's own citation, the menu persists as candidates.json —
// and a coordinate lived in one turn of a conversation. So this script does what
// save-opportunities.mjs did for the article analysis: it turns the step's own output into a fact
// on disk (<runDir>/places.json), which skills/splash/src/place-provenance.ts then makes the
// accepted proposal answer for.
//
// It prints the SHOWBACK too, and that ordering is the point of the whole exercise: « Cervin →
// Matterhorngletscher, Zermatt (glacier) » is a sentence a journalist can be wrong about out loud.
// « Cervin → 7.66, 45.99 » is not.
//
// REFUSES RATHER THAN APPROXIMATES: asked for a peak and handed a glacier, it writes nothing and
// says what it saw. Nothing downstream can tell an approximation from an answer, so the honesty
// has to be here (chooseCandidate returns null for exactly this reason).
import { existsSync, readFileSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import {
  geocodePlace,
  isPeakCandidate,
  RESOLVABLE_PLACE_KINDS,
  assertCountryFilter,
} from "../../../lib/geo/geocode.ts";

/** The kinds `--expect` accepts — the geocoder's own list, never a wider one: an expectation the
 *  lookup cannot be held to would be a promise this script does not keep.
 *
 *  DERIVED, not copied. This was `["peak"]`, hand-written, and three more kinds landed in the
 *  geocoder the same day on another branch — the merge of the two produced a script that refused
 *  `lake`, `glacier` and `settlement` while the module resolved them, i.e. wired and unreachable.
 *  Reading the module's own list means the next kind arrives here by existing. */
export const EXPECTED_KINDS = [...RESOLVABLE_PLACE_KINDS];

/** The receipt file, beside accepted.json / candidates.json / decisions.jsonl. */
export const RECEIPT = "places.json";

/**
 * One geocoder hit, reduced to what a guard reads and a journalist can be shown. `label` is the
 * MARKER label rather than the query, because that is the key the spec plots under and the key
 * every downstream comparison joins on — a lookup for "Matterhorn" that becomes the marker
 * "Cervin" has to be findable as "Cervin".
 */
export function receiptFrom(candidate, { label, query, expect: expected, statedElevationM } = {}) {
  return {
    label: String(label ?? query ?? "").trim(),
    query: String(query ?? "").trim(),
    lon: candidate.lon,
    lat: candidate.lat,
    resolvedName: candidate.placeName || candidate.name,
    categories: candidate.categories ?? [],
    // Spread-omitted rather than set to null: an absent elevation is a fact about the feature,
    // and writing `null` would make "the geocoder returned no elevation" indistinguishable from
    // "somebody cleared the field".
    ...(typeof candidate.elevationM === "number" ? { elevationM: candidate.elevationM } : {}),
    ...(candidate.ref ? { ref: candidate.ref } : {}),
    ...(candidate.layer ? { layer: candidate.layer } : {}),
    ...(expected ? { expect: expected } : {}),
    ...(typeof statedElevationM === "number" ? { statedElevationM } : {}),
    resolvedAt: new Date().toISOString(),
  };
}

/** The line the orchestrator relays VERBATIM. Everything that makes a resolution correctable is
 *  in it: what it resolved to, what KIND of thing that is, how high, and where. */
export function showbackLine(r) {
  const kind = (r.categories ?? []).join(", ");
  const bits = [kind, typeof r.elevationM === "number" ? `${r.elevationM} m` : null]
    .filter(Boolean)
    .join(", ");
  const what = bits ? `${r.resolvedName} (${bits})` : r.resolvedName;
  return `${r.label} → ${what} — ${r.lon}, ${r.lat}`;
}

/** WHY nothing was written, with the alternatives it actually saw. A refusal that cannot say what
 *  it rejected sends the journalist back to the same query with no new information. */
export function noMatchMessage(place, expected, candidates) {
  const list = (candidates ?? [])
    .slice(0, 5)
    .map((c) => `${c.placeName || c.name} [${(c.categories ?? []).join(", ") || "no kind"}]`)
    .join("; ");
  if (!list)
    return `"${place}" resolved to nothing at all — check the spelling, or ask the journalist for the coordinate`;
  if (expected === "peak")
    return (
      `"${place}" returned no summit — what came back is ${list}. A geocoder's coordinate for a ` +
      `glacier or a massif is its CENTROID, which is not on the peak (the Cervin miss was ` +
      `1063 m). Ask the journalist for the summit's coordinate rather than plotting the nearest ` +
      `thing`
    );
  return `"${place}" matched nothing usable — what came back is ${list}`;
}

/** Latest lookup per label wins. A journalist who asks for a second opinion gets ONE record, not
 *  two contradictory ones a later reader would have to choose between. */
export function mergeResolutions(existing, next) {
  const kept = (existing ?? []).filter((r) => r.label !== next.label);
  return [...kept, next];
}

export function readReceipt(runDir) {
  const path = join(runDir, RECEIPT);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed.resolutions) ? parsed.resolutions : [];
  } catch {
    return [];
  }
}

export function writeReceipt(runDir, entry) {
  const path = join(runDir, RECEIPT);
  const resolutions = mergeResolutions(readReceipt(runDir), entry);
  writeFileSync(path, JSON.stringify({ resolutions }, null, 2) + "\n");
  chmodSync(path, 0o600);
  return path;
}

/** The MapTiler key, from the environment or the repo-root .env — the same two homes every engine
 *  reads (lib/newsroom/capabilities.ts), so a machine that can render a map can resolve a place. */
export function mapTilerKey(env = process.env) {
  const fromEnv = env.VITE_MAPTILER_KEY || env.REMOTION_MAPTILER_KEY || env.MAPTILER_API_KEY;
  if (fromEnv) return fromEnv;
  const dotenv = resolve(dirname(new URL(import.meta.url).pathname), "../../../.env");
  if (!existsSync(dotenv)) return "";
  for (const line of readFileSync(dotenv, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:VITE_MAPTILER_KEY|REMOTION_MAPTILER_KEY|MAPTILER_API_KEY)\s*=\s*(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const runDirArg = argv[0];
  const place = (flag(argv, "place") ?? "").trim();
  const label = (flag(argv, "label") ?? place).trim();
  const expected = flag(argv, "expect");
  const elevationRaw = flag(argv, "elevation");
  const language = flag(argv, "lang");
  const country = flag(argv, "country");

  const fail = (msg) => {
    console.error(msg);
    process.exit(1);
  };

  if (!runDirArg || !place)
    fail(
      'usage: resolve-place.mjs <runDir> --place "<name>" [--label "<marker label>"] [--expect <kind>] [--elevation <m>] [--lang <code>] [--country <cc[,cc]>]',
    );

  // VALIDATE BEFORE LOOKING UP, so nothing is written and no request is spent on a call that
  // cannot be honoured (and so an unsupported --expect is not silently downgraded to first-hit,
  // which is the exact behaviour the peak path exists to prevent).
  if (expected !== undefined && !EXPECTED_KINDS.includes(expected))
    fail(
      `--expect "${expected}" is not a kind this can hold the geocoder to (only: ${EXPECTED_KINDS.join(", ")}). ` +
        "Adding one means MEASURING which MapTiler layer carries it, the way peak was measured — not guessing.",
    );

  // The tie-breaker the three non-peak kinds NEED: they refuse two features that answer the name
  // equally well (Algeria's Lac Noir outranks Fribourg's), and `country` is the hard server-side
  // filter that settles it. Validated here so a malformed value fails before a request is spent.
  if (country !== undefined)
    try {
      assertCountryFilter(country);
    } catch (e) {
      fail(`--country "${country}": ${e instanceof Error ? e.message : e}`);
    }

  let statedElevationM;
  if (elevationRaw !== undefined) {
    statedElevationM = Number.parseFloat(elevationRaw);
    if (!Number.isFinite(statedElevationM) || statedElevationM <= 0)
      fail(`--elevation "${elevationRaw}" is not a positive number of metres`);
  }

  // Never mkdir — same rule as save-opportunities.mjs: creating the directory here would write the
  // receipt somewhere no gate reads it, which is worse than not writing it at all.
  const dir = resolve(runDirArg);
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    fail(
      `run directory ${dir} does not exist — pass the directory that holds this run's accepted.json/candidates.json (exports/<slug>)`,
    );

  const key = mapTilerKey();
  if (!key)
    fail(
      "no MapTiler key (VITE_MAPTILER_KEY / REMOTION_MAPTILER_KEY in the environment or the repo-root .env) — " +
        "a place cannot be resolved without one, and a coordinate typed from memory is fabricated data",
    );

  let result;
  try {
    result = await geocodePlace(place, {
      key,
      ...(expected ? { expect: expected } : {}),
      ...(statedElevationM !== undefined ? { elevationM: statedElevationM } : {}),
      ...(language ? { language } : {}),
    });
  } catch (e) {
    fail(`could not resolve "${place}": ${e instanceof Error ? e.message : e}`);
  }

  if (!result.chosen) {
    // Refusing is an ANSWER, and it is recorded as one: nothing is written, so the guard still
    // sees an unaccounted place and the run stops rather than shipping a near-miss.
    console.error(noMatchMessage(place, expected, result.candidates));
    process.exit(1);
  }

  const entry = receiptFrom(result.chosen, {
    label,
    query: place,
    expect: expected,
    statedElevationM,
  });
  const written = writeReceipt(dir, entry);

  // stdout carries BOTH renderings, for the two readers: the sentence to relay to the journalist,
  // and the record to copy onto the accepted entry. Neither is derivable from the other by hand
  // without the mistake this whole file exists to prevent.
  console.log(
    JSON.stringify(
      {
        written,
        showback: showbackLine(entry),
        resolution: entry,
        alternatives: result.candidates
          .filter((c) => c !== result.chosen)
          .slice(0, 4)
          .map((c) => ({
            name: c.placeName || c.name,
            categories: c.categories,
            lon: c.lon,
            lat: c.lat,
            ...(typeof c.elevationM === "number" ? { elevationM: c.elevationM } : {}),
            isPeak: isPeakCandidate(c),
          })),
        next: `show the journalist: "${showbackLine(entry)}" — then carry it onto the accepted entry as resolvedPlaces (origin "geocoder", shownToJournalist true), or record their correction on the marker with correctedFrom`,
      },
      null,
      2,
    ),
  );
}

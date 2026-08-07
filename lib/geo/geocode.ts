// A REAL geocoder, because "run a real deterministic geocoding step" was prose and nothing else.
//
// suggest-chart/SKILL.md's "HARD RULE — coordinate provenance" tells the host to geocode rather
// than recall a coordinate, and it is a good rule. It was also the ONLY thing standing between a
// place name and a lon/lat: there was no geocoding code in this repo at all, so "which of the
// five features the geocoder returned" was a judgement call made in an LLM's head, once, with no
// record of what was picked or why.
//
// It went wrong exactly where you would expect. On the glaciers-requiem-2026 run the host asked
// MapTiler for "Matterhorn", took features[0], and shipped it. features[0] is
// `Matterhorngletscher` — the GLACIER — and the coordinate MapTiler returns for a polygon feature
// is its CENTROID: 1063 m north of the summit, on the Zmutt flank. The beat that coordinate
// illustrates says « Au sommet du Cervin, à 4478 mètres ». The map contradicted its own sentence.
//
// The fix is not "be more careful". It is that a place has a KIND, the geocoder knows the kind,
// and nothing was reading it. MapTiler's default layer contains no peaks whatsoever (measured
// 2026-08-06: Cervin / Matterhorn / Mont Blanc / Jungfrau / Eiger all return admin areas,
// landforms, streets — never a summit); peaks live in the POI layer, tagged `natural=peak` and
// usually carrying `ele`. So when the subject IS a peak, this module asks the layer that HAS
// peaks and refuses anything that is not one. When the subject is not a peak — a glacier, a
// commune — the default layer is right and is left exactly as it was.
//
// The second half matters as much: every resolution comes back with WHAT IT RESOLVED TO (name,
// categories, elevation, OSM ref), because a coordinate you cannot describe is a coordinate you
// cannot show a journalist, and showing it is what place-resolution.ts goes on to require.

/** One geocoder hit, reduced to the fields a journalist could be shown and a guard can read. */
export interface GeocodeCandidate {
  /** The feature's own short name, in the requested language ("Cervin"). */
  name: string;
  /** The disambiguating long form ("Cervin, Zermatt") — what makes two same-named peaks tellable apart. */
  placeName: string;
  lon: number;
  lat: number;
  /** What the geocoder says this thing IS: ["peak"], ["glacier"], ["restaurant"]… Lowercased. */
  categories: string[];
  /** Metres above sea level, when the feature carries `ele`. Absent on most landforms. */
  elevationM?: number;
  /** Provenance handle, e.g. "osm:n26863664" — the audit trail back to the source feature. */
  ref?: string;
  /** Which MapTiler layer produced this hit. */
  layer: "default" | "poi";
}

/** The kinds of subject this module can hold the geocoder to. Only `peak` is wired: it is the
 *  one where the default layer is not merely imprecise but categorically wrong (no peaks in it
 *  at all), and it is the one a sentence can contradict out loud. Adding another kind means
 *  measuring its layer the way `peak` was measured — not guessing. */
export type ExpectedPlaceKind = "peak";

/** Category tokens that mean "this feature is a summit". `natural=peak` is promoted into
 *  `categories` by parseFeatures, so both shapes are covered by one list. */
const PEAK_CATEGORIES = new Set(["peak", "summit"]);

export function isPeakCandidate(c: GeocodeCandidate): boolean {
  return c.categories.some((cat) => PEAK_CATEGORIES.has(cat));
}

function numberOrUndefined(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return undefined;
  // OSM `ele` is a string, sometimes decimal ("3749.3"), occasionally with a unit.
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) ? n : undefined;
}

/** Reduce a MapTiler geocoding FeatureCollection to candidates. Tolerant by design: this parses
 *  a third party's JSON, so anything it cannot read it SKIPS rather than throws — except that it
 *  never invents a coordinate, which is the whole point of the module (a non-Point geometry is
 *  dropped, not centroided here). */
export function parseFeatures(
  payload: unknown,
  layer: "default" | "poi",
): GeocodeCandidate[] {
  const features = (payload as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: GeocodeCandidate[] = [];
  for (const raw of features) {
    const f = raw as Record<string, unknown> | null;
    if (!f || typeof f !== "object") continue;
    const geometry = f.geometry as Record<string, unknown> | null;
    if (!geometry || geometry.type !== "Point") continue;
    const coords = geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = coords[0];
    const lat = coords[1];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;

    const props = (f.properties ?? {}) as Record<string, unknown>;
    const tags = (props.feature_tags ?? {}) as Record<string, unknown>;
    const categories = new Set<string>();
    if (Array.isArray(props.categories))
      for (const c of props.categories)
        if (typeof c === "string" && c.trim())
          categories.add(c.trim().toLowerCase());
    // `natural=peak` is the authoritative tag; a feature can carry it with categories empty.
    if (typeof tags.natural === "string" && tags.natural.trim())
      categories.add(tags.natural.trim().toLowerCase());

    const name = typeof f.text === "string" ? f.text : "";
    out.push({
      name,
      placeName: typeof f.place_name === "string" ? f.place_name : name,
      lon,
      lat,
      categories: [...categories],
      ...(numberOrUndefined(tags.ele) !== undefined
        ? { elevationM: numberOrUndefined(tags.ele) }
        : {}),
      ...(typeof props.ref === "string" ? { ref: props.ref } : {}),
      layer,
    });
  }
  return out;
}

export interface ChooseOptions {
  /** Hold the geocoder to a kind of place. Omitted ⇒ first-hit wins, unchanged behaviour. */
  expect?: ExpectedPlaceKind;
  /** An elevation the SENTENCE states, in metres — the disambiguator between two same-named
   *  peaks (Matterhorn 4478 m in the Alps vs Matterhorn 3250 m in Nevada). Advisory: it reorders
   *  peaks, it never promotes a non-peak. */
  elevationM?: number;
}

/** How far off a stated elevation a peak may be and still be considered the one meant. 8% covers
 *  a sentence rounding 4478 to "4500" or citing a slightly different survey; it does not come
 *  close to covering a different mountain on another continent (4478 vs 3250 is 27% out). */
const ELEVATION_TOLERANCE = 0.08;

/** Pick the candidate to plot — or null, which callers must treat as "do not plot", never as
 *  "use the first one anyway". Refusing is the correct answer surprisingly often: it is what
 *  keeps a wine bar in Milan out of a map of Alpine summits. */
export function chooseCandidate(
  candidates: GeocodeCandidate[],
  opts: ChooseOptions,
): GeocodeCandidate | null {
  if (!candidates.length) return null;
  if (opts.expect !== "peak") return candidates[0] ?? null;

  const peaks = candidates.filter(isPeakCandidate);
  if (!peaks.length) return null; // no summit among the hits — say so, do not approximate one

  const stated = opts.elevationM;
  if (stated === undefined || !Number.isFinite(stated) || stated <= 0)
    return peaks[0] ?? null;

  // A peak whose own `ele` corroborates the sentence wins over mere result order.
  const corroborated = peaks
    .filter((p) => p.elevationM !== undefined)
    .map((p) => ({
      p,
      off: Math.abs((p.elevationM as number) - stated) / stated,
    }))
    .filter((x) => x.off <= ELEVATION_TOLERANCE)
    .sort((a, b) => a.off - b.off);
  return corroborated.length ? corroborated[0].p : (peaks[0] ?? null);
}

// --- the network half -----------------------------------------------------------------------

const ENDPOINT = "https://api.maptiler.com/geocoding";

export interface GeocodeOptions extends ChooseOptions {
  /** MapTiler key. Callers read it from the environment (VITE_MAPTILER_KEY / MAPTILER_API_KEY);
   *  it is a parameter here so this module never reaches for a global and never logs one. */
  key: string;
  /** Deliverable language, so the resolution shown to the journalist is in their language. */
  language?: string;
  limit?: number;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

async function queryLayer(
  place: string,
  layer: "default" | "poi",
  opts: GeocodeOptions,
): Promise<GeocodeCandidate[]> {
  const params = new URLSearchParams({
    key: opts.key,
    limit: String(opts.limit ?? 5),
  });
  if (opts.language) params.set("language", opts.language);
  if (layer === "poi") params.set("types", "poi");
  // The query is PATH-encoded, never concatenated raw — a place name is untrusted input.
  const url = `${ENDPOINT}/${encodeURIComponent(place)}.json?${params.toString()}`;
  const doFetch = opts.fetchImpl ?? fetch;
  // THE KEY IS IN `url`, so NOTHING derived from a failure may be re-thrown unredacted. A
  // transport failure (DNS, refused connection, timeout) rejects with the request URL inside its
  // message — measured, not assumed — which would put a live MapTiler key into any log that
  // catches it. This is the first place in the tree that builds a keyed URL at all, so it is the
  // first that can leak one.
  // Redacting rather than discarding: a swallowed cause turns a DNS failure and an expired key
  // into the same unhelpful line, and this runs on a journalist's machine where "it did not
  // work" has to be actionable.
  const redact = (s: string) => s.split(opts.key).join("***");
  let res: Response;
  try {
    res = await doFetch(url);
  } catch (cause) {
    throw new Error(
      `geocoding "${place}" (${layer} layer) failed: ` +
        redact(cause instanceof Error ? cause.message : String(cause)),
    );
  }
  if (!res.ok)
    throw new Error(
      `geocoding "${place}" (${layer} layer) failed: HTTP ${res.status}`,
    );
  return parseFeatures(await res.json(), layer);
}

export interface GeocodeResult {
  /** The chosen candidate, or null when nothing matched the expectation. */
  chosen: GeocodeCandidate | null;
  /** Everything that was on the table, so a refusal can say what it saw and a journalist
   *  correcting the machine has the alternatives in front of them. */
  candidates: GeocodeCandidate[];
}

/** Resolve one place name to a coordinate, holding the geocoder to the expected kind of place.
 *
 *  With `expect: "peak"` this queries the POI layer (the only one carrying summits) as well as
 *  the default one, and returns a peak or nothing. Without an expectation it is the plain
 *  first-hit lookup the chain already did — no behaviour change for glaciers, communes, or any
 *  other subject. */
export async function geocodePlace(
  place: string,
  opts: GeocodeOptions,
): Promise<GeocodeResult> {
  const name = place.trim();
  if (!name) throw new Error("geocodePlace: empty place name");
  if (!opts.key) throw new Error("geocodePlace: missing MapTiler key");
  const layers: ("default" | "poi")[] =
    opts.expect === "peak" ? ["poi", "default"] : ["default"];
  const candidates: GeocodeCandidate[] = [];
  for (const layer of layers)
    candidates.push(...(await queryLayer(name, layer, opts)));
  return { chosen: chooseCandidate(candidates, opts), candidates };
}

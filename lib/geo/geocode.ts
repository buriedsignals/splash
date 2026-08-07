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
//
// --- 2026-08-07: three more kinds, and four refusals -----------------------------------------
//
// `peak` was wired alone, with a note that another kind means MEASURING its layer rather than
// guessing. That measurement was done, against the live API, for every kind a mountain-and-water
// story asks for. The question it asked was not "does MapTiler find it" — it usually does — but
// "does the point it hands back MEAN what the sentence means", and the answers were checked
// against Overpass and Nominatim rather than against MapTiler, because a geocoder confirming its
// own answer proves nothing.
//
//   WIRED    lake        the point is IN the water. Verified by Overpass `is_in` for the Léman,
//                        Neuchâtel, the Bodensee and Como — including Como, whose Y shape wraps
//                        the Bellagio promontory and would defeat a naive centroid.
//   WIRED    glacier     the point is ON the ice (Aletsch, Gorner, Mer de Glace, same method).
//   WIRED    settlement  the point is the town CENTRE — Nominatim puts them on rue Jean-Calvin
//                        in Genève, the Duomo in Milan, the place Balmat in Chamonix — and NOT
//                        the middle of the commune, which for Zermatt would be up the Matterhorn.
//   REFUSED  river, massif, landmark, admin-area — with the measurement, in
//            UNRESOLVABLE_PLACE_KINDS. The river one is the sharpest: the Rhône's own name does
//            not return the Rhône, and the fragment that does comes back with a bounding box
//            191 km tall and a point 500–1000 m from the water, on a road.
//
// The second lesson of the measurement was that the KIND is only half the problem. "Lac Noir"
// returns Algeria's lake ahead of Fribourg's, and "Randa" a village in Djibouti ahead of the
// Valais one — both of the right kind, both scored equally, so no filter can separate them. Those
// refuse rather than guess, and `country` (a HARD server-side filter, measured) resolves them.

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
  /** The geocoder's classification of the FEATURE: ["municipality"], ["region"], ["poi"],
   *  ["major_landform"], ["address"]… This — not the categories — is what separates a town from
   *  the canton of the same name, which no tag does. */
  placeType: string[];
  /** MapTiler's coarser grouping: "admin_area", "place", "street", "road"… Present on the
   *  administrative and address features, absent on landforms and POIs. */
  kind?: string;
  /** MapTiler's own 0–1 score for how well this feature answers the QUERY. It is what separates
   *  "two real places share this name" from "the geocoder padded the list with near-misses":
   *  asking for "Lac de Neuchâtel" returns the lake at 1 and the unrelated Lac des Taillères at
   *  0.74, while "Lac Noir" returns the Algerian and the Swiss lake BOTH at 1. */
  relevance?: number;
  /** ISO 3166-1 alpha-2, as MapTiler reports it — "ch", or "fr,ch" for a feature that straddles
   *  a border like the Léman. Worth showing back: "Randa (dj)" is a correction a journalist can
   *  make instantly, where a lon/lat is not. */
  countryCode?: string;
  /** Which MapTiler layer produced this hit. */
  layer: "default" | "poi";
}

/**
 * The kinds of subject this module can hold the geocoder to. Four are wired, and each one was
 * MEASURED against the live API before it was — the question being not "does MapTiler find it"
 * but "does the point it hands back mean what a journalist's sentence means". The kinds it
 * refuses, and why, are in UNRESOLVABLE_PLACE_KINDS below; a refusal that names its reason is
 * worth more than a plausible wrong coordinate.
 *
 *   peak       (2026-08-06) POI layer, `natural=peak`. The default layer has NO peaks at all.
 *   lake       (2026-08-07) default layer, `water=lake`. The point is INSIDE the water.
 *   glacier    (2026-08-07) default layer, `natural=glacier`. The point is ON the ice.
 *   settlement (2026-08-07) default layer, a municipality or a place node. The point is the
 *              town CENTRE, not the middle of the commune.
 *
 * ★ THE ASYMMETRY, and it follows the measurement rather than a taste for symmetry. `peak` takes
 * the first summit among the hits when no elevation is stated, because MapTiler ranked the
 * notable summit first in every case measured (Cervin above Matterhorn-Nevada for "Matterhorn";
 * the 4545 m Dom above four cathedrals for "Dom"). The three kinds added after it are NOT
 * allowed to do that, because the same measurement caught the ranking failing: "Lac Noir"
 * returns ALGERIA's lake ahead of the Fribourg Schwarzsee, and "Randa" returns a village in
 * DJIBOUTI ahead of the Valais village under the Matterhorn. Both are real features of the right
 * kind, so no filter separates them and first-hit-wins would ship the wrong continent in silence.
 * So: for lake / glacier / settlement, MORE THAN ONE candidate of the kind ⇒ null. What resolves
 * it is `country` — measured to be a HARD server-side filter, not a re-ranking (see GeocodeOptions).
 */
export type ExpectedPlaceKind = "peak" | "lake" | "glacier" | "settlement";

/**
 * Kinds a journalist will ask for that this module will NOT answer, each with the measurement
 * that closed it. They are absent from ExpectedPlaceKind, so asking is a type error; this map
 * exists so the REASON is in the code as data — quotable back to the journalist, and testable.
 */
export const UNRESOLVABLE_PLACE_KINDS: Readonly<Record<string, string>> = {
  river:
    "a river has no coordinate. Measured 2026-08-07: MapTiler does not return the Rhône, the " +
    "Loire or the Danube at all for their own names (the first hits are the French départements " +
    "and, for the Danube, a town in Minnesota). Ask for 'Le Rhône' and it returns individual OSM " +
    "WAYS of the channel — two of them, 300 km apart, each a fragment of the same river; the " +
    "point returned for one has a bounding box 191 km tall and sits 500–1000 m from the water, " +
    "on the Route d'Avignon (checked against Overpass and Nominatim, not against MapTiler). " +
    "Plot the reach the sentence is about — a line, or the named place ON it — never 'the river'",
  massif:
    "measured 2026-08-07: 'Massif du Mont-Blanc' and 'Massif des Écrins' return nothing but " +
    "streets — no massif feature exists in the layers this module can reach. Name the summit " +
    "(expect:'peak'), the valley town (expect:'settlement') or the glacier instead",
  landmark:
    "the POI layer DOES hold them, and accurately — Tour Eiffel, Colosseo and the Palais fédéral " +
    "all resolve to within ~20 m — but there is no tag that says 'landmark'. Measured 2026-08-07: " +
    "the three carry three unrelated category sets (attraction/monument/observation tower, " +
    "attraction/building/archaeological site, government/government building), so a filter is " +
    "either too narrow to find the Palais fédéral or wide enough to accept anything; and result " +
    "order cannot stand in for one, because 'Gare de Cornavin' returns a SUPERMARKET first. Give " +
    "the coordinate from the newsroom's own data, or have the journalist place the marker",
  "admin-area":
    "a region is an area, and its point is a label anchor rather than a place. Measured " +
    "2026-08-07: the point returned for Valais reverse-geocodes to a bench on a footpath above " +
    "Oberems, and the one for Haute-Savoie to a fountain in Annecy — neither is where the region " +
    "IS. Shade the region instead (the choropleth path: lib/geo/adm1-index.json and join.ts), or " +
    "plot the town the sentence actually means with expect:'settlement'",
};

/** Category tokens that mean "this feature is a summit". `natural=peak` is promoted into
 *  `categories` by parseFeatures, so both shapes are covered by one list. */
const PEAK_CATEGORIES = new Set(["peak", "summit"]);

/** `water=lake` — promoted into `categories` by parseFeatures. Deliberately NOT `natural=water`
 *  and NOT MapTiler's `water` category, both of which also cover reservoirs, canals, ponds and
 *  river widenings (measured: "Lac Noir" in the Vosges is `water=reservoir`; "Lac de la Joux"
 *  carries `natural=water` and nothing that says what kind of water it is). Refusing an
 *  unqualified water body costs a real lake now and then; accepting one would put a marker on a
 *  reservoir under a sentence about a lake, which is the failure this module exists to stop. */
const LAKE_CATEGORIES = new Set(["lake"]);

/** `natural=glacier`, likewise promoted. The name is never enough: MapTiler's answer for
 *  "Glacier d'Aletsch" includes a LAKE in Nepal literally named "glacier". */
const GLACIER_CATEGORIES = new Set(["glacier"]);

/** MapTiler `place_type` values that mean "people live here". `region` / `county` / `country` /
 *  `subregion` are deliberately absent: they are administrative areas, refused for the reason in
 *  UNRESOLVABLE_PLACE_KINDS["admin-area"]. */
const SETTLEMENT_PLACE_TYPES = new Set([
  "municipality",
  "municipal_district",
  "joint_municipality",
  "locality",
  "place",
]);

export function isPeakCandidate(c: GeocodeCandidate): boolean {
  return c.categories.some((cat) => PEAK_CATEGORIES.has(cat));
}

/** A LAKE — a body of standing water, whose returned point is inside the water. Verified against
 *  a source other than the one that produced it: Overpass `is_in` puts the point MapTiler returns
 *  for the Léman, Neuchâtel, Bodensee and Como inside each lake's own polygon, including Como,
 *  whose Y shape wraps a promontory. What it does NOT mean: a particular shore, bay, outlet or
 *  the deepest point. A sentence about "the mouth of the Rhône at the Léman" is not this. */
export function isLakeCandidate(c: GeocodeCandidate): boolean {
  return c.categories.some((cat) => LAKE_CATEGORIES.has(cat));
}

/** A GLACIER, whose returned point is on the ice — Overpass `is_in` puts the Aletsch, Gorner and
 *  Mer de Glace points inside `natural=glacier`. What it does NOT mean, and this is the one that
 *  will bite: the SNOUT. Glacier stories are retreat stories, and "the front has withdrawn 800 m"
 *  is a claim about the terminus, which is a moving point this module cannot give you — the
 *  coordinate here is somewhere on a body of ice kilometres long. */
export function isGlacierCandidate(c: GeocodeCandidate): boolean {
  return c.categories.some((cat) => GLACIER_CATEGORIES.has(cat));
}

/** A SETTLEMENT — a town, village or hamlet, whose returned point is the CENTRE, not the middle
 *  of the commune. Measured by reverse-geocoding the answers against Nominatim: Genève lands on
 *  rue Jean-Calvin in the Vieille-Ville, Milan on the Duomo, Chamonix on the place Balmat, Randa
 *  on a house in Unteres Randa. That distinction matters more than it sounds: Zermatt's commune
 *  is 26 × 16 km and contains the Matterhorn, and the point is the village. */
export function isSettlementCandidate(c: GeocodeCandidate): boolean {
  if (c.placeType.some((t) => SETTLEMENT_PLACE_TYPES.has(t))) return true;
  return c.kind === "place";
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
    // The OSM tags are the authoritative statement of what a feature IS, and a feature can carry
    // one with `categories` empty — the Rhône segment arrives with `waterway=river` and nothing
    // else, so without this promotion a river is indistinguishable from an untyped landform.
    // `natural` carries peak / glacier / water; `water` separates lake from reservoir and canal;
    // `waterway` marks the linear features that have no single coordinate at all.
    for (const key of ["natural", "water", "waterway"]) {
      const v = tags[key];
      if (typeof v === "string" && v.trim())
        categories.add(v.trim().toLowerCase());
    }

    const placeType: string[] = [];
    if (Array.isArray(f.place_type))
      for (const t of f.place_type)
        if (typeof t === "string" && t.trim())
          placeType.push(t.trim().toLowerCase());

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
      ...(typeof f.relevance === "number" && Number.isFinite(f.relevance)
        ? { relevance: f.relevance }
        : {}),
      ...(typeof props.country_code === "string" && props.country_code.trim()
        ? { countryCode: props.country_code.trim().toLowerCase() }
        : {}),
      placeType,
      ...(typeof props.kind === "string" && props.kind.trim()
        ? { kind: props.kind.trim().toLowerCase() }
        : {}),
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
/** The kind filters for everything added after `peak`. Kept as a table so an unknown expectation
 *  — a kind read out of JSON, where the type system is no help — falls off the end and refuses,
 *  rather than falling through to first-hit-wins. */
const SINGLE_MATCH_KINDS: Record<string, (c: GeocodeCandidate) => boolean> = {
  lake: isLakeCandidate,
  glacier: isGlacierCandidate,
  settlement: isSettlementCandidate,
};

/**
 * Only the candidates that answer the QUERY as well as the best one does.
 *
 * Without this, refusing on "more than one of the kind" refuses far too much, because MapTiler
 * pads a result list with near-misses of the same kind: "Lac de Neuchâtel" comes back with the
 * lake AND the unrelated Lac des Taillères, both `water=lake`. `relevance` is the API's own
 * answer to that — the lake scores 1, the Taillères 0.74 — and it is the honest one to use,
 * because it is a statement about the QUERY rather than a guess of ours about which lake matters.
 * The refusals it leaves standing are the real ones: "Lac Noir" returns the Algerian and the
 * Swiss lake BOTH at 1, "Randa" returns five settlements at 1 on three continents.
 *
 * A candidate carrying no relevance loses to one that does; if NONE carries it (a trimmed
 * fixture, or an API that stops sending it) they all tie and the caller gets the strict
 * more-than-one refusal, which errs toward saying nothing.
 */
function bestAnswers(matches: GeocodeCandidate[]): GeocodeCandidate[] {
  if (matches.length < 2) return matches;
  const score = (c: GeocodeCandidate) =>
    c.relevance ?? Number.NEGATIVE_INFINITY;
  const max = Math.max(...matches.map(score));
  if (!Number.isFinite(max)) return matches;
  return matches.filter((c) => score(c) === max);
}

export function chooseCandidate(
  candidates: GeocodeCandidate[],
  opts: ChooseOptions,
): GeocodeCandidate | null {
  if (!candidates.length) return null;
  if (opts.expect === undefined) return candidates[0] ?? null;

  if (opts.expect !== "peak") {
    const isKind = SINGLE_MATCH_KINDS[opts.expect];
    if (!isKind) return null; // an expectation this module never measured — refuse, do not guess
    const matches = bestAnswers(candidates.filter(isKind));
    // Exactly one, or nothing. Two features of the right kind that answer the name EQUALLY WELL
    // are two real places, and picking between them is the caller's job (with `country`), not a
    // coin toss — see the ASYMMETRY note on ExpectedPlaceKind for the measurement behind this.
    return matches.length === 1 ? matches[0]! : null;
  }

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
  /**
   * ISO 3166-1 alpha-2 code(s), comma-separated ("ch", "ch,fr") — where the article says the
   * place is. This is the disambiguator the kinds added in 2026-08 need, and it was measured to
   * be a HARD filter applied server-side, not a re-ranking: "Sion" with `country=ch` comes back
   * with exactly one feature, and "Randa" with `country=ch` no longer mentions Djibouti at all.
   * (`proximity` and `bbox` were measured too — both only REORDER, the foreign homonyms stay in
   * the list, so neither can be trusted to make a refusal into a resolution.)
   *
   * Cross-border features survive it: the Léman is returned under `country=ch` even though its
   * place_name names no country, because the filter is on the feature's geography rather than on
   * the string. Allowlisted, never passed through — see assertCountryFilter.
   */
  country?: string;
  limit?: number;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** `country` is a closed vocabulary reaching a request from untrusted text (a country read out of
 *  an article), so it is ALLOWLISTED before the URL is built rather than encoded and hoped for.
 *  The reason is not injection — URLSearchParams escapes — it is silence: MapTiler ignores a
 *  country it does not understand, so "switzerland" or a stray space would widen the search back
 *  to the whole planet while the caller believed it was narrowed, and the refusal-on-ambiguity
 *  rule would quietly become a refusal on everything. */
export function assertCountryFilter(country: string): string {
  const codes = country.split(",").map((c) => c.trim().toLowerCase());
  // The cap is not a MapTiler limit; it is a bound on how wide a "narrowing" may be before it
  // stops being one. A list of thirty countries is a caller who has not decided where the place
  // is, and it would hand back a refusal-on-ambiguity that reads like a geocoder failure.
  if (codes.length > 10 || !codes.every((c) => /^[a-z]{2}$/.test(c)))
    throw new Error(
      `geocodePlace: country must be ISO 3166-1 alpha-2 code(s) like "ch" or "ch,fr" — got ` +
        `"${country}". MapTiler silently ignores anything else, which turns a narrowed search ` +
        `into a worldwide one without saying so`,
    );
  return codes.join(",");
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
  if (opts.country) params.set("country", assertCountryFilter(opts.country));
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

/**
 * Resolve one place name to a coordinate, holding the geocoder to the expected kind of place.
 *
 * With `expect: "peak"` this queries the POI layer (the only one carrying summits) as well as the
 * default one, and returns a peak or nothing. `lake`, `glacier` and `settlement` read the default
 * layer and return the one feature of that kind that answers the name — or null when two answer
 * it equally well, which `country` is there to resolve. Without an expectation it is the plain
 * first-hit lookup the chain already did — no behaviour change for any subject.
 *
 * Whatever it returns, `candidates` carries everything that was on the table, because a refusal
 * that cannot say what it saw is not much better than a wrong answer: "Randa matched five
 * settlements — dj, ch, es, no, us — say which country" is a question a journalist can answer in
 * a second.
 */
export async function geocodePlace(
  place: string,
  opts: GeocodeOptions,
): Promise<GeocodeResult> {
  const name = place.trim();
  if (!name) throw new Error("geocodePlace: empty place name");
  if (!opts.key) throw new Error("geocodePlace: missing MapTiler key");
  // Validate before ANY request goes out, so a bad filter fails loud instead of returning a
  // worldwide result set that looks narrowed.
  if (opts.country) assertCountryFilter(opts.country);
  // Only `peak` needs the POI layer, and it needs it because the default layer has no peaks in
  // it. Lakes, glaciers and settlements are all default-layer features (measured); asking the POI
  // layer for them would add restaurants and shops named after them and nothing else.
  const layers: ("default" | "poi")[] =
    opts.expect === "peak" ? ["poi", "default"] : ["default"];
  const candidates: GeocodeCandidate[] = [];
  for (const layer of layers)
    candidates.push(...(await queryLayer(name, layer, opts)));
  return { chosen: chooseCandidate(candidates, opts), candidates };
}

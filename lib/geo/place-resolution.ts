// A coordinate the machine resolved by itself is a claim, and until now it was the only claim in
// the chain nobody had to stand behind.
//
// The takeaway is confirmed verbatim and a gate fails without it (validate-gate.ts, GUARD 3). The
// source is compared against what the article named and what the journalist answered
// (source-guard.ts, GUARDs 2b/2c/2d). The narrative walk has to be written before a video is made
// (narrative-walk-gate.ts). A lon/lat had NOTHING: suggest-chart/SKILL.md forbids INVENTING one,
// and map-native's validators check it is a number between -180 and 180 and say in their own
// comments that this is all they can do. Nothing showed the resolved place back, nothing compared
// it to the label beside it, and no test anywhere touched the question.
//
// The cost, measured: on exports/glaciers-requiem-2026 the marker "Cervin" was plotted at
// 7.661000215400804, 45.986011489842674 — MapTiler's Matterhorn GLACIER centroid, 1063 m north of
// the summit — under the beat « Au sommet du Cervin, à 4478 mètres, des cascades torrentielles ».
// The journalist said the point was wrong BEFORE production ran. The run directory records one
// line, `suggest-chart-invoked`. There was no field for the correction to be written into and no
// guard that would have noticed its absence, so it went nowhere.
//
// This file is the smallest honest closure. Five checks, four hard, one advisory:
//
//   G1  A summit claim OWES a resolution record.       spec-only — fires on the failing run TODAY
//   G2  The record must not contradict the sentence.   record-based
//   G3  A geocoded place must have been SHOWN.         record-based
//   G4  The record's coordinate must BE what is plotted. record-based — this is what makes a
//                                                      correction land instead of evaporating
//   G5  A point map with no records at all.            advisory warning (the disarm, made visible)
//
// G1 is the one that matters most, because it needs nothing threaded to fire: a sentence that says
// "at the summit, at 4478 metres" is a testable claim about a coordinate, and a map making it must
// be able to say what it plotted.
//
// 2026-08-07 — THE THREADING IS NO LONGER PROSE. This file used to end its note by saying that
// `resolvedPlaces` reached the proposal only because §5b asked for it, exactly like `sourceHint`,
// and that G1 plus the G5 warning were the compensation for that seam rather than a closure of it.
// The two are not actually the same case: `sourceHint` is a value a model READS out of an article,
// and nothing but the model is in that gap, while a coordinate is the return value of a FUNCTION
// CALL that already happened there (suggest-chart/SKILL.md sends the host to lib/geo/geocode.ts).
// That call now leaves a receipt — skills/suggest-chart/scripts/resolve-place.mjs writes
// <runDir>/places.json — and skills/splash/src/place-provenance.ts makes produce-all refuse a
// proposal that does not account for it. So G2/G3/G4 below are no longer disarmable by simply
// declining to write the record: the run directory remembers what the machine resolved.
//
// What is unchanged, and what those guards still own: G1 fires on the SPEC alone, so it holds even
// for a run that skipped the resolver entirely (verified end to end — an element that declares
// `coordinatesFromData` clears the provenance gate and STILL fails G1 on a summit claim). G5 stays
// a warning, because place-provenance.ts refuses total absence and the two must not double-report.

/** What the machine (or the journalist) settled on for one named place, and where it came from. */
export interface ResolvedPlace {
  /** The marker/point `label` in the spec this record accounts for. Matched exactly. */
  label: string;
  /**
   * WHO put this number in the spec.
   *   `data`       — read from a lon/lat column in the newsroom's own file. Owes nothing.
   *   `geocoder`   — the machine looked it up. Owes a showback (G3).
   *   `journalist` — the journalist gave or corrected it. Owes nothing; it is already theirs.
   *
   * SELF-REPORTED, AND CORROBORATED WHERE A RECEIPT EXISTS. The comparison this note used to draw
   * — "self-reported, exactly like `confirmedTakeaway` and `sourceHint`" — no longer holds for
   * `sourceHint` either (skills/splash/src/source-provenance.ts), so it is worth being exact about
   * what is checked here and what is not. Three cases, measured:
   *
   *  · A NON-GEOCODER ORIGIN THE RUN'S OWN RECEIPT DISPROVES — refused. place-provenance.ts (L2a)
   *    reads `<runDir>/places.json` and stops a run that writes `data` OR `journalist` over a
   *    coordinate the sanctioned resolver returned. It asked only about `data` until 2026-08-07,
   *    which made the whole check walk-around-able by typing the other word: G3 below demands a
   *    showback for `geocoder` ALONE, so `journalist` waived it just as well. The declared
   *    correction (`correctedFrom` copying the resolution) is the one exemption, because a
   *    journalist who moved the point does own the new coordinate.
   *
   *  · `geocoder` CLAIMED WITH NO RECEIPT — a warning, never a verdict, and deliberately.
   *    Corroborating it would ask the receipt to prove a NEGATIVE about a lookup that did not go
   *    through it, which is the question attestation-corroboration.ts already settled for this
   *    repo: "an individual absence is a WARNING, never a verdict; what IS a verdict is the TOTAL
   *    absence". The total case is not left open — place-provenance.ts L3 refuses a point map that
   *    can account for NONE of its coordinates.
   *
   *  · A COORDINATE PRODUCED WITHOUT CALLING THE SANCTIONED RESOLVER AT ALL, recorded with an
   *    origin that owes nothing — THE REMAINING TRUST BOUNDARY, and a genuinely different problem
   *    rather than an unfinished one. The mechanism that closed the other two is a receipt left by
   *    a real call; it cannot witness a call that never happened. Closing it would need something
   *    else entirely (re-geocoding at the gate, which puts the network on the production path and
   *    answers the wrong question — see place-provenance.ts's rejected alternatives). It is
   *    bounded, not unbounded: G1, G2 and G4 read the SPEC and the RESOLUTION rather than the
   *    claim about who produced them, so the defect this file exists for is caught either way, and
   *    a map that accounts for nothing at all is refused outright.
   */
  origin: "data" | "geocoder" | "journalist";
  lon: number;
  lat: number;
  /** What the geocoder called the thing it returned ("Matterhorngletscher, Suisse") — the single
   *  most useful string to put in front of a journalist, because it is where "that is the
   *  glacier, not the summit" becomes sayable. */
  resolvedName?: string;
  /** What the geocoder said it IS: ["peak"], ["glacier"]… Lowercased. G2 reads this. */
  categories?: string[];
  /** Metres above sea level, when the feature carried `ele`. G2 cross-checks it. */
  elevationM?: number;
  /** Set when the journalist overrode a machine resolution: the coordinate the machine had. Its
   *  presence is what distinguishes "the journalist agreed" from "the journalist corrected it". */
  correctedFrom?: { lon: number; lat: number };
  /** True once this resolution — the coordinate AND what it resolved to — was put in front of the
   *  journalist. G3 requires it for `origin: "geocoder"`. */
  shownToJournalist?: boolean;
}

// --- reading the claim out of the prose ----------------------------------------------------

// The summit word in the languages splash ships. Anchored with word boundaries; `sommet`/`summit`
// also cover the possessive and plural forms by prefix.
const SUMMIT_WORDS =
  /\b(?:sommets?|summits?|cimas?|cime|vetta|vette|gipfel|peak of|au sommet|auf dem gipfel|in cima|culmine|culminant|culminating|culmina)\b/iu;

// An ALTITUDE, not merely a number of metres. Two things do the separating, and neither is a
// decimal check: the SHAPE (an integer, optionally with a thousands separator, so "1,60 mètre" —
// a glacier thinning, from this very article — matches nothing because "60" is not a 3-digit
// group), and the FLOOR (500 m, so "300 mètres de large" is under it). A length of 1500 m WOULD
// fire; that is the accepted residue, and the remedy it asks for is cheap — record what the
// coordinate resolved to.
const ELEVATION =
  /(\d{1,2}[   ,.]?\d{3}|\d{3,5})\s?(?:m|mètres?|metres?|meters?)\b/iu;
// 1000 m, and the reason is a writing convention rather than a guess about mountains: a
// HORIZONTAL distance past a kilometre is written in km ("a 3 km du village"), never in metres,
// while an ALTITUDE past a kilometre is always written in metres ("a 4478 metres"). So above this
// floor a bare metre quantity is an altitude, and below it -- "a 800 m du village", "un front de
// 300 metres de large" -- it is a distance and must not fire. The cost is a summit under 1000 m
// claimed without a summit word, which SUMMIT_WORDS catches whenever the word is there.
const ELEVATION_FLOOR_M = 1000;

/** The elevation a sentence states, in metres — or undefined. Handles the thousands separators
 *  the three shipped languages use (4478, 4 478, 4,478). */
export function statedElevationM(text: string): number | undefined {
  if (typeof text !== "string") return undefined;
  const m = text.match(ELEVATION);
  if (!m) return undefined;
  const n = Number.parseInt(m[1].replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n < ELEVATION_FLOOR_M) return undefined;
  return n;
}

/** Does this text make a claim about a SUMMIT — by naming one, or by naming an altitude?
 *  Deliberately narrow. A false positive here blocks a legitimate run, which is worse than the
 *  defect for every map that is not making this claim. */
export function claimsASummit(text: string): boolean {
  if (typeof text !== "string" || !text.trim()) return false;
  if (SUMMIT_WORDS.test(text)) return true;
  return statedElevationM(text) !== undefined;
}

// --- reading the places out of the spec ----------------------------------------------------

export interface SpecPlace {
  label: string;
  lon: number;
  lat: number;
}

/** Every plotted place in a point spec — `markers[]` (locator) and `points[]` (symbol) both.
 *  Exported as `plottedPlaces` below: "what does this spec actually plot" must have exactly ONE
 *  answer in the tree, or a guard reading the spec a second way would go dormant on shapes this
 *  one catches (skills/splash/src/place-provenance.ts is the second reader). */
function specPlaces(spec: unknown): SpecPlace[] {
  const s = (spec ?? {}) as Record<string, unknown>;
  const out: SpecPlace[] = [];
  for (const key of ["markers", "points"]) {
    const arr = s[key];
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      const p = raw as Record<string, unknown> | null;
      if (!p || typeof p !== "object") continue;
      const { lon, lat, label } = p;
      if (typeof lon !== "number" || typeof lat !== "number") continue;
      if (typeof label !== "string" || !label.trim()) continue;
      out.push({ label: label.trim(), lon, lat });
    }
  }
  return out;
}

export { specPlaces as plottedPlaces };

/** Every piece of prose that could make a claim about a given place: the beats naming it, plus the
 *  spec's own title and description (a title can carry the claim just as well as a beat can). */
function textsAbout(spec: unknown, label: string): string[] {
  const s = (spec ?? {}) as Record<string, unknown>;
  const texts: string[] = [];
  for (const key of ["title", "description"]) {
    const v = s[key];
    // A title/description only speaks about THIS place when it names it.
    if (typeof v === "string" && v.includes(label)) texts.push(v);
  }
  const beats = s.arcBeats;
  if (Array.isArray(beats))
    for (const raw of beats) {
      const b = raw as Record<string, unknown> | null;
      if (!b || typeof b !== "object") continue;
      const region = typeof b.region === "string" ? b.region.trim() : "";
      const text = typeof b.text === "string" ? b.text : "";
      if (!text) continue;
      if (region === label || text.includes(label)) texts.push(text);
    }
  return texts;
}

// --- the guards -----------------------------------------------------------------------------

function isPeak(categories: string[] | undefined): boolean | undefined {
  if (!Array.isArray(categories) || categories.length === 0) return undefined;
  return categories.some((c) => /^(peak|summit)$/i.test(String(c).trim()));
}

/** How far a peak's own elevation may sit from the one the sentence states. Same 8% as the
 *  geocoder's disambiguator, for the same reason: it absorbs rounding and survey differences and
 *  nothing else (4478 vs 3250 is 27% out). */
const ELEVATION_TOLERANCE = 0.08;

/** Coordinates are compared exactly. A resolution record is COPIED from the resolution that
 *  produced the marker, not recomputed, so any difference is a real divergence — most often the
 *  one that matters: a correction recorded and then not applied. */
function samePoint(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
) {
  return a.lon === b.lon && a.lat === b.lat;
}

/**
 * Every hard finding about the places this spec plots. Empty array ⇒ nothing to say.
 *
 * `resolvedPlaces` is threaded onto the accepted proposal by the orchestrator at §5b. Unlike
 * `sourceHint`, that threading is now ENFORCED rather than asked for: the resolver leaves a
 * receipt in the run directory and skills/splash/src/place-provenance.ts refuses a proposal that
 * does not carry it across (see this file's header note). These legs therefore run on every point
 * map whose places were resolved here. G1 remains spec-only on top of that, for the run that never
 * touched the resolver at all.
 */
export function resolvedPlaceErrors(
  spec: unknown,
  resolvedPlaces: ResolvedPlace[] | undefined,
): string[] {
  const places = specPlaces(spec);
  if (!places.length) return [];
  const records = Array.isArray(resolvedPlaces) ? resolvedPlaces : [];
  const errors: string[] = [];

  // G1 — a summit claim owes a resolution record. Spec-only: needs nothing threaded.
  for (const place of places) {
    const texts = textsAbout(spec, place.label);
    const claim = texts.find((t) => claimsASummit(t));
    if (!claim) continue;
    if (records.some((r) => r.label === place.label)) continue;
    errors.push(
      `"${place.label}" is plotted at ${place.lon}, ${place.lat} under a sentence that ` +
        `claims a SUMMIT — "${claim.trim().slice(0, 120)}" — but nothing records WHAT that ` +
        `coordinate resolved to. A geocoder's first hit for a mountain's name is routinely the ` +
        `GLACIER or the massif, whose coordinate is a polygon centroid on the flank (the real ` +
        `Cervin miss: 1063 m off, on the Zmutt glacier). Resolve the place as a peak ` +
        `(lib/geo/geocode.ts, expect:"peak"), SHOW the journalist what it resolved to, and ` +
        `record it in resolvedPlaces before producing`,
    );
  }

  for (const r of records) {
    const place = places.find((p) => p.label === r.label);

    // G4a — a record for a place the spec does not plot.
    if (!place) {
      errors.push(
        `resolvedPlaces carries "${r.label}" but no marker of that name is plotted — the ` +
          `record and the spec disagree about which places this map shows`,
      );
      continue;
    }

    // G4b — the record's coordinate must BE the one plotted. This is what makes a correction
    // land: a journalist who moved the point to the summit has that number here, and a spec
    // still carrying the glacier fails loudly instead of shipping.
    if (!samePoint(r, place)) {
      const corrected = r.correctedFrom
        ? ` The record is a CORRECTION (was ${r.correctedFrom.lon}, ${r.correctedFrom.lat}) — ` +
          `apply it to the marker rather than producing the coordinate it replaces.`
        : "";
      errors.push(
        `"${r.label}" resolved to ${r.lon}, ${r.lat} but the spec plots ${place.lon}, ` +
          `${place.lat} — the plotted coordinate does not match the resolution it claims to ` +
          `come from.${corrected}`,
      );
    }

    // G3 — a coordinate the machine resolved on its own must have been shown.
    if (r.origin === "geocoder" && r.shownToJournalist !== true)
      errors.push(
        `"${r.label}" was resolved by the geocoder to ${r.resolvedName ?? `${r.lon}, ${r.lat}`}` +
          ` and never shown to the journalist. A coordinate the machine chose is a claim it ` +
          `made: show WHAT it resolved to (name, kind, elevation) and let them correct it, then ` +
          `set shownToJournalist`,
      );

    // G2 — what it resolved to must not contradict the sentence.
    const texts = textsAbout(spec, r.label);
    const claim = texts.find((t) => claimsASummit(t));
    if (!claim) continue;
    const peak = isPeak(r.categories);
    if (peak === false) {
      errors.push(
        `"${r.label}" is described as a SUMMIT — "${claim.trim().slice(0, 120)}" — but the ` +
          `geocoder resolved it to ${r.resolvedName ?? "a feature"} of kind ` +
          `[${(r.categories ?? []).join(", ")}], whose coordinate is that feature's centroid, ` +
          `not a summit. Resolve the peak itself (lib/geo/geocode.ts, expect:"peak") or change ` +
          `the sentence to describe what is actually plotted`,
      );
      continue;
    }
    // A peak whose own elevation contradicts the stated one is the wrong mountain of that name.
    const stated = statedElevationM(claim);
    if (peak === true && stated !== undefined && r.elevationM !== undefined) {
      const off = Math.abs(r.elevationM - stated) / stated;
      if (off > ELEVATION_TOLERANCE)
        errors.push(
          `"${r.label}" is described as reaching ${stated} m but resolved to ` +
            `${r.resolvedName ?? "a peak"} at ${r.elevationM} m — that is a different summit of ` +
            `the same name. Disambiguate with the stated elevation (lib/geo/geocode.ts takes ` +
            `elevationM) and show the journalist which one was picked`,
        );
    }
  }

  return errors;
}

/**
 * ADVISORY (never a hard failure), and deliberately kept as one now that place-provenance.ts
 * REFUSES the same condition before any engine runs: a run reaching here with no records has
 * already answered for that (it declared `coordinatesFromData`, or its places carry records under
 * other labels), so hardening this would double-report a gap the spine already decided about. It
 * stays as the render-gate's visible note that G2/G3/G4 had nothing to read — the same service
 * `droppedSourceHintWarning` performs for the source guards, which really are still prose-fed.
 */
export function resolvedPlaceWarnings(
  spec: unknown,
  resolvedPlaces: ResolvedPlace[] | undefined,
): string[] {
  const places = specPlaces(spec);
  if (!places.length) return [];
  if (Array.isArray(resolvedPlaces) && resolvedPlaces.length) return [];
  return [
    `place-resolution observability: this map plots ${places.length} named ` +
      `${places.length === 1 ? "place" : "places"} and NO resolvedPlaces record was threaded, so ` +
      `nothing can check that a coordinate the machine resolved was shown to the journalist, ` +
      `matches what it resolved to, or carries a correction they gave. Thread resolvedPlaces ` +
      `onto accepted.json (splash/SKILL.md §5b) — the guards are dormant without it`,
  ];
}

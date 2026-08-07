// THE RESOLUTION RECEIPT, CONFRONTED WITH THE ACCEPTED PROPOSAL.
//
// GUARD 6 (lib/geo/place-resolution.ts) is the teeth for a coordinate the machine resolved: it
// checks that the resolution was shown, that it does not contradict the sentence beside it, and
// that what is plotted is what the journalist saw. Its author then wrote down its own limit:
//
//   "threading `resolvedPlaces` is prose-enforced at §5b like `sourceHint`, since no script sits
//    between suggest-chart's in-context output and `accepted.json`. G1's spec-only leg plus the
//    G5 warning are the compensation for that seam, not a substitute for closing it."
//
// That is true of `sourceHint`, and it was NOT true here — and the difference is the whole fix.
// `sourceHint` is a value a model READS out of an article; nothing but the model is in that gap.
// A coordinate is the return value of a FUNCTION CALL that already happens in that gap:
// suggest-chart/SKILL.md tells the host to call `geocodePlace()` from lib/geo/geocode.ts, "not a
// hand-rolled fetch". Real code, running in the seam, writing nothing down. So the closure is not
// a new checkpoint bolted on: it is that call leaving a receipt
// (skills/suggest-chart/scripts/resolve-place.mjs → <runDir>/places.json), and this module asking
// the accepted proposal to account for it.
//
// WHAT THIS CHANGES. Before: omitting `resolvedPlaces` disarmed G2/G3/G4 and cost nothing —
// silence was the cheapest way past every record-based leg. After: the run directory remembers
// what the machine resolved, so silence is the one thing that FAILS. The dodge and the fix have
// swapped places.
//
// THREE LEGS, and the third is the one that keeps the trap shut:
//
//   L1  A resolution on disk that the proposal did not carry across.  ⇒ refuse
//   L2  A record that copies neither the resolution nor a declared correction of it. ⇒ refuse
//   L3  A point map that accounts for NONE of its coordinates.        ⇒ refuse
//
// L1 cannot be dodged by not writing `resolvedPlaces`: the trigger is the receipt, not the
// record. L3 cannot be dodged by not writing the RECEIPT either — a map that plots named places
// and can say nothing at all about where a single one of them came from is refused on the spec
// alone. The way out of L3 is one explicit claim, `coordinatesFromData: true`, and that is
// deliberate rather than a hole: it converts a SILENCE into a VISIBLE, CHECKABLE FALSE STATEMENT,
// which is exactly how candidate-provenance.ts closed the same shape of omission ("an improviser
// can no longer skip the menu by simply omitting the field; they would have to FALSELY declare
// direct"), and how `freeStanding: true` closed it for placement. And it is not even free: L2
// refuses that declaration the moment the run's own receipt contradicts it.
//
// WHAT WAS REJECTED, and why:
//
//  · REQUIRE `resolvedPlaces` on every point map. It reads as the strongest option and is the
//    worst one: a symbol map built from a newsroom CSV with 200 lon/lat rows resolved NOTHING,
//    and demanding 200 records for it false-blocks a legitimate run — the cardinal sin
//    candidate-provenance.ts names. L3's total-absence test asks for one honest sentence instead,
//    which is attestation-corroboration.ts's own rule ("an individual absence is a WARNING, never
//    a verdict; what IS a verdict is the TOTAL absence").
//  · NORMALIZE at produce-all's entry — synthesize a record for each plotted marker. This would
//    close the seam by making it unfalsifiable: a record derived FROM the plotted coordinate
//    agrees with that coordinate by construction, so G4 (the leg that makes a correction land)
//    could never fire again. A guard fed its own answer is not a guard.
//  · RE-GEOCODE at the gate and compare. Puts the network on the production path, is
//    non-deterministic across MapTiler updates, and answers the wrong question: the record is not
//    "what does the geocoder say today", it is "what did the journalist SEE and agree to".
//
// PURE apart from `readPlaceProvenance`'s single file read — the confrontation itself is a
// function of two values, so every branch below is a plain unit test, the same split
// attestation-corroboration.ts uses.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AcceptedProposal } from "./producer-spec";
import { plottedPlaces } from "../../../lib/geo/place-resolution";
import { routed, type RoutedRefusal } from "../../../lib/core/routed-refusal";

/** The file the sanctioned resolver appends to, beside accepted.json / candidates.json. */
export const PLACES_RECEIPT = "places.json";

/** WHAT THE MACHINE GOT BACK for one place, written by the resolver at the moment it got it —
 *  never re-derived later from the spec, which is what keeps it evidence rather than an echo. */
export interface PlaceResolutionReceipt {
  /** The marker/point `label` this lookup was made for. Matched exactly, like ResolvedPlace. */
  label: string;
  lon: number;
  lat: number;
  /** What the geocoder called what it returned — the string that makes "that is the glacier, not
   *  the summit" sayable, quoted into the refusal so the fix is legible without opening a file. */
  resolvedName?: string;
  categories?: string[];
  elevationM?: number;
}

/** The run's receipt, as the CLI hands it to the guard. `present: false` ⇒ the resolver never ran
 *  in this directory (or left nothing readable), which L3 then has to answer for. */
export interface PlaceProvenance {
  present: boolean;
  resolutions: PlaceResolutionReceipt[];
}

const ABSENT: PlaceProvenance = { present: false, resolutions: [] };

function parseResolutions(json: unknown): PlaceResolutionReceipt[] {
  const raw = (json as { resolutions?: unknown } | null)?.resolutions;
  if (!Array.isArray(raw)) return [];
  const out: PlaceResolutionReceipt[] = [];
  for (const item of raw) {
    const r = item as Record<string, unknown> | null;
    if (!r || typeof r !== "object") continue;
    const { label, lon, lat } = r;
    if (typeof label !== "string" || !label.trim()) continue;
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    out.push({
      label: label.trim(),
      lon,
      lat,
      ...(typeof r.resolvedName === "string"
        ? { resolvedName: r.resolvedName }
        : {}),
      ...(Array.isArray(r.categories)
        ? { categories: r.categories.filter((c) => typeof c === "string") }
        : {}),
      ...(typeof r.elevationM === "number" ? { elevationM: r.elevationM } : {}),
    });
  }
  return out;
}

/** Read the receipt beside accepted.json. A file that is present but unreadable is reported
 *  ABSENT, exactly as produce-all.mjs treats a corrupt candidates.json: the permissive reading of
 *  a corrupt artifact is the one that lets a broken run through. */
export function readPlaceProvenance(runDir: string): PlaceProvenance {
  const path = join(runDir, PLACES_RECEIPT);
  if (!existsSync(path)) return ABSENT;
  try {
    const resolutions = parseResolutions(
      JSON.parse(readFileSync(path, "utf8")),
    );
    return resolutions.length ? { present: true, resolutions } : ABSENT;
  } catch {
    return ABSENT;
  }
}

function samePoint(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
): boolean {
  return a.lon === b.lon && a.lat === b.lat;
}

/**
 * The fail-hard decision for one proposal. Null when it passes, or when the proposal plots no
 * named places at all (every chart, every choropleth — this never speaks about them).
 */
export function placeProvenanceRefusal(
  p: AcceptedProposal,
  provenance: PlaceProvenance,
): RoutedRefusal | null {
  const places = plottedPlaces(p.spec);
  if (!places.length) return null;
  const records = Array.isArray(p.resolvedPlaces) ? p.resolvedPlaces : [];
  const plotted = new Set(places.map((pl) => pl.label));
  // Only resolutions for places THIS spec plots are this proposal's business: a run may resolve a
  // place it then decided not to map, and holding an element to a lookup it does not use would be
  // a false block.
  const relevant = provenance.resolutions.filter((r) => plotted.has(r.label));

  for (const res of relevant) {
    const record = records.find((r) => r.label === res.label);

    // L1 — the dropped thread. THE closure: the trigger is the receipt on disk, so declining to
    // write the record is the thing that fails rather than the thing that gets away with it.
    if (!record) {
      const what = res.resolvedName
        ? `${res.resolvedName} (${res.lon}, ${res.lat})`
        : `${res.lon}, ${res.lat}`;
      return routed(
        "place-resolution-undeclared",
        `this run resolved "${res.label}" to ${what} and the accepted element carries no record ` +
          `of it, so nothing can check that the journalist ever saw that coordinate or that the ` +
          `map plots what they agreed to. Carry it onto the accepted element as \`resolvedPlaces\``,
      );
    }

    // L2a — the origin the run's own receipt disproves. lib/geo/place-resolution.ts documents
    // this as a known trust boundary ("a host that writes 'data' over a coordinate it geocoded
    // defeats G3"); once the resolver leaves a receipt, that boundary is checkable here.
    if (record.origin === "data")
      return routed(
        "place-resolution-undeclared",
        `"${res.label}" is recorded with origin "data" — read from the newsroom's own file — but ` +
          `this run geocoded it (it resolved to ${res.resolvedName ?? `${res.lon}, ${res.lat}`}), ` +
          `and a machine-resolved coordinate owes the journalist a showback that "data" waives`,
      );

    // L2b — a record that copies nothing. Agreeing with the resolution is fine; MOVING the point
    // is fine and expected (it is what a correction IS) — but a move has to say it moved, or the
    // record is a coordinate somebody typed and G4's comparison is checking it against itself.
    if (
      !samePoint(record, res) &&
      !(record.correctedFrom && samePoint(record.correctedFrom, res))
    )
      return routed(
        "place-resolution-undeclared",
        `"${res.label}" is recorded at ${record.lon}, ${record.lat} but this run resolved it to ` +
          `${res.lon}, ${res.lat} — the record copies neither the resolution nor a correction of ` +
          `it. If the journalist moved the point, record where it came FROM ` +
          `(correctedFrom: { lon: ${res.lon}, lat: ${res.lat} }); if they did not, the recorded ` +
          `coordinate has no origin`,
      );
  }

  // L2c — the blanket data claim the receipt contradicts. Checked after the loop so the more
  // specific per-place messages above win when both apply.
  if (p.coordinatesFromData === true && relevant.length)
    return routed(
      "place-resolution-undeclared",
      `this element declares coordinatesFromData — every coordinate read from the newsroom's own ` +
        `file — but this run geocoded ${relevant.map((r) => `"${r.label}"`).join(", ")}. Drop ` +
        `the declaration and record what those lookups returned`,
    );

  // L3 — the map that accounts for nothing. The dodge L1 alone would leave open: geocode by hand,
  // skip the resolver, write no record, and every record-based leg is dormant again. Refused on
  // the SPEC alone, so no artifact of the run has to exist for it to fire.
  if (p.coordinatesFromData === true) return null;
  const accounted = new Set([
    ...relevant.map((r) => r.label),
    ...records.map((r) => r.label),
  ]);
  if (places.some((pl) => accounted.has(pl.label))) return null;
  const named = places
    .slice(0, 3)
    .map((pl) => `"${pl.label}"`)
    .join(", ");
  const more = places.length > 3 ? ` and ${places.length - 3} more` : "";
  return routed(
    "place-resolution-undeclared",
    `this map plots ${named}${more} and the run can say where NOT ONE of those coordinates came ` +
      `from — no place was resolved here and the element records none. A lon/lat nobody stands ` +
      `behind is how "Cervin" shipped 1063 m off its own summit. Record each place in ` +
      `\`resolvedPlaces\`, or — if the newsroom's own file supplied every coordinate and nothing ` +
      `was looked up — say so with \`coordinatesFromData: true\``,
  );
}

/**
 * The non-fatal half: a map that accounts for SOME of its places and not others. Never a refusal,
 * for attestation-corroboration.ts's reason — there are legitimate mixtures (a CSV of located
 * events plus one geocoded landmark), and an individual absence cannot tell them apart from a
 * dropped record. Silent when the refusal above already speaks, and silent under an explicit
 * `coordinatesFromData`.
 */
export function placeProvenanceWarnings(
  p: AcceptedProposal,
  provenance: PlaceProvenance,
): string[] {
  const places = plottedPlaces(p.spec);
  if (!places.length || p.coordinatesFromData === true) return [];
  const records = Array.isArray(p.resolvedPlaces) ? p.resolvedPlaces : [];
  const accounted = new Set([
    ...provenance.resolutions.map((r) => r.label),
    ...records.map((r) => r.label),
  ]);
  // Total absence is the refusal's business, not a warning — saying both would double-report the
  // same gap in two registers.
  if (!places.some((pl) => accounted.has(pl.label))) return [];
  const missing = places.filter((pl) => !accounted.has(pl.label));
  if (!missing.length) return [];
  return [
    `place provenance: ${missing.map((m) => `"${m.label}"`).join(", ")} ` +
      `${missing.length === 1 ? "is" : "are"} plotted with no record of where the coordinate ` +
      `came from, while the other places on this map have one — resolve them the same way, or ` +
      `record them as origin "data" if they were read from the newsroom's file`,
  ];
}

// WHAT AN ASSEMBLER RECEIVES — flat, named, and deliberately not the manifest.
//
// Two reasons it is flat, both measured (design spec §3.1):
//   1. lib/core imports neither lib/loop nor skills/, so a brief typed on RunManifest could
//      not live here — and here is where it belongs, since the engines are lib/core's subject.
//   2. assembleNativeSpec's `run` parameter was already DEAD: the signature took it, the body
//      never read it. An assembler handed the whole manifest can reach for ambient state; one
//      handed a brief cannot. That is invariant I2 ("the contract carries no ambient state"),
//      applied one layer earlier.
//
// Every field is JSON-serializable, like the render payload it ends up feeding.
import type { VerbResult } from "./verbs";
import type { VisualFormat } from "./vocabulary";
import type { ArcRole } from "./claim-arc";
// From vocabulary.ts, not kinds.ts: geo-match.ts's `import type { GeoMatch }` from this file
// already puts production-brief.ts on the map-native runnable bundle's traced closure
// (bundle-source.mjs does not distinguish a type-only import), so a schema-carrying import here
// would hand every map-native download the zod dependency it never runs.
import type { SourceKind } from "../source/vocabulary";
// GeographyRef is a PLAIN type (never z.infer, lib/geo/ref.ts has zero zod dependency) — safe
// under the same zod-free constraint as SourceKind above.
import type { GeographyRef } from "../geo/ref";

/** A narrative beat in the shape the engines want: the anchor's KIND picks the field, so a
 *  plan drafted for a line (x) can never arrive shaped like a bar walk (category). */
export type BriefBeat = {
  x?: string;
  category?: string;
  /** The map track's anchor — a region key the data already carries. Named `region` rather than
   *  reusing `category` because that is the field the engine itself reads (`MapArcBeat.region`,
   *  skills/map-native/src/map-arc.ts), so the projection in assemble/brief.ts renames nothing.
   *  Sub-project ③: before it, a confirmed map walk had no route from the loop to the engine at
   *  all (`arcBeats` had zero occurrences in lib/). */
  region?: string;
  /** What the camera does to arrive at this beat — sub-project ④(c). Map track only: the
   *  chart track has no camera at all. Absent means the global `cameraMode` decides, which is
   *  what every beat did before this existed. */
  movement?: string;
  role: ArcRole;
  text: string;
};

/** What the data's geography turned out to be, measured against the shipped basemaps AND the
 *  offline ADM1 index (D10.2). `unmatched` is the point of the type: a partial join is SHOWN,
 *  never silently mapped.
 *  `geography` (Task 9) REPLACES the earlier bare `basemap: string` field — every consumer
 *  (`assemble/map-native.ts`, `assemble/map-dw.ts`, `lib/loop/manifest.ts`'s `GeoMatchSchema`)
 *  now reads the richer `GeographyRef` so a journalist can be told WHICH geography a column
 *  matched (world vs. an ADM1 subset) and at what level, not just a shipped basemap's internal
 *  key. REQUIRED, not optional: `lib/loop/manifest.ts`'s `GeoMatchSchema` (zod) now carries it as
 *  a required field too (Task 9, bundled with the migration its sequencing-hazard note
 *  describes), and `matchGeography` always populates it — a `GeoMatch` that round-trips through
 *  the persisted manifest carries the same guarantee once `migrateV4toV5` has run. */
export type GeoMatch = {
  column: string;
  geography: GeographyRef;
  matched: number;
  total: number;
  unmatched: string[];
  /** RESOLVED region ids, one entry per DISTINCT raw value in `column` that the offline ADM1
   *  index (matchAdm1Index) actually matched — each hit carries the country it belongs to,
   *  because an ambiguous name (the "Jura" CH/FR collision) can resolve to more than one.
   *  Set ONLY by the ADM1-index candidate: a shipped world/us-states match already filters
   *  the real geometry file on the exact raw value it matched with, so it has no separate
   *  resolved id to carry and no gap between matching and subsetting to close.
   *
   *  This is what closes that gap for an ADM1 join: matching tolerates spelling variants via
   *  a NORMALIZED index ("Geneve" files under "GENEVE", same key as "Genève"), but the shipped
   *  geometry file's own properties are not normalized — a produce step that recomputes ids
   *  from the raw CSV values and compares them against those properties directly finds
   *  nothing for "Geneve", even though matching already resolved it. See
   *  lib/geo/resolve-for-produce.ts's own use of this field.
   *
   *  DERIVED, never hand-authored — a config assembled from a GeoMatch that carries this
   *  field must thread it through unchanged (lib/loop/assemble/map-native.ts does). produce
   *  (lib/geo/resolve-for-produce.ts) refuses loudly, rather than silently recomputing raw
   *  values, when a FRESH admin-1 config somehow lacks it — defense against a future assembler
   *  bug that forgets to thread it. A manifest matched before this field existed does NOT
   *  reach that throw at all: lib/loop/manifest.ts's schema version was bumped (v5→v6) and
   *  lib/loop/migrate.ts's migrateV5toV6 drops a stale admin-1 match on the way in, which is
   *  what makes the whole round-trip actually safe — see that migration's own comment for why
   *  a throw alone was not a sufficient answer (it was an UNCAUGHT exception on the produce
   *  path, not a caught refusal, before the version bump existed). */
  featureIdsByValue?: Record<string, { featureId: string; country: string }[]>;
};

/** The journalist's own photographs, declared with the run. Splash never generates an image,
 *  and never writes an alt or a credit — both are asked for and carried here verbatim. */
export type ImageInput = {
  dir: string;
  frames: {
    frameRef: string;
    alt: string;
    credit: { name: string; url?: string };
  }[];
};

export type ProductionBrief = {
  elementId: string;
  nativeType: string;
  format: VisualFormat;
  angle: {
    confirmedTakeaway: string;
    altInsight: string;
    unit?: string;
    emphasis?: string;
  };
  dataCsv: string;
  attribution: string;
  sourceUrl?: string;
  sourceKind?: SourceKind;
  /** The language this deliverable is made in — resolved ONCE at init (lib/loop/init.ts) and
   *  carried here. produce() used to decline to set it, with a comment saying the loop had no
   *  language axis; the axis is the manifest's `lang` field and this is where it lands.
   *  Absent means English furniture, which is what the engines rendered before. */
  lang?: string;
  beats?: BriefBeat[];
  geo?: GeoMatch;
  images?: ImageInput;
};

/** One per engine. NEVER throws (invariant I1) — a spec it cannot compose comes back as a
 *  refusal naming what is missing, in the journalist's words. */
export type Assembler = (brief: ProductionBrief) => VerbResult<unknown>;

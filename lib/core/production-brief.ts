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

/** A narrative beat in the shape the engines want: the anchor's KIND picks the field, so a
 *  plan drafted for a line (x) can never arrive shaped like a bar walk (category). */
export type BriefBeat = {
  x?: string;
  category?: string;
  role: ArcRole;
  text: string;
};

/** What the data's geography turned out to be, measured against the shipped basemaps.
 *  `unmatched` is the point of the type: a partial join is SHOWN, never silently mapped. */
export type GeoMatch = {
  column: string;
  basemap: string;
  matched: number;
  total: number;
  unmatched: string[];
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

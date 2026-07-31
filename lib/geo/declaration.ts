// The geography declaration — quoted verbatim from design spec D1/D2. z.strictObject for the
// reason lib/source/kinds.ts's SourceLedgerSchema is strict: a permissive object would let a
// declaration that names nothing pass, and the refusal that follows would blame a field the
// caller believes it supplied.
import { z } from "zod";

export const GeographyCreditSchema = z.strictObject({
  name: z.string().min(1),
  url: z.string().optional(),
});

export const GeographyInputSchema = z.strictObject({
  path: z.string().min(1),
  encoding: z.enum(["geojson", "topojson"]),
  // The three CRS proj4 models `+towgs84=0,0,0` — indistinguishable from WGS84 (spec D4, R4).
  crs: z.enum(["EPSG:4326", "EPSG:4258", "EPSG:4269"]),
  /** What this file DESCRIBES, in the journalist's own words ("cantons", "communes de
   *  Haute-Savoie", "secteurs scolaires 2025"). Free text on purpose — "ADM1" is a dataset
   *  convention, not a journalistic one (spec D2: Natural Earth counts 101 features for France,
   *  the départements, not the 18 régions a French journalist means by "regions"). */
  level: z.string().min(1),
  licence: z.string().min(1),
  /** The edition or vintage the licence asks to be cited. Not derivable from the file or its
   *  mtime — see the test above. The field Splash refuses most firmly to guess. */
  edition: z.string().min(1),
  credit: GeographyCreditSchema,
  /** The feature property the data joins against, when the journalist already knows it.
   *  Absent ⇒ Splash MEASURES the candidates and asks (D6, R3). Never guessed silently. */
  joinKey: z.string().min(1).optional(),
});

export type GeographyCredit = z.infer<typeof GeographyCreditSchema>;
export type GeographyInput = z.infer<typeof GeographyInputSchema>;

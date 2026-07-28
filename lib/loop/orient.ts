import { profileCsv, parseCsvRows } from "./profile";
import type { DataProfile } from "./manifest";
import { matchGeography } from "../../skills/map-native/src/geo-match";
import type { GeoMatch } from "../core/production-brief";

export type OrientResult = {
  profile: DataProfile;
  supportsPoint: boolean;
  note?: string;
  /** What the desk found when it tried to place this data on a shipped basemap. Absent when
   *  nothing joined — which is the ordinary case for a time series. */
  geo?: GeoMatch;
};

// The desk describes what the brought data factually contains and says, honestly,
// whether there is anything to chart. It never invents data and never proposes a
// story — the journalist owns the angle. (Deeper honesty checks — per-capita,
// denominator, time window — are the proposal-cerveau sub-project.)
export function orient(dataCsv: string): OrientResult {
  const profile = profileCsv(dataCsv);
  if (profile.rowCount === 0) {
    return {
      profile,
      supportsPoint: false,
      note: "The data has a header but no rows.",
    };
  }
  if (profile.numericColumns.length === 0) {
    return {
      profile,
      supportsPoint: false,
      note: "No numeric columns in what you brought — there is nothing to chart for this point. Bring the figures.",
    };
  }
  const { columns, rows } = parseCsvRows(dataCsv);
  const geo = matchGeography(columns, rows);
  return { profile, supportsPoint: true, ...(geo ? { geo } : {}) };
}

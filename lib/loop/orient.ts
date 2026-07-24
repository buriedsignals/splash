import { profileCsv } from "./profile";
import type { DataProfile } from "./manifest";

export type OrientResult = {
  profile: DataProfile;
  supportsPoint: boolean;
  note?: string;
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
  return { profile, supportsPoint: true };
}

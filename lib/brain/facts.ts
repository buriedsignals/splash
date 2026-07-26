// lib/brain/facts.ts
// The measurable half of the brain's input. Every number a limit can be checked against comes
// from here and nowhere else, so a limit is never checked against a guess.
import type { DataProfile } from "../loop/manifest";

export type Facts = {
  rows: number;
  /** How many things get their own mark: one per row in the wide/tidy shapes the KB assumes. */
  series: number;
  /** How many measured moments each row carries — one per numeric column. */
  points: number;
  columns: string[];
  numericColumns: string[];
};

export function deriveFacts(profile: DataProfile): Facts {
  return {
    rows: profile.rowCount,
    series: profile.rowCount,
    points: profile.numericColumns.length,
    columns: profile.columns,
    numericColumns: profile.numericColumns,
  };
}

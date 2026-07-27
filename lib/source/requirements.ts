// The consequences of a source class — ONE row per kind, read by every gate.
//
// This table is the whole point of the sub-project. Issue #7's contradiction (Gate 2 accepts a
// named source without a URL; render review calls the same source incomplete) is not a bug in
// either rule: it is two rules written in two places about a distinction neither of them can
// express. Written once, exhaustively, the contradiction has nowhere left to live — a gate that
// wants to know "does this need a URL" asks the row, and there is only one row.
//
// Three of these rows are DECISIONS beyond what issue #7 spells out (design spec §D2):
//
//   local.internalRef = "forbidden" — the provenance of a brought file already exists, as the
//     run's frozen input (path + sha256, lib/loop/freeze.ts). A second copy of the path in the
//     declaration adds no information and one more leak surface. Instead `local` REQUIRES its
//     frozen input to exist (assertSourceLedger).
//
//   private.url = "forbidden" — #7 says "optional internal reference, with no private URL leaked
//     into the visual". So an intranet address is an internalRef, never a `url`: the publishable
//     field does not exist for this kind, which makes non-leakage structural before it is guarded.
//
//   none.carriesFacts = false — the real abuse of `none` is not the pure illustration, it is
//     marking a data chart `none` to skip attribution. So `none` is legal only where the caller
//     declares the visual asserts no facts, and that parameter defaults to `true`.
import type { SourceKind } from "./kinds";

export type FieldRule = "required" | "optional" | "forbidden";

export interface SourceRequirements {
  /** The reader-facing name. */
  label: FieldRule;
  /** A public, traceable address. When present it must be SPECIFIC (lib/source/url.ts). */
  url: FieldRule;
  /** The newsroom-internal reference. Never published, whatever the rule. */
  internalRef: FieldRule;
  /** May a run that calls itself reporting publish this class at all? */
  shippableInRealRun: boolean;
  /** Must the published furniture carry a visible warning? */
  requiresNotice: boolean;
  /**
   * What the visual may do with the figures:
   *   "computed" — derive freely (shares, rates, per-capita, trends).
   *   "verbatim" — re-present only; every rendered figure must be literally in the quoted text.
   *   "none"     — there are no figures.
   */
  figures: "computed" | "verbatim" | "none";
  /** May this class stand behind a visual that asserts facts? */
  carriesFacts: boolean;
}

export const SOURCE_REQUIREMENTS: Record<SourceKind, SourceRequirements> = {
  public: {
    label: "required",
    url: "required",
    internalRef: "forbidden",
    shippableInRealRun: true,
    requiresNotice: false,
    figures: "computed",
    carriesFacts: true,
  },
  local: {
    label: "required",
    url: "optional",
    internalRef: "forbidden",
    shippableInRealRun: true,
    requiresNotice: false,
    figures: "computed",
    carriesFacts: true,
  },
  private: {
    label: "required",
    url: "forbidden",
    internalRef: "optional",
    shippableInRealRun: true,
    requiresNotice: false,
    figures: "computed",
    carriesFacts: true,
  },
  synthetic: {
    label: "required",
    url: "forbidden",
    internalRef: "optional",
    shippableInRealRun: false,
    requiresNotice: true,
    figures: "computed",
    carriesFacts: true,
  },
  prose: {
    label: "required",
    url: "optional",
    internalRef: "forbidden",
    shippableInRealRun: true,
    requiresNotice: false,
    figures: "verbatim",
    carriesFacts: true,
  },
  none: {
    label: "forbidden",
    url: "forbidden",
    internalRef: "forbidden",
    shippableInRealRun: true,
    requiresNotice: false,
    figures: "none",
    carriesFacts: false,
  },
};

export function requirementsFor(kind: SourceKind): SourceRequirements {
  return SOURCE_REQUIREMENTS[kind];
}

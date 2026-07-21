// core/i18n-furniture — the produce-time i18n FURNITURE GATE (quality audit P5), shared
// by both Datawrapper producers (dw-chart, map-dw — previously duplicated per-skill as
// each engine's own `src/furniture-i18n.ts`, byte-identical bodies, only comments + the
// local Patch type name differed).
//
// The render is Datawrapper-hosted, so the mechanical seam is the METADATA: for a
// non-English deliverable, specToMetadata / specToMapMetadata route the source through
// annotate.notes ("Source : X") and BLANK describe.source-name/source-url (whose
// un-relocalizable English "Source:" prefix would otherwise ship, doubled). That
// behavior was applied but never ASSERTED — a future regression (someone re-adds the
// native source field for fr) would ship the double/English caption with a clean exit.
// This gate asserts the invariant fail-hard at produce-time, BEFORE any API call.
//
// Deliberately does NOT reuse specToMetadata's own sourceNotes/usesNativeSourceCaption
// helpers: a gate that recomputes with the very code it checks would inherit the
// regression it exists to catch. The LABEL TABLE below (SOURCE_LABELS — pure data, the
// exact bytes the furniture must carry) is a THIRD copy of the one already duplicated in
// dw-chart's spec-to-metadata.ts / map-dw's spec-to-map-metadata.ts — this core module
// can't import from those (skill-local, wrong dependency direction: core must not depend
// on skills/*), so the bytes are inlined here too and pinned equal by
// lib/core/i18n-furniture.test.ts. Those two skill-local tables are untouched by this
// extraction (they still drive each producer's own note-composition).
//
// Scrolly is NOT covered here (DW producers have no scrolly format); the scrolly
// beats' language-consistency net lives harness-side in deep-verify.

/** The slice of the spec the gate needs (any ChartSpec/MapSpec variant fits). */
export interface SourceI18nSpec {
  lang?: string;
  source?: { name: string; url?: string };
}

/**
 * The structural slice of a DW/map metadata patch the gate needs. dw-chart's `DwPatch`
 * and map-dw's `MapPatch` both satisfy this without a cast — each declares a stricter
 * (non-optional) `annotate: { notes: string }`, which is assignable to the optional
 * shape here.
 */
export interface I18nSourcePatch {
  metadata: {
    describe: Record<string, unknown>;
    annotate?: { notes?: string };
  };
}

const SOURCE_LABELS: Record<string, string> = {
  fr: "Source :",
  de: "Quelle:",
  it: "Fonte:",
  en: "Source:",
};

/**
 * The violations (empty = pass) of the localized-source metadata invariant.
 * Applies ONLY when the locale table has a non-English label for `spec.lang`
 * (base-subtag resolution, e.g. "fr-CH" → "fr"); English / absent / unknown
 * langs keep DW's native caption, which already reads correctly — no gate.
 */
export function localizedSourceViolations(
  patch: I18nSourcePatch,
  spec: SourceI18nSpec,
): string[] {
  const base = spec.lang?.toLowerCase().split(/[-_]/)[0];
  const label = base ? SOURCE_LABELS[base] : undefined;
  if (!label || label === SOURCE_LABELS.en) return [];

  const violations: string[] = [];
  const describe = patch.metadata.describe;
  const name = String(describe["source-name"] ?? "");
  const url = String(describe["source-url"] ?? "");
  if (name !== "") {
    violations.push(
      `describe.source-name is "${name}" but must be BLANK for lang "${spec.lang}" — ` +
        `DW's native "Source:" caption prefix cannot be relocalized, so a non-English ` +
        `deliverable must carry the source via annotate.notes only (else the footer ` +
        `ships a double/English caption)`,
    );
  }
  if (url !== "") {
    violations.push(
      `describe.source-url is "${url}" but must be BLANK for lang "${spec.lang}" ` +
        `(same double-caption reason as source-name)`,
    );
  }
  if (spec.source?.name) {
    const line = `${label} ${spec.source.name}`;
    const notes = patch.metadata.annotate?.notes ?? "";
    if (!notes.includes(line)) {
      violations.push(
        `annotate.notes must carry the localized source line "${line}" for lang ` +
          `"${spec.lang}" — got "${notes}"`,
      );
    }
  }
  return violations;
}

/** Fail-hard wrapper: throws (listing every violation) before any API call. */
export function assertLocalizedSourceMetadata(
  patch: I18nSourcePatch,
  spec: SourceI18nSpec,
): void {
  const violations = localizedSourceViolations(patch, spec);
  if (violations.length > 0) {
    throw new Error(
      `i18n furniture gate failed (localized source metadata):\n  - ` +
        violations.join("\n  - "),
    );
  }
}

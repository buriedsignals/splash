// D8's one predicate, and D7's credit obligation beside it — the spec's own grouping ("un
// prédicat, et un seul" for D8; the credit obligation "à côté" of it for D7).
import type { VisualFormat } from "../core/vocabulary";

/** The narrow shape this file needs — NOT the full GeographyInput (lib/geo/declaration.ts):
 *  importing that here would pull its zod schema into every caller of this file, and this
 *  file is reachable from produce-time code that must stay light. See this task's header. */
export type GeographyLicenceInfo = { licence: string };

/** Decision 1 (design spec, 2026-07-28): a declared geometry file feeds EVERY format, interactive
 *  included, with its credit rendered into the artefact (assertGeoCreditPresent below). Returns
 *  true unconditionally today. The day the OSMF answers in writing that a self-contained HTML
 *  page carrying inline GeoJSON is a "derived database" and not a "Produced Work" — spec R1 — THIS
 *  function is the only place that changes: it starts returning false for `interactive`/`scrolly`
 *  when `geography.licence` is ODbL, and the refusal names `static`/`video` as the paths that stay
 *  open (ODbL §4.5.b is uncontested there). No caller of this function needs to change.
 */
export function geometryMayBeInlined(
  _geography: GeographyLicenceInfo,
  _format: VisualFormat,
): boolean {
  return true;
}

/** The credit is not decorative — spec D7. When a map's geometry came from a DECLARED file, an
 *  empty or missing geoCredit makes produce fail, exactly as loudly as assertRenderedSize
 *  (skills/splash/src/channel.ts) already fails a size mismatch. There is no code path that lets
 *  a newsroom ship a declared-geometry artefact without its credit by omission. */
export function assertGeoCreditPresent(
  geography: GeographyLicenceInfo | undefined,
  geoCredit: { name: string; url?: string } | undefined,
): void {
  if (!geography) return; // no declared geometry (a shipped basemap) — nothing to credit here
  if (!geoCredit || geoCredit.name.trim() === "")
    throw new Error(
      `produce: this map's geometry came from a declared file (licence: "${geography.licence}"), ` +
        `so its credit must be rendered into the artefact — geoCredit is missing or blank`,
    );
}

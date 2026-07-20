// GUARD 2 — reject placeholder / reserved-domain source URLs. A real QA finding: splash
// accepted `https://…example.com` placeholder URLs as the citable source. The SKILL.md
// rule (~line 399) already forbids homepages / unverifiable URLs, but nothing
// MECHANICALLY rejected the RFC-reserved placeholder domains — an LLM host can ignore
// prose. This pure check is the teeth: a source URL whose host is a reserved placeholder
// is a fabricated citation, not a real dataset. Mirrors export-guard.ts's pure+tested
// style; wired into the spine's validate-gate so a placeholder fails validation before
// any producer runs, for EVERY producer.
//
// Reserved per RFC 2606 / RFC 6761:
//   - TLDs: .example, .test, .invalid, .localhost
//   - second-level domains: example.com, example.org, example.net

const RESERVED_TLDS = new Set(["example", "test", "invalid", "localhost"]);
const RESERVED_DOMAINS = new Set(["example.com", "example.org", "example.net"]);

// Best-effort host extraction. Accepts a full URL (with scheme) or a scheme-less host
// (e.g. a value pasted without https://). Returns a lowercased hostname, or null when
// nothing host-like can be parsed — a malformed/empty URL is NOT this guard's concern
// (it is left to the missing-URL handling the producers already have).
function extractHost(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  for (const candidate of [raw, `http://${raw}`]) {
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      if (host) return host;
    } catch {
      // try the next candidate (scheme-prefixed)
    }
  }
  return null;
}

// Returns a human-readable reason when the URL's host is a reserved placeholder domain,
// or null when it is a real host (or unparseable — see extractHost). Only the EXACT
// reserved registrable domain (or a subdomain of it) is rejected, so a real domain that
// merely contains a reserved label (myexample.com, example-data.fr, testing.gov.uk) is
// NOT false-rejected.
export function placeholderSourceReason(url: string): string | null {
  const host = extractHost(url);
  if (!host) return null;
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (RESERVED_TLDS.has(tld))
    return `source URL host "${host}" uses the reserved placeholder TLD ".${tld}" (RFC 2606/6761) — not a real, citable dataset URL`;
  const registrable = labels.slice(-2).join(".");
  if (RESERVED_DOMAINS.has(registrable))
    return `source URL host "${host}" is the reserved placeholder domain "${registrable}" (RFC 2606/6761) — not a real, citable dataset URL`;
  return null;
}

// What `suggest-article` captures verbatim when the ARTICLE itself names where the figures
// come from (an outlet naming a dataset/report, or a URL quoted in the text). See
// suggest-article/SKILL.md ("Bind data", step 3). Both fields are optional; the guards below
// consume whichever is present.
//
// THREADING IS PROSE-ENFORCED BY NECESSITY. sourceHint is an inherently LLM-captured fact — what
// the ARTICLE named — and nothing mechanical can derive it (deriving it would defeat the guards,
// which need an INDEPENDENT capture to compare the shipped source against). suggest-article and
// suggest-chart are pure LLM skills (no `src/` pipeline); their ProposalSet is an in-context
// artifact, never a structured file a script transforms into `accepted.json`. The orchestrator LLM
// assembles `accepted.json` and copies sourceHint across (splash/SKILL.md §5b) — exactly the way it
// copies `channel` and `confirmedTakeaway`. There is no seam to mechanize; the guards fire when the
// hint is threaded and stay dormant (both return null) when it is absent. `droppedSourceHintWarning`
// (below) is the observability backstop that makes a DROPPED hint visible at the render gate.
export interface SourceHint {
  name?: string;
  url?: string;
}

// The generic honest-fallback source label ("Figures as reported in this article"), in both
// shipped languages. Gate 2c permits it ONLY when the article names no citable dataset — using
// it while the article DID name an org silently discards a real, verifiable attribution.
const GENERIC_SOURCE_FALLBACKS = new Set<string>([
  "chiffres tels que rapportés dans cet article", // fr
  "figures as reported in this article", // en
]);

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function shippedSource(shipped: unknown): { name?: unknown; url?: unknown } {
  const src = (shipped as { source?: unknown } | null)?.source;
  return src && typeof src === "object"
    ? (src as { name?: unknown; url?: unknown })
    : {};
}

// DEFECT B — named-org preservation. When the article NAMED a real org (`hint.name`), the
// shipped source must carry that attribution — either a name+specific-URL (state a) or the org
// kept name-only (state b, legitimate when no precise URL exists). Collapsing it to the generic
// prose fallback (state c) DISCARDS the named org — a real QA finding (INSEE, REN/DGEG). Returns
// a reason string ONLY for that collapse; a name-only ship, a specific-URL ship, an absent hint,
// or a hint that is itself the generic fallback all pass (not this guard's concern). Pure.
export function sourceNamePreservedReason(
  shipped: unknown,
  hint: SourceHint | undefined,
): string | null {
  const hintName = typeof hint?.name === "string" ? hint.name.trim() : "";
  // No captured org name → nothing to preserve; the generic fallback is legitimate.
  if (!hintName) return null;
  // A hint must NAME a real org: it has letters and is not itself the generic fallback.
  if (!/\p{L}/u.test(hintName)) return null;
  if (GENERIC_SOURCE_FALLBACKS.has(normalizeName(hintName))) return null;
  const shippedName = shippedSource(shipped).name;
  if (typeof shippedName !== "string") return null;
  // Only the collapse to the generic fallback is a defect; a name-only / specific-URL ship of
  // ANY named org (even a different one) is a legitimate attribution, left for human review.
  if (!GENERIC_SOURCE_FALLBACKS.has(normalizeName(shippedName))) return null;
  return (
    `source name "${shippedName}" is the generic honest-fallback, but the article NAMED a ` +
    `source ("${hintName}") — keep the named organisation (name-only is allowed when there ` +
    `is no precise URL); never discard a named org for the "reported in this article" fallback`
  );
}

// Canonicalise a URL for comparison: lowercased host, trailing slash(es) stripped, query kept.
// Accepts a scheme-less host (a homepage pasted without https://). Falls back to a trimmed,
// lowercased, trailing-slash-stripped string when nothing parses.
export function canonicalUrl(u: string): string {
  const raw = u.trim();
  for (const candidate of [raw, `https://${raw}`]) {
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.replace(/\/+$/, "");
      return `${host}${path}${parsed.search}`;
    } catch {
      // try the scheme-prefixed candidate
    }
  }
  return raw.toLowerCase().replace(/\/+$/, "");
}

// DEFECT D — provided-URL fidelity. When the journalist GAVE a URL (`hint.url`), the shipped
// source URL must equal it (a subpath the journalist explicitly confirmed in-turn would arrive
// as the captured/updated hint). Silently UPGRADING a homepage to a deeper, unconfirmed path —
// the dares.travail-emploi.gouv.fr → /sites/default/files/…pdf QA finding — is rejected. Fires
// ONLY when a provided URL was captured AND a divergent URL was shipped; an absent hint URL or a
// name-only ship (no URL) pass (not this guard's concern). Pure. NB: this is deliberately strict
// equality — the "explicitly-confirmed subpath" exception is not independently observable here,
// so it must be reflected by the captured hint (see threading follow-up).
export function sourceUrlFidelityReason(
  shipped: unknown,
  hint: SourceHint | undefined,
): string | null {
  const hintUrl = typeof hint?.url === "string" ? hint.url.trim() : "";
  if (!hintUrl) return null; // no provided URL captured → nothing to assert against
  const shippedUrlRaw = shippedSource(shipped).url;
  if (typeof shippedUrlRaw !== "string" || !shippedUrlRaw.trim()) return null; // name-only ship
  if (canonicalUrl(shippedUrlRaw) === canonicalUrl(hintUrl)) return null;
  return (
    `shipped source URL "${shippedUrlRaw.trim()}" does not match the journalist-provided URL ` +
    `"${hintUrl}" — cite the URL the journalist gave (or a subpath they explicitly confirmed ` +
    `in-turn), never silently upgrade a homepage to a deeper, unconfirmed path`
  );
}

// OBSERVABILITY (not a guard — a NON-BLOCKING render-gate warning). Because threading sourceHint is
// prose-enforced (see the SourceHint note above), a DROPPED hint silently disarms DEFECT B: with no
// captured org name to compare against, a named org collapsed to the generic fallback sails through
// undetected. This makes that disarm VISIBLE — it returns a warning (surfaced at the render gate via
// ProposalResult.warnings, never a hard fail) when the shipped source IS the generic honest-fallback
// yet NO org-name hint was threaded. Mutually exclusive with DEFECT B: when a name hint IS present it
// returns null (guard B already fires hard on the same collapse), so a case is never double-reported.
// SUPPRESSED for provenance "prose"/"none" — there the generic fallback is documented-legitimate
// (the genuine no-dataset case, splash/SKILL.md Gate 2c), so a warning would be pure noise; it fires
// only for "table" (or absent, which defaults to table), where a cited-table claim shipping the
// generic fallback is exactly where a nameable dataset citation plausibly existed and may have been
// dropped. A residual blind spot (accepted, honest): a "prose"-provenance claim whose article ALSO
// named an org that got collapsed is suppressed here — guard B still catches it IF the hint is
// threaded; this warning only backstops the DROPPED-hint case for table-backed claims. Pure.
export function droppedSourceHintWarning(
  shipped: unknown,
  hint: SourceHint | undefined,
  provenance?: "table" | "prose" | "none",
): string | null {
  if (provenance === "prose" || provenance === "none") return null;
  const hintName = typeof hint?.name === "string" ? hint.name.trim() : "";
  // A name hint IS present → DEFECT B owns this case (fires hard on the collapse); no warning.
  if (hintName) return null;
  const shippedName = shippedSource(shipped).name;
  if (typeof shippedName !== "string") return null;
  if (!GENERIC_SOURCE_FALLBACKS.has(normalizeName(shippedName))) return null;
  return (
    `source-hint observability: shipped source is the generic honest-fallback ` +
    `("${shippedName}") and NO source-name hint was threaded from suggest-article. Legitimate ` +
    `ONLY if the ARTICLE named no source; if it DID name an org, the named-org preservation guard ` +
    `is silently disarmed here — carry suggest-article's sourceHint onto accepted.json (§5b) so a ` +
    `discarded org fails hard instead of shipping the "reported in this article" fallback`
  );
}

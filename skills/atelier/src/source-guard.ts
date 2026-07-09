// GUARD 2 — reject placeholder / reserved-domain source URLs. A real QA finding: atelier
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

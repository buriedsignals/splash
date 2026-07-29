// charter-fetch.ts — the one impure half of the charter path: getting a newsroom's home page
// and the stylesheets it links, so lib/newsroom/charter.ts can measure them.
//
// It is a plain `fetch`, deliberately. The alternative on this machine is `firecrawl scrape`,
// which renders the page and returns markdown/HTML — but what the extractor needs is the CSS
// TEXT, and a rendered-markdown scrape does not carry the stylesheet bodies at all. Firecrawl
// would cost credits to return strictly less of what this needs. The escape hatch for a site
// that refuses a bare fetch (a 403 behind a bot wall) is `--html-file`: the operator obtains the
// HTML however they like — firecrawl included — and the extractor reads it from disk. That keeps
// the fetching tool swappable and the measurement identical.
//
// Bounded on every axis, because the URL comes from a journalist and points at the open web:
// a timeout, a byte cap, a stylesheet cap, http/https only, and SAME-HOST stylesheets only (a
// news site's third-party CSS is advertising and consent-banner styling — measuring it would
// give the newsroom an ad network's brand colour).
//
// Total: returns a `{ error }` instead of throwing, at every step.

export type SiteSources = {
  url: string;
  html: string;
  sheets: { href: string; css: string }[];
  /** What could not be fetched, so the proposal can say so instead of looking complete. */
  notes: string[];
};

export type FetchOptions = {
  fetchImpl?: typeof fetch;
  /** How many linked stylesheets are read, in document order. */
  maxSheets?: number;
  /** Per-response byte cap. */
  maxBytes?: number;
  timeoutMs?: number;
};

export const MAX_SHEETS = 8;
export const MAX_BYTES = 2_000_000;
export const TIMEOUT_MS = 10_000;

// A browser-shaped UA: a fair number of newsroom CDNs answer a default runtime UA with a 403,
// and the request is a plain GET of a public home page either way.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/**
 * Hosts this must never fetch: the loopback, the link-local metadata address, the RFC1918
 * ranges — anything that is not a newsroom on the public web.
 *
 * The URL comes from a journalist and is turned into a GET by a program running on their
 * machine, so it is a server-side request forgery surface: `http://169.254.169.254/` is a cloud
 * metadata endpoint, `http://192.168.1.1/` is their router. Both are refused by shape.
 *
 * A dotted quad EMBEDDED in a name (`10.0.0.5.nip.io`) is refused too. That is a rebinding
 * service, and since this module deliberately does no DNS it cannot check the resolved address —
 * so it refuses the shape rather than pretend to have checked. What it cannot catch is an
 * ordinary hostname whose A record points inside; that needs resolution, and is named in the
 * report as an accepted limit.
 */
function isForbiddenHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".home"))
    return true;
  // IPv6 literal, in any form: never a newsroom's public site in this flow.
  if (h.includes(":")) return true;
  // A dotted quad anywhere in the name — as the whole host, or embedded by a rebinding service.
  const quad =
    /(?:^|[.-])(\d{1,3})[.-](\d{1,3})[.-](\d{1,3})[.-](\d{1,3})(?:$|[.-])/.exec(
      h,
    );
  if (quad) {
    const [a, b] = [Number(quad[1]), Number(quad[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    // A bare public IP is still refused: a newsroom's site has a name, and allowing literals
    // means re-deriving this table for every future range.
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (a === 169 || a === 127 || a === 192 || a === 10 || a === 172)
      return true;
  }
  return false;
}

/** http/https only, and a real public host. Anything else — file:, data:, a bare word — is refused. */
export function normalizeSiteUrl(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || !u.hostname.includes(".")) return null;
    if (isForbiddenHost(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function getText(
  url: string,
  opts: Required<Pick<FetchOptions, "maxBytes" | "timeoutMs">> & {
    fetchImpl: typeof fetch;
  },
): Promise<{ text: string; finalUrl: string } | { error: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await opts.fetchImpl(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,text/css,*/*" },
    });
    // `redirect: "follow"` means the host that was vetted is not necessarily the host that
    // answered: a public site can bounce to 127.0.0.1 or to a metadata address. Re-check where
    // it actually landed, and refuse the body rather than read it.
    const finalUrl = res.url || url;
    try {
      if (isForbiddenHost(new URL(finalUrl).hostname))
        return { error: `${url} redirected to a non-public address — refused` };
    } catch {
      return { error: `${url} redirected somewhere unreadable — refused` };
    }
    if (!res.ok) return { error: `${url} answered ${res.status}` };
    const text = await res.text();
    return {
      text: text.length > opts.maxBytes ? text.slice(0, opts.maxBytes) : text,
      finalUrl,
    };
  } catch (e) {
    return {
      error: `${url} could not be fetched (${(e as Error)?.name ?? "error"})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** `<link rel="stylesheet" href="…">` hrefs, in document order. */
export function stylesheetHrefs(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(tag)) continue;
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!h) continue;
    try {
      const abs = new URL(h[1]!, baseUrl);
      if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
      const base = new URL(baseUrl);
      // Same host only. A newsroom's own CSS carries its brand; a third-party sheet carries
      // somebody else's, and there is no way to tell them apart after the fact.
      if (abs.hostname !== base.hostname) continue;
      if (!out.includes(abs.toString())) out.push(abs.toString());
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * Fetch a newsroom's page and its same-host stylesheets. Never throws: an unreachable site
 * returns `{ error }`, and an unreachable stylesheet becomes a note on an otherwise usable
 * result — a partial measurement stated as partial is worth more than a failure.
 */
export async function collectSiteSources(
  rawUrl: string,
  opts: FetchOptions = {},
): Promise<SiteSources | { error: string }> {
  const url = normalizeSiteUrl(rawUrl);
  if (!url) return { error: `not a usable site address: ${rawUrl}` };
  const cfg = {
    fetchImpl: opts.fetchImpl ?? fetch,
    maxBytes: opts.maxBytes ?? MAX_BYTES,
    timeoutMs: opts.timeoutMs ?? TIMEOUT_MS,
  };
  const page = await getText(url, cfg);
  if ("error" in page) return { error: page.error };
  const notes: string[] = [];
  const sheets: { href: string; css: string }[] = [];
  // Resolve and same-host-filter against where the page ACTUALLY came from. Filtering against
  // the typed URL means an ordinary apex→www redirect (heidi.news → www.heidi.news) makes the
  // site's own stylesheets look third-party, and every one of them is silently dropped.
  const base = page.finalUrl;
  const hrefs = stylesheetHrefs(page.text, base);
  const cap = opts.maxSheets ?? MAX_SHEETS;
  if (hrefs.length > cap)
    notes.push(
      `${hrefs.length} stylesheets linked; the first ${cap} were read (a colour declared only in a later one was missed)`,
    );
  for (const href of hrefs.slice(0, cap)) {
    const css = await getText(href, cfg);
    if ("error" in css) notes.push(css.error);
    else sheets.push({ href, css: css.text });
  }
  return { url: base, html: page.text, sheets, notes };
}

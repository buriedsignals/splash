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
// a timeout, a byte cap, a stylesheet cap, http/https only, and — since a stylesheet's href is
// as much an open-web address as the page's own URL — every href is checked against the same
// forbidden-host list BEFORE it is fetched, not after (see `collectSiteSources`).
//
// It is NOT bounded by hostname in the OTHER sense — which host AUTHORED the CSS: a
// <link rel="stylesheet"> in the newsroom's own document is the design system it chose to serve,
// whatever host carries the bytes — a serious newsroom's own CSS routinely lives on its CDN
// (heidi.news serves from heidi-17455.kxcdn.com). What distinguishes a third party's brand from
// the newsroom's own is not the hostname, it is the RECEIPT: `lib/newsroom/charter.ts`'s
// `Measurement.source` names the exact page or stylesheet href every reading came from, all the
// way down to `scanCss`. That makes a foreign declaration distinguishable in the data this module
// feeds `proposeCharter` — whether a given surface (the CLI, the setup page) goes on to DISPLAY
// that source to the journalist is that surface's own job, not proven here.
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

/**
 * Is an address a request may have LANDED on still a public web address?
 *
 * The post-hoc half of the vetting `normalizeSiteUrl` does up front, split out because more than
 * one path needs it and a second copy would drift: this module re-checks it after every response
 * (`getText`), and lib/newsroom/charter-render.ts re-checks it after a browser navigation, which
 * follows redirects the same way. Same forbidden-host table, same function — not a paraphrase.
 *
 * Looser than `normalizeSiteUrl` in one respect only: it does not require a dot in the hostname,
 * because what it judges is where a request went, not what a journalist typed.
 */
export function isPublicSiteAddress(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return !isForbiddenHost(u.hostname);
  } catch {
    return false;
  }
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
    if (!isPublicSiteAddress(finalUrl))
      return { error: `${url} redirected to a non-public address — refused` };
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
      // No host filter here. A hostname says nothing about who authored the CSS — a newsroom's
      // own stylesheet routinely lives on a CDN it does not share a name with — and a third-party
      // font sheet is precisely where the typography this measurement wants might live. What
      // protects against mistaking somebody else's brand for the newsroom's is the receipt each
      // reading carries downstream, not a guess made here from the href alone.
      if (!out.includes(abs.toString())) out.push(abs.toString());
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * Fetch a newsroom's page and the stylesheets it links, whatever host serves them. Never throws:
 * an unreachable site returns `{ error }`, and an unreachable stylesheet becomes a note on an
 * otherwise usable result — a partial measurement stated as partial is worth more than a failure.
 *
 * `notes` tells apart the three shapes a stylesheet reading can take, because they call for
 * different next steps: the page linked nothing at all (a guess, not a finding, about why);
 * something was linked but did not answer (named per href, already handled below the fold); or
 * sheets were read (no failure note at all).
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
  // Resolve against where the page ACTUALLY came from, not the typed URL: an ordinary apex→www
  // redirect (heidi.news → www.heidi.news) changes what a relative href resolves to.
  const base = page.finalUrl;
  const hrefs = stylesheetHrefs(page.text, base);
  if (hrefs.length === 0) {
    // Case 1: no <link rel="stylesheet"> at all. This is the ONLY case that may guess at
    // JavaScript-built styles — and it must read as a guess, because a page can just as well have
    // no stylesheet for an ordinary reason (inline styles only, or genuinely no CSS).
    notes.push(
      "the page links no stylesheet — one possibility is that it builds its styles in JavaScript, but that is a guess this reading cannot confirm",
    );
  }
  const cap = opts.maxSheets ?? MAX_SHEETS;
  if (hrefs.length > cap)
    notes.push(
      `${hrefs.length} stylesheets linked; the first ${cap} were read (a colour declared only in a later one was missed)`,
    );
  for (const href of hrefs.slice(0, cap)) {
    // Vet the href BEFORE fetching it, exactly like the top-level URL — never after. The
    // same-host filter used to make this redundant: an href could only ever equal the
    // already-vetted host. Lifting it (task 2) means a stylesheet's href is now, on its own, an
    // open-web address a page's markup controls, so it gets the same SSRF check `normalizeSiteUrl`
    // gives the top-level URL — a `getText`-style post-hoc check would be too late, because the
    // outbound request has already reached `169.254.169.254` (or a router, or the loopback) by
    // the time the response comes back to be inspected.
    let hostname: string;
    try {
      hostname = new URL(href).hostname;
    } catch {
      notes.push(`${href} is not a fetchable address — refused`);
      continue;
    }
    if (isForbiddenHost(hostname)) {
      notes.push(
        `${href} points at a non-public address — refused before fetching`,
      );
      continue;
    }
    const css = await getText(href, cfg);
    // Case 2: a stylesheet WAS linked but did not answer — named per href, never blamed on
    // JavaScript (the link itself proves the page is not building its styles at runtime).
    if ("error" in css) notes.push(css.error);
    else sheets.push({ href, css: css.text }); // Case 3: read. No failure note.
  }
  return { url: base, html: page.text, sheets, notes };
}

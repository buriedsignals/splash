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

/** http/https only, and a real host. Anything else — file:, data:, a bare word — is refused. */
export function normalizeSiteUrl(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || !u.hostname.includes(".")) return null;
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
): Promise<{ text: string } | { error: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await opts.fetchImpl(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,text/css,*/*" },
    });
    if (!res.ok) return { error: `${url} answered ${res.status}` };
    const text = await res.text();
    return {
      text: text.length > opts.maxBytes ? text.slice(0, opts.maxBytes) : text,
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
  const hrefs = stylesheetHrefs(page.text, url);
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
  return { url, html: page.text, sheets, notes };
}

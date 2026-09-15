// One search against the Infoviz gallery, served for Splash at splash-inspiration.buriedsignals.com,
// one honest answer. The gallery rations searches per address, so this file never retries and never
// rephrases: it sends the journalist's subject once, under one deadline that covers the request and
// its body, and returns either the list or the reason there is none. It never throws.

export const INFOVIZ_API = "https://splash-inspiration.buriedsignals.com";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_QUERY_LENGTH = 1000;

// Names the requester in the gallery's access log; some edge filters refuse anonymous clients.
const USER_AGENT = "splash-inspiration/1 (+https://github.com/buriedsignals/splash)";

// Collapses any run of whitespace — including line breaks and tabs, wherever gallery text carries
// one — to a single space, after trimming the edges. Untrusted gallery text must never be able to
// put a raw line break into the markdown list this becomes.
function text(value) {
  if (typeof value !== "string") return null;
  const collapsed = value.trim().replace(/\s+/g, " ");
  return collapsed ? collapsed : null;
}

// The normalised, percent-encoded form of an http(s) URL — never the raw string. `URL#href` strips
// embedded line breaks and tabs, percent-encodes whitespace, and canonicalises the rest, so a
// gallery-supplied URL can carry no whitespace or line break into the rendered list.
function normaliseHref(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Keeps what a journalist can open: an item needs a title and an http(s) link; every other field
 * is optional and becomes null when absent or unusable. `url` and `image` are stored as their
 * normalised `href`, never the raw gallery string.
 */
export function normaliseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return null;
      const title = text(item.title);
      const url = normaliseHref(item.url);
      if (!title || !url) return null;
      return {
        title,
        source: text(item.source),
        date: text(item.date),
        url,
        image: normaliseHref(item.image),
      };
    })
    .filter((item) => item !== null);
}

function readQuota(headers) {
  const number = (name) => {
    const raw = headers?.get?.(name);
    if (raw === null || raw === undefined) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  };
  return {
    limit: number("x-ratelimit-limit"),
    remaining: number("x-ratelimit-remaining"),
    resetsAt: headers?.get?.("x-ratelimit-reset") ?? null,
  };
}

async function withDeadline(work, controller, timeoutMs) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches the gallery once for `query`, with the journalist's account when a `token` is given.
 */
export async function searchInspiration({
  query,
  fetchFn = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  apiBase = INFOVIZ_API,
  token = "",
} = {}) {
  const subject = typeof query === "string" ? query.trim() : "";
  if (!subject) return { ok: false, reason: "empty-query" };
  if (subject.length > MAX_QUERY_LENGTH) return { ok: false, reason: "query-too-long", limit: MAX_QUERY_LENGTH };

  const bearer = typeof token === "string" ? token.trim() : "";
  const controller = new AbortController();
  const exchange = (async () => {
    const response = await fetchFn(`${apiBase}/api/graphics/examples`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": USER_AGENT,
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ query: subject }),
      signal: controller.signal,
    });
    const quota = readQuota(response.headers);
    const body = await response.json().catch(() => null);

    if (response.status === 401 && bearer) {
      return { ok: false, reason: "invalid-token" };
    }

    if (response.status === 429) {
      return {
        ok: false,
        reason: "limit-reached",
        query: subject,
        quota: {
          limit: Number.isFinite(body?.limit) ? body.limit : quota.limit,
          remaining: 0,
          resetsAt: text(body?.resets_at) ?? quota.resetsAt,
        },
      };
    }
    if (
      !response.ok ||
      body === null ||
      typeof body !== "object" ||
      !Array.isArray(body.items)
    ) {
      return { ok: false, reason: "unexpected-response", status: response.status };
    }
    return { ok: true, query: subject, items: normaliseItems(body.items), quota };
  })();

  try {
    return await withDeadline(exchange, controller, timeoutMs);
  } catch (error) {
    return {
      ok: false,
      reason: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Reads the CLI's own argv (never the subject) so an unknown flag is refused before anything runs.
 * `--json` prints the structured result instead of markdown; `--stdin` reads the subject from
 * standard input instead of a positional argument; anything else starting with `-` is an error.
 * Positional arguments are joined with a space into `query`. Pure — no I/O, no process access.
 */
export function parseArgs(argv) {
  let asJson = false;
  let readStdin = false;
  const positionals = [];
  for (const arg of argv) {
    if (arg === "--json") {
      asJson = true;
      continue;
    }
    if (arg === "--stdin") {
      readStdin = true;
      continue;
    }
    if (arg.startsWith("-")) {
      return { query: "", asJson, readStdin, error: `unknown option: ${arg}` };
    }
    positionals.push(arg);
  }
  return { query: positionals.join(" "), asJson, readStdin, error: null };
}

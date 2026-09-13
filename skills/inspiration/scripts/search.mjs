// One search against the infoviz.design gallery, one honest answer. The gallery rations searches
// per address, so this file never retries and never rephrases: it sends the journalist's subject
// once, under one deadline that covers the request and its body, and returns either the list or
// the reason there is none. It never throws.

import { formatInspiration } from "./format.mjs";

export const INFOVIZ_API = "https://infoviz.design";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_QUERY_LENGTH = 1000;

// Names the requester in the gallery's access log; some edge filters refuse anonymous clients.
const USER_AGENT = "splash-inspiration/1 (+https://github.com/buriedsignals/splash)";

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Keeps what a journalist can open: an item needs a title and an http(s) link; every other field
 * is optional and becomes null when absent or unusable.
 */
export function normaliseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && text(item.title) && isHttpUrl(item.url))
    .map((item) => ({
      title: text(item.title),
      source: text(item.source),
      date: text(item.date),
      url: item.url,
      image: isHttpUrl(item.image) ? item.image : null,
    }));
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
 * Searches the gallery once for `query`.
 */
export async function searchInspiration({
  query,
  fetchFn = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  apiBase = INFOVIZ_API,
} = {}) {
  const subject = typeof query === "string" ? query.trim() : "";
  if (!subject) return { ok: false, reason: "empty-query" };
  if (subject.length > MAX_QUERY_LENGTH) return { ok: false, reason: "query-too-long", limit: MAX_QUERY_LENGTH };

  const controller = new AbortController();
  const exchange = (async () => {
    const response = await fetchFn(`${apiBase}/api/graphics/examples`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": USER_AGENT },
      body: JSON.stringify({ query: subject }),
      signal: controller.signal,
    });
    const quota = readQuota(response.headers);
    const body = await response.json().catch(() => null);

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
    if (!response.ok || body === null || typeof body !== "object") {
      return { ok: false, reason: "unexpected-response", status: response.status };
    }
    return { ok: true, query: subject, items: normaliseItems(body.items), quota };
  })();

  try {
    return await withDeadline(exchange, controller, timeoutMs);
  } catch (error) {
    return { ok: false, reason: "unreachable", detail: error.message };
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const query = args.filter((arg) => arg !== "--json").join(" ");
  const result = await searchInspiration({ query });
  console.log(asJson ? JSON.stringify(result, null, 2) : formatInspiration(result));
  if (!result.ok) process.exitCode = 1;
}

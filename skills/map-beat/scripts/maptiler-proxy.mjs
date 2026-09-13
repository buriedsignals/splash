// Local proxy that keeps the MapTiler key out of the render page (spec §4.3).
//
// The video map is mounted live in Remotion, and Remotion injects the whole repo `.env` into the
// page unless it is given an empty `--env-file`. So the key must never reach the page: the CALLER
// reads it (`mapTilerKeyIn` from `#shared/map-beat/glyphs.mjs`, on the worktree env) and hands it
// only to `startMapTilerProxy`. This module never reads `.env` itself, and never logs the key or a
// keyed URL — `counts` is keyed by `<kind> <status>` only, with no query string. An upstream failure
// (DNS, refused, timeout) is caught and turned into a plain 502: the error object and the message a
// fetch failure carries can themselves contain the keyed URL, so neither is ever logged.

const PREFIX = "/maptiler/";
const CORS_HEADERS = { "access-control-allow-origin": "*" };

// Content types the proxy passes through as raw bytes, untouched: real binary payloads never carry
// a readable key, and running them through `stripKey`'s text replacements would corrupt them. Every
// other body — text/*, JSON, an unrecognised or missing content-type, an HTML/plain-text error page
// from a misbehaving upstream — is treated as text and stripped, because any of those CAN echo a
// keyed URL back.
const BINARY_CONTENT_TYPES = new Set([
  "application/x-protobuf",
  "application/vnd.mapbox-vector-tile",
  "application/octet-stream",
]);

function isBinaryResponse(contentType, pathname) {
  if (pathname.endsWith(".pbf")) return true;
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return type.startsWith("image/") || type.startsWith("font/") || BINARY_CONTENT_TYPES.has(type);
}

/** Rewrite MapTiler URLs found in `text` to point at the local proxy, and drop the key. */
export function stripKey(text, key, proxyOrigin) {
  return text
    .replaceAll("https://api.maptiler.com/", `${proxyOrigin}${PREFIX}`)
    .replaceAll(`?key=${key}&`, "?")
    .replaceAll(`?key=${key}`, "")
    .replaceAll(`&key=${key}`, "")
    // Last-resort passes: a keyed URL can reach a body already percent-encoded (e.g. embedded as
    // another URL's query value), which the three replacements above — written for a literal
    // `key=<key>` — do not match. Strip the percent-encoded key wherever it appears, then strip any
    // remaining bare occurrence of the key itself, whatever surrounds it.
    .replaceAll(encodeURIComponent(key), "")
    .replaceAll(key, "");
}

/** The upstream MapTiler URL for an incoming proxy request, or `null` outside `/maptiler/`. */
export function upstreamUrlFor(requestUrl, key, base = "https://api.maptiler.com") {
  if (!requestUrl.pathname.startsWith(PREFIX)) return null;
  const upstream = new URL(`${base}/${requestUrl.pathname.slice(PREFIX.length)}`);
  for (const [k, v] of requestUrl.searchParams) if (k !== "key") upstream.searchParams.set(k, v);
  upstream.searchParams.set("key", key);
  return upstream;
}

/** The counts bucket for one proxied response: `<kind> <status>`, no query string, no key. */
function kindOf(pathname) {
  if (/\.pbf$/.test(pathname)) return pathname.includes("/fonts/") ? "glyph-pbf" : "tile-pbf";
  return pathname.split("/").pop();
}

/**
 * Starts the local MapTiler proxy. The key lives only in this process.
 *
 * `upstreamBase` is test-only: it lets a test point the proxy at an unreachable or fixture origin
 * instead of the real API. Production callers never pass it, and `upstreamUrlFor` never builds an
 * origin other than the one it is given — a request can change the path and query it asks for, never
 * the host the proxy talks to.
 */
export function startMapTilerProxy({ key, upstreamBase = "https://api.maptiler.com" }) {
  const counts = {};
  let origin = "";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const upstream = upstreamUrlFor(url, key, upstreamBase);
      if (!upstream) return new Response("not found", { status: 404, headers: CORS_HEADERS });
      const kind = kindOf(url.pathname);
      try {
        const res = await fetch(upstream);
        counts[`${kind} ${res.status}`] = (counts[`${kind} ${res.status}`] ?? 0) + 1;
        const contentType = res.headers.get("content-type") ?? "";
        const headers = { ...CORS_HEADERS, "content-type": contentType };
        if (isBinaryResponse(contentType, url.pathname)) {
          return new Response(await res.arrayBuffer(), { status: res.status, headers });
        }
        const text = stripKey(await res.text(), key, origin);
        return new Response(text, { status: res.status, headers });
      } catch {
        // Never log the caught error: a fetch failure's own message can carry the upstream URL,
        // key included, and that is exactly what must not enter a saved log.
        counts["error 502"] = (counts["error 502"] ?? 0) + 1;
        return new Response("upstream unavailable", { status: 502, headers: CORS_HEADERS });
      }
    },
  });
  origin = `http://${server.hostname}:${server.port}`;
  return { origin, stop: () => server.stop(true), counts };
}

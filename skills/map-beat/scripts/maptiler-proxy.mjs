// Local proxy that keeps the MapTiler key out of the render page (spec §4.3).
//
// The video map is mounted live in Remotion, and Remotion injects the whole repo `.env` into the
// page unless it is given an empty `--env-file`. So the key must never reach the page: the CALLER
// reads it (`mapTilerKeyIn` from `#shared/map-beat/glyphs.mjs`, on the worktree env) and hands it
// only to `startMapTilerProxy`. This module never reads `.env` itself, and never logs the key or a
// keyed URL — `counts` is keyed by `<kind> <status>` only, with no query string.

const PREFIX = "/maptiler/";

/** Rewrite MapTiler URLs found in `text` to point at the local proxy, and drop the key. */
export function stripKey(text, key, proxyOrigin) {
  return text
    .replaceAll("https://api.maptiler.com/", `${proxyOrigin}${PREFIX}`)
    .replaceAll(`?key=${key}&`, "?")
    .replaceAll(`?key=${key}`, "")
    .replaceAll(`&key=${key}`, "");
}

/** The upstream MapTiler URL for an incoming proxy request, or `null` outside `/maptiler/`. */
export function upstreamUrlFor(requestUrl, key) {
  if (!requestUrl.pathname.startsWith(PREFIX)) return null;
  const upstream = new URL(
    `https://api.maptiler.com/${requestUrl.pathname.slice(PREFIX.length)}`,
  );
  for (const [k, v] of requestUrl.searchParams) if (k !== "key") upstream.searchParams.set(k, v);
  upstream.searchParams.set("key", key);
  return upstream;
}

/** The counts bucket for one proxied response: `<kind> <status>`, no query string, no key. */
function kindOf(pathname) {
  if (/\.pbf$/.test(pathname)) return pathname.includes("/fonts/") ? "glyph-pbf" : "tile-pbf";
  return pathname.split("/").pop();
}

/** Starts the local MapTiler proxy. The key lives only in this process. */
export function startMapTilerProxy({ key }) {
  const counts = {};
  let origin = "";
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const upstream = upstreamUrlFor(url, key);
      if (!upstream) return new Response("not found", { status: 404 });
      const kind = kindOf(url.pathname);
      const res = await fetch(upstream);
      counts[`${kind} ${res.status}`] = (counts[`${kind} ${res.status}`] ?? 0) + 1;
      const headers = {
        "access-control-allow-origin": "*",
        "content-type": res.headers.get("content-type") ?? "",
      };
      if (/json/.test(headers["content-type"])) {
        const text = stripKey(await res.text(), key, origin);
        return new Response(text, { status: res.status, headers });
      }
      return new Response(await res.arrayBuffer(), { status: res.status, headers });
    },
  });
  origin = `http://${server.hostname}:${server.port}`;
  return { origin, stop: () => server.stop(true), counts };
}

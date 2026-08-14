import { lookup as dnsLookupCallback } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { promisify } from "node:util";

const dnsLookup = promisify(dnsLookupCallback);
const MAX_REDIRECTS = 4;
const PAGE_LIMIT = 1 << 20;
const STYLESHEET_LIMIT = 256 << 10;
const AGGREGATE_LIMIT = 2 << 20;
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "splash-newsroom-setup/1 (one-page house-style proposal; https://github.com/buriedsignals/splash)";

const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
const excludedIPv6 = new BlockList();
for (const [network, prefix] of [
  ["2001:db8::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
]) excludedIPv6.addSubnet(network, prefix, "ipv6");

function publicIPv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return publicIPv4(address);
  if (family === 6) return globalIPv6.check(address, "ipv6") && !excludedIPv6.check(address, "ipv6");
  return false;
}

function allowedURL(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("newsroom address must be a full HTTP or HTTPS URL");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error("newsroom address must be credential-free HTTP or HTTPS without a fragment");
  }
  const allowedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== allowedPort) throw new Error("newsroom address uses a disallowed port");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) {
    throw new Error("private or local newsroom addresses require manual branding entry");
  }
  return url;
}

async function resolvePublic(url, lookup = async (hostname) => dnsLookup(hostname, { all: true, verbatim: true })) {
  const literalFamily = isIP(url.hostname);
  const answers = literalFamily
    ? [{ address: url.hostname, family: literalFamily }]
    : await lookup(url.hostname);
  if (!Array.isArray(answers) || answers.length === 0) throw new Error("newsroom hostname returned no addresses");
  const normalized = answers.map((answer) => ({ address: answer.address, family: Number(answer.family) }));
  if (normalized.some((answer) => ![4, 6].includes(answer.family) || !isPublicAddress(answer.address))) {
    throw new Error("newsroom hostname resolves to a private, local, or reserved address");
  }
  normalized.sort((left, right) => left.family - right.family || left.address.localeCompare(right.address));
  return normalized[0];
}

export function requestPinned(url, { address, family, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(url, {
      method: "GET",
      headers: { "user-agent": USER_AGENT, accept: "text/html,text/css;q=0.9" },
      servername: url.hostname,
      lookup(_hostname, options, callback) {
        if (typeof options === "function") callback = options;
        if (options?.all) callback(null, [{ address, family }]);
        else callback(null, address, family);
      },
    }, (response) => resolve({
      status: response.statusCode ?? 0,
      headers: response.headers,
      body: response,
      abort: () => response.destroy(),
    }));
    request.setTimeout(timeoutMs, () => request.destroy(new Error("newsroom request timed out")));
    request.once("error", reject);
    if (signal) {
      const abort = () => request.destroy(new Error("newsroom request was cancelled"));
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
      request.once("close", () => signal.removeEventListener("abort", abort));
    }
    request.end();
  });
}

function header(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name) ?? "";
  const value = headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function boundedBody(response, limit, aggregate) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    aggregate.bytes += chunk.byteLength;
    if (size > limit || aggregate.bytes > aggregate.limit) {
      response.abort?.();
      throw new Error("newsroom page and stylesheets exceed the bounded download limit");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Create a one-derivation fetch boundary. Every request and redirect is resolved independently,
 * every resolved address must be public, and the actual socket is pinned to one of those checked
 * addresses so a second resolver lookup cannot rebind it to loopback or an intranet service.
 */
export function createOutboundFetchPolicy({
  lookup = async (hostname) => dnsLookup(hostname, { all: true, verbatim: true }),
  request = requestPinned,
  maxRedirects = MAX_REDIRECTS,
  aggregateLimit = AGGREGATE_LIMIT,
} = {}) {
  const aggregate = { bytes: 0, limit: aggregateLimit };
  let requestCount = 0;
  return Object.freeze({
    get bytesRead() { return aggregate.bytes; },
    async fetch(raw, { kind = "page", signal } = {}) {
      if (!['page', 'stylesheet'].includes(kind)) throw new Error("outbound fetch kind is invalid");
      let url = allowedURL(raw);
      for (let redirects = 0; ; redirects += 1) {
        if (redirects > maxRedirects) throw new Error("newsroom request exceeded the redirect limit");
        const resolved = await resolvePublic(url, lookup);
        requestCount += 1;
        if (requestCount > 1 + maxRedirects + 4 * (1 + maxRedirects)) throw new Error("newsroom derivation exceeded the request limit");
        const response = await request(url, { ...resolved, signal, timeoutMs: REQUEST_TIMEOUT_MS });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = header(response.headers, "location");
          response.abort?.();
          if (!location) throw new Error("newsroom redirect has no destination");
          url = allowedURL(new URL(location, url).href);
          continue;
        }
        if (response.status < 200 || response.status >= 300) {
          response.abort?.();
          return { ok: false, status: response.status, url: url.href, text: async () => "" };
        }
        const contentType = String(header(response.headers, "content-type")).split(";", 1)[0].trim().toLowerCase();
        const expected = kind === "page" ? new Set(["text/html", "application/xhtml+xml"]) : new Set(["text/css"]);
        if (!expected.has(contentType)) {
          response.abort?.();
          throw new Error(`newsroom ${kind} returned an unsupported content type`);
        }
        const text = await boundedBody(response, kind === "page" ? PAGE_LIMIT : STYLESHEET_LIMIT, aggregate);
        return { ok: true, status: response.status, url: url.href, text: async () => text };
      }
    },
  });
}

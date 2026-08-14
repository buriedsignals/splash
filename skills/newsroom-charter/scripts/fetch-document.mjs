// Bounded fetch — the one rule this file exists to enforce: a newsroom's site must never hang
// this skill. Every call races the real fetch against a timeout that always wins, whether or not
// the thing on the other end (or a test double standing in for it) ever resolves or honours an
// abort signal itself. The caller gets a structured verdict back — {ok, status, text, error} —
// never an unhandled rejection and never an empty string standing in for "could not read this."

const DEFAULT_TIMEOUT_MS = 8000;

// Identifies the requester and why it's asking, in case a newsroom's ops team ever greps their
// access log for it — this is a courtesy read, one page plus a handful of stylesheets, not a
// crawl.
const USER_AGENT =
  "newsroom-charter/1 (deriving a house-style proposal from this page and its stylesheets; https://github.com/buriedsignals/splash)";

/**
 * Fetch `url` with a hard timeout. Wins the race whichever side finishes first:
 * - the real request, via `fetchFn` (defaults to the global `fetch`), aborted through
 *   `AbortController` when the timeout fires (a well-behaved fetch stops the connection);
 * - a timer that rejects at `timeoutMs` regardless of whether `fetchFn` respects the abort
 *   signal at all — a fake `fetchFn` in a test that never resolves must not be able to hang this
 *   function, and it does not.
 *
 * Never throws. Every outcome — success, non-2xx, timeout, DNS failure, TLS failure, anything a
 * real network can do — comes back as `{ok, status, text, error}`.
 */
export async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchFn = fetch, headers = {} } = {}) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchFn(url, { signal: controller.signal, headers: { "user-agent": USER_AGENT, ...headers } }),
      timeout,
    ]);
    if (!response.ok) {
      return { ok: false, status: response.status, text: null, error: `${url} answered ${response.status}` };
    }
    const text = await response.text();
    return { ok: true, status: response.status, url: response.url || url, text, error: null };
  } catch (error) {
    const detail = error.message.startsWith("timed out") ? error.message : `threw: ${error.message}`;
    return { ok: false, status: null, text: null, error: `${url} ${detail}` };
  } finally {
    clearTimeout(timer);
  }
}

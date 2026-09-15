// The inspiration search the Splash MCP server offers the agent. Engine gives this server — and
// nothing the agent runs itself — the Engine path and the journalist's real home, so this is the one
// place a search can use the Infoviz account stored in Indicator Labs. With an account, the search
// runs as the closed `inspiration-search` operation; otherwise it runs directly and anonymously.
// Once the operation has been attempted, a failure is reported and nothing searches again: it may
// already have spent one of the day's searches.

import { MAX_QUERY_LENGTH, searchInspiration } from "../../skills/inspiration/scripts/search.mjs";
import { formatInspiration } from "../../skills/inspiration/scripts/format.mjs";

const CREDENTIAL_ID = "INFOVIZ_TOKEN";
const OPERATION_ID = "inspiration-search";

// The 10 s status read matches the studio's own per-key budget; the 48 s run bound keeps a stalled
// Engine from holding the tool call open indefinitely. Engine's own 45 s operation timeout only
// starts once the operation actually execs, so Splash's own bound can fire first — in which case
// the journalist reads "it took too long" and nothing searches again.
export const KEY_STATUS_TIMEOUT_MS = 10_000;
export const OPERATION_TIMEOUT_MS = 48_000;

function terminal(outcome) {
  const events = Array.isArray(outcome?.events) ? outcome.events : [];
  return events.length ? events[events.length - 1] : null;
}

// Every `engine-failed` reaches the journalist as one of exactly two sentences — never Engine's own
// raw text, which can carry a remedy meant for a shell, not for a reading journalist. The second
// pattern matches execpolicy's own timeout wording (e.g. `exceeded its 45s timeout`).
function engineFailureDetail(message) {
  return typeof message === "string" &&
    (/timed out/i.test(message) || /exceeded its .* timeout/i.test(message))
    ? "it took too long"
    : "Indicator Labs reported an error";
}

/**
 * Builds the search the `search_inspiration` tool calls.
 */
export function createInspirationService({ bsigPath, invokeEngineFn, searchFn = searchInspiration }) {
  async function accountStored() {
    if (!bsigPath) return false;
    try {
      const outcome = await invokeEngineFn(bsigPath, ["keys", "status", CREDENTIAL_ID], "", {
        timeoutMs: KEY_STATUS_TIMEOUT_MS,
      });
      const event = terminal(outcome);
      return outcome.exitCode === 0 && event?.event === "result" && event.data?.stored === true;
    } catch {
      return false;
    }
  }

  async function search(query) {
    // Trimmed the way Go's strings.TrimSpace trims: JS whitespace plus U+0085 (NEL), which JS's own
    // trim() leaves alone. A subject Engine would refuse — empty, too long, or carrying a NUL — never
    // reaches Engine; it takes the same direct, anonymous path.
    const subject =
      typeof query === "string" ? query.replace(/^[\s\u0085]+|[\s\u0085]+$/g, "") : "";
    if (!subject || subject.length > MAX_QUERY_LENGTH || subject.includes("\u0000")) {
      return searchFn({ query });
    }
    if (!(await accountStored())) return searchFn({ query });

    let outcome;
    try {
      outcome = await invokeEngineFn(
        bsigPath,
        ["run", "splash", OPERATION_ID],
        `${JSON.stringify({ parameters: { query: subject } })}\n`,
        { timeoutMs: OPERATION_TIMEOUT_MS },
      );
    } catch (error) {
      return {
        ok: false,
        reason: "engine-failed",
        detail: engineFailureDetail(error instanceof Error ? error.message : null),
      };
    }

    const event = terminal(outcome);
    if (outcome.exitCode !== 0 || event?.event !== "result" || typeof event.data?.stdout !== "string") {
      return { ok: false, reason: "engine-failed", detail: engineFailureDetail(event?.message) };
    }
    try {
      const parsed = JSON.parse(event.data.stdout);
      const decoded =
        parsed && typeof parsed === "object" && typeof parsed.b64 === "string"
          ? JSON.parse(Buffer.from(parsed.b64, "base64").toString("utf8"))
          : null;
      if (
        decoded &&
        typeof decoded === "object" &&
        typeof decoded.ok === "boolean" &&
        (decoded.ok ? Array.isArray(decoded.items) : typeof decoded.reason === "string")
      ) {
        return decoded;
      }
    } catch {
      // reported as unreadable below
    }
    return { ok: false, reason: "engine-failed", detail: engineFailureDetail(null) };
  }

  return { search, format: formatInspiration };
}

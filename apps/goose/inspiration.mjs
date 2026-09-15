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

function terminal(outcome) {
  const events = Array.isArray(outcome?.events) ? outcome.events : [];
  return events.length ? events[events.length - 1] : null;
}

/**
 * Builds the search the `search_inspiration` tool calls.
 */
export function createInspirationService({ bsigPath, invokeEngineFn, searchFn = searchInspiration }) {
  async function accountStored() {
    if (!bsigPath) return false;
    try {
      const outcome = await invokeEngineFn(bsigPath, ["keys", "status", CREDENTIAL_ID], "");
      const event = terminal(outcome);
      return outcome.exitCode === 0 && event?.event === "result" && event.data?.stored === true;
    } catch {
      return false;
    }
  }

  async function search(query) {
    const subject = typeof query === "string" ? query.trim() : "";
    if (!subject || subject.length > MAX_QUERY_LENGTH) return searchFn({ query });
    if (!(await accountStored())) return searchFn({ query });

    let outcome;
    try {
      outcome = await invokeEngineFn(
        bsigPath,
        ["run", "splash", OPERATION_ID],
        `${JSON.stringify({ parameters: { query: subject } })}\n`,
      );
    } catch (error) {
      return {
        ok: false,
        reason: "engine-failed",
        detail: error instanceof Error ? error.message : "Indicator Labs could not be reached",
      };
    }

    const event = terminal(outcome);
    if (outcome.exitCode !== 0 || event?.event !== "result" || typeof event.data?.stdout !== "string") {
      const detail =
        typeof event?.message === "string" && event.message ? event.message : `exit code ${outcome.exitCode}`;
      return { ok: false, reason: "engine-failed", detail };
    }
    try {
      const result = JSON.parse(event.data.stdout);
      if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
    } catch {
      // reported as unreadable below
    }
    return { ok: false, reason: "engine-failed", detail: "Indicator Labs returned an unreadable result" };
  }

  return { search, format: formatInspiration };
}

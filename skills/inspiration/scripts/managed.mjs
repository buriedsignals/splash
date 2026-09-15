// Which way a search goes. Under Engine, with an Infoviz account connected in Indicator Labs, the
// search runs as the closed `inspiration-search` operation so Engine can inject the account token;
// in every other case it runs directly and anonymously. Anything unclear before the operation
// starts falls back to the direct search. Once the operation has started, a failure is reported
// and nothing searches again: the operation may already have spent one of the day's searches.

import { MAX_QUERY_LENGTH, searchInspiration } from "./search.mjs";

export const KEY_STATUS_TIMEOUT_MS = 20_000;
export const OPERATION_TIMEOUT_MS = 90_000;

const CREDENTIAL_ID = "INFOVIZ_TOKEN";
const OPERATION_ID = "inspiration-search";

function terminal(outcome) {
  const events = Array.isArray(outcome?.events) ? outcome.events : [];
  return events.length ? events[events.length - 1] : null;
}

function describeFailure(outcome, event) {
  if (typeof event?.message === "string" && event.message) return event.message;
  if (typeof event?.data?.message === "string" && event.data.message) return event.data.message;
  return `exit code ${outcome?.exitCode ?? "unknown"}`;
}

async function accountStored(bsigPath, runEngineFn) {
  try {
    const outcome = await runEngineFn(bsigPath, ["keys", "status", CREDENTIAL_ID], "", {
      timeoutMs: KEY_STATUS_TIMEOUT_MS,
    });
    const event = terminal(outcome);
    return outcome.exitCode === 0 && event?.event === "result" && event.data?.stored === true;
  } catch {
    return false;
  }
}

/**
 * Searches with the connected Infoviz account when Engine has one, anonymously otherwise.
 */
export async function searchWithAccount({ query, env = process.env, runEngineFn, searchFn = searchInspiration }) {
  const bsigPath = env.SPLASH_BSIG_PATH;
  const subject = typeof query === "string" ? query.trim() : "";
  if (!bsigPath || !subject || subject.length > MAX_QUERY_LENGTH) return searchFn({ query });
  if (!(await accountStored(bsigPath, runEngineFn))) return searchFn({ query });

  let outcome;
  try {
    outcome = await runEngineFn(
      bsigPath,
      ["run", "splash", OPERATION_ID],
      JSON.stringify({ parameters: { query: subject } }),
      { timeoutMs: OPERATION_TIMEOUT_MS },
    );
  } catch (error) {
    return { ok: false, reason: "engine-failed", detail: error instanceof Error ? error.message : String(error) };
  }

  const event = terminal(outcome);
  if (outcome.exitCode !== 0 || event?.event !== "result" || typeof event.data?.stdout !== "string") {
    return { ok: false, reason: "engine-failed", detail: describeFailure(outcome, event) };
  }
  try {
    const result = JSON.parse(event.data.stdout);
    if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
  } catch {
    // falls through to the unreadable-output report below
  }
  return { ok: false, reason: "engine-failed", detail: "Indicator Labs returned an unreadable result" };
}

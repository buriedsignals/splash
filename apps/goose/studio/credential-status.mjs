// Credential status for the studio's readiness page, read one key at a time
// under a deadline. Each `keys status` read can make macOS wait for the
// journalist to approve keychain access for this Engine build; reading every
// key in parallel with no overall budget left the page on "Connecting to
// Splash…" with its controls disabled for as long as the prompts stood.
import { ENGINE_TIMEOUT_REASON, engineTimeout } from "../../../installer/setup/engine-bridge.mjs";

export const DEFAULT_PER_KEY_MS = 10_000;
export const DEFAULT_BUDGET_MS = 25_000;

export function budgetExhausted(id) {
  return Object.freeze({ ok: false, id, status: "engine-timeout", outcome: "budget-exhausted", reason: ENGINE_TIMEOUT_REASON, written: false });
}

/**
 * Reads the status of every listed key sequentially. A key whose read exceeds
 * perKeyMs reports `engine-timeout`; once budgetMs has elapsed the remaining
 * keys report the same without being read, so the studio always answers.
 */
export async function readCredentialStatuses(bridge, rows, {
  perKeyMs = DEFAULT_PER_KEY_MS,
  budgetMs = DEFAULT_BUDGET_MS,
  now = Date.now,
} = {}) {
  const started = now();
  const out = [];
  for (const row of rows) {
    const remaining = budgetMs - (now() - started);
    if (remaining <= 0) {
      out.push({ ...row, ...budgetExhausted(row.id) });
      continue;
    }
    let status;
    try {
      status = await bridge.status(row.id, { timeoutMs: Math.min(perKeyMs, remaining) });
    } catch {
      status = engineTimeout(row.id);
    }
    out.push({ ...row, ...status, metadata: status.metadata ?? row.metadata });
  }
  return out;
}

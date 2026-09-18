// The inspiration search the Splash MCP server offers the agent. Engine launches this server
// itself — the agent never runs it and cannot read its environment — and, when a Navigator account
// is connected in Indicator Labs, hands it the journalist's Navigator personal access token in
// OSINT_NAV_API_KEY. The gallery takes that key as its Bearer: ten searches a day with it, five a
// day per address without. The key stops here: the bridge and the setup session strip every
// credential-shaped variable before spawning a child, and the skill's own command never sees it.
//
// A refused key is the one case that searches twice: the anonymous answer comes back flagged, so
// the journalist learns the account needs reconnecting instead of silently losing their allowance.

import { searchInspiration } from "../../skills/inspiration/scripts/search.mjs";
import { formatInspiration } from "../../skills/inspiration/scripts/format.mjs";

export const NAVIGATOR_KEY_ID = "OSINT_NAV_API_KEY";

/**
 * Builds the search the `search_inspiration` tool calls.
 */
export function createInspirationService({
  token = process.env[NAVIGATOR_KEY_ID],
  searchFn = searchInspiration,
} = {}) {
  const key = typeof token === "string" ? token.trim() : "";

  async function search(query) {
    if (!key) return searchFn({ query });
    const result = await searchFn({ query, token: key });
    if (result.reason !== "invalid-token") return result;
    const anonymous = await searchFn({ query });
    return { ...anonymous, accountNeedsReconnect: true };
  }

  return { search, format: formatInspiration };
}

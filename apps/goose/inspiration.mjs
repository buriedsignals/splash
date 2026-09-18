// The inspiration search the Splash MCP server offers the agent. Engine launches this server
// itself and, when a Navigator account is connected in Indicator Labs, hands it the journalist's
// Navigator personal access token in OSINT_NAV_API_KEY, read once when the server starts. The
// gallery takes that key as its Bearer: ten searches a day with it, five a day per address without.
// The key is not passed to the agent: it is readable only by same-user processes, like every sealed
// operation's environment, and the bridge and the setup session strip every credential-shaped
// variable before spawning a child.
//
// A refused key is the one case that searches twice, and only once per server: the anonymous answer
// comes back flagged so the journalist learns the account needs reconnecting, and every later search
// in this server goes anonymous directly — a journalist who signed out of Navigator is not nagged
// on every search, and the gallery is not asked twice each time. Connecting or disconnecting takes
// effect at the next agent start, when Engine launches the server again.

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
  let key = typeof token === "string" ? token.trim() : "";

  async function search(query) {
    if (!key) return searchFn({ query });
    const result = await searchFn({ query, token: key });
    if (result.reason !== "invalid-token") return result;
    key = "";
    const anonymous = await searchFn({ query });
    return { ...anonymous, accountNeedsReconnect: true };
  }

  return { search, format: formatInspiration };
}

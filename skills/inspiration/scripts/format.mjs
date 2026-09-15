// The words a journalist reads after an inspiration search. Every sentence the skill says about a
// result is decided here, so the agent never paraphrases a quota, never guesses a reset time and
// never invents a reason the gallery did not give.

// Untrusted gallery text sits inside a markdown link's TEXT position (`[…]`) or plain prose (the
// credit). `[`, `]` and `\` would break out of that position; `<`/`>` would open raw HTML a
// CommonMark renderer executes. Backslash-escaping all five is rendered back literally by
// CommonMark and keeps the text on one line — `text()` in search.mjs already collapsed any line
// break to a space before this ever runs.
function escapeText(value) {
  return value.replace(/[[\]\\<>]/g, (character) => `\\${character}`);
}

// Parentheses, spaces and a trailing backslash would each end a markdown link target early or let
// it escape the syntax's own closing parenthesis — encoded instead of escaped, since a link
// TARGET is not a text position CommonMark reads backslash-escapes in.
function escapeLinkTarget(url) {
  return url.replace(
    /[()\\ ]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

// The gallery's own `date` field is prose, not a validated ISO date — shown only when its first 10
// characters are actually shaped like one, omitted otherwise rather than printed verbatim.
function isoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function quotaLine(quota) {
  if (!quota || quota.remaining === null || quota.remaining === undefined) return null;
  const of = quota.limit === null || quota.limit === undefined ? "" : ` of ${quota.limit}`;
  const base = `${quota.remaining}${of} searches left today.`;
  if (quota.remaining === 0) {
    return `${base} It resets at ${quota.resetsAt ?? "midnight UTC"}.`;
  }
  return base;
}

const RECONNECT =
  "Your Infoviz account needs reconnecting: Indicator Labs → Connected services → Infoviz → Reconnect.";

function formatFailure(result) {
  switch (result.reason) {
    case "empty-query":
      return "Name a subject to search for.";
    case "query-too-long":
      return `Keep the subject under ${result.limit} characters.`;
    case "invalid-token":
      return RECONNECT;
    case "engine-failed":
      return `Indicator Labs could not run the search (${result.detail}).`;
    case "limit-reached": {
      const perDay = result.quota?.limit ? ` (${result.quota.limit} searches a day)` : "";
      const reset = result.quota?.resetsAt ?? "midnight UTC";
      return `The gallery's daily limit is reached${perDay}. It resets at ${reset}.`;
    }
    case "unexpected-response":
      return `infoviz.design answered with status ${result.status}, so there is no list to show.`;
    case "unreachable":
      return `infoviz.design could not be reached (${result.detail}).`;
    default:
      return "The search did not complete.";
  }
}

function formatResult(result) {
  if (!result.ok) return formatFailure(result);

  const { query, items, quota } = result;
  const lines = [];
  const lq = "“";  // LEFT DOUBLE QUOTATION MARK
  const rq = "”";  // RIGHT DOUBLE QUOTATION MARK
  if (items.length === 0) {
    lines.push(`Nothing in the gallery for ${lq}${query}${rq}.`);
  } else {
    lines.push(`${items.length} published ${items.length === 1 ? "visual" : "visuals"} for ${lq}${query}${rq}:`, "");
    items.forEach((item, index) => {
      const credit = [
        item.source ? escapeText(item.source) : "newsroom unknown",
        isoDate(item.date) ? escapeText(isoDate(item.date)) : null,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(`${index + 1}. [${escapeText(item.title)}](${escapeLinkTarget(item.url)}) — ${credit}`);
    });
  }

  const left = quotaLine(quota);
  if (left) lines.push("", left);
  return lines.join("\n");
}

/**
 * Renders a `searchInspiration` result as markdown for the journalist.
 */
export function formatInspiration(result) {
  const body = formatResult(result);
  return result.accountNeedsReconnect ? `${RECONNECT}

${body}` : body;
}

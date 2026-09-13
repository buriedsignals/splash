// The words a journalist reads after an inspiration search. Every sentence the skill says about a
// result is decided here, so the agent never paraphrases a quota, never guesses a reset time and
// never invents a reason the gallery did not give.

function escapeLinkText(title) {
  return title.replace(/[[\]\\]/g, "\\$&");
}

// Parentheses and spaces would end a markdown link target early.
function escapeLinkTarget(url) {
  return url.replace(/[() ]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function quotaLine(quota) {
  if (!quota || quota.remaining === null || quota.remaining === undefined) return null;
  const of = quota.limit === null || quota.limit === undefined ? "" : ` of ${quota.limit}`;
  return `${quota.remaining}${of} searches left today.`;
}

function formatFailure(result) {
  switch (result.reason) {
    case "empty-query":
      return "Name a subject to search for.";
    case "query-too-long":
      return `Keep the subject under ${result.limit} characters.`;
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

/**
 * Renders a `searchInspiration` result as markdown for the journalist.
 */
export function formatInspiration(result) {
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
      const credit = [item.source ?? "newsroom unknown", item.date ? item.date.slice(0, 10) : null]
        .filter(Boolean)
        .join(", ");
      lines.push(`${index + 1}. [${escapeLinkText(item.title)}](${escapeLinkTarget(item.url)}) — ${credit}`);
    });
  }

  const left = quotaLine(quota);
  if (left) lines.push("", left);
  return lines.join("\n");
}

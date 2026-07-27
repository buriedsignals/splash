// "Public named sources require a specific dataset/page URL" (issue #7, acceptance list).
//
// The specificity clause is the half of the rule that a plain URL check misses. A named public
// source credited with `https://www.bfs.admin.ch` is not traceable: the reader is handed a
// building, not a document. The same holds for the OPTIONAL urls of `local` and `prose` — if a
// url is offered at all it must resolve the claim, otherwise the field is simply omitted.
//
// Shape only, never a network probe (the same discipline as isHostedUrl, which this builds on:
// https, a real domain, no placeholder host). Specific = there is something after the origin —
// a path beyond "/" or a query. A fragment does NOT count: "#data" addresses a scroll position
// on the same page, which is the half-truth this rule exists to refuse.
import { isHostedUrl } from "../core/contract";

export type SourceUrlVerdict = "specific" | "not-specific" | "not-a-url";

export function sourceUrlVerdict(url: string): SourceUrlVerdict {
  const trimmed = url.trim();
  if (!isHostedUrl(trimmed)) return "not-a-url";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "not-a-url";
  }
  const hasPath = parsed.pathname !== "" && parsed.pathname !== "/";
  const hasQuery = parsed.search !== "";
  return hasPath || hasQuery ? "specific" : "not-specific";
}

export function isSpecificSourceUrl(url: string): boolean {
  return sourceUrlVerdict(url) === "specific";
}

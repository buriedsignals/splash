// twin/skills/deliver/scripts/finding-severity.mjs
//
// HOW SERIOUS A REVIEW FINDING IS — decided in ONE place, issue #11.
//
// Review findings were bare strings. A source-traceability failure, a broken interaction the format
// requires, and a stylistic observation all arrived as an id in a list, and all three shipped
// through the same "approve" action. That collapses materially different risks into one bucket and
// leaves no durable evidence that a journalist knowingly overrode a serious one.
//
// The mapping lives here and nowhere else, which is the point the issue makes last and which is the
// real defect: without one table, the same defect can be blocking in one producer and advisory in
// another, and the severity becomes a property of who found it rather than of what it is.
//
// WHAT THIS FILE DELIBERATELY DOES NOT ADD. The issue asks for overrides to be invalidated when the
// artifact is re-produced, and for findings to reset for a new artifact. Both already hold and
// needed no new machinery: `approvalAgainstCurrent` compares the review's `draftDigest` against a
// fresh `renderDigest(beatDir)` of the rendered tree's own bytes, so ANY re-render already makes
// the whole review — override included — stale. Adding a second invalidation rule beside it would
// be two mechanisms for one fact.

/** Blocking first: the order a journalist should read them in. */
export const SEVERITIES = ["blocking", "warning", "informational"];

/**
 * The criteria a finding can be about, and how serious each is by default.
 *
 * Blocking is reserved for what makes a visual unsafe to SHIP — not for what makes it worse. The
 * test is whether a reader could be misled or excluded, or whether the artifact does not do what
 * its format promises: a claim the data does not carry, an attribution that is wrong or invented,
 * an accessibility failure that excludes a reader outright, an interaction the format requires and
 * does not have, or an artifact that no longer matches the source it cites.
 */
export const CRITERION_SEVERITY = Object.freeze({
  claim: "blocking",
  data: "blocking",
  source: "blocking",
  accessibility: "blocking",
  interaction: "blocking",
  staleness: "blocking",
  title: "warning",
  legibility: "warning",
  convention: "warning",
  palette: "warning",
  craft: "informational",
  polish: "informational",
});

/** Findings whose id is not a known criterion are WARNINGS, never informational: an unclassified
 *  finding is one nobody has decided about, and defaulting it to silence is how a real concern
 *  becomes a stylistic note. It is not blocking either — a typo in an id must not be able to stop a
 *  newsroom shipping. */
export const UNKNOWN_SEVERITY = "warning";

/** A finding id is `criterion` or `criterion-something`, so `source-traceability` is a source
 *  finding. One shape, so an id carries its own severity and no second list has to agree. */
export function criterionOf(findingId) {
  const id = String(findingId ?? "").trim();
  if (id === "") throw new Error("a finding id cannot be empty");
  return id.split("-")[0];
}

/** How serious this finding is. Total: every id gets an answer. */
export function severityOf(findingId) {
  return CRITERION_SEVERITY[criterionOf(findingId)] ?? UNKNOWN_SEVERITY;
}

/** The blocking findings in a list, in the order given. */
export function blockingFindings(findingIds) {
  return [...(findingIds ?? [])].filter((id) => severityOf(id) === "blocking");
}

/**
 * THE REFUSAL. Blocking findings stop an approval unless the journalist overrode each one BY NAME,
 * with a reason — the durable evidence the issue asks for, and the whole reason severity exists.
 *
 * `overrides` is `{ [findingId]: { reason, at, by } }` on the review record. It is checked here
 * rather than trusted: an override naming a finding that is not open, or carrying no reason, is a
 * record of nothing.
 */
export function blockingGap(findingIds, overrides = {}) {
  const open = blockingFindings(findingIds).filter((id) => {
    const override = overrides?.[id];
    return !override || String(override.reason ?? "").trim() === "";
  });
  if (open.length === 0) return null;
  return (
    `this output carries ${open.length} blocking finding${open.length === 1 ? "" : "s"} ` +
    `(${open.join(", ")}) that ${open.length === 1 ? "is" : "are"} neither resolved nor overridden. ` +
    `A blocking finding is one that makes the visual unsafe to ship — a claim the data does not ` +
    `carry, an attribution that is wrong, a reader excluded, or an artifact that no longer matches ` +
    `its source. To ship anyway, record an override against the finding id with the journalist's ` +
    `own reason; it is bound to this exact render and dies with it.`
  );
}

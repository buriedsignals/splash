// The CMS INSERTION delivery form's pure logic. Neither CMS this file names is wired to a real
// endpoint anywhere in this toolchain or its sibling — no base URL, no credential, nothing to call
// exists to invent, and inventing one would be a claim this file cannot back (see
// `references/cms-insertion.md` for the measured facts this is designed against, and this skill's
// own SKILL.md for the explicit UNPROVEN marker). What IS real: the two mutation SHAPES, built and
// tested against fixtures, and the one safety property that actually matters — a total-replace CMS
// must never be handed a partial article.

export const CMS_KINDS = ["we-publish", "livingdocs"];

/**
 * Throws unless `nextBody` equals `previousBody` with exactly one occurrence of `insertionHtml`
 * spliced in — appended, or inserted at a marker, but never anything else changed or dropped. This
 * is the whole guard: a total-replace CMS (We.Publish's `updateArticle` — its own mutation
 * rewrites the ENTIRE article, nothing held back is merged in, it is deleted) must never be sent a
 * body that drops anything the article already had. Checking "does nextBody CONTAIN previousBody"
 * would refuse a legitimate mid-article insertion (the text before the insertion point is no
 * longer immediately followed by the text after it, even though nothing was lost) — this checks
 * the stronger, correct thing: remove the insertion from `nextBody` and what is left must be
 * `previousBody`, byte for byte. `previousBody` empty is refused too, deliberately — an insertion
 * built against "nothing" almost always means the real article was never fetched first, which is
 * exactly the shape of mistake this guard exists to catch before a network call, not after one.
 */
export function assertNotPartialReplace(previousBody, nextBody, insertionHtml) {
  if (!previousBody || previousBody.trim().length === 0) {
    throw new Error(
      "previousBody is empty — fetch the real article body before building a total-replace insertion, never insert against nothing",
    );
  }
  const at = nextBody.indexOf(insertionHtml);
  if (at === -1) {
    throw new Error("nextBody does not contain the insertion at all — nothing was actually added");
  }
  const withoutInsertion = nextBody.slice(0, at) + nextBody.slice(at + insertionHtml.length);
  if (withoutInsertion !== previousBody) {
    throw new Error(
      "nextBody, with the insertion removed, does not equal the previous article body — a total-replace CMS must never be handed a partial (or otherwise altered) article",
    );
  }
}

/**
 * Builds the mutation payload's SHAPE for the named CMS `kind` — never sends it anywhere; nothing
 * in this file makes a network call. `we-publish` needs the full existing article body already
 * merged in (`assertNotPartialReplace` is what proves that actually happened, run unconditionally
 * before this returns); `livingdocs` needs only the new component, because `insertComponent` is a
 * genuine, additive insertion — the previous body is never read, let alone at risk.
 */
export function buildInsertion({ kind, articleId, previousBody, insertionHtml, afterMarker }) {
  if (!CMS_KINDS.includes(kind)) {
    throw new Error(`unknown CMS kind ${JSON.stringify(kind)} — known: ${CMS_KINDS.join(", ")}`);
  }
  if (!insertionHtml || insertionHtml.trim().length === 0) {
    throw new Error("insertionHtml is empty — nothing to insert");
  }

  if (kind === "we-publish") {
    // The literal text added, in EITHER shape below — a leading newline plus the insertion
    // itself — is what `assertNotPartialReplace` needs to find and remove again; it must match
    // exactly what was spliced in, not merely `insertionHtml` on its own; the "\n" was added at
    // the same time and is just as real a change to verify.
    const insertedSpan = `\n${insertionHtml}`;
    const nextBody =
      afterMarker && previousBody?.includes(afterMarker)
        ? previousBody.replace(afterMarker, `${afterMarker}${insertedSpan}`)
        : `${previousBody ?? ""}${insertedSpan}`;
    assertNotPartialReplace(previousBody, nextBody, insertedSpan);
    return {
      kind,
      mutation: "updateArticle",
      shape: "total-replace",
      unproven: true,
      variables: { id: articleId, body: nextBody },
    };
  }

  return {
    kind,
    mutation: "insertComponent",
    shape: "insert",
    unproven: true,
    variables: {
      articleId,
      component: { type: "html", html: insertionHtml },
      afterMarker: afterMarker ?? null,
    },
  };
}

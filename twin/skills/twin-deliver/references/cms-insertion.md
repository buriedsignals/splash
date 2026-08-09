# CMS insertion — two mechanics, one guard, and what remains untested

Both CMS integrations named here are new to this toolchain and its sibling engine tonight. Neither
has ever been called against a real CMS from this codebase. What follows is the measured shape of
each API and the one safety property `scripts/cms-insert.mjs` enforces mechanically — not a report
of a working integration.

## We.Publish — `updateArticle` is total

We.Publish's article mutation is not an insertion API. `updateArticle` takes the article's full
body and **replaces it entirely**. There is no separate "add a component" call, and no partial
update: whatever the mutation's `body` argument does not contain is gone from the published article
the moment the mutation succeeds. A caller that fetches the article, forgets to carry its existing
body forward, and sends only the new visual has just deleted the rest of the article.

That shape is why `buildInsertion({ kind: "we-publish", ... })` requires the caller's own
`previousBody` — the full body read from the real article, not reconstructed or assumed — and why
`assertNotPartialReplace(previousBody, nextBody)` runs unconditionally before the function returns
anything: it throws unless the body about to be sent still contains every byte of the body that was
there before, verbatim. This is a pre-flight guard, not a network check — it catches the mistake
before any request is built, and it has nothing to do with whether We.Publish is actually reachable.

## Livingdocs — `insertComponent` is a genuine insertion

Livingdocs exposes `insertComponent`, which adds one component to an article without touching the
rest of it. This is a fundamentally smaller-risk shape: nothing about the rest of the article needs
to be read, carried, or re-sent, because the mutation was never given the power to delete it.
`buildInsertion({ kind: "livingdocs", ... })` reflects this — it never reads `previousBody` at all.

## What is proven and what is not

Proven tonight, by a real test suite: both mutation shapes build correctly from fixtures, both
reject an empty insertion, `we-publish` rejects an unknown `kind`, and — the one property that
matters most — `assertNotPartialReplace` refuses a `nextBody` that drops any part of the article
that was already there, and refuses to run at all against an empty `previousBody` (the strong
signal that the real article was never fetched).

Not proven, and not claimed as proven anywhere in this skill: that either mutation, sent for real,
succeeds against a live We.Publish or Livingdocs instance. No base URL, no API credential, no
authenticated session for either CMS exists anywhere in this toolchain or its sibling engine. This
skill's own `SKILL.md` marks the `cms-insertion` form UNPROVEN for exactly this reason — the code
here prepares a payload and enforces the one guard that would matter if it were ever sent, and stops
there.

# Files — full detail

- `scripts/story-index.mjs` — **`VISUALS.md`: one file per story saying what was made and where it
  is** (#56). Every fact was already on disk and recorded well, and none of it was in one place: a
  URL in `export/<id>/EMBED_URL.txt`, the deployment in `DEPLOYMENT.json`, what a file is for in
  `HANDOVER.md`, closure in two dotfiles, a video only in `beats/<id>/renders/`. Answering "what have
  we made and where is it?" meant opening n directories and knowing that anything unhosted lives in
  `beats/` rather than `export/`. The journalist asked for it directly: *"otherwise people are not
  going to remember where things are."*

  Written beside `STORYBOARD.md`, because it describes several exports and putting it inside one of
  them repeats the mistake. Four rules, each a way it could go wrong:

  1. **It is not a state file.** `whereIs` derives state from the real artifacts and keeps doing so;
     nothing reads this back. It is regenerated whole on every delivery, never appended to — an index
     that accumulated history would start disagreeing with the directory, and a drifting index is
     worse than none.
  2. **It covers the unhosted formats honestly.** A video and a static export have no URL, and the
     index says so; a journalist who cannot find their video in it concludes it was never made.
  3. **It says where to CORRECT a visual** — `beats/<id>/` — as distinct from what was sent,
     `export/<id>/`. `AGENTS.md` states that in prose for an agent and nothing stated it for a human,
     and it is the distinction a returning journalist most needs and most easily gets wrong.
  4. **It is written in the story's language** (ruling R4), like the hand-over and both halves of the
     closing offer.

  It also summarises the warnings that belong to each visual — most importantly a page carrying a
  **development** MapTiler key, which is readable by every reader and billed to the newsroom, and
  which previously existed only inside one output's `HANDOVER.md`.

- `scripts/finding-severity.mjs` — **how serious a review finding is, decided in one place** (#11).
  Findings used to be bare strings, so a source-traceability failure and a kerning note arrived in the
  same list and shipped through the same "approve". `severityOf` reads the criterion off the finding's
  own id (`source-traceability` → `source`), so no second list has to agree, and `blockingGap` refuses
  an approval while a blocking finding is neither resolved nor overridden BY NAME with a reason.
  Blocking is reserved for what makes a visual unsafe to *ship* — a claim the data does not carry, an
  attribution that is wrong, a reader excluded, an interaction the format promises and does not have —
  not for what merely makes it worse. An unclassified id is a **warning**: silence would let a real
  concern read as a stylistic note, and blocking would let a typo stop a newsroom shipping.

  Overrides need no invalidation rule of their own. `approvalAgainstCurrent` already compares the
  review's `draftDigest` against a fresh `renderDigest` of the rendered tree's bytes, so any re-render
  makes the whole review stale and the override dies with it — two mechanisms for one fact would only
  be able to disagree.

- `scripts/format-handover.mjs` — `formatHandover`, which renders `export/HANDOVER.md` from a closed
  parameter set. Every input is already recorded elsewhere: `placement` and `credit` are hand fields 4
  and 5, the caveat is `limits`, the alt is in the component, the `language` is the storyboard's own
  field. `LIVE_TILES` is the four-state vocabulary that says which MapTiler key the delivered page
  carries and what it costs — an enum, never a sentence a caller writes — held per language, like
  every other sentence in the document.
- `scripts/journalist-language.mjs` — `resolveScaffoldLanguage`, `untranslatedNotice` and
  `SCAFFOLD_LANGUAGES`: the one reading of what language a delivery is written in, and the one
  decision about a language it is not written in (English, with the fallback stated in the document
  rather than discovered by the reader).
- `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its recursive helper),
  `carriesMapKey` and `mapKeyState` (the key question, asked of the artifact), `singleOwnedFile` (the
  one-file guard `embed`/`cms-insertion` share), `exportDirFor` (the one directory an output delivers
  into), and the `BUILD_SCRIPT` template written into every `source-bundle` delivery.
- `scripts/delivery-identity.mjs` — `resolveDeliveryIdentity`, `deliveryDestinations`,
  `stableDeliveryId`, and `DELIVERY_IDENTITY_SCHEMA_VERSION`: the explicit stories-root boundary,
  stable IDs, canonical ancestor checks, and derived source/export paths.
- `scripts/delivery-compat-v1.mjs` — `offerFormsLegacyV1`, `materialiseLegacyV1`,
  `exportDirForLegacyV1`, and `LEGACY_DELIVERY_ADAPTER_VERSION`: the retained old call shape, validated
  against the explicit root and converted to IDs without using its destination path.
- `scripts/output-review.mjs` — deterministic render-tree digest, versioned review/QA validation,
  atomic `OUTPUT-REVIEW.json` serialization, and the fail-closed gate both delivery APIs call.
- `scripts/delivery-replacement.mjs` — per-output in-process and filesystem locking, the versioned
  replacement journal and delivery manifest, both publication renames, and restart reconciliation.
- `scripts/another-format.mjs` — `otherFormatsFor`, `formatAnotherFormatOffer`, `recordFormatAnswer`,
  `deliveryClosed`, and `PRODUCIBLE_FORMATS`, this skill's own reading of which medium × format pairs
  can be walked to a delivered export (a duplicate of the storyboard's catalogue, cross-checked by a
  test, never imported).
- `scripts/other-subjects.mjs` — `recordSurveyedSubjects` (the writer, called at the proposal),
  `readSurveyedSubjects`, `otherSubjectsFor` (the reader, which re-checks), `formatSubjectOffer`,
  `recordSubjectAnswer`, and `SUBJECT_OFFER_RECEIPT`, the second dotfile a closed delivery carries.
- `scripts/deploy-embed.mjs` — `cloudflareProjectName`, `deployFile`, `resolveCloudflareCredentials`,
  `contentTypeFor`, the bounded Cloudflare Pages call sequence, stable per-output project URL, and
  reconciliation by stable `commit_hash`.
- `scripts/hosted-deployment.mjs` — stable deployment-key derivation, schema-v1 operation records,
  atomic state updates, and the remote-complete/local-complete boundary.
- `scripts/cms-insert.mjs` — `buildInsertion`, `assertNotPartialReplace`, `CMS_KINDS`. No network code
  anywhere in this file.
- `references/cms-insertion.md` — both CMS mechanics in prose, and what remains untested.
- `test/deliver.test.ts` — `bun:test` coverage: what each form offers and describes, that
  `offerForms` itself refuses an unknown format, that only the chosen form's files land in
  `exportDir`, that a nested subdirectory (two levels deep for `source-bundle`, one level for
  `owned-file`) is walked rather than crashing `copyFile`, that a second choice clears the first's
  files, that an unoffered form — including a form id that is real for a *different* format — is
  refused without touching a delivery already made, that the shipped `build.ts` is run for real (`bun
  run build`, via the bundle's own `package.json`) and produces a bundled file, not just a promise,
  that `embed` is offered/withheld correctly across every combination of the two Cloudflare env vars,
  and that `materialise` for `embed` writes the URL, iframe, deployment receipt and hand-over while
  `cms-insertion` writes its payload and hand-over, refuses source ambiguity, and — for
  `cms-insertion` — makes zero network calls. Its "a story has more than one beat" block is the
  two-beat fixture nothing here had: it delivers two approved beats and asserts the first one's files
  survive the second's delivery.
- `test/delivery-identity.test.ts` — canonical root/ID derivation, traversal and symlink refusals,
  rejection of path fields on the canonical API, and the versioned legacy fixture proving a valid old
  call still works while an alternate recursive replacement target remains untouched.
- `test/another-format.test.ts` — the offer's three filters, the reason a withholding must carry, the
  journalist-facing text asserted to name nothing of ours, the parity with the storyboard's catalogue,
  and the fixture the run would have failed: a beat that has been DELIVERED is not closed until the
  offer has been answered, and declining closes it as cleanly as taking.
- `test/other-subjects.test.ts` — the record written and read back, every angle re-checked (drawn ·
  capability closed since · no producer), the journalist-facing text asserted to name nothing of ours
  and no reason anything was filtered out, the honest empty case, and the fixture the run would have
  failed: several angles found, one delivered, nothing offered at the end. Its last block exercises
  two beats in one story for real — the second beat delivers into its own directory and the first
  one's delivery survives.
- `test/refusals-name-no-detour.test.ts` — every refusal in this path, triggered for real and read
  from the source, asserted to name no alternative delivery route; plus the historical sentence the
  run followed, kept as the proof the detector can see the defect it was written for.
- `test/deploy-embed.test.ts` — the Cloudflare direct-upload sequence against a fake of the real API
  (project creation plus the upload calls in order, an already-existing project treated as success, a
  real failure surfaced with Cloudflare's own message), hard request/body deadlines, unreadable 5xx
  handling, and lost-response reconciliation without a duplicate POST; plus
  `contentTypeFor`/`resolveCloudflareCredentials`. No current live-provider claim is inferred from
  those fakes; a credential-gated release smoke is tracked separately rather than spending real deploys
  on every `bun test`.
- `test/cms-insert.test.ts` — both mutation shapes, and `assertNotPartialReplace` proven against an
  append, a mid-article marker insertion, a silently-dropped paragraph (refused), and an
  altered-not-just-extended body (refused).

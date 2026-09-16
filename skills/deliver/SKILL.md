---
name: deliver
description: Use to run the DELIVERY phase of the doctrine twin — offer the journalist the forms their beat's format allows, wait for the choice, and materialise only that one. Never builds a form nobody asked for.
---

# deliver — offer, wait, build the one that was chosen

## Overview

Runs the DELIVERY phase: the last step of an output's life, after a render exists at the canonical
`<storiesRoot>/<storyId>/beats/<outputId>/renders/` location.
`offerForms({medium, format, storiesRoot, storyId, outputId, planVersion, findingIds, env})` names the
delivery forms its format allows. `materialise({form, format, storiesRoot, storyId, outputId,
planVersion, findingIds, env, fetchFn, cms})` writes exactly the chosen form. Both APIs
derive the source and `export/<outputId>/` destination from the separately declared stories root
and stable IDs; neither accepts a caller-selected source or recursive replacement path.

For a managed installation, these JavaScript APIs remain the implementation layer. Any delivery
that needs a credential crosses Engine's closed stdin boundary: `maptiler-delivery` for the final
client-publishable map key and `cloudflare-deploy` for the complete **Deploy and receive embed
code** form. Engine verifies the adopted checkout, validates the structured story/output/review
request before reading a credential, and injects only that operation's broker record into
`scripts/sealed-operation.mjs`. Do not source a repository `.env` or pass a key in chat, argv, or a
story file.

**Four forms exist now, not two.** `owned-file` and `source-bundle` are files the newsroom keeps —
every format offers both. `embed` (the journalist-facing **Deploy and receive embed code** form)
and `cms-insertion` (a prepared
insertion payload for We.Publish or Livingdocs) are NOT owned files — the newsroom gets a URL or a
document, never a copy of the hosted page. `embed` is wired to the two formats that ship a single
self-contained HTML page, "web" and "scrolly"; `cms-insertion` is available for every format, with
the appropriate rendered file selected for its payload. **`embed` is implemented and covered by
deterministic provider-contract tests, but the current release still requires a credential-gated
two-revision Cloudflare smoke test** (see "How it works" below). **`cms-insertion`
is NOT proven against a live CMS** — no We.Publish or Livingdocs endpoint exists anywhere in this
toolchain to call. It builds and guards a real mutation payload, documents it, and says so in the
document it writes. Managed setup does not collect `CMS_TOKEN`, and Engine registers no CMS
credential or CMS operation. Older copied roots may still contain legacy CMS names, but they open no
capability row and are not a production integration. This form writes a file describing the mutation
rather than sending it. A stored legacy value is not a proven integration. Read "How it works",
step 3, before assuming either behaves like the other two.

**The forms are offered, then WAITED on. Silence is not a choice.** A conversation running this
phase asks **“Which delivery form should Splash provide?”**, presents the list `offerForms` returns,
and stops — it does not call this a publication-format choice, does not default to a form, does not
guess from context, does not materialise anything until the journalist names one. That reversal
is the whole point of this skill: `main`'s habit was to build every form up front, so the choice
(if it ever came) was a formality over files that already existed. Here the files do not exist
until the choice does.

## When to use

- At the end of production, once the output's canonical `renders/` directory holds a draft — call
  `offerForms` with its medium, format, declared stories root, stable story ID, and stable output ID;
  present the list and wait. It throws if the output has not been approved.
- Once the journalist has named a form (its `id`, exactly), call `materialise` with that id, the
  *same* identity and format. Nothing before that call.
- **Immediately after `materialise` returns**, and before the run ends: make BOTH halves of the
  closing offer. `otherFormatsFor` + `formatAnotherFormatOffer` for the same beat in another format;
  `otherSubjectsFor` + `formatSubjectOffer` for the other subjects in the same article. Wait for
  each answer and write it (`recordFormatAnswer`, `recordSubjectAnswer`). A delivery with either half
  unanswered is not closed (`deliveryClosed`), and both receipts say so on disk.
- **Hand `language` to all three of them** — `materialise`'s hand-over payload, `otherFormatsFor` and
  `formatAnotherFormatOffer`, `formatSubjectOffer` — as `STORYBOARD.md` records it. They refuse without it
  rather than write to a newsroom in a language nobody chose.
- **Not** for production. This skill never renders a chart or a map — it only decides which
  already-rendered (or already-written) files leave the beat directory, and in what shape.

## The one gotcha that will waste your day (read first)

**A second choice is not additive — and that wipe must never cross an output.** If a journalist
materialises `owned-file` and then changes their mind and materialises `source-bundle` for the same
output ID, the first form's files do not linger. `materialise` builds the complete replacement in a
private sibling staging directory, including `HANDOVER.md`, and only then replaces the derived
`export/<outputId>/` directory. The
directory therefore holds exactly the most recently completed form — never a mix of two — while a
failed build, hand-over, copy, or remote deployment leaves the last good export intact. Validation
of `{form, format}`, the declared trust root and stable IDs, the bound `OUTPUT-REVIEW.json`, and the
hand-over payload all happens before staging begins. A per-output lock serializes concurrent calls. A
versioned replacement journal and `.delivery-manifest.json` let the next call restore the previous
export or finish cleanup if the process stopped between the two publication renames.

**The other half of it, and it was live: a story has more than one beat.** With one story-level
`export/` shared by every beat, that same wipe reached ACROSS beats — delivering beat 2 destroyed
beat 1's delivered files, silently, at the last phase of the journey, and the second delivery
reported success. Nothing in this repository had ever put two beats in one story, so no test saw it.
Two things close it, and both are code rather than convention:

- **`exportDirFor({storiesRoot, storyId, outputId})`** reports the derived destination, but
  `materialise` derives it independently and accepts no destination argument. The root, story,
  `beats/`, output, `renders/`, export root, and existing export are canonicalized; symlinked
  ancestors and traversal IDs fail closed. `whereIs` reads the same per-output shape.
- **a `.delivered-from` receipt**, written into every export directory, naming the output it came
  from. `materialise` reads it BEFORE replacement and throws when it names a different output. The
  receipt is a dotfile because `export/<outputId>/` is a directory the journalist opens; it is never
  in `written`.

Legacy callers use `offerFormsLegacyV1` and `materialiseLegacyV1` from
`scripts/delivery-compat-v1.mjs`. That named, versioned adapter requires `storiesRoot`, validates the
old `beatDir` and `exportDir` against the canonical identity, discards both paths, and delegates to
the ID-based API. It never restores a caller-selected deletion target.

## Architecture

Full layer table (delivery identity, legacy compat, the menu, review gate, materialiser, replacement,
the key, hand-over, language, the two closing offers, hosted embed, CMS insertion):
`references/architecture.md`.

## Bound output review

`OUTPUT-REVIEW.json` is written atomically beside the output's `renders/` directory. Version 1
records `id`, `outputId`, `planVersion`, `draftRef`, `draftDigest`, `findingIds`, `qaRuns`,
`angleEvidenceBrief`, and `decision`, plus optional reviewer metadata. Each embedded QA run carries
its own schema version, ID, status, completion time, and the same output/render/plan/finding binding.
`writeOutputReview` serializes a review and refuses to write an approval without a matching passing
QA receipt; it does not run QA or manufacture that receipt. Unknown schema versions fail closed and
remain untouched on disk.

## Recovering a published output for editor feedback

A delivered output is never dead: it is recoverable, and the recovery path runs back through this
skill. Every story carries its own `AGENTS.md`, which records one stable relationship a fresh
session reads off disk: `beats/<outputId>/` is the **editable production source**; `export/<outputId>/`
is the **current delivery** and is never edited as source.

- Record feedback in the beat (the durable trigger is updating the beat's `FEEDBACK.md`, which
  reopens production, then delivery). Change the canonical source — the bespoke component, or a
  Datawrapper beat's persisted `spec.json` — then rerender.
- A changed render needs a NEW bound `OUTPUT-REVIEW.json` for exactly that draft; the old review
  binds the old digest and cannot approve the new pixels. Then rematerialise the same form:
  hosted deliveries redeploy to the same project, so existing embeds keep their address while
  `DEPLOYMENT.json` records the new immutable version; the deployment receipt names the editable
  source and the stable public URL beside `EMBED_URL.txt`, `EMBED_CODE.html`, and `HANDOVER.md`.
- A custom Cloudflare output keeps its per-output project URL across revisions. A Datawrapper
  output reuses the chart ID recorded in its `DATAWRAPPER.json` when production reruns with the same
  `beatDir` — a second chart ID for the same slot is a defect, not an update.

## How it works (the shape)

1. **`offerForms({medium, format, storiesRoot, storyId, outputId, planVersion, findingIds,
   env = process.env})`** first resolves the canonical beat from that identity and validates its
   `OUTPUT-REVIEW.json` — **Gate 3 closes before Gate 4 opens.** The record must be
   schema version 1, decide `approve`, name this output, match the exact current render digest,
   current plan version and current finding IDs, and contain a passing QA run bound to that same
   tuple. A bare `APPROVED.md`, a copied review, or a review made stale by any render or plan change
   does not open delivery. Delivery cannot honestly be discussed before the journalist has seen the
   thing being delivered, and the forms are this function's own output: anything said about them
   before it runs is a guess. The run guessed twice, both times wrongly, once *inside* the Gate-3
   approval question, and had to retract it. Then it
   looks `format` up in `FORMS_BY_FORMAT`. **Four** formats are known today —
   `"static"`, `"web"`, `"video"`, `"scrolly"` — any other format throws rather than
   returning an empty or partial list, so a caller can never mistake "no forms for this format yet"
   for "this beat has nothing to deliver". For a known format it returns every form in that format's
   table, in the same order every time, each carrying an `id`, a `label`, and a `gives` long enough
   to inform a real choice. In managed production, `env` is the isolated operation environment
   constructed by Engine. When `resolveCloudflareCredentials(env)` finds
   `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN` missing, `embed` remains visible with
   `available: false` and a concrete setup reason. This is a PRESENCE check, not a live probe —
   `offerForms` stays synchronous and cheap to call on every turn; a present-but-wrong token leaves
   the form enabled and fails loudly at `materialise` instead. A journalist with no Cloudflare
   account still sees every other form their format allows; the journey never crashes over a
   missing credential or hides what would open hosted delivery.
2. **The conversation presents the list and waits.** For web/scrolly, say **Deploy and receive
   embed code**. Do not ask whether to use Cloudflare: choosing this form already means Splash will
   use Cloudflare automatically. This skill's code stops here; the doctrine
   of waiting is enforced by the calling conversation, the same way `storyboard` enforces
   its exchange in prose, not in code that could be skipped.
3. **`materialise({form, format, storiesRoot, storyId, outputId, planVersion, findingIds, env,
   fetchFn, cms, handover})`** validates the **`{form, format}` pair** against
   `FORMS_BY_FORMAT[format][form]`, independently re-checks the same bound review, derives both
   source and the one legal `export/<outputId>/` destination from the declared trust root and IDs
   (rejecting traversal, symlinked ancestors, and caller-supplied `beatDir`/`exportDir`), and builds
   the chosen form in staging under a per-output lock before replacing the previous export — a
   successful build and hand-over only. Four forms: `owned-file` (copies `renders/` into the export,
   substituted key under a private `keyed/` dir), `source-bundle` (copies source, writes a real
   buildable `build.ts`/`package.json`), `embed` (deploys to a deterministic Cloudflare Pages
   project — **implemented, live verification credential-gated**), `cms-insertion` (writes a mutation
   payload to disk — **UNPROVEN against a live CMS**, zero network calls). Full mechanics of each
   form: `references/forms-detail.md`.
4. **Every form closes into `export/<outputId>/HANDOVER.md` — that is G4, and it is not optional.**
   `materialise` throws when the caller hands in no payload, rather than delivering files nobody was
   told what to do with. It used to return early instead, so every form worked without one and
   `whereIs` called the story done anyway — which is how the run delivered two filenames and two
   sizes, with no placement, no alt text and no credit line. Every input is already recorded during
   the exchange: placement and credit are hand fields 4 and 5, the alt is in the component, the
   caveat is `limits`. A caller with nothing to hand in has not read the storyboard back.

   **And it is written in the STORY's language, which is one of those recorded inputs.** The owner's
   own run delivered a French story — article, takeaway, hand fields, title, alt text, credit line —
   inside an English scaffold: *"## Where it goes in the article"* above a French sentence, in the
   one artifact the newsroom keeps (A25). Ruling R4 had already settled the principle and nothing
   had applied it here. `language` is now part of the payload, read from `STORYBOARD.md`'s
   `language:` field — a code, never free text, never sniffed from the prose — and the same rule
   governs both halves of the closing offer, which the journalist reads at the same moment.
   **A language with no scaffold falls back to English AND says so**, in a line above the document
   it is about: refusing would block a journalist from their own delivered work over a gap that is
   ours, and falling back silently is the defect itself. One English line can still reach a French
   offer — the "not available" sentence, which preflight measures in English — and that known
   limitation stays in maintainer-facing records rather than a delivered document.
5. **`materialise` returns every path it wrote**, the hand-over included. A caller that wants to
   confirm the delivery can list `written` without re-reading the directory.

6. **`otherFormatsFor({medium, deliveredFormat, capabilities, notSuited, language})` — offer the
   OTHER formats the same beat could also be produced in**, filtered by producibility, open
   capability, and the beat's own claim surviving the format. Taking one records a request only;
   declining is a recorded answer (`recordFormatAnswer`, `deliveryClosed`).
7. **`otherSubjectsFor({storyDir, capabilities})` — the article's other angles**, surveyed at the
   proposal and written into `stories/<slug>/SUBJECTS.md`, re-checked (never trusted) at delivery
   time. Taking one starts a new beat from its first phase; declining, or `none`, is an answer too.

Full reasoning for both halves of the closing offer: `references/forms-detail.md`.

### The MapTiler key, and why a refusal never names a way around itself

A map × web beat renders with a placeholder where its MapTiler key belongs; delivery substitutes the
real key only inside one explicit custody boundary (never a committed artifact). `carriesMapKey`
decides per-artifact whether this applies at all; `mapKeyState` (`none`/`live`/
`unkeyed`) says which key went in and what the hand-over must tell the journalist. Every refusal in
this path states the situation and stops — it never names a route around itself. Full detail and the
three-state table: `references/maptiler-key-and-refusals.md`.

## Library and compatibility example

The pure offer/materialisation API, as used by tests and older textual flows: `references/library-example.md`.
In a managed installation, keep the offer and human gate, then send the confirmed structured request
through Engine for any key-bearing form; never populate `env` from a checkout `.env`.

## Tuning knobs

Every configurable value (forms per format, insertion file preference, identity schema, lock/journal
shape, Cloudflare project naming, request timeout, languages, …) and where it lives:
`references/tuning-knobs.md`.


## Files

References: `references/architecture.md` (full layer table), `references/forms-detail.md` (each
delivery form's mechanics, the two closing offers in full), `references/maptiler-key-and-refusals.md`
(the four-state key table and why refusals name no detour), `references/library-example.md` (the
runnable API example), `references/tuning-knobs.md`, `references/files-detail.md` (long-form notes
on every script below), `references/cms-insertion.md` (both CMS mechanics in prose).

Scripts: `scripts/deliver.mjs` (`offerForms`, `materialise`, `copyTree`, `carriesMapKey`,
`mapKeyState`, `singleOwnedFile`, `exportDirFor`), `scripts/delivery-identity.mjs`
(`resolveDeliveryIdentity`, `deliveryDestinations`, `stableDeliveryId`),
`scripts/delivery-compat-v1.mjs` (the legacy v1 adapter), `scripts/output-review.mjs` (render-tree
digest, versioned review/QA gate), `scripts/delivery-replacement.mjs` (locking, journal, manifest,
restart reconciliation), `scripts/another-format.mjs` (`otherFormatsFor`, `recordFormatAnswer`,
`deliveryClosed`, `PRODUCIBLE_FORMATS`), `scripts/other-subjects.mjs` (`recordSurveyedSubjects`,
`otherSubjectsFor`, `recordSubjectAnswer`), `scripts/deploy-embed.mjs` (the Cloudflare direct-upload
sequence), `scripts/hosted-deployment.mjs` (deployment-key derivation, operation records),
`scripts/cms-insert.mjs` (`buildInsertion`, `assertNotPartialReplace` — no network code),
`scripts/format-handover.mjs` (`formatHandover`, the `LIVE_TILES` copy table),
`scripts/journalist-language.mjs` (`resolveScaffoldLanguage`, `SCAFFOLD_LANGUAGES`),
`scripts/story-index.mjs` (`VISUALS.md`, one file per story saying what was made and where),
`scripts/finding-severity.mjs` (`severityOf`, `blockingGap`).

Tests: `test/deliver.test.ts`, `test/delivery-identity.test.ts`, `test/another-format.test.ts`,
`test/other-subjects.test.ts`, `test/refusals-name-no-detour.test.ts`, `test/deploy-embed.test.ts`,
`test/cms-insert.test.ts` — coverage detail in `references/files-detail.md`.

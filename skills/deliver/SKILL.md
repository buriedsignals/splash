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

| Layer | File | Role |
| --- | --- | --- |
| Delivery identity | `scripts/delivery-identity.mjs` — `resolveDeliveryIdentity`, `deliveryDestinations`, `stableDeliveryId` | Canonicalizes the declared stories root and every relevant source/export ancestor, validates stable story/output IDs, and derives the only legal source and replacement paths |
| Legacy compatibility | `scripts/delivery-compat-v1.mjs` — `offerFormsLegacyV1`, `materialiseLegacyV1`, `LEGACY_DELIVERY_ADAPTER_VERSION` | Preserves the observed path-shaped v1 call contract while validating and discarding its paths before delegating to the canonical ID API |
| Menu | `scripts/deliver.mjs` — `FORMS_BY_FORMAT`, `offerForms` | The forms one format allows, and what each honestly gives; validates the bound output review (Gate 3 before Gate 4) and keeps `embed` visible but disabled with a setup reason when no Cloudflare credential is present. The form is labelled **Deploy and receive embed code**; Cloudflare is its automatic mechanism, never a separate journalist question |
| Review gate | `scripts/output-review.mjs` — `writeOutputReview`, `requireApprovedOutput`, `renderDigest` | Versioned `OUTPUT-REVIEW.json`; binds approval and passing QA to the output ID, exact rendered tree, plan version, and finding IDs |
| Materialiser | `scripts/deliver.mjs` — `materialise`, `copyTree`, `singleOwnedFile`, `ownedFileForInsertion` | Independently re-checks the same bound review before and after staging, derives the per-output export from the trusted identity, builds the complete chosen form in private staging, then replaces the previous export. `ownedFileForInsertion` decides WHICH rendered file an insertion carries, per format, including static beats with both PNG and SVG |
| Replacement | `scripts/delivery-replacement.mjs` — `withDeliveryLock`, `publishStagedDelivery`, `reconcileDeliveryReplacement` | Serializes same-output delivery, journals both publication renames, records the complete new export, and reconciles an interrupted replacement before another begins |
| The key | `scripts/deliver.mjs` — `carriesMapKey`, `substituteKeys`, `mapKeyState` | Ruling R1b: the real MapTiler key enters the file at delivery and nowhere earlier — and only for an artifact that actually carries the key slot (`carriesMapKey` reads the file, not the environment). `mapKeyState` names WHICH key went in; nothing here refuses |
| Per-output export | `scripts/deliver.mjs` — `exportDirFor`, the `.delivered-from` receipt | Each stable output ID delivers into `export/<outputId>/`; the destination is derived rather than accepted from the caller |
| Hand-over | `scripts/format-handover.mjs` — `formatHandover` | `export/<outputId>/HANDOVER.md`, **G4** — not an option: `materialise` refuses a delivery with no payload to read back. each delivered file with its role, the placement read back, the alt text, the credit line, the caveat. A CLOSED parameter set — there is no free-text field, and adding one is what this file exists to prevent — and it **throws** on any string naming one of our own paths or modules, so a maintainer-facing sentence cannot reach the journalist. A defect in this toolchain goes to `stories/<slug>/NOTES-FOR-MAINTAINER.md` |
| The language it is written in | `scripts/journalist-language.mjs` — `resolveScaffoldLanguage`, `untranslatedNotice` | Ruling R4: the journalist's language follows the ARTICLE and is confirmed with them, so it is READ from `STORYBOARD.md`'s `language:` field — never detected from the prose, never defaulted. Every journalist-facing document this skill writes (the hand-over, both halves of the closing offer) is rendered from a copy table keyed by language. `en` and `fr` are written today; any other recorded language gets the English scaffold **and a line at the top of the document saying so** |
| The other formats | `scripts/another-format.mjs` — `otherFormatsFor`, `formatAnotherFormatOffer`, `recordFormatAnswer`, `deliveryClosed` | After the delivery: which other formats this beat could be produced in, filtered by what is producible, what the capability allows and what the journalist says does not suit it. The answer — taken or declined — is a fact on disk |
| The other subjects | `scripts/other-subjects.mjs` — `recordSurveyedSubjects`, `otherSubjectsFor`, `formatSubjectOffer`, `recordSubjectAnswer` | The article's own other angles, written at the proposal into `stories/<slug>/SUBJECTS.md` and RE-CHECKED at the end of the run — drawn, closed, unreachable, or still worth offering |
| Hosted embed mechanism | `scripts/deploy-embed.mjs` — `cloudflareProjectName`, `deployFile`, `resolveCloudflareCredentials`, `contentTypeFor`; `scripts/hosted-deployment.mjs` — stable operation key and schema-v1 record | The real Cloudflare Pages direct-upload sequence — one deterministic project per story output, a stable project URL across approved revisions, the immutable deployment URL retained for diagnosis, and reconciliation after an ambiguous response or local publication failure (see "How it works") |
| CMS insertion mechanism | `scripts/cms-insert.mjs` — `buildInsertion`, `assertNotPartialReplace` | Builds the We.Publish/Livingdocs mutation shape and the partial-article guard — pure, no network, UNPROVEN against a live CMS |
| CMS doctrine | `references/cms-insertion.md` | Both mechanics in prose — We.Publish's `updateArticle` is total, Livingdocs' `insertComponent` is a genuine insertion — and what remains untested |

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
   fetchFn, cms, handover})`** validates
   the **`{form, format}` pair** against `FORMS_BY_FORMAT[format][form]` — the same table `offerForms`
   reads, so "not an offered form" can never drift from what was actually offered, and a form id
   that happens to exist under one format is never accepted for a different format just because the
   id matches. It independently validates the same bound review, validates `handover`, derives both
   source and the one legal `export/<outputId>/` destination from the declared trust root and IDs,
   and rejects traversal or symlinked ancestors. It rejects `beatDir` and `exportDir` fields on the
   canonical API. Under a per-output filesystem lock,
   it first reconciles any prior journal, then checks the review again after staging so a render or
   review changed during the build cannot be published. Publication records a complete manifest,
   journals the old-export and new-export renames, and retains cleanup state if removing the backup
   fails. Only a successful build and hand-over replace the previous export; ordinary failures
   remove staging and preserve the last good delivery. Inside staging it writes the beat's receipt
   and:
   - `"owned-file"` copies every entry of `<beatDir>/renders/` into `exportDir`, walking any
     subdirectory with `copyTree` rather than handing a directory straight to `copyFile` (which
     throws on it).
   - `"source-bundle"` copies every entry of `beatDir` *except* `renders/` (the raster output
     belongs to the other form, not this one) into `exportDir`, then writes a real `build.ts`
     — a script that finds the copied `.tsx` files and bundles them with `Bun.build`, the
     bundler built into the Bun runtime itself, no added dependency — and a `package.json`
     naming it as the `build` script. `bun install && bun run build` in the delivered folder
     genuinely executes; it bundles the component source it was actually given, not a
     rebuild of the raster pipeline that made the owned PNG/SVG (that pipeline lives in the
     chart-beat skill, and copying it here would be exactly the shared-utility coupling this
     codebase's skills avoid).
   - **`"embed"` — implemented; live verification is credential-gated.** Requires both Cloudflare
     env vars (throws naming which is missing if a caller bypasses `offerForms`'s disabled row).
     Requires `<beatDir>/renders/` to hold exactly one file (`singleOwnedFile` — ambiguity is
     refused, not guessed at) and deploys it, via `scripts/deploy-embed.mjs`'s `deployFile`, to a
     deterministic per-installation/per-output Cloudflare Pages project. The first hosted delivery
     persists `stories/.splash-instance-id`; `cloudflareProjectName(instanceId, storyId, outputId)`
     includes it so separate Splash roots cannot collide on common slugs. This is automatic and
     local; the journalist is never asked
     to name a project or choose a hosting provider. It uses a
     project-create request when needed, followed by the direct-upload sequence (`upload-token` →
     `check-missing` → conditional `upload` → `deployments`, matched against Wrangler's own source
     — no wrangler, no build step, no framework). Every request and response-body read has a
     15-second deadline. Before the final
     request, it persists a schema-v1 operation record and sends its stable key as Cloudflare's
     `commit_hash`. If the response is lost, the next call lists deployments and matches that key;
     if the remote deployment succeeded but local replacement failed, the next call reuses it.
     It never posts again while the remote result remains ambiguous. Deterministic tests retain the
     request, timeout, reconciliation, stable-alias, and replacement contracts. A current live
     two-revision Cloudflare smoke remains required before release claims provider-backed proof.
     `exportDir` receives `EMBED_URL.txt` with the stable project URL, `EMBED_CODE.html` with the
     iframe snippet to paste into a CMS, and `DEPLOYMENT.json`, which links that public URL and the
     immutable deployment URL and Splash instance ID back to `beats/<outputId>/` and the current rendered artifact.
     `HANDOVER.md` explains each file. An approved revision rematerialised for the same output
     deploys to the same project, so existing embeds keep their address while the deployment
     receipt records the new immutable version. Splash also publishes the article-page companion
     script to one deterministic Pages project per Cloudflare account and references that absolute
     URL from `EMBED_CODE.html`; ordinary browsers load it automatically. Preflight exposes the
     exact URL as an optional CSP/script-blocker allow-list value. `SPLASH_SCROLLER_URL` may still
     override the emitted URL without preventing Splash from maintaining its canonical hosted copy.
   - **`"cms-insertion"` — UNPROVEN.** Reads the same single owned file, builds a mutation payload
     with `scripts/cms-insert.mjs`'s `buildInsertion` (`kind: "we-publish"` by default, or the
     caller's own `cms` object), and writes it to `exportDir/CMS-INSERTION.md` — nothing is sent
     over a network; this form makes zero HTTP calls. The document itself says, in its own first
     line, that it has never been sent to a real CMS. `buildInsertion`'s `we-publish` shape runs
     `assertNotPartialReplace` unconditionally before returning — the guard that matters, proven by
     a real test suite, not by a live call: We.Publish's `updateArticle` rewrites the ENTIRE
     article, so a mutation that would drop any part of the article it read is refused before it is
     ever built, let alone sent. `references/cms-insertion.md` documents both CMS mechanics in
     prose and states plainly what remains untested.
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

6. **`otherFormatsFor({medium, deliveredFormat, capabilities, notSuited, language})` — the offer the
   run used to end without.** The owner delivered an interactive web chart and was never asked whether he also
   wanted it as a still for print or a video for a feed: *"À la toute fin il ne me propose pas
   d'exporter sous un autre format si jamais."* This names the formats the SAME beat could also be
   produced in — never the one just delivered — with what each is for and what it costs in time.
   Three filters run before a format is named, so the offer is never a menu of everything the
   toolchain can do in the abstract: the pair must be **producible** for this medium (an image beat
   is never offered video), the medium's **capability** must be open (`capabilityGap`, the same
   verdict the storyboard's format gate consults — a capability shut for want of a key is shown as
   unavailable **with what would open it**, not offered), and the beat's own claim must survive the
   format (`notSuited`, an editorial input, each entry carrying its reason).

   **Taking one records a request; it does not schedule or start production.** The receipt closes
   the offer and nothing more. If the newsroom later starts a new output in that format, it follows
   the gates that apply to that format; this skill and `whereIs` do not create that continuation.

   **Declining is a recorded answer.** `materialise` writes `.another-format` as `pending` the moment
   a beat is delivered, `recordFormatAnswer` replaces it with `declined` or `taken <format>`, and
   `deliveryClosed(exportDir)` reports `{closed, missing}` — so "the run never made the offer" is a
   state that can be SEEN, in the same shape `whereIs` reports a phase, rather than a habit that can
   be forgotten. (The story-level gate does not consult it yet; that wiring belongs to `where.mjs`,
   which another chantier owns.)

7. **`otherSubjectsFor({storyDir, capabilities})` — the other half of the same closing offer.** The
   owner, after the format offer: *"Ou même le relancer sur des sous-sujets de son article qui
   seraient intéressants à transformer en visuel."* One article carries several things worth drawing.

   **The material is not re-derived — it is carried.** At the proposal the exchange surveys
   everything that could be made of this article (movement ④), proposes materially different ways of
   seeing it, checks each is reachable, and the journalist drops all but one. Those dropped angles
   ARE the sub-subjects: already found, already grounded, already checked. They used to live in a
   conversation and die with it. `recordSurveyedSubjects` writes them at the end of the proposal
   into **`stories/<slug>/SUBJECTS.md`** — the STORY's directory, not a beat's, because a sub-subject
   belongs to the article and has no beat of its own until somebody asks for one.

   **Re-checked, never trusted.** A stored `reachable: yes` is a verdict about an hour ago.
   `otherSubjectsFor` runs the same checks the format offer runs — the medium's capability now, the
   producible pair now — and marks an angle whose beat now exists as `drawn`. Only `offered` rows
   reach the journalist.

   **What they read is what their READER would learn**, in their own words, not a list of chart
   types. **Taking one starts a new beat in this story**, from its first phase — never a shortcut
   into production — with its own `export/<outputId>/`, leaving the delivered beat untouched.
   **Declining is an answer, and so is `none`**: an article that yielded nothing else says so
   plainly, and the run closes. Inventing a second-rate angle to fill the offer is the failure that
   case exists to prevent.

### The MapTiler key — the ARTIFACT decides, never the environment

A map × web beat renders with a documented placeholder where its MapTiler key belongs, and
`substituteKeys` puts the real key in at delivery and nowhere earlier (ruling R1b: every beat commits
its own HTML, so a key in a rendered file is a key in the repository).

**`carriesMapKey(html)` is asked first, and it reads the FILE.** An artifact with no key slot is not
a map delivery: it is copied through untouched, and nothing about MapTiler is decided, said or
refused for it. This was measured the hard way — in the owner's own run the delivery step refused an
HTML beat that was not a map at all (zero occurrences of `maptiler`, no key slot in the file), purely
because a `MAPTILER_KEY` sat in the environment. A rule that fires where it cannot be protecting
anything teaches its reader to route around it, and that is exactly what the run then did.

**It recommends; it does not block.** For an artifact that DOES carry the slot, `mapKeyState` names
one of four states and `substituteKeys` puts the best available key in — there is **no refusal left
in this path**:

| state | what happens | what the hand-over says |
| --- | --- | --- |
| `none` | no key slot in the file; nothing is substituted | nothing — it is not a map delivery |
| `restricted` | `MAPTILER_DELIVERY_KEY` goes in | the live map's key is restricted to the newsroom's own domains |
| `development` | `MAPTILER_KEY` goes in | the page carries a development key: readable by any reader, billed by usage, and MapTiler switches off **every** key on an account at 100% of its spending limit — plus how to record a restricted one |
| `unkeyed` | the placeholder travels through | the page shows its baked map layer; it does not pan or zoom |

The `development` row used to **throw**, which is stricter than the ruling that governs it. R1: *"la
carte doit rester interactive tout le temps… On a le droit d'utiliser pleinement MapTiler. Et garder
l'export du HTML pas grave pour la clé."* The owner accepted, having been shown the cost, that the
delivered HTML carries the key. R1b's clause 4 says the delivered key *should* be a second,
origin-restricted one — a recommendation, and a hard block turned it into a wall a journalist could
not deliver their own work past. The recommendation is now actually MADE, in the file the newsroom
keeps: `formatHandover` renders it from a **closed** four-state vocabulary (an unknown state throws
rather than silently saying nothing), so it can never be forgotten and can never become free text.

### A refusal states the situation. It never names a way around itself.

Every refusal in this path — and there are twenty — stops and informs, and nothing more. It says what
happened and what the situation is; it does not offer a second route to the same delivery.

That is not a style note. The refusal this skill used to raise over the MapTiler key ended with *"…or
unset `MAPTILER_KEY` for this delivery and the page will ship its complete fallback layer"*, and in
the owner's run the model read it, took that route, and said so: *"Je livre par la voie que le refus
lui-même désigne."* A gate that supplies its own bypass is not a gate — it is a suggestion with extra
steps, and the next reader is always in a hurry.

Two things that are NOT this, because the line is fine: restating the CONDITION the gate waits on
("this beat has not been approved yet — show it first") closes the gate rather than going round it,
and naming the CORRECT API ("each output ID derives its own export directory") is where
the work belongs, not a way to skip a check. The offence is specifically *this refusal stands, and
here is how to get the artifact out anyway*. `test/refusals-name-no-detour.test.ts` triggers every
refusal in this path for real, reads the four scripts' `throw`s statically as well, and reddens on
all three shapes the offer usually takes.

**Say it in the conversation too, in the journalist's own terms**, at the moment the delivery lands:
which key their page carries and what it costs them. Never as a refusal, never with a route around
one — the state is a fact about their file, and the decision to create a restricted key is theirs.

## Library and compatibility example

The example below documents the pure offer/materialisation API used by tests and older textual
flows. In a managed installation, keep the offer and human gate, then send the confirmed structured
request through Engine for any key-bearing form; never populate `env` from a checkout `.env`.

```js
import { offerForms, materialise, exportDirFor } from "./scripts/deliver.mjs";

// Read these from the current production plan. OUTPUT-REVIEW.json and its passing QA run must
// match them and the exact current renders/ digest: Gate 3 closes before Gate 4 opens.
const planVersion = 3;
const findingIds = ["finding-rainfall-change"];
const identity = {
  storiesRoot: "stories",
  storyId: "water-wars",
  outputId: "1-rainfall",
};
const forms = offerForms({
  ...identity,
  medium: "chart",
  format: "web",
  planVersion,
  findingIds,
});
// present `forms` (id, label, gives, available, reason) to the journalist here, and wait for an
// available choice. "embed" remains visible with available:false and setup guidance until Engine
// reports that the Cloudflare account and broker-backed token are ready.

const written = await materialise({
  ...identity,
  form: chosenId, // must be one of forms[*].id
  format: "web", // the same format offerForms was called with
  planVersion,
  findingIds,
  handover: {
    language: "en",
    placement: "After the paragraph that introduces the rainfall trend",
    alt: "Annual rainfall falls across the four measured winters",
    credit: "Source: newsroom rainfall analysis",
    caveat: "Four winters are a short comparison window",
  },
});
const exportDir = exportDirFor(identity); // informational; materialise derives this itself
// `written` names exactly what left the beat directory — nothing more. For "embed" this includes
// `EMBED_URL.txt`, `EMBED_CODE.html`, `DEPLOYMENT.json`, and `HANDOVER.md`; for
// "cms-insertion" it is `CMS-INSERTION.md` plus the hand-over.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many formats this skill knows how to deliver | `4` (`"static"`, `"web"`, `"video"`, `"scrolly"` — everything else throws, in both `offerForms` and `materialise`) | `FORMS_BY_FORMAT` |
| How many forms each known format offers | `3` for `"static"`/`"video"` (`owned-file`, `cms-insertion`, `source-bundle`); `4` for `"web"` and `"scrolly"` (adds `embed`) | `FORMS_BY_FORMAT` |
| Which rendered file an insertion carries, per format | `{static: [".svg", ".png"], web: [".html"], scrolly: [".html"], video: [".mp4"]}` — first extension with exactly one match wins | `INSERTION_PREFERENCE`, `scripts/deliver.mjs` |
| Shortest a `gives` description may read before the choice counts as uninformed | `5` words (`split(/\s+/).length > 4`, tested) | `FORMS_BY_FORMAT` entries |
| Which subdirectory of a beat never travels into the source-bundle form | `1` (`"renders"` — the other form's output) | `materialise` |
| What establishes delivery's filesystem trust boundary | Schema v1 `{storiesRoot, storyId, outputId}`; the IDs are single segments and every relevant ancestor is canonicalized against the root | `DELIVERY_IDENTITY_SCHEMA_VERSION`, `scripts/delivery-identity.mjs` |
| Which path-shaped caller contract is retained | Legacy adapter v1; it validates and discards `beatDir`/`exportDir` before delegation | `LEGACY_DELIVERY_ADAPTER_VERSION`, `scripts/delivery-compat-v1.mjs` |
| Where an output's delivery lands | `<storiesRoot>/<storyId>/export/<outputId>/` — derived internally, never supplied to `materialise` | `exportDirFor`, `scripts/deliver.mjs` |
| What makes an artifact a MAP delivery, for the key rule | `1` string — the key slot the renderer leaves in the file (`carriesMapKey`). Nothing about the environment, the format or the medium enters that decision | `MAP_KEY_PLACEHOLDER`, `scripts/deliver.mjs` |
| What names the output a delivery came from | `1` file, `.delivered-from` — read before replacement, so a mismatched output is refused | `DELIVERY_RECEIPT`, `scripts/deliver.mjs` |
| What makes an interrupted replacement recoverable | A schema-v1 sibling journal plus `.delivery-manifest.json`; a per-output lock serializes calls and stale dead-process locks are reclaimed | `scripts/delivery-replacement.mjs` |
| How many files `renders/` may hold for "embed" or "cms-insertion" to accept it | `1` — more is refused as ambiguous, not guessed at | `singleOwnedFile` |
| What binds Gate 3 to the artifact | `OUTPUT-REVIEW.json` schema v1 plus a matching QA run; both bind output ID, SHA-256 render-tree digest, plan version, and finding IDs | `scripts/output-review.mjs` |
| Which Cloudflare Pages project a beat's embed lands in | One deterministic, length-bounded project derived from `{storyId, outputId}`; rerunning the same output retains its stable `*.pages.dev` URL | `cloudflareProjectName`, `scripts/deploy-embed.mjs` |
| Which URL a newsroom may whitelist for scrollytelling assistance | One deterministic `https://splash-scroller-<account-hash>.pages.dev` URL per Cloudflare account; Splash publishes it automatically on hosted delivery | `cloudflareScrollerProjectName`, `cloudflareScrollerUrl`, `scripts/deploy-embed.mjs` |
| How long a Cloudflare request, including its response body, may remain unresolved | `15,000ms` (override with `materialise`'s `hostedRequestTimeoutMs`) | `scripts/deploy-embed.mjs`, `DEFAULT_REQUEST_TIMEOUT_MS` |
| Which formats a medium can also be produced in, after its first delivery | `chart`/`map` → 4 each, `image` → 2 (an absent pair is never offered) | `PRODUCIBLE_FORMATS`, `scripts/another-format.mjs` |
| What answers close a delivery | `2` — `declined` and `taken <format>`; `pending` is what `materialise` writes and what `deliveryClosed` refuses to call closed | `recordFormatAnswer`, `scripts/another-format.mjs` |
| Where the article's other angles are kept | `1` file, `SUBJECTS.md`, in the STORY's own directory — never a beat's | `SUBJECTS_FILE`, `scripts/other-subjects.mjs` |
| Shortest a subject's own reason may read before it counts as a name rather than a reason | `5` words | `validateSubject`, `scripts/other-subjects.mjs` |
| What answers close the subject half | `3` — `declined`, `taken <id>`, and `none` for an article that carried nothing else | `recordSubjectAnswer`, `scripts/other-subjects.mjs` |
| How many live-tile states a delivery can be in | `4` (`none`, `restricted`, `development`, `unkeyed`) — an unknown one throws in the hand-over rather than saying nothing | `LIVE_TILE_STATES`, `scripts/deliver.mjs` |
| What each of those states says to the journalist | `4` paragraph blocks, one per state, `none` being silence — **in each language the delivery is written in**, and a state present in one table and missing from another is refused rather than silently dropped | `LIVE_TILES`, `scripts/format-handover.mjs` |
| How many languages a delivery can be WRITTEN in | `2` (`en`, `fr`) — any other recorded language gets the English scaffold plus a line saying so; a missing one throws | `SCAFFOLD_LANGUAGES`, `scripts/journalist-language.mjs` |
| Which CMS kind `cms-insertion` demonstrates when the caller supplies none | `"we-publish"` (override with `materialise`'s own `cms` object) | `materialise`'s `"cms-insertion"` branch |

## Files

- `scripts/format-handover.mjs` — `formatHandover`, which renders `export/HANDOVER.md` from a
  closed parameter set. Every input is already recorded elsewhere: `placement` and `credit` are
  hand fields 4 and 5, the caveat is `limits`, the alt is in the component, the `language` is the
  storyboard's own field. `LIVE_TILES` is the four-state vocabulary that says which MapTiler key
  the delivered page carries and what it costs — an enum, never a sentence a caller writes — held
  per language, like every other sentence in the document.
- `scripts/journalist-language.mjs` — `resolveScaffoldLanguage`, `untranslatedNotice` and
  `SCAFFOLD_LANGUAGES`: the one reading of what language a delivery is written in, and the one
  decision about a language it is not written in (English, with the fallback stated in the document
  rather than discovered by the reader).
- `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its recursive helper),
  `carriesMapKey` and `mapKeyState` (the key question, asked of the artifact),
  `singleOwnedFile` (the one-file guard `embed`/`cms-insertion` share), `exportDirFor` (the one
  directory an output delivers into), and the `BUILD_SCRIPT` template written into every
  `source-bundle` delivery.
- `scripts/delivery-identity.mjs` — `resolveDeliveryIdentity`, `deliveryDestinations`,
  `stableDeliveryId`, and `DELIVERY_IDENTITY_SCHEMA_VERSION`: the explicit stories-root boundary,
  stable IDs, canonical ancestor checks, and derived source/export paths.
- `scripts/delivery-compat-v1.mjs` — `offerFormsLegacyV1`, `materialiseLegacyV1`,
  `exportDirForLegacyV1`, and `LEGACY_DELIVERY_ADAPTER_VERSION`: the retained old call shape,
  validated against the explicit root and converted to IDs without using its destination path.
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
- `scripts/deploy-embed.mjs` — `cloudflareProjectName`, `deployFile`,
  `resolveCloudflareCredentials`, `contentTypeFor`, the bounded Cloudflare Pages call sequence,
  stable per-output project URL, and reconciliation by stable `commit_hash`.
- `scripts/hosted-deployment.mjs` — stable deployment-key derivation, schema-v1 operation records,
  atomic state updates, and the remote-complete/local-complete boundary.
- `scripts/cms-insert.mjs` — `buildInsertion`, `assertNotPartialReplace`, `CMS_KINDS`. No network
  code anywhere in this file.
- `references/cms-insertion.md` — both CMS mechanics in prose, and what remains untested.
- `test/deliver.test.ts` — `bun:test` coverage: what each form offers and describes, that
  `offerForms` itself refuses an unknown format, that only the chosen form's files land in
  `exportDir`, that a nested subdirectory (two levels deep for `source-bundle`, one level for
  `owned-file`) is walked rather than crashing `copyFile`, that a second choice clears the
  first's files, that an unoffered form — including a form id that is real for a *different*
  format — is refused without touching a delivery already made, that the shipped `build.ts` is run
  for real (`bun run build`, via the bundle's own `package.json`) and produces a bundled file, not
  just a promise, that `embed` is offered/withheld correctly across every combination of the two
  Cloudflare env vars, and that `materialise` for `embed` writes the URL, iframe, deployment receipt
  and hand-over while `cms-insertion` writes its payload and hand-over, refuses source ambiguity,
  and — for `cms-insertion` — makes zero network calls. Its
  "a story has more than one beat" block is the two-beat fixture nothing here had: it delivers two
  approved beats and asserts the first one's files survive the second's delivery.
- `test/delivery-identity.test.ts` — canonical root/ID derivation, traversal and symlink refusals,
  rejection of path fields on the canonical API, and the versioned legacy fixture proving a valid
  old call still works while an alternate recursive replacement target remains untouched.
- `test/another-format.test.ts` — the offer's three filters, the reason a withholding must carry,
  the journalist-facing text asserted to name nothing of ours, the parity with the storyboard's
  catalogue, and the fixture the run would have failed: a beat that has been DELIVERED is not closed
  until the offer has been answered, and declining closes it as cleanly as taking.
- `test/other-subjects.test.ts` — the record written and read back, every angle re-checked (drawn ·
  capability closed since · no producer), the journalist-facing text asserted to name nothing of
  ours and no reason anything was filtered out, the honest empty case, and the fixture the run would
  have failed: several angles found, one delivered, nothing offered at the end. Its last block
  exercises two beats in one story for real — the second beat delivers into its own directory and
  the first one's delivery survives.
- `test/refusals-name-no-detour.test.ts` — every refusal in this path, triggered for real and read
  from the source, asserted to name no alternative delivery route; plus the historical sentence the
  run followed, kept as the proof the detector can see the defect it was written for.
- `test/deploy-embed.test.ts` — the Cloudflare direct-upload sequence against a fake of the real
  API (project creation plus the upload calls in order, an already-existing project treated as success, a real failure
  surfaced with Cloudflare's own message), hard request/body deadlines, unreadable 5xx handling,
  and lost-response reconciliation without a duplicate POST; plus
  `contentTypeFor`/`resolveCloudflareCredentials`.
  No current live-provider claim is inferred from those fakes; a credential-gated release smoke is
  tracked separately rather than spending real deploys on every `bun test`.
- `test/cms-insert.test.ts` — both mutation shapes, and `assertNotPartialReplace` proven against
  an append, a mid-article marker insertion, a silently-dropped paragraph (refused), and an
  altered-not-just-extended body (refused).

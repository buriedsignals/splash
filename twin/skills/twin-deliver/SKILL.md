---
name: twin-deliver
description: Use to run the DELIVERY phase of the doctrine twin — offer the journalist the forms their beat's genre allows, wait for the choice, and materialise only that one. Never builds a form nobody asked for.
---

# twin-deliver — offer, wait, build the one that was chosen

## Overview

Runs the DELIVERY phase: the last step of a beat's life, after a still has already been
rendered into `<beatDir>/renders/`. `offerForms({medium, genre, beatDir, env})` names the delivery forms a
beat's genre allows, each with a plain-language `gives` so the choice is informed. Nothing is
built at this point — `offerForms` only lists what could be built. `materialise({form, genre,
beatDir, exportDir, env, fetchFn, projectName, cms})` is the only function that writes anything,
and it writes exactly one form: the one named in `form`, for the `genre` actually given, nothing
else, into `exportDir`.

**Four forms exist now, not two.** `owned-file` and `source-bundle` are files the newsroom keeps —
every genre offers both. `embed` (a live Cloudflare Pages URL) and `cms-insertion` (a prepared
insertion payload for We.Publish or Livingdocs) are NOT owned files — the newsroom gets a URL or a
document, never a copy — and both are wired to the two genres that ship a single self-contained
HTML page, "web" and "scrolly", which is exactly what each needs. **`embed` is real and proven**: a live
deployment, fetched back byte-identical to what was sent (see "How it works" below). **`cms-insertion`
is NOT proven against a live CMS** — no We.Publish or Livingdocs endpoint exists anywhere in this
toolchain to call. It builds and guards a real mutation payload, documents it, and says so in the
document it writes. Read "How it works", step 3, before assuming either behaves like the other two.

**The forms are offered, then WAITED on. Silence is not a choice.** A conversation running this
phase presents the list `offerForms` returns and stops — it does not default to a form, does not
guess from context, does not materialise anything until the journalist names one. That reversal
is the whole point of this skill: `main`'s habit was to build every form up front, so the choice
(if it ever came) was a formality over files that already existed. Here the files do not exist
until the choice does.

## When to use

- At the end of a beat's production, once `<beatDir>/renders/` holds a still — call
  `offerForms` with the beat's medium, genre and directory, present the list, and wait. It throws
  if the beat has not been approved — show the render first.
- Once the journalist has named a form (its `id`, exactly), call `materialise` with that id, the
  *same* genre, the beat's directory, and the export directory. Nothing before that call.
- **Not** for production. This skill never renders a chart or a map — it only decides which
  already-rendered (or already-written) files leave the beat directory, and in what shape.

## The one gotcha that will waste your day (read first)

**A second choice is not additive.** If a journalist materialises `owned-file` and then changes
their mind and materialises `source-bundle` into the same `exportDir`, the first form's files do
not linger. `materialise` clears `exportDir` before writing, every call, so the directory always
holds exactly the most recently chosen form — never a mix of two. That clearing happens *after*
`{form, genre}` is validated as a pair, in that order deliberately: a refused, unoffered
`form` (see `materialise` refusing `"embed"`, or `"owned-file"` under a genre that never offered
it) must not destroy a form that was already delivered by a previous, valid call. Swap that
order and a bad second choice silently wipes out a good first one.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Menu | `scripts/deliver.mjs` — `FORMS_BY_GENRE`, `offerForms` | The forms one genre allows, and what each honestly gives; refuses before `beatDir/APPROVED.md` exists (Gate 3 before Gate 4) and filters `embed` out when no Cloudflare credential is present |
| Materialiser | `scripts/deliver.mjs` — `materialise`, `copyTree`, `singleOwnedFile`, `ownedFileForInsertion` | Writes exactly the chosen form's files into `exportDir`, walking any subdirectory a beat carries. `ownedFileForInsertion` decides WHICH rendered file an insertion carries, per genre, so a static beat's PNG-and-SVG pair stops reading as ambiguity |
| Hand-over | `scripts/format-handover.mjs` — `formatHandover` | `export/HANDOVER.md`: each delivered file with its role, the placement read back, the alt text, the credit line, the caveat. A CLOSED parameter set — there is no free-text field, and adding one is what this file exists to prevent |
| Hosted embed mechanism | `scripts/deploy-embed.mjs` — `deployFile`, `resolveCloudflareCredentials`, `contentTypeFor` | The real Cloudflare Pages direct-upload sequence — proven live, not merely coded (see "How it works") |
| CMS insertion mechanism | `scripts/cms-insert.mjs` — `buildInsertion`, `assertNotPartialReplace` | Builds the We.Publish/Livingdocs mutation shape and the partial-article guard — pure, no network, UNPROVEN against a live CMS |
| CMS doctrine | `references/cms-insertion.md` | Both mechanics in prose — We.Publish's `updateArticle` is total, Livingdocs' `insertComponent` is a genuine insertion — and what remains untested |

## How it works (the shape)

1. **`offerForms({medium, genre, beatDir, env = process.env})`** first refuses outright unless
   `beatDir/APPROVED.md` exists — **Gate 3 closes before Gate 4 opens.** Delivery cannot honestly be
   discussed before the journalist has seen the thing being delivered, and the forms are this
   function's own output: anything said about them before it runs is a guess. The run guessed twice,
   both times wrongly, once *inside* the Gate-3 approval question, and had to retract it. Then it
   looks `genre` up in `FORMS_BY_GENRE`. **Four** genres are known today —
   `"static"`, `"web"`, `"video"`, `"scrolly"` — any other genre throws rather than
   returning an empty or partial list, so a caller can never mistake "no forms for this genre yet"
   for "this beat has nothing to deliver". For a known genre it returns every form in that genre's
   table, in the same order every time, each carrying an `id`, a `label`, and a `gives` long enough
   to inform a real choice — **except** `embed`, which is silently dropped from the list whenever
   `resolveCloudflareCredentials(env)` finds `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN`
   missing. This is a PRESENCE check, not a live probe — `offerForms` stays synchronous and cheap
   to call on every turn; a present-but-wrong token still lists the form and fails loudly at
   `materialise` instead. A journalist with no Cloudflare account still sees every owned-file form
   their genre allows; the journey never crashes over a missing credential.
2. **The conversation presents the list and waits.** This skill's code stops here; the doctrine
   of waiting is enforced by the calling conversation, the same way `twin-storyboard` enforces
   its exchange in prose, not in code that could be skipped.
3. **`materialise({form, genre, beatDir, exportDir, env, fetchFn, projectName, cms})`** validates
   the **`{form, genre}` pair** against `FORMS_BY_GENRE[genre][form]` — the same table `offerForms`
   reads, so "not an offered form" can never drift from what was actually offered, and a form id
   that happens to exist under one genre is never accepted for a different genre just because the
   id matches. It then clears and recreates `exportDir` (the gotcha above), and:
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
   - **`"embed"` — real, proven.** Requires both Cloudflare env vars (throws naming which is
     missing if a caller reaches this branch without them, bypassing `offerForms`'s own filter).
     Requires `<beatDir>/renders/` to hold exactly one file (`singleOwnedFile` — ambiguity is
     refused, not guessed at) and deploys it, via `scripts/deploy-embed.mjs`'s `deployFile`, to a
     Cloudflare Pages project (`DEFAULT_PROJECT_NAME`, or the caller's own `projectName`) using a
     plain four-call direct-upload sequence (`upload-token` → `check-missing` → `upload` →
     `deployments`, matched by hand against Wrangler's own source — no wrangler, no build step, no
     framework). **This was run for real**, against the live API, through this exact function: a
     `twin-chart-web` seed render was deployed, and `curl`ing the returned URL back produced HTML
     byte-for-byte identical to the file that was sent (see the session's own report for the URL).
     `exportDir` receives one file, `EMBED_URL.txt`, holding the live URL — there is no local copy
     to own, the hosted page IS the delivery, the same shape the sibling engine uses for a hosted
     Datawrapper embed.
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
4. **`materialise` returns every path it wrote.** A caller that wants to confirm the delivery
   can list `written` without re-reading the directory.

## Quick start

```js
import { offerForms, materialise } from "./scripts/deliver.mjs";

// `beatDir` is REQUIRED, and its APPROVED.md must exist: Gate 3 closes before Gate 4 opens, so a
// form cannot be named before the journalist has seen the render.
const forms = offerForms({
  medium: "chart",
  genre: "web",
  beatDir: "stories/water-wars/beats/1-rainfall",
});
// present `forms` (id, label, gives) to the journalist here, and wait for a choice —
// do not call materialise until one comes back. "embed" is only in this list when
// CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are both set.

const written = await materialise({
  form: chosenId, // must be one of forms[*].id
  genre: "web", // the same genre offerForms was called with
  beatDir: "stories/water-wars/beats/1-rainfall",
  exportDir: "stories/water-wars/export",
});
// `written` names exactly what left the beat directory — nothing more. For "embed" this is
// `EMBED_URL.txt`; for "cms-insertion" it is `CMS-INSERTION.md`.
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many genres this skill knows how to deliver | `4` (`"static"`, `"web"`, `"video"`, `"scrolly"` — everything else throws, in both `offerForms` and `materialise`) | `FORMS_BY_GENRE` |
| How many forms each known genre offers | `3` for `"static"`/`"video"` (`owned-file`, `cms-insertion`, `source-bundle`); `4` for `"web"` and `"scrolly"` (adds `embed`) | `FORMS_BY_GENRE` |
| Which rendered file an insertion carries, per genre | `{static: [".svg", ".png"], web: [".html"], scrolly: [".html"], video: [".mp4"]}` — first extension with exactly one match wins | `INSERTION_PREFERENCE`, `scripts/deliver.mjs` |
| Shortest a `gives` description may read before the choice counts as uninformed | `5` words (`split(/\s+/).length > 4`, tested) | `FORMS_BY_GENRE` entries |
| Which subdirectory of a beat never travels into the source-bundle form | `1` (`"renders"` — the other form's output) | `materialise` |
| How many files `renders/` may hold for "embed" or "cms-insertion" to accept it | `1` — more is refused as ambiguous, not guessed at | `singleOwnedFile` |
| Which Cloudflare Pages project a beat's embed lands in by default | `"twin-deliver-proof"` (override with `materialise`'s own `projectName`) | `scripts/deploy-embed.mjs`, `DEFAULT_PROJECT_NAME` |
| Which CMS kind `cms-insertion` demonstrates when the caller supplies none | `"we-publish"` (override with `materialise`'s own `cms` object) | `materialise`'s `"cms-insertion"` branch |

## Files

- `scripts/format-handover.mjs` — `formatHandover`, which renders `export/HANDOVER.md` from a
  closed parameter set. Every input is already recorded elsewhere: `placement` and `credit` are
  hand fields 4 and 5, the caveat is `limits`, the alt is in the component.
- `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its recursive helper),
  `singleOwnedFile` (the one-file guard `embed`/`cms-insertion` share), and the `BUILD_SCRIPT`
  template written into every `source-bundle` delivery.
- `scripts/deploy-embed.mjs` — `deployFile`, `resolveCloudflareCredentials`, `contentTypeFor`,
  and the header comment documenting the exact Cloudflare Pages call sequence, matched by hand
  against Wrangler's own source (`cloudflare/workers-sdk`) rather than guessed.
- `scripts/cms-insert.mjs` — `buildInsertion`, `assertNotPartialReplace`, `CMS_KINDS`. No network
  code anywhere in this file.
- `references/cms-insertion.md` — both CMS mechanics in prose, and what remains untested.
- `test/deliver.test.ts` — `bun:test` coverage: what each form offers and describes, that
  `offerForms` itself refuses an unknown genre, that only the chosen form's files land in
  `exportDir`, that a nested subdirectory (two levels deep for `source-bundle`, one level for
  `owned-file`) is walked rather than crashing `copyFile`, that a second choice clears the
  first's files, that an unoffered form — including a form id that is real for a *different*
  genre — is refused without touching a delivery already made, that the shipped `build.ts` is run
  for real (`bun run build`, via the bundle's own `package.json`) and produces a bundled file, not
  just a promise, that `embed` is offered/withheld correctly across every combination of the two
  Cloudflare env vars, and that `materialise` for `embed`/`cms-insertion` writes exactly one file
  each, refuses ambiguity, and — for `cms-insertion` — makes zero network calls.
- `test/deploy-embed.test.ts` — the Cloudflare direct-upload sequence against a fake of the real
  API (four calls in order, an already-existing project treated as success, a real failure
  surfaced with Cloudflare's own message) plus `contentTypeFor`/`resolveCloudflareCredentials`.
  The live sequence itself was proven separately, once, against the real API — this suite exists
  so that proof does not need to re-run, and cost real deploys, on every `bun test`.
- `test/cms-insert.test.ts` — both mutation shapes, and `assertNotPartialReplace` proven against
  an append, a mid-article marker insertion, a silently-dropped paragraph (refused), and an
  altered-not-just-extended body (refused).

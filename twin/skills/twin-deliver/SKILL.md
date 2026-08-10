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
document it writes. Since the installer, a journalist's own CMS choice and credentials DO have a
home — `CMS_KIND`, `CMS_ENDPOINT` and `CMS_TOKEN` in the root `.env`, written at `0600` through the
same `recordKey` path as every other secret, the kind checked against `CMS_KINDS` so nothing can be
recorded that `buildInsertion` would throw on. That changes where the answer lives and nothing else:
those three names are deliberately NOT probed (there is no instance to probe), they open no
capability row in `runPreflight`, and this form still writes a file describing the mutation rather
than sending it. A stored credential is not a proven integration. Read "How it works", step 3, before assuming either behaves like the other two.

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
- **Immediately after `materialise` returns**, and before the run ends: call `otherGenresFor` with
  the beat's medium and the genre just delivered, present `formatGenreOffer`'s text, and wait for an
  answer. `recordGenreAnswer` writes it. A delivery that has not been answered is not closed
  (`deliveryClosed`), and the receipt says so on disk.
- **Not** for production. This skill never renders a chart or a map — it only decides which
  already-rendered (or already-written) files leave the beat directory, and in what shape.

## The one gotcha that will waste your day (read first)

**A second choice is not additive — and that wipe must never cross a beat.** If a journalist
materialises `owned-file` and then changes their mind and materialises `source-bundle` into the same
`exportDir`, the first form's files do not linger. `materialise` clears `exportDir` before writing,
every call, so the directory always holds exactly the most recently chosen form — never a mix of two.
That clearing happens *after* `{form, genre}` is validated as a pair, in that order deliberately: a
refused, unoffered `form` (see `materialise` refusing `"embed"`, or `"owned-file"` under a genre that
never offered it) must not destroy a form that was already delivered by a previous, valid call. Swap
that order and a bad second choice silently wipes out a good first one.

**The other half of it, and it was live: a story has more than one beat.** With one story-level
`export/` shared by every beat, that same wipe reached ACROSS beats — delivering beat 2 destroyed
beat 1's delivered files, silently, at the last phase of the journey, and the second delivery
reported success. Nothing in this repository had ever put two beats in one story, so no test saw it.
Two things close it, and both are code rather than convention:

- **`exportDirFor(storyDir, beatName)`** is where a beat delivers: `export/<beat>/`. `whereIs` reads
  the same shape, so a beat with a non-empty `export/<beat>/` is a beat that has been delivered.
- **a `.delivered-from` receipt**, written into every export directory, naming the beat it came
  from. `materialise` reads it BEFORE the wipe and throws when it names a different beat, so a
  caller handing two beats the same directory is refused rather than obeyed. The receipt is a
  dotfile because `export/<beat>/` is a directory the journalist opens; it is never in `written`.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Menu | `scripts/deliver.mjs` — `FORMS_BY_GENRE`, `offerForms` | The forms one genre allows, and what each honestly gives; refuses before `beatDir/APPROVED.md` exists (Gate 3 before Gate 4) and filters `embed` out when no Cloudflare credential is present |
| Materialiser | `scripts/deliver.mjs` — `materialise`, `copyTree`, `singleOwnedFile`, `ownedFileForInsertion` | Writes exactly the chosen form's files into `exportDir`, walking any subdirectory a beat carries. `ownedFileForInsertion` decides WHICH rendered file an insertion carries, per genre, so a static beat's PNG-and-SVG pair stops reading as ambiguity |
| The key | `scripts/deliver.mjs` — `carriesMapKey`, `substituteKeys`, `mapKeyState` | Ruling R1b: the real MapTiler key enters the file at delivery and nowhere earlier — and only for an artifact that actually carries the key slot (`carriesMapKey` reads the file, not the environment). `mapKeyState` names WHICH key went in; nothing here refuses |
| Per-beat export | `scripts/deliver.mjs` — `exportDirFor`, the `.delivered-from` receipt | Each beat delivers into `export/<beat>/`, and `materialise` refuses to wipe a directory another beat already delivered into |
| Hand-over | `scripts/format-handover.mjs` — `formatHandover` | `export/<beat>/HANDOVER.md`, **G4** — not an option: `materialise` refuses a delivery with no payload to read back. each delivered file with its role, the placement read back, the alt text, the credit line, the caveat. A CLOSED parameter set — there is no free-text field, and adding one is what this file exists to prevent — and it **throws** on any string naming one of our own paths or modules, so a maintainer-facing sentence cannot reach the journalist. A defect in this toolchain goes to `stories/<slug>/NOTES-FOR-MAINTAINER.md` |
| The other genres | `scripts/another-genre.mjs` — `otherGenresFor`, `formatGenreOffer`, `recordGenreAnswer`, `deliveryClosed` | After the delivery: which other genres this beat could be produced in, filtered by what is producible, what the capability allows and what the journalist says does not suit it. The answer — taken or declined — is a fact on disk |
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
   id matches. It then refuses if `exportDir` already carries another beat's `.delivered-from`
   receipt, clears and recreates it (the gotcha above), writes this beat's own receipt, and:
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
4. **Every form closes into `export/<beat>/HANDOVER.md` — that is G4, and it is not optional.**
   `materialise` throws when the caller hands in no payload, rather than delivering files nobody was
   told what to do with. It used to return early instead, so every form worked without one and
   `whereIs` called the story done anyway — which is how the run delivered two filenames and two
   sizes, with no placement, no alt text and no credit line. Every input is already recorded during
   the exchange: placement and credit are hand fields 4 and 5, the alt is in the component, the
   caveat is `limits`. A caller with nothing to hand in has not read the storyboard back.
5. **`materialise` returns every path it wrote**, the hand-over included. A caller that wants to
   confirm the delivery can list `written` without re-reading the directory.

6. **`otherGenresFor({medium, deliveredGenre, capabilities, notSuited})` — the offer the run used to
   end without.** The owner delivered an interactive web chart and was never asked whether he also
   wanted it as a still for print or a video for a feed: *"À la toute fin il ne me propose pas
   d'exporter sous un autre genre si jamais."* This names the genres the SAME beat could also be
   produced in — never the one just delivered — with what each is for and what it costs in time.
   Three filters run before a genre is named, so the offer is never a menu of everything the
   toolchain can do in the abstract: the pair must be **producible** for this medium (an image beat
   is never offered video), the medium's **capability** must be open (`capabilityGap`, the same
   verdict the storyboard's genre gate consults — a capability shut for want of a key is shown as
   unavailable **with what would open it**, not offered), and the beat's own claim must survive the
   genre (`notSuited`, an editorial input, each entry carrying its reason).

   **Taking one means producing that beat again**, in that genre, with its own size, its own review
   and its own delivery form. It never means quietly emitting every artifact at once — the original
   Splash over-produced exactly that way and it was deliberately reversed.

   **Declining is a recorded answer.** `materialise` writes `.another-genre` as `pending` the moment
   a beat is delivered, `recordGenreAnswer` replaces it with `declined` or `taken <genre>`, and
   `deliveryClosed(exportDir)` reports `{closed, missing}` — so "the run never made the offer" is a
   state that can be SEEN, in the same shape `whereIs` reports a phase, rather than a habit that can
   be forgotten. (The story-level gate does not consult it yet; that wiring belongs to `where.mjs`,
   which another chantier owns.)

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
and naming the CORRECT api ("each beat delivers into its own `export/<beat>/` directory") is where
the work belongs, not a way to skip a check. The offence is specifically *this refusal stands, and
here is how to get the artifact out anyway*. `test/refusals-name-no-detour.test.ts` triggers every
refusal in this path for real, reads the four scripts' `throw`s statically as well, and reddens on
all three shapes the offer usually takes.

**Say it in the conversation too, in the journalist's own terms**, at the moment the delivery lands:
which key their page carries and what it costs them. Never as a refusal, never with a route around
one — the state is a fact about their file, and the decision to create a restricted key is theirs.

## Quick start

```js
import { offerForms, materialise, exportDirFor } from "./scripts/deliver.mjs";

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
  // ONE DIRECTORY PER BEAT. `exportDirFor` is the answer; handing two beats the same directory
  // throws rather than destroying the first one's delivery.
  exportDir: exportDirFor("stories/water-wars", "1-rainfall"),
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
| Where a beat's delivery lands | `export/<beat>/` — one directory per beat, never one per story | `exportDirFor`, `scripts/deliver.mjs` |
| What makes an artifact a MAP delivery, for the key rule | `1` string — the key slot the renderer leaves in the file (`carriesMapKey`). Nothing about the environment, the genre or the medium enters that decision | `MAP_KEY_PLACEHOLDER`, `scripts/deliver.mjs` |
| What names the beat a delivery came from | `1` file, `.delivered-from` — read before the wipe, so another beat's delivery is refused rather than destroyed | `DELIVERY_RECEIPT`, `scripts/deliver.mjs` |
| How many files `renders/` may hold for "embed" or "cms-insertion" to accept it | `1` — more is refused as ambiguous, not guessed at | `singleOwnedFile` |
| Which Cloudflare Pages project a beat's embed lands in by default | `"twin-deliver-proof"` (override with `materialise`'s own `projectName`) | `scripts/deploy-embed.mjs`, `DEFAULT_PROJECT_NAME` |
| Which genres a medium can also be produced in, after its first delivery | `chart`/`map` → 4 each, `image` → 2 (an absent pair is never offered) | `PRODUCIBLE_GENRES`, `scripts/another-genre.mjs` |
| What answers close a delivery | `2` — `declined` and `taken <genre>`; `pending` is what `materialise` writes and what `deliveryClosed` refuses to call closed | `recordGenreAnswer`, `scripts/another-genre.mjs` |
| How many live-tile states a delivery can be in | `4` (`none`, `restricted`, `development`, `unkeyed`) — an unknown one throws in the hand-over rather than saying nothing | `LIVE_TILE_STATES`, `scripts/deliver.mjs` |
| What each of those states says to the journalist | `4` paragraph blocks, one per state, `none` being silence | `LIVE_TILES`, `scripts/format-handover.mjs` |
| Which CMS kind `cms-insertion` demonstrates when the caller supplies none | `"we-publish"` (override with `materialise`'s own `cms` object) | `materialise`'s `"cms-insertion"` branch |

## Files

- `scripts/format-handover.mjs` — `formatHandover`, which renders `export/HANDOVER.md` from a
  closed parameter set. Every input is already recorded elsewhere: `placement` and `credit` are
  hand fields 4 and 5, the caveat is `limits`, the alt is in the component. `LIVE_TILES` is the
  four-state vocabulary that says which MapTiler key the delivered page carries and what it costs —
  an enum, never a sentence a caller writes.
- `scripts/deliver.mjs` — `offerForms`, `materialise`, `copyTree` (its recursive helper),
  `carriesMapKey` and `mapKeyState` (the key question, asked of the artifact),
  `singleOwnedFile` (the one-file guard `embed`/`cms-insertion` share), `exportDirFor` (the one
  directory a beat delivers into), and the `BUILD_SCRIPT` template written into every
  `source-bundle` delivery.
- `scripts/another-genre.mjs` — `otherGenresFor`, `formatGenreOffer`, `recordGenreAnswer`,
  `deliveryClosed`, and `PRODUCIBLE_GENRES`, this skill's own reading of which medium × genre pairs
  can be walked to a delivered export (a duplicate of the storyboard's catalogue, cross-checked by a
  test, never imported).
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
  each, refuses ambiguity, and — for `cms-insertion` — makes zero network calls. Its
  "a story has more than one beat" block is the two-beat fixture nothing here had: it delivers two
  approved beats and asserts the first one's files survive the second's delivery.
- `test/another-genre.test.ts` — the offer's three filters, the reason a withholding must carry,
  the journalist-facing text asserted to name nothing of ours, the parity with the storyboard's
  catalogue, and the fixture the run would have failed: a beat that has been DELIVERED is not closed
  until the offer has been answered, and declining closes it as cleanly as taking.
- `test/refusals-name-no-detour.test.ts` — every refusal in this path, triggered for real and read
  from the source, asserted to name no alternative delivery route; plus the historical sentence the
  run followed, kept as the proof the detector can see the defect it was written for.
- `test/deploy-embed.test.ts` — the Cloudflare direct-upload sequence against a fake of the real
  API (four calls in order, an already-existing project treated as success, a real failure
  surfaced with Cloudflare's own message) plus `contentTypeFor`/`resolveCloudflareCredentials`.
  The live sequence itself was proven separately, once, against the real API — this suite exists
  so that proof does not need to re-run, and cost real deploys, on every `bun test`.
- `test/cms-insert.test.ts` — both mutation shapes, and `assertNotPartialReplace` proven against
  an append, a mid-article marker insertion, a silently-dropped paragraph (refused), and an
  altered-not-just-extended body (refused).

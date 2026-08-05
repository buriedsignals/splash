---
name: splash-export
description: "Use as phase 6 of the splash flow: offer the delivery forms the pinned format allows, wait for the choice, and build only that one. Invoked by skills/splash at the EXPORT step, never directly by a journalist. Keywords export, gate 4, delivery form, source bundle, standalone html, embed, cms, hand over."
---

# splash-export — EXPORT — the journalist chooses the delivered form. Gate 4.

### 6. EXPORT — GATE 4 (delivery depends on the visual's format)

**★ State the PLACEMENT of each delivered element — WHERE it goes in the article. You RELAY it; you do
not compose it.** The export scripts emit the placement themselves, per element, between the markers
`SPLASH_PLACEMENT <proposalId>` and `END_SPLASH_PLACEMENT` (plus a machine `PLACEMENT_JSON` line for
anything that parses). **Relay it VERBATIM.** Do not rewrite those lines into your own sentence, do not
translate them, and do not assemble a placement from the proposal yourself — `skills/splash/src/placement.ts`
resolves it from the accepted entry and `export-code.mjs` prints it at every hand-over, so a hand-written
version can only drift from what the code decided.

Two things to carry when you relay. First, **the quote is what to trust** and the paragraph number is
only an indication: a journalist edits their piece between the analysis and the delivery, so §4 may have
become §5 while « les frontaliers de Bonneville » is still exactly where the visual belongs. Say it that
way round. Second, placement stays ADVISORY — the journalist does the final positioning.

On a multi-element hand-over, relay each element's own block, so a 3-visual article gets « le chart des
recettes → §2 ; la carte → §5 ; le scrolly → la fin », not one undifferentiated dump. Absent an anchor,
the emitted block says the element is free-standing — relay that too, and never invent a paragraph.

**★ The sign-off state is TOLD, never pasted.** The export scripts print the machine token
`EDITORIAL: unsigned — LLM render-approval only` (or `signed by …`, or `skipped …`) and, on the
next line, the same state as a sentence for a person — `SIGNOFF: …`, already in the journalist's
language (`lib/newsroom/ui-copy.ts`). Relay the `SIGNOFF:` line, never the `EDITORIAL:` one: the
INFORMATION matters at hand-over (nobody human has signed this off — the automatic checks are all
that stands behind it), the machine's phrasing of it does not.

**Delivery location — stable, never the scratchpad.** Write every hand-over (export folder, mp4, PNG) to
`exports/<slug>/` under the journalist's working directory (the splash project root), NOT the session
scratchpad — the scratchpad is temporary and gets cleaned, so the journalist would lose the deliverable
(and cannot find it). After delivering, print the file/folder's ABSOLUTE path. `export-code.mjs` refuses
(non-zero) if the export path looks ephemeral. The ship scripts also refuse unless the proposal is
`produced` AND render-approved (GATE 3 done) — pass the report + id so the gate can check. **If a ship
script exits non-zero (an ephemeral path, an unmet `assertDelivered` shape, a missing prerequisite), that
is a HARD STOP surfaced to the journalist — never worked around** by `mv`/`cp`-ing files into the shape a
gate expects, by hand-editing the export folder, or by a silent retry; fix the actual cause (re-run the
correct `--form` build, point the script at the file production emitted) and re-run the script (see Never).

Branch EXACTLY on the channel/format model (`skills/splash/src/channel.ts`) — **image and video hand
over the media directly, no delivery menu; only interactive gets a delivery choice, and only because
article-web is the one channel that can host it**:

- **VIDEO (mp4): splash PROPOSES three delivery forms and the journalist CHOOSES one** — the same
  two-phase, lazy shape as interactive/scrolly. Video used to be handed over as its file, full stop
  ("the media IS the deliverable"). That was true of what a video IS and mistaken for how it SHIPS:
  a journalist who wanted the film inside their article had no way to ask for it, though the CMS
  route existed and worked. The producer still renders **only the one aspect the channel requires**
  — social-vertical → **portrait 9:16** (1080×1920), social-feed → **square 1:1**, article-web →
  **landscape 16:9** — **one mp4, not three** (threaded via `SPLASH_CHANNEL`; a fail-hard
  produce-time conformance step refuses a render whose size ≠ the channel).
  1. **Phase 1 — emit the proposal (build NOTHING).** Run WITHOUT `--form`:
     `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results exports/<slug>/report.json --id <id>`.
     It emits `EXPORT_FORMS_JSON` + the human `EXPORT_FORMS_PROPOSAL` block. **Relay it VERBATIM and
     WAIT** — the same un-skippable gate as every other menu.
  2. **The three forms:**
     - **a) Le fichier vidéo** — the mp4 itself, the newsroom's to upload wherever it publishes.
       This is what a video always was, and it stays the plain answer.
     - **b) Embed (hébergé)** — publish the mp4 to the newsroom's own Cloudflare Pages project and
       share the URL. Key-fixable exactly like an interactive's embed form.
     - **c) Directement dans l'article (CMS)** — the film appears in one of the journalist's own
       articles. **It HOSTS the file first** (`hostsFirst: true` in the JSON): this CMS has no
       self-hosted mp4 block, so the article carries a player pointing at the hosted file. Two
       network steps, ONE journalist choice — the chaining is the script's job, never a second
       question. It obeys the same two rules as the interactive CMS form: **ask WHICH article**
       (`--article <slug>`, the placeholder is refused) and **SHOW WHERE and get the answer**
       (`--after <position|end>`, a missing flag is refused), and it is a DRAFT edit that publishes
       nothing.
  3. **THEN build + deliver ONLY the chosen form** — `--form file` copies the mp4 · `--form embed`
     deploys and records `EMBED_URL.txt` · `--form cms --article <slug> --after <n|end>` hosts, then
     inserts, and records `CMS_ARTICLE_URL.txt`. Each ends with `assertDelivered`, and the
     **placement block is printed at the HAND-OVER, not with the menu** — the journalist is told
     where the film goes when they receive it, not while they are still choosing how.

- **STATIC IMAGE (a static chart / map PNG):** hand over the `static.png` directly, at the channel's size
  (portrait 1080×1920 for social-vertical, square 1080×1080 for social-feed, landscape 1200×675 for
  article-web) — no delivery menu, just the file.
  **Run the hand-over script anyway**, for the same reason as VIDEO: it prints the placement block, and
  §6 forbids composing one by hand —
  `bun skills/splash/scripts/export-code.mjs <outDir> <exportDir> --results exports/<slug>/report.json --id <id>`.
  Skipping it is how a static or video delivery silently loses its placement while interactive keeps one.
  `precheck --stage export --dir <dir> --format static`
  is not documented as a required step here the way it is for interactive/scrolly above (the mechanism is
  format-agnostic, but coverage is uneven across producers: chart-native's static/video build subdir always
  carries `config.json` so the check is meaningful there, map-native's does not plant a marker in every
  case, so a clean check is not yet a reliable "this folder is safe to hand over" signal for it — a
  follow-up, not resolved here).
- **INTERACTIVE or SCROLLY (a self-contained `interactive.html` / `scrolly.html`, article-web only):**
  splash **PROPOSES the delivery forms and the journalist CHOOSES one — and ONLY the chosen form is built
  (LAZILY, on demand)**. There is no "produce all forms unconditionally": the React bundle and the Cloudflare
  deploy are expensive/irreversible, so nothing beyond the produced `interactive.html`/`scrolly.html` is
  materialised until the journalist has picked. **There is NO auto no-JS `static.html` fallback** — accessibility
  is a FORMAT choice at CADRAGE (picking `static` IS the accessible path), not a file bolted onto every
  interactive. `export-code.mjs` is a **two-phase** script:
  1. **Phase 1 — emit the proposal (build NOTHING).** Run WITHOUT `--form`:
     `bun skills/splash/scripts/export-code.mjs exports/<slug>/<id> exports/<slug>/<id>-export --results exports/<slug>/report.json --id <id>` (the source is the per-proposal build subdir from 5c).
     It emits the delivery-form proposal DESCRIBING what each form WOULD be — an `EXPORT_FORMS_JSON {…}` line
     (machine-parseable: `forms.a` = `{kind, path, pending:true}`, `forms.b.path` = the standalone HTML file,
     `forms.c.command`/`url`, each with a `deliver` command = the exact `--form` re-invocation) plus an
     `EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL` human block. **No bundle is assembled, no deploy runs,
     no folder is written** at this phase — the paths in the proposal are `pending`.
  2. **THEN relay the emitted proposal VERBATIM and ASK which form the journalist wants (a / b / c, plus d
     when the newsroom's CMS is configured) — an explicit, un-skippable GATE.** Do NOT collapse it to a bare "Livré."; do NOT pick for them. Relay the
     script's `EXPORT_FORMS_PROPOSAL` block (it already carries the concrete paths + the `deliver` command for
     THIS export), then wait for their answer.
     **★ WAIT means WAIT: after emitting the proposal, `--form` MUST NOT run until a journalist message
     answering THIS proposal exists in the conversation.** "The only possible form is c, so I finalize" is the
     NAMED VIOLATION — observed on a real two-element hosted-DW run, where splash emitted both proposals,
     announced « Je finalise la livraison sous cette forme pour les deux », and ran `--form embed` twice
     without a single journalist turn in between. A hosted-DW proposal offering ONLY form c is still this
     gate: the journalist confirms the single form; splash never confirms in their place.
     **Multi-element delivery: the form choice is PER ELEMENT (forms may differ).** Either ask element by
     element, or ask ONCE for all of them while EXPLICITLY offering the grouped reply (relay each element's
     proposal and invite « une forme par élément, ou la même pour tous »). A grouped journalist answer
     (« embed pour les deux ») is a valid choice for every element it names — but the grouping is the
     JOURNALIST's to give, never splash's to presume: applying one element's answer (or no answer at all)
     "to both" is auto-deciding, the same named violation.
     The three forms are:
     - **a) Code source** (`forms.a`) — the delivery depends on the producer: **chart-native** assembles
       ON DEMAND a `<id>-source/` runnable React/Vite bundle (`export-source.mjs`) — `bun install && bun run
       build` → `dist/index.html` reproduces the interactive (THIS is the headline form-1 capability).
       **map-native / scrolly** assembles ON DEMAND a `<id>-source/` runnable Vite project too
       (`bundle-source.mjs`, closure-traced) — same build command, but **online-only** (needs the
       journalist's OWN `VITE_MAPTILER_KEY`, never baked in). Per-producer bundle mechanics (closure-tracing,
       exact file layout, deps) are in **`references/export-code-source-forms.md`**.
     - **b) HTML autonome** — JUST the single self-contained file: the JS-inlined `interactive.html`
       (`scrolly.html` for a scrolly). One file, drops into any CMS/email/offline.
     - **c) Embed (hébergé)** — deploy the html to the newsroom's own Cloudflare Pages project and share the returned URL
       (for a **hosted-DW** producer, whose interactive IS the already-published embed, this is the live
       `publicUrl` — no deploy step). **A SELF-HOSTED embed (no live `publicUrl`) needs the Cloudflare credentials**
       to deploy. When one is missing the proposal flags form c `available:false` and carries `missingKeys` +
       a `reason` with the get-it URL.
       **A missing embed key is a KEY-PREREQUISITE, not a dead end — treat it exactly like a yellow engine
       key (§INPUT):** if the journalist picks c), explain what the missing key unlocks and where to get it
       (the `reason` carries the URL), collect it in ONE free-text prompt per key, save it with
       `bun skills/splash/scripts/save-key.mjs <NAME> <value>` (never hand-edit `.env`, never echo the value
       back), then re-run the `--form embed` deliver command. Only if the journalist declines to provide the
       key do you fall back to **b) HTML autonome**. Never silently downgrade c) to b).
       `SPLASH_EMBED_PROJECT` is the newsroom's own project name and becomes the PUBLIC URL — ask for a name
       that identifies the newsroom (e.g. `heidi-news-splash`); generic names are refused by the adapter.
       (A hosted-DW form c stays available — it needs no deploy of ours.)
     - **d) Directement dans l'article (CMS)** — splash adds the visual to one of the journalist's OWN
       articles in the newsroom's CMS (We.Publish). **Offered ONLY when the CMS route is configured**
       (`export-code.mjs` emits `forms.d` with `available` + `missingKeys` from the same capability
       declaration INPUT reads, so a newsroom told « le CMS n'est pas branché » is never offered it here);
       a missing credential is KEY-FIXABLE exactly like form c's, and the `endpoint` belongs in
       `newsroom.json`, not `.env`. **Not available for a hosted Datawrapper interactive** — the CMS block
       carries the visual's own bytes and a DW interactive has none locally; that one takes form c and the
       journalist pastes the link.
       **Three rules belong to this form alone, and none is optional:**
       0. **SHOW WHERE IT WOULD GO, AND GET THE ANSWER — before anything is written.** `forms.d`
          carries `needsPosition: true`. Splash already knows where the visual BELONGS: the anchor
          `suggest-article` computed (paragraph + verbatim quote), which §6 makes you relay at every
          hand-over. Here that anchor stops being advice and becomes a write, so it must be
          CONFIRMED: read the target article's blocks back, tell the journalist which block the
          visual would follow, in their words (« je le mets juste après le paragraphe qui commence
          par “les frontaliers de Bonneville” — ça te va ? »), and pass the position they confirm as
          `--after <n>` (`-1` = before everything, `end` = at the end). **`end` is a real answer;
          a missing flag is not** — both `export-code.mjs` and `publish-cms.mjs` refuse without one,
          because writing at the end "since nobody said otherwise" is deciding for them.
       1. **ASK WHICH ARTICLE — never choose one.** `forms.d` carries `needsArticle: true` and a `deliver`
          command holding the literal placeholder `<slug>`. Ask the journalist for the slug of the article
          the visual belongs in (it is the last part of its address in the CMS), and pass it as
          `--article <slug>`. Both `export-code.mjs` and `publish-cms.mjs` REFUSE the unreplaced
          placeholder: inventing a slug is the same class of violation as choosing a form for them, except
          it writes into a stranger's article.
       2. **SAY THAT NOTHING GOES LIVE.** The insertion is a DRAFT edit — splash never publishes the
          journalist's article, because pushing an editorial document live is their decision and not a
          side effect of adding a chart. The script prints a `CMS_DRAFT_ONLY …` line at hand-over;
          relay it. The delivered record is `CMS_ARTICLE_URL.txt` (the article's own address).
       **What the adapter refuses, and why you must not work around it:** the CMS has no "add a block"
       operation — `updateArticle` is total, so inserting means re-sending the whole article. If it holds
       a block splash cannot faithfully carry back, the write is REFUSED rather than performed, because a
       partial write would silently delete that block from a live piece. **20 of the CMS's 30 block types
       round-trip** (every scalar-only one — the embeds, title, prose, image, quote, poll…), so an ordinary
       piece goes through; the 10 that nest another input type (teasers, listicle, gallery, flex, event,
       comment, subscribe) are the ones that refuse. That refusal names the block type;
       relay it and offer form c (a link to paste) instead. Never retry it by hand, and never edit the
       article yourself to make the refusal go away.
  3. **THEN build + deliver ONLY the chosen form** — re-run `export-code.mjs` with `--form <html|code-source|embed|cms>`
     (the `deliver` command from the proposal is exactly this):
     - `--form html` → copies the standalone `interactive.html`/`scrolly.html` into the export folder; print its
       ABSOLUTE path (that single file IS the delivery).
     - `--form code-source` → runs `export-source.mjs` NOW (chart-native) or `bundle-source.mjs` NOW
       (map-native/scrolly) to assemble the runnable `<id>-source/` bundle; print its ABSOLUTE path.
     - `--form cms --article <slug> --after <n|end>` → runs `publish-cms.mjs` NOW to insert the visual into that article's
       DRAFT in the newsroom's CMS, and records the article's URL in `CMS_ARTICLE_URL.txt`. It applies the
       same editorial gates as the embed form (produced + render-approved + sign-off re-verified against the
       artifact's CURRENT bytes) before it touches the CMS.
     - `--form embed` → runs `deploy-embed.mjs` NOW to publish to the newsroom's OWN Cloudflare Pages project
       (`$SPLASH_EMBED_PROJECT`) and records the hosted URL in `EMBED_URL.txt` (a hosted-DW producer
       records its already-live `publicUrl`, no deploy). Share the URL. **Integrity: `deploy-embed.mjs`
       FAIL-FASTS (non-zero, before any network call) if the Cloudflare credentials are unset and there is no live
       `publicUrl` — it never half-deploys or writes a placeholder; `export-code` surfaces that message and
       refuses.** The URL recorded must pass `isHostedUrl` (a real https origin) or the export fails.
     Each run ends with the `assertDelivered(files, { format, form })` gate — the folder must match the
     `(format, chosen form)` shape or the export fails loudly. For **form embed** that gate is strict like
     static/video: the folder must be EXACTLY `EMBED_URL.txt` holding a resolvable https URL — the pre-export
     PRODUCTION output (the produced `interactive.html`/`static.png`) is NOT an embed deliverable, so handing
     it over cannot fake `delivered`. **Hosted Datawrapper interactives** (`publicUrl`,
     no local html) offer ONLY form c (the live embed) — there is no React source and no standalone local html
     to hand over.
     **Before you NAME this folder to the journalist, the same fact is checkable directly, on demand:**
     ```bash
     bun lib/host/cli.ts precheck --stage export --dir exports/<slug>/<id>-export --format <format> --form <chosen>
     ```
     A non-zero exit means the folder still holds a file the build leaves behind (`config.json`,
     `report.json`, …) — that is the directory the build worked in, not the finished deliverable
     (`assertDelivered` already refuses this INSIDE `export-code.mjs`; this is the same disk fact,
     callable again right before you relay the path — a second look costs one command).

  **★ NEVER ANNOUNCE A VISUAL WITHOUT ITS PATH.** Every sentence that tells the journalist something is
  ready NAMES the file, by a path that exists on disk. « Le visuel est prêt » with nothing to open is not
  a delivery — it is the exact shape of the 2026-08-03 failure, where a host model could not invoke a
  nested skill, reached for its own chat-side charting extension instead, drew a bar in the conversation
  and announced the visual as ready. **No `exports/`, no producer, no gate, no file the newsroom owns.**
  Nothing in this repository could object, because nothing in this repository had run.

  So the rule is on the SENTENCE, which is the only thing left when the pipeline was never entered:
  a claim of readiness carries a path, or it is not made. And the journalist can check the claim
  themselves, at any time, without reading any of this:
  ```bash
  bun skills/splash/scripts/verify-delivery.mjs <the path you were given>
  ```
  It answers from the disk — which run, which markers, which sub-skills the artifacts corroborate — or
  says plainly that no Splash run stands behind the file. **A picture drawn in a chat has no path to
  point it at, and that is the answer.** It reads files; it does not prove nobody wrote them by hand,
  and it says so itself.

  **If a host cannot invoke a nested skill** (the trigger of that failure — the model called
  `suggest_article` as if it were a TOOL and got `Tool not found`): say so to the journalist and STOP.
  Do not substitute another tool, and do not draw anything yourself. A visual this pipeline did not
  produce is not this pipeline's visual, however plausible it looks.

  **`delivered` REQUIRES that `export-code.mjs --form <chosen>` built the artifact** (for interactive/scrolly).
  Never report an interactive/scrolly as delivered on produce-time outputs alone — a Gate-3 review PNG,
  `interactive.png`, or the build subdir's byproducts are NOT a delivery. If the `--form` build did not run, the
  visual is NOT delivered, no matter how the run otherwise ended.

  The one-time Cloudflare setup (on the newsroom's OWN account) + the token details are in
  **`references/cloudflare-setup.md`** — consult it only when a journalist first chooses the embed form.

**Session close — after the handover.** Once the deliverable is handed over and the journalist signals
completion — a pure thanks/goodbye with no new request ("Merci, tout est en ordre", "That is everything,
thanks") — send AT MOST ONE brief closing message and treat the session as ENDED: no new questions, no
re-engagement, no repeated farewells, and no echoing further goodbyes back (trading "Parfait, à bientôt."
/ "À bientôt !" variants turn after turn is noise, not service). A message that carries ANY new request
alongside the thanks is NOT a close — handle the request instead. (The step-12 other-format offer
below is made WITH the handover, BEFORE any close — the journalist declining it, or a pure thanks
after it, is what closes the session.)

### Step 12 — offer another format (proactive, after EVERY export)

Once an element is exported, OFFER another format of the same element — « tu la veux aussi en
vidéo pour Instagram, ou en image pour le print ? » — the journalist doesn't have to know to
ask (canonical step 12). On a yes:
- re-ask ONLY the channel/format pin for the new target (one line, or infer + confirm-back
  when the ask names it — « une vidéo Instagram » ⇒ social-feed/video);
- append a NEW `accepted.json` entry: `id` = `<original-id>-<format>` (NEW id ⇒
  `produce-all`'s per-id `freshOutDir` can never wipe the first delivery); `spec`,
  `confirmedTakeaway`, `provenance`/`confirmedTable`, `sourceHint` copied VERBATIM (the
  duplicate-takeaway guard, GUARD 3b, sanctions this ONE twin shape — a `<id>`/`<id>-<format>`
  pair — because it is the SAME element re-formatted, not a second element);
- PRODUCTION → Gate 3 → EXPORT run as any cycle (a fresh render is never pre-approved).
No re-CADRAGE, no re-selection. The single-format model is untouched: each cycle produces
exactly ONE pinned format — « chaque graphique aura plusieurs formats » = short journalist
cycles, never a batch.


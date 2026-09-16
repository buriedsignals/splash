# Tuning knobs — every configurable value and where it lives

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

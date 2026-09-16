# Forms detail — what each form in `materialise` actually does

`materialise({form, format, storiesRoot, storyId, outputId, planVersion, findingIds, env, fetchFn,
cms, handover})` validates the **`{form, format}` pair** against `FORMS_BY_FORMAT[format][form]` —
the same table `offerForms` reads, so "not an offered form" can never drift from what was actually
offered, and a form id that happens to exist under one format is never accepted for a different
format just because the id matches. It independently validates the same bound review, validates
`handover`, derives both source and the one legal `export/<outputId>/` destination from the declared
trust root and IDs, and rejects traversal or symlinked ancestors. It rejects `beatDir` and `exportDir`
fields on the canonical API. Under a per-output filesystem lock, it first reconciles any prior
journal, then checks the review again after staging so a render or review changed during the build
cannot be published. Publication records a complete manifest, journals the old-export and new-export
renames, and retains cleanup state if removing the backup fails. Only a successful build and
hand-over replace the previous export; ordinary failures remove staging and preserve the last good
delivery. Inside staging it writes the beat's receipt and:

- `"owned-file"` copies every entry of `<beatDir>/renders/` into the committable export record,
  walking subdirectories with `copyTree`. Placeholder-bearing HTML stays unchanged there. Its live
  substituted counterpart goes under the private, mode-restricted, self-ignored
  `export/<outputId>/keyed/` directory; `HANDOVER.md` identifies that keyed page as the file to
  publish and the root page as the placeholder record not to publish. Delivery reserves the
  `renders/keyed` source namespace and refuses any final keyed path already tracked by the Git
  worktree that owns that destination, before staging or substituting bytes.
- `"source-bundle"` copies every entry of `beatDir` *except* `renders/` into `exportDir`, then writes
  a real `build.ts` and `package.json` build script. Nested HTML remains byte-for-byte
  placeholder-only: source custody is not a second credential lifecycle. `bun install && bun run
  build` bundles the component source it was actually given, not a rebuild of the raster pipeline
  that made the owned PNG/SVG.
- **`"embed"` — implemented; live verification is credential-gated.** Requires both Cloudflare env
  vars (throws naming which is missing if a caller bypasses `offerForms`'s disabled row). Requires
  `<beatDir>/renders/` to hold exactly one file (`singleOwnedFile` — ambiguity is refused, not guessed
  at) and deploys it, via `scripts/deploy-embed.mjs`'s `deployFile`, to a deterministic
  per-installation/per-output Cloudflare Pages project. The first hosted delivery persists
  `stories/.splash-instance-id`; `cloudflareProjectName(instanceId, storyId, outputId)` includes it so
  separate Splash roots cannot collide on common slugs. This is automatic and local; the journalist is
  never asked to name a project or choose a hosting provider. It uses a project-create request when
  needed, followed by the direct-upload sequence (`upload-token` → `check-missing` → conditional
  `upload` → `deployments`, matched against Wrangler's own source — no wrangler, no build step, no
  framework). Every request and response-body read has a 15-second deadline. Before the final
  request, it persists a schema-v1 operation record and sends its stable key as Cloudflare's
  `commit_hash`. If the response is lost, the next call lists deployments and matches that key; if the
  remote deployment succeeded but local replacement failed, the next call reuses it. It never posts
  again while the remote result remains ambiguous. Deterministic tests retain the request, timeout,
  reconciliation, stable-alias, and replacement contracts. A current live two-revision Cloudflare
  smoke remains required before release claims provider-backed proof. `exportDir` receives
  `EMBED_URL.txt` with the stable project URL, `EMBED_CODE.html` with the iframe snippet to paste into
  a CMS, and `DEPLOYMENT.json`, which links that public URL and the immutable deployment URL and
  Splash instance ID back to `beats/<outputId>/` and the current rendered artifact. `HANDOVER.md`
  explains each file. An approved revision rematerialised for the same output deploys to the same
  project, so existing embeds keep their address while the deployment receipt records the new
  immutable version. Splash also publishes the article-page companion script to one deterministic
  Pages project per Cloudflare account and references that absolute URL from `EMBED_CODE.html`;
  ordinary browsers load it automatically. Preflight exposes the exact URL as an optional
  CSP/script-blocker allow-list value. `SPLASH_SCROLLER_URL` may still override the emitted URL
  without preventing Splash from maintaining its canonical hosted copy.
- **`"cms-insertion"` — UNPROVEN.** Reads the same single owned file, builds a mutation payload with
  `scripts/cms-insert.mjs`'s `buildInsertion` (`kind: "we-publish"` by default, or the caller's own
  `cms` object), and writes it to `exportDir/CMS-INSERTION.md` — nothing is sent over a network; this
  form makes zero HTTP calls. The document itself says, in its own first line, that it has never been
  sent to a real CMS. `buildInsertion`'s `we-publish` shape runs `assertNotPartialReplace`
  unconditionally before returning — the guard that matters, proven by a real test suite, not by a
  live call: We.Publish's `updateArticle` rewrites the ENTIRE article, so a mutation that would drop
  any part of the article it read is refused before it is ever built, let alone sent.
  `references/cms-insertion.md` documents both CMS mechanics in prose and states plainly what remains
  untested.

## `otherFormatsFor` and `otherSubjectsFor` — the closing offer, in full

`otherFormatsFor({medium, deliveredFormat, capabilities, notSuited, language})` names the formats the
SAME beat could also be produced in — never the one just delivered. Three filters run before a
format is named: the pair must be **producible** for this medium, the medium's **capability** must
be open (`capabilityGap`, shown as unavailable with what would open it, not offered), and the beat's
own claim must survive the format (`notSuited`, an editorial input with a reason per entry). Taking
one records a request; it does not schedule or start production. Declining is a recorded answer:
`materialise` writes `.another-format` as `pending` at delivery, `recordFormatAnswer` replaces it
with `declined` or `taken <format>`, and `deliveryClosed(exportDir)` reports `{closed, missing}`.

`otherSubjectsFor({storyDir, capabilities})` is the other half: the article's own other angles,
surveyed at the proposal (movement ④) and written into `stories/<slug>/SUBJECTS.md` by
`recordSurveyedSubjects` — the STORY's directory, because a sub-subject has no beat of its own until
somebody asks for one. Re-checked, never trusted: `otherSubjectsFor` re-runs the same capability and
producibility checks and marks an angle whose beat now exists as `drawn`; only `offered` rows reach
the journalist. Taking one starts a new beat from its first phase. Declining is an answer, and so is
`none` for an article that yielded nothing else.

# The hosted artifact chain — capture, preview, approve, deliver on a published embed

Branch `feat/hosted-artifact-chain`, worktree `/Users/rmdms/Sites/Professional/splash-hosted-chain`.

A Datawrapper interactive — chart or map — is published on Datawrapper's own CDN and hands back a
URL and no file. The loop already RECORDED that (`ArtifactRecordSchema`'s union) and two gated
proofs fetched the URL back 200. Everything after production was written on "open the file, measure
its pixels, hash its bytes, sign the hash", so `capture` recorded a gap, and `preview`, `approve`
and `deliver` each refused by name. The measured cost was **10 clean interactive rows** — dw-chart ×
9 sheets and map-dw × choropleth — offerable, choosable and producible, then undeliverable
(`docs/splash/capability-matrix-2026-07-28.md` §L3).

This slice teaches the four steps to act on a hosted artifact on its own terms. No refusal was
deleted without a real behaviour replacing it.

---

## 1. What each step now does

### capture — opens the ADDRESS

`CapturePayload` gained `artifactUrl`; exactly one of `artifactPath` / `artifactUrl` is given, and
the verb's shape gate (`isCapturePayload`) refuses both or neither. `lib/verify/capture.ts` resolves
a `CaptureSource` once and `captureHtml` navigates to it — the same measurement then runs on the
live DOM: root box, marks, mark colours, furniture presence/visibility/in-frame, rendered title, at
every viewport the destination actually publishes at.

- A Datawrapper embed URL **is** the embed page — no iframe hop is needed. Probed live on
  2026-07-28: `https://datawrapper.dwcdn.net/XkA4o/2/` returns the chart page itself (73 KB of
  HTML); the `<iframe>` strings in it are the embed code DW *offers*, inside a serialized props
  blob, not the page structure. `body` is the matching root selector.
- `TITLE_SOURCES` gained a final `h3` rung. Measured on that same page: DW marks its headline as an
  `h3` inside a `[class*="headline"]` block and has **no** h1, h2 or `svg[role="img"][aria-label]`.
  Without the rung a hosted capture records `titleSource: "none"` and the title-divergence detector
  has nothing to read. Last in the ladder, so no engine that marks its title changes answer.
- A `static` element with an address is refused (`invalid-request`): a png is measured off its own
  IHDR, and a screenshot of a page showing an image is not the image.
- A non-resolvable address is refused with the contract's own `isHostedUrl`, never a second https
  test.
- An address that answers non-2xx is an `engine-failed` — a **real failure to fix**, the element
  stays on `capture`. It is never a recorded gap and never a silent pass.

The recorded-gap branch for hosted artifacts is gone. The `not-implemented` gap branch (video)
is untouched.

### preview — presents the URL

`previewStep` gained a hosted branch. The four guarantees in that module's header survive; only what
they are said *about* changes:

1. the address shown is the one the RUN recorded (from the manifest, never an argument);
2. the subject is the hosted binding, read off the capture that measured the live embed;
3. the genre gate still runs — `isDeliverableOf` now answers on a URL through `deliveryGenreFor`, so
   an address is the deliverable of an `interactive`/`scrolly` element and of nothing else;
4. the presentation is recorded by the same `present()`, which opens a URL exactly as it opens a
   file.

**Its refusal did not simply go away.** It now fires on a real precondition: a hosted element with
nothing captured has no binding, so preview refuses naming the address and asking for a capture.
That is the only ordering constraint the file case does not have, and it is load-bearing — without
it, an unmeasured embed could reach the approval gate.

### approve — binds to the hosted binding

`approve` resolves `approvalSubjectOf(el)` instead of `fileArtifact(el.artifact).sha256`. Overrides,
the sign-off document and the Ed25519 payload all bind to that one value. The sign-off document
additionally records `artifactUrl`, because the digest cannot be re-derived by a reader and without
the address the document would name a signed thing nobody could identify.

The identity gate is unchanged in kind: a newsroom with `requiredSigners` still needs a verified
Ed25519 signature, over the same payload, through the same verifier. `signEditorialSubject` moved
into `skills/splash/src/editorial-signoff.ts` (beside the payload it signs and the verifier that
checks it) and `scripts/sign-artifact.mjs` became a CLI over it, gaining `--digest <sha256>` for the
hosted case. A substituted digest does not help: `approve` hands the verifier the RUN's own subject,
so the signature simply fails to verify (asserted in `lib/loop/hosted-artifact.test.ts`).

### deliver — hands the address over

New publisher `embed-hosted` (`lib/delivery/adapters/hosted-embed.ts`), registered in the delivery
composition root and declared as a key-free, always-ready capability. It does three things: verify
the address still answers (bounded GET through the shared `fetchBounded`; a non-2xx is refused and
nothing is recorded), compose the CMS snippet through the same `renderSnippet` every destination
uses (so a newsroom's own `snippetTemplate` applies), and record `kind: "hosted"` with the URL and
snippet — **no path**, because the newsroom owns no file.

`deliveryGenreFor("interactive") === "embed"` was the design input: the embed genre is what the
snippet module already composes an iframe for, so nothing new was invented for the snippet.

`Publisher` gained a required third axis, `sources: ("file" | "hosted")[]`. `serves` answers what
the artifact IS, `kind` answers where it lands, `sources` answers what the adapter can be HANDED.
`deliver` checks it before the verb runs, so a byte-shipping publisher is never handed
`join(runDir, undefined)`. The four existing adapters declare `["file"]`; each also grew a local
`artifactFileOf(req, id)` guard (defence in depth for a direct caller).

`defaultDestinationsFor` gained `{ alreadyPublished }`, and `requestDelivery` passes
`isHostedArtifact(el.artifact)` — so a hosted artifact is routed to the hand-over by default rather
than to a package of bytes nobody owns. Re-hosting a copy of a live Datawrapper chart at a second
address was rejected as a design: the newsroom would then hold two embeds that disagree the moment
the chart is corrected.

**The blanket refusal became a precise one.** `deliver` no longer refuses every hosted artifact; it
refuses the MISMATCH, per destination, by name, before any call goes out. The editorial gate,
staleness and one-record-per-call are all unmoved.

---

## 2. What the approval binds to, and why

**The hosted binding** (`lib/verify/hosted.ts`):

```
sha256("splash-hosted-embed:v1\nurl=<address the capture landed on>\nrendered=<sha256 of the primary still>")
```

Three candidates were considered.

**The URL alone — refused.** "The address I approved still answers" is not "the thing I approved is
still there". Nothing in an address says what is served at it.

**The captured PNG's hash alone — refused as the whole binding.** It is the strongest statement
about what a reader sees, but a screenshot is not reproducible byte-for-byte (font rasterisation,
animation timing), so nothing can ever re-derive it — a later reader could only compare the recorded
hash with itself, which is the "compare a string with itself" anti-pattern this codebase already
names elsewhere.

**Both, hashed together — chosen.** The address pins WHICH published thing; the pixels pin what it
actually rendered as when a human was shown it.

The address leg is load-bearing because of a property of Datawrapper that was **measured, not
assumed** (probe against chart `XkA4o`, 2026-07-28):

- `POST /v3/charts/{id}/publish` returns `data.publicUrl = https://datawrapper.dwcdn.net/XkA4o/1/`
  and `data.publicVersion = 1` — the public version is IN the path;
- publishing the same chart again returned `https://datawrapper.dwcdn.net/XkA4o/2/`;
- and `.../1/` fetched **after** that re-publish answered **200 with the old headline**
  (`carries the new headline: false`).

So a re-publish MOVES the address instead of changing what the recorded one serves. An approval that
names `.../1/` can never come to cover `.../2/`, and handing over the recorded URL hands over
exactly what was approved. The pixel leg is the guarantee that survives if a future hosted engine
ever records an address that is not version-pinned: the content behind it would change, the next
capture would measure different pixels, the binding would move, preview and approval would lapse.
That requires a re-capture to detect, which is the honest limit of what this layer can promise
(§5).

`approvalSubjectOf(el)` in `lib/loop/manifest.ts` is the single resolver — bytes for a file, the
binding for an embed, `""` when there is nothing to bind to yet. Five readers use it
(`previewCovers`, `approveElement`, `approve`, `resume`, and the approval gate through them), so a
gate can never clear on a subject a report denies.

One deliberate non-change: `assertInvariants`'s "a preview must not contradict the artifact" clause
still reads `fileArtifact` only. A file record carries its own sha256, so a contradicting preview is
the manifest contradicting itself — two immutable fields. A hosted element's subject lives on the
CAPTURE, which the chain rewrites every time the embed is measured again, so the same comparison
there would turn an ordinary re-capture into a failed WRITE (a throw, from a module the loop awaits
unguarded) instead of into the next action. The hosted case is gated at
`previewCovers`/`approvalDecision`, which resolve the subject freshly and answer "preview it again".

---

## 3. Commands, with their real output

### Typecheck

```
$ cd lib && bunx tsc --noEmit
(no output, exit 0)
```

### `bun test lib`

```
$ bun test lib
 1602 pass
 19 skip
 5 fail            <- before updating the capability lists (see below)
 7519 expect() calls
Ran 1626 tests across 159 files. [268.62s]
```

The five failures were list assertions of a fact that genuinely changed — `embed-hosted` is a
key-free capability, so it is enabled by default and registered by the composition root:
`lib/core/publishers-isolation.test.ts`, `lib/newsroom/decor.test.ts`,
`lib/newsroom/state.test.ts`, `lib/newsroom/migrate-decor.test.ts` (×2). Each was updated to name
it. Re-run:

```
$ bun test lib/newsroom lib/core/publishers-isolation.test.ts
 127 pass
 1 skip
 0 fail
 364 expect() calls
Ran 128 tests across 10 files. [2.26s]
```

### `bun run check` — the gate

```
$ bun run check
Typechecking (tsc --noEmit)…
.........
Testing (bun test)…
.............

PASS  tsc   lib
PASS  tsc   skills/splash
PASS  tsc   skills/chart-native
PASS  tsc   skills/map-native
PASS  tsc   skills/scrolly
PASS  tsc   skills/image-native
PASS  tsc   skills/dw-chart
PASS  tsc   skills/map-dw
PASS  tsc   install
PASS  test  lib
PASS  test  skills/dw-chart
PASS  test  skills/chart-native
PASS  test  skills/map-native
PASS  test  skills/scrolly
PASS  test  skills/image-native
PASS  test  skills/map-dw/eval
PASS  test  skills/map-dw/src
PASS  test  skills/suggest-chart/eval
PASS  test  skills/suggest-article/eval
PASS  test  skills/splash
PASS  test  docs/installer
PASS  test  install

22/22 checks passed.
```

No `lib/verify` Playwright contention flake was hit — the suite passed in the full parallel run.

### The gated Datawrapper proofs

```
$ SPLASH_DW_E2E=1 bun test lib/loop/dw-chart-e2e.test.ts
[dw-chart-e2e] recorded hosted delivery https://datawrapper.dwcdn.net/z2l22/1/
[dw-chain-e2e] published https://datawrapper.dwcdn.net/XoCLR/1/
[dw-chain-e2e] still 2400x872 /var/folders/…/splash-dw-chain-OMIxTG/verify/e1/review-primary.png sha 5852c25baca7…
[dw-chain-e2e] rendered title (h3): Basel recycles more of its waste than any other Swiss city
[dw-chain-e2e] furniture title: pass — the title is present
[dw-chain-e2e] furniture unit: fail — the unit is in the DOM but not visible
[dw-chain-e2e] furniture source: pass — the source is present
[dw-chain-e2e] furniture alt-text: pass — the alt-text is present
   (…the same four at each of the three breakpoints…)
[dw-chain-e2e] blocking: furniture-missing — required furniture is missing or hidden in the rendered component
[dw-chain-e2e] handed over https://datawrapper.dwcdn.net/XoCLR/1/
[dw-chain-e2e] snippet: <iframe src="https://datawrapper.dwcdn.net/XoCLR/1/" title="Basel recycles more of its waste than any other Swiss city" width="700" height="420" style="border:0;max-width:100%" loading="lazy"></iframe>
[dw-chart-rowdriven-e2e] delivered 1200x800 against the 1200x675 article-web box
[dw-chart-rowdriven-e2e] AFTER  pass — …height is content-driven…
[dw-chart-rowdriven-e2e] BEFORE fail — image 1200x800 is not the destination 1200x675 …
[dw-chart-rowdriven-e2e] BEFORE fail — image 1200x800 against a 1200x675 container

 6 pass
 0 fail
 65 expect() calls
Ran 6 tests across 1 file. [23.91s]
```

```
$ SPLASH_DW_E2E=1 bun test lib/loop/map-dw-e2e.test.ts
[map-dw-e2e] IHDR 1200x676 — article-web media box 1200x675
[map-dw-e2e] recorded hosted delivery https://datawrapper.dwcdn.net/YUahI/1/
[map-dw-chain-e2e] published https://datawrapper.dwcdn.net/bsb3L/1/
[map-dw-chain-e2e] still 2400x1256 sha 032524846490…
[map-dw-chain-e2e] rendered title (h3): Electricity access is lowest across the Sahel
[map-dw-chain-e2e] blocking: furniture-below-fold — required furniture falls outside the component or outside the publication container
[map-dw-chain-e2e] blocking: component-overflows-viewport — the component does not fit the container it publishes into
[map-dw-chain-e2e] handed over https://datawrapper.dwcdn.net/bsb3L/1/
[map-dw-chain-e2e] snippet: <iframe src="https://datawrapper.dwcdn.net/bsb3L/1/" title="Electricity access is lowest across the Sahel" width="700" height="420" style="border:0;max-width:100%" loading="lazy"></iframe>

 4 pass
 0 fail
 28 expect() calls
Ran 4 tests across 1 file. [25.58s]
```

**The positive controls, at each end.** Each chain proof reads the captured image's OWN bytes off
disk (png header + re-hashed sha256, asserted equal to the record's `sha256`, and asserted to be the
pixel leg of the binding `approvalSubjectOf` then returns), and fetches the DELIVERED address off
the run's own delivery record — `expect(url → status).toBe(url → 200)`, plus `<html` in the body.
Nothing is read off a producer's report about itself. Each file keeps its always-on
fixture-validity half ungated (unchanged).

### URLs actually fetched

- `https://datawrapper.dwcdn.net/XkA4o/1/` and `.../2/` — the version-pinning probe (created,
  published, re-published, re-fetched).
- `https://datawrapper.dwcdn.net/XoCLR/1/` — the dw-chart chain: captured in the browser, then
  fetched 200 off the delivery record.
- `https://datawrapper.dwcdn.net/bsb3L/1/` — the map-dw chain: same.
- `https://datawrapper.dwcdn.net/z2l22/1/`, `https://datawrapper.dwcdn.net/YUahI/1/` — the
  pre-existing "the URL resolves" proofs, unchanged and still 200.

---

## 4. What the live embeds actually told us

Capture on a hosted embed measures things nothing could see before, and two of them are real
findings rather than plumbing:

1. ~~**The unit never reaches the reader on a Datawrapper chart embed.**~~ **CLOSED 2026-07-29 —
   this finding is no longer true. See the note below.** As measured here on 2026-07-28: the chain
   proof recorded `capture:furniture-present role=unit → fail (in the DOM but not visible)`.
   Verified by a separate probe of the published chart `XoCLR`: the ONLY elements on the page whose
   text contains `%` are two `<script>` tags (the serialized `__DW_SVELTE_PROPS__` blob), both
   `display:none`, box 0×0. The commissioned unit is in the chart's metadata and is painted
   nowhere. That was a true verdict, not a measurement artifact.

   > **Superseded.** §4 closed by saying fixing this "means changing what dw-chart commissions" —
   > and the very next day, `c0e73c1a` did exactly that: `introWithUnit`
   > (`lib/loop/assemble/dw-chart.ts`) states the unit once, in the printed subtitle, which is its
   > one reader-reaching path on a spec that has no unit field. Re-probed live 2026-08-07 on a
   > freshly published fixture chart (`2A7Pq`): the deepest elements whose text contains `%` are
   > now **three**, not two — the same two `display:none` script blobs, plus a **visible 434×16
   > `<span>`** reading *"A ranking of four Swiss cities, Basel highest at 54 percent recycled
   > (%)"*. The chain proof now measures `role=unit → pass` at all three breakpoints, has **no**
   > blocking findings, and reaches delivery with **no overrides**.
   >
   > The pin in the proof stayed stale for eight days because the proof is opt-in and nothing
   > cheap was watching. Both Datawrapper proof files now carry an always-on guard asserting that
   > every string capture will look for is in the spec the engine is handed — 3 ms, in
   > `bun run check`, red the moment the two disagree again.

2. **A Datawrapper map embed overflows the article-web container.** `furniture-below-fold` +
   `component-overflows-viewport` on the live choropleth: the map renders ~628 CSS px tall against
   the 560 the channel publishes at.

Both were BLOCKING findings, and both proofs passed them with an explicit written override naming
the finding — the #11 ceremony a journalist would perform, not a relaxation of the gate. Neither
was "fixed" here; fixing them means changing what dw-chart/map-dw commission, or deciding a height
policy for hosted embeds, and both are judgements this slice has no measurement to justify making
(see §5).

*(Since: (1) was fixed the next day and its override is gone — see the note above. (2) stands,
re-measured live 2026-08-07: the map proof is 5 pass / 0 fail and still overrides both of its
geometric findings. It is a different problem — a rendered height is not decidable from a spec, so
no cheap in-gate guard can watch it the way one now watches the unit.)*

---

## 5. What I could not close

- **The unit gap (finding 1 above).** The fix belongs in `skills/dw-chart`'s `spec-to-metadata` —
  put the unit somewhere DW paints (intro, axis label) — and it changes what every Datawrapper chart
  commissions, hosted or static. Out of scope; reported with its measurement.
- **The hosted-embed height policy (finding 2 above).** A DW map embed is responsive and grows
  taller than the pinned box, which is the same question `heightPolicy: "content-driven"` answered
  for row-driven static exports. Whether a hosted interactive should be held to the destination's
  height at all is a real design decision; inventing a relaxation without measuring what DW does
  across map types would be exactly the kind of guess this codebase warns against.
- **A re-publish is detected by re-capture, not at delivery.** For Datawrapper the recorded URL is
  version-pinned and content-immutable (§2), so the delivered bytes are always the approved ones. If
  a future hosted engine records a version-agnostic address, the pixel leg lapses the approval — but
  only once something re-captures. `deliver` verifies the address still answers 200; it does not
  re-measure the pixels. A stronger guard would mean a browser at delivery time.
- **The furniture matcher counts `<script>` text as "in the DOM".** The verdict (fail) is right and
  the detail is literally true, but "in the DOM but not visible" reads oddly when the only match is
  a serialized props blob. Excluding `script`/`style` from the needle search is a change to a
  matcher shared by every engine, so it is noted rather than made.
- **`skills/map-dw` has no `package.json`**, so `bun install` there is a no-op; its tests run from
  the root install. Not a problem, just noted since the brief asked for installs in the `skills/*`
  needed.

---

# Review wave — fixes

Reviewed as MERGE WITH FIXES. All of them addressed in one wave; below is what changed and how it
was verified.

## [Critical] The proofs overrode whatever came back

`blocking.map(f => …)` cleared every blocking finding, whatever it was. Interpolating `f.id` into
the reason made the TEXT specific while the SET stayed unbounded — a chart rendering blank at HTTP
200, a title divergence or a `no-capture` regression would have been swallowed identically, in the
only end-to-end evidence this slice has. The report called them "explicit written overrides naming
the finding"; they named it in prose only. That was the right catch.

Both proofs now **assert the blocking id set first, as a literal**, and override **only** those ids
by literal name:

- dw-chart: `expect(blocking.map(f => f.id).sort()).toEqual(["furniture-missing"])`, plus
  `expect(missing.evidence.filter(e => !e.includes("/unit]"))).toEqual([])` — because
  `furniture-missing` GROUPS every furniture role (`CHECK_TO_FINDING`), so pinning the id alone
  would still swallow a missing title or a dropped source. Override: one literal
  `findingId: "furniture-missing"`.
- map-dw: `expect(...).toEqual(["component-overflows-viewport", "furniture-below-fold"])`.
  Overrides: those two ids as literals.

Any other blocking finding now fails the proof before anything is approved. Both re-run green
(§ verification below), and the assertions are load-bearing rather than decorative: if Datawrapper
ever paints the unit, the chart proof fails and has to be updated, which is the correct outcome.

## [Important] (a) The address had two values — chose: deliver the APPROVED address

`deliver` now passes `approvalSubjectOf(el).url ?? artifact.url` to the publish verb, instead of the
recorded `artifact.url`.

**Why this option rather than refusing the capture on `page.url() !== p.artifactUrl`.** The approval
is the authority on what was approved; anything else delivered is, by definition, something nobody
approved. Reading the subject's URL makes "the delivered thing is the approved thing" true **by
construction**, rather than resting on an equality no code asserts. The refusal option would instead
have put a normalisation judgement in the measurement layer — it would reject a legitimate redirect
or a trailing-slash difference that the binding already handles honestly, and it would only be
correct for engines whose recorded URL is already final. It also protects the better case: for an
engine whose recorded URL redirects to a version-pinned target, delivering the LANDED address hands
over the immutable one, which is strictly safer than handing over the mutable alias.

The fallback `?? artifact.url` cannot fire in practice: the gate immediately above refuses a hosted
artifact whose approval carries no subject. It is there so the expression is total.

For Datawrapper the two strings are equal (`publicUrl` is already the final versioned address), so
no delivered URL changes — verified in both gated proofs, where the handed-over address equals the
published one.

## [Important] (b) The digest and the URL came from different records

`hostedBindingOf` returned `images.find(has url)` — the NARROW record, since `resolveTargets`
returns `[narrow, primary, wide]` — while the digest is computed over the PRIMARY still. That URL is
what preview presents and what `SignoffDocument.artifactUrl` records as "which published version was
signed for", so with a per-breakpoint embed variant the document would name a version nobody
approved, and `hostedBindingDigest(url, pixels)` would not reproduce the digest beside it.

Fixed: select `breakpoint === "primary"` with the same `?? images[0]` fallback capture itself uses.
`lib/verify/hosted.test.ts` now gives the narrow record a **different** URL (`…/1/?mobile=1`) and its
own pixels, so it can fail; it also asserts the pair REPRODUCES
(`hostedBindingDigest(b.url, PIXELS) === b.digest`) and that the no-primary fallback matches
capture's.

## [Important] The editorial gate was provenance-only

`provenanceHash` never reads `el.capture`, so a re-capture mints a new binding while
`approvedProvenanceHash` still matches — and `deliver` re-ran neither `approvalDecision` nor
`previewCovers`. The router noticed; the router is not the gate. This is the
`approvedHash`-never-re-verified class at a new seam, and the review is right that it is the one
class this repo has already paid for.

Fixed at the record: `el.approved` gained `approvedSubject`, written by `approveElement` through
`approvalSubjectOf` (the same resolver the decision was made on). `deliver` re-derives the subject
and compares, refusing with a message that says what moved.

Backward compatibility is handled without a hole: `approvedSubject` is optional, and an approval
lacking it is **let through only for a FILE** — every approval already on disk is a file approval,
because no hosted artifact could be approved at all before this slice, and a file's subject cannot
move without a re-produce that moves the provenance the gate already checks. A **hosted** approval
with no subject is a shape nothing could legitimately have produced, and is refused.

Covered by a new test: same provenance, embed re-published to `…/2/`, `approvedProvenanceHash` still
matching — delivery refused, and no call goes out.

## Minors

- **`routing.ts` ignored readiness.** `alreadyPublished` now returns `[HOSTED_EMBED]` only when it
  is in `readyIds`, and `[]` otherwise — the one case this function may answer with nothing, because
  there is no fallback to fall back TO (every other destination ships bytes this artifact has none
  of). `requestDelivery` turns that empty answer into a refusal that NAMES the disabled capability,
  rather than writing `requested: []`, which `needsDelivery` would read as "nobody is waiting on
  it" and silently drop the delivery. Tested.
- **The reverse mismatch had no test.** Added: a file artifact sent to `embed-hosted` is refused by
  name, `invalid-request`, with no call going out.
- **`preview.ts` header oversold the hosted branch.** Rewritten to say what is true: a file's bytes
  are re-read off disk and re-hashed; a published embed gets a **weaker** guarantee — the subject is
  read off the capture record, so what is verified is "this is the embed as the capture measured
  it", not "the live embed is still that". Only a re-capture can say the second thing, and preview
  does not reach the network. The same correction is made at the branch itself.
- **`docs/splash/capability-matrix-2026-07-28.md` §L3** now states that "closed" means the chain
  runs, not that the rows are clean: all 9 dw-chart interactive rows block on `furniture-missing`
  (unit) and the map-dw choropleth blocks on `furniture-below-fold` + `component-overflows-viewport`
  on **every run**. None of those ten cells is deliverable *silently* — each needs the #11 override
  ceremony.

### Ruled on, not changed: the snippet's fixed `width=700 height=420`

`lib/delivery/snippet.ts` pins 700×420 on every embed hand-over, which is not the box capture
verified against (article-web ≈ 1200×900 CSS, primary viewport 900×560). The review is right that
this is the concrete mechanism behind open item 2: the map's ~628 px overflow is measured against
560 and then handed over at 420, so the delivered iframe is **more** clipped than the one that was
judged.

Not changed here, deliberately. It is pre-existing and applies to every embed destination
(cloudflare, s3, wepublish, zip's HTML), so a change is a change to every newsroom's snippet, not to
the hosted path. And the right value is not obvious: `DeliveryMetadata.width/height` already exists
and `decor.state.delivery.maxWidth/height` already feed it, so the fix is plumbing the destination
profile into `deliveryMetadata` rather than hard-coding a better constant — and for a **responsive**
Datawrapper embed the honest answer may be `height: "responsive"` (the module already has a template
for it) rather than any number. That is the same decision as the height-policy item below, and
should be made once, with a measurement, for both. Named here so it is not silently inherited.

## Verification (after the fixes)

```
$ cd lib && bunx tsc --noEmit
(no output, exit 0)

$ bun test lib
 1609 pass
 19 skip
 1 fail            <- lib/verify/manifest-review.test.ts, the el.approved shape assertion
 7535 expect() calls
Ran 1629 tests across 159 files. [290.35s]
```

That failure was the `approvedSubject` field arriving in `el.approved` — a real shape change.
Updated to assert the new field *meaningfully* (`approvedSubject === approvalSubjectOf(el).sha256`,
and that for a file that equals `fileArtifact(el.artifact).sha256`) rather than to absorb it.

```
$ bun test lib
 1609 pass / 19 skip / 1 fail  <- lib/newsroom/verify.test.ts "verifyMapTiler: true for the real key"
$ bun test lib/newsroom/verify.test.ts
 12 pass / 1 skip / 0 fail  [1.70s]
```

That one is a LIVE MapTiler round-trip (`verifyMapTiler` returned `null` — its "could not tell"
answer — after 8s under full-suite contention). Unrelated to this slice, passes in isolation; the
same class as the known `lib/verify` Playwright contention flake, at a different provider.

```
$ bun run check
22/22 checks passed.        (all 9 tsc dirs, all 13 test dirs)
```

```
$ SPLASH_DW_E2E=1 bun test lib/loop/dw-chart-e2e.test.ts
[dw-chain-e2e] published https://datawrapper.dwcdn.net/3wyRN/1/
[dw-chain-e2e] still 2400x872 …/verify/e1/review-primary.png sha 5852c25baca7…
[dw-chain-e2e] rendered title (h3): Basel recycles more of its waste than any other Swiss city
[dw-chain-e2e] furniture unit: fail — the unit is in the DOM but not visible   (×3 breakpoints)
[dw-chain-e2e] blocking: furniture-missing — required furniture is missing or hidden …
[dw-chain-e2e] handed over https://datawrapper.dwcdn.net/3wyRN/1/
 6 pass / 0 fail / 67 expect() calls [24.81s]

$ SPLASH_DW_E2E=1 bun test lib/loop/map-dw-e2e.test.ts
[map-dw-chain-e2e] published https://datawrapper.dwcdn.net/cjOgM/1/
[map-dw-chain-e2e] still 2400x1256 sha 032524846490…
[map-dw-chain-e2e] rendered title (h3): Electricity access is lowest across the Sahel
[map-dw-chain-e2e] blocking: furniture-below-fold — …
[map-dw-chain-e2e] blocking: component-overflows-viewport — …
[map-dw-chain-e2e] handed over https://datawrapper.dwcdn.net/cjOgM/1/
 4 pass / 0 fail / 29 expect() calls [25.40s]
```

The expect() counts rose (65→67, 28→29) exactly by the pinned-set assertions. URLs fetched this
wave: `https://datawrapper.dwcdn.net/3wyRN/1/`, `https://datawrapper.dwcdn.net/cjOgM/1/` (both
captured in a browser AND fetched 200 off the delivery record), plus
`https://datawrapper.dwcdn.net/GtUwK/1/` and `https://datawrapper.dwcdn.net/qaZ0C/1/` from the
pre-existing URL-resolves proofs.

## Still open after this wave

Unchanged from §5, minus what was fixed:

- **The unit gap** — dw-chart commissions a unit Datawrapper paints nowhere. Now pinned by an
  assertion in the proof, so it cannot regress into silence, and named in the capability matrix.
- **The hosted-embed height policy** — and, with it, the snippet's fixed 700×420 (ruled on above).
  One decision, needing one measurement across DW map/chart types, not two guesses.
- **A re-publish is still detected by re-capture, not by delivery re-measuring pixels.** What
  changed this wave is that delivery no longer trusts the approval's DATE: it re-derives the subject
  and compares. What it still does not do is fetch the live embed and re-measure it — the
  `embed-hosted` publisher verifies the address answers 200, nothing more. For Datawrapper the
  recorded URL is version-pinned and content-immutable, so this cannot bite there.
- **The furniture matcher counts `<script>` text as "in the DOM"** — verdict right, wording odd;
  shared by every engine, so noted rather than changed.

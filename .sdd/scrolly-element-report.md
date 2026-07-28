# Is a scrolly an embeddable element? — measured, then acted on

Branch `feat/scrolly-is-an-element`, worktree `/Users/rmdms/Sites/Professional/splash-scrolly-element`.

The claim under test is the one `lib/brain/eligibility.ts` put on **every** scrolly candidate:

> "this is the whole-article branch — it is not built yet, and it changes what gets delivered"

Two assertions in one sentence. Phase 1 measured both.

---

## Phase 1 — what I ran, and what I saw

### Re-verifying the three things I was told, before trusting them

- `skills/scrolly/scripts/produce.mjs:82-86` copies `dist/index.html` to `<outDir>/scrolly.html` —
  one self-contained page, the same shape as an interactive's `interactive.html`. Confirmed.
- `lib/core/publishers.ts:88-96` — `DELIVERY_GENRE` maps `interactive: "embed"` and
  `scrolly: "embed"`. Same genre. Confirmed.
- Nothing under `lib/delivery/` special-cases a scrolly. Confirmed by reading all of
  `routing.ts`, `snippet.ts`, `metadata.ts`, `index.ts` and the four adapters: `zip` and `s3`
  serve `[...VISUAL_FORMATS]`, `cloudflare-pages` derives its `serves` from the embed genre, and
  `wepublish` declares `["interactive", "scrolly"]` — the two named together, never apart.

`article-branch` is also **not** a `NEWSROOM_CAPABILITIES` id (the ids are `dw-chart`, `map-dw`,
`chart-native`, `map-native`, `scrolly`, `image-native`, `embed-cloudflare`, `zip`, `embed-cms`,
`embed-s3`, `embed-fly`). It rode in `option.requires` — the decor's CAPACITÉ axis, the list of
things a newsroom can turn on — as a requirement no install could ever satisfy.

### The instrument

`lib/loop/scrolly-e2e.test.ts` (new). It walks ONE real chart-track scrolly through the whole
chain with the real verbs, in the shape `lib/loop/delivery-genre-e2e.test.ts` already uses for a
static PNG:

```
draft-beats → author-beats → produce → capture → review → preview → approve
            → request-delivery → deliver(zip) → read the package back
```

Fixture: the sea-ice series `lib/loop/beats-render-proof.test.ts` already renders, `channel:
"article-web"`, and — deliberately — `route: "embed"`. The run *declares itself an embeddable
element* and the scrolly is walked to delivery on exactly that declaration. (`route` is inert
today; `lib/loop/resume.ts:41` says so, and `lib/brain/eligibility.ts` refuses to see it. The
declaration is a statement about the fixture, not a lever.)

Opt-in behind `SPLASH_SCROLLY_E2E=1`, like every other real-render proof in this roster; the
always-on half asserts the three routing tables in milliseconds.

Environment note: the first run of `produce` failed on `Rolldown failed to resolve import
"@turf/turf" from skills/map-native/src/cartogram-story.ts`. That is a fresh-worktree setup gap —
the scrolly bundle statically imports map-native's cartogram track — closed by `bun install` in
`skills/map-native`. Not a finding.

### What the chain did

`SPLASH_SCROLLY_E2E=1 bun test lib/loop/scrolly-e2e.test.ts` → **2 pass, 0 fail**, ~11 s.

| step | result on a scrolly |
|---|---|
| `produce` | `elements/e1/scrolly.html`, one self-contained page (real Vite single-file build + the producer's own reduced-motion snap) |
| `capture` | ran for real. Three review images at narrow/primary/wide — the same three `resolveTargets` gives an interactive. No `unsupported` gap recorded. |
| `review` | produced a full record. **Two blocking findings** — see below. |
| `preview` | passed the genre gate (`isDeliverableOf("scrolly", …/scrolly.html)` → true), re-hashed the bytes, recorded the presentation |
| `approve` | wrote the sign-off, over the artifact bytes, bound to the provenance |
| `request-delivery` | with **no destination named**, defaulted to `["zip"]` — byte-identical to what an interactive defaults to |
| `deliver` | published. `publisherId: "zip"`, `kind: "package"` |
| the package, read back | `index.html` + `EMBED.txt` + `README.md` + `metadata.json`, and `index.html` is the produced `scrolly.html` **byte for byte**. The snippet is an `<iframe …>`. |

The delivered `<iframe>` snippet answers the second half of the mark's sentence on its own.

### Verdict on the sentence, in two halves

**"it is not built yet" — FALSE, and stale.** The chain runs end to end with zero code changes.
`lib/loop/deliver.ts`, `lib/loop/preview.ts`, `lib/loop/approve.ts` and `lib/verify/*` branch on
`static` / `video` / hosted-vs-file and never on `scrolly`.

**"it changes what gets delivered" — FALSE.** What is delivered is one self-contained HTML file of
the embed genre, routed to the same publishers, packaged with the same iframe snippet.

### But TWO real breaks, both in the VERIFY leg

The walk only reached `approve` because the test's ceremony overrode two blocking findings. They
are not incidental — both fire on **every** scrolly, at **every** breakpoint, structurally:

```
capture:furniture-present  fail  no element carries the alt-text text
                                 "L'étendue minimale de septembre est passée de 7 à 4,3 …"
capture:fits-viewport      fail  the component ends at y 3645, x 1200, outside its
                                 1200x675 container (document scrolls to 1200x3645)
```

→ findings `furniture-missing(blocking)` and `component-overflows-viewport(blocking)`.

**Break A — `capture:fits-viewport`.** A scrolly is 3645 px tall in a 675 px box because a scrolly
*is* its own scroll: six cards of narrative walk. This is precisely the "takes over the reader's
scroll for its own height" property — a real editorial difference, and *not* a delivery one. The
verify layer already owns the vocabulary for exactly this shape: `HeightPolicy: "content-driven"`
(`lib/verify/types.ts:120`), built for Datawrapper's row-driven exports whose height belongs to
their rows. It was never declared for the scrolly host, and `captureHtml` never read
`heightPolicy` at all — only `captureStatic` did.

**Break B — the alt-text is never painted.** `assembleChartNative` puts `angle.altInsight` into
the scrolly config (probed directly: the assembled config carries `"altInsight": "…"`), but the
scaffold never renders it. chart-native's visually-hidden description comes from
`AltInsightContext.Provider` in **chart-native's own** `mount.tsx`; `skills/scrolly/src/mount.tsx`
has no equivalent, and `Scrolly.tsx` painted title / unit / source / credit and nothing else. Every
chart-track scrolly shipped without the WCAG 1.1.1 description its own config carried.

### A third finding, at the offer — I GOT THE CAUSE WRONG. Retracted.

**What I originally wrote here was causally false, and I am striking it rather than softening it.**
I observed that `propose()` on my fixture returned no scrolly row —

```
bar      | chart-native/bar      | interactive | mark=none
dumbbell | chart-native/dumbbell | interactive | mark=none
lollipop | chart-native/lollipop | video       | mark=none
```

— and attributed it to the mark, via `rank.ts`'s tier-2 readiness penalty. A reviewer re-ran
`buildOffer` on this same fixture against my own HEAD, **with the mark already gone**, and got the
identical three rows. I reproduced it:

```
=== propose() on HEAD (mark removed) ===
  bar | chart-native/bar | interactive | clean
  dumbbell | chart-native/dumbbell | interactive | clean
  lollipop | chart-native/lollipop | video | clean

=== the ranked legal set ===
  [5] bar | chart-native/bar | scrolly | kind=page | clean     ← clean, ranked 6th of 105
  clean scrolly candidates: 6 of 8
```

`bar/chart-native/scrolly` is clean and sits at rank index 5, and it *still* does not reach the
offer. The mark was never the cause. The real causes are untouched by this branch:

- **`lib/brain/offer.ts:58-62` skips by sheet `id`.** `bar/interactive` is taken first, so every
  other `bar` row — including `bar/scrolly` — is `seen` and skipped.
- **The reserved row (`offer.ts:70-79`) takes the best-ranked unseen id of an unseen KIND**, and
  `rank.ts:12-17`'s `FORMAT_ORDER` puts `video` (2) ahead of `scrolly` (3). So the reserved
  "different kind" row goes to `lollipop/video` (motion), not to a page.

My error was inferring a cause from a single before-observation without running the after. The
lesson is the one this repo already wrote down about the judge and the proof: I checked that the
number changed and not that my explanation of it did.

### What I actually earned at the offer

A **requested** scrolly. `lib/loop/driver.test.ts:624` drives a run with `requestedFormat:
"scrolly"`, which makes every offered row a scrolly row; before this branch all of them carried a
readiness note, and now at least one is clean (`expect(proposal.options.some((o) => !o.readiness))`).
A journalist who asks for a scrolly is no longer told, of every option, that it cannot be built.
That is the whole of the offer-side win, and it is real.

**The invisibility point survives, re-attributed.** A scrolly is still effectively unreachable
*unrequested*, for the two structural reasons above — id-level dedup and `FORMAT_ORDER`. Neither is
a mark, neither is fixed here, and fixing either changes what every offer looks like for every
format. Named as a follow-up below, against its real cause.

### Conclusion

Outcome 1 of the three, with a rider: **the mark is stale and goes** — and the two breaks it was
masking are the real, much smaller "article branch". Both are small. Both are fixed here.

---

## Phase 2 — what changed

### 1. The mark goes, for `scrolly`

`lib/brain/eligibility.ts`: `ARTICLE_BRANCH_ENGINES`, the `ARTICLE_BRANCH` capability id, the
`c.format === "scrolly"` clause that marked every scrolly candidate whatever its engine, and the
mark sentence are all gone. A scrolly the loop can build is offered clean; one it cannot (a scatter
track, a Datawrapper slug) keeps the mark it already earned from `buildabilityMark`, in that mark's
own words. What replaced the deleted block is a comment recording what was there and why it is not.

Re-measured on article-web after the change (8 of the KB's 10 scrolly sheets clear this fixture's
data limits):

```
scatter              | chart-native/scatter | MARKED  a "scatter" scrolly would caption itself …
bar                  | chart-native/bar     | clean
hex-grid             | map-native/hex-grid  | clean
choropleth           | map-native/choropleth| clean
cartogram            | map-native/cartogram | clean
locator              | map-native/locator   | clean
proportional-symbol  | map-native/symbol    | clean
image-scrolly        | image-native/…       | MARKED  an image scrolly walks the journalist's own …
```

### 2. `image-native` is decided separately, and KEEPS a mark — a true one

Its only format is `scrolly`, so it was never offerable unmarked at all. The *reason* the mark was
right for it is not the reason it claimed.

Measured: an image scrolly's walk is one beat per photograph the journalist declares with the run
(`lib/loop/beats.ts`). With no photographs, `nextActionsForElement` answers `draft-beats`,
`draftBeats` refuses, and the run answers the same impossible action forever — `deadEndReason` is
consulted only on `"choose-form"` (`lib/loop/driver.ts`), so nothing catches it. Offering the form
CLEAN to a run with no photographs would strand it.

`eligibility.ts` cannot tell the two runs apart: its input is facts + channel + readiness +
themeBg, deliberately, and `run.input.images` is not among them. So the form stays MARKED — with
the sentence that is actually true. The wording is now declared once
(`IMAGE_SCROLLY_PHOTOGRAPHS_NEEDED`, `lib/brain/beats.ts`) and read by both the offer's mark and
the drafter's refusal, the same discipline `MAP_TRACK_BEATS_REFUSAL` already follows. The mark is
NOT added to `requires` — no newsroom setting declares a photograph.

**And it costs exactly what I diagnosed for scrolly — said plainly, in the docstring and here.**
The mark is unconditional, and `rank.ts` tier 2 grades on severity, so a `missing`-marked
image-scrolly sorts below every ready candidate and never reaches the three-row offer. image-native
declares one format, so that is the whole engine: **a newsroom that HAS declared its photographs
still cannot be offered the form.** Marked, here, means *unreachable*, not *warned about*.

I kept it anyway, and the reasoning is on the evidence rather than on convenience: offering it clean
strands a run that has no photographs, which is worse, and this is no worse than `main`. But it is a
debt, not a design, and the docstring now says so in those words instead of implying the journalist
merely sees a warning.

**Named follow-up, in the code:** the day `eligible()` is given the run's declared inputs, this
mark should fire only for a run that has none — and the form becomes reachable for the run that has
them. Secondary, noted at the same place: the mark keys on `engine`, not `(engine, format)`, which
is correct only while image-native declares a single format.

### 3. Break A — a scrolly's height is content-driven, and the HTML capture path says so

- `lib/loop/assemble/index.ts` — `heightPolicyFor` answers `"content-driven"` for the `scrolly`
  host and for `image-native`. Keyed on the BUILDER, which is what `lib/loop/verify.ts` already
  resolves (`resolveBuilder(chosen)`), so it covers every track the host hosts while leaving those
  same engines' non-scrolly forms pinned. One line, at the place the loop already keeps engine
  knowledge, handed to `capture` as neutral vocabulary — no chart-type list moves into `lib/verify`.
- `lib/verify/capture.ts` — `captureHtml` consults `heightPolicy`, mirroring `captureStatic`: the
  **height** leg of `capture:fits-viewport` is dropped, the **width** leg is checked as hard as
  before, the relaxation is named in the check's own `detail`, the policy is recorded on every
  `CaptureRecord` (conditionally, for the I6 round-trip), and the ceiling the height still has is
  emitted as `capture:height-within-bound`. A runaway walk still fails loudly.
- `lib/verify/capture.ts` — **the ceiling is now per shape.** See the ruling below.

### The ceiling constant — my ruling: a per-shape number, not a rewritten comment

`CONTENT_HEIGHT_LIMIT_MULTIPLE = 10` argues itself entirely from rows ("a runaway row count lands
20-50x out"). A scrolly's card is `min-height: 90vh` (`Scrolly.tsx:495`), so its height is not
merely content-driven — it is a multiple of the viewport, and **the ratio IS the card count**:

```
ratio = 0.9 x cards = 0.9 x (beats + 2)          [measured: 4 beats → 6 cards → exactly 5.4x]
```

So 10x is crossed at **ten beats** (12 cards, 10.8x) — a warning filed on a completely correct
artifact. The derived walk cannot reach it (`lib/brain/beats.ts` caps a line at first + two interior
+ last, a bar at three leaders + the tail — four either way), but an **authored anchor list is not
capped at all**, and neither is a map track's derived walk. A ten-beat scrolly is a long read.

I took the second option offered — **a per-shape number** — rather than writing the second shape
into the existing comment, for one reason: one constant serving two shapes is exactly the "two
registries of the same fact" failure this codebase has already paid for twice, except worse,
because here it is one registry answering two different questions. A comment explaining that the
number is wrong for one of its callers documents the defect instead of removing it.

`SCROLL_HEIGHT_LIMIT_MULTIPLE = 30`, keyed on `format === "scrolly"` through
`heightCeilingMultiple(format)`, which both capture paths now call so they cannot drift. The key is
**core vocabulary**, not engine knowledge — the same axis `viewport.ts` already keys
`RESPONSIVE_FORMATS` on — so invariant I2 holds and image-native's scrolly (frames x viewport, the
same shape) is covered by the same key.

Thirty is *chosen* the way ten was, and I say so in the comment rather than dressing it as derived:
30x admits ~31 beats, published scrollytelling runs 8-15 steps, and the failures the check exists to
catch are nowhere near it (a map track deriving one chapter per row of a 200-row table lands ~180x).
Same "separates long from broken with room on both sides" property, measured on the right shape.

Three tests pin it: a 14x walk now passes, a 35x one still fails, and **a 14x `interactive` still
fails** — the last is what proves this is a per-shape number and not a blanket loosening.

### 4. Break B — the scrolly scaffold paints its own alt description

`skills/scrolly/src/Scrolly.tsx` renders a trimmed `config.altInsight` as a visually-hidden `<p>`
inside `[data-splash-root]`, mirroring `ChartFrame.tsx`'s WCAG 1.1.1 emission. The style constant
is copied rather than imported on purpose: this package's build must not pull chart-native's frame
into a map or image scrolly that renders no chart. Absent or blank ⇒ no node, so every existing
sample, map and image render is byte-identical (pinned as a test).

### 5. Everything that pinned or referenced the mark

- Tests rewritten to pin what is now true rather than deleted: `lib/brain/eligibility.test.ts`
  (four), `lib/loop/driver.test.ts` (one). The "marked, never removed" rule they exist to protect
  is unchanged; only the mark they exercised it with moved. One fixture key moved from `line` to
  `slope` — while the branch mark fired on the FORMAT, that test could not tell a hosted track from
  an unhosted one, and now it can.
- Stale comments corrected where they asserted the branch did not exist or that this mark masked
  another: `lib/core/vocabulary.ts` (the `DELIVERABLE_KIND` note, which pointed at the deleted
  constant), `lib/loop/buildable.ts` (both the five-readers header and the `heightPolicyFor`
  reader, which is no longer harmless), `lib/loop/propose.ts`, `lib/loop/choose.ts`,
  `lib/loop/manifest.ts`, `lib/loop/resume.ts`, `lib/brain/eligibility.ts`.
- `skills/splash/SKILL.md` §4 listed the branch as one of the three sources of a mark. Now lists
  the three that exist.
- `docs/splash/capability-matrix-2026-07-28.md` gains a **"G5 — closed"** section. The measurement
  is left standing (it is what `main` did when it was written); what is corrected is its verdict.
  The addendum also corrects G4 in passing: the three dw-chart-keyed scrolly rows it predicts are
  NOT in the offer and were never masked by this mark — `producerForFormat` stopped redirecting a
  Datawrapper engine into the scrolly host before the matrix was measured, and `eligible()`'s
  producer-format filter drops them (`lib/loop/scrolly-routing.test.ts` enumerates it). G4's
  `isLoopBuildable` over-claim is real; its offer consequence is not.

---

## What I did NOT close, and why

### ★ THE IMMEDIATE NEXT QUESTION: nothing measures a scrolly against the frame it ships in

Stated first because it is a consequence of *this* branch, not a musing. `capture` measures the
deliverable against the **channel's** container (article-web, 1200x675) and against
`DestinationProfile` — it never sees `metadata.height`, the number that actually goes into the
delivered `<iframe>`. That was harmless while `fits-viewport` complained about any tall page: the
complaint was wrong about the container but it was at least *a* signal that a scrolly does not sit
in a box.

**I switched that signal off.** Correctly — it was measuring the wrong box and blocking every
correct scrolly — but the result is that a 3645px walk delivered into a `width="700" height="420"`
iframe now produces **nested scrollbars and not one check anywhere says so.** The height ceiling
does not catch it either: it is a ratio against the capture container, not against the frame.

So this is not "a default nobody has chosen". It is a **hole this branch opened at the seam between
verify and delivery**: the two layers measure against two different boxes and neither owns the one
the reader sees. The next question is which layer learns `metadata.height` — capture taking the
delivery box as a `DestinationProfile`, or delivery deriving the frame from the artifact's measured
shape. Both are real designs; picking is not mine to do unasked, but the gap is now named and
attributable rather than left for someone to find in a newsroom's CMS.

### The snippet default itself

**The embed snippet's default sizing is chart-shaped.** The delivered snippet is
`<iframe … width="700" height="420">`, and the responsive alternative
(`RESPONSIVE_TEMPLATE`, `lib/delivery/snippet.ts`) is `aspect-ratio:16/9`. Both are calibrated for
a chart in a box, and a scrolly inside either is a scrolly in a box — the one place where "takes
over the reader's scroll" arguably *should* reach the hand-over.

Nothing breaks on it: `metadata.height` is a newsroom setting (`decor.state.delivery.height`) with
420 as the fallback, the snippet renders, delivery succeeds, and a newsroom that sets its own
template or `"responsive"` gets what it asked for. So this is not a chain break — it is a
**default** that has never been chosen for a scrolly.

I left it alone deliberately. Picking the right one is a design decision (a full-height iframe? a
`height:100vh` frame? a `postMessage` auto-resize handshake, which is what most CMS scrolly embeds
actually use?), it changes what every existing newsroom's embeds look like, and none of it is
implied by the question this branch was asked.

### Follow-up: a scrolly is still unreachable UNREQUESTED, and the mark was never why

Re-attributed after the retraction above. `lib/brain/offer.ts:58-62` dedups by sheet `id`, so a
sheet's scrolly row dies once any other format of that sheet is taken; and the reserved-row rule
(`offer.ts:70-79`) picks the best-ranked unseen KIND, which `rank.ts`'s `FORMAT_ORDER` hands to
`video` (2) ahead of `scrolly` (3). Both predate this branch and neither is touched by it. Fixing
either changes every offer for every format, which is why it is named rather than done.

The same two rules are what make `image-native` unreachable (see above) — one structural cause,
two visible symptoms.

---

## Verification

- `cd lib && bunx tsc --noEmit` — clean.
- `bun test lib/loop/scrolly-e2e.test.ts` (always-on half) — 1 pass.
- `SPLASH_SCROLLY_E2E=1 bun test lib/loop/scrolly-e2e.test.ts` — **2 pass, 0 fail**. Every capture
  check passes at all three breakpoints, `findings: none`, and the approval gate is reached with an
  EMPTY override list.
- `bun test lib/verify` in isolation — 166 pass, 0 fail.
- `bun run check` — **22/22 checks passed** (9 tsc, 13 test suites), on the final tree.

### The flake, reported rather than smoothed over

On an intermediate run, `lib/verify/capture-html.test.ts` hit the known Playwright contention flake
under `bun test lib`'s file-level parallelism — first as a 180 s timeout, then as
`Failed to connect … ENOENT` at browser launch — while passing 18/18 in isolation and 166/0 for the
whole `lib/verify` directory. That is the flake this repo already documents, and my four new
browser-launching cases widened the window for it.

I did not weaken anything to make it go away. What changed is the two negative cases' FIXTURE: they
were re-declared onto a 300x100 destination at `deviceScaleFactor: 1` (from article-web at scale 2,
which meant a 20000 px page screenshotted across three breakpoints — roughly 100 megapixels of PNG
for two boolean assertions). The rule under test is a RATIO and does not care which box it is a
ratio of; the assertions are identical. The positive control keeps the realistic article-web box.

The final `bun run check` above ran every one of these green. Nothing is reported as a pass that was
not observed as one.

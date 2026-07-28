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

### A third finding, at the offer

The mark was not only an annotation. `lib/brain/rank.ts` tier 2 grades on readiness severity, so a
`missing`-marked candidate ranks below every ready one. Probed on the same fixture through the
real `propose()`:

```
refusal: (none)
  bar      | chart-native/bar      | interactive | mark=none
  dumbbell | chart-native/dumbbell | interactive | mark=none
  lollipop | chart-native/lollipop | video       | mark=none
```

No scrolly row at all — even though `DELIVERABLE_KIND["scrolly"] = "page"` reserves the offer's
last row for a kind not yet on the table (`lib/brain/offer.ts`), and the reserved row went to a
video instead. In practice scrolly was not "offered marked", it was **invisible**; the capability
matrix's "15 MARKED, 0 clean" is what `eligible()` produced, not what a journalist saw.

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

**Named follow-up, in the code:** the day `eligible()` is given the run's declared inputs, this
mark should fire only for a run that has none.

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
  emitted as `capture:height-within-bound` against the same `CONTENT_HEIGHT_LIMIT_MULTIPLE` the
  static path uses. A runaway walk still fails loudly.

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
implied by the question this branch was asked. It is the honest next question, not this one.

---

## Verification

- `cd lib && bunx tsc --noEmit` — clean.
- `bun test lib/loop/scrolly-e2e.test.ts` (always-on half) — 1 pass.
- `SPLASH_SCROLLY_E2E=1 bun test lib/loop/scrolly-e2e.test.ts` — **2 pass, 0 fail**. Every capture
  check passes at all three breakpoints, `findings: none`, and the approval gate is reached with an
  EMPTY override list.
- `bun test lib/verify` in isolation — 166 pass, 0 fail.
- Full-suite note: `lib/verify/capture-html.test.ts` hit the known Playwright contention flake
  (`Failed to connect … ENOENT` at browser launch, and once a timeout) during `bun test lib`, and
  passes 18/18 in isolation. Reported as a flake, not as a pass and not as a failure. The two new
  negative cases were re-fixtured onto a declared 300x100 destination at `deviceScaleFactor: 1` to
  cut their cost by three orders of magnitude — the rule under test is a RATIO and does not care
  which box it is a ratio of.
- `bun run check` — see below.

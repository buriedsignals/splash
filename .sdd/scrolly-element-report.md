# Is a scrolly an embeddable element? — measured, then acted on

Branch `feat/scrolly-is-an-element`, worktree `/Users/rmdms/Sites/Professional/splash-scrolly-element`.

The claim under test is the one `lib/brain/eligibility.ts` puts on **every** scrolly candidate:

> "this is the whole-article branch — it is not built yet, and it changes what gets delivered"

Two assertions in one sentence. Phase 1 measured both.

---

## Phase 1 — what I ran, and what I saw

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
today; `lib/loop/resume.ts:41` says so. The declaration is a statement about the fixture, not a
lever.)

Opt-in behind `SPLASH_SCROLLY_E2E=1`, like every other real-render proof in this roster; the
always-on half of the file asserts the three routing tables in milliseconds.

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

The delivered `<iframe>` snippet is the whole answer to the second half of the mark's sentence.
A scrolly is handed over as an embed, in an iframe, exactly like an interactive.

### Verdict on the sentence, in two halves

**"it is not built yet" — FALSE, and stale.** The chain runs end to end with zero code changes.
Nothing under `lib/delivery/` special-cases a scrolly; `DELIVERY_GENRE` maps `scrolly: "embed"`,
the same genre as `interactive`; `lib/loop/deliver.ts`, `lib/loop/preview.ts`,
`lib/loop/approve.ts` and `lib/verify/*` branch on `static` / `video` / hosted-vs-file and never
on `scrolly`. Re-verified by reading, and then by running.

**"it changes what gets delivered" — FALSE.** What gets delivered is one self-contained HTML file
of the embed genre, routed to the same publishers, packaged with the same iframe snippet. Nothing
about the delivery differs.

### But TWO real breaks, both in the VERIFY leg

The walk only reached `approve` because the test's ceremony overrode two blocking findings. They
are not incidental — both fire on **every** scrolly, at **every** breakpoint, structurally:

```
capture:fits-viewport      fail  the component ends at y 3645, x 1200, outside its
                                 1200x675 container (document scrolls to 1200x3645)
capture:furniture-present  fail  no element carries the alt-text text
                                 "L'étendue minimale de septembre est passée de 7 à 4,3 …"
```

→ findings `component-overflows-viewport(blocking)` and `furniture-missing(blocking)`.

**Break A — `capture:fits-viewport`.** A scrolly is 3645 px tall in a 675 px box because a scrolly
*is* its own scroll: six cards of narrative walk. This is precisely the "takes over the reader's
scroll for its own height" property — a real editorial difference, and *not* a delivery one. The
verify layer already owns the vocabulary for exactly this shape: `HeightPolicy: "content-driven"`
(`lib/verify/types.ts:120`), built for Datawrapper's row-driven exports whose height belongs to
their rows. It was simply never declared for the scrolly host, and the HTML capture path
(`captureHtml`) never consulted `heightPolicy` at all — only the static path did.

**Break B — the alt-text is never painted.** `assembleChartNative` puts `angle.altInsight` into
the scrolly config (probed: the assembled config carries `"altInsight": "…"`), but the scrolly
scaffold never renders it. chart-native's visually-hidden description comes from
`AltInsightContext.Provider` in **chart-native's own** `mount.tsx`; `skills/scrolly/src/mount.tsx`
has no equivalent, and `Scrolly.tsx` paints title / unit / source / credit and nothing else. So
every chart-track scrolly ships without the WCAG 1.1.1 description its own config carries. A real
defect, small and specific.

### A third finding, at the offer

The mark is not only an annotation. `lib/brain/rank.ts` tier 2 grades on readiness severity, so a
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
video instead. In practice scrolly is not "offered marked", it is **invisible**; the capability
matrix's "15 MARKED, 0 clean" is what eligibility produces, not what a journalist sees.

### Conclusion

Outcome 1 of the three, with a rider: **the mark is stale and goes** — and the two breaks it was
masking are the real, much smaller "article branch". Both are small. Both are fixed here.

`article-branch` is also **not** a `NEWSROOM_CAPABILITIES` id (checked — the ids are dw-chart,
map-dw, chart-native, map-native, scrolly, image-native, embed-*, zip). So it was a `requires`
entry no newsroom could ever satisfy, carried into the manifest on every scrolly option and
surfaced to the journalist as a requirement. That is exactly the "capability nobody can satisfy"
that must not linger.

---

## Phase 2 — what changed

### 1. The mark goes, for `scrolly`

`lib/brain/eligibility.ts`: `ARTICLE_BRANCH_ENGINES` and the `ARTICLE_BRANCH` capability id are
gone, together with the `c.format === "scrolly"` clause that marked every scrolly candidate
whatever its engine, and the mark sentence itself. A scrolly the loop can build is now offered
clean; a scrolly it cannot (a scatter track, a Datawrapper slug) keeps the mark it already
earned from `buildabilityMark`, in that mark's own words.

### 2. `image-native` is decided separately, and KEEPS a mark — a true one

Its only format is `scrolly`, so it was never offerable unmarked at all. The *reason* the mark was
right for it is not the reason it claimed.

Measured: an image scrolly's walk is one beat per photograph the journalist declares with the run
(`lib/loop/beats.ts:65`). With no photographs, `nextActionsForElement` answers `draft-beats`,
`draftBeats` refuses, and the run answers the same impossible action forever — `deadEndReason` is
consulted only on `"choose-form"` (`lib/loop/driver.ts`), so nothing catches it. Offering the form
CLEAN to a run with no photographs would strand it.

`eligibility.ts` cannot tell the two runs apart: its input is facts + channel + readiness +
themeBg, and `run.input.images` is not among them. So the form stays MARKED — with the sentence
that is actually true ("an image scrolly walks your own photographs…") instead of the one that is
not ("the whole-article branch is not built yet"). The follow-up that would let the mark
disappear for a run that HAS declared photographs is named in the code.

### 3. Break A — a scrolly's height is content-driven, and the HTML capture path says so

- `lib/loop/assemble/index.ts` — `heightPolicyFor` answers `"content-driven"` for the `scrolly`
  host and for `image-native`. One line each, at the one place the loop already keeps engine
  knowledge, handed to `capture` as neutral vocabulary. No chart-type list moves into `lib/verify`.
- `lib/verify/capture.ts` — `captureHtml` consults `heightPolicy`, mirroring `captureStatic`
  exactly: the **height** leg of `capture:fits-viewport` is dropped, the **width** leg is checked
  as hard as before (a page wider than its container overflows on any policy), the relaxation is
  named in the check's own `detail`, the policy is recorded on every `CaptureRecord`, and the
  ceiling that the height still has is emitted as `capture:height-within-bound` against the same
  `CONTENT_HEIGHT_LIMIT_MULTIPLE` the static path uses. A runaway scrolly still fails loudly.

### 4. Break B — the scrolly scaffold paints its own alt description

`skills/scrolly/src/Scrolly.tsx` renders `config.altInsight` as a visually-hidden `<p>` inside
`[data-splash-root]`, mirroring `ChartFrame.tsx`'s WCAG 1.1.1 emission. Absent `altInsight` ⇒ no
emit, so every existing sample/map/image config renders byte-identically.

### 5. Everything that pinned the mark

`lib/brain/eligibility.test.ts` (four tests), `lib/loop/driver.test.ts` (one). Each was rewritten
to pin what is now true rather than deleted — the "marked, never removed" rule they exist to
protect is unchanged; only the mark they exercised it with moved.

---

## Verification

See the final section of this file for the gate result.

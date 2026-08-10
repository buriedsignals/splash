# Audit — W2, the palette to the seeds and the credits at the bottom

Read-only audit of `specs/W2-palette-and-credits.md` and everything it governs, against the tree at
`experiment/doctrine-twin` HEAD `dd01abf0`. Nothing in this chantier was changed; the only file
written is this one.

**Method.** Every count below was re-measured on this tree rather than taken from a commit message,
a `SKILL.md` or a session record. Every guard the spec promises was **mutated in a copy of the tree
under `/tmp/w2audit`** and watched; a guard is reported as working only where a mutation was seen to
redden it. Where the question is what a reader sees, the committed artifact was opened — the PNG,
the SVG's `<text y>` against its `viewBox`, the HTML's DOM order — never a hex grepped out of a
bundle.

**The tree carries uncommitted work from another session** in W2-adjacent territory
(`twin-palette/scripts/palette.mjs`, `twin-newsroom-charter/*`, `twin-scrolly/*`). It is noted where
it changes an answer; it changes none of the conclusions.

**W2 landed in five commits:** `38a0599f` (§1), `15ffd373` (§2), `d78f9553` (§3.4.1), `1052d823`
(§3.4.2, part), `bc7d3a68` (§3.6/§3.7).

---

## 1. Was the spec followed?

**§1 (B3.3) — followed, and improved.** The cap is gone from
`skills/twin-chart-web/scripts/render-web.mjs` and from `.scrolly-header`; `.step-panel`'s
`max-width: min(46ch, 100%)` is untouched (`render-scrolly.mjs:483`), as §1.2 required. Sixteen
committed HTMLs were re-rendered — `640px` survives in them only inside the paragraph explaining its
removal (`webx-carbon-footprint/carbon-footprint.html:30-31`). Both doc reversals landed
(`web-discipline.md:135-137`, `scrolly-discipline.md:566`).

**§2 (B1.2) — followed.** Three `render-still.mjs` copies vendored, seven `PALETTE.md` at the seven
craft-skill roots, eleven runners switched. The §2 commit contains **no `preview.png`**, which is the
strongest available proof of the spec's own acceptance test: the previews came out byte-identical, so
no value drifted.

**§3 (B1.1) — started, not finished.** §3.4.1 (five seeds) and §3.3 (the re-pointed map guard) are
done. §3.4.2 delivered **3 of 13**. §3.4.3 (video), §3.4.4 (map beats), §3.4.5 (map-web), §3.4.6
(scrolly) and §3.4.7 (the legacy four) are **not started**. §3.6's two doc reversals landed anyway
(`static-discipline.md:139-165`, `information-architecture.md:56-70`), so doctrine currently
describes a placement that 55 of 64 components do not have.

### Divergences, each classified

| # | Divergence | Verdict |
|---|---|---|
| D1 | §2.2 instructs `origin: subject` and calls it "the least false of the three". Implementation writes **`origin: newsroom`** and argues it from measurement: `#0B7A75`/`#FFFFFF` are `NEWSROOM.example.md`'s `brandColor`/`ground`, and `SUBJECT_CONVENTIONS` holds none of them (`skills/twin-chart-beat/PALETTE.md`, closing paragraph). | **Improvement.** It also retires §6's residue "`origin` has no honest value for a seed" — there was one, and nobody had looked. |
| D2 | §1.4 says of B3.3 "**None, and none is warranted**… Do not invent a 'no `max-width` in `buildCss`' scan". Implementation adds one — but by **inverting the existing assertion** that used to demand the cap (`skills/twin-chart-web/test/seed-fluid-frame.test.ts:123-146`), scoped to rules whose selector names `.chart-header|source|title|caveat`, with no exemption list. Mutation M8 below reddens it. | **Improvement.** It avoids the exemption-list failure mode the spec feared, and it means nobody can silently reinstate the cap. |
| D3 | §3.7 Guard A: "Walks every `.tsx` under `twin/`". Implementation sets `ROOTS = ["skills"]` (`credit-anchors-to-the-frame-bottom.test.ts:50`) and states the reason in its header. | **Regression against the spec's stated purpose**, honestly disclosed. See §4 hole H1 — the mutation is below and it stays green. |
| D4 | §3.7 promises **three** guards. Only Guard A exists. Guard B (HTML byte order) and Guard C (SVG `y` in the bottom eighth) were not written; the guard's header defers C. | **Regression.** Both were cheap and both would have measured what a reader sees; I ran them by hand in minutes (§5). |
| D5 | Guard A's spec text names `sourceBaseline`/`sourceTop`. Implementation also matches `sourceBottom` and **follows the chain** when `sourceTop` is derived from it (`:126-129`), recording in a comment that not following it let a mutation pass its own first draft. | **Improvement**, and an honestly reported near-miss. |
| D6 | §2 claims "0 of 12 → 12 of 12" as its own work. Two of the eleven sites — `twin-map-beat/scripts/render-map.mjs:54` and `render-preview.mjs:104` — were switched by `dcc71f79`, a commit whose subject is about geometry-core naming (`git log -S readPalette` on those paths returns only `dcc71f79`). That commit added **no** `PALETTE.md`; `twin-map-beat/PALETTE.md` arrives one commit later in `15ffd373`. | **Unnoticed drift.** Between those two commits the map seed read an answer that did not exist and could only have thrown. `seed-renders-standalone.test.ts` lists `twin-map-beat` and has no skip condition, so the suite could not have been green there. |
| D7 | `twin-palette/SKILL.md:112-114` records "12 of 12" seed runners and "16 of 70" beats; the session record says 11 of 12. | **Unnoticed drift**, minor and in the harmless direction. Measured today: **11 of 12 runners call `readPalette`**, the twelfth names no colour at all; **20 of 75 beats**, not 16 of 70 — the denominator moved when new beats landed the same day. |
| D8 | §1.3 says `web-discipline.md`'s other mentions of the source line are "about height, not width — leave them". `web-discipline.md:296` now asserts the cap is "**Not touched by this narrowing**" and that "its guard scans the whole stylesheet". | **Not a divergence after checking** — the sentence is about W4's `@media` narrowing, and thanks to D2 the guard it claims does exist and does scan the whole stylesheet. Verified, not assumed. |

---

## 2. What the spec promises that is NOT in the tree

### B1.2 — the palette. The session record's "11 of 12" is right; the real number, per genre:

| population | reaches a recorded palette | measured by |
|---|---|---|
| craft-skill seed runners | **11 of 12** call `readPalette`; the 12th, `twin-map-web/scripts/render-preview.mjs`, names no colour and delegates to `render-web.mjs` | walk of `skills/*/scripts/render-*.mjs` |
| craft skills holding their own answer | **7 of 7** `PALETTE.md` at skill root | `ls skills/*/PALETTE.md` |
| `render-still.mjs` copies carrying `readPalette` | **9 of 22** (the 13 `proof/` map copies reach the shared one through `#shared/…`) | `find` + `grep -c "^export function readPalette"` |
| beats under `proof/` | **20 of 75** | beats with a `BRIEF.md` whose own `.mjs` calls `readPalette(` |

So B1.2 is genuinely closed **for the seeds** — the one population the spec argued was the whole
item. The 55-beat backlog is unchanged and named as such in `SKILL.md`'s front matter, which is
honest.

### B1.1 — the credits. **Confirmed outstanding**, and the per-genre picture is uneven:

| genre | seed | beats | evidence |
|---|---|---|---|
| static chart | ✅ `ChartSeed.tsx:323` | **3 of 17** | 14 of the 17 committed `*-still.svg` draw their source `<text>` in the top quarter (e.g. `static-wind-vs-solar-still.svg` y=118 of h=560); the 3 migrated sit at y≥h−40 |
| chart video | ✅ `EmissionsVideo.tsx` | **0 of 16** | all 16 `vid*/video-*` components still derive `sourceBaseline` from a header rung |
| chart web (fluid) | ✅ `ChartWebSeed.tsx` | **17 of 17**, already | in every shipped HTML the `chart-source` byte offset exceeds the first `<svg>`'s — Guard B's own measurement, run by hand |
| map static + video | ✅ `Co2MapStill.tsx:147-148`, `Co2MapVideo.tsx`, guard re-pointed at `:170-174` | **0 of 16** | |
| map × web | ❌ **seed not migrated** | 0 of 2 | `MapWebSeed.tsx:163` still renders `<p className="mw-source">` as the **second** child, under the title — and the committed `skills/twin-map-web/assets/preview.png` shows it there |
| scrolly | ❌ **seed not migrated** | 0 of 6 | `render-scrolly.mjs:140` draws `<p class="source">` inside `<header class="scrolly-header">` (`:138`); confirmed in the shipped artifact — in `scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html` the header opens at byte 20067 and `.scrolly-track` after it |
| legacy two-rung (4) | — | **0 of 4** | `more-heatmap-co2-per-capita-decades/co2-heatmap.html` draws the source at y=143 of a 839-high viewBox; `mapgen-hexgrid-web` at y=98 of 794 |
| image beat | n/a — per-photo credits only | — | as §6 records; still an editorial question |

**Totals: 9 of 64 components** carry a bottom-anchored credit (5 seeds, 3 static beats, and
`portrait-aspect-probe/PortraitLine.tsx`). §3.4.5 and §3.4.6 are the two that matter most, because
they are **seeds**: until they land, the multiplier the whole chantier is built on runs backwards for
map × web and for every scrolly.

**Positive evidence the multiplier works.** `PortraitLine.tsx:234` is the only component written
after the seed migration, and it carries `const sourceBaseline = height - PAD;` without anyone
asking — its artifact puts the credit at y=1872 of 1920
(`proof/portrait-aspect-probe/l-a-seed-itself.svg`).

### B1.3 — the typeface. **Confirmed outstanding, and it is now the same shape the palette had.**

`FONT_FAMILY = "Helvetica, Arial, sans-serif"` is a hard literal in every `render-still.mjs` copy
(`skills/twin-chart-beat/scripts/render-still.mjs:26` and its six siblings) and in
`EmissionsVideo.tsx:55`. There is no `TYPEFACE.md`, no `readTypeface`, nothing. Meanwhile
`NEWSROOM.example.md` records `typefaces: "Source Serif, Source Sans"`,
`twin-newsroom-charter/scripts/derive-charter.mjs:194` **measures** them off the newsroom's own site,
and `newsroom.mjs:6` reads them back — and no render takes them. That is precisely the failure
`readPalette`'s own header names: *"an instruction to copy by eye, which is exactly how a newsroom's
identity gets collected and then never used"*. W2 removed it for colour and left it standing for
type, in the same files.

---

## 3. What was built that the spec did not ask for

Little, and all of it defensible:

- **The B3.3 guard** (D2) — explicitly told not to build one, built a better one.
- **`sourceBottom` in Guard A's regex and the chain-following** (D5) — a real hole the spec's
  narrower rule would have left open.
- **`origin: newsroom` and its argument** (D1) — five paragraphs of prose in each of seven
  `PALETTE.md` explaining what the file is and that a story root overrides it. Not asked for; it is
  what makes a copied skill directory legible.
- **The parity guard's header was rewritten** in `15ffd373` (`render-still-parity.test.ts:19-30`).
  I checked the diff line by line for a loosened assertion: there is none — the change is comment
  text plus one Prettier reflow of `stripComments`. Worth stating, because widening a guard's
  exemptions while widening its population is exactly how this branch has been burnt before.

Nothing was built that the spec forbade. No new shared module; the twin's duplicate-and-walk rule
holds throughout.

---

## 4. The holes — what the journalist hits that neither spec nor implementation covers

### H1 — Guard A does not stop the regeneration it exists to stop. *(mutation, stayed green)*

The spec's own justification for Guard A is that "a beat copied from an un-migrated component fails
the moment it lands" (`W2-palette-and-credits.md:519`). It does not. I added
`proof/fake-new-beat/FakeBeat.tsx` in the `/tmp` copy with `const sourceBaseline = titleBaseline +
26;` — the exact defect — and the guard reported **6 pass, 0 fail**. `ROOTS = ["skills"]` cannot see
`proof/`. The implementation's header discloses the boundary and argues it well (pointing at `proof/`
today reddens ~52 shipped beats); the point stands that the property claimed is not the property
delivered, and the next beat can still arrive with the defect in it.

### H2 — a recorded house colour that fails the contrast floor is accepted in silence. *(confirmed at the rendered pixel)*

`parsePalette` (`skills/twin-chart-beat/scripts/render-still.mjs:125-146`) validates hex shape and
`origin`, and measures **nothing**. I wrote a `PALETTE.md` with `ground: "#FFFFFF"`, `accent:
"#FFFF00"` (1.07:1) and rendered the static chart seed. It produced a clean PNG, no warning, no
refusal — a nearly invisible line, and the beat's whole number, *"the sample town 604 mm"*, set in
yellow on white. `/tmp/yellow/preview.png`, opened and looked at.

The floor exists **only in the proposal**: `twin-palette/scripts/palette.mjs:37-43` holds the 3:1
non-text minimum and `format-proposal.mjs:12-32` shows a failing option failing with the nearest
passing variant beside it — and then deliberately lets the journalist take it anyway
(`format-proposal.mjs:50-57`, "a proposal a journalist cannot refuse is not a proposal"). That is a
defensible design; the hole is that there is **no second line of defence at render**, so any
`PALETTE.md` written by hand, copied from another story, or produced by another path renders
whatever it says.

And there is such a path: **`twin-newsroom-charter` — the skill A2 sends the journalist to when they
have no profile — contains no contrast arithmetic at all.** `grep -rn "contrast\|luminance"` over
the whole skill returns nothing. It measures a newsroom's site, proposes `brandColor` and `ground`,
and never checks that the pair is legible together.

Invariant 1 says nothing renders in a colour nobody chose. It is silent on a colour somebody *did*
choose that no reader can see, and nothing in the tree fills that silence.

### H3 — a palette richer than one accent plus one ground is silently truncated. *(confirmed)*

`parsePalette` returns exactly `{ ground, accent, origin, source }`. I fed it a front matter carrying
`secondary`, `tertiary` and `series`: they are parsed into the record and then **dropped without a
word**. `twin-palette/SKILL.md:3` is honest about it — "the two colours a beat is drawn in" — but the
rest of the tree invites more: `NEWSROOM.example.md` documents `accents: "#C1440E, #1F6FB2"` as
"a house palette is rarely one colour", and the uncommitted work in the tree adds `houseAccents()` to
`palette.mjs` to offer every one of them as a proposal option. The chain therefore now **measures**
several house accents, **proposes** several, and can **record and render exactly one**.

What the reader gets meanwhile: `proof/vidx-stacked-bar-swiss-electricity/StackedBarVideo.tsx:367`
builds its series fills as `[accent, muted, muted]` — series two and three are the same grey, on
every multi-series type. And on a choropleth the accent never touches the data at all:
`skills/twin-map-beat/assets/geo.ts:294-304` builds the ramp as `mixHex(ground, ink, …)`, ground to
ink. The committed `skills/twin-map-beat/assets/preview.png` shows it — a grey Europe with one teal
word on it. **A newsroom can change its house colour and its choropleth stays grey.**

### H4 — a newsroom with several languages is recorded and then forgotten. *(confirmed)*

`NEWSROOM.example.md` models this carefully (`languages: fr, de`, most-used first, with a paragraph
on how a bilingual newsroom is never guessed at), `derive-charter.mjs` reads it off `hreflang`, and
preflight reports it back. Downstream: **`grep -n "language" skills/*/scripts/render-*.mjs` returns
nothing.** No render takes a language. Every visible word is whatever the beat's author typed, and
nothing checks it against what the newsroom said it publishes in.

The concrete consequence is already in a seed: `skills/twin-chart-video/assets/EmissionsVideo.tsx:68`
hardcodes `new Intl.NumberFormat("fr-FR", …)`. Every video beat copied from it formats its numbers in
French regardless of the article's language — the same class of defect as the hex literals W2 just
removed, in the same file, and outside every guard W2 added (they match `ground|accent` only).

The `credit:` convention has the same shape: `NEWSROOM.example.md` records `credit: "Source :
{source} · Heidi.news"`, and `grep -rn "{source}"` finds no render that expands it. The newsroom's
standing credit line is collected at preflight and never reaches the credit W2 has just spent a
chantier moving.

### H5 — doctrine currently describes a placement most of the tree does not have

`§3.6`'s reversals landed in full while §3.4.2–3.4.7 did not, so `static-discipline.md:139` and
`information-architecture.md:56-70` now assert the bottom credit as the rule while 55 of 64
components contradict it. Nothing scans markdown, as the spec itself warns. This is a normal
mid-chantier state, but it is a state in which the repository's own documentation is the least
reliable description of it, and only a person will notice.

---

## 5. The guard ledger — every guard mutated, in `/tmp/w2audit`, never in this tree

Baseline in the copy: **43 pass, 0 fail** across the two new guard files.

| # | Guard | Mutation | Result |
|---|---|---|---|
| M1 | palette check 1 & 2 | restore `ground`/`accent` hex literals in `twin-chart-beat/scripts/render-preview.mjs` | **RED**, both checks, naming file and both values |
| M2 | palette check 2 | replace the read with `const GROUND_CONST = "#FFF" + "FFF"` (no `readPalette`) | **RED** — the laundered form is still caught, because the call is gone |
| M2b | palette checks 1–3 | keep a **decoy** `readPalette(...)` call *and* launder the literal | **GREEN** — the guard's disclosed ceiling. It proves a runner *mentions* the mechanism, never that the value read is the value drawn |
| M3 | palette check 3 | delete `skills/twin-scrolly/PALETTE.md` | **RED**, on both of that skill's runners |
| M4 | palette check 3 | `origin: house` in `twin-map-beat/PALETTE.md` | **RED**, through the real `parsePalette`'s own throw |
| M5 | Guard A | re-anchor `ChartSeed.tsx:323` to `titleBaseline + 26` | **RED**, naming the file, the rung and the expression |
| M-scope | Guard A | add a new `proof/` component anchored to a header rung | **GREEN** — hole H1 |
| M6 | `render-still-parity` | reword the throw message in the newly vendored `twin-scrolly/scripts/render-still.mjs:129` | **RED**, naming the file and the function `readPalette` |
| M7 | the re-pointed map guard | `LEGEND.barHeight: 200 → 400` in `Co2MapStill.tsx:43`, then render the seed | **RED** — throws at `:170`, with the new message naming the title and the legend. The baseline render at the same commit succeeds, so the throw is the mutation's |
| M8 | the B3.3 guard (D2) | reinstate `.chart-header, .chart-source { max-width: 640px; }` in `buildCss` | **RED** — `should cap neither the header block nor the source line` |

**Every guard W2 shipped can go red.** Two things it did not ship — Guards B and C — I ran by hand
instead, and both would have paid for themselves: the SVG scan is what produced the "14 of 17 static
beats still at the top" line above, and the HTML scan is what confirmed the 17 fluid web beats are
genuinely already correct rather than assumed to be.

**One caution on the hand-run HTML check**, recorded because it nearly became a false finding: on the
scrolly artifacts, comparing the source's byte offset against the first `<svg>` reports "bottom" and
is **wrong** — the first `<svg>` is an inline glyph far above the track. The credit's real position
was established by reading the DOM order (`<header class="scrolly-header">` at byte 20067, `.source`
inside it, `.scrolly-track` after). A byte offset is the same kind of evidence as a hex in a bundle.

---

## 6. Artifacts opened

- `skills/twin-chart-beat/assets/preview.png` — credit on the bottom margin, left-aligned with the
  title, teal from `PALETTE.md`. Correct.
- `proof/more-line-swiss-life-expectancy/…-still.png` — same, on a migrated beat.
- `skills/twin-map-beat/assets/preview.png` — the column reads title / gap / legend / no-data /
  caveat / **source last**, exactly as §3.3 specified. Also where H3 was seen: the ramp is grey.
- `skills/twin-map-web/assets/preview.png` — the credit sits **under the title**. §3.4.5 open, at the
  pixel.
- `/tmp/yellow/preview.png` — the seed rendered through a failing house accent, produced without a
  murmur. H2.
- 37 committed `*.svg`, measured `<text y>` against `viewBox` height; 21 committed `*.html`, measured
  DOM order; `proof/portrait-aspect-probe/l-a-seed-itself.svg` for the multiplier.

---

## 7. What I would do next, in the order the evidence supports

1. **Finish the two remaining seeds** — `MapWebSeed.tsx:163` and `render-scrolly.mjs:140`. They are
   §3.4.5 and §3.4.6, they are small, and until they land the seed argument that justifies the whole
   chantier is false for two genres.
2. **Give `parsePalette` the 3:1 floor**, or `twin-newsroom-charter` a contrast check, or both. H2 is
   the only finding here where a journalist ships something a reader cannot read, and the arithmetic
   already exists two files away (`palette.mjs:29-31`).
3. **Point Guard A at `proof/` as a migration**, one genre at a time, so H1 closes as each genre
   lands rather than never.
4. **Write Guards B and C.** They took minutes by hand and they are the only layer that measures the
   glyph rather than the expression.
5. Record H3 and H4 as chantiers. The typeface (W7), the second accent, the language and the credit
   convention are one shape: the newsroom's identity is measured, recorded, read back at preflight,
   and dropped before the render.

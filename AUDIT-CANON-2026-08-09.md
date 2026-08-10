# Canon audit — the 15 skills against the method the project chose

**Date** 2026-08-09 · **Scope** `twin/skills/**` — structure and documentation only. Rendered
artifacts are audited separately; nothing below is a judgement about a picture.

**The canon being audited** is the one `HANDOVER.md` §3 adopts: `SKILL.md` with its eight named
sections · every tuning knob a **number** with a named location · `references/` · `scripts/` ·
`assets/` (one seed + sample-data + preview) · `output-proof` · **no cross-skill imports, helpers
duplicated and guarded by `helper-parity.test.ts`** · nothing renders in a value nobody chose.

**Work in flight, excluded from the findings by instruction:** `palette` and the
`readPalette`/`parsePalette` pair being vendored into the `render-still.mjs` copies. Where that work
*reveals* a pre-existing structural hole, the hole is reported and the WIP is named as the messenger,
not the defect. Those cases are marked **(WIP-revealed)**.

---

## 1. The table

`✓` holds · `~` holds with a named deviation · `✗` fails · `n/a` legitimately absent for what the
skill is.

| Skill | 8 sections | Knobs all numbers | Knob "Where" names a file | `references/` | `scripts/` | `assets/` seed+data+preview | `output-proof` | Unguarded dup. helpers | False prose found |
|---|---|---|---|---|---|---|---|---|---|
| `splash` | ✓ (+1 extra) | ✓ | ✗ 3 rows | ✗ absent | ✓ | ~ root-template, not a seed (n/a) | n/a produces nothing | — | — |
| `intake` | ✓ | ✗ **0 of 3** | ✗ **0 of 3** | ✓ (1 file) | ✓ | n/a | n/a | — | — |
| `storyboard` | ✓ | ✓ | ✗ 3 rows | ✓ | ✓ | n/a | n/a | — | ~ Files omits 2 shipped files |
| `doctrine` | ✓ | ✗ 1 row ("not a number") | ✗ 4 rows | ✓ (7 files) | ✓ | n/a | n/a | — | ✗ reference-doc count |
| `deliver` | ✓ | ✗ 2 string rows | ✗ 6 rows | ✓ | ✓ | n/a | n/a | — | — |
| `newsroom-charter` | ✓ | ✗ 3 list rows | ✓ | ✓ | ✓ | n/a | n/a | — | ✗ knob contradicted by code |
| `chart-beat` | ✓ | ✓ | ✗ 2 rows | ✓ | ✓ | ✓ | ✓ | — | ✗ **2** |
| `chart-web` | ✓ | ✓ | ✗ 1 row | ✓ | ✓ | ✓ | ✓ | ✗ tick helpers | — |
| `chart-video` | ✓ | ✓ | ✗ 6 rows | ✗ **absent** | ✓ | ✓ | ✓ | ✗ `fr`, geometry trio | ✗ **2** |
| `dw-beat` | ✓ | ✗ 3 rows | ✗ 5 rows | ✓ | ✓ | n/a (delegated render) | ✗ **gap** | — | ✗ "exactly four scripts" |
| `map-beat` | ✓ (+1 extra) | ✗ 1 row | ✗ 5 rows | ~ `types/` only | ✓ | ✓ | ✓ | ✗ bake helpers | ✗ **3** |
| `map-web` | ✓ | ✗ 4 rows | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ **rasteriser + 4 more** | ✗ 1 (WIP-revealed) |
| `image-beat` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ **rasteriser + `wrap`** | ✗ **3** |
| `scrolly` | ✓ | ✗ 4 rows | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ **rasteriser + 3 more** | — |
| `palette` (WIP) | ✓ | ✓ | ✓ | ✓ | ✓ | ~ example only, no preview | ✗ | — (WIP) | — (WIP) |

**Headline counts.** All **15/15** `SKILL.md` files carry the eight canon sections under their canon
names — that half of the canon holds completely, and no section is renamed or missing anywhere.
**0 of 15** clear every canon rule at once. The two closest are `image-beat` (perfect knob
table, all four directories, but three false prose claims and two unguarded duplicates) and
`chart-web` (clean prose, one loose knob row, one duplicate family unguarded).

Two skills carry a **ninth section** beyond the canon: `splash` ("Preflight establishes what is
possible…") and `map-beat` ("What this beat found"). Both read as deliberate and neither
displaces a canon section; recorded, not charged as a defect.

---

## 2. Findings, by severity

### SEV-1 — Duplicated helpers the parity guard does not see

The project's own stated fear. `helper-parity.test.ts` and `root-template-shared.test.ts` between
them cover **six** `render-still.mjs` locations, **three** `inspect-render.mjs`, **three** timing
modules, ten `wrap`/`measureText` copies, and the `capabilityGap` pair. Everything below is outside
both.

#### F1. There are NINE `render-still.mjs` copies, not six — and three are guarded by nothing

`helper-parity.test.ts:61-102` imports six. `root-template-shared.test.ts:80` byte-compares three
skill copies (`chart-web`, `chart-video`, `map-beat`). The tree holds nine:

| copy | `measureText` | `deriveFurniture` | `contrast` | guarded? |
|---|---|---|---|---|
| `chart-beat/scripts/render-still.mjs` | — | — | — | canonical |
| `chart-video/scripts/render-still.mjs` | ✓ | ✓ | ✓ | yes |
| `chart-web/scripts/render-still.mjs` | ✓ | ✓ | ✓ | yes |
| `map-beat/scripts/render-still.mjs` | ✓ | ✓ | ✓ | yes |
| `shared/chart-beat/render-still.mjs` | ✓ | ✓ | ✓ | yes |
| `splash/assets/root-template/shared/chart-beat/render-still.mjs` | ✓ | ✓ | ✓ | yes |
| **`image-beat/scripts/render-still.mjs`** | **:78** | **:60** | **:43** | **NO** |
| **`map-web/scripts/render-still.mjs`** | **:101** | **:70** | **:41** | **NO** |
| **`scrolly/scripts/render-still.mjs`** | **:105** | **:73** | **:40** | **NO** |

Also unguarded inside those same nine files, in every copy: `luminance`, `mix`, `rasterise`,
`renderStill`. `deriveFurniture` transitively exercises `mix`, so `mix` is covered by luck, not by
design; `rasterise` and `renderStill` are covered by nothing anywhere.

**This is not hypothetical — the drift already happened, inside one day.** Measured from git:

- `map-web/scripts/render-still.mjs` was **byte-identical** to the canonical at its own commit
  `31aadd7b` (both `fe6ae497…`). It is not any more: the canonical is now `ff91eab2…` (222 lines)
  and this copy is still `fe6ae497…` (157 lines). **(WIP-revealed** — the palette commit `d3012f71`
  landed `readPalette`/`parsePalette` in exactly the six guarded copies and skipped these three,
  because nothing red says they exist.**)**
- `scrolly/scripts/render-still.mjs` was **never** byte-identical, not even at its own commit
  `29600f16` (`a4360c8b…` against `fe6ae497…`). It is a re-formatted copy carrying a reworded
  doc-comment. Behaviourally it still agrees — verified by extracting and normalising every function
  body — but nothing has ever checked that.

**Correction needed.** Add the three copies to `helper-parity.test.ts`'s resvg family (`measureText`,
`deriveFurniture`, `contrast`) and, for `image-beat` and `map-web` whose own `SKILL.md`
claims byte-identity, to `root-template-shared.test.ts`'s `["chart-web","chart-video",
"map-beat"]` loop. `scrolly`'s copy cannot join the byte-identical loop as written; either
re-sync it or add it to the behavioural family only, and correct the prose accordingly (see F8).

#### F2. `fr()` — three copies in `skills/`, and one of them still carries the bug the handover says was fixed

`HANDOVER.md` §12 records the French formatter mis-grouping digits and being "wrong everywhere it was
used… and no test noticed, because every copy agreed." Two of the three copies were fixed to
`Intl.NumberFormat`; one was not.

| location | implementation |
|---|---|
| `skills/map-beat/assets/geo.ts:422` | `Intl.NumberFormat("fr-FR", …)` |
| `skills/map-web/assets/geo-symbol.ts:98` | `Intl.NumberFormat("fr-FR", …)` |
| **`skills/chart-video/assets/EmissionsVideo.tsx:61-66`** | **`.replace(/\B(?=(\d{3})+(?!\d))/, " ")` — no `g` flag, run over a string that already carries the decimal comma** |

Executed, not read:

```
fr(1234567, 1)   video copy → "1 234567,0"      map copies → "1 234 567,0"
fr(1234567, 0)   video copy → "1 234567"        map copies → "1 234 567"
```

They also disagree on the separator itself: `Intl` emits U+202F (narrow no-break space), the regex
copy emits U+0020. Latent for the rainfall seed's own magnitudes; wrong the first time a video beat
draws a value at or above one million. Seven further `fr` copies live under `proof/` (four of them
the same regex shape) — out of scope for a skills audit, but they are the same family.

**Correction needed.** Replace `EmissionsVideo.tsx:61-66`'s body with the `Intl.NumberFormat` form
the two map copies use, and add an `fr` family to `helper-parity.test.ts` over the three
`skills/` copies with cases at 4, 7 and 10 digits — the boundary that makes the missing `g` flag
observable.

#### F3. The chart seed's own inlined geometry — asserted guarded, guarded by nothing

`chart-video/assets/EmissionsVideo.tsx` inlines `crossingGeometry` (`:101`), `fr` (`:61`) and
`yTickValues` (`:92`) as a deliberate copy of `proof/co2-suisse/crossing-geometry.ts` (`:62`, `:20`,
`:56`). The three pairs agree today — measured by normalised body comparison. `helper-parity.test.ts`
imports **none of them**; it imports only `measureText` and `wrap` from that file. See F8/F9 for the
two `SKILL.md` sentences that say otherwise.

**Correction needed.** Add a `crossingGeometry`/`yTickValues` family to `helper-parity.test.ts`
comparing the skill's inlined copies against the `proof/co2-suisse` module, or delete the two prose
claims. Do not leave the sentence standing over an unwired guard.

#### F4. The tick helpers — three chart seeds, no guard

| function | copies |
|---|---|
| `yTickValues` | `chart-beat/assets/ChartSeed.tsx:82` · `chart-web/assets/ChartWebSeed.tsx:171` · `chart-video/assets/EmissionsVideo.tsx:92` |
| `xTickValues` | `chart-beat/assets/ChartSeed.tsx:97` · `chart-web/assets/ChartWebSeed.tsx:177` |

The bodies differ today. Some of that is genre-legitimate (the video's own axis rule is sparser by
doctrine — `motion-grammar.md`), some may not be. Unlike `measureText`, nothing states which
differences are intended, so no reader can tell drift from design.

**Correction needed.** Either add a tick family to `helper-parity.test.ts` with a doc-comment naming
which copies must agree and why the video one is its own family (the shape the `measureText` families
already use), or add a doc-comment at each site stating the rule it implements and that it is
deliberately not the sibling's.

#### F5. `wrap` — an eleventh copy the guard cannot reach

`image-beat/assets/ImageBeatSeed.tsx:65` is byte-identical to
`chart-beat/assets/ChartSeed.tsx:192`'s `wrap` **except that it is not exported**, so
`helper-parity.test.ts` (which guards ten) cannot import it. The header comment on that test says
"this sweep found ten"; there are eleven.

**Correction needed.** Export it (`export function wrap`), add it to the static family, and update
the test's own header count from ten to eleven.

#### F6. The web/scrolly HTML builders and the map bake helpers

| function | copies | today |
|---|---|---|
| `escapeHtml` | `chart-web/scripts/render-web.mjs:147` · `map-web/scripts/render-web.mjs:139` · `scrolly/scripts/render-scrolly.mjs:157` | identical (formatting aside) |
| `inlineable` | `chart-web/scripts/render-web.mjs:143` · `map-web/scripts/render-web.mjs:135` · `scrolly/scripts/render-scrolly.mjs:153` | identical |
| `show` / `clear` | `chart-web/assets/interaction.mjs:51`/`:46` · `map-web/assets/interaction.mjs:32`/`:27` | identical |
| `resolveChrome` | `map-beat/scripts/bake-plate.mjs:74` · `map-web/scripts/bake-plate.mjs:80` | identical |
| `parseEnvFile` | `map-beat/scripts/bake-plate.mjs:106` · `map-web/scripts/bake-plate.mjs:106` | identical |

None is guarded. `escapeHtml` deserves a second look on its own merits: none of the three copies
escapes `"`, so an attribute value containing a quote is unescaped in all three. `map-web`
carried a separate `escapeAttr` earlier today and a concurrent edit removed it — only the comment at
`scripts/render-web.mjs:193` explaining why it was needed survives. Whichever way that lands, the
three copies should land the same way, and nothing makes them.

**Correction needed.** Add `escapeHtml`/`inlineable`, `show`/`clear`, and `resolveChrome`/
`parseEnvFile` families to `helper-parity.test.ts` (test-only cross-skill imports are explicitly
sanctioned by §6). Separately, settle attribute escaping once for all three genres.

> Line numbers in this row were read while `chart-web/{assets/ChartWebSeed.tsx,scripts/
> render-web.mjs}` and `map-web/{assets/MapWebSeed.tsx,scripts/render-web.mjs}` were
> uncommitted and being edited by another session. Re-derive them before acting.

#### F7. `canon-shape.test.ts` only knows four craft skills

`splash/test/canon-shape.test.ts:6-11` hardcodes `CRAFT = ["chart-beat","chart-web",
"chart-video","map-beat"]`. Seven skills now ship `assets/preview.png`: the four above plus
`image-beat`, `map-web`, `scrolly`. The output-proof/preview byte-identity assertion
therefore never runs for the three newest. Each of them has its own `test/canon.test.ts` with a
`--check`, so this is a smaller hole than F1 — but it is the same class: a guard whose list was
written once and never re-derived.

**Correction needed.** Derive `CRAFT` from the filesystem (every skill directory holding
`assets/preview.png`) rather than listing it, so a new craft skill joins the guard by existing.

---

### SEV-2 — False prose claims in `SKILL.md`

The handover names this the softest surface in the project, and states that
`skill-md-matches-code.test.ts` deliberately reads none of the prose sections. Every claim below sits
in a section that guard does not read, and every one was checked against the code, not against
another document.

#### F8. `chart-beat/SKILL.md:21-22` — "the rungs above it do not exist yet"

> **SP1 scope: the static genre only.** Interactive and video chart beats are later sub-projects.
> `renderStill` is the first rung of the render ladder; **the rungs above it do not exist yet.**

`chart-web` and `chart-video` are complete, tested, documented, `output-proof`-carrying
skills in this same tree. This is the exact defect shape §11 records ("a dispatch table declaring two
complete, tested skills do not exist yet") and it has survived into a different file. The frontmatter
`description` repeats it: "SP1 covers the static genre only."

**Correction needed.** Replace with: this skill is the **static** genre of a chart beat; the web
genre is `chart-web` and the video genre is `chart-video`, both shipped. Update the
frontmatter `description` in the same edit.

#### F9. `chart-beat/SKILL.md:59` — "the twin's one script with dependencies"

> `scripts/render-still.mjs` is the twin's one script with dependencies — `react-dom/server` and
> `@resvg/resvg-js` …

Measured: **22 scripts across 8 skills** import `react`, `react-dom/server`, `@resvg/resvg-js` or
`puppeteer`. Two of them are in this very skill —
`chart-beat/scripts/inspect-render.mjs:37` and `chart-beat/scripts/render-preview.mjs:11-13`.

The same false sentence is **vendored into all nine `render-still.mjs` copies** as the file's own
header comment (`chart-beat/scripts/render-still.mjs:3-4`): *"Every other script in this twin is
dependency-free; this one is not, and says so."*

**Correction needed.** In `SKILL.md:59`, say it is the script whose dependencies a beat inherits when
it imports `#shared/chart-beat/render-still.mjs`, not that it is the only one. Correct the
vendored header comment at the canonical copy and re-run whatever re-vendors the other eight (the
byte-identity guard will otherwise turn the six guarded copies red).

#### F10. `image-beat/SKILL.md:91, :93-94, :234-235` — three claims, all false

- `:91` — "`scripts/render-still.mjs` is this skill's **one script with dependencies**". Same defect
  as F9, locally: `scripts/render-preview.mjs:15-17` and `scripts/build-sample-photos.mjs:26` both
  import external dependencies.
- `:93-94` — "**the three copies** are intentionally byte-similar". There are **nine** copies of that
  file in the tree (F1). Even the three named — `chart-beat`, `image-beat`, `scrolly`
  — are not byte-similar today; `image-beat`'s is 299 lines against the canonical 222 and
  carries a rewritten doc-comment block.
- `:234-235` (Files) — "`test/render-still.test.ts` — `deriveFurniture`/`contrast`/`measureText`
  **parity with the sibling copies**". `image-beat/test/render-still.test.ts` imports nothing
  outside its own skill (checked: the only non-stdlib imports are `../assets/ImageBeatSeed.tsx` and
  `../scripts/render-still.mjs`). It cannot assert parity with a sibling it never loads. The section
  comment inside the test at `:22` — "same rule the sibling skills' own copies carry" — asserts the
  same thing and is equally unbacked.

**Correction needed.** Fix `:91` the way F9 fixes its twin. Change "three copies" to a statement of
the real count, or drop the number. Delete the parity claim at `:234-235` **or** make it true by
wiring this skill into `helper-parity.test.ts` (F1) — and if the latter, move the claim to point at
that file, since parity across skills cannot live in a skill-local test without a cross-skill import.

#### F11. `map-beat/SKILL.md:65` — claims a cross-skill runtime import that was deliberately removed

> | Contract | `assets/timing.ts` | `MAP_TIMING`. The vocabulary (`BeatTiming`, `checkTiming`,
> `progressOf`) is **imported** from `chart-video`, never re-implemented |

It is not imported. `map-beat/assets/timing.ts:17` re-exports from `./timing-contract`, a
physical copy whose own doc-comment (`:5-9`) says so verbatim: *"A copy, not an import, because a
skill never reaches across another skill's boundary at runtime."* The `SKILL.md` describes an
architecture the project's §6 rule forbids and the code no longer has. A reader following the
sentence would "fix" the copy into an import and break `no-cross-skill-imports.test.ts`.

**Correction needed.** Rewrite the Role cell: the vocabulary is a **carried copy** in
`assets/timing-contract.ts`, byte-guarded against its source by
`splash/test/root-template-shared.test.ts` — the same wording `storyboard/SKILL.md:162-168`
already uses correctly for `capability-gap.mjs`.

#### F12. `map-beat/SKILL.md:60` + `geo-discipline.md` §7 + both map seeds — a three-way contradiction about no-data

- `map-beat/SKILL.md:60` summarises geo rule 7 as "**no-data as texture**".
- `doctrine/references/geo-discipline.md:96-99` was rewritten to the opposite and now states:
  *"a flat, distinct grey is the third colour, not a third texture, **and it is what this project's
  own maps use**."*
- Both shipped seeds still hatch. `map-beat/assets/Co2MapStill.tsx:179-191` defines
  `<pattern id="no-data" patternTransform="rotate(45)">` under a comment reading *"No-data is a
  TEXTURE, not another shade (`geo-discipline.md` rule 7)"* — citing the rule it contradicts — and
  applies it at `:122` and `:355`. `Co2MapVideo.tsx:262-267` does the same at 9px.

So the doctrine's own sentence about what this project's maps use is **false about this project's
maps**, and the code's comment cites a rule that now says the reverse.

**Correction needed.** Decide once, in `geo-discipline.md` §7, then make the other two follow: either
convert both seeds to the flat `#b9b9b9` the rule specifies and delete the two `<pattern>` blocks and
their comments, or restore the texture rule and correct `geo-discipline.md`'s claim. `SKILL.md:60`'s
summary cell follows whichever wins. **Do not fix only the prose** — the whole point of §7's rewrite
was the render.

#### F13. `chart-video/SKILL.md:83` and `:101` — claim `helper-parity.test.ts` guards copies it never imports

- `:83` (gotcha) — "with `splash/test/helper-parity.test.ts` **keeping the copies in step**",
  said of the seed's inlined `fr`/`yTickValues`/`crossingGeometry`.
- `:101` (Architecture, Geometry row) — "`proof/co2-suisse/crossing-geometry.ts` is the STORY's copy…
  **the two are kept in step by `splash/test/helper-parity.test.ts`**".

`helper-parity.test.ts` imports from `EmissionsVideo` exactly two names — `measureText` and `wrap`
(`:106-109`). Neither `crossingGeometry` nor `fr` nor `yTickValues` appears anywhere in that file.
See F2: `fr` is in fact the one that has already drifted.

**Correction needed.** Either wire the geometry trio into `helper-parity.test.ts` (F3) and keep the
sentences, or narrow both sentences to name only `measureText`/`wrap`. As written they are the exact
failure mode §11 warns about: a guard trusted beyond what it verifies.

#### F14. `map-web/SKILL.md:111` and `:249-250` — "byte-identical copy" **(WIP-revealed)**

> `scripts/render-still.mjs` — `deriveFurniture`/`measureText`, a **byte-identical** copy of
> `chart-beat`'s own file, **kept in step by hand**

It was byte-identical when committed and is not now (F1, with hashes). The claim is false today, and
the phrase "kept in step by hand" is the honest description of why: no test enforces it. Because the
divergence comes from the in-flight palette work, the *sentence* is charged here only as documentation
that will silently keep being wrong.

**Correction needed.** After F1 wires this copy into the byte-identity guard, the sentence becomes
true; change "kept in step by hand" to name the guard. If the copy is deliberately allowed to lag,
say that instead and drop "byte-identical".

#### F15. `dw-beat/SKILL.md:18` — "The skill is exactly four scripts"

`dw-beat/scripts/` holds **seven** `.mjs` files: `validate-spec`, `map-spec`, `csv`,
`dw-client`, `produce`, `verify-range-annotation`, `prove-co2`. This skill's own Architecture table
(`:88-96`) lists all seven, so the document contradicts itself two sections apart.

**Correction needed.** "Four steps — validate, map, call, orchestrate — across seven scripts", or
name the four and say the other three are the live-pin and the proof case.

#### F16. `doctrine/SKILL.md:10` and `:24` — the reference-document count is short by one

`:10` opens "**Five** prose reference documents and one small mechanical check"; `:24` adds "**A
sixth** document, `motion-grammar.md`". `references/` holds **seven**: the five named, plus
`motion-grammar.md`, plus **`geo-discipline.md`** — which appears in the Files section (`:213`) and
is cited by name from `map-beat` and `map-web`, but is absent from both the Overview count
and the Architecture table (`:86-94`, which lists seven rows and still omits it).

**Correction needed.** Say seven, and add a `| Geo | references/geo-discipline.md | … |` row to the
Architecture table.

#### F17. `newsroom-charter` — a tuning knob the code overrides

Knob row (`SKILL.md:165`): *"Which two hex values never count as a confident colour candidate |
`#ffffff`, `#000000` | `isNeutralHex`, `extract.mjs`"*.

`scripts/derive-charter.mjs:51`:

```js
const meta = themeColors.find((c) => !isNeutralHex(c.value)) ?? themeColors[0];
```

When **every** `theme-color` on a site is neutral, `find` returns `undefined` and the `??` hands back
`themeColors[0]` — a value `isNeutralHex` has just rejected — which is then returned as
`brandColor` with `source: "meta[name=theme-color]"` and full evidence. The knob's stated rule does
not hold on that path, and the skill whose whole point is "nzz.ch yielded nothing and said so" would,
on a site declaring only `<meta name="theme-color" content="#ffffff">`, present white as a measured
brand colour.

**Correction needed.** Drop the `?? themeColors[0]` fallback so the neutral-only case falls through
to the named-hint search and then to `null`/`unresolved`, which is what rule 3 of this skill's own
Overview promises. Add a test for a page whose only `theme-color` is `#ffffff`.

#### F18. Files sections that omit shipped files

The Files section is the skill's inventory; `skill-md-matches-code.test.ts` checks that every listed
path resolves, never that every real file is listed.

- `storyboard/SKILL.md:156-177` omits `scripts/genre-catalog.mjs` and
  `test/genre-catalog.test.ts` — both shipped, and `genre-catalog.mjs` is cited *by name* from
  `:165` inside another bullet, so the document knows it exists.
- `map-beat/SKILL.md:147-177` omits `scripts/render-still.mjs` and `assets/timing-contract.ts`
  entirely — the file name `render-still.mjs` appears nowhere in that `SKILL.md`, and
  `timing-contract.ts` is the file F11's correction has to name.

**Correction needed.** Add the four bullets. Consider extending `skill-md-matches-code.test.ts` with
the reverse direction — every `scripts/*.mjs` and `assets/*.ts(x)` appears in some Files bullet —
which is a mechanical check with a low false-positive rate and would have caught all four.

---

### SEV-3 — Tuning knobs that are not numbers, or whose "Where" names no file

The canon rule: *every tuning knob is a number, with a named location*.

#### F19. `intake` — no knob in the table is a knob

| row | value | problem |
|---|---|---|
| Which story workspace to freeze into | `storyDir` | a call argument, not a number |
| Which article file to freeze | `articlePath` | idem |
| Which CSV to freeze and profile | `dataPath` | idem |

All three name their location as "`freezeSource()` call" — no file. The skill *does* hold real
numeric knobs worth a table: `profile.mjs`'s `NUMERIC_RE` decision order, and the row/column
thresholds `profileTable` applies. As it stands the section documents the function signature.

**Correction needed.** Replace with the skill's actual numbers (e.g. how many column types
`typeOf` recognises — `3`, `scripts/profile.mjs`; how many frozen artifacts a successful freeze
writes — `3`, `scripts/freeze.mjs`), and move the three arguments to Quick start where they already
appear.

#### F20. Non-numeric knob rows elsewhere

| skill | row | value | shape |
|---|---|---|---|
| `doctrine` | whether a reference cell counts as linked | *"**not a number**"* | self-declared deviation |
| `deliver` | default Cloudflare Pages project | `"deliver-proof"` | string |
| `deliver` | default CMS kind | `"we-publish"` | string |
| `dw-beat` | default reference-line style | `"solid"` | mode |
| `dw-beat` | zero-anchored axis types | `/bars\|column/i` | regex |
| `dw-beat` | force-attribution | always `false` | boolean |
| `newsroom-charter` | brand-colour hints | `brand`,`primary`,`accent` | list |
| `newsroom-charter` | ground-colour hints | `background`,`ground`,`surface`,`page` | list |
| `newsroom-charter` | never-confident hexes | `#ffffff`,`#000000` | list |
| `map-beat` | which basemap | `"dataviz-light"` | string |
| `map-web` | which basemap | `"dataviz-light"` + `#aac9e0` | string |
| `map-web` | bake namespace | `/tmp/map-twin-web` | path |
| `map-web` | the subject point | `"paris"` | string |
| `map-web` | filter dimension | `group` per point | field name |
| `scrolly` | sticky graphic width | *"whatever the ancestor chain gives it"* | prose |
| `scrolly` | panel max width | `min(42ch, 100%)` | CSS expression |
| `scrolly` | panel centring | `justify-content: center` | CSS mode |
| `scrolly` | drawn step variants | `{ waterLevelT, dayLabel }` | object map |

`doctrine`'s row is the honest one: it says outright that no threshold exists and refuses to
invent one. That is the right instinct with the wrong conclusion — the canon's answer to "this is not
a number" is that it is not a knob.

**Correction needed.** For each: either convert to the number behind it (`newsroom-charter`'s
three list rows become counts — `3` hint fragments, `4` hint fragments, `2` neutral hexes — with the
list moved into the "Want" prose), or move the row out of Tuning knobs into Architecture/Files where
a named constant belongs. `scrolly`'s prose row and `doctrine`'s "not a number" row should
simply be deleted from the table.

#### F21. "Where" columns that name no file

`skill-md-matches-code.test.ts:156-160` already names this gap and counts seven such rows. The real
count across the tree is higher — every row below names only a bare identifier or a document section:

`splash` 3 (`whereIs`; "this document, `Overview`"; "spec §8, `How it works` step 5") ·
`intake` 3 · `storyboard` 3 (`checkStoryboard` ×2, `parseStoryboard`) · `doctrine` 4
(`checkReferenceSet` ×4) · `deliver` 6 (`FORMS_BY_GENRE` ×3, `materialise` ×2, `singleOwnedFile`)
· `chart-beat` 2 (`deriveFurniture` ×2) · `chart-video` 6 (`CO2_TIMING`) · `map-beat`
5 (`MAP_TIMING`) · `dw-beat` 5 (`buildRangeAnnotation` ×4, `buildTextAnnotation`) ·
`chart-web` 1 ("the story's own composition file" — names no file at all, by construction).

The convention in play is real — the file is named once, then carried by the reader down consecutive
rows — but the guard explicitly refuses to follow it, so these rows are checked by nothing.

**Correction needed.** Repeat the file in every row's Where column. It is redundant to a human and it
is the only thing that puts the row inside the guard's stated scope. `chart-web`'s row should
name `assets/ChartWebSeed.tsx` (the seed's own `.pt` radius) rather than "the story's own composition
file".

---

### SEV-4 — Canon directories

#### F22. `chart-video` has no `references/`

The only craft skill without one. Its doctrine lives in `doctrine/references/motion-grammar.md`
and its Architecture row points there, which is a defensible delegation — but every other genre skill
that leans on shared doctrine *also* carries its own genre discipline file
(`static-discipline.md`, `web-discipline.md`, `map-web-discipline.md`, `scrolly-discipline.md`,
`image-discipline.md`, `seed-anatomy.md`). The video genre's own hard-won knowledge — the native
module that kills a Remotion bundle, the still-before-mp4 ladder, the four extracted frames, the
editable timing contract — currently lives only in `SKILL.md` prose, which is the surface this audit
exists because of.

**Correction needed.** Add `references/video-discipline.md` (or `seed-anatomy.md`, matching its
siblings) carrying the gotcha and the ladder, and reduce the `SKILL.md` prose to a pointer.

#### F23. `dw-beat` has no `output-proof`

Every other producing skill commits the artifact its own seed makes. `dw-beat` produces real
PNGs (`scripts/prove-co2.mjs` fetches Our World in Data and renders one live) and commits none. §11's
ruling is explicit that "the artifact is the gate" — a delegated renderer does not exempt a producer
from showing what it produces. Its lack of `assets/` **is** justified: the skill deliberately holds no
seed component, and its `SKILL.md` says so in the frontmatter.

**Correction needed.** Commit `output-proof/co2.png` (the artifact `prove-co2.mjs` already produces)
with a one-line note that it is a live Datawrapper export, not a local render.

#### F24. `splash` has no `references/`

The orchestrator's `SKILL.md` carries ~180 lines of doctrine prose — the four responsibilities, the
capability model, the three newsroom outcomes, the never-list. That is exactly the material
`references/` exists to hold, and the file is the longest `SKILL.md` in the tree at 318 lines. Its
lack of `assets/` seed and `output-proof` is legitimate (it produces nothing, by design and by its
own never-list); `assets/root-template/` is an install payload, correctly not a seed.

**Correction needed.** Optional, and lower priority than everything above: lift the "Preflight
establishes what is possible" section (the ninth, non-canon section) into
`references/preflight-model.md` and leave a pointer. This would also restore the eight-section shape.

Legitimately absent, charged as nothing: `assets/` and `output-proof` for `intake`,
`storyboard`, `doctrine`, `deliver`, `newsroom-charter`, `splash` — none
draws anything. `map-beat`'s `references/` holds only `types/`, which is thin but not empty, and
its genre doctrine genuinely lives in `doctrine/references/geo-discipline.md` by design.

---

### SEV-5 — Values that default where the doctrine says throw

The rule: *nothing renders in a colour, a value or a default nobody chose; a missing input THROWS.*

#### F25. `map-beat/scripts/render-preview.mjs:131` — a missing subject renders as zero

```js
subjectValue: values.get("CHE") ?? 0,
```

If the subject key is absent from the joined data, the seed draws the subject's value as `0` on the
legend beside a real comparison mean. The skill's own gotcha is that *"a data join fails silently and
the map looks right"*, and `joinValues` throws in both directions to prevent exactly this — then the
preview runner re-opens the hole one line before the render.

**Correction needed.** `const subjectValue = values.get("CHE"); if (subjectValue === undefined) throw
new Error("subject CHE carries no value — the join declared it and the data does not have it");`

#### F26. `map-beat/assets/Co2MapVideo.tsx:306` — a missing rank arrives first

```js
rank.get(shape.key) ?? 0,
```

A shape absent from the rank map silently takes rank `0` — the earliest arrival slot in a reveal
whose whole editorial claim is that the order *is* the value order (`geo-discipline.md` rule 10). The
map would state the opposite of the data, in motion, with nothing red.

**Correction needed.** Throw naming the key, the same way `joinValues` does.

#### F27. `scrolly/scripts/render-scrolly.mjs:366` — an unknown step id renders the default frame

```js
const variant = DRAWN_VARIANTS[meta.id] ?? {};
```

A typo in a step id yields `{}`, and `DrawnGraphicFrame` (`ScrollySeed.tsx:219`) defaults
`waterLevelT = 0.5` — so the step silently renders mid-staff with no day label. The neighbouring
branch in the same function throws loudly on an unknown `frameKind`; this one does not. The
component's doc-comment argues the value is purely illustrative, which softens the severity but not
the shape.

**Correction needed.** `if (!(meta.id in DRAWN_VARIANTS)) throw new Error(...)`, matching the
`frameKind` branch three lines below.

#### F28. `deliver` — two delivery defaults nobody chose

`scripts/deploy-embed.mjs:38` `DEFAULT_PROJECT_NAME = "deliver-proof"` and `materialise`'s
`cms` default of `"we-publish"` are both documented as knobs, so they are chosen *by the skill*
rather than nobody — but they are the two places where a silent default lands a journalist's work
somewhere external: an embed deployed into a project named after this experiment, and a CMS payload
shaped for a CMS the journalist may not use.

**Correction needed.** Lower priority than F25-F27, and arguably a design call rather than a defect:
consider requiring `projectName` explicitly for `embed`, since the delivery is hosted and the URL is
the deliverable.

---

## 3. Work in flight — recorded, not charged

Excluded by instruction; listed so a later pass does not re-derive them.

- `palette` has no `assets/sample-data`, no `assets/preview.png` and no `output-proof`. Whether
  a proposal skill needs a rendered proof is a real question (`newsroom-charter`, its closest
  sibling, has none either and embeds its real output in Quick start instead) — worth settling for
  both at once.
- `palette/scripts/palette.mjs:192` — `const ground = (newsroom && newsroom.ground) || "#FFFFFF"`.
  A white ground default inside the skill that exists to stop unchosen colours reaching a render.
  Its provenance string is honest about it (`"the default white, because no NEWSROOM.md ground was
  given"`), so this is a proposal, not a render — but it is the one `||` in the tree that hands back
  a colour nobody named.
- `helper-parity.test.ts:91-102` — the block comment says "**readPalette**/`parsePalette`", but only
  `parsePalette` is imported and asserted. `readPalette` touches the filesystem, which is presumably
  why; the comment should say so.
- `palette/SKILL.md:155` and `chart-beat/SKILL.md:110-130` — the Quick start imports
  `readPalette` and destructures `{ ground, accent }`, then passes `ground: "#FFFFFF"` and
  `accent: "#0B7A75"` as literals with the `// from NEWSROOM.md` comment four lines below. The
  snippet currently contradicts itself; finishing the threading closes it.

---

## 4. What this audit did not check

Stated plainly, in the discipline the guards in this project already use on themselves.

- **Renders.** Not one pixel was opened. Every claim about a seed is a claim about its source.
- **`proof/`.** Ten `fr` copies exist tree-wide; only the three under `skills/` are charged. The
  seven in story workspaces share the same defect shape (four carry the regex form) and are outside
  a skills audit.
- **Behavioural equivalence beyond normalised source.** Where this document says two duplicates
  "agree today", that means their function bodies match after whitespace and trailing-comma
  normalisation — not that they were executed side by side. F2 is the exception: those were run.
- **Whether a doctrine rule is right.** F12 reports that doctrine, `SKILL.md` and code disagree about
  no-data; it does not say which of the three is correct.
- **Prose claims in `references/*.md`.** Only `geo-discipline.md` §7 was read against code, because
  a `SKILL.md` summary pointed at it. The other reference files were not fact-checked — that is a
  larger surface than this pass covered, and by the project's own §12 lesson it is the surface most
  likely to hold the next seven.

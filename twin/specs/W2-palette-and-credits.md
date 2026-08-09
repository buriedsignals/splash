# W2 — the palette reaches the seeds, and the credits sit at the bottom

**Chantier W2.** Closes `FEEDBACK-2026-08-10.md` **B3.3** (web title and description at full width),
**B1.2** (the colour palette is changeable) and **B1.1** (credits at the bottom of the visual).
`PLAN-2026-08-10.md` puts W2 second and says it **blocks every other visual chantier**: nothing that
touches a component should land before the seeds are right, or it will be re-done.

Written against `survey/furniture-typeface-credits.md`. Every count below was **re-measured for this
spec** on the tree as it stands; where my number differs from the survey's, mine is stated with the
command that produced it and the survey's is named.

**B1.3 (typeface) is deliberately NOT here.** `PLAN-2026-08-10.md` puts it in W7 and says it cannot
be specified until two third-party behaviours are measured. Nothing in this spec depends on it.

**Order is cheapest-first and it is not arbitrary.** One CSS declaration closes B3.3 for 17 of 23
types. The palette work changes what future beats are *copied from*, so it must precede any beat
edit. The credit arithmetic is the only expensive item, and it is expensive in 60 identical small
pieces — so it goes last, when the seeds it will be copied out of are already correct.

---

## 0. The measured state

Re-measured on this tree, not taken from the survey.

### 0a. The population

```
ls proof/*/BRIEF.md | wc -l                       →  70 beat folders
find . -name render-still.mjs -not -path "*/node_modules/*" | wc -l  →  22 copies
grep -c "^export function readPalette" on each     →   6 carry it, 16 do not
```

### 0b. B1.2 — how far the palette reaches. **The seed number is the whole item.**

| population | reads a recorded palette | names a hex |
|---|---|---|
| `render-still.mjs` copies (the vendored library) | **6 of 22** | — |
| beats under `proof/` | **15 of 70** | 54; 1 does neither |
| **craft-skill seed runners** | **0 of 12** | **11 of 12** |

The seed-runner row is the one that matters, and I verified it myself:

```
for f in skills/*/scripts/render-{preview,web,video,map,scrolly}.mjs; do
  grep -nE '#[0-9A-Fa-f]{6}|readPalette' "$f"; done
```

**Twelve seed runners. Eleven name `#FFFFFF` / `#0B7A75` as literals. Zero call `readPalette`.**
The twelfth, `skills/twin-map-web/scripts/render-preview.mjs`, names no colour at all because it
delegates to `render-web.mjs`'s `render()` — it is not an exception to fix, it is a file with
nothing to change. So the survey's "zero of 11" and my "zero of 12" are the same measurement
counted with a different denominator; **zero is the number in both.**

The eleven, with the lines:

| file | lines |
|---|---|
| `skills/twin-chart-beat/scripts/render-preview.mjs` | 35, 45 |
| `skills/twin-chart-video/scripts/render-preview.mjs` | 41, 55 |
| `skills/twin-chart-video/scripts/render-video.mjs` | 31, 32 |
| `skills/twin-chart-web/scripts/render-preview.mjs` | 44, 54 |
| `skills/twin-chart-web/scripts/render-web.mjs` | 67, 68 |
| `skills/twin-image-beat/scripts/render-preview.mjs` | 38 |
| `skills/twin-map-beat/scripts/render-preview.mjs` | 102, 126 |
| `skills/twin-map-beat/scripts/render-map.mjs` | 54, 55 |
| `skills/twin-map-web/scripts/render-web.mjs` | 47, 48 |
| `skills/twin-scrolly/scripts/render-preview.mjs` | 42, 43 |
| `skills/twin-scrolly/scripts/render-scrolly.mjs` | 394, 395 |

Why this and not the 54 beats: **a seed is what a new beat is copied from.** Fix 54 beats and leave
11 seeds, and beat 71 arrives with a hex literal in it. That is the owner's own feedback→system rule
(`CLAUDE.md`, Conventions ★) applied to its own mechanism.

Three `render-still.mjs` copies lack `readPalette`/`parsePalette` and are the reason three seed
runners cannot call it today: `skills/twin-map-web/scripts/`, `skills/twin-scrolly/scripts/`,
`skills/twin-image-beat/scripts/`. Beats reach the shared copy through the `#shared/…` subpath alias
(`proof/mapgen-dot-web/render-web.mjs:30`); a **skill** may not, because
`no-cross-skill-imports.test.ts` resolves every string literal under `skills/` on disk and requires
it to stay inside its own skill.

Also measured: **17 `PALETTE.md` files exist, all under `proof/`. Not one lives inside a craft
skill**, so a copied skill directory carries no recorded answer at all today.

### 0c. B1.1 — where the credit sits

```
grep -rn "const sourceBaseline =\|const sourceTop =" $(find . -name "*.tsx" -not -path "*/node_modules/*")
```

**60 definitions in 60 distinct `.tsx` files.** (The survey counted 58; the difference is two files
holding both a still and a video component. Either number tells the same story.) Every one derives
the source's y from something **above** it — `titleBaseline`, `titleTop`, `subtitleTop`,
`limitsBaseline`, `caveatBaseline`, `noteBaseline`. **Not one is anchored to `height - PAD`.** The
three hits for `FRAME.height` in the surrounding lines are all the *caveat*, which already anchors
to the bottom (`Co2MapStill.tsx:143`).

Five of the 60 are the craft skills' own seeds — `ChartSeed.tsx`, `EmissionsVideo.tsx`,
`ChartWebSeed.tsx`, `Co2MapStill.tsx`, `Co2MapVideo.tsx`. **The seed multiplier applies to B1.1
exactly as it does to B1.2**, and the survey did not say so. Five seeds, 55 beats.

The plot reserves from the source's own baseline — `ChartSeed.tsx:249`, `top: sourceBaseline + 34` —
so this is never a one-line move of a `<text>`. §3 gives the arithmetic.

Already at the bottom, nothing to do: the 17 fluid chart-web beats (`ChartWebSeed.tsx:607` draws
`<p class="chart-source">` as the figure's last child; verified in the shipped artifact
`proof/webx-carbon-footprint/carbon-footprint.html`, `chart-title` at byte 14506, `chart-source` at
26009).

Two concentrated costs, both real:

- `Co2MapStill.tsx:155-159` throws when the header block collides with the legend
  (`if (captionY - 14 < sourceBottom)`). Moving the source into the bottom half makes that
  comparison meaningless in its current form — a guard that can no longer go red, which invariant 4
  forbids. It must be re-pointed, not deleted.
- `Co2MapStill.tsx:128-129` and `MapWebSeed.tsx:160` render `${source} · ${basemapCredit}`. The
  MapTiler attribution travels with the source line.

### 0d. B3.3 — one line, 17 types

`skills/twin-chart-web/scripts/render-web.mjs:240`:

```css
.chart-header, .chart-source { max-width: 640px; }
```

`.chart-figure` and `.chart-plot` are already `width: 100%` with no cap (`:200-218`). **Only the
words are capped.** And **17 beats import that CSS rather than vendoring it** — verified:

```
grep -rln "renderWeb" proof/*/render-web.mjs | wc -l   →  17
```

(An 18th file, `proof/more-heatmap-co2-per-capita-decades/render-web.mjs`, merely *names* the path
in a comment at `:4` explaining why it does **not** import it. It is one of the four un-retrofitted
beats — §5.)

The web genre is three populations, not one:

| population | beats | title/desc width today |
|---|---|---|
| fluid chart-web (shared `renderWeb`) | 17 | capped **640px** — B3.3 open |
| fluid map-web (`mapgen-dot-web`, `mapgen-symbol-web`) | 2 | uncapped — B3.3 already true |
| scrolly | 2 | header capped 640px (`render-scrolly.mjs:221`) |
| legacy two-rung | 4 | words are SVG `<text>` in a capped viewBox — §5 |

### 0e. Two prose claims that overstate the code

Neither is caught by anything. `skill-md-matches-code.test.ts` checks that paths resolve and that
named identifiers exist; it does not read a sentence about coverage.

- `skills/twin-palette/SKILL.md:3` — *"Every render reads that file, and refuses rather than
  default."* Measured: 15 of 70 beats, 0 of 12 seed runners.
- `skills/twin-palette/SKILL.md:95` — *"**Every render reads it, and none defaults.**"* Same.
- `proof/palette-proof/PROOF.md:49-51` — *"The web, video, map and scrolly genres import the same
  vendored `readPalette` and are guarded for parity."* Measured: `twin-scrolly`, `twin-map-web` and
  `twin-image-beat` do not carry `readPalette` at all, and `render-still-parity.test.ts:20-25`
  explicitly permits that subset. The guard is not covering what the sentence says it covers.

**Note the asymmetry, because it decides how each is treated.** B1.2's prose is a claim the code
was *supposed* to satisfy: §2 makes it true for the seeds and the sentence is then rewritten to
state the real reach. B1.1's and B3.3's prose are **rules being reversed** — §3.6 and §1.3.

---

## 1. B3.3 — the reading-measure cap, first because it is one line

### 1.1 The change

`skills/twin-chart-web/scripts/render-web.mjs:240` — delete the declaration.

```css
.chart-header, .chart-source { max-width: 640px; }     ← remove
```

Nothing else in the chain caps: `.chart-figure` is `width: 100%` with `padding: FRAME_PAD_PX`
(`:216-218`), so the title and the source line then run edge to edge inside the frame's own inner
margin, exactly as the plot already does. `.chart-header, .chart-filter, .chart-source { flex: 0 0
auto; }` on the line above is the window-fit rule (`web-discipline.md:220`) and is untouched — words
still never get squeezed.

**Copies receiving it: one.** This is the shared renderer 17 beats import; there is no duplication to
keep in step. `no-cross-skill-imports.test.ts` scans files **under `skills/`** (`:113-120`, `:314`) —
a beat is a story, not a skill, so a beat importing this is legal and is how it stays one line.

### 1.2 Scrolly's header — in scope, and why

`skills/twin-scrolly/scripts/render-scrolly.mjs:221`, `.scrolly-header { max-width: 640px; }`, caps
the scrolly's title and its `.source` while the graphic beneath goes full-bleed. That is the same
mismatch the owner saw — B3.3's word is "**too**", meaning "as the visual does". Remove the
`max-width` and keep the `padding: 4px clamp(16px, 6vw, 56px) 0` on the same rule, so the header
keeps a gutter at every viewport instead of touching the edge.

**Not touched:** `.step-panel`'s `max-width: min(46ch, 100%)` (`:354`). That is a prose panel
travelling *over* the graphic, not furniture beside it, and `scrolly-discipline.md:167-198` argues
its measure on grounds B3.3 does not contradict.

**Copies receiving it: one.**

### 1.3 The doc edit — this reverses a written rule

`skills/twin-chart-web/references/web-discipline.md:130-135` currently defends the cap by name:

> The two places a long line of prose genuinely does become unreadable at full bleed — the header
> block (title + caveat) and the source line — are the **ONLY** things given a reading-measure cap
> (`640px`, `render-web.mjs`'s `buildCss`)

**Rewrite those six lines** to record the reversal and its cost, in the form R1 requires of
`map-web-discipline.md`: the reading-measure argument was not wrong in the abstract, it was wrong
about *what this genre is* — a chart embedded in a CMS column is furniture over a graphic, and a
title that stops at 640px while the chart beneath it runs to 1600 reads as a broken box, not as a
comfortable measure. Name the cost the old rule was protecting against (a title wrapping to a very
long single line on a wide desktop) and say what now bounds it instead: the CMS column the embed
sits in, per ruling R2 (*"ça fonctionnera un peu comme un composant embed"*).

`web-discipline.md:207` and `:220` also mention the source line, in the window-fit mechanism. Both
are about height, not width. **Leave them.**

`skills/twin-scrolly/references/scrolly-discipline.md:167-198` (*"The reading measure belongs to the
prose; the graphic goes full-bleed"*) argues the 640px header across four build rounds. Its
conclusion about the **step panel** stands; its conclusion about the **header** does not. Edit
`:196-198` — the sentence that moves the constraint onto `.scrolly-header` — so the file records that
the header joined the graphic at full bleed and the panel did not.

**Nothing scans markdown.** If these edits are skipped the repository argues against its own render
and only a person will notice.

### 1.4 The guard

**None, and none is warranted.** This is a CSS declaration in a single file, not a duplicated
helper — there is no second copy that could drift. The verification is the re-render in §4.

Do not invent a "no `max-width` in `buildCss`" scan: the file legitimately carries `max-width` on the
tooltip and on the step panel, so such a guard would need an exemption list, which is the
`helper-parity.test.ts` failure mode this branch has already paid for twice.

---

## 2. B1.2 — the palette reaches the seeds

### 2.1 Vendor `readPalette` and `parsePalette` into the three skills that lack them

Copy both functions **verbatim** from the canonical
`skills/twin-chart-beat/scripts/render-still.mjs:105-147` into:

| copy | why it needs them |
|---|---|
| `skills/twin-map-web/scripts/render-still.mjs` | `render-web.mjs:47-48` names the pair |
| `skills/twin-scrolly/scripts/render-still.mjs` | `render-scrolly.mjs:394-395` and `render-preview.mjs:42-43` name the pair |
| `skills/twin-image-beat/scripts/render-still.mjs` | `render-preview.mjs:38` names `ground` |

Each copy also needs the imports `parsePalette`/`readPalette` use (`existsSync`, `readFileSync`,
`dirname`, `join`, `resolve` from `node:fs` / `node:path`) — present in most copies already; add
only what is missing. `render-still-parity.test.ts` does **not** compare imports (`:46-47`, its own
blind spot 3), so a missing import fails loudly at run time instead, which is the better alarm.

**The 13 `proof/*/render-still.mjs` map copies do NOT receive them.** A beat reaches the shared copy
through `#shared/…`; a subset is explicitly fine (`render-still-parity.test.ts:20-25`).

**Walking guard: `render-still-parity.test.ts` — free, already in place.** It walks the tree
(`:149`), finds every `render-still.mjs`, and compares each against the canonical copy function by
function (`:109-146`), normalising formatting. The three new copies are guarded **the moment they
land**, with nobody wiring them up. **Mutation that reddens it:** in a copy of the tree outside the
repository, change `` `No PALETTE.md found for ${start}.` `` to `` `No palette for ${start}.` `` in
`skills/twin-scrolly/scripts/render-still.mjs` and run the suite — it must name that file and that
function.

### 2.2 Give each craft skill its own recorded answer

`readPalette(dir, { stopAt })` walks up from `dir`, checking `dir/PALETTE.md` first, then each
parent, stopping at `stopAt` inclusive. So **one file per craft skill, at the skill root**:

```
skills/twin-chart-beat/PALETTE.md
skills/twin-chart-video/PALETTE.md
skills/twin-chart-web/PALETTE.md
skills/twin-map-beat/PALETTE.md
skills/twin-map-web/PALETTE.md
skills/twin-scrolly/PALETTE.md
skills/twin-image-beat/PALETTE.md
```

Seven files, shaped on `skills/twin-palette/assets/PALETTE.example.md`, each carrying **exactly the
values that skill's runner names today** — `ground: "#FFFFFF"`, `accent: "#0B7A75"` — so the seed's
pixels do not move. Below the front matter, one paragraph saying this is the skill's own
demonstration answer and that a journalist's story root overrides it.

**`origin` is the one place this is awkward, and it should be named rather than smoothed over.**
`parsePalette` accepts only `newsroom`, `subject` or `journalist` (`render-still.mjs:139-144`) and
throws otherwise. Nobody chose a seed's colours. Write `origin: subject` — the teal is the emissions
convention `twin-palette`'s own `subject-conventions.md` records, so it is the least false of the
three — and say so in the file's prose. A fourth value (`seed`) would be a `parsePalette` change
rippling through all 22 copies plus every `PALETTE.md` reader; **out of scope, named in §6.**

### 2.3 Switch the eleven runners

Each of the eleven sites in §0b: delete the hex literal, call `readPalette` against the skill's own
root, and pass what comes back. The shape, identical everywhere:

```js
const { ground, accent } = readPalette(join(HERE, "..", "assets"), {
  stopAt: join(HERE, ".."),
});
```

Import `readPalette` from the skill's **own** `./render-still.mjs`, never from `#shared` — a skill
that reached outside itself would fail `no-cross-skill-imports.test.ts`.

`skills/twin-map-web/scripts/render-preview.mjs` changes **nothing**: it names no colour and takes
what `render-web.mjs`'s `render()` resolves.

**The values are identical, so every seed preview must come out byte-identical.** That is the
verification, and it is stronger than "the test passes": any pixel that moves means a value drifted.

### 2.4 The guard — new, and it must walk

Nothing today covers "a seed runner reads a recorded palette". Worse,
`seed-renders-standalone.test.ts:51-56` carries a **hand-written four-skill list**
(`twin-chart-beat`, `twin-chart-web`, `twin-chart-video`, `twin-map-beat`) which omits exactly the
three skills this section fixes. That is the standing counter-example
`PLAN-2026-08-10.md` names.

**New file: `skills/splash-twin/test/seed-reads-a-recorded-palette.test.ts`.** It **walks**
`skills/*/scripts/` for basenames matching `render-*.mjs` — a pattern, never a list — excludes
`render-still.mjs` (the vendored library, whose `#000000`/`#FFFFFF` contrast poles at `:73` are
assigned to `ink` and are not a palette), and asserts three things per runner:

1. **No hex in a palette position.** No match for `(ground|accent)\s*[:=]\s*"#[0-9A-Fa-f]{3,8}"`.
2. **No evasion.** A runner that names the identifier `ground` or `accent` at all must contain a
   `readPalette(` call. (Without this, moving the literal one line up defeats check 1.)
3. **The answer exists and parses.** For every runner that calls `readPalette`, the skill must hold a
   `PALETTE.md` at its root or under `assets/`, and feeding it to `parsePalette` must not throw.
   Imported from the canonical `render-still.mjs` — the test-only cross-skill read this branch
   already reserves for exactly this (`genre-shippability.test.ts:1-9`, `where.test.ts`).

Measured against the tree as it stands, this scan matches the eleven sites and **nothing else**. It
does not reach `twin-palette/scripts/palette.mjs:102-126` (its subject-convention table, which is
legitimately hexes — it is the *proposal source*), nor the sample-photo generators, nor
`bake-plate.mjs`'s basemap paint, because none of those is a `render-*.mjs`.

**Mutations that redden it, run in a copy outside the tree:**

| mutation | must fail on |
|---|---|
| restore `accent: "#0B7A75"` in `skills/twin-chart-beat/scripts/render-preview.mjs` | check 1, naming that file and line |
| replace the `readPalette` call with `const ground = GROUND_CONST;` above it | check 2 |
| delete `skills/twin-scrolly/PALETTE.md` | check 3 |
| corrupt `origin:` to `origin: house` in any skill `PALETTE.md` | check 3, via `parsePalette`'s own throw |

**Do not widen `seed-renders-standalone.test.ts`'s `CRAFT` list in this chantier.** It renders each
skill in an isolated temp root and byte-compares against the shipped preview; adding `twin-map-web`,
`twin-scrolly` and `twin-image-beat` pulls headless Chrome, a MapTiler key and minutes of wall clock
into the default suite. Check 3 above closes the specific hole (the copied directory carries its own
answer) statically and for free. The widening is real work with a real runtime bill and belongs to
whoever owns the suite's budget — §6.

### 2.5 The prose corrections

Because §2.1–2.3 make the seeds true, two of the three claims stop being lies about the seeds and
become claims about the beats. Correct all three to what is measured **after** this chantier lands
(15 of 70 beats, 12 of 12 seed runners, 9 of 22 `render-still.mjs` copies):

- `skills/twin-palette/SKILL.md:3` — the `description:` front-matter sentence. Replace *"Every render
  reads that file, and refuses rather than default"* with the reach that is true: every craft
  skill's own seed reads it and refuses rather than default; a beat that reads it refuses rather
  than default; the beats still naming hexes are the migration debt, and name the count.
- `skills/twin-palette/SKILL.md:95` — item 7, *"Every render reads it, and none defaults."* Same
  correction, and keep the `readPalette`-throws sentence that follows, which is true.
- `proof/palette-proof/PROOF.md:49-51` — replace *"import the same vendored `readPalette`"* with what
  the parity guard actually proves: every copy that carries it is compared function-by-function
  against the canonical one, and a copy that carries none is permitted
  (`render-still-parity.test.ts:20-25`). After §2.1 the three named genres do carry it — say that,
  and keep the honest boundary that only the static chart genre has been re-rendered through a
  recorded answer end to end.

---

## 3. B1.1 — the credits at the bottom

### 3.1 What "the bottom of the visual" means, exactly

**The source's last line sits on a baseline at `height - PAD`** — the frame's own bottom inner
margin, the same `PAD` the title is inset by, left-aligned on the same x as the title. Not a footer
band, not a smaller size, not the bottom-right corner (`static-discipline.md:143` is right about that
much and that part survives). For a source that wraps to n lines, the **first** line's baseline is
`height - PAD - (n - 1) * SOURCE.lead`.

### 3.2 Does the plot shrink, or does the frame grow? — **Neither. The plot translates.**

**The frame never grows.** For static and video the frame *is* the export size, and W4 is about to
make it three fixed sizes (ruling R2); a frame that grew by a variable amount would break W4's
contract before W4 is written.

**The plot absorbs the move on both ends, and very nearly breaks even.** Worked on
`ChartSeed.tsx:229-256`, `FRAME = 900×560`, `PAD = 40`, `TITLE.lead = 34`, `SOURCE.fontSize = 14`:

| | today | after |
|---|---|---|
| `sourceBaseline` | `titleBaseline + (n-1)*34 + 26` | `height - PAD` = **520** |
| `padding.top` | `sourceBaseline + 34` = `titleBaseline + (n-1)*34 + 60` | `titleBaseline + (n-1)*34 + 34` |
| `padding.bottom` | `PAD + 24` = 64 | `PAD + SOURCE.fontSize + 14` = **68** |

The header gives back the **26px** it reserved to separate title from source. The footer takes back
**4px** on top of the 24px it already reserved for the x-axis band, because a 14px source sitting on
a baseline 40px above the frame's bottom edge mostly fits inside a reserve that was already there.
Net: **the plot's top edge rises 26px, its bottom edge rises 4px, its height gains ~22px and its
width does not change at all.**

That is the general shape and it holds for every chart type: the source line is not in a gutter, so
**no horizontal geometry moves, and no measured gutter is re-measured.** This matters — it is what
keeps B1.1 out of the label-collision class this project has repeatedly found by eye.

**The rule an implementer applies, per component, in three edits:**

1. `sourceBaseline` (or `sourceTop`) ← `height - PAD`, minus `(sourceLines.length - 1) * SOURCE.lead`
   where the type wraps its source.
2. `padding.top` ← the **last drawn header line's** baseline plus the clearance the type already
   used. Never `sourceBaseline + …` again.
3. `padding.bottom` ← its existing reserve, plus whatever the source band needs beyond it
   (`height - firstSourceBaseline + SOURCE.fontSize`, clamped so it never shrinks below today's).

Nothing else moves. The `<text>` node itself keeps its `x`, its `fill={muted}` and its font size.

### 3.3 Where it is NOT a translation — the map column, 14 beats

`twin-map-beat`'s column already lays out **from both ends and meets in the middle**
(`Co2MapStill.tsx:134-149`): title hangs off the top; caveat, no-data swatch, legend bar and caption
stack up from `FRAME.height - PAD`. The plate itself is a fixed square and does not move.

So for the 14 static and video map beats, "the source at the bottom" means the source becomes the
**last** line before the bottom margin and the whole legend stack shifts **up** by the source's own
height. The plate does not resize; the legend's available room shrinks by exactly that band.

And the collision guard must be re-pointed. `Co2MapStill.tsx:155-159` today is:

```js
if (captionY - 14 < sourceBottom)
  throw new Error(`the column does not fit: the source ends at ${sourceBottom} …`)
```

Once the source joins the bottom half, `sourceBottom` is near the frame's floor and the comparison
is either always true or always false — **a guard that cannot go red, which invariant 4 forbids.**
Re-point it at the two halves as they will then be: the **title block's** bottom against the top of
the bottom stack, with a message naming the title and the legend rather than the source. Duplicated
into all 14 map components that carry it. **Mutation:** double `LEGEND.barHeight` in one map beat and
confirm the new guard throws with the new message.

### 3.4 Per craft skill, file by file

Ordered **seeds first**. The seeds are 5 of the 60 and they are what the 55 are copied from — the same
multiplier as §2, and the reason nothing else in W3–W8 should touch a component until this lands.

| step | files | change |
|---|---|---|
| **3.4.1 seeds (5)** | `twin-chart-beat/assets/ChartSeed.tsx` · `twin-chart-video/assets/EmissionsVideo.tsx` (`:245`, `:254`, `:344`) · `twin-map-beat/assets/Co2MapStill.tsx` (`:141`, `:155-159`) · `twin-map-beat/assets/Co2MapVideo.tsx` (`:177`) · `twin-chart-web/assets/ChartWebSeed.tsx` (`ChartWebPreviewSvg`, `:646+`) | §3.2 arithmetic; §3.3 for the two map seeds |
| **3.4.2 static chart beats (13)** | `proof/static-*/…Still.tsx` and the `more-*` stills | §3.2 |
| **3.4.3 video beats (~21)** | `proof/vid{x,y,z}-*/…Video.tsx`, `proof/video-*/`, `proof/*/…Video.tsx` | §3.2. The source stays inside the furniture opacity group (`EmissionsVideo.tsx:274`) — `motion-grammar.md:66` calls the source line furniture and that is unchanged, so **no timing contract moves and `video-first-frame-not-empty.test.ts` is unaffected** |
| **3.4.4 map stills and videos (14)** | `proof/map*/…Still.tsx`, `…Video.tsx` | §3.3 |
| **3.4.5 fluid map-web (2)** | `skills/twin-map-web/assets/MapWebSeed.tsx` + `proof/mapgen-dot-web`, `proof/mapgen-symbol-web` | HTML, no arithmetic: move `<p class="mw-source">` to be the last child of `.map-web`. Measured today at byte 6896 vs `mw-title` at 6745 — it sits directly under the title |
| **3.4.6 scrolly (2)** | `skills/twin-scrolly/scripts/render-scrolly.mjs:140` + the two beats | Move `.source` out of `.scrolly-header` into a `.scrolly-footer` after `.scrolly-track`, which is where a scroll story's credit conventionally sits |
| **3.4.7 legacy two-rung (4)** | `more-heatmap-co2-per-capita-decades`, `mapgen-choropleth-web`, `mapgen-hexgrid-web`, `mapgen-locator-web` | §3.2 arithmetic **inside their existing viewBox**. See §5 for why the layout migration itself is not here |
| **3.4.8 fluid chart-web (17)** | — | **nothing.** Already the figure's last child |

`ChartWebPreviewSvg` in 3.4.1 deserves a sentence: its own header (`ChartWebSeed.tsx:631-641`) says
it is the documentation thumbnail and *"explicitly NOT what `render-web.mjs` ships to a reader"* —
and it draws the source in the header while the genre it documents ships it at the bottom. It has
been contradicting its own genre all along; B1.1 fixes that as a side effect. It is not an exemption.

### 3.5 The basemap credit

`Co2MapStill.tsx:128-129` and `MapWebSeed.tsx:160` render `${source} · ${basemapCredit}` as one
string. It moves with the source, unsplit.

**Nobody has read MapTiler's attribution terms, and this spec does not need them read**, because it
is not removing the attribution, not shrinking it, and not reducing its contrast — it is moving it
from the top of a column to the bottom of the frame, which is the conventional position for basemap
credit on every web map anyone has ever shipped. The move cannot be *less* compliant than the
current placement. Recorded as an unclosed question rather than an answered one; **W6 rewrites map ×
web on live MapTiler and will have to read those terms anyway** (ruling R1 puts the key in the
delivered file), so the reading belongs there.

### 3.6 The doc edits — this reverses a written rule, in two files

`skills/twin-chart-beat/references/static-discipline.md:139-151`, the section titled *"The source
under the header, not in a footer"*, states the current placement as doctrine with a stated reason
(*"not cropped when somebody screenshots the top of the chart"*). **Rewrite the whole section.**
Retitle it, keep what survives — reading size, muted ink, never 9px, never the bottom-right corner,
carries the effective date — and record the reversal with the cost it accepts: a reader who
screenshots only the top of a chart now gets no source. Say what makes that acceptable (the graphic
is delivered as one file, and the credit in a constant position across every graphic is worth more
than robustness against a partial screenshot). Also fix `:146-150`, which describes the
title→subtitle→source stack "anchored at the top of the frame instead of the bottom" — after this,
the stack is title→subtitle at the top and source at the bottom.

`skills/twin-doctrine/references/information-architecture.md:56-70` is the section *"When a
genre-scoped file disagrees with this stack"*, and **it cites this exact override as its worked
example**, three times (`:64`, `:66`, `:67`). Its item 5 (`:45-50`) already puts the source at the
bottom by default — so the *default* is what wins, and the example vanishes. **Do not delete the
section**: the override mechanism it teaches is still correct and still needed. Replace the worked
example with one that is still true, or state that no genre currently overrides this zone and that
the mechanism stands unexercised. A section pointing at an example that no longer exists is worse
than either.

Nothing scans markdown (`HANDOVER.md:408-415`). **If these two edits are skipped, the repository
ships code that contradicts its own doctrine and only a person will catch it.**

### 3.7 The guards — new, and none of them exists today

B1.1 is per-component arithmetic. It is not a duplicated helper, so **no parity test reaches it** and
`PLAN-2026-08-10.md`'s rule applies: this spec must add the guard. Three, in layers, each with a
different blind spot, all walking.

**Guard A — `skills/splash-twin/test/credit-anchors-to-the-frame-bottom.test.ts`.**
Walks every `.tsx` under `twin/` (`node_modules`, `.git` excluded), finds every
`const source(Baseline|Top) =` and reads its right-hand side to the terminating `;`. Asserts the
expression **mentions the frame's height** (`height` or `FRAME.height`) with a subtraction, and
**mentions none of** `titleBaseline`, `titleTop`, `subtitleTop`, `limitsBaseline`, `caveatBaseline`,
`noteBaseline`. Discovered by walking; a beat copied from an un-migrated component fails the moment
it lands, which is the regeneration this chantier exists to stop.
*Blind spots, stated:* it proves the **expression** names the bottom, not that the glyph lands there
(a component could compute `height - PAD` and then draw at `y={12}`); and it is blind to a component
that draws the source at a literal `y` with no named const. Guards B and C cover both directions.
*Mutation:* re-anchor `ChartSeed.tsx`'s `sourceBaseline` to `titleBaseline + 26` → must go red
naming that file.

**Guard B — the same file, over committed HTML.** Walks `proof/*/*.html` (21 files today) and, for
each that carries a source element (`chart-source`, `mw-source`, or a scrolly `.source`), asserts its
byte offset **exceeds** the plot element's. That is precisely the measurement the survey made by hand
on `webx-carbon-footprint` and it generalises for free.
*Mutation:* swap two lines in one committed HTML so the source precedes the plot → red.

**Guard C — the same file, over committed SVG.** 17 static chart beats ship a
`*-still.svg` beside the PNG (`ls proof/*/*.svg | wc -l → 17`). For each, parse the `<text>` whose
content matches the beat's source string and assert its `y` falls in the **bottom eighth** of the
`viewBox`. This is the layer that proves Guard A's expression actually reaches pixels.
*Blind spot:* only 17 of 60 components ship an SVG; the mp4 and PNG genres are covered by A alone.
*Mutation:* edit one committed SVG's source `<text>` `y` to a header value → red.

None of the three is a hand-written list. All three walk.

---

## 4. The proof — what gets re-rendered and opened

Not "the suite is green". Opened artifacts, at named sizes, with what to look at.

**Re-render scope, named honestly.** Every committed artifact that carries furniture is regenerated:
**30 PNG stills, 19 mp4, 21 HTML, 17 SVG.** The 17 fluid HTMLs are re-rendered by §1 alone (the
`640px` string is baked into each one, e.g. `carbon-footprint.html:63`).

| # | artifact | opened at | what is looked at |
|---|---|---|---|
| 1 | `proof/webx-carbon-footprint/carbon-footprint.html` | 1600 / 1024 / 768 / 375 px | the title's last word runs past the old 640px line at 1600; the source line likewise; the plot is pixel-unchanged; nothing overflows at 375 |
| 2 | `proof/webz-bump-emitter-rank/bump.html` | 1600 / 375 | second of the 17 — proves it came from the shared CSS and not from one beat |
| 3 | `skills/twin-chart-beat/assets/preview.png` + the six other seed previews | native | **byte-identical to what ships today.** `bun test seed-renders-standalone` asserts it for four of them; diff the other three by hand. Any moved pixel means a palette value drifted in §2.3 |
| 4 | `proof/static-carbon-footprint-spread/…-still.png` **and** `…-still.svg` | native, 900×560 | source on the frame's bottom margin, left-aligned with the title, not clipped, not overlapping the x-axis labels; the plot ~22px taller with no label collision introduced |
| 5 | `proof/vidx-line-life-expectancy/…mp4` | frame 0, mid, last | the source visible at the bottom from the moment the furniture fades in, and still there at the last frame; the title unmoved |
| 6 | `proof/mapgen-choropleth-video/…-still.png` | native | the column: title at top, then a gap, then legend / no-data / caveat / **source last**; the legend still fits; the re-pointed guard did not throw |
| 7 | `proof/mapgen-dot-web/dot-population.html` | 1600 / 375 | `mw-source` after the map, not under the title; basemap credit travelled with it |
| 8 | `proof/mapmore-scrolly-danube/*.html` | 1600 / 375 | header full width, source now in a footer after the last step |
| 9 | `proof/more-heatmap-co2-per-capita-decades/*.html` | 1600 | source at the bottom of its viewBox. **Still 900px wide — that is expected here**, §5 |

Plus the four mutation runs of §2.4 and the four of §3.7, each executed in a copy of the tree outside
the repository, per invariant 4.

---

## 5. The four un-retrofitted beats — **W4, not W2**

`more-heatmap-co2-per-capita-decades`, `mapgen-choropleth-web`, `mapgen-hexgrid-web`,
`mapgen-locator-web`. All four never migrated to the fluid redesign (`HANDOVER.md:503-528`): every
word is an SVG `<text>` inside a `viewBox` that a media query swaps between `DESKTOP_LAYOUT` and
`NARROW_LAYOUT` at a fixed cap — measured: `max-width: 900px` (heatmap `:256`, hexgrid `:144`),
`860px` (choropleth `:211`, locator `:132`), each with its own `buildCss`. The survey calls B6.2
*"not a heatmap bug — the un-retrofitted beat"*, and the parallel web survey calls the retrofit the
highest leverage-to-cost item it found.

**The layout migration goes to W4. Three reasons, in order of weight.**

1. **Three of the four are map-web beats that W5 and W6 are about to rewrite anyway.** Ruling R1
   makes map × web live MapTiler with native zoom and pan; W5 makes the camera take a target aspect.
   Rebuilding `mapgen-choropleth-web`'s two-rung SVG furniture as fluid HTML in W2 is work W6
   discards. That alone settles it.
2. **The deliverable is fluidity across a range of widths, which is R2's own subject.** W4 is
   *"Three export sizes, and web as a range"*; a two-rung layout is precisely the thing that cannot
   be a range. B3.3 in W2 is one CSS declaration on an **already-fluid** genre; this is a genre
   migration. They are different kinds of work that happen to produce a similar-looking symptom.
3. **Splitting it would be worse than deferring it.** `more-heatmap` is the only one of the four
   untouched by W5/W6 and could be done here — but the migration's value is that the web genre stops
   meaning two different things, and doing one of four does not buy that.

**W2 still owes those four beats the transversal items, and pays.** B1.2 reaches them (a palette read
is orthogonal to layout: `more-heatmap` names `const GROUND = "#FFFFFF"` at `render-web.mjs:37` and a
second `background: #FFFFFF` in its CSS at `:255`, and both become one recorded answer). B1.1 reaches
them as §3.4.7 — the same two-line arithmetic, applied **inside their current viewBox**, ~4 × 2
lines that W4/W6 will later redo when the words become HTML.

That redone work is deliberate, and the alternative is worse: exempting four beats from Guard A means
a hand-written exemption list, which is the `helper-parity.test.ts` failure mode this branch has
already paid for twice — *"a guard maintained by remembering stops covering things"*
(`render-still-parity.test.ts:4-9`).

**Handover to W4:** its first and cheapest instance is `more-heatmap-co2-per-capita-decades` (a
chart-web beat, no map machinery, closes B6.2 outright); the three map-web beats should be folded
into W5/W6 or sequenced strictly after them.

---

## 6. What this does NOT close

- **The 54 beats that still name a hex.** §2 fixes the seeds and the three missing vendored copies —
  it changes what beat 71 is copied from. It does not migrate beats 1–70. That backlog stops growing
  here; it does not shrink here. A per-beat guard equivalent to §2.4's, pointed at `proof/`, would
  turn the suite red on 54 existing beats and is therefore a migration, not a guard.
- **`origin` has no honest value for a seed.** §2.2 writes `origin: subject` and says why. A fourth
  value (`seed`) is a `parsePalette` change rippling through 22 `render-still.mjs` copies and every
  reader of a `PALETTE.md`.
- **`twin-dw-beat` is untouched.** It names `#0B7A75` at `prove-co2.mjs:45` and
  `verify-range-annotation.mjs:25`. Its colour arrives through a Datawrapper spec field, not through
  a ground/accent pair — and DW has no ground at all this account can set (the parent repository
  measured `POST /v3/themes` → 401 and `metadata.publish.background` silently not rendering). Neither
  §2.4's scan nor §3's arithmetic reaches it. A DW palette path is its own small chantier.
- **`seed-renders-standalone.test.ts` keeps its four-skill hand-written list.** §2.4 explains the
  runtime cost of widening it and closes the specific hole statically instead. The list remains an
  instance of the pattern this branch names as its counter-example — recorded, not fixed.
- **`twin-image-beat` has no story-level source line at all** (per-photo credits under each photo,
  `ImageBeatSeed.tsx:133-137`, `:236-243`). Whether B1.1 is already satisfied there or a line is
  missing is an editorial question for the owner, not a code one. §3 touches it only through §2.
- **The layout migration of the four beats** — §5, W4.
- **MapTiler's attribution terms** — §3.5, unread, deferred to W6 which must read them regardless.
- **B1.3, the typeface** — W7, and it must be measured before it is specified.
- **Guard A cannot see a component that draws the source at a literal `y`**, and Guard C covers only
  the 17 beats that ship an SVG. Both blind spots are stated in the guard's own header, per this
  branch's habit.

---

## 7. Order of execution

1. §1 — one CSS declaration, one scrolly declaration, two doc edits, re-render 17 + 2 HTML.
2. §2 — three vendored copies, seven `PALETTE.md`, eleven runners, one new walking guard, three prose
   corrections. **Previews must come out byte-identical.**
3. §3 — the five seeds first, then the 55 beats by genre, the re-pointed map guard, three new walking
   guards, two doc reversals, full re-render.

§1 and §2 are independent of each other. **§3 must not start before §2 has landed**, or the 55 beats
get their credit arithmetic from seeds that still hardcode their colours, and the next pass re-opens
every file this one just touched.

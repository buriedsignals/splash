# Where the interrupted work stopped — the resume ledger

Five chantiers were asked to land what they had and stop, so a repository-wide rename could run
before the work was sent out. **This file is how they get picked up again**, and it is written to
survive that rename: every stopping point is recorded against the identifier it will have *after*
the rename, with the old one beside it.

Filled as each agent reports. A row with no measurement is a row nobody can trust — say "not
verified" rather than leaving it implied.

## The name mapping, so a stopping point still resolves

The rename drops the `twin-` prefix and moves `twin/` to the repository root.

**Read this table with care: the rename has since been applied, so a mechanical sweep would flatten
the two columns into one. The left column is written with a `T-` marker standing for the old
`twin-` prefix, precisely so it survives.**

| before (`T-` = the old `twin-` prefix) | after |
|---|---|
| `twin/skills/splash-T-suffix` (`splash-twin`) | `skills/splash` |
| `twin/skills/T-chart-beat` | `skills/chart-beat` |
| `twin/skills/T-chart-video` | `skills/chart-video` |
| `twin/skills/T-chart-web` | `skills/chart-web` |
| `twin/skills/T-deliver` | `skills/deliver` |
| `twin/skills/T-doctrine` | `skills/doctrine` |
| `twin/skills/T-dw-beat` | `skills/dw-beat` |
| `twin/skills/T-image-beat` | `skills/image-beat` |
| `twin/skills/T-intake` | `skills/intake` |
| `twin/skills/T-map-beat` | `skills/map-beat` |
| `twin/skills/T-map-web` | `skills/map-web` |
| `twin/skills/T-newsroom-charter` | `skills/newsroom-charter` |
| `twin/skills/T-palette` | `skills/palette` |
| `twin/skills/T-scrolly` | `skills/scrolly` |
| `twin/skills/T-storyboard` | `skills/storyboard` |
| `twin/proof/…`, `twin/shared/…`, `twin/scripts/…` | `proof/…`, `shared/…`, `scripts/…` |
| `#shared/T-chart-beat`, `#shared/T-chart-video` | `#shared/chart-beat`, `#shared/chart-video` |
| the doctor binary, `splash-T-suffix-doctor` | `splash-doctor` |
| `~/.claude/skills/splash-T-suffix` | `~/.claude/skills/splash` |

## The five chantiers, and where each stopped

*(filled from each agent's own handover — finished work, unfinished work with its exact stopping
point, and anything found but not fixed)*

### 1. Static beat migration, lot B — **FINISHED, nothing to resume**

Ten of ten committed, each rendered at 1920×1080, measured from the PNG's own IHDR, and opened.
Ratchet 48 → 43 (76 briefs, 33 pinned), re-measured off the tree rather than decremented.

Found and deliberately not fixed — these are the resume points:

- **`population-pyramid` is arguably a band-scale type** (ordinal age bands, already row-driven, its
  twin form is the form it is in) and is refused at both tall frames only for want of a line in
  `BAND_SCALE_TYPES`. Not added because that file is carried per skill and other lots held copies.
- **No measured aspect range for waterfall, slope, small-multiples or bump.** Each is one probe run
  from being reachable at square and portrait.
- **The pyramid's zero spine has vanished at landscape** — 21 labels at 26 px leave gaps that touch,
  so no segment survives. Recorded in the artifact's own `data-ladder`, not repaired.
- **The ladder has no rung for a TITLE, and on these beats the title is the claim.** At a 36 px
  floor the headline takes 72–78 px over 3–4 lines and the credit 42 px over 3, against portrait's
  979 px safe band. This is the real reason the refusals happen, and it is a design decision — a
  claim cannot be shortened without changing what the beat states.

### 2. The entrance animation (B3.1)
### 3. The last three palette gaps — **1 closed, 2 left open deliberately**

- **Closed**: `mapscrolly-one-map-europe-carbon`, **0 px → 269,318 px** of moved data ink (32.8% of
  its ink). Its choropleth ramp ran `ground → ink`; it now runs from the recorded accent. Helpers
  copied into the beat with `@parity` tags, never imported across skills. The pair was opened and
  looked at: teal Europe against warm-red Europe, every word and tick byte-identical.
- **Open**: `scrolly-one-chart-swiss-life-expectancy` (0 px) and `scrolly-mixed-grinnell-ice`
  (48 px). **The cause is the instrument as much as the beats**: `two-palette-proof.mjs` photographs
  a page once, at the position it opens in, and a scrolly's picture *is* the scroll. The swiss beat
  spends its accent on steps 2–4 (step 1 is deliberately the bare shape); the mixed beat opens on a
  photograph while its accent lives on the map's glacier outline and the chart's highlighted run.

**A step-aware shot was built, measured 412 px and 192 px — and was deliberately thrown away.**
Run against `mapscrolly-quakes-three-ways`, whose code nothing had touched, it reported **1,048,276
px moved (75% of the frame)**, which cannot be an accent and is almost certainly camera or
transition state differing between two runs. A guard that can report a million pixels of noise would
certify a beat drawing in no recorded colour at all. Nothing of it is in the tree.

**Resume points:**
1. A scrolly-aware palette measurement needs the noise ruled out first — the quakes reading is the
   test any such instrument must pass before it is trusted.
2. **`best` is selected by the highest FRACTION while the verdict reads MOVED.** Latent today
   because most beats write one comparable image; wrong the moment a beat writes several — a shot
   where 90 px of ink all changed wins the row at 100% over one where 40,000 px moved, and the beat
   reports STILL. Not shipped; it sat in the reverted change.
3. `proof/mapscrolly-one-map-europe-carbon/drive/*.png` are stale against the new render (they still
   show the grey ramp). They were already modified in the tree by another session, so they were
   neither staged nor re-run.

The other 69 beats were **not** re-measured this session; the standing figure is the earlier sweep.

**RESUMED AND CLOSED, 2026-08-10 (commit `8c463198`) — resume points 1 and 2 are done, and both
beats turned out to be fine.** The million was reproduced first, on the beat nobody had touched:
photographed one animation frame after the scroll, `mapscrolly-quakes-three-ways` moved **1,036,828
px, 74% of the viewport** between two runs of *identical bytes*, so the cause is measured rather
than suspected — **the shot was taken before the frame had finished painting**, not camera state.
A second trap sat beside it: shooting at the EDGE of a step's stretch photographs the next frame,
which makes all four of that beat's readings report the same 1,763 px. The shot now drives to each
step's MIDPOINT and photographs only once three consecutive frames are byte-identical, never on a
sleep; and **one run's pages are photographed twice**, so a beat whose repeat of its own bytes moves
as far as the verdict's 200 px floor is reported `unmeasured` rather than judged — the check the
thrown-away shot lacked. Settled, quakes reads events 51,098 · biggest 28,676 · strength 1,763 ·
bins 1,606 px, byte-identical over three repeated runs, and its pair is a teal ring against a
warm-red ring with everything else identical. **`scrolly-one-chart-swiss-life-expectancy` moves
34,532 px (71% of its ink)** and **`scrolly-mixed-grinnell-ice` moves 5,144 px**; both pairs were
opened and looked at. Harness noise measured **0 px on all 28 browser-path beats**. Resume point 2
shipped with it: `pickBest` selects by the move, fixture at
`skills/splash/test/the-palette-proof-reports-the-biggest-move.test.ts`, red under its mutation.
Re-measured with the same shot, `mapscrolly-one-map-europe-carbon` reads **1,062,872 px, 86.9% of
its ink, 0 px noise**. **Resume point 3 is still open** — the stale `drive/*.png`. And one honest
STILL remains, `scrolly-image-grinnell-glacier`, which its own `PALETTE.md` predicts: the
photographs are the whole visual, nothing encodes a value, and the two runs are byte-identical under
the old shot as well as the new one.

### 4. A15 / A16 / A25

### 5. Codex and Gemini, and the gates on each — **MEASURED, both stopped on a paywall**

Discovery proven on both, a complete run proven on neither. **Not a defect in either host.**

- **Codex 0.144.1 — 15/15 discovered** via the flat door, namespaced from the plugin manifest. Ran
  five journalist turns on a French article, froze the source, took the takeaway and the medium as
  separate gates, wrote the storyboard, palette, brief and component, **rendered a real chart**, then
  two correction cycles — and stopped at the plan's usage limit **one turn short of the approval
  gate**. Phase was recovered from disk across three fresh sessions with nothing re-asked.
- **Gemini 0.50.0 — 15/15 discovered**, unnamespaced, listed beside the other product's 17. Its one
  run activated **the other product** and exhausted the free tier in two turns. Confounded by this
  machine carrying both products in the same directory; not evidence the twin is undiscoverable.
- **Gates**: G1 and G2 closed into `STORYBOARD.md` on Codex; G3 and G4 closed on neither host —
  Codex never reached them. The gates held by the filesystem: nothing invented an approval, and
  delivery refused.

**Two defects that are ours, not the hosts'** — **both addressed 2026-08-10, one repaired and one
made visible; read each one's "Since" line, because they were closed in different senses:**

1. **A headless Codex prompt carries no image-viewing tool at all** (measured: zero occurrences),
   while seven skills instruct the model to open the PNG and look. It inspected the SVG instead —
   which models contrast and alt text but **not overlap or clipping** — and across three cycles
   shipped a new unseen collision each time while reporting success: clipped title, then crushed y
   ticks, then a clipped limits line. The method depends on looking; on that host it cannot.

   **Since:** *not repaired — made visible, which is the honest ceiling here.* No fallback was
   built: the measurement is that inspecting the source produces false confidence, so a mechanism
   encouraging it would be worse than a refusal. What shipped is (a) the same paragraph, byte for
   byte, in all ten `SKILL.md` files that tell the model to look — naming the tool the rung depends
   on, and instructing a host without one to say so, leave the render unapproved and never report it
   as checked; (b) `skills/splash/scripts/vision-probe.mjs`, a PROOF rather than a detection (a
   shell cannot read the model's tool set): it writes an image carrying a word, keeps only that
   word's SHA-256, and takes `--answer <word>` or `--cannot-see`; (c) a `note` row in the doctor that
   names its own blindness and points at the probe. Guard:
   `skills/splash/test/looking-needs-an-instrument.test.ts`, with three mutations recorded.
   **Still open:** a model can decline to run the probe, answer it dishonestly, or look carelessly —
   none of that is mechanisable, and none of it is claimed.
2. **`runPreflight` called with the shell's environment reports a capability closed that is open.**
   The model told the journalist the map capability was shut while the key is present and answers
   200. `installer/doctor.mjs` predicts this verbatim; the skill documents the signature without the
   rule. A minutes-long fix, not yet made.

   **Since: repaired.** `runPreflight` reads `<root>/.env` itself and layers it over whatever `env`
   a caller passes — precedence, not refusal, because `process.env` cannot be told from a
   deliberately assembled environment except by heuristics a spread would walk through. Every
   capability row now carries `source` (`"root .env"` / `"environment"` / `"unset"`), and a key that
   resolves only from the shell says so in its own `reason`, so precedence hides nothing. The rule
   is stated in `skills/splash/SKILL.md` beside the signature, and a test holds it there.

**Not tested, and not to be read as working**: G3/G4 on any host but Claude Code; whether Gemini can
drive the twin at all; interactive Codex (a TUI session may expose image viewing and would change
verdict 1); Codex's sandbox against the seven puppeteer scripts and the map bake's network fetch;
Goose; Claude Desktop.

### 6. The map genres on the export-size table — **SIX DELIVERED, FOUR REFUSE, and the four are one finding**

Ten map beats, `map-geneva-locator` through `mapvid-locator-geneva`. The seam a map needed did not
exist: `type-at-size.mjs` refuses `map` in writing and hands the target aspect to "the map chantier".
It exists now — `skills/map-beat/scripts/stage.mjs`, carried in three copies, guarded by being
DRIVEN against `assets/geo.ts` rather than compared as text.

**Delivered, each measured from the artifact's own bytes at 1920x1080:** `map-geneva-locator`
(846x846 map), `map-quake-density` (1213x697), `mapmore-dot-population` (809x714),
`mapmore-flow-danube` (1015x474), `map-quake-symbol` (809x809, static only) and
`mapgen-choropleth-video` (846x846, static only).

**Refuse every row of the table:** `mapvid-hexgrid-quakes`, `mapvid-locator-geneva`,
`mapvid-dot-population`, and the video halves of the two beats above. One cause, measured five times:
at the video table's 30 px landscape floor these beats' WORDS fill the band — 879 px of 910, 1191 px,
729 px even in the impossible limit where every string fits on one line — and the ladder's last rung
before R9 costs the caveat, which on a map is the honesty line. **This does not come down by trying
harder.** It comes down when those beats' words are shortened, which is an editorial decision.

**RESOLVED 2026-08-11 — the words WERE shortened, and the last sentence above is measured false.**
The removal ladder gained **R6**, a rung that shortens a title and refuses a shortening that drops
what it asserts (`skills/chart-beat/scripts/type-at-size.mjs`, six mutations in
`the-title-rung-shortens-without-dropping.test.ts`). Each of the three map videos now carries its own
`probe/size-budget.mjs` — reproducing its component's baseline arithmetic at every candidate frame,
calibrated against the frame it really ships, and generous in the stated direction — plus a
`probe/VERDICT.md`. What they read:

- **locator** — R6 FIRES, 3 title lines to 2 at landscape (114 characters to 101, every quantity,
  the place, and **what the 11 counts** kept). The line is worth 90 px against a 106 px gap; spending
  the conclusion as well leaves 53 px of plate, a 53 × 53 map in a 1920 px frame.
- **dot map** — R6 FIRES on one word ("half of this map's people" → "half this map's people"; the
  long form overruns landscape's measure by 10 px). A **one-line title leaves 88 px of plate**, 1.1%
  of the area its 2,996 dots are drawn in. This is the beat that settles the lot: least word-heavy,
  shortest headline, and still nowhere near.
- **hex grid** — R6 DECLINES at every frame: the shortest form that still makes the claim is 80
  characters against 85 and wraps the same. 58 px of plate at landscape.

**The refusal does not rest on the caveat**, and that was measured rather than assumed: with the
caveat gone entirely, square and portrait still have no room for any of the three. The honesty line
is kept AND the beats refuse.

**What would actually move them, named and not attempted:** this genre lays seven blocks in ONE
COLUMN — title, plate, legend/ruler/meter, conclusion, caveat, source — while a 1920 × 1080 frame
offers 1750 px of width against 910 px of band. A landscape layout that puts the plate BESIDE its
words rather than between them is where the room is. That is a redraw of the genre's layout, a
person's decision, and not a rung on any ladder.

**Resume points:**

1. **`shared/chart-video/sizes.mjs` contradicts itself** and nobody has decided which half is right.
   Its header derives the 30 px landscape floor from "a phone turned sideways, ~800 dp", while
   `viewedAtCssPx()` in the same file returns **900** for landscape, copied verbatim from
   `chart-beat`. A refusal message that reads that function prints "900 dp" for a video.
2. **`beat-genre-produces-artifact.test.ts` has no residue row for a beat whose video genre
   legitimately refuses.** `mapgen-flowmap-video`, `mapgen-choropleth-video` and `map-quake-symbol`
   each keep a committed 1080x1080 mp4 that no code path can now reproduce, because removing it
   reddens that guard while keeping it leaves an artifact at a size the table does not carry. Their
   pre-table 1080x1080 STILLS were removed (they would fail the pin). Named, not taken.
3. **`map-quake-symbol`'s marks are 5.83x the nearest-neighbour ceiling, and the ratio is
   scale-INVARIANT** — radii and gaps are both fractions of the plate, so drawing bigger moves it not
   at all. Disclosed in the frame already (the caveat counts nine overlaps), but it is the one
   encoding a bigger frame cannot help.
4. **`mapmore-dot-population`'s five name plates erase 421 of 2,996 dots (14%)**, 22 of them
   belonging to a country the plate does not name. The plate is opaque because a translucent one
   measured 2.98:1. Whether a dot map should label its subjects some other way is a person's call.
5. **`mapgen-choropleth-video`'s subject-label floor is not wired into the still.** The still passes
   it at 0.76x by measurement, but by luck rather than by rule; ~10 lines, same import.

**Not this lot's, but reddening beside it:** `proof/scrolly-mixed-grinnell-ice` (three failures) and
`proof/portrait-aspect-probe` (the regeneration guard, 20 arms with no render script in ancestry).
Both predate this work and belong to other sessions.

## Known before this interruption, and still open

- **`co2-suisse`** — the project's first beat has no producing script and no front matter. Its
  committed still is 1800×1120, the doubled-scale defect. It cannot be pinned until something can
  render it.
- **`proof/comparison`** — comparison plates only, no brief, nothing to pin.
- **`vidz-diverging-bar-eu-per-capita`** — 27 EU rows clear no size against the type floor without
  dropping member states, which would change what the beat states. A redraw decision, not a
  migration. **2026-08-11: closed as a question, still refused as a beat.** R6 declines here (62
  characters against 72, same line count everywhere), and a title of NO HEIGHT would not close it —
  440 px of plot at landscape where one column of 27 rows needs 1,242. The fourth frame is priced:
  the beat fits 1080 × 1350 only at a 17 px axis tick, **5.7 CSS px** on the 360 dp phone that frame
  is read on, and a fourth row honouring the table's own 12-CSS-px rule delivers a 10.3 px row pitch
  against a 54 px lane even with the title gone. **The beat is not waiting on a row in the table.**
- **The line's measured aspect range** was taken at 900×560 and at the probe's frames, never at
  16:9, while this corpus's own accepted landscape line measures 1.94:1. The range's own file
  already records the doubt.
- **`assertPlotAspect` is not wired into the video path**; wiring it as the range stands would
  refuse a delivered artifact.
- **A square line chart passes both guards at 0.83:1 and is still unpublishable** — the bound is
  too permissive on that side.
- **`mapgen-symbol-web` still uses the flat magnitude scale** while the static and video siblings
  now carry energy, so the three formats disagree.
- **The transform blind spot** in the annotation-over-marks guard: it does not read `transform`, so
  it places an element in a translated group 116 px too high and accuses correct beats.
- **Claude Desktop (C1.2)** was never driven — it needs a person to open the app.

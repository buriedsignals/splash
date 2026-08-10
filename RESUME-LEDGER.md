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

## Known before this interruption, and still open

- **`co2-suisse`** — the project's first beat has no producing script and no front matter. Its
  committed still is 1800×1120, the doubled-scale defect. It cannot be pinned until something can
  render it.
- **`proof/comparison`** — comparison plates only, no brief, nothing to pin.
- **`vidz-diverging-bar-eu-per-capita`** — 27 EU rows clear no size against the type floor without
  dropping member states, which would change what the beat states. A redraw decision, not a
  migration.
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

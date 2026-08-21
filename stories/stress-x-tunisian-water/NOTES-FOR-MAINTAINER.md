# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

**The rasteriser ignores SVG's `direction`, and nothing in the toolchain knows a label is right to left.**

`grep -rniE '\brtl\b|unicode-bidi|right-to-left|bidi|arabic|hebrew' skills shared` returns two hits,
both inside a bundled third-party map library. There is no direction switch, no anchor flip, no
axis-side rule anywhere.

That matters less than it sounds for the LETTERS — resvg runs Arabic joining and the Unicode bidi
algorithm inside each run on its own, so a frozen Arabic string is drawn joined and in reading order
with no help. It matters entirely for the PARAGRAPH: resvg resolves the paragraph level as
left-to-right and ignores `direction="rtl"` and `unicode-bidi`. Measured, three renders of one
string with and without both: identical ink. The consequence is a sentence-final ASCII full stop
drawn at the visual RIGHT of an Arabic line, so the line reads `.الجدول` — punctuation at the start
of the sentence. That is the class of failure the frozen article says the desk rejected.

What resvg DOES honour is the Unicode explicit formatting CHARACTERS. Measured on the same run:
U+202B/U+202C (RLE/PDF), U+2067/U+2069 (RLI/PDI), U+2068/U+2069 (FSI/PDI) and a TRAILING U+200F all
place the stop correctly; the bare string and a LEADING U+200F do not. The beat wraps every run that
carries an RTL letter in RLI/PDI, in its own `rtl()` helper, and that helper is the thing that
belongs one level up: every beat in every RTL story will need it, and today each one has to
rediscover it by rendering, zooming in and reading the punctuation.

## Found at storyboard

**`proposeCredit` recommended `unattributed` on an article that names its source.**

The frozen article says "The figures come from the national water utility and cover the 2025 calendar
year". `attributionsIn` returned `[]` and `proposeCredit` recommended `none`, whose printed line is
"Source: not stated". Two halves: `ATTRIBUTION_CUES` has no Arabic cue at all (`وفقًا لـ`, `حسب`,
`المصدر`), and even in English it has no `comes? from` / `come from` cue, which is the plainest
attributing phrase there is. The credit was recorded through the proposal's escape instead.

Round four fixed the direction where an attribution is INVENTED. This is the opposite direction: a
real attribution ERASED, and the printed line then says out loud that nobody stated a source.

## Found at storyboard

**`palette`'s subject conventions match English and French words only.**

`SUBJECT_CONVENTIONS`'s `water` row matches `water|river|rainfall|flood|eau|pluie|…` with `\b`
boundaries. The recorded subject here is `محافظة تونس` on a story about `استهلاك المياه`, so
`proposePalette` returned the house options alone and recommended `#D4A853` — with no line anywhere
saying the subject was checked and found to carry no convention, because as far as the function is
concerned it genuinely did not. Blue for water is the table's own strongest example, and this story
could not reach it.

Same shape as the known denominator defect, in a different module. Both read a NAME against a Latin
token list.

## Found at production

**`familyResolves` probes a Latin string, so it certifies a face that draws this story's own text as empty boxes.**

`RESOLUTION_PROBE` is `"Handgloves 0123456789 — MWmw il1 %"`. `familyResolves("Geeza Pro")` returns
`true` — correctly, for Latin. Rendered with this story's own strings, Geeza Pro draws the ASCII
colon and `2025` as tofu: resvg does not fall back glyph by glyph inside a family it DID find. So
the one measurement the typeface gate makes says yes to the face that would have shipped boxes.

`proposeTypeface` also knows nothing about the story's script. It recommended
`Helvetica, Arial, sans-serif` (`origin: default`), which turns out to be the right answer here for a
reason it did not measure: an absent family falls through to resvg's own system fallback, which HAS
Arabic. An unattended run would have recorded the right face by luck, and on a machine whose fallback
chain lacked Arabic it would have recorded tofu with the same confidence.

What would close it: probe in the SCRIPT the story is recorded in (`STORYBOARD.md`'s `language:`
already carries it), and report a face that resolves but has no coverage for that script as a
refusal, not as a pass.

## Found at production

**`inspectSvg` is called by nothing outside its own test file, and it caught a real defect here.**

`grep -rn "inspectSvg" skills shared stories proof scripts` finds the definition, its own
`test/inspect-render.test.ts`, and comments. No `render.mjs` in `stories/` or `proof/` calls it, and
neither does `render-preview.mjs`.

Run by hand against this beat's first accepted render, it reported `#1F6FB2` at 3.34:1, failing. The
subject's own value label was set in the accent: legal as a MARK (3:1 non-text floor, which is what
`palette` measures) and illegal as a WORD (this file's flat 4.5:1). The label moved to `ink`. Nothing
in the render path would ever have said so — `assertTypeFloor`, `assertWithinStage`,
`assertDeliveredSize` and `assertDrawnInActiveTypeface` all passed on the failing render.

This is one of the 26 idle guards `chart-beat/SKILL.md`'s last section counts, and it is worth
promoting: it is the only thing in the tree that measures a rendered word against what is actually
behind it.

## Found at delivery

**`creditTracesToRecord` cannot see a fabricated credit in a non-Latin script.**

`NAME_RUN_RE` is `/[A-ZÀ-ÖØ-Þ][\w'’&.-]*(?:\s+[A-ZÀ-ÖØ-Þ][\w'’&.-]*)+/gu` — a capital-initial run.
Arabic, Greek, Hebrew and CJK have no case, so no organisation name in those scripts is ever
extracted and the guard passes vacuously.

Measured as a controlled pair on a copy of this delivered story:

- credit replaced with `المعهد الوطني للإحصاء وشركة كهرباء قرطاج` — not one of those words appears in
  the frozen `source/` — `{traces: true, unattested: []}`;
- credit replaced with `Zarzis Hydrological Bureau`, the same fabrication in Latin —
  `{traces: false}`, with the full refusal.

So the harm this guard exists for — a real third party recorded as having compiled data it never
touched — is unguarded for every story not written in a cased script.

## Found at delivery

**A committed story runner cannot be aimed, so the example-runner sweep rewrites the repository.**

`example-runners.mjs`'s header states: "IT DOES NOT WRITE INTO THE REPOSITORY. Every runner is handed
a scratch directory, as the positional argument and as `--out`. A runner with no `outDir` in its
source cannot be aimed anywhere and is left out of the population."

The aiming test is the presence of the STRING `outDir`, not the ability to be aimed. This beat's
runner — written from `chart-beat/SKILL.md`'s own Quick start, and the same shape as
`stress-p-transport-ridership/beats/1-overall-picture/render.mjs` — writes `outDir: join(HERE,
"renders")` and reads no argv. It is classified `called`, not `unaimable`.

Reproduced: with an empty scratch directory `S`,
`bun stories/stress-x-tunisian-water/beats/1-consumption-by-governorate/render.mjs "$S" --out "$S"`
leaves `S` empty and rewrites both files in the beat's committed `renders/`. No harm landed here —
the render is deterministic, so the digest `OUTPUT-REVIEW.json` binds did not move — but a
non-deterministic producer would invalidate its own approval from inside a test sweep.

## Found at storyboard

**A stated multiplier is never read, so "142 million" cannot be placed against a column stored in base units — and a column name inside the takeaway is read as a number.**

Nothing to do with Arabic; found by translating this story into English to isolate the language and
finding the verdict unchanged. Against a profile whose consumption column is typed
`[29000000, 142000000]`:

- `"Tunis consumption_m3 is 142 million, the highest of any governorate."` — `142` comes back
  `unverifiable`, "could not be placed in any numeric column's range or total". The word `million`
  standing beside the numeral is not read as a multiplier.
- The same sentence with `142000000` written out — `consistent`, "within the range of column
  consumption_m3".

Journalists write "142 million cubic metres"; frozen tables store `142000000`. So the one numeric
reading `groundTakeaway` can actually make is unavailable for the commonest way a number appears in
a takeaway, and every such story lands on `unverifiable` for a reason that has nothing to do with
the data.

Second, smaller, in the same run: the token `consumption_m3` in the takeaway produced a separate
claim `3`, reported as unplaceable. A digit glued to letters is read as a number — the same shape as
the profiler's known `Commune-001` → `-1` defect, one module over.

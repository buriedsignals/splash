# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at storyboard

**D1 — the grounding check reads sentences, not clauses, so a two-series takeaway can never be
placed.** `resolveGrounding` on this story's confirmed takeaway returned `unverifiable` with all
five measured numerals `unplaceable`, each with the same reason: *"the claim names 2 of this
profile's measures ("passengers_millions", "punctuality_pct"), so nothing says which one it is
about"*. Every one of those numerals is the exact value the frozen table holds, and its own clause
names its own measure — "rail passengers rose from 58.2 million", "punctuality fell from 91.4 per
cent". `chooseValueColumn` is asked once per SENTENCE (round five's fix), and this takeaway is one
sentence carrying two measures. The refusal even names the correct column for each numeral inside
its own detail text: *"it would fall inside passengers_millions [28.1, 74.6]"*. Splitting the
takeaway into one sentence per measure places all of them. Reproduce:
`resolveGrounding(takeaway, profile, { csv })` in `skills/storyboard/scripts/propose.mjs`.

**D2 — the plain two-year comparison shape is word-order-sensitive, and the shape the doctrine
writes down as its own example does not match.** `skills/storyboard/SKILL.md` and
`ground-claim.mjs`'s own header both give the example *"X in 2024 was lower than in 1993"*.
`PAIR_EN_RE` (`ground-claim.mjs:511`) requires the polarity word BEFORE the first year, so that
exact word order produces no comparison claim at all. Measured on this story's data:

    groundTakeaway("Punctuality in 2025 was lower than in 2014.", ...)  ->  no claim
    groundTakeaway("Punctuality was lower in 2025 than in 2014.", ...)  ->  supported

The second is the only order that works, and it is not the order the documentation teaches. A silent
miss, which is the class round five named as its structural theme.

**D3 — the survey shows the journalist only the FIRST sentence of a type sheet's refusal, and for
`Line` that drops the one rule this beat turns on.** `references/type-survey.md` promises "the same
sheet's own 'when NOT to reach for it' sentence verbatim"; `scripts/type-survey.mjs`'s
`refusalSentence` takes `firstSentence(paragraph)` unless it is under 40 characters. The `Line`
sheet's refusal paragraph is five sentences, and the fourth is:

> never give two series their own, independently-scaled y-axis ... Index both series to a common
> base, or split the frame in two.

That is the single most important refusal available for a two-series beat, and neither
`formatCandidates`' printed menu nor the generated survey carries it. Measured across the sheets a
refusal heading could be read from: at least 4 of 40 lose text this way, 2189 characters in total,
of which `Line` alone loses 755. It was found by opening
`skills/chart-beat/references/types/line.md` and reading it, which nothing in the exchange asks a
producer to do.

**D4 — nothing in `doctrine/references/` says anything about a dual axis.**
`grep -rn -i "dual.axis|second(ary)? axis|two y ax" skills/doctrine/` returns nothing.
`anti-patterns.md`, `visual-system.md`, `information-architecture.md` and `motion-grammar.md` are
all silent on it. The only occurrence of the string anywhere outside a type sheet is
`storyboard/references/datawrapper-chart-types.json`'s `{"id": "dual-axis", "label": "Dual-axis
chart"}` — an upstream Datawrapper visualization type this catalogue lists as available. So the one
place the toolchain names a dual axis is a place that offers one.

**D5 — `proposePalette` has no notion of a beat that draws more than one series.**
`PALETTE.md`'s format carries `accents:`, `parsePalette` reads it back, measures every entry against
the ground with `assertLegible`, and returns the list; the render's own `readPalette` returns it
too. But the proposal presents `NEWSROOM.md`'s second house accent as option 2 — a COMPETING
ground-and-accent pair to use INSTEAD of option 1 — and `formatProposal` asks which single pair to
use. There is no question anywhere that asks which colour each of two series takes. The second
colour here was read off the same `NEWSROOM.md` line the proposal read option 2 from, and recorded
by hand. Nothing measures two accents against EACH OTHER either: `#D4A853` and `#5B8A8A` are
1.75:1 apart, which no floor in this toolchain looks at.

## Found at production

**D6 — `staggerLacksAnOrder` has no notion of a series, so a two-series chronological reveal passes
or fails on how the producer chooses to count its marks.** This beat draws both lines from one
shared chronological head: at every frame both panels have reached the same year. Two true
enumerations of that one build:

    12 marks, one per year, at 12 distinct years    ->  "the marks arrive in their own ascending order"
    24 marks, one per series per year, at 12 years  ->  "24 marks hold 12 position(s) between them,
                                                        so the order across them is the producer's
                                                        and not the data's"

The second reading is the same refusal the guard was earned by — `stress-t`'s eleven countries in
one month. A two-series time series is not a snapshot, and the guard cannot tell them apart because
a mark carries only `start` and `at`. Both readings are printed by this beat's `render.mjs`; the
build renders on the first. As shipped the guard would refuse the honest per-series enumeration of
a legitimate time series.

**D7 — the guard does not reach a real beat.** `staggerLacksAnOrder` is called from
`skills/chart-video/scripts/render-video.mjs`, which renders the SKILL's own seed. A story's beat
writes its own `render.mjs` (the settled duplicate-do-not-link rule), and the only sanctioned route
a story has into shared code is `#shared/*`, which carries `chart-video/sizes.mjs` and
`chart-video/timing.ts` and nothing else. Measured: neither `proof/life-expectancy/render.mjs` nor
`proof/migration/render.mjs` — the two shipped chart-video story workspaces — mentions the guard,
`verify-video.mjs`, `neverArrives` or `revealDashInScreenSpace` at all. This beat carries a byte
copy by hand because there was no other way.

**D8 — `guard-wired-to-run` is unmet across `chart-video`, and `fills-its-frame` in particular did
not land where a producer would meet it.** Of the ten guard modules in
`skills/chart-video/scripts/`, exactly one (`detect-reveal-order.mjs`) is imported by a render or
producer script. `detect-framing-is-measured.mjs` and `detect-storyboard-gate.mjs` are imported by
NOTHING, not even a test. `verify-video.mjs`, `detect-fills-its-frame.mjs`,
`detect-denominator-reading.mjs` and `detect-delivered-text.mjs` are imported only by their own
`test/`. And `graphicFillsItsFrame` is now copied into all eight producing skills —
`grep -rn "graphicFillsItsFrame(" skills/ | grep -v /test/ | grep -v "export function"` returns
NOTHING. Eight copies, zero producers.

**D9 — `graphicFillsItsFrame` passes anything when its caller omits the floor.**
`graphicFillsItsFrame(fraction, floor)` returns `{fraction, floor, under: fraction < floor}` with no
validation, so `graphicFillsItsFrame(0.0)` — an entirely blank frame — returns `under: false`. The
floor is a required parameter with no default and no check, and `FLOOR_FRACTION` (0.3515 for this
format) IS exported from the same module, so the safe thing was available. Given D8, no caller has
ever passed one.

**D10 — `framingMeasurement`'s own declaration is false about the tree it ships in.**
`skills/chart-video/scripts/detect-framing-is-measured.mjs` says it "is called by a beat's own
`render.mjs`, on the values it is about to draw, and its two numbers are printed to the terminal
there, before the render", and the guard catalogue repeats it. `grep -rn framingMeasurement` over
`skills/ proof/ shared/` finds it in the two definitions, one parity test, one unit test and the
catalogue — and in no `render.mjs` anywhere. This beat calls it, once per panel, because one reading
over two concatenated units would be a number about nothing.

**D11 — the timing contract's six events cannot express a two-part reveal.** `checkTiming` requires
exactly `establish, reference, reveal, subject, conclusion, hold` in order. The reference loop's own
chosen lesson (ABC's Everest piece: "give each dimension its own honest reading, in sequence") argues
for drawing one series, letting it land, then the other. There is no seventh event and no way to
name a second reveal, so the choice is a lock-step reveal (taken here, and defensible: the two
readings are contemporaneous) or sub-windows derived by fraction inside one event — which is exactly
the enumeration D6 shows the reveal-order guard refuses.

## Found at delivery

**D12 — the `owned-file` form delivers everything in `renders/`, and the render ladder tells the
producer to put verification frames there.** `chart-video/SKILL.md`'s own step 6 says to render the
mp4, extract frames "at minimum mid-reveal, the moment the subject lands, and the final hold", and
look at all of them. `renderDigest` digests `renders/` and nothing else, so those frames are only
bound to the approval if they live there. `materialise({form: "owned-file"})` then copies every file
in `renders/` into `export/`. First delivery of this beat handed the newsroom five debug frames and
`rail-punctuality-props.json`, a render INPUT. Worked around inside the story: the props file is now
written beside the beat and the extracted frames live in `verification/`, both outside `renders/` —
and therefore both outside the review digest, which is the trade nobody should have to make.

**D13 — `roleFor` classifies a delivered file by extension alone, with no notion of the beat's
format.** On the first delivery above the hand-over told the journalist, six separate times, that a
PNG was "the image file — this is the one to give the CMS", on a VIDEO delivery. After the
work-around one line survives and is still wrong: `rail-punctuality-final-frame.png` is described as
"the one to give the CMS" beside `rail-punctuality.mp4`, when the mp4 is what goes in the article
and the still is its poster frame. `format` is already a parameter of `formatHandover`;
`roleFor(name, written, {vectorDelivered})` is not given it.

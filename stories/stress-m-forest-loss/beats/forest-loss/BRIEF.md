# Beat — Forest loss in 2025, seven countries (video)

**Type:** choropleth + ranked list. **Medium/format:** map / video. **Channel:**
`renders/forest-loss.mp4` (7s, 1080×1080, 30fps), plus the static rung
`renders/forest-loss-still.png` the ladder renders first.

## The trap, tried both ways (not assumed)

The article says: "South Sudan appears as SDS, which is not the code most mapping files use." Read
literally that means "alias SDS to whatever ISO code mapping files use (SSD) before joining." Two
attempts were actually run against this tree's own `countries.geojson` (Natural Earth 50m admin-0),
not assumed from the article's wording:

**Direction 1 — trust the article, alias `SDS` → `SSD`, then look up the shape by `ADM0_A3`:**
```
THROWN: 1 declared countries have no shape in countries.geojson: SSD
```
Fails loud, and the message is actionable on its own: it names the exact code that found no shape.

**Direction 2 — trust this project's own rule 5 ("ADM0_A3, never ISO_A3"), no alias at all:**
```
shape join OK: all 7 declared countries found a shape.
value join OK: 7 of 7 shapes carry a value.
```
Succeeds outright.

**Why:** in Natural Earth's own admin-0 set, South Sudan's `ADM0_A3` field IS literally `SDS` —
the same spelling the ministry uses. `ISO_A3` for the same feature is `SSD`. The article's claim
("not the code mapping files use") is true only if "mapping files" means ISO_A3; this project's
own documented convention (`geo-discipline.md` rule 5) says to join on `ADM0_A3` specifically
*because* `ISO_A3` is broken for other countries (France, Norway, Kosovo carry `"-99"`) — and
under that convention, no translation is needed or wanted. **Following the article's own caveat
literally would have broken a join that the doctrine's own rule already gets right without it.**
This beat therefore declares `FOREST_STUDY` with `SDS` unaliased, and the caveat on the render says
so rather than repeating the article's framing uncritically.

`joinValues` itself (the value-side function, as opposed to the shape-side `joinShapes` that
actually caught the SDS/SSD case above) was also exercised in both of its own two failure
directions by forcing the mismatch artificially — see the render scripts' own commit history for
the verbatim throws; both name the exact code and explain which of the two things to do about it
(declare it, or alias it).

## Somalia — checked, not assumed

Natural Earth splits the Horn of Africa into `SOM` (Somalia, `NAME: "Somalia"`) and `SOL`
(Somaliland, `ISO_A3: "-99"`, an unrecognised breakaway region) as two separate features. The
ministry's own data reports only `SOM`. `SOL` is not declared in `FOREST_STUDY`, so its shape is
never drawn as part of this beat's data at all — it renders in the plain background land colour,
the same as any other undeclared country, not the no-data grey (which would falsely claim the
ministry is silent about it: the ministry was never asked about Somaliland, a different question).

## Reveal order

The article: "the animation should build country by country." `revealOrder` in `geo-forest.ts`
returns lowest-to-highest, so the map and the ranked bar list fill together in that order and
Brazil — the subject, "leads the annual figures again" — lands last, marked with its own outline
as its own event (`timing.ts`'s `subject` window), after its own fill is already visible.

## The claim, checked by hand

`groundTakeaway` (`skills/storyboard/scripts/ground-claim.mjs`) returns `[]` for "Brazil leads the
annual figures again." — no numeral, no year, no "highest/lowest" token, so none of its seven
recognised shapes fire; it neither confirms nor contradicts.

Checked by hand instead, and this beat's own FIRST DRAFT failed the check it wrote to pass:
Brazil's 1,120,000 ha is the maximum of the seven declared rows — true, and what the article
itself asserts ("Brazil leads"). The draft title went further, unprompted, and claimed Brazil
"lost more forest than the other six countries combined" — the other six sum to 1,582,000 ha
(588,000+412,000+301,000+198,000+44,000+39,000), which is MORE than Brazil's 1,120,000 ha, not
less. That sentence was false and was never in the article; this beat invented it while trying to
sound more dramatic than "the highest single country" and it was caught only by adding the six
numbers up before shipping, not by any tool in the chain — `groundTakeaway` returns `[]` on this
sentence shape too (no percentage column, so its own totality check, shape 7, never fires on
hectares). The shipped title says only what the data supports: Brazil is the highest SINGLE
country, nearly double the second-highest (Congo DR, 588,000 ha) — checked against every other row
individually, never against their sum.

## Subject and accent

One sequential ramp (`sequentialRamp`, ground → `dataRampEnd(accent, ground)`, 5 classes) applied
to loss_ha directly — no unit trap in this beat's own data (`geo-discipline.md` rule 8's "the
accent is spent on the subject" — Brazil's outline and its bar are the only accent-coloured marks).

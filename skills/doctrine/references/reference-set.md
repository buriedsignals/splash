# Reference set

Real, examined treatments of a named argument structure, each reduced to a **transferable
information-design lesson** — never a styling description. This is what the reference loop
(`storyboard`'s movement ⑧) shows a journalist: not "here is a chart that looks nice," but
"here is how a real newsroom sequenced this exact kind of evidence, and here is the rule you can
lift out of it and apply to your own data." Copying the rule, not the surface, is the whole
point — see `anti-patterns.md`'s closing entry.

**The first column is the index, and it is what the loop looks a row up BY.** For three rounds this
file opened by promising "a named argument structure" and then gave the reader three columns —
reference, moment, lesson — with the structure buried inside the prose of the third. A conversation
could not look one up; it could only read seven long cells and judge. Each key is written FROM that
row's own lesson, never invented beside it, and `check-reference-set.mjs` refuses a key shorter than
`MIN_STRUCTURE_CHARS` — because "ranking" or "maps" names a chart family, not a shape of argument,
and a key that names a chart family sends the loop back to guessing.

**Eight rows now, past the original six.** This file has twice shipped more rows than could be
honestly defended, and been cut back both times on review, landing at four — verified, but with
three argument structures still uncovered. `test/reference-set.test.ts`'s floor tracked that
reality, four, so the suite stayed a live signal instead of standing permanently red against an
aspiration nobody had re-affirmed.

**A fourth round added three more rows, one per structure that real stories showed this file had
no answer for.** Three real stories broke against the four-row set in sequence — a long series read
against a historical level, a profile of several dimensions for one entity where the story is an
internal contradiction, and a ranking whose subject sat mid-table rather than at an extreme — and on
the third, a real journalist was shown two analogies and rejected both. Four rows cannot cover the
space. Each new row targets one of those three structures, found by sampling `infoviz.design`'s
underlying catalogue — a Supabase-backed random-sample function, not a searchable index; it cannot be
queried by argument structure, only browsed by chance, so most draws were the wrong shape and several
strong-looking leads were rejected before verification even started, because the gallery's own stored
thumbnail turned out, on inspection, to be a decorative promo illustration or a plain hero photograph
with no chart in it at all — never the graphic itself. Every row that made it into the table below was
instead verified against the real, live article: the actual chart's pixels, read together with the
paragraph sitting next to it, the same bar this file has held itself to since round three.

**A fifth round added the eighth row, for the one structure a real story asked for and this file had
to answer "nothing".** The owner's own Milan-Cortina run needed *a total whose majority escapes the
subject named in the title* — the Games are 14 of 34 megatonnes, their sponsors the rest — and the
loop had no row for it, so the hole was written into that story's `STORYBOARD.md` rather than filled
(`FEEDBACK-2026-08-10.md`, A15). A first search returned only NGO and think-tank reports and nothing
was cited, which was the right outcome: an unfounded reference is worse than an acknowledged gap, and
the floor stayed at seven on purpose. The row below is what closed it — a newsroom piece, verified
the way this file demands.

**The finding that came with it, worth keeping because it explains why the hole lasted:** this
argument is stated constantly in newsroom PROSE and very rarely drawn. Across a wide sweep, Reuters,
the FT, the BBC, the Guardian and others wrote "Scope 3 is over 90% of it", "a third of the aid is
spent at home", "87% of the emissions are travel" in body text and then charted a time series or a
ranked list of the *majority* side instead. The chart that puts the titled subject in its own total
as a minority is a gap in published practice, not a well-stocked genre. Two candidates survived
verification; the second (West Virginia Watch's opioid-settlement breakdown, 52.76% to law
enforcement against 6.43% to treatment) is recorded here as a real instance in a different domain but
is **not** a row, because its page refused retrieval and the chart was never read by the person
writing this line.

The floor now tracks eight. Growing this file only counts if every added row survives what shrunk it
twice before: eight true rows that survived being looked at, read around, and checked against
`editorial-standard.md` and `anti-patterns.md` are still worth more than a bigger number where any one
row is stretched, because the entire purpose of this file is that a model can trust it.

**What "verified" means here, precisely, after three rounds of getting it wrong in three different
ways:** round 1 verified metadata (`og:title`, `datePublished`) and never looked at a pixel; round
2 downloaded and looked at images and video frames, but described things the artifact itself did
not show (a chart's actual colours, a simulation's actual mechanism, a locator that pointed at the
wrong element); round 3's own submission looked at the right pixels but never read the caption two
lines away from them — one row turned out to be a design mockup captioned, in the article's own
words, "placeholder data and annotations," and another's lesson asserted a mechanic (two lines
crossing back and forth across dated elections) that the cropped promotional card it was verified
against cannot actually show (no year labels, one crossing, no legend). Both are removed here.
**The rule going forward**: look at the actual pixels, AND read whatever text sits next to them —
a `<figcaption>`, a byline, a credit line, the surrounding paragraph — before writing a lesson.

**Five different kinds of "looked at" are mixed in the table below, and each row says which:**

- **Extracted video frame** (rows 3–4): the actual published artifact, at the actual cited
  timecode, pulled with `yt-dlp` + `ffmpeg` and read directly. This is the strongest form of
  verification in this file.
- **The piece's own social-preview image** (rows 1–2): what `og:image`/`twitter:image` serves is a
  `<meta>` tag reference, not a `<figure>` embedded in the article body — there is no separate
  caption to have missed for these two specific assets (confirmed by re-checking the surrounding
  markup: both are bare `<meta>` tags, with no `<figcaption>` anywhere near them). This is real,
  newsroom-produced content — NYT's and the Post's own CDNs serve it, it is what the piece looks
  like when shared — but it is a simplified, cropped derivative of the interactive page, not the
  page itself. The lesson for each row describes only what is visible in that specific derivative.
- **Live-rendered, in-page chart** (rows 5–6): the chart the article draws for every reader — an
  SVG element built by the page's own script, not a raster image file and not a promotional
  derivative — read by loading the real, live article URL in a real browser session and reading the
  rendered result at the specific on-page heading named in the Moment cell, together with the
  paragraph immediately beside it. Nothing here was inferred from scraped text describing an
  interactive chart; the chart was seen exactly as a reader sees it. Not tested: whether the chart
  animates or reveals on scroll before settling into the state that was read — the state read is the
  one at rest, after any such motion had already resolved, so the lesson describes that resting
  state only, not a claim about how it arrives there.
- **The static export of an in-article interactive embed** (row 8): the article embeds a live
  Datawrapper chart, and Datawrapper serves that same chart as a fixed image at
  `dwcdn.net/<id>/full.png`. That image was downloaded and read directly — every number quoted in
  the lesson is printed on it, along with its own title, subtitle, annotation and source note — and
  the paragraphs above and below the embed were read separately on the live page and are quoted in
  the Moment cell. It is a step below rows 5–6 and worth naming as one: a static export is what the
  interactive draws at rest, so this row makes no claim about anything the chart does on hover, on
  a narrower screen, or in any state a reader has to act to reach. Nothing in the lesson depends on
  one. Also NOT tested: the German-language original is the artifact that was read, so the wording
  quoted is the wording published; the English syndication on swissinfo.ch was opened first and its
  charts did not render to retrieval at all, which is why it is not the reference.
- **Published, in-article static image** (row 7): a genuine `<img>` in the article's own body
  markup (`<div class="chart__img-inline"><img src="assets/t3.jpg"></div>`), not a `<meta>` promo
  asset, sitting directly beneath its own caption paragraph — confirmed by reading the page's raw
  HTML, not only the rendered view, so there is no separate caption nearby that could have been
  missed the way round three missed one.

**Owed, on the record, partly closed this round**: row 7 is exactly the artifact three earlier
rounds went looking for and did not find — a genuinely published, in-article static `<img>` (not a
promo card, not a design mockup) with a real, non-placeholder caption immediately beside it. That
still leaves the static bar (at least half the set genuinely static) short, though row 8 moves it:
of eight rows, three are unambiguously static (row 1's still image, row 7's `<img>`, row 8's PNG
export), two more (rows 5–6) are static charts read live but implemented as rendered SVG rather than
a raster file, row 2 is motion, and rows 3–4 are video. Whether a live-rendered SVG chart, read at rest, counts toward "genuinely static" for
this bar is a judgment call this file declines to make for itself. See `SKILL.md`'s Files section
for the same statement in the skill's own voice.

| Argument structure | Reference | Moment | Transferable lesson |
| --- | --- | ---: | --- |
| a group-level rule that individual cases visibly break | The New York Times, The Upshot — [Extensive Data Shows Punishing Reach of Racism for Black Boys](https://www.nytimes.com/interactive/2018/03/19/upshot/race-class-white-and-black-men.html) (19 March 2018) | the piece's own social-preview image (`race-class-white-and-black-men-promo-facebookJumbo.png`, a `<meta>` asset — no separate in-article caption exists for it) | Individual dot-marks — one per child in the underlying study, each carrying its own small coloured swatch — flow from a single "Grew up rich" band into five adult-outcome bands, and the finding is set directly on the graphic as its own sentence: "Most white boys ▪ raised in wealthy families will stay rich or upper middle class as adults, but black boys ▪ raised in similarly rich households will not," each group identified by its swatch rather than a colour named in the sentence itself. The annotation states the claim outright while the individual dots keep the honest texture of exceptions — a reader can see both the rule and that it is not universal. |
| a pattern claimed from a process that could have gone otherwise | Harry Stevens — The Washington Post — ["These simulations show how to flatten the coronavirus growth curve"](https://web.archive.org/web/2020/https://www.washingtonpost.com/graphics/2020/world/corona-simulator/) (14 March 2020) | the piece's own social-preview image (`promo2-coronavirus-simulator-0313.jpg`, a `<meta>` asset — no separate in-article caption exists for it), showing the four labelled result panels — Free-for-all, Attempted quarantine, Moderate distancing, Extensive distancing — on one shared scale | Each of the four simulations is its own random, reader-triggered run — the piece says so directly, in its own body text: "The four simulations you just watched … were random. That means the results of each one were unique to your reading of this article." Yet all four still converge on the same qualitative shape, a visibly lower and longer infection curve as distancing increases. Demonstrating a pattern through many honestly-random instances, instead of asserting it from one staged run, is what makes the evidence convincing rather than cherry-picked. |
| accounts of one event that contradict each other | The New York Times Visual Investigations — [How the Police Killed Breonna Taylor](https://www.youtube.com/watch?v=lDaNU7yDnsc) (2020) | 4:20 | The video renders the scene as one fixed, grey 3D model — the same breezeway, officers rendered as ghosted grey figures — and layers each account into that unchanging space rather than cutting to a different depiction per witness; the camera moves around the model over the course of the sequence, but the model itself never changes. Contradictory testimony accumulates inside a shared frame instead of asking the viewer to hold each version separately in their head. |
| a geography whose present shape was produced by a datable event | Vox — [The conflict in Kashmir, explained](https://www.youtube.com/watch?v=cyayif_nla8) (2019) | 3:55 | The map cuts to a dotted line tracing the outline of the disputed, hatched-orange territory against the green backdrop around it — appearing a few seconds after (not immediately after: one intervening archival photograph plays first) the archival UN Security Council footage — timed to land while the narration is still naming the 1949 ceasefire that fixed that boundary. Geography arrives paired with the specific historical moment that produced it, instead of being shown whole up front and explained afterward. |
| a long, noisy series read against a historical level | Australian Broadcasting Corporation — [How Buddy Franklin scaled footy’s Everest](https://www.abc.net.au/news/2022-03-26/is-lance-franklin-the-greatest-of-all-time-afl-vfl/100919332) (26 March 2022) | the chart titled "Average goals in a game per team in the AFL/VFL since 1965", read live on the article's own page — a chart the page draws itself, not a stored image, verified by loading the real URL and reading the rendered chart and the paragraph beside it directly | Every year's actual value is plotted as a faint dot, with a bold five-year moving-average line drawn over the top — the noisy year-to-year swings stay visible while the multi-decade shape reads clearly from the smoothed line alone. Rather than trust that shape to speak for itself, the paragraph beside the chart names the line's own historical peak as a number (16.2 goals a game, 1982) and the exact comparison year for today's low (the lowest since 1968) — pairing the visual trend with a specific historical anchor instead of leaving "in decline" to the reader's eye. |
| a profile whose two dimensions disagree | ABC News (Australia) — [Conquering Mount Everest: High hopes and broken dreams](https://www.abc.net.au/news/2019-06-02/unpacking-the-tragedy-on-mount-everest/11162770) (2 June 2019) | the chart titled "A century of death on Everest", read live the same way, immediately above the paragraph beginning "Yet despite all the publicity around the annual Everest death toll, it is not the most dangerous peak for mountaineers." | The chart profiles Everest on the dimension a reader expects to matter most — raw annual deaths — and lets the real recent spikes register first, each one individually annotated to a named event (1996, 2014, 2015, 2019), unqualified. Only after that reading is set does the text pivot to the dimension that actually contradicts it — the fatality rate, which accounts for how many more people climb today and is near a record low, stated with the exact comparison figures (1.15 per cent on Everest against 3.9 and 2.99 per cent on neighbouring peaks) rather than only asserted in words. A profile whose two dimensions of the same entity disagree earns that disagreement by giving each one its own honest reading, in sequence, with numbers — not by softening the first dimension or skipping the second. |
| deviation from a local expected rank | The Pudding — [Twenty years of the NBA redrafted](https://pudding.cool/2017/03/redraft/) (March 2017) | the third inline chart image (`assets/t3.jpg`), a static `<img>` published directly in the article's own body markup, immediately under the caption "When we compute the average redraft rank for each pick, notice that most picks end up close to their expected rank." | The chart anchors every draft pick to its own expected rank with a diagonal reference line (actual pick equals redraft pick), then draws each pick's movement as a vertical stem off that personal baseline rather than off the top or bottom of the list. Colour is reserved for the picks whose stem is long relative to their neighbours, and those highlighted picks cluster in the middle of the draft — roughly pick twenty through the high forties — not at either extreme, because a first pick or a last pick has almost no room to move and hugs the diagonal instead. To make a mid-table entry in a ranking register as noteworthy, compare it to where an entry at that rank was expected to land, not to the top or the bottom of the list, and reserve emphasis for deviation from that local, rank-specific expectation. |
| a total whose majority escapes the subject named in the title | Sabrina Weiss (text) and David Bauer (graphics) — Republik — [Mensch gesund, Klima krank? Die Schattenseite der Pharmaindustrie](https://www.republik.ch/2025/03/21/mensch-gesund-klima-krank-die-schattenseite-der-pharmaindustrie) (21 March 2025), reporting with SRF Data | the chart titled "Die Emissionen des Zulieferers des Zulieferers des Zulieferers des Zulieferers des Zulieferers des Zulieferers des Zulieferers …", read as the static export the article's own embed serves (`datawrapper.dwcdn.net/GiLce/full.png`), together with the paragraphs immediately above it ("Je tiefer man in die Lieferketten der Schweizer Pharmaindustrie eintaucht, desto mehr Emissionen kommen zum Vorschein…") and immediately below it ("Schlüsselt man die Emissionen nach Ländern und Kontinenten auf…"), read on the live page | The named subject keeps its bar, at the same scale as everything it is being compared against, and that is the whole mechanism: "Direkte Emissionen 0,19 Megatonnen CO₂-Äquivalente" is drawn as a swatch too short to hold its own number, so the label sits outside it, above six supplier tiers of 4,53 · 5,79 · 4,89 · 3,52 · 2,35 · 3,93 — an industry that is 0,19 of some 27 megatonnes it is held responsible for, seen rather than asserted. Three choices make that legible. The bars stay in **supply-chain order rather than sorted by size**, so the axis reads as distance from the subject and the reader watches the quantity move away from it. The title **performs the argument instead of stating it** — the word "Zulieferers" repeated seven times and trailing off — while the subtitle carries the claim in plain numbers ("Weniger als ein Fünftel fallen direkt bei den Schweizer Pharmafirmen oder bei direkten Zulieferern an"). And a single bracketing annotation groups the far tiers ("Fast 40 % aller Emissionen fallen hier an") rather than recolouring them, so the emphasis is one sentence and the bars stay one material. The honesty move is in the source note: 2,2 megatonnes that could not be attributed are **excluded from the bars and declared** ("Nicht in der Grafik enthalten sind weitere 2,2 Megatonnen, die nicht genau zugeordnet werden können") instead of being folded into a residual category — a part-to-whole that admits the part it cannot place is what earns the reader's trust in the split it does draw. |

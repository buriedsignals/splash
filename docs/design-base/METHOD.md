# Method

The runbook for the design base. It exists so a second family costs **harvesting and judgement**,
never re-invention, and so two families can be worked in parallel without colliding.

Spec: `docs/splash/2026-09-07-design-base-treatments-and-directions-spec.md`.

## Parallel safety

Each family owns its own directory under `references/`, and each treatment and direction is its own
file. Two families touch no shared file except the two indexes, which are **generated** and never
hand-edited — `design-base-records-are-complete.test.ts` refuses an index without its generated
marker, precisely so two parallel harvests cannot conflict on one.

## The three archives, and the two routes

Every archive feeds every axis. What differs is the route, never the value.

| archive | what it actually is | read by |
| --- | --- | --- |
| `~/Downloads/infoviz-source-urls-alive.txt` | 3 827 published newsroom interactives, 525 domains | style route, plus the pixel route |
| `informationisbeautiful.net` | poster-style infographics, indexed by subject | pixel route for the graphic; style route for the page's own type |
| `100.datavizproject.com` | **one** dataset encoded **100 ways**, by Ferdio; indexed STORY / PROPERTY / SHAPE | style route; little direction value, being one house style |

The Buried Signals archive is a fourth pool, drawn from like the url list.

**The style route** (`scripts/design-base/harvest-styles.mjs`) reads computed styles: type
everywhere, marks wherever they are SVG. **The pixel route**
(`scripts/design-base/pixel-palette.mjs`) reads the rendered pixels: ground, chromatic palette,
neutral furniture, palette shape. Neither is a fallback for the other. A reference measured by one
route only is under-measured, and its record says so.

## The runbook

1. **Draw the candidate pool from all three archives.** Filter the url list to the family, then to
   domains that serve without a paywall — NYT + WaPo + Bloomberg + WSJ ≈ 1 184 of the 3 827 are
   largely paywalled and are excluded unless a route to the real artifact exists. Record the filter
   and the counts below.
2. **Harvest by both routes.**
   `bun scripts/design-base/harvest.mjs --family <f> --archive <a> --pool <file>`
   Failures are recorded as failures, with their reason. A reference that would not load is never
   described from its metadata.
3. **Look at the pixels, and read what sits beside the graphic.** This step cannot be automated.
   `doctrine/references/reference-set.md`'s standing rule applies verbatim: a lesson written from a
   promotional card, a `<meta>` image or a design mockup is not a lesson. Say in `NOTES.md` which
   kind of artifact was actually read.
4. **Write `NOTES.md`** — the five sections the guard requires. Separate what is transferable from
   what belongs to that publication.
5. **Extract.** A treatment needs **two independent references** before it is filed. A direction
   needs one, because a direction is a coherent whole and averaging two would produce neither.
6. **Prove it renders.** Implement it, render the family's own beat through the real engine, and
   look at the result. A treatment that cannot be drawn is not filed.
7. **Guard it.** Add the `detect`, then break the code and watch the guard go red. A test that does
   not go red is not a test.
8. **Regenerate the indexes** — `bun scripts/design-base/build-indexes.mjs` — and re-run the guards
   across the whole corpus.

## Yield log

One row per family per archive. The yield is what tells the next family whether a pool was worth
drawing from.

| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| line | url-list | 90 | 23 | 6 | 6 |
| line | datavizproject | 100 | 5 | 5 | 5 |
| line | informationisbeautiful | 4 | 4 | 4 | 4 |
| map | url-list | 118 | 38 | 6 | 6 |
| map | buried-signals | 5 | 3 | 1 | 1 |
| map | informationisbeautiful | 2 | 2 | 0 | 0 |
| scatter → paired | datavizproject | 1 | 1 | 1 | 0 (merged) |
| map (flow) | url-list | 6 | 6 | 0 | 0 |
| map (flow) | search | 2 | 2 | 1 | 1 |
| map (hex) | search | 2 | 2 | 2 | 2 (one publisher) |
| scatter (parallel) | search | 1 | 1 | 1 | 1 |

**line, 2026-09-07 — and the three method corrections this yield produced.**

Twenty-four references harvested, **both routes green on all twenty-four**. Then step 3, and eleven
of them had never reached their graphic at all. What the harvester had photographed instead: a
full-bleed hero photograph (Reuters wildfires ×2, fingfx ×2), a lazy-load placeholder still blurred
(Boston Globe busing), an "Access Verification" bot check (SCMP ×2), a privacy modal (National
Geographic), a subscription wall (Globe and Mail), an empty frame (Guardian Mekong, Reuters Water's
Edge), a video still (Guardian Roe v. Wade). Two more reached something real that was not a graphic
at all — a photograph of a shoe, a mosaic of press images.

**Correction 1 — a generic harvester does not find "the graphic" on a modern news page.** It finds
the opening. `largestGraphic` picks the largest painted element, which is precisely the hero. And
nothing in the measurements said so: the routes reported `ok` on all twenty-four, because both had
genuinely measured *something*. Only looking caught it. This is why step 3 is in the runbook and
why it is marked as not automatable. Until the harvester handles consent overlays and scrolls to
the article's own figures, **the yield from a news domain is roughly one in three**, and the pool
must be drawn accordingly.

**Correction 2 — a chart family cannot be drawn from a URL list.** A keyword filter selects a
SUBJECT, never a FORM. A pool filtered on "climate, covid, decade, history" returned a treemap, unit
charts, an arc timeline and proportional circles, and **not one temporal line**. Of the three
archives only `100.datavizproject.com` is indexed by form (STORY / PROPERTY / SHAPE), so it is the
only one from which a family can be drawn deliberately. The url list and
`informationisbeautiful.net` are drawn for DIRECTIONS — where any strong published piece qualifies
regardless of its chart type — and triaged visually.

Fourteen references were removed from the corpus rather than filed: a record of a page that never
showed its subject teaches nothing and would have been indexed as though it had. Their urls are in
the pool files and can be retried once the harvester handles overlays.

**Correction 3 — a modal can contaminate a measurement silently, and the record will look fine.**
The first capture of IIB's "Left vs. Right" carried a newsletter modal across the centre of the
poster. The pixel route dutifully measured the modal: ground `#B2B2B2`, poles at 340 and 38 degrees
— the banner's own pink and grey — against the poster's real `#FEFEFE` and 18/207. Nothing was red;
the route reported `ok`. It was caught only by comparing the record against an independent reading
of the same page made earlier the same day, and fixed by re-harvesting, on which visit the modal did
not appear. **A measurement that disagrees with the eye is the eye's to win.** Where a reference's
reading looks wrong, re-harvest before writing a judgement on it.


**Correction 4 — two records are not two uses if they came from the same desk.**
The evidence floor first counted distinct reference ids, and the five `100.datavizproject.com`
records would have satisfied it on their own: one publication, one house style, one designer,
encoding one dataset five ways. That is a habit, which is exactly what the floor exists to exclude.
Independence is now measured at the PUBLICATION, read off each cited record's own url. Two
treatments that were about to be filed did not survive the change — `two-points-are-not-a-line` and
`before-nested-in-after`, both resting entirely on Ferdio — and they are **not filed**. They are
real and they will be filed the day a second publication is found doing them.

> **2026-09-08 — `two-points-are-not-a-line` was not waiting for evidence. It was wrong.** Re-checked
> on the corrected corpus, four independent publications draw the segment it forbids: Ferdio
> straight, ABC straight, Reuters as a sloping roofline, Information is Beautiful curved. One desk
> draws four geometries for the relation and never a bare pair of dots. The rule is replaced by
> `segment-between-two-named-states`, which is what those four desks actually obey — the danger was
> never the segment, it is an unlabelled axis underneath it. Waiting on a second publication is the
> right default and it has a failure mode: a rule can be refuted while it waits, and nothing in the
> method was looking. `before-nested-in-after` is still waiting, and is still only waiting.


**Correction 5 — a scroll-triggered chart is captured mid-animation, and the record looks complete.**
The targeted line harvest caught ABC's *Buddy Franklin* chart with only the 1965–1975 portion of its
series drawn: the harvester scrolls one viewport and back, which *triggers* a scroll-driven reveal
without waiting for it to settle. Both routes reported `ok`. The reference is filed with the
limitation stated in its own note rather than quietly, and the reading leans on
`reference-set.md`'s independent description of the same chart. **A record of an animated chart is
suspect until the harvester waits for the animation.**

**Correction 6 — a number written before it is checked is the worst defect this corpus can carry.**
A first draft of the Pudding *redraft* note asserted a near-black ground. The record says
`#FFFFFF` at 90.6 % coverage. The mistake is left recorded inside that note. The corpus's entire
value is that its numbers are measured; a plausible invented one is worse than an admitted gap,
because nothing downstream can tell it apart from a real measurement.

**Where the targeted line harvest landed.** It was run to find a second publication for the line
treatments the probes proved and the evidence floor refuses — `area-to-reference`,
`crossing-marked`, `raw-under-smoothed`. It did **not** find one. What it produced instead was
`direct-end-label-in-the-series-colour`, filed on Our World in Data and Ferdio, and a first
publication for `raw-under-smoothed` (ABC). That treatment still needs a second desk before it can
be filed, and it is not filed.


**Correction 7 — the evidence floor was written against one thing and applied to another.**
It exists to stop a newsroom's HABIT being copied without its logic
(`doctrine/references/anti-patterns.md`, closing entry). Applied to a treatment that draws a fact
the beat itself carries, it refuses honest work — and it did. `crossing-marked` renders the value
`proof/co2-suisse/crossing-geometry.ts` **already computes**, and it was kept out of the picture for
a day for want of a second publication that could never have been relevant.

Treatments now declare a **kind**:

- **`derived`** — draws a fact the beat carries: its own geometry, its own declared reference level,
  its own series, its own declared events. Cites no publication, because there is nothing for a
  second one to corroborate. Owes a `detect` and a `provenBy` render instead, and the guard demands
  both.
- **`imported`** — takes a practice observed elsewhere. Two independent publications, unchanged.

Filing the four derived treatments took the CO₂ beat from **two applicable treatments out of five**
to **six out of nine**, and put the 2023 crossing — the editorial fact the chart was hiding — back on
the picture.


**map, 2026-09-07 — the family that was harvested to answer a question, and answered it "not yet".**

Twelve harvested, **four reached a real map**: ProPublica's *toxmap*, *louisiana-toxic-air* and
*hatecrime-map*, and the Guardian's *unaffordable-country*. Eight did not — a satellite photograph,
a photo-collage hero, a black title card, a near-empty page, and two Information is Beautiful pieces
that turned out to be a stream graph and a bubble cloud rather than maps at all. A yield of 4 in 12,
in line with the 1-in-3 this log already records for news domains.

**What the four showed, and it is a real vocabulary.** A published map names its geography in
treatments a reader already carries: administrative areas in tracked capitals, settlements in mixed
case, **water in italic** — ProPublica's *louisiana-toxic-air* uses all three on one plate, and
*toxmap* keeps a second, separate register for the DATA's own names (facility labels, small white
capitals) so the two label systems never confuse. The Guardian carries a legend that names its unit
and leaves its top class open (`Multiple of £25,000 — 2 3 4 5 6 10+`).

**And neither register could be filed.** `place` rests on two ProPublica pieces — **one
publication** — and `legend` on the Guardian alone. The floor refused both, out loud:
`place rests on 1 publication(s)`. That is the guard doing exactly what it was built for eight
commits ago, against its own author, on the register he most wanted.

**What a second wave must target**, therefore: a map with named geography from a desk that is not
ProPublica, and a map with a legend from a desk that is not the Guardian. Not more maps — maps from
elsewhere.


**Correction 8 — the consent wall is the dominant failure mode, and it is half-fixable.**

A second map wave, drawn deliberately from ten desks that were NOT ProPublica or the Guardian,
returned **zero usable references out of twelve**. Nine of the twelve were walls rather than bad
choices: three bot checks (SCMP), four consent dialogs (La Nación ×2, National Geographic ×2), a
404 and a 403. Two more turned out not to be maps at all despite their urls — La Nación's
"mapa_versus" is a flow diagram, `hs.fi`'s "pole" is a bicycle.

The harvester now dismisses consent dialogs before it measures anything — known platform buttons
first (OneTrust, Didomi, Quantcast, Sourcepoint), then a narrow text match on BUTTONS only, because
matching link text clicks "Accept our terms" in a footer and navigates away from the piece. What it
clicked is recorded in the reference, because a page read after a dialog was dismissed is a page in
a state the harvester put it in.

It works: three walls crossed by three different mechanisms — `.fc-cta-consent`, a button labelled
"Aceptar", `#onetrust-accept-btn-handler`. **And behind them, one usable map out of four.** A second
dialog waited behind the first on one (a push-notification prompt); one was a microscopy image; one
was article prose.

**Bot checks are not fixable this way and should not be.** SCMP's "Access Verification" is a site
saying no to automated reading, and a harvester that worked around it would be taking something it
was refused.

**The map vocabulary still cannot be evidenced, after two waves and 28 candidates.** `place` and
`legend` are plainly real — ProPublica shows the first as a designed system, the Guardian shows the
second — but each rests on one publication. La Nación's *mapa del delito* names its geography too,
and it was NOT accepted as the second: its labels are the basemap provider's defaults, left as
delivered, and at this resolution a provider's default cannot honestly be told from an editorial
decision. Filing a vocabulary on that reading would put an uncertainty into the foundation.

**What this says about the programme.** Twenty-two families at roughly one usable reference in
four, with the yield falling as the pool leaves the handful of desks that publish openly, is a
harvesting problem before it is a design one. The abstraction holds — a direction measured on a
chart governs a map today, deriving any missing apparatus from `body` and saying so. What is scarce
is evidence, and no amount of design will manufacture it.


**Correction 9 — our own archive can teach, but it cannot corroborate.**

The Buried Signals archive is named as a fourth pool in the spec and was drawn from for the first
time here: `kashmir-documentary`, `yemen` and `gaza`, whose deployed sites carry real cartographic
work. Two of the three stop at their own entry screen — the map sits behind "START WATCHING" and
"EXPLORE THE MAP", and the harvester scrolls but does not click. The third, `gaza`, reaches a real
proportional-symbol map.

It is filed as a reference and it is **not** admissible as an independent publication. Buried
Signals is the house this tool is being built with; using its own work to corroborate this tool's
own vocabulary is the parochialism the evidence floor exists to refuse, wearing a different name.
The pool stays useful for what a piece TEACHES; it counts for nothing when the question is whether
two desks independently do a thing.

**Correction 10 — a map behind an entry click is a map the harvester cannot see.**
Two of the three Buried Signals sites, and by inference a whole class of longform pieces, put their
graphic behind a deliberate entry. Scrolling does not reach it. This is a bounded improvement to the
harvester — click a single obvious entry control before measuring, the way consent dialogs are now
dismissed — and it is not made here; it is recorded so the next family knows the shape of what it
is missing.


**Correction 11 — three routes were tried against the access problem, and only one worked.**

| route | what it cost | what it returned |
| --- | --- | --- |
| Buried Signals archive | nothing | two of three sites stop at an entry click; the third reaches a map but **cannot corroborate** (correction 9) |
| Wayback Machine | nothing | **the document, not the graphic.** Eight recovered pieces — five NYT, one WaPo — came back as unstyled HTML shells: "Site Search Navigation", link lists, a serif headline, no CSS and no JavaScript. These pieces ARE their JavaScript. The WaPo one answered "Access Denied" even archived. Zero usable. |
| **Firecrawl** | credits | **it passed the wall.** SCMP's "Access Verification" stopped a headless Chrome three times; Firecrawl returned *China's worst floods in decades* whole — and with it the second publication the `place` register had waited two waves for. |

Firecrawl is now a third route in the harvester, asked for with `--via-firecrawl` and never fallen
into, because a route that spends money should be chosen. It returns **pixels, not a DOM**: a record
harvested through it carries the pixel route and records the style route as `not-applicable` with
its reason, so nothing looks measured that was only looked at.

**And `place` is filed.** ProPublica in Louisiana and SCMP on the Yangtze, two continents, two
desks, the same three treatments in the same roles: administrative area in tracked capitals,
settlement in mixed case, **water in italic**. Two other maps that name their geography were refused
along the way — La Nación's, whose labels are the provider's defaults, and our own Gaza piece — and
the refusals are written into the register's own record.

`legend` is still one publication. The Guardian draws one; no second desk has been read that does.


**Correction 12 — the door, and the threshold set by eye that kept it shut.**

The harvester now clicks through an entry screen: a longform piece that opens on a photograph and
puts its graphic behind "Explore the map" or "Start watching". It is deliberately narrower than the
consent handler — consent is a standardised wall in front of every page, an entry is one piece's own
invitation — so it fires only when the page is a **single viewport tall**, which a real entry screen
is and an article never is.

It did not work the first time, and the reason is worth keeping. The guard required a control at
least **24 px** tall, a number chosen by eye. `yemen`'s own "Explore the map" is a text link
**148 × 19**. The threshold skipped the exact control the feature was written to click. Measured and
lowered to 16, the door opened and a 1440 × 900 canvas was behind it — a map two earlier harvests
had recorded as not existing.

`kashmir-documentary` still does not open: its entry is neither a button nor a link, and widening
the selector far enough to catch it would start clicking anything. It is left unreached and
unfiled, which is the honest state.


**Correction 13 — the graphic was decided twice, and the two decisions disagreed.**

Correction 3 came back in a new costume and this time it was *ours*. `largestGraphic` in
`harvest.mjs` took the largest painted `svg | canvas | figure img` above no floor at all, so on
`100.datavizproject.com` it returned nothing — Ferdio's wordmark `logo-100.svg` is 280 × 80, under
the floor — and the pixel route **fell back to photographing the whole page**. What it then filed as
the piece's palette was the site's fixed navigation bar, `#3274DA` at 8.6–10.5 %, which happens to
be the same blue the charts are drawn in. Fifty-three of eighty-three records were measurements of
a website. Four of five parallel harvests found it independently, and not one of them found it by
looking at the number: three records agreeing with each other read as corroboration.

Two rules close it. A graphic is refused for **where it lives** — a header, a nav, a banner, a
cookie strip — rather than for its size, because a wordmark is not small, it is just not the
graphic; and a page whose only graphic is its own chrome is filed as having **none**, which is true,
instead of quietly becoming a reading of the site. `two-records-that-agree-exactly-are-both-wrong`
is the arithmetic guard that would have caught it on the first wave: two independent pieces sharing
a palette to five decimals are both measuring the thing they have in common.

Then the repair itself was wrong for one more day. The **style route kept its own separate graphic
detection**, and on the first re-harvest the two halves of one record named different objects — the
pixel route photographed the chart, the style route still filed `svg 280x80`. A record whose halves
disagree is worse than one that measures nothing, because both halves read as measured. The floor
and the exclusion now live in `harvest-styles.mjs`, are exported, and `harvest.mjs` imports them:
one decision, one place, and a fixture whose masthead is deliberately **larger** than its chart so
that nothing but the exclusion can tell them apart.


**Correction 14 — the graphic was in another document, and the class name ate the archive.**

The repair to correction 13 was rerun and every informationisbeautiful.net reference came back
*"no graphic outside the site's own chrome"* — twenty of them, honestly reported and completely
wrong. Two faults stacked, and each one alone produced the same silent answer.

The first is a rule that could not tell a strip from a page. Cookie bars and promo banners have no
landmark to sit in, so they were matched by the words in their class names. IIB's page ROOT is
`div#iib-page.iib-base.has-banner--top.has-banner--bottom`, so `[class*='banner']` matched the
container of the entire document: every graphic on the site was "inside a banner". A class match now
counts only while the thing it matched is **smaller than half the document** — a cookie bar is, a
page wrapper is not.

The second is that **the graphic is not in the page**. IIB embeds every visualisation from
`vizsweet.com` in a 1380 × 806 `<iframe>`, created lazily five or six screens down. Three things
followed from never opening it. The harvester's one-and-a-bit-viewport scroll never reached the
frame's creation, so it now walks the page to the bottom, bounded, and comes back. `<iframe>` is now
a graphic like `<svg>` and `<img>`. And the frame's own type is read as well as the host's: the
twenty records carried IBM Plex Sans and Quicksand, which is the **publisher's article furniture**,
while the graphic speaks Inter Tight — 45.2 for the title, uppercase at 14 for the labels, seven
mark colours, on a `#26232C` ground. Both routes had reported `ok` the whole time.

The picker now exists **once**, in `harvest-styles.mjs`, and `harvest.mjs` calls it and writes what
it found into the record; the style route no longer looks for a graphic at all. Two routes that each
decide what they are measuring will eventually decide differently, and the day they do, both halves
still read as measured.

**The corpus after both repairs, re-harvested 2026-09-08.** Eighty-three references, eighty-two of
them by browser. **Eighty measured on their own graphic**, two reporting honestly that they have
none outside the site's chrome (ProPublica's NCAA bracket, Reuters' swing states), and one — SCMP,
through Firecrawl — measured on the page, which its note now states. Nothing was restored from the
backup: no reference that had been readable became unreadable. Four records carry a `graphicFrame`;
the rest of the Information is Beautiful archive turns out to be posters served as a single large
`<img>`, which the widened selector reaches directly.


**Correction 15 — a record that names the right file can still be measuring the wrong thing, and the
arithmetic guard is blind to one whole shape of that.**

Two things this wave established, both of which change how a reader should use these records.

**`measuredFrom: "graphic.png"` is necessary and not sufficient.** It was true of all five Ferdio
records for a day while every one of them was still photographing a fixed navigation bar along with
its chart. The field says the harvester found an element and photographed it. It says nothing about
what else was painted on top of that element at the moment of the photograph, and a guard written
against the field cannot know.

**And the guard that caught the previous contamination could not have caught this one.**
`two-records-that-agree-exactly-are-both-wrong` compares `(hex, share)` pairs across references and
fires when two pieces agree to five decimals. The banner contamination was a constant *value* — the
same colours at the same coverage in three records — so it fired. The masthead was a constant
*addend*: 2 472 px of `rgb(50,116,218)` added to whatever blue each chart already had, on clips of
different sizes, producing five different totals. Nothing was equal to anything. Measured after the
repair, every Ferdio share moved by the same ~0.3645 %, and on three of the five records that was
enough to **invert the ranking** — the blue led all five before, and Ferdio's coral `#EE5440` leads
`viz49`, `viz100` and `viz77` now, by margins as small as 0.008 percentage points.

The lesson is not that the guard is weak. It is that an arithmetic guard catches what is *identical*,
and contamination that scales with the thing it contaminates is invisible to it. What caught the
masthead was a person reading a number and asking where a third of a percent of solid blue could
possibly come from.


**Correction 16 — a form-indexed archive is bounded by its DATASET, not by its page count.**

`100.datavizproject.com` has been the design base's one reliable seam since correction 2, because it
is indexed by form rather than by subject. Two agents measured its limits in the same wave and both
limits are structural.

**It does not index every form.** Its taxonomy is `shape-bar | circle | line | dot | rectangle |
area | 3d | polygon | symbol`. There is no `shape-flow`, so a family looking for a sankey cannot
navigate to one. What worked instead: download all 100 thumbnails, montage them into contact sheets,
and look. Ninety seconds, four Read calls, and it is now the recommended first step for any family
drawn from this archive.

**And it cannot CONTAIN some forms at all.** Every one of the hundred pages encodes the same
dataset — Scandinavian World Heritage site counts in 2004 and 2022. That data carries two states per
country and no durations, no distributions and no flows. So no bar among the hundred can have length
= elapsed time, and the seventy unharvested pages hold no gantt, whatever their thumbnails suggest.
A family whose form needs data this dataset does not have gets **nothing** here, and should not spend
a wave finding that out. Ferdio's three sankeys are the exception that proves it: they came from the
pages that draw a flow between the same two states.

**Correction 17 — a promotional card can be the article's own lead image, inside the article.**

Correction 1 established that a generic harvester finds the opening rather than the graphic, and the
repairs since have made it find the graphic. This is the residue. ABC's *From Menzies to Malcolm* is
a genuine gantt: both routes `ok`, `img 806 × 453` at `documentTop 380`, `nearTheTop: true`, well
inside the article and past every rule the picker now applies. It is a **perspective-tilted mock-up
of the interactive**, and the page's own caption says so. The interactive it advertises is no longer
on the page at all.

Nothing in the record could have caught this, and no rule proposed since would have. What caught it
was the tilt and the caption — a person looking at the picture and reading the words beside it.
`doctrine/references/reference-set.md`'s standing rule holds exactly: a lesson written from a
promotional card is not a lesson. This is why runbook step 3 is marked as not automatable, and it is
the clearest case the corpus has of why.


**Correction 18 — there is a second archive indexed by form, and a third kind of target better than either.**

Since correction 2 the method has said that only `100.datavizproject.com` is indexed by FORM, and
correction 16 has just bounded what that archive can hold. The waterfall wave found the way out.

**`https://www.iea.org/data-and-statistics/charts?type=waterfall`** filters the IEA's chart library
and reports **278 waterfall charts**. It is one publication, like Ferdio, and it is a very deep one.
It belongs beside the three archives in the table above.

> **Corrected the same day, by the family that tried to use it.** This paragraph first said the
> parameter also takes `column`, `line`, `area` and `pie` and would therefore pay for other
> families. It does take them, and for those values **`?type=` is ORIENTATION, not form**: 20 of the
> 24 charts on page one of both `?type=column` and `?type=bar` are STACKED, which is a different
> form asking a different question. `waterfall` happens to name a form; `bar` names which way the
> bars point.
>
> What does work: every IEA chart page carries `data-chart-charttype` and `data-chart-stacking` in
> its HTML, readable with `curl` and `grep`. Filtering on `stacking=""` cut 24 candidates to 4 — and
> even that is not sufficient, since 3 of the 4 were single-series. Fetching eight listing pages in
> parallel trips Cloudflare; a loop spaced 1.5 s apart over 24 pages does not.
>
> The general lesson is the one correction 2 keeps teaching in new costumes: **a filter is only as
> good as what it filters on**, and a parameter named after a form may be named after a shape.

**A contact sheet draws a pool; it cannot file one.** Reading 100 thumbnails as montages is the
cheapest triage the method has, and three of eight picks made that way were not the form they looked
like. A 300 px thumbnail cannot tell three bars side by side from one bar in three parts. The sheet
chooses what to harvest. Only the full-size graphic decides what is filed.

**And the cleanest harvest targets in this corpus are chart-tool permalinks.** `datawrapper.de/_/<id>/`
and `ons.gov.uk/visualisations/dvc<NNNN>/fig<NN>/` serve one published chart on one page with no
masthead, no consent wall, no hero and no second graphic. Every picker rule this file records exists
to survive a news page; on these urls there is nothing to survive. Where a desk publishes through a
chart tool, harvest the permalink rather than the article.

**A third costume for correction 1.** A blog post *about* a chart type opens with a montage of that
type — Datawrapper's own posts do it twice. The montage is the largest graphic on the page AND the
nearest the top, so both of the picker's preferences select it and the record reads as a clean
success. It is an article promo card, and the only thing that catches it is looking. That is now
three ways the opening beats the graphic: the hero photograph (correction 1), the perspective
mock-up inside the article (correction 17), and the montage that is genuinely a picture of charts.

**One thing the arithmetic guard got exactly right, on a case it was not written for.** Two ONS
figures agreed to five decimals — `#424143` at 0.520 % and two more — and neither was measuring a
site. They carry the same twelve labels, the same legend and the same source line, laid out
identically: one ink layer photographed twice, under two different data series. The guard fired, a
person looked, and the right record was the one that was kept.


**Correction 19 — a third form-indexed archive, and two more ways the opening wins.**

**`https://ft-interactive.github.io/visual-vocabulary/chartTypes.csv`** is the Financial Times'
Visual Vocabulary as data: 74 rows, one per form, with `category`, `avail` and a one-line gloss, and
one directory per form under the same host serving one graphic per page — no masthead, no consent
wall, no hero, no second graphic. One `curl` reads the index. Verified on 2026-09-08: it carries
`bar-diverging`, `bar-diverging-stacked`, `spine-chart`, `bump`, `sankey`, `waterfall`, `boxplot`,
`violin`, `priestley timeline` (the span timeline this base files as `gantt`), `calendar-heatmap`,
`population-pyramis` [sic], `histogram`, `column-grouped`, `bar-grouped`, `Bullet`, `treemap`,
`lollipop-h`, `dot-plot` and `slope` — most of the forms this base still lacks, and several it has.

It is ONE publication, and what it holds are **specimens rather than published journalism**: it is
evidence about the FT's own house grammar, not about what a desk did on a story. Two hazards
measured on it. Its pixel route can disagree with the eye — the diverging-stacked specimen reports
`categorical` for a palette that plainly ramps. And **its webfont does not load on that host**, so
the render falls back to a serif: a register table taken from it would name a typeface the reference
never drew. Harvest it for form and structure; do not take a direction from it.

**A fourth costume for correction 1: the reproduction.** `datawrapper.de/blog/divergingbars`
harvested cleanly — both routes `ok`, an `img` well inside the article, past every rule the picker
applies — and what it photographed was **The Pudding's chart**, embedded as an example. The record
would have filed a Pudding design under `datawrapper.de`. This is worse than measuring the wrong
graphic: it is measuring the right graphic and attributing it to the wrong desk, which corrupts the
one field the evidence floor counts on.

**And a fifth, which has a cheap fix nobody has written yet.** Plotly's documentation page returned
`svg 9000 × 9000` at `documentTop −10000` — a full-page overlay winning the largest-painted rule,
which has no ceiling. Two discriminators are available and neither is implemented: a graphic whose
`documentTop` is negative is not in the document's flow, and a graphic an order of magnitude past
the viewport on both axes is not a picture anyone is looking at.

**Correction 20 — the arbiter had four positions where a row's value has one, and a direction can
refuse a beat.**

Two findings from the eighth beat put through the base, the 27-row diverging bar.

**A label placed correctly can still name the wrong thing.** The arbiter tries `above` first,
because a label over its mark reads as belonging to it — true of a point on a line or a scatter, and
false on a row chart, where above a row is *the row above it*. Measured: Czechia's `−8,90` took
`above`, landed on Germany's row, and Germany's own `−6,46` was then dropped for want of room. No
collision was reported, because there was none — two labels that do not overlap, one of them beside
the wrong country. A request may now name the anchors it accepts (`anchors: ["left"]`), the default
stays all four, and a misspelt anchor throws rather than silently falling back to all four. With one
honest position per value the drop count on this beat went 14 → 0 in two directions.

**And the pitch a row owes is a measurement, not a taste.** Its first form said a value must clear
its neighbours' BARS; that was satisfied and 14 of 27 values still dropped. The binding constraint
is that the values STACK: rows sorted by size put adjacent labels at nearly the same x, so the
vertical gap between two label boxes is all that separates them, and it must exceed the arbiter's
own breath — `band + breath` per row. Below it the drawing does not lose polish, it loses numbers.

**The consequence is that a direction can measure a beat and say no.** `nocturne` sets the largest
display, the largest padding and an uppercased, tracked annot register: 27 rows will not print their
values under it at 1920 × 1080. Two columns reach 13.0px of pitch against the 15.8px a value needs;
a third column spends 228px of gutter against 28px of bar and draws the smallest fall 0.7px long,
which is a table — this beat's own BRIEF refuses a third column in those words, and the arithmetic
is redone here against what a reader loses rather than against pixel counts taken at another type
size. So the beat renders in `creme` and `rapport`, and `nocturne` is REFUSED with its numbers, its
stale PNG deleted so nothing on disk can be read as a fresh render of a direction that declined.
That is the whole point of measuring: an hour earlier the same file drew that direction anyway and
dropped 14 of the 27 numbers without saying so.

**Correction 21 — most of the words on a plate never reach the arbiter, and two filed predicates
were shaped by the family they were harvested from.**

**The ink is now read back out of the delivered file.** `treatment-labels-do-not-collide.test.ts`
proves the arbiter refuses a collision between the labels it was ASKED to place. A title, a
standfirst, a source line, a row name in its gutter, an axis tick — none of them go through it, and
they are most of the words on a plate. `scripts/design-base/text-boxes.mjs` rebuilds every `<text>`
run's ink box from the shipped SVG with the same instrument the renderer used (resvg's own bounding
box, through `measureText`/`measureTextBand`), and
`skills/splash/test/text-in-a-delivered-plate-does-not-overlap.test.ts` runs it over every plate in
`proof/*/renders/`. 26 plates, clean. Two lessons came out of building it: `&#x27;` read literally
over-measures a title by ~30px and reports an overlap that is not there, so the entity decoder has
to know the hex form React writes; and the tolerance is 2px because a box around ink is not the ink
— on `co2-suisse/nocturne` two runs share 1.3px of box where the only glyph reaching into it is the
comma of `32,1`, which sits above the `2023` of the line below and touches nothing.

**And two predicates counted the wrong thing.** `every-bar-labelled-lets-the-axis-go` and
`order-is-chosen-from-the-answer` both asked for two or more GROUPS, because both were filed from
the grouped-bar harvest. The evidence under them is not grouped: Ferdio's plate is six bars and no
groups, ONS's is twelve COICOP divisions in one series, and the DVP specimen that supplies the
negative case is three columns in alphabetical order. The first plain ranking to come through the
base — ten columns, ten printed values, no axis — could not claim the rule that is its own reason
for having no axis. Both now read `facts.barCount`, which a beat states with `bars` and which is
summed out of `groups` where it declares them, so nothing that offered either rule before stops
offering it, and a line beat with 35 readings still gets neither: a reading is not a bar.

**One treatment was filed from the plate rather than from the corpus.**
`the-set-a-claim-adds-up-is-drawn-as-a-set` is derived, on `crossing-marked`'s exemption: the
headline is an arithmetic claim about a SUBSET, `render.mjs` computes that subset by search, and the
undirected plate named the five countries in a caption while drawing a rule across all ten columns —
four of which are in no sum the headline makes. The set is bracketed now, its sum printed on the
bracket, and the rule stops where the set stops. Contiguity is tested rather than assumed, because a
bracket can name a run and cannot name a scattered set.

**Correction 22 — a plate can be clean by every guard and still be misaligned, and both causes were
in the same two lines of every component.**

Rémy pointed at a render and said the texts had to be aligned and not overlap. Overlap was already
measured (correction 21). Alignment was not, and three defects came out of looking, each of them
invisible to every guard in the tree because nothing overlapped, nothing was dropped and nothing
left the frame.

**One. Ink boxes were aligned where baselines should have been.** `measureTextBand` answers per
STRING — "Suède" carries an accent, "France" does not — so each label got a box of its own height,
the arbiter aligned the BOXES, and the baselines fell where they fell: six country names under six
groups at 464.6, 464.8, 466.0, 466.0, 466.2 and 464.6. Every directed component now takes the band
of its REGISTER, once, from a probe carrying an ascender, a descender and a comma, and draws each
run from whichever edge its anchor holds fixed (`above` the box's bottom, `below` its top, the side
anchors its centre). The COLLISION box stays the string's own ink: inflating it to the register band
was tried first and cost this corpus a real end-value label in all three directions.

**Two. The four-anchor default silently split pairs.** A pair is read as a pair — the two halves of
a pyramid, the two sides of a declared break, a strip of category names under a waterfall — and the
arbiter, which knows nothing about pairs, gave one member its first anchor and the other its third.
Measured: `Femmes` at 219.7 against `Hommes` at 234.1; the scatter's two spread notes 29px apart;
the waterfall's five names on two baselines, the two totals displaced because their bars reach the
baseline and their `above` box lands on their own mark. Each pair now names its anchor
(correction 20's `anchors`), so it is set on one line or dropped and reported — which is visible.

**Three. A treatment can be right for its evidence and wrong for the plate.**
`value-beyond-the-growing-tip-in-ink` is drawn from plates of four to sixteen rows in one column. On
twenty-seven rows sorted by size and packed into two columns, following each tip put twenty-seven
right edges on twenty-seven different x — a staircase. The rule's substance is kept (outside the
mark, in page ink, never in the fill); its position is not. The threshold is written into the
treatment doc rather than into this beat. And the repair paid for itself: with no number hanging off
a tip, the zero rule moved to the column's own edge, every bar got 55px longer, and the direction
that had refused this beat at 1920 × 1080 now draws it.

**What this says about guards.** Overlap is measurable and now measured. Alignment is not, or not
generically: a checker that flags every pair of near-equal baselines cannot tell a label following
its own mark (`14,9` over one bar, `15,0` over another) from two labels meant for one line, and it
reported forty of the former on this corpus. So alignment is fixed AT THE SOURCE — one band per
register, one named anchor per pair — rather than watched by a guard that would cry wolf.

**Correction 23 — the first of the nine forms with no directed component, and its references are not
newsrooms.**

`boxplot` was the tenth beat through the base and the first form whose harvest held no news desk at
all: a methods journal (`nature.com`, `nmeth.2813`) and a cryosphere data tool (`nsidc.org`,
Charctic), plus three `100.datavizproject.com` specimens two of which turn out not to be box plots.
Two publications is the floor, and these two agree on three things that changed the plate:

**The summary is furniture and the case is ink.** Nature's figure 1 is drawn without one chromatic
pixel — `pixel.chromatic` empty, the box a `#D4D4D5` fill at 3.3 %, every rule and letter together
under 1.2 % of the frame. NSIDC keeps greys for its median and bands and colour for the years being
argued about. The undirected plate gave all eight boxes the same blue; eight boxes in one hue argue
nothing, so the accent now lands on the one decade the headline names.

**The sample is drawn beside its own summary**, which is the answer to the failure
`references/types/boxplot.md` names outright: a box built from five readings draws the same
confident rectangle as one built from five thousand. This beat has seven decades of ten annual
readings and one of FIVE — 2020-24 is partial — and the undirected plate said so in a footnote while
drawing all eight boxes identically. Every reading is now a dot on its box's own axis, so the thin
decade is thin on the plate.

**Every band names its own statistic**, and where that could go took four attempts, three of them
drawn and looked at — beside the first box (dropped onto the sample dots), the empty top-left corner
(100px of room against a 146px legend), the empty top-right corner (a box glyph inside the plot
reads as a second, stranger summary for the 2010s), and its own gutter (162px of panel, and still
inside the value range, so it lines up with the 7,0 gridline). A legend that can be mistaken for
data is not a legend. The statistics are named in a `Lecture :` line in the header — NSIDC's own
answer rather than Nature's — with the whisker's arithmetic in it, because this form is only ever as
honest as its stated whisker rule.

**Correction 24 — a new beat, a form nobody in journalism draws, and a guard that could not see its
own artifacts.**

`radar` is the second of the nine forms with no directed component and the first that needed a beat
built from nothing: `proof/static-radar-electricity-mix`, France against Germany, nine sources, each
axis a share of that country's OWN generation. Four of its five references are football analytics —
`blogarchive.statsbomb.com` and The Analyst — because that is where this form is actually practised,
and all three rules two of those publications agree on are about making a radius readable, which is
exactly what `references/types/radar.md` says the type is worst at: print every spoke's number, draw
the grid as circles with a visible ceiling, and caption the population the radius is a share OF.

**What the type sheet asks for and no reference supplies is the axis ORDER** — it calls that the
type's structural weak point, because a polygon's area moves with the order and count of its spokes.
Here the nine run renewables, then nuclear, then fossil, clockwise, and the order is stated in the
reading line rather than left to be inferred.

**Three layout findings, each measured on a render rather than reasoned about.** A radar is square,
so its size is bounded by the HEIGHT it is given: with the standfirst, the key and the reading line
stacked above it the wheel had a 44px radius and was smaller than its own labels — the words moved
into a left column and the radius roughly doubled. The `%` sign was printed eighteen times around
the wheel and is now carried once by the ring label and once by the reading line. And a label's room
around the ring is the WIDER of the name and the value line, not their sum; adding them cost 45px of
radius.

**The guard that could not see it.** `claims-grounded-in-data.test.ts` traces every artifact under
`proof/` to a script that can regenerate it, and its list of beat scripts was `render.mjs`,
`render-web.mjs`, `render-map.mjs`. Every directed beat so far also had an undirected `render.mjs`,
so eleven `render-directions.mjs` files had been invisible to it; the first beat with ONLY a directed
render landed three PNGs it could not trace. Adding `render-directions.mjs` to that list did more
than admit them — it put every directed beat's claim strings under the same grounding scan, and it
immediately found one: `static-income-life-expectancy/render-directions.mjs` had retyped its
threshold as `30 000 $` in the headline, next to the `BREAK = 30000` that defines it. That beat's own
`render.mjs` carries a comment about having paid for exactly that defect once already.

**Correction 25 — the form whose promise is arithmetic, and the trap that has now caught three beats
in a row.**

`sankey` is the third of the nine forms with no directed component and the second beat built from
nothing: `proof/static-sankey-electricity-sources`, nine sources into six countries, 54 flows,
1 637.5 TWh. Four of its seven references are publications that actually draw energy flows — LLNL,
the IEA, Eurostat, Carbon Brief — and four rules two or more of them agree on are now filed:

- **every node carries its own total** (three publications). A sankey has no axis, so a node that
  does not print its quantity leaves the reader estimating areas, which is what this form is worst
  at. One register throughout, no size hierarchy: the bar does the ranking.
- **the neutral is the largest area** (three publications, all measured — LLNL's grey at 11 % of the
  picture, the IEA's `#A1A1A1` at 5.31 % against a largest hue at 4.25 %, Carbon Brief's 16 % neutral
  against 1 % accent). *The categorical cap is respected not by having few colours but by making
  sure the many colours are small.*
- **ribbons are translucent so crossings are honest** (two publications). An opaque ribbon set is a
  picture whose truth is a property of the loop that drew it.
- **conservation is kept visible** (two publications). A flow too small to draw is still drawn: a
  dropped term breaks the form's promise INVISIBLY, because the plate still looks balanced. Ten of
  this beat's flows are under a hundredth of a per cent and all ten are ribbons.

**Conservation is asserted, not eyeballed**: both rails are summed and compared before a mark is
drawn. And the labels are spaced rather than dropped — `Autres renouv.` is 1.8 TWh, 0.4px of rail,
and its label would sit on its neighbour's; one pass down at the register's own band, one pass up to
pull the overflow back inside the plot.

**THE TRAP, THREE TIMES NOW.** `toLocaleString("fr-FR")` groups thousands with a NARROW no-break
space, U+202F, and the glyph guard walks the family ladder for every character a register must set.
`1 638` refused Avenir Next, Helvetica Neue, Optima and Helvetica in one line — no direction could
be composed at all. The scatter hit it as U+00A0 the same day (six serifs refused), and the axis
title before that. The rule to remember: **French number formatting emits characters no face on
these ladders covers, and every beat that formats a number for a reader has to normalise them to a
plain space.** Inside a single text run a plain space is not collapsed, so nothing is lost but the
typographic nicety — and the guard fires before a mark is drawn rather than after a silent fallback.

**Correction 26 — the form that multiplies two scales, and the palette question its own corpus
answers three ways.**

`marimekko` is the fourth of the nine forms with no directed component:
`proof/static-marimekko-electricity-mix`, six countries, column width = the country's own
generation, column height = its mix, so a band's AREA is a quantity in TWh. Coal is 12 % of the six
and 99,5 % of it stands in two columns.

**Two rules two or more publications agree on**, filed: *the width dimension is named on the plate*
— it is the one quantity on this form with no axis and no legend by default, and the three
publications answer it three ways (Visual Capitalist's annotated arrow down the largest cell, the
IEA's cumulative axis, Ferdio's brace under each column, taken here) — and *a narrow cell degrades
its label rather than dropping it*: shrink it, then move it out with a leader. The type sheet says a
small cell should go unlabelled rather than clip; these publications show the better third way.

**The palette question is where this family disagrees with itself, and the disagreement is
instructive.** Ferdio says colour carries identity, one shared palette down every column — one
publication. The IEA's four cost curves and Visual Capitalist say *grey field, chromatic argument*,
one accent against one grey, *"refusing a second hue is what keeps the boundary legible"* — two
publications. So identity here is a **measured ramp** between the direction's own ground and ink,
one step per source, and the accent is spent on the single band the headline is about. Nine bands,
one hue, and the hue is the argument.

**The refusal this form carries is in the component**, not in prose. The IEA's marginal cost curve is
this corpus's worked negative case: a variable-width chart whose narrowest units fall under a few
pixels **has stopped encoding its second dimension**, and colouring those slivers makes the plate
look informative while telling the reader nothing. The component measures its own narrowest column
and throws under 26px. This beat's narrowest is Switzerland at 4.8 % of the total — 39px — so it
draws, and a beat that added two more small countries would not.

**And the spacing pass earned its third use**: column names on one axis, band names on the other,
sankey node labels the day before. Push apart in order at the register's own band, pull the overflow
back inside the frame, drop a leader where a label has moved off the thing it names. Its bound here
is the band-name gutter rather than the frame edge — pushed to `width - PAD`, `SUISSE` sat against
`ÉOLIEN` in the one direction that sets annotations in tracked capitals.

**Correction 27 — one plate, two palette failures, and what a direction's colours are FOR.**

Rémy looked at the marimekko twice. The first time he said the breakdowns were almost all black and
white; the second, that the colour compositions did not go together. Both were right, and they were
different mistakes.

**The first was methodological.** The plate gave all nine sources steps of one grey ramp, on the
strength of two publications against one: the IEA's four cost curves and Visual Capitalist's smoking
plate say *grey field, chromatic argument*, while `100.datavizproject.com`'s viz90 says *cell labels
carry the share only; COLOUR CARRIES IDENTITY*. But those two publications draw a SINGLE-SERIES
variable-width chart — a cost curve with one highlighted interval and nothing to tell apart — and
this is a stacked composition nine bands deep, which is Ferdio's construction. **Two publications
outweigh one only when all three are answering the same question.** A rule harvested from one
construction of a form was applied to another, and the plate came out colourless.

**The second was worse, and it is the one to remember.** The repair reached for the grounded subject
conventions — `#1B7F4B` for renewables, `#3A3A3A` for fossil, the house accent for nuclear. Three
imported hexes beside a direction's own accent is **not a palette; it is four palettes on one
plate**, and `skills/palette/scripts/palette.mjs` says so in its own header: it returns exactly ONE
convention, as the chart's single accent, because *"a story about coal-fired power replacing hydro is
not two accents, it is a choice the journalist makes"*. A convention is a colour a reader already
holds for ONE subject; it is not a set to build a scale from.

**What holds.** The nine sources are ORDERED — fossil, nuclear, renewables — and an ordered set takes
a SEQUENTIAL ramp. The ramp's two poles are built from the direction itself, `mix(accent, ink)` at
one end and `mix(accent, ground)` at the other, so the field is one hue family that cannot clash with
the direction that set it, and its behaviour on a dark ground falls out of the same expression rather
than being special-cased: on `nocturne` the poles swap, the ramp inverts, and the tracked band stays
the most contrasted thing on the plate.

**The rule this leaves behind, for every beat that needs more than one fill:** a categorical set of
imported hues is the last resort, not the first. Order the categories if they can be ordered and ramp
the direction's own accent along them; where they genuinely cannot be ordered, one accent against one
neutral is the corpus's most-measured arrangement. The sankey next door keeps its grey field, and
there it stands — all three publications under that rule draw the same construction it draws, with
the neutral measured as the largest area on all three plates.

**Correction 28 — the palette rule, applied backwards over every plate, and made mechanical.**

Rémy: *"cette approche devrait être prise en compte pour tous ceux qu'on a déjà vus ensemble."* So
the fourteen directed plates were swept for what they name.

**The result is short: only the marimekko had ever imported a colour.** Every other plate already
derives its fills from the direction's own three — `deriveFurniture` for the neutrals, `mix` for
steps, `adjustToContrast` for the floors — and the twelve single-category plates use the arrangement
this corpus has measured most: one accent on the subject, one neutral for everything else. That is
already the rule's second branch, so nothing there changes.

**One plate did change: the sankey.** Its 54 ribbons were one muted grey, on `the-neutral-is-the-
largest-area` — three publications, all measured, all drawing this same construction. The rule stands
and the field is still neutral-dominant, but its nine sources are ORDERED, and an ordered set can be
told apart by a sequential ramp instead of being one undifferentiated mass. The ramp runs from the
furniture's own muted to a low tint of the direction's accent; the tracked flow keeps the full accent
and is still the only saturated thing on the plate.

**Where the rule does NOT apply, stated so it is not applied by reflex:** a plate whose categories
are already told apart by POSITION — a box per decade, a bin per interval, a column per country —
gains nothing from a ramp along that same axis. Colour there would encode what position already
encodes, which is ink spent twice. The ramp is for a set that shares one axis and can only be told
apart by fill: the marimekko's stacked bands, the sankey's ribbons.

**And it is a guard now, not a habit.** `a-directed-plate-names-no-colour-of-its-own.test.ts` reads
every `Directed*.tsx` and every `render-directions.mjs`, strips comments — the corpus records what it
measured in prose, and those records quote hexes — and refuses any remaining `#rrggbb`. Verified by
mutation: putting `#1B7F4B` back into one component turns it red and names the file. 27 files, 0
named colours.

**Correction 29 — the form whose own corpus says which of its records are not it.**

`gantt` is the fifth of the nine forms with no directed component:
`proof/static-gantt-top-ten-tenure`, tenure in the world's ten largest CO₂ emitters, 1990–2024, read
out of the same frozen ranking the bump beat next door draws as position. Six countries never left;
ten arrived, left, or both; two rows are interrupted and one lasts a single year.

**Its seven references split cleanly, and the records say so themselves.** Three are NOT positioned
spans — duration bars on a zero-anchored axis, where the axis is days from zero rather than a date
scale — and two are the real thing (Threestory's sitting justices, USAFacts' seats). A corpus that
labels its own near-misses is worth more than one that does not, because the two rules filed here
had to hold across BOTH constructions to be filed at all:

- **both dates in the row label.** A bar on a date axis is read as a POSITION by a reader who came
  for "when" and as a LENGTH by one who came for "how long"; Al Jazeera's record says writing both
  dates "costs a gutter and removes the form's characteristic misreading entirely", and ABC does it
  in one line with no extra column.
- **an open span says it is open.** Threestory aligns every open end at the present and lets the
  shared edge carry it — "no arrow, no 'present', no legend entry"; ABC writes a trailing dash. Both
  refuse the same thing: a span drawn to a closing date it does not have. This plate takes both,
  because together they cost nothing.

**What the ladder spends here is words, and the floor it protects is the row label.** Sixteen rows
want 14.7px of pitch each to carry their names; a three-line reading leaves 8.8px. The component
refuses under that floor rather than draw a gantt whose rows cannot be named, and the ladder gives
way in order — the reading line's short forms, then the reading line, then the standfirst's — so
`creme` ships with a one-line standfirst and no reading line, and says so on the console. **A rung
spent in silence is a sentence that quietly went away; a rung reported is a decision.**

And one detail worth keeping because it is the kind of thing only a render shows: ABC's rule is to
abbreviate the closing year, never the opening one — but a one-year span is a DATE, not a range, so
`Koweït 1991` rather than `Koweït 1991–91`.

**Correction 30 — the densest agreement in the corpus, and the rule that arrived from it rather than
from a repair.**

`bullet` is the sixth of the nine forms with no directed component:
`proof/static-bullet-low-carbon-share`, low-carbon electricity as a share of each country's own
generation, 2015 against 2024. Six references across FIVE publications — the BBC's election night,
two Datawrapper plates, ICAEW, two Statista charts — and **four** rules two or more of them agree on,
which is the most any family in this base has produced:

- **the target is named on the line that draws it.** `326 seats for a majority` sits ON the rule —
  "the whole apparatus: no legend, no caption, no lookup". A bullet's second mark is the one a reader
  has no other way to identify: unnamed, a thin rule across a bar could be a target, an average, a
  forecast or a previous year.
- **the track runs the full scale.** Not to the target: it keeps rows comparable, lets a winner
  visibly exceed the line, and makes the REMAINDER legible — the one reading a bare bar cannot give.
  Datawrapper's record adds the second half: a flat neutral track is "the honest degradation of a
  bullet's qualitative bands" where the data carries no poor/ok/good split, and it manufactures no
  judgement.
- **the verdict is written as a derived number.** `0 seats to go` — "what a reader wants and what a
  bullet leaves them to compute"; ICAEW draws the shortfall as a labelled area because a tick answers
  the question only after a subtraction performed by eye. The predicate is strict: it fires only
  where EVERY mark has a comparative state, because a verdict on some rows and not others is a plate
  that looks complete and is not.
- **two states of one measure are one hue at two chromas.** Datawrapper: "the reader is told these
  are two states of the same quantity before reading a single label." Statista: "two states of one
  measure should not read as two categories."

**That last one is correction 28 arriving from the corpus instead of from a repair.** The palette
rule this tree reached by drawing a marimekko badly twice — derive from the direction, never import a
second hue — is stated outright by two publications that never met, on the smallest possible case:
two marks, one measure, one hue. A rule that is discovered twice from opposite ends is the kind worth
keeping.

And the beat itself refuses a temptation the form invites: **2015 is a date, not a target.** No
policy is being scored, the plate says so in its reading line, and nothing on it is drawn as a
commitment.

**And this beat's own standfirst was false when it was written.** It said "the four countries already
above 90 % in 2015 gain less than a point each". `claims-grounded-in-data` refused the typed `90`
first — a literal sitting where a computation belongs — and the assertion written to satisfy it then
threw: **France was at 92.2 % in 2015 and gained 2.7 points.** The sentence was wrong about one of
its own four. It reads 95 % and three countries now, because that is what the frozen file says.

Two guards in a row, on one sentence, in the order they were built: one refused the untraceable
number, the next refused the untrue claim.

**Correction 31 — the form whose inventor's own figure is this base's counter-example.**

`streamgraph` is the seventh of the nine forms with no directed component:
`proof/static-streamgraph-swiss-electricity`, nine sources, 2000–2024, silhouette offset, inside-out
order. Solar goes from 0.01 TWh to 5.66 and becomes Switzerland's third source in 2016 — a RANK, so
the rank is what is computed and asserted, year by year, including that it held afterwards.

Five references across four publications, and one of them is Lee Byron's own paper figure — the
designer who invented the form, drawing it at its purest. **This base carries it as the negative
case**: strip the labels and *"nothing on this plate can be turned back into a number"*. That is what
puts `a-band-is-named-inside-itself-or-it-is-texture` at priority 9, on four publications, with
UNHCR's scaling rule attached: big band, big name; tiny band, nothing — *"it shows the long tail
instead of pretending it away"*.

**The second rule is a refusal with its own counter-example inside the corpus.** UNHCR's
documentation plate keeps a value axis over a centred offset, and prints NEGATIVE labels for a
quantity that cannot be negative. So: a free baseline forbids a value axis, the tracked band carries
its number at both ends, and the total is drawn once, plainly, outside the stack.

**The third is the radar's lesson again, in another family.** Where a form leaves the layer order
free, the order is an editorial decision: *"sort the layers so the crossing happens — a fixed order
hides it"* (Ferdio), *"inside-out keeps the small series from being crushed against a hard edge"* (Lee
Byron). `references/types/radar.md` says the same about spokes and calls it that type's structural
weak point. Two families, one lesson, and both now say so on the plate rather than in a comment.

**Two things this beat refuses.** 2025 is in the frozen file and is PARTIAL — 65.0 TWh against 78.4,
hydropower 34.0 against 44.9 — and a partial year on a stream reads as a collapse, so the beat stops
at the last complete year and prints why in its own source line. And a label at the frame's edge
reads as clipped even when every glyph is there: measured by cropping the render at 2×, where
`Hydraulique` sat flush against the stream's last pixel. Eight pixels of inset, and the ink guard
still reports zero.

**And the labels were not legible, which is the same failure in a new place.** Rémy read the first
streamgraph and said so. Every band label was already measured against its own fill — but the
TRACKED band's name and its two values were set in the accent, adjusted against the PAGE ground,
while sitting on bands whose fill is not the page: an accent number over a pale band in `creme`, a
mint number over a mint band in `nocturne`. It is the contrast failure this family's own records
name, measured at 2.32–2.52 : 1 on the LLNL plate, arriving through a different door.

The repair is Ferdio's rule taken literally — *"print the value at the ends, OUTSIDE the stack"* —
which needed the silhouette's domain padded by 14 % so that "outside" exists at all. The three
labels now sit on the page, each on a hairline leader back to its band, and the leader carries a
ground-coloured halo because a line crossing a stack is dark on dark somewhere by construction.

**The general rule this leaves:** a label's ink is measured against WHAT IS UNDER IT, not against the
plate's ground. Where the two differ, either measure the local fill or move the label to where the
ground is the ground.

**Correction 32 — the neutral is a claim, and the ramp is why this form exists at all.**

`diverging-stacked-bar` is the eighth of the nine forms with no directed component:
`proof/static-diverging-stacked-electricity`, six electricity mixes drawn as a lean — fossil left,
renewables right, **nuclear straddling the anchor**. France carries 67.7 % nuclear against 5.1 %
fossil and 27.2 % renewable, so the middle outweighs both sides put together.

Three references, three publications — the FT's Visual Vocabulary specimen, jbryer's Likert plate,
Vega-Lite's own example — and two rules two of them share:

- **the neutral straddles the centre.** Vega-Lite: the level belonging to neither ramp is *"straddled
  across the zero, so 'which way does this row lean' is answered by which side is longer, with the
  undecided mass symmetric about the anchor"*. **Pushing it onto one side is not a tidier drawing: it
  adds its whole length to that side's lean, silently, on every row.** And what may sit there has to
  be a CLASSIFICATION, not a judgement — nuclear is neither a fossil fuel nor a renewable, both
  definitional, and the plate does not say whether that is good.
- **the ramp deepens outward.** Palest beside the centre, deepest at the extreme, one ramp per side:
  *"strength reads as colour intensity as well as as distance, which is the whole reason to prefer
  this over a plain stacked bar"*. Two channels saying the same thing.

**A third rule is followed and NOT filed, and the difference is the point.** jbryer puts the two
totals outside the bar at its ends — "they never collide with a small segment" — but only one
publication carries it, so it is cited in the component where it is used rather than added to the
treatment table. One publication is an example; two are a rule.

**And the palette rule pays for itself again.** jbryer picks brown against teal *for CVD separation,
not for prettiness*. This beat reaches the same separation without importing either: the fossil side
ramps toward the ink, the renewable side toward the accent, so the two differ in CHROMA as well as
lightness — and on `nocturne` both ramps invert with the ground, because "deepest" means *furthest
from the paper*, which is what the rule was always about.

**Correction 33 — the floor was measured against the wrong thing, and now it is measured on the
pixels.**

Rémy read the streamgraph and said the text was not legible. Nothing in this tree was red. The ink
guard said no two runs overlapped; the colour guard said no beat named a colour; every label's ink
had been chosen with `adjustToContrast(colour, ground)` and cleared its floor — **against the page**.
Then it was drawn on a BAND, whose fill is not the page.

`skills/splash/test/text-clears-its-contrast-floor-on-the-plate.test.ts` now measures every text run
against **what is actually behind it in the delivered PNG**: the most common pixel inside the run's
own ink box that is not the ink or a blend of it, against WCAG's 4.5 : 1, or 3 : 1 for large text.
47 plates, every run, zero under the floor.

**Why it reads the pixels and not the markup**, which is the part worth keeping. A first version read
the SVG and matched each run against the `<rect>`s beneath it. It produced exactly two findings and
both were false:

- `pic de 1973` at 1.00 against `#61605a` — the rect under it is an era band carrying
  `opacity="0.09"`. **Element opacity is not fill opacity**, and the markup reader saw neither, so it
  compared the text against a grey that is nine per cent present.
- `Hydraulique` at 1.00 against the page — a streamgraph's bands are PATHS. The only rect under that
  run is the background, so the checker measured the text against a ground it is not on.

A composited pixel has no such argument. The delivered PNG is what a reader sees, and the guard's
unit cases prove it bites: pale accent text on a pale band fails at 2.4 : 1 while clearing the white
page it was chosen against.

**Correction 34 — the last of the nine, and the first beat whose data this tree went out and
fetched.**

`calendar-heatmap` closes the set: `proof/static-calendar-heatmap-geneva`, 366 cells, one per day of
2024. Geneva held **31 consecutive days at or above 20 °C**, 18 July to 17 August — a streak, which
is what a calendar grid shows and a line chart does not. The run, the two extremes and the fact that
**August (22.2 °C) was warmer than July (20.9)** are computed and asserted.

**No beat in this tree carried daily data**, so it was fetched: Open-Meteo's ERA5 archive, no key, a
citable public source, frozen beside the beat with the exact `curl` in the BRIEF and the API's own
answer recorded — it resolves to the nearest grid cell, 46.221 N 6.172 E at 368 m, a kilometre or two
from the point asked for, and that is the reading the plate draws. Provenance is the fetch, not the
intention.

**Three rules filed, and the first is a measurement across the family.** Observable draws this form
with `turbo`, and this base's own pixel route classified that plate **`categorical`, with four hue
clusters**, where each of the four disciplined references reads `sequential` with one. So: a
sequential grid is one hue cluster, and the test is a clustering, not a look. The other two: a
position the data cannot fill is drawn as missing (2024 leaves six — the 30th of February and its
siblings), and the key is binned with its breaks printed in °C so a reader can invert the colour.

**Two defects the render showed and the arithmetic hid.** Six bins have five breaks, and dividing the
ramp by `breaks.length - 1` walked `mix` past its own end: the warmest bin came out BLACK, which is
not a step of the accent at all. And forcing square cells bound a 31 × 12 grid by the frame's height
and left half the plate empty — cells need not be square, only capped in aspect.

**And the extreme's outline had to leave the ramp.** ABC's rule is that the mark naming the extreme
sits in a hue outside the ramp so it cannot be read as a value. Drawn in the accent it vanished into
the two warmest bins — exactly the cells a run above 20 °C is made of. It is drawn in the PAPER's own
colour now, the one thing a ramp between ground and accent never reaches.

**And the highlight failed twice, for the same reason each time.** ABC's rule is that the mark naming
the extreme sits in a hue OUTSIDE the ramp so it cannot be read as a value. Drawn in the accent it
vanished into the two warmest bins — the very cells a run above the threshold is made of. Drawn in
the PAPER's colour it became indistinguishable from the gaps between cells, which are also the paper:
Rémy read it as "trop identique aux couleurs en dessous", and he was reading a highlight that looked
like grid furniture.

What survives is a line in the INK, laid in the gutter AROUND the block rather than on the cells,
with a paper-coloured halo under it. Ink is the one value a ramp between the ground and the accent
never takes, and the halo makes it hold over a dark cell and a pale one alike. **The rule underneath
is the same one this tree keeps relearning: a mark's colour has to be chosen against everything it
can land on, not against the plate's ground** — and on a grid, "everything" includes the grid's own
gaps.

**Correction 35 — the family whose own corpus answers a rule two ways, and the seven collisions the
eye had signed off.**

The `paired` family — dumbbell, slope-with-two-states, connected pair — had eleven references and no
directed beat. `proof/more-dumbbell-life-expectancy-gains/` is the first: life expectancy at birth in
2000 and in 2023, ten countries, ranked by the GAIN rather than by the level, which is the editorial
decision the form exists to make. Poland +5.0, the United States +2.5, and **all ten gained** — the
three sentences the plate prints are asserted, so a data refresh that broke one throws instead of
shipping a false headline over true numbers.

**The connector rule has two answers, and the corpus states the condition.** Information is Beautiful
draws the bar between the two dots as FURNITURE — a hairline in the muted ink, there to tie the pair
together — and Ferdio draws it as the MARK, in the accent, weighted, because in their figures the
distance IS the story. Both are disciplined, and they disagree, so the treatment filed
(`the-connector-is-either-furniture-or-the-mark`) carries the condition rather than a preference: the
connector is the mark when the beat ranks by the gap, furniture when it ranks by the level. This beat
sorts by the gain, so the connector is the mark.

**A cross-family corroboration, and a rule that now has five publications.**
`two-states-of-one-measure-are-one-hue-at-two-chromas` was harvested from the `paired` shelf and had
three references; the slope and the before/after column beats had been drawing it that way already.
It is filed now with **five publications across two families**, which puts it well above the imported
floor and makes it a rule of the base rather than of one form. The pale dot is 2000, the full dot is
2023, both mixes of the direction's own accent against its own ground — never a second hue.

**And the subject is ringed, not recoloured.** Poland is the beat's subject, and the reflex is to give
it the accent while the others go muted. That breaks the hue rule the moment the accent is already
carrying the two states. IiB and Reuters both ring instead: the row keeps the palette everyone else
has and takes a stroked frame. So does this one.

**The ink guard found seven overlapping gain labels that three passes of my own reading had not.**
Nocturne sets the value register larger and tracked; at ten rows the gain column stacked, and the
`+3,5` of two adjacent rows overlapped by four pixels — visible in the render, and I had looked at
the render. What fixed it is the ladder this tree keeps arriving at: the row pitch a plate can
actually offer is measured against the band the value register OWES (ascent + descent + breath), and
short standfirst and reading forms are spent, in order, until the measured pitch clears the owed one.
The plate prints which rung it took (`standfirst 2 line(s), reading dropped · pitch 18.5px, owed
17.2px`), and refuses loudly if no rung reaches it. Nocturne dropped its reading line to fit ten rows;
that is the ladder working, not a defect.

The rule underneath is the one that has now paid for itself on six forms: **a defect the eye signs off
is still a defect, and the only thing that catches it is a measurement of the delivered plate.**

**Correction 36 — the frame that was hugged on one side and floating on the other, and the number
that did not exist.**

Rémy asked for one thing — align the frame — and the ring that names the subject row had two
defects, one of them older and wider than this beat.

**The alignment took three passes, and Rémy's eye found each one.**

*The column.* The frame ran from `PAD` to `width − PAD`, which is the right column: the eyebrow,
the title, the standfirst and the source all start at that left edge, and it is the only vertical the
plate has. But nothing had been reserved INSIDE it. The name column was sized `widest name + 14` and
the names are right-anchored 12px off the plot, so the widest name landed 2px inside the left edge;
the gain column was sized `widest gain + 18` against a 12px offset, so the widest gain landed 6px
inside the right. Two pixels on one side and six on the other is not a frame around a row, it is a
frame that happens to miss — and in `rapport` the `+5,0` sat on the stroke.

So the breath is RESERVED rather than hoped for: both columns carry the frame's inset in their own
width.

*The anchor.* That gave 10px on the right and **59px on the left**. The names were right-anchored —
they hug the plot, so every row's name BEGINS somewhere different — and the reservation had been made
against the widest name in the column, `Royaume-Uni`, which is not the name on the framed row. The
names are left-anchored now: one vertical for all ten, the same inset on both sides of every row, and
a ranked list gets the clean left edge it should have had anyway.

*The weight.* Then 10px left and **8.2px right**. The subject's row is set in 700 while its register
is 600, and the columns had been measured at the register's weight. Bold is 2.1px wider, so the one
row the frame is drawn around was the one row that did not fit its own column. The columns are
measured at the weight each row will actually be drawn at.

**A frame is aligned when the thing inside it was measured to fit, not when its own edges are in the
right place** — and "the thing inside it" means that row's own text, at that row's own weight, on
that row's own anchor.

None of the three was visible to any guard this tree had: nothing overlapped, nothing left the plate,
everything was legible. So there is a fourth now, and it measures the ink inside a frame against the
frame, on the delivered plate. Mutation-verified — restore the register's weight and creme goes red
at 10.0 / 8.2.

**And the stroke was `NaN`.** The ring asked for `direction.stroke.hairline * 2`. Eight directed
components read `direction.stroke.hairline`; **not one of the three filed directions carries that
key.** `strokeWidth={undefined}` drops the attribute and the browser's own 1px default draws the
line, so `nocturne` — whose filed rule is 0.8 — was drawing the same weight as `creme`, whose rule is
1, and the direction had quietly stopped being the thing that set the plate. Where a component did
arithmetic on it, `undefined * 2` is `NaN`, and **two beats shipped `stroke-width="NaN"` into their
delivered plates.** Nothing caught it because an invalid stroke width also falls back to 1: every
plate looked almost right.

A hairline is now DERIVED, in `read-direction.mjs`, for the same reason `muted` and `grid` are
derived from the ground rather than named — it has no independent existence. It is the direction's
filed rule, drawn thinner (0.6, 0.6, 0.48). A direction that files its own `hairline` keeps it;
nothing overrides a measurement.

**The guard is on the delivered artefact, not on the source.** `NaN`, `undefined`, `null` and
`Infinity` as an attribute value are the four shapes a missing number takes once React has
stringified it, and they land in the SVG whatever component, whatever field, whatever arithmetic
produced them. Filed red on the streamgraph's three plates before the fix, green after. The rule this
tree keeps paying to learn, in its narrowest form yet: **a number that does not exist should not
survive as far as a plate a reader sees** — and the way to make sure is to measure the plate.

**Correction 37 — the family whose central failure the corpus already held, and the headline that
was false about Europe while every number under it was true.**

`heatmap` was the largest uncovered family left in the harvest — eleven references, no directed
beat. `proof/static-heatmap-europe-electricity/` is the first: 12 European countries × 9 sources of
electricity in 2024, 108 cells, ranked by low-carbon share.

**Four rules filed, and one of them is a failure the corpus keeps on purpose.**
`the-ramp-is-monotone-in-lightness` — Ferdio's viz49 runs white → pale blue → blue → **navy** → dark
red → red, so its navy `10` reads as a heavier cell than its red `15`, and that record says so
itself: *"a reader ranking cells by darkness ranks them wrongly … this is the family's central
failure and the corpus should hold an example of it."* The two disciplined records are monotone in
opposite directions — Information is Beautiful's pin-code poster is on black and runs its loud end
WHITE, ProPublica's is diverging and monotone within each arm — so the rule is not "dark means
more", it is that the ramp never turns back. Plus `the-scale-is-stepped-not-continuous` (ProPublica's
seventeen fills, IiB's visible swatch edges), `the-key-names-its-classes-in-their-own-colours`
(ProPublica's poles, IiB's column heads — *"the caption IS the swatch"*), and
`the-cell-value-is-printed-or-the-region-is-named`, which has TWO answers and states its own
condition: Ferdio prints six numbers because six fit; the pin-code poster has ten thousand cells and
prints none, annotating REGIONS instead, because *"the finding in a heatmap is almost always a shape,
and a callout on one cell cannot say it."*

**The palette question this family answers most sharply.** `palette`'s subject-fit branch fires here
— nine sources of electricity are exactly the substances it holds conventions for — and taking them
would have been the correction-27 mistake again. On a heatmap **the hue IS the scale**: every cell,
whatever column it sits under, is one share on one ramp. Nine hues would be nine ramps. The families
are carried by the column order and a drawn rule instead, and the pixel route reads the delivered
plate `sequential`, **one hue cluster at 214°**.

**And the headline was false about Europe while every number under it was true.** The first draft
drew eighteen hand-picked EU countries and asserted "five clear 94 % low-carbon". Five of *those
eighteen* did — the assertion passed. Across all forty European entities in the file, **seven** do:
Iceland and Albania are both at 100 %, and neither was in the hand-picked list. The check had been
running against the drawn rows, which can only ever confirm the selection back to itself. It runs
over the whole frozen file now, and the selection became a printed rule — the seven above the floor,
plus the continent's largest producers — rather than a hand-pick. **A claim about a population must
be checked against the population, not against the sample the plate happens to draw.**

Two smaller things the render found. Ukraine's 2024 row is blank in every column — the war, not a
country that generated nothing — and a share of a zero total is `NaN` or, worse, a row of
honest-looking zeroes; an entity the file does not report is dropped before any figure is computed
and the drop is printed. And the column heads that stagger onto a second line were drawn 11px above a
row of space reserved for one line, straight through the family rule: `Hydraulique` sat on
`renouvelables`. Every vertical offset above the grid is now derived from the same constants the
marks are drawn at, and the stagger row is reserved only when some head actually needs it.

**The ladder grew a rung, and it is the headline.** Twelve rows at 540px do not fit `nocturne`'s
Futura display register at 32px: the long headline runs to three lines, and three lines of headline
are four rows of the grid. So the ladder spends the headline too — after the reading line and after
the standfirst, because a headline is the last thing a desk cuts. `nocturne` took the shortest of
three filed forms; `creme` and `rapport` took longer ones; all three dropped the reading line, and
each plate prints the rung it took. **A short headline is a form a desk writes. A headline that
silently overflows, or twelve rows quietly becoming nine, is a defect.**

**Correction 38 — the last family, the projection that was arguing for the headline, and four
measurements that would each have shipped.**

`map` was the last of the harvest's families without a directed component.
`proof/static-choropleth-europe-lowcarbon/` is the first: the low-carbon share of forty European
countries' 2024 electricity, on frozen Natural Earth shapes.

**Three rules filed, and the first names a register this base does not have.**
`three-classes-of-place-three-treatments` — administrative area, settlement and water take three
typographic treatments, and the SCMP record says outright that its pair with ProPublica's Louisiana
piece "is the pair that finally evidences the `place` register". No direction here files a `place`
row, because all three were measured on pieces that are not maps — so the three treatments are
DERIVED from registers the directions did file, the way `hairline` is derived from `rule`. Plus
`the-basemap-gives-up-its-contrast` (La Nación's `#FEFEFE`, ProPublica's `#FDFDFD`, and the Toxmap at
the OTHER pole, which is why it is phrased as contrast rather than lightness) and
`water-is-a-tint-not-a-grey` — the one hue on a directed plate that is not a step of the accent,
admissible because **nothing on this plate is measured in blue**. It is not named here either: the
beat asks `palette`'s own grounded conventions, which have held one for water all along.

**The projection was arguing for the headline.** The first version was Web Mercator, and a choropleth
is read by AREA — the eye weights a class by how much page it covers. Mercator inflates Norway,
Sweden and Finland by about two at their own latitudes, and those are three of the seven countries
the headline is about. The plate is LAEA now (EPSG:3035, what Eurostat publishes continental
statistics in). Equal area is not a refinement here; **it is the difference between a map that
supports the sentence and one that manufactures it.** It also made the map half again larger: Mercator's
Europe is as tall as it is wide and was bound by the height of a landscape plate.

**Four defects, each of which measured fine.**

*Malta vanished.* Ring thinning dropped every vertex of a 27 km island and returned `null`; forty
countries reported generation and thirty-nine shapes carried a value. The join guard caught it — the
silent-join failure every choropleth reference sheet in this harvest warns about by name. A ring too
small to thin is now kept whole.

*`FRANCE` named Germany.* A label goes inside a country when the anchor is inside it — and testing
the anchor alone put the word's last three letters over the border. Both ENDS are tested now, and a
country that fails takes a leader.

*The sea names moved until the guard went quiet, and I nearly let them.* `Mer du Nord` and
`Mer Baltique` collided; the tempting fix is to nudge the declared coordinates. That is the defect
this tree keeps finding, one level up. So the beat declares each sea's position as a fact and the
plate searches outward from it for the first spot whose whole label clears every coast — and the
separation between labels is part of that search, not a check run after it, because two labels placed
independently came out two pixels apart and read as one word.

*And then the honest refusal.* With the label's real footprint tested rather than its baseline, the
Baltic could not be named at all: **at this camera the sea is about 21px across and its shortest
declared form is 28px wide.** The sea is narrower than its own name. The plate names the two it can,
prints which one it could not and why, and refuses only if it can place none — because naming a sea
on top of a country to keep a legend honest is the one thing it must never do.

**And a geographic fact moved when the camera did.** Albania's neighbours are derived from the shapes
rather than typed from memory, which is right — but the test ran on the PROJECTED rings with a
threshold in the old projection's unit box. Changing the projection silently changed what "a tenth of
a degree" meant, Montenegro stopped being a neighbour, and the callout went from three to two without
anything going red. It runs in degrees on the raw coordinates now. **A derived fact is only as
camera-independent as the units it was derived in.**

**Correction 39 — the map is the subject, and the layout every chart in this base uses is the wrong
shape for it.**

Rémy: *"c'est pas ultra lisible pour une map et elle ne prend pas assez de place dans la largeur.
C'est vraiment la map qui est importante."* He was right, and the cause is structural rather than a
setting.

**A chart's plot takes whatever aspect the frame gives it. A map's is fixed by the ground it shows.**
Europe in an equal-area projection is 1.39:1, so filling the width of a 960px plate needs 616px of
height — more than the whole plate is tall. Stacked under a header the way every other beat in this
base is laid out, the map is bound by whatever height the copy leaves, and it came out **306 x 220 on
a page where two thirds of the width sat empty**. No amount of cutting copy fixes that; the shape is
wrong.

So the text goes BESIDE the map — which is what both ProPublica map records do, a large map with its
own panel — and the map takes the full height of the plate. Same page, same registers, same ladder:
**548 x 394, 3.2x the map.** The key moved into the panel; the country names that used to stack in a
column to the right of the map now sit in the nearest open water on short leaders, because beside the
panel there is no such column and the map runs to the plate's own edge, which is the point. Albania
takes a ring in the accent rather than a leader across the continent —
`the-subject-is-ringed-not-recoloured`, doing on a country exactly what it does on a row.

**And the ladder grew its last rung: the panel's own width.** `nocturne` sets its body register in
Futura and overran the foot by 35px at every copy rung. The order the plate now states outright is:
cut the reading line, then the standfirst, then the headline, and only when there is nothing left to
cut does the panel take width from the map. `nocturne` publishes at a 37 % panel; the other two at
33 %.

**Three wrong guesses about why the render took three minutes, and the number that said so all
along.** `3.35s user, 176s system`. That split is syscalls, not arithmetic — and each guess I made
(the ring bounding boxes, the memoised text widths, a scanline occupancy grid for the coastlines) was
about arithmetic. Two of the three were improvements worth keeping and none of them was the cause.

The cause: `rungs.map(...)` built **every** rung's layout and then took the first that fits — 144
layouts to use one. Each layout wraps five blocks of copy, each wrap measures every growing prefix,
and every prefix the upstream cache has not seen instantiates a rasteriser that scans the system
fonts. Walking the ladder lazily halved the render outright. **The measurement was in the output the
whole time; three passes of reasoning about the code never looked at it.**

**Correction 40 — filling the frame, and the labels that were quiet because the rule said quiet.**

Rémy, on the two-column map: *"prends le max d'espace possible, là il reste de l'espace en haut et en
bas. Et les pays en texte sont pas ultra lisibles."* Two asks, and the second is the more interesting.

**Fitting is not filling.** The map was sized `min(box.width, box.height x aspect)` — which never
distorts, and which letterboxed 42px of empty plate above and below whenever the box was narrower
than the camera. `max` fills both dimensions at the same single scale, so the map is still not
stretched: the frame simply shows less ground on one axis, and the crop is anchored WEST because the
ground it gives up is the far east of Russia and the ground it must not give up is Iceland, which is
one of the seven the headline is about. With the narrowest panel now the ladder's FIRST rung rather
than a fallback, the map went 548 x 394 to **607 x 436, edge to edge, no slack.**

**And the seven were unreadable because the rule said they should be quiet.**
`three-classes-of-place-three-treatments` puts administrative areas in the muted ink, tracked, as the
quietest thing on the map — and I applied it to the seven countries the headline is about. But those
are not context. SCMP's own plate makes exactly this distinction: `CHINA` is grey *because it is
context*, and the feature under discussion is in the accent. **A rule harvested for one class of
label was applied to a label of a different class** — the same shape of mistake as correction 27,
where a rule for single-series cost curves was applied to a stacked composition.

So the seven take the accent at weight 700, and the quiet administrative treatment goes to the three
countries at the OTHER end of the ramp, which is where it belongs and which hands the reader both
ends of the scale by name. The plate now draws three classes rather than claiming three and drawing
two: feature, administrative context, water.

**Three more measurements that were coarser than the thing they had to find.** The label anchor was
the centre of its country's bounding box, and Norway's box includes Finnmark — so its anchor sat in
SWEDEN, and every label placed from it and every leader drawn to it started in the wrong country. It
is the ring's own centre of mass now, walked back inside the ring when even that falls outside. The
open-water test sampled five columns across a label, and `ISLANDE` is wider than Iceland: the island
slipped between two samples and the drawn word had its first letters on the coast — eleven columns
now, because **a sample grid coarser than the smallest thing it must find will one day fail to find
it.** And the crop bound was applied to the label's centre rather than to its box, so `CHYPRE` sat
half past the edge and came out `CHYPR` — which no guard saw, because the overlap and frame guards
measure the PLATE's frame and this label was well inside that. **A crop is a frame too.**

**Correction 41 — the colour was chosen against a ground the label was only assumed to be on.**

Rémy again, on the same map: *"les textes des pays n'ont déjà pas des couleurs adaptées et faut que
ce soit lisible."*

The ink was walked to the contrast floor against `onCell` — the fill each label was ASSUMED to sit
on: the water for a name placed in the sea, the country's own class for a name placed inside it. A
name placed in the sea beside its country **straddles a coast**, and half of it lands on a cell of
the ramp instead. The assumption was wrong for exactly the labels that mattered, and the pixel
contrast guard cleared them because it samples the most COMMON ground under the box: the coast is a
minority of the pixels, so the guard averaged the defect away.

The repair is the one the calendar heatmap's streak outline already needed, for exactly the same
reason: **a halo.** A stroke in the ground the label was placed on, drawn under the glyphs, so that
whatever is actually behind the label the letters sit on a known colour — and the ink can then be
chosen once and be right. `METHOD`'s own recurring sentence, one turn further: a mark's colour has to
be chosen against everything it can land on, and when you cannot bound that set, put a known colour
under it.

**And the floor is not the target.** The features were at 4.5:1, which is what makes text legible;
the seven countries the headline is about should be the FIRST thing read on the plate, not the last
thing that technically passes. They are taken to 7:1 now. The context countries stay at the floor,
which is what keeps the hierarchy the three-treatment rule is for.

**The halo then broke the overlap guard, and the guard was the thing to fix.** Drawing each label
twice made every haloed name collide with itself: thirteen reported collisions on a plate that had
none. A `<text>` that paints no fill and does paint a stroke is not a run of ink — it is the halo of
the glyphs drawn over it, same string, same position. `textRuns` skips it now, and says in its own
comment what that costs: the halo is a hair wider than the run it sits under, so the measurement
under-reports by half a stroke at the edges. That is the honest trade for not drowning a guard in
pairs it can never mean. **Silencing the guard would have been the defect; correcting what it counts
is the fix.**

**Correction 42 — the form whose no-axis rule caps its own line count, and the plate that contradicted
its headline in its own value register.**

Two corrections before this one were about the wrong axis of the work: I read the harvest's 21
FAMILIES as the catalogue and declared the walk finished, then started an export the owner had not
asked for. The catalogue is 32 chart forms and 8 map forms, a family holds several of them, and
`docs/design-base/CATALOGUE.md` now measures the tree against it on every update rather than
remembering. **A count of what is done is a claim, and it is checked like one.**

`slope` is the first of the eleven charts that were left. Four rules filed — no value axis, each rail
headed by what it is, the delta as a third register, one colour per line end to end — and the first
of them is the one that shapes everything else.

**A slope prints every end value it draws, and that caps how many lines it can draw.** ABC's panels
carry two series; Ferdio's slope carries four. I drew sixteen. The plate rendered, nothing collided,
and the label placer had pushed labels **89 pixels** from the ends they belonged to — every leader on
the plate was pointing at the wrong line. The corpus had said so before the render did: a form that
must print every end cannot print many. Ten still pushed 50px, seven fitted two directions of three,
six fits all three. **The cap is a property of the form, not a limitation of the plate**, so the beat
states its rule and draws the pair the headline is about plus the largest producers.

**And the plate argued against itself in its own numbers.** Rounded to integers it printed `95` for
France and `95` for Finland — the two figures the headline says swapped places came out identical.
The crossing was visible in the geometry and invisible in the value register, which on a plate with
no axis is the register that carries the scale. One decimal now, and the beat asserts that the two
printed values differ before it draws. **The precision a plate prints has to resolve the claim it
makes.**

**Three measurement bugs in one placer, each the same shape.** The room check measured the whole rail
while the labels could only occupy the rail inset by their own band — a check that says yes to a
layout the placer then has to break. The scale projected the marks onto the whole rail too, so the
lowest value's label hung one descent below the plot every single time. And the up-pass subtracted
the overshoot from every label, silently cancelling the top clamp and putting the first number over
the rail's own head. **A bound is only a bound if every pass respects it, and every pass has to be
measured against the same range.**

**Correction 43 — the form whose defect the corpus names outright, and the beat that chose what to
stack because of it.**

`stacked bar` had five references and no directed beat. Information is Beautiful states the family's
defect in one clause: **a segment that does not start at zero cannot be measured by eye.** Everything
this form does well follows from repairing that, and two rules filed here are the repair.

`a-segment-not-starting-at-zero-carries-its-own-number` — every segment prints its own value inside
itself. It is `value-on-the-mark` with a reason of its own, and the reason travels: a segment too
narrow to hold its number has a PLACEMENT problem, never a licence to drop it. Ireland's 2000 level
is 1 TWh against a 583 TWh scale — under a pixel, and there is no shorter form of `1`. Such a row
prints both its figures past the bar's end as one run, `7 + 59`, which keeps each segment's own number
and shows the addition the stack is asking for. Twenty-four numbers on the plate, none silent.

`the-stack-gives-back-the-total-it-hides` — the total goes past the bar, in a register the segments do
not use. Ferdio: *"a stack hides its own total: the reader has to add."*

**And the second half of that record's sentence chose what this beat stacks.** `[level, growth]`
rather than `[earlier level, later level]`, *"so no segment's number has to be subtracted from another
either"* — the reader gets the start, the change and the total with no arithmetic at all. That choice
also fixes what the beat cannot draw, and the script says so in its own error: a country whose
low-carbon generation FELL has a negative segment, and a stack cannot draw one. It belongs to a
waterfall or a diverging bar.

**Two measurements that had to run in a fixed order.** Which segments are too narrow to hold their
number depends on how wide the plot is; how wide the plot is depends on how much room those spills
need beside the bar. One pass cannot answer both, so the plot is measured twice — a trial scale finds
the spills, and the real scale reserves their room. A single pass would have let a spilled run push
the total column off the plate, silently, on exactly the rows that were already the hardest to read.

**Correction 44 — the form that buys back what another form had to refuse, and the defect every
guard in this tree was blind to.**

`small multiples` is the fourth chart form filed from the owner's catalogue, and it is the first one
whose argument is made by a PAIR of beats rather than by one. `static-slope-europe-lowcarbon` draws
sixteen countries on two dates and can carry **six**: a slope owes every end value it prints, and
sixteen labels on one rail push each other off their own lines. The same data, split into panels,
carries **all sixteen**. The cut bought the count. Having both beats in the tree is what makes that
checkable instead of asserted.

Three rules filed, and the first is backed by three publications in three families — as strong as
this base gets. `panels-share-one-scale-or-they-are-not-multiples`, in Ferdio's own words: a shared
scale *"is what separates this from three unrelated charts sitting in a row."* ONS adds the corollary
and proves it against its own sibling component: its axis is a percentage *"precisely so that two
populations of different size can be compared"*, and the counts version cannot do it — **sharing a
scale is sometimes a choice about which measure to draw, not only about which range to set.**

Then `the-cut-replaces-the-boundary` — a panel split is furniture REMOVED, so splitting and then
drawing the boundary you split to avoid pays the cost twice. And
`what-is-shared-is-stated-once-and-what-varies-is-repeated`, whose two records look like a
contradiction (ProPublica shares one legend across three panels; ONS repeats its head labels in each)
until the condition is read: what is common goes once, what belongs to the panel goes in the panel.
The test is whether a reader looking at ONE panel could read it.

**And then the defect no guard in this tree can see.** The first render reserved each panel's block
and let the grid divide the slack, which put every name 7px under its own bars and 12px under the
PREVIOUS panel's delta. Nothing overlapped, nothing left the frame, every contrast cleared its floor
— and `Grèce` read as though it belonged to Denmark's block. **On a grid of panels, proximity IS the
grouping**: it is the only thing saying which name goes with which pair, and it can be wrong while
every distance on the plate is legal. The gap between panels is part of what a panel owes now, and
the plate refuses unless it is at least twice the gaps inside one. Every guard this tree has measures
whether marks COLLIDE; this is the first thing it measures about what marks BELONG TO.

**Correction 45 — the form that only works if the unit is a real thing.**

`pictogram` is the fifth chart form filed from the catalogue. Two rules, and the first is the
family's whole reason for existing: `a-quantity-is-made-countable-by-drawing-its-units` — ProPublica
on a river (*"a quantity too large to picture is made countable … every subsequent argument is a
rearrangement of the same units"*) and Ferdio on three countries (*"the change is A NUMBER OF THINGS,
and the reader can count them. Not a length to estimate, not a gap to subtract"*).

**The test the rule sets, and the thing it rules out.** One square must be one thing. A square
standing for `10.4 TWh` is a length in disguise, and the fractional last square is the tell — so this
beat counts COUNTRIES, not terawatt-hours, and the claim becomes something a reader can check by
counting: sixteen above 75 %, eighteen below 60 %, six in between.

The word the plate does not use is "polarised". It is exactly the kind of word a picture invites and
a count settles, so the plate prints the three counts and the assertion checks that the middle holds
under a quarter of the field. `a-countable-field-is-paired-with-its-own-figure` is why the counts are
there at all — Information is Beautiful: *"neither alone would do the work; the number is unreadable
as a quantity, the field is unreadable as a figure."* And its second half decides the register: a
field of things is counted in things, so the figure beside it is a count, never a percentage.

**And the absence is not drawn.** Ukraine has a shape in the sibling map beat and no 2024 reading
here. On a choropleth a country with no data is drawn in a neutral outside the ramp, because the map
would otherwise have a hole in the geography. On a unit grid it is left out, because **a square would
be counted** — and the key says one country is missing rather than letting forty squares imply
forty-one. The same absence, two forms, two right answers.

**Correction 46 — the rule that refused the beat, and the beat that got built because of it.**

`dot density` is the second map form and the first beat in this tree whose *data* was chosen by a
treatment rather than by convenience.

`the-dots-resolution-is-what-the-data-supports` (La Nación, ProPublica) is a refusal as much as an
instruction. La Nación states the reasoning on its own piece: the dots sit on the STREETS rather than
in polygons, *"since a crime has a street address and not an area."* The obvious beat here — one dot
per terawatt-hour, scattered inside each country's outline, using the electricity file every other
beat in this tree already carries — draws a texture the source cannot support. **Every cluster would
be an artefact of the random number generator and every hole would be one too**, and nothing on the
plate would say so.

So the beat fetched a source that records a latitude and a longitude for every thing it counts. One
dot is one station, where the station is. And the claim that came out of it is one only this form
gives: **72 of Europe's 8,900 low-carbon stations are nuclear — 0.8 % of the places — and they carry
34 % of the capacity.** The count of places and the weight of each, in one picture.

The plate also states what its source does not contain — the database lists the stations it knows,
and its coverage of small solar and small wind is uneven. That is a limit a reader cannot infer from
a field of dots and one that changes what the field means.

**And the panel-overflow defect appeared for the third time.** Three runs — the key's two lines and
the source-limit note — were drawn unwrapped and ran under the map. Every guard was green, because
the overlap and frame guards measure the PLATE's frame and the text was well inside it. This is the
same defect as `CHYPRE` in correction 40 and the same as the map beat's own limit note, and the rule
is now stated where it belongs: **a panel is a frame too, and there is no such thing as a line short
enough to skip the measurement** — how wide a string is depends on the direction, and the direction
is exactly what changes between plates.

**Correction 47 — the family whose own corpus is one newsroom, and the pair of maps that argue with
each other.**

`proportional symbol` is the third map form. Its two references are **both Buried Signals** — one
publication, below this base's floor of two independent ones. That is worth stating plainly rather
than quietly working around: **where a family's corpus is one newsroom, a beat in it draws on the
base's general rules and does not get family rules of its own until a second desk is harvested.**

The one rule that did clear the floor cleared it by leaving the family. Buried Signals' Yemen map:
*"the marks are HOLLOW, and that is the whole encoding … filled discs would have hidden each other
and lost exactly the information the piece is about."* Carbon Brief says the same thing about flows
from another desk: *"bundles darken, and nothing depends on which link was drawn last."* Two
publications, two families, **two answers** — translucency when the marks are areas and the cluster
should read as tone; hollow outlines when the marks are countable objects and the cluster should read
as a number of things. The failure either avoids is the same one:
`an-overlap-accumulates-rather-than-occluding` — **an opaque pile is a picture whose truth is a
function of iteration order, which is a property of the loop that drew it and not of the data.**

**And the beat is the second half of a pair.** It draws the same 8,900 stations as the dot-density
beat. A dot map gives the count of places and says nothing about their weight; sizing the mark gives
the weight and costs the count. The claim that comes out is one the dot map could not make — *a
hundredth of the sites carries 43 % of the capacity* — and the two plates together are what make the
trade-off checkable instead of asserted. It is the same structure as the slope and the small
multiples: two beats, one dataset, and the argument is the difference between them.

**One measurement lesson, twice.** A nested key's height is not known until its labels have been
pushed apart, and a text block placed from the circles' own height put `100` on top of the sentence
below it. Then the corrected reservation made three key circles overrun the panel in two directions,
and the component refused rather than shrinking the map — so the key ships with two circles. **A
stack's extent is not known until the stack has been built**, and a legend is part of what a panel
owes, not a decoration placed after the fact.

**Correction 48 — the rule was obeyed and the plate was unreadable, so the rule had a condition
nobody had measured.**

Rémy, on the proportional-symbol map: *"c'est illisible."* He was right, and the interesting part is
that the plate was following its rule. `an-overlap-accumulates-rather-than-occluding` says hollow
marks pile into a cluster the reader can still count, and the circles WERE hollow: nothing occluded
anything. Buried Signals' Yemen map, where the rule comes from, draws a few hundred strikes. This
plate drew 8,900 on a continental camera and the outlines fused.

**A rule harvested at one density does not carry to another, and the corpus cannot tell you where it
stops — only a measurement can.** The measurement had to be the right one, too: the whole map was
13 % ink, which sounds fine, while western Europe was solid. An average over a field hides exactly
the thing a field can get wrong. The measure that works is the **worst cell** of a grid over the
camera — every circle's stroke length against its own cell's area. All 8,900 measured **302 %**:
three times the cell's own area in outline.

So the beat climbs a ladder of capacity thresholds until the busiest cell clears 40 %, at the
SMALLEST camera any direction gives it — conservative on purpose, so the narrowest plate is not the
one that discovers the problem — and the component enforces the floor again at the camera it actually
got. It settled at 400 MW, 193 circles. The cut is editorial, so it is printed on the plate together
with its reason.

**And the cut made the claim better.** 8,900 circles said "a hundredth of the sites carries 43 % of
the capacity" while showing an illegible mass. 193 circles say **2.2 % of the sites carry 54.5 %** and
show it. Legibility was not a tax on the argument here; the thing that made the plate readable is the
thing the plate is about.

**Correction 49 — the form that finally tests a rule the base filed two corrections ago.**

`three-classes-of-place-three-treatments` was filed against the choropleth, and the choropleth cannot
test it: it names administrative areas and water and **has no settlements to name**. The rule's whole
return is that a reader separates the three classes from typography alone, and a plate drawing two of
three cannot show that. A locator has all three, so this is the first plate in the tree on which the
rule is actually at stake — and the three treatments do separate without a legend.

**Something worth naming: a rule can sit filed and half-exercised for a long time, and nothing goes
red.** Every guard this tree has measures whether a plate is internally sound. None asks whether a
filed rule has ever been spent. The catalogue is now the place that would show it, because a form
with no beat is a rule with no test.

The beat's own claim ties three earlier beats together: **Zaporizhzhia, 6,000 MW, is the largest
low-carbon station the database records in Europe — and Ukraine is the one European country whose
2024 generation the electricity file does not report.** The choropleth drew that absence as a grey
country, the pictogram left it out of a count of forty, and here it has a place. All three
assertions read the same frozen file.

**And the plate states a limit its source invites a reader to miss.** The database records installed
CAPACITY, never output; a plate that said "produces" would be false. That is not a caveat in a
footnote, it is a sentence in the reading line, because the number is unreadable without it.

Two measurements. A label may be pushed and never dropped: each takes the first of six offsets that
clears every box already placed and stays inside the camera, the subject placed first because it is
the one label that may not move. And **an area's seat is the centre of the part IN FRAME, not of the
country** — Russia's own centroid is in Siberia, so a seat from the whole polygon put its name off
the camera and reported "no room" while a third of the plate was Russia, unnamed.

**Correction 50 — a floor is owed by what is drawn, not by the pitch it sits on.**

The cartogram refuses to ship a tile too short to hold its own name; that is the whole difference
between a cartogram and a pattern. The check measured `cellH`, the row pitch — which includes the gap
between two tiles. The gap carries no name. The plate reported *41 tiles, 69 x 15px, floor 16.4px*
and shipped, because 15 was never the number being compared. Measured on the **drawn** tile the
ladder had to spend two rungs to clear the same floor, and did.

Two more measurements the same plate forced, both of the same shape — **a rule harvested on one
geometry does not carry unexamined to another**:

**A licence is not an obligation.** ProPublica's record says to let the cell be as non-square as the
data requires. Read as a permission to fill the column, twelve columns over nine rows gave 4:1
lozenges, and the plate read as nine stacked bar charts. The width is now capped against the height
the rows afford, and the grid centred in what is left. The record was right; the reading of it was
not.

**A tile is a mark on the ground, not a patch in a mosaic.** On a choropleth every country is bounded
by its neighbours, so the palest class still reads as a shape. A tile floats in bare ground, and a
fill under the non-text floor is not a pale class — it is an absent tile. Flooring the bottom of the
ramp fixed that and immediately produced a worse defect: the flat neutral standing for a missing
reading, floored the same way, landed on `nocturne` exactly on the tone the lowest class now owned,
and Ukraine read as a *low* reading rather than as *no* reading. **Missing has to be outside the
ramp, not merely beside it** — the tile is hollow with a dashed edge, and no class is hollow.

The defect and its fix are one step apart here, which is the useful part: the first floor was
measured against the ground, and the thing it broke was measured against the ramp. A colour on a
plate answers to everything it sits near, not to the one thing it was tested against.

**Correction 51 — the form imposes a condition on the source, and the source can fail it.**

Every beat before this one asked *what does this data support?* The contour beat asked it and got a
different kind of answer: not "draw it differently", but "**not from this data at all**".

The field was to be distance to the nearest low-carbon power station, from the frozen WRI file two
sibling map beats already draw. Built and measured, it said 54 % of Belarus, 49 % of Latvia and 35 %
of Ukraine are more than 100 km from any low-carbon station. Those are the database's coverage, not
the world's — the same under-recording the dot map already prints as its own limit line.

**The difference between the two forms is how they fail.** A density map degrades gracefully when a
record is missing: one dot fewer in a field of thousands, and the texture is barely moved. A distance
field does not degrade — one missing station rewrites the value of every cell around it, out to the
next station, and the reader cannot see that anything is missing because the hole is filled by what
surrounds it. A field with a hole in it does not degrade, it lies.

So the rule is the form's, not the dataset's: **an isoline map needs a field its source defines
everywhere, and a field made of records is only as continuous as the records are complete.** The beat
took the one thing in this tree that is complete by construction — the coastline. Nothing is missing
from a polygon.

Three measurements the labelled line then forced, all of the same shape — **a label is a claim about
which mark it belongs to**:

- **A line its own label would cover is not drawn.** The floor is the label's width, so it moves with
  the direction, and a tracked capital face buys fewer lines than a compact one. The ladder prints
  what the face cost.
- **A number is placed where it breaks its own line and crosses no other.** A number laid across the
  next line up reads as *that* line's value. Every seat is tested against every line at a different
  level.
- **Among the clear seats, the one farthest from every number already placed.** The first clear seat
  put a `500 km` beside a `100 km` from another family, and two numbers side by side on a contour map
  read as one ladder.

And one addition rather than a correction: **the summit of a field carries its own number**, the way
a topographic map spot-heights a peak. The innermost contour a reader can be given here is 500 km;
the deepest point is 682, and the headline names it. Without the spot mark that number would have
nothing on the map to sit on.

**A convention was declined for the first time, and the decline is measured.**
`water-is-a-tint-not-a-grey` is admissible on the dot map because nothing there is measured in blue.
Here the measured quantity *is* distance from the water, and on one direction the ramp and the sea
would be the same hue. A grounded convention is a rule about a plate, not about a family: it has to
be re-tested against what each plate measures.

**Correction 52 — filling a line is a claim, and the claim has a price the plate has to pay.**

`proof/co2-suisse` draws Switzerland's emissions as a line and its BRIEF refuses a forced zero in as
many words: *« c'est une ligne ; la pente porte la valeur. »* The area beat draws the same frozen
file and requires one. Both are right, and the difference is exactly what filling adds: a line
carries a rate, a fill claims that the surface **is** the stock. The moment the series is filled,
every clipped tonne becomes surface a reader integrates.

So the price is paid in checks rather than in comments, because a comment does not fail:

- **Zero is in the domain, or the component throws.** One line separates a filled area from a
  decorated line.
- **A series with a gap is refused before a mark is drawn.** An area closes across a missing year:
  the polygon joins the two sides and the reader integrates a value nobody measured, with nothing on
  the plate to show it. A line breaks at a gap and shows it; a fill cannot.

**And the recurring lesson arrived once more, in its smallest form yet.** The end label — the last
reading, in the series' own colour — was seated at the endpoint's own height, which put it *inside*
the surface, where the series colour is the fill's colour. The number vanished into the thing it
labelled; only the unit survived, and it survived because it happened to stick out past the curve.
The seat is now measured against the **curve over the label's own width**, and falls back to sitting
inside the surface in the ground's colour when there is no room above.

That is the fourth beat in a row where a mark was measured against `direction.ground` while sitting
on something else — a panel, a land tint, a class fill, now its own series. The general form of it is
worth stating plainly: **every guard this tree owns compares a mark to the plate's ground, and almost
nothing on a finished plate sits on the plate's ground.**

**Correction 53 — a callout placed inside a field lands on the thickest part of it, by construction.**

The beeswarm names two countries: the biggest circle on the plate and the farthest one out. Both
callouts were first seated beside their own circle, the way the locator beat seats a place name. The
far one was fine. The big one was not, and the reason is not bad luck: **the largest circle is by
definition where the field is thickest**, so there is no clear seat anywhere near it. The card landed
on the swarm it was naming — a card written over the distribution it describes is not a card, it is a
stain on the evidence.

The fix is a layout decision rather than a placement one: the cards get **room reserved above the
band**, and the band shrinks to pay for it. A card is allowed to move; a circle is not.

Two more measurements the form forced, both about honesty of position:

- **A swarm pushes a mark only ACROSS its axis, never along it.** Sliding a circle sideways to make
  room is a lie about the one thing the plate measures.
- **The largest circles are laid down first.** Placed late, a big circle has nowhere left to go and
  is thrown to the edge of the band, where it reads as a value it does not have. Packing order is
  not a performance question; it is a correctness one.

**And a small rule about rows shared by two kinds of thing.** The reference (ABC News) sets the axis
name and the axis ticks at one size, separated by weight, in one row. Sharing a row means they can
collide, and something has to give. Here **the tick gives way**: a tick is one reading of a scale a
reader can interpolate between, and the name is the only thing on the plate that says what the scale
is. How many ticks the name cost is printed on the ladder rather than left silent — the same
discipline as the contour beat's dropped lines and the proportional-symbol beat's dropped stations.

**Correction 54 — a harvested rule can be geometrically degenerate, and the record will not have noticed.**

Ferdio's #70 files a transferable rule: put the LEVEL on one axis and that level's SHARE OF THE GROUP
on the other, "when 'grew but shrank relatively' is a thing that could be true". The connected
scatter beat was built that way and measured. **Within one date, a level and its share of the same
group are the same number up to a constant**, so every point of one date lands on a ray through the
origin and the plate is two straight lines — one ray per date, their slopes set by the two group
totals. That is true of the reference's own figure, three countries and two dates, and its record
saw only that the reading worked.

The reading is worth keeping and the axes are not. Two shares that can move independently — the
country's weight in the group, and how clean its own mix is — keep *grew and shrank at once* and lose
the degeneracy. **A rule harvested from a plate that happens to be small enough for the defect not to
show is still a defect; the base finds it the first time the rule is spent at scale.**

**A ladder has to buy room for the NAMES, not only for the plot.** The labels were placed after the
rung was chosen, so a rung that cleared the plot's own height floor could still leave five of sixteen
entities unnamed — and the beat then refused a plate whose copy could simply have been shorter. Every
rung is now tried whole: laid out, scaled, packed, and named. The floor a plate has to clear is not
the geometry's, it is the reading's.

**And the fifth instance of the same family, smaller each time.** Labels were bounded at the plate's
padding, which let three of them sit on the y-axis's own tick numbers. No guard sees it: the guards
measure the plate's frame, and both runs are well inside it. The bound is the plot's gutter, not the
plate's padding — **the gutter belongs to the axis, not to the labels.**

**Correction 55 — a stroke through a word is not an overlap of two boxes, and nothing here was watching.**

Rémy, on the delivered plates: *les textes sur le graphe sont coupés par les lignes ce qui les rend
peu lisibles.* A gridline through the middle of `BELGIQUE`, a waterfall's connector through
`−154,1`, a box plot's whisker through `10,0`, a zero rule through `67,7`.

**Every guard this tree owns was green on all of them, and correctly so.** The overlap guard compares
one text box to another and a stroke is not a text box. The contrast guard measures a colour against
a ground and both colours cleared their floors. The frame guard asks whether ink left the plate and
none had. The arbiter that places labels keeps them off other labels and off the marks — it has never
known about the furniture: the rules, the gridlines, the leaders and the connectors that run across
a plate by design.

Measured once the question was asked: **26 crossings across six beats**, every one shipped.

The fix is the one this tree already uses wherever a label can land on more than one colour — the
map's country names, the contour's own numbers: **draw the run twice, once as a halo in the colour it
sits on, once as itself.** The colour it sits on, not the plate's ground: a number inside a stacked
segment is haloed in that segment's fill, a band's name in the band's own fill. `text-boxes.mjs`
already skips a fill-less stroked run when it measures ink, so a halo costs the overlap guard
nothing — which is why the halo was available as an answer at all.

The guard rides on the overlap test rather than getting its own file: `inkBoxes` is the expensive
part of reading a delivered plate (every distinct string is measured by rasterising a probe), and it
is already paid for there. What it cannot see is stated in the code: only `<line>` elements are read,
so a curved path through a word stays invisible. Optimistic rather than noisy, which is the trade
that file makes everywhere.

**The pattern is now five corrections old and it has a shape.** Correction 52 named it — *every guard
compares a mark to the plate's ground, and almost nothing on a finished plate sits on the plate's
ground.* This one adds the other half: **every guard compares a mark to another mark of its own
kind.** Text is checked against text, colour against ground, ink against the frame. What crosses
kinds — a line over a word, a fill under a number — is exactly where the defects have been hiding.

**Correction 56 — a glyph is a dependency, and this base's ladder cannot promise one.**

Ferdio's #3 gives the direction of change a **glyph before a number** — `▲ 60%` — so the sign
survives a glance, and the rule is worth taking. Set as `▲` it would have been U+25B2 in the value
register, and **no face on this base's family ladders is guaranteed to carry it**. A glyph the ladder
cannot cover does not degrade: the coverage guard refuses every family and the whole plate fails to
draw. The triangle is drawn as a path instead. It costs nothing, it always renders, and it takes the
same ink.

The general form is worth writing down, because the tree has now met it twice — once as the French
narrow no-break space that `toLocaleString` emits, once here: **a character is a dependency on a
font, and this base does not choose its fonts, the direction does.** Anything the plate can draw as
geometry, it should.

**And a row that is drawn has to be a row that is reserved.** The lollipop plate reserves three rows
under its baseline — the dates, the change, the name — because the reference puts them there. The
line that states which six countries the plate selected was positioned from the reading line's own
baseline instead of being reserved, and it landed on the names. A plate that explains its own
selection has to budget for the sentence that does it, the same way it budgets for the sentence under
each pair.

**Correction 57 — two records from one archive disagree, and the geometry breaks the tie.**

Ferdio's #57 greys the earlier arc — *"the past is neutral and the present is accented"*. Ferdio's #3
tints it — *"not grey, not a second hue: the same hue, lighter"*. Same archive, same series, two
answers to one question, and the base has to draw something.

**The evidence count is the first test and it is not the last.**
`two-states-of-one-measure-are-one-hue-at-two-chromas` carries three independent desks against #57's
one, so the tint is the default. But the two beats that spend the rule have different geometries: the
lollipop's two marks stand apart on a baseline, the donut's two arcs are **concentric, a few pixels
apart**. Two chromas of one hue that a reader cannot separate is worse than a grey they can.

So the tint is measured twice — against the ground it sits on, and against the accent it sits beside
— and where it fails, the plate falls back to the neutral this reference asks for and prints which it
used. On all three filed directions the tint failed the separation floor and **the neutral shipped**.
The lollipop, whose marks are far apart, lifts its tint instead. Same question, answered by the
geometry each time rather than by a house habit — and the losing record is recorded in `PALETTE.md`
rather than quietly dropped.

**And a rule the form's own record left open, closed rather than inherited.** #57's harvest note
ends: *"whether the arcs are on a common scale across the three rings — if they are not, the
between-country comparison the layout invites would be false."* Six rings side by side are a small
multiple whether or not anyone says so, and a reader compares them whether or not the scale lets
them. One full turn is 100 % of the world, on every ring, at one radius — `panels-share-one-scale-or-
they-are-not-multiples` in a radial geometry.

**The form's own trap, printed rather than avoided.** An arc encodes a part of a whole and hides the
whole. Between these two dates the world's emissions grew by half, so a slice that shrank can be a
number that grew — Russia's does. The plate carries the tonnes under every ring, and **refuses to
render if no country among the six actually falls into the trap**: a reading line warning about
nothing is worse than no reading line.

**Correction 58 — a remainder that mixes the thread with the field is where the argument goes to hide.**

The treemap's accent marks a thread — the ten European countries whose low-carbon fleet has tipped to
wind and solar — and the plate draws as many countries as can carry their own figure, folding the
rest into one remainder cell. Nine of the ten tipped countries are small. **They all landed in the
neutral remainder: the headline said ten and the plate showed one.**

Nothing was wrong with any measurement. The cells were sized correctly, every drawn cell carried its
number, the accent was on the right countries. The defect is that **an aggregate inherits the fill of
whatever it is aggregating, and a fill is an encoding**. The tail is now split along the thread — the
thread's own remainder, accented and named, beside the field's — and a cell in the thread carries its
name or the plate does not draw it: an accented box with a number and no subject is an assertion with
nothing to attach it to.

**And the rule the beat exists to spend was written as a check, not an intention.** Information is
Beautiful's record is filed for one thing — *"the accent is assigned by the journalist's answer to
'who is the subject,' never by which value happens to be largest"* — so the beat refuses to render if
the largest cell ever joins the accented thread. At that point the accent and the maximum coincide
and a reader can no longer tell which of the two the colour meant. A rule that only lives in a
comment is a rule that drifts; this one now fails a run.

**The last chart form with a harvested reference is drawn.** Thirty-one of the catalogue's
thirty-two chart forms and six of its eight map forms now have a directed beat. What remains — Dot
strip, Parallel coordinates, Flow map, Hex grid — has **no references at all**, and needs a harvest
before it needs a beat. That is the catalogue doing the job it was built for: a form with no beat was
a rule with no test, and a form with no reference is now visibly a gap in the corpus rather than a
gap in the work.

**Correction 59 — the catalogue counted a form as unevidenced while the reference sat in the corpus.**

The catalogue reads each record's `type:` line to decide which form it evidences, and it reported
**zero references for `dot strip`**. A harvest was ordered. The page it returned —
`100.datavizproject.com/data-type/viz85` — was **already in the corpus**, filed under `paired`, with
a `type:` line that named its GEOMETRY rather than its FORM: *"two parallel number lines, one per
date, with travel leaders between them"*. Accurate, and invisible to the counter.

Three things follow, and all three are now done:

- **The line names the form.** A record's `type:` is not a description, it is an index entry, and it
  is read by a machine that knows the catalogue's vocabulary and nothing else.
- **The second reading was kept, because it measured better.** The first read the page screenshot and
  its own note says the pixel route reached only Ferdio's wordmark; the re-harvest's `largestGraphic`
  returned the 823 x 823 chart card, so the palette figures are now the encoding's own. The record
  says it was read twice and why.
- **The duplicate record was deleted.** The base's convention allows one page to hold two records
  when it carries two forms — the ABC schools piece does. This page carries one, read twice; that is
  a re-harvest, not a second reference, and filing it twice would have inflated the evidence count
  for a floor that exists to stop exactly that.

**And the beat that came out of it refused one of its own reference's rules, with a measurement.** At
three entities #85 labels every leader and each number plainly belongs to the line under it. At
sixteen the leaders cross: eleven numbers were written into the corridor and **not one could be
traced to its country**. The rule is kept for the mark it can serve — the subject's, on its own
accented leader — and refused for the rest. A rule harvested at one density does not carry to
another, which is now the third time this base has had to say so.

**Every chart form in the catalogue with a harvested reference now has a directed static beat:
32 of 32.** What is left is three forms with no references at all — Parallel coordinates, Flow map,
Hex grid — and the counting defect above is a reason to be careful about that claim: a form reads as
unevidenced when its reference is misfiled, not only when it is absent.

**Correction 60 — on a scrollytelling piece the harvester reaches step one, and a flow map is what a scroller builds to.**

Eight pieces were drawn for the `flow map` form and **one survived reading**. Six news pieces from
the url list — Globe and Mail, Reuters twice, Kontinentalist, NPR, National Geographic — harvested
with both routes green, and not one reached a flow map. Five returned the piece's opening: a title
card, a photo-illustration of a satellite phone, a photograph of a bird. The sixth, the Globe and
Mail's world migration routes, returned the scroller's **first step** — a globe with Ukraine
highlighted and no routes on it at all.

That is correction 1 with a sharper edge. It is not only that a generic harvester finds the hero; it
is that **the forms most worth harvesting are the ones a scroller reveals late**. A flow map, a
sequence of small multiples, a build-up of layers — the harvester photographs the empty stage. Until
it can step a scroller, this pool's yield for those forms is near zero and the pool has to be drawn
accordingly, or drawn elsewhere.

Elsewhere worked: a second draw from `search` returned two guide pages. Datawrapper's served a
**promotional header card** — a montage of arrow styles — and was rejected under
`reference-set.md`'s standing rule that a lesson written from a promo card is not a lesson. The EU
data-visualisation guide's page served **Minard's 1862 plate** at the top, and that is the record:
the canonical flow map, read as what it is, with the note saying plainly that its palette is an aged
lithograph's and no direction may be measured from it.

**Correction 61 — I invented a geometry to make a borrowed rule look exercised, and it cost the plate its legibility.**

Minard's rule is that **width is conserved along a network**: a band that splits at a junction splits
its width. The flow beat is a fan out of one origin — it has no junctions — so there was nothing for
the rule to hold. Rather than say so, I built a geometry that would make conservation *look* present:
the bands tiled the node's circumference, so the sum of the widths was literally the ring and the
total was never asserted anywhere.

Rémy's read of the delivered plate was four words: *c'est pas du tout lisible*. He was right, and the
failure is structural rather than a matter of degree. **An arc of the rim is a direction, and
spending the rim on widths spends the directions.** Germany's band alone needed a hundred degrees, so
it left wherever the walk around the rim put it and swept back across the map; twenty-five ribbons
crossed each other over the countries they were about. The rotation I then fitted — the angle
minimising the width-weighted deviation from the true bearings — was a repair on a premise that
should not have been there.

Three things follow:

- **A rule that a beat's geometry cannot exercise is stated as not exercised.** The plate now prints
  the total and the share the drawn bands carry, and the BRIEF says the conservation rule has no
  junctions to hold on a one-origin fan.
- **The redraw's constraints are measured, not conceived.** The widest band is capped at a share of
  the map so the plate stays a map; fourteen of thirty-one hosts clear the floor at that scale and
  carry 88 % of the people; the rest keep a dot and are counted.
- **Two ladder defaults inherited from the sibling map beats were wrong for this one.** Their crop
  anchors west, because what they give up is the far east — this plate's node is *in* the east, and a
  west-anchored crop cut it in half, so every band left a disc the reader could not see. And their
  ladder puts the panel's share outermost, because there the map is the whole subject — here that
  spent the headline's claim to keep the narrowest panel. **A default is a decision made for another
  plate, and it has to be re-taken.**

**And the honest note about how this was caught.** Every guard was green. The plate cleared the
overlap guard, the crossing guard, the contrast floors and the frame; each of its parts was correct
and the whole was unreadable. **Nothing in this tree measures whether a plate can be read** — that is
what the eye is for, and it is the second time in this pass that the eye has been the only instrument
that worked.

**Correction 62 — a default is a decision taken for another plate, and this one inherited four.**

After the flow beat's first redraw Rémy's read was *c'est toujours pas très lisible, tout est
entassé*. Nothing was broken; four settings were inherited from the sibling map beats and none of
them had been re-taken for a plate whose subject is not the continent:

- **The camera framed all of Europe**, because those beats' subject is all of Europe. This one draws
  bands to the largest hosts, so framing Iceland and Cyprus to hold them spent four fifths of the
  plate on empty sea while the bands piled into a thumbnail. The camera is now the box the flows
  need: the origin plus the ten largest hosts, padded, computed from the data.
- **The fit was `cover`.** Filling the box and cropping the remainder is right when the map is the
  subject; here it pushed the node every band leaves from off the right edge.
- **The crop anchored west**, because what those beats give up is the far east — and this plate's
  node is *in* the east.
- **The ladder spent the headline before the panel**, because there the map is the whole subject —
  and here that traded the beat's claim for the narrowest panel.

**The general rule, which is now four corrections old: a component that starts as a copy of its
sibling inherits that sibling's answers to questions this beat never asked.** Every default carried
across is a decision, and it has to be re-taken against what THIS plate is about.

**And a rasteriser fact worth recording, because it aborts rather than throws.** An `opacity` on a
path makes it a LAYER. A layer inside a clip whose bounds fall outside that clip hands resvg an empty
rectangle to round out, and the process dies — `called Option::unwrap() on a None value`, no plate, no
stack, no catchable error. The bands' transparency is now mixed into the colour instead of set as an
alpha: same tone, no layer. (Minard's bands are opaque anyway — a band that shows what is under it is
a band whose width a reader stops trusting.)

**Correction 63 — a box that carries a label is sized by that label, and a key that draws two rows is budgeted for two.**

The hex beat's key printed its five breaks into one another — `5,012,018,025,0` — because the swatch
width was taken from the hexagon's size rather than from the widest number that sits under it. And
the key was budgeted in the layout as **one** row when it draws two, so the breaks landed on the line
that explains what the pale cell means.

Two places, one mistake, and it is the same one the lollipop beat met a fortnight of corrections ago:
**a row that is drawn has to be a row that is budgeted.** Its sibling is now written beside it: **a
box that carries a label is sized by that label** — not by the mark it belongs to, not by a share of
the plate, not by a round number.

Neither was visible to a guard. The overlap guard measures the plate's own text runs and reported
nothing, because it *does* see them — but a key whose five labels sit at 16px pitch and are 22px wide
overlaps by 6px, which is inside the guard's own 2px tolerance times three. Only looking caught it.

**And the map column is complete: 8 of 8.** Charts stand at 31 of 32 — `parallel coordinates` is the
one form left, and it has no reference at all. Two other numbers the catalogue now carries are worth
reading together: **39 directed static beats**, and **zero** in web, video or scrolly. The table was
built to stop the work drifting; what it says today is that one column is nearly finished and three
have not been started.

**Correction 64 — the static column is finished, and the catalogue's job changes.**

`parallel coordinates` was the last of the catalogue's forty forms without a beat, and the last
without a reference. **Forty forms — thirty-two charts, eight maps — now each hold at least one
harvested reference and one directed static beat**, rendered through a filed direction, its six
registers and the arbiter's treatments, in all three directions.

Three things the last three harvests taught, worth keeping together:

- **A form reads as unevidenced when its reference is misfiled, not only when it is absent.** The dot
  strip's reference was in the corpus the whole time, indexed by its geometry rather than its form.
  A `type:` line is an index entry read by a machine that knows the catalogue's vocabulary and
  nothing else.
- **The pool has to be chosen for the form.** Eight news pieces yielded no flow map at all, because a
  flow map is what a scroller builds to and the harvester photographs step one. Two guide pages
  yielded one. For the forms a newsroom reveals late, the guide-and-tool pool is not a fallback, it
  is the right pool.
- **A single publication is enough to draw a beat and not enough to file a rule.** Six of the last
  eight beats stand on one reference each, take its transferable moves as imports, and say in their
  BRIEF that the form has no family rules. That distinction has held all the way down the catalogue.

**What the table now says is not about the work but about its shape.** One column full, three empty:
not one of the forty forms has a directed beat in **web**, **video** or **scrolly**. The four
interaction treatments harvested for the web export are still filed and still unspent. The catalogue
was built to stop the work drifting; it is now pointing at where the work is not.

**Correction 65 — a rule harvested at four hundred marks is furniture at sixteen.**

The parallel-coordinates reference prints a full ladder of values on each of its eight rails. At four
hundred polylines that is what a reader needs to place a line, and the record files it as
transferable. Taken at sixteen lines it produced **twenty-five numbers doing the work of eight** —
four repeated gradations per axis, sitting in the lines they were meant to help read. Rémy's read:
*beaucoup de labels dont on ne sait pas à quoi ils servent*.

The repair is to ask what the ladder was for. **It exists to say that each axis has its own scale** —
and that is said better by seven different ceilings (70 %, 60 %, 30 %, 60 %, 30 %, 50 %, 60 %) than by
four gradations repeated seven times. One number per rail, at its top; one zero, drawn once, because
it is the only value every rail shares.

This is the fourth time a rule has failed to carry across a change of density — the hollow marks at
8 900 stations, the leader labels at sixteen strips, the callout cards at three entities, and now
this. The pattern is stable enough to state as a question the base should ask of every import:
**at what count was this rule true, and what is this beat's count?**

**And the second half of the same read — *quelques labels qui s'emmêlent avec des axes*.** The
country names were bounded by the plate's edges and by each other, and by nothing else, so `Danemark`
ran from the wind rail across the solar one and `Tchéquie` sat on the coal rail. **A label lying over
an axis reads as belonging to that axis**: the seat test now rejects any box a foreign rail passes
through, and a line that cannot clear them falls back to its next-highest axis. All sixteen are still
named on all three directions.

**Correction 66 — the base was not reachable from the skills that produce a beat.**

Rémy asked a question nobody had asked of the tree: *tous les charts et maps ont-ils un skill pour
être conçus, et sont-ils accessibles ?* Measured rather than answered, and the answer was three
quarters yes:

- **Forty forms, forty type sheets, forty directed beats** — that part held.
- **`type-survey.md` had drifted.** It told the journalist that 17 of 32 chart types had a proven
  format on disk; regenerated, it says 32 of 32 and 8 of 8. A generated file with a `--check` mode
  that nobody runs is a file that lies at exactly the moment it matters.
- **No `SKILL.md` mentioned the design base at all.** A producer following the skills wrote a beat
  without a filed direction, without the arbiter, and without knowing either existed.
- **And the base could not have been followed even if the prose had said to.** Its readers —
  `read-direction`, `resolve-families`, `compose` — lived only in `scripts/design-base/`, which an
  **installed root never receives**. Only the runtime pieces (`registers`, `treatments`,
  `glyph-coverage`, `colour`) were carried. The route existed in the twin and nowhere else.

**A route that exists in prose and not on disk is worse than no route**: it sends a producer after a
module that is not there. So the base now SHIPS. `shared/design-base/` holds the three readers, the
three filed directions, and one `index.mjs` whose `filedDirections()` removes the path guessing; it
is carried into the root template beside `shared/chart-beat/`, and a beat reaches it exactly as it
reaches everything else — `#shared/design-base/index.mjs`. The old `scripts/design-base/*` paths are
re-export shims, so the forty beats and their tests did not have to change.

One split was needed to make that possible: `compose.mjs` wanted six pure colour facts from
`pixel-palette.mjs`, which imports `pngjs` — a harvest dependency no root carries. The six moved to
`shared/design-base/colour-space.mjs` and the harvester imports them back, so there is still one
definition.

**And two things the sheets now carry**: every one of the forty names the directed beat that works
its form (`## The worked example in this tree`), and three of them gained the reading this pass
actually built — `flow-map.md` an **origin-destination** section, `hex-grid.md` a **hex cartogram**
one, `cartogram.md` a **tile cartogram** one. That third correction matters most, because
`flow-map.md`'s refusal said in capitals that this toolchain held no producer for an OD flow diagram
— a sentence that travels verbatim into the journalist's menu, and that had become false the day the
flow beat rendered. **A refusal that goes stale in the journalist's direction sends them after a
producer that does not exist; one that goes stale in the other direction hides a producer that does.**

`the-design-base-is-reachable-from-the-skills.test.ts` fails on each half: the prose, the shipped
files, the byte-identity of the directions in both copies, and every sheet's named beat. Verified by
mutation on all three.

**Correction 67 — a form that was built and a form the menu offers are two different facts, and one of them had gone stale.**

Rémy asked the sharper half of his own question: *is there something we produced that the tool, when
it runs, never proposes?* There was one, and it took measuring the PROPOSAL path rather than the
artifact path to find it.

`map.contour-isoline` sat in `catalog/visual-catalog.json` as **`state: "proof-only"`**, with the
reason *"Splash has no shipped contour/isoline implementation; choose a supported map treatment
instead."* — and `visualCatalogueEntries` marks a proof-only treatment unavailable in **every**
format. So `proof/static-contour-europe-distance` existed, rendered in all three filed directions,
passed every guard in the tree, and **no journalist could ever have been offered it.** The sheet
carried the same claim in a blockquote at its top, which is what the catalogue's own parity check
reads, so the two agreed with each other and both disagreed with the disk.

Nothing was broken. The catalogue's claim about the world had simply stopped being true the day the
beat rendered, and **nothing in the tree compared that claim to the world.** Both are corrected, and
a guard now makes the comparison: a treatment whose sheet names a beat with a `renders/` directory
may not be `proof-only`. Mutation-verified by flipping `chart.treemap`.

**What the same sweep confirmed, so the answer is bounded rather than hopeful.** 41 treatments ↔ 41
sheets, a bijection in both directions — no sheet invisible to the menu, no menu entry without a
sheet. `TREATMENT_FORMAT_GAPS` declares three refusals, all on `web`, **none on static**. Every
treatment lists `static` among its formats. `visualCatalogueEntries` returns **130 rows, 0
structurally unavailable**, and of the 41 static rows **40 are proven on disk** — the one that is not
is `image.photograph-sequence`, which needs a journalist's own photographs and cannot be proven by
this tree at all.

**The reachability that is left is conditional, not missing**: map treatments declare the `map`
capability, so they are refused only when a readiness check has actually observed the MapTiler key to
be absent — an unobserved capability does not block. And every type is still filtered by
`dataShape.requires` against the frozen profile, which is the point of the survey rather than a gap
in it.

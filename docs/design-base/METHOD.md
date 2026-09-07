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
| map | url-list | 118 | 28 | 5 | 5 |
| map | informationisbeautiful | 2 | 2 | 0 | 0 |

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

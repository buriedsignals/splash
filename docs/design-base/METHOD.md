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
| line | url-list | 84 | 15 | 1 | 1 |
| line | datavizproject | 100 | 5 | 5 | 0 |
| line | informationisbeautiful | 4 | 4 | 4 | 0 |

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

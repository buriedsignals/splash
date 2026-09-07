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
| line | url-list | 1 | 1 | 1 | 0 |

**line / url-list, 2026-09-07.** One reference harvested to prove the chain end to end, not as a
sample of the family. It found two real defects in the pixel route — chroma against HSL saturation,
and photographing the graphic instead of cropping the page shot — both now recorded in the spec and
guarded by tests. The family's real pool is drawn in Task 5.

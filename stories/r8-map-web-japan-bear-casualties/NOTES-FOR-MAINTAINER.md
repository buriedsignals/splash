# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production

Defects found running this story end to end, each with what was run and what came back. Phases are named in the headings below.

## intake — `denominatorUnread` degenerates to "every other numeric column"

Ran: `freezeSource` on a 40-row x 40-column table whose every column name is Japanese.
Came back: each of the 39 numeric columns carries a `denominatorUnread` block naming **all 38 other
numeric columns** as possible denominators, with `charactersNotRead: ["Han"]`. That is 39 x 38 =
1,482 pairings. There is no population column in this table at all, so every one of them is a false
alarm.
Expected: silence, or one statement — "this profiler reads English, French, Greek and Arabic and
cannot read any name in this table". The mechanism is designed for a table with a FEW unreadable
names beside readable ones; a table entirely in an unread script turns it into noise.
Cost: `source/profile.json` is 67,104 bytes for a 4,333-byte CSV — 15x the data, almost all of it
this cross-product. A journalist cannot read it and a model pays for it in every later phase.

## intake — a total row in a WIDE table is never detected, and it doubles every sum

Ran: `freezeSource` on the ministry's table exactly as published, which prints its national total as
the last row under the same `区分` column.
Came back: `panel: null`, no aggregate report, and `計_被害者数` profiled as `min 0, max 238,
sum 476`. The true column total is 238. `max` is the aggregate row itself.
Why: `aggregatesOf` is only reached when the shape is a PANEL (`profile.mjs:1430` —
`shape.isPanel && shape.entityColumn`), and a panel needs a period COLUMN. One row per entity with
the periods spread across columns — the single most common shape a government PDF publishes — gets
no aggregate detection at all.
Expected: the aggregate named, as it is on a panel, or the profiler saying it did not look.
Cost: see the next entry. This is not a cosmetic sum.

## storyboard — the aggregate row turns a TRUE superlative into `contradicted`, and `contradicted`
## blocks the gate

Ran: `resolveGrounding(takeaway, profile, { csv, recorded: { shape: "maximum", column: "計_被害者数",
entity: "秋田" } })` — the journalist answering the claim-shape question at G1 correctly. Akita IS
the prefecture with the most casualties.
Came back: `contradicted` — *"秋田's own value in 計_被害者数 is 67, not the column's maximum
(238)"*. The 238 is the total row.
Mutation that proves the cause: the same call against the same table with the one `計` row removed
returns `supported` — *"秋田's own value (67) is the column's maximum (67)"*. One row, published by
the ministry in the middle of its own table, flips a correct claim to refuted.
Cost: `groundingScalar` THROWS on `contradicted` unless the journalist records an override reason.
So the gate demands that a journalist overrule a machine that is wrong, in writing, on a true
sentence — or, more likely, that they change a true sentence until the machine stops complaining.

## storyboard — `claimShape: "total"` is documented as "a total" and implemented as "sums to 100"

Ran: the same call with `{ shape: "total", column: "計_被害者数" }`. The question `exchange.md` puts
to the journalist is: *"Is this a maximum, a minimum, a comparison between two named things, a
total, or none of those — and about which column?"* My sentence says "158 of the 238", which in
English is a total.
Came back: `contradicted` — *"column 計_被害者数 sums to 476, not 100"*. `TOTALITY_WHOLE_VALUE` is
100: `total` means *the parts are percentages that add to 100*, which the question never says.
Expected: either the question naming the percentage meaning, or a count total being a shape the
answer can take.
Cost: the one verdict that hard-blocks G1, produced by a journalist answering the question honestly.
Recorded `none` in the end, which is the only answer that does not lie.

## storyboard — the grounding check cannot decide ANY claim about a table whose column names are not
## Latin, and it blames the journalist for it

Ran: four takeaways against the frozen Japanese table, two true and two flatly false, two of them
naming the column verbatim.

    計_被害者数 reached 238 across the table.        -> unverifiable
    計_被害者数 reached 999 across the table.        -> unverifiable   (max is 238)
    秋田 recorded 67 in 計_被害者数.                  -> unverifiable
    秋田 recorded 500 in 計_被害者数.                 -> unverifiable

Control, same 22 values, Latin column names, frozen through the same `freezeSource`:

    casualties reached 238 across the table.        -> SUPPORTED
    Akita recorded 67 casualties.                   -> consistent

The refusal reads *"this profile carries 39 measures (...) and the claim names none of them, so
nothing says which one it is about"* — on a claim that names one of them character for character.
The cause is that the column-name match never fires on a non-Latin name; the message describes the
journalist's sentence as the problem.
Note the asymmetry with `intake`: `denominatorUnread` in the very same toolchain DOES report
`charactersNotRead: ["Han"]`. One skill knows the fact the other one needs and does not say.
Cost: G1 closed `unverifiable` on this story. `unverifiable` is not a gate error, so a takeaway this
check would have REFUTED on a Latin table closes the gate in silence. That is the false-confirmation
shape, arriving as a false abstention.
Also: one `resolved.detail` for this takeaway is 2,858 characters, repeating the same 39-name list
four times. A journalist reads that in a terminal.

## storyboard — the refusal message is the whole column list, four times over

Same run as above. Every unplaceable claim prints the entire 39-column inventory. Four claims, four
inventories, in one verdict string. A reason a reader cannot finish reading is not a reason.

## map-web — the baked plate's water is a hex literal, and on a dark ground the sea is the loudest
## thing on the map

Ran: `bun bake-plate.mjs --width 1000 --style dataviz-dark` for a beat whose `PALETTE.md` records
ground `#16191B` and accent `#D4A853`.
Came back: a plate whose water is `#aac9e0` — `bake-plate.mjs:402`, a literal, with no flag.
Measured on the delivered plate:

    water   #AAC9E0   relative luminance 0.557
    accent  #D4A853   relative luminance 0.426
    ground  #16191B   relative luminance 0.009
    contrast(accent, water) = 1.27:1     (the non-text floor is 3:1)
    plate mean luminance    = 0.431      (ground 0.009)

The sea is brighter than every data mark on a map about land, and an accent circle drawn over the
sea is invisible. This is verbatim the failure the skill's own "Colours" section says was fixed —
`waterFor`/`offRampLuminance` derive the choropleth's water from the palette. The SYMBOL bake, where
a point beat "leaves nearly the whole plate exposed as basemap" (the skill's own words), still
paints it from a literal. It has never shown up because all five existing map-web beats are on a
light ground.
Beat-side workaround: this beat's own copy of the bake takes `--water`, defaulted to the literal so
no existing caller changes, and is given `#376084` (luminance 0.108, 3.01:1 under the accent,
2.67:1 above the ground). Re-baked plate mean luminance: 0.088.
Second half of the same defect: `SEED.waterFill` in `render-web.mjs` is read ONLY by the live layer.
Before the workaround, the fallback plate painted `#aac9e0` and the live map painted the beat's own
colour — one page, two seas, and nothing measures the pair.

## map-web — `plateFollowsGround` structurally cannot fire on a point beat

Ran: `plateFollowsGround({ ground: 0.009, plate: 0.431 })` on the first bake above — a pale-blue
plate on a near-black ground, which is exactly the defect that function's own docstring was written
for ("the furniture was correct and unreadable, which is what correct furniture looks like over the
wrong ground").
Came back: `true`. `DARK_SIDE` is 0.25 and `LIGHT_SIDE` is 0.6; 0.431 is the middle band the guard
"deliberately says nothing about".
Why it cannot fire here: a proportional-symbol plate is mostly basemap, and this format's own bake
paints that basemap's water at 0.557 whatever the ground is. Mixed with dark land the mean lands in
the dead band by construction. A requirement that cannot fire is worse than a missing one.
After the `--water` workaround the same call gets `plate: 0.088` and the guard becomes meaningful.

## map-web — the format ships `decollide.mjs` and nothing in the format calls it

Ran: `grep -rn decollide skills/map-web/` -> four files, all of them `decollide.mjs` itself and the
two detectors that read a rendered result. Zero references in `SKILL.md`, in `MapWebSeed.tsx`, or in
`render-web.mjs`.
What that costs: the seed's thirteen European metro areas are far enough apart never to collide.
Tohoku's six prefectures sit in a strip about a fifth of this frame wide. The first render of this
beat, at 1600x900, put "Iwate" through "Akita", "Miyagi" through "Yamagata", and clipped "Fukushima"
to "ukushima" — three unreadable labels out of eleven, on the six prefectures the title is about.
`decollide` fixes it and is one import away. Round five made it callable from a browser bundle
(`decollide-is-reachable.test.ts`); nobody then wired it into the format that most needs it.
Trap for the next caller: `decollide` returns a ROW per label, `{ anchor, y, moved }`, not a number.
Reading `laid[at]` as a number yields `top: "[object Object]%"`, which CSS drops, and every label
stacks at the top of the map in one row. It cost me one render to see it.

## map-web — build-time label placement cannot be right at more than one container width

Measured on the delivered page, labels de-collided at bake time in frame units:

    window      map box     overlapping label pairs   labels drawn outside the map
    1600x900    520x566     0                         0
    1024x768    386x420     6                         0
    768x1024    582x633     0                         0
     375x667    165x180     17                        4

The labels are POSITIONED as a percentage of the plate's frame and SIZED at a fixed 11.5px
(`render-web.mjs`'s own rule, and the right one for type). So a label's height in frame units is a
function of the container width, and no single build-time placement is correct at all of them. Note
also that the WIDER window gives the NARROWER map: at 768x1024 the box is 582px and at 1024x768 it
is 386px, because the box is bounded by the window's leftover HEIGHT.
Beat-side workaround: a CONTAINER query on `.mw-viewport` (`@container mwmap (max-width: 460px)`)
drops every label but the subject's when the box cannot hold them. After it: 0 overlaps and 0
clipped labels at all four sizes. This belongs in the format, not in a beat.

## map-web — the accessible table ships behind a closed disclosure, which its own component says it
## must not

`MapWebSeed.tsx`'s docstring for `RegionTable`: *"rendered plainly and visibly (never behind a
disclosure widget, never screen-reader-only CSS)"*.
`render-web.mjs`'s `discloseTable` emits `<details class="mw-table-disclosure">` — closed. Measured
on the delivered page at all four widths: `tableInDetails: true, detailsOpen: false`.
On this beat that matters more than usual: 17 of 39 marks have a value of zero and therefore a
radius of zero, so no pointer reaches them and the table is their only COMPLETE reading — which is
the exact state `marksStrandedWithNoChannel` exists to protect. The guard passes, because the table
is present. It is present and shut.
Beat-side workaround: `<details ... open>`.

## map-web — the page overruns the window by a constant 44px, which is the disclosure's own summary

Measured with the table closed, `document.documentElement.scrollHeight` against `window.innerHeight`:
1600x900 -> 944; 1024x768 -> 812; 768x1024 -> 1068; 375x667 -> 715. Over by 44, 44, 44, 48.
The format's own claim is *"the beat occupies at most one screen ... Nothing scrolls inside the
visual"*. `.mw-stage` takes the height left over after the furniture; the disclosure's summary row is
not in that budget.

## map-web — a smaller neighbour owns a quarter of the subject mark's own disc, live

Ran: `verify-live-map.mjs --html <this beat's page>`, then a real pointer walk over every drawn mark.
Came back from the skill's own probe:

    FAIL landscape 1600x900: jp-05 is drawn at 41.8px but a pointer stops reaching it at 71px
    FAIL portrait  900x1400: jp-05 is drawn at 77.0px but a pointer stops reaching it at 108px

The skill's own committed seed page passes the same probe (drawn 43.7px, reachable to 44px), so this
is data density, not a broken beat.
Measured directly, 22 drawn marks x 24 sample points inside each mark's own disc: 6 of 528 samples
return another mark's value, and all six are Akita's. **25% of Akita's own drawn disc answers
"Iwate : 40 people hurt"** — at +30px from Akita's centre, well inside a disc of radius 41.8px.
Cause: `interaction.mjs` states its premise in its own header — *"no proximity resolver needed: each
point is already a discrete, fixed-size target"*. For overlapping proportional symbols that is
false. `drawOrder` paints smaller marks on top so they stay clickable, and their square 28px-floor
buttons then own the overlap. Akita and Iwate's label points are 57 frame units apart with radii 62
and 48.
No beat-side fix exists. Shrinking `MARK_MAX_RADIUS_FRACTION` moves the boundary and does not change
who owns the overlap, because the neighbour's button is a square that extends past its own circle.
The answer is nearest-centre resolution, which is what `chart-web`'s own proximity resolver does and
what this file says it does not need. Worth noting the beat survives it: Akita's 67 is printed in the
subject line under the map and in the table, so no claim lives only in that hover.

## map-web — a symbol beat cannot be assembled without copying the polygon core it never uses

`render-web.mjs`, the file a beat is told to copy and edit, imports `detect-stranded-marks.mjs`,
which imports `marksWithNoPointerPath` from `assets/geo-choropleth.ts` — 44,529 bytes of join, ramp
and ring arithmetic — and `detect-accessible-table.mjs`. The skill's own architecture table says
`geo-symbol.ts` is this format's point core, "trimmed to what a symbol map needs (no polygon join)".
Cost: three failed runs discovering the chain one `ENOENT` at a time, and eleven files copied into a
beat directory to render one map. Every `../assets/` path in every copied file also has to be
repointed by hand; there is no flag and no note about it.

## map-web — 1:50m has no admin-1 for Japan, and the skill only documents admin-0

`SKILL.md`'s "Producing a choropleth" prints a `curl` for `ne_50m_admin_0_countries.geojson` and
argues 1:50m over 1:110m with measurements. A sub-national beat needs admin-1, and
`ne_50m_admin_1_states_provinces.geojson` carries **294 features across nine countries** (Australia,
Brazil, Canada, USA, China, India, Indonesia, Russia, South Africa). Japan is not among them, so a
prefecture beat must fetch the 1:10m file — 40,726,851 bytes against 2,325,694. Nothing in the skill
says so; I found it by filtering the 50m file and getting zero features.

## splash — `runPreflight({ root })` crashes instead of refusing

Ran: `runPreflight({ root })`, which is how the phase table's step 1 reads.
Came back: `TypeError: undefined is not an object (evaluating 'env[canonical]')` at
`keys.mjs:107`, four frames down, inside `resolveEnvKey`.
`env` has no default. `SKILL.md` documents the signature as `runPreflight({root, env, fetchFn})` and
never says `env` is required or that it should be `process.env`. Expected: a default of
`process.env`, or a refusal naming the missing argument.

## storyboard — `recordSurveyedSubjects` and the exchange doc disagree about a subject's shape

`exchange.md` says to record "every angle 4 turned up, kept or dropped". The validator requires
`{ id, learns, medium, format }` and has no `kept` field at all; a subject written from the prose
throws `an id is lowercase words joined by hyphens ... got undefined`. The errors are clear, which is
why this is a note and not a defect.

## Not mine, reported rather than left silent

`bun test skills/splash/test/bake-parity.test.ts` is RED on this branch, on another agent's beat:
`stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/bake-plate.mjs` drifts from the
canonical bake in `assertCameraReachesBounds`. My own copied bake passes the same walk.

## What worked, and is worth not breaking

- The three-silence join discipline. Declaring the 8 shapes with no reading, the 47 aliases and the
  aggregate row, and refusing on any reading with no shape, caught the whole mess in one pass and the
  39 drawn values sum to the ministry's own published 238.
- `verify-live-map.mjs` reported, unasked and in the journalist's own terms: *"NO POINTER PATH: 17 of
  39 marks ... The keyboard and the accessible table ARE their path: tighten the camera, add an
  inset, or accept it knowingly and say so in the caveat."* That is exactly the 17 prefectures that
  reported zero, and it is a fact I could act on. It is the best single thing this format does.
- `groundTakeaway` answered `unverifiable` rather than inventing a confirmation, on every claim it
  could not place. The diagnosis is wrong; the refusal is right.
- The producer gate refused Datawrapper for a web beat on a dark ground, with the reason, and left
  `custom` as the only answer. No guessing.
- The typeface proposal measured every recorded face on this machine and said plainly that Space
  Grotesk draws identical ink to a nonsense family here. Nothing was silently substituted.

## deliver — G3's record is named now, but four of its required values and their vocabulary are not

`splash/SKILL.md` says the G3 row "now names the record and the function that writes it", closing a
gate that used to be "a wall". It names `writeOutputReview`, the `renders/` digest, the plan version,
the finding IDs and a passing QA run. It does not name `angleEvidenceBrief`, which is required and
undocumented, and it does not give the vocabulary the validator insists on. Four consecutive throws,
in this order, each discovered by running it:

    findingIds must name at least one finding ID
    qaRuns[0].status must be "passed" or "failed"        (I had passed "pass")
    OutputReview.angleEvidenceBrief must be a non-empty string
    OutputReview.decision must be "approve", ...          (I had passed "approved")

Every message is good; the documented path just does not lead through them. Same shape one level
down at G4: `materialise` refuses without `handover.language`, which `STORYBOARD.md` already records
and `whereIs` already parses, and without `handover.placement`, which is hand field 4 — both are on
disk and neither is read.

## deliver — the hand-over describes the key state of the ENV, and calls it the file's

The delivered `HANDOVER.md` reads *"No MapTiler key was recorded, so this page does not draw its map
live"*. That is true of the environment I deliberately handed `materialise` — this repository is
public and a live key was committed to it once — and it is what should be on disk. It is not true of
this machine, which has a working key that `runPreflight` probed to a 200 in the same session. A
journalist reading that sentence would go and record a key they already have.
`mapKeyState` has four states and no fifth; the missing fifth is "a key exists and this delivery was
asked not to use it", which is the state every delivery into a public repository is in.

# Survey — the journalist's journey (Part A of the 2026-08-10 feedback)

Read-only survey. Nothing in this document proposes a change beyond naming the smallest honest one
per item; the specs come after.

**Evidence base.** The twin's own tree at `experiment/doctrine-twin`, and the run transcript
`/Users/rmdms/.claude/projects/-Users-rmdms-Sites-Professional-splash-twin-run/5564ead6-4924-4476-906c-1358c1f1925b.jsonl`
(425 JSONL lines; the assistant-facing turns extracted and read in order). Transcript quotes below
are cited as `[N]` where N is the JSONL line number of the block quoted, so any of them can be
pulled back out of the file.

The run: the Heidi.news article "Les JO «écolos» de Milan Cortina feront fondre 34 millions de
tonnes de glaciers", a three-row CSV derived from the SGR/New Weather Institute *Olympics Torched*
report, delivered as one static stacked bar (`stories/jo-milan-cortina-glaciers`). Six phases, one
beat, `whereIs` reporting `done`.

---

## 0. The two questions asked up front

### Which items are the same item?

Seventeen numbered items collapse into **eight real ones**:

| Collapses into | Items | Why they are one |
|---|---|---|
| **Ⓐ The order things are decided in** | A3, A5, A8 (+ the sequencing half of A6) | Every one of them is "X was decided before the thing X depends on". A3: the hand questions presume the kind. A5: medium/genre/size are pinned in one undifferentiated move. A8: the palette proposes house before subject. A6's second half: the takeaway was grounded *after* the treatment was chosen. One phase-order change addresses all four. |
| **Ⓑ The grounding check** | A6 (first half), A13 | The same defect from two ends. A13 is *why* it refuses (`checkNumericRanges` has no aggregate). A6 is *when* it refuses (after the journalist has already picked). Neither is fixed by the other. |
| **Ⓒ The two gates** | A7, A14 | One bug, stated twice. A7 is the observation, A14 is the mechanism and the false green in the parity test. |
| **Ⓓ Preflight is a report, not an offer** | A1, A2 | Both are "preflight states a fact and stops". Keys: states, never offers to fill. Newsroom identity: does not even state. Same seam, same phase, same one-question remedy shape. |
| **Ⓔ The reference loop has neither material nor a gate** | A4, A15 | A15 is the missing row; A4 is that the loop has no question and no destination. Filling the hole without adding the question leaves the loop still not a loop. |
| **Ⓕ Delivery is not a hand-over** | A9, A11 | The forms are wrong *and* nothing is said about the files that leave. Both live in `twin-deliver`, both are about what the journalist actually receives. |
| **Ⓖ The visual is never shown** | A10 | Stands alone. |
| **Ⓗ Audience** | A12 | Stands alone. |

A16 (dark-ground reserve wording) and A17 (accepted) are outside this axis.

### The phase order the journey should have

Current, as documented — `skills/splash-twin/SKILL.md:200-211` and
`skills/twin-storyboard/references/exchange.md:8-98`:

```
preflight → intake → ① restitution → ② takeaway (G1)
          → ③ hand, five questions → ④ reference loop → ⑤ slots+candidates (G2: medium+genre+vehicle+treatment, all at once)
          → ⑥ brief → production (G3 = "a file exists in renders/") → delivery
```

Proposed, given A5's medium → genre → size. **New or moved steps in bold.**

```
 0  PREFLIGHT      capabilities AND identity, each stated and each OFFERED           (Ⓓ: A1, A2)
 1  INTAKE         silent — unchanged
 2  RESTITUTION    claims read back — unchanged
 3  TAKEAWAY (G1)  confirmed verbatim, **and grounded here, before anything is picked** (Ⓑ: A6, A13)
 4  HAND           four questions, destinations rewritten medium-neutral               (Ⓐ: A3)
                   — placement keeps only its editorial half (don't duplicate)
 5  SURVEY         **every chart and map type the frozen profile could support**,      (Ⓐ: A5)
                   each marked reachable / not, from the type sheets + the matrix
 6  MEDIUM (gate)  **the journalist validates the KIND** — genuinely different ways    (Ⓐ: A5)
                   of seeing it, not three variants of one bar
 7  GENRE (gate)   **static / web / video / scrolly (chart · map · image)**,           (Ⓐ: A5)
                   offered only where reachable for the medium just chosen
 8  SIZE (gate)    **portrait / square / landscape**, or the fluid web form —          (Ⓐ: A3 Q4, A5)
                   the half of the old placement question that is a decision
 9  REFERENCE      indexed by argument structure; **ends in a question**;              (Ⓔ: A4, A15)
                   the answer lands in a field
10  PALETTE        **subject first, newsroom second, journalist third**                (Ⓐ: A8)
11  BRIEF          unchanged
12  PRODUCTION     render — unchanged
13  SHOW (G3)      **the artifact itself, in front of the journalist. Nothing about    (Ⓖ: A10)
                   delivery is said here.**
14  DELIVERY       forms per genre; **named files, where they go, the advice**         (Ⓕ: A9, A11)
15  CLOSE          journalist-facing only; **defects go to a file, never to them**     (Ⓗ: A12)
```

Two things about that order are load-bearing and not obvious:

- **Grounding moves from step 12-ish to step 3.** In the run it fired at `[1620]`, after the slot
  was already pinned at `[1553]`. That is A6's whole complaint, and moving it is a sequencing
  change, not a code change.
- **The hand splits rather than moves.** A3 says the five questions presume the kind. The naive
  fix — move all five after the medium — is wrong: `subject` is what the survey at step 5 and the
  palette at step 10 are *of*. Only the **destinations** presume (§A3 below), and only **one
  question** (placement) actually decides genre and size. So: four questions stay, their
  destination column is rewritten, and placement's channel/size half becomes step 8.

---

## Ⓓ — Preflight states, never offers

### A1 — missing keys are reported, never offered

**Where it lives.** `skills/splash-twin/scripts/preflight.mjs:142-192` (`runPreflight`), whose
`capabilities` rows are built by `checkCapability` (`preflight.mjs:136-140`) out of the probe
results in `skills/splash-twin/scripts/keys.mjs:45-60`. The refusal strings are written there:

```js
// keys.mjs:45-47
export async function probeMapTiler(key, fetchFn) {
  if (!key) return { ok: false, status: null, detail: "MAPTILER_KEY is not set" };
```

**What it does now.** It reports accurately and stops. The run:

> `[36]` « Préflight `ready`, sans blocage. Capacités : cartes **disponibles**, Datawrapper et embed
> hébergé indisponibles (clés absentes) — ça n'empêche pas la session, ça restreint les médiums
> proposables. »

That is a faithful reading of the JSON at `[31]`
(`"DATAWRAPPER_TOKEN is not set"`, `"CLOUDFLARE_ACCOUNT_ID is not set"`). No question follows.
`assertPreflightReady` (`preflight.mjs:199-203`) explicitly never inspects `capabilities`, and
`capabilityGap` (`preflight.mjs:213-217`) only formats the closed row for a later phase to surface.
There is no code path anywhere in the twin that accepts a key from a journalist.

The cost showed up twice in this run, in opposite directions. First, the closed capability was
**carried forward into a phase where it did not apply** — it appears inside the Gate-3 approval
option preview at `[2971]` ("Rappel environnement : embed hébergé = fermé
(CLOUDFLARE_ACCOUNT_ID absent)"), and had to be retracted at `[3228]`:

> « Et une **correction à ce que je t'ai dit plus tôt** : j'avais annoncé que l'embed hébergé fermé
> restreindrait la livraison. C'est faux ici — `embed` et `cms-insertion` sont câblés au genre
> **web** uniquement. »

Second, `DATAWRAPPER_TOKEN` closed the `twin-dw-beat` path silently for the whole story (`[1520]`:
« Datawrapper est fermé cette session (pas de token) — la voie déléguée `twin-dw-beat` n'est pas
offerte »), with no moment at which the journalist could have opened it.

**What offering looks like without becoming an install wizard.** The reason strings already name
the exact variable, and the run root already carries a `.env` (`[22]`: 34 bytes). The smallest
honest change is one field and one question:

- each `capabilities` row gains a `fill` — one line naming the env var, where the key is obtained,
  and the file it goes in;
- the orchestrator's preflight step, when **any** row is closed, asks **once**: *"these are closed —
  paste a key now, or continue without them"*, writes what it is given to the root `.env`, re-probes
  that one capability, and moves on either way.

One question, one re-probe, "continue" always available. It is not a wizard because it never
branches, never installs, and never blocks: `ready` still depends only on `dependencies` and
`newsroom-profile` (`preflight.mjs:189`).

### A2 — preflight says nothing about the newsroom theme, credits or config

**Where it lives.** `checkNewsroom` (`preflight.mjs:94-128`) and `skills/splash-twin/scripts/newsroom.mjs`.
The four outcomes are `pass` / `missing` / `declined` / `fail`, and each returns a status plus a
one-line `detail` — `"NEWSROOM.md is complete"` (`preflight.mjs:126`). **The parsed profile is
discarded.** `runPreflight` puts only the status into `checks` (`preflight.mjs:145`).

**What it does now.** When the profile passes, the journey says nothing at all — `SKILL.md:182`
("Preflight runs once, **silently when `ready`**"). In the run the profile passed at `[31]`, and
the journalist heard about it for the first time nine phases later, from `twin-palette` at `[1994]`.
Two consequences, both visible in the transcript:

1. The run root's `NEWSROOM.md` (`[27]`) itself records that **two of its six values are measured
   and four are not**, and that `brandColor: "#0B7A75"` is deliberately *not* the value the charter
   measured (`#d5121e`). The journalist was never told any of this at the point it could still have
   been corrected. It surfaced only as a palette option at `[2028]`.
2. `NEWSROOM.md` has **six fields and none of them is a credit convention** —
   `newsroom.mjs:3` `const FIELDS = ["name", "url", "language", "brandColor", "ground", "typefaces"]`.
   The run hit this exactly, at `[1341]`:

   > « `NEWSROOM.md` ne porte pas de convention de crédit écrite, alors je propose à partir de la
   > source réelle plutôt que de dicter. »

The `missing` branch — invoke `twin-newsroom-charter`, or record a decline — is documented
(`SKILL.md:145-150, 193-196`) and real. What does not exist is a branch for **"a profile exists —
here is what it says"**, and no branch at all mentions credits.

**Smallest honest change.** `checkNewsroom` returns the parsed profile beside the status; the
orchestrator's preflight step states it once — the six values, and which were measured versus
assumed — and, on `missing`, offers the three branches by name: *derive it with
`twin-newsroom-charter`* · *supply your own* (hand over
`skills/splash-twin/assets/root-template/NEWSROOM.example.md`, which already documents every field)
· *decline, recorded*. Credits are then a separate, honest sentence: `NEWSROOM.md` carries no credit
convention, so credit is asked per story (it is already HAND field 5) — or a seventh field is added.
Either is fine; silence is what is not.

---

## Ⓐ — The order things are decided in

### A3 — the five hand questions presume the KIND of visual

**Where they live.** `skills/twin-storyboard/references/exchange.md:21-36`, the table of five
questions and their destinations. Reading the destination column:

| # | exchange.md | Destination | Presumes? |
|---|---|---|---|
| 1 | `:30` subject | "**the single semantic accent.** Real predecessor bug: a scatter labelled its max-y" | **Yes** — presumes a mark to accent, and cites a chart |
| 2 | `:31` comparison | "baseline, second series, annotation" | **Yes** — a map, an image scrolly and a video reveal have no "second series" |
| 3 | `:32` limits | "the anti-overclaim check on the title" | No |
| 4 | `:33` placement | "do not duplicate … **Also feeds channel and size**" | **Yes, and worse** — it *decides* genre and size |
| 5 | `:34` credit | "the visible source line, and traceability" | No |

So the document presumes on three of five, and question 4 is not a presumption but a **decision
taken out of order**: channel and size are settled at step ③, before ⑤ has named a medium.

**What the run did is sharper than the document.** All five questions were asked with ASCII
previews of a bar chart, before any medium existed:

- Q1 `[1182]` — the option preview is three horizontal bars with `← accent` / `← gris` markers.
- Q2 `[1223]` — bars again, with a `│ 50 % = 17 Mt` rule drawn through them.
- Q4 `[1318]` — the "Autonome / réseaux sociaux" option reads « Change le format (**carré** plutôt
  que pleine largeur) et **ouvre la piste vidéo** ». **Genre and size are being chosen inside
  hand question 4.**

The medium was not stated until `[1520]`, four questions later: « Médium `chart`, genre `static` ».
By then the journalist had been shown bars five times.

**Which ones presume:** 1, 2 and 4 — and only 4 actually decides.

**Smallest honest change.** Do not move the questions; rewrite their destinations and split one.
Subject is what the survey (step 5) and the palette (step 10) are *of*, so it must stay early.

- Q1 destination becomes "the one element the visual emphasises, whatever its medium".
- Q2 destination becomes "the reference the reader measures against" — the mechanism is chosen with
  the medium, not here.
- **Q4 splits.** The editorial half ("what does the text already say next to it" → don't duplicate)
  stays in the hand; the "**also feeds channel and size**" half becomes step 8 of the phase order,
  after genre.
- The exchange's own discipline line — "Always carry a recommendation" (`exchange.md:103-107`) —
  stays; what changes is that a recommendation may no longer be drawn as a chart before a chart has
  been chosen.

### A5 — the storyboard's three candidates are thin

**Where it lives.** `exchange.md:86-93` (movement ⑤) and `skills/twin-storyboard/scripts/storyboard.mjs:105-161`
(`checkStoryboard`). A slot is `{id, proves, medium, genre, candidates, chosen}`
(`twin-storyboard/SKILL.md:78`). **Medium and genre are slot properties the proposal arrives
carrying**; the only thing Gate 2 requires the journalist to choose is `chosen` from `candidates`
(`storyboard.mjs:121-139`). There is no gate on medium and none on genre.

**What the run did.** At `[1520]` the assistant announced « Médium `chart`, genre `static` » as
settled, then offered three candidates — all three of them stacked-or-grouped bars of the same three
numbers (`[1533-1545]`: "barre empilée unique + seuil 50 %", "trois barres séparées + ligne à 17 Mt",
"deux périmètres face à face"). The journalist chose a treatment inside a medium and a genre they
were never asked about. Three candidates, one way of seeing.

**Four separate gaps, each with its evidence.**

1. **No survey exists in the journey, although the material does.** There are **32 chart type
   sheets** (`skills/twin-chart-beat/references/types/`, 33 files incl. `README.md`) and **8 map
   type sheets** (`skills/twin-map-beat/references/types/`), each carrying what the type is for and
   when not to reach for it (`types/README.md:1-7`). **`grep -rn "references/types" skills/twin-storyboard/`
   returns nothing** — the storyboard exchange has never heard of them.
2. **A reachability map exists and is equally invisible.** `twin/MATRIX.md` is generated from the
   tree by `twin/scripts/matrix.mjs`, counts an artifact only when it exists on disk
   (`matrix.mjs:13-17`), and reports **17 chart types × 3 genres, all proven**, and **6 map types,
   5 of 6 proven in all three**. **`grep -rn "MATRIX" skills/` returns nothing.**
3. **Genre reachability is checked, but only for charts.** `genreGap`
   (`skills/twin-storyboard/scripts/genre-catalog.mjs:31-42`) reads `GENRE_CATALOG`
   (`genre-catalog.mjs:21-25`):

   ```js
   static: { producerSkill: "twin-chart-beat", delivered: true },
   web:    { producerSkill: "twin-chart-web",  delivered: true },
   video:  { producerSkill: "twin-chart-video", delivered: true },
   ```

   Three genres, three **chart** producers. A `medium: map` + `genre: web` slot passes `genreGap`
   by naming `twin-chart-web` — the wrong producer. `twin-map-beat`, `twin-map-web`,
   `twin-image-beat` and `twin-scrolly` are not reachable through this table at all. The guard that
   keeps it honest, `skills/splash-twin/test/genre-shippability.test.ts:26-44`, checks that each
   `producerSkill` **exists on disk** and that `delivered: true` matches `FORMS_BY_GENRE` — it
   cannot see that the producer named is the wrong one for the medium, because medium is not in the
   table.
4. **Scrolly is structurally unreachable, and image doubly so.** `genreGap("scrolly")` returns
   *"genre \"scrolly\" is not one this toolchain can produce or deliver yet"* (`genre-catalog.mjs:35-37`),
   and `offerForms({genre: "scrolly"})` **throws** (`skills/twin-deliver/scripts/deliver.mjs:88-93`).
   Yet `MATRIX.md:46` records a real scrolly beat (`mapmore-scrolly-danube`, flow/route × scrolly),
   and `twin-scrolly` ships as a complete skill. For image: `capabilityGap(capabilities, "image")`
   returns `null` — `capabilities` has only `map`/`datawrapper`/`hostedEmbed`
   (`preflight.mjs:147-178`), so an unknown medium is silently waved through
   (`skills/twin-storyboard/scripts/capability-gap.mjs:15-22`), and then there is no genre it can
   name. `twin-image-beat` appears nowhere in `MATRIX.md`.

**Smallest honest change.** Three moves, in order of size:

- **Survey step.** Before any candidate is proposed, list the types the frozen profile could
  support, from the 40 type sheets, each annotated *reachable* / *not, and why* from `MATRIX.md`
  and the catalog. Not a question — the ground the medium question stands on.
- **Split the one Gate-2 choice into three gates:** medium, then genre, then size. `checkStoryboard`
  already refuses a `chosen` not drawn from `candidates`; the same rule applied three times is the
  whole mechanism, and `where.mjs`'s `missingForGate2` (`where.mjs:116-143`) mirrors it the same way
  it already mirrors HAND.
- **Widen the reachability table to medium × genre.** `GENRE_CATALOG` becomes keyed on the pair,
  and `genre-shippability.test.ts` walks the pairs. `scrolly` and `image` then appear as honest
  rows — some `delivered: false`, which is exactly what the journalist should be told at proposal
  time rather than at the last phase. This is the same defect `genre-catalog.mjs:12-16` was written
  to close ("a journalist asked for a visual 'for the web' … `twin-deliver` threw at the very last
  phase"), one dimension short.

### A8 — palette proposal order

**Where it lives.** `skills/twin-palette/scripts/palette.mjs:167-225` (`proposePalette`).

```js
// palette.mjs:176 — house pushed FIRST
options.push(scoreOption({ id: "house", origin: "newsroom", … }));
// palette.mjs:190-206 — subject pushed SECOND, and only if a convention matches
const convention = matchConvention(subject);
// palette.mjs:219-222 — and house is preferred as `recommended`
recommended:
  options.find((o) => o.id === "house" && o.contrast.passes)?.id ||
  options.find((o) => o.contrast.passes)?.id || null,
```

The order is house → subject → escape, and `recommended` prefers house explicitly. The comment at
`palette.mjs:211-212` states the design intent plainly: *"A subject convention is a reason to DEPART
from the house theme"* — the exact inversion of what the owner now asks for.

Two further facts the run exposed:

- `SUBJECT_CONVENTIONS` holds **four entries** (`palette.mjs:98-131`): renewables, fossil, water,
  heat. The run's subject — glaciers, emissions, sponsors — matched none, so **only one option was
  offered** (`[1976-1986]`), and the assistant said so honestly at `[1994]`: « aucune convention de
  sujet ne matche. La table n'en porte que quatre … je ne vais pas en inventer une ».
- `matchConvention` returns nothing when **several** match (`palette.mjs:140-145`), by design.

So today the subject option is absent far more often than present, and when present it is ranked
second.

**Smallest honest change.** Reorder the pushes (subject first, house second) and invert the
`recommended` preference; keep the escape branch third, where it already is (`palette.mjs:223`).
That is a four-line change. The larger, separate question — the four-entry table means "subject
first" usually resolves to nothing — should be stated in the proposal rather than silently reduced
to one option: *"no convention applies to this subject, so the newsroom's colours lead."*

---

## Ⓑ — The grounding check

### A13 — `checkNumericRanges` has no notion of an aggregate

**Where it lives.** `skills/twin-storyboard/scripts/ground-claim.mjs:260-294`, reached from
`groundTakeaway` (`ground-claim.mjs:296-308`, the push at `:305`), reached from `checkStoryboard`
(`skills/twin-storyboard/scripts/storyboard.mjs:110-116`).

**Exactly why it happens.** Two lines:

```js
// ground-claim.mjs:278 — membership in a single column's [min, max]
const inRange = numericColumns.filter((c) => value >= c.min && value <= c.max);
// ground-claim.mjs:285-291 — and NOT-a-member is reported as CONTRADICTED
} else {
  claims.push({ claim: m[0], verdict: "contradicted",
    detail: `outside the range of every numeric column (…)` });
}
```

The defect is not the membership test — it is the **`else` branch**. Everywhere else in this file,
a shape the function cannot check comes back `unverifiable` with a reason: `:180` ("first time"),
`:183` (direction word), `:199` (no row-level data), `:203` (no year to anchor on), `:208`
(year absent). The file's own header states the rule at `:10-14`: *"it never returns 'supported' for
something it did not verify, because silence and confirmation must not look alike."* Here the
symmetric error is made in the other direction: **"I could not place this number" is reported as
"the data contradicts this number."**

A total is, by construction, ≥ the max of the column it sums. So *every* part-to-whole takeaway
lands in that `else`. This is systematic, exactly as the owner says.

**Two aggravating facts that make it worse than it looks.**

1. `twin-intake`'s `profileTable` (`skills/twin-intake/scripts/profile.mjs:20-38`) emits
   `{rowCount, columns:[{name,type,missing,distinct,min,max}]}` — **no `rows`**. `groundTakeaway`'s
   own header (`ground-claim.mjs:19-22`) says row-level data is optional and that without it every
   comparison claim returns `unverifiable`. So on a real twin-intake profile, `checkNumericRanges`
   is the **only** check that ever fires — and it is the broken one.
2. `NUMBER_RE = /-?\d+(?:\.\d+)?/g` (`ground-claim.mjs:34`) matches every bare integer in the
   sentence, so any year, count, percentage or ordinal in a takeaway is tested for membership in a
   value column's range.

**The run, verbatim.** At `[1652-1661]`:

```
--- grounding ---
[{ "claim": "34", "verdict": "contradicted",
   "detail": "outside the range of every numeric column
              (\"emissions_tco2e\" [600000, 930000], \"glace_fondue_mt\" [9, 14],
               \"manteau_neigeux_km2\" [1.5, 2.3])" }]
```

and the operator's reading at `[1686]`:

> « 34 est précisément la somme de `glace_fondue_mt` (14 + 11 + 9), et « moins de la moitié » est
> vrai à 41 %. Le takeaway est exact ; le garde-fou ne sait pas le voir. C'est un faux positif
> structurel, pas un cas limite : **tout takeaway qui cite un total d'une donnée décomposée sera
> refusé de la même façon.** »

Recorded as `groundingOverride` in `STORYBOARD.md` at `[1743]`.

**Smallest honest change.** Two lines and one addition, in that order of importance:

1. **The `else` becomes `unverifiable`, not `contradicted`.** A number that matches no column range
   is a number this function could not place. That alone converts a wrong refusal into honest
   information, and it makes the file consistent with its own stated rule.
2. **Add the aggregate as a checkable fact.** `profileTable` already computes per-column
   `min`/`max`; adding `sum` for numeric columns is three characters of arithmetic, and
   `checkNumericRanges` then tests membership in `[min, max]` **or** equality-within-tolerance to a
   column `sum`, reporting *"equals the sum of column X"* as `supported`. That is what would have
   made "34" pass truthfully rather than by relaxation.
3. Only a value that contradicts a fact the function **did** establish stays `contradicted`.

### A6 — the foundation check refuses, and refuses too late

A13 is the *why*. A6 adds the *when*, and it is a pure sequencing fact.

**Where it lives.** `checkStoryboard(meta, profile, capabilities)` (`storyboard.mjs:105`) runs
grounding at `:110-116` — inside the **Gate 2** check, i.e. after slots and candidates exist.
`exchange.md` places the takeaway at movement ② (`:15-19`) and the slots at movement ⑤ (`:86-93`);
nothing in either document runs grounding at ②.

**The run's order, by transcript line:**

| Line | Event |
|---|---|
| `[1149]` | takeaway confirmed by the journalist |
| `[1553]` | slot 1 pinned — "barre empilée unique + seuil 50 %" |
| `[1620]` | *then* the operator reads `ground-claim.mjs` and predicts the refusal |
| `[1660]` | `checkStoryboard(meta, profile, capabilities)` returns the refusal |
| `[1728]` | the journalist is asked to dispose of a Gate-2 dispute |

The journalist had already made the choice the refusal called into question. The owner's line —
"that has to be caught before the journalist picks a visual" — names exactly this.

**Smallest honest change.** Run `groundTakeaway` at **G1**, immediately after the takeaway is
confirmed and before the survey/medium questions, and record its resolved verdict into
`STORYBOARD.md` front matter as a scalar (`grounding: supported` or
`grounding: overridden — "<reason>"`, the shape the run improvised at `[1743]`). Then both gates
check a *recorded field*, not a re-derived one — which is also the fix for Ⓒ (below). The second
half of A6 — "what we propose must be explicit about what we can do and what is missing" — is
A5's reachability annotation, same step.

---

## Ⓒ — The two gates

### A7 + A14 — `where.mjs` and `checkStoryboard` diverge

**Which skills they live in — this determines the correct fix.**

| Gate | File | Skill |
|---|---|---|
| `whereIs` / `missingForGate2` | `skills/splash-twin/scripts/where.mjs:116-143, 154-178` | **`splash-twin`** |
| `checkStoryboard` / `groundTakeaway` | `skills/twin-storyboard/scripts/storyboard.mjs:105-161`, `ground-claim.mjs:296` | **`twin-storyboard`** |

**Different skills.** So the shared-module fix is not available: `no-cross-skill-imports.test.ts`
forbids it, and `where.mjs:41-48` documents the choice in its own comment ("reimplemented here, not
imported, because skills in this branch do not import across skill boundaries"). **The twin's answer
is duplication plus a guard that walks and compares.** The parity test is the right tool here — it is
just the wrong parity test.

**Exactly why the divergence happens.** `whereIs` reads the story directory
(`where.mjs:154-178`). It checks that `source/profile.json` **exists** (`where.mjs:156`) and never
opens it. `missingForGate2` (`where.mjs:116-143`) checks the takeaway sentinel, the six HAND
fields, and each slot's `chosen ∈ candidates` — and nothing else. It has no `profile` argument, no
`capabilities` argument, and therefore cannot run grounding, `genreGap` or `capabilityGap`.
`checkStoryboard` runs all three (`storyboard.mjs:110-116`, `:147-150`, `:156-159`).

So `checkStoryboard` can refuse for **three reasons `where.mjs` structurally cannot see**. The run
put both verdicts side by side at `[1666-1670]` and `[1658-1661]`:

| Gate | Verdict |
|---|---|
| `whereIs(storyDir)` | `phase: "production"`, `missing: []` |
| `checkStoryboard(meta, profile, capabilities)` | Gate 2 **not** closed |

and the operator named the class at `[1695]`:

> « `where.mjs` ne lance jamais `groundTakeaway`. L'orchestrateur dispatcherait donc la production
> contre un storyboard que le gardien du storyboard refuse. C'est exactement la classe de panne que
> la section « the one gotcha » de `splash-twin/SKILL.md` dit prévenir — le test de parité couvre
> `HAND`, les slots et les candidats, mais **pas** le grounding. »

**Why the parity test gave a false green — the line that does it.**
`skills/splash-twin/test/where.test.ts:325`:

```ts
const checkStoryboardClosed = checkStoryboard(meta).length === 0;
```

**One argument.** `profile` and `capabilities` are both omitted, so the three checks that only exist
under the second and third arguments are switched off *inside the test that exists to prove the two
gates agree*. The test then compares two gates that have been made artificially identical. It passes
for the same reason the bug exists.

Compounding it: the nine fixtures (`where.test.ts:276-313`) are **hand-written**, exactly the shape
the project already learned to distrust — `helper-parity.test.ts`'s hand-written import list is on
record for guarding six of twenty copies, and `render-still-parity.test.ts` /
`video-helper-parity.test.ts` were rewritten to **walk the tree** for that reason. A hand-written
fixture list cannot know about a rule added after it was written; the run proved it by adding three
such rules (grounding, `genreGap`, `capabilityGap`) and staying green.

The test's own comment (`where.test.ts:6-9`) claims the opposite of what it does: *"asserting that
two independent implementations of the same rule agree."*

**Smallest honest change — two parts, and the first is the real one.**

1. **Take grounding, genre and capability out of the re-derivation business.** Each is an expensive
   semantic check owned by exactly one skill. Have that skill run it once, at the phase that owns it
   (grounding at G1 per A6, genre/capability at the genre gate per A5), and **record the verdict in
   `STORYBOARD.md`**. Both gates then check *the presence of a resolved scalar* — which
   `where.mjs:120-122` already does six times for HAND, and `storyboard.mjs:108` mirrors. The
   divergence class is then closed **by construction**: neither gate runs a check the other cannot.
   This is also the twin's own stated rule — "a gate closes into a file"
   (`splash-twin/SKILL.md:26-29`).
2. **Make the guard walk.** Call `checkStoryboard(meta, profile, capabilities)` with all three
   arguments, and generate the fixtures from **one complete template mutated field by field**,
   driving the field list off each side's own required-field constant, rather than from nine
   hand-typed strings. Then a rule added to either gate produces its own fixture the moment it lands
   — the property `render-still-parity.test.ts` has and `helper-parity.test.ts` lacked.

---

## Ⓔ — The reference loop

### A4 — no useful references, and the journalist is never asked

**Where it lives.** `exchange.md:72-84` (movement ④) and
`skills/twin-doctrine/references/reference-set.md` (the seven-row table at `:84-92`).

**Three separate failures, all visible in the run.**

1. **The set is not indexed by the thing the loop looks up.** `reference-set.md:1-8` opens: *"Real,
   examined treatments of a **named argument structure**"* — but the table's columns are
   `Reference | Moment | Transferable lesson` (`reference-set.md:84-85`). **There is no argument-structure
   column.** A conversation cannot look a structure up; it can only read seven long prose cells and
   judge. `skills/twin-doctrine/scripts/check-reference-set.mjs` validates that each row has a link,
   a locator and a lesson — it has no concept of structure either.
2. **When the set misses, live search returns nothing usable.** Three searches at `[1440]`,
   `[1443]`, `[1482]` returned a BERT notebook, NGO PDFs and academic supply-chain papers
   (`[1446-1503]`). The operator refused to cite them, correctly, at `[1506]`.
3. **The loop has no question and no destination.** `exchange.md:79` says "The journalist picks or
   rejects" — but there is no gate, and `STORYBOARD.md` has no field for it: the front matter
   `checkStoryboard` knows is `takeaway` + six HAND fields + `slots` (`storyboard.mjs:10, 105-119`);
   `where.mjs:49` mirrors the same list. In the run, **block `[1505]` contains the references and
   the storyboard proposal in the same message** — « ## ⑤ La proposition de storyboard » begins at
   `[1516]`, seventeen lines below the first reference — and the next `AskUserQuestion` (`[1524]`)
   is about the slot, not the references. The journalist was shown two references and never asked
   about either.

Contrast this with every other movement, which does end in a question: ② at `[1120]`, ③ at `[1171]`
/`[1212]`/`[1256]`/`[1297]`/`[1343]`, ⑤ at `[1524]`, palette at `[2013]`, Gate 3 at `[2960]`,
delivery at `[3232]`. ④ is the one movement in the journey with no `AskUserQuestion` behind it.

**Smallest honest change.** Give the loop the two things every other movement has — a key and a
question:

- add an **argument-structure** column to `reference-set.md` (and to
  `check-reference-set.mjs`'s row validation), so the loop can look one up rather than read seven;
- end movement ④ with a real question, and land the answer in a `reference:` scalar in
  `STORYBOARD.md` front matter — which makes "the journalist rejected both" a recorded fact rather
  than a lost one, and gives the `BRIEF.md` at ⑥ something to derive from.

### A15 — no row for "a total whose majority escapes the subject named in the title"

**Where the hole is.** The seven rows at `reference-set.md:86-92` cover: an annotated dot-flow
(NYT), many honest random runs (WaPo), one fixed 3D model carrying contradictory testimony (NYT VI),
geography paired with its historical moment (Vox), noisy dots under a smoothed line (ABC), a profile
whose two dimensions disagree (ABC), and deviation from a local expected rank (The Pudding). None is
a part-to-whole reversal.

`reference-set.md:16-20` already records the file's own method for closing a hole — *"a fourth round
added three more rows, one per structure that real stories showed this file had no answer for"* —
and the run reached exactly that situation and could not close it. The operator's account, `[1437]`:

> « La structure d'argument — *un total dont la majorité échappe au sujet nommé dans le titre* —
> n'a pas de ligne dans le jeu de références du twin. Le plus proche est The Pudding … »

and the refusal, `[1506]`: « **Je ne te citerai pas une référence que je n'ai pas regardée** — c'est
exactement l'erreur que ce jeu de références a commise trois fois avant d'être taillé. »

That refusal is the skill working. What is missing is the row.

**Smallest honest change.** One verified row for this structure, found and checked to the file's own
round-4 bar (`reference-set.md:33-44`: look at the real pixels **and** read the text beside them).
The floor in `test/reference-set.test.ts` moves from seven to eight in the same commit, so the row
cannot later be quietly dropped. This is research work, not code work, and it should be scoped as
such.

---

## Ⓖ — A10: show the finished visual before discussing delivery

**Where the gap lives.** `skills/splash-twin/SKILL.md:205` — the phase table's `production` row:

> `| production | Beat by beat: BRIEF.md written first, … checklist applied to the pixels. | G3, per beat | beats/<n>-<slug>/renders/* |`

The gate closes into **the existence of a file**. Nobody is asked. `where.mjs:145-152` confirms it
mechanically: `hasAnyRender` returns true when any `renders/` directory is non-empty, and
`whereIs` then returns `delivery` (`where.mjs:175`). **Approval is not a condition of leaving
production.** `twin-chart-beat/SKILL.md:137` — `// Now open pngPath and look at it.` — addresses
the *model*, not the journalist.

**What the run did.** The renders were read into the model's context at `[2774]` and `[2891]`
(`Read` on `still.png`, returning base64 image blocks). The journalist received prose: `[2780]`,
`[2886]`, `[2896]`, `[2926]`, and a checklist table at `[2939-2950]`. The Gate-3 question at
`[2964]` reads:

> « Le beat, tel que **tu le vois**. Tu valides ? »

— a question that presupposes sight, asked in a turn where nothing was put in front of the
journalist to see: no path to open, no URL, no instruction. This matches the owner's standing rule
that describing does not count.

**And delivery was discussed first, twice, wrongly.** Delivery constraints appear at `[1772]`
(before production even began) and inside the Gate-3 approval option preview itself at `[2971]`
("Rappel environnement : embed hébergé = fermé"). Both were **wrong**, and had to be retracted at
`[3228]` once `offerForms` was actually called. So the sequence the owner objects to is not merely
untidy — it put an incorrect delivery constraint inside the approval question.

**Smallest honest change.** Make G3 a real gate with a journalist step, symmetric to G2 and G4:
production ends by **surfacing the artifact** (the file path to open for a static; the opened HTML
for a web beat; the mp4 for a video) and asking approve-or-correct — and that turn says **nothing
about delivery**, because delivery's forms are `offerForms`' output and cannot be known before it
runs. `whereIs` then leaves `production` on a recorded approval field, not on the mere existence of
a file — the same "a gate closes into a file" rule the other three gates already follow.

---

## Ⓕ — Delivery

### A9 — the delivery forms need re-contextualising

**Where they live.** `skills/twin-deliver/scripts/deliver.mjs:26-76`, `FORMS_BY_GENRE`.

| genre | forms today | line | owner asks for |
|---|---|---|---|
| `static` | `owned-file`, `source-bundle` | `:27-37` | the media itself · **CMS insertion** |
| `web` | `owned-file`, `source-bundle`, `embed`, `cms-insertion` | `:38-64` | standalone HTML · Cloudflare embed link · CMS insertion |
| `video` | `owned-file`, `source-bundle` | `:65-75` | the media itself · **CMS insertion** |

So `cms-insertion` is missing from static and video, and the file **already says why** —
`deliver.mjs:49-53`:

> *"'static'/'video' could plausibly host or insert their single owned file too; that is left to a
> follow-up rather than offered here without having been proven for those genres."*

A9 is that follow-up. The one form the owner does *not* name in any genre is `source-bundle`,
which is a developer artifact; that is worth an explicit decision rather than an assumption.

The run saw only the static pair (`[3214-3225]`), and the retraction at `[3228]` establishes that
the earlier warning about a closed Cloudflare capability was irrelevant to a static beat all along.

**Smallest honest change.** Add `cms-insertion` to the `static` and `video` tables with an honest
`gives` (it is still UNPROVEN against a live CMS — `deliver.mjs`'s own `gives` string at `:59-62`
already says so, and that wording should be reused verbatim). `singleOwnedFile` — the one-file
guard `cms-insertion` shares with `embed` (`twin-deliver/SKILL.md`, Tuning knobs) — needs a decision
for `static`, where `renders/` legitimately holds **two** files (`still.png` + `still.svg`, seen at
`[3269-3271]`) and would currently be refused as ambiguous. Then decide whether `source-bundle`
remains a journalist-facing option or moves behind an explicit ask.

### A11 — delivery must name the files, say where they go, and give the advice

**Where the material already is, unused.**

- `materialise` **returns every path it wrote** (`deliver.mjs`, "How it works" step 4:
  *"A caller that wants to confirm the delivery can list `written`"*). In the run that array was
  printed to the terminal at `[3268-3271]` — as a raw JSON array of absolute paths.
- **Where in the article is already a recorded fact.** `placement` is HAND field 4
  (`storyboard.mjs:10`; `where.mjs:49`), and in this run it held « après le § des 34 Mt, canal
  article-web, pleine largeur » (`[1339]`). Nothing reads it back at delivery.
- The alt text, the credit line and the limits caveat are all in the beat and in `STORYBOARD.md`.

**What the journalist actually got** — the final message, `[3299]`:

> « `whereIs` rapporte **`done`**. Livré dans `stories/jo-milan-cortina-glaciers/export/` —
> `still.png` (127 Ko, 2×) et `still.svg` (vectoriel). »

Two filenames and two sizes. No statement of which file to use where, nothing about the SVG being
the one to give the CMS, no alt text to paste, no credit line, no restatement of the limits caveat
that the beat's own subtitle carries.

**Smallest honest change.** The delivery phase closes into a file, like every other phase: write
`export/HANDOVER.md` — one document naming each delivered file with its role, the placement read
back from `STORYBOARD.md:placement`, the alt text read from the component, the credit line, and the
one caveat the limits field carries. The data is all present; nothing new needs deriving. This also
gives A12 its mechanism (below).

---

## Ⓗ — A12: the end-of-run report is developer feedback

**Where the gap lives.** Nothing in the twin says who a message is for. `splash-twin/SKILL.md:243`
says *"A missing prerequisite is **reported** and never designed around"* — reported to whom is
unspecified, and the same sentence is repeated verbatim in `preflight.mjs:1`.

**What the journalist received.** The closing message, `[3298-3311]`, is four fifths internals:

> « **Trois défauts du twin trouvés en cours de route** … 1. `ground-claim.mjs` /
> `checkNumericRanges` n'a aucune notion d'agrégat. Il teste l'appartenance à `[min, max]` colonne
> par colonne … 2. `where.mjs` et `checkStoryboard` divergent. `whereIs` ne lance jamais
> `groundTakeaway` … Le test de parité couvre `HAND`, les slots et les candidats — pas le
> grounding. 3. Le jeu de références n'a pas de ligne pour cette structure d'argument … »

Those three paragraphs became feedback items A13, A14 and A15 — they are valuable, and they are for
the maintainer. Earlier turns leak the same way: `[1620]` narrates reading `ground-claim.mjs`;
`[1673-1695]` presents a two-row table of gate verdicts and cites `splash-twin/SKILL.md`'s gotcha
section; `[2840]`-`[2886]` walks the journalist through why `inspectSvg` measures painted pixels
rather than markup; `[2908]` explains `#shared/*` resolution. And at `[1699]`, the journalist is
asked to arbitrate an internal defect: « Gate 2 est contestée par un faux positif du contrôle de
fondation. Comment on dispose ça ? », with options naming `ground-claim.mjs` and `where.mjs` by
filename.

**Smallest honest change — and it can be mechanical.** A prose rule ("keep dev talk out") is the
softest surface in this project by its own account. The twin already has the right pattern twice
over: `twin-palette/scripts/format-proposal.mjs` and
`twin-newsroom-charter/scripts/format-proposal.mjs` render the journalist-facing question from
structured input, so nothing the function was not given can appear in it. Apply the same shape to
the close: `export/HANDOVER.md` (A11) is generated by a `formatHandover(...)` that is **handed only
journalist-facing data** — the delivered paths, the placement, the alt, the credit, the caveat. A
defect in the twin's own code physically cannot enter it, because it is not an argument.

Defects then go where this run already put two of them and where the twin's own doctrine says state
belongs: on disk. The `groundingOverride` written at `[1743]` and the latent-defect note added to
`BRIEF.md` at `[2931]` are the correct behaviour; the closing message repeating them to the
journalist is not.

---

## What this survey did not settle

- **Whether `source-bundle` is a journalist-facing form at all** (A9). It is offered in all three
  genres today and is named in none of the owner's three-form lists. That is a product decision.
- **The reference row itself** (A15). Finding and verifying one is research to the file's own
  round-4 bar; this survey establishes the hole and the shape, not the row.
- **Where the size gate's values come from** (A5/A3 Q4). The phase order puts a size gate at step 8;
  what "portrait / square / landscape" mean per genre is B2.1's territory (`FRAME` is fixed per beat
  today), and the two need to be specced together or the gate will offer sizes nothing can render.

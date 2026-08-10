# Audit — W1, the journalist's journey

Read-only audit of `twin/specs/W1-journalist-journey.md` and everything it governs, against the tree
at `experiment/doctrine-twin` (`dd01abf0`, working tree dirty with three concurrent chantiers whose
files are excluded from this audit). Nothing in the product was changed; this file is the only thing
written.

**Method.** Every claim below is either a file:line in this tree or a mutation run in a copy of the
tree at `/private/tmp/.../scratchpad/twin-copy`, never here. No agent's own report of its work is
used as evidence. Twenty-seven mutations were run; twenty-five reddened, two stayed green and are
reported as holes. The mutation ledger is §6.

**Headline.** W1 landed, and it landed better than most of this project's chantiers: the ten tasks
all have commits, the load-bearing guards genuinely go red, and the central design claim — that both
Gate-2 readings converge on recorded scalars and the parity test generates its own fixtures — is
true and provable (M4/M5/M6). What is wrong is smaller and sharper than "not done": **four
statements the toolchain makes to a journalist or to itself are still false**, and one of them is
the exact defect class W1 was written to end.

---

## 1. Was the spec followed?

| § | Task | Verdict |
|---|---|---|
| §3 | T1 — grounding stops calling "I could not place this" a contradiction | **Followed**, with one guard weaker than advertised |
| §4 | T2 — the two gates converge, the parity test walks | **Followed and exceeded** |
| §5 | T3 — reachability becomes medium × genre, scrolly reachable | **Followed**, guard half-blind |
| §6 | T4 — the type survey | **Followed** |
| §7 | T5 — the order, plus the palette inversion | **Followed**, with a documentation contradiction shipped |
| §8 | T6 — preflight states, and offers once | **Followed**, with a stale capability table left behind |
| §9 | T7 — the reference loop gets a key and a question | **Followed**; A15 honestly not closed (floor stayed 7, as the spec allowed) |
| §10 | T8 — G3 becomes a real gate | **Followed, then defeated** by a pre-existing short-circuit |
| §10 | T9 — the forms and the hand-over | **Partially followed** — `HANDOVER.md` is optional, and G4 does not exist |
| §10 | T10 — the journalist never reads about us | **Followed** |

### The commits

`fc4ca15c` (T1) · `8bd7a6ce` (T2) · `1cbdbb71` (T3) · `38da4bea` (T4) · `d9ce710d` (T5) ·
`c76b79a1` (T6) · `7b6405c4` (T7) · `be6acbcc` (T8) · `3c8936f0` (T9) · `caaffd5c` (T10).

### Divergence by divergence

**D1 — `size` became a conditional slot field. IMPROVEMENT (from a later spec).**
Spec §2 rule 3: *"Every slot must carry `medium`, `genre`, `size`, `reachable: yes`."* Shipped:
`storyboard.mjs:50` `SIZED_GENRES = ["static", "video"]`, and `checkStoryboard` skips `size`
(`:228`) in favour of `sizeGap` (`:62-71`). A `web` slot closes Gate 2 with no size. This is W4
Task 9 (`031818d2`) overwriting W1's flat rule, and it is correct: R2 says web is a range, not a
fourth size. Both gates carry the rule independently and a dedicated string-for-string comparison
block pins it (`where.test.ts:621-664`). Named as a deliberate move in both files' comments.

**D2 — the hand kept FIVE questions, not four. IMPROVEMENT, contradiction shipped.**
The spec says "four questions" in §1 (row 4), §7 and §7's guard clause. Its own §7 change
description contradicts that: Q4 *splits*, and its editorial half **stays** in the hand. Five is
right — five questions harvest six fields, credit yielding both `credit` and `effectiveDate`. The
implementation shipped five and `exchange-shape.test.ts:51-58` pins five with a stated reason.
**But `exchange.md:37` still heads the movement "four questions", and `:40` and `:97` repeat it**
above a table of five rows. That is a live false statement in the one document the exchange is
driven from. Filed as a hole (H6).

**D3 — the phase table was not replaced by §1's table. UNNOTICED DRIFT, mostly harmless.**
T5 item 4 required `splash/SKILL.md:196-211`'s phase table to *become* §1's fifteen-row table.
Shipped (`SKILL.md:272-280`): the six phases `whereIs` recovers, with G1/G2a/G2b/G2c and G3 folded
in and a stated reason for the fold. Reasonable. Two consequences are not harmless and are filed
below: there is **no PREFLIGHT row** and **no G4** (see M2 and H1).

**D4 — `checkStoryboard`'s docs were half-updated. REGRESSION (a false statement).**
`storyboard.mjs:203` genuinely takes one argument, and the file header (`:8-19`) says so. But
`storyboard/SKILL.md:206-210` still reads *"`groundTakeaway`, the claim-grounding guard
`checkStoryboard` calls when given a profile"* and *"`capabilityGap` … the guard `checkStoryboard`
calls when given `capabilities`"*. T2 item 3 asked for exactly these rows. Nothing in the tree
catches it: `skill-md-matches-code.test.ts` reads the Architecture table's File column and the
Tuning-knobs Where column, not the Files section's prose.

**D5 — the guard T1 promised is not the guard that fires. UNNOTICED DRIFT.**
Spec §3: *"delete `sum` from `profileTable` → case 1 red (falls to `unverifiable`)"*. Measured (M2):
`ground-claim.test.ts` stays **green**; only `intake/test/profile.test.ts` reddens. The reason
is that every `ground-claim.test.ts` fixture hand-builds its column objects (`:50`, `:84-99`) — the
real `profileTable` is never in the loop. See H3: the seam that produced the original defect has no
test at all.

**D6 — the reference-set structure guard reddens by accident. UNNOTICED DRIFT.**
`check-reference-set.mjs:67,75` implements `MIN_STRUCTURE_CHARS = 12` as specified. But blanking a
structure cell in the shipped file (M15) reddens *"should require at least seven references in the
shipped file"* — the row simply stops counting — not a named "this row has no argument structure"
assertion against the shipped file. It goes red, which is what matters; the diagnostic is wrong.

**D7 — `offerForms` grew a `beatDir` requirement beyond the spec. IMPROVEMENT.**
T8 item 4 asked for a throw when `APPROVED.md` is absent. Shipped (`deliver.mjs:156-163`): a
separate, earlier throw when `beatDir` is absent at all, so the check cannot be bypassed by omission.
Both are guarded (M17 reddens on the `beatDir` case first).

**D8 — `formatHandover`'s caveat is optional. MINOR DIVERGENCE, defensible.**
T9 item 4 lists `caveat` among the hand-over's contents; `format-handover.mjs:22` requires only
`genre, placement, alt, credit`. A beat whose `limits` field is genuinely "none" (a legitimate
answer per `exchange.md:82-86`) would otherwise be unable to close. Correct call.

---

## 2. What the spec promises that is NOT in the tree

**M1 — `export/HANDOVER.md` is optional; the spec makes it the phase's closing file.**
`deliver.mjs:309-315`: `withHandover` returns early when the caller passes no `handover` payload, so
`materialise` completes and writes nothing. Every delivery form works without it. The file's own
comment argues the case ("a caller with nothing to hand in has not read the storyboard back") — but
the spec's §1 row 14 makes `export/HANDOVER.md` a **gate-closing file**, not an option, and A11
("delivery must be far clearer: name the files, say where they go, give the advice") is the item it
answers. As shipped, the run that produced A11 would produce it again, silently.

**M2 — G4 does not exist anywhere.**
Spec §1 row 14 names a gate `G4` closing into `export/*` + `export/HANDOVER.md`. Measured:
`where.mjs:299` — `if (exported.length > 0) return { phase: "done", missing: [] }`. Any file in
`export/` ends the story. `SKILL.md:278`'s delivery row carries `—` in the Gate column. There is no
function, no check and no test for G4. (This is not merely cosmetic — see H1.)

**M3 — the PREFLIGHT phase (§1 row 0) has no row in the shipped phase table, and no gate.**
Consistent with D3's fold, and stated there; recorded because §1 promises a phase 0 that closes into
`.env` / `NEWSROOM.md` and nothing recovers or checks that state.

**M4 — the CLOSE phase (§1 row 15) exists only as a never-list bullet.**
`splash/SKILL.md:311-318` carries the rule. There is no phase, and
`stories/<slug>/NOTES-FOR-MAINTAINER.md` is written by nothing in the tree — it is a convention the
model is asked to honour. `formatHandover`'s throw is the only mechanical half, and it guards the
delivered document, not the conversation.

**M5 — the A15 reference row was not found.**
`reference-set.md` holds 7 rows; `reference-set.test.ts:123,143` still floors at 7. The spec
explicitly permitted this outcome (§9: *"If the bar cannot be met, the task ships nothing and the
floor stays 7"*), so this is compliance, not failure — but A15 is open and the FEEDBACK row should
say so.

**M6 — §13's proof was not performed, or left no artifact.**
The spec's proof is three runs (the Heidi.news case re-run end to end, a scrolly run, a
deliberately-closed run) with opened artifacts. There is no `stories/` directory in the tree, no
re-run transcript, no `STORYBOARD.md` showing `grounding: supported` with the aggregate detail, and
no `export/HANDOVER.md` anywhere. `proof/` holds beat renders from W2–W6, not journey runs.
**Every W1 claim about the conversation is therefore backed by unit tests only.** The spec's own
closing line — *"Not 'tests pass': an opened artifact"* — is the standard W1 did not meet.

---

## 3. What was built that the spec did not ask for

Little, and it is mostly good.

- **`sizeGap` / `EXPORT_SIZES` / `SIZED_GENRES` in both gates** (`storyboard.mjs:39-71`,
  `where.mjs:78-94`) and the string-for-string comparison block (`where.test.ts:596-664`). W4's
  work, landing inside W1's files. Correctly attributed in comments; a genuine strengthening of the
  parity guard (the boolean fixtures cannot see two gates refusing for two different reasons).
- **`beatDir` as a required argument to `offerForms`** — D7, an improvement.
- **`ownedFileForInsertion`'s two-file throw** (`deliver.mjs:288-292`). The spec asked for "the
  first extension with exactly one match wins"; the implementation additionally refuses two files at
  the winning extension with an editorial-choice message. Guarded (M18).
- **`recordKey`'s line-break rejection** (`keys.mjs:88-90`) — not asked for, prevents a corrupted
  `.env`.
- **`substituteKeys` / `MAPTILER_DELIVERY_KEY` in `deliver.mjs`** — ruling R1b, W5/W6 territory,
  living in a W1 file. Coherent, attributed.
- **`CMS_KIND` / `CMS_ENDPOINT` / `CMS_TOKEN` added to `KEY_ALIASES`** (uncommitted, concurrent
  installer chantier). Widens `recordKey`'s allow-list beyond the capability rows T6 specified.
  Argued in the file's own header; recorded here only because it changes the surface T6's guard
  covers.

No scope drift of consequence. Nothing here is a shared runtime module, so the method held.

---

## 4. The holes — what neither the spec nor the implementation covers

Ordered by what the journalist actually hits.

### H1 — G3 is defeated by the existence of any file in `export/`. This is A14, reintroduced.

`where.mjs:293-310` checks `exported.length > 0` **before** it checks for unapproved beats. Measured,
in the copy:

```
A) beat 2 rendered, NOT approved, export empty  -> {"phase":"production","missing":["beat 2-b: rendered but not approved"]}
B) beat 2 STILL not approved, export has one file -> {"phase":"done","missing":[]}
```

A two-beat story that delivers beat 1 reports `done` while beat 2 sits rendered and unapproved. T8
built a real per-beat approval gate and then placed it downstream of a story-level short-circuit that
predates it. `where.test.ts:338-390` only ever tests the approval branch with `export/` empty, so the
suite is green. **This is precisely the failure class W1 exists to close** — one reading reporting a
later phase than the check that owns the question — on a new axis.

### H2 — `export/` is story-level and `materialise` wipes it every call.

`deliver.mjs:341` — `rm(exportDir, {recursive:true, force:true})` on every `materialise`.
`where.mjs:293` reads `<storyDir>/export`. `deliver/SKILL.md:48-49` documents the wipe as a
feature (a journalist changing their mind), and nothing anywhere states that `exportDir` should be
per-beat. On a two-beat story delivering into one `export/`, **beat 2's delivery destroys beat 1's
delivered files**. No test covers two beats delivering (`deliver.test.ts:11-17` uses one
`exportDir`). The spec never raises multi-beat delivery at all.

### H3 — the seam that produced A13 has no test.

`groundTakeaway` is only ever exercised against hand-built profile fixtures
(`ground-claim.test.ts:50, 84-99`). `profileTable`'s real output has never been fed to it —
confirmed: no `storyboard` test imports `intake`. The original defect was *systematic on a
real profile* because `profileTable` emits no `rows`, so `checkNumericRanges` was the only check that
ever fired. T1 added `sum` on one side and a `sum` arm on the other and never joined them. M2 shows
the consequence: deleting `sum` from `profileTable` leaves `ground-claim.test.ts` green.

### H4 — nothing says how N claim verdicts collapse into the one `grounding:` scalar.

`groundTakeaway` returns an **array** of claims, each with its own verdict. `grounding:` is a
**single** scalar with a three-value vocabulary. Neither the spec, `exchange.md:27-35`,
`storyboard/SKILL.md:120-145` nor any test states the rule. A real takeaway carrying five
numbers typically returns one `supported` and four `unverifiable` (every bare integer is
range-tested — `NUMBER_RE`, `ground-claim.mjs:47`). Which single word closes G1 is entirely the
model's call, and `supported` is the one that lets it proceed. §4's "a recorded verdict is trusted"
names the general trust; this is the specific, reachable, un-specified decision inside it.

### H5 — the exchange tells the model a size vocabulary the gate refuses.

`exchange.md:138-145` (movement ⑦): *"Portrait, square, or landscape for a static or a video;
**fluid** for a web or a scrolly page"*. Measured:

```
sizeGap(web, fluid)     -> "slot 1: a web beat takes no size — it fills the container it is given"
sizeGap(scrolly, fluid) -> "slot 1: a scrolly beat takes no size — it fills the container it is given"
```

A model that follows the exchange literally and records `size: fluid` on a web slot **cannot close
Gate 2**, and the refusal it gets does not name `fluid` or say to omit the field. The spec caused
this itself (§7 item 2 names `fluid` as vocabulary); W4 Task 9 later made web sizeless without
revisiting the prose. Live, reachable, and it fails in the middle of the journey.

### H6 — the hand movement says four and has five.

`exchange.md:37` / `:40` / `:97` against the five-row table at `:50-56` and
`exchange-shape.test.ts:51-58`, which asserts five. See D2. A model reading the heading, asking four
questions, and leaving one hand field empty is refused by both gates with no explanation of which
question it skipped.

### H7 — `SKILL.md:127` tells the model the Cloudflare capability is "not yet built".

The table row reads *"never — optional, and not yet built: this row is hardcoded closed, never
probed"*. Measured: `preflight.mjs:206-217` probes Cloudflare for real via `probeCloudflare`, carries
a `fill` line, and `deliver.mjs:165-168` offers the `embed` form whenever credentials resolve. A model
reading line 127 tells the journalist a hosted embed is unavailable while `offerForms` would offer it
— a false delivery statement, which is the never-list rule at `SKILL.md:320` broken by the same file
that states it.

### H8 — `recordKey` writes `.env` and nothing reloads it.

T6's flow is *paste a key → `recordKey` → re-probe that one capability*. `recordKey`
(`keys.mjs:79-112`) writes to `<root>/.env`. Every probe reads `env` / `process.env`
(`preflight.mjs:173`, `keys.mjs:55`). **Nothing in the tree parses `.env` into an environment.** A
re-probe in the same session reads the same stale env and reports the same closed capability, unless
the caller happens to also set the variable in-process. Neither the spec nor `SKILL.md:253` mentions
this. There is also now a second opinion about where that file lives — `keys.mjs:92`
(`join(root, ".env")`) against `splash-root.mjs:65-67` (`envPath(startDir)`), from the concurrent
installer chantier.

### H9 — the genre half of the producer table is unguarded.

M7c: pointing `"map/web"` at `map-beat` and `"chart/web"` at `chart-video` leaves
`genre-shippability.test.ts` **completely green** (34 pass, 0 fail). The third assertion
(`:40-45`) proves the producer names *itself* and names the *medium*; nothing proves it produces the
*genre*. Spec §12.2 identified exactly this hole for medium and closed it; the symmetric half was
never noticed. The catalog is declarative (`genre-catalog.mjs:5-6`), so the blast radius is what the
exchange reads and what `SKILL.md:294`'s dispatch table says — but that is the whole point of the
table.

### H10 — `reachable: yes` is written by the conversation and computed by nothing.

`grep -rn "genreGap(\|capabilityGap(\|groundTakeaway(" skills/*/scripts/*.mjs` returns **only the
four definitions** — no runtime caller anywhere. All three are invoked by prose instructions in
`SKILL.md` and `exchange.md`. The spec names this (§4 "What T2 does not close"), so it is disclosed
rather than hidden; it is listed here because the disclosure understates it: `reachable` is not a
*trusted* verdict, it is an *unwritten* one, and the same is true of `grounding`. The convergence T2
achieved is real — neither gate can run a check the other cannot — but what both gates now read is a
field no code ever produces.

### H11 — `image/static` is reachable and its delivery forms describe a chart.

`GENRE_CATALOG` marks `image/static` delivered (`genre-catalog.mjs:43`), routing to
`FORMS_BY_GENRE.static`, whose `owned-file` promises *"a PNG and an SVG"* (`deliver.mjs:32`) and
whose `source-bundle` promises *"this chart's component"* (`:51`). `INSERTION_PREFERENCE.static`
(`:268`) looks for `.svg` then `.png`. An image beat that renders neither gets
`ownedFileForInsertion`'s "nothing matches" throw at the last phase — the exact defect T3's own
header says the pair key exists to prevent. Untested; `deliver.test.ts` has no image fixture.

---

## 5. Two places the spec itself is wrong

Recorded because this project's rule is that any report can be wrong.

1. **"Four questions"** (§1 row 4, §7, §7's guard). The spec's own §7 says Q4 *splits* and its
   editorial half stays. Five is correct; the implementation is right and the spec is not.
2. **"`fluid` for web and scrolly"** (§7 item 2). W4 Task 9 made web and scrolly sizeless. Whichever
   is right, `exchange.md:140` and `sizeGap` must be made to agree (H5).

---

## 6. The mutation ledger

Every mutation applied to a copy at `/private/tmp/.../scratchpad/twin-copy`, run, then reverted from
a pristine snapshot. Baseline in the copy: **1256 pass / 3 fail**, of which 2 are copy artifacts
(git-dependent assertions in a tree with no `.git` — both pass here) and 1 is a concurrent agent's
untracked `proof/portrait-aspect-probe/*.png`. No W1 test is red in this tree.

| # | Guard | Mutation | Result |
|---|---|---|---|
| M1 | `ground-claim.test.ts` | unplaceable number back to `contradicted` | **RED ×3** |
| M2 | `ground-claim.test.ts` | `profileTable` drops `sum` | **GREEN** — reddens only in `profile.test.ts` (D5, H3) |
| M3 | `ground-claim.test.ts` | `AGGREGATE_TOLERANCE` 0.01 → 10 | **RED ×4** |
| M4 | `where.test.ts` | `where.mjs` drops `"grounding"` from `REQUIRED_SCALARS` only | **RED ×7** |
| M5 | `where.test.ts` | `storyboard.mjs` drops `"reachable"` from `REQUIRED_SLOT_FIELDS` only | **RED ×3** |
| M6 | `where.test.ts` | hard-code the fixture list **and** add a fifth scalar to both gates | **RED ×10**, incl. `should generate a fixture for every required field on both sides` **by name** |
| M7 | `genre-shippability.test.ts` | `map/web` → `chart-web` | **RED ×1** |
| M7b | `genre-shippability.test.ts` | `map/scrolly` → `chart-web`; `image/static` → `chart-beat` | **RED ×2** |
| M7c | `genre-shippability.test.ts` | `map/web` → `map-beat`; `chart/web` → `chart-video` | **GREEN — the hole (H9)** |
| M8 | `genre-shippability.test.ts` | drop `scrolly` from `FORMS_BY_GENRE`, keep both catalog rows | **RED ×4** |
| M9 | `type-survey.test.ts` | add a type sheet without regenerating | **RED ×2** |
| M10 | `type-survey.test.ts` | hand-edit a purpose sentence in the generated file | **RED ×1** |
| M11 | `palette.test.ts` | recommend `house` before `subject` | **RED ×1** |
| M11b | `palette.test.ts` | subject option never pushed (house becomes `options[0]`) | **RED ×4** |
| M11c | `palette.test.ts` | `noConventionReason` always `null` | **RED ×2** |
| M12 | `exchange-shape.test.ts` | re-add `"channel and size"` to the hand table | **RED ×1** |
| M13 | `preflight.test.ts` | drop `fill` from the Datawrapper capability row | **RED ×1** |
| M13b | `preflight.test.ts` | `checkNewsroom` stops carrying the parsed `profile` | **RED ×2** |
| M14 | `keys.test.ts` | `recordKey` appends instead of replacing | **RED ×1** |
| M14b | `keys.test.ts` | `recordKey` accepts an arbitrary variable name | **RED ×1** |
| M15 | `reference-set.test.ts` | blank one argument-structure cell in the shipped file | **RED ×1** (via the ≥7 floor — D6) |
| M16 | `where.test.ts` | `whereIs` leaves `production` on a render alone | **RED ×2** |
| M17 | `deliver.test.ts` | `offerForms` stops requiring `APPROVED.md` and `beatDir` | **RED ×3** |
| M18 | `deliver.test.ts` | static insertion preference loses `.svg` | **RED ×2** |
| M19 | `deliver.test.ts` | `materialise` never writes `HANDOVER.md` | **RED ×4** |
| M20 | `format-handover.test.ts` | `refuseMaintainerText` never throws | **RED ×4** |
| M20b | `format-handover.test.ts` | `formatHandover` grows a free-text `notes` field | **RED ×1** |

**25 red, 2 green (M2, M7c).** The two guards this project has been burned by before — a hand-written list
(`helper-parity.test.ts`) and a comparison that does not compare bodies — are both genuinely absent
here: M6 proves the fixture generation is load-bearing and that replacing it with a list reddens by
name, and M11b/M20b prove the palette and hand-over guards test behaviour rather than shape.

`where.test.ts:610-620` records five gate-2c mutations run by the implementer on 2026-08-10 with
their results. Those are **not** re-verified here; M4/M5/M6/M16 are this audit's own, run
independently.

---

## 7. What to do, shortest list

1. **H1** — move the `exported.length > 0` short-circuit below the approval check in
   `where.mjs:293-310`, and add the two-beat fixture to `where.test.ts`. This is a false statement
   about a gate, which is what W1 was for.
2. **H5, H6, H7, D4** — four prose corrections, each currently a false statement to a model or a
   journalist: `exchange.md:140` (`fluid`), `exchange.md:37/40/97` (four → five),
   `splash/SKILL.md:127` (Cloudflare is probed), `storyboard/SKILL.md:206-210`
   (`checkStoryboard` takes one argument).
3. **H3** — one test feeding `profileTable`'s real output to `groundTakeaway`. It is the seam A13
   lived in and it is still untested.
4. **H4** — state the collapse rule for `grounding:` in `exchange.md` and `storyboard/SKILL.md`,
   or make `groundTakeaway` return the scalar.
5. **M1/M2** — decide whether `HANDOVER.md` is optional or is G4. Both are defensible; the tree
   currently claims one and implements the other.
6. **H9** — add the genre assertion to `genre-shippability.test.ts` (the producer's own `SKILL.md`
   description must name the genre, not only the medium). M7c is the mutation that must redden.
7. **§13** — W1 has no run. Until the Heidi.news case is re-run end to end and its `STORYBOARD.md`
   and `export/HANDOVER.md` are opened, every claim about the conversation rests on unit tests.

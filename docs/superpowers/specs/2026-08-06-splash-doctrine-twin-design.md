# Splash — the doctrine twin

**Branch**: `experiment/doctrine-twin` (worktree `../splash-twin`, off `main` @ `7a70237d`).
**Not for merge.** This branch is a twin entity: the same product, built by a different method.
`main` and the twin must never meet, import from each other, or share an install.

**Origin**: Rémy, 2026-08-06. Tom Vaillant shipped `3d-flyover`, `map-explainer` and
`newsroom-chart-animations` — three light skills — and produced the Water Wars video. Splash carries
115,000 lines across nine skills and scores 71/100 on its own audit. The question this branch
answers: **does the light structure produce better work at equal mission?**

---

## 1. What was measured before deciding

Read on 2026-08-06 from `buriedsignals/materials` and `buriedsignals/spotlight`:

- `projects/water-wars/media/` holds **no finished video** — three clips (2.6 MB flyover, 258 KB
  river reveal, **17 KB** chart animation). They are ingredients. Tom scripted, narrated, edited and
  paced the finished piece himself.
- `newsroom-chart-animations/SKILL.md` is **14 KB of prose with zero assets and zero scripts**. It
  mandates a preflight, then reference research (three to six real newsroom examples, exact frames
  pulled with ffmpeg), then a written brief, and only then implementation — inside the project's own
  Remotion codebase.
- Tom verifies with four devices, none of them mechanical: a preflight that refuses to design around
  a missing prerequisite; a render ladder (still → ratios → short clip → full); an eleven-item
  checklist applied **to rendered pixels, never to source**; and anti-workaround rules ("if the
  basemap wavers, switch to the fixed-plate pattern; do not solve it with tile retries").
- Spotlight orchestrates through phases with **readiness criteria**, a **stall protocol**, an
  abstract **verb vocabulary**, and **context recovery from disk** — it never advances because the
  model declared success.

Line counts, same day: Splash `skills/` = 115,000 lines of TS/TSX/MJS excluding `node_modules`
(`chart-native` alone is 54,555 across 389 files) plus 197 doc files. Tom's three skills ≈ 1,200
lines of TSX and scripts, plus ~2,000 lines of prose.

### The diagnosis this design acts on

1. Splash froze taste into 41 parameterised types. The model can only fill a config, so the ceiling
   of every output is whatever the component author anticipated.
2. Splash applies abstract rules and never looks at a concrete exemplar of the piece being made.
   Rules produce compliance; references produce quality. Every guard proves the **absence of a
   defect**; nothing proves the **presence of quality**. 23/23 green and boring is reachable.
3. Splash builds the general case first. Roughly 80% of what makes a graphic good is
   story-specific.

---

## 2. Mission and non-mission

**Same mission as `main`**: a newsroom with no data or graphics team brings its article, and gets a
finished, owned visual. Splash orchestrates production; it never writes the text, never invents the
data, never supplies editorial intent.

**Different method**: doctrine plus bespoke code plus a reference loop, instead of a registry of
parameterised types.

Tom's model does not serve this mission unchanged — his preflight starts with "locate the Remotion
project root", and an unequipped newsroom has none. The twin closes that seam with a workspace it
installs once (§5).

### Non-goals for v1

No conformance engine and no N-check gate. No type registry and no mechanically pinned
`VisualFormat`. No judge harness. No hosted deployment (delivery is owned files, plus the embed when
the producer is Datawrapper). No tested multi-runtime port (the verb vocabulary prepares it; only
Claude Code is validated). No TTS or synthetic voice. No MIT release.

---

## 3. The model — three objects

**The Splash root** — installed once, in a folder the journalist picks. Dependencies, verified keys,
and `NEWSROOM.md` (name, URL, language, house palette, ground, typefaces).

**The story workspace** — `stories/<slug>/` inside the root. One per article: frozen source, the
storyboard, the bespoke components of *this* story, its renders, its export.

**The beat** — one visual unit with **one thing to prove**. Two orthogonal axes: a *medium*
(`chart` · `map` · `image` · `terrain`) and a *genre* (`static` · `interactive` · `video`). A beat is
always standalone and deliverable on its own.

**Scrolly is a vehicle, not a medium.** It carries one beat that steps, or several beats of
different media in sequence. `main` modelled this correctly and the twin keeps it — but `main`'s
scrolly could only drive the map renderer, so the heterogeneous scrolly (a map step, then a chart
step, then a photo step) is a real capability gain, not a relabelling.

### The storyboard is the contract

An ordered list of **slots**. Each slot carries **one to n candidate treatments**. Each candidate
declares: the claim it proves, its data, the evidence hierarchy, the reveal order, the single
accent, the source.

One object covers every case:

| Situation | Shape |
|---|---|
| The journalist wants one visual | One slot, three candidates — the same takeaway as a trajectory, as a comparison, as a map. They keep one. |
| The journalist wants a sequence | N slots, one candidate each, ordered. |
| Mixed | Three slots, the second hesitating between two treatments. |

Gate 2 always reads the same: *for each slot, which one do you keep — or do you drop the slot?*

**Nothing is produced outside the storyboard.**

---

## 4. The journey

| Phase | What happens | Gate |
|---|---|---|
| 0 · Preflight | Root, dependencies, **probed** keys, `NEWSROOM.md`. Missing → ask. Nothing is worked around. | blocking, silent when green |
| 1 · Intake | Article and data frozen and profiled. Silent. | — |
| 2 · Framing | Intent, **confirmed takeaway (verbatim)**, channel, language. | G1 |
| 3 · Storyboard | Restitution, the journalist's hand, **the reference loop**, slots and candidates. | G2 |
| 4 · Production | Beat by beat. The craft skill writes **bespoke** code. Render ladder, pixel checklist, turn budget, stall. | G3 per beat, on the render |
| 5 · Assembly | Video only for the montage vehicle; the scroll vehicle for web. Skipped when the storyboard holds one standalone beat. | G4 |
| 6 · Delivery | Per beat, the forms its genre allows; the journalist chooses; only that one is materialised. | — |

The phase skeleton is close to `main`'s. What differs is inside phases 3 and 4: the proposal becomes
a researched, multi-slot storyboard, and production writes code instead of filling a config. This is
stated plainly so nobody mistakes the skeleton for the novelty.

### Assembly — two vehicles, never a medium

| Vehicle | Assembles | Editing contract |
|---|---|---|
| **Montage** | `video` beats | a named, Studio-editable timing track (`establish` · `camera` · `elementReveals` · `boundaries` · `fills` · `labels` · `hold`) |
| **Scroll** | 1..n `static`/`interactive` beats, media mixed | a step storyboard, one beat per step |

The montage renders a complete, watchable **silent** mp4. The twin does not pretend to know the
pacing of a narrated piece — it makes the pacing adjustable. The journalist lays their voice over it
or retimes it without touching code.

### What Spotlight contributes, and what it does not

Adopted: gates that close **into a file**; a per-beat turn budget with a stall protocol; **state
recovered from disk** so a session resuming three days later reads the workspace and knows exactly
where it stands; an abstract verb vocabulary (`read-file`, `write-file`, `execute-shell`, `search`,
`fetch`, `invoke-skill`) used in skill prose so the twin can leave Claude Code without a rewrite.

Not adopted: the formal 13-verb registry, the JSON schema suite, the agent manifests. That is the
apparatus of autonomous multi-agent orchestration; here a human sits at every gate.

---

## 5. The Splash root

The skill installs into the runtime. The root is the journalist's own folder, created once by the
preflight.

```
<splash-root>/
├── NEWSROOM.md              # name, url, language, house palette, ground, typefaces
├── .env                     # keys
├── package.json / bun.lock  # ONE install for the whole root
├── shared/
│   ├── geometry/            # pure functions only (~500 lines)
│   └── tokens.ts            # derived from NEWSROOM.md
└── stories/<slug>/
    ├── STORYBOARD.md        # the validated editorial contract
    ├── source/              # frozen article · frozen data · profile
    ├── beats/<n>-<slug>/
    │   ├── BRIEF.md         # written BEFORE any code
    │   ├── <Component>.tsx  # bespoke, this story only
    │   ├── data.json
    │   └── renders/         # stills · clips · mp4 · png · html
    ├── montage/             # when the video is composed
    └── export/              # the chosen form
```

**The preflight works nothing around.** A missing key is asked for. A **present** key is
**probed with a real call** — this is precisely the failure blocking `main` today: the MapTiler key
is present and has returned 403 since 2026-08-06, and a presence check would have reported green.
A missing `NEWSROOM.md` is built, measuring the newsroom's own site when the journalist does not
know their own charter (knowledge inherited from `newsroom-charter`).

---

## 6. Skill inventory — twelve skills, all prose-first

### Orchestration and editorial layer

| Skill | Role |
|---|---|
| `twin` | Phases, gates, dispatch. Nothing else. Split from the start — `main`'s orchestrator reached 1,571 lines before it had to be broken into six. |
| `intake` | Phase 1. Freeze and profile the article and the data. Silent. |
| `storyboard` | Phases 2–3. The editorial exchange, the confirmed takeaway, **the reference loop**, slots and candidates, the per-beat brief. The genuinely new part. |
| `deliver` | Phase 6. Forms per beat, the choice, lazy materialisation. |

### Doctrine — never invoked alone, read by every production skill

| Skill | Role |
|---|---|
| `doctrine` | The Tom-shaped document: editorial standard · information architecture · visual system · motion grammar · anti-patterns · **a named reference set with timecodes and the transferable lesson**. The highest-leverage artifact of this branch. |

### Production — one skill per craft, never per type

| Skill | Media × genres | Seed |
|---|---|---|
| `chart-beat` | chart × static · interactive · video | one component rewritten from `chart-native`, plus Tom's chart doctrine |
| `map-beat` | map × static · interactive · video | one component rewritten from `map-native`, plus `RiverReveal` / `CountryLabel` |
| `flyover-beat` | terrain × video | `CesiumFlythrough`, integrated as-is |
| `dw-beat` | Datawrapper chart/map × static · embed | the `dw-chart` mapper — the only thin one; rendering is delegated |
| `image-beat` | photographs / satellite × static · steps | rewritten from `image-native` |

### Assembly

| Skill | Role |
|---|---|
| `montage` | Remotion composition plus the editable timing track. New — nothing in `main`. |
| `scroll` | Scroll scaffold assembling n heterogeneous beats. Seed: `Scrolly.tsx`. |

### Anatomy of a production skill

```
skills/<id>/
├── SKILL.md          # 8 sections: Overview · When to use · gotcha · Architecture ·
│                     # How it works · Quick start · Tuning knobs (each one a number) · Files
├── references/
│   ├── *.md          # the hard-won knowledge, as prose
│   └── types/*.md    # ONE SHEET PER TYPE — this is where the 41 types survive
├── scripts/*.mjs     # deterministic prep, dependency-free
└── assets/
    ├── <Component>.tsx   # ONE seed, marked "replace me, do not parameterise me"
    ├── geometry/         # pure functions only
    ├── sample-data/
    └── preview.png
```

### The three floors — where the knowledge actually survives

1. **The seed teaches the mechanics, not the subject.** `RiverReveal` does not cover "river maps";
   it shows how a map beat is wired — layers, frame gating, imperative per-frame updates, HTML label
   projection. The chart seed shows the shape: pure geometry core → frame and furniture derived from
   `themeBg` → direct annotation → reveal order.
2. **`references/types/*.md` carries the 41 types, as prose.** One short sheet per type: when it
   serves, the geometry rule, the labelling rule, the reveal order on video, the anti-patterns. This
   was already `main`'s "knowledge at two grains" decision (global + per type) — the mistake was
   applying it to components when it describes knowledge. **All sheets ship in v1; this is
   harvesting, not writing.** It is what lets the model write a correct boxplot with no
   `BoxplotChart.tsx` in existence.
3. **`geometry/` holds pure functions and nothing else.** Sankey layout, treemap squarify, beeswarm
   collision, binning, cartogram projection, `lineSliceAlong`. Data → coordinates. The one piece of
   the engine that earns survival, and `main` already proved it ("one pure geometry core → three
   outputs"). The boundary is testable: **if a function knows a colour, a label or a font size, it is
   not geometry and does not belong here.**

Everything else — rendering, frame, labels, annotations, reveal — is bespoke, every time, under
doctrine plus the type sheet.

### What `references/*.md` inherits from Splash

Experience without the engine:

- contrast: escalation to the pure pole on the mid-grey band, `labelInkOnFill`, WCAG threshold vs
  Datawrapper's YIQ
- **measured** gutters rather than fixed (`endLabelGutterPx`, `leftLabelGutterPx`) and the four real
  clips they uncovered
- map-video anti-hang: idle-or-bounded-settle, and antimeridian bounds by shortest arc
- the fixed map plate for any camera move, **and the rule not to work around it with tile retries**
- deriving all furniture from an arbitrary `themeBg`
- RFC4180 CSV, furniture i18n, `preserveDrawingBuffer` / `--gl=angle` / frame gating
- the verification lessons: grepping a bundle is invalid, read the rendered PNG; the judge can lie;
  verify what was delivered, not the proof

### The count

Twelve `SKILL.md` plus references ≈ **3,000 lines of prose** (type sheets included), ~6 seed
components ≈ **2,000 lines of TSX**, ~**500 lines of pure geometry**. Against 115,000 lines in
`main`, for a wider spectrum (heterogeneous scrolly, video montage).

---

## 7. The editorial exchange

The governing principle: **propose, do not interrogate.** Reacting is easy; inventing is hard. A
journalist on deadline does not fill in a questionnaire.

### ① Restitution

Before any question, give back what was read: the claims in the article that could become visual,
ordered by strength. *"Here is what I read in your piece."* The journalist corrects. This catches
misreadings immediately instead of opening with a volley of questions about a text that may have
been misunderstood.

### ② The confirmed takeaway — G1

One non-skippable question: *if the reader keeps one sentence from this visual, which one?*
Confirmed **verbatim** and written into `STORYBOARD.md`. It is the only anchor that later makes a
drifting title detectable — `main`'s most recurrent failure.

### ③ The journalist's hand — five questions, each with a destination

| The question, as asked | What it harvests | Where it lands |
|---|---|---|
| *"In this data, who is the subject of your piece?"* | the subject, which the data does not designate — the maximum is not the subject | **the single semantic accent.** Real `main` bug: a scatter labelled its max-y instead of the subject |
| *"What does the reader compare it to — last year, the average, the announced target, the next town?"* | the editorially meaningful reference point | baseline, second series, annotation. A number alone says nothing |
| *"What does this data NOT let you conclude?"* | the boundary the journalist knows and the data never states (sample, correlation vs causation, scope) | the anti-overclaim check on the title, and what an annotation is allowed to assert |
| *"Which paragraph does this visual follow — and what does the text already say next to it?"* | what is already written | **do not duplicate** (if the axis carries `2024`, the callout gives the value, not the year). Also feeds channel and size |
| *"How do you credit it, and as of what date?"* | the house convention and the effective date | the visible source line, and traceability |

Asked one at a time. Every answer has a destination; none is disguised parameter collection.

### ④ The reference loop, shown — the new part

Find two or three real newsroom treatments of **the same argument structure** and show them: *"the
FT treated this class of argument this way, the NYT that way — the first foregrounds the trajectory,
the second the comparison."* The journalist picks or rejects.

It is the only point in the journey where taste travels both ways: the model gains a concrete target
instead of an abstract rule, and the journalist gains vocabulary for saying what they want. **This
is quality lever number one, identified in Tom's skills.**

The named reference set ships in `doctrine`; live research is run when the argument structure is new
to the set — which is exactly Tom's rule ("before coding a substantial chart or establishing a new
chart family").

### ⑤ The storyboard proposal — G2

Slots and candidates, presented **as readable narrative, not a table of specs**: what each proves,
its medium, its genre, its vehicle if any, and one line of why. The journalist drops, reorders,
adds, vetoes. Then it is written.

### ⑥ The beat brief

`BRIEF.md` before any code: evidence hierarchy, reveal order, single accent, source, the
anti-patterns of this case. Derived from the five previous steps, so never conjured from nowhere.

### Discipline of the exchange — our failures, as rules

- One question at a time. Never a questionnaire.
- Always carry a recommendation. Never make someone choose in a vacuum.
- Never ask the same question twice — repetition is a bug, not caution.
- **Silence is not consent.** A proposal waits for an answer.
- The journalist's language governs the entire exchange, errors and recaps included.
- **Never write in their place**: not the title, not the takeaway, not the caption, not the source,
  without validation. Editorial intent never leaves the journalist.
- A gate closes **into a file**, not into the conversation.

---

## 8. The production loop, per beat

1. **Beat preflight** — the type-check or the composition listing **before** implementing. A missing
   prerequisite is recorded, not designed around.
2. **`BRIEF.md` written.** No brief, no code.
3. **Bespoke implementation**, under doctrine plus the type sheet.
4. **Render ladder** — middle still → every requested ratio at real output size → short clip (video)
   → full render. **Never climb a rung without having looked at the previous one.**
5. **Checklist applied to the pixels** — never to the source, never to the bundle.
6. Failure → one targeted cycle, cause named. **Budget: 3 turns.**
7. Exhausted → **stall**: hand back with the gaps named and what was tried. Never a self-declared
   win, never a workaround.
8. **G3** — the journalist sees the render.

### The checklist

Tom's eleven — honest scale · source-traceable values · visible source and unit · no overclaim · no
duplicated label · one semantic accent · axes that survive compression · reveal aligned with the
narration · readable final hold · static background · renders of actually registered compositions —
plus four our own failures earned:

- contrast measured **on the real background**, not on an assumed white
- alt text present (WCAG 1.1.1)
- no language leak: the render speaks the journalist's language
- **the FINAL still of the mp4**, not only a middle frame

---

## 9. Isolation from `main`

Rémy's constraint: the two must never meet, mix, or influence each other. Mechanically:

- Build under `twin/` while harvesting seeds, sheets and references from `skills/`; a final commit
  removes `skills/` so the branch tree **is** the twin.
- Harvesting is **read-and-rewrite**, never a copy that keeps a link. No twin import points at
  `skills/` — and once `skills/` is gone that is mechanically impossible.
- The twin never writes into an existing Splash root. Its root is distinct; its `NEWSROOM.md` is its
  own.
- The public product name stays *Splash*. **Skill ids are distinct**, otherwise the two overwrite
  each other in `~/.claude/skills` at install time — which is exactly the entanglement being
  refused. Two entities, two id sets, one public name.

---

## 10. How this gets decided

Otherwise we end with two entities and no decision.

**Replay three cases already run through `main`** — one static chart, one map video, one scrolly —
on the twin, and compare **on the render, side by side, by eye**. Plus the honest cost: turns,
wall-clock, tokens.

The twin wins if it is better by eye at comparable cost. It loses if it costs three times as much
for the same thing. That verdict is a separate session with Rémy in front of the renders; nothing in
this branch decides it on its own.

---

## 11. Build order — this spec is too large for one plan

Twelve skills is not one implementation plan. It decomposes into sub-projects, each with its own
plan and its own green end state. Only SP1 is planned now.

| # | Sub-project | Proves |
|---|---|---|
| **SP1** | **The spine.** Preflight and root, `intake`, `storyboard` (all six steps of the exchange), a skeleton `doctrine`, `chart-beat` limited to the `static` genre, `deliver`. | The method end to end on one real article: an article goes in, a bespoke static chart comes out, every gate closes into a file. If the method is wrong, it is wrong here — before any breadth is built. |
| SP2 | Harvest: all type sheets, the shared `geometry/` extraction, the full `doctrine` with its named reference set. | The knowledge survived the engine. |
| SP3 | `map-beat` (static, interactive, video) and `flyover-beat` integration. | The map craft, and Tom's skills integrated rather than imitated. |
| SP4 | The `video` genre for `chart-beat`, then `montage` with its editable timing track. | Water Wars' terrain — the direct comparison. |
| SP5 | `scroll` with heterogeneous beats, and `image-beat`. | The capability `main` never had. |
| SP6 | `dw-beat`. | The thin path still exists. |
| SP7 | The replay of §10 and the verdict. | Whether the twin earns its existence. |

SP1 is deliberately narrow: one medium, one genre, no assembly, no video. The point is to find out
whether bespoke-under-doctrine beats parameterised-registry on a single static chart, because that
is the cheapest place to be proven wrong.

# Restoring the Tom canon in the twin's skills

**Status:** design, approved to write 2026-08-08.
**Branch:** `experiment/doctrine-twin`, worktree `/Users/rmdms/Sites/Professional/splash-twin`.
**Scope:** the nine skills under `twin/skills/`. No new craft capability. No new genre.

---

## 1. Why this exists

The twin's whole premise is that Tom Vaillant's light, self-contained skill structure produces
better work than a parameterised registry. That premise only means something if the twin's own
skills actually follow the structure. This spec measures the gap and closes it.

The binding definition is the one already recorded in `twin/HANDOVER.md` §3:

```
skills/<id>/
├── SKILL.md          8 sections: Overview · When to use · gotcha · Architecture ·
│                     How it works · Quick start · Tuning knobs (each a number) · Files
├── references/*.md   the hard-won knowledge, as prose
├── scripts/*.mjs     deterministic, dependency-free ESM
└── assets/           ONE seed marked "REPLACE ME. Do not parameterise me."
                      + sample-data + preview
```

Plus the project convention of an `output-proof`, and the ruling in §6:

> No cross-skill imports at RUNTIME. A TEST may import across skills for the sole purpose of
> asserting two implementations agree.

---

## 2. What was measured

Measured 2026-08-08 against the nine skills at commit `a60bfb7e`.

### 2.1 SKILL.md — compliant

All nine carry all eight sections. **Nothing to do.** This is the part of the canon the twin has
held onto best, and the spec records it so a later reader does not re-audit it.

### 2.2 assets/ — one skill compliant out of four craft skills

| skill | seed marker | sample-data | preview |
|---|---|---|---|
| `twin-chart-beat` | `ChartSeed.tsx` — "REPLACE ME. Do not parameterise me." | yes | `preview.png` |
| `twin-chart-web` | **none** | **none** | **none** |
| `twin-chart-video` | `EmissionsVideo.tsx` — "REPLACE ME per story" | **none** | **none** |
| `twin-map-beat` | `Co2MapStill.tsx` + `Co2MapVideo.tsx` — two markers | **none** | **none** |

The five non-craft skills (`splash-twin`, `twin-intake`, `twin-storyboard`, `twin-doctrine`,
`twin-deliver`) ship no component and are **not** expected to carry a seed. Tom's own
`newsroom-chart-animations` has zero assets and zero scripts; the canon does not require a seed
where there is nothing to seed. They are out of scope for §2.2.

### 2.3 Runtime cross-skill imports — nine, in shipped code

```
twin-chart-video/scripts/render-video.mjs:20          → twin-chart-beat/scripts/render-still.mjs
twin-chart-video/scripts/render-migration.mjs:14      → idem
twin-chart-video/scripts/render-life-expectancy.mjs:15 → idem
twin-chart-web/scripts/render-web.mjs:23              → idem
twin-map-beat/scripts/render-map.mjs:28               → idem
twin-map-beat/assets/Co2MapStill.tsx:21               → idem
twin-map-beat/assets/timing.ts:11,17,21               → twin-chart-video/assets/timing
```

The only exceptions the twin documents are two test-only reads
(`splash-twin/test/where.test.ts`, `splash-twin/test/root-template-shared.test.ts`). These nine are
runtime. `twin-chart-beat` has become a shared library without a decision being taken.

### 2.4 `wrap()` — the same algorithm, copied three times, unguarded

`proof/EmissionsLine.tsx:53`, `twin-chart-web/assets/EmissionsWeb.tsx:107`,
`twin-chart-video/assets/EmissionsVideo.tsx:86`. Identical loop, identical condition, identical
return. The differences are a variable name (`line` / `current`) and whether `measure` is a
parameter or a closure. `measureText` exists twice the same way.

Three copies is not itself a defect in this architecture — self-containment is bought with
duplication on purpose. **The defect is that nothing makes them disagree loudly.** Two components
that claim to lay out the same title can wrap it differently and no test would notice.

### 2.5 output-proof — absent from all nine

The project convention (`CLAUDE.md`) lists `output-proof` in the skill-autonomous format. No skill
has one. Evidence exists in abundance under `twin/proof/`, but not under the name or the location
the convention gives.

---

## 3. The one judgement call, and how this spec decides it

**Is a skill allowed more than one component in `assets/`?**

The canon says ONE seed. Against that:

- `twin-chart-video`'s `SKILL.md:41` documents its three components as *one seed plus two worked
  examples of adapting it* — a deliberate, written choice, not drift.
- `twin-map-beat` ships two genres (static, video) and carries one marked seed for each.
- Meanwhile `HANDOVER.md` §3 says a story's beat components live in
  `stories/<slug>/beats/<n>-<name>/`, and the static genre already obeys this:
  `proof/EmissionsLine.tsx` sits beside its own `BRIEF.md` and `STORYBOARD.md`.

So the same files are serving two roles at once: teaching the genre's mechanics, and being the CO₂
story's artifacts.

**Decision.** One seed per **genre the skill ships**, not per skill. `twin-map-beat` keeping a
static seed and a video seed is compliant; `twin-chart-video` keeping three chart-video components
is not — one is the seed, the other two are story artifacts.

**Rationale.** The canon's "ONE" defends against a skill accumulating a catalogue — which is the
registry it exists to avoid. It does not defend against a skill covering two genres. The test that
distinguishes them: *does this second component teach a different mechanism, or a different
story?* Static vs video is a different mechanism. CO₂ vs migration is a different story.

**Consequence.** `LifeExpectancyVideo.tsx` and `MigrationVideo.tsx` (with their timing files) leave
`twin-chart-video/assets/` and become story artifacts. They are not deleted — their evidence value
is real and `COMPARISON.md` cites their renders.

---

## 4. What this spec deliberately does NOT do

**No shared library. No `shared/beat-kit/`. No extraction of the common furniture mechanism into a
module the skills import.**

This was the first design considered and it is rejected, because the twin has already decided the
question and written the reasoning into
`skills/splash-twin/test/root-template-shared.test.ts`:

> vendoring means a physical copy, not a symlink […] or a workspace dependency (which would require
> the journalist's root to be a member of this repository's workspace […]) — exactly what the gap
> is about.

A skill that imports a shared kit stops being copy-pasteable on its own, which is the property
`TRIAL-THREE-BEATS.md` was written to prove. Deduplication here would buy fewer lines at the cost
of the canon. **Duplication stays; disagreement becomes loud.**

Likewise out of scope: reducing the ~1184 lines a single beat costs across three genres. That cost
is the architecture working as designed, and this spec records it as a deliberate price rather
than leaving it as an unexamined one.

---

## 5. The design

### 5.1 `twin-chart-web` — bring it up to canon

The freshest skill and the furthest from the canon: no seed marker, no sample-data, no preview.

- Write `assets/ChartWebSeed.tsx` — a seed that teaches **the web genre's mechanics**: SSR of two
  pre-rendered layouts, build-time `tabIndex`/`aria-label` on every reading, a nearest-point hit
  area, the no-JS frame surviving intact. It must NOT be the CO₂ story. Marked, verbatim:
  `REPLACE ME. Do not parameterise me.`
- `assets/sample-data/` — the smallest series that exercises the mechanics.
- `assets/preview.png` — rendered from the seed and the sample data, by the skill's own script.
- `EmissionsWeb.tsx` becomes a story artifact (§5.4).

### 5.2 `twin-chart-video` — one seed, two artifacts out

- `EmissionsVideo.tsx` stays as the seed; its marker is upgraded to the canon's verbatim wording.
- `LifeExpectancyVideo.tsx`, `MigrationVideo.tsx`, `life-expectancy-timing.ts`,
  `migration-timing.ts` move to story workspaces (§5.4).
- `Root.tsx` keeps registering only the seed's composition; the moved beats register in their own
  story workspace.
- Add `assets/sample-data/` + `assets/preview.png` (a still extracted from the seed's own render —
  never a hand-picked frame, per the lesson that a review still does not prove a mechanism).

### 5.3 `twin-map-beat` — two genres, two seeds, canon wording

- `Co2MapStill.tsx` and `Co2MapVideo.tsx` stay, one seed per genre, markers upgraded to the canon's
  verbatim wording and stating which genre each seeds.
- Add `assets/sample-data/` + `assets/preview.png`.
- The story-specific CO₂ framing inside them is what a journalist replaces; the SKILL.md Files
  section must say so per file.

### 5.4 Story artifacts get a home

Moved components go to `proof/<story-slug>/`, beside a `BRIEF.md`, matching the layout
`HANDOVER.md` §3 prescribes (`stories/<slug>/beats/<n>-<name>/`). `proof/` is this repository's
stand-in for a Splash root's `stories/`; the spec does not invent a new location.

Three slugs, named here so the plan has no choice to make:

| slug | what moves into it |
|---|---|
| `co2-suisse` | `EmissionsWeb.tsx` (from `twin-chart-web`), and the existing `proof/EmissionsLine.tsx`, `proof/crossing-geometry.ts`, `proof/BRIEF.md`, `proof/STORYBOARD.md`, `proof/co2-suisse-still.png` |
| `life-expectancy` | `LifeExpectancyVideo.tsx` + `life-expectancy-timing.ts` |
| `migration` | `MigrationVideo.tsx` + `migration-timing.ts` |

`EmissionsLine.tsx` and its neighbours move too. They sit loose at `proof/`'s root today, which was
right when there was one story and is wrong now that there are three — leaving them would make
`proof/` mean both "the CO₂ story" and "all stories" at once. `proof/comparison/`, `proof/trial/`
and `proof/seance/` are evidence about the experiment rather than story artifacts and stay where
they are.

`EmissionsVideo.tsx` is the exception that does not move: §5.2 keeps it as `twin-chart-video`'s
seed. The CO₂ story therefore has a beat whose component lives in a skill. That is the cost of
having the seed be a real, proven beat rather than a toy, and the spec accepts it explicitly rather
than discovering it later.

Every importer follows the move: render scripts, `Root.tsx` registrations, tests, and the
`SKILL.md` Files and Tuning-knobs tables that cite them by path.

### 5.5 The nine runtime imports

Two mechanisms, in this order:

1. **Most disappear with §5.4.** The imports in `Co2MapStill.tsx` and in the three video render
   scripts exist because story artifacts reached for `twin-chart-beat`. Once they live in a story
   workspace, a story importing the craft mechanism is not a cross-skill import at all.
2. **What survives is vendored.** Any skill still needing `deriveFurniture` / `measureText` carries
   its own copy under its own `scripts/`, exactly as the root template already vendors them. A
   parity test asserts the copies agree.

`twin-map-beat/assets/timing.ts` → `twin-chart-video/assets/timing` is the one import that is
skill-to-skill on its own merits. It gets a vendored copy plus parity, not a shared module.

### 5.6 The parity test

One new test file, importing across skills — the use §6 explicitly sanctions.

- Feeds a shared fixture set (long words, no spaces, exact-fit boundary, empty string, single word
  wider than `maxWidth`, multi-space runs) to every `wrap()` implementation and asserts all outputs
  are identical.
- Same for every `measureText` copy.
- Same for every vendored `deriveFurniture`.

It asserts **agreement**, never a particular value — the same contract
`root-template-shared.test.ts` states for byte-identity, applied behaviourally because the
signatures differ.

### 5.7 `output-proof`

Each of the four craft skills gets an `output-proof/` holding the artifact its own seed produces
from its own sample data, regenerated by the skill's script — not a curated best case, and not a
render borrowed from a story.

The five non-craft skills do not get one, for the same reason they do not get a seed: an
`output-proof` proves that a skill's own mechanism produces its own artifact, and `twin-intake`,
`twin-storyboard`, `twin-doctrine`, `twin-deliver` and `splash-twin` produce files and decisions
whose correctness their test suites already assert. §2.5 reads "absent from all nine" as a
measurement; this section narrows it to the four where it means something.

---

## 6. Verification

Each item is proven by running something, not by reading a diff.

| What | How it is proven |
|---|---|
| Seeds teach mechanics, not a story | The seed renders from `sample-data` alone, with no story file present |
| `preview.png` is real | Regenerated by the skill's script and byte-compared to the committed file |
| Moves are complete | `grep` for each moved symbol returns zero hits under `skills/` |
| No runtime cross-skill imports | A test greps `skills/*/{scripts,assets}` for cross-skill paths and fails on any hit — excluding `test/` |
| Parity test is not vacuous | **Mutation:** change one `wrap()` copy's condition to `>=`, confirm the test goes RED, revert |
| Suite still green | `cd twin && bun test` — 382 tests today, must not regress |

The mutation step is mandatory, not optional. The project's own record is that ~30 real defects
were caught this way and that a green suite proves nothing on its own.

---

## 7. Risks

- **Remotion registration is the fragile part.** `Root.tsx` binds compositions to components; a
  move that misses a registration produces a skill whose video path silently renders the wrong
  beat. Verified by rendering one still per registered composition after the move.
- **SKILL.md tuning-knob tables cite file paths** (`MigrationVideo.tsx`'s `calloutX`, etc.). A move
  that does not update them leaves documentation pointing at nothing — the failure mode is a
  reader, not a test, so the grep check in §6 covers `.md` too.
- **Writing three new seeds is writing new code**, and the twin's rule is that a seed is written
  from scratch rather than harvested from the engine. It applies here too: a seed harvested by
  stripping the CO₂ story would carry that story's shape and teach it by accident.

## 8. Open, deliberately not decided here

- Whether `proof/` should be renamed `stories/` to match `HANDOVER.md` §3's vocabulary. Cosmetic,
  touches many paths, and orthogonal to the canon. Deferred.
- The §5 doctrine debts (sparse ticks still wrong for motion; the baked comparison value costing
  vertical resolution). Unrelated to structure.

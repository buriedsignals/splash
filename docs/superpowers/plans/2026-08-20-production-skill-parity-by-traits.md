# Production-skill parity by traits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rule reaches the skills it applies to because of what those skills ARE, never because someone typed their names — so a fix made in one place cannot fail to reach its siblings, and a rule cannot land where it is irrelevant.

**Architecture:** Each producing skill declares its own `TRAITS.json`, and every declared trait is proved by a witness read off that skill's files. Each catalogue rule declares the TRAITS it requires instead of the skills it reaches; the reachable set is computed. The existing parity test gains three invariants on top of the two it has, and keeps refusing debt.

**Tech Stack:** Bun, `bun:test`, plain `.mjs` under `scripts/`, JSON catalogues, puppeteer-core for the capability detectors that must read a delivered artefact.

**Spec:** `docs/superpowers/specs/2026-08-20-production-skill-parity-by-traits-design.md`

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, and is watched failing.
- Code, comments, identifiers, file names, commit messages: **English**. No vendor attribution in any artefact.
- Every mechanism added is **mutation-checked** before it lands: reintroduce what it forbids, watch it go red, restore. A guard that was never seen red is not landed.
- **No cross-skill runtime imports.** The copy-plus-parity pattern stays; this plan changes how a rule finds its skills, not how code is shared. A shared code core was designed and REJECTED — see the spec's "What this is not" before proposing one again.
- A capability detector reads the **delivered artefact**, never the source. A rule whose detector can only grep source is a `discipline`, not a `capability`.
- **DECISION THAT DEVIATES FROM THE SPEC, taken on measurement.** The spec proposes renaming `guard-catalogue.json` → `rule-catalogue.json`, `scripts/guards.mjs` → `rules.mjs`, `GUARDS.md` → `RULES.md`, `guards:check` → `rules:check`. Measured: those names are referenced by **20 files, including `.github/workflows/ci.yml`**, and the rename buys nothing mechanical. This plan **keeps every existing name** and extends the mechanism in place. The catalogue's top-level key becomes `rules` (the file keeps its name); `GUARDS.md` gains sections for the new kinds. If the owner wants the rename, it is a separate mechanical task after this plan lands.
- **This work belongs on its own branch**, off `main` after `fix/scrolly-cargo-guards` merges. It touches the render path of every producing skill.

---

## File structure

| file | responsibility |
| --- | --- |
| `skills/<skill>/TRAITS.json` (×8, new) | what that skill IS — a list of trait ids and nothing else |
| `scripts/traits.mjs` (new) | read every skill's traits; prove each one against its witness; expose `traitsOf(skill)`, `witnessFor(trait, skill)`, `PRODUCING_SKILLS` |
| `skills/doctrine/test/traits.test.ts` (new) | the witness test: a declared trait the files contradict fails, in both directions |
| `skills/doctrine/references/guard-catalogue.json` (modify) | `guards` → `rules`; each rule gains `kind` and `requires`; `formats` → `states`; `unreachable` → `exceptions` |
| `scripts/guards.mjs` (modify) | add `reachable(rule)`, `owedRows` over the derived set, render the new sections |
| `skills/doctrine/test/guard-parity.test.ts` (modify) | the three new invariants, on top of the two that exist |
| `GUARDS.md` (generated) | one matrix per kind, the owed list, the argued-blank list, the traits table |
| `AGENTS.md` (modify) | the norm, beside the release baseline |
| `skills/<skill>/scripts/detect-*.mjs` (new, one per capability) | the detector that reads that skill's delivered artefact |

---

### Task 1: Traits, and the witness that stops a skill lying about itself

**Files:**
- Create: `skills/chart-beat/TRAITS.json`, `skills/chart-web/TRAITS.json`, `skills/chart-video/TRAITS.json`, `skills/dw-beat/TRAITS.json`, `skills/map-beat/TRAITS.json`, `skills/map-web/TRAITS.json`, `skills/image-beat/TRAITS.json`, `skills/scrolly/TRAITS.json`
- Create: `scripts/traits.mjs`
- Create: `skills/doctrine/test/traits.test.ts`

**Interfaces:**
- Produces: `TRAITS` — the vocabulary, `{ id, witness(skillDir) → boolean, describes }[]`; `traitsOf(skill) → string[]` (declared); `provenTraits(skill) → string[]` (witnessed); `PRODUCING_SKILLS` re-exported from `scripts/guards.mjs` so there is one list.

- [ ] **Step 1: Write the failing test**

```ts
// skills/doctrine/test/traits.test.ts
/**
 * A TRAIT IS A CLAIM ABOUT A SKILL'S OWN FILES, AND THIS IS WHAT MAKES IT ONE.
 *
 * The catalogue used to reach skills by name, and a rule written on Tuesday reached whichever skills
 * were typed into it on Tuesday. `map-beat` ships the video genre and carries a timing contract, and
 * `reveal-completes` — written the previous evening — never reached it, because nobody typed it.
 *
 * Traits fix that only if a trait cannot be claimed or dropped at will. Each one is proved against
 * the skill's own files: claiming `bakes-a-plate` without a `bake-plate.mjs` fails, and — the
 * direction that matters — DROPPING a trait whose witness is still there fails too, because the
 * cheapest way out of a red cell would otherwise be to stop admitting what the skill is.
 */
import { describe, expect, it } from "bun:test";
import { PRODUCING_SKILLS, TRAITS, provenTraits, traitsOf } from "../../../scripts/traits.mjs";

describe("every producing skill declares what it is", () => {
  it("names only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const skill of PRODUCING_SKILLS)
      for (const id of traitsOf(skill)) expect([...known]).toContain(id);
  });

  it("claims no trait its own files contradict", () => {
    for (const skill of PRODUCING_SKILLS) {
      const proven = new Set(provenTraits(skill));
      const unproven = traitsOf(skill).filter((id) => !proven.has(id));
      expect(`${skill} claims unproven: ${unproven.join(", ")}`).toBe(`${skill} claims unproven: `);
    }
  });

  it("drops no trait its own files still prove — the escape hatch this closes", () => {
    for (const skill of PRODUCING_SKILLS) {
      const declared = new Set(traitsOf(skill));
      const hidden = provenTraits(skill).filter((id) => !declared.has(id));
      expect(`${skill} hides: ${hidden.join(", ")}`).toBe(`${skill} hides: `);
    }
  });

  it("gives every trait in the vocabulary a describing line a reader can disagree with", () => {
    for (const trait of TRAITS) {
      expect(trait.id).toMatch(/^[a-z][a-z-]+$/);
      expect(trait.describes.length).toBeGreaterThan(30);
    }
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/doctrine/test/traits.test.ts`
Expected: FAIL — `Cannot find module '../../../scripts/traits.mjs'`.

- [ ] **Step 3: Write the vocabulary and its witnesses**

```js
// scripts/traits.mjs
// WHAT A SKILL IS, read off its own files.
//
// The catalogue reaches skills through these, never by name. A trait is a MECHANISM the skill has —
// not the work it does, not the family it belongs to — because a defect is reachable wherever its
// mechanism is. `plate-follows-theme` reaches a baked plate and a delegated export alike: two
// families, one trait, which is the pairing a family table cannot express.
//
// Each trait carries a WITNESS: a check against the skill's own directory. The witness is what makes
// a trait a claim rather than an opinion, and it is checked in both directions — see
// `doctrine/test/traits.test.ts`.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export { PRODUCING_SKILLS } from "./guards.mjs";

const skillDir = (skill) => join(ROOT, "skills", skill);

/** Every `.mjs` and `.ts`/`.tsx` under a skill's `scripts/` and `assets/`, as text. */
function sources(skill) {
  const out = [];
  for (const sub of ["scripts", "assets"]) {
    const dir = join(skillDir(skill), sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
      out.push(readFileSync(join(dir, name), "utf8"));
    }
  }
  return out;
}

const has = (skill, relative) => existsSync(join(skillDir(skill), relative));
const anySource = (skill, pattern) => sources(skill).some((text) => pattern.test(text));

export const TRAITS = [
  {
    id: "draws-own-geometry",
    describes: "the skill writes the marks it renders, rather than fetching a picture of them",
    witness: (skill) => has(skill, "scripts/render-still.mjs"),
  },
  {
    id: "bakes-a-plate",
    describes: "it bakes a basemap raster and the frame its marks were projected into, side by side",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs"),
  },
  {
    id: "projects-geography",
    describes: "it resolves a camera and projects coordinates into a frame's pixels",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs"),
  },
  {
    id: "delegates-rendering",
    describes: "the delivered artefact is produced by a provider and fetched, never drawn here",
    witness: (skill) => anySource(skill, /api\.datawrapper\.de|exportChartPng/),
  },
  {
    id: "owns-a-surface-it-did-not-choose",
    describes: "the ground its marks land on is baked or returned, so its luminance is not the beat's own decision",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs") || anySource(skill, /exportChartPng/),
  },
  {
    id: "timed-build-that-ends",
    describes: "it renders a build against a frame count with a last frame a reader stops on",
    witness: (skill) => has(skill, "assets/timing.ts"),
  },
  {
    id: "reader-driven-reveal",
    describes: "the reader's own gesture drives how much of the picture is shown",
    witness: (skill) => anySource(skill, /data-progress/),
  },
  {
    id: "ships-standalone-html",
    describes: "it writes an HTML file a reader opens with no server and no build",
    witness: (skill) => anySource(skill, /\.html\b/),
  },
  {
    id: "inlines-its-assets",
    describes: "it embeds its own images or fonts into the delivered file as data URIs",
    witness: (skill) => anySource(skill, /data:image|data:font|base64/),
  },
  {
    id: "embeds-reader-photos",
    describes: "the evidence it carries is the journalist's own photographs, not a drawing",
    witness: (skill) => anySource(skill, /manifest\.json/) && has(skill, "scripts/build-sample-photo.mjs"),
  },
];

export function traitsOf(skill) {
  const path = join(skillDir(skill), "TRAITS.json");
  if (!existsSync(path)) return [];
  const record = JSON.parse(readFileSync(path, "utf8"));
  return record.traits ?? [];
}

export function provenTraits(skill) {
  return TRAITS.filter((trait) => trait.witness(skill)).map((trait) => trait.id);
}
```

- [ ] **Step 4: Write the eight `TRAITS.json`, from what the witnesses actually prove**

Do NOT type them from intuition. Run this once and write what it reports:

```bash
bun -e 'import {PRODUCING_SKILLS, provenTraits} from "./scripts/traits.mjs";
for (const s of PRODUCING_SKILLS) console.log(s, JSON.stringify(provenTraits(s)));'
```

Each file has this shape, and the comment is not decoration — it is what a reader of the skill needs:

```json
{
  "$comment": "What this skill IS, and therefore which catalogue rules reach it. Read by scripts/traits.mjs, proved against this skill's own files by doctrine/test/traits.test.ts, and joined to the rules by doctrine/test/guard-parity.test.ts. Removing a trait to escape a rule fails: the witness is still there.",
  "traits": ["draws-own-geometry", "..."]
}
```

- [ ] **Step 5: Run the test to watch it pass**

Run: `bun test skills/doctrine/test/traits.test.ts`
Expected: PASS, four assertions.

- [ ] **Step 6: Mutation-check both directions**

1. Add `"bakes-a-plate"` to `skills/chart-beat/TRAITS.json` → expect *"chart-beat claims unproven: bakes-a-plate"*. Restore.
2. Remove `"timed-build-that-ends"` from `skills/map-beat/TRAITS.json` → expect *"map-beat hides: timed-build-that-ends"*. Restore.
3. Rename `skills/map-web/scripts/bake-plate.mjs` to `bake-plate.mjs.bak` → expect *"map-web claims unproven: bakes-a-plate, projects-geography, owns-a-surface-it-did-not-choose"*. Restore.

Record the three messages in the commit body.

- [ ] **Step 7: Commit**

```bash
git add scripts/traits.mjs skills/*/TRAITS.json skills/doctrine/test/traits.test.ts
git commit -m "feat(doctrine): a skill declares what it is, and its own files prove it"
```

---

### Task 2: Rules reach skills through traits, not through names

**Files:**
- Modify: `skills/doctrine/references/guard-catalogue.json`
- Modify: `scripts/guards.mjs`
- Modify: `skills/doctrine/test/guard-parity.test.ts`

**Interfaces:**
- Consumes: `traitsOf(skill)` from Task 1.
- Produces: `reachable(rule) → string[]` (skills whose declared traits contain every id in `rule.requires`, sorted); `owedRows(catalogue) → [{ rule, skill }]` computed over the derived set; `strayRows(catalogue) → [{ rule, skill }]` (a state or exception naming a skill outside the derived set); `unstatedRows(catalogue) → [{ rule, skill }]` (a derived skill with no state and no exception).

**The migration, rule by rule.** Each existing guard gets `kind: "guard"` and the `requires` below. These
are derived from the defect each one names, not from the skills that carry it today — which is the
point, and which is why three of them change who they reach:

| rule | `requires` | reaches, and what changes |
| --- | --- | --- |
| `duplicated-payload` | `inlines-its-assets` | chart-web, map-beat, map-web, image-beat, scrolly — **map-beat is new** |
| `projection-pairing` | `ships-standalone-html`, `inlines-its-assets`, `reader-driven-reveal` | scrolly only — the two 2026-08-19 retirements become non-derivations, so their prose moves from `exceptions` into the rule's `earnedBy` where it belongs |
| `plate-geometry-pairing` | `bakes-a-plate` | map-beat, map-web, scrolly — **scrolly is new** |
| `plate-follows-theme` | `owns-a-surface-it-did-not-choose` | map-beat, map-web, scrolly, dw-beat — unchanged |
| `screen-space-dash` | `draws-own-geometry` | every skill but dw-beat — **image-beat is new** |
| `reached-mark-declares` | `reader-driven-reveal` | scrolly — unchanged |
| `step-redraws` | `reader-driven-reveal` | scrolly — unchanged |
| `scrub-not-slideshow` | `reader-driven-reveal` | scrolly — unchanged |
| `model-declared` | `reader-driven-reveal` | scrolly — unchanged |
| `reveal-completes` | `timed-build-that-ends` | chart-video, map-beat — **map-beat is new** |

Those four new cells are a PREDICTION made from the witnesses on 2026-08-20. Step 5 runs the
derivation and records what it actually reports; if it disagrees with this table, the table is
wrong and the measurement wins.

- [ ] **Step 1: Write the failing test**

```ts
// appended to skills/doctrine/test/guard-parity.test.ts
import { reachable, strayRows, unstatedRows } from "../../../scripts/guards.mjs";
import { traitsOf } from "../../../scripts/traits.mjs";

describe("a rule reaches skills through what they are", () => {
  it("requires at least one trait, and only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const rule of readCatalogue().rules) {
      expect(rule.requires.length).toBeGreaterThan(0);
      for (const id of rule.requires) expect([...known]).toContain(id);
    }
  });

  it("derives the reachable set rather than reading a list of skills", () => {
    for (const rule of readCatalogue().rules)
      for (const skill of reachable(rule))
        for (const id of rule.requires) expect(traitsOf(skill)).toContain(id);
  });

  it("names no skill outside the set its traits derive", () => {
    expect(strayRows(readCatalogue())).toEqual([]);
  });

  it("leaves no derived skill without a state or an exception", () => {
    expect(unstatedRows(readCatalogue())).toEqual([]);
  });

  it("declares a kind the mechanism knows how to confirm", () => {
    for (const rule of readCatalogue().rules)
      expect(["guard", "capability", "discipline"]).toContain(rule.kind);
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/doctrine/test/guard-parity.test.ts`
Expected: FAIL — `reachable` is not exported, and `readCatalogue().rules` is `undefined` (the key is still `guards`).

- [ ] **Step 3: Add the derivation to `scripts/guards.mjs`**

```js
import { traitsOf } from "./traits.mjs";

/** The skills a rule reaches: those whose declared traits contain every trait it requires.
 *
 *  COMPUTED, NEVER TYPED. The hand-typed version of this shipped on 2026-08-19 and had already
 *  failed by the next morning: `reveal-completes` named `chart-video` because that is the skill
 *  someone was working in, while `map-beat` — same timing contract, six video beats on disk — was
 *  not named and therefore owed nothing. A set nobody derives is a set nobody notices. */
export function reachable(rule) {
  return PRODUCING_SKILLS.filter((skill) => {
    const traits = traitsOf(skill);
    return rule.requires.every((id) => traits.includes(id));
  }).sort();
}

/** A state or an exception written against a skill the rule does not reach — the anti-noise
 *  invariant. A cartographic rule cannot be written onto a chart skill even by hand. */
export function strayRows(catalogue) {
  return catalogue.rules.flatMap((rule) => {
    const derived = new Set(reachable(rule));
    return [...Object.keys(rule.states ?? {}), ...Object.keys(rule.exceptions ?? {})]
      .filter((skill) => !derived.has(skill))
      .map((skill) => ({ rule: rule.id, skill }));
  });
}

/** A skill the rule reaches and which says nothing at all — neither carried, nor owed, nor excepted.
 *  This is the invariant that makes a fix impossible to leave behind: the day a skill has the trait,
 *  the cell exists. */
export function unstatedRows(catalogue) {
  return catalogue.rules.flatMap((rule) =>
    reachable(rule)
      .filter((skill) => !(skill in (rule.states ?? {})) && !(skill in (rule.exceptions ?? {})))
      .map((skill) => ({ rule: rule.id, skill })),
  );
}
```

Then update `owedRows` to read `catalogue.rules` and `rule.states`, and `carriedBy` stays as it is.

- [ ] **Step 4: Migrate the catalogue**

`guards` → `rules`; each entry gains `"kind": "guard"` and its `"requires"` from the table above;
`formats` → `states`; `unreachable` → `exceptions`. `decidedBy`, `refuses`, `earnedBy`,
`alsoReachedBy` keep their names and their prose.

- [ ] **Step 5: Run the derivation and record what it says**

```bash
bun -e 'import {readCatalogue, reachable, unstatedRows} from "./scripts/guards.mjs";
const c = readCatalogue();
for (const r of c.rules) console.log(r.id.padEnd(24), reachable(r).join(", "));
console.log("\nUNSTATED (the work list):"); for (const row of unstatedRows(c)) console.log(" ", row.rule, "×", row.skill);'
```

**Write the output into this plan, under Task 4.** It is the work list, and it is a measurement — the
prediction table above is not allowed to stand in for it.

- [ ] **Step 6: Make the suite green WITHOUT closing any cell**

Every newly derived cell gets `"owed"` in `states`. `owedRows()` is therefore non-empty and the debt
assertion from `7957cdb0` goes red — **that is correct and it is the point of this task**. Mark that
one assertion `it.todo` with a comment naming Task 4 as what un-todos it, so the rest of the suite
still runs. Nothing else may be weakened.

- [ ] **Step 7: Mutation-check the three new invariants**

1. Add `"chart-beat": "carried"` to `plate-follows-theme`'s `states` → expect `strayRows` to report it.
2. Delete `map-web` from `plate-geometry-pairing`'s `states` → expect `unstatedRows` to report it.
3. Set `requires: []` on any rule → expect *"requires at least one trait"*.

- [ ] **Step 8: Commit**

```bash
git add skills/doctrine scripts/guards.mjs
git commit -m "feat(doctrine): a rule declares the traits it needs, and the reachable set is derived"
```

---

### Task 3: The generated state, and the norm

**Files:**
- Modify: `scripts/guards.mjs` (`renderGuardsDoc`)
- Modify: `GUARDS.md` (generated)
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the failing test**

```ts
// appended to skills/doctrine/test/guard-parity.test.ts
describe("the generated state says what a reader needs", () => {
  const doc = renderGuardsDoc(readCatalogue());

  it("prints one matrix per kind that has rules", () => {
    for (const kind of new Set(readCatalogue().rules.map((rule) => rule.kind)))
      expect(doc).toContain(`## ${kind}`);
  });

  it("prints the traits table, so a reader sees WHY a rule reaches a skill", () => {
    expect(doc).toContain("## What each skill is");
    for (const skill of PRODUCING_SKILLS) expect(doc).toContain(skill);
  });

  it("says out loud that a discipline is not mechanically verified", () => {
    expect(doc).toContain("not mechanically verified");
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/doctrine/test/guard-parity.test.ts`
Expected: FAIL — the document has one matrix and no traits table.

- [ ] **Step 3: Extend `renderGuardsDoc`**

One matrix per `kind`, in the order `guard`, `capability`, `discipline`; the owed list; the exceptions
list with their reasons; then `## What each skill is` — a table of skills × traits — and under the
discipline matrix, verbatim:

```
Disciplines are checked for PRESENCE where an author reads them, and are not mechanically verified.
```

- [ ] **Step 4: Regenerate and run**

Run: `bun scripts/guards.mjs --write && bun run guards:check && bun test skills/doctrine`
Expected: the document rewritten, the check green, the suite green except the `it.todo` debt assertion.

- [ ] **Step 5: Write the norm into `AGENTS.md`**

Replace the paragraph added on 2026-08-20 beside the release baseline with the spec's four sentences,
verbatim from the spec's "The norm" section.

- [ ] **Step 6: Commit**

```bash
git add scripts/guards.mjs GUARDS.md AGENTS.md skills/doctrine
git commit -m "docs(doctrine): the generated state shows what each skill is, and the norm says why"
```

---

### Task 4: Close the cells the derivation opened

**Files:** one producing skill per cell; `skills/doctrine/references/guard-catalogue.json` for the flip.

**This task has no fixed content, and that is deliberate.** Its work list is Task 2 Step 5's output,
recorded here before any of it is done. The prediction from 2026-08-20 is four cells —
`duplicated-payload` × `map-beat`, `plate-geometry-pairing` × `scrolly`, `screen-space-dash` ×
`image-beat`, `reveal-completes` × `map-beat` — and the derivation is what decides.

For **each** cell, in this order, one commit per cell:

- [ ] **Step 1: Write the failing test** in the skill's own `test/`, in the shape its neighbour already
  uses: the decision function against this format's own shape, then the walking test over every beat
  of that format on disk, with a count floor so a reader that goes quiet fails instead of passing.
- [ ] **Step 2: Run it to watch it fail.**
- [ ] **Step 3: Copy the decision** into the skill's verification script with its doc comment intact,
  and add its name to that script's `GUARDS` array. Add the new copy to `COPIES` in
  `skills/splash/test/guard-copies-parity.test.ts` — the copies test refuses a decision carried by two
  skills and listed in neither.
- [ ] **Step 4: Run to watch it pass, and run the driver over every beat of the format on disk.**
  Record the numbers in the commit body. If it finds a real defect, fix the defect in its own commit
  first, and **look at the render** before and after.
- [ ] **Step 5: Mutation-check** — reintroduce the defect in one real beat, watch the named red,
  restore.
- [ ] **Step 6: Flip the cell** from `owed` to `carried`, regenerate `GUARDS.md`, commit.

**If a cell turns out not to apply**, it becomes an `exception` with a MEASURED reason — a count, a
file, a number — never an argument from intuition. `screen-space-dash` × `image-beat` is the likely
one: an image beat draws a letterbox frame around a photograph and may carry no marks at all. Measure
before writing that.

- [ ] **Step 7: Un-todo the debt assertion**

When `owedRows()` is empty again, restore the assertion Task 2 Step 6 marked `it.todo` and delete the
comment pointing here.

```bash
git commit -m "feat(doctrine): the derived cells are closed, and the debt assertion is live again"
```

---

### Task 5: The first capability, written in full as the pattern

**Files:**
- Create: `skills/chart-web/scripts/detect-accessible-table.mjs`
- Create: `skills/chart-web/test/accessible-table.test.ts`
- Modify: `skills/doctrine/references/guard-catalogue.json`
- Modify: `skills/chart-web/SKILL.md`

`map-web` gives a reader with no spatial access to the map an opt-in table carrying the same facts.
`chart-web` gives nothing, and a chart is exactly as unreadable to a screen reader. The trait both
share is `ships-standalone-html`.

**Interfaces:**
- Produces: `tableCarriesTheMarks(html) → { rows, marks, missing }` — a pure decision over a delivered
  page: how many data rows the table has, how many marks the graphic draws, and the DETAIL STRINGS
  present in the graphic and absent from the table.

**Measured before writing this, and it changes the detector.** A `chart-web` page's marks already
carry `tabindex="0"`, `role="img"`, an `aria-label` and a `data-detail` holding the full fact —
`data-detail="1950 · 68.9 years"`, 104 of them on one page. So the format is ALREADY reachable by
keyboard and already announces each mark; what it has no way to give is the whole set **read
linearly**, without visiting 104 marks one at a time. The detector therefore compares the table
against `data-detail`, which is the exact string the reader gets on hover — so the table cannot drift
from the picture, and a capability that looked like "add ARIA" turns out to be "gather what is
already there".

- [ ] **Step 1: Write the failing test**

```ts
// skills/chart-web/test/accessible-table.test.ts
/**
 * THE SAME FACTS, FOR A READER WHO CANNOT SEE THE PICTURE.
 *
 * `map-web` ships this and `chart-web` does not, which is the asymmetry the trait model surfaced:
 * both `ship-standalone-html`, so both are reachable, and one of them owed it.
 *
 * A GREP WOULD PROVE NOTHING. `role="table"` in the source says a table element exists; it does not
 * say the table carries the beat's own numbers. This decides over the DELIVERED page, and it
 * compares the table's cells against the marks' own values, so a table of the wrong data fails
 * exactly as loudly as no table at all.
 */
import { describe, expect, it } from "bun:test";
import { tableCarriesTheMarks } from "../scripts/detect-accessible-table.mjs";

describe("an accessible table carries the marks' own values", () => {
  const page = (table: string) =>
    `<svg><circle data-detail="1950 · 68.9 years"/><circle data-detail="1951 · 68.7 years"/></svg>${table}`;

  it("accepts a table holding every fact the graphic announces", () => {
    const found = tableCarriesTheMarks(
      page(
        `<table><tr><td>1950 · 68.9 years</td></tr><tr><td>1951 · 68.7 years</td></tr></table>`,
      ),
    );
    expect(found.missing).toEqual([]);
    expect(found).toMatchObject({ rows: 2, marks: 2 });
  });

  it("refuses a table of the wrong facts as firmly as no table at all", () => {
    expect(tableCarriesTheMarks(page(`<table><tr><td>1066 · nothing</td></tr></table>`)).missing)
      .toEqual(["1950 · 68.9 years", "1951 · 68.7 years"]);
    expect(tableCarriesTheMarks(page("")).missing).toEqual([
      "1950 · 68.9 years",
      "1951 · 68.7 years",
    ]);
  });

  it("says nothing about a page whose marks announce nothing", () => {
    expect(tableCarriesTheMarks("<svg><path d='M0 0'/></svg>")).toMatchObject({ marks: 0 });
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/chart-web/test/accessible-table.test.ts`
Expected: FAIL — `Cannot find module '../scripts/detect-accessible-table.mjs'`.

- [ ] **Step 3: Write the detector**

```js
// skills/chart-web/scripts/detect-accessible-table.mjs
/** The values a delivered page's marks carry, against the values its table carries.
 *
 *  Reads the ARTEFACT, never the component: a `role="table"` in source proves an element exists and
 *  says nothing about what is in it. A mark announces its own fact in `data-detail` — measured on
 *  2026-08-20, 104 of them on one delivered page — which is the exact string the reader gets on
 *  hover, so the table is checked against the picture's own words and cannot drift from them. */
export function tableCarriesTheMarks(html) {
  const values = [...html.matchAll(/data-detail="([^"]+)"/g)].map((match) => match[1]);
  const table = /<table[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  const cells = [...table.matchAll(/<t[dh][^>]*>([^<]*)<\/t[dh]>/g)].map((match) => match[1].trim());
  const rows = (table.match(/<tr\b/g) ?? []).length;
  return { rows, marks: values.length, missing: values.filter((value) => !cells.includes(value)) };
}
```

- [ ] **Step 4: Run to watch it pass**

Run: `bun test skills/chart-web/test/accessible-table.test.ts`
Expected: PASS.

- [ ] **Step 5: Run it over every chart-web page on disk, and record what it finds**

```bash
bun -e 'import {readFileSync} from "node:fs";
import {tableCarriesTheMarks} from "./skills/chart-web/scripts/detect-accessible-table.mjs";
import {globSync} from "node:fs";
for (const file of globSync("proof/*/[a-z]*.html"))
  console.log(file, JSON.stringify(tableCarriesTheMarks(readFileSync(file, "utf8"))));'
```

Expected on 2026-08-20's tree: every chart-web page reports `rows: 0` and a non-empty `missing`. That
is the debt this capability names, and closing it is Step 6.

- [ ] **Step 6: Add the table to the seed, then to every beat**

The seed first (`skills/chart-web/assets/`), because that is what a future beat is written from: an
opt-in `<table>` after the graphic, holding one row per mark, each cell carrying that mark's own
`data-detail` string, visually hidden until focused. Then re-render each beat and re-run Step 5 until
`missing` is empty everywhere. **Open one page and tab to the table before claiming it works.**

- [ ] **Step 7: Declare the rule**

```json
{
  "id": "same-facts-without-the-picture",
  "kind": "capability",
  "requires": ["ships-standalone-html"],
  "offers": "a reader who cannot see the graphic gets the same values, in a table carrying the marks' own numbers",
  "earnedBy": "map-web shipped an opt-in accessible table from its first version while chart-web shipped none, on the same trait: a chart is exactly as unreadable to a screen reader as a map, and nothing said so",
  "detectedBy": "tableCarriesTheMarks",
  "states": {}
}
```

Fill `states` from `reachable()`, not by hand. Every derived skill is `owed` until its own detector
passes.

- [ ] **Step 8: Mutation-check**

Delete one row from one delivered page's table → the walking test names that file and the missing
value. Restore.

- [ ] **Step 9: Commit**

```bash
git add skills/chart-web skills/doctrine GUARDS.md
git commit -m "feat(chart-web): the same facts reach a reader who cannot see the picture"
```

---

### Task 6: The remaining capabilities, one task each

Same nine steps as Task 5, one commit per capability. What must NOT be invented is the detector's
signature — each is fixed here, and each reads a delivered artefact:

| capability | `requires` | detector | reads |
| --- | --- | --- | --- |
| `honours-reduced-motion` | `ships-standalone-html` | `motionUnderReduce(page) → { movedFrames, totalFrames }` | the page driven twice, once under `prefers-reduced-motion: reduce`, exactly as `verify-scrolly.mjs:1013` already drives it |
| `reachable-by-keyboard` | `ships-standalone-html` | `keyboardReachesEveryMark(page) → { marks, focusable, detailShown }` | `Tab` through the delivered page, asserting the detail hover gives. **Measured 2026-08-20: `chart-web` marks already carry `tabindex="0"`, `role="img"` and an `aria-label`, so this cell may already be carried there — the detector decides, and no work is done on a cell that is already green** |
| `degrades-without-javascript` | `ships-standalone-html` | `staticFrameSurvives(page) → { marksWithJs, marksWithout }` | the page loaded with JavaScript disabled |
| `weight-has-a-ceiling` | `inlines-its-assets` | `weightAgainstCeiling(bytes, ceiling) → { bytes, ceiling, over }` | the delivered file's own size |
| `every-photo-says-what-it-shows` | `embeds-reader-photos` | `photosDeclareAltAndCredit(html) → { photos, missingAlt, missingCredit }` | the delivered file |

`weight-has-a-ceiling` is the one to do first: `image-beat` already has `checkWeight`, so it is a copy
with a test rather than a new mechanism, and it proves the pipeline end to end on the cheapest cell.

---

### Task 7: Disciplines, and the honesty about what they are

**Files:** `skills/doctrine/references/guard-catalogue.json`, `scripts/guards.mjs`

A discipline is a prose rule a skill must have WRITTEN where an author reads it. `writtenIn` names the
rule id that must appear in the skill's `SKILL.md` or under its `references/`; the check is presence
and nothing more, and the generated document says so.

- [ ] **Step 1: Write the failing test** — `disciplineIsWritten(skill, ruleId) → boolean`, reading the
  skill's `SKILL.md` and `references/*.md` for the id.
- [ ] **Step 2: Run it to watch it fail.**
- [ ] **Step 3: Declare the first three disciplines** — the cartographic rules (`requires:
  ["projects-geography"]`), the motion grammar (`requires: ["timed-build-that-ends"]`), the static
  discipline (`requires: ["draws-own-geometry"]`). Each names the reference document that carries it.
- [ ] **Step 4: Run to watch it pass**, filling the gaps by writing the rule id into the skills that
  reach it and do not name it.
- [ ] **Step 5: Mutation-check** — remove the id from one skill's `SKILL.md`, watch the named red.
- [ ] **Step 6: Commit.**

---

## Self-review

**Spec coverage.** Traits + witnesses → Task 1. Rules with `requires` and the derivation → Task 2.
Invariants 1, 3 → Task 2; invariant 2 (a `carried` state its detector does not confirm) → Task 5 Step
7 for capabilities and the existing `carriedBy` check for guards; invariant 4 (an exception without a
measured reason) → already landed on 2026-08-20 and unchanged; invariant 5 (no owed cell) → Task 4
Step 7. Generated state → Task 3. The norm → Task 3 Step 5. The sweep's five steps → Tasks 1-3
(mechanism), 4 (guards), 5-6 (capabilities), 7 (disciplines). Mutation strategy → a step in every
task.

**The rename.** The spec proposes renaming four things; this plan keeps the names and says why in the
Global Constraints, with the measurement (20 files, CI included). That is a deliberate, visible
deviation, not an omission.

**Placeholders.** Task 4 has no fixed content BY DESIGN — its work list is a measurement taken in Task
2 Step 5 and written into Task 4 before any of it starts. Task 6 gives each capability's detector
signature and points at Task 5's nine steps rather than repeating them six times; the thing an
executor must not invent — the signature — is fixed in the table.

**Type consistency.** `traitsOf(skill)`, `provenTraits(skill)`, `reachable(rule)`, `strayRows`,
`unstatedRows`, `owedRows`, `carriedBy`, `tableCarriesTheMarks(html)` — these names are used
identically in every task that mentions them, and `states` / `exceptions` / `requires` / `kind` are
the catalogue's field names throughout.

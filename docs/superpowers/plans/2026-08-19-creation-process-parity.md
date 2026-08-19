# Creation-process parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No producing skill is weaker than its neighbour: every guard this project has earned is written down once, declared for the formats it can reach, and carried by each of them — with a test that names the gaps instead of leaving them to memory.

**Architecture:** A catalogue file in `doctrine` lists each guard, the defect that earned it, the formats it is reachable in, and whether each format `carries` or `owes` it. A generator turns the catalogue into `GUARDS.md` (the readable state) and a parity test enforces the two invariants that can be enforced today: a cell claiming `carried` must really be carried, and a guard present in any skill must appear in the catalogue. Guards themselves are pure decision functions, copied per skill with their own unit tests — never imported across skills, which this tree forbids.

**Tech Stack:** Bun, `bun:test`, puppeteer-core (drivers), plain `.mjs` scripts inside each skill.

**Spec:** `docs/superpowers/specs/2026-08-19-creation-process-parity-design.md`

## Global Constraints

- Runtime is **Bun**. Tests are `bun:test`. TDD: the failing test comes first, and is watched failing.
- **No cross-skill imports.** A guard reaching a second skill is COPIED there with its own tests; the parity test is what keeps copies honest. This is the tree's existing rule (`AGENTS.md`, "Keep skills self-contained").
- Code, comments, identifiers, commit messages: **English**. No vendor attribution in any artefact.
- Every guard is a PURE function over MEASUREMENTS, in the shape `skills/scrolly/scripts/verify-scrolly.mjs` already uses; browser work stays in the driver so the decision is testable without Chrome.
- Every guard added is **mutation-checked**: reintroduce the defect, watch the guard go red, restore. A guard that was never seen red is not landed.
- Read the picture **from the DOM, never from a screenshot**: `page.screenshot` serves a stale compositor surface on this machine (`scrolly-discipline.md`, "A step that does not redraw is not a step").

---

### Task 1: The catalogue, its generated state, and the parity test

**Files:**
- Create: `skills/doctrine/references/guard-catalogue.json`
- Create: `skills/doctrine/references/guard-catalogue.md`
- Create: `scripts/guards.mjs`
- Create: `GUARDS.md` (generated)
- Test: `skills/doctrine/test/guard-parity.test.ts`

**Interfaces:**
- Produces: `readCatalogue()` → `{ guards: Guard[] }` where `Guard = { id, refuses, earnedBy, decidedBy, formats: Record<skill, "carried" | "owed"> }`; `carriedBy(skill)` → guard ids a skill's scripts actually export; `owedRows(catalogue)` → `[{ guard, skill }]`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/doctrine/test/guard-parity.test.ts
import { describe, expect, it } from "bun:test";
import { carriedBy, readCatalogue, owedRows } from "../../../scripts/guards.mjs";

describe("the guard catalogue", () => {
  it("names, for every guard, what it refuses and the defect that earned it", () => {
    for (const guard of readCatalogue().guards) {
      expect(guard.refuses.length).toBeGreaterThan(20);
      expect(guard.earnedBy.length).toBeGreaterThan(20);
      expect(guard.decidedBy).toMatch(/^[a-zA-Z]+$/);
    }
  });

  // The invariant that can be enforced today: a cell that CLAIMS a guard must really carry it.
  // An `owed` cell is debt, printed in GUARDS.md, not a failure — a permanently red suite teaches
  // a reader to ignore it.
  it("carries every guard it claims to carry", () => {
    const catalogue = readCatalogue();
    for (const guard of catalogue.guards)
      for (const [skill, state] of Object.entries(guard.formats))
        if (state === "carried")
          expect(carriedBy(skill)).toContain(guard.decidedBy);
  });

  // The other direction, and the one that stops the catalogue rotting: a guard written into a skill
  // and never declared is a rule nobody else will ever inherit.
  it("declares every guard any skill already carries", () => {
    const declared = new Set(readCatalogue().guards.map((g) => g.decidedBy));
    for (const skill of ["scrolly", "chart-web", "map-web", "chart-video", "map-beat", "chart-beat", "image-beat", "dw-beat"])
      for (const fn of carriedBy(skill)) expect(declared).toContain(fn);
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/doctrine/test/guard-parity.test.ts`
Expected: FAIL — `Cannot find module '../../../scripts/guards.mjs'`.

- [ ] **Step 3: Write the catalogue with the eight guards that exist today**

`skills/doctrine/references/guard-catalogue.json`, one entry per guard. Fill `formats` from the spec's
table — `carried` only for `scrolly`, `owed` for every other reachable cell, and omit a skill entirely
where the defect is not reachable.

```json
{
  "guards": [
    {
      "id": "duplicated-payload",
      "decidedBy": "duplicatedPayload",
      "refuses": "an asset inlined more than once into a self-contained delivered file",
      "earnedBy": "a delivered route scrolly carried the same 340 KiB basemap plate five times, 1.33 MB of a 1.80 MB page",
      "formats": { "scrolly": "carried", "chart-web": "owed", "map-web": "owed", "image-beat": "owed" }
    },
    {
      "id": "projection-pairing",
      "decidedBy": "projectionDisagreements",
      "refuses": "a raster plate and the overlay drawn on it fitting differently — cover pairs with slice, contain with meet, fill with none",
      "earnedBy": "at 375x812 a plate cropped under an overlay that letterboxed drew Lisbon over Switzerland",
      "formats": { "scrolly": "carried", "map-beat": "owed", "map-web": "owed" }
    },
    {
      "id": "plate-follows-theme",
      "decidedBy": "plateFollowsGround",
      "refuses": "a baked plate on the opposite luminance side from the ground the beat declares",
      "earnedBy": "a beat declared ground #16191B and white labels over a dataviz-light plate: correct furniture, unreadable",
      "formats": { "scrolly": "carried", "map-beat": "owed", "map-web": "owed" }
    },
    {
      "id": "screen-space-dash",
      "decidedBy": "revealDashInScreenSpace",
      "refuses": "a dash that measures its own path while vector-effect: non-scaling-stroke computes it in screen space",
      "earnedBy": "a route drawn as head, hole and tail because the pattern was measured against a line the camera had scaled up",
      "formats": { "scrolly": "carried", "chart-beat": "owed", "chart-web": "owed", "chart-video": "owed", "map-beat": "owed", "map-web": "owed" }
    },
    {
      "id": "reached-mark-declares",
      "decidedBy": "neverReached",
      "refuses": "a mark still data-state=pending when the reveal has ended",
      "earnedBy": "stop badges kept the fill they were SSR'd with while the line arrived: the narrative got there and the picture never said so",
      "formats": { "scrolly": "carried", "chart-web": "owed", "chart-video": "owed", "map-web": "owed" }
    },
    {
      "id": "step-redraws",
      "decidedBy": "stillSteps",
      "refuses": "two consecutive steps painting the same picture",
      "earnedBy": "a five-stop scrolly repainted 4.4/0/0/0 % of its marks: one identical picture five times",
      "formats": { "scrolly": "carried" }
    },
    {
      "id": "scrub-not-slideshow",
      "decidedBy": "stalledSteps",
      "refuses": "a step whose picture never moves inside itself, on a beat built to scrub",
      "earnedBy": "five finished SSR'd pictures passed every other guard and still jumped at each boundary",
      "formats": { "scrolly": "carried" }
    },
    {
      "id": "model-declared",
      "decidedBy": "requiresScrub",
      "refuses": "nothing on its own — it reads which model a beat is built on, off the markup",
      "earnedBy": "an assembly and a scrub owe different things, and guessing which is which misfires on both",
      "formats": { "scrolly": "carried" }
    }
  ]
}
```

- [ ] **Step 4: Write the reader and the generator**

```js
// scripts/guards.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

export function readCatalogue() {
  return JSON.parse(readFileSync(join(ROOT, "skills/doctrine/references/guard-catalogue.json"), "utf8"));
}

/** The guard decision functions a skill's own scripts actually export. */
export function carriedBy(skill) {
  const dir = join(ROOT, "skills", skill, "scripts");
  if (!existsSync(dir)) return [];
  const names = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mjs")))
    for (const match of readFileSync(join(dir, file), "utf8").matchAll(/export function ([a-zA-Z]+)/g))
      names.push(match[1]);
  return names;
}

/** Every cell a format is reachable by and does not carry — the debt, enumerated. */
export function owedRows(catalogue) {
  return catalogue.guards.flatMap((guard) =>
    Object.entries(guard.formats)
      .filter(([, state]) => state === "owed")
      .map(([skill]) => ({ guard: guard.id, skill })),
  );
}
```

- [ ] **Step 5: Run the test to watch it pass**

Run: `bun test skills/doctrine/test/guard-parity.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Generate `GUARDS.md` and check it in**

Add to `scripts/guards.mjs` a `--write` / `--check` pair mirroring `scripts/matrix.mjs`: `--write`
renders the coverage table plus a "what is owed" list from `owedRows`, `--check` fails if the file has
drifted. Add `"guards": "bun scripts/guards.mjs --write"` and `"guards:check": "bun scripts/guards.mjs --check"` to
`package.json`, and `bun run guards:check` to the release baseline in `AGENTS.md`.

- [ ] **Step 7: Commit**

```bash
git add skills/doctrine scripts/guards.mjs GUARDS.md package.json AGENTS.md
git commit -m "feat(doctrine): one catalogue of earned guards, and a test that names what each format owes"
```

---

### Task 1b: The Datawrapper map path, re-opened

**Files:**
- Modify: `skills/storyboard/references/datawrapper-chart-types.json` (add map treatments)
- Modify: `skills/dw-beat/SKILL.md` (the "not for a map" line, and what replaces it)
- Modify: `skills/dw-beat/scripts/validate-spec.mjs`
- Create: `skills/dw-beat/test/map-treatments.test.ts`
- Modify: `skills/storyboard/test/producer-gate.test.ts`

**Interfaces:**
- Consumes: the pinned inventory's existing `d3-maps-choropleth`, `d3-maps-symbols`, `locator-map`.
- Produces: `splashTreatments` entries mapping `map.choropleth` → `d3-maps-choropleth`,
  `map.proportional-symbol` → `d3-maps-symbols`, `map.locator` → `locator-map`; and
  `validateSpec` accepting a spec whose `chartType` is one of those three.

**Why it is a task and not a note.** The provider inventory already carries three map types. Every
layer above refuses them: `dw-beat/SKILL.md:56` says "not for a map", no `splashTreatments` entry
names one, and `producer-gate.mjs` only offers Datawrapper for chart treatments. A journalist who
wants an ordinary static choropleth cannot be offered the thin delegated path that every ordinary
static bar chart gets.

- [ ] **Step 1: Write the failing test — a map treatment reaches a Datawrapper type**

```ts
// skills/dw-beat/test/map-treatments.test.ts
import { describe, expect, it } from "bun:test";
import { datawrapperTypeFor } from "../../storyboard/scripts/producer-gate.mjs";

describe("an ordinary map treatment", () => {
  it("reaches the delegated producer, the way an ordinary bar chart does", () => {
    expect(datawrapperTypeFor("map.choropleth")).toBe("d3-maps-choropleth");
    expect(datawrapperTypeFor("map.proportional-symbol")).toBe("d3-maps-symbols");
    expect(datawrapperTypeFor("map.locator")).toBe("locator-map");
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/dw-beat/test/map-treatments.test.ts`
Expected: FAIL — the treatments resolve to nothing, and `datawrapperTypeFor` may not be exported yet.

- [ ] **Step 3: Add the three treatments to the pinned catalogue**

Three `splashTreatments` entries with their aliases, beside the twelve chart ones. The catalogue's
own validator (`producer-gate.mjs`'s `validateCatalog`) already refuses a treatment naming an unknown
type, so a typo fails at load.

- [ ] **Step 4: Run the test to watch it pass**

- [ ] **Step 5: Widen the producer, and say what it still refuses**

`validate-spec.mjs` accepts the three map types. `SKILL.md`'s "not for a map" becomes what is
actually true: the delegated path serves an ORDINARY map — a choropleth, a symbol map, a locator —
and does not serve a bespoke camera, a baked plate, a scroll-driven reveal or video, which is
`map-beat`'s work. State the boundary rather than the refusal.

- [ ] **Step 6: Prove it end to end against the live API, and look at the PNG**

`dw-beat` has `prove-co2.mjs` as the pattern for a live proof. Write the map equivalent, run it with
the real key, and OPEN the PNG it takes back. A delegated producer that has never drawn a map is not
a producer.

- [ ] **Step 7: Commit**

```bash
git add skills/dw-beat skills/storyboard GUARDS.md
git commit -m "feat(dw-beat): an ordinary map reaches the delegated producer too"
```

---

### Task 1c: Two documentation defects found while inventorying

**Files:**
- Modify: `skills/map-beat/SKILL.md:65`
- Modify: `skills/dw-beat/scripts/map-spec.mjs` (rename to `metadata-spec.mjs`) and its importers

- [x] **Step 1: Fix the false claim about a cross-skill import**

`map-beat/SKILL.md:65` says the timing vocabulary is "**imported** from `chart-video`". The code says
the opposite and says why (`assets/timing.ts:6`: "A copy, not an import, because a skill never
reaches across another skill's boundary at runtime", guarded byte-identical by
`splash/test/root-template-shared.test.ts`). The code is right. This matters beyond a typo: copy +
parity test is the mechanism this whole plan rests on, and a skill document claiming otherwise
teaches the next author to reach across.

- [x] **Step 2: Rename `map-spec.mjs`**

It maps editorial intent onto Datawrapper METADATA; it has nothing to do with cartography, and Task
1b puts real map code in this skill, where the name would be actively misleading. Rename to
`metadata-spec.mjs`, update its importers, run `bun test skills/dw-beat`.

- [x] **Step 3: Commit**

```bash
git commit -m "docs(map-beat,dw-beat): the timing vocabulary is a copy, and map-spec maps metadata"
```

**Done 2026-08-19.** `map-beat/SKILL.md` now carries a `Vocabulary` row naming
`assets/timing-contract.ts` as a COPY held byte-identical by `splash/test/root-template-shared.test.ts`;
`map-spec.mjs`/`map-spec.test.ts` became `metadata-spec.mjs`/`metadata-spec.test.ts` with a header
recording the rename, and all 11 `SKILL.md`/`references/` mentions followed. `bun test skills/dw-beat`
115 pass · 3 skip (live Datawrapper token absent), `skill-md-matches-code` green.

**A general guard for this defect class was attempted, measured, and rejected — the measurement,
so nobody re-attempts it blind.** The defect is prose asserting a cross-skill import that the code
forbids, and `no-cross-skill-imports.test.ts` already proves ZERO such imports exist, so any such
assertion is false by construction. Three successively tighter text rules were run over all fifteen
`SKILL.md`:

| rule | offenders on a clean tree | catches the real defect? |
| --- | --- | --- |
| import-word + sibling-skill name, same line | 16 (15 of them denials — "carried not imported", "a skill never imports another skill") | yes, drowned |
| …by block, skipping fenced code and `test/` paths, minus any block containing a negation | 0 | **no** — "is **imported** from `chart-video`, never re-implemented" is suppressed by its own trailing "never" |
| …negation must sit within 40 chars BEFORE the import word | 9 false positives (a sibling merely NAMED elsewhere in a block whose import is about the skill's own code) | yes |

The third is the only one that works and it costs nine standing exclusions, which is a guard that
will be silenced rather than obeyed. The limit is real: "which skill does this sentence say the
import is FROM" is not decidable from the text. `skill-md-matches-code.test.ts` already documents
this class in its own "WHAT IT PROVABLY DOES NOT CATCH" — this note extends that list rather than
pretending otherwise.

---

### Task 1d: The canon guards reach every skill that has a canon

**Found 2026-08-19**, while the owner asked why the seed-alone proof names four skills. It is not a
deliberate scope; it is a fixed array nobody grew. Seven skills carry the full canon
(`scripts/render-preview.mjs` + `assets/preview.png` + `assets/sample-data/` + `output-proof/`):
`chart-beat`, `chart-web`, `chart-video`, `map-beat`, `image-beat`, `map-web`, `scrolly`. Both guards
in `skills/splash/test/` hard-code the same list of FOUR.

| skill | seed renders alone | output-proof is the preview |
| --- | --- | --- |
| chart-beat, chart-web, chart-video, map-beat | `splash/test/seed-renders-standalone` | `splash/test/canon-shape` |
| map-web | its OWN copy, `map-web/test/standalone.test.ts` (tolerant compare) | **nothing** |
| scrolly | **a weaker claim** — `scrolly/test/canon.test.ts:52` runs `render-preview.mjs --out /tmp/...` from the CHECKED-OUT tree and asserts only the PNG magic bytes. The repository, `proof/`, `shared/` and every sibling skill are still on disk, so it proves the output is a PNG, not that the skill is self-contained | **nothing** |
| image-beat | **nothing** | **nothing** |

What the gap already cost, measured rather than feared — `assets/preview.png` was regenerated in
Tom's `bc308ab8` ("fix: make Splash test-ready", 2026-08-11) and `output-proof/preview.png` was not:

```
image-beat   identical
map-web      DIFFER   36565/3686400 pixels (0,992 %) beyond tolerance 6   2048x1800 both
scrolly      DIFFER    1164/576000  pixels (0,202 %) beyond tolerance 6    640x900  both
chart-beat, chart-web, chart-video, map-beat   identical
```

Two stale proofs — "the artifact a reader opens to see what the skill produces, guarded by nothing",
which is the exact sentence `canon-shape.test.ts`'s own docstring gives as its reason to exist.

**Files:**
- Modify: `skills/splash/test/canon-shape.test.ts` (the `CRAFT` array)
- Modify: `skills/splash/test/seed-renders-standalone.test.ts` (the `CRAFT` array)
- Modify: `skills/scrolly/test/canon.test.ts:52` (raise the claim to a real isolated root, or delete
  it in favour of the walking one — do not leave two claims of different strength under one name)
- Regenerate: `skills/map-web/output-proof/preview.png`, `skills/scrolly/output-proof/preview.png`

**The one judgement this task must make, not assume:** the seed-alone proof for `scrolly` and
`map-web` costs a MapTiler bake and a full scroll capture. If a walked case is too slow for the
suite it may be moved, never dropped — and the reason must be written where the reader of the
`CRAFT` array will see it. A list that excludes a skill must say why, beside the list.

**Verification:** mutation — stale one `output-proof/preview.png` by a pixel block and watch
`canon-shape` name that skill; point one seed at a file outside its own directory and watch
`seed-renders-standalone` name it.

**Done 2026-08-19** — `f5b798ac`. Bigger than written above, because the measurement moved twice
while executing it:

1. The list is now DISCOVERED (`skills/splash/test/canon-skills.ts`): all four canon assets on disk
   = walked, and an exclusion must carry a written reason. There are none. `seed-renders-standalone`
   walks seven in 26 s, and `image-beat`, `map-web` and `scrolly` are proved isolated for the first
   time.
2. `map-web/output-proof/preview.png` really was stale (0,991 %); `scrolly`'s was not (0,177 %, and
   a fresh render sits 0,065 % from it). Both are now copies of `assets/preview.png`, and
   `canon-shape` keeps BYTE equality — the one place it is still the right question, because it
   compares a file to a copy of itself rather than to a re-render.
3. **The `--check` in six skills was the same wrong question**, and it was live-red: `scrolly`'s
   canon test was failing on this branch, rendering 6543 bytes where `bc308ab8` committed 6609,
   with the seed and the renderer untouched since. Byte equality asserts a render is reproducible
   ACROSS MACHINES; nothing here promises that. All seven now compare decoded pixels.
4. The comparator had to lose its browser to be shareable. `map-web`'s decoded on a Chrome
   `<canvas>`; five of the seven canon skills rasterise through resvg and open no browser, so a copy
   would have cost more than the render it checks. `compare-png.mjs` decodes PNG through
   `node:zlib` — 8-bit, RGB/RGBA, non-interlaced, which is all fourteen `preview.png` here — and is
   byte-identical in eight skills, walked by `compare-png-parity.test.ts`.

**The limit, measured, and the follow-up it names.** `scrolly`'s machine-to-machine difference is
382 pixels with amplitudes `5-8:13 · 9-16:42 · 17-32:77 · 33-64:137 · 65-128:111 · 129-255:2` —
glyph reflow, not anti-aliasing. A real seed edit on the same preview (one label 18px → 30px) moves
**345** pixels, 156 of them at 129-255. FEWER than the machine difference. No threshold on count or
amplitude separates them, so on a small text-dominated preview `--check` cannot be relied on to
notice a seed change. Written into the comparator's header in all eight copies. **It ends when the
rasteriser is handed font FILES instead of a family name** — `chart-beat/scripts/render-still.mjs`'s
own header already names that as "the next step rather than this one", across 22 vendored copies.
That is a task this plan should carry; it is not in it yet.

**Found while running the full suite, and NOT caused by this work** (verified against a stashed
tree, identical before and after): `skills/scrolly/test/scroll-integrity.test.ts` is red with nine
failures of the plate-follows-the-theme guard — `danube-scrolly`, `one-map-four-readings` and
`quakes-four-maps`, at three widths each.

---

### Task 1e: The debt was the guard's, not the beats' — closed 2026-08-19, `e5a47f36`

The three beats were correct. All three declare `--ground: #FFFFFF` in their own `:root` and carry
light plates (0.890 / 0.700 / 0.658): a light beat with a light plate, three times over. **The
instrument was wrong.**

It read `getComputedStyle(document.querySelector(".scrolly")).backgroundColor`. `.scrolly` sets no
background — `html, body` carry `background: var(--ground)` — so the computed value is
`rgba(0, 0, 0, 0)`, and luminance maths that ignore alpha read those zeros as pure black. **Every
beat in the tree measured "ground 0.000."** The one beat that passed, `route-access`, passed by
luck: its declared ground really is dark, so black landed on the right side.

Two things at once, because either alone leaves the hole:

- `surfaceLuminance(css)` — pure, tested without a browser, returns `null` for zero alpha and for an
  unreadable value. A transparent surface has not been measured; it has been missed, and an
  instrument that returns a number there is confidently wrong.
- the ground read is the one the beat DECLARES (`--ground`), then `.scrolly`, then `body`. The page
  returns STRINGS and node decides, which is what makes the decision testable without Chrome. When
  no ground can be read at all the guard says so in a note and does not run.

Mutation-checked end to end, not only on the pure function: `--ground` forced to `#FFFFFF` on
`route-access`'s own rendered file with its dark plate untouched → FAIL naming ground 1.000 against
plate 0.015 at all three widths. `bun test skills/scrolly`: 157 pass, 0 fail.

**The rule this earns, and it is one this branch has now paid for twice.** The first time was the
Danube dash, where five measurements of my own contradicted the owner's screen and the owner was
right. This time a guard I wrote failed three innocent beats for eight days' worth of red. Both have
the same shape: *a measurement that disagrees with a beat has to be doubted before the beat is*. What
made this one findable in an hour rather than a day was reading what the beats DECLARE (`PALETTE.md`
said `#FFFFFF` on all three, against a guard reporting black) instead of re-running the instrument.

---

### Task 1f: The picture comparator must not be a trade — closed 2026-08-19, `b4b28097`

Raised by the owner on 2026-08-19, on the wording "to be shareable, the comparator had to lose its
browser": sharing between skills is for CARRYING capability across, not for trimming to whatever the
weakest path can afford. Measured, the swap in Task 1d was both:

| | browser comparator (before) | `node:zlib` comparator (now) |
| --- | --- | --- |
| alpha channel | **not compared** (`dr`/`dg`/`db` only) — a still whose ground went transparent read as identical | compared |
| browsers needed | one launch per comparison | none |
| callable from | a skill already driving Chrome (1 of 7) | all 7, synchronously |
| PNG 8-bit RGB/RGBA | yes | yes |
| **PNG 16-bit, palette, greyscale, interlaced** | **yes** | **throws by name** |
| JPEG / WebP | yes | no |

The last two rows are capability that was there and is not any more. It does not bite today — all
fourteen `preview.png` in the tree are 8-bit RGB or RGBA, non-interlaced, measured — but "it does not
bite today" is what every one of the defects in this plan was, once.

**Done.** `decodePng` reads bit depths 1/2/4/8/16, colour types 0/2/3/4/6, `tRNS` on greyscale, on
RGB and on a palette (including a `tRNS` shorter than its `PLTE`), and Adam7 interlacing. Two
constants were MEASURED against Chrome rather than chosen: 16-bit reduces by the high byte (sample
63757 → 249, not the 248 that `* 255 / 65535` gives) and sub-byte depths scale by `255 / (2^d - 1)`.

**And it gained a capability the browser one never had.** `<canvas>` premultiplies on `drawImage`
and un-premultiplies on `getImageData`, so Chrome returns grey **242** for a pixel the file says is
**248 at alpha 20**, and black for any colour at alpha 0. The pure decoder returns what the file
says. That is now the second thing this comparator does that its predecessor could not, after
comparing the alpha channel at all.

17 fixtures under `skills/splash/test/fixtures/png/`, written by a generator committed beside them,
each decoded twice — by `decodePng` and by Chrome — and required to agree. Opaque pixels exactly;
translucent ones within one step per channel, because Chrome's premultiply rounding is fixed-point
and unspecified: six pixels out of 288 land one apart, and they are NAMED in the test rather than
absorbed by a blanket tolerance.

Mutation-checked one capability at a time, since a decoder that is only round-tripped against its own
encoder proves nothing: sub-byte scaling removed → 4 red · 16-bit rounded instead of `>> 8` → 2 red ·
a `tRNS` shorter than its palette mishandled → 1 red · two Adam7 passes swapped → 3 red · greyscale
`tRNS` ignored → 1 red. 59 pass. Eight copies re-synced, parity green, all seven `--check` green.

---

### Task 2: `chart-video` — four guards and the driver that runs them

**Files:**
- Create: `skills/chart-video/scripts/verify-video.mjs`
- Create: `skills/chart-video/test/verify-video.test.ts`
- Modify: `skills/doctrine/references/guard-catalogue.json` (four cells `owed` → `carried`)
- Modify: `skills/chart-video/SKILL.md`

**Interfaces:**
- Consumes: the catalogue's guard ids and function names from Task 1.
- Produces: `revealDashInScreenSpace(marks)`, `neverReached(marks)`, `duplicatedPayload(html)` (for the beat's own generated build file), `plateFollowsGround({ ground, plate })` — each exported from `verify-video.mjs`, each with the same signature as its `scrolly` twin so the parity test can compare them.

- [ ] **Step 1: Write the failing test — the dash guard, on this format's own shape**

```ts
// skills/chart-video/test/verify-video.test.ts
import { describe, expect, it } from "bun:test";
import { revealDashInScreenSpace } from "../scripts/verify-video.mjs";

// A line reveal is this format's native mechanism: the path is dashed by its own length and the
// offset runs to zero across the build. Under `vector-effect: non-scaling-stroke` that pattern is
// measured in screen space, where the path's own length does not live, and it repeats — head, hole,
// tail. It cost a map beat months before anything measured it.
describe("a dash that measures its own path", () => {
  it("refuses it in screen space", () => {
    expect(
      revealDashInScreenSpace([
        { id: "line", dasharray: "820px", dashoffset: "410px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual(["line"]);
  });

  it("leaves a decorative dash alone", () => {
    expect(
      revealDashInScreenSpace([
        { id: "grid", dasharray: "2px 4px", dashoffset: "0px", vectorEffect: "non-scaling-stroke" },
      ]),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/chart-video/test/verify-video.test.ts`
Expected: FAIL — `Cannot find module '../scripts/verify-video.mjs'`.

- [ ] **Step 3: Copy the four decision functions verbatim from `verify-scrolly.mjs`**

Copy `revealDashInScreenSpace`, `neverReached`, `duplicatedPayload` and `plateFollowsGround` into
`skills/chart-video/scripts/verify-video.mjs`, with their doc-comments intact — the comments carry the
defect that earned each one, and a copy without them is a rule nobody will understand in six months.
Add the header this file needs:

```js
// Verifies what a chart VIDEO carries, after the render ladder has proved it exists.
//
// `render-video.mjs` proves a file was produced and its final frame looks right. Nothing until now
// asked whether the reveal that produced it is measured in a space its own length lives in, or
// whether a mark the build reaches ever says so. Both defects are native to this format: a line
// reveal is a dash whose offset runs to zero, and an annotation arriving is exactly the
// "reached mark" case.
```

- [ ] **Step 4: Run the test to watch it pass**

Run: `bun test skills/chart-video/test/verify-video.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the driver that measures a rendered video beat**

The driver opens the beat's own Remotion composition in a browser at the frames the render ladder
already extracts (`render-video.mjs` writes four), reads the marks with a DOM walk — never a
screenshot — and hands the measurements to the four decision functions.

```js
export async function verifyVideoBeat(page, url, { frames }) {
  const failures = [];
  const readMarks = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("[stroke-dasharray], [style*='stroke-dasharray']")).map((node) => {
        const style = getComputedStyle(node);
        return {
          id: node.getAttribute("data-part") ?? node.tagName.toLowerCase(),
          dasharray: style.strokeDasharray,
          dashoffset: style.strokeDashoffset,
          pathLength: node.getAttribute("pathLength"),
          vectorEffect: style.vectorEffect,
        };
      }),
    );
  const seen = new Map();
  for (const frame of frames) {
    await page.goto(`${url}&frame=${frame}`, { waitUntil: "networkidle0" });
    for (const mark of await readMarks()) if (!seen.has(mark.id)) seen.set(mark.id, mark);
  }
  for (const id of revealDashInScreenSpace([...seen.values()]))
    failures.push(`${id} reveals itself with a dash while carrying vector-effect: non-scaling-stroke`);
  return { failures };
}
```

- [ ] **Step 6: Mutation-check each of the four**

For each guard: reintroduce its defect in one beat under `proof/` that this skill renders, run the
driver, watch it go red, restore, watch it go green. Record the two numbers in the SKILL.md section
written in step 7. A guard never seen red is not landed.

- [ ] **Step 7: Write the rules into `skills/chart-video/SKILL.md` and flip the catalogue cells**

Four bullets in the skill's own voice, each naming the defect and the measurement, then
`"chart-video": "carried"` on those four guards in `guard-catalogue.json`, then `bun run guards`.

- [ ] **Step 8: Commit**

```bash
git add skills/chart-video skills/doctrine GUARDS.md
git commit -m "feat(chart-video): carry the four guards this format can reach"
```

---

**Done 2026-08-19** — `c29a7b75`. Three things came out different from the plan, all measured:

1. **Two guards, not four.** `guard-catalogue.json` lists `chart-video` as reachable by
   `screen-space-dash` and `reached-mark-declares` only. The plan's other two are not reachable here
   and the catalogue is right: this format ships an mp4 and PNGs, so there is no self-contained HTML
   to inline an asset into twice, and no baked plate to disagree with a ground.
2. **The driver cannot read a DOM, and pretending otherwise would have made it brittle.** The plan's
   Step 5 assumed `page.goto(url + "&frame=" + n)`. A video beat's marks exist as marks only inside
   Remotion's own render; `remotion`'s `Internals.Timeline` exports hooks and no context object, and
   the render bundle speaks a private protocol to the renderer. A guard built on another package's
   internals is brittle by construction. It reads the beat's own component text instead, and the
   limit — a dash assembled in a helper and spread in is invisible — is written in the script's
   header, in the test's header and in `SKILL.md`. The walking test asserts how MANY marks the reader
   found (22 of the corpus's 22 literal `strokeDasharray` occurrences, checked file by file against a
   raw text count) so a reader that broke fails instead of quietly passing.
3. **Nothing was being fixed, and that is the interesting part.** Measured across the seed and 25
   video beats: 18 carry a `strokeDasharray` — 22 marks, every one decorative — and **zero** carry a
   `strokeDashoffset` or a `vectorEffect`, while **eleven** reveal a line with `drawnSoFar`, the path
   re-generated from a sliced point list. This format had already answered the reveal problem better
   than the format that earned the guard: there is no pattern to compute in the wrong space. The
   guard is a ratchet, not a repair.

`reached-mark-declares` stays **owed**, deliberately: no video beat declares `data-state` at all —
arrival is signalled with opacity driven by `progressOf`, which the guard cannot read. Adopting the
vocabulary is a change to how a beat is WRITTEN, not a guard to copy, and marking the cell carried by
a check that reads nothing would be the lie this whole plan exists to prevent. GUARDS.md: 14 cells
owed, down from 15.

Mutation-checked: a `strokeDashoffset` and a `vectorEffect` added to the reference rule of
`vidx-line-life-expectancy` → red, naming `proof/vidx-line-life-expectancy/LifeExpectancyGapVideo.tsx:568 line`.

---

### Task 2b: Carry `drawnSoFar` the other way, into `scrolly` — OPEN

The mirror of Task 2, and the reason it is worth writing down: the capability traffic between these
two skills runs BOTH ways. `scrolly` reveals a route with a dash and a `pathLength`, and it took six
hours, five wrong diagnoses and a doctrine section to make that safe. `chart-video` reveals a line by
re-generating the path from the points reached — a mechanism that cannot have the defect at all, in
eleven beats, with no doctrine needed.

A scrolly route drawn with `drawnSoFar` would need no `pathLength`, no `vector-effect` discipline and
no guard. Whether every scrolly reveal can be re-expressed that way is a real question — a dash can
reveal a shape whose points are not ordered, and `drawnSoFar` cannot — so this is a design task, not
a copy. It belongs in the same plan because it is the same rule: a fix that stays in the skill it was
found in is three quarters of a fix.

---

### Task 3: `map-beat` — five guards and the driver that runs them

**Files:**
- Create: `skills/map-beat/scripts/verify-map.mjs`
- Create: `skills/map-beat/test/verify-map.test.ts`
- Modify: `skills/doctrine/references/guard-catalogue.json`
- Modify: `skills/map-beat/SKILL.md`

**Interfaces:**
- Produces: `projectionDisagreements(frames)`, `plateFollowsGround({ ground, plate })`, `revealDashInScreenSpace(marks)`, `duplicatedPayload(html)`, `neverReached(marks)` — same signatures as their twins.

- [ ] **Step 1: Write the failing test — the two guards this format earned elsewhere and can reach here**

```ts
// skills/map-beat/test/verify-map.test.ts
import { describe, expect, it } from "bun:test";
import { plateFollowsGround, projectionDisagreements } from "../scripts/verify-map.mjs";

describe("a baked plate under a declared ground", () => {
  it("refuses a light plate under a dark ground", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.83 })).toBe(false);
  });

  it("accepts a mid-grey plate under either", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.42 })).toBe(true);
  });
});

describe("a plate and the overlay drawn on it", () => {
  it("refuses a cropped plate under a contained overlay", () => {
    expect(projectionDisagreements([{ id: "frame", fit: "cover", par: "xMidYMid meet" }])).toEqual([
      { id: "frame", fit: "cover", par: "xMidYMid meet", expected: "xMidYMid slice" },
    ]);
  });
});
```

- [ ] **Step 2: Run it to watch it fail**

Run: `bun test skills/map-beat/test/verify-map.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Copy the five decision functions with their doc-comments**

Same treatment as Task 2, step 3, into `skills/map-beat/scripts/verify-map.mjs`.

- [ ] **Step 4: Run the test to watch it pass**

Run: `bun test skills/map-beat/test/verify-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the driver, and make it read the plate through a canvas**

The luminance of the plate is a DOM read: draw the plate into an `OffscreenCanvas` and average, the
way `verify-scrolly.mjs` does. Do NOT sample a screenshot.

- [ ] **Step 6: Run it over every map beat on disk and record what it finds**

`proof/` holds 18 map beats over 6 types. Run the driver over all of them; every failure is either a
real defect to fix in its own commit or a guard to narrow, and the choice is made per finding, in
writing, in the commit message.

- [ ] **Step 7: Mutation-check, flip the catalogue cells, regenerate `GUARDS.md`, commit**

```bash
git add skills/map-beat skills/doctrine GUARDS.md
git commit -m "feat(map-beat): carry the five guards this format can reach"
```

---

**Done 2026-08-19** — `1e5959b0`. The plan said five guards; the catalogue said three; measuring
changed *which* three.

**`plateMatchesGeometry` is new, and `projection-pairing` turned out to be unreachable here.** The
catalogue pointed `projectionDisagreements` at this skill — a decision that compares an `<img>`'s CSS
`object-fit` against the `preserveAspectRatio` of the SVG over it. Measured: `object-fit` appears in
**exactly two files in the whole tree**, both scrolly IMAGE beats, and in **no map component at all**.
A map beat composites its plate as an `<image>` INSIDE the marks' own SVG, in the marks' own
coordinate system; there are not two projections that could disagree. The same DEFECT is reachable by
this format's own mechanism — a plate whose aspect ratio is not its box's letterboxes under the
default `xMidYMid meet` — so it is a second catalogue row, and `map-beat` is now BLANK on
`projection-pairing` rather than permanently owing a cell nobody could ever fill.

**Both plate questions are decided from two files.** `bake-plate.mjs` writes `plate/plate.png` and
`plate/geometry.json` side by side, and the geometry records the frame every point's pixel position
was computed in — so no rasteriser, no browser, no screenshot. Measured across what is on disk:

| | result |
| --- | --- |
| plate ratio vs projected frame, 16 beats with a geometry | **all 0.000 % apart, at exactly 2.00×** |
| plate side vs declared ground, 17 plated beats | **all on their ground's side** — 16 light plates 0.661–0.893 under `#FFFFFF`, one dark at 0.016 under `#16191B` |
| dashed map components | 2, both dividing the pattern by the camera's scale, neither declaring a `vectorEffect` |

Three ratchets, nothing repaired — the third task in a row where the format turned out to be clean and
the guard's job is to keep it that way.

**A second parity mechanism had to exist, one level under the catalogue.** `carriedBy` reads a NAME
out of an array, and a name is not a behaviour: two copies of `revealDashInScreenSpace` that had
drifted apart would both satisfy `guard-parity.test.ts` while the format with the weakened copy ships
what its neighbour refuses. `skills/splash/test/guard-copies-parity.test.ts` compares each copied
decision's doc comment AND body byte for byte — and the SHOUTING_CASE constants it decides with,
which it earned by its own mutation: `DARK_SIDE` 0.25 → 0.40 in one copy left the test **green** until
constants were followed. Its last assertion refuses a decision carried by two skills and not walked,
so adding the next one is unavoidable rather than remembered.

**Found and fixed while doing it:** `marksFromSource` read only the attribute form, so
`style={{ strokeDasharray: 1, strokeDashoffset: x }}` — how every route reveal in this tree is
actually written — came back with no offset and **passed**. Both copies now read it, including the
last property in the object, which a brace-balancing reader got wrong as `1 - reached }`. The reader
was one afternoon old and had already drifted between two skills; that is the whole argument for the
file above, made by accident.

GUARDS.md: **12 cells owed**, down from 14.

---

### Task 4: `chart-beat` and `image-beat` — the static pair

**Files:**
- Create: `skills/chart-beat/scripts/verify-static.mjs`, `skills/chart-beat/test/verify-static.test.ts`
- Create: `skills/image-beat/scripts/verify-image.mjs`, `skills/image-beat/test/verify-image.test.ts`
- Modify: `skills/doctrine/references/guard-catalogue.json`

**Interfaces:**
- Produces: `revealDashInScreenSpace` (chart-beat: a static frame can still carry a dashed annotation whose offset is authored), `duplicatedPayload` (image-beat: its export inlines photographs).

- [ ] **Step 1: Write the failing tests for both, in the same shape as Tasks 2 and 3**
- [ ] **Step 2: Run them to watch them fail**
- [ ] **Step 3: Copy the decision functions with their doc-comments**
- [ ] **Step 4: Run to watch them pass**
- [ ] **Step 5: Mutation-check each guard in each skill**
- [ ] **Step 6: Flip the catalogue cells, regenerate, commit**

```bash
git commit -m "feat(chart-beat,image-beat): carry the guards the static formats can reach"
```

---

**Done 2026-08-19** — `9d725050`. Two cells, one per skill, and both formats clean — the third and
fourth in a row.

**`chart-beat` — `screen-space-dash`.** A static frame has no reveal, so almost nothing a scrolly
earned can happen here; a dash can, and it is this format's ordinary reference rule. Measured: 18
components (17 beats declaring `chart / static` in their own `BRIEF.md`, plus the seed), **9 dashed
marks, not one `strokeDashoffset` or `vectorEffect` among them**.

**`image-beat` — `duplicated-payload`, and this one is WIRED rather than only tested.** The format
embeds every photograph as a `data:` URI; `checkWeight` already refuses a beat too heavy in total, and
nothing refused weight that carries nothing. `render-preview.mjs` now calls `duplicatedPayload` on the
built SVG and **throws** beside `checkWeight`, naming the copies and the wasted megabytes — this
skill's established shape, where the render script calls the checks rather than `renderStill`. The
test asserts that call site, because a decision nothing calls is a decision that does not run.

Coverage stated rather than implied: **there is no image beat under `proof/`** — the two `image` beats
there are `image / scrolly` and belong to the vehicle — so the walking coverage is one component. The
guard's value is at render time, for the beat that does not exist yet.

**The parity test caught its own gap the moment the cells flipped.** `duplicatedPayload` became
carried by two skills and was not in `COPIES`, and `guard-copies-parity.test.ts` refused. That
assertion was written one task earlier precisely so that adding the next copy would be unavoidable
rather than remembered, and it worked on its first opportunity. `revealDashInScreenSpace` is now
walked across four scripts, `marksFromSource` across three.

Mutation-checked: a `strokeDashoffset` and `vectorEffect` on `static-renewables-shift`'s `"2 2"` rule
→ red, naming `RenewablesShiftSlope.tsx:430`; the seed's first photograph duplicated in
`manifest.json` → `render-preview.mjs` throws *"2 copies of one 0.01 MB asset, 0.01 MB wasted"* AND
the walking test goes red.

GUARDS.md: **10 cells owed**, down from 12. Every remaining one belongs to `chart-web` or `map-web`,
which is Task 5.

---

### Task 5: `chart-web` and `map-web` — add to the drivers that already exist

**Files:**
- Modify: `skills/chart-web/scripts/verify-web.mjs`, `skills/chart-web/test/`
- Modify: `skills/map-web/scripts/verify-interaction.mjs`, `skills/map-web/test/`
- Modify: `skills/doctrine/references/guard-catalogue.json`

These two have drivers; the guards are added to them rather than created beside them. `chart-web`
owes duplicated-payload, screen-space-dash and reached-mark; `map-web` owes those three plus
projection-pairing and plate-follows-theme.

- [ ] **Step 1: Write the failing tests, one per owed guard per skill**
- [ ] **Step 2: Run them to watch them fail**
- [ ] **Step 3: Copy the decision functions into each driver, doc-comments intact**
- [ ] **Step 4: Run to watch them pass**
- [ ] **Step 5: Run each driver over every beat of its format on disk and triage the findings in writing**
- [ ] **Step 6: Mutation-check, flip the cells, regenerate, commit**

---

### Task 6: `dw-beat` — what is checkable when rendering is delegated

**Files:**
- Modify: `skills/dw-beat/scripts/verify-range-annotation.mjs` or create `verify-owned.mjs`
- Modify: `skills/doctrine/references/guard-catalogue.json`

Datawrapper renders; this skill owns the request and the artefact that comes back. Only guards about
the OWNED artefact apply — the PNG's own contrast and the embed's payload. Declare the rest
unreachable in the catalogue, with the reason in the row, so a later reader does not re-litigate it.

- [ ] **Step 1: Write the failing test for the owned-artefact guards**
- [ ] **Step 2–5: the same cycle**
- [ ] **Step 6: Mark the unreachable cells in the catalogue with their reason, regenerate, commit**

---

### Task 7: Close the loop — the parity test starts refusing debt

**Files:**
- Modify: `skills/doctrine/test/guard-parity.test.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the failing test — no cell may still be `owed`**

```ts
it("owes nothing: every reachable format carries every guard it can reach", () => {
  expect(owedRows(readCatalogue())).toEqual([]);
});
```

- [ ] **Step 2: Run it — it passes only if Tasks 2-6 are complete; any remaining cell names itself**
- [ ] **Step 3: Add `bun run guards:check` to the release baseline in `AGENTS.md`**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(doctrine): the parity test refuses debt, not only false claims"
```

---

## Self-review

**Spec coverage.** Catalogue → Task 1. Parity test → Tasks 1 and 7. `chart-video` → Task 2.
`map-beat` → Task 3. `chart-beat`/`image-beat` → Task 4. `chart-web`/`map-web` → Task 5. `dw-beat` →
Task 6. Generated `GUARDS.md` → Task 1 step 6, regenerated in every later task. Mutation-checking →
a step in every task.

**Placeholders.** Tasks 4, 5 and 6 give the cycle rather than repeating the same test bodies a third
and fourth time; the shapes are fully written in Tasks 2 and 3 and are copied. The one thing an
executor must NOT invent is a decision function's signature — every one is fixed in the Interfaces
block of Tasks 2 and 3.

**Type consistency.** `duplicatedPayload(html)`, `projectionDisagreements(frames)`,
`revealDashInScreenSpace(marks)`, `neverReached(marks)`, `plateFollowsGround({ ground, plate })`,
`stillSteps(shots, floor)`, `stalledSteps(readings)`, `requiresScrub({ frames, framesWithContent })` —
these are the names in `verify-scrolly.mjs` today and the names every copy must keep, because the
parity test compares them by name.

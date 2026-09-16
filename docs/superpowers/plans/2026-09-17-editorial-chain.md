# The editorial chain — retained proposal → direction, precision, choreography — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** What the journalist retained at Gate 2 is readable by code at every later step, and a step that stops reading it breaks a named test. The run's art direction is composed once and read by all four exports; each beat's precision and choreography stay **authored by the journalist**, while the chain supplies the frame — the export's shape, the type's gesture vocabulary and prohibitions, and what the claim's grounding and shape require to be asserted — and a guard proves each beat honoured it.

**Architecture:** Three new canonical modules under `shared/editorial/` (`derived.mjs` — the fenced value block; `frame.mjs` — `choreographyFrame` / `requiredAssertions`; `retained.mjs` — the retained proposal), one under `shared/design-base/` (`run-direction.mjs` — `DIRECTION.md`), and, per export skill, a `scripts/choreography.mjs` and a `scripts/precision.mjs` holding a `parse*` and a `check*` for that export's own declared shape. Nothing generates a choreography. Each beat's `BRIEF.md` gains one fenced `splash:precision` and one fenced `splash:choreography` block, parsed out of the table or object that beat already carries, plus a `derived: v1` front-matter scalar that switches the guards on for it. The 40 type sheets per family gain the four frame sections scrolly's already have.

**Tech Stack:** Bun, bun:test, ESM `.mjs` under `shared/` and `skills/*/scripts/`, no new dependency. Markdown is parsed with the repo's own hand-rolled readers (`parseBriefFrontMatter`, `parseStoryboard`) plus `JSON.parse` for the blocks — no YAML library, no markdown library.

**Spec:** `docs/splash/2026-09-17-editorial-chain-spec.md`. Read it whole before Task 1; R-D (§ preamble) and §1.4 are the two rulings every task is measured against.

## Global Constraints

- Runtime Bun only: `bun`, `bun test`, `bunx` — never `npm`, `node`, `npx`.
- Code, comments, identifiers, log and error messages, test names, branch names and commit messages in **English**. Conversation with the owner in French.
- **Named tests only.** Every verification is `bun test <explicit path>` (or `bun test <path> -t "<name>"`). Never run the unscoped suite; it is long and it is not this plan's evidence.
- `git add` and `git commit` always with an **explicit pathspec** — never `-A`, never a bare `git commit`.
- **No MapTiler key in any committed file.** Committed pages carry `__MAPTILER_KEY__` (assemble the literal as `"__MAPTILER" + "_KEY__"` inside files the delivery substitution rewrites); keys are read from the environment with `mapTilerKeyIn(process.env)` (`shared/map-beat/glyphs.mjs`).
- **No mention of Claude or Anthropic** anywhere — code, comments, docs, commits. No `Co-Authored-By`, no `Claude-Session:` trailer. After every commit: `git log -1 --format=%B | grep -ci "claude\|anthropic"` must print `0`.
- **Trunk changes are mirrored.** Any file added or changed under `shared/` that a skill carries must be mirrored into `skills/splash/assets/root-template/shared/<same path>` and, for the map/web mechanisms, into `skills/map-web/assets/`. Mirrors carry the canonical's own line 1 `// twin/<repo path>`. Verify with `bun test skills/splash/test/carried-copies.test.ts` and, where the mechanism is a map or web one, `bun test skills/splash/test/geo-parity.test.ts skills/splash/test/size-table-parity.test.ts`.
- `shared/` never imports from `skills/` or `proof/` (`skills/map-beat/test/the-trunk-stands-alone.test.ts`). Skills never import across a skill boundary (`no-cross-skill-imports.test.ts`) — that is why each export carries its own `precision.mjs` / `choreography.mjs`.
- **Every behaviour change is mutation-verified.** For each new assertion: break the code it guards, run the named test, see it red, restore, see it green. Record the mutation in the test file's header comment the way this tree already does.
- A new test that launches a browser carries `// LANE: heavy` in its first five lines or is named `*.live.test.ts`. Run `bun run test:lanes` after adding test files.
- **Nothing in this plan writes, proposes or defaults a beat's choreography or its assertions** (spec R-D). A scaffold emits an empty section with the frame quoted; the migration only parses what a beat already declares. A task that finds itself inventing content has misread the plan.
- Before the first modification of any file under `shared/` or of a type sheet, the other running sessions are told what will change (Task 0).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `shared/editorial/derived.mjs` (create) | The fenced value block: render, read, refuse prose, refuse duplicates |
| `shared/editorial/frame.mjs` (create) | `choreographyFrame`, `requiredAssertions`, `parseGesture` — what the chain supplies |
| `shared/editorial/retained.mjs` (create) | `retainedFrom`, `readRetained`, `retainedFromBrief` |
| `shared/design-base/run-direction.mjs` (create) | `composeRunDirection`, `writeRunDirection`, `readRunDirection` |
| `skills/storyboard/scripts/propose.mjs` (modify) | Candidates carry the catalogue `interaction` |
| `skills/splash/scripts/gate-contract.mjs` (modify) | `interaction` ∈ `REQUIRED_SLOT_FIELDS` |
| `skills/{scrolly,chart-video,chart-web,chart-beat,map-beat,map-web,image-beat,dw-beat}/scripts/choreography.mjs` (create) | `parseChoreography` + `checkChoreography` for that export's declared shape |
| `…/scripts/precision.mjs` (create) | `parsePrecision` + `checkPrecision` for that export |
| `skills/{chart-video,chart-web,chart-beat}/references/types/*.md` (modify) | The four frame sections scrolly's sheets already carry |
| `skills/splash/scripts/migrate-briefs.mjs` (create) | Front-matter repair, then the harvest that writes the blocks and emits the worklist |
| `skills/*/scripts/scaffold-*.mjs` (modify, all 8) | Read the frame, refuse a missing `DIRECTION.md` / retained slot, write the empty sections |
| `skills/splash/test/*.test.ts` (create ×6, extend ×1) | The guards of §3 of the spec |
| `skills/splash/assets/root-template/shared/editorial/*` (create) | The carried mirrors |

---

### Task 0: Tell the other sessions

**Files:** none.

- [ ] **Step 1: List the running sessions.** Use `ListAgents`. Note every session whose name or working directory is a splash worktree other than this one.

- [ ] **Step 2: Send each one the notice** with `SendMessage`:

```
Heads-up from the editorial-chain worktree: docs/splash/2026-09-17-editorial-chain-spec.md starts now.
It will ADD shared/editorial/{derived,frame,retained}.mjs and shared/design-base/run-direction.mjs, and
their mirrors under skills/splash/assets/root-template/shared/. It will MODIFY
skills/storyboard/scripts/propose.mjs (candidates carry `interaction`), skills/splash/scripts/gate-contract.mjs
(REQUIRED_SLOT_FIELDS gains `interaction`), the 8 scaffolds, the chart-video / chart-web / chart-beat type
sheets, and every proof BRIEF.md (front matter + two fenced blocks; no prose touched). Existing exports keep
their signatures. Tell me if you are editing any of these.
```

- [ ] **Step 3: Wait for answers or ten minutes, whichever is first.** If a session reports a conflicting edit, stop and report to the owner.

---

### Task 1: The value block

The one thing shared by both links, and the piece that makes R-C true by construction.

**Files:**
- Create: `shared/editorial/derived.mjs`, `skills/splash/test/a-derived-block-holds-values-only.test.ts`
- Create: `skills/splash/assets/root-template/shared/editorial/derived.mjs` (mirror)

**Interfaces:**

```js
export const DERIVED_BLOCKS = ["precision", "choreography"];
export function renderDerivedBlock(name, value)   // → "```json splash:<name>\n…\n```"
export function readDerivedBlock(text, name)      // → parsed value; throws when absent or duplicated
export function assertNoProse(value)              // throws, naming the path of the offending string
```

- [ ] **Step 1: RED — the round trip and the refusals.** In the new test file:

```ts
import { describe, it, expect } from "bun:test";
import { renderDerivedBlock, readDerivedBlock, assertNoProse } from "../../../shared/editorial/derived.mjs";

describe("the derived block", () => {
  it("should survive a round trip through markdown prose", () => {
    const value = { kind: "scroll", cards: [{ card: 1, gesture: [], changes: ["rows"] }] };
    const text = `## The choreography\n\nAny prose at all.\n\n${renderDerivedBlock("choreography", value)}\n\nMore prose.\n`;
    expect(readDerivedBlock(text, "choreography")).toEqual(value);
  });

  it("should refuse a section that carries two blocks of the same name", () => {
    const one = renderDerivedBlock("precision", { rounding: { unit: "Mt", digits: 1 } });
    expect(() => readDerivedBlock(`${one}\n${one}`, "precision")).toThrow(/two splash:precision blocks/);
  });

  it("should refuse a sentence inside a block", () => {
    expect(() => assertNoProse({ cards: [{ gesture: ["the ten grow into rows, one per country."] }] }))
      .toThrow(/cards\[0\]\.gesture\[0\]/);
  });
});
```

- [ ] **Step 2: GREEN — write `shared/editorial/derived.mjs`.** The fence, one regexp, and the prose rule:

```js
// twin/shared/editorial/derived.mjs
const FENCE = (name) => new RegExp("```json splash:" + name + "\\r?\\n([\\s\\S]*?)\\r?\\n```", "g");

/** A string is prose when it runs past four words or ends a sentence. Identifiers and datum ids do neither. */
function isProse(s) {
  return s.trim().split(/\s+/).length > 4 || /[.!?]$/.test(s.trim());
}

export function assertNoProse(value, path = "") {
  if (typeof value === "string" && isProse(value))
    throw new Error(`A derived block holds values, never prose: ${path || "<root>"} is a sentence.`);
  if (Array.isArray(value)) value.forEach((v, i) => assertNoProse(v, `${path}[${i}]`));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) assertNoProse(v, path ? `${path}.${k}` : k);
}
```

`renderDerivedBlock` calls `assertNoProse` before serialising, so a block that holds a sentence cannot be written in the first place. `readDerivedBlock` collects every match, throws `two splash:<name> blocks` on a second, and throws naming the section when there is none.

- [ ] **Step 3: Mirror and verify.** Copy to `skills/splash/assets/root-template/shared/editorial/derived.mjs` verbatim (line 1 already names the canonical). Then:

```
bun test skills/splash/test/a-derived-block-holds-values-only.test.ts
bun test skills/splash/test/carried-copies.test.ts
```

- [ ] **Step 4: Mutation.** Change `isProse`'s word ceiling from `4` to `400`; the third test must go red. Restore. Delete the mirror; `carried-copies` must go red. Restore.

- [ ] **Step 5: Commit.** `git add shared/editorial/derived.mjs skills/splash/assets/root-template/shared/editorial/derived.mjs skills/splash/test/a-derived-block-holds-values-only.test.ts && git commit -m "feat(editorial): a BRIEF section can carry a block of values that holds no prose"`, then `git log -1 --format=%B | grep -ci "claude\|anthropic"` → `0`.

---

### Task 2: Give every type sheet the frame scrolly's sheets already have

The chain can only supply a frame that is written down. It is, for scrolly (40 sheets × `## Scroll gestures`, `## A choreography must NOT`, `## Precision to assert`, `## Devices the worked example implements`). Video (32 sheets), web (32) and static (33) carry the same material as loose bullets or not at all. This task harvests each family's sheets **and its 40 worked examples** into those sections. It writes no beat content.

**Files:**
- Modify: `skills/chart-video/references/types/*.md` (32), `skills/chart-web/references/types/*.md` (32), `skills/chart-beat/references/types/*.md` (33)
- Create: `skills/splash/test/every-type-sheet-carries-its-frame.test.ts`

- [ ] **Step 1: RED — the census test, before the sheets are touched.**

```ts
const FAMILIES = [
  { skill: "scrolly", heading: "## Scroll gestures" },
  { skill: "chart-video", heading: "## Shot gestures" },
  { skill: "chart-web", heading: "## Reader gestures" },
  { skill: "chart-beat", heading: "## Reading stations" },
];

it.each(FAMILIES)("should give every $skill type sheet its frame", ({ skill, heading }) => {
  for (const sheet of sheetsOf(skill)) {
    const text = readFileSync(sheet, "utf8");
    expect(text, sheet).toContain(heading);
    expect(text, sheet).toContain("## A choreography must NOT");
    expect(text, sheet).toContain("## Precision to assert");
    expect(prohibitionsOf(text).length, sheet).toBeGreaterThanOrEqual(2);
  }
});
```

`prohibitionsOf` reads the bullets under `## A choreography must NOT` and requires each to carry a checkable id in backticks, e.g. `` - `no-slideshow` — replay the static plate's states as a slideshow ``. Scrolly's 40 sheets pass the heading check today and fail the id check: **adding ids to scrolly's existing prohibition bullets is part of this step**, and it is the only edit those 40 sheets get.

- [ ] **Step 2: GREEN, family by family, one commit each.** For each sheet, read the type's own worked-example beat and its existing bullets and write the three sections from them — the gestures that beat actually uses, the prohibitions its own bullets already state, the precision rules it already owes. Where a sheet says nothing about a prohibition, the two universal ones apply and are written in: `` `no-clone` — repeat the worked example's choreography rather than the subject's `` and `` `no-static-replay` — show the static plate's states one at a time ``.

- [ ] **Step 3: Verify.** `bun test skills/splash/test/every-type-sheet-carries-its-frame.test.ts`.

- [ ] **Step 4: Mutation.** Delete one prohibition bullet from one sheet; the test names that sheet and goes red. Restore.

- [ ] **Step 5: Commit** with an explicit pathspec per family; grep the message.

---

### Task 3: The frame the chain supplies

**Files:**
- Create: `shared/editorial/frame.mjs`, its mirror, and `skills/splash/test/the-frame-is-what-the-chain-supplies.test.ts`

**Interfaces:**

```js
export function choreographyFrame(retained, typeSheet)   // { export, shape, vocabulary, prohibitions, constrains, workedExample }
export function requiredAssertions(retained, typeSheet)  // [{ id, because }]
export function parseGesture(cell)                       // "compare + pull back" → ["compare","pull back"]
```

- [ ] **Step 1: RED — `parseGesture`, on real cells from the corpus.**

```ts
expect(parseGesture("**split + rescale**")).toEqual(["split", "rescale"]);
expect(parseGesture("—")).toEqual([]);
expect(parseGesture(" **pull back** ")).toEqual(["pull back"]);
```

- [ ] **Step 2: RED — grounding drives the requirements, and that is the read L1 never had.**

```ts
const base = { format: "static", type: "bar", claim: { shape: "comparison", grounding: "supported" } };
const sheet = { precisionToAssert: ["zero-baseline"] };

it("should require the claim's own datum when the grounding is supported", () => {
  expect(requiredAssertions(base, sheet).map((r) => r.id)).toContain("claim-datum");
});

it("should forbid asserting the claim's datum when the grounding is unverifiable", () => {
  const out = requiredAssertions({ ...base, claim: { ...base.claim, grounding: "unverifiable" } }, sheet);
  expect(out.map((r) => r.id)).not.toContain("claim-datum");
  expect(out).toContainEqual({ id: "rounding-widened", because: "grounding" });
});

it("should require both compared values for a comparison claim", () => {
  expect(requiredAssertions(base, sheet).map((r) => r.id)).toEqual(
    expect.arrayContaining(["claim-datum", "comparison-left", "comparison-right", "zero-baseline"]),
  );
});
```

- [ ] **Step 3: GREEN — write `shared/editorial/frame.mjs`.** `requiredAssertions` is four small blocks, one per `because` value (`grounding`, `claim-shape`, `type-sheet`, `format`), each returning ids and nothing else. `choreographyFrame` reads the sheet's three sections, maps `format` → `shape` (`static→frame`, `web→pointer`, `video→time`, `scrolly→scroll`), and carries `retained.interaction.kind` and `size` into `constrains`. **It returns no rows, no cards and no shots.** Add that sentence as a comment above the export; it is the guard rail for the next reader.

- [ ] **Step 4: Mirror, verify, mutate.** `bun test skills/splash/test/the-frame-is-what-the-chain-supplies.test.ts skills/splash/test/carried-copies.test.ts`. Mutation: make `requiredAssertions` ignore `grounding` (return the `supported` branch always) — the second test goes red.

- [ ] **Step 5: Commit** with pathspec; grep the message.

---

### Task 4: The retained proposal, and the interaction that was never recorded

**Files:**
- Create: `shared/editorial/retained.mjs` + mirror
- Modify: `skills/storyboard/scripts/propose.mjs` (`formatCandidates` carries `interaction`), `skills/splash/scripts/gate-contract.mjs` (`REQUIRED_SLOT_FIELDS`)
- Create: `skills/storyboard/test/a-candidate-carries-its-interaction.test.ts`

- [ ] **Step 1: RED — the candidate carries the catalogue's interaction.**

```ts
it("should give every format candidate the catalogue's interaction for its medium and format", () => {
  for (const candidate of formatCandidates({ medium: "chart", type: "bar" })) {
    const entry = visualCatalogueEntries().find((e) => e.id === candidate.catalogueId);
    expect(candidate.interaction, candidate.id).toEqual(entry.interaction);
  }
});

it("should make interaction a field gate 2 cannot close without", () => {
  expect(REQUIRED_SLOT_FIELDS).toContain("interaction");
});
```

- [ ] **Step 2: GREEN — wire it.** In `propose.mjs`, `formatCandidates` looks the entry up through the existing `:341 visualCatalogueEntries` (today called only from tests — this is the call that un-orphans it) and copies `{ kind, promise }` onto the candidate. In `gate-contract.mjs`, add `"interaction"` to `REQUIRED_SLOT_FIELDS`; the parity fixtures generate from that list, so `bun test skills/splash/test/where.test.ts` must be run and its fixture strings updated in the same commit.

- [ ] **Step 3: GREEN — `shared/editorial/retained.mjs`.** `retainedFrom(meta, slotId)` reads `parseStoryboard`'s output; `readRetained(storyDir, slotId)` throws naming the *one* missing field rather than "invalid slot"; `retainedFromBrief(beatDir)` builds the same object from `parseBriefFrontMatter` + the catalogue entry for `medium`/`format`, and throws when the front matter pins no `grounding` — it never assumes one.

- [ ] **Step 4: Verify.** `bun test skills/storyboard/test/a-candidate-carries-its-interaction.test.ts skills/splash/test/where.test.ts skills/splash/test/carried-copies.test.ts`.

- [ ] **Step 5: Mutation.** Drop `interaction` from the candidate; red. Remove it from `REQUIRED_SLOT_FIELDS`; red. Make `retainedFromBrief` default `grounding` to `"supported"`; a new test asserting the throw goes red. Restore each.

- [ ] **Step 6: Commit** with pathspec; grep the message.

---

### Task 5: One direction per production run

**Files:**
- Create: `shared/design-base/run-direction.mjs` + mirror, `skills/splash/test/a-production-run-has-one-direction.test.ts`

**Interfaces:** `composeRunDirection({ newsroom, filed, subject, textPerRegister, grounds })`, `writeRunDirection(storyDir, chosen)`, `readRunDirection(dir, { stopAt })` — the last one mirrors `colour.mjs:58 readPalette` signature for signature, so a reader who knows one knows the other.

- [ ] **Step 1: RED — the read walks up and stops where it is told.**

```ts
it("should read the run direction from a beat directory up to the story root", () => {
  writeRunDirection(story, { id: "composed-le-monde", origin: "NEWSROOM.md + subject", palette: {/* … */} });
  expect(readRunDirection(join(story, "beats", "1-emissions"), { stopAt: story }).id).toBe("composed-le-monde");
});

it("should refuse rather than default when no DIRECTION.md is reachable", () => {
  expect(() => readRunDirection(bare, { stopAt: bare })).toThrow(/DIRECTION\.md/);
});
```

- [ ] **Step 2: RED — the corpus rule.** Every story under `stories/` that holds beats has exactly one `DIRECTION.md`; no source file under `stories/` reads `docs/design-base/directions` or names one of the three filed ids. `proof/` is exempt **by explicit path prefix**, never by a heuristic on the name — write the exemption as `p.startsWith("proof/")` and say in the header comment why a heuristic was refused.

- [ ] **Step 3: GREEN.** `composeRunDirection` is thin over `compose.mjs:559 composeDirections`: it takes the composed set, picks the one whose origin is the newsroom + subject, and returns the offered and refused sets beside it so the refusal is inspectable.

- [ ] **Step 4: Verify and mutate.** `bun test skills/splash/test/a-production-run-has-one-direction.test.ts skills/splash/test/carried-copies.test.ts`. Mutation: add a second `DIRECTION.md` to the fixture story; red. Make one fixture beat read the filed directions; red.

- [ ] **Step 5: Commit** with pathspec; grep the message.

---

### Task 6: Scrolly — parse and check what 40 beats declare

Scrolly first, because its corpus is the only one that is complete (40/40 tables) and its type sheets already carry the frame. What works here is the template for the other three.

**Files:**
- Create: `skills/scrolly/scripts/choreography.mjs`, `skills/scrolly/scripts/precision.mjs`
- Create: `skills/scrolly/test/parse-the-declared-choreography.test.ts`

**Interfaces:** `parseChoreography(briefText, { states })`, `checkChoreography(declared, frame)`, `parsePrecision(briefText, ctx)`, `checkPrecision(declared, { required, data })`.

- [ ] **Step 1: RED — parse a real beat's real table.** Use `proof/scrolly-bar-top-emitters-2024/BRIEF.md`, unmodified, as the fixture:

```ts
const declared = parseChoreography(readFileSync("proof/scrolly-bar-top-emitters-2024/BRIEF.md", "utf8"), { states });
expect(declared.kind).toBe("scroll");
expect(declared.cards).toHaveLength(6);
expect(declared.cards[1]).toEqual({ card: 2, gesture: ["regroup"], changes: ["spread", "rest"] });
expect(declared.cards[4].gesture).toEqual(["stack"]);
```

`changes` comes from the drive module's own per-card states — the comparison `skills/scrolly/assets/reveal.mjs assertStates` already performs — read, not re-derived. The prose columns are dropped on the floor; the parser must not return them.

- [ ] **Step 2: RED — the checker catches a prohibition, and only a prohibition.**

```ts
it("should return no violation for a legal choreography that is nothing like the worked example", () => {
  expect(checkChoreography(declared, frame)).toEqual([]);
});

it("should catch a card that changes nothing — the slideshow prohibition", () => {
  const frozen = { ...declared, cards: declared.cards.map((c) => ({ ...c, changes: [] })) };
  expect(checkChoreography(frozen, frame).map((v) => v.id)).toContain("no-slideshow");
});

it("should catch a gesture outside the type's vocabulary as a vocabulary note, not a failure", () => {
  const odd = { ...declared, cards: [...declared.cards, { card: 7, gesture: ["kaleidoscope"], changes: ["x"] }] };
  expect(checkChoreography(odd, frame).map((v) => v.severity)).toEqual(["note"]);
});
```

- [ ] **Step 3: GREEN.** `parseChoreography` finds the `| card |` table under the choreography heading, splits rows, runs column 3 through `parseGesture`, and joins `states`. `checkChoreography` returns `[{ id, severity, says }]` — `severity: "violation"` for a prohibition id from the sheet, `"note"` for an unknown gesture atom. It never compares against an expected choreography; add that as a comment on the export.

- [ ] **Step 4: `parsePrecision` / `checkPrecision`.** Parse the `## Precision` bullets' bold leads into rule ids, the per-card asserted datum ids, and `values` from the beat's frozen `data.csv` at the declared rounding. `checkPrecision` does exactly two things: every `required.id` is covered by `asserts`, and every `values` entry still equals the data at `rounding`.

- [ ] **Step 5: Verify and mutate.** `bun test skills/scrolly/test/parse-the-declared-choreography.test.ts`. Mutation: make `checkChoreography` compare `declared` to `frame.workedExample`'s parse and fail on difference — the first test goes red, which is the point of it. Restore.

- [ ] **Step 6: Commit** with pathspec; grep the message.

---

### Task 7: Video — the six-row event table

**Files:** `skills/chart-video/scripts/{choreography,precision}.mjs`, `skills/map-beat/scripts/{choreography,precision}.mjs` (video half), `skills/chart-video/test/parse-the-declared-choreography.test.ts`.

- [ ] **Step 1: RED — on `proof/video-bar-top-emitters-2024/BRIEF.md`, unmodified.**

```ts
expect(declared.kind).toBe("time");
expect(declared.shots.map((s) => s.shot)).toEqual(["establish", "reference", "reveal", "subject", "conclusion", "hold"]);
expect(declared.shots[2].gesture).toEqual(["split", "rescale"]);
expect(declared.shots[0].gesture).toEqual([]);            // the table's "—"
expect(declared.shots[3].asserts).toEqual(["five-sum", "china-2024"]);   // column five, as datum ids
```

- [ ] **Step 2: RED — `start` and `duration` come from the beat's own `timing-contract.ts`, not from the table**, and the checker catches a ladder out of `EVENT_ORDER` or with a gap.

- [ ] **Step 3: GREEN.** Same parser skeleton as scrolly with five columns instead of four; the timing join reads the beat's contract through the existing `checkTiming` shape (`chart-video/assets/timing.ts:81`) rather than re-parsing it.

- [ ] **Step 4: Mirror the map-beat half** and verify with `bun test skills/chart-video/test/parse-the-declared-choreography.test.ts skills/splash/test/video-helper-parity.test.ts skills/splash/test/carried-copies.test.ts`.

- [ ] **Step 5: Mutation.** Reorder two shots in the fixture copy; red on the ladder assertion. Restore. **Negative mutation:** replace the fixture's gestures with a different legal set — must stay green.

- [ ] **Step 6: Commit** with pathspec; grep.

---

### Task 8: Web — the `interaction` object

**Files:** `skills/chart-web/scripts/{choreography,precision}.mjs`, `skills/map-web/scripts/{choreography,precision}.mjs`, `skills/chart-web/test/parse-the-declared-interaction.test.ts`.

- [ ] **Step 1: RED — parse the object, not the prose.** The declaration lives in `render-directions-web.mjs` as `const interaction = { earns, controls: [{ question, gesture, changes }] }`. The parser imports the module and reads the export; it does not regexp the file.

```ts
expect(declared).toEqual({
  kind: "pointer", promiseSource: "slot", keyboard: true, degradesTo: "static-frame",
  controls: [
    { order: 1, gesture: "find-your-own-case", input: "hover" },
    { order: 2, gesture: "ask-a-mark", input: "hover" },
  ],
});
```

Note what is **not** in it: `earns`, `question` and `changes` are sentences and stay in the module and in the BRIEF. `promiseSource: "slot"` is how the block says "the promise is pinned elsewhere" — `interaction-promises-are-kept.test.ts` is that elsewhere and is not duplicated here.

- [ ] **Step 2: RED — a gesture outside the seven-atom vocabulary is a violation here, not a note** (unlike scrolly: the web vocabulary is closed, and the spec says so). Assert both behaviours in the same file so the asymmetry is deliberate and visible.

- [ ] **Step 3: GREEN**, then `bun test skills/chart-web/test/parse-the-declared-interaction.test.ts skills/splash/test/interaction-promises-are-kept.test.ts`.

- [ ] **Step 4: Mutation.** Invent a gesture; red. Drop `degradesTo`; red.

- [ ] **Step 5: Commit** with pathspec; grep.

---

### Task 9: Static — the shape and the checker, with no corpus behind them

0 of 40 static beats declare a reading order (spec §1.3). This task builds the shape and the checker so a declaration *can* be made and checked; it writes none.

**Files:** `skills/chart-beat/scripts/{choreography,precision}.mjs`, carried into `map-beat` (static half), `image-beat`, `dw-beat` (precision only); `skills/splash/test/a-static-frame-has-a-reading-order.test.ts`.

- [ ] **Step 1: RED — on a hand-written fixture BRIEF, not on a proof beat.**

```ts
const declared = parseChoreography(fixtureBrief, { marks, annotations });
expect(declared.kind).toBe("frame");
expect(declared.stations.map((s) => s.station)).toEqual(["establish", "reveal", "subject", "conclusion"]);
expect(declared.claimLands).toBe("subject");
expect(JSON.stringify(declared)).not.toMatch(/duration|start|fps|frame\b.*\d/);  // a static has no clock
```

- [ ] **Step 2: RED — the four refusals.** `kind: "none"` is refused by name, with the message `a static frame is choreographed in space, not in time — it is never "none"`; fewer than two stations is refused; stations out of `STATION_ORDER` or duplicated are refused; an `entry` naming a role the composition does not contain is refused.

- [ ] **Step 3: GREEN**, then carry to `map-beat` / `image-beat` / `dw-beat` with the `// twin/` line and verify `bun test skills/splash/test/a-static-frame-has-a-reading-order.test.ts skills/splash/test/carried-copies.test.ts`.

- [ ] **Step 4: Mutation.** Return `{ kind: "none" }` from the parser; red on the named message. Add a `duration` to the fixture; red.

- [ ] **Step 5: Commit** with pathspec; grep.

---

### Task 10: The two corpus guards, switched on by `derived: v1`

They land before any beat is migrated, so they pass over an empty set and the tree stays green. Task 12 is what gives them work.

**Files:**
- Create: `skills/splash/test/a-choreography-is-declared-and-its-own.test.ts`, `skills/splash/test/precision-covers-what-the-chain-requires.test.ts`

- [ ] **Step 1: The walk.** Both files walk every directory holding a `BRIEF.md` (the tree's own definition of a beat, as `credit-anchors-to-the-frame-bottom.test.ts:81` has it), keep the ones whose front matter says `derived: v1`, and assert nothing about the rest. Add the count to the header comment the way this tree does, so a drop in coverage is visible in a diff.

- [ ] **Step 2: The three assertions of L5, and no fourth.** Declared and structurally complete for its `kind`; not deep-equal to its type's `workedExample` block and carrying its own beat's datum ids; `checkChoreography(declared, frame)` returns no `violation`. Write into the header comment: *this file holds no expected-choreography fixture and calls no generator; a future edit that adds one has reinstated the clone factory.*

- [ ] **Step 3: The two assertions of L4.** Every `requiredAssertions` id is covered by the block's `asserts`; every `values` entry equals the frozen data at the declared `rounding`.

- [ ] **Step 4: The negative mutations, run now on a scratch copy of one beat.** Reword every sentence and table cell → green. Reformat the block's JSON onto one line → green. Replace the choreography with a different legal one → green. A red here fails the task.

- [ ] **Step 5: The positive mutations.** Make one block's number drift from `data.csv` → red. Copy a worked example's block into a beat → red on "its own". Break a prohibition → red.

- [ ] **Step 6: Commit** with pathspec; grep.

---

### Task 11: Migration A — repair the front matter

**Files:** `skills/splash/scripts/migrate-briefs.mjs` (create), the 41 BRIEFs it repairs.

- [ ] **Step 1: RED — a test that states the corpus's current defects as facts.** 40 static BRIEFs carry `size` and `type` but no `format`; `proof/co2-suisse/BRIEF.md` has no front matter at all. Assert the repaired state: every one of the 160 has front matter with `format`, `type`, and `grounding`.

- [ ] **Step 2: GREEN — `migrate-briefs.mjs --front-matter`.** It edits only the front-matter block: adds `format: static` where the directory name and the absent `format` agree, writes a full block for `co2-suisse`, and adds `grounding: supported` **only** where the beat's own renderer already refuses when the data stops supporting its claim (the `assert*` calls 143 beats carry). A beat where that cannot be established is listed, not defaulted.

- [ ] **Step 3: Run it, inspect the diff, verify.** `git diff --stat proof/` must show 41 files and only front-matter hunks. `bun test skills/splash/test/delivered-size-matches-the-pin.test.ts` (the existing reader of this front matter) must stay green.

- [ ] **Step 4: Commit** `proof/` and the script with an explicit pathspec; grep.

---

### Task 12: Migration B — the harvest

Parses each beat's own declaration into its blocks. Writes no content, replaces no prose.

**Files:** `skills/splash/scripts/migrate-briefs.mjs` (extend), the 106 BRIEFs it migrates, `docs/splash/2026-09-17-declarations-owed.md` (create — the worklist).

- [ ] **Step 1: Dry run first.** `bun skills/splash/scripts/migrate-briefs.mjs --harvest --dry-run` prints, per family, how many beats parse and names every one that does not. Expected from the spec's census: scrolly 40/40, video 39/40, web 27/40, static 0/40. **A number that differs from the census is a finding — stop and report it to the owner rather than adjusting the parser to reach it.**

- [ ] **Step 2: Write the worklist** to `docs/splash/2026-09-17-declarations-owed.md`: the 54 beats that owe a declaration, by name, with which export and which section is missing. This document is the deliverable for the part of the work a person does.

- [ ] **Step 3: Migrate scrolly (40).** `--harvest --family scrolly` inserts the two blocks into the existing sections and adds `derived: v1`. Then `bun test skills/splash/test/a-choreography-is-declared-and-its-own.test.ts skills/splash/test/precision-covers-what-the-chain-requires.test.ts` — now over 40 real beats. Commit.

- [ ] **Step 4: Migrate video (39), then web (27)**, one command and one commit each, running the same two named tests after each. A beat the guard rejects is **reverted from the migration and added to the worklist** — never silenced by widening the guard.

- [ ] **Step 5: Confirm the negative mutations on the real corpus.** Pick three migrated beats across three families, reword their prose, reflow their tables, reformat their JSON; the two guards stay green. Restore.

- [ ] **Step 6: Report the coverage to the owner** — 106 guarded, 54 owed, by family — before moving on.

---

### Task 13: Wire the scaffolds, and close the chain

**Files:** the 8 `scaffold-*.mjs`; `skills/splash/test/the-chain-is-read-end-to-end.test.ts` (create); `skills/splash/test/skill-md-matches-code.test.ts` (extend); the 8 `SKILL.md` run sections.

- [ ] **Step 1: RED — the link guard.** On a fixture story, `readRetained → readRunDirection → requiredAssertions → choreographyFrame → parseChoreography → checkChoreography` all resolve *by being called*, not by being imported. And: each of the 8 scaffolds imports the frame and the checker pair for its own format.

- [ ] **Step 2: GREEN — the scaffolds.** Each one, before writing anything, resolves the retained slot and `DIRECTION.md` and **refuses** on either being missing, in the shape `paletteReachable` / `paletteRefusalMessage` already established (name the exact command that produces the missing file). `chart-beat/scripts/static-plumbing.mjs:175 composedDirectionDefault` becomes the single-direction reader for `DIRECTION.md`, with `--filed` kept as the catalogue-only escape.

- [ ] **Step 3: GREEN — the empty section.** Each scaffold writes `## Precision` and `## The choreography` containing the export's table headers, the type sheet's vocabulary and prohibitions quoted as an HTML comment for the author, and **no rows** and no block. The beat gains `derived: v1` only when its author fills the table and runs `migrate-briefs.mjs --harvest --beat <dir>`. Assert the emptiness in the test: a freshly scaffolded beat has zero table rows and no `splash:` block.

- [ ] **Step 4: Extend `skill-md-matches-code.test.ts`** so each export's SKILL.md run section names the four entry points it calls, and update the 8 SKILL.md files.

- [ ] **Step 5: Verify.** `bun test skills/splash/test/the-chain-is-read-end-to-end.test.ts skills/splash/test/skill-md-matches-code.test.ts skills/splash/test/carried-copies.test.ts`, then `bun run test:lanes`.

- [ ] **Step 6: Mutation.** Delete the frame import from one scaffold; red. Make a scaffold pre-fill one table row; red on Step 3's emptiness assertion — that is the clone factory caught at its source. Rename `checkChoreography` without touching SKILL.md; red.

- [ ] **Step 7: Commit** with pathspec; grep the message.

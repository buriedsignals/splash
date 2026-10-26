# Building a scrolly zone kit from a scrolly proof

> Gesture kits (`<format>/<slug>.gestures/`) compose the staging from the story instead of keeping the worked
> example's; their contract is `gestures/GRAMMAR.md`. This file describes the per-type kits, which stay the fallback.

One reference kit follows this pattern: `scrolly/bar-and-column/`. Read it, and `craft/README.md`
(the contract) and `web/PATTERN.md` (whose §1 copy rules, refusal wrapper and pitfalls all apply
here), before writing a second. This file is how to meet the contract for `scrolly`.

## 0. Find the proof

`skills/scrolly/SKILL.md`, "Per-type sheets", names the worked example for each type
(`proof/scrolly-<…>/`). All 40 have the same shape: `render-directions-scrolly.mjs` (data, asserts,
words, the STATES table), one `Directed<Type>Scrolly.tsx` (the marks), one `<type>-drive.mjs` (the
paint function `renderScrolly`'s `reveal` inlines), `BRIEF.md` (the choreography table). Read the
type sheet `skills/scrolly/references/types/<type>.md` for what the choreography must not do.

Run the skill's verification on the committed page first, and LOOK at it with and without a script:

```sh
bun skills/scrolly/scripts/verify-scrolly.mjs proof/scrolly-<…>/renders/creme.html
```

(Bar proof: `0 failures, 15 notes`, ~25 s.) verify-scrolly writes no screenshots; take them with the
kit's `shootCards` (§2) from a scratch script — that is how the bar proof's broken no-JS frame was
found (pitfalls).

## 1. Copy the component and the drive — with `cp`, then patch with a script

`cp` the `Directed<Type>Scrolly.tsx` and the `*-drive.mjs` into `scrolly/<slug>/`. The drive stays
byte-identical (it is the choreography); the runner reads it with `readFileSync` and hands it to
`renderScrolly` as text. Patch the component only with an exact-string script that asserts each old
string occurs once (`web/PATTERN.md` §1 — a formatter on save rewraps the file). Allowed changes:
those of `web/PATTERN.md` §1, plus **the no-JS picture** when the proof does not have one (pitfall 1).

The PROOF RUNNER is not copied: its `import { renderScrolly } from "../../skills/scrolly/…"` resolves
only from `proof/`. The kit imports it inside `refusing` through the resolver:
`await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"))`.

## 2. `scrolly.mjs` — the shared half (`_shared/scrolly.mjs`)

`_shared/scrolly.mjs` is the scrolly analogue of `_shared/web.mjs`, and builds on it
(`pickDirection`, `plainRegisters` from `./web.mjs`). Import it as `./scrolly.mjs`: the harness copies `_shared/`
flat beside the kit, so no kit carries its own copy. Map scrollys also import `./scrolly-map.mjs`
(`_shared/scrolly-map.mjs`). It gives:

- `scrollySkill(here, …parts)` — finds the scrolly skill wherever the root put it.
- `renderBeatScrolly({ here, render, states, textPerRegister, evidenceLevels })` — picks the ONE
  direction exactly as static/web kits do, calls your `render({ label, direction, outDir })`, spawns
  `verify-scrolly.mjs <page>` (continuous scroll at 1600×900, 1280×800, 375×812; reduced motion;
  JS off; typefaces), prints its summary and every `FAIL`, then — with that browser closed — launches
  ONE browser for `shootCards`. A verification failure is a refusal (`renders/` emptied, exit 1), with
  card 1's screenshot printed as `look at:` for diagnosis.
- `shootCards(here, file, outDir, { states })` — for each card, scrolls the card's centre onto the
  lane's centre line (where `data-progress` is exactly the card's index), waits until the revealed
  visual's painted `data-position` has caught the scroll (`reveal.mjs` eases it), and screenshots at
  1600×900; then card 1 at 375×812 and the page with JavaScript off. It reads back the state the
  visual published (`data-state`) and REFUSES if a screenshot does not show its card's state.
  Output: `renders/<label>-card-<n>.png` (one per card; `render_beat` lists every PNG in renders/),
  `shots/` (the same plus `card-1-375x812.png`, `nojs-1600x900.png`).

## 3. `render-beat.mjs` — the proof's runner minus its subject

Skeleton (see the bar kit for the full file):

```js
const STATES = [ /* the proof's, verbatim */ ];
const CARDS = [ /* the runner's own step ids, one per state */ ];
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");      // inside refusing
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  // REQUIRED by name; typeof === "function" for every function field, and for every key of
  // cards / notes (the per-card word functions)
  // the proof's arithmetic, generic → one frozen reading `r` handed to every word function
  // shared guards, beat.check(r), the type's own refusals
  // words through plain(); each card's OWED figure checked; every other figure checked (below)
  await renderBeatScrolly({ here: HERE, states: STATES, textPerRegister, evidenceLevels,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      return renderScrolly({ steps, reveal: { element, states: STATES, driver, apply }, title: titleForms,
        eyebrow, source, ground: direction.ground, type: { /* the proof's */ }, lang, outDir, name: `${label}.html` });
    } });
});
```

### Who computes what

The STATES table and the drive are the choreography: fixed. The proof's runner computes, beside its
words, the figures the choreography needs (bar: the run whose sum stays under the leader, the tail's
sum) — that arithmetic moves into the kit, generic. Everything a card might STATE goes into one
reading object `r` (frozen), and the 12B words each card as `cards.<id>(r)`; header notes, row names
and the alt the same way. Step ids, CSS keys (`r1…rN`) and note slots are the runner's own.

### Card prose that carries a number is checked

Two checks, both in the bar runner, both naming the card and quoting its sentence:

1. **What each card owes**: the figure its picture shows must be in its words, as `format()` prints
   it (bar: card 2 `format(r.othersSum)`, card 5 `format(r.stackSum)`, …). This catches a recomputed
   or typed value.
2. **Every other figure**: each number in a card, a note or the alt must round to a figure of `r` at
   the precision it is written with (`2,5` matches 2.47 ± 0.05; `69 %` matches 68.9). The decimal
   mark is read off the beat's own `format(1.5)`. Years 1900–2100 and digits glued to letters
   (`CO2`, `10e`) pass. Spelled numbers ("cinq") are not checked — the title's figures go through
   `assertHeadlineNumbersDrawn`, the count through `check(r)`. The limits card (the journalist's own
   words) is not checked.

Keep the `known` list to figures `r` really carries — adding ranks 1…N, as a first draft did, lets a
wrong "the next 6" through.

### The limits go on the last card

`renderScrolly` has a title, an eyebrow and a credit, and no standfirst. Every chart proof's last
card states the accounting; name that field `limits` so `applyStoryboard` holds it to the
journalist's named limits.

## 4. `CONTRACT.md`, `beat.example.mjs`

As `web/PATTERN.md` §3–4, plus a card table (card | what the picture does | which field words it)
and a table of `r`. `beat.example.mjs` reproduces the proof's every sentence through the word
functions, including its title ladder (array, takeaway first) — if it cannot, the kit is not handing
the 12B what it needs. The bar example reproduces the proof's alt verbatim, including its
"de les États-Unis" (the proof's own article bug).

## 5. Verify (required)

```sh
# scratch story: PALETTE.md, kit + _shared copied flat into beats/1, data.json from the proof's
# data.csv ({ columns: [{ name, type }], rows: [[…]] }), beat.example.mjs → beat.mjs
cd ~/.splash-harness/bench/root && bun stories/zz-scrolly-<slug>/beats/1/render-beat.mjs
```

Expect `rendered renders/<label>.html`, `verify-scrolly (scrolly): 0 failures, N notes` (N as the
proof's), one `renders/<label>-card-<n>.png` per card and `look at: …card-1.png`. Bar: ~29 s wall
clock (verify-scrolly ~25 s, screenshots ~4 s). LOOK at every card's PNG next to the proof's (take
the proof's with `shootCards` on its committed page): the only difference must be the palette
(proof: the filed `creme` direction). Look at `shots/nojs-1600x900.png` and `shots/card-1-375x812.png`.
Then: mutate `data.json` so the title is false (keep any `whole`/World row consistent, or the whole
guard refuses first) → `REFUSED`, no `renders/`; break one card's number → the runner names that
card. Delete the scratch story.

ONE render, ONE browser at a time — verify-scrolly and the screenshots already run one after the
other; never start a second render beside a running one.

## Pitfalls met building the reference kit

1. **The proof's no-JS frame is blank.** `bar-drive.mjs` seats every bar in the reader's pixels, so
   without a script the SVG rects have no geometry and every name and value sits at the stage's
   top-left, overprinted — although the component's own comment promises "the last card's picture,
   for a reader without a script". verify-scrolly's JS-off check passes it (it asks only that one
   frame is `active`, every card's prose is present and the steps scroll). 33 of the 40 scrolly
   proofs have no `<noscript>` (the 7 map proofs do); expect the same in any whose drive does the
   layout. The kit's fix, patched in by script: a `<noscript><style>` (the map proofs' device) that
   hides the drive's layer and shows a static grid of the last card's rows, on the same scale from
   zero, in the same registers and colours. Look at `nojs-1600x900.png` every time.
2. **The drive's scale has one top.** The bar drive scales every picture to the first row; the tail
   laid end to end runs off it when the others outweigh the leader. The kit refuses that (raise
   `drawCount`) rather than letting bars cross the value column. Look in each drive for the length
   it treats as the maximum and refuse data that exceeds it.
3. **A choreography is about a particular row.** The bar drive paints row 0 in the accent and stacks
   rows 1…k against it, so the subject must be the leader; the kit refuses another subject by name.
4. **A screenshot taken right after a jump shows a blend.** `reveal.mjs` eases the painted position
   toward the scroll (FOLLOW_MS); wait for `data-position` to equal `data-progress`, and check the
   published `data-state` against the card's state — `shootCards` does both.
5. **Everything else in `web/PATTERN.md`'s pitfalls applies**: import `beat.mjs` inside `refusing`;
   `plain()` every word (the proof wrote U+00A0 before `%` and `pays`; the kit drops it);
   `assertHeadlineNumbersDrawn` gets the computed figures the plate writes (bar: the tail's sum,
   the run's sum and count).
6. **`assertDrawsClaimColumn` compares raw cells**: a beat that rescales (tonnes → billions, as the
   bar example does) would be refused whenever STORYBOARD.md names `claimColumn`. Shared with the web
   bar kit; not fixed here.
7. **The phone layout is the proof's.** At 375×812 card 1 keeps the name column's width (measured
   for the names that arrive on card 3) to the left of the thin rows, as the proof does. Desktop
   first: reported, not patched.

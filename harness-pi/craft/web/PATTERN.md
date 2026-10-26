# Building a web zone kit from a web proof

Two reference kits follow this pattern: `web/bar-and-column/` (a page with a control: the `stack`
vocabulary) and `web/line/` (a page with no control: hover/tap/keyboard only). Read both before
writing a third; `craft/README.md` is the contract, this file is how to meet it for `web`.

## 0. Find the proof

`skills/chart-web/SKILL.md`, "The type index", names the web worked example for each type
(`proof/web-<type>-…`). Read its `render-directions-web.mjs`, its `Directed<Type>Web.tsx`, its
`BRIEF.md` (the gesture argued) and the vocabulary file it imports from `skills/chart-web/assets/`.
Run the skill's verification on its committed page first, so you know the baseline you must match:

```sh
bun skills/chart-web/scripts/verify-web.mjs --file proof/web-<…>/renders/creme.html --shots --out <scratch>/proof
```

(Both reference proofs pass: bar 379 checks, line 116 checks + 1 skip.)

## 1. Copy the component — with `cp`, then patch with a script

Copy `Directed<Type>Web.tsx` into `web/<slug>/` with `cp`. Do NOT round-trip it through an editor
tool that formats on save: a formatter hook here rewrapped the whole 650-line file on the first edit,
which turns "copied verbatim" into a 140-line diff. Patch it with a small script (exact-string
replace that asserts each old string occurs once). The only changes allowed:

- **An import that reaches into `skills/`** (`../../skills/chart-web/assets/<vocab>.ts`) resolves
  only from `proof/<beat>/`. A beat sits at `stories/<slug>/beats/<id>/`, and an installed root has
  no `skills/` at all. Replace it with a top-level dynamic import through the shared resolver:

  ```ts
  import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
  const { assertStackDeclaration, stackCss /* … */ } =
    await import(skillScriptFrom(import.meta.dirname, "chart-web", "assets", "stack.ts"));
  type StackDeclaration = Parameters<typeof assertStackDeclaration>[0];
  ```

  Bun runs the `.ts` directly; web SSR is not bundled, so the dynamic specifier is fine. Do NOT copy
  the vocabulary file into the kit — it would drift from the skill silently.
- **A constant about the proof's subject or locale** becomes a prop with the old value as default
  (bar: the French `" : "` in the mark's `aria-label` → `nameValueSeparator`).
- **A placement chosen for the proof's series** becomes a prop with the proof's value as default,
  and the runner computes it for the story's data (line: `referenceNoteX` / `referenceNoteBelow` /
  `peakNoteSide`; the proof put the rule's name at the left end under the rule because ITS series is
  low there — another series is not).

Imports through `#shared/*` stay as they are.

## 2. `render-beat.mjs` — the proof's runner minus its subject

Skeleton (see the two kits for the full files):

```js
import { DirectedXWeb } from "./DirectedXWeb.tsx";
import { applyStoryboard, assertNumbers, /* … */ } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");      // INSIDE refusing — see pitfalls
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  // REQUIRED fields + typeof checks for every function field
  // shared guards, beat.check(), the type's own refusals
  // the proof's arithmetic, generic: every reading the interaction answers with
  // words from beat.mjs, each passed through plain()
  // textPerRegister exactly as the proof builds it
  // interaction plan (earns / controls) built from computed counts — English is fine, it is metadata
  await renderBeatWeb({
    here: HERE, textPerRegister, evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      return renderWeb({ lang: beat.lang ?? storyLanguage(HERE) ?? "en", component: DirectedXWeb,
        props: { /* …, */ direction, ground: direction.ground, accent: direction.accent, interaction },
        outDir, name: `${label}.html` });
    },
  });
});
```

What `_shared/web.mjs` does for you, so no kit repeats it:

- `refusing(here, body)` empties `renders/` and `shots/` first, runs the body, and turns ANY throw
  into `REFUSED — <message>` + exit 1 with `renders/` empty.
- `renderBeatWeb` picks the ONE direction exactly as the static kits do (the run's `DIRECTION.md`
  if reachable, else the first composed from `PALETTE.md` + the filed directions; families fitted to
  `textPerRegister` after `plain`), calls your `render`, then runs
  `skills/chart-web/scripts/verify-web.mjs --file <page> --shots --out <beat>/shots`, prints its
  summary (counts, skips, every failure), copies `shots/fit-1920x950.png` to
  `renders/<label>.png` and prints `look at: <absolute png>`. A verification failure is a refusal:
  `renders/` emptied, exit 1, but `shots/` kept and its desktop frame printed as `look at:` so the
  model can see what failed.
- `chartWeb(here, …parts)` finds the chart-web skill wherever the root put it; `plain(s)` replaces
  U+202F/U+00A0 (what `toLocaleString("fr-FR")` emits), which otherwise refuse every face;
  `storyLanguage(here)` reads `language:` from STORYBOARD.md.

What the runner must still do itself (same list as the static kits, `craft/README.md`):

- `applyStoryboard(beat, HERE)` right after importing the beat. Name the standfirst field `limits`
  and the credit `source` so the defaults apply; take `[beat.title].flat()[0]` (web has one form —
  type is a fixed CSS size, the browser wraps).
- `REQUIRED` by name, then `typeof === "function"` for every function field.
- `assertNumbers`, `assertLegibleLabels` (when values are printed on the marks), `assertOnePerX`
  (anything keyed by year), `beat.check()`, `assertDrawsClaimColumn`, `assertHeadlineNumbersDrawn`.
- The type's own refusals, each message naming what to change in `beat.mjs`.
- No size/frame argument: a web page is fluid, `assertBeatMayEnter`/`directedFrame` are static-only.

### Who computes what

The gesture is the type's design, so the ARITHMETIC behind every reading the interaction gives is
the kit's, generalised from the proof's runner (bar: `followersNeeded` over the full ranking,
which ranks may be offered in the control, the scale's top holding the tallest tower; line:
`woundBackTo`, distance under the peak, last-vs-year, fitted ticks). The 12B supplies data, the
claim's `check()`, and WORDS — as plain strings, or as small functions that receive the computed
reading (`detail(c)`, `note(o)`, `total(o)`) and return a sentence. The runner verifies the words
that carry a number against that number (bar: `note()`/`total()` must contain `format(sum)`;
`announce()` must contain the name). Keys used in CSS selectors and ids are the runner's own
(`r1…rN`), never the 12B's names — a quote or an accent in a name would break the selector or the
slug.

## 3. `CONTRACT.md`

Start from `web/line/CONTRACT.md`: what is already designed (including the interaction, in one
paragraph), the fields table, "Reading the data" with NEUTRAL column names, the same Rules section
as the static kits (copy it), plus: render with format `web`, look at the PNG it names. Describe every
field of each reading object the word functions receive.

## 4. `beat.example.mjs`

The proof's own content as a `beat.mjs`: every number computed from `data.json`
(`{ columns: [{ name, type }], rows: [[…]] }`), the title as the literal takeaway, `lang` set to the
proof's language (the proof catalogue is French). Reproduce the proof's sentences exactly through the
word functions — if you cannot, the kit is not handing the 12B what it needs.

## 5. Verify (required)

```sh
# scratch story: PALETTE.md, kit + _shared copied flat into beats/1, data.json from the proof's
# data.csv, beat.example.mjs → beat.mjs
cd ~/.splash-harness/bench/root && bun stories/zz-web-<slug>/beats/1/render-beat.mjs
```

Expect `rendered renders/<label>.html`, a verify-web summary with 0 failed (and the same check count
as the proof's page, give or take the skips), and `look at: …/renders/<label>.png`. Then LOOK, with
your own eyes, at: the desktop PNG; `shots/hover-1600x800.png` (the tooltip names that mark's own
reading); `shots/control-chosen-1600x800.png` if the type has a control; `shots/nojs-controls.png`
(the complete static frame); `shots/fit-375x812.png`. Compare each with the proof's own shots: a
difference that is not the story's data is a kit bug. Then mutate `data.json` so the title is false
and confirm `REFUSED` and an empty `renders/`; break one word function (a total that states the wrong
sum) and confirm the runner names it. Delete the scratch story. A run takes ~20–30 s, almost all of it
verify-web driving Chrome.

## Pitfalls met building the two reference kits

- **The proof's runner may carry a stale patch.** The bar proof patched the inlined
  `interaction.mjs` so a touch answer survives the finger lifting; the format now does that itself
  (`clearUnlessTouch`) and the proof's anchored patch THROWS on the current script. Check every
  post-render patch in a proof's runner against the current skill before carrying it.
- **`assertHeadlineNumbersDrawn` counts only drawn values.** Both proof titles state a figure the
  gesture computes rather than a value drawn ("…que les 5 pays suivants réunis", "…— 57 ans
  effacés"), and the guard refuses them as is. Pass the computed figures the plate genuinely carries
  beside the values, named in a comment (bar: the subject's `under`/`followers`; line:
  `lastYear − referenceYear`). Do not pass every number the tooltips print — that empties the guard.
- **A static `import beat from "./beat.mjs"` runs before anything can clear `renders/`**, so a
  beat that throws on import leaves the previous page standing. Import it inside `refusing`.
- **Scale headroom chosen for the proof's data.** The bar component sizes its scale from `top`;
  another dataset's tallest tower can exceed the proof's 1.22 headroom and the component refuses. The
  kit passes `top = max(leader, every offered tower's sum)`.
- **Text that is not plain-spaced refuses every face**, and the 12B will use `toLocaleString`.
  Every word that reaches the page or `textPerRegister` goes through `plain()`.
- **Phone layouts inherit the proof's defects.** Measured at 375×812: the bar's ten axis names and
  value labels overprint each other; the line's end label chip masks part of the curve. The proof's
  own page does the same, verify-web passes both, and the owner's rule is desktop first — so the kit
  matches the proof and the defect is reported, not patched in the kit.
- **Not every harness tool knows web yet.** `review_facts` (`src/tools/review.ts`) accepts an
  `.html` in `renders/` and runs `svgFacts` over it — whether those facts mean anything on a web page
  is untested. `src/tools/deliver.ts` looks only for `.svg` in `renders/`. Neither is a kit problem,
  but check them before relying on a web beat getting through review and delivery.

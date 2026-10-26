# Building a video zone kit from a video proof

One reference kit follows this pattern: `video/bar-and-column/` (from `proof/video-bar-top-emitters-2024`).
`craft/README.md` is the contract; `web/PATTERN.md` holds the rules every format shares (copy with `cp`,
patch with exact strings, `skillScriptFrom`, `plain()`, import beat.mjs inside the refusal). This file is
how to meet the contract for `video`.

## 0. Find the proof

`skills/chart-video/SKILL.md`, "The type index", names the worked example per type
(`proof/video-<type>-…`); `skills/chart-video/references/types/<type>.md` says what its gestures argue.
A video proof is split into the same files every time:

| proof file | in the kit |
|---|---|
| `index.ts` | `cp`, unchanged |
| `Root.tsx` | `cp`; patch only `COMPOSITION_BASE` to `zone-video-<slug>` |
| `Directed<Type>Video.tsx` | `cp`; patch the `embedded-faces` / `face-coverage` imports to `#shared/chart-video/….ts` |
| `<Type>Frame.tsx` | `cp`; patch imports from other proofs and subject constants (a unit) into props |
| `scene.mjs` | `cp`; patch `../../skills/scrolly/assets/reveal.mjs` → `#shared/chart-video/series.mjs`, generalise text formatting |
| `states.mjs` | `cp`; patch the `choreography.mjs` import to a top-level `await import(skillScriptFrom(…))` |
| `timing-contract.ts` | `cp`, unchanged — the shots are the type's design |
| `build.mjs` | `cp`; patch: subject and words come in as arguments, direction handed in, skill scripts via `skillScriptFrom`, `ROOT = splashRoot(HERE)` |
| `subject.mjs` | NOT copied: it read the proof's frozen CSV. Write `subject.mjs` with `subjectOf(beat)` — the proof's derivation on `beat.rows`, its asserts turned into refusals |
| `render-directions-video.mjs` | NOT copied: its generic half is `_shared/video.mjs`; the kit's `render-beat.mjs` keeps only the proof's look-frame list |
| `frame.test.ts`, `states.test.ts` | not copied; what they held per direction the runner now holds for the story's data (below) |

Keep the proof's `build.mjs` signature shape: `buildDirection(label, chosenDirection, loadBeat(subject, copy))`
returning `{ props, report, direction }`. `copy` is exactly the object the proof's `copyOf(subject)`
returned (`eyebrow`, `title` forms, `source` forms, the unit function…), now built in `render-beat.mjs`
from beat.mjs's words, plus whatever generalisation needs (`format`, `unitWord`).

## 1. Two import worlds — the one thing that will break first

A video kit runs code in two places, and they resolve imports differently:

- **Bun** (`render-beat.mjs`, `build.mjs`, `states.mjs`, `subject.mjs`, `video.mjs`): anything under
  `skills/` goes through `skillScriptFrom(import.meta.dirname, "chart-video", …)` with a top-level
  `await import(…)`, exactly as the web kits do. `#shared/*` stays as it is.
- **The Remotion bundle** (`index.ts` → `Root.tsx` → `Directed*Video.tsx` → `*Frame.tsx` → `scene.mjs`):
  webpack resolves STATIC specifiers only, so `skillScriptFrom` cannot be used there. Every import in
  those files must be `#shared/*` (webpack honours the root's `package.json` `imports`; give the `.ts`
  extension, e.g. `#shared/chart-video/embedded-faces.ts`), a relative path inside the kit, or a package.
  `shared/chart-video/` already carries browser-safe copies of what the proofs import from skills:
  `embedded-faces.ts`, `face-coverage.ts`, `series.mjs` (`clamp01`, `ease`, `lerp`, `moveOf`, … —
  `ease`/`clamp01` are byte-identical to `skills/scrolly/assets/reveal.mjs`'s), `timing.ts`, `sizes.mjs`.
  A helper a frame imports from ANOTHER proof (bar: `blend` from `video-cartogram-europe-lowcarbon/scene.mjs`)
  is copied into the kit's own `scene.mjs` with a comment naming where it came from.
  Never import `#shared/chart-beat/*` from the bundled side (resvg is native; see chart-video's "one gotcha").

`grep -n "from \"\.\./" <kit>/*.ts* <kit>/*.mjs` must print nothing before the first render.

## 2. `render-beat.mjs` — the proof's runner minus its subject

```js
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");      // INSIDE refusing
  applyStoryboard(beat, HERE);
  // REQUIRED by name, typeof checks; assertNumbers; beat.check() FIRST (see pitfalls)
  // subjectOf(beat): the proof's derivation, its asserts as refusals naming the beat.mjs field
  // assertLegibleLabels with the kit's own count formatter, assertDrawsClaimColumn, assertHeadlineNumbersDrawn
  // copy = the proof's copyOf(), from beat.mjs's words, each through plain()
  // pickDirection → buildDirection(label, chosen, loadBeat(subject, copy)); wrap layout throws with
  //   "shorten the names…, or lower drawCount"
  // assertEventFramesReadable(Frame, props, SIZE, label) + every text a count passes through is measured
  // lookFrames = the proof's --look list (event ends, frame 0, mid-gesture frames), one named "final"
  await renderBeatVideo({ here: HERE, label, composition: `${COMPOSITION_BASE}-${SIZE}`, size: SIZE,
    props, wanted: wantedOf(props.registers), lookFrames, lookOnly: process.argv.includes("--look-only") });
});
```

What `_shared/video.mjs` does, so no kit repeats it (it lives in `craft/_shared/`, copied flat beside the kit with the rest of `_shared/`):

- `refusing(here, body)` empties `renders/` and `look/` first; any throw → `REFUSED — <message>`, exit 1,
  `renders/` empty.
- `pickDirection` returns the ONE direction (run `DIRECTION.md`, else first composed from `PALETTE.md`)
  UNRESOLVED — the proof's `build.mjs` resolves families against its own words.
- `numberFormat({ lang, max, decimals, decimal })` → `{ decimals, small, below, decimal, group }` for a
  `valueText(v, format)` in the kit's `scene.mjs` (the proofs hard-code French, one decimal).
- `assertEventFramesReadable` — the proof runner's type-floor check at every event end, plus "every
  `<text>` carries `data-width`" (what `frame.test.ts` held).
- `renderBeatVideo` — `writeRenderProps` (faces embedded), an EMPTY `--env-file`, `remotion bundle` ONCE,
  then `remotion still <bundle>` per look frame into `look/`, prints `look at: <final still>`, then
  `remotion render <bundle> … --concurrency=1` into `renders/<label>.mp4`, ffprobe size check, copies the
  final still to `renders/<label>-final-frame.png` and the faces-free props to `renders/<label>-props.json`.
  Each Remotion spawn is synchronous, piped, SIGKILLed past 10 minutes; nothing runs in parallel.

## 3. Who computes what

The choreography is the type's: the timing contract, `states.mjs`, `WINDOWS`, the look-frame list and
the frame's drawing stay the proof's. The 12B supplies data, the claim's `check()` and WORDS (eyebrow,
title forms, the whole's name, the unit, the credit forms). The arithmetic the gestures show is the
kit's (bar: the search "next N under the leader", the pile's sum, the gap the last row slides into),
taken from the proof's `subject.mjs`. Where the proof ASSERTED its own answer (`beaten !== 5`,
"Germany fits"), the kit computes the answer for the story's data and refuses only when the GESTURE
would then show something false — with the field to change (`drawCount`) and, when it can, the value
that works.

Text a frame draws must be measured in Bun before Chrome draws it (`countWidths`, `data-width`). The
proof enumerated every text a count could pass through over ITS range (0,00 … 12,3); a story counted in
thousands makes that millions of strings. Compute the exact set the scene can show instead (bar: each
value, the whole, the pile's prefix sums in the order `sceneAt` adds them) and let the runner walk every
frame through `sceneAt` to prove none is missing.

## 4. `CONTRACT.md` and `beat.example.mjs`

As for static/web (`craft/README.md`): describe the choreography in one paragraph (what moves, what the
viewer learns), the fields table, "Reading the data" with neutral columns, the same Rules section, the
refusals the gesture can raise, and "render with format `video`, look at the PNG". No `limits`/`alt`:
the video rules forbid a standfirst (`applyStoryboard` skips the limits check when the field is absent).
`beat.example.mjs` reproduces the proof's words exactly; the title card's first form is the takeaway.

## 5. Verify (required)

```sh
# scratch story: PALETTE.md, kit + _shared/* copied flat into beats/1,
# data.json from the proof's data, beat.example.mjs → beat.mjs
cd ~/.splash-harness/bench/root && bun stories/zz-video-<slug>/beats/1/render-beat.mjs --look-only   # ~20 s
cd ~/.splash-harness/bench/root && bun stories/zz-video-<slug>/beats/1/render-beat.mjs               # ~45 s
```

ONE render at a time — never two renders in parallel, never `&`. Then LOOK at the stills, and at frames
taken from the mp4 itself next to the proof's committed `renders/creme.mp4` at the same frame numbers:

```sh
ffmpeg -v error -i renders/<label>.mp4 -vf "select=eq(n\,<frame>)" -frames:v 1 kit-<frame>.png
```

(bar: 30 title card, 372 pile counting, 489 last row in the gap, 665 the whole ranking.) The kit renders
in the story's composed direction and the proof in `creme`, so colours and ground differ; geometry,
names, counts, the bracket and the credit must not — a difference that is not the story's data or the
direction is a kit bug. Then mutate `data.json` so the title is false and confirm `REFUSED` and no
`renders/`; then a mutation that keeps the title true but breaks the gesture (bar: the gap). Delete the
scratch story.

## Pitfalls met building the bar kit

- **Run `beat.check()` before the gesture's refusals.** A data change that makes the title false also
  breaks the gesture (bar: the gap shrinks below the last row), and the gesture's refusal fired first —
  the 12B would read "lower drawCount" instead of "the title is false".
- **Some true titles cannot be told by this choreography.** When every member below the leader together
  stays under it (a "the other five together: 180 against 214" story), no row is left to slide into the
  gap; and a pile that leaves a gap smaller than every remaining member has nothing that fits. The kit
  refuses with that arithmetic; a 12B cannot fix it in `beat.mjs`. The harness must offer another type
  or the static format then — the web kit handles the first case (`followers: null`), the video does not.
- **Bundling per still is the cost, not drawing.** The proof spawns `remotion still <entry.ts>` per frame,
  each re-bundling (webpack cache helps after the first). `remotion bundle --out-dir` once, then
  `remotion still <bundle-dir>` / `remotion render <bundle-dir>` (a bundle folder is a valid serve URL):
  bundle 1–4 s, 12 stills 11–16 s, mp4 29 s at concurrency 1, ~45 s in all, max RSS ~0.8 GB.
- **Pass an empty `--env-file` to EVERY remotion spawn** (the proofs do it on still and render; the kit
  adds it to the bundle step too).
- **`writeRenderProps` leaves a temp folder with every face's bytes**; `video.mjs` removes it.
- **Float noise in refusals** (`12.252210000000002`) reads as a bug to a 12B; print values with four
  significant digits.
- **The proofs' French is in more places than the copy**: `valueText` (decimal comma, one decimal),
  the frame's `withUnit` (`NB + "Gt"`), the names table in `subject.mjs`, refusal messages ("the five's
  bracket"). Grep the frame and scene for literals before declaring a kit generic.
- **`plain()` for video is narrower than web's**: the proofs deliberately put U+00A0 between a count and
  its unit and the faces carry Latin-1, so only U+202F (what `toLocaleString("fr-FR")` emits) is replaced.
- **Not every harness path knows video yet.** `src/driver.ts` copies the kit and `craft/_shared/` only:
  `render_beat` already routes a zoned beat to `render-beat.mjs` in any format, but its description
  names only static/web, its 5-minute timeout kills `bun` and not the Remotion child, and it lists only
  `renders/*.png` (the final frame). `src/tools/review.ts` and `src/tools/deliver.ts` look only for
  `.svg`/`.html` in `renders/`: a video beat has neither, so review throws and delivery finds nothing.

## Map videos

The eight map types render through `_shared/map-video.mjs` (imported as `./map-video.mjs`), not `video.mjs`:
it measures the story's live MapTiler map once (`measured.json` beside the beat, reused while the plan is
unchanged), serves it through the keyless proxy, bundles once, renders the look stills then the mp4, and
writes `renders/<label>-frames.svg`. Remotion runs without the key in its environment. See
`video/choropleth/` for the worked map kit. Full renders take 2.5 to 7.5 minutes; `render_beat` allows 12.

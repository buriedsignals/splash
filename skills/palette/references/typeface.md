# The typeface a beat is set in — `typeface-is-recorded`

`PALETTE.md` exists so no beat is drawn in a colour nobody chose. `TYPEFACE.md` exists for the same
reason, one property over, and until round four it had every part of that mechanism except the one
that puts a file on disk.

## What was measured, 2026-08-21

- Five render paths REFUSE without it — `chart-beat`, `chart-web`, `chart-video`, `map-beat`, and
  the vendored `shared/` copy. `readTypeface` throws, naming every directory it searched.
- `grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write` returned **nothing**. No writer, no
  movement in the storyboard exchange, no owning skill.
- Twenty of this tree's twenty-one stories hold no `TYPEFACE.md`. The one that does had it written
  by hand at the end of a run.
- `NEWSROOM.md` records `typefaces: "Space Grotesk, Courier New"`, and `familyResolves` is **false**
  for `Space Grotesk` on this machine. The refusal is correct; there was simply no path to answer it.
- Each skill ships its own `TYPEFACE.md` in its own directory, which is exactly why nobody noticed:
  a seed run inside a skill resolves by walking up and finds the skill's own file. A story does not.

## The rule

**A beat's typeface is recorded, never silently defaulted, and the recording carries the
measurement.** Three parts, and the third is what makes this different from colour:

1. **Recorded.** `TYPEFACE.md` beside the story (or beside one beat that needs its own), with
   `family` and `origin`. `origin` is `newsroom`, `journalist` or `default`, and `default` is the
   honest word for nobody — a stated fallback is a choice; an unstated one is an accident that looks
   like a decision.
2. **Proposed, never imposed.** `proposeTypeface({newsroom, resolves})` offers every face
   `NEWSROOM.md` records, in the newsroom's own order, plus the substrate stack as an option;
   `formatTypefaceProposal` is the question the journalist answers; `writeTypeface` records it.
3. **Measured on the machine that will render.** resvg never errors on a family it does not have —
   it draws the fallback and reports nothing, as do Chrome and `measureText`. So a proposal that has
   not probed is a guess, and `proposeTypeface` refuses to run without the probe. A face that does
   not resolve is **refused at the recording**, where three answers are still available (install it,
   record one this machine has, record the fallback as a choice), instead of at the render, where
   the run stops.

## What a skill whose renderer has no typeface mechanism must do

Four of the seven skills that draw their own marks hold `FONT_FAMILY` as a `let` that `useTypeface`
reassigns from the recorded file. Three — `map-web`, `image-beat`, `scrolly` — hold it as
`export const FONT_FAMILY = "Helvetica, Arial, sans-serif"`, a literal nothing can change: their
beats are set in a face nobody chose and no recorded answer reaches them.

Until that changes, a beat in one of those formats says so rather than letting the silence pass:
name the face the beat is actually set in, and say that the story's recorded answer did not reach
this render. A gap that is written down is a gap somebody can close; a gap nobody wrote down is what
this rule was earned by.

## Why this skill owns it

Colour and type are the same mechanism on two properties: a recorded answer, walked up from the
beat's own directory, refused rather than defaulted, with `origin` naming who chose.
`readTypeface` is vendored beside `readPalette` in the same file; `newsroom-charter` measures a
newsroom's `typefaces` off its own site into `NEWSROOM.md` exactly as it measures `brandColor` and
`ground`; and this skill is the one that turns a charter value into a per-story answer a render can
read. A second skill for two fields would have duplicated the proposal, the unattended rule and the
refusal wholesale.

## The one asymmetry with colour, and why the writer exists

`PALETTE.md` is authored by hand, because a colour answer is two hex codes a person can type. A
typeface answer carries a measurement no person can make by eye — whether this machine HAS the face
— so the answer and the measurement are written together, by `writeTypeface`, or the file is worth
nothing. That is also why the refusal here is one a run can honour: there is always an answer
available (`origin: default`, with the gap named), so this never becomes a rule that tells an agent
to stop in a place where stopping is not possible.

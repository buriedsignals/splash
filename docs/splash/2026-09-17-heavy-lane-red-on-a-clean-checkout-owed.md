# The heavy lane is red on a clean checkout, and CI does not look — 2026-09-17

Measured in a detached worktree of committed `main`, installed with `bun install
--frozen-lockfile` and nothing else on disk: `bun run test:heavy` ran 8 775 tests across 170 files
in 1 342 s and reported **143 failures**. `bun run test` (the fast lane, 4 719 tests, 235 files) is
green, and the fast lane is the only one `.github/workflows/ci.yml` runs — so none of this is
visible to CI, to a pull request, or to anyone who runs the default command.

Forty of the 143 were a stale premise and are fixed in this same pass (see
`the-design-base-is-reachable-from-the-skills.test.ts`, below). The remaining **103** are recorded
here. Every one of them is reproducible from a clean checkout; none is flaky, and none is caused by
a missing key, a missing `.env` or a missing cache — those tests skip and say so.

## What is red, and what kind of red it is

| file | fails | reading |
| --- | --- | --- |
| `skills/splash/test/video-handover-is-a-cut.test.ts` | 40 | corpus — every directed video hands over by crossfade where the rule says cut |
| `skills/chart-beat/test/inspect-render.test.ts` | 29 | fixtures — the unit moved to measuring pixels and its fixtures never followed |
| `skills/splash/test/credit-anchors-to-the-frame-bottom.test.ts` | 18 | corpus — committed plates draw the credit outside the bottom eighth |
| `skills/splash/test/text-clears-its-contrast-floor-on-the-plate.test.ts` | 5 | corpus — delivered plates carry text under the contrast floor |
| `skills/splash/test/annotation-reads-over-what-it-crosses.test.ts` | 3 | corpus — dashed rules in an ink they cannot be seen in |
| `skills/splash/test/text-in-a-delivered-plate-does-not-overlap.test.ts` | 2 | corpus — text runs collide or leave the frame |
| `skills/storyboard/test/type-survey.test.ts` | 1 | **already written up** — `2026-09-17-type-survey-coverage-owed.md` |
| `skills/scrolly/test/scroll-integrity.test.ts` | 1 | timed out at 600 000 ms driving the whole corpus in one test |
| `skills/splash/test/a-typeface-arrives-as-a-file.test.ts` | 1 | the cache's second call still reaches the network |
| `skills/splash/test/the-palette-reaches-the-pixels.test.ts` | 1 | corpus |
| `skills/splash/test/web-annotation-clears-its-marks.test.ts` | 1 | corpus |
| `skills/splash/test/fluid-decisions-are-retaken.test.ts` | 1 | corpus |

Classified: the checks are right and the work is undone. Not one of them is a threshold to move.

## The one that is not corpus work — `inspect-render.test.ts`

Its 29 failures are all the same shape, `TypeError: undefined is not an object (evaluating
'dark.contrast[0].ratio')` — `inspectSvg().contrast` comes back empty. The file's own header says
why it can: *"this file measures rendered PIXELS"*. `scripts/inspect-render.mjs:189` rasterises
with `font: { loadSystemFonts: false, fontFiles: fontFilesForSvg(svg) }`, and the fixtures declare
no `font-family`:

    const text = (attrs: string, content: string) =>
      `<text x="10" y="50" ${attrs}>${content}</text>`;

With no family in the SVG and system fonts off, resvg has no face to set the glyph with, draws
nothing, and there is no measured entry to read. The unit is fine; the fixtures are from the
structural era. What is owed is a family in the fixture that the typeface reader can resolve
offline, not a change to the rasteriser and not a relaxation of the assertions — and the fix has to
be mutated, because a fixture that renders *something* would turn 29 red tests green without
proving any of them measures what it claims.

## `scroll-integrity.test.ts` is a timeout, not a failure

One test drives every scrolly on disk through a real, uninterrupted scroll and hit the 600 s
ceiling. It is scoped by `scroll-integrity-scope.test.ts` to one beat elsewhere; as it stands the
whole-corpus run cannot finish, so nothing it would have caught is being caught. Whether the fix is
a longer ceiling, a sharded run, or a sampled corpus is a decision about what this guard is for.

## What is owed

1. Triage the 96 corpus failures against the reorganisation that produced them — the same archive
   move that drifted the type survey — and decide per guard whether the artifacts are re-rendered
   or the guard's population is re-scoped. Re-scoping is only honest where the rule genuinely does
   not apply; it is the tempting answer for all 96 and wrong for most.
2. Give `inspect-render.test.ts`'s fixtures a resolvable family and mutate the result.
3. Decide what `scroll-integrity.test.ts` runs over, so it terminates.
4. Then, and only then, consider whether CI should run the heavy lane. Wiring it in while 103
   failures stand would turn every pull request red and teach everyone to ignore it — which is the
   state the fast/heavy split was created to avoid.

## Why it is recorded rather than done

Found by the clean-checkout audit of `main`, whose brief was to fix what blocks a fresh clone and
what has gone stale, and to write down what is owed. This is owed: 96 of these are editorial
judgements about rendered artifacts, and the other 7 are decisions about what a guard is for.

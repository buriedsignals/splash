# Tom Feedback Programme — index

> **For agentic workers:** this is an INDEX, not an executable plan. Execute the five plans below
> in order, each with superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-07-16-tom-feedback-flow-redesign-design.md`

**Goal:** absorb Tom's six feedback points from the first external test of Splash (2026-07-16).

## Execution order and dependencies

| Order | Plan | Stream | Depends on | Size |
|---|---|---|---|---|
| 1 | `2026-07-16-c1-validate-closure-remotion-fix.md` | C1 crash produce-all | — | S |
| 2 | `2026-07-16-c2-preflight.md` | C2 preflight | — | M |
| 3 | `2026-07-16-c3-c4-flow-inversion-ranked-selection.md` | C3+C4 flow | C2 (annotations) | L |
| 4 | `2026-07-16-c6-claim-grounding-extension.md` | C6 guardrails | — | S |
| 5 | `2026-07-16-c5-image-scrolly-phase2.md` | C5 image-scrolly | C3+C4 (ranked list) | XL |

C1, C2, C6 are independent of each other and can run in parallel worktrees; C3+C4 waits for C2;
C5 waits for C3+C4.

## Branch discipline

One implementation branch per plan (`fix/validate-closure-remotion`, `feat/preflight`,
`feat/flow-inversion-ranked-selection`, `feat/guard4-map-native`, `feat/image-scrolly-phase2`),
each branched from `rd-dev`, each merged only on green gate (`bun run check`) + adversarial
review. The spec branch `feat/tom-feedback-spec` carries only docs.

## Companion work (not in this repo's gate)

- **splash-harness** (private): the driver answers Q3 (channel) in CADRAGE — its cases and
  question-count checks must migrate when C3 lands. Update together with C3+C4's merge.
- **Tom's environment**: after C1+C2 merge, have Tom re-pull `rd-dev` and re-run his
  apple-tariff-test case; his run is the acceptance test for both plans.

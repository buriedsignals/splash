# A bar video shows the sentences the journalist wrote — rendered proof

Sub-project ① (2026-08-06). Before this, a chart video honoured the walk's ORDER and displayed
none of its WORDS. Rémy's own test run said it to him plainly: *« tes cinq phrases ne suivent
pas »*.

One real produce of this skill's own sample, frames extracted from the mp4 **during the build**.
The walk runs AGAINST reading order — `Westpark → Eastgate → Central`, while the data reads
`Central, Riverside, Hilltop, Eastgate, Westpark` — because a walk that follows the data cannot
tell "the journalist's order was honoured" from "the default happened to look right".

| frame | what it shows |
|---|---|
| `beat-1-westpark.png` (t=2.0s) | only Westpark's bar is in — the LAST row, the smallest — and the caption is its sentence |
| `beat-2-eastgate.png` (t=2.6s) | Eastgate has joined; the caption has moved to its sentence |
| `beat-3-central.png` (still, t≈4.7s) | Central closes the walk, with its own sentence |

The words and the bar match at every step. That is the whole claim.

## Two defects this render caught that no unit test did

**The band sat on top of the source line.** The exact defect this repo already fixed once for the
x-axis title; `sourceFooterReserve` is the answer it settled on, and the caption now reads it from
the same helper at the same type size, so a change to the footer moves the caption with it.

**The caption named the wrong bar.** `captionAt` asked which SUBJECT was entering and then indexed
the BEATS array with that number — two different spaces. Beat 0 is about Westpark, which is
subject 4. It is the failure `core/walk.ts`'s own header warns about, committed ten lines below
the warning, and only a walk that CONTRADICTS the data order can expose it.

Regenerate:

    cd skills/chart-native && bun scripts/produce.mjs bar <config-with-beats>.json <outDir> video

Not wired into `bun run check` — a real Remotion render. And note the review still (frame 140)
lands late in the build: extract from the mp4 to see the walk's earlier beats.

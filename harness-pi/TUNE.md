# TUNE — misses the harness cannot fix

Tom's triage (REMI §3): each miss has one owner. A miss lands here only when its exact state was replayed
and no harness change (refusal text, code-owned paperwork, bound) can fix it. Training waits until this
file holds such misses (plan K9); nothing below is proved untunable yet.

Source: `bun eval/replay-scan.ts --since 2026-10-28` (92 sessions, 58 kept runs, local 12B, route
`llama-server`), 2026-11-07. "Next call succeeds" = the refusal's feedback worked, through any tool.

## Candidates (watch, not yet owned by Tune)

| Miss | Evidence | Why not Harness yet |
|---|---|---|
| Re-records the same gesture list after a failed web/scrolly render instead of fixing `beat.mjs` | 41 "list already recorded" refusals in 10 sessions, next call succeeds 5 | The refusal stops the loop; the miss is the repair after a failed render. Re-measure on the hardest leg (T4) before owning it. |
| Names a mark the beat does not draw | 24+6 refusals in 13 sessions, next call succeeds 16+4 | The refusal recovers most of the time; whatever is left is the model's reading of the drawn names. |
| Prose claims a record no tool made | 16 turns in 10 sessions on the 12B; on the 26B (G2, gx-small-multiples) 4 turns in a row ended the run at framing | The harness's "nothing was recorded" nudge did not recover it once. Now on both models: a candidate for Tune unless a stricter nudge (name the tool and its arguments) recovers it on replay. |
| A generation that does not end (gantt video, G1; real-gwis static, 2026-11-08) | Gantt: one response ran past 7,632 tokens at 12 t/s until the 15 min run cap. real-gwis: the first write of beat.mjs was aborted after 14 min with no output kept, then the last turn ran ~9 min into the 30 min cap; beat.mjs never written | The output cap is Tom's (a quarter of the window, 16,384); a lower cap would hide the miss, not fix it. Two runs now, both on the first long write. The harness side (the aborted call then wrote "null") is fixed. |
| Repeats its own failing `check()` (connected-scatter scrolly, G1 after fix) | The same self-written invariant ("total sum of shares dropped by −516.2, but the title says 11.8") refused 5× in a row | The refusal is the model's own code naming itself; the harness has nothing to fill. Watch on the 26B (T3). |
| Declares a name twice in `beat.mjs` (parallel coordinates static, G1a) | `export const entities = entities;` after 18 writes, load refusal names the line, never repaired | One occurrence. |
| Writes place names in English on a French page | Step 2/2b (2026-11-14/15): Qwen beeswarm "Saudi Arabia", "Trinidad and Tobago", control "Bahrain + 5"; Qwen area web end label "Switzerland"; 12B locator "Kyiv", "Bucharest". The same Qwen wrote its own ISO→French table on the cartogram, so it can | A code-owned ISO-3 → language name table (Helper) would remove it without training; try that first. |
| Places the scrolly's limits card last | Step 2b: 12B area scrolly, 12B calendar scrolly | No guard orders cards by role yet; a harness rule could, if the doctrine fixes the limits card's place. |
| Keeps a figure the guard asked it to drop | Step 2b: Qwen cartogram video, 4 crafts restated "44,9" after the refusal offered the title without it; the 12B dropped it on the same story | The refusal already gives a title that works; the seed's figure is also uncomputable (no area column), so fix the seed before judging. |
| Re-sends an identical call after a refusal | Step 2: 12B re-sent a successful `record_gestures` 16× (dot-strip static); step 2b: 6 no-op edits in a row (12B cartogram video) | The repeat refusal stops the loop; extends the first row of this table. |
| States a superlative without its scope | Step 2b: Qwen calendar video "11 août : 25,5 °C" alone reads as the year's warmest day; it is August's (the year's is 30 July, 26,4) | One occurrence; the figure is true, the wording is the miss. |

Also for "a generation that does not end": step 2b, 12B marimekko video, one empty 16,384-token generation took 849 s of the craft (legit craft turns reach 11,118 tokens).

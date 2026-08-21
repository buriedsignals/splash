# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at preflight

runPreflight({root, env}) has no default for fetchFn, so a caller who omits it gets every capability reported unavailable with the reason "MapTiler threw: fetchFn is not a function". Map, Datawrapper and hosted embed all read as closed on a machine where two of the three are actually open. The skill's own signature is written as runPreflight({root, env, fetchFn}) and its own Quick start passes fetch; nothing makes the omission loud.

## Found at storyboard

Nothing in the exchange machinery checks a chosen treatment against its own type sheet's hard refusals. Slot 2 was closed on Scatter for a six-row table, and chart-beat/references/types/scatter.md refuses a scatter under about eight or ten points outright. formatCandidates renders each candidate's purpose sentence verbatim but never reads the sheet's "When NOT to use it" section, and assertDistinctWays only compares type NAMES — it passes "Bar and column" beside "Lollipop", which that sheet itself calls "a bar chart's thin sibling: same job". The refusal was found by a human reading the sheet, three phases after the gate that should have applied it.

## Found at storyboard

The article puts a count column beside a population column and the toolchain never notices. Nothing in the survey, the intent rankings, the profiler or the grounding check has a word for a rate: a search across every skill for per-capita, per-resident, normalise or denominator returns only proof-beat directory names. On this data the rate reverses the article's own headline — Porto leads per resident, not Lisboa, and Aveiro is last — and that reading had to be brought in by hand rather than proposed. groundTakeaway happily returned supported for the raw claim, because it range-tests bare integers and never reads a relation.

## Found at storyboard

There is no movement, no gate and no script that writes SUBJECTS.md. exchange.md's movement 10 says recordSurveyedSubjects is called before the movement ends, but nothing enforces it and no gate checks it: the storyboard closed with checkStoryboard returning an empty array and no SUBJECTS.md on disk. It had to be written at delivery, from memory of a survey that had already happened, which is exactly the losing-it-to-the-conversation failure the file exists to prevent.

## Found at production

The newsroom's recorded typefaces never reach a render. NEWSROOM.md records "Space Grotesk, Courier New" and preflight reads it back, but readTypeface walks up from the beat looking for TYPEFACE.md and no phase in the journey writes one — so a runner that calls it throws, and a runner that does not silently rasterises in the substrate's Helvetica stack. This story had to author TYPEFACE.md by hand. It is the same collected-then-dropped failure PALETTE.md exists to have closed for colour, still open for type. Separately, Space Grotesk does not resolve on this machine at all, so the honest answer here was origin: default.

## Found at production

Every one of the eighteen chart-web example runners is dead. renderWeb gained a required props.language and assertRecordedLanguage throws without it; running all twenty-three render-web.mjs files under proof/ gives five passes (all map-web, a different skill) and eighteen failures. That includes the two the chart-web skill names in its own Quick start. Two of them also still patch for a hard-coded <html lang="fr"> that the function no longer emits, so they carry a second failure behind the first. This is the exact cost the skill's own overview names from the previous signature change, repeated.

## Found at production

verify-web.mjs cannot pass a slopegraph. Its HOVER check probes each mark at the centre of its bounding box, which on a diagonal pair of crossing lines is exactly the crossing — a point equidistant from both, where any nearest-mark rule must answer with one of the two. Beat 2 fails 14 of its checks for this reason alone, and so does the format's own committed slope artifact, proof/web-co2-decline-slope/co2-decline-slope.html, at 26/30 and 25/30. Driving the same page at 15% and 85% along every line answers correctly 12 times out of 12. The check needs an off-crossing probe point, or an allowance where two marks genuinely overlap.

## Found at production

chart-web's mechanism is not vendored. shared/ carries chart-beat and chart-video only, so a story's web beat has to import renderWeb by a relative path up into skills/chart-web/scripts/render-web.mjs — the reach across a skill boundary that the vendoring exists to remove, and the thing that would not resolve at all in an installed root. Both static beats in this story import theirs as #shared/chart-beat/render-still.mjs.

## Found at delivery

Preflight and offerForms disagree about hosted embed, in the direction that reaches the journalist. probeCloudflare answered 403 for the recorded token, so runPreflight reports capabilities.hostedEmbed available: false; offerForms lists the Deploy and receive embed code form as enabled, because its check is presence of the two variables, not the probe result. A journalist reading the honest preflight is told hosted delivery is closed and then offered it anyway; choosing it would fail at the remote call.

## Found at delivery

whereIs reports done while both halves of the closing offer are still pending. Three beats were delivered, every export carried .another-format and .other-subjects as pending, deliveryClosed reported closed: false for all three, and whereIs still returned phase done with nothing missing. deliver/SKILL.md names this gap in its own parenthesis; this run is a live instance of it, on the first story that ever had more than one beat.

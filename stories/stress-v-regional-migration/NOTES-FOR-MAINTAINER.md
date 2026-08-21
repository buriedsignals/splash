# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production

framingMeasurement cannot read a series that crosses zero. largestAgainstMedian is null whenever the median is not positive (here -780) and spreadAgainstExtent divides the spread by max, which assumes a zero-based extent, so a diverging domain returns 2.397 - a value above 1 whose documented meaning (the fraction of its own column height) does not apply. The ratio that actually decided this beat treatment, Montagne 780 against Centre 21800 = 3.6%, had to be computed by hand in the beat own render script.

## Found at production

The two refusals that only exist at portrait - assertTypeFloor and assertWithinStage - read rendered SVG markup, and a chart video beat produces only a PNG and an mp4. There is no path in the video skill that hands markup back, so both guards are unreachable on the one format this brief pinned portrait for. Worked around by lifting the whole layout out of the component into an exported pure function and synthesising the text runs in the beat itself.

## Found at production

chart-video sizes.mjs refers three times to a type-at-size.mjs in the same skill, including inside assertWithinStage own refusal message (run the removal ladder in type-at-size.mjs). No such file exists in chart-video; only the static chart skill has one. The portrait removal ladder was decided by hand instead.

## Found at production

The stage a size reserves is modelled as top and bottom only, so the 6% per side reserve the size table own header documents (65px on a 1080 frame) is enforced by nothing. The first portrait render put the largest number on the chart at x=56, inside that reserve, and the stage guard passed. Found by opening the picture.

## Found at production

The vendored shared directory carries render-still for the static chart and web formats but not for video, so a video beat cannot read its own palette or typeface through the root own subpath map and has to reach into the skill by relative path - a path that does not exist in an installed journalist root.

## Found at production

csvSplitByHand fires on any file containing the word csv, a newline split and a comma split. This beat render script matched all three for unrelated reasons - one log line splitting markup, and a video probe returning width,height - while its actual reader is a character by character RFC 4180 tokeniser.

## Found at delivery

The owned-file form copies the rendered draft directory whole, with no filter, in every format, while the form own description promises a selection (an mp4 the newsroom owns outright, nothing else to run). The first delivery shipped the newsroom two build-input JSON files and a directory of eight extracted verification frames. Worked around by moving everything that is not a deliverable out of the rendered draft - which forced the bound review to be re-taken, since the approval digest hashes exactly that directory.

## Found at delivery

The hand-over role table is keyed on file extension alone and never consults the format it is given. A delivered .txt is described as the live address this beat was published to - on a beat that was never published anywhere - and a delivered .png on a VIDEO beat is described as a raster copy for a system that cannot take the vector, when no vector exists. The first was worked around by keeping the alt text out of the delivered set; the second still stands in the delivered document.

## Found at storyboard

SUBJECTS.md is required at gate 4 and checked by neither gate 2. The exchange doctrine and the delivery skill both say recordSurveyedSubjects is called during the storyboard proposal, but neither gate 2 reader requires the call or the file. This storyboard closed with no errors, production ran, the review was bound, the export and the hand-over were written - and only then did the closing offer throw for a record movement 10 should have written. This is the same class the orchestrator own gotcha section says it closed one gate earlier.

## Found at production

writeOutputReview computes the draft digest for the record it writes but requires the caller to hand the identical value inside every QA run entry, and the phase table names only writeOutputReview. The first call failed on a missing QA draft digest; a caller has to know to import the digest function separately.

## Found at production

The reader behind the never-arrives guard is declared with three parameters and destructures the third unguarded, so calling it with a source alone - the shape the declared guard list implies - is a type error rather than a refusal.

## Found at storyboard

A slot records ONE size, and this journalist asked for two frames of one argument (vertical for stories, and a version for the feed). The only shape the contract offers is two slots, which means two beats, two briefs, two approvals and two deliveries for one visual. Handled inside the beat by registering two compositions and rendering both, with the pinned size recorded on the slot.

## Found at production

The last rung of the video ladder says to confirm the final hold matches the still, and the only comparison tool in the skill has a 6-value tolerance and a 0.2% pixel budget. An H.264 extracted frame against a lossless still differs on 3.6% of pixels, so the check has no mechanical form and was made by eye.

## Found at storyboard

The claim grounding check refuses a numeral written with a thousands separator as ambiguous between grouping and a decimal comma, so a takeaway written the way a journalist writes one loses its numerals. It also cannot match a magnitude written with a direction word (down 21800) to a negative value, which on a story whose values cross zero means every loss figure written naturally is unplaceable; and a row-level exact value comes back consistent rather than supported even though the row reader has that exact cell. Separately, the bare year token 2025 is range-placed against a column literally named net_migration_2025, adding a spurious placed claim to every takeaway that mentions the year.

## Found at storyboard

assertDistinctWays accepts candidate names that exist in no type sheet at all, so a slot can list treatments this toolchain holds no sheet for and the gate never notices.

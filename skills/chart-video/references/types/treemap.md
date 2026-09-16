# Treemap — in video

**Argues:** A treemap answers "how does a total break down, when the pieces ALSO belong to groups worth keeping together" — area encodes each item's value, and items sharing a group are laid out as contiguous tiles.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-treemap-europe-capacity` (2026-09-15), from `proof/static-treemap-europe-capacity`.

- **Start from the whole**: one block grows from the box's left edge, its width the running total, the total counting in
  it — the area a megawatt takes is set before any member exists.
- **Split it into its members**: seams of the ground cut the block into the squarified cells, largest first, each value and
  name arriving with its seam; the cells tile the block, so nothing moves and no area changes.
- **Show the criterion inside each cell**: the part that decides (here wind and solar) rises from each cell's floor to its
  share, a midline across each stopping short of the words; the cells past the middle flood with the accent, one after the
  other, the count climbing in the key; the others drain. A word takes the ink of whatever passes its middle.
- **Compare by packing**: the flooded cells slide onto the largest cell and pack into its lower part, each keeping its area
  (the centre travels, the aspect ratio turns on a log scale), their sum on them — the largest cell's words stay above.
- **End on the whole treemap**: the cells slide home, the largest ringed; the credit on one line beside the key. 18,7 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — grow + count** — the whole is one block filling the frame, its width the running total
- **`reveal` — split** — seams of the ground cut the block into its cells, largest first, each value and name arriving with its seam
- **`subject` — fill → filter → gather** — inside every cell a sub-quantity rises from the floor to its share against a midline, the cells that pass flood with the accent, and those cells then SLIDE onto the largest cell and pack into it, each keeping its area: the comparison is an area against an area
- **`conclusion` — pull back + name** — the gathered cells slide home keeping their areas and the reference cell is ringed; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- move a cell without conserving its area — the gather is only evidence if every frame holds the same area
- keep a cell that cannot carry its own value as a labelled tile: cells too small to be read fold into a stated remainder rather than becoming unreadable slivers

## Precision to assert
- tile area stays proportional to the same asserted value in every shot, including during the gather
- the packed cells' total area equals their summed value and its ratio to the reference cell is asserted
- the remainders are declared, and their composition is stated rather than silently dropped

## Devices the worked example implements
- **The area-conserving gather** — "together they are smaller than this one" shown as packing, not as a percentage (`states.mjs`, `layout.mjs`)
- **Fill-to-share inside each cell** — a second variable drawn inside the area encoding without a second colour scale (`TreemapFrame.tsx`)
- **Folded remainders** — unreadable cells are summed into declared remainder tiles rather than drawn as slivers (`layout.mjs`)

## Worked example
`proof/video-treemap-europe-capacity/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type treemap --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

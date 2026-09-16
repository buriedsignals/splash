# Dot density — in web

**Argues:** A dot-density map answers "where inside these regions is this concentrated" at a texture level: dense clusters of dots read as dense clusters of the thing.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-dot-density-europe-stations` (2026-09-15), from `proof/static-dot-density-europe-stations`.
Vocabulary: `skills/map-web/assets/live-dot-density.ts`.
**The gesture**: the reader chooses WHAT ONE DOT IS WORTH, because the dot value is the sentence, not a rendering setting.

- **Make the two resolutions deposit the same ink**: derive the second dot value from the file itself (the mean quantity per row),
  so the same rows paint a comparable number of dots — nothing added, nothing removed, the ink simply put somewhere else. That is
  the argument a still cannot make, and it is what proves the minority fleet was 0,9 % of the ink by count and a third of it by capacity.
- **Use `radius: "ground"`**: a dot stands for a fixed quantity in a fixed piece of GROUND, so its ground area must be constant and
  its screen radius doubles per zoom level — an `["interpolate", ["exponential", 2], ["zoom"], …]` expression, never a number.
  A camera-held radius would make the field thin out as the reader zooms in, which would be a lie about density.
- **Measure the trap in both directions and print the refused half**: a dot value too large empties a real concentration off the map,
  too small closes the field into a blob. Print how many dots the finer value would need, every render, so the refusal is a number.
- **Print what Mercator costs THIS subject**: a dot has no area to inflate, so the cost falls on the ground UNDER the dots — the north
  is drawn larger, the same dots spread over more page, and it reads sparser than it is. Derive the northern page share against the
  northern true share and throw if the sentence would be false; and say that `circle-radius` is a screen length, so one dot's declared
  ground size is true only at the frame's reference latitude.

## Reader gestures
- **`live-dot-density` — « Un point, ça vaut quoi ? »** — the reader chooses WHAT ONE DOT IS WORTH, because the dot value is the sentence and not a rendering setting
- **The two resolutions deposit the SAME ink** — the second dot value is derived from the file itself (the mean quantity per row), so the same rows paint a comparable number of dots: nothing added, nothing removed, the ink simply put somewhere else. That is the argument a still cannot make
- **`ask-a-mark`** — a dot answers with the row it stands for and what it is worth under the current resolution
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-hold-dot-radius` — hold a dot's radius to the camera: a dot stands for a fixed quantity in a fixed piece of GROUND, so `radius: "ground"` — an `["interpolate", ["exponential", 2], ["zoom"], …]` expression, never a number — or the field thins as the reader zooms in, which is a lie about density
- `no-refuse-resolution-silently` — refuse a resolution silently: print how many dots the finer value would need, every render, so the refusal is a number

## Precision to assert
- dot positions are declared synthetic where they are, and every region is present under them
- the trap is measured in BOTH directions — a value too large empties a real concentration off the map, too small closes the field into a blob
- a dot has no area to inflate, so Mercator's cost falls on the ground UNDER the dots: derive the northern page share against the northern true share and THROW if the sentence would be false; and say that `circle-radius` is a screen length, so a declared ground size is true only at the frame's reference latitude

## Devices the worked example implements
- **`live-dot-density.ts`** — the dot value as the control, with a second value derived from the file (`skills/map-web/assets/live-dot-density.ts`)
- **Ground-held radius by zoom expression** — density that stays density under the camera (`skills/map-web/assets/live-dot-density.ts`)
- **The refused resolution counted** — the trap answered with a number instead of a rule (`render-directions-web.mjs`)

## Worked example
`proof/web-dot-density-europe-stations/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `camera.ts` (the MEASUREMENT projection, its window and `project` — the beat's central claim), `bake.mjs` (`BEAT.bounds`, the camera gate, one plate per filed direction), `DirectedDotMapWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/live-dot-density.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type dot-density --beat proof/web-dot-density-<subject> --static proof/static-dot-density-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

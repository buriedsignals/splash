# Grouped bar — in web

**Argues:** A small number of series placed side by side within each category, so a reader can compare within a group and across groups off one chart.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-grouped-bar-wind-vs-solar` (2026-09-15), from `proof/static-wind-vs-solar`.

- **The gesture**: the reader chooses a country and its own two levels lie flat across the other five,
  each in its series' own ink.
- **Start from the comparison the grouping makes hard.** The group boundary is what makes the
  WITHIN-group reading easy and the ACROSS-group one hard — each series' six columns are separated by
  the other series' — so a still can assert "this one is the exception" and has no way to draw WHICH
  HALF of the pair makes it one. Switzerland's solar is third of six and its wind last: the reversal is
  a wind story, and that is the half the still cannot show.
- **Build it with `chart-web/assets/level.ts`**, and print the rank on each series plus the ratio
  between them in the sentence underneath. Keep the boundary drawn: two bars tight together and the
  next country after a gap wider than the bars, or a grouped bar reads as one long row of alternating
  colours and the grouping disappears.
- **Refused: the static sibling's callout.** It draws a leader line onto Switzerland's pair and hands
  the reader the answer. This page deletes it — the reader builds the comparison instead.
- **Refused: one hue at two chromas.** That treatment's own source says two states of one measure must
  not read as two categories — but wind and solar ARE two categories, and the treatment was being
  claimed backwards. Two hues is what two categories want and the directed substrate records ONE
  accent per direction, so what ships is the accent for solar (the series the claim is about) and one
  tint of it for wind, held apart by a MEASURED lightness gap rather than by assumption.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Et par rapport à ce pays-là ? »** — the group boundary is what makes the WITHIN-group comparison easy and the ACROSS-group one hard, so the reader lays any category's own two levels flat across the others and reads the comparison the boundary was built to discourage
- **The still's callout is DELETED and replaced by the yardstick** — the plate pointed at the exception; the page lets the reader find out that the exception is a story about one series and not the other
- **`ask-a-mark`** — a column answers with both its series' shares and their difference
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-keep-author-callout` — keep the author's callout as well as the control — the page earns its format by handing the pointing over, not by doing both
- `no-let-yardstick-move` — let a yardstick move a mark: a level lays a reference across the plot and every datum keeps exactly the meaning it had

## Precision to assert
- one shared value scale from zero across every group and every state
- the beat throws if the number of categories where the minority series leads is not exactly the asserted one
- everything the still printed is still printed — title, caveat, both series' figures on every bar, legend, axis, source — with nothing argument-bearing behind a control

## Devices the worked example implements
- **The yardstick that replaces the callout** — the across-group reading handed to the reader (`skills/chart-web/assets/level.ts`)
- **Both figures on every bar in every state** — so the control adds a reading and never restores one (`DirectedGroupedBarWeb.tsx`)
- **The same frozen file as the static sibling, byte for byte** — the floor is provably the plate (`render-directions-web.mjs`)

## Worked example
`proof/web-grouped-bar-wind-vs-solar/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedGroupedBarWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type grouped-bar --beat proof/web-grouped-bar-<subject> --static proof/static-grouped-bar-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.

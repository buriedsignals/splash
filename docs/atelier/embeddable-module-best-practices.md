# Embeddable visual modules in articles — best practices (grounded)

> Synthesised from authoritative sources (EU Data Visualisation Guide, Datawrapper Academy, The Pudding,
> Flourish, NN/g, Tow Center, Bloomberg). Applies to EVERY module the toolkit produces — chart, map,
> scrolly, video — because they are all **embeds dropped into a newsroom's article to support it**, not
> the article itself. Sources listed at the bottom.

## The core principle — self-contained, complementary, never a copy

A module is **embedded in** an article but must be **self-contained**: embeds circulate out of context
(shared on social, re-embedded by partners), so the module has to stand alone AND not repeat the article.

- **Self-contained** — carries its own insight title + short description + source line, so it makes sense
  even when shared with no article around it.
- **Complementary, not duplicative** — its text "should not repeat the message of the preceding and
  surrounding text … [it] should build upon and complement the surrounding context" (EU guide). The
  article sets up the argument; the module proves it with the data.
- **Not an article excerpt** — do NOT pull/duplicate article paragraphs into the module. That creates
  verbatim redundancy (prohibited by the EU guide + Datawrapper) and bloats the module.

## Module furniture (what text a standalone module carries)

| Element | Content |
| --- | --- |
| **Insight title** | the finding in ≤10 words, active/journalistic (NOT a neutral label or a year range) |
| **Description** | 1 sentence: what / when / where + units (the metadata the title omits) |
| **Annotations** | only for the key marks of the story beat — observational (reinforce the visual) or additive (add context not in the data); never exhaustive |
| **Source line** | name + URL, small grey text, ALWAYS visible (non-negotiable — embeds get shared out of context) |
| **Byline** (optional) | the journalist/desk, if partners may re-embed |

NOT included: article body text, lengthy paragraphs, metadata stuffed into the title, restating what the
graphic already shows.

## Embedded scrolly module specifics

- **Short** — 3–6 steps max for an embedded (inline) scrolly. It supplements a section; it is not a
  full-page story. Over-stepping breaks the article's reading pace and fatigues mobile readers.
- **Step captions are data-tied, self-contained, 1–2 sentences** — each directs the eye to what changed
  at that step and states the value/comparison that matters ("Norway leads — 99% of its power is
  renewable, Europe's highest"). They are NOT replicated article paragraphs and NOT bare labels.
- **Captions beside the sticky graphic**, not over it (read + see simultaneously, no competition).
- **One insight per step** (Flourish), not every finding at once.

## Responsive / mobile — every module must adapt (concrete recipe)

A module is read on phones as often as desktop, so responsiveness is non-negotiable. The pattern that
works WITHOUT a build-time CSS/media-query setup (these are single-file embeds with inline styles):

- **Use `min()` / `clamp()` / `vw` in inline styles** — they are valid CSS values and need no media
  queries: `maxWidth: "min(360px, 100%)"`, `fontSize: "clamp(14px, 3.6vw, 16px)"`,
  `maxWidth: "min(420px, calc(100vw - 40px))"` for a fixed overlay (header/legend/source).
- **Guaranteed side gutters** — put horizontal padding on the text's CONTAINER
  (`padding: "0 24px"; boxSizing: "border-box"`), don't rely on `maxWidth` alone, or the text hugs the
  screen edges on mobile. Give cards generous internal padding too (≈ 1.6rem horizontal).
- **Fixed overlays cap their width** (`min(Npx, calc(100vw - gutter))`) so they never overflow a narrow
  screen; keep a ≥ 20px gutter each side.
- **The graphic fills its container** — never `height: 100%` without a defined parent height.
- **Touch** — the map keeps its event system but disables the navigation handlers
  (`dragPan`/`scrollZoom`/… `false`) so the page still scrolls under a finger; test interactions at
  ~375–390px.
- **`prefers-reduced-motion`** → replace `flyTo` with `jumpTo`, suppress eased transitions (vestibular
  safety, WCAG 2.3.3).
- **Always test BOTH** a ~390px mobile viewport and desktop before shipping a module.

## On-graphic value labels — selective, not exhaustive

- A value label on a mark is good module furniture **when it serves the story beat** (the outlier, the
  entity under discussion, the max/min that proves the title). It beats tooltip-only, because many
  readers never hover.
- But be restrained: don't label every mark. And avoid duplicating: if the step CAPTION already states
  the value, an on-graphic value label repeating it is redundant (the recurring "doublon" — the scrolly
  map shows zoom + highlight as visual feedback, the caption carries the number).
- Direct/inline labels beat legends when there are few series (less eye travel).

## Provenance

Every module shows its own linked source, regardless of the article also citing it — because a sourceless
graphic shared out of context is unverifiable/mis-attributable.

## Implication for our engines

- **Captions/prose come from the DATA + the insight (self-contained), edited by the journalist —
  NEVER pulled verbatim from the article.** (Answers "data-tied captions vs article excerpt": data-tied.)
- Every module (chart/map/scrolly/video) must carry: insight title + description + source. Enforce in
  conformance.
- Scrolly: 3–6 steps, data-tied 1–2 sentence captions beside the graphic, one insight per step.
- Value: stated in the caption OR a selective on-graphic label — not both (avoid the doublon).
- **Responsive by default** — every module adapts to mobile via the recipe above (gutters, `min()`/
  `clamp()`/`vw`, capped overlays, touch, reduced-motion); test ~390px AND desktop. Not optional.

## Sources

EU Data Visualisation Guide (titles) · Datawrapper Academy/Blog (text, annotate, source) · The Pudding
(responsive scrollytelling, sticky, storytelling) · Flourish (scrollytelling examples) · NN/g
(infographics, chart types) · Tow Center "Context is King" + Tandfonline "Data Artefacts in Journalism"
(out-of-context circulation, sourcing) · Bloomberg/Digiday (one big takeaway). Full URLs in the research
transcript.

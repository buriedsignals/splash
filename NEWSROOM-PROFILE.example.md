---
# ─────────────────────────────────────────────────────────────────────────
#  Newsroom profile — filled in ONCE, reused on EVERY visual
#  Copy this file to `NEWSROOM-PROFILE.md` at the root of your project,
#  then replace the values with your own. Everything is optional.
# ─────────────────────────────────────────────────────────────────────────

palette:                      # your brand colours; the 1st one is the primary
  - "#0A5C36"                 # house green (primary colour of the visuals)
  - "#C8102E"                 # a 2nd series colour

source:                       # default attribution shown under each visual
  name: "Heidi.news"          # the displayed name ("Source: Heidi.news")
  url: "https://heidi.news"   # optional link

lang: "fr"                    # default language of the deliverables (fr, en, de, it…)
                              # the credit follows the language automatically ("Source:" / "Source :")

# theme: "dark"              # MAP theme: uncomment for a dark ground on every map
                              # (dark-themed newsroom). Absent = light ground (default).
                              # A per-map choice always wins.
---

# How to fill in this profile

This file defines the **house style** that Splash reuses across all your visuals, so you don't
have to restate it each time. Any visual can still **override** a value case by case — what you
put here serves as the **default**.

- **palette** — your brand colours, as hex codes (`#RRGGBB`). The first one is the **primary**
  colour. Tip: your designer or brand guidelines already know them; otherwise a colour-picker
  tool reads them straight off your logo.
  > ⚠️ If a house colour is hard to distinguish for a colour-blind reader, Splash **keeps it
  > anyway** (it's your brand) and **flags it** at review time — the call is yours.

- **source** — the name of your newsroom (or of the data source) shown under the visual, plus an
  optional link. If an article cites another source, that one **takes precedence**.

- **lang** — the default language of your publications (`fr`, `en`, `de`, `it`…). It automatically
  sets the credit format ("Source :" in French, "Source:" in English).

- **theme** — the ground of your **maps**: `dark` for a dark ground on every map (a dark-themed
  newsroom sets it once), `light` (default) for a light ground. A per-map choice always wins.
  _(Applies to map-native and map-scrolly maps; the Datawrapper dark ground will come later.)_

_Colours, source, language and map theme are supported today. A custom credit template, the logo
and the typeface will come later._

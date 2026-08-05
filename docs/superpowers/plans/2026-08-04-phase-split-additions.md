<!-- THE PROSE THE SPLIT ADDS — every line, enumerated.

Everything NOT in this file is proven a pure move by scripts/verify-phase-split.mjs. Keeping the
additions in one reviewable place is what makes that proof worth anything: a check that silently
tolerated new prose would tolerate a rule quietly rewritten as "moved".

Two kinds only, and no others:
  1. the six invocation blocks the root gains (spec §3), including the STOP;
  2. the frontmatter + H1 each new skill must carry to be a skill at all.
-->

## The six phases

Each phase is a skill of its own. Invoke it AT the moment its phase begins — not earlier, not from
memory. **If the skill does not load, STOP and tell the journalist.** Do not improvise the phase:
a phase run from memory has fewer rules in context than before this file was split, which is the
one new failure mode the split creates.

**1-2. INPUT + ANALYSE** — freeze what the journalist brought and profile it silently. No gate.
**Invoke `splash-input` now.**

**3. CADRAGE** — establish the editorial intention and the truth of the data. Ends on gates 1, 1b,
2b, 2c. Receives: the article and/or data frozen by INPUT.
**Invoke `splash-cadrage` now.**

**4. PROPOSITION** — turn the framing into one pinned visual element. Ends on gate 2. Receives:
the confirmed takeaway, the channel, the source.
**Invoke `splash-proposition` now.**

**5. PRODUCTION** — build the pinned format and surface it before asking anything. Ends on gate 3.
Receives: the run directory and the pinned format.
**Invoke `splash-production` now.**

**6. EXPORT** — offer the delivery forms, wait for the choice, build only that one. Ends on gate 4.
Receives: the approved artifact and its run directory.
**Invoke `splash-export` now.**


---
name: splash-input
description: Use as phase 1-2 of the splash flow: take the article and/or data the journalist brought, freeze it, and profile it silently. Invoked by skills/splash at the INPUT step, never directly by a journalist. Keywords input, freeze, article, csv, data profile, analyse, silent.
---

# splash-input — INPUT and the silent ANALYSE — freeze what the journalist brought, and read it without saying anything yet.


---
name: splash-cadrage
description: Use as phase 3 of the splash flow: the questionnaire that establishes editorial intent, the confirmed takeaway, the channel and the source. Invoked by skills/splash at the CADRAGE step, never directly by a journalist. Keywords cadrage, framing, gate 1, takeaway, questionnaire, channel, source, editorial intent.
---

# splash-cadrage — CADRAGE — establish the editorial intention and the truth of the data. Gates 1, 1b, 2b, 2c.


---
name: splash-proposition
description: Use as phase 4 of the splash flow: propose the visual element, its format and its producer, and pin exactly one of them behind the journalist's veto. Invoked by skills/splash at the PROPOSITION step, never directly by a journalist. Keywords proposition, gate 2, menu, candidates, pin format, veto, suggest-chart, suggest-article.
---

# splash-proposition — PROPOSITION — turn the framing into a pinned visual element. Gate 2.


---
name: splash-production
description: Use as phase 5 of the splash flow: run the producer for the pinned format, surface the render, and take the journalist's approval on what they can see. Invoked by skills/splash at the PRODUCTION step, never directly by a journalist. Keywords production, gate 3, produce-all, render, review, approval, present.
---

# splash-production — PRODUCTION — build the pinned format, and show it before asking anything. Gate 3.


---
name: splash-export
description: Use as phase 6 of the splash flow: offer the delivery forms the pinned format allows, wait for the choice, and build only that one. Invoked by skills/splash at the EXPORT step, never directly by a journalist. Keywords export, gate 4, delivery form, source bundle, standalone html, embed, cms, hand over.
---

# splash-export — EXPORT — the journalist chooses the delivered form. Gate 4.

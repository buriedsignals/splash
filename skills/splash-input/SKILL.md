---
name: splash-input
description: "Use as phase 1-2 of the splash flow: take the article and/or data the journalist brought, freeze it, and profile it silently. Invoked by skills/splash at the INPUT step, never directly by a journalist. Keywords input, freeze, article, csv, data profile, analyse, silent."
---

# splash-input — INPUT and the silent ANALYSE — freeze what the journalist brought, and read it without saying anything yet.

### 1. INPUT

Accept: an article (URL / file / pasted text), data (CSV / file / pasted table), both, or a bare
topic. Normalise to `{ article?, data?, topic? }`. Do not proceed until you have at least one.

**Keys are a PREREQUISITE — collected in the flow, never a mid-production crash.** Run
`bun lib/host/cli.ts newsroom` at INPUT. It answers with `capabilities` (each `id`, `label`,
`status`, and a `reason` carrying the get-it URL), plus `language`, `publisher` and `blockers`.

**Why that command and not `preflight.mjs`:** measured, the loop's readiness knows strictly more.
Preflight reports SIX production engines and nothing else. `newsroom` reports **twelve**
capabilities — those six engines PLUS the six delivery routes (`embed-cloudflare`, `zip`,
`embed-cms`, `embed-s3`, `embed-fly`, `embed-hosted`), each with its own status. It also resolves
env alternative groups, non-secret settings from `newsroom.json`, installed npm dependencies, and
probes the headless browser Remotion needs against a 1 MB floor.

That difference is not cosmetic: with preflight alone, INPUT can tell the journalist what he can
MAKE and says nothing about how he can PUBLISH — so he discovers at EXPORT that his route was
never configured, on a finished visual. The loop knew at INPUT. Say it at INPUT.
(`preflight.mjs` still exists and still works; it is simply the narrower of the two.)

When the report shows key-less engines on a
fresh install (no `.env`, or every engine yellow), tell the journalist what each missing key
unlocks (the `reason` strings carry the get-it URLs) and COLLECT them — one free-text prompt per
key, then save via `bun skills/splash/scripts/save-key.mjs <NAME> <value>` (the ONLY sanctioned
way a key reaches `.env` — never hand-edit the file, never echo the value back), then re-run
preflight and confirm. A journalist who wants to skip a key skips the engines it unlocks — the
Stage-1 candidates stay annotated, nothing is silently hidden.

**The GREEN path has a script too — say what he HAS, not that a check passed.** The red path above
is scripted in detail and the green one used to be scripted not at all, so a journalist whose
install was fine learned nothing about his own capabilities. Observed, verbatim, and it is the
WHOLE of what that run told him — inside a parenthesis, in a sentence about something else: « Les
six moteurs sont prêts (préflight vert) ». « Préflight vert » is a check reporting on itself;
« six moteurs » is a count of things he cannot name. Instead, in the journalist's language, in
**three lines maximum**, say what is available and — one short clause each — what it lets him
MAKE. Each engine entry of the preflight report carries a newsroom-facing `label` (`ENGINE_LABELS`,
`skills/splash/src/preflight.ts`): those labels are the SOURCE of what is ready, **not the
wording** — read them, then GROUP them into the journalist's capabilities. Six engine labels
listed one by one would blow the three-line budget, name a SaaS vendor in journalist copy, and
expose an in-house/hosted split he has no use for. `dw-chart` + `chart-native` ⇒ « des
graphiques » · `map-dw` + `map-native` ⇒ « des cartes » · `scrolly` ⇒ « un scrolly » ·
`image-native` ⇒ « un récit photo ». Never the producer ids, never the raw labels, never a bare
count:

> « Tout est en place : je peux te faire des **graphiques** (statiques, interactifs ou en vidéo),
> des **cartes** (idem), un **scrolly** qui se déroule au défilement, et un **récit photo** si tu
> as les images. »

**Say that the check RAN, not only what it found.** Observed: a journalist who could not tell whether
the keys had been verified at all. One clause is enough and it belongs in the same breath as the
capability line — « j'ai vérifié tes accès : … ». A silent check and an absent check read identically
from the outside, and the whole point of doing it at INPUT is that he stops worrying about it.

**Then one line on PUBLISHING, from the same answer** — the six delivery capabilities, grouped the
same way and never listed one by one: `zip` ⇒ « un paquet à télécharger » · `embed-cloudflare` /
`embed-fly` / `embed-s3` ⇒ « un lien intégrable » · `embed-cms` ⇒ « directement dans We.Publish ».
Say what is `ready`, and name a `disabled` route only when he asks for it or when it is the one he
will want. This is the line preflight could never produce, and its absence is why a journalist
could reach EXPORT with a finished visual and no way to ship it:

> « Pour la diffusion : paquet téléchargeable et lien intégrable disponibles ; le CMS n'est pas
> branché. »

Then say the same for what is NOT available and what it costs him — « la carte demande une clé
MapTiler (gratuite, 2 min) ; sans elle je reste sur les graphiques » — and move on. It is an
ANNOUNCEMENT, not a question: it never blocks, and it is said ONCE, at INPUT.

**Absent ≠ nonexistent — for keys as for anything else.** A key that is missing is a key the
journalist has not GIVEN yet, never a capability that does not exist: name it, say what it
unlocks and where to get it, and let him decline. Never present a key-less engine as an
impossibility. This is the same rule the newsroom charter gets at CADRAGE Q5, and the same one
`lib/source/policy.ts` enforces for sources — an absent declaration is `source-undeclared`, never
a fact inferred by default.

**No article supplied → ask for the article** before anything else (canonical step 2): a bare
topic or a lone dataset does not start CADRAGE — ask once, plainly (« envoie-moi l'article, ou
dis-moi s'il n'existe pas encore »). Only when the journalist confirms there IS no article does
the bare-topic path (name the real dataset the topic needs) apply.

### 2. ANALYSE (silent)

Invoke `suggest-article` **as a real Skill call** (not a mental paraphrase — actually run the
`suggest-article` skill; the ACT differs per host, see « How to invoke a nested skill » above, and
the fallback is to read `skills/suggest-article/SKILL.md` and follow it) to read silently: identify the data, the quantified claims, and the
narrative structure. Produce NO output to the journalist yet — this primes CADRAGE. Improvising this
analysis inline instead of invoking the skill skips its provenance discipline and guardrails — a real
cost observed in practice, not a theoretical one. For a bare topic (no article/data), instead NAME the
real dataset the topic needs (the honest sans-rien path) and carry that forward.

// intent-copy.ts — the intent question, asked the way a newsroom asks it.
//
// The socle is explicit (2026-07-24-shell-and-desk-journey-design.md §2, beat 2): the tool
// describes factually, pushes back honestly, and THE JOURNALIST CHOOSES THE ANGLE — it never
// proposes the story. So the ranking's semantic input is declared rather than guessed
// (lib/loop/angle.ts) — and the question that collects it must be an EDITORIAL one. A journalist
// is never asked "is your intent part-to-whole?": that is the technical question the socle
// forbids, and `part-to-whole` is a machine id, not a sentence anybody says out loud.
//
// The nine ids stay the vocabulary a HOST names (like `choose-form --option <id>`); what is
// SHOWN is a label plus a concrete claim of that shape, in the newsroom's own language.
//
// Same shape as lib/newsroom/ui-copy.ts — one entry per language, English default, an unknown
// language falls back to English rather than showing a half-translated form. It lives here
// rather than there because this is desk copy: lib/loop/resume.ts is deliberately language-free
// ("English scaffold; the orchestrating agent restates it"), so the localised affordance belongs
// on the façade that already resolves the newsroom's interface language.
//
// Languages shipped: en + fr — parity with ui-copy.ts. de and it are deferred explicitly
// (spec §6); adding one is one entry, and every guard in intent-copy.test.ts covers it on sight.
import { INTENTS, type Intent } from "../brain/intents";
import { DEFAULT_UI_LANG } from "../newsroom/language";

/** One answer a journalist can give: the machine id, how it is said, and a claim of that shape.
 *  `example` is not decoration — it is what separates two neighbouring choices. The keyword pass
 *  measurably confused ranking with magnitude, and spread with geography; the examples for those
 *  pairs are written on the same subject so the difference is the only thing that moves. */
export type IntentChoice = {
  id: Intent;
  label: string;
  example: string;
};

export type IntentCopy = {
  /** The editorial question itself. */
  question: string;
  /** How the keyword pass's reading is offered — as a SUGGESTION to confirm or overrule. */
  suggestionNote: (label: string) => string;
  /** What is said when the wording leans to nothing. Never a silent default. */
  noSuggestion: string;
  /** The nine answers, in the closed vocabulary's own order. */
  choices: IntentChoice[];
};

type Phrasing = { label: string; example: string };

// Keyed by the Intent union, so adding an intent to lib/brain/intents.ts stops this file
// compiling instead of silently shipping a language that is missing an answer.
type PhrasingTable = Record<Intent, Phrasing>;

const EN_PHRASINGS: PhrasingTable = {
  deviation: {
    label: "The gap to a reference: who is above it, who is below",
    example: "Three cantons sit above the Swiss average.",
  },
  correlation: {
    label: "Two things that move together",
    example: "Where income rises, life expectancy rises too.",
  },
  ranking: {
    label: "Who leads and who trails",
    example: "Geneva pays the heaviest premium of the French-speaking cantons.",
  },
  distribution: {
    label: "How the cases spread out, and where the extremes sit",
    example:
      "Premiums span 115 francs between the dearest canton and the cheapest.",
  },
  "change-over-time": {
    label: "What changed, and which way",
    example: "Premiums rose 30% over ten years.",
  },
  magnitude: {
    label: "The size of it: how much, next to what",
    example: "The Geneva premium runs to 583 francs a month.",
  },
  "part-to-whole": {
    label: "What one part weighs inside the whole",
    example: "Housing takes the largest share of household budgets.",
  },
  spatial: {
    label: "Where it happens, place by place",
    example: "The premium burden falls along an east–west divide.",
  },
  flow: {
    label: "What moves from one place — or one state — to another",
    example: "A quarter of Geneva's insured switched provider.",
  },
};

const FR_PHRASINGS: PhrasingTable = {
  deviation: {
    label: "L'écart à une référence : qui est au-dessus, qui est en dessous",
    example: "Trois cantons dépassent la moyenne suisse.",
  },
  correlation: {
    label: "Deux choses qui vont ensemble",
    example: "Là où le revenu monte, l'espérance de vie monte aussi.",
  },
  ranking: {
    label: "Qui est en tête, qui est en queue",
    example: "Genève paie la prime la plus lourde des cantons romands.",
  },
  distribution: {
    label: "Comment les cas s'étalent, et où sont les extrêmes",
    example:
      "La prime varie de 115 francs entre le canton le plus cher et le moins cher.",
  },
  "change-over-time": {
    label: "Ce qui a changé, et dans quel sens",
    example: "Les primes ont augmenté de 30 % en dix ans.",
  },
  magnitude: {
    label: "L'ordre de grandeur : combien, à côté de quoi",
    example: "La prime genevoise pèse 583 francs par mois.",
  },
  "part-to-whole": {
    label: "Ce qu'une part pèse dans l'ensemble",
    example: "Le logement absorbe la plus grosse dépense des ménages.",
  },
  spatial: {
    label: "Où ça se passe sur le territoire",
    example: "Le poids des primes dessine une fracture est-ouest.",
  },
  flow: {
    label: "Ce qui passe d'un endroit — ou d'un état — à un autre",
    example: "Un quart des assurés genevois ont changé de caisse.",
  },
};

const EN: IntentCopy = {
  question: "What do you want this to show?",
  suggestionNote: (label) =>
    `Your wording reads like “${label}”. Confirm it or pick another — the choice is yours.`,
  noSuggestion:
    "Your wording does not lean towards any of these, so nothing is assumed: pick the one you mean.",
  choices: INTENTS.map((id) => ({ id, ...EN_PHRASINGS[id] })),
};

const FR: IntentCopy = {
  question: "Que voulez-vous faire voir ?",
  suggestionNote: (label) =>
    `Votre formulation ressemble à « ${label} ». Confirmez, ou choisissez autre chose — c'est vous qui tranchez.`,
  noSuggestion:
    "Votre formulation ne penche vers aucune de ces réponses, donc rien n'est supposé : choisissez celle que vous visez.",
  choices: INTENTS.map((id) => ({ id, ...FR_PHRASINGS[id] })),
};

const TABLE: Record<string, IntentCopy> = { en: EN, fr: FR };

/** The languages this table actually ships, so a caller can say which one it answered in. */
export const INTENT_COPY_LANGUAGES = Object.keys(TABLE);

/** Resolve the base language, exactly as lib/newsroom/ui-copy.ts does. */
export function intentCopyLanguage(lang: string): string {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return base in TABLE ? base : DEFAULT_UI_LANG;
}

export function intentCopy(lang: string): IntentCopy {
  return TABLE[intentCopyLanguage(lang)] ?? EN;
}

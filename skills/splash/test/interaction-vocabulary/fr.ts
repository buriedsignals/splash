// twin/skills/splash/test/interaction-vocabulary/fr.ts
//
// FRENCH — the promise vocabulary for pages that declare `fr`.
//
// This is the language 241 of the 241 delivered pages in `proof/` declare today, and the one the
// guard could not read for as long as its list was English-only. See `README.md` for the rule and
// for what a file here owes.

export default {
  name: "French",

  input: {
    // `survol*` covers survol / survolez / survoler / survolant; `pointe[rz]` the imperative and
    // infinitive of the other verb a French page uses for the same gesture.
    hover: /\bsurvol\w*\b|\bpointe[rz]\b/i,

    // `touche` IS DELIBERATELY ABSENT. In French it is the noun for a keyboard KEY at least as
    // often as it is the verb for a finger ("appuyez sur la touche"), so reading it as a tap
    // promise would invent one on every page that explains its keyboard path. Only the
    // inflections that can ONLY be the gesture are listed.
    tap: /\btouche[rz]\b|\bau toucher\b|\btactile\b/i,

    // `tabul*` covers tabulez / tabuler / tabulation. `clavier` is the noun.
    keyboard: /\bclavier\b|\btabul\w*\b/i,
  },

  // The other half of a promise: the sentence must say something is DISCLOSED, not merely mention
  // an input. `pour (son|sa|ses|leur|leurs)` is the shape the corpus uses most — "survolez
  // n'importe quelle année POUR SON chiffre" — where the verb of disclosure is implied.
  reveal:
    /\baffich\w*\b|\br[ée]v[èe]l\w*\b|\bmontre\w*\b|\bindique\w*\b|\bnomme\w*\b|\bimprime\w*\b|\bdisponible\w*\b|\baccessible\w*\b|\bdonne\w*\b|\bpour (son|sa|ses|leur|leurs)\b/i,
};

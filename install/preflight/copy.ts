// copy.ts — every word the setup page says, in the resolved interface language.
//
// Issue #6 asks orchestration to lead in English by default and to remember the journalist's
// choice. The page is the first thing that speaks, so it obeys the same rule as the emitted
// export block (lib/newsroom/ui-copy.ts): one table, English default, unknown language falls
// back to English rather than showing a half-translated form.

export const MODEL_SCRIPT_ID = "preflight-model";

/** The section ids, in the order a newsroom lives them (spec 2026-07-26 §3). */
export const PAGE_SECTIONS = [
  "newsroom",
  "assistant",
  "capabilities",
  "publishing",
  "readiness",
] as const;

export type PageSection = (typeof PAGE_SECTIONS)[number];

export type PageCopy = {
  title: string;
  lede: string;
  privacy: string;

  newsroomTitle: string;
  newsroomHint: string;
  newsroomName: string;
  newsroomUrl: string;
  newsroomColor: string;
  profileOwned: string;
  profileGround: string;

  /** The action that measures the address just typed above ("read my site"). */
  measureAction: string;
  measuring: string;
  measureNeedsUrl: string;
  measureFailed: string;
  /** Shown when a measurement's palette comes back empty — a legitimate answer, not an error. */
  siteDeclaresNothing: string;
  /** Appended to an INFERRED (not declared) colour reading, so it reads as the guess it is. */
  charterInferred: string;
  /** Caption over an existing profile's series colours (`palette[1+]`) — shown, not editable. */
  seriesColoursKept: string;

  /** The publication language field — a profile field, edited here (the profile is where it lives). */
  languageContent: string;

  assistantTitle: string;
  assistantHint: string;
  loginOptionalHint: string;

  capabilitiesTitle: string;
  capabilitiesHint: string;
  /**
   * Under a capability whose field is upfront (asked once, above): `${field.label} — ${this}`.
   * Every engine field is upfront now, so this fires under every engine capability.
   */
  askedOnceAbove: string;
  publishingTitle: string;
  publishingHint: string;
  unavailable: string;

  readinessTitle: string;
  readinessHint: string;
  /** Prefixes the field(s) that would open an engine not yet available: `${this} ${opensWith}`. */
  opensWith: string;
  nothingBlocking: string;
  /** Introduces the list of fields a capability still needs. */
  needs: string;
  /** What a live check said, when it said something the saved state does not know. */
  rejectedByProvider: string;
  unreachableProvider: string;

  configured: string;
  configuredHint: string;
  technicalDetail: string;

  check: string;
  checking: string;
  save: string;
  saving: string;
  saved: string;
  savedHint: string;
  saveFailed: string;
  blankRequired: string;

  summaryReady: string;
  summaryMissing: string;
  summaryDegraded: string;
};

const EN: PageCopy = {
  title: "Set up your newsroom",
  lede: "Splash needs to know what your newsroom can do and how you want to publish. This takes a couple of minutes, once.",
  privacy:
    "Your keys are checked with each provider and written to a file on this machine. Nothing is sent anywhere else.",

  newsroomTitle: "Your newsroom",
  newsroomHint:
    "Used as the default credit under every visual, and as the house colour they are drawn in.",
  newsroomName: "Newsroom name",
  newsroomUrl: "Website (optional)",
  newsroomColor: "House colour",
  profileOwned:
    "You already have a newsroom profile. Editing the fields below and saving updates it — everything else in NEWSROOM-PROFILE.md, your own comments included, is left exactly as it is.",
  profileGround: "House ground",

  measureAction: "Read my site",
  measuring: "Reading…",
  measureNeedsUrl: "Enter your website address first.",
  measureFailed: "Could not read your site — check the address and try again.",
  siteDeclaresNothing:
    "Your site does not declare a house colour we can read — a legitimate answer. Type one in below.",
  charterInferred: "(a guess — not a colour your site names as its own)",
  seriesColoursKept: "Also part of your palette, kept as they are:",

  languageContent: "Language your visuals are published in",

  assistantTitle: "Your assistant",
  assistantHint: "The AI runtime that drives Splash on this machine.",
  loginOptionalHint:
    "Leave blank if you have a subscription — you will sign in on first launch.",

  capabilitiesTitle: "Your accounts",
  capabilitiesHint: "The keys below are asked once, whatever you use.",
  askedOnceAbove: "asked once, above.",
  publishingTitle: "Publishing",
  publishingHint:
    "Where a finished visual goes. A downloadable package always works, with no account at all.",
  unavailable: "Not available yet",

  readinessTitle: "What you'll be able to produce",
  readinessHint:
    "From what you've just entered. An account with no key is a choice, not a defect.",
  opensWith: "Opens with:",
  nothingBlocking: "Nothing is in the way.",
  needs: "needs",
  rejectedByProvider:
    "the provider did not accept this key — check it and run the check again",
  unreachableProvider:
    "the provider could not be reached — the key may well be fine; you can save and check later",

  configured: "Already configured",
  configuredHint: "Leave blank to keep it.",
  technicalDetail: "Technical detail",

  check: "Check my keys",
  checking: "Checking…",
  save: "Save and continue",
  saving: "Saving…",
  saved: "Saved",
  savedHint: "Return to your Terminal — the install continues.",
  saveFailed: "Could not save",
  blankRequired:
    "The destination you chose to publish through still needs a key. Save anyway? You can re-run the setup later.",

  summaryReady: "ready",
  summaryMissing: "missing",
  summaryDegraded: "unverified",
};

const FR: PageCopy = {
  title: "Configurer votre rédaction",
  lede: "Splash a besoin de savoir ce que votre rédaction peut produire et comment vous publiez. Deux minutes, une seule fois.",
  privacy:
    "Vos clés sont vérifiées auprès de chaque fournisseur et écrites dans un fichier sur cette machine. Rien n'est envoyé ailleurs.",

  newsroomTitle: "Votre rédaction",
  newsroomHint:
    "Sert de crédit par défaut sous chaque visuel, et de couleur maison pour les dessiner.",
  newsroomName: "Nom de la rédaction",
  newsroomUrl: "Site web (facultatif)",
  newsroomColor: "Couleur maison",
  profileOwned:
    "Vous avez déjà un profil de rédaction. Modifier les champs ci-dessous puis enregistrer le met à jour — le reste de NEWSROOM-PROFILE.md, y compris vos propres commentaires, reste exactement tel quel.",
  profileGround: "Fond maison",

  measureAction: "Lire mon site",
  measuring: "Lecture…",
  measureNeedsUrl: "Entrez d'abord l'adresse de votre site.",
  measureFailed:
    "Impossible de lire votre site — vérifiez l'adresse et réessayez.",
  siteDeclaresNothing:
    "Votre site ne déclare aucune couleur maison lisible — une réponse légitime. Saisissez-en une ci-dessous.",
  charterInferred:
    "(une supposition — pas une couleur que votre site déclare comme la sienne)",
  seriesColoursKept:
    "Font aussi partie de votre palette, conservées telles quelles :",

  languageContent: "Langue de publication de vos visuels",

  assistantTitle: "Votre assistant",
  assistantHint: "Le runtime IA qui pilote Splash sur cette machine.",
  loginOptionalHint:
    "Laissez vide si vous avez un abonnement — vous vous connecterez au premier lancement.",

  capabilitiesTitle: "Vos comptes",
  capabilitiesHint:
    "Les clés ci-dessous sont demandées une fois, quel que soit votre usage.",
  askedOnceAbove: "déjà demandée plus haut.",
  publishingTitle: "Publication",
  publishingHint:
    "Où va un visuel terminé. Le paquet téléchargeable marche toujours, sans aucun compte.",
  unavailable: "Pas encore disponible",

  readinessTitle: "Ce que vous pourrez produire",
  readinessHint:
    "À partir de ce que vous venez de saisir. Un compte sans clé est un choix, pas un défaut.",
  opensWith: "S'ouvre avec :",
  nothingBlocking: "Rien ne bloque.",
  needs: "nécessite",
  rejectedByProvider:
    "le fournisseur a refusé cette clé — vérifiez-la puis relancez la vérification",
  unreachableProvider:
    "le fournisseur est injoignable — la clé est peut-être bonne ; vous pouvez enregistrer et vérifier plus tard",

  configured: "Déjà configuré",
  configuredHint: "Laissez vide pour le conserver.",
  technicalDetail: "Détail technique",

  check: "Vérifier mes clés",
  checking: "Vérification…",
  save: "Enregistrer et continuer",
  saving: "Enregistrement…",
  saved: "Enregistré",
  savedHint: "Retournez dans le Terminal — l'installation continue.",
  saveFailed: "Impossible d'enregistrer",
  blankRequired:
    "La destination choisie pour publier a encore besoin d'une clé. Enregistrer quand même ? Vous pourrez relancer la configuration plus tard.",

  summaryReady: "prêt",
  summaryMissing: "manquant",
  summaryDegraded: "non vérifié",
};

const TABLE: Record<string, PageCopy> = { en: EN, fr: FR };

export function pageCopy(lang: string): PageCopy {
  const base = (lang || "en").toLowerCase().split("-")[0]!;
  return TABLE[base] ?? EN;
}

export type LanguageOption = { id: string; label: string };

/** Endonyms — a language is named in itself, never translated into the current interface. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

/**
 * The languages the PAGE SPEAKS, derived from the copy table rather than listed beside it.
 *
 * The two used to be written twice, and drifted: the selector offered Deutsch and Italiano
 * while this table knew `en`/`fr`, so picking German re-rendered the page in English. Deriving
 * the list is what makes that unrepresentable — a translation appears in the selector by
 * landing in the table, and disappears by leaving it.
 */
export const UI_LANGUAGES: LanguageOption[] = Object.keys(TABLE).map((id) => ({
  id,
  label: LANGUAGE_LABELS[id] ?? id,
}));

/**
 * The languages a newsroom may PUBLISH in — deliberately a superset of the above.
 *
 * The content language rides on the profile and reaches the delivered package as a BCP-47
 * string; nothing about it requires Splash's own interface to be translated. Collapsing the
 * two lists into one would take German publishing away to fix a German setup page.
 */
export const CONTENT_LANGUAGES: LanguageOption[] = Object.entries(
  LANGUAGE_LABELS,
).map(([id, label]) => ({ id, label }));

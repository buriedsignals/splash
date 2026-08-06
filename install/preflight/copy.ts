// copy.ts — every word the setup page says, in the resolved interface language.
//
// Issue #6 asks orchestration to lead in English by default and to remember the journalist's
// choice. The page is the first thing that speaks, so it obeys the same rule as the emitted
// export block (lib/newsroom/ui-copy.ts): one table, English default, unknown language falls
// back to English rather than showing a half-translated form.
import {
  SIGNAL_LABEL,
  type ColourSignal,
  type TypeMeasurement,
} from "../../lib/newsroom/charter.ts";

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
  /** What the ground field actually accepts (M2) — it is free text over a reader that silently
   *  DROPS anything that is not "dark", "light" or a `#rrggbb` hex; nothing else says so. */
  profileGroundHelp: string;

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

  // M1 — the charter receipt vocabulary (lib/newsroom/charter.ts's `SIGNAL_LABEL` plus
  // charter-endpoint.ts's TYPE_ROLE_LABEL, and the two sentence shapes those labels fill into).
  // These are the flagship feature of this branch — "a journalist can only disagree with a value
  // whose origin they can see" — read by a French newsroom exactly as often as an English one.
  /** What kind of declaration a colour was read from — keyed like `ColourSignal`. `en` is the
   *  SAME strings as charter.ts's `SIGNAL_LABEL` (one English source, not a second copy that can
   *  drift from it); `fr` is this table's own translation. */
  signalLabel: Record<ColourSignal, string>;
  /** What a measured typeface role is called — keyed like `TypeMeasurement["role"]`. */
  typeRoleLabel: Record<TypeMeasurement["role"], string>;
  /** "${this} ${signalLabel}: `${token}`. ${receiptSource} ${source}" — a colour receipt. */
  receiptReadFrom: string;
  /** "${this} ${typeRoleLabel}: `${token}`. ${receiptSource} ${source}" — a typeface receipt. */
  receiptReadFont: string;
  /**
   * Names WHERE the token was read from — the newsroom's own page/CDN, or a third-party
   * stylesheet (an analytics widget, a CDN unrelated to the newsroom) the page happens to link.
   * This is the whole reason `Measurement.source`/`TypeMeasurement.source` exist: since the
   * same-host filter on stylesheets was lifted, a reading can come from any sheet the page
   * links, and only naming it lets the journalist judge whether it is really their own.
   */
  receiptSource: string;

  /** The publication language field — a profile field, edited here (the profile is where it lives). */
  languageContent: string;

  assistantTitle: string;
  assistantHint: string;
  loginOptionalHint: string;

  capabilitiesTitle: string;
  capabilitiesHint: string;
  /**
   * Shown under a DELIVERY row (the only capability that still renders as a row —
   * `capabilityRow`, Task 5 2026-08-06 retired the engine one) in place of a field it needs but
   * does not own: `${field.label} — ${this}`. That is a production key an engine already asks
   * for upfront, above, in "Your accounts" — or, occasionally, a field two delivery destinations
   * happen to name the same (`endpoint`). Engines themselves never fire this any more: they do
   * not render as capability rows at all, so "asked once, above" always means "asked in the
   * accounts section", never "asked by another engine row" — that second row no longer exists.
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
    "You already have a newsroom profile. Editing the fields below and saving updates it — the rest of NEWSROOM-PROFILE.md, your prose and any comment on its own line included, is left exactly as it is. (A comment on the SAME line as a field you change here does not survive that edit.)",
  profileGround: "House ground",
  profileGroundHelp:
    'One of three things: "light", "dark", or a hex colour such as #12161c. Anything else is not saved.',

  measureAction: "Read my site",
  measuring: "Reading…",
  measureNeedsUrl: "Enter your website address first.",
  measureFailed: "Could not read your site — check the address and try again.",
  siteDeclaresNothing:
    "Your site does not declare a house colour we can read — a legitimate answer. Type one in below.",
  charterInferred: "(a guess — not a colour your site names as its own)",
  seriesColoursKept: "Also part of your palette, kept as they are:",

  signalLabel: SIGNAL_LABEL,
  typeRoleLabel: {
    body: "the body text",
    headings: "the headings",
    webfont: "a self-hosted webfont",
  },
  receiptReadFrom: "Read from",
  receiptReadFont: "Read as the font of",
  receiptSource: "Source:",

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
    "Vous avez déjà un profil de rédaction. Modifier les champs ci-dessous puis enregistrer le met à jour — le reste de NEWSROOM-PROFILE.md, votre texte et tout commentaire sur sa propre ligne compris, reste exactement tel quel. (Un commentaire sur la MÊME ligne qu'un champ que vous modifiez ici ne survit pas à cette modification.)",
  profileGround: "Fond maison",
  profileGroundHelp:
    "Trois formes acceptées : « light », « dark », ou une couleur hexadécimale comme #12161c. Toute autre valeur n'est pas enregistrée.",

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

  // FR translations of lib/newsroom/charter.ts's SIGNAL_LABEL (English source, see the EN table
  // above) — kept in the same order so a diff of the two tables reads as a translation, not a
  // reshuffle.
  signalLabel: {
    "theme-color":
      "la couleur que le site déclare aux navigateurs comme la sienne (<meta theme-color>)",
    "brand-property":
      "une couleur que la feuille de style du site NOMME comme sa couleur de marque/primaire",
    "accent-property":
      "une couleur que la feuille de style nomme comme un ACCENT (souvent un survol ou un badge, pas le bandeau)",
    masthead: "le remplissage d'un SVG dans l'élément bandeau/logo",
    link: "la couleur des liens",
    control: "le fond des boutons",
    "recurrent-role":
      "une couleur répétée sur plusieurs déclarations bouton/bandeau/bordure, sans que rien ne la nomme comme la marque",
    declared: "une couleur déclarée quelque part dans la feuille de style",
  },
  typeRoleLabel: {
    body: "le texte courant",
    headings: "les titres",
    webfont: "une police auto-hébergée",
  },
  receiptReadFrom: "Lu depuis",
  receiptReadFont: "Lu comme police de",
  receiptSource: "Source :",

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

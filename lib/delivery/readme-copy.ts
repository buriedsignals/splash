// readme-copy — what the owned package SAYS, in the newsroom's own language.
//
// lib/core/locale.ts localises numbers and a visual's furniture; this localises the prose of
// the two READMEs the zip adapter writes. Same distinction lib/newsroom/ui-copy.ts draws, and
// the same shape: one typed record per language, an unknown language falls back to English.
//
// It lives in lib/delivery rather than reusing ui-copy because the two answer different
// questions and are keyed on different languages: ui-copy is INTERFACE copy, keyed on the
// install's UI language; this is keyed on `DeliveryMetadata.lang`, the newsroom's CONTENT
// language (NEWSROOM-PROFILE.md). A package handed to a French newsroom about a French visual
// is read in French — that is the spec's "le README est dans la langue de contenu" (§4.4).
//
// {en, fr} only, deliberately: de and it wait on a speaker, exactly as lib/host/intent-copy.ts
// and install/preflight/copy.ts do, and that wait is a registry pile-C entry. A machine
// translation here would be worse than the fallback.
import { sourceLabel, type Lang } from "../core/locale";

export type ReadmeCopy = {
  howTo: string;
  /** Embed genre: the newsroom hosts the file itself, then pastes the snippet. */
  uploadAnywhere: (entryName: string) => string;
  pasteSnippet: string;
  /** File genre: the CMS has a native field for the image or the video. */
  uploadToField: (entryName: string, field: string) => string;
  /** Two lines: the second is the indented continuation of the first. */
  pasteAltText: [string, string];
  imageField: string;
  videoField: string;
  /** Taken from lib/core/locale.ts, the ONE owner of this label — so the package's Source line
   * is byte-identical to the one painted on the visual it wraps. */
  source: string;
  credit: string;
  identifier: string;
};

const EN: ReadmeCopy = {
  howTo: "## How to integrate",
  uploadAnywhere: (entryName) =>
    `1. Upload \`${entryName}\` anywhere your newsroom serves static files.`,
  pasteSnippet:
    "2. Paste the snippet below into your article, replacing the URL with where you uploaded it.",
  uploadToField: (entryName, field) =>
    `1. Upload \`${entryName}\` through your CMS's ${field} field.`,
  pasteAltText: [
    "2. Paste the text from `ALT.txt` into the alternative-text field next to it — that is what",
    "   a screen reader announces, and Splash cannot put it there for you.",
  ],
  imageField: "image",
  videoField: "video",
  source: sourceLabel("en"),
  credit: "Credit:",
  identifier: "Identifier:",
};

// French spaces its colons, the same convention lib/core/locale.ts already applies to
// "Source :" — so the furniture lines of a French package match the furniture of the French
// visual inside it.
const FR: ReadmeCopy = {
  howTo: "## Comment l'intégrer",
  uploadAnywhere: (entryName) =>
    `1. Déposez \`${entryName}\` là où votre rédaction héberge ses fichiers statiques.`,
  pasteSnippet:
    "2. Collez le code ci-dessous dans votre article, en remplaçant l'URL par celle où vous l'avez déposé.",
  uploadToField: (entryName, field) =>
    `1. Importez \`${entryName}\` dans le champ ${field} de votre CMS.`,
  pasteAltText: [
    "2. Recopiez le texte de `ALT.txt` dans le champ de texte alternatif juste à côté — c'est ce",
    "   qu'annonce un lecteur d'écran, et Splash ne peut pas le remplir à votre place.",
  ],
  imageField: "image",
  videoField: "vidéo",
  source: sourceLabel("fr"),
  credit: "Crédit :",
  identifier: "Identifiant :",
};

const TABLE: Record<string, ReadmeCopy> = { en: EN, fr: FR };

/** Exact tag → base subtag → English. Mirrors lib/core/locale.ts's localeFor. */
export function readmeCopy(lang?: Lang): ReadmeCopy {
  if (typeof lang !== "string") return EN;
  const tag = lang.toLowerCase();
  return TABLE[tag] ?? TABLE[tag.split("-")[0]!] ?? EN;
}

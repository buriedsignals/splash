// The PUBLISHED projection of a source — the only object that may leave the newsroom.
//
// It is a DIFFERENT TYPE from the declaration, built field by field from an allow-list, never by
// spreading the declaration and deleting what must not ship. That is what makes "private paths
// never appear in exported visuals" (issue #7) structural: there is no code path that carries an
// internalRef here, so no reviewer has to remember that there must not be one.
//
// The obligation to credit is mechanical for the same reason: the policy hands the caller a
// FINISHED credit line rather than a boolean. Publishing without attribution now means throwing
// away a value that was put in your hand, which is an act, not an oversight.
//
// The "Source:" prefix comes from lib/core/locale.ts — the same table every engine already
// renders furniture with (fr "Source :" with its French space, de "Quelle:", it "Fonte:"), so a
// newsroom does not get a fifth spelling of the word from this module.
import { sourceLabel } from "../core/locale";
import type { SourceDeclaration } from "./kinds";
import { requirementsFor } from "./requirements";

export interface PublishedSource {
  /** The full furniture line. Empty ONLY for `none`, whose visual asserts no facts. */
  credit: string;
  /** Present only for kinds that publish a url, and only when one was declared. */
  url?: string;
  /** A warning the visual must display. Also inlined into `credit` — see below. */
  notice?: string;
}

// A prose figure is an already-published claim, not a record Splash can re-verify. The credit
// says so in the reader's language: the number comes from the article's text.
export const PROSE_QUALIFIER: Record<string, string> = {
  fr: "chiffres cités dans l'article",
  de: "im Artikel genannte Zahlen",
  it: "cifre citate nell'articolo",
  en: "figures quoted in the article",
};

// Demo data that somehow reaches a render must SAY it is demo data. Upper case because this is
// the one furniture string whose job is to be impossible to mistake for reporting.
export const SYNTHETIC_NOTICE: Record<string, string> = {
  fr: "DONNÉES DE DÉMONSTRATION — PAS DES FAITS",
  de: "DEMONSTRATIONSDATEN — KEINE FAKTEN",
  it: "DATI DIMOSTRATIVI — NON SONO FATTI",
  en: "DEMONSTRATION DATA — NOT REPORTING",
};

function forLang(table: Record<string, string>, lang?: string): string {
  const base = lang?.toLowerCase().split(/[-_]/)[0];
  return (base && table[base]) || table.en!;
}

/**
 * Compose what the reader is shown. Assumes nothing about validity — a declaration that the
 * policy would refuse still gets a projection with the forbidden fields DROPPED, because
 * furniture is also called on data validated earlier and must never be the path a forbidden
 * field takes to the screen.
 */
export function publishedSourceFor(
  decl: SourceDeclaration,
  lang?: string,
): PublishedSource {
  const rules = requirementsFor(decl.kind);
  const label = decl.label?.trim() ?? "";
  if (rules.label === "forbidden" || label === "") return { credit: "" };

  let credit = `${sourceLabel(lang)} ${label}`;
  if (decl.kind === "prose")
    credit = `${credit} (${forLang(PROSE_QUALIFIER, lang)})`;

  const notice = rules.requiresNotice
    ? forLang(SYNTHETIC_NOTICE, lang)
    : undefined;
  // Inlined into the credit as well: a renderer that prints only the credit line still prints
  // the warning. Nothing here relies on a downstream engine reading an optional field.
  if (notice) credit = `${credit} — ${notice}`;

  const url =
    rules.url !== "forbidden" && decl.url?.trim() ? decl.url.trim() : undefined;

  return { credit, ...(url ? { url } : {}), ...(notice ? { notice } : {}) };
}

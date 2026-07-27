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
  /** The full furniture line, locale prefix included ("Source : OFS"). Empty ONLY for `none`,
   *  whose visual asserts no facts. For a caller that renders a BARE line — a zip README, an
   *  embed attribute, a snippet — and owns no furniture of its own. */
  credit: string;
  /**
   * The same composed line WITHOUT the leading locale label ("OFS"), for the callers that
   * already own that furniture: every rendering engine does. ChartFrame renders
   * `{sourceLabel(lang)} {source.name}` (skills/chart-native/src/core/ChartFrame.tsx:275) and
   * lib/delivery/adapters/zip.ts writes `Source: ${m.source}` — handing either of them `credit`
   * prints "Source : Source : OFS". Everything that is part of WHAT IS SAID (the prose
   * qualifier, the synthetic notice) stays in here; only the label is removed.
   *
   * Invariant, locked by a test over every kind × language:
   * `credit === "" ? attribution === "" : credit === sourceLabel(lang) + " " + attribution`.
   */
  attribution: string;
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
  if (rules.label === "forbidden" || label === "")
    return { credit: "", attribution: "" };

  // Composed WITHOUT the locale label first, so the two fields cannot drift: `credit` is
  // literally the prefix plus this. Both the prose qualifier and the synthetic notice belong
  // here rather than only on `credit` — an engine that owns its own "Source:" furniture must
  // not be the one caller that silently drops the demonstration warning.
  let attribution = label;
  if (decl.kind === "prose")
    attribution = `${attribution} (${forLang(PROSE_QUALIFIER, lang)})`;

  const notice = rules.requiresNotice
    ? forLang(SYNTHETIC_NOTICE, lang)
    : undefined;
  // Inlined into the credit as well: a renderer that prints only the credit line still prints
  // the warning. Nothing here relies on a downstream engine reading an optional field.
  if (notice) attribution = `${attribution} — ${notice}`;

  const url =
    rules.url !== "forbidden" && decl.url?.trim() ? decl.url.trim() : undefined;

  return {
    credit: `${sourceLabel(lang)} ${attribution}`,
    attribution,
    ...(url ? { url } : {}),
    ...(notice ? { notice } : {}),
  };
}

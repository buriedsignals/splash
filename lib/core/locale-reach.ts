// A number a reader SEES must go through the locale table. This module is the guard that makes
// that checkable — not a new detection: the helpers exist (lib/core/locale.ts), and 22 visible
// files simply never call them, so a French chart printed "52.0" and a French cartogram printed
// "3.5" with an English decimal point.
//
// The point of a GUARD rather than 22 fixes: the 23rd site would reappear the next month, and
// nobody would notice until a run in the field. This is a drift guard in the same family as
// lib/brain/typology-drift.test.ts — pure here, fed the tree by each engine's own test.
//
// lib/core imports nothing.

export type NumberPaintSite = { line: number; text: string };
export type SourceFile = { path: string; source: string };

// `.toFixed(` is the whole vocabulary on purpose: it is what the 40 measured sites use, and a
// broader pattern (String(n), template interpolation of a number) cannot be told apart from an
// id or a pixel coordinate without types. A guard that fires on pixel maths is a guard people
// disable.
const PAINT = /\.toFixed\s*\(/;
// HELPERS names are those lib/core/locale.ts exports today. Task 8 (chart-native) extracts a
// shared number-painting helper — when it lands, add its name here; do not hard-code an
// assumption elsewhere about there being exactly these four.
const HELPERS =
  /\b(formatLocaleNumber|localizeDecimal|localizeNumberString|labelWithUnit)\s*\(/;

export function numberPaintSites(source: string): NumberPaintSite[] {
  const out: NumberPaintSite[] = [];
  source.split("\n").forEach((text, i) => {
    if (PAINT.test(text)) out.push({ line: i + 1, text: text.trim() });
  });
  return out;
}

export function callsLocaleHelper(source: string): boolean {
  return HELPERS.test(source);
}

function offends(f: SourceFile): boolean {
  return numberPaintSites(f.source).length > 0 && !callsLocaleHelper(f.source);
}

/** One sentence per offending file that is NOT exempt. */
export function localeReachViolations(
  files: SourceFile[],
  opts: { exempt: readonly string[] },
): string[] {
  return files
    .filter((f) => offends(f) && !opts.exempt.includes(f.path))
    .map((f) => {
      const sites = numberPaintSites(f.source);
      return (
        `${f.path} paints ${sites.length} number(s) without a locale helper ` +
        `(first at line ${sites[0]!.line}: ${sites[0]!.text}) — route it through ` +
        `localizeNumberString/formatLocaleNumber with the deliverable's lang`
      );
    });
}

/** Exemptions that no longer apply: the file was fixed (or deleted) and the debt list still
 *  names it. Without this the list rots into a permanent allowlist. */
export function staleExemptions(
  files: SourceFile[],
  opts: { exempt: readonly string[] },
): string[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  return opts.exempt.filter((p) => {
    const f = byPath.get(p);
    return f === undefined ? false : !offends(f);
  });
}

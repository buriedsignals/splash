// core/date-locale — the ONE place a date becomes a string, in the four languages splash
// finishes deliverables in. Shared by every engine (lib/core imports nothing).
//
// ★ WHY THE MONTH IS ALWAYS A NAME, NEVER A NUMBER.
// "03/04/2024" is the 3rd of April in fr/de/it and the 4th of March in en-US. Both readings
// are ordinary, the chart carries nothing that distinguishes them, and they are a month
// apart — so a numeric day/month date is not a date, it is two dates. Every formatter here
// writes the month as a NAME ("3 avr.", "3. Apr.", "3 Apr") and `parseIsoDate` REFUSES the
// numeric little/middle-endian shapes on input rather than picking one. The only numeric
// order accepted is the big-endian ISO one (YYYY-MM-DD), where the leading four-digit year
// makes the order self-evident. This is exactly why ISO 8601 exists.
//
// ★ WHY AN EXPLICIT TABLE, NOT Intl.
// The same reason lib/core/locale.ts gives for numbers: the output must be byte-identical
// across Node, Remotion's render process and the browser build, and ICU data differs between
// environments and versions. A video still and its interactive twin that disagree about a
// month abbreviation is a defect nobody would think to look for. The rows below were
// CAPTURED from CLDR (probed once via Intl.DateTimeFormat with timeZone UTC) and then
// written down; nothing calls Intl at runtime.
//
// ★ WHY UTC, ALWAYS.
// A calendar day is a label, not an instant. Parsing "2024-04-03" in local time puts a
// Zurich reader's render and a UTC CI runner's render on different days for the same CSV —
// and the calendar heatmap would place the cell in a different column. Every ms here is UTC
// midnight and every accessor is a getUTC*.
//
// ★ WHY WEEKS START ON MONDAY.
// ISO 8601 (and every European calendar the covered languages are read in). The Sunday-first
// week is a US convention; a calendar grid drawn Sunday-first shifts the whole weekend block
// for a Swiss newsroom.

import type { Lang } from "./locale";

/** The written forms of a date, one row per covered language. */
export interface DateCopy {
  /** 12 abbreviated month names, January first. */
  monthsShort: readonly string[];
  /** 7 abbreviated weekday names, MONDAY first (ISO 8601 week). */
  weekdaysShortMonday: readonly string[];
  /**
   * How the language joins a day NUMBER to a month NAME. German writes the day as an
   * ordinal ("3. Apr."), the others do not ("3 avr."), and the difference is visible on
   * every axis label — so it is a row of the table, not a shared template.
   */
  dayMonth: (day: number, month: string) => string;
}

const EN: DateCopy = {
  monthsShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  weekdaysShortMonday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  dayMonth: (day, month) => `${day} ${month}`,
};

const FR: DateCopy = {
  monthsShort: [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
  ],
  weekdaysShortMonday: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
  dayMonth: (day, month) => `${day} ${month}`,
};

// German abbreviations carry the trailing point that marks an abbreviation ("Apr." for
// April) — CLDR's own de-DE short forms omit it for some months, but the Duden rule and
// DIN 5008 write the point, and a column of labels where three months carry a point and
// nine do not reads as an inconsistency, not as data. Written uniformly, deliberately.
const DE: DateCopy = {
  monthsShort: [
    "Jan.",
    "Feb.",
    "Mär.",
    "Apr.",
    "Mai",
    "Juni",
    "Juli",
    "Aug.",
    "Sept.",
    "Okt.",
    "Nov.",
    "Dez.",
  ],
  weekdaysShortMonday: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  // The German day is an ORDINAL: "3. April", never "3 April".
  dayMonth: (day, month) => `${day}. ${month}`,
};

const IT: DateCopy = {
  monthsShort: [
    "gen",
    "feb",
    "mar",
    "apr",
    "mag",
    "giu",
    "lug",
    "ago",
    "set",
    "ott",
    "nov",
    "dic",
  ],
  weekdaysShortMonday: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
  dayMonth: (day, month) => `${day} ${month}`,
};

export const DATE_COPY: Record<"en" | "fr" | "de" | "it", DateCopy> = {
  en: EN,
  fr: FR,
  de: DE,
  it: IT,
};

/** The row for `lang`, by base subtag ("fr-CH" → fr). An uncovered tag falls back to
 *  English — the same safety net (not a shipping path) as `storyCopy`. */
export function dateCopy(lang?: Lang): DateCopy {
  const base =
    typeof lang === "string" ? lang.toLowerCase().split(/[-_]/)[0] : undefined;
  return (base && DATE_COPY[base as keyof typeof DATE_COPY]) || EN;
}

/** How precise the journalist's own string was. A date is never printed FINER than the
 *  grain it arrived in — "2023-05" knows the month, not the day. */
export type DateGrain = "year" | "month" | "day";

export interface CalendarDate {
  /** UTC midnight of the first instant of the grain. */
  ms: number;
  grain: DateGrain;
}

// Big-endian only: a four-digit year, then an optional month, then an optional day, joined
// by "-" or "/" (consistently). Anything else — "03/04/2024", "3.4.2024", "4 Apr 2024" — is
// refused rather than guessed. `parseFlexibleDate` (chart-native's line/scatter time axis)
// admits the same set, so the classifier and this parser cannot disagree.
const ISO = /^(\d{4})(?:([-/])(\d{1,2})(?:\2(\d{1,2}))?)?$/;

/**
 * A calendar date, or `null` when the string is not one of the accepted unambiguous shapes.
 * Never rolls over: "2024-02-30" is refused, not moved to 1 March, because a CSV that says
 * the 30th of February is wrong and a chart that quietly relocates the day is worse than one
 * that stops.
 */
export function parseIsoDate(s: string): CalendarDate | null {
  const m = ISO.exec(String(s).trim());
  if (!m) return null;
  const year = Number(m[1]);
  if (m[3] === undefined) return { ms: Date.UTC(year, 0, 1), grain: "year" };
  const month = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (m[4] === undefined)
    return { ms: Date.UTC(year, month - 1, 1), grain: "month" };
  const day = Number(m[4]);
  if (day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  // The roll-over check: Date.UTC(2024, 1, 30) is 1 March, whose UTC month is not February.
  const back = new Date(ms);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1)
    return null;
  return { ms, grain: "day" };
}

/**
 * `parseIsoDate` or a refusal that says WHOSE date was refused and what shape would work.
 * `whose` is the caller's own description of the field ('the start of "Land acquisition"'),
 * because a refusal that does not name the row sends the journalist hunting through a CSV.
 */
export function requireIsoDate(s: string, whose: string): CalendarDate {
  const d = parseIsoDate(s);
  if (d) return d;
  throw new Error(
    `date-locale: ${whose} reads "${s}", which is not a date splash will draw. Write it ` +
      `big-endian — YYYY-MM-DD, YYYY-MM or YYYY. A numeric day/month date ("03/04/2024") ` +
      `is refused on purpose: it is the 3rd of April to a French, German or Italian reader ` +
      `and the 4th of March to an American one, and the chart carries nothing that tells ` +
      `them which.`,
  );
}

/** "2024" — the same in every language. */
export function formatYear(ms: number, _lang?: Lang): string {
  return String(new Date(ms).getUTCFullYear());
}

/** "avr. 2024" / "Apr. 2024" — month by NAME. */
export function formatMonthYear(ms: number, lang?: Lang): string {
  const d = new Date(ms);
  return `${dateCopy(lang).monthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "3 avr." / "3. Apr." — month by NAME, no year (for an axis whose span is inside one year). */
export function formatDayMonth(ms: number, lang?: Lang): string {
  const d = new Date(ms);
  const copy = dateCopy(lang);
  return copy.dayMonth(d.getUTCDate(), copy.monthsShort[d.getUTCMonth()]);
}

/** "3 avr. 2024" / "3. Apr. 2024". */
export function formatDayMonthYear(ms: number, lang?: Lang): string {
  return `${formatDayMonth(ms, lang)} ${new Date(ms).getUTCFullYear()}`;
}

/** The date written at the grain it ARRIVED in — never finer than the journalist supplied. */
export function formatAtGrain(d: CalendarDate, lang?: Lang): string {
  return d.grain === "year"
    ? formatYear(d.ms, lang)
    : d.grain === "month"
      ? formatMonthYear(d.ms, lang)
      : formatDayMonthYear(d.ms, lang);
}

/**
 * The first instant AFTER the period a date names — the honest reading of a date used as an
 * END. "2023-06" as an end means "through June", so it closes at 1 July, not at 1 June.
 *
 * This is not a rounding convenience. A gantt whose bars stop at the first instant of the
 * month they name is a month short on every row, and a phase whose start and end name the
 * SAME month ("2023-06" → "2023-06") is drawn zero-wide, which is invisible rather than
 * wrong-looking. `parseIsoDate` deliberately keeps the grain so this can be computed instead
 * of guessed.
 */
export function endOfGrain(d: CalendarDate): number {
  const t = new Date(d.ms);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  if (d.grain === "year") return Date.UTC(y + 1, 0, 1);
  if (d.grain === "month") return Date.UTC(y, m + 1, 1);
  return Date.UTC(y, m, t.getUTCDate() + 1);
}

/** Monday-based weekday index: 0 = Monday … 6 = Sunday (ISO 8601). */
export function mondayIndex(ms: number): number {
  return (new Date(ms).getUTCDay() + 6) % 7;
}

const DAY_MS = 864e5;

/**
 * The grain an AXIS should label a span at: a span of several years is labelled by year, a
 * span of months by month, a short span by day. Thresholds are the obvious ones — three
 * years and ninety days — and they exist so a decade's axis is not eight hundred day labels
 * and a fortnight's is not one repeated year.
 */
export function spanGrain(fromMs: number, toMs: number): DateGrain {
  const span = Math.abs(toMs - fromMs);
  if (span > 3 * 365 * DAY_MS) return "year";
  if (span > 90 * DAY_MS) return "month";
  return "day";
}

/** A span-appropriate axis label for one tick. */
export function formatTick(ms: number, grain: DateGrain, lang?: Lang): string {
  return grain === "year"
    ? formatYear(ms, lang)
    : grain === "month"
      ? formatMonthYear(ms, lang)
      : formatDayMonth(ms, lang);
}

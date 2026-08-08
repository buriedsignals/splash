import { describe, it, expect } from "bun:test";
import * as d from "./date-locale";
import { COVERED_LANGS } from "./language-coverage";

// The one fact this module exists for, stated as a test: a numeric day/month date is
// AMBIGUOUS across the four languages splash finishes deliverables in. "03/04/2024" is the
// 3rd of April to a French, German or Italian reader and the 4th of March to an American
// one, and nothing on the chart tells them which. So the parser REFUSES that shape and every
// formatter writes the month as a NAME.
//
// MUTATION-VERIFIED, one break at a time (each edit confirmed landed with `git diff --stat`
// before the run, `git checkout --` between them):
//   - dropping the `/` refusal in `parseIsoDate` (accepting "03/04/2024" via Date.parse)
//     → "refuses a numeric day/month date, in either order" FAILS.
//   - swapping the fr and de `monthsShort` rows → "writes the month by NAME, per language"
//     FAILS on both rows.
//   - changing de's `dayMonth` join from "3. Apr." to "3 Apr." → "joins day and month the
//     way each language writes it" FAILS.
//   - making `mondayIndex` use getUTCDay() directly (Sunday-first) → "weeks start on
//     Monday" FAILS.
//   - deleting the `it` row from DATE_COPY → "has a row for every covered language" FAILS.
//   - returning `ms` from `parseIsoDate("2024-04")` at local midnight instead of UTC
//     → "parses a year, a year-month and a full day, all at UTC midnight" FAILS.

const APR_3 = Date.UTC(2024, 3, 3);

describe("core/date-locale — the four-language date table", () => {
  it("has a row for every covered language, and no other", () => {
    expect(Object.keys(d.DATE_COPY).sort()).toEqual([...COVERED_LANGS].sort());
  });

  it("gives every row 12 months and 7 weekdays", () => {
    for (const [lang, row] of Object.entries(d.DATE_COPY)) {
      expect([lang, row.monthsShort.length]).toEqual([lang, 12]);
      expect([lang, row.weekdaysShortMonday.length]).toEqual([lang, 7]);
    }
  });

  it("gives no non-English row the English month names verbatim", () => {
    // A row that merely repeats English is the leak wearing the table's clothes — the same
    // rule language-coverage.test.ts applies to SYMBOL_UNIT_WORDS.
    for (const lang of COVERED_LANGS.filter((l) => l !== "en"))
      expect([lang, d.DATE_COPY[lang].monthsShort]).not.toEqual([
        lang,
        d.DATE_COPY.en.monthsShort,
      ]);
  });

  it("writes the month by NAME, per language", () => {
    // Captured from CLDR (probed via Intl.DateTimeFormat, then written down — the module
    // itself is Intl-free so the bytes are identical in Node, Remotion and the browser).
    expect(d.DATE_COPY.en.monthsShort[3]).toBe("Apr");
    expect(d.DATE_COPY.fr.monthsShort[3]).toBe("avr.");
    expect(d.DATE_COPY.de.monthsShort[3]).toBe("Apr.");
    expect(d.DATE_COPY.it.monthsShort[3]).toBe("apr");
    expect(d.DATE_COPY.fr.monthsShort[1]).toBe("févr.");
    expect(d.DATE_COPY.de.monthsShort[2]).toBe("Mär.");
  });

  it("starts every weekday row on MONDAY (ISO 8601 week)", () => {
    expect(d.DATE_COPY.en.weekdaysShortMonday[0]).toBe("Mon");
    expect(d.DATE_COPY.fr.weekdaysShortMonday[0]).toBe("lun.");
    expect(d.DATE_COPY.de.weekdaysShortMonday[0]).toBe("Mo");
    expect(d.DATE_COPY.it.weekdaysShortMonday[0]).toBe("lun");
    expect(d.DATE_COPY.en.weekdaysShortMonday[6]).toBe("Sun");
  });

  it("resolves a regional tag to its base row, and an unknown tag to English", () => {
    expect(d.dateCopy("fr-CH").monthsShort[0]).toBe("janv.");
    expect(d.dateCopy("de_AT").monthsShort[0]).toBe("Jan.");
    expect(d.dateCopy("es").monthsShort[0]).toBe("Jan");
    expect(d.dateCopy(undefined).monthsShort[0]).toBe("Jan");
  });
});

describe("core/date-locale — parsing", () => {
  it("parses a year, a year-month and a full day, all at UTC midnight", () => {
    expect(d.parseIsoDate("2024")).toEqual({
      ms: Date.UTC(2024, 0, 1),
      grain: "year",
    });
    expect(d.parseIsoDate("2024-04")).toEqual({
      ms: Date.UTC(2024, 3, 1),
      grain: "month",
    });
    expect(d.parseIsoDate("2024-04-03")).toEqual({ ms: APR_3, grain: "day" });
    // the slash variants of the SAME big-endian order — unambiguous because the year leads
    expect(d.parseIsoDate("2024/04/03")).toEqual({ ms: APR_3, grain: "day" });
  });

  it("refuses a numeric day/month date, in either order", () => {
    // The whole point. Neither reading can be ruled out from the string, and the two readings
    // are a month apart.
    expect(d.parseIsoDate("03/04/2024")).toBeNull();
    expect(d.parseIsoDate("04/03/2024")).toBeNull();
    expect(d.parseIsoDate("3.4.2024")).toBeNull();
  });

  it("refuses a month NAME, in any language — a chart's data is not prose", () => {
    expect(d.parseIsoDate("Jan")).toBeNull();
    expect(d.parseIsoDate("3 avr. 2024")).toBeNull();
  });

  it("refuses an impossible calendar date rather than rolling it over", () => {
    // Date.UTC(2024, 1, 30) silently becomes 1 March. A CSV that says 30 February is wrong,
    // and a chart that quietly moves the day is worse than one that stops.
    expect(d.parseIsoDate("2024-02-30")).toBeNull();
    expect(d.parseIsoDate("2024-13-01")).toBeNull();
    expect(d.parseIsoDate("2024-00-01")).toBeNull();
  });

  it("names WHOSE date it refused", () => {
    // A refusal that does not say which row is broken sends the journalist hunting.
    expect(() =>
      d.requireIsoDate("03/04/2024", 'the start of "Land acquisition"'),
    ).toThrow(/Land acquisition/);
    expect(() => d.requireIsoDate("03/04/2024", "x")).toThrow(/YYYY-MM-DD/);
  });
});

describe("core/date-locale — formatting", () => {
  it("joins day and month the way each language writes it", () => {
    expect(d.formatDayMonth(APR_3, "en")).toBe("3 Apr");
    expect(d.formatDayMonth(APR_3, "fr")).toBe("3 avr.");
    expect(d.formatDayMonth(APR_3, "de")).toBe("3. Apr.");
    expect(d.formatDayMonth(APR_3, "it")).toBe("3 apr");
  });

  it("writes a full date with the month by name and the year in digits", () => {
    expect(d.formatDayMonthYear(APR_3, "en")).toBe("3 Apr 2024");
    expect(d.formatDayMonthYear(APR_3, "fr")).toBe("3 avr. 2024");
    expect(d.formatDayMonthYear(APR_3, "de")).toBe("3. Apr. 2024");
    expect(d.formatDayMonthYear(APR_3, "it")).toBe("3 apr 2024");
  });

  it("writes a month-year with no day", () => {
    expect(d.formatMonthYear(APR_3, "fr")).toBe("avr. 2024");
    expect(d.formatMonthYear(APR_3, "de")).toBe("Apr. 2024");
  });

  it("writes a bare year identically in every language", () => {
    for (const l of COVERED_LANGS) expect(d.formatYear(APR_3, l)).toBe("2024");
  });

  it("formats at the grain the data was given in, never finer", () => {
    // A CSV that says "2023-05" knows the month, not the day. Printing "1 mai 2023" invents
    // a precision the journalist never supplied.
    const month = d.parseIsoDate("2023-05")!;
    expect(d.formatAtGrain(month, "fr")).toBe("mai 2023");
    const year = d.parseIsoDate("2023")!;
    expect(d.formatAtGrain(year, "fr")).toBe("2023");
    const day = d.parseIsoDate("2023-05-04")!;
    expect(d.formatAtGrain(day, "fr")).toBe("4 mai 2023");
  });

  it("closes a coarse grain at the END of the period it names", () => {
    // "2023-06" as an END means "through June", not "at 1 June". A gantt bar drawn to the
    // first instant of the month it names is a month short, and a span whose start and end
    // name the SAME month is drawn zero-wide — invisible.
    expect(d.endOfGrain(d.parseIsoDate("2023-06")!)).toBe(Date.UTC(2023, 6, 1));
    expect(d.endOfGrain(d.parseIsoDate("2023")!)).toBe(Date.UTC(2024, 0, 1));
    expect(d.endOfGrain(d.parseIsoDate("2023-06-15")!)).toBe(
      Date.UTC(2023, 5, 16),
    );
    // December rolls the year, not the month index.
    expect(d.endOfGrain(d.parseIsoDate("2023-12")!)).toBe(Date.UTC(2024, 0, 1));
  });

  it("weeks start on Monday", () => {
    // 2024-04-03 is a Wednesday → index 2 in a Monday-first week.
    expect(d.mondayIndex(APR_3)).toBe(2);
    expect(d.mondayIndex(Date.UTC(2024, 3, 7))).toBe(6); // a Sunday
    expect(d.mondayIndex(Date.UTC(2024, 3, 1))).toBe(0); // a Monday
  });

  it("picks the axis grain from the span, so a decade is not labelled day by day", () => {
    expect(d.spanGrain(Date.UTC(2020, 0, 1), Date.UTC(2028, 0, 1))).toBe(
      "year",
    );
    expect(d.spanGrain(Date.UTC(2023, 0, 1), Date.UTC(2024, 0, 1))).toBe(
      "month",
    );
    expect(d.spanGrain(Date.UTC(2024, 0, 1), Date.UTC(2024, 1, 1))).toBe("day");
  });
});

/**
 * THE ORDER A REVEAL IS ALLOWED TO FOLLOW, measured rather than reviewed.
 *
 * `staggerLacksAnOrder` (`scripts/detect-reveal-order.mjs`) is the pure decision; this file is the
 * measurement that feeds it, on the two shapes it has to tell apart and on REAL material for both:
 * `proof/co2-suisse/data.csv`, a time series whose marks each hold their own year (a stagger the
 * doctrine earns), and `stories/stress-t-europe-recycling`'s frozen survey, eleven readings from
 * one month (a stagger the doctrine forbids).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { staggerLacksAnOrder } from "../scripts/detect-reveal-order.mjs";
import { CO2_TIMING } from "../assets/timing.ts";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** The windows a linear traversal hands its marks — the same arithmetic `drawnSoFar` walks the
 *  line's own points with, expressed as a start frame per mark so the decision can read it. */
function linearWindows(positions: (number | null)[], event: { start: number; duration: number }) {
  return positions.map((at, i) => ({
    key: String(at ?? i),
    start:
      positions.length <= 1
        ? event.start
        : event.start + Math.round((i / (positions.length - 1)) * event.duration),
    at,
  }));
}

describe("staggerLacksAnOrder", () => {
  it("should accept marks that arrive together, whatever they are", () => {
    const marks = [
      { key: "DEU", start: 108, at: null },
      { key: "FRA", start: 108, at: null },
      { key: "MKD", start: 108, at: null },
    ];
    expect(staggerLacksAnOrder(marks)).toEqual({
      marks: 3,
      starts: 1,
      positions: 0,
      arbitrary: false,
      why: "the marks arrive together, so no order is claimed",
    });
  });

  it("should accept a stagger whose marks ascend along their own axis", () => {
    const found = staggerLacksAnOrder(linearWindows([1990, 1991, 1992, 1993], { start: 72, duration: 78 }));
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      "false: the marks arrive in their own ascending order",
    );
  });

  it("should refuse a stagger whose marks run against their own positions", () => {
    const found = staggerLacksAnOrder(linearWindows([1993, 1992, 1991, 1990], { start: 72, duration: 78 }));
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      "true: the marks arrive against their own positions",
    );
  });

  it("should refuse a stagger over marks that carry no position at all", () => {
    const found = staggerLacksAnOrder(linearWindows([null, null, null], { start: 112, duration: 96 }));
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      "true: 3 of 3 marks carry no position on any axis this reveal could traverse",
    );
  });

  it("should refuse a stagger over marks that all share one position — a snapshot", () => {
    const found = staggerLacksAnOrder(linearWindows([2025, 2025, 2025, 2025], { start: 112, duration: 96 }));
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      "true: 4 marks hold 1 position(s) between them, so the order across them is the producer's and not the data's",
    );
  });

  it("should refuse a stagger where only two of many marks tie", () => {
    const found = staggerLacksAnOrder(linearWindows([1990, 1991, 1991, 1992], { start: 72, duration: 78 }));
    expect(found.arbitrary).toBe(true);
  });

  // ── Real material ───────────────────────────────────────────────────────────────────────────
  //
  // Not a fixture built to pass: the frozen series this skill's own seed renders, read off disk and
  // walked with this format's own timing contract.
  it("should earn its stagger on proof/co2-suisse's own frozen series", () => {
    const csv = readFileSync(join(TWIN, "proof/co2-suisse/data.csv"), "utf8").trim();
    const [header, ...rows] = csv.split("\n");
    const yearAt = header.split(",").indexOf("Year");
    expect(yearAt).toBeGreaterThan(-1);
    const years = rows
      .map((row) => Number(row.split(",")[yearAt]))
      .filter((year) => Number.isFinite(year) && year >= 1950)
      .sort((a, b) => a - b);
    expect(years.length).toBeGreaterThan(50);
    const found = staggerLacksAnOrder(linearWindows(years, CO2_TIMING.reveal));
    expect(`${found.marks} marks, ${found.positions} positions → ${found.why}`).toBe(
      `${years.length} marks, ${years.length} positions → the marks arrive in their own ascending order`,
    );
  });

  it("should refuse the same stagger over stress-t's eleven one-month readings", () => {
    const csv = readFileSync(
      join(TWIN, "stories/stress-t-europe-recycling/beats/europe-recycling-map/recycling.csv"),
      "utf8",
    ).trim();
    const [header, ...rows] = csv.split("\n");
    const columns = header.split(",");
    const dateAt = columns.indexOf("survey_date");
    const countryAt = columns.indexOf("country");
    expect(dateAt).toBeGreaterThan(-1);
    expect(countryAt).toBeGreaterThan(-1);
    // Every reading is March 2025, written three different ways in the frozen source. The period,
    // not the spelling, is the position — so they are read as the one month they all are.
    const marks = rows.map((row, i) => ({
      key: row.split(",")[countryAt],
      start: 112 + i * 8,
      at: "2025-03",
    }));
    const found = staggerLacksAnOrder(marks);
    expect(`${found.arbitrary}: ${found.why}`).toBe(
      `true: ${marks.length} marks hold 1 position(s) between them, so the order across them is the producer's and not the data's`,
    );
  });
});

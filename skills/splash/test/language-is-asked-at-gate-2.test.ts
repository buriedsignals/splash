/**
 * ROUND-FOUR FINDING 9 (Q4): `language` was required by `deliver` and checked by neither Gate 2.
 *
 *     grep -n "language" skills/storyboard/scripts/storyboard.mjs skills/splash/scripts/where.mjs
 *     (nothing)
 *
 * `format-handover.mjs`'s refusal for a missing `language` is well written, and it fires after the
 * storyboard, the palette, the component, the render and the approval are all done — for a field
 * that costs one question at the storyboard. `exchange.md`'s ruling R4 exists because *"a hand-over
 * came out in English on a French story for want of it."* A story could still sail through every
 * gate to the delivery call with nothing recorded: the same situation R4 was written after seeing
 * for real, merely detected later instead of never.
 *
 * REPRODUCED ON REAL MATERIAL — `stories/milan-cortina-la-glace-des-sponsors`, a French story:
 *
 *     language recorded  : null
 *     checkStoryboard    : []          <- gate 2 closed
 *     formatHandover     : throws: a hand-over is written in the story's own language, and none
 *                          was given ...
 *
 * WHAT DID *NOT* CHANGE, and the comment at `format-handover.mjs:30` that says so. That comment
 * ("`language` is deliberately not in this list: it has its own refusal, in
 * `resolveScaffoldLanguage` ... One check, in the place that owns it.") is about which module
 * RESOLVES the value, and it survives this finding intact: `resolveScaffoldLanguage` is still the
 * only place that decides what a recorded tag means, whether we can write in it, and what to say
 * when we cannot. What did not survive is the inference that no earlier gate should therefore ASK.
 * Presence at G2 and resolution at delivery are two different questions about one field, and the
 * defect was answering the first one nowhere.
 *
 * MUTATION-CHECKED: remove `language` from `REQUIRED_SCALARS` in `where.mjs` only ->
 *     (fail) gate 2: ... > should agree on: scalar "language" absent
 *     expect(received).toBe(expected)  Expected: false  Received: true
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REQUIRED_SCALARS as WHERE_SCALARS } from "../scripts/where.mjs";
// Test-only cross-skill imports, for the one purpose `test/` is excluded from
// `no-cross-skill-imports.test.ts` for: proving two independent readings of one rule agree.
import {
  checkStoryboard,
  parseStoryboard,
  REQUIRED_SCALARS as STORYBOARD_SCALARS,
} from "../../storyboard/scripts/storyboard.mjs";
import { formatHandover } from "../../deliver/scripts/format-handover.mjs";

const STORIES = join(import.meta.dirname, "..", "..", "..", "stories");

function gapsFor(storyboard: string): string[] {
  return checkStoryboard(parseStoryboard(storyboard).meta);
}

/** The one storyboard every case below mutates by a single line. */
const STORYBOARD = `---
takeaway: "Rainfall fell by a third in ten years."
subject: "Rainfall trends in the Rhône basin"
comparison: "the last decade against the one before it"
limits: "single weather station, not basin-wide"
placement: "above the fold, article-web"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"
grounding: supported
reference: "The Pudding, redraft — mid-table deviation"
language: "fr"
slots:
  - id: 1
    proves: "Rainfall fell by a third in ten years."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---
`;

describe("the language a delivery is written in is asked at gate 2, not discovered at gate 4", () => {
  it("should be required by both gate-2 readings, which spell the list independently", () => {
    expect(WHERE_SCALARS).toContain("language");
    expect(STORYBOARD_SCALARS).toContain("language");
  });

  it("should hold the gate open when nothing was recorded, and say which decision is missing", () => {
    const gaps = gapsFor(STORYBOARD.replace('language: "fr"\n', ""));

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain("language");
  });

  it("should close on a recorded code", () => {
    expect(gapsFor(STORYBOARD)).toEqual([]);
  });

  it("should refuse the language's NAME, which is the mistake the field invites", () => {
    // `resolveScaffoldLanguage` refuses this too, at the delivery — "STORYBOARD.md records the
    // code, not the language's name". Both readings refuse it, and this one refuses it first.
    const gaps = gapsFor(STORYBOARD.replace('language: "fr"', 'language: "Français"'));

    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain("Français");
  });

  it("should close on a code this toolchain cannot yet WRITE in — that is delivery's decision, not the gate's", () => {
    // The division of labour the `format-handover.mjs:30` comment is really about: the gate asks
    // whether a language was chosen; `resolveScaffoldLanguage` decides what we can do about it,
    // and falls back to English WITH a notice rather than refusing the journalist their own work.
    expect(gapsFor(STORYBOARD.replace('language: "fr"', 'language: "el"'))).toEqual([]);

    const handover = formatHandover({
      files: ["rainfall.png"],
      placement: "above the fold",
      alt: "Rainfall falls across four winters",
      credit: "Data: MeteoSwiss",
      caveat: "one weather station",
      format: "static",
      language: "el",
    });
    expect(handover).toContain("This document is written in English, not in `el`");
  });

  it("should catch the real story the finding was found on", () => {
    // A French story that reached a delivery with no language recorded anywhere. Gate 2 used to
    // close on it — `checkStoryboard` returned `[]` — and `formatHandover` threw at the far end.
    const storyboard = readFileSync(
      join(STORIES, "milan-cortina-la-glace-des-sponsors", "STORYBOARD.md"),
      "utf8",
    );

    expect(storyboard).not.toContain("\nlanguage:");
    expect(gapsFor(storyboard).join("\n")).toContain("language");
  });
});

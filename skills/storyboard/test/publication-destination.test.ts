/**
 * THE ONE FACT A STATIC BEAT NEVER RECORDED — round seven, defect D11.
 *
 * Gate 2b's own label is "Static / print", and that slash is a QUESTION nothing ever asked. A
 * static graphic lands on a screen (an embedded image in the article) or on paper (the printed
 * edition); `palette` needs to know which, because the two are different grounds, and it correctly
 * refuses a `static` format rather than guessing. Nothing in the toolchain asked the question or
 * had anywhere to put the answer — so the answer was guessed, and
 * `stories/stress-ad-polish-hospital-beds` shipped a 2.20:1 accent onto a printed page while its
 * own gate turn recorded *"because the destination is a printed page"*, in prose nothing reads.
 *
 * Three things are pinned here:
 *   1. the field is OPTIONAL and its absence is legal — six `format: static` slots across five
 *      frozen stories were recorded before it existed, and the population is read off the disk
 *      rather than typed, so a seventh landing tomorrow is covered too;
 *   2. the gate ASKS, in its own subject — publication, not colour — and that turn is a function
 *      rather than a paragraph of advice;
 *   3. a value the toolchain cannot publish to, a list, and the field on a format that has no
 *      second destination are each refused BY NAME.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DESTINED_FORMATS,
  PUBLICATION_DESTINATIONS,
  checkStoryboard,
  destinationGap,
  parseStoryboard,
} from "../scripts/storyboard.mjs";
import {
  PUBLICATION_FORMATS,
  formatPublicationDestinationGate,
} from "../scripts/format-gate.mjs";

const STORIES = join(import.meta.dirname, "..", "..", "..", "stories");

// The formats that decide their own destination, and therefore the ones the field is refused on.
// Held as a module constant so the loops below cannot be emptied by the very mutation they exist to
// catch: widening `DESTINED_FORMATS` to every format leaves each `for` body unexecuted, and a test
// that passes vacuously is not a test. The non-vacuity assertion is the first one in the file.
const OTHER_FORMATS = PUBLICATION_FORMATS.filter(
  (format: string) => !DESTINED_FORMATS.includes(format),
);

const SLOT_COMPLETE = `---
takeaway: "Every sampled country increased adoption while the 2025 gap remained wide."
subject: "Ten European countries"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample, not a European census."
placement: "after the third paragraph"
credit: "Source: Splash Test Desk synthetic dataset"
effectiveDate: "2026-07-15"
grounding: supported
reference: "The Pudding, redraft"
language: en
slots:
  - id: 1
    proves: "Every sampled country increased adoption while the 2025 gap remained wide."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---

body
`;

function withSlotLine(line: string | null): string {
  return line === null
    ? SLOT_COMPLETE
    : SLOT_COMPLETE.replace(
        "    format: static",
        `    format: static\n    ${line}`,
      );
}

describe("the destination a static beat is published to", () => {
  it("should hold a format that is asked and formats that are not", () => {
    expect(DESTINED_FORMATS.length).toBeGreaterThan(0);
    expect(OTHER_FORMATS.length).toBeGreaterThan(0);
    for (const format of DESTINED_FORMATS)
      expect(PUBLICATION_FORMATS).toContain(format);
  });

  it("should say nothing about a slot that records the fact either way", () => {
    for (const destination of PUBLICATION_DESTINATIONS) {
      expect(destinationGap("static", destination, "1")).toBe(null);
    }
  });

  // CONSTRAINT ONE, and the reason this is not simply a ninth required field. Absence is an
  // answer — "not recorded" — and it is never a silent default to `screen`, which is the 2.20:1
  // accent written into the record. The refusal happens where the fact is actually needed.
  it("should say nothing about a slot that never recorded it", () => {
    expect(destinationGap("static", undefined, "1")).toBe(null);
    expect(destinationGap("static", null, "1")).toBe(null);
    expect(destinationGap("static", "", "1")).toBe(null);
  });

  it("should refuse a destination this toolchain does not publish to, naming the ones it does", () => {
    const gap = destinationGap("static", "billboard", "1") ?? "";
    expect(gap).toContain('"billboard"');
    for (const destination of PUBLICATION_DESTINATIONS)
      expect(gap).toContain(destination);
  });

  // A screen and a sheet are different grounds, so a beat that lands on both is measured twice —
  // which is two records, not one field holding two answers. `size` takes a list on purpose (one
  // argument, several exported frames); this does not, and saying so is better than handing an
  // array to a reader that will fail further downstream.
  it("should refuse a list where the contract takes one answer", () => {
    expect(destinationGap("static", ["screen", "print"], "1")).toContain(
      "one answer",
    );
    expect(destinationGap("static", [], "1")).toBe(null);
  });

  // The same shape `sizeGap` already holds for a format with no exported frame: a `web`, `video`
  // or `scrolly` beat is read on a display and has no second destination, so the field is refused
  // there rather than tolerated as decoration.
  it("should refuse the field on every format that decides its own destination", () => {
    for (const format of OTHER_FORMATS) {
      expect(destinationGap(format, "screen", "1")).toContain(format);
      expect(destinationGap(format, "print", "1")).toContain(
        "leave the field out",
      );
      expect(destinationGap(format, undefined, "1")).toBe(null);
    }
  });

  it("should be reached by the gate itself, not only by this test", () => {
    expect(checkStoryboard(parseStoryboard(withSlotLine(null)).meta)).toEqual(
      [],
    );
    expect(
      checkStoryboard(parseStoryboard(withSlotLine("destination: print")).meta),
    ).toEqual([]);
    expect(
      checkStoryboard(
        parseStoryboard(withSlotLine("destination: screen")).meta,
      ),
    ).toEqual([]);
    expect(
      checkStoryboard(
        parseStoryboard(withSlotLine("destination: billboard")).meta,
      ).join("\n"),
    ).toContain("billboard");
    expect(
      parseStoryboard(withSlotLine("destination: screen")).meta.slots[0]
        .destination,
    ).toBe("screen");
  });
});

// THE POPULATION IS READ OFF THE DISK, never typed here. Six `format: static` slots across five
// stories carry no destination because the field did not exist when they were frozen; a seventh
// landing tomorrow is covered by the same loop. If this ever fails it means a required-field
// decision was taken somewhere else, and it will fail by naming the story that pays for it.
describe("the frozen stories that never recorded it", () => {
  const staticSlots = readdirSync(STORIES).flatMap((story) => {
    const path = join(STORIES, story, "STORYBOARD.md");
    let text: string;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      return [];
    }
    return parseStoryboard(text)
      .meta.slots.filter((slot: any) => slot.format === "static")
      .map((slot: any) => ({ story, slot }));
  });

  // A slot that DOES record a destination is not a counter-example to this block, it is the point of
  // the field — and asserting that every static slot in the tree records none was true of the frozen
  // corpus for exactly as long as no new story used the gate. The first one that did (round eight)
  // reddened this. So the subject is stated in the population instead of in an assertion over it.
  const withoutOne = staticSlots.filter(({ slot }: any) => slot.destination === undefined);
  const withOne = staticSlots.filter(({ slot }: any) => slot.destination !== undefined);

  it("should have found the six slots this change had to keep working", () => {
    expect(withoutOne.length).toBeGreaterThanOrEqual(6);
  });

  it("should find at least one story that DID record it, or the gate is asking into the void", () => {
    // The other half, and the one worth more: a field the gate asks for and no story ever carries is
    // a question nobody answers. This fails the day the last recorded destination leaves the tree.
    expect(withOne.length).toBeGreaterThanOrEqual(1);
  });

  for (const { story, slot } of withoutOne) {
    it(`should leave ${story} slot ${slot.id} closed on the fact it does not record`, () => {
      expect(destinationGap(slot.format, slot.destination, slot.id)).toBe(null);
    });
  }
});

// THE GATE ASKS, AND THE QUESTION IS ITS OWN SUBJECT. It could not be folded into the G2b turn:
// `publication-format-gate.test.ts` pins that turn byte for byte against a recorded host
// acceptance and asserts it stops before any later movement. This is the movement AFTER it — G2c,
// where a static beat is already being asked what size it exports — and the question there is
// about PUBLICATION, which is half gate 2b's own label, not about colour.
describe("the G2c destination turn", () => {
  const turn = formatPublicationDestinationGate({ format: "static" });

  it("should offer both destinations and name the field that records the answer", () => {
    for (const destination of PUBLICATION_DESTINATIONS) {
      expect(turn).toContain(`destination: ${destination}`);
    }
    expect(turn.endsWith("?")).toBe(true);
  });

  // The constraint that made this interesting. Asking a journalist where their graphic is
  // published is the format gate's own business; talking about ink at gate 2 is movement ⑧
  // leaking into movement ⑦. The turn says nothing about what follows from the answer.
  it("should say nothing about colour", () => {
    expect(turn).not.toMatch(
      /palette|colour|color|\bink\b|accent|contrast|ground/i,
    );
  });

  it("should refuse to ask a format that has no second destination", () => {
    for (const format of OTHER_FORMATS) {
      expect(() => formatPublicationDestinationGate({ format })).toThrow(
        format,
      );
    }
    expect(() =>
      formatPublicationDestinationGate({ format: "billboard" }),
    ).toThrow();
  });
});

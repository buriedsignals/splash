/**
 * THE WORLD REPEATS, AND EVERY COPY OF IT ANSWERS A POINTER.
 *
 * THE RULING, from the owner on 2026-08-23, on the two beats this format laid out contained because
 * one plate cannot cover a box wider than the world:
 *
 *   > that is the normal behaviour of an interactive map — go ahead and repeat the map on the sides.
 *
 * He is right about the medium and the ruling came with its engineering consequence, which is what
 * this file is about. Two days earlier this same format was fixed for painting three worlds at
 * planet extent, and THE DEFECT WAS NEVER THE REPEAT: it was that there was ONE SET OF HIT TARGETS
 * over three painted worlds — three Africas, three Japans, and a reader pointing at the second one
 * got nothing. Nothing measured it, which is why it shipped.
 *
 * So this file measures exactly that, in a real browser, on the two real delivered pages: how many
 * marks answer a pointer ON EACH VISIBLE COPY. And it asserts the other half of the ruling too —
 * that the keyboard and the accessible table did NOT multiply with the copies.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  idsForWorldCopies,
  overlayCopyOf,
  pointerActiveOverlayClasses,
  repeatWorlds,
  useCopyOf,
} from "../scripts/render-web.mjs";
import {
  everyPaintedWorldAnswersAPointer,
  readWrap,
  resolveChrome,
} from "../scripts/verify-wraps-the-world.mjs";
import { worldCopiesFor } from "../scripts/delivery-frame.mjs";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/** The two pages the ruling is about, and the only two in the format whose camera is the world. */
const WRAPPING = [
  {
    rel: "proof/mapgen-hexgrid-web/hex-grid.html",
    frame: { width: 836, height: 476 },
    boxAspects: [0.744, 2.185] as [number, number],
    marks: 153,
  },
  {
    rel: "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/renders/life-expectancy-2023.html",
    frame: { width: 1200, height: 815 },
    boxAspects: [1.317, 2.572] as [number, number],
    marks: 241,
  },
];

/** The owner's own screen, and the width this format already drives everywhere else. */
const WIDTHS = [
  { width: 1600, height: 900 },
  { width: 2990, height: 1718 },
];

describe("repeatWorlds — the marks wrap with the map", () => {
  const CSS = `.mw-overlay .pt { pointer-events: auto; }`;
  const PAGE =
    `<div class="mw-viewport">` +
    `<div id="mw-fallback" class="mw-fallback">` +
    `<svg class="map" viewBox="0 0 100 50"><g clip-path="url(#c)">` +
    `<image href="data:image/png;base64,AAAA" x="0" y="0" width="100" height="50"/>` +
    `<path class="region" d="M1 1L2 1L2 2Z" fill="#123456" data-key="AAA"><title>A : 1</title></path>` +
    `<path class="region" d="M5 5L6 5L6 6Z" fill="#654321" data-key="BBB"><title>B : 2</title></path>` +
    `</g></svg></div>` +
    `<div class="mw-overlay">` +
    `<button type="button" class="pt" style="left:10%" aria-label="A : 1" title="A : 1" data-key="AAA" data-detail="A : 1"></button>` +
    `<button type="button" class="pt" style="left:50%" aria-label="B : 2" title="B : 2" data-key="BBB" data-detail="B : 2"></button>` +
    `</div></div>`;

  it("leaves a page that does not wrap byte-for-byte alone", () => {
    expect(repeatWorlds(PAGE, 1, CSS)).toBe(PAGE);
  });

  it("paints one primary world and the rest as repeats", () => {
    const wrapped = repeatWorlds(PAGE, 3, CSS);
    expect((wrapped.match(/data-world="primary"/g) ?? []).length).toBe(2);
    expect((wrapped.match(/data-world="repeat"/g) ?? []).length).toBe(4);
    // Two layers per world — the plate and the overlay — so three worlds is six `.mw-world` boxes.
    expect((wrapped.match(/class="mw-world"/g) ?? []).length).toBe(6);
    // The middle copy is the ORIGINAL, untouched: that is what keeps the wrap invisible to every
    // other reading in this format. The plate's own bytes and the marks' own `data-detail` are both
    // in a primary world and in no other.
    const primaries = [...wrapped.matchAll(/data-world="primary">([\s\S]*?)<\/div><div class="mw-world"/g)].map(
      (one) => one[1],
    );
    expect(primaries.length).toBe(2);
    expect(primaries.some((one) => one.includes('data-detail="A : 1"'))).toBe(true);
    expect(primaries.some((one) => one.includes("data:image/png;base64,AAAA"))).toBe(true);
  });

  it("keeps the CENSUSES counting one world: only the primary carries data-detail", () => {
    const wrapped = repeatWorlds(PAGE, 3, CSS);
    // `tableCarriesTheMarks` and `keyboardReachesEveryMark` both count marks BY `data-detail`. A copy
    // is the same mark seen twice, not a second mark, so a wrapped page must still announce two.
    expect((wrapped.match(/data-detail="/g) ?? []).length).toBe(2);
    // …and the native, script-free tooltip DOES travel, because a copy a reader can point at and
    // learn nothing from is the defect wearing a cheaper coat.
    expect((wrapped.match(/title="A : 1"/g) ?? []).length).toBe(3);
    expect((wrapped.match(/<title>A : 1<\/title>/g) ?? []).length).toBe(3);
    // The keyboard does not multiply: every repeat's button is out of the Tab order.
    expect((wrapped.match(/tabindex="-1"/g) ?? []).length).toBe(4);
    expect((wrapped.match(/aria-hidden="true"/g) ?? []).length).toBe(4);
    expect((wrapped.match(/aria-label=/g) ?? []).length).toBe(2);
  });

  it("gives every copy its own hit target, keyed", () => {
    const wrapped = repeatWorlds(PAGE, 3, CSS);
    expect((wrapped.match(/data-key="AAA"/g) ?? []).length).toBe(6);
    // Four of those six are `<use>`: the copies repaint the primary's own geometry rather than
    // duplicating it, which is what keeps the page under its weight ceiling.
    expect((wrapped.match(/<use /g) ?? []).length).toBe(6);
  });

  it("refuses a page it cannot repeat rather than painting an empty world", () => {
    expect(() =>
      repeatWorlds(`<div class="mw-overlay"></div>`, 3, CSS),
    ).toThrow(/mw-fallback/);
  });
});

describe("useCopyOf and idsForWorldCopies — a copy repaints, it does not duplicate", () => {
  it("gives every drawable an id and references it once per copy", () => {
    const svg =
      `<svg class="map" viewBox="0 0 10 10"><image href="data:x"/>` +
      `<path class="region" d="M0 0L1 1Z" data-key="AAA"><title>A</title></path></svg>`;
    const withIds = idsForWorldCopies(svg);
    expect(withIds).toContain('<image id="w0"');
    expect(withIds).toContain('<path id="w1"');
    const copy = useCopyOf(withIds);
    expect(copy).toContain('<use href="#w0"/>');
    expect(copy).toContain(
      '<use href="#w1" class="region" data-key="AAA"><title>A</title></use>',
    );
    expect(copy).toContain('viewBox="0 0 10 10"');
    // The baked plate's own bytes are downloaded once, never three times.
    expect(copy).not.toContain("data:x");
  });

  it("refuses a copy of an svg nothing identified", () => {
    expect(() =>
      useCopyOf(`<svg class="map" viewBox="0 0 10 10"></svg>`),
    ).toThrow(/carries an id/);
  });
});

describe("pointerActiveOverlayClasses — what a copy keeps is read off the stylesheet", () => {
  it("keeps only what the browser will let a pointer reach", () => {
    // A choropleth points at the painted country and keeps buttons only for the regions too small to
    // land on. Carrying every button on every copy would be honest and, on the 241-region world
    // beat, would add 72 208 bytes per copy to a page already near its ceiling.
    const css = `.mw-overlay .pt { pointer-events: none; }\n.mw-overlay .pt-small { pointer-events: auto; }`;
    expect([...pointerActiveOverlayClasses(css)]).toEqual(["pt-small"]);
    expect([
      ...pointerActiveOverlayClasses(
        `.mw-overlay .pt { pointer-events: auto; }`,
      ),
    ]).toEqual(["pt"]);
    // Live, the canvas hit-tests the painted copies itself and the DOM copies are hidden, so a rule
    // qualified by `html.mw-live` says nothing about what a copy has to carry.
    expect([
      ...pointerActiveOverlayClasses(
        `html.mw-live .mw-overlay .pt { pointer-events: auto; }`,
      ),
    ]).toEqual([]);
  });

  it("refuses to build a copy nothing on it could answer", () => {
    expect(() =>
      overlayCopyOf(`<button class="pt" data-key="A"></button>`, new Set()),
    ).toThrow(/no pointer target at all/);
  });
});

describe("everyPaintedWorldAnswersAPointer — the decision, both directions", () => {
  const world = (
    index: number,
    role: string,
    onScreen: string[],
    answered: string[],
  ) => ({
    index,
    role,
    visiblePx: 100,
    onScreen,
    answered,
  });

  it("passes when a copy answers for everything the primary answers for", () => {
    const found = everyPaintedWorldAnswersAPointer([
      world(0, "repeat", ["A", "B"], ["A", "B"]),
      world(1, "primary", ["A", "B", "C"], ["A", "B"]),
      world(2, "repeat", ["B"], ["B"]),
    ]);
    expect(found.short).toEqual([]);
    expect(found.copies).toBe(3);
    // `C` answers for nobody, on any copy: a sub-pixel mark or one a neighbour's target covers, both
    // already named by their own guards. The wrap is not asked to fix them.
    expect(found.perCopy[1].answered).toBe(2);
  });

  it("goes red on the defect it exists for: a painted world with no hit targets", () => {
    // The shape that shipped — three painted worlds, one set of hit targets.
    const found = everyPaintedWorldAnswersAPointer([
      world(0, "repeat", ["A", "B"], []),
      world(1, "primary", ["A", "B"], ["A", "B"]),
      world(2, "repeat", ["A", "B"], []),
    ]);
    expect(found.short.map((one) => one.copy)).toEqual([0, 2]);
    expect(found.short[0].missing).toEqual(["A", "B"]);
  });

  it("refuses a reading with no primary rather than answering about it", () => {
    expect(() =>
      everyPaintedWorldAnswersAPointer([world(0, "repeat", ["A"], ["A"])]),
    ).toThrow(/no primary world/);
  });
});

describe("the two delivered pages that wrap, driven in a real browser", () => {
  it("fills its container and every visible copy answers for every mark the primary does", async () => {
    const browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      const said: string[] = [];
      for (const beat of WRAPPING) {
        const abs = join(TWIN, beat.rel);
        expect(`${beat.rel} exists: ${existsSync(abs)}`).toBe(
          `${beat.rel} exists: true`,
        );
        for (const viewport of WIDTHS) {
          const reading = await readWrap(page, abs, viewport);
          // The wrap's own reason for existing: the box IS the container, on both axes.
          expect(reading.box.width).toBeCloseTo(reading.container.width, 1);
          expect(reading.box.height).toBeCloseTo(reading.container.height, 1);
          // The copy count is the one the bake's own arithmetic asks for, not a number the page chose.
          const worlds = reading.worlds;
          expect(worlds.length).toBe(
            worldCopiesFor(beat.frame, beat.boxAspects),
          );
          const found = everyPaintedWorldAnswersAPointer(worlds);
          // THE NUMBER THE RULING IS ABOUT.
          for (const copy of found.perCopy)
            said.push(
              `${beat.rel} @ ${viewport.width}x${viewport.height} copy ${copy.index} (${copy.role}): ` +
                `${copy.answered} of ${copy.owed}`,
            );
          expect(
            found.short.length === 0
              ? "every visible copy answers"
              : found.short
                  .map(
                    (one) =>
                      `copy ${one.copy} missing ${one.missing.join(",")}`,
                  )
                  .join("; "),
          ).toBe("every visible copy answers");
          // A repeat that is on screen must actually carry marks — an empty set would satisfy the
          // rule above in silence.
          for (const copy of found.perCopy)
            if ((copy.visiblePx ?? 0) > 0)
              expect(`${copy.index}: ${copy.owed} marks`).not.toBe(
                `${copy.index}: 0 marks`,
              );
          // AND THE KEYBOARD DID NOT MULTIPLY. One Tab stop per mark, one row per mark, whatever the
          // copies do — a Tab order three times too long is a worse reader experience than a narrow
          // map, and this is the assertion that says the trade was made deliberately.
          expect(reading.focusables).toBe(beat.marks);
          expect(reading.keyboardStops).toBe(beat.marks);
          expect(reading.tableRows).toBe(beat.marks);
        }
      }
      console.log(said.join("\n"));
    } finally {
      await browser.close();
    }
  }, 600000);

  it("carries the script-free tooltip onto every copy, which is what a reader with no JavaScript gets", () => {
    // `elementFromPoint` needs a script, so the no-JS pointer path cannot be driven by a script. What
    // CAN be asserted is what the delivered markup carries: every copy's marks are SSR'd, and each one
    // keeps the `title` the browser shows on hover with no script at all.
    for (const beat of WRAPPING) {
      const html = readFileSync(join(TWIN, beat.rel), "utf8");
      const primary = (html.match(/data-detail="/g) ?? []).length;
      expect(`${beat.rel}: ${primary} announced marks`).toBe(
        `${beat.rel}: ${beat.marks} announced marks`,
      );
      const titles = (html.match(/<title>|\stitle="/g) ?? []).length;
      // Three worlds of marks, each with its own tooltip: strictly more than one world's worth.
      expect(titles).toBeGreaterThan(beat.marks * 2);
    }
  });
});

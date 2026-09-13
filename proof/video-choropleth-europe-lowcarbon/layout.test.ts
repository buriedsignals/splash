import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  measureText,
  measureTextBand,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor } from "#shared/chart-video/sizes.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import {
  CAMERA_ASPECT,
  copyOf,
  loadSubject,
} from "../static-choropleth-europe-lowcarbon/beat.mjs";
import {
  MAP_ASPECT_BAND,
  caseCopy,
  videoCopyOf,
  videoLayoutFor,
} from "./layout.mjs";

const HERE = import.meta.dirname;
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const BLOCK_IDS = [
  "eyebrow",
  "title",
  "keyLabel",
  "key",
  "reference",
  "conclusion",
  "source",
];
/** Chrome's first baseline sits 0.5–1 px off the naive formula (adaptive-leading spec §5.4). */
const SAFETY = 2;

const subject = loadSubject({
  dir: join(HERE, "..", "static-choropleth-europe-lowcarbon"),
});
const { textPerRegister } = copyOf(subject);
const rawCopy = videoCopyOf(subject);

const face = (r: any) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});
/** Spec §4.1, measured here independently of the layout's own helper. */
const measured = (text: string, r: any) =>
  measureText(text, face(r)) +
  r.letterSpacing * Math.max(0, [...text].length - 1);
const bandOfRegister = (r: any) => measureTextBand("ÉÀÇHxpgjq1,’", face(r));

type Rect = { x: number; y: number; width: number; height: number };
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

function inkRectsOf(block: any, registers: any): Rect[] {
  const r = registers[block.register];
  const band = bandOfRegister(r);
  const rects: Rect[] = block.lines.map((l: any) => ({
    x: l.x,
    y: l.y - band.ascent,
    width: l.width,
    height: band.ascent + band.descent,
  }));
  for (const s of [
    ...(block.swatches ?? []),
    ...(block.missingSwatch ? [block.missingSwatch] : []),
  ])
    rects.push(s);
  return rects;
}

function videoRegistersFor(file: string) {
  const direction = resolveDirectionFamilies(
    readDirection(join(DIRECTIONS, file)),
    textPerRegister,
  );
  const resolved = Object.fromEntries(
    REGISTER_NAMES.map((n) => [n, registerOf(direction, n)]),
  );
  return videoRegistersOf(resolved, "landscape");
}

const files = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"));

describe("the choropleth video's copy", () => {
  it("should carry the BRIEF's conclusion sentence, derived from the subject", () => {
    expect(rawCopy.conclusion).toBe(
      "Sept pays dépassent 94 %. Les 3 voisins mesurés de l’Albanie sont tous sous 60 %.",
    );
  });

  it("should offer the still's second and third title forms, in that order", () => {
    expect(rawCopy.title).toEqual([
      "Le bas-carbone européen est au nord-ouest — et en Albanie",
      "Le bas-carbone européen, et son exception",
    ]);
  });
});

it("should find the three filed directions", () => {
  expect(files.length).toBe(3);
});

describe.each(files)("the video frame laid out for %s", (file) => {
  const registers = videoRegistersFor(file);
  const copy = caseCopy(rawCopy, registers);
  const layout = videoLayoutFor({
    registers,
    copy,
    aspect: CAMERA_ASPECT,
    size: "landscape",
  });
  const drawnRegisters = layout.registers;
  const inset = frameInsetFor("landscape");
  const allLines = layout.blocks.flatMap((b: any) =>
    b.lines.map((l: any) => ({ block: b, line: l })),
  );

  it("should lay out a 1920x1080 frame inside the landscape inset", () => {
    expect([layout.frame.width, layout.frame.height, layout.inset]).toEqual([
      1920,
      1080,
      inset,
    ]);
  });

  it("should hold every block the six events show, the late ones reserved from the start", () => {
    expect(layout.blocks.map((b: any) => b.id)).toEqual(BLOCK_IDS);
  });

  it("should reserve the conclusion slot with the whole sentence in it", () => {
    const conclusion = layout.blocks.find((b: any) => b.id === "conclusion");
    expect(conclusion.lines.map((l: any) => l.text).join(" ")).toBe(
      copy.conclusion,
    );
  });

  it("should record the title form it chose, and draw exactly that form", () => {
    const title = layout.blocks.find((b: any) => b.id === "title");
    expect(title.lines.map((l: any) => l.text).join(" ")).toBe(
      copy.title[layout.title.form],
    );
  });

  it("should set every other block's copy in full", () => {
    const text = (id: string) =>
      layout.blocks
        .find((b: any) => b.id === id)
        .lines.map((l: any) => l.text)
        .join(" ");
    expect([
      text("eyebrow"),
      text("keyLabel"),
      text("key"),
      text("reference"),
      text("source"),
    ]).toEqual([
      copy.eyebrow,
      copy.keyLabel,
      [...copy.breaks, copy.missingLabel].join(" "),
      copy.reference,
      copy.source,
    ]);
  });

  it("should record each line's width as the still measures it", () => {
    const off = allLines.map(({ block, line }: any) =>
      Math.abs(
        measured(line.text, drawnRegisters[block.register]) - line.width,
      ),
    );
    expect(Math.max(...off)).toBeLessThan(1e-6);
  });

  it("should keep every line's measured width within its block's width", () => {
    const over = allLines.filter(
      ({ block, line }: any) =>
        line.x < block.box.x - 1e-6 ||
        line.x + line.width > block.box.x + block.box.width + 1e-6,
    );
    expect(over.map(({ line }: any) => line.text)).toEqual([]);
  });

  it("should keep every line inside the frame's inset, with room for Chrome's baseline", () => {
    const outside = allLines.filter(({ block, line }: any) => {
      const band = bandOfRegister(drawnRegisters[block.register]);
      return (
        line.y + band.descent > layout.frame.height - inset - SAFETY ||
        line.y - band.ascent < inset + SAFETY ||
        line.x < inset ||
        line.x + line.width > layout.frame.width - inset
      );
    });
    expect(outside.map(({ line }: any) => line.text)).toEqual([]);
  });

  it("should advance a block's baselines by its register's lead", () => {
    for (const id of ["title", "conclusion", "source", "keyLabel"]) {
      const block = layout.blocks.find((b: any) => b.id === id);
      const lead = drawnRegisters[block.register].lead;
      block.lines.slice(1).forEach((l: any, i: number) => {
        expect(l.y - block.lines[i].y).toBeCloseTo(lead, 6);
      });
    }
  });

  it("should set no text under the 30px landscape floor", () => {
    const sizes = Object.values(drawnRegisters).map((r: any) => r.fontSize);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(30);
  });

  it("should keep the display larger than every other register it draws", () => {
    const { display, ...others } = drawnRegisters;
    const largestOther = Math.max(...Object.values(others).map((r: any) => r.fontSize));
    expect(display.fontSize).toBeGreaterThan(largestOther);
  });

  it("should let no text block overlap another", () => {
    const rects = layout.blocks.map((b: any) => ({
      id: b.id,
      rects: inkRectsOf(b, drawnRegisters),
    }));
    const clashes: string[] = [];
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        if (
          rects[i].rects.some((a: Rect) =>
            rects[j].rects.some((b: Rect) => intersects(a, b)),
          )
        )
          clashes.push(`${rects[i].id} x ${rects[j].id}`);
    expect(clashes).toEqual([]);
  });

  it("should keep the map rectangle clear of every text block", () => {
    const clash = layout.blocks.filter(
      (b: any) =>
        intersects(layout.mapBox, b.box) ||
        inkRectsOf(b, drawnRegisters).some((r) => intersects(layout.mapBox, r)),
    );
    expect(clash.map((b: any) => b.id)).toEqual([]);
  });

  it("should keep the map rectangle inside the inset", () => {
    const m = layout.mapBox;
    expect(
      m.x >= inset &&
        m.y >= inset &&
        m.x + m.width <= layout.frame.width - inset &&
        m.y + m.height <= layout.frame.height - inset,
    ).toBe(true);
  });

  it("should draw the map box at its rounded size", () => {
    expect([layout.mapBox.width, layout.mapBox.height]).toEqual([
      layout.drawn.width,
      layout.drawn.height,
    ]);
    expect(
      Number.isInteger(layout.drawn.width) &&
        Number.isInteger(layout.drawn.height),
    ).toBe(true);
  });

  it("should keep the drawn size within 1 % of the map aspect it recorded", () => {
    expect(
      Math.abs(layout.drawn.width / layout.drawn.height / layout.mapAspect - 1),
    ).toBeLessThan(0.01);
  });

  it("should keep the map aspect within 0.8–1.6 of the still's camera", () => {
    const [lo, hi] = MAP_ASPECT_BAND;
    expect(layout.mapAspect).toBeGreaterThanOrEqual(lo * CAMERA_ASPECT);
    expect(layout.mapAspect).toBeLessThanOrEqual(hi * CAMERA_ASPECT);
  });

  it("should step down to the next title form when the first cannot fit", () => {
    const overlong = {
      ...copy,
      title: [
        Array.from({ length: 12 }, () => copy.title[0]).join(" "),
        copy.title[1],
      ],
    };
    const stepped = videoLayoutFor({
      registers,
      copy: overlong,
      aspect: CAMERA_ASPECT,
      size: "landscape",
    });
    expect(stepped.title.form).toBe(1);
  });
});

describe("the display's size step, against a register close under it", () => {
  const registers = videoRegistersFor("creme.md");
  const copy = caseCopy(rawCopy, registers);
  /** creme steps its display 90 -> 81 px to keep the fuller title; a value register at 83.33 px,
   *  display / 1.08, sits inside that step. */
  const close = {
    ...registers,
    value: { ...registers.value, fontSize: Math.round((registers.display.fontSize / 1.08) * 100) / 100 },
  };

  it("should never step the display down to or under the value register", () => {
    const layout = videoLayoutFor({ registers: close, copy, aspect: CAMERA_ASPECT, size: "landscape" });
    expect(layout.registers.display.fontSize).toBeGreaterThan(close.value.fontSize);
  });

  it("should refuse a display that is not the largest register to begin with, naming the sizes", () => {
    const inverted = { ...registers, value: { ...registers.value, fontSize: registers.display.fontSize } };
    expect(() =>
      videoLayoutFor({ registers: inverted, copy, aspect: CAMERA_ASPECT, size: "landscape" }),
    ).toThrow(/not larger than the value register at 90px .*display 90px/);
  });
});

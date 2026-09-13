import { describe, expect, it } from "bun:test";
import { uncoveredText, type EmbeddedFace } from "../assets/face-coverage";

/**
 * The browser-side half of "a video frame is set in the face it names, or it is not rendered".
 * A frame drawn with a glyph from a fallback face exports without a word, so the composition reads
 * back what it actually drew — each run's text, the family and the weight Chrome resolved for it —
 * and holds it against what the render embedded. These tests pin that comparison.
 */

const openSans = (
  weight: number,
  unicodeRange: string,
  weightTo = weight,
): EmbeddedFace => ({
  family: "Open Sans",
  style: "normal",
  weight,
  weightTo,
  unicodeRange,
  base64: "",
});

describe("uncoveredText", () => {
  it("should report a character that no embedded face's range covers", () => {
    const faces = [openSans(400, "U+43, U+4F")];
    const runs = [{ text: "CO₂", family: "Open Sans", weight: 400 }];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x2082, family: "Open Sans", weight: 400 },
    ]);
  });

  it("should report every character of a run set at a weight no face was embedded for", () => {
    const faces = [openSans(400, "U+61-62")];
    const runs = [{ text: "ab", family: "Open Sans", weight: 600 }];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x61, family: "Open Sans", weight: 600 },
      { codePoint: 0x62, family: "Open Sans", weight: 600 },
    ]);
  });

  it("should report a run set in a family other than the embedded one", () => {
    const faces = [openSans(400, "U+61")];
    const runs = [{ text: "a", family: "Helvetica", weight: 400 }];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x61, family: "Helvetica", weight: 400 },
    ]);
  });

  it("should accept a weight inside a face's weight range", () => {
    const faces = [openSans(400, "U+61", 700)];
    const runs = [{ text: "a", family: "Open Sans", weight: 600 }];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });

  it("should not demand a glyph for the inkless spaces French number formatting inserts", () => {
    const faces = [openSans(400, "U+30-39, U+2C")];
    const runs = [
      {
        // U+202F between the thousands, as Intl.NumberFormat("fr-FR") emits, then U+00A0.
        text: "12\u202F345,6\u00A0",
        family: "Open Sans",
        weight: 400,
      },
    ];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });

  it("should report each missing character once however often it is drawn", () => {
    const faces = [openSans(400, "U+61")];
    const runs = [
      { text: "₂a₂", family: "Open Sans", weight: 400 },
      { text: "₂", family: "Open Sans", weight: 400 },
    ];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x2082, family: "Open Sans", weight: 400 },
    ]);
  });

  it("should read a wildcard range the way a stylesheet does", () => {
    const faces = [openSans(400, "U+04??")];
    const runs = [{ text: "Ж", family: "Open Sans", weight: 400 }];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });
});

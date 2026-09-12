/**
 * A FRAME IS BALANCED AROUND WHAT IT FRAMES.
 *
 * The `paired` beat rings the row the headline names rather than recolouring it — Information is
 * Beautiful and Reuters both do, and the treatment says why: emphasis should cost no encoding
 * channel. So the frame is a real mark, and a frame that is off-centre is a defect a reader sees
 * before they read anything else.
 *
 * THE DEFECT THIS EXISTS FOR, found by Rémy's eye TWICE in one pass, each time for a different
 * reason, neither of which any other guard could see.
 *
 * The first: the frame ran the plate's own text column, which is right — the eyebrow, the title, the
 * standfirst and the source all start on that vertical — but nothing had been reserved inside it.
 * The widest name landed 2px in and the widest gain 6px in, so in one direction the value sat on the
 * stroke.
 *
 * The second, after the breath was reserved: 10px on the right and 59px on the left. The names were
 * right-anchored, so each row's name BEGAN somewhere different, and the reservation had been made
 * against the widest name in the column — which is not the name on the framed row. Left-anchored,
 * every row starts on one vertical and the inset is the same on both sides.
 *
 * And under that, a third: the subject's row is set in 700 while its register is 600, and the
 * columns had been measured at the register's weight. Bold is 2.1px wider, so the one row the frame
 * is drawn around was the one row that did not fit its own column.
 *
 * All three are invisible to the overlap guard (nothing overlapped), to the frame guard (nothing
 * left the plate) and to the contrast guard (everything was legible). They are visible to this one,
 * which measures the ink inside the frame against the frame, on the delivered plate.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { inkBoxes } from "../../../scripts/design-base/text-boxes.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
/** A frame is a rect that draws no fill and does draw a stroke. */
const FRAME = /<rect\b[^>]*\bfill="none"[^>]*>/g;
const attr = (tag: string, name: string) => {
  const hit = new RegExp(`\\b${name}="([^"]+)"`).exec(tag);
  return hit ? Number(hit[1]) : NaN;
};
/** A run counts as framed when its ink sits wholly inside the frame — a label the frame is drawn
 *  around, not a mark the frame happens to cross. */
const inside = (box: any, f: any) =>
  box.y >= f.y - 1 &&
  box.y + box.height <= f.y + f.height + 1 &&
  box.x >= f.x &&
  box.x + box.width <= f.x + f.width;

/** Deterministic measurement on both sides, so the tolerance is a rounding allowance, not slack. */
const TOLERANCE = 1.5;

const plates = readdirSync(PROOF).flatMap((beat) => {
  const dir = join(PROOF, beat, "renders");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => ({ beat, file: f, path: join(dir, f) }));
});

describe("a frame on a delivered plate", () => {
  it("should have plates that draw one", () => {
    const drawn = plates.filter((p) => FRAME.test(readFileSync(p.path, "utf8")));
    expect(drawn.length).toBeGreaterThan(0);
  });

  for (const { beat, file, path } of plates) {
    const svg = readFileSync(path, "utf8");
    const frames = [...svg.matchAll(FRAME)].map((m) => ({
      x: attr(m[0], "x"),
      y: attr(m[0], "y"),
      width: attr(m[0], "width"),
      height: attr(m[0], "height"),
    }));
    if (!frames.length) continue;
    const boxes = inkBoxes(svg);

    it(`should be balanced around what it frames — ${beat}/${file}`, () => {
      for (const f of frames) {
        const framed = boxes.filter((b: any) => inside(b.box, f));
        if (!framed.length) continue;
        const left = Math.min(...framed.map((b: any) => b.box.x)) - f.x;
        const right = f.x + f.width - Math.max(...framed.map((b: any) => b.box.x + b.box.width));
        expect(
          Math.abs(left - right),
          `${beat}/renders/${file}: the frame at x=${f.x.toFixed(0)} leaves ${left.toFixed(1)}px ` +
            `before "${framed[0].text}" and ${right.toFixed(1)}px after ` +
            `"${framed[framed.length - 1].text}". Reserve the inset in the COLUMNS, at the weight ` +
            `each row is drawn at, so the framed row fits its own frame.`,
        ).toBeLessThanOrEqual(TOLERANCE);
      }
    });
  }
});

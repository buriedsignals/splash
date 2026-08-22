/**
 * THE WHOLE PATH, END TO END — the gate asks, the slot records, the proposal measures.
 *
 * Round seven, defect D11. Each half of this was right on its own and the beat still shipped
 * wrong: `proposePalette` correctly refused a `static` format rather than guessing a surface, and
 * gate 2b correctly recorded `static` — but nothing asked WHERE a static beat is published or had
 * anywhere to put the answer, so the answer was guessed. `stress-ad-polish-hospital-beds` put a
 * 2.20:1 accent on a printed page while its own gate turn recorded *"because the destination is a
 * printed page"*, in prose nothing reads.
 *
 * So this test does not check a function. It walks the record: the turn a journalist is shown, the
 * field their answer is written into by the real writer, the parse that reads it back, and the
 * ground that comes out — twice, once each way, on the same beat. If any link stops carrying the
 * fact, the two grounds stop differing and this goes red.
 *
 * A test-only cross-skill import, permitted for exactly this (`splash/test/no-cross-skill-imports.test.ts`):
 * runtime code never imports across a skill boundary, and the seam between two skills is the thing
 * being asserted here.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkStoryboard,
  mutateStoryboard,
  parseStoryboard,
} from "../../storyboard/scripts/storyboard.mjs";
import { formatPublicationDestinationGate } from "../../storyboard/scripts/format-gate.mjs";
import { proposePalette } from "../scripts/palette.mjs";

const HOUSE = {
  name: "Buried Signals",
  brandColor: "#D4A853",
  accents: "#5B8A8A",
  ground: "#16191B",
};

const STORYBOARD = `---
takeaway: "Beds per thousand fell in every voivodeship."
subject: "Hospital beds in Poland"
comparison: "2015 against 2024"
limits: "Public hospitals only."
placement: "after the fourth paragraph"
credit: "Source: Statistics Poland"
effectiveDate: "2026-08-01"
grounding: supported
reference: "Reuters Graphics, redraft"
language: pl
slots:
  - id: 1
    proves: "Beds per thousand fell in every voivodeship."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---

The beat that paid for the guess.
`;

let storyboardPath: string;
let storyDir: string;

beforeEach(async () => {
  storyDir = await mkdtemp(join(tmpdir(), "static-destination-"));
  storyboardPath = join(storyDir, "STORYBOARD.md");
  await writeFile(storyboardPath, STORYBOARD);
});

afterEach(async () => {
  await rm(storyDir, { recursive: true, force: true });
});

/** The slot as the phase after the storyboard actually meets it: read off the file, never built
 *  here. Handing `proposePalette` a hand-written object would prove the function works and leave
 *  the record — the part that was missing — untested. */
async function slotOnDisk() {
  return parseStoryboard(await readFile(storyboardPath, "utf8")).meta.slots[0];
}

describe("a static beat, from the gate's question to the ground it is measured on", () => {
  it("should refuse the beat while nothing has recorded where it lands, and name what would settle it", async () => {
    const slot = await slotOnDisk();
    expect(slot.format).toBe("static");
    expect(slot.destination).toBeUndefined();
    // The storyboard is NOT refused for it — the field is optional and six frozen stories rely on
    // that. The refusal lands where the fact is actually needed.
    expect(checkStoryboard(parseStoryboard(STORYBOARD).meta)).toEqual([]);

    const measure = () =>
      proposePalette({
        newsroom: HOUSE,
        subject: "hospital beds",
        surface: slot.format,
        destination: slot.destination ?? null,
      });
    expect(measure).toThrow(/destination/);
    expect(measure).toThrow(/gate 2c/);
    // And the question that would settle it, quoted from the turn a journalist is actually shown,
    // rather than a paraphrase this file invented.
    const turn = formatPublicationDestinationGate({ format: "static" });
    expect(turn.split("\n")[0]).toBe("Where does this static graphic land?");
    expect(measure).toThrow(turn.split("\n")[0]);
  });

  for (const [destination, ground, origin] of [
    ["print", "#FFFFFF", "sheet"],
    ["screen", "#16191B", "newsroom"],
  ] as const) {
    it(`should measure the same beat on ${ground} once the slot records destination: ${destination}`, async () => {
      // Written by the REAL writer, into the real file, in the shape the gate's own turn asks for.
      expect(formatPublicationDestinationGate({ format: "static" })).toContain(
        `destination: ${destination}`,
      );
      await mutateStoryboard(storyboardPath, {
        slot: { id: 1, fields: { destination } },
      });
      expect(await readFile(storyboardPath, "utf8")).toContain(
        `destination: ${destination}`,
      );

      const slot = await slotOnDisk();
      expect(slot.destination).toBe(destination);
      expect(
        checkStoryboard(
          parseStoryboard(await readFile(storyboardPath, "utf8")).meta,
        ),
      ).toEqual([]);

      const proposal = proposePalette({
        newsroom: HOUSE,
        subject: "hospital beds",
        surface: slot.format,
        destination: slot.destination,
      });
      expect(proposal.surface).toBe(destination);
      expect(proposal.ground).toBe(ground);
      expect(proposal.groundOrigin).toBe(origin);
      // The format the journalist chose is still the word the proposal reports back to them.
      expect(proposal.surfaceStatedAs).toBe("static");
      expect(proposal.surfaceLimit).toContain(`destination: ${destination}`);
    });
  }

  // THE MEASUREMENT THE WHOLE MECHANISM EXISTS FOR. The house accent is the same colour on both
  // sides of this; what changes is whether a reader can see it. 8.01:1 on the newsroom's own
  // screen ground, 2.20:1 on the sheet — one passes the non-text floor and one does not, and
  // before this the toolchain had no way to tell the two beats apart.
  it("should pass the accent on screen and fail the same accent in print, on one beat", async () => {
    const contrastOf = async (destination: string) => {
      await writeFile(storyboardPath, STORYBOARD);
      await mutateStoryboard(storyboardPath, {
        slot: { id: 1, fields: { destination } },
      });
      const slot = await slotOnDisk();
      const proposal = proposePalette({
        newsroom: HOUSE,
        subject: "hospital beds",
        surface: slot.format,
        destination: slot.destination,
      });
      const house = proposal.options.find(
        (option: any) => option.id === "house",
      );
      return house.contrast;
    };

    const onScreen = await contrastOf("screen");
    const onPaper = await contrastOf("print");
    expect(onScreen.ratio).toBeCloseTo(8.01, 1);
    expect(onScreen.passes).toBe(true);
    expect(onPaper.ratio).toBeCloseTo(2.2, 1);
    expect(onPaper.passes).toBe(false);
  });
});

/**
 * THE HAND-OVER AND THE DELIVERED PAGE, ON THE ONE FACT THAT CANNOT BE CHECKED BY LOOKING.
 *
 * Round six, AB3: five silent failures came out of one beat, every one found by driving the page or
 * looking at it, and the last of them was not visible on the page at all — "an export shipping the
 * literal `__MAPTILER_KEY__` while the hand-over told the journalist no key was recorded". It was
 * then fixed in the other direction and the SAME defect came back inverted: a live 20-character key
 * was committed into a tracked export (R1b, `splash/test/the-key-has-one-home.test.ts`), removed,
 * and the hand-over went on saying "the key that lets it draw is inside the file".
 *
 * A journalist cannot check this by opening either document. It is exactly what a guard is for, and
 * it is cheap: the page either carries the placeholder or a key, the hand-over either says so or
 * says the opposite, and the two are read together.
 *
 * DISCOVERED, NEVER LISTED. Every delivered map-web page under `stories/*​/export/` with a
 * `HANDOVER.md` beside it — a beat delivered next week is read without anyone remembering to add
 * it. The anti-vacuity clause below refuses a green run over an empty set.
 *
 * WHAT IT DELIBERATELY DOES NOT REACH. Whether the hand-over's OTHER paragraphs are true — the alt
 * text, the placement, the limit. Those are the journalist's own words read back, and this file
 * makes no claim about them.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PLACEHOLDER = "__MAPTILER_KEY__";

type Delivery = { rel: string; html: string; handover: string };

/** Every `<story>/export/<beat>/` holding both a self-contained page and a hand-over. */
function deliveries(): Delivery[] {
  const found: Delivery[] = [];
  const stories = join(TWIN, "stories");
  if (!existsSync(stories)) return found;
  for (const story of readdirSync(stories)) {
    const exportDir = join(stories, story, "export");
    if (!existsSync(exportDir)) continue;
    for (const beat of readdirSync(exportDir)) {
      const dir = join(exportDir, beat);
      const handover = join(dir, "HANDOVER.md");
      if (!existsSync(handover)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".html")) continue;
        const html = readFileSync(join(dir, file), "utf8");
        // A map-web page and nothing else: the live plan is what makes the key a question at all.
        if (!html.includes('id="mw-live-plan"')) continue;
        found.push({
          rel: `stories/${story}/export/${beat}/${file}`,
          html,
          handover: readFileSync(handover, "utf8"),
        });
      }
    }
  }
  return found;
}

const DELIVERIES = deliveries();

describe("a delivered map page and its hand-over agree about the key", () => {
  it("should have found a delivered live map to read at all", () => {
    // Without this the whole file passes over an empty tree, which is how a guard stops covering
    // what it was written for.
    expect(DELIVERIES.length).toBeGreaterThan(0);
  });

  for (const delivery of DELIVERIES) {
    it(`${delivery.rel}`, () => {
      const carriesPlaceholder = delivery.html.includes(PLACEHOLDER);
      // R1b's own rule, restated from this side: a tracked page carries the placeholder, never a
      // key. A live MapTiler key is 20 characters of URL-safe alphanumerics on the style URL.
      const carriesKey = /api\.maptiler\.com[^"']*[?&]key=[A-Za-z0-9]{16,}/.test(delivery.html);
      const saysItCarriesOne =
        /key that lets it draw is\s+inside the file|the key is inside the file|carries (?:a|your|the) (?:live |restricted )?(?:MapTiler )?key/i.test(
          delivery.handover,
        );
      const saysItCarriesNone = new RegExp(
        `does not carry\\s+a key|carries the placeholder \`?${PLACEHOLDER}`,
        "i",
      ).test(delivery.handover);

      expect({
        page: carriesKey ? "a key" : carriesPlaceholder ? "the placeholder" : "neither",
        handover: saysItCarriesOne
          ? "says it carries a key"
          : saysItCarriesNone
            ? "says it carries the placeholder"
            : "says nothing about the key",
      }).toEqual({
        page: "the placeholder",
        handover: "says it carries the placeholder",
      });
    });
  }
});

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
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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

/**
 * AND THE OTHER COPY — the one this guard could not see, and the reason it used to be unsatisfiable.
 *
 * D1: a keyed delivery wrote its key into `export/<beat>/<page>.html`, inside the repository, so
 * "clean tree" and "no key in the repository" each cost the other and the report concluded no third
 * state existed. It does: `deliver.mjs` writes the record with the placeholder and the DELIVERY into
 * `export/<beat>/keyed/`, a directory made un-committable by its own `.gitignore` holding `*`.
 *
 * The block above reads the record and the hand-over. This one reads the pair — because a hand-over
 * saying "the copy to publish is `keyed/x.html`" is a promise about a file, and because "git cannot
 * commit it" is a claim about a tool that only the tool can answer. Both are asked here, of the real
 * deliveries in this tree.
 */
describe("a keyed delivery keeps its key where git cannot reach it", () => {
  const keyedDeliveries = DELIVERIES.map((delivery) => {
    const dir = join(TWIN, delivery.rel, "..");
    const keyedDir = join(dir, "keyed");
    const named = [...delivery.handover.matchAll(/`keyed\/([^`]+)`/g)].map((m) => m[1]);
    return { ...delivery, dir, keyedDir, named };
  });

  it("names, in the hand-over, a keyed copy that is actually on disk", () => {
    // A paragraph promising a file nobody wrote is the same defect one document along.
    const missing: string[] = [];
    for (const delivery of keyedDeliveries)
      for (const name of delivery.named)
        if (!existsSync(join(delivery.keyedDir, name)))
          missing.push(`${delivery.rel}: the hand-over names keyed/${name} and it is not there`);
    expect(missing).toEqual([]);
  });

  it("keeps every keyed copy out of everything a `git add -A` would commit", () => {
    // Asked of git itself, over both listings `no-key-in-the-repository.test.ts` reads. A keyed page
    // appearing in either is the leak the third state exists to close.
    const listing = (args: string[]) =>
      execFileSync("git", args, { cwd: TWIN, encoding: "utf8" }).split("\0").filter(Boolean);
    const committable = new Set([
      ...listing(["ls-files", "-z", "--", "."]),
      ...listing(["ls-files", "-z", "--others", "--exclude-standard", "--", "."]),
    ]);
    const leaked: string[] = [];
    for (const delivery of keyedDeliveries)
      for (const name of delivery.named) {
        const rel = relative(TWIN, join(delivery.keyedDir, name));
        if (committable.has(rel)) leaked.push(rel);
      }
    expect(
      leaked,
      "a keyed delivered page is committable. The `keyed/` directory carries its own .gitignore " +
        "holding `*`, which ignores its whole contents including itself; if that file is gone, the " +
        "key is one `git add -A` from the history.",
    ).toEqual([]);
  });

  it("has at least one keyed delivery to be looking at", () => {
    // Anti-vacuity: without this the two assertions above pass over a tree with no keyed delivery
    // in it, which is the tree that existed before the third state was built.
    expect(keyedDeliveries.filter((delivery) => delivery.named.length > 0).length).toBeGreaterThan(0);
  });

  it("carries the key in the copy the hand-over says carries it", () => {
    // The other half of the pair: the record has the placeholder (asserted above) and the keyed copy
    // really does request MapTiler with something else. Value-independent, the same shape R1b's own
    // style-URL scan uses, so no key has to be known to see one.
    const wrong: string[] = [];
    for (const delivery of keyedDeliveries)
      for (const name of delivery.named) {
        const path = join(delivery.keyedDir, name);
        if (!existsSync(path)) continue;
        const html = readFileSync(path, "latin1");
        if (!/api\.maptiler\.com\/[^"'\s]*[?&]key=[A-Za-z0-9]{16,}/.test(html))
          wrong.push(`${delivery.rel}: keyed/${name} carries no substituted key`);
        if (html.includes(PLACEHOLDER))
          wrong.push(`${delivery.rel}: keyed/${name} still carries the placeholder`);
      }
    expect(wrong).toEqual([]);
  });
});

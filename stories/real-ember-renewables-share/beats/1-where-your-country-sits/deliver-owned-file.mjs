/**
 * GATE 4 FOR THIS BEAT, made reproducible. The delivery form the journalist chose is `owned-file`:
 * one self-contained HTML page the newsroom owns outright. `embed` — the form this desk would
 * actually have wanted, a live URL that updates on every approved revision — was offered and came
 * back unavailable: Cloudflare answered 403 to the credentials on this machine.
 *
 *   bun stories/real-ember-renewables-share/beats/1-where-your-country-sits/deliver-owned-file.mjs
 *
 * The alt text is taken from `render`'s own return value, NOT read back out of the rendered page.
 * Scraping it from the `<desc>` returns it HTML-escaped — `world&#x27;s` — and `formatHandover`
 * writes Markdown, where that entity reaches the journalist as five literal characters. There is no
 * other recorded home for a beat's alt text in this toolchain, so the runner has to hand it over.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { materialise } from "../../../../skills/deliver/scripts/deliver.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { render } from "./render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "../..");
const STORIES_ROOT = join(STORY, "..");

/** The two findings this beat's own review is bound to. */
const FINDING_IDS = ["ember-1-the-world-figure-is-nobodys", "ember-2-three-bodies-disagree-on-europe"];

const { alt, source } = await render();
const storyboard = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8")).meta;
if (source !== storyboard.credit)
  throw new Error(
    `the page prints "${source}" as its source and STORYBOARD.md records "${storyboard.credit}" — the ` +
      "hand-over would credit one thing and the graphic another",
  );

const written = await materialise({
  form: "owned-file",
  format: "web",
  storiesRoot: STORIES_ROOT,
  storyId: "real-ember-renewables-share",
  outputId: "1-where-your-country-sits",
  planVersion: 1,
  findingIds: FINDING_IDS,
  handover: {
    placement: storyboard.placement,
    alt,
    credit: storyboard.credit,
    caveat: storyboard.limits,
    language: storyboard.language,
  },
});

for (const path of written) console.log(path);

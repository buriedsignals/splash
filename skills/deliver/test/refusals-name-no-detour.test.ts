/**
 * A REFUSAL THAT NAMES ITS OWN BYPASS IS NOT A GATE.
 *
 * From the owner's own run, 2026-08-10. The delivery step refused a beat over the MapTiler key, and
 * the refusal ended with *"…or unset MAPTILER_KEY for this delivery and the page will ship its
 * complete fallback layer with no live tiles."* The model read that, took the route the refusal had
 * pointed at, and reported: *"Je livre par la voie que le refus lui-même désigne."*
 *
 * That is the improvisation class this project keeps re-learning, in its purest form: the gate did
 * not merely fail to stop the work, it SUPPLIED the way around itself. A refusal's job is to stop
 * and to inform — what happened, and what the situation is. The way forward is a decision, and a
 * decision belongs to the journalist, in the journalist's own turn, not smuggled into an exception
 * message where the next reader is a model in a hurry.
 *
 * WHAT THIS FILE ASSERTS
 *
 *   1. Every refusal in the delivery path, TRIGGERED FOR REAL (not read off the source), names no
 *      alternative delivery route.
 *   2. Every `throw new Error(...)` in the delivery path's four scripts, read statically, likewise —
 *      so a refusal no fixture happens to reach is still covered. Anti-vacuity: the scan must find
 *      at least as many throws as the path is known to carry, or a broken extractor would pass by
 *      finding nothing.
 *   3. The detector itself catches the historical sentence. A detector that cannot see the defect it
 *      was written for is the guard that cannot go red.
 *
 * WHAT IS DELIBERATELY NOT AN OFFENCE, because the distinction is the whole subtlety here:
 *
 *   - naming the CONDITION the gate is waiting on — *"this beat has not been approved yet — show it
 *     first"*. That is the gate's own requirement, restated. It closes the gate; it does not go
 *     round it.
 *   - naming the CORRECT api — *"each beat delivers into its own export/<beat>/ directory (see
 *     exportDirFor)"*. That is where the delivery belongs, not a second way to get the same delivery
 *     out without satisfying the check.
 *
 * The offence is specifically: *this refusal stands, AND here is another way to get the artifact
 * delivered anyway*.
 *
 * MUTATION (run in a copy under /tmp): put the historical sentence back on any refusal in
 * `deliver.mjs` — e.g. append `" or unset MAPTILER_KEY for this delivery and the page will ship its
 * complete fallback layer"` to the embed-credentials refusal. Both the triggered sweep and the
 * static scan redden, naming the message.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  offerForms,
  materialise,
  ownedFileForInsertion,
  exportDirFor,
} from "../scripts/deliver.mjs";
import { formatHandover } from "../scripts/format-handover.mjs";
import { buildInsertion } from "../scripts/cms-insert.mjs";
import { deployFile } from "../scripts/deploy-embed.mjs";

/**
 * "This refusal stands, and here is another way to get it delivered anyway."
 *
 * Three shapes, all measured against the real messages in this path before being added — the first
 * is the historical defect's own shape (a disjunction proposing an action), the other two are the
 * two ways the same offer is usually phrased.
 */
const DETOURS: { name: string; pattern: RegExp }[] = [
  {
    name: "a disjunction proposing another action",
    pattern:
      /\b(?:or|otherwise|alternatively)\b[^.!?]{0,80}?\b(?:unset|remove|delete|clear|skip|bypass|disable|drop|rename|move|touch|copy|paste|deliver|ship|export|publish|host|hand\s+over)\b/i,
  },
  { name: '"you can still …"', pattern: /\b(?:can|could|may)\s+still\b/i },
  {
    name: '"instead, …" offering a second route',
    pattern: /\binstead\b[^.!?]{0,60}?\b(?:can|could|may|just|simply)\b/i,
  },
];

function detourIn(message: string): string | null {
  for (const { name, pattern } of DETOURS)
    if (pattern.test(message)) return name;
  return null;
}

/** The sentence that was actually shipped, and that the run followed. */
const THE_HISTORICAL_SENTENCE =
  "MAPTILER_DELIVERY_KEY is not set, and MAPTILER_KEY is — refusing to deliver the development " +
  "key into a published page (ruling R1b). Create a SECOND MapTiler key restricted to the " +
  "newsroom's own origins and set MAPTILER_DELIVERY_KEY, or unset MAPTILER_KEY for this delivery " +
  "and the page will ship its complete fallback layer with no live tiles.";

describe("the detector can see the defect it was written for", () => {
  it("should catch the sentence the run routed around", () => {
    expect(detourIn(THE_HISTORICAL_SENTENCE)).toBe(
      "a disjunction proposing another action",
    );
  });

  it("should not catch a refusal that only restates its own condition", () => {
    expect(
      detourIn(
        "this beat has not been approved yet — show it first: no APPROVED.md in beats/1-rainfall. " +
          "Delivery forms cannot be discussed before the journalist has seen the render.",
      ),
    ).toBeNull();
    expect(
      detourIn(
        'export/ already holds the delivery of beat "1-rainfall" — materialising beat ' +
          '"2-temperature" here would destroy it. Each beat delivers into its own export/<beat>/ ' +
          "directory (see exportDirFor).",
      ),
    ).toBeNull();
  });
});

const handover = {
  language: "en",
  placement: "after the paragraph on winter rainfall",
  alt: "Rainfall fell in three of the last four winters",
  credit: "Source: MeteoSwiss, as of 2026-08-10",
};

let tempRoot: string, storyDir: string, beatDir: string, exportDir: string;
beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "refusals-"));
  storyDir = join(tempRoot, "story");
  beatDir = join(storyDir, "beats", "1-rainfall");
  exportDir = exportDirFor(storyDir, "1-rainfall");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await mkdir(exportDir, { recursive: true });
  await writeFile(join(beatDir, "renders", "still.png"), "png-bytes");
  await writeFile(join(beatDir, "renders", "still.svg"), "<svg/>");
  await writeFile(join(beatDir, "APPROVED.md"), "seen, approved");
});
afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

/** The message a call really produced, or `null` when it did not refuse at all. */
async function refusalFrom(call: () => unknown): Promise<string> {
  try {
    await call();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("this call was expected to refuse and did not");
}

describe("every refusal in the delivery path, triggered for real", () => {
  it("should name no way around itself", async () => {
    const messages: string[] = [];

    // offerForms — the three it owns.
    messages.push(
      await refusalFrom(() =>
        offerForms({ medium: "chart", genre: "hologram", beatDir }),
      ),
    );
    messages.push(
      await refusalFrom(() => offerForms({ medium: "chart", genre: "static" })),
    );
    messages.push(
      await refusalFrom(async () => {
        await rm(join(beatDir, "APPROVED.md"));
        return offerForms({ medium: "chart", genre: "static", beatDir });
      }),
    );
    await writeFile(join(beatDir, "APPROVED.md"), "seen, approved");

    // materialise — the pair check, the missing hand-over, the missing Cloudflare credential, the
    // two-beats-one-directory receipt, and the two ambiguity guards.
    messages.push(
      await refusalFrom(() =>
        materialise({
          form: "embed",
          genre: "static",
          beatDir,
          exportDir,
          handover,
        }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        materialise({
          form: "owned-file",
          genre: "static",
          beatDir,
          exportDir,
        }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        materialise({
          form: "embed",
          genre: "web",
          beatDir,
          exportDir,
          env: {},
          handover,
        }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        materialise({
          form: "embed",
          genre: "web",
          beatDir,
          exportDir,
          env: {
            CLOUDFLARE_ACCOUNT_ID: "account",
            CLOUDFLARE_API_TOKEN: "token",
          },
          handover,
        }),
      ),
    );
    messages.push(
      await refusalFrom(async () => {
        await writeFile(join(exportDir, ".delivered-from"), "9-another-beat\n");
        return materialise({
          form: "owned-file",
          genre: "static",
          beatDir,
          exportDir,
          handover,
        });
      }),
    );
    await rm(join(exportDir, ".delivered-from"), { force: true });
    messages.push(
      await refusalFrom(() => ownedFileForInsertion(beatDir, "video")),
    );
    messages.push(
      await refusalFrom(() => ownedFileForInsertion(beatDir, "hologram")),
    );

    // exportDirFor's two.
    messages.push(await refusalFrom(() => exportDirFor("", "1-rainfall")));
    messages.push(await refusalFrom(() => exportDirFor("stories/rain", "")));

    // formatHandover — the missing field, the empty file list, the maintainer sentence, the
    // unknown live-tiles state.
    messages.push(
      await refusalFrom(() => formatHandover({ ...handover, genre: "web" })),
    );
    messages.push(
      await refusalFrom(() =>
        formatHandover({ ...handover, genre: "web", files: [], credit: "x" }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        formatHandover({
          ...handover,
          genre: "web",
          files: ["still.png"],
          caveat: "see where.mjs",
        }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        formatHandover({
          ...handover,
          genre: "web",
          files: ["still.png"],
          liveTiles: "probably fine",
        }),
      ),
    );
    // and the language it is written in, which is read and never guessed.
    messages.push(
      await refusalFrom(() =>
        formatHandover({
          ...handover,
          genre: "web",
          files: ["still.png"],
          language: "",
        }),
      ),
    );

    // cms-insert — the kind vocabulary, the empty insertion, and the partial-article guard.
    messages.push(
      await refusalFrom(() =>
        buildInsertion({ kind: "wordpress", insertionHtml: "<p>x</p>" }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        buildInsertion({
          kind: "we-publish",
          articleId: "a",
          previousBody: "<p>b</p>",
          insertionHtml: "",
        }),
      ),
    );
    messages.push(
      await refusalFrom(() =>
        buildInsertion({
          kind: "we-publish",
          articleId: "a",
          previousBody: "",
          insertionHtml: "<p>x</p>",
        }),
      ),
    );

    // deploy-embed — a real Cloudflare failure, surfaced with Cloudflare's own message.
    messages.push(
      await refusalFrom(() =>
        deployFile({
          accountId: "account",
          apiToken: "token",
          filePath: join(beatDir, "renders", "still.png"),
          fileName: "still.png",
          fetchFn: async () =>
            new Response(
              JSON.stringify({ success: false, errors: [{ message: "nope" }] }),
              {
                status: 403,
              },
            ),
        }),
      ),
    );

    const offenders = messages
      .map((message) => ({ message, detour: detourIn(message) }))
      .filter((row) => row.detour !== null)
      .map((row) => `${row.detour}: ${row.message}`);

    expect(messages.length).toBeGreaterThanOrEqual(20);
    expect(offenders).toEqual([]);
  });
});

/**
 * The static half. A refusal no fixture above happens to reach is still a refusal a model will read.
 */
const SCRIPTS = [
  "deliver.mjs",
  "format-handover.mjs",
  // The two refusals that decide what language the delivery is written in are on the delivery path
  // like every other one here, so they are read by the same scan.
  "journalist-language.mjs",
  "cms-insert.mjs",
  "deploy-embed.mjs",
];

/** Every `throw new Error(…)` argument in a source file, interpolations blanked out. */
function thrownMessages(source: string): string[] {
  const found: string[] = [];
  const marker = "throw new Error(";
  let at = source.indexOf(marker);
  while (at !== -1) {
    let depth = 1;
    let i = at + marker.length;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    found.push(
      source
        .slice(at + marker.length, i - 1)
        .replace(/\$\{[^}]*\}/g, " ") // an interpolated value is not prose
        .replace(/["'`]/g, "")
        .replace(/\s*\+\s*/g, ""), // a concatenated message is one sentence
    );
    at = source.indexOf(marker, i);
  }
  return found;
}

describe("every refusal in the delivery path, read from the source", () => {
  it("should name no way around itself, in any of the delivery path's scripts", () => {
    const offenders: string[] = [];
    let count = 0;
    for (const script of SCRIPTS) {
      const source = readFileSync(
        join(import.meta.dirname, "..", "scripts", script),
        "utf8",
      );
      for (const message of thrownMessages(source)) {
        count++;
        const detour = detourIn(message);
        if (detour) offenders.push(`${script} — ${detour}: ${message.trim()}`);
      }
    }
    // Anti-vacuity: a broken extractor finds nothing and passes. The path carried 20 throws when
    // this was written; the floor is deliberately below that so adding one does not redden it, and
    // deliberately high enough that a silent extraction failure does.
    expect(count).toBeGreaterThanOrEqual(18);
    expect(offenders).toEqual([]);
  });
});

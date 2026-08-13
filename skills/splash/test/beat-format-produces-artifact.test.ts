/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The failure this defends against: a beat directory under `proof/` declares a format — the
 * component and script shapes that mean "this is a video beat" or "this is a web beat" — and
 * never actually produced the artifact that format implies. Five beats hit exactly this in one
 * night: video beats that shipped `timing-contract.ts` and a `*Video.tsx` component but no
 * `.mp4`, a web beat that shipped a `*Web.tsx` component and `render-web.mjs` but no `.html`.
 * From outside, nothing distinguished them from a beat that had actually rendered — same files,
 * same shape, the suite green throughout, counted and reported as delivered work. That is the
 * presence-of-a-file mistaken for the existence-of-a-result failure this project has paid for
 * more than once, in different clothes each time.
 *
 * WHAT IT CATCHES. For every directory directly under `proof/` except `comparison/`, `seance/`
 * and `trial/` (those hold evidence ABOUT the experiment, not a beat's own production), the
 * format is inferred from filenames alone, independently — a beat can trip more than one:
 *   - a `timing-contract.ts` or a `*Video.tsx` component  → format VIDEO, requires an `.mp4`.
 *   - a `*Web*.tsx` component or a `render-web.mjs` script → format WEB, requires an `.html`.
 *   - the beat directory's own name, or any filename in it, containing "scrolly"
 *                                                          → format SCROLLY, also requires `.html`.
 *   - ONLY when none of the three signals above fired      → fallback format STATIC, requires a
 *     `.png`. This is deliberately last-resort: a video beat's `*Video.tsx` sits beside a
 *     `*Still.tsx` component it is never asked to justify to this guard, because STATIC was never
 *     its declared format — asserting the artifact each DECLARED format requires, not an exact file
 *     set, is what lets a beat that over-delivers (ships a still it didn't have to) pass without
 *     this guard inventing a requirement nobody made.
 * The artifact search is recursive under the beat directory (`render/`, `dist/`, any nesting),
 * because the map-native and web beats in this corpus write their real output one level down
 * from their component, not beside it.
 *
 * NON-TRIVIAL IS A FLOOR, NOT A CHECK. Every real artifact currently in this corpus clears its
 * floor comfortably (smallest measured: a static PNG at ~88KB against a 3KB floor, an HTML at
 * ~24KB against a 3KB floor, an mp4 at ~660KB against a 1KB floor) — the floors exist only to
 * reject a zero-byte or truncated stub, which a bare `existsSync` would happily pass. That is ALL
 * this proves. A PNG at 3KB could be a blank grey rectangle; an mp4 at 1KB could be a corrupt
 * one-frame stub that still isn't zero bytes; an HTML at 3KB could be a shell with no chart in
 * it. This guard cannot open a file and judge what's inside it — it only rules out the one
 * defect it was built for: nothing was produced at all.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *   - Correctness of the artifact's content. A wrong chart, a blank canvas, a video that plays
 *     the wrong data end to end, an HTML that throws on load — none of that is visible to a size
 *     check, and this guard makes no attempt at it.
 *   - Format detection is filename-only, and can miss a real format entirely. A beat that ships a
 *     working video under a component named `Emissions.tsx` (no `Video` in the name) and no
 *     `timing-contract.ts` is invisible to this guard as a video beat, so it is never asked to
 *     prove it has an `.mp4` — the exact class of gap this guard closes for the filename shapes
 *     actually used in this corpus, not a proof that every possible video beat is covered.
 *   - "Self-contained" for the WEB/SCROLLY format is asserted by size floor only — never verified.
 *     An `.html` that references an external script or stylesheet by relative path still passes.
 *   - A beat with several candidate files of the required extension (several PNGs, several HTMLs)
 *     is satisfied by ANY ONE of them clearing the floor. It does not confirm that the SPECIFIC
 *     file the format implies — as opposed to some unrelated file that happens to share the
 *     extension — is the one that is large enough.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const PROOF_ROOT = join(import.meta.dirname, "..", "..", "..", "proof");

// Directories under proof/ that hold evidence about the experiment itself, not a beat's own
// production — walking them for a missing artifact would be a category error.
const NOT_A_BEAT = new Set(["comparison", "seance", "trial"]);

// Floors, not checks — see the header comment for what each one does and does not prove.
const FEW_KILOBYTES_FLOOR = 3 * 1024; // static PNG / self-contained HTML: "a few kilobytes"
const MP4_NOT_EMPTY_FLOOR = 1 * 1024; // mp4: "not empty" — deliberately weaker, see header

type Format = "video" | "web" | "scrolly" | "static";

const REQUIREMENT: Record<
  Format,
  { ext: string; floor: number; label: string }
> = {
  video: { ext: ".mp4", floor: MP4_NOT_EMPTY_FLOOR, label: "a non-empty .mp4" },
  web: {
    ext: ".html",
    floor: FEW_KILOBYTES_FLOOR,
    label: "a self-contained-sized .html",
  },
  scrolly: {
    ext: ".html",
    floor: FEW_KILOBYTES_FLOOR,
    label: "a self-contained-sized .html",
  },
  static: {
    ext: ".png",
    floor: FEW_KILOBYTES_FLOOR,
    label: "a plausibly-sized .png",
  },
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function detectFormats(
  beatDirName: string,
  files: string[],
): { format: Format; reason: string }[] {
  const basenames = files.map((f) => basename(f));
  const results: { format: Format; reason: string }[] = [];

  const timingContract = basenames.includes("timing-contract.ts");
  const videoComponent = basenames.find((b) => /Video\.tsx$/.test(b));
  if (timingContract || videoComponent) {
    results.push({
      format: "video",
      reason: timingContract ? "timing-contract.ts" : videoComponent!,
    });
  }

  const webComponent = basenames.find(
    (b) => b.includes("Web") && b.endsWith(".tsx"),
  );
  const renderWebScript = basenames.includes("render-web.mjs");
  if (webComponent || renderWebScript) {
    results.push({ format: "web", reason: webComponent ?? "render-web.mjs" });
  }

  const scrollyFile = basenames.find((b) =>
    b.toLowerCase().includes("scrolly"),
  );
  const scrollyDirName = beatDirName.toLowerCase().includes("scrolly");
  if (scrollyDirName || scrollyFile) {
    results.push({
      format: "scrolly",
      reason: scrollyFile ?? `directory name "${beatDirName}"`,
    });
  }

  if (results.length === 0) {
    results.push({
      format: "static",
      reason: "no video/web/scrolly signal found",
    });
  }

  return results;
}

const beatDirNames = readdirSync(PROOF_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !NOT_A_BEAT.has(e.name))
  .map((e) => e.name)
  .sort();

describe("every beat under proof/ produced the artifact its declared format implies", () => {
  for (const beatDirName of beatDirNames) {
    const beatDir = join(PROOF_ROOT, beatDirName);
    const files = walk(beatDir);
    const formats = detectFormats(beatDirName, files);

    for (const { format, reason } of formats) {
      const req = REQUIREMENT[format];

      it(`should find ${req.label} under proof/${beatDirName}, which declares format "${format}" via ${reason}`, () => {
        const candidates = files
          .filter((f) => f.toLowerCase().endsWith(req.ext))
          .map((f) => ({ path: f, size: statSync(f).size }));
        const passing = candidates.filter((c) => c.size >= req.floor);

        expect(
          passing.length,
          `proof/${beatDirName} declares format "${format}" (via ${reason}) but has no ${req.ext} ` +
            `at or above the ${req.floor}-byte floor. Candidates found: ` +
            `${candidates.length === 0 ? "none" : JSON.stringify(candidates)}`,
        ).toBeGreaterThan(0);
      });
    }
  }
});

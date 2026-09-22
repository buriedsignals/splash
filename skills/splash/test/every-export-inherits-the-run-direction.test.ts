/**
 * L3 AGAIN, ON THE SIDE NOBODY WAS WATCHING: the run composes ONE art direction, writes it, refuses
 * to scaffold without it — and then no producer read it.
 *
 * Ruling R-A: a production run is produced in one art direction, composed once from `NEWSROOM.md`
 * and the story's subject, written at the story root beside `PALETTE.md`, inherited by the still,
 * the video, the web page and the scrolly alike, redefined by none.
 *
 * MEASURED 2026-09-23, producing a real story's four exports for the first time:
 *   · the static runner read `PALETTE.md` — ground and accent — and ignored the six typographic
 *     registers the run direction had composed;
 *   · the video runner RE-COMPOSED its own, from the filed directions plus the newsroom, feeding
 *     the composer its OWN copy. It happened to land on the same label as the still, which is
 *     exactly what kept this invisible: the composer is fed `textPerRegister`, and an export's text
 *     is by definition not its siblings' text, so the four agree by luck and not by construction;
 *   · the scrolly runner did the same;
 *   · only `chart-web` read `DIRECTION.md`, and only since earlier the same day.
 *
 * `a-production-run-has-one-direction.test.ts` could not see any of it. It walks this repository's
 * `stories/` for beats that NAME a filed direction; a runner that re-derives one names nothing, and
 * a journalist's story lives in the install root.
 *
 * So the rule is held here on the TEMPLATES, which are upstream of every story this repository will
 * never see, and it asks the one question that distinguishes reading from re-deriving.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/**
 * ONE ENTRY PER SCAFFOLD, because a scaffold is what a journalist receives and its files share a
 * folder. The video scaffolds split the question in two — `render-directions-video.mjs` asks
 * `directionsFor`, which lives in the `build.mjs` beside it — so asking file by file would report
 * a runner as owing what its own sibling already does.
 */
function scaffoldBundles(): { name: string; source: string }[] {
  const out: { name: string; source: string }[] = [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const assets = join(SKILLS, skill.name, "assets");
    let dirs: string[];
    try {
      dirs = readdirSync(assets).filter((d) => d.endsWith("-scaffold"));
    } catch {
      continue;
    }
    for (const dir of dirs) {
      const files = readdirSync(join(assets, dir)).filter((f) => f.endsWith(".mjs.tmpl"));
      out.push({
        name: `${skill.name}/assets/${dir}`,
        source: files.map((f) => readFileSync(join(assets, dir, f), "utf8")).join("\n"),
      });
    }
  }
  // chart-web fills its runner from an inline template rather than from a file on disk.
  out.push({
    name: "chart-web/scripts/scaffold-web-beat.mjs",
    source: readFileSync(join(SKILLS, "chart-web", "scripts", "scaffold-web-beat.mjs"), "utf8"),
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * THE ONE EXPORT FAMILY STILL EXEMPT, by name and with its reason — the same shape as the `proof/`
 * prefix, never a heuristic. A web MAP bakes a basemap plate per filed direction, upstream of any
 * render, and its whole plate pipeline is keyed to the three; giving it the run's one direction
 * means baking that direction's plate first, which is a different piece of work from this one.
 */
const STILL_OWED = new Set(["map-web/assets/web-map-beat-scaffold"]);

describe("every runner a journalist is handed", () => {
  it("finds the templates at all, so this file cannot pass by looking at nothing", () => {
    expect(scaffoldBundles().length).toBeGreaterThanOrEqual(8);
  });

  it("reads the run's own DIRECTION.md rather than re-deriving one", () => {
    const rederiving = scaffoldBundles()
      .filter(({ name }) => !STILL_OWED.has(name))
      .filter(({ source }) => !/\breadRunDirection\b/.test(source))
      .map(({ name }) => name);
    expect(rederiving).toEqual([]);
  });

  it("keeps the catalogue's escape, which is R-A's own named exception", () => {
    const withoutFiled = scaffoldBundles()
      .filter(({ source }) => /\breadRunDirection\b/.test(source))
      .filter(({ source }) => !/--filed|\bfiled\b/.test(source))
      .map(({ name }) => name);
    expect(withoutFiled).toEqual([]);
  });

  /**
   * AND THE TEMPLATES ARE NOT WHAT MOST JOURNALISTS RECEIVE.
   *
   * All eight scaffolds ADAPT a worked example by default: they copy a catalogue beat's own runner
   * and mark its regions `SCAFFOLD:`. That runner is a PROOF's, so it carries R-A's named exception
   * — the three filed demo directions — and the journalist receives it. Fixing the `.tmpl` files
   * closed the path nobody takes and left the one everybody does. Measured immediately afterwards by
   * scaffolding a real story's scrolly beat: its written runner still looped over
   * `docs/design-base/directions`, with the templates already green.
   *
   * So the adapting pipelines are asked the same question, on the transform each one applies.
   */
  it("rewrites the worked example's three-direction loop when it adapts one", () => {
    const adapting = readdirSync(SKILLS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((skill) => {
        const scripts = join(SKILLS, skill.name, "scripts");
        let files: string[];
        try {
          files = readdirSync(scripts);
        } catch {
          return [];
        }
        return files
          .filter((f) => /^scaffold-.*\.mjs$/.test(f))
          .map((f) => ({ name: `${skill.name}/${f}`, source: readFileSync(join(scripts, f), "utf8") }))
          // An ADAPTING scaffold is one that copies a worked example's code: it exports
          // `adaptFromBeat` and takes `--from`. The four that only fill their own templates are
          // covered by the case above, on those templates.
          .filter(({ source }) => /function adaptFromBeat\b/.test(source) && /"--from"/.test(source));
      });
    expect(adapting.map((a) => a.name).sort()).toEqual([
      "chart-beat/scaffold-static-beat.mjs",
      "map-beat/scaffold-static-map-beat.mjs",
      "scrolly/scaffold-scrolly-beat.mjs",
      "scrolly/scaffold-scrolly-map-beat.mjs",
    ]);
    const unrewritten = adapting
      .filter(({ source }) => !/oneRunDirection|composedDirectionDefault/.test(source))
      .map(({ name }) => name);
    expect(unrewritten).toEqual([]);
  });

  it("names the one family still owed, so the exemption cannot quietly grow", () => {
    const owed = scaffoldBundles()
      .filter(({ source }) => !/\breadRunDirection\b/.test(source))
      .map(({ name }) => name);
    expect(owed).toEqual([...STILL_OWED]);
  });
});

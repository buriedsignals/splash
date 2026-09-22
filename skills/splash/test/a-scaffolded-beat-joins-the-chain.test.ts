/**
 * A BEAT A JOURNALIST SCAFFOLDS IS BORN OUTSIDE THE EDITORIAL CHAIN.
 *
 * A catalogue BRIEF opens with front matter — `format`, `type`, `medium`, `grounding`, `derived: v1`
 * — and that front matter is what puts it under the chain: `derivedBeats()` reads it, and 161 of the
 * 163 beats in this repository are enrolled by it, all 40 web ones included.
 *
 * NONE OF THE EIGHT SCAFFOLDS WROTE ANY FRONT MATTER. Measured 2026-09-23, on a real story's second
 * export: every beat a journalist creates, in any of the four formats, was therefore invisible to
 * the chain. It received the empty choreography table as a prompt and nothing ever read it back —
 * the beat that found this shipped with the table blank and every gate green.
 *
 * `grounding` is the analyst's answer and is not written here. `derived: v1` marks a beat migrated
 * into the L5 census, which a fresh beat has not been — enrolling one there would turn this
 * repository red on every unfinished scratch beat under `proof/`, and would still never see a
 * journalist's story, which lives in the install root. The refusal lives at G3 instead, on approve.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import { parseBriefFrontMatter } from "#shared/chart-beat/sizes.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every `scaffold-*.mjs` any skill ships — discovered, so the population cannot silently shrink. */
function scaffolds(): string[] {
  const out: string[] = [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const dir = join(SKILLS, skill.name, "scripts");
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of entries)
      if (/^scaffold-.*\.mjs$/.test(file)) out.push(join(dir, file));
  }
  return out.sort();
}

/**
 * The front matter of the `BRIEF.md` this scaffold writes, or null.
 *
 * TWO SHAPES, because the eight scaffolds are two families and this test walks both rather than
 * pretending they are one. `chart-web` fills an inline `const BRIEF = ` template; the other seven
 * adapt a worked example and fill a `BRIEF.md.tmpl` sitting under the skill's own `assets/`.
 */
function frontMatterOf(path: string): Record<string, string> | null {
  const inline = /const BRIEF = `([\s\S]*?)\n`;/.exec(readFileSync(path, "utf8"));
  if (inline) return parseBriefFrontMatter(inline[1]);
  // The directory THIS scaffold names in its own source, never the first one under assets/ —
  // `map-beat` ships two, and picking either by position would let the other drift unseen.
  const named = /"([a-z][a-z0-9-]*-scaffold)"/.exec(readFileSync(path, "utf8"));
  if (!named) return null;
  const tmpl = join(path, "..", "..", "assets", named[1], "BRIEF.md.tmpl");
  try {
    return parseBriefFrontMatter(readFileSync(tmpl, "utf8"));
  } catch {
    return null;
  }
}

const shortly = (path: string) => path.split("/").slice(-3).join("/");

describe("a beat a journalist scaffolds", () => {
  it("finds the scaffolds at all, so this file cannot pass by looking at nothing", () => {
    expect(scaffolds().length).toBeGreaterThanOrEqual(8);
  });

  it("is born with the front matter the editorial chain finds it by", () => {
    const without = scaffolds().filter((path) => {
      const record = frontMatterOf(path);
      return !record || !record.format || !record.type || !record.medium;
    });
    expect(without.map(shortly)).toEqual([]);
  });

  it("declares a format and a medium the catalogue actually uses", () => {
    const FORMATS = new Set(["static", "web", "video", "scrolly"]);
    const MEDIUMS = new Set(["chart", "map", "image"]);
    const odd = scaffolds().filter((path) => {
      const record = frontMatterOf(path)!;
      return !FORMATS.has(record.format) || !MEDIUMS.has(record.medium);
    });
    expect(odd.map(shortly)).toEqual([]);
  });

  it("does not write grounding, which is the analyst's answer, nor derived, which is the census's", () => {
    const early = scaffolds().filter((path) => {
      const record = frontMatterOf(path)!;
      return "grounding" in record || "derived" in record;
    });
    expect(early.map(shortly)).toEqual([]);
  });
});

/**
 * AND G3 IS WHERE A WEB BEAT IS MADE TO ANSWER.
 *
 * Not at scaffold time (nothing exists to check), not at render time (an author could not look at
 * their own draft, which is how a discipline turns into a workaround), and not by enrolling
 * scaffolded beats in the L5 census (it would turn this repository red on every unfinished scratch
 * beat, and would still never see a journalist's story in the install root).
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
// @ts-expect-error — as above.
import { assertWebBeatDeclaresItsFreeParameter } from "../../deliver/scripts/output-review.mjs";

const COMPLETE = `
const interaction = {
  earns: "a plate cannot print twenty-seven readings at once here",
  controls: [
    {
      question: "How many cases is that?",
      gesture: "ask-a-mark",
      changes: "the row repaints and the answer carries its share",
      parameter: "which mark is in question",
      authorPicked: "Romania",
      readerPicks: "every mark",
      heldStill: [".chart-plot"],
    },
  ],
};
`;

function beat(front: string, runner: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), "g3-web-"));
  writeFileSync(join(dir, "BRIEF.md"), `---\n${front}\n---\n\n# b — brief\n`);
  if (runner !== null) writeFileSync(join(dir, "render-directions-web.mjs"), runner);
  return dir;
}

describe("G3 on a web beat", () => {
  const web = "format: web\ntype: bar-and-column\nmedium: chart";

  it("refuses one whose render module declares no interaction at all", () => {
    const dir = beat(web, "// nothing here\n");
    expect(() => assertWebBeatDeclaresItsFreeParameter(dir)).toThrow(/declares no interaction/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("names every atom a half-written declaration is missing", () => {
    const dir = beat(web, COMPLETE.replace(/\n\s*heldStill:.*\n/, "\n").replace(/\n\s*authorPicked:.*\n/, "\n"));
    expect(() => assertWebBeatDeclaresItsFreeParameter(dir)).toThrow(/`authorPicked`, `heldStill`/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("lets a complete one through", () => {
    const dir = beat(web, COMPLETE);
    expect(() => assertWebBeatDeclaresItsFreeParameter(dir)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("says nothing about a beat that is not web — this rule is the web export's own", () => {
    const dir = beat("format: video\ntype: bar-and-column\nmedium: chart", null);
    expect(() => assertWebBeatDeclaresItsFreeParameter(dir)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it("says nothing about a directory with no BRIEF to read", () => {
    const dir = mkdtempSync(join(tmpdir(), "g3-web-"));
    expect(() => assertWebBeatDeclaresItsFreeParameter(dir)).not.toThrow();
    rmSync(dir, { recursive: true, force: true });
  });
});

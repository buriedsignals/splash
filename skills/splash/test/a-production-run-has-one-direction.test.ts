/**
 * L3 — ONE ART DIRECTION PER PRODUCTION RUN, COMPOSED ONCE AND INHERITED BY ALL FOUR EXPORTS.
 *
 * Ruling R-A of `docs/splash/2026-09-17-editorial-chain-spec.md`. The art direction is a parameter
 * of the RUN — composed from `NEWSROOM.md` plus the subject, written once at the story root beside
 * `PALETTE.md`, and read by the static, video, web and scrolly export alike. No export redefines
 * it, and no beat carries one of its own.
 *
 * `proof/` IS THE NAMED EXCEPTION, AND IT IS EXEMPT BY EXPLICIT PATH PREFIX. The 160 catalogue
 * proofs render the three filed directions (`docs/design-base/directions/{creme,nocturne,rapport}`)
 * precisely to show that the direction is a parameter rather than a value baked into a beat — a
 * rule that holds on one palette may only be lucky. The exemption is written `p.startsWith("proof/")`
 * and NOT as a heuristic on the name, because a heuristic ("a path that looks like a proof") is a
 * rule nobody can enumerate: it would silently swallow the next `proofs-of-concept/` or
 * `stories/proof-reading-times/` and the guard would report green over a production story that had
 * quietly gone back to rendering three directions.
 *
 * `readRunDirection` mirrors `readPalette` (`shared/chart-beat/colour.mjs:58`) signature for
 * signature — the walk up, the `stopAt`, the refusal that lists every path it looked at — so a
 * reader who knows one knows the other, and neither ever defaults.
 *
 * MUTATIONS, run and verified (task 5 of `docs/superpowers/plans/2026-09-17-editorial-chain.md`):
 *   - add a second `DIRECTION.md` under a fixture story → "should hold exactly one direction per
 *     story that holds beats" red, naming the story.
 *   - make a fixture beat read the three filed directions → "should let no production source read
 *     the filed directions" red, naming the file.
 *   - let `readRunDirection` fall back to the first filed direction → "should refuse rather than
 *     default" red.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import {
  composeRunDirection,
  writeRunDirection,
  readRunDirection,
  renderRunDirection,
} from "#shared/design-base/run-direction.mjs";
import { filedDirections } from "#shared/design-base/index.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const STORIES = join(ROOT, "stories");

let story: string;
let bare: string;

beforeAll(() => {
  story = mkdtempSync(join(tmpdir(), "run-direction-"));
  bare = mkdtempSync(join(tmpdir(), "no-direction-"));
  mkdirSync(join(story, "beats", "1-emissions"), { recursive: true });
});

afterAll(() => {
  rmSync(story, { recursive: true, force: true });
  rmSync(bare, { recursive: true, force: true });
});

describe("one direction per production run", () => {
  it("should compose one direction out of the newsroom's record and the subject, and keep the refusals inspectable", () => {
    const { chosen, offered, refused } = composeRunDirection({
      newsroom: { ground: "#FFFCEE", accent: "#1757B6", origin: "newsroom" },
      filed: filedDirections(),
      subject: "heat pump adoption across Europe",
    });
    expect(chosen.origin).toContain("heat pump adoption across Europe");
    expect(chosen.ground).toBe("#FFFCEE");
    expect(chosen.accent).toBe("#1757B6");
    expect(offered.length).toBeGreaterThan(0);
    expect(Array.isArray(refused)).toBe(true);
  });

  it("should read the run direction from a beat directory up to the story root", () => {
    const { chosen } = composeRunDirection({
      newsroom: { ground: "#FFFCEE", accent: "#1757B6", origin: "newsroom" },
      filed: filedDirections(),
      subject: "heat pump adoption across Europe",
    });
    writeRunDirection(story, chosen);
    const read = readRunDirection(join(story, "beats", "1-emissions"), {
      stopAt: story,
    });
    expect(read.id).toBe(chosen.id);
    expect(read.origin).toBe(chosen.origin);
    expect(read.ground).toBe(chosen.ground);
    expect(read.accent).toBe(chosen.accent);
    expect(Object.keys(read.registers).sort()).toEqual(
      Object.keys(chosen.registers).sort(),
    );
  });

  it("should refuse rather than default when no DIRECTION.md is reachable", () => {
    expect(() => readRunDirection(bare, { stopAt: bare })).toThrow(
      /DIRECTION\.md/,
    );
  });

  it("should name every path it looked at, the way readPalette does", () => {
    expect(() => readRunDirection(bare, { stopAt: bare })).toThrow(
      /DIRECTION\.md/,
    );
    try {
      readRunDirection(bare, { stopAt: bare });
    } catch (error) {
      expect(String((error as Error).message)).toContain(
        join(bare, "DIRECTION.md"),
      );
    }
  });

  it("should round-trip through the record a person can read", () => {
    const { chosen } = composeRunDirection({
      newsroom: { ground: "#FFFCEE", accent: "#1757B6", origin: "newsroom" },
      filed: filedDirections(),
      subject: "a subject",
    });
    const text = renderRunDirection(chosen);
    expect(text).toContain("- origin:");
    expect(text).toContain("| register |");
  });

  // A direction built in code carries `leading: null` legally — `resolveRegister` hands it back
  // that way for a direction that never went through the parser. Written as an empty ninth cell
  // the record looks fine and is refused on the way back IN, by the reader, naming the reader's
  // own file; the writer that produced it is nowhere in the message. The refusal is the writer's.
  it("should refuse to record a register whose direction files no leading", () => {
    const { chosen } = composeRunDirection({
      newsroom: { ground: "#FFFCEE", accent: "#1757B6", origin: "newsroom" },
      filed: filedDirections(),
      subject: "a subject",
    });
    const [name] = Object.keys(chosen.registers);
    const unled = {
      ...chosen,
      registers: {
        ...chosen.registers,
        [name]: { ...chosen.registers[name], leading: null },
      },
    };
    expect(() => renderRunDirection(unled)).toThrow(
      new RegExp(`files no leading for its ${name} register`),
    );
  });
});

// ── the corpus rule ──────────────────────────────────────────────────────────────────────────
// `proof/` is exempt BY EXPLICIT PATH PREFIX, never by a heuristic on the name — see the header.
const EXEMPT = (path: string) => path.startsWith("proof/");

const SOURCE = /\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/;

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "renders") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

function storiesWithBeats(): string[] {
  if (!existsSync(STORIES)) return [];
  return readdirSync(STORIES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(STORIES, e.name))
    .filter(
      (dir) =>
        existsSync(join(dir, "beats")) &&
        [...walk(join(dir, "beats"))].some((p) => p.endsWith("BRIEF.md")),
    );
}

describe("the corpus obeys the rule", () => {
  it("should hold exactly one direction per story that holds beats", () => {
    const counts = storiesWithBeats().map((dir) => {
      const found = [...walk(dir)].filter((p) => p.endsWith("DIRECTION.md"));
      return `${relative(ROOT, dir)}: ${found.length}`;
    });
    expect(counts).toEqual(
      storiesWithBeats().map((dir) => `${relative(ROOT, dir)}: 1`),
    );
  });

  it("should let no production source read the filed directions or name one of the three", () => {
    const reaching: string[] = [];
    for (const path of walk(STORIES)) {
      const rel = relative(ROOT, path);
      if (EXEMPT(rel) || !SOURCE.test(path)) continue;
      const text = readFileSync(path, "utf8");
      if (
        /design-base\/directions/.test(text) ||
        /\bfiledDirections\b/.test(text) ||
        /\bDIRECTIONS_DIR\b/.test(text) ||
        /["'`](creme|nocturne|rapport)["'`]/.test(text)
      )
        reaching.push(rel);
    }
    expect(reaching).toEqual([]);
  });

  /**
   * THE GUARD ABOVE WALKS `stories/`, AND A JOURNALIST'S STORY IS NOT THERE.
   *
   * Measured 2026-09-23. A real story lives in the install root — `~/.local/share/splash-stories/
   * stories/<slug>` — which this repository cannot see, so the walk above reports green over a tree
   * where no production story exists at all. Meanwhile the thing that WRITES every story's runner
   * is in this repository and was never read: `chart-web/scripts/scaffold-web-beat.mjs` emitted a
   * runner looping over `docs/design-base/directions`, so every web beat it scaffolded redefined the
   * run's one direction as three, and did it before a journalist typed a line.
   *
   * The scaffolds are where the rule has to hold, because they are upstream of every story this
   * repository will never see. A template is source like any other; it is exempt from nothing.
   */
  it("should let no scaffold emit a runner that reads the filed directions", () => {
    // THE CATALOGUE'S OWN BRANCH IS EXEMPT BY THE NAME OF THE CONSTANT THAT HOLDS IT, and by
    // nothing else — the same shape as `EXEMPT` above, and for the same reason: a heuristic
    // ("a template that looks like the catalogue's") is a rule nobody can enumerate. A scaffold
    // that wants the three writes them into a constant called CATALOGUE_DIRECTION_SOURCE, where
    // a reader looking for the exception finds it, and `--filed` is what reaches it.
    const CATALOGUE_BRANCH = /const CATALOGUE_DIRECTION_\w+ = (`[\s\S]*?`|\[[\s\S]*?\]\.join\([^)]*\));/g;
    const emitting: string[] = [];
    for (const path of walk(join(ROOT, "skills"))) {
      if (!/scaffold-.*\.mjs$/.test(path)) continue;
      const text = readFileSync(path, "utf8")
        .replace(CATALOGUE_BRANCH, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      if (/design-base", "directions"/.test(text) || /design-base\/directions/.test(text))
        emitting.push(relative(ROOT, path));
    }
    expect(emitting).toEqual([]);
  });

  it("should fail if that exemption ever stops being load-bearing, so it cannot quietly cover everything", () => {
    // The exemption is only honest while exactly one scaffold uses it. If a second one appears,
    // somebody is spelling the catalogue's escape where a story's runner is written.
    const named = [...walk(join(ROOT, "skills"))].filter(
      (p) => /scaffold-.*\.mjs$/.test(p) && /CATALOGUE_DIRECTION_/.test(readFileSync(p, "utf8")),
    );
    expect(named.map((p) => relative(ROOT, p))).toEqual([
      "skills/chart-web/scripts/scaffold-web-beat.mjs",
    ]);
  });

  it("should exempt proof/ by an explicit path prefix and by nothing else", () => {
    expect(
      EXEMPT(
        "proof/scrolly-bar-top-emitters-2024/render-directions-scrolly.mjs",
      ),
    ).toBe(true);
    expect(EXEMPT("stories/proof-reading-times/beats/1/render.mjs")).toBe(
      false,
    );
    expect(EXEMPT("proofs-of-concept/a/render.mjs")).toBe(false);
  });
});

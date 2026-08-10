/**
 * A HOST THAT CANNOT LOOK, AND A METHOD THAT DEPENDS ON LOOKING.
 *
 * Measured on Codex 0.144.1, 2026-08-10 (`survey/codex-and-gemini-2026-08-10.md` §3.3): the
 * model-visible prompt of a headless `codex exec` run carries **no image-viewing tool at all** —
 * zero occurrences — while seven skills end their render ladder in *"open the PNG and look at it"*.
 * The model ran `inspectSvg` and `file` instead. `inspectSvg` models contrast and alt text; it
 * models neither overlap nor clipping. Across three correction cycles it fixed exactly what the
 * journalist had described in words and shipped a NEW unseen collision each time — a clipped title,
 * then crushed y ticks, then a clipped limits line — reporting success at each.
 *
 * This is a host constraint, not a bug to repair. What is ours is that nothing said so. Two guards
 * here, and neither of them pretends to substitute for looking:
 *
 *   1. THE PROSE NAMES WHAT IT DEPENDS ON. Every `SKILL.md` that tells the model to look carries
 *      the same paragraph, byte-identical (`@parity vision-dependency`): what the rung needs, what
 *      was measured when it was absent, and what to do instead — say so, leave the render
 *      unapproved, never report it as checked.
 *      MUTATION, run in a copy of the tree under /tmp, never here — delete the paragraph from
 *      `skills/map-beat/SKILL.md`:
 *        (fail) every skill that says "look at it" should name the instrument that rung depends on
 *        error: expect(received).toEqual(expected)
 *        - Expected  - 0
 *        + Received  + 1
 *          [
 *        +   "map-beat",
 *          ]
 *      And changing one word of it in `skills/chart-web/SKILL.md` reddens the parity test instead.
 *
 *   2. THE PROBE CAN TELL IT HAS NO WAY TO SEE. `scripts/vision-probe.mjs` writes an image carrying
 *      a word and asks for the word back; only the word's SHA-256 reaches disk, so no amount of
 *      reading files answers it. A wrong answer is `blind`, exactly like `--cannot-see`.
 *      MUTATION: make `answerProbe` return `"seen"` unconditionally (drop the hash comparison):
 *        (fail) should record blind when the answer does not match the image
 *        error: expect(received).toBe(expected)
 *        Expected: "blind"
 *        Received: "seen"
 *
 * WHAT THIS PROVABLY DOES NOT CLOSE, named rather than left to be discovered:
 *
 *   - It does not make a blind host able to see, and nothing here tries. There is no fallback that
 *     reads a picture; the measured evidence is that inspecting the source produces false
 *     confidence, which is worse than an honest refusal.
 *   - It cannot force a model to run the probe, nor to answer it honestly, nor — once it has looked
 *     — to look CAREFULLY. A verdict of `seen` proves an instrument exists, nothing more.
 *   - The verdict is per machine and per moment. It lives in a temp directory and says so; a
 *     `seen` verdict carried across hosts would be exactly the false green this file exists against.
 */
import { describe, it, expect, afterEach } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  issueProbe,
  answerProbe,
  recordCannotSee,
  readVerdict,
  clearProbe,
} from "../scripts/vision-probe.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

/** The paragraph, read from this skill's own SKILL.md — the canonical copy, never retyped here. */
const MARKER = "**Looking needs an instrument, and not every host has one.**";
const PARITY_TAG = "<!-- @parity vision-dependency -->";

function skillText(id: string): string {
  return readFileSync(join(SKILLS, id, "SKILL.md"), "utf8");
}

/**
 * Every skill whose prose tells the MODEL to look at something it produced. Derived by reading the
 * corpus, never a hand-kept list: a new skill that ends its ladder in "look at it" is covered the
 * moment the sentence lands, with no edit here.
 *
 * The alternation names its objects on purpose. `newsroom-charter` says a *journalist* "can look at
 * the real tag" — a person reading markup, not a model opening a render — and must not be dragged
 * in by a looser pattern.
 */
const LOOKS_AT_A_RENDER =
  /look at (it|them|all of them|all four|the png|the picture|the pixels|the actual pixels|the screenshots?|the live map|the frames?|the still)\b/i;

function skillIds(): string[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && existsSync(join(SKILLS, e.name, "SKILL.md")),
    )
    .map((e) => e.name)
    .sort();
}

describe("the prose names the instrument the looking rung depends on", () => {
  it('every skill that says "look at it" should name the instrument that rung depends on', () => {
    const missing = skillIds()
      .filter((id) => LOOKS_AT_A_RENDER.test(skillText(id)))
      .filter((id) => !skillText(id).includes(MARKER));
    expect(missing).toEqual([]);
  });

  it("should find the rule on the skills the survey actually measured, so the pattern cannot go quietly empty", () => {
    const carrying = skillIds().filter((id) => skillText(id).includes(MARKER));
    for (const id of [
      "chart-beat",
      "chart-video",
      "chart-web",
      "dw-beat",
      "image-beat",
      "map-beat",
      "map-web",
      "scrolly",
      "doctrine",
      "splash",
    ]) {
      expect(carrying).toContain(id);
    }
  });

  it("should carry the same paragraph byte-for-byte everywhere it appears", () => {
    const paragraphs = skillIds()
      .filter((id) => skillText(id).includes(MARKER))
      .map((id) => {
        const text = skillText(id);
        const start = text.indexOf(MARKER) - "> ".length;
        const end = text.indexOf("\n\n", start);
        return [id, text.slice(start, end)] as const;
      });
    expect(paragraphs.length).toBeGreaterThanOrEqual(10);
    const [, canonical] = paragraphs[0];
    for (const [id, para] of paragraphs) {
      expect(para).toContain(PARITY_TAG);
      expect([id, para]).toEqual([id, canonical]);
    }
  });

  it("should state the three things a blind host must do, not merely that it is blind", () => {
    const text = skillText("map-beat");
    expect(text).toContain("you cannot perform this rung");
    expect(text).toContain("leave\n> the render unapproved");
    expect(text).toContain("never report it as checked");
    // And the reason the obvious workaround is refused, because that is what was measured.
    expect(text).toContain("not a\n> substitute for looking");
  });
});

describe("vision-probe — it can tell it has no way to see, and says so", () => {
  let dirs: string[] = [];
  const freshDir = () => {
    const d = mkdtempSync(join(tmpdir(), "vision-probe-test-"));
    dirs.push(d);
    return d;
  };
  afterEach(() => {
    for (const d of dirs) clearProbe({ dir: d });
    dirs = [];
  });

  it("should write a real PNG and keep the word out of every file beside it", () => {
    const dir = freshDir();
    const { token, pngPath, statePath } = issueProbe({ dir });
    const png = readFileSync(pngPath);
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(png.byteLength).toBeGreaterThan(1000);
    // The answer must not be lying next to the question. A probe whose token is readable on disk
    // would certify every host on earth, including the one that cannot see.
    for (const file of readdirSync(dir)) {
      const bytes = readFileSync(join(dir, file));
      expect(bytes.toString("latin1")).not.toContain(token);
    }
    expect(JSON.parse(readFileSync(statePath, "utf8")).tokenHash).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("should record seen when the word from the image comes back", () => {
    const dir = freshDir();
    const { token } = issueProbe({ dir });
    expect(answerProbe({ dir, answer: token }).verdict).toBe("seen");
    expect(readVerdict({ dir })?.verdict).toBe("seen");
  });

  it("should forgive case and surrounding whitespace, which are not what is being tested", () => {
    const dir = freshDir();
    const { token } = issueProbe({ dir });
    expect(
      answerProbe({ dir, answer: `  ${token.toLowerCase()} ` }).verdict,
    ).toBe("seen");
  });

  it("should record blind when the answer does not match the image", () => {
    const dir = freshDir();
    const { token } = issueProbe({ dir });
    const wrong = token === "AAAAA" ? "BBBBB" : "AAAAA";
    const state = answerProbe({ dir, answer: wrong });
    expect(state.verdict).toBe("blind");
    expect(state.detail).toContain("cannot show you the render");
  });

  it("should record blind, as a first-class answer, when the host reports no image tool", () => {
    const dir = freshDir();
    issueProbe({ dir });
    const state = recordCannotSee({
      dir,
      note: "no view_image in this prompt",
    });
    expect(state.verdict).toBe("blind");
    expect(state.detail).toContain("no way to display an image");
    expect(state.detail).toContain("no view_image in this prompt");
  });

  it("should have no verdict at all until one is given — never a default of seen", () => {
    const dir = freshDir();
    expect(readVerdict({ dir })).toBeNull();
    issueProbe({ dir });
    expect(readVerdict({ dir })).toBeNull();
  });

  it("should discard an earlier verdict when a new probe is issued, so a stale seen cannot be reused", () => {
    const dir = freshDir();
    const first = issueProbe({ dir });
    answerProbe({ dir, answer: first.token });
    expect(readVerdict({ dir })?.verdict).toBe("seen");
    issueProbe({ dir });
    expect(readVerdict({ dir })).toBeNull();
  });

  it("should refuse to be answered when no probe is outstanding, rather than inventing a verdict", () => {
    const dir = freshDir();
    expect(() => answerProbe({ dir, answer: "ABCDE" })).toThrow(
      "no probe is outstanding",
    );
  });

  it("should issue a different word each time, so an answer cannot be memorised", () => {
    const dir = freshDir();
    const tokens = new Set<string>();
    for (let i = 0; i < 12; i += 1) tokens.add(issueProbe({ dir }).token);
    expect(tokens.size).toBeGreaterThan(9);
    for (const token of tokens)
      expect(token).toMatch(/^[ABCDEFGHJKLMNPQRTUVWXY23467]{5}$/);
  });
});

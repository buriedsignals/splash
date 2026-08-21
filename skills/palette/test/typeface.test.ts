/**
 * THE RECORDED ANSWER FOR THE TYPEFACE — the proposal, and the writer this project did not have.
 *
 * Round four, finding 17: five render paths REFUSE without a `TYPEFACE.md` (`chart-beat`,
 * `chart-web`, `chart-video`, `map-beat`, and the vendored `shared/` copy), and
 * `grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write` returned nothing. Every skill ships its
 * own file in its own directory, so a seed resolves by walking up and nobody noticed that a STORY
 * has none: measured 2026-08-21, twenty of this tree's twenty-one stories hold no `TYPEFACE.md`.
 * `NEWSROOM.md` records `Space Grotesk`, `familyResolves` is false for it on this machine, so the
 * refusal at the render is CORRECT — and there was no path to answer it. The one story that
 * answered it did so by hand.
 *
 * WHAT THIS FILE ASSERTS, and the mutation that reddens each:
 *
 *   1. The proposal measures every recorded face on THIS machine and cannot be run without the
 *      measurement — resvg never errors on a family it does not have, so an unmeasured proposal is
 *      a guess. MUTATION: default `resolves` to `() => true`.
 *   2. `recommended` never names a face that did not resolve, and never a face that resolves but is
 *      not a chart face. MUTATION: recommend `options[0]`.
 *   3. The writer REFUSES to record a face that did not resolve — the same refusal `useTypeface`
 *      makes at the render, made where it can still be answered. MUTATION: drop the check.
 *   4. What it writes is read back by the REAL parser, in the skill that refuses without it.
 *      MUTATION: write `origin: house`.
 *   5. A recorded answer is never silently replaced.
 *
 * The cross-skill imports below are a test's own: `parseTypeface` and `familyResolves` are the
 * functions that will read what this writer writes, and asserting against anything else would be
 * asserting against a copy of the contract rather than the contract.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_STACK,
  proposeTypeface,
  formatTypefaceProposal,
  renderTypefaceRecord,
  writeTypeface,
} from "../scripts/typeface.mjs";
import {
  familyResolves,
  parseTypeface,
} from "../../map-beat/scripts/render-still.mjs";

// The newsroom this tree actually ships, verbatim from its own `NEWSROOM.md`.
const NEWSROOM = {
  name: "Buried Signals",
  typefaces: "Space Grotesk, Courier New",
};

// A probe that says what this machine says, for the faces the tests name, and refuses to guess
// about anything else — the same discipline the real one has.
const MEASURED: Record<string, boolean> = {
  "Space Grotesk": false,
  "Courier New": true,
  Helvetica: true,
};
const resolves = (family: string) => {
  const first = family.split(",")[0]!.replace(/^["']|["']$/g, "").trim();
  if (!(first in MEASURED)) throw new Error(`unmeasured family ${first}`);
  return MEASURED[first]!;
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "typeface-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the proposal measures this machine rather than assuming it", () => {
  it("should refuse to propose without the resolution probe", () => {
    expect(() => proposeTypeface({ newsroom: NEWSROOM })).toThrow(
      /familyResolves/,
    );
  });

  it("should offer every recorded face, in the newsroom's own order, each measured", () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    expect(proposal.options.map((o) => o.family)).toEqual([
      "Space Grotesk",
      "Courier New",
      DEFAULT_STACK,
    ]);
    expect(proposal.options.map((o) => o.resolves)).toEqual([false, true, true]);
    expect(proposal.options.map((o) => o.origin)).toEqual([
      "newsroom",
      "newsroom",
      "default",
    ]);
    expect(proposal.options[0]!.provenance).toContain("NEWSROOM.md");
  });

  it("should never recommend a face this machine does not have", () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    const chosen = proposal.options.find((o) => o.id === proposal.recommended)!;
    expect(chosen.resolves).toBe(true);
    expect(chosen.family).not.toBe("Space Grotesk");
  });

  // The judgement stress-p's own agent made by hand, mechanised and given its reason: `Courier New`
  // resolves, and a monospaced typewriter face is not a chart face. It stays on the list — a
  // journalist may want it — and it is not what an unattended run records.
  it("should not recommend a face that resolves but is not a chart face", () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    expect(proposal.recommended).toBe("default");
    const courier = proposal.options.find((o) => o.family === "Courier New")!;
    expect(courier.caution).toMatch(/monospac/i);
    expect(proposal.recommendationReason).toMatch(/Space Grotesk/);
  });

  it("should recommend the newsroom's own face when this machine has it", () => {
    const proposal = proposeTypeface({
      newsroom: { name: "Heidi.news", typefaces: "Helvetica" },
      resolves,
    });
    expect(proposal.recommended).toBe("newsroom-1");
    expect(formatTypefaceProposal(proposal)).toContain("recommended");
  });

  it("should still propose the stated fallback when no newsroom face is recorded", () => {
    const proposal = proposeTypeface({ newsroom: {}, resolves });
    expect(proposal.options).toHaveLength(1);
    expect(proposal.recommended).toBe("default");
    const question = formatTypefaceProposal(proposal);
    expect(question).toContain(DEFAULT_STACK);
    expect(question).toContain(proposal.escape);
  });
});

describe("the writer records an answer, and refuses one nothing can honour", () => {
  it("should write a file the real parser reads back", async () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    const written = await writeTypeface({
      dir,
      option: proposal.options.find((o) => o.id === proposal.recommended)!,
      newsroom: NEWSROOM,
      answeredBy: "nobody",
      because: proposal.recommendationReason,
    });
    expect(written.path).toBe(join(dir, "TYPEFACE.md"));

    const record = parseTypeface(await readFile(written.path, "utf8"), written.path);
    expect(record.family).toBe(DEFAULT_STACK);
    expect(record.origin).toBe("default");
    // The gap is NAMED, not silently absent: the newsroom's own primary face is not on this machine.
    const text = await readFile(written.path, "utf8");
    expect(text).toContain("Space Grotesk");
    expect(text).toContain("no journalist");
  });

  it("should refuse to record a face this machine does not have", async () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    await expect(
      writeTypeface({
        dir,
        option: proposal.options[0]!,
        newsroom: NEWSROOM,
        answeredBy: "journalist",
      }),
    ).rejects.toThrow(/does not resolve on this machine/);
  });

  it("should refuse an option whose resolution was never measured", async () => {
    await expect(
      writeTypeface({
        dir,
        option: { id: "x", origin: "journalist", family: "Marr Sans" },
        answeredBy: "journalist",
      }),
    ).rejects.toThrow(/measured/);
  });

  it("should never silently replace a recorded answer", async () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    const option = proposal.options.find((o) => o.id === "default")!;
    await writeTypeface({ dir, option, answeredBy: "journalist" });
    await expect(
      writeTypeface({ dir, option, answeredBy: "journalist" }),
    ).rejects.toThrow(/already/);
    const again = await writeTypeface({
      dir,
      option,
      answeredBy: "journalist",
      replace: true,
    });
    expect(again.replaced).toBe(true);
  });

  it("should record a journalist's own face, measured like any other", async () => {
    const family = "Courier New";
    const option = {
      id: "journalist",
      origin: "journalist",
      family,
      resolves: resolves(family),
      provenance: "the journalist named this face",
    };
    const { path } = await writeTypeface({ dir, option, answeredBy: "journalist" });
    expect(parseTypeface(await readFile(path, "utf8"), path)).toMatchObject({
      family,
      origin: "journalist",
    });
  });

  it("should render the record without writing anything", () => {
    const proposal = proposeTypeface({ newsroom: NEWSROOM, resolves });
    const text = renderTypefaceRecord(
      proposal.options.find((o) => o.id === "default")!,
      { newsroom: NEWSROOM, answeredBy: "nobody", because: proposal.recommendationReason },
    );
    expect(text.startsWith("---\n")).toBe(true);
    expect(text).toContain(`family: "${DEFAULT_STACK}"`);
  });
});

// THE MEASUREMENT ITSELF, on this machine, through the same function the render uses — so the
// fixture above is not the only witness that `Space Grotesk` is missing here.
describe("the probe the proposal needs is the render's own", () => {
  it("should read this machine, not a table", () => {
    expect(familyResolves("Space Grotesk")).toBe(false);
    expect(familyResolves(DEFAULT_STACK)).toBe(true);
  });
});
